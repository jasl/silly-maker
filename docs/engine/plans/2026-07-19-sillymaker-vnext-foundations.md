# SillyMaker vNext foundations implementation plan

状态：2026-07-19 接受，R1–R4 已完成并进入
[features](../features.md)。本文保留为历史执行记录，不再是活动计划；未完成的
continuous track 按 [roadmap](../roadmap.md)
与其第 6 节列出的活动执行计划推进，交付史见
[roadmap archive](../roadmap-archive.md)。

## Goal

把 SillyMaker 从“已验证的 Project Tavern PoC runtime”提升为一个可由人类或 AI
Agent 使用公开 TypeScript/React API 创建新 Story 的 VN/SLG 引擎，并交付一个
production-capable VN foundations 垂直切片。

Goal 完成时，新 Story 应能：

- 只使用 package exports 定义 GameplayModules、Narrative、presentation 和 React
  contributions；
- 通过通用 harness 在 Node headless 运行，并通过同一 Agent contract 在 JSONL
  与浏览器操作；
- 使用默认 application composer 获得
  Session、Persistence、Diagnostics、UI、Input、Assets、Automation、HMR 和
  disposal；
- 通过声明式 project/application config 完成 check、simulate、dev、build 和
  prebuilt smoke；
- 使用可保存 Stage target、Transition、PendingInteraction、Audio intent 和基础
  VN player systems；
- 不修改引擎核心即可增加正常游戏内容和 UI contribution。

## Sources of authority

- [Engine roadmap](../roadmap.md)：长期阶段和永久边界；
- [AI authoring design](../design/ai-authoring.md)：作者接口、Composer、Agent 和
  Tooling；
- [E2E engine validation](../design/e2e-engine-validation.md)：测试消费者和场景矩阵；
- [VN presentation runtime](../design/vn-presentation-runtime.md)：Stage、Transition、Interaction、Audio
  和 player systems；
- [Game viewport and UI shell](../design/game-viewport-and-ui-shell.md)：逻辑画布、缩放、主题
  token、默认 surface 视觉基线和 player/debug 边界；
- [Current architecture](../architecture.md) 与
  [features](../features.md)：实施开始时的 live baseline。

Design 决定目标合同，本文决定实施顺序。任务中发现真实冲突时先修订相应 design
并记录原因；不得用局部 patch 静默改变权威 State、公开权限或路线图边界。

## Scope

R0 设计基线已经由本轮文档完成。当前 Goal 以它为输入，实现 Roadmap R1–R4：

1. Engine Conformance Story 与测试分层；
2. authoring schemas、diagnostics、typed capabilities 和 transaction helpers；
3. common harness、Agent adapters 和 Story-independent tooling；
4. Base/UI/Web application composers；
5. Semantic Stage、Transition、PendingInteraction 和 Save recovery；
6. media/audio、typewriter/history/seen/auto/skip、input 和 prediction；
7. 一个 3–5 分钟 Headless/Browser 共享的 E2E 垂直切片；
8. PoC 对通用 Composer 和真实 Narrative Stage 的最小迁移。

本 Goal 不重设计 Tavern 玩法、公式或内容；不实现 Ren'Py 兼容；不要求完成通用
Timeline、可视化 Editor 或 Player
rollback。后三项已有连续的后续里程碑，见本文末尾。

## Engineering rules

- 每个实现 task 先添加一个能暴露缺口的 focused
  test/type-test，确认失败原因与目标一致，再实现并扩大验证。
- `@sillymaker/base` 不依赖 React、DOM、Node 文件系统或具体 Story；Node CLI
  放入独立 tooling package。
- Gameplay State、Stage target、PendingInteraction 和 Audio intent 保持
  plain、versioned、validated、canonical data。
- Renderer、Audio Host 和 Agent 不获得 raw State setter；所有 gameplay write 经
  Session queue 和 semantic command。
- E2E Story 不导入 PoC、不 deep-import package source、不使用特殊 engine
  branch。
- 不创建 Goal fixture、golden writer、phase verifier、host attestation、旧 Goal
  command-log golden 或 checked-in test Artifact；允许维护短小、有名字的
  semantic scenario/transcript。
- Save compatibility 只在明确承诺时维护。若 Stage/Narrative schema 破坏当前开发
  Save，应提升 state-contract identity，并用明确 incompatible diagnostic 拒绝旧
  Save；不伪造兼容。
- 普通 direct Node TypeScript 工具保持当前执行方式可支持的 erasable/strip-only
  TypeScript，或先显式编译；不要依赖隐含 transform runtime。
- 每项公开能力落地时同步更新 current implementation docs，而不是等 Goal
  结束一次性补写。

## Phase A — Establish the external consumer

### Task A1 — Add the new E2E Story package boundary

**Objective:** 建立 `e2e` 作为中性 Engine Conformance
Story，先让第二消费者暴露真实公共 API 缺口。

**Work:**

- 创建最小 Story package、license metadata、State/schema、两种 stateful Module
  和一个 Web-neutral entry；
