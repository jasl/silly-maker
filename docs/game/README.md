# Game design index

状态：活动游戏设计索引。当前没有旗舰 Reference Product。2026-08-27 已接受
[VN Reference Tour](../engine/plans/2026-08-27-vn-reference-tour.md) 作为独立 WIP；它完成完整短篇、作者
工作流和产品证据后才成为旗舰。Bookshop 在此期间只承担 maintained minimal Narrative example，不是旗舰或
完整 VN 产品参考；它的教学角色在 VN 完成后再单独评审，不在当前计划预裁。预期届时维护的产品例子是
SillyOS + VN。Cat Cafe 已独立终止，其 revision-1 Save、产品 E2E 与 live 发布责任同步结束。Tavern 题材是
引擎成熟后可能重启的方向之一，不约束当前开发。

## Active design

- [VN Reference Tour](../engine/plans/2026-08-27-vn-reference-tour.md)：从 tracked Template 起步的原创完整
  Visual Novel；以紧凑小产品验证当前推荐 Narrative/Stage、Player/Save/audio/i18n 与 Inspector 作者路径，
  不建立 Ren'Py DSL 或全引擎 API 展厅。

## Stopped historical product direction

- [Electronic Pet Reference Product](electronic-pet.md)：2026-08-27 停止且未完成。M0–M2 与已提交 M3 切片
  保留为历史证据；剩余产品分母不再交付，额外 WIP 仅在 `codex/archive-electronic-pet-m3-wip`。
- Cat Cafe（《雨巷猫舍》）：2026-08-27 产品终止；应用、revision-1 Save 支持、产品 E2E 与 live 发布责任同步
  结束，不迁移到 VN。已证明的通用引擎能力和 dated historical evidence 继续保留。

## Historical direction: Project Tavern

## Product intent that remains useful

Project Tavern 仍以“经营一家酒馆，并通过经营选择推动人物关系与文字叙事”为核心方向。它曾是 SillyMaker 引擎的首个真实使用者（PoC 已退役）。

当前只保留这些高层意图，避免在验证玩法之前过早冻结周期、数值、内容量和系统边界。

## What the first PoC means now

仓库中的七日 PoC 证明了以下工程链路可以组合工作：

- deterministic simulation 与 Story-owned rules；
- 经营、叙事、关系和阶段推进的跨模块命令；
- semantic preview/dispatch 与 React presentation；
- Save、diagnostics、capabilities、automation 和 Web Artifact。

它不再定义最终玩法。以下内容均可推翻或重做：

- 七日结构、每日节奏和终局条件；
- 当前 GameplayModule 划分和 State shape；
- 商品、菜谱、营业、事件、关系和调查公式；
- 货币/数量的值域与数值表示；
- 六种参考策略、阈值、golden 输出和 balance report；
- Tavern 专属 UI 信息架构、Scene 和内容规模。

现有代码在被替换前仍应保持可运行，但不应为了兼容临时数值而阻止更清晰的产品或引擎设计。

## Redesign questions

新的玩法设计应通过原型和试玩回答，而不是从旧 Goal 反推：

1. 玩家反复做出的核心经营决策是什么？
2. 经营资源如何与人物关系、探索/调查和叙事选择产生双向影响？
3. 一个 session、一天、一段 Story arc 各自多长，失败与恢复如何发生？
4. 哪些系统应由通用引擎表达，哪些必须保留为 Story-local 规则？
5. UI 需要哪些可解释的 forecast，哪些不确定性应该保留给玩家发现？
6. 哪些 State 需要高频查询、索引或关系约束，是否值得引入 typed StateStore？
7. 货币和比例是否真的需要 Decimal，还是整数最小单位与清晰上界更合适？
8. 哪一组最小内容足以支持第一次有价值的人工试玩？

## Tavern design documents

- [Presentation and UI redesign](presentation-and-ui.md)：画面框架、视觉语言、素材计划与"能玩"验收；实现随 vNext C3/D/E2 分片推进。

## How a new design becomes active

在 `docs/game/` 新增小而明确的活动文档，而不是编辑历史归档。建议按需要逐步形成：

- `core-loop.md`：玩家循环、时间尺度、成功/失败和反馈；
- `economy.md`：资源、产出/消耗、数量上限和数值政策；
- `relationships-and-story.md`：关系、叙事状态与内容结构；
- `playtest.md`：要验证的问题、样本内容和观察方法。

一项设计只有在文档、可运行原型和相关行为测试一致时才是当前基线。校准工具应服务仍然有效的玩法问题，并尽量复用 simulation/evaluator；不为即将推翻的数值建立大规模冻结语料。

## Engine collaboration

玩法重设计可以推动引擎变化。把反复出现的、与 Tavern 题材无关的需求提升为 SillyMaker 能力；把公式、内容、数值、叙事和特定 projection 保留在 Story 中。

当前引擎架构见 [SillyMaker architecture](../engine/architecture.md)。状态访问的候选演进见 [typed StateStore proposal](../engine/proposals/typed-state-store.md)。两者都应接受真实玩法原型的反馈。

## Historical reference
