# v0.2 规格说明 — 00：系统架构总纲

| 字段 | 内容 |
|---|---|
| 版本 | 0.2 |
| 日期 | 2026-06-14 |
| 状态 | 草案 |
| 前置版本 | [v0.1 架构总纲](../../v0.1_2026-05-25/spec/00_overview.md) |

---

## 1. 架构风格与演进策略

v0.2 在 v0.1 架构基础上叠加三大支柱，核心约束不变：

- **扁平组件树**（不变）：无深层嵌套；页面由面板组合
- **集中式状态**（扩展）：Zustand 单一存储，新增 AI / LSP / Bridge / 设置持久化状态
- **服务层纯函数**（扩展）：新增 `ai.ts`、`lsp.ts`、`secureStore.ts`、`settingsPersist.ts`
- **WebView 桥接**（扩展）：Monaco 内部新增 `monaco-languageclient`，通过 WebSocket 连接 LSP 网关
- **远程优先的重计算**（新增）：iOS 沙盒无进程执行能力，LSP/Agent 均在远程运行；iPad 作为高质量控制与编辑前端

### 三大支柱定位

```
支柱一：设置持久化（地基）
  → expo-secure-store（Keychain）存密钥
  → settings.json 存偏好
  → 解决 v0.1 重启即丢的最大痛点，同时是支柱二/三的前提

支柱二：远程 LSP 网关
  → Monaco WebView 内 monaco-languageclient
  → WebSocket → LSP 网关（用户自建/托管）
  → 网关侧运行 jdtls / tsserver / pyright
  → Java 达到 VS Code 标准补全

支柱三：AI Coding 混合架构
  ├── 内联补全（ghost text）
  │     → 设备端直连模型 API（FIM）
  │     → 延迟敏感，不经过 Bridge
  └── 对话式 plan-execute
        → ChatPanel → Bridge WebSocket
        → 远程真实 agent 环境（Claude Code / Codex / GLM）
        → DiffReviewPanel → 用户确认 → expo-file-system 写盘
```

---

## 2. 系统架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                          iPad（RN 进程）                             │
│                                                                     │
│  用户输入（触摸 / 硬件键盘）                                           │
│          │                                                          │
│          ▼                                                          │
│  React Native 组件层                                                 │
│  ┌──────────────┬────────────────┬─────────────────────────────┐   │
│  │ SidebarPanel │  EditorScreen  │   新增组件                   │   │
│  │ FileTreeView │  EditorTabs    │   ├── ChatPanel              │   │
│  │ GitPanel     │  MonacoEditor  │   ├── DiffReviewPanel        │   │
│  │ SearchPanel  │  StatusBar     │   └── ConflictView           │   │
│  │ SettingsPanel│                │                              │   │
│  └──────┬───────┴───────┬────────┴──────────────┬──────────────┘   │
│         │               │                        │                  │
│         ▼               ▼                        ▼                  │
│  Zustand EditorStore（单一状态源）                                    │
│  [v0.1 状态] + recentWorkspaces + aiConfig +                        │
│  bridgeStatus + lspStatus + inlineCompletion +                      │
│  chatSession + conflictFiles                                        │
│         │               │                        │                  │
│         ▼               ▼                        ▼                  │
│  服务层（纯函数）                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ fileSystem.ts  git.ts  github.ts  （v0.1 不变）               │  │
│  │ secureStore.ts  settingsPersist.ts  （新增·设置持久化）        │  │
│  │ ai.ts   （新增·Provider 适配器 + Bridge WS 管理）              │  │
│  │ lsp.ts  （新增·LSP 网关连接管理，RN 侧）                       │  │
│  └────────────────────┬────────────────────┬─────────────────────┘  │
│                       │                    │                        │
│          ┌────────────┘                    └──────────────┐         │
│          ▼                                                ▼         │
│  expo-file-system                              WebView（Monaco）     │
│  （所有写盘唯一入口）                            │                    │
│          │                                    ├── postMessage 通信   │
│  Documents/workspaces/                        │   （v0.1 不变）      │
│  settings.json                                └── monaco-language-  │
│                                                   client（新增）     │
│                                                   │                 │
└───────────────────────────────────────────────────┼─────────────────┘
                                                    │ WebSocket / HTTPS
            ┌───────────────────────────────────────┤
            │                                       │
            ▼                                       ▼
  ┌─────────────────────┐               ┌───────────────────────┐
  │   远程 LSP 网关      │               │   模型 API（HTTPS）    │
  │   jdtls / tsserver  │               │   Claude / OpenAI / GLM│
  │   pyright           │               │   （内联补全 FIM）      │
  └─────────────────────┘               └───────────────────────┘

            ▼（独立 WebSocket）
  ┌─────────────────────┐
  │   远程 Bridge        │
  │   Claude Code /     │
  │   Codex / GLM Agent │
  │   （plan-execute）   │
  └─────────────────────┘
