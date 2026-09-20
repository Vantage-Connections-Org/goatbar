# X thread draft

DRAFT. Do not post until the checklist in `launch/README.md` is done.

6 posts. Each is under 280 characters. Media notes in [brackets] are not part of the post text.

---

**1/6**

I kept alt-tabbing through terminals to check which of my Claude Code and Codex chats had finished.

So I put them in the Windows taskbar. One square per chat: orange = working, green = done and waiting on you.

Free, MIT, open source.

[MEDIA: short GIF/screen recording of the taskbar, a square going orange to green, then a click bringing that chat's window forward. If no GIF yet, use docs/taskbar.png.]

---

**2/6**

Hover a square for the chat name, folder, status and how long it's been in it.

Click it and the window running that chat comes to the front: Windows Terminal, VS Code, Cursor, Zed and others.

Idle chats shrink to a thin bar so the live ones stand out.

[MEDIA: docs/hover-card.png]

---

**3/6**

The border is the chat's own Claude Code /color, so the square matches its prompt bar.

Tip: /color works as a starting prompt, so a tiny PowerShell function can launch every chat with a random colour.

[MEDIA: docs/closeup.png]

---

**4/6**

No API keys, no network. It reads files the tools already keep:

Claude Code: ~/.claude/sessions/<pid>.json, checked against the live process
Codex: the lock file a live chat holds open + task_started / task_complete in its rollout log

Never writes to either tool's files.

---

**5/6**

Optional hook (Claude Code settings.json or Codex hooks.json) adds the step the agent is on, and turns a square blue when it's waiting on a permission prompt or a question.

Without it you still get working / done / idle.

---

**6/6**

Limits: Windows 10/11, taskbar at the bottom, exe not code-signed yet. Click focuses the window, not the tab.

A macOS menu-bar preview is in the latest release.

github.com/Vantage-Connections-Org/goatbar
https://goatbar.melbora.com

---

## Character counts

Measured on the draft text: 1/6 ~236, 2/6 ~254, 3/6 ~202, 4/6 ~273, 5/6 ~221, 6/6 ~220. All under 280. X counts each URL as 23 chars. Re-check after any edit.
