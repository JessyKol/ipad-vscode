# 技术规格说明：兼容性（v0.2 更新）

| 文档 | 兼容性 |
|---|---|
| 版本 | 0.2 |
| 日期 | 2026-06-14 |
| 前置版本 | v0.1 spec/technical/09_compatibility.md |

---

## 1. 设备与系统（继承 v0.1，无变更）

| 设备 | 系统 | 优先级 |
|---|---|---|
| iPad Pro 12.9"（M1/M2/M4） | iPadOS 17+ | P0 |
| iPad Pro 11"（M1/M2/M4） | iPadOS 17+ | P0 |
| iPad Air 5/6（M1/M2） | iPadOS 17+ | P1 |
| iPad（第 10 代） | iPadOS 17+ | P2 |
| iPhone / Android / Web | — | P3 |

最低系统版本：**iPadOS 16.0**（Expo SDK 51 要求），iPadOS 17 为主要测试目标。

---

## 2. 依赖版本（v0.2 新增/变更）

### 继承 v0.1（固定版本，不升级）

```json
"expo-file-system": "~17.0.0"
"expo-router": "~3.5.0"
"react-native-webview": "13.8.6"
"isomorphic-git": "^1.27.0"
```

### v0.2 新增依赖

```json
"expo-secure-store": "~13.0.0"       // Keychain 访问，managed workflow 支持
"monaco-languageclient": "^8.x"       // WebView 内 LSP 客户端（CDN 引入）
"vscode-ws-jsonrpc": "^3.x"           // LSP WebSocket 传输层（CDN 引入）
```

> **Monaco CDN 版本继续固定为 0.45.0**。`monaco-languageclient@8` 与 Monaco 0.45 兼容，升级 Monaco 前须验证。

---

## 3. 新增基础设施依赖（v0.2）

v0.2 新增两类远程服务依赖，iPad 应用为客户端，服务由用户自建。

### LSP 网关

| 需求 | 规格 |
|---|---|
| 传输协议 | WebSocket，**强制 TLS（wss://）** |
| Java（jdtls）| JDK 17+，RAM ≥ 2GB，jdtls 0.23+ |
| TypeScript（tsserver）| Node.js 18+ |
| Python（pyright） | Python 3.9+ 或 Node.js 18+ |
| 路由 | 按 `languageId` 路由到对应语言服务器 |
| 部署方式 | v0.2 提供 Docker 镜像（Dockerfile 随 spec 发布）|

### Bridge（AI plan-execute 远程 agent）

| 需求 | 规格 |
|---|---|
| 传输协议 | WebSocket，**强制 TLS（wss://）** |
| 支持 agent | Claude Code CLI / OpenAI Codex CLI / GLM agent |
| 认证 | Bearer Token（Keychain 存储，header 注入） |
| 消息格式 | JSON（见 spec/modules/07_ai.md §4） |
| 部署方式 | 用户自建，v0.2 不提供官方托管 |

---

## 4. AI Provider API 兼容性

| Provider | 端点 | 内联补全 | 对话 |
|---|---|---|---|
| Claude（Anthropic）| `https://api.anthropic.com/v1/messages` | ✅ 测试通过（claude-haiku-4-5） | ✅ 通过 Bridge |
| OpenAI | `https://api.openai.com/v1/completions` | ✅ gpt-4o-mini（suffix 参数） | ✅ 通过 Bridge |
| GLM（智谱）| `https://open.bigmodel.cn/api/paas/v4/chat/completions` | ✅ glm-4-flash | ✅ 通过 Bridge |

**Provider 切换不影响本地功能**（Git、文件树、设置均不依赖 Provider）。

---

## 5. 网络需求（v0.2 扩展）

v0.1 网络依赖（继续）：
- Monaco CDN：`cdnjs.cloudflare.com`
- Git CORS 代理：`cors.isomorphic-git.org`
- GitHub HTTPS：`github.com`

v0.2 新增网络依赖：
- AI Provider API：`api.anthropic.com` / `api.openai.com` / `open.bigmodel.cn`
- Bridge：用户自定义 `wss://` 端点
- LSP 网关：用户自定义 `wss://` 端点
- monaco-languageclient CDN：`cdn.jsdelivr.net`

**企业网络注意：** 若所在网络对上述域名有限制，AI 和 LSP 功能将不可用，但本地编辑和 Git（私有托管）功能不受影响。

---

## 6. 离线能力（v0.2）

| 功能 | 离线可用 | 备注 |
|---|---|---|
| 文件编辑 | ✅ | |
| 文件树 | ✅ | |
| Monaco 编辑器 | ❌ | CDN 加载（v0.3 本地化） |
| 基础语法补全 | ✅ | Monaco 内置 |
| LSP 补全/诊断/跳转 | ❌ | 需网关连接，离线降级到内置 |
| 内联 AI 补全 | ❌ | 需 API 连接 |
| 对话式 AI（plan-execute）| ❌ | 需 Bridge 连接 |
| Git 状态/暂存/提交 | ✅ | 纯本地操作 |
| Git 推送/拉取/克隆 | ❌ | 需网络 |
| 设置读取 | ✅ | Keychain + settings.json 本地 |

---

## 7. 硬件键盘、多任务、WebView（继承 v0.1）

以下内容与 v0.1 完全一致，见 v0.1 spec/technical/09_compatibility.md：

- 键盘兼容性（妙控键盘、智能键盘、第三方蓝牙 HID）
- 屏幕尺寸与布局（12.9" / 11" / Air 硬编码常量）
- 多任务（分屏支持情况）
- WebView 兼容性（WKWebView，Monaco 0.45 固定）
- iOS 权限（`UIFileSharingEnabled`、`LSSupportsOpeningDocumentsInPlace`）
- isomorphic-git HTTPS 兼容性矩阵（GitHub/GitLab/Bitbucket）

---

## 8. expo-secure-store 兼容性注意

- 需在 `app.json` 中声明 `expo-secure-store` 插件（managed workflow 要求）
- Keychain 在设备重置或 App 卸载后清空（Token 需重新输入）
- `WHEN_UNLOCKED`：设备屏幕锁定时应用后台无法读取 Keychain（是预期行为，不影响前台使用）
- 模拟器上可用（调试时使用），真机行为与模拟器一致
