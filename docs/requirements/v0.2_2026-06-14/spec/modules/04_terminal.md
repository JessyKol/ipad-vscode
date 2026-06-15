# 模块规格说明：终端（v0.2）

| 模块 | 终端 |
|---|---|
| 相关文件 | `src/components/Terminal/TerminalView.tsx` |
| 版本 | 0.2 |
| 前置版本 | v0.1 spec/modules/04_terminal.md |

---

## v0.2 变更说明

本模块在 v0.2 中**无功能变更**。命令集、解析逻辑、输出行类型、命令历史、状态管理完整继承 v0.1 规格。

iOS 沙盒约束不变：无真实 shell，Git 命令通过 isomorphic-git 执行，内置命令约 8 条 + Git 子命令。

---

## 继承规格

完整技术规格见 [v0.1 spec/modules/04_terminal.md](../../v0.1_2026-05-25/spec/modules/04_terminal.md)，包括：

- iOS 沙盒现实（真实 shell 不可行）
- 内置命令集（help/clear/pwd/echo/date/ls/cat/open）
- Git 命令集（status/log/branch/checkout/add/commit/push/pull）
- 命令解析（引号参数支持）
- 输出行类型（input/output/error/info）
- 命令历史（↑↓导航，最多 100 条）
- 加载状态（异步命令禁用输入框）
- 已知限制（无 Tab 补全、无 ANSI 渲染、ls 非递归等）

---

## v0.2 待办事项（继承 v0.1）

所有 v0.1 遗留待办事项延续：Tab 自动补全、ANSI 解析器、`git log` 颜色渲染、SSH 客户端（📋）、JavaScript 沙箱执行（📋）、多终端标签（📋）。
