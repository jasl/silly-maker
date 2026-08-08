# Managed Surface lifecycle execution plan

状态：2026-07-30 接受执行，2026-07-31 按 readiness、application epoch、external
reconcile、dormant-kernel boundedness/action provenance 与 Overlay cutover
决策重切片；2026-08-01 PF2 的 S1-T 与 S2 Workspace Overlay pilot 已 promotion；
2026-08-04 冻结 PF4/S3 System topology、atomic initial-candidate supersede、
retained-active pending cancellation、exact result/delta matrix、Host-commit readiness、
StrictMode、API cutover 与 stop conditions。
同日 S3a dormant definition/slot/result/snapshot floor 与两个 package-internal
atomic composite operations、S3b composition-owned shared Coordinator 与 dormant System
session/config catalog、S3c.0 composition-wide successor activation barrier、dormant
S3c.1 Host-commit readiness/one logical Host lease 与 S3d exact-parent confirmation child
均已完成；下一独立实施切片为 S3e live cutover and promotion。
目标合同见
[Managed Surface lifecycle and contract harness](../design/surface-contract-harness.md)。
本文只规定可独立交付的实施顺序；不要求一次实现 design
中所有可选字段，也不把作者能力评测绑进 runtime migration。

在 [production-floor sequence](2026-07-30-production-floor-sequence.md)
中：PF2 的 `S0 -> S1-T -> S2`、PF-DET 与 PF3/M2 已完成；当前 core
节点是 PF4/S3e。PF4 的顺序是 `S3 -> S1-R -> S4 -> S4b`；S5–S6
属于 PF6。S1-R
延后到第一个真实 externally published stable-target family 前完成；按 accepted
target ownership，S4 Narrative 计划成为该 family，因此 S1-R 位于 S3 与 S4
之间。若更早的 family 改为 externally published stable target，必须把 S1-R
整体前移到该 family 之前，不能把 source revision 字段预埋进 transient API。

## 1. Outcome

所有会改变 input、focus、dismiss、inert 或 z-order 的 UI surface 最终由一套 transient lifecycle authority 解释：

- Workspace Overlay；
- System dialogs；
- Narrative dialogue/history；
- whole-canvas primary/detail recipes；
- 未来由明确 adapter 接入的 Agent workspace surfaces。

Coordinator 不拥有 gameplay/conversation/document/workspace
的持久业务状态。对于 Coordinator-owned transient target，它直接解释明确的
open/replace/push/close intent；对于 externally published stable target，它只在
S1-R 后把 owner publication reconcile 成 runtime surface instances。两条路径都原子
发布 topology、routing/focus ownership、dismiss policy 与 readiness，但 transient
路径不伪造 source publication revision 或 stable reconcile 字段。

## 2. Scope control

### Required S1-T / Overlay fields

S1-T 与 Overlay pilot 只冻结能够直接防止现有 bug 的 transient 字段：

- `surfaceDefinitionId`；
- `surfaceDefinitionContractRevision`；
- request/target parameter schema（只用于 admission
  validation/normalization，不形成 stable reconcile vector）；
- renderer resolver identity 与 required ports；
- `surfaceInstanceId`（每次 preparation/runtime attempt 唯一）；
- `ownerId`；
- `slotId` / parent instance（适用时）；
- root slot 是 Coordinator/topology-recipe global scope，child slot 是 exact
  parent-instance scope；cardinality 由 resolved slot descriptor 提供，不由 owner
  namespace 或 candidate 自报；
- `topologyRevision`；
- `publicationRevision`；
- `layer`、`modality`、managed input policy 与 focus policy；blocking、input、
  focus 与 lifecycle navigation owner 独立派生；
- dismiss policy（escape/backdrop/routed cancel）；
- tagged focus policy（`none` 或 initial/trap/restore）；
- tagged managed input policy（`none` 或 context/owner）；
- lifecycle（preparing/active/suspended/exiting）；
- readiness state；
- 按 initial open、primary replacement、child/detail open 区分的 definition-level
  readiness policy；
- `applicationEpoch`（Managed Surface action/readiness 的 presentation/runtime
  fence）；
- Coordinator 生成的 transient target occurrence。

S1-T/S2 的 transient target、handle、action/readiness envelope 与 publication
不得为了未来 S1-R 预埋 source publication revision 或 reconcile cursor。

### Required S1-R fields

第一个 externally published stable-target family 激活前，S1-R 另行冻结：

- stable target owner 与 owner/publisher-lease-minted monotonic occurrence；
- 复用 S1-T 已声明的 definition contract revision；
- definition schema validation/normalization 后的 Strict Canonical Data 与
  canonical parameter bytes；
- owner/publisher lease；
- per-owner source publication revision；
- stable readiness receipt 的 source revision fence。

### Deferred until evidence

以下字段/机制不进入 S1-T/S1-R public contract，除非对应 migration trace
证明缺失：

- 把 application epoch 扩张到普通非 Surface semantic action payload（Managed
  Surface 与既有 non-Surface input envelope 仍按 design 携带
  `applicationEpoch`）；
- application-level end-to-end receipt；
- general postcondition language；
- one envelope shared by semantic, workspace and presentation actions；
- full seeded explorer DSL；
- Mod contribution registry；
- weak-model capability floor。

设计文档可以描述终局可能性，执行计划必须以最小可验证合同推进。

## 3. S0 — Reproduce fractures and freeze current behavior

在任何 Coordinator 代码前，建立命名回归：

1. non-dismissible Overlay 的 Escape/backdrop/routed cancel 一致；
2. 同 kind replacement 不复用前一 instance 的 React local state/focus history；
3. 未配置 renderer/port 的 System dialog 在 open 边界结构化拒绝，不出现 store active/render absent；
4. Stage layer 顺序只有一个 runtime descriptor source；
5. Dialogue/History 打开时 narrative input isolation、focus capture/restore 与 Escape 语义明确；
6. pointerup 导致 surface 同步卸载后，浏览器遗留 click 不命中下层；键盘 click 不被 pointer fence 误吞；
7. delayed readiness 在 surface replace/close 后不能激活旧 instance；
8. owner dispose 后没有 live input/focus registration。

测试分层：

- store/reducer focused tests；
- React + jsdom composition；
- Engine Lab real browser pointer/keyboard；
- 不依赖 sleep、偶然坐标或截图像素。

**S0 acceptance：** 每个问题有失败测试或可复现 trace，且 trace 指向 observable behavior，不固定内部文件数量或 commit hash。

### S0 evidence record（2026-07-30）

本表只冻结现状与 repair gate，不表示相关 family 已迁移。`green` 是当前战术
行为已有正常回归；`red` 是在临时 expectation harness 中实际观察到的
observable fracture。临时 red harness 在记录结果后删除，常规测试不保留
expected-failure。

| # | 状态           | 可重复 evidence                                                                                                                                                                                                                                                                                                                                                      | Repair gate                                                                                                                   |
| - | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1 | green          | [`overlay-host.test.tsx`](../../../engine/packages/ui/src/overlays/overlay-host.test.tsx) 的 locked Overlay 用例同时验证 backdrop、routed cancel、native Escape 都不关闭且不下穿；显式业务 close 仍可用。                                                                                                                                                            | S0 已冻结；S2 从 publication 读取同一 dismiss policy。                                                                        |
| 2 | red            | 同一个 primary slot 先渲染 `alpha` editor，写入 draft 并把 focus 移到 secondary control，再 `openPrimary("beta")`。实际 beta 复用同一 input DOM，draft 仍为 `dirty`，focus 仍在 secondary；期望 fresh instance、空 draft、initial focus。                                                                                                                            | S1-T 提供 `surfaceInstanceId`；S2 用它作为 React key。不得用 overlay ID 临时拼 key。                                          |
| 3 | red            | `SystemDialogHostV1` 不配置 `saves`，调用 `openSaves(null)`。实际没有 dialog，但 store 为 `{ active: "saves" }`、cancel 落到 gameplay；当前 `void` controller 也无法返回 structured rejection。                                                                                                                                                                      | S3 迁移 System family 时在 intent/open 边界拒绝；不在 PF2 双写旧 store 与 kernel。                                            |
| 4 | green          | [`game-stage.test.tsx`](../../../engine/packages/ui/src/shell/game-stage.test.tsx) 验证 exact descriptor order、slot→host 与同名 z token；`GameStageV1` 的 package-internal frozen descriptor tuple 是 order/slot/inert/omit/pointer/portal 的唯一 runtime source。                                                                                                  | S0 已冻结；不扩张为 public Story API。                                                                                        |
| 5 | red            | Engine Lab Chromium 打开 Dialogue 后同时观察：background 没有 `inert`、`继续`没有 initial focus；打开 History 后按 Escape，History 仍存在。当前行为已明确记录，但不冒充 accepted dismiss policy；三项均是 role/test-id 可见行为，不依赖坐标或 sleep。                                                                                                                | S4 原子迁移 Narrative/History，并在迁移前冻结 per-definition Escape policy；PF2 不给 `DialoguePanelV1` 增加第二套 lifecycle。 |
| 6 | green          | [`pointer-gesture-fence.test.ts`](../../../engine/packages/ui/src/shell/pointer-gesture-fence.test.ts)、[`game-stage.test.tsx`](../../../engine/packages/ui/src/shell/game-stage.test.tsx) 与 [`input.spec.ts`](../../../engine/packages/web/e2e/engine/input.spec.ts) 分别验证 `detail=0/1`、caller 同步卸载后的下层 action、Stage capture 阻断以及 focused Enter。 | S2 保留为 Stage/Web tactical adapter；不成为 Story-owned state。                                                              |
| 7 | red            | 最小 harness 保存 `const staleReady = () => store.openPrimary("old")`，随后 replace、close，再执行旧 callback。实际 store 从 closed 重新变为 `{ primaryId: "old" }`。这是 `unrepresentable_with_current_overlay_contract` 的 proxy trace：旧 store 没有 readiness API，也没有 instance/revision identity 可表达 stale rejection。                                    | S1-T 实现 stale readiness receipt；S2 用 Overlay pilot 证明 replace/close fence。                                             |
| 8 | green baseline | [`system-dialog-host.test.tsx`](../../../engine/packages/ui/src/system/system-dialog-host.test.tsx) 在 active Host unmount 后同时验证 store closed、dialog removed、System input handler removed、DevDock focus target 回到 base；Overlay Host 的现有用例覆盖 input unregister 与 focus restore。未接入 live Story 的 `VnLayerV1` 不作为 Dialogue lifecycle 证据。   | S1-T 增加 headless owner/Coordinator dispose；S2 删除或只读化 Overlay 旧 lifecycle authority；Narrative cleanup 留给 S4。     |

因此 S0 的八项 evidence 已齐，但 #2/#3/#5/#7 仍故意保持为已复现、
未修复 fracture。PF2 只继续 S1-T 与 S2；S1-R 不阻塞 Overlay，System 和
Narrative 的 repair 分别留在 S3、S4，不能为了让 S0 全绿而提前迁移。

## 4. S1-T — Package-internal transient lifecycle kernel

### Ownership

- `@sillymaker/ui`：definition types、Coordinator/reducer、immutable publication、React bindings；
- `@sillymaker/web`：DOM focus/inert/top-layer/pointer/visibility adapters；
- `@sillymaker/base`：不感知 React/DOM/Surface，不分配 application epoch；只有已有
  semantic publication/intent 契约按需复用；
- Application composition root：拥有 monotonic application-epoch allocator
  与 successor dispose/ingress 顺序；
- Story：提供 definitions、renderer contribution 与 typed intent，不手写 epoch、
  lifecycle counters、global listeners、raw z-index 或 focus manager。

### Kernel operations

S1-T 最小操作集：

- open / replace / push child / close top / close owner；
- begin / acknowledge / fail / cancel readiness preparation；
- route dismiss intent；
- route action against application epoch + instance + topology revision；
- dispose owner/Coordinator；
- rotate application epoch only through composition-root successor handoff。

每个操作返回 **surface transition receipt**（applied/unchanged/stale/rejected/faulted + stable code）。它只描述 Coordinator transition，不冒充 semantic command 或 workspace document mutation。

### Publication invariants

一次 Coordinator commit 原子发布：

- ordered active topology；
- topmost blocking surface；
- current input owner、focus owner 与 lifecycle navigation target；
- per-instance lifecycle/readiness；
- publication revision；
- topology revision；
- diagnostics/owner trace。

禁止 renderer 旁读另一个更快更新的 writable store拼帧。React key 使用 `surfaceInstanceId`。

### S1-T tests

- pure reducer transition table；
- duplicate instance/slot/parent、invalid transition、stale revision；
- replace/push/back topology；
- locked dismiss；
- readiness stale ack；
- initial/replacement/child readiness policy 与 cancellation matrix；
- epoch rotation、old-Coordinator disposal 与 successor ingress fence；
- dispose cleanup；
- immutable publication 与 subscriber failure isolation。

以下 S1a–S1d 是在本次重切片前形成并归入 S1-T 的历史 delivery record。各记录保留
当时的目标、非目标、计数与状态，不把后续接受的 epoch/readiness 决策倒写为已实现。
其中 S1d 记录的 undeclared-action fallthrough、S1a/S1b 的 append-only retired
ID，以及 S1a/S1c 从 candidate/input owner 推导 slot/navigation 的语义，只是当时的
dormant baseline；2026-07-31 审计已确认它们不能进入 live pilot，分别由
S1d.1/S1d.2/S1d.3 修正后才允许继续 S1e/S1f。

### S1a delivery record（2026-07-30）

