#!/usr/bin/env node
// Optional hook for GoatBar: adds live detail (current step, "needs an answer")
// on top of what the bar already reads from Claude Code / Codex session files.
// Shared by Claude Code and Codex hooks:
//   node agent-status.js <event> <tool>     event: start|prompt|tool|toolDone|ask|stop|end
// Other scripts can also require() it and call update()/patchInfo()/launchBar().
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const DIR = path.join(os.homedir(), '.claude', 'agent-status');
// Where GoatBar.exe lives: $GOATBAR_EXE, else the install.ps1 default.
const BAR = process.env.GOATBAR_EXE
  || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'GoatBar', 'GoatBar.exe');

function fileFor(tool, sid) {
  return path.join(DIR, `${tool}-${String(sid || 'default').replace(/[^\w-]/g, '')}.json`);
}
function read(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
function write(file, obj) {
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, file); // atomic, so the bar never reads half a file
}

// Ask GoatBar.exe which agent process and host window (Zed, Terminal…) own us.
function who() {
  if (!fs.existsSync(BAR)) return {};
  try {
    const r = spawnSync(BAR, ['--who', String(process.pid)], { encoding: 'utf8', timeout: 3000 });
    return JSON.parse(r.stdout || '{}');
  } catch { return {}; }
}
function launchBar() {
  if (!fs.existsSync(BAR)) return;
  try { spawn(BAR, [], { detached: true, stdio: 'ignore' }).unref(); } catch {} // single-instance; extra launches exit
}

function update(tool, sid, patch, input = {}) {
  const file = fileFor(tool, sid);
  if (patch === null) { try { fs.unlinkSync(file); } catch {} return; }
  const prev = read(file) || {};
  const cwd = input.cwd || prev.cwd || process.cwd();
  const next = { tool, sid, cwd, name: prev.name || path.basename(cwd), state: 'idle', since: Date.now(), ...prev, ...patch, updated: Date.now() };
  if (!next.agentPid) Object.assign(next, who());
  write(file, next);
}

// Only rewrite when something the bar shows actually changed.
function patchInfo(tool, sid, info) {
  const file = fileFor(tool, sid);
  const prev = read(file);
  if (!prev) return;
  if (Object.keys(info).every(k => info[k] === undefined || prev[k] === info[k])) return;
  write(file, { ...prev, ...Object.fromEntries(Object.entries(info).filter(([, v]) => v !== undefined)) });
}

function stepOf(input) {
  const inp = input.tool_input || {};
  const cmd = Array.isArray(inp.command) ? inp.command.join(' ') : inp.command;
  const s = inp.description || (inp.file_path && `${input.tool_name} ${path.basename(inp.file_path)}`) || cmd || input.tool_name || '';
  return String(s).replace(/\s+/g, ' ').slice(0, 120);
}

module.exports = { update, patchInfo, launchBar };

if (require.main === module && !process.env.GOATBAR_BG) {
  const [event, tool = 'claude'] = process.argv.slice(2);
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
  const sid = input.session_id || input.thread_id || input.conversation_id;
  try {
    switch (event) {
      case 'start':
        update(tool, sid, { state: 'idle', since: Date.now() }, input);
        launchBar();
        break;
      case 'prompt':
        if (String(input.prompt || '').trim().startsWith('>>')) break; // queue command, not a new turn
        update(tool, sid, { state: 'working', since: Date.now(), step: '' }, input);
        break;
      case 'tool':
        if (input.tool_name === 'AskUserQuestion') update(tool, sid, { state: 'asking' }, input);
        else update(tool, sid, { state: 'working', step: stepOf(input) }, input);
        break;
      case 'toolDone': // an AskUserQuestion was answered
        update(tool, sid, { state: 'working' }, input);
        break;
      case 'ask': // Notification hook: only permission prompts need an answer, not "idle" reminders
        if (/permission/i.test(`${input.notification_type || ''} ${input.message || ''}`)) update(tool, sid, { state: 'asking' }, input);
        break;
      case 'stop':
        update(tool, sid, { state: 'waiting', since: Date.now(), step: '' }, input);
        break;
      case 'end':
        update(tool, sid, null);
        break;
    }
  } catch {}
}
