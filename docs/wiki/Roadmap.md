# Roadmap

## Version Strategy

| Version | Theme | Target |
|---|---|---|
| **0.1** | Foundation | Core editor + git + search working on iPad |
| **0.2** | Polish & Persistence | Settings persist, resizable panels, SSH terminal, Files.app import |
| **0.3** | Power Features | Offline Monaco, split editor, LSP-lite, PR creation |
| **1.0** | App Store Ready | Full polish, performance, accessibility, TestFlight |

---

## v0.1 — Foundation ✅ (2026-05-25)

**Goal:** A working code editor with git on iPad Pro.

- [x] Monaco Editor via WebView (iOS + Android compatible)
- [x] expo-file-system as single FS (unified with git)
- [x] File tree with create/delete/rename
- [x] Multiple editor tabs with dirty tracking
- [x] Syntax highlighting for 50+ languages
- [x] Git: status, stage, commit, push, pull, clone, init
- [x] Git: branch list, switch, create
- [x] Git: file diff (HEAD vs working), commit history
- [x] Full-text search across workspace
- [x] Keyboard shortcuts (⌘S, ⌘P, ⌘B, ⌘`)
- [x] Quick Open file picker (⌘P)
- [x] Terminal with built-in commands + git
- [x] Settings: git author, GitHub token, theme, font size
- [x] Status bar: live branch, cursor position, language

---

## v0.2 — Polish & Persistence (Target: 2026-07)

**Goal:** Settings survive restarts; UX feels native; SSH terminal.

### Must Have (P0)
- [ ] Persist settings via `expo-secure-store` (token) + app FS JSON (other prefs)
- [ ] Persist last open workspace
- [ ] Command palette (⌘⇧P) — real implementation with fuzzy action search
- [ ] Resizable sidebar (drag handle)
- [ ] Resizable terminal panel (drag handle)
- [ ] Import files from Files.app (`expo-document-picker`)

### Should Have (P1)
- [ ] Word wrap toggle (per file or global)
- [ ] Regex search + replace
- [ ] Git merge (fast-forward + conflict UI)
- [ ] Terminal: SSH client (WebSocket bridge or native module)
- [ ] Terminal: sandboxed JS eval (JavaScriptCore)
- [ ] File rename via tab context menu (long-press tab)
- [ ] Git: multiple remote support in UI

### Nice to Have (P2)
- [ ] Breadcrumb path in editor header
- [ ] Minimap toggle in UI
- [ ] Font family selection (system monospace fonts)
- [ ] Git stash list and apply

---

## v0.3 — Power Features (Target: 2026-10)

**Goal:** Offline capable, split view, smarter code intelligence.

### Must Have (P0)
- [ ] Bundle Monaco locally (eliminate CDN dependency)
- [ ] Split editor (two files side by side)
- [ ] Language Server Protocol (LSP-lite)
  - TypeScript: use `@typescript/language-server` compiled to run in JSC
  - Python: pylsp WASM (experimental)
- [ ] iCloud Drive / Files provider integration

### Should Have (P1)
- [ ] GitHub PR creation via Octokit
- [ ] Multiple terminal tabs
- [ ] Extensions framework (basic plugin loading)
- [ ] Glob include/exclude patterns in search
- [ ] Custom keybindings (stored in settings JSON)
- [ ] Drag-and-drop file reordering in tree

### Nice to Have (P2)
- [ ] GitLab/Bitbucket support (generic HTTPS git)
- [ ] Vim mode (Monaco VIM extension)
- [ ] Zen mode (full-screen editor, hide all chrome)

---

## v1.0 — App Store Ready (Target: 2027-Q1)

**Goal:** Ship to App Store.

- [ ] App Store metadata + screenshots
- [ ] Full VoiceOver accessibility pass
- [ ] Performance profiling + optimization
- [ ] Memory limit handling (large files, deep trees)
- [ ] Crash reporting (Sentry)
- [ ] Analytics (opt-in, privacy-respecting)
- [ ] TestFlight beta + feedback loop
- [ ] Privacy policy, Terms of Service
- [ ] iPad multitasking (Split View, Slide Over) optimization

---

## Rejected / Out of Scope

| Feature | Reason |
|---|---|
| Git SSH transport | isomorphic-git supports HTTP only; SSH requires native module |
| Git rebase interactive | Too complex UI, not needed for 1.0 |
| Running Python/Node locally | iOS sandbox prevents process execution |
| Windows/Android primary support | iPad-first; Android is secondary |
| Collaborative editing | Out of scope for v1.0 |
