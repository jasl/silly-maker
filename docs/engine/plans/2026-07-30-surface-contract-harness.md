# Surface Contract Harness execution plan

状态：2026-07-30 接受执行；尚未实现。承接 [roadmap](../roadmap.md) 的 Surface
lifecycle unification continuous
track、[Surface Contract Harness design](../design/surface-contract-harness.md)、[AI-friendly Story authoring](../design/ai-authoring.md)、[E2E engine validation](../design/e2e-engine-validation.md)
与
[window model](../design/window-model.md)。本文规定实施顺序与验收，不使目标设计自动成为
live capability；能力只有在行为测试、Engine Lab 证明和现状文档同步后才进入
`architecture.md` / `features.md`。

## 1. Outcome

把 Overlay、System Dialog、Narrative、History 和 Workspace window
当前分散的生命周期收敛为一条受管理路径：

```text
Story/UI Surface definitions
  -> resolved surface registry
       + domain/workspace source publication
  -> Surface Coordinator reconcile / atomic session transition
  -> immutable Managed Surface Publication
  -> React hosts + Input Router + focus/dismiss adapters
  -> structured action receipt + diagnostics
```

完成后，引擎应同时提供：

- 一套权威的 surface instance / topology revision / layer / modality / focus /
  input / dismiss / readiness 真相；
- 原子、不可撕裂的 presentation publication，renderer 不需要跨多个 store
  猜测当前场景；
- 结构性拒绝 stale handler、旧 topology revision、旧 application epoch 和跨
  surface 残留手势；
- 保留三层结果：input route 的 `consumed / unhandled`、Surface transition 的
  `applied / unchanged / rejected / stale / faulted`、既有 semantic dispatch 的
  `committed / rejected / faulted`；端到端 application receipt
  可以规范化，但不得抹掉分层 evidence；“命令 committed 但 postcondition
  未满足”必须返回 `postcondition_failed` 并保留 committed evidence；
- 静态检查、运行时 model explorer、最小化失败 trace 和真实浏览器输入证明；
- 一条对人类和较弱模型都窄、可发现、默认安全、可由机器诊断修正的 Managed Surface
  authoring path。

这里追求的是 **single lifecycle authority，不是 single persistence
store**。Gameplay State、Narrative semantic target、对话/工作区文档和 Host
偏好仍各归其现有 owner；Coordinator 只拥有当前 application instance 内的
presentation lifecycle。它不得从 DOM、画布、z-index 或 React
局部状态反推业务事实。

## 2. Package ownership

| Owner                 | 新职责                                                                                                                                                                                                                                             | 不得承担                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `@sillymaker/base`    | 保持既有 semantic outcome、PendingInteraction occurrence、application epoch、共享 diagnostic 与 transaction atomicity；只有已被 Session/Agent 共用的非 UI 合同才留在这里                                                                           | React、DOM、focus、pointer、surface definition/stack、browser readiness  |
| `@sillymaker/ui`      | DOM-free contracts/authoring/testkit 子入口拥有 definition、registry、纯 Coordinator 与 Surface receipt；React/runtime 入口拥有 host、publication、managed routing lease、focus/modality/dismiss/readiness 集成和只读 evidence receipt composition | Gameplay rule、Save backend、DOM/browser singleton、Story-specific route |
| `@sillymaker/web`     | 浏览器事件与 Managed Surface action 的适配；physical pointer sequence/capture、focus/visibility/element hit observation；独立 Presentation Observation 与 automation；真实输入 conformance                                                         | 另一份 surface registry、按 DOM 可见性决定 authority、玩法 availability  |
| `@sillymaker/tooling` | project-level surface check/inspect、machine-readable diagnostics、seeded model explorer、failure shrink 和 CLI formatting                                                                                                                         | 浏览器 runtime、React component、修改 Story State                        |
| `e2e` / Engine Lab    | 只经 package exports 消费上述合同；提供 neutral whole-canvas、nested modal、async readiness 和真实输入 scenario                                                                                                                                    | 引擎特殊分支、产品玩法模板、复制第三方 UI                                |
| Story packages        | 声明 surface、提供 renderer、拥有或连接 stable target 的 domain/workspace owner、发送 typed intents，并组合 application receipt bridge                                                                                                             | 自建第二套 input/focus/modality authority；直接写 Gameplay State         |

