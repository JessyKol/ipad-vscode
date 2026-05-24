# Module Spec: Git Engine

| Module | Git |
|---|---|
| Files | `src/services/git.ts`, `src/services/fsAdapter.ts`, `src/components/Git/GitPanel.tsx`, `src/components/Git/GitDiffView.tsx`, `src/components/Git/GitHistoryView.tsx` |
| Version | 0.1 |

---

## Responsibility

Provide git operations (status, stage, commit, push, pull, branch, diff, log) using isomorphic-git with expo-file-system as the backing storage via fsAdapter.

---

## Core Principle: Unified File System

```
isomorphic-git
      ↓ uses
  fsAdapter.ts
      ↓ wraps
  expo-file-system
      ↓ reads/writes
  device storage (Documents/workspaces/<repo>/)
      ↑ same storage
  fileSystem.ts (editor reads/writes)
```

This ensures git has full visibility into files that the editor has created or modified.

---

## git.ts API

```typescript
// Repository lifecycle
initRepo(dir: string): Promise<void>
cloneRepo(url: string, dir: string, token?: string): Promise<void>

// Status
getStatus(dir: string): Promise<GitStatus>
  // Returns { staged[], unstaged[], untracked[] }
  // Uses isomorphic-git statusMatrix for efficiency

// Staging
stageFile(dir: string, filepath: string): Promise<void>   // git add <file>
unstageFile(dir: string, filepath: string): Promise<void> // git resetIndex
stageAll(dir: string): Promise<void>                      // git add .

// Commit
commit(dir, message, { name, email }): Promise<string>    // returns oid

// Remote
push(dir, token, remote?, branch?): Promise<void>
pull(dir, author, token?): Promise<void>
getRemotes(dir): Promise<Array<{ remote, url }>>

// Branches
listBranches(dir): Promise<string[]>
getCurrentBranch(dir): Promise<string | void>
createBranch(dir, ref): Promise<void>         // creates + checks out
checkoutBranch(dir, ref): Promise<void>

// History & Diff
getLog(dir, depth?): Promise<GitCommit[]>
getHeadContent(dir, filepath): Promise<string>  // reads blob at HEAD
```

---

## Status Matrix Interpretation

isomorphic-git returns a matrix of `[filepath, head, workdir, stage]` where each value is 0, 1, or 2.

```
[filepath, 0, 2, 0] → untracked   (new file, not staged)
[filepath, 1, 1, 1] → clean       (no changes)
[filepath, 1, 2, 1] → unstaged    (modified, not staged)
[filepath, 1, 2, 2] → staged      (modified and staged)
[filepath, 1, 1, 0] → unstaged    (delete staged then reverted? — edge case)
stage !== head      → staged changes
workdir !== head    → unstaged changes (when stage === head)
```

Our `getStatus()` simplifies to three buckets. This covers 95% of workflows. Edge cases (renamed, deleted-staged, etc.) show up in "staged" with potentially wrong badges — improvement for v0.2.

---

## Clone Configuration

```typescript
git.clone({
  fs,
  http,
  dir,
  url,
  singleBranch: true,    // only clone default branch — faster, smaller
  depth: 50,             // shallow clone — much faster for large repos
  corsProxy: 'https://cors.isomorphic-git.org',  // required for browser/WebView HTTP
  onAuth: token ? () => ({ username: token, password: '' }) : undefined,
})
```

**CORS proxy:** isomorphic-git's HTTP transport in browser contexts requires a CORS proxy because GitHub API responses don't include CORS headers for git protocol. The official proxy at `cors.isomorphic-git.org` is used. Alternative: self-host the proxy.

**Authentication:** GitHub personal access tokens (PAT) are passed as the HTTP username with empty password. This matches GitHub's PAT authentication scheme.

---

## Push / Pull Auth

```typescript
onAuth: () => ({ username: token, password: '' })
```

Token is read from `editorStore.gitSettings.token` at call time. It is never persisted to disk in v0.1.

---

## Diff Algorithm (GitDiffView)

To show HEAD vs working tree diff:

1. `getHeadContent(dir, filepath)` → reads blob from last commit
2. `readFile(workspacePath + '/' + filepath)` → reads current working file
3. `computeDiff(headContent, workContent)` → LCS-based line diff
4. `toHunks(lines, ctx=3)` → filter to changed regions ±3 context lines

### LCS Diff Algorithm

```
O(m × n) time and space (m = old lines, n = new lines)
Practical limit: ~2000-line files compute in < 100ms on M-series iPad
For files > 5000 lines, consider paginating or using a diff WASM module (v0.3)
```

Output line types: `add` (green), `del` (red), `ctx` (unchanged, shown as context).

---

## Branch Operations

```
listBranches(dir)      → git.listBranches  (local branches only)
createBranch(dir, ref) → git.branch({ ref, checkout: true })
checkoutBranch(dir, ref) → git.checkout({ ref })
```

**After any checkout:** Must call `getCurrentBranch(dir)` and update store's `activeBranch`.

**Remote branches:** Not shown in v0.1. `git.listRemoteBranches` available in isomorphic-git for v0.2.

---

## Error Handling Strategy

All git operations may fail due to:
- Network errors (push/pull/clone)
- Auth errors (wrong token, expired)
- Conflicts (pull with local changes)
- Not-a-repo errors (no `.git/` directory)

Pattern used throughout:
```typescript
try {
  setLoading(true);
  await gitOperation();
  await refresh();
} catch (e: any) {
  Alert.alert('Operation failed', e.message);
} finally {
  setLoading(false);
}
```

**Important:** Error messages from isomorphic-git are shown directly to users. They are technical but usually actionable. Improve error messaging in v0.2 (map common errors to human-readable messages).

---

## Post-Mutation Refresh Pattern

Every mutation MUST refresh git status:

```typescript
// After stageFile, unstageFile, stageAll, commit, pull:
const [status, branch] = await Promise.all([
  getStatus(dir),
  getCurrentBranch(dir),
]);
setGitStatus(status);
setActiveBranch(branch ?? 'HEAD');
```

This is enforced by convention; could be encapsulated into a `useGitOps` hook in v0.2.

---

## Known Limitations (v0.1)

1. **SSH not supported** — isomorphic-git HTTP transport only. Workaround: use HTTPS with PAT.
2. **Shallow clone (`depth: 50`)** — history view shows max 50 commits after clone. User can configure `depth` in v0.2.
3. **No merge conflict UI** — if `pull` fails due to conflicts, user sees an error message. Manual resolution (edit → stage → commit) is possible but not guided. Merge UI in v0.2.
4. **Status matrix edge cases** — renamed files, staged deletions not perfectly represented. Improve status parsing in v0.2.
5. **CORS proxy dependency** — relies on `cors.isomorphic-git.org`. If it goes down, push/pull/clone fail. Self-host option in v0.3.
6. **Token in memory only** — app restart loses token. expo-secure-store in v0.2.
