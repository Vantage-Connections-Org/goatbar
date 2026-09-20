<p align="center">
  <img src="docs/icon.png" width="112" alt="GoatBar icon: a goat in sunglasses peeking over a taskbar">
</p>

<h1 align="center">GoatBar</h1>

<p align="center">
  <b>Every Claude Code and Codex chat you have running, as a row of squares in your Windows taskbar.</b><br>
  See which agents are working, which are done, and jump to one with a click.
</p>

<p align="center">
  <a href="https://github.com/Vantage-Connections-Org/goatbar/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/Vantage-Connections-Org/goatbar?color=38845C"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/github/license/Vantage-Connections-Org/goatbar?color=38845C"></a>
  <img alt="Windows 10/11" src="https://img.shields.io/badge/Windows-10%20%7C%2011-38845C">
</p>

<p align="center">
  <a href="https://github.com/Vantage-Connections-Org/goatbar/releases/latest/download/GoatBar-windows-x64.zip"><b>Download for Windows</b></a>
  &nbsp;·&nbsp;
  <a href="https://goatbar.melbora.com">Website</a>
  &nbsp;·&nbsp;
  <a href="https://goatbar.melbora.com/#mac">Mac waitlist</a>
</p>

<p align="center">
  <img src="docs/taskbar.png" alt="GoatBar in the Windows 11 taskbar, left of the system tray">
</p>

---

## What you get

<p align="center">
  <img src="docs/closeup.png" alt="Close-up: squares with coloured borders and status backgrounds; idle chats collapsed to thin bars">
</p>

One square per chat, sitting in the empty part of your taskbar next to the tray.

- **Background = status.** Glance at the taskbar instead of cycling through terminals.
- **Border = the chat's colour.** For Claude Code that's the chat's own `/color`, so the square matches its prompt bar. Codex chats (and Claude chats without a colour) get a fixed colour of their own.
- **Logo = the tool.** Claude Code or Codex.
- **Idle chats shrink to a thin bar** so the chats that matter stand out. Hover one and it pops back to a full square.

