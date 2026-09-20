import AppKit
import Darwin
import Foundation

struct Session: Equatable {
    let tool: String      // "claude" | "codex"
    let sid: String
    let name: String
    let cwd: String
    let state: String     // "working" | "asking" | "idle"
    let since: Int64      // ms since epoch of the last status change
    let step: String
    let hostPid: pid_t    // app hosting the chat's terminal, 0 if unknown
    let color: String     // Claude /color name, "" if none
    var key: String { tool + "-" + sid }
}

/// Finds every running Claude Code and Codex chat from the files each tool
/// already keeps, then layers on detail from the optional hooks (agent-status/).
/// Mirrors src/Discovery.cs of the Windows app.
final class Discovery {
    private let fm = FileManager.default
    private let home = NSHomeDirectory()
    private var claudeSessions: String { home + "/.claude/sessions" }
    private var claudeProjects: String { home + "/.claude/projects" }
    private var statusDir: String { home + "/.claude/agent-status" }
    private var codexHome: String { home + "/.codex" }

    private struct Meta { var len: Int64; var title: String?; var color: String?; var custom: String? }
    private struct CodexCache { var len: Int64; var state: String; var since: Int64; var cwd: String }

    private var meta: [String: Meta] = [:]
    private var rollouts: [String: String] = [:]
    private var codexCache: [String: CodexCache] = [:]
    private var hosts: [pid_t: pid_t] = [:]
    private var codexNames: [String: String] = [:]
    private var codexIndexTime: Date?

    func scan() -> [Session] {
        let table = Proc.table()
        var list: [Session] = []
        scanClaude(table, &list)
        scanCodex(table, &list)
        return list
    }

    // ---- Claude Code: ~/.claude/sessions/<pid>.json ------------------------------
    private func scanClaude(_ table: [pid_t: Proc.Info], _ list: inout [Session]) {
        guard let files = try? fm.contentsOfDirectory(atPath: claudeSessions) else { return }
        for file in files where file.hasSuffix(".json") {
            guard let data = fm.contents(atPath: claudeSessions + "/" + file), let r = JSON.object(data) else { continue }
            let pid = pid_t(truncatingIfNeeded: JSON.num(r, "pid"))
            guard pid > 0, Proc.alive(pid) else { continue }
            let sid = JSON.str(r, "sessionId"), cwd = JSON.str(r, "cwd")
            if sid.isEmpty { continue }

            let (aiTitle, color) = transcriptMeta(sid: sid, cwd: cwd)
            let name = JSON.str(r, "nameSource") == "user" ? JSON.str(r, "name") : (aiTitle ?? JSON.str(r, "name"))
            let status = JSON.str(r, "status")
            var state = "idle"
            if status == "busy" {
                state = "working"
            } else if status.range(of: "perm", options: .caseInsensitive) != nil
                        || status.range(of: "input", options: .caseInsensitive) != nil {
                state = "asking"
            }
            let since = JSON.num(r, "statusUpdatedAt")

            var step = ""
            if let h = overlay("claude", sid) {
                if state == "working" { step = JSON.str(h, "step") }
                if JSON.str(h, "state") == "asking" && JSON.num(h, "updated") >= since { state = "asking" }
            }
            list.append(Session(tool: "claude", sid: sid, name: name, cwd: cwd, state: state, since: since,
                                step: step, hostPid: hostOf(pid, table), color: color ?? ""))
        }
    }

    /// Latest /rename ("custom-title"), auto title ("ai-title") and /color ("agent-color")
    /// from the chat's transcript. Reads the tail; the whole file only on first look.
    private func transcriptMeta(sid: String, cwd: String) -> (String?, String?) {
        // Claude Code names the project folder after the cwd with every non [A-Za-z0-9] UTF-16 unit as '-'.
        let slug = String(cwd.utf16.map { u -> Character in
            let alnum = (u >= 48 && u <= 57) || (u >= 65 && u <= 90) || (u >= 97 && u <= 122)
            return alnum ? Character(UnicodeScalar(UInt8(u))) : "-"
        })
        let path = claudeProjects + "/" + slug + "/" + sid + ".jsonl"
        guard let len = Files.size(path) else { return (nil, nil) }
        let known = meta[sid]
        if let c = known, c.len == len { return (c.custom ?? c.title, c.color) }

        let bytes = known != nil ? min(len, 512 * 1024) : len
        let found = Files.lastMatches(path, len: len, bytes: bytes, [
            ("\"type\":\"custom-title\"", "customTitle"),
            ("\"type\":\"ai-title\"", "aiTitle"),
            ("\"type\":\"agent-color\"", "agentColor"),
        ])
        // A /rename beats the auto title, and sticks.
        let m = Meta(len: len,
                     title: found[1] ?? known?.title,
                     color: found[2] ?? known?.color,
                     custom: found[0] ?? known?.custom)
        meta[sid] = m
        return (m.custom ?? m.title, m.color)
    }

