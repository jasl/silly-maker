# SillyMaker R5–R7 execution plan

状态：2026-07-28 接受执行；同日 T1（Timeline）、T2（DevTools 数据面）、T3（玩家回滚）全部完成并进入 feature list，defer 表保持有效。承接 [roadmap](../roadmap.md) R5–R7 与 [vn-presentation-runtime](../design/vn-presentation-runtime.md) §9–§10 的已接受合同。R8 与下列 defer 项不在本计划内。

## 顺序与理由

1. **T1 — R5 Typed Timeline**：演出密集 Story 的硬前置；复用 R3 的 PresentationRun/Clock/interruption/fencing。
2. **T2 — R6.1/6.2 DevTools 数据面**：runtime inspector（Stage/PendingInteraction/Transition/Audio intent/History inspector 面板）与 Narrative graph 可视化；提高后续真实 Story 中模型自查效率。
3. **T3 — R7 Player rollback**：依赖 Snapshot/Stage 重投影/Audio intent/PendingInteraction 恢复均已稳定，放最后风险最低；先在 Engine Lab 验证，再谈产品策略。

外部、未发布的验证 workload 与本计划并行，其产出的中性需求证据决定 defer 项是否激活（边界见 [assets-and-references](../../policies/assets-and-references.md) 的 Unpublished validation replicas 节）。

## 明确 defer（本计划不做，激活需真实 Story 证据）

| Defer 项                                                                                 | 来源       | 激活条件                                         |
| ---------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------ |
| `keyframes(...)` 语法糖                                                                  | R5/设计 §9 | tween 组合被真实剧本证明太啰嗦                   |
| `onLifecycle("show"/"hide"/...)` 自动绑定                                                | 设计 §9    | 显式 `play_cue` 被证明不够（如入场动画普遍需要） |
| 受约束 Presentation Scene Graph（group/mask/effect）                                     | R5         | 扁平 Stage 被真实 Story 证明不足                 |
| layer transform 作为 timeline target                                                     | R5         | 真实剧本需要整层动画                             |
| Stage 预览、Timeline scrubber UI、可视化 editor                                          | R6.3–6.5   | 依据实际创作成本决定                             |
| video/Live2D/骨骼/Rive/WebGL adapter                                                     | R8         | 真实 Story 需求逐项决定                          |
| ~~旗舰示例的 rollback 产品策略~~（已落地：雨巷猫舍以开赛/结局确认为 barrier + HUD 回退） | R7         | 已交付（2026-07-28）                             |

## T1 — Typed Timeline（R5）

**合同（Base）**：JSON-safe `TimelineDefinitionV1`（`timelineId` + step 树：`sequence`/`parallel`/`wait`/`tween`/`repeat`/`event`），目标为 `{kind:"entry",layerId,tag}` 或 `{kind:"camera"}`，属性为整数逻辑通道（offsetX/offsetY/scalePermille/opacityPermille）；`parseTimelineDefinitionV1` 拒绝 unknown kind、非法 duration/easing、无界或过深 repeat、parallel 分支对同一 target+property 的写冲突；纯函数 `timelineDurationV1` 与 `evaluateTimelineAtV1(definition, elapsedMs)`（返回通道值 + 应已触发的 event 序列 + 完成态），执行器因此保持薄且可确定性测试。TS builder 与手写 literal 产出同一契约（沿 narrative graph 先例）。

**执行器（UI）**：`createTimelinePlayerV1` 复用 `PresentationRunV1` + `PresentationClockV1`；`play(definition)` 返回句柄（pause/resume/skip/cancel/fastForward/observe/dispose）；skip 立即 settle 终值并按 fencing 一次性补发未发 event；cancel 停在当前值；reduced-motion 下 play 即 settle（稳定 fallback）；epoch 变更丢弃过期回调；timeline 只改 presentation 值，不触碰 gameplay State/Save。

**集成**：`SemanticStageV1` 接受可选 timeline catalog，per-entry/camera 的 presentation overlay 叠加在 settled 渲染之上；`presentation.play_cue` intent 经既有 cue writer 触发；Engine Lab 增加一条真实 cue（校准完成的信标脉冲 + event 触发 SFX）作为垂直证明。

