# 开发指南

## 环境依赖

| 工具 | 版本 | 用途 |
|---|---|---|
| Node.js | ≥ 18 LTS | JS 运行时 |
| Expo CLI | `npx expo` | 开发服务器 |
| Xcode | ≥ 15 | iOS 模拟器 |
| iOS 模拟器 | iPad Pro 12.9" | 主要测试目标 |

## 初始化设置

```bash
git clone git@github.com:JessyKol/ipad-vscode.git
cd ipad-vscode
npm install
```

## 运行项目

```bash
# 启动开发服务器
npm start

# 在 iOS 模拟器中打开
npm run ios          # → 使用默认模拟器

# 通过 Expo Go 在实体 iPad 上打开（有限制——WebView 可用）
# 扫描 'npm start' 中的二维码
```

> **提示：** Monaco 编辑器加载需要网络（CDN 依赖）。离线支持计划在 v0.3 中实现。

## 类型检查

```bash
npm run type-check
```

## 项目脚本

| 功能 | 命令 |
|---|---|
| 开发服务器 | `npm start` |
| iOS 构建 | `npm run ios` |
| Web 预览 | `npm run web` |
| 类型检查 | `npm run type-check` |
| 代码检查 | `npm run lint` |
| 同步 Wiki | `bash scripts/push-wiki.sh` |

## 架构规范

### 添加新的侧边栏面板

1. 在 `src/types/index.ts` 中将面板 ID 添加到 `SidebarPanel` 类型
2. 在 `src/components/<PanelName>/` 中创建组件
3. 在 `src/components/Sidebar/SidebarPanel.tsx` 的 `PANELS` 数组中注册
4. 在面板容器的 `switch` 代码块中渲染

### 添加 Monaco 命令

在 `src/assets/monacoHtml.ts` 中，在 `require(['vs/editor/editor.main'], function() {...})` 回调内部：

```js
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, function() {
  rn({ type: 'myEvent', payload: '...' });
});
```

然后在 `MonacoEditor.tsx` 的 `onMessage` 中处理 `msg.type === 'myEvent'`。

### 添加 Git 操作

1. 在 `src/services/git.ts` 中添加函数——所有操作以 `dir`（工作区路径）为第一个参数，并使用 `expoFs` 适配器
2. 从 Git 面板或终端调用
3. 变更后更新存储中的 Git 状态：`setGitStatus(await getStatus(dir))`

### 状态变更

所有读写通过 `useEditorStore` 进行。避免对其他组件也需要的数据使用本地组件状态。在 `src/store/editorStore.ts` 中添加新字段和操作。

## 在实体 iPad 上测试

1. 构建开发客户端：`npx expo run:ios --device`
2. 或使用 [Expo Dev Client](https://docs.expo.dev/develop/development-builds/introduction/)

需要手动测试的关键功能：
- Monaco 编辑器加载（需要网络）
- `⌘S` 保存（需要连接硬件键盘）
- Git 操作需要已初始化 `.git/` 的工作区
- 推送/拉取需要在设置中配置 GitHub Token

## 常见问题

| 现象 | 原因 | 解决方案 |
|---|---|---|
| Monaco 一直显示"加载编辑器…" | 无网络，CDN 被屏蔽 | 连接互联网 |
| Git 状态为空/不正确 | 工作区未初始化 Git | 点击设置 → 初始化仓库 |
| 推送失败"需要鉴权" | 未设置 Token | 设置 → GitHub Token |
| 提交失败"需要作者信息" | 未设置作者信息 | 设置 → Git 作者 |
| 文件更改未反映在 Git 中 | 文件系统不匹配（旧代码） | 确保 git.ts 中使用 `expoFs` |

## 发布检查清单

- [ ] `npm run type-check` 通过
- [ ] 在 iPad 模拟器上测试（12.9" 和 11"）
- [ ] Monaco 加载和保存正常
- [ ] Git：状态、暂存、提交、推送、拉取均可用
- [ ] 搜索返回正确结果
- [ ] 快速打开正确列出文件
- [ ] 键盘快捷键响应正常（⌘S、⌘P、⌘B、⌘\`）
- [ ] 更新 `docs/requirements/` 中的相关规格变更
- [ ] 通过 `scripts/push-wiki.sh` 将 `docs/wiki/` 推送到 GitHub Wiki
