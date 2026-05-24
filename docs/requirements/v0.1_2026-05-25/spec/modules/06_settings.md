# 模块规格说明：设置

| 模块 | 设置 |
|---|---|
| 相关文件 | `src/components/Settings/SettingsPanel.tsx`、`src/store/editorStore.ts` |
| 版本 | 0.1 |

---

## 职责

提供 Git 作者凭证、GitHub Token、编辑器外观及工作区管理（克隆/初始化）的配置界面。

---

## 设置数据结构

所有设置保存在 Zustand 中（v0.1 仅在内存中）：

```typescript
// 在 EditorStore 中
gitSettings: {
  authorName: string;    // git 提交作者姓名
  authorEmail: string;   // git 提交作者邮箱
  token: string;         // GitHub PAT（仅在内存中）
}
theme: 'vs-dark' | 'vs-light' | 'hc-black';
fontSize: number;        // 10-24
```

---

## 设置分类

### Git 作者
- **用途：** 提交操作必需。isomorphic-git 要求每次提交都设置作者 `{ name, email }`。
- **校验：** v0.1 中无校验；字段为空时提交失败并弹出 Alert。
- **存储：** 仅 Zustand（应用重启后丢失）。待办事项中持久化到 JSON 文件。

### GitHub Token
- **用途：** 私有仓库的推送、拉取、克隆，或达到速率限制时必需。
- **类型：** GitHub 个人访问令牌（PAT），权限范围：`repo`（完整仓库访问）
- **存储：** 仅 Zustand（内存）。**不得记录到控制台。不得在错误信息中显示。**
- **安全说明：** v0.2 中迁移到 `expo-secure-store`（iOS Keychain 封装）。
- **显示方式：** 输入框使用 `secureTextEntry={true}`——显示圆点。

### 主题
- 三个选项：深色、浅色、高对比度
- 通过 `postMessage({ type: 'setTheme', theme })` 立即应用到 Monaco
- 存储在 Zustand 中；通过 MonacoEditor `useEffect([theme])` 传播

### 字体大小
- 范围：10–24px
- `+` / `-` 按钮（不用滑块——iPad 上太容易误触）
- 通过 `postMessage({ type: 'setFontSize', size })` 应用到 Monaco

### 克隆仓库
- 输入 URL → 调用 `cloneRepo(url, dir, token?)`
- 如已设置则使用 gitSettings 中的 Token
- 克隆完成后自动打开工作区
- 克隆在 UI 线程执行（v0.1 无后台 Worker）——按钮显示"克隆中…"

### 初始化仓库
- 对当前工作区调用 `initRepo(currentWorkspace)`
- 幂等（isomorphic-git 中重复初始化是安全的）
- 在新工作区上进行任何 Git 操作前必须执行

---

## 状态持久化（v0.1 限制）

**问题：** 所有设置在应用重启后丢失。

**影响：**
- 用户每次启动必须重新输入 Git 作者、Token 并重新打开工作区
- 这是 v0.1 预计收到最多投诉的 UX 问题

**待办事项：**
```typescript
// 使用 expo-secure-store 存储 Token（Keychain 支持）：
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('github_token', token);

// 使用 settings.json 文件存储其他偏好设置：
const settingsPath = FileSystem.documentDirectory + 'settings.json';
await writeFile(settingsPath, JSON.stringify({ authorName, authorEmail, theme, fontSize }));
```

---

## 主题传播流程

主题变更流程：
```
SettingsPanel → setTheme(theme)     [Zustand 变更]
    ↓
EditorStore.theme 更新
    ↓
MonacoEditor.useEffect([theme]) 触发
    ↓
postMessage({ type: 'setTheme', theme })
    ↓
Monaco: monaco.editor.setTheme(toMonacoTheme(theme))
```

主题 → Monaco 主题映射：
```
'vs-dark'  → 'vscode-dark'  （基于 vs-dark 的自定义主题）
'vs-light' → 'vscode-light' （基于 vs 的自定义主题）
'hc-black' → 'hc-black'     （Monaco 内置高对比度主题）
```

---

## 已知限制（v0.1）

1. **无持久化** — 所有设置在应用重启后重置。待办事项中修复。
2. **无输入校验** — 无效的邮箱格式会被接受；导致 Git 作者信息格式错误。待办事项中添加校验。
3. **Token 安全性** — 仅在内存中；待办事项中使用 Keychain 存储。
4. **克隆在 UI 线程执行** — 大型仓库克隆期间 UI 可能感觉迟缓。待办事项中移到后台任务。
5. **无自定义键位绑定** — 键盘快捷键在 Monaco HTML 中硬编码。待办事项中支持用户自定义绑定。
6. **无字体家族选择** — Menlo 硬编码。待办事项中添加系统等宽字体选择器。
