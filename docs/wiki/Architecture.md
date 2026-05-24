# 架构

## 系统概述

```
┌─────────────────────────────────────────────────────────────────┐
│                        iPad Pro (iOS)                            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  React Native 应用（Expo）                │    │
│  │                                                           │    │
│  │  ┌──────────────┐  ┌────────────────────────────────┐   │    │
│  │  │   侧边栏     │  │           编辑器区域             │   │    │
│  │  │              │  │                                 │   │    │
│  │  │  文件        │  │  ┌──────────────────────────┐  │   │    │
│  │  │  Git         │  │  │  MonacoEditor（WebView）  │  │   │    │
│  │  │  搜索        │  │  │                           │  │   │    │
│  │  │  设置        │  │  │  Monaco Editor 0.45       │  │   │    │
│  │  │              │  │  │  （从 CDN 加载）           │  │   │    │
│  │  └──────────────┘  │  │                           │  │   │    │
│  │                     │  │  ← postMessage 桥接 →    │  │   │    │
│  │  ┌──────────────┐  │  └──────────────────────────┘  │   │    │
│  │  │   状态栏     │  │                                 │   │    │
│  │  └──────────────┘  └────────────────────────────────┘   │    │
│  │                                                           │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │                     终端面板                       │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  │                                                           │    │
│  │  ┌──────────┐  ┌─────────────┐  ┌──────────────────┐   │    │
│  │  │  Zustand │  │ expo-file-  │  │  isomorphic-git   │   │    │
│  │  │   存储   │  │ system      │  │  + fsAdapter      │   │    │
│  │  └──────────┘  └─────────────┘  └──────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                    应用沙盒（Documents/）                         │
│          workspaces/   →   project-a/  project-b/  ...          │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTPS
                     ┌────────▼────────┐
                     │  GitHub / GitLab │
                     │  （isomorphic-git│
                     │   HTTP 传输）    │
                     └─────────────────┘
```

---

## 层级映射

### 1. 展示层
| 组件 | 文件 | 职责 |
|---|---|---|
| MainLayout | `app/index.tsx` | 根布局、快速打开模态框、侧边栏/终端切换 |
| SidebarPanel | `src/components/Sidebar/SidebarPanel.tsx` | 活动栏 + 面板切换 |
| EditorScreen | `src/screens/EditorScreen.tsx` | 标签栏 + Monaco 容器 + 键盘路由 |
| MonacoEditor | `src/components/Editor/MonacoEditor.tsx` | WebView 包装器、postMessage 桥接 |
| GitPanel | `src/components/Git/GitPanel.tsx` | 暂存/提交/推送/拉取，子视图 |
| GitDiffView | `src/components/Git/GitDiffView.tsx` | HEAD 与工作区差异（LCS 算法） |
| GitHistoryView | `src/components/Git/GitHistoryView.tsx` | 提交日志时间线 |
| SearchPanel | `src/components/Search/SearchPanel.tsx` | 工作区全文搜索 |
| SettingsPanel | `src/components/Settings/SettingsPanel.tsx` | Git 配置、主题、字体、克隆 |
| TerminalView | `src/components/Terminal/TerminalView.tsx` | 带 Git 命令的内置终端 |
| StatusBar | `src/components/StatusBar.tsx` | 分支、光标、语言、编码 |

### 2. 状态层（Zustand）
```
EditorStore {
  tabs[]          — 带内容和脏标记的打开编辑器标签
  activeTabId     — 当前聚焦的标签
  fileTree[]      — 当前工作区目录树
  currentWorkspace — 活跃工作区绝对路径
  gitStatus       — { staged[], unstaged[], untracked[] }
  activeBranch    — 当前分支名（字符串）
  sidebarPanel    — 当前显示的侧边栏标签
  sidebarVisible  — 布尔值
  theme           — 'vs-dark' | 'vs-light' | 'hc-black'
  fontSize        — 编辑器字体大小（数字）
  gitSettings     — { authorName, authorEmail, token }
}
```

