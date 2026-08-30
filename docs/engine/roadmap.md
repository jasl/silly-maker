# SillyMaker engine roadmap

状态：2026-07-19 接受，最近审查修订 2026-08-30。已 promotion 的稳定能力以
[features](features.md) 为准；已交付但仍 provisional/package-private 的实验 seam 以对应 active
plan closure 与 [architecture](architecture.md) 为准；历史交付见
[roadmap archive](roadmap-archive.md)。当前执行入口只有
[Production-floor execution sequence](plans/2026-07-30-production-floor-sequence.md)，它再引用各 focused plan；design/roadmap
条目本身不等于 live capability。

## 1. North star

SillyMaker 是面向 **GUI 应用和游戏** 的 React + TypeScript 引擎；游戏仍是第一压力源。
当前产品 Host target 是 Browser 与 Deno Desktop，Electron 只保留未来 adapter 位置。它优先服务：

- Visual Novel 与互动叙事；
- 经营/人物养成/时间经济 SLG；
- 卡牌、JRPG 回合/半回合、战棋等确定性战斗；
- 长期状态的虚拟伴侣；
- 使用同一语义契约的 Agent/GenUI workspace。

目标不是复制 Unreal/Unity/Godot 的通用编辑器，而是吸收其对象层级、组件检视、专门 Timeline/
行为工具与代码扩展的成熟分层，建立一套可生产、可诊断、可回放、可迁移、适合人类与 Coding Agent
协作的专门平台：

```text
stable deterministic core
  + content/authoring pipeline
  + genre capabilities
  + renderer adapters
  + creator tooling
  + optional agent/genui workspace
```

Mod 是这组能力的组合与生命周期机制，不是把系统拆成微小 plugin 的目标。引擎按 State、
Session、Save、presentation 与 Host authority 保持内聚；一个产品的核心玩法领域也可以作为
required Mod 被显式选择，但继续由一个内聚模块拥有。围绕核心、可被真实产品省略、替换、单独
换代或从最终构建图排除的 genre UI、History、renderer、DevDock、Inspector/editor 与 Agent
workspace 等能力，优先作为 optional Mod 组合。`required` / `optional` 是产品语义，不能从能力
是否叫作 Mod 推导；一个按钮、reducer 或 State slot 也不会因此各自成为 Mod。

作者或 Agent 只通过受支持的 package exports，用普通 TypeScript 与稳定数据编写 Story、
GameplayModule、Narrative、内容表和 React UI。产品在 Browser 或 Deno Desktop GUI 中运行，
可被语义自动化操作、独立构建、诊断和长期迁移，不复制示例胶水，不修改 engine core。
headless 只复用同一 semantic/application contract 做开发、测试、conformance 和自动化；它不是
产品 target。Desktop CLI 只传入一次性 startup config，不是 interactive product 或运行时总线。

真实游戏持续充当第一消费者，Engine Lab 是中性 conformance rig；任何一个游戏或外部验证 workload 都不是引擎隐含模板。

2026-08-18 起，这一 north star 的产品表述扩展为 **game-first GUI application runtime**：
游戏仍是确定性、Save/replay、表现和内容规模的第一压力源，
同一 Application Host 可以按产品承载 Authoring Host 或 Agent Host，也可以承载 Agent-first
产品。它不是 backend/server framework、通用 CLI/headless runtime、桌面 OS、IDE、插件市场或
任意代码宿主；产品领域不会因此并入 GameSnapshot。必要后台、companion service 与 LLM 通过
typed RPC 连接，不作为进程内 plugin。

## 2. Non-negotiable architecture

- 一个 Session 只有一个 authoritative gameplay State；DOM、React state、renderer、editor、SQLite/IndexedDB 和 Agent transcript 都不能成为第二权威。
- Simulation 拥有规则与可保存语义；Presentation 拥有动画、排版、相机、粒子和瞬时播放；Host 拥有浏览器/桌面资源、I/O、存储和墙钟。
- Save 是 plain、versioned、validated data 与稳定 ID；不保存 DOM、renderer object、Promise、clock handle、audio node、cache 或动画进度。
- Browser/Deno Desktop GUI、Browser Automation、Agent 与辅助 headless conformance 使用同一
  semantic/application contract，不各自重写规则；GUI evidence 拥有产品验收。
- 输入先成为语义 action，由当前 input owner/context 处理；物理设备不直接改 gameplay State。
- 素材通过 manifest ID；加载、readiness、失败、fallback、预算和 technical identity 是一等构建/Host 边界。
- 内容数据库只读；mutable gameplay 只能经 Session transaction；Host persistence 不是 runtime ORM。
- 公共 API 由真实第二消费者、行为测试与迁移路径证明；design 文档或 passing typecheck 不足以冻结接口。
- 新作者层减少样板，但不引入第二套 DSL、动态 eval 或模糊的万能 context。
- package dependency direction 保持：Base 不导入 React/DOM/browser/host-specific tooling。

## 3. Script and extension model

Story、GameplayModule、Narrative、UI contribution 与可信 Hotfix 使用 TypeScript/JavaScript。运行时不引入 Ren'Py DSL、ATL、Screen Language、自研 VM 或任意表达式解释器。

第一阶段扩展是构建期可信代码。发布后的 declarative content/assets/template、同 realm trusted code 与未来隔离扩展是不同信任模型；当前不承诺不可信 JavaScript sandbox。

延迟加载与动态装卸明确分层：Browser/Deno Desktop 各自的 Module Update Source 只取得
build-known candidate；平台中立 Extension Runtime 只管 trusted in-process domain/contribution
lifecycle；SillyMaker publication/authority 继续拥有 admission、consumer ack、atomic cutover、
Session migration 与 predecessor retirement。外部 RPC 是并列 Host boundary，不属于 plugin/HMR。
普通静态游戏可以直接 mount 内聚 Game domain 并完全排除 dynamic extension backend。被选择的
presentation/tooling Mod 可以通过 R1 successor 在保留 GameSession 的情况下热装卸；改变
Simulation/权威领域的 Mod 通过 R2 exact Save + lease handoff 建立同窗 successor，不能原地改写
存活 Session graph。两者都允许零 page reload。R1 候选失败和 R2 retirement 开始前的失败保留
live predecessor；R2 disposal 开始后的 release failure 是 terminal。release 成功后的 startup failure
只保留 controller selection 与 exact retryable handoff，不再声称旧 application 仍可服务。

直接访问 `window`、DOM、IndexedDB、内部 `src/**` 或未公开 store 不受兼容承诺保护。Story 可使用明确的 Host/renderer escape hatch，但它们必须在 package ownership、Save 边界和测试中可见。

## 4. Current execution priority — production floor

最近完成的 focused lane 是
[Agent Session 异步断连收口](plans/2026-08-30-agent-session-asynchronous-connection-loss.md)。它由所有者
显式激活 handback 终审留下的唯一中立 lifecycle 候选：public connection 以一次性 `whenClosed` 表达不可用，
client 在 ready 前订阅并拥有 exact generation/status fencing、active-run identity 延续与 awaited cleanup；
SillyOS Browser Pi transport 已删除私有断连旁路，Creator facade 从公共 `/connection` snapshot 触发产品恢复。
它没有公开原因、自动重连、合成 Run terminal，或提升 Worker/Pi/Provider/credential/workspace/产品恢复策略。

此前完成的 focused lane 是
[Neutral Agent Session/Run 与 SillyOS Engine Handback](plans/2026-08-30-sillyos-neutral-engine-handback.md)。
它增加了 public `@sillymaker/agent/session`，只提升 semantic Session/Run client、connector/
connection、status/result/stream contracts、currentness 与 awaited disposal；raw request/wire/provider、
Agent Host、`UiArtifact` 与 deterministic fake 保持 private。SillyOS 随后已完成产品自有
downstream connector handoff，不会改写已关闭 engine slice 的边界。handoff 合同已明确长 Conversation 不设任意
消息条数上限，rich transcript 由 SillyOS 分页持久化并只挂载当前 Process；Browser local Agent
按“前台执行、允许中断、拒绝 stale 发布；最近已确认 checkpoint 仍可读且 admission 成功时恢复，
否则进入明确不可恢复状态”验收。这些是 downstream
产品要求与候选证据门，不是已交付的 Engine Process/persistence/background API。终审记录的 ready 后异步
connection loss 候选随后由所有者显式激活并在上述独立 lane 关闭；其余候选仍不自动激活。

