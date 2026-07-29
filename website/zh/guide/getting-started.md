# 用 AI 快速开始

用 SillyMaker 最快的方式是完全不碰它：你指挥 coding agent，agent 指挥引擎。装环境、做游戏、调试——下面每一步都是可以直接粘贴给 agent 的 prompt，全程不用离开你的 agent 软件。

**你需要的**：任何能读写文件、执行终端命令的 coding agent 软件（IDE 代理、CLI 代理或云端代理都行；更强的模型只是轮次更少、剧情更连贯）。

## Prompt 1——搭环境

粘给你的 agent：

```text
在这台机器上装好 SillyMaker 引擎：

1. 检查 Deno >= 2.9 是否已安装（`deno --version`）；没有就安装
   （macOS/Linux：`curl -fsSL https://deno.land/install.sh | sh`，
   Windows PowerShell：`irm https://deno.land/install.ps1 | iex`），并确认在 PATH 上。
2. 克隆 https://github.com/jasl/silly-maker 并进入目录。
3. 运行 `deno install` 解析依赖。
4. 运行 `deno task check` 并汇报结果。必须全绿——这是基线，之后你造成的
   任何失败都归你修。
```

Agent 汇报 `deno task check` 全绿时，你就有了一个可工作的引擎，外加整套测试当安全网。

## Prompt 2——做游戏

替换 ⟨括号⟩ 后粘贴。这就是产出 `examples/bookshop` 的同款任务书（一个模型一次交付）：

```text
在这个仓库里创作一个新游戏：⟨一句话题材——例如"夜班出租车司机，
三段乘客故事，两个结局"⟩。

流程要求：
1. 先读 template/AGENTS.md 与 docs/engine/authoring-quickstart.md。
2. 复制 template/ 到 examples/⟨新名字⟩（或仓库外任意目录），全局改名
   （template/Template → ⟨新名字⟩），改 sillymaker.config.ts 与 metadata.json。
   在本仓库内再把目录加进根 project.config.ts 清单；在仓库外则把 package.json
   的引擎依赖改成相对 file: 路径。
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

## Prompt 3——玩与调试

依然不离开 agent：

```text
为 ⟨应用 id⟩ 启动开发服务器（deno task story dev ⟨应用 id⟩），把 URL 给我
在浏览器里打开。然后：
1. 跑一遍所有 simulate 场景，汇总每条路线的终局状态。
2. 运行 `git diff --stat`，确认改动只落在新 Story 目录（加上仓库内的一行 project.config.ts 清单条目）。
3. 如果我报 bug，先在 simulate 场景里复现，修复后重跑全部验收命令。
```

打开它给你的 URL 开玩。想自己动手的话，底下的命令也很朴素：

```sh
deno task story dev <应用id>                            # 浏览器游玩
deno task story simulate <应用id> --scenario <场景名>    # headless 游玩
deno task story simulate <应用id> --scenario <场景名> \
  --trace game.<点路径>                                  # 数值轨迹
```

## 让结果更好的几条建议

- **给具体的题材**——有名字的角色、一个地点、你想要的结局。"做个好玩的"只会得到糊状物；"灯塔看守人，暴风雨夜，陌生人敲门，三种收场"能得到一个游戏。
- **验收清单里要求每条路线一个 simulate 场景**，逼着 agent 把自己写的每条路都真的玩一遍。
- **第一版做小**：一场开场、两三个选择、两个结局。之后按 template 手册的可选接线清单（分享元数据、音频、播放体验、回退、存档安全点）一次加一项。
- **失败信息原样贴回去。** 引擎诊断带节点路径与期望的 occurrence 编号，给原始输出 agent 就能可靠修复。

## 想知道底下发生了什么？

好奇 agent 替你做了什么，或者想亲手来一遍——[手动路径](/zh/guide/manual-setup)用普通命令走同样的步骤；"介绍"一节（[引擎提供什么](/zh/guide/features)、[架构](/zh/guide/architecture)、[核心概念](/zh/guide/concepts)）解释引擎为什么长这样。
