---
title: "手动开始"
description: "不依赖 Agent，克隆、安装并运行 SillyMaker starter。"
---

## 运行仓库

SillyMaker 当前要求 Deno 2.9 或更新版本。

```sh
git clone https://github.com/jasl/silly-maker
cd silly-maker
deno install
deno task app dev template
```

Starter 会以最小可玩应用启动。创建产品时复制 `template/`，然后删除产品不使用的能力，不要保留空 owner。

## 选择下一篇指南

- **GUI 应用**说明中性的 React 应用路径。
- **游戏应用**说明确定性的游戏路径。

> **TODO：** 补全独立复制和第一次发布的完整流程。
