# 第一个 Story

> 想交给 AI 做？[用 AI 快速开始](/zh/guide/getting-started)介绍同一流程的代理驱动版。

`template/` 包是一个由 CI 保活的最小可玩、scene-first 游戏。新游戏从复制它开始。动 TypeScript 之前可以先走可视化闭环：`deno task dev` 启动，设置里打开开发者工具，进 **调试 → 场景 → Studio**，直接拖动角色——保存只改 `src/scenes/opening/opening.scene.json`，运行中的游戏热更新。场景文档拥有站位与 cue→motion 绑定；剧本只引用 cue。

## 复制并改名

```sh
cp -R template examples/my-game
cd examples/my-game
# 全局改名：template -> mygame、Template -> Mygame
```

然后在根 `project.config.ts` 注册应用（复制 template 的条目并调整路径与 ID），把包加进根 `deno.json` 的 workspace 列表，跑 `deno install`。

## 关键文件

| 文件                               | 角色                                                      |
| ---------------------------------- | --------------------------------------------------------- |
| `src/scenes/opening/*.scene.json`  | 场景构图：站位/外观/cue→motion 绑定（推荐在 Studio 编辑） |
| `src/narrative.ts`                 | 剧本：say/choice/stage/branch/end 节点与剧情 flag         |
| `src/presentation.ts`              | 文本目录（全部显示文本走 textId）、舞台内容、转场         |
| `src/stage-renderers.tsx`          | 游戏与 Studio 画布共用的舞台渲染器                        |
| `src/state.ts`                     | 模块状态形状、schema、初始值                              |
| `src/simulation.ts`                | 模块、命令与规则                                          |
| `src/application/semantic.ts`      | 动作目录与可用性规则                                      |
| `src/application/ui.tsx`           | React 组件：HUD 与被动 Narrative renderer                 |
| `src/application/composition.tsx`  | 投影、slots、应用声明与 Narrative 绑定（Advanced 层）     |
| `src/tooling/simulation-target.ts` | `story simulate` 的命名 headless 场景                     |

template 把唯一的 production Narrative writer 声明为 `application.ui().narrative`。`defineNarrativeSurfaceV1` 将五项 Story 贡献封装为不透明 `NarrativeSurfaceDefinitionV1`：选取 Narrative 投影、派发语义 resolution、渲染被动 UI、解析本地化文本，以及可选地重播当前语音。引擎拥有的组合层提供 playback、History、profile、时钟、input、focus 与 Stage lifecycle；不要在旁边再挂一个对话播放器。

## 开发循环

1. 改剧本或规则。
2. `deno task typecheck` —— 秒级。
3. `deno run -A npm:vitest run examples/my-game` —— 包内测试。
4. `deno task story simulate my-game --scenario opening` —— headless 通关。
5. `deno task story dev my-game` —— 浏览器里玩。

两条最省时间的规则：动笔前先列完整节点序列（以及从 1 开始的 occurrence 编号）；每个新 say/choice 用全新 `definitionId`，绝不复用。

## 与 AI 代理协作

每个 Story 目录带一份 `AGENTS.md` 手册，含接线表与禁区。把代理指向包目录、说明目标，让 `deno task check` 当裁判。