- 只使用当前 package exports；
- 增加 import guard，拒绝 PoC import 和 `engine/**/src` deep import；
- 不增加 fixture/golden/tooling writer；
- 先以当前公开 API 建立可通过的最小 consumer boundary；真实 typed capability
  和跨 owner transaction 的 failing test 分别由 A3/A4 先写，避免 A1
  结束时长期留红。

**Acceptance:**

- package 可被 workspace typecheck 发现；
- public-import guard 能对故意 deep import 失败；
- baseline tests 证明 package/public-import boundary，不因 Tavern 数据、浏览器或
  fixture 缺失失败；
- `git diff` 中没有复制归档 E2E 文件或 PoC 内容。

### Task A2 — Publish schema authoring and structured diagnostics

**Objective:** 消除 Story 私有 canonicalize/freeze/Zod issue 胶水，并给人类与
Agent 稳定错误面。

**Work:**

- 在 Base authoring entry 提供 RuntimeSchema helper 和官方 Zod adapter；
- 统一 Strict JSON、canonical validation 和 deep-freeze；
- 实现 `AuthoringDiagnostic` envelope、stable
  codes、subject、pointer/location、related、suggestion 和 details；
- 让 authoring、runtime、presentation、asset 和 media diagnostics 共享 versioned
  envelope，仅扩展 phase/details；
- 让 definition/resolution errors 可聚合并输出 human/JSON；
- 迁移 E2E Story 使用；只在不增加兼容风险时迁移 PoC 私有 adapter。

**Acceptance:**

- focused tests 覆盖合法值、非 JSON 值、schema issue、deep-freeze 和多诊断；
- duplicate State/Module、invalid State 和 missing reference 返回稳定 code 与
  pointer/subject；
- diagnostic JSON 自身通过 Strict JSON schema；
- Base 没有 Zod-specific public contract 泄漏，除明确 adapter entry 外不要求
  Story 使用 Zod。

### Task A3 — Add thin GameAuthoringKit and typed capabilities

**Objective:** 用真实第二消费者简化 Module 泛型，并把声明依赖与实际 dependency
port 连接起来。

**Work:**

- 增加 authoring-specific package export；
- 实现 typed capability token、`requires/provides` availability graph 和
  composition validation；
- 定义 provider factory/`createReadPort` 合同，只从 owner State/read context
  构造实际只读 capability port；
- 用独立 `initializesAfter`/lifecycle dependency 表达 startup order；vNext
  direct capability 与 lifecycle graph 分别要求 DAG，双向协作先经 Story
  coordinator/Query aggregator 汇合；
- 提供 stateful/stateless Module helpers，允许省略不存在的 local command/query；
- 从 Game type family 推导 module/simulation/resolved types；
- 保留低层 API escape hatch；
- 根据 E2E Story 的真实痛点决定是否使用 V2 名称或直接替换未稳定
  V1，避免长期双模型。

**Acceptance:**

- type tests 证明 correct provider/consumer 推导成功；
- missing provider、duplicate provider、capability cycle、lifecycle cycle
  和未声明 token/binding access 在 definition/resolution 阶段以不同 stable code
  失败；不承诺检测任意 TS import/closure/global access；
- dependency port 是窄只读能力，不含 foreign State/write；
- E2E consumer 调用的是 provider factory 生成的真实 read-port
  implementation，而不只是 token/graph validation；
- E2E Story capability graph 有至少一条真实非空 dependency，lifecycle DAG
  独立合法；
- 与当前低层 API 共存时只有一个 resolved Module graph 和 authoritative State。

### Task A4 — Move transaction mechanics into Base

**Objective:** 让 Story 只编排跨模块业务，不重复 owner slice replacement、RNG
checkpoint 和 atomic rollback；由 E2E failing test 决定最小公共抽取。

**Work:**

- 先用 E2E 跨 owner atomic command 写 focused failing test；若现有低层 Base
  组合已能在不复制 generic mechanics 的情况下满足，则只补最小 authoring
  helper，否则实现 command coordinator/transaction context；
- 支持 typed read capability、owner proposal、fact collection 和 complete
  candidate；
- 所有 read 观察 command-start immutable Snapshot；每个 owner 最多一个
  proposal，重复时返回稳定 diagnostic；
- 引擎负责 schema、reference/invariant hooks、commit/reject/fault、RNG/sequence
  rollback；
- E2E Story 实现一个跨两个 owner 的 command；
- 不把 transaction client 暴露给 UI/Agent。

**Acceptance:**

- focused tests 覆盖 commit、business rejection、schema/invariant fault 和
  handler throw；
- rejection/fault 后 State object/digest、RNG 和 sequence 保持原值；
- successful command 一次性安装两个 owner 的新 slice；
- proposal 声明顺序不改变 candidate/commit 结果；重复 owner proposal 不发生隐式
  merge 或部分写入；
- committed facts 只在 commit 后发布；CommandLog 继续记录 admitted command 的
  committed/rejected/faulted outcome；
- E2E Story 不包含复制的 generic candidate/session algorithm。

## Phase B — Common harness and Agent surface

### Task B1 — Build the generic GameHarness

**Objective:** 把 PoC 私有 Session/semantic/test setup 收回
`@sillymaker/base/testkit`。

**Work:**

- 创建 resolved game、Session、Semantic port、memory persistence、failure buffer
  和 deterministic entropy 的通用 harness；
