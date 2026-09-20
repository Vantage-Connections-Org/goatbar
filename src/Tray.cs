using System.IO;
using Forms = System.Windows.Forms;

namespace GoatBar;

/// Tray icon: click to show/hide the bar; right-click for the menu. The tooltip
/// counts chats by state, so the tray alone tells you if anything needs you.
sealed class Tray : IDisposable
{
    readonly Forms.NotifyIcon _icon;

    public Tray(BarWindow bar)
    {
        _icon = new Forms.NotifyIcon { Icon = LoadIcon(), Text = "GoatBar", Visible = true };
        _icon.MouseClick += (_, e) =>
        {
            if (e.Button == Forms.MouseButtons.Left) bar.ToggleVisible();
            else if (e.Button == Forms.MouseButtons.Right) bar.ShowMenuAtCursor(); // same styled menu as the bar
        };
    }

    static System.Drawing.Icon LoadIcon()
    {
        using Stream s = typeof(Tray).Assembly.GetManifestResourceStream("GoatBar.ico");
        return s != null
            ? new System.Drawing.Icon(s, Forms.SystemInformation.SmallIconSize)
            : System.Drawing.Icon.ExtractAssociatedIcon(Environment.ProcessPath);
    }

    /// One-time hello on first launch: a new user otherwise gets no sign it's running,
    /// and Windows tucks new tray icons into the ^ overflow.
    public void WelcomeOnce()
    {
        string flag = Path.Combine(AppContext.BaseDirectory, "welcomed");
        if (File.Exists(flag)) return;
        _icon.ShowBalloonTip(10000, "GoatBar is running",
            "Your Claude Code and Codex chats show up as squares next to the tray. Click the goat to hide or show the bar; right-click it for Start with Windows.",
            Forms.ToolTipIcon.None);
        try { File.WriteAllText(flag, ""); } catch { }
    }

    public void Notify(string title, string text) => _icon.ShowBalloonTip(6000, title, text, Forms.ToolTipIcon.None);

    public void Update(string summary, bool hidden)
    {
        string text = "GoatBar: " + summary + (hidden ? " (bar hidden)" : "");
        _icon.Text = text.Length > 127 ? text[..127] : text; // Windows limit
    }

    public void Dispose()
    {
        _icon.Visible = false; // otherwise a ghost icon lingers until the tray is hovered
        _icon.Dispose();
    }
}
