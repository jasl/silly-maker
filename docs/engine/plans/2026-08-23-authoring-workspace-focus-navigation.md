# Authoring Workspace Focus & Navigation V1 实施计划

状态：**2026-08-23 开启并关闭，M0–M2 已交付；无自动后继项**。Application Runtime AR0–AR6 关闭后，所有者
指示继续下一项引擎工作；对 live source、现有消费者与 accepted Authoring Host 合同的复查
选择本车道。[Production-floor sequence](2026-07-30-production-floor-sequence.md) 仍是唯一
跨计划排序入口；本计划只拥有 Authoring Host 的 workspace focus/navigation、两个真实 shell
消费者与验收。

目标合同已在
[统一创作架构](../design/authoring-architecture.md) 固定：Authoring Host 统一拥有项目导航、
selection 与 workspace lifetime，各 workspace 只拥有领域表示和领域编辑命令。本车道不新增
公共 authoring ABI，只补齐 live Host 尚未实现的 workspace focus 第一刀。

## 1. 证据与排序

live `AuthoringWorkspaceManifestInternalV1` 已有 closed、build-known 的
`scene | motion | regions | chrome | flow` 集合，以及 resident/progressive 与 readiness 元数据；
但 `StudioAppWithAuthoringSessionsV1` 仍把 Scene、Motion、Regions、Chrome、Flow 依次纵向渲染
在同一长页面。embedded shell 只是全屏滚动容器。继续增加编辑能力会扩大一个没有真实 workspace
focus 的页面，而不是扩展统一 Authoring Host。

live Host 已拥有 Scene/Regions/Chrome 文档会话、Motion store、Flow activation、dirty-close
participants 与 standalone/embedded lifetime，却没有 active workspace。当前 `studio-app.tsx` 已超过
1,300 行，测试也超过 1,800 行；本车道以减少同时可见表面和明确 owner 为目标，不以重排文件、
统一所有 editor state 或建立 shell framework 为目标。

复查同时发现，普通 Browser 产品 R2 尚无已证明的 authoritative state continuity，不能仅靠现有
tooling 接线直接推广：现有 `PersistenceRebootstrapDisposalV1` 只移交 lease fence，successor 取得
disposition 后还会跳过 `resumeFromAutosave`。这需要单独裁决 cross-Session continuity、Save
compatibility 与 candidate classification，不能作为 Vite 接线细节暗补。
该 defer 不是本车道的前置 gate 或交付物，本车道也不修补该 handoff；Deno Desktop stable
revalidation 同样只 gate Desktop HMR。

## 2. V1 合同

- Authoring Host 在创建时接收 manifest 并冻结 workspace contract/signature，拥有一个
  `activeWorkspaceId`（初始 `scene`）与 visited set（初始只含 `scene`）；只允许该 manifest 中实际
  可用的 closed workspace。signature 精确覆盖 workspace id、activation 与 readiness；label 仍可随
  presentation candidate 更新。兼容 Authoring R1 必须保持 signature，不兼容 candidate 在 probe/
  visible cutover 前拒绝，不能静默回退 Scene、删 visited 或卸载 dirty workspace。通过 signature 的
  candidate 可提供新 label 文案；Host 不把 label 当 lifecycle identity。
- Host 同时拥有一个由 closed manifest 有界的 visited set。首次聚焦后 workspace 可以保持 mounted
  但隐藏，使 component-local view state、dirty participant、undo/redo 与未保存草稿不因切换丢失；
  最多五项，不形成无界 keep-alive cache。
- focus 只改变 authoring navigation。切换不得隐式 save、discard、reload、重开文档或改写 source；
  gameplay State、Save、digest、CommandLog 与 replay 字节不变。
- 同一 Host lifetime 内的 visible surface、embedded 隐藏/重开、probe 与兼容 Authoring R1 successor
  观察同一 active workspace。standalone 与 embedded 的独立 mount 各有自己的 Host、均从 Scene
  开始，不声称跨 mount 共享内存 focus；新 Host/R3 replacement 也重置。不写 localStorage、project
  文件或 Save。
- visible Authoring surface 是唯一 workspace-focus transition owner。visited 只能由一次成功的 visible
  用户 focus transition 同步扩张；render/effect/probe/snapshot read 都不能“确保访问”。R1 probe 只
  渲染 visible 已激活的 active workspace 做 layout/connected acknowledgement，不能切换、打开文档、
  扩张 visited、首次激活 progressive workspace 或注册 close participant。Agent companion 继续拥有
  自己的 session/run/cancel transition，始终在 rail 外。
- closed manifest 驱动一个 `<nav>` + 原生 button rail（选中项用 `aria-current`）与具名 panel；不采用
  需要额外 roving-focus/Arrow/Home/End 合同的 ARIA tabs。任一时刻只有一个 panel 对用户可见；
  visited inactive panel 可以留在 connected React tree，但必须 `hidden`/inert 且不进入 focus/accessibility
  tree。workspace button 显示 selected 状态；隐藏 workspace 的 dirty 状态必须可见，Host 总 dirty 与
  close save/discard/cancel gate 继续聚合所有已访问 workspace。
