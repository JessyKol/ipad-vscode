# 模块规格说明：Git 引擎（v0.2 更新）

| 模块 | Git |
|---|---|
| 相关文件 | `src/services/git.ts`、`src/services/github.ts`、`src/components/Git/GitPanel.tsx`、`src/components/Git/ConflictView.tsx`（新增）、`src/components/Git/GitHistoryView.tsx` |
| 版本 | 0.2 |
| 前置版本 | v0.1 spec/modules/03_git.md |

---

## 1. v0.2 变更说明

继承 v0.1 所有 Git 能力（状态/暂存/提交/推送/拉取/克隆/分支/差异/历史）。v0.2 新增三项：

1. **合并冲突解决 UI**（F03）— 可视化解决 pull 冲突
2. **远程分支可见性**（F04）— 列表显示 `origin/*`，支持检出
3. **GitHub PR 创建**（F05）— 复用 Octokit 从当前分支发 PR

---

## 2. 合并冲突解决 UI

### 触发场景

```
git.pull(dir, author, token) 执行
  → isomorphic-git 检测到冲突
  → 抛出 MergeConflictError（或写入冲突标记后 reject）
        │
        ▼
GitPanel.handlePull() catch 块
  → 识别冲突错误类型
  → await detectConflictFiles(dir)  → conflictFiles: string[]
  → setConflictFiles(conflictFiles)  [Zustand]
  → sidebarPanel 切换到 'git'，展示 ConflictView
```

### 冲突文件检测

```typescript
async function detectConflictFiles(dir: string): Promise<string[]> {
  const status = await getStatus(dir)
  // isomorphic-git statusMatrix 中冲突文件的 workdir 值为特殊状态
  // 同时检查文件内容是否含 '<<<<<<<' 标记
  return status.unstaged.filter(async (filepath) => {
    const content = await readFile(dir + '/' + filepath)
    return content.includes('<<<<<<<')
  })
}
```

### ConflictView 组件

**展示格式：** 每个冲突文件以三路视图呈现：

```
┌─── OURS（当前分支） ────────────────┐
│  function foo() {                   │
│    return 'current'                 │
│  }                                  │
└─────────────────────────────────────┘
┌─── THEIRS（拉取的提交） ────────────┐
│  function foo() {                   │
│    return 'incoming'                │
│  }                                  │
└─────────────────────────────────────┘
┌─── RESULT（可编辑） ────────────────┐
│  [OURS 按钮] [THEIRS 按钮] [编辑]  │
│  （当前解决内容）                    │
└─────────────────────────────────────┘
```

**冲突标记解析：**
```typescript
type ConflictBlock = {
  ours: string    // <<<<<<< HEAD 和 ======= 之间
  theirs: string  // ======= 和 >>>>>>> 之间
  start: number   // 在文件中的行号
  end: number
}

function parseConflictBlocks(content: string): ConflictBlock[] {
  // 按 '<<<<<<<' / '=======' / '>>>>>>>' 分割
  // 每组对应一个 ConflictBlock
}
```

**操作流：**
1. 用户对每个 ConflictBlock 选择 OURS / THEIRS / 手动编辑 RESULT
2. 所有 ConflictBlock 解决后，"完成解决"按钮激活
3. 点击 → 写入解决后的文件内容（移除冲突标记）
4. 自动 stageFile(dir, filepath) 
5. 全部文件解决并暂存后 → 正常提交流程

**未解决时保护：** 若文件中仍有 `<<<<<<<` 标记，writeFile 前检查并阻止提交，提示"仍有未解决的冲突"。

```typescript
function hasUnresolvedConflicts(content: string): boolean {
  return content.includes('<<<<<<<')
}
```

---

## 3. 远程分支可见性

### API 扩展（git.ts）

```typescript
// 新增
listRemoteBranches(dir: string, remote = 'origin'): Promise<string[]>
  // 使用 isomorphic-git.listRemoteBranches({ fs, dir, remote })
  // 返回如 ['main', 'dev', 'feature/foo']（不含 remote/ 前缀）

checkoutRemoteBranch(dir: string, remote: string, ref: string): Promise<void>
  // 先 fetch 确保本地有该远程 ref
  // 创建本地跟踪分支：git.branch({ ref, checkout: true })
  // 设置 upstream：git.config({ path: `branch.${ref}.remote`, value: remote })
```

### BranchPanel UI（更新）

分支列表分两组展示：

