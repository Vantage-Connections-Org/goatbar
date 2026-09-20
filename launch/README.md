# GoatBar launch kit

Drafts only. Nothing in this folder has been posted anywhere.

| File | For |
|---|---|
| `show-hn.md` | Hacker News: title + maker's first comment |
| `reddit.md` | r/ClaudeAI, r/ChatGPTCoding, r/windows, r/opensource |
| `x-thread.md` | 6-post X thread |
| `product-hunt.md` | Name, tagline, description, first comment, gallery |

## Before posting anything

- [ ] Replace every `https://goatbar.melbora.com` with the real landing page URL (`grep -rn "https://goatbar.melbora.com" launch/`).
- [ ] Repo is public and the README renders with all four `docs/` images.
- [ ] Fresh-machine test of the README install: `git clone`, `.\install.ps1 -StartWithWindows`, a Claude Code chat and a Codex chat both show up, click-to-focus works. Launch traffic will hit the install first.
- [x] Prebuilt release exists (v0.1.x self-contained zip); drafts updated to say so.
- [ ] Record the GIF for X post 1 (a square going orange to green, then a click bringing the window forward). No GIF exists in `docs/` yet.
- [ ] Pad the `docs/` screenshots for Product Hunt (see "Images" below).
- [ ] Re-read each subreddit's rules and flair requirements on the day.
- [ ] Re-check every claim against the README if the code changed since 2026-09-18 (the drafts were written from the README and `src/Discovery.cs` at commit `57353b2`).
- [x] macOS wording: drafts now say "early preview". Say "available" only after real-Mac testing.
- [ ] Block out 3–4 hours after each post to answer comments. HN and Reddit both reward fast, specific replies from the maker.

## Order and timing

Stagger the launches so you can answer each one. A suggested order:

1. **Show HN**, day 1.
2. **r/ClaudeAI** and **r/ChatGPTCoding**, day 1 or 2, a few hours apart.
3. **X thread**, same day as Show HN (link the HN post in a reply if it gets traction).
4. **r/opensource**, day 3.
5. **r/windows**, day 3 or 4, only if the rules allow project posts.
6. **Product Hunt**, a separate day once the landing page and padded gallery images are ready.

Best times to post (common rules of thumb, not measured for this project):

| Where | When (US Pacific) | Why |
|---|---|---|
| Show HN | Tue–Thu, 6–9 am PT | New posts get seen while both US coasts and Europe are online |
| Reddit | Tue–Thu, 6–9 am PT | Same overlap; avoid Friday evening and weekends for dev subs |
| X | Weekday, 8–10 am PT | Morning US timeline |
| Product Hunt | 12:01 am PT on a Tue–Thu | PH's daily ranking resets at midnight PT, so launching then gives a full 24 h |

Avoid launch days that clash with a big Claude Code or Codex release, since those subs fill up with release threads.

## Images: which file goes where

All in `docs/`. Actual sizes: `taskbar.png` 804x157, `closeup.png` 1095x168, `hover-card.png` 1140x410, `icon.png` 256x256.

| Where | Image | Notes |
|---|---|---|
| Show HN | none | HN is text-only; the repo README carries the images |
| r/ClaudeAI | `taskbar.png` | Or a text post with the repo link |
| r/ChatGPTCoding | `closeup.png` | Shows both the Claude and Codex logos |
| r/windows | `taskbar.png` | Shows it sitting in the real Windows 11 taskbar |
| r/opensource | `closeup.png` (optional) | Text post is fine here |
| X post 1 | GIF (to record) | Fallback: `taskbar.png` |
| X post 2 | `hover-card.png` | |
| X post 3 | `closeup.png` | |
| Product Hunt thumbnail | `icon.png` | |
| Product Hunt gallery 1/2/3 | `taskbar.png`, `closeup.png`, `hover-card.png` | Pad each onto a 1270x760 dark canvas first |

The two taskbar strips are very wide and short (about 5:1 and 6.5:1). X and Reddit crop previews toward 16:9, so they'll either show as a thin band or get cut. Padding them onto a 16:9 dark canvas, or cropping to the squares plus a bit of taskbar, will read better in feeds.

## Facts the drafts rely on (all from README.md / src)

Keep replies in comments inside these lines too.

- Windows 10/11, taskbar at the bottom of the primary monitor. macOS menu-bar version: early preview in the release (lightly tested).
- Free, MIT, © 2026 Vantage Connections. Not affiliated with Anthropic or OpenAI.
- No API keys, no network. Reads Claude Code's and Codex's own session files; never modifies them.
- Prebuilt self-contained zip on GitHub Releases (no .NET install needed); also Scoop. Or build from source via `install.ps1` (.NET 8 SDK).
- Rescans every 800 ms (`BarWindow.cs`).
- Optional Node hook writes to `~/.claude/agent-status/` and adds current step + blue "needs an answer".
- Click focuses the host window, not the terminal tab.
- Session files aren't public APIs; upstream changes can break discovery.

Do not add user counts, star counts, testimonials, or performance numbers that haven't been measured.

## Images (launch/images/)

Composed only from real screenshots and the real icon.

| File | Size | Use |
|---|---|---|
| `ph-1-hero.png` | 1270x760 | Product Hunt gallery 1 |
| `ph-2-hover.png` | 1270x760 | Product Hunt gallery 2 |
| `ph-3-states.png` | 1270x760 | Product Hunt gallery 3 |
| `ph-thumbnail-240.png` | 240x240 | Product Hunt thumbnail |
| `x-1200x675.png` | 1200x675 | X post / Reddit image post |
| `demo-drag.gif` | 1000x120 | Real recording of dragging a square. Use for X post 1 / Reddit where a GIF is asked for |

The site's own link preview (Open Graph, 1200x630) is generated from the same assets, so links to https://goatbar.melbora.com unfurl with a real image.
