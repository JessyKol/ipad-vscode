# 技术规格说明：安全性

| 文档 | 安全性 |
|---|---|
| 版本 | 0.1 |
| 日期 | 2026-05-25 |

---

## 威胁模型

iPad VSCode 运行在单用户、设备本地的上下文中。主要威胁：

| 威胁 | 来源 | 风险等级 |
|---|---|---|
| GitHub Token 泄露 | 日志记录、错误信息、JS 包 | 高 |
| 执行被编辑文件中的代码 | 无（不对用户文件执行 eval） | 低 |
| 通过 Monaco WebView 的 XSS | WebView 中渲染的恶意文件内容 | 中 |
| 网络中间人攻击（推送/拉取） | CDN 或 CORS 代理被攻击 | 中 |
| 意外文件写入 | 保存路径错误、竞态条件 | 低 |

---

## GitHub Token 安全性

**v0.1 策略：** Token 仅存储在 Zustand（JavaScript 内存）中。

**安全保证：**
- Token 永远不会写入 `console.log`、`console.error` 或终端中任何可见输出
- Token 永远不会包含在显示给用户的 Alert 信息中
- Token 永远不会存储到磁盘（expo-file-system、AsyncStorage）
- Token 仅通过 HTTPS 传输到 GitHub 服务器

**v0.1 风险：**
- Token 存在于 JS 堆中，如设备被越狱则理论上可被检查
- 应用重启后 Token 丢失（用户必须重新输入）

**待办事项：** 迁移到使用 iOS Keychain 的 `expo-secure-store`：
```typescript
await SecureStore.setItemAsync('github_token', token, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
});
const token = await SecureStore.getItemAsync('github_token');
```

---

## WebView 安全性

Monaco 运行在 WKWebView（iOS）中。内联 HTML 包含 Content Security Policy meta 标签：

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;">
```

**当前 CSP 较宽松** — 因为 Monaco 内部使用动态脚本加载，这是必需的。

**待办事项：** Monaco 本地打包后收紧 CSP：
```
default-src 'none';
script-src 'self' 'unsafe-eval';  ← Monaco 语言 Worker 需要 eval
style-src 'self' 'unsafe-inline';
```

**XSS 风险：** Monaco 编辑器在沙盒 DOM 中渲染文件内容。Monaco 在显示代码时会对 HTML 进行转义，因此文件中注入的 HTML/JS 被视为文本而非执行。

**postMessage 安全性：** WebView 仅接受来自 `window`（我们的 RN 代码）的消息。`originWhitelist={['*']}` 允许内联 HTML 源（`null`）。不存在跨源 iframe，外部来源无法向我们的 WebView 发送消息。

---

## 网络安全

### HTTPS 强制执行
所有远程操作（克隆、推送、拉取）均通过 isomorphic-git 的 HTTP 传输使用 HTTPS。不使用 HTTP 明文传输。

### CORS 代理
```
https://cors.isomorphic-git.org
```

这是 isomorphic-git 项目运营的可信开源 CORS 代理。请求被代理转发到 GitHub 的 Git 服务器。**代理可以看到请求 URL 和请求头，包含 Token 的 Authorization 头。**

**风险：** 如果代理被攻击，Token 可能被截获。

**待办事项缓解措施：** 自行搭建 CORS 代理，或使用用户自己服务器上的代理端点。或者，针对 GitHub 专门使用 Octokit REST API（无需 CORS 代理）进行推送/拉取。

### 证书固定
v0.1 中未实现。iOS 强制执行 ATS（App Transport Security），要求有效的 TLS 证书。这在可信网络上提供了基本的中间人防护。

---

## 文件系统安全性

### 隔离性
应用运行在 iOS 应用沙盒（`Documents/`）中，无法访问沙盒外的文件（无法访问其他应用的数据、`/etc`、系统文件）。

### 写入安全性
`expo-file-system` 的 `writeAsStringAsync` 在 iOS 上是原子操作（使用 NSFileManager 的"先写临时文件再重命名"模式）。写入过程中崩溃，文件要么保留旧版本，要么完整写入新版本，不会出现损坏的部分写入。

### 路径遍历
用户提供的输入（工作区名称、文件名、重命名目标）未对路径遍历攻击（`../../etc/passwd`）进行净化。由于沙盒阻止访问 `Documents/` 外部，在 iOS 上风险较低。尽管如此，待办事项中添加基础路径校验：
```typescript
function sanitizeName(name: string): string {
  return name.replace(/[/\\:*?"<>|.]/g, '_').slice(0, 255);
}
```

---

## 无遥测（v0.1）

v0.1 不收集任何遥测数据、分析数据或崩溃数据。如果在未来版本中添加崩溃报告，必须：
- 采用用户主动选择（opt-in）方式
- 从崩溃报告中排除文件内容和 Token
- 符合适用的隐私法规

---

## 每次发布安全检查清单

- [ ] GitHub Token 在任何日志输出中不可见
- [ ] GitHub Token 未写入磁盘
- [ ] `console.log` 语句不包含 Auth 头或 Token 值
- [ ] 未对用户提供的文件内容执行 `eval()`（Monaco 内部的 eval 不在此列）
- [ ] 所有网络请求使用 HTTPS
- [ ] 使用 `npm audit` 审计新依赖项
