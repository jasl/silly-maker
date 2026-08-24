# 第一个 Story

> 想交给 AI 做？[用 AI 快速开始](/zh/guide/getting-started)介绍同一流程的代理驱动版。

`template/` 包是一个由 CI 保活的最小可玩、scene-first 游戏。新游戏从复制它开始。动 TypeScript 之前可以先走有限的可视化闭环：从仓库根运行 `deno task author template` 启动 Template dev server，再打开其同源 `/__sillymaker/inspector/` 页面（reference DevDock 也会宣告这个入口）。独立 Inspector 列出 Authoring Scene，以 Layer/Object 层级显示真实 Stage，并通过仅开发期 CAS 端口修改 local transform、visual content/appearance 和绘制顺序。保存写入 `src/scenes/opening/opening.authoring-scene.json`；对象创建、cue/Motion 定义及其他未覆盖字段仍直接编辑源文件。场景文档拥有构图与 cue 绑定；剧本只引用 cue。

## 复制并改名

```sh
cp -R template examples/my-game
cd examples/my-game
# 全局改名：template -> mygame、Template -> Mygame
```

然后在根 `project.config.ts` 注册应用（复制 template 的条目并调整路径与 ID），把包加进根 `deno.json` 的 workspace 列表，跑 `deno install`。

## 关键文件

| 文件                                        | 角色                                                               |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `src/scenes/opening/*.authoring-scene.json` | 场景层级、站位、外观与 cue 绑定（有限 Inspector + 直接编辑源文件） |
| `src/story/narrative.ts`                    | 剧本：say/choice/stage/branch/hold/end 节点与剧情 flag             |
| `src/content/presentation.ts`               | 文本目录（全部显示文本走 textId）、舞台内容、转场                  |
| `src/ui/stage-renderers.tsx`                | 游戏与 Inspector 预览共用的舞台渲染器                              |
| `src/game/state.ts`                         | 模块状态形状、schema、初始值                                       |
| `src/game/simulation.ts`                    | 模块、命令与规则                                                   |
| `src/application/semantic.ts`               | 动作目录与可用性规则                                               |
| `src/application/ui.tsx`                    | React 组件：HUD 与被动 Narrative renderer                          |
| `src/application/composition.tsx`           | 投影、slots、应用声明与 Narrative 绑定（Advanced 层）              |
| `src/tooling/simulation-target.ts`          | `story simulate` 的命名 headless 场景                              |

template 把唯一的 production Narrative writer 声明为 `application.ui().narrative`。`defineNarrativeSurfaceV1` 将五项 Story 贡献封装为不透明 `NarrativeSurfaceDefinitionV1`：选取 Narrative 投影、派发语义 resolution、渲染被动 UI、解析本地化文本，以及可选地重播当前语音。引擎拥有的组合层提供 playback、History、profile、时钟、input、focus 与 Stage lifecycle；不要在旁边再挂一个对话播放器。

Inspector 是刻意受限的编辑面，不是原来的五 workspace Studio。专用 Flow、Chrome 与 Regions 编辑 UI 已退出；Narrative Flow 投影、`*.chrome-layout.json`、`*.regions.json` 及其运行时合同仍是受支持的数据/代码面，直接编辑并用 Story check 与测试验证。

## 开发循环

1. 改剧本或规则。
2. `deno task typecheck` —— 秒级。
3. `deno run -A npm:vitest run examples/my-game` —— 包内测试。
4. `deno task story simulate my-game --scenario opening` —— headless 通关。
5. `deno task story dev my-game` —— 浏览器里玩。

两条最省时间的规则：动笔前先列完整节点序列（以及从 1 开始的 occurrence 编号）；每个新 say/choice 用全新 `definitionId`，绝不复用。

## 与 AI 代理协作

每个 Story 目录带一份 `AGENTS.md` 手册，含接线表与禁区。把代理指向包目录、说明目标，让 `deno task check` 当裁判。
