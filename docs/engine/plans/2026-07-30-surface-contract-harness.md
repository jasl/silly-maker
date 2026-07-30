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
- lifecycle（opening/active/closing）；
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

每个操作返回 **surface transition receipt**（applied/unchanged/rejected/faulted + stable code）。它只描述 Coordinator transition，不冒充 semantic command 或 workspace document mutation。

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