```

---

## 3. 模块依赖关系图

```
app/index.tsx
  └── SidebarPanel
        ├── FileTreeView         → fileSystem.ts
        ├── GitPanel             → git.ts
        │     ├── GitDiffView    → git.ts, fileSystem.ts
        │     ├── GitHistoryView → git.ts
        │     └── ConflictView   → git.ts, fileSystem.ts   [新增]
        ├── SearchPanel          → fileSystem.ts
        └── SettingsPanel        → secureStore.ts, settingsPersist.ts,
                                   git.ts, fileSystem.ts

EditorScreen
  ├── EditorTabs               → editorStore
  ├── MonacoEditor             → monacoHtml.ts（WebView）
  │     └── [WebView 内部]
  │           ├── monaco-languageclient  → lsp.ts（RN 侧协调）
  │           └── inlineCompletion.js    → ai.ts（通过 postMessage）
  └── StatusBar                → editorStore（含 lspStatus, bridgeStatus）

ChatPanel                      → ai.ts（Bridge WS）, editorStore  [新增]
  └── DiffReviewPanel          → fileSystem.ts, git.ts             [新增]

editorStore（Zustand）         ← 所有组件读写

── 服务层 ──────────────────────────────────────────────────────────────
git.ts                         → fsAdapter.ts → expo-file-system
fileSystem.ts                  → expo-file-system
github.ts                      → @octokit/rest → HTTPS
secureStore.ts                 → expo-secure-store（Keychain）        [新增]
settingsPersist.ts             → fileSystem.ts（settings.json 读写）  [新增]
ai.ts                          → HTTPS（内联补全 API）                [新增]
                               → WebSocket（Bridge 连接）
lsp.ts                         → WebSocket（LSP 网关连接，RN 侧状态管理）[新增]
                               → monacoHtml.ts（传递网关地址给 WebView）
```

---

## 4. 状态数据结构

```typescript
// src/store/editorStore.ts  —  v0.2 完整快照