此前完成的有界 lane 是
[Production Mod V1](plans/2026-08-29-production-mod-v1.md)：focused public
`@sillymaker/composition/mod` 已承载 trusted build-time metadata/resolution、typed extension points、selection
successor 与 async resource cleanup；仓外 tarball consumer 通过 Deno/Vite/Chromium；One Last Sound Check 的
单独 Mod-enabled build 则验证产品特定的 post-release declarative text/image overrides。它没有激活 runtime npm
resolution、marketplace、任意 post-release code、通用 authoritative gameplay R2 adapter 或不可信 sandbox。
Template 保持无需修改的 structural negative control。当前没有自动激活的后继 lane。

[2026-08-30 stage close](plans/2026-08-30-stage-close.md) 在主分支吸收后复核了当前代码、文档、公共
边界和 React UI：修正 VN identity/History publication/Narrative cleanup/Inspector input 的具体问题，保留
单一 authority 与冷路径 Mod 设计，完成全仓检查、公共 package smoke、VN 两种构建和真实 Browser matrix。
它没有激活新的功能 lane，SillyOS 仍在独立 worktree 孵化。

[VN Authoring Source 与 Interactive Director V1](plans/2026-08-30-vn-authoring-source-interactive-director.md)
已按所有者要求落盘为**候选计划**，目标是让现有 VN interaction 成为 versioned、稳定身份、可由同一 structured
operation/CAS 路径编辑的作者源，并把 Director 作为延迟加载的 R1 tooling Mod。它尚未激活，不改变
Production-floor current/next，也不包含新的 Ren'Py 运行能力、通用 Symbol Graph、Editor SDK 或 Cordis 复审。

此前完成的 [VN Genre Mod、History Mod 与作者工作流](plans/2026-08-29-vn-genre-mod-authoring.md) 让 Template
和 One Last Sound Check 共同消费 first-party VN interaction/compiler/runtime，共以 History 验证可选 R1
presentation Mod，并交付只读 VN Inspector contribution；Bookshop 已退役，不再作为第二套作者或测试路径。

在把 Story 成果提升为 engine-level genre pack、Mod、renderer 或 editor
能力之前，按 [Production-floor sequence](plans/2026-07-30-production-floor-sequence.md)
完成。Story-local 的 SLG/VN/卡牌等真实玩法实验可以并行，并继续作为需求与
workload 证据；仓库外私有实验只能提供匿名需求反馈，正式 promotion evidence 必须
由仓库内中性 workload 复现：

PF0–PF5 已完成：repository/tooling guardrails、Snapshot 热路径、
authoritative determinism、composition-owned Managed Surface families、Save
inspection/backup/recovery 与 maintained compatibility corpus 均已 promotion。

第 7 项的 `PF4/S4.3.1b Narrative/History` 已完成生产迁移：一个
composition-owned Managed Surface authority、公开
`NarrativeSurfaceDefinitionV1`/`defineNarrativeSurfaceV1`、四个 Story 消费方、SillyOS
省略路径和 browser promotion 均已落地，旧 conformance/player exports 已删除。
`PF4/S4b.1c` WholeCanvas 也已完成：公开 definition/application-source seam、
package-owned Splash/Title 与 exact-parent detail、Cat Cafe 第一消费者、Engine Lab
opt-in 第二消费者和 SillyOS 省略均已 promotion。`PF5/M3` Save inspection、bounded
backup/recovery、maintained release corpus 与 promotion 也已完成。当前默认 core
方向已完成 **Complexity Reset**：按比例信任边界删除 package-internal anti-forgery，
建立 Managed Surface/Narrative/WholeCanvas 与 Player 的真实性能趋势，并交付 Cat Cafe
detached Narrative/Stage preview。该真实作者纵切由现有 Story-local projection 与
`SemanticStageTargetHostV1` 完整解决，没有产生新的公共 authoring gap 或第二消费者；因此
PF6/S5 broad harness 复审后仍不激活。PF7 现已完成。2026-08-13 所有者以真实产品证据接受并
完成了 [Authorable Motion Workbench](plans/2026-08-13-authorable-motion-workbench.md)
（Track D 创作工具后续顺序第 2/3 项 + Track F 表现适配的落地：motion 资产地板、
点击反查溯源、单 motion Workbench 编辑闭环含 CAS 写回与 seek scrubber、预览捕获/
preview case、协作护栏）。2026-08-14 所有者以新的真实产品证据（孤立数字 Workbench
仍无法支撑基本场景修改：placement 埋在剧情源码、锚点藏在 Story CSS、cue→motion 靠
全局推断）接受并于 2026-08-15 完成
[VN Scene Workspace V1](plans/2026-08-14-vn-scene-workspace.md)：一等 Scene 文档 +
authoring geometry + 项目级 Studio（Track D 第 6 项 editor shell 的 VN 窄纵切），
目标合同见[场景创作模型与 SillyMaker Studio](design/scene-authoring-and-studio.md)。
2026-08-15 所有者以 A5 两轮基准与实验仓真实内容迁移证据（调校既有场景可用，但从零构
造与素材/内容进场未收敛）及自身角色决定（常态为试玩与 bug 汇报，日常修改由 Agent
与 Studio 完成）接受并于同日完成
[Authoring Architecture V1](plans/2026-08-15-authoring-architecture.md)：Studio
作者信任加固、统一创作外壳与共享文档会话、project authoring index、Story 包目录
locality、Scene Construction 与只读 Flow workspace，目标合同见
[统一创作架构](design/authoring-architecture.md)。其后为逐条所有者下令的引擎车
道，全部当日交付收口：cue identity（2026-08-17）、权威持有钟（2026-08-19，
`pause` 并入 `hold`）、并行监视器（2026-08-20，唯一时间动词 `TimeTickV1`、领域
事件 + reducer、权威监视器 V1、持久化安全点、监视器节奏环）、可创作帧集/命中区
形状/hold `when`（均 2026-08-21）、持有中输入（2026-08-22，零新引擎原语）。
上述补缺 lane 至 2026-08-22 全部交付关闭；合并后最近完成的默认/core lane 是本文后述的
Application Runtime AR0–AR6。AR0 已于 2026-08-22 交付中性 Host、once-admitted GUI
bootstrap、runtime/author startup 与 recovery signals、final-output dependency attribution 和
当前 R0–R3 平台边界；AR1 同日完成 17-case Direct/Cordis A/B、选择唯一 private Direct backend，
并迁入 lazy DevDock 与 Studio Flow；AR2 同日交付 package-private structured Scene operations、
pure reducer、document-successor identity/draft revision、atomic stale rejection 和共用 UI/non-UI
executor。三者都没有提升 native Desktop launch、persistence/signing、RPC readiness 或 Desktop
R0–R2。AR3 同日交付 private Authoring Host、standalone/embedded 同源 shell、persistent-visible
R1 publication、Engine Lab 真实 scene/binding、Browser Game/Session sibling lifetime、dev-only
composition R2 纵切、ordinary-release exclusion，以及 macOS/Deno 2.9.5 原生 common-runtime 的
GUI ready、Game/Session restart 与 close-flush/正常退出。它仍未提升 native Desktop
author/source-write/HMR、packaged artifact、多平台/durability 或 production promotion。AR4 同日
最初交付 workspace-private `@sillymaker/agent/internal`、bounded typed RPC client/Agent Host、closed
`UiArtifact`/`UiIntent` seam、deterministic fake 和 Engine Lab dev-only fake → Artifact → AR2 Scene
operation 纵切；`(sessionId, runId)` identity、submit-response-before-stream adapter obligation、
failed-connection retirement、`run_failed` draft termination、generation/sequence/cancellation
fencing、Artifact-before-interaction AR2 pairing 与 invalid-successor predecessor retention 均有行为
证据，Browser 纵切通过 Chromium 与 WebKit。ordinary Template/Engine Lab Player release 排除
Agent/RPC implementation。在该历史 checkpoint，它没有实现真实 backend/transport/protocol、public Agent ABI；
2026-08-30 focused lane 后来只提升 Session/Run client/connector，仍不包含
OpenUI/A2UI、Agent persistence 或 Desktop HMR。AR5 已于 2026-08-23 交付关闭：neutral
single-companion split 与 generated Author-entry measurement 已证明 Template 的完整 Author graph
排除 Agent/RPC/experimental Agent，同时 Engine Lab 显式选择图包含它们；当时 Studio package 的
workspace Agent dependency 说明该证据只形成 final module/source graph structural exclusion。M5 后
由 Engine Lab Inspector binding 的 private single-companion entry 保留这一显式选择。Chromium 与
WebKit 的 physical Browser evidence 只保留合同级 R1 rejection/retry、shared-presentation
Player R2 + Authoring R1、Application R3 reload/recovery，并保留 dirty Authoring sibling 与显式选择的
held Agent，不再维护内部 DOM/Host/session/run/connection/Artifact 身份库存；
headless/jsdom 另覆盖 post-retirement R2 UI-start failure + retry、terminal owner cleanup 与 repeated
Agent disposal。五组同机交错 local performance evidence 的 first actionable delta 为
`-4.23ms / -3.54%`、stable command delta 为 `-0.72ms / -1.40%`；一次性 runner 随后的
AR0–AR5 Complexity Reset 已删除，只保留日期化结果和不作 promotion 裁决的通用 GUI startup
benchmark。Deno Desktop
private inactive adapter、约数百行 bounded preflight 与显式选择的 official canary 人工 native
characterization 也已完成：binary 报告 `98dc759`，参与者将其对应到完整 upstream commit
`98dc759254a90b98f7bbb62ba5361e531d0db6a5`；官方 in-runtime Vite、同窗同 origin bootstrap/private route、
component-only `shell-ui.tsx` 正反向 HMR 零 reload、状态/overlay 保留、正常关闭 flush/drain 与
direct-child exit 0 均成立。首次 mixed component/registry export 导致的 R3 已拆分修复，并由
Chromium/WebKit 回归固定；adapter、BuildIdentity、equal-R2 fallback 与 native harness 没有扩张。
adapter 保持 package-private、explicit，并对普通路径 default-off。Deno 2.9.6 于 2026-08-28
通过相同 bounded stable acceptance 后，维护中的 `app desktop-dev` workflow 正式打开；一次性
canary launcher/test 已删除。该激活不改变 static R3、Deno `>=2.9.0` public floor、latest-stable CI，
也不提升 Desktop production claim。
AR6 closure 与 owner checkpoint 也已完成。2026-08-23 所有者随后指示继续下一项引擎工作；live
Host/consumer 复查选择并于同日交付关闭
[Authoring Workspace Focus & Navigation V1](plans/2026-08-23-authoring-workspace-focus-navigation.md)
：已有 closed workspace manifest 现已成为 Host-owned focus、accessible rail 与单一可见
workspace，保持 dirty session、progressive Flow、standalone/embedded 与 Authoring R1 连续性。
该工作没有从 Desktop defer 派生、等待或启用 Desktop HMR。随后复查确认普通 Browser 产品 R2 的
lease-only disposition 不移交 authoritative Snapshot，Core successor 还会跳过 autosave resume；
takeover `read_only` 与 post-takeover retry 的 stale fence 也未阻止 publication。所有者于
2026-08-23 接受
[Browser R2 Authoritative State Handoff V1](plans/2026-08-23-browser-r2-authoritative-state-handoff.md)
作为当时唯一 engine lane。M0–M3 已于同日交付：package-private exact encoded Save + released lease
fence 复用既有 Save migration/adoption/replay-base，并以 writable takeover 和 current-pair retry 关闭
authority 缺口；Engine Lab 与 Cat Cafe 的 Chromium/WebKit forward/reverse HMR 又以真实 Save 导出、
单次 Game epoch 换代、零 page reload 和 successor command 证明产品 State/Save continuity。该计划已
关闭，无后继任务自动激活。它不等待或激活 Desktop HMR，不承诺任意 React state 跨代，也不新增
Save format/framework。

