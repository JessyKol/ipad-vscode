# iPad VSCode — 项目 Wiki

> 基于 React Native（Expo）和 Monaco 编辑器构建的 iPad Pro 全功能代码编辑器。

---

## 快速链接

| | |
|---|---|
| [架构](Architecture) | 系统设计、模块图、数据流 |
| [开发指南](Development-Guide) | 环境配置、构建、运行、贡献 |
| [功能状态](Feature-Status) | 已实现功能与计划功能 |
| [路线图](Roadmap) | 版本里程碑与优先级 |
| [API 与协议](API-and-Protocols) | WebView 桥接消息规格、FS 适配器契约 |

---

## 这是什么？

iPad VSCode 是一款原生 iPad 应用，将类似 VS Code 的编码体验带到 iPadOS。完全在设备本地运行——无需云端 IDE 订阅。

**核心原则：** 在 iPadOS 约束条件下，尽可能贴合 VS Code 的操作习惯。

### 核心技术

| 层级 | 技术 |
|---|---|
| 应用框架 | Expo SDK 51（React Native） |
| 编辑器 | Monaco Editor 0.45（通过 WebView） |
| 文件系统 | expo-file-system |
| Git 引擎 | isomorphic-git 1.27 |
| 状态管理 | Zustand 4 |
| 路由 | Expo Router 3 |
| 开发语言 | TypeScript 5 |

### iPad 特有限制

| 限制 | 我们的解决方案 |
|---|---|
| 无进程执行能力（iOS 沙盒） | 内置终端命令 + 通过 isomorphic-git 执行 Git |
| Monaco 需要 WebView | 通过 postMessage 协议的内联 HTML 桥接 |
| 无原生符号链接 | fsAdapter 抛出 ENOSYS；isomorphic-git 优雅处理 |
| GitHub 鉴权（暂无系统 Keychain） | Token 存储在 Zustand（内存中）；iOS Keychain（expo-secure-store）列为待办事项 |
| Monaco 依赖 CDN | 内联 HTML 从 cdnjs 加载 Monaco；离线打包列为待办事项 |

---

## 项目目录结构

```
ipad-vscode/
├── app/                    Expo Router 入口点
│   ├── _layout.tsx         根布局（SafeAreaProvider、StatusBar）
│   └── index.tsx           主布局（侧边栏 + 编辑器 + 终端）
├── src/
│   ├── assets/             编译进 JS 的静态资源
│   │   └── monacoHtml.ts   Monaco 编辑器 HTML 内联字符串
│   ├── components/
│   │   ├── Editor/         MonacoEditor、EditorTabs
│   │   ├── FileTree/       FileTreeView
│   │   ├── Git/            GitPanel、GitDiffView、GitHistoryView
│   │   ├── Search/         SearchPanel
│   │   ├── Settings/       SettingsPanel
│   │   ├── Sidebar/        SidebarPanel（活动栏 + 面板容器）
│   │   ├── StatusBar.tsx
│   │   └── Terminal/       TerminalView
│   ├── screens/
│   │   └── EditorScreen.tsx
│   ├── services/
│   │   ├── fileSystem.ts   expo-file-system 封装
│   │   ├── fsAdapter.ts    expo-fs → isomorphic-git POSIX 适配器
│   │   ├── git.ts          isomorphic-git 操作
│   │   └── github.ts       Octokit REST API 辅助函数
│   ├── store/
│   │   └── editorStore.ts  Zustand 全局状态
│   └── types/
│       └── index.ts
├── docs/
│   ├── wiki/               GitHub Wiki 源文件（同步到 wiki.git）
│   └── requirements/       版本化 PRD 和规格说明
└── scripts/
    └── push-wiki.sh        将 docs/wiki/ 同步到 GitHub Wiki
```

---

## 贡献

环境配置请参阅[开发指南](Development-Guide)。

PRD 和规格文档存放在 `docs/requirements/` 中——添加或修改功能时请更新对应版本的文件夹。
