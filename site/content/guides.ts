export type Guide = {
  slug: string;
  title: string;
  description: string;
  updated: string;
  sections: { heading: string; paragraphs: string[]; code?: string }[];
};

export const GUIDES: Guide[] = [
  {
    slug: "run-multiple-claude-code-sessions",
    title: "How to Run Multiple Claude Code Sessions on Windows",
    description:
      "Run several Claude Code sessions in parallel on Windows: one worktree each, names with /rename, colours with /color, resuming, and seeing which one is waiting.",
    updated: "2026-09-18",
    sections: [
      // Source: https://code.claude.com/docs/en/worktrees.md
      {
        heading: "Give each session its own worktree",
        paragraphs: [
          "Two sessions editing the same checkout can step on each other's files. Start each one with --worktree (or -w) and a name, and Claude Code creates an isolated git worktree under .claude/worktrees/<name>/ on a new branch called worktree-<name>.",
          "Run the command again with a different name in another terminal to start a second isolated session. If you leave out the name, Claude Code generates one for you.",
          "Add .claude/worktrees/ to your .gitignore so worktree contents do not show up as untracked files in your main checkout. Not in a git repo? Separate folders per task work too.",
        ],
        code: "claude --worktree feature-auth\nclaude --worktree fix-login",
      },
      // Sources: https://code.claude.com/docs/en/sessions.md#name-your-sessions
      //          https://code.claude.com/docs/en/cli-reference.md (--name / -n)
      {
        heading: "Name every session",
        paragraphs: [
          "Names make sessions findable in the /resume picker and resumable by name. Set one at startup with -n, or mid-session with /rename. The name also appears on the prompt bar.",
          "If another live session on this machine already uses the name, Claude Code gives yours a variant with a two-word suffix and tells you. Run /rename again if you want to pick your own.",
        ],
        code: "claude -n auth-refactor\n\n# or, inside a running session:\n/rename auth-refactor",
      },
      // Source: https://code.claude.com/docs/en/commands.md (/color)
      {
        heading: "Colour-code the prompt bar",
        paragraphs: [
          "/color sets the prompt bar colour for the current session. The options are red, blue, green, yellow, purple, orange, pink and cyan. Use default to reset it, or run it with no argument for a random colour.",
          "Keep one colour per task so a glance at any terminal tells you which job it is.",
        ],
        code: "/color purple",
      },
      // Source: https://code.claude.com/docs/en/sessions.md#resume-a-session
      //         https://code.claude.com/docs/en/sessions.md#use-the-session-picker
      {
        heading: "Resume the right session later",
        paragraphs: [
          "claude --continue reopens the most recent conversation in the current directory. claude --resume opens the session picker, and claude --resume <name> resumes a named session directly.",
          "In the picker, Ctrl+W widens the list to all worktrees of the repository and Ctrl+A to every project on this machine. Ctrl+R renames the highlighted session.",
          "Resuming the same session in two terminals without forking interleaves both into one transcript. Add --fork-session to branch it into a new session ID instead.",
        ],
        code: "claude --continue\nclaude --resume\nclaude --resume auth-refactor\nclaude --continue --fork-session",
      },
      // Source: https://code.claude.com/docs/en/sessions.md#where-transcripts-are-stored
      {
        heading: "Know where sessions are stored",
        paragraphs: [
          "Claude Code saves each session as a JSONL transcript at ~/.claude/projects/<project>/<session-id>.jsonl, where <project> is your working directory path with non-alphanumeric characters replaced by -.",
          "Transcripts are kept for 30 days by default. Change that with cleanupPeriodDays in settings.json.",
          "The file format is internal and changes between versions. Use /export when you want a readable copy of a conversation.",
        ],
        code: "~/.claude/projects/<project>/<session-id>.jsonl",
      },
      // Source: GoatBar README (goatbar/README.md)
      {
        heading: "See which session is waiting on you",
        paragraphs: [
          "With several terminals open, the hard part is knowing which one finished. GoatBar is a free, MIT-licensed Windows app that puts one square per running Claude Code or Codex chat in the taskbar: dull orange while working, green when done and waiting on you.",
          "The square's border uses the chat's /color and its hover card shows your /rename name, folder, status and elapsed time. Click a square to bring that chat's window to the front.",
          "It reads the files Claude Code already keeps about its own chats, needs no API keys or network, and finds your chats without any configuration.",
        ],
      },
    ],
  },
  {
    slug: "know-when-claude-code-is-done",
    title: "How to Get Notified When Claude Code Is Done",
    description:
      "Get alerted when Claude Code finishes or needs input: the terminal bell, Notification and Stop hooks, a Windows popup, and a green square in your taskbar.",
    updated: "2026-09-18",
    sections: [
      // Source: https://code.claude.com/docs/en/terminal-config.md#get-a-terminal-bell-or-notification
      {
        heading: "What Claude Code does by default",
        paragraphs: [
          "When Claude finishes a task or pauses for a permission prompt and you appear to be away from the terminal, Claude Code fires a notification event.",
          "By default it only turns that into a desktop notification in Ghostty, Kitty and iTerm2. In Windows Terminal, the VS Code integrated terminal and most others, use one of the options below.",
        ],
      },
      // Source: https://code.claude.com/docs/en/terminal-config.md#get-a-terminal-bell-or-notification
      //         https://code.claude.com/docs/en/terminal-config.md#configure-tmux
      {
        heading: "Turn on the terminal bell",
        paragraphs: [
          "Set preferredNotifChannel to \"terminal_bell\" in ~/.claude/settings.json and Claude Code rings the terminal bell instead.",
          "Running inside tmux? Add set -g allow-passthrough on to ~/.tmux.conf so notifications reach the outer terminal.",
        ],
        code: `{
  "preferredNotifChannel": "terminal_bell"
}`,
      },
      // Source: https://code.claude.com/docs/en/hooks-guide.md#get-notified-when-claude-needs-input
      {
        heading: "Show a Windows popup with a Notification hook",
        paragraphs: [
          "A Notification hook runs a command whenever Claude Code sends a notification. Hooks run alongside the built-in notification rather than replacing it.",
          "This is the Windows example from the official docs. It opens a message box, not a corner toast, so it can appear behind your terminal window. Test the command in PowerShell first.",
        ],
        code: String.raw`{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "powershell.exe -Command \"[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show('Claude Code needs your attention', 'Claude Code')\""
          }
        ]
      }
    ]
  }
}`,
      },
      // Source: https://code.claude.com/docs/en/hooks-guide.md#get-notified-when-claude-needs-input
      {
        heading: "Choose which events alert you",
        paragraphs: [
          "An empty matcher fires on every notification type. Set it to permission_prompt to fire only when a tool approval has waited about six seconds.",
          "Set it to idle_prompt to fire when Claude finished responding about 60 seconds ago and you have not typed since.",
          "Type /hooks and select Notification to confirm the hook is registered. The /hooks menu is read-only, so make changes in settings.json.",
        ],
      },
      // Source: https://code.claude.com/docs/en/hooks-guide.md (Stop event, limitations)
      //         https://code.claude.com/docs/en/hooks.md (hook config structure)
      {
        heading: "Use a Stop hook for every finished reply",
        paragraphs: [
          "The Stop event fires whenever Claude finishes responding, not only at task completion. It does not fire when you interrupt, and API errors fire StopFailure instead.",
          "Use it when you want an alert the moment a reply ends instead of waiting for idle_prompt.",
        ],
        code: String.raw`{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "powershell.exe -Command \"[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show('Claude Code finished', 'Claude Code')\""
          }
        ]
      }
    ]
  }
}`,
      },
      // Source: GoatBar README (goatbar/README.md)
      {
        heading: "Or check the taskbar",
        paragraphs: [
          "A bell or popup tells you something finished, but not which chat it was. GoatBar keeps one square per running chat in the Windows taskbar. It turns green when a chat is done and stays green until you click it, which brings that chat's window to the front.",
          "After you look, the square goes dim green and fades to idle after 30 minutes of no activity. It works without hooks, and its optional Notification hook also turns a square blue when a chat is waiting on a permission prompt or a question.",
        ],
      },
    ],
  },
  {
    slug: "track-codex-cli-sessions",
    title: "How to Track Multiple Codex CLI Sessions",
    description:
      "Keep several OpenAI Codex CLI sessions under control: codex resume and --last, naming threads, where ~/.codex/sessions lives, and seeing status in the taskbar.",
    updated: "2026-09-18",
    sections: [
      // Source: https://developers.openai.com/codex/cli/reference (now https://learn.chatgpt.com/docs/developer-commands?surface=cli)
      //         https://learn.chatgpt.com/docs/codex/cli
      {
        heading: "Resume a session",
        paragraphs: [
          "codex resume --last skips the picker and resumes the most recent chat from the current working directory. Add --all to include sessions from other directories.",
          "Plain codex resume opens a picker. You can also pass a session ID or a session name directly.",
          "If your current directory differs from the session's saved one, Codex asks which to use. Set tui.resume_cwd to \"current\" or \"session\" to skip that question.",
        ],
        code: "codex resume --last\ncodex resume --last --all\ncodex resume\ncodex resume <session-id-or-name>",
      },
      // Source: https://github.com/openai/codex/blob/main/codex-rs/tui/src/slash_command.rs (/rename, /fork, /rollout)
      //         https://learn.chatgpt.com/docs/developer-commands?surface=cli (codex fork, session name argument)
      {
        heading: "Name your threads",
        paragraphs: [
          "Inside a session, /rename renames the current thread. Since codex resume accepts a session name, a clear name is the quickest way back to a specific task.",
          "/fork forks the current chat. From the shell, codex fork creates a new chat from a previous session and keeps the original transcript.",
        ],
        code: "/rename auth-refactor\n\n# later, from the shell:\ncodex resume auth-refactor",
      },
      // Source: https://learn.chatgpt.com/docs/config-file/config-advanced (CODEX_HOME default)
      //         https://learn.chatgpt.com/docs/codex/cli (~/.codex/sessions)
      //         https://github.com/openai/codex/blob/main/codex-rs/rollout/src/recorder.rs (sessions/YYYY/MM/DD, rollout-*.jsonl)
      //         https://github.com/openai/codex/blob/main/codex-rs/rollout/src/session_index.rs (session_index.jsonl)
      {
        heading: "Where Codex keeps sessions",
        paragraphs: [
          "Codex stores its local state under CODEX_HOME, which defaults to ~/.codex. Each session is a JSONL rollout file under ~/.codex/sessions/, in year, month and day folders.",
          "Names set with /rename are appended to ~/.codex/session_index.jsonl. Each line holds the thread id, thread_name and updated_at, and the newest entry for an id wins.",
          "Run /rollout inside a session to print its rollout file path.",
        ],
        code: "~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<id>.jsonl\n~/.codex/session_index.jsonl",
      },
      // Source: https://learn.chatgpt.com/docs/config-file/config-reference (tui.notifications, notification_method, notification_condition, notify)
      //         https://learn.chatgpt.com/docs/config-file/config-advanced (event names, notify example)
      //         https://learn.chatgpt.com/docs/config-file/config-basic (~/.codex/config.toml)
      {
        heading: "Get notified when a turn completes",
        paragraphs: [
          "In ~/.codex/config.toml, tui.notifications turns on built-in terminal notifications and can be limited to event types such as agent-turn-complete and approval-requested.",
          "tui.notification_method picks auto, osc9 or bel. tui.notification_condition defaults to unfocused, so alerts only fire when the terminal is not focused.",
          "For your own script, notify runs an external program with a JSON payload. Its only event right now is agent-turn-complete.",
        ],
        code: `notify = ["python3", "/path/to/notify.py"]

[tui]
notifications = ["agent-turn-complete", "approval-requested"]
notification_method = "bel"`,
      },
      // Source: GoatBar README (goatbar/README.md)
      {
        heading: "See every Codex chat in the taskbar",
        paragraphs: [
          "GoatBar shows each live Codex chat as a square in the Windows taskbar, next to your Claude Code chats. It finds running chats from the lock files Codex holds open in ~/.codex/thread-writer-locks, reads working and done from the rollout log, and takes names from session_index.jsonl, so your /rename shows up.",
          "Hover a square for the name, folder, status and elapsed time, and click it to bring that chat's window forward. Adding the optional hook to ~/.codex/hooks.json also shows the current step. Codex asks you to trust new hooks once.",
          "On a Mac, a menu bar version is an early preview in the latest release.",
        ],
        code: String.raw`{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "node \"C:\\Users\\<you>\\AppData\\Local\\GoatBar\\hooks\\agent-status.js\" start codex" }] }],
    "PostToolUse":  [{ "hooks": [{ "type": "command", "command": "node \"C:\\Users\\<you>\\AppData\\Local\\GoatBar\\hooks\\agent-status.js\" tool codex" }] }]
  }
}`,
      },
    ],
  },
  {
    slug: "claude-code-hooks-on-windows",
    title: "Claude Code Hooks on Windows: A Practical Intro",
    description:
      "Set up Claude Code hooks on Windows: where settings.json lives, the hook JSON shape, everyday events, which shell runs them, the /hooks menu and a real example.",
    updated: "2026-09-18",
    sections: [
      // Source: https://code.claude.com/docs/en/hooks.md
      //         https://code.claude.com/docs/en/hooks-guide.md (hook locations table)
      {
        heading: "Where hooks live",
        paragraphs: [
          "Hooks are shell commands Claude Code runs automatically at set points in its lifecycle. You define them in a settings file, and the file you pick decides their scope.",
          "~/.claude/settings.json applies to all your projects and stays on your machine. .claude/settings.json applies to one project and can be committed to the repo. .claude/settings.local.json also applies to one project but is not shared.",
          "On Windows, ~ is your user folder, so the user file is C:\\Users\\<you>\\.claude\\settings.json.",
        ],
        code: "~/.claude/settings.json\n.claude/settings.json\n.claude/settings.local.json",
      },
      // Source: https://code.claude.com/docs/en/hooks.md (configuration structure)
      {
        heading: "The shape of a hook",
        paragraphs: [
          "Everything sits under a hooks key. Each event name holds a list of groups, each group has an optional matcher, and each group holds a list of handlers. A command handler has \"type\": \"command\" and the command to run.",
          "For tool events the matcher filters by tool name, so \"Edit|Write\" runs only after file edits. An empty matcher runs on everything.",
          "Your command receives the event details as JSON on stdin, including session_id, transcript_path, cwd and hook_event_name.",
        ],
        code: `{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolName",
        "hooks": [
          { "type": "command", "command": "your-command-here" }
        ]
      }
    ]
  }
}`,
      },
      // Source: https://code.claude.com/docs/en/hooks.md (hook events)
      //         https://code.claude.com/docs/en/hooks-guide.md (limitations: Stop)
      {
        heading: "Events you will use most",
        paragraphs: [
          "SessionStart fires when a session begins or resumes. SessionEnd fires when it terminates.",
          "UserPromptSubmit fires when you submit a prompt, before Claude processes it. PreToolUse fires before a tool call executes and can block it. PostToolUse fires after a tool call succeeds.",
          "Notification fires when Claude Code sends a notification, such as waiting for input or permission. Stop fires whenever Claude finishes responding, not only at task completion, and does not fire when you interrupt.",
          "Exit code 2 from a hook means a blocking error. On events that can block, like PreToolUse, that stops the action.",
        ],
      },
      // Source: https://code.claude.com/docs/en/hooks-guide.md (shell profile troubleshooting)
      //         https://code.claude.com/docs/en/hooks.md (shell field)
      {
        heading: "Which shell runs your command",
        paragraphs: [
          "On Windows, Claude Code runs a command hook through Git Bash, or through PowerShell when Git Bash is not installed.",
          "Set the shell field on a handler to choose explicitly. It accepts \"bash\" or \"powershell\".",
          "Git Bash can still source your profile, so an unconditional echo in ~/.bashrc gets prepended to your hook's output and can break a hook that returns JSON. Wrap those lines so they only run in interactive shells.",
        ],
        code: `{ "type": "command", "shell": "powershell", "command": "your-command-here" }`,
      },
      // Source: https://code.claude.com/docs/en/hooks-guide.md#get-notified-when-claude-needs-input
      //         https://code.claude.com/docs/en/hooks-guide.md (/hooks menu, troubleshooting)
      {
        heading: "A first hook, checked with /hooks",
        paragraphs: [
          "This is the Windows Notification example from the official docs. It opens a message box whenever Claude is waiting on you. Test the command in PowerShell first, since the box can open behind your terminal.",
          "Type /hooks in Claude Code to browse configured hooks by event and confirm yours is listed. The menu is read-only, so edit settings.json to change anything.",
          "File edits are normally picked up automatically. If a new hook does not show up after a few seconds, restart the session.",
        ],
        code: String.raw`{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "powershell.exe -Command \"[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show('Claude Code needs your attention', 'Claude Code')\""
          }
        ]
      }
    ]
  }
}`,
      },
      // Source: GoatBar README (goatbar/README.md)
      {
        heading: "A real-world example: GoatBar's status hook",
        paragraphs: [
          "GoatBar, a free Windows app that shows each Claude Code and Codex chat as a square in the taskbar, ships an optional hook script, agent-status.js. It works without hooks, but adding this one shows the step the agent is on in the hover card and turns a square blue when a chat waits for your answer.",
          "It uses four events: SessionStart to register the chat (and launch GoatBar if it is not running), PreToolUse for the current step, PostToolUse matched to AskUserQuestion, and Notification for waiting prompts. Replace <you> with your user name. The hook needs Node.js.",
        ],
        code: String.raw`{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "node \"C:\\Users\\<you>\\AppData\\Local\\GoatBar\\hooks\\agent-status.js\" start claude" }] }],
    "PreToolUse":   [{ "matcher": "", "hooks": [{ "type": "command", "command": "node \"C:\\Users\\<you>\\AppData\\Local\\GoatBar\\hooks\\agent-status.js\" tool claude" }] }],
    "PostToolUse":  [{ "matcher": "AskUserQuestion", "hooks": [{ "type": "command", "command": "node \"C:\\Users\\<you>\\AppData\\Local\\GoatBar\\hooks\\agent-status.js\" toolDone claude" }] }],
    "Notification": [{ "hooks": [{ "type": "command", "command": "node \"C:\\Users\\<you>\\AppData\\Local\\GoatBar\\hooks\\agent-status.js\" ask claude" }] }]
  }
}`,
      },
    ],
  },
  {
    slug: "claude-code-vs-codex-cli-sessions",
    title: "Claude Code vs Codex CLI: How Sessions Work",
    description:
      "How Claude Code and OpenAI Codex CLI store, resume, name and fork sessions, and how each supports hooks and notifications, compared side by side with commands.",
    updated: "2026-09-18",
    sections: [
      // Sources: https://code.claude.com/docs/en/sessions.md#where-transcripts-are-stored
      //          https://learn.chatgpt.com/docs/config-file/config-advanced (CODEX_HOME default)
      //          https://github.com/openai/codex/blob/main/codex-rs/rollout/src/recorder.rs (sessions/YYYY/MM/DD, rollout-*.jsonl)
      {
        heading: "Where sessions are stored",
        paragraphs: [
          "Claude Code stores each session as a JSONL transcript at ~/.claude/projects/<project>/<session-id>.jsonl, where <project> is the working directory path with non-alphanumeric characters replaced by -. Transcripts are kept for 30 days by default, set by cleanupPeriodDays.",
          "Codex keeps its local state under CODEX_HOME, which defaults to ~/.codex. Each session is a JSONL rollout file under ~/.codex/sessions/, in year, month and day folders.",
          "Both formats are files written for the tool's own use. Claude Code's docs say its entry format is internal and changes between versions.",
        ],
        code: "# Claude Code\n~/.claude/projects/<project>/<session-id>.jsonl\n\n# Codex CLI\n~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<id>.jsonl",
      },
      // Sources: https://code.claude.com/docs/en/sessions.md#resume-a-session
      //          https://learn.chatgpt.com/docs/developer-commands?surface=cli (codex resume)
      {
        heading: "Resume a session",
        paragraphs: [
          "Claude Code: claude --continue reopens the most recent conversation in the current directory. claude --resume opens a session picker, and claude --resume <name> resumes a named session directly. Inside a session, /resume switches conversations.",
          "Codex: codex resume --last skips the picker and resumes the most recent chat from the current working directory, and --all widens that to other directories. codex resume alone opens a picker, and codex resume <id-or-name> goes straight to one session.",
        ],
        code: "claude --continue\nclaude --resume\nclaude --resume <name>\n\ncodex resume --last\ncodex resume --last --all\ncodex resume\ncodex resume <id-or-name>",
      },
      // Sources: https://code.claude.com/docs/en/sessions.md#name-your-sessions
      //          https://github.com/openai/codex/blob/main/codex-rs/tui/src/slash_command.rs (/rename)
      //          https://github.com/openai/codex/blob/main/codex-rs/rollout/src/session_index.rs (session_index.jsonl)
      {
        heading: "Name a session",
        paragraphs: [
          "Both tools have /rename. In Claude Code you can also name a session at startup with claude -n <name>, and the name appears on the prompt bar. In Codex, /rename renames the current thread.",
          "Codex appends names to ~/.codex/session_index.jsonl, with the thread id, thread_name and updated_at on each line. In both tools, a name you set can be passed to resume.",
        ],
        code: "claude -n auth-refactor\n/rename auth-refactor\n\n# Codex, inside a session:\n/rename auth-refactor",
      },
      // Sources: https://code.claude.com/docs/en/sessions.md#branch-a-session
      //          https://learn.chatgpt.com/docs/developer-commands?surface=cli (codex fork)
      //          https://github.com/openai/codex/blob/main/codex-rs/tui/src/slash_command.rs (/fork)
      {
        heading: "Fork a session",
        paragraphs: [
          "Claude Code: /branch copies the conversation so far and switches you into the copy, leaving the original intact. From the command line, add --fork-session to --continue or --resume.",
          "Codex: codex fork forks a previous session into a new chat and preserves the original transcript. It takes --last and --all like resume. Inside a session, /fork forks the current chat.",
        ],
        code: "/branch try-another-approach\nclaude --continue --fork-session\n\ncodex fork --last\n/fork",
      },
      // Sources: https://code.claude.com/docs/en/hooks.md (locations, events)
      //          https://learn.chatgpt.com/docs/hooks (Codex events, default on, review)
      //          https://learn.chatgpt.com/docs/config-file/config-advanced (notify, tui.notifications)
      {
        heading: "Hooks and notifications",
        paragraphs: [
          "Claude Code reads hooks from ~/.claude/settings.json, .claude/settings.json and .claude/settings.local.json. Events include SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Notification, Stop and SessionEnd. /hooks shows a read-only list of what is configured.",
          "Codex reads hooks from ~/.codex/hooks.json, ~/.codex/config.toml and their .codex/ equivalents in a repo. Events include SessionStart, SessionEnd, PreToolUse, PermissionRequest, PostToolUse, UserPromptSubmit and Stop. Hooks are on by default, and new or changed hooks are skipped until you trust them, which you can do in /hooks.",
          "Codex also has tui.notifications for built-in terminal alerts and a notify setting that runs an external program, currently only on agent-turn-complete.",
        ],
      },
      // Source: GoatBar README (goatbar/README.md)
      {
        heading: "Both in one taskbar",
        paragraphs: [
          "If you run both tools, GoatBar shows each live Claude Code and Codex chat as a square in the Windows taskbar, with the tool's logo on each square. It finds Claude Code chats from ~/.claude/sessions/<pid>.json and Codex chats from the lock files in ~/.codex/thread-writer-locks.",
          "Names come from your /rename in either tool, via session_index.jsonl for Codex. It needs no API keys or network and never modifies either tool's files.",
        ],
      },
    ],
  },
  {
    slug: "codex-cli-notifications",
    title: "How to Get Notified When Codex CLI Is Done",
    description:
      "Get alerted when an OpenAI Codex CLI turn finishes or needs approval: tui.notifications, the notify program, PermissionRequest and Stop hooks, and the taskbar.",
    updated: "2026-09-19",
    sections: [
      // Source: https://learn.chatgpt.com/docs/config-file/config-advanced (TUI notifications)
      //         https://learn.chatgpt.com/docs/config-file/config-reference (tui.notifications)
      //         https://learn.chatgpt.com/docs/config-file/config-basic (~/.codex/config.toml)
      {
        heading: "Turn on built-in terminal notifications",
        paragraphs: [
          "Codex can alert you from the terminal itself. Set tui.notifications in ~/.codex/config.toml to enable it for everything, or give it a list to limit it to certain events.",
          "The two event types are agent-turn-complete, when Codex finishes a turn, and approval-requested, when it stops to ask for your approval.",
        ],
        code: `[tui]
notifications = true

# or only some events:
# notifications = ["agent-turn-complete", "approval-requested"]`,
      },
      // Source: https://learn.chatgpt.com/docs/config-file/config-advanced (notification_method, notification_condition)
      //         https://learn.chatgpt.com/docs/config-file/config-reference (default: auto)
      {
        heading: "Pick how and when it alerts",
        paragraphs: [
          "tui.notification_method takes auto, osc9 or bel. The default, auto, prefers an OSC 9 escape sequence, which some terminals show as a desktop notification, and falls back to BEL (\\x07) otherwise. If your terminal ignores OSC 9, set bel to get a plain terminal bell.",
          "tui.notification_condition takes unfocused or always. With unfocused, alerts only fire when the terminal window is not focused. Use always if you want them even while you are looking at it.",
        ],
        code: `[tui]
notifications = true
notification_method = "bel"
notification_condition = "always"`,
      },
      // Source: https://learn.chatgpt.com/docs/config-file/config-advanced (notify, payload fields)
      //         https://learn.chatgpt.com/docs/config-file/config-reference (notify)
      {
        heading: "Run your own program with notify",
        paragraphs: [
          "The notify setting is separate from the TUI alerts. It runs an external program and passes it a single JSON argument. Today the only event it sends is agent-turn-complete.",
          "Common payload fields are type, thread-id, turn-id, cwd, input-messages and last-assistant-message. That is enough to show which folder finished and what Codex said last, in a desktop toast, a chat webhook or anything else your script can reach.",
          "notify does not fire for approval requests, so pair it with tui.notifications or a hook if you also want those.",
        ],
        code: `notify = ["python3", "/path/to/notify.py"]`,
      },
      // Source: https://learn.chatgpt.com/docs/hooks (events, PermissionRequest, Stop, commandWindows, trust, default on)
      {
        heading: "Use hooks for approvals and turn ends",
        paragraphs: [
          "Codex hooks live in ~/.codex/hooks.json, ~/.codex/config.toml or the .codex/ folder of a repo. They are on by default, and new or changed hooks are skipped until you trust them in /hooks.",
          "PermissionRequest runs when Codex is about to ask for approval, such as a shell escalation. Stop runs when a turn completes, but it expects JSON on stdout when it exits 0, and plain text output is invalid, so a notifier script on Stop must print JSON. Codex hooks have no Notification event.",
          "On Windows, a command handler can take commandWindows (command_windows in TOML), an optional override used only on Windows.",
        ],
      },
      // Source: GoatBar README (goatbar/README.md)
      {
        heading: "Or glance at the taskbar",
        paragraphs: [
          "Alerts are easy to miss once several Codex chats are running. GoatBar shows each live Codex chat as a square in the Windows taskbar: dull orange while working, green when done and waiting on you. It stays green until you click it, which brings that chat's window to the front.",
          "It reads working and done from the chat's rollout log, so it needs no notify script and no hooks. Hover a square for the chat's name, folder, status and elapsed time.",
        ],
      },
    ],
  },
  {
    slug: "git-worktrees-for-parallel-ai-agents",
    title: "Git Worktrees for Running AI Coding Agents in Parallel",
    description:
      "Run Claude Code and Codex CLI side by side on one repo with git worktrees: add, list and remove, the --worktree flags, cleanup, and telling the sessions apart.",
    updated: "2026-09-19",
    sections: [
      // Source: https://git-scm.com/docs/git-worktree (description, add, -b)
      //         https://code.claude.com/docs/en/worktrees.md (why isolate sessions)
      {
        heading: "One worktree per agent",
        paragraphs: [
          "Two agents editing the same checkout can overwrite each other's files. A git worktree is a separate working directory with its own branch, linked to the same repository, so each agent gets its own files while sharing history.",
          "git worktree add <path> creates one. With -b it also creates a new branch there. Without -b, git names the branch after the last part of the path and creates it from HEAD if it does not exist yet.",
          "If that branch already exists and is checked out in another worktree, git refuses to create the new one unless you pass --force.",
        ],
        code: "git worktree add ../myapp-auth -b auth\ngit worktree add ../myapp-fix-login\n\ncd ../myapp-auth\nclaude",
      },
      // Source: https://git-scm.com/docs/git-worktree (list, remove, prune)
      {
        heading: "List and remove worktrees",
        paragraphs: [
          "git worktree list shows the main worktree first, then each linked one, with its checked-out commit and branch.",
          "git worktree remove deletes a worktree, but only a clean one with no untracked files and no changes to tracked files. Add --force to remove one with changes. The main worktree cannot be removed.",
          "If you deleted a worktree folder by hand, run git worktree prune to clear the leftover metadata. Git also cleans it up on its own eventually.",
        ],
        code: "git worktree list\ngit worktree remove ../myapp-auth\ngit worktree prune",
      },
      // Source: https://code.claude.com/docs/en/worktrees.md (start, .gitignore, .worktreeinclude, base branch)
      {
        heading: "Claude Code: --worktree does it for you",
        paragraphs: [
          "claude --worktree <name> (or -w) creates a worktree under .claude/worktrees/<name>/ on a new branch called worktree-<name> and starts the session in it. Run it again with another name in a second terminal for a second isolated session. Leave out the name and Claude Code picks one.",
          "Add .claude/worktrees/ to your .gitignore. A worktree is a fresh checkout, so gitignored files like .env are missing; list them in a .worktreeinclude file at the project root to have them copied in.",
          "New worktrees branch from the repository's default branch. Set worktree.baseRef to \"head\" in settings to branch from your current local HEAD instead.",
        ],
        code: "claude --worktree feature-auth\nclaude -w fix-login",
      },
      // Source: https://code.claude.com/docs/en/worktrees.md (clean up worktrees, manage manually)
      {
        heading: "Cleaning up after Claude Code",
        paragraphs: [
          "When you exit a --worktree session, Claude Code checks for changed or untracked files and new commits. A clean worktree from an unnamed session is removed along with its branch. A named session, or one with work in it, asks whether to keep or remove it.",
          "Runs with -p have no exit prompt, so their worktrees stay. Remove them with git worktree remove, and run git worktree unlock first if git says the worktree is locked.",
        ],
        code: "git worktree unlock .claude/worktrees/fix-login\ngit worktree remove .claude/worktrees/fix-login",
      },
      // Source: https://github.com/openai/codex/blob/main/codex-rs/utils/cli/src/shared_options.rs (--worktree)
      //         https://github.com/openai/codex/blob/main/codex-rs/cli/src/main.rs (supported subcommands)
      //         https://learn.chatgpt.com/docs/developer-commands?surface=cli (--cd, -C)
      {
        heading: "Codex CLI in a worktree",
        paragraphs: [
          "The simplest route works with any version: create the worktree with git, then start codex inside it, or point it there with --cd (-C).",
          "Current Codex source also has a --worktree flag that runs the session in a new managed Git worktree. It takes no name, and it works for new interactive sessions, codex exec, and codex fork with an explicit session ID, not for codex resume. It is not on the CLI reference page yet, so check codex --help to see if your build has it.",
        ],
        code: "git worktree add ../myapp-search -b search\ncodex -C ../myapp-search\n\n# newer builds:\ncodex --worktree",
      },
      // Sources: https://code.claude.com/docs/en/cli-reference.md (--name / -n)
      //          https://code.claude.com/docs/en/commands.md (/color)
      //          https://github.com/openai/codex/blob/main/codex-rs/tui/src/slash_command.rs (/rename)
      //          GoatBar README (goatbar/README.md)
      {
        heading: "Tell the sessions apart",
        paragraphs: [
          "Name every session after its task. In Claude Code, start with -n or run /rename, and the name shows in /resume and the terminal title. /color sets the prompt bar to red, blue, green, yellow, purple, orange, pink or cyan. In Codex, /rename renames the current thread.",
          "GoatBar puts one square per running Claude Code or Codex chat in the Windows taskbar. The border uses the Claude Code chat's /color, and the hover card shows the name, tool and folder, so each worktree is easy to spot. A green square means that agent is done and waiting on you. Click it to bring its window to the front.",
        ],
        code: "claude -w feature-auth\n/rename feature-auth\n/color purple",
      },
    ],
  },
];
