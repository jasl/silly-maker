# 调参与调试

引擎把"调整游戏"当作一等工作流，对人类和代理一视同仁。这里没有任何工具绕过权威会话——一切都走游戏本身的提交路径。

## 数据优先

大部分调参就是改一行内容表（活动的行动力消耗、事件的权重或条件）。Vite 热更新把改动装进新会话；解析期校验用结构化代码即时报告结构错误。

## DevDock

带 capability 启动任意应用：

```text
http://localhost:5173/?capability=debug_tools&capability=cheats
```

- **只读检查器**展示实时 game view、交互与带 lint 结果的叙事图。
- **调参面板**（cheat 级）提交 Story 定义的调试命令——设数值、快进天数、强制事件。先校验、原子提交、进命令日志并标记 `source: "debug"`，重放忠实。

## 数值轨迹

```sh
deno task story simulate <app> --scenario <name> \
  --trace game.cat.trust,game.shop.money
```

headless 跑一遍，输出每步数值曲线。改表、重跑、对比。

## 存档对比

```sh
deno task story diff before.json after.json
```

两份导出存档或模拟报告的路径级结构化差异——回答"这两次运行到底在哪里分岔"，而不只是"它们不同"。
