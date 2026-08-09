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
exact-root finalization 与 Host-owned focus/gesture lifecycle。2026-08-08 进一步冻结 S3e
前置的 composition-bound successor acknowledgment、fail-closed lifecycle capability 与
terminal application teardown；这些 package-internal 机制不改变 Core
`SessionAnchorResultV1` 或任何 Save/Persistence wire。2026-08-09 S3e live cutover
与 promotion 已把 System ingress、Host、Settings/Saves content 与 exact-parent
confirmation 接到 shared Coordinator，并删除旧 writable store、fallback Host 与
standalone lifecycle exports；full/browser/prebuilt 回归与最终 adversarial review均通过。
同日 S1-R pre-implementation review 冻结 parent/order identity、专用 per-lease source
revision、readiness failure desired/runtime divergence、empty/dispose、cross-owner 与
bounded exact admission 边界；同日 S1-R.0 已把 pure publication/target/identity/result
shapes、fixed bounds、stable code precedence 与 exact source/runtime delta table 固定为
package-internal dormant contract；S1-R.1 已进一步固定 composition-owned publisher
registry、opaque lease、source/occurrence issuance、immutable accepted-occurrence high-water、
dispose/ABA 与 bounded churn；S1-R.1a corrective 又补上 exact accepted-cursor-bound、
capture-time occurrence issuance proof，使 R2 admission 在 Proxy/schema reentry 后仍只按
stage-2 precondition分类并延迟派生 next cursor。S1-R.1b composition-bound disposal
authority corrective 进一步补上 exact registry 的 claim-once authority 与 exact receiver
admission，使后续 owner commit 能区分同一 authority 的重复 dispose、legacy direct dispose
与 registry-wide dispose；它不建立第二份 publisher state 或 tombstone authority。它们仍不是
live capability。
同日 S1-R.2 entry-gate review 进一步冻结 post-lower target capture、per-target
hard-stop canonical traversal、scope-local vector equality、subject-bound root reservation
与 exact accepted-baseline/proposal provenance；R2 按 corrective contract、Base bounded
canonical seam、UI stable-vector admission 三个独立批次推进，仍不进入 Coordinator 或 live
family。同日 S1-R.2a 已修正 R0 unique semantic code inventory、named ordered checks、
per-target first-event policy 与 exact zero-delta rows；它仍是 dormant package-internal
contract，不是 stable-vector admission capability。
同日 S1-R.2b 已在既有 Base runtime/internal 边界交付 descriptor-safe bounded
canonical projection、detached deep-frozen value、exact bytes 与 first-event hard-stop；
public canonical、Save/Persistence 与 live Surface authority均未改变。
同日 S1-R.2c 已交付 dormant、source-relative UI stable-vector admission authority：finite
definition/slot catalog、same-factory baseline/reservation/proposal provenance、R1a proof-time
occurrence classification、opaque canonical bytes与precondition-bound exact proposal均已闭合，
但尚未提交accepted/runtime state或调用Coordinator。
同日 S1-R.3.0 已把apply-time proposal/lease/baseline/reservation ordered precondition、closed stale
taxonomy与exact zero delta，以及stable-only readiness envelope/precedence固化为R0 pure contract；
它不执行proposal、reservation phase aggregation、Coordinator mutation或readiness settlement。
同日后续 R3 pre-implementation review 采用 A-prime：R3 拆为 R3a composition-owned
composite runtime/identity/provenance seam 与 R3b pure plan + stateful atomic
commit；同日 S1-R.3a 已交付 generic runtime kernel、composition-owned composite
state/authority、shared identity cursor、exact provenance/config admission 与 root contributor
generation seam。Stable records 仍是 dormant authenticated storage/contributor seam，不驱动
live topology；proposal apply、publisher dispose commit 与 stable readiness settlement 尚未实现。
同日 S1-R.3a.1 corrective 将 single-root replacement 的 predecessor 从单一 root 引用补全为
same-composite、authenticated immutable ready-subtree aggregate：current authoritative binding只引用一个
canonical aggregate，其exact root 与ready active/suspended descendant closure不再重复进入accepted runtime
entries；pending/gap 不进入，root-only reservation
projection、second replacement/failure identity reuse 与 retirement fencing 已由测试闭合；它仍未
apply proposal、安装 accepted baseline 或接入 live stable family。
同日 S1-R.3b.0 已在同一个 composition-owned kernel 上交付 dormant dynamic registration 与
read-only admission-context capture：exact current lease 只把 same-authority exact unpublished baseline
安装到唯一 `stableAcceptedBaselines` array，首次注册产生一次 composite state notification、零 transient
notification；capture 返回 exact current baseline 与 current-generation subject reservation snapshot。
该切片不 inspect/apply proposal、不执行 effective publisher dispose、不 settle readiness，也不接 live
stable family。
同日 S1-R.3b.1 已在该 exact kernel/state owner 上交付 dormant atomic stable reconcile：apply依次执行
same-factory proposal、current lease、exact baseline、reservation generation CAS，再验证全局
baseline/runtime coherence，之后才运行detached canonical plan并以一次state notification安装exact next
baseline/runtime；publisher dispose通过S1-R.1b exact receiver把effective lease closure与already-built state
原子提交。该切片仍不settle stable readiness、不发布live stable topology，也不新增public/internal barrel
入口。
同日 R4 entry adjudication 以 S1-R.4.0 独立关闭 direct-child cascade capacity 与 shared topology-policy
边界：一次settlement必须在任何分配或phase安装前计算完整direct-child batch；shared identity不足时整次
返回package-internal `faulted / surface.stable_reconcile_faulted`，parent candidate、child gaps、runtime
high-water、reservation token与notification全部exact zero。R4不得把parent单独置ready后永久保留
`parent_unavailable` child；该裁决本身没有runtime实现或live capability。随后 S1-R.4a 已把现有transient
reducer私有的active/suspended派生抽为唯一pure topology policy并由原transient路径等价复用；S1-R.4b.1
现已在同一composite kernel上交付source-relative stable readiness settlement与whole-composite reflow。
若既有nonterminal transient/stable transition让ready-suspended stable parent恢复active，
同一composite transition也必须完成direct-child batch；capacity不足时回滚整个触发transition。Stable
apply/empty/dispose ingress返回`faulted / surface.stable_reconcile_faulted`，transient post-reducer ingress返回
既有`faulted / surface.transition_faulted` receipt，二者都不能先提交successor。
S1-R.4b.0已进一步交付receipt-driven generic terminal prepare/gate与complete stable terminal
successor：它以exact applied reducer receipt作为唯一分类，在exact registry-wide gate后原子
安装已清空stable权威的state，仍不settle readiness或接入live stable family。
S1-R.4b.1随后闭合ready/failed settlement、shared topology/cascade、canonical bulk allocation与
stable/transient transition integration，但仍保持package-internal dormant，不接live stable family。
Active parent只是在child attempt分配时的eligibility，不是ready child存续期间的持续不变量。只有
topology-participating equal-layer rows在R2 topology、exact retained subtree或existing transient publication
中都没有authoritative relative order时才fail closed；R4不把allocation、slot或lease顺序偷换成z-order。
本文固定
影响输入与焦点的 UI Surface 的权威边界、生命周期、输入代际与验证分层，并把“弱模型
能够写出正确代码”提升为作者 API 的验收条件。S1-T 与 S2 已实现，S3a–S3e
已完成并 promotion System 的 shared composition authority、Host readiness、confirmation
child 与 single-writer cutover；S1-R.1a corrective、S1-R.3.0、S1-R.3a 与 R3a.1 corrective 已完成，
S1-R.1b corrective、S1-R.3b.0、S1-R.3b.1、S1-R.4.0 entry contract 与 S1-R.4a 也已完成，
S1-R.4b.0 terminal disposition、S1-R.4b.1 readiness/cascade settlement与S1-R.5 neutral
harness/churn/dead-path audit均已完成，S1-R aggregate gate已关闭；S4.0又已冻结首个真实
Narrative/History stable family的topology、dismiss/focus/readiness、source projection、双重action fence与
single-writer cutover floor；S4.1a也已交付dormant Narrative family catalog、publisher projection与
candidate preflight。当前active execution pointer的current/next均为S4.1b authenticated physical/automatic
action admission，R3b.1、R4.0、R4a、R4b.0、R4b.1、R5、S4.0与S4.1a只作为completed delivery保留。
Stable implementation仍保持dormant/source-relative；R5只解除S4 entry gate，S4.0也没有把任何stable family
提前写成live capability。
当前 live 能力仍以
[architecture](../architecture.md) 与
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

Externally published stable target 的 source topology 还必须显式表达 exact
parent occurrence：root 的 parent 为 `null`；child 的 parent 必须是同一
publisher lease、同一 owner、同一 publication vector 中已经出现的 occurrence。
Publication 的 `targets` 是 exact、dense、只含 data property 的有序数组；parent
先于 child。Exact stack scope 对 root 是 resolved `slotId`，对 child 是
`parentOccurrenceId + slotId`；同一 scope 中 array 的相对顺序是 V1 唯一的 canonical
stack order，不依赖对象属性迭代、renderer 顺序或 runtime insertion 顺序。同一
occurrence 不得 reparent，也不得与仍保留的 sibling 交换相对顺序；这些变化使用 fresh
occurrence。插入或删除 sibling造成的 dense index平移不等于 reorder，retained
occurrence 可保持 identity。不同 exact scope 的 raw-array interleaving 不进入 semantic
vector identity；raw order 在 admission 中只负责 parent-before-child、同 scope order 与
deterministic first-failure evaluation。

Stable-target 参数等价性固定使用以下 pipeline，而不是 renderer callback 或任意
对象深比较：

```text
definition schema validation/normalization
  -> Strict Canonical Data
  -> canonical bytes comparison
```

一个 target 的 identity comparison 先绑定 exact publisher lease/owner，再同时包含
target occurrence、definition ID、definition contract revision、parent target
occurrence、resolved slot scope 与 normalized parameter bytes；ordered vector comparison
还验证同一 stack scope 中 retained occurrences 的 canonical relative order。
`undefined`、missing、default 与 `null` 是否等价，只由 definition schema
normalization 决定。Canonical hash 可以进入 diagnostics 或作为比较优化，但不能
成为唯一等价依据；最终判断必须能回到 canonical bytes。

Externally published stable target 以 owner/publisher lease 为 revision
authority。每个 owner 的 `sourcePublicationRevision` 是可跳号的 monotonic safe
integer；lease 由 stable owner/application publisher 持有，不能由 React component
local state 管理。它是 stable-target publication 的专用正安全整数域，不得直接
复用整个 `SemanticPublication`、presentation publication、HUD、文本 reveal、音频
或其他 projection 的普通 revision。Fresh lease 从“尚未发布”开始，首次合法
publication 必须是 revision `1`，后续 revision 必须严格增大但允许跳号；只在 owner
明确重新发布 stable vector、请求 fresh retry 或推进 source fence 时变化。Fresh
application epoch/fresh lease 使用新的 capability 与 revision domain。

Revision 按整个 publication vector 原子验证和应用：

- lower revision：stale；
- equal revision + same canonical vector：idempotent unchanged；
- equal revision + different vector：invalid；
- greater revision：接受 reconcile；
- greater revision + same canonical vector：推进已接受的 source revision，但不
  重建 runtime instance；
- invalid publication：不推进已接受 revision，也不部分应用 vector。

一个更新且有效的 source revision 到达时，取消该 owner 较旧 revision 的 pending
preparation；stable-target readiness receipt 还必须绑定对应 publisher lease 与
source revision。
Coordinator-owned transient target 不携带伪造的 source revision、stable parameter
vector 或 reconcile 字段。

这里的 same canonical vector 是同一 occurrence-keyed full-identity set 加上每个 exact
stack scope 的 occurrence sequence，且每项的
lease/owner/occurrence/definition ID/definition contract revision/parent occurrence/
resolved slot scope/normalized parameter bytes 全部相同，stack order 也相同；fresh occurrence
即使参数相同也不是 same vector。两个独立 scope 的 raw-array interleaving 交换仍是 same
vector；child 移到 parent 前仍是 invalid。`greater + same
canonical vector` 对当前 active instance 只推进 accepted source revision，不重建
instance；若该 owner 仍有 older pending preparation，则先取消旧 candidate。目标仍
需 preparation 时，必须分配 fresh instance，旧 receipt 保持 stale。Greater
revision 若 vector validation 失败，不推进 cursor、也不取消既有 pending
preparation；只有 valid/accepted newer revision 触发取消。