### 3. 服务层
| 服务 | 文件 | 主要 API |
|---|---|---|
| FileSystem | `src/services/fileSystem.ts` | readFile、writeFile、readDirectory、createWorkspace |
| FsAdapter | `src/services/fsAdapter.ts` | isomorphic-git 使用的 POSIX fs.promises |
| Git | `src/services/git.ts` | status、stage、commit、push、pull、diff、log、branch |
| GitHub | `src/services/github.ts` | Octokit REST（列出仓库、获取/更新文件内容） |

---

## Monaco ↔ React Native 桥接

所有通信通过 WebView `postMessage` 进行，协议为 JSON 编码。

### RN → Monaco（命令）

| 消息 | 数据 | 效果 |
|---|---|---|
| `init` | `{ value, language, theme, fontSize }` | 编辑器完整初始化 |
| `setValue` | `{ value: string }` | 替换编辑器内容 |
| `setLanguage` | `{ language: string }` | 更改语法模式 |
| `setTheme` | `{ theme: string }` | 切换主题 |
| `setFontSize` | `{ size: number }` | 更新字体大小 |
| `format` | — | 执行格式化文档操作 |
| `find` | — | 打开查找组件 |
| `undo` / `redo` | — | 触发历史命令 |
| `focus` | — | 聚焦编辑器 |
| `showDiff` | `{ original, modified, language }` | 切换到差异编辑器模式 |
| `hideDiff` | — | 返回编辑模式 |
| `revealLine` | `{ line: number }` | 滚动到指定行 |

### Monaco → RN（事件）

| 消息 | 数据 | 含义 |
|---|---|---|
| `ready` | — | 编辑器初始化完成，发送 `init` |
| `change` | `{ value: string }` | 内容已更改 |
| `cursor` | `{ line, column }` | 光标移动 |
| `save` | — | ⌘S 已按下 |
| `quickOpen` | — | ⌘P 已按下 |
| `commandPalette` | — | ⌘⇧P 已按下 |
| `toggleSidebar` | — | ⌘B 已按下 |
| `toggleTerminal` | — | ⌘\` 已按下 |

---

## 文件系统架构

```
expo-file-system（设备 FS）
        │
        ├── documentDirectory/workspaces/
        │       ├── project-a/          ← 工作区根目录
        │       │     ├── .git/         ← 由 isomorphic-git 管理
        │       │     ├── src/
        │       │     └── ...
        │       └── project-b/
        │
        └── （其他 Expo 应用存储）

fsAdapter（src/services/fsAdapter.ts）
  将 expo-file-system 封装为 POSIX fs.promises 接口
  使 isomorphic-git 可以操作编辑器读写的同一设备文件
```

**关键不变量：** 编辑器（`fileSystem.ts`）和 Git 引擎（`git.ts`）必须使用相同的底层存储。`fsAdapter.ts` 是实现这一点的桥梁。

---

## 关键设计决策

### D1：Monaco 通过 WebView（而非原生）
Monaco 没有 React Native 移植版。WebView 桥接增加了约 10-30ms 的内容同步延迟，但提供了完整的 Monaco 能力，包括 IntelliSense、差异编辑器和 50+ 种语言语法。

### D2：内联 HTML 而非打包资源
使用 `source={{ html: MONACO_HTML }}` 在 iOS 和 Android 上均可工作，无需平台特定的资源路径。权衡：Monaco 仍从 CDN 加载（需要网络）；离线支持列为待办事项。

### D3：expo-file-system 作为单一文件系统
通过 `fsAdapter` 统一文件系统，确保 Git 对象和工作文件共存于同一目录树中。之前的架构（LightningFS + expo-fs）是完全分离的——Git 无法感知已编辑的文件。

### D4：isomorphic-git 而非原生 libgit2
isomorphic-git 运行在纯 JS 中——无需原生模块，可在任何 Expo 托管工作流构建中运行。限制：无 SSH 传输（仅 HTTP/HTTPS，Token 鉴权）。

### D5：Zustand 而非 Redux
单一扁平存储，操作与状态并置。无中间件复杂度。对当前应用规模足够；如存储超过约 15 个切片则重新评估。