若某个类型仅被 UI lifecycle 使用，它留在
`@sillymaker/ui`，不得为了“让类型看起来通用”下沉 Base。若行动结果已是
`SemanticGamePort` 的公共语义，则扩充既有 Base envelope，而不是在 UI
创建同义结果。

### Relationship to the other production-floor tracks

- **Snapshot integrity/performance** 仍优化 authoritative gameplay commit，与 UI
  lifecycle 是独立工作流；Surface publication 可以消费 revision/digest
  evidence，但不能要求每次 UI transition 重算完整 gameplay Snapshot。
- **Save migration** 迁移 gameplay Snapshot，包括其中由 Story schema 拥有的
  stable semantic target。独立 conversation/workspace target 不属于这条
  migration path。Surface runtime instance、focus、pointer capture、readiness 和
  topology revision 不进入 migration registry；P4 只验证 load 后由稳定 target
  创建新 instance。
- **Content Platform / UI Artifact** 提供经过验证的 immutable content/artifact
  ID 与 revision；Coordinator 只持有当前 view 的稳定引用，不成为 Runtime ORM 或
  artifact database。
- **Mod composition** 的 UI surface contribution merge 要等 P1 registry 与 P2
  lifecycle 形状稳定；GameplayModule/content 等无 Surface 前置的 facet
  不需要等待本计划全部完成。
- **Pixi 或其他 renderer adapter** 位于 immutable publication 之后。它可以改善
  whole-stage 绘制与资源性能，但既不是解决多权威的前置，也不得拥有另一套
  input/back 状态机。

## 3. Execution order and TDD discipline

P0–P5 严格按序推进。每个阶段使用同一循环：

1. 先写能从公开行为观察到的 failing test，记录它证明的当前裂缝；
2. 实现最小合同，使 focused test 通过；
3. 增加边界/property/model tests，删除被替代的旧 authority；
4. 运行受影响 package tests，再扩大到 `deno task test` /
   `deno task check`；浏览器行为受影响时运行相应 Engine Lab E2E；
5. 只有该阶段 acceptance 全部通过，才进入下一阶段。

不得用一次性 fixture、完整对象 golden、固定文件清单或 sleep 掩盖 lifecycle
race。允许保存短小、有名字的 action sequence；随机探索失败必须 shrink
为最小、可读、可复现的 sequence。

## 4. P0 — Prove current tearing and stabilize source publications

**目标：** 在定义任何 Managed Surface instance、topology revision、transition
receipt 或 readiness contract 之前，先用现有公开合同证明裂缝，并收紧 Coordinator
将要消费的 source publication。P0 不创建临时 Surface store，也不把未来身份塞进
legacy Overlay/System/Narrative 状态。

### P0.1 Current-behavior red tests

- 构造“semantic command 已 committed，但可见 target/action/input gate
  未一致推进” 的公开失败，证明当前 committed-no-visible-effect 或 frame
  tearing；若该撕裂在现有公开组合上确实无法复现，以 documented non-reproduction
  记录（说明公开面为何观察不到），并把该不变量的证明义务移交 P1
  纯模型层，不得为凑红测试而改用内部观察；
- 同一 `PendingInteraction` 未发生语义推进时，普通 tick 不得重造 occurrence
  identity；先给出一个当前确实失败的可复现场景，查证后并不失败则标注为回归
  护栏而非裂缝证明；
- `pointerdown` 后、`pointerup` 之前发生 unmount/replace，随后到来的
  `pointerup`/browser `click` 不得命中新的底层 owner。已落地的
  `armStagePointerGestureFenceV1`（commit aacc741，真实浏览器证明见
  87540ca）只覆盖“pointerup 时已解决 dismiss、由调用方手动 arm”的路径，且
  唯一消费者是 Engine Lab narrative UI；红测试聚焦未布防路径：overlay/system
  关闭、未 arm fence 的 stage 替换、visibility/focus loss 与 application
  dispose；
