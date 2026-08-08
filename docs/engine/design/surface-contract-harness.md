# Managed Surface lifecycle and contract harness

状态：2026-07-30 接受的目标设计，2026-07-31 根据 PF2 pilot 决策与 dormant
kernel 审计修订 readiness、application epoch、stable-target reconcile、slot、
identity boundedness 与 action admission 合同；2026-08-04 冻结 PF4/S3 System
transient topology、initial supersede/retained-active cancellation、exact result/delta
matrix、Host-commit readiness、StrictMode fence 与 public API cutover。
同日 S3a 已建立 dormant System definition/slot/result target、root-candidate
resolution snapshot 与 package-internal initial-supersede/retained-active cancellation
floor；S3b 已把 Overlay lifetime 提升为 composition-owned shared Coordinator，并注入
dormant System session/catalog/config snapshot；S3c.0 已闭合 composition-wide successor
activation barrier；2026-08-08 S3c.1 已闭合 dormant Host-commit readiness、one logical
Host lease、fallback isolation/input/focus rollback 与 StrictMode/error-boundary fence；
同日 S3d 已闭合 dormant exact-parent confirmation child、strict child-bound completion、
exact-root finalization 与 Host-owned focus/gesture lifecycle。S3e live System cutover仍待
实施。
本文固定
影响输入与焦点的 UI Surface 的权威边界、生命周期、输入代际与验证分层，并把“弱模型
能够写出正确代码”提升为作者 API 的验收条件。S1-T 与 S2 已实现，S3a–S3d 只完成
dormant System floor、shared composition authority、Host readiness 与 confirmation child，S3 仍未
promotion；当前 live 能力仍以 [architecture](../architecture.md) 与
[features](../features.md) 为准；执行顺序见
[Surface Contract Harness plan](../plans/2026-07-30-surface-contract-harness.md)。

本文的 **Managed Surface** 专指会改变导航、输入所有权、焦点、模态或 Back
语义的完整 UI 面，例如主功能页、详情页、系统对话框、Narrative
交互面和阻塞式生成结果。它不等于现有 Hotfix `PatchSurface`，也不等于 Narrative
的 `InteractionSurfaceId`；普通按钮、tooltip、装饰层和纯 HUD 不因使用了
“surface” 一词就进入本系统。

## 1. Decision

SillyMaker 建立一个受管的 Surface
lifecycle，并从同一声明生成静态检查、纯状态模型、运行时
publication、输入路由元数据和测试动作。标准作者路径不再要求 Story 或 Mod
分别维护：

- 功能页的多个 boolean、图片槽或 React mount 状态；
- 自制 `window.history` 式 Back 数组；
- z-index、`display`、raycast、inert 和 focus 的同步；
- DOM/Pixi listener 与输入 Action Map 的启停；
- pointer down 与 pointer up 之间发生页面替换时的竞态；
- “Session committed 但真正动作被吞掉”的成功假象。

核心原则是：

> 一个 Surface lifecycle authority，但不是一个包办业务、存档和文档的全局状态库。

Coordinator 只决定“哪些 Surface instance 存在、谁处于
active、谁拥有输入和焦点、谁阻塞谁、Back 作用于谁”。游戏规则、Agent
对话、报表数据、窗口布局文档和生成代码仍由各自领域拥有。

本设计来自两个事实：

1. 当前引擎的 overlay、system dialog、narrative、stage interaction、InputRouter
   和 focus/isolation 分别拥有局部真相，组合正确性仍依赖手工约定；
2. 外部、不可发布的整画布验证 workload 反复暴露同一类故障：视觉画面、可点击动作、导航栈、pending
   interaction 和 React
   状态并非同一权威投影，较弱模型只能逐点补丁，难以证明所有组合闭合。该 workload 只提供抽象行为证据，不是源码、素材或测试依赖。

官方引擎调研与取舍见
[game engine Surface/state/harness research](../../research/2026-07-30-game-engine-surface-state-harness.md)。

## 2. Authority and persistence taxonomy

“当前页面”在不同产品里有不同持久化含义，不能用 Game Save
强行统一。目标分类如下：

| State kind               | Owner                                         | Examples                                                                      | Persistence                                                                |
| ------------------------ | --------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Domain semantic state    | Story Module、conversation/application domain | 当前经营日、角色状态、对话消息、报表参数                                      | 由产品决定；游戏可进 Save，Agent 产品通常进 conversation/domain repository |
| Stable Surface target    | Domain 或 workspace owner                     | 当前主功能为 inventory、当前打开的 artifact revision                          | 可由上层领域恢复；只含稳定 ID 和必要参数                                   |
| Workspace recovery state | Application/Host workspace repository         | 布局、面板尺寸、钉住项、上次打开的文档                                        | 可选持久化；不是 gameplay Save                                             |
| UI Artifact              | Content/conversation artifact store           | 生成的报表 UI、前端预览、OpenUI 文档或代码 revision                           | 通常长期持久化、不可变 revision；不是 live Surface instance                |
| Surface session state    | Surface Coordinator                           | transient target、instance、父子拓扑、active/suspended、managed routing lease | 默认瞬时并可重建；不保存 DOM、listener、focus handle 或 instance ID        |
| Render/input publication | Projector + Coordinator                       | 当前帧视图、可执行 action、命中区域、topology revision                        | 瞬时、只读                                                                 |
| Renderer transient       | React/Pixi/DOM adapter                        | hover、动画进度、decoded texture、pointer capture                             | 不持久化                                                                   |

因此：

- 游戏恢复时可以由 gameplay Save 中的稳定 semantic target 重新创建
  Surface，但不恢复旧 instance ID、焦点句柄或动画进度；
- Agent 产品可以长期保存 conversation 与 UI Artifact，只选择性保存 workspace
  layout；它不需要伪装成 Game Save；
- 临时 editor preview、拖拽 hover 和 animation state 不进入任何领域存储；
- Surface Coordinator 不提供通用 CRUD、query client、ORM、document database
  或跨产品 persistence API。

## 3. Target state model

### 3.1 Static definition

`ManagedSurfaceDefinition` 是构建期、可验证的静态声明，至少表达：

- stable definition ID、definition contract revision、owner 与 source location；
- layer、topology recipe 中的 slot reference 和 activation policy；root slot
  descriptor 由 Coordinator recipe 全局解析，child slot descriptor 由 exact parent
  definition/instance 解析，cardinality 属于 slot descriptor 而不是 owner namespace；
- modality/遮挡、managed input participation/context 与 focus ownership policy；
  input/focus 使用可表达 `none` 的 tagged policy，这三个维度不能由“active”或
  彼此自动推出；
- dismiss policy：Back、Escape、backdrop、routed cancel 分别是否合法；
- initial focus、focus trap/restore policy；
- 按 transition kind 声明的 readiness policy 与 code-native fallback；
- 可执行 semantic action IDs；
- target/request 参数 schema（validation、defaulting 与 normalization）；
- renderer resolver identity 与 required ports；
- 可选的 parent/child 约束。

定义不包含 React element、DOM node、Pixi object、listener、Promise、clock handle
或可变 store。Readiness 不是整个 definition 上的单一枚举；initial open、primary
replacement 与 child/detail open 可以选择不同 preparation policy。

### 3.2 Stable target

领域 projector 发布
`ManagedSurfaceTarget`，描述产品希望显示的稳定语义目标，例如：

```text
primary = inventory(characterId)
detail = item(itemId)
modal = confirm(discardDraft)
```

目标不包含 z-index、focus、mounted、CSS visibility 或 pointer handler。每个
stable target 必须由 owner/publisher lease 的 monotonic occurrence allocator 提供
`ManagedSurfaceTargetOccurrenceId`：它在同一次目标 occurrence 的无关 source
publication 中保持不变，close 后即使以完全相同参数 reopen 也必须换新 ID。每个
target 只有一种写入权威：

- **externally published stable target**：由 gameplay/conversation domain 或
  workspace owner 写入；UI 发送 typed intent 给该 owner，等待新的 immutable
  source publication。Coordinator 只按 source revision reconcile，不直接写回、
  镜像或乐观维护第二份 stable target；
- **coordinator-owned transient target**：只表达本次 UI session 的临时
  detail/modal/navigation occurrence，不承诺跨 restart 恢复。Coordinator
  可以直接 open/replace/close；一旦产品要求持久恢复，该 target 必须升级为前一种
  owner。

对于 gameplay/Narrative 流程，stable target 来自对应 semantic
publication；对于纯 UI 流程，Application 的 workspace store 可以是 stable target
owner。Coordinator 不从 DOM、图片槽或 handler registration 反推任何 target。

Stable-target 参数等价性固定使用以下 pipeline，而不是 renderer callback 或任意
对象深比较：

```text
definition schema validation/normalization
  -> Strict Canonical Data
  -> canonical bytes comparison
```

