# v0.1 Spec — 00: System Overview & Architecture

| Field | Value |
|---|---|
| Version | 0.1 |
| Date | 2026-05-25 |
| Status | Implemented |

---

## 1. Architecture Style

Single-page React Native application with:
- **Flat component tree**: no deep nesting; screens are composed from panels
- **Centralised state**: Zustand store as single source of truth
- **Service layer**: pure functions, no class instances (except where library requires)
- **WebView bridge**: Monaco editor runs in a sandboxed WebView; communication is JSON postMessage

```
User Input (touch / hardware keyboard)
        │
        ▼
React Native Components (Zustand reads)
        │
        ├─── WebView (Monaco)
        │         ↕ postMessage
        │
        ├─── Service Layer (fileSystem, git, github)
        │         │
        │         ▼
        │    expo-file-system (device storage)
        │         │
        │         ▼
        │    Documents/workspaces/ (git repos)
        │
        └─── Zustand Store (state mutations)
```

---

## 2. Module Dependency Graph

```
app/index.tsx
  └── SidebarPanel
        ├── FileTreeView         → fileSystem.ts
        ├── GitPanel             → git.ts
        │     ├── GitDiffView    → git.ts, fileSystem.ts
        │     └── GitHistoryView → git.ts
        ├── SearchPanel          → fileSystem.ts
        └── SettingsPanel        → git.ts, fileSystem.ts

EditorScreen
  ├── EditorTabs               → editorStore
  ├── MonacoEditor             → monacoHtml.ts (WebView)
  └── StatusBar                → editorStore

TerminalView                   → git.ts, fileSystem.ts, editorStore

editorStore (Zustand)          ← all components read/write

git.ts                         → fsAdapter.ts → expo-file-system
fileSystem.ts                  → expo-file-system
github.ts                      → @octokit/rest → HTTPS
```

---

## 3. Technology Stack Rationale

### React Native + Expo
- **Why Expo SDK:** Managed workflow means no Xcode for most dev work; expo-file-system and expo-router are battle-tested
- **Why not bare RN:** Unnecessary complexity for this feature set at v0.1
- **Risk:** Expo SDK upgrades may break native modules; mitigated by pinning versions

### Monaco Editor via WebView
- Monaco has no React Native port (it requires a DOM)
- WebView provides a full browser environment
- Inline HTML approach (`source={{ html: '...' }}`) is cross-platform; `file:///android_asset/` is Android-only
- postMessage latency measured at < 30ms on M-series iPad

### isomorphic-git
- Pure JavaScript git implementation; no native module needed
- Works in React Native / Expo managed workflow
- HTTP transport only (no SSH); acceptable for v0.1 (GitHub HTTPS + PAT)
- Performance: `statusMatrix` on 1000-file repo takes ~800ms; acceptable

### Zustand
- Minimal boilerplate vs Redux
- No Provider wrapping required (hooks-first)
- Sufficient for current store size (~15 state fields)

---

## 4. Data Flow: Opening a File

```
User taps file in FileTreeView
        │
        ▼
FileItem.handlePress()
        │
        ├── readFile(node.path)         [expo-file-system]
        ├── getLanguageFromPath(path)   [fileSystem.ts]
        │
        ▼
openTab({ path, name, content, language, isDirty: false })
        │
        ▼
editorStore.openTab()
  → tabs[] updated, activeTabId set
        │
        ▼
EditorScreen re-renders
  → MonacoEditor receives new tabId, content, language
        │
        ▼
MonacoEditor.useEffect([tabId])
  → postMessage({ type: 'init', value, language, theme, fontSize })
        │
        ▼
Monaco WebView receives message
  → editor.setValue(value)
  → setModelLanguage(language)
```

---

## 5. Data Flow: Saving a File

```
⌘S pressed (hardware keyboard on Monaco)
        │
        ▼
Monaco: editor.addCommand(CtrlCmd|S) fires
  → window.ReactNativeWebView.postMessage({ type: 'save' })
        │
        ▼
MonacoEditor.onMessage receives 'save'
  → calls onSave prop
        │
        ▼
EditorScreen.handleSave()
  → writeFile(activeTab.path, activeTab.content)  [expo-file-system]
  → saveTab(activeTab.id)                         [Zustand: isDirty = false]
```

---

## 6. Data Flow: Git Commit

```
User types commit message → taps "Commit"
        │
        ▼
GitPanel.handleCommit()
        │
        ├── Validate: commitMsg, staged.length > 0, author set
        │
        ▼
git.commit(dir, message, { name, email })
        │
        ▼
isomorphic-git.commit()
  → reads .git/ via fsAdapter (expo-file-system)
  → writes new commit object to .git/objects/
  → updates .git/refs/heads/<branch>
        │
        ▼
getStatus(dir)  → setGitStatus(status)
getCurrentBranch(dir) → setActiveBranch(branch)
        │
        ▼
GitPanel re-renders (staged list now empty)
StatusBar re-renders (branch name updated)
```

---

## 7. State Schema

```typescript
// src/store/editorStore.ts

EditorStore {
  // Editor tabs
  tabs: EditorTab[]           // { id, path, name, content, isDirty, language }
  activeTabId: string | null

  // File system
  fileTree: FileNode[]        // { name, path, type, children?, gitStatus? }
  currentWorkspace: string | null  // abs path

  // Git
  gitStatus: GitStatus        // { staged[], unstaged[], untracked[] }
  activeBranch: string

  // UI
  sidebarPanel: 'files' | 'git' | 'search' | 'settings'
  sidebarVisible: boolean

  // Editor settings
  theme: 'vs-dark' | 'vs-light' | 'hc-black'
  fontSize: number            // 10-24

  // Git settings
  gitSettings: {
    authorName: string
    authorEmail: string
    token: string             // GitHub PAT; in-memory only in v0.1
  }
}
```

---

## 8. Key Invariants

1. **Single FS:** All file operations MUST go through `expo-file-system`. `git.ts` uses `fsAdapter.ts` which wraps expo-file-system. LightningFS must NOT be used.

2. **Tab content is ground truth:** The editor's `content` in `EditorTab` reflects what's in Monaco. On save, this is written to disk. The two should never diverge for more than one autosave interval (v0.1 has no autosave — save is manual only).

3. **Git status must be refreshed after mutations:** Any function that calls `stageFile`, `unstageFile`, `stageAll`, `commit`, `pull` MUST call `getStatus(dir)` and update the store.

4. **Branch must be updated after checkout:** Any checkout/branch-create must call `getCurrentBranch` and update `activeBranch` in the store.

5. **Token never logged:** The GitHub token must not appear in `console.log`, error messages shown to UI, or crash reports.
