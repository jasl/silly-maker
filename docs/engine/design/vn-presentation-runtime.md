# VN presentation runtime design

状态：2026-07-19 接受的目标设计。§3 的 Semantic Stage V2 合同、纯 mutation reducer 和 StageRenderTarget 投影已在 Base 实现并由 Engine Conformance Story 使用（integer 逻辑坐标/permille 缩放，保持 canonical JSON 约束）；stage 已进入 semantic publication，`SemanticStageHostV2` 以稳定 `layerId:tag` 身份渲染投影目标，settled asset demand 精确跟随当前 target，PoC projector 在 Narrative 活跃时消费 `semantic.narrative.stage` 的背景并降级 route/variant 背景权威。§4 的 Transition 执行已实现：plain `StageTransitionDefinitionV2`/catalog、可注入 Presentation Clock、可复用 `PresentationRunV1` lifecycle、Stage Reconciler（previous/target frame、retained exits、commit-only occurrence、interruption/input policy/reduced-motion/readiness/page-visibility/epoch fencing）与 `SemanticStageV2` 组件；transition edge 不进入 Save，非 barrier completion 不修改 gameplay State。§5 的 PendingInteraction 已实现：Base 提供 `PendingInteractionV2`（say/choice/pause/presentationBarrier/custom）、definitionId/seenRevision/occurrenceId 三重身份、以及 catalog/preview/queue-front dispatch 共用的 `evaluateInteractionResolutionV2`；Engine Conformance Story 的叙事 runner 自动执行纯节点到边界，barrier 由 acknowledged transition 经普通 semantic command 确认（instant settle/reduced-motion 也发确认），headless 可立即完成。稳定演出 Save/recovery 已落地：say/choice/barrier 任意稳定点可存/刷新/载入，load 提升 epoch、按 `loadRecovery: settle` 策略确认恢复的 barrier 而不重放旧动画，浏览器默认 debounced autosave 且 pagehide 刷盘。queue interruption、`loadRecovery: replay`、audio 与之后章节尚未实现。现有 Stage/Narrative V1 可以破坏式重塑，但每次公开合同替换都必须显式迁移并删除旧权威路径；PoC 的死 `activeCueId` 接线已删除。

## 1. Problem statement

SillyMaker 当前已有足够的 Narrative 控制流：line、narration、choice、condition、check、command、checkpoint、jump、call/return、stage cue 和 end。真正的缺口是叙事 Stage State 没有进入统一演出运行时。

PoC 的 `stageCue` 已会折叠进可保存 Narrative State，但 Runtime Presentation projector 仍按 route/Scene Variant 选择背景和人物；`semantic.narrative.stage` 不驱动 Stage/Character renderer 或 asset demand。Stage、Character 和 VN dialogue 因此是三条平行链路。

现有转场主要是新场景 mount 时的固定 CSS opacity-in。它没有 previous scene、target scene、完成、取消、打断、跳过、资源屏障或稳定恢复语义。`activeCueId` 也没有实际 Cue Player。

vNext 的目标是让 Story 定义的叙事、舞台和音频意图形成可保存的语义目标，同时让 UI/Web 安全地执行动画和媒体，而不把 renderer 变成第二 gameplay authority。

## 2. Ownership model

