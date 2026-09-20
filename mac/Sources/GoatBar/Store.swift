import AppKit
import SwiftUI
import UserNotifications

/// Polls Discovery, applies the same state machine as BarWindow.Effective() on Windows,
/// and keeps the menu bar image in sync.
final class Store: ObservableObject {
    @Published private(set) var sessions: [Session] = []
    @Published private(set) var states: [String: String] = [:]
    @Published private(set) var barImage = NSImage(size: NSSize(width: 1, height: 1))
    @Published private(set) var now = Date()

    static let freshFinishMs: Int64 = 10 * 60_000 // finished this recently when first seen = still "waiting on you"
    static let seenFadeMs: Int64 = 30 * 60_000    // clicked chats stay dim green this long after finishing, then idle

    private let discovery = Discovery()
    private var seen: [String: Int64]   // key -> acknowledged finish time
    private var order: [String]         // left-to-right keys
    private var known = Set<String>()   // chats seen this run
    private var signature = "\u{0}"
    private var timer: Timer?
    private var lastStates: [String: String]? // nil until the first scan, so startup never notifies

    init() {
        seen = Persist.load([String: Int64].self, "seen.json") ?? [:]
        order = Persist.load([String].self, "order.json") ?? []
        Notifier.requestPermission()
        refresh()
        let t = Timer(timeInterval: 1.0, repeats: true) { [weak self] _ in self?.refresh() }
        RunLoop.main.add(t, forMode: .common)
        timer = t
    }

    static func nowMs() -> Int64 { Int64(Date().timeIntervalSince1970 * 1000) }

    /// A finished chat shows green ("waiting") until you click it, then dim green ("seen")
    /// until it has been inactive for 30 minutes, then idle.
    private func effective(_ s: Session) -> String {
        if s.state != "idle" { return s.state }
        var isSeen = seen[s.key] == s.since
        if !isSeen && !known.contains(s.key) && Store.nowMs() - s.since > Store.freshFinishMs {
            seen[s.key] = s.since
            isSeen = true
        }
        if !isSeen { return "waiting" }
        return Store.nowMs() - s.since < Store.seenFadeMs ? "seen" : "idle"
    }

    func refresh() {
        let found = discovery.scan()
        var st: [String: String] = [:]
        for s in found { st[s.key] = effective(s) }
        known.formUnion(st.keys)
        // Notify when a chat goes from working to done while GoatBar is watching.
        if let last = lastStates {
            for s in found where st[s.key] == "waiting" && last[s.key] == "working" { Notifier.finished(s) }
        }
        lastStates = st

        var added = false
        for s in found where !order.contains(s.key) { order.insert(s.key, at: 0); added = true } // new chats join on the left
        if added { saveOrder(found) }
        let rank = Dictionary(order.enumerated().map { ($0.element, $0.offset) }, uniquingKeysWith: { a, _ in a })
        let sorted = found.sorted { (rank[$0.key] ?? 0) < (rank[$1.key] ?? 0) }

        now = Date()
        let sig = sorted.map { "\($0.key):\(st[$0.key] ?? ""):\($0.name):\($0.step):\($0.color):\($0.since)" }
            .joined(separator: "|")
        if sig == signature { return }
        signature = sig
        sessions = sorted
        states = st
        barImage = BarImage.render(sorted, st)
    }

    func state(of s: Session) -> String { states[s.key] ?? s.state }

    /// Click: bring the chat's app to the front and mark a finished chat as seen.
    func select(_ s: Session) {
        HostFocus.activate(s.hostPid)
        if s.state == "idle" {
            seen[s.key] = s.since
            Persist.save(seen, "seen.json")
        }
        signature = ""
        refresh()
    }

    func markAllSeen() {
        for s in sessions where s.state == "idle" { seen[s.key] = s.since }
        Persist.save(seen, "seen.json")
        signature = ""
        refresh()
    }

    /// "5 chats · 2 done · 1 working"
    var summary: String {
        let total = sessions.count
        if total == 0 { return "No chats running" }
        let done = states.values.filter { $0 == "waiting" }.count
        let working = states.values.filter { $0 == "working" }.count
        var text = "\(total) chat\(total == 1 ? "" : "s")"
        if done > 0 { text += " · \(done) done" }
        if working > 0 { text += " · \(working) working" }
        return text
    }

    private func saveOrder(_ live: [Session]) {
        // Forget closed chats beyond the most recent 100 so the file can't grow forever.
        let liveKeys = Set(live.map { $0.key })
        while order.count > 100, let i = order.firstIndex(where: { !liveKeys.contains($0) }) {
            order.remove(at: i)
        }
        Persist.save(order, "order.json")
    }
}

/// ~/Library/Application Support/GoatBar/<file>
enum Persist {
    private static var dir: URL? {
        guard let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else { return nil }
        let d = base.appendingPathComponent("GoatBar", isDirectory: true)
        try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
        return d
    }

    static func load<T: Decodable>(_ type: T.Type, _ file: String) -> T? {
        guard let url = dir?.appendingPathComponent(file), let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    static func save<T: Encodable>(_ value: T, _ file: String) {
        guard let url = dir?.appendingPathComponent(file), let data = try? JSONEncoder().encode(value) else { return }
        try? data.write(to: url, options: .atomic)
    }
}

/// Bring the app hosting a chat's terminal to the front.
enum HostFocus {
    static func activate(_ pid: pid_t) {
        guard pid > 0, let app = NSRunningApplication(processIdentifier: pid) else { return }
        if app.isHidden { app.unhide() }
        app.activate(options: [.activateIgnoringOtherApps])
    }
}

/// Finish notifications. Only inside a real .app bundle: UNUserNotificationCenter
/// crashes in a bare binary (e.g. `swift run`), so it's skipped there.
enum Notifier {
    static var available: Bool { Bundle.main.bundleIdentifier != nil && Bundle.main.bundleURL.pathExtension == "app" }

    static func requestPermission() {
        guard available else { return }
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    static func finished(_ s: Session) {
        guard available else { return }
        let content = UNMutableNotificationContent()
        content.title = "Chat finished"
        content.body = "\(s.name) (\(s.tool == "codex" ? "Codex" : "Claude Code")) is waiting on you."
        let request = UNNotificationRequest(identifier: "finished-\(s.key)-\(s.since)", content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request)
    }
}
