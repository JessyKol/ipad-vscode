# Module Spec: Settings

| Module | Settings |
|---|---|
| File | `src/components/Settings/SettingsPanel.tsx`, `src/store/editorStore.ts` |
| Version | 0.1 |

---

## Responsibility

Provide UI for configuring git author credentials, GitHub token, editor appearance, and workspace management (clone/init).

---

## Settings Schema

All settings live in Zustand (in-memory only in v0.1):

```typescript
// In EditorStore
gitSettings: {
  authorName: string;    // git commit author name
  authorEmail: string;   // git commit author email
  token: string;         // GitHub PAT (in-memory only)
}
theme: 'vs-dark' | 'vs-light' | 'hc-black';
fontSize: number;        // 10-24
```

---

## Settings Categories

### Git Author
- **Purpose:** Required for commit operations. isomorphic-git requires author `{ name, email }` on every commit.
- **Validation:** None in v0.1; empty fields cause commit to fail with an Alert.
- **Storage:** Zustand only (lost on app restart). Persist to JSON file in the backlog.

### GitHub Token
- **Purpose:** Required for push, pull, and clone of private repos or when rate-limited.
- **Type:** GitHub Personal Access Token (PAT), scopes: `repo` (full repo access)
- **Storage:** Zustand only (in-memory). **Never logged to console. Never shown in error messages.**
- **Security note:** In v0.2, move to `expo-secure-store` (iOS Keychain wrapper).
- **Display:** Input uses `secureTextEntry={true}` — shows dots.

### Theme
- Three options: Dark, Light, High Contrast
- Immediately applied to Monaco via `postMessage({ type: 'setTheme', theme })`
- Stored in Zustand; propagates via MonacoEditor `useEffect([theme])`

### Font Size
- Range: 10–24px
- `+` / `-` buttons (no slider — too easy to mispress on iPad)
- Applied to Monaco via `postMessage({ type: 'setFontSize', size })`

### Clone Repository
- URL input → calls `cloneRepo(url, dir, token?)`
- Uses token from gitSettings if set
- Auto-opens workspace after clone
- Clone happens on the UI thread (no background worker in v0.1) — shows "Cloning…" in button label

### Init Repository
- Calls `initRepo(currentWorkspace)` on current workspace
- Idempotent (re-init is safe in isomorphic-git)
- Required before any git operations on a new workspace

---

## State Persistence (v0.1 Limitation)

**Problem:** All settings are lost on app restart.

**Impact:**
- User must re-enter git author, token, and re-open workspace on every launch
- This is the primary UX complaint expected from v0.1

**Backlog:**
```typescript
// Use expo-secure-store for token (Keychain-backed):
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('github_token', token);

// Use a settings.json file for other prefs:
const settingsPath = FileSystem.documentDirectory + 'settings.json';
await writeFile(settingsPath, JSON.stringify({ authorName, authorEmail, theme, fontSize }));
```

---

## Theme Propagation

Theme change flow:
```
SettingsPanel → setTheme(theme)     [Zustand mutation]
    ↓
EditorStore.theme updated
    ↓
MonacoEditor.useEffect([theme]) fires
    ↓
postMessage({ type: 'setTheme', theme })
    ↓
Monaco: monaco.editor.setTheme(toMonacoTheme(theme))
```

Theme → Monaco theme mapping:
```
'vs-dark'  → 'vscode-dark'  (custom theme based on vs-dark)
'vs-light' → 'vscode-light' (custom theme based on vs)
'hc-black' → 'hc-black'     (Monaco built-in high contrast)
```

---

## Known Limitations (v0.1)

1. **No persistence** — all settings reset on app restart. Fix in the backlog.
2. **No input validation** — invalid email format accepted; will cause git author to be malformed. Add validation in the backlog.
3. **Token security** — in-memory only; Keychain storage in the backlog.
4. **Clone runs on UI thread** — large repos may cause the UI to feel sluggish during clone. Move to background task in the backlog.
5. **No custom keybindings** — keyboard shortcuts are hardcoded in Monaco HTML. User-configurable bindings in the backlog.
6. **No font family selection** — Menlo is hardcoded. Add system monospace font picker in the backlog.
