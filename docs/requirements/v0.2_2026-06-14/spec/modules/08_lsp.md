# 模块规格说明：LSP 网关客户端

| 模块 | LSP 网关客户端 |
|---|---|
| 相关文件 | `src/services/lsp.ts`、`src/assets/monacoHtml.ts`（注入 lsp_client.js 脚本） |
| 版本 | 0.2 |

---

## 职责

让 Monaco 编辑器通过用户自建的远程 LSP 网关获得真实语言服务器能力（补全、跳转定义、诊断等），使 Java 达到 VS Code 标准。RN 侧仅管理连接状态和凭证；LSP 协议全程在 Monaco WebView 内完成。

---

## 架构总览

```
Monaco WebView (iOS WKWebView)
  └── monaco-languageclient（注入到 monacoHtml.ts 的 lsp_client.js 脚本）
        ↕ WebSocket（TLS 强制）
        └── LSP 网关（用户自建，提供 Docker 镜像）
              ├── jdtls（Java — Eclipse JDT LS，需 JDK 17+，RAM ≥ 2GB）
              ├── tsserver（TypeScript / JavaScript）
              └── pyright（Python）

RN 层 (src/services/lsp.ts)
  ├── 从 Keychain 读取凭证（key: ipad_vscode_lsp_token）
  ├── 通过 postMessage 向 Monaco WebView 发送 lspInit / lspSetWorkspace
  ├── 监听 Monaco postMessage（lspReady / lspError）
  └── 维护 LspStatus 状态机（不直接参与 LSP 协议）
```

**核心设计原则：** LSP 协议（JSON-RPC over WebSocket）完全在 WebView 内的 `monaco-languageclient` 中运行。RN 侧只知道"连接成功/失败"，不解析任何 LSP 消息。

---

## 初始化序列

```
[RN 侧]
1. 用户在设置中填写网关 URL + Token → 存入 Keychain
2. Monaco WebView 挂载完成（收到 postMessage { type: 'ready' }）
3. lsp.ts 读取 Keychain → 取得 gatewayUrl + token
4. 发送 postMessage { type: 'lspInit', gatewayUrl, token, rootUri }

[Monaco WebView 侧 — lsp_client.js]
5. 收到 lspInit
6. require('monaco-languageclient')
7. ws = new WebSocket(gatewayUrl, ['Authorization', token])
8. 创建 MonacoLanguageClient，rootUri = rootUri
9. 发送 LSP initialize 请求
10. 等待网关侧语言服务器启动：
    - tsserver / pyright：2–5s
    - jdtls（Java 冷启动）：10–15s，期间 lspStatus = 'indexing'
11. 收到 initialized ack
12. postMessage({ type: 'lspReady', language })

[RN 侧]
13. 收到 lspReady → setLspStatus('ready')
14. 状态栏显示 LSP 在线指示
```

---

## 工作区切换序列

```
[RN 侧]
用户切换工作区目录
  → lsp.ts 发送 postMessage { type: 'lspSetWorkspace', rootUri: newWorkspaceUri }

[Monaco WebView 侧]
  → 向网关发送 workspace/didChangeWorkspaceFolders
  → 若语言为 Java：触发 jdtls 重建索引（lspStatus 短暂回到 'indexing'）
  → 索引完成后恢复 lspStatus = 'ready'
```

---

## postMessage 消息协议（RN ↔ Monaco）

| 方向 | 类型 | 载荷字段 | 说明 |
|---|---|---|---|
| RN → Monaco | `lspInit` | `gatewayUrl: string, token: string, rootUri: string` | 触发 LSP 客户端初始化 |
| RN → Monaco | `lspSetWorkspace` | `rootUri: string` | 切换工作区目录 |
| Monaco → RN | `lspReady` | `language: string` | 指定语言服务器已就绪 |
| Monaco → RN | `lspError` | `message: string` | 连接或协议错误 |

---

## RN 侧 API（src/services/lsp.ts）

