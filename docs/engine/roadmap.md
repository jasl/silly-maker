# SillyMaker engine roadmap

状态：2026-07-19 接受的连续演进方向。R1–R4 已随
[vNext foundations plan](plans/2026-07-19-sillymaker-vnext-foundations.md)
实现并进入 [feature list](features.md)（含 Engine Conformance 垂直切片、AI
authoring canaries 与 PoC 的 Composer 迁移）；R5 的 Timeline、R6 的 1–2
步（DevTools 数据面）与 R7 玩家回滚已按
[R5–R7 执行计划](plans/2026-07-28-sillymaker-r5-r7.md) 实现并进入 feature
list；该计划的 defer 表（keyframes、onLifecycle、受约束场景图、R6.3–6.5
编辑器、R8 媒体 adapter
等）记录了未做部分及其激活条件。复刻缺口分析驱动的内容数据库、语义舞台命中区域与
Host
元进度命名空间已随《雨巷猫舍》示例交付（`examples/cat-cafe`，见计划的缺口交付记录）。《雨巷猫舍》此后升格为旗舰示例：完整可玩游戏（标题屏、设置基线、AIGC
全套美术、运行时资产管线、竞赛/图鉴/结局演出、后日谈、双语），并交付了一步桌面打包（`story desktop`，含图标与文件存档）。2026-07-28
晚间批次以《雨巷猫舍》为第二真实消费者落地：R8 音频第一刀（`GameAudioV1`
组件、真实 MP3 场景 BGM/环境声/一次性音效、设置音量联动）、VN 播放
QoL（打字机/自动/快进/历史回看，偏好持久化）、R7 rollback
产品策略（开赛/结局确认为硬边界、HUD
一步回退、防重掷证明）；系统菜单收敛为单模态路由（保存/设置互斥、存档安全点、标题屏载入存档）。

2026-07-29 接受 [Mod composition and distribution](design/mod-system.md)
作为尚未实现的 continuous track：先做显式、构建期、可信的 first-party capability
Mod，再做发布后 declarative Mod；不把 npm
安装、运行时可安装代码和不可信沙箱混成一个里程碑。同批接受三条 production-floor
方向：Snapshot 提交完整性分层（增量 freeze/digest/validation 与性能契约）、UI
surface 生命周期统一（单一 modality/focus/input 真相），以及
[Save migration design](design/save-migration.md)（一等迁移 registry
与解码顺序改造）。三者是 Mod track 的事实前置，依赖关系见各 continuous track。

2026-07-30 持久化槽位模型从固定 `quick`/`manual` 扩展为 Story 可配置的编号手动槽
`manual.1..N`（核心应用声明 `manualSaveSlotCount`，引擎默认 8、上限
99），`quick` 与双自动档语义不变；Save overlay 按 port 枚举顺序渲染槽位，槽名经
`slotNames.manualSlot(index)`。多标签页继续由单写者 Session lease
管辖，不引入按槽锁。该能力已实现并进入 feature list。

2026-07-30 接受并落地「应用即项目」契约修订（改写 R2 的 project config 交付形态）：
每个应用（template、examples、e2e 与外部项目）是自包含项目——自己的
`sillymaker.config.ts`（应用根相对路径）、自己的 `vite.config.ts`（调用
`@sillymaker/tooling/vite` 的共享装配）、通过 package exports 依赖引擎（仓库内
`workspace:*`；未发布 npm 期间外部项目用相对 `file:` 路径 +
`"nodeModulesDir": "manual"`）。根 `project.config.ts` 退化为目录清单（CI
聚合与根 `--mode` 便捷分发）；gitignored `project.config.local.ts` overlay
机制退役——本地/外部游戏不再注册进主仓，而是作为普通外部消费者存在。运行时资产
runtimePath 从仓库相对改为应用根相对（`assets/…`）；Web 构建产物固定
`<app>/dist-web`（`dist/` 归 TypeScript 项目引用输出）。「复制 `template/`
开新项目」是受支持的起点；AI-agent 文档（authoring-quickstart、各目录
AGENTS 手册）随之修订。npm 发布、版本化与脚手架 CLI 仍未排期。

