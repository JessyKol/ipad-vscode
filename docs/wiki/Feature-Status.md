# Feature Status

Last updated: 2026-05-25 | Version: 0.1

## Legend
| Symbol | Meaning |
|---|---|
| ✅ | Implemented and working |
| ⚠️ | Partial / known limitations |
| 📋 | Not yet implemented (backlog, no version assigned) |
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
| Split editor | 📋 | Backlog |
| Minimap | ✅ | Disabled by default (perf) |
| Word wrap toggle | 📋 | Backlog |
| Diff editor (in-app) | ✅ | Git panel → file → diff icon |
| Offline Monaco | 📋 | Backlog (currently requires CDN) |

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
| Import from Files.app | 📋 | Backlog |
| iCloud Drive support | 📋 | Backlog |

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
| Merge | 📋 | Backlog |
| Rebase | ❌ | Out of scope |
| SSH remote | ❌ | isomorphic-git HTTP only |
| GitHub PR creation | 📋 | Backlog |
| Multiple remotes | ⚠️ | Works but UI only shows first |

## Terminal

| Feature | Status | Notes |
|---|---|---|
| Built-in commands | ✅ | help, clear, pwd, echo, date, ls, cat, open |
| Git via terminal | ⚠️ | Works; `git log` shows raw ANSI escape codes (rendering bug, see spec/modules/04_terminal.md) |
| Command history (↑↓) | ✅ | |
| Real shell (bash/zsh) | ❌ | iOS sandbox; not possible |
| SSH client | 📋 | Backlog |
| JavaScript eval (sandboxed) | 📋 | Backlog |
| Multiple terminal tabs | 📋 | Backlog |

## Search

| Feature | Status | Notes |
|---|---|---|
| Full-text search in workspace | ⚠️ | Only searches directories already expanded in FileTree; see spec/modules/05_search.md |
| Case-sensitive toggle | ✅ | |
| Click to open file at line | ✅ | Opens file; does not scroll to line yet |
| Results grouped by file | ✅ | |
| Regex search | 📋 | Backlog |
| Replace | 📋 | Backlog |
| Include/exclude glob patterns | 📋 | Backlog |

## Settings & Config

| Feature | Status | Notes |
|---|---|---|
| Git author (name + email) | ✅ | Required for commit |
| GitHub token | ✅ | Required for push/pull; stored in-memory only |
| Theme (Dark/Light/HC) | ✅ | Propagates to Monaco |
| Font size | ✅ | 10–24px |
| Token persistence | 📋 | Backlog (currently lost on app restart) |
| Settings persistence | 📋 | Backlog (currently lost on app restart) |
| Custom keybindings | 📋 | Backlog |

## UX & Navigation

| Feature | Status | Notes |
|---|---|---|
| Keyboard shortcuts (⌘S/P/B/`) | ✅ | Hardware keyboard required |
| Status bar (branch, cursor, lang) | ✅ | Clickable git indicator |
| Activity bar git change count | ✅ | Badge on Source Control icon |
| Resizable sidebar | 📋 | Backlog |
| Resizable terminal panel | 📋 | Backlog |
| Command palette (⌘⇧P) | ⚠️ | Keybinding works; shows placeholder alert only |
| Drag-and-drop files | 📋 | Backlog |
| Multitasking (Split View) | ⚠️ | Works but layout not optimised |