2026-08-24 所有者接受并开启、2026-08-25 完成交付
[Scale、Scene/Object 与模块化 GUI V1](plans/2026-08-24-scale-scene-object-modular-gui.md)
作为当时的 engine lane，目标合同见
[Scale, Scene Object, and Modular GUI](proposals/scale-scene-object-and-modular-gui.md)。本轮以中性
Scale Lab 与持续预算解决静态大文本、稀疏多模块 transaction、initial bundle 和 authoring index 的
规模风险；增加编译到现有 Stage/Timeline 的第一阶 ordered layer/object hierarchy；把 GUI kernel、
Player preset、devtools 与 authoring 收口成单向、可静态排除的边界；最后以 Inspector-first surface
替换现有 Studio 产品外形。Authoring Host、document session、CAS、structured operations 与 source IO
等中立 substrate 保留；旧 workspace shell 不形成兼容层。本轮不激活 State Format V2、ECS、最终
Blueprint/Timeline editor、public Mod ABI 或 Desktop HMR。

M0 已于 2026-08-24 交付：四条独立 Scale Lab task 分别刻画 content compile/admission、真实 Template
initial bundle、16/160-module State workload 与 10/1,000-document authoring index；它们保留 raw
measurement 与 correctness oracle，但不建立聚合 runner 或机器阈值。结果确认当前静态内容在 module
evaluation 与 initial graph 中线性增长、100 KiB State 可见全 module dispatch、1 MiB stress 主要受
whole-State 工作支配、四个 list port 重复全量 index。

M1 也已于 2026-08-24 交付：Base 现在拥有 immutable text-content manifest、一次 strict
pack admission 和只解析已加载文本的同步 session；Web 从当前 GUI origin 渐进加载 build-known
pack，并在单一 semantic-invocation/Snapshot-replacement readiness boundary 按候选需求完成 content gate。
Template 将开场/结尾 dialogue 分成两个
`assets/content` pack，Player control plan 只保留 stable text IDs，Flow/source projection 和 authoring copy 只在
`src/tooling/**` 可达。M1 corrective 将 manifest descriptor 收缩为 `packId`/`runtimePath`，其 revision +
sorted logical topology 参与 presentation identity；被动 payload 不进入 Snapshot/Save，同一 logical
location 的直接文本编辑也不改变 presentation identity 或增加 Save compatibility warning，refresh/restart
后由新的 immutable session 读取。精确 byte length、SHA、声明式 entry count 及其拟议 generator 被删除；
pack 仍接受一次 bounded Strict JSON/schema admission，实际 entry count 从 admitted catalogs 派生。
1,000/100,000-entry profiles 保持相同 60-byte State/
digest、都只加载首个 1,000-entry pack；M1 corrective 后的最终 modified-worktree 复测将
initial JavaScript gzip 从 `361,006 B` 增到 `361,664 B`（`+658 B`），内容 payload 仍作为
独立 pack assets 计量。M2 也已于 2026-08-24 交付：State cold compile 生成 reducer direct plan，
hot commit 只访问 subscribers/touched owners 并一次 materialize aggregate State；每个 Vite dev server
又共享一个 lazy metadata-only authoring index，cached lists 零读盘，单文件失效只重读/admission 该
record。M3 也已于 2026-08-24 交付：默认 Player 只保留必要 GUI，DevDock/preset settings 由 focused
reference subpath 显式组合，真实 minimal/reference/Inspector/Agent entries 提供最终图正负证据。
M4 也已于 2026-08-24 交付：一次 bounded admission 产生 normalized Authoring Scene IR，deterministic
compiler 将 ordered layer/object hierarchy 降为既有低层 Scene/runtime plan，并把 inspection/source map/
interaction facets 留在 authoring sidecar；显式 `authoring_scene`/`low_level_scene` authority 不猜测或双写。
普通 Stage reconcile 与 exact-rebootstrap Session command 把 paint-order 变化带入 Browser R2 successor，
不替换 adopted Snapshot 或新增 writer。保留的 index-scale profile 已覆盖 1,000 scenes/50,000 objects，
仍只保留 metadata 与 path-local invalidation；该交付没有提升 Desktop HMR。M5 于 2026-08-25
交付 Inspector-first replacement：standalone 与 embedded shell 共用一个 Authoring Host，按需列出并
virtualize Authoring Scene 与 layer/object 层级，以真实 Stage preview 呈现场外/透明对象的可选择 ghost，
通过既有 structured operations、document session、history 与 CAS 完成有限的 transform、appearance、
Visual ambient binding/phase 和顺序编辑，并提供只读 hit-region、Motion definition/cue/其他 binding、
Timeline、interaction/GUI intent、source provenance facet 与 parallel-channel scrub。旧 Studio route、五
workspace shell、Story binding 与只保护旧 UI 的测试已退出
维护面；Host、CAS、R1 publication 和 private Agent companion seam 保留，普通 Player 仍排除 Inspector/
source writer。该交付没有提升 Desktop HMR。M0–M5 现已完成。