    // ---- Codex: a live chat holds ~/.codex/thread-writer-locks/<id>.lock locked -----
    private func scanCodex(_ table: [pid_t: Proc.Info], _ list: inout [Session]) {
        let locks = codexHome + "/thread-writer-locks"
        guard let files = try? fm.contentsOfDirectory(atPath: locks) else { return }
        let codexPid = table.first(where: { $0.value.name == "codex" })?.key
            ?? table.first(where: { $0.value.name.lowercased().hasPrefix("codex") })?.key
        guard let codexPid else { return } // no Codex running: every lock is stale
        loadCodexNames()

        for file in files where file.hasSuffix(".lock") {
            let id = String(file.dropLast(5))
            if id.hasPrefix(".") || !Files.isLocked(locks + "/" + file) { continue }
            guard let rollout = rollout(id) else { continue }
            let (state, since, cwd) = codexState(id, rollout)
            var name = codexNames[id] ?? ""
            if name.isEmpty { name = (cwd as NSString).lastPathComponent }
            var step = ""
            if state == "working", let h = overlay("codex", id) { step = JSON.str(h, "step") }
            list.append(Session(tool: "codex", sid: id, name: name, cwd: cwd, state: state, since: since,
                                step: step, hostPid: hostOf(codexPid, table), color: ""))
        }
    }

    private func rollout(_ id: String) -> String? {
        if let p = rollouts[id], fm.fileExists(atPath: p) { return p }
        let dir = codexHome + "/sessions"
        guard let e = fm.enumerator(atPath: dir) else { return nil }
        let suffix = id + ".jsonl"
        while let rel = e.nextObject() as? String {
            if (rel as NSString).lastPathComponent.hasSuffix(suffix) {
                let p = dir + "/" + rel
                rollouts[id] = p
                return p
            }
        }
        return nil
    }

    private func codexState(_ id: String, _ rollout: String) -> (String, Int64, String) {
        let len = Files.size(rollout) ?? 0
        let c = codexCache[id]
        if let c, c.len == len { return (c.state, c.since, c.cwd) }

        var cwd = c?.cwd ?? ""
        if cwd.isEmpty, let first = Files.firstLine(rollout), let o = JSON.object(first),
           let payload = o["payload"] as? [String: Any] {
            cwd = JSON.str(payload, "cwd")
        }
        var state = c?.state ?? "idle"
        var since = c?.since ?? 0
        for line in Files.tailLines(rollout, len: len, bytes: min(len, 256 * 1024)).reversed() {
            let kind: String
            if line.contains("\"type\":\"task_started\"") { kind = "working" }
            else if line.contains("\"type\":\"task_complete\"") || line.contains("\"type\":\"turn_aborted\"") { kind = "idle" }
            else { continue }
            guard let o = JSON.object(Data(line.utf8)) else { continue }
            state = kind
            guard let t = JSON.isoMillis(JSON.str(o, "timestamp")) else { continue }
            since = t
            break
        }
        codexCache[id] = CodexCache(len: len, state: state, since: since, cwd: cwd)
        return (state, since, cwd)
    }

    private func loadCodexNames() {
        let index = codexHome + "/session_index.jsonl"
        guard let attrs = try? fm.attributesOfItem(atPath: index),
              let t = attrs[.modificationDate] as? Date, t != codexIndexTime,
              let data = fm.contents(atPath: index) else { return }
        var names: [String: String] = [:]
        for line in String(decoding: data, as: UTF8.self).split(separator: "\n") {
            if let o = JSON.object(Data(line.utf8)) { names[JSON.str(o, "id")] = JSON.str(o, "thread_name") }
        }
        codexNames = names
        codexIndexTime = t
    }

    // ---- shared ------------------------------------------------------------------
    /// The app (Terminal, iTerm2, Warp, Ghostty, VS Code, Cursor, Zed…) whose terminal runs this process:
    /// the nearest ancestor that is a regular, Dock-visible application.
    private func hostOf(_ pid: pid_t, _ table: [pid_t: Proc.Info]) -> pid_t {
        if let h = hosts[pid] { return h }
        var seen = Set<pid_t>()
        var cur = table[pid]?.ppid ?? 0
        var host: pid_t = 0
        while cur > 1, seen.insert(cur).inserted, let p = table[cur] {
            if let app = NSRunningApplication(processIdentifier: cur), app.activationPolicy == .regular {
                host = cur
                break
            }
            cur = p.ppid
        }
        hosts[pid] = host
        return host
    }

