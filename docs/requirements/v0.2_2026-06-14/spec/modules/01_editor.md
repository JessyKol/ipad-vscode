# 模块规格说明：编辑器（Monaco WebView）— v0.2 更新

| 模块 | 编辑器 |
|---|---|
| 相关文件 | `src/assets/monacoHtml.ts`、`src/components/Editor/MonacoEditor.tsx`、`src/components/Editor/EditorTabs.tsx` |
| 版本 | 0.2 |
| 前置版本 | v0.1 spec/modules/01_editor.md |

---

## 1. v0.2 变更说明

在 v0.1 基础上新增两项能力，**其余所有配置与行为保持不变**（Monaco 配置、WebView 属性、初始化序列、标签生命周期、差异模式均沿用 v0.1）：

1. **LSP 客户端注入** — `monacoHtml.ts` 的 HTML 中加载 `monaco-languageclient`，通过 WebSocket 与 LSP 网关通信（详见 spec/modules/08_lsp.md）
2. **Ghost Text（内联补全）** — 接收 AI 服务返回的补全建议，以 Monaco decoration 渲染，支持 Tab 接受

---

## 2. monacoHtml.ts 新增内容

### 引入 monaco-languageclient

```html
<!-- 新增（放在 monaco CDN script 之后） -->
<script src="https://cdn.jsdelivr.net/npm/monaco-languageclient@8/lib/monaco-languageclient.js"></script>
<script src="https://cdn.jsdelivr.net/npm/vscode-ws-jsonrpc@3/lib/index.js"></script>
```

### 新增全局函数 `initLspClient`

```javascript
let lspClient = null

function initLspClient(gatewayUrl, token, rootUri) {
  if (lspClient) lspClient.stop()
  const ws = new WebSocket(gatewayUrl, undefined, { headers: { Authorization: 'Bearer ' + token } })
  const socket = MonacoLanguageClient.createWebSocketConnection(ws)
  lspClient = new MonacoLanguageClient({
    name: 'LSP Client',
    clientOptions: {
      documentSelector: [{ scheme: 'file' }],
      workspaceFolder: { uri: rootUri, name: 'workspace', index: 0 },
    },
    connectionProvider: { get: () => Promise.resolve(socket) },
  })
  lspClient.start()
  ws.onopen = () => window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lspReady' }))
  ws.onerror = (e) => window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lspError', message: e.message }))
}
```

### 新增全局函数 `setLspWorkspace`

```javascript
function setLspWorkspace(rootUri) {
  if (!lspClient) return
  // 通知语言服务器工作区变更（workspace/didChangeWorkspaceFolders）
  lspClient.sendNotification('workspace/didChangeWorkspaceFolders', {
    event: { added: [{ uri: rootUri, name: 'workspace' }], removed: [] }
  })
}
```

---

## 3. Ghost Text（内联补全）

### 渲染机制

Monaco 没有原生 ghost text API（v0.45），使用 **decoration + overlay widget** 模拟：

```javascript
let ghostDecoration = []
let ghostWidget = null

function showGhostText(text, position) {
  // 清除旧 ghost
  ghostDecoration = editor.deltaDecorations(ghostDecoration, [])
  if (ghostWidget) editor.removeOverlayWidget(ghostWidget)

  // 用内联 decoration 显示灰色文字（仅单行）
  ghostDecoration = editor.deltaDecorations([], [{
    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
    options: {
      after: { content: text, inlineClassName: 'ghost-text-decoration' }
    }
  }])

  // 多行补全用 overlay widget 显示在光标下方
  if (text.includes('\n')) {
    // ... overlay widget 实现
  }
}

function clearGhostText() {
  ghostDecoration = editor.deltaDecorations(ghostDecoration, [])
  if (ghostWidget) { editor.removeOverlayWidget(ghostWidget); ghostWidget = null }
}
```

CSS（注入到 Monaco HTML）：
```css
.ghost-text-decoration { color: #6e6e6e; opacity: 0.7; font-style: italic; }
```

### Tab 接受

