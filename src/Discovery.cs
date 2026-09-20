using System.IO;
using System.Text;
using System.Text.Json;

namespace GoatBar;

record Session(string Tool, string Sid, string Name, string Cwd, string State, long Since, string Step, long HostPid, string Color = "")
{
    public string Key => Tool + "-" + Sid;
}

/// Finds every running Claude Code and Codex chat from the files each tool
/// already keeps, then layers on detail from our own hooks (agent-status/).
class Discovery
{
    static readonly string Home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
    static readonly string ClaudeSessions = Path.Combine(Home, ".claude", "sessions");
    static readonly string ClaudeProjects = Path.Combine(Home, ".claude", "projects");
    static readonly string CodexHome = Path.Combine(Home, ".codex");
    static readonly HashSet<string> Hosts = new(StringComparer.OrdinalIgnoreCase)
    {
        "zed.exe", "windowsterminal.exe", "code.exe", "cursor.exe", "windsurf.exe",
        "wezterm-gui.exe", "alacritty.exe", "idea64.exe", "pycharm64.exe", "webstorm64.exe",
    };

    readonly Dictionary<string, (long len, string title, string color, string custom)> _meta = new();
    readonly Dictionary<string, string> _rollouts = new();
    readonly Dictionary<string, (long len, string state, long since, string cwd)> _codexState = new();
    readonly Dictionary<uint, long> _hosts = new();
    Dictionary<string, string> _codexNames = new();
    DateTime _codexIndexTime;

    public List<Session> Scan()
    {
        var table = Native.ProcessTable();
        var list = new List<Session>();
        try { ScanClaude(table, list); } catch { }
        try { ScanCodex(table, list); } catch { }
        return list;
    }

    // ---- Claude Code: ~/.claude/sessions/<pid>.json ------------------------------
    void ScanClaude(Dictionary<uint, (uint parent, string name)> table, List<Session> list)
    {
        if (!Directory.Exists(ClaudeSessions)) return;
        foreach (var file in Directory.GetFiles(ClaudeSessions, "*.json"))
        {
            JsonElement r;
            try { using var doc = JsonDocument.Parse(File.ReadAllText(file)); r = doc.RootElement.Clone(); } catch { continue; }
            uint pid = (uint)Num(r, "pid");
            if (!table.TryGetValue(pid, out var proc) || !proc.name.Equals("claude.exe", StringComparison.OrdinalIgnoreCase)) continue;
            string sid = Str(r, "sessionId"), cwd = Str(r, "cwd");
            if (sid == "") continue;

            var (aiTitle, color) = TranscriptMeta(sid, cwd);
            string name = Str(r, "nameSource") == "user" ? Str(r, "name") : aiTitle ?? Str(r, "name");
            string status = Str(r, "status");
            string state = status == "busy" ? "working"
                : status.Contains("perm", StringComparison.OrdinalIgnoreCase) || status.Contains("input", StringComparison.OrdinalIgnoreCase) ? "asking"
                : "idle";
            long since = Num(r, "statusUpdatedAt");

            var hook = Overlay("claude", sid);
            string step = "";
            if (hook is { } h)
            {
                if (state == "working") step = Str(h, "step");
                if (Str(h, "state") == "asking" && Num(h, "updated") >= since) state = "asking";
            }
            list.Add(new Session("claude", sid, name, cwd, state, since, step, HostOf(pid, table), color ?? ""));
        }
    }

    /// Latest auto-generated title ("ai-title") and /color choice ("agent-color")
    /// from the chat's transcript. Reads the tail; the whole file only on first look.
    (string title, string color) TranscriptMeta(string sid, string cwd)
    {
        string slug = new(cwd.Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray());
        string path = Path.Combine(ClaudeProjects, slug, sid + ".jsonl");
        long len;
        try { len = new FileInfo(path).Length; } catch { return (null, null); }
        bool known = _meta.TryGetValue(sid, out var c);
        if (known && c.len == len) return (c.custom ?? c.title, c.color);

        long bytes = known ? Math.Min(len, 512 * 1024) : len;
        // A /rename (including our background auto-rename) beats the auto title, and sticks.
        string custom = LastMatch(path, len, bytes, "\"type\":\"custom-title\"", "customTitle") ?? c.custom;
        string title = LastMatch(path, len, bytes, "\"type\":\"ai-title\"", "aiTitle") ?? c.title;
        string color = LastMatch(path, len, bytes, "\"type\":\"agent-color\"", "agentColor") ?? c.color;
        _meta[sid] = (len, title, color, custom);
        return (custom ?? title, color);
    }

    // ---- Codex: a live chat holds ~/.codex/thread-writer-locks/<id>.lock open ------
    void ScanCodex(Dictionary<uint, (uint parent, string name)> table, List<Session> list)
    {
        string locks = Path.Combine(CodexHome, "thread-writer-locks");
        if (!Directory.Exists(locks)) return;
        uint codexPid = table.FirstOrDefault(p => p.Value.name.Equals("codex.exe", StringComparison.OrdinalIgnoreCase)).Key;
        if (codexPid == 0) return; // no Codex running: every lock is stale
        LoadCodexNames();

        foreach (var lockFile in Directory.GetFiles(locks, "*.lock"))
        {
            string id = Path.GetFileNameWithoutExtension(lockFile);
            if (id.StartsWith('.') || !InUse(lockFile)) continue;
            string rollout = Rollout(id);
            if (rollout == null) continue;
            var (state, since, cwd) = CodexState(id, rollout);
            string name = _codexNames.TryGetValue(id, out var n) && n != "" ? n : Path.GetFileName(cwd);
            string step = state == "working" && Overlay("codex", id) is { } h ? Str(h, "step") : "";
            list.Add(new Session("codex", id, name, cwd, state, since, step, HostOf(codexPid, table)));
        }
    }