一个 target 的 identity comparison 同时包含 owner、target occurrence、
definition ID、definition contract revision 与 normalized parameter bytes。
`undefined`、missing、default 与 `null` 是否等价，只由 definition schema
normalization 决定。Canonical hash 可以进入 diagnostics 或作为比较优化，但不能
成为唯一等价依据；最终判断必须能回到 canonical bytes。

Externally published stable target 以 owner/publisher lease 为 revision
authority。每个 owner 的 `sourcePublicationRevision` 是可跳号的 monotonic safe
integer；lease 由 stable owner/application publisher 持有，不能由 React component
local state 管理。Revision 按整个 publication vector 原子验证和应用：

- lower revision：stale；
- equal revision + same canonical vector：idempotent unchanged；
- equal revision + different vector：invalid；
- greater revision：接受 reconcile；
- greater revision + same canonical vector：推进已接受的 source revision，但不
  重建 runtime instance；
- invalid publication：不推进已接受 revision，也不部分应用 vector。

一个更新且有效的 source revision 到达时，取消该 owner 较旧 revision 的 pending
preparation；stable-target readiness receipt 还必须绑定对应 source revision。
Coordinator-owned transient target 不携带伪造的 source revision、stable parameter
vector 或 reconcile 字段。

这里的 same canonical vector 是同一有序 target vector，且每项的
owner/occurrence/definition ID/definition contract revision/normalized parameter
bytes 全部相同；fresh occurrence 即使参数相同也不是 same vector。`greater + same
canonical vector` 对当前 active instance 只推进 accepted source revision，不重建
instance；若该 owner 仍有 older pending preparation，则先取消旧 candidate。目标仍
需 preparation 时，必须分配 fresh instance，旧 receipt 保持 stale。Greater
revision 若 vector validation 失败，不推进 cursor、也不取消既有 pending
preparation；只有 valid/accepted newer revision 触发取消。

Reconcile 不以“任意 source revision 变化”或未规范化参数猜 occurrence：

- 同一 target occurrence ID 且定义/参数未变：保持当前 runtime instance；
- 同一 occurrence ID 却改变定义或参数：target publication 非法；
- target 消失：关闭对应 runtime instance；
- 新 occurrence ID：即使定义/参数相同，也创建新的 runtime instance；
- 同一 application epoch 内复用已经结束的 occurrence ID：结构化拒绝，防止 ABA。

上述 non-reuse 不能靠 Coordinator 永久保留所有历史 ID。Transient occurrence、
instance 与 routing lease 由 application-epoch-scoped monotonic allocator 生成；
stable occurrence 由该 owner/publisher lease allocator（或在 S1-R
冻结的等价 bounded cursor proof）生成，而不是作者任意复用 opaque string。Runtime
只保存 live/pending identity 与
bounded allocator/source cursors，不保存随 open/close 历史增长的 tombstone set。

### 3.3 Runtime session

纯 `ManagedSurfaceSessionState` 根据已解析定义和 target 管理有界拓扑：

- `ManagedSurfaceDefinitionId`：作者声明的稳定 UI 类型；
- `ManagedSurfaceTargetOccurrenceId`：externally published target 由 owner
  提供，transient target 由 Coordinator 生成；
- 可选的 semantic occurrence ID：例如 Base
  `PendingInteraction.occurrenceId`，不能被 target 或 UI instance 身份取代；
- stable `ManagedSurfaceInstanceId`：一次具体 preparation/runtime attempt 的身份；
- monotonically changing `SurfacePublicationRevision`：任意 immutable Surface
  publication commit 的版本；
- monotonically changing `SurfaceTopologyRevision`：active interactive
  topology/action/input fence；纯 preparation 状态变化可以只推进 publication
  revision；
- `applicationEpoch`：load/import/restart/HMR successor 的 presentation fence；
- parent、layer、slot 与 stack position；
- `preparing | active | suspended | exiting` lifecycle phase；
- readiness、input owner、focus owner 与 restore target；
- 当前 managed routing lease 的稳定 ID；physical gesture token/capture 属于
  InputRouter/Web adapter。

modality、input owner 与 focus owner 是三个独立派生维度：blocking 决定下层是否
suspended/inert；input owner 来自最高优先级、active 且声明 managed input
participation 的 instance；focus owner 来自 active 且声明 focus ownership 的
instance，可以与 input owner 不同或为 `null`。lifecycle navigation target 也由
topology 明确给出，`closeTop`/Back 不得通过 input 或 focus owner 反推。

同一个 definition 被再次打开会得到新 instance ID；同 kind、同 stack depth、同
DOM key 或同图片槽都不能代替 instance identity。definition ID、target
occurrence、可选 semantic occurrence、runtime instance、publication revision、
topology revision 与 application epoch 是七个不同概念，不复用一个含糊的 `generation`
字段，但它们的暴露面严格分层：occurrence 标识 owner 的 stable/transient target
occurrence，instance 标识一次 preparation/runtime attempt。同一 occurrence 在没有
candidate replacement 时可以保留当前 active instance；每次新 preparation 都必须
分配 fresh instance ID，失败、取消或退出的 instance 永不复用。Publication 记录
occurrence 到当前 pending/active instance 的映射；dispatch envelope、transition
receipt 与常规诊断仍以 `surfaceInstanceId` 为唯一 Surface 实例身份，不要求作者、
renderer 或测试同时携带 occurrence。semantic occurrence 属于 Base semantic
dispatch 的既有身份，不是 Surface identity 字段。`exiting` Surface
可为了动画继续绘制，但已失去输入所有权；`suspended` Surface 可保留 mounted
状态，但不能接收被上层阻塞的 action。

Transient runtime 不维护 append-only retired occurrence/instance/routing-lease
arrays。Coordinator allocator 的 epoch + monotonic sequence 提供 non-reuse；
production candidate 只能通过该 allocator seam 生成，纯 reducer 只需检查
live/pending duplicate、current-epoch allocation provenance/cursor 与 stale handle。
Disposed owner 也由 bounded resolved-owner domain 表达，不能随任意 owner 历史追加。
该 finite owner domain 在 Coordinator construction 由 package-internal composition/
definition-resolution seam 注入并冻结；它不是从首次 candidate 动态学习的集合。
unknown/late owner 的 open/replace/push/dispose 必须在 identity allocation 与任何
publication mutation 前拒绝。S2 再把 renderer/schema/port/slot 等完整 definition
preflight 接到同一 construction boundary。
这样长生命周期 churn 的状态大小取决于 resolved owners、live/pending topology 与
bounded cursors，而不是历史 open/close 次数。TypeScript brand 不是不可信输入的
security proof，本合同只封闭 package-internal production construction path。

`applicationEpoch` 由 application composition root 的 monotonic allocator
分配，不由 Story、renderer、React component、Coordinator 或 Game Save
拥有。它遵守：

- full page reload 可以从新的计数域重新开始；同一 page/realm 内的
  load/import rebootstrap、HMR successor 与 Coordinator successor 必须领取新
  epoch；
- allocator 位于 HMR successor 生命周期之外，或使用 hot-data/realm-stable cell
  保持单调；测试通过 injection 使用 deterministic allocator；
- Story 作者不手写 epoch；Surface handle、action router 与 readiness adapter 自动
  捕获当前值；
- epoch 作为 package-internal Surface field 进入 runtime publication、
  action/readiness envelope 与 diagnostics，不扩张到普通非 Surface semantic
  action，也不进入 Save；
- successor 开放任何 ingress 前，旧 Coordinator 必须 dispose，并撤销 pending
  readiness、input/focus ownership 与 gesture lease。

Successor construction/binding 与 family activation 是两个 phase。composition root
必须先关闭所有 predecessor family ingress，再让全部 registered family adapter 静默绑定
同一个 successor runtime 与 underlying Coordinator publication；在全部 binding 成功前，
任何 successor family 都不得开放 intent ingress 或发送 family subscriber notification。
随后必须让全部 family 在同一 composition-owned closed gate 后完成可失败的 activation
arming，再以一次不可失败的 gate release 同时开放全部 ingress，才允许第一条 family
notification，最后才发布新的 presentation anchor。第一个 successor family callback
因而已能观察到所有 family 共享相同 `applicationEpoch` 与 underlying publication
identity；第二 family activation 中对第一 family 的同步重入仍被 closed gate 拒绝，不能
看到 partially attached generation。

family activation notification 中发生的 reentrant application-anchor publication 必须由
composition bridge 排队，不能嵌套执行 successor transaction。当前 generation 的全部
family notification 与 presentation anchor 发布完成后，才按最新 queued anchor 进入下一
generation；旧 transaction 不得在较新 successor 后回写旧 anchor或漏掉其余 family
notification。直接绕过 anchor bridge 的 package-internal nested replacement 必须以
transition-in-progress fail closed，且不分配 epoch/Coordinator。

