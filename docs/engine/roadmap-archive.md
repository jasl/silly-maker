# SillyMaker engine roadmap archive

状态：历史交付与已完成里程碑的归档记录，只追加、不作为新工作的合同。当前方向见 [roadmap](roadmap.md)；已实现能力的现状描述以 [features](features.md) 为准；逐任务执行细节见 [vNext foundations plan](plans/2026-07-19-sillymaker-vnext-foundations.md)（R1–R4）与 [R5–R7 plan](plans/2026-07-28-sillymaker-r5-r7.md)（含仍有效的 defer 表）。

## 1. Delivery and acceptance history

- **2026-07-19** — 接受连续演进方向（R0 设计基线完成）；R1–R4 随 [vNext foundations plan](plans/2026-07-19-sillymaker-vnext-foundations.md) 实现并进入 feature list（含 Engine Conformance 垂直切片、AI authoring canaries 与 PoC 的 Composer 迁移）。
- **2026-07-28** — R5 的 Timeline、R6 的 1–2 步（DevTools 数据面）与 R7 玩家回滚按 [R5–R7 执行计划](plans/2026-07-28-sillymaker-r5-r7.md) 实现并进入 feature list；该计划的 defer 表（keyframes、onLifecycle、受约束场景图、R6.3–6.5 编辑器、R8 媒体 adapter 等）记录未做部分及其激活条件。复刻缺口分析驱动的内容数据库、语义舞台命中区域与 Host 元进度命名空间随《雨巷猫舍》示例交付（`examples/cat-cafe`，见计划的缺口交付记录）。《雨巷猫舍》升格为旗舰示例：完整可玩游戏（标题屏、设置基线、AIGC 全套美术、运行时资产管线、竞赛/图鉴/结局演出、后日谈、双语），并交付一步桌面打包（`story desktop`，含图标与文件存档）。
- **2026-07-28（晚间批次）** — 以《雨巷猫舍》为第二真实消费者落地：R8 音频第一刀（`GameAudioV1` 组件、真实 MP3 场景 BGM/环境声/一次性音效、设置音量联动）、VN 播放 QoL（打字机/自动/快进/历史回看，偏好持久化）、R7 rollback 产品策略（开赛/结局确认为硬边界、HUD 一步回退、防重掷证明）；系统菜单收敛为单模态路由（保存/设置互斥、存档安全点、标题屏载入存档）。
- **2026-07-29** — 接受 [Mod composition and distribution](design/mod-system.md) 为尚未实现的 continuous track（先构建期可信 first-party capability Mod，再发布后 declarative Mod）；同批接受三条 production-floor 方向：Snapshot 提交完整性分层、UI surface 生命周期统一、[Save migration design](design/save-migration.md)。
- **2026-07-30** — 持久化槽位模型从固定 `quick`/`manual` 扩展为 Story 可配置的编号手动槽 `manual.1..N`（核心应用声明 `manualSaveSlotCount`，引擎默认 8、上限 99），`quick` 与双自动档语义不变；Save overlay 按 port 枚举顺序渲染槽位，槽名经 `slotNames.manualSlot(index)`；多标签页继续由单写者 Session lease 管辖，不引入按槽锁。已实现并进入 feature list。
- **2026-07-30** — 接受并落地「应用即项目」契约修订（改写 R2 的 project config 交付形态）：每个应用（template、examples、e2e 与外部克隆/移植项目）是自包含项目——自己的 `sillymaker.config.ts`（应用根相对路径）、自己的 `vite.config.ts`（调用 `@sillymaker/tooling/vite` 的共享装配）、通过 package exports 依赖引擎（仓库内 `workspace:*`；未发布 npm 期间外部项目用相对 `file:` 路径 + `"nodeModulesDir": "manual"`）。根 `project.config.ts` 退化为目录清单（CI 聚合与根 `--mode` 便捷分发）；gitignored `project.config.local.ts` overlay 机制退役——本地/外部游戏不再注册进主仓，而是作为普通外部消费者存在。运行时资产 runtimePath 从仓库相对改为应用根相对（`assets/…`）；Web 构建产物固定 `<app>/dist-web`（`dist/` 归 TypeScript 项目引用输出）。「复制 `template/` 开新项目」是受支持的起点；AI-agent 文档（authoring-quickstart、各目录 AGENTS 手册）随之修订。npm 发布、版本化与脚手架 CLI 仍未排期。
- **2026-07-30** — 在 Unity、Unreal、Godot 与 Bevy 的官方机制对照、Web 平台原生原语（`<dialog>`/top layer、`inert`、CloseWatcher、Navigation API）评估和本地整画布验证实验之后，Surface track 收紧为 [Managed Surface lifecycle and contract harness](design/surface-contract-harness.md)：不引入第二套 gameplay State 或 Runtime ORM，而是由一个 Coordinator 原子发布 lifecycle/render/action/input/focus，以 instance/topology-revision/gesture fence 拒绝陈旧输入，并从同一声明生成结构检查、状态模型、最小失败轨迹与真实浏览器验证；AI friendliness 是该 track 的硬性能力下限（标准路径必须让较弱模型无需手写 boolean soup、Back 栈、z-index、focus restore 或全局 listener，也能通过确定性 conformance）。执行按 [Surface Contract Harness plan](plans/2026-07-30-surface-contract-harness.md)。
- **2026-07-30** — 接受 [Snapshot integrity and Save migration plan](plans/2026-07-30-snapshot-integrity-and-save-migration.md)，作为 Snapshot 提交热路径第一步（性能契约 + digest 去重）与 Save migration track 的执行计划。

