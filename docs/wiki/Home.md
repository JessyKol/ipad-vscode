# iPad VSCode — Project Wiki

> A full-featured code editor for iPad Pro, built with React Native (Expo) + Monaco Editor.

---

## Quick Links

| | |
|---|---|
| [Architecture](Architecture) | System design, module map, data flow |
| [Development Guide](Development-Guide) | Setup, build, run, contribute |
| [Feature Status](Feature-Status) | What works, what's planned |
| [Roadmap](Roadmap) | Version milestones and priorities |
| [API & Protocols](API-and-Protocols) | WebView bridge message spec, FS adapter contract |

---

## What Is This?

iPad VSCode is a native iPad app that brings a VS Code-like coding experience to iPadOS. It runs entirely on-device — no cloud IDE subscription required.

**Core principle:** Match the muscle memory of VS Code as closely as possible within iPadOS constraints.

### Key Technologies

| Layer | Technology |
|---|---|
| App framework | Expo SDK 51 (React Native) |
| Editor | Monaco Editor 0.45 (via WebView) |
| File system | expo-file-system |
| Git engine | isomorphic-git 1.27 |
| State management | Zustand 4 |
| Navigation | Expo Router 3 |
| Language | TypeScript 5 |

### iPad-Specific Constraints

| Constraint | Our Approach |
|---|---|
| No process execution (iOS sandbox) | Built-in terminal commands + git via isomorphic-git |
| Monaco requires WebView | Inline HTML bridge with postMessage protocol |
| No native symlinks | fsAdapter throws ENOSYS; isomorphic-git handles gracefully |
| GitHub auth (no system keychain yet) | Token stored in Zustand (in-memory); iOS Keychain (expo-secure-store) planned |
| CDN dependency for Monaco | Inline HTML loads Monaco from cdnjs; offline bundling is backlog |

---

## Project Layout

```
ipad-vscode/
├── app/                    Expo Router entry points
│   ├── _layout.tsx         Root layout (SafeAreaProvider, StatusBar)
│   └── index.tsx           Main layout (sidebar + editor + terminal)
├── src/
│   ├── assets/             Static resources compiled into JS
│   │   └── monacoHtml.ts   Monaco editor HTML as inline string
│   ├── components/
│   │   ├── Editor/         MonacoEditor, EditorTabs
│   │   ├── FileTree/       FileTreeView
│   │   ├── Git/            GitPanel, GitDiffView, GitHistoryView
│   │   ├── Search/         SearchPanel
│   │   ├── Settings/       SettingsPanel
│   │   ├── Sidebar/        SidebarPanel (activity bar + panel host)
│   │   ├── StatusBar.tsx
│   │   └── Terminal/       TerminalView
│   ├── screens/
│   │   └── EditorScreen.tsx
│   ├── services/
│   │   ├── fileSystem.ts   expo-file-system wrappers
│   │   ├── fsAdapter.ts    expo-fs → isomorphic-git POSIX adapter
│   │   ├── git.ts          isomorphic-git operations
│   │   └── github.ts       Octokit REST API helpers
│   ├── store/
│   │   └── editorStore.ts  Zustand global state
│   └── types/
│       └── index.ts
├── docs/
│   ├── wiki/               GitHub Wiki source (sync with wiki.git)
│   └── requirements/       Versioned PRDs and specs
└── scripts/
    └── push-wiki.sh        Sync docs/wiki/ to GitHub Wiki
```

---

## Contributing

See [Development Guide](Development-Guide) for setup instructions.

PRDs and spec documents live in `docs/requirements/` — update the relevant version's folder when adding or changing features.
