# 模块规格说明：文件系统

| 模块 | 文件系统 |
|---|---|
| 相关文件 | `src/services/fileSystem.ts`、`src/services/fsAdapter.ts` |
| 版本 | 0.1 |

---

## 职责

- 为编辑器操作（读取、写入、列举、创建、删除、重命名）封装 expo-file-system
- 为 isomorphic-git 提供 POSIX 兼容的 `fs.promises` 接口（通过 `fsAdapter.ts`）
- 管理 `documentDirectory/workspaces/` 下的工作区根路径

---

## 工作区目录结构

```
FileSystem.documentDirectory/
  workspaces/
    my-project/
      .git/                    ← 由 isomorphic-git 通过 fsAdapter 管理
        objects/
        refs/
        HEAD
        config
        ...
      src/
        index.ts
        utils.ts
      package.json
      README.md
    another-project/
      ...
```

所有工作区路径为以 `file:///` 开头的绝对 URI。

---

## fileSystem.ts API

```typescript
// 工作区管理
ensureWorkspaceDir(): Promise<void>
listWorkspaces(): Promise<string[]>
createWorkspace(name: string): Promise<string>   // 返回绝对路径

// 目录操作
readDirectory(dirPath: string): Promise<FileNode[]>
  // 排序规则：目录优先，然后是文件，各组内按字母顺序排列
  // 每个 FileNode：{ name, path, type: 'file'|'directory' }

// 文件操作
readFile(path: string): Promise<string>             // UTF-8
writeFile(path: string, content: string): Promise<void>  // UTF-8，原子写入
createFile(dirPath: string, name: string): Promise<string>
createDirectory(dirPath: string, name: string): Promise<string>
deleteItem(path: string): Promise<void>             // 目录则递归删除
renameItem(fromPath: string, toPath: string): Promise<void>

// 工具函数
getLanguageFromPath(path: string): string           // 扩展名 → Monaco 语言 ID
```

---

## fsAdapter.ts — isomorphic-git POSIX 桥接

isomorphic-git 需要一个包含 `{ promises: { readFile, writeFile, readdir, mkdir, rmdir, stat, lstat, unlink, readlink, symlink } }` 的对象。

### 接口契约

```typescript
fsAdapter.promises.readFile(path, options?)
  → 如果 options.encoding === 'utf8'：返回 string
  → 否则：返回 Uint8Array（从 expo-fs 的 base64 解码）

fsAdapter.promises.writeFile(path, data, options?)
  → 如果 data 是 string：以 UTF-8 写入
  → 如果 data 是 Uint8Array：base64 编码后写入

fsAdapter.promises.stat(path)
  → 返回 StatResult：{ isFile(), isDirectory(), isSymbolicLink(), size, mode, mtimeMs, ... }
  → 路径不存在时抛出 ENOENT

fsAdapter.promises.lstat(path)
  → 同 stat（不支持符号链接；iPadOS 文件系统无符号链接）

fsAdapter.promises.readlink(path)
  → 始终抛出 ENOSYS（不支持符号链接）

fsAdapter.promises.symlink(target, path)
  → 始终抛出 ENOSYS
```

### 错误码

| 条件 | 错误码 |
|---|---|
| 路径不存在 | `ENOENT` |
| 符号链接操作 | `ENOSYS` |
| 权限被拒（iOS 沙盒中少见） | `EACCES`（从 expo-fs 传播） |

isomorphic-git 会检查 ENOENT 和 ENOSYS 错误码并优雅处理（例如在状态矩阵中跳过符号链接）。

---

## 二进制文件处理

expo-file-system 使用 `FileSystem.EncodingType.Base64` 对二进制数据进行 base64 编码。

```
readFile（二进制）:
  expo-fs 以 base64 字符串读取
  → atob(base64) → 二进制字符串 → Uint8Array

writeFile（Uint8Array）:
  Uint8Array → 二进制字符串 → btoa() → base64 字符串
  → expo-fs 以 base64 写入
```

这确保 Git 对象（二进制格式）可以存储到 expo-file-system 并从中读取。

---

## 路径处理边界情况

1. **尾部斜杠：** `readDirectory` 对路径进行规范化：`path.endsWith('/') ? path + name : path + '/' + name`
2. **工作区根目录：** isomorphic-git 的 `dir` 参数是工作区根目录（无尾部斜杠）
3. **相对路径 vs 绝对路径：** git.ts 函数接受绝对路径；isomorphic-git 内部构建相对路径
4. **`.git` 目录：** 在 FileTreeView 中不显示（待办事项中按名称以 `.` 开头过滤；v0.1 中如果存在则会显示——轻微 UX 问题）

---

## 性能特征

| 操作 | 典型耗时 | 备注 |
|---|---|---|
| `readDirectory`（平铺，50 个文件） | ~100ms | 每个条目一次 `getInfoAsync` |
| `readFile`（10KB） | ~20ms | 单次异步读取 |
| `writeFile`（10KB） | ~30ms | 单次异步写入，iOS 上原子操作 |
| `readDirectory` 递归（500 个文件） | ~2-3s | 每个文件的 stat 调用叠加 |

**瓶颈：** `readDirectory` 中每个文件调用一次 `getInfoAsync`。对于大型仓库（1000+ 个文件），可在待办事项中考虑批量处理或缓存。

---

## 已知限制（v0.1）

1. **`.git` 目录在文件树中可见** — 未过滤；外观问题。修复方案：在 FileTreeView 中过滤以 `.` 开头的名称（或仅过滤 `.git`）。
2. **无文件监听器** — 应用外部的更改（如 git pull）需要手动刷新。待办事项：应用切换到前台时自动刷新。
3. **无二进制文件预览** — 打开图片或二进制文件显示乱码。待办事项：打开前添加文件类型检查。
4. **readDirectory 非递归** — FileTreeView 在展开时懒加载子目录。完整树不会一次全部加载（有利于性能，但搜索需要单独的递归遍历）。