## 2. Completed milestones

以下为已完成里程碑的原文记录。现状描述以 [features](features.md) 为准；若两者冲突，以 features 与实现为准。

### R0 — Active design baseline（2026-07-19 完成）

**Outcome:** 当前实现、已接受方向、探索性 proposal 和执行计划不再混淆。

- 登记 Ren'Py 本地参考身份、许可和 no-copy 边界；
- 形成 VN presentation、AI authoring 和 E2E engine validation 设计；
- 建立一个逐任务、可验收的当前实施计划；
- 保留 `architecture.md`、`features.md` 和 `story-authoring.md` 对 live implementation 的描述。

### R1 — Engine conformance Story and common harness（已完成）

**Outcome:** `e2e` 成为只使用公开 API 的真实第二消费者。

- 新 E2E Story 覆盖 stateful module、typed capability dependency、跨 owner 原子 command、query/semantic action、rejection/fault 和 deterministic route；
- `@sillymaker/base/testkit` 提供通用 Game harness；
- Host-neutral core `AgentGamePort` 支持 observe、describe actions、preview、dispatch 和 session/publication wait；Save 与 diagnostics 使用独立可撤销 capability；
- Node in-process 与 JSONL stdio 对同一 transcript 得到一致语义结果。

E2E Story 是维护中的测试应用和最小参考实现，不是旧 fixture/golden 系统的恢复，也不作为发行游戏。

### R2 — AI authoring and application composition（已完成；project config 形态经 2026-07-30「应用即项目」修订）

**Outcome:** 新 Story 不再复制 Tavern 的隐藏引擎。

- 提供官方 schema adapter、稳定 Authoring Diagnostic 和 JSON output；
- 提供分层 Base/UI/Web Application Composers：分别统一 Host-neutral Session/Persistence/Diagnostics、React UI/Input/Save surfaces，以及 browser Assets/Automation/HMR/lifecycle；
- 保留低层 composition 和 renderer contribution 作为 escape hatch；
- 建立 Story/application project config 和 Node-only tooling，使 inspect、check、simulate、dev、build 与 prebuilt smoke 不依赖 PoC switch（2026-07-30 修订为「应用即项目」：应用本地 `sillymaker.config.ts` + 共享 Vite 装配，根注册表仅是目录清单）；
- 增加 TS Narrative builder/lint，但不增加 parser 或自定义 DSL；
- 在 Web Composer 可用后加入 Browser Agent adapter，并与 Node/JSONL 执行同一 semantic transcript；
- 在 Composer/config 可用后，把浏览器 E2E 从 PoC 产品测试中拆出独立 Engine conformance suite。