Reconcile 不以“任意 source revision 变化”或未规范化参数猜 occurrence：

- 同一 target occurrence ID 且定义/parent/slot-scope/retained-order/参数未变：保持当前 runtime
  instance；
- 同一 occurrence ID 却改变定义、definition contract revision、parent、resolved slot
  scope、与 retained sibling 的 relative order 或 normalized 参数：target publication
  非法；
- target 消失：关闭对应 runtime instance；
- 新 occurrence ID：即使定义/参数相同，也创建新的 runtime instance；
- 同一 application epoch 内复用已经结束的 occurrence ID：结构化拒绝，防止 ABA。

上述 non-reuse 不能靠 Coordinator 永久保留所有历史 ID。Transient occurrence、
instance 与 routing lease 由 application-epoch-scoped monotonic allocator 生成；
stable occurrence 由该 owner/publisher lease allocator（或在 S1-R
冻结的等价 bounded cursor proof）生成，而不是作者任意复用 opaque string。Runtime
只保存 live/pending identity 与
bounded allocator/source cursors，不保存随 open/close 历史增长的 tombstone set。

S1-R.1 将 publisher issuance 固定为 application-epoch-scoped、composition-owned 的
单一 registry。Registry 必须覆盖 frozen resolved-owner domain，并以一次性 claim 的
injected monotonic lease-domain allocator 为 authority；同一个 allocator 不能创建第二个
registry，同一 owner 在 exact registry 中同时最多有一个 current lease。Lease token 是
frozen zero-key capability，current/stale 判断只认 exact object identity 与 package-private
WeakMap，不认 diagnostic string。每个 lease 的 source revision 与 occurrence 都从 `1`
exact-next 签发；legal source gap 通过签发但不交付中间 revision 形成，签发/放弃/invalid
publication 都不回滚 issuance high-water。Stable occurrence diagnostic spelling绑定
`applicationEpoch + leaseSequence + occurrenceSequence`，但字符串本身不替代 lease
capability。

Accepted occurrence high-water 是 R3a composite source state 中的 immutable scalar，
不是 publisher WeakMap 的第二份 mutable state。R1 immutable transition只能在 exact current
lease、已签发上界内单调推进；equal 保持同一 value，lower/unissued/foreign/disposed
fail closed。V1 采用 conservative gap-burn：若先接受 `n3`，不在当前 accepted vector
中保留的 `n1/n2` 此后视为 reused，不能首次引入；`n3` 可 retained，`n4` 可 fresh，
`n>issuanceHighWater` 是 unissued。若真实 consumer 要求乱序预签发后再首次引入较低
occurrence，必须停止并选择另一种 bounded proof，不能增加 unbounded issued/retired set。
Accepted source revision/vector仍只属于 R3a composite reconcile state。R1 registry 的
exact-token dispose 只封闭 dormant issuance ingress并证明 stale/ABA；R0 的
`publisher_disposed` source/runtime result、notification与 target retirement仍由 R3b 在
同一 composite commit 产生。

S1-R.1a 为 R2 stage-2 admission 增加 exact accepted-cursor-bound occurrence proof。Proof 是
frozen zero-key capability，真实 record只存在 package-private WeakMap，并捕获 exact registry、
publisher record、original accepted cursor、accepted high-water与当时的 occurrence issuance
high-water。Proof-bound classification与late cursor derivation只读取这些 captured scalar/identity，
不重新检查 current lease、disposed state或live issuance；capture之后新签发的 occurrence 对旧proof
仍为 unissued。Equal derivation返回 original exact cursor，greater derivation只创建同一R1 provenance
的immutable cursor；它不写accepted authority。现有current-only inspect/classify/advance及dispose
语义保持不变；若callback已dispose/replace lease，R2仍可形成相对captured precondition的proposal，
但R3b必须由lease/baseline/reservation exact CAS阻止它apply。

S1-R.1b 为 composition owner 增加 package-internal、claim-once 的 publisher-lease disposal
authority。Claim 只接受 exact authentic registry；同一 registry 只能成功领取一次，registry 已
dispose、foreign/clone/Proxy receiver 或第二次 claim 均在任何 publisher mutation 前 fail closed。
Authority object frozen，其 `inspectPublisherLeaseDisposal` 与
`disposeCurrentPublisherLease` 方法只接受该 exact authority object 作为 receiver；detached callable、
wrong receiver 或伪造 shape 不取得 disposal authority。真实 authority/registry/publisher 关联及首次
disposer provenance 只保存在 package-private WeakMap/record，authority 自身不拥有第二份 publisher
state，也不建立随历史增长的 tombstone set。

Pure inspection 的 closed classification 固定为
`current | already_disposed | diverged | stale`；commit classification 固定为
`disposed | already_disposed | diverged | stale`。只有该 authority 的 exact current lease 可从
`current` 进入 `disposed`；由同一 exact authority 首次关闭的 lease 在重复调用时返回
`already_disposed`。既有 raw registry exact-lease dispose 或 registry-wide dispose 保留原有
package-internal shape/语义，但其首次 disposer provenance 为 legacy/global，authority 随后必须返回
`diverged`，不能把它冒充 composition owner 的成功或幂等重复。Foreign lease在exact authority下返回
`stale`；foreign/forged registry claim与wrong/cloned/Proxy/extracted authority receiver则以
`ui.managed_surface_stable_disposal_authority_invalid` fail closed。不允许领取第二个 authority 来重新解释上述 provenance。该 corrective 不扩公开 API、
不改变 R1 issuance/cursor 语义，也不自行退休 composite source/runtime state。

Stable publication 在任何 identity allocation 或 Coordinator mutation 前完成 bounded
exact admission。R2 evaluator 每次只消费三份 per-evaluation value input：untrusted raw
publication、由同一 R2 factory 创建并以 private provenance 证明的 exact accepted
baseline，以及同一 factory/application domain 创建的 subject-bound root-reservation
snapshot；evaluator 还闭包 factory-captured immutable definition/slot catalogs 与 exact R1
registry authority。Accepted baseline 精确区分
unpublished 与 accepted empty：unpublished variant保存 exact publisher lease与同一 R1 registry
创建的 zero accepted-occurrence cursor；accepted variant保存 exact publisher lease、owner-derived
source domain、accepted source revision、admitted targets与同一registry签发的 immutable accepted-
occurrence cursor。R2不保存哪个baseline当前；R3a composite state只保存exact object，并由R3b在
任何source/runtime mutation前对proposal捕获的lease、baseline与reservation precondition做exact
CAS。Foreign/cloned/wrong-lease baseline或reservation到达其对应check时是package invariant fault，
zero delta。

Admission check precedence 固定为：

1. outer publication 只 descriptor-capture exact own data fields
   `{ publisherLease, sourceRevision, targets }`；prototype 只能是 `Object.prototype` 或
   `null`，ordinary shape failure 为 `surface.stable_publication_envelope_invalid`，package-
   owned reflection throw 为 `surface.stable_admission_faulted`；此时只捕获 `targets` value，
   不对它调用 array/prototype/length/own-key operation；
2. exact current publisher lease、positive-safe且不超过该 lease issuance high-water 的 source
   revision，以及 exact baseline provenance；fresh unpublished baseline 的首次 revision 必须为
   `1`；随后从baseline的exact accepted cursor捕获R1 occurrence admission proof，后续不再读取
   live occurrence issuance/currentness；
3. lower revision 立即 stale，且对 `targets`、definition/schema/canonical/reservation 保持
   zero touch；
4. equal/greater 才检查 target vector header。它必须是真 Array、exact
   `Array.prototype` 与 ordinary own length descriptor；ordinary malformed vector 使用新增
   `surface.stable_target_shape_invalid`，reflection throw 为 admission fault；
5. 先比较 package-owned `64` target bound。Ordinary length `65` 在任何 ownKeys、item
   descriptor 或 schema call 前返回 `surface.stable_target_limit_exceeded`；
6. bounded capture exact dense vector 与 exact四字段 data-only target record。Sparse、
   accessor、symbol、extra/missing field、custom prototype 使用
   `surface.stable_target_shape_invalid`；
7. full-vector identity graph：duplicate、基于stage-2 R1 proof的unissued/gap-burn、definition/owner、root-null、
   parent exists/before-child、slot/cardinality、structural reuse 与 scope-local order。先计算
   definition/revision/parent/scope 均未变化的 `structurallyStableRetained` set；retained
   subsequence order只比较该 set。独立 stable siblings reorder先报
   `surface.stable_order_invalid`；纯 structural drift随后报
   `surface.stable_occurrence_reused`；
8. 按 raw target order逐项执行 definition schema、bounded canonical projection、retained
   normalized-byte comparison；每项完成这三步后才进入下一项，first failure停止其余工作。
   Schema throw 为 `surface.stable_schema_invalid`；same occurrence 的 normalized bytes drift
   复用 `surface.stable_occurrence_reused`；
9. subject-bound root reservation conflict；
10. equal revision semantic-vector comparison，或产生 initial/greater-same/greater-changed
    admitted proposal。

Master result-code inventory 保持每个 code 唯一；ordered admission evidence 使用 named
`{ stage, check, code }` rows，因此 `surface.stable_target_shape_invalid` 与
`surface.stable_occurrence_reused` 可在多个 check 位置出现而不复制 semantic code。
Raw-model 中不可达的 `surface.stable_owner_scope_invalid` 删除，只保留 exact
`surface.stable_owner_conflict`。

S1-R.0 将 exact internal bounds 固定为每份 publication 最多 `64` targets；每个
normalized parameter snapshot 最多 `65,536` canonical bytes、depth `32`、nodes `4,096`。
Canonical admission 采用 deterministic first-traversal-event hard stop，而不是在超限后继续
look-ahead 寻找另一类 canonical error。进入 value 前依次检查 depth、node，随后验证当前
canonical kind/container representation。String先尝试写 opening quote，再从左到右逐 code
point扫描：当前位置先验证 surrogate legality，再尝试写该 code point 的 escaped bytes；一旦
byte cap触发就不扫描后续 code unit，最后尝试写 closing quote。Object先完成 prototype/
own-key snapshot、key validation与canonical sort，再按 opening brace、每项
`comma -> canonical key bytes -> colon -> child depth -> child node -> child descriptor -> child`
推进；Array相应按 opening bracket、每项
`comma -> child depth -> child node -> child descriptor -> child`推进。所有closing punctuation也
按相同byte sink计数。Depth `32`、nodes `4,096`与bytes `65,536`均可接受，进入
`33`/`4,097`/`65,537`分别返回对应limit code；flat code-array order不冒充全局precedence。

Hard bound约束 R2 发起的 child descriptor/value reads、projected nodes 与 emitted byte
storage；它不是对 Story schema、一次 `Reflect.ownKeys` snapshot、key sorting或 Proxy trap
的 sandbox/绝对 CPU-memory证明。Schema只保证 `parameters`字段本身是 captured data
property；nested raw value由 schema决定是否读取，schema throw（含其读取 getter/Proxy 的
throw）归 `schema_invalid`。Schema parse callable与 exact receiver在 stable sidecar catalog
construction时一次性 descriptor-capture，但不要求通用 `RuntimeSchemaV1` object frozen；
schema purity/determinism仍是 author obligation，其主动 side effect 不属于 R2 delta。

R2 canonical safe-set采用 fully-represented descriptor-safe projection；public
`canonicalJsonBytes(detachedProjection)` 只作为该 safe-set 上的 byte oracle，不要求对任意
accepted raw/Proxy value再次执行public encoder得到相同结果，也不把两者当作相同 acceptance set。Base
通过既有 `@sillymaker/base/runtime/internal` 提供共享 canonical implementation 的 bounded
typed seam：accepted bytes必须 exact-equal public bytes，不增加 dangerous-key 等新policy，
也不改变 public canonical/Save/Persistence行为。Known canonical/limit branches在 package-
owned validation site直接返回 typed outcome；任一 reflection trap 抛出的 value（即使伪装成
public `CanonicalJsonError`）原样逃逸并由 R2 fault，不得用 wide `instanceof` catch重分类。

