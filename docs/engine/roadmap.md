# SillyMaker engine roadmap

状态：2026-07-19 接受的连续演进方向。R1–R4 已随 [vNext foundations plan](plans/2026-07-19-sillymaker-vnext-foundations.md) 实现并进入 [feature list](features.md)（含 Engine Conformance 垂直切片、AI authoring canaries 与 PoC 的 Composer 迁移）；R5 的 Timeline、R6 的 1–2 步（DevTools 数据面）与 R7 玩家回滚已按 [R5–R7 执行计划](plans/2026-07-28-sillymaker-r5-r7.md) 实现并进入 feature list；该计划的 defer 表（keyframes、onLifecycle、受约束场景图、R6.3–6.5 编辑器、R8 媒体 adapter 等）记录了未做部分及其激活条件。复刻缺口分析驱动的内容数据库、语义舞台命中区域与 Host 元进度命名空间已随《雨巷猫舍》示例交付（`examples/cat-cafe`，见计划的缺口交付记录）。《雨巷猫舍》此后升格为旗舰示例：完整可玩游戏（标题屏、设置基线、AIGC 全套美术、运行时资产管线、竞赛/图鉴/结局演出、后日谈、双语），并交付了一步桌面打包（`story desktop`，含图标与文件存档）。2026-07-28 晚间批次以《雨巷猫舍》为第二真实消费者落地：R8 音频第一刀（`GameAudioV1` 组件、真实 MP3 场景 BGM/环境声/一次性音效、设置音量联动）、VN 播放 QoL（打字机/自动/快进/历史回看，偏好持久化）、R7 rollback 产品策略（开赛与结局确认为硬边界、HUD 一步回退、防重掷证明）；系统菜单收敛为单模态路由（保存/设置互斥、存档安全点、标题屏载入存档）。

## 1. North star

SillyMaker 要从“支撑首个 Tavern PoC 的运行时”演进为适合 Visual Novel、SLG、模拟经营和人物养成 Story 的 React + TypeScript 游戏引擎。

目标开发体验是：作者或 AI Agent 可以只通过受支持的 package exports，用普通 TypeScript 编写 Story、GameplayModule、规则、Narrative 和 React UI；同一个游戏可在 Node headless 与浏览器运行、被语义化自动化操作、独立构建和诊断，而不需要复制 PoC 的通用胶水或修改引擎核心。

首个 vNext 垂直目标同时包含两条主线：

1. **AI-authorable engine**：稳定的作者接口、结构化诊断、通用应用组合、Headless/Agent harness 和 Story-independent tooling。
2. **Production-capable VN presentation**：可保存的语义舞台、可中断转场、交互边界、音频意图和基础玩家播放系统。

真实游戏（当前为《雨巷猫舍》旗舰示例）持续充当引擎的第一消费者，但任何一个游戏都不是引擎的隐含模板。

## 2. Durable architecture principles

以下原则贯穿全部阶段：

- 一个 Session 只有一个 authoritative gameplay State；renderer、audio element、DOM、React state 和 editor model 不能成为第二权威来源。
- Simulation 拥有 gameplay rules 与稳定语义意图；Presentation 执行动画、转场、排版和即时播放；Host 管理浏览器资源、时钟、音频、文件和持久存储。
- Save 保存 plain、versioned、validated data 和稳定 ID，不保存 renderer、DOM、Promise、clock handle、audio node、cache 或动画进度。
- Headless、DOM、Agent 与 Browser Automation 使用同一个 semantic/application contract，不分别实现游戏规则。
- 素材通过稳定 manifest ID 使用；加载、预测、失败和降级是引擎的一等边界。
- 输入先映射为语义 action，再由当前输入上下文处理；鼠标、触摸、键盘、手柄和自动化不直接改 State。
- 公共契约由真实第二消费者和行为测试证明；不以 PoC 私有 helper、计划夹具或 frozen golden 代替。
- 新作者层应减少无意义的泛型、验证和组合样板，但保留普通 TypeScript 的完整表达能力。

## 3. Script and extension model

Story、GameplayModule、Narrative authoring、UI contribution 和官方 Hotfix 使用 TypeScript/JavaScript。TypeScript 在构建时成为 JavaScript，运行时不引入另一套解释器。

SillyMaker 不提供：

- Ren'Py DSL、ATL、Screen Language 的语法、parser、存档格式或兼容层；
- 自研脚本 VM、动态表达式语言或面向不可信代码的安全沙箱。

第三方 JavaScript 可以执行宿主本来允许的操作。引擎只承诺公开 API 的行为和兼容性；直接访问 `window`、DOM、IndexedDB、内部模块或其他未公开能力不受支持，风险由调用方承担。