// ── v0.1 保留字段（不变）──────────────────────────────────────────────
EditorStore {
  tabs: EditorTab[]           // { id, path, name, content, isDirty, language }
  activeTabId: string | null

  fileTree: FileNode[]        // { name, path, type, children?, gitStatus? }
  currentWorkspace: string | null   // 绝对路径

  gitStatus: GitStatus        // { staged[], unstaged[], untracked[] }
  activeBranch: string
  conflictFiles: string[]     // v0.2 新增：pull 产生冲突的文件路径列表

  sidebarPanel: 'files' | 'git' | 'search' | 'settings' | 'chat'  // 新增 'chat'
  sidebarVisible: boolean

  theme: 'vs-dark' | 'vs-light' | 'hc-black'
  fontSize: number            // 10-24

  // v0.1 gitSettings 中的 token 字段在 v0.2 迁移到 Keychain
  // 内存中不再持有 token；secureStore.ts 按需读取
  gitSettings: {
    authorName: string
    authorEmail: string
    // token: 已移除，改用 secureStore.getGithubToken()
  }

  // ── v0.2 新增字段 ────────────────────────────────────────────────
  recentWorkspaces: string[]      // 最多 10 个绝对路径，按最近访问排序

  aiConfig: {
    provider: 'claude' | 'openai' | 'glm'
    completionModel: string       // 内联补全模型，如 'claude-haiku-4-5'
    chatModel: string             // 对话模型，如 'claude-sonnet-4-6'
    bridgeEndpoint: string        // wss://...  远程 Bridge 地址
    lspGatewayUrl: string         // wss://...  LSP 网关地址
    enableInlineCompletion: boolean
    enableChat: boolean
    dataConsentGiven: boolean     // 用户明确同意代码外发
  }

  bridgeStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  lspStatus: 'disconnected' | 'connecting' | 'indexing' | 'ready' | 'error'

  inlineCompletion: {
    pending: boolean
    suggestion: string | null
    triggerOffset: number | null  // 触发补全时的光标偏移量
  }

  chatSession: {
    messages: ChatMessage[]
    pendingPlan: DiffPlan | null  // 等待用户确认的 plan
    isExecuting: boolean          // Bridge 正在执行落盘
  }
}

// ── 新增类型 ──────────────────────────────────────────────────────────

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

type DiffPlan = {
  description: string
  diffs: Array<{
    file: string                  // 相对于 workspace 的路径
    action: 'create' | 'modify' | 'delete'
    before: string                // 修改前内容（delete/modify 时有效）
    after: string                 // 修改后内容（create/modify 时有效）
    unified: string               // unified diff 字符串，供 DiffReviewPanel 渲染
  }>
}
```

---

## 5. 数据流一：启动与设置恢复

```
应用启动（App mount）
        │
        ▼
app/index.tsx → initializeApp()
        │
        ├── [并行] secureStore.getGithubToken()     → Keychain
        ├── [并行] secureStore.getAIKeys()          → Keychain
        ├── [并行] settingsPersist.loadSettings()   → settings.json
        │           → 解析 authorName, authorEmail, theme, fontSize,
        │             aiConfig（不含密钥）, recentWorkspaces
        │
        ▼
editorStore.hydrateFromPersisted(settings, keys)
        │
        ├── 设置 gitSettings.authorName/Email
        ├── 设置 aiConfig（含 bridgeEndpoint, lspGatewayUrl）
        ├── 设置 recentWorkspaces
        │   （密钥保留在 secureStore，不写入 Zustand 内存）
        │
        ▼
SidebarPanel 渲染「最近工作区」列表
        │
        ├── 若 recentWorkspaces[0] 存在 → 展示一键重开按钮
        │
        ▼
用户点击重开 / 选择工作区
        │
        ├── fileSystem.loadWorkspace(path)          → expo-file-system
        ├── git.getCurrentBranch(path)              → isomorphic-git
        ├── git.getStatus(path)                     → isomorphic-git
        │
        ▼
editorStore 更新: currentWorkspace, fileTree, activeBranch, gitStatus
        │
        ▼
[若 aiConfig.lspGatewayUrl 非空 && aiConfig.enableChat]
  lsp.connect(lspGatewayUrl)                       → WebSocket
  bridgeStatus → 'connecting'

[若 aiConfig.bridgeEndpoint 非空 && aiConfig.enableChat]
  ai.connectBridge(bridgeEndpoint)                 → WebSocket
  lspStatus → 'connecting' → 'indexing' → 'ready'
```

---

## 6. 数据流二：内联补全（ghost text）

```
用户在 Monaco 中输入字符
        │
        ▼
Monaco WebView: onDidChangeModelContent 触发
        │
        ├── [检查] aiConfig.enableInlineCompletion === true
        ├── [检查] aiConfig.dataConsentGiven === true
        │
        ▼
