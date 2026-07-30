# Managed Surface lifecycle execution plan

状态：2026-07-30 接受执行，审查后重切片。目标合同见 [Managed Surface lifecycle and contract harness](../design/surface-contract-harness.md)。本文只规定可独立交付的实施顺序；不要求一次实现 design 中所有可选字段，也不把作者能力评测绑进 runtime migration。

在 [production-floor sequence](2026-07-30-production-floor-sequence.md)
中：S0–S2 属于 PF2，S3–S4b 属于 PF4，S5–S6 属于 PF6。

## 1. Outcome

所有会改变 input、focus、dismiss、inert 或 z-order 的 UI surface 最终由一套 transient lifecycle authority 解释：

- Workspace Overlay；
- System dialogs；
- Narrative dialogue/history；
- whole-canvas primary/detail recipes；
- 未来由明确 adapter 接入的 Agent workspace surfaces。

Coordinator 不拥有 gameplay/conversation/document/workspace 的持久业务状态。它只把 owner 发布的 stable target reconcile 成 runtime surface instances，并原子发布 topology、routing/focus ownership、dismiss policy 与 readiness。

## 2. Scope control

### Required first-contract fields

pilot 只冻结能够直接防止现有 bug 的最小字段：

- `surfaceDefinitionId`；
- `surfaceInstanceId`（每次 runtime instance 唯一）；
- `ownerId`；
- `slotId` / parent instance（适用时）；
- `topologyRevision`；
- `layer` 与 `modality`；
- dismiss policy（escape/backdrop/routed cancel）；
- focus policy（initial/trap/restore）；
- input context/owner；
- lifecycle（preparing/active/suspended/exiting）；
- readiness state；
- `applicationEpoch`（Managed Surface dispatch/reconcile 的 presentation fence）；
- target occurrence（external stable target 由 owner 提供，transient target 由
  Coordinator 生成）；
- source publication revision（externally published stable target 必须携带；
  Coordinator-owned transient target 不伪造）。

### Deferred until evidence

以下字段/机制不进入 S1 public contract，除非 pilot trace 证明缺失：

- 把 application epoch 扩张到每个普通非 Surface action envelope（Managed
  Surface dispatch 仍按 design 携带 `applicationEpoch`）；
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
| 2   | red            | 同一个 primary slot 先渲染 `alpha` editor，写入 draft 并把 focus 移到 secondary control，再 `openPrimary("beta")`。实际 beta 复用同一 input DOM，draft 仍为 `dirty`，focus 仍在 secondary；期望 fresh instance、空 draft、initial focus。                                                                                                                            | S1 提供 `surfaceInstanceId`；S2 用它作为 React key。不得用 overlay ID 临时拼 key。                                            |
| 3   | red            | `SystemDialogHostV1` 不配置 `saves`，调用 `openSaves(null)`。实际没有 dialog，但 store 为 `{ active: "saves" }`、cancel 落到 gameplay；当前 `void` controller 也无法返回 structured rejection。                                                                                                                                                                      | S3 迁移 System family 时在 intent/open 边界拒绝；不在 PF2 双写旧 store 与 kernel。                                            |
| 4   | green          | [`game-stage.test.tsx`](../../../engine/packages/ui/src/shell/game-stage.test.tsx) 验证 exact descriptor order、slot→host 与同名 z token；`GameStageV1` 的 package-internal frozen descriptor tuple 是 order/slot/inert/omit/pointer/portal 的唯一 runtime source。                                                                                                  | S0 已冻结；不扩张为 public Story API。                                                                                        |
| 5   | red            | Engine Lab Chromium 打开 Dialogue 后同时观察：background 没有 `inert`、`继续`没有 initial focus；打开 History 后按 Escape，History 仍存在。当前行为已明确记录，但不冒充 accepted dismiss policy；三项均是 role/test-id 可见行为，不依赖坐标或 sleep。                                                                                                                | S4 原子迁移 Narrative/History，并在迁移前冻结 per-definition Escape policy；PF2 不给 `DialoguePanelV1` 增加第二套 lifecycle。 |
| 6   | green          | [`pointer-gesture-fence.test.ts`](../../../engine/packages/ui/src/shell/pointer-gesture-fence.test.ts)、[`game-stage.test.tsx`](../../../engine/packages/ui/src/shell/game-stage.test.tsx) 与 [`input.spec.ts`](../../../engine/packages/web/e2e/engine/input.spec.ts) 分别验证 `detail=0/1`、caller 同步卸载后的下层 action、Stage capture 阻断以及 focused Enter。 | S2 保留为 Stage/Web tactical adapter；不成为 Story-owned state。                                                              |
| 7   | red            | 最小 harness 保存 `const staleReady = () => store.openPrimary("old")`，随后 replace、close，再执行旧 callback。实际 store 从 closed 重新变为 `{ primaryId: "old" }`。这是 `unrepresentable_with_current_overlay_contract` 的 proxy trace：旧 store 没有 readiness API，也没有 instance/revision identity 可表达 stale rejection。                                    | S1 实现 stale readiness receipt；S2 用 Overlay pilot 证明 replace/close fence。                                               |
| 8   | green baseline | [`system-dialog-host.test.tsx`](../../../engine/packages/ui/src/system/system-dialog-host.test.tsx) 在 active Host unmount 后同时验证 store closed、dialog removed、System input handler removed、DevDock focus target 回到 base；Overlay Host 的现有用例覆盖 input unregister 与 focus restore。未接入 live Story 的 `VnLayerV1` 不作为 Dialogue lifecycle 证据。   | S1 增加 headless owner/Coordinator dispose；S2 删除或只读化 Overlay 旧 lifecycle authority；Narrative cleanup 留给 S4。       |