| 能力                 | 权威所有者                                                                 | 保存内容                                                             | 不保存内容                                                   |
| -------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| Stage target         | Story authoritative State，使用 Base 提供的 Stage contracts/reducer/helper | semantic content、layer/tag、placement、appearance 和 camera target  | renderer ID/props、React node、DOM、loaded image、动画进度   |
| Stage render target  | Story projector + UI registry                                              | 由 authoritative State 确定性重建，不单独保存                        | 不成为第二 gameplay State                                    |
| Transition execution | UI Stage Reconciler、Presentation Clock、PresentationRun                   | Story 只保存必要的 pending barrier definition/recovery policy        | transition occurrence、old/target render tree、elapsed time  |
| PendingInteraction   | Base contract；实例属于 Story authoritative State                          | definition ID/revision、每次访问唯一 occurrence ID 和允许 resolution | Promise、callback、focus、typewriter progress                |
| Audio intent         | Story continuous intent；Web Audio Host 调和实际播放                       | BGM/ambient target；当前 voice 与 line interaction 的关联            | transient SFX occurrence、AudioNode、buffer、playback cursor |
| VN player state      | Story State、Host profile、UI transient 三层                               | NarrativeHistory 进 Save；seen/preferences 进 profile                | hover、focus、typewriter cursor、临时 playback execution     |
| Timeline definition  | Base 的 JSON-safe descriptor/validator；Story 用 TS builder 创作；UI 执行  | 必要时保存稳定 cue/wait point                                        | function closure、executor internals、frame progress         |
| Editor               | Node tooling / DevDock                                                     | Story source/data、preview config、diagnostics                       | editor-local React state                                     |
| Rollback             | Session 的 bounded Snapshot checkpoints                                    | Snapshot、RNG、checkpoint metadata                                   | Python-style mutation log、renderer state                    |

Stage 是引擎能力，表示 Base/UI/Web 提供通用合同、纯 reducer、投影和执行器。具体 layer、角色、素材、transition catalog 和内容仍由 Story 定义。Story 可使用引擎提供的可复用 Stage module helper，也可在自己的 State module 中实现同一 contract；一个 Session 内只能有一个 authoritative Stage target。

Base `GameHost` 继续只提供模拟运行时需要的 Host-neutral 能力。DOM、`AudioContext`、`requestAnimationFrame`、页面可见性和媒体 cache 属于独立的 `PresentationHost`/Web adapter；它们不能进入 Base Session，也不能成为 Headless Story 的必需依赖。

## 3. Semantic Stage

### 3.1 SemanticStageState and StageRenderTarget

`SemanticStageState` 是进入 Story authoritative State/Save 的 plain、versioned、validated data。概念结构包含：

- `stageId`/revision；
- 有序 Layer；
- 每个 Layer 中有稳定 Tag 的有序 entry；
- entry 的 semantic content ID、z-order、placement 和 appearance；
- layer transform 和 camera target；

Story projector 将 SemanticStageState、content catalog 和 current semantic projection 确定性映射为非权威 `StageRenderTarget`。只有 RenderTarget 包含 renderer kind/ID、asset IDs、accessibility metadata 和 Strict JSON renderer props。它可以被观察和重建，但不单独进入 Save，也不能反向修改 State。

Transition/cue 是一次“从旧 target 到新 target”的 edge occurrence，不是稳定 StageState 字段。成功 command publication 可以同时产生带唯一 occurrence ID 的 `TransitionRequest`；若剧情必须等待，PendingInteraction 另存 transition definition ID、target identity 和 load recovery policy。Load 只恢复稳定 target/barrier，不把过去 edge 当作从未发生的新 effect。

VN 内部 Layer 不等于当前 `GameStage` 的 background/character/HUD/narrative/system 等应用 UI 层。应用 UI 层决定 React surface；Semantic Stage Layer 决定 playfield 内场景内容的顺序和作用域。

`<layerId, tag>` 是稳定实体身份。相同 Tag 的 show/replace 可以继承显式允许继承的 placement 或 presentation continuity；没有稳定 Tag 的临时 entry 必须拥有自己的 stable instance ID。

第一版保持扁平、有序、可预测的 Stage，不预先实现通用树。background、character 和 prop 足以验证核心。未来受约束 scene graph 可以在不改变 gameplay authority 的前提下扩展 group/mask/effect/camera nodes。

### 3.2 StageMutation

Story/Narrative 通过纯、可验证的 mutation batch 得到下一个 target：

- `show` / `replace`；
- `hide`；
- `clearLayer` / `clearStage`；
- `setPlacement`；
- `setAppearance`；
- `setLayerTransform`；
- `setCamera`。

一个 batch 要么生成完整合法的新 SemanticStageState，要么 rejection/fault 且 State 不变。Mutation 不持有 renderer callback，不能直接启动动画或加载素材。TransitionRequest 只有在包含该 mutation 的 command commit 后才发布。