本切片只建立 dormant、package-internal 的 transient/synchronous 纯模型基础，不将
S1 标记为完成。

**目标：**

- 固定 transient target occurrence、runtime instance、routing lease、
  application epoch 与 topology revision 的分离身份；
- 以纯 reducer 原子生成 frozen topology、blocking、input/focus owner、
  lifecycle/readiness 与 owner trace；
- 覆盖 single primary 的 open/replace、child push、expected close、dismiss、
  owner/Coordinator dispose，以及 stale/ABA fence。

**非目标：**

- 不接入现有 Overlay/System/Narrative store，不建立第二份 live authority；
- 不公开 Story API，不加入 `@sillymaker/ui` barrel/package exports；
- 不实现 external target reconcile、target parameter equality 或 source
  publication revision；
- 不选择异步 readiness 的 retain-previous/blocking-fallback 策略，不实现 ready
  ack；
- 不实现 Coordinator subscriber store、route action、DOM/React/Web adapter 或平台
  primitive。

**验收证据：**

- direct-file-only contracts/reducer 无 DOM、React 或现有 writable store 依赖；
- lifecycle 术语固定为
  `preparing/active/suspended/exiting`，当前同步 reducer 只产生
  `active/suspended + ready`；
- primary 明确为 single slot；child 不得落在 parent 的更低 layer；
- occurrence、instance 与 routing lease 分别拒绝 live duplicate 和 retired ABA
  reuse；
- stale epoch/revision/instance、locked dismiss 和所有 rejection 保持原
  state/publication identity；每个 applied transition 只递增一次 topology
  revision；
- publication 深冻结并 defensively copy definition/target；input context 直接复用
  现有 `InputContextIdV1`，可注册到真实 InputRouter；
- focused reducer `11/11`、`@sillymaker/ui` `51 files / 424 tests` 与 aggregate
  typecheck 通过。

### S1b delivery record（2026-07-30）

本切片在 S1a 纯 reducer 外建立 dormant、package-internal、application-local 的
transient Coordinator store；S1 仍未完成。

**目标：**

- 由一个 monotonic allocation sequence 确定性派生 transient occurrence、
  runtime instance 与 routing lease，rejection 不回滚或复用序号；
- 以 frozen `{ applicationEpoch, topologyRevision, surfaceInstanceId }` handle
  绑定 expected close、replace 与 child push；
- applied transition 先提交 immutable publication 再通知 subscriber 一次；
  unchanged/stale/rejected 不发布；
- 隔离 subscriber 与 best-effort failure sink 异常，owner/Coordinator dispose
  原子清理并保持幂等。

**非目标：**

- 不接入现有 Overlay/System/Narrative store，不加入 public barrel 或 Story API；
- 不实现 external target reconcile、异步 readiness、route action、close-top、
  React/DOM/Web adapter 或 subscriber reentrancy policy；
- 不定义 application epoch 的全局分配或 HMR/rebootstrap 轮换策略。

**验收证据：**

- reducer 的 replace/push 也校验 exact epoch/revision/instance evidence，旧 callback
  不能替换 successor 或向已经变化的 parent 拓扑追加 child；
- allocation 产生 `surface-{occurrence|instance|lease}.e<epoch>.n<sequence>`，
  failed attempt 消耗序号且 close/reopen 不复用；
- handle 不在调用时自动刷新；`getHandle` 只为当前 live instance 捕获新的精确
  evidence；
- subscriber 在 commit 后观察新 publication；单个 listener 或 failure sink
  抛错不回滚、不阻断后续 listener；
- Coordinator dispose 提交 frozen terminal publication、通知现有 subscriber
  一次后清空订阅；重复 dispose 不通知，late subscribe 稳定拒绝；
- focused reducer/Coordinator `19/19`、`@sillymaker/ui`
  `52 files / 432 tests` 与 aggregate typecheck 通过。

### S1c delivery record（2026-07-30）

本切片只补齐 transient/synchronous close convenience；S1 仍未完成。

**目标：**

- `closeTop()` 显式关闭调用时同一 frozen publication 的 current input owner，而
  不是重新搜索 topmost blocking 或可 dismiss Surface；
- `closeOwner(ownerHandle)` 以 frozen epoch/revision/owner evidence 一次关闭该
  owner 的全部 live topology/subtree，但不把 owner 标为 disposed，允许 fresh
  reopen；
- close commit 一次递增 topology revision、退休 occurrence/instance/lease，并
  在同一 publication 恢复下层 input/focus/owner trace。

**非目标：**

- `closeTop()` 不是 Back，也不是异步 callback fence；指定 occurrence 或延迟
  callback 必须继续使用 `closeExpected(handle)`；
- 不实现 route action。完整 managed input route 仍需 canonical
  `gestureId`/`inputPublicationRevision`、registration-captured routing lease 与
  InputRouter/Web 的分层 outcome；Coordinator 不伪装成 semantic dispatcher；
- 不改变 dismiss policy，不接入 external stable targets、现有 writable stores、
  React/DOM/Web adapter 或 public API。

**验收证据：**

- locked Surface 的 Back 仍稳定拒绝；显式 closeTop 可关闭它且不下穿；
- lower blocking 与 higher non-blocking 并存时，closeTop 关闭 publication 的
  higher input owner，再原子恢复 blocking owner；
- owner handle 不自动刷新；close → fresh reopen 后旧 owner handle 返回 stale，
  不能关闭 successor；
- owner root 与 child 在一个 revision 中一起关闭，其他 owner 的 input/focus
  同 commit 恢复；reopen 产生新的 occurrence/instance/routing lease；
- empty closeTop unchanged 且不发布；
- focused reducer/Coordinator `21/21`、`@sillymaker/ui`
  `52 files / 434 tests` 与 aggregate typecheck 通过。

### S1d delivery record（2026-07-30）

本切片补齐 dormant、package-internal 的 Managed Surface route-action admission 与
InputRouter binding seam；S1 仍未完成。

**目标：**

- 固定且只接受
  `applicationEpoch/surfaceInstanceId/surfaceTopologyRevision/actionId/gestureId/inputPublicationRevision`
  六字段 canonical envelope；
- 由 registration closure 捕获 routing lease 与 frozen action catalog，不把 lease、
  target occurrence 或 semantic occurrence 塞入 caller envelope；
- declared dispatch 前把同一 managed gate 重新登记到 current input context 的
  LIFO 顶端；稍后注册的 ordinary handler 不能抢在 stale admission 前执行；
- Coordinator 依序校验 epoch、topology、live instance、current input owner、
  captured routing lease 与 current action catalog，valid route 保持 publication
  identity 与 topology revision 不变；
- 以 event-identity bridge 复用现有 InputRouter precedence/snapshot/LIFO 行为，并将
  stale targeted action 消费在旧 registration，禁止穿透 successor 或 lower owner。

**非目标：**

- 不改变 public `InputEventV1`、`InputRouterV1` 或 handled/ignored 结果；binding
  不加入 UI root barrel/package exports；
- 不发送 semantic/workspace action，不组合 universal application receipt，也不改变
  Save/replay 或 Base；
- 不接入 Overlay/System/Narrative、React/DOM/Web gesture lifecycle，不实现
  readiness、application epoch rotation 或 external owner reconcile。

**验收证据：**

- valid declared action 返回独立的 `surface.action_routed/unchanged` admission；
  input 仍按 ordinary handler 的 consumed/unhandled 结果决定，不发布、不通知
  subscriber；undeclared action 保留普通 InputRouter fallthrough 且没有 Surface
  receipt；
- stale epoch/topology/instance、非 input owner、stale captured lease 与 unpublished
  action 有确定性 receipt；stale input publication/gesture 在 ordinary handler 前
  consumed；
- InputRouter 在 dispatch 开始时 snapshot registrations；高优先级 handler 同轮
  replace + rebind 后，旧 gate 仍以旧 evidence 返回 stale 并 fence lower，successor
  只处理下一次 route；
- 同 context 在 binding 后注册的 ordinary handler 仍位于 managed gate 之后；
  stale route 不触达它，valid route 则按普通 LIFO 顺序继续；
- gesture-currentness injection 前后都复查 binding publication；回调同步 rebind
  时旧 route 返回 stale，且不会复活已注销 gate 或下穿 ordinary handler；
- public action event 与 router own keys 有 exact runtime guards；
  registration、action event、handler/route outcome 与 router methods 有 exact
  type guards；internal binding 不从 `@sillymaker/ui` 导出；
- focused route-action `15/15`、相邻 reducer/Coordinator/InputRouter
  `4 files / 77 tests`、`@sillymaker/ui` `53 files / 449 tests` 与 aggregate
  typecheck 通过。

### S1d.1 — Managed action provenance closure

Live audit 已确认 package-internal binding 在 `actionId` 不属于 captured catalog 时
直接调用 `InputRouter.route()`。因此一个明确由 Managed Surface binding 创建的
envelope 会绕过 epoch/instance/topology/lease/gesture fence，并且旧 binding 在
rebind、dispose 后仍能触达 ordinary/lower handler。该行为在 dormant kernel 中没有
production caller，但在 Overlay cutover 前是 blocking defect。

**目标：**

- 任何通过 Managed Surface binding `createEnvelope`/`route` 的 action 都保留
  Surface provenance；unpublished action 进入 Coordinator admission，返回
  `surface.action_unpublished`（或同义稳定 code）并被 input route 消费；
- stale publication/gesture、rebind、binding dispose 与 owner/Coordinator dispose
  后的 binding-origin action 全部 fail closed，不能调用 ordinary/lower handler；S1e
  再把 successor epoch 接入同一 admission path；
- 只有从未经过 Managed Surface binding、直接进入 InputRouter 的普通 input event
  保留当前 snapshot/LIFO/fallthrough 语义；
- 不改变 public `InputEventV1`/`InputRouterV1`、不把 internal binding 导出，也不
  发送 semantic/workspace action。

**TDD 与验收：**

- 先翻转现有 undeclared/rebind/dispose tests，记录它们仍触达 lower handler 的
  focused red；
- valid declared action 的 current behavior 与 receipt 不变；unpublished、stale、
  disposed case 的 lower-handler count 精确为 `0`，publication identity/revision
  不变；
- direct untagged InputRouter event 仍能由 ordinary handler consumed/unhandled；
- focused route-action、相邻 Coordinator/InputRouter、UI package 与 aggregate
  tests 全绿。

**2026-08-01 S1d.1 delivery：** focused red 在原实现上得到 `17 tests / 4 failed`：
current unpublished action 没有 Surface receipt，旧 publication、owner dispose 与
Coordinator dispose 后的 binding-origin action 仍可绕过相应 admission；现有
rebind case 的 ordinary/lower handler count 会从 `1` 累加到 `2`、`3`。最小修复
删除 binding route 与 managed gate 中两处 captured-catalog early-out，使所有
binding-origin action 经过既有 publication/gesture fence 与 Coordinator
`routeAction`；未携带 package-internal provenance、直接进入 InputRouter 的 event
仍走原有 snapshot/LIFO/fallthrough。

green path 对 current unpublished action 返回 `surface.action_unpublished`，对
stale publication/gesture、rebind、binding dispose、owner dispose 与 Coordinator
dispose 全部 fail closed；每次 route attempt 的 lower-handler count 为 `0`。
owner/Coordinator dispose 先正常提交各自的 topology transition；随后被拒的 queued
或新建 route 保持已提交的 post-dispose publication identity/topology revision，且不
增加 subscriber notification。valid declared action 的 handled/unhandled receipt 与
direct untagged event 的 handled/ignored fallthrough 保持不变。验证为 focused
`18/18`、相邻 action
route/Coordinator/reducer/InputRouter `4 files / 80 tests`、UI package
`58 files / 490 tests`、aggregate `205 files / 1874 tests`，`deno task check`
全绿。该切片没有改变 public event/router/export、canonical Surface envelope 或
semantic/workspace action，也没有实现 S1d.2 及其后续工作；下一独立切片是
S1d.2。

### S1d.2 — Bounded transient identity

Live reducer 当前永久保存 `retiredOccurrenceIds`、`retiredInstanceIds` 与
`retiredRoutingLeaseIds`，每次 transition 都 copy/dedupe、每次 admission 都线性
scan；长生命周期 churn 的内存为 O(history)，累计工作可退化为 O(N²)。同时
`disposedOwnerIds` 也会随动态 owner 历史追加。该 dormant state 必须在
readiness/pilot 前改成由 resolved owner domain 与 allocator cursor 有界的模型。

**目标：**

- transient occurrence/instance/routing lease 由 Coordinator construction 已注入的
  epoch + monotonic local allocator/cursor seam 生成；production candidate 不能绕过
  该 seam；本切片不决定 epoch 的 composition-root ownership/successor 单调性，留给
  S1e；
- Coordinator construction 同时注入并冻结 finite resolved-owner domain；它不从
  首个 candidate 动态学习 owner。unknown/late owner 的 open/replace/push/dispose
  在 identity allocation 与 publication mutation 前拒绝；这只是 owner admission，
  S2 才接完整 definition/schema/renderer/port/slot preflight；
- reducer 保留 resolved owner domain、live/pending identity 与 bounded allocator
  cursors/high-water，不保留 append-only retired-ID arrays；disposed owner 由
  bounded resolved-owner set/bit 表达，不随任意 owner churn 增长；
- external stable-target occurrence 的 bounded non-reuse 留给 S1-R 的
  owner/publisher lease，不在 transient state 预埋 source cursor。

**TDD 与验收：**

- 先以 10,000 次 deterministic open/replace/close churn 证明当前 retired arrays
  精确增长和历史相关 copy/scan，再翻转为 state size 只与 resolved owners +
  live/pending + bounded cursors 有关；不使用 wall-clock 门禁；
