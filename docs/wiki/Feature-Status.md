# Feature Status

Last updated: 2026-05-25 | Version: 0.1

## Legend
| Symbol | Meaning |
|---|---|
| ✅ | Implemented and working |
| ⚠️ | Partial / known limitations |
| 🚧 | In progress |
| 📋 | Planned (roadmap) |
| ❌ | Not planned / out of scope |

---

## Editor

| Feature | Status | Notes |
|---|---|---|
| Monaco Editor (syntax highlighting) | ✅ | 50+ languages via Monaco |
| Inline HTML bridge (iOS + Android) | ✅ | Replaced Android-only file:// path |
| Multiple tabs | ✅ | Horizontal scroll, dirty indicator |
| Tab close / switch | ✅ | |
| Save file (⌘S) | ✅ | Via Monaco keybinding → postMessage |
| Quick Open (⌘P) | ✅ | Modal with fuzzy filter |
| Find in file (⌘F) | ✅ | Monaco native find widget |
| Format document | ✅ | Monaco built-in formatters |
| Code completion (IntelliSense) | ⚠️ | Monaco built-in only; no LSP server |
| Go to definition | ⚠️ | Monaco basic (same-file only) |
| Split editor | 📋 | v0.3 |
| Minimap | ✅ | Disabled by default (perf) |
| Word wrap toggle | 📋 | v0.2 |
| Diff editor (in-app) | ✅ | Git panel → file → diff icon |
| Offline Monaco | 📋 | v0.3 (bundle locally) |

## File System

| Feature | Status | Notes |
|---|---|---|
| Open workspace (create new) | ✅ | Alert.prompt flow |
| List existing workspaces | ✅ | Shows existing workspace names |
| File tree (expand/collapse) | ✅ | Lazy-load children |
| Open file in editor | ✅ | |
| Create file | ✅ | Long-press folder |
| Create folder | ✅ | Long-press folder |
| Delete file / folder | ✅ | Long-press → Delete |
| Rename file / folder | ✅ | Long-press → Rename |
| File icons by type | ✅ | Color-coded by language |
| Git status badges in tree | ✅ | M / A / U indicators |
| Import from Files.app | 📋 | v0.2 (UIDocumentPickerViewController) |
| iCloud Drive support | 📋 | v0.3 |

## Git

| Feature | Status | Notes |
|---|---|---|
| Git status | ✅ | staged / unstaged / untracked |
| Stage file | ✅ | Tap file row in Git panel |
| Unstage file | ✅ | Tap staged file |
| Stage all | ✅ | "Stage All" button |
| Commit | ✅ | Requires author in Settings |
| Push | ✅ | Requires token in Settings |
| Pull | ✅ | Requires author + token |
| Clone repo | ✅ | Settings → Clone Repository |
| Init repo | ✅ | Settings → Init Repository |
| Branch list | ✅ | Git panel → branch button |
| Switch branch | ✅ | Branch list → tap |
| Create branch | ✅ | Branch list → + |
| Commit history | ✅ | Timeline view (last 50) |
| File diff (HEAD vs working) | ✅ | Line-by-line, ±context |
| Merge | 📋 | v0.2 |
| Rebase | ❌ | Out of scope (complexity) |
| SSH remote | ❌ | isomorphic-git HTTP only |
| GitHub PR creation | 📋 | v0.3 (via Octokit) |
| Multiple remotes | ⚠️ | Works but UI only shows first |

## Terminal

| Feature | Status | Notes |
|---|---|---|
| Built-in commands | ✅ | help, clear, pwd, echo, date, ls, cat, open |
| Git via terminal | ✅ | status, log, add, commit, push, pull, checkout, branch |
| Command history (↑↓) | ✅ | |
| Real shell (bash/zsh) | ❌ | iOS sandbox; not possible |
| SSH client | 📋 | v0.2 (using a WebSocket/native approach) |
| JavaScript eval (sandboxed) | 📋 | v0.2 |
| Multiple terminal tabs | 📋 | v0.3 |

## Search

| Feature | Status | Notes |
|---|---|---|
| Full-text search in workspace | ✅ | Line-by-line, up to 200 results |
| Case-sensitive toggle | ✅ | |
| Click to open file at line | ✅ | |
| Results grouped by file | ✅ | |
| Regex search | 📋 | v0.2 |
| Replace | 📋 | v0.2 |
| Include/exclude glob patterns | 📋 | v0.3 |

## Settings & Config

| Feature | Status | Notes |
|---|---|---|
| Git author (name + email) | ✅ | Required for commit |
| GitHub token | ✅ | Required for push/pull (stored in-memory) |
| Theme (Dark/Light/HC) | ✅ | Propagates to Monaco |
| Font size | ✅ | 10–24px |
| Token persistence | 📋 | v0.2 (expo-secure-store) |
| Settings persistence | 📋 | v0.2 |
| Custom keybindings | 📋 | v0.3 |

## UX & Navigation

| Feature | Status | Notes |
|---|---|---|
| Keyboard shortcuts (⌘S/P/B/`) | ✅ | Hardware keyboard required |
| Status bar (branch, cursor, lang) | ✅ | Clickable git indicator |
| Activity bar git change count | ✅ | Badge on Source Control icon |
| Resizable sidebar | 📋 | v0.2 |
| Resizable terminal panel | 📋 | v0.2 |
| Command palette (⌘⇧P) | ⚠️ | Placeholder alert; real impl v0.2 |
| Drag-and-drop files | 📋 | v0.3 |
| Multitasking (Split View) | ⚠️ | Works but layout not optimised |
