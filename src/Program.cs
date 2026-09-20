using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Windows;

namespace GoatBar;

static class Program
{
    public static readonly string StatusDir =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".claude", "agent-status");

    static readonly HashSet<string> Agents = new(StringComparer.OrdinalIgnoreCase) { "claude.exe", "codex.exe" };
    static readonly HashSet<string> Hosts = new(StringComparer.OrdinalIgnoreCase)
    {
        "zed.exe", "windowsterminal.exe", "code.exe", "cursor.exe", "windsurf.exe",
        "wezterm-gui.exe", "alacritty.exe", "idea64.exe", "pycharm64.exe", "webstorm64.exe",
    };

    [STAThread]
    static int Main(string[] args)
    {
        if (args.Length >= 2 && args[0] == "--who" && uint.TryParse(args[1], out uint pid))
        {
            Console.Out.Write(Who(pid));
            Console.Out.Flush();
            return 0;
        }

        using var mutex = new Mutex(true, @"Local\GoatBar.SingleInstance", out bool first);
        if (!first) return 0;

        var app = new Application { ShutdownMode = ShutdownMode.OnMainWindowClose };
        var bar = new BarWindow();
        app.MainWindow = bar;
        bar.Show();
        return app.Run();
    }

    /// Walks up from a hook process to the agent (claude.exe / codex.exe) and the
    /// app hosting its terminal (Zed, Windows Terminal, VS Code…).
    static string Who(uint pid)
    {
        var table = Native.ProcessTable();
        uint agentPid = 0, hostPid = 0;
        string agentName = "", hostName = "";
        var seen = new HashSet<uint>();
        uint cur = pid;
        while (cur != 0 && seen.Add(cur) && table.TryGetValue(cur, out var e))
        {
            if (agentPid == 0 && Agents.Contains(e.name)) { agentPid = cur; agentName = e.name; }
            else if (agentPid != 0 && (Hosts.Contains(e.name) || (e.name != "explorer.exe" && Native.WindowsOf(cur).Count > 0)))
            {
                hostPid = cur; hostName = e.name;
                break;
            }
            cur = e.parent;
        }
        return JsonSerializer.Serialize(new { agentPid, agentName, hostPid, hostName });
    }

    public static bool Alive(long pid, string name)
    {
        if (pid <= 0) return true;
        try
        {
            using var p = Process.GetProcessById((int)pid);
            return !p.HasExited && (string.IsNullOrEmpty(name) ||
                string.Equals(p.ProcessName + ".exe", name, StringComparison.OrdinalIgnoreCase));
        }
        catch { return false; }
    }
}