Canonical bytes只通过 opaque immutable snapshot进入 admitted identity，R2 必须以 private
defensive copy + exact comparator实现，不能暴露 mutable `Uint8Array`。Parent-before-child已经
证明 acyclic，cycle-shaped parent输入归入更早的 parent-order rejection，不另留不可达 cycle
code。

R2 的 `admitted` 只是绑定 exact immutable precondition 的 proposal，不是 current-at-return 或
`applied` receipt。Proposal逻辑形态为
`{ relation, captured: { lease, acceptedBaseline, reservationSnapshot }, nextAcceptedBaseline }`；
`nextAcceptedBaseline`由同一factory创建并private-brand，保存validated revision、admitted targets与
仅在全部checks成功后从stage-2 proof unchanged/late-derived的同一R1 registry immutable cursor。R3b在CAS成功后只能把这个exact
`nextAcceptedBaseline`存入composite state，不得重算或clone。Equal-same与任一non-admitted
结果都没有proposal，也不得创建/暴露next cursor；next baseline只在全部checks成功后构造。
Proposal/result与accepted-baseline provenance属于新的R2 module，不能回填已被R1 import的R0
module形成反向依赖。R2自身不写accepted state、R1 issuance、Coordinator或notification；schema/
Proxy callback自行执行的外部side effect不由R2回滚。R3b必须在应用任何proposal前exact
revalidate current lease + accepted baseline + reservation snapshot的opaque composite precondition
token，失败则不产生source/runtime mutation。

S1-R.3.0 进一步冻结 apply-time CAS 的 closed result与ordered precedence：先验证same-factory
exact proposal provenance（失败为`faulted / surface.stable_admission_faulted`），再验证current
publisher lease（mismatch复用`surface.stable_publisher_lease_stale`），随后依次验证exact accepted
baseline与reservation generation（任一mismatch使用package-internal
`surface.stable_reconcile_precondition_stale`）。Earlier failure不得读取later precondition；全部failure/
stale都是exact zero source/runtime/topology delta、`0` notification与`0` allocation，不得自动重新执行
R2 evaluator、schema、canonical projection或重建reservation。只有同一exact proposal通过三项CAS，
R3b才可把proposal携带的exact `nextAcceptedBaseline`与runtime delta作为一个composite commit安装。

#### S1-R.3 A-prime generic kernel and atomic commit

R3 不建立与现有 Coordinator 并列的 stable runtime axis。它按entry audit拆为四个独立可合并切片：

- **R3a composition-owned composite runtime/identity/provenance seam**：从现有 transient reducer
  抽取唯一 package-internal generic runtime kernel；现有 transient Coordinator 通过保持
  exact existing transient-facing shape 与 behavior 的 adapter 消费该 kernel。Composite state 同时拥有
  exact accepted stable baseline、generic runtime topology、application-epoch identity cursor、
  root-reservation contributor vector与generation token。R3a 还给同一个 R2 authority 增加
  exact admitted-target definition inspector，并补齐本节新增的 R0 code/delta/type floor；它不
  apply proposal、不关闭publisher ingress、不新增stable notification，也不settle readiness；
  transient adapter仍保持既有notification行为；
- **R3a.1 retained ready-subtree corrective**：在同一composite state内认证single-root replacement
  的exact ready root/descendant closure，并让current authoritative binding canonicalize到一个aggregate；
  不新增runtime owner或执行proposal；
- **R3b.0 exact unpublished registration + admission context（已完成）**：publication ingress前动态注册exact
  current lease及同一R2 authority产生的exact unpublished baseline，并只读捕获exact
  baseline/reservation context；不采用absence sentinel或apply proposal；
- **R3b.1 pure plan + stateful atomic commit（已完成）**：消费 R3a state，执行 R3.0 ordered CAS、pure
  runtime plan、exact next-baseline install、empty/dispose 与一次性 composite notification。
  R3b.0/R3b.1 不新增另一份 writable target/store，也不把 stable source 字段加入 transient/public
  target、publication、handle、evidence或receipt。

Composition-owned authority持有exact one current composite state reference、one mutation/reentry
control、one notification owner与one runtime identity cursor。Transient facade和R3b stable apply/dispose
都只通过该authority transition；不得各自缓存、安装或独立notify runtime state。Notification owner可按
projection维护现有transient listener set与未来composite listener set，但只从同一committed state
finalize：unchanged transient-facing snapshot不得因stable-only commit收到duplicate notification。
每个实际通知仍保持既有Coordinator语义：state先完整安装，再对当次captured listener vector同步逐一
通知；listener reentry先看到successor，可以同步完成一个独立nested transition/notification，listener
throw只进best-effort diagnostics。

Generic kernel 的 target binding 在 source-relative internal 层区分 transient 与 stable；existing
transient-facing projection仍保持当前 transient shape。Stable binding引用exact R2 admitted target，不生成或
伪装 transient occurrence。一个 application epoch只有一个 monotonic runtime identity cursor：
transient open 从一次 sequence派生 transient occurrence、instance与routing lease；stable
preparation 从同一 cursor派生instance与routing lease，但 occurrence始终是publisher lease签发的
stable occurrence。禁止为 stable axis另建会与 transient 冲突的 allocator，也禁止用synthetic
transient occurrence把两种authority拼在一起。R3a extraction若不能让现有 transient reducer/
Coordinator在同一kernel上保持原语义，必须停止而不是保留两个可写runtime state。

R3运行时不得独立重建definition catalog。R2 authority提供package-internal、same-factory
`inspectAdmittedTargetDefinition(target)` seam：只对该factory产生或retained的exact admitted-target
object返回其在sidecar construction时已经捕获并冻结的exact resolved definition；foreign、clone、
newly-constructed hybrid或wrong-factory target返回`null`。Authentic target被拼进伪proposal时仍可
inspect，但proposal本身必须先由R2 proposal provenance拒绝。Inspector不重跑schema/canonical，不按
definition ID/revision从第二份catalog猜definition。R3a generic kernel只接受该seam返回的definition，
因此placement/readiness/modality/input/focus/renderer identity与R2 validation authority不能漂移。
R3a composition factory还必须以object identity接收exact同一R2 admission authority与其绑定的R1
publisher registry，并在读取registry、签发token或建立state前校验一份order-independent、exact
resolved slot descriptor config（kind、slot ID、child-only parent definition ID与cardinality）。
Foreign/mismatched authority、registry或slot config fail closed；该配对只保存在package-private
provenance中，不公开registry、catalog或第二条construction path。

每个 accepted desired target 的runtime binding 精确为：

```text
ready_instance {
  exact ready instance
}

preparing {
  exact candidate attempt,
  transition: initial_open | primary_replacement | child_open,
  retainedSubtree: exact ready-subtree aggregate | null
}

gap {
  reason: readiness_failed | parent_unavailable,
  retainedSubtree: exact ready-subtree aggregate | null
}
```

Candidate attempt绑定exact publisher lease、accepted source revision、admitted target、parent
instance、fresh instance ID与fresh routing lease。Ready active/suspended phase由generic topology
kernel派生；`suspended`仍是ready runtime，不等于gap，但只有ready + active parent具备child
preparation eligibility。Retained subtree 是同一 composite state 内经过 provenance 认证的 immutable
ready closure：保存 exact predecessor root 与按 exact current runtime topology preorder 冻结的 ready
active/suspended descendants。它保留每个 instance 的原 attempt/target/parent identity，不进入 accepted
desired vector，也不被改写成 replacement occurrence；old pending candidate与gap不是runtime node，不能
进入 aggregate。被 aggregate 收纳的 descendants 不得同时继续出现在 accepted
`stableRuntimeBindings`。Cursor-only lineage可以产生authenticated value-equivalent aggregate，但current
authoritative binding必须canonicalize到一个exact aggregate；它不是第二份writable state/kernel authority。

Attempt role是单向的：已经绑定为ready或retained subtree member的attempt不得降级并复用为
`preparing`；只有fresh pending attempt或exact current preparing attempt可以成为candidate。Ready
attempt保存的source revision可以早于或等于current accepted desired revision，但不得高于它；
preparing attempt必须绑定exact current accepted revision。任何non-null preparing predecessor或
`readiness_failed` gap retained subtree都必须从 exact current ready single-root closure 捕获；root属于
同一 lease/single slot、具有不同 occurrence 且 parent 为`null`，所有 descendant 的 exact parent chain
必须闭合回root。Candidate-as-member、partial/reordered/duplicate/extra closure、stale/foreign/clone、
wrong lease/slot或future revision都是package-owned invariant fault。

Closed combination还要求：只有exact `single` root `primary_replacement` preparing或它失败后的
`readiness_failed` gap可以携带non-null retained subtree；`initial_open`、`child_open`与
`parent_unavailable` gap的retained subtree必须为`null`。任何其他cross-product是package-owned runtime
invariant fault，不得被投影成ordinary gap。

Runtime diff与predecessor pairing固定如下：

- same occurrence已有ready instance时保持exact instance；若它只有older-source pending candidate，
  newer accepted revision原子取消旧candidate并按本次relation决定fresh attempt；
- exact `single` root scope中，唯一 retiring ready root与唯一fresh desired root配成
  `primary_replacement`，保留前者及其subtree直到R4 ready cutover；若原scope只有initial pending，
  newer candidate执行continuous-fallback initial supersede，不把pending当predecessor；
- root `stack`不按dense index或raw-array position配predecessor：removed occurrence退休，fresh
  occurrence使用`initial_open`；
- child不继承removed child作为predecessor：removed child退休，fresh child使用`child_open`；
- parent已有ready + active instance时child才可开始`child_open`。Parent preparing、suspended或gap时child保存
  `parent_unavailable` gap、零allocation且不发布fallback；R4在parent首次ready + active或从ready-suspended
  转为active的同一transition中，只为刚解除阻塞的direct children开始preparation。Parent-eligible `readiness_failed` gap不自动retry，
  只由newer `greater_same`或`greater_changed`显式重试；`parent_unavailable`只能等待exact
  parent-ready transition，source revision变化本身不得为它分配identity。V1不要求whole-vector
  simultaneous activation。若child已经保存exact current `readiness_failed` gap，parent从active转为
  suspended时保留该exact binding、reason与predecessor，仅暂停retry eligibility；suspended parent下的
  fresh child不得伪造`readiness_failed`，只能得到`parent_unavailable` gap。

Runtime planning与identity allocation不能受非语义cross-scope raw interleaving影响。Canonical
planning order固定为：root scope按`slotId` lexical order；scope内使用R2 admitted sibling order；
随后对每个parent按child `slotId` lexical order递归，同一child scope仍使用admitted sibling order。
该顺序只决定pure plan与fresh identity allocation；最终z-order/input/focus仍由definition layer与
generic topology policy派生，不能把allocation order变成新的stack authority。

Composite state保存一个全局、exact reservation contributor vector。Contributor只包含root：

- stable accepted desired root，即使runtime是gap；
- stable preparing candidate、ready active/suspended instance与retained subtree root；ready descendants
  属于child-only runtime，不产生reservation row；
- transient preparing candidate与active/suspended root instance。

Contributor绑定authority kind、exact stable lease/occurrence或transient instance、root `slotId`与
runtime role/phase。Vector不是Map insertion order：先按root `slotId` lexical排序；同slot依次为stable
desired、stable runtime、transient runtime；stable rows再按authentic lease sequence、occurrence
sequence、fixed role/phase与runtime sequence排序，transient rows按runtime sequence与fixed phase排序。
相同canonical rows保持exact vector语义，不因重建object/array换token。任一 contributor identity、role或phase变化都安装fresh composite-global
generation token；即使deduplicated slot set随后ABA回到旧值也不得复用旧token。Stable
source-cursor-only commit、non-root mutation或不改变contributor vector的无关topology change保留exact
token。为subject构造snapshot时只按object identity排除该exact stable lease的desired/runtime
contributors；同owner transient contributor仍保留。之后只把剩余contributors投影为finite
root-slot catalog内lexically sorted、unique slot set。不同subject snapshot可共享同一个current
composite generation token；token不是subject-local counter。