- 同一 Coordinator lifetime 已发行 identity 的 replay/reuse 与 stale handle 仍
  拒绝，fresh allocation 永不复用；本切片不伪造 successor epoch，跨 successor
  sequence/旧 handle fencing 由 S1e 验收；不把 TypeScript brand 误写成 arbitrary
  untrusted-token security boundary；
- empty/finite owner domain、duplicate owner declaration、unknown candidate 与 unknown
  `disposeOwner` 有 focused tests；invalid owner 的 allocator cursor、publication/
  topology revision、live identities 与 subscriber count 全为零变化；
- reducer/Coordinator/publication state 不再有历史 tombstone collection，所有
  focused/UI/aggregate tests 全绿。

**2026-08-01 S1d.2 delivery：** 由 3,333 轮中性、确定性的
`open -> replace -> close` 和一次 final open 组成的 10,000 次 transition，在原实现上
产生三个各含 `6,666` 项的 retired-ID arrays，共 `19,998` 个历史 tombstone。按实际
spread/dedupe 与
fresh-candidate admission 路径推导，该 workload 分别遍历 `99,999,999` 个历史
copy/dedupe input entries 与 `66,653,334` 个 retired-ID admission entries；这些是由
operation 序列和 collection 长度得出的确定性计数，不是 wall-clock 门禁。保留该
characterization 后翻转 bounded assertions，focused red 精确失败在仍存在、长度为
`6,666` 的 `retiredOccurrenceIds`。

最小实现把三个 append-only arrays 替换为 current-epoch scalar allocation
high-water，并要求 candidate 携带 allocator provenance；occurrence、instance 与
routing lease 必须与 epoch/sequence 的 canonical 派生值逐字一致。replay allocation
与伪造单项 identity 均 fail closed，fresh allocation 继续严格递增。Coordinator
construction 现在 defensive-copy 并冻结 finite resolved-owner domain；duplicate
declaration 同步拒绝，empty domain 合法，unknown open/replace/push/dispose 在分配、
publication、revision 与 subscriber notification 前拒绝。disposed-owner 状态只能
包含该有限 domain 的成员，重复 dispose 保持同一 state identity。

green workload 精确得到 topology revision `10,000`、allocation high-water `6,667`、
一个 live `e14.n6667` instance、一个 resolved owner、零 disposed owner，以及零
retired/tombstone collection。验证为 focused reducer/Coordinator/action-route
`3 files / 44 tests`、`@sillymaker/ui` `58 files / 495 tests`、aggregate
`205 files / 1879 tests`，`deno task check` 全绿（含所有 Story check 与 Engine Lab
production build）。该切片没有决定 composition-root epoch ownership，没有新增
public export/live Surface family，也没有实现 S1d.3+；下一独立切片是 S1d.3。

### S1d.3 — Slot scope and independent topology axes

Live publication 当前把最高 active instance 同时设为 input/focus owner，并让
`closeTop` 从 input owner 反推 lifecycle target；slot cardinality 也由 candidate
definition 携带。两个不同 owner 还能同时占用同名 root slot。这些 dormant semantics
必须在 readiness/pilot 前单独冻结。

**目标：**

- root slot 在 Coordinator/topology recipe 中全局 scoped；child slot 以 exact
  parent instance scoped；cardinality 来自 resolved slot descriptor，删除
  definition/candidate 的 cardinality override。owner 仍是 source/lifecycle/dispose
  authority，但不 namespace root slot；
- resolved input 与 focus policy 使用可表达 `none` 的 tagged shape；
  modality/blocking、input participation/owner、focus ownership/restore 与
  lifecycle navigation target 各自派生；`closeTop`/Back 使用明确 navigation
  target，不从 input/focus owner 猜测；
- 增加 publication revision 与 active topology revision 的区分：任意 immutable
  publication commit 推进前者，只有 active topology/action/input fence 变化才推进
  后者；本切片先冻结现有同步 open/replace/push/close/dispose 操作的规则，现有
  applied topology transition 同时推进两者，unchanged/rejected 为 `0/0`，现有
  action/gesture envelope 继续绑定 topology revision；无 live topology 的 resolved
  owner dispose 只改变 publication/owner trace，推进 `1/0`。S1f 再把 preparing/
  fallback/ready/failure/cancel 的 exact delta 接入同一双 revision 模型；
- input binding identity 只在 current owner/instance、context、routing lease、action
  catalog 或 topology revision 改变时轮换；publication-only commit 必须复用当前
  binding 与 `inputPublicationRevision`。S1f 再以 retain-current preparation 做真实
  integration proof。

**TDD 与验收：**

- 两个 owner 争用同一 root slot 稳定拒绝；不同 parent 的同名 child slot 可独立
  使用，同 parent 的 cardinality 仍受限；definition/candidate type 不再允许自报或
  覆盖 cardinality，缺失 descriptor 或 placement mismatch 在 mutation 前拒绝；
- table-driven cases 分别覆盖 blocking-but-no-input、input-without-focus、独立 focus
  owner、focus-only/passive instance 与 navigation target；
  passive/focus-only instance 不被 `closeTop` 误关；
- exact revision table 覆盖现有同步 open/replace/push/close/owner dispose、unchanged
  与 rejected case；applied topology transition（包括 dispose live owner）的
  publication/topology delta 为 `1/1`，dispose 无 live/pending topology 的 resolved
  owner 为 `1/0`，unchanged/rejected 为 `0/0`；
- pure binding-continuity table 证明 publication revision 单独变化时
  `inputPublicationRevision`/registration identity 不变，input contract 任一组成项
  变化时才轮换；
- focused reducer/Coordinator/publication、UI package 与 aggregate tests 全绿。

**2026-08-01 S1d.3 delivery：** 先在原实现上加入三个代表性 red case，focused
结果为 `3 failed / 44 passed`：两个 owner 的同名 root slot 被同时接纳，`closeTop`
从最高 active/input instance 猜测并关闭了较高 passive instance，同一 input contract
也创建了不同 binding/registration。随后将 cardinality 移入 construction-time frozen
resolved slot descriptor：root descriptor 全局解析，child descriptor 由 parent
definition + child slot 解析，而 runtime single occupancy 以 exact parent instance +
child slot 为 key；definition/candidate 不再携带 cardinality 或 parent-slot 自授权字段，
missing descriptor 与 placement mismatch 在 identity allocation 前结构化拒绝。不同
parent definition 即使引用已知 child slot 也会保持 publication/revision/subscriber 与
allocation cursor 不变并返回 `surface.slot_not_resolved`。

Publication 现在分别从 active topology 派生 blocking、managed input、focus 与
navigation target；input/focus 使用可表达 `none` 的 tagged policy，Back/`closeTop`
只使用明确 navigation target。十个 deterministic revision-delta assertions 冻结：同步
open/replace/push/close 与 live-owner dispose 的 publication/topology delta 为 `1/1`，
无 live topology 的 resolved-owner dispose 为 `1/0`，action/unchanged/rejected/
repeated dispose 为 `0/0`；现有 handle、receipt 与六字段 action envelope 仍只绑定
topology revision。空 owner dispose 的 immutable owner trace 明确记录 disposed owner，
同时不会使既有 topology evidence stale。

为同时保留 managed gate 优先级与 registration identity，InputRouter 增加仅在 package
内部可达的 managed-priority registrar；公共 Router 仍严格只有
`register/route/clearTransientInput`，ordinary registration 的 context precedence、LIFO
与 dispatch snapshot 语义不变。相同 application epoch、owner、instance、context、
routing lease、action vector 与 topology revision contract（包括 publication-only
commit 后重建的 callback/registrar wrapper）从原实现的
`2 registrations / 1 unregistration` 和新 input publication revision，收敛为同一
binding/revision、`1 registration / 0 unregistrations`；两次 route 后计数仍为
`1/0`。任一 contract field 或真实 topology replacement 改变才轮换；value-equal
contract 不能把 binding 静默改绑到另一个 Coordinator authority。

验证为 focused InputRouter/reducer/Coordinator/action-route `4 files / 111 tests`、
`@sillymaker/ui` `58 files / 521 tests`、aggregate `205 files / 1905 tests`，
`deno task check` 全绿。该切片没有新增 public export/live Surface family，没有实现
composition-root epoch、readiness、renderer/port admission、Overlay cutover 或 external
stable-target reconcile；下一独立切片是 S1e。

### S1e — Composition-root application epoch

**目标：**

- application composition root 持有 monotonic allocator；epoch 是
  presentation/runtime fence，不进入 Snapshot、Save 或 stable target data；
- S1d.2 的 bounded identity cursor 在本切片与 epoch 组合；successor 可以重新开始
  局部 sequence，但 `(epoch, sequence)` 不复用，旧 occurrence/instance/routing lease
  与 binding-origin action 全部 stale；
- full page reload 可以重新开始计数；同一 realm 内的 load/import rebootstrap、HMR
  successor 与 Coordinator successor 每次都领取新 epoch；
- allocator 位于 HMR successor 外，或由 hot-data/realm-stable cell 保持单调；
- tests 注入 deterministic allocator；Story 作者不手写 epoch，surface
  handle 与 router binding 自动捕获；S1f 的 readiness adapter 复用同一 capture
  seam；
- epoch 作为 package-internal Surface field 进入 runtime publication、action
  envelope 与 diagnostics；S1f 的 readiness receipt 复用该 field，不扩张普通非
  Surface semantic action；
- successor 开放 ingress 前，旧 Coordinator 已 dispose，并撤销当前已存在的
  input/focus ownership、routing registration 与 gesture lease；S1f 把 pending
  readiness 接入同一 dispose fence。

**非目标：**

- 不让 Base、Story、React component local state 或 Save 成为 epoch allocator；
- 不实现 external stable-target source revision；
- 不实现 readiness 或用空状态冒充 pending-preparation cancellation
  证明；readiness capture/cancellation 验收在 S1f 完成；
- 不通过同时开放 old/new Coordinator ingress 来“平滑”HMR。

**验收：**

- deterministic tests 证明每类 successor 都得到更大 epoch、full reload
  可重新初始化、局部 sequence 可重启而组合 identity 不复用，旧
  handle/binding-origin action 在 successor 下稳定 stale；
- old Coordinator dispose 与 successor ingress 有明确 happens-before
  证明，dispose 后没有 live input/focus owner、routing registration 或 gesture
  lease；
- epoch allocator 与 capture seam 保持 package-internal，不要求 Story
  作者传入 epoch。

**2026-08-01 S1e delivery：** 原实现允许两个手工构造的 successor 都使用 epoch
`1` 并各自从 local sequence `n1` 开始，因此 occurrence、instance 与 routing lease
逐字复用；旧 handle 会实际关闭 successor。单独 dispose Coordinator 后，外部 action
binding registration 仍为 `1`，gesture currentness 仍为 `true`。focused baseline
得到 `2 failed tests / 4 failed assertions`，分别固定 identity ABA、旧 handle 误命中
和 cleanup ownership 缺口。

最小实现增加 dormant、package-internal 的 Coordinator lifetime owner。它从注入的
allocator 自动领取 epoch，独占完整 Coordinator、单个 current action binding 与
有界的单-current gesture lease；runtime 只得到运行时真正不含 whole-generation
`dispose()` 的 frozen forwarding port。四类
load/import rebootstrap、HMR successor 与 Coordinator successor 共用同一同步
handoff：先关闭 current/ingress，再 unregister binding、永久撤销旧 gesture lease、
提交 Coordinator terminal publication，之后才分配更大 epoch、构造并开放 successor。
显式 `active/transitioning/sealed` phase 同时阻止 terminal subscriber、cleanup、
allocator 或 factory callback 重入创建第二个 successor；cleanup、allocator validation
或 successor construction 失败均保持 current `null`、无新 ingress。subscriber failure
diagnostics 现在携带 frozen `applicationEpoch` details。

Web package 同时增加未导出、未接 live composition 的 realm-stable allocator cell：同
realm + application ID 的独立 allocator 共享 `1 -> 2 -> 3` high-water，不同 application
ID 独立，新 realm（full reload model）可重新从 `1` 开始；locked realm descriptor、
exact native Map、corrupt high-water 与 safe-integer exhaustion 都 fail closed。UI
deterministic successor table 使用跳号 `41 -> 47`，两代 local sequence 都从 `n1`
重启但 compound identity 逐字不同；旧 handle 返回
`surface.stale_application_epoch`，旧 binding action 返回
`input.stale_publication`，旧 gesture 放入 successor envelope 返回
`input.stale_gesture`，三者的 ordinary/lower handler、publication mutation 与
subscriber notification 计数都为 `0`。每类 handoff 在 successor allocation callback
内精确观察到 registration `1 -> 0`、gesture current `true -> false`、旧 input/focus/
navigation owner 全部为 `null` 且 Coordinator 已 disposed。

验证为 focused lifetime/Coordinator/action-route/InputRouter/Web allocator
`5 files / 105 tests`、`@sillymaker/ui` `59 files / 532 tests`、`@sillymaker/web`
`23 files / 247 tests`、aggregate `207 files / 1924 tests` 与 `deno task check` 全绿。
本切片没有修改 Base/Snapshot/Save、Story/React、公共 package export、六字段 Surface
action envelope 或任何 live Overlay/startWeb/HMR caller；browser pointer/focus 的真实
successor proof 仍属于 S2，pending readiness cancellation 属于下一独立切片 S1f。

