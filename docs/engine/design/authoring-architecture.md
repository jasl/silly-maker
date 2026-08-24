# 统一创作架构（Authoring Architecture）

状态：2026-08-15 接受的目标设计。产品证据：VN Scene Workspace A5 两轮基准与实验仓
真实内容迁移证明"调校既有场景"已可用，但"从零构造场景/内容进场/工程局部性"未收敛
（人物上台 8 登记点、背景 6 点、新 motion 4 文件且要在 Studio binding 重复登记路
径）；所有者 2026-08-15 决定自己的常态角色是**试玩者与 bug 报告者**（试玩
实验仓项目、按场景/角色/cue/motion/状态路径描述问题），日常修改主要由 Agent 与
Studio 完成——这要求创作工具的信任性、结构化编辑操作与工程局部性优先于新增底层
Runtime 能力。2026-08-15 外部评审与所有者结论一致。

2026-08-24 接受的
[Scale, Scene Object, and Modular GUI](../proposals/scale-scene-object-and-modular-gui.md)
保留本文的 Authoring Host、project index、document session、CAS、undo/redo、structured operations、
source IO 与 standalone/embedded continuity；它撤回五 workspace rail 和 monolithic Studio shell 作为
长期产品形态，并在达到 M5 accepted replacement surface 后以 Inspector-first surface 原子替换。
本文以下 workspace
产品描述在替换完成前仍是 live V1 记录，不是新目标或兼容承诺。

本文固定创作架构的目标合同；2026-08-15 已交付 V1 的实施顺序与验收记录由
[Authoring Architecture 计划](../plans/2026-08-15-authoring-architecture.md) 保留；
[场景创作模型与 SillyMaker Studio](scene-authoring-and-studio.md) 继续拥有 Scene
文档与 Scene workspace 的领域合同。设计存在不等于 live capability。

2026-08-18 接受的
[Application Runtime and Embedded Authoring](application-runtime-and-embedded-authoring.md)
扩展了外壳放置合同：本文的“一个 Studio 外壳”现在解释为“一个 Authoring Host”，可以由
独立 Studio route 或应用内 author surface 承载。本文已经交付的 project index、共享文档
会话、workspace、CAS、dirty gate 与 undo/redo 合同不变；live V1 与 AR0–AR6 仍只有 dev-server
source-write。未来 Desktop/remote author Host 若取得写回能力，须由独立 promotion 复用同一
CAS contract；普通 runtime/Player 永远不因嵌入 shell 获得 source-write。

2026-08-23 开启的
[Workspace Focus & Navigation V1](../plans/2026-08-23-authoring-workspace-focus-navigation.md)
开始补齐本文 §2 已接受、但 live Host 尚未拥有的 workspace focus 第一层：closed manifest 驱动
Host session-local active/visited state、accessible rail 与单一可见 panel。它不等于 typed
cross-workspace target、可持久化 IDE layout 或 public workspace ABI；这些仍需真实 consumer
另行立案。

## 1. 问题：调校可用，构造与局部性未收敛

live 事实（2026-08-15 立项时快照；计划各切片已于同日交付——统一外壳与
workspaces、共享文档会话、project authoring index、Scene Construction 与只读
Flow workspace 均已落地，现状以 [features](../features.md) 为准。以下清单保留
为立项证据，不再是现状）：

- Studio 只能调校既有场景（选 entry、改 placement/zOrder/mirror、换/调已有
  motion、保存），不能新建场景、增删人物/背景/cue、从零登记 content 或 motion；
- 同一个 Motion 文件要登记两次：scene 包内 import 供 runtime 绑定，
  `studio-binding.tsx` 再 import 一次并重复写 source path——A5 预注册焦点二
  （素材/内容进场成本）两轮复测均未下降；
- `@sillymaker/studio` 是单文件 App（`studio-app.tsx`），scene 与 motion 各自
  实现了一遍"read → digest → clone draft → edit → validate → dirty → CAS write
  → conflict → reload"的文档会话闭环，没有共享的 undo/redo、脏草稿导航闸门与
  异步陈旧结果 fence；
