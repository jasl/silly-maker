# 快速开始

SillyMaker 是面向视觉小说、养成模拟和轻 RPG 的 TypeScript + React 引擎。引擎、工具和你的游戏都运行在 [Deno](https://deno.com)（>= 2.9）上。

## 环境准备

```sh
git clone <repository>
cd silly-maker
deno install
```

## 跑一个示例

仓库自带可玩示例。`example-cat-cafe`（雨巷猫舍）覆盖了大部分引擎系统（日程、数值、触摸互动、回合制比赛、事件池、元进度、i18n）：

```sh
deno task story dev example-cat-cafe
```

打开输出的 URL。右键是"返回"，`Enter`/`Space` 推进对话，设置对话框可以即时切换语言。

## 用项目的方式验证

```sh
deno task check        # 格式、lint、类型、全部单测、story 检查
deno task test:e2e     # 浏览器一致性套件（Chromium + WebKit）
```

## Headless 游玩

每个应用都声明了无浏览器可跑的场景脚本——与 AI 自动化使用同一个 Agent 端口：

```sh
deno task story simulate example-cat-cafe --scenario first-day
deno task story simulate example-cat-cafe --scenario first-day \
  --trace game.cat.trust,game.shop.money
```

`--trace` 输出每步数值轨迹——这是平衡调参的反馈回路。

## 下一步

- [核心概念](/zh/guide/concepts) —— 支撑一切的五个想法。
- [第一个 Story](/zh/guide/first-story) —— 复制起点模板，改成你的游戏。
- [调参与调试](/zh/guide/tuning) —— DevDock、调试命令、轨迹与对比。
