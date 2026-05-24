# Development Guide

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | ≥ 18 LTS | JS runtime |
| Expo CLI | `npx expo` | Dev server |
| Xcode | ≥ 15 | iOS Simulator |
| iOS Simulator | iPad Pro 12.9" | Primary test target |

## Setup

```bash
git clone git@github.com:JessyKol/ipad-vscode.git
cd ipad-vscode
npm install
```

## Running

```bash
# Start dev server
npm start

# Open in iOS Simulator
npm run ios          # → picks default simulator

# Open on physical iPad via Expo Go (limited — WebView works)
# Scan QR code from 'npm start'
```

> **Tip:** For the Monaco editor to load, the device/simulator must have internet access (CDN dependency). Offline support is planned for v0.3.

## Type Checking

```bash
npm run type-check
```

## Project Scripts

| Script | Command |
|---|---|
| Dev server | `npm start` |
| iOS build | `npm run ios` |
| Web preview | `npm run web` |
| Type check | `npm run type-check` |
| Lint | `npm run lint` |
| Sync wiki | `bash scripts/push-wiki.sh` |

## Architecture Conventions

### Adding a new sidebar panel

1. Add the panel ID to `SidebarPanel` type in `src/types/index.ts`
2. Create component in `src/components/<PanelName>/`
3. Register in `PANELS` array in `src/components/Sidebar/SidebarPanel.tsx`
4. Render in the panel host `switch` block

### Adding Monaco commands

In `src/assets/monacoHtml.ts`, inside the `require(['vs/editor/editor.main'], function() {...})` callback:

```js
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, function() {
  rn({ type: 'myEvent', payload: '...' });
});
```

Then handle `msg.type === 'myEvent'` in `MonacoEditor.tsx`'s `onMessage`.

### Adding git operations

1. Add the function to `src/services/git.ts` — all operations take `dir` (workspace path) as first arg and use the `expoFs` adapter
2. Call from the Git panel or terminal
3. Update git status in store after mutations: `setGitStatus(await getStatus(dir))`

### State changes

All reads/writes go through `useEditorStore`. Avoid local component state for data that other components need. Add new fields + actions to `src/store/editorStore.ts`.

## Testing on Physical iPad

1. Build a development client: `npx expo run:ios --device`
2. Or use [Expo Dev Client](https://docs.expo.dev/develop/development-builds/introduction/)

Key things to test manually:
- Monaco editor loads (requires network)
- `⌘S` saves (requires hardware keyboard attached to iPad)
- Git operations require a workspace with `.git/` initialised
- Push/pull require GitHub token set in Settings

## Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| Monaco shows "Loading editor…" forever | No network, CDN blocked | Connect to internet |
| Git status empty / wrong | Workspace not in git | Tap Settings → Init Repository |
| Push fails "auth required" | No token set | Settings → GitHub Token |
| Commit fails "author required" | No author set | Settings → Git Author |
| File changes not reflected in git | FS mismatch (old code) | Ensure using `expoFs` in git.ts |

## Release Checklist

- [ ] `npm run type-check` passes
- [ ] Tested on iPad Simulator (12.9" and 11")
- [ ] Monaco loads and saves correctly
- [ ] Git: status, stage, commit, push, pull all work
- [ ] Search returns correct results
- [ ] Quick Open lists files correctly
- [ ] Keyboard shortcuts respond (⌘S, ⌘P, ⌘B, ⌘`)
- [ ] Update `docs/requirements/` with any spec changes
- [ ] Push `docs/wiki/` to GitHub Wiki via `scripts/push-wiki.sh`
