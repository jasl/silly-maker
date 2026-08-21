# Managed Surface lifecycle and contract harness

状态：2026-07-30 接受的目标设计（补记 2026-08-19/20：正文中 Dialogue 的
`pause` pending 与 `resume` resolution 已由权威持有钟车道并入 `hold`，时间经
session 级 `TimeTickV1` 结算而非 input resolution；本文余下的 pause/resume 叙述
是历史交付词汇，现状见 [features](../features.md) 与 architecture.md 的
supersede 记录）；2026-07-31 根据 PF2 pilot 决策与 dormant
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
candidate preflight，S4.1b.0又已闭合shared contract-bound action route core与whole-composite stable input
authority，S4.1b.1a又把authenticated envelope action ID保留到claimed continuation，
S4.1b.1b.0已交付choice-only authenticated physical semantic admission，S4.1b.1b.1a又已交付
skippable-pause physical resume，S4.1b.1b.1b.1又已交付automatic pause-expiry controller-attempt
admission/dispatch floor，S4.1b.1b.1b.2a又已交付custom physical payload admission，
S4.1b.1b.1b.2b.0现已冻结remaining Say/barrier/player policy，
S4.1b.1b.1b.2b.1a又已交付physical Say reveal-first admission，
S4.1b.1b.1b.2b.1b又已交付content-auto Say controller-attempt floor，
S4.1b.1b.1b.2b.2a又已交付normal Stage→Narrative acknowledgment vertical，
S4.1b.1b.1b.2b.2b.0又已冻结recovery generation admission entry contract，
S4.1b.1b.1b.2b.2b.1现已交付settle/replay recovery implementation，
S4.1b.1b.1b.2b.3.0又已冻结player-controls execution split，
S4.1b.1b.1b.2b.3a现已交付toggle-ui Narrative catalog corrective，
S4.1b.1b.1b.2b.3b.0又已冻结voice replay entry contract，
S4.1b.1b.1b.2b.3b.1现已交付voice replay physical route implementation，
S4.1b.1b.1b.2b.3c.0又已冻结bridge-owned Auto/Skip exact entry contract，
S4.1b.1b.1b.2b.3c.1现已交付bridge-owned Auto/Skip transient mode implementation，
原S4.1b.1b.1b.2b.3d History broad checkpoint又已由S4.1b.1b.1b.2b.3d.0 exact entry contract与
S4.1b.1b.1b.2b.3d.1 implementation线性取代，二者现均已完成。原S4.2 dormant
Narrative Host/History/controller broad checkpoint又已由S4.2.0 docs-only exact execution split取代，
S4.2.1 History intent redemption + stable-parent transient-child preparation现也已交付；原S4.2.2 broad
checkpoint又由completed docs-only S4.2.2.0细分，S4.2.2.1 DOM-free Narrative session/readiness attachment
floor现亦已交付；原S4.2.2.2 broad Host checkpoint又由completed docs-only S4.2.2.2.0细分，
S4.2.2.2.1 DOM-free generic Host-commit atomic substrate与S4.2.2.2.2 dormant Narrative React Host
现也均已交付，S4.2.3 broad checkpoint又由completed docs-only S4.2.3.0细分，S4.2.3.1 DOM-free
generic exact History-child lifecycle substrate与S4.2.3.2 dormant Narrative close/input/root + History focus Host lifecycle现也均已交付。
原S4.2.4 broad controller checkpoint又已由completed docs-only S4.2.4.0 exact entry重切，S4.2.4.1 generic prepared
state-install participant substrate、S4.2.4.2 DOM-free Narrative DialoguePlayerController core与S4.2.4.3 dormant Host
player-view integration现也均已交付。原S4.2.5 broad checkpoint已由completed docs-only `.5.0`细分并转为historical；原`.5.1`
implementation checkpoint也已由`.5.1a`–`.5.1c`细分并转为historical，`.5.1a`、`.5.1b`与`.5.1c`现均已交付。`.3.1a`与`.3.1b`也已依次交付并转为historical。
PF5/M3 现也已完成并转为 historical。当前 active execution pointer 只由
[production-floor sequence](../plans/2026-07-30-production-floor-sequence.md) 拥有；
PF6/S5 broad harness 已在 Complexity Reset 期间暂停。本文后续 delivery records 中的
旧 current pointer 只记录当时顺序，不再是 live gate。

2026-08-12 的 Complexity Reset CR2.2 进一步 supersede 本文后续历史 delivery
records 中将 Narrative collaborator ports 描述为 private-brand zero-key handle、
`WeakMap` receiver binding、exact descriptor admission 或 cached-intrinsic call 的内部形状。
现行合同是：public definition/Web 输入与 tagged candidate-preflight result/snapshot
继续在 package boundary 严格准入；七个 package-internal ports 只在该边界检查
required callable，然后一次 normalize 为 frozen、保留同名 method 的普通 typed
record。Method closure 保留当时的 receiver/callable，后续直接调用且不重读
raw port。这一 supersession 不改变 target/frame/source revision、generation、
ready-active、semantic in-flight/one-shot attempt、listener/terminal fencing、atomicity
或 async currentness；历史段落及其当时验证记录不重写。

2026-08-12 的 Complexity Reset CR2.4 又进一步 supersede 本文后续历史 delivery
records 中要求 Narrative 或 WholeCanvas 分别接收 registry、admission authority、runtime
kernel、aggregate definition sidecars、schemas 与 slot descriptors，再用
descriptor/look-alike 或配置配对证明重新认证同源 factory output 的内部形状。现行合同是：
composition 为每个 application epoch 构造唯一 package-private typed kernel bundle；
Narrative 与 WholeCanvas 直接消费该 bundle，不重建平行 aggregate proof 或第二份配置
authority。Public Story definition/Web environment 仍在边界 validate and normalize once，
bundle construction 仍在任何 subscription/publication 前拒绝非法 epoch、duplicate owner/slot
或 definition catalog。Publisher lease、source revision、generation/currentness、CAS、
readiness、terminal teardown 与 late async-result fencing 均不变；历史段落及其当时验证记录
不重写。

2026-08-13 的 Complexity Reset CR2.5 supersede 本文后续历史 delivery records 中将全部
Narrative source-relative definition、schema 与 render-observation 实现限定在单个 giant family
文件的内部 ownership 描述。现行实现把 immutable family definition/schema 与 History
render observation 分别放入两个叶模块；package exports、Story/public input、publisher/session/
Dialogue Player/History-child/physical-action authority 与全部 currentness/atomicity fences不变。
需要共享 private lifecycle records 的 Dialogue、History child 与 Physical Action cluster 暂不强拆。
历史 exact-file scope 与当时验证记录不重写。

R3b.1、R4.0、R4a、R4b.0、R4b.1、R5、S4.0、S4.1a、S4.1b.0、S4.1b.1a、S4.1b.1b.0与
S4.1b.1b.1a、S4.1b.1b.1b.1、S4.1b.1b.1b.2a、S4.1b.1b.1b.2b.0与
S4.1b.1b.1b.2b.1a、S4.1b.1b.1b.2b.1b、S4.1b.1b.1b.2b.2a、
S4.1b.1b.1b.2b.2b.0、S4.1b.1b.1b.2b.2b.1、S4.1b.1b.1b.2b.3.0与
S4.1b.1b.1b.2b.3a、S4.1b.1b.1b.2b.3b.0、S4.1b.1b.1b.2b.3b.1与
S4.1b.1b.1b.2b.3c.0、S4.1b.1b.1b.2b.3c.1、S4.1b.1b.1b.2b.3d.0与
S4.1b.1b.1b.2b.3d.1、S4.2.0、S4.2.1、S4.2.2.0、S4.2.2.1、S4.2.2.2.0与
S4.2.2.2.1、S4.2.2.2.2、S4.2.3.0、S4.2.3.1、S4.2.3.2、S4.2.4.0、S4.2.4.1、S4.2.4.2、S4.2.4.3、S4.2.5.0、
S4.2.5.1a与S4.2.5.1b只作为completed
delivery/checkpoint保留；S4.1b.1b.1b.2b.3d、原S4.2、原S4.2.2与原S4.2.2.2 broad entry只作为已被细分的
历史checkpoint保留，原S4.2.5 broad checkpoint同样只作为已被`.5.0`细分的historical entry，原S4.2.5.1 broad implementation
checkpoint只作为已被`.5.1a`–`.5.1c`细分的historical entry。
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
单一 registry。Registry 必须覆盖 frozen resolved-owner domain，并以 live-lifetime exclusive
claim 的 injected monotonic lease-domain allocator 为 authority；同一个 allocator 不能同时由
第二个 live registry 使用，registry dispose 后释放 claim，successor 继续其 monotonic sequence。
同一 owner 在 exact registry 中同时最多有一个 current lease。Lease token 是
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
History open/close、player auto/skip/history/replay controls与typewriter/reveal本身不dispatch GameCommand、不推进
gameplay revision/CommandLog；root非active（包括History child或更高blocker使其suspended）时automatic semantic timers
不得推进剧情。使root suspended的同一个commit立即暂停controller、保存remaining deadline/cursor并撤销旧attempt；
History preparation failure/close或higher blocker removal让同一root重新active时按remaining恢复，不从full duration重启；
root replacement/empty/dispose直接取消。Timer callback与History/blocker transition经同一composition transition fence串行
first-wins，loser只能stale且zero dispatch。`NarrativeHistoryV1`继续是authoritative Save-backed backlog，seen/profile仍是
Host profile；二者都不是Surface lifecycle authority。

**S4.1b.1b.1b.1 delivery：** source-relative whole-composite authority现可为exact direct desired target捕获
authenticated ready-active proof；proof同时绑定application epoch、runtime instance、topology revision、publisher lease、
target occurrence/source revision与authority/coordinator identity。Capture与currentness check都要求该target仍是current
ready+active direct runtime、没有用retained predecessor替代active binding，并与Narrative bridge捕获的frame及semantic port保持
exact coherence；automatic path不依赖selected physical input owner，也不伪造gesture provenance。

每个Narrative bridge同时只允许一个live pause-expiry controller claim。Controller构造后以composition state listener监视
exact target/source/frame；replacement、empty、publisher dispose或root进入非active phase都会同步撤销该generation，controller
dispose只释放自身claim，旧controller不能清除fresh successor。若topology revision改变但同一Narrative root始终ready+active，
旧attempt因topology fence变为stale，而同一controller generation可签发fresh topology-bound attempt；若该变化曾使root
suspended，则旧generation已撤销，恢复active后必须建立fresh controller generation。

任意exact current ready+active direct Pause无论`skippable`为`true`或`false`都可签发automatic `resume` attempt；
`skippable`只约束manual physical resume。Attempt是frozen zero-key、same-controller one-shot capability；clone、foreign、repeat与
stale attempt均zero dispatch。Successful dispatch先不可逆地spend attempt，再完成最后一次exact ready-active、source/frame与
captured receiver/callable proof，随后提交冻结的`{ expectedOccurrenceId, resolution: { kind: "resume" } }`。Semantic callable
同步throw规范化为rejected completion `Promise`，不回滚attempt spend或composite state；reentry只能观察到spent attempt。

确定性10k controller/attempt rotation证明current listener/claim与attempt provenance保持有界，不保留强controller/attempt
history，也不改变source/runtime state或identity high-water。本delivery不读取clock、不创建timer，也不拥有deadline、remaining
duration/cursor或suspension scheduling；这些执行状态仍由S4.2的`DialoguePlayerController`拥有。它也没有接入Host、History、
live Story或新增public/internal barrel、package export。Custom physical payload admission现已由下述
S4.1b.1b.1b.2a delivery独立收口；Say的`ui.confirm`/`narrative.advance`、reveal-first与`advancePolicy`、
presentation-barrier acknowledgment及player-control policy继续保持stop，归S4.1b.1b.1b.2b裁决与实现。

S4.1b.1b.1b.1验证通过focused `7 files / 204 tests`、UI `79 files / 1022 tests`、full
`253 files / 3950 tests`与`deno task check` green。本批未重跑browser/examples/prebuilt；`101 / 101`、
`45 passed / 2 skipped`与`38 / 38`仅是先前已有证据，不冒充本批HEAD验证。

**S4.1b.1b.1b.2a custom physical payload delivery：** `narrative.custom`已有唯一closed
Base resolution形状`{ kind: "custom", payload }`，并由Base queue-front按current occurrence、pending kind与
Story-owned custom schema重新验证。Source-relative physical admission现以Host-owned narrow custom callback
floor签发attempt，而不接受raw `InteractionResolutionV1`：payload先经`parseInteractionResolutionV1`的custom
分支投影为detached、canonical-keyed、deep-frozen `StrictJsonObjectV1`。因为payload getter可以reenter或
dispose admission，parse后必须先重验same exact admission claim，再重新capture exact direct target、source revision、
admitted frame和captured semantic port；在mint前final check中上述target/source/frame/port与claim仍必须
exact current。旧admission不能在getter中dispose并安装fresh successor后为新authority签发attempt。

Attempt是frozen zero-key、same-admission one-shot capability。只有authenticated `narrative.custom`可在既有
Surface/publication/gesture fence后进入route；wrong/unmapped/cross-kind在spend前返回。正确route先不可逆地
spend attempt，再完成最后一次exact direct-target/source/frame/port proof才调用captured semantic receiver/
callable。Semantic callable的sync throw规范化为rejected completion `Promise`，不回滚attempt spend或Surface
state。Narrative module在payload getter前捕获exact `Object.freeze`，并用它冻结attempt、resolution、request与
dispatched result，使Base→UI handoff不能留下mutable action evidence。Story queue-front仍是custom payload的最终
schema authority；UI不预判Story-owned payload schema。

本delivery同时修正Base bounded interaction `StrictJsonObjectV1` projection：投影按canonical key order
保留enumerable `__proto__`、`constructor`与`prototype` own-data member，并使用module-initialization时
captured exact `Object.defineProperty`与`Object.freeze`完成member install和deep-freeze。Payload getter后续篡改
global intrinsic不能改变本次projection或留下mutable result。Ordinary maintained input的值、canonical bytes与
failure mapping保持不变；`InteractionResolutionV1` union、evaluator、queue语义、Save format/wire均未改变。

该admission authority不暴露给Story renderer；S4.2 Host只能把当次admission收窄为narrow bound
custom callback。本delivery不新增renderer-generation identity，不改变Base/generic Surface result或receipt，也不接
Host/live consumer。Say、barrier与player controls仍留在S4.1b.1b.1b.2b；S4.2不得在2b裁决前启动。

S4.1b.1b.1b.2a验证通过focused `8 files / 216 tests`、UI `79 files / 1028 tests`、full
`253 files / 3958 tests`、`deno task check` green、fresh Engine browser `101 / 101`、examples
`45 passed / 2 skipped`和prebuilt `38 / 38`。该checkpoint当时的active current/next均为
S4.1b.1b.1b.2b；后续顺序为
S4.1b.1b.1b.2b → S4.2 → S4.3 broad checkpoint（historical）→ S4.3.0（docs-only，已完成） → S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）。

**S4.1b.1b.1b.2b.0 remaining mapping policy adjudication（已完成）：** 旧Narrative UI只作为
characterization evidence；本合同现按下表冻结S4 V1的accepted policy，后续实现不得再从`VnLayerV1`、
`DialoguePanelV1`或Engine Lab的local writer择一复制：

| Path                       | Accepted V1 policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Say physical activation    | `ui.confirm`与`narrative.advance`是同一个activate-say alias。两者都必须先通过current Surface/Input/publication/gesture fence并绑定exact current Say frame与Host-owned reveal generation。入口捕获的reveal尚未完成时，该事件只调用exact `revealAll` capability并返回presentation handled，semantic attempt与Base dispatch均为零；入口已完成时才可签发one-shot physical Say attempt并提交`{ kind: "advance" }`。同一个事件只能二选一，不能在reveal callback后继续advance；reduced-motion初始即complete时首次activation可直接advance。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Say automatic and playback | `advancePolicy: "confirm"`表示player mode为normal时没有content-owned automatic advance；它不禁止用户显式Auto或Skip。`advancePolicy: "auto"`表示即使player mode为normal，也在全文reveal完成后等待current Host profile `autoWaitMs`并由controller attempt自动advance；manual activation仍可first-win。显式player Auto对两种policy都采用同一full-reveal + `autoWaitMs`规则。Skip优先于content/player auto：`skip_read`只越过seen Say，`skip_all`可越过unread Say，二者都可绕过reveal wait，但遇choice、pause、barrier或custom立即回到normal。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Barrier                    | `presentation_barrier`没有提交barrier completion/resolution的ordinary physical action；`.2b.3c.1`只可在共享physical admission上认证Auto/Skip并以family-local ignored收口，不读取或变更Stage/semantic authority。Publisher reconcile先接受desired target；随后与Narrative bridge/composite kernel同一composition authority、publisher lease及claim-once Stage authority才可原子arm proof并启动run。Stage的frozen zero-key proof只绑定exact Stage reconciler/Host generation、run occurrence、logical transition ID与presentation epoch；Narrative以同一composition claim另把该proof与application epoch、opaque authenticated target occurrence、semantic occurrence及full normalized `PendingInteractionV1` canonical bytes组合成target-level evidence。该composite evidence明确不绑定source revision、runtime instance或fresh candidate delivery snapshot，也不能从public acknowledgment字段或可复制target spelling事后重建；Stage模块不读取Narrative identity，同transition ID的foreign run不能复用。同步instant/reduced-motion terminal outcome只进入该target的单个O(1) current slot；candidate preparing/suspended时可以保存evidence但不能dispatch。Dispatch时才捕获并绑定current source revision、candidate frame/semantic port与runtime instance，并要求exact target/canonical pending ready-active且ingress open。Same-target readiness retry只有canonical pending bytes exact时可复用target-level evidence；replacement/semantic occurrence或canonical-byte变化、empty/application successor/dispose丢弃。Outcome `completed`、`skipped`与`interrupted`可one-shot提交exact `barrier_completed`；`cancelled`也terminal-seal该run proof但保持zero dispatch。 |
| Barrier recovery           | `loadRecovery: "settle"`只在barrier已存在于fresh presentation/controller generation时，于fresh Host ready-active且ingress open后用独立automatic recovery attempt完成，不重放旧visual edge；同一generation稍后新发布的barrier仍须等待真实Stage acknowledgment。这里的fresh generation只来自initial coherent bootstrap、composition-owned application successor或由`captureCurrentPresentationGenerationInternalV1()`证明的accepted higher Stage presentation epoch，React remount、StrictMode probe与effect/callback identity都不能触发settle。`loadRecovery: "replay"`继续可由Base解析，但S4 V1 UI在没有accepted replay capability前fail closed：保持barrier pending、zero semantic dispatch并返回once-per exact target/generation的source-relative `narrative.barrier_replay_unsupported` result。Headless/Agent trusted semantic adapter继按Base occurrence + transition ID直接完成，不被UI proof反向扩张。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Player Auto/Skip           | Playback mode是composition/application bridge-owned、single-writer transient `normal \| auto \| skip`，不写PlayerProfile、Game Save、GameCommand或CommandLog；同一mode的toggle回到normal，另一mode的toggle原子切换。S4.2 Host/`DialoguePlayerController`只消费该mode并拥有scheduling、remaining与transition coordination，不建立第二mode writer。Mode可跨连续Say与暂时root suspension保留；suspension在同一commit保存remaining deadline/cursor并撤销attempt，恢复用fresh generation继续remaining。新non-Say boundary、empty、epoch/lease successor或dispose使mode回normal并取消旧timer/attempt。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| History                    | 只有current ready+active Dialogue root且read-only availability为true时，`player.toggle_history`才发布Coordinator exact-parent History child intent；active History的`player.toggle_history`或`ui.cancel`关闭该exact child并restore opener。Unavailable返回family-local ignored/zero topology；因为action已由static managed catalog认证，Input仍consumed且不向lower context fall through。没有React-local boolean。History prepare/active使root suspended，因此沿用上述pause/resume语义。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Voice replay               | `player.replay_voice`只在exact current ready+active Say可用。Candidate preflight把optional voice adapter收窄为descriptor-captured exact receiver与own-data callable `replayCurrentVoiceInternalV1(): boolean`，route时不重新读取caller object；`true`为handled，absent/`false`为family-local ignored，proof/callback drift为stale，throw为family-local faulted，均不形成semantic resolution。因为该action已由static managed catalog认证，四种outcome的Input route都保持consumed，不向lower context fall through。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| UI visibility              | `player.toggle_ui`从Narrative V1 managed definition action catalog移除；该隐藏能力defer，generic input action ID可保留，但S4不得接入它。除非未来先冻结一个始终visible、focusable且同authority-owned的show affordance，否则blocking、owns-focus、trap root不能进入fully hidden状态。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

Replay unsupported的source-relative closed row是exact frozen
`{ kind: "unsupported", code: "narrative.barrier_replay_unsupported", completion: null }`。每个exact
target/generation只安装一个result identity并至多通知一次；repeat read复用identity且zero notify，state/source/runtime/
topology/semantic dispatch全部保持exact zero。

Physical Say事件的ordered fence是application/terminal与global stable coherence → Surface topology/instance/input owner/
routing lease/action catalog → input publication与gesture复验 → exact current Say target/source/frame/reveal generation →
captured reveal phase/action mapping → one-shot spend → final target/frame/semantic port proof → semantic call。Automatic
Say与Barrier recovery使用ready-active proof + controller generation而没有gesture字段；Stage acknowledgment另需exact
run occurrence proof。Manual、timer、skip、History/blocker与Stage callback都经同一个composition transition fence
串行first-wins；loser只能stale且zero dispatch。Root暂时suspended暂停并保存remaining；old attempt立即失效。
Replacement取消旧occurrence的timer/reveal/ack capability，但若successor仍是Say，持久player Auto/Skip mode可按fresh
frame继续；empty、fresh application/publisher lease或dispose全部取消并回normal。

Candidate preparing、blocking fallback、readiness gap与retained predecessor都不得启动或继续reveal/auto/skip clock；
只有exact direct root ready-active后才可运行。Suspension commit保存integer reveal cursor、sub-character time remainder，
以及auto/skip的`max(0, deadline - now)`；resume必须用fresh controller generation/attempt从remaining继续，remaining为
zero也只在完整successor安装并通知后由next clock tick触发，不能在topology transition内同步dispatch。Source replacement
立即冻结retained predecessor controller；Say successor ready后可保留player mode，但必须按fresh frame重建reveal/timer。
现有`TextRevealV1`没有该pause/resume合同，S4.2不得把它原样当成accepted controller。

同一Say boundary的manual、content/player auto与skip共享一个package-internal in-flight claim；Barrier则由
target-level evidence拥有独立single-dispatch claim，不把claim绑到短命source/frame/controller。Winner在调用
semantic port前原子seal，Promise pending期间全部competitor和Barrier flush都zero dispatch。Sync throw规范化为
rejected Promise而不回滚claim或Surface。Dispatch wrapper在向controller暴露completion settlement前必须drain该调用
已经触发的semantic publication与Narrative bridge reconcile，随后只以exact claim token做CAS清理。Say继续按
exact controller/source/frame释放或退役；Barrier若exact target、semantic occurrence与canonical pending仍current，则只把
evidence恢复为retained，后续一次显式flush再fresh-capture source/frame/port/proof，不在settlement stack里自动重试。
若target/canonical已退役，completion只清理bounded tombstone而不复活evidence；old completion不能ABA-clear
successor token。Resolved/rejected completion都不检查opaque Story result。实现若不能证明completion前publication
drain ordering，就必须停止，不能永久seal无commit边界或冒险重复dispatch。

该adjudication只改变accepted target contract与linear execution order，没有runtime source、test、Host、React/Web或
live Story claimant，也不声称上述路径已实现。它不新增raw renderer authority、public/`./internal` barrel、package
export、generic stable/action result code、receipt或universal envelope；不改变Base interaction union/evaluator/queue、
PlayerProfile preference format、Save/Persistence/canonical/digest/replay/wire或S4b。实现顺序固定为
S4.1b.1b.1b.2b.1a physical Say reveal-first admission →
S4.1b.1b.1b.2b.1b content-auto Say controller-attempt floor →
S4.1b.1b.1b.2b.2a normal Stage→Narrative acknowledgment vertical →
S4.1b.1b.1b.2b.2b.0 recovery generation admission entry amendment（已完成）→
S4.1b.1b.1b.2b.2b.1 settle/replay recovery implementation（已完成）→
S4.1b.1b.1b.2b.3.0 player-controls execution split（docs-only，已完成）→
S4.1b.1b.1b.2b.3a toggle-ui Narrative catalog corrective（已完成）→
S4.1b.1b.1b.2b.3b voice replay physical route（已细分的历史checkpoint）→
S4.1b.1b.1b.2b.3b.0 voice replay entry contract（docs-only，已完成）→
S4.1b.1b.1b.2b.3b.1 voice replay physical route implementation（已完成）→
S4.1b.1b.1b.2b.3c bridge-owned Auto/Skip transient mode floor（已细分的历史checkpoint）→
S4.1b.1b.1b.2b.3c.0 bridge-owned Auto/Skip entry contract（docs-only，已完成）→
S4.1b.1b.1b.2b.3c.1 bridge-owned Auto/Skip transient mode implementation（已完成）→
S4.1b.1b.1b.2b.3d History exact-parent open intent floor（已细分的历史checkpoint）→
S4.1b.1b.1b.2b.3d.0 History exact-parent open intent entry contract（docs-only，已完成）→
S4.1b.1b.1b.2b.3d.1 History exact-parent open intent implementation（已完成）→
S4.2.0 docs-only exact execution split（已完成）→ S4.2.1 History intent redemption +
stable-parent transient-child preparation（已完成）→ S4.2.2 broad checkpoint（已由`.2.2.0`细分）→
S4.2.2.0 docs-only exact entry（已完成）→ S4.2.2.1 DOM-free Narrative session/readiness attachment floor（已完成）→
S4.2.2.2 broad Host checkpoint（已由`.2.2.2.0`细分）→ S4.2.2.2.0 docs-only exact entry（已完成）→
S4.2.2.2.1 DOM-free generic Host-commit atomic substrate（已完成）→ S4.2.2.2.2 dormant Narrative React Host（已完成）→
S4.2.3.0 History close/dismiss/input/focus exact-entry contract（docs-only，已完成）→
S4.2.3.1 DOM-free generic exact History-child lifecycle substrate（已完成）→
S4.2.3.2 dormant Narrative close/input/root + History focus Host lifecycle（已完成）→
S4.2.4.0 exact Dialogue player timing/suspension entry（docs-only，已完成）→
S4.2.4.1 generic prepared state-install participant substrate（已完成）→
S4.2.4.2 DOM-free Narrative DialoguePlayerController core（已完成）→
S4.2.4.3 dormant Host player-view integration（已完成）→ S4.2.5 broad checkpoint（已由`.5.0`细分的historical entry）→
S4.2.5.0 dormant Engine Lab Narrative conformance exact entry correction（docs-only，已完成）→
S4.2.5.1 broad implementation checkpoint（已由`.5.1a`–`.5.1c`细分的historical entry）→
S4.2.5.1a managed InputRouter facade corrective（已完成）→ S4.2.5.1b Host physical ingress corrective（已完成）→
S4.2.5.1c dormant Engine Lab Narrative conformance implementation（已完成）→ S4.3 broad checkpoint（historical） → S4.3.0（docs-only，已完成） → S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）。
若Say需要把raw reveal/controller authority交给renderer、Barrier replay
必须在没有exact replay descriptor/capability时推进、player control要求fully hidden focus-trapped root，或任一路径要求
扩大generic/public receipt/result，立即停止并修订合同。

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
projection与candidate preflight；S4.1b.0 shared contract-bound physical route core与stable input authority；
S4.1b.1a authenticated action continuation context corrective；S4.1b.1b.0 choice-only authenticated physical
semantic action admission；S4.1b.1b.1a skippable-pause physical resume；S4.1b.1b.1b.1 automatic pause-expiry
controller-attempt admission/dispatch floor；S4.1b.1b.1b.2a custom physical payload admission（已完成）；
S4.1b.1b.1b.2b.0 remaining mapping policy adjudication（已完成）；
S4.1b.1b.1b.2b.1a physical Say reveal-first admission（已完成）；
S4.1b.1b.1b.2b.1b content-auto Say controller-attempt floor（已完成）；
S4.1b.1b.1b.2b.2a normal Stage→Narrative acknowledgment vertical（已完成）；
S4.1b.1b.1b.2b.2b.0 recovery generation admission entry amendment（docs-only，已完成）；
S4.1b.1b.1b.2b.2b.1 settle/replay recovery implementation（已完成）；
S4.1b.1b.1b.2b.3 aggregate player controls（superseded checkpoint）；
S4.1b.1b.1b.2b.3.0 player-controls execution split（docs-only，已完成）；
S4.1b.1b.1b.2b.3a toggle-ui Narrative catalog corrective（已完成）；
S4.1b.1b.1b.2b.3b voice replay physical route（已细分的历史checkpoint）；
S4.1b.1b.1b.2b.3b.0 voice replay entry contract（docs-only，已完成）；
S4.1b.1b.1b.2b.3b.1 voice replay physical route implementation（已完成）；
S4.1b.1b.1b.2b.3c bridge-owned Auto/Skip transient mode floor（已细分的历史checkpoint）；
S4.1b.1b.1b.2b.3c.0 bridge-owned Auto/Skip entry contract（docs-only，已完成）；
S4.1b.1b.1b.2b.3c.1 bridge-owned Auto/Skip transient mode implementation（已完成）；
S4.1b.1b.1b.2b.3d History exact-parent open intent floor（已细分的历史checkpoint）；
S4.1b.1b.1b.2b.3d.0 History exact-parent open intent entry contract（docs-only，已完成）；
S4.1b.1b.1b.2b.3d.1 History exact-parent open intent implementation（已完成）；S4.2 broad entry
只作superseded historical checkpoint；S4.2.0 exact execution split（docs-only，已完成）；S4.2.1
History intent redemption + stable-parent transient-child preparation（已完成）；S4.2.2 broad checkpoint已由
S4.2.2.0 exact entry细分，S4.2.2.1也已交付DOM-free Narrative session/readiness attachment floor；原S4.2.2.2
broad Host checkpoint又已由S4.2.2.2.0 exact entry细分，S4.2.2.2.1 DOM-free generic Host-commit atomic substrate
也已交付，S4.2.2.2.2 dormant Narrative React Host也已交付root + History Host-commit readiness，
S4.2.3.0又已冻结close/input/focus exact entry，S4.2.3.1已交付DOM-free generic lifecycle substrate，S4.2.3.2也已交付dormant
Narrative close/input/root + History focus Host lifecycle；原S4.2.4 broad checkpoint已由completed docs-only `.4.0`重切，
S4.2.4.1 generic prepared state-install participant substrate、`.4.2` DOM-free controller core与`.4.3` dormant Host
player-view integration现也均已交付；原S4.2.5 broad checkpoint已由completed `.5.0` exact entry细分并转为historical，原`.5.1`也已由
`.5.1a`–`.5.1c`细分并转为historical；S4.2.5.1a managed InputRouter facade corrective与S4.2.5.1b Host physical ingress corrective现均已完成，
S4.3.1a与S4.3.1b也已依次交付并转为historical，当前进入PF5/M3 Save migration product surface（当前）；
原broad S4.3已由`.3.0`重切；实际tracked consumer迁移、旧writer删除与headless/browser/prebuilt promotion只在`.3.1b`的一个
atomic cutover中发生。若exact-parent
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

**S4.1b.0 delivery：** 已将transient action adapter底层提取为同一package-internal、source-relative
contract-bound route core；现有Coordinator adapter继续通过该core保持六字段action envelope、input publication、
physical gesture双检、managed-gate优先级、direct untagged fallthrough及既有Surface/Input receipt语义。Same
authority与value-equal contract复用exact binding、registration及publication revision，foreign authority在任何
replacement registration前fail closed；authenticated claim只在exact `unchanged / surface.action_routed`、current
publication与current physical gesture全部通过后执行一次owner continuation，stale/unpublished/dispose/reentry与
continuation throw均不落入ordinary lower handler。

同一composite kernel现提供whole-topology selected stable input authority：它从shared transient+stable phase
projection选择最高current active managed owner，不从单独stable列表或transient publication猜测所有权。Current
direct ready target产生绑定exact authority/kernel/application epoch/topology/instance/admitted target（含publisher
lease与occurrence）/source revision的opaque weak proof；source advance、replacement、foreign/clone/ABA与terminal
successor均使旧proof失效。Retained predecessor仍可保留exact current physical binding与既有route receipt，但返回
`directTarget/sourceRevision/targetProof = null`，因此不能冒充current semantic source。Route receipt严格沿用
application epoch → topology revision → instance → whole-topology input owner → routing lease → action catalog
precedence，所有capture、proof check与route结果均为zero state/topology/notification mutation。

本切片没有定义或调用Narrative semantic dispatch port，没有建立`actionId`到current pending kind/resolution的映射，
也没有接入automatic controller-attempt、Narrative Host、History child、public/internal barrel或live family。
S4.1b.1开始RED前必须先冻结package-internal semantic port的exact callable/result边界，以及每个Narrative
`actionId`对各类normalized `PendingInteractionV1`的允许resolution与rejection mapping；不得把opaque candidate
port identity、physical gesture receipt或automatic attempt伪装为该semantic合同。

S4.1b.0验证通过focused `7 files / 172 tests`、UI `79 files / 999 tests`、full
`253 files / 3927 tests`、`deno task check` green、engine browser `101 / 101`、examples
`45 passed / 2 skipped`与prebuilt `38 / 38`。该checkpoint当时的active current/next为S4.1b.1，现由下述
S4.1b.1a delivery细分并取代。

**S4.1b.1a delivery：** Claimed action continuation不再只接收caller提供的opaque attempt；shared route gate只在
exact Surface route、input publication与physical gesture全部通过后，构造并冻结exact
`{ actionId, attempt }` continuation input。`actionId`来自已解析且通过action catalog的authenticated envelope，
`attempt`保持caller的exact identity且不被读取、复制或解释；attempt内伪造的action ID不能覆盖authenticated
action ID。Stale/rejected/faulted route、direct untagged input、unclaimed binding、dispose、同步reentry与consumer throw
仍保持S4.1b.0既有结果、fallthrough与fence-release语义。

本corrective没有定义Narrative action-to-resolution mapping、semantic dispatch callable或automatic controller attempt，
也没有新增non-test claimant、Narrative/React/Web ingress、public/internal barrel或package export。Semantic callable不会作为
raw `{ expectedOccurrenceId, resolution }` ingress提前暴露；S4.1b.1b必须先冻结closed mapping/proof authority，再以同authority
签发的proof调用exact captured receiver/callable。验证通过focused `7 files / 172 tests`、UI
`79 files / 999 tests`、full `253 files / 3927 tests`与`deno task check` green。本批没有改变browser/build graph，
因此未机械重跑browser/examples/prebuilt；S4.1b.0的`101 / 101`、`45 passed / 2 skipped`与`38 / 38`只作最近已有证据。
该checkpoint当时的active current/next为S4.1b.1b，现由下述S4.1b.1b.0 delivery继续细分。

**S4.1b.1b.0 delivery：** Narrative candidate preflight现将required semantic dispatch port限定为exact
one-key own data-descriptor callable，并把exact receiver/callable存入package-private weak binding；candidate snapshot只持有
frozen zero-key opaque capture handle，不暴露raw port或可替换method。Physical action admission不接受caller提供的stable
authority，而是从bridge-private record取得same-composite kernel并领取whole-topology stable action authority；同一bridge
同时只允许一个live admission claim，dispose释放exact claim后successor admission可以重新领取。

只有current direct ready+active choice target、同一admission签发且未消费的opaque choice attempt、以及完整通过
Surface/input/publication/gesture fence的authenticated `narrative.choose`能够dispatch。Attempt以WeakMap绑定exact
authority、target proof、direct target、source revision、admitted frame、choice ID与captured port；成功路径构造并冻结
`{ expectedOccurrenceId, resolution: { kind: "choose", choiceId } }`，以捕获的exact receiver/callable调用semantic port。
Attempt是frozen zero-key、same-admission one-shot capability；clone、repeat、source advance、replacement、retained-only、
suspended与dispose均不能dispatch或落入lower ordinary handler。

Choice admission的source-relative结果保持closed：successful dispatch返回`dispatched`与exact completion `Promise`；
authenticated但不属于choice mapping的action返回`unmapped`，stale proof/attempt返回`stale`，private capture invariant失败返回
`faulted`，后三者的completion均为`null`。Semantic callable同步throw被转换为rejected completion `Promise`，不回滚已完成的
Surface route；raw claimed route、Surface/Input fence failure、reentry与duplicate live construction都不会产生semantic dispatch。

本切片没有实现`say`、`pause`、`custom`、`presentation_barrier`或player control mapping，没有automatic controller-attempt、
Narrative Host/History/live consumer，也没有修改generic stable/action result table、public/internal barrel或package exports。
这些remaining路径现由S4.1b.1b.1a、S4.1b.1b.1b.1、S4.1b.1b.1b.2a与S4.1b.1b.1b.2b
依次收口；Host、readiness与live cutover仍属于S4.2–S4.3。

S4.1b.1b.0验证通过focused `7 files / 187 tests`、UI `79 files / 1005 tests`、full
`253 files / 3933 tests`与`deno task check` green。本批尚未重跑browser/examples/prebuilt；最近已有的`101 / 101`、
`45 passed / 2 skipped`与`38 / 38`仅作先前切片证据，不冒充S4.1b.1b.0 HEAD验证。
该checkpoint当时的active current/next为S4.1b.1b.1，现由下述S4.1b.1b.1a delivery继续细分。

**S4.1b.1b.1a delivery：** 同一个source-relative physical admission现在允许任意current direct
ready+active pause持有exact one live contract-bound binding，但只有full normalized pending明确声明`skippable: true`时才签发
frozen zero-key pause-resume attempt；non-skippable pause没有semantic resume capability，preparing、retained-only或suspended
target仍不能建立current admission。Choice与pause token共用一个package-private discriminated WeakMap record，分别绑定exact
authority、direct-target proof、source revision、admitted frame与captured semantic port，不新增强引用attempt history或第二份
lifecycle authority。

Shared continuation先从authenticated action ID推导closed attempt kind；`ui.confirm`、`narrative.advance`及其他unmapped action在
读取或消费token前返回`unmapped`，mapped cross-kind、clone、foreign、repeat与stale token也不会烧掉另一个合法capability。
只有authenticated `narrative.resume`与same-admission、unspent pause token完全匹配，且target/source/frame/port仍exact current、
pause仍skippable时，才构造并冻结`{ expectedOccurrenceId, resolution: { kind: "resume" } }`，以S4.1a捕获的exact
receiver/callable dispatch。Semantic callable同步throw继续规范化为rejected completion `Promise`，不回滚已完成的Surface route
或改变composite state；source replacement、suspension、dispose、stale gesture与重复调用均保持semantic dispatch为zero。

本切片没有实现automatic controller-attempt、say advance/reveal policy、custom payload、presentation-barrier proof或player
controls，没有接Narrative Host/History/live consumer，也没有扩张public/internal barrel、package export、generic stable/action
result table或receipt。Automatic pause-expiry floor后续已由S4.1b.1b.1b.1交付，custom payload又由
S4.1b.1b.1b.2a交付；其余mapping stop归S4.1b.1b.1b.2b，Host/timer与live cutover仍由S4.2–S4.3拥有。

S4.1b.1b.1a验证通过focused `7 files / 192 tests`、UI `79 files / 1010 tests`、full
`253 files / 3938 tests`与`deno task check` green。本批未重跑browser/examples/prebuilt；`101 / 101`、
`45 passed / 2 skipped`与`38 / 38`仅是先前已有证据，不冒充本批HEAD验证。
该checkpoint当时的current/next是S4.1b.1b.1b.2a；现已由上述.2a delivery推进。
Active current/next、core slice与direct RED/implementation gate现均为PF5/M3 Save migration product surface（当前）；
后续顺序保持S4.3.0（docs-only，已完成） → S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）。

**S4.1b.1b.1b.2b.1 execution-order amendment：** Say先拆成两个vertical。`.1a`沿用既有
composition-owned physical admission交付两种alias的reveal-first路径：Host提供一个exact plain-data
reveal-generation port，只有own-data callable `capturePhaseInternalV1(): "incomplete" | "complete"`与
`revealAllInternalV1(): void`；factory在任何attempt issuance前descriptor-capture exact receiver/callables，
renderer只能得到当次bound activation callback，不能持有raw port、admission、gesture或envelope minting authority。
`incomplete` attempt通过Surface/Input/publication/gesture与current Say frame/generation fence后只调用一次captured
`revealAll`并返回exact frozen `{ kind: "revealed", completion: null }`；`complete` attempt才提交one-shot
`advance`并返回既有`dispatched` completion。入口phase只读取一次，reveal callback即使同步变成complete，同一事件也不得
继续advance；reduced-motion初始complete自然走advance row。

Reveal generation与single in-flight不属于可替换的physical admission：bridge-private
`sayRevealControllerClaim`按exact current Say target/source/frame单独claim，拥有captured receiver/callables与exact
dispatch-claim token。Source/frame漂移、suspend、empty、publisher/Coordinator dispose撤销controller；仅改变topology或
InputRouter binding且root仍ready-active时保留同一controller/claim。Physical admission只借用该exact controller，可独立
dispose/recreate；old admission/token不能清除或作用于fresh controller。`.1b`复用同一controller record，不创建第二authority。

Attempt issuance只验证并绑定exact admission/controller/target/source/frame，不读取phase；失败返回`null`且mint zero。
Route完成generic Surface/Input/publication/gesture fence、alias/token mapping与controller currentness后，先取得exact controller
boundary gate并spend activation token，再且只再调用一次captured `capturePhase`。Callback返回或throw后先重验exact
controller/admission/target/source/frame：若已漂移则`stale/null`优先；仍current时phase throw或非
`incomplete | complete`才返回`faulted/null`。Incomplete row调用一次captured `revealAll`，随后再次重验；漂移为
`stale/null`，仍current的throw为`faulted/null`，success为`revealed/null`。这些路径semantic dispatch均为零且不安装
semantic in-flight claim；complete row才把同一boundary gate原子转为per-frame semantic in-flight并提交call。Callback
reentry与pending competitor均为stale/zero dispatch。现有captured one-key
`dispatchResolutionInternalV1(): Promise<unknown>`不扩shape，但其source-relative composition-adapter合同收紧为：
返回Promise只能在该调用触发的semantic publication与对应Narrative bridge reconcile全部drain后settle。Family以该
post-drain settlement包装completion；settlement前若exact source/frame已变化则claim随旧generation退役，仍exact current才
释放并允许fresh manual attempt，resolved/rejected都不解释opaque Story result。S4.2必须用真实adapter证明该ordering；若不能，
立即停止，不能提前释放或永久seal。

`.1b`随后只交付`advancePolicy: "auto"`的ready-active、无 gesture 的 content-auto controller-attempt floor，并复用同一
generation/in-flight claim；它不读取clock、不创建timer/deadline、不实现player Auto/Skip。Player Auto/Skip现由已交付的
`.2b.3c.1` mode authority拥有，实际scheduling与suspend remaining仍归S4.2。本amendment只调整execution order与exact
source-relative result/Promise boundary，没有source/test/runtime/live claimant、public/barrel或generic result变更。

**S4.1b.1b.1b.2b.1a physical Say reveal-first delivery：** Narrative family现为exact current
Say frame建立独立的per-frame reveal controller claim；它与可替换的composition-owned physical admission
不是同一个authority。Controller descriptor-capture exact phase/reveal receiver与callable，physical admission只为
`ui.confirm`和`narrative.advance`两个activate-say alias签发绑定该generation的opaque attempt；替换或dispose
physical admission不会绕过或清除仍current的controller gate，controller dispose后也可由同一bridge/router建立fresh
successor admission。

Route仍先经过shared Surface/Input/publication/gesture proof，再以bridge-private callback gate完成phase/reveal
first-wins。Phase或reveal callback中的同步reentry若使controller、admission、target、source或frame漂移，结果固定为
`stale`并优先于callback throw/fault；exact current incomplete只reveal且semantic dispatch为零，exact current complete
才把callback gate转成交给该frame的single semantic in-flight claim并提交`advance`。Same-frame blocking suspension会
撤销ready-active controller与attempt，但保留该pending semantic claim及其bounded lifecycle observer；resume后在旧completion
settle前不能建立竞争boundary。Source/frame漂移则退休旧claim；旧completion只以exact claim identity CAS释放自身，不能
清除fresh successor claim。Resolve、reject与sync throw归一化为Promise completion，并都在completion向caller暴露前完成
该调用已经触发的semantic publication及同步Narrative bridge reconcile drain、exact claim释放与inactive observer回收。

本delivery仍是source-relative/dormant family floor：没有接入live Host/renderer，没有新增public/barrel或generic
Managed Surface result，也没有实现content-auto、clock、timer、deadline、player Auto/Skip、barrier或History。
S4.1b.1b.1b.2b.1a验证通过focused `7 files / 226 tests`、UI `79 files / 1044 tests`、full
`253 files / 3974 tests`与`deno task check` green。本批未重跑browser/examples/prebuilt；`101 / 101`、
`45 passed / 2 skipped`与`38 / 38`仅为先前已有证据，不冒充本批HEAD验证。该checkpoint当时的active
current/next均为S4.1b.1b.1b.2b.1b content-auto Say controller-attempt floor，现由下述delivery推进。

**S4.1b.1b.1b.2b.1b entry amendment（docs-only）：** content-auto沿用上述exact per-frame Say reveal
controller record与shared callback/semantic in-flight claim，不建立第二个controller、route authority或input
binding。Source-relative opaque attempt固定命名为
`NarrativeStableSayContentAutoAttemptInternalV1`；现有
`NarrativeStableSayRevealControllerInternalV1`只新增
`issueContentAutoAttemptInternalV1(): NarrativeStableSayContentAutoAttemptInternalV1 | null`与
`dispatchContentAutoInternalV1(attempt: unknown): NarrativeStableSayContentAutoDispatchResultInternalV1`。
后者是exact frozen source-relative union：`dispatched`携带post-drain `Promise` completion，`not_ready`、
`stale`与`faulted`均携带`completion: null`。这些类型与方法不进入public/`./internal` barrel、package export
或generic Managed Surface action/result contract。

Issue保持phase-free：它只接受`advancePolicy: "auto"`的exact current direct Say target/source/frame，取得
fresh ready-active target proof，要求controller/generation仍current、shared callback与semantic in-flight均为空，
并至多保留一个current automatic attempt。它不读取reveal phase，也不依赖whole-topology input owner、
physical admission、gesture、clock、Host profile或timer；失败返回`null`且mint zero。Automatic attempt使用
frozen zero-key identity与source-relative WeakMap provenance，绑定exact controller claim、target、source、frame、
semantic port及该次fresh ready-active proof。旧proof、clone、foreign、repeat、suspended/preparing/retained target、
source/frame successor、empty或dispose均不得成为current attempt。

Dispatch先以exact receiver/attempt/controller与fresh ready-active proof取得同一bridge callback gate，再不可逆
spend attempt，随后且只随后调用一次captured `capturePhaseInternalV1`。Callback返回或throw后先重验exact
controller/target/source/frame/semantic port与ready-active proof：任一漂移固定为`stale/null`并优先于callback
invalid/throw；exact-current `incomplete`返回`not_ready/null`，不调用`revealAllInternalV1`且semantic dispatch为零；
exact-current throw或非`incomplete | complete`返回`faulted/null`。只有exact-current `complete`才把callback gate
原子转换为现有per-frame semantic in-flight claim、final-recheck exact frame/port，并提交同一个frozen
`{ kind: "advance" }` semantic request；sync throw仍规范化为rejected post-drain completion，不回滚spend或claim。

Manual activation与content-auto可以各自预签一个bounded attempt，但二者共享一个first-wins callback/in-flight
boundary：任一方先取得gate时必须同步retire另一方尚未spend的attempt；Promise pending期间不能签发或dispatch
competitor，旧attempt与旧completion也不能ABA作用于fresh controller/source claim。Completion仍沿用`.1a`的
publication + synchronous Narrative reconcile drain与exact-token CAS释放合同。该entry amendment不实现clock、
`autoWaitMs`、deadline、player Auto/Skip、Host/React/live claimant，也不改变Base、Save/Persistence、canonical、
digest、replay或wire；该checkpoint当时保持S4.1b.1b.1b.2b.1b为current/next，现由下述delivery关闭。

**S4.1b.1b.1b.2b.1b content-auto Say controller-attempt delivery：** 现有exact per-frame Say reveal
controller新增source-relative content-auto issue/dispatch，但没有建立第二个controller、route authority、input
binding或semantic in-flight claim。`issueContentAutoAttemptInternalV1`只为`advancePolicy: "auto"`的exact current
direct Say取得fresh ready-active proof并至多保留一个frozen zero-key WeakMap attempt；它保持phase-free，不依赖
whole-topology input owner或physical admission，也不读取gesture、player profile、presentation clock或Host callback。
Topology revision变化使old proof stale；root仍ready-active时同一controller可签发fresh proof，真实blocking suspension、
source/frame replacement、empty与dispose则撤销generation并要求fresh controller。

`dispatchContentAutoInternalV1`以exact receiver/controller/attempt/proof取得shared callback gate，先不可逆spend并
retire尚未spend的manual competitor，再读取一次captured phase并postcheck exact controller/target/source/frame/port。
Drift固定优先返回frozen `stale/null`；exact-current `incomplete`返回`not_ready/null`且不调用`revealAll`；
exact-current throw或invalid返回`faulted/null`；只有exact-current `complete`才转为shared semantic in-flight、
final-recheck并提交frozen `advance` request，返回`dispatched` post-drain Promise。Physical Say route取得同一gate时也
reciprocal retire content-auto competitor；双方可预签但只能first-win，`not_ready`与`faulted`也不会使已退休manual
attempt复活。

Manual与content-auto共用`.1a`已经证明的Promise drain、same-frame suspension observer与exact-token CAS释放。Source
successor可在old completion pending时建立fresh claim，old completion不能ABA清除successor；clone、foreign、wrong
receiver、repeat与stale proof全部在phase前fail closed。Private provenance只增加一个WeakMap record与一个current strong
slot；`10k`次`not_ready` rotation复用exact frozen result identity且不增长composite state或notification count。

本delivery仍是source-relative/dormant floor：没有clock、timer、`autoWaitMs`、deadline、player Auto/Skip、
Host/React/live claimant，也没有新增public/`./internal` barrel、package export或generic Surface action/result。
验证通过focused `7 files / 236 tests`、UI `79 files / 1054 tests`、full `253 files / 3984 tests`与
`deno task check` green。本批未重跑browser/examples/prebuilt；Engine browser `101 / 101`、examples
`45 passed / 2 skipped`与prebuilt Player `38 / 38`仅为prior evidence，不冒充本批HEAD验证。
S4.1b.1b.1b.2b.1b已完成；该checkpoint的current/next推进为
S4.1b.1b.1b.2b.2a normal Stage→Narrative acknowledgment；该切片已由下述delivery关闭，当前又经
`.2b.2b.0` docs checkpoint与`.2b.2b.1` delivery推进到`.2b.3` aggregate player-controls checkpoint；该aggregate
现由`.2b.3.0` execution split supersede。

**S4.1b.1b.1b.2b.2 entry amendment（历史checkpoint）：** Barrier先拆为
S4.1b.1b.1b.2b.2a normal Stage→Narrative acknowledgment vertical，再做
S4.1b.1b.1b.2b.2b settle/replay recovery（现已细分为`.2b.2b.0` docs checkpoint与`.2b.2b.1`
implementation）；两者完成后才进入S4.1b.1b.1b.2b.3
aggregate player controls；该aggregate checkpoint现由`.2b.3.0` execution split supersede。该checkpoint当时只冻结
source-relative合同，没有runtime、test、Host/live claimant或delivery evidence；
现已由下述`.2b.2a` delivery部分关闭。

`.2b.2a`先为exact `StageReconcilerV1`建立claim-once、package-internal
`StageAcknowledgedRunAuthorityInternalV1`。`claimStageAcknowledgedRunAuthorityInternalV1(reconciler,
exactClaimant)`把reconciler/Host generation绑定到一个exact claimant；同claimant重复claim复用同一authority，foreign、clone或
wrong receiver fail closed。Claim成功后，`retarget`、`skipAll`、`suspend`、`resume`与`dispose`等所有mutation entry只能经
该exact authority；raw public mutation method保持现有shape但在post-claim调用时zero mutation。Public `frame`与
`subscribe`继续是read-only observation，未被claim的ordinary public reconciler路径保持byte-for-byte既有行为。
Authority以显式`retargetInternalV1`、`skipAllInternalV1`、`suspendInternalV1`、`resumeInternalV1`与
`disposeInternalV1`保留这些mutation，并额外提供：

```ts
retargetWithAcknowledgedRunInternalV1(input: {
  readonly retarget: StageRetargetInputV1;
  readonly expectedTransitionId: string;
  readonly commitGuard: StageAcknowledgedRunCommitGuardInternalV1;
  readonly terminalPort: StageAcknowledgedRunTerminalPortInternalV1;
}): StageAcknowledgedRunRetargetResultInternalV1;

isAcknowledgedRunTerminalStackActiveInternalV1(
  proof: unknown,
): boolean;
```

`StageAcknowledgedRunProofInternalV1`是frozen zero-key opaque capability；
`StageAcknowledgedRunCommitGuardInternalV1`与`StageAcknowledgedRunTerminalPortInternalV1`都只接受descriptor-captured
exact own-data receiver/callable。Guard由Narrative controller私有创建，只向Stage返回boolean currentness，不暴露
target/canonical/generation identity。两个port的exact one-method shape分别是
`isCommitCurrentInternalV1(): boolean`与
`deliverTerminalInternalV1(input: Readonly<{ proof: StageAcknowledgedRunProofInternalV1;
outcome: PresentationRunOutcomeV1 }>): void`；terminal input是frozen exact `{ proof, outcome }`。Stage retarget result也是
frozen exact record，并固定为：

```ts
type StageAcknowledgedRunRetargetResultInternalV1 =
  | Readonly<{
    readonly kind: "armed";
    readonly proof: StageAcknowledgedRunProofInternalV1;
  }>
  | Readonly<{
    readonly kind: "stale";
    readonly proof: null;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly code:
      | "stage.acknowledged_run_unmatched"
      | "stage.acknowledged_run_ambiguous"
      | "stage.acknowledged_run_faulted";
    readonly proof: null;
  }>;
```

Acknowledged retarget先descriptor-capture完整input，并对整次Stage change只执行一次full plan；Story catalog、reduced-motion/
fallback、readiness与选择run所需的caller callback不得二次读取。Matching按original logical resolved definition的
`acknowledge: true`与Barrier `expectedTransitionId`判断，而不是按effective reduced-motion fallback ID。Full plan必须恰好
一个match：零个为`stage.acknowledged_run_unmatched`，多个为`stage.acknowledged_run_ambiguous`，planning/callback throw、
invalid result或内部provenance破坏为`stage.acknowledged_run_faulted`。这些planning fault和第一次guard失败都发生在
任何old-run interruption、Stage target/active-run mutation、occurrence counter、notification或proof mint之前，因而整个
internal retarget exact zero；不得通过重新调用raw `retarget`降级继续。

唯一match完成full plan后先调用一次exact commit guard。Guard返回`false`为`stale`，throw、invalid return或
planning/guard reentry为`stage.acknowledged_run_faulted`。
若随后中断已有armed run，每一个old run的private terminal、public acknowledgment/diagnostic与Stage
subscription callback全部完成后都要再调用guard；一旦stale/fault就停止中断余下old runs，且只保留已经发生的
old interruption/notification，new occurrence/proof/target/run仍为zero。最后一次guard返回`true`后到new
occurrence/proof/target/run assignment之间不得再有caller callback、property lookup或其他可抛工作。Logical proof只能在
该final guard后mint，绑定exact Stage authority/reconciler Host generation、current presentation epoch、original expected
transition ID与opaque effective run occurrence；普通run、cut/zero-duration、
reduced-motion instant settle和fallback使用同一规则。
任意full-plan、guard、old-terminal或public-observer callback里尝试nested same-authority mutation都以zero delta返回并标记
outer operation；callback后guard若已为false，`stale`优先，否则该reentry使outer返回
`stage.acknowledged_run_faulted`。Post-claim raw public mutation只是fail-closed bypass，不能藉此改变该precedence。
Proof与private terminal delivery必须在任何readiness wait、run start或同步instant terminal前安装。
Claimed run的terminal必须先irreversibly seal exact proof并向captured terminal port delivery，然后才向任何public Stage
frame subscriber、`StageTransitionAcknowledgmentV1`或diagnostic callback暴露terminal。这些public observer的throw在claimed
path上被隔离，不能阻断private delivery、复活run、回滚Stage commit或跳过下一次commit guard；不带
private proof的unclaimed ordinary public path仍保持已有callback/notification行为。Stage在调用private terminal port前已经
terminal-seal proof；hostile port throw被隔离、该proof不重送，并且不阻断run cleanup或后续public observer。Narrative的
captured port必须把自身内部失败收敛为cached `faulted` terminal result，不向Stage抛出。
同一authority的read-only `isAcknowledgedRunTerminalStackActiveInternalV1(proof)`只对same-authority、WeakMap-authenticated
exact proof返回当前private-terminal/public-observer stack状态；foreign、clone、unissued或已退出terminal stack一律为`false`且
不读取caller字段。Narrative显式flush以该proof-bound状态区分public callback内的`retained`与Stage terminal调用返回后的
fresh dispatch，不得用microtask、React effect或Host retry猜测terminal stack边界。

Narrative同批新增`NarrativeStableBarrierAcknowledgmentControllerInternalV1`与
`createNarrativeStableBarrierAcknowledgmentControllerInternalV1({ bridge, stageReconciler })`。Factory从bridge private
provenance自行claim同一composite kernel的stable ready-active authority和上述Stage authority，不接受caller传入任一raw
authority。Controller只暴露`retargetCurrentBarrierStageInternalV1(retarget)`、
`flushRetainedTerminalInternalV1(): NarrativeStableBarrierTerminalDispatchResultInternalV1 | null`与
`disposeInternalV1()`；construction与每个method均要求exact receiver，second/foreign
claim、clone、Proxy与disposed successor在读取caller payload前fail closed。

`NarrativeStableBarrierStageRetargetResultInternalV1`是frozen exact
`armed { completion: null } | stale { completion: null } | faulted { code: Stage三种code,
completion: null }`。Barrier target-level record绑定opaque admitted target、publisher/application lifetime、semantic occurrence、
full normalized PendingInteraction canonical bytes与Stage run proof；它明确不保留source revision、candidate snapshot、semantic
port或runtime instance。Same-target readiness retry因复用exact admitted target且canonical bytes不变而保留该evidence；source/
frame/port只在dispatch时从bridge重新捕获。Replacement、semantic occurrence/canonical drift、empty、application/publisher
successor、foreign Stage generation或dispose立即seal并丢弃旧evidence。

Terminal exact proof先不可逆spend，再按application/target/canonical currentness分类。Private terminal port只在O(1)
target-level slot中seal/store evidence，不在Stage terminal call stack内调用semantic port；所有semantic admission都由后续显式
`flushRetainedTerminalInternalV1()`发起，因而instant terminal也有可观测的closed result。`cancelled`只seal run并缓存
`cancelled`、semantic zero；`completed | skipped | interrupted`保存为唯一retained terminal evidence。Flush在preparing/
suspended/gap上返回`retained`；只有exact ready-active时才取得fresh target/source/frame/semantic-port/runtime proof并进入
shared Barrier callback/semantic-in-flight claim。Pending期间repeat flush只返回同exact cached `dispatched` result identity且zero new
dispatch；无current evidence/result时返回`null`。
`NarrativeStableBarrierTerminalDispatchResultInternalV1`固定为
`dispatched { completion: Promise<unknown> } | retained { completion: null } |
cancelled { completion: null } | stale { completion: null } | faulted { completion: null }`。Winner在semantic call前seal，
repeat/foreign/clone/competing terminal全部zero；sync throw规范化为rejected Promise。In-flight token属于target-level
evidence而不属于某个source/frame/controller；pending期间source/frame successor可安装，但不能取得第二个claim。
Completion继续遵守既有publication + bridge drain contract，随后只用exact token CAS清理：若target/semantic
occurrence/canonical pending仍current，则恢复retained state，且只能由后续显式flush捕获fresh source/frame/port/proof再试；
若target-level evidence已退役，completion只清理bounded tombstone。Old completion不能清除successor claim，不读取
opaque Story result，也不在settlement stack内自动重试。

**S4.1b.1b.1b.2b.2a delivery：** Claimed Stage现以一个claim-once、exact-receiver authority独占
`StageReconcilerV1` mutation；claim后的raw writer全部fail closed，read-only frame/subscription与unclaimed ordinary路径保持
原合同。Acknowledged retarget先对完整change plan执行一次detached planning，先应用old-run suppression，再只按original
logical transition ID接受exact-one acknowledged edge；fallback/effective transition ID不能替代该identity，zero/multiple match、
hostile callback与nested mutation均按已冻结precedence exact-zero/fault。Planning与每次old-run interruption期间的clock ticket
被隔离；每个old private terminal、public acknowledgment/diagnostic与subscriber callback完整返回后均重验同一guard，final
guard成功到commit之间只执行captured-intrinsic与local assignment，不再动态读取caller/global prototype或留下half-arm。

每个accepted run签发fresh frozen zero-key opaque proof。Stage先不可逆seal并调用exact captured private terminal port，之后才
进入public acknowledgment、diagnostic与subscriber；private/public observer throw均被隔离，proof只delivery一次且run cleanup、
后续guard与notification继续。`isAcknowledgedRunTerminalStackActiveInternalV1`只对same-authority exact proof在private/public/
diagnostic/subscriber terminal stack内返回`true`，回调退出、clone、foreign、unissued与wrong provenance均fail closed且不读取
caller字段。Instant、animated、asset readiness、reduced fallback与`completed | skipped | interrupted | cancelled`共用该proof与
terminal-stack合同。

同批Narrative Barrier controller以exact opaque target、semantic occurrence与normalized pending canonical evidence绑定Stage arm，
但不把可替换source/frame/port伪装成target identity。Target的第一个terminal winner原子占有target-level slot并使仍在外层的
旧arm postcheck变为stale；preparing、same-target readiness retry与suspended期间保留eligible evidence，replacement、canonical/
semantic drift、empty与publisher/application successor则同步退役。Terminal callback只记录`completed | skipped | interrupted`
eligible evidence或`cancelled` zero-semantic outcome；semantic调用只能由显式flush在fresh ready-active source/frame/port/proof
复验后发起。Target-level Promise claim、bounded tombstone、lifecycle observer与exact-token CAS保证pending completion不会被
dispose/successor清空、old completion不会ABA-clear fresh claim，并在publication + bridge drain后只恢复仍current的retained
evidence；`cancelled`始终semantic dispatch为零。

本delivery仍是source-relative dormant floor：没有接入live Narrative Host、React/Web、Story consumer或public Stage writer，
没有新增public root、`./internal` barrel、package export、generic Surface/action/result、Base interaction、Save/Persistence、
canonical/digest/replay/wire合同。验证通过focused `8 files / 292 tests`、UI `79 files / 1099 tests`、full
`253 files / 4029 tests`与`deno task check` green；fresh Engine browser为`101 / 101`、examples为
`45 passed / 2 skipped`、prebuilt Player为`38 / 38`。S4.1b.1b.1b.2b.2a现已完成；active current/next均推进为
S4.1b.1b.1b.2b.2b.1 settle/replay recovery implementation；该切片现已由下述delivery关闭，其前置
`.2b.2b.0` docs checkpoint见下。

**S4.1b.1b.1b.2b.2b.0 recovery generation admission entry amendment（docs-only，已完成）：**
既有`NarrativeStableBarrierAcknowledgmentControllerInternalV1`提升为同一composition/application bridge拥有的长寿命controller，
仍是唯一Barrier Stage claimant，但构造与claim不再要求当时已经存在Barrier target。没有current Barrier时，normal
`retargetCurrentBarrierStageInternalV1`稳定返回既有`{ kind: "stale", completion: null }`，
`flushRetainedTerminalInternalV1`返回`null`；不得为缺失target伪造Stage run、terminal evidence或semantic dispatch。Recovery
generation、preexisting target capture、attempt/result cache与once-per target/generation claim都存入
`NarrativeStablePublisherBridgeRecordInternalV1`，不能存进React/controller-local lifecycle或在StrictMode重建时丢失。

Stage新增frozen zero-key opaque `StagePresentationGenerationProofInternalV1`与exact frozen
`StagePresentationGenerationCaptureResultInternalV1`。既有exact
`StageAcknowledgedRunAuthorityInternalV1.captureCurrentPresentationGenerationInternalV1(previousProof: unknown | null)`只按同一
authority/reconciler的accepted current Stage epoch返回closed union：
`{ kind: "captured", relation: "initial" | "equal" | "higher", proof } |
{ kind: "stale", proof: null } | { kind: "faulted", proof: null }`。
Numeric epoch不进入Narrative或任何cloneable result。`null`只表达caller尚无accepted generation；same-authority current proof在
same epoch返回`equal`并复用exact cached proof；每次accepted epoch transition先撤销current cache，下一次capture才签发fresh
proof，exact prior proof只在current epoch严格更高时返回`higher`。Current Stage unavailable、current epoch较低，或numeric ABA回到
same epoch后收到noncurrent old proof均返回`stale`；foreign
authority/reconciler proof、clone、unissued、invalid shape与hostile value返回`faulted`且zero caller-field read。Stage只保留current
strong slot，旧proof provenance留在WeakMap而不形成历史vector；dispose撤销current proof。Acknowledged-run planning/interrupting
operation或其他authority mutation尚在栈内时的capture稳定`faulted`并进入既有reentry fence，不得读取、mint或替换generation
proof。Public Stage reconciler、acknowledgment
shape、run proof与writer authority不变。

Claim之后presentation epoch只能由同一个Stage authority推进，不能借已经封闭的public `retarget`或test-only后门。
Stage authority因此同时新增exact frozen `StagePresentationGenerationRetargetResultInternalV1`：
`{ kind: "retargeted" } | { kind: "stale" } | { kind: "faulted" }`，以及
`retargetPresentationGenerationInternalV1(retarget: StageRetargetInputV1)`。该入口只接受initial bootstrap或
`retarget.epoch !== current accepted epoch`的presentation-generation replacement，并沿既有contained epoch-change路径静默
dispose old runs、安装stable target/revision/epoch后通知；same epoch固定`stale`且target/run/revision/notification zero，disposed
固定`stale`，acknowledged planning/interrupting、nested mutation或callback reentry固定`faulted`。既有Barrier controller只增加
exact-receiver wrapper `retargetPresentationStageInternalV1(retarget)`并返回同一Stage result；wrapper与normal acknowledged retarget
共用`stageRetargetInProgress` fence，不持有第二Stage writer，也不读取或修改Narrative recovery generation。Higher/lower relation
测试必须先经该真实wrapper推进Stage，再显式调用synchronize；不得直接拿raw authority或public reconciler制造epoch。
Initial/higher/lower retarget与same-epoch stale都不得读取、清除或替换Narrative的`barrierTargetTerminalClaim`、callback/
semantic-in-flight claim或Promise tombstone；generation relation失败不能把presentation replacement变成第二次semantic dispatch，
old completion仍是其exact CAS owner。

为保持single writer，claim后的既有`StageAcknowledgedRunAuthorityInternalV1.retargetInternalV1(retarget)`同步收窄为只处理
already-initialized且`retarget.epoch === current accepted epoch`的ordinary same-generation retarget；current epoch尚未初始化或epoch
mismatch时exact zero mutation/notification。Initial/higher/lower presentation replacement只能走上述新generation-retarget方法，
normal acknowledged Barrier edge只能走`retargetWithAcknowledgedRunInternalV1`；三条入口不得互相旁路。

Narrative新增frozen zero-key `NarrativeStableBarrierRecoveryGenerationInternalV1`与exact frozen
`NarrativeStableBarrierRecoveryGenerationSynchronizationResultInternalV1`：
`{ kind: "installed", generation } | { kind: "unchanged", generation } |
{ kind: "stale", generation: null } | { kind: "faulted", generation: null }`。Controller的
`synchronizeRecoveryGenerationInternalV1(activationGate)`只接受同一composition source-relative提供的exact
`ManagedSurfaceFamilyActivationGateInternalV1`，并descriptor-capture exact one-key own-data
`isOpen(): boolean` receiver/callable；该binding只能从`false`单向转为`true`，不新增第二个gate、cursor或generation authority。
Initial/higher row才可读取gate或target：supplied fresh gate必须保持closed，随后捕获当时exact current
Barrier target、semantic occurrence与canonical pending bytes，允许target为`null`，再按Stage current proof、same exact gate binding、
bridge/application identity与captured target做callback-safe postcheck，并重验同一captured callable仍为closed，全部成立才原子安装
fresh generation；每个initial/higher row可提供一个fresh closed gate并替换旧stored binding，gate不是controller construction固定的
永久对象。Equal row复用exact
generation、preexisting target、attempt/result/claim identity，只比较supplied gate与stored binding的exact object identity，且对
gate属性与target projection均zero read；lower/stale Stage row也
保持gate、target、result与notification zero。Accessor/extra-key/foreign-prototype/noncallable gate、wrong receiver或Stage proof
fault稳定`faulted`且zero mutation。该gate是source-relative exact data-callable port而不是opaque provenance capability；plain exact
callable clone不能仅靠structure区分，所以composition Host必须独占并不得向renderer、React effect或其他caller泄露、复制或伪造它。

同一controller绑定的same reconciler/authority才可形成`equal`。React remount、StrictMode与effect/callback identity本身既不mint
proof也不调用synchronize；换成new reconciler/authority的same numeric epoch属于foreign并返回`faulted`，不能借numeric equality
resnapshot target。Application successor必须使用fresh bridge/controller/gate domain，并从`initial`安装fresh generation；old gate、
proof、generation、attempt与result均不能跨bridge ABA复活。已存exact gate必须在任何settle/replay issue或dispatch前变为open；仍
closed、open后重新报告closed、captured callable throw/invalid result、bridge/proof successor或dispose均fail closed且zero semantic
dispatch。

本docs checkpoint只冻结admission、identity与precedence，没有实现source、test、runtime或live wiring，也不记录delivery/evidence。
它不新增public/`./internal` barrel、package export、raw public acknowledgment、React timing authority、generic Surface result、Base、
Save/Persistence/replay/wire变化。S4.1b.1b.1b.2b.2b.1是其后的implementation slice，现已由下述delivery关闭。

`.2b.2b.1`在上述bridge-owned generation上新增frozen zero-key
`NarrativeStableBarrierRecoveryAttemptInternalV1`。Generation安装时只认当时已经存在的preexisting Barrier identity；同generation
之后才发布的Barrier、replacement或canonical drift都不获得settle资格。Controller新增
`issueSettleRecoveryAttemptInternalV1(): NarrativeStableBarrierRecoveryAttemptInternalV1 | null`与
`dispatchSettleRecoveryInternalV1(attempt): NarrativeStableBarrierRecoveryDispatchResultInternalV1`。Attempt只为eligible
`loadRecovery: "settle"` target签发，并在dispatch时要求fresh ready-active target/source/frame/port/runtime proof；它没有gesture、
input-owner、clock或renderer字段。Recovery dispatch result固定为
`dispatched { completion: Promise<unknown> } | stale { completion: null } | faulted { completion: null }`，并与normal Stage terminal
共享Barrier callback/semantic-in-flight first-wins claim、Promise drain与exact CAS。

`loadRecovery: "replay"`不签发attempt。`readReplayRecoveryUnsupportedInternalV1()`按exact target/generation返回并缓存唯一
frozen `{ kind: "unsupported", code: "narrative.barrier_replay_unsupported", completion: null }`；repeat复用同一identity且
notification、semantic、source、runtime与topology均zero。只有fresh installed generation可建立fresh result；successor target
必须先被该fresh generation捕获为preexisting，same-generation target successor保持ineligible。Replay unsupported与
settle共享同一once-per-target/generation recovery claim，但不伪造Stage proof或semantic-in-flight。`.2b.2a/.2b.2b.0/.2b.2b.1`都不得修改
public `StageReconcilerV1`/acknowledgment shape、root或`./internal` barrel、package export、generic Surface result/receipt、Base
interaction/Save/replay/wire或live Engine Lab writer；这些source-relative vertical完成后才允许进入`.2b.3` aggregate
checkpoint，现由下述`.2b.3.0` execution split继续细分。

**S4.1b.1b.1b.2b.2b.1 settle/replay recovery delivery：** Claimed Stage authority现独占
presentation-generation retarget与capture。Initial/higher/lower replacement只能经
`retargetPresentationGenerationInternalV1`写入；ordinary writer收窄为initialized same-epoch retarget，same-epoch与disposed
generation retarget保持stale。Current strong proof slot与prior-proof WeakMap provenance以O(1)闭合initial/equal/higher/lower、numeric
ABA与foreign classification，其中lower relation精确映射为`stale/proof:null`而不签发lower proof；generation、acknowledged-run、ordinary、skip及其callback reentry又统一经过同一authority mutation
fence，nested mutation不得旁路或半写Stage state。

Recovery authority完整落在composition/application bridge：exact Stage authority/proof、stable action authority、activation-gate
binding、preexisting target或`null`、current attempt、replay cache、callback claim与独立generation observer都由bridge record持有。
Controller可在empty/non-Barrier状态构造；dispose/recreate controller会继承同一bridge generation、attempt、cache与observer，fresh
controller在same Stage authority下仍可dispatch尚存活的attempt。Bridge/application disposal先关闭family ingress再进入composite
notification；target/generation retirement释放observer，而controller缺席时observer仍会按readiness、source或frame drift同步退役旧
attempt。Exact activation gate在synchronize、issue、dispatch与replay read前后都descriptor-revalidate，并且只接受closed→open单向
变化；descriptor drift、open→closed、foreign Stage authority/proof或bridge successor全部fail closed。Gate callback中的nested
synchronize/retarget会poison inner与outer operation，并以CAS保留old generation，不留下partial install。

Settle attempt是绑定exact preexisting target/generation及fresh ready-active source/frame/port/proof的frozen zero-key capability，不含
gesture、input owner或clock。Normal terminal与recovery settle共用Barrier target/callback/semantic first-win claim、publication + bridge
drain和Promise tombstone exact CAS；同步throw规范化为rejected completion，old completion只能清理自己的bounded tombstone，不能
ABA-clear successor claim。Replay row不签发attempt，而是按exact preexisting target/generation缓存唯一unsupported result；repeat与
same-generation successor保持zero semantic/runtime/topology mutation。Nested issue/dispatch/observer reentry、controller transfer、fresh
bridge ABA与`10k` generation rotation均由mutation-sensitive tests闭合。

本delivery仍是source-relative dormant floor：没有接入Narrative Host、React/Web、live Story claimant或Engine Lab writer，也没有
新增public root、`./internal` barrel、package export、generic Surface/action/result、Base interaction、Save/Persistence、canonical/
digest/replay/wire合同。验证通过focused `8 files / 315 tests`、UI `79 files / 1122 tests`、full
`253 files / 4052 tests`与`deno task check` green；fresh Engine browser为`101 / 101`、examples为
`45 passed / 2 skipped`、prebuilt Player为`38 / 38`。S4.1b.1b.1b.2b.2b.1现已完成；active current/next均推进为
S4.1b.1b.1b.2b.3 aggregate player controls；该aggregate checkpoint现由下述`.2b.3.0` execution split supersede。

**S4.1b.1b.1b.2b.3 player controls aggregate checkpoint（superseded）：** 上述accepted V1 product policy保持
normative且不变：Auto/Skip仍是非持久化mutually-exclusive `normal | auto | skip` mode、同mode toggle回到normal、另一mode
toggle原子切换；History仍只通过exact-parent intent进入Coordinator；voice replay仍只作用于exact current ready-active Say；
`player.toggle_ui`仍不得进入Narrative managed route。被supersede的只是aggregate implementation pointer，不是这些产品语义或
S4.2/S4.3 ownership。

**S4.1b.1b.1b.2b.3.0 player-controls execution split（docs-only，历史checkpoint）：** 后续player controls按四个独立
mergeable source-relative切片推进，禁止把catalog corrective、optional callback、mode authority与History topology重新合并：

1. **`.2b.3a toggle-ui Narrative catalog corrective（已完成）`** 只从Dialogue managed definition action catalog删除
   `player.toggle_ui`。Generic `playerInputActionIdsV1.toggleUi`与其input action ID继续保留；既有live `DialoguePanelV1`/
   `VnLayerV1`只作characterization且本切片不删除、不改写。该切片不建立hide/show state、fallback action、route、attempt、
   Host或public兼容层，也不顺带修改其他player action。
2. **`.2b.3b voice replay physical route（已细分的历史checkpoint）`** 只交付exact current ready-active Say上的optional voice
   physical route。RED前必须先以独立entry contract冻结descriptor-captured exact receiver/own-data
   `replayCurrentVoiceInternalV1(): boolean` callable、one-shot authenticated physical attempt、family-local
   `handled | ignored | stale | faulted` result与ordered recheck；不得把opaque candidate snapshot identity直接调用、扩大generic
   Surface/Input result或新增public/`./internal` barrel。该entry已由`.2b.3b.0` docs-only contract与`.2b.3b.1`
   implementation线性取代并完成。
3. **`.2b.3c bridge-owned Auto/Skip transient mode floor（已细分的历史checkpoint）`** 只交付bridge/application-owned single writable
   `normal | auto | skip` mode与authenticated `player.toggle_auto | player.toggle_skip` physical route：same-mode toggle回到normal，
   cross-mode toggle在一个transition内切换。它不得复用React/controller-local public playback state或建立第二mode writer；本切片
   不读取presentation clock/profile timing、不创建timer、deadline、remaining或semantic auto/skip attempt。Full-reveal/
   `autoWaitMs` scheduling、skip stepping、suspension remaining与fresh resume generation全部仍归S4.2。该checkpoint
   已由`.2b.3c.0` docs-only exact entry与`.2b.3c.1` implementation线性取代并完成。
4. **`.2b.3d History exact-parent open intent floor（已细分的历史checkpoint）`** 只读取current ready-active Dialogue root的read-only History
   availability，并把authenticated `player.toggle_history`收窄为package-internal opaque exact-parent open intent及family-local
   `requested | ignored | stale | faulted` result；Input consumed是authenticated route属性，不是family result kind。它不分配History occurrence/instance、不修改composite topology、不安装
   child readiness/input/focus/dismiss或React-local boolean；actual History child open/close与`ui.cancel` integration仍归S4.2。该checkpoint
   已由`.2b.3d.0` docs-only exact entry与`.2b.3d.1` implementation线性取代。

线性顺序固定为`.2b.3a → .2b.3b.0 → .2b.3b.1 → .2b.3c.0 → .2b.3c.1 → .2b.3d.0 → .2b.3d.1 → S4.2.0 → S4.2.1 → S4.2.2.0 → S4.2.2.1 → S4.2.2.2.0 → S4.2.2.2.1 → S4.2.2.2.2 → S4.2.3.0（已完成） → S4.2.3.1（已完成） → S4.2.3.2（已完成） → S4.2.4.0（docs-only，已完成） → S4.2.4.1（已完成） → S4.2.4.2（已完成） → S4.2.4.3（已完成） → S4.2.5 broad checkpoint（historical） → S4.2.5.0（docs-only，已完成） → S4.2.5.1 broad checkpoint（historical） → S4.2.5.1a（已完成） → S4.2.5.1b（已完成） → S4.2.5.1c（已完成） → S4.3 broad checkpoint（historical） → S4.3.0（docs-only，已完成） → S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）`；
`.3b.1`已按`.3b.0`冻结的exact optional callable/attempt/result完成，`.3c.1`也已按`.3c.0`冻结的mode exact
entry完成，`.3d` broad checkpoint也已由`.3d.0`与`.3d.1`线性取代并完成；S4.2 broad entry又已由
S4.2.0 exact execution split取代，S4.2.1与S4.2.2.1也已由下述delivery关闭；原S4.2.2又由下述`.2.2.0`细分，
原S4.2.2.2 broad Host checkpoint再由`.2.2.2.0`细分，S4.2.2.2.1 DOM-free generic Host-commit atomic
substrate与S4.2.2.2.2 dormant Narrative React Host也已交付，S4.2.3.0 exact entry与S4.2.3.1 DOM-free
generic lifecycle substrate、S4.2.3.2 dormant Narrative close/input/root + History focus Host lifecycle及S4.2.4.3 dormant Host
player-view integration又已完成；原S4.2.5 broad checkpoint已由completed `.5.0`细分，原`.5.1`又已由`.5.1a`–`.5.1c`细分，`.5.1a`、`.5.1b`与`.5.1c`也均已完成；active
current/next、core slice与direct RED/implementation gate均为PF5/M3 Save migration product surface（当前）。`.3d.1`若
必须在intent slice直接修改topology，或任一切片要求删除generic input ID、修改legacy live characterization、扩generic/public
contract或提前接Host/React/Web/live Story，均立即停止并修订设计。

本amendment只调整execution order与implementation ownership，没有source、test、runtime、Host/live claimant或delivery
evidence；不新增public/`./internal` barrel、package export、generic Surface result/receipt，也不改变Base interaction、PlayerProfile、
Save/Persistence/canonical/digest/replay/wire或S4b。验证仅为本设计文档`deno fmt --check`与`git diff --check`。该checkpoint
当时的current/next均为S4.1b.1b.1b.2b.3a toggle-ui Narrative catalog corrective，现由下述delivery关闭。

**S4.1b.1b.1b.2b.3a toggle-ui Narrative catalog corrective delivery：** Dialogue managed definition的
static action/admission contract由revision `1`推进为`2`，且唯一catalog mutation是删除`player.toggle_ui`；History继续保持
revision `1`与exact `ui.cancel | player.toggle_history` catalog。Stable sidecar仍exact引用该Dialogue definition，target parameter
schema/canonical不变；generic `playerInputActionIdsV1.toggleUi`与`player.toggle_ui` input ID均保留，既有live
`DialoguePanelV1`/`VnLayerV1`及Engine Lab legacy characterization没有source diff。

Removed binding-origin `player.toggle_ui`现在返回`surface.action_unpublished`且Input保持consumed；lower handler、claimed
consumer、semantic dispatch、topology与notification均为zero，已有authentic attempt也不被spent。该corrective只修改source-relative
Narrative definition与同目录mutation-sensitive tests，没有新增hide/show route、Host/React/Web/live claimant、public root、
`./internal` barrel、package export或generic Surface/Input result，也不改变Base interaction、PlayerProfile、Save/Persistence、
canonical/digest/replay/wire或S4b。

验证通过focused `2 files / 156 tests`、UI `79 files / 1123 tests`、full `253 files / 4053 tests`与完整
`deno task check`。本source-relative dormant corrective没有改变browser/build/live graph，
因此未机械重跑browser/examples/prebuilt；Engine browser `101 / 101`、examples `45 passed / 2 skipped`与prebuilt Player
`38 / 38`仅为prior evidence，不冒充本批HEAD验证。S4.1b.1b.1b.2b.3a已完成；该checkpoint当时的active
current/next推进为S4.1b.1b.1b.2b.3b voice replay physical route原checkpoint；该checkpoint现由下述`.3b.0`
entry contract与`.3b.1` delivery细分并取代。

**S4.1b.1b.1b.2b.3b.0 voice replay entry contract（docs-only，已完成）：** `.3b`原checkpoint只作为产品语义与历史
implementation pointer保留；实际delivery线性拆为本`.3b.0`合同与`.3b.1` implementation。Candidate raw optional adapter的
source-relative类型精确命名为`NarrativeStableVoiceReplayPortInternalV1`，且只允许`null`或prototype exact为
`Object.prototype`、非array、own key exact只有`replayCurrentVoiceInternalV1`的plain object；该key必须是own data descriptor，
因此raw type的exact member是`readonly replayCurrentVoiceInternalV1: () => boolean`。Candidate preflight只读descriptor一次，把原
object作为exact receiver、descriptor value
作为exact callable存入package-local `WeakMap`，mint frozen zero-own-key branded
`NarrativeStableCapturedVoiceReplayPortInternalV1`；admitted
`NarrativeStableCandidateSnapshotInternalV1.voiceReplayPort`只保存该opaque handle或`null`，不保存或暴露raw adapter。Raw descriptor
后续被替换、删除或改成accessor不会改变已捕获callable；route只允许
`Reflect.apply(capturedCallable, exactReceiver, [])`，不得重读caller object。Malformed non-null adapter、inherited/accessor callable、
extra或symbol key、foreign/clone handle及descriptor trap都在target/source/runtime mutation前沿用
`narrative.candidate_preflight_faulted`与exact zero delta fail closed。

One-shot physical attempt精确命名为`NarrativeStableVoiceReplayActionAttemptInternalV1`；既有
`NarrativeStablePhysicalActionAdmissionInternalV1`只新增
`issueVoiceReplayAttemptInternalV1(): NarrativeStableVoiceReplayActionAttemptInternalV1 | null`，并继续使用同一个
bridge-owned `physicalActionAdmissionClaim`、同一个contract-bound binding及既有`routeInternalV1`。不得新增voice controller、第二
binding/claimed route、callback authority或renderer authority。Voice复用bridge record既有package-local
`sayCallbackClaim: object | null`作为跨physical admission/controller successor的唯一同步Say callback fence；不得新增
`voiceReplayCallbackClaim`或其他parallel slot。它仍不是controller、route authority、binding claim或长期player state。Issue只为该
admission的existing physical capture已取得non-null direct target/source revision/direct-target proof、current stable input contract仍与
binding contract exact相等且exact admitted frame的`pending.kind === "say"`时mint frozen zero-own-key handle；这里不得捕获、保存或新增
`ManagedSurfaceStableReadyActiveTargetProofInternalV1` field。Package-local `WeakMap` provenance只绑定exact admission authority、
`ManagedSurfaceStableDirectActionTargetProofInternalV1`、direct target、source revision、admitted frame、该frame的captured voice
handle-or-null与mutable one-shot `spent`。Optional port为`null`仍可签发authentic attempt，使合法`player.replay_voice` route得到
family-local ignored，而不是绕过authenticated Input consumption。`sayCallbackClaim`或`saySemanticInFlightClaim`非null期间，旧或
same-bridge successor admission均不得签发fresh voice attempt，`issueVoiceReplayAttemptInternalV1`返回`null`；既有manual
activation、content-auto attempt与
dispatch继续由同一两项bridge claim fail closed，Say controller creation继续由shared `sayCallbackClaim`与既有controller claim
fail closed。

Family result精确命名为`NarrativeStableVoiceReplayDispatchResultInternalV1`，且是四个exact frozen row：
`{ kind: "handled", completion: null } | { kind: "ignored", completion: null } |
{ kind: "stale", completion: null } | { kind: "faulted", completion: null }`，每个row的own key exact为`kind | completion`。
该source-relative subtype必须作为`NarrativeStablePhysicalActionDispatchResultInternalV1`的Narrative-local union member并入既有
route consumer result，但不得修改generic
`ManagedSurfaceAuthenticatedActionRouteResultInternalV1`、Input result、receipt或action-binding合同。四个outcome都要求outer route的
Input为`input.managed_surface_consumed`、Surface保持unchanged，lower handler、semantic resolution、Base dispatch、topology与
notification mutation全部为zero。

Ordered precedence固定如下：application/topology/instance/input-owner/routing-lease/action-catalog/input-publication/gesture先由既有
authenticated route验证；若consumer未被调用，则`consumerResult`为`null`且authentic attempt不spent。Consumer只把
`player.replay_voice`映射到`voice_replay`，先以WeakMap验证attempt为same-admission、correct-kind、unspent authentic identity；
clone、foreign、wrong-kind、predecessor或already-spent attempt返回stale且zero callback。Authentic attempt进入consumer后先spend，
再按direct-target proof → current stable input contract/direct target/source revision → exact admitted frame/current
`pending.kind === "say"` → captured voice handle identity顺序复验；任一proof/frame/handle drift均返回stale。这里的current
ready-active eligibility完全来自既有physical route的direct-target proof、current stable input contract与exact frame，不得另取或复验
ready-active proof。Handle为`null`立即返回ignored，不读取、不安装也不释放`sayCallbackClaim`，并保持zero callback；
非null handle只有WeakMap binding仍exact时才继续。若bridge-wide `sayCallbackClaim`或`saySemanticInFlightClaim`已非null，本authentic
competitor保持spent并返回stale；否则以fresh frozen zero-key token exact-CAS安装既有`sayCallbackClaim`，再做一次admission
claim/proof/frame/handle及`saySemanticInFlightClaim === null`复验，仍current才调用captured callable。Voice claim不得转移到
`saySemanticInFlightClaim`；它必须覆盖整个callback与post-callback复验。Callback返回后先重复admission claim与同一
proof/frame/handle复验，再解释callback outcome，因此dispose/successor或同步source/frame drift优先于throw或return：仍current时
exact `true`为handled、exact `false`为ignored，throw或任意non-boolean return为faulted。最后只以exact-token CAS释放
`sayCallbackClaim`，foreign/old cleanup不得清除successor token；physical admission dispose不得清理或转移该claim，bridge teardown也
只能让持有token的callback在finally做exact-CAS release。Spend-before-call与shared Say callback claim共同保证repeat、old-admission
dispose → same-bridge successor admission及callback reentry都不能二次调用或嵌套manual/content-auto semantic dispatch；旧same-binding
nested route仍先被既有per-binding in-progress fence拒绝，same-bridge successor的fresh voice/manual/content-auto issue为`null`，其
authenticated `player.replay_voice` route只能得到stale/zero callback。若callback dispose旧admission或安装successor admission，外层
post-callback admission-claim复验也返回stale。

Admission method保持既有receiver guard：borrowed issue返回`null`，borrowed route沿用
`ui.narrative_stable_action_admission_invalid`；frozen object clone无法取得WeakMap provenance，foreign bridge/admission的authentic
attempt也不能跨authority使用。上述raw port、captured handle、attempt与result仅可从
`narrative/narrative-managed-surface-family.ts` source-relative import，并须由public-boundary negative tests证明不进入UI root、
`./internal` barrel或package export。Source/frame/non-Say drift若已通过outer authenticated route，返回family-local stale并spend；
application/topology/lease/gesture failure或disposed binding若阻止consumer，则保持`consumerResult: null`、zero callback且不spend。
旧attempt不能跨bridge/admission successor；它若进入fresh admission的authenticated same-action consumer，只能按foreign authority返回
stale。本合同不接Host/React/Web/live claimant、不调用audio presenter、不新增timer/profile/mode/History/topology或semantic path。

`.3b.1`实现若要求把raw adapter/handle交给renderer、把optional absence当作unpublished/unconsumed、在callback前漏spend、把
non-boolean当作handled/ignored、扩generic/public result、新增controller/第二binding/route claim，或不复用上述唯一bridge-wide
`sayCallbackClaim`而另建parallel callback slot，立即停止并修订合同。该amendment只有
本设计文档mutation，没有source、test、runtime、Host/live claimant或product/browser/build delivery evidence；验证仅为本文件
`deno fmt --check`与`git diff --check`。该entry当时把active current/next推进为
**S4.1b.1b.1b.2b.3b.1 voice replay physical route implementation**，现由下述delivery关闭。

**S4.1b.1b.1b.2b.3b.1 voice replay physical route implementation delivery（已完成）：** Candidate
preflight现把`NarrativeStableVoiceReplayPortInternalV1`的exact one-key plain-object own-data descriptor捕获为raw
receiver与`replayCurrentVoiceInternalV1` callable的package-private WeakMap binding，并只把frozen zero-key
`NarrativeStableCapturedVoiceReplayPortInternalV1` handle或`null`写入admitted frame。Route不重读caller property；raw
method随后替换、删除或变为accessor仍只调用首次捕获的callable与exact receiver。Array/function、null/foreign prototype、extra
string/symbol key、accessor/inherited/missing/non-callable descriptor及prototype/ownKeys/descriptor trap继续在candidate
issuance、source、runtime、topology与notification mutation前以preflight fault和exact zero delta关闭。

既有`NarrativeStablePhysicalActionAdmissionInternalV1`只增加
`issueVoiceReplayAttemptInternalV1()`；它复用现有physical admission claim、contract-bound route与direct-target proof，为exact
current ready-active Say签发frozen zero-key `NarrativeStableVoiceReplayActionAttemptInternalV1`。Package-private WeakMap record
只保存issuing admission、target proof、direct target、source revision、exact frame、captured handle-or-null与one-shot `spent`；
没有新增voice controller、ready-active proof、第二binding/claimed route或unbounded strong history。Port absent仍可issue，合法route
返回ignored。Spoof/clone、foreign admission、wrong receiver、wrong kind、unmapped probe与already-spent identity均由opaque provenance
与mapping-before-spend顺序fail closed，且不能消耗另一份authentic attempt。

Authenticated `player.replay_voice`先完整通过generic Surface/Input/publication/gesture fence；same-admission correct-kind unspent
attempt进入consumer后立即spend，再按physical-admission claim、direct-target proof、stable input contract、target/source/frame/Say kind与
captured-handle identity复验。Null handle不安装claim并返回frozen ignored；non-null winner复用bridge-wide
`sayCallbackClaim`，以fresh token exact-CAS安装、pre-call与post-call复验，并只由持有own token的finally exact-CAS释放。
`NarrativeStableVoiceReplayDispatchResultInternalV1`保持exact frozen `handled | ignored | stale | faulted`四行：exact true/false分别
handled/ignored，throw或non-boolean为faulted，而source/frame/suspension/admission/bridge/successor drift的postcheck stale优先于callback
outcome。Same-binding route reentry、manual/content-auto路径及dispose后same-frame successor在shared claim存续期间均不能形成第二callback；
old cleanup也不能ABA-clear successor authority。四类family outcome的Input均consumed、Surface unchanged，lower handler、semantic
resolution、Base dispatch及outer追加的runtime/topology/notification mutation为zero。

本delivery仍是source-relative dormant UI floor：raw port、captured handle、attempt、result与issue method都有root及`./internal`
type/runtime negative guards；没有barrel/package export、generic action/result/receipt、Dialogue catalog、Host/React/Web/live audio
claimant、timer/profile/mode/History/topology、Base interaction、Save/Persistence、canonical/digest/replay/wire或live graph扩张。
验证通过focused `2 files / 137 tests`、UI `79 files / 1136 tests`、full `253 files / 4066 tests`与完整
`deno task check`。本批未重跑browser/examples/prebuilt；Engine browser `101 / 101`、examples
`45 passed / 2 skipped`与prebuilt Player `38 / 38`只作为prior evidence，不冒充本批HEAD验证。
Active current/next当时均推进为**S4.1b.1b.1b.2b.3c bridge-owned Auto/Skip transient mode floor**；
该aggregate mode checkpoint后来由下述`.3c.0` exact entry与`.3c.1` implementation线性取代并完成。

**S4.1b.1b.1b.2b.3c.0 bridge-owned Auto/Skip exact entry contract（docs-only，已完成）：**
`.2b.3c` mode floor只作为已细分的历史checkpoint保留；本entry当时在实现前冻结了一个
source-relative、bridge-owned且single-writer的exact contract。Mode类型精确命名为
`NarrativeStablePlaybackModeInternalV1 = "normal" | "auto" | "skip"`；既有
`NarrativeStablePublisherBridgeInternalV1`只新增total read
`readPlaybackModeInternalV1(): NarrativeStablePlaybackModeInternalV1`。该read不返回nullable inspection、generation、
state token或writer，也不得复用现有public `PlaybackModeV1`/`PlaybackControllerV1`/`setMode`；它只读取
bridge当前scalar mode，不读取presentation clock、PlayerProfile或Story state。Fresh bridge的initial mode exact为
`normal`。若bridge/composite/coordinator/application currentness已terminal，该total read必须fail closed返回
`normal`，不得暴露terminal bridge private slot中的旧`auto | skip`；该观察不需要subscriber写slot。

Physical capability精确命名为frozen zero-own-key branded
`NarrativeStablePlaybackModeToggleActionAttemptInternalV1`。既有
`NarrativeStablePhysicalActionAdmissionInternalV1`只新增
`issuePlaybackModeToggleAttemptInternalV1(requestedMode: "auto" | "skip")`，其exact return type为
`NarrativeStablePlaybackModeToggleActionAttemptInternalV1 | null`；它不接受`normal`也不暴露
arbitrary setter。
Family result精确命名为`NarrativeStablePlaybackModeToggleDispatchResultInternalV1`，且只有四个exact
frozen row：
`{ kind: "toggled", mode: NarrativeStablePlaybackModeInternalV1, completion: null } |
{ kind: "ignored", completion: null } | { kind: "stale", completion: null } |
{ kind: "faulted", completion: null }`。`toggled`的own key exact为`kind | mode | completion`，其余row exact为
`kind | completion`。该subtype只并入已有Narrative-local
`NarrativeStablePhysicalActionDispatchResultInternalV1`；不修改generic
`ManagedSurfaceAuthenticatedActionRouteResultInternalV1`、Input result、receipt或action binding。

Bridge record只强持有一个fresh frozen private mode-state object，其中同时封存scalar mode与exact
state identity；所有有效toggle与lifecycle reset只能经同一bridge-private exact-CAS helper替换该单一slot。
Package-private `WeakMap`对每个attempt只绑定exact issuing physical admission authority、requested mode、
`ManagedSurfaceStableDirectActionTargetProofInternalV1`、direct target、source revision、exact admitted frame、
issuance时的exact mode-state identity与mutable one-shot `spent`。不存储numeric revision，不在bridge/admission上
强持有current/previous attempt，也不保留mode-state history；因此strong state保持O(1)，unreachable
attempt record由WeakMap key决定可回收性。每个有效Say toggle（包括回到`normal`）都从captured exact state
CAS到fresh state，使`normal → auto → normal`与`normal → skip → normal`都不能ABA-revive旧token。

六个唯一有效转换精确为：`normal + auto → auto`、`auto + auto → normal`、
`skip + auto → auto`、`normal + skip → skip`、`skip + skip → normal`与
`auto + skip → skip`；每个都返回包含next scalar的`toggled`。Issue只在same-admission、exact current
ready-active direct target/source/proof、stable input contract与admitted frame均current时mint。Say上按上述六转换
toggled；choice、pause、custom与`presentation_barrier`上同样可签发authentic mode attempt，但correct
route只能spend后返回`ignored`，mode保持`normal`。既有physical admission因此可为exact current
ready-active `presentation_barrier`建立，但该扩展只是Auto/Skip认证载体；choice/pause/custom/Say/voice
issue在barrier上仍为`null`，不形成barrier completion/resolution action，不读取或变更Stage claim、
acknowledgment、recovery evidence或semantic port。Empty、preparing/readiness gap、retained predecessor、suspended与terminal
state都没有mode physical admission。

Ordered precedence固定为：application/terminal/global coherence、topology/instance/input owner/routing lease、
action catalog、input publication与gesture先由已有authenticated route验证；consumer未调用时
`consumerResult` exact为`null`且attempt不spent。Consumer先把`player.toggle_auto | player.toggle_skip`
映射成exact requested mode。Unmapped action在读取attempt前返回已有`unmapped`。Authentic mode attempt被用于
non-toggle action，或attempt的requested mode与Auto/Skip action不匹配，只可读取WeakMap provenance用于归类同一
`unmapped`，不得spend token；原token随后仍可用于对应的correct action。只有same-admission、
correct requested mode、unspent的exact WeakMap identity可继续；
spoof/clone、foreign admission/bridge、wrong-kind与already-spent均为`stale`，不能spend另一个authentic
capability。Correct authentic attempt进入consumer后立即spend，然后依次重验physical admission claim/active
bridge、`bridgeRecord.sayCallbackClaim === null`、direct-target proof、current stable input contract、exact
target/source/frame/kind与exact mode-state identity。任一currentness drift返回spent `stale`；未预期private
capture/CAS fault返回spent `faulted`，且mode不能partial-commit。仍current的non-Say返回`ignored`；仍current的
Say才以exact state CAS提交上述一个`toggled`转换。

Toggle只把已有bridge-wide `sayCallbackClaim`作为synchronous callback reentry guard。Claim非null期间
issue返回`null`；pre-signed authentic attempt若已通过outer route进入correct consumer，则先spend、再因claim
非null返回`stale`。Toggle永不安装、转移或清理`sayCallbackClaim`，也不读取
`saySemanticInFlightClaim`；上一Say semantic completion pending不阻止纯mode CAS为successor选模式。Toggle不退役
、不spend也不替换已签发manual Say activation或content-auto attempt；它本身不调用callback、不安装
semantic claim、不创建player auto/skip semantic attempt，也不取得lifecycle token。Same-binding callback
route reentry仍先由已有generic in-progress fence拒绝且不spend；dispose/recreate形成的same-bridge
cross-binding reentry则由上述callback-claim issue/precommit guard闭合。

Lifecycle也只有上述bridge-private mode-state helper可写。Accepted Say → Say replacement、same-Say
unchanged reconcile、readiness retry/source refresh与temporary root suspension均保留exact mode scalar/state identity；旧
frame/target attempt仍由其各自proof变为stale。Accepted choice/pause/custom/`presentation_barrier`或empty必须在
composite kernel同步notification前把non-normal state exact-CAS为fresh normal state，使随后kernel consumer无法在新
non-Say boundary捕获旧mode。该reset只能在evaluated proposal即将apply的bridge-owned pre-notify seam中
暂存；apply若未返回`applied`，只有current state仍是own provisional reset identity时才exact-CAS rollback到
原old state identity，使旧attempt恢复原有真实性，old cleanup不能ABA-clear任何reentrant successor
state。Schema/preflight rejection、stale/faulted apply与failed retry因此都保留旧mode。Bridge dispose先把mode
CAS回normal，再启动terminal composite notification；bridge/application/publisher-lease successor始终以fresh
normal state启动，old terminal authority不能把mode转移给successor。
Coordinator/application/composite若在bridge自身`disposeInternalV1()`之外先terminal，
`readPlaybackModeInternalV1()`只经已捕获的bridge/composite currentness fail closed投影`normal`，fresh issue为
`null`，pre-signed route也不得提交mode；无需为此安装listener或回写terminal private slot。旧bridge后续
恢复不属于有效lifecycle，新application/coordinator/lease只能经fresh bridge从`normal`开始。

本entry规定`.3c.1`不得新增mode subscriber、kernel lifecycle observer或mode-specific notification。Physical route的frozen
`toggled | ignored | stale | faulted`结果是当次action观察，bridge的
`readPlaybackModeInternalV1()`是后续Host/controller的read-only观察；S4.2才拥有Host侧的subscription、
render notification、full-reveal/`autoWaitMs`、skip stepping、deadline/remaining、suspend/resume generation与
same-transition semantic scheduling。四个family outcome都保持outer Input `consumed /
input.managed_surface_consumed`、Surface `unchanged / surface.action_routed`；lower handler、semantic/Base/gameplay
dispatch、Stage claim/evidence、topology与outer追加notification mutation全部为zero。Mode toggle/reset自身不写
PlayerProfile、Game State、Save、CommandLog、canonical/digest/replay/wire。

本entry当时冻结的`.3c.1` RED matrix如下，现已由下述implementation delivery闭合：

1. exact source-relative type/method signature、initial `normal`、bridge read total scalar、attempt/result freeze与exact own
   keys；borrowed issue为`null`、borrowed route继续抛
   `ui.narrative_stable_action_admission_invalid`；新类型与method spelling在UI root、`./internal`与package
   export均有type/runtime negative guard。
2. 六个Say transition、same-mode回normal、cross-mode single transition、result中next mode与repeat one-shot；
   two tokens from one state只有first CAS winner，`normal → auto → normal`与
   `normal → skip → normal` ABA token不能复活。
3. zero-key spoof/clone、foreign bridge/admission、wrong receiver/kind、already-spent、Auto token配Skip action、Skip token配
   Auto action与mode token配non-toggle action；所有unmapped probe/request mismatch不spend，foreign与own authentic
   token随后均可在自己correct route使用。Generic application/topology/lease/publication/gesture失败也在
   consumer前不spend。
4. exact ready-active Say toggled，choice/pause/custom/barrier authentic ignored并consumed，empty无admission，
   preparing/readiness gap/retained/suspended/terminal无issue；barrier上所有existing semantic/Say/voice issue均null，
   Stage acknowledgment/recovery state、semantic dispatch与notification保持exact zero。
5. Say → Say、same pending、retry/source refresh与suspension保留mode，但old target/frame attempt stale；Say →
   non-Say/empty在listener可观察前normal，failed proposal/apply用exact own provisional CAS rollback且不清
   successor；dispose notification前normal，fresh bridge/application/lease successor initial normal。Coordinator/application/
   composite先terminal时read fail closed normal、issue null、old token zero mode mutation，且不新增terminal listener。
6. `sayCallbackClaim`期间issue null、pre-signed correct route spent-stale、same-binding outer gate不spend、
   dispose/recreate cross-binding不能绕过；claim release后fresh toggle可用。`saySemanticInFlightClaim`不阻止
   toggle，toggle不安装/清理claim，不退役pre-signed manual/content-auto token，这些token随后仍可
   在各自exact authority上正常使用。
7. `10k` toggle/ABA/source-frame rotation下bridge仍只强持有one current mode-state，无attempt history、
   subscriber、timer或notification growth；mode action/reset的lower/semantic/Stage/Base/gameplay/topology delta精确为zero。

当时的implementation scope严格只允许
`engine/packages/ui/src/narrative/narrative-managed-surface-family.ts`、同目录family test与
`engine/packages/ui/src/public-api.test.ts` negative guard，交付收口时再更新owning active docs。不修改
Dialogue definition/catalog/revision（`player.toggle_auto | player.toggle_skip`已存在）、generic
Input/action/result/receipt、UI root、`./internal` barrel、package export、legacy `playback-controller.ts`/
`DialoguePanelV1`、Host/React/Web/live Story、Base、PlayerProfile、Save/Persistence、canonical/digest/replay/wire
或S4b。本切片不实现clock/profile read、timer/deadline/remaining、reveal cursor、skip policy/seen check、automatic
advance/skip semantic attempt、History intent/topology、Stage completion/recovery或public compatibility layer。

当时的停止条件是：`.3c.1`若需要arbitrary `setMode`、第二mode writer、React/controller-local authority、public/`./internal`或generic
contract expansion、mode subscriber/notification、timer/profile/semantic scheduling、把mode写入persistent/gameplay state、让
barrier mode admission读/改Stage或semantic authority，立即停止并修订合同。若non-Say/empty的normal reset无法在
bridge-owned proposal apply中以pre-notify provisional state + failed-apply exact-CAS rollback闭合，也必须停止；不得改成
apply返回后才reset，也不得用persistent kernel observer、revision counter或unbounded token history补洞。

本entry严格为docs-only：没有source、test、runtime、Host/live claimant或product/browser/build delivery
evidence，也不把既有focused/UI/full/check/browser/examples/prebuilt结果冒充本批验证。验证只要求
本文件`deno fmt --check`与`git diff --check`。`.3c.0`完成时曾把active current/next与implementation gate推进为
**S4.1b.1b.1b.2b.3c.1 bridge-owned Auto/Skip transient mode implementation**；该pointer现由下述delivery
历史化；随后`.2b.3d` broad checkpoint又由`.2b.3d.0` exact entry与`.2b.3d.1` implementation线性取代，
S4.2.1与S4.2.2.1又已由下述delivery关闭，原S4.2.2再由下述`.2.2.0`细分，原S4.2.2.2 broad Host
checkpoint又由`.2.2.2.0`细分，S4.2.2.2.1 DOM-free generic Host-commit atomic substrate与
S4.2.2.2.2 dormant Narrative React Host现也均已交付，S4.2.3.0 exact entry与S4.2.3.1 DOM-free generic
lifecycle substrate、S4.2.3.2 dormant Narrative close/input/root + History focus Host lifecycle及S4.2.4.3 dormant Host
player-view integration又已完成；原S4.2.5 broad checkpoint已由completed `.5.0`细分，原`.5.1`又已由`.5.1a`–`.5.1c`细分，`.5.1a`、`.5.1b`与`.5.1c`也均已完成；active
current/next、core slice与direct RED/implementation gate现已推进为PF5/M3 Save migration product surface（当前）。

**S4.1b.1b.1b.2b.3c.1 bridge-owned Auto/Skip transient mode implementation delivery（已完成）：**
Narrative bridge现以一个fresh frozen、own key exact only `mode`的private state identity作为Auto/Skip唯一writer；fresh
bridge从`normal`开始，`readPlaybackModeInternalV1()`只作total read-only scalar projection，并在bridge、composite、
coordinator或application terminal/currentness fault时fail closed为`normal`。每次effective Say toggle与需要的lifecycle
reset都只经同一exact-CAS helper安装fresh successor identity；没有numeric revision、第二writer、raw setter或mode subscriber。

既有physical admission新增frozen zero-key one-shot mode attempt。Package-private `WeakMap`把它绑定到exact issuing
admission、requested `auto | skip`、direct-target proof、target、source revision、admitted frame及issuance mode-state
identity，并只保留mutable `spent`。Generic application/topology/input/publication/gesture fence仍先于consumer；unmapped action、
Auto/Skip mismatch与mode token探测non-mode action都在spend前收口，spoof/clone、foreign/wrong-kind与repeat则按opaque provenance
返回stale。Correct authentic token进入consumer后立即spend并复验全部proof/frame/state；captured fault返回faulted且不partial
commit。Bridge不强持有attempt或history，caller释放WeakMap key后旧record/state可回收，production strong state保持O(1)。

Exact current ready-active Say已闭合六行转换：`normal + auto → auto`、`auto + auto → normal`、
`skip + auto → auto`、`normal + skip → skip`、`skip + skip → normal`与`auto + skip → skip`。每个winner都mint
fresh mode-state并返回canonical frozen `toggled`；同一issuance identity只有first token可CAS成功，scalar返回同名值也不能
ABA-revive旧token。Choice、pause、custom与`presentation_barrier`可签发authentic mode attempt，但correct route只spend后返回
canonical frozen `ignored`并保持normal；Barrier上的choice/pause/custom/Say/voice issue继续为`null`，route不读取或改变Stage
acknowledgment/recovery proof、semantic authority、runtime/topology或notification。

Accepted Say→Say replacement、same-pending、readiness failure/retry/source refresh与temporary root suspension保留exact mode-state
identity，但旧target/source/frame attempt仍stale。Accepted non-Say或empty在composite synchronous notification前先把non-normal
state exact-CAS到fresh normal；apply stale/faulted/non-applied或throw只在own provisional identity仍current时rollback到exact old
identity，不能清除listener安装的successor。Bridge disposal同样先terminal-reset为normal再通知；fresh bridge/application/lease
successor从fresh normal开始。该pre-notify reset、exact rollback、first-winner竞争与`10k` toggle/ABA churn均由
mutation-sensitive tests闭合。

Mode route只复用bridge-wide `sayCallbackClaim`作为同步callback-stack guard：claim存在时fresh issue为`null`，已进入correct
consumer的pre-signed token先spend再stale；route本身不安装、转移或清理该claim。它完全不读取或占用
`saySemanticInFlightClaim`，因此上一Say completion pending时仍可切换future mode；manual/content-auto/voice attempt也不会被
mode probe误spend，仍可在各自exact route使用。Mode path没有callback、semantic resolution、Base/gameplay dispatch、timer、
deadline、remaining、reveal cursor、automatic advance或skip stepping。

本delivery仍是source-relative dormant UI floor：implementation与mutation-sensitive coverage只落在Narrative family source、
同目录test及UI public-boundary negative test。新mode type、attempt/result与method spelling均未进入UI root、`./internal`
barrel或package export；generic Managed Surface/Input action/result/receipt、Dialogue definition/catalog、legacy playback controller/
`DialoguePanelV1`、Host/React/Web/live Story、PlayerProfile、Save/Persistence、canonical/digest/replay/wire与S4b均无扩张。
S4.2仍独占Host subscription、full-reveal/`autoWaitMs`、skip stepping、suspend/resume generation与same-transition semantic
scheduling。

验证通过focused `2 files / 153 tests`、UI `79 files / 1152 tests`、full `253 files / 4082 tests`与完整
`deno task check`。本批未重跑browser、examples或prebuilt；Engine browser `101 / 101`、examples
`45 passed / 2 skipped`与prebuilt Player `38 / 38`只作为prior evidence，不冒充本批HEAD验证。
`.2b.3c.1`完成时，active current/next曾推进为**S4.1b.1b.1b.2b.3d History exact-parent open intent floor**；
该broad checkpoint随后由下述`.3d.0` exact entry与`.3d.1` implementation线性取代并完成；原S4.2.4 broad checkpoint
又由completed docs-only `.4.0` exact entry重切，`.4.1` generic prepared state-install participant substrate、`.4.2` DOM-free
controller与`.4.3` dormant Host player-view integration现也均已完成；原S4.2.5 broad checkpoint已由completed `.5.0`细分，原`.5.1`又已由
`.5.1a`–`.5.1c`细分，`.5.1a`、`.5.1b`与`.5.1c`也均已完成。Active current/next、core slice与direct RED/implementation gate现均为
PF5/M3 Save migration product surface（当前），唯一有效顺序为S4.3 broad checkpoint（historical） → S4.3.0（docs-only，已完成） → S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）。

**S4.1b.1b.1b.2b.3d.0 History exact-parent open intent entry contract（docs-only，已完成的历史checkpoint）：**
`.2b.3d` broad floor只作为已细分的历史checkpoint保留；actual delivery线性拆为本`.3d.0` exact contract与
`.3d.1` implementation。本entry只冻结source-relative availability observation、authenticated physical route与
future exact-parent intent handoff，不把S4.2的Coordinator child transaction、Host或live consumer提前写成已实现能力。

History availability使用独立raw port
`NarrativeStableHistoryAvailabilityPortInternalV1`。Raw value必须是`Object.prototype`的ordinary object，且exact sole
own string key为own-data callable `readHistoryAvailabilityInternalV1(): boolean`；array、function、`null`、foreign/null
prototype、extra string/symbol key、accessor、inherited/missing/non-callable member及prototype/ownKeys/descriptor trap均不合法。
Candidate preflight descriptor-capture exact raw receiver与callable到package-private WeakMap binding
`{ receiver, readHistoryAvailability }`，admitted candidate snapshot只保存fresh frozen zero-own-key
`NarrativeStableCapturedHistoryAvailabilityPortInternalV1` handle，并把该field精确命名为`historyAvailabilityPort`。
Route不得重读raw object；捕获后删除、替换或把method改成accessor也不能转移authority。既有opaque
`historyObservationPort`保持原字段、原required-port语义与原identity，留给S4.2 History content observation；`.3d.1`
不得调用、替换或把它误当availability authority。

`historyAvailabilityPort`是新的required candidate port；missing resolver port沿用exact rejected row
`{ kind: "rejected", code: "narrative.required_port_missing", portId: "narrative.history_availability" }`与existing exact zero
delta。`NarrativeStableRequiredPortIdInternalV1`只增加`"narrative.history_availability"`。Present但malformed、descriptor
capture fault或trap沿用existing `{ kind: "faulted", code: "narrative.candidate_preflight_faulted" }`与exact zero delta，
不得新增History-specific rejection/fault code。Preflight rejection/fault都发生在source、runtime allocation、topology与
notification mutation前。

Physical attempt精确命名为frozen zero-own-key branded
`NarrativeStableHistoryOpenActionAttemptInternalV1`；future child capability精确命名为另一个fresh frozen zero-own-key branded
`NarrativeStableHistoryOpenIntentInternalV1`。Family result精确命名为
`NarrativeStableHistoryOpenDispatchResultInternalV1`，是以下exact frozen closed union：

```ts
export type NarrativeStableHistoryOpenDispatchResultInternalV1 =
  | Readonly<{
    readonly kind: "requested";
    readonly intent: NarrativeStableHistoryOpenIntentInternalV1;
    readonly completion: null;
  }>
  | Readonly<{ readonly kind: "ignored"; readonly completion: null }>
  | Readonly<{ readonly kind: "stale"; readonly completion: null }>
  | Readonly<{ readonly kind: "faulted"; readonly completion: null }>;
```

只有`requested`携带exact own-data `intent`；其own key exact为`kind | intent | completion`，其余三个canonical
singleton的own key exact为`kind | completion`。所有`completion`都exact为`null`，没有Promise、Coordinator receipt或generic
Surface delta。既有`NarrativeStablePhysicalActionDispatchResultInternalV1`只在source-relative union中加入该result；generic
Managed Surface/Input result与receipt不变。

既有`NarrativeStablePhysicalActionAdmissionInternalV1`只新增
`issueHistoryOpenAttemptInternalV1(): NarrativeStableHistoryOpenActionAttemptInternalV1 | null`；existing
`routeInternalV1(envelope, attempt)`把exact `player.toggle_history`映射为family-private `history_open`，不新增第二binding、route、
controller或standalone dispatch/intent-redemption method。Issue沿用exact receiver guard，只在same admission仍current、bridge active、
existing stable action/input contract与direct-target proof current、exact direct Dialogue parent为ready-active、source/frame/
`historyAvailabilityPort` handle exact、existing `sayCallbackClaim === null`且existing
`saySemanticInFlightClaim === null`时mint attempt；它不调用availability callable。`say | choice | pause | custom |
presentation_barrier`五种current Dialogue pending均可issue，History availability/topology不得按pending kind分叉；empty、preparing、
gap、retained、suspended、terminal、disposed或non-Dialogue input owner均返回`null`。

Attempt的package-private WeakMap record own fields exact为`kind: "history_open"`、exact issuing physical
`authority`、existing `stableActionAuthority`、`targetProof`、`directParent`、`sourceRevision`、`frame`、
`historyAvailabilityPort`与mutable `spent`。它不保存raw availability/observation port、Coordinator、History
occurrence/instance、numeric revision、timer或subscriber。Future intent的separate WeakMap record own fields exact为`bridge`、
`stableActionAuthority`、`targetProof`、`directParent`、`sourceRevision`、`frame`与mutable `spent`；proof已private绑定kernel、
application epoch、topology revision与ready runtime instance，不复制或暴露这些identity scalar。Intent不绑定
physical-admission lifetime；mint后仅dispose/recreate该admission不使它失效，但parent replacement/preparation、source retry、
suspension（即使随后resume）、empty及application/coordinator/bridge terminal会使future redemption stale。Bridge/admission不
strong-hold attempt、intent、current-intent slot或历史；caller释放token后WeakMap record可回收，production retained state保持O(1)。

Ordered precedence固定如下：

1. Existing contract-bound route先验证application epoch、topology/instance、input owner、routing lease、static action catalog、
   input publication与gesture。若consumer未进入，`consumerResult` exact为`null`，attempt不spent，existing outer Input/Surface
   result保持权威。
2. Consumer先映射action再认证attempt。Same-admission unspent History token探测任何non-History mapped action，或
   same-admission unspent other-kind token探测`player.toggle_history`，都返回existing physical `unmapped`且不spend，随后correct
   route仍可用；spoof、frozen structural clone、unrecognized token、foreign bridge/admission、disposed predecessor与repeat token返回
   History `stale`。只有same-admission correct-kind unspent identity可继续，并在任何callback/availability read前立即把`spent`改为
   `true`。
3. Spent winner依次重验physical admission claim/active bridge、existing stable action authority与direct-target proof、current stable
   input contract、exact `directParent`、source revision、frame与captured availability handle。Identity/currentness mismatch为
   `stale`；authority capture/inspection throw或existing captured binding内部不合法为`faulted`。然后要求existing
   `sayCallbackClaim`与`saySemanticInFlightClaim`仍均为`null`；conflict使本attempt保持spent并返回`stale`。
4. Winner mint fresh frozen zero-key callback token，以exact identity CAS安装到existing bridge-wide `sayCallbackClaim`，随后重复
   admission/proof/parent/source/frame/handle及`bridgeRecord.saySemanticInFlightClaim === null`复验；仍current才以captured
   receiver调用captured `readHistoryAvailabilityInternalV1` exactly once。History不得安装、转移、spend或清理
   `saySemanticInFlightClaim`。Callback claim覆盖整个call与post-call recheck；existing claim-aware Say manual/content-auto/voice/mode及
   nested History路径继续共享这一个synchronous fence，不新增parallel History callback slot。
5. Callback后先再次重验同一admission/proof/parent/source/frame/handle、own callback token与semantic-in-flight null，再解释
   outcome；因此callback内dispose/successor、suspension、source/frame replacement或claim displacement固定以`stale`优先于
   throw/return。仍current时exact `false`返回canonical `ignored`，throw或任意non-boolean返回canonical `faulted`，exact `true`
   才mint fresh intent record与`requested` result；intent/result construction fault返回`faulted`且不得泄漏half-authorized intent，
   return前还要完成最后currentness gate。`finally`只有在`bridgeRecord.sayCallbackClaim === ownToken`时才清理；old/foreign
   cleanup不得ABA-clear successor token，admission dispose与bridge teardown也不主动清理或转移该claim。

`requested | ignored | stale | faulted`四个family outcome都由已认证route包裹为Input consumed、Surface unchanged；本History
consumer自身向lower context、History/Coordinator topology、semantic resolution、Base/gameplay dispatch、Stage
acknowledgment/recovery、runtime与notification追加的delta均为zero。Callback内其他already-authorized nested operation仍由各自
existing contract拥有其exact delta，`.3d.1`不为choice/pause/custom/barrier retroactively增加`sayCallbackClaim`检查；任一nested
operation若改变parent/source/frame，History outer postcheck固定返回stale。`presentation_barrier`上的availability true可以返回
`requested`、false可以返回`ignored`，但History path自身不得读取、调用或改变Stage claimant、acknowledgment/recovery proof或
semantic authority。Input consumed来自static catalog与authenticated route，不是第五个family result kind；all-operation
same-transition serialization继续由S4.2拥有。

`.3d.1`只mint future one-use intent：一个physical attempt最多返回一个intent，intent private record以`spent: false`保留future
redemption state，但本切片没有claim/inspect/consume/redeem method，也不声称已测试intent redemption。S4.2必须在同一个
composition/Coordinator exact-parent transition内原子重验intent的bridge/action authority/proof/direct parent/source/frame、
one-shot spend并prepare/open exact History child；不得先spend再异步或分步尝试topology mutation。Clone、foreign、repeat、parent
replacement及open-first-win的redemption tests也属于S4.2。若`.3d.1` acceptance要求现在可观察redemption，必须停止并重新切分，
不能为测试方便新增raw-parent inspector、separate claim token或提前调用Coordinator。

`.3d.1`的mutation-sensitive RED matrix至少覆盖：

1. raw availability port exact descriptor matrix、new required-port missing row、malformed/trap existing fault row与exact zero delta；
   captured handle frozen zero-key，raw member后改、删除/accessor replacement仍调用original receiver/callable；opaque
   `historyObservationPort`完全不被读取或改写；
2. 五种ready-active Dialogue pending的issue与route：boolean `true`为fresh exact requested/intent，`false`为canonical ignored，
   throw/non-boolean为canonical faulted；callback exact once，result/attempt/intent frozen exact own-key shape，所有completion null；
3. wrong receiver、spoof/clone/proxy、foreign bridge/admission、disposed/recreated admission、repeat及cross-kind/cross-action；
   mapping-before-spend mismatch可用correct route恢复，correct mapped token则在claim/currentness conflict前spend；
4. target/source/frame/handle replacement、readiness retry、preparing/retained/suspension/terminal、application/topology successor、bridge
   dispose与ABA away/back；same serialized pending bytes不能恢复old proof/token；
5. preexisting callback/semantic-in-flight claim使issue为`null`，pre-signed correct route为spent-stale；availability callback中的
   nested History与existing claim-aware Say manual/content-auto/voice/mode competitor、source/frame replacement、dispose/successor及
   post-call stale-over-outcome precedence；own-token cleanup不能清除successor claim，claim release后fresh attempt仍可用；
6. `presentation_barrier` true/false/throw/non-boolean及source drift都证明History path对Stage acknowledgment/recovery、semantic、
   runtime、topology、notification的outer-added delta为zero；choice/pause/custom/Say同样证明History path不自行形成semantic/
   gameplay dispatch，authorized nested operation的existing exact delta与outer stale另行断言；
7. `10k` issue/route/ABA churn不建立strong attempt/intent history、current-intent slot、subscriber、timer、deadline或tombstone，bridge
   production retained state为O(1)；
8. UI root与`./internal`同时对raw/captured availability port、attempt、intent、result及
   `readHistoryAvailabilityInternalV1`/`issueHistoryOpenAttemptInternalV1` spelling做type/runtime negative guard；barrel、package export、
   live/legacy/generic inventory exact zero diff。

Real stop固定为：availability若需要async Promise、subscription、getter、React/controller-local writable mirror、polling/timer或
pending-kind-specific Story business rule，先修订合同并留S4.2；exact-parent intent若需要向caller暴露raw Coordinator、parent target/
occurrence/instance/source/lease、扩大generic/public result/receipt/barrel或新增separate redemption API，立即停止；若existing stable
action/direct-target/frame seam不足而必须新增generic ready proof/public authority，立即停止；若不能复用existing bridge-wide
`sayCallbackClaim`并要求parallel History slot，立即停止。任何History occurrence/instance allocation、prepare/open/close、active
History的`player.toggle_history | ui.cancel`、focus restore、dismiss、root suspension、timer/remaining coordination、Host/React/Web/
Engine Lab/live Story claimant均仍由S4.2/S4.3拥有，不得进入`.3d.1`。

本entry不修改Dialogue/History definition、revision或catalog（History继续exact `ui.cancel | player.toggle_history`），不删除generic
input ID，不接legacy `DialoguePanelV1` local boolean，不改变Base interaction、PlayerProfile、Save/Persistence、canonical/digest/replay/
wire、S4b或live feature documentation；也不新增source、test、runtime、Host/live claimant或product/browser/build delivery evidence。
验证只要求本设计文档`deno fmt --check`与`git diff --check`，既有focused/UI/full/check/browser/examples/prebuilt结果均不得冒充本
docs-only checkpoint的新证据。`.3d.0`现已完成；active current/next与implementation gate均推进为
**S4.1b.1b.1b.2b.3d.1 History exact-parent open intent implementation**；该pointer现由下述delivery
历史化。

**S4.1b.1b.1b.2b.3d.1 History exact-parent open intent implementation delivery（已完成）：**
Narrative candidate preflight现把独立raw
`NarrativeStableHistoryAvailabilityPortInternalV1`按exact ordinary-object/sole own-data callable合同descriptor-capture到
package-private binding，并只把fresh frozen zero-own-key
`NarrativeStableCapturedHistoryAvailabilityPortInternalV1` handle保存到candidate snapshot。既有opaque
`historyObservationPort`的字段、required-port语义与identity保持不变，History availability route不读取或替换它。
`NarrativeStableRequiredPortIdInternalV1`只增加`narrative.history_availability`；missing与present-but-malformed仍分别沿用
existing required-port rejection与candidate-preflight fault，保持pre-publication zero delta。

Exact current ready-active Dialogue的`say | choice | pause | custom | presentation_barrier`五种pending均可经physical
admission签发fresh frozen zero-key `NarrativeStableHistoryOpenActionAttemptInternalV1`。Package-private WeakMap把one-shot
attempt绑定到issuing authority、stable action authority、direct-target proof、exact parent、source/frame与captured availability
handle，并只保留mutable `spent`。Existing route把authenticated `player.toggle_history`映射到family-private
`history_open`；application/topology/input/publication/gesture generic fence仍先于consumer与spend，cross-action/cross-kind mapping
mismatch保持unmapped/unspent，只有correct same-admission token才在callback前不可逆spend。

Winner复验全部authority/proof/parent/source/frame/handle后，复用bridge-wide `sayCallbackClaim`，以own-token exact CAS覆盖
availability call与post-call gate；existing `saySemanticInFlightClaim`只作必须为`null`的read fence，History path不安装、转移或
清理semantic claim。Captured receiver/callable exactly once；callback后的parent/source/frame/handle、callback token或semantic
claim drift固定以`stale`优先于throw/return。仍current的`false`返回canonical `ignored`，throw或non-boolean返回canonical
`faulted`；只有`true`且最后currentness gate通过后才mint fresh frozen zero-key
`NarrativeStableHistoryOpenIntentInternalV1`及exact `requested` result。`finally`只在claim仍为own token时exact-CAS释放，不能
ABA-clear successor claim。

Fresh intent只由separate WeakMap保存future one-use provenance与`spent: false`；本delivery没有claim/inspect/consume/redeem
method，也没有验证或声称intent redemption。S4.2仍必须在一个Coordinator exact-parent transaction内原子重验、spend并
prepare/open History child。History route自身在Barrier及其余四种pending上的Stage/semantic/gameplay/runtime/topology/
notification delta均为zero；authorized nested operation仍只拥有自身existing exact delta，outer History postcheck可stale但不追加
第二份delta。`10k` churn覆盖证明bridge不强持有attempt/intent history、current-intent slot、subscriber、timer或tombstone，
production retained state保持O(1)。

本delivery仍是source-relative dormant UI floor：没有History occurrence/instance allocation、intent redemption、Coordinator child
mutation、Host/React/Web/live claimant或public/`./internal`/package/generic Surface与Input contract扩张。验证通过focused
`2 files / 189 tests`、UI `79 files / 1188 tests`、full `253 files / 4118 tests`与完整`deno task check`。本批未重跑
browser、examples或prebuilt；Engine browser `101 / 101`、examples `45 passed / 2 skipped`与prebuilt Player `38 / 38`只作为
prior evidence，不冒充本批HEAD验证。`.3d.1`现已完成；原S4.2 broad entry只作superseded historical
checkpoint；该delivery当时把active current/next推进为**S4.2.1**，该pointer现又由下述S4.2.1与S4.2.2.1
implementation delivery、S4.2.2.2.0 exact entry及S4.2.2.2.2 implementation delivery历史化。当前有效顺序为
**S4.2.3.0（已完成）→ S4.2.3.1（已完成）→ S4.2.3.2（已完成）→
S4.2.4.0（docs-only，已完成）→ S4.2.4.1（已完成）→ S4.2.4.2（已完成）→ S4.2.4.3（已完成）→
S4.2.5 broad checkpoint（historical）→ S4.2.5.0（docs-only，已完成）→ S4.2.5.1 broad checkpoint（historical）→
S4.2.5.1a（已完成）→ S4.2.5.1b（已完成）→ S4.2.5.1c（已完成）→ S4.3 broad checkpoint（historical） → S4.3.0（docs-only，已完成） → S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）**。

**S4.2.0 dormant Narrative execution split（docs-only，已完成）：** 原S4.2只作为已被本exact
entry细分的historical broad checkpoint保留，不再是可直接进入RED或implementation的delivery。唯一线性顺序冻结为：

1. **S4.2.0（本entry，已完成）**：只冻结execution split、S4.2.1 exact source-relative contract、RED与停止条件；
2. **S4.2.1（已完成）**：History intent redemption + stable-parent transient-child preparation；
3. **S4.2.2（已被细分的historical broad checkpoint）**：不再直接进入RED；
4. **S4.2.2.0（docs-only，已完成）**：冻结session/readiness的exact split；
5. **S4.2.2.1（已完成）**：DOM-free Narrative session、single Host lease与root + History readiness observation；
6. **S4.2.2.2（已由`.2.2.2.0`细分的historical broad checkpoint）**：不再直接进入RED；
7. **S4.2.2.2.0（docs-only，已完成）**：冻结atomic core与React Host exact split；
8. **S4.2.2.2.1 DOM-free generic Host-commit atomic substrate（已完成）**：guarded readiness、prepared input与generic
   exact-child action authority；
9. **S4.2.2.2.2 dormant Narrative React Host（已完成）**：renderer/History observation、Host commit与terminal cleanup；
10. **S4.2.3 broad checkpoint（已由`.3.0`细分）**：不再直接进入RED；
11. **S4.2.3.0 History close/dismiss/input/focus exact-entry contract（docs-only，已完成）**：冻结
    exact contract、scope、RED与停止条件；
12. **S4.2.3.1 DOM-free generic exact History-child lifecycle substrate（已完成）**：交付same-claimant exact
    close/dismiss authority、nonnull root-binding commit token与generic fence内的atomic install；
13. **S4.2.3.2 dormant Narrative close/input/root + History focus Host lifecycle（已完成）**：交付family candidate-bound
    close controller、managed input、Dialogue root与History DOM focus/trap、dismiss及opener restore；
14. **S4.2.4 broad checkpoint（已由`.4.0`细分）**：不再直接进入RED；
15. **S4.2.4.0 exact Dialogue player timing/suspension entry（docs-only，已完成）**：冻结exact contract、split、RED、scope与stop；
16. **S4.2.4.1 generic prepared state-install participant substrate（已完成）**：交付generic assignment participant；
17. **S4.2.4.2 DOM-free Narrative DialoguePlayerController core（已完成）**：交付clock、policy、reveal、automatic dispatch与remaining core；
18. **S4.2.4.3 dormant Host player-view integration（已完成）**：交付Host observation、renderer player-view materialization与真实suspend/resume；
19. **S4.2.5 broad checkpoint（已由`.5.0`细分的historical entry）**：不再直接进入RED；
20. **S4.2.5.0（docs-only，已完成）**：冻结dormant Engine Lab Narrative conformance exact entry；
21. **S4.2.5.1 broad implementation checkpoint（已由`.5.1a`–`.5.1c`细分的historical entry）**：不再直接进入RED；
22. **S4.2.5.1a managed InputRouter facade corrective（已完成）**：交付exact public-facade managed registrar link；
23. **S4.2.5.1b Host physical ingress corrective（已完成）**：交付Host exact stable gesture callback handoff；
24. **S4.2.5.1c dormant Engine Lab Narrative conformance implementation（已完成）**：交付dormant rig与Engine Lab opt-in；
25. **S4.3 broad checkpoint（historical）**：已由`.3.0` exact entry细分，不再直接进入RED；
26. **S4.3.0 production Narrative atomic-cutover exact entry（docs-only，已完成）**：冻结public declaration、shared-kernel、
    choice observation、Stage binding、atomic deletion、promotion与stop；
27. **S4.3.1a composition-owned shared-kernel substrate（已完成；historical）**：已交付package-internal production binding；
28. **S4.3.1b tracked-consumer atomic cutover and promotion（已完成；historical）**：已同批迁移四Story、删除旧writer/export并完成promotion；
29. **S4b broad checkpoint（historical）**：只保留方向，不再直接进入RED；
30. **S4b.0 whole-canvas exact entry（docs-only，已完成）**：冻结exact contract与三批implementation boundary；
31. **S4b.1a whole-canvas family + routed-input substrate（已完成；historical）**：后续独立family boundary。
32. **S4b.1b dormant production composition/Host/GameStage substrate（已完成；historical）**：保持独立merge boundary。
33. **S4b.1c atomic cutover、consumers与promotion（已完成；historical）**：保持独立merge boundary。

S4.2.1严格只把`.3d.1`已mint的one-use History intent原子兑换为一个History transient child的
`preparing`安装；不创建Narrative Host/session/lease，不settle ready/fail，不close/dismiss，不接managed input/focus，
不恢复opener，不创建timer/deadline/remaining/controller，不迁移Engine Lab/live Story。Admission recreation与本切片无关：
redemption只使用intent中既有的exact bridge/parent/source/frame provenance与current composite state，不重建physical
admission、action attempt或availability callback。

**S4.2.1 generic cross-axis authority：** package-internal source-relative seam的exact spelling为
`ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1`，claim spelling为
`claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(kernel, exactClaimant)`。同一个
`ManagedSurfaceStableCompositeRuntimeKernelInternalV1`上只接受一个exact claimant identity；foreign kernel、different
claimant、clone/spoof、borrowed method或重复不一致claim都在读取input前抛
`ui.managed_surface_stable_exact_parent_transient_child_claim_invalid`；same kernel + same claimant重复claim必须返回same
retained authority。该claimant不是每个publisher bridge新mint的lease：它由
Narrative-family composition私有地按composite kernel缓存，并由同一kernel上的publisher bridge successor复用。没有
release、transfer或claimant handoff；每个Narrative lifecycle仍绑定当时的exact active bridge，因此disposed predecessor
lifecycle/intent为`stale`，fresh successor lifecycle可用同一composition claimant重新取得同一authority。

S4.2.1中的authority是exact one-method object，只拥有
`prepareExactParentTransientChildInternalV1(input)`。Input exact fields为`parentProof`、`expectedParent`、
`expectedSourceRevision`、`definition`、`semanticOccurrenceId`与`commitGuard`；它们分别是intent已捕获的
`ManagedSurfaceStableDirectActionTargetProofInternalV1`、authenticated stable admitted parent、exact source revision、resolved
transient child definition、固定为`null`的semantic occurrence与commit guard。`commitGuard`是frozen exact one-method
`ManagedSurfaceStableExactParentTransientChildCommitGuardInternalV1`，其sole own string key为own-data callable
`commitInternalV1(candidate: ManagedSurfaceStableExactParentTransientChildCandidateInternalV1): boolean`，无
symbol/extra/inherited/accessor key。Authority descriptor-capture exact guard receiver与callable；它不接受bare/arbitrary
callback、generic operation、receipt或Coordinator facade。

Pure planning只经narrow source-relative reducer helper
`deriveManagedSurfaceReducerCrossAxisChildPreparationInternalV1(input)`完成。Helper必须从同一current composite snapshot
验证：

- direct parent仍是exact authenticated stable `ready` + `active` runtime instance；
- child definition是resolved `placement: "child"` definition，owner/layer与exact resolved child slot均匹配该parent；
- exact `(parent instance, child slot)`为空且History cardinality为zero；
- child target occurrence、surface instance、routing lease与identity allocation由同一composite authority分配，且allocation
  只在可安装plan中出现；
- proposed transient publication中的`parentInstanceId`精确等于该stable ready-instance的
  `surfaceInstanceId`。

Stable parent刻意不出现在`ManagedSurfaceReducerStateV1.publication`的transient instances中；上述
`parentInstanceId`因此是cross-axis link，不是transient-parent evidence。Generic `ManagedSurfaceCoordinatorV1`/
`pushTransientChild`不能构造、认证或伪造这个link。Composite authority必须以stable runtime binding + transient publication的
structural derivation认证它；若现有结构足够，implementation不得新增persistent cross-axis collection。只有implementation能证明
结构推导不足时才停止并修订合同，不能预先mandate第二个topology store。

Helper完成pure plan后，authority为该plan mint fresh frozen exact zero-key
`ManagedSurfaceStableExactParentTransientChildCandidateInternalV1`，其source-private record绑定exact child published instance、
readiness authority与cross-axis provenance；随后必须先调用既有
`prepareStateInstallInternalV1(expectedState, nextState)`。Authority只把descriptor-captured
`commitInternalV1(candidate)`收窄为`commitPreparedStateInstallInternalV1`的gate，并让该gate在state assignment之前立即执行。
Gate唯一允许的effect是Narrative intent record上的no-throw exact CAS `spent: false → true`；不得dispatch、notify、allocate、
call user code、settle readiness或修改其他state。Gate返回`false`、current state/parent/proof/slot drift或prepared token stale时，
assignment不发生且intent不spend。只有既有prepared-state install的`installed`路径可以执行并赢得CAS；family boundary将该成功
canonical map为`preparing`。任何plan-time fault在proof仍current时保持intent retryable。

Authority的source-relative result exact name为
`ManagedSurfaceStableExactParentTransientChildPreparationResultInternalV1`，且只有fresh frozen
`{ kind: "installed", candidate }`、canonical frozen `{ kind: "stale" }`与`{ kind: "faulted" }`三行；own keys分别exact为
`kind | candidate`、`kind`、`kind`。Candidate与result不得加入UI root、`./internal` barrel、package export、generic stable
result table或public receipt，也不得把raw kernel/claimant/proof/parent/instance/readiness返回Narrative caller。

**S4.2.1 Narrative boundary：** exact source-relative types/functions为
`NarrativeStableHistoryChildLifecycleInternalV1`、
`createNarrativeStableHistoryChildLifecycleInternalV1({ bridge })`、zero-key opaque
`NarrativeStableHistoryChildPreparationInternalV1`与lifecycle method
`redeemHistoryOpenIntentInternalV1(intent)`。Factory必须取得上述per-kernel composition claimant/authority并绑定exact
active `NarrativeStablePublisherBridgeInternalV1`，composite kernel只能从private bridge record推导，不能作为redundant caller
input；foreign/terminal bridge或predecessor lifecycle均fail closed，不能通过successor bridge复活old intent。

Family result exact canonical shape为：

```ts
export type NarrativeStableHistoryChildPreparationResultInternalV1 =
  | Readonly<{
    readonly kind: "preparing";
    readonly preparation: NarrativeStableHistoryChildPreparationInternalV1;
    readonly completion: null;
  }>
  | Readonly<{ readonly kind: "stale"; readonly completion: null }>
  | Readonly<{ readonly kind: "faulted"; readonly completion: null }>;

export interface NarrativeStableHistoryChildLifecycleInternalV1 {
  redeemHistoryOpenIntentInternalV1(
    intent: unknown,
  ): NarrativeStableHistoryChildPreparationResultInternalV1;
}
```

`NarrativeStableHistoryChildPreparationInternalV1`运行时必须是fresh frozen exact zero-key object；private WeakMap只把它绑定
到exact lifecycle/bridge/kernel、intent、parent与generic candidate；candidate private record再持有child instance/readiness
authority。S4.2.1没有preparation method，且所有
result的`completion`固定为`null`。S4.2.2.2.1以后才可由same exact claimant另领独立readiness authority并冻结ready/fail method；
S4.2.3再冻结close/dismiss。不得让later lifecycle另建第二writer或绕过本authority。

Invalid/spoof/clone/foreign/already-spent intent、wrong lifecycle/bridge/kernel、disposed predecessor、parent/source/frame/proof
drift、parent非ready-active、definition/slot mismatch、slot occupied/cardinality conflict、planning rejection/fault、prepared
install stale或commit abort，都必须保持intent `spent: false`、child allocation/install/notification为zero；若intent本来已spent，
repeat只返回`stale`且无delta。只有successful installed preparation同时spend一次intent、安装一个child并返回一个opaque
preparation；两个valid redemptions竞争同一vacancy时only one可赢，loser不spend但其topology-bound proof已永久stale；child后来
关闭也不能复活old intent，fresh vacancy必须重新mint fresh intent。

**Whole-composite provenance/cascade：** 每次whole-composite reflow、state construction与install validation都必须验证cross-axis
History link的exact parent instance、resolved slot、owner/layer、at-most-one cardinality及shared application/composite identity。
Same exact ready parent被retain时child可retain；parent replacement仍处于retained-predecessor/failure gap且旧parent仍是current
ready instance时，child继续只属于旧parent。Successful cutover不得把child reparent到fresh stable instance：旧parent及其History
child须在同一reflow retire，fresh parent只能通过fresh intent开fresh child。Parent failure without retained ready predecessor、
stable empty、publisher/bridge disposal、composite terminal及application successor都须在同一state transition cascade移除child、
readiness/private authority与其topology/input/focus provenance；不得留下orphan、跨epoch link或late cleanup可作用的successor。

S4.2.1的mutation-sensitive **RED matrix**至少覆盖：

1. exact authority/claimant/guard/generic candidate+result/factory/lifecycle/Narrative preparation+result shapes、claimed
   `(kernel, exactClaimant)` exclusivity、same-kernel
   bridge-successor claimant reuse，以及root/`./internal`/package runtime + type negative guards；
2. stable parent absent于transient publication仍能经composite-only proof安装cross-axis child；generic Coordinator无法fabricate，
   wrong parent/proof/definition/slot/owner/layer/cardinality全部zero delta；
3. successful redemption只新增one shared-identity child，exact `parentInstanceId`、`preparing/child_open` readiness、publication/
   topology revision与one composite notification；listener观察到的同一installed state已同时是intent spent、History preparing、
   parent按topology policy suspended，且transient notification先于composite state notification；
4. invalid/stale/spent/foreign intent、occupied slot、plan reject/fault、state drift、gate false与gate CAS loss均zero spend/install/
   notification；current proof上的plan fault可用same intent retry，installed path alone spends；
5. two intents/ABA/reentrant listener/bridge dispose + same-kernel successor、application/kernel successor与open-first-wins；physical
   admission recreation既不需要也不能改变winner；
6. exact-parent retain、replacement preparation/failure/successful cutover、stable empty、publisher/bridge dispose与composite terminal
   的whole-reflow cascade，无orphan/reparent/late-cleanup successor mutation；
7. `10k` invalid/retry/success/dispose churn下无intent/preparation/claimant history、subscriber、tombstone或second topology store
   growth，released WeakMap keys可回收；
8. History observation callback只在`.3d.1` mint intent时运行；redemption不再调用availability/semantic/Base/gameplay，且
   Host/readiness settle/close/dismiss/input/focus/timer/live consumer delta精确为zero。

S4.2.1 expected implementation/test scope精确限制为以下**7 files**：

- `engine/packages/ui/src/managed-surfaces/managed-surface-reducer.ts`；
- `engine/packages/ui/src/managed-surfaces/managed-surface-reducer.test.ts`；
- `engine/packages/ui/src/managed-surfaces/managed-surface-stable-composite-state.ts`；
- `engine/packages/ui/src/managed-surfaces/managed-surface-stable-composite-state.test.ts`；
- `engine/packages/ui/src/narrative/narrative-managed-surface-family.ts`；
- `engine/packages/ui/src/narrative/narrative-managed-surface-family.test.ts`；
- `engine/packages/ui/src/public-api.test.ts`。

若implementation需要`ManagedSurfaceOperationV1`新variant、public/generic Coordinator method、generic receipt/result expansion、
把stable root镜像进transient publication、persistent second topology/cross-axis collection、raw parent/target/instance/proof/kernel/
Coordinator/readiness exposure、publisher bridge redemption method、physical admission recreation、intent新增method/key，立即停止并
修订合同。若spend与state install不能由assignment前immediate no-throw gate原子闭合，或必须先spend再async/rollback，也必须停止。
若History preparation、parent suspension、publication/topology/install/notification不能成为one composite transition，或
retain/failure/cutover/empty/dispose cascade不能whole-reflow闭合，同样停止；不得借机实现S4.2.2.1 session/lease、S4.2.2.2.1
readiness/input core、S4.2.2.2.2 Host、S4.2.3
close/input/focus、S4.2.4 timer/controller、S4.2.5.1c Engine Lab、S4.3 live cutover，亦不修改legacy/public barrel、Base、
PlayerProfile、Save/Persistence/canonical/digest/replay/wire或S4b。

本S4.2.0 amendment严格为docs-only：没有source、test、runtime、Host/live claimant、browser/examples/prebuilt或product delivery
evidence，也不把先前matrix冒充本entry验证。验证只要求本文件`deno fmt --check`与`git diff --check`。该docs-only
entry完成时唯一active current/next与direct RED gate均为**S4.2.1**；该pointer现由下述delivery历史化。

**S4.2.1 History atomic cross-axis preparation implementation delivery（已完成的历史checkpoint）：**
Reducer现以唯一source-relative pure helper
`deriveManagedSurfaceReducerCrossAxisChildPreparationInternalV1()`接受composite已认证的stable parent projection与fresh
History candidate，逐项验证child placement、owner、exact layer identity/order、resolved slot、`single` cardinality、vacancy与
shared identity cursor，再构造transient `preparing / child_open` instance。Stable parent仍不进入transient publication；child
`parentInstanceId`只引用exact stable ready-instance ID。Ordinary `reduceManagedSurfaceV1({ kind: "prepare_child" })`与generic
Coordinator没有新增operation、parent evidence或API，不能用copied/raw ID伪造该cross-axis link。

Composite侧交付source-relative
`ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1`与
`claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(kernel, exactClaimant)`：每个kernel只接受一个exact
composition claimant，same claimant重复claim复用frozen retained authority，foreign claimant在读取input前fail closed。Authority
认证exact direct ready-active stable proof/parent/source，pure-plan完整successor，再经existing
`prepareStateInstallInternalV1()`与`commitPreparedStateInstallInternalV1()`提交。Descriptor-captured Narrative guard只做candidate
capture与intent `spent: false → true` exact CAS；guard exact `true`后，composite用预捕获no-throw WeakMap setter在assignment前登记
candidate provenance。只有prepared install的`installed`路径spend；false/non-boolean/throw、stale token、capacity/coherence/reducer
fault均保持state identity、shared high-water、publication/topology、candidate record与notification exact zero。

Whole-composite structural validation现把authenticated external `parentInstanceId`作为唯一cross-axis parent edge，复验exact stable
instance、shared identity、owner/layer、resolved slot与single cardinality，并让History blocking fallback在同一install suspend
Dialogue root。Replacement preparation与failure identity-exact retain旧root + History；ready cutover、greater-empty、publisher disposal与
Coordinator terminal在同一composite successor cascade-retire旧root的History subtree，不reparent、不留下orphan，也未新增persistent
cross-axis collection。

Narrative侧交付bridge-bound frozen `NarrativeStableHistoryChildLifecycleInternalV1`、exact `{ bridge }` factory、one-shot
`redeemHistoryOpenIntentInternalV1()`与fresh zero-key opaque
`NarrativeStableHistoryChildPreparationInternalV1`。Composition claimant/authority按kernel私有缓存并由same-kernel publisher bridge
successor复用；每个lifecycle仍绑定exact active bridge，因此predecessor lifecycle/intent保持stale。只有generic `installed`映射为fresh
family `{ kind: "preparing", preparation, completion: null }`；`stale | faulted`为canonical bounded identity。Redemption不重调History
availability，不dispatch semantic/Base/gameplay，也没有提前交付Host/readiness/close/input/focus/timer或live consumer。

Delivery严格保持上述seven-file scope；UI root、`./internal` barrel与package runtime/type negative guards已覆盖全部新name，没有扩大
`ManagedSurfaceOperationV1`、generic Coordinator/result/receipt、public/package export或live graph。验证通过focused
`4 files / 297 tests`、UI `79 files / 1211 tests`、full `253 files / 4141 tests`，以及typecheck、lint、fmt、
`git diff --check`与完整`deno task check`。第一次full run出现一个与本切片无关的Engine Lab timer flake；该test isolated rerun通过，随后full rerun
全绿。Browser、examples与prebuilt本批未重跑；Engine browser `101 / 101`、examples `45 passed / 2 skipped`与prebuilt Player
`38 / 38`只作prior evidence，不冒充本delivery的HEAD验证。

S4.2.1现只作为completed historical checkpoint保留。原S4.2.2 broad checkpoint又由下述exact entry细分。

**S4.2.2.0 Narrative session/readiness exact entry（docs-only，已完成）：** current checkout已经有S4.2.1
cross-axis History preparation，却没有exact Narrative session、Host lease、root preparation token、readiness snapshot或React Host
renderer boundary。System Host、legacy `DialoguePanelV1`/`VnLayerV1`与live GameStage portal都不是可默推的Narrative合同；尤其既有
action-binding factory会立即替换router current binding，不能在retained predecessor仍active时作为ready前candidate registration。
因此原S4.2.2不直接进入RED，而按下列唯一顺序细分：

1. **S4.2.2.0（本entry，docs-only，已完成）**：冻结`.1` exact DOM-free contract，并界定`.2`必须另行冻结的React/input/focus
   boundary；
2. **S4.2.2.1（已完成）**：只交付DOM-free Narrative session、single logical Host lease、session-owned History lifecycle、
   root/History preparation observation与bounded subscription；不settle ready/fail，不创建input binding；
3. **S4.2.2.2（已由`.2.2.2.0`细分的historical broad checkpoint）**：不再直接进入RED；
4. **S4.2.2.2.0（docs-only，已完成）**：冻结generic atomic substrate与Narrative React Host exact split；
5. **S4.2.2.2.1 DOM-free generic Host-commit atomic substrate（已完成）**：交付guarded readiness、prepared input与generic
   exact-child action authority；
6. **S4.2.2.2.2 dormant Narrative React Host（已完成）**：交付renderer/History observation、Host commit与terminal cleanup；
7. **S4.2.3.0（docs-only，已完成）→ S4.2.3.1（已完成）→ S4.2.3.2（已完成）→
   S4.2.4.0（docs-only，已完成）→ S4.2.4.1（已完成）→ S4.2.4.2（已完成）→ S4.2.4.3（已完成）→
   S4.2.5 broad checkpoint（historical）→ S4.2.5.0（docs-only，已完成）→ S4.2.5.1 broad checkpoint（historical）→
   S4.2.5.1a（已完成）→ S4.2.5.1b（已完成）→ S4.2.5.1c（已完成）→ S4.3 broad checkpoint（historical） → S4.3.0（docs-only，已完成） → S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）**：
   `.3.0`已冻结History close/dismiss/input/focus/opener exact contract；`.3.1`与`.3.2`依次交付DOM-free lifecycle substrate与
   dormant Host lifecycle；`.4.0`冻结player timing/suspension exact split，`.4.1`已交付generic participant，`.4.2`与`.4.3`也已依次交付
   DOM-free controller core及dormant Host player-view integration；随后进入Engine Lab conformance exact entry、live cutover与whole-canvas family。

#### S4.2.2.1 exact DOM-free API（已交付的历史checkpoint）

`.1`新增name及shape固定为：

```ts
export interface NarrativeStableRootPreparationInternalV1 {
  readonly [narrativeStableRootPreparationBrandInternalV1]: true;
}

export type NarrativeStableReadinessEntryInternalV1 =
  | Readonly<{
    readonly kind: "root";
    readonly preparation: NarrativeStableRootPreparationInternalV1;
  }>
  | Readonly<{
    readonly kind: "history";
    readonly preparation: NarrativeStableHistoryChildPreparationInternalV1;
  }>;

export interface NarrativeStableReadinessSnapshotInternalV1 {
  readonly entries: readonly NarrativeStableReadinessEntryInternalV1[];
}

export interface NarrativeStableHostLeaseInternalV1 {
  isCurrentInternalV1(): boolean;
  releaseInternalV1(): void;
}

export interface NarrativeStableSessionInternalV1 {
  getReadinessSnapshotInternalV1(): NarrativeStableReadinessSnapshotInternalV1;
  subscribeInternalV1(listener: () => void): () => void;
  getHistoryChildLifecycleInternalV1(): NarrativeStableHistoryChildLifecycleInternalV1;
  attachHostInternalV1(
    input: Readonly<{ readonly hostIdentity: object }>,
  ): NarrativeStableHostLeaseInternalV1;
}

export function createNarrativeStableSessionInternalV1(
  input: Readonly<{ readonly bridge: NarrativeStablePublisherBridgeInternalV1 }>,
): NarrativeStableSessionInternalV1;
```

Module ownership同样exact：new `narrative-managed-surface-session.ts`只拥有上述session/lease/readiness exported types，不新增
bridge accessor、binding claim或helper spelling；runtime factory、private records与全部logic留在唯一可读取bridge/lifecycle WeakMap的
`narrative-managed-surface-family.ts`。`narrative-managed-surface-session.test.ts`通过family factory验证这些types/runtime behavior，不能为方便
分文件而公开raw kernel、bridge record或任意callback-backed伪session constructor。
Session与每个lease runtime object均fresh/retained as specified、frozen、own-data callable keys exact等于各自interface string keys；无
symbol/extra/inherited/accessor member。Borrowed method receiver不能读取bridge/kernel或作用于另一个session/lease。

`NarrativeStableRootPreparationInternalV1`是fresh frozen exact zero-own-key runtime token；brand只作TypeScript nominal key，runtime
不能有symbol/string/extra/accessor field。Private record绑定exact session/bridge、publisher lease、source revision、stable preparing
attempt/readiness evidence、admitted target/frame与candidate snapshot，不返回raw kernel、envelope、target、instance或evidence。
History entry必须复用S4.2.1的exact `NarrativeStableHistoryChildPreparationInternalV1`，不能按definition、slot或surface ID重建token。

Snapshot是current cached frozen `{ entries }`，entry与vector均frozen；只有entry vector的exact identities/order发生变化才mint fresh
snapshot，unchanged repeated read返回same exact snapshot identity，以满足`useSyncExternalStore`。Order固定root在前、History在后，
cardinality为`0..2`。它只枚举当前exact preparing root，以及current ready root或retained predecessor root下的current preparing
History；ready、failed、retired、foreign bridge/kernel/application或old
publisher successor不出现。Snapshot不得含renderer、props、portal、DOM、History value、reveal/controller、input/focus、generic
candidate、instance ID或readiness method，因而不是React render snapshot，也不能在`.1`形成ready authority。
`subscribeInternalV1`只桥接exact composite state notification并在cached snapshot identity实际变化时通知一次；unrelated composite
transition、same-vector reflow与unchanged read不通知。Subscriber throw按既有failure isolation继续其余listener，unsubscribe idempotent且
bridge terminal之后不再调用。

每个exact active bridge只有一个retained `NarrativeStableSessionInternalV1`与一个retained session-owned
`NarrativeStableHistoryChildLifecycleInternalV1`。Repeated exact `{ bridge }` session/lifecycle factory调用返回same identity；若lifecycle先于
session创建，bridge-private cache保留它，session随后adopt exact same lifecycle。Same-kernel publisher bridge successor继续复用S4.2.1
per-kernel family claimant/one-method preparation authority，但必须取得fresh session与fresh lifecycle；predecessor session、lease、lifecycle、
intent与preparation永久stale，不能被successor adopt。
Session factory exact-key/accessor/foreign/terminal bridge或borrowed factory input抛`ui.narrative_stable_session_invalid`且零claim/read；session
method wrong receiver同码fail closed。Bridge terminal后`getReadinessSnapshotInternalV1()`保持total并返回cached empty snapshot，
`subscribeInternalV1()`返回idempotent no-op unsubscribe，`getHistoryChildLifecycleInternalV1()`仍返回same stale lifecycle identity；只有
attach会按下述attachment invalid抛错。这些terminal reads不能重新订阅或触碰successor。

History redemption的preparation object、private preparation record与bridge-private eventual-session current-preparation slot必须移入S4.2.1
exact commit guard；该slot即使session尚未创建也存在，later session必须adopt而不能重建preparation：
generic candidate已经认证且intent CAS即将赢时，guard以pre-captured no-throw WeakMap setter/identity assignment在composite state assignment
之前登记三者。Guard false/non-boolean/throw、prepared install stale/abort或intent CAS loss均零登记；installed path的同步transient/state
listener第一次读取session snapshot时已经看到同一History preparation，不允许post-return才注册造成phantom notification。Root token可从
已安装current stable preparing binding惰性memoize；同一attempt重复snapshot复用same token，attempt retire后不保留enumerable tombstone。

`attachHostInternalV1`先exact descriptor-capture唯一own-data `hostIdentity`；invalid/stale session抛
`ui.narrative_stable_host_attachment_invalid`。一个session同一时刻只有一个logical Host identity：distinct或parallel identity必须在任何
kernel/snapshot/lifecycle read及mutation前抛`ui.narrative_stable_host_lease_conflict`。Same exact identity reattach产生fresh lease generation并
立即fence predecessor；old `isCurrentInternalV1()`变`false`。`releaseInternalV1()` idempotent，先关闭本generation，再由microtask仅在
logical lease仍指向该released generation且没有same-host successor时清空lease；`.1` release不fail/close candidate、不改topology、input或
notification。Session没有dispose member，其lifetime绑定bridge；bridge terminal先fence session/lease/lifecycle并让snapshot empty、退订，再走
既有structural disposal，late callback/reattach只stale或抛invalid。

`.1`的mutation-sensitive RED至少覆盖：

1. 上述factory/session/lease/root token/readiness entry+snapshot exact type/runtime shape，所有新增name在UI root、`./internal`与package
   export inventory的type/runtime negative guard；
2. per-active-bridge session/lifecycle identity reuse、lifecycle-before-session adoption、same-kernel bridge successor fresh identity与old-object
   fencing，且S4.2.1 per-kernel claimant identity不漂移；
3. root preparing、History preparing及同时存在时的`[] | [root] | [history] | [root, history]` exact order/cardinality；unchanged repeated
   read保持same snapshot identity，only exact vector change才fresh；clone、foreign、ready、failed、retired与ABA successor均不出现；
4. History commit guard false/throw/stale与intent competitor零preparation/session registration；installed listener第一次读取已认证entry，
   synchronous reentry不能看到child已安装但preparation缺失；
5. same Host fresh generation、StrictMode-style release/reattach grace、distinct Host pre-read conflict、double release、bridge terminal与late
   microtask/callback，全部不settle readiness或改变Surface/input；
6. malformed/accessor/extra-key input、borrowed receiver、throwing listener/unsubscribe与subscriber reentry fail closed；unrelated composite
   transition/same vector不通知，one listener failure不阻断remaining listener，bridge terminal后无notification；
7. `10k` snapshot/invalid attach/release/retry/successor churn下每session只保留O(1) current root token、History preparation、Host lease与
   subscription；没有attempt/preparation/generation history、timer、tombstone或second topology store；
8. `.1`对root/History ready/fail、action binding/input publication、focus/DOM/renderer/portal、close/dismiss/opener、timer/controller、Engine
   Lab/live graph的delta exact zero。

`.1` expected implementation/test scope精确为以下**5 files**：

- `engine/packages/ui/src/narrative/narrative-managed-surface-family.ts`；
- `engine/packages/ui/src/narrative/narrative-managed-surface-family.test.ts`；
- `engine/packages/ui/src/narrative/narrative-managed-surface-session.ts`；
- `engine/packages/ui/src/narrative/narrative-managed-surface-session.test.ts`；
- `engine/packages/ui/src/public-api.test.ts`。

`.1`若需要改stable-composite、reducer、action-route、React/TSX、public/`./internal` barrel、package exports、Base/Web、composer、GameStage、
Engine Lab/template/examples、legacy `DialoguePanelV1`/`VnLayerV1`或live docs，立即停止。若session无法只从exact bridge-private binding取得
kernel/current target/frame、若standalone lifecycle可绕过session安装Host永远不可见的History，若preparation只能在notification/return后
登记，或single Host lease需要close/fail topology才能成立，也停止并修订合同；不得在`.1`偷跑ready/fail或input/focus。

**S4.2.2.1 DOM-free Narrative session/readiness attachment implementation delivery（已完成的历史checkpoint）：**
Delivery严格保持上述five-file implementation/test scope：
`narrative-managed-surface-family.ts`、`narrative-managed-surface-family.test.ts`、
`narrative-managed-surface-session.ts`、`narrative-managed-surface-session.test.ts`与`public-api.test.ts`。
其中session module只拥有session/lease/root-preparation/readiness exported types；factory、bridge/lifecycle/session/lease private records、
snapshot derivation与composite subscription runtime仍全部留在唯一可读既有bridge/lifecycle private provenance的family module，没有新增raw
bridge/kernel accessor、伪session constructor或parallel runtime owner。

每个active bridge现只缓存one retained session与one exact History lifecycle；lifecycle-before-session会被same session adopt，same-kernel bridge
successor取得fresh session/lifecycle而继续复用S4.2.1 per-kernel family claimant。History installed path已把preparation record、generic candidate与
eventual-session current-preparation slot放入S4.2.1 assignment前commit guard；session尚未创建时slot仍保留exact token，较早注册的raw state
listener也能在install notification内经lazy snapshot read看到与redemption result相同的preparation。Stale/repeat/occupied competitor不改该slot、
snapshot或state。

Readiness projection交付frozen cached `{ entries }`，只枚举exact current root/History preparation，固定root-first、cardinality `0..2`；entry
identity/order未变时重复read复用exact snapshot，只有vector变化才mint fresh snapshot并通知subscriber。Root replacement/failure时History从
authenticated ready parent或retained predecessor structural link继续投影；ready/failed/retired/foreign/successor provenance不会形成phantom
entry。Subscriber throw隔离、unsubscribe idempotent，listener reentry可读取current cached identity；earlier listener同步terminal bridge后，
captured later listener不会再执行。

Single logical Host lease按exact `hostIdentity`轮换fresh generation：same identity reattach立即fence predecessor，distinct identity在任何
kernel/snapshot/lifecycle read前冲突，released generation的logical identity占有保持到microtask grace结束，double release与late cleanup均
idempotent且不会ABA-clear same-host successor。Bridge dispose会在structural disposal前静默fence session/lifecycle/lease、清空cached
snapshot/listeners并退订；external Coordinator terminal也会在session/lease ingress与session state callback中完成同一terminal fence，captured
subscriber不会越过该边界。Terminal total reads不复活subscription或successor。`10k` churn覆盖证明每个session
只强持有one current root token、History preparation、Host lease、snapshot、listener set与one coalesced cleanup flag，不建立attempt/preparation/
generation history、timer、tombstone或second topology store。

全部新name继续只作source-relative dormant contract；UI root、`./internal`与package runtime/type inventory的negative guards已覆盖，generic
Managed Surface/Coordinator/action result、public/package barrel、React/DOM/Web/live Story、ready/fail、input/focus、close/dismiss、timer/controller
均无扩张。验证通过focused `3 files / 209 tests`、UI `80 files / 1222 tests`、full `254 files / 4152 tests`与完整
`deno task check`，typecheck、lint、fmt与`git diff --check`均green。本批未重跑browser、examples或prebuilt；Engine browser
`101 / 101`、examples `45 passed / 2 skipped`与prebuilt Player `38 / 38`只作为prior evidence，不冒充本delivery的HEAD验证。

S4.2.2.1现只作为completed historical checkpoint保留；原S4.2.2.2 broad Host checkpoint也已由下述
S4.2.2.2.0 exact entry细分并关闭。该delivery完成当时的active current/next、core slice与implementation gate为
**S4.2.2.2.1 DOM-free generic Host-commit atomic substrate**；该pointer现由下述S4.2.2.2.1 delivery历史化。

**S4.2.2.2.0 dormant React Narrative Host exact entry（docs-only，completed）：** 原S4.2.2.2把generic
two-phase action binding、root/History guarded readiness、cross-axis action fence、immutable Narrative render observation、React portal
Host、StrictMode lease与real-detach cleanup混在一个十一文件checkpoint。现有action binding创建即替换current，S4.2.2.1 readiness snapshot
又刻意只枚举preparing token并在ready后清空；二者都不能冒充ready前atomic handoff或ready subtree render source。本entry不让实现临时发明
action/focus/renderer/Host seam，而把唯一顺序冻结为：

1. **S4.2.2.2.0（本entry，completed）**：只冻结下述exact names、shape、atomic protocol、RED、scope与stop；
2. **S4.2.2.2.1 DOM-free generic Host-commit atomic substrate（已完成）**：只改action-route pair、stable-composite pair与
   `public-api.test.ts`共五文件，交付prepared action binding、guarded root/History readiness、cross-axis child action authority及generic
   bypass fence；不接Narrative/React/DOM/portal/renderer；
3. **S4.2.2.2.2 dormant Narrative React Host（已完成）**：只改family pair、session pair、new Host pair与
   `public-api.test.ts`共七文件，交付immutable renderer/History observation、Host runtime/component、explicit portal、layout acknowledgment、
   prepared binding/focus registration、StrictMode generation、pre-ready error boundary及real-detach terminal cleanup；
4. 后续现为 **S4.2.3.0（已完成）→ S4.2.3.1（已完成）→ S4.2.3.2（已完成）→
   S4.2.4.0（docs-only，已完成）→ S4.2.4.1（已完成）→ S4.2.4.2（已完成）→ S4.2.4.3（已完成）→
   S4.2.5 broad checkpoint（historical）→ S4.2.5.0（docs-only，已完成）→ S4.2.5.1 broad checkpoint（historical）→
   S4.2.5.1a（已完成）→ S4.2.5.1b（已完成）→ S4.2.5.1c（已完成）→ S4.3 broad checkpoint（historical） → S4.3.0（docs-only，已完成） → S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）**；
   `.3.1`已交付DOM-free lifecycle substrate，`.3.2`已交付actual DOM focus/History close，`.4.0`已冻结player
   timing/suspension exact split，`.4.1`已交付generic participant，`.4.2`与`.4.3`也已交付controller及Host view；Engine Lab exact entry与
   live cutover不得越序合并。

`.2.2.2.1`的prepared action contract新增source-relative
`PrepareManagedSurfaceContractBoundActionBindingInputInternalV1`，exact own-data fields只有
`authority`、`inputContextId`、`inputRouter`、`isGestureCurrent`及optional `registerManagedInputHandler`。Factory exact为
`prepareManagedSurfaceContractBoundActionBindingInternalV1(input): ManagedSurfacePreparedContractBoundActionBindingInternalV1`；prepared
handle exact frozen methods只有
`commitInternalV1(contract: ManagedSurfacePreparedInputBindingContractInternalV1): boolean`、`abortInternalV1(): void`与
`getBindingInternalV1(): ManagedSurfaceActionBindingV1 | null`。Prepare descriptor-capture input并可建立inert router dispatcher，但不分配
future full contract、不替换current binding、不推进input publication、不开放consumer；generic pure readiness successor才给ready guard提供
exact future full contract。

Exact source-relative type surface固定为：

```ts
declare const managedSurfacePreparedInputBindingContractBrandInternalV1: unique symbol;

export interface ManagedSurfacePreparedInputBindingContractInternalV1 {
  readonly [managedSurfacePreparedInputBindingContractBrandInternalV1]: true;
}

export interface PrepareManagedSurfaceContractBoundActionBindingInputInternalV1 {
  readonly authority: ManagedSurfaceContractBoundActionRouteAuthorityInternalV1;
  readonly inputContextId: InputContextIdV1;
  readonly inputRouter: InputRouterV1;
  readonly isGestureCurrent: (gestureId: ManagedSurfaceGestureIdV1) => boolean;
  readonly registerManagedInputHandler?: typeof registerManagedInputHandlerV1;
}

export interface ManagedSurfacePreparedContractBoundActionBindingInternalV1 {
  commitInternalV1(
    contract: ManagedSurfacePreparedInputBindingContractInternalV1,
  ): boolean;
  abortInternalV1(): void;
  getBindingInternalV1(): ManagedSurfaceActionBindingV1 | null;
}

export function prepareManagedSurfaceContractBoundActionBindingInternalV1(
  input: PrepareManagedSurfaceContractBoundActionBindingInputInternalV1,
): ManagedSurfacePreparedContractBoundActionBindingInternalV1;

export function captureManagedSurfacePreparedInputBindingContractInternalV1(
  contract: ManagedSurfaceInputBindingContractV1,
): ManagedSurfacePreparedInputBindingContractInternalV1;

export function claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1<
  TAttempt,
  TResult,
>(
  prepared: ManagedSurfacePreparedContractBoundActionBindingInternalV1,
  consume: (
    input: ManagedSurfaceAuthenticatedActionContinuationInputInternalV1<TAttempt>,
  ) => TResult,
): ManagedSurfaceAuthenticatedActionRouteInternalV1<TAttempt, TResult>;
```

Raw full contract不得在prepared install gate内结构化读取；`.1`另增frozen zero-own-key
`ManagedSurfacePreparedInputBindingContractInternalV1`及
`captureManagedSurfacePreparedInputBindingContractInternalV1(contract: ManagedSurfaceInputBindingContractV1):
ManagedSurfacePreparedInputBindingContractInternalV1`。Generic pure plan在进入transition前完成raw contract parse/canonical validation并capture
WeakMap-auth token；token private record绑定exact frozen full contract与origin，clone/foreign/stale token不能从own keys重建。
`commitInternalV1(contractToken)` one-shot/no-throw地只认证token并CAS same router、reserved prepared slot与expected current，成功后
`getBindingInternalV1()`才返回exact binding；commit前、abort后、false/stale路径均返回`null`。Abort idempotently撤销prepared slot；same handle
repeat commit稳定false。

Prepared consumer必须在commit前以
`claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1<TAttempt, TResult>(prepared, consume):
ManagedSurfaceAuthenticatedActionRouteInternalV1<TAttempt, TResult>`预装；first exact claim独占，borrowed receiver、clone、foreign/aborted
prepared或second claim在调用consumer/router前以existing action-route claim invalid fail closed。Root replacement与preparing History可以同时
存在，因此每个exact `(InputRouterV1, inputContextId)` production state精确有one stable managed dispatcher、one current record与
**最多two inert prepared records**（每个exact authority只保留latest）；prepared record不另注册handler，也不保留retired cleanup/
unregister history。First dispatcher creation descriptor-capture并冻结registrar identity；later prepare提供alternate registrar时不得读取、调用或
替换它，也不把它误报成identity conflict。Third distinct authority必须在registrar/router read前以
`ui.managed_surface_input_authority_conflict` fail closed。Same-authority newer prepare必须在transition fence外terminal-abort并替换旧prepared，
不得把同一authority累积成第二slot。任一prepared first commit pointer-wins，另一handle因expected-current token漂移稳定false；
只有其Surface candidate仍current preparing时才可基于new current mint fresh prepared token重试，已cascade/retired candidate不得复活。
Replacement commit只做module-owned pointer/revision swap，不能在
kernel transition fence内调用registrar/unregister、router、consumer或gesture callback。Prepare只从private scalar high-water reserve fresh
input publication revision，不改变current publication；abort/stale永久burn gap且不rollback/reuse，commit才发布reserved revision。Old logical
binding立即stale；inactive dispatcher稳定ignored，同步listener reentry必须已经路由到new logical binding。
InputRouterV1只持有one scalar revision high-water供其closed context set共享，不得按binding、authority或context建second counter；Narrative exact
只使用one managed context。Revision gap是private monotonic evidence，不改变abort/stale前仍published current envelope的validity。

Shared `ManagedSurfaceStableReadinessCommitGuardInternalV1`仍为frozen exact one-method own-data object，但其唯一method精确修正为
`commitInternalV1(contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null): boolean`。Root ready继续使用
`settleStableReadinessReadyWithCommitGuardInternalV1(envelope, commitGuard)`，Host-owned root failure新增source-relative
`settleStableReadinessFailedWithCommitGuardInternalV1(envelope, commitGuard)`；existing unguarded failed method不作为Host路径。
History继续使用独立same-claimant
`ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1`、
`claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1(kernel, exactClaimant)`与exact two ready/fail methods；不得给
S4.2.1 one-method preparation authority追加key。Same preparation claimant重复claim返回same retained readiness authority，missing/different
claimant、foreign kernel或borrowed receiver仍在candidate/state read前抛
`ui.managed_surface_stable_exact_parent_transient_child_readiness_claim_invalid`。

Exact guarded-readiness surface固定为：

```ts
export interface ManagedSurfaceStableReadinessCommitGuardInternalV1 {
  readonly commitInternalV1: (
    contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null,
  ) => boolean;
}

export type ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1 =
  | Readonly<{ readonly kind: "applied" }>
  | Readonly<{ readonly kind: "stale" }>
  | Readonly<{ readonly kind: "faulted" }>;

export interface ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1 {
  settleExactParentTransientChildReadinessReadyInternalV1(
    candidate: unknown,
    commitGuard: ManagedSurfaceStableReadinessCommitGuardInternalV1,
  ): ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1;
  settleExactParentTransientChildReadinessFailedInternalV1(
    candidate: unknown,
    commitGuard: ManagedSurfaceStableReadinessCommitGuardInternalV1,
  ): ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1;
}

export function claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  exactClaimant: object,
): ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1;
```

ManagedSurfaceStableCompositeRuntimeKernelInternalV1只新增
settleStableReadinessReadyWithCommitGuardInternalV1(envelope, commitGuard)与
settleStableReadinessFailedWithCommitGuardInternalV1(envelope, commitGuard)，二者仍返回existing
ManagedSurfaceStableReadinessResultInternalV1；existing unguarded methods不删除，但不能被Host settlement调用。

Cross-axis ready child action另增closed
`ManagedSurfaceStableExactParentTransientChildActionInputCaptureResultInternalV1 =
Readonly<{ kind: "captured"; contract: ManagedSurfaceInputBindingContractV1 }> |
Readonly<{ kind: "unavailable" }> |
Readonly<{ kind: "faulted"; code: "surface.stable_reconcile_faulted" }>`及
`ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1`。该authority extends
`ManagedSurfaceContractBoundActionRouteAuthorityInternalV1`，新增唯一capture member
`captureCurrentExactParentTransientChildInputInternalV1(candidate: unknown):
ManagedSurfaceStableExactParentTransientChildActionInputCaptureResultInternalV1`；claim exact为
`claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1(kernel, exactClaimant)`。它必须命中S4.2.1 exact kernel的
same composition claimant，same claimant复用，foreign/missing claimant、kernel、candidate或borrowed receiver在读contract/state前抛
`ui.managed_surface_stable_exact_parent_transient_child_action_claim_invalid`。Only authenticated current ready History可captured；preparing、
failed、retired、parent/source/slot drift与ABA successor均unavailable。它只验证并返回`surface.action_routed` continuation gate，不取得close/
dismiss authority。

Exact action surface固定为：

```ts
export type ManagedSurfaceStableExactParentTransientChildActionInputCaptureResultInternalV1 =
  | Readonly<{
    readonly kind: "captured";
    readonly contract: ManagedSurfaceInputBindingContractV1;
  }>
  | Readonly<{ readonly kind: "unavailable" }>
  | Readonly<{
    readonly kind: "faulted";
    readonly code: "surface.stable_reconcile_faulted";
  }>;

export interface ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1
  extends ManagedSurfaceContractBoundActionRouteAuthorityInternalV1 {
  captureCurrentExactParentTransientChildInputInternalV1(
    candidate: unknown,
  ): ManagedSurfaceStableExactParentTransientChildActionInputCaptureResultInternalV1;
}

export function claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  exactClaimant: object,
): ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1;
```

Root/History ready或failed的atomic protocol固定为：先pure-plan exact whole-composite successor并从该successor派生future full input contract，
在transition外capture exact contract token或选择exact `null`，再取得prepared-state install token；ready/failure gate收到该exact token后，先调用Host commit的no-throw
prepared-binding CAS/abort，再只做module-owned
candidate phase、Host generation与focus-registration ownership pointer swap，随后返回true；kernel才assignment并同步notify。Gate不得调用
router/registrar/unregister、DOM、React、Story、History observation、bridge、Coordinator、semantic consumer或任意其他caller callback；唯一
允许的call是transition前已descriptor-capture并认证的exact commitGuard method，该method内部也只能做module-owned token/boolean/pointer CAS。
Malformed/accessor/extra-key guard、throw或non-boolean为generic `faulted` zero；stale epoch/candidate/source/lease/prepared token、guard false、
binding contract drift或reentry winner为generic `stale` zero。Only installed generic `applied`映射Narrative `settled`；listener首见ready时
Surface、binding、candidate provenance、parent suspension/resume与Host-local focus registration必须已经同批一致。Listener同步replace/dispose/
release后outer仍返回historical applied/settled，repeat与opposite receipt永久stale。
Candidate/Host/prepared-token currentness必须在任何binding swap前全部plain-check；一旦guard进入commit writes，binding、candidate phase、Host generation
与focus ownership均为预认证module-owned infallible pointer/CAS且中间不得再branch或调用，避免binding committed而Surface assignment abort的phantom。

Failure与ready必须共用同一guard type。Root initial failure的pure successor提供`null`，guard在assignment前abort candidate prepared binding并
保持无Narrative current binding；root replacement failure与History failure的pure successor提供恢复后exact retained-root full contract，Host
必须在transition外capture token、预备retained-parent successor binding并在同一gate提交它、同时abort candidate binding。History claimed failed exact method因此修正为
`settleExactParentTransientChildReadinessFailedInternalV1(candidate, commitGuard)`；不得保留无guard Host failure旁路。同步listener首见failed/
resumed state时已经看见恢复后的root binding contract，旧topology contract永久stale；focus registration仍指向exact retained root。
Ready/fail first winner独占terminal state：ready accepted后late failure不能倒写，failed accepted后late ready/ready commit不能复活；planning/internal
fault不得assignment、notification、binding commit或消费仍可重试的exact preparation。

Generic bypass在stable-composite finalizer按**stale evidence first、applied-only fence second**冻结。Stale application epoch、instance/
readiness evidence、routing lease或owner proof保持既有exact stale/rejected code；只有ordinary generic transition本来会applied到authenticated current
cross-axis History时才回滚到exact current composite state，并统一返回`rejected / surface.invalid_transition`。Fence覆盖ordinary readiness ready/
failed、`close_expected`/`closeTop`、dismiss、`ui.cancel`/`player.toggle_history` route、selective owner cancel/dispose与任何直接child mutation；
topology revision、input publication、cursor、binding与notification均zero。Claimed History ready/fail、S4.2.1 structural retention及ready cutover/
greater-empty/publisher bridge disposal/Coordinator terminal的whole-composite cascade必须继续applied，不能被generic fence误拦。`.3`未来只能新增
exact current History close/dismiss authority，不能删除该generic fence。

该bypass receipt不新增type或code：沿用existing ManagedSurfaceTransitionReceiptV1，kind/code exact为
`rejected / surface.invalid_transition`，`beforeTopologyRevision === afterTopologyRevision === N`；若existing row携带
`surfaceInstanceId`，它只能是exact authenticated current History instance。State identity、topology/input publication revision、binding、cursor与
notification全部保持zero delta。

`.2.2.2.1` mutation-sensitive RED至少覆盖：

1. prepared input/contract token/handle/claim、shared guard、History readiness/action authority/capture/result的exact keys、frozen rows、descriptor/accessor/
   extra-key/borrowed receiver及UI root、`./internal`、package export type/runtime negative guards；
2. prepare保持predecessor current，full contract只由pure successor传入；commit true/false、abort/repeat、expected-current drift、second
   prepared competitor及preclaim dispose，且false/stale/fault无router/publication delta；root replacement + History同时占用two prepared slots，
   first commit使另一旧token stale，candidate仍current才可fresh retry，third distinct authority pre-register conflict；prepare reserve、abort/stale
   burn gap、commit publish及revision ABA不复用；
3. ready guard先binding/focus CAS、后Surface assignment、再同步notification；listener即时route/release/replacement/dispose与subscriber throw containment
   不产生ready-then-effect、double route或post-notify registration；
4. root与History各自ready/fail first-win、guard false/throw/nonboolean、plan fault、prepared stale、foreign candidate/claimant/kernel与same-kernel
   claimant reuse；raw contract在gate前capture，clone/foreign token zero；initial root failure传`null`，replacement/History failure传
   restored-root token，listener首见failure即命中新contract；
5. generic readiness、closeExpected/closeTop、dismiss、two History action IDs、owner cancel/dispose的current protected-child
   `rejected / surface.invalid_transition`，以及stale evidence precedence、claimed settlement与structural cascade negative controls；
6. retained root + History + replacement preparation/failure保持exact old binding，ready cutover只切一次new binding并同install cascade old aggregate；
7. 10,000轮prepare/abort/commit/stale/replacement对每个exact router/context只保留one stable dispatcher、one current、最多two
   latest-per-authority prepared、scalar revision high-water与current claimant authorities，无per-binding handler、retired cleanup、unregister/
   revision/candidate/tombstone/append-only array history；later alternate registrar zero-read。

`.2.2.2.1` implementation scope严格只有以下**5 files**：

- `engine/packages/ui/src/managed-surfaces/managed-surface-action-route.ts`及同名`.test.ts`；
- `engine/packages/ui/src/managed-surfaces/managed-surface-stable-composite-state.ts`及同名`.test.ts`；
- `engine/packages/ui/src/public-api.test.ts`。

Implementation-wide UI matrix若命中本entry刻意替换的旧per-binding unregister或ordinary generic
History-readiness旁路，允许再更新以下**5个test-only characterization files**，不得借此扩张production source：

- `engine/packages/ui/src/managed-surfaces/managed-surface-coordinator-lifetime.test.ts`；
- `engine/packages/ui/src/managed-surfaces/managed-surface-composition-runtime.test.ts`；
- `engine/packages/ui/src/composer/create-game-ui-composition.test.ts`；
- `engine/packages/ui/src/narrative/narrative-managed-surface-family.test.ts`；
- `engine/packages/ui/src/narrative/narrative-managed-surface-session.test.ts`。

前三者必须改为证明one stable dispatcher在logical binding dispose/replacement后保持one registration、inactive/current-pointer
fail-closed且不再依赖unregister callback作为terminal owner；后两者只能用claimed readiness或existing structural cascade清理History，
不得重新开放generic `readiness_failed` bypass。该test-only amendment不授权修改Coordinator、composition runtime、Narrative source、router、
generic operation/result/code或任何barrel/package/live graph。

`.2.2.2.2`的History observation先把candidate preflight中的opaque placeholder替换为exact source-relative
`NarrativeStableHistoryObservationPortInternalV1`，其own-data callables精确为
`getSnapshotInternalV1(): DeepReadonly<NarrativeHistoryV1>`与`subscribeInternalV1(listener: () => void): () => void`。Preflight在任何
Surface mutation前descriptor-capture receiver/callables为frozen zero-own-key
`NarrativeStableCapturedHistoryObservationPortInternalV1`；missing/extra/accessor/non-callable/proxy/prototype或throwing descriptor可以在
source-private边界使用`ui.narrative_stable_history_observation_invalid` TypeError分类，但observable preflight必须仍collapse为existing
`{ kind: "faulted", code: "narrative.candidate_preflight_faulted" }` exact zero，不新增public/family rejection code，也不把raw port交给renderer。Host消费
`NarrativeStableHistoryRenderObservationInternalV1`，它也只有同名get/subscribe two methods，但只返回engine-owned bounded canonical copy。
Wrapper只建立one captured subscription；每次read都调用bounded `parseNarrativeHistoryV1`并copy raw value，canonical bytes相同即使raw object fresh也复用same
frozen render snapshot identity且不notify，bytes不同才mint fresh并notify；same raw identity被原地篡改bytes时必须copy为fresh canonical value，
raw identity、mutable entries或Story getter永不泄露。

Observation exact type surface固定为：

```ts
export interface NarrativeStableHistoryObservationPortInternalV1 {
  getSnapshotInternalV1(): DeepReadonly<NarrativeHistoryV1>;
  subscribeInternalV1(listener: () => void): () => void;
}

declare const narrativeStableCapturedHistoryObservationPortBrandInternalV1: unique symbol;

export interface NarrativeStableCapturedHistoryObservationPortInternalV1 {
  readonly [narrativeStableCapturedHistoryObservationPortBrandInternalV1]: true;
}

export interface NarrativeStableHistoryRenderObservationInternalV1 {
  getSnapshotInternalV1(): DeepReadonly<NarrativeHistoryV1>;
  subscribeInternalV1(listener: () => void): () => void;
}
```

Candidate preflight成功后的NarrativeStableCandidateSnapshotInternalV1.historyObservationPort field exact type必须收窄为
NarrativeStableCapturedHistoryObservationPortInternalV1；raw receiver/callables只存在family-private binding record。

Renderer exact props冻结为：

- `NarrativeStableDialogueRendererPropsInternalV1` exact own-data
  `{ kind: "dialogue", pending, visualConfig, playerProfile, textResolver, quickMenuContribution }`；
- `NarrativeStableHistoryRendererPropsInternalV1` exact own-data
  `{ kind: "history", history, visualConfig, playerProfile, textResolver }`；
- closed `NarrativeStableRendererPropsInternalV1` union与只接受该union的
  `NarrativeStableRendererComponentInternalV1`。

`pending`与`history`分别为engine-owned frozen `DeepReadonly<PendingInteractionV1>`与canonical
`DeepReadonly<NarrativeHistoryV1>`；其余字段只能复用candidate preflight已经frozen/captured的visual/profile/text/quick-menu identity。
Renderer不取得semantic dispatch、Coordinator、Surface instance/evidence、raw observation port、input binding、readiness或close/focus authority。
Component/props catalog更新只影响future candidate，不能原地改写preparing、ready或retained entry。

```ts
export interface NarrativeStableDialogueRendererPropsInternalV1 {
  readonly kind: "dialogue";
  readonly pending: DeepReadonly<PendingInteractionV1>;
  readonly visualConfig: Readonly<object>;
  readonly playerProfile: Readonly<object>;
  readonly textResolver: object | ((...args: never[]) => unknown);
  readonly quickMenuContribution:
    | object
    | ((...args: never[]) => unknown)
    | null;
}

export interface NarrativeStableHistoryRendererPropsInternalV1 {
  readonly kind: "history";
  readonly history: DeepReadonly<NarrativeHistoryV1>;
  readonly visualConfig: Readonly<object>;
  readonly playerProfile: Readonly<object>;
  readonly textResolver: object | ((...args: never[]) => unknown);
}

export type NarrativeStableRendererPropsInternalV1 =
  | NarrativeStableDialogueRendererPropsInternalV1
  | NarrativeStableHistoryRendererPropsInternalV1;

export type NarrativeStableRendererComponentInternalV1 = ElementType<
  NarrativeStableRendererPropsInternalV1
>;
```

React不得用S4.2.2.1只枚举preparing token的snapshot重建ready subtree；exact render surface固定为：

```ts
declare const narrativeStableHostRenderKeyBrandInternalV1: unique symbol;

export type NarrativeStableHostRenderKeyInternalV1 = string & {
  readonly [narrativeStableHostRenderKeyBrandInternalV1]: true;
};

export type NarrativeStableHostRenderPhaseInternalV1 =
  | "preparing"
  | "active"
  | "suspended";

export type NarrativeStableHostRenderEntryInternalV1 =
  | Readonly<{
    readonly kind: "dialogue";
    readonly phase: NarrativeStableHostRenderPhaseInternalV1;
    readonly renderKey: NarrativeStableHostRenderKeyInternalV1;
    readonly preparation: NarrativeStableRootPreparationInternalV1 | null;
    readonly initialFocusTargetId: ManagedSurfaceFocusTargetIdV1;
    readonly rendererComponent: NarrativeStableRendererComponentInternalV1;
    readonly rendererProps: NarrativeStableDialogueRendererPropsInternalV1;
  }>
  | Readonly<{
    readonly kind: "history";
    readonly phase: NarrativeStableHostRenderPhaseInternalV1;
    readonly renderKey: NarrativeStableHostRenderKeyInternalV1;
    readonly parentRenderKey: NarrativeStableHostRenderKeyInternalV1;
    readonly preparation: NarrativeStableHistoryChildPreparationInternalV1 | null;
    readonly initialFocusTargetId: ManagedSurfaceFocusTargetIdV1;
    readonly rendererComponent: NarrativeStableRendererComponentInternalV1;
    readonly rendererProps: Omit<
      NarrativeStableHistoryRendererPropsInternalV1,
      "history"
    >;
    readonly historyObservation: NarrativeStableHistoryRenderObservationInternalV1;
  }>;

export interface NarrativeStableHostRenderSnapshotInternalV1 {
  readonly entries: readonly NarrativeStableHostRenderEntryInternalV1[];
}

export interface NarrativeStableHostRenderSourceInternalV1 {
  getSnapshotInternalV1(): NarrativeStableHostRenderSnapshotInternalV1;
  subscribeInternalV1(listener: () => void): () => void;
}
```

Preparing entry的preparation必须non-null；active/suspended entry必须null。History dynamic canonical history不进入rendererProps或Host snapshot；
per-entry React child从historyObservation以useSyncExternalStore取得history并组装full History props，因此History bytes变化不重建entry。Render key由family private monotonic allocator生成、跨
preparing→active/suspended保持same branded string，不编码或解析raw Surface instance/occurrence ID，也不接受caller string伪造；React只用它
作stable key。
InitialFocusTargetId只能从exact resolved definition派生，不能由Story/renderer/DOM id提供；它不进入rendererProps。Engine-owned shell是该ID
唯一registered HTMLElement并固定tabIndex=-1，focus token绑定entry + ID + element + portal generation。

Render snapshot exact shape只有frozen `{ entries }`；source exact methods只有
`getSnapshotInternalV1(): NarrativeStableHostRenderSnapshotInternalV1`与
`subscribeInternalV1(listener: () => void): () => void`。Entry/vector identity/order不变的repeated read必须same snapshot identity，only vector/
phase/frozen candidate identity变化才fresh；History content由独立observation snapshot更新，不重建Host entry。Order固定parent-before-child、
retained aggregate before successor，max-three代表retained root + History + preparing replacement；ready cutover同一notification后只保留successor。
Preparing shell `visibility: hidden`但保留layout，并同时`inert`、`aria-hidden`、pointer-disabled；不得用HTML `hidden`或`display: none`。
Suspended root继续视觉挂载在History后方，保持renderer/local subtree identity，但必须`inert`、`aria-hidden`、pointer-disabled，**不得**
`visibility: hidden`/`display: none`；active entry才visible、interactive。

Host acquisition exact names为`CreateNarrativeStableHostRuntimeInputInternalV1`、
`NarrativeStableHostRuntimeInternalV1`与`createNarrativeStableHostRuntimeInternalV1(input)`。Input只接受exact own-data
`{ session, hostIdentity, portalContainer, inputRouter, isGestureCurrent }`，其中portal必须是non-null `HTMLDivElement`；factory先通过existing
family/session private record完成全部descriptor、portal/router/callback、terminal、distinct Host与same-session portal conflict validation，
**之后**才可调用existing `session.attachHostInternalV1({ hostIdentity })`取得fresh exact lease generation，再返回frozen exact
`{ attachment, renderSource }`。Malformed/foreign/terminal session、borrowed receiver或invalid DOM/router/callback在subscription、renderer/
portal/router read前抛`ui.narrative_stable_host_attachment_invalid`；distinct concurrent Host沿用
`ui.narrative_stable_host_lease_conflict`。Same Host但different portal在current或released grace内抛新exact
`ui.narrative_stable_host_portal_conflict`；portal identity不能在current generation中更新。Attach后的renderer/subscription/ready-record setup若
失败，factory必须立即release该exact fresh lease并撤销partial Host records，不能留下占用logical slot的half-runtime。

```ts
export interface CreateNarrativeStableHostRuntimeInputInternalV1 {
  readonly session: NarrativeStableSessionInternalV1;
  readonly hostIdentity: object;
  readonly portalContainer: HTMLDivElement;
  readonly inputRouter: InputRouterV1;
  readonly isGestureCurrent: (gestureId: ManagedSurfaceGestureIdV1) => boolean;
}

export interface NarrativeStableHostRuntimeInternalV1 {
  readonly attachment: NarrativeStableHostAttachmentInternalV1;
  readonly renderSource: NarrativeStableHostRenderSourceInternalV1;
}

export function createNarrativeStableHostRuntimeInternalV1(
  input: CreateNarrativeStableHostRuntimeInputInternalV1,
): NarrativeStableHostRuntimeInternalV1;
```

`NarrativeStableHostAttachmentInternalV1`继续只有五个frozen exact methods：
`settleRootReadinessReadyInternalV1(rootPreparation, readyCommit)`、
`settleRootReadinessFailedInternalV1(rootPreparation)`、
`settleHistoryReadinessReadyInternalV1(historyPreparation, readyCommit)`、
`settleHistoryReadinessFailedInternalV1(historyPreparation)`与`releaseInternalV1()`；result继续是exact
`NarrativeStableReadinessSettlementResultInternalV1 = settled | stale | faulted`且每行`completion: null`。Failed public method虽保持one
preparation arg，private implementation必须先abort candidate binding，并为replacement/History failure预备retained-root binding，再以`.1`
guarded failed API及contract token/null完成同一assignment前commit；不得走existing unguarded failure旁路。

```ts
export type NarrativeStableReadinessSettlementResultInternalV1 =
  | Readonly<{ readonly kind: "settled"; readonly completion: null }>
  | Readonly<{ readonly kind: "stale"; readonly completion: null }>
  | Readonly<{ readonly kind: "faulted"; readonly completion: null }>;

export interface NarrativeStableHostAttachmentInternalV1 {
  settleRootReadinessReadyInternalV1(
    rootPreparation: NarrativeStableRootPreparationInternalV1,
    readyCommit: NarrativeStableHostReadyCommitInternalV1,
  ): NarrativeStableReadinessSettlementResultInternalV1;
  settleRootReadinessFailedInternalV1(
    rootPreparation: NarrativeStableRootPreparationInternalV1,
  ): NarrativeStableReadinessSettlementResultInternalV1;
  settleHistoryReadinessReadyInternalV1(
    historyPreparation: NarrativeStableHistoryChildPreparationInternalV1,
    readyCommit: NarrativeStableHostReadyCommitInternalV1,
  ): NarrativeStableReadinessSettlementResultInternalV1;
  settleHistoryReadinessFailedInternalV1(
    historyPreparation: NarrativeStableHistoryChildPreparationInternalV1,
  ): NarrativeStableReadinessSettlementResultInternalV1;
  releaseInternalV1(): void;
}
```

Host ready mint新增frozen zero-own-key `NarrativeStableHostReadyCommitInternalV1`、
`PrepareNarrativeStableHostReadyCommitInputInternalV1`、
`prepareNarrativeStableHostReadyCommitInternalV1(input)`与closed
`NarrativeStableHostReadyCommitPreparationResultInternalV1`：exact rows为
`{ kind: "prepared", readyCommit, completion: null } | { kind: "reattached", completion: null } |
{ kind: "stale", completion: null } | { kind: "faulted", completion: null }`。Mint input exact own-data fields只有
`{ hostRuntime, renderEntry, portalShell, initialFocusTarget }`；malformed/foreign/old generation不throw arbitrary getter，分别canonical
faulted/stale且zero mutation。Host为每个entry创建engine-owned `HTMLDivElement` shell并设`tabIndex = -1`；该exact shell也作为
`initialFocusTargetId`对应的registered `HTMLElement`。Focus registration private token绑定exact render entry、target ID、element、portal与Host
generation；本slice只提交该registration/ownership pointer，**绝不调用**DOM `.focus()`、trap、restore或opener。

```ts
declare const narrativeStableHostReadyCommitBrandInternalV1: unique symbol;

export interface NarrativeStableHostReadyCommitInternalV1 {
  readonly [narrativeStableHostReadyCommitBrandInternalV1]: true;
}

export interface PrepareNarrativeStableHostReadyCommitInputInternalV1 {
  readonly hostRuntime: NarrativeStableHostRuntimeInternalV1;
  readonly renderEntry: NarrativeStableHostRenderEntryInternalV1;
  readonly portalShell: HTMLDivElement;
  readonly initialFocusTarget: HTMLElement;
}

export type NarrativeStableHostReadyCommitPreparationResultInternalV1 =
  | Readonly<{
    readonly kind: "prepared";
    readonly readyCommit: NarrativeStableHostReadyCommitInternalV1;
    readonly completion: null;
  }>
  | Readonly<{ readonly kind: "reattached"; readonly completion: null }>
  | Readonly<{ readonly kind: "stale"; readonly completion: null }>
  | Readonly<{ readonly kind: "faulted"; readonly completion: null }>;

export function prepareNarrativeStableHostReadyCommitInternalV1(
  input: PrepareNarrativeStableHostReadyCommitInputInternalV1,
): NarrativeStableHostReadyCommitPreparationResultInternalV1;
```

Preparing entry只有在portal shell已layout、`isConnected`、exact portal `contains(shell)`、prepared action binding/consumer已就绪、focus target
registration exact、`initialFocusTarget === portalShell`且attachment/lease/mount generation仍current时才返回`prepared` readyCommit。Ready guard收到`.1`的authenticated input-contract
token后，readyCommit先no-throw commit candidate prepared binding，再CAS Host/focus generation并返回true；随后才Surface assignment与同步notify。
Active/suspended entry只允许same exact logical Host + same portal在StrictMode grace内返回`reattached`：它重新绑定fresh mount/consumer/focus
generation但不settle readiness、不改topology/input publication、不notify。Old generation callback、different portal、retired entry或foreign shell
只能stale；internal parse/invariant fault才faulted。

Family不得新增Narrative平行child action authority name；它以per-kernel same claimant private claim `.1`的
`ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1`，用authenticated History candidate capture contract准备binding，并以
`claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1`安装family consumer。`.2`期间History的`ui.cancel`与
`player.toggle_history`必须stable consumed、topology exact zero；`.3`才可通过future exact current-child close authority改变consumer outcome。
Preparing candidate永不取得input；Host generation fenced或terminal时所有late route稳定stale/consumed，不fall through到root/lower context。
Root preactive physical admission与History stable-consumed/no-op action consumer都只存在family-private record；不得为二者新增source-relative/public
authority、callback prop或renderer member。

`NarrativeSurfaceHostPropsInternalV1` exact own-data fields只有
`{ session, portalContainer, inputRouter, isGestureCurrent }`，`NarrativeSurfaceHostInternalV1`是唯一new dormant React component；component内部以
stable ref mint `hostIdentity`，不得让caller传bridge/kernel/attachment/render source、renderer catalog、focus manager或Coordinator。Host只用
explicit portal prop，不读取GameStage hook、CSS selector、live Story singleton或legacy `DialoguePanelV1`/`VnLayerV1` lifecycle。

```tsx
export interface NarrativeSurfaceHostPropsInternalV1 {
  readonly session: NarrativeStableSessionInternalV1;
  readonly portalContainer: HTMLDivElement;
  readonly inputRouter: InputRouterV1;
  readonly isGestureCurrent: (gestureId: ManagedSurfaceGestureIdV1) => boolean;
}

export function NarrativeSurfaceHostInternalV1(
  props: NarrativeSurfaceHostPropsInternalV1,
): ReactElement | null;
```

Component用stable ref持有hostIdentity，以layout effect创建/释放runtime，以useSyncExternalStore消费cached render source；每个History entry由
stable keyed child单独useSyncExternalStore消费historyObservation，不能在变长父loop中调用Hook或用effect镜像snapshot。Host只对exact
portalContainer调用createPortal并以renderKey作React key。Preparing shell先layout hidden/inert；layout成功后mint readyCommit，再于coalesced
microtask重验session/runtime generation、entry、portal、shell与focus target后settle。Pre-ready render/layout/observation fault走terminal-once
failure，accepted-ready/reattached fault交回outer diagnostics。

StrictMode/portal release protocol冻结为：effect/ref cleanup、Host unmount或portal loss先同步fence old attachment generation、该generation的
readyCommit/consumer/focus token、new intent/terminal acknowledgment与late callback，使old Host不再驱动；但不在grace开始时提前撤销仍是current的
logical dispatcher/binding record或focus-target ownership slot。无Host grace窗口内consumer必须经generation fence stable-consumed/no-op，不能
fall through到root/lower context；随后只安排per-session
**one coalesced microtask**。Same host + same exact portal若在该task前
setup，fresh lease/mount generation使old callback stale，并可用`reattached`恢复已经ready entry，零额外Surface settlement/publication；same Host
different portal不算successor。Microtask确认仍为same released generation且无successor后，按**root preparation first、History preparation
second**依次terminal-once failed，每次调用及其同步notification后都重验successor；listener若attach legitimate successor立即停止旧cleanup。
Pending fail返回stale/faulted也不阻断最终owner cleanup，只要仍ownerless。

所有pending处理后仍无successor时，Host先terminal-fence session/attachment/render source/subscriptions、current binding/action consumer/focus tokens与
全部late callback，再调用pre-captured exact bridge `disposeInternalV1()`；existing whole-composite disposal在同一structural transition cascade任何ready/
retained root + History。Accepted ready绝不改写成readiness failure，但也绝不留下ready-without-Host或active-but-invisible；这是Host-owner
terminal cleanup，不是S4.2.3 user close/dismiss。Cleanup/dispose throw或fail-closed result被contain，session仍永久terminal，不能ABA mint新lease；
因此grace expiry后old session不能采用fresh portal，portal change只能来自fresh bridge/session/application successor。

每个candidate使用instance-stable error boundary与terminal-once `pending -> ready | failed` gate。Ready前renderer constructor/render、History
canonical observation、ref/layout/portal containment或ready-mint fault调用exact failed method一次；failure accepted后fallback/retained predecessor与
restored binding同批可见。只有settlement返回`settled`才标记accepted-ready；accepted-ready或`reattached` subtree的render/lifecycle fault必须
rethrow/delegate existing outer diagnostics，绝不调用readiness failure、复活predecessor或吞错render `null`。Event handler、passive effect、Promise/
timer/async/Persistence fault不在本boundary承诺内。

`.2.2.2.2` mutation-sensitive RED至少覆盖：

1. observation/captured handle/render observation、renderer props/component、branded render key、render entry/snapshot/source、runtime input/result/factory、ready token/
   mint/result、Host props/component及attachment exact keys/frozen/zero-key/borrowed receiver，并对每个top-level name做UI root、`./internal`、
   package export type/runtime negative guard、对全部member spelling做inventory；
2. History raw fresh-equal、fresh-different、same-identity-mutated、missing/extra/accessor/proxy/prototype/non-callable、throwing get/subscribe/unsubscribe与
   10k canonical churn：malformed observable result仍为existing candidate-preflight faulted zero，one captured subscription、same canonical bytes
   same snapshot、changed bytes fresh copy、raw never exposed，且prototype/accessor/proxy rejection对getter/trap保持exact zero calls；
3. render source initial root、root+History、retained root+History+replacement max-three、replacement failure retain、ready cutover、greater-empty/
   bridge disposal；same vector/phase same snapshot，parent-before-child、retained-before-successor；
4. preparing `visibility:hidden` + layout/inert/aria/pointer，suspended root visually mounted但inert/aria/pointer且not hidden，active visible interactive；
5. root/History ready/fail first-win，initial failure `null` contract，replacement/History failure restored-root token，listener首见ready/fail即命中exact
   binding/focus registration；listener route/release/replacement/dispose reentry与historical outer result；
6. Host factory validation/conflict beforeattach、post-attach failure exact lease release；StrictMode setup-cleanup-setup same host/portal `reattached`、one
   microtask、old layout/ref/error callback stale；distinct Host lease conflict、same Host different portal conflict、disconnected/foreign shell、wrong
   focus target ID；
7. true detach在grace后root-first/History-second fail pending并逐次successor recheck；ready不failure，随后session terminal + captured bridge dispose
   cascade ready/retained aggregate；stale/faulted pending cleanup、dispose fault与listener successor都不产生double settlement或ABA；
8. ready前render/constructor/observation/ref/layout failure与accepted-ready/reattached error delegation，明确排除event/passive/Promise/timer；
9. History two actions在preparing、ready、Host generation fenced、generic Coordinator bypass下均consumed且topology zero；`.3` authority尚不存在；
10. 10,000轮render snapshot、History canonical notify、StrictMode release/reattach、late callback、ready/fail/detach只保留one Host runtime/
    attachment/render snapshot、active subscriber set、one cleanup microtask、max-three entries与per-current-candidate records，无generation/timer/
    renderer/preparation/tombstone history。

`.2.2.2.2` implementation scope严格只有以下**7 files**：

- `engine/packages/ui/src/narrative/narrative-managed-surface-family.ts`及同名`.test.ts`；
- `engine/packages/ui/src/narrative/narrative-managed-surface-session.ts`及同名`.test.ts`；
- new `engine/packages/ui/src/narrative/narrative-surface-host.tsx`及`narrative-surface-host.test.tsx`；
- `engine/packages/ui/src/public-api.test.ts`。

Module ownership同样closed：family.ts拥有candidate preflight capture、bridge/session private provenance、render-source derivation、Host runtime factory、
readiness/action claims、terminal drain与captured bridge disposal；session.ts只增加上述source-relative session/Host/attachment/render type declarations，
不新增raw bridge/kernel accessor、runtime helper或第二factory；host.tsx只拥有React component、portal shell、per-entry subscription/layout/error boundary，
不能读取family WeakMap。Tests分别从source-relative factory/component seam验证，不得导出test-only constructor。

两批均为package-internal/source-relative；不得修改UI root/`./internal`/package exports、existing public runtime-kernel/Coordinator/Surface
contract、input-router source、reducer、stable-contract、Base/Web、CSS、GameStage/composer/`DefaultGameRootV1`、Engine Lab/template/examples、legacy
Dialogue/VN Host、Story writer或live architecture/features/development/website。`.1`若不能在five files内建立contract-token guard、two-prepared
bounded dispatcher、claimed History readiness/action与generic applied-only fence，若install gate必须raw-read full contract或调用external callable，
立即停止并修订。`.2`若需要raw/mutable History state、Coordinator/evidence renderer props、parallel session/Host/topology store、async renderer promise/
stream、ready-then-effect input/focus、different-portal same-session successor、或真实detach后保留ready无Host，也立即停止并修订。

Actual DOM focus/trap/restore/opener与History close/dismiss仍归S4.2.3；clock/reveal/Auto/Skip/suspension归S4.2.4；Engine Lab rig归S4.2.5.1c；
GameStage portal/composer、tracked Story migration、legacy writer/export deletion与browser/prebuilt promotion归S4.3。本design amendment严格docs-only，
本次只修改本文件，并与另两份owning plan的独立docs-only amendment同步；没有source/test/runtime/architecture/Host/public/live diff，也不引用既有focused/UI/full/check/browser/examples/
prebuilt作为本entry新证据。验证只要求target docs `deno fmt --check`与`git diff --check`。本entry完成后唯一current/next、core slice与
implementation gate曾为 **S4.2.2.2.1 DOM-free generic Host-commit atomic substrate**；该pointer现由下述delivery
历史化。

**S4.2.2.2.1 DOM-free generic Host-commit atomic substrate implementation delivery（已完成的历史checkpoint）：**
Delivery严格保持上述action-route pair、stable-composite pair与`public-api.test.ts`五个implementation/test files；只有
implementation-wide matrix命中的既有旧合同按预先批准的test-only amendment迁移：
`managed-surface-coordinator-lifetime.test.ts`、`managed-surface-composition-runtime.test.ts`、
`create-game-ui-composition.test.ts`、`narrative-managed-surface-family.test.ts`与
`narrative-managed-surface-session.test.ts`。没有新增Narrative/React/DOM/portal/renderer production source，亦未扩张UI root、
`./internal`、package exports、generic result/code或live graph。

Action route现由`captureManagedSurfacePreparedInputBindingContractInternalV1()`把raw full input contract在transition外
descriptor-parse并capture为frozen zero-own-key authenticated token；`prepareManagedSurfaceContractBoundActionBindingInternalV1()`
handle与`claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1()` claimed consumer都保持exact receiver/one-shot provenance，
clone、borrow、foreign、abort、repeat与stale commit在router或consumer前fail closed。每个exact
`(InputRouterV1, inputContextId)`只建立one stable dispatcher、one current record与最多two
latest-per-authority inert prepared records；first registrar identity永久冻结，later alternate registrar保持zero-read/zero-call，logical binding
dispose/replacement不再unregister dispatcher。InputRouter只持有one scalar revision high-water供全部context共享；prepare先reserve，abort、
supersede与stale永久burn gap，只有winning commit发布reserved revision。Root replacement与History competitor可同时prepared，first
expected-current pointer commit获胜，loser只能在candidate仍current时fresh prepare；third distinct authority在registrar/router read前
fail closed。Commit gate先完成token、slot、expected current与claimant等module-owned plain-data检查，再只执行预认证pointer/revision swap；
gate内没有registrar、unregister、router、consumer、gesture callback或其他external callable。

Stable composite现以同一个frozen commit-guard contract经
`settleStableReadinessReadyWithCommitGuardInternalV1()`与
`settleStableReadinessFailedWithCommitGuardInternalV1()`完成guarded root ready/fail，并由same claimant独立claim
exact-parent History ready/fail与current-ready History action capture authority。Guard只接收authenticated prepared contract token或
exact `null`；guard false、throw、
non-boolean、stale candidate/token与planning fault均保持state、binding、revision与notification zero，root/History各自保持ready/fail
first-wins。Generic finalizer按stale evidence first、applied-only fence second阻止ordinary readiness、close/dismiss/action与selective owner
mutation旁路current protected History，统一保留historical state并返回`rejected / surface.invalid_transition`；claimed History settlement、
S4.2.1 structural retention以及ready cutover、empty/publisher/Coordinator whole-composite cascade仍可applied。Listener首见accepted
ready/fail时已同时观察到exact binding、root/History phase与restored-parent contract，没有ready-then-effect窗口。

上述五个test-only characterization files已迁移为one stable registration/current-pointer fail-closed，以及claimed readiness或existing
structural cascade；不再把unregister callback或generic History bypass当作terminal owner。`public-api.test.ts`对每个新增top-level
type/value保留UI root、`./internal`及package type/runtime negative guard，并覆盖全部member spelling inventory。Mutation-sensitive `10,000`
轮churn进一步证明production strong state为O(1)：one dispatcher、one current、最多two prepared、scalar high-water与current claimant
authorities；没有per-binding handler、retired cleanup、unregister/revision/candidate/tombstone或append-only history。

验证通过focused `3 files / 119 tests`、UI `80 files / 1244 tests`、full `254 files / 4174 tests`与完整
`deno task check`；typecheck、lint、fmt与`git diff --check`均green。本批未重跑browser、examples或prebuilt；Engine browser
`101 / 101`、examples `45 passed / 2 skipped`与prebuilt Player `38 / 38`只作为prior evidence，不冒充本delivery的HEAD验证。

S4.2.2.2.1现只作为completed historical checkpoint保留；它完成时曾把active current/next、core slice与
implementation gate推进为S4.2.2.2.2，该pointer现由下述delivery历史化。

**S4.2.2.2.2 dormant Narrative React Host implementation delivery（已完成的历史checkpoint）：** Delivery严格保持
以下exact **7-file source-relative scope**：

- `engine/packages/ui/src/narrative/narrative-managed-surface-family.ts`及同名`.test.ts`；
- `engine/packages/ui/src/narrative/narrative-managed-surface-session.ts`及同名`.test.ts`；
- new `engine/packages/ui/src/narrative/narrative-surface-host.tsx`及`narrative-surface-host.test.tsx`；
- `engine/packages/ui/src/public-api.test.ts`。

Family在candidate preflight中descriptor-capture History observation port，只维持one raw subscription，并把raw value规范为
cached frozen canonical History snapshot；canonical bytes未变时复用exact identity，变化时才发布fresh identity，terminal/retirement后
caller-retained observation只读最后canonical identity而不复活raw subscription。Session-owned render source同样缓存frozen snapshot，固定
root-before-History、retained-before-successor，最多只发布retained/current root、History与preparing replacement三个entry。

New dormant `NarrativeSurfaceHostInternalV1`只接受explicit `portalContainer`，以`useSyncExternalStore`消费cached render source，History由
module-level keyed child独立订阅canonical observation，并以`createPortal`安装engine-owned shell。它没有读取GameStage hook、CSS selector、
legacy Host或live Story singleton，也没有接入任何live graph。Preparing root与History都在ready前取得authenticated prepared action binding及
prebuilt generation-local focus attachment；ready guard只在全部currentness/plain-data fence通过后提交binding与Host-local focus registration
pointer，随后才允许Surface assignment与同步notification，且本slice没有调用DOM `.focus()`、trap、restore或opener。

StrictMode release同步fence旧mount generation与late callback，同时在one-microtask grace内保留logical Host、dispatcher/binding与focus-target
ownership；same Host + same portal可用fresh generation `reattached`且保持topology/publication zero。真实detach则按root preparation first、
History preparation second逐项terminal-once fail，并在每次settlement及其同步notification后重验successor；仍无successor时terminal-fence
session/render source/subscriptions/action/focus attachment后dispose captured bridge，ready或retained subtree也不会留下active-but-invisible
state。Ready History的`ui.cancel`与`player.toggle_history`在ready、grace及same-portal reattach中均由authenticated consumer stable
consumed且topology exact zero；actual user close/dismiss仍留给S4.2.3。

Mutation-sensitive coverage证明production retained state保持O(1)：one logical Host/runtime、one cached max-three render snapshot、one raw
History subscription、bounded current candidate/action/focus records与one coalesced cleanup，不保留generation、renderer、preparation或
tombstone history；real `10,000` runtime attach/release/reattach、snapshot、notification、late-callback与detach churn仍满足该边界。
`public-api.test.ts`对全部new top-level names与member spellings保留UI root、`./internal`、package type/runtime negative inventory；没有新增
public/package export、generic Surface/Input contract、Web/Base/CSS/GameStage/Story writer或live wiring。

验证通过focused `4 files / 238 tests`、UI `81 files / 1273 tests`、full `255 files / 4203 tests`、typecheck、lint、fmt、
`git diff --check`与完整`deno task check`。本批因Host仍dormant且没有live graph diff而未重跑browser、examples或prebuilt；既有结果只作
prior evidence，不冒充本delivery的HEAD验证。

S4.2.2.2.2、S4.2.3.0、S4.2.3.1、S4.2.3.2、S4.2.4.0、S4.2.4.1、S4.2.4.2、S4.2.4.3、S4.2.5.0、S4.2.5.1a与S4.2.5.1b现只作为
completed historical checkpoint保留；原S4.2.4 broad checkpoint及原S4.2.5 broad checkpoint也分别只作为已被`.4.0`与`.5.0`细分的
historical entry，原`.5.1`只作为已被`.5.1a`–`.5.1c`细分的historical broad entry。唯一active current/next、core slice与direct
RED/implementation gate现为**PF5/M3 Save migration product surface（当前）**；唯一有效后续顺序为
**S4.3 broad checkpoint（historical） → S4.3.0（docs-only，已完成） → S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）**。

**S4.2.3.0 History close/dismiss/input/focus lifecycle exact entry（docs-only，已完成）：** 原
S4.2.3把generic exact-child topology lifecycle、Narrative routed action、preparing fallback与React Host
focus/opener/physical dismiss混成一个checkpoint；它现只作superseded broad checkpoint。唯一有效顺序为：

1. **S4.2.3.0（本entry，completed）**：只冻结本节exact names/shapes、atomic protocol、RED、file scope与stop；
2. **S4.2.3.1 DOM-free generic exact History-child lifecycle substrate（已完成）**：只交付separate
   same-claimant exact-child close/dismiss authority与whole-composite atomic handoff；
3. **S4.2.3.2 dormant Narrative close/input/root + History focus Host lifecycle（已完成）**：一次性交付candidate-bound
   History controller、preparing/active close、managed input、Dialogue root与History actual focus/trap/restore及physical dismiss；
4. **S4.2.4.0（docs-only，已完成）→ S4.2.4.1（已完成）→ S4.2.4.2（已完成）→ S4.2.4.3（已完成）→
   S4.2.5 broad checkpoint（historical）→ S4.2.5.0（docs-only，已完成）→ S4.2.5.1 broad checkpoint（historical）→
   S4.2.5.1a（已完成）→ S4.2.5.1b（已完成）→ S4.2.5.1c（已完成）→ S4.3 broad checkpoint（historical） → S4.3.0（docs-only，已完成） → S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）**：`.4.0`已冻结player timing/suspension exact split，`.4.1`已交付generic participant，
   `.4.2`与`.4.3`也已依次交付DOM-free controller core及dormant Host player-view integration；随后才进入Engine Lab exact entry、live
   cutover与whole-canvas family。

`.3.1`新增source-relative package-internal
`ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1`，它是frozen exact one-method object：
`commitInternalV1(contract: ManagedSurfacePreparedInputBindingContractInternalV1): boolean`。Contract必须是pure
successor在transition外capture的authenticated **nonnull** token；exact History关闭后必然恢复surviving managed Dialogue parent，
不得传`null`，也不得在kernel fence内读取raw contract、调用router或构造binding。

Closed generic result精确为：

```ts
export type ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1 =
  | Readonly<{ kind: "applied"; code: "surface.closed" | "surface.dismissed" }>
  | Readonly<{ kind: "locked"; code: "surface.dismiss_locked" }>
  | Readonly<{ kind: "stale" }>
  | Readonly<{ kind: "faulted" }>;
```

新authority不得扩张既有preparation/readiness/action authority：

```ts
export interface ManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1 {
  closeExactParentTransientChildInternalV1(
    candidate: unknown,
    guard: ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1,
  ): ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1;
  dismissExactParentTransientChildInternalV1(
    candidate: unknown,
    dismissKind: ManagedSurfaceDismissKindV1,
    guard: ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1,
  ): ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1;
}

export function claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  exactClaimant: object,
): ManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1;
```

Claim必须先命中same kernel existing preparation claim与same exact claimant；same claimant repeat返回same authority，foreign/missing
claimant或kernel、borrowed receiver、clone/spoof在candidate/state read前抛
`ui.managed_surface_stable_exact_parent_transient_child_lifecycle_claim_invalid`。没有release、transfer、second claimant或
Narrative-parallel claim。Result rows全部是canonical frozen identity。

Lifecycle protocol固定为candidate/provenance/current phase先认证，再pure-plan successor、capture nonnull token与prepare state install，最后
guard CAS与assignment。Explicit close在确认candidate仍是current exact top History child后，对preparing与ready两相都只使用existing
`close_top` pure reducer operation并核对receipt exact target；不得使用ready-only `close_expected`、语义错误的`readiness_failed`、
generic Coordinator handle或任何`*_with_owner_preparation_cancel`。Preparing dismiss只用
`route_fallback_dismiss_exact_candidate`，ready-active dismiss只用`route_dismiss`。Invalid dismiss kind在policy/guard前faulted；
locked policy映射canonical `locked / surface.dismiss_locked`且guard unread。Successful close/dismiss分别映射
`applied / surface.closed`与`applied / surface.dismissed`。

Pure successor只退休exact History child、恢复same Dialogue parent active并一次性reflow whole-composite input/publication；same-owner root
replacement、retained root identity/frame及allocation high-water保持。Stale currentness在policy/guard capture前返回canonical stale。Guard只
能调用一次prevalidated captured `commitInternalV1(token)`并做module-owned plain CAS；exact `true`才assignment，`false`为canonical stale，
throw/nonboolean为canonical faulted。任何non-applied path的state/topology/input/publication/allocation/notification与binding commit均exact zero。
Listener在assignment后才被调用，首见child absent时parent与binding已经恢复；listener reentry开fresh child时outer historical result不能关闭它。

S4.2.2.2.1 ordinary generic protected-child fence原样保留：ordinary readiness、close expected/top、dismiss、action与owner mutation仍按existing
stale precedence与applied-only fence返回`rejected / surface.invalid_transition` exact zero。只有本lifecycle authority可提交authenticated
close；claimed readiness与root retain/failure/cutover/empty/dispose structural cascade仍保持existing behavior。`.3.1`不改Narrative，故ready
History两个actions仍stable-consumed/no-op，preparing History仍没有ordinary binding。

`.3.1` RED必须覆盖exact keys/frozen identities/claim exclusivity/wrong receiver/descriptor与negative exports；preparing/ready explicit close及
两phase × Back/Escape/backdrop/routed_cancel；invalid/locked/stale/guard false/throw/nonboolean/prepared drift；root replacement保持与
cutover/empty/terminal first-win；ordinary fence negative与claimed readiness/cascade positive；listener reentry/throw containment；10,000轮bounded
authority/candidate/high-water且无token/tombstone/history ledger。Applied path精确为child absent、same parent active、allocation zero、one atomic
topology/input publication与one notification。

`.3.1` implementation scope精确只有：

- `engine/packages/ui/src/managed-surfaces/managed-surface-stable-composite-state.ts`；
- `engine/packages/ui/src/managed-surfaces/managed-surface-stable-composite-state.test.ts`；
- `engine/packages/ui/src/public-api.test.ts` negative guards。

若必须新增`ManagedSurfaceOperationV1`、generic receipt/code、修改reducer/input-router/runtime-kernel/Coordinator/public contract，若不能在
transition外准备nonnull parent token，或必须削弱ordinary fence/structural cascade，`.3.1`立即停止并回到本entry；不得接Narrative、React、
DOM、focus、GameStage/Web/Story、timer或legacy deletion。

**S4.2.3.1 DOM-free generic exact History-child lifecycle substrate delivery（已完成）：** Delivery严格只有
`engine/packages/ui/src/managed-surfaces/managed-surface-stable-composite-state.ts`、
`engine/packages/ui/src/managed-surfaces/managed-surface-stable-composite-state.test.ts`与
`engine/packages/ui/src/public-api.test.ts`三个exact files。Stable-composite现新增source-relative、package-internal
`ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1`、closed canonical
`ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1`、separate
`ManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1`及其claim；它必须命中existing preparation claim的
same kernel + same exact claimant，same claimant repeat保留one authority，foreign/missing claimant/kernel、borrowed receiver与
clone/spoof继续在candidate/state read前fail closed。

Explicit close认证current exact top candidate后，在preparing与ready两相都只使用existing `close_top` pure reducer operation并核对
receipt exact target；preparing dismiss只使用`route_fallback_dismiss_exact_candidate`，ready-active dismiss只使用
`route_dismiss`。Applied、locked、stale与faulted全部返回frozen canonical identity；invalid dismiss kind、locked policy、stale
currentness及guard false/throw/nonboolean保持冻结的precedence与exact-zero语义，没有引入`close_expected`、`readiness_failed`、
owner-preparation-cancel、new `ManagedSurfaceOperationV1`或generic result/receipt/code。

Successful successor一次性退休exact History child、恢复same Dialogue parent active并reflow whole-composite input/publication；它在
transition外derive authenticated **nonnull** surviving-parent `ManagedSurfacePreparedInputBindingContractInternalV1` token，prepared install
只在guard exact `true`先提交parent input binding后才assignment并同步notification。Same-owner root replacement、retained parent identity、
allocation high-water与listener reentry都保持：listener首见child absent时parent/binding已经恢复，listener立即开启fresh child也不会被outer
historical close命中。Ordinary readiness/close/dismiss/action/owner mutation protected-child fence仍返回existing
`rejected / surface.invalid_transition`，claimed readiness与root retain/failure/cutover/empty/dispose/terminal structural cascade仍保持positive。

Mutation-sensitive coverage包括exact keys/frozen rows、same-claimant reuse、foreign/wrong receiver、guard descriptor/accessor/extra-key、
preparing + ready explicit close、两phase × Back/Escape/backdrop/routed_cancel、locked/stale/false/throw/nonboolean、nonnull token与
guard-before-assignment、root replacement、listener fresh-child reentry、ordinary fence negative、readiness/cascade positive及real `10,000`
lifecycle churn的bounded authority/candidate/high-water；`public-api.test.ts`对UI root与`./internal`保留全部new spelling的type/runtime
negative inventory。没有Narrative family/session/Host、React、DOM/focus、GameStage/Web/Story/live writer或public/package export diff，故本批
没有live behavior或browser/product delivery evidence。

验证通过focused `2 files / 78 tests`、UI `81 files / 1281 tests`、full `255 files / 4211 tests`、完整
`deno task check`、typecheck、lint、fmt与`git diff --check`。本批没有机械重跑browser、examples或prebuilt；Engine browser
`101 / 101`、examples `45 passed / 2 skipped`与prebuilt Player `38 / 38`只作为prior evidence，不冒充本delivery的HEAD验证。
S4.2.3.1现只作为completed historical checkpoint保留；current/next、core slice与implementation gate当时均推进为
**S4.2.3.2 dormant Narrative close/input/root + History focus Host lifecycle**；该pointer现由下述delivery历史化，
其后的S4.2.4 broad checkpoint又已由`.4.0`重切。

`.3.2`新增source-relative frozen controller与closed family result：

```ts
export type NarrativeStableHistoryChildLifecycleResultInternalV1 =
  | Readonly<{ kind: "closed"; completion: null }>
  | Readonly<{ kind: "dismissed"; completion: null }>
  | Readonly<{ kind: "locked"; completion: null }>
  | Readonly<{ kind: "stale"; completion: null }>
  | Readonly<{ kind: "faulted"; completion: null }>;

export interface NarrativeStableHistoryChildControllerInternalV1 {
  closeInternalV1(): NarrativeStableHistoryChildLifecycleResultInternalV1;
  dismissInternalV1(
    dismissKind: ManagedSurfaceDismissKindV1,
  ): NarrativeStableHistoryChildLifecycleResultInternalV1;
}
```

每个History candidate取得one exact controller；preparing→ready与same-host/same-portal reattach保留identity，retirement/root cutover/empty/
terminal/detach/fresh child永久fence旧controller。它只作为History Host render entry的exact `controller` field存在，不进入
`NarrativeStableHistoryRendererPropsInternalV1`、renderer component、History observation、Story props或barrel，也不暴露candidate、parent、
Coordinator/evidence/DOM opener。Family逐行映射generic applied/locked/stale/faulted；borrowed receiver抛
`ui.narrative_stable_history_child_controller_invalid`。

Active History route先走existing managed envelope/publication/input-owner/routing/catalog/gesture gates，且`attempt`必须exact `null`并保持unread；
`player.toggle_history`调用explicit close，`ui.cancel`调用`dismissInternalV1("routed_cancel")`。Close是authenticated consumer内的second
internal transition；outer receipt仍是historical `unchanged / surface.action_routed`，Input仍consumed，close result放`consumerResult`。Old
generation/controller的late action也必须consumed-stale且不能fall through或关闭successor。

Narrative close在调用generic authority前准备fresh surviving-root binding；guard先commit token并CAS root binding/current logical focus ownership，
同步fence child input/focus generation，再允许Surface assignment。Stale/locked/faulted要abort/reconcile prepared bindings，不能留下input gap；
guard内没有DOM `.focus()`、router registration/unregister、notification、allocation、dispose或arbitrary callback。

Preparing History不commitordinary binding；`.3.2`提供one Host-generation-bound fallback-only managed registration，在retained root dispatcher前
自认证current fallback：toggle explicit close、cancel routed_cancel，其他action与viewport consumed，pointer_cancel/focus_loss ignored/reset；
ready/fail/close/release时先logical inert再physical cleanup。Initial Dialogue fallback同样取得one current fallback registration与Narrative stage
isolation，所有background action/viewport consumed，四种root dismiss locked；root replacement沿用retained binding，不另建fallback。

`.3.2`同时交付Dialogue root与History的actual DOM focus/trap/restore。Initial root在第一次Narrative focus前以Host-local O(1) ledger capture
eligible previous owner：必须是connected、same-ownerDocument、位于current Host scope外且不是`body`的`HTMLElement`；ready focus exact
registered shell，closed Tab/Shift+Tab cycle且无tabbable时回shell。Root replacement prepare/
failure不抢focus，cutover focus successor且不restore retired previous owner；ordinary initial failure/empty可restore，但application successor、
Coordinator/session terminal、true detach或higher external focus owner必须suppress。

本entry对`.2.2.2.2`的preparing shell结构作窄精化：每个Host render entry使用one outer focus scope包裹one inner renderer shell。
Outer scope是ready-commit的exact `portalShell`与registered `initialFocusTarget`；当它是current preparing fallback focus owner时必须保持
connected、focusable、非`inert`且不使用`visibility: hidden`或`aria-hidden`，从而真实浏览器可以取得focus并执行trap。Inner renderer shell在
ready前继续`inert`、`aria-hidden`、不可见且pointer-disabled，renderer content绝不提前可见或interactive；suspended/nonowner entry继续按其
phase fence。不得用jsdom对hidden/inert programmatic focus的宽松行为替代该DOM结构。

`.3.2`同时新增不扩runtime object shape的source-relative纯查询：

```ts
export function isNarrativeStableHostRuntimeCurrentInternalV1(
  runtime: NarrativeStableHostRuntimeInternalV1,
): boolean;
```

它只在input是module-owned exact runtime record、该record仍为session current Host runtime、exact lease current且session/bridge active时返回
`true`；malformed、foreign、released、superseded、detached或terminal runtime一律no-throw返回`false`。查询不得mutation、分配、读取DOM/router
或调用caller callable，也不得把lease/session/bridge字段加进`NarrativeStableHostRuntimeInternalV1`。Root previous-owner与History opener
restore在排队前以及coalesced microtask执行前都必须重验该查询；任何一次为false都suppress并scrub对应ledger，尤其mounted Host收到
bridge/Coordinator terminal empty snapshot时绝不restore。该top-level spelling按既有规则加入UI root、`./internal` type/runtime negative
inventory；它不新增object member。实现仍落在既有family/Host/public三项、`.3.2` seven-file scope不扩张。

History opener在exact candidate第一次fallback/active focus前从surviving active parent shell capture connected、same-ownerDocument、位于exact
parent shell内且不是`body`的`HTMLElement`；无eligible
opener则record null。Preparing fallback随后focus/trap并保持root suspended/inert，ready History focus exact shell。Child close/dismiss/readiness fail后
React commit的one coalesced microtask必须重验same parent renderKey active、no fresh History、same runtime/portal generation及no higher external focus
owner，再restore connected opener，否则same parent shell。Root+child retirement、root cutover、successor child、terminal/detach均suppress并scrub。
Focus throw只contain，绝不rollback committed topology；suspended/preparing/nonowner entry不得夺焦。

Escape由Host处理并在DevDock escape owner时忽略；backdrop只接受primary pointerdown + same-pointer pointerup on exact currentTarget，并在dismiss前
arm `useStagePointerGestureFenceV1("narrative")`；cancel/mismatch清除，Escape/Back/routed_cancel不arm。`.3.2`只获准复用existing
`useStageInputIsolationV1("narrative", ...)`与上述pointer fence hook，不修改GameStage。`back`只作为controller authenticated internal route；
browser CloseWatcher/Web ingress留S4.3。Renderer没有close prop或controller facade。

`.3.2` RED覆盖controller/cache/action precedence、fallback/no-fallthrough、root与History focus/trap/opener、Escape/backdrop fence顺序、Back internal
route、replacement/failure/cutover/terminal/detach suppression、StrictMode/reattach/focus throw/listener reentry及10,000轮bounded Host/controller/
registration/DOM ledger。Implementation精确只有family pair、session pair、Host pair与`public-api.test.ts`七文件。任何renderer/Story controller
泄漏、raw candidate/DOM opener、second topology/input/focus writer、async check-close/rollback、owner-preparation-cancel、GameStage/Web/live Story/
CSS/Base/Save/wire修改、timer/reveal/Engine Lab/live cutover均hard stop。

**S4.2.3.2 dormant Narrative close/input/root + History focus Host lifecycle delivery（2026-08-11，已完成的历史checkpoint）：**
Delivery严格保持exact seven-file scope：Narrative family pair、session pair、Host pair与`engine/packages/ui/src/public-api.test.ts`。
每个History candidate现拥有one frozen source-relative controller；preparing、ready与same-portal reattach保留exact identity，close、dismiss、
root cutover、terminal、detach与fresh child永久fence predecessor。Controller只存在于Host History render entry，renderer props、History
observation、Story与barrel均未获得第二close authority。

Close/dismiss在generic lifecycle transition外预备fresh surviving-root binding；assignment前guard一次性CAS authenticated token、root binding、
logical focus ownership与physical admission claim，并先fence child input/focus与fallback logical entry。Surface assignment及同步notification之后才执行
retired binding与fallback physical cleanup；ready/fail/close/release/terminal均保持logical-before-physical，listener reentry不能命中旧controller、旧
binding或input gap。Ready History的toggle与cancel分别进入explicit close与`routed_cancel`，只接受exact unread `null` attempt；outer route继续
stable consumed并返回historical `unchanged / surface.action_routed`，family lifecycle result只出现在`consumerResult`。Preparing History与initial
Dialogue root各复用one Host-generation fallback registration，background action/viewport不向gameplay fall through。

Dormant React Host现用one connected、focusable outer focus scope包裹one hidden/inert inner renderer shell：preparing fallback可在真实浏览器取得
focus并执行closed Tab trap，renderer content仍不可见且不可interactive；ready、suspended与nonowner phase fence原位切换。Host-local bounded
ledger只保存current root previous owner与current History opener；restore在排队前及coalesced microtask执行前复核same parent/no successor、
connected target、external owner与source-relative `isNarrativeStableHostRuntimeCurrentInternalV1(runtime)`。Mounted Host收到bridge/Coordinator
terminal empty publication、root cutover、true detach或successor child时均scrub并suppress stale restore。

Escape只由exact current Host owner处理并排除DevDock escape owner；backdrop只接受primary pointerdown及same-pointer pointerup on exact
`currentTarget`，且先arm existing Narrative Stage pointer fence再同步dismiss。Escape、Back与routed cancel不arm。StrictMode、same-portal
reattach、focus throw、ref-null detach与terminal race均由generation/currentness fence收口；real `10,000` churn证明production retained state仍为
O(1)：one current controller/fallback registration、max-three shells、one root-owner ledger与one History-opener ledger，没有controller、DOM、
registration或tombstone history。全部新增top-level name、`controller`与method spelling均由UI root、`./internal`及package type/runtime negative
inventory封闭，没有public/package/live Story扩张。

验证通过focused `4 files / 263 tests`、UI `81 files / 1306 tests`、full `255 files / 4236 tests`、完整
`deno task check`、typecheck、lint、fmt与`git diff --check`。本批未重跑browser、examples或prebuilt；Engine browser
`101 / 101`、examples `45 passed / 2 skipped`与prebuilt Player `38 / 38`只作为prior evidence，不冒充本delivery的HEAD验证。
S4.2.3.2现只作为completed historical checkpoint保留；它完成时曾把active current/next、core slice与direct entry gate推进为
S4.2.4 broad checkpoint，该pointer现由下述`.4.0` exact entry历史化。

本`.3.0`只同步三份owning design/planning docs，没有source/test/runtime/architecture/public/live diff，也不复用既有runtime evidence冒充
delivery。验证只要求target docs `deno fmt --check`与`git diff --check`；它现只作为completed historical exact-entry checkpoint。

**S4.2.4.0 exact Dialogue player timing/suspension entry（docs-only，已完成）：** 原S4.2.4把generic state-install
atomic participant、DOM-free clock/player controller与React Host view projection混成一个broad checkpoint；现只作为superseded historical
entry。唯一有效顺序冻结为：

1. **S4.2.4.0（本entry，docs-only completed）**：只冻结本节exact names/shapes、两阶段atomic protocol、policy、RED、file scope与stop；
2. **S4.2.4.1 generic prepared state-install participant substrate（已完成）**：先覆盖runtime kernel全部state assignment路径，提供
   composition-local、one-shot、pre-assignment two-phase participant；
3. **S4.2.4.2 DOM-free Narrative DialoguePlayerController core（已完成）**：再交付captured clock/profile/text ports、reveal/Pause/Auto/Skip scheduling、
   bridge-owned mode reset、same-transition first-win与History/higher-blocker remaining；
4. **S4.2.4.3 dormant Host player-view integration（已完成）**：最后把cached immutable player observation接入existing session/render source/React Host，
   renderer只取得passive view data；
5. **S4.2.5 broad checkpoint（historical）→ S4.2.5.0（docs-only，已完成）→ S4.2.5.1 broad checkpoint（historical）→
   S4.2.5.1a（已完成）→ S4.2.5.1b（已完成）→ S4.2.5.1c（已完成）→ S4.3 broad checkpoint（historical） → S4.3.0（docs-only，已完成） → S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）**：随后依次进入dormant Engine Lab Narrative conformance
   implementation、live atomic cutover与whole-canvas family。

`.4.1`新增的generic runtime exact contract为：

```ts
export interface ManagedSurfaceRuntimeStateInstallParticipantInternalV1<TState> {
  prepareStateInstallInternalV1(
    previousState: TState,
    nextState: TState,
  ): ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1 | null;
}

export interface ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1 {
  validateInternalV1(): boolean;
  commitLogicalInternalV1(): void;
  abortInternalV1(): void;
  completeInstalledInternalV1(): void;
}
```

Runtime kernel通过一次性package-internal setter接收participant：

```ts
interface ManagedSurfaceRuntimeKernelInternalV1<TState> {
  // existing members omitted
  setStateInstallParticipantInternalV1(
    participant: ManagedSurfaceRuntimeStateInstallParticipantInternalV1<TState>,
  ): void;
}
```

Stable-composite specialization只收窄state type，不再建立claim wrapper：

```ts
export interface ManagedSurfaceStableCompositeStateInstallParticipantInternalV1
  extends
    ManagedSurfaceRuntimeStateInstallParticipantInternalV1<
      ManagedSurfaceStableCompositeStateInternalV1
    > {}
```

Setter只允许在非terminal kernel上安装一次participant，并在赋值前确认
`prepareStateInstallInternalV1`可调用。participant与nonnull prepared value都是package-internal typed collaborator：允许普通未冻结对象和额外内部字段，
不做exact-key、descriptor、Proxy/monkey-patch、claimant、cross-kernel owner或WeakMap authenticity检查。Kernel直接调用typed methods并contain
prepare/validate/commit/abort/complete fault；不建立participant registry、transfer protocol或prepared真实性/tombstone系统。Terminal install在listener前
清除participant；每次state change最多持有一个外层prepared transaction，且不保留previous/next/controller/timestamp history。

Kernel的三个assignment入口——ordinary transient transition、`transitionStateInternalV1`与prepared-state commit——统一使用下列顺序：

1. 在既有transition lock内只运行pure reducer/transition并derive exact `previousState`/`nextState`；prepared path先authenticate exact token并验证
   initial expected state，clone/foreign/consumed token或initial drift在participant callback前返回existing `invalid | stale`；`previous === next`不调用participant；
2. 释放lock后调用一次当前participant `prepareStateInstallInternalV1(previous,next)`；Narrative可以在这里读取clock
   `nowInternalV1()`并把该successful prepared timestamp固定为本次transition timestamp，但不得mutation kernel state；callback同步reentry若安装
   successor，外层稍后只可stale；
3. 重新取得lock并先验证expected kernel state、install generation与participant仍未被terminal fence，再调用一次module-owned
   `validateInternalV1()`；只有boolean `true`继续，`false`为stale，throw/nonboolean为fault；
4. 随后运行existing operation-specific guard；guard成功后才调用no-throw/no-caller-call `commitLogicalInternalV1()`，它只允许CAS controller
   generation/attempt、integer cursor、sub-character remainder与remaining并逻辑fence old callbacks；之后才执行唯一state assignment；
5. assignment后旧generation已stale；完整既有listener vector返回后才调用一次`completeInstalledInternalV1()`，在transition stack外best-effort
   cancel old physical tick并为fresh generation请求至多one next tick。Cancel/request throw被contain，listener同步安装successor时old completion只可stale；
6. expected-state drift、terminal fence、participant/operation guard失败，以及nonnull prepared value在validate或安装阶段失败时，
   都best-effort调用一次`abortInternalV1()`并保持controller/state/notification exact zero；prepare throw时没有prepared abort且postcondition同样
   exact zero。Missing/non-callable prepared method在首次直接调用时归participant fault，abort fault继续contain。Abort本身应no-throw且不得调用
   clock/router/DOM/user code。

Exact `null` prepare result表示本次transition不参与，后续按既有路径安装且没有validate/commit/abort/complete callback。其余结果分类冻结为：

- existing adapter planning/validation fault保持原error且没有participant callback；prepared clone/foreign/consumed token返回`invalid`、initial expected
  drift返回`stale`，同样没有participant callback；
- participant prepare callback返回后，必须先重验expected state/install generation/terminal fence；该currentness drift优先于null、throw或
  malformed output，外层只可走下述stale结果。Nonnull prepared best-effort abort once，null/throw没有abort；
- prepare callback后的expected-state ABA/terminal drift或`validateInternalV1()` false：direct transient返回既有
  `rejected / surface.invalid_transition` exact-zero receipt，direct generic state transition抛既有
  `TypeError("ui.managed_surface_runtime_state_stale")`，prepared install返回existing `stale`；nonnull prepared value先best-effort abort once；
- current状态下的participant prepare throw、missing/non-callable prepared method、validate throw/nonboolean：direct transient返回既有
  `faulted / surface.transition_faulted` exact-zero
  receipt，direct generic state transition抛exact
  `TypeError("ui.managed_surface_runtime_state_install_participant_faulted")`，prepared install返回existing `aborted`；
- boolean operation guard exact false保持existing `aborted`；operation guard throw先abort nonnull prepared participant，再原样rethrow original error、
  consume prepared token且state/notification zero，保持既有prepared与terminal guard compatibility；
- successful assignment后`completeInstalledInternalV1()` throw必须contain且不得改变已提交result/receipt；unexpected logical-commit throw按participant
  fault隔离state assignment，但由于logical commit不得包含fallible caller work，若不能证明其no-throw与controller-delta atomicity，`.4.1`停止。

本entry不新增`ManagedSurfaceOperationV1`、public receipt/code或generic rollback。Operation guard与participant logical commit之间不允许fallible
caller work。

`.4.1` mutation RED必须覆盖三assignment入口、one-shot setter callable check、unfrozen/extra-key internal collaborator、previous-equals-next unread、prepare callback reentry、expected-state
ABA、validate false/throw/nonboolean、operation guard false/throw、logical commit ordering、notification reentry、cancel/request throw、terminal及
10,000轮one-participant/one-prepared bounded churn。Implementation范围为：

- `engine/packages/ui/src/managed-surfaces/managed-surface-runtime-kernel.ts`及同名`.test.ts`；
- `engine/packages/ui/src/managed-surfaces/managed-surface-stable-composite-state.ts`及同名`.test.ts`；
- `engine/packages/ui/src/narrative/narrative-managed-surface-family.ts`的一次性composition接线；
- `engine/packages/ui/src/public-api.test.ts` negative guards。

不得建立participant claim/owner/WeakMap、array/Map、exact shape admission或intrinsic capture。在assignment后subscriber才计算remaining、在kernel CAS fence首次调用raw clock、改变generic operation/result/code、
修改reducer/InputRouter/Coordinator/public barrel，或不能覆盖上述三个assignment入口，`.4.1`立即停止并回到本entry。

`.4.2`把candidate既有`playerProfile`、`presentationClock`与`textResolver` required fields从opaque identity收窄为下列raw ports的
descriptor-captured zero-key handles；candidate snapshot key set与required port IDs保持不变：

```ts
export interface NarrativeStableDialoguePlayerClockPortInternalV1 {
  nowInternalV1(): number;
  requestTickInternalV1(callback: (nowMs: number) => void): () => void;
  prefersReducedMotionInternalV1(): boolean;
}

export interface NarrativeStableDialoguePlayerProfilePortInternalV1 {
  getSnapshotInternalV1(): DeepReadonly<PlayerProfileV1>;
  subscribeInternalV1(listener: () => void): () => void;
  markSeenInternalV1(definitionId: string, seenRevision: number): void;
}

export interface NarrativeStableDialoguePlayerTextResolverPortInternalV1 {
  resolveTextInternalV1(textId: string): string;
}

declare const narrativeStableCapturedDialoguePlayerClockPortBrandInternalV1: unique symbol;
export interface NarrativeStableCapturedDialoguePlayerClockPortInternalV1 {
  readonly [narrativeStableCapturedDialoguePlayerClockPortBrandInternalV1]: true;
}
declare const narrativeStableCapturedDialoguePlayerProfilePortBrandInternalV1: unique symbol;
export interface NarrativeStableCapturedDialoguePlayerProfilePortInternalV1 {
  readonly [narrativeStableCapturedDialoguePlayerProfilePortBrandInternalV1]: true;
}
declare const narrativeStableCapturedDialoguePlayerTextResolverPortBrandInternalV1: unique symbol;
export interface NarrativeStableCapturedDialoguePlayerTextResolverPortInternalV1 {
  readonly [narrativeStableCapturedDialoguePlayerTextResolverPortBrandInternalV1]: true;
}
```

三个captured interface使用private `unique symbol` brand并暴露frozen **zero-own-key** handle；brand const不export，也不是runtime/member
spelling。Raw ports必须是exact plain own-data method object，preflight descriptor-capture receiver/callables，
不调用method；malformed/throwing reflection继续归既有`faulted / narrative.candidate_preflight_faulted`且candidate/allocation/topology zero。
Clock/profile/text raw receiver、store、callback与cancel handle永不进入candidate snapshot、renderer props或public export。

Player policy与passive snapshot精确为：

```ts
export interface NarrativeStableDialoguePlayerPolicySnapshotInternalV1 {
  readonly textRevealCharsPerSecond: number;
  readonly autoWaitMs: number;
  readonly skipPolicy: "skip_read" | "skip_all";
  readonly reducedMotion: boolean;
}

export type NarrativeStableDialoguePlayerSnapshotInternalV1 =
  | Readonly<{
    kind: "say";
    phase: "preparing" | "active" | "suspended";
    playbackMode: NarrativeStablePlaybackModeInternalV1;
    playerProfile: DeepReadonly<PlayerProfileV1>;
    resolvedSpeakerText: string | null;
    resolvedText: string;
    revealedCharacters: number;
    revealLength: number;
    revealComplete: boolean;
  }>
  | Readonly<{
    kind: "passive";
    phase: "preparing" | "active" | "suspended";
    playbackMode: "normal";
    playerProfile: DeepReadonly<PlayerProfileV1>;
  }>;

export interface CreateNarrativeStableDialoguePlayerControllerInputInternalV1 {
  readonly bridge: NarrativeStablePublisherBridgeInternalV1;
  readonly target: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
}

export interface NarrativeStableDialoguePlayerControllerInternalV1 {
  getSnapshotInternalV1(): NarrativeStableDialoguePlayerSnapshotInternalV1;
  subscribeInternalV1(listener: () => void): () => void;
  disposeInternalV1(): void;
}

export function createNarrativeStableDialoguePlayerControllerInternalV1(
  input: CreateNarrativeStableDialoguePlayerControllerInputInternalV1,
): NarrativeStableDialoguePlayerControllerInternalV1;
```

Factory input是exact three-key plain-data record；family必须证明`target`的private target-frame record仍属于exact bridge且其frame正是
`frame`，随后controller只保留该fresh frame/candidate generation的bounded provenance。Foreign/retired target、value-equal frame、readiness retry的
predecessor frame、accessor/extra key与borrowed controller receiver在clock/profile/text read前fail closed；fresh retry必须取得fresh frame/controller。
Dispose/retirement先logical fence generation/attempt，再把mutable private holder中的bridge/target/frame/raw bindings/cancel/subscribers全部scrub；
caller-retained controller late snapshot只返回最后frozen passive snapshot、late subscribe返回frozen no-op、repeat dispose idempotent，不反向保活owner。

Policy snapshot必须是frozen exact four-key safe data：reveal rate与auto wait为nonnegative safe integer，reduced motion为boolean。Controller只维持
one captured raw profile subscription；profile change规范为fresh frozen current profile并只在identity变化时发布fresh player snapshot，timing policy/
resolved text保持本frame不变，unsubscribe在logical fence之后best-effort contain。Clock `now`与tick
timestamp单位均为finite nonnegative safe-integer milliseconds且per exact clock monotonic；regression、throw、invalid/noncallable cancel、callback
reentry或unexpected duplicate tick先重验controller/currentness，current fault只fence该controller并reset bridge-owned mode，stale fault不命中
successor。每controller至多one scheduled tick、one cancel handle、one generation、one current automatic attempt与bounded subscribers。

S4 V1 reveal cursor按JavaScript **UTF-16 code unit**计数；`revealLength === resolvedText.length`，因此renderer可以用同一captured resolved text
稳定slice。Fixed Skip cadence是engine-owned **40ms**，不进入profile/Save。Policy、resolved speaker/text与reveal length在每个fresh target frame首次
prepare时捕获；同frame profile/locale/reduced-motion变化可更新cached profile view与seen query，但不得重算当前rate/deadline、重启text或改变
resolved text。History/higher-blocker suspension保留同frame policy、integer cursor、sub-character remainder与`max(0, deadline - preparedTimestamp)`；
root/source replacement使用fresh frame/controller并重新capture。Reduced motion或rate 0的fresh Say初始即complete。

Seen ownership冻结为：每个exact Say controller只在首次full reveal（natural tick、manual `revealAll`、fresh instant）或`skip_all`即将dispatch该
unread Say前调用一次captured `markSeenInternalV1(definitionId, seenRevision)`；logical once flag先提交，callback throw/reentry被contain且不回滚。
`skip_read`在每个fresh skip step调用captured profile snapshot判定；unread时不reveal、不mark、不semantic dispatch，而由bridge-owned compare-and-set
把mode从exact current `skip`降回`normal`。Controller不得暴露任意`setMode`或建立第二mode writer。

New attempts/results的exact names与closed rows为：

```ts
declare const narrativeStableSayPlayerAutoAttemptBrandInternalV1: unique symbol;
export interface NarrativeStableSayPlayerAutoAttemptInternalV1 {
  readonly [narrativeStableSayPlayerAutoAttemptBrandInternalV1]: true;
}
declare const narrativeStableSaySkipAttemptBrandInternalV1: unique symbol;
export interface NarrativeStableSaySkipAttemptInternalV1 {
  readonly [narrativeStableSaySkipAttemptBrandInternalV1]: true;
}
declare const narrativeStablePlaybackModeResetAttemptBrandInternalV1: unique symbol;
export interface NarrativeStablePlaybackModeResetAttemptInternalV1 {
  readonly [narrativeStablePlaybackModeResetAttemptBrandInternalV1]: true;
}

export type NarrativeStableSayPlayerAutoDispatchResultInternalV1 =
  | Readonly<{ kind: "dispatched"; completion: Promise<unknown> }>
  | Readonly<{ kind: "not_ready"; completion: null }>
  | Readonly<{ kind: "stale"; completion: null }>
  | Readonly<{ kind: "faulted"; completion: null }>;

export type NarrativeStableSaySkipDispatchResultInternalV1 =
  | Readonly<{ kind: "dispatched"; completion: Promise<unknown> }>
  | Readonly<{ kind: "stopped"; completion: null }>
  | Readonly<{ kind: "stale"; completion: null }>
  | Readonly<{ kind: "faulted"; completion: null }>;

export type NarrativeStablePlaybackModeResetDispatchResultInternalV1 =
  | Readonly<{ kind: "reset"; mode: "normal"; completion: null }>
  | Readonly<{ kind: "stale"; completion: null }>
  | Readonly<{ kind: "faulted"; completion: null }>;
```

三个attempt都是fresh frozen zero-key private-brand capability；它们的issue/dispatch完全module-private，不新增controller member或top-level
function，RED只通过captured tick、exact result row、semantic dispatch与bridge mode effect观测。Content-owned auto继续只接受
`advancePolicy: "auto"`；player Auto对`confirm | auto`都等full reveal再用captured `autoWaitMs`；Skip优先于两种auto并绕过reveal wait。
Player-auto/Skip/manual/content-auto必须复用existing per-frame `sayCallbackClaim`与`saySemanticInFlightClaim`，Pause继续复用existing
Pause-expiry attempt；不得建立第二semantic claim。Manual/timer/skip/History/blocker在同一composition transition中first-win：suspension logical
commit先赢则old tick/attempt stale-zero；timer先seal shared claim则History intent沿既有claim gate失败。Semantic call前seal；Promise settlement
drain publication/reconcile后只以exact token CAS清理，resolved/rejected均不复活loser。

只有exact direct ready-active root运行tick。Preparing、readiness gap、retained predecessor与suspended controller只保存passive state；History
preparing/ready、foreign higher blocker与source suspension都经`.4.1` participant在同一install logical commit保存remaining并撤销attempt。Resume用fresh
generation继续remaining；remaining 0仍必须等successor assignment及完整notification之后由**下一次 clock tick**dispatch。Accepted fresh non-Say
source boundary立即把mode CAS回normal并冻结retained predecessor controller；Pause只在ready-active后按`durationMs`arm existing expiry attempt并沿
相同suspension remaining，choice/barrier/custom无timer。Empty、epoch/
publisher-lease/application successor、true detach、terminal或dispose永久cancel/reset；source replacement冻结old controller，fresh Say按current bridge
mode重建。

`.4.2` RED覆盖raw/captured descriptors、policy/text/profile faults、clock monotonic/reentry/cancel、UTF-16/remainder、instant reveal、manual first-win、
content auto/player auto/Skip/Pause、seen/reset、History/higher blocker、replacement/retry/empty/terminal、Promise/ABA与10,000 timer/controller churn。
Implementation精确为以下七files；其中session与Host只做test fixture/oracle迁移，production source保持zero diff：

- new `engine/packages/ui/src/narrative/dialogue-player-controller.ts`及同名`.test.ts`；
- `engine/packages/ui/src/narrative/narrative-managed-surface-family.ts`及同名`.test.ts`；
- `engine/packages/ui/src/narrative/narrative-managed-surface-session.test.ts`与
  `engine/packages/ui/src/narrative/narrative-surface-host.test.tsx`，只把旧opaque profile/clock/text fixture换成exact raw ports并把interim
  renderer expectations改为captured zero-key handles；
- `engine/packages/ui/src/public-api.test.ts` negative guards。

若DOM-free core还必须读取React/DOM、修改session/Host production source、让上述两份test-only migration承载新runtime authority、复用legacy
`TextRevealV1`/`PlaybackControllerV1`、扩generic receipt/Base/Save、调用
`Date.now`/`setTimeout`、把profile/clock/controller交给renderer，或无法复用existing claims，`.4.2`立即停止。

`.4.3`新增只读proxy：

```ts
export type NarrativeStableDialoguePlayerTextResolverInternalV1 = (
  textId: string,
) => string;

export interface NarrativeStableDialoguePlayerObservationInternalV1 {
  getSnapshotInternalV1(): NarrativeStableDialoguePlayerSnapshotInternalV1;
  subscribeInternalV1(listener: () => void): () => void;
}
```

每个Dialogue Host render entry新增exact `playerObservation` field；preparing→ready→suspended→resume与same-host/same-portal StrictMode reattach保持
exact observation/controller/renderKey identity，root replacement/failure/empty/terminal/fresh frame永久fence old proxy。Observation只保留current frozen
snapshot与bounded listener set；late get返回最后snapshot，late subscribe为frozen no-op，不反向保活raw clock/profile/text ports或bridge/kernel。

`NarrativeStableDialogueRendererPropsInternalV1`保留现有`kind | pending | visualConfig | playerProfile | textResolver |
quickMenuContribution` fields并新增exact `playerView: NarrativeStableDialoguePlayerSnapshotInternalV1`；Dialogue与History props中的
`playerProfile`都收窄为`DeepReadonly<PlayerProfileV1>`，`textResolver`都收窄为
`NarrativeStableDialoguePlayerTextResolverInternalV1`。Host使用module-level keyed Dialogue child与
`useSyncExternalStore(playerObservation...)`materialize current frozen snapshot；`playerProfile`只传current immutable
`DeepReadonly<PlayerProfileV1>`，`textResolver`只传descriptor-captured/bound read callable，绝不传raw store/receiver。Renderer不得取得
`NarrativeStableDialoguePlayerControllerInternalV1`、observation、clock、deadline/remaining、mode reset、semantic port、Surface/Coordinator evidence或
timer lifecycle；presentation intents仍走existing managed route/admission，不新增React-local writer。

Preparing/retained/suspended shell继续遵守existing inner inert/hidden与outer focus ownership；Host不计算cursor/deadline、不请求tick、不reset mode，
只订阅passive view。Pre-ready observation/render fault沿existing readiness-failed terminal-once；accepted-ready fault继续rethrow outer diagnostics owner。
StrictMode effect probe与same-portal reattach不创建fresh controller/generation/tick；true detach/terminal由family participant先logical fence再在existing
Host cleanup里physical cancel。Profile/text/clock callback、observation listener与renderer reentry都必须在publish前后复核exact generation；snapshot
equal复用identity且zero notify。

`.4.3` RED覆盖exact entry/props keys、`useSyncExternalStore` identity、preparing/active/suspended/replacement max-three view、History open/close与higher
blocker remaining、zero-next-tick、StrictMode/reattach/detach/terminal、pre/post-ready fault、profile/text churn、late proxy及10,000 Host/controller/
snapshot churn。Implementation精确只有family pair、session pair、Host pair与`engine/packages/ui/src/public-api.test.ts`七files。任何new top-level/
member spelling都必须进入UI root、`./internal`与package type/runtime negative inventory；public/package barrel、architecture/features/development/live
Story保持zero diff。

若renderer必须拿raw controller/clock/profile store、Host必须建立timer/deadline/mode writer、History suspension只能post-notify、StrictMode必须
重建generation，或需要Engine Lab/GameStage/composer/DialoguePanel/VnLayer/Web/CSS/Base/Save/live wiring，`.4.3`立即停止；Engine Lab只归`.5`，
tracked consumer migration、legacy writer/export删除与browser/examples/prebuilt promotion只归S4.3。

本`.4.0`严格只修改本design与两份owning plans，不修改source/test/runtime/architecture/features/development/roadmap/website/live graph，也不
复用旧runtime evidence冒充delivery。Verification只有三份target docs的`deno fmt --check`与scoped `git diff --check`。本entry完成后唯一active
current/next、core slice与direct RED gate曾为**S4.2.4.1 generic prepared state-install participant substrate**；该pointer现由下述delivery
历史化。

**S4.2.4.1 generic prepared state-install participant substrate delivery（已完成）：** 本delivery精确只修改
`engine/packages/ui/src/managed-surfaces/managed-surface-runtime-kernel.ts`及同名`.test.ts`、
`engine/packages/ui/src/managed-surfaces/managed-surface-stable-composite-state.ts`及同名`.test.ts`与
`engine/packages/ui/src/public-api.test.ts`五文件。Generic runtime新增composition-local、same-claimant exact state-install participant与
prepared participant，stable composite只经既有private composite→runtime-kernel alias提供specialized claim wrapper；ordinary transient
transition、direct `transitionStateInternalV1`与prepared-state commit三个assignment入口统一执行prepare、currentness/ABA validate、operation
gate、logical commit、唯一assignment、完整listener vector与post-notify physical completion顺序。

Initial token drift、post-prepare ABA、validate false/throw/nonboolean、operation gate false/throw、logical-commit fault、terminal fence与listener
同步successor completion均按`.4.0`冻结result/policy保持state/notification exact zero或installed后best-effort completion；terminal assignment后、
listener前永久fence claim。Global weak registry只让participant key指向无kernel反向引用的frozen owner token，每kernel保留one claim record，既阻止foreign/terminal
transfer又保持production retained state O(1)。`public-api.test.ts`对五个new top-level name及participant member spellings保留UI root与
`./internal` type/runtime negative inventory；没有public/`./internal` barrel、package export、Host/React/Web/live claimant或tracked Story扩张。

验证通过focused `3 files / 129 tests`、UI `82 files / 1357 tests`、full `256 files / 4287 tests`、完整`deno task check`、typecheck、lint、fmt与
`git diff --check`。本批未重跑browser、examples或prebuilt；Engine browser `101 / 101`、examples `45 passed / 2 skipped`与prebuilt Player
`38 / 38`只作为prior evidence，不冒充本delivery的HEAD验证。S4.2.4.0与S4.2.4.1现只作为completed historical checkpoint保留；该pointer
已由下述`.4.2` delivery历史化。

**S4.2.4.2 DOM-free Narrative DialoguePlayerController core delivery（commit `21f700f`，已完成）：** 本delivery精确保持seven-file
scope：新增`engine/packages/ui/src/narrative/dialogue-player-controller.ts`及同名`.test.ts`，修改
`engine/packages/ui/src/narrative/narrative-managed-surface-family.ts`及同名`.test.ts`、
`engine/packages/ui/src/narrative/narrative-managed-surface-session.test.ts`、
`engine/packages/ui/src/narrative/narrative-surface-host.test.tsx`与`engine/packages/ui/src/public-api.test.ts`。其中session与Host
只有test fixture/oracle迁移，production source保持zero diff；没有React/DOM、renderer、Web、Base、Save、Story或live graph扩张。

Candidate required profile/clock/text fields现只接受exact own-data raw ports，并在preflight时descriptor-capture receiver/callables为frozen
zero-key handles；raw receiver、store、callback、cancel与controller均未进入candidate snapshot、renderer props或public/package export。每个fresh
target/frame取得one frozen Dialogue player controller与one captured profile subscription；policy、resolved speaker/text、UTF-16 reveal length按frame
冻结，profile identity churn只更新cached immutable profile view。Controller统一交付natural/manual reveal、content auto、player Auto、Skip与Pause
expiry，复用existing manual/content/semantic/Pause claims实现first-win；seen write logical-once先于dispatch，automatic rejected completion有明确sink，
bridge仍是playback mode唯一writer。

Clock只接受nonnegative safe-integer millisecond timestamp并保持monotonic；one current generation、one tick/cancel与one automatic attempt覆盖
ready-active factory startup、rate-zero/reduced-motion instant completion、delayed Auto/Skip fresh baseline、manual reveal fresh rearm、sync callback、duplicate
callback、raw throw/reentry与stale successor fencing。Family消费`.4.1` participant，在state assignment前捕获suspend/resume timestamp并logical commit
cursor、sub-character remainder、remaining与generation，完整notification后才best-effort cancel predecessor并arm fresh one-shot tick；History/higher
blocker suspension、remaining-zero next-tick dispatch、resume与instant/content/player/Skip/Pause rows均保持same-transition ordering。Retirement scrub
bridge/target/frame/raw bindings/subscribers与opaque attempts，10,000 controller/timer churn保持one current record与bounded O(1) retained state。

`public-api.test.ts`对全部new top-level names与controller/port member spellings保留UI root、`./internal`及package type/runtime negative inventory；
private brand const、automatic issue/dispatch与raw authority均未成为barrel或runtime export。验证通过focused `5 files / 334 tests`、UI
`83 files / 1428 tests`、full `257 files / 4358 tests`，以及canonical `deno task check`；其中fmt、lint、styles、typecheck、determinism、assets、
stories与e2e build全部green。本批未重跑browser、examples或prebuilt；Engine browser `101 / 101`、examples `45 passed / 2 skipped`与prebuilt
Player `38 / 38`只作为prior evidence，不冒充本delivery的HEAD验证。

S4.2.4.0、S4.2.4.1与S4.2.4.2现只作为completed historical checkpoint保留；它们完成时曾把唯一live current/next、core slice与
direct entry/RED gate推进为S4.2.4.3，该pointer现由下述delivery历史化。

**S4.2.4.3 dormant Host player-view integration delivery（commit `1438b32`，已完成）：** 本delivery精确只修改
`engine/packages/ui/src/narrative/narrative-managed-surface-family.ts`及同名`.test.ts`、
`engine/packages/ui/src/narrative/narrative-managed-surface-session.ts`及同名`.test.ts`、
`engine/packages/ui/src/narrative/narrative-surface-host.tsx`及同名`.test.tsx`与`engine/packages/ui/src/public-api.test.ts`七文件；
没有新增module、public/package barrel、generic Surface/Input contract、Web/Base/CSS/GameStage/Story writer或live wiring。

Family/session现为每个exact Dialogue attempt/frame建立one cached frozen player observation、one captured/bound safe text resolver与current
immutable profile view；Dialogue render entry只新增`playerObservation`，renderer props仍由Host才补入`playerView`。Preparing→ready→
suspended→resume、same-host/same-portal StrictMode reattach与same-frame isolated fault均保持exact renderKey/controller/observation identity；fresh
retry/frame与source replacement取得fresh materialization，failure、empty、terminal及retired predecessor永久fence old proxy。Late observation只返回
same final passive snapshot并让late subscribe成为frozen no-op；safe resolver不反向保活raw profile/text receiver、controller、bridge或kernel。

Host使用module-level keyed Dialogue child与`useSyncExternalStore`订阅exact observation，向renderer只交付existing six props加current frozen
`playerView`，并以player view中的current immutable profile覆盖renderer `playerProfile`；raw observation/controller/clock/deadline/remaining/mode或
semantic evidence均不越过renderer boundary。History profile churn会mint fresh safe props而保留same renderKey/controller/History observation、DOM
node与current focus，equal identity保持zero notification/rerender。

Controller factory的profile get/subscribe、reduced-motion与text-resolution fault会先materialize stable fault entry/proxy：pre-ready observation read
通过existing per-entry error boundary terminal-once settle readiness failure，accepted-ready read则继续交给outer diagnostics owner；retire后proxy只返回
final passive snapshot且不保留raw error或callable。Terminal与replacement participant先logical fence/scrub，再在完整kernel listener vector之后
deferred publish final observation；delivery前unsubscribe可取消pending callback，standalone controller fault则同步且exact-once发布final view。Listener/
profile/renderer reentry、max-three topology、zero-next-tick、10,000 Host/controller/snapshot churn与production retained state均维持bounded O(1)。

`public-api.test.ts`对`NarrativeStableDialoguePlayerTextResolverInternalV1`、
`NarrativeStableDialoguePlayerObservationInternalV1`及`playerObservation`/`playerView` member spellings保留UI root、`./internal`与package
type/runtime negative inventory；private keyed child、raw authority与fault materialization均未成为export。验证通过focused `4 files / 296 tests`、
UI `83 files / 1442 tests`与full canonical check `257 files / 4372 tests`；format、lint、styles、typecheck、determinism、assets、stories与e2e build
全部green。本批未重跑browser、examples或prebuilt；Engine browser `101 / 101`、examples `45 passed / 2 skipped`与prebuilt Player
`38 / 38`只作为prior evidence，不冒充本delivery的HEAD验证。

S4.2.4.0、S4.2.4.1、S4.2.4.2与S4.2.4.3现只作为completed historical checkpoint保留；原S4.2.5 broad
checkpoint也只作为已被`.5.0`细分的historical entry。2026-08-11 live RED又证明原`.5.1`把public InputRouter facade、Host exact
gesture callback与完整conformance rig误并为一个thirteen-file implementation checkpoint；该`.5.1`现只作为已被`.5.1a`–`.5.1c`细分的
historical broad entry；`.5.1a`、`.5.1b`与`.5.1c`也均已交付并转为completed historical checkpoint。唯一live current/next、core slice与direct RED gate现为
**PF5/M3 Save migration product surface（当前）**，后续唯一顺序为
**S4.3 broad checkpoint（historical） → S4.3.0（docs-only，已完成） → S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）**。

**S4.2.5.0 dormant Engine Lab Narrative conformance exact entry correction（docs-only，已完成）：** 原S4.2.5把production-clean
conformance package entry、high-level rig、real Engine Lab semantic adapter、React Host、mutually-exclusive legacy opt-in、boundedness与
promotion boundary留成一句broad checkpoint，不能直接进入RED或implementation。`.5.0`保持docs-only completed correction；本次corrective只把其后
过宽的`.5.1` implementation gate重切，不追记任何source delivery。唯一有效执行顺序冻结为：

1. **S4.2.5 broad checkpoint（已由`.5.0`细分的historical entry）**：不再作为implementation gate；
2. **S4.2.5.0（docs-only，已完成）**：冻结conformance high-level API、single-writer protocol与promotion stop；
3. **S4.2.5.1 broad implementation checkpoint（已由`.5.1a`–`.5.1c`细分的historical entry）**：不再直接进入RED；
4. **S4.2.5.1a managed InputRouter facade corrective（已完成）**：已交付public facade到existing raw managed registrar的
   source-relative exact link；
5. **S4.2.5.1b Host physical ingress corrective（已完成）**：已交付Host-owned stable gesture callback的package-private current-generation handoff；
6. **S4.2.5.1c dormant Engine Lab Narrative conformance implementation（已完成）**：才交付production-clean conformance seam与dormant Engine Lab
   opt-in，不切换tracked live writer；
7. **S4.3 broad checkpoint（historical）**：已由`.3.0`细分，不再直接进入RED；
8. **S4.3.0 production Narrative atomic-cutover exact entry（docs-only，已完成）**：冻结replacement contract与两批执行边界；
9. **S4.3.1a composition-owned shared-kernel substrate（已完成；historical）**：已交付package-internal production binding；
10. **S4.3.1b tracked-consumer atomic cutover and promotion（已完成；historical）**：已同批迁移Engine Lab、template、Cat Cafe与Bookshop，删除legacy
    lifecycle writers/standalone public path，并完成headless/browser/prebuilt promotion；
11. **S4b broad checkpoint（historical）**：只保留方向，不再直接进入RED；
12. **S4b.0 whole-canvas exact entry（docs-only，已完成）**：冻结exact contract与三批implementation boundary；
13. **S4b.1a whole-canvas family + routed-input substrate（已完成；historical）**：保持后续独立family boundary。
14. **S4b.1b dormant production composition/Host/GameStage substrate（已完成；historical）**：保持独立merge boundary。
15. **S4b.1c atomic cutover、consumers与promotion（已完成；historical）**：保持独立merge boundary。

#### S4.2.5.1a managed InputRouter facade corrective

Composition当前把`createInputRouterV1()`产生的direct raw router交给managed Surface runtime，却向slot暴露一个terminal-fenced、identity-distinct
public `InputRouterV1` facade；`registerManagedInputHandlerV1()`只认证direct raw router identity。`.5.1a`新增唯一source-relative helper：

```ts
export function bindManagedInputRouterFacadeInternalV1(
  input: Readonly<{
    readonly facade: InputRouterV1;
    readonly target: InputRouterV1;
    readonly isIngressOpen: () => boolean;
  }>,
): () => void;
```

该inline input不新增named/exported input type；它必须是frozen、plain、exact own-data
`{ facade, target, isIngressOpen }`。`target`必须是exact `createInputRouterV1()` direct raw identity，不能是facade、foreign duck、已绑定facade或
facade chain；`facade`必须与target distinct，且是frozen、exact own-data three-method
`{ register, route, clearTransientInput }` public shape；`isIngressOpen`必须是captured exact non-thenable callable。Malformed/accessor/revoked或trapping proxy、native
router作为facade、facade chain/cycle、foreign target、active facade换target或gate均同步抛
`TypeError("ui.managed_input_router_facade_invalid")`，并保持registrar、handler与callback delta为零。Same exact active tuple重复bind必须返回
已保留的**同一个cleanup function identity**，不创建第二record或第二registrar。

Active facade registrar closure固定为下列顺序：先读取weak current record；已由outer lookup捕获、但执行前变成released或weak terminal tombstone的
closure返回shared frozen noop，且不得读取registration；active record才调用captured `isIngressOpen`。Gate exact `false`同样返回shared noop且
registration unread；gate throw或返回non-boolean同步抛
`ui.managed_input_router_facade_invalid`。Gate exact `true`后必须重新验证same current token，再调用captured raw managed registrar。Raw registrar读取
registration getter时若reentry释放facade，outer call在raw registrar返回后再次revalidate，立即调用刚取得的unregister回滚已安装handler，并返回shared
noop；旧record、old unregister或late callback不能命中successor。

Cleanup function是token-checked、exact identity、idempotent `void`：先永久fence record，再scrub target/raw registrar/gate strong refs，最后只给该facade留下
weak terminal sentinel；terminal facade禁止ABA rebind。Cleanup后`registerManagedInputHandlerV1(facade, ...)`恢复existing
`TypeError("ui.managed_input_router_required")`。Composition只在public facade freeze之后、composition publication之前exact-once bind；ordinary dispose与
hosted terminal都先关闭existing ingress predicate，再release facade link，最后才执行existing managed runtime physical cleanup。该link不改变facade
identity或public method behavior，不创建第二router，不把raw target/registrar变成object member或public capability。

`.5.1a` exact file scope只有：

1. `engine/packages/ui/src/input/input-router.ts`；
2. `engine/packages/ui/src/input/input-router.test.ts`；
3. `engine/packages/ui/src/composer/create-game-ui-composition.ts`；
4. `engine/packages/ui/src/composer/create-game-ui-composition.test.ts`；
5. `engine/packages/ui/src/public-api.test.ts`。

Mutation-sensitive RED必须覆盖direct target authenticity、facade exact shape、same-tuple cleanup identity、conflict/chain/native/malformed rejection、managed-before-
ordinary precedence、gate false registration unread、gate throw/nonboolean、gate/revalidation release reentry rollback、ordinary/terminal disposal、late managed
registration existing error、old cleanup/successor ABA与10,000 create/dispose bounded O(1)。UI root与`@sillymaker/ui/internal`只新增
`bindManagedInputRouterFacadeInternalV1` helper spelling的type/runtime exact negative；public `InputRouterV1`仍只有three methods，禁止新增named input type、
target、registrar、cleanup或gate member。

**2026-08-11 S4.2.5.1a managed InputRouter facade corrective delivery（commit `0f41e41`，已完成）：** 本delivery
精确只修改`engine/packages/ui/src/input/input-router.ts`及同名`.test.ts`、
`engine/packages/ui/src/composer/create-game-ui-composition.ts`及同名`.test.ts`与
`engine/packages/ui/src/public-api.test.ts`五文件；没有修改Host、Narrative family/session、public/package barrel、Base/Web/CSS、GameStage、
Story writer、legacy player或live application wiring。

`createInputRouterV1()`现把exact direct raw router及其managed registrar只登记在package-private `WeakMap` provenance中；facade、foreign duck、
native router facade与facade chain均不能冒充target。`bindManagedInputRouterFacadeInternalV1()`先descriptor-capture frozen plain exact three-key
inline input与frozen exact three-method facade，再用contained `Reflect.get("then")`及cycle-safe own/prototype descriptor walk拒绝inherited/synthesized
thenable、throwing/revoked/trapping callable Proxy。Malformed/accessor、active facade换target或gate均保持zero registrar/handler/callback delta；same exact
active tuple重复bind只返回同一个frozen cleanup identity，不创建第二router、record或registrar。

Facade managed registrar先验证weak current record，再执行captured ingress gate；gate false返回shared frozen noop且不读取registration，gate throw或
non-boolean统一为exact invalid。Gate释放自身generation后revalidation返回noop；raw registration getter reentry触发release时，outer registrar在raw
install后重新验证并立即调用fresh unregister回滚，因此managed-before-ordinary precedence不引入late handler、old cleanup或successor ABA。Ordinary
dispose与hosted terminal均先关闭existing ingress predicate、release facade link，再执行既有managed runtime physical cleanup；late managed registration
恢复existing `ui.managed_input_router_required`。

Cleanup按token exact-once先fence active record，再scrub facade/target/raw registrar/gate strong refs并删除public registrar，最后只留下shared weak terminal
sentinel；terminal facade永久禁止rebind。Mutation-sensitive churn以10,000个fresh target/facade generation逐个执行bind、same-tuple identity、register、route、
unregister与idempotent cleanup，保持one dispatch path与bounded O(1) retained state。

`public-api.test.ts`只为`bindManagedInputRouterFacadeInternalV1` spelling新增UI root与`./internal` compile-time negative及type/runtime forbidden
inventory；public `InputRouterV1`继续只有`{ register, route, clearTransientInput }`，raw target、registrar、gate、cleanup与named input type均未泄漏。
验证通过focused `3 files / 80 tests`、UI `83 files / 1458 tests`、canonical `257 files / 4388 tests`与完整`deno task check`；format、lint、
styles、typecheck、determinism、tests、assets、stories及e2e build全部green。本批未重跑browser、examples或prebuilt；Engine browser `101 / 101`、
examples `45 passed / 2 skipped`与prebuilt Player `38 / 38`只作为prior evidence，不冒充本delivery的HEAD验证。

**2026-08-11 S4.2.5.1a callable prototype bound corrective delivery addendum（commit `ceabebf`，已完成）：** 本addendum
精确只记录`engine/packages/ui/src/input/input-router.ts`与`engine/packages/ui/src/input/input-router.test.ts`两文件的窄纠正；其他source、test、runtime、
public API与live wiring均未改变。原cycle detection在callable Proxy每次向prototype walk提供fresh、non-cyclic的trapping Proxy节点时
不能单独证明termination；本纠正在保持contained actual `Get("then")`、descriptor trap containment、inherited/synthesized thenable rejection与
exact invalid TypeError不变的同时，把callable own/prototype descriptor walk限定为最多检查 **64 nodes**，超出预算即fail closed。

Mutation-sensitive focused input-router证据先以未修正实现得到RED **53 / 54**，再以commit `ceabebf`得到GREEN **54 / 54**；
相邻input-router/composer/public API focused matrix为 **81 / 81**，全仓typecheck与exact two-file oxlint、fmt、diff check均green。本窄addendum
没有重跑UI package、canonical `deno task check`、full、browser、examples或prebuilt；commit `0f41e41`与其他旧批次的任何结果都不复用为commit
`ceabebf`的HEAD证据。`.5.1a`保持completed/historical；唯一live current/next、core slice与direct RED/implementation gate现推进为
**PF5/M3 Save migration product surface（当前）**；唯一有效顺序为 **S4.3 broad checkpoint（historical） → S4.3.0（docs-only，已完成） → S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）**。

#### S4.2.5.1b Host physical ingress corrective

Live Host把caller predicate保存进ref，再创建自己的stable `isGestureCurrent` callback；Host runtime与candidate action binding持有的是该stable callback
identity，外部closure无法重建或通过admission adoption的exact-identity check。`.5.1b`保持现有
`NarrativeSurfaceHostPropsInternalV1` exact own-data四键
`{ session, portalContainer, inputRouter, isGestureCurrent }`及component-instance `hostIdentity` minting完全不变，只新增下列三个source-relative API：

```ts
export interface NarrativeSurfaceHostPhysicalIngressContextInternalV1 {
  readonly inputRouter: InputRouterV1;
  readonly isGestureCurrent: (
    gestureId: ManagedSurfaceGestureIdV1,
  ) => boolean;
  readonly isCurrentInternalV1: () => boolean;
}

export interface RegisterNarrativeSurfaceHostPhysicalIngressInputInternalV1 {
  readonly session: NarrativeStableSessionInternalV1;
  readonly portalContainer: HTMLDivElement;
  readonly inputRouter: InputRouterV1;
  readonly attachInternalV1: (
    context: NarrativeSurfaceHostPhysicalIngressContextInternalV1,
  ) => () => void;
}

export function registerNarrativeSurfaceHostPhysicalIngressInternalV1(
  input: RegisterNarrativeSurfaceHostPhysicalIngressInputInternalV1,
): () => void;
```

Registration input与delivered context均为frozen plain exact-own-data record。Package-private registry以exact
`(session, portalContainer, inputRouter)`为key且只允许one current registration；它不交付或改变Host identity、runtime、attachment、admission、controller、
envelope或attempt。Malformed/conflicting registration同步抛
`TypeError("ui.narrative_surface_host_physical_ingress_invalid")`且零Host/runtime delta；returned outer cleanup token-checked、idempotent，先fence current
registration并使其context立即stale，再exact-once contained调用current detach，且old cleanup不能删除successor。

Host layout effect先按existing path创建runtime；只有runtime成功后才对exact registry tuple建立fresh mount generation，并把frozen exact context交给
`attachInternalV1`。Context `inputRouter`与Host runtime input exact相同，`isGestureCurrent`必须与Host提交给runtime的stable callback pointer exact相同，
`isCurrentInternalV1()`只有在registration仍current、该mount generation仍active且Host runtime仍current时返回true。Attach throw、thenable或返回
non-callable cleanup时，Host先logical-fence generation，再release刚创建的attachment并保持zero mounted publication。

Effect cleanup顺序固定为：**generation logical fence → returned detach exact once with throw/reentry containment → attachment release in `finally`**。Same
component instance的React StrictMode setup-cleanup-setup保留existing per-instance Host identity并取得fresh generation；old context永久false。该seam不承诺
outer component full unmount后的logical reattach：distinct new Host仍mint fresh identity，在existing one-microtask release grace内必须以
`ui.narrative_stable_host_lease_conflict` fail closed；grace没有same-instance successor时继续走existing real-detach terminal，不能把它命名为same-host
reattach。

`.5.1b` exact file scope只有：

1. `engine/packages/ui/src/narrative/narrative-surface-host.tsx`；
2. `engine/packages/ui/src/narrative/narrative-surface-host.test.tsx`；
3. `engine/packages/ui/src/public-api.test.ts`。

Mutation-sensitive RED必须覆盖exact tuple validation/conflict、callback pointer identity、context exact keys/currentness、ordinary unregistered Host zero behavior
delta、attach throw/invalid cleanup rollback、cleanup order/throw/reentry containment、same-instance StrictMode fresh generation、distinct Host grace conflict、real
detach terminal、outer release/current detach、old cleanup/successor fence与10,000 registry/mount churn bounded O(1)。UI root与
`@sillymaker/ui/internal`必须exact-negative
`NarrativeSurfaceHostPhysicalIngressContextInternalV1`、`RegisterNarrativeSurfaceHostPhysicalIngressInputInternalV1`及
`registerNarrativeSurfaceHostPhysicalIngressInternalV1`；现有Host props仍exact四键，public/conformance Host props仍不得出现
`attachInternalV1`、`isCurrentInternalV1`或raw authority member。

**2026-08-11 S4.2.5.1b Host physical ingress corrective delivery（commit `0566e41`，已完成）：** 本delivery
精确只修改`engine/packages/ui/src/narrative/narrative-surface-host.tsx`、同名`.test.tsx`与
`engine/packages/ui/src/public-api.test.ts`三文件；没有修改Host props、Narrative family/session、InputRouter/composer、public/package barrel、
Base/Web/CSS、GameStage、Story writer、legacy player或live application wiring。

Package-private registry现以exact `(session, portalContainer, inputRouter)`建立nested weak tuple，并用per-portal
`activeRegistrationCount`与per-session `activePortalCount`在最后一个registration/portal释放时逐层删除空registry；token-checked outer cleanup先永久
fence current registration，再删除tuple、scrub session/portal/router/attach strong refs并exact-once contained调用current detach，old cleanup不能删除
successor。Registration input、session与router均按frozen plain exact-own-data descriptor contract capture，callable另经contained non-thenable
validation；portal `instanceof`也经contained helper执行，
throwing/revoked hostile Proxy统一归一为`ui.narrative_surface_host_physical_ingress_invalid`且保持Host/runtime delta为零。

Host layout effect继续先创建existing runtime，成功后才claim fresh physical-ingress mount generation；delivered frozen exact context持有与runtime
完全相同的`inputRouter`及Host-owned stable `isGestureCurrent` callback pointer。`isCurrentInternalV1()`同时验证registration、mount generation与runtime
currentness。Attach throw、thenable、non-callable cleanup或attach期间outer release均先logical-fence generation，再contained detach并release刚创建的
attachment，保持zero mounted publication；ordinary unregistered Host路径保持zero behavior delta。

Outer cleanup立即使context stale并只detach current generation，不提前释放仍mounted runtime；Host effect cleanup固定为generation fence → detach
exact once with throw/reentry containment → attachment release in `finally`。Same-component React StrictMode setup-cleanup-setup保留per-instance Host
identity并取得fresh generation，old context永久false；distinct Host在one-microtask grace内继续以existing lease conflict fail closed，无same-instance
successor则走real-detach terminal。10,000 fresh registry与Host mount generation churn覆盖tuple collapse、successor fencing与bounded O(1) retained state。

`public-api.test.ts`只为`NarrativeSurfaceHostPhysicalIngressContextInternalV1`、
`RegisterNarrativeSurfaceHostPhysicalIngressInputInternalV1`及
`registerNarrativeSurfaceHostPhysicalIngressInternalV1`新增UI root与`./internal` compile-time negative及type/runtime forbidden inventory；existing Host
props仍只有`{ session, portalContainer, inputRouter, isGestureCurrent }`，attach/current/raw authority没有泄漏。验证通过focused
`2 files / 58 tests`、UI `83 files / 1476 tests`、canonical `257 files / 4406 tests`与完整`deno task check`；format、lint、styles、typecheck、
determinism、tests、assets、stories及e2e build全部green。本批未重跑browser、examples或prebuilt；Engine browser `101 / 101`、examples
`45 passed / 2 skipped`与prebuilt Player `38 / 38`只作为prior evidence，不冒充本delivery的HEAD验证。

#### S4.2.5.1c exact production-clean conformance seam

UI新增唯一dedicated production-clean package entry **`@sillymaker/ui/conformance`**，manifest exact指向
`./src/conformance/index.tsx`。该entry只服务neutral Engine Lab dormant conformance，不是Story authoring API；application import closure可以静态消费
`/conformance/` production source。不得命名为或落入`/testkit/`、`/testing/`：Story BuildIdentity的production-path gate会拒绝这两类path，不能以
dynamic import、scanner exception或deep import绕过。该entry唯一runtime export exact为：

```ts
export function createNarrativeConformanceRigV1(
  input: CreateNarrativeConformanceRigInputV1,
): NarrativeConformanceRigCreationResultV1;
```

`CreateNarrativeConformanceRigInputV1`的exact own-data key set只有下列八项；全部必须由factory在任何subscription、claim、bridge、session、
Host identity或timer allocation前descriptor-capture，accessor、missing/extra key、borrowed receiver、non-callable或thenable同步返回一条closed creation
failure，不得部分安装：

```ts
export interface NarrativeConformanceSnapshotV1 {
  readonly revision: NonNegativeSafeInteger;
  readonly pending: DeepReadonly<PendingInteractionV1> | null;
  readonly history: DeepReadonly<NarrativeHistoryV1>;
}

export interface NarrativeConformanceResolutionRequestV1 {
  readonly expectedOccurrenceId: string;
  readonly resolution: DeepReadonly<InteractionResolutionV1>;
}

export interface CreateNarrativeConformanceRigInputV1 {
  readonly observeNarrative: () => NarrativeConformanceSnapshotV1;
  readonly subscribeNarrative: (listener: () => void) => () => void;
  readonly dispatchResolution: (
    request: NarrativeConformanceResolutionRequestV1,
  ) => Promise<unknown>;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly presentationClock: PresentationClockV1;
  readonly textResolver: (textId: string) => string;
  readonly voiceReplay: (() => boolean) | null;
  readonly reportFailure: (error: unknown) => void;
}
```

`NarrativeConformanceSnapshotV1` own keys exact为`revision`、`pending`、`history`；
`NarrativeConformanceResolutionRequestV1` own keys exact为`expectedOccurrenceId`、`resolution`。`observeNarrative`每个exact revision返回cached
frozen snapshot identity；`subscribeNarrative`只允许one current synchronous source subscription并返回one idempotent unsubscribe。
`dispatchResolution`的Promise必须在semantic dispatch触发的同步source notification与对应bridge reconcile完成后才settle；raw throw规范化为rejected
Promise，late settlement仍受source/frame/terminal fence。`playerProfile`、`presentationClock`与`textResolver`只经既有safe capture/materialization；
`voiceReplay`是exact callable或`null`；`reportFailure`只接收当前runtime fault，不得成为第二lifecycle writer或保留raw error history。

Creation result是下列closed frozen union；created branch own keys exact为`kind`、`rig`，全部failure branch own keys exact为`kind`、`code`，不携带
raw error、authority、receipt或delta：

```ts
export type NarrativeConformanceRigCreationResultV1 =
  | Readonly<{
    readonly kind: "created";
    readonly rig: NarrativeConformanceRigV1;
  }>
  | Readonly<{
    readonly kind: "rejected";
    readonly code: "narrative.conformance_input_invalid";
  }>
  | Readonly<{
    readonly kind: "rejected";
    readonly code: "narrative.conformance_source_claimed";
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly code: "narrative.conformance_creation_faulted";
  }>;

export interface NarrativeConformanceHostPropsV1 {
  readonly inputRouter: InputRouterV1;
}

export interface NarrativeConformanceRigV1 {
  readonly Host: ComponentType<NarrativeConformanceHostPropsV1>;
  dispose(): void;
}
```

Creation precedence固定为：**descriptor/input validation → exact source-pair claim → initial observe/setup → created**。Descriptor/input validation不调用
`observeNarrative`、`subscribeNarrative`、`dispatchResolution`或任一raw profile/clock/text/voice/failure callable；任一shape/descriptor/callable/thenable
invalid直接返回`narrative.conformance_input_invalid`且source claim/subscription/runtime/timer delta全零。Validation通过后才对exact
`(observeNarrative, subscribeNarrative)` pair执行one atomic claim；duplicate返回`narrative.conformance_source_claimed`，并保持observe/subscribe
call count与全部runtime delta为零。只有fresh claim成功后才允许initial observe、snapshot validation、bridge/session/Host source setup与subscription；该阶段任一
throw、invalid snapshot/result、synchronous callback/reentry或partial setup fault都返回`narrative.conformance_creation_faulted`，且必须terminal-fence并完整
rollback已建subscription/tick/Host/runtime、释放fresh source claim，不保留raw error或partial rig。只有initial reconcile/setup全部成功才返回`created`；failure
rollback后的fresh retry可以claim，但predecessor late callback不能命中retry。

Rig exact own keys只有`Host`、`dispose`；`Host` props exact own-data key只有`inputRouter`。`Host`必须消费existing
`DefaultGameRoot` Narrative slot提供的exact public facade，不得创建、返回、包装或claim第二个router。React Host固定采用两阶段安装：第一阶段建立explicit
portal并对exact `(session, portalContainer, inputRouter)`完成`.5.1b` pre-registration；只有registration成功并成为current后，第二阶段才mount inner
`NarrativeSurfaceHostInternalV1`。这只保证same component instance的StrictMode effect probe，不宣称outer Host full unmount reattach。

Rig内建neutral `say | choice | pause | custom | presentation_barrier` renderer、fixed frozen visual
config、`null` quick-menu contribution；History availability exact派生为`history.entries.length > 0`。Renderer的button、pointer、keyboard与gamepad操作必须
经rig-private authenticated physical admission、exact envelope/attempt及existing managed route进入同一router；禁止裸调用
`inputRouter.route(action)`、直接semantic dispatch或把attempt/envelope/route authority放进renderer props。Renderer/button只调用rig-private narrow action
dispatcher；dispatcher验证`.5.1b` context current后，才lazy创建Host-adopted admission、mint exact attempt/envelope并调用existing authenticated managed route。
Existing keyboard/gamepad/pointer device adapter把raw physical action送进public facade仍然允许；rig-private ordinary Narrative handler只把该raw ingress兑换为
nested authenticated route，不把raw route本身冒充semantic dispatch。Pre-ready admission unavailable只作ignored/fail-closed，不能preclaim或绕过Host binding。
同一captured
`(observeNarrative, subscribeNarrative)` source pair最多one current rig claim；duplicate active rig返回
`narrative.conformance_source_claimed`且零subscription/Host/runtime/timer mutation。`dispose()`为idempotent terminal `void`：先永久fence source/frame/
Host ingress，再取消source subscription、tick与Host attachment并释放exact source claim；disposed Host render、late callback、late Promise settlement与
unsubscribe reentry全部inert，不可ABA命中successor rig。

Factory/rig/Host、上述conformance types，以及任何raw stable family/session/bridge/controller/lease/source revision/attempt/readiness spelling均不得从UI root或
`@sillymaker/ui/internal`导出。`@sillymaker/ui/conformance` runtime inventory除single factory外保持empty；type exports只表达上述high-level
input/result/Host contract，不开放renderer replacement、raw topology、Coordinator或generic authoring入口。

#### Mutually-exclusive Engine Lab opt-in and single writer

Engine Lab application使用static production-clean `@sillymaker/ui/conformance` import，并只以exact value flag
`new URLSearchParams(globalThis.location?.search ?? "").get("narrative_conformance") === "1"`在`labGameApplicationV1.ui`的React mount前作
**互斥二选一**。Query只读取一次；只有exact value `1` branch在返回UI declaration前exact-once创建并订阅rig，再把created rig交给
`createLabUiSlotsV1`，不得在React render/effect/StrictMode probe中重复factory或subscription；absent、empty、duplicate解析后的非`1`或任何其他value
都进入legacy branch且不创建rig。不得另加truthy/presence/boolean alias。Application UI `dispose`把rig terminal fence/dispose与既有overlay
conformance dispose组合为independent exact-once cleanup，一个cleanup throw/reentry不得
阻止另一个：

- flag结果不是exact `true`时只mount existing `LabNarrativePlayerV1`；不得调用conformance factory或安装其source claim/subscription；
- exact value `1`且creation result为`created`时只mount该exact conformance rig `Host`，并把slot existing `context.input`作为唯一`inputRouter`传入；不得
  construct legacy `TextRevealV1`/`PlaybackControllerV1`、register legacy ordinary Narrative input，
  或保留legacy local History/hidden/topology writer；
- exact value `1`但creation result不是`created`时fail closed为一个read-only conformance diagnostic，不mount legacy fallback、Host或第二writer；
- `GameAudioV1`与`LabBarrierRecoveryV1`可以保留，因为它们不是Narrative lifecycle/player writer；同一semantic source、InputRouter与portal lifetime内
  禁止legacy/new rig并挂以作对照；
- branch-before-mount与duplicate-source claim共同证明one writer。Legacy path没有conformance claim，因此不能用claim result替代exact branch test；
- default `labGameApplicationV1`行为、tracked live writer与其他Stories保持不变。本opt-in是dormant Engine Lab characterization，不是S4.3 live
  promotion；只有S4.3可迁移default/tracked consumers并删除legacy owner/export。

Story-private `e2e/src/application/narrative-conformance.tsx`只把real `LabApplicationInstanceV1.semantic`投影为上述八项high-level input，使用actual
authoritative `pending`/`history`与existing `{ kind: "resolve", expectedOccurrenceId, resolution }` dispatch，并提供只读creation failure
diagnostic；它不拥有router。不得deep import UI `src/**`、复制stable runtime、创建第二semantic/history/profile authority或以fixture state代替real
Engine Lab instance。

#### S4.2.5.1c RED, bounds, file scope, and stops

`.5.1c` RED必须先在下列original exact seven-file scope成立，implementation不得越界：

1. `engine/packages/ui/package.json`；
2. `engine/packages/ui/src/conformance/index.tsx`；
3. `engine/packages/ui/src/conformance/index.test.tsx`；
4. `engine/packages/ui/src/public-api.test.ts`；
5. `e2e/src/application/narrative-conformance.tsx`；
6. `e2e/src/application/composition.tsx`；
7. `e2e/src/test/narrative-conformance.test.tsx`。

Existing generic Engine Lab import-boundary test自动覆盖package-export-only消费，不为freeze file inventory而修改。Base、Web、template、examples、CSS、
GameStage、composer、Narrative family/session/Host、public/live docs与legacy player source保持zero diff；`.5.1a`与`.5.1b`的direct tests已经分别锁定
facade precedence/terminal与exact ingress identity/lifecycle，`.5.1c` conformance UI/E2E tests只mutation-kill完整rig路径。RED matrix至少覆盖：

1. `@sillymaker/ui/conformance` single runtime factory positive inventory，以及UI root/`./internal`对factory、types、rig member与全部raw stable
   spelling的type/runtime exact negatives；
2. eight-key input、snapshot/request/result/rig/Host exact own-key与frozen descriptor，missing/extra/accessor/proxy/foreign/borrowed/throw/thenable及
   creation precedence：input validation的source callable call count为zero，duplicate claim的observe/subscribe call count为zero，fresh claim后的
   observe/setup fault完整rollback/unclaim且fresh retry可创建；所有non-created result保持zero retained subscription、claim、Host、runtime、notification与timer
   delta；
3. real Engine Lab instance依次覆盖`null`及`say | choice | pause | custom | presentation_barrier`五种pending，manual/automatic resolution、
   empty、same occurrence/equal revision、fresh occurrence/source replacement、retry与stale late completion；
4. manual clock下reveal、Auto、Skip、Pause expiry、seen/profile/text churn、voice replay，History authoritative entries、availability、open/close、
   parent suspend/resume、focus/opener、pointer/keyboard/gamepad input与higher blocker remaining；button与physical action同时证明private authenticated
   admission/envelope/attempt被消费；rig renderer/control直接裸调用`inputRouter.route(action)`必须为zero，existing device-adapter raw ingress与
   managed binding内部route保持允许并须最终消费authenticated continuation；两阶段pre-registration必须先于inner Host effect，context callback identity/currentness
   来自`.5.1b` exact seam；
5. pre-ready renderer/source/profile/text/clock fault、accepted-ready fault handoff、`reportFailure` throw/reentry、same-component StrictMode effect probe、
   distinct Host grace conflict、real detach、dispose/terminal、post-dispose Host与late subscription/Promise/tick callback；
6. `labGameApplicationV1.ui` React mount前absent/empty/non-`1` flag证明legacy-only且conformance factory/source claim为zero；exact value `1`证明
   factory/subscription exact-once、rig-only、slot existing router exact identity且legacy player/controller/reveal/input registration为zero；creation failure不fallback，UI dispose
   组合cleanup仍双方exact-once；
7. 10,000 publication/replacement/retry/Host attach-dispose/StrictMode/History/timer/fault churn证明per source最多one rig claim、one source
   subscription、one logical Host lease、one current controller/tick/cancel、render topology最多three entries，且没有strong array、tombstone、attempt/
   result/callback history；production retained state为bounded **O(1)**；
8. canonical Story build证明`/conformance/`是production-clean application closure，且closure中没有`/testkit/`、`/testing/`、test source或engine
   `src/**` deep import。

三批verification各自独立，不得用后批scope掩盖前批失败：`.5.1a`至少运行focused input-router/composer/public-api tests、UI package、canonical
`deno task check`、five-file `deno fmt --check`与scoped `git diff --check`；`.5.1b`至少运行focused Host/public-api tests、UI package、canonical
`deno task check`、three-file fmt与diff check；`.5.1c`至少运行focused UI conformance + Engine Lab tests、UI package、Engine Lab package/full canonical
`deno task check`、seven-file fmt与diff check。Canonical check中的format、lint、styles、typecheck、determinism、assets、Stories与E2E production build都必须
green。Default/browser/examples/prebuilt promotion仍归S4.3；prior result不得冒充任一batch的HEAD新证据。

任一batch出现以下条件，立即停止并回到其exact entry修订，不得用compatibility escape hatch或合并三批扩 scope：

- `.5.1a`需要公开raw target/registrar、创建第二router、改变public facade three-method behavior，或不能在five files内保持terminal sentinel、late
  `ui.managed_input_router_required`与bounded O(1)；
- `.5.1b`需要修改现有Host props/per-instance identity、把raw runtime/admission交给caller、承诺full unmount reattach，或不能在three files内保持generation-
  before-detach-before-release；
- 需要从UI root或`./internal`公开factory/rig/raw stable authority，或需要renderer/session/Host/controller/lease/source revision/readiness成为Story
  authoring API；
- 需要`/testkit/`、`/testing/`、dynamic scanner bypass或engine `src/**` deep import才能进入Engine Lab application closure；
- 需要legacy与new rig同mount、让legacy参与source claim，或不能在branch-before-mount时证明exactly one Narrative lifecycle/player writer；
- 需要Host创建/返回第二InputRouter、替换slot router，或renderer/button必须裸调用`inputRouter.route(action)`而不能通过private authenticated
  admission/envelope/attempt；
- 需要改变default tracked writer、GameStage、`.5.1a` exact facade link之外的composer行为、Web/template/examples、删除legacy source/export或完成
  browser/prebuilt promotion；这些全部归S4.3；
- 需要新增Base semantic/wire/Save/Persistence/public receipt合同，或不能用real Engine Lab authoritative source覆盖五种pending；
- 不能保持terminal-before-physical-cleanup、late callback successor fence、max-three topology或10,000 churn bounded O(1)；
- 需要引入whole-canvas primary/detail topology、owner或family；这些全部归S4b。

本`.5.0`及本次`.5.1` corrective split严格docs-only，只修改本design与两份owning plans；不交付source、test、runtime、architecture、roadmap、
features、development、website、Host/public/live capability，也不复用`.4.3` focused/UI/full/browser/examples/prebuilt evidence冒充新验证。Docs-only
verification只有三份target docs的`deno fmt --check`与scoped `git diff --check`。`.5.0`保持completed correction，原`.5.1`只作historical broad
entry；`.5.1a`、`.5.1b`与`.5.1c`现均已交付并转为completed historical checkpoint。唯一live current/next、core slice与direct RED/implementation gate为
**PF5/M3 Save migration product surface（当前）**，唯一后续顺序为
**S4.3 broad checkpoint（historical） → S4.3.0（docs-only，已完成） → S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）**。

**2026-08-11 S4.2.5.1c dormant Engine Lab Narrative conformance delivery（commit `a926b8c`，已完成）：** 本delivery严格保持original exact seven-file scope：`engine/packages/ui/package.json`、
`engine/packages/ui/src/conformance/index.tsx`、`engine/packages/ui/src/conformance/index.test.tsx`、
`engine/packages/ui/src/public-api.test.ts`、`e2e/src/application/narrative-conformance.tsx`、
`e2e/src/application/composition.tsx`与`e2e/src/test/narrative-conformance.test.tsx`；除这七文件外没有source/test/runtime改动。

Dedicated production-clean `@sillymaker/ui/conformance` entry的runtime inventory精确只有
`createNarrativeConformanceRigV1`单factory。Factory在任何source IO或runtime allocation前descriptor-capture exact eight-key input，并保持snapshot/request/result/rig/Host的closed frozen exact shape；顺序固定为input validation → exact source-pair claim → initial observe/setup → created。Duplicate claim不读source，partial setup或invalid cleanup完整terminal rollback并释放claim以允许fresh retry；dispose、source replacement、late settlement/rejection与10,000 churn证明retained production state为bounded **O(1)**。

Rig `Host` exact只接收existing `inputRouter`，先对`.5.1b` exact `(session, portalContainer, inputRouter)` ingress作pre-registration，再mount inner Narrative Host，不创建第二router。Renderer/button只通过rig-private authenticated admission/envelope/attempt进入existing managed route；Say/Auto/Skip/voice、Choice、Barrier、Pause、Custom与History open/close/focus及player timing均绑定exact source/frame/Host/terminal fence，stale callback不能命中successor，Custom使用submitted JSON payload而不把parameters冒充payload。

Engine Lab只在mount前读取一次exact `narrative_conformance=1`：created branch exact-once创建rig并只安装该writer，creation failure fail closed且不fallback legacy，default/tracked branch保持不变。Real authoritative Engine Lab证据覆盖exact-1 single writer、Auto、Skip、voice replay、Choice、automatic Barrier、Pause、Custom与real `DefaultGameRoot` gamepad rising edge；held poll不重复dispatch。UI root与`@sillymaker/ui/internal`的public negative inventory持续拒绝factory/types/rig member及raw family/session/bridge/controller/lease/source/attempt/readiness spellings，没有low-level authority leak。

HEAD verification通过focused `3 files / 42 tests`、UI package `84 files / 1511 tests`、Engine Lab `26 files / 132 tests`与canonical `259 files / 4447 tests`；canonical `deno fmt --check`覆盖`953 files`，lint、styles、typecheck、determinism、assets、five Stories与E2E production build全部green。本批未重跑browser、examples或prebuilt；Engine browser `101 / 101`、examples `45 passed / 2 skipped`与prebuilt Player `38 / 38`只是prior-only evidence，不冒充commit `a926b8c`的HEAD验证。

`.5.1c`现已完成并转为historical checkpoint。原broad S4.3也已由下述`.3.0` exact entry细分并转为historical；不得直接在原broad
checkpoint上进入RED。唯一live current/next、core slice与direct RED/implementation gate现统一推进为
**PF5/M3 Save migration product surface（当前）**，后续唯一顺序为
**S4.3.0（docs-only，已完成）→ S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）**。

### S4.3.0 production Narrative atomic-cutover exact entry（docs-only，已完成）

本entry关闭原broad S4.3尚未冻结的四个边界：production Story authoring API、同occurrence Choice availability observation、
composition-owned shared-kernel/Stage接线，以及旧writer/export/source的完整删除面。线性执行固定为：

1. **S4.3 broad checkpoint（historical）**：只保留既有behavior与atomic-removal gate，不再直接进入RED；
2. **S4.3.0 exact entry（docs-only，已完成）**：冻结本节contract、两批RED、scope、promotion evidence与stop；
3. **S4.3.1a composition-owned shared-kernel substrate（已完成；historical）**：已交付package-internal production binding，不改变四个tracked Story的default
   writer、不新增root authoring export，也不删除dormant `/conformance`；
4. **S4.3.1b tracked-consumer atomic cutover and promotion（已完成；historical）**：已在同一merge batch公开high-level authoring seam、迁移四个tracked
   Stories、删除所有旧writer/export/direct path，并完成headless/browser/examples/prebuilt promotion；
5. **S4b broad checkpoint（historical）**：只保留方向，不再直接进入RED；
6. **S4b.0 whole-canvas exact entry（docs-only，已完成）**：冻结exact contract与三批implementation boundary；
7. **S4b.1a whole-canvas family + routed-input substrate（已完成；historical）**：后续独立family boundary。
8. **S4b.1b dormant production composition/Host/GameStage substrate（已完成；historical）**：保持独立merge boundary。
9. **S4b.1c atomic cutover、consumers与promotion（已完成；historical）**：保持独立merge boundary。

#### S4.3.0 public Story contract

`DefaultGameRootSlotsV1`删除`narrative` member；不得把它收窄成另一个`ReactNode`或compatibility slot。唯一Story入口是
`WebGameUiDefinitionV1<TSemanticPublication, ...>.narrative?: NarrativeSurfaceDefinitionV1<TSemanticPublication>`，由
`application.ui()`返回。`@sillymaker/ui` root只新增下列high-level type/factory；root不得暴露Host、session、bridge、InputRouter、
Coordinator、publisher lease/source revision/target occurrence、runtime kernel、Stage proof、readiness、attempt、receipt或evidence：

```ts
export type NarrativeChoiceAvailabilityV1 = Readonly<{
  readonly choiceId: string;
  readonly status: "enabled" | "disabled";
  readonly reasonTextIds: readonly string[];
}>;

export interface NarrativeSurfaceSelectionV1 {
  readonly pending: DeepReadonly<PendingInteractionV1> | null;
  readonly history: DeepReadonly<NarrativeHistoryV1>;
  readonly choiceAvailability: readonly NarrativeChoiceAvailabilityV1[] | null;
}

export interface NarrativeSurfaceResolutionRequestV1 {
  readonly expectedOccurrenceId: string;
  readonly resolution: DeepReadonly<InteractionResolutionV1>;
}

export type NarrativeSurfacePlayerViewV1 =
  | Readonly<{
    readonly kind: "say";
    readonly phase: "preparing" | "active" | "suspended";
    readonly playbackMode: "normal" | "auto" | "skip";
    readonly resolvedSpeakerText: string | null;
    readonly resolvedText: string;
    readonly revealedCharacters: number;
    readonly revealLength: number;
    readonly revealComplete: boolean;
  }>
  | Readonly<{
    readonly kind: "passive";
    readonly phase: "preparing" | "active" | "suspended";
    readonly playbackMode: "normal";
  }>;

export interface NarrativeSurfaceDialogueRendererPropsV1 {
  readonly kind: "dialogue";
  readonly pending: DeepReadonly<PendingInteractionV1>;
  readonly choiceAvailability: readonly NarrativeChoiceAvailabilityV1[] | null;
  readonly playerProfile: DeepReadonly<PlayerProfileV1>;
  readonly playerView: DeepReadonly<NarrativeSurfacePlayerViewV1>;
  readonly resolveText: (textId: string) => string;
  readonly onActivate: () => void;
  readonly onChoose: (choiceId: string) => void;
  readonly onResume: () => void;
  readonly onSubmitCustom: (payload: DeepReadonly<StrictJsonObjectV1>) => void;
  readonly onToggleAuto: () => void;
  readonly onToggleSkip: () => void;
  readonly onOpenHistory: () => void;
  readonly onReplayVoice: () => void;
}

export interface NarrativeSurfaceHistoryRendererPropsV1 {
  readonly kind: "history";
  readonly history: DeepReadonly<NarrativeHistoryV1>;
  readonly playerProfile: DeepReadonly<PlayerProfileV1>;
  readonly resolveText: (textId: string) => string;
  readonly onCloseHistory: () => void;
}

export type NarrativeSurfaceRendererPropsV1 =
  | NarrativeSurfaceDialogueRendererPropsV1
  | NarrativeSurfaceHistoryRendererPropsV1;

export interface DefineNarrativeSurfaceInputV1<TSemanticPublication> {
  readonly selectNarrative: (
    publication: DeepReadonly<TSemanticPublication>,
  ) => NarrativeSurfaceSelectionV1;
  readonly dispatchResolution: (
    request: NarrativeSurfaceResolutionRequestV1,
  ) => Promise<unknown>;
  readonly renderer: ComponentType<NarrativeSurfaceRendererPropsV1>;
  readonly resolveText: (locale: string | null, textId: string) => string;
  readonly replayCurrentVoice: (() => boolean) | null;
}

declare const narrativeSurfaceDefinitionBrandV1: unique symbol;
export interface NarrativeSurfaceDefinitionV1<TSemanticPublication> {
  readonly [narrativeSurfaceDefinitionBrandV1]: TSemanticPublication;
}

export function defineNarrativeSurfaceV1<TSemanticPublication>(
  input: DefineNarrativeSurfaceInputV1<TSemanticPublication>,
): NarrativeSurfaceDefinitionV1<TSemanticPublication>;
```

`DefineNarrativeSurfaceInputV1` own-key set exact为
`selectNarrative | dispatchResolution | renderer | resolveText | replayCurrentVoice`。Definition不接收labels、panel style、
`visualConfig`、quick-menu、profile store、clock、portal或input router；Story把labels/skin闭包在renderer中。Factory在调用任何Story
callable或分配runtime前descriptor-capture exact frozen plain own-data input；malformed/accessor/inherited/revoked/trapping Proxy、thenable
callable、extra/missing key统一同步抛exact TypeError，并保持zero subscription/claim/runtime allocation。Minted definition是frozen
zero-own-key opaque identity，binding只存在package-private WeakMap；private brand const不得成为runtime/type inventory export。

Selection必须是frozen plain exact own-data record，own-key set exact为`pending | history | choiceAvailability`。
`choiceAvailability`在pending非Choice时必须为`null`；Choice时必须是frozen dense array、与`pending.options`同长度/同顺序/
同exact `choiceId` set。每行都必须是frozen plain exact own-data `{ choiceId, status, reasonTextIds }`；`reasonTextIds`是frozen
dense string array。`enabled`行的`reasonTextIds`必须为空，`disabled`行必须至少包含一个text ID。它是同一semantic
publication subscription派生的occurrence-fenced只读observation：同occurrence business
availability变化只更新renderer snapshot，不推进Narrative source revision、不替换Surface target/runtime，也不能成为可写authority；`onChoose`
issue前必须读取latest exact observation拒绝disabled，Base queue-front仍作最终availability校验。四个tracked Stories统一采用
`history.entries.length > 0`作为V1 History availability；若任一Story需要不同lifecycle/history rule，命中stop并回本entry修订。

Composition从current safe `PlayerProfileV1.preferences.locale`调用二参Story resolver，给renderer/family只暴露bound one-argument
`resolveText(textId)`。Profile identity churn可刷新controls/Choice/History labels；已active Say的resolved speaker/text与timing保持frame-captured，
不因locale变化重启或重新解析，下一occurrence使用新locale。Renderer只拿immutable pending/history/current safe profile/player view与frame-bound
void callbacks；所有callback在source/frame/Host/application successor变化后永久no-op，不返回receipt/result/evidence，也不暴露generic controller。
不适用于current pending kind的callback必须由production adapter fail closed。`onCloseHistory`走authenticated routed toggle，不是raw History
controller facade。Raw `dispatchResolution` Promise只有在semantic notification已同步drain进Narrative reconcile后才可对engine action completion settle；
early settle、foreign occurrence、rejection/throw与late predecessor settlement均按exact source/frame/Host fence处理。
Production adapter传入Story dispatcher的request必须是frozen plain exact own-data
`{ expectedOccurrenceId, resolution }`，resolution沿用Base `InteractionResolutionV1` exact validation；Story callable不得收到Surface/gesture/
Stage evidence或可变参考。

Composer独占player profile store、presentation clock/reduced motion、failure reporting、semantic selection subscription、publisher lease/revision/
occurrence、bridge/session/controller、bound callbacks、Host/portal/input/focus/readiness、Stage controller、successor与dispose。Production
`DefaultGameRootV1`只挂composition-owned Host，不接Story lifecycle component。`SemanticStageV1`的actual reconciler通过package-internal React
context/registry绑定same composition/same Narrative bridge；composition-scoped stable Stage claimant identity跨bridge/kernel successors复用，避免同一
mounted reconciler被fresh per-bridge claimant重claim。`.3.1b`删除public `SemanticStagePropsV1.onAcknowledgment`与root/barrel
`StageTransitionAcknowledgmentV1` export，并删除public `CreateStageReconcilerOptionsV1.onAcknowledgment`；Stage acknowledgment
delivery改由claimed authority/package-private driver独占，内部proof/type仍可保持source-relative，Story不得通过named type或
contextually typed callback取得raw acknowledgment proof。

Claim后不得继续调用`StageReconcilerV1`的public lifecycle methods：现有reconciler在exact claimant存在时会对
`retarget/suspend/resume/skipAll/dispose`全部no-op。`.3.1a`必须建立唯一package-private
`SemanticStageCompositionDriverInternalV1`；frozen exact own-data method set为
`retargetInternalV1 | suspendInternalV1 | resumeInternalV1 | skipAllInternalV1 | disposeInternalV1 | isCurrentInternalV1`。
`narrative-surface-composition.tsx`用composition-scoped stable claimant对exact mounted reconciler claim一次，将同一authority以
token-fenced driver交给`SemanticStageV1`；claimed path的ordinary retarget、visibility suspend/resume、skip与true terminal dispose
只能通过driver调用authority internal methods，unbound legacy Stage在`.3.1a`期间仍走既有public path。Driver/context/helper均只允许
source-relative使用，UI root与`./internal`必须negative。Narrative bridge/controller successor不得dispose persistent Stage
authority；`DefaultGameRootV1`不得再因application epoch key物理remount actual Stage reconciler，而应以同一mounted identity接收
fresh `target/revision/epoch`并走claimed driver retarget。只有true Stage/composition unmount可令current driver terminal dispose；predecessor
driver、effect cleanup与late visibility callback均不得命中successor。

#### S4.3.1a composition-owned shared-kernel substrate（已完成；historical）

Actual Stage reconciler在successor前后保持同一mounted identity；new bridge只复用composition claimant/driver，不重claim、不调用
public no-op lifecycle，不因epoch wrapper key重建clock/timeline/reconciler。

`.3.1a`只把production composition authority变为一个stable composite kernel：Overlay、System与Narrative共享同一application epoch、
Coordinator facade、InputRouter、gesture lease、successor gate与terminal cascade。它复用现有stable publisher registry/admission/kernel、Narrative
bridge/session/Host/controller、Coordinator facade和arbitrary-family activation tuple，不复制conformance rig，也不创建第二semantic subscription或
independent kernel。Narrative selector从composition现有presentation publication fanout读取，使presentation与Narrative共用one upstream
semantic subscription。

Exact successor顺序固定为：全部family detach → 一次runtime/kernel replace → Overlay/System/Narrative全部prepare → 全部arm → one shared gate
open → 依次flush no-throw family notifications → publish application anchor。任一prepare/arm/Stage bind失败都terminal rollback完整composition，不能
保留partial successor。Composition-scoped Stage claimant、logical Host identity及source subscription跨successor只保留one current scalar；old bridge/
controller/Stage generation先logical fence，再physical cleanup，late completion不能命中新generation。

`.3.1a` exact source/test scope为十三文件：

1. `engine/packages/ui/src/managed-surfaces/managed-surface-composition-runtime.ts`
2. `engine/packages/ui/src/managed-surfaces/managed-surface-composition-runtime.test.ts`
3. `engine/packages/ui/src/composer/create-game-ui-composition.ts`
4. `engine/packages/ui/src/composer/create-game-ui-composition.test.ts`
5. `engine/packages/ui/src/composer/default-game-root.tsx`
6. `engine/packages/ui/src/composer/default-game-root.test.tsx`
7. `engine/packages/ui/src/narrative/narrative-surface-composition.tsx`（new）
8. `engine/packages/ui/src/narrative/narrative-surface-composition.test.tsx`（new）
9. `engine/packages/ui/src/narrative/narrative-managed-surface-family.ts`
10. `engine/packages/ui/src/narrative/narrative-managed-surface-family.test.ts`
11. `engine/packages/ui/src/stage/semantic-stage.tsx`
12. `engine/packages/ui/src/stage/semantic-stage.test.tsx`
13. `engine/packages/ui/src/public-api.test.ts`

Composition runtime必须让successor managed-input subscriber在prepare期间仍受shared activation gate关闭：Narrative prepare/reconcile即使推进
stable composite transient state，也不能在Overlay/System/Narrative全部arm前bind current input；gate打开后先完成current input sync，再flush
family notifications。若该顺序需要修改generic reducer/Coordinator contract、Base或Web/Story source，立即停止回`.3.0`修订，不静默扩scope。
`.3.1a`不得新增root authoring exports、不得改变四个tracked Story default writer、不得删除`/conformance`或legacy export，也不得让两套kernel
同时处理同一source。

`.3.1a` mutation-sensitive RED至少覆盖：

1. malformed internal definition/preflight在semantic subscribe/runtime allocation前失败；throw/reentry保持zero claim/subscription/runtime；
2. one recipe exact包含Overlay/System/Narrative owners/slots，三者共享application epoch/kernel/Coordinator/InputRouter/gesture lease；exact one
   Narrative publisher lease/bridge/session；
3. initial null为registered-unpublished；new/empty/reopen/fresh occurrence、same canonical pending与drift fault保持既有stable contract；History、
   choice availability、profile/text churn只更新observation；
4. successor exact三adapter trace与任何step throw/reentry rollback；prepare-time stable reconcile在gate open前zero managed-input bind，gate open后
   current input sync先于family notification；old source/frame/gesture/Stage/controller proof全部stale；
5. production portal/Host的pointer/keyboard/gamepad与bound callbacks共用Surface+semantic dual fence；
6. actual Stage reconciler被composition-scoped same claimant claim一次；normal acknowledgment、load recovery、replay unsupported、foreign/stale proof
   与instant outcome沿用已验收Barrier rows；successor不以fresh claimant重claimpersistent Stage；
7. StrictMode setup-cleanup-setup、same-instance rerender、true detach、fault delivery、max-three topology，以及10,000 source/candidate/controller/
   availability/successor churn为bounded O(1)。

8. Claimed Stage driver对ordinary retarget、visibility suspend/resume、skip与true terminal dispose各精确调用authority internal
   method一次，public no-op methods调用量为零；successor不以fresh claimant重claim、不因epoch key重建persistent
   Stage，old driver/cleanup/visibility callback对successor语义增量为零。

**2026-08-12 S4.3.1a composition-owned shared-kernel substrate delivery（commit `03bade7`，已完成）：** 本delivery严格保持上述exact thirteen-file scope：
`engine/packages/ui/src/managed-surfaces/managed-surface-composition-runtime.ts`及其test、
`engine/packages/ui/src/composer/create-game-ui-composition.ts`及其test、
`engine/packages/ui/src/composer/default-game-root.tsx`及其test、
`engine/packages/ui/src/narrative/narrative-surface-composition.tsx`（new）及其test（new）、
`engine/packages/ui/src/narrative/narrative-managed-surface-family.ts`及其test、
`engine/packages/ui/src/stage/semantic-stage.tsx`及其test，以及`engine/packages/ui/src/public-api.test.ts`；commit中恰好只有这十三个
source/test文件。UI package/root与`./internal` barrel、package exports、Web、Base、四个tracked Story default writer及dormant
`/conformance`均为zero-diff。

Composition现以one stable composite kernel让Overlay、System与Narrative共享application epoch、Coordinator facade、InputRouter、gesture
lease、successor gate与terminal cascade；Narrative只读取既有presentation publication fanout，保持one upstream semantic subscription。
Successor严格执行三family detach → one runtime/kernel replace → 全部prepare/arm → one shared gate open → current managed-input sync →
no-throw family notification flush → application anchor publish；任一prepare、arm、Stage bind或reentrant reconcile fault都会先fence
Narrative/Host/Stage再terminal-seal完整composition，不留下partial successor、第二kernel或late predecessor authority。

Hosted composition constructor以默认`null`的第三位置参数接收exact private frozen bundle
`{ definition, playerProfile, presentationClock, prefersReducedMotion }`。该bundle在任何Host property read、semantic subscription、application
epoch/runtime/InputRouter/kernel allocation或Story callable前完成outer own-data descriptor、exact keys、definition及environment callable validation；
malformed/accessor/inherited/proxy/thenable保持zero claim/subscription/runtime。每次Story selector返回的selection在进入bridge/candidate use前也作
exact frozen capture，hostile selector/preflight则terminal rollback完整composition。Captured `playerProfile`与`presentationClock`保留原对象identity，
使后续consumer以原receiver调用；`prefersReducedMotion`保留原callable并在每次消费时live重读，不被constructor snapshot。既有two-argument/default
`null`路径完全不变；bundle、其type与capture helper均保持package-private且不进入root、`./internal`、package export或public member。该structural seam允许
`.3.1b`在其既定Narrative/Web文件内传入public definition与Web-owned environment，不需再次修改composer，也不向Story暴露raw environment authority。
Choice availability、History、profile/text churn只更新occurrence-fenced observation；root与`./internal`的compile/runtime inventories及
`GameUiCompositionV1`、`SemanticStagePropsV1`、`DefaultGameRootPropsV1` exact key probes证明没有public member或low-level authority扩张。

Production DefaultRoot以stable portal挂composition-owned Host；pointer、keyboard、gamepad与renderer-bound callbacks共用exact
Surface + semantic + gesture/currentness fence，递归route与late completion fail closed。Actual SemanticStage由composition-scoped same claimant
claim一次并通过exact six-method private driver跨application successor复用；normal/initial recovery/replay-unsupported/instant/animated Barrier、
same-stack tick drain、stale completion、StrictMode setup-cleanup-setup grace与true unmount terminal cleanup均保持exactly-once。10,000
source/candidate/controller/availability/successor churn证明one current session/subscription/claimant/driver及bounded **O(1)** retained state；public
`onAcknowledgment` compatibility仍保留到`.3.1b` atomic deletion。

Final `03bade7` HEAD verification通过focused `7 files / 318 tests`、UI package `85 files / 1555 tests`与canonical
`260 files / 4491 tests`；canonical `deno fmt --check`覆盖`955 files`，lint、styles、typecheck、determinism、assets、five registered Story
checks与E2E production build（Vite transformed `418 modules`）全部green。第一轮hosted-definition corrective先得到exact `2 failures` RED；
第二轮hosted-environment bundle corrective也先得到exact `2 failures` RED，最终composer `32 / 32` GREEN关闭两项corrective。
Pre-corrective第一次并行canonical中两个既有10,000-churn rows触发timeout；两行保持原断言隔离复跑均green，随后当时的完整canonical rerun也green。
该中间过程不冒充最终证据：final amended commit `03bade7`的canonical独立clean通过`4491 / 4491`，没有timeout。本批未运行browser、examples或
prebuilt promotion；这些仍完整归`.3.1b`。

`.3.1a`与`.3.1b`现均已完成并转为historical checkpoint。唯一live current/next、core slice与direct RED/implementation gate现为
**PF5/M3 Save migration product surface（当前）**；冻结线性顺序为
**S4.3 broad checkpoint（historical） → S4.3.0（docs-only，已完成） → S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）**。

#### S4.3.1b tracked-consumer atomic cutover and promotion

`.3.1b` atomic implementation/browser commit的exact file scope为六十二文件；下列`delete`路径必须在该commit中消失，`new`
路径必须以kebab-case新建，其余路径只允许必要的production/test/promotion diff：

1. `engine/packages/ui/package.json`
2. `engine/packages/ui/src/narrative/narrative-surface-composition.tsx` (`post-.3.1a`)
3. `engine/packages/ui/src/narrative/narrative-surface-composition.test.tsx` (`post-.3.1a`)
4. `engine/packages/ui/src/composer/default-game-root.tsx`
5. `engine/packages/ui/src/composer/default-game-root.test.tsx`
6. `engine/packages/ui/src/stage/semantic-stage.tsx`
7. `engine/packages/ui/src/stage/semantic-stage.test.tsx`
8. `engine/packages/ui/src/stage/index.ts`
9. `engine/packages/ui/src/index.ts`
10. `engine/packages/ui/src/public-api.test.ts`
11. `engine/packages/web/src/application/start-web-game-application.tsx`
12. `engine/packages/web/type-tests/application-exports.test-d.ts`
13. `e2e/src/application/composition.tsx`
14. `e2e/src/application/shell-ui.tsx`
15. `e2e/src/test/composition.test.tsx`
16. `e2e/src/test/canary.test.tsx`
17. `e2e/src/test/default-ui.test.tsx`
18. `e2e/src/test/player.test.tsx`
19. `e2e/src/test/input.test.tsx`
20. `e2e/src/test/audio.test.tsx`
21. `template/src/application/composition.tsx`
22. `template/src/application/ui.tsx`
23. `template/src/presentation.ts`
24. `examples/bookshop/src/application/composition.tsx`
25. `examples/bookshop/src/application/ui.tsx`
26. `examples/bookshop/src/presentation.ts`
27. `examples/cat-cafe/src/application/composition.tsx`
28. `examples/cat-cafe/src/application/ui.tsx`
29. `e2e/src/application/narrative-renderer.tsx` (`new`)
30. `template/src/test/narrative-ui.test.tsx` (`new`)
31. `examples/bookshop/src/test/narrative-ui.test.tsx` (`new`)
32. `examples/cat-cafe/src/test/narrative-ui.test.tsx` (`new`)
33. `examples/silly-os/src/test/application-ui.test.ts` (`new`)
34. `engine/packages/ui/src/conformance/index.tsx` (`delete`)
35. `engine/packages/ui/src/conformance/index.test.tsx` (`delete`)
36. `engine/packages/ui/src/narrative/advance-surface.tsx` (`delete`)
37. `engine/packages/ui/src/narrative/dialogue-panel.tsx` (`delete`)
38. `engine/packages/ui/src/narrative/vn-layer.tsx` (`delete`)
39. `engine/packages/ui/src/narrative/vn-layer.test.tsx` (`delete`)
40. `engine/packages/ui/src/narrative/vn-layer.module.css` (`delete`)
41. `engine/packages/ui/src/narrative/index.ts` (`delete`)
42. `engine/packages/ui/src/player/index.ts` (`delete`)
43. `engine/packages/ui/src/player/text-reveal.ts` (`delete`)
44. `engine/packages/ui/src/player/playback-controller.ts` (`delete`)
45. `engine/packages/ui/src/player/playback-controller.test.ts` (`delete`)
46. `e2e/src/application/narrative-conformance.tsx` (`delete`)
47. `e2e/src/application/narrative-ui.tsx` (`delete`)
48. `e2e/src/test/narrative-conformance.test.tsx` (`delete`)
49. `examples/e2e/fixtures.ts`
50. `examples/e2e/playwright.examples.config.ts`
51. `examples/e2e/template.spec.ts` (`new`)
52. `examples/e2e/bookshop.spec.ts` (`new`)
53. `engine/packages/web/e2e/engine/narrative.spec.ts`
54. `engine/packages/web/e2e/engine/input.spec.ts`
55. `engine/packages/web/e2e/engine/reduced-motion.spec.ts`
56. `engine/packages/web/e2e/engine/rollback.spec.ts`
57. `engine/packages/web/e2e/engine/route.spec.ts`
58. `engine/packages/web/e2e/engine/timeline.spec.ts`
59. `engine/packages/ui/src/narrative/narrative-managed-surface-family.ts`
60. `engine/packages/ui/src/narrative/narrative-managed-surface-family.test.ts`
61. `engine/packages/ui/src/stage/stage-reconciler.ts`
62. `engine/packages/ui/src/stage/stage-reconciler.test.ts`

第59–60项family文件只允许`.3.1b` public definition/Choice-observation adapter对`.3.1a` substrate的必要收口；不得改写
既有stable lifecycle/policy。UI `internal.ts`、`composer/index.ts`、Web `src/index.ts`、Silly OS composition source、Base、Save、
Persistence、root config/lockfile与其他browser spec均为zero-diff。若first RED证明任一未列source/test/browser文件是必需，立即
回`.3.0`修订inventory，不在implementation中静默扩scope。

上述atomic commit及全部promotion gate green后，`.3.1b` docs closeout另一个commit的exact scope为二十一文件：

1. `docs/engine/architecture.md`
2. `docs/engine/features.md`
3. `docs/engine/development.md`
4. `docs/engine/story-authoring.md`
5. `docs/engine/authoring-quickstart.md`
6. `docs/engine/design/window-model.md`
7. `docs/engine/design/surface-contract-harness.md`
8. `docs/engine/plans/2026-07-30-surface-contract-harness.md`
9. `docs/engine/plans/2026-07-30-production-floor-sequence.md`
10. `docs/engine/roadmap.md`
11. `e2e/AGENTS.md`
12. `template/AGENTS.md`
13. `examples/AGENTS.md`
14. `website/guide/features.md`
15. `website/zh/guide/features.md`
16. `website/guide/examples.md`
17. `website/zh/guide/examples.md`
18. `website/guide/first-story.md`
19. `website/zh/guide/first-story.md`
20. `docs/engine/design/vn-presentation-runtime.md`
21. `docs/engine/proposals/feature-slices.md`

Closeout只记录已实现contract、删除的authority与本批实际evidence，不在docs commit再改public/source语义。

`.3.1b`必须是一个branch-free merge batch：先完成全部production definition/construction/claim，再在同一commit删除旧writers；不得先发布
compatibility wrapper、mirror、dual subscription、query fallback或第二kernel。Engine Lab、template、Cat Cafe与Bookshop都用同一
`NarrativeSurfaceDefinitionV1`/availability/History/transition rule；Silly OS省略`narrative`。Story保留的UI文件只能提供passive renderer/HUD/audio/
completion view，不能持有pending、History bool、timer、InputRouter或direct resolution writer。

同批删除清单是hard acceptance inventory：

- 删除`DefaultGameRootSlotsV1.narrative`及Web/四Story的slot forwarding；
- 删除`engine/packages/ui/package.json`的`./conformance` export、`engine/packages/ui/src/conformance/index.tsx`及其test、
  `e2e/src/application/narrative-conformance.tsx`与`e2e/src/test/narrative-conformance.test.tsx`；其hostile descriptor/source claim/
  rollback/late settlement/10,000/device rows迁到production composition tests后再删；
- 删除`AdvanceSurfaceV1`/`narrative/advance-surface.tsx`；`DialoguePanelV1`、`DialoguePanelPropsV1`、`DialoguePanelLabelsV1`、
  `DialogueResolutionV1`/`dialogue-panel.tsx`；`VnLayerV1`、`VnLayerPropsV1`、`VnChoiceV1`/`vn-layer.tsx`、test与CSS；同步删除
  `narrative/index.ts`和root exports；
- 删除superseded public player `createTextRevealV1`、`TextRevealV1`、`CreateTextRevealOptionsV1`、
  `createPlaybackControllerV1`、`PlaybackControllerV1`、`CreatePlaybackControllerOptionsV1`、`PlaybackBoundaryV1`、`PlaybackModeV1`、
  `PlaybackPolicyInputV1`及`player/index.ts`、`text-reveal.ts`、`playback-controller.ts`和test；
- 删除public `SemanticStagePropsV1.onAcknowledgment`、`CreateStageReconcilerOptionsV1.onAcknowledgment`与
  `StageTransitionAcknowledgmentV1` barrel/root export；
- 删除`e2e/src/application/narrative-ui.tsx`、`LabNarrativePlayerV1`、`narrative_conformance` query/default branch、local History/hidden/
  ordinary Narrative input/direct resolve、`LabBarrierRecoveryV1` direct effect以及`LabStageV1` direct acknowledgment dispatch；GameAudio与completion
  只可留在HUD/background/passive renderer；
- 删除template、Bookshop、Cat Cafe的`*NarrativePanelV1` writer、`slots.narrative`与direct `onResolve`；它们已有的labels/skin/locale/
  completion/audio改作renderer closure或non-lifecycle HUD，不删除产品视觉差异。

`.3.1b` RED必须先在新public API/production path上失败，并至少覆盖：root exact positive types/factory与old/root/internal/conformance exact
negative inventory；四Story declaration+Silly OS omission；Choice availability同occurrence disabled→enabled与disabled zero dispatch；五种pending、
Auto/Skip/voice、Pause、Custom、History exact-parent/focus/inert/Escape/backdrop/opener restore；Overlay/System higher blocker suspension；readiness
fallback/retry/source replacement/empty/terminal；Stage normal/recovery；pointer/keyboard/gamepad以及pointercancel/blur/visibility/lost-capture/device-
switch reset；stale callback/source/Surface/input/gesture/Stage proof zero dispatch；StrictMode/HMR/load/import successor与10,000 churn。Engine Lab
默认且无query时必须only production writer；Template/Bookshop需mounted renderer tests，Bookshop证明coins导致Choice disabled→enabled；Cat Cafe证明
locale-live labels/skin；所有semantic resolution每occurrenceexact +1且Promise在sync reconcile drain后settle。

Promotion不得复用`.5.1c` prior-only evidence。除focused UI/Web/four Story tests、UI/Web packages、`deno task test:conformance:headless`、
`deno task check:stories`与canonical `deno task check`外，必须显式执行：

- `deno task story build e2e`与`deno task story prebuilt-smoke e2e`；
- `deno task story build template`与`deno task story prebuilt-smoke template`；
- `deno task story build example-bookshop`与`deno task story prebuilt-smoke example-bookshop`；
- `deno task story build example-cat-cafe`与`deno task story prebuilt-smoke example-cat-cafe`；
- `deno task test:e2e:engine`、`deno task test:e2e:examples`与`deno task test:e2e:engine:prebuilt`。

Examples Playwright必须新增Template与Bookshop targets/spec，不得只用Cat Cafe/Silly OS冒充四Story promotion。Engine browser至少覆盖Narrative、input、
reduced-motion、rollback、route与timeline真实路径，使用role/test-id与事件/clock驱动，不引入sleep。`.3.1b`完成后同步
`architecture.md`、`features.md`、`development.md`、`story-authoring.md`、`authoring-quickstart.md`、`design/window-model.md`、
三份directory handbooks（e2e/template/examples覆盖四Story）、roadmap/live plans与website en/zh；这些live docs不能继续把
legacy panel或`/conformance`描述为authoring/default API。

#### S4.3 stop

出现任一情况立即停止并回`.3.0`修订，不得进入或继续cutover：需要公开raw Host/session/bridge/router/Coordinator/Stage proof/lease/source/
attempt/readiness/receipt；需要独立kernel、第二source subscription、mirror/compat wrapper或legacy与new同mount；`.3.1b`后任一old writer/export/
arbitrary narrative slot仍存活；四Story需要不同lifecycle/History rule；choice observation必须改变target/source identity、成为writable authority或
无法在issue前latest-fence；persistent Stage只能由fresh claimant接管或需要public claim；dispatch completion早于semantic notification+
Narrative reconcile drain；三设备/reset路线不能共用dual fence；不能在同批删除direct Barrier/resolve；需要扩Base、Save、Persistence、canonical
digest、replay/wire或S4b whole-canvas contract。任何stop命中都记录concrete evidence并暂停，不以测试放宽或dead compatibility path绕过。

本`.3.0`严格docs-only，只修改本design与两份owning plans，不交付source/test/runtime/architecture/public/live capability，也不把`.5.1c`
runtime evidence冒充本entry验证。Verification只有三份target docs的`deno fmt --check`与scoped `git diff --check`。`.3.1a`现已由commit
`03bade7`交付，`.3.1b`现也已由commit `a3a918e`完成atomic cutover/promotion，两者均转为historical；唯一live current/next、core slice与direct
RED gate为**PF5/M3 Save migration product surface（当前）**。

**2026-08-12 S4.3.1b tracked-consumer atomic cutover and promotion delivery（commit `a3a918e`，已完成）：** 本implementation commit严格落在
`.3.1b`冻结的exact 62-file allowlist内：其中`59 changed / 3 zero-diff`，三个zero-diff允许路径为
`engine/packages/web/e2e/engine/reduced-motion.spec.ts`、`engine/packages/web/e2e/engine/route.spec.ts`与
`engine/packages/web/e2e/engine/timeline.spec.ts`；变更精确包含`7 new / 15 delete`，未出现inventory外source、test或browser路径。
七个new为Engine Lab production renderer、Template/Bookshop/Cat Cafe/Silly OS Story tests与Template/Bookshop examples browser specs；十五个delete
完整移除dormant conformance、legacy Narrative panels/VN layer、superseded player及其Engine Lab direct writer/test路径。

`@sillymaker/ui` root现只公开本entry冻结的十个high-level Narrative names：`NarrativeChoiceAvailabilityV1`、
`NarrativeSurfaceSelectionV1`、`NarrativeSurfaceResolutionRequestV1`、`NarrativeSurfacePlayerViewV1`、
`NarrativeSurfaceDialogueRendererPropsV1`、`NarrativeSurfaceHistoryRendererPropsV1`、`NarrativeSurfaceRendererPropsV1`、
`DefineNarrativeSurfaceInputV1`、`NarrativeSurfaceDefinitionV1`与`defineNarrativeSurfaceV1`。Factory在任何Story callable、semantic subscribe或runtime
allocation前完成exact frozen five-key descriptor validation；Web只把真实profile/locale、presentation clock与live reduced-motion环境交给
composition-owned Host。Engine Lab、Template、Bookshop与Cat Cafe已用同一production definition/availability/History/transition rule，Silly OS明确省略
`narrative`；`DefaultGameRootSlotsV1.narrative`、public Stage acknowledgment、`./conformance`、legacy panel/VN writer与superseded public player export均已删除，
没有compatibility wrapper、mirror、dual subscription或第二kernel。

Production selection、同occurrence Choice availability、profile/locale/player observation与renderer callback均由composition的source/frame/Host/application
currentness fence约束；pointer/keyboard/gamepad、History exact-parent、higher System suspension、Stage normal/recovery/animated Barrier与completion settlement共用
同一authenticated route。Promotion中发现并关闭的reachable边界包括：production rAF timestamp先经同一clock的live `now()`规范化后才进入Dialogue tick，避免
same-frame raw timestamp伪回退；same revision/epoch/occurrence的fresh-equivalent Stage target只保留既有Barrier acknowledged run，不重复arm；最终topology corrective在
same-provenance Narrative `suspended → active`时以current prepared input contract successor-commit并旋转Host root action binding，predecessor topology route仍永久
stale。最后一项family/DefaultRoot joint mutation matrix为`302 / 302`。

Commit `a3a918e`的fresh promotion evidence为Web `26 files / 286 tests`、headless `25 files / 127 tests`、UI `82 files / 1486 tests`、
Story `15 files / 64 tests`与canonical `260 files / 4423 tests`；canonical format、lint、styles、typecheck、determinism、assets及build gates均green。
`e2e`、`template`、`example-bookshop`、`example-silly-os`与`example-cat-cafe`五个registered Story的checks全部green；四个required Narrative Story
`e2e`、`template`、`example-bookshop`与`example-cat-cafe`的explicit build及prebuilt-smoke全部green。Fresh Engine browser为`101 / 101`，examples browser
为`49 passed / 2 config-skipped`，Engine prebuilt为`38 / 38`。这些是本cutover/promotion的实际证据，不复用`.5.1c`或
`.3.1a`的prior-only结果。

`.3.1b tracked-consumer atomic cutover and promotion`现只作为**已完成；historical** checkpoint保留；其acceptance、exact inventory与stop仍作为交付边界，
不因closeout改写。唯一live current/next、core slice与direct RED/implementation gate现为**PF5/M3 Save migration product surface（当前）**；冻结线性顺序为
**S4.3 broad checkpoint（historical） → S4.3.0（docs-only，已完成） → S4.3.1a（已完成；historical） → S4.3.1b（已完成；historical） → S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）**。

### S4b.0 whole-canvas primary/detail exact entry（docs-only，已完成）

原S4b broad checkpoint只冻结了“stable互斥primary + explicit detail + atomic frame”的方向，但没有裁决真实第一消费者、Title/Splash
front door归属、detail ownership、public Story seam、physical Stage placement、input precedence、result/delta matrix或可独立合并的实现边界。因此原
**S4b broad checkpoint现转为historical，不得直接进入RED**。冻结线性顺序为：

1. **S4b broad checkpoint（historical）**：只保留原behavior、第二消费者与removal gate，不再作为implementation authority；
2. **S4b.0 exact entry（docs-only，已完成）**：冻结本节全部public/internal contract、三批RED、scope、promotion evidence与stop；
3. **S4b.1a whole-canvas family + routed-input substrate（已完成；historical）**：先交付DOM-free stable primary/transient detail family、exact
   `whole_canvas` context/router/parser、frame/action/readiness/focus fence与10,000 churn proof，不接live Host、不公开Story factory、不迁移
   Title/Splash或任何Story；
4. **S4b.1b dormant production composition/Host/GameStage substrate（已完成；historical）**：把fourth family接入shared kernel，交付dormant
   composition/Host、additive GameStage physical layer/token和cross-family activation/isolation proof；不公开factory、不切换Title/Cat/Lab writer；
5. **S4b.1c tracked-consumer atomic cutover and promotion（已完成；historical）**：同一merge batch公开唯一high-level Story seam，迁移全部built-in
   Title/Splash、Cat Cafe ending与Engine Lab second consumer，删除旧writer并完成browser/examples/prebuilt promotion；
6. **PF5/M3 Save migration product surface（当前）**：`.1c`已经完成并closeout；S4b不提前修改Save migration语义。

#### S4b.0 authority、identity与physical order

Whole-canvas只有一个composition-owned stable owner和一个publisher lease；Story不持有Coordinator、back stack、page-active boolean、source
revision或occurrence allocator。Exact inventory如下：

| Role                        | Exact ID / value                                                                                                                                                      | Contract                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| owner                       | `surface-owner.whole-canvas`                                                                                                                                          | 唯一stable owner；Title/Splash与Story primary共用一个per-owner source stream                          |
| root slot                   | `surface-slot.whole-canvas.primary`                                                                                                                                   | global `single` root                                                                                  |
| detail slot                 | `surface-slot.whole-canvas.detail`                                                                                                                                    | `single` child；exact parent definition为`surface.whole-canvas.primary`且parent occurrence必须current |
| layer                       | `surface-layer.whole-canvas`                                                                                                                                          | managed primary/detail `layerOrder`分别为`45 / 46`；不存在equal-layer peer                            |
| Story definitions           | `surface.whole-canvas.primary` / `surface.whole-canvas.detail`                                                                                                        | catalog `targetId`进入target参数，不动态生成definition ID                                             |
| built-in definitions        | `surface.whole-canvas.boot-splash` / `surface.whole-canvas.title`                                                                                                     | 与Story primary互斥，占同一root slot；不能承载detail                                                  |
| focus targets               | `surface-focus.whole-canvas.splash-dismiss` / `surface-focus.whole-canvas.title-primary` / `surface-focus.whole-canvas.primary` / `surface-focus.whole-canvas.detail` | Host必须绑定exact current marker；缺失则candidate不ready                                              |
| internal navigation actions | `whole-canvas.dismiss-splash` / `whole-canvas.open-detail` / `whole-canvas.close-detail`                                                                              | 不进入Story catalog或public callback                                                                  |
| built-in title actions      | `whole-canvas.title.new-game` / `whole-canvas.title.continue` / `whole-canvas.title.open-load` / `whole-canvas.title.open-settings`                                   | 只由composition-owned front-door adapter发布                                                          |
| routed aliases              | `ui.confirm` / `ui.cancel`                                                                                                                                            | confirm映射current catalog target的`defaultActionId`；cancel按下述topology policy处理                 |
| input context               | `whole_canvas`                                                                                                                                                        | additive public `InputContextIdV1` member                                                             |

GameStage的fixed-layer ABI新增required `wholeCanvas: ReactNode` physical slot和`--silly-stage-z-whole-canvas: 45`；现有七项均required，因此不得把本项
降为optional或由Host在其他physical layer偷挂。同一physical layer内primary/detail由managed
frame order `45 / 46`决定，不新增detail physical layer。Physical与InputRouter顺序精确为
`HUD 30 < Narrative 40/41 < wholeCanvas 45/46 < Workspace Overlay 50 < System 60/61`，router precedence精确为
`debug > system > overlay > whole_canvas > narrative > interaction > gameplay`。WholeCanvas active时Stage gameplay/interaction、HUD hit、Narrative
action/focus全部inert/unpublished；Overlay或System active时wholeCanvas再被inert/unpublished。`GameStageLayersV1.wholeCanvas`只是physical adapter
slot，不是Story lifecycle slot；`DefaultGameRootSlotsV1`不得新增`wholeCanvas: ReactNode` escape hatch。Public `InputContextIdV1`与
`StageInputIsolationContextIdV1`均新增exact member `whole_canvas`；前者在`.1a`冻结router/parser，后者与required Stage layer在`.1b`同批交付。

#### S4b.0 public Story contract

`WebGameUiDefinitionV1<TSemanticPublication, ...>`新增唯一可选字段
`wholeCanvas?: WholeCanvasSurfaceDefinitionV1<TSemanticPublication>`。既有`titleScreen` authoring shape保持不变，但Web只把它作为built-in
front-door content/port直接交给hosted composer的同一个whole-canvas authority；`.1c`删除public `DefaultGameRootPropsV1.titleScreen` ingress，Story/host不得
绕过Web definition重新注入front-door writer。`@sillymaker/ui` root只新增以下high-level
types/factories；`./internal`与root都不得暴露Host、session、bridge、Coordinator、publisher lease/source revision、target occurrence、instance、frame/
topology revision、readiness token、gesture、focus receipt、transition receipt或raw result：

```ts
export type WholeCanvasSurfacePlacementV1 = "primary" | "detail";

export interface WholeCanvasSurfaceCatalogEntryV1<
  TTargetId extends string,
  TActionId extends string,
> {
  readonly targetId: TTargetId;
  readonly contractRevision: 1;
  readonly placements: readonly WholeCanvasSurfacePlacementV1[];
  readonly actionIds: readonly TActionId[];
  readonly defaultActionId: TActionId | null;
}

export interface WholeCanvasSurfaceTargetV1<TTargetId extends string> {
  readonly targetId: TTargetId;
  readonly parameters: DeepReadonly<StrictJsonValueV1>;
}

export interface WholeCanvasSurfaceSelectionV1<TTargetId extends string> {
  readonly primary: WholeCanvasSurfaceTargetV1<TTargetId> | null;
}

export interface WholeCanvasSurfacePublicationSourceV1<
  TSemanticPublication,
  TTargetId extends string,
> {
  readonly kind: "publication";
  readonly selectPrimary: (
    publication: DeepReadonly<TSemanticPublication>,
  ) => WholeCanvasSurfaceSelectionV1<TTargetId>;
}

declare const wholeCanvasApplicationSourceBrandV1: unique symbol;
export interface WholeCanvasApplicationSourceV1<TTargetId extends string> {
  readonly [wholeCanvasApplicationSourceBrandV1]: TTargetId;
  replacePrimary(target: WholeCanvasSurfaceTargetV1<TTargetId>): void;
  closePrimary(): void;
}

export function createWholeCanvasApplicationSourceV1<TTargetId extends string>(
  initialPrimary: WholeCanvasSurfaceTargetV1<TTargetId>,
): WholeCanvasApplicationSourceV1<TTargetId>;

export type WholeCanvasSurfaceSourceV1<
  TSemanticPublication,
  TTargetId extends string,
> =
  | WholeCanvasSurfacePublicationSourceV1<TSemanticPublication, TTargetId>
  | WholeCanvasApplicationSourceV1<TTargetId>;

export type WholeCanvasSurfaceActionIntentV1<TTargetId extends string> =
  | Readonly<{
    readonly kind: "replace_primary";
    readonly target: WholeCanvasSurfaceTargetV1<TTargetId>;
  }>
  | Readonly<{
    readonly kind: "open_detail";
    readonly target: WholeCanvasSurfaceTargetV1<TTargetId>;
  }>
  | Readonly<{ readonly kind: "back" }>
  | Readonly<{ readonly kind: "close_primary" }>
  | Readonly<{
    readonly kind: "owner";
    readonly payload: DeepReadonly<StrictJsonObjectV1>;
  }>;

export interface WholeCanvasSurfaceActionAvailabilityV1<
  TTargetId extends string,
  TActionId extends string,
> {
  readonly actionId: TActionId;
  readonly status: "enabled" | "disabled";
  readonly reasonTextIds: readonly string[];
  readonly intent: WholeCanvasSurfaceActionIntentV1<TTargetId>;
}

export interface WholeCanvasSurfaceRendererActionV1<TActionId extends string> {
  readonly actionId: TActionId;
  readonly status: "enabled" | "disabled";
  readonly reasonTextIds: readonly string[];
}

export interface WholeCanvasSurfaceResolvedTargetV1<
  TTargetId extends string,
  TActionId extends string,
> {
  readonly accessibleNameTextId: string;
  readonly view: DeepReadonly<StrictJsonValueV1>;
  readonly actions: readonly WholeCanvasSurfaceActionAvailabilityV1<TTargetId, TActionId>[];
}

export interface WholeCanvasSurfaceResolveTargetRequestV1<
  TSemanticPublication,
  TTargetId extends string,
> {
  readonly publication: DeepReadonly<TSemanticPublication>;
  readonly placement: WholeCanvasSurfacePlacementV1;
  readonly target: WholeCanvasSurfaceTargetV1<TTargetId>;
}

export type WholeCanvasSurfacePreparationTargetV1<TTargetId extends string> =
  | Readonly<{
    readonly kind: "primary";
    readonly primary: WholeCanvasSurfaceTargetV1<TTargetId>;
  }>
  | Readonly<{
    readonly kind: "detail";
    readonly primary: WholeCanvasSurfaceTargetV1<TTargetId>;
    readonly detail: WholeCanvasSurfaceTargetV1<TTargetId>;
  }>;

export interface WholeCanvasSurfaceActionDispatchRequestV1<
  TTargetId extends string,
  TActionId extends string,
> {
  readonly placement: WholeCanvasSurfacePlacementV1;
  readonly primary: WholeCanvasSurfaceTargetV1<TTargetId>;
  readonly detail: WholeCanvasSurfaceTargetV1<TTargetId> | null;
  readonly actionId: TActionId;
  readonly payload: DeepReadonly<StrictJsonObjectV1>;
}

export interface WholeCanvasSurfacePrimaryRendererPropsV1<
  TTargetId extends string,
  TActionId extends string,
> {
  readonly kind: "primary";
  readonly target: WholeCanvasSurfaceTargetV1<TTargetId>;
  readonly view: DeepReadonly<StrictJsonValueV1>;
  readonly actions: readonly WholeCanvasSurfaceRendererActionV1<TActionId>[];
  readonly resolveText: (textId: string) => string;
  readonly onAction: (actionId: TActionId) => void;
  readonly onBack: () => void;
}

export interface WholeCanvasSurfaceDetailRendererPropsV1<
  TTargetId extends string,
  TActionId extends string,
> {
  readonly kind: "detail";
  readonly primary: WholeCanvasSurfaceTargetV1<TTargetId>;
  readonly target: WholeCanvasSurfaceTargetV1<TTargetId>;
  readonly view: DeepReadonly<StrictJsonValueV1>;
  readonly actions: readonly WholeCanvasSurfaceRendererActionV1<TActionId>[];
  readonly resolveText: (textId: string) => string;
  readonly onAction: (actionId: TActionId) => void;
  readonly onBack: () => void;
}

export type WholeCanvasSurfaceRendererPropsV1<
  TTargetId extends string,
  TActionId extends string,
> =
  | WholeCanvasSurfacePrimaryRendererPropsV1<TTargetId, TActionId>
  | WholeCanvasSurfaceDetailRendererPropsV1<TTargetId, TActionId>;

export interface DefineWholeCanvasSurfaceInputV1<
  TSemanticPublication,
  TTargetId extends string,
  TActionId extends string,
> {
  readonly catalog: readonly WholeCanvasSurfaceCatalogEntryV1<TTargetId, TActionId>[];
  readonly source: WholeCanvasSurfaceSourceV1<TSemanticPublication, TTargetId>;
  readonly resolveTarget: (
    request: WholeCanvasSurfaceResolveTargetRequestV1<TSemanticPublication, TTargetId>,
  ) => WholeCanvasSurfaceResolvedTargetV1<TTargetId, TActionId>;
  readonly dispatchAction:
    | ((
      request: WholeCanvasSurfaceActionDispatchRequestV1<TTargetId, TActionId>,
    ) => Promise<unknown>)
    | null;
  readonly renderer: ComponentType<WholeCanvasSurfaceRendererPropsV1<TTargetId, TActionId>>;
  readonly prepareTarget:
    | ((target: WholeCanvasSurfacePreparationTargetV1<TTargetId>) => Promise<unknown>)
    | null;
  readonly resolveText: (locale: string | null, textId: string) => string;
}

declare const wholeCanvasSurfaceDefinitionBrandV1: unique symbol;
export interface WholeCanvasSurfaceDefinitionV1<TSemanticPublication> {
  readonly [wholeCanvasSurfaceDefinitionBrandV1]: TSemanticPublication;
}

export function defineWholeCanvasSurfaceV1<
  TSemanticPublication,
  TTargetId extends string,
  TActionId extends string,
>(
  input: DefineWholeCanvasSurfaceInputV1<TSemanticPublication, TTargetId, TActionId>,
): WholeCanvasSurfaceDefinitionV1<TSemanticPublication>;
```

`DefineWholeCanvasSurfaceInputV1` own-key set exact为
`catalog | source | resolveTarget | dispatchAction | renderer | prepareTarget | resolveText`。Factory在读取任何Story getter/callable、semantic source、player
profile或分配runtime前descriptor-capture frozen plain exact own-data input；malformed/accessor/inherited/revoked/trapping Proxy、thenable callable、extra/
missing key统一同步抛`TypeError("ui.whole_canvas_surface_definition_invalid")`并保持zero subscription/claim/runtime allocation。Definition是frozen
zero-own-key opaque identity，binding只在package-private WeakMap；brand不形成runtime/type export inventory。

`catalog`必须是frozen dense non-empty array；每行是frozen plain exact five-key record，`contractRevision` exact为`1`，`targetId`/action ID均满足
stable module-ID grammar。`placements`是canonical dense non-empty subset：`["primary"]`、`["detail"]`或
`["primary", "detail"]`，不得倒序/重复；全catalog的`targetId`唯一。`actionIds` frozen dense且行内唯一，不能包含上述internal/title actions或
`ui.confirm`/`ui.cancel`；`defaultActionId`为`null`或必须属于同一行`actionIds`。Catalog duplicate、unknown placement、invalid text/action ID或reserved
collision在factory时同步拒绝，不能延迟到首次open。

`source`是closed union。Publication source为frozen exact `{ kind: "publication", selectPrimary }`，只接收composition现有presentation
fanout中的`publication.semantic`且不创建第二upstream subscription。Application source只能由
`createWholeCanvasApplicationSourceV1(initialPrimary)`创建：factory先descriptor-safe完成stable target ID与Strict JSON的structural admission，再返回frozen narrow
intent port，runtime own callable inventory exact只有`replacePrimary | closePrimary`；它没有`getSnapshot`、`subscribe`、`current`、revision、occurrence、receipt、result或
generic dispatch。Port持有package-owned desired primary且single state初始为`unbound`；unbound阶段合法`replacePrimary`为latest-wins、
`closePrimary`置empty，但因尚无catalog只能做structural admission。`defineWholeCanvasSurfaceV1`在其余definition/catalog全部capture并验证后，才原子取得sole definition
binding并按该catalog验证当时latest desired的membership/`primary` placement；factory先完整验证另外六个input keys、catalog、resolver与全部callables，source bind是
definition factory的最后一次atomic commit，之后不得再有会遗留half-bound source的failure。失败保持`unbound`与desired不变，可用corrected fresh definition retry；成功进入
`bound_unclaimed`，第二definition binding在任何binding/runtime mutation前同步抛
`TypeError("ui.whole_canvas_application_source_binding_conflict")`。Bound后每次replace都同步做structural + bound catalog admission；任一nonterminal阶段malformed、
unknown或wrong-placement target同步抛`TypeError("ui.whole_canvas_application_source_target_invalid")`且保留原desired/state零变化。

Port的单一exact state machine因此是`unbound | bound_unclaimed | claimed | terminal`：composition claim从`bound_unclaimed`原子snapshot latest desired、进入
`claimed`并成为唯一aggregate publisher后才mint source revision/reconcile；第二concurrent composition claim在subscription/runtime allocation前同步抛
`TypeError("ui.whole_canvas_application_source_claim_conflict")`。Construction/activation失败完整rollback到`bound_unclaimed`并允许fresh claim retry；一次成功claim后的
restart/load/import/HMR successor复用同一`claimed` token，不release/reclaim；true composition dispose进入`terminal`，definition永久不可reclaim，后续
`replacePrimary`/`closePrimary`两个void方法对任意input永久no-op。Publication selection必须是frozen plain exact
`{ primary }`；application initial/replace target与非null selected target都必须是frozen plain exact
`{ targetId, parameters }`，target须在catalog且允许`primary`，parameters须通过Strict Canonical Data的descriptor-safe、bounded、deep-frozen
`StrictJsonValueV1` admission。每个current/pending primary/detail再以frozen exact
`{ publication, placement, target }`调用pure `resolveTarget`；结果必须是frozen plain exact
`{ accessibleNameTextId, view, actions }`。Dynamic accessible-name text ID必须满足stable module-ID grammar，`view`必须是admitted deep-frozen Strict JSON；`actions`须与row的
`actionIds` exact length/order/set，每行是frozen exact `{ actionId, status, reasonTextIds, intent }`，enabled reasons必须empty，disabled至少一个valid text ID。
Intent是closed union：`replace_primary(target) | open_detail(target) | back | close_primary | owner(payload)`；target/payload都须Strict JSON + catalog
placement admission。`replace_primary` target必须允许primary；`open_detail` target必须允许detail，current detail存在时仍只做depth-one replacement；`back`在detail
执行close、在primary只consume/unchanged；`close_primary`原子退休primary与detail。Publication source禁止`replace_primary`/`close_primary`，防止renderer覆盖semantic source；application source的这两种intent进入同一个
narrow port，而不是第二writer。`dispatchAction`允许exact `null`，使pure navigation catalog不需dummy async callable；任一resolved `owner` intent要求
dispatcher非null，否则该resolved target按`ui.whole_canvas_surface_resolution_invalid` fail closed。
Host把resolved actions投影为deep-frozen exact三key renderer rows `{ actionId, status, reasonTextIds }`；renderer只接收该view/action projection和bound
resolver/callback，永不看见intent、owner payload或live publication。`onAction`只用captured action ID回查同一source/frame snapshot中的intent。`prepareTarget` exact
`null`表示没有Story async
preparation；非null callable必须返回原生Promise-like completion，resolve只表示Story preparation完成，仍须等待current Host commit/focus binding；throw/reject按readiness
failure处理。它不得返回cleanup/handle、变更selection或取得identity token。`resolveText`按current safe locale绑定为renderer一参函数；locale变化只刷新同一
active frame的resolved labels/publication，不轮换target occurrence、instance或topology。

#### S4b.0 single source、target equivalence与front-door precedence

Composition为`surface-owner.whole-canvas`独占一个stable publisher lease、专用monotonic source revision和occurrence allocator；不得复用semantic revision、
RuntimePresentation revision、application epoch或任何其他owner cursor。Story只返回declarative selection，普通作者绝不手写lease/revision/occurrence。
Aggregate desired primary的选择顺序exact为：

1. configured且尚未terminal-dismiss的`BootSplashV1`；
2. configured且尚未进入gameplay的`TitleScreenV1`；
3. latest valid publication-source selection或application-source desired Story target；
4. empty。

同一observable commit只能有一个root candidate；Splash→Title→Story/empty和Title→Story/empty都是same-owner replacement，不是两个publisher竞态。Story
publication selector与application desired在Splash/Title current期间继续通过同一aggregate source reconcile并只缓存latest valid desired，不发布第二root/action/input/
focus frame；front door成功关闭时一次atomic commit选择当时latest Story target/empty。
`returnToTitle()`必须先取得current lifecycle `anchored` successor，再选择Title并明确跳过Splash。Title Load与Settings只打开higher System surface并保持Title
current；current enabled Continue直接关闭Title，既不新增Save IO也不声称load。Successful load/import只由其anchored origin关闭Title；New Game只有在restart
anchored且`beginNewGame`完成后关闭Title。失败/throw保留current Title并发布frame-bound alert；late lifecycle/continue/save-list/timeout callback不能关闭successor
Title或Story target。Splash timer、click/confirm、Back/Escape/routed cancel全部路由`whole-canvas.dismiss-splash`并捕获同一frame；Splash是root而非
dialog，没有可命中的backdrop，synthetic backdrop request只consume/unchanged。Title的generic Back/Escape/backdrop/routed cancel四路均
consume/unchanged；New/Continue仅按上述success gate关闭，Load/Settings不关闭。

Target equivalence exact为`(definitionId, targetId, canonical parameters bytes)`；`parameters`中object key顺序差异经Strict Canonical Data归一后等价。连续equal
selection且equal resolved accessible-name/view/actions/intents不推进source/publication/topology、不prepare、不重render identity；任意targetId或canonical parameters
变化是replacement并fresh occurrence/fresh instance；A→empty→A、A→B→A、restart/load/import/HMR successor后的A都fresh。同一target下resolved
accessible-name/view/action status/reasons/intent变化推进隐藏per-owner source revision和Surface publication；action/intent publication变化同时推进topology/input
revision并旋转callbacks，但保留target occurrence/instance且不重跑`prepareTarget`。旧callback因captured source/frame不再current而永久stale。Story semantic
publication中既不改变selected target也不改变resolved projection的变化不得推进whole-canvas source revision。Source接收new desired revision时可进入desired/runtime
divergence，但active旧frame始终保留其原source revision，只有candidate ready的atomic cutover才发布新frame。

#### S4b.0 topology、dismiss、focus、readiness与actions

Story primary为externally selected stable root；只能由aggregate source替换/关闭，renderer、Back/Escape/backdrop、`ui.cancel`均不能transient-close它。
Package-owned detail是同owner transient exact-parent child，V1 cardinality/depth exact为**one**：只允许一个current或pending detail；detail target必须在catalog
且允许`detail`。Current enabled `open_detail(B)` intent在无detail时open，在A detail active时replace；equal current B canonical target为unchanged；close/reopen B必须fresh transient
occurrence/instance。Primary replacement/close在同一Coordinator commit退休current/pending detail、其actions/hit/focus restore和primary actions；detail永不成为stable
publisher或持有source revision，它的immutable frame继承exact current primary source revision作parent fence。

| Definition    | modality / navigation | Back               | Escape             | backdrop           | routed cancel      | focus                                                                      |
| ------------- | --------------------- | ------------------ | ------------------ | ------------------ | ------------------ | -------------------------------------------------------------------------- |
| Boot Splash   | blocking / close      | dismiss            | dismiss            | consume, unchanged | dismiss            | trap；initial splash-dismiss；no stale restore                             |
| Title         | blocking / none       | consume, unchanged | consume, unchanged | consume, unchanged | consume, unchanged | trap；initial title-primary；restore previous owner only after valid close |
| Story primary | blocking / none       | consume, unchanged | consume, unchanged | consume, unchanged | consume, unchanged | trap；initial primary；close restores current lower owner                  |
| Story detail  | blocking / close      | close              | close              | close              | close              | trap；initial detail；close restores exact current opener                  |

Readiness recipe固定为`initialOpen: blocking_fallback`、`primaryReplacement: retain_current`、`childOpen: blocking_fallback`。Initial primary未ready时只显示
package-owned inert blocking fallback，不发布Story actions/hit；replacement B准备时A保持完整current frame/action/focus，B不可见不可交互；detail准备时parent保持
rendered但lower input inert，fallback占detail位置。Candidate必须同时通过definition/target admission、`prepareTarget`（非null时）和Host commit/focus marker才ready。
Initial failure保留blocking fault fallback；replacement failure/cancel保留A exact identity；detail failure/cancel移除pending fallback并恢复同一parent/opener，不轮换parent
binding。Retry总是fresh instance；accepted-ready后的renderer fault委托既有root runtime-fault policy，不以`null`或旧renderer静默伪装成功。

`ui.confirm`只在current catalog row的`defaultActionId !== null`时映射为该exact action；为null时由wholeCanvas context consume/unchanged，不能落到lower
Narrative/gameplay。Direct action必须属于current row `actionIds`；unknown/stale/unpublished/disabled action fail closed。`ui.cancel`遵循上表。Renderer只得到
`onAction(actionId)`与`onBack()`两个void callbacks；confirm alias、InputRouter direct action与renderer action全部解析同一captured resolved action/intent snapshot，
`onBack()`只执行当前topology policy。Callbacks在创建时capture application epoch、owner source revision、primary/detail occurrence、instance、topology revision、
input publication、Host generation和gesture lease；任一不current则零dispatch/transition/focus mutation。`dispatchAction`只收到frozen exact
`{ placement, primary, detail, actionId, payload }`，且只由enabled `owner(payload)` intent调用；navigation intents完全由package执行。Dispatcher不收到Surface
identity/evidence；throw/reject报告`ui.whole_canvas_surface_action_fault`且不自行关闭target。
Promise completion只有在latest semantic notification已drain进selection reconcile后才settle内部attempt；early/late predecessor completion不能声称successor
applied。Public renderer和Story dispatcher都不取得receipt/result。

Physical pointer begin捕获current action binding；replace/detail close/epoch rotation在pointer activate前发生时，activate必须stable stale且零语义增量。Focus restore receipt还要
匹配current parent/opener、Host和epoch；visibility/focus loss、pointercancel/capture loss、device switch和reduced-motion/rebootstrap统一clear gesture/input。Immutable
internal frame exact绑定`applicationEpoch | sourceRevision | primaryTargetOccurrence | primaryInstance | detailTargetOccurrence? | detailInstance? |
surfacePublicationRevision | surfaceTopologyRevision | inputPublicationRevision | hostGeneration`，renderer只收到该frame投影的target/text/callback，不旁读Session或第二store。

#### S4b.0 result / delta matrix

本family复用既有Surface transition union `applied | unchanged | rejected | stale | faulted`和分层input/semantic outcome；**不新增或改名任何public result、receipt、
Base、Save、Persistence、canonical、digest、replay或wire union**。Exact observable delta如下：

| Operation                                                         | Result                                                  | Required delta                                                                                                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| invalid catalog/definition/selection/target/parent/action payload | rejected（factory malformed为sync TypeError）           | zero lease cursor/source/topology/input/focus/instance；runtime hostile selector terminal-seals composition                                               |
| equal stable primary publication                                  | unchanged                                               | zero revision/occurrence/instance/prepare/notification                                                                                                    |
| equal target + changed resolved view/availability/intent          | applied                                                 | source/publication（action变化另推进topology/input）；same occurrence/instance；old callback stale                                                        |
| empty→A initial                                                   | applied after ready                                     | source + publication + topology；fresh occurrence/instance；one action/input/focus publication                                                            |
| A→B replacement                                                   | applied after ready                                     | A retained while pending；ready commit retires A/detail/actions并publishes B atomically                                                                   |
| A→empty                                                           | applied                                                 | root/detail/actions/hit/input/focus retire in one commit；source/publication/topology advance once                                                        |
| detail empty→D / D→E                                              | applied after ready                                     | transient fresh occurrence/instance；replace retires predecessor detail/action/focus atomically                                                           |
| equal current detail D                                            | unchanged                                               | zero occurrence/instance/topology/focus delta                                                                                                             |
| detail close / Back / Escape / backdrop / routed cancel           | applied                                                 | top detail and actions retire together；restore exact opener；primary identity unchanged                                                                  |
| primary cancel or confirm with no default                         | unchanged, input consumed                               | zero Surface/semantic delta；lower contexts remain inert                                                                                                  |
| application-source replace / close                                | applied through aggregate publisher                     | 与publication source相同stable replacement/close delta；无Story page boolean或第二subscription                                                            |
| stale action/gesture/readiness/focus/lifecycle completion         | stale                                                   | zero source/topology/input/focus/semantic delta                                                                                                           |
| prepare failure initial / replacement / detail                    | faulted                                                 | initial fault fallback / retain A / restore parent respectively；no partial active candidate                                                              |
| current enabled owner action                                      | input consumed；owner effect keeps its existing outcome | dispatch exactly once；bounded owner effect may be an existing semantic command or lifecycle port；Surface changes only through later reconcile/successor |
| owner/application dispose                                         | applied once                                            | terminal fence first，then all pending/live/Host/subscription/gesture resources bounded cleanup；repeat unchanged                                         |

`rejected`不得推进stable revision cursor或取消合法older candidate；newer admitted desired revision才可取消older preparation。Notification order固定为candidate/current state
commit → action/input/focus publication → no-throw family listener flush → shared application anchor publication。Subscriber throw不能rollback已提交frame，也不能阻止其他listener。

#### S4b.1a family + routed-input substrate（已完成；historical）

`.1a`只实现DOM-free family/session、frame/action admission、public additive `whole_canvas` input context、router/parser precedence与boundedness proof；否则
exact definition recipe无法在本批独立parse/compile。它不接Web/React Host/live composition、不公开Story factory/application source或root type。Exact
exact-parent transient-child preparation/readiness/lifecycle/action claim同时从per-kernel singleton校正为per-kernel + per-`exactClaimant` weak partition：
`exactClaimant`就是package-internal family identity，同一object幂等取得同一authority，不同family object在同一shared kernel各自取得隔离authority；candidate/
ready-instance provenance必须记录该identity，任何cross-family readiness/lifecycle/action调用均fail closed且zero delta。Partition只能弱持有family identity，不得引入
随claim churn增长的strong map/tombstone。Exact source/test allowlist为十四文件，未需
修改者允许zero-diff但不得以inventory外文件补洞：

1. `engine/packages/ui/src/whole-canvas/whole-canvas-managed-surface-family.ts`（new）
2. `engine/packages/ui/src/whole-canvas/whole-canvas-managed-surface-family.test.ts`（new）
3. `engine/packages/ui/src/whole-canvas/whole-canvas-managed-surface-session.ts`（new）
4. `engine/packages/ui/src/whole-canvas/whole-canvas-managed-surface-session.test.ts`（new）
5. `engine/packages/ui/src/managed-surfaces/managed-surface-stable-composite-state.ts`
6. `engine/packages/ui/src/managed-surfaces/managed-surface-stable-composite-state.test.ts`
7. `engine/packages/ui/src/input/contracts.ts`
8. `engine/packages/ui/src/input/input-router.ts`
9. `engine/packages/ui/src/input/input-router.test.ts`
10. `engine/packages/ui/src/managed-surfaces/managed-surface-definition.ts`
11. `engine/packages/ui/src/managed-surfaces/managed-surface-action-route.ts`
12. `engine/packages/ui/src/managed-surfaces/managed-surface-action-route.test.ts`
13. `engine/packages/ui/src/public-api.test.ts`
14. `engine/packages/ui/type-tests/input-public.test-d.ts`

Mutation-sensitive RED必须先证明：exact owner/slot/definition/layer recipe和package-internal target/action admission rejection zero delta；empty→A、equal A、A→B、A→empty→A
occurrence/instance规则；same-target internal frame/action churn保留identity但旋转source/frame；one stable desired-source reconcile model；detail exact-parent depth-one
open/equal/replace/close与primary cascade retire；readiness initial/replacement/detail success/failure/cancel/retry；current/default action route、disabled rejection、primary cancel
consume、detail四路close；同一shared kernel中Narrative/WholeCanvas两个exact claimant均可幂等claim四类child authority并只操作本family candidate，cross-family token调用
fail closed/zero delta；immutable frame与stale action/gesture/readiness/focus/lifecycle；exact router order和higher-context isolation/restore；notification/reentry/throw；dispose/
successor；10,000 mixed source/detail/action churn retained state为`O(owners + live + pending + bounded cursors)`。所有新增10,000-churn test必须在test declaration
末参显式使用`30_000` ms timeout，不提高global `testTimeout`、不减少step count。至少一项mutation删掉source fence、一项把detail parent
降为definition-only、一项让primary cancel fallthrough、一项复用closed occurrence时必须RED。

Verification固定为new focused tests → affected managed-surface tests → complete UI package → canonical `deno task check` → exact allowlist
`deno fmt --check`与`git diff --check`。`.1a`不得复用S4.3 green evidence，也不运行/宣称live browser capability。

**2026-08-12 S4b.1a family + routed-input substrate delivery（commit `134ebd7`，已完成）：** implementation commit严格命中上述exact十四文件allowlist：十个既有文件modified；四个new文件exact为WholeCanvas family/session及其两份tests。没有inventory外source/test diff。

Mutation-sensitive RED依次关闭router/definition/action admission、per-claimant exact-child partition与atomic D→E、opt-in pending projection refresh、retained-root claimant proof且Narrative generic capture保持`null`、Host/kernel/listener reentry，以及descriptor-safe sidecar/catalog/array capture。Frame/action/readiness/dispose fences与10,000 churn boundedness也由同批RED固定；新增的四项relevant 10,000-churn tests均在test declaration显式使用`30_000`，没有修改global timeout或step count。

Final `134ebd7` HEAD verification通过focused `8 files / 481 tests`、WholeCanvas + generic `4 files / 153 tests`、Narrative `219 / 219`、UI package `84 files / 1526 tests`与canonical `262 files / 4461 tests`。Canonical format覆盖`951 files`，full lint/style/typecheck/determinism/assets、five registered Story checks与Engine Lab production build（Vite transformed `408 modules`）全部green。本DOM-free `.1a`按冻结gate不需要也未运行browser。

`.1c`现已完成并转为historical checkpoint。唯一live current/next、core slice与direct RED/implementation gate现为**PF5/M3 Save migration product surface（当前）**；冻结线性顺序为**S4b broad checkpoint（historical） → S4b.0（docs-only，已完成） → S4b.1a（已完成；historical） → S4b.1b（已完成；historical） → S4b.1c（已完成；historical） → PF5/M3 Save migration product surface（当前）**。

#### S4b.1b dormant production composition/Host/GameStage substrate（已完成；historical）

`.1b`只把post-`.1a` family接入existing composition-owned shared kernel：one fourth adapter、one dormant composition/Host、one required GameStage
`wholeCanvas` physical slot/token和`StageInputIsolationContextIdV1.whole_canvas`。Composer内部构造package-private generic composite-kernel bundle；public/non-hosted
omission不分配wholeCanvas lease/subscription/Host。Successor顺序扩为all four family detach → one kernel replace → all prepare/arm → one gate open →
input sync/notification flush → anchor publish，任一wholeCanvas attach/Host/Stage failure terminal rollback完整composition。`.1b`不得公开
`defineWholeCanvasSurfaceV1`/application source，不接Web、Title/Splash、Cat或Lab，也不删除任何live writer；DefaultRoot只在private binding存在时把dormant Host
放入required Stage slot，normal product path精确为`null`。

`.1b`保留现有hosted第三参数的Narrative-only seam，不临时增加第四参数、Web字段或public union；definition-null的dormant wholeCanvas adapter直接进入同一
recipe/kernel/successor。新增generic composite-kernel bundle聚合Narrative与WholeCanvas admission sidecar，Narrative composition改为消费该generic bundle，不能继续由
Narrative命名的bundle反向拥有four-family kernel。`GameStageLayersV1.wholeCanvas`保持required，所有direct fixed-layer fixture都显式补
`wholeCanvas: null`；legacy Title在`.1b`仍由System writer显示，而required wholeCanvas Host layer精确disabled/null，因此没有live双writer。

`.1b` exact source/test allowlist为三十三文件；new路径必须kebab-case，未需修改者允许zero-diff，不得以inventory外文件补洞：

1. `engine/packages/ui/src/managed-surfaces/managed-surface-composite-kernel-bundle.ts`（new）
2. `engine/packages/ui/src/managed-surfaces/managed-surface-composite-kernel-bundle.test.ts`（new）
3. `engine/packages/ui/src/narrative/narrative-surface-composition.tsx`
4. `engine/packages/ui/src/narrative/narrative-surface-composition.test.tsx`
5. `engine/packages/ui/src/whole-canvas/whole-canvas-surface-composition.tsx`（new）
6. `engine/packages/ui/src/whole-canvas/whole-canvas-surface-composition.test.tsx`（new）
7. `engine/packages/ui/src/whole-canvas/whole-canvas-surface-host.tsx`（new）
8. `engine/packages/ui/src/whole-canvas/whole-canvas-surface-host.test.tsx`（new）
9. `engine/packages/ui/src/whole-canvas/whole-canvas-surface-host.module.css`（new）
10. `engine/packages/ui/src/composer/create-game-ui-composition.ts`
11. `engine/packages/ui/src/composer/create-game-ui-composition.test.ts`
12. `engine/packages/ui/src/composer/default-game-root.tsx`
13. `engine/packages/ui/src/composer/default-game-root.test.tsx`
14. `engine/packages/ui/src/shell/game-stage.tsx`
15. `engine/packages/ui/src/shell/game-stage.test.tsx`
16. `engine/packages/ui/src/shell/game-stage.module.css`
17. `engine/packages/ui/src/shell/game-shell.tsx`
18. `engine/packages/ui/src/theme/tokens.css`
19. `engine/packages/ui/src/theme/stacking-tokens.test.ts`
20. `engine/packages/ui/src/primitives/primitives.test.tsx`
21. `engine/packages/ui/src/public-api.test.ts`
22. `engine/packages/ui/src/debug/dev-dock.test.tsx`
23. `engine/packages/ui/src/errors/errors.test.tsx`
24. `engine/packages/ui/src/narrative/narrative-surface-host.test.tsx`
25. `engine/packages/ui/src/overlays/overlay-host.test.tsx`
26. `engine/packages/ui/src/shell/game-shell.test.tsx`
27. `engine/packages/ui/src/system/system-dialog-host.test.tsx`
28. `engine/packages/ui/src/system/system-dialog-managed-host.test.tsx`
29. `engine/packages/ui/src/system/title-screen.test.tsx`
30. `engine/packages/ui/src/managed-surfaces/managed-surface-stable-composite-state.ts`
31. `engine/packages/ui/src/managed-surfaces/managed-surface-stable-composite-state.test.ts`
32. `engine/packages/ui/src/whole-canvas/whole-canvas-managed-surface-session.ts`
33. `engine/packages/ui/src/whole-canvas/whole-canvas-managed-surface-session.test.ts`

Replacement readiness失败形成的`readiness_failed` gap必须继续保留exact current primary predecessor：同claimant/current gap下，旧primary的DOM、focus、
captured action与exact-parent proof保持current，并仍可打开一个detail；foreign claimant、clone、旧generation或非current gap均在guard/dispatcher前stale且zero。
retry、primary close、fresh replacement ready cutover或terminal successor后，旧frame/proof/action须exact stale；不得由Host绕过session/generic authority伪造currentness。

Mutation-sensitive RED必须覆盖four-family prepare/arm/activation/reentry/dispose、higher Overlay/System与lower Narrative/interaction isolation、Host
single-lease/portal/focus/readiness/StrictMode、required Stage layer exact order/token、application successor late predecessor zero、optional omission zero allocation，以及
UI root/`./internal` factory/source/Host/session/bridge/revision/occurrence negative inventory。Verification为focused Host/composer/Stage/shared-kernel → UI package →
canonical `deno task check` → exact fmt/diff；本批若新增10,000-churn row，同样必须在test declaration末参显式使用`30_000` ms timeout。不运行/宣称
Story/browser promotion。

**2026-08-12 S4b.1b dormant production composition/Host/GameStage substrate delivery（scope correction commit `a971cce`；implementation commit `a5fc634`；已完成）：** scope correction只把exact allowlist从二十九文件扩为可达的三十三文件；implementation严格命中该修正后边界：二十六个existing files modified、七个new files，零inventory外source/test diff。Generic composite-kernel bundle现由composition单独拥有，Narrative与WholeCanvas共享同一aggregate sidecar/slot authority；composer的fourth adapter、required `wholeCanvas` Stage layer/token、private dormant Host与all-four successor barrier均已交付，public Story factory、Web ingress、Title/Splash、Cat与Lab writer保持未切换。

Mutation-sensitive RED关闭four-family prepare/arm/activation/rollback/dispose、definition-null omission zero lease/source/observer/Host、Host exact physical tuple/focus/readiness/StrictMode、Stage layer `45`与input isolation、application successor late-predecessor zero、root/`./internal` negative inventory，以及replacement `readiness_failed` gap中retained A的DOM/focus/action/exact-parent proof。Retry、ready cutover、close与terminal successor会旋转或废止该generation，旧frame/proof/action均exact stale；Host没有绕过session/generic authority伪造currentness。

Final `a5fc634` HEAD verification通过focused `20 files / 444 tests`、UI package `87 files / 1564 tests`与canonical `265 files / 4499 tests`。Canonical format覆盖`958 files`，full lint/style/typecheck/determinism/assets、five registered Story checks与Engine Lab production build（Vite transformed `414 modules`）全部green。`.1b`按冻结gate不运行也不宣称browser promotion，现转为historical checkpoint；唯一live current/next、core slice与direct RED/implementation gate为**PF5/M3 Save migration product surface（当前）**。

#### S4b.1c atomic cutover、consumers与promotion（已完成；historical）

`.1c`在一个merge batch完成public factories、front-door adapter和全部old-writer removal，并hard-delete public
`DefaultGameRootPropsV1.titleScreen` ingress；不得先挂新public/live source后留旧Title/HUD ending writer。Exact
runtime/test/browser allowlist为下列二十九文件；new路径必须kebab-case，允许列内zero-diff，不允许inventory外runtime补丁：

1. `engine/packages/ui/src/whole-canvas/whole-canvas-surface-composition.tsx`
2. `engine/packages/ui/src/whole-canvas/whole-canvas-surface-composition.test.tsx`
3. `engine/packages/ui/src/whole-canvas/whole-canvas-surface-host.tsx`
4. `engine/packages/ui/src/whole-canvas/whole-canvas-surface-host.test.tsx`
5. `engine/packages/ui/src/composer/create-game-ui-composition.ts`
6. `engine/packages/ui/src/composer/create-game-ui-composition.test.ts`
7. `engine/packages/ui/src/composer/default-game-root.tsx`
8. `engine/packages/ui/src/composer/default-game-root.test.tsx`
9. `engine/packages/ui/src/system/title-screen.tsx`
10. `engine/packages/ui/src/system/title-screen.test.tsx`
11. `engine/packages/ui/src/index.ts`
12. `engine/packages/ui/src/public-api.test.ts`
13. `engine/packages/web/src/application/start-web-game-application.tsx`
14. `engine/packages/web/type-tests/application-exports.test-d.ts`
15. `examples/cat-cafe/src/application/composition.tsx`
16. `examples/cat-cafe/src/application/ui.tsx`
17. `examples/cat-cafe/src/features/endings/ending-screen.tsx`
18. `examples/cat-cafe/src/test/whole-canvas-ui.test.tsx`（new）
19. `examples/e2e/cat-cafe.spec.ts`
20. `e2e/src/application/composition.tsx`
21. `e2e/src/application/whole-canvas-conformance.tsx`（new）
22. `e2e/src/test/whole-canvas-conformance.test.tsx`（new）
23. `e2e/src/presentation.ts`
24. `e2e/src/test/composition.test.tsx`
25. `engine/packages/web/e2e/engine/whole-canvas.spec.ts`（new）
26. `examples/silly-os/src/test/application-ui.test.ts`
27. `examples/e2e/silly-os.spec.ts`
28. `engine/packages/ui/src/narrative/narrative-surface-host.tsx`
29. `engine/packages/ui/src/narrative/narrative-surface-host.test.tsx`

**2026-08-12 S4b.1c docs-only scope corrective：** 原二十七项全部保持不变。Cat Cafe真实浏览器的initial Title WholeCanvas与retained
Narrative同时存在时，Narrative Host的document-level focus trap未在入队与microtask执行时复验shell祖先`[inert]`；它会与WholeCanvas focus trap
连续互相恢复焦点，造成microtask/main-thread starvation。该故障由本`.1c` public Title/WholeCanvas cutover直接触发并阻断第一consumer browser
evidence，因此必须在同一`.1c` batch修复，不能留给后续切片或在Cat/WholeCanvas Host绕过；allowlist只为此扩入上述Narrative Host source/test pair，
不声明runtime delivery。

后续docs-only commit `937d962`曾基于Cat New Game关闭故障把WholeCanvas Managed Surface session source/test暂时纳入三十一项scope；审计随后确认
故障位于既有allowlist内的composition Host-commit family projection，而非session authority。Commit `4393c59`完整revert该临时扩展；最终`.1c`
runtime authority仍为上述二十九项，session source/test在本delivery保持zero runtime diff，不得把撤销的假设写成三十一项implementation inventory。

两项public factory runtime实现与tests同时落在whole-canvas composition files；不得新建generic public Coordinator/registry/controller。Public Story/Web seam、built-in
front-door adapter与public negative inventory必须在本batch一起发布；`.1a` input及`.1b` Stage/shared-kernel不得复制。Engine Lab的新conformance component独占
query-gated application source、renderer、readiness和launchers，`e2e/src/presentation.ts`只提供labels；Cat由new focused whole-canvas UI test证明。现有
`e2e/src/application/shell-ui.tsx`、`e2e/src/test/default-ui.test.tsx`、`e2e/src/test/input.test.tsx`、`engine/packages/web/e2e/engine/fixtures.ts`、
`examples/cat-cafe/src/test/narrative-ui.test.tsx`与`examples/cat-cafe/src/test/postgame.test.ts`只参加broader gate，不是allowlist成员。

Implementability seam在`.1c`原子把`createHostedGameUiCompositionInternalV1`第三参数从Narrative-only input替换为`null`或descriptor-captured frozen exact
三own-key `{ narrative, wholeCanvas, environment }` aggregate；不得增加第四参数、temporary union或分阶段compat path。`narrative`是captured definition或`null`；
`environment`是共享的frozen exact三own-key `{ playerProfile, presentationClock, prefersReducedMotion }`，raw ports/live reader均先做receiver-safe callable admission且不在
family contribution重复。`wholeCanvas`为`null`或frozen exact六own-key
`{ definition, titleScreen, lifecycle, savePort, customSavesConfigured, labels }`：`definition`为Story definition或`null`；`titleScreen`为`null`或normalized
frozen exact四own-key `{ title, backgroundUrl, splash, beginNewGame }`，其中optional值一律显式`null`，non-null `splash`又是frozen exact
`{ lines, durationMs }`，Web把existing public callback receiver-safe绑定成`() => void | Promise<unknown>`并在wrapper内部传`instance.semantic`，composer永不取得raw semantic
mutation port；`lifecycle`是frozen narrow exact one-key `{ restart }` facade；`savePort`是admitted `SaveOverlayPortV1 | null`；
`customSavesConfigured`是boolean；`labels`是resolved-string frozen exact五own-key `{ newGame, newGameFailed, continue, load, settings }`。Top-level bundle只在
`narrative !== null`或`wholeCanvas !== null`时存在；`wholeCanvas`只在Story definition或normalized titleScreen至少一项存在时非null。Constructor必须在读取Story
callable、建立semantic subscription或分配epoch/recipe/kernel/router/lease/React runtime前，先capture/admit全部三层descriptor/callable/port；任一getter/accessor、
extra/missing key、malformed member或trapping Proxy同步拒绝并保持all-family zero allocation，不能先capture Narrative再失败于wholeCanvas。

`.1c` implementation同一commit还必须同步以下exact十九份governing/live documentation tail，不能以新增source路径替代：

1. `docs/engine/design/surface-contract-harness.md`
2. `docs/engine/plans/2026-07-30-surface-contract-harness.md`
3. `docs/engine/plans/2026-07-30-production-floor-sequence.md`
4. `docs/engine/architecture.md`
5. `docs/engine/features.md`
6. `docs/engine/story-authoring.md`
7. `docs/engine/development.md`
8. `docs/engine/roadmap.md`
9. `docs/engine/authoring-quickstart.md`
10. `docs/engine/design/e2e-engine-validation.md`
11. `docs/engine/design/vn-presentation-runtime.md`
12. `docs/engine/design/window-model.md`
13. `e2e/AGENTS.md`
14. `examples/AGENTS.md`
15. `template/AGENTS.md`
16. `website/guide/features.md`
17. `website/zh/guide/features.md`
18. `website/guide/examples.md`
19. `website/zh/guide/examples.md`

Consumer/removal inventory exact为：

- **Cat Cafe（第一真实消费者）**：catalog primary `catcafe.ending`，actions `cc.enter_postgame | cc.restart`，selection仅由
  `semantic.game.ending`投影；ending value进入canonical parameters。`CatcafeEndingScreenV1`变为纯renderer，只用frame-bound `onAction`，不持有semantic/lifecycle、
  absolute root `zIndex`、pointer authority或raw dialog lifecycle。`CatCafeHudV1`删除`game.ending` early-return whole-screen branch，旧direct
  `dispatchV1`/`instance.lifecycle.restart()` writer同批消失；Continue仍通过existing `cc.enter_postgame`语义命令，`cc.restart` owner action仍调用existing
  `instance.lifecycle.restart()`，由epoch successor与existing semantic reset回到fresh gameplay且ending absent；两者均不改变command/result/Save语义，也不把Restart改成
  Title或发明`return_to_title`。
- **Engine Lab（中性第二消费者）**：仅在exact `whole_canvas_conformance=1` branch启用catalog targets
  `lab.whole-canvas.home | lab.whole-canvas.status | lab.whole-canvas.storage | lab.whole-canvas.specimen-catalog | lab.whole-canvas.specimen-detail`；前四个允许
  primary，specimen-detail只允许detail。Fixture-local catalog action IDs exact为
  `lab.whole-canvas.show-home | lab.whole-canvas.show-status | lab.whole-canvas.show-storage | lab.whole-canvas.show-specimen-catalog | lab.whole-canvas.open-specimen-detail`；
  它们不是root public union或跨Story ABI。每个primary row只列指向其他primary的`show-*` actions；specimen-catalog另列
  `open-specimen-detail → open_detail`；detail row actions可empty且只靠package-bound `onBack`关闭；全部row的`defaultActionId` exact为`null`。Branch创建one
  `WholeCanvasApplicationSourceV1`，initial为home；resolved replace/open/back intents和System-menu
  conformance launcher只调用该narrow void port，composition内部aggregate publisher保持唯一writable lifecycle，不新增Story page boolean、subscription或可保存
  route/game state。Owner intents只复用existing Lab semantic commands。既有`workspace-overlay-conformance`不是whole-canvas consumer，不得复用其owner/session冒充第二消费者。
- **built-in front door**：Template、Bookshop、Cat Cafe现有`titleScreen`（Cat另含Splash）自动迁入同一owner；它们不手写definition/selection。DefaultRoot删除
  public `titleScreen` prop、`titleDismissed`、`splashDismissed`、title lifecycle generation和effect writer，`BootSplashV1`/`TitleScreenV1`只保留pure
  rendering；`TitleScreenV1`只接收frame-bound action callbacks，不再直接打开Save/Settings context，composition-owned front-door adapter执行四个built-in title
  actions；public-api negative证明该ingress不能复活。SillyOS没有
  `titleScreen`且显式省略`wholeCanvas`；其全部MDI window geometry/lifecycle完整out of scope。Custom-shell boot/shutdown fullscreen state是明确tracked debt，
  不算consumer/promotion evidence，也不形成允许本批或后续新增fullscreen writer的escape hatch。

`.1c` Host/model RED必须覆盖：two factories/capture/public export exact shape与definition exact seven-key/catalog exact five-key admission；publication selector和application
source两种mode、resolve result/action order/renderer intent-redaction、五种closed intent及publication replace/close rejection；application source pre-claim latest-wins/invalid
sync zero/current claim/second-claim/terminal void no-op与不可reclaim；single semantic subscription/single publisher/single Host lease；Splash→Title→Story和
returnToTitle skip-Splash；Title New/Continue/Load/Settings failure/late settlement；Host commit readiness/fallback/retry；primary/detail render/action/input/focus同帧；
Overlay/System higher isolation；application successor all-family closed-gate activation；React StrictMode setup-cleanup-setup；Cat raw writer absence；Engine Lab default branch
zero allocation；public root/`./internal` raw authority negative inventory。

Browser必须在Chromium与WebKit以stable managed definition/action locators覆盖：Engine Lab home→status→storage→specimen-catalog mutually exclusive replacement、catalog
detail open/Back/Escape/backdrop/routed cancel、focus trap/opener restore、confirm-with-null consume/unchanged与direct action switch、close/reopen fresh occurrence/instance、delayed ready/failure/
retry、pointer-down old action→keyboard replacement→pointer-up stale zero、restart/late preparation zero，以及Cat Cafe real ending→Continue→epilogue和
Restart→fresh gameplay/ending absent。Cat Restart只由owner action调用existing `lifecycle.restart()`；epoch successor与existing semantic reset关闭ending，不发明
Restart→Title、`return_to_title`或generic front-door intent。Existing `returnToTitle`仍是显式front-door port。
Pointer证据只用locator hover/dispatch与controlled readiness event，不准hard-coded coordinate、fixed sleep、animation timeout或text-only selector。S6仍保留locked modal、
full home/status/storage/specimen authoring matrix的generalized model/seeded shrink/structural diagnostics和stable builder promotion；S4b不得提前宣称S5/S6完成。

`.1c` fresh gate顺序固定为focused wholeCanvas family/session/Host/composer/DefaultRoot/Stage/public/Web/Cat/Lab tests → UI package → Web package → Cat/Engine Lab
Story tests → `deno task test:conformance:headless` → `deno task check:stories` → focused Chromium+WebKit wholeCanvas + Cat Cafe specs → full
`deno task test:e2e:engine` → full `deno task test:e2e:examples` → `deno task test:e2e:engine:prebuilt` → explicit e2e/Cat/Template/Bookshop Story build+
prebuilt smoke → canonical `deno task check` → exact fmt/diff/dead-path/public-api/single-authority audit。Prior `.1a`/`.1b`/S4.3 evidence不得冒充`.1c` HEAD
promotion。

**2026-08-12 S4b.1c tracked-consumer atomic cutover and promotion delivery（scope corrective commit `b2e8b14`；withdrawn scope commit `937d962`由
`4393c59`完整revert；已完成）：** final runtime overlay严格命中上述exact二十九文件：二十五个existing files modified、四个new files，零inventory外
runtime/test/browser diff；被撤销的session pair保持zero diff。Public `defineWholeCanvasSurfaceV1`与`createWholeCanvasApplicationSourceV1`、Web optional
`wholeCanvas` ingress、composition-owned Splash/Title front door、Cat Cafe `catcafe.ending`第一消费者、query-gated Engine Lab第二消费者及SillyOS omission已同批
交付。`DefaultGameRootPropsV1.titleScreen`与Cat HUD ending direct writer已删除；renderer只消费immutable frame并发送frame-bound action。

Mutation-sensitive RED关闭public definition/application-source descriptor admission与single claim、publication/application source、Splash→Title→Story、primary/detail
readiness/action/input/focus、replacement/detail failure、StrictMode与successor stale fences、Cat real Web/React startup、Narrative ancestor-`[inert]` focus trap，以及
primary-close恢复正确focus并原子进入Story/empty。最后focused corrective为`4 files / 93 tests`，Splash→Title与primary-close focus均先RED后GREEN。

Final promotion evidence为headless `26 files / 135 tests`、Cat targeted Chromium+WebKit `8 / 8`（real `44.71s`）、full Engine browser `111 / 111`
（real `150.08s`、user `102.34s`、sys `22.20s`）、full examples browser `51 passed / 2 expected skipped`（real `211.25s`、user `62.23s`、
sys `12.32s`），以及Engine prebuilt build `415 modules` + browser `43 / 43`（real `52.02s`）。Explicit Story builds为Engine Lab `415`、Template
`401`、Bookshop `399`、Cat Cafe `447` modules，四个prebuilt smoke均green。Canonical `deno task check`覆盖format `962 files`、full
lint/style/typecheck/determinism、`267 files / 4524 tests`、assets、five registered Story checks与Engine Lab build `415 modules`，全部green。`.1c`现为
completed/historical；唯一live current/next、core slice与direct RED/implementation gate为**PF5/M3 Save migration product surface（当前）**。

#### S4b stop

任一batch出现以下条件立即停止并回`.0`修订，不得自行扩大authority：

- 需要新增public Surface/result/receipt code、把occurrence/revision/lease/frame暴露给Story，或改变Base/Save/Persistence/canonical/digest/replay/wire/
  transient receipt；
- 出现真实equal-layer或未裁决cross-owner order，不能保持`40/41 < 45/46 < 50 < 60/61`或上述InputRouter precedence；
- detail必须改为externally owned/stable、depth大于一、跨owner parent，或primary/detail不能共享一个owner与atomic retire；
- 不能在`.1c`同批删除DefaultRoot Title/Splash writer、Cat HUD ending writer、raw z/input/lifecycle path，或需要legacy/new双写一段时间；
- Cat与Engine Lab需要不同target equivalence/readiness/dismiss/failure语义，Engine Lab必须新增Save/replay-visible route state，或第二消费者只能用Overlay冒充；
- Title/Splash必须留在System owner、Story primary需要另一publisher，或SillyOS custom-shell/MDI被迫纳入本family；
- browser只能靠sleep/coordinates/文案命中，不能构造pointer-down→replace→pointer-up或late readiness/restart deterministic evidence；
- maintained fixture或Story需要不同migration/failure semantics、商业/仓外材料、new Base semantic action，或implementation必须越过exact source/test/docs inventory；
- 需要提前交付S5 structural/model/seeded shrink、S6 locked modal/stable builder或Mod/genre/renderer scope。

本`.0`严格docs-only，只修改本design、两份owning plans与`docs/engine/design/window-model.md`，不交付source/test/runtime/public/live capability；verification只有
四份target docs的`deno fmt --check`与scoped `git diff --check`。S4b broad checkpoint现为historical；`.0`完成时的下一gate为`.1a`，该项及`.1b`/`.1c`现均已由上述delivery关闭。唯一live current/next、core slice与direct RED gate为
**PF5/M3 Save migration product surface（当前）**。

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
