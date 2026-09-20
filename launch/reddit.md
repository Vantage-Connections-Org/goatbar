# Reddit drafts

DRAFTS. Do not post until the checklist in `launch/README.md` is done.

Before each post: re-read that sub's sidebar rules and pinned posts on the day. Rules and required flairs change, and nothing below has been checked against today's rules. Every post discloses that it's my own project. Space the four posts out (see `launch/README.md`); don't crosspost all four the same hour.

---

## r/ClaudeAI

Flair: pick the sub's project / showcase flair if one exists.
Image: `docs/taskbar.png` as the post image, or a text post with the repo link.

**Title**

I made a Windows taskbar strip that shows which of my Claude Code chats are working, done, or waiting on me

**Body**

Disclosure: this is my own project. It's free and MIT, no account, no telemetry.

I run several Claude Code chats at once and kept alt-tabbing through terminals just to see which had finished. GoatBar puts one square per running chat in the empty part of the Windows taskbar:

- Orange = working, green = done and waiting on you (stays green until you click it), dim green = done and you've looked, thin bar = idle.
- The border is the chat's own `/color`, so the square matches its prompt bar.
- Hover shows the name (your `/rename`, or the auto title), folder, status and elapsed time.
- Click jumps to the window running that chat (Windows Terminal, VS Code, Cursor, Zed, etc.).

How it finds chats: it reads `~/.claude/sessions/<pid>.json` and checks the pid against running processes, then reads the title and `/color` from the tail of the chat transcript. No API key, no network, and it never writes to Claude Code's files.

There's an optional hook (SessionStart / PreToolUse / PostToolUse / Notification in `settings.json`) that adds the current step to the hover card and turns the square blue when Claude is waiting on a permission prompt or a question.

Small tip from the README: `/color` works as a starting prompt, so a PowerShell function that runs `claude "/color <random>"` gives every chat its own colour and the border picks it up.

Limits: Windows 10/11 (Mac is an early preview), taskbar at the bottom. Clicking focuses the window, not the specific terminal tab. It reads files Claude Code keeps for itself, which aren't a public API, so an update could break it. You build it from source with the .NET 8 SDK (`install.ps1` does it). A macOS menu-bar version is in progress, not out yet.

Also works with Codex chats if you use both.

Repo: https://github.com/Vantage-Connections-Org/goatbar

Not affiliated with Anthropic. Feedback and bug reports welcome, especially "it didn't find my chat" with your terminal/editor.

---

## r/ChatGPTCoding

Angle: Codex CLI users, and people running Codex alongside Claude Code.
Image: `docs/closeup.png` (shows both logos).

**Title**

Open-source Windows taskbar indicator for Codex CLI and Claude Code chats: working / done / idle at a glance

**Body**

Self-promo disclosure: I wrote this. Free, MIT, no API key, no network.

If you run multiple Codex sessions (or Codex and Claude Code side by side), GoatBar shows one square per live chat in the Windows taskbar. Orange while it's working, green when it's finished and waiting on you, a thin bar when idle. Click a square to bring that chat's window to the front.

How it tracks Codex without any API:

- A live Codex chat holds `~/.codex/thread-writer-locks/<id>.lock` open. GoatBar tries to open each lock exclusively; if Windows says it's in use, the chat is live. If no `codex.exe` is running at all, every lock is treated as stale.
- Status is the most recent `task_started` vs `task_complete` / `turn_aborted` event in that chat's rollout `.jsonl` (it tail-reads the last 256 KB).
- The chat name comes from `~/.codex/session_index.jsonl`, falling back to the folder name.
- To focus it, it walks up the process tree from `codex.exe` to the host app (Windows Terminal, VS Code, Cursor, Windsurf, WezTerm, JetBrains IDEs, etc.) and picks the window whose title contains the chat's folder.

It never writes to Codex's files. An optional hook in `~/.codex/hooks.json` (SessionStart + PostToolUse, Codex asks you to trust it once) adds the current step to the hover card.