```typescript
// 状态类型
type LspStatus = 'disconnected' | 'connecting' | 'indexing' | 'ready' | 'error';

// 公开 API
initLsp(gatewayUrl: string, token: string): Promise<void>
  // 1. 验证 gatewayUrl 非空
  // 2. 将 token 写入 Keychain（key: 'ipad_vscode_lsp_token'）
  // 3. setLspStatus('connecting')
  // 4. 向 Monaco WebView 发送 postMessage { type: 'lspInit', ... }

disconnectLsp(): void
  // 1. setLspStatus('disconnected')
  // 2. 向 Monaco WebView 发送 postMessage { type: 'lspDisconnect' }
  // 3. 清除重连定时器

getLspStatus(): LspStatus
  // 返回当前状态；供状态栏、设置页读取

// 内部：监听 Monaco postMessage
// 'lspReady'   → setLspStatus('ready')；清除重连定时器
// 'lspError'   → setLspStatus('error')；触发指数退避重连
// 'lspIndexing'→ setLspStatus('indexing')（Java 索引阶段）

// 凭证读写（expo-secure-store / Keychain）
const LSP_TOKEN_KEY = 'ipad_vscode_lsp_token';
```

**重要约束：** `lsp.ts` 不解析任何 LSP JSON-RPC 消息，不维护文档版本号，不发送 `textDocument/*` 请求。这些全部由 WebView 内的 `monaco-languageclient` 处理。

---

## monacoHtml.ts 变更点

在 v0.2 中，`monacoHtml.ts` 生成的 HTML 需新增以下内容：

1. **引入 monaco-languageclient**
   - 方式：CDN（`vscode-languageclient` + `monaco-languageclient` UMD bundle）
   - 备选：打包进 assets（离线可用，体积增加约 300KB gzip）

2. **新增函数 `initLspClient(gatewayUrl, token, rootUri)`**
   ```js
   function initLspClient(gatewayUrl, token, rootUri) {
     const ws = new WebSocket(gatewayUrl);
     ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }));
     const socket = toSocket(ws);
     const reader = new WebSocketMessageReader(socket);
     const writer = new WebSocketMessageWriter(socket);
     const client = new MonacoLanguageClient({
       name: 'iPad VSCode LSP Client',
       clientOptions: {
         documentSelector: [{ language: currentLanguage }],
         rootUri,
         workspaceFolder: { uri: rootUri, name: 'workspace', index: 0 },
       },
       connectionProvider: { get: () => Promise.resolve({ reader, writer }) },
     });
     client.start();
   }
   ```

3. **新增 postMessage 消息处理**
   ```js
   window.addEventListener('message', (event) => {
     const msg = JSON.parse(event.data);
     if (msg.type === 'lspInit') {
       initLspClient(msg.gatewayUrl, msg.token, msg.rootUri);
     } else if (msg.type === 'lspSetWorkspace') {
       lspClient.sendNotification('workspace/didChangeWorkspaceFolders', {
         event: { added: [{ uri: msg.rootUri, name: 'workspace' }], removed: [] }
       });
     } else if (msg.type === 'lspDisconnect') {
       lspClient?.stop();
     }
   });
   ```

---

## LSP 能力矩阵（v0.2）

| LSP 能力 | Java | TypeScript | Python | 协议方法 |
|---|---|---|---|---|
| 自动补全 | ✅ | ✅ | ✅ | `textDocument/completion` |
| 补全详情 | ✅ | ✅ | ✅ | `completionItem/resolve` |
| 悬浮文档 | ✅ | ✅ | ✅ | `textDocument/hover` |
| 跳转定义 | ✅ | ✅ | ✅ | `textDocument/definition` |
| 查找引用 | ✅ | ✅ | ✅ | `textDocument/references` |
| 诊断（错误/警告）| ✅ | ✅ | ✅ | `textDocument/publishDiagnostics` |
| 签名提示 | ✅ | ✅ | ✅ | `textDocument/signatureHelp` |
| 重命名符号 | ✅ | ✅ | ⚠️ | `textDocument/rename` |
| 代码操作（Quick Fix）| ✅ | ✅ | ⚠️ | `textDocument/codeAction` |
| 格式化 | ✅ | ✅ | ✅ | `textDocument/formatting` |
| 导入建议（Java）| ✅ | — | — | `codeAction`（organize imports）|

✅ = 完整支持，⚠️ = 部分支持，— = 不适用

---

## 文件内容同步协议

Monaco WebView 内的 `lsp_client.js` 负责全程同步，RN 侧无需参与。

```
打开文件
  → textDocument/didOpen（发送文件全量内容，version = 1）

编辑内容（onDidChangeModelContent）
  → 防抖 500ms
  → textDocument/didChange（incremental changes，version 递增）
  → 防抖原因：避免每次按键都推送，jdtls 处理能力有限

保存文件（⌘S → postMessage 'save'）
  → textDocument/didSave（可携带全量内容作为校验）

关闭标签（closeTab）
  → textDocument/didClose

Binary 文件（languageId = 'binary'）
  → 跳过所有 textDocument/* 通知
```