**2026-08-01 S1e follow-up：** S1f 前置审查发现 runtime forwarding port 虽隐藏
whole-generation `dispose()`，其余 Coordinator 方法却没有实际执行 ingress gate；因此
binding unregister 回调可在 lifetime 已将 current 置空后重入 `closeTop()`，并在 terminal
publication 前额外提交一次 `surface.closed`。focused red 得到 `1 failed / 12 tests`，且
重入 receipt 明确为 `applied`。runtime port 现仅保留 `getSnapshot()` 作为关闭后的只读
terminal diagnostics；handle/owner lookup、subscribe、全部 transition/action/owner ingress
以及 gesture `begin/revoke` 统一检查 current record，gesture currentness 也随 ingress
同步失效。相同 unregister 重入现在返回稳定的
`ui.managed_surface_ingress_closed`，predecessor 只产生一次 terminal notification，之后
才允许 successor allocation 与 ingress；terminal publication/topology revision 精确为
`2/2`，而旧路径会依次提交 close `2/2` 与 dispose `3/3`。

### S1f — Transition-kind readiness kernel

**目标：**

- definition-level readiness policy 按 initial open、primary replacement、
  child/detail open 表达，不使用一个适用于所有 transition 的枚举；
- 静态 definition 同时冻结 contract revision；它是通用 admission/diagnostic
  identity，不是 S1-R source/reconcile 占位字段；
- kernel 支持 code-native blocking fallback 与 retain-current-active 两种 preparing
  策略；具体 Overlay policy 在 S2 固定；
- 每次 preparation 分配全新的 candidate instance ID；failed、cancelled、exited
  candidate 永不复用；
- preparing candidate 不拥有普通 input、focus 或 semantic action；ready 后
  topology/input/focus 在一次 commit 原子切换；
- replacement failure 保留旧 active instance；initial failure 撤销 fallback
  并恢复 preparation 前的 focus owner；child/detail candidate 从未取得 focus，
  failure 撤销 fallback 后保持既有 parent/focus；
- close、second replace、owner dispose、Coordinator dispose 与 epoch rotation
  都取消 pending candidate；
- ready/failure receipt 绑定 application epoch 与 candidate instance；candidate
  instance 是 preparation-attempt identity。会使 candidate 失效的 mutation 原子
  cancel/remove pending attempt；无关 publication/topology 变化不使它孤立；S1-R
  再为 stable target 增加 source revision；
- stale ready/failure receipt 只返回 stale，不改变 topology、input、focus 或
  publication identity；
- readiness revision delta 明确为：retain-current preparation 只推进 publication
  revision；initial/child blocking fallback 因改变 isolation/input fence 而推进
  topology revision；ready activation 按实际 active ownership/action 变化推进
  topology revision，并总是推进 publication revision；failure/cancel 由 exact table
  按是否撤销 fallback/改变 active fence 决定。

code-native fallback 是 preparation phase 的 Host projection，不是另一个普通
Managed Surface，不分配普通 Surface instance，不经过 Story renderer resolver，
也不依赖 candidate required port。

**非目标：**

- 不接入 Overlay/System/Narrative，不实现 external reconcile；
- 不把 fallback 建模成可由 Story 导航、获得 semantic action 或持久恢复的 Surface；
- 不使用 wall-clock sleep 作为 readiness signal。

**验收：**

- definition type/runtime guard 要求 contract revision 与三类 readiness policy，
  且不出现 source revision/reconcile 字段；
- pure transition table 覆盖三种 transition kind、ready/failure、全部五类
  cancellation 触发器与 stale epoch/candidate-instance receipt；另有用例证明无关
  publication/topology mutation 不误杀合法 candidate；
- 每个 cancellation 后的重试都得到 fresh instance ID，失败或取消的 ID
  不复活；
- retain-current 与 fallback 路径在 preparing、ready、failure、cancel
  各阶段都有 exact topology/input/focus/publication 断言及 publication/topology
  revision delta table；
- retain-current preparation 期间旧 active Surface 的 binding、
  `inputPublicationRevision` 与已开始 gesture 继续有效；只有 ready cutover 或真实
  input-contract mutation 原子轮换，late old action/gesture 才 stale；
- successor epoch rotation 在开放 ingress 前取消 pending candidate 并撤销旧
  input/focus/gesture lease，late readiness receipt 稳定 stale。

**S1-T acceptance：** S1a–S1f 的 kernel 可在无 DOM 环境运行；composition-root
epoch 与 readiness cancellation contracts 有确定性证明；没有 public Story API
promotion，没有 source revision/reconcile 占位字段，也没有旧 store 双写。

**2026-08-01 S1f delivery：** 首轮 focused RED 同时固定 definition admission 与三类
transition：缺少 contract/readiness、非法 policy 与 future reconcile 字段原本都会被
接受，initial/replacement/child 也都会立即 active，得到 `7 failed / 7 tests`。第二轮
cancel RED 证明 initial fallback 与 retained predecessor 的 close 尚未取消 pending，
得到 `2 failed / 18 tests`。独立审查随后补出两个真实 RED：稀疏 `actionIds` 会跳过
校验并开始 preparation（`1 failed / 25 tests`）；stale preparation 会在 publication
不变时推进 identity high-water（reducer `1 failed / 28 tests`），而三个 legacy
immediate operation 仍在 type union 中（typecheck 的三个 unused `@ts-expect-error`）。

最小实现把 definition contract revision 与 initial/replacement/child readiness policy
作为 exact、deep-frozen admission 数据；action catalog 用 dense own-index 校验，不调用
caller array method。Coordinator 的三个 transient intent 现在只生成 preparing
candidate，返回 package-internal readiness adapter；evidence 精确只有 application epoch
与 candidate instance。pure operation union/reducer 删除 immediate
open/replace/push 与旧 receipt codes，candidate 只有在全部 epoch/evidence/owner/slot/
parent/cardinality precondition 成功后才推进 high-water；一旦 preparation 发布，失败、
取消与替换都保留 cursor，因此 retired attempt ID 不复用。

Code-native blocking fallback 只作为 frozen preparation projection；它没有第二个普通
instance、routing lease、input/focus/action authority 或 renderer/required-port 依赖。
exact delta 为 initial/child prepare `+1/+1`、replacement prepare `+1/+0`、三类 ready
均 `+1/+1`、initial/child failure `+1/+1`、replacement failure `+1/+0`、second replace
`+1/+0`，stale receipt `+0/+0` 且保留同一 publication identity。close、second
replace、owner dispose、Coordinator dispose 与 epoch rotation 都在触发 commit 中移除
pending；重试使用 fresh compound instance identity，无关 publication/topology mutation
不误杀 live candidate。

Lifetime 只在 replacement preparing 保留原 binding、input publication 与已开始 gesture；
ready cutover、blocking fallback 或 successor cleanup 会先 unregister/revoke，再让外部
subscriber 观察新 topology。关闭 ingress 后的 late ready/fail 与 unregister callback
重入稳定返回 stale，不产生额外 publication；successor 仍只在 predecessor terminal
publication 后开放 ingress。最终 focused Managed Surface 为 `5 files / 114 tests`，
`@sillymaker/ui` 为 `60 files / 566 tests`，aggregate 为 `208 files / 1958 tests`，
`deno task check` 全绿。该切片没有接入 Overlay/React/DOM、没有 public package export、
没有 source revision/reconcile 字段，也没有改变现有 live Surface authority；因此未额外
运行 browser/E2E，canonical check 内置的 Engine Lab build 已通过，首个 live cutover
仍属于 S2。

## 5. S2 — Workspace Overlay pilot

S2 只依赖 S1-T，只迁移 Overlay family。不要同时动 System/Narrative，也不等待
S1-R。Overlay pilot 全部使用 Coordinator-owned transient target，不预埋 source
publication revision 或 reconcile cursor。

### Migration

- Overlay definition/renderer resolver 保留 Story-facing capability；
- definition、definition contract revision、schema、renderer resolver、required
  port、parent 与 slot 在任何 topology/preparation mutation 前完成
  preflight；缺失返回结构化 rejection，topology/input/focus 保持原
  identity，不创建 preparing/active-but-invisible instance，也不进入通用 fault
  surface；
- writable open/detail/back/close 状态迁入 Coordinator；
- dismiss policy、instance identity、parent/detail depth、focus/input ownership
  由 publication 读取；
- OverlayHost 只渲染 immutable topology 并发 intents；
- pointer gesture fence 作为 web/stage adapter 的战术桥接；raw controller
  不作为公共 Story API。

### Fixed readiness policy

Overlay definition 固定以下 transition-kind policy：

- initial open：code-native blocking fallback；
- primary replacement：retain current active surface；
- child/detail open：code-native blocking fallback。

candidate preparing 期间不拥有普通 input、focus 或 semantic action。replacement
candidate ready 后 topology/input/focus 原子切换；replacement failure 保留旧实例；
initial failure 撤销 fallback 并恢复前一 focus owner。child/detail candidate
从未取得 focus，因此 failure 撤销 fallback 后保持既有 parent/focus。close、second
replace、owner dispose、Coordinator dispose 与 epoch rotation 全部取消 pending
candidate。每次 preparation 分配 fresh instance ID，失败/取消实例永不复用。

ready/failure receipt 必须绑定 application epoch 与 candidate instance；会使
candidate 失效的 mutation 在同一 commit 取消/remove 它，不能依赖全局 topology
revision 偶然变化。任何 stale receipt 都不得产生 topology/input/focus mutation，
无关 publication/topology mutation 也不得误拒仍 live 的 candidate。
fallback 是 preparation phase 的 code-native projection，不是另一个普通 Managed
Surface，不依赖 Story renderer resolver 或 required port。

### No dual authority rule

Coordinator 在 cutover 后是 Overlay 唯一 writable lifecycle authority。迁移提交
必须在同一 slice 删除或只读化旧 Overlay store 的 open/detail/back/close 写权。
legacy adapter 只能：

1. 把旧 controller invocation 翻译成 Coordinator intent；或
2. 从 immutable Coordinator publication 派生只读 compatibility view。

禁止双写、异步 writable mirror、subscription/effect 反向同步，以及任何可从旧 store
改变 topology/input/focus 的旁路。adapter 删除条件写入 promotion record。若不能在
同一 slice 消除双 authority，立即停止实现并修订 design。

### Cross-layer conformance matrix

真实 DOM、pointer 与 focus 行必须在 maintained browser projects 中验证；不能由正常
Story UI 构造的 malformed admission、direct owner/Coordinator disposal 与 exact
publication delta 留在 deterministic unit/headless harness。不得为了把这些纯 kernel
行机械搬入浏览器而暴露 malformed definition、internal handle 或 dispose test hook。

- browser：open → replace → detail → back → close；
- browser：dismissible/locked 的 Escape、backdrop、routed cancel；
- browser：pointerdown/up/click-through、keyboard activation 与 focus
  initial/trap/restore；
- browser + headless：initial/primary-replacement/child-detail 三类 delayed
  readiness，以及三类 failure 的可见 rollback/focus 结果；
- headless：close/second replace/owner dispose/Coordinator dispose/epoch rotation
  取消 pending candidate 及其 exact revision delta；browser 另证 close、second replace
  与 application successor 的 live Host integration；
- headless：stale ready/failure receipt 对 topology/input/focus 零 mutation；browser
  另证 cancelled close 的 stale failure 与 second replace/successor 的 stale ready；
- headless：missing/ambiguous definition、invalid contract revision/schema、
  unavailable/missing/faulted renderer、required-port/parent/slot rejection；
- unit/headless：owner unmount 与 Web HMR/rebootstrap cleanup/ingress fence；browser：
  application-anchor successor 的 live integration 与 late readiness fence。

**S2 acceptance：** Overlay 全部现有产品路径通过；Coordinator 是唯一 writable
lifecycle authority，旧 open/detail/back/close writer 已删除或只读化且没有 async
mirror；所有 admission failure 在 mutation 前结构化拒绝；readiness transition 与
cancellation matrix 通过；transient API 没有 S1-R 占位字段；Engine Lab
是中性第二消费者。若 pilot 需要跨 Base/Workspace 的巨大 receipt、通用 fault
surface 或第二 writable authority 才工作，停止并修订 design。

**2026-08-01 S2 delivery：** 本切片只迁移 exact-ID、Coordinator-owned transient
Workspace Overlay。首轮 TDD 删除独立 store writer 后，旧 store contract 的七个用例
全部变红；definition/session/Host focused RED 随后固定 definition/contract/schema/
resolver/required-port/parent/slot admission、preparation 不挂载 Story content、locked
fallback、Host unmount cancellation、structured intent rejection 与 concrete port
binding。独立审查又固定 sparse/method-overridden author array、constructor failure
subscription cleanup 与 detail 上方 pending replacement 的 close-result 分类；配置现于
任何上游订阅前形成 dense own-index snapshot，且 facade 按 Coordinator 实际 receipt
分类关闭层级。

最终 kernel 复审把普通 close 保持为 topology-related cancellation，避免同 owner 的
独立 root slot 被误删；Overlay 通过 package-internal owner-preparation variants 在一次
reducer commit 中关闭 exact/current target 并取消该 owner 的 pending candidate。initial
fallback 不依赖 ready-only owner handle，dismiss receipt 绑定 exact candidate，并在
mutation 前原子校验 epoch、live fallback、global current target、owner 与 dismiss policy。

