# 模块规格说明：设置（v0.2 重大更新）

| 模块 | 设置 |
|---|---|
| 相关文件 | `src/components/Settings/SettingsPanel.tsx`、`src/store/editorStore.ts`、`src/services/secureStore.ts`（新增）、`src/services/settingsPersist.ts`（新增） |
| 版本 | 0.2 |
| 前置版本 | v0.1 spec/modules/06_settings.md |

---

## 1. v0.2 变更说明

v0.1 最大痛点：所有设置重启即丢。v0.2 建立完整持久化层：

- **密钥** → `expo-secure-store`（iOS Keychain）
- **偏好** → `settings.json`（Documents 目录）
- **新增配置** → AI Provider（×3）、Bridge 端点、LSP 网关地址、数据外发同意

---

## 2. 持久化架构

```
启动时
  loadSettings()           ← settings.json（偏好，明文可存）
  loadSecrets()            ← expo-secure-store（密钥，Keychain 加密存储）
        │
        ▼
  Zustand 内存状态更新（运行时唯一来源）
        │
用户修改设置时
        ▼
  saveSettings()           ← 写 settings.json（非密钥字段）
  saveSecret(key, value)   ← 写 Keychain（密钥字段）
```

### settings.json 结构（不含任何密钥）

路径：`FileSystem.documentDirectory + 'settings.json'`

```typescript
type PersistedSettings = {
  // Git 作者（非密钥，可明文存储）
  authorName: string
  authorEmail: string

  // 编辑器外观
  theme: 'vs-dark' | 'vs-light' | 'hc-black'
  fontSize: number           // 10-24

  // 工作区历史
  recentWorkspaces: string[] // 最多 10 个绝对路径，最新在前

  // AI 配置（端点等非密钥部分）
  aiProvider: 'claude' | 'openai' | 'glm'
  completionModel: string    // 如 'claude-haiku-4-5'
  chatModel: string          // 如 'claude-sonnet-4-6'
  bridgeEndpoint: string     // wss://...
  lspGatewayUrl: string      // wss://...
  enableInlineCompletion: boolean
  enableChat: boolean
  enableLsp: boolean
  dataConsentGiven: boolean  // 用户确认代码会外发至第三方

  // token 用量追踪
  sessionTokensUsed: { input: number; output: number }
}
```

### Keychain 键名约定

| 密钥 | Keychain key | 类型 |
|---|---|---|
| GitHub PAT | `ipad_vscode_github_token` | string |
| Claude API Key | `ipad_vscode_ai_key_claude` | string |
| OpenAI API Key | `ipad_vscode_ai_key_openai` | string |
| GLM API Key | `ipad_vscode_ai_key_glm` | string |
| Bridge Token | `ipad_vscode_bridge_token` | string |
| LSP 网关 Token | `ipad_vscode_lsp_token` | string |

所有 Keychain 读写通过 `secureStore.ts` 封装，不在任何其他模块直接调用 expo-secure-store。

---

## 3. secureStore.ts API

```typescript
// src/services/secureStore.ts

const KEYCHAIN_OPTIONS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
}

export async function saveSecret(key: string, value: string): Promise<void>
  // await SecureStore.setItemAsync(key, value, KEYCHAIN_OPTIONS)
  // value 为空时删除该条目（await SecureStore.deleteItemAsync(key)）

export async function loadSecret(key: string): Promise<string | null>
  // await SecureStore.getItemAsync(key, KEYCHAIN_OPTIONS)

export async function deleteSecret(key: string): Promise<void>
  // await SecureStore.deleteItemAsync(key)

// 批量加载所有密钥（启动时调用）
export async function loadAllSecrets(): Promise<{
  githubToken: string | null
  aiKeyClaude: string | null
  aiKeyOpenai: string | null
  aiKeyGlm: string | null
  bridgeToken: string | null
  lspToken: string | null
}>
```

---

## 4. settingsPersist.ts API

```typescript
// src/services/settingsPersist.ts

const SETTINGS_PATH = FileSystem.documentDirectory + 'settings.json'

export async function loadSettings(): Promise<Partial<PersistedSettings>>
  // readFile(SETTINGS_PATH) → JSON.parse
  // 文件不存在时返回 {} (首次启动)

export async function saveSettings(settings: Partial<PersistedSettings>): Promise<void>
  // JSON.stringify(settings, null, 2) → writeFile(SETTINGS_PATH, ...)

// 便捷：仅更新部分字段
export async function patchSettings(patch: Partial<PersistedSettings>): Promise<void>
  // loadSettings() → merge → saveSettings()
```

---

## 5. 启动加载序列

```
app/index.tsx 挂载
        │
        ▼
Promise.all([
  settingsPersist.loadSettings(),   // ~20ms
  secureStore.loadAllSecrets(),     // ~50ms（Keychain 解锁）
])
        │
        ▼
initStore(settings, secrets)   [Zustand action]
  → setTheme / setFontSize / setAiConfig（非密钥部分）
  → setRecentWorkspaces
  → gitSettings.token = secrets.githubToken ?? ''
  → aiConfig 内 API key 仅注入内存（不存 Zustand 明文字段，通过 ai.ts 服务层读取 Keychain）
        │
        ▼
显示最近工作区列表（如 recentWorkspaces.length > 0）
或显示"新建 / 克隆"引导
        │
        ▼（异步，不阻塞 UI）
若 enableChat && bridgeEndpoint：initBridge()
若 enableLsp && lspGatewayUrl：initLsp()
```

