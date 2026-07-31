# Managed Surface lifecycle execution plan

状态：2026-07-30 接受执行，2026-07-31 按 readiness、application epoch、external
reconcile 与 Overlay cutover 决策重切片。目标合同见
[Managed Surface lifecycle and contract harness](../design/surface-contract-harness.md)。
本文只规定可独立交付的实施顺序；不要求一次实现 design
中所有可选字段，也不把作者能力评测绑进 runtime migration。

在 [production-floor sequence](2026-07-30-production-floor-sequence.md)
中：PF2 的顺序是 `S0 -> S1-T -> S2`；PF4 的顺序是
`S3 -> S1-R -> S4 -> S4b`；S5–S6 属于 PF6。S1-T 只建立 transient
lifecycle、application epoch 与 readiness，S2 只依赖 S1-T。S1-R
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
- `topologyRevision`；
- `layer` 与 `modality`；
- dismiss policy（escape/backdrop/routed cancel）；
- focus policy（initial/trap/restore）；
- input context/owner；
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

- stable target owner 与 owner-provided occurrence；
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

| #   | 状态           | 可重复 evidence                                                                                                                                                                                                                                                                                                                                                      | Repair gate                                                                                                                   |
| --- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | green          | [`overlay-host.test.tsx`](../../../engine/packages/ui/src/overlays/overlay-host.test.tsx) 的 locked Overlay 用例同时验证 backdrop、routed cancel、native Escape 都不关闭且不下穿；显式业务 close 仍可用。                                                                                                                                                            | S0 已冻结；S2 从 publication 读取同一 dismiss policy。                                                                        |
| 2   | red            | 同一个 primary slot 先渲染 `alpha` editor，写入 draft 并把 focus 移到 secondary control，再 `openPrimary("beta")`。实际 beta 复用同一 input DOM，draft 仍为 `dirty`，focus 仍在 secondary；期望 fresh instance、空 draft、initial focus。                                                                                                                            | S1-T 提供 `surfaceInstanceId`；S2 用它作为 React key。不得用 overlay ID 临时拼 key。                                          |
| 3   | red            | `SystemDialogHostV1` 不配置 `saves`，调用 `openSaves(null)`。实际没有 dialog，但 store 为 `{ active: "saves" }`、cancel 落到 gameplay；当前 `void` controller 也无法返回 structured rejection。                                                                                                                                                                      | S3 迁移 System family 时在 intent/open 边界拒绝；不在 PF2 双写旧 store 与 kernel。                                            |
| 4   | green          | [`game-stage.test.tsx`](../../../engine/packages/ui/src/shell/game-stage.test.tsx) 验证 exact descriptor order、slot→host 与同名 z token；`GameStageV1` 的 package-internal frozen descriptor tuple 是 order/slot/inert/omit/pointer/portal 的唯一 runtime source。                                                                                                  | S0 已冻结；不扩张为 public Story API。                                                                                        |
| 5   | red            | Engine Lab Chromium 打开 Dialogue 后同时观察：background 没有 `inert`、`继续`没有 initial focus；打开 History 后按 Escape，History 仍存在。当前行为已明确记录，但不冒充 accepted dismiss policy；三项均是 role/test-id 可见行为，不依赖坐标或 sleep。                                                                                                                | S4 原子迁移 Narrative/History，并在迁移前冻结 per-definition Escape policy；PF2 不给 `DialoguePanelV1` 增加第二套 lifecycle。 |
| 6   | green          | [`pointer-gesture-fence.test.ts`](../../../engine/packages/ui/src/shell/pointer-gesture-fence.test.ts)、[`game-stage.test.tsx`](../../../engine/packages/ui/src/shell/game-stage.test.tsx) 与 [`input.spec.ts`](../../../engine/packages/web/e2e/engine/input.spec.ts) 分别验证 `detail=0/1`、caller 同步卸载后的下层 action、Stage capture 阻断以及 focused Enter。 | S2 保留为 Stage/Web tactical adapter；不成为 Story-owned state。                                                              |
| 7   | red            | 最小 harness 保存 `const staleReady = () => store.openPrimary("old")`，随后 replace、close，再执行旧 callback。实际 store 从 closed 重新变为 `{ primaryId: "old" }`。这是 `unrepresentable_with_current_overlay_contract` 的 proxy trace：旧 store 没有 readiness API，也没有 instance/revision identity 可表达 stale rejection。                                    | S1-T 实现 stale readiness receipt；S2 用 Overlay pilot 证明 replace/close fence。                                             |
| 8   | green baseline | [`system-dialog-host.test.tsx`](../../../engine/packages/ui/src/system/system-dialog-host.test.tsx) 在 active Host unmount 后同时验证 store closed、dialog removed、System input handler removed、DevDock focus target 回到 base；Overlay Host 的现有用例覆盖 input unregister 与 focus restore。未接入 live Story 的 `VnLayerV1` 不作为 Dialogue lifecycle 证据。   | S1-T 增加 headless owner/Coordinator dispose；S2 删除或只读化 Overlay 旧 lifecycle authority；Narrative cleanup 留给 S4。     |

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
- current input/focus owner；
- per-instance lifecycle/readiness；
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

