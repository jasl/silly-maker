# Managed Surface lifecycle and contract harness

状态：2026-07-30 接受的目标设计；尚未实现。本文固定影响输入与焦点的 UI Surface
的权威边界、生命周期、输入代际与验证分层，并把“弱模型能够写出正确代码”提升为作者
API 的验收条件。当前实现仍以 [architecture](../architecture.md) 与
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
2. 本地、不可发布的整画布复刻实验反复暴露同一类故障：视觉画面、可点击动作、导航栈、pending
   interaction 和 React
   状态并非同一权威投影，较弱模型只能逐点补丁，难以证明所有组合闭合。该实验只提供抽象行为证据，不是源码、素材或测试依赖。

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

- stable definition ID、owner 与 source location；
- layer/slot、cardinality 和 activation policy；
- modality、遮挡和 input context；
- dismiss policy：Back、Escape、backdrop、routed cancel 分别是否合法；
- initial focus、focus trap/restore policy；
- readiness policy 与 code-native fallback；
- 可执行 semantic action IDs；
- stable target 参数 schema；
- 可选的 parent/child 约束。

定义不包含 React element、DOM node、Pixi object、listener、Promise、clock handle
或可变 store。

### 3.2 Stable target

领域 projector 发布
`ManagedSurfaceTarget`，描述产品希望显示的稳定语义目标，例如：

```text
primary = inventory(characterId)
detail = item(itemId)
modal = confirm(discardDraft)
```

目标不包含 z-index、focus、mounted、CSS visibility 或 pointer handler。每个
stable target 必须由 owner 提供
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

Reconcile 不以“任意 source revision 变化”或“参数深相等”猜 occurrence：

- 同一 target occurrence ID 且定义/参数未变：保持当前 runtime instance；
- 同一 occurrence ID 却改变定义或参数：target publication 非法；
- target 消失：关闭对应 runtime instance；
- 新 occurrence ID：即使定义/参数相同，也创建新的 runtime instance；
- 同一 application epoch 内复用已经结束的 occurrence ID：结构化拒绝，防止 ABA。

### 3.3 Runtime session

纯 `ManagedSurfaceSessionState` 根据已解析定义和 target 管理有界拓扑：

- `ManagedSurfaceDefinitionId`：作者声明的稳定 UI 类型；
- `ManagedSurfaceTargetOccurrenceId`：externally published target 由 owner
  提供，transient target 由 Coordinator 生成；
- 可选的 semantic occurrence ID：例如 Base
  `PendingInteraction.occurrenceId`，不能被 target 或 UI instance 身份取代；
- stable `ManagedSurfaceInstanceId`：一次打开 occurrence 的 runtime 身份；
- monotonically changing `SurfaceTopologyRevision`：当前可交互拓扑版本；
- `applicationEpoch`：load/import/restart/HMR successor 的 presentation fence；
- parent、layer、slot 与 stack position；
- `preparing | active | suspended | exiting` lifecycle phase；
- readiness、input owner、focus owner 与 restore target；
- 当前 managed routing lease 的稳定 ID；physical gesture token/capture 属于
  InputRouter/Web adapter。

同一个 definition 被再次打开会得到新 instance ID；同 kind、同 stack depth、同
DOM key 或同图片槽都不能代替 instance identity。definition ID、target
occurrence、可选 semantic occurrence、runtime instance、topology revision 与
application epoch 是六个不同概念，不复用一个含糊的 `generation`
字段，但它们的暴露面严格分层：occurrence 只出现在 owner↔Coordinator reconcile 与
publication 中；同一 application epoch 内 occurrence 与 instance 按上节
reconcile 规则一一对应（Coordinator 从 `(epoch, occurrence)` 确定性派生
instance），因此 dispatch envelope、transition receipt 与常规诊断以
`surfaceInstanceId` 为唯一 Surface 实例身份，不要求作者、renderer 或测试同时
携带 occurrence；semantic occurrence 属于 Base semantic dispatch
的既有身份，不是 Surface identity 字段。`exiting` Surface
可为了动画继续绘制，但已失去输入所有权；`suspended` Surface 可保留 mounted
状态，但不能接收被上层阻塞的 action。

### 3.4 Atomic publication