- system dialog 在依赖能力（如 saves）未配置时的 store/render 真相分叉（store
  保持 active 而渲染消隐）必须可公开观察并被拒绝；此前已修复 的“不可见 input
  lock”场景（system-dialog-host
  渲染谓词跟随实际渲染面）保留为回归护栏，不再作为裂缝证明。

这些测试只使用当前 public API 与黑盒观察面；不得预写未来 Coordinator
类型来让测试“先绿”。

### P0.2 Existing atomic prerequisites

- source owner 原子发布 immutable semantic/workspace vector；现有 presentation
  projector 对同一 dispatch 只读取一个 source revision，不从多个 live store
  side-read；
- application epoch 继续 fence load/import/restart/rollback/HMR successor；
- `PendingInteraction.occurrenceId` 在语义 occurrence 未变化时保持稳定；
- 现有 Web input path 固化 physical gesture token/cancel fence，覆盖
  unmount、visibility loss、focus loss 与 application dispose；
- web 层 gesture token fence 落地后必须吸收并删除既有的
  `armStagePointerGestureFenceV1` 局部防护（其唯一消费者随之迁移），不长期
  保留两套 click-through 机制；
- 只修复可独立成立的现有 publication/gesture 缺陷，不在 P0 引入 managed
  instance、topology revision、Surface receipt 或 readiness acknowledgment。

**P0 acceptance：**

- 上述失败都有可读的 focused regression，必要的 source-publication/gesture
  修复后变绿；
- application epoch、source publication revision、semantic occurrence 与
  physical gesture identity 的职责互不冒充；
- legacy store 没有新增平行 revision counter、Surface identity 或临时 receipt；
- 现有 semantic action、stage transition、pointer gesture 与全仓检查保持绿色。

### P0.3 Field counterexamples (dense picture / overlay SLG)

一次本地的高密度图片/overlay SLG 移植验证（仓外临时项目，验证结束即销毁，
不进主仓，也不得成为任何验收依赖）已经复现并分类了一批「打地鼠」失败。
它们是 P1–P3 acceptance 应能机械拒绝的裂缝类别，必须在主仓 clean-room
重建，而不是引用该项目：

| 失败类                            | 现象                                                          | Harness 应对                                                            |
| --------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| stale publication / 旧 hit        | 热区闭包带着过期 revision，首次成功后全 UI `reject`           | topology/source revision fencing；gesture 不得携带过期 surface identity |
| armed inert chrome                | modal 下底层 base chrome 仍可 dispatch，偷走 dismiss/空白点击 | modality + published hit set；非 owner 默认 consume，不得旁路           |
| published invisible / parked peek | 离屏或 opacity=0 元素仍挂 hit，抢走底层入口                   | publication 与可见/可命中证据同 revision；不可见元素不得武装            |
| full-sheet dismiss thief          | 全屏 sheet 绑 dismiss action，抢走内容格/缩略图点击           | dismiss 必须声明；全屏 backdrop ≠ 内容热区                              |
| missing dismiss / busy trap       | overlay 打开后无合法出口，或误触 narrative 后全部 `busy`      | modal 必须有业务出口；Back/Esc 单点 dismiss policy                      |
| multi-overlay stack tear          | 多个 open 信号并存时 hit/ownership 撕裂                       | cardinality + topology；非法组合进 conflicts / reject                   |

Clean-room 重建路径（在各阶段落地，不新增独立阶段）：

- Engine Lab（`e2e/`）为每个类别提供中性 fixture：一个 base scene chrome +
  若干互斥 modal surface + 停泊/半透明诱饵元素，P1–P3 的合同测试与
  browser scenario 直接以它们为验收对象；
- cat-cafe 作为 curated showcase 刻意加入同类场景（重叠 hit 的底部
  chrome、全屏详情页、可停泊的侧栏），证明声明式路径在真实 Story
  中不需要逐场景补丁；showcase 玩法本身是否按更完整的 SLG 剧本重设计，
  是独立的产品决策，不属于本计划的 gate。

外部 Story 可以用同词汇的声明表做迁移前前置，但不得自建第二套
input/focus/modality authority。

## 5. P1 — Surface definitions and the single Coordinator

**目标：** 在 `@sillymaker/ui` 建立 Host-neutral 的纯生命周期核心，再接
React/Input adapter；不直接从现有组件的 DOM 行为抽象 API。

