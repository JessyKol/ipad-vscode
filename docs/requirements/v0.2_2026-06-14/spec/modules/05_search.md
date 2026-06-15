# 模块规格说明：搜索（v0.2）

| 模块 | 搜索 |
|---|---|
| 相关文件 | `src/components/Search/SearchPanel.tsx` |
| 版本 | 0.2 |
| 前置版本 | v0.1 spec/modules/05_search.md |

---

## v0.2 变更说明

本模块在 v0.2 中**无功能变更**。搜索算法、结果数据模型、200 条上限、分组显示、导航逻辑完整继承 v0.1 规格。

v0.1 已知 Bug（搜索仅遍历 FileTree 中已展开目录）在 v0.2 中仍未修复，延续到 v0.3 待办。

---

## 继承规格

完整技术规格见 [v0.1 spec/modules/05_search.md](../../v0.1_2026-05-25/spec/modules/05_search.md)，包括：

- 搜索算法（顺序遍历，依赖已展开 FileNode 树——已知 Bug）
- `SearchResult` 类型（file/filePath/line/text/matchStart/matchEnd）
- 200 条结果上限与"已截断"标签
- 按文件分组展示
- 导航（打开文件，未滚动到对应行——已知限制）
- 性能特征（50 文件~500ms，1000 文件~10-15s）
- 防抖策略（按钮触发，非即时搜索）
- 所有已知限制（6 条）

---

## v0.2 待办事项（继承 v0.1）

- **Bug 修复：** 搜索使用独立递归 `readDirectory` 而非依赖 FileNode 树（v0.2 中仍为待办）
- 导航后 Monaco `revealLine` 滚动到对应行（继承）
- 正则表达式搜索（继承）
- 替换功能（继承）
- 匹配高亮（继承）
- 包含/排除 glob 模式（继承）