这不排除以后提供强类型 Timeline、scene graph、editor 或 Hotfix 工具；它们仍然生成或消费 SillyMaker 自己的 TypeScript/稳定数据合同。

## 4. Milestones and continuous tracks

### R0 — Active design baseline（2026-07-19 已完成）

**Outcome:** 当前实现、已接受方向、探索性 proposal 和执行计划不再混淆。

- 登记 Ren'Py 本地参考身份、许可和 no-copy 边界；
- 形成 VN presentation、AI authoring 和 E2E engine validation 设计；
- 建立一个逐任务、可验收的当前实施计划；
- 保留 `architecture.md`、`features.md` 和 `story-authoring.md` 对 live implementation 的描述。

### R1 — Engine conformance Story and common harness

**Outcome:** `e2e` 成为只使用公开 API 的真实第二消费者。

- 新 E2E Story 覆盖 stateful module、typed capability dependency、跨 owner 原子 command、query/semantic action、rejection/fault 和 deterministic route；
- `@sillymaker/base/testkit` 提供通用 Game harness；
- Host-neutral core `AgentGamePort` 支持 observe、describe actions、preview、dispatch 和 session/publication wait；Save 与 diagnostics 使用独立可撤销 capability；
- Node in-process 与 JSONL stdio 对同一 transcript 得到一致语义结果；

E2E Story 是维护中的测试应用和最小参考实现，不是旧 fixture/golden 系统的恢复，也不作为发行游戏。

### R2 — AI authoring and application composition

**Outcome:** 新 Story 不再复制 Tavern 的隐藏引擎。

- 提供官方 schema adapter、稳定 Authoring Diagnostic 和 JSON output；
- 提供分层 Base/UI/Web Application Composers：分别统一 Host-neutral Session/Persistence/Diagnostics、React UI/Input/Save surfaces，以及 browser Assets/Automation/HMR/lifecycle；
- 保留低层 composition 和 renderer contribution 作为 escape hatch；
- 建立 Story/application project config 和 Node-only tooling，使 inspect、check、simulate、dev、build 与 prebuilt smoke 不依赖 PoC switch；
- 增加 TS Narrative builder/lint，但不增加 parser 或自定义 DSL。
- 在 Web Composer 可用后加入 Browser Agent adapter，并与 Node/JSONL 执行同一 semantic transcript；
- 在 Composer/config 可用后，把浏览器 E2E 从 PoC 产品测试中拆出独立 Engine conformance suite。

### R3 — Semantic VN stage and interaction runtime

**Outcome:** Narrative 的舞台与交互语义真正进入运行时和存档。

- 可序列化 SemanticStageState、Layer、稳定 Tag 和 StageMutation，以及由 projector 产生的 StageRenderTarget；
- show、replace、hide、clear、placement、z-order 与 layer/camera transform 的基础合同；
- previous/target Transition、Presentation Clock、完成、取消、跳过、reduced-motion 和输入策略；
- say、choice、pause、presentationBarrier 与可扩展 custom interaction surface；
- load 时恢复稳定目标舞台和当前交互，不恢复“动画进行到 37%”；
- E2E/Agent 可以观察语义舞台目标和交互；只读 PresentationObservation/DOM tests 观察 transition lifecycle，均不获得 renderer authority。

### R4 — Media, player systems, input, and prediction

**Outcome:** VN 具备长期游玩所需的基础播放器体验。

- image、music、ambient、SFX、voice asset metadata 和加载诊断；
- BGM、ambient、voice 的 continuous saveable intent、transient SFX occurrence 与 Web Audio Host reconciliation；
- Text reveal、History/backlog、seen、auto、skip-read/skip-all、hide UI 和 voice replay；
- keyboard 和 gamepad adapter，继续兼容 pointer/touch 与 accessibility；
- 有预算、无副作用的 Narrative control-flow prediction 和素材 prefetch；
- 页面隐藏、音频权限、缺失素材、加载失败和 reduced-motion 下的可预测降级。

R0 是本轮实施开始前已经完成的设计基线。R1–R4 的核心集成验收是一条 3–5 分钟 E2E VN/SLG 垂直切片；各里程碑仍须满足实施计划与本文 promotion rules 的独立验收。

### R5 — Typed Timeline and bounded Presentation Scene Graph

**Outcome:** 在不引入 ATL 语法的前提下提高演出表达力。

