# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        iPad Pro (iOS)                            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  React Native App (Expo)                  │    │
│  │                                                           │    │
│  │  ┌──────────────┐  ┌────────────────────────────────┐   │    │
│  │  │   Sidebar    │  │         Editor Area             │   │    │
│  │  │              │  │                                 │   │    │
│  │  │  Files       │  │  ┌──────────────────────────┐  │   │    │
│  │  │  Git         │  │  │   MonacoEditor (WebView)  │  │   │    │
│  │  │  Search      │  │  │                           │  │   │    │
│  │  │  Settings    │  │  │  Monaco Editor 0.45       │  │   │    │
│  │  │              │  │  │  (loaded from CDN)        │  │   │    │
│  │  └──────────────┘  │  │                           │  │   │    │
│  │                     │  │  ← postMessage bridge →   │  │   │    │
│  │  ┌──────────────┐  │  └──────────────────────────┘  │   │    │
│  │  │  Status Bar  │  │                                 │   │    │
│  │  └──────────────┘  └────────────────────────────────┘   │    │
│  │                                                           │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │                   Terminal Panel                   │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  │                                                           │    │
│  │  ┌──────────┐  ┌─────────────┐  ┌──────────────────┐   │    │
│  │  │  Zustand │  │ expo-file-  │  │  isomorphic-git   │   │    │
│  │  │  Store   │  │ system      │  │  + fsAdapter      │   │    │
│  │  └──────────┘  └─────────────┘  └──────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                     App Sandbox (Documents/)                     │
│          workspaces/   →   project-a/  project-b/  ...          │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTPS
                     ┌────────▼────────┐
                     │  GitHub / GitLab │
                     │  (isomorphic-git │
                     │   http transport)│
                     └─────────────────┘
```

---

## Layer Map

### 1. Presentation Layer
| Component | File | Responsibility |
|---|---|---|
| MainLayout | `app/index.tsx` | Root layout, Quick Open modal, sidebar/terminal toggle |
| SidebarPanel | `src/components/Sidebar/SidebarPanel.tsx` | Activity bar + panel switching |
| EditorScreen | `src/screens/EditorScreen.tsx` | Tab bar + Monaco host + keyboard routing |
| MonacoEditor | `src/components/Editor/MonacoEditor.tsx` | WebView wrapper, postMessage bridge |
| GitPanel | `src/components/Git/GitPanel.tsx` | Stage/commit/push/pull, sub-views |
| GitDiffView | `src/components/Git/GitDiffView.tsx` | HEAD vs working diff (LCS algorithm) |
| GitHistoryView | `src/components/Git/GitHistoryView.tsx` | Commit log timeline |
| SearchPanel | `src/components/Search/SearchPanel.tsx` | Full-text search across workspace |
| SettingsPanel | `src/components/Settings/SettingsPanel.tsx` | Git config, theme, font, clone |
| TerminalView | `src/components/Terminal/TerminalView.tsx` | Built-in shell with git commands |
| StatusBar | `src/components/StatusBar.tsx` | Branch, cursor, language, encoding |

### 2. State Layer (Zustand)
```
EditorStore {
  tabs[]          — open editor tabs with content + dirty flag
  activeTabId     — which tab is focused
  fileTree[]      — current workspace directory tree
  currentWorkspace — abs path to active workspace
  gitStatus       — { staged[], unstaged[], untracked[] }
  activeBranch    — current branch name (string)
  sidebarPanel    — which sidebar tab is visible
  sidebarVisible  — boolean
  theme           — 'vs-dark' | 'vs-light' | 'hc-black'
  fontSize        — editor font size (number)
  gitSettings     — { authorName, authorEmail, token }
}
```

### 3. Service Layer
| Service | File | Key APIs |
|---|---|---|
| FileSystem | `src/services/fileSystem.ts` | readFile, writeFile, readDirectory, createWorkspace |
| FsAdapter | `src/services/fsAdapter.ts` | POSIX fs.promises for isomorphic-git |
| Git | `src/services/git.ts` | status, stage, commit, push, pull, diff, log, branch |
| GitHub | `src/services/github.ts` | Octokit REST (list repos, get/put file content) |

---

## Monaco ↔ React Native Bridge

All communication goes through WebView `postMessage`. The protocol is JSON-encoded.

### RN → Monaco (commands)

| Message | Payload | Effect |
|---|---|---|
| `init` | `{ value, language, theme, fontSize }` | Full editor initialisation |
| `setValue` | `{ value: string }` | Replace editor content |
| `setLanguage` | `{ language: string }` | Change syntax mode |
| `setTheme` | `{ theme: string }` | Switch theme |
| `setFontSize` | `{ size: number }` | Update font size |
| `format` | — | Run formatDocument action |
| `find` | — | Open find widget |
| `undo` / `redo` | — | Trigger history commands |
| `focus` | — | Focus editor |
| `showDiff` | `{ original, modified, language }` | Switch to diff editor mode |
| `hideDiff` | — | Return to edit mode |
| `revealLine` | `{ line: number }` | Scroll to line |

### Monaco → RN (events)

| Message | Payload | Meaning |
|---|---|---|
| `ready` | — | Editor initialised, send `init` |
| `change` | `{ value: string }` | Content changed |
| `cursor` | `{ line, column }` | Cursor moved |
| `save` | — | ⌘S pressed |
| `quickOpen` | — | ⌘P pressed |
| `commandPalette` | — | ⌘⇧P pressed |
| `toggleSidebar` | — | ⌘B pressed |
| `toggleTerminal` | — | ⌘\` pressed |

---

## File System Architecture

```
expo-file-system (Device FS)
        │
        ├── documentDirectory/workspaces/
        │       ├── project-a/          ← workspace root
        │       │     ├── .git/         ← managed by isomorphic-git
        │       │     ├── src/
        │       │     └── ...
        │       └── project-b/
        │
        └── (other expo app storage)

fsAdapter (src/services/fsAdapter.ts)
  Wraps expo-file-system as a POSIX fs.promises interface
  so isomorphic-git can operate on the same real device files
  that the editor reads and writes.
```

**Critical invariant:** The editor (`fileSystem.ts`) and the git engine (`git.ts`) MUST use the same underlying storage. `fsAdapter.ts` is the bridge that makes this possible.

---

## Key Design Decisions

### D1: Monaco via WebView (not native)
Monaco has no React Native port. The WebView bridge adds ~10ms latency for content sync but gives full Monaco capabilities including IntelliSense, diff editor, and 50+ language grammars.

### D2: Inline HTML instead of bundled asset
Using `source={{ html: MONACO_HTML }}` works on both iOS and Android without platform-specific asset paths. Trade-off: Monaco still loads from CDN (requires network); offline support is a v0.3 goal.

### D3: expo-file-system as the single FS
Unified FS via `fsAdapter` ensures git objects and working files coexist in the same directory tree. Previous architecture (LightningFS + expo-fs) was completely split — git had no visibility into edited files.

### D4: isomorphic-git over native libgit2
isomorphic-git runs in pure JS — no native module, works on any Expo managed workflow build. Limitation: no SSH transport (HTTP/HTTPS only, token auth).

### D5: Zustand over Redux
Single flat store with actions co-located. No middleware complexity. Fine for this app size; revisit if store grows beyond ~15 slices.