完整浏览器门禁在 WebKit 找到两个真实 focus RED：pointer 打开 detail 时 Safari 把
active focus 留在 `PanelV1` body，关闭后无法恢复到实际按钮 opener；Safari 默认 Tab
行为也会把 focus 移出 active Dialog。Host 现在用 package-internal、单
activation-task capture 记录真实 pointer target，并显式在 top Overlay 内循环 Tab；
循环只包含实际 tabbable/visible target，initial/detail blocking fallback 则把双向 Tab
保持在 code-native scope。unit 回归与 WebKit focused 均证明 exact opener restore 与
focus trap；owner-wide close/unmount 即使同时删除 nested detail 或 child fallback，也从
previous root identity 恢复外部 opener；nested renderer fault 删除一个 detail subtree
时则从包含旧 focus owner 的最高 removed ancestor 恢复 surviving-parent opener。Story
API 没有新增 DOM 参数。

Story-facing `defineWorkspaceOverlayV1` 固定 contract revision、exact-ID schema、
dismiss policy 与 required port IDs；composition 接收 concrete `overlayPorts`，resolver
在任何 mutation 前提供 accessible name/content/可选 presentation-only `prepare()`。
initial/detail 使用 code-native blocking fallback，preparing 时不挂载普通 Story
content、不取得普通 input/focus/semantic action；replacement 保留旧 DOM/focus，ready
后才原子 cutover，failure 保留旧实例。close、second replace、Host/owner/Coordinator
dispose 与 epoch rotation 都取消 pending；late ready/fail 对 topology/input/focus 为零
mutation，每次 attempt 使用 fresh instance ID。

`OverlaySessionStoreV1` 现只把六个兼容操作直接委托给 Coordinator，并从同一
immutable publication 派生 primary/detail view；旧 independent writer/factory 已删除，
没有双写、异步 mirror 或第二份 topology。internal session/Host readiness seam 通过
WeakMap 隐藏，普通 `@sillymaker/ui` facade 不暴露 `*Internal*` 方法；
`@sillymaker/ui/internal` 只供 Web Host 注入 realm-stable epoch allocator。load/import
anchor rotation、HMR/rebootstrap successor 都在新 ingress 前 dispose predecessor 并
领取新 epoch；epoch 只属于 presentation/runtime fence，不进入 Save。

Engine Lab 的 opt-in 中性 rig 覆盖 open→replace→detail→back→close、locked/dismissible
native 与 routed cancel、真实 pointer click-through、keyboard activation、focus
initial/trap/restore、三类 delayed readiness/failure、close/second replace/successor
cancellation 以及 stale ready/failure；普通 Engine Lab DOM 不含该测试词汇。malformed
admission、direct disposal 与 exact publication identity/count 由 deterministic
unit/headless harness 覆盖，不向 production API 添加 browser-only hook。最终 focused
为 `8 files / 147 tests`，UI package 为 `62 files / 601 tests`，Web package 为
`23 files / 247 tests`，Engine Lab headless 为 `19 files / 89 tests`，aggregate 为
`210 files / 1994 tests`；
`deno task check`、engine browser `101/101`、examples browser `45 passed / 2 skipped`
与 prebuilt Player `38/38` 全绿。

兼容 facade/re-export 的删除 gate 是：typed presentation intent surface 覆盖
primary/detail/back/close，且 direct-composer、Engine Lab、debug/read consumers 全部
迁移后删除；在此之前只能继续做 Coordinator delegation/derived immutable view，
不得加入新的 lifecycle 语义。该 promotion 没有实现 S1-R/source revision/parameter
equivalence、System、Narrative/History、whole-canvas、通用 fault surface或
application-level receipt，也没有改变 Save/digest/replay/persistence wire 语义。

## 6. S3 — System dialog family

S3 是 Coordinator-owned transient family，与 Workspace Overlay 共用唯一的
composition-owned Coordinator、application epoch、immutable publication、managed
input binding 与 successor lifetime；不依赖 S1-R，也不向 transient contract 加入
source publication revision、publisher lease、stable canonical vector 或 reconcile
cursor。S3 的实现分为五个独立批次；S3a–S3d 新路径保持 dormant/test-only，S3e
才原子切换 live family 并删除旧 owner，任何中间提交都不得双写。

### S3 topology and policy

```text
System owner
└── system.root                         cardinality: single
    ├── settings
    └── saves                           replacement relationship
        └── system.confirmation         exact-parent child, cardinality: single
            └── action_confirmation(load | clear | import)
```

- settings 与 saves 是 root definitions；standard/custom Saves 是同一 Saves
  definition 的 renderer variants；import 是 operation，不是 root Surface；
- confirmation exact parent 必须是 current Saves instance。child close 保留 exact
  parent 与其 React/slot-read/result state，恢复 exact opener；断开的 opener 退回
  surviving Saves initial focus target；
- root close/replacement ready 在一个 topology commit 中退休 root、child subtree 与
  related pending preparation；replacement preparing/failure 保留完整旧 subtree；
- root request 遵守 exact matrix：same pending 或无 pending 时 same active request
  unchanged；active A + pending B + request A 只取消 B 并保留 exact A instance/subtree；
  initial pending A + different B 原子 supersede；每个新 confirmation 使用 fresh
  instance；
- settings、saves、confirmation 的 Back、Escape、backdrop、routed cancel 均允许；
  explicit/dismiss close 都绑定 exact current handle。

| Active | Pending | Requested | Public outcome                            | ΔP | ΔT | Allocation | Notify |
| ------ | ------- | --------- | ----------------------------------------- | -: | -: | ---------: | -----: |
| none   | none    | A         | `preparing / preparation_started`         | +1 | +1 |         +1 |      1 |
| none   | A       | A         | `unchanged / already_requested`           |  0 |  0 |          0 |      0 |
| none   | A       | B         | `preparing / preparation_started`         | +1 | +1 |         +1 |      1 |
| A      | none    | A         | `unchanged / already_requested`           |  0 |  0 |          0 |      0 |
| A      | none    | B         | `preparing / preparation_started`         | +1 |  0 |         +1 |      1 |
| A      | B       | B         | `unchanged / already_requested`           |  0 |  0 |          0 |      0 |
| A      | B       | A         | `applied / pending_replacement_cancelled` | +1 |  0 |          0 |      1 |
| A      | B       | C         | `preparing / preparation_started`         | +1 |  0 |         +1 |      1 |

不同 request 必须在旧 candidate 保持不变时完成 preflight。initial supersede 成功后，
一个 commit 退休 A、分配 fresh B identity bundle，并把连续存在的 logical blocking
fallback 重新绑定 B；candidate fence 改变使 topology revision 推进。active A + pending
B + request A 不重跑 A resolver、不分配或 remount A，完整保留 A DOM/local state、child
subtree、routing/input/focus/gesture/return-focus evidence，只推进 publication。被取消
candidate 的 late callbacks 均 stale 且零 mutation。

System 沿用 S1-T readiness：initial root 与 confirmation child 是
`blocking_fallback`，root replacement 是 `retain_current`。不允许 intent-time
synchronous settle。candidate renderer 只有在正确 System portal 内完成成功 React
Host commit，且截至该 commit 的 render、constructor、layout-effect 没有被 candidate
error boundary 判定失败后，才由 candidate-bound receipt 宣告
`host_commit_ready`。它不等待 paint、图片/数据或未来 passive effect。

Preparation shell 必须在正确 portal 中以 `surfaceInstanceId` 为稳定 React key，
`inert`、`aria-hidden`、non-interactive，并以 `visibility: hidden` 或等价方式视觉
隐藏但保留 layout；不得使用 HTML `hidden` / `display: none`。preparation 与 active
复用同一 keyed renderer subtree；candidate 不取得 ordinary input/focus/portal target/
semantic action/navigation authority。initial/child 展示 code-native fallback；
replacement 保留旧 subtree visible、interactive、focus-owned。

candidate 使用 terminal-once `pending -> ready | failed` gate。layout-effect setup
记录 generation，再以 microtask acknowledgment 提交 ready；cleanup 只使 generation
失效。StrictMode probe 的 setup/cleanup 不提交 receipt，真实 setup 只提交一次。
close、replace 或 unmount 先取消 candidate；其后的 duplicate/late ready/fail 在 Host
gate 被抑制或由 Coordinator stale-reject，exact mutation 为零。ready 前
render/constructor/layout/preparation-callback failure 发送 terminal failure。failure
authority 只在 Coordinator 接受 `host_commit_ready` 后终止；accepted ready 后不再允许
readiness failure、不复活 retained predecessor，后续 render/lifecycle fault 委托现有
application/root policy。boundary 若仍包裹 active subtree必须 rethrow/delegate，不能吞错
渲染 `null`；S3 不承诺 event/passive/timer/Promise/async/Persistence fault capture。

一个 session 只允许一个 logical Host attachment、System portal 与 renderer/port catalog
authority。Host lease 使用 generation/ref-counted delayed detach：StrictMode replay 续接
同一 lease，零额外 publication/allocation/settlement/notification；distinct concurrent
Host 在任何 subscription/renderer publication、resolver/catalog attachment、portal/
input/focus mutation 前以 internal `ui.system_dialog_host_lease_conflict` fail closed，且
不得改变原 Host/session。每个 candidate 在 preflight 时冻结
renderer component、metadata、normalized request、required port bindings、definition
revision 与 content/config snapshot；Host catalog/props 更新只影响 future candidate，
不得原地修改 active/pending variant。

真实 unmount 立即关闭新 intent ingress、ordinary input/focus acquisition 与 terminal
readiness acknowledgment；microtask grace 后若没有同 logical Host 重挂，才撤销
resolver并原子关闭 System owner，不 dispose shared Coordinator。successor/
whole-composition dispose 仍先关闭旧 ingress、dispose shared Coordinator、撤销
readiness/input/focus/gesture，再领取 fresh epoch并开放 successor；所有旧 Host callback
stale。

### S3 public API and admission

- 删除 public standalone `createSystemDialogSessionStoreV1` 与旧
  `SystemDialogSessionStoreV1` 名称；新增无 public constructor/factory、只能由
  composition 创建的 opaque Coordinator-backed `SystemDialogSessionV1`；
- `SystemDialogHostV1` 的 session 必填，不创建 fallback store；Settings/Saves
  launchers、`useSystemDialogControllerV1` 与 DefaultGameRoot slot-context intents
  保留并返回 structured open result；普通 API 不暴露 epoch、instance/occurrence、
  publication/topology revision、readiness 或 parent handle；
- 从 public barrel 删除 standalone lifecycle hosts `SettingsDialogV1`、
  `ActionConfirmationDialogV1`、`SaveOverlayV1` 及对应 public props/confirmation dispatch
  port；只保留 package-internal content renderer，且它们不拥有 Dialog root/portal、
  input、focus、inert、opener restore 或 lifecycle；
- custom Saves 改为 Host 通过 React component identity 挂载，不能在 React 外直接
  调用可能使用 hooks 的 `render()` callback；
- package-internal `SaveOverlayContentV1`（或等价名称）保留 slot read、operation
  pending/result 与 gameplay-publication guard projection；confirmation existence/
  parent/dismiss/input/focus/instance 全由 Coordinator 决定；`SaveOverlayPortV1`、labels、
  slot names、guard、slot/result/import 与 System Saves config types 可继续 public，但
  parent/confirmation/readiness/opener/raw Coordinator 不得公开。

Root public result 与 precedence 以 design 4.3 的 exact union 为权威，并依次为：

1. disposed/closed ingress -> `rejected / disposed`，`0/0/0/0`；
2. no logical Host/resolver lease -> `rejected / renderer_unavailable`，`0/0/0/0`；
3. request equals pending -> `unchanged / already_requested`，`0/0/0/0`；
4. no pending and request equals active -> `unchanged / already_requested`，`0/0/0/0`；
5. pending replacement and request equals retained active ->
   `applied / pending_replacement_cancelled`，`+1/0/0/1`；
6. resolver/preflight throw -> `faulted / renderer_faulted`，`0/0/0/0`；
7. missing renderer（含 unconfigured Saves）-> `rejected / renderer_missing`，
   `0/0/0/0`；
8. missing port -> `rejected / required_port_missing`，`0/0/0/0`；
9. package-internal slot/owner invariant unexpected ->
   `faulted / transition_faulted`，`0/0/0/0`；
10. initial/new/superseding candidate preflight success -> matrix-defined
    `preparing / preparation_started` delta。

generic `surface.slot_occupied` 仍可作为 S1-T low-level rejection，但合法 System root
intent 不可达它，也不加入 public union。Root result exact union 还包含 design 4.3
定义的 `applied / pending_replacement_cancelled` 与
`unchanged / already_requested`，不得退化回 `already_current`。

Definition registration、schema declaration/contract revision 与 root recipe 是
composition-construction invariant，非法时 construction fail closed；每个 request 的
schema validation/normalization 仍在 intent preflight。candidate render failure 发生在
open 已返回 preparing 后，只通过 readiness failure/diagnostics 表达，不追溯改写
public result。

### S3 exact transition evidence

S3 不另建 delta 规则；沿用 S1-T table。`ΔP` 是 publication revision，`ΔT` 是
topology revision：