```
本地分支
  * main（当前）
    dev
    feature/auth

远程分支（origin）
    origin/main
    origin/dev
    origin/feature/foo
```

- 点击远程分支 → 调用 `checkoutRemoteBranch`（创建同名本地跟踪分支）
- 若本地已有同名分支 → 直接 checkout 并设置 upstream
- 检出后 `activeBranch` 更新

### 性能

`listRemoteBranches` 读取本地 `.git/packed-refs` 和 `.git/refs/remotes/`，不发起网络请求。只在用户打开 BranchPanel 时调用（按需加载）。

---

## 4. GitHub PR 创建

### API 扩展（github.ts）

复用现有 Octokit 实例。

```typescript
// 新增
async function createPullRequest(params: {
  owner: string
  repo: string
  title: string
  body: string
  head: string   // 当前分支名
  base: string   // 目标分支（默认 'main'）
  token: string
}): Promise<{ url: string; number: number }> {
  const octokit = new Octokit({ auth: params.token })
  const resp = await octokit.pulls.create({
    owner: params.owner,
    repo: params.repo,
    title: params.title,
    body: params.body,
    head: params.head,
    base: params.base,
  })
  return { url: resp.data.html_url, number: resp.data.number }
}

// 辅助：从 remote URL 解析 owner/repo
function parseGitHubOwnerRepo(remoteUrl: string): { owner: string; repo: string } | null {
  // 匹配 https://github.com/owner/repo.git 或 git@github.com:owner/repo.git
  const httpsMatch = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] }
  return null
}
```

### GitPanel PR 创建 UI

入口：Git 面板顶部"创建 PR"按钮，仅在以下条件满足时显示：
- 已配置 GitHub Token
- 当前 remote 为 GitHub URL
- 当前分支 ≠ 默认分支

流程：
```
用户点击"创建 PR"
  → Alert.prompt 输入 PR 标题（预填：最后一条提交信息）
  → Alert.prompt 输入 PR 描述（可选）
  → 调用 createPullRequest({ owner, repo, title, body, head: activeBranch, base: 'main' })
  → 成功：Alert.alert('PR 已创建', url, [{ text: '复制链接', onPress: () => Clipboard.setString(url) }])
  → 失败：Alert.alert('创建失败', error.message)
```

**Token 权限要求：** GitHub PAT 需要 `repo` scope（v0.1 已有此要求，PR 创建不增加额外权限）。

---

## 5. 继承自 v0.1 的 API（无变更）

以下 API 不变，完整规格见 v0.1 spec/modules/03_git.md：

```typescript
initRepo(dir)、cloneRepo(url, dir, token?)
getStatus(dir) → { staged[], unstaged[], untracked[] }
stageFile(dir, filepath)、unstageFile(dir, filepath)、stageAll(dir)
commit(dir, message, { name, email }) → oid
push(dir, token, remote?, branch?)
pull(dir, author, token?)   ← 现在 catch 冲突并进入 ConflictView 流程
getRemotes(dir)
listBranches(dir)、getCurrentBranch(dir)、createBranch(dir, ref)、checkoutBranch(dir, ref)
getLog(dir, depth?)、getHeadContent(dir, filepath)
```

**变更后刷新模式（不变）：** 所有写操作后必须调用 `getStatus` + `getCurrentBranch` 并更新 Zustand。

---

## 6. 错误处理补充（v0.2）

| 场景 | 处理 |
|---|---|
| pull 产生冲突 | 进入 ConflictView 流程（见 §2） |
| ConflictView 中文件有残留标记 | 阻止暂存，提示"仍有未解决冲突" |
| PR 创建时 remote 非 GitHub | 显示"仅支持 GitHub 仓库" |
| PR 创建时分支未推送 | 提示"请先推送当前分支" |
| listRemoteBranches 无结果 | 提示"未找到远程分支，请先 pull 或检查 remote 配置" |

---

## 7. 已知限制（v0.2）

1. **ConflictView 仅支持文本冲突** — 二进制文件冲突仅提示手动解决（通过桌面端）。
2. **PR 仅支持 GitHub** — GitLab/Bitbucket 列为 v0.3 待办。
3. **远程分支列表不实时刷新** — 仅在打开 BranchPanel 时读取本地 refs，不自动 fetch。
4. **三路合并无共同祖先视图** — 仅展示 OURS/THEIRS，不展示 BASE（v0.1 isomorphic-git 无三路合并 API）。
5. **复杂冲突（嵌套块）** — 同一文件多个冲突块逐一解决，不支持批量接受/拒绝。