R3b先建立完全pure、detached且frozen的next plan/state，再进入stateful commit。普通proposal apply按
same-factory exact proposal provenance、exact current lease、exact accepted baseline、exact reservation
generation的顺序执行R3.0四项CAS；通过后必须在读取definition或分配identity前验证**全部owner**的
baseline/runtime coherence：每个registered baseline仍绑定exact current registry lease；unpublished
baseline没有direct runtime entry；accepted baseline的exact admitted targets与
`stableRuntimeBindings`形成一一对应，entry保存该lease的current sequence、baseline current source
revision与exact admitted target。Retained-subtree members只存在于authenticated aggregate，不重复计入
direct entries。任一owner出现orphan/missing/extra/wrong-exact-target runtime都是closed
`surface.stable_reconcile_faulted`，不得只修复subject owner或继续plan。只有ordered CAS、global
coherence与pure canonical plan全部成功后才一次替换current state，之后发出exact one no-throw
composite notification。

Pure planning按root slot lexical topology preorder与R2 scope-local sibling order分配fresh attempts；
single-root replacement只保留exact authenticated ready subtree，initial pending candidate不能成为
predecessor，second replacement及replacement-failure retry继续复用同一aggregate。Sequence capacity在
commit前完整验证；即使late exhaustion发生在多个canonical roots中间，也保持old state、identity
high-water、reservation token与notification exact zero，已构造但未暴露的detached对象不得成为第二份
authority。

Publisher dispose的stateful顺序固定为：先在current lease仍有效时完整构造pure
retirement plan并重算root contributor vector；只有vector exact变化才预装fresh generation token，
unpublished、accepted-empty或child-only lease dispose保留exact token。Composition owner在构造期只
领取一次S1-R.1b authority，并预先捕获其exact frozen receiver与exact dispose callable；commit gate只以
该receiver调用该callable关闭exact lease ingress。只有 `disposed` 才允许立即安装already-built state；
`already_disposed` 仅在composite已不存在该lease record的真正重复调用中返回unchanged，若composite仍
持有record则是closed reconcile fault；`diverged`或`stale`均不安装plan。最后才通知。Raw registry
exact-lease dispose或registry-wide dispose不能冒充owner commit。关闭ingress之后不得再执行可能throw的definition lookup、
allocation、freeze、subscriber或user callback；subscriber failure只进入既有best-effort diagnostics。
因此外部同步调用不能观察“ingress已关但source/runtime未退休”的中间状态。Pure plan失败不关闭
ingress；任何非`disposed` commit classification都不安装next state；legitimate repeat返回unchanged且
不保留unbounded tombstone。

Greater-empty与effective dispose共用closed runtime-disposition分类，不能以placement或“存在desired
root”猜observable topology：任一ready/preparing binding或任一non-null retained subtree为
`observable`，返回`retire_owned_targets / topology changed`；null `parent_unavailable` gap是仍需移除的
`nonobservable` pending runtime，返回`retire_owned_targets / topology unchanged`；null
`readiness_failed` gap没有runtime，返回`runtime/topology unchanged`。混合vector按
`observable > nonobservable > none`归约。Root desired/contributor被移除仍可要求fresh reservation token，
但token变化不得伪造成runtime或topology delta。R1b legitimate repeat还要求全局baseline/runtime
coherence且该lease已无baseline/direct runtime；package-internal orphan runtime、direct/raw dispose遗留
record或registry-wide divergence都必须fault且zero delta，不能返回already-disposed unchanged。Healthy
inventory下foreign/clone/revoked/unknown lease仍按publisher-lease stale处理且不得读取其属性。

R3a 在 R0 master inventory新增package-internal
`surface.stable_reconcile_faulted`与独立zero-delta case `reconcile_fault`。它表示R3 composite
planning、shared identity exhaustion或package-owned runtime invariant无法形成完整next state，
也覆盖disposal authority返回`diverged`，或返回`already_disposed`但composite仍持有该lease record的
dispose divergence；结果为`faulted`且保持
exact original state、zero source/runtime/topology、`0` notification/allocation。它不能复用
`surface.stable_admission_faulted`，也不能捕获Story/renderer callback error。任何planning fault都必须
发生在state install、effective R1 dispose或notification之前；已存在的dispose divergence只报告
closed fault并保持composite state，不把`already_disposed`冒充effective success。

任一阶段失败都不推进 accepted revision/vector、不取消现有 pending、不分配 runtime
instance/routing identity，也不改变 Coordinator publication/topology/input/focus 或产生
notification。Publisher lease 已签发的 occurrence capability/high-water 不因 rejected
publication 回滚、复用或重新签发；issuance cursor 与 accepted occurrence/vector 是两个
bounded state。一个 lease 的 vector 不得 parent、reparent、replace、close
或隐式 evict 另一个 owner 的 target；cross-owner parent 或 occupied-slot conflict
结构化拒绝整份 publication。V1 不提供“最后一个 publisher 获胜”的协调协议。

Root reservation snapshot 以 exact subject publisher lease + R2 factory/composite-state
precondition private-brand，并携带opaque composite-generation token。R2c只封装、验证并消费已经
归一化的resolved root-slot catalog内sorted unique reserved-slot set；它不枚举runtime phase，也不
读取Coordinator。R3a只在canonical exact root contributor vector变化时安装fresh token，即使
normalized reserved-slot set随后ABA回到同值也不能复用旧token；source-cursor-only、child-only或
root vector不变的无关变化保留exact token。R3a还必须先按object identity排除subject lease，再把
其他stable accepted desired root（含runtime gap）、stable preparing/ready-active/ready-suspended/
retained root以及transient preparing/active/suspended root聚合为该set。它的大小受finite root slot catalog
限制，不保留callback、Coordinator引用或逐instance历史。Foreign authority 在
同一 root `slotId` 上无论 `single` 或 `stack` 都返回
`surface.stable_owner_conflict`；V1没有 cross-publisher stack order。不同 root slot可共存，
同 owner transient authority仍不是 exact stable lease，不能被过滤。Reservation provenance、subject
与generation token只在owner-conflict check首次读取；lower revision保持reservation zero touch。

Accepted source state 与 runtime presentation state 是同一个 package-internal composite
reconcile state 的两个只读维度，不是第二份 writable target。Renderer readiness
failure 不回滚已经接受的 desired vector/revision：

- initial/child failure 退休 candidate 并撤销 fallback；accepted desired target 保持，
  runtime 暂时没有对应 active instance，不自动重试；
- replacement failure 保留 predecessor 作为 availability fallback，但 accepted desired
  target 已是 replacement；retained predecessor 不冒充 accepted vector；
- equal revision + same vector 永远 unchanged，不因 failed gap 自动重试；
- greater revision + same vector 是 owner 的显式 retry/fence：已正确ready的 sibling
  （包括ready但lifecycle-suspended）保持 exact instance，只为 older pending 或parent-eligible
  `readiness_failed` gap分配fresh candidate；
  `parent_unavailable`保持zero-allocation gap直到exact parent-eligibility transition；若vector只有此类
  non-retryable gap，仍接受source revision但runtime/topology/allocation unchanged；
- greater revision + different vector 从仍可用的 retained predecessor（若存在）准备新的
  desired target；没有 predecessor 时按 initial/child readiness policy 准备，旧 desired
  receipt 保持 stale。

Composite reconcile 的 source/runtime delta 固定为：

| Input                                   | Accepted source state             | Runtime/Coordinator state                                           |
| --------------------------------------- | --------------------------------- | ------------------------------------------------------------------- |
| lower revision                          | unchanged                         | unchanged                                                           |
| equal + same                            | unchanged                         | unchanged                                                           |
| equal + different                       | invalid, unchanged                | unchanged                                                           |
| greater + invalid vector                | unchanged                         | unchanged                                                           |
| initial + non-empty                     | install accepted vector           | one readiness-policy-derived prepare composite commit               |
| greater + same, all desired ready       | advance source cursor             | no allocation/rebuild/topology delta                                |
| greater + same, parent unavailable only | advance source cursor             | no allocation/rebuild/topology delta                                |
| greater + same, pending/failed gap      | accept revision                   | retry older pending or parent-eligible readiness-failed gap only    |
| greater + changed vector                | atomically replace desired vector | one readiness-policy-derived retain/retire/prepare composite commit |
| greater + empty, runtime targets        | accept revision and `targets: []` | atomically cancel/retire this lease's owned targets                 |
| greater + empty, runtime gap            | accept revision and `targets: []` | unchanged                                                           |
| publisher lease dispose                 | remove lease source state         | atomically retire this lease's pending/active/retained targets      |

`initial + non-empty`是独立R0 delta case `initial_nonempty`，不能借用名称为
`greater_changed`的row；其exact delta为`source: replace_vector`、
`runtime: retain_retire_prepare`、`notificationCount: 1`、
`topology: readiness_policy_derived`与`runtimeAllocation: preparation_count`。实际fresh
preparation数量由next runtime state证明；parent-unavailable child仍是zero-allocation gap，不得为了匹配
symbolic row预分配instance。

既有R0 case spelling `greater_same_all_active`保持不变；这里的`all_active`是“全部desired都已有
ready runtime、没有pending/gap”的symbolic名称，包含lifecycle phase为`suspended`的ready instance，
不允许因此重建attempt。
R3a另加`greater_same_parent_unavailable` zero-runtime delta case：source cursor推进、composite
notification为`1`，runtime/topology/allocation均`0`；它只在没有older pending或
`readiness_failed`等retryable gap时使用。

R3b.0 采用dynamic closed registration，不采用absence sentinel。每个exact current R1 publisher lease
必须在publication ingress前由composition owner注册；同一个R2 admission authority为该lease恰创建一次
exact unpublished baseline，并把该exact object安装到composite唯一 authoritative
`stableAcceptedBaselines` array。Missing record永远不等于unpublished current，caller-created
authentic-looking seed也不能被lazy adopt。首次registration只改变baseline维度并产生exact一次composite
state notification；transient projection/notification、runtime topology、identity high-water、root contributor
vector与reservation token全部保持。Exact repeat返回同一个exact current baseline且zero mutation；fresh
same-epoch successor lease只可在R3b.1 effective dispose已从registry与composite同时移除old record后注册。

Registration使用独立frozen package-internal union，不能冒充R0 reconcile result或在内部apply proposal：

- `registered { acceptedBaseline }`：只携带本次same-authority exact unpublished baseline；
- `unchanged { acceptedBaseline }`：携带composite中exact current baseline，允许其为`unpublished`或
  `accepted`；
- `stale { code: "surface.stable_publisher_lease_stale" }`；
- `faulted { code: "surface.stable_reconcile_faulted" }`。

Read-only `captureAdmissionContextInternalV1(lease)`同样返回frozen closed union：
`captured { acceptedBaseline, reservationSnapshot } | stale | faulted`。`captured`只暴露registered lease的
exact current baseline与由current contributor generation构造的same-authority subject snapshot，不换token、
不通知、不分配runtime identity，也不改变composite/source/runtime state；每次capture仍创建并认证一个fresh
reservation snapshot。Composition lifecycle gate先于该closed union：`coordinatorDisposed`直接抛既有
`ui.managed_surface_coordinator_disposed`且不触碰registry/baseline/candidate。只有lifecycle gate通过后，
bound registry整体disposed或application epoch diverged先全局`faulted`；registration/capture随后验证全部
registered baseline仍对应exact current registry lease；
任一registered record与registry发生lifetime divergence时，在检查candidate前全局返回`faulted`。无record的
unknown/foreign/noncurrent candidate只在registry lifetime current且没有registered divergence时返回`stale`；
exact current但尚未registered的capture返回`faulted`。
Direct external dispose遗留composite record会封闭该composition lifetime：old、foreign、clone与fresh
successor的registration/capture均先返回`faulted`，不能绕过R3b.1的atomic effective-dispose path。