Stage semantic lint 检查 unknown layer/tag/content、duplicate identity、非法 z-order/transform 和 content reference；projection lint 另外检查 renderer/asset、Strict JSON props 和 accessibility requirements。

## 4. Stage reconciliation and transitions

UI 观察 projected StageRenderTarget 和当前 TransitionRequest，生成非权威 render frame：

```text
StageRenderFrame = previous settled target
                 + next target
                 + retained exiting entries
                 + active TransitionRun
```

Transition definition/request 至少表达：

- stable transition/cue ID；
- kind：cut、crossfade、slide、mask 或 Story-contributed custom renderer；
- duration 和 easing；
- scope：whole stage、layer 或 entry；
- input policy：block、target-active、skip-to-end；
- interruption：settle-and-retarget、cancel-to-target 或 queue；
- reduced-motion fallback；
- asset readiness policy；
- 是否产生 presentation completion acknowledgment。

R3 同时建立最小、可复用的 `PresentationRun` lifecycle：run/occurrence ID、presentation epoch、definition ID、status，以及 start、pause/resume、skip、cancel、settle、observe 和 dispose。Transition Player 是第一个消费者；R5 Timeline 必须复用同一 clock、lifecycle、interruption 和 completion fencing，而不是再造第二套播放器。

Presentation Clock 是可注入 Host-neutral interface。浏览器使用 monotonic clock；unit/headless tests 使用 deterministic/manual clock。Transition Player 必须支持：

- start、tick/observe、complete；
- skip-to-end；
- cancel/interruption；
- page visibility suspension/reconciliation；
- disposal/HMR；
- reduced-motion 下同步或短路到稳定 target。

普通 transition completion 不决定剧情。若 Narrative 明确需要等待演出，Story 保存 `presentationBarrier` PendingInteraction；UI 完成后通过普通 semantic command 提交 expected occurrence/transition ID。Headless adapter 可以立即确认，或由 deterministic clock 推进。旧 callback、重复事件或晚到 HMR generation 不能解决新的 barrier。

Save 不记录 elapsed time。Load/HMR 时 renderer 丢弃旧 transient tree，恢复 target；如果仍有合法 barrier，就按恢复策略重新播放或立即 settle/acknowledge，而不是伪造原动画进度。

每次 projection 产生的 `RuntimePresentationPublication` 还要携带非 gameplay 的 presentation anchor，例如 `{ epoch, cause }`。`cause` 至少区分 bootstrap、dispatch、load、rollback、replay 和 rebootstrap/HMR；load、rollback 或 rebootstrap 会提升 epoch。Transition、voice、SFX 和其他一次性 effect 的迟到 callback 必须同时匹配当前 epoch 与 occurrence/run ID，否则被丢弃。该 anchor 用于隔离表现生命周期，不进入 SemanticPublication、semantic revision、Agent transcript、Game State、Save digest 或 CommandLog。

每个 committed Snapshot 仍然是合法 Save 候选，但浏览器持久化不能因此在每句台词后立即写 IndexedDB。Application composer 接受可注入的 autosave/checkpoint policy，按显式 checkpoint、debounce、最大等待和 page lifecycle 决定何时刷盘；测试可使用同步 policy。节流只影响持久化时机，不改变 Snapshot 是否可保存，也不能让 UI 自行选择另一份 State。

## 5. PendingInteraction

Narrative interpreter 在自动执行纯控制节点后，应停在一个明确、可保存的交互边界：

- `say`：speaker、text/line ID、voice intent、advance policy；
- `choice`：stable choice IDs、visibility/availability、resolution schema；
- `pause`：明确 duration/skip policy 或 semantic resume；
- `presentationBarrier`：等待 stable cue/transition ID；
- 后续可扩展的 custom interaction surface。

