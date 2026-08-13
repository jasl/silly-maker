# 调参与调试

引擎把"调整游戏"当作一等工作流，对人类和代理一视同仁。调参命令走与玩法相同的权威提交路径；会话与存档维护走引擎显式的 lifecycle/persistence port，不建立第二份状态权威。

## 数据优先

大部分调参就是改一行内容表（活动的行动力消耗、事件的权重或条件）。Vite 热更新把改动装进新会话；解析期校验用结构化代码即时报告结构错误。

## DevDock

带 capability 启动任意应用：

```text
http://localhost:5173/?capability=debug_tools&capability=cheats
```

- **只读检查器**从「调试」启动器打开为浮窗，展示实时 game view、交互与带 lint 结果的叙事图。
- **调参面板**（cheat 级）提交 Story 定义的调试命令——设数值、快进天数、强制事件。先校验、原子提交、进命令日志并标记 `source: "debug"`，重放忠实。
- **会话维护**内联在启动器里（不是 cheat 浮窗）：可导出/导入状态、重新初始化，并在二次确认后清理存档槽；如果只有部分槽位清理失败，它会如实报告，不会声称“所有本地数据均已清除”。

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