因此 S0 的八项 evidence 已齐，但 #2/#3/#5/#7 仍故意保持为已复现、
未修复 fracture。PF2 只继续 S1 与 S2；System 和 Narrative 的 repair 分别留在
S3、S4，不能为了让 S0 全绿而提前迁移。

## 4. S1 — Package-internal lifecycle kernel

### Ownership

- `@sillymaker/ui`：definition types、Coordinator/reducer、immutable publication、React bindings；
- `@sillymaker/web`：DOM focus/inert/top-layer/pointer/visibility adapters；
- `@sillymaker/base`：不感知 React/DOM/Surface；只有已有 semantic publication/intent 契约按需复用；
- Story：发布 stable target/intents 与 renderer contribution，不写 lifecycle counters、global listeners、raw z-index 或 focus manager。

### Kernel operations

最小操作集：

- reconcile owner target；
- open / replace / push child / close top / close owner；
- acknowledge readiness；
- route dismiss intent；
- route action against application epoch + instance + topology revision；
- dispose owner/Coordinator。

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

### S1 tests

- pure reducer transition table；
- duplicate instance/slot/parent、invalid transition、stale revision；
- replace/push/back topology；
- locked dismiss；
- readiness stale ack；
- dispose cleanup；
- immutable publication 与 subscriber failure isolation。

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

剩余 S1 工作包括 close-top/close-owner/route-action、异步 readiness transition、
application epoch 的 composition/HMR 轮换证明，以及在参数等价规则明确后实现
external owner reconcile。

**S1 acceptance：** kernel 可在无 DOM 环境运行；没有 public Story API promotion；没有旧 store 双写。

## 5. S2 — Workspace Overlay pilot

只迁移 Overlay family。不要同时动 System/Narrative。

### Migration

- Overlay definition/renderer resolver 保留 Story-facing capability；
- writable open/detail/back/close 状态迁入 Coordinator；
- dismiss policy、instance identity、parent/detail depth、focus/input ownership 由 publication 读取；
- OverlayHost 只渲染 immutable topology 并发 intents；
- route failure/unknown renderer 在 open 边界拒绝或进入明确 fault surface，不允许 active-but-invisible；
- pointer gesture fence 作为 web/stage adapter 的战术桥接；raw controller 不作为公共 Story API。

### No dual authority rule

迁移提交必须在同一 slice 删除或只读化旧 Overlay lifecycle state。允许短期 adapter 读取旧 API 并翻译为新 intent，但不能同时写旧 store 与 Coordinator；adapter 删除条件写入 promotion record。

### Browser matrix

- open → replace → detail → back → close；
- dismissible/locked 的 Escape、backdrop、routed cancel；
- pointerdown/up/click-through；
- keyboard activation；
- focus initial/trap/restore；
- delayed readiness + replace；
- owner unmount/HMR/rebootstrap。

**S2 acceptance：** Overlay 全部现有产品路径通过；旧 lifecycle owner 删除；Engine Lab 是中性第二消费者；若 pilot 需要跨 Base/Workspace 的巨大 receipt 才工作，停止并修订 design。

## 6. S3 — System dialog family

在 S2 promotion 后单独迁移：