每个 interaction 分离：作者稳定的 `definitionId`、用于 seen/text migration 的 `seenRevision`，以及每次进入节点都唯一的 `occurrenceId`。循环、call/return、rollback 后重新进入同一 definition 会产生新的 occurrence；load 可以恢复当前 occurrence，但 application presentation epoch 会变化。所有用户 resolution 通过类似：

```text
narrative.resolve(expectedOccurrenceId, resolution)
```

Session 在 queue front 重检 expected ID、choice availability 和 command precondition。旧 UI、双击、自动播放 timer、voice completion 或 transition callback 不能解决已经变化的 interaction。

PendingInteraction 属于 authoritative State，因为它决定当前允许的 gameplay input 和 Save 恢复点。焦点、typewriter cursor、hover、临时选项动画不属于它。

## 6. Dialogue and player systems

基础 VN Player 包含相互独立的系统：

- **Text reveal**：第一次 confirm 显示全文，第二次才 resolve say；
- **History/backlog**：玩家可读的本次运行台词记录，不等于 CommandLog；
- **Seen registry**：跨 Save/周目的稳定 line/interaction identity，用作者控制的 `seenRevision` 处理文本改写；
- **Auto**：按 text reveal、voice、transition 和偏好决定等待；
- **Skip-read / skip-all**：遇到未读、choice、不可跳过 barrier 或配置边界时停止；
- **Hide UI**：只影响 presentation，不改变 PendingInteraction；
- **Voice replay**：重播当前或 history 中允许重播的 voice；
- **Playback policy**：normal、auto、skip 的一套显式状态机。

History、Seen、CommandLog、Debug replay 和未来 Player rollback 是五个不同概念：

- History 面向玩家阅读；
- Seen 面向“是否已读”和跨周目策略；
- CommandLog 面向诊断；
- Debug replay 面向复现；
- Rollback 面向恢复到可交互的历史 GameSnapshot。

第一版明确采用以下持久化边界：

- NarrativeHistory 是 Story/Narrative authoritative State 中的稳定语义记录，进入 Save，并随 Player rollback 恢复到 checkpoint 对应内容；
- Seen registry 与文本速度、auto wait、skip policy、音量等 preference 属于 Host profile，不进入单个 Game Save，也不随 rollback 撤销；
- 当前 typewriter cursor、hover、focus 和临时 auto/skip 执行状态属于 UI transient state，load 后按 preference 与当前 PendingInteraction 重建。

这不是额外的 presentation Save sidecar；任何进入 Game Save 的 player data 都必须属于版本化、可验证的 Story/Game State 或现有 Save envelope 明确定义的字段。

物理输入事件不进入 CommandLog。Pointer、touch、keyboard 和 gamepad 先由 Host adapter 映射为同一组语义 input actions，再由带优先级和 scope 的 Input Router 分发；只有最终形成的 gameplay semantic command 才进入 Session/CommandLog。VN layer 只消费当前 PendingInteraction 明确支持的 action，未处理 action 必须继续路由，不能无条件吞掉 DevTools、system dialog 或其他 gameplay surface 的输入。

Input action 分为两类：advance/choice 等 gameplay intent 经 SemanticGamePort/Session；history、hide UI、切换 auto/skip 等 player/presentation control 由 VN Player/Profile 处理，除非它们最终 resolve PendingInteraction，否则不伪装成 GameCommand。

## 7. Audio intent and Web Audio Host

Asset manifest 从 image-only 演进到类型化 media resource，至少区分 image、music、ambient、sound effect 和 voice。Save 和 Stage 只引用稳定 AssetId；不保存 URL 推导、decoded buffer 或 audio node。

内置包、Story、Hotfix 和外部资源最终都解析为同一类 manifest entry，但图片、音频、视频和字体保持不同的类型合同，不能伪装成 image。对于声明了 byte size 或 digest 的外部/Hotfix 资源，Host 必须校验实际响应字节；不匹配时产生 integrity diagnostic 并进入 fallback，不能把错误字节登记为 ready。

Story 发布期望播放状态，Web Audio Host 每次 publication 后对账：