2026-08-25 所有者以百万词/百倍 Scene、Scene/Region 任意 count caps、React/CSS code-native GUI、
按需加载、i18n 与 Mod 组合需求完成后续 checkpoint，并接受
[Scalable Authoring, Addressable Runtime, and Mods V1](plans/2026-08-25-scalable-authoring-addressable-runtime-and-mods.md)
作为当时的 current engine lane；目标合同见
[Scalable Authoring, Addressable Runtime, and Mods V1](proposals/scalable-authoring-addressable-runtime-and-mods.md)。
顺序为 M0 capacity contract reset、M1 orthogonal GUI composition/Code Surface、M2 addressable
Scene/Narrative/GUI/code/content units、M3 Runtime Inspector facets、M4 locale-addressable i18n，以及
M5 private/build-known/application-local Mod Runtime。M0–M5 已于 2026-08-25 交付并关闭；M2 已把
type-specific Scene/Narrative/GUI/text leases、literal Code/asset owners 和一个 Web readiness seam
接到 Engine Lab；M3 又交付 application-owned read-only runtime projection、Code Surface inspection/
lifecycle facets、detached standalone summaries 与 embedded live observation。M4 locale-addressable i18n
是同一 Text session 上的 locale variants/fallback/atomic profile activation；M5 只增加 private、
immutable-per-generation composition，复用 Direct lifecycle，并由 application 将 ordered active identity
接入既有 BuildIdentity。作品重写与 SillyOS 现在可在本轮关闭后评价，但尚未自动开启；本轮验收
只用小型原创/生成 conformance 和既有 raw benchmarks。public Mod resolver/ABI/SDK/distribution 与
untrusted sandbox 仍未激活；Desktop HMR 未由该 lane 激活，后来于 2026-08-28 通过独立 stable
revalidation 后开放显式维护入口。

2026-08-27 插入并交付关闭 [Narrative Aside V1](plans/2026-08-27-narrative-aside.md)：Base
提供 commit-only、zero-authority 的 typed aside page push channel，UI 提供本地分页与权威对话到达时的
force-dismiss 控制器，Story 继续拥有像素；Engine Lab 的 jsdom 与真实指针 evidence 覆盖 hold 运行中插话、
分页、`when` 改道退出和零语义 dispatch。Aside 不进入 State、Save、digest、replay 或 History，也不改变
pending、hold 算术、resolution legality 或 stage-input policy。

排序与交付记录以
[Production-floor sequence](plans/2026-07-30-production-floor-sequence.md) §1
为准；稳定 promoted capability 以 [features](features.md) 为准，AR4 private provisional seam
仍以 Application Runtime plan closure 与 live architecture 记录，不提前进入 features。

2026-08-18 新的外部规模证据激活了一个独立分支实验：
[Experimental composition kernel and State Runtime](plans/2026-08-18-experimental-composition-state-runtime.md)。
它以 cold-path composition façade 和中立 State Runtime 检验大型 State-heavy Story
的 capability composition 与 dependency locality；必须先用仓库内中性 workload 复现，并保持
唯一 State authority、Save/replay 等价与热路径预算。实验分支已完成 X0–X6.3：X6.2 注入唯一
Narrative integrity catalog，X6.3 将 concrete registries 收口到 frozen cold environment/direct
plans；初始 X1 引入的私有 Cordis wrapper 在 retain/remove checkpoint 证明当时的平面 wrapper
没有承担独立 scope/fiber 语义后已由 package-internal direct lifecycle 取代；该历史 checkpoint
没有回答 editor nested ownership/provider recovery 的总成本，后续 AR1 已用两个真实 GUI
consumer 与同一 17-case suite 完成裁决并选择 Direct。X7 的中立 3x3 matrix、隔离 GC
trend 与外部两场景 paired evidence 也已完成且通过 stop gate。探索历史保留在
`codex/experimental-cordis-state-runtime`，经验证的最终树由
`codex/promote-composition-state-runtime` 重组为后续主仓开发基线；这仍不自动激活 Mod ABI、
State Format V2、Effect Broker/OpenUI、独立的 i18n/message-catalog lane 或 production Story
migration，未激活层不构成新的 release blocker。X7 证明 Composition 开销很低并刻画
whole-Snapshot 规模成本；若真实 replay/fast-forward/Save latency 成为产品问题，先 profile
authoritative replay 的重复 canonicalization，再讨论改变 State 格式。
2026-08-22 吸收 parallel-monitors 后，实验 State façade 同步改用 Base 唯一的 domain-event
journal/reducer transaction；早期 proposal/fact shape 只保留为历史 checkpoint，不建立兼容层。

2026-08-18 所有者以新的产品方向证据接受并于 2026-08-23 完成
[Application Runtime and Embedded Authoring V1](plans/2026-08-18-application-runtime-embedded-authoring.md)
作为本轮默认/core lane：AR0 已建立 Browser/Deno Desktop startup/dependency floor；AR1 已用中立
17-case suite 比较 direct 与 Cordis-core-derived private lifecycle，选择唯一 SillyMaker-owned
Direct backend，并删除 Cordis adapter/vendor/dependency。AR2 structured authoring operations 已于
2026-08-22 交付关闭；AR3 stable-sibling embeddable Authoring Host 与 AR4 private typed RPC/
experimental Agent Host/UiArtifact fake vertical slice 也已于同日交付。AR5 build、Browser GUI Host、
lifetime 与 performance promotion 及 AR6 closure/owner checkpoint 已于 2026-08-23 交付关闭。目标合同见
[Application Runtime and Embedded Authoring](design/application-runtime-and-embedded-authoring.md)。
Application Runtime 本轮只交付引擎基础设施；2026-08-25 Scalable Authoring /
Addressable Runtime / Mods 后继计划也已交付关闭。同日所有者随后接受
[Adaptive Viewport & Layout Variants V1](plans/2026-08-25-adaptive-viewport-layout-variants.md)
作为下一条有界 engine lane，并于同日交付关闭：补齐 accepted GameViewport design 中的单轴扩展画布和
container-size 声明式 layout variants，并以 Engine Lab 中立验证为后续完整 Reference Product target
uplift 提供基础。它没有激活 continuous Input、renderer/asset framework 或 Desktop workflow。所有者随后
显式选择并于同日完成 [Cards Reference Application](plans/2026-08-25-cards-reference-application.md)：完整
重实现 PocketJS Cards 0.6.0，以真实 consumer 交付中性 GUI-only Host/config 与 focused final graph，关闭
产品预算、独立审查和 Starter feedback。它只领取真实 consumer 证明的窄 correction，不激活 source
migration framework、project symbol graph、Prefab、scaffold CLI 或 Desktop workflow。2026-08-26 官网 Console
接替可见 GUI Composition/Input 展示、tooling-owned GUI-only fixture 接替 Host startup/final-graph conformance 后，
Cards 独立产品与 `/play/cards/` 退役；历史完整产品与性能证据保留，不再作为 workspace application 或维护中
example。随后对下一 Reference Product 的只读 Host audit 暴露三个跨产品缺口，所有者于 2026-08-26
接受 [Neutral GUI Host Readiness、Close 与 Optional Desktop Companion V1](plans/2026-08-26-neutral-gui-host-readiness-close-companion.md)
作为当前有界 engine lane：一个 application-owned required-readiness latch、一个 product-selected close
participant，以及一个 build-known/exact-target/package-private Desktop direct-child transport。三项实现已
通过 focused、Browser、native preview 与 repository validation 并关闭；该 closure 本身没有自动激活后继
Reference Product 或 engine lane。该 lane 不定义产品 RPC protocol，不让 Browser 依赖
本地 companion。该 lane 当时不改变尚未完成的 Desktop HMR stable revalidation 与 Desktop production
promotion；前者后来于 2026-08-28 独立关闭并开放显式开发入口，后者仍保持独立、条件性，只 gate
Desktop production claim，不阻塞 core 或其他工作。