| Operation                                                       | ΔP | ΔT | Identity allocation | Coordinator notify |
| --------------------------------------------------------------- | -: | -: | ------------------: | -----------------: |
| preflight rejection or fault                                    |  0 |  0 |                   0 |                  0 |
| same initial pending request                                    |  0 |  0 |                   0 |                  0 |
| no pending, same active request                                 |  0 |  0 |                   0 |                  0 |
| initial root prepare                                            | +1 | +1 |                  +1 |                  1 |
| initial pending A -> different B                                | +1 | +1 |                  +1 |                  1 |
| root replacement prepare                                        | +1 |  0 |                  +1 |                  1 |
| active A + pending B -> request A                               | +1 |  0 |                   0 |                  1 |
| active A + pending B -> different C                             | +1 |  0 |                  +1 |                  1 |
| confirmation child prepare                                      | +1 | +1 |                  +1 |                  1 |
| any ready activation                                            | +1 | +1 |                   0 |                  1 |
| initial/child failure                                           | +1 | +1 |                   0 |                  1 |
| replacement failure                                             | +1 |  0 |                   0 |                  1 |
| confirmation close                                              | +1 | +1 |                   0 |                  1 |
| root subtree close                                              | +1 | +1 |                   0 |                  1 |
| root replacement ready retires old root + child                 | +1 | +1 |                   0 |                  1 |
| stale/duplicate ready/fail/close                                |  0 |  0 |                   0 |                  0 |
| Save guard/safepoint or Persistence pending/result state change |  0 |  0 |                   0 |                  0 |

Tests additionally assert：successful preflight advances identity high-water exactly once；
rejected/unchanged/stale do not；replacement prepare/failure preserve old input binding、
`inputPublicationRevision`、focus owner 与 gesture；ready cutover rotates input binding
once；root + confirmation retirement emits one publication/notification and no intermediate
focus restore；candidate Host mount itself emits no Coordinator publication；StrictMode 与
non-StrictMode counts are identical。predecessor disposal 与 successor initial publication
属于不同 Coordinator identity，不把 revision 数值相加比较。

S3 必须增加以下 mutation-sensitive vectors：same initial pending 零 resolver、零
required-port recheck、零 preparation invocation/零 delta；
different initial pending 的 success 为 `+1/+1/+1/1` 且 fallback/isolation 连续、旧 opener
不恢复、旧 callback stale；new request reject/fault 保留 exact pending publication identity；
active A + pending B + request A 为 `applied/pending_replacement_cancelled`，exact A
instance/DOM/local state/child/routing lease/`inputPublicationRevision`/focus/gesture/
external return-focus target 全部不变；
different C 分配 fresh candidate 并保留 A；StrictMode replay 只有 one logical attach，
concurrent Host 在 mutation 前 fail closed；R1 candidate 不被 future R2 catalog 改写；
其 activation 后 active 仍绑定 R1，只有 later fresh candidate 可以取 R2；pre-ready
fault 进入 readiness failure，accepted-ready 后 fault 不产生 readiness receipt并委托
现有 root policy，event/passive/async fault 不作 S3 candidate-failure claim。

### S3c.0 composition-wide successor activation barrier

S3c 的第一独立切片先补全 3.3 successor 顺序，不进入 React Host。composition-owned
runtime 按固定 transaction 执行：关闭全部 predecessor family ingress → dispose
predecessor/create one successor → 所有 family adapter 静默 bind 同一 runtime/publication
→ 所有 family 在 shared closed gate 后完成 activation arming → 一次 gate release 同时开放
全部 ingress → 逐 family flush activation notification → publish presentation anchor。任何
family notification 开始前，所有 family 已同时 active；barrier 本身不提交 Coordinator
publication、不推进 topology revision，也不分配 Managed Surface identity。

成功向量在第一个 Overlay notification 内同步读取 Overlay、System 与 runtime underlying
publication，三者必须是相同 identity/application epoch；两个零 mutation intent 分别返回
`overlay.renderer_unavailable` 与 `system_dialog.renderer_unavailable`，不能有一方返回
disposed。callback 内 presentation anchor 仍为 predecessor，callback 返回后才推进；每个
family 恰有一次 activation notification。successor 仍为 `0/0/[]`，第一个后续 Surface
candidate 使用该 epoch 的 `n1`。

failure table 分别注入第二 family bind 与 activate failure：第二 activation 在抛错前同步
重入第一 family intent仍被 shared closed gate 拒绝，第一 family 即使已 armed也不得产生
mutation/identity/notification；两边 abort 后 ingress 全关，composition runtime sealed，
presentation anchor 不推进，predecessor readiness callback稳定 stale，且只分配 initial 与
failed successor 两个 epoch/Coordinator。fresh successor 在 failure 前保持 `0/0/[]`；
dispose 只产生现有 terminal `+1/+1` publication，不允许第三代 recovery、Surface identity
或额外 commit。实际 composition 还以 disposed dormant System 注入第二 bind failure，证明
Overlay 零通知且 successor fail closed。

shared-composition input integration 另证 active A → retain-current B prepare/fail 始终只有
一份 registration，binding identity、`inputPublicationRevision` 与 current gesture 不变；
B ready 后 old binding只 unregister 一次、new binding只 register 一次，family activation
notification 不参与 input registration。

reentrant vector 在第一 family activation notification 内发布下一 application anchor；
composition bridge 必须先完成当前 generation 的其余 family notification与旧→当前 anchor
发布，再 drain queued successor。最终 Managed Surface runtime 与 presentation anchor 都是
最新 generation，每代两个 family各恰有一次 notification；package-internal direct nested
replacement 则稳定 `transition_in_progress` 且零额外 epoch/Coordinator。
若 activation notification 同步 dispose whole composition（即使此前已 queue 下一 anchor），
当前/queued anchor 都不再发布或 drain，presentation anchor 保持 predecessor，shared runtime
sealed，且不得分配下一 epoch。

### S3 asynchronous Persistence boundary

每个 confirmation instance 捕获 normalized immutable invocation并至多 dispatch 一次。
pending cancel 只关闭 exact child，不取消已 dispatch operation；completion 捕获 exact
child/root handles并采用 strict child-bound。child 保持 current 时，clear 的所有结果以及
load/import reject/fault只向 exact parent投递 local result并关闭 exact child；successful
load/import由 anchor successor清理旧 Coordinator，不依赖旧 root `close()`。

child 一经 cancel/Back/Escape/backdrop、root subtree retirement、owner dispose 或 successor
关闭，其 confirmation-bound child/root result sink 同时撤销。operation 可以自然 settle，
但 late close/result 对已关闭 child、仍存活的原 root 与 later Saves 都必须 stale且零
confirmation-result mutation；不得把“same surviving root”解释为 cancel 后仍可接收
result。operation binding 的 independent finally仍可清理 busy并按现有 read/status source
refresh仍存活的 exact原 root；该 cleanup/refresh以 exact root fenced，不得命中 retired/
later root，且 Surface delta为零。Save guard、Persistence local result/status 与独立 refresh
不因此改义。

非-successor child close 的最终 focus 固定为 captured connected exact opener；只有 opener
已断开才退回 surviving exact Saves root initial focus target。completion result summary 不得
抢焦。root 与 child 同 commit退休时不产生 intermediate parent focus restore。

### S3 mergeable slices

1. **S3a — definition/slot/API contracts：** 增加 dormant System definitions、root /
   exact-parent child recipe、opaque session/result types 与 descriptor/admission tests；
   其中 S3a.1 固定 initial-pending supersede，S3a.2 固定 retained-active pending
   cancellation，S3a.3 固定 exact public-result target/delta table，S3a.4 固定 one logical
   Host lease 与 candidate resolution snapshot；增加 initial supersede 与
   retained-active pending cancellation 所需的 package-internal generic composite
   reducer/Coordinator operations；所有新类型与 operations 在 S3e 前保持
   package-internal，不接入 live Host、不删除现有 live writer；
2. **S3b — composition-owned shared Coordinator：** 从 Overlay-specific session
   抽出 composition-owned lifetime/publication，Overlay 无行为变化；注入 dormant System
   facade，证明两个 family 只能共享一个 Coordinator/input binding；
3. **S3c.0 — successor activation barrier：** 先让全部 family 静默 bind 同一个
   successor，在 shared closed gate 后完成 activation arming，再一次 release并发送 family
   notification；任一 attachment failure abort 全部 adapter、seal successor且不推进
   presentation anchor；reentrant anchor rotation 由 composition bridge 串行 drain；
4. **S3c.1 — Host-commit readiness：** 实现 preparation shell、same-key cutover、
   terminal-once error boundary、StrictMode generation 与 Host attachment lease；candidate
   failure authority 以 Coordinator accepted `host_commit_ready` 为界，post-activation
   fault 委托 existing root policy；仍不切换 production System ingress；
5. **S3d — Saves confirmation child：** 把 confirmation renderer/operation 接到 exact
   parent child intent，证明 cancel/async completion/strict child-bound sink/exact-handle/
   opener-first focus semantics；dormant new path 自身不新增 React-local lifecycle writer，
   legacy live writer 只留在未切换路径并在 S3e 同批删除；
6. **S3e — live cutover and promotion：** 在同一 slice 切换 DefaultGameRoot/Web/Story
   paths，删除旧 store/fallback/raw lifecycle public exports、public `SaveOverlayV1` /
   `SaveOverlayPropsV1` 与全部 dead path，只保留 public persistence configuration/value
   types；完成 successor、Engine Lab、Cat Cafe、prebuilt browser matrix及 live docs
   promotion。

**2026-08-04 S3a delivery：** 本切片只建立 dormant、package-internal System
合同与 S1-T composite kernel floor。settings/saves definitions 共用一个 single root
slot，load/clear/import confirmation definition 只解析为 current Saves 的 exact-parent
single child；standard/custom 仍是同一 Saves definition 的 renderer variant，import
仍只是 operation。target opaque session/result union、root request/delta matrix 与 one
logical Host/catalog/portal lease 只形成未导出合同；没有创建 live session、Host lease
或第二个 ingress。

generic Coordinator/reducer 新增两个未进 package barrel 的原子操作：initial pending
A -> B 在一次 publication commit 中分配 fresh identity、连续重绑 blocking fallback，
exact delta 为 `+1/+1/+1/1`；active A + pending B -> request A 只取消 B，保留 exact A
subtree/input/focus/gesture，delta 为 `+1/0/0/1`。错误 evidence、admission failure、
重复或 late callback 都保持 publication identity、不通知且不消耗 identity；关闭的
lifetime ingress fail closed。

root-candidate admission snapshot 从 normalized root request 内部选择 canonical
definition，复制并冻结 required-port binding vector，捕获 renderer/accessibility identity，
并只接受 package-internal opaque normalized-config token。S3a 不递归遍历 React content
graph；S3b 必须实现 Settings/Saves known-field copier/catalog facade并实际消费这些 dormant
合同（未消费的 metadata 届时删除），S3c.1 才实现 Host-commit readiness、StrictMode lease
与 error boundary。旧 System store、fallback Host 与 public lifecycle API 完全未改；
Save/Persistence/M2/canonical/digest/replay/wire 均未变化。

**2026-08-04 S3b delivery：** composition 现在只创建一个 family-neutral Managed
Surface runtime；它唯一拥有 Coordinator lifetime、application epoch、successor/dispose
与 managed-input rebinding。Workspace Overlay adapter 改为消费该 runtime，并按 owner
读取/关闭 topology；传给 Overlay Host 的 publication 也只投影 Overlay instances、
fallback、input/focus/navigation evidence，不能误消费 dormant System evidence。其 public
facade、admission、readiness、render-record batching 与既有 browser behavior 保持不变。
每次 load/import/Coordinator successor 都先撤销 Overlay 与
dormant System adapter ingress，再只分配一个 successor epoch，最后把两者附着到同一份
fresh publication；predecessor readiness 对两个 family 同时 stale。

同一 composition 已注入 package-internal opaque System facade，但正式 catalog 仍为
`null`，所以 dormant ingress 只返回 `renderer_unavailable` 且 `0/0/0/0`。System root
state machine 消费 S3a exact request/preflight/composite operations；Settings 与
standard/custom Saves 使用 descriptor-safe known-field copier，candidate 捕获 renderer、
port、React content/component 与 guard evaluator identity，并隔离 future catalog R2。
legacy public System store/Host 仍是唯一 live System writer；新 facade 未进入任何 barrel、
Host 或 Story path。S3b 没有实现 Host/portal lease、React Host-commit readiness、
confirmation child 或 live cutover，也没有改变 Save/Persistence/M2/canonical/digest/
replay/wire。其逐 family reattach 后立即通知的顺序因 System dormant 可接受，但不能作为
live-family activation proof。

**2026-08-04 S3c.0 delivery：** composition runtime 现在拥有 fenced family handoff：
全部 adapter 先 detach并静默 bind 同一个 fresh successor，再在 shared closed gate 后完成
activation arming；单次 gate release 才整体开放 ingress，最后才 flush family
notification；presentation anchor 仍在所有 activation notification 后发布。第一个
family callback 内 Overlay、System 与 runtime 已共享同一 underlying publication/epoch，
两个 family intent 都不会观察到 partial detached generation。第二 family bind/activate
failure（包括 activate 中同步重入第一 family）会 abort 全部 adapter、撤销 successor
subscriptions、dispose/seal successor且零 pre-terminal Surface mutation/identity/family
notification；seal 只产生既有 terminal `+1/+1`。不回接 predecessor、不发布 anchor、
不创建 recovery generation。activation notification 内的
reentrant anchor rotation 由 composition bridge 排队；当前 generation 完整通知并发布
anchor 后才 drain 下一 generation，不能让旧 anchor覆盖新 runtime或漏发另一 family。
shared-composition input integration 同时证明 retain-current prepare/fail 不更换 binding、
registration、`inputPublicationRevision` 或 gesture，ready cutover只更换一次 binding。
S3c.0 未接入 React Host、catalog/portal lease 或 production System ingress；下一独立切片为
S3c.1。

