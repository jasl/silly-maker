# 调参与调试

引擎把"调整游戏"当作一等工作流，对人类和代理一视同仁。调参命令走与玩法相同的权威提交路径；会话与存档维护走引擎显式的 lifecycle/persistence port，不建立第二份状态权威。

## 数据优先

大部分调参就是改一行内容表（活动的行动力消耗、事件的权重或条件）。Vite 热更新把改动装进新会话；解析期校验用结构化代码即时报告结构错误。

## DevDock

带 capability 启动任意应用：

```text
http://localhost:5173/?capability=debug_tools&capability=cheats
```

- **状态**：引擎状态与会话维护。一行 **导出状态** / **导入状态**；引擎 **状态查看**（权威 `snapshot.state` JSON）与 **状态编辑**（已有数字/布尔/字符串叶子，写入走 `sillymaker.debug.patch_state`：先校验、原子提交、进命令日志并标记 `source: "debug"`，重放忠实；越界或 schema 拒绝时失败且不暂停会话）。**刷新状态** 把当前权威状态（含状态编辑写入的值）当作存档重新加载，不触发下载；**初始化** 回到标题。两者都要确认。最后一行是 **清空存储**（二次确认后的 Core 清库；部分失败会如实报告）。
- **场景**：冻结/恢复画面时钟；Story 场景工具（如剧情预览）；应用声明 Inspector binding 且 Vite 插件宣告时，**Inspector** 在新标签打开同源 `/__sillymaker/inspector/`。当前界面只提供有界的 Authoring Scene 检视/编辑，不是原来的多 workspace Studio。生产构建以及 Cat Cafe 这类未 opt-in 的应用都没有这项。
- **作弊**：Story 专用 cheat 浮窗（不是引擎能力区）。提交 Story 定义的调试命令——设数值、快进天数、强制事件——同一条提交路径。`cheats` 开启前保持禁用。

从设置里中途打开开发者工具后，状态编辑可能需要重新加载才能写入（debug control 在实例构造时挂上）。上面的 query string 会从第一次加载就挂上。

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
