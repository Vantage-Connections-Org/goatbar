using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Effects;
using System.Windows.Threading;
using Microsoft.Win32;

namespace GoatBar;

class BarWindow : Window
{
    static readonly Brush Dim = Frozen("#8B949E"), IdleBg = Frozen("#262626"), IdleBorder = Frozen("#3A3A3A"),
        HoverBg = Frozen("#383838"), ClaudeFill = Frozen("#D97757"), OpenAIFill = Frozen("#E6E6E6"),
        CardBg = Frozen("#1A1B1F"), CardBorder = Frozen("#34363D"), CardText = Frozen("#F0F1F3"), CardSub = Frozen("#9DA3AE"),
        GrabBg = Frozen("#5C5F66"), GrabBorder = Frozen("#FFFFFF");

    // Status lives in the square's background (border = chat colour). "border" here
    // is the accent used for the status text in the hover card.
    static readonly Dictionary<string, (Brush border, Brush bg)> StateColors = new()
    {
        ["working"] = (Frozen("#D39A45"), Frozen("#4A3514")),   // dull orange: busy, no need to look
        ["waiting"] = (Frozen("#4ADE80"), Frozen("#38845C")),   // steady green: done, your turn
        ["seen"] = (Frozen("#6FBF8B"), Frozen("#1E3A29")),      // dim green: done, you've looked
        ["asking"] = (Frozen("#58A6FF"), Frozen("#1C4270")),
        ["idle"] = (IdleBorder, IdleBg),
    };
    // Claude Code's /color names; also the pool for chats without one.
    static readonly Dictionary<string, Brush> ChatColors = new()
    {
        ["red"] = Frozen("#F02D2D"), ["orange"] = Frozen("#FF7A1A"), ["yellow"] = Frozen("#FFD000"), ["green"] = Frozen("#22E05A"),
        ["cyan"] = Frozen("#00D8F5"), ["blue"] = Frozen("#3B82FF"), ["purple"] = Frozen("#B455FF"), ["pink"] = Frozen("#F06BB8"),
    };
    // Fully transparent pixels in a layered window let the mouse fall through to the
    // taskbar; alpha 1/255 is invisible but still catches hover and clicks.
    static readonly Brush HitArea = Frozen("#01000000");
    static readonly Geometry ClaudeLogo = FrozenGeometry(Icons.Claude), OpenAILogo = FrozenGeometry(Icons.OpenAI);

    const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    const long FreshFinishMs = 10 * 60_000; // finished this recently when first seen = still "waiting on you"
    const long SeenFadeMs = 30 * 60_000;    // clicked chats stay dim green this long after finishing, then grey
    const double Slot = 40;                 // square (34) + margins (3+3)
    static readonly string SeenFile = System.IO.Path.Combine(AppContext.BaseDirectory, "seen.json");
    static readonly string OrderFile = System.IO.Path.Combine(AppContext.BaseDirectory, "order.json");
    static readonly string HiddenFile = System.IO.Path.Combine(AppContext.BaseDirectory, "hidden");
    static readonly string QuietFile = System.IO.Path.Combine(AppContext.BaseDirectory, "no-finish-notifications");
    public static bool NotifyOnFinish
    {
        get => !File.Exists(QuietFile);
        set { try { if (value) File.Delete(QuietFile); else File.WriteAllText(QuietFile, ""); } catch { } }
    }
    Dictionary<string, string> _lastStates = null; // null until the first scan, so startup never notifies

    readonly StackPanel _panel = new() { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Stretch };
    readonly Discovery _discovery = new();
    readonly Dictionary<string, long> _seen = Load<Dictionary<string, long>>(SeenFile) ?? new(); // key -> acknowledged finish time
    readonly List<string> _order = Load<List<string>>(OrderFile) ?? new();                        // left-to-right keys
    readonly Popup _card = new() { AllowsTransparency = true, Placement = PlacementMode.Top, VerticalOffset = -10, PopupAnimation = PopupAnimation.Fade };
    readonly DispatcherTimer _hoverDelay = new() { Interval = TimeSpan.FromMilliseconds(180) };
    readonly HashSet<string> _known = new();                                                       // chats seen this run
    List<Session> _sessions = new();
    Dictionary<string, string> _states = new();
    string _signature = "";
    IntPtr _taskbar, _hwnd;
    readonly Tray _tray;

    // drag-to-reorder
    Session _pressed;
    Point _pressAt;
    bool _dragging;

