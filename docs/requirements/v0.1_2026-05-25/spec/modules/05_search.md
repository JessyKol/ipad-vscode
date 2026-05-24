# 模块规格说明：搜索

| 模块 | 搜索 |
|---|---|
| 相关文件 | `src/components/Search/SearchPanel.tsx` |
| 版本 | 0.1 |

---

## 职责

对当前工作区内的所有文本文件进行全文搜索。按文件分组显示结果并附带行上下文。支持导航到结果所在的编辑器位置。

---

## 搜索算法

### 输入
- `query`：字符串（1 个及以上字符）
- `caseSensitive`：布尔值（默认 false）
- `fileTree`：来自存储的 `FileNode[]`（根级节点；子目录懒加载）

### 树遍历

```typescript
async function searchInTree(nodes, query, caseSensitive, results, maxResults = 200) {
  for (const node of nodes) {
    if (results.length >= maxResults) return;
    if (node.type === 'file') {
      const content = await readFile(node.path);
      const lines = content.split('\n');
      for (const [i, line] of lines.entries()) {
        const match = (caseSensitive ? line : line.toLowerCase())
                        .indexOf(caseSensitive ? query : query.toLowerCase());
        if (match !== -1) {
          results.push({ file, filePath, line: i+1, text: line.trim(), matchStart, matchEnd });
        }
      }
    } else if (node.children) {
      await searchInTree(node.children, query, caseSensitive, results, maxResults);
    }
  }
}
```

**限制：** `node.children` 仅在 FileTreeView 中展开了目录时才有值。如果目录未展开，其中的文件不会被搜索。**修复方案：** 搜索应使用自己的递归 `readDirectory` 遍历，而不依赖存储中的 FileNode 树。这是待办事项中已知的 bug。

**v0.1 临时方案：** 用户必须在搜索前在 FileTreeView 中展开所有目录，否则接受不完整的结果。

---

## 结果数据模型

```typescript
type SearchResult = {
  file: string;       // 仅文件名（basename）
  filePath: string;   // 绝对路径
  line: number;       // 1 开始的行号
  text: string;       // 去除首尾空格的行文本
  matchStart: number; // 在（区分/不区分大小写的）text 中的索引
  matchEnd: number;   // matchStart + query.length
}
```

---

## 结果上限

最多返回 200 条结果。达到上限时，摘要中显示"（已截断）"标签。这可以防止：
- 大量结果集造成内存压力
- 渲染数千行导致 UI 卡顿

---

## 结果分组

结果按 `filePath` 通过 `reduce` 分组：

```typescript
const byFile = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
  (acc[r.filePath] = acc[r.filePath] ?? []).push(r);
  return acc;
}, {});
```

每个文件组显示：
- 文件头：文件名 + 数量徽标
- 每条结果行：行号 + 去除首尾空格的行文本

---

## 导航

点击结果时：
1. 通过 `readFile(filePath)` 读取文件内容
2. 调用 `openTab({ path, name, content, language })` → 打开/切换到标签
3. 待办事项：向 Monaco WebView 发送 `revealLine` 消息以滚动到结果行

---

## 性能

| 场景 | 耗时 |
|---|---|
| 50 个文件，~5000 行，简单查询 | ~500ms |
| 200 个文件，~20000 行，简单查询 | ~2-3s |
| 1000 个文件（大型仓库） | ~10-15s（不可接受） |

**待办事项：** 使用 Web Worker 或后台任务并行化文件读取，或在工作区打开时构建内存索引。v0.1 的主要目标是 50-100 个文件的项目。

---

## 中止/防抖

当前实现**不进行防抖**——搜索在点击"搜索"按钮时触发，而非每次输入时触发。这是 v0.1 有意为之，避免每次按键都触发搜索。

`abortRef` 机制确保：如果新搜索在旧搜索完成前启动，旧搜索的结果不会覆盖新搜索的结果。然而在 v0.1 中，由于搜索是按钮触发的，这种情况很少发生。

---

## 已知限制（v0.1）

1. **依赖已展开的文件树** — 只搜索父目录已在 FileTreeView 中展开的文件。待办事项中使用独立的递归 readDirectory。
2. **每行仅匹配第一个** — 同一行中有多个匹配时只显示第一个。
3. **不支持正则表达式** — 仅纯字符串搜索。正则表达式列为待办事项。
4. **不支持替换** — 只读搜索。替换功能列为待办事项。
5. **不支持 glob 包含/排除** — 搜索所有文本文件。过滤模式列为待办事项。
6. **结果文本中匹配无高亮** — 匹配位置已追踪但 UI 行中未高亮显示。待办事项中添加带样式的文本高亮。
7. **导航后不跳转行** — 文件会打开，但 Monaco 不会滚动到结果行。待办事项中通过 `postMessage({ type: 'revealLine', line })` 修复。