- roadmap Track D 把未来编辑器列成并列产品（timing sheet、data grid、UI editor、
  save inspector……），容易各自长成互相独立的外壳。

结论：下一层缺的不是更多 Runtime 合同，而是把已证明的作者对象（Scene、Motion、
Interaction、Content、State 路径）组织成一个统一、可直接编辑、人类与 AI 共用的
工程模型：

```text
可观察 → 可定位 → 可描述   （已达成：Studio/Workbench/Inspect/状态调试）
可导航 → 可直接修改 → 可组合创作 → 人类与 AI 共同维护   （本设计）
```

## 2. Authoring Host 是唯一创作内核，编辑器是 workspace

未来编辑器不再是并列产品，而是同一 Host 内的 workspace：

```text
SillyMaker Authoring Host
├── Scene workspace          （live：画布 + Inspector + cue 列表）
├── Motion workspace         （live：Workbench 时间轴）
├── Diagnostics / Preview    （live：溯源、hit-region、状态调试入口）
├── Flow workspace           （research：Narrative flow 只读投影，见 §6）
├── Content workspace        （research：content browser / 场景构造）
└── Data / UI / Timing / Save-inspector workspaces（evidence-gated）
```

Authoring Host 统一拥有：项目导航、文档打开/关闭、草稿/保存/CAS 冲突、undo/redo、
authoring diagnostics、source provenance、selection、preview host、文件与运行时
对象之间的跳转、dev-only 写回、以及 Agent 可调用的结构化编辑操作。各 workspace
只拥有领域表示与领域编辑命令。

不把所有内容统一成一种表示。各作者对象使用最适合它的形式：

| 作者对象           | 表示                        |
| ------------------ | --------------------------- |
| 人物与背景构图     | 2D canvas（直接操纵）       |
| 动画与演出节奏     | timeline / curve            |
| 剧情分支与交互流程 | graph（投影优先，见 §6）    |
| 物品、数值、目录   | table                       |
| UI 布局            | tree + canvas + constraints |
| 复杂玩法规则       | TypeScript（不可视化）      |
| 项目资源           | browser / catalog           |

工程形态：现阶段在 `@sillymaker/studio` 包内部模块化（`core/` 承载
project-index/document-session/commands/diagnostics/selection/navigation/preview，
`workspaces/` 按领域拆分），不拆第二个 studio 包；runtime 包不得依赖 studio 的
约束不变。

## 3. Project Authoring Index：一处发现，处处消费

接线成本的根源是同一份内容要在多处登记（import、runtime binding、studio
binding、catalog、barrel）。目标合同：tooling 按目录约定扫描项目并构造统一索引；
Studio、`story check` 与内容浏览消费同一份枚举/admission 实现。长期 dev server 共享一个
project-scoped owner，one-shot CLI 不假装共享它的进程内实例：

```text
scenes/**/*.scene.json
scenes/**/motions/*.motion.json
src/**/*.regions.json（shaped-hit-regions，2026-08-21 起）
src/**/*.chrome-layout.json（authorable-chrome-layout，2026-08-22 起）
content/**（content 声明与 geometry）
story/**（narrative / interaction 文档）
```

概念形状（字段以实施切片的 admission 为准；已落地的四个桶是
scenes / motions / regions / chromeLayouts + skipped，contents 仍从
studio binding 声明，interactions 未实施）：

```ts
interface AuthoringProjectIndexV1 {
  readonly scenes: readonly SceneSourceRef[];
  readonly motions: readonly MotionSourceRef[];
  readonly regions: readonly RegionsSourceRef[];
  readonly chromeLayouts: readonly ChromeLayoutSourceRef[];
  readonly contents: readonly StudioContentDescriptorV1[];
  readonly interactions: readonly InteractionSourceRef[];
}
```

约束：

- 索引在 dev/build/check 时构造，**不提交生成文件**（仓库纪律：generated exports
  不入库）；若某切片证明必须落盘，需所有者显式修订该纪律；
- 权威消费路径不变：叙事代码仍以显式 ESM/JSON import 引用 scene/motion 文档，
  确定性闭包与 build identity 继续看到这些文档；索引服务 tooling/Studio 的枚举
  与发现，不成为第二权威；
