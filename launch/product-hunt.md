# Product Hunt draft

DRAFT. Do not submit until the checklist in `launch/README.md` is done.

## Name

GoatBar

## Tagline (56 chars, limit 60)

Your Claude Code and Codex chats, in the Windows taskbar

## Links

- Website: https://goatbar.melbora.com
- GitHub: https://github.com/Vantage-Connections-Org/goatbar

## Pricing

Free. Open source (MIT).

## Topics (pick up to 3 when submitting)

Developer Tools, Open Source, Windows

## Description

GoatBar shows every running Claude Code and Codex chat as a small square in the empty part of your Windows taskbar. The background tells you the status: orange while it's working, green when it's done and waiting on you, blue when it needs an answer (with the optional hook), a thin bar when idle. Hover for the chat's name, folder and elapsed time; click to bring its window to the front. It reads the session files each tool already keeps on disk. No API keys, no network, no account.

## Maker's first comment

Hi Product Hunt. I made GoatBar because I run several Claude Code and Codex chats at once and kept cycling through terminal windows to see which ones had finished.

What it does:
- One square per running chat, next to the system tray.
- Background = status (working / done and waiting on you / done and seen / idle). Green stays green until you click it.
- Border = the chat's colour. For Claude Code that's its own `/color`.
- Hover for details, click to jump to the window running that chat (Windows Terminal, VS Code, Cursor, Zed and others). Drag to reorder.

How it works: it reads files Claude Code and Codex already write about their own chats, like `~/.claude/sessions/<pid>.json` and the lock file a live Codex chat holds open, and checks them against running processes. It never modifies those files and never touches the network. An optional hook adds the step the agent is on and a blue "needs an answer" state.

What it doesn't do yet:
- Windows 10/11 only, taskbar at the bottom of the primary monitor.
- Clicking focuses the window, not the specific terminal tab.
- Download a zip from GitHub Releases, unzip, run. No installer, no .NET install needed. Also on Scoop.
- The files it reads aren't official APIs, so a tool update could break it.
- A macOS menu-bar version is out as an early, lightly tested preview.

It's free and MIT licensed, and not affiliated with Anthropic or OpenAI. I'd love to hear what breaks on your setup.

## Gallery (3 images, in this order)

1. `docs/taskbar.png`
   Caption: One square per running Claude Code or Codex chat, next to the system tray.

2. `docs/closeup.png`
   Caption: Background shows status, border shows the chat's colour, idle chats shrink to a thin bar.

3. `docs/hover-card.png`
   Caption: Hover for name, tool, folder, status and elapsed time. Click to jump to that window.

Thumbnail: `docs/icon.png` (256x256).

Sizing problem: Product Hunt's gallery is 1270x760, but `taskbar.png` is 804x157, `closeup.png` 1095x168 and `hover-card.png` 1140x410. The two taskbar strips will show as thin bands or get cropped. Pad each onto a 1270x760 dark canvas (centred, not stretched) before uploading, and check the preview.