一次 Coordinator commit 产生一个不可变的 `ManagedSurfacePublication`，原子包含：

```text
surface topology and lifecycle
  + ordered render layers
  + modality and blocking
  + input and focus owner
  + published action catalog
  + readiness
  + application epoch / target occurrence / topology revision / source publication revision
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

异步准备采用显式 readiness，而不是 `setTimeout(50)`：

1. validate request and preconditions；
2. 生成候选拓扑与 topology revision；
3. 原子进入 `preparing`，按声明选择“旧 Surface 继续 active”或“阻塞式 loading
   fallback”；
4. Host 以绑定 instance/topology revision 的 receipt 报告 ready/failure；
5. Coordinator 原子 activate，或回退并发布结构化 failure。

过期 receipt 只能返回 stale rejection，不能激活已被替换的 Surface。

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

target occurrence 不进入 dispatch envelope：epoch 内它与 instance 一一对应（见
3.3），诊断可从对应 publication 反查。semantic occurrence（如
`PendingInteraction.occurrenceId`）由 semantic dispatch payload 携带并由 Base
既有 fence 校验，不作为 Surface envelope 字段重复出现。

不属于 Managed Surface 的 HUD/Stage envelope 至少携带 `inputOwnerId` 与
`sourcePublicationRevision`，并在适用时携带 `semanticOccurrenceId`；它不伪造
surface instance/topology revision。两种 envelope 都保留 application epoch、
action/gesture identity，并由同一个 InputRouter 完成优先级与消费判定。

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

可选的端到端 `ApplicationActionReceipt` 由 application-composition bridge
组合，而不是 Coordinator、GameSession 或 renderer 单独声称。该 bridge 只读取
immutable before/after semantic 或 workspace publication、各层
receipt，以及可选的 Managed Surface Publication；它没有 raw State、setter 或
live Coordinator mutation 权限。Core Agent 仍只返回 semantic receipt。UI/Browser
Agent 可通过独立、可撤销的 presentation capability 读取 application
receipt，且它不进入 core Agent transcript parity。

Application outcome 可以规范化为
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
  input owner 绑定同一 application epoch、target occurrence、topology revision
  与 source publication revision；
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
  owner: "surface-owner.inventory",
  archetype: "workspace_primary",
  input: { context: "inventory", actions: inventoryActionIds },
  focus: { initial: "inventory.first_item", restore: "opener" },
  readiness: "synchronous",
});
```

具体字段名在 focused type prototype 中确定，但下列约束不变：

- 首版优先提供
  `workspace_primary`、`workspace_detail`、`system_dialog`、`narrative`、`confirmation`
  等少量合法 archetype，由 archetype 固化
  layer/cardinality/modality/dismiss/input/focus
  的大部分组合；普通作者不自由拼七八个相关 boolean；
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

- duplicate definition/slot owner/action ID；
- 同一 slot 出现非法 cardinality；
- action 指向不存在或非 active owner；
- modal 无合法业务出口；
- Back 可能穿透不可 dismiss Surface；
- focus target 不存在或 restore owner 已失效；
- managed code 直接注册第二 input owner；
- render publication 与 action publication topology/source revision 不一致；
- stale gesture/ready receipt 被应用；
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
application epoch and topology revision
input/focus owner
active gesture
```

它不得复制生产实现后“自己测试自己”。生成命令至少覆盖：

```text
OpenPrimary / ReplacePrimary / PushDetail / OpenModal
Back / Close / Dismiss
PointerDown / PointerMove / PointerUp / PointerCancel
LoseFocus / ChangeVisibility / AdvanceFrame
Ready / FailReady / Restart / SaveReloadTarget
```

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

| Package                                                     | Target responsibility                                                                                                                                                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@sillymaker/base`                                          | 继续拥有 gameplay State、PendingInteraction/occurrence、Session semantic outcome、application presentation epoch 与共享 `DiagnosticEnvelope`；不拥有 managed topology、focus、modal stack 或 workspace layout                                                      |
| DOM-free `@sillymaker/ui` contracts/authoring/testkit entry | Managed Surface definitions/archetypes、resolved registry、纯 Coordinator/reducer、instance identity、topology publication、transition receipt、invariants 与 model helpers；不得经 UI root barrel 意外加载 CSS/React Host                                         |
| `@sillymaker/ui` React/runtime entry                        | application-instance-local Coordinator host、React renderers/Portal、InputRouter integration、inert/focus/dismiss adapter、publication store，以及只消费 immutable evidence 的 application-receipt composition helper；不拥有 gameplay State 或 durable repository |
| `@sillymaker/web`                                           | DOM focus/inert/pointer-capture/visibility adapter、physical input normalization、独立 Presentation Observation/automation adapter、real-browser conformance                                                                                                       |
| `@sillymaker/tooling`                                       | project inspection、structural checks、model exploration/replay command、human/JSON diagnostics；不得进入 browser bundle                                                                                                                                           |
| UI testkit + existing Base testkit                          | UI testkit 提供 pure model、virtual clock/input、seeded sequences、shrink/replay；Base testkit 继续提供 GameSession/semantic harness，两者通过 public contracts 组合                                                                                               |
| Story/Mod/Application composition                           | domain state/rules、stable Surface target owner 与 typed intent wiring、definitions、renderers、semantic actions、application receipt bridge wiring 和产品级 recovery policy                                                                                       |

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
2. 引入纯 definitions、state model 与 Coordinator，不改变外观；
3. 依次迁移 Overlay、SystemDialog、Narrative/history 与 stage
   interaction，迁移一项就删除它的平行 lifecycle authority；
