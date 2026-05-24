# Module Spec: File System

| Module | File System |
|---|---|
| Files | `src/services/fileSystem.ts`, `src/services/fsAdapter.ts` |
| Version | 0.1 |

---

## Responsibility

- Abstract expo-file-system for editor operations (read, write, list, create, delete, rename)
- Provide a POSIX-compatible `fs.promises` interface for isomorphic-git (via `fsAdapter.ts`)
- Manage workspace root paths under `documentDirectory/workspaces/`

---

## Workspace Layout

```
FileSystem.documentDirectory/
  workspaces/
    my-project/
      .git/                    ← managed by isomorphic-git via fsAdapter
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

All workspace paths are absolute URIs starting with `file:///`.

---

## fileSystem.ts API

```typescript
// Workspace management
ensureWorkspaceDir(): Promise<void>
listWorkspaces(): Promise<string[]>
createWorkspace(name: string): Promise<string>   // returns abs path

// Directory operations
readDirectory(dirPath: string): Promise<FileNode[]>
  // Sorted: directories first, then files, alphabetical within each group
  // Each FileNode: { name, path, type: 'file'|'directory' }

// File operations
readFile(path: string): Promise<string>             // UTF-8
writeFile(path: string, content: string): Promise<void>  // UTF-8, atomic
createFile(dirPath: string, name: string): Promise<string>
createDirectory(dirPath: string, name: string): Promise<string>
deleteItem(path: string): Promise<void>             // recursive if directory
renameItem(fromPath: string, toPath: string): Promise<void>

// Utility
getLanguageFromPath(path: string): string           // ext → Monaco language ID
```

---

## fsAdapter.ts — isomorphic-git POSIX Bridge

isomorphic-git requires an object with `{ promises: { readFile, writeFile, readdir, mkdir, rmdir, stat, lstat, unlink, readlink, symlink } }`.

### Interface Contract

```typescript
fsAdapter.promises.readFile(path, options?)
  → If options.encoding === 'utf8': returns string
  → Otherwise: returns Uint8Array (base64 decoded from expo-fs)

fsAdapter.promises.writeFile(path, data, options?)
  → If data is string: writes UTF-8
  → If data is Uint8Array: base64 encodes and writes

fsAdapter.promises.stat(path)
  → Returns StatResult: { isFile(), isDirectory(), isSymbolicLink(), size, mode, mtimeMs, ... }
  → Throws ENOENT if path does not exist

fsAdapter.promises.lstat(path)
  → Same as stat (no symlink support; symlinks not on iPadOS FS)

fsAdapter.promises.readlink(path)
  → Always throws ENOSYS (symlinks not supported)

fsAdapter.promises.symlink(target, path)
  → Always throws ENOSYS
```

### Error Codes

| Condition | Error code |
|---|---|
| Path does not exist | `ENOENT` |
| Symlink operation | `ENOSYS` |
| Permission denied (rare on iOS sandbox) | `EACCES` (propagated from expo-fs) |

isomorphic-git checks error codes on ENOENT and ENOSYS and handles them gracefully (e.g., skips symlinks in status matrix).

---

## Binary File Handling

expo-file-system encodes binary data as base64 when using `FileSystem.EncodingType.Base64`.

```
readFile(binary):
  expo-fs reads as base64 string
  → atob(base64) → binary string → Uint8Array

writeFile(Uint8Array):
  Uint8Array → binary string → btoa() → base64 string
  → expo-fs writes as base64
```

This ensures git objects (which are binary) can be stored in and read from expo-file-system.

---

## Path Handling Edge Cases

1. **Trailing slash:** `readDirectory` normalizes paths: `path.endsWith('/') ? path + name : path + '/' + name`
2. **Workspace root:** isomorphic-git `dir` param is the workspace root (no trailing slash)
3. **Relative vs absolute:** git.ts functions accept absolute paths; isomorphic-git constructs relative paths internally
4. **`.git` directory:** Never shown in FileTreeView (filtered by name starting with `.` in the backlog; in v0.1, shown if present — minor UX issue)

---

## Performance Characteristics

| Operation | Typical Time | Notes |
|---|---|---|
| `readDirectory` (flat, 50 files) | ~100ms | One `getInfoAsync` per entry |
| `readFile` (10KB) | ~20ms | Single async read |
| `writeFile` (10KB) | ~30ms | Single async write, atomic on iOS |
| `readDirectory` recursive (500 files) | ~2-3s | Multiplied per-file stat calls |

**Bottleneck:** `getInfoAsync` per file in `readDirectory`. For large repos (1000+ files), consider batching or caching in the backlog.

---

## Known Limitations (v0.1)

1. **`.git` directory visible in tree** — not filtered out; cosmetic issue. Fix: filter names starting with `.` (or only `.git`) in FileTreeView.
2. **No file watcher** — changes made outside the app (e.g., git pull) require manual refresh. Auto-refresh on app foreground in the backlog.
3. **No binary file preview** — opening an image or binary shows garbled text. Add file type check before opening in the backlog.
4. **readDirectory is not recursive** — FileTreeView lazy-loads children on expand. Full tree not loaded upfront (good for performance, but search requires separate recursive walk).