- settings/save/import/confirmation 等 mutually exclusive system slot；
- unavailable dialog 在 intent 边界拒绝；
- system focus scope、portal 与 gameplay inert 由同一 publication；
- load/import 导致 application rebootstrap 时，旧 instance/action/readiness 全部 stale；
- Save safepoint 仍由 gameplay publication 决定，不迁入 Coordinator。

**S3 acceptance：** System store 不再是平行 writable lifecycle authority；无 configured/render truth fork；browser load/import route 通过。

## 7. S4 — Narrative and History family

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
- narrative pending occurrence 继续属于 Base semantic contract；Surface instance 不替代 semantic occurrence；
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

## 8. S4b — Whole-canvas primary/detail family

在 tooling/harness promotion 前，单独迁移整画布功能页，而不是把它隐含在 Overlay
或 Engine Lab fixture 中：

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

## 9. S5 — Structural tooling and model harness

只有 S2–S4b 全部完成后进入。

### Structural check

对 resolved definitions/registries 检查：

- duplicate definition/slot/input context；
- unknown renderer/action/parent；
- modal surface 无 focus target；
- locked surface 无显式完成路径；
- managed/unmanaged owner 争用；
- Story deep import/internal store/raw z-index/global listener；
- owner dispose contract 缺失。

每个 diagnostic 有 stable code、phase、subject/location、invariant、suggestion、`docsId`。不得要求 Agent 从 stack trace 猜修复。

### Pure model and exploration

- 从 Coordinator reducer 自动或半自动生成状态模型；
- seeded sequence 覆盖 open/replace/push/back/dismiss/readiness/stale/dispose/input-reset；
- 每步检查 topology 唯一、topmost/input/focus 一致、无 orphan readiness、dispose 无 owner；
- failure 输出 seed、最短 shrunk trace、前后 publication 与 violated invariant；
- 不执行 arbitrary eval，不取得 gameplay setter。

### S5 acceptance

- invalid fixtures 返回精确 code；
- seeded run 可复现/可 shrink；
- 至少捕获一个单 store unit test 无法发现的组合 bug；
- JSON 不泄露 DOM/renderer handles/raw gameplay State。

## 10. S6 — Whole-canvas browser conformance and authoring promotion

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

## 11. Global acceptance

1. Overlay/System/Narrative/History 各只有一个 writable lifecycle authority；
2. topology/input/focus/dismiss/readiness 从同一 immutable publication 派生；
3. stale instance/topology/semantic occurrence/gesture 均可明确拒绝；
4. renderer 不旁读更快 State 拼第二帧真相；
5. old owners/adapters 已删除或有短期明确 removal gate；
6. structural + pure model + real browser 三层证据齐全；
7. `deno task test`、`deno task check` 与受影响 E2E/prebuilt 路径通过；
8. public exports 与 live docs 同步；
9. 无 `tmp/**` / `references/**` build/test dependency。
10. whole-canvas primary/detail 已作为独立 family 在 tooling/harness 前迁移；
11. 声明 presentation postcondition 的 action 有组合 evidence 与
    `postcondition_failed` 证明，普通 action 保持分层 receipt。

## 12. Non-goals

- global gameplay/workspace persistence store；
- free-form MDI WindowManager；
- renderer/DOM/focus/animation progress 写入 Save；
- UI DSL/runtime eval/untrusted Mod sandbox；
- Phaser/Pixi/3D renderer 选型；
- 一次性统一所有 semantic/workspace/input receipts；
- 让 Coordinator 直接执行 gameplay rules。

## 13. Stop conditions

- Coordinator 需要读写 gameplay State；
- Base 需要 React/DOM/browser dependency；
- DOM visibility/z-index/focus 成为 active topology 权威输入；
- family 迁移无法在一个 slice 删除旧 writable owner；
- stale work 无法凭明确 identity/revision 拒绝；
- Headless 必须模拟 CSS/focus/animation 才能判断 gameplay outcome；
- 常见 Story 必须手写 revision、gesture fence、focus trap 或 global isolation；
- browser test 只能靠 sleep/偶然坐标；
- weak-model 只有复制内部实现才能通过；
- 实现依赖私有复刻或未发布 fixture。

## 14. Promotion record

每个 S 阶段记录：red trace、最小 public/internal contract、删除的 authority、focused/aggregate/browser 命令、Engine Lab 证据、adapter removal gate、未激活的可选机制。S2 只证明 Overlay pilot；S4 只证明 Narrative/History；S4b 才证明 whole-canvas primary/detail family；S6 才证明 harness 与 authoring surface。
