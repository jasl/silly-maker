# 让 Coding Agent 生成一个游戏

状态：当前实现的操作指南。面向想用 LLM coding agent（Claude、Grok、GPT 等）在本仓库生成新游戏的人。已验证案例：`examples/bookshop`（Grok 4.5 按此流程一次交付，五项验收全过）。

## 原理

仓库为 agent 准备了三层材料，按需喂给它：

1. **手册**（必读，token 便宜）：`template/AGENTS.md` ——起点骨架的改动纪律、引擎基线（免费获得什么）与可选接线清单（音频/回退/存档 guard 等，一项一个入口）。
2. **快速上手**（按任务查）：`docs/engine/authoring-quickstart.md` ——按难度分层的操作指南与诊断速查。
3. **参照实现**（按需抄）：`examples/bookshop`（最小完整剧本）与 `examples/cat-cafe`（全能力旗舰，设计规格在其 `DESIGN.md`）。

引擎的验收命令都输出结构化 JSON，agent 可以自查自纠；确定性模拟（`story simulate`）让它不开浏览器就能玩通自己写的游戏。

## 任务书模板（直接粘贴给 agent，替换⟨⟩内容）

```text
在这个仓库里创作一个新游戏：⟨一句话题材与目标，例如"雨夜出租车司机的三段乘客故事，两个结局"⟩。

流程要求：
1. 先读 template/AGENTS.md 与 docs/engine/authoring-quickstart.md。
2. 复制 template/ 到 examples/⟨新名字⟩，全局改名（template/Template → ⟨新名字⟩），
   在根 project.config.ts 注册应用与 simulate 目标，改 metadata.json。
3. 写剧本（src/narrative.ts + src/presentation.ts 的文本目录）；玩法状态放模块
   （src/state.ts → src/simulation.ts → src/application/semantic.ts → src/story.ts）。
4. 动剧本前先列节点序列表（每个 say/choice 一个 occurrence 编号），场景脚本与
   测试一次写对。

验收（全部通过才算完成）：
- deno task typecheck
- deno run -A npm:vitest run examples/⟨新名字⟩
- deno task story check ⟨应用 id⟩
- deno task story simulate ⟨应用 id⟩ --scenario ⟨每条主要路线一个场景⟩
- deno task check（最终全量）

边界：只 import @sillymaker/* 包出口；不改引擎与其他 Story；不引入新依赖。
```

## 人类怎么验收产出

1. **先跑数字**：`deno task story simulate <appId> --scenario <name>` ——报告里有终局状态与命令序列，路线是否走通一目了然；数值轨迹用 `--trace <dot.paths>`。
2. **再开浏览器**：`deno task dev`（`--mode <appId>`）试玩；对话、选择、结局各点一遍。
3. **查改动面**：`git diff --stat` 应只落在新 Story 目录 + `project.config.ts`（+`vitest.config.ts` 若加了测试 glob）。越界改动（引擎、其他 Story）直接打回。
4. **调参**：设置里打开开发者工具 → DevDock 调参面板改数值即时看效果；存档对比用 `deno task story diff <a> <b>`。

## 常见失败与处理

| 症状                       | 处理                                                                       |
| -------------------------- | -------------------------------------------------------------------------- |
| occurrence 断言失配        | 按失败信息更新编号（新增/删除交互边界会移动编号，见 template README）      |
| `story check` 报叙事图诊断 | 报告里带节点路径：`branch` 目标不在 `successors`、文本 id 缺失等，照改即可 |
| 状态被 canonical JSON 拒绝 | 可保存状态只放整数（`scalePermille` 这类逻辑单位），浮点不入档             |
| agent 改了引擎代码         | 打回：Story 只 import 包出口，引擎问题在任务书外单独提                     |

## 能力升级路线

第一版跑通后，让 agent 按 `template/AGENTS.md` 的"可选接线"清单逐项加：网页分享元数据 → 声音层（先合成占位音频）→ 对话播放 QoL → 玩家回退 → 存档安全点 → 舞台命中区域/内容表。每项在 cat-cafe 都有完整参照。
