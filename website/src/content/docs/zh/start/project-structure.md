---
title: "项目结构"
description: "找到 SillyMaker 应用和引擎仓库中与修改目标对应的文件。"
---

先由产品简报说明“要改什么”，再使用这张地图。不要先让 coding agent 吞下整个
仓库。

## 仓库职责

| 意图                                  | Owner              |
| ------------------------------------- | ------------------ |
| 可复用运行时或受支持的 workspace 合同 | `engine/packages/` |
| 可复制的 game-first 应用外壳          | `template/`        |
| 用于评价引擎的产品与聚焦示例          | `examples/`        |
| 中立浏览器一致性                      | `e2e/`             |
| 对外双语文档                          | `website/`         |
| 已接受设计、实现事实与 active plan    | `docs/engine/`     |

## 复制后的应用内部

- `sillymaker.config.ts` 选择应用入口、target 与 tooling binding。
- `src/application/` 拥有 Host 组合与产品 UI。
- `src/game/` 拥有游戏的权威规则与 State；纯 GUI 产品会删除这层权威。
- `src/story/` 拥有叙事控制与稳定 text reference。
- `src/scenes/` 及相邻 JSON 文档拥有可创作构图、站位、Motion 与表现数据。
- `assets/content/` 拥有可寻址的多语言 text pack。
- `src/tooling/` 拥有仅开发期 simulation 与 Inspector binding。
- `src/test/` 与产品 E2E 拥有声明的验收证据。

Starter 的当前精确文件地图由
[`template/README.md`](https://github.com/jasl/silly-maker/blob/main/template/README.md)
维护。文件与路线图对当前行为描述不一致时，应根据已实现能力文档和源码核实，
不能把方向性路线图当作已交付代码。
