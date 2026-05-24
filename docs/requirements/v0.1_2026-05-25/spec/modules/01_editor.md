# Module Spec: Editor (Monaco WebView)

| Module | Editor |
|---|---|
| Files | `src/assets/monacoHtml.ts`, `src/components/Editor/MonacoEditor.tsx`, `src/components/Editor/EditorTabs.tsx` |
| Version | 0.1 |

---

## Responsibility

Hosts the Monaco Editor inside a React Native WebView. Provides the full editing surface: syntax highlighting, IntelliSense, find/replace, keyboard shortcuts, diff mode.

---

## Monaco Configuration (v0.1 defaults)

```js
{
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  lineNumbers: 'on',
  minimap: { enabled: false },          // disabled for perf on iPad
  scrollBeyondLastLine: false,
  wordWrap: 'off',
  tabSize: 2,
  insertSpaces: true,
  renderWhitespace: 'selection',
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true, indentation: true },
  quickSuggestions: { other: true, comments: false, strings: false },
  formatOnPaste: true,
  formatOnType: false,
  automaticLayout: true,               // responds to WebView resize
}
```

---

## WebView Props (iOS-critical)

```tsx
<WebView
  source={{ html: MONACO_HTML }}        // NOT file:// URI
  javaScriptEnabled                     // required
  domStorageEnabled                     // required for Monaco
  originWhitelist={['*']}               // allow cdnjs.cloudflare.com
  scrollEnabled={false}                 // Monaco handles its own scroll
  keyboardDisplayRequiresUserAction={false}
  hideKeyboardAccessoryView={false}     // keep the keyboard accessory bar
  allowsInlineMediaPlayback             // avoids fullscreen hijack
  mixedContentMode="always"
/>
```

**Why `source={{ html }}`:** On iOS, `file:///android_asset/` is invalid. The proper approach for Expo managed workflow is inline HTML. Monaco CDN scripts use absolute HTTPS URLs and load successfully from an inline HTML document.

---

## Initialisation Sequence

```
1. WebView mounts
2. HTML loads; Monaco CDN script executes (requires network)
3. Monaco ready → fires postMessage { type: 'ready' }
4. MonacoEditor.onMessage receives 'ready'
5. Sends { type: 'init', value, language, theme, fontSize }
6. Editor content set; editor is usable
```

**Pending init pattern:** If content changes before `ready`, it's stored in `pendingInit.current` and applied in step 4. This prevents a race condition when a tab is opened before the WebView finishes loading.

---

## Keyboard Shortcut Mapping

All shortcuts are registered inside Monaco with `editor.addCommand()` and relay via postMessage to React Native:

| Shortcut | Monaco Key | RN Action |
|---|---|---|
| ⌘S | `CtrlCmd + S` | Save active file to disk |
| ⌘P | `CtrlCmd + P` | Open Quick Open modal |
| ⌘⇧P | `CtrlCmd + Shift + P` | Open Command Palette |
| ⌘B | `CtrlCmd + B` | Toggle sidebar |
| ⌘\` | `CtrlCmd + Backquote` | Toggle terminal |
| ⌘F | Monaco native | Monaco find widget |
| ⌘Z / ⌘⇧Z | Monaco native | Undo / Redo |

---

## Language Detection

`src/services/fileSystem.ts: getLanguageFromPath(path)`

Extension → Monaco language ID mapping covers 25+ languages:

```
.ts / .tsx → typescript
.js / .jsx → javascript
.py        → python
.go        → go
.rs        → rust
.java      → java
.swift     → swift
.kt        → kotlin
.cpp / .c  → cpp / c
.html      → html
.css / .scss → css / scss
.json      → json
.yaml / .yml → yaml
.md        → markdown
.sh / .bash → shell
.xml       → xml
.sql       → sql
.php       → php
.dart      → dart
.rb        → ruby
.cs        → csharp
```

---

## Tab Lifecycle

```
openTab(tabData)
  → If path already open: switch to existing tab (dedup)
  → Else: create new tab with id = `${Date.now()}-${path}`

closeTab(id)
  → Remove from tabs[]
  → If active: switch to adjacent tab (prefer right, fall back left)
  → If last tab: activeTabId = null → WelcomeScreen renders

updateTabContent(id, content)
  → Set isDirty = true
  → Does NOT write to disk (write only on explicit save)

saveTab(id)
  → Set isDirty = false
  → Writes to disk via writeFile(path, content)
```

---

## Diff Mode

The Monaco HTML includes a second `DiffEditor` instance (`#diff-container`). It is hidden by default. When activated:

```js
// RN → Monaco
postMessage({ type: 'showDiff', original: headContent, modified: workContent, language })

// Monaco HTML
showDiff(original, modified, language)
  → #editor-container hidden
  → #diff-container shown
  → diffEditor.setModel({ original: createModel(original), modified: createModel(modified) })
```

This allows displaying the git diff without creating a separate WebView.

---

## Known Limitations (v0.1)

1. **Monaco loads from CDN** — requires internet. Offline loading planned for v0.3.
2. **No LSP** — IntelliSense is Monaco built-in only (no type checking, no go-to-definition across files).
3. **postMessage latency** — ~10-30ms per message; `onDidChangeModelContent` fires on every keystroke. No debouncing in v0.1; add in v0.2 if perf issues observed.
4. **Single WebView per tab** — each tab mounts a new WebView (key={tab.id}). This is correct but means Monaco reloads CDN on each new tab. Optimize in v0.2 with a tab-switching strategy that keeps one WebView alive.
