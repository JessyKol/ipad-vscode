# 需求文档目录

iPad VSCode 的版本化产品需求文档（PRD）和技术规格说明。

## 目录规范

```
docs/requirements/
  v{主版本}.{次版本}_{YYYY-MM-DD}/
    PRD.md                        产品需求文档
    spec/
      00_overview.md              系统架构与数据流
      modules/
        01_editor.md              Monaco WebView 模块
        02_filesystem.md          文件系统服务
        03_git.md                 Git 引擎
        04_terminal.md            终端面板
        05_search.md              搜索面板
        06_settings.md            设置面板
      technical/
        07_performance.md         性能目标与瓶颈分析
        08_security.md            威胁模型与防护措施
        09_compatibility.md       系统、设备、键盘、Git 托管兼容性
```

## 版本索引

| 版本 | 日期 | 状态 | 核心目标 |
|---|---|---|---|
| [v0.1](v0.1_2026-05-25/) | 2026-05-25 | 已发布 | 基础架构：iPad 上的 Monaco、统一文件系统/Git、核心功能 |
| v0.2 | 待定 | 计划中 | 设置持久化、可调整面板尺寸、SSH 终端 |
| v0.3 | 待定 | 计划中 | 离线 Monaco、分屏编辑、LSP 精简版 |
| v1.0 | 待定 | 计划中 | App Store 上架就绪 |

## 如何更新

启动新版本时：
1. `cp -r docs/requirements/v0.1_2026-05-25/ docs/requirements/v0.2_YYYY-MM-DD/`
2. 更新每个文档中的版本/日期字段
3. 根据新需求更新 PRD（保留仍然适用的旧需求）
4. 更新变更模块对应的规格文件
5. 为新模块添加新的规格文件
6. 更新本 README 的版本索引

## AI 协作指南

这些文档设计为可供 AI 助手作为上下文使用。

每份文档应当：
- 包含带有版本和日期的头部表格
- 明确列出不变量和约束条件（不只是目标）
- 记录**为什么**做出某个决策，而不仅仅是决策内容
- 清晰列出已知限制——AI 助手需要了解哪些功能存在缺陷，以免延续 bug
- 使用具体示例和数据流，而非抽象描述