- resident sessions 继续由 Host 拥有。首次 visible Flow tab 操作显式编排 `focus(flow)` 与现有
  single-flight `open()`；Host focus 本身和 `active === flow` effect 都不得启动 loader。loading 时切走
  不取消 single-flight；失败后只有 visible retry button 调 `retry()`；ready 后切换、probe、hide/reopen
  都不重复 load。失败/retry 只影响 Flow panel，不重建 sibling，也不把 Flow 变成常驻 entry。
- workspace 内部 selection 仍归各自领域实现；本车道不假装已经统一 scene tag、cue、motion、region、
  chrome item 与 flow node 的 typed cross-workspace target。未来“从运行时对象跳到编辑目标”需第二个
  真实 consumer 后另开窄切片。

## 3. 里程碑

### M0 — Host-owned focus state（2026-08-23 delivered）

- 在 `@sillymaker/studio` package-private core 中加入 closed workspace focus owner；manifest 消费同一
  workspace-id 定义，不复制 union，也不新增公共 export。
- Host snapshot 暴露 frozen workspace id/order/signature、active/visited 与按 workspace 聚合的 dirty
  状态；
  Scene/Regions/Chrome dirty 读 Host-owned session，Motion 读稳定 close participant，Flow 为 false。
  现有 close participant id 收紧到 closed workspace id。admission 发生在 manifest/visible rail 一次，
  Host 内部信任 typed id，不增加 descriptor、brand、token 或重复 validation。
- focused tests 固定：默认 Scene、有效切换、重复选择幂等、visited 有界、dirty aggregation、dispose
  后无 mutation/revision publish；新 Host 重置，原 Host hide/reopen 不重置；R1 candidate 的 signature
  不兼容在改动 active/visited/dirty 前拒绝。

交付记录：Host 现已冻结同一 manifest 派生的有序 workspace id/signature，拥有 session-local
active/visited 与单一 dirty authority；Scene/Regions/Chrome 只读 Host session，Motion 只读其 close
participant，Flow 固定 clean。standalone/embedded publication 传递同一 candidate manifest，结构不兼容
的 R1 在 IO owner、companion、viewId 与 React probe mutation 前拒绝。focused Host/publication tests 与
全量 `deno task check`（361 files / 5561 tests）通过；M0 尚未渲染 rail 或改变 workspace 可见性。

### M1 — 一个 rail，一个可见 workspace（2026-08-23 delivered）

- `AuthoringHostSurfaceInternalV1`/Studio shell 渲染 accessible nav/button rail 与具名 panel，顺序与
  label 只来自 manifest；button/panel DOM id 包含 `viewId`，避免 connected probe 与 visible surface
  重复 id。standalone 与 embedded 复用同一实现。
- Scene、Motion、Regions、Chrome、Flow 分别进入 panel。未访问 panel 不 mount；已访问 resident
  panel 隐藏但保持 mounted，切回不丢 view/session state。probe 只渲染/确认 Host 已选 panel，控件
  不可交互。
- Motion manifest entry 始终有一个 panel；sources/case 尚未 ready 时显示 bounded loading/empty/
  unavailable 状态，不因 `renderedWorkbench.kind !== "ready"` 留下空白 focus。Regions 没有文档时
  同样使用既有空态，不改变 manifest membership 或新增异步 availability framework。
- rail 明确标出隐藏 dirty workspace；切到其他 workspace 后 embedded close 仍弹既有统一
  save/discard/cancel dialog，不能因 panel 隐藏或未渲染而漏 participant。
- Flow 的 loader 只由首次 visible focus 或显式 visible retry 触发；loading/failure/retry UI 留在
  Flow panel。active Flow 下的 probe、hide/reopen 与切走/切回不增加 loader count。

交付记录：standalone/embedded 共用的 visible surface 现由 closed manifest 渲染原生 button rail，
button/panel id 包含 `viewId`，任一时刻只暴露 active panel；未访问 workspace 不 mount，已访问 sibling
以 `hidden` + `inert` 保持 connected。probe 只渲染既有 active panel，禁用 rail 与 workspace 首次 IO/
participant 注册。隐藏 dirty workspace 在 rail 显示“未保存”并提供明确 accessible name，仍参与统一
close gate。Flow 只在首次 visible 选择时 open，error 只由 visible retry 重试；Motion 始终呈现
loading/empty/unavailable/ready 中的一种有界状态。focused Studio tests（14 files / 127 tests）以及
Template、Cat Cafe、Engine Lab 的 Chromium/WebKit 合同用例通过；active Flow 与 dirty Motion 在
rejected/accepted R1 下保持 focus、owner/session 与 loader 边界。旧 Cat Cafe exact-source replacement/
visible-root-detach 用例保护的是已被 persistent publication 取代的实现形状，已删除；真实 Browser R1
拒绝/接受仍由 maintained contract E2E 覆盖。

### M2 — 两个真实 shell 消费与收口（2026-08-23 delivered）