**验收**：手动时钟下 evaluator/播放器确定性单测（含 pause/skip/cancel/repeat/parallel/fencing/reduced-motion）；Engine Lab headless 数字与 command log 不受 cue 影响；浏览器 spec 观察 cue 生命周期 data-attribute；normal/reduced-motion 终态一致；features/design 状态更新。

## T2 — DevTools 数据面（R6.1–6.2）

- DevDock 增加只读 inspector 面板：语义舞台目标（层/条目/相机）、PendingInteraction 三重身份、活跃 transition/timeline 状态、Audio intent、NarrativeHistory 与 Seen 概要；全部读 publication/observe 面，不引入第二权威。
- Narrative graph 面板:复用 `NarrativeGraphV1` 投影渲染节点/边/不可达与 lint 诊断定位；graph 数据来自 Story 的既有投影函数，DevDock 不解析剧本。
- 验收：面板数据与 headless observe 一致的组件测试；capability 门控不变（player DOM 无 debug 词汇）；浏览器 spec 冒烟。

## T3 — Player rollback（R7）

- Base：有界不可变 checkpoint 环（区别于 CommandLog 与 Debug replay 的玩家向 rollback surface）；默认随 Snapshot 恢复 RNG；`pinned-outcome`/`hard-barrier` 政策合同（防重掷、结算/跨日、不可逆剧情标记边界）。
- 恢复语义：回滚恢复 authoritative Snapshot，并重投影 settled Stage target、Audio intent 与 PendingInteraction；presentation epoch 前进；renderer transient 不恢复。
- Engine Lab：叙事中段回滚（跨 say/choice/barrier）、SLG 命令后回滚、pinned RNG 结果的防重掷证明、rollback 与 autosave/手动存档的互不污染。
- 验收：headless 确定性测试 + 浏览器 spec；History/Seen/profile 的 R7 所有权按设计合同落地；docs 更新。

## 原创 Story 缺口交付记录（2026-07-28，随《雨巷猫舍》）

[中型 SLG 能力验证](../../research/2026-07-28-medium-slg-capability-validation.md)记录的三个通用压力不再 defer；它们已由原创 `examples/cat-cafe`（设计规格 `DESIGN.md`）和正式测试独立交付：

- 内容数据库（缺口 A/B）：`defineContentTableV1`/`createContentDatabaseV1`，六张真实表消费（活动/随机事件/部位反应/技能/对手/图鉴），adoption gate 由设计规格满足。
- 语义舞台命中区域（缺口 C）：内容目录按 contentId+appearance 解析 `hitRegions`，host 渲染可聚焦命中层，指针/触摸/键盘同路径；抚摸玩法浏览器 spec 验收（`hit-regions.spec.ts`）。
- Host 元进度命名空间（缺口 E）：`PlayerProfileV1.meta` 单调映射 + `markMeta`，图鉴相册跨存档验证。

i18n 工作流保持 defer：架构已支持多 locale 目录，工具在真实翻译需求出现时再立项（猫舍已交付双语目录与缺键对等测试，验证了架构侧无缺口）。

[DoL 对照复查](../../research/2026-07-28-dol-engine-gap-review.md)（2026-07-28）新增证据行：

| 项                                                    | 来源                                | 状态                      |
| ----------------------------------------------------- | ----------------------------------- | ------------------------- |
| 条件事件池原语（筛选+加权随机+可解释+强制覆盖）       | DoL 复查 §2A + 猫舍"常客小剧情"设计 | 建议立项，设计先行        |
| debugCommand 通道的 DevDock 可写面板 + Story 参考实现 | DoL 复查 §2B                        | 建议立项，引擎契约已在    |
| `story simulate --trace` 数值轨迹输出                 | DoL 复查 §2D                        | 建议立项，纯 CLI 增量     |
| 快照结构化 diff（Base 纯函数 + `story diff`）         | DoL 复查 §2C                        | 小件，随上两项            |
| 文本目录合并器、分层立绘合成、场景预览器              | DoL 复查 §2E                        | defer，激活条件见复查文档 |

## Promotion 纪律

沿 roadmap §5：每个 T 完成时 focused tests + Engine Lab 覆盖 + docs 更新 + 被替代路径删除，缺一不算完成。