2026-07-30 在 Unity、Unreal、Godot 与 Bevy 的官方机制对照、Web
平台原生原语（`<dialog>`/top layer、`inert`、CloseWatcher、Navigation
API）评估和本地整画布验证实验之后，Surface track 收紧为
[Managed Surface lifecycle and contract harness](design/surface-contract-harness.md)：不引入第二套
gameplay State 或 Runtime ORM，而是由一个 Coordinator 原子发布
lifecycle/render/action/input/focus，以 instance/topology-revision/gesture fence
拒绝陈旧输入，并从同一声明生成结构检查、状态模型、最小失败轨迹与真实浏览器验证。AI
friendliness 是本 track 的硬性能力下限：标准路径必须让较弱模型无需手写 boolean
soup、Back 栈、z-index、focus restore 或全局 listener，也能通过确定性
conformance。

## 1. North star

SillyMaker 要从“支撑首个 Tavern PoC 的运行时”演进为适合 Visual
Novel、SLG、模拟经营和人物养成 Story 的 React + TypeScript 游戏引擎。

目标开发体验是：作者或 AI Agent 可以只通过受支持的 package exports，用普通
TypeScript 编写 Story、GameplayModule、规则、Narrative 和 React
UI；同一个游戏可在 Node headless
与浏览器运行、被语义化自动化操作、独立构建和诊断，而不需要复制 PoC
的通用胶水或修改引擎核心。

首个 vNext 垂直目标同时包含两条主线：

1. **AI-authorable
   engine**：稳定的作者接口、结构化诊断、通用应用组合、Headless/Agent harness 和
   Story-independent tooling。
2. **Production-capable VN
   presentation**：可保存的语义舞台、可中断转场、交互边界、音频意图和基础玩家播放系统。

真实游戏（当前为《雨巷猫舍》旗舰示例）持续充当引擎的第一消费者，但任何一个游戏都不是引擎的隐含模板。

## 2. Durable architecture principles

以下原则贯穿全部阶段：

- 一个 Session 只有一个 authoritative gameplay State；renderer、audio
  element、DOM、React state 和 editor model 不能成为第二权威来源。
- Simulation 拥有 gameplay rules 与稳定语义意图；Presentation
  执行动画、转场、排版和即时播放；Host
  管理浏览器资源、时钟、音频、文件和持久存储。
- Save 保存 plain、versioned、validated data 和稳定 ID，不保存
  renderer、DOM、Promise、clock handle、audio node、cache 或动画进度。
- Headless、DOM、Agent 与 Browser Automation 使用同一个 semantic/application
  contract，不分别实现游戏规则。
- 素材通过稳定 manifest ID 使用；加载、预测、失败和降级是引擎的一等边界。
- 输入先映射为语义
  action，再由当前输入上下文处理；鼠标、触摸、键盘、手柄和自动化不直接改 State。
- 公共契约由真实第二消费者和行为测试证明；不以 PoC 私有 helper、计划夹具或
  frozen golden 代替。
- 新作者层应减少无意义的泛型、验证和组合样板，但保留普通 TypeScript
  的完整表达能力。
- 一个逻辑 Mod 可以纵跨 Base/UI/Web/Tooling，但每个 facet 仍遵守现有 package
  dependency direction；headless/Base 不因 Mod 组合而导入 React、DOM、browser 或
  Node-only tooling。

## 3. Script and extension model

Story、GameplayModule、Narrative authoring、UI contribution 和官方 Hotfix 使用
TypeScript/JavaScript。TypeScript 在构建时成为
JavaScript，运行时不引入另一套解释器。

SillyMaker 不提供：

- Ren'Py DSL、ATL、Screen Language 的语法、parser、存档格式或兼容层；
- 自研脚本 VM、动态表达式语言或面向不可信代码的安全沙箱。

第三方 JavaScript 可以执行宿主本来允许的操作。引擎只承诺公开 API
的行为和兼容性；直接访问
`window`、DOM、IndexedDB、内部模块或其他未公开能力不受支持，风险由调用方承担。

这不排除以后提供强类型 Timeline、scene graph、editor 或 Hotfix
工具；它们仍然生成或消费 SillyMaker 自己的 TypeScript/稳定数据合同。

