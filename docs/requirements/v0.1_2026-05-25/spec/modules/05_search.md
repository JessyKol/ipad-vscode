# Module Spec: Search

| Module | Search |
|---|---|
| File | `src/components/Search/SearchPanel.tsx` |
| Version | 0.1 |

---

## Responsibility

Full-text search across all text files in the current workspace. Display results grouped by file with line context. Navigate to result location in editor.

---

## Search Algorithm

### Input
- `query`: string (1+ characters)
- `caseSensitive`: boolean (default false)
- `fileTree`: `FileNode[]` from store (root-level nodes; children lazy-loaded)

### Tree Traversal

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

**Limitation:** `node.children` is only populated if the directory was expanded in FileTreeView. If directories are unexpanded, their files won't be searched. **Fix:** The search should use its own recursive `readDirectory` traversal, not depend on the store's FileNode tree. This is a known bug fixed in the backlog.

**v0.1 workaround:** Users must expand all directories in FileTreeView before searching, or accept incomplete results.

---

## Result Data Model

```typescript
type SearchResult = {
  file: string;       // filename only (basename)
  filePath: string;   // absolute path
  line: number;       // 1-indexed
  text: string;       // trimmed line text
  matchStart: number; // index in (caseSensitive ? text : text.toLowerCase())
  matchEnd: number;   // matchStart + query.length
}
```

---

## Result Cap

Maximum 200 results are returned. If the cap is hit, a "(capped)" label is shown in the summary. This prevents:
- Memory pressure from huge result sets
- UI lag from rendering thousands of rows

---

## Result Grouping

Results are grouped by `filePath` using `reduce`:

```typescript
const byFile = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
  (acc[r.filePath] = acc[r.filePath] ?? []).push(r);
  return acc;
}, {});
```

Each file group shows:
- File header: filename + count badge
- Per-result row: line number + trimmed line text

---

## Navigation

Tapping a result:
1. Reads file content via `readFile(filePath)`
2. Calls `openTab({ path, name, content, language })` → opens/switches to tab
3. TODO (backlog): post `revealLine` message to Monaco WebView to scroll to the result line

---

## Performance

| Scenario | Time |
|---|---|
| 50 files, ~5000 lines, simple query | ~500ms |
| 200 files, ~20000 lines, simple query | ~2-3s |
| 1000 files (large repo) | ~10-15s (unacceptable) |

**Backlog:** Use a web worker or background task to parallelize file reads. Or build an in-memory index on workspace open. For v0.1, 50-100 file projects are the primary target.

---

## Abort / Debounce

The current implementation does NOT debounce search — it triggers on "Search" button press, not on typing. This is intentional for v0.1 to avoid triggering on every keystroke.

The `abortRef` mechanism ensures that if a new search starts before the old one finishes, the old one's results don't overwrite the new one's. However, in v0.1, since search is button-triggered, this is rarely needed.

---

## Known Limitations (v0.1)

1. **Depends on expanded FileTree** — only searches files whose parent directories were expanded. Use own recursive readDirectory in the backlog.
2. **First match per line only** — multiple matches on the same line show only the first one.
3. **No regex support** — plain string search only. Regex backlog.
4. **No replace** — read-only search. Replace backlog.
5. **No glob include/exclude** — all text files are searched. Filter patterns backlog.
6. **No highlighted match in result text** — match position tracked but not highlighted in the UI row. Add styled text highlight in the backlog.
7. **No "reveal line" after navigate** — file opens but Monaco doesn't scroll to the result line. Fix in the backlog via `postMessage({ type: 'revealLine', line })`.