    private func overlay(_ tool: String, _ sid: String) -> [String: Any]? {
        guard let data = fm.contents(atPath: "\(statusDir)/\(tool)-\(sid).json") else { return nil }
        return JSON.object(data)
    }
}

// ---- helpers -----------------------------------------------------------------------

enum JSON {
    static func object(_ data: Data) -> [String: Any]? {
        (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    }
    static func str(_ o: [String: Any], _ k: String) -> String { o[k] as? String ?? "" }
    static func num(_ o: [String: Any], _ k: String) -> Int64 {
        guard let n = o[k] as? NSNumber, !(o[k] is String) else { return 0 }
        return n.int64Value
    }

    private static let isoFrac: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static let iso = ISO8601DateFormatter()

    static func isoMillis(_ s: String) -> Int64? {
        guard let d = isoFrac.date(from: s) ?? iso.date(from: s) else { return nil }
        return Int64(d.timeIntervalSince1970 * 1000)
    }
}

enum Files {
    static func size(_ path: String) -> Int64? {
        guard let attrs = try? FileManager.default.attributesOfItem(atPath: path),
              let n = attrs[.size] as? NSNumber else { return nil }
        return n.int64Value
    }

    /// Codex holds the lock file locked while a chat is live. Try a non-blocking
    /// exclusive flock on our own read fd: if it fails with EWOULDBLOCK, someone holds it.
    static func isLocked(_ path: String) -> Bool {
        let fd = open(path, O_RDONLY)
        if fd < 0 { return false }
        defer { close(fd) }
        if flock(fd, LOCK_EX | LOCK_NB) == 0 {
            _ = flock(fd, LOCK_UN)
            return false
        }
        return errno == EAGAIN // == EWOULDBLOCK on Darwin
    }

    static func tailLines(_ path: String, len: Int64, bytes: Int64) -> [Substring] {
        guard bytes > 0, let h = FileHandle(forReadingAtPath: path) else { return [] }
        defer { try? h.close() }
        guard (try? h.seek(toOffset: UInt64(len - bytes))) != nil,
              let data = try? h.read(upToCount: Int(bytes)) else { return [] }
        var lines = String(decoding: data, as: UTF8.self).split(separator: "\n", omittingEmptySubsequences: false)
        if bytes < len, !lines.isEmpty { lines.removeFirst() } // first line of a partial read is cut off
        return lines
    }

    /// For each (needle, field), the field of the last JSON line containing needle.
    static func lastMatches(_ path: String, len: Int64, bytes: Int64, _ wanted: [(String, String)]) -> [String?] {
        var out = [String?](repeating: nil, count: wanted.count)
        var left = wanted.count
        for line in tailLines(path, len: len, bytes: bytes).reversed() {
            for (i, w) in wanted.enumerated() where out[i] == nil && line.contains(w.0) {
                if let o = JSON.object(Data(line.utf8)) {
                    out[i] = JSON.str(o, w.1)
                    left -= 1
                }
            }
            if left == 0 { break }
        }
        return out
    }

    static func firstLine(_ path: String) -> Data? {
        guard let h = FileHandle(forReadingAtPath: path) else { return nil }
        defer { try? h.close() }
        var buf = Data()
        while buf.count < 16 << 20 {
            guard let chunk = try? h.read(upToCount: 64 * 1024), !chunk.isEmpty else { break }
            if let nl = chunk.firstIndex(of: 10) {
                buf.append(chunk[chunk.startIndex..<nl])
                return buf
            }
            buf.append(chunk)
        }
        return buf
    }
}

enum Proc {
    struct Info { let ppid: pid_t; let name: String }

    static func alive(_ pid: pid_t) -> Bool {
        kill(pid, 0) == 0 || errno == EPERM
    }

    /// pid -> (parent pid, short process name) for every process, via sysctl KERN_PROC_ALL.
    static func table() -> [pid_t: Info] {
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_ALL, 0]
        var size = 0
        guard sysctl(&mib, 3, nil, &size, nil, 0) == 0, size > 0 else { return [:] }
        let stride = MemoryLayout<kinfo_proc>.stride
        let capacity = size / stride + 32
        var procs = [kinfo_proc](repeating: kinfo_proc(), count: capacity)
        size = capacity * stride
        guard sysctl(&mib, 3, &procs, &size, nil, 0) == 0 else { return [:] }
        var table: [pid_t: Info] = [:]
        for i in 0..<(size / stride) {
            var p = procs[i]
            let name = withUnsafeBytes(of: &p.kp_proc.p_comm) { raw -> String in
                let bytes = raw.prefix(while: { $0 != 0 })
                return String(decoding: bytes, as: UTF8.self)
            }
            table[p.kp_proc.p_pid] = Info(ppid: p.kp_eproc.e_ppid, name: name)
        }
        return table
    }
}