Mod 第一阶段同样是构建期的可信 TypeScript/JavaScript，并在 Story resolve 与
Session 创建前冻结。发布后的 declarative Artifact、同 realm 可信代码 Artifact
与未来可能的隔离扩展是不同信任模型；当前“不提供不可信代码沙箱”的决定不因 Mod
命名而改变。

## 4. Milestones and continuous tracks

### R0 — Active design baseline（2026-07-19 已完成）

**Outcome:** 当前实现、已接受方向、探索性 proposal 和执行计划不再混淆。

- 登记 Ren'Py 本地参考身份、许可和 no-copy 边界；
- 形成 VN presentation、AI authoring 和 E2E engine validation 设计；
- 建立一个逐任务、可验收的当前实施计划；
- 保留 `architecture.md`、`features.md` 和 `story-authoring.md` 对 live
  implementation 的描述。

### R1 — Engine conformance Story and common harness

**Outcome:** `e2e` 成为只使用公开 API 的真实第二消费者。

- 新 E2E Story 覆盖 stateful module、typed capability dependency、跨 owner 原子
  command、query/semantic action、rejection/fault 和 deterministic route；
- `@sillymaker/base/testkit` 提供通用 Game harness；
- Host-neutral core `AgentGamePort` 支持 observe、describe
  actions、preview、dispatch 和 session/publication wait；Save 与 diagnostics
  使用独立可撤销 capability；
- Node in-process 与 JSONL stdio 对同一 transcript 得到一致语义结果；

E2E Story 是维护中的测试应用和最小参考实现，不是旧 fixture/golden
系统的恢复，也不作为发行游戏。

### R2 — AI authoring and application composition

**Outcome:** 新 Story 不再复制 Tavern 的隐藏引擎。

- 提供官方 schema adapter、稳定 Authoring Diagnostic 和 JSON output；
- 提供分层 Base/UI/Web Application Composers：分别统一 Host-neutral
  Session/Persistence/Diagnostics、React UI/Input/Save surfaces，以及 browser
  Assets/Automation/HMR/lifecycle；
- 保留低层 composition 和 renderer contribution 作为 escape hatch；
- 建立 Story/application project config 和 Node-only tooling，使
  inspect、check、simulate、dev、build 与 prebuilt smoke 不依赖 PoC
  switch（2026-07-30 修订为「应用即项目」：应用本地 `sillymaker.config.ts` +
  共享 Vite 装配，根注册表仅是目录清单）；
- 增加 TS Narrative builder/lint，但不增加 parser 或自定义 DSL。
- 在 Web Composer 可用后加入 Browser Agent adapter，并与 Node/JSONL 执行同一
  semantic transcript；
- 在 Composer/config 可用后，把浏览器 E2E 从 PoC 产品测试中拆出独立 Engine
  conformance suite。

### R3 — Semantic VN stage and interaction runtime

**Outcome:** Narrative 的舞台与交互语义真正进入运行时和存档。

- 可序列化 SemanticStageState、Layer、稳定 Tag 和 StageMutation，以及由
  projector 产生的 StageRenderTarget；
- show、replace、hide、clear、placement、z-order 与 layer/camera transform
  的基础合同；
- previous/target Transition、Presentation
  Clock、完成、取消、跳过、reduced-motion 和输入策略；
- say、choice、pause、presentationBarrier 与可扩展 custom interaction surface；
- load 时恢复稳定目标舞台和当前交互，不恢复“动画进行到 37%”；
- E2E/Agent 可以观察语义舞台目标和交互；只读 PresentationObservation/DOM tests
  观察 transition lifecycle，均不获得 renderer authority。

### R4 — Media, player systems, input, and prediction

**Outcome:** VN 具备长期游玩所需的基础播放器体验。

- image、music、ambient、SFX、voice asset metadata 和加载诊断；
- BGM、ambient、voice 的 continuous saveable intent、transient SFX occurrence 与
  Web Audio Host reconciliation；
- Text reveal、History/backlog、seen、auto、skip-read/skip-all、hide UI 和 voice
  replay；
