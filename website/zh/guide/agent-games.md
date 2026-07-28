# 用 Coding Agent 生成一个游戏

SillyMaker 生来就为 AI 代理创作而设计：仓库自带代理手册（多数 coding agent 工具会自动读取），所有验收命令输出结构化 JSON 供代理自查，headless 模拟让它不开浏览器就能玩通自己刚写的游戏。`examples/bookshop` 正是这样产出的——一个模型接到任务书，一次交付了可玩的游戏。

本页面向拿着自己 agent 工具的人类用户。

## 需要准备什么

- 一个能**读写仓库文件、执行终端命令**的 coding agent 工具。这个品类里的任何工具都可以——IDE 代理、CLI 代理或云端代理；我们不推荐具体模型，但更强的模型通常用更少轮次产出更连贯的剧情。
- 克隆仓库并安装 Deno >= 2.9.0。让代理动手之前先验证基线：

```sh
deno install
deno task check
```

新克隆下 `deno task check` 全绿，之后任何失败都归代理修——这个基线让整个循环保持诚实。

## 为什么几乎不用准备

仓库已经会"对代理说话"：

- 根目录与 `template/`、`examples/`、`e2e/` 里的 `AGENTS.md` 描述了改动纪律、引擎免费提供什么、以及可选接线清单（音频、回退、存档安全点……每项一个入口）。多数 agent 工具自动加载这些文件；如果你的工具不加载，把 `template/AGENTS.md` 粘进对话即可。
- `deno task story check` 与 `story simulate` 输出 JSON 报告，代理可以 headless 验证自己写的每条路线。
- 起点骨架（`template/`）本身是完整可玩的游戏——代理是在改一个能跑的东西，不是从脚手架拼装。

## Prompt 模板

把下面的任务书粘给代理，替换 ⟨括号⟩ 内容。这就是产出 bookshop 示例的同款结构：

```text
在这个仓库里创作一个新游戏：⟨一句话题材——例如"夜班出租车司机，
三段乘客故事，两个结局"⟩。

流程要求：
1. 先读 template/AGENTS.md 与 docs/engine/authoring-quickstart.md。
2. 复制 template/ 到 examples/⟨新名字⟩，全局改名（template/Template → ⟨新名字⟩），
   在根 project.config.ts 注册应用，改 metadata.json。
3. 剧本写在 src/narrative.ts + src/presentation.ts 的文本目录；玩法状态走
   src/state.ts → src/simulation.ts → src/application/semantic.ts → src/story.ts。
4. 动剧本前先列节点序列表（每个 say/choice 边界一个 occurrence 编号），
   场景脚本与测试一次写对。

验收（全部通过才算完成）：
- deno task typecheck
- deno run -A npm:vitest run examples/⟨新名字⟩
- deno task story check ⟨应用 id⟩
- deno task story simulate ⟨应用 id⟩ --scenario ⟨每条主要路线一个场景⟩
- deno task check

边界：只 import @sillymaker/* 包出口；不改引擎与其他 Story；不引入新依赖。
```

## 怎么验收产出

1. **先看数字**：`deno task story simulate <应用id> --scenario <name>`——报告里有每条路线的终局状态与命令序列，路线断没断一目了然，不用先开浏览器。
2. **再亲手玩**：`deno task dev`（`--mode <应用id>`），每条路线每个结局点一遍。
3. **查改动面**：`git diff --stat` 应只落在新 Story 目录 + `project.config.ts`。碰了引擎或其他 Story 直接要求返工。

## 让结果更好的几条建议

- **给具体的题材**——有名字的角色、一个地点、你想要的结局。"做个好玩的"只会得到糊状物；"灯塔看守人，暴风雨夜，陌生人敲门，三种收场"能得到一个游戏。
- **验收清单里要求每条路线一个 simulate 场景**，逼着代理把自己写的每条路都真的玩一遍。
- **第一版做小**：一场开场、两三个选择、两个结局。之后按 template 手册的可选接线清单（分享元数据、音频、播放体验、回退、存档安全点）一次加一项。
- **失败信息原样贴回去。** 引擎诊断带节点路径与期望的 occurrence 编号，给原始输出代理就能可靠修复。
- **留意交互编号。** 增删 say/choice 会移动 occurrence 编号；失败信息会写明期望值，让代理"按失败输出重编号"即可。

仓库内版本（含失败处理手册）见 `docs/engine/agent-game-guide.md`。