任一 family binding/activation 失败都不得通知 family subscriber、开放 family ingress
或推进 presentation anchor；全部 adapter 必须 abort，fresh successor 必须 seal/dispose，
predecessor callback 继续 stale，且不得 rollback 到已经 disposed 的 predecessor或额外
分配 recovery successor。正常 activation barrier 自身不提交 Coordinator publication、
不推进 topology revision，也不分配 Managed Surface identity；失败后的 successor dispose
只允许现有 terminal publication。

Coordinator 接收一个已经分配的 epoch，并在自身生命周期内保持不变；epoch rotation
通过 successor replacement 完成，而不是原地改写 live Coordinator。

### 3.4 Atomic publication

一次 Coordinator commit 产生一个不可变的 `ManagedSurfacePublication`，原子包含：

```text
surface topology and lifecycle
  + ordered render layers
  + modality and blocking
  + input and focus owner
  + published action catalog
  + readiness
  + application epoch / target occurrence / publication revision / topology revision
  + source publication revision (external stable targets only)
```

renderer、InputRouter、Presentation Observation、DevTools 和 browser automation
消费同一个 publication revision。它们不能在渲染期间旁读“更新一点”的
gameplay/workspace state，再拼出另一组动作或 visibility。Core Agent 继续只观察
player-safe semantic contract；Managed Surface runtime observation
是独立、可撤销的 presentation capability。

这里没有跨 domain/workspace owner 与 Coordinator
的分布式原子事务。前者先原子提交自己的 source publication；Coordinator 再以该
revision 作为因果输入，原子提交 Managed Surface Publication。Application
composition bridge 只有在目标 revision 完成 reconcile 后才发布对应的 runtime
presentation vector，因此 presentation consumer 看到完整旧 vector 或完整新
vector，而不是把两个 owner 的可变状态拼在一起。

## 4. Transition contract

标准路径只暴露少量有方向的语义操作，但依据 target owner 分成两条不能混写的路径：

```text
stable target: requestOpenPrimary / requestReplacePrimary / requestClose
transient target: openTransientPrimary / replaceTransientPrimary
                  pushTransientDetail / openTransientModal / closeExpected / closeTop
both paths: back (route to the current target owner)
```

`request*` 先发送 typed semantic/workspace intent；只有 owner 的新 source
publication 能改变 stable target。`openTransient*` 和 `closeExpected`
才能直接改变 Coordinator-owned session state。`closeExpected` 由 Coordinator
返回的 handle 自动绑定 expected instance/topology revision；标准作者不手写
revision，也不能用 definition ID 关闭一个后来重开的新实例。`toggle`
不作为基础导航原语，因为它要求调用方预先猜测当前状态；便捷 toggle 必须由对应
target owner 原子解析为明确 transition。Back 也不是浏览器 `window.history`
的复制：

- 它只作用于当前最高、最深且声明可处理 Back 的 active Surface；
- modal/detail/primary 的退栈顺序来自已解析拓扑，不从 boolean 列表重建；
- 不可 dismiss 的 Surface 必须有声明的业务出口；物理 Back 可由当前 input owner
  返回 `consumed` 而不触发 transition，直接 transition request 则返回
  `rejected/unchanged`，两者都不能穿透到下层；
- transient target replacement、lifecycle、managed routing lease、focus plan 和
  publication revision 在一次 Coordinator commit 中决定；stable target 的
  domain/workspace commit 与后续 reconcile 以 source revision 因果关联，不伪装成
  同一事务；
- transition 失败时旧 session state 保持完整权威，不发布半开/半关状态。

### 4.1 Readiness policy and preparation

异步准备采用显式 readiness，而不是 `setTimeout(50)`。Definition 按 transition
kind 分别声明 policy；首个 Workspace Overlay pilot 固定：

- initial open：code-native blocking fallback；
- primary replacement：retain current active Surface；
- child/detail open：code-native blocking fallback。

一次异步 transition 遵循：

1. 完成 4.2 的 request/admission preflight；
2. 为本次 preparation 分配全新 candidate instance ID，生成 preparation
   publication；preflight rejection 尚未进入 preparation；
3. 原子进入 `preparing`；candidate 不拥有普通 input、focus 或 semantic action；
4. initial/child policy 发布 code-native blocking fallback projection；replacement
   policy 保留 current instance active；
5. Host 以绑定 application epoch 与 candidate instance 的 receipt 报告
   ready/failure；candidate instance 就是 preparation-attempt identity，
   stable-target receipt 还绑定 source publication revision；
6. candidate ready 后，topology/input/focus 在一次 Coordinator commit 中原子
   activate；replacement 同一 commit 退休旧实例，replacement failure 保留旧实例；
7. initial failure 撤销 fallback，并恢复 preparation 前的 focus owner；
   child/detail candidate 从未取得 focus，因此 failure 撤销 fallback 后保持既有
   parent/focus；replacement failure 保留旧 focus owner。

close、second replace、owner dispose、Coordinator dispose 与 epoch rotation
都会取消相关 pending candidate。失败或取消的 candidate instance 立即退休，永不
复用；会使 candidate 失效的 mutation 必须在同一 commit 取消并移除 pending
attempt。无关 publication/topology 变化不能仅因一个全局 revision 变化就把仍合法的
candidate 变成孤儿；late receipt 通过 epoch + candidate lookup（stable target
再加 source revision）返回 stale，不能产生任何 topology/input/focus mutation。

Revision 推进按 observable fence 分层：retain-current preparation 只推进
publication revision；initial/child blocking fallback 改变 isolation/input fence，
因此推进 topology revision；ready activation 按实际 active ownership/action 变化
推进 topology revision，并总是推进 publication revision。实现必须用 exact
transition table 冻结其余 failure/cancel case，不能让“所有 commit 都加 topology”
重新合并两条轴。

Fallback 是 preparation phase 的 code-native projection，不是另一个普通 Managed
Surface，也不依赖 Story renderer resolver 或 required port。它不能成为第二个
lifecycle authority、普通 action owner 或 stable target。

#### PF4/S3 System transient recipe

System 是 Coordinator-owned transient family，与 Workspace Overlay 共用同一个
composition-owned Coordinator、application epoch、immutable publication、managed
input binding 与 successor lifetime；它不依赖 S1-R，也不携带 source revision、
publisher lease、canonical stable-target vector 或 reconcile cursor。

System topology 固定为：

```text
System owner
└── system.root                         cardinality: single
    ├── settings
    └── saves                           replacement relationship
        └── system.confirmation         exact-parent child, cardinality: single
            └── action_confirmation(load | clear | import)
```

- `settings` 与 `saves` 是两个 definition，共用一个全局 single root slot；standard
  与 custom Saves 只是同一个 `saves` definition 的 renderer variant；
- import 是 Persistence operation，不是另一个 root Surface；load、clear、import
  共用一个 confirmation definition 与封闭、规范化的 invocation 参数；
- confirmation 的 exact parent 必须是当前 Saves root instance。关闭 child 保留
  完全相同的 Saves root、renderer local state、slot-read/result state，并优先恢复
  exact opener；opener 已断开时退回 surviving Saves root 的 initial focus target；
- root close 在一个 commit 中退休 root、child subtree 与相关 pending preparation；
  root replacement preparation 保留完整旧 subtree，ready commit 才原子退休它，
  failure 则保留它；replacement cutover 不先恢复旧 root 的外部 opener，新 root
  继承该 return-focus target；
- root request 遵守下方 exact matrix；相同 pending request 或无 pending 时相同 active
  request 返回 unchanged，不重跑 resolver、不改变 opener；取消不同的 pending
  replacement 时保留 exact active instance/subtree，不重新 preparation；confirmation
  每次重新打开使用 fresh occurrence/instance；
- settings、saves 与 confirmation 的 Back、Escape、backdrop 和 routed cancel 当前
  都允许，所有入口仍经过 exact current handle 与 Coordinator dismiss policy。

Root request matrix 固定为：

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

其中 A/B/C 表示不同 logical root request；System V1 只有 settings/saves，但 C vector
仍作为 generic kernel 完整性合同。需要新 candidate 时先完成全部 preflight；reject/fault
时保留原 pending candidate 与 publication identity，delta 全零。initial A -> B
成功后在一个 commit 中退休 A、分配 fresh B identity bundle，并把同一个 logical
blocking-fallback slot 重新绑定 B；fallback/isolation 连续，但 candidate-bound fence
改变，所以 topology revision 推进。active A + pending B -> request A 则只取消 B，
保留 exact A instance、child subtree、renderer DOM/local state、input binding、focus、
external return-focus target 与 gesture；不调用 A resolver、不分配 identity，且不推进
topology。所有被取消 candidate 的 late callback 均 stale 且零 mutation。

System 沿用 S1-T 的 transition-kind readiness：initial root 与 confirmation child
使用 code-native blocking fallback，root replacement retain current subtree。没有
intent-time synchronous settle 旁路。没有显式异步 `prepare()` 的 renderer 只有在：

> candidate renderer subtree 已在正确的 System portal 完成一次成功 React Host
> commit，candidate root DOM 已存在，且截至该 commit 的 render、constructor 与
> layout-effect 阶段未被 candidate error boundary 判定失败