### P1.1 Definition and resolution

- `ManagedSurfaceDefinition` 至少声明 stable definition
  ID、owner、slot/layer、modality、dismiss policy、focus policy、input
  context、readiness policy、renderer/contribution ID 与合法 transition。
- registry resolution 对 duplicate ID/owner、未知 layer/slot、矛盾
  modality、缺失 renderer、不可满足 initial focus、非法 dismiss/input 组合 hard
  fail，并产生共享 `DiagnosticEnvelopeV1`。
- layer order 只有一个有序 descriptor；类型、runtime order 与 token check
  从它派生。
- Story authoring 使用 builder/default preset 完成常见
  `workspace_primary`、`workspace_detail`、`system_dialog`、`narrative`、`confirmation`
  archetype（集合与命名以 design 的 AI-friendly authoring path 一章为准）；低层
  escape hatch 显式标为 unmanaged，运行时与 tooling 均能识别。

### P1.2 Coordinator state machine

- stable target 只有 domain/workspace owner 可写：UI 发送 typed
  intent，Coordinator 等待新的 source publication 后 reconcile；Coordinator 直接
  open/replace/close 的只有显式 transient target；
- stable target 必须携带 owner 生成的 `targetOccurrenceId`：同一 occurrence
  跨无关 source revision 保持 instance，close 后同参数 reopen 使用新 ID；同一
  occurrence ID 改参数或在 application epoch 内复用均拒绝；
- 每次打开生成稳定 instance ID 与单调 topology revision；同 definition 的
  replace 不复用前一 instance 的局部生命周期。
- stable target 提供明确的 `requestOpen` / `requestReplace` / `requestClose`
  intent；transient target 提供 `openTransientPrimary` /
  `replaceTransientPrimary` / `pushTransientDetail` / `openTransientModal` /
  `closeExpected` 等 operation。`closeExpected` 由 handle 自动绑定
  instance/topology revision，作者不手写 revision；不提供会根据隐含当前状态改变
  含义的 `toggle`。
- 一次 transition 原子更新 active topology、topmost/modal owner、input routing
  lease、focus target/restore target、dismiss target、readiness 与 z-order
  publication。
- 保留产品槽位语义：一个 system dialog；一个 workspace primary + detail
  stack；Narrative/history 有明确层级。不把它扩成自由 MDI。
- focus loss、pointer cancel、visibility change、unmount 和 application dispose
  都进入同一状态机，不由各组件私自清理一半状态。

### P1.3 Layered receipts and readiness

- Input route 只回答 `consumed / unhandled` 与 winning owner；Surface transition
  返回 `applied / unchanged / rejected / stale / faulted`；Semantic dispatch
  保留 `committed / rejected / faulted`；
- application-composition bridge 只从 immutable before/after semantic/workspace
  publications、各层 receipts 与 Managed Surface Publication 组合可选
  `ApplicationActionReceipt`；它不获得 raw State、setter 或 live Coordinator
  mutation；
- semantic 已 `committed` 但声明的 presentation postcondition
  失败时，application outcome 为结构化 `postcondition_failed`，并保留 committed
  evidence，不虚构 rollback；
- receipt 携带稳定 action/owner、source publication revision、application
  epoch、适用的 instance/topology revision、reason code 与 postcondition
  evidence；target occurrence 经对应 publication 反查，不进入 receipt
  字段；message 不作为机器判断依据；
- async renderer readiness 只能 acknowledge 当前 instance/topology
  revision；超时、失败或 stale acknowledgment 按 definition policy
  回退并返回稳定 receipt；
- Core Agent 仍只返回 semantic receipt；application receipt 只经独立
  presentation capability 暴露，不进入 core Agent transcript parity。

### P1.4 Renderer and input boundary

- React host 只渲染 immutable Managed Surface Publication 并发送带
  instance/topology revision 的 intents；
- 组件局部状态可保存动画、hover、scroll 等 transient，但不得决定 surface 是否
  active、谁阻塞输入或 back 应关闭谁；