Accepted empty vector remains distinguishable from “lease has never published”, so equal-empty
is idempotent and lower revisions stay stale。Lease dispose first closes publisher ingress, is
idempotent on repeat, makes all old publication/readiness evidence stale, and clears that lease's
accepted cursor/vector。它不得改写另一owner的accepted source/occurrence、direct-retire、reparent或替换其
runtime identity；shared topology policy引出的phase变化与刚解除阻塞child preparation属于同一原子
composition consequence，不算subject对另一owner source的越权写入。Stale、equal-same、equal-different、
greater-invalid 与 repeated dispose 产生 `0` composite notification；任何 accepted source
change（包括 cursor-only、greater-empty）以及首次 effective dispose 精确产生 `1`
composite reconcile notification，且不得再泄漏 transient family duplicate notification
或 per-target intermediate publication。Fresh runtime instance/routing allocations equal the
preparations actually started。Topology revision按既有 observable fence（active topology、
blocking fallback、action/input/focus/navigation ownership）推进；source-cursor-only commit
是 `0` transient Coordinator topology delta。

S1-R.3a delivery已完成：现有transient reducer/Coordinator已通过同一generic kernel保持既有
public shape、identity、同步nested-listener与notification语义；composition-owned authority已拥有
single state/listener/cursor、prepared exact-current install fence与bounded lineage finalization，stable
record/provenance、root contributor vector与generation token也已接入同一dormant state。Exact
authority-registry-slot config、attempt/predecessor/revision invariant与suspended child failure-gap
preservation均由mutation-sensitive tests覆盖。Stable records仍只作为authenticated dormant
storage/contributor seam，不发布live stable topology、input/focus、renderer或readiness mutation；R3a
没有apply proposal、关闭publisher ingress或settle readiness。验证：focused 5/67, UI 74/832, full
248/3760, check green, engine browser 101/101, examples 45 pass/2 skip, prebuilt
`38 / 38`。该checkpoint当时指向S1-R.3b；后续entry audit先插入R3a.1 corrective。

S1-R.3a.1 corrective 已完成：source-relative composite seam新增 frozen、same-origin
`ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 { root, descendants }` 与 exact-current capture
factory。首次 replacement 从 current ready root 捕获完整 ready closure；shared-cursor allocation、second
replacement、replacement failure与semantic no-op继续复用同一aggregate identity。Clone/partial/reordered/
duplicate/cross-lease closure、ready descendants同时留在accepted runtime entries，以及cutover后重新接入
retired aggregate均fail closed；root reservation只投影aggregate root，descendants不形成row或第二份
topology authority。该corrective不读取proposal、不写baseline、不调用R1 dispose/readiness或live
Coordinator。验证通过focused `2 / 31`、UI package `74 / 838`、全量`248 / 3766`与完整
`deno task check`。该checkpoint当时指向 S1-R.3b.0；现由下述R3b.0 delivery取代。

S1-R.3b.0 已完成：source-relative specialized composite kernel在原有exact state/reentry/listener owner上增加
dynamic registration与read-only context capture，没有建立第二kernel或baseline map。Baseline array按authentic
lease sequence canonical化；首次注册exact `1 state / 0 transient` notification，repeat/stale/fault/capture均
保持zero composite/source/runtime mutation与zero runtime identity allocation（capture只创建并认证fresh
reservation snapshot）。Caller seed、foreign/clone/Proxy、global registry divergence、Coordinator terminal
gate与direct publisher-dispose fence均由
mutation-sensitive tests覆盖；capture产生的same-authority snapshot可直接供R2 evaluate，但本批不读取或apply
proposal、不执行publisher dispose、不settle readiness或接live stable family。验证通过focused
`2 files / 43 tests`、UI package `74 / 850`、全量`248 / 3778`与完整`deno task check`。该checkpoint
当时指向S1-R.3b.1；现由下述R3b.1 delivery取代。

S1-R.1b composition-bound disposal authority corrective 已完成：exact authentic registry只能
claim一次frozen authority，authority方法执行exact receiver admission；private weak provenance把
`current | already_disposed | diverged | stale` inspection与
`disposed | already_disposed | diverged | stale` commit分类闭合。Same-authority repeat保持幂等，raw
exact-lease dispose与registry-wide dispose形成divergence，foreign/clone/Proxy与second claim均fail closed；
既有registry API、publisher issuance/cursor与public surface不变，也没有建立第二份publisher/tombstone
authority。验证：focused `2 files / 29 tests`、UI package `74 / 857`、全量 `248 / 3785`、完整check
green。该corrective随后由下述R3b.1 owner commit消费。

S1-R.3b.1 已完成：source-relative specialized kernel新增package-internal proposal apply与publisher dispose
ingress，仍与transient facade共享exact one state、identity cursor、reentry control与notification owner。
Apply按proposal provenance → current lease → exact baseline → reservation generation执行ordered CAS，随后
检查全部owner的baseline/direct-runtime exact bijection，再以catalog topology preorder构造detached pure
plan并一次安装R2 exact next baseline与stable runtime。Initial/greater-same/greater-changed/empty、blocked
child、single-root retained subtree、initial pending supersede、second replacement/failure aggregate reuse与
shared-sequence late exhaustion均保持closed delta和zero-mutation fault语义；stable-only commit精确
`1 state / 0 transient` notification。

Effective dispose先pure-retire owned direct runtime/retained aggregate，再通过构造期claim的S1-R.1b exact
receiver关闭exact current lease，只有`disposed` gate成功才安装already-built state。Listener首先观察lease
stale与source/runtime同时退休，可按既有同步reentry语义repeat并注册successor；listener failure只进
diagnostics。True repeat unchanged，direct/registry divergence、registered mismatch及任一owner orphan runtime
均reconcile-fault zero。Greater-empty/dispose还按observable、nonobservable parent-unavailable、no-runtime
readiness-failed三态给出exact runtime/topology delta，同时独立维护root contributor token identity。

该delivery仍是dormant source-relative capability：没有执行stable readiness receipt/settlement、没有把
stable topology投影到live Coordinator/input/focus/portal/renderer，也没有新增public或internal barrel
export；Save/Persistence/canonical/digest/replay/wire均未改变。验证：focused
`6 files / 123 tests`、UI package `75 / 882`、全量 `249 / 3810`、完整
`deno task check` green。该checkpoint当时指向 S1-R.4 stable readiness settlement；现由下述
S1-R.4.0 contract closure细分为R4a、R4b.0与R4b.1；该checkpoint当时由R4a接续，现由下述R4a
delivery取代。

S1-R.3.0 同时冻结R4要消费的stable-only readiness envelope。它只在source-relative dormant
stable layer组合既有 `ManagedSurfaceReadinessEvidenceV1` attempt evidence与exact
`publisherLease`、`sourceRevision`；不得给transient/public evidence或receipt增加stable字段。
Admission先沿用既有application-epoch/candidate-instance attempt fence，再校验candidate保存的exact
lease/source。Application-epoch mismatch保留既有`surface.stale_application_epoch`；epoch相等后，
candidate absent/settled/cancelled、instance attempt mismatch或exact lease/source mismatch统一返回既有
`surface.stale_readiness`。两类stale都保持accepted/runtime/topology、notification与allocation exact
zero delta；只有全部fence相等才进入R4 settle/retry transition。

#### S1-R.4.0 readiness, topology, and cascade contract

R4不扩张transient/public `ManagedSurfaceTransitionReceiptV1`或readiness evidence。它新增独立的
source-relative `ManagedSurfaceStableReadinessResultInternalV1` closed union：

- `applied`复用`surface.readiness_ready | surface.readiness_failed`；delta固定
  `source: unchanged`、`runtime: settle_readiness`、`notificationCount: 1`、
  `topology: readiness_policy_derived`，并按同一transition实际启动的preparation使用
  `runtimeAllocation: zero | preparation_count`；这里的`notificationCount`只计一次composite state
  notification，不允许按target拆分；
- `stale`复用`surface.stale_application_epoch | surface.stale_readiness`并携带exact stable zero delta；
- package-owned phase、graph、planning或shared-capacity invariant无法形成完整successor时复用
  `faulted / surface.stable_reconcile_faulted`与exact stable zero delta。

R4a只在stable R0 source-relative contract中交付上述result/delta type与frozen table，不新增stateful
settlement method或stable state mutation。R4b.1随后只在exact specialized composite kernel增加
`settleStableReadinessReadyInternalV1(envelope)`与
`settleStableReadinessFailedInternalV1(envelope)`，两者都返回该dedicated union；不得用一个dynamic
outcome parser建立第二条readiness admission。两个method依次经过composition terminal/reentry gate、
application epoch、exact current preparing candidate/attempt、candidate保存的exact publisher lease、
candidate保存的exact source revision；early failure不得读取later fence。全部fence通过后才验证全体
registry/baseline/direct-runtime coherence、运行shared topology policy、计算phase/cutover、全体本次
newly-ready-and-active stable parents与其刚解除阻塞的direct `parent_unavailable` children，并一次形成
完整successor。

R4a把现有transient reducer私有的phase算法抽为唯一package-internal pure leaf。其输入是caller已经按
authoritative preorder排列的frozen rows；每行只携带exact opaque `subject`、non-negative
`layerOrder`、`preparing | ready` lifecycle与caller-captured `blocksLower`。Pure policy只按
`layerOrder`再按exact supplied preorder稳定排序，找到topmost blocking row，并输出保留exact subject
identity的frozen `preparing | active | suspended` projection；它不得解析subject、ID或来源。
`blocksLower`只在ready blocking instance或initial/child blocking fallback为true；hidden nonblocking
primary-replacement candidate不参与visible z-order，retained predecessor/subtree才参与。Transient reducer
必须改为该leaf的lossless adapter，并以golden corpus证明publication、receipt、revision、identity、
notification与同步reentry逐字等价；不得保留第二份phase算法。

Stable caller只可使用R2同一accepted vector的topology preorder（parent-before-child与scope-local sibling
order）和exact retained-subtree preorder。Parent/child即使属于不同scope，只要上述R2 relation已给出
order就是合法；primary replacement只以retained visible subtree参与。只有两个topology-participating
rows处于相同`layerOrder`且在R2 topology、exact retained subtree或existing transient publication中都没有
authoritative relative order时才fail closed。典型包括mixed stable/transient roots、不同publisher roots或
互不相关stable scopes的equal-layer tie；R4不得用runtime sequence、allocation order、slot lexical或lease
sequence发明z-order。

Ready或failed settlement都可能解除blocking edge。Initial/child blocking failure会退休terminal candidate
与fallback，并可能让既有ready-suspended parent恢复active；replacement failure通常不分配identity并继续
持有exact retained subtree。所有本次newly-ready-and-active parents的direct children必须先按existing R3
canonical planning/allocation order（root slot lexical → scope-local admitted sibling → parent/child slot
recursion）组成一个global batch，再进行一次shared safe-integer identity-capacity检查；grandchildren仍
保持gap。唯一semantic capacity是composition shared identity cursor，不得把R2的per-publisher 64-target
bound、detached allocator pending-set 64或lineage-depth 130提升为global cascade上限。R4b.1必须提供一次性bulk
detached allocation/capture seam，允许多个publisher合计超过64个合法direct children并在一个successor中
得到连续canonical identities；任何失败都不得留下partial ID、pending attempt或强历史。

若global batch容量不足，整个stable settlement返回`faulted / surface.stable_reconcile_faulted`：candidate、
fallback、parent/child/grandchild binding、retained subtree、accepted baseline、runtime array、high-water、
root contributor vector/token保持exact identity，零allocation且两类notification均为零。不得先把parent置
ready或先退休failed fallback后留下永久`parent_unavailable` gap。因为ready/failed receipt都是candidate
terminal-once，future live composition必须把这种post-fence planning fault同步提升为existing terminal
application teardown；它不是可重试pending结果。Dormant R4b.1只返回package-internal fault并保持old state，
不得在本切片自行发明public terminal receipt。

Shared policy也约束非readiness transition。Stable proposal apply（包括greater-changed）、greater-empty或
effective publisher dispose若移除blocker，必须在同一stable plan里启动全部本次newly-active accepted stable
parents（same或other owner）的direct-child batch；
phase/capacity失败在任何state install或R1 dispose gate之前回滚，并复用
`faulted / surface.stable_reconcile_faulted` zero delta。Greater-empty/effective-dispose因此在R4a给R0新增
closed applied delta variant：source仍为`accept_empty | remove_lease`，runtime为
`retire_owned_targets_and_prepare_unblocked_children`，topology为`readiness_policy_derived`，allocation为
`preparation_count`；既有zero-allocation三态rows在没有新eligible child时保持不变。Greater-changed既有
`retain_retire_prepare / preparation_count`统计subject与same/other-owner global cascade的全部fresh
preparations。任何stable composite transaction仍只计exact一次state notification；若其shared phase result改变
transient-facing publication identity，则另有exact一次transient notification并保持transient-before-state，
否则为零；faulted rollback两类均为零。