- 提供 observe/preview/dispatch/wait、trace、Snapshot digest、Save
  import/export、Replay、DebugBundle、capability-aware debug 和 disposal；
- 提供显式 test-only inspection；
- 用 synthetic Story 和 E2E Story contract suite 验证。

**Acceptance:**

- E2E headless route 不需要 Story 私有 Session factory；
- two harnesses with same seed/transcript 得到相同 publication/digest；
- teardown 后 operation 有结构化 disposed/revoked outcome；
- normal Agent surface 无 raw Snapshot/State setter；
- PoC 私有 harness 的通用部分有明确后续删除/迁移清单。

### Task B2 — Define Host-neutral AgentGamePort

**Objective:** 让 Node、Browser 和未来 AI player 共用同一玩家安全操作合同。

**Work:**

- 以 SemanticGamePort 为核心定义 identity、observe、describe
  actions、preview、dispatch 和 bounded session/publication wait；
- 将 Save/import/export 与只读 diagnostics 定义为独立、可撤销
  capability；Replay/DebugBundle 构造/raw inspection 留在 GameHarness admin
  surface；
- 实现 in-process Node adapter；
- 提供 contract tests 和 transcript recorder；
- 保留 Browser capability/revocation 语义。

**Acceptance:**

- core Agent 可以完成 E2E Story 一条终局路线；启用 diagnostics capability 或
  GameHarness admin 时可另行导出 diagnostics/DebugBundle；
- stale invocation 在 queue front 被拒绝；
- timeout/AbortSignal 不改变 gameplay State；
- Agent result 不含 raw State、Snapshot、RNG、facts、DebugTools 或 arbitrary
  command；
- public types 能由具体 Story 推导 invocation/publication/result。

### Task B3 — Add JSONL stdio host and align Browser adapter

**Objective:** 给外部 agent/automation
一个低成本、可脚本化、无浏览器依赖的协议。

**Work:**

- 创建最小 Node-only `@sillymaker/tooling` package shell，并在其中实现 versioned
  JSONL request/response/event；Phase C 再扩展 project/config/build commands；
- stdout 只输出协议，stderr 输出日志；
- 增加 payload/depth/line/time limits 和 graceful shutdown；
- 让 Browser global adapter 实现同一逻辑 contract；
- 建立 Node/JSONL/Browser transcript comparison helpers。

**Acceptance:**

- valid hello/observe/preview/dispatch/wait core sequence 通过；diagnostics
  只在显式 capability 启用时通过；
- malformed JSON、unknown method、oversized request 和 timeout 返回 bounded
  structured error，进程不泄漏 stack 到 stdout；
- 协议无 eval、任意文件路径或 DebugTools method；
- Node in-process 与 JSONL 对同一 transcript 得到相同结果；Browser parity 在
  Phase C/E2E 中完成。

## Phase C — Tooling and application composition

### Task C1 — Expand tooling with Story/application project config

**Objective:** 移除 `poc-web` 对 Vite、assets 和 build/release resolver
的硬编码。

**Work:**

- 扩展 Phase B 创建的 Node-only `@sillymaker/tooling`；
- 定义普通 TS project/application config；
- 实现 inspect/check/simulate/dev/build target resolution；
- 让 asset validation 和 build identity 消费选定 application，而不是 import
  PoC；
- 保持 current PoC commands 的兼容 alias，新增明确 E2E commands；
- 不把 E2E test Artifact 当作 Project Tavern release。

**Acceptance:**

- E2E 与 PoC 都由同一 config mechanism 解析；
- 新增一个临时 Story application declaration 不修改 Vite implementation、asset
  verifier 或 build switch；
- `inspect/check` 支持 JSON diagnostics；
- `simulate` 通过 Agent port 而不是 Story 私有 runner；
- Node-only dependency 不进入 Base/UI browser bundle；
- build identity/provenance 仍区分 Story、simulation、presentation 和 patch
  inputs。

### Task C2 — Extract Base application composer

**Objective:** 统一
Session、Persistence、Diagnostics、Replay、DebugBundle、Semantic port 和
lifecycle。

**Work:**

- 定义只含 GamePackage、bootstrap/schema、semantic、validators 和 diagnostics 的
  Host-neutral CoreGameApplication definition；不含 React
  projector/contribution；
- 区分 author definition、immutable resolved definition 和持有 live resource 的
  disposable application instance；
- 从 PoC runtime 抽取 generic construction/disposal，不 import PoC；
- 支持 capabilities、leases、load/import、replay base 和 failure reporting；
- 让 application instance 维护 bootstrap/dispatch/load/replay/rebootstrap 的
  presentation anchor/epoch；它不进入 SemanticPublication、semantic revision 或
  Agent transcript；
- 提供可注入 autosave/checkpoint policy，而不是每个 committed Snapshot
  都立即写持久层；
- 保留低层 constructors 作为测试/高级 escape hatch；
- 在 E2E Story 上先迁移。

**Acceptance:**

- E2E application 不手工创建 Session/Persistence/Diagnostics；
- construction failure、load failure、disposal 和 HMR invalidation 不留下活动
  owner/listener；