- InputRouter/Web adapter 拥有 physical normalization、gesture lifecycle 和真实
  pointer capture；Coordinator 只授予 managed routing lease，不接管纯 HUD/Stage
  input owner；
- Managed Surface input envelope 使用 design 定义的 canonical
  envelope（epoch、instance/topology revision、action、gesture、input
  publication revision；target occurrence 只在 reconcile/publication
  层出现）；非 Surface envelope 携带
  `inputOwnerId + sourcePublicationRevision`，并在适用时携带 semantic
  occurrence，不伪造 Surface identity。

**P1 acceptance：**

- Coordinator 纯状态机具有 table/property tests，覆盖
  open/replace/detail/back/locked modal/dispose；
- registry 的错误能一次收集多个稳定 diagnostic，含 subject、JSON
  pointer/location、`docsId`、suggestion；
- stable target 的 domain/workspace commit 与 Coordinator reconcile 由 source
  revision 因果关联，但没有伪装成跨 owner 原子事务；
- unchanged/replaced/reopened target occurrence 的 instance 行为有公开测试，不以
  任意 source revision 或参数相等猜测 remount；
- input、Surface、semantic/workspace 与 application receipts 的成功词汇不互相
  覆盖，`postcondition_failed` 保留实际已提交的证据；
- Input Router 的 registration 与 action trace 可指出
  owner/context/consumption；
- 同一个已接入 Managed path 的 Surface family 不存在同时可写的 legacy 与新
  coordinator；尚未迁移的 family 在 P2 前仍由原 owner 管理，不能提前双写。

## 6. P2 — Migrate Overlay, System, and Narrative

**目标：** 用 Managed Surface 路径替换现有并行
authority；迁移完成才允许删除兼容胶水，不长期维护双轨。

迁移顺序：

1. **Workspace Overlay**：把现有 `openPrimary` / detail stack 迁为
   `openTransientPrimary` / `replaceTransientPrimary` /
   `pushTransientDetail`；若产品需要跨 restart 恢复，再由 workspace stable
   target owner + typed intent 驱动；统一 target occurrence、fresh runtime
   instance、Escape/backdrop/routed cancel 与 focus restore；
2. **System Dialog**：settings/save availability 在 open 前验证；store active 与
   renderer active 不再分叉；title/front-door surface 接入同一 topmost/modality
   计算；
3. **Narrative**：分离 player controller、view 与 managed narrative
   host；`VnLayerV1` / `DialoguePanelV1` 不再各自维护 input isolation；History
   变为真实 managed surface，而非面板内绝对定位视觉层；
4. **Custom shell path**：允许 Story 替换外观和布局，但必须消费同一
   publication/intent；确需 unmanaged 时显式声明并得到 inspect warning。

体量与拆分现实：四族现有 lifecycle 代码约 2,900–3,500 行（视是否计入 shell
接线与样式文件）、相关测试约 3,000 行，至少 6
处消费者接线；每族迁移必须再拆成可独立合并的
slice，并在阶段开始时登记各族行为清单。`VnLayerV1` 当前没有生产消费者：narrative
族以 DialoguePanel/managed narrative host 路径为准，`VnLayerV1`
直接折叠删除而不做等价迁移。过渡期跨族 topmost/modality
仲裁按迁移顺序显式文档化：已迁移族经 Coordinator，未迁移族保持 legacy
排序，两者的相对顺序由现有单一 layer descriptor 固定；该混合状态只允许存在于 P2
内部，不得进入任何 live 文档声明。

每迁移一类，先将其既有 browser/unit behavior 变成黑盒 contract tests，再改
host，最后删除该类旧 session store/hook/key/isolation writer。不得以 adapter
双写新旧 store 作为阶段完成。

**P2 acceptance：**

- Escape、right-click cancel、backdrop、keyboard/gamepad cancel 对同一 dismiss
  policy 得到相同 receipt；
- `dismissible: false` 的物理 cancel 始终由当前 input owner `consumed`
  且不穿透；直接 transition request 返回稳定 `rejected/unchanged`；
- 同 kind replace 不保留旧 instance-local state，不接受旧 handler；
- 不可用 system surface 在 open 时返回稳定 rejection，不产生隐形 input lock；
- Overlay、System、Narrative、History 的 active/focus/input/z-order 可从一个
  Managed Surface Publication 解释；