Transient close、owner dispose或其他nonterminal transient transition若触发同类reflow，R4a的generic
kernel提供default-identity、package-internal post-reducer finalization/result-override seam；R4b.1用它在安装前
合并stable phase/cascade。任一phase/capacity fault都回滚整个transient successor并返回existing
`faulted / surface.transition_faulted` receipt，before/after topology相等、无surface identity暴露且两类
notification为零；成功仍只有existing one transient notification，并且exact one composite state
notification，继续保持transient-before-state captured-vector顺序。Direct stable settle只从同一composite
state安装一次；若shared projection实际改变transient-facing publication则同样只通知transient listener一次，
否则为零。Source-relative stable ingress在S4前没有ordinary live caller，因此该内部投影能力不等于live
stable family promotion。

若被回滚的transient operation本身是terminal-once `readiness_ready | readiness_failed`，其receipt与stable
readiness一样不可重放；live composition必须在向Host/renderer返回前同步进入existing S3e terminal
application teardown。普通open/close/owner-dispose等nonterminal operation的faulted rollback仍保持old state并可
由caller显式重试，不得把所有transition fault都误升格为terminal。

Terminal `dispose_coordinator`不属于上述nonterminal reflow，也不得被phase ambiguity或identity exhaustion
阻止。R4b先以R4b.0独立关闭terminal disposition，再由R4b.1实现readiness：specialized composite owner在
mutation fence内以existing transient reducer terminal result为oracle，pure-build并validate一个完整terminal
successor，清空所有stable accepted baselines、preparing/ready/retained/gap bindings与root contributors，
保留shared identity high-water，generation token只按existing contributor-vector change规则fresh/reuse，且
把composite-private `boundRuntimeAttempts`、`pendingRuntimeAttempts`与
`stableContributorCandidates`等strong provenance collections替换为fresh empty records；不得靠清空public arrays
却继续强持旧attempt/subtree/lease。它不运行topology policy、cascade、definition lookup或capacity allocation。
全部可抛工作完成后，通过现有
prepared-install gate以构造期capture-once exact registry receiver与exact `dispose` callable执行
`Reflect.apply`；
`disposed | already_disposed`都收敛到同一terminal install，随后按existing顺序exact一次transient listener、
一次composite state listener并清空两组listener。Registry close到assignment之间不得有property lookup、
allocation、freeze、callback或await。首次返回existing `applied / surface.coordinator_disposed`，repeat保持
existing `unchanged / surface.coordinator_already_disposed` zero delta。Terminal path即使遇到外部先行registry
dispose也优先完成安全收口，不把ordinary R1b divergence规则用于阻止whole-composition teardown；fresh
successor必须使用fresh epoch与fresh registry。

Publisher边界仍禁止修改other-owner accepted source、occurrence authority、direct retirement、reparent或
identity replacement；但global shared-policy consequence可以原子改变other-owner ready phase或为其刚解除
阻塞的child创建fresh binding。Policy phase不变时，R3b已经锁定的baseline、entry、ready instance/binding与
retained aggregate继续exact复用；phase改变时只重建最小ready phase wrapper/binding，exact runtime attempt、
admitted target、parent instance、surface instance ID与routing identity保持。Retained-subtree任一ready member
phase改变时构造same-origin authenticated current aggregate，exact preorder与member attempt/identity不变；之后的
failure/second replacement只复用该current canonical aggregate。Root phase变化按existing contributor rule轮换
reservation generation token，descendant-only phase变化保留exact token。Active parent只在child attempt
allocation edge上必需；child ready后，新的
blocking child/higher blocker可合法让parent suspended而不取消、reparent或孤立该child，R4b.1必须相应收窄
stable runtime validator。

S1-R.4a delivery 已完成：`@sillymaker/ui` 将既有transient phase/blocking派生抽为唯一
package-internal pure topology leaf。该leaf只消费caller提供的exact opaque subject、non-negative
`layerOrder`、authoritative preorder、`preparing | ready` lifecycle与captured `blocksLower`，逐字段
exact-once捕获后按layer与supplied order稳定派生frozen `preparing | active | suspended` projection；它不读取
subject内容，也不读取runtime/allocation identity、slot、lease或其他排序来源。R3 canonical
planning/allocation order仍是
独立authority，不得被phase/z-order的layer排序替代。现有transient reducer已成为该leaf的lossless adapter，
保持既有publication、receipt、revision、instance/attempt identity、blocking、notification与同步reentry语义，
不保留第二份phase算法。

同一切片也只在source-relative R0 floor新增dedicated stable readiness result/applied-delta与frozen
readiness/cascade-aware reconcile tables，并为generic runtime kernel增加default-identity、package-internal
nonterminal post-reducer state/receipt override seam。该seam在安装前捕获完整successor，throw或显式fault override
都保持old state与零notification；terminal `surface.coordinator_disposed | surface.coordinator_already_disposed`
直接绕过generic finalizer，继续由R4b.0的terminal disposition合同拥有。R4a没有新增stateful stable settlement、
stable state mutation、live stable ingress/family或public/internal barrel export；该历史切片当时未实现
R4b.0与R4b.1，现由下述R4b.0 delivery接续。

验证：focused `6 files / 123 tests`、UI package `76 files / 909 tests`、全量
`250 files / 3837 tests`、`deno task check` green、browser `101/101`、examples `45 passed / 2 skipped`、
prebuilt `38/38`。

S1-R.4b.0 delivery 已完成：generic runtime kernel新增source-relative、first-terminal-only
prepare/gate seam。它只以reducer产生的exact `applied / surface.coordinator_disposed` receipt作为
terminal classifier，不在specialized wrapper预读或信任caller `operation.kind`；
`surface.coordinator_already_disposed`、其他receipt与nonterminal R4a finalizer均保持原有独立路径。
未提供terminal preparer的generic adapter继续exact保留原reducer state、receipt、notification与reentry
语义。完整terminal successor、install validation、listener vector与gate callable全部在shared mutation
fence内预先捕获；gate之后只把已捕获local state赋给唯一state cell，中间没有property
lookup、allocation、freeze、callback或await。Gate/preparation/validation throw均保持exact old state与零
notification，并释放reentry fence。

Specialized composite owner以existing reducer terminal successor为oracle，在不运行topology policy、definition
lookup、cascade或capacity allocation的前提下，一次清空全部stable accepted baselines、
preparing/ready/retained/gap runtime bindings与root contributors。它保留exact composite origin、admission
authority、publisher registry、transient resolved recipe/cursors与shared identity high-water；旧root
contributor vector非空时轮换fresh reservation generation token，已空时复用exact token。
Composite-private `boundRuntimeAttempts`、`pendingRuntimeAttempts`与
`stableContributorCandidates`在旧集合为非空或已空时都替换为fresh-empty records；新的
source-relative frozen provenance comparison probe只暴露identity-comparison boolean与collection size，不暴露
Map、Set、vector、lease或registry引用，也不进入public/internal barrel。

Composition构造期capture-once exact registry receiver与registry-wide `dispose` callable；gate以
`Reflect.apply`执行，`disposed | already_disposed`都安装同一terminal successor。Raw registry已先行
dispose、shared identity high-water已达`Number.MAX_SAFE_INTEGER`、initial preparation +
`parent_unavailable` gap、以及retained-subtree replacement都保持terminal convergence、零identity
allocation与旧runtime不可复活。旧prepared install在terminal commit后返回stale且不调用gate；
已是terminal的initial transient seed在claim registry disposal authority前直接拒绝，不能作为fake
successor seed；合法successor仍必须领取fresh application epoch与fresh registry。首次dispose仍返回
existing applied receipt，按transient后state各exact一次顺序通知并
清listener；repeat仍为`surface.coordinator_already_disposed` zero delta。该切片没有新增stable
readiness settlement、live stable family/ingress、public API、internal barrel export、Save/Persistence、digest、
replay或wire变化；R4b.1继续拥有source-bound readiness与global cascade settlement。

验证：focused `7 files / 154 tests`、UI package `76 files / 919 tests`、全量
`250 files / 3847 tests`、`deno task check` green、browser `101/101`、examples `45 passed / 2 skipped`、
prebuilt `38/38`。

S1-R.4b.1 delivery 已完成：specialized composite kernel新增两个exact source-relative ingress：
`settleStableReadinessReadyInternalV1(envelope)`与
`settleStableReadinessFailedInternalV1(envelope)`。两者共享同一mutation/reentry fence，并严格按
terminal/reentry → application epoch → current candidate attempt → exact publisher lease → exact source
revision顺序判定；任一early stale不读取later fence。全部fence通过后才验证whole-composite
registry/baseline/runtime coherence并调用唯一shared topology reflow，ready/failed receipt只安装一个完整
successor或返回exact-zero fault。

同一reflow现已覆盖stable readiness、greater-changed proposal、greater-empty、effective publisher dispose与
generic nonterminal transient transition。任何blocker retirement或phase变化导致same/other-owner
ready-suspended parent恢复active时，全部刚解除阻塞的direct `parent_unavailable` children都纳入同一原子
plan；grandchildren保持gap。Stable phase/capacity fault在state install与publisher-dispose gate前回滚为
`surface.stable_reconcile_faulted`，transient post-reducer fault回滚为existing
`surface.transition_faulted`；两者都保留exact old state、accepted baseline、runtime/high-water、reservation
token与零通知。Equal-layer且没有R2 topology、retained-subtree或existing transient preorder authority的tie同样
fail closed，不以allocation、slot或lease sequence发明z-order。

Fresh root与最终eligible child preparation先形成统一canonical request vector，再按root slot lexical、
scope-local admitted sibling与parent/child recursion一次执行shared safe-integer capacity检查和detached bulk
allocation。该one-shot batch不受旧pending-set 64预算限制；cross-owner合计超过64个direct children仍获得连续
canonical identities。Late exhaustion保持零partial identity/pending attempt/强历史；greater-changed中ready
parent的fresh child与后续root也严格按canonical path分配，不被两阶段planning重排。

Replacement failure继续复用exact authenticated retained subtree，ready cutover只退休该exact aggregate；phase
变化只重建最小ready wrapper或same-origin retained aggregate，attempt、target、parent、instance/routing identity
保持。Source-relative child readiness failure只从exact candidate settlement产生，parent随后suspended时，shared
reflow只保留该exact current gap；fresh child不能经该ingress伪造failure provenance。Root phase变化按existing
contributor vector规则轮换reservation token；descendant-only变化保留exact token，other-owner
source/occurrence/ready identity不被直接改写。

成功stable transaction仍只有exact一次composite state notification；shared projection实际改变transient-facing
publication时另有exact一次transient notification并保持transient-before-state，否则为零。Subscriber reentry先见
完整successor，stale repeat不能再次settle；faulted rollback两类notification均为零。该切片没有接入Narrative、
React Host或Web live stable family，没有新增public/internal barrel、transient receipt/evidence、Story API、
Save/Persistence/canonical/digest/replay/wire变化。R5仍须完成neutral harness、bounded churn与dead-path audit，
之后才允许按S4 gate迁移第一个真实stable-target family；该checkpoint现由下述R5 delivery关闭。

验证：focused `9 files / 206 tests`、UI package `77 files / 942 tests`、全量
`251 files / 3870 tests`、`deno task check` green、browser `101/101`、examples `45 passed / 2 skipped`、
prebuilt `38/38`。

S1-R.5 delivery 已完成：新增中性、test-only stable aggregate harness，以两个generic owner、generated
occurrence与无游戏规则参数运行explicit reference trace。该trace覆盖initial root/child、ready/failure、
cross-owner blocking、owner conflict exact-zero、greater-same gap retry、replacement failure + retained
predecessor、greater-empty、effective/repeated dispose、fresh successor lease与stale predecessor proposal；每一步
同时断言accepted source、runtime kind/phase、exact attempt identity、notification与shared identity high-water，
不调用Cat Cafe、Narrative产品规则或第二份writable stable state。