- **BGM/ambient**：saveable channel intent，可 loop、fade、queue/replace，并在 load/page resume 后恢复；
- **Voice**：关联稳定 say interaction；advance/skip 时遵循 stop/sustain policy，可 replay；
- **SFX**：成功 publication 产生带唯一 occurrence ID 和 presentation epoch 的 transient effect；避免 projection 重算或 React remount 重放，并且不进入 Save/load；
- **UI sounds**：属于 presentation/input preference，不进入 gameplay State，除非 Story 明确把它当作语义 cue。

Web 层负责 AudioContext unlock、浏览器 autoplay restriction、page hide/resume、decode/cache、volume/mute profile 和 fallback。没有音频权限或素材失败不能阻塞 gameplay；diagnostics 必须说明降级原因。

Audio completion 只有在 Story 明确建立 PendingInteraction 时才影响 Narrative progression，并仍通过 semantic resolution，不由 audio callback 直接写 State。

Transient effect stream 为每个 commit-only occurrence 分配单调 `effectSequence`。Presentation instance 维护有界的 in-memory consumed watermark/set，同一 epoch 内重投影不会重复执行；load/bootstrap publication 不携带历史 effect，因此新 epoch 也不会重放旧 SFX。DebugBundle 可以记录 occurrence 作为证据，但 authoritative replay 默认不把历史 effect 当作新的播放器请求。

## 8. Assets, prediction, and readiness

当前 exact-demand asset loading 继续保留，但 demand 要来自 projected StageRenderTarget、PendingInteraction、continuous audio intent 和 Story overlays，而不是只来自静态 Scene Variant。settled 时 Stage demand 精确等于当前 target；active transition 时必须保留 previous/retained exits 与 target 的并集，settle、retarget 或 dispose 后再释放过期资源。

加入有预算、无副作用的 prediction：

- 从当前 Narrative cursor/interaction 向前遍历有限节点、分支和 call；
- 不执行 gameplay command、不消费 RNG、不决定隐藏 choice；
- 输出可能的 text、image、audio、renderer 和 scene dependency；
- 有最大节点、深度、资源数量和时间预算；
- 预测失败只产生 diagnostic，不改变 gameplay。

Transition readiness policy 可以选择：

- required target assets ready 后开始；
- 立即使用 code-native fallback；
- bounded wait 后降级；
- preload-only，不阻塞交互。

Renderer、只读 PresentationObservation 和 Host tests 能观察 asset demand/readiness/failure；core Agent 只观察稳定 semantic target/intent。只有 Story semantic rules 决定 action availability。

加载器消费显式 `AssetDemandPlan`，而不是永久累积一次性 request。Plan 至少表达 blocking/opportunistic priority、load group、并发/字节预算、取消、retry/backoff 和 retention policy；Stage retarget、Story unload、HMR 或 application disposal 会撤销过期 demand。失败的 settled request 可以按 policy 开启新的 load cycle，不能因为第一次失败被永久缓存，也不能让等待资源阻塞 Simulation progression。

## 9. Timeline and bounded scene graph

ATL 类表达能力进入后续路线图，但使用类型化 TypeScript builder 产生 validated、JSON-safe descriptor：

```text
sequence(...)
parallel(...)
wait(...)
tween(...)
keyframes(...)
repeat(...)
onLifecycle("show" | "hide" | "replace" | "replaced", ...)
```

验证器至少检查 unknown target、非法 duration/easing、并行写冲突、无界 repeat、不可预测资源和 barrier misuse。Timeline 可以暂停、取消、跳过、快进和在 reduced-motion 下映射到稳定 fallback。

自定义 Story React renderer 仍是高级 escape hatch，但不能把任意 closure 写入 Stage/Save。若 custom renderer 需要 gameplay effect，只能发送语义 intent。

受约束 Presentation Scene Graph 在扁平 Stage 被真实内容证明不足后再增加 group、mask、effect、camera、video、Live2D 或 3D adapter。它服务表现，不复制 Godot 的 gameplay scene tree 或 physics authority。

## 10. DevTools and editor path

开发工具按可复用数据面逐步增强：

