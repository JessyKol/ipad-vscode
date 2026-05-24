# Technical Spec: Performance

| Document | Performance |
|---|---|
| Version | 0.1 |
| Date | 2026-05-25 |

---

## Performance Targets (v0.1)

| Metric | Target | Measurement Method |
|---|---|---|
| Cold start → usable UI | < 3s | Time from app launch to first frame rendered |
| Monaco editor load | < 5s | Time from tab open to editor interactive |
| File open (≤ 500KB) | < 300ms | Time from tap to editor showing content |
| Git status (1000 files) | < 2s | `getStatus()` execution time |
| Git commit | < 1s | Excluding network |
| Git push (small commit) | < 5s | Network dependent |
| Search (100 files, 10K lines) | < 3s | Time from button press to results |
| Directory listing (50 entries) | < 200ms | `readDirectory()` time |

---

## Known Bottlenecks

### 1. Monaco CDN Load (~2-4s)

**Cause:** Monaco loads its JS (~3MB gzipped) from cdnjs.cloudflare.com on every new tab.

**Mitigation in v0.1:** None. Acceptable because iPad Pro on WiFi can load CDN assets quickly.

**v0.3 plan:** Bundle Monaco locally as a pre-bundled asset or use a local HTTP server.

**Measurement:** Open new tab with `Date.now()` before mount and in `onMessage` handler for `ready` event.

---

### 2. expo-file-system `getInfoAsync` per file (~2ms per call)

**Cause:** `readDirectory` calls `getInfoAsync` once per entry to determine if it's a file or directory. For a 500-file directory, this is 500 sequential async calls.

**Observed time:** ~1s for 500 files, ~5s for 2000 files.

**Mitigation in v0.1:** Lazy-loading in FileTreeView (only loads expanded directories). The full tree is never loaded at once.

**v0.2 plan:** Batch `getInfoAsync` calls using `Promise.all` (parallelise up to 50 at a time).

---

### 3. isomorphic-git `statusMatrix` (~500-800ms for 1000-file repo)

**Cause:** isomorphic-git reads every tracked file's metadata to compute status. This is inherently O(n) in repo size.

**Mitigation in v0.1:** `getStatus()` is only called on explicit user actions (refresh button, after git mutations). No background polling.

**v0.2 plan:** Cache status; only re-compute on file system change events (when expo-file-system exposes them).

---

### 4. Search traverse (~10-50ms per file)

**Cause:** Reading each file + string search. Sequential awaits.

**Mitigation in v0.1:** 200-result cap prevents processing entire large repos.

**v0.2 plan:** Parallel file reads with `Promise.all`, build in-memory index.

---

### 5. postMessage latency (~10-30ms per message)

**Cause:** WebView bridge serialisation + deserialization overhead.

**Mitigation in v0.1:** Content sync fires on every keystroke. For typical typing speed (< 10 chars/second), this is acceptable.

**v0.2 plan:** Debounce `onDidChangeModelContent` with a 100ms debounce before syncing to React Native state. (Saves are still instant via ⌘S.)

---

## Memory Budget

iPad Pro M-series has 8-16GB RAM, but iOS kills background apps aggressively. App should stay under 200MB active memory.

| Component | Estimated Memory |
|---|---|
| React Native JS bundle | ~30-50MB |
| Monaco editor (per tab) | ~15-25MB |
| File content in tabs | ~1-5MB (for typical code files) |
| isomorphic-git objects | ~5-20MB (cached .git objects) |
| **Total (3 open tabs)** | **~100-150MB** |

**Risk:** Opening 10+ large tabs could push memory over limit → iOS terminates app. Mitigation: implement tab eviction (unload content of background tabs) in v0.2.

---

## Rendering Performance

React Native renders on the main thread. Heavy computations should be moved off:

| Operation | Where | v0.1 | v0.2 |
|---|---|---|---|
| Search file traversal | JS thread | Sequential | Batch with Promise.all |
| Diff computation (LCS) | JS thread | Sync O(mn) | Worker for large files |
| Git status | JS thread | On-demand | Background with cache |
| Directory listing | JS thread | Sequential stat | Parallel stat |

---

## App Launch Optimization

Current startup sequence:
1. Expo runtime init (~500ms)
2. React Native bridge init (~200ms)
3. Component render (~100ms)
4. **Total: ~800ms to first paint** (fast)

Monaco load (after first tab open) adds 2-4s — this is separate from app launch and only blocks the editor surface, not the rest of the UI.

**v0.1 goal:** The file tree and git panel are usable immediately after launch, even before Monaco finishes loading.