debounce(300ms)
        │
        ├── 若 debounce 期间有新输入 → 取消上次，重新计时
        │
        ▼
inlineCompletion.abort()    // 取消任何未完成的上次请求
        │
        ▼
postMessage({ type: 'completionRequest', prefix, suffix, language, offset })
        │
        ▼ （RN 侧 MonacoEditor.onMessage 收到）
        │
ai.requestCompletion({ prefix, suffix, language, model: aiConfig.completionModel })
        │
        ├── 构造 FIM prompt（格式依 provider 而定）
        │   Claude:  Human: <prefix>[FIM]<suffix>\nAssistant:
        │   OpenAI:  { prompt: prefix, suffix: suffix }（/v1/completions）
        │   GLM:     厂商 FIM 端点（spec/modules/07_ai.md 定义）
        │
        ├── [若请求期间用户继续输入]
        │   → AbortController.abort()
        │   → inlineCompletion.pending = false
        │   → 流程终止（不向 Monaco 回传任何内容）
        │
        ▼
API 返回 suggestion 字符串
        │
        ├── [检查] triggerOffset === 当前光标偏移   // 防止过期建议
        │   若不匹配 → 丢弃，流程终止
        │
        ▼
editorStore.setInlineCompletion({ pending: false, suggestion, triggerOffset })
postMessage({ type: 'showGhostText', suggestion })
        │
        ▼
Monaco WebView 渲染 ghost text（灰色装饰）
        │
        ├── 用户按 Tab → postMessage({ type: 'acceptCompletion' })
        │     → Monaco: editor.executeEdits()  插入 suggestion
        │     → editorStore.clearInlineCompletion()
        │     → editorStore.markTabDirty(activeTabId)
        │
        └── 用户继续输入 / 按 Esc → ghost text 清除
              → editorStore.clearInlineCompletion()
```

---

## 7. 数据流三：对话式 plan-execute

```
用户在 ChatPanel 输入消息（含可选选区/文件上下文）
        │
        ├── [检查] aiConfig.dataConsentGiven === true
        ├── [检查] bridgeStatus === 'connected'
        │   若未连接 → 提示"Bridge 未连接，请先配置"，流程终止
        │
        ▼
chatSession.messages.push({ role: 'user', content, timestamp })
        │
        ▼
ai.sendToBridge({
  message,
  context: {
    currentFile: activeTab.path,
    selection: activeTab.selectedText,    // 可选
    workspaceStructure: fileTree,         // 摘要
  }
})
        │
        ▼ （Bridge WebSocket，JSON 流式消息）
        │
        ├── Bridge 返回 { type: 'thinking', content }
        │     → ChatPanel 展示 streaming 思考过程
        │
        ├── Bridge 返回 { type: 'plan', diffPlan: DiffPlan }
        │     → chatSession.pendingPlan = diffPlan
        │     → ChatPanel 唤起 DiffReviewPanel
        │
        ▼
DiffReviewPanel 展示
  ├── 描述：diffPlan.description
  └── 逐文件 diff（复用 Monaco diff editor / GitDiffView）
        ├── action: 'create'  → 显示完整新文件（绿色）
        ├── action: 'modify'  → 显示 unified diff
        └── action: 'delete'  → 显示完整原文件（红色）

        用户操作：
        ├── [逐文件] 接受 / 拒绝  → 从 pendingPlan.diffs 中标记
        │
        ├── [全部拒绝 / 关闭]
        │     → chatSession.pendingPlan = null
        │     → 流程终止（不写盘）
        │
        └── [确认执行]
              │
              ▼
      chatSession.isExecuting = true
              │
      [串行遍历 pendingPlan.diffs（已接受的）]
              │
              ├── action='create' / 'modify'
              │     → fileSystem.writeFile(absolutePath, diff.after)
              │         [expo-file-system]
              │
              └── action='delete'
                    → fileSystem.deleteFile(absolutePath)
                        [expo-file-system]
              │
              ▼
      [写盘完成]
      chatSession.isExecuting = false
      chatSession.pendingPlan = null
              │
              ▼
      ── 写盘后一致性刷新（不变量 §5）──────────────────
      git.getStatus(currentWorkspace)   → setGitStatus()
      fileSystem.loadFileTree(...)      → setFileTree()
      [受影响标签] readFile(path)       → updateTabContent()
      ──────────────────────────────────────────────────