> **设计原则：** API Key 通过 Keychain 直接传入 `ai.ts` 服务层，**不存入 Zustand**（防止 Redux DevTools / 日志意外泄露）。Zustand 中 aiConfig 只存非密钥配置。

---

## 6. 最近工作区管理

```typescript
// 打开工作区时调用
async function recordWorkspaceOpened(workspacePath: string): Promise<void> {
  const settings = await loadSettings()
  const updated = [
    workspacePath,
    ...(settings.recentWorkspaces ?? []).filter(p => p !== workspacePath)
  ].slice(0, 10)
  await patchSettings({ recentWorkspaces: updated })
  setRecentWorkspaces(updated)  // Zustand
}

// 删除不存在的工作区（启动时清理）
async function pruneRecentWorkspaces(): Promise<void> {
  const settings = await loadSettings()
  const valid = await Promise.all(
    (settings.recentWorkspaces ?? []).map(async p => {
      const info = await FileSystem.getInfoAsync(p)
      return info.exists ? p : null
    })
  )
  await patchSettings({ recentWorkspaces: valid.filter(Boolean) as string[] })
}
```

---

## 7. 设置面板 UI（v0.2 新增分类）

### 原有分类（更新）

**Git 作者**（持久化至 settings.json）
- authorName、authorEmail 输入框
- 修改后立即 patchSettings()

**GitHub Token**（持久化至 Keychain）
- secureTextEntry 输入框（显示圆点）
- 修改后 saveSecret('ipad_vscode_github_token', value)
- 显示"已保存到 Keychain"确认

**主题 / 字体大小**（持久化至 settings.json，效果同 v0.1）

### 新增分类

**AI Provider 配置**
```
Provider 切换：[Claude] [OpenAI] [GLM]

Claude:
  API Key: [● ● ● ● ●              ] [测试连接]
  内联补全模型: [claude-haiku-4-5 ▼]
  对话模型: [claude-sonnet-4-6   ▼]

OpenAI:
  API Key: [● ● ● ● ●              ] [测试连接]
  内联补全模型: [gpt-4o-mini      ▼]
  对话模型: [gpt-4o             ▼]

GLM:
  API Key: [● ● ● ● ●              ] [测试连接]
  内联补全模型: [glm-4-flash      ▼]
  对话模型: [glm-4              ▼]

[✓] 启用内联补全
[✓] 启用对话（需要 Bridge）
```

**Bridge 配置**（AI plan-execute 远程环境）
```
Bridge 端点: [wss://my-server.example.com  ]
Bridge Token: [● ● ● ● ●                   ]
状态: ● 已连接 / ○ 未连接 / ✕ 错误

[测试连接] [断开]
```

**LSP 网关配置**（语言服务器）
```
网关地址: [wss://lsp.example.com          ]
网关 Token: [● ● ● ● ●                    ]
状态: ● 就绪（Java · TS） / ○ 索引中... / ✕ 未连接

[测试连接] [断开]
```

**数据与隐私**
```
[!] 内联补全和对话功能会将代码片段发送至第三方 API。
    发送目标：当前 Provider API 端点、Bridge 服务器。
    不发送至 Anthropic / 本项目收集任何数据。

[✓] 我已了解，同意发送代码到外部 API   ← dataConsentGiven

本会话 token 用量：输入 12,450 / 输出 3,200
```

**工作区管理**（更新）
```
最近工作区:
  • my-project          [打开] [移除]
  • another-project     [打开] [移除]

[克隆仓库...]  [新建工作区...]
```

---

## 8. "测试连接"实现

```typescript
async function testAiConnection(provider: AIProvider, apiKey: string): Promise<'ok' | string> {
  try {
    // 发送一个最小请求验证 Key 有效性
    await provider.requestInlineCompletion({ prefix: 'const x =', suffix: '', language: 'typescript', maxTokens: 5 }, new AbortController().signal)
    return 'ok'
  } catch (e: any) {
    return e.message  // 返回错误信息供 UI 展示
  }
}

async function testBridgeConnection(endpoint: string, token: string): Promise<'ok' | string> {
  // 建立临时 WS，发送 ping，等待 pong（3s 超时）
}

async function testLspConnection(gatewayUrl: string, token: string): Promise<'ok' | string> {
  // 建立临时 WS，发送 initialize（不启动 jdtls），等待响应（5s 超时）
}
```

---

## 9. 数据同意检查不变量

```typescript
// ai.ts 中所有发送代码的入口处
function assertDataConsent(): void {
  if (!editorStore.getState().aiConfig.dataConsentGiven) {
    throw new Error('请先在设置中同意数据外发协议')
  }
}
```

内联补全入口和 plan-execute 入口均调用 `assertDataConsent()`。用户未同意时，功能入口显示为禁用状态并提示"前往设置 → 数据与隐私"。

---

## 10. 已知限制（v0.2）

1. **settings.json 非加密** — 包含 authorName、bridgeEndpoint 等非密钥信息，明文存储，但无密钥内容，可接受。
2. **Keychain 访问在 Expo managed workflow 中需额外配置** — 需在 app.json 中声明 `expo-secure-store` 插件。
3. **无设置导出/导入** — 换设备需重新配置，v0.3 考虑 iCloud 同步。
4. **AI Key 不跨 Provider 共享** — 切换 Provider 时旧 Key 保留（不覆盖），重新配置对应 Key 即可。
5. **模型列表硬编码** — completionModel 下拉选项为预设列表，用户无法输入自定义模型 ID（v0.2 限制，避免校验复杂度）。