2026-08-27 所有者另行接受
[《最后一次试音》](plans/2026-08-27-vn-reference-tour.md) 已完成当前产品车道的 M0–M5，并成为维护中的旗舰
Reference Product。它从 tracked Template 起步，
以原创、完整、紧凑的可发布短篇验证 SillyMaker 当前推荐的 Visual Novel authoring、Narrative/Stage、
Player QoL、Save/rollback、audio、locale-addressable content、responsive Input 与 Inspector/human/Agent
handoff。它只选择 VN 产品真正需要的能力，不是全引擎 API gallery，也不建立 Ren'Py DSL、Save 兼容、
custom interpreter、公共 VN framework 或最终编辑器。M0–M1 已交付独立 WIP package、冻结产品分母、
supported-export/application shell、未选择 starter domain 的 clean deletion，以及完整双路线剧本、两个
Authoring Scene、作者数据和两条 named headless simulation；M2 已交付并关闭，引擎维护的 focused default VN Player
已经由 Template 与该产品共同选择，对话/选择 chrome、say-only 全画布推进、History/播放控制、贴底布局、
Ctrl/Tab/H/V/鼠标中键、竖屏布局、最终媒体/音频、rollback/end controls 与完整产品矩阵均已完成。M3
Save/recovery/settings 也已关闭：产品入口与默认 VN system menu、quick/manual/import/export、完整最小
Settings/live locale、normal-dispose exact flush、已持久化 autosave reload、return-to-title/Continue，以及
Web hidden presentation-time exclusion均有分层证据。Browser `pagehide` 仍只是同步 fence + best-effort flush，
不承诺最后一刻异步 IndexedDB durability。M4 已交付 ambient binding/phase 的 Agent 与所有者授权
Computer Use-assisted participant Inspector/CAS 接手，以及 workstation Browser/build/static-Desktop/
accessibility/silent-run/raw-performance 证据。独立审查发现历史 59 unique / 44 per route 虽满足计数却不能
支撑冻结的 10–14 分钟阅读分母，当前候选已修正为 110 unique / 82 per route，并按最小视口分页。独立
engine review 与 Starter feedback classification 已完成：产品 E2E 的 private import 泄漏已删除，没有新的
中立 engine gap，也不需要追加 Template 改动。独立 product re-review 也已通过且没有 product-integrity
blocker。2026-08-29 所有者因没有合适设备，取消代表性真实 current-low-end qualification 作为本产品完成门槛；
该资格未执行、未通过，也不形成低端设备支持声明。M4 按缩减后的证据范围关闭，M5 已完成旗舰、current docs、
产品 metadata 与 workspace/build/deploy/site 接线切换，但不声称远程 live deployment。Cat Cafe 已在
本轮开始前独立终止，应用、revision-1 Save 支持、产品 E2E 与 live 发布责任同步结束，不做跨产品 Save 迁移
或兼容 wrapper。VN 完成后的独立评审已显式退役 Bookshop；维护的产品例子是 SillyOS 与
`examples/vn-last-sound-check`。

此前同日接受的
[Electronic Pet Reference Product](plans/2026-08-27-electronic-pet-reference-product.md) 已由所有者停止且未
完成。M0–M2 与当时已提交的 M3 切片继续作为真实历史证据；剩余 M3、M4、M5 不再交付，不能推导完整产品、
Cat Cafe 接替或通用 3D engine promotion。额外 WIP 仅存于 `codex/archive-electronic-pet-m3-wip`，不属于
当前路线或活动实现 authority。

Desktop Host persistence 是独立、条件性的 promotion lane：目标平台是
macOS、Windows 与 Linux，当前 live wrapper/file channel 已是可用 preview，真实
Host evidence 主要来自 macOS；三个平台都尚未完成各自 production
promotion。只有某次发布要在某个平台宣称 desktop capability 可生产时，才必须在该
发布 stabilization 前完成对应 evidence。Durability 需要 batch
crash-atomic、cross-process CAS 与旧记录迁移；packaging 需要该平台真实 package
build/launch/reopen smoke。平台逐项 promotion，durability、packaging 与
auto-update 分轴记录；packager/updater 缺口不阻塞 backend durability。只有产品要
宣称 packaged app 使用 atomic persistence 时才同时要求前两条 evidence。它不阻塞
默认核心顺序。下一 durability slice 是 D1b：在执行时 latest stable Deno 上冻结
SQLite operational contract；除非出现 concrete blocker，不再把 journal/KV 对照
作为选择前置。

独立 focused plan（CI0/AUTO0 两个小切片由 production-floor sequence 的 PF0.1
直接拥有）：

- [Desktop persistence durability](plans/2026-07-30-desktop-persistence-durability.md)
- [Snapshot commit performance](plans/2026-07-30-snapshot-commit-performance.md)
- [Save migration](plans/2026-07-30-save-migration.md)
- [Managed Surface lifecycle](plans/2026-07-30-surface-contract-harness.md)
- [Authoritative determinism guardrails](plans/2026-07-31-authoritative-determinism-guardrails.md)
- [Authorable Motion Workbench](plans/2026-08-13-authorable-motion-workbench.md)（2026-08-13
  接受并完成）
- [VN Scene Workspace](plans/2026-08-14-vn-scene-workspace.md)（2026-08-14 接受，
  2026-08-15 完成）
- [Authoring Architecture](plans/2026-08-15-authoring-architecture.md)（2026-08-15
  接受，同日完成）
- [Authoritative hold clock](plans/2026-08-19-authoritative-hold-clock.md)
  （2026-08-19 接受，同日完成）
- [Parallel monitors](plans/2026-08-20-parallel-monitors.md)（2026-08-20 接受，
  同日完成）
- [Authorable frame set](plans/2026-08-21-authorable-frame-set.md)（2026-08-21
  接受，同日完成）
- [Shaped hit regions](plans/2026-08-21-shaped-hit-regions.md)（2026-08-21 接受，
  同日完成）
- [Hold when](plans/2026-08-21-hold-when.md)（2026-08-21 接受，同日完成）
- [Mid-hold input](plans/2026-08-22-mid-hold-input.md)（2026-08-22 接受，同日
  完成）
- [Authorable chrome layout](plans/2026-08-22-authorable-chrome-layout.md)
  （2026-08-22 接受并完成 M0–M2；2026-08-29 完成证据门后的 M3）
- [Shared stage input](plans/2026-08-26-shared-stage-input.md)（2026-08-26 接
  受，同日完成）
- [Narrative aside](plans/2026-08-27-narrative-aside.md)（2026-08-27 开启，同日
  完成）

原则是**一次只迁移一个可独立验收的 authority**。不接受把 Surface、Save、
Snapshot 数据结构、determinism guard 或 Mod resolver 作为一个大改动交给 Agent。

## 5. Strategic track A — deterministic runtime at scale

**Outcome:** 经营、战棋、ATB 和长期伴侣的大状态小改动不再被整树工作阻塞，同时保持原子提交、确定性、replay 与可诊断失败。

### A1 — completed: digest/serialization dedup

已建立 100/1k/10k/100k entity、长序列、autosave、replay 与内存 workload，并在
不改变 canonical/digest/Save/replay 语义的前提下完成 Session、CommandLog 与
Persistence 的 digest/serialization 去重。常规测试锁确定性次数和 byte
equivalence；wall-clock、memory 与 profile 只作临时趋势证据。普通 committed
command 仍保留一次完整 digest，但 installed Snapshot 不再整树冻结；runtime
immutability 遵循普通 JavaScript/TypeScript `DeepReadonly` 合同。

当前没有已接受的真实经营 Story 性能预算，100k 中性 profile 与 memory/GC 也不足以
激活 A2。该 evidence limitation 不阻塞 production-floor 核心顺序进入 Managed
Surface pilot。

### A1b — completed: authoritative determinism guardrails

[Deterministic simulation boundary](design/deterministic-simulation-boundary.md)
把保证收窄到受支持的 authoritative transition，而不是任意 JavaScript：

- authoritative wire 继续只允许 safe integer numeric values；Presentation/Host
  可以使用有限 binary64，但不能暗中回写玩法；
- network、LLM、wall clock 与系统 entropy 只有先变成 validated canonical
  command/resource identity 才能影响规则，replay 不重新调用 oracle；
- 修复 xorshift32 zero absorbing state，并在 executor/log 前封住 normalized
  command、events、rejections、stable fault/RNG evidence；
- 修复 Strict JSON 先转 binary64 导致数学小数可能舍入为 safe integer 的 token
  admission gap，同时保持 canonical output/digest 不变；