- load/replay/rebootstrap 后旧 epoch 的 registered presentation callback
  无法影响当前 instance 或 resolve interaction；
- autosave debounce/checkpoint/pagehide policy 可由 deterministic test clock
  验证，且任一 committed Snapshot 仍可显式保存；
- Base composer 在 Node tests 中无 React/DOM/IndexedDB；
- E2E 与 synthetic consumer 使用同一 lifecycle contract；PoC 迁移留给 F3；
- current Save/DebugBundle behavior tests 保持通过或被更清晰的 public tests
  替代。

### Task C3 — Extract default UI and Web composers

**Objective:** 提供无需 Story 自定义 Root 也能启动的完整 React/Web application。

**Work:**

- UI composer 统一
  RuntimePresentationStore、registry、Input、Interaction、Overlay/System
  sessions、default GameRoot、Save/Settings/DevDock；
- UI composer 将 semantic projection 与 instance-local anchor 组合成独立
  RuntimePresentationPublication，不污染 SemanticPublication/Agent parity；
- Web composer 通过独立 PresentationHost 统一 DOM clock、asset/media
  loader、audio、routing、input adapters、Agent bridge、mount、page
  lifecycle、HMR 和 teardown；
- Story 只提供 semantic adapter、projector、catalog 和 optional contributions；
- custom root/low-level contribution 仍可选。

**Acceptance:**

- E2E Story 无自定义 React Root 即可启动默认 UI；
- default GameRoot 满足
  [viewport/shell design](../design/game-viewport-and-ui-shell.md) 的
  GameViewport、默认 surface 视觉基线与 player/debug 边界验收；
- 添加一个 Story Overlay 和 Narrative/Stage contribution 不修改 composer；
- Story Web entry 接近单次 `startWebGameApplication(application)`，不含
  Session、Persistence、Diagnostics、Input、Automation 或 HMR wiring；
- Base `GameHost` 不获得 DOM、AudioContext、RAF 或 page lifecycle 能力，Headless
  不依赖 PresentationHost；
- listener/portal/asset request/automation generation 在 disposal 后全部撤销；
- E2E application 不复制 PoC Root/runtime glue；PoC 的迁移和 superseded code
  删除留给 F3。

### Task C4 — Split Engine and PoC browser suites

**Objective:** 让现有高价值 Playwright 覆盖真正验证引擎，同时保留 Tavern
产品测试。

**Work:**

- 建立 E2E Story browser target 和 generated/shared Playwright target config；
- 迁移 Automation、publication
  parity、capabilities、accessibility、responsive、reduced-motion、当前
  pointer/touch/focus input 和通用 release cases；
- 将 Tavern flow/scene/content tests 移入明确 PoC suite；
- 修复当前不可达的 touch/responsive project 分支；
- 加入 pageerror/console diagnostic policy，保留 failure trace。

**Acceptance:**

- `pnpm test:e2e:engine` 与 `pnpm test:e2e:poc` 可独立执行；
- `pnpm test:e2e` 聚合二者；
- engine suite 不包含 Tavern 文本、ID 或 imports；
- E2E Story DOM 与 Browser Agent actions/publication parity 通过；
- pointer、touch、focus、tablet、16:10 和 reduced-motion cases 实际命中声明
  project；keyboard/gamepad 扩展在 E3 增补。

## Phase D — Semantic VN Stage and interaction

### Task D1 — Define Semantic Stage V2 contracts and pure reducer

**Objective:** 用可保存的 semantic Layer/Tag/Entry target 替代单
background/variant 和固定 slot，同时不把 renderer data 存进 gameplay State。

**Work:**

- 定义 versioned SemanticStageState、Layer、Entry、Placement、Appearance、Camera
  target 和 StageMutation batch；
- 定义由 Story projector 产生、包含 renderer/assets/accessibility/Strict JSON
  props 的非权威 StageRenderTarget；
- 实现 show/replace/hide/clear/set-placement/set-appearance/layer/camera
  reducer；
- 增加 semantic schema/reference diagnostics，并为 StageRenderTarget 增加
  renderer/asset/accessibility diagnostics；
- 在 E2E Story 使用两个背景、两个角色和一个 prop；
- 明确 V1 migration/removal 和 PoC state-contract change。

**Acceptance:**

- reducer property tests 覆盖 identity、ordering、replace continuity 和 invalid
  atomicity；
- mutation failure 不改变原 SemanticStageState；
- SemanticStageState canonical round-trip/digest 稳定；
- SemanticStageState 不包含 renderer ID/props、Asset URL、accessibility
  presentation、React/DOM/clock/function；
- StageRenderTarget 可由同一 State/catalog 确定性重建且不单独保存；
- PoC old Saves 被明确兼容或以新 identity 清晰拒绝，不静默误载。

### Task D2 — Connect Narrative Stage to projection and asset demand

**Objective:** 消除 Narrative Stage 与 static Scene Variant 的平行权威。

**Work:**

- 让 semantic publication 含 SemanticStageState；
- projector 从 semantic target 得到 StageRenderTarget、Character/Interaction
  render view 和 required assets；