之后才成为 `host_commit_ready`。它不承诺 browser paint、图片/数据加载或未来 passive
effect 永不失败。

Preparation 与 active 共用以 `surfaceInstanceId` 为 key 的同一个 renderer subtree，
cutover 不重新 mount 或重新调用 renderer。candidate preparation shell 位于同一个
System portal，必须 `inert`、`aria-hidden="true"`、`pointer-events: none`，并以
`visibility: hidden` 或等价方式视觉隐藏但保留 layout；不得使用 HTML `hidden` 或
`display: none`。candidate 不注册普通 InputRouter handler、managed input/focus、
DevDock/System portal target、autofocus、focus restore 或 lifecycle navigation。
initial/child 同时显示 code-native fallback；replacement 则让旧 subtree 保持 visible、
interactive 与 focus-owned。

每个 candidate instance 有 terminal-once settlement gate：`pending -> ready` 或
`pending -> failed`，先到者胜出。ready acknowledgment 由 layout-effect setup 记录
mount generation 后排入 microtask；cleanup 只使该 generation 失效，不发送 failure。
只有 generation 仍 current 且 candidate 仍 pending 的 microtask 可以提交 ready。
因此 React StrictMode 的首次 setup/cleanup probe 不产生 receipt，真实 setup 只提交
一次。close、replace 或 unmount 先取消 candidate；其后的 duplicate/late ready 或
failure 在 Host gate 被抑制，或由 Coordinator 返回 stale 且零 mutation。

ready 前的 render、constructor、layout-effect 或 candidate preparation callback failure
提交 candidate-bound terminal failure：initial/child 撤销 fallback，replacement 保留旧
subtree。candidate-bound failure authority 只在 Coordinator **接受**
`host_commit_ready` receipt 后终止，而不是在 layout callback 排队时终止。accepted ready
之后不再允许 `readiness.fail()`，不复活 retained predecessor，也不追溯修改 open
result；后续 render/lifecycle fault 服从现有 application/root runtime-fault policy。若
candidate boundary 仍包裹 active subtree，它必须向外层重新抛出/委托，不能吞错后渲染
`null`。S3 不承诺捕获 event-handler、passive-effect、timer/Promise、async callback 或
Persistence operation fault，也不建设新的 active-runtime fault taxonomy 或通用 fault
Surface。

一个 `SystemDialogSessionV1` 同时只允许一个 logical Host attachment、一个 System
portal container 与一份 renderer/port catalog authority。System Host attachment 使用
generation/ref-counted lease：StrictMode setup -> cleanup -> setup 是同一 logical lease，
probe cleanup 安排 microtask detach，同一 logical Host 重挂会取消它，且零额外
publication/allocation/settlement/notification。真正 concurrent 的 distinct Host 必须在
subscription/renderer publication、resolver/catalog attachment、portal/input/focus
mutation 前以 package-internal `ui.system_dialog_host_lease_conflict` fail closed；losing
Host 不获得可用 controller、第二 resolver/catalog，也不改变原 Host/session。

每次成功 preflight 把 renderer component identity、accessible metadata、normalized
request、required port identity/bindings、definition contract revision 与 content/config
snapshot 冻结并绑定 candidate instance。Host catalog/props 更新只影响未来 candidate，
不能原地改写 active/pending instance 或 standard/custom Saves variant；相同 active/
pending request 仍按 root matrix 处理，新配置只有 fresh occurrence/replacement 或
application successor 才能生效。真实 unmount 立即关闭该 lease 的新 intent ingress、
ordinary input/focus acquisition 与 terminal readiness acknowledgment；若 microtask
grace 内没有同 logical Host 重挂，则撤销 resolver 并原子关闭/cancel System owner，
但不 dispose 共享 Coordinator。composition
successor 或整体 dispose 才关闭 ingress、dispose 整个共享 Coordinator并按 3.3 的顺序
建立 fresh epoch successor；System live 前必须经过 3.3 的 all-family
bind-before-activation barrier。

### 4.2 Renderer and port admission

Managed Surface 的 topology mutation 或 preparation 开始前，Coordinator 必须完成
整组 preflight：

- definition 存在且 schema/contract revision 合法；
- target parameters 已通过 schema validation/normalization；
- renderer resolver 可解析；
- required ports 可用；
- parent 与 slot descriptor 合法：root slot 在 Coordinator/topology recipe 中
  全局唯一解析；child slot 以 exact parent instance 为 scope；cardinality 从该
  descriptor 读取。owner 是 source/lifecycle/dispose authority，不给 root slot
  建命名空间。

任一条件缺失或非法都直接返回 structured rejection；当前
state/publication identity、topology、input 与 focus 保持不变，不创建 pending/live
instance。Overlay pilot 不允许 `active-but-invisible`，也不建设通用 fault
surface。Code-native preparation fallback 不经过 Story renderer resolver，也不依赖
candidate required port。

### 4.3 System public facade and admission

公开 System API 是 composition-created、opaque、Coordinator-backed 的
`SystemDialogSessionV1`：它只提供 immutable view 与 typed intents，没有 public
constructor/factory。`SystemDialogHostV1` 必须接收该 session，不能创建 fallback store。
`openSettings` / `openSaves` 返回：

```ts
export type SystemDialogOpenResultV1 =
  | {
    readonly kind: "preparing";
    readonly code: "system_dialog.preparation_started";
  }
  | {
    readonly kind: "applied";
    readonly code: "system_dialog.pending_replacement_cancelled";
  }
  | {
    readonly kind: "unchanged";
    readonly code: "system_dialog.already_requested";
  }
  | {
    readonly kind: "rejected";
    readonly code:
      | "system_dialog.renderer_unavailable"
      | "system_dialog.renderer_missing"
      | "system_dialog.required_port_missing"
      | "system_dialog.disposed";
    readonly portId?: string;
  }
  | {
    readonly kind: "faulted";
    readonly code:
      | "system_dialog.renderer_faulted"
      | "system_dialog.transition_faulted";
  };
```

普通 Story API 不暴露 epoch、instance/occurrence ID、publication/topology revision、
readiness evidence 或 parent handle。
Root admission precedence 固定为：

| Order | Condition                                                   | Public result                             | Resolver | Delta        |
| ----: | ----------------------------------------------------------- | ----------------------------------------- | -------: | ------------ |
|     1 | session disposed / ingress closed                           | `rejected / disposed`                     |       no | `0/0/0/0`    |
|     2 | 无有效 logical Host lease / resolver attachment             | `rejected / renderer_unavailable`         |       no | `0/0/0/0`    |
|     3 | request 等于 current pending request                        | `unchanged / already_requested`           |       no | `0/0/0/0`    |
|     4 | 无 pending，request 等于 active root                        | `unchanged / already_requested`           |       no | `0/0/0/0`    |
|     5 | pending replacement 存在，request 等于 retained active root | `applied / pending_replacement_cancelled` |       no | `+1/0/0/1`   |
|     6 | 新 candidate resolver 抛错                                  | `faulted / renderer_faulted`              |      yes | `0/0/0/0`    |
|     7 | resolver 对该 root 返回缺失                                 | `rejected / renderer_missing`             |      yes | `0/0/0/0`    |
|     8 | required port 缺失                                          | `rejected / required_port_missing`        |      yes | `0/0/0/0`    |
|     9 | package-internal slot/owner invariant 意外不成立            | `faulted / transition_faulted`            | complete | `0/0/0/0`    |
|    10 | 无 active、无 pending                                       | initial preparation                       |      yes | `+1/+1/+1/1` |
|    11 | 无 active、有不同 initial pending                           | initial supersede                         |      yes | `+1/+1/+1/1` |
|    12 | 有 active、无 pending、request 不同                         | replacement preparation                   |      yes | `+1/0/+1/1`  |
|    13 | 有 active、有 pending、request 与二者均不同                 | second replacement                        |      yes | `+1/0/+1/1`  |

Delta 顺序是 publication/topology/identity-allocation/notification。generic S1-T
`surface.slot_occupied` 可以保留为 low-level rejection，但经过 System session state
machine 的合法 root intent 不可达该结果，也不进入 public union。

`renderer_faulted` 在同步 open result 中只表示 resolver/preflight fault。candidate
真正 render 失败发生在 open 已返回 `preparing` 后，由 package-internal readiness
failure 与 diagnostics 表达，不追溯改变 open result。definition、contract revision、
schema declaration 与 root slot recipe 的 registration 是 composition-construction
invariant，非法配置应使 composition construction fail closed；每个 request 的 schema
validation/normalization 仍属于 intent preflight，不扩大普通 root open union。

