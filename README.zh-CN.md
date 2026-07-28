# SillyMaker

[English](README.md) | 简体中文

对 LLM 友好的 TypeScript + React 游戏引擎，面向视觉小说、模拟经营与 RPG 风格的剧情游戏。确定性模拟、语义舞台、原子存档——人类与 AI 代理都能创作，运行在 [Deno](https://deno.com/) 上。

**试玩旗舰示例**：[《雨巷猫舍》](examples/cat-cafe/)是一款为驱动引擎而生的完整可发布游戏——标题屏、日程经营、抚摸命中区域、回合制运动会、成长图鉴、多结局与后日谈、对话播放体验（打字机/自动/快进/历史/回退）、场景驱动的声音层、带安全点的存档槽位、双语文本，以及一步桌面打包。

**再看它跳出类型**：[SillyOS 98](examples/silly-os/) 是一个复古桌面 shell——重叠可拖拽窗口、任务栏、开始菜单、确定性扫雷（雷区来自事务 RNG、绝不泄漏给 UI）、文件随引擎存档持久的记事本，以及一台年代感浏览器。同一台引擎，零视觉小说预设。

## 为什么是 SillyMaker

- **构造上的确定性**——一个会话拥有权威状态；命令要么原子提交、要么不留痕迹；RNG 随快照存储，重放与玩家回滚逐位一致。
- **语义舞台，而非画布**——Story 发布纯数据的舞台目标（内容 ID、位置、外观、命中区域）；渲染器是可替换的 React 组件；存档永不包含渲染器状态。
- **静态数据即内容表**——物品、活动、事件、反应都定义在带类型查询的内容数据库表里并在解析期校验；可变状态归模块；调参就是改一行表数据。
- **同时服务两种作者**——AI 代理有结构化诊断、headless 模拟与创作金丝雀；人类有 DevDock 实时检查器、可写调参面板、数值轨迹与存档对比。

## 快速开始

要求 Deno >= 2.9.0（运行时与包管理器一体；npm 依赖经 Deno 的 Node 兼容层解析）。

```sh
deno install
deno task dev            # Vite 开发服务器（用 --mode <applicationId> 选择应用）
```

常用命令：

- `deno task check`——本地主门禁：格式、静态检查、类型检查与产品级测试套件；
- `deno task test` / `deno task test:e2e`——引擎/游戏行为测试与浏览器用户流程；
- `deno task story <verb> <app>`——应用生命周期 CLI（inspect / check / simulate / dev --smoke / build / desktop，JSON 报告）；
- `deno task site:build`——组装可发布静态站（文档 + 《雨巷猫舍》试玩）到 `dist/site`，经 GitHub Pages workflow 或 `deno task site:deploy:cf`（Cloudflare Workers）发布；见[构建与发布](docs/engine/build-and-release.md)。

开新游戏从复制 [`template/`](template/) 开始（见其 README）；所有应用在 [`project.config.ts`](project.config.ts) 注册。

## 文档

- [文档地图](docs/README.md)——下述一切的索引
- [架构](docs/engine/architecture.md) · [特性](docs/engine/features.md) · [路线图](docs/engine/roadmap.md)
- [开发与测试](docs/engine/development.md) · [Story 编写](docs/engine/story-authoring.md) · [创作快速上手](docs/engine/authoring-quickstart.md)
- [Agent 游戏生成指南](docs/engine/agent-game-guide.md)——把仓库交给 coding agent，收获一个游戏
- [构建与发布](docs/engine/build-and-release.md)（网页、静态托管、桌面打包）
- 对外文档站（VitePress，中英双语）在 [`website/`](website/)

## 仓库结构

```text
engine/packages/base     通用合同、Story 创作、运行时、存档与诊断
engine/packages/tooling  项目配置与 story CLI 命令
engine/packages/ui       通用 React 游戏 UI 与 presentation 运行时
engine/packages/web      浏览器 Host、IndexedDB/HTTP 持久化、挂载与自动化
e2e/                     中立引擎一致性 Story（Engine Lab）
template/                新游戏起点骨架
examples/                示例 Story（bookshop、cat-cafe、silly-os）
project.config.ts        所有应用的注册处
scripts/                 构建身份、资产校验、桌面存档服务器、发布站组装
docs/                    内部工程文档（计划、研究、提案、政策）
website/                 对外文档站（VitePress，中英双语）
```

各 workspace 包均为私有包；"public export" 表示仓库内受支持的包入口，不表示已发布到 npm。

## 许可证

Copyright © 2026 Jun Jiang (jasl)。

整个仓库——引擎、示例、脚本与文档——均为 [MIT](LICENSE.md)。AI 生成与程序合成的媒体资产（`examples/*/assets/**` 与 `art-source/**` 下的图像和音频）以 CC0 1.0 贡献至公共领域：可商用、可演绎、无限制、无需署名。第三方材料保留其自身条款。贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。