同一harness执行`10,000`次完整nonempty → readiness-failed → empty reconcile cycle：最终source revision
high-water为`20,000`、occurrence与shared runtime identity high-water均为`10,000`，state notification为
`30,000`、transient notification为`0`；current accepted vector、runtime、root contributor与registry只保留
当前两个publisher及scalar cursors，不积累历史target/attempt/tombstone。Source-relative frozen private-provenance
comparison补入`preservedReadinessFailureGaps`的exact Set identity与before/after size；每次failure为`1`、empty
回到`0`，terminal successor连同bound/pending attempts、failure gaps与contributor candidates全部fresh-empty，
且listener只收到一次完整terminal successor。

Transient readiness evidence/receipt继续没有publisher lease、source revision、accepted baseline或reconcile
cursor字段。Reviewed public/transient export与bounded import/dead-path audit确认UI root、`./internal` barrel、package
export map及Narrative/React/Web live graph均未接入stable source-relative modules；该证据记录在delivery中，不新增
冻结exact file inventory的常规CI测试。R5没有promotion live stable family，也没有改变Story API、
Save/Persistence/canonical/digest/replay/wire；S1-R aggregate只作为S4第一个真实stable-target family的已关闭
engine gate。

验证：focused `12 files / 272 tests`、UI package `78 files / 946 tests`、全量
`252 files / 3874 tests`与完整`deno task check` green。本切片只改变source-relative comparator audit seam与
test/docs，不影响browser或build路径，因此没有机械重跑browser/examples/prebuilt；本轮最近的R4b.1证据仍为
Engine browser `101/101`、examples `45 passed / 2 skipped`与prebuilt Player `38/38`，不把它们表述为R5
HEAD上的重复执行。

### 3.2.1 S4.0 Narrative/History family contract floor

S4的第一个真实stable owner固定为Narrative semantic owner。一个application epoch只由composition root为它
创建一个publisher lease；普通Story作者、React component、renderer与`PendingInteractionV1`都不得领取或手写
lease、source revision、Surface target occurrence或runtime instance。Composition-owned bridge只从immutable
semantic publication投影desired vector，并与Overlay/System共用同一个composite kernel、shared identity cursor、
Coordinator publication及successor lifetime；它不保存第二份semantic state，也不靠effect/subscription异步双写
React local mirror。

Narrative family的V1 topology与definition contract固定如下：

| Definition    | Exact topology and policy                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dialogue root | owner `surface-owner.narrative`，definition `surface.narrative.dialogue`，root slot `surface-slot.narrative.root`（`single`），layer `surface-layer.narrative` / order `40`。它是blocking、managed `narrative` input、owns-focus surface；initial target `surface-focus.narrative.primary`、`trap: true`、`restore: previous_owner`。Back/Escape/backdrop/routed cancel全部locked，navigation为`none`。Initial open使用blocking fallback，replacement retain exact current subtree。 |
| History       | definition `surface.narrative.history`，child slot `surface-slot.narrative.history`（exact-parent `single`），同layer / order `41`。它是Coordinator-owned transient blocking child，不是stable target、semantic publication或React-local boolean。Initial target `surface-focus.narrative.history-close`、`trap: true`、`restore: opener`；Back/Escape/backdrop/routed cancel全部关闭该exact child，navigation为`close`，child open使用blocking fallback。                           |

Dialogue root覆盖每个非空`PendingInteractionV1`：`say`、`choice`、`pause`、
`presentation_barrier`与`custom`都不能再走平行的Engine Lab/Story lifecycle。History可由任意current ready+active
Dialogue root作为parent，是否显示入口可由只读History availability决定，但topology不得按pending kind分叉；每次
open分配fresh transient occurrence/instance。Root replacement准备期间保留exact current root+History subtree，
replacement failure继续保留它；ready cutover、greater-empty或publisher/Coordinator disposal在同一个install中退役
旧root与整棵History subtree，新root不会继承“History已打开”的UI session状态。

Stable root target参数只携带由bridge生成并冻结的semantic boundary：
`semanticOccurrenceId`、`kind`、`definitionId`、`seenRevision`与`rendererKey`；`rendererKey`对custom
interaction由exact `surfaceId`生成，其余kind使用固定family key，不能由Story自由手写。Base semantic occurrence与Surface target
occurrence/runtime instance是三个独立domain，绝不复制`interaction-occurrence.*`作为Surface ID。同一exact semantic
occurrence + boundary在普通global `SemanticPublication.revision`、History内容、localization、reveal/audio/profile/
seen或player-mode变化中保留exact target occurrence并且不发布新stable revision。Bridge同时保存bounded canonical
full normalized `PendingInteractionV1` proof；同一occurrence下say text/speaker/advance policy、choice prompt/options、
pause duration/skippable、barrier transition/recovery、custom surface/params或任一base/boundary字段只要byte-different，
都必须在unchanged classification前closed fault，不能让active Host保留旧frame或静默换target。Localization解析结果、
History与Host profile不属于该proof。新semantic occurrence推进Narrative专用source revision并分配
fresh target occurrence；非空变空发布greater-empty；empty后再开仍fresh；renderer failure的显式greater-same retry
只分配fresh candidate instance，不换target occurrence。Initial null保持registered-unpublished，rebootstrap/load/import/
HMR successor使用fresh lease、revision domain与Surface occurrences，不携带旧semantic→Surface映射。Global semantic或
presentation revision永远不能替代该per-lease source revision。

Candidate resolver必须在identity allocation前捕获exact Story content renderer、冻结visual config、semantic dispatch
port、immutable pending frame、read-only current History observation port、player profile、presentation clock与UI text resolver；
voice replay与quick-menu contribution是显式optional port。Definition/schema/resolver/required-port missing、foreign或throwing
属于preflight structured rejection，identity/topology exact zero；不能先分配candidate再把它记为readiness failure。
Candidate React render/layout/Host-commit failure才是candidate-bound readiness failure，不能形成active-but-invisible root。
Candidate subtree在正确Narrative portal完成Host commit、注册exact initial-focus target并安装managed input/action binding后
才可settle ready；candidate没有ordinary semantic action、input、focus或routing authority；code-native blocking fallback
独立持有blocking isolation、fallback-only input gate与focus scope/trap。Story content renderer只渲染controller/view props，
不能调用Coordinator、持有`showHistory`/`active` writable lifecycle或自行注册ordinary Narrative input。

S4.1a冻结的candidate preflight结果是Narrative source-relative contract，不扩张generic stable
result table。Callback只能返回下列exact tagged data record之一：

- `{ kind: "captured", candidateSnapshot }`；
- `{ kind: "rejected", code: "narrative.renderer_missing" }`；
- `{ kind: "rejected", code: "narrative.required_port_missing", portId }`；
- `{ kind: "faulted", code: "narrative.candidate_preflight_faulted" }`。

`portId`是closed set：`narrative.semantic_dispatch`、`narrative.history_observation`、
`narrative.player_profile`、`narrative.presentation_clock`与`narrative.text_resolver`。Renderer
缺失独立于required-port分类；voice replay与quick-menu contribution是`null`或exact opaque
optional identity，不进入required-port set。三类Narrative rejection/fault result都携带exact stable
zero delta，但不进入`ManagedSurfaceStableResultCodeInternalV1`、R0 result tables、public facade或
public/internal barrel。

Preflight result与`candidateSnapshot`都以exact own-key/data-descriptor capture读取；不调用返回对象的
value getter，多余/缺失key、accessor、unknown tag/code/port ID、async result、hostile reflection或
malformed snapshot都收敛为`narrative.candidate_preflight_faulted`。Captured snapshot只保存新的
frozen record与exact renderer/config/port identities，不保存caller result object作为第二authority。
Callback及全部descriptor capture完成后，bridge必须先重验exact publisher lease、accepted
baseline与reservation generation；已提交的nested publication/disposal/successor先于外层
preflight result，loser的issuance/state/notification均为zero。只有currentness仍exact才重验
source/occurrence capacity并分配identity。Readiness-failed的explicit retry必须重新preflight并捕获
fresh candidate snapshot，同时保留exact semantic proof与Surface target occurrence；它只推进source
revision并分配fresh runtime candidate。

所有会产生semantic resolution的路径使用同一个stable lifecycle fence与Base occurrence fence，但physical input和automatic
controller不能伪装成同一种gesture provenance：

1. Pointer、keyboard与gamepad先由current managed binding验证application epoch、Surface instance、topology revision、routing/input publication、
   action catalog与physical gesture；并确认该binding仍属于current authenticated Narrative stable runtime。任一
   stale/unpublished/retained-predecessor-only路径都消费该binding-origin action、返回既有Surface/Input receipt且对Base
   dispatch为零。
2. Auto/pause等automatic resolution使用package-internal controller-attempt lease，绑定exact application epoch、current
   Surface instance/topology、publisher lease、target occurrence/source revision与controller generation；它没有也不得伪造
   physical gesture ID。Root非active、source/instance被replace或controller generation失效都使attempt stale且dispatch为零。
3. 只有physical path得到exact `unchanged / surface.action_routed`，或automatic path的exact controller attempt仍current，
   才向Base semantic port提交捕获的
   `expectedOccurrenceId`与resolution；Base继续执行现有queue-front occurrence/kind/choice validation。Semantic rejection
   不回滚或乐观关闭Surface，successful semantic commit随后经新的source publication驱动root replace/empty。

Surface/Input receipt与Base semantic receipt保持分离，不扩张通用transient receipt或发明universal action envelope。
History open/close、player auto/skip/history/hidden/replay controls与typewriter/reveal本身不dispatch GameCommand、不推进
gameplay revision/CommandLog；root非active（包括History child或更高blocker使其suspended）时automatic semantic timers
不得推进剧情。使root suspended的同一个commit立即暂停controller、保存remaining deadline/cursor并撤销旧attempt；
History preparation failure/close或higher blocker removal让同一root重新active时按remaining恢复，不从full duration重启；
root replacement/empty/dispose直接取消。Timer callback与History/blocker transition经同一composition transition fence串行
first-wins，loser只能stale且zero dispatch。`NarrativeHistoryV1`继续是authoritative Save-backed backlog，seen/profile仍是
Host profile；二者都不是Surface lifecycle authority。

Live cutover前的旧行为只作characterization evidence，不是accepted policy。S4必须把当前任意React lifecycle slot改为
composition-created typed Narrative family declaration：Story只提供pure selector/content renderer/controller ports。
同一个atomic cutover要迁移Engine Lab、template、Cat Cafe与Bookshop，并删除或收窄：

- `DefaultGameRootSlotsV1.narrative`直接mount任意lifecycle host的能力；
- `VnLayerV1(active, inputRouter, ...)` standalone writable lifecycle/focus/input export；
- `DialoguePanelV1`的pending直通、local `showHistory`、embedded absolute History与direct `onResolve`；
- Engine Lab local History/hidden topology writer、ordinary input registration与无Surface evidence的
  `AdvanceSurfaceV1`/choice dispatch path。

`DialoguePlayerController`继续拥有typewriter/auto/skip/seen/timing，`DialogueView`继续拥有speaker/text/choices/skin，
`NarrativeSurfaceHost`独占lifecycle/input/focus/isolation/history/dismiss。旧public visual preset若保留，只能成为view-only
content contribution；不提供能反向写lifecycle的compatibility wrapper。S4不能长期双写或先发布一套新的public generic
Coordinator API。

S4据此拆为：S4.0本contract/characterization floor；S4.1a source-relative definition/catalog、publisher
projection与candidate preflight；S4.1b authenticated physical/automatic action admission；S4.2 dormant
controller/view/Host、Host-commit readiness与History exact-child integration；
S4.3在一个cutover中迁移全部tracked consumers、删除旧writers并完成headless/browser/prebuilt promotion。若exact-parent
History不能与stable root共用composite authority、root/History不能原子retain/retire、同一semantic occurrence确实允许
上述identity boundary漂移、三类设备不能共用双fence、或cutover必须保留direct resolve/local bool/standalone host双写，
立即停止并修订设计；S4不得借机改变Save/Persistence/NarrativeHistory/Snapshot/semantic receipt合同。