**2026-08-08 S3c.1 delivery：** 新的 dormant、package-internal Managed System Host
现在只在正确 System portal 内渲染 frozen candidate resolution；candidate renderer 在
preparation 与 active 间复用同一个 `surfaceInstanceId` key、DOM 与 React element，
cutover不 remount或重新调用 renderer。preparing shell 保留 layout并使用 `inert`、
`aria-hidden`、`pointer-events:none`、`visibility:hidden`，不用 HTML `hidden` 或
`display:none`。initial code-native fallback 连续持有 System isolation、全层 pointer
blocker、fallback-only ordinary input gate 与 focus scope；action/viewport不能穿透到下层
context，reset类仍沿用既有 ignored routing。initial supersede不恢复旧 opener，
pre-ready failure/cancel则恢复
fallback取得 focus 前的 exact connected owner。active-ready 的具体 content initial-focus
与 ordinary input/dismiss policy仍留给 S3e live content cutover，confirmation exact opener
属于 S3d。

每个 candidate 的 layout-effect generation + microtask gate 只在 successful Host commit 后
提交一次 ready；render/constructor/layout failure 在 accepted ready 前只提交一次
candidate failure，accepted ready 后则向 existing root runtime-fault policy重抛。合法的
`throw null` 也按 failure处理。one logical Host attachment把 catalog、portal 与 terminal
acknowledgment绑定同一 lease；distinct Host与 live-candidate portal change在任何
Coordinator/catalog/subscription/renderer mutation前 fail closed，StrictMode probe重挂不
产生额外 publication/allocation/settlement/notification。真实 unmount同步关闭 intent与
ack ingress，microtask grace 到期后以一次 owner close 原子退休 active/pending subtree，
不 dispose共享 Coordinator；composition successor 后 predecessor acknowledgment稳定
stale，Host catalog只影响 future candidate，R1 resolution不会被R2原地改写。

该 Host与opaque attachment只由 source-relative tests消费，未进入 root/system/internal
barrel或 package exports；production composition仍不给 dormant session附着 catalog/Host，
legacy System store/Host仍是唯一 live writer。Save/Persistence/M2/canonical/digest/replay/
wire与 browser graph均未改变；architecture/features不作 live promotion。下一独立切片为
S3d。

### S3d slice contract

**目标：** 在 dormant Managed System path 中，把 load/clear/import 的 normalized frozen
invocation 通过 package-internal Saves content intent 打开为 current ready Saves root 的
exact-parent single confirmation child；让 confirmation renderer 使用 S3c.1 相同的
Host-commit readiness/fallback/error-boundary gate，并把 dispatch-once、exact cancel、
strict child-bound completion sink 与 opener restore 绑定该 child instance。root content
只能获得注入的 typed confirmation intent；raw parent/child handle、Coordinator、readiness
与 focus lifecycle 不进入 content props或 package exports。

**非目标：** S3d 不接 DefaultGameRoot/Web/Story production ingress，不删除或改写仍是唯一
live writer 的 legacy System store/Host/`SaveOverlayV1`/`ActionConfirmationDialogV1`；不建立
mirror/dual write，不把 confirmation existence 或 operation result 变成第二份 writable
store；不改变 Persistence operation、Save safepoint、M2、canonical/digest/replay/wire、
successful load/import successor 或 public result/API。旧 live SaveOverlay 的 result-summary
focus 是待 S3e cutover 删除的 legacy 行为，不得复制到 dormant managed path。

**TDD/验收向量：**

1. 非-Saves parent、stale parent、occupied exact-parent child slot、invalid invocation、
   missing renderer/required port 在 allocation/topology mutation 前拒绝；parent/root DOM、
   input/focus/gesture、publication identity与 resolver/dispatch count 保持确定性零变化；
2. load/clear/import各至少一条 normalized invocation vector；successful child prepare 为
   `+1/+1/+1/1`，fresh instance、one fallback、zero ordinary child input/focus/semantic
   authority，Host commit ready再以`+1/+1/0/1`原子 cutover；StrictMode counts相同；
3. 同一个 active/pending child 的 confirm double-click、routed confirm 与 re-render 组合仍
   只 dispatch一次；每次重新打开分配 fresh child，前一 child controller/receipt稳定 stale；
4. pending operation期间 cancel/Back/Escape/backdrop只以一次`+1/+1/0/1`关闭 exact child，
   保留 exact Saves root/DOM/local state/input binding/gesture。operation promise之后 resolve、
   reject或 throw均不向 confirmation、原 root或later root投递 confirmation result，也不
   触发 close；operation binding 的 independent finally可确定性清 busy并 refresh仍存活的
   exact原 root，root已退休/替换或 successor建立时则不得 refresh later root。两者的
   Surface delta与notify均为零；
5. child保持 current时，clear success/reject/fault与 load/import reject/fault只向 exact root
   sink投递一次并关闭 exact child；duplicate/late completion零 mutation。successful
   load/import只由 application-anchor successor退休旧 tree，旧 child/root callback不得
   close successor；
6. cancel、readiness failure和非-successor completion均最终恢复 captured exact opener；
   opener断开才聚焦 surviving exact parent initial target。result summary、fallback cleanup
   与 delayed completion均不得覆盖该最终 focus；root+child原子退休没有 intermediate
   parent focus；
7. delivery/dead-path audit 以 reviewed `git diff --name-status`、full diff、bounded `rg`
   import/export/attachment reference search 与最终 staged/unstaged/untracked 状态，证明新
   Host/content/session path 没有进入 root/system/internal barrel、package exports、production
   composition 或 browser graph，legacy path 仍是唯一 live writer，Save/Persistence/M2/
   canonical/digest/replay/wire 均无 diff；把命令与结论记录进 delivery record，不新增只为
   冻结 exact file/source inventory 或 provisional import graph 的常规 CI test。

**2026-08-08 S3d delivery：** dormant session 现在把 normalized frozen invocation、
descriptor-snapshotted operation callbacks、frozen confirmation renderer/required ports与
fresh exact-parent child绑定。新 exact-candidate fallback dismiss只关闭该 child，不会取消
same-owner root replacement；invalid dismiss kind 在 policy lookup 前 fail closed。Host 使用
与 root相同的 keyed commit/readiness gate，child preparing/active均阻断 retained exact parent
而不 remount；typed content intent不暴露 opener/focus lifecycle，Host自行捕获/恢复 exact
opener、选择 disconnected fallback target、执行 closed Tab trap并在 pointer-up close前 arm
System gesture fence。

operation dispatch-once 与 strict child-bound result sink 同步绑定 child/root/generation；
cancel、fresh child、root retirement/replacement、epoch successor、Host release与 runtime
detach/dispose均使旧 sink stable stale。独立 `finalizeExactRoot` 只在 captured原 root仍存活时
terminal-once执行，cancel 后也不产生 Surface mutation；sync/async sink fault只报告
diagnostics。resolver/port reentry、prepare-notification retirement、Proxy callback mutation、
Promise own-`then`/constructor与 close-notify fresh-child交错均有 mutation-sensitive tests。
delivery/dead-path audit确认新 Host/catalog仍未进入 public/internal barrel、production
composition或 browser graph，legacy store/Host仍是唯一 live writer；Save/Persistence/M2/
canonical/digest/replay/wire与 live capability docs均未改变。下一独立切片为 S3e。

每个 dormant slice 必须 package-internal、不可由 live System 与旧 store同时写入；若
为了独立合并必须双写、mirror 或提前开放第二个 lifecycle ingress，停止并重切片。

### S3 non-goals and stop conditions

不迁移 Narrative/History、whole-canvas、Title/Splash、runtime-fault 或 DevDock；不实现
S1-R、通用 fault Surface、public generic Surface API 或 application-level receipt；不把
React/DOM/epoch/instance 放进 Base、Snapshot 或 Save；不改变 Save/Persistence/M2/
canonical/digest/replay/wire 语义。

遇到以下任一情况立即停止：

- 需要第二个 Coordinator、System-specific writable store、dual write、subscription/
  effect mirror 或 compatibility view 反向写入；
- transient System 需要 source revision/reconcile 字段，或 candidate 必须取得普通
  input/focus/portal authority才能 prepare；
- custom Saves 只能通过 React 外调用 renderer 才能支持 hooks；
- preparation -> active 必须 remount/reinvoke renderer；render/layout failure 会先退休
  old root 或留下 active-but-invisible；
- StrictMode probe 额外提交 ready/fail、分配 instance、推进 revision 或关闭 owner；
- root/confirmation/pending candidate 无法在一个 Coordinator commit 成组退休；
- successful load/import 必须依赖可能命中 successor 的旧 `close()` callback；
- 必须新增 public Coordinator/generic Surface/application receipt，或改变 Save
  safepoint、Persistence result、M2、canonical/digest/replay/wire bytes；
- Host-commit readiness 不足，必须引入真实 async renderer preparation contract；
- 发现真实外部下游必须继续依赖 standalone writable factory/raw lifecycle component；
- headless 与 browser 必须使用不同 availability/transition 规则。
- initial A -> B supersede 无法在一个 commit 中保持 continuous blocking fallback/
  isolation，或只能先恢复 external focus；
- 取消 pending B、保留 active A 必须 fresh-remount A、推进 topology revision 或轮换
  A input binding；
- distinct concurrent Host 无法在任何 subscription/renderer/input/portal mutation 前
  fail closed，或 candidate resolution 必须随 React props/catalog 原地变化；
- successor 只能按 family 逐个开放 ingress/notify，第二 family activation 中可重入第一
  family，attachment failure 后第一 family 已产生 mutation/identity/notification、仍 active、
  发布 anchor或需要回接 disposed predecessor，或 reentrant successor 可让旧 anchor回写；
- accepted-ready 后 candidate boundary 只能吞错并渲染 `null`，无法委托 existing root
  runtime-fault policy；
- 删除 public `SaveOverlayV1` 发现真实受支持的仓库外下游；
- initial supersede 或 retained-active cancellation 要求公开 generic Coordinator/
  cancel-preparation API。

**S3 acceptance：** System 与 Overlay 使用同一 Coordinator publication；旧 System
store/fallback/local confirmation/raw lifecycle public API 全部删除且没有 mirror；
unavailable dialog 在 allocation 前结构化拒绝；root/child readiness、failure、dismiss、
focus/inert/portal 与 exact deltas 全绿；load/import successor fence 与 stale callback
通过；successor 第一个 family callback 已观察到 all-family active/same publication，
attachment failure 零 pre-terminal Surface mutation/identity/family notification/anchor，
seal 只产生既有 terminal `+1/+1`，
reentrant anchor rotation最终保持最新 runtime/anchor且每代完整通知；Engine Lab 中性
browser、Cat Cafe regression、prebuilt Player、`deno task test`
和 `deno task check` 全绿。Save/Persistence/M2/canonical/digest/replay/wire 行为不变。

## 7. S1-R — External stable-target reconcile

S1-R 是第一个真实 externally published stable-target family 的 activation gate。
按 accepted target ownership，S4 Narrative 计划成为第一个从外部 semantic owner
publication 派生 Managed Surface target 的 family，因此 S1-R 必须在 S4
之前完成。S1-R 不回填 S1-T/S2 transient API，也不把 Coordinator 变成 stable
target owner；此处不声称 live Narrative 已经接入 Managed Surface reconcile。

### Canonical target equivalence

每个 definition 提供 stable schema 与 definition contract revision。比较前严格
执行：

```text
definition schema validation / normalization
  -> Strict Canonical Data
  -> canonical parameter bytes
```

stable target identity comparison 精确包含：

```text
owner
target occurrence
surface definition ID
surface definition contract revision
normalized parameter bytes
```

`undefined`、missing、default 与 `null` 的语义只由 schema normalization
决定。renderer 不提供 equality callback。hash 可以作为 diagnostics 或快速排除，
但 canonical bytes comparison 是最终依据，hash 不得作为唯一等价证明。

同一 occurrence 改变 definition ID、definition contract revision 或 normalized
parameters 是非法 publication；close 后以相同 definition/parameters reopen
也必须使用 fresh occurrence。同一 application epoch 内结束的 occurrence 不得复用。

### Source publication revision

- 每个 stable owner 有自己的 monotonic safe-integer source revision，允许跳号；
  当前 owner/publisher lease 管理该 revision，不得由 React component local state
  管理；
- 同一 lease 还分配 monotonic target occurrence（或 S1-R 明确证明的等价 bounded
  cursor）；作者不手写可任意复用的 opaque occurrence，Coordinator 不维护无界
  retired-occurrence tombstone；
- lower revision 返回 stale；
- equal revision + same canonical vector 返回 idempotent unchanged；
- equal revision + different canonical vector 返回 invalid；
- greater revision 进入完整 vector validation；合法时 accepted reconcile；
- greater revision + same canonical vector（每项完整 identity 都相同）仍推进
  accepted source revision，但 active instance 不重建；fresh occurrence
  不属于 same vector；
- invalid publication 不推进 accepted revision，也不改变 accepted
  vector/pending preparation；
- publication vector 必须先完整验证，再在一个 Coordinator commit 中应用；不得部分
  close/open 后才发现后续 target 非法；
- newer valid/accepted revision 取消该 owner 的 older pending
  preparation。若同一 canonical vector 仍需要 preparation，必须以 newer source
  revision 和 fresh instance ID 重新开始；不得把旧 candidate receipt 改绑到新
  revision；
- stable-target ready/failure receipt 在 S1-T 的 application
  epoch/candidate instance 外，必须再绑定 source revision。

Coordinator 只记录 owner lease 已接受的 source cursor 和 normalized vector，不直接
写回、乐观镜像或另建 writable stable target。source revision 只存在于 stable
reconcile/readiness/publication/diagnostics 路径；普通 transient Surface 不携带。

### Non-goals and merge boundary