```

---

## 8. 数据流四：LSP 初始化与补全

```
工作区加载完成 && lspGatewayUrl 已配置
        │
        ▼
lsp.connect(lspGatewayUrl)                // src/services/lsp.ts
        │
        ├── 建立 WebSocket 连接
        ├── lspStatus → 'connecting'
        │
        ▼
连接成功
        │
lsp.sendToMonaco({ type: 'lspReady', gatewayUrl: lspGatewayUrl })
        │      （通过 postMessage 传入 WebView）
        ▼
Monaco WebView 内部（monacoHtml.ts 注入的脚本）
        │
monaco-languageclient.MonacoLanguageClient.create({
  serverOptions: {
    $type: 'WebSocket',
    url: gatewayUrl,
  },
  clientOptions: {
    documentSelector: ['java', 'typescript', 'python'],
  }
})
        │
        ├── WebView 直接建立 WS 到 LSP 网关（旁路 RN 层）
        │
        ▼
LSP 网关侧
        ├── 收到 initialize 请求
        ├── lspStatus → 'indexing'（网关回传 notification）
        ├── 启动/复用 jdtls 进程，索引工作区
        │   （首次冷启 < 15s，后续复用 warm 实例）
        ├── 索引完成 → 回传 initialized
        └── lspStatus → 'ready'

Monaco WebView 内补全触发（用户输入 . 或 Ctrl+Space）
        │
        ▼
monaco-languageclient → textDocument/completion → LSP 网关 → jdtls
        │                 （通过 WebView 内的 WebSocket，P50 < 500ms）
        ▼
jdtls 返回 CompletionList
        │
        ▼
Monaco 渲染下拉补全菜单

LSP 不可用时降级路径：
        ├── WebSocket 连接失败 → lspStatus = 'error'
        ├── lsp.ts 通知 Zustand → StatusBar 展示"LSP 离线"
        └── Monaco 回退到内置智能感知（本地词法补全）
            → 编辑器仍可用（不变量 §4）
```

---

## 9. 新增服务接口规范

### 9.1 `src/services/secureStore.ts`

```typescript
// expo-secure-store 封装，所有密钥的唯一读写入口
// 键名常量集中定义，避免散落代码库

export const SecureKeys = {
  GITHUB_TOKEN:    'github_token',
  CLAUDE_API_KEY:  'claude_api_key',
  OPENAI_API_KEY:  'openai_api_key',
  GLM_API_KEY:     'glm_api_key',
  BRIDGE_TOKEN:    'bridge_token',
  LSP_GATEWAY_KEY: 'lsp_gateway_key',
} as const

export async function setSecret(key: keyof typeof SecureKeys, value: string): Promise<void>
export async function getSecret(key: keyof typeof SecureKeys): Promise<string | null>
export async function deleteSecret(key: keyof typeof SecureKeys): Promise<void>

// 禁止：任何密钥值不得出现在 console.log / Error.message / Sentry 上报
```

### 9.2 `src/services/settingsPersist.ts`

```typescript
// settings.json 读写，仅存非敏感偏好
// 文件路径：{DocumentDirectory}/settings.json