S3e 的 public barrel cutover 删除 standalone writable
`createSystemDialogSessionStoreV1`、旧 `SystemDialogSessionStoreV1` 名称，以及自行拥有
lifecycle 的 `SettingsDialogV1`、`ActionConfirmationDialogV1`、`SaveOverlayV1` 与对应
public props/confirmation dispatch port。package-internal `SettingsDialogContentV1`、
`ActionConfirmationContentV1`、`SaveOverlayContentV1`（或等价内部名称）只能由 managed
System Host 渲染内容与发送注入 intent；不得创建 Dialog root/portal authority、注册
InputRouter/focus/inert、恢复 opener 或拥有 confirmation existence。custom Saves 改为由
Host 以 React component identity 挂载，不能把可能使用 hooks 的 `render()` callback 当
普通函数调用。

`SaveOverlayPortV1`、labels、slot-name、guard、Save slot/result/import 与 System Saves
configuration 等业务/配置类型可以继续公开；parent Surface handle、confirmation
instance/close port、raw Coordinator、readiness adapter 与 opener lifecycle port 不得
公开。custom Saves 只获得内容与业务 intents；confirmation intent 由 package-internal
System context 绑定 exact parent。

### 4.4 Confirmation operation lifetime

每个 confirmation child instance 捕获一份 normalized immutable invocation，并且至多
dispatch 一次 Persistence operation。pending 期间 cancel 仍可用；它只关闭 exact
child，不取消已经 dispatch 的 operation。operation completion authority 是 **strict
child-bound**：只有 captured child 与 captured Saves root 都仍是 current exact
instances 时，completion 才能向该 child 的 confirmation result sink 或该 exact root 的
local operation-result sink 投递，并关闭该 child。

一旦 child 因 cancel、Back、Escape、backdrop、root close/replacement、owner dispose 或
successor 而关闭，它的全部 completion sink 立即撤销。已经 dispatch 的 operation 仍可在
Host/Persistence 层自然 settle，但 delayed success/rejection/fault 不得更新已关闭 child，
也不得向仍存活的原 Saves root 投递 confirmation-bound result，或写入后来新开的 Saves；
captured close/result callback 只能返回 stale 且 Surface delta 为零。operation binding 的
independent `finally` 仍可清理自己的 busy lease，并在 captured exact root 仍存活时按现有
read/status source 请求 refresh；该 cleanup/refresh 不是 confirmation result sink，必须以
exact root fence 拒绝 retired/later root，且不产生 Surface commit。Persistence 自身独立
发布的 status/busy evidence同样不属于被撤销的 confirmation result callback，本节不改变
其公开语义。root 已退休或 successor 已建立时，confirmation callback 与 exact-root
cleanup/refresh都只能 stale。

child 保持 current 直到 completion 时，clear 的 success/rejection/fault 与 load/import
rejection/fault 只关闭 exact child并保留同一个 Saves root；result 只能投递到该 exact
root。successful load/import 由 application anchor successor 清理旧共享 Coordinator，
不依赖旧 root 的额外 `close()`。Save safepoint/guard 与 Persistence pending/result state
变化不产生 Surface commit。

confirmation 因 cancel、failure 或非-successor completion 关闭后，最终 focus 固定恢复
到 captured exact opener；只有 opener 已断开时才退回 surviving exact Saves root 的
initial focus target。result summary 不得在同一 completion 后抢占 focus。若 root 与 child
在同一 commit 中退休，则不得先把 focus 恢复到即将退休的 parent/opener；由 root/subtree
transition 的既有 restore plan 一次完成最终恢复。

## 5. Input, gesture and action outcomes

InputRouter/Web adapter 拥有 physical input normalization、gesture lifecycle
和真实 pointer capture；Coordinator 只按当前拓扑授予或撤销 managed routing
lease，并为 Managed Surface 选择 focus owner 与 managed layer order。纯
HUD、Stage interaction 等非 Managed Surface input owner 继续通过已有声明式 input
contribution 接入 InputRouter，不被强行包装成 Surface。Story/Mod
不得直接操作全局 registration、DOM focus、inert、pointer capture 或 raw layer
order；这种旁路属于 unmanaged escape hatch。

每次绑定 Managed Surface 的输入 dispatch 固定以下 canonical
envelope（本清单是唯一权威定义，其他文档只引用不复制）：

```text
applicationEpoch
surfaceInstanceId
surfaceTopologyRevision
actionId
gestureId
inputPublicationRevision
```

Application composition、Surface handle 与 router binding 自动捕获 epoch 和
revision；Story 作者不构造这些 envelope。Readiness receipt 同样是
package-internal evidence，绑定 `applicationEpoch` 与 candidate
`surfaceInstanceId`；externally published stable target 还绑定
`sourcePublicationRevision`。Readiness 不绑定全局 topology/publication
revision；相关 mutation 通过原子取消 pending attempt 使 receipt stale。

`inputPublicationRevision` 与 binding registration 只在 input contract
变化时轮换；该 contract 至少包含 current input owner/instance、context、routing
lease、action catalog 与 topology revision。仅 Surface publication revision 或
preparation diagnostics 改变、而 active input contract 未变时，必须复用现有 binding
与 `inputPublicationRevision`，不能让 retain-current preparation 误杀旧 active
Surface 的 action 或进行中的 gesture。

任何经 Managed Surface binding 创建或路由的 action 都带有 Surface provenance，
必须先经过 current publication、epoch、instance、routing lease、action catalog 与
gesture fence。binding-origin action 即使 `actionId` 未发布、binding 已被 successor
替换/注销或 Coordinator 已 dispose，也必须结构化拒绝并消费，不能降级成 untagged
InputRouter event 穿透到 ordinary/lower handler。只有调用方直接送入 InputRouter、
且从未经过 Managed Surface binding 的普通 input 才保留既有 fallthrough 语义。

target occurrence 不进入 dispatch envelope：publication 可从 instance 反查当前
occurrence，receipt 用 candidate instance fence 对应 preparation attempt。semantic
occurrence（如 `PendingInteraction.occurrenceId`）由 semantic dispatch payload
携带并由 Base 既有 fence 校验，不作为 Surface envelope 字段重复出现。

不属于 Managed Surface 的 HUD/Stage envelope 至少携带 `inputOwnerId` 与
`sourcePublicationRevision`，并在适用时携带 `semanticOccurrenceId`；它不伪造
surface instance/topology revision。两种 input envelope 都保留 application
epoch、action/gesture identity，并由同一个 InputRouter
完成优先级与消费判定；这不改变普通非 Surface semantic action payload。

pointer down、move、up、click 和 cancel 属于同一个 gesture。若其间 application
epoch、surface instance、topology revision 或适用的 semantic occurrence 改变，旧
gesture 必须被 cancel/reject，不能重新命中新 Surface。focus loss、visibility
change、Surface disposal 和 HMR successor 都由 InputRouter/Web 机械释放 capture
并取消 gesture；Coordinator 同步撤销对应 managed routing lease。

三层结果保持不同词汇，不能互相覆盖：

| Layer              | Outcome                                            | Meaning                                       |
| ------------------ | -------------------------------------------------- | --------------------------------------------- |
| Input route        | `consumed / unhandled`                             | 哪个 owner 是否吃掉物理输入；不声称业务已完成 |
| Surface transition | `applied / unchanged / rejected / stale / faulted` | runtime topology transition 是否按预期发生    |
| Semantic dispatch  | 既有 `committed / rejected / faulted`              | GameSession 的领域事务结果，不因 UI 需要改名  |

PF2 不引入覆盖所有 action 的端到端 receipt。普通 action 始终保留上述 input、
Surface 与 semantic/workspace 分层 outcome，不被强制包装进 application-wide
envelope。

到 PF6 的 AI-friendly promotion，action 若明确声明 presentation
postcondition，则 application-composition bridge 必须组合一个 scoped
`ApplicationActionReceipt`，而不是由 Coordinator、GameSession 或 renderer
单独声称成功。该 bridge 只读取 immutable before/after semantic 或 workspace
publication、各层 receipt，以及适用的 Managed Surface Publication；它没有 raw
State、setter 或 live Coordinator mutation 权限。Core Agent 仍只返回 semantic
receipt。UI/Browser Agent 可通过独立、可撤销的 presentation capability 读取该
scoped application receipt，且它不进入 core Agent transcript parity。

这个声明了 postcondition 的 application outcome 可以规范化为
`applied / consumed / rejected / faulted / postcondition_failed`，但必须内嵌相应
input、Surface 与 semantic/workspace evidence，不能抹掉原始层级。Session 的内部
`committed` 不是 UI/Agent 的 `applied` 证明：一个 action 若被未发布命中区吞掉，
或声明的 presentation postcondition 未满足，就不能被投影成成功。若 semantic
commit 已发生但后置条件失败，application receipt 必须保留 `semantic: committed`
并返回结构化 `postcondition_failed`；它不能虚构 rollback。Receipt 至少携带
action/owner、适用的 instance/topology revision、before/after source
revision、稳定 reason code 和 postcondition evidence。

## 6. Stage and whole-canvas frame coherence

整画布功能页最容易出现“画面已经换了，但旧热点仍在”或“新动作已发布，旧画面仍显示”。Managed
path 要求：

