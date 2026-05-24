# 技术规格说明：兼容性

| 文档 | 兼容性 |
|---|---|
| 版本 | 0.1 |
| 日期 | 2026-05-25 |

---

## 主要目标平台

| 设备 | 系统 | 优先级 |
|---|---|---|
| iPad Pro 12.9"（M1/M2/M4） | iPadOS 17+ | P0 — 主要开发目标 |
| iPad Pro 11"（M1/M2/M4） | iPadOS 17+ | P0 — 同一代码，较小屏幕 |
| iPad Air 5/6（M1/M2） | iPadOS 17+ | P1 — 相近硬件 |
| iPad（第 10 代） | iPadOS 17+ | P2 — 内存较少，屏幕较小 |
| iPhone | iOS 17+ | P3 — 布局未针对优化 |
| Android 平板 | Android 13+ | P3 — Expo 技术上支持 |
| Web（浏览器） | Chrome/Safari | P3 — Expo Web 构建 |

---

## 最低系统版本

**iPadOS 16.0**（Expo SDK 51 最低要求）。

已在 iPadOS 17 上测试。iPadOS 16 应可运行，但在 v0.1 中不作为定期测试目标。

---

## 硬件键盘兼容性

键盘快捷键（⌘S、⌘P 等）需要硬件键盘。

| 键盘 | 兼容性 |
|---|---|
| 妙控键盘（USB-C） | ✅ 主要测试目标 |
| 智能键盘连接器 | ✅ 预期可用 |
| 第三方蓝牙键盘（标准 HID） | ✅ 预期可用 |
| 屏幕软键盘 | ⚠️ 无键盘快捷键；仅触摸操作 |

当 WebView 聚焦时，Monaco 接收硬件键盘事件。`editor.addCommand()` API 使用 Monaco 的键位绑定系统，映射到实际按键事件。

### 非 Apple 键盘上的 ⌘ 键
第三方键盘可能没有 Cmd 键。iOS 会将第三方键盘上的 Ctrl 键映射为许多快捷键中的 Cmd 键。建议在待办事项中使用非 Apple 键盘进行测试。

---

## 屏幕尺寸与布局

| iPad 型号 | 屏幕分辨率 | 侧边栏宽度 | 终端高度 | 备注 |
|---|---|---|---|---|
| 12.9" | 2732×2048 | 300px | 240px | 舒适 |
| 11" | 2388×1668 | 300px | 240px | 侧边栏略显紧凑 |
| Air 11" | 2360×1640 | 300px | 240px | 与 11" Pro 相近 |

**v0.1 限制：** 所有尺寸均为 `app/index.tsx` 中的硬编码常量。可调整面板尺寸列为待办事项。

---

## 多任务（iPadOS 分屏 / 浮动窗口）

| 模式 | 状态 | 备注 |
|---|---|---|
| 全屏 | ✅ | 主要使用模式 |
| 分屏（50/50） | ⚠️ | 布局可用但侧边栏可能过宽 |
| 分屏（33%） | ⚠️ | 非常紧凑；隐藏侧边栏有帮助 |
| 浮动窗口 | ⚠️ | 极窄；未经测试 |

**待办事项：** 检测窗口尺寸变化，当窗口宽度 < 600px 时自动隐藏侧边栏。

---

## WebView 兼容性

**iOS：** 使用 WKWebView。Monaco 0.45 已测试并可正常运行。

**Android：** 使用基于 Chromium 的 Android WebView。内联 HTML 方案在两个平台上均有效——这是 v0.1 的关键修复。

**Monaco CDN 版本：** 0.45.0（已固定）。不要在未测试的情况下升级——Monaco 次要版本之间存在破坏性变更。

---

## Expo SDK 兼容性

| Expo SDK | 状态 |
|---|---|
| 51（当前） | ✅ 目标版本 |
| 52+ | ⚠️ 未测试；准备好后升级 |
| < 50 | ❌ 不支持 |

关键原生模块及其版本：
```json
"expo-file-system": "~17.0.0"    ← 关键；主版本之间 API 有变化
"expo-router": "~3.5.0"
"react-native-webview": "13.8.6"  ← 已固定；更新版本可能改变 postMessage 行为
"isomorphic-git": "^1.27.0"      ← 补丁级更新安全；次要版本可能改变行为
```

---

## iOS 权限

在 `app.json` → `ios.infoPlist` 中声明：

```json
"UIFileSharingEnabled": true,
"LSSupportsOpeningDocumentsInPlace": true
```

这些权限启用：
- 通过文件 App 共享应用的 Documents 文件夹
- 从文件 App 直接在应用中打开文件

**待办事项补充：** 如果添加图片导入功能，需要 `NSPhotoLibraryUsageDescription`。

---

## isomorphic-git HTTPS 兼容性

| Git 托管平台 | 认证方式 | 状态 |
|---|---|---|
| GitHub | PAT（username=token，password=''） | ✅ 已测试 |
| GitHub Enterprise | PAT（相同方案） | ⚠️ 应可用；未测试 |
| GitLab.com | PAT（相同方案） | ⚠️ 应可用；未测试 |
| Bitbucket | 应用密码 | ⚠️ 应可用；未测试 |
| 自托管 Gitea | Basic Auth | ⚠️ 应可用；未测试 |
| SSH 远程仓库 | — | ❌ isomorphic-git 仅支持 HTTP |

**CORS 代理要求：** 所有 Git HTTP 操作通过 `cors.isomorphic-git.org` 路由，因为 Git 协议响应不包含 CORS 头。这是浏览器/WebView 执行上下文的固有限制，在不使用原生 Git 模块的情况下无法避免。

---

## 语言支持矩阵

Monaco 支持的语言（语法高亮 + 基础 IntelliSense）：

| 支持等级 | 语言 |
|---|---|
| **优秀**（Monaco 内置丰富支持） | TypeScript、JavaScript、JSON、CSS、HTML |
| **良好**（仅语法高亮） | Python、Go、Rust、Java、C/C++、C#、Swift、Kotlin、PHP、Ruby、Dart |
| **基础** | Markdown、YAML、XML、SQL、Shell、Scala、R |
| **纯文本** | 所有其他扩展名 |

---

## 离线能力（v0.1 限制）

| 功能 | 离线可用 | 备注 |
|---|---|---|
| 文件编辑 | ✅ | 无需网络 |
| 文件树 | ✅ | |
| Monaco 编辑器 | ❌ | 需要 CDN |
| Git 状态/暂存/提交 | ✅ | 纯本地操作 |
| Git 推送/拉取 | ❌ | 需要网络 |
| 克隆 | ❌ | 需要网络 |

**v0.3 目标：** 本地打包 Monaco → 完整离线编辑能力。
