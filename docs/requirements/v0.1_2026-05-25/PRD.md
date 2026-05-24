# Product Requirements Document — iPad VSCode v0.1

| Field | Value |
|---|---|
| Version | 0.1 |
| Date | 2026-05-25 |
| Status | Released |
| Author | JessyKol |
| AI session | Claude Sonnet 4.6 |

---

## 1. Executive Summary

iPad VSCode is a native iPad application that provides a full-featured code editing experience similar to Visual Studio Code. It targets developers who use iPad Pro as their primary or secondary computing device and need a capable, offline-capable (backlog) editor with integrated git workflows.

v0.1 establishes the foundational architecture and ships a working product covering the core loop: **open repo → browse files → edit code → commit → push**.

---

## 2. Problem Statement

### The Gap

iPad Pro hardware (M-series chip, Apple Pencil, Magic Keyboard) is powerful enough for serious development work. Yet the software ecosystem lags: no native VS Code port exists, web-based alternatives (github.dev, Replit) require persistent internet and don't feel native, and the App Store has no editor that combines Monaco-quality editing with real git operations.

### Developer Pain Points

1. **No proper code editor on iPad** — existing editors lack syntax highlighting quality, multi-language support, or IntelliSense
2. **Git workflows are broken** — most iPad apps can't push/pull without server-side help
3. **Terminal is a black box** — iOS sandbox means no shell, and users don't know what's possible
4. **Settings don't persist** — developer tools on iPad often lose configuration between sessions

---

## 3. Target Users

### Primary Persona: Mobile Developer (Senior)

> "I use my iPad Pro on flights and in coffee shops. I want to review PRs, make small fixes, and commit — without carrying my MacBook."

- Experience: 5+ years professional dev
- Languages: TypeScript, Python, Go, Swift
- Git workflow: GitHub, feature branches, PRs
- Device: iPad Pro 12.9" + Magic Keyboard

### Secondary Persona: CS Student

> "I take notes in Notion and want to practice coding on my iPad instead of switching to my laptop."

- Experience: 1-2 years, learning
- Languages: Python, JavaScript
- Git workflow: GitHub, simple commits
- Device: iPad Air + Smart Keyboard

### Non-Target for v0.1

- Mobile developers building native iOS apps (need Xcode)
- Data scientists running notebooks (need Jupyter)
- DevOps engineers needing full shell (need real terminal)

---

## 4. Product Goals (v0.1)

| Goal | Metric | Target |
|---|---|---|
| Core editor works | Monaco loads and renders syntax | 100% of supported languages |
| Git loop complete | commit + push succeeds | End-to-end with GitHub token |
| iPad keyboard works | ⌘S saves a file | < 200ms from keypress to disk |
| Search usable | Find text in project | Results in < 3s for 100-file project |
| First launch experience | User can open a file in < 60s | No tutorial needed |

---

## 5. Feature Requirements

### P0 — Must Ship in v0.1

