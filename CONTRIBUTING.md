# Contributing to GoatBar

Thanks for helping. Issues and pull requests are welcome.

## Layout

| Path | What |
|---|---|
| `src/` | Windows app (C#, WPF, .NET 8). `Discovery.cs` finds chats, `BarWindow.cs` draws the bar, `Native.cs` has the Win32 calls. |
| `mac/` | macOS menu bar preview (Swift, SwiftUI). Built in CI by `.github/workflows/mac.yml`. |
| `hooks/agent-status.js` | Optional hook that adds the live step and "needs an answer" state. |
| `site/` | The website (Next.js), deployed to https://goatbar.melbora.com. |
| `art/` | Icon source images and `make_ico.py`. |

## Build

- Windows: `dotnet run --project src` (needs the .NET 8 SDK).
- macOS: `swift run` inside `mac/`, or `bash mac/build-app.sh` for an `.app`.
- Site: `cd site && npm install && npm run dev`.

## Ground rules

- GoatBar only **reads** files that Claude Code and Codex already keep. It never writes to them and makes no network requests. Keep it that way.
- Keep changes small and focused; one idea per pull request.
- Especially wanted: testing the macOS preview on real Macs, other terminals/editors for click-to-focus, and multi-monitor taskbars on Windows.

## Releases

Pushing a tag like `v0.1.1` runs `.github/workflows/release.yml`, which builds the self-contained Windows zip and the Mac preview and publishes a GitHub Release.