- 枚举顺序确定、诊断结构化（文件被移动/重名/坏文档要点名，不静默消失）；
- dev-server owner 构造时不做 IO；第一次 list 一次扫描/admission 四个已实现文档族，只保留
  `path/id/label` metadata 或 named skip。后续 list 不读盘，watcher 只失效发生变化的 path；选中文档
  仍通过既有 CAS port 直接读盘，不建立完整文档缓存；
- `StudioBindingV1` 收窄为文件扫描得不到的部分：content authoring manifest、真实
  renderers、asset registry、可选的 Story 专属预览适配——不再手工枚举 motion/
  scene 文件路径。

Content workspace 的进场描述符（概念形状）：

```ts
interface StudioContentDescriptorV1 {
  readonly contentId: string;
  readonly label: string;
  readonly category: "background" | "character" | "prop" | "effect";
  readonly defaultLayerId: string;
  readonly defaultZOrder: number;
  readonly defaultPlacement?: StagePlacementV1;
  readonly defaultAppearance?: Readonly<Record<string, string>>;
  readonly geometry?: StageContentGeometryV1;
  readonly appearanceFields?: readonly StudioAppearanceFieldV1[];
}
```

## 4. Authoring Document Session：一份会话纪律，人机同道

Scene 与 Motion 已经各自实现了一遍同构的文档会话；两个真实消费者达标，闭环提升
为 Studio core 的统一合同（概念形状）：

```ts
interface AuthoringDocumentSession<TDocument, TCommand> {
  readonly source: AuthoringSourceIdentity; // 路径 + saved digest
  readonly saved: TDocument;
  readonly draft: TDocument;
  readonly dirty: boolean;
  readonly diagnostics: readonly AuthoringDiagnostic[];
  apply(command: TCommand): void;
  undo(): void;
  redo(): void;
  save(): Promise<AuthoringSaveResult>; // CAS；409 保草稿
  reload(): Promise<AuthoringReloadResult>;
  discard(): void;
}
```

- 各 workspace 定义自己的编辑命令（Scene：MoveEntry/ScaleEntry/SetAppearance/
  BindMotion/AddEntry/RemoveEntry/AddCue…；Motion：MoveKeyframe/SetKeyframeValue/
  SetDuration/SetEasing…）；命令经同一 validation 产生可审查的文档 diff。
- **人机边界**：人类经 Studio UI、Agent 经 CLI/MCP/本地 authoring API 产生同一批
  命令；双方共享 validation 与 diff。共同边界是
  `Authoring Document + Structured Edit Commands`，不是"AI 写代码、人类猜代码在
  哪里"，也不是"编辑器一套隐藏数据、源码另一套数据"。每个作者对象只有一个权威源。
- 会话统一拥有作者信任语义：脏草稿导航闸门（切换/重载/关闭/刷新前必须
  保存/放弃/取消）、异步打开的陈旧结果 fence（monotonic request id 或
  AbortSignal）、saved/draft 预览语义（查看 saved 时发生编辑动作即显式切回
  draft）。
- diagnostics 分两档：**Blocking**（文档非法、cue 目标缺失、motion/renderer 缺
  失）阻止保存；**Warning**（资产加载失败回退、geometry 缺失导致画布直接操纵不可
  用、appearance 键被忽略）必须可见但不阻止保存。Studio 不静默降级；Player 保持
  现有 fallback 韧性。

## 5. Story 包目录与 locality 硬指标

目录按创作对象组织（示意，精确目录名由实施切片与所有者确认；`application/**`
保持 Advanced 标注）：

```text
<app>/src/
  game/            # 权威规则：state / commands / rules / systems
  content/         # 可复用人物、背景、道具声明与 geometry
  scenes/<scene>/  # 空间构图 + 场景局部演出（*.scene.json + motions/）
  story/           # 叙事与交互流（chapters / interactions）
  ui/              # 产品特有 UI
  application/     # 高级集成层：普通内容创作不修改
```