### S1e — Composition-root application epoch

**目标：**

- application composition root 持有 monotonic allocator；epoch 是
  presentation/runtime fence，不进入 Snapshot、Save 或 stable target data；
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
  可重新初始化、旧 handle/action 在 successor 下稳定 stale；
- old Coordinator dispose 与 successor ingress 有明确 happens-before
  证明，dispose 后没有 live input/focus owner、routing registration 或 gesture
  lease；
- epoch allocator 与 capture seam 保持 package-internal，不要求 Story
  作者传入 epoch。

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
- ready/failure receipt 绑定 application epoch、candidate instance 与 expected
  topology revision；S1-R 再为 stable target 增加 source revision；
- stale ready/failure receipt 只返回 stale，不改变 topology、input、focus 或
  publication identity。

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
  cancellation 触发器与 stale epoch/instance/topology receipt；
- 每个 cancellation 后的重试都得到 fresh instance ID，失败或取消的 ID
  不复活；
- retain-current 与 fallback 路径在 preparing、ready、failure、cancel
  各阶段都有 exact topology/input/focus/publication 断言；
- successor epoch rotation 在开放 ingress 前取消 pending candidate 并撤销旧
  input/focus/gesture lease，late readiness receipt 稳定 stale。

**S1-T acceptance：** S1a–S1f 的 kernel 可在无 DOM 环境运行；composition-root
epoch 与 readiness cancellation contracts 有确定性证明；没有 public Story API
promotion，没有 source revision/reconcile 占位字段，也没有旧 store 双写。

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

ready/failure receipt 必须绑定 application epoch、candidate instance 与 expected
topology revision；任何 stale receipt 都不得产生 topology/input/focus mutation。
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

### Browser matrix

- open → replace → detail → back → close；
- dismissible/locked 的 Escape、backdrop、routed cancel；
- pointerdown/up/click-through；
- keyboard activation；
- focus initial/trap/restore；
- initial/primary-replacement/child-detail 三类 delayed readiness；
- initial failure + fallback 撤销 + previous focus restore；
- child/detail failure + fallback 撤销 + parent/focus retained；
- replacement failure + old instance retained；
- close/second replace/owner dispose/Coordinator dispose/epoch rotation
  取消 pending candidate；
- stale ready/failure receipt 对 topology/input/focus 零 mutation；
- missing definition/contract-revision/schema/renderer/required-port/parent/slot
  的 direct rejection；
- owner unmount/HMR/rebootstrap 与 successor ingress fence。

**S2 acceptance：** Overlay 全部现有产品路径通过；Coordinator 是唯一 writable
lifecycle authority，旧 open/detail/back/close writer 已删除或只读化且没有 async
mirror；所有 admission failure 在 mutation 前结构化拒绝；readiness transition 与
cancellation matrix 通过；transient API 没有 S1-R 占位字段；Engine Lab
是中性第二消费者。若 pilot 需要跨 Base/Workspace 的巨大 receipt、通用 fault
surface 或第二 writable authority 才工作，停止并修订 design。

## 6. S3 — System dialog family

在 S2 promotion 后单独迁移：

- settings/save/import/confirmation 等 mutually exclusive system slot；
- unavailable dialog 在 intent 边界拒绝；
- system focus scope、portal 与 gameplay inert 由同一 publication；
- load/import 导致 application rebootstrap 时，composition root 先 dispose 旧
  Coordinator、撤销 pending readiness/input/focus/gesture lease，再领取 fresh epoch
  并开放 successor ingress；旧 instance/action/readiness 全部 stale；
- Save safepoint 仍由 gameplay publication 决定，不迁入 Coordinator。

**S3 acceptance：** System store 不再是平行 writable lifecycle authority；无 configured/render truth fork；browser load/import route 通过。

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
  epoch/candidate instance/expected topology revision 外，必须再绑定 source
  revision。

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
- renderer 只消费绑定 application epoch、target occurrence、topology revision
  与 source publication revision 的 immutable frame；
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

- duplicate definition/slot/input context；
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
3. stale epoch/instance/topology/semantic occurrence/gesture/readiness/source
   revision 均可明确拒绝且不改变 topology/input/focus；
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
- Story/React component 必须手写 application epoch，或以 local state 管理 stable
  source revision；
- transient pilot 必须预埋 source revision/reconcile 字段才能继续；
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
可选机制。S1-T 分别记录 epoch allocator/successor handoff 与 readiness transition
matrix；S1-R 记录 canonical equivalence、source revision table 与 vector
atomicity；S2 只证明 transient Overlay pilot；S4 只证明 Narrative/History；S4b
才证明 whole-canvas primary/detail family；S6 才证明 harness 与 authoring
surface。