- keyboard 和 gamepad adapter，继续兼容 pointer/touch 与 accessibility；
- 有预算、无副作用的 Narrative control-flow prediction 和素材 prefetch；
- 页面隐藏、音频权限、缺失素材、加载失败和 reduced-motion 下的可预测降级。

R0 是本轮实施开始前已经完成的设计基线。R1–R4 的核心集成验收是一条 3–5 分钟 E2E
VN/SLG 垂直切片；各里程碑仍须满足实施计划与本文 promotion rules 的独立验收。

### R5 — Typed Timeline and bounded Presentation Scene Graph

**Outcome:** 在不引入 ATL 语法的前提下提高演出表达力。

- TypeScript authoring API 表达 sequence、parallel、wait、tween、repeat、event
  和 reusable cue；
- Timeline executor 复用 R3 的 PresentationRun、Presentation Clock、interruption
  和 completion fencing；
- 可暂停、取消、跳过、快进、检查和在 reduced-motion 下稳定降级；
- 扁平 Stage 被真实 Story 证明不足后，再从 background/character/prop
  扩展为受约束 Presentation Scene Graph；
- layer/camera transform、enter/exit/move/pose/expression 和 effect contribution
  使用稳定 ID；
- timeline 执行只改变 presentation runtime，不通过动画回调偷偷改 gameplay
  State。

是否支持更一般的 2D/3D renderer node，由真实 Story
需求和性能原型决定；路线图不要求复制 Godot scene tree。video、Live2D
等高级媒体与渲染 adapter 的交付属于 R8。

### R6 — Authoring DevTools and editors

**Outcome:** 人类与 AI 都能更快理解、预览和修复 Story。

按以下顺序演进：

1. runtime inspector、State/semantic/presentation diff、structured diagnostics；
2. Narrative graph、不可达节点、引用和素材依赖可视化；
3. Stage preview、Timeline scrubber、transition/audio inspection；
4. capability-gated debug command、经 Session transaction 的受控 State 修改和
   scenario runner；任何修改都更新 RunIntegrity；
5. 根据真实生产成本决定可视化 Narrative、Stage 或 Timeline editor。

Editor 应写入普通 TS 或被 TS 引用的稳定 Story
data，不形成另一套运行时语言或隐含权威 State。

### R7 — Player rollback and time travel

**Outcome:** VN 玩家回滚与 SLG 决策边界可以共存。

- 基于 bounded immutable GameSnapshot checkpoint，而不是复制 Python mutation
  log；
- 区分玩家 history、player rollback、Debug replay 和 CommandLog；
- 默认随 Snapshot 恢复
  RNG；对防重掷结果、营业结算、跨日、外部副作用和不可逆剧情定义
  pinned-outcome/hard-barrier policy；
- rollback 恢复 authoritative Snapshot，并重新投影 settled Stage target、Audio
  intent 和 PendingInteraction；不恢复 renderer transient state；
- 先用 E2E Story
  验证，再在真实游戏中落产品策略（已随《雨巷猫舍》落地：开赛/结局确认为
  barrier + HUD 回退）。

### R8 — Advanced media and renderer adapters

**Outcome:** 真实 Story 需要的高级媒体与渲染形式成为受约束的 presentation
contribution。

- 在 typed media manifest、Audio Host 和 bounded Presentation Scene Graph
  稳定后进入；
- 按真实 Story 需求从 video、Live2D、2D skeletal、Rive 和 WebGL/3D adapter
  中交付子集，不预先实现全部形式；
- adapter 使用稳定 manifest ID、加载/就绪诊断和 code-native fallback，遵循既有
  asset demand/readiness 边界；
- Save 只保存稳定 semantic target，不保存 renderer instance、decoded media
  或播放进度；
- 平板/16:10、资源预算和降级路径在 conformance tests 中证明。

### Continuous track — Snapshot integrity and commit performance

**Outcome:** 命令提交成本主要与 changed set
相关，而不是快照总大小；经营/战棋/ATB 级别的大状态 workload
不再被完整性策略阻塞。

