# 模块规格说明：编辑器（Monaco WebView）

| 模块 | 编辑器 |
|---|---|
| 相关文件 | `src/assets/monacoHtml.ts`、`src/components/Editor/MonacoEditor.tsx`、`src/components/Editor/EditorTabs.tsx` |
| 版本 | 0.1 |

---

## 职责

将 Monaco 编辑器托管在 React Native WebView 中。提供完整的编辑界面：语法高亮、IntelliSense、查找/替换、键盘快捷键、差异模式。

---

## Monaco 配置（v0.1 默认值）

```js
{
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  lineNumbers: 'on',
  minimap: { enabled: false },          // 为 iPad 性能关闭
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
  automaticLayout: true,               // 响应 WebView 尺寸变化
}
```

---

## WebView 属性（iOS 关键配置）

```tsx
<WebView
  source={{ html: MONACO_HTML }}        // 非 file:// URI
  javaScriptEnabled                     // 必须启用
  domStorageEnabled                     // Monaco 需要
  originWhitelist={['*']}               // 允许 cdnjs.cloudflare.com
  scrollEnabled={false}                 // Monaco 自行管理滚动
  keyboardDisplayRequiresUserAction={false}
  hideKeyboardAccessoryView={false}     // 保留键盘附件栏
  allowsInlineMediaPlayback             // 避免全屏劫持
  mixedContentMode="always"
/>
```

**使用 `source={{ html }}` 的原因：** 在 iOS 上，`file:///android_asset/` 无效。Expo 托管工作流的正确方案是内联 HTML。Monaco CDN 脚本使用绝对 HTTPS URL，可从内联 HTML 文档成功加载。

---

## 初始化序列

```
1. WebView 挂载
2. HTML 加载；Monaco CDN 脚本执行（需要网络）
3. Monaco 就绪 → 触发 postMessage { type: 'ready' }
4. MonacoEditor.onMessage 收到 'ready'
5. 发送 { type: 'init', value, language, theme, fontSize }
6. 编辑器内容设置完成；编辑器可用
```

**待初始化模式：** 如果在 `ready` 之前内容发生变化，会存储在 `pendingInit.current` 中，并在步骤 4 中应用。这可以防止在 WebView 完成加载之前打开标签页时出现竞态条件。

---

## 键盘快捷键映射

所有快捷键在 Monaco 内部通过 `editor.addCommand()` 注册，并通过 postMessage 转发到 React Native：

| 快捷键 | Monaco 按键 | RN 动作 |
|---|---|---|
| ⌘S | `CtrlCmd + S` | 将当前文件保存到磁盘 |
| ⌘P | `CtrlCmd + P` | 打开快速打开模态框 |
| ⌘⇧P | `CtrlCmd + Shift + P` | 打开命令面板 |
| ⌘B | `CtrlCmd + B` | 切换侧边栏显示 |
| ⌘\` | `CtrlCmd + Backquote` | 切换终端显示 |
| ⌘F | Monaco 原生 | Monaco 查找组件 |
| ⌘Z / ⌘⇧Z | Monaco 原生 | 撤销 / 重做 |

---

## 语言检测

`src/services/fileSystem.ts: getLanguageFromPath(path)`

扩展名 → Monaco 语言 ID 映射，支持 25+ 种语言：

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

## 标签生命周期

```
openTab(tabData)
  → 如果路径已打开：切换到已有标签（去重）
  → 否则：创建新标签，id = `${Date.now()}-${path}`

closeTab(id)
  → 从 tabs[] 中移除
  → 如果是当前标签：切换到相邻标签（优先右侧，回退左侧）
  → 如果是最后一个标签：activeTabId = null → 渲染欢迎界面

updateTabContent(id, content)
  → 设置 isDirty = true
  → 不写入磁盘（仅在明确保存时写入）

saveTab(id)
  → 设置 isDirty = false
  → 通过 writeFile(path, content) 写入磁盘
```

---

## 差异模式

Monaco HTML 中包含第二个 `DiffEditor` 实例（`#diff-container`），默认隐藏。激活时：

```js
// RN → Monaco
postMessage({ type: 'showDiff', original: headContent, modified: workContent, language })

// Monaco HTML
showDiff(original, modified, language)
  → 隐藏 #editor-container
  → 显示 #diff-container
  → diffEditor.setModel({ original: createModel(original), modified: createModel(modified) })
```

这样无需创建单独的 WebView 即可显示 Git 差异。

---

## 已知限制（v0.1）

1. **Monaco 从 CDN 加载** — 需要网络。离线加载为待办事项。
2. **无 LSP** — IntelliSense 仅为 Monaco 内置功能（无类型检查，无跨文件跳转定义）。
3. **postMessage 延迟** — 每条消息约 10-30ms；`onDidChangeModelContent` 在每次按键时触发。v0.1 中无防抖；如观察到性能问题则加入待办事项。
4. **每个标签独立 WebView** — 每个标签挂载一个新的 WebView（key={tab.id}）。这是正确的，但意味着每个新标签都会重新加载 Monaco CDN。后续可在待办事项中通过保持单一 WebView 存活的标签切换策略进行优化。