| Background | Meaning |
|---|---|
| 🟫 Dull orange | Working. No need to look. |
| 🟩 Green | Done, waiting on you. Stays green until you click it. |
| Dim green | Done, and you've already looked. Fades to idle after 30 min of no activity. |
| 🟦 Blue | Needs an answer: a permission prompt or a question (requires the [optional hook](#optional-live-step-and-needs-an-answer)). |
| Thin bar | Idle. |

### Hover for details, click to jump

<p align="center">
  <img src="docs/hover-card.png" alt="Hover card showing the chat name, tool, folder, status with elapsed time, and the current step">
</p>

- **Hover** a square for the chat's name, tool and folder, its status and elapsed time, and what it's doing right now.
- **Click** to bring that chat's window (Zed, Windows Terminal, VS Code, Cursor, …) to the front. A green square turns dim green once you've looked.
- **Drag** squares to reorder them. The order is remembered.

  <img src="docs/demo-drag.gif" alt="Dragging a chat square along the GoatBar row: it lights up while held and drops into a new position">

- **Right-click** the bar or the tray icon for a menu with *Hide bar*, *Start with Windows* and *Notify when a chat finishes* switches, *Mark all finished as seen* and *Quit*.
- **Notifications:** when a chat finishes, a Windows notification says which one is waiting on you (switch it off in the menu).
- **Tray icon:** click the goat in the system tray to show or hide the bar. Hovering it shows a count (e.g. "5 chats, 2 done, 1 working"), and right-clicking it opens the same menu. A hidden bar stays hidden across restarts until you show it again. Windows puts new tray icons in the <code>^</code> overflow at first, so drag the goat onto the taskbar to keep it visible.

## Install

**[Download GoatBar for Windows](https://github.com/Vantage-Connections-Org/goatbar/releases/latest/download/GoatBar-windows-x64.zip)** (Windows 10/11, taskbar at the bottom). Unzip it anywhere, ideally `%LOCALAPPDATA%GoatBar`, and run `GoatBar.exe`. Nothing else to install. The exe isn't code-signed yet, so SmartScreen may ask first: choose *More info*, then *Run anyway*. Right-click the tray goat and turn on *Start with Windows*.

With [Scoop](https://scoop.sh) (new, not yet tested on a clean machine):

```powershell
scoop bucket add goatbar https://github.com/Vantage-Connections-Org/goatbar
scoop install goatbar
```

On a Mac? A menu bar preview is in the [latest release](https://github.com/Vantage-Connections-Org/goatbar/releases/latest) (untested so far, feedback welcome), and you can [join the waitlist](https://goatbar.melbora.com/#mac) for the stable version.

### Build from source

Needs the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (`winget install Microsoft.DotNet.SDK.8`).

```powershell
git clone https://github.com/Vantage-Connections-Org/goatbar
cd goatbar
.\install.ps1 -StartWithWindows
```

This builds a single ~330 KB `GoatBar.exe` into `%LOCALAPPDATA%\GoatBar`, adds a Start menu shortcut, and starts it. Launch it again any time from Start → **GoatBar**. Only one copy ever runs. `.\uninstall.ps1` removes it all.

**That's it.** GoatBar finds your chats on its own. No configuration needed.

## How it works

GoatBar reads the files each tool already keeps about its own chats. It needs no API keys and no network, and never modifies Claude Code's or Codex's files:

| | Finds running chats from | Status | Name |
|---|---|---|---|
| **Claude Code** | `~/.claude/sessions/<pid>.json` (checked against the live process) | `busy` / `idle` from the same file | Your `/rename`, else the auto-generated title in the chat transcript |
| **Codex** | `~/.codex/thread-writer-locks/<id>.lock`, held open while a chat is live | `task_started` / `task_complete` in the chat's rollout log | `~/.codex/session_index.jsonl` |

To bring a chat's window forward, it walks up the process tree from the agent to the app hosting its terminal, then picks that app's window whose title names the chat's folder.

The bar is a small WPF window owned by the taskbar, so it stays above it. Windows 11 has no official way to add things to the taskbar.

## Optional: live step and "needs an answer"

Without hooks, GoatBar already shows working / done / idle for every chat. Adding the included hook also shows **the step the agent is on** in the hover card, and turns a square **blue** when a chat is waiting for your answer.

**Claude Code:** add this to `~/.claude/settings.json`, replacing `<you>`:

```json
{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "node \"C:\\Users\\<you>\\AppData\\Local\\GoatBar\\hooks\\agent-status.js\" start claude" }] }],
    "PreToolUse":   [{ "matcher": "", "hooks": [{ "type": "command", "command": "node \"C:\\Users\\<you>\\AppData\\Local\\GoatBar\\hooks\\agent-status.js\" tool claude" }] }],
    "PostToolUse":  [{ "matcher": "AskUserQuestion", "hooks": [{ "type": "command", "command": "node \"C:\\Users\\<you>\\AppData\\Local\\GoatBar\\hooks\\agent-status.js\" toolDone claude" }] }],
    "Notification": [{ "hooks": [{ "type": "command", "command": "node \"C:\\Users\\<you>\\AppData\\Local\\GoatBar\\hooks\\agent-status.js\" ask claude" }] }]
  }
}
```

**Codex:** add this to `~/.codex/hooks.json`. Codex asks you to trust new hooks once.

```json
{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "node \"C:\\Users\\<you>\\AppData\\Local\\GoatBar\\hooks\\agent-status.js\" start codex" }] }],
    "PostToolUse":  [{ "hooks": [{ "type": "command", "command": "node \"C:\\Users\\<you>\\AppData\\Local\\GoatBar\\hooks\\agent-status.js\" tool codex" }] }]
  }
}
```

The `start` hook also launches GoatBar if it isn't running. Hooks need [Node.js](https://nodejs.org). If you installed GoatBar somewhere else, set `GOATBAR_EXE` to the exe's path.

## Tip: give every chat its own colour

Claude Code's `/color` also works as a starting prompt, so a PowerShell function can give every new chat a random prompt-bar colour, and GoatBar's border picks it up:

```powershell
function c {
  if ($args.Count) { claude @args; return }   # only one starting prompt is allowed
  $colors = 'red','blue','green','yellow','purple','orange','pink','cyan'
  claude "/color $($colors | Get-Random)"
}
```

## Guides

Practical notes for running several agents at once, on the website:

- [How to run multiple Claude Code sessions on Windows](https://goatbar.melbora.com/guides/run-multiple-claude-code-sessions)
- [How to get notified when Claude Code is done](https://goatbar.melbora.com/guides/know-when-claude-code-is-done)
- [How to track multiple Codex CLI sessions](https://goatbar.melbora.com/guides/track-codex-cli-sessions)
- [Claude Code hooks on Windows: a practical intro](https://goatbar.melbora.com/guides/claude-code-hooks-on-windows)
- [Claude Code vs Codex CLI: how sessions work](https://goatbar.melbora.com/guides/claude-code-vs-codex-cli-sessions)
- [How to get notified when Codex CLI is done](https://goatbar.melbora.com/guides/codex-cli-notifications)
- [Git worktrees for running AI coding agents in parallel](https://goatbar.melbora.com/guides/git-worktrees-for-parallel-ai-agents)

## Limitations

- **Windows first**, with the taskbar at the bottom of the primary monitor. The macOS menu bar version is an untested preview.
- **Clicking focuses the window, not the terminal tab.** If several chats share one editor window, you land in that window and pick the tab yourself. Zed has no way for other apps to switch its terminal tabs.
- It reads files Claude Code and Codex write for their own use. Those aren't public APIs, so a future release of either tool could change them.

## Development

```powershell
dotnet run --project src          # run from source
dotnet publish src -c Release -r win-x64 --self-contained false -p:PublishSingleFile=true -o out
cd art; py make_ico.py             # rebuild the icon from the source art (needs Pillow)
```

`src/Discovery.cs` finds the chats, `src/BarWindow.cs` draws the bar and handles hover, drag and click, and `src/Native.cs` holds the Win32 calls.

## Credits

Claude and OpenAI logos from [Simple Icons](https://simpleicons.org) (CC0). Both are trademarks of their owners, and this project isn't affiliated with Anthropic or OpenAI.

## License

[MIT](LICENSE) © 2026 Vantage Connections
