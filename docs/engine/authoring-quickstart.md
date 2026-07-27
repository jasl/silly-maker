# Story authoring quickstart

状态：当前实现的操作指南。面向人类作者与 LLM 代理；按任务难度分层，弱模型应从 A 层开始。概念背景见 [story-authoring](story-authoring.md)，完整能力见 [features](features.md)。

## 0. 一条铁律

Story 代码只 import `@sillymaker/*` 的包出口（`@sillymaker/base`、`@sillymaker/base/story`、`@sillymaker/base/runtime`、`@sillymaker/ui`、`@sillymaker/web`、`@sillymaker/tooling/project`），绝不 import 引擎 `src/**` 路径、绝不 import 另一个 Story。`public-import-boundary` 测试会拒绝违规。

优先从 `@sillymaker/base/story` import：它以无版本后缀的名字导出当前代作者契约（`SemanticStageState`、`StageMutation`、`PendingInteraction`、`NarrativeGraph`、`reduceStageMutations`、`evaluateInteractionResolution`…），与带后缀的原名完全等价。

## A 层：改剧本、文本与选择（推荐弱模型从这里开始）

以 Engine Lab（`game/stories/e2e`）为可运行示例。剧本是普通 TypeScript 数据，不是 DSL：

| 想改什么                 | 改哪个文件                                                        |
| ------------------------ | ----------------------------------------------------------------- |
| 对白、旁白、选项文字     | `src/presentation.ts` 的 `labTextCatalogsV1`（textId → 文本）     |
| 剧情节点、分支、舞台指令 | `src/gameplay/narrative.ts` 的 `labNarrativeScriptV1`（节点数组） |
| 语音/BGM 映射            | `src/gameplay/audio.ts`                                           |
| 图 lint 的静态标注       | stage 节点的 `mayShow`、branch 节点的 `successors`                |

节点种类：`say`（speakerTextId/textId/next）、`choice`（options：choiceId/textId/requiresSamples/consumesSamples/next）、`stage`（`mutations(stage)` 返回 StageMutation 数组，`mayShow` 静态声明可能展示的 contentId）、`branch`（`choose(context)` 纯函数选 next，必须落在 `successors` 内）、`pause`、`barrier`、`custom`、`end`。新增 say/choice 必须给全新的 `definitionId`（`interaction.<story>.<name>`），不要复用。

每次修改后的验证环（快到可以每改一次就跑）：

```sh
pnpm typecheck                                # 类型与契约
pnpm exec vitest run game/stories/e2e/src/test/narrative-graph.test.ts   # 图 lint 干净 + 标注诚实
pnpm story simulate e2e --scenario calibration   # 无浏览器跑完整叙事，JSON 输出
pnpm test:conformance:headless                # 全部 headless 一致性测试
```

改动会移动 occurrence 编号（每个交互边界按顺序编号）：`simulate` 的 `calibration` 场景脚本和若干测试按编号步进，剧本插入新边界后要同步它们——失败信息会直接给出期望/实际编号。

## B 层：新增玩法模块（中等；F2 canary 验证过的路径）

新模块 = 四个接线点，全部在 Story 包内：

1. `src/gameplay/state.ts`：状态接口 + zod schema + 初始值，挂进聚合状态。
2. `src/gameplay/simulation.ts`：`kit.defineStatefulModule`（owner 的 propose/apply）、命令进 `LabCommandV1`、事实进 `LabFactV1`、拒绝码进 `LabRejectionCodeV1`、执行器里开事务（跨模块写用 `transaction.propose(otherModule, …)`，同命令原子提交）。
3. `src/application/semantic.ts`：动作 id 进目录 + `blockedBy` 可用性规则（目录/预览/派发共用这一个函数）。
4. `src/story.ts`：state-contract manifest 加模块条目（**模块 id 必须按字典序**），并按下表同步版本号。

版本同步规则（错了会在启动时被结构化诊断拒绝，照着改即可）：

| 改了什么             | 必须动什么                                                                |
| -------------------- | ------------------------------------------------------------------------- |
| 模块状态 schema 形状 | 该模块 `stateSchema.revision` + `moduleContractRevision`                  |
| 模块规则/命令语义    | `moduleContractRevision`                                                  |
| 新增/删除模块        | manifest 条目 + `aggregateStateSchema.revision` + `stateContractRevision` |
| 以上任意             | story `identity.revision` +1，并更新测试里的 `storyRevision` 断言         |

## C 层：新应用/新 Story（建议强模型执行）

一个应用 = 一个 `WebGameApplicationV1` 声明 + 一次 `startWebGameApplicationV1` 调用；参照 `game/stories/e2e/src/application/`。在 `game/project.config.ts` 注册后，六个生命周期动词即可用：

```sh
pnpm story inspect <app>    # 解析身份与程序报告
pnpm story check <app>      # 结构化 Story 诊断
pnpm story simulate <app> [--scenario s] [--seed n]
pnpm story dev <app> --smoke
pnpm story build <app>
pnpm story prebuilt-smoke <app>
```

## 常见诊断速查（全部来自真实踩坑）

| 症状                                                                                               | 原因与修复                                                                                |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `story.contract_invalid: State-contract module IDs must be strictly increasing`                    | manifest 模块条目没按 id 字典序排列；重排即可                                             |
| `story.simulation_invalid: State-contract manifest does not match GameSimulation stateful modules` | manifest 与 `composeModules` 的模块/版本不一致；按上面的版本表同步                        |
| `story.nondeterministic: Story definitions differ`                                                 | `define()` 每次返回了新对象；把定义提为模块级常量                                         |
| `interaction.occurrence_mismatch`                                                                  | 拿旧的 occurrenceId 去 resolve；从最新 publication 的 `narrative.pending.occurrenceId` 取 |
| `CanonicalJsonError: number.not_integer`                                                           | 可保存状态里出现了浮点数；用整数逻辑单位（如 `scalePermille`）                            |
| `e2e.ui_text_missing:<textId>`                                                                     | 剧本引用了未登记的 textId；在文本目录补条目                                               |
| `narrative.successor_missing` / `narrative.pure_loop`（图 lint）                                   | 节点 `next` 指向不存在的节点 / 纯节点成环且无交互边界；诊断带指回定义的位置               |
| 测试断言 occurrence 编号失配                                                                       | 新增边界使编号后移；按失败信息更新编号                                                    |

## 给 LLM 代理的执行建议

- 一次只做一层的事：A 层任务不要顺手改 B/C 层文件。
- 每一次编辑后立即跑 A 层验证环，用诊断驱动下一步，而不是批量修改后猜错误。
- 泛型实例化（`WebGameApplicationV1` 有 15 个类型参数）永远抄现有应用声明整体修改，不要从零手写。
- 引擎行为疑问先读 `docs/engine/features.md` 对应小节，不要读引擎源码猜。