- 本切片只交付 dormant、package-internal reconcile kernel、deterministic injected
  publisher lease 与 focused tests；
- 不接入 Narrative、System、whole-canvas、React/DOM/Web Host；Narrative
  adapter 与旧 authority cutover 属于 S4；
- 不加入 `@sillymaker/ui` public Story barrel，不 promotion 作者 API；
- 不改变 Snapshot、Save、replay 或 persistence；
- 不向 S1-T/S2 transient definition、target、handle、publication 或 receipt
  回填 source revision/reconcile placeholder。

### S1-R tests

- schema validation/default/normalization 对 `undefined`、missing、default、`null`
  的 exact cases；
- canonical bytes 同值/异值、definition contract revision 与 owner/occurrence
  identity；
- lower、equal-same、equal-different、greater-same、greater-different revision
  table；
- two-owner independent cursors、legal revision gap 与 non-safe-integer
  rejection；
- publisher-lease occurrence allocation 单调、fresh reopen 不复用，长 churn 只保留
  bounded cursor/live/pending identity；
- invalid vector 原子不应用且不推进 revision；greater-invalid 也不取消现有 pending
  candidate；
- greater-same canonical vector 在 active 时只推进 source cursor、不重建
  instance；fresh occurrence 仍创建 fresh instance；
- newer accepted revision 取消 pending candidate，并以 fresh
  instance/source fence 重新 preparation；
- stale source-revision ready/failure receipt 对 topology/input/focus/publication
  零 mutation；
- owner/publisher lease dispose 后旧 publisher 不能向 successor ingress。

**S1-R acceptance：** externally published stable target 可按 canonical
identity 与 per-owner revision 确定性 reconcile；完整 vector 原子；active
same-vector 不重建，fresh occurrence/pending successor 使用 fresh
instance；renderer callback/hash 不是 equality authority；transient contracts
没有 source placeholder；没有第二份 writable stable target，也没有提前接入 S4。

## 8. S4 — Narrative and History family

S4 依赖 S1-R。Narrative externally published stable target 只由 semantic owner
publication 改变；Coordinator 按 source revision reconcile，UI/controller 不直接
写第二份 stable target。

### Required decomposition

```text
DialoguePlayerController
  typewriter / auto / skip / seen / timing

DialogueView
  speaker / text / choices / skin

NarrativeSurfaceHost
  lifecycle / input / focus / isolation / history / dismiss
```

- `VnLayerV1` 与 `DialoguePanelV1` 的重复 lifecycle 合并；可以保留不同 visual preset，但 controller/host contract 只有一份；
- History 是 managed child/replace surface，不是 panel 内绝对定位视觉层；
- narrative pending occurrence 继续属于 Base semantic contract；Surface instance
  不替代 semantic occurrence，stable target readiness 还必须绑定对应 source
  revision；
- choice action 同时验证 semantic occurrence 与 surface/topology evidence，各自失败返回各自 receipt；
- seen marking、auto/skip 与打字机不进入 gameplay Snapshot，除非 Story 明确将某项设为 gameplay rule。

### Input reset

web adapter 统一处理：

- pointercancel；
- focus/blur；
- visibilitychange；
- pointer capture loss；
- device switch（pointer/keyboard/gamepad）；
- reduced motion/rebootstrap。

**S4 acceptance：** Narrative/History 没有平行 host lifecycle；keyboard/gamepad/pointer 路线一致；旧 occurrence/instance action 稳定拒绝。

## 9. S4b — Whole-canvas primary/detail family

复用已通过 S1-R 验收的 stable-target equivalence/revision contract，在
tooling/harness promotion 前单独迁移整画布功能页，而不是把它隐含在 Overlay 或
Engine Lab fixture 中：

- stable owner 发布互斥 primary target，Coordinator reconcile 为唯一 active
  primary instance；
- transient 或 externally owned detail 形成显式 parent/detail stack，Back
  只按已解析 topology 退栈；
- primary replace、detail close 与对应 hit/action unpublish 在同一可观察 commit
  边界完成；
- renderer 只消费绑定 application epoch、target occurrence、Surface publication
  revision、topology revision 与 source publication revision 的 immutable frame；
- 相同 definition/参数 close 后 reopen 必须产生新的 occurrence/instance，旧
  gesture、action、readiness 与 focus restore receipt 稳定拒绝；
- Engine Lab 先作为中性第二消费者，真实 Story 只提供 Story-local target、内容和
  renderer，不手写 back stack 或平行 page-active booleans。

**S4b acceptance：** primary/detail 是已迁移的独立 live family；页面互斥、
replace/detail/Back、同帧 action publication 与 stale fences 有 focused
model/browser 证据；旧 whole-canvas lifecycle owner 被删除或只读化并有明确
removal gate。

## 10. S5 — Structural tooling and model harness

只有 S2、S3、S1-R、S4、S4b 全部完成后进入。

### Structural check

对 resolved definitions/registries 检查：

- duplicate definition/root slot/input context，以及同一 exact parent 下的 duplicate
  child slot；
- unknown renderer/action/required port/parent/slot；
- invalid definition contract revision/parameter schema；
- modal surface 无 focus target；
- locked surface 无显式完成路径；
- managed/unmanaged owner 争用；
- Story deep import/internal store/raw z-index/global listener；
- owner dispose contract 缺失。

每个 diagnostic 有 stable code、phase、subject/location、invariant、suggestion、`docsId`。不得要求 Agent 从 stack trace 猜修复。

### Pure model and exploration

- 从 Coordinator reducer 自动或半自动生成状态模型；
- seeded sequence 覆盖
  open/replace/push/back/dismiss/readiness/cancel/second-replace/epoch-rotation/
  stable-publication/stale/dispose/input-reset；
- 每步检查 topology 唯一、topmost/input/focus 一致、无 orphan readiness、dispose
  无 owner；
- stable model 覆盖 lower/equal-same/equal-different/greater revision、invalid
  vector 不推进 cursor/不取消 pending，以及 newer accepted revision 取消 older
  preparation；transient model 不伪造 source revision；
- failure 输出 seed、最短 shrunk trace、前后 publication 与 violated invariant；
- 不执行 arbitrary eval，不取得 gameplay setter。

### S5 acceptance

- invalid fixtures 返回精确 code；
- seeded run 可复现/可 shrink；
- 至少捕获一个单 store unit test 无法发现的组合 bug；
- JSON 不泄露 DOM/renderer handles/raw gameplay State。

## 11. S6 — Whole-canvas browser conformance and authoring promotion

Engine Lab 增加中性 synthetic surfaces：home、互斥 primary、detail stack、locked modal、delayed readiness、Narrative/History 交错。

真实浏览器覆盖：

- replace/back topology；
- pointer/keyboard/gamepad cancel；
- first action after open；
- focus restore；
- stale click/readiness/action；
- semantic publication 与 surface target 同帧变化；
- visibility/pointercancel/focus loss/reduced motion/touch；
- Browser Agent observe/dispatch 与用户路径同语义。

等待 publication/topology/readiness/settled signal，不使用任意 sleep。命中验证使用 role、logical hit point 或 `elementFromPoint`；仅 DOM/CSS adapter 才保留 browser trace，不伪造成 pure reducer 反例。

### Declared presentation postcondition receipts

PF2 不引入 universal application receipt；普通 action 在 PF6 也继续保留
input、Surface、semantic/workspace 分层 receipts，不要求统一 envelope。

若 action 明确声明 presentation postcondition，application-composition bridge
必须组合 immutable before/after publication 与各层 receipt，回答：

- input route 是否 consumed；
- Surface transition 是否 applied；
- semantic/workspace effect 是否 committed；
- 声明的 presentation target 是否在目标 revision 成立。

组合结果不能假装跨 owner rollback。若 effect 已 committed、presentation target
却未满足，必须返回结构化 `postcondition_failed` 并保留 committed evidence；
不能投影为成功。未声明 presentation postcondition 的普通 action 不新增
application-wide envelope。

### AI authoring promotion

runtime hard gates 是 deterministic tests + browser conformance。authoring API candidate 稳定后，再用 fresh baseline 做弱模型 canary：

- 只能使用公开 imports/quickstart/diagnostics；
- engine edits/deep imports/internal store = 0；
- 任务覆盖 primary/detail/locked/readiness 与故障修复；
- 记录模型版本、可见文档、工具权限、诊断轮次；
- 失败归因于 API discoverability、diagnostic、default 或模型限制；
- canary 不进入每次提交 CI，但未完成前不得宣称 stable/AI-friendly。

**S6 acceptance：** whole-canvas browser matrix 与 prebuilt smoke 通过；作者
golden path 有第二消费者和 canary 证据；声明 presentation postcondition 的
action 可组合分层 evidence，并在目标未成立时稳定返回
`postcondition_failed`，普通 action 不承担 universal envelope。

## 12. Global acceptance

1. Overlay/System/Narrative/History 各只有一个 writable lifecycle authority；
2. topology/input/focus/dismiss/readiness 从同一 immutable publication 派生；
   modality/input/focus/navigation owner 是可独立断言的维度；
3. action/gesture 以 epoch + instance + topology/input/gesture evidence 拒绝 stale；
   readiness 以 epoch + candidate instance（stable target 再加 source revision）拒绝
   stale；两者都不改变 topology/input/focus；
4. renderer 不旁读更快 State 拼第二帧真相；
5. application epoch 由 composition-root monotonic allocator 管理，不进入 Save；
   successor ingress 前旧 Coordinator 与其 readiness/input/focus/gesture lease
   已撤销；
6. external stable target 经过 schema normalization、canonical bytes comparison
   与 per-owner source revision table；invalid vector 原子不应用、不推进 revision
   且不取消 pending preparation；
7. transient target/API 不携带 source revision/reconcile placeholder，普通非 Surface
   semantic action 不因本 track 扩张 application epoch envelope；
8. missing definition/schema/renderer/required-port/parent/slot 在 topology mutation
   前结构化拒绝，不产生 active-but-invisible 或通用 fault Surface；
9. old owners/adapters 已删除或有短期明确 removal gate；没有 dual write 或 async
   writable mirror；
10. structural + pure model + real browser 三层证据齐全；
11. `deno task test`、`deno task check` 与受影响 E2E/prebuilt 路径通过；
12. public exports 与 live docs 同步；
13. 无 `tmp/**` / `references/**` build/test dependency；
14. whole-canvas primary/detail 已作为独立 family 在 tooling/harness 前迁移；
15. 声明 presentation postcondition 的 action 有组合 evidence 与
    `postcondition_failed` 证明，普通 action 保持分层 receipt。
16. binding-origin unpublished/stale action fail closed，direct untagged
    InputRouter fallthrough 不变；transient identity state 为
    O(resolved owners + live + pending + bounded cursors)，10k churn 不累积历史
    tombstone；
17. root slot 是 topology-recipe global，child slot 是 parent-instance scoped；
    readiness receipt 只绑定 attempt identity（stable 再绑定 source revision），
    不依赖无关全局 topology/publication revision 保持不变。

## 13. Non-goals

- global gameplay/workspace persistence store；
- free-form MDI WindowManager；
- renderer/DOM/focus/animation progress 写入 Save；
- UI DSL/runtime eval/untrusted Mod sandbox；
- Phaser/Pixi/3D renderer 选型；
- 一次性统一所有 semantic/workspace/input receipts；
- 让 Coordinator 直接执行 gameplay rules。

## 14. Stop conditions

- Coordinator 需要读写 gameplay State；
- Base 需要 React/DOM/browser dependency；
- DOM visibility/z-index/focus 成为 active topology 权威输入；
- family 迁移无法在一个 slice 删除旧 writable owner，或需要 dual write/async
  writable mirror；
- stale work 无法凭明确 identity/revision 拒绝；
- application/Coordinator successor 在旧 Coordinator dispose 前开放 ingress；
- successor family adapter 无法 all-bind-before-activation，或 attachment failure 泄漏
  family notification/ingress/anchor publication；
- Story/React component 必须手写 application epoch，或以 local state 管理 stable
  source revision；
- transient pilot 必须预埋 source revision/reconcile 字段才能继续；
- transient/non-reuse 只能靠随历史增长的 retired-ID tombstone，或 root slot
  cardinality 依赖 owner namespace；
- binding-origin Surface action 必须绕过 stale/unpublished fence 才能复用普通
  InputRouter fallthrough；
- readiness correctness 依赖全局 topology/publication revision 不发生无关变化，
  而不是 candidate attempt identity 与原子 cancellation；
- stable target equality 必须依赖 renderer callback 或只比较 hash；
- renderer/port admission 必须创建 active-but-invisible 或通用 fault Surface；
- Headless 必须模拟 CSS/focus/animation 才能判断 gameplay outcome；
- 常见 Story 必须手写 revision、gesture fence、focus trap 或 global isolation；
- browser test 只能靠 sleep/偶然坐标；
- weak-model 只有复制内部实现才能通过；
- 实现依赖私有复刻或未发布 fixture。

## 15. Promotion record

每个阶段记录：red trace、最小 public/internal contract、删除的 authority、
focused/aggregate/browser 命令、Engine Lab 证据、adapter removal gate、未激活的
可选机制。S1-T 先记录 action-provenance closure、10k bounded-churn、slot scope、
owner-dimension table，再记录 epoch allocator/successor handoff 与 readiness
transition matrix；S1-R 记录 canonical equivalence、source revision table 与 vector
atomicity；S2 只证明 transient Overlay pilot；S4 只证明 Narrative/History；S4b
才证明 whole-canvas primary/detail family；S6 才证明 harness 与 authoring
surface。