- Stage/Character host 使用稳定 tag/renderer ID；
- E2E Narrative stage mutations 实际改变可见舞台；
- PoC projector 消费 `semantic.narrative.stage`，删除或降级冲突 route/variant
  logic。

**Acceptance:**

- Headless observe 能看到 semantic Stage target；
- Browser 对 show/replace/hide/pose/expression 呈现正确 stable identities；
- settled 时 asset demand 精确包含当前 target；active transition 时包含
  previous/retained + target，并在 settle/retarget/dispose 后释放；
- missing renderer/asset 有 fallback 和 diagnostic，不改变 gameplay；
- PoC `stageCue` 有至少一个 visible integration test。

### Task D3 — Implement Transition Player and Presentation Clock

**Objective:** 建立 old→target、可中断、可跳过、可降级的演出生命周期。

**Work:**

- 定义 Transition definition/catalog 和 commit-only、带唯一 occurrence ID 的
  TransitionRequest；Transition edge 不进入稳定 Stage State/Save；
- 实现可供未来 Timeline 复用的 PresentationRun lifecycle、Stage
  Reconciler、previous/target frame、retained exits 和 clock；
- 支持 cut、crossfade 和一种 entry/move transition；
- 支持 interruption、block/target-active/skip-to-end input policy、completion
  acknowledgment、reduced-motion、page visibility 和 disposal；
- 加入 asset readiness policy；
- 清理 PoC `activeCueId` 死字段接线，由真实 Transition Player/PresentationRun
  取代；
- 非 barrier transition 不修改 gameplay State。

**Acceptance:**

- manual clock tests 精确控制
  start/pause/resume/progress/complete/skip/cancel/interruption/dispose；
- rapid retarget 不闪回旧 target，late completion 无效；
- 三种 input policy 和 barrier/non-barrier completion acknowledgment 均有
  focused behavior tests；
- reduced-motion 直接或按 catalog fallback settle；
- disposal/HMR/pagehide 后无 timer/listener 残留；
- Save/load 不序列化 elapsed time 或 render tree；
- Browser tests 不使用 sleep 判断完成，观察 lifecycle/idle signal。

### Task D4 — Add PendingInteraction and semantic resolution

**Objective:** 统一 say、choice、pause 和 presentation barrier
的可保存交互边界。

**Work:**

- 分离 stable definition ID、seenRevision、每次进入唯一 occurrence ID 和
  resolution schema；
- Narrative runner 自动执行纯节点直到 PendingInteraction；
- 所有 advance/choice/barrier completion 通过 `expectedOccurrenceId` semantic
  command；
- UI/Agent 公布 player-safe interaction；
- 提供一个 schema-registered custom interaction surface 作为受控扩展证明，不让
  renderer 任意执行 callback；
- headless 能立即或用 deterministic clock 完成 barrier。

**Acceptance:**

- duplicate click、stale choice、剧情循环重新进入后的旧 occurrence、late
  transition/voice callback 被 queue-front rejection；
- Save/load 恢复相同 interaction 和 target；
- choice availability 与 preview/dispatch 使用同一 evaluator；
- Headless/Browser 在 barrier 后得到相同 authoritative outcome；
- custom interaction 使用同一 occurrence fencing、Save codec、preview/dispatch
  与 rejection contract；
- renderer Promise/callback 不进入 State/Save。

### Task D5 — Integrate stable presentation Save/recovery

**Objective:** 在 dialogue、choice 和 transition barrier
任意稳定点可保存、刷新和载入。

**Work:**

- 扩展 Save/state schemas 和 compatibility diagnostics；
- load 后重建 Stage target 和 PendingInteraction；
- transition progress 和 typewriter cursor 不恢复；
- load/replay/HMR/rebootstrap 提升 presentation epoch，并让旧 transition
  callback 失效；
- 增加可注入 autosave/checkpoint policy，控制显式
  checkpoint、debounce、最大等待与 pagehide 刷盘；
- DebugBundle 可观察 Stage/interaction identity，但遵循 privacy policy。

**Acceptance:**

- E2E Story 在 say、choice、barrier 三处 round-trip；
- load during transition 恢复 target 的稳定视觉和合法 interaction；
- corrupt/unknown IDs 在替换 live State 前拒绝；
- rejected load 保留原 Session/Stage/PendingInteraction；
- 每个 committed Snapshot 可显式保存，但长对话不会默认每行同步写 IndexedDB；
- load/rebootstrap 后迟到的 transition completion 不能确认新的 barrier；
- prebuilt refresh recovery 通过。

## Phase E — Media, player systems, input, and prediction

### Task E1 — Generalize media assets and implement Audio Host

**Objective:** 支持 image、music、ambient、SFX 和 voice 的类型化 manifest
与浏览器播放。

**Work:**

- 扩展 asset contracts、loader/readiness/diagnostics；
- 增加 `AssetDemandPlan`，表达 blocking/opportunistic priority、load
  group、budget、cancel、retry/backoff 和 retention；
- 对声明了 size/digest 的外部或 Hotfix media 校验实际响应字节；不同 media kind
  保持独立类型合同；
- 定义 saveable BGM/ambient/current-voice channel target，以及只进入
  publication/effect stream 的 transient SFX occurrence；
