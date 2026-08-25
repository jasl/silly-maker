---
title: "让 Agent 开始"
description: "为 coding agent 提供开发 SillyMaker GUI 应用或游戏所需的最小可靠上下文。"
---

这是使用 coding agent 开发 SillyMaker 项目的统一入口。

## 复制这段 prompt

```text
请作为产品工程师在这个 SillyMaker 项目中工作。
1. 先阅读仓库 AGENTS.md 和目标目录最近的开发手册。
2. 在选择 package 前先判断产品是 GUI 应用还是游戏。
3. 只使用当前公开 package entry 和当前 source-of-truth 文档。
4. State、表现、输入和内容各自只保留一个 owner。
5. 为每个改变运行聚焦验证，并明确报告已验证与未验证的内容。
```

## 选择产品路径

- 产品表面主要是普通 React/CSS 时，继续阅读 **GUI 应用**。
- 产品需要确定性 State、场景、Save 或 replay 时，继续阅读 **游戏应用**。

> **TODO：** Starter recipe 定稿后补充适合仓库外新工程直接复制的完整 prompt。