- `RuntimePresentationPublication`、Surface topology、hit/action publication 和
  input owner 绑定同一 application epoch、target occurrence、Surface publication
  revision 与 topology revision；externally published stable-target frame 还绑定
  source publication revision，transient frame 不伪造该字段；
- Stage/Surface renderer 只消费传入的不可变 frame，不旁读 live Session
  或另外一个 store；
- hit callback 在创建时捕获 instance/topology revision，不能只携带 picture
  slot、renderer kind 或数组 index；
- 同一 PendingInteraction 在没有推进 Narrative 时保持 occurrence identity
  稳定；普通 tick 不重造语义上相同的 occurrence；
- replace/close 与对应 action unpublish 在一次 commit 可观察边界内完成；
- animation 可以跨帧，但 input ownership 不由 animation callback 暗中改变。

Pixi、DOM、Canvas 或未来 renderer adapter 都遵守这套上层合同；选择 Pixi
不会自动解决双重状态权威。

## 7. Web platform primitives and coexistence

SillyMaker 是浏览器引擎；modality、focus、dismiss 与 Back 在 Web 平台上已有 UA
强制执行的 managed 原语。本设计的合同层保持自有语义，但 DOM adapter
的执行机制必须对下列原语逐项做出"采用 / 包装 / 自建并检测旁路"三选一
决策，而不是默默自建一套与 UA 竞争的实现：

| Platform primitive                    | Coordinator counterpart                  | Default decision                                                                                          |
| ------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `<dialog>` + top layer（UA 强制栈序） | modal Surface、layer/z-order publication | 包装：modal archetype 的 DOM host 优先渲染为原生 `showModal()`，栈序仍由 Coordinator 决定                 |
| `inert` 属性                          | 非 active Surface 的输入/焦点排除        | 包装：adapter 以原生 `inert` 为执行机制，不手工同步 focus trap 与可交互 boolean                           |
| Popover API（light dismiss）          | transient dismissible Surface            | 评估后包装或不用；不作为 modal 路径                                                                       |
| `CloseWatcher` / dialog close request | dismiss policy 与物理 Back/Escape 语义   | 包装：Escape/Android back 统一进入 close request 路由，由 dismiss policy 判定；Safari 缺口用 keydown 降级 |
| Navigation API                        | Back 语义与 managed routing              | Surface 拓扑不复制 `window.history`；产品级浏览器 Back 整合经 Navigation API interception 适配，另行评估  |
| View Transitions API                  | Surface 切换动画期一致性                 | 可选增强；不得成为第二个 lifecycle 真相                                                                   |

约束：

- Coordinator 保留拓扑与 lifecycle 权威；原生原语只作为 DOM
  执行机制，其事件（`close`、cancel、light dismiss）必须回流为 typed
  transition/receipt，不得直接改 session state；
- top layer 共存规则：managed Surface 的 modal 渲染路径要么统一使用 top
  layer，要么统一不使用；作者/Mod 内容直接使用原生 `<dialog>`/`popover` 属于
  unmanaged escape hatch，structural check
  必须能发现并警告，防止出现两个模态权威；
- 调研与浏览器支持现状见
  [game engine Surface/state/harness research](../../research/2026-07-30-game-engine-surface-state-harness.md)
  的 Web 平台一章；具体采用矩阵在 P1 focused prototype 中冻结。

## 8. AI-friendly authoring path

AI-friendly 是作者 API 的设计约束，不只是“多写文档”。标准声明应接近：

```ts
defineManagedSurfaceV1({
  id: "surface.inventory",
  contractRevision: 1,
  owner: "surface-owner.inventory",
  archetype: "workspace_primary",
  input: { context: "inventory", actions: inventoryActionIds },
  focus: { initial: "inventory.first_item", restore: "opener" },
  readiness: {
    initialOpen: "blocking_fallback",
    primaryReplacement: "retain_current",
    childOpen: "blocking_fallback",
  },
});
```

具体字段名在 focused type prototype 中确定，但下列约束不变：

- 首版优先提供
  `workspace_primary`、`workspace_detail`、`system_dialog`、`narrative`、`confirmation`
  等少量合法 archetype，由 archetype 固化 layer/slot recipe/modality/dismiss/input/
  focus 的大部分组合；cardinality 只来自 archetype 引用的 resolved slot descriptor，
  普通作者不自由拼七八个相关 boolean 或覆盖 cardinality；
- builder/scaffold 生成重复机械结构、stable IDs、test driver metadata
  和默认可访问性；
- 常见 recipe 有安全默认值，缺少关键 policy 时 definition check
  失败，不静默猜测；
- 标准控件自动得到稳定 `managedSurfaceDefinitionId`/`actionId` locator，Agent
  和测试不依赖 DOM path、文案、坐标或图片槽；
- 模型不手写 back stack、全局 listener、z-index、focus restore、Action Map
  enable/disable 或 visible/interactable/raycast boolean 组合；
- inspect 输出合法 transition、当前 owner、可用 actions、声明来源和相关示例；
- 项目私有 API 没有训练数据，必须以可发现性补偿：类型签名即文档、每个 archetype
  在 quickstart 内有可复制示例、inspect 能列出合法
  definition/transition；这些补偿面与 API 一起进入 capability-floor
  验收，不是事后补文档；
- generator 输出普通 TypeScript/React，可被人类继续编辑，不引入另一套低代码
  runtime；
- `unmanagedSurface` 必须显式命名并产生 warning；它不能假装拥有 managed
  guarantees，进入发布前要提供额外 conformance tests。

## 9. Diagnostics for self-correction

每个 Surface diagnostic 继续使用共享 `DiagnosticEnvelope`，并至少能表达：

```text
stable code and docsId
definition/source location
surface/action/owner identity
current state vector
attempted transition or input
expected and actual outcome
violated invariant
suggested supported fix
minimal trace
seed, shrink path and replay command when generated
```

普通错误必须直接贴到声明或首次分歧，不要求模型解析 stack trace、遍历 React tree
或猜测哪一个 boolean 漏同步。必须 hard-fail 的例子包括：

- duplicate definition/root-slot/action ID；
- 同一 slot 出现非法 cardinality；
- definition/schema/renderer resolver/required port/parent/slot preflight 缺失；
- equal source revision 携带不同 canonical vector，或 invalid vector 推进了 accepted
  revision/取消了 pending preparation；
- action 指向不存在或非 active owner；
- modal 无合法业务出口；
- Back 可能穿透不可 dismiss Surface；
- focus target 不存在或 restore owner 已失效；
- managed code 直接注册第二 input owner；
- render publication 与 action publication topology/source revision 不一致；
- action/gesture 的 epoch/instance/topology revision，或 readiness 的
  epoch/candidate instance/source revision 任一不匹配，却仍被应用；
- Managed Surface binding-origin 的 unpublished/stale action 穿透 ordinary
  InputRouter handler；
- transient churn 让 retired identity state 随历史无界增长；
- action 声明 postcondition 却返回假成功；
- modal 下仍武装底层 chrome / 不可见图 hit（dense picture SLG 的典型“偷点击”
  类；验收分类见执行计划 P0.3）。

## 10. Contract Harness

一个“万能 Harness”无法理解任意游戏业务。SillyMaker 采用分层验证，并让 Surface
声明自动生成其中的机械部分：

| Layer                  | Purpose                                                         | Typical command                    |
| ---------------------- | --------------------------------------------------------------- | ---------------------------------- |
| Structural check       | definition、ID、dependency、cardinality、action/focus/back 闭合 | `story check`                      |
| Pure model conformance | transition reducer 与不变量；小状态图可穷举                     | testkit                            |
| Seeded exploration     | 自动生成合法/非法序列并 shrink 最小反例                         | `story explore surfaces`（概念名） |
| Frame-aware runtime    | virtual clock、queued input、readiness、跨帧 lifecycle          | testkit/runtime                    |
| Browser interaction    | 真实 hit-test、遮挡、focus、pointer capture、layout             | Engine Lab browser suite           |
| Artifact/prebuilt      | build 后 Host、刷新恢复、资源失败和设备差异                     | prebuilt conformance               |

纯参考模型只保留必要状态：

```text
primary/detail/modal topology
lifecycle/readiness
application epoch, publication revision and topology revision
blocking/input/focus/navigation owner
active gesture
accepted source revision (stable-target model only)
```

它不得复制生产实现后“自己测试自己”。生成命令至少覆盖：

```text
OpenPrimary / ReplacePrimary / PushDetail / OpenModal
Back / Close / Dismiss
PointerDown / PointerMove / PointerUp / PointerCancel
LoseFocus / ChangeVisibility / AdvanceFrame
Ready / FailReady / CancelPreparation / SecondReplace
DisposeOwner / DisposeCoordinator / RotateApplicationEpoch
PublishStableTargets / Restart / SaveReloadTarget
```

