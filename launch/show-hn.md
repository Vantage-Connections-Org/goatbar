# Show HN draft

DRAFT. Do not post until the checklist in `launch/README.md` is done.

## Title (76 chars)

Show HN: GoatBar – Claude Code and Codex chat status in the Windows taskbar

## URL field

https://github.com/Vantage-Connections-Org/goatbar

(Link the repo, not https://goatbar.melbora.com. HN readers want the code first. Put https://goatbar.melbora.com in the comment instead.)

## First comment (post right after submitting)

Hi HN. I usually have several Claude Code and Codex chats running at once across a few editor and terminal windows, and I kept cycling through them just to see which ones had finished. GoatBar puts one small square per running chat in the empty part of the Windows taskbar, next to the tray.

What it shows:

- Background colour is status: dull orange = working, green = done and waiting on you (stays green until you click it), dim green = done and already looked at, thin bar = idle. Blue = waiting on a permission prompt or question, if you install the optional hook.
- Border colour is the chat's colour. For Claude Code that's the chat's own `/color`, so the square matches its prompt bar.
- Hover shows the chat name, tool, folder, status with elapsed time, and (with the hook) the step it's on.
- Click brings the window hosting that chat to the front (Zed, Windows Terminal, VS Code, Cursor, etc.).

How it works:

It doesn't talk to any API and makes no network calls. It reads the files each tool already writes about its own chats, and never modifies them:

- Claude Code: `~/.claude/sessions/<pid>.json`, checked against the live process table so stale files for dead processes are skipped. Status (`busy`/`idle`) comes from the same file. The name is your `/rename` if you set one, otherwise the auto-generated title, read from the tail of the chat transcript `.jsonl`.
- Codex: a live chat holds `~/.codex/thread-writer-locks/<id>.lock` open, so GoatBar tries to open each lock exclusively and treats a sharing violation as "this chat is live". Status is the last `task_started` / `task_complete` / `turn_aborted` event in the chat's rollout log. Names come from `~/.codex/session_index.jsonl`.
- To focus a chat, it walks up the process tree from `claude.exe` / `codex.exe` to the app hosting the terminal, then picks that app's window whose title contains the chat's folder.
- It re-scans every 800 ms and caches by file length, so transcripts are only tail-read when they grow.

The bar itself is a small WPF window owned by the taskbar so it stays above it. Windows 11 has no official way to add things to the taskbar, so this is the workaround. It's C# / .NET 8 and builds to a single ~330 KB exe.

The optional hook is a small Node script you add to Claude Code's `settings.json` or Codex's `hooks.json`. It writes a status file per chat to `~/.claude/agent-status/`, which adds the current step and the blue "needs an answer" state. Without it you still get working / done / idle for every chat.

Limitations, honestly:

- Windows 10/11 only, with the taskbar at the bottom of the primary monitor.
- Clicking focuses the window, not the terminal tab. If several chats share one editor window you land in the window and pick the tab yourself. Zed has no way for other apps to switch its terminal tabs.
- The session files it reads aren't public APIs. A future Claude Code or Codex release could change them and break discovery.
- The exe isn't code-signed yet, so SmartScreen asks once. Download is a self-contained zip (no .NET needed) from GitHub Releases.
- The macOS menu-bar version is an early preview: it builds and launches in CI but has had little real-world testing.

It's free and MIT licensed. Not affiliated with Anthropic or OpenAI.

Repo: https://github.com/Vantage-Connections-Org/goatbar
Page: https://goatbar.melbora.com

I'd like feedback on two things in particular: whether discovery breaks with your setup (different terminal, WSL, remote sessions, multiple monitors), and whether there's a less hacky way to sit in the Windows 11 taskbar than a taskbar-owned window. Bug reports with your terminal/editor name are very welcome.