```javascript
// 在 Monaco 就绪后注册，优先级高于 Tab 默认行为
editor.addCommand(monaco.KeyCode.Tab, () => {
  if (currentGhostText) {
    // 在光标位置插入补全文本
    editor.executeEdits('ghost-text-accept', [{
      range: new monaco.Range(cursorLine, cursorCol, cursorLine, cursorCol),
      text: currentGhostText,
    }])
    clearGhostText()
    currentGhostText = null
  } else {
    // 无 ghost text 时 Tab 执行默认行为（缩进）
    editor.trigger('keyboard', 'tab', {})
  }
})
```

逐词接受（Option+→）：
```javascript
editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.RightArrow, () => {
  if (!currentGhostText) return
  const nextWord = currentGhostText.match(/^\S+\s*/)?.[0] ?? currentGhostText
  // 插入第一个词，剩余部分仍作 ghost text 显示
})
```

---

## 4. postMessage 新增消息类型（v0.2）

### RN → Monaco（新增）

| 消息类型 | 字段 | 说明 |
|---|---|---|
| `lspInit` | `gatewayUrl, token, rootUri` | 初始化 LSP 客户端 |
| `lspSetWorkspace` | `rootUri` | 切换 LSP 工作区 |
| `showGhostText` | `text, offset` | 显示内联补全建议 |
| `clearGhostText` | — | 清除 ghost text |

### Monaco → RN（新增）

| 消息类型 | 字段 | 说明 |
|---|---|---|
| `lspReady` | — | LSP 连接就绪 |
| `lspError` | `message` | LSP 连接错误 |
| `completionContext` | `prefix, suffix, offset, language` | 触发内联补全（debounce 后发送） |

### 继承自 v0.1 的消息类型（不变）

`init`、`save`、`setTheme`、`setFontSize`、`showDiff`、`ready`（Monaco → RN）

---

## 5. MonacoEditor.tsx 变更

```typescript
// 新增 onMessage 处理
case 'lspReady':
  setLspStatus('ready')
  break
case 'lspError':
  setLspStatus('error')
  break
case 'completionContext':
  // 触发内联补全（防抖已在 Monaco 侧完成）
  triggerInlineCompletion(data.prefix, data.suffix, data.offset, data.language)
  break

// 新增 props
interface MonacoEditorProps {
  // ... 原有 props
  lspGatewayUrl?: string     // 已配置时在 lspInit 消息中传入
  lspToken?: string
  onLspStatusChange: (status: LspStatus) => void
}

// 工作区变更时通知 LSP
useEffect(() => {
  if (currentWorkspace && lspStatus === 'ready') {
    webviewRef.current?.postMessage(JSON.stringify({
      type: 'lspSetWorkspace',
      rootUri: 'file://' + currentWorkspace,
    }))
  }
}, [currentWorkspace])
```

---

## 6. 继承自 v0.1 的规格（无变更）

以下内容完整沿用 v0.1 spec/modules/01_editor.md：

- Monaco 默认配置（fontSize、minimap、tabSize 等所有选项）
- WebView 属性（`source={{ html }}`、`scrollEnabled={false}` 等）
- 初始化序列（WebView 挂载 → CDN 加载 → ready → init）
- `pendingInit.current` 竞态条件处理
- 键盘快捷键映射（⌘S / ⌘P / ⌘⇧P / ⌘B / ⌘\`）
- 语言检测（getLanguageFromPath，25+ 语言扩展名映射）
- 标签生命周期（openTab / closeTab / updateTabContent / saveTab）
- 差异模式（DiffEditor，showDiff 消息）

---

## 7. 已知限制（v0.2）

1. **Ghost text 为 decoration 模拟，非 Monaco 原生 API** — Monaco 0.45 无官方 ghost text；升级 Monaco 后需评估是否改用原生 API。
2. **多行补全 overlay 体验较粗糙** — 仅显示在光标下方，不如 Copilot 精细。
3. **LSP 与内联补全补全列表合并排序** — LSP 补全和 AI 内联补全共存时，均在 Monaco 原生补全下拉框中显示（通过 LSP 客户端），ghost text 额外叠加，可能产生视觉干扰。需在 v0.3 协调排序优先级。
4. **每个标签独立 WebView 问题继承自 v0.1** — 切换标签时 LSP 客户端也随之重建，可能产生额外 initialize 请求。