- 实现 Web Audio Host reconciliation、unlock、volume/mute、page lifecycle、cache
  和 fallback；
- load 后恢复 continuous Audio intent，不恢复 one-shot
  SFX；load/replay/HMR/rebootstrap 的 presentation epoch 让旧 audio/SFX callback
  失效；
- 提供 fake/manual audio host 做 deterministic tests；
- 不把 audio node/cursor 放入 Save。

**Acceptance:**

- BGM/ambient replace/loop/fade intent 可 load 后恢复；
- voice 与 say interaction 关联，可 replay，advance/skip 遵循 stop/sustain；
- 同一 SFX occurrence 在一个 presentation epoch 只播放一次，不进入 Save/load；
- transient effect stream 有单调 sequence 与 instance-local consumed
  watermark；同 epoch 重投影和新 epoch load 均不重放历史 SFX；
- rejected load 保留原 Audio intent；load/rebootstrap 后旧 epoch 的 audio/SFX
  callback 不影响当前播放或 interaction；
- autoplay denial、missing/failed decode 不阻塞 gameplay，并产生 diagnostic；
- Stage retarget/unload/HMR/dispose 会撤销过期 demand；failed request 可按
  policy 开启新 load cycle；
- size/digest mismatch 不登记 ready，进入 bounded fallback；
- page hide/resume 与 disposal 不重复或泄漏播放。

### Task E2 — Implement VN player systems

**Objective:** 交付基础长期游玩体验，而不是只有一个立即显示全文的对话框。

**Work:**

- typewriter reveal 和 two-step confirm；
- 将 NarrativeHistory 作为 Story/Narrative State 进入 Snapshot/Save，为 M3
  rollback checkpoint 复用同一数据准备合同；
- 将 seen registry/`seenRevision` 与 playback preferences 放入独立 Host
  profile，不进入单个 Game Save；M3 再验证 rollback 不撤销 profile；
- auto、skip-read/skip-all、hide UI、voice replay；
- explicit playback policy 与 choice/barrier stop rules；
- player preferences 通过 Host profile 持久化。

**Acceptance:**

- normal/auto/skip 使用同一 interaction resolution contract；
- 未读、choice、不可跳过 barrier 能按 policy 停止；
- hide UI 不改变 authoritative State；
- History、Seen、CommandLog 和 Debug replay 的数据/测试相互独立；
- NarrativeHistory 进入 Game Save 并恢复到对应 occurrence；Seen/preferences
  不进入该 Save；
- Game Save 中没有独立 presentation sidecar；typewriter cursor、focus 和临时
  playback execution state 不持久化；
- load-ready state 不依赖 React component memory；M3 所需 rollback ownership
  已在合同中标注但不在本 Goal 执行；
- accessibility/focus/reduced-motion tests 通过。

### Task E3 — Add keyboard/gamepad adapters and explicit input actions

**Objective:** 在保持 pointer/touch 的同时完成可扩展输入面。

**Work:**

- 增加 keyboard adapter 与可配置 action map；
- 增加最小 Gamepad adapter/poll lifecycle；
- 定义 advance/choice 等 gameplay intent，以及 history、auto、skip、hide UI 等
  player/presentation control；只有前者或最终 interaction resolution 经
  Session；
- Input Router 继续处理 context priority、scope、focus loss 和 blocking
  overlay；未处理 action 继续路由；
- 物理输入事件不进入 CommandLog，只有最终形成的 gameplay semantic command
  被记录；
- VN layer 只消费当前 PendingInteraction 支持的 action，不无条件吞掉其他 surface
  的输入；
- DevTools 与 gameplay input isolation 明确。

**Acceptance:**

- pointer、touch、keyboard、gamepad 对同一 action 得到一致 semantic intent；
- presentation/profile control 不伪装成 GameCommand，也不因切换输入设备改变
  gameplay revision；
- focus 在 form/dialog 时不误触发 Stage command；
- DevTools/System overlay 可抢占相关 scope，VN layer 对无关 action 返回
  unhandled；
- DOM click、keyboard、gamepad 和 Agent 形成同一 gameplay action 时，CommandLog
  不记录额外的物理输入噪声；
- disconnect/pagehide/disposal 清理 gamepad loop；
- 可访问 DOM control 始终存在，不要求只能用 canvas/坐标操作；
- Browser tests 覆盖 keyboard 和一个 mock/synthetic gamepad path。

### Task E4 — Add Narrative lint and bounded asset prediction

**Objective:** 在运行前发现叙事/舞台引用错误，并减少切换卡顿。

**Work:**

- 为 TS Narrative IR 建立 duplicate/missing/unreachable/call/loop/interaction
  lint；
- 增加可选的 typed Narrative builder/source metadata，使 diagnostics 能回到
  definition/JSON pointer 或可证明的源码位置；
- 从 current cursor 进行有预算、无副作用的分支预测；
- 输出 text/image/audio/renderer/Stage dependencies；
- 集成 structured diagnostics 和 asset prefetch；
- prediction 不执行 command、不消费 RNG、不决定隐藏 branch。

**Acceptance:**