目录名不是合同；合同是**高频修改的局部性硬指标**（由实验证据循环按轮复测）：

| 任务            | 目标成本                                               |
| --------------- | ------------------------------------------------------ |
| 移动一个人物    | 0 个源码文件（Studio 完成）                            |
| 新建一个 motion | 1 个 motion 文档，自动进入 Studio 与 runtime           |
| 加一句台词      | 1 个剧本文档编辑点                                     |
| 添加一个人物    | 1 个 content 定义 + 资产文件（无 binding/barrel 手改） |
| 添加一个场景    | 1 个 scene package（不改 application composition）     |

普通作者完成一次场景修改，不得被要求跨越 narrative / presentation / composition /
renderer / catalog / transition / tooling binding 七类文件。

## 6. Narrative/Interaction Flow 蓝图边界

"蓝图"限定为叙事/交互流程的图表示，不是通用可视化编程。它适合表达对话、选择、
分支、gate、effect、roll、scene open/cue、跨交互跳转与结束节点；**不**表达任意循
环、任意 TypeScript 调用、数据结构操作、通用 UI 布局、复杂战斗算法或对游戏 State
的任意访问。复杂玩法继续由 TypeScript command/rule/module 实现，图只经注册的
`effectId/gateId + parameters` 引用能力（见
[interaction-table 提案](../proposals/interaction-table-authoring.md)）。

**源与投影必须先裁决**，按三阶段推进，不跳级：

1. **只读投影**（第一阶段）：交互/叙事文档编译出 `NarrativeFlowGraphV1`，Studio
   Flow workspace 只读查看 + 点击节点跳转源文档；无双权威、无写回问题；
2. **可编辑投影，写回原文档**：以载体能力分级——JSON 文档可结构化写回；受限纯数
   据 TS module 可考虑；含 `map`/条件/函数的程序化 TS **只读**（源码/Agent 编
   辑）。不承诺"任何 TS 数据模块都能被图编辑器修改"；
3. **图文档成为作者源**：仅当真实需求证明时另行裁决；若成立，语义与布局分离
   （`interaction.json` + 可选 `interaction.layout.json`），自动布局不重写语义
   文件。

## 7. 非目标

- Unity/Godot 式通用编辑器、任意 DOM/CSS 可视化编辑、通用 node graph 语言；
- 把 Story 侧 interaction kit 在升格门槛满足前提进 `base`（叙事 IR + 运行器的
  认领必须单独立案）；
- rotation/任意 Motion 属性通道、卡牌/SLG/战棋统一编辑器（维持既有 defer）；
- 第二套 DSL/VM、第二 gameplay/Stage 权威、dev 之外的写回端口；
- 为架构本身新建执法 harness 或 exact-file inventory（沿用 CR0/CR1 治理）。

## 8. 与既有文档的关系

- [scene-authoring-and-studio](scene-authoring-and-studio.md)：Scene 文档、
  authoring geometry 与 Scene workspace 的领域合同不变；其 §6 的包分层由本设计
  接管演进（Studio 内部 core/workspaces 模块化）。
- [interaction-table 提案](../proposals/interaction-table-authoring.md)：Flow
  workspace 的数据来源；升格判据由提案拥有，本设计只固定"投影优先"的阶段边界。
- [roadmap](../roadmap.md) Track D：deferred 编辑器改述为 Studio workspace 的
  Live / Research / Evidence-gated 状态，不再是并列产品。
- [Application Runtime and Embedded Authoring](application-runtime-and-embedded-authoring.md)：
  接管 Authoring Host 的 standalone/embedded shell、workspace progressive activation 与
  typed operation 演进；本文继续拥有 project index、文档会话和 workspace 领域合同。
- 2026-08-15 V1 的执行记录由
  [Authoring Architecture 计划](../plans/2026-08-15-authoring-architecture.md)
  保留；2026-08-18 的后续切片由
  [Application Runtime plan](../plans/2026-08-18-application-runtime-embedded-authoring.md)
  拥有；[production-floor sequence](../plans/2026-07-30-production-floor-sequence.md)
  仍是唯一跨计划排序入口。