- `architecture.md` / `features.md` 只在迁移与替代删除完成后更新为 live
  contract。

## 7. P3 — Tooling, static checks, and model explorer

**目标：**
让模型在运行游戏前发现结构错误，在出现组合竞态时得到可缩减、可直接修复的证据。

### P3.1 Check and inspect

为 `@sillymaker/tooling` 增加 Story-independent surface
检查与检查输出（最终命令名可沿现有 `story check` / `story inspect` 收敛）：

- duplicate definition/slot contribution、未知 renderer/action/input context；
- 模态 surface 无 focus target、locked surface 无显式完成路径；
- workspace detail 无合法 parent、back transition 不闭合；
- managed 与 unmanaged surface 对同一 slot/input context 争用；
- Story renderer deep import、直接操作 internal store、手写 raw z-index/layer
  order；
- resolved registry、slot policy、owner、action、focus 与 diagnostics 的 JSON
  inspection。

每个 diagnostic 必须包含稳定 code、phase、subject、location/JSON pointer、当前
lifecycle 向量、attempted transition、被破坏 invariant、`docsId` 与合法修复
suggestion。普通错误不得要求模型解析 stack trace 或自由文本。`docsId`
需要一份可解析的目标合同（docsId → 文档锚点/quickstart 小节），并在本阶段为全部
surface diagnostics 赋值；P5.1 任务 4 以它为承重结构，不得留空。

### P3.2 Model explorer

- 在 UI testkit/tooling 上构建 deterministic seeded explorer，生成
  open/replace/pushDetail/back/dismiss/action/readiness/focus-loss/pointer-cancel/visibility/epoch-change
  序列；
- 每一步检查 topology 唯一、topmost 与 input owner 一致、focus 可恢复、无 orphan
  readiness、stale action 不 applied、dispose 后无 live owner；
- 失败自动 shrink 到最短序列，并输出 human + JSON trace；trace 记录
  seed、前态、action、receipt、后态和 violated invariant；
- 支持 Story-defined model states/postconditions，但 explorer 不执行任意
  eval，也不获得 gameplay State setter。

**P3 acceptance：**

- 预置 invalid projects/definitions 各自返回精确稳定 code；修复后同一检查消失；
- seeded run 可复现，shrink 结果仍失败且不依赖 wall clock；
- explorer 能捕获至少一项仅靠每个 store 的单体测试无法发现的组合错误；
- CLI/JSON 输出不泄露 renderer handle、DOM 或未界定的原始 State。

## 8. P4 — Engine Lab whole-canvas and real-browser conformance

**目标：**
以中性第二消费者证明“整张画布切换”与叠层输入，而不是用某个具体游戏的组件偶然通过。

Engine Lab 增加一组 synthetic whole-canvas surfaces：

- Lab home；
- mutually exclusive status / storage / specimen-catalog primary surfaces；
- primary 上的 item/detail stack；
- locked confirmation modal；
- 有可控 delayed readiness 的 surface；
- Narrative / History 与 workspace/system 交错。

它们只使用 Engine Lab 自有中性文字和 code-native
图形，不复制任何商业游戏的布局、素材、命名或数据。

### Browser scenario matrix

- home → status → storage → catalog 的连续 replace，back topology
  与产品槽位政策一致；
- primary → detail → locked confirm，Escape/backdrop/right-click/gamepad cancel
  的消费和恢复；
- surface 打开后的第一个 pointer action、打开期间键盘 focus、关闭后的 focus
  restore；
- `pointerdown` 落在关闭控件，`pointerup` 触发 replace/unmount，随后 browser
  `click` 位于底层可操作区域：底层 action 不得 applied；
- delayed readiness 在 replace/load/HMR 后完成：旧 topology revision
  acknowledgment 被拒绝；
- semantic publication 与 surface target 同帧变化：DOM 只能显示合法旧
  publication 或合法新 publication；
- visibility change、pointer cancel、focus loss、reduced motion、touch、keyboard
  与 gamepad；
- Browser Agent observe/dispatch receipt 与用户输入最终 semantic outcome
  一致，同时 presentation-only observation 不污染 core Agent transcript parity。