type PersistedSettings = {
  authorName: string
  authorEmail: string
  theme: 'vs-dark' | 'vs-light' | 'hc-black'
  fontSize: number
  recentWorkspaces: string[]          // 最多 10 条
  aiConfig: Omit<AIConfig, never>     // 含 provider/endpoint/模型名，不含 key
  // 注意：aiConfig 中 bridgeEndpoint / lspGatewayUrl 是 URL，不是凭证，可落磁盘
}

export async function loadSettings(): Promise<PersistedSettings>
export async function saveSettings(partial: Partial<PersistedSettings>): Promise<void>
export async function addRecentWorkspace(path: string): Promise<void>
  // 内部：去重、头插、截取前 10 条、调用 saveSettings
```

### 9.3 `src/services/ai.ts`

```typescript
// Provider 适配器（内联补全）+ Bridge WebSocket 管理

// 内联补全（直连模型 API，设备端调用）
export async function requestCompletion(params: {
  prefix: string
  suffix: string
  language: string
  model: string
  provider: 'claude' | 'openai' | 'glm'
  signal: AbortSignal               // 调用方持有，输入变化时 abort
}): Promise<string>                 // 返回补全文本

// Bridge WebSocket（对话式 plan-execute）
export function connectBridge(endpoint: string, token: string): void
export function disconnectBridge(): void
export function sendToBridge(payload: BridgeMessage): void
export function onBridgeMessage(handler: (msg: BridgeResponse) => void): () => void  // 返回取消函数

type BridgeMessage = {
  type: 'chat'
  message: string
  context: { currentFile?: string; selection?: string; workspaceStructure?: FileNode[] }
}

type BridgeResponse =
  | { type: 'thinking'; content: string }
  | { type: 'plan'; diffPlan: DiffPlan }
  | { type: 'done' }
  | { type: 'error'; message: string }
```

### 9.4 `src/services/lsp.ts`

```typescript
// LSP 网关连接管理（RN 侧，负责状态同步）
// 实际 LSP 协议通信在 Monaco WebView 内通过 monaco-languageclient 完成
// lsp.ts 仅管理：连接状态上报、网关地址传递给 WebView、重连逻辑

export function connectLSP(gatewayUrl: string): void
  // → postMessage({ type: 'lspConfig', gatewayUrl }) 给 Monaco WebView
  // → editorStore.setLspStatus('connecting')

export function disconnectLSP(): void
  // → postMessage({ type: 'lspDisconnect' })
  // → editorStore.setLspStatus('disconnected')