现状阻塞点：`GameSession` 每次命令在 finalize 时对 before/after 快照各做一次全量
canonical digest，CommandLog append 校验又对同两个快照各重算一次（合计每命令 4
次全量遍历），被拒绝的命令同样支付；提交后再对整个 Snapshot 递归深冻结；默认
`every_commit` autosave 在保存路径上每次提交再做多轮全量 digest、序列化与 schema
解析（实测至少 5 次全量 digest 与 2 次全量序列化，`auto.previous`
轮转时更多）。即使只改一个字段，提交成本仍与 Snapshot 总大小近似线性相关；短篇
VN 无感，大状态品类会最先撞墙。

- 第一步先做不改任何合同语义的 digest 去重：命令 N 的 pre digest 复用命令 N-1 的
  post digest（CommandLog append 已以对象恒等断言快照连续性）、append
  内的重算校验按 debug/audit 运行模式启停、rejected/faulted 路径以对象恒等短路
  post digest。该步把每命令全量 digest 从 4 次降到提交 1 次、拒绝 0
  次，但不改变单次 digest 的渐近线，后续分层仍然必要；autosave 的
  digest/序列化成本纳入同一性能契约；
- 引入显式完整性分层（概念
  `IntegrityPolicy`）：freeze（`deep`/`changed-subtrees`/`none`）、digest（`every-command`/`checkpoint`/`module-root`/`off`）、validation（`full`/`changed-modules`/`boundary-only`），按
  debug（开发与 Agent
  验证）、audit（CI/replay/存档认证）、release（玩家运行时）运行模式组合；
- 数据结构演进优先模块级 revision、changed-set
  与结构共享；根摘要由模块摘要组成；全量 canonical digest 保留给存档、显式
  checkpoint、replay verification 与调试导出；
- 命令保持原子提交；确定性、rejection/fault 语义与 replay 合同不变；release
  模式不默认递归深冻结整个对象图；
- 建立性能契约并纳入 CI 或 nightly：100/1k/10k/100k entity
  snapshot、单模块小改动、跨模块事务、长命令序列回放与长时内存增长；按命令类型分预算等级，不用单一全局阈值；
- 经营/时间经济切片（Mod track 的验证对象）作为 reference workload；本 track
  落地前，大状态品类的验证结论不视为引擎结论；
- 明确不采取的修复：仅替换 SHA 实现（昂贵的是 canonical
  遍历、双份全量扫描与整树冻结，不是哈希本身）；未经 profiling 证明前不改写为
  ECS。

### Continuous track — Surface lifecycle unification and contract harness

**Outcome:** 所有影响输入与焦点的 Managed
Surface（overlay、系统对话框、narrative 对话与历史、整画布功能页和 workspace
窗口）只有一套 lifecycle/modality/input/focus/dismiss/z-order
真相；同一声明还能机械地产生结构检查、状态模型、运行时 publication
和可缩减的验证序列。

现状是多套真相而非单点 bug：input isolation、inert、focus restore
与关闭策略分散在 InputRouter、GameStage isolation、Overlay 与 SystemDialog 的
session store/host、VnLayer 与 DialoguePanel
中，单体测试各自通过但组合语义靠约定。已证实的裂缝：Overlay 的物理 Escape
关闭不检查 `dismissible`（backdrop 与 routed cancel 检查，物理 Escape 的 DOM
路径不检查）；overlay entry key 为 `kind:depth`，同 kind 替换会复用 React
局部状态；system dialog 在 saves 未配置时 store 保持 active
而渲染消隐（store/render 真相分叉）；stage layer 顺序在类型 union 与
`stageLayerIdsV1` 数组中双重表达；DialoguePanelV1 未接入 narrative input context
与 stage isolation，与 VnLayerV1 形成两套并行 narrative
生命周期。整画布验证实验还证明：当视觉页、action publication、pending
occurrence、热点和回退栈各自推进时，会出现“命令 committed
但没有应用”“旧热点命中新页”和不可关闭的多 overlay 组合。

- 合同与 package ownership 见
  [Surface Contract Harness design](design/surface-contract-harness.md)，执行顺序见
  [2026-07-30 plan](plans/2026-07-30-surface-contract-harness.md)；本 track
  尚未进入 live `features.md`；
