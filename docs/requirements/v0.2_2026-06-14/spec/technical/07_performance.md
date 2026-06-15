# 技术规格说明：性能（v0.2 更新）

| 文档 | 性能 |
|---|---|
| 版本 | 0.2 |
| 日期 | 2026-06-14 |
| 前置版本 | v0.1 spec/technical/07_performance.md |

---

## 1. 性能目标（v0.2 完整列表）

### 继承自 v0.1（不变）

| 指标 | 目标值 | 测量方法 |
|---|---|---|
| 冷启动到可用 UI | < 3s | 启动到首帧渲染 |
| Monaco 编辑器加载 | < 5s | 打开标签到编辑器可交互 |
| 打开文件（≤ 500KB） | < 300ms | 点击到编辑器显示内容 |
| Git 状态（1000 文件） | < 2s | getStatus() 执行时间 |
| Git 提交 | < 1s | 不含网络时间 |
| Git 推送（小提交） | < 5s | 依赖网络 |
| 搜索（100 文件，10K 行） | < 3s | 按钮到显示结果 |
| 目录列举（50 条目） | < 200ms | readDirectory() 耗时 |

### v0.2 新增目标

| 指标 | 目标值 | 说明 |
|---|---|---|
| 设置启动加载 | < 300ms | Keychain + settings.json 并行读取 |
| 内联补全首建议（P50） | < 800ms | 300ms 防抖 + 网络 + 模型响应 |
| 内联补全首建议（P90） | < 2s | 网络波动时 |
| 内联补全超时放弃 | 5s | 超时后静默丢弃，不影响输入 |
| LSP 补全响应（warm jdtls） | P50 < 500ms | 服务器已索引完成的状态 |
| LSP 首次连接（TS/Python，warm） | < 5s | 网关已启动语言服务器 |
| LSP 首次连接（Java，冷启 jdtls） | < 15s | jdtls 冷启动需建索引 |
| LSP 诊断刷新（保存后） | < 2s | 从 didSave 到波浪线更新 |
| Bridge 首 token（plan 开始） | < 3s | 用户发送 prompt 到第一个 thinking token |
| DiffReviewPanel 渲染（10 文件） | < 500ms | plan_response 到 UI 显示 |
| applyDiffs 执行（10 文件，10KB/文件）| < 500ms | 写盘 + 刷新 Git + 刷新文件树 |

---

## 2. 新增性能瓶颈分析

### 1. 内联补全网络往返（约 300-700ms）

**原因：** 300ms 防抖后请求，再等模型 API 响应（Claude Haiku / GPT-4o-mini 在国内约 400-800ms）。

**缓解：**
- 300ms 防抖（平衡响应速度与请求频率）
- `AbortController` 取消，避免堆积过期请求
- 补全失败静默处理（不阻塞输入）

**v0.2 不做：** 本地缓存或预测性预取（v0.3 探索）

---

### 2. jdtls 冷启动（10-15s）

**原因：** jdtls 需要建立项目索引（解析所有 .java 文件、下载依赖），是 JVM 进程启动 + 索引的固有开销。

**缓解：**
- 连接时展示 `lspStatus = 'indexing'` 状态（状态栏 + 设置面板都要显示）
- 索引完成前返回 Monaco 内置补全（降级，不报错）
- 网关侧可 keep-alive jdtls 进程（不每次冷启动）

**不可规避：** 这是 jdtls 的固有特性，iPad 端无法优化。

---

### 3. didChange 消息频率（每次 onDidChangeModelContent）

**原因：** 每次按键触发内容变更事件，若不防抖会频繁向 LSP 发 didChange。

**缓解：** 500ms 防抖后发送 `textDocument/didChange`（保存 didSave 仍立即发送）。

| 场景 | 行为 |
|---|---|
| 正常打字（< 2 次/秒）| 每次停止 500ms 后发送 didChange |
| 快速打字（> 5 次/秒）| 合并为一条 didChange，减少 LSP 负载 |
| ⌘S 保存 | 立即发送 didSave，不等防抖 |

---

### 4. applyDiffs 串行写盘

**原因：** `expo-file-system.writeAsStringAsync` 是原子操作，多文件必须串行（避免并发写同目录时的竞态）。

**实测：** 10 个文件 × 10KB = 约 300ms（`writeFile` 每个约 30ms）。

**可接受范围：** PRD 目标 < 500ms，实测满足。大型变更（50 文件）约 1.5s，超出目标但属 edge case，v0.2 可接受。

---

### 5. 内存预算（v0.2 新增组件）

| 组件 | 增量内存 |
|---|---|
| monaco-languageclient（每标签） | ~5-10MB（JS 库 + WS 连接） |
| ChatPanel 消息历史（100 条） | ~2-5MB |
| DiffPlan 缓存（待确认） | ~1-3MB |
| Bridge WS 连接 | 可忽略 |
| **v0.2 新增合计（3 标签）** | **~25-40MB** |

v0.2 总体内存预算：~125-190MB（3 标签）。仍在 iOS 200MB 安全线内。

---

## 3. 渲染性能（v0.2 补充）

| 操作 | 执行位置 | v0.2 | 备注 |
|---|---|---|---|
| 搜索遍历 | JS 线程 | 沿用 v0.1 | 待 v0.3 并行化 |
| 差异计算 | JS 线程 | 沿用 v0.1 | |
| applyDiffs 写盘 | JS 线程 | 串行，约 300ms | 可接受 |
| DiffPlan 渲染 | RN 主线程 | < 500ms | FlatList 懒渲染 |
| LSP didChange 发送 | WebView JS | 防抖 500ms | 不阻塞渲染 |
| 内联补全渲染 | WebView JS | < 16ms | decoration 操作轻量 |

---

## 4. 启动序列优化（v0.2）

```
1. Expo 运行时初始化（~500ms）
2. React Native 桥接初始化（~200ms）
3. 组件渲染 + 设置加载（settings.json + Keychain 并行，~100-300ms）
4. 显示最近工作区列表（即时）
5. Monaco / Bridge / LSP 连接（异步，不阻塞 UI）
```

**目标：** 用户看到最近工作区列表在 < 1s；Monaco 可用在 < 6s（含 CDN 加载）。

设置加载移至启动序列确保：用户点击最近工作区时 Token 已就绪（无需重输）。
