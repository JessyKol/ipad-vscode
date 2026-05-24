# 路线图

## v0.1 — 基础版 ✅（2026-05-25）

**目标：** 在 iPad Pro 上实现可用的代码编辑器 + Git 功能。

- [x] Monaco 编辑器通过 WebView（iOS + Android 兼容）
- [x] expo-file-system 作为单一文件系统（与 Git 引擎统一）
- [x] 文件树，支持创建 / 删除 / 重命名
- [x] 多编辑器标签，支持脏标记追踪
- [x] 50+ 种语言的语法高亮
- [x] Git：状态、暂存、提交、推送、拉取、克隆、初始化
- [x] Git：分支列表、切换、创建
- [x] Git：文件差异（HEAD 与工作区）、提交历史
- [x] 工作区全文搜索（已知限制见 spec/modules/05_search.md）
- [x] 键盘快捷键（⌘S、⌘P、⌘B、⌘\`）
- [x] 快速打开文件选择器（⌘P）
- [x] 带内置命令和 Git 操作的终端
- [x] 设置：Git 作者、GitHub Token、主题、字体大小
- [x] 状态栏：实时分支、光标位置、语言

**已知问题已转入待办事项** — 详见[功能状态](Feature-Status)和 `docs/requirements/v0.1_2026-05-25/`。

---

## v0.2 及以后 — 待定

未来版本尚未规划。需求确定后将添加到 `docs/requirements/`。