- 将 Story-owned `createBootstrapInput` 限定为显式 entropy ingress adapter，并在
  authoritative `createInitialState` 前由 Core 对整个 output 做一次 detached canonical
  admission，不新增 public bootstrap schema/envelope；
- 从 root application registry fail-closed 建立真实 authority closure，以现有
  BuildIdentity managed simulation records 为 dependency seed，并补齐 simulation
  callback owner 与显式 authority entry；再用 path-aware static guard、isolated
  test tripwire 与 Deno/Chromium/Firefox/WebKit 逐 command matrix 提供纵深证据。

Corrective promotion 又把 Date allowance 收窄为 conservative syntactic safe-set，统一
parser-backed dynamic import/CommonJS ownership，以 package-internal integer UTC parser 隔离
wall-clock metadata，并在删除 superseded broad provenance/evaluator 后复核完整 DET3b guard
inventory、重跑四 runtime matrix。该边界不定义 gameplay calendar，也不是不可信代码 sandbox。

PF-DET 排在 Workspace Overlay pilot 后，并与 Save 按
`DET0-core -> M0a -> DET-A -> (DET-B || callback-free M0b/M1) -> same-HEAD join -> M2`
执行。DET-A 单独不是完整 promotion；DET-B/M1 same-HEAD join 已关闭，M2 从该 joined
baseline 继续。该 track 不引入
`decimal.js`、通用 FixedPoint package、named/keyed RNG、production Worker 或 Mod
sandbox；这些仍须真实需求、版本化 wire 与 migration 证据后另行激活。

### A2 — evidence-gated integrity policy

只有 A1 后真实 workload 仍超预算，才接受专门 design，比较：

- every-command / checkpoint / module-root / off digest；
- full / changed-module / boundary validation；
- module revision、changed-set、structural sharing；
- typed StateStore 与现有 module state 的交互。

不重新引入自定义 runtime freeze policy；使用者通过 cast/hack 修改 engine-owned
对象属于未支持行为。

全量 canonical digest 保留给 Save、checkpoint、replay verification 与 debug export。未经 profiling 不改写为 ECS，也不只替换 SHA 实现冒充优化。

### A3 — scheduler and simulation workloads

在真实品类出现后建立：

- time/economy scheduler；
- ATB/half-turn clock；
- battle effect/trigger sequence；
- grid/path/LOS workload；
- offline companion progression。

它们先是 Story/module workload，再决定是否提升为 engine capability。每个 workload
必须区分纯表现 clock 与 authoritative scheduler time；headless fast-forward、玩家加速
或跳过只能 settle 表现 dwell，或按完整 duration 以相同顺序确定性 catch up 权威事件，
并证明 normal/accelerated 的最终 Snapshot、Save/replay bytes 与 RNG evidence 等价。
若玩法刻意让加速改变结算，它必须是独立 semantic command，不能伪装成播放器偏好。

## 6. Strategic track B — Save compatibility and release engineering

**Outcome:** 任意声明支持的历史 Save 都有真实 fixture、可检查、可迁移、可加载；升级不靠“希望 schema 兼容”。

- bounded envelope shell 与 Strict JSON 限额；
- adjacent revision pure migration registry；
- migration/adoption/CommandLog compatibility 分轴；
- new replay anchor；
- dry-run、backup、玩家可读结果；
- Engine Lab + 正式产品 fixture corpus；
- CI 全量 migrate/validate/load/round-trip。

Save migration 先于 Mod per-namespace migration；后者只能复用该管线，不另建第二套。

## 7. Strategic track C — Managed Surface and UI correctness

**Outcome:** Overlay、System dialog、Dialogue、History、whole-canvas page 与未来 workspace surface 的 lifecycle/input/focus/dismiss/readiness 只有一个 transient authority。

- Coordinator 只拥有 runtime topology，不拥有 gameplay/document/workspace 持久状态；
- stable owner target reconcile 成 instance；
- immutable publication 原子绑定 topology、input/focus owner、dismiss、readiness；
- stale instance/topology/semantic occurrence/gesture 明确拒绝；
- public Narrative definition/Story renderer、package-private player 与 production Host 分层；
- DOM/browser adapter 处理 focus/inert/top-layer/pointercancel/visibility；
- structural check、pure model、seeded shrink 与真实浏览器共同验证。

PF2 Coordinator MVP 不引入 universal application receipt。PF6
AI-friendly promotion 时，声明 presentation postcondition 的 action 必须组合分层
evidence，并能返回 `postcondition_failed`；普通 action 不统一 envelope。弱模型
canary 用于冻结作者 API，不阻塞每个 runtime migration commit。

System dialogs、Workspace Overlay、Narrative/History 与 WholeCanvas 已共享同一个
composition-owned Managed Surface authority，没有平行 writable lifecycle。Narrative
通过公开 definition factory 进入一个 production Host，并绑定同一 Semantic Stage
authority；Engine Lab、Template 与 One Last Sound Check 是当前消费者，已退役的 Bookshop/Cat Cafe
只保留历史迁移证据，SillyOS 显式省略。
WholeCanvas 通过公开 definition 或 narrow application source 进入同一 kernel；
Splash/Title 属于 package front door，Engine Lab opt-in route 是当前消费者；已退役的 Cat Cafe
ending 只保留首个产品消费者的历史证据，SillyOS 继续省略。S4b.1c、PF5/M3、Complexity Reset 与 PF7 stabilization 均已
完成；PF6/S5 broad harness 经真实作者纵切复审后没有激活。当前顺序只由
[production-floor sequence](plans/2026-07-30-production-floor-sequence.md) 拥有。

## 8. Strategic track D — content platform and creator tooling

**Outcome:** 大量数值、文本、关系和素材可由人类/Agent 安全编辑、验证、查询、构建和定位来源，而不把数据库变成第二 gameplay State。

### Data planes

```text
Authoring Content DB
  static characters/items/skills/events/text/asset indexes

Authoritative Snapshot / module state
  mutable run state, only through commands

Host persistence
  saves/settings/profile/cache

Editor/project/asset index
  search, dependency graph, thumbnails, build cache
```

### Content compiler

按真实规模逐步交付：

- JSON/YAML/CSV/spreadsheet/editor import；
- schema、FK、localization 与 asset validation；
- generated typed client；
- declared primary/secondary indexes；
- read-only content packs；
- digest/patch manifest/source map；
- query explain 与 authoring diagnostics。

Prisma 风格只借鉴可发现、type-safe 的 query ergonomics；runtime 不引入通用 ORM/SQL transaction authority。SQLite 可用于 editor/project index 或 authoring backend，正式 runtime 优先消费编译后只读 pack。

### Tooling status and Inspector authoring

已交付的基础包括 `app check/inspect`、Narrative graph viewer、通过
`app simulate` 运行 named scenario（含 `--trace`）与 `app diff`，以及
capability-gated debug command 合同和 DevDock 面板。它们不再作为未来 editor
工作的前置待办。Motion Workbench（原顺序第 2/3 项）与 editor shell（原第 6 项）
分别由 [Authorable Motion Workbench](plans/2026-08-13-authorable-motion-workbench.md)
与 [VN Scene Workspace](plans/2026-08-14-vn-scene-workspace.md) 以窄纵切交付。

2026-08-25 起，当前维护的作者产品面是一个聚焦的 **Inspector**，不是旧 Studio 的 workspace
rail，也不追求旧五 workspace 的 feature parity。standalone `/__sillymaker/inspector/` 与应用内 lazy
surface 是同一 Authoring Host 的两个 shell；每个 mount 拥有自己的内存会话，但复用同一 Host、
Authoring Scene source IO、document session、structured operations、CAS/history 和 persistent R1
publication。Inspector 当前只承担有持续价值的最小工作流：

- scene 搜索与固定窗口 virtualization，当前 scene 的 layer/object hierarchy 搜索与 virtualization；
- tree/真实 Stage preview 双向选择，以及场外、透明、group 对象的可见 ghost/inspection bounds；
- package-private revision-fenced operations 上的 transform、visual content/已有 appearance key、同级
  object 与 layer 顺序有限编辑；
- 只读 hit-region、Motion、Timeline、interaction/GUI intent、JSON-pointer source provenance 与
  compiled-layer facet，以及 Motion/Timeline parallel-channel scrub；
- 通过现有 Authoring Scene CAS 保存；冲突刷新 saved baseline，保留 dirty draft/history 供显式重试。

