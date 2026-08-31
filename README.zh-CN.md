# SillyMaker

[English](README.md) | 简体中文

面向 GUI 应用与游戏的人类–Agent 共创引擎，使用 TypeScript 和 React 构建。
SillyMaker 把产品意图落实为共享、可检查的工件与可执行验收：人类定义并打磨结果，
coding agent 在同一组所有权边界与运行证据内实现。浏览器与
[Deno](https://deno.com/) Desktop preview 是当前目标。

**查看维护中的旗舰 VN Reference Product**：
[《最后一次试音》](examples/vn-last-sound-check/) 是原创、完整的双路线 Visual Novel，验证当前推荐的
Narrative/Stage、Player、Save、音频、本地化、响应式与 Inspector 作者路径。它的可发布 Browser artifact
已接入静态站构建；本仓库不声称已经执行远程 live deployment。

**探索 GUI 产品方向**：[SillyOS](examples/silly-os/) 当前随附 **Agent Creator** 与
**Translation** 两个 bundled Programs。Creator 把创作意图整理进可审查的 Program 工作区；
Translation 在一个持久 Process 内完成导入、Agent 候选、人工审查与结果接受。Bundling
只决定分发和发现，两者使用相同的固定 Program 容器与运行规则，不存在特权 Program 类。
确定性的本地预览仍然可用；配置后的 Browser Provider
路线则在 Agent Worker 中运行产品固定版本的 Pi，经 typed Worker RPC 接入，
并使用浏览器本地 Program 数据库与 OPFS mutable workspace checkpoint。当前已交付恢复与
单写者 ownership 合同、Chromium/WebKit 的 20 MiB 级存储门禁，以及来源存储估算/
持久化请求 UI。SillyOS 使用公开、传输中立的 Agent Session client，但 Pi wire、Agent Host、
Programs、Provider UI 和持久化仍由产品拥有；这不代表已经提供 public Agent Host ABI、
Desktop 持久化。当前 mutable Workspace head 已可下载为 canonical ZIP，accepted immutable
snapshot 也会在本地保留；accepted snapshot 下载与完整产品的便携导入/恢复尚未实现。

## 为什么是 SillyMaker

- **引擎就是协作 Harness**——工程地图、结构化源工件、明确 owner、诊断、模拟、
  浏览器证据与人工审查，让 coding agent 始终面对同一份完成定义。只要声明的
  产品范围尚未完成，可玩的纵向切片就仍然只是切片。
- **受支持路径上的确定性**——一个会话拥有权威状态；经准入的命令要么原子提交、要么不留痕迹；事务性 RNG 随快照存储，受支持的重放与回退路径会复现已记录结果。
- **语义舞台，而非画布**——Story 发布纯数据的舞台目标（内容 ID、位置、外观、命中区域）；渲染器是可替换的 React 组件；存档永不包含渲染器状态。
- **静态数据即内容表**——物品、活动、事件、反应都定义在带类型查询的内容数据库表里并在解析期校验；可变状态归模块；调参就是改一行表数据。
- **人类控制保持明确**——当前开发期 Inspector 支持有限的 Authoring Scene 编辑和
  只读 runtime facet；代码与源数据仍是一等公民。更完整的共享编辑器是演进方向，
  不是已经交付的无代码承诺。

## 快速开始

要求 Deno >= 2.9.0（运行时与包管理器一体；npm 依赖经 Deno 的 Node 兼容层解析）。

```sh
deno install
cd template
deno run dev             # 启动这个应用自己的 Vite 服务
```

常用命令：

- `deno task check`——本地主门禁：格式、静态检查、类型检查与产品级测试套件；
- `deno task test` / `deno task test:e2e`——引擎/游戏行为测试与浏览器用户流程；
- `deno task app <verb> <app>`——显式选择目标的仓库应用 CLI（dev / inspect / check / simulate / build / desktop，适用时输出 JSON 报告）；
- `deno task site:build`——组装可发布静态站（文档 + 旗舰 VN，并链接到独立部署的 SillyOS）
  到 `dist/site`，经 GitHub Pages workflow 或
  `deno task site:deploy:cf`（Cloudflare Workers）发布；见
  [构建与发布](docs/engine/build-and-release.md)。

开新产品从复制 [`template/`](template/) 开始（见其 README）。它以游戏为默认起点；
纯 GUI 产品使用文档中的复制后删减 recipe，不保留空的游戏 owner。每个应用都是
带自己 `sillymaker.config.ts` 的独立项目；根
[`project.config.ts`](project.config.ts) 只为仓库级聚合命令列出应用目录。

## 文档

- [文档地图](docs/README.md)——下述一切的索引
- [架构](docs/engine/architecture.md) · [特性](docs/engine/features.md) · [路线图](docs/engine/roadmap.md)
- [开发与测试](docs/engine/development.md) · [Story 编写](docs/engine/story-authoring.md) · [创作快速上手](docs/engine/authoring-quickstart.md)
- [Agent 游戏协作指南](docs/engine/agent-game-guide.md)——把完整产品简报转化为可审查的
  实现切片与验证证据
- [构建与发布](docs/engine/build-and-release.md)（网页、静态托管、桌面打包）
- 对外文档站（Astro + Starlight，Markdown/MDX，中英双语）在 [`website/`](website/)

## 仓库结构

```text
engine/packages/base     通用合同、Story 创作、运行时、存档与诊断
engine/packages/tooling  项目配置与 application CLI 命令
engine/packages/ui       通用 React GUI/游戏 UI 与 presentation 运行时
engine/packages/web      浏览器 Host、IndexedDB/HTTP 持久化、挂载与自动化
e2e/                     中立引擎一致性 Story（Engine Lab）
template/                新游戏起点骨架
examples/                维护中的产品（最后一次试音、SillyOS）
project.config.ts        仓库级聚合命令使用的应用目录清单
scripts/                 构建身份、资产校验、桌面存档服务器、发布站组装
docs/                    内部工程文档（计划、研究、提案、政策）
website/                 对外文档站（Astro + Starlight，中英双语）
```

各 workspace 包均为私有包；"public export" 表示仓库内受支持的包入口，不表示已发布到 npm。

## 许可证

Copyright © 2026 Jun Jiang (jasl)。

整个仓库——引擎、示例、脚本与文档——均为 [MIT](LICENSE.md)。`examples/*/assets/**` 与 `art-source/**` 下的项目媒体资产以 CC0 1.0 贡献至公共领域：可商用、可演绎、无限制、无需署名。贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。