1. DevDock Stage tree、PendingInteraction、Transition、Audio intent、Asset demand、History/Seen inspector；
2. semantic/presentation diff、Transition clock 和 cue lifecycle；
3. Narrative graph、source diagnostic、资源依赖和 scene preview；
4. Timeline scrubber、normal/reduced/skip 对比；
5. 依据实际创作成本决定可视化 Stage/Narrative/Timeline editor。

Editor 输出普通 TS 或由 TS 引用的稳定 Story data。编辑器预览不得维护一套无法由正常 application/harness 重现的规则实现。

## 11. Player rollback path

Rollback 是后续正式能力，不再被列为永久 non-goal。设计基于现有 immutable GameSnapshot：

- Session 保存 bounded checkpoint ring；
- checkpoint 同时包含 State、RNG、command sequence 和必要 identity metadata；
- Story/engine 声明 soft checkpoint、hard barrier 和 pinned-outcome policy；
- 营业结算、跨日、外部副作用或明确不可逆剧情可以形成 barrier；
- rollback 恢复 Snapshot 后重新投影 settled Stage target、PendingInteraction 和 audio intent；
- renderer transient state、SFX 和 seen profile 不回滚；
- roll-forward choice data 在真实需求出现后增加。

默认 rollback 恢复 checkpoint 中的 RNG state，checkpoint 之后的随机结果随 State 一并撤销；若某个结算需要防止反复重掷，Story 必须显式保存 pinned outcome 或在结算处建立 hard barrier，而不是让 renderer/Host 私自保留随机结果。

这与 Debug replay 不同：Debug replay 从证据重放；Player rollback 是产品允许的历史 Snapshot 导航。

## 12. Migration from current V1

下列当前 API 是首个 PoC 偶然形成的 exact-key contract，可以在 vNext 直接替换：

- `RuntimeStageSceneV1` 的单 background/layout；
- `StageScenePresentationV1` 的静态 Scene Variant；
- Narrative Stage 的 `left | center | right` slot；
- character 直接引用 `poseAssetId`；
- `cut | fade` 二值 transition；
- 无 player 的 `activeCueId`；
- 固定 CSS opacity transition；
- image-only Asset contract。

替换时应选择 V2、明确 state-contract identity 变化或一次性迁移；不得静默向 exact schema 增字段。新 path 通过 E2E Story 后，PoC projector 应真正消费 Narrative Stage，并删除 route/variant 与 Narrative 各自决定人物舞台的平行权威。

## 13. Vertical acceptance

VN foundations 的共同验收是一条 3–5 分钟 Engine Conformance Story 路线：

- 两个背景、两个角色；
- show/replace/hide、进退场、位置、姿势和表情变化；
- cut、crossfade 和一次 move/entry transition；
- BGM、一次 SFX 和关联台词的 voice intent；
- typewriter、advance、choice、history、seen、auto、skip 和 hide UI；
- choice 触发一个真实跨模块 gameplay command，然后返回 SLG/普通场景；
- 在 dialogue、transition barrier 和选择处 Save/load 都恢复稳定 target；
- normal、reduced-motion、skip 和 headless 路线得到相同 authoritative outcome；
- missing image/audio/renderer 有可见 fallback 与 structured diagnostic；
- core Agent 可以观察 SemanticStageState、PendingInteraction 和 Audio intent 并完成整条路线；Browser/PresentationObservation tests 另外观察 asset readiness 和 transition lifecycle；
- 页面 hide/resume、HMR/dispose 和 late callback 不解决错误 interaction。

完整测试策略见 [E2E engine validation](e2e-engine-validation.md)。

## 14. Non-copy and language boundary

本设计吸收成熟 VN 引擎需要解决的问题，不复制 Ren'Py code、schema、naming、parser、object model 或 Save format。Ren'Py 研究证据见 [research note](../../research/renpy-engine-study.md)。

TypeScript/JavaScript 继续是唯一脚本环境；不实现 Ren'Py DSL/ATL parser、Screen Language、Python Store、Displayable tree 或自定义脚本沙箱。