#### F01: Monaco Editor (iOS-compatible)
- **What:** Embed Monaco Editor in a WebView using inline HTML (not file:// URI)
- **Why:** file:///android_asset/ is Android-only; iPad requires different approach
- **Acceptance:** Editor renders on iPad Simulator with syntax highlighting for TypeScript

#### F02: Unified File System
- **What:** Single FS (expo-file-system) used by both the editor and git engine
- **Why:** Separate FS layers (LightningFS + expo-fs) meant git couldn't see edited files
- **Acceptance:** File saved in editor is readable by `git status`; git operations affect files shown in editor

#### F03: File Tree with CRUD
- **What:** Sidebar panel showing workspace directory; create, delete, rename, open files
- **Acceptance:** Can create a file, write to it, rename it, and delete it without leaving the app

#### F04: Multi-tab Editor
- **What:** Multiple files open simultaneously with dirty tracking and save
- **Acceptance:** Dirty dot shown, ⌘S saves the active file, tab content persists when switching

#### F05: Git Status & Staging
- **What:** Show changed/staged/untracked files; stage/unstage individual files or all
- **Acceptance:** After editing a file, it appears in "Changes"; staging moves it to "Staged"

#### F06: Git Commit
- **What:** Commit staged files with a message; requires author name/email
- **Acceptance:** After commit, staged changes clear and new commit appears in history

#### F07: Git Push / Pull
- **What:** Push to and pull from HTTPS remote using a GitHub personal access token
- **Acceptance:** Push creates a commit on GitHub; pull brings remote commits to local

#### F08: Git Diff View
- **What:** Line-by-line diff of current file vs HEAD, with context lines
- **Acceptance:** Added lines green, removed lines red; shows correct changes for a modified file

#### F09: Commit History
- **What:** Timeline showing last 50 commits with author, date, hash, message
- **Acceptance:** Displays commits after cloning a real GitHub repo

#### F10: Branch Management
- **What:** List branches, switch branch, create branch
- **Acceptance:** Creating a branch and switching to it reflects in status bar

#### F11: Full-Text Search
- **What:** Search all text files in workspace; show file + line + context
- **Acceptance:** Search for a function name returns all occurrences across files

#### F12: Settings Panel
- **What:** Git author, GitHub token, theme, font size, clone repo, init repo
- **Acceptance:** Changing theme updates Monaco immediately; setting token enables push

#### F13: Keyboard Shortcuts (Magic Keyboard)
- **What:** ⌘S save, ⌘P quick open, ⌘B sidebar, ⌘\` terminal, ⌘⇧P command palette
- **Acceptance:** Each shortcut works when editor is focused

#### F14: Quick Open (⌘P)
- **What:** Modal fuzzy file picker showing all files in workspace
- **Acceptance:** Typing part of filename filters list; tapping opens file in editor

#### F15: Terminal with Git Commands
- **What:** Built-in terminal supporting git commands via isomorphic-git
- **Acceptance:** `git commit -m "msg"` creates a commit; `git push` pushes to remote

---

### P1 — Target v0.1 but deferrable

#### F16: Clone Repository
- **What:** Clone a GitHub HTTPS URL into the workspace
- **Accepted in Settings panel** — deferred from git panel for simplicity

#### F17: Git Status Badges in File Tree
- **What:** M/A/U indicators next to changed files
- **Acceptance:** After editing a file, "M" appears next to it in the tree

---

## 6. User Stories

### US01 — Review and fix a bug on iPad

> As a senior developer on a flight with no laptop,
> I want to clone my GitHub repo, fix a bug, and push the fix,
> so that I can unblock my team without opening my laptop.

**Flow:**
1. Open app → Settings → Clone Repository → enter URL + token
2. Wait for clone → workspace opens automatically
3. File tree shows project → tap file to open
4. Monaco editor opens with syntax highlighting
5. Edit the bug → ⌘S to save
6. Git panel → Stage → Commit → Push
7. Confirm on GitHub

**Acceptance:** Entire flow completes within the app, no browser needed.

### US02 — Explore an unfamiliar codebase

> As a CS student reviewing a reference project,
> I want to search for where a function is defined and how it's called,
> so that I can understand the codebase structure.

**Flow:**
1. Open existing workspace (already cloned)
2. ⌘P → type filename → open entry point
3. ⌘P → search panel → type function name
4. Results show all occurrences → tap to navigate

### US03 — Daily coding session

> As a developer who uses iPad as secondary machine,
> I want to open the app and continue where I left off,
> so that I don't spend time re-navigating to my work.

**Note:** v0.1 does NOT persist workspace between sessions (file state is in memory). This is a known gap addressed in the backlog.

---

## 7. Non-Functional Requirements

### Performance
| Scenario | Target |
|---|---|
| App cold start to usable | < 3s |
| Monaco editor load | < 5s (CDN dependent) |
| File open (< 500KB) | < 300ms |
| Git status refresh | < 2s for 1000-file repo |
| Search (100 files, 10k lines) | < 3s |
| Commit operation | < 1s |
| Push (small commit) | < 5s (network dependent) |

### Reliability
- File save must be atomic (expo-file-system writeAsStringAsync is atomic on iOS)
- Git state should not corrupt if app is backgrounded during an operation
- WebView crashes should not crash the main app process

### Security
- GitHub token is in-memory only (v0.1); not written to disk
- No token logging in console output
- WebView CSP allows cdnjs.cloudflare.com only (not *, but relaxed for dev)
- No telemetry or analytics in v0.1

### Compatibility
- Primary: iPad Pro 12.9" (M1/M2/M4), iPadOS 16+
- Secondary: iPad Pro 11", iPad Air 5+
- Expo SDK 51 / React Native 0.74
- Magic Keyboard, Smart Keyboard Folio, third-party BT keyboards

---

## 8. Out of Scope for v0.1

| Feature | Reason |
|---|---|
| Settings persistence | Requires expo-secure-store; v0.2 |
| Command palette (real) | Alert placeholder ships in v0.1; real impl v0.2 |
| Resizable panels | Gesture handling complexity; v0.2 |
| SSH terminal | Native module needed; v0.2 |
| Regex search | Backlog |
| Git merge UI | Backlog |
| Offline Monaco | Large asset bundling; v0.3 |
| LSP / language server | v0.3 |
| App Store submission | v1.0 |

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Monaco CDN unavailable | Low | High | Cache in AsyncStorage after first load (backlog) |
| isomorphic-git doesn't support server | Medium | Medium | Fallback error message; test with GitHub |
| WebView postMessage latency | Low | Medium | Debounce content sync; tested at < 50ms |
| iOS WebView CSP blocks CDN | Low | High | Meta CSP tag allows cdnjs.cloudflare.com |
| expo-file-system permission issues | Low | High | App declares UIFileSharingEnabled in plist |
| Large repo clone timeout | Medium | Low | Clone with `depth: 50`; user can configure |

---

## 10. Open Questions

1. **Token security:** Should the token ever be written to disk? If yes, use expo-secure-store (Keychain). Decision deferred to v0.2.
2. **Workspace discovery:** Should the app show a "recent workspaces" list on launch? Yes — backlog.
3. **Monaco bundling strategy:** Bundle all 50 language workers locally (~30MB), or lazy-load on demand? Decision backlog planning.
4. **LSP approach:** Run TypeScript language server in JavaScriptCore, or use a remote LSP proxy? Both options to be prototyped in the backlog research phase.