- 坚持“一个 lifecycle authority，而不是一个全局 persistence
  store”：gameplay、conversation、UI Artifact、workspace layout 与 renderer
  transient 各自保留明确 owner；domain/workspace stable target 只能经 typed
  intent 改变，并携带只在目标 occurrence 改变时更新的 ID；Coordinator 只拥有
  transient target 与 runtime Surface instance topology；
- 把“打开一个影响输入/焦点的 Surface”统一为 managed session：Coordinator 对
  source revision 做 reconcile，并在自己的 commit 内原子管理 definition/instance
  ID、application epoch、topology revision、managed routing
  lease、layer、modality、dismiss、focus、readiness 与 lifecycle；不伪装成跨
  domain/workspace owner 的分布式事务；
- `RuntimePresentationPublication`、Surface topology、可执行 action、hit
  regions、input/focus owner 必须绑定同一 target occurrence、source
  publication/topology revision；renderer 不能旁读更新更快的 State
  拼出第二帧真相；
- Managed Surface input 固定设计文档定义的 canonical dispatch
  envelope（唯一权威字段清单见 design 的 input/gesture 一章，以
  `surfaceInstanceId` 为唯一 Surface 实例身份）；target occurrence 只在
  owner↔Coordinator reconcile 与 publication 中出现（epoch 内与 instance
  一一对应），semantic occurrence 属于 Base semantic dispatch；非 Surface
  HUD/Stage input 使用 `inputOwnerId + sourcePublicationRevision`，不伪造
  Surface identity；pointer-down 后发生 replace/close 时，旧 pointer-up/click
  必须稳定 cancel/reject；
- input route、Surface transition 与 semantic/workspace dispatch 保持分层
  receipt；application-composition bridge 只从 immutable evidence 组合端到端
  outcome `applied / consumed / rejected / faulted / postcondition_failed`；内部
  Session `committed` 不自动等于用户动作已生效，postcondition 失败也不得虚构
  rollback；
- 合并 VnLayer 与 DialoguePanel 的职责模型（player controller / view / narrative
  surface host 分层）；历史回看成为统一 Surface
  session，不再是面板内的绝对定位视觉层；
- 修复已列裂缝：dismiss policy 单点化、稳定 instance ID、不可用 system dialog 在
  open 前拒绝、单一有序 layer descriptor、registration/owner trace，以及
  focus-loss/pointer-cancel/visibility-change 的统一复位；
- Authoring builder 为标准路径生成 stable IDs、安全默认值和 test metadata；常规
  Story/Mod 不直接写 z-index、global listener、Back 数组、focus/input owner 或
  visibility/raycast boolean 组合；
- Contract Harness 分成 structural check、pure model、seeded exploration +
  shrink、frame-aware virtual input、真实 browser interaction 与 prebuilt
  验证；随机失败必须输出稳定 code、第一处分歧、最短 trace、seed 和 replay
  command；
- [window model](design/window-model.md) 的槽位互斥契约保留为产品语义
  recipe，坐落在统一 lifecycle 上；SillyOS 的自由 MDI 几何与文档状态继续留在
  Story 侧；
- [Mod design](design/mod-system.md) 的 route/window/overlay/input-context
  合并规则以本 track 的统一 registry 为前置；弱模型 fresh-baseline canary 是作者
  API 冻结证据，确定性 contract 与 browser acceptance 才是每次合并的 hard gate。

### Continuous track — Save migration as a release capability

**Outcome:** 任意受支持的历史 Save 在 CI 中可迁移、可加载；State schema
演进不再默默放弃旧存档。

合同见 [Save migration design](design/save-migration.md)：一等 migration
registry（相邻 revision 纯函数迁移链）、解码顺序改造（current snapshot schema
验证移到迁移之后，Strict JSON 限额不放开）、dry-run 与写入前备份、每发布版本的
Save fixture corpus 与 CI 迁移验收。migration 与 adoption
保持不同语义；CommandLog 兼容轴独立管理。本 track 独立于 Mod 系统排期并先于其 M3
落地。

### Continuous track — Mod composition and distribution

