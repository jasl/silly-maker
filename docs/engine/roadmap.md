# SillyMaker engine roadmap

状态：2026-07-19 接受，最近审查修订 2026-08-22。已实现能力以
[features](features.md) 为准；历史交付见
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

目标不是复制 Unity/Godot 的通用编辑器与 scene tree，而是建立一套可生产、可诊断、可回放、可迁移、适合人类与 Coding Agent 协作的专门平台：

```text
stable deterministic core
  + content/authoring pipeline
  + genre capabilities
  + renderer adapters
  + creator tooling
  + optional agent/genui workspace
```

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
普通静态游戏可以直接 mount 内聚 Game domain 并完全排除 dynamic extension backend。

直接访问 `window`、DOM、IndexedDB、内部 `src/**` 或未公开 store 不受兼容承诺保护。Story 可使用明确的 Host/renderer escape hatch，但它们必须在 package ownership、Save 边界和测试中可见。

## 4. Current execution priority — production floor

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
上述补缺 lane 至 2026-08-22 全部交付关闭；合并后当前默认/core lane 回到本文后述的
Application Runtime AR0–AR6，唯一 next task 是 AR0。排序与交付记录以
[Production-floor sequence](plans/2026-07-30-production-floor-sequence.md) §1
为准，live capability 以 [features](features.md) 为准。

2026-08-18 新的外部规模证据激活了一个独立分支实验：
[Experimental composition kernel and State Runtime](plans/2026-08-18-experimental-composition-state-runtime.md)。
它以 cold-path composition façade 和中立 State Runtime 检验大型 State-heavy Story
的 capability composition 与 dependency locality；必须先用仓库内中性 workload 复现，并保持
唯一 State authority、Save/replay 等价与热路径预算。实验分支已完成 X0–X6.3：X6.2 注入唯一
Narrative integrity catalog，X6.3 将 concrete registries 收口到 frozen cold environment/direct
plans；初始 X1 引入的私有 Cordis wrapper 在 retain/remove checkpoint 证明当时的平面 wrapper
没有承担独立 scope/fiber 语义后已由 package-internal direct lifecycle 取代；它不回答未来
editor nested ownership/provider recovery 的总成本。X7 的中立 3x3 matrix、隔离 GC
trend 与外部两场景 paired evidence 也已完成且通过 stop gate。探索历史保留在
`codex/experimental-cordis-state-runtime`，经验证的最终树由
`codex/promote-composition-state-runtime` 重组为后续主仓开发基线；这仍不自动激活 Mod ABI、
State Format V2、Effect Broker/OpenUI、独立的 i18n/message-catalog lane 或 production Story
migration，未激活层不构成新的 release blocker。X7 证明 Composition 开销很低并刻画
whole-Snapshot 规模成本；若真实 replay/fast-forward/Save latency 成为产品问题，先 profile
authoritative replay 的重复 canonicalization，再讨论改变 State 格式。
2026-08-22 吸收 parallel-monitors 后，实验 State façade 同步改用 Base 唯一的 domain-event
journal/reducer transaction；早期 proposal/fact shape 只保留为历史 checkpoint，不建立兼容层。

2026-08-18 所有者以新的产品方向证据接受
[Application Runtime and Embedded Authoring V1](plans/2026-08-18-application-runtime-embedded-authoring.md)
为当前默认/core lane：先建立 Browser/Deno Desktop startup/dependency floor；AR1 用中立合同
比较 direct 与 Cordis-core-derived private lifecycle 并只保留一条；随后交付 structured
authoring operations、stable-sibling embeddable Authoring Host 与最窄 typed RPC/experimental
Agent Host/UiArtifact seam，再做双 GUI Host build/performance promotion。目标合同见
[Application Runtime and Embedded Authoring](design/application-runtime-and-embedded-authoring.md)。
本轮只交付引擎基础设施；AR6 后的作品、examples 或产品由所有者另行讨论和立案，不预设名称或
顺序。未写入 active plan 的候选不是默认 backlog。已接受但未完成的 Desktop promotion 保持
独立、条件性且不阻塞 core。

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

原则是**一次只迁移一个可独立验收的 authority**。不接受把 Surface、Save、
Snapshot 数据结构、determinism guard 或 Mod resolver 作为一个大改动交给 Agent。

## 5. Strategic track A — deterministic runtime at scale

**Outcome:** 经营、战棋、ATB 和长期伴侣的大状态小改动不再被整树工作阻塞，同时保持原子提交、确定性、replay 与可诊断失败。

### A1 — completed: digest/serialization dedup

已建立 100/1k/10k/100k entity、长序列、autosave、replay 与内存 workload，并在
不改变 canonical/digest/Save/replay 语义的前提下完成 Session、CommandLog 与
Persistence 的 digest/serialization 去重。常规测试锁确定性次数和 byte
equivalence；wall-clock、memory 与 profile 只作临时趋势证据。普通 committed
command 仍保留一次完整 digest 与整树 freeze；这不是 changed-set proportional
commit。

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
  authoritative `createInitialState` 前由 Core 对整个 output 做 canonical
  admission + deep-freeze，不新增 public bootstrap schema/envelope；
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

- deep / changed-subtree / none freeze；
- every-command / checkpoint / module-root / off digest；
- full / changed-module / boundary validation；
- module revision、changed-set、structural sharing；
- typed StateStore 与现有 module state 的交互。

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
authority；Engine Lab、template、Bookshop、Cat Cafe 已迁移，SillyOS 显式省略。
WholeCanvas 通过公开 definition 或 narrow application source 进入同一 kernel；
Splash/Title 属于 package front door，Cat Cafe ending 与 Engine Lab opt-in route 是两名
消费者，SillyOS 继续省略。S4b.1c、PF5/M3、Complexity Reset 与 PF7 stabilization 均已
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