旧 Studio route、Scene/Motion/Regions/Chrome/Flow workspace、Story `StudioBindingV1` 和只保护旧 UI
的测试已删除。其已经证明并仍有消费者的中立 substrate 没有删除：Authoring Host、project index、
shared document session、source IO/CAS、structured operations、persistent R1 publication 与 private
single-Agent-companion seam 继续存在。Regions/Chrome 文档、Motion Workbench 和 Narrative Flow 投影可
作为底层/专门工具能力保留，但它们不是当前 Inspector workspace；若未来重新提供可写专门编辑器，
必须由真实作品证据和单独合同激活，不恢复兼容 shell。Scene Timing Sheet、gameplay data grid、UI
layout、Save/migration inspector、卡牌/SLG/战棋域工具与 `story doctor` 继续 evidence-gated。

这一 clean break 吸收了已完成的 Authoring Architecture、Application Runtime AR1–AR5、Workspace
Focus 与 Scale M5 的可复用结果，而不否认其历史交付。普通 Player final graph 排除 Inspector、
Authoring Host/source-write 与 Agent/RPC；只有 Engine Lab 的显式 private Inspector companion entry
选择 Agent seam。Desktop adapter 仍 package-private、explicit、default-off，本节没有启用 Desktop
HMR 或 production promotion。

Editor 写普通 TS 或被 TS 引用的稳定数据（JSON 文档经严格 admission），不形成另一
种运行时语言。

## 9. Strategic track E — genre capabilities

**Outcome:** 多品类共享真正通用的机制，但 `base` 不膨胀成所有玩法概念的合集。

Story-local 的 narrative/VN、management/time economy、combat、card、
JRPG/ATB、grid tactics 与 companion 可以随真实产品持续实验。只有被第二消费者和
发布需求证明后，才把共享边界提升为 engine-level capability/package；production
floor 延后的是这种通用化，不是 Story 玩法开发。

2026-08-29 完成的 VN lane 是这条规则的第一个 first-party genre promotion：`@sillymaker/vn` 只组合 interaction
document/compiler/runtime policy 和 focused React entries，Base 继续拥有 Narrative/State/Save/replay，UI
继续拥有 Managed Surface/Stage/Input primitives，产品拥有自己的 predicates/effects/content/theme。Template
与 One Last Sound Check 是两个消费者；不允许 product-local kit 的近似复制继续并存。History State 与 History
presentation 分离，后者是首个可独立选择、延迟加载和卸载的 optional VN Mod。

### Shared combat core candidates

- battle lifecycle；
- actor/team/stats/modifiers/cost/target query；
- ability/action/effect；
- deterministic RNG；
- status/trigger/interrupt/reaction timing；
- battle event log；
- visual intent；
- AI observation/action port；
- replay/checkpoint/headless balance runner。

Deck zones、grid topology、LOS/fog、ATB clock 分属 adapter，不进入共同 core，除非多个品类证明同一语义。

### Required reference workloads

- production VN；
- 1k+ actor management SLG；
- deckbuilder；
- JRPG/ATB；
- tactical grid；
- companion；
- Agent workspace。

一个 example 完成 product/reference lane 时，必须成为独立、内聚、可发布的完整产品和架构验收 workload，
而不是 API gallery。目录中的 WIP/experimental entry 必须明确标记未完成，且不得借用已关闭产品的完成度声明。
完成目标可以是原创产品，也可以是具名原型的高保真完整重实现；primary baseline 必须是整个具名
application/version 或覆盖其完整可观察产品的 commercial clean-room specification，不能选取章节、
地图、路线、模式或功能子集作为完成分母。其用户可观察行为、内容广度/规模和产品深度就是最低
完成合同。SillyMaker 版本可以增加功能、内容和打磨，但不能用新增炫技抵扣基线缺项，也不能用一个
完整循环或纵向切片冒充完整产品。原型不支配源码、模块、品牌或素材表达；只有预先接受的目标
Host 不可能项可以裁剪，许可限制使用原创/兼容替代。引擎表达不足、性能问题和实现成本必须作为
未完成项或 engine gap 暴露。

完整性 baseline 约束功能、系统、内容覆盖和体验角色，不要求继承原型由 retro、嵌入式或低功耗
硬件造成的低分辨率、固定布局、输入、素材精细度或内容密度上限。每个此类 example 必须另行接受
target-platform uplift，面向 Browser 覆盖的当前低端至主流手机/平板/电脑和 Deno Desktop 当前的
电脑场景，重新设计响应式/高 DPI 布局、相关 touch/pointer/keyboard 输入、accessibility、兼容
视觉/音频素材、内容深度与打磨。产品可以更丰富，实现仍保持简单、可读，并优先采用成熟的
React/Web 生态依赖。可用算力、分辨率、存储和内存是预算，不是必须用满的配额；以当前低端
目标为 floor、保留余量，并用按需/addressable loading 控制首包和常驻 working set。

下一轮实现遵循固定反馈循环：先为已经确认的跨应用 readiness 接受并关闭一条有界 engine plan；
随后一次只实现一个完整 reference application；收口时分别进行 product review 与 engine review，
把发现分为应用领域问题、文档/recipe/API ergonomics、可复用的可选 integration，以及可复现的
通用引擎合同缺口。只有经中立复现的最后一类才可以提出 focused engine plan；可选 integration
也必须先证明独立维护价值。引擎修正后，当前 example 必须迁回推荐路径再关闭。单个 example 可以揭示
缺口，但不能替代中立合同测试、第二消费者和本路线既有的 public promotion 要求；后续 example
清单不是自动 backlog。

## 10. Strategic track F — presentation and renderer adapters

**Outcome:** 在不污染 authoritative State 的前提下扩展演出、2D scene 与媒体能力。

现有 semantic stage、typed Timeline、transition、audio、asset readiness 是 adapter 边界。目标数据流：

```text
Snapshot
  -> SemanticPublication
  -> VisualIntent / Timeline cue
  -> renderer-local scene state
  -> DOM / Canvas / WebGL
```

DOM 默认承载文本密集 HUD、对话、菜单、设置、复杂窗口和 accessibility；Canvas/WebGL 承载地图、角色、棋盘、卡牌桌、粒子和场景动画。

优先级：

1. bounded scene graph 只在扁平 Stage 被真实 Story 证明不足时扩展；
2. 第一高级 2D adapter 倾向 renderer-only 集成，避免引入第二套 scene/input/clock authority；
3. video、Rive、Live2D、2D skeletal 按项目需求选择；
4. 3D/WebGPU 在明确商业项目和性能原型前不进入 core roadmap。

Save 只存 stable semantic target，不存 renderer instance、decoded media 或播放进度。

成熟 Canvas/WebGL、虚拟化、3D/VRM、物理和媒体库首先作为应用的普通依赖使用。只有出现稳定、
可复用的 SillyMaker-specific 输入、资源生命周期、Code Surface、Host 或 Inspector 映射时，才在
首个真实消费者中提取 `contrib/*` 可选 integration package。Core 不依赖 contrib，产品未选择时
该 integration 不进入最终 graph；`contrib` 是所有权和独立维护边界，不因目录或 package 形态
自动成为 Composition plugin 或 public Mod。真正需要独立选择、生命周期、冲突与结构排除的 integration 可以
消费已经交付的 focused public Mod API；更广的 facet SDK、distribution/install、authoritative R2 与
post-release trusted code 仍由 Track H 的独立 gates 与后续 accepted plan 决定。

## 11. Strategic track G — companion, Agent and GenUI

**Outcome:** SillyMaker 的 semantic/application contracts 可作为 Agent 产品 UI，但模型只能操作注册能力，不能取得任意 runtime 权限。

推荐边界：

```text
Model stream
  -> GenUI parser/schema validation
  -> component/action allowlist
  -> capability + approval policy
  -> Managed Surface / Workspace
  -> typed semantic/workspace intent
  -> authoritative owner
```

OpenUI 等 renderer-agnostic streaming UI 可作为 adapter，不进入 Base。模型读取 approved
immutable publications；对 authoritative、durable 或 external state 的修改必须经过 typed
tool/intents、permission、idempotency 与 queue-front revalidation。模型不取得 `GameSession`
mutable reference、数据库连接、文件系统、任意网络 client、任意 React component 或 HTML/JS
execution。