- negative cases 返回 stable code 和 source/pointer；
- builder 与直接编写合法 IR 得到同一 runtime contract；不引入 parser/DSL；
- bounded traversal 在 cycle/deep call/large branch 下按预算结束；
- same input prediction deterministic；
- prediction 前后 Snapshot/RNG/command log 完全相同；
- E2E transition 在已预测与未预测/失败素材下均有合法结果。

## Phase F — Vertical acceptance and cleanup

### Task F1 — Complete the Engine Conformance VN/SLG route

**Objective:** 用一个真实、短小的应用共同验证 R1–R4，而不是一组互不关联的
mocks。

**Work:**

- 完成 3–5 分钟 Engine Lab route；
- 包含两个背景、两个角色、Stage mutations、三种
  transition、BGM/SFX/voice、typewriter、choice、history/seen/auto/skip/hide
  UI；
- choice 触发真实跨模块 command，并返回普通 SLG/场景 UI；
- 添加一个 Story Overlay 和一个 renderer contribution；
- 建立 deterministic transcript 和 browser user flow。

**Acceptance:**

- route 可由 DOM、Node Agent、JSONL Agent 和 Browser Agent 完成；
- normal/reduced/skip/headless 最终 State digest 一致；
- Node/Browser semantic revision/outcome/interaction parity 通过；
- say/choice/barrier Save/load 通过；
- missing image/audio/renderer fallback 通过；
- 1600×1000、1024×768、平板横屏与 200% zoom 下 letterbox 与核心画面可用；
- no fixture/golden/sleep/coordinate-only test。

### Task F2 — Prove AI authoring canaries

**Objective:** 用实际扩展任务检验作者接口，而不是凭 API 外观宣称 AI-friendly。

**Work:**

- 在 E2E 或临时第二消费者完成 currency/shop Module；
- 完成 relationship-conditioned Narrative branch；
- 完成 semantic React Overlay；
- 运行 non-blocking cheap-model eval 时记录读取文件、repair loops 和 contract
  violations；
- 将重复失败转成 diagnostics/docs/helper，而不是给模型特殊提示绕过 API。

Canary 分两轮：discovery run 可以暴露并推动 authoring helper/diagnostic
改进；作者面冻结后，从固定 fresh Story baseline 重跑 acceptance
run。只有第二轮使用 path guard 统计 engine/root implementation edits，并把
baseline、任务文本和 deterministic acceptance 留在普通测试代码中。

**Acceptance:**

- fresh-baseline acceptance run 的 engine edits、deep imports、PoC
  imports、foreign State mutation 和 root infrastructure implementation edits
  都为 0；
- 统一 config declaration 之外无需改 Vite/asset/build logic；
- all canaries 通过 check/headless/browser/build；
- invalid variants 给出可自动修复的 stable diagnostics；
- deterministic acceptance 不依赖模型评审，模型 eval 只记录趋势。

### Task F3 — Migrate PoC common glue and real Narrative Stage

**Objective:** 证明 Composer/Stage 能服务真实 Tavern Story，同时不重设计玩法。

**Work:**

- 迁移 PoC application entry、runtime/presentation common construction；
- 移除 PoC 玩家常驻 UI 中的 debug 元素（semantic status 文本、诊断导出按钮），按
  viewport/shell design §5 归位 DevDock/Settings；
- 删除 superseded Story-local generic glue；
- 让至少一条 PoC Narrative stage cue 实际控制背景/人物；
- 保留 Tavern rules、formulas 和 content，除 contract migration 必需变化；
- 分离 PoC product E2E。

**Acceptance:**

- PoC 正常启动、Save、DebugBundle、HMR 和主要流程通过；
- PoC entry 不再手工装配 engine-owned services；
- PoC entry 不直接创建 Session/Persistence/Diagnostics/Input/Automation/HMR
  owner；旧 generic factory/import path 已删除，只有 Composer 持有
  lifecycle，disposal tests 证明 listener/resource 归零；
- E2E engine suite 无 Tavern imports/text/IDs；
- gameplay output 的变化若非合同迁移预期，必须停止并解释。

### Task F4 — Final documentation and verification

**Objective:** 让 live docs、public exports、tests 和命令面共同描述新引擎。

**Work:**

- 更新 architecture、features、story-authoring、development、build/release 和
  root README；
- 将已实现 design 段落提升为 current behavior，未实现 R5+ 保留 roadmap 状态；
- 删除 obsolete V1 exports/tests/docs 或提供一次性明确迁移；
- 检查 package exports、type tests、license metadata 和 Artifact boundary；
- 做完整验证并记录命令证据。

**Acceptance:**

至少通过：

```text
pnpm check
pnpm test:conformance:headless
pnpm test:e2e:engine
pnpm test:e2e:engine:prebuilt
pnpm test:e2e:poc
```

并对 E2E Story 实际执行已落地 CLI 的等价命令，证明以下每个动词而不是只测试内部
helper：

```text
sillymaker inspect --story e2e --format json
sillymaker check --story e2e --format json
sillymaker simulate --story e2e --scenario opening --seed 23049
sillymaker dev --app e2e-web --smoke
sillymaker build --app e2e-web
sillymaker prebuilt-smoke --app e2e-web
```