    static bool InUse(string path)
    {
        try { using var _ = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.None); return false; }
        catch (IOException) { return true; }
        catch { return false; }
    }

    string Rollout(string id)
    {
        if (_rollouts.TryGetValue(id, out var p) && File.Exists(p)) return p;
        string dir = Path.Combine(CodexHome, "sessions");
        if (!Directory.Exists(dir)) return null;
        p = Directory.EnumerateFiles(dir, $"*{id}.jsonl", SearchOption.AllDirectories).FirstOrDefault();
        if (p != null) _rollouts[id] = p;
        return p;
    }

    (string state, long since, string cwd) CodexState(string id, string rollout)
    {
        long len = new FileInfo(rollout).Length;
        if (_codexState.TryGetValue(id, out var c) && c.len == len) return (c.state, c.since, c.cwd);

        string cwd = c.cwd;
        if (string.IsNullOrEmpty(cwd))
        {
            using var sr = new StreamReader(new FileStream(rollout, FileMode.Open, FileAccess.Read, FileShare.ReadWrite));
            try { using var doc = JsonDocument.Parse(sr.ReadLine() ?? "{}"); cwd = Str(doc.RootElement.GetProperty("payload"), "cwd"); } catch { cwd = ""; }
        }
        string state = c.state ?? "idle";
        long since = c.since;
        foreach (var line in TailLines(rollout, len, Math.Min(len, 256 * 1024)).Reverse())
        {
            string kind = line.Contains("\"type\":\"task_started\"") ? "working"
                : line.Contains("\"type\":\"task_complete\"") || line.Contains("\"type\":\"turn_aborted\"") ? "idle" : null;
            if (kind == null) continue;
            try
            {
                using var doc = JsonDocument.Parse(line);
                state = kind;
                since = DateTimeOffset.Parse(Str(doc.RootElement, "timestamp")).ToUnixTimeMilliseconds();
            }
            catch { continue; }
            break;
        }
        _codexState[id] = (len, state, since, cwd);
        return (state, since, cwd);
    }

    void LoadCodexNames()
    {
        string index = Path.Combine(CodexHome, "session_index.jsonl");
        try
        {
            var t = File.GetLastWriteTimeUtc(index);
            if (t == _codexIndexTime) return;
            var names = new Dictionary<string, string>();
            foreach (var line in File.ReadLines(index))
            {
                try { using var doc = JsonDocument.Parse(line); names[Str(doc.RootElement, "id")] = Str(doc.RootElement, "thread_name"); } catch { }
            }
            _codexNames = names;
            _codexIndexTime = t;
        }
        catch { }
    }

    // ---- shared ------------------------------------------------------------------
    /// The app window (Zed, Windows Terminal…) whose terminal runs this process.
    long HostOf(uint pid, Dictionary<uint, (uint parent, string name)> table)
    {
        if (_hosts.TryGetValue(pid, out long h)) return h;
        var seen = new HashSet<uint>();
        uint cur = table.TryGetValue(pid, out var e) ? e.parent : 0;
        long host = 0;
        while (cur != 0 && seen.Add(cur) && table.TryGetValue(cur, out var p))
        {
            if (Hosts.Contains(p.name) || (!p.name.Equals("explorer.exe", StringComparison.OrdinalIgnoreCase) && Native.WindowsOf(cur).Count > 0))
            { host = cur; break; }
            cur = p.parent;
        }
        return _hosts[pid] = host;
    }

    static JsonElement? Overlay(string tool, string sid)
    {
        string file = Path.Combine(Program.StatusDir, $"{tool}-{sid}.json");
        try { using var doc = JsonDocument.Parse(File.ReadAllText(file)); return doc.RootElement.Clone(); } catch { return null; }
    }

    static string LastMatch(string path, long len, long bytes, string needle, string field)
    {
        foreach (var line in TailLines(path, len, bytes).Reverse())
        {
            if (!line.Contains(needle)) continue;
            try { using var doc = JsonDocument.Parse(line); return Str(doc.RootElement, field); } catch { }
        }
        return null;
    }

    static IEnumerable<string> TailLines(string path, long len, long bytes)
    {
        var buf = new byte[bytes];
        using (var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
        {
            fs.Seek(len - bytes, SeekOrigin.Begin);
            int read = 0;
            while (read < bytes) { int n = fs.Read(buf, read, (int)bytes - read); if (n <= 0) break; read += n; }
        }
        var lines = Encoding.UTF8.GetString(buf).Split('\n');
        return bytes < len ? lines.Skip(1) : lines; // first line of a partial read is cut off
    }

    static string Str(JsonElement e, string k) => e.TryGetProperty(k, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : "";
    static long Num(JsonElement e, string k) => e.TryGetProperty(k, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetInt64() : 0;
}