AR4 最初交付 transport/provider-neutral、package-internal 的 Agent RPC client/Agent Host/
`UiArtifact` lifecycle seam，并以 deterministic fake 对本地 revisioned authoring draft 验证；closed
renderer 只接受 admitted `column`/`text`/`action` data 与 allowlisted actions，late/invalid successor
保留 predecessor；需要 AR2 receipt 的 action 在 exact pairing 前保持 inert，Scene 稍后 ready 可补配。
2026-08-30 完成的 neutral handback lane 已将其中中立的 Session/Run client 与 connector 提升到
`@sillymaker/agent/session`。公共 connection 提供无参 `start`、text `submit`、`cancel`、awaited
`close`，以及中立、无原因的一次性 `whenClosed` lifecycle signal；后者由同日完成的独立
[Agent Session 异步断连收口](plans/2026-08-30-agent-session-asynchronous-connection-loss.md) lane 补齐。
公共 stream 只包含 `output_text_delta`、bounded Strict JSON `output_data` 和 Run terminal events。
raw request/request ID/wire/provider、connection generation 与产品恢复策略不公开，private Host 才把
`output_data` 解释成 `UiArtifact`。fake 不保存文件、不提交 authoritative state、不执行 external effect，
因此没有激活独立 approval/receipt subsystem。真实后台/LLM、provider connector、`UiArtifact`
persistence 与具体 OpenUI/A2UI adapter 必须由后续 owner-selected 产品计划单独激活，不能从 Track G
直接领取。SillyOS 已使用产品自有 connector 完成公共 Session 消费者迁移，但该迁移
未激活上述 bootstrap、附件、OpenUI 或其他候选。
required service 不可用时，依赖 domain 不得谎报 ready，但 GUI 必须保留诊断和 retry；外部
service 不是 plugin，也不取得 Session/FilePort authority。AR5 只 promotion 这份 fake seam 的 Browser
GUI Host/build/lifetime/performance evidence，不把上述 defer 偷渡为 live capability。已关闭的
AR5 用 neutral single-companion split 和正/负 Author-entry measurement 完成 authoring-only/no-Agent
final module/source graph 的 structural exclusion，并取得 Browser physical lifecycle 与日期化同机
performance evidence；该里程碑 runner 已删除，长期 benchmark 只输出原始测量。Engine Lab 的
Inspector binding 通过 private single-companion entry 显式选择 Agent，普通 Inspector/Author graph
不因此包含 Agent/RPC，
Deno Desktop private adapter、bounded preflight 与 selected-canary characterization 也已完成；
Deno 2.9.6 随后在 2026-08-28 通过 release-source、中立合同、真实 workspace launch、同窗
native HMR 与正常关闭的 stable revalidation。维护中的 `app desktop-dev` 现在显式选择该
package-private adapter，普通入口仍 default-off；preflight、canary SHA 检查和一次性测试已删除。
这只激活 Desktop development workflow，不构成 Desktop authoring、persistence、packaging、signing
或 multi-platform production promotion。

2026-08-26 的 neutral GUI Host lane 已交付关闭，把缺失的平台接缝收敛成三条正交能力：

- GUI 产品可以先提交可操作的 recovery/configuration UI，再由一个 application-owned latch 把 required
  domain 首次推进为 ready；没有 latch 的静态 GUI 保持即时 ready；
- 一个 product-selected close participant 负责 fence 与 async preparation，Host 不枚举数据库、RPC
  client、Extension 或 React descendants；
- Deno Desktop package 可以按 exact target 显式选择最多一个 build-known private direct child。只有
  该 package stage artifact/Host 并取得 `--allow-run`，无 companion package 保持零 subprocess 权限和
  零 companion Host 实现。现有 same-origin/capability HTTP ingress 只代理固定
  `/sillymaker/companion/*` namespace，
  product-owned typed RPC 继续拥有 schema、stream、retry 和 readiness。

Deno 2.9.5 无法用启动时解析的 scoped `--allow-run=<name/path>` 授权运行期从 compiled VFS 物化到随机
绝对路径的 artifact，因此选中 companion 的 preview package 使用 unscoped permission；该明确 tradeoff
不构成 production security、signing 或跨平台资格。关闭顺序保持 renderer product fence/prepare →
Host ingress drain → child stdin EOF/exit 0；只管理直接 child，不增加通用 subprocess API、process-tree
supervisor 或 public companion/RPC ABI。Browser 外部服务仍直接通过 admitted endpoint 的 typed client
接入。该 transport 与 Desktop HMR 无关；后来关闭的 stable HMR activation 没有改变 companion
transport 或 production qualification。

Agent workspace 需要 tab/split/task/approval/artifact/history 等独立领域模型；不要把现有游戏 Overlay 膨胀成桌面 WindowManager。流式半成品是 transient presentation；只有完整验证的 document 可持久化，replay 渲染保存 document 而不是重新调用模型。

## 12. Strategic track H — Production Mod layers

[Production Mod V1 plan](plans/2026-08-29-production-mod-v1.md) 已激活并交付此前 incubation 中有真实消费者
支撑的两层。Stage A 是 focused public `@sillymaker/composition/mod`：应用在 build-time 显式选择可信 package
与 literal loaders，resolver 决定 dependency/conflict/collision 和 canonical order，runtime 冷编译
application-owned typed extension points，再通过既有 private Direct lifecycle 与 acknowledged selection
successor 管理资源。History presentation 是第一个真实 R1 consumer；仓外 tarball consumer 证明发布形态的
JavaScript、`.d.ts`、Deno/Vite/Chromium 可消费，而不是只在 `workspace:*` 中类型通过。

Stage B 的第一个产品纵切是 One Last Sound Check 的显式 Mod-enabled build：发布后的 bounded declarative
Artifact 只能覆盖该产品声明的 text/image slots，经过 exact target/version/story、资源和闭包 admission 后，
通过完整 Web application successor 应用。普通 build 结构排除 decoder/manager/Artifact。它不是通用安装格式、
任意代码宿主或第二套 State/Save/runtime。

active set 在每个 generation 内仍冻结；开发期 load/unload 通过候选 generation、publication acknowledgement
和 predecessor retirement 完成，不原地改 registry，也不在 command/reducer/render hot path 做动态 lookup。
production 产品可以显式包含同一扩展面，也可以完全结构排除。private Direct backend 仍不是公共 Context 或
service container；历史 Cordis adapter/vendor 保持删除。

以下能力继续 evidence-gated，而不是由本轮顺带宣称完成：

- 通用 post-release trusted-code Artifact、下载/更新/distribution protocol、marketplace 或 runtime npm resolver；
- authoritative gameplay Mod 的公共 R2 adapter、identity/Save migration 产品合同和真实经营/时间经济消费者；
- Deno Desktop package/production 资格与跨 Host 发布矩阵；
- untrusted extension isolation。若将来需要，必须使用独立 origin/Worker/process + typed RPC，而不是给 same-realm
  JavaScript 添加名义 sandbox。

后续晋级必须由真实产品证明所需权限、兼容/迁移、失败恢复、体积和性能预算；不得为满足 checklist 在简单 VN
中制造第二套权威玩法。

## 13. Evidence and promotion

能力从 roadmap/design 进入 `features.md` 必须同时满足：

1. owner 与 public contract 明确；
2. focused behavior/property tests；
3. 中性 Engine Lab 第二消费者；
4. Browser 与 Deno Desktop GUI 行为，以及适用的 prebuilt/reduced-skip/辅助 headless
   conformance 一致性；
5. 性能/兼容/可访问性等对应非功能证据；
6. superseded owner/API/glue 被删除；
7. live architecture/features/development/story-authoring/build docs 同步；
8. promotion record 记录未满足限制。

研究笔记、proposal、计划、模型生成代码、passing typecheck 或一次 demo 都不等于已实现。

## 14. Completed milestones and history

R0 设计基线、R1 Engine Lab/conformance harness、R2 AI authoring 与应用组合、R3 语义 VN 舞台、R4 媒体与玩家播放、R5 Typed Timeline、R6 DevTools 数据面、R7 rollback、R8 音频第一刀，以及 2026-07-30 的“应用即项目”、编号 Save slots 和 tooling guardrails，均以 [features](features.md) 和 [roadmap archive](roadmap-archive.md) 的记录为准。

历史任务计划：

- [vNext foundations](plans/2026-07-19-sillymaker-vnext-foundations.md)
- [R5–R7](plans/2026-07-28-sillymaker-r5-r7.md)

实现发现 live tree 与 accepted design 冲突时，先修订 design 并解释取舍；task plan 不得静默覆盖设计。