**Outcome:** Engine 保持通用机制，VN
等一等能力与经营/养成等经验证能力可以作为显式、可诊断、可版本化的纵向 Mod 被
Application 组合。

- `package.json`/lockfile 负责物理安装，Mod metadata 负责
  activation、requires/optional/conflicts、facets、State ownership 与
  compatibility；Application 是唯一 activation root；Module lifecycle 归
  Authoring Kit，同 facet instance resource lifecycle 归对应
  Composer，不设模糊的 Mod-wide load order；
- 一个 Mod 身份按 `./base`、`./ui`、`./web`、`./tooling` 分面，复用 Mod 通过应用
  type family 与 typed adapter factory 实例化，不引入万能 `install(context)`；
- Mod graph 位于唯一 GameplayModule capability graph 之上；重复
  State、command、reference、renderer、route 或 Host singleton 默认 hard
  fail，不使用 load-order override；
- resolved Mod manifest 进入 build identity 与 Save provenance；same-schema
  Simulation drift 默认拒绝，只有 exact adoption 才放行；State migration 在
  current Snapshot schema 解析前、bounded raw envelope decode 后执行；
- VN 作为 Tier-1 first-party Mod/preset
  验证第一阶段；“SLG”先拆为真实经营、时间经济、人物成长、互动与元进度切片，不预造大而全
  genre API；
- 构建期可信 npm Mod → 发布后 declarative data/content/assets/受约束 UI template
  Mod → 有真实需求后才考虑同 realm trusted code Artifact；Conversation 中的 UI
  Artifact 仍是产品数据，不是 Mod；不可信代码需另立隔离与权限设计。

本 track 的合同与分阶段 gate 见 [Mod design](design/mod-system.md)。前置关系：M2
的 UI surface 类合并规则（route/window/overlay/input context duplicate hard
fail）以 Surface lifecycle unification track 的统一 surface registry 为前提；M3
的 per-namespace migration 以 [Save migration design](design/save-migration.md)
的解码顺序与 registry 为前提；经营/时间经济切片的规模验证以 Snapshot integrity
track 的性能契约为前提。在 resolver、manifest、Save migration 和外部 package
smoke 落地前，`architecture.md`、`features.md` 与 `build-and-release.md`
不宣称已经支持 Mod。

### Continuous track — real-game gameplay feedback

**Outcome:** 用真实玩法持续检验引擎，而不是让引擎预设 Tavern 模块。

经营、人物养成、关系、任务、商店、仓库、设施、文字冒险和网状叙事等玩法会经由真实游戏（旗舰示例或未来项目）分批检验。每个实验先判断需求属于：

- Story-local rule/content/projection；
- 可复用 module/capability；
- 通用 SillyMaker runtime/presentation/tooling 能力。

只有反复出现且与具体题材无关的需求进入引擎。玩法重构可以与路线图阶段交错，但不改变引擎测试对中性
E2E Story 的依赖。

## 5. Evidence and promotion rules

一项能力从路线图变为“已实现”需要同时满足：

1. 公共合同和 package ownership 明确；
2. focused behavior tests 通过；
3. E2E Story 在适用时覆盖跨系统行为；
4. Node/Browser 或 normal/reduced/skip 等适用语义保持一致；
5. 现行 `architecture.md`、`features.md`、`story-authoring.md` 或
   `development.md` 已更新；
6. superseded API、Story
   私有通用胶水和过时测试被迁移或删除，不长期维护平行权威。

研究笔记、proposal、路线图条目和 passing typecheck 本身都不等于已实现能力。

## 6. Relationship to the current plans

[SillyMaker vNext foundations plan](plans/2026-07-19-sillymaker-vnext-foundations.md)
已完成
R1–R4，现为历史执行记录；[R5–R7 plan](plans/2026-07-28-sillymaker-r5-r7.md)
记录已完成项与仍有效的 defer gate。当前 Surface 强化按
[Surface Contract Harness plan](plans/2026-07-30-surface-contract-harness.md)
推进；Snapshot、Save migration 与 Mod track
在各自设计/计划明确前置关系后独立排期。

若实现过程中发现目标合同与 live tree 冲突，应先更新对应 design
并解释取舍；不得由 task plan 静默改变已接受方向。
