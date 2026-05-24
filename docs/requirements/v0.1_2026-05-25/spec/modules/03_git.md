# 模块规格说明：Git 引擎

| 模块 | Git |
|---|---|
| 相关文件 | `src/services/git.ts`、`src/services/fsAdapter.ts`、`src/components/Git/GitPanel.tsx`、`src/components/Git/GitDiffView.tsx`、`src/components/Git/GitHistoryView.tsx` |
| 版本 | 0.1 |

---

## 职责

通过 isomorphic-git 提供 Git 操作（状态、暂存、提交、推送、拉取、分支、差异、日志），使用 fsAdapter 将 expo-file-system 作为底层存储。

---

## 核心原则：统一文件系统

```
isomorphic-git
      ↓ 使用
  fsAdapter.ts
      ↓ 封装
  expo-file-system
      ↓ 读写
  设备存储（Documents/workspaces/<repo>/）
      ↑ 同一存储
  fileSystem.ts（编辑器读写）
```

这确保 Git 能够完整感知编辑器创建或修改的文件。

---

## git.ts API

```typescript
// 仓库生命周期
initRepo(dir: string): Promise<void>
cloneRepo(url: string, dir: string, token?: string): Promise<void>

// 状态
getStatus(dir: string): Promise<GitStatus>
  // 返回 { staged[], unstaged[], untracked[] }
  // 使用 isomorphic-git statusMatrix 提升效率

// 暂存
stageFile(dir: string, filepath: string): Promise<void>   // git add <file>
unstageFile(dir: string, filepath: string): Promise<void> // git resetIndex
stageAll(dir: string): Promise<void>                      // git add .

// 提交
commit(dir, message, { name, email }): Promise<string>    // 返回 oid

// 远程操作
push(dir, token, remote?, branch?): Promise<void>
pull(dir, author, token?): Promise<void>
getRemotes(dir): Promise<Array<{ remote, url }>>

// 分支
listBranches(dir): Promise<string[]>
getCurrentBranch(dir): Promise<string | void>
createBranch(dir, ref): Promise<void>         // 创建并检出
checkoutBranch(dir, ref): Promise<void>

// 历史与差异
getLog(dir, depth?): Promise<GitCommit[]>
getHeadContent(dir, filepath): Promise<string>  // 读取 HEAD 处的 blob
```

---

## 状态矩阵解读

isomorphic-git 返回 `[filepath, head, workdir, stage]` 矩阵，每个值为 0、1 或 2。

```
[filepath, 0, 2, 0] → 未追踪   （新文件，未暂存）
[filepath, 1, 1, 1] → 干净     （无更改）
[filepath, 1, 2, 1] → 未暂存   （已修改，未暂存）
[filepath, 1, 2, 2] → 已暂存   （已修改且已暂存）
[filepath, 1, 1, 0] → 未暂存   （暂存删除后撤销——边缘情况）
stage !== head      → 有已暂存更改
workdir !== head    → 有未暂存更改（当 stage === head 时）
```

我们的 `getStatus()` 简化为三个分类。覆盖 95% 的工作流场景。边缘情况（重命名、暂存删除等）可能以错误徽标显示在"已暂存"中——待办事项中改进。

---

## 克隆配置

```typescript
git.clone({
  fs,
  http,
  dir,
  url,
  singleBranch: true,    // 仅克隆默认分支——更快，体积更小
  depth: 50,             // 浅克隆——大型仓库速度快得多
  corsProxy: 'https://cors.isomorphic-git.org',  // 浏览器/WebView HTTP 必需
  onAuth: token ? () => ({ username: token, password: '' }) : undefined,
})
```

**CORS 代理：** 在浏览器上下文中，isomorphic-git 的 HTTP 传输需要 CORS 代理，因为 GitHub API 响应不包含 Git 协议的 CORS 头。使用官方代理 `cors.isomorphic-git.org`。替代方案：自行搭建代理。

**身份验证：** GitHub 个人访问令牌（PAT）作为 HTTP 用户名传递，密码为空。这符合 GitHub 的 PAT 身份验证方案。

---

## 推送/拉取鉴权

```typescript
onAuth: () => ({ username: token, password: '' })
```

Token 在调用时从 `editorStore.gitSettings.token` 读取。v0.1 中永不持久化到磁盘。

---

## 差异算法（GitDiffView）

显示 HEAD 与工作区差异的步骤：

1. `getHeadContent(dir, filepath)` → 从最后一次提交读取 blob
2. `readFile(workspacePath + '/' + filepath)` → 读取当前工作文件
3. `computeDiff(headContent, workContent)` → 基于 LCS 的行差异
4. `toHunks(lines, ctx=3)` → 过滤到变更区域（±3 行上下文）

### LCS 差异算法

```
时间和空间复杂度 O(m × n)（m = 旧行数，n = 新行数）
实际限制：~2000 行文件在 M 系列 iPad 上计算耗时 < 100ms
对于 > 5000 行的文件，考虑分页或使用 diff WASM 模块（待办事项）
```

输出行类型：`add`（绿色）、`del`（红色）、`ctx`（未修改，作为上下文显示）。

---

## 分支操作

```
listBranches(dir)      → git.listBranches（仅本地分支）
createBranch(dir, ref) → git.branch({ ref, checkout: true })
checkoutBranch(dir, ref) → git.checkout({ ref })
```

**任何检出后：** 必须调用 `getCurrentBranch(dir)` 并更新存储中的 `activeBranch`。

**远程分支：** v0.1 中不显示。`git.listRemoteBranches` 在 isomorphic-git 中可用，列为待办事项。

---

## 错误处理策略

所有 Git 操作可能因以下原因失败：
- 网络错误（推送/拉取/克隆）
- 鉴权错误（Token 错误或已过期）
- 冲突（有本地更改时拉取）
- 非仓库错误（无 `.git/` 目录）

全程使用的模式：
```typescript
try {
  setLoading(true);
  await gitOperation();
  await refresh();
} catch (e: any) {
  Alert.alert('操作失败', e.message);
} finally {
  setLoading(false);
}
```

**重要：** isomorphic-git 的错误信息直接显示给用户。技术性较强但通常可操作。待办事项中改进错误信息（将常见错误映射为人类可读的提示）。

---

## 变更后刷新模式

每次变更后必须刷新 Git 状态：

```typescript
// stageFile、unstageFile、stageAll、commit、pull 之后：
const [status, branch] = await Promise.all([
  getStatus(dir),
  getCurrentBranch(dir),
]);
setGitStatus(status);
setActiveBranch(branch ?? 'HEAD');
```

这是约定执行的；可在待办事项中封装为 `useGitOps` Hook。

---

## 已知限制（v0.1）

1. **不支持 SSH** — isomorphic-git 仅支持 HTTP 传输。解决方案：使用 HTTPS + PAT。
2. **浅克隆（`depth: 50`）** — 克隆后历史视图最多显示 50 条提交。用户可在待办事项中配置 `depth`。
3. **无合并冲突 UI** — 如果 `pull` 因冲突失败，用户看到错误信息。手动解决（编辑 → 暂存 → 提交）可行但无引导。合并 UI 列为待办事项。
4. **状态矩阵边缘情况** — 重命名文件、暂存删除未完全正确表示。待办事项中改进状态解析。
5. **CORS 代理依赖** — 依赖 `cors.isomorphic-git.org`。如代理宕机，推送/拉取/克隆将失败。待办事项中提供自托管选项。
6. **Token 仅在内存中** — 应用重启后 Token 丢失。待办事项中使用 expo-secure-store。
