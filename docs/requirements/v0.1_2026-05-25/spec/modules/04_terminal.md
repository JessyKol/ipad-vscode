# Module Spec: Terminal

| Module | Terminal |
|---|---|
| File | `src/components/Terminal/TerminalView.tsx` |
| Version | 0.1 |

---

## Responsibility

Provide an interactive terminal panel with built-in commands and git operations. Clearly communicate iOS sandbox limitations to users.

---

## iOS Sandbox Reality

| What users expect | What's possible on iOS |
|---|---|
| bash / zsh shell | ❌ Not possible (no process execution) |
| npm install, pip install | ❌ Not possible |
| Run Python scripts | ❌ Not possible (no interpreter) |
| Run JavaScript | ⚠️ Possible via JavaScriptCore (v0.2) |
| Git operations | ✅ Via isomorphic-git (pure JS) |
| File system navigation | ✅ Via expo-file-system |
| SSH to remote server | 📋 v0.2 via WebSocket/native module |

The terminal is honest about this. Unknown commands show: `command not found (type "help" for available commands)`.

---

## Command Set (v0.1)

### Built-in Commands

| Command | Syntax | Description |
|---|---|---|
| `help` | `help` | List all available commands |
| `clear` | `clear` | Clear terminal output |
| `pwd` | `pwd` | Print current workspace path |
| `echo` | `echo [text]` | Print text |
| `date` | `date` | Print current date/time |
| `ls` | `ls [path]` | List files in directory |
| `cat` | `cat <file>` | Print file contents (first 100 lines) |
| `open` | `open <file>` | Open file in editor |

### Git Commands

All use isomorphic-git + fsAdapter (same engine as the Git panel).

| Command | Behavior |
|---|---|
| `git status` | Show staged/unstaged/untracked files |
| `git log [--n=N]` | Show last N commits (default 10) |
| `git branch` | List branches, mark current with `*` |
| `git checkout <branch>` | Switch branch |
| `git add .` | Stage all changes |
| `git add <file>` | Stage specific file |
| `git commit -m "msg"` | Commit staged changes (requires author in Settings) |
| `git push` | Push to remote (requires token in Settings) |
| `git pull` | Pull from remote |

---

## Command Parsing

```typescript
const parts = raw.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
const cmd = parts[0]?.toLowerCase() ?? '';
const args = parts.slice(1).map((a) => a.replace(/^["']|["']$/g, ''));
```

This handles:
- Unquoted args: `git commit -m hello`
- Single-quoted args: `git commit -m 'my message'`
- Double-quoted args: `git commit -m "my message"`

Does NOT handle:
- Pipe (`|`)
- Redirection (`>`, `<`)
- Background (`&`)
- Variable expansion (`$VAR`)

These are beyond scope — this is not a real shell.

---

## Output Lines

```typescript
type Line = {
  text: string;
  type: 'input' | 'output' | 'error' | 'info';
}
```

| Type | Color | Use |
|---|---|---|
| `input` | `#569cd6` (blue) | The command the user typed |
| `output` | `#cccccc` (light) | Normal output |
| `error` | `#f44747` (red) | Error messages |
| `info` | `#4ec9b0` (teal) | Status messages ("Pushing…") |

---

## Command History

- History stored in local state as `string[]` (max 100 entries, oldest dropped)
- `↑` / `ArrowUp`: navigate to older commands (`historyIdx++`)
- `↓` / `ArrowDown`: navigate to newer commands (`historyIdx--`); -1 = empty input
- Implemented via `onKeyPress` on the TextInput

```typescript
onKeyPress({ nativeEvent }) {
  if (nativeEvent.key === 'ArrowUp') {
    const next = Math.min(historyIdx + 1, history.length - 1);
    setInput(history[next] ?? '');
    setHistoryIdx(next);
  } else if (nativeEvent.key === 'ArrowDown') {
    const next = Math.max(historyIdx - 1, -1);
    setInput(next === -1 ? '' : history[next] ?? '');
    setHistoryIdx(next);
  }
}
```

Note: `onKeyPress` works on iOS with hardware keyboard. Arrow keys are reported as `ArrowUp`/`ArrowDown` key values.

---

## State Management

Terminal state is **local** to `TerminalView` (not in Zustand). Rationale: terminal output is ephemeral; it doesn't need to persist across app restarts or be shared with other components. If multiple terminal tabs are added in v0.3, state should move to a `terminalSessions[]` in the store.

---

## Loading State

Async commands (git push, git pull, git commit, git clone) set `loading = true`. While loading:
- Input field is disabled (`editable={false}`)
- A `…` info line is shown
- Submit button is disabled

---

## Known Limitations (v0.1)

1. **No tab completion** — pressing Tab does nothing. Basic completion (file names) planned for v0.2.
2. **`cat` truncates at 100 lines** — prevents terminal overflow for large files.
3. **`ls` is not recursive** — flat listing only.
4. **No pipe / redirect** — this is not a shell; commands are dispatched directly.
5. **History is lost on component unmount** — if terminal is hidden and re-shown, history is preserved (component stays mounted). If app is killed, history is lost. Acceptable for v0.1.
6. **`git log` output is plain text** — no ANSI colour (the `\x1b[33m` codes in the code are actually not rendered in RN's Text component; they appear as raw escape sequences). Fix in v0.2 by implementing basic ANSI parser.