4. Window model 的“系统单槽、workspace 主窗 + 详情栈、确认层”保留为产品拓扑
   recipe，坐落在统一 lifecycle 上；
5. SillyOS 的自由 MDI store 继续是 Story
   侧产品状态；它只把会影响全局输入/模态的边界登记到
   Coordinator，不把几何、最小化、任务栏和文档内容上提为通用 WindowManager；
6. 完成 Engine Lab whole-canvas 与浏览器验证后，才把 managed path 宣称为 live
   feature。

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
- Headless 与 Browser 需要不同业务 availability 或 transition rules；
- 为了支持 renderer 必须把 DOM/Pixi handle 放进 Base、Snapshot、Save 或 semantic
  publication；
- generated model 与生产 reducer共享同一实现，失去独立 oracle；
- acceptance 只能靠提高模型等级、延长 prompt 或反复 sleep 才通过；
- 实现只是在 OverlaySession、SystemDialogSession、Narrative lifecycle、Story UI
  route state 与 InputRouter 旁新增一个 Coordinator，而没有逐项迁移并删除旧
  authority。

## 15. Acceptance

本设计只有在以下行为全部由 live implementation 和测试证明后才算完成：

1. 一个 whole-canvas Engine Lab route 覆盖
   home/status/storage/specimen-catalog、detail、modal 与
   Back，页面互斥和真实激活顺序由 Coordinator 唯一决定；
2. publication 原子包含 render/action/input/focus/lifecycle，renderer
   不旁读第二状态；
3. pointer-down → replace → pointer-up、focus loss、visibility change、async
   readiness、restart/HMR 的 stale 回调全部被 instance/topology-revision/epoch
   fence 拒绝（physical gesture 另有 InputRouter token fence）；
4. input、Surface transition、semantic/workspace dispatch 保持分层
   receipt；端到端 application action 只有在对应 postcondition 成立时才返回
   `applied`；若 domain 已 commit 而 presentation postcondition 失败，返回
   `postcondition_failed` 并保留 committed evidence；
5. structural check、pure model、seeded shrink、frame-aware runtime、browser 和
   prebuilt 各有清晰职责及至少一条故障证明；
6. invalid Story 返回稳定
   code、location、current/attempted/expected/actual、suggestion、minimal trace
   和 replay command；
7. 至少完成一次固定 fresh-baseline 的 capability-floor 战役（协议见 11
   节）并产出归因报告，run 中不修改 engine、不 deep import、不使用 unmanaged
   escape hatch；作者 API 的 stable/AI-friendly
   声明以战役证据为准，后续增量扩大只重跑受影响任务面；
8. 已迁移 subsystem 的旧 lifecycle store/listener/boolean truth
   被删除或有短期、明确的兼容边界；
9. [architecture](../architecture.md)、[features](../features.md)、[story authoring](../story-authoring.md)
   与 public exports 在实现落地时同步更新。
