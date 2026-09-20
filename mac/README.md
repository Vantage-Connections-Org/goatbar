# GoatBar for macOS

Every Claude Code and Codex chat you have running, as a row of small squares in the macOS menu bar.
Click the row for a list of chats. Click a chat to bring its app to the front.

A native SwiftUI menu bar app (`MenuBarExtra`), macOS 13 or later. It reads the same files as the
Windows app (see the main [README](../README.md#how-it-works)). It needs no API keys and no network,
and never writes to Claude Code's or Codex's files.

## What the squares mean

| Fill | Meaning |
|---|---|
| Dull orange | Working |
| Green | Done, waiting on you. Stays green until you click it in the list. |
| Dim green | Done, and you've looked. Turns idle 30 min after the chat finished. |
| Blue | Needs an answer (permission prompt or question) |
| Short bar | Idle |

- **Border:** the chat's colour. For Claude Code that is its `/color`. Codex chats, and Claude chats with no colour, get a fixed colour from their id. It matches the Windows app.
- **Logo:** Claude Code or Codex.
- **List:** name, tool, folder, status, time since the last change, and the current step if the [optional hook](../README.md#optional-live-step-and-needs-an-answer) is installed. The hook's `node` paths must point to your copy of `hooks/agent-status.js`. Its `--who` helper is Windows-only, so on a Mac the hook adds the step and the blue "asking" state, but not the host lookup.
- **Footer:** *Mark all finished as seen*, *Quit GoatBar*.

## Download

Every push to `main` that touches `mac/` builds `GoatBar-mac.zip` in GitHub Actions
(**Actions → mac → latest run → Artifacts**). Unzip it and move `GoatBar.app` to `/Applications`.

The app is **not signed with a Developer ID and not notarized**. The first time you open it:

- macOS 13–14: right-click `GoatBar.app` → **Open** → **Open**.
- macOS 15 and later: open it once, then go to **System Settings → Privacy & Security** and click **Open Anyway**.
- Or clear the quarantine flag: `xattr -dr com.apple.quarantine /Applications/GoatBar.app`

## Build from source

Needs Xcode 15 or later, or the Xcode Command Line Tools with Swift 5.9 or later.

```bash
cd mac
swift run                 # run from source (no Dock icon; quit from the menu)
bash build-app.sh         # universal release build → build/GoatBar.app and build/GoatBar-mac.zip
open build/GoatBar.app
```

To start it at login, add `GoatBar.app` under **System Settings → General → Login Items**.

## How clicking finds the window

GoatBar walks up the process tree from the agent (`sysctl` `KERN_PROC`) to the nearest regular app,
for example Terminal, iTerm2, Warp, Ghostty, VS Code, Cursor or Zed. It then activates that app.

## Limitations

- **Unsigned.** See above for the first-launch steps.
- **Activates the app, not the window or tab.** If several chats share one app, you land in that app's
  front window. Picking a specific window would need the Accessibility permission, which this app doesn't request.
- **Chats inside tmux or screen** have no GUI ancestor (the multiplexer server runs under `launchd`),
  so clicking them does nothing.
- **Codex:** a chat counts as live while another process holds a lock on
  `~/.codex/thread-writer-locks/<id>.lock`. GoatBar tests this with a non-blocking `flock`. All Codex
  chats share the host app of the first `codex` process found, the same as on Windows.
- It reads files Claude Code and Codex write for their own use. Those aren't public APIs, so a
  future release of either tool could change them.

## Files

| | |
|---|---|
| `Sources/GoatBar/Discovery.swift` | Finds the chats (port of `src/Discovery.cs`) |
| `Sources/GoatBar/Store.swift` | Polling, the waiting / seen / idle state machine, persistence, activating the host app |
| `Sources/GoatBar/GoatBarApp.swift` | Menu bar image and dropdown |
| `Sources/GoatBar/Icons.swift` | Claude and OpenAI logos, with a small SVG path parser |
| `Info.plist`, `build-app.sh` | App bundle (`LSUIElement`: menu bar only, no Dock icon) |

State (`seen.json`, `order.json`) is kept in `~/Library/Application Support/GoatBar/`.