Readiness transition table 必须分别覆盖 initial open、primary replacement 与
child/detail open；stable-target model 还覆盖 lower/equal/greater revision、
invalid vector 不推进 cursor/不取消 pending、greater accepted revision 取消 older
preparation，以及 source-bound receipt。Transient model 不为复用同一 command
shape 伪造 source revision。

随机执行必须固定 seed、可
shrink、可直接重放；报告第一处分歧和最短命令序列，不向模型倾倒数百步 chaos
log。Frame-aware runtime 必须允许把“事件入队”和“推进一帧”拆开，直接表达：

```text
pointerDown(action at topology revision N)
replacePrimary(...)
advanceFrame()
pointerUp(old gesture at topology revision N)
```

Browser 测试仍不可替代：DOM/Pixi hit-test、CSS stacking、pointer
capture、focus、资源加载和真实布局只能在真实 Host 证明。反过来，浏览器
screenshot 也不能替代 semantic outcome 与 invariant 断言。

## 11. Capability-floor evaluation for weaker models

确定性的 type/unit/model/runtime/browser contracts 是合并 gate 与本 track
的完成判据。LLM evaluation 本身有方差且托管 API 不保证 seed
复现，因此它不进入任何每次提交的阻塞路径，也不是随作者面每次变动而重置的
常驻义务；它以**冻结点战役**（per-freeze campaign）的形式提供 capability-floor
evidence：

- 每个作者 API 冻结候选执行一次战役：从版本化 fresh baseline
  重复执行固定任务，不从已经修好的工作树继续；
- 每次战役固定并记录 capability-floor 模型集（model +
  version）、prompt、baseline commit、允许读取的文档边界与运行日期；不承诺 LLM
  侧 seed 复现，确定性由 contract tests 而非模型输出保证；
- 任务包含互斥整画布页、详情、modal、Back、异步 readiness 和 stale gesture；
- `engine/**` edits、deep import、内部 singleton、unmanaged escape hatch、手写
  DOM listener/back stack 均为 0；
- 结构检查、model exploration、frame-aware test、browser route、build/prebuilt
  smoke 全部通过；
- 失败后只允许根据结构化 diagnostic 修复；记录首次通过前的诊断轮次与所需上下文；
- 每次战役至少 5 次隔离 run，报告成功率区间与中位修复轮次，并与上一冻结版本
  对比；promotion 判据是“归因于 API discoverability、diagnostic quality 或
  missing default 的失败为零（或已修复并重跑受影响任务）”，不是单一 N 取 M
  硬门槛；
- 冻结后作者面发生增量扩大时，只对新增/受影响的任务面重跑，不整套重置。

Canary 的目标不是考模型记忆，而是发现引擎是否仍要求作者理解内部 mount
顺序、隐含时钟或多份状态真相。若较弱模型持续以同一种方式失败，应优先收窄
API、增强默认值或生成更好的 diagnostic，而不是继续给 prompt 增加仓库内部知识。

## 12. Package ownership

