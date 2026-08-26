---
title: "手动开始"
description: "不依赖 Agent，克隆、安装并运行 SillyMaker starter。"
---

## 运行仓库

SillyMaker 当前要求 Deno 2.9 或更新版本。引擎 package 目前是源码仓库内受支持的
workspace 入口，尚未发布到 npm。

```sh
git clone https://github.com/jasl/silly-maker
cd silly-maker
deno install
deno task app dev template
```

Starter 会以最小可玩应用启动。创建产品时复制 `template/`，然后删除产品不使用的
能力，不要保留空 owner。其 README 负责维护仓库内与仓库外复制的当前步骤。

## 建立第一份基线

在仓库根目录运行：

```sh
deno task app check template
deno run -A npm:vitest run template
```

这些检查只证明未修改的 Starter，不证明新产品已经完成。产品自身仍需单独定义
用户可见范围与验收。

## 选择下一篇指南

- [GUI 应用](../../guides/gui-application/)说明中性的 React 应用路径，以及应删除
  哪些游戏文件。
- [游戏应用](../../guides/game-application/)说明确定性的游戏路径。
- [和 coding agent 一起开始](./)增加共享任务简报、范围清单与证据报告。