// WebView 通过 postMessage 上报 LSP 状态变化
// MonacoEditor.onMessage 处理 { type: 'lspStatusChange', status } 并调用：
export function handleLspStatusUpdate(status: LspStatus): void
```

---

## 10. 技术栈变更汇总

| 层次 | v0.1 | v0.2 新增 | 备注 |
|---|---|---|---|
| 存储 | expo-file-system, 内存 token | expo-secure-store（Keychain） | 所有密钥迁移 |
| AI（内联） | — | HTTPS → Claude/OpenAI/GLM API | FIM 端点 |
| AI（对话） | — | WebSocket → 远程 Bridge | 长连接 |
| LSP（RN 侧） | — | lsp.ts + WebSocket 状态管理 | 配合 WebView |
| LSP（WebView 内） | Monaco 内置感知 | monaco-languageclient + WS | monacoHtml.ts 注入 |
| 组件 | v0.1 全套 | ChatPanel, DiffReviewPanel, ConflictView | 新增三组件 |
| 状态 | 15 字段 | +7 字段（见 §4） | Zustand 单存储 |

---

## 11. 核心不变量

以下不变量对所有 AI 助手、工程师、代码生成工具具有强制约束力。违反任一条均视为架构缺陷，须在合并前修正。

**1. 单一文件系统：** 所有写盘操作（含 AI 落盘、LSP 生成、Git 操作）必须通过 `expo-file-system`。`git.ts` 通过 `fsAdapter.ts` 间接使用。禁止使用 LightningFS 或任何绕过 expo-file-system 的文件写入。

**2. 密钥仅入 Keychain：** GitHub Token、AI API Key（Claude/OpenAI/GLM）、Bridge 凭证、LSP 网关凭证，全部只存 `expo-secure-store`（iOS Keychain）。禁止写入 `settings.json`、`console.log`、Error 消息、Sentry 上报、崩溃报告的任何字段。

**3. AI 落盘必经确认：** plan-execute 执行阶段在任何文件写盘（`fileSystem.writeFile` / `fileSystem.deleteFile`）之前，必须通过 `DiffReviewPanel` 展示 diff 并收到用户显式确认操作。禁止 Bridge 消息直接触发写盘（无论 prompt 内容如何）。

**4. 远程不可用不阻塞本地：** Bridge（bridgeStatus='error'）、LSP 网关（lspStatus='error'）、AI API（请求失败）任一不可用时，本地文件编辑、本地 Git 操作（add/commit）、文件树浏览、本地搜索必须照常工作。仅对应增强能力降级，并在 StatusBar 展示清晰提示。

**5. 写盘后刷新一致性：** 任何写盘操作（手动保存、AI 落盘、冲突解决后写盘）完成后，必须顺序执行：① `git.getStatus(dir) → setGitStatus()`，② `fileSystem.loadFileTree() → setFileTree()`，③ 受影响的已打开标签重新读取内容（`readFile → updateTabContent`）。三步均为必须，不得省略。

**6. 补全可中断：** 内联补全请求必须携带 `AbortSignal`，当用户输入新字符时立即 `abort()`。过期的补全结果（`triggerOffset` 与当前光标偏移不匹配）必须丢弃，不得传递给 Monaco。`setInlineCompletion` 调用前必须校验 offset。

**7. 数据外发透明：** 任何将用户代码发送到第三方（内联补全 API、Bridge、LSP 网关）的操作，必须满足：① `aiConfig.dataConsentGiven === true`（用户在设置中已明确同意）；② 设置界面提供可关闭的开关（`enableInlineCompletion`、`enableChat`）；③ 首次使用前展示数据外发告知对话框。任一条件不满足时，对应功能静默禁用。

---

## 12. 性能目标

| 场景 | 目标值 | 测量方式 |
|---|---|---|
| 设置读取（启动） | < 100ms | Keychain + settings.json 并行读取 |
| 内联补全出建议 | P50 < 800ms | 从 debounce 结束到 ghost text 出现 |
| LSP 补全响应 | P50 < 500ms | 从输入触发到下拉菜单出现（网关已 warm） |
| LSP 首次冷启（jdtls） | < 15s | 首次连接到 lspStatus='ready' |
| 对话式首 token | < 3s | 从发送到 ChatPanel 出现第一个字符 |
| DiffReviewPanel 渲染 | < 200ms | 从收到 DiffPlan 到 UI 可交互 |

---

## 13. v0.1 不变量继承关系

| v0.1 不变量 | v0.2 状态 |
|---|---|
| §1 单一文件系统 | 继承并扩展 → v0.2 不变量 §1（新增 AI 落盘场景） |
| §2 标签内容是事实来源 | 继承不变（AI 落盘后通过不变量 §5 刷新标签） |
| §3 变更后必须刷新 Git 状态 | 继承并扩展 → v0.2 不变量 §5（新增文件树 + 标签刷新） |
| §4 检出后必须更新分支 | 继承不变 |
| §5 Token 不得记录 | 扩展为 v0.2 不变量 §2（新增 AI Key / Bridge / LSP 凭证） |

---

## 14. 范围边界（v0.2 明确不做）

- 本地语言运行时（Python / Node / Java 执行）
- 设备端本地 LSP（需 JVM，iOS 不可行）
- 离线对话式 AI（agent 需远程执行环境）
- 离线内联补全（本地小模型推理）
- Bridge / LSP 网关一键部署工具
- App Store 上架