### Tooling status and Studio workspaces

已交付的基础包括 `story check/inspect`、Narrative graph viewer、通过
`story simulate` 运行 named scenario（含 `--trace`）与 `story diff`，以及
capability-gated debug command 合同和 DevDock 面板。它们不再作为未来 editor
工作的前置待办。Motion Workbench（原顺序第 2/3 项）与 editor shell（原第 6 项）
分别由 [Authorable Motion Workbench](plans/2026-08-13-authorable-motion-workbench.md)
与 [VN Scene Workspace](plans/2026-08-14-vn-scene-workspace.md) 以窄纵切交付。

2026-08-18 起，未来编辑器不再是并列产品清单，而是统一 Authoring Host 内的
workspace；现有独立 Studio route 与未来应用内 author surface 是同一 Host 的不同 shell
（[统一创作架构](design/authoring-architecture.md)、
[Application Runtime and Embedded Authoring](design/application-runtime-and-embedded-authoring.md)；
"deferred"表示 workspace 未激活，不表示未来另做不共享会话/命令的编辑器产品）：

- **Live**：Scene composition、Scene construction / Content browser
  （Authoring Architecture S4：新建场景/条目/cue、结构化外观、新建与克隆
  motion）、Motion、Runtime/State diagnostics（点击溯源、hit-region 显示、
  状态调试入口）、Narrative Flow workspace（只读投影——
  [interaction-table 提案](proposals/interaction-table-authoring.md) 升格判据
  于 2026-08-15 满足后随 Authoring Architecture S5 交付；可编辑写回仍按设计 §6
  的载体分级另行裁决）；
- **Evidence-gated**：Scene Timing Sheet、gameplay data grid、UI layout、
  Save/migration inspector、卡牌/SLG/战棋域工具；`story doctor` 只在现有
  check/inspect 无法承载新的修复型诊断时另立。

已交付的外壳统一化、project authoring index、共享文档会话与 Story 包目录 locality 由
[Authoring Architecture 计划](plans/2026-08-15-authoring-architecture.md) 拥有；可嵌入
Host、workspace progressive activation 与结构化人机共用 operation 的下一步由当前
[Application Runtime plan](plans/2026-08-18-application-runtime-embedded-authoring.md) 拥有。

Editor 写普通 TS 或被 TS 引用的稳定数据（JSON 文档经严格 admission），不形成另一
种运行时语言。

## 9. Strategic track E — genre capabilities

**Outcome:** 多品类共享真正通用的机制，但 `base` 不膨胀成所有玩法概念的合集。

Story-local 的 narrative/VN、management/time economy、combat、card、
JRPG/ATB、grid tactics 与 companion 可以随真实产品持续实验。只有被第二消费者和
发布需求证明后，才把共享边界提升为 engine-level capability/package；production
floor 延后的是这种通用化，不是 Story 玩法开发。

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

示例是架构验收 workload，不只是视觉 demo。

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

当前 active plan 的 AR4 只建立 transport/provider-neutral、package-internal 的 Agent RPC client/
UiArtifact lifecycle seam，并以 deterministic fake 对本地 revisioned authoring draft 验证；fake
不保存文件、不提交 authoritative state、不执行 external effect，因此不激活独立 approval/
receipt subsystem。真实后台/LLM、RPC protocol、`UiArtifact` persistence 与具体 OpenUI/A2UI
adapter 必须由后续 owner-selected 产品计划单独激活，不能从 Track G 直接领取。required service
不可用时，依赖 domain 不得谎报 ready，但 GUI 必须保留配置、诊断和 retry；外部 service 不是
plugin，也不取得 Session/FilePort authority。

Agent workspace 需要 tab/split/task/approval/artifact/history 等独立领域模型；不要把现有游戏 Overlay 膨胀成桌面 WindowManager。流式半成品是 transient presentation；只有完整验证的 document 可持久化，replay 渲染保存 document 而不是重新调用模型。

## 12. Strategic track H — Mod incubation

[Mod design](design/mod-system.md) 保留为 accepted direction / incubation，不是当前实现队列。

当前 AR1 的 private Extension Runtime A/B 不等于激活 Mod：它没有 resolver、manifest、public
ABI、external SDK、post-release install 或 distribution。即使最终采用 vendored/forked Cordis
core，也只是一项可从普通静态游戏 build 排除的内部 lifecycle backend。

激活 M0–M2 前必须同时满足：

1. Managed Surface live families 已统一，registry 形状稳定；
2. Save migration registry/fixtures 已成为发布能力；
3. Snapshot 性能契约能承载目标经营 workload；
4. 至少两个真实 first-party capability slice 需要独立选择/分发，而不是复制代码；
5. external package smoke 证明 application 可在仓库外消费 engine；
6. resolver/manifest 不需要万能 `install(context)` 或 load-order override。

第一阶段只做构建期可信 first-party capability。发布后 declarative Mod、trusted code Artifact 与隔离扩展分别立项。不在没有产品需求时建设 untrusted sandbox。

完成 PF7 本身不激活 Mod。即使上述 gates 全部满足，也必须另行接受新的 active
implementation plan，才能开始 resolver、public ABI、external SDK 或 distribution
工作。

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