- starter standalone：Scene、Motion、Regions 空态、Chrome、Flow 使用同一 rail；在 Scene 与 Chrome
  各产生真实 draft，切换后值、dirty 与 undo 保留，保存仍写各自原 IO；Flow 未选择前不 activation。
- Engine Lab embedded：Scene、Motion、Regions 与显式 Agent companion 共存；workspace 切换、隐藏
  dirty close gate、embedded hide/reopen 和兼容 Authoring R1 保留 active focus，Game/Session sibling
  行为不变。focus 切换不 create/dispose Agent companion，兼容 R1 后仍是同一个 owner/session；Agent
  不是 workspace，不塞进 rail或随 panel 隐藏。
- 更新 `architecture.md`、`features.md`、`development.md` 与 authoring quickstart，准确记录 Host-owned
  focus、closed rail、progressive Flow 和仍未实现的 typed target navigation。
- 删除被单一可见 workspace 取代的长页锚点/重复 section chrome 及只保护旧长页结构的测试；不以
  本车道为由重写各 workspace editor 或拆新 package。

交付记录：starter standalone 以键盘选择 Chrome、指针返回 Scene，证明两份真实 draft、dirty 标记与
Scene undo 跨 workspace 保留；Flow 选择前保持冷。Engine Lab embedded 以 dirty Motion 切到 Scene 后
触发统一 close gate，取消后返回 Motion 保留精确输入值；既有 Authoring R1、Game/Session R2 与显式
Agent sibling 合同继续由 Chromium/WebKit 覆盖。Cat Cafe 继续使用同一 rail 和 Motion consumer。
live architecture/features/development/quickstart 已同步 Host focus、visited keep-alive、probe 权限、
progressive Flow 与未实现的 typed target navigation。最终 `deno task check` 通过 361 files / 5566
tests；受影响 Browser E2E 共 30 cases（Template 16、Cat Cafe 6、Engine Lab 8）在 Chromium/WebKit
通过，`deno task docs:build` 通过。React Doctor 从 slice base `31d265da` 报告 3 个既有
多-`useState` advisory；本车道未新增对应
state，Chrome/Regions 只改变 probe guard/根 landmark，未发现 currentness 或 lifecycle defect，故以
高置信度拒绝，不为分数重写 reducer。Desktop adapter、preflight 与 activation 状态均未改变。

## 4. 验收

- Host focused unit/jsdom：M0 合同、visible/probe 权限、visited mount、dirty aggregation、Flow
  single-flight/failure-retry、embedded hide/reopen 与 Authoring R1 continuity 通过；manifest signature
  不兼容 candidate 在改动 Host state 前拒绝，active Flow 的 probe/hide/reopen 不增加 loader count。
- probe mount/readiness 不调用 workspace list/open，不 auto-open 文档、不扩 visited，且不注册
  participant；只消费 visible 已建立的 active/visited/session state。
- standalone Browser：workspace nav buttons 可由键盘/指针选择并准确发布 `aria-current`；
  Scene/Chrome 两份草稿跨切换保留，隐藏 dirty
  可见，保存命中原 dev-source/CAS 端口；Flow 只在选择后出现。
- embedded Browser：一个合同级用例证明切换与 dirty close gate；现有 Chromium/WebKit
  R1/R2/Agent sibling cases 保持通过，不增加 DOM identity inventory。
- ordinary Player/release graph 仍排除 Studio/author/source-write；workspace focus 不触碰 Game State、
  Save/digest/replay 或 Desktop adapter。
- focused tests、受影响 Browser E2E、`deno task check`；本车道修改 React/TSX，按 slice-start ref
  运行 React Doctor advisory audit并分类新增 findings。
- 若 rail/visited mount 影响 startup，使用现有通用 GUI startup benchmark 只报告 raw measurements；
  本车道不发明阈值或 promotion decision。

## 5. 明确不做

- dock/split/MDI、多窗口、拖拽布局、可持久化 panel layout、WindowManager；
- 代码编辑器、LSP、terminal、文件浏览器、命令面板、项目级全文搜索；
- public workspace/plugin ABI、动态第三方 workspace、任意模块 loader；
- typed cross-workspace target、source provenance 深链跳转、Flow 写回或新 structured operation 家族；
- 多文档原子 save-all、第二 document/State/Save authority；
- Browser product R2 状态迁移、Desktop HMR activation 或 Deno stable revalidation。

## 6. Stop conditions

- 一个可见 workspace 需要通用 WindowManager、布局 schema、public plugin registry 或无界 keep-alive；
- 切换会重建 Host/session，丢 draft/undo/selection，或隐藏 workspace 从 close gate 消失；
- probe 能改变 active/visited、触发首次 progressive activation 或注册 writable participant；
- active workspace 必须进入 project 文件、Save 或跨文档原子事务才能正确；
- Motion/Regions 空态要求异步 availability framework 或运行时 workspace discovery 才能渲染。

命中停止条件时保留现有 Host/session 合同并报告实际失败；不得转而建设通用编辑器 shell framework。
