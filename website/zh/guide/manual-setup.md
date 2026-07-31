# 手动路径

这一页就是[用 AI 快速开始](/zh/guide/getting-started)里 agent 替你做的事——同样的步骤，换成普通命令，供你想理解机器或不用 agent 时参考。

SillyMaker 完全运行在 [Deno](https://deno.com) 上：运行时、包管理器与工具链一体。维护开发使用 latest stable；公开兼容下限仍是 >= 2.9.0，不固定 patch。npm 依赖经 Deno 的 Node 兼容层解析。

## 搭环境

```sh
git clone https://github.com/jasl/silly-maker
cd silly-maker
deno install
```

## 跑一个示例

仓库自带可玩示例。`example-cat-cafe` 覆盖了大部分引擎系统（日程、数值、触摸交互、回合制运动会、事件池、元进度、声音、i18n）：

```sh
deno task story dev example-cat-cafe
```

打开输出的 URL。右键是"返回"，`Enter`/`Space` 推进对话，设置对话框可即时切换语言。

## 像项目一样验证

```sh
deno task check        # 格式、静态检查、类型检查、全部单测、story 检查
deno task test:e2e     # 浏览器一致性套件（Chromium + WebKit）
```

`deno task check` 全绿就是本项目对"能用"的定义——维护本项目的 coding agent 在交付前也使用同一道门。

## Headless 游玩

每个应用都声明了不开浏览器就能跑的脚本化场景——与 AI 自动化用的是同一个 Agent 端口：

```sh
deno task story simulate example-cat-cafe --scenario first-day
deno task story simulate example-cat-cafe --scenario first-day \
  --trace game.cat.trust,game.shop.money
```

`--trace` 输出每一步的数值轨迹——这就是调平衡的反馈环。

## 接下来

- [第一个 Story](/zh/guide/first-story)——亲手复制起点模板做成你的游戏。
- [调参与调试](/zh/guide/tuning)——DevDock、调试命令、轨迹与存档对比。
- [核心概念](/zh/guide/concepts)——其余一切构建其上的五个想法。