专门的真实输入 conformance 可用由 surface 定义命名的 logical hit point、DOM role
或 `elementFromPoint` 验证 paint/hit order；不得依赖偶然屏幕绝对坐标、截图像素或
sleep。测试等待 publication revision、surface topology
revision、readiness/settled signal 或明确 timeout。

**P4 acceptance：**

- focused UI/Web tests、Engine Lab headless/browser tests 与 prebuilt smoke
  通过；
- Chromium 与 WebKit 至少执行 pointer + keyboard 主路线，touch/gamepad
  使用明确可达 project/tag；
- 随机 model trace 中的失败可转成 named browser regression；可归因于 Coordinator
  invariant 的浏览器失败必须回落为最小 model trace。仅在真实 DOM/CSS
  hit-test、layout、focus 或 pointer-capture adapter 中出现的失败，则保留稳定
  browser action trace、publication vector 与 DOM/hit/focus evidence，不伪造纯
  Coordinator 反例；
- Engine Lab 无 engine deep import、无特殊 runtime branch、无产品/参考资料依赖。

## 9. P5 — Weak-model authoring canary and capability floor

**目标：**
不以“强模型能读完内部实现并打补丁”为成功；证明较弱模型只凭公开作者面、手册和结构化诊断就能生产正确代码。

### P5.1 Fresh-baseline tasks

从固定、干净、只含公开 imports 的 fresh Story baseline 重复执行：

1. 新增一个 whole-canvas managed primary surface，经 semantic action
   打开并可正确 back；
2. 新增第二个互斥 primary 与一个 detail，证明 replace、focus restore 和 stale
   handler fencing；
3. 新增 locked confirmation 与 delayed readiness，覆盖 input `consumed` 与
   Surface transition `rejected/stale` receipt；
4. 修复一组故意植入的 duplicate slot、missing focus、unmanaged input
   conflict，只依据 JSON diagnostics 和 `docsId`。

约束：

- `engine/**` edits = 0；
- deep imports、PoC/reference imports、internal store access = 0；
- root Vite/build 实现 edits = 0；只允许统一 project config declaration；
- 不允许手写第二套 history/input/focus/z-index manager；
- 最终 `story check`、headless model run、browser route、build 与 prebuilt smoke
  全部通过。

### P5.2 Evaluation protocol

capability-floor 以冻结点战役（per-freeze campaign）执行，协议与 design 的
capability-floor 一章保持一致：

- 每次战役固定记录模型/版本、prompt、baseline
  commit、可见文档边界、工具权限、运行日期与诊断修复轮次；不承诺托管 LLM API 的
  seed 复现，确定性由 contract tests 保证；
- discovery run 可暴露作者面缺口并修改 engine helper/diagnostic；修改后冻结
  candidate contract，从原 fresh baseline 重跑受影响任务；
- candidate authoring API promotion 前执行至少 5 次隔离 acceptance
  run，报告无人类代码编辑的完成率区间与中位修复轮次，并与上一冻结版本对比；
  promotion 判据是“归因于 API discoverability、diagnostic quality 或 missing
  default 的失败为零（或已修复并重跑受影响任务）”，不是单一 N 取 M 硬门槛；
  允许模型根据结构化诊断自行修复；
- 首次 passing check 前读取文件数、尝试次数、诊断往返、逃逸到内部 API
  的次数与最终自定义 glue 行数作为趋势指标；
- 冻结后作者面增量扩大时，只对新增/受影响任务面重跑战役，不整套重置；
- 模型 eval 不进入每次提交的 CI gate；冻结后的 deterministic
  contract/model/browser tests 才是日常硬 gate。capability-floor
  战役未完成前，Managed Surface 作者 API 不得宣称稳定或 AI-friendly。

**P5 acceptance：**

- capability-floor 结果与失败分类有版本化报告，失败可映射到 API
  discoverability、diagnostic quality、missing default 或真实 model limitation；
- 至少一项 canary 故障通过改进公共合同/诊断解决，而不是给 prompt
  塞入内部实现答案；
- 使用更强模型不能替代 capability-floor gate；
- `authoring-quickstart.md` 与相关网站文档只描述已验证的 golden path 和 escape
  hatch 边界。