若实现期调整精确拼写，development/build 文档必须列出最终命令，CLI contract tests
和本次验证记录必须覆盖六种职责。

另外要求：

- format/lint/type/unit/property/build 全绿；
- E2E/PoC prebuilt outputs 不被跟踪；
- public import/type-test matrix 通过；
- current docs 不把 R5+ 写成已实现；
- `git diff --check` 通过；
- 最终报告区分“验证命令全部通过”与“worktree 是否 clean/是否已提交”。

## Goal completion criteria

当前 Goal 只有在以下条件全部满足时完成：

1. E2E Story 是不依赖 PoC 的真实第二消费者；
2. E2E Module graph 具有真实 typed dependency 和跨 owner atomic command；
3. generic GameHarness 与 AgentGamePort 可在 Node/JSONL/Browser 使用；
4. Story-independent config/tooling 支持
   inspect/check/simulate/dev/build/prebuilt smoke；
5. default Base/UI/Web composers 取代 E2E/PoC 的通用手工 glue；
6. Stage target、Transition、PendingInteraction 和 stable Save recovery 已实现；
7. audio、VN player、keyboard/gamepad 和 prediction 的基础 contract 已实现；
8. 同一垂直 route 的 Headless/Browser/normal/reduced/skip parity 通过；
9. AI authoring canaries 不修改 engine core；
10. superseded paths 被删除或有明确、短期的迁移边界；
11. active docs 与 live code 一致；
12. 完整验证通过。

不能因为剩余 token、已完成局部 Phase、PoC
仍能启动或某个模型成功写出代码而提前标记完成。

## Stop conditions

遇到以下情况应停止当前 task 并作设计决定：

- Simulation 与 renderer/editor/audio 各自出现一份 authoritative game State；
- Agent/DOM/Headless 需要不同 gameplay rules；
- E2E Story 依靠测试专用 engine behavior，普通 Story 无法使用；
- typed capability 或 transaction helper 允许 foreign write/partial commit；
- Application Composer 必须知道 Tavern/E2E 特有类型；
- Stage/Timeline descriptor 需要保存 function/DOM/animation progress；
- audio/transition callback 绕过 Session 直接推进 Narrative；
- authoring convenience 需要 runtime eval、自定义 DSL 或不可信脚本沙箱；
- Ren'Py 参考内容被复制、改编或进入测试/build dependency；
- 为通过验收重新引入旧 fixture/golden/Goal harness。

普通 API 重命名、类型迁移、测试修复和 PoC glue
删除不是设计阻塞，应在上述边界内自主推进。

## Continuous milestones after this Goal

这些能力不属于当前 Goal completion，但已进入连续计划，不再被视为永久
non-goal。M1–M4 对应 [roadmap](../roadmap.md) 的 R5–R8，M5 对应其 Project Tavern
持续轨道。

### M1 — Typed Timeline and bounded Scene Graph (Roadmap R5)

**Entry:** Stage V2、Transition Player、PendingInteraction 和 E2E vertical route
稳定。

**Deliver:** TypeScript sequence/parallel/wait/tween/keyframes/repeat/lifecycle
builder、validated descriptor、timeline inspector、group/mask/effect/camera
nodes 和 custom renderer boundary。

**Accept:** normal/reduced/skip/manual-clock deterministic lifecycle；unknown
target、parallel conflict 和 unbounded repeat diagnostics；renderer cannot
mutate gameplay。

### M2 — Authoring DevTools and editors (Roadmap R6)

**Entry:** structured diagnostics、project config、Stage/Timeline IR 和 Agent
port 稳定。

**Deliver:** Stage tree、semantic/presentation diff、Narrative graph、asset
dependency、scene preview、timeline scrubber，随后依据使用成本决定 visual
editor。

**Accept:** preview 使用正常 composer/harness；source location 可回到
TS/data；editor 输出普通 TS 或稳定 data；无第二规则引擎。

### M3 — Player rollback and time travel (Roadmap R7)

**Entry:** Save/restore、PendingInteraction、history/seen 和 Stable Stage
recovery 已验证。

**Deliver:** bounded Snapshot checkpoint ring、soft/hard
barriers、pinned-outcome policy、RNG/sequence restore、player controls 和 Story
policy。

**Accept:** rollback/roll-forward candidate 不等于 Debug replay；营业结算/跨日等
hard barrier 可声明；恢复后 Stage/Audio/PendingInteraction 一致；Seen 不回滚。

### M4 — Advanced media and renderer adapters (Roadmap R8)

**Entry:** typed media manifest、Audio Host 和 bounded Scene Graph 稳定。

**Deliver:** video、Live2D、2D skeletal、Rive、WebGL/3D adapter 中被真实 Story
需要的子集，以及对应 asset/performance/fallback contracts。

**Accept:** adapter 是 presentation contribution；Save 只保存稳定 semantic
target；平板/16:10、资源预算和降级通过。

### M5 — Project Tavern gameplay redesign feedback (Roadmap continuous track)

经营、人物养成、关系、任务、商店、仓库、设施和文字冒险按独立游戏设计原型推进。反复出现、题材中性的需求才提升为
SillyMaker API；Tavern 不成为 E2E engine conformance 的唯一消费者或模板。