**S4.1a delivery：** 已交付source-relative exact Narrative family catalog、composition-owned publisher
projection与candidate preflight：Dialogue是stable root，History仍是后续Host才接入的exact-parent transient
child；bridge使用Narrative专用publisher lease/source revision/target occurrence，并以full normalized
`PendingInteractionV1`的bounded canonical proof区分exact unchanged与same-occurrence drift。Factory捕获exact
definition/schema/catalog provenance，candidate preflight捕获exact Story renderer、config、required/optional ports与
immutable pending frame；callback完成后的baseline/reservation/capacity fence使nested winner原子先于
outer result，failure retry则以同exact semantic proof/target occurrence捕获fresh snapshot并且不复用
failed candidate。Registration cleanup/postcheck与dense exact catalog matcher闭合construction与successor provenance；
generic stable result table、public/package barrel与live Narrative Host/cutover均无promotion。Authenticated
physical/automatic action admission仍属S4.1b，Host-commit readiness、History child与live consumer migration仍属
S4.2–S4.3。

S4.1a验证证据为focused `5 files / 138 tests`、UI `79 files / 989 tests`、full
`253 files / 3917 tests`与`deno task check` green。本批没有机械重跑browser/examples/prebuilt；
`101 / 101`、`45 passed / 2 skipped`与`38 / 38`是最近先前切片的unchanged evidence，
不冒充S4.1a HEAD的新验证。

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

#### Composition-bound successor acknowledgment

Core 与 composed application 的 `anchored` 含义分层，不得混用：

- **authoritative anchored** 只证明 Core 已提交 authoritative replay-base replacement；
  公开 `SessionAnchorResultV1` 的 `anchored` 继续只表达这一层；
- **presentation successor installed** 证明该次 replacement 对应的 exact UI successor
  已通过本节规定的完整安装点；
- **composed anchored** 同时要求 exact、descriptor-safe 的 Core anchored result 与同一
  operation 的 presentation-successor-installed acknowledgment。

每次进入 standard composed lifecycle 的 authoritative replacement preparation 由 Core mint
一个 fresh、opaque、package-internal operation token。token 与 replacement publication context
是同一 identity，
经 package-internal anchor event 绑定 exact committed anchor；它不进入公开 anchor、
`SessionAnchorResultV1`、Surface receipt、Save、Persistence、canonical、digest、replay 或
wire。composed restart 必须先取得 prepared one-shot operation、以 exact token arm
composition-bound broker，再启动 raw Core operation。不得用调用时的 `before + 1`、当前/
latest anchor、origin-only/FIFO 猜测、wall-clock timeout 或历史扫描替代 token correlation；
并发 restart、load/import 交错及 subscriber 内 reentrant successor 均按各自 token 独立结算。
broker 只保留未消费的 in-flight entry，消费、失败或 terminal 后立即释放，不形成历史日志。
受控的 legacy/generic replacement event 可以携带 `null` context，但它不得被猜测或
提升为 per-token composed anchored；该 origin 的 activation failure 仍进入同一
origin-independent terminal latch。

只有下列顺序完整成功后，producer 才能为该 token 发布 installed acknowledgment：

1. exact Core anchor event 已携带该 token；
2. shared Coordinator successor 已安装，全部 family adapter 已 prepare/arm；
3. shared ingress gate 已 release，全部 family activation notification 已返回；
4. UI presentation anchor publication 已返回；
5. publication callback 后重新验证 composition 未 disposed/terminal、captured successor
   runtime 仍是 current 且 ingress open、全部 family 仍 attached 于该 runtime、UI anchor
   仍与 exact event 相同。

ack 必须在 drain 下一 queued generation 前结算并按 token 保留到 consumer 读取；因此后来
generation 即使先于旧 caller continuation完成，也不能覆盖旧 generation 的结果。普通
Coordinator/family subscriber failure仍按既有 observer-isolation合同只报告 diagnostics；
只有 internal no-throw activation closure escape、successor bind/activation failure、UI anchor
publication failure或上述 post-publication liveness failure属于 successor activation failure。

若 raw Core 返回 anchored 时该 token 的 ack 为 failed、missing 或 mismatched，不把结果伪造为
`SessionAnchorResultV1.faulted`，也不 rollback、创建 recovery successor或调用逐 family
close/reset。标准 composed Web application 必须将其提升为 terminal runtime fault，并最终以
`Error("ui.presentation_successor_activation_failed")` reject。producer 一旦在 anchor
subscriber stack中检测到 activation failure，必须先同步 latch terminal state、封闭 application
ingress并记录 token failure，再把原异常重新抛给 Core 的 observer diagnostics；不得等 raw
Core Promise continuation 才开始 fence。

#### Terminal application fence and teardown

标准 Web composition 是 terminal fault 的唯一 owner；bare React Root 与 Core 不拥有 UI
teardown policy。terminal primary error first-wins，cleanup/diagnostic failure不得替换它。
terminal 与 ordinary rebootstrap 共用一个 deferred-first、可重入、幂等 teardown state
machine：在执行任何 user/Story/Host callback 前先发布唯一 disposal promise并同步关闭 Core/
Persistence mutation、automation、physical input、presentation intent、Managed Surface 与
title lifecycle generation ingress；随后禁止 predecessor focus restore，unmount Root，并逐项
best-effort cleanup UI/composition/input/automation/capabilities/Story extension，最后始终尝试
现有 Core/Persistence release。每项 cleanup 单独隔离；Host logger 也只是可失败的
best-effort diagnostic。terminal rejection 只能在上述 fence 与 disposal 完成后暴露。

所有 origin 的 composition successor activation failure（restart、load、import、rollback或
其他 authoritative replacement）进入同一 terminal latch；本合同只给 composed restart增加
positive result gating，不改变 load/import/Persistence 的公开 result、completion、bytes 或
operation ordering。

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

### 4.5 Lifecycle restart admission

`DefaultGameRootV1.lifecycle` 保持 optional，但 absence 不是隐式成功。programmatic
`returnToTitle` 始终返回 Promise且不得同步抛错；没有 lifecycle 时，它在任何 title、System、
Overlay、focus、input、gesture、revision、allocation或notification mutation前异步 reject
`Error("ui.lifecycle_restart_unavailable")`。同步 restart throw 与异步 rejection都保持为
Promise rejection。

settled lifecycle result 必须由 UI-owned package-internal parser执行 descriptor-safe exact
runtime admission，不以 TypeScript shape代替检查：

- anchored 只有 exact own data fields `{ kind: "anchored", commandSequence }`，且 sequence
  是 non-negative safe integer；
- rejected 只有 exact own data fields `{ kind: "rejected", code }`，code 为 Base closed set
  `busy | fault_paused | hmr_invalidated | validation_failed`；
- faulted 只有 exact own data fields `{ kind: "faulted", code }`，code 是 primitive string；
- accessor、inherited/extra string field、symbol、sparse/Proxy failure、unknown kind 与 malformed
  known kind均 invalid，异步 reject `Error("ui.lifecycle_restart_result_invalid")`。

descriptor getter-zero只约束最终 settled result 的 `kind/code/commandSequence` admission。
JavaScript Promise resolution在 consumer观察前可能已 assimilate fulfilled thenable并访问其
`.then`；本合同不声称能逆转该语言行为，也不新增 Promise-constructor identity 的公开
约束。标准 composed Web path把 malformed/unknown result视为 terminal invariant fault：先按
前节完成 fence/teardown，再以 `ui.lifecycle_restart_result_invalid` reject；合法 rejected/
faulted与 raw Promise rejection不因此 terminal。bare Root 对注入 result使用同一 parser，但只负责 unavailable/invalid/rejected/faulted
的异步映射：合法 rejected/faulted仍为既有
`ui.lifecycle_restart_<kind>:<code>` error；它不拥有 terminal latch或 composition ack。

只有标准 composed Web wrapper得到 exact composed anchored 后才能显示 title。successful
restart已经由 application anchor安装 shared-Coordinator successor；Root 不得随后调用 System
close或 Overlay `closeAll`。New Game使用相同 admission：没有 lifecycle时保留 title、不调用
`beginNewGame`，沿用现有 failure UI code `unavailable`；DevDock 在 lifecycle缺失时不贡献
Reinitialize。programmatic return-to-title入口为API shape稳定而保留并按上文 reject。本收敛不
迁移 Title/Splash或DevDock topology/lifecycle authority，也不建设 UI-only cross-family reset
transaction或 public/general application receipt。

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
- stable publisher 只能直接复用 global semantic/presentation revision，或 ordinary
  unrelated projection 更新会推进 stable source fence；
- accepted desired vector 无法与 pending candidate、failed gap、retained runtime
  predecessor 分离表达；
- empty vector或publisher lease dispose 无法与该lease的runtime retirement在一个
  composite commit 中完成；
- 同一 occurrence 必须合法 reparent/reorder、publication 必须 cross-owner
  parent/evict，或 V1 只能靠“最后一个 publisher 获胜”解决 slot conflict；
- stable exact admission 必须复制/改变 canonical JSON 算法、deep import Base `src/**`，
  或无法通过 declared workspace-only internal seam共享 canonical implementation；
- apply-time stale proposal只能靠重跑R2/schema/canonical/reservation才能判断，或在exact CAS完成前
  已产生source/runtime/topology、notification或allocation delta；
- stable readiness只能通过扩张transient/public evidence/receipt、依赖全局topology/publication
  revision，或在stable fence完成前先调用underlying settle；
- stable admission 必须对 Story schema、Proxy trap或 `Reflect.ownKeys` 提供 sandbox级绝对
  CPU/memory bound，或必须让 nested raw parameters在 schema 前 getter-zero且又不增加新的
  raw-admission contract；
- V1 真实 consumer 必须让不同 publisher共享同一 root stack、需要 cross-owner canonical
  order，或 subject-bound finite reservation snapshot无法表达 accepted runtime gap；
- S1-R 必须向 transient public contracts 增加 source 字段，或必须先接入 Narrative/
  React Host 才能证明 dormant reconcile kernel；
- R3a generic kernel无法成为stable/transient唯一runtime/identity authority、必须保留独立stable
  writable axis，或stable preparation只能靠synthetic transient occurrence/第二个identity cursor；
- R3必须从第二份definition catalog按ID/revision猜resolved definition，而不能从R2 same-factory
  exact admitted-target inspector取得；
- publisher ingress关闭后dispose commit仍可能执行会throw的planning/allocation/freeze/user callback，
  或subscriber failure能阻止already-built composite state安装；
- R4 parent-ready direct-child cascade无法满足R4.0已经冻结的all-or-nothing capacity、closed
  `surface.stable_reconcile_faulted`或transient-trigger rollback contract，而只能partial settle或留下虚假gap；
- 多 target parent-dependent readiness 需要一种无法由现有 transition-kind policy
  推导的整 vector 同步 activation 语义；
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
- composed anchored 只能依赖 current/latest anchor、call-time `before + 1`、origin-only/FIFO
  或 timeout猜测，无法绑定 exact Core replacement token；
- successor activation failure只能在 raw Core Promise continuation中发现，不能在 producer
  callback stack先同步 terminal-fence ingress；
- package-internal acknowledgment必须进入 public `SessionAnchorResultV1`、public anchor、
  Save/Persistence/canonical/digest/replay/wire才能工作；
- teardown promise无法在任一 cleanup callback前发布，cleanup throw/reentry会跳过其他资源或
  Core/Persistence release、替换 terminal primary error，或 terminal unmount必然恢复 predecessor
  focus且只能通过新增 public DOM/Root evidence阻止；
- exact lifecycle result admission必须执行 accessor/Proxy getter才能分类，或必须改变 public
  result union才能拒绝 malformed value。

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
   equivalence、包含 parent/order 的完整 identity tuple、专用 per-lease revision
   状态表、desired/runtime divergence、empty/dispose、cross-owner rejection、atomic
   vector 与 lease/source-bound readiness；transient contract 不携带占位 source
   字段；
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
    raw authoritative anchored 与 composed anchored 由 exact package-internal operation token
    分层；per-token acknowledgment只能在 all-family notification、UI anchor publish 与
    post-liveness后成功。failed/missing/mismatched ack在 producer stack先 terminal-fence，
    teardown在 cleanup throw/reentry下仍 exact-once到达 Core/Persistence release，且 public
    `SessionAnchorResultV1`/anchor与 Save wire均未扩张；
14. [architecture](../architecture.md)、[features](../features.md)、[story authoring](../story-authoring.md)
    与 public exports 在实现落地时同步更新。
