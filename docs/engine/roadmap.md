# SillyMaker engine roadmap

状态：2026-07-19 接受，最近审查修订 2026-07-30。已实现能力以 [features](features.md) 为准；历史交付见 [roadmap archive](roadmap-archive.md)。当前执行入口只有 [Production-floor execution sequence](plans/2026-07-30-production-floor-sequence.md)，它再引用四个独立计划；design/roadmap 条目本身不等于 live capability。

## 1. North star

SillyMaker 是面向 **叙事、数据密集、事件/回合驱动游戏** 的浏览器优先 React + TypeScript 引擎。它优先服务：

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

作者或 Agent 只通过受支持的 package exports，用普通 TypeScript 与稳定数据编写 Story、GameplayModule、Narrative、内容表和 React UI。同一个产品可在 headless 与 browser 运行，被语义自动化操作、独立构建、诊断和长期迁移，不复制示例胶水，不修改 engine core。

真实游戏持续充当第一消费者，Engine Lab 是中性 conformance rig；任何一个游戏或复刻实验都不是引擎隐含模板。

## 2. Non-negotiable architecture

- 一个 Session 只有一个 authoritative gameplay State；DOM、React state、renderer、editor、SQLite/IndexedDB 和 Agent transcript 都不能成为第二权威。
- Simulation 拥有规则与可保存语义；Presentation 拥有动画、排版、相机、粒子和瞬时播放；Host 拥有浏览器/桌面资源、I/O、存储和墙钟。
- Save 是 plain、versioned、validated data 与稳定 ID；不保存 DOM、renderer object、Promise、clock handle、audio node、cache 或动画进度。
- Headless、玩家 UI、Browser Automation 与 Agent 使用同一 semantic/application contract，不各自重写规则。
- 输入先成为语义 action，由当前 input owner/context 处理；物理设备不直接改 gameplay State。
- 素材通过 manifest ID；加载、readiness、失败、fallback、预算和 provenance 是一等构建/Host 边界。
- 内容数据库只读；mutable gameplay 只能经 Session transaction；Host persistence 不是 runtime ORM。
- 公共 API 由真实第二消费者、行为测试与迁移路径证明；design 文档或 passing typecheck 不足以冻结接口。
- 新作者层减少样板，但不引入第二套 DSL、动态 eval 或模糊的万能 context。
- package dependency direction 保持：Base 不导入 React/DOM/browser/Node-only tooling。

## 3. Script and extension model

Story、GameplayModule、Narrative、UI contribution 与可信 Hotfix 使用 TypeScript/JavaScript。运行时不引入 Ren'Py DSL、ATL、Screen Language、自研 VM 或任意表达式解释器。

第一阶段扩展是构建期可信代码。发布后的 declarative content/assets/template、同 realm trusted code 与未来隔离扩展是不同信任模型；当前不承诺不可信 JavaScript sandbox。

直接访问 `window`、DOM、IndexedDB、内部 `src/**` 或未公开 store 不受兼容承诺保护。Story 可使用明确的 Host/renderer escape hatch，但它们必须在 package ownership、Save 边界和测试中可见。

## 4. Current execution priority — production floor

在把 Story 成果提升为 engine-level genre pack、Mod、renderer 或 editor
能力之前，按 [Production-floor sequence](plans/2026-07-30-production-floor-sequence.md)
完成。Story-local 的 SLG/VN/卡牌等真实玩法实验可以并行，并继续作为需求与
workload 证据：

1. repository/tooling guardrails；
2. Snapshot 热路径 baseline 与 digest/serialization 去重（PF1/A1 已完成）；
3. Managed Surface kernel + Workspace Overlay pilot；
4. Save envelope/load order + migration registry；
5. System/Narrative/History/whole-canvas primary-detail 的逐 family
   migration；
6. Save dry-run/backup/fixture corpus；
7. Surface structural/model/browser harness 与作者 API promotion；
8. release stabilization。

Desktop Host persistence 是独立、条件性的 promotion lane：目标平台是
macOS、Windows 与 Linux，当前 live wrapper/file adapter 仍只有 macOS
preview。只有某次发布要在某个平台宣称 desktop capability 可生产时，才必须在该
发布 stabilization 前完成对应 evidence。Durability 需要 batch
crash-atomic、cross-process CAS 与旧记录迁移；packaging 需要该平台真实 package
build/launch/reopen smoke。平台逐项 promotion，durability、packaging 与
auto-update 分轴记录；packager/updater 缺口不阻塞 backend durability。只有产品要
宣称 packaged app 使用 atomic persistence 时才同时要求前两条 evidence。它不阻塞
默认核心顺序从 Snapshot S0 开始。

四个独立计划：

- [Desktop persistence durability](plans/2026-07-30-desktop-persistence-durability.md)
- [Snapshot commit performance](plans/2026-07-30-snapshot-commit-performance.md)
- [Save migration](plans/2026-07-30-save-migration.md)
- [Managed Surface lifecycle](plans/2026-07-30-surface-contract-harness.md)

原则是**一次只迁移一个可独立验收的 authority**。不接受把 Surface、Save、Snapshot 数据结构和 Mod resolver 作为一个大改动交给 Agent。

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

它们先是 Story/module workload，再决定是否提升为 engine capability。

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
- `DialoguePlayerController / DialogueView / NarrativeSurfaceHost` 分层；
- DOM/browser adapter 处理 focus/inert/top-layer/pointercancel/visibility；
- structural check、pure model、seeded shrink 与真实浏览器共同验证。

PF2 Coordinator MVP 不引入 universal application receipt。PF6
AI-friendly promotion 时，声明 presentation postcondition 的 action 必须组合分层
evidence，并能返回 `postcondition_failed`；普通 action 不统一 envelope。弱模型
canary 用于冻结作者 API，不阻塞每个 runtime migration commit。

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

### Tooling order

1. `story doctor/check/inspect`；
2. Narrative graph viewer；
3. arbitrary-boundary Stage preview；
4. Timeline scrubber 与 audio/transition inspection；
5. scenario runner 与 capability-gated debug command；
6. content table/asset/dependency tooling；
7. Save migration inspector；
8. 最后组合 editor shell。

Editor 写普通 TS 或被 TS 引用的稳定数据，不形成另一种运行时语言。

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

OpenUI 等 renderer-agnostic streaming UI 可作为 adapter，不进入 Base。模型读取 approved immutable publications；修改必须经过 typed tool/intents、permission、idempotency 与 queue-front revalidation。模型不取得 `GameSession` mutable reference、数据库连接、文件系统、任意网络 client、任意 React component 或 HTML/JS execution。

Agent workspace 需要 tab/split/task/approval/artifact/history 等独立领域模型；不要把现有游戏 Overlay 膨胀成桌面 WindowManager。流式半成品是 transient presentation；只有完整验证的 document 可持久化，replay 渲染保存 document 而不是重新调用模型。

## 12. Strategic track H — Mod incubation

[Mod design](design/mod-system.md) 保留为 accepted direction / incubation，不是当前实现队列。

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
4. 适用的 headless/browser/prebuilt/normal-reduced-skip 一致性；
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