| Owner / package                                             | Target responsibility                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@sillymaker/base`                                          | 继续拥有 gameplay State、PendingInteraction/occurrence、Session semantic outcome 与共享 `DiagnosticEnvelope`；不分配 Managed Surface application epoch，也不拥有 managed topology、focus、modal stack 或 workspace layout                                                                               |
| DOM-free `@sillymaker/ui` contracts/authoring/testkit entry | Managed Surface definitions/archetypes、opaque epoch/identity types、resolved registry、纯 Coordinator/reducer、instance identity、topology publication、transition receipt、invariants 与 model helpers；Coordinator 接收 fixed epoch，不拥有 allocator；不得经 UI root barrel 意外加载 CSS/React Host |
| `@sillymaker/ui` React/runtime entry                        | application-instance-local Coordinator host、React renderers/Portal、InputRouter integration、inert/focus/dismiss adapter、publication store，以及只消费 immutable evidence 的 application-receipt composition helper；消费 composition root 捕获的 epoch，不拥有 gameplay State 或 durable repository  |
| `@sillymaker/web`                                           | DOM focus/inert/pointer-capture/visibility adapter、physical input normalization、realm/hot-data stable cell 的 Host 机制、独立 Presentation Observation/automation adapter、real-browser conformance；不把 allocator ownership藏进 React component 或 Coordinator                                      |
| Application composition root                                | monotonic application-epoch allocator、Coordinator successor 的 dispose-before-ingress 顺序，以及 Surface handle/router/readiness adapter wiring；load/import rebootstrap、HMR 与 Coordinator successor 在这里领取新 epoch                                                                              |
| Stable owner/application publisher                          | gameplay/conversation/workspace target、typed intent wiring与 publisher lease；按 owner 管理 source revision 和 bounded monotonic occurrence allocator，不由 React component local state、作者 opaque string 或 renderer 管理                                                                           |
| `@sillymaker/tooling`                                       | project inspection、structural checks、model exploration/replay command、human/JSON diagnostics；不得进入 browser bundle                                                                                                                                                                                |
| UI testkit + existing Base testkit                          | UI testkit 提供 deterministic epoch allocator/publisher lease injection、pure model、virtual clock/input、seeded sequences、shrink/replay；Base testkit 继续提供 GameSession/semantic harness，两者通过 public contracts 组合                                                                           |
| Story/Mod                                                   | domain state/rules、definitions、renderers、semantic actions、声明 stable target 与 presentation postcondition，以及产品级 recovery policy；普通作者不手写 epoch/source revision，不拥有 Coordinator lifecycle                                                                                          |

`SurfaceContributionOwnerId` 是 UI contribution owner，不等于 GameplayModule
State owner。Coordinator 不获得 `GameSession`、Snapshot setter、generic State
client 或 Host record store；它只消费上层产生的稳定 desired target。若 Node
tooling 需要读取 UI definition，应增加无 CSS/React side effect 的 UI
子入口，不能为了加载方便把 UI 专属合同下沉 Base。

## 13. Migration and compatibility

现有 overlay/system/narrative/interaction surface 不一次性重写。迁移遵循：

1. 先用现有公开合同证明 source-publication tearing、semantic occurrence
   重造、physical gesture 穿越 unmount 和不可见 input lock；此步不预造 Surface
   instance/topology/receipt；
2. 先交付 S1-T：纯 definitions、transient state model/Coordinator、
   transition-kind readiness 与 composition-root epoch；在接入 live family 前先
   关闭 managed-action provenance bypass，以 bounded allocator/cursor 替换历史
   tombstone arrays，并冻结 root/child slot scope 与
   modality/input/focus/navigation 独立语义；不加入 external source
   revision/reconcile 占位字段；
3. S2 只以 Coordinator-owned transient target 迁移 Overlay；同一 cutover slice
   删除或只读化旧 Overlay store 的 open/detail/back/close 写权；
4. S3 单独迁移 SystemDialog：S3a–S3d 只建立 dormant/test-only path，S3e 在同一
   cutover 删除 standalone writable store、Host fallback、React-local confirmation
   lifecycle 与 standalone public lifecycle hosts；System 与 Overlay 必须共用一个
   composition-owned Coordinator，不得出现双写或 writable mirror。在第一个真正
   externally published stable-target family 前完成 S1-R canonical
   equivalence/source-revision reconcile。按当前 target ownership，S1-R 位于 S3 与
   Narrative/history 之间；
5. 随后迁移 Narrative/history、whole-canvas primary/detail 与 stage
   interaction；whole-canvas 是独立 family，必须在 structural tooling/harness
   前完成；迁移一项就删除它的平行 lifecycle authority；
6. Window model 的“系统单槽、workspace 主窗 + 详情栈、确认层”保留为产品拓扑
   recipe，坐落在统一 lifecycle 上；
7. SillyOS 的自由 MDI store 继续是 Story
   侧产品状态；它只把会影响全局输入/模态的边界登记到
   Coordinator，不把几何、最小化、任务栏和文档内容上提为通用 WindowManager；
8. 完成 Engine Lab whole-canvas 与浏览器验证后，才把 managed path 宣称为 live
   feature。

Overlay legacy adapter 只有两种合法形状：把旧 controller call 翻译成 Coordinator
intent，或从 immutable Coordinator publication 派生 read-only compatibility
view。禁止同时写旧 store 与 Coordinator，禁止 effect/subscription 驱动的异步
writable mirror，也禁止从 compatibility view 反向同步 authority。若同一 cutover
slice 无法消除双 writable authority，立即停止并修订设计。

Surface session state 的格式不是 Game Save format。若未来允许 workspace
recovery，只持久化上层 stable target/layout schema，并在启动时重新解析
definitions、创建新 instance/topology revision；不得反序列化旧 live session。

## 14. Non-goals and stop rules

本设计不做：

- 通用 Redux/ORM/ECS replacement；
- 任意 UI 状态持久化或“一切都进 Save”；
- DOM/Pixi/Canvas scene tree 的完整抽象；
- 自由桌面 WindowManager、拖拽几何或任务栏；
- 通过 tag/boolean bag 表示 stack 与 cardinality；
- runtime expression DSL、AI-only component language 或不可信代码沙箱；
- 只靠 screenshot、sleep 或模型评审证明行为正确。

出现以下情况时停止实现并修正设计：

- Coordinator 开始拥有 gameplay、conversation、artifact 内容或数据库查询；
- renderer/React state、input registration 或 DOM existence 可反向改变 Surface
  authority；
- 同一 managed Surface 仍可从 Coordinator 之外改变 focus/input/z-order/back；
- compatibility adapter 需要双写、异步 writable mirror 或反向同步才能维持旧
  Overlay API；
- transient pilot 为复用 future reconcile shape 而预埋 source revision、stable
  parameter vector 或 reconcile 字段；
- transient/non-reuse 只能靠随历史增长的 retired-ID tombstone，或 root slot
  cardinality 依赖 owner namespace；
- binding-origin Surface action 必须绕过 stale/unpublished fence才能复用普通
  InputRouter fallthrough；
- readiness correctness 依赖全局 topology/publication revision 不发生无关变化，
  而不是 candidate attempt identity 与原子 cancellation；
- Headless 与 Browser 需要不同业务 availability 或 transition rules；
- 为了支持 renderer 必须把 DOM/Pixi handle 放进 Base、Snapshot、Save 或 semantic
  publication；
- generated model 与生产 reducer共享同一实现，失去独立 oracle；
- acceptance 只能靠提高模型等级、延长 prompt 或反复 sleep 才通过；
- 实现只是在 OverlaySession、SystemDialogSession、Narrative/History
  lifecycle、whole-canvas Story UI route state 与 InputRouter
  旁新增一个 Coordinator，而没有逐项迁移并删除旧 authority。
- System 需要第二个 Coordinator、System-specific writable store、dual write、异步
  writable mirror 或 compatibility view 反向写入；
- transient System 必须携带 source revision/reconcile 字段，或 preparation candidate
  必须取得普通 input、focus、portal target、semantic action 或 navigation authority；
- custom Saves renderer 必须在 React 外被当作普通 callback 调用，或
  preparation-to-active cutover 必须 remount/reinvoke renderer；
- System render/layout failure 会先退休旧 root、留下 active-but-invisible instance，
  或 StrictMode probe 会额外 settlement、分配 instance、推进 revision、关闭 owner；
- root、confirmation subtree 与 related pending candidate 无法在一个 Coordinator
  commit 中成组退休，或 successful load/import 必须依赖 stale predecessor root 的
  `close()`；
- System migration 必须扩大 public generic Coordinator/Surface API、改变
  Save/Persistence/M2/canonical/digest/replay/wire 语义，或 headless 与 browser 需要
  不同 admission/transition rules；
- `host_commit_ready` 不足以表达现有 renderer，必须引入真实异步 renderer
  preparation contract，或发现真实外部下游必须保留被删除的 standalone writable/raw
  lifecycle API。
- initial A -> B supersede 无法在一个 commit 中保持 continuous blocking fallback/
  isolation，或只能先恢复 external focus；
- 取消 pending B、保留 active A 必须 fresh-remount A、推进 topology revision 或轮换
  A input binding；
- distinct concurrent Host 无法在任何 subscription/renderer/input/portal mutation 前
  fail closed，或 candidate resolution 必须随 React props/catalog 原地变化；
- successor 只能逐 family attach 后立即开放 ingress/notify，第二 family activation 中可
  重入第一 family，attachment failure 后留下任一 successor family active、已产生
  pre-terminal mutation/identity/notification/anchor或仍可写入，reentrant successor 可让旧
  anchor回写，或 activation callback 中的 composition dispose 后仍发布/继续 drain anchor；
- accepted-ready 后 candidate boundary 只能吞错并渲染 `null`，无法委托 existing root
  runtime-fault policy；
- 删除 public `SaveOverlayV1` 发现真实受支持的仓库外下游；
- initial supersede 或 retained-active cancellation 要求公开 generic Coordinator/
  cancel-preparation API。

## 15. Acceptance

本设计只有在以下行为全部由 live implementation 和测试证明后才算完成：

1. 一个 whole-canvas Engine Lab route 覆盖
   home/status/storage/specimen-catalog、detail、modal 与
   Back，页面互斥和真实激活顺序由 Coordinator 唯一决定；
2. publication 原子包含 render/action/input/focus/lifecycle，renderer
   不旁读第二状态；
3. Overlay 的 initial open、primary replacement、child/detail open 分别遵守固定
   readiness policy；每次 preparation 使用 fresh instance，ready 后原子切换，
   failure 与所有 cancellation path 都保持 failure-atomic；
4. definition/schema/renderer resolver/required port/parent/slot admission
   在 topology mutation 前完成；rejection 不创建 instance、不改变
   topology/input/focus，且不产生 active-but-invisible/fault surface；
5. pointer-down → replace → pointer-up、focus loss、visibility change、async
   readiness、restart/HMR 的 stale 回调全部被
   action 的 instance/topology-revision/epoch fence，以及 readiness 的
   epoch/candidate-instance（stable target 再加 source revision）fence 拒绝且零
   topology/input/focus mutation；successor ingress 前旧 Coordinator、pending
   readiness、routing/focus 与 gesture lease 已全部撤销；
6. transient kernel 在 10k+ open/replace/close churn 下只保留
   O(resolved owners + live + pending + bounded cursors) identity state；root slot 全局、child slot
   parent-instance scoped，modality/input/focus/navigation owner 可独立断言；所有
   binding-origin unpublished/stale action fail closed，untagged InputRouter route
   保持既有 fallthrough；
7. S1-R 证明 schema normalization → Strict Canonical Data → canonical bytes
   equivalence、完整 identity tuple、per-owner revision 状态表、atomic vector 与
   source-bound readiness；transient contract 不携带占位 source 字段；
8. input、Surface transition、semantic/workspace dispatch 保持分层
   receipt；普通 action 不要求 application-wide envelope。声明 presentation
   postcondition 的 action 必须组合 scoped application receipt，且只有在对应
   postcondition 成立时才返回 `applied`；若 domain 已 commit 而 presentation
   postcondition 失败，返回 `postcondition_failed` 并保留 committed evidence；
9. structural check、pure model、seeded shrink、frame-aware runtime、browser 和
   prebuilt 各有清晰职责及至少一条故障证明；
10. invalid Story 返回稳定
    code、location、current/attempted/expected/actual、suggestion、minimal trace
    和 replay command；
11. 至少完成一次固定 fresh-baseline 的 capability-floor 战役（协议见 11
    节）并产出归因报告，run 中不修改 engine、不 deep import、不使用 unmanaged
    escape hatch；作者 API 的 stable/AI-friendly
    声明以战役证据为准，后续增量扩大只重跑受影响任务面；
12. 已迁移 subsystem 的旧 lifecycle store/listener/boolean truth
    被删除或只读化；compatibility adapter 只允许 intent translation 或 immutable
    read-only projection；
13. System 与 Overlay 共用同一个 composition-owned Coordinator/application epoch/
    publication/successor lifetime；settings/saves single root、Saves exact-parent
    confirmation child、initial supersede、retained-active pending cancellation、
    initial/child fallback、replacement retain-current、one logical Host、candidate snapshot、
    same-key Host-commit cutover、accepted-ready fault boundary、StrictMode terminal-once 与
    exact async operation handle 均通过 deterministic counts 与 browser evidence；
    confirmation cancel 后 operation 可自然 settle，但 strict child-bound completion sink
    已撤销，对 child、原 root 与后来 root 均零 confirmation-result mutation；operation
    binding 的 independent finally只可清 busy并 refresh仍存活的 exact原 root，不得命中
    retired/later root，且 Surface delta为零；非-successor close
    的最终 focus 为 connected exact opener，只有 opener 断开才退回 exact parent initial
    target，result summary 不抢焦；dormant S3 delivery 以 reviewed full diff、bounded
    import/export/attachment reference search 与 worktree audit 证明新 path 未进入 public
    barrel、live composition/browser graph，且 legacy writer 仍是唯一 live authority；该
    dead-path evidence 记录在 delivery record，不建立冻结 exact file/source inventory 的
    常规 CI test；每次
    successor 的第一个 family callback 已证明全部 family 绑定同一 epoch/publication 且
    ingress 一致，第二 family binding/activation failure（含 closed-gate reentry）则零
    pre-terminal Surface mutation/identity/family notification/anchor publication，seal 只产生
    既有 terminal `+1/+1`；reentrant anchor按代完整通知/发布且最终 runtime/anchor一致，
    activation callback 中 dispose 后不发布或继续 drain anchor；S3e
    同一 cutover 删除旧 System writer/fallback/raw lifecycle public API 与 public
    `SaveOverlayV1` component，且 Save/Persistence/M2/canonical/digest/replay/wire 不变；
14. [architecture](../architecture.md)、[features](../features.md)、[story authoring](../story-authoring.md)
    与 public exports 在实现落地时同步更新。