**文档版本管理：** `lsp_client.js` 维护 `Map<uri, version>` 字典，每次 `didChange` 后 version++。version 从不发送给 RN 侧。

---

## LspStatus 状态机

```
disconnected ──initLsp()──→ connecting
                                │
                    postMessage lspReady
                                ↓
                indexing ←── ready ←── (Java 重建索引后恢复)
                    │           ↑
              jdtls 完成索引    │
                    └───────────┘

connecting ──超时/401──→ error
ready      ──网络断开──→ error
error      ──重连成功──→ ready
error      ──disconnectLsp()──→ disconnected
```

---

## 离线 / 网关不可用降级

```
触发条件：lspStatus = 'error' 或 'disconnected'

降级行为：
  → Monaco 继续使用内置基础补全（关键词、已有标识符）
  → 状态栏显示 "LSP 离线" 指示（橙色图标）
  → 编辑、保存、Git 等功能不受影响

重连策略（指数退避）：
  尝试间隔：1s → 2s → 4s → 8s → 16s → 30s（上限 30s）
  每次重连：重新发送 lspInit，重置 WebSocket

重连成功：
  → lspStatus = 'ready'
  → 状态栏恢复正常
  → Monaco 恢复全功能 LSP（自动重新发送已打开文件的 didOpen）
```

---

## 错误处理

| 错误场景 | 处理方式 |
|---|---|
| 网关地址未配置 | 跳过连接；状态栏显示"设置 LSP 网关"提示；不影响编辑 |
| Token 无效（401） | lspStatus = 'error'；提示"请重新配置 LSP Token"；不自动重连 |
| 网关连接超时（> 10s） | 3 次重试后 lspStatus = 'error'；进入指数退避重连 |
| jdtls 进程崩溃 | 网关负责重启服务进程；客户端收到 WebSocket 关闭事件后重发 initialize |
| 工作区过大（jdtls 索引失败）| lspStatus 显示告警；提示用户在网关侧配置 `.jdtls/config.ini` 中的 exclusions |
| WebSocket 消息乱序 | WebSocket 协议保证有序；网络质量差时 didChange 延迟但不乱序 |

---

## 网关部署要求（v0.2 约束）

- 用户自建；项目提供官方 Docker 镜像（v0.3 考虑官方托管）
- **必须** 支持 WebSocket（`ws://` 开发环境，`wss://` 生产环境）
- **必须** 启用 TLS（iOS App Transport Security 强制）
- 网关按 `languageId` 路由到对应语言服务器进程
- Java（jdtls）：JDK 17+，建议 RAM ≥ 2GB
- TypeScript（tsserver）：Node.js 18+
- Python（pyright）：Python 3.8+

---

## 性能目标（v0.2）

| 操作 | 目标值 | 备注 |
|---|---|---|
| 首次连接（TS / Python，warm） | < 5s | 网关已预热 |
| 首次连接（Java，jdtls 冷启动） | < 15s | 期间显示 indexing 状态 |
| 补全响应（warm jdtls，P50） | < 500ms | 网络 RTT 包含在内 |
| 诊断刷新（文件保存后） | < 2s | publishDiagnostics 推送 |
| 防抖 didChange 发送间隔 | 500ms | 避免按键级推送 |

---

## 已知限制（v0.2）

1. **用户须自建网关，门槛较高** — 需要 Docker 部署知识和公网/局域网可达服务器。v0.3 考虑官方托管方案。
2. **Java 冷启动 10–15s** — jdtls 首次启动须建立索引，体验较差。必须显示明确的 `indexing` 加载状态，避免用户误以为功能故障。
3. **无多项目并发支持** — 同一时间只能存在一个 workspace 的 LSP 会话。切换工作区会触发 jdtls 重建索引。
4. **Binary 文件跳过 LSP** — languageId 为 binary 的文件不发送 `didOpen`，不会获得任何 LSP 能力。
5. **网络质量影响 didChange 延迟** — WebSocket 协议保证消息有序，但高延迟网络下防抖后的 `didChange` 到达网关时，诊断反馈也会随之延迟。
6. **monaco-languageclient CDN 依赖** — 若从 CDN 加载，离线环境下 LSP 客户端脚本本身无法加载（LSP 功能不可用，但编辑器仍可用）。