### R3 — Semantic VN stage and interaction runtime（已完成）

**Outcome:** Narrative 的舞台与交互语义真正进入运行时和存档。

- 可序列化 SemanticStageState、Layer、稳定 Tag 和 StageMutation，以及由 projector 产生的 StageRenderTarget；
- show、replace、hide、clear、placement、z-order 与 layer/camera transform 的基础合同；
- previous/target Transition、Presentation Clock、完成、取消、跳过、reduced-motion 和输入策略；
- say、choice、pause、presentationBarrier 与可扩展 custom interaction surface；
- load 时恢复稳定目标舞台和当前交互，不恢复“动画进行到 37%”；
- E2E/Agent 可以观察语义舞台目标和交互；只读 PresentationObservation/DOM tests 观察 transition lifecycle，均不获得 renderer authority。

### R4 — Media, player systems, input, and prediction（已完成）

**Outcome:** VN 具备长期游玩所需的基础播放器体验。

- image、music、ambient、SFX、voice asset metadata 和加载诊断；
- BGM、ambient、voice 的 continuous saveable intent、transient SFX occurrence 与 Web Audio Host reconciliation；
- Text reveal、History/backlog、seen、auto、skip-read/skip-all、hide UI 和 voice replay；
- keyboard 和 gamepad adapter，继续兼容 pointer/touch 与 accessibility；
- 有预算、无副作用的 Narrative control-flow prediction 和素材 prefetch；
- 页面隐藏、音频权限、缺失素材、加载失败和 reduced-motion 下的可预测降级。

R1–R4 的核心集成验收是一条 3–5 分钟 E2E VN/SLG 垂直切片，已随 foundations plan 交付。

### R5 — Typed Timeline（已完成部分）

TypeScript authoring API（sequence、parallel、wait、tween、repeat、event、reusable cue）与 Timeline executor（复用 R3 的 PresentationRun、Presentation Clock、interruption、completion fencing；可暂停、取消、跳过、快进、检查、reduced-motion 降级）已随 R5–R7 计划 T1 交付。受约束 Presentation Scene Graph 仍是开放的证据门控项，见 roadmap 的 R5 remainder。

### R6 — Authoring DevTools（已完成 1–2 步）

runtime inspector（State/semantic/presentation diff、structured diagnostics）与 Narrative graph（不可达节点、引用和素材依赖可视化）已随 R5–R7 计划 T2 交付。第 3–5 步（Stage preview、Timeline scrubber、debug command、editor 决策）见 roadmap 的 R6 remainder。

### R7 — Player rollback and time travel（已完成）

**Outcome:** VN 玩家回滚与 SLG 决策边界可以共存。

- 基于 bounded immutable GameSnapshot checkpoint，而不是复制 Python mutation log；
- 区分玩家 history、player rollback、Debug replay 和 CommandLog；
- 默认随 Snapshot 恢复 RNG；对防重掷结果、营业结算、跨日、外部副作用和不可逆剧情定义 pinned-outcome/hard-barrier policy；
- rollback 恢复 authoritative Snapshot，并重新投影 settled Stage target、Audio intent 和 PendingInteraction；不恢复 renderer transient state；
- 先用 E2E Story 验证，再在真实游戏中落产品策略（已随《雨巷猫舍》落地：开赛/结局确认为 barrier + HUD 回退）。

### R8 — 音频第一刀（已完成部分）

`GameAudioV1` 组件、真实 MP3/M4A 场景 BGM/环境声/一次性音效、设置音量联动与逐条 SFX 增益已交付。video、Live2D、2D skeletal、Rive 与 WebGL/3D adapter 仍按 roadmap 的 R8 remainder 证据门控。