## 10. Global acceptance

本计划完成需要同时满足：

1. 所有影响输入/焦点的受管 surface 由一个 Coordinator publication 解释；
2. application epoch、surface instance/topology revision 与 physical gesture
   均可 fencing stale work；
3. input、Surface transition、semantic/workspace dispatch 与 application receipt
   在 UI、Browser Agent 与 tests 中不互相冒充，端到端 `applied` 有明确
   postcondition evidence，`postcondition_failed` 不隐藏已经 committed 的 domain
   effect；
4. Overlay、System、Narrative、History 不再维护平行 writable lifecycle
   authority；
5. static check + deterministic explorer + real-browser scenario 共同覆盖
   contract；
6. 至少一次 weak-model fresh-baseline 战役完成并产出归因报告（run 中无 engine
   edits/deep imports/Story 私有通用胶水）；作者 API 的 stable/AI-friendly
   声明以该证据为准，后续增量扩大只重跑受影响任务面；
7. `deno task test`、`deno task check` 与受影响的 `deno task test:e2e`
   全部通过；
8. public exports、architecture/features/development/authoring docs
   与实现同步，被替代 API 有迁移或删除记录；
9. 新代码、测试、生成物和 Artifact 不依赖 `tmp/**`、`references/**`
   或本地未发布复刻；研究输入只提供抽象需求证据，不能成为 build/test fixture。

## 11. Explicit non-goals

本计划不实现：

- Runtime ORM、通用数据库客户端、全局 mutable store 或第二份 Gameplay State；
- 自由 MDI WindowManager、拖拽/最大化/任务栏/窗口几何持久化；
- 把 renderer、DOM、focus、animation progress 或 surface instance 写入 gameplay
  Save；
- 为非游戏 Agent 产品强制 Save；会话、文档、工作区布局等持久化由各自产品 owner
  另定合同；
- 新的 UI DSL、低代码解释器、runtime eval 或“不可信 Mod”沙箱；
- Phaser/Pixi/DOM renderer 选型或通用 scene tree；
- 复刻某个商业游戏的界面、素材、内容、数据格式或业务规则；
- 只针对一次 pointer click-through 打补丁而保留其余分叉 authority。

## 12. Stop conditions

出现以下任一情况，暂停实现，先修订目标 design 并解释取舍：

- Coordinator 必须读取或写入 Gameplay State 才能决定基本 lifecycle；
- Base 为了 Surface 导入 React、DOM、browser 或 UI package；
- React/DOM 可见性、z-index 或 focus 被当成 active topology 的权威输入；
- 同一 surface 类需要新旧 store 双写超过迁移阶段，且无法明确删除旧 owner；
- stale async callback / Surface handler 无法凭
  `epoch + instance/topology revision` 拒绝，或 physical gesture 无法在适用的
  Surface fence 之外再凭 InputRouter-owned `gestureId/token` 拒绝；
- Headless 必须模拟 CSS、DOM focus 或动画 frame 才能判断 gameplay outcome；
- 常见 surface 需要作者手写 revision counter、gesture fence、focus trap 或 input
  isolation；
- diagnostics 只能通过 exception message/stack 定位，或者 suggestion 引导 deep
  import/内部 store；
- Engine Lab 需要 special-case engine branch，或 browser test 只能靠
  sleep/偶然坐标稳定；
- capability-floor 模型必须修改 engine、复制内部实现或绕过 Managed Surface
  contract 才能通过；
- 新测试或实现需要从 `tmp/**` / `references/**` 复制代码、素材、布局或 fixture；
- 实施发现当前 live architecture 与已接受设计冲突；task plan 不得静默覆盖
  design。

## 13. Promotion record

每个阶段结束时在实施提交或后续计划中记录：

- red test / reproduced trace；
- 新增或改变的 public contract；
- 被删除的 parallel authority；
- focused、aggregate、browser verification 命令；
- Engine Lab 与 weak-model evidence；
- 尚未满足的 defer 或 stop condition。

P0–P4 证明 runtime 与 harness；P5 证明作者面。两类证据缺一，Surface Contract
Harness 都不得标记完成。
