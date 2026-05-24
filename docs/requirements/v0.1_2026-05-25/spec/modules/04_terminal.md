# 模块规格说明：终端

| 模块 | 终端 |
|---|---|
| 相关文件 | `src/components/Terminal/TerminalView.tsx` |
| 版本 | 0.1 |

---

## 职责

提供带内置命令和 Git 操作的交互式终端面板。向用户清晰说明 iOS 沙盒的限制。

---

## iOS 沙盒现实

| 用户期望 | iOS 上的实际情况 |
|---|---|
| bash / zsh shell | ❌ 不可行（无进程执行能力） |
| npm install、pip install | ❌ 不可行 |
| 运行 Python 脚本 | ❌ 不可行（无解释器） |
| 运行 JavaScript | ⚠️ 可通过 JavaScriptCore 实现（待办事项） |
| Git 操作 | ✅ 通过 isomorphic-git（纯 JS） |
| 文件系统导航 | ✅ 通过 expo-file-system |
| SSH 连接远程服务器 | 📋 待办事项，通过 WebSocket/原生模块实现 |

终端如实反映上述限制。未知命令显示：`command not found（输入"help"查看可用命令）`。

---

## 命令集（v0.1）

### 内置命令

| 命令 | 语法 | 说明 |
|---|---|---|
| `help` | `help` | 列出所有可用命令 |
| `clear` | `clear` | 清空终端输出 |
| `pwd` | `pwd` | 打印当前工作区路径 |
| `echo` | `echo [text]` | 打印文本 |
| `date` | `date` | 打印当前日期/时间 |
| `ls` | `ls [path]` | 列出目录中的文件 |
| `cat` | `cat <file>` | 打印文件内容（前 100 行） |
| `open` | `open <file>` | 在编辑器中打开文件 |

### Git 命令

所有命令使用 isomorphic-git + fsAdapter（与 Git 面板共用同一引擎）。

| 命令 | 行为 |
|---|---|
| `git status` | 显示已暂存/未暂存/未追踪文件 |
| `git log [--n=N]` | 显示最近 N 条提交（默认 10） |
| `git branch` | 列出分支，用 `*` 标记当前分支 |
| `git checkout <branch>` | 切换分支 |
| `git add .` | 暂存所有更改 |
| `git add <file>` | 暂存指定文件 |
| `git commit -m "msg"` | 提交已暂存更改（需要在设置中配置作者信息） |
| `git push` | 推送到远程（需要在设置中配置 Token） |
| `git pull` | 从远程拉取 |

---

## 命令解析

```typescript
const parts = raw.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
const cmd = parts[0]?.toLowerCase() ?? '';
const args = parts.slice(1).map((a) => a.replace(/^["']|["']$/g, ''));
```

支持以下情况：
- 无引号参数：`git commit -m hello`
- 单引号参数：`git commit -m 'my message'`
- 双引号参数：`git commit -m "my message"`

不支持：
- 管道（`|`）
- 重定向（`>`、`<`）
- 后台运行（`&`）
- 变量展开（`$VAR`）

这些超出范围——本终端不是真正的 shell。

---

## 输出行类型

```typescript
type Line = {
  text: string;
  type: 'input' | 'output' | 'error' | 'info';
}
```

| 类型 | 颜色 | 用途 |
|---|---|---|
| `input` | `#569cd6`（蓝色） | 用户输入的命令 |
| `output` | `#cccccc`（浅色） | 普通输出 |
| `error` | `#f44747`（红色） | 错误信息 |
| `info` | `#4ec9b0`（青色） | 状态消息（如"推送中…"） |

---

## 命令历史

- 历史记录存储在本地状态中，类型为 `string[]`（最多 100 条，超出后删除最旧的）
- `↑` / `ArrowUp`：导航到更旧的命令（`historyIdx++`）
- `↓` / `ArrowDown`：导航到更新的命令（`historyIdx--`）；-1 = 空输入
- 通过 TextInput 的 `onKeyPress` 实现

```typescript
onKeyPress({ nativeEvent }) {
  if (nativeEvent.key === 'ArrowUp') {
    const next = Math.min(historyIdx + 1, history.length - 1);
    setInput(history[next] ?? '');
    setHistoryIdx(next);
  } else if (nativeEvent.key === 'ArrowDown') {
    const next = Math.max(historyIdx - 1, -1);
    setInput(next === -1 ? '' : history[next] ?? '');
    setHistoryIdx(next);
  }
}
```

注意：`onKeyPress` 在 iOS 上配合硬件键盘有效。方向键以 `ArrowUp`/`ArrowDown` 键值报告。

---

## 状态管理

终端状态**本地**保存在 `TerminalView` 中（不在 Zustand 中）。原因：终端输出是临时性的，无需在应用重启后持久化，也无需与其他组件共享。如果待办事项中添加多个终端标签，状态应迁移到存储中的 `terminalSessions[]`。

---

## 加载状态

异步命令（git push、git pull、git commit、git clone）执行期间设置 `loading = true`。加载期间：
- 输入框禁用（`editable={false}`）
- 显示 `…` 信息行
- 提交按钮禁用

---

## 已知限制（v0.1）

1. **无 Tab 自动补全** — 按 Tab 键无效。基础补全（文件名）列为待办事项。
2. **`cat` 截断为 100 行** — 防止大文件导致终端溢出。
3. **`ls` 非递归** — 仅平铺列举。
4. **无管道/重定向** — 这不是 shell；命令直接分发处理。
5. **历史记录在组件卸载时丢失** — 如果终端被隐藏后重新显示，历史记录保留（组件保持挂载）。如果应用被杀死，历史记录丢失。v0.1 可接受。
6. **`git log` 输出为纯文本** — 无 ANSI 颜色（代码中的 `\x1b[33m` 转义码在 RN 的 Text 组件中不渲染，会显示为原始转义序列）。待办事项中实现基础 ANSI 解析器。
