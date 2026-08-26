---
title: "和 coding agent 一起开始"
description: "把产品意图转化为具有共享工件与验收边界的 SillyMaker 任务。"
---

SillyMaker 把 coding agent 当作工程内的协作者，而不是演示生成器。要求它实现第一个
切片前，先定义完整结果。

## 先定义什么叫完成

```text
产品目标：
完整的用户可见范围：
必须包含的页面 / 场景 / 路线 / 完整内容范围：
目标设备与输入：
需要人工打磨或不可妥协的部分：
自动验收：
人工验收：
明确不做：
```

除非任务简报明确说明切片就是整个产品，否则一个可玩的纵向切片只是进度证据，
不是产品完成。

## 把这段工作方式交给 Agent

```text
请作为产品工程师工作，而不是只生成一个演示。

修改前：
1. 阅读 AGENTS.md、目标目录最近的 AGENTS.md，以及与本任务有关的当前实现文档。
2. 复述完整的用户可见范围、目标设备/输入、需要人工打磨的部分和验收路径。
   除非任务明确如此，一个纵向切片不等于完成。
3. 找到 State、Scene、内容、表现与输入已有的 owner；复用它们，不创建平行权威。

修改中与完成后：
4. 每次实现一个可审查切片，同时持续维护完整范围清单。
5. 运行聚焦检查；适用时运行 app check/simulate，并执行约定的浏览器与人工路径。
6. 分别报告已完成范围、未完成范围、验证证据与引擎缺口。
```

## 只提供够用的工程地图

- 仓库 [AGENTS.md](https://github.com/jasl/silly-maker/blob/main/AGENTS.md)
  负责把当前任务路由到对应的 source of truth。
- 目标目录最近的 AGENTS.md 定义局部所有权与修改规则。
- [template/README.md](https://github.com/jasl/silly-maker/blob/main/template/README.md)
  把常见产品意图映射到 starter 文件与命令。
- [已实现能力](https://github.com/jasl/silly-maker/blob/main/docs/engine/features.md)
  用于确认一项引擎能力今天是否存在。
- [创作快速开始](https://github.com/jasl/silly-maker/blob/main/docs/engine/authoring-quickstart.md)
  说明当前 Scene、文本、规则与 Inspector 工作流。
- 只有改变 owner 或引擎边界时才阅读
  [架构文档](https://github.com/jasl/silly-maker/blob/main/docs/engine/architecture.md)。
- 路线图只描述方向，不能证明一项能力已经交付。

当前受支持的是从 SillyMaker 源码 checkout 使用的 workspace package 入口，
不是已经发布到 npm 的 package。

## 选择产品路径

- 普通 React 和 CSS 拥有产品表面时，继续阅读
  [GUI 应用](../guides/gui-application/)。
- 产品需要权威 State、场景、Save 或 replay 时，继续阅读
  [游戏应用](../guides/game-application/)。
- 使用[项目结构](./project-structure/)找到首批文件，或
  [手动开始](./manual/)而不使用 coding agent。

## 一起审查结果

要求最终报告分别列出：

1. 已完成的声明范围；
2. 仍然遗漏或只有 placeholder 的范围；
3. 实际执行过的自动与人工证据；
4. 实现产品时发现的引擎缺口。

最终由人类判断证据是否符合原始意图。