    public BarWindow()
    {
        WindowStyle = WindowStyle.None;
        AllowsTransparency = true;
        Background = Brushes.Transparent;
        ShowInTaskbar = false;
        Topmost = true;
        ResizeMode = ResizeMode.NoResize;
        SizeToContent = SizeToContent.Width;
        Height = 48;
        Title = "GoatBar";
        Content = new Border { Background = Brushes.Transparent, Child = _panel, Padding = new Thickness(2, 0, 2, 0) };

        _taskbar = Native.FindWindow("Shell_TrayWnd", null);
        if (_taskbar != IntPtr.Zero) new WindowInteropHelper(this).Owner = _taskbar; // owned by the taskbar = drawn above it

        SourceInitialized += (_, _) =>
        {
            _hwnd = new WindowInteropHelper(this).Handle;
            Native.SetWindowLong(_hwnd, Native.GWL_EXSTYLE,
                Native.GetWindowLong(_hwnd, Native.GWL_EXSTYLE) | Native.WS_EX_TOOLWINDOW); // hide from Alt+Tab
        };
        Loaded += (_, _) => { Refresh(); Reposition(); _tray.WelcomeOnce(); };
        SizeChanged += (_, _) => Reposition();
        ContextMenuOpening += (_, e) => { e.Handled = true; ShowMenuAtCursor(); }; // same menu as the tray, placed above the taskbar
        _tray = new Tray(this);
        Closed += (_, _) => _tray.Dispose();
        if (File.Exists(HiddenFile)) Loaded += (_, _) => Hide(); // stays hidden across restarts until shown from the tray

        _card.Opened += (_, _) => KeepAboveTaskbar(_card.Child);
        _hoverDelay.Tick += (_, _) => { _hoverDelay.Stop(); if (_card.PlacementTarget != null && !_dragging) _card.IsOpen = true; };
        PreviewMouseMove += OnDragMove;
        PreviewMouseLeftButtonUp += OnRelease;
        LostMouseCapture += (_, _) => EndDrag();

        var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(800) };
        // Anything thrown on a tick would take the whole bar down; skip the frame instead.
        timer.Tick += (_, _) => { try { Refresh(); Reposition(); } catch { } };
        timer.Start();
    }

    static Brush Frozen(string hex)
    {
        var b = new SolidColorBrush((Color)ColorConverter.ConvertFromString(hex));
        b.Freeze();
        return b;
    }

    static Geometry FrozenGeometry(string data)
    {
        var g = Geometry.Parse(data);
        g.Freeze();
        return g;
    }

    // ---- placement: just left of the system tray, full taskbar height ------------
    void Reposition()
    {
        if (_taskbar == IntPtr.Zero || !Native.GetWindowRect(_taskbar, out var bar)) return;
        double scale = VisualTreeHelper.GetDpi(this).DpiScaleX;
        int right = bar.Right - (int)(300 * scale);
        IntPtr notify = Native.FindWindowEx(_taskbar, IntPtr.Zero, "TrayNotifyWnd", null);
        if (notify != IntPtr.Zero && Native.GetWindowRect(notify, out var n) && n.Width > 0 && n.Left > bar.Left)
            right = n.Left;
        Left = (right - ActualWidth * scale - 8 * scale) / scale;
        Top = bar.Top / scale;
        Height = bar.Height / scale;
        if (_hwnd != IntPtr.Zero)
            Native.SetWindowPos(_hwnd, Native.HWND_TOPMOST, 0, 0, 0, 0, Native.SWP_NOMOVE | Native.SWP_NOSIZE | Native.SWP_NOACTIVATE);
    }

    /// Popups are their own windows; lift this one above the (topmost) taskbar.
    static void KeepAboveTaskbar(Visual child)
    {
        if (child != null && PresentationSource.FromVisual(child) is HwndSource src)
            Native.SetWindowPos(src.Handle, Native.HWND_TOPMOST, 0, 0, 0, 0, Native.SWP_NOMOVE | Native.SWP_NOSIZE | Native.SWP_NOACTIVATE);
    }

    // ---- state ------------------------------------------------------------------
    static long Now() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

    /// A finished chat pulses green ("waiting") until you click it, then shows dim
    /// green ("seen") until it has been inactive for 30 minutes, then grey ("idle").
    string Effective(Session s)
    {
        if (s.State != "idle") return s.State;
        bool seen = _seen.TryGetValue(s.Key, out long at) && at == s.Since;
        if (!seen && !_known.Contains(s.Key) && Now() - s.Since > FreshFinishMs) { _seen[s.Key] = s.Since; seen = true; }
        if (!seen) return "waiting";
        return Now() - s.Since < SeenFadeMs ? "seen" : "idle";
    }

    void Refresh()
    {
        if (_dragging) return;
        // /resume can leave two records for one session id (a stale status file and
        // the live one); keep the most recent, or the duplicate key kills the timer.
        var found = _discovery.Scan()
            .GroupBy(s => s.Key)
            .Select(g => g.OrderByDescending(s => s.Since).First())
            .ToList();
        _states = found.ToDictionary(s => s.Key, Effective);
        // Notify when a chat goes from working to done while GoatBar is watching.
        if (_lastStates != null && NotifyOnFinish)
            foreach (var s in found)
                if (_states[s.Key] == "waiting" && _lastStates.TryGetValue(s.Key, out var was) && was == "working")
                    _tray?.Notify("Chat finished", $"{s.Name} ({(s.Tool == "codex" ? "Codex" : "Claude Code")}) is waiting on you.");
        _lastStates = new Dictionary<string, string>(_states);
        _known.UnionWith(_states.Keys);
        bool added = false;
        foreach (var s in found) if (!_order.Contains(s.Key)) { _order.Insert(0, s.Key); added = true; } // new chats join on the left: the bar grows leftward from the tray
        if (added) SaveOrder(found);
        _sessions = found.OrderBy(s => _order.IndexOf(s.Key)).ToList();

        _tray?.Update(Summary(), !IsVisible);
        string sig = string.Join("|", _sessions.Select(s => $"{s.Key}:{_states[s.Key]}:{s.Name}:{s.Step}:{s.Color}"));
        if (sig == _signature) return;
        _signature = sig;
        Rebuild();
    }

    void Rebuild()
    {
        _panel.Children.Clear();
        if (_sessions.Count == 0)
            _panel.Children.Add(new TextBlock { Text = "no agents", Foreground = Dim, FontSize = 11, Margin = new Thickness(6, 0, 6, 0), VerticalAlignment = VerticalAlignment.Center });
        foreach (var s in _sessions) _panel.Children.Add(Square(s, _states[s.Key]));
        if (_card.IsOpen && _card.PlacementTarget is FrameworkElement { Tag: Session open })
        {
            var match = _panel.Children.OfType<FrameworkElement>().FirstOrDefault(e => e.Tag is Session t && t.Key == open.Key);
            if (match != null) ShowCard(match, _sessions.First(x => x.Key == open.Key), immediate: true);
            else _card.IsOpen = false;
        }
    }

    // ---- view: one rounded square per chat ---------------------------------------
    const double Full = 34, CollapsedH = 6, CollapsedW = 28, Bottom = 7; // idle chats shrink to a short bar on the square's bottom edge

    FrameworkElement Square(Session s, string state)
    {
        bool idle = state == "idle";
        var bg = ((SolidColorBrush)StateColors[state].bg).Clone();
        var chat = (SolidColorBrush)ChatColor(s);
        var border = chat.Clone();
        if (idle) border.Opacity = 0.45;
        var hover = new Border { Background = Brushes.White, Opacity = 0, CornerRadius = new CornerRadius(6), IsHitTestVisible = false };
        var logo = Logo(s.Tool, 18, idle ? 0.5 : 1);
        var content = new Grid();
        content.Children.Add(logo);
        content.Children.Add(hover);
        var square = new Border
        {
            Width = Full, Height = Full, CornerRadius = new CornerRadius(8),
            Background = bg, BorderBrush = border, BorderThickness = new Thickness(2),
            Child = content, VerticalAlignment = VerticalAlignment.Bottom, HorizontalAlignment = HorizontalAlignment.Center,
            Margin = new Thickness(0, 0, 0, Bottom),
        };
        // Pulse disabled (steady green). To bring it back, uncomment:
        // if (state == "waiting")
        // bg.BeginAnimation(SolidColorBrush.ColorProperty, new ColorAnimation(bg.Color, Color.FromRgb(0x33, 0x7A, 0x55), TimeSpan.FromSeconds(1))
        // { AutoReverse = true, RepeatBehavior = RepeatBehavior.Forever, EasingFunction = new SineEase() });

        // The slot covers the whole bar height, so a collapsed chat is as easy to hover as a full one.
        var slot = new Grid
        {
            Width = Full, Margin = new Thickness(3, 0, 3, 0), Background = HitArea,
            Cursor = Cursors.Hand, Tag = s, Children = { square },
        };

        void Collapse(bool animate)
        {
            logo.Opacity = 0;
            square.CornerRadius = new CornerRadius(3.5);
            square.BorderThickness = new Thickness(0);
            square.Background = new SolidColorBrush(chat.Color) { Opacity = 0.55 };
            Resize(CollapsedW, CollapsedH, animate);
        }
        void Expand()
        {
            square.CornerRadius = new CornerRadius(8);
            square.BorderThickness = new Thickness(2);
            square.Background = bg;
            Resize(Full, Full, true);
            logo.BeginAnimation(OpacityProperty, new DoubleAnimation(0.5, TimeSpan.FromMilliseconds(160)));
        }
        void Resize(double w, double h, bool animate)
        {
            if (!animate)
            {
                square.BeginAnimation(WidthProperty, null); square.BeginAnimation(HeightProperty, null);
                square.Width = w; square.Height = h;
                return;
            }
            var ease = new QuadraticEase();
            square.BeginAnimation(WidthProperty, new DoubleAnimation(w, TimeSpan.FromMilliseconds(160)) { EasingFunction = ease });
            square.BeginAnimation(HeightProperty, new DoubleAnimation(h, TimeSpan.FromMilliseconds(160)) { EasingFunction = ease });
        }
        if (idle) Collapse(animate: false);

        slot.MouseEnter += (_, _) =>
        {
            if (_dragging) return;
            if (idle) Expand();
            hover.Opacity = 0.12;
            ShowCard(slot, s);
        };
        slot.MouseLeave += (_, _) =>
        {
            hover.Opacity = 0;
            if (_dragging) return;
            if (idle) { logo.BeginAnimation(OpacityProperty, null); Collapse(animate: true); }
            HideCard();
        };
        slot.MouseLeftButtonDown += (_, e) => { _pressed = s; _pressAt = e.GetPosition(_panel); CaptureMouse(); e.Handled = true; };
        return slot;
    }

    /// The chat's colour: its /color if it has one, else a fixed pick from its id.
    static Brush ChatColor(Session s)
    {
        if (ChatColors.TryGetValue(s.Color ?? "", out var b)) return b;
        uint h = 2166136261;
        foreach (char ch in s.Key) h = (h ^ ch) * 16777619; // FNV-1a: same chat, same colour, every run
        return ChatColors.Values.ElementAt((int)(h % (uint)ChatColors.Count));
    }

    static System.Windows.Shapes.Path Logo(string tool, double size, double opacity) => new()
    {
        Data = tool == "claude" ? ClaudeLogo : OpenAILogo, Fill = tool == "claude" ? ClaudeFill : OpenAIFill,
        Stretch = Stretch.Uniform, Width = size, Height = size, Opacity = opacity,
    };

    // ---- hover card -------------------------------------------------------------
    void ShowCard(FrameworkElement target, Session s, bool immediate = false)
    {
        _card.PlacementTarget = target;
        _card.HorizontalOffset = 0;
        _card.Child = Card(s, _states.TryGetValue(s.Key, out var st) ? st : s.State);
        if (immediate || _card.IsOpen) { _card.IsOpen = true; KeepAboveTaskbar(_card.Child); }
        else { _hoverDelay.Stop(); _hoverDelay.Start(); }
    }

    void HideCard()
    {
        _hoverDelay.Stop();
        _card.IsOpen = false;
    }

    UIElement Card(Session s, string state)
    {
        var accent = state == "idle" ? Dim : StateColors[state].border;
        string status = state switch
        {
            "working" => $"Working · {Elapsed(Now() - s.Since)}",
            "waiting" => $"Finished {Elapsed(Now() - s.Since)} ago · waiting on you",
            "seen" => $"Finished {Elapsed(Now() - s.Since)} ago",
            "asking" => "Needs your answer",
            _ => s.Since > 0 ? $"Idle · last active {Elapsed(Now() - s.Since)} ago" : "Idle",
        };

        var header = new DockPanel { LastChildFill = true };
        var logo = Logo(s.Tool, 14, 1);
        logo.Margin = new Thickness(0, 2, 8, 0);
        logo.VerticalAlignment = VerticalAlignment.Top;
        DockPanel.SetDock(logo, Dock.Left);
        header.Children.Add(logo);
        header.Children.Add(new TextBlock
        {
            Text = s.Name, Foreground = CardText, FontSize = 13, FontWeight = FontWeights.SemiBold,
            TextWrapping = TextWrapping.Wrap, MaxWidth = 280,
        });

        var statusRow = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 8, 0, 0) };
        statusRow.Children.Add(new System.Windows.Shapes.Ellipse { Width = 7, Height = 7, Fill = accent, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 7, 0) });
        statusRow.Children.Add(new TextBlock { Text = status, Foreground = accent, FontSize = 12 });

        var body = new StackPanel();
        body.Children.Add(header);
        body.Children.Add(new TextBlock
        {
            Text = $"{(s.Tool == "claude" ? "Claude Code" : "Codex")}  ·  {System.IO.Path.GetFileName(s.Cwd)}",
            Foreground = CardSub, FontSize = 11, Margin = new Thickness(22, 2, 0, 0),
        });
        body.Children.Add(statusRow);
        if (!string.IsNullOrEmpty(s.Step))
            body.Children.Add(new TextBlock
            {
                Text = "› " + s.Step, Foreground = CardSub, FontSize = 11, FontFamily = new FontFamily("Cascadia Mono, Consolas"),
                TextWrapping = TextWrapping.Wrap, MaxWidth = 300, Margin = new Thickness(0, 4, 0, 0),
            });

        return new Border
        {
            Background = CardBg, BorderBrush = CardBorder, BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(10), Padding = new Thickness(12, 10, 12, 10), Margin = new Thickness(12),
            MinWidth = 200, Child = body,
            Effect = new DropShadowEffect { BlurRadius = 18, ShadowDepth = 4, Direction = 270, Opacity = 0.55, Color = Colors.Black },
        };
    }

    static string Elapsed(long ms)
    {
        long m = Math.Max(0, ms) / 60000;
        return m < 1 ? "<1m" : m < 60 ? m + "m" : m < 1440 ? $"{m / 60}h {m % 60}m" : $"{m / 1440}d {m % 1440 / 60}h";
    }

    // ---- click vs drag ----------------------------------------------------------
    void OnDragMove(object sender, MouseEventArgs e)
    {
        if (_pressed == null || e.LeftButton != MouseButtonState.Pressed) return;
        var p = e.GetPosition(_panel);
        if (!_dragging)
        {
            if (Math.Abs(p.X - _pressAt.X) < 5) return;
            _dragging = true;
            HideCard();
        }
        int from = _sessions.FindIndex(s => s.Key == _pressed.Key);
        int to = Math.Clamp((int)((p.X - 2) / Slot), 0, _sessions.Count - 1);
        if (from >= 0 && to != from)
        {
            var moved = _sessions[from];
            _sessions.RemoveAt(from);
            _sessions.Insert(to, moved);
            Rebuild();
        }
        foreach (var slot in _panel.Children.OfType<Grid>())
            if (slot.Tag is Session t && t.Key == _pressed.Key && slot.Children[0] is Border el)
            {
                el.BeginAnimation(HeightProperty, null); el.BeginAnimation(WidthProperty, null);
                el.Height = Full; el.Width = Full;
                el.CornerRadius = new CornerRadius(8);
                el.Background = GrabBg;
                el.BorderBrush = GrabBorder;
                el.BorderThickness = new Thickness(2);
                if (el.Child is Grid g && g.Children[0] is UIElement logo) { logo.BeginAnimation(OpacityProperty, null); logo.Opacity = 1; }
            }
    }

    void OnRelease(object sender, MouseButtonEventArgs e)
    {
        if (_pressed == null) return;
        var s = _pressed;
        bool dragged = _dragging;
        ReleaseMouseCapture();
        EndDrag();
        if (dragged)
        {
            // Visible chats take their new slots; chats not running keep their relative place after them.
            var visible = _sessions.Select(x => x.Key).ToList();
            _order.RemoveAll(visible.Contains);
            _order.InsertRange(0, visible);
            SaveOrder(_sessions);
        }
        else
        {
            FocusHost(s);
            if (s.State == "idle") { _seen[s.Key] = s.Since; Save(SeenFile, _seen); }
        }
        _signature = "";
        Refresh();
    }

    void EndDrag()
    {
        _pressed = null;
        _dragging = false;
        _signature = ""; // next refresh redraws the grabbed square normally
    }

    // ---- click: bring the chat's window to the front ------------------------------
    static void FocusHost(Session s)
    {
        if (s.HostPid <= 0) return;
        var windows = Native.WindowsOf((uint)s.HostPid);
        if (windows.Count == 0) return;

        // Zed runs every window in one process: pick the window whose title names
        // the chat's folder (or the nearest parent folder).
        IntPtr target = windows[0];
        for (var d = s.Cwd; !string.IsNullOrEmpty(d); d = System.IO.Path.GetDirectoryName(d))
        {
            string name = System.IO.Path.GetFileName(d);
            if (string.IsNullOrEmpty(name)) continue;
            var hit = windows.FirstOrDefault(w => Native.Title(w).Contains(name, StringComparison.OrdinalIgnoreCase));
            if (hit != IntPtr.Zero) { target = hit; break; }
        }

        if (Native.IsIconic(target)) Native.ShowWindow(target, Native.SW_RESTORE);
        Native.keybd_event(0x12, 0, 0, UIntPtr.Zero);      // tap Alt: lifts Windows' focus-stealing lock
        Native.keybd_event(0x12, 0, 2, UIntPtr.Zero);
        Native.SetForegroundWindow(target);
        Native.BringWindowToTop(target);
    }

    // ---- persistence ------------------------------------------------------------
    static T Load<T>(string file) where T : class
    {
        try { return JsonSerializer.Deserialize<T>(File.ReadAllText(file)); } catch { return null; }
    }

    static void Save<T>(string file, T value)
    {
        try { File.WriteAllText(file, JsonSerializer.Serialize(value)); } catch { }
    }

    void SaveOrder(List<Session> live)
    {
        // Forget closed chats beyond the most recent 100 so the file can't grow forever.
        var liveKeys = live.Select(s => s.Key).ToHashSet();
        while (_order.Count > 100)
        {
            int i = _order.FindIndex(k => !liveKeys.Contains(k));
            if (i < 0) break;
            _order.RemoveAt(i);
        }
        Save(OrderFile, _order);
    }

    // ---- shared with the tray icon ----------------------------------------------
    public void ToggleVisible()
    {
        if (IsVisible) { HideCard(); Hide(); File.WriteAllText(HiddenFile, ""); }
        else { Show(); Reposition(); try { File.Delete(HiddenFile); } catch { } }
        _signature = "";
        Refresh();
    }

    public void MarkAllSeen()
    {
        foreach (var s in _sessions.Where(s => s.State == "idle")) _seen[s.Key] = s.Since;
        Save(SeenFile, _seen);
        _signature = "";
        Refresh();
    }

    /// "5 chats · 2 done · 1 working", shared by the tray tooltip and the menu header.
    public string Summary()
    {
        int total = _sessions.Count;
        if (total == 0) return "No chats running";
        int done = _states.Values.Count(v => v == "waiting"), working = _states.Values.Count(v => v == "working");
        return $"{total} chat{(total == 1 ? "" : "s")}" + (done > 0 ? $" · {done} done" : "") + (working > 0 ? $" · {working} working" : "");
    }

    /// Opens the menu above the taskbar at the mouse's x (tray icon and bar
    /// right-click; works while the bar is hidden). Rebuilt each time for fresh counts.
    public void ShowMenuAtCursor()
    {
        var menu = AgentMenu.Build(this, Summary());
        double scale = VisualTreeHelper.GetDpi(this).DpiScaleX;
        Native.GetCursorPos(out var cursor);
        double top = _taskbar != IntPtr.Zero && Native.GetWindowRect(_taskbar, out var bar) ? bar.Top : cursor.Y;
        menu.Placement = System.Windows.Controls.Primitives.PlacementMode.Top; // above this point; WPF keeps it on screen
        // With no PlacementTarget this rectangle is in physical screen pixels, not DIPs.
        menu.PlacementRectangle = new Rect(cursor.X - 130 * scale, top, 0, 0);
        menu.Opened += (_, _) => KeepAboveTaskbar(menu);
        if (_hwnd != IntPtr.Zero) Native.SetForegroundWindow(_hwnd); // so a click elsewhere closes it
        menu.IsOpen = true;
    }

    public static bool StartsWithWindows()
    {
        using var key = Registry.CurrentUser.OpenSubKey(RunKey);
        return key?.GetValue("GoatBar") != null;
    }

    public static void SetStartWithWindows(bool on)
    {
        using var key = Registry.CurrentUser.CreateSubKey(RunKey);
        if (on) key.SetValue("GoatBar", $"\"{Environment.ProcessPath}\"");
        else key.DeleteValue("GoatBar", false);
    }
}