- TypeScript authoring API 表达 sequence、parallel、wait、tween、repeat、event 和 reusable cue；
- Timeline executor 复用 R3 的 PresentationRun、Presentation Clock、interruption 和 completion fencing；
- 可暂停、取消、跳过、快进、检查和在 reduced-motion 下稳定降级；
- 扁平 Stage 被真实 Story 证明不足后，再从 background/character/prop 扩展为受约束 Presentation Scene Graph；
- layer/camera transform、enter/exit/move/pose/expression 和 effect contribution 使用稳定 ID；
- timeline 执行只改变 presentation runtime，不通过动画回调偷偷改 gameplay State。

是否支持更一般的 2D/3D renderer node，由真实 Story 需求和性能原型决定；路线图不要求复制 Godot scene tree。video、Live2D 等高级媒体与渲染 adapter 的交付属于 R8。

### R6 — Authoring DevTools and editors

**Outcome:** 人类与 AI 都能更快理解、预览和修复 Story。

按以下顺序演进：

1. runtime inspector、State/semantic/presentation diff、structured diagnostics；
2. Narrative graph、不可达节点、引用和素材依赖可视化；
3. Stage preview、Timeline scrubber、transition/audio inspection；
4. capability-gated debug command、经 Session transaction 的受控 State 修改和 scenario runner；任何修改都更新 RunIntegrity；
5. 根据真实生产成本决定可视化 Narrative、Stage 或 Timeline editor。

Editor 应写入普通 TS 或被 TS 引用的稳定 Story data，不形成另一套运行时语言或隐含权威 State。

### R7 — Player rollback and time travel

**Outcome:** VN 玩家回滚与 SLG 决策边界可以共存。

- 基于 bounded immutable GameSnapshot checkpoint，而不是复制 Python mutation log；
- 区分玩家 history、player rollback、Debug replay 和 CommandLog；
- 默认随 Snapshot 恢复 RNG；对防重掷结果、营业结算、跨日、外部副作用和不可逆剧情定义 pinned-outcome/hard-barrier policy；
- rollback 恢复 authoritative Snapshot，并重新投影 settled Stage target、Audio intent 和 PendingInteraction；不恢复 renderer transient state；
- 先用 E2E Story 验证，再在真实游戏中落产品策略（已随《雨巷猫舍》落地：开赛/结局确认为 barrier + HUD 回退）。

### R8 — Advanced media and renderer adapters

**Outcome:** 真实 Story 需要的高级媒体与渲染形式成为受约束的 presentation contribution。

- 在 typed media manifest、Audio Host 和 bounded Presentation Scene Graph 稳定后进入；
- 按真实 Story 需求从 video、Live2D、2D skeletal、Rive 和 WebGL/3D adapter 中交付子集，不预先实现全部形式；
- adapter 使用稳定 manifest ID、加载/就绪诊断和 code-native fallback，遵循既有 asset demand/readiness 边界；
- Save 只保存稳定 semantic target，不保存 renderer instance、decoded media 或播放进度；
- 平板/16:10、资源预算和降级路径在 conformance tests 中证明。

### Continuous track — real-game gameplay feedback

**Outcome:** 用真实玩法持续检验引擎，而不是让引擎预设 Tavern 模块。

经营、人物养成、关系、任务、商店、仓库、设施、文字冒险和网状叙事等玩法会经由真实游戏（旗舰示例或未来项目）分批检验。每个实验先判断需求属于：

- Story-local rule/content/projection；
- 可复用 module/capability；
- 通用 SillyMaker runtime/presentation/tooling 能力。

只有反复出现且与具体题材无关的需求进入引擎。玩法重构可以与路线图阶段交错，但不改变引擎测试对中性 E2E Story 的依赖。

## 5. Evidence and promotion rules

一项能力从路线图变为“已实现”需要同时满足：

1. 公共合同和 package ownership 明确；
2. focused behavior tests 通过；
3. E2E Story 在适用时覆盖跨系统行为；
4. Node/Browser 或 normal/reduced/skip 等适用语义保持一致；
5. 现行 `architecture.md`、`features.md`、`story-authoring.md` 或 `development.md` 已更新；
6. superseded API、Story 私有通用胶水和过时测试被迁移或删除，不长期维护平行权威。

研究笔记、proposal、路线图条目和 passing typecheck 本身都不等于已实现能力。

## 6. Relationship to the current plan

[SillyMaker vNext foundations plan](plans/2026-07-19-sillymaker-vnext-foundations.md) 以 R0 设计基线为输入，实现 R1–R4，并为 R5–R8 建立和验证其所依赖的基础合同与进入条件。R5 之后继续沿本文推进，不需要重新解释为什么 Timeline、scene graph、editor、rollback 或高级媒体 adapter 属于路线图。

若实现过程中发现目标合同与 live tree 冲突，应先更新对应 design 并解释取舍；不得由 task plan 静默改变已接受方向。
