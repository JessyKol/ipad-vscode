# v0.1 规格说明 — 00：系统概述与架构

| 字段 | 内容 |
|---|---|
| 版本 | 0.1 |
| 日期 | 2026-05-25 |
| 状态 | 已实现 |

---

## 1. 架构风格

单页 React Native 应用，具备以下特点：
- **扁平组件树**：无深层嵌套；页面由面板组合而成
- **集中式状态**：Zustand 存储作为唯一数据来源
- **服务层**：纯函数，无类实例（库有要求时除外）
- **WebView 桥接**：Monaco 编辑器运行在沙盒 WebView 中；通信使用 JSON postMessage

```
用户输入（触摸 / 硬件键盘）
        │
        ▼
React Native 组件（读取 Zustand）
        │
        ├─── WebView（Monaco）
        │         ↕ postMessage
        │
        ├─── 服务层（fileSystem、git、github）
        │         │
        │         ▼
        │    expo-file-system（设备存储）
        │         │
        │         ▼
        │    Documents/workspaces/（Git 仓库）
        │
        └─── Zustand 存储（状态变更）
```

---

## 2. 模块依赖关系图

```
app/index.tsx
  └── SidebarPanel
        ├── FileTreeView         → fileSystem.ts
        ├── GitPanel             → git.ts
        │     ├── GitDiffView    → git.ts, fileSystem.ts
        │     └── GitHistoryView → git.ts
        ├── SearchPanel          → fileSystem.ts
        └── SettingsPanel        → git.ts, fileSystem.ts

EditorScreen
  ├── EditorTabs               → editorStore
  ├── MonacoEditor             → monacoHtml.ts（WebView）
  └── StatusBar                → editorStore

TerminalView                   → git.ts, fileSystem.ts, editorStore

editorStore（Zustand）         ← 所有组件读写

git.ts                         → fsAdapter.ts → expo-file-system
fileSystem.ts                  → expo-file-system
github.ts                      → @octokit/rest → HTTPS
```

---

## 3. 技术栈选型理由

### React Native + Expo
- **选择 Expo SDK 的原因：** 托管工作流意味着大多数开发工作无需 Xcode；expo-file-system 和 expo-router 经过充分验证
- **不选裸 RN 的原因：** v0.1 功能集不需要额外的复杂度
- **风险：** Expo SDK 升级可能破坏原生模块；通过固定版本来缓解

### Monaco 编辑器（通过 WebView）
- Monaco 没有 React Native 移植版（需要 DOM 环境）
- WebView 提供完整的浏览器环境
- 内联 HTML 方案（`source={{ html: '...' }}`）跨平台兼容；`file:///android_asset/` 仅限 Android
- postMessage 延迟在 M 系列 iPad 上实测 < 30ms

### isomorphic-git
- 纯 JavaScript Git 实现；无需原生模块
- 可在 React Native / Expo 托管工作流中运行
- 仅支持 HTTP 传输（无 SSH）；v0.1 可接受（GitHub HTTPS + PAT）
- 性能：1000 个文件的仓库 `statusMatrix` 约需 800ms；可接受

### Zustand
- 相比 Redux 样板代码更少
- 无需 Provider 包裹（Hook 优先）
- 对当前存储规模（约 15 个状态字段）已足够

---

## 4. 数据流：打开文件

```
用户在 FileTreeView 中点击文件
        │
        ▼
FileItem.handlePress()
        │
        ├── readFile(node.path)         [expo-file-system]
        ├── getLanguageFromPath(path)   [fileSystem.ts]
        │
        ▼
openTab({ path, name, content, language, isDirty: false })
        │
        ▼
editorStore.openTab()
  → tabs[] 更新，activeTabId 设置
        │
        ▼
EditorScreen 重新渲染
  → MonacoEditor 接收新的 tabId、content、language
        │
        ▼
MonacoEditor.useEffect([tabId])
  → postMessage({ type: 'init', value, language, theme, fontSize })
        │
        ▼
Monaco WebView 收到消息
  → editor.setValue(value)
  → setModelLanguage(language)
```

---

## 5. 数据流：保存文件

```
⌘S 按下（Monaco 中的硬件键盘）
        │
        ▼
Monaco: editor.addCommand(CtrlCmd|S) 触发
  → window.ReactNativeWebView.postMessage({ type: 'save' })
        │
        ▼
MonacoEditor.onMessage 收到 'save'
  → 调用 onSave prop
        │
        ▼
EditorScreen.handleSave()
  → writeFile(activeTab.path, activeTab.content)  [expo-file-system]
  → saveTab(activeTab.id)                         [Zustand: isDirty = false]
```

---

## 6. 数据流：Git 提交

```
用户输入提交信息 → 点击"提交"
        │
        ▼
GitPanel.handleCommit()
        │
        ├── 验证：commitMsg、staged.length > 0、author 已设置
        │
        ▼
git.commit(dir, message, { name, email })
        │
        ▼
isomorphic-git.commit()
  → 通过 fsAdapter（expo-file-system）读取 .git/
  → 向 .git/objects/ 写入新提交对象
  → 更新 .git/refs/heads/<branch>
        │
        ▼
getStatus(dir)  → setGitStatus(status)
getCurrentBranch(dir) → setActiveBranch(branch)
        │
        ▼
GitPanel 重新渲染（已暂存列表清空）
StatusBar 重新渲染（分支名更新）
```

---

## 7. 状态数据结构

```typescript
// src/store/editorStore.ts

EditorStore {
  // 编辑器标签
  tabs: EditorTab[]           // { id, path, name, content, isDirty, language }
  activeTabId: string | null

  // 文件系统
  fileTree: FileNode[]        // { name, path, type, children?, gitStatus? }
  currentWorkspace: string | null  // 绝对路径

  // Git
  gitStatus: GitStatus        // { staged[], unstaged[], untracked[] }
  activeBranch: string

  // UI
  sidebarPanel: 'files' | 'git' | 'search' | 'settings'
  sidebarVisible: boolean

  // 编辑器设置
  theme: 'vs-dark' | 'vs-light' | 'hc-black'
  fontSize: number            // 10-24

  // Git 设置
  gitSettings: {
    authorName: string
    authorEmail: string
    token: string             // GitHub PAT；v0.1 仅保存在内存中
  }
}
```

---

## 8. 核心不变量

1. **单一文件系统：** 所有文件操作必须通过 `expo-file-system` 执行。`git.ts` 使用 `fsAdapter.ts`（封装了 expo-file-system）。禁止使用 LightningFS。

2. **标签内容是事实来源：** `EditorTab` 中的 `content` 反映 Monaco 中的内容。保存时写入磁盘。两者之间的差异不得超过一个自动保存间隔（v0.1 无自动保存——仅支持手动保存）。

3. **变更后必须刷新 Git 状态：** 任何调用 `stageFile`、`unstageFile`、`stageAll`、`commit`、`pull` 的函数必须调用 `getStatus(dir)` 并更新存储。

4. **检出后必须更新分支：** 任何检出/创建分支操作必须调用 `getCurrentBranch` 并更新存储中的 `activeBranch`。

5. **Token 不得记录：** GitHub Token 不得出现在 `console.log`、显示给用户的错误信息或崩溃报告中。
