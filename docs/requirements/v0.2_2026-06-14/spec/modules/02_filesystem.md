# 模块规格说明：文件系统（v0.2）

| 模块 | 文件系统 |
|---|---|
| 相关文件 | `src/services/fileSystem.ts`、`src/services/fsAdapter.ts` |
| 版本 | 0.2 |
| 前置版本 | v0.1 spec/modules/02_filesystem.md |

---

## v0.2 变更说明

本模块在 v0.2 中**无功能变更**。所有 API（`readFile`、`writeFile`、`readDirectory`、`createFile`、`deleteItem`、`renameItem` 等）与 fsAdapter.ts 接口完整继承 v0.1 规格。

**v0.2 新增的写盘操作（AI 落盘）仍通过本模块执行，满足不变量 1：**

> 不变量 1：所有文件操作（含 AI plan-execute 的 applyDiffs）必须通过 `expo-file-system` 执行，以确保 Git 完整感知。

`applyDiffs()` 在 `ai.ts` 中实现，内部调用本模块的 `writeFile` / `deleteItem`，不绕过 fsAdapter。

---

## 继承规格

完整技术规格见 [v0.1 spec/modules/02_filesystem.md](../../v0.1_2026-05-25/spec/modules/02_filesystem.md)，包括：

- 工作区目录结构（`Documents/workspaces/<repo>/`）
- `fileSystem.ts` 完整 API
- `fsAdapter.ts` isomorphic-git POSIX 桥接接口契约
- 二进制文件处理（base64 编解码）
- 路径处理边界情况
- 性能特征（每文件 `getInfoAsync` 约 2ms）
- 已知限制（`.git` 目录可见、无文件监听器、无二进制预览等）

---

## v0.2 待办事项（继承 v0.1 + 新增）

- 应用切换到前台时自动刷新文件树（继承）
- 二进制文件打开前类型检查（继承）
- 搜索使用独立递归 `readDirectory`（继承，见 spec/modules/05_search.md）
- **新增：** `applyDiffs` 大批量写盘时显示进度（> 20 文件时）