Limits: Windows 10/11 (Mac is an early preview), bottom taskbar. It focuses the window, not the terminal tab. The lock/rollout files aren't a public interface, so a Codex update could break detection. Build from source with the .NET 8 SDK. A macOS menu-bar version is in progress, not released.

https://github.com/Vantage-Connections-Org/goatbar

Not affiliated with OpenAI. If it misses one of your Codex sessions, an issue with your setup would help a lot.

---

## r/windows

Angle: a small native Windows utility, how it sits in the Windows 11 taskbar. Less AI talk.
Image: `docs/taskbar.png`.
Note: r/windows can be strict about self-promotion and about what counts as on-topic. Check the rules; if project posts aren't allowed, skip this sub rather than bend it.

**Title**

I wrote a small open-source utility that adds a status strip to the Windows 11 taskbar (for AI coding agent sessions)

**Body**

My own project, free and MIT.

GoatBar is a ~330 KB C#/WPF exe that puts a row of small squares in the empty area of the taskbar, left of the system tray. Each square is one running Claude Code or Codex session (terminal-based coding assistants), coloured by whether it's working, finished, or idle. Click one to bring the window running it to the front.

Windows-specific bits that might interest people here:

- Windows 11 has no supported way to add things to the taskbar, so the bar is a small window owned by the taskbar, which keeps it above it. It repositions itself as the taskbar changes.
- To focus the right window it walks the process tree from the agent process up to the app hosting its terminal (Windows Terminal, VS Code, etc.) and matches that app's windows by title.
- Tray icon toggles the bar; right-click gives Hide bar, Start with Windows, and Quit. A hidden bar stays hidden across restarts. New tray icons land in the `^` overflow, so you drag it out if you want it visible.
- Single instance, installs to `%LOCALAPPDATA%\GoatBar` with a Start menu shortcut, `uninstall.ps1` removes it.

No network access, no admin rights needed to run. It only reads the session files those tools keep locally.

Limits: needs the taskbar at the bottom of the primary monitor. Download: a self-contained zip from GitHub Releases (no .NET needed), or Scoop.

https://github.com/Vantage-Connections-Org/goatbar

I'd appreciate hearing if it misbehaves with taskbar settings I haven't thought of.

---

## r/opensource

Angle: the project itself, license, how to contribute, what help is wanted.
Image: optional, `docs/closeup.png`.

**Title**

GoatBar: MIT-licensed Windows taskbar status for Claude Code and Codex chats, reads local files only

**Body**

Sharing a project I made. It's MIT licensed and has no telemetry, accounts or network calls.

What it does: shows one square per running Claude Code or Codex chat in the Windows taskbar, coloured by status (working / done / waiting on you / idle). Hover for details, click to jump to that chat's window.

How: it reads the session files the two tools already keep under `~/.claude` and `~/.codex`, checks them against the live process table, and never modifies them. An optional Node hook adds the current step and a "needs an answer" state.

Code layout, for anyone who wants to poke at it (about 1,100 lines of C#):

- `src/Discovery.cs` finds the chats
- `src/BarWindow.cs` draws the bar and handles hover, drag and click
- `src/Native.cs` holds the Win32 calls
- `hooks/agent-status.js` is the optional hook

Where help would be useful:

- Hosts that the window-focus logic doesn't handle yet (it currently recognises Zed, Windows Terminal, VS Code, Cursor, Windsurf, WezTerm, Alacritty and a few JetBrains IDEs by name, and falls back to any ancestor process with a window).
- Taskbar positions other than bottom-of-primary-monitor, which aren't supported.
- A macOS menu-bar version is out as an early preview (lightly tested); feedback welcome.

Known fragility: the files it reads aren't public APIs, so upstream changes in either tool can break discovery.

https://github.com/Vantage-Connections-Org/goatbar

Not affiliated with Anthropic or OpenAI. Issues and PRs welcome.
