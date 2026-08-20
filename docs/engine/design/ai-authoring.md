# AI-friendly Story authoring design

状态：2026-07-19 接受；R1/R2 的 Authoring Kit、共享 diagnostics、Application
Composer、GameHarness、Agent adapters、project tooling 与首轮 canary
已实现并进入 [features](../features.md)。本文其余条目仍是目标合同；2026-07-30
接受的 Managed Surface 作者路径与弱模型 capability floor 尚未实现，见
[Surface Contract Harness](surface-contract-harness.md)。authoritative numeric /
entropy 作者边界与待实现 guardrail 见
[Deterministic simulation boundary](deterministic-simulation-boundary.md)。

## 1. Goal

让人类或 AI Agent 能利用 SillyMaker 自身作为 harness 创建新的
Story、GameplayModule、Narrative 和 React UI，而不需要修改引擎核心、复制 Project
Tavern 的应用胶水或发明另一套低代码语言。

目标工作流是：

```text
inspect project and public engine capabilities
  -> create or extend a Story package
  -> write ordinary TypeScript rules, Narrative and React
  -> check and lint with structured diagnostics
  -> play through Node headless Agent port
  -> inspect trace, Save and DebugBundle
  -> verify browser presentation
  -> build an independent Player
```

“AI-friendly”首先意味着稳定、可发现、可验证、可自动纠错。它不意味着 AI
可以直接修改 `@sillymaker/*`，也不意味着 gameplay rule
被降级成表格或任意动态表达式。

对涉及页面、modal、输入和焦点的 UI，“普通
TypeScript/React”不等于让作者手工协调任意 React state、DOM listener、z-index 和
Back 栈。标准路径必须提供受管的 Surface 声明与 transition；普通 React
负责外观和局部 transient state。

## 2. Supported authoring boundary

官方支持：

- 普通 TypeScript/JavaScript module；
- Story-owned plain data、schema、State、rules、queries 和 semantic adapters；
- engine-provided builders 与 public package exports；
- 通过 Managed Surface builder 声明影响输入/焦点的整画布页、详情、modal 与
  Narrative host；
- Story React contribution 和必要时的低层 renderer escape hatch；
- bootstrap-time authorized Hotfix；
- Node、JSONL 和 Browser Agent adapters；
- human-readable 与 machine-readable diagnostics。

不受支持：

- deep import `engine/**/src`；
- 直接改另一个 Module 的 State；
- UI、Agent 或 Hotfix 绕过 Session queue；
- Managed Surface 直接改全局 input/focus/z-order、另建 Back 栈，或从
  DOM/画布可见性反推 active topology；
- 依赖 PoC 私有 helper 作为新 Story 基础；
- Ren'Py DSL、custom expression language、runtime eval 或自研安全沙箱；
- 通过 `window`、DOM、IndexedDB 或内部 singleton 建立未声明权威。

普通 JavaScript
仍可访问宿主允许的全局对象，引擎不拦截；这类访问只是超出兼容合同，并非受支持的扩展
API。SillyMaker 的目标是从 root application registry fail-closed 建立真实
authoritative closure：现有 BuildIdentity managed simulation record 只是
dependency seed，还必须补入拥有 materialize/create simulation callback 的 source
与显式 authority entry。该 closure 获得 static diagnostic、test-only isolated
tripwire、runtime canonical admission 与跨引擎证据，而不是把 trusted Story
描述成 sandbox。Network、LLM、wall clock 或系统 entropy 若要影响玩法，必须先在
Host/application 边界变成 validated canonical command 或不可变资源 identity；
replay 不重新调用外部 oracle。

New-game bootstrap 是一个窄例外：Story-owned `createBootstrapInput` 在生命周期上是
composition-root ingress adapter，只能消费 Core 注入的 `BootstrapEntropyV1`；
Core 对它的整个 output 做 canonical admission + deep-freeze 后，才把同一个值交给
authoritative `createInitialState`。这个边界不允许作者自行读取 `Math.random()` /
`crypto`，也不引入 public bootstrap envelope 或第二份 State。

## 3. Public authoring surface

### 3.1 Dedicated authoring entry

`@sillymaker/base` 应增加清晰的 authoring export，使作者不需要从一个巨大 root
barrel 猜测定义期与运行期 API。现有低层
`defineGamePackage`、`defineGameSimulation` 和 `defineGameplayModule` 继续作为
escape hatch；新作者层在其上减少重复类型 witness 和无意义的 `null`。

概念 API：

```ts
const game = createGameAuthoringKit<GameTypes>({ schemas });

const inventoryRead = game.defineCapability<InventoryReadPort>("capability.inventory.read");

const inventory = game.defineStatefulModule({
  id: "module.inventory",
  state: {
    slot: "simulation.inventory",
    schema: inventoryStateSchema,
    initial: createInventory,
  },
  provides: {
    inventoryRead: game.provide(inventoryRead, ({ readOwnState }) => ({
      has: (itemId) => readOwnState().items.some((item) => item.id === itemId),
    })),
  },
  owner: { propose, apply, invariants },
});

const shop = game.defineStatefulModule({
  id: "module.shop",
  requires: { inventory: inventoryRead },
  state: {
    slot: "simulation.shop",
    schema: shopStateSchema,
    initial: createShop,
  },
});
```

Authoring Kit 应：

- 只捕获一次 Game type family；
- 从 typed `requires/provides` 推导 capability availability graph，并用独立
  `initializesAfter`/lifecycle dependency 表达启动顺序；
- 检查 missing/duplicate provider、capability cycle、lifecycle cycle 和
  undeclared access；vNext direct capability profile 暂时要求
  DAG，合法的双向协作通过 Story coordinator/Query aggregator
  汇合，未来只有在真实消费者证明需要且能安全 late-bind 时才放宽；
- provider factory 只能从自己的 State/read context 构造窄只读 port；consumer
  只能获得在 `requires` 中声明并成功绑定的 token，而不是全局 service locator；
- 允许省略不存在的 local command/query；
- 从 package/simulation 推导 resolved、semantic 和 harness 类型；
- 保持 State ownership 和 static composition，不引入 ECS 或动态插件容器。

低层 API 可以被直接使用，但同一 Session 不能同时维护两套 Module authority。

“undeclared access”只指通过 Authoring Kit 请求了未在 `requires` 声明的
capability token/binding。SillyMaker 不声称能够静态拦截普通 TypeScript
import、closure 或 Host-global 访问；这些访问按支持边界另行处理。

### 3.2 Command coordination

跨模块业务流程仍属于 Story，但 Session/transaction 的机械结构应由引擎提供。

概念 API：

```ts
game.defineCommandCoordinator({
  command: purchaseCommandSchema,
  execute(command, transaction) {
    const stock = transaction.read(inventoryRead);
    if (!stock.has(command.itemId)) return transaction.reject("out_of_stock");
    transaction.emit({ kind: "shop.sale_recorded", price: command.price });
    transaction.emit({ kind: "inventory.item_removed", itemId: command.itemId });
    return transaction.complete();
  },
});
```

`complete()` 只交回完整 candidate；最终 validate/commit 仍由 Session
拥有。引擎负责 module slice replacement、schema、invariant、RNG checkpoint、
domain-event journal collection、commit/reject/fault 和完整 rollback；Story
负责业务顺序和 rejection 含义。Module 不能通过 coordinator 获得 foreign write
capability。

transaction 的所有 `read()` 都观察 command-start immutable Snapshot，不读取
折叠中的 candidate。`emit(event)` 在发射点按 Story `eventSchema` 验证一次并
按发射顺序记入 journal；`complete()` 后引擎按确定顺序折叠（事件按发射顺序
重放，同一事件内订阅的 module reducer 按 UTF-16 code-unit module-ID 顺序各自
折叠自己的 slice），因此声明顺序与 Host locale 都不影响 candidate 结果。
（2026-08-20 parallel-monitors M1 起，此设计已按 events + reducers 形态落地于
`createTransactionRunner`。）

这项设计应由 E2E Story 的一个真实跨模块 command 驱动。若薄化现有 API
已足够，就不为“V2”名义引入另一套长期并存模型。

### 3.3 Runtime schemas

公开一个通用 `RuntimeSchema` authoring helper 和官方 Zod adapter：

- 输入通过 Story schema；
- 输出必须是 Strict/Canonical JSON；
- 输出 deep-freeze；
- validation issues 转成统一 Authoring Diagnostic；
- 可选暴露 JSON Schema/description，供 CLI、表单和 Agent inspect；
- 引擎 runtime contract 不依赖 Zod 专属类型。

这会替代每个 Story 私自实现的 parse、canonicalize、freeze 和 issue formatting
胶水。

## 4. Structured diagnostics

作者错误必须能被机器稳定分类，不能只返回一个大类 code 和异常
message。所有诊断共享一个 versioned
`DiagnosticEnvelope`（code、severity、message、subject、location、details）；authoring、runtime、presentation、asset
和 media 可以增加各自 phase/details，但不能另造互不兼容的 envelope。

目标结构：

```ts
interface DiagnosticEnvelopeV1 {
  readonly code: string;
  readonly severity: "error" | "warning" | "info";
  readonly phase:
    | "definition"
    | "resolution"
    | "lint"
    | "build"
    | "scenario"
    | "runtime"
    | "presentation"
    | "asset"
    | "media";
  readonly message: string;
  readonly subject?: { readonly kind: string; readonly id: string };
  readonly location?: {
    readonly file?: string;
    readonly line?: number;
    readonly column?: number;
    readonly jsonPointer?: string;
  };
  readonly related?: readonly DiagnosticRelatedLocationV1[];
  readonly suggestion?: string;
  readonly docsId?: string;
  readonly details: StrictJsonObjectV1;
}
```

要求：

- define、resolve、lint、check、build 和 scenario runner 使用同一 envelope；
- CLI 同时支持 human 与 JSON output；
- 一次检查尽量收集多个独立问题；
- `code` 稳定，message 可以改善；
- source location 来自 TS builder metadata、config path 或 JSON
  pointer，不伪造无法证明的行号；
- suggestion 描述合法修复方向，不生成绕过 contract 的补丁。

最小诊断语料覆盖 duplicate module/state ID、missing capability、lifecycle
dependency cycle、invalid State、unknown Narrative target、missing
text/asset/renderer、unreachable node 和 invalid transition/timeline target。

Surface authoring 进一步要求 `details` 能表达 owner、application epoch、target
occurrence、instance/topology revision、当前 topology、attempted
transition/action、expected/actual、被破坏 invariant 与最小 trace。由 seeded
explorer 产生的失败还必须包含 seed、shrink/replay path 和一条可直接执行的 replay
command。普通错误不能要求 Agent 解析 React tree、exception stack
或数百步日志才能找到第一处分歧。

## 5. Application definition and composers

`GamePackage` 继续描述 Simulation 与 Presentation definitions，不因方便而塞入
Host/React handle。Application definition 按运行边界分面，不能用一个所谓
Host-neutral 超级对象把 React 带进 Base/Headless：

- **Core application definition**：GamePackage reference/input、bootstrap/schema
  adapters、semantic adapter、reference/state validators 和 diagnostics
  extensions；
- **UI application definition**：presentation projector、renderer catalog 和 UI
  contributions；
- **Web application definition**：browser Host、asset/media/input adapter、mount
  和 lifecycle config。

每个分面还要区分三个生命周期层级：author-authored **definition**
只含声明；Story/Hotfix/schema/reference 解析后得到 immutable **resolved
definition**；Composer 每次启动创建唯一 **application instance**，持有
Session、Host resource、lease、listener 和 disposal。Resolved definition
可复用，instance 不可跨 HMR generation 或测试复用；任何 live handle 都不能倒灌到
definition/Save。

Composer 分三层：

1. **Base composer**：Session、Persistence
   service、Diagnostics、Replay、DebugBundle、Semantic port、runtime lifecycle。
2. **UI composer**：RuntimePresentationStore、Contribution
   Registry、Input、Interaction、Overlay/System sessions、default
   GameRoot、Save/Settings/DevDock surfaces。
3. **Web composer**：Web Host、browser asset/media
   loaders、routing、pointer/keyboard/gamepad adapters、Browser Agent
   adapter、mount、page lifecycle 和 HMR。

理想的 Story Web entry 接近：

```ts
import application from "./application.js";
import { startWebGameApplication } from "@sillymaker/web";

await startWebGameApplication(application);
```

默认 UI 必须能在没有 Story 自定义 React Root 时启动。Story 可只覆盖
Scene、HUD、Overlay、Narrative 或 Character
renderer；需要完全自定义时仍能使用低层 contribution/composition API。

Composer 不知道 Tavern State、command、text、scene 或 route。

## 6. Game harness and Agent port

### 6.1 Generic headless harness

`@sillymaker/base/testkit` 应提供真实 Game harness，创建 resolved
game、Session、Semantic port、Persistence 和 Diagnostics，并返回：

- observe/preview/dispatch/wait-for-idle；
- deterministic trace 与 Snapshot digest；
- Save export/import；
- Replay 与 DebugBundle；
- capability-aware debug operations；
- teardown；
- 显式 test-only `inspectForTest()`。

默认 harness 不暴露任意 State setter。Story test 不再复制 PoC 的
Session、failure buffer、semantic bridge 和 queue-front setup。

### 6.2 Managed Surface contract harness

[Surface Contract Harness](surface-contract-harness.md) 在既有 GameHarness
之上增加独立的验证层，而不把 DOM/Pixi 瞬时状态塞进 core Agent transcript：

1. `story check` 验证 definition、slot/cardinality、action、Back、focus 和 input
   ownership 闭合；
2. 纯 model/testkit 对有界 Surface transition 做表驱动或穷举验证；
3. seeded explorer 生成 open/replace/detail/modal/back/readiness/input 序列并
   shrink 最小反例；
4. frame-aware runtime 以 virtual clock 分开“输入入队”与“推进一帧”；
5. Browser conformance 验证真实 hit-test、遮挡、pointer capture、focus 和
   layout。

Headless 能证明 topology、action receipt 和 target-occurrence/topology-revision
fencing；它不伪装成浏览器，也不证明 CSS stacking 或 DOM focus。Browser
测试使用同一 Surface/action identity，不复制 gameplay availability。

### 6.3 Host-neutral Agent port and optional capabilities

Core `AgentGamePort` 复用 SemanticGamePort 的玩家安全语义，只增加 identity 与
bounded session/publication wait。`waitForIdle` 表示 Session command queue
已清空并已发布对应 semantic revision，不表示 CSS transition、asset decode 或实际
audio 已完成。

Save/import/export 和只读 diagnostics 是独立、可撤销的
`AgentPersistenceCapability` 与 `AgentDiagnosticsCapability`；Replay、raw
Snapshot inspection 和 DebugTools 只属于 GameHarness/testkit admin surface。普通
player/AI agent 不因使用 core port 自动获得这些权限。

三个 core adapter 必须共享 contract tests：

- in-process Node；
- JSONL stdin/stdout；
- Browser global adapter。

Stage target、PendingInteraction 和 Audio intent 若属于 player-safe semantic
projection，可以通过 core observe 读取。Transition progress、asset
readiness、实际 audio 和 focus 等瞬时表现状态由单独只读
`PresentationObservationPort` 提供，只在对应 Host conformance tests
中比较；Node/Browser 不承诺逐帧或真实媒体状态 parity。

JSONL 概念 envelope：

```json
{"v":1,"id":"42","method":"dispatch","params":{"invocation":{}}}
{"v":1,"id":"42","ok":true,"result":{}}
{"v":1,"event":"publication","publication":{}}
```

约束：

- stdout 只输出协议，日志进入 stderr；
- request 有最大行长、JSON 深度和 payload 限制；
- wait 支持 timeout/AbortSignal；
- 无 `eval`、任意文件访问、DebugTools 或 generic command；
- Browser adapter 保留 capability 和 generation revocation；
- Node 与 Browser transcript 必须具有相同 semantic outcome 和最终 digest。

## 7. Project tooling

新增 Node-only `@sillymaker/tooling`，不把文件系统、Vite 或 CLI 依赖放入
Base。它负责：

- project/application config；
- inspect、check、lint 和 diagnostic formatting；
- fail-closed authoritative closure collection，以及待 PF-DET 落地的
  ambient entropy/numeric diagnostics；
- headless simulate/scenario；
- dev/build/prebuilt smoke 的 target resolution；
- asset/reference closure validation；
- 以后需要的 Story graph、preview 和 migration tooling。

概念命令：

```text
sillymaker inspect --story e2e --format json
sillymaker check --story e2e --format json
sillymaker simulate --story e2e --scenario opening --seed 23049 --format jsonl
sillymaker inspect --story e2e --surface surface.inventory --format json
sillymaker explore --story e2e --model surfaces --seed 23049 --format json
sillymaker dev --app e2e-web
sillymaker build --app e2e-web
```

后两个命令是 Surface track 的目标命令面，精确命名由实施原型决定；在
`features.md` 宣布实现前，文档和 Agent 不得假定它们已经可用。determinism guard
同样由 focused plan 决定专用 task 名称；本设计不把尚未实现的 lint/tripwire
命令写成 live CLI。

`sillymaker.config.ts` 或同等普通 TS config 取代 `poc-web` 的硬编码 switch。新增
Story 可以增加自己的 package 和一个声明式 application entry；它不修改 Vite
实现、资产验证器、release resolver 或引擎源码。

当前 workspace packages 仍是 private source packages。完成独立 npm
Artifact、conditional exports 和外部 consumer smoke 前，文档不得宣称 SillyMaker
已是发布 SDK。

## 8. TypeScript Narrative authoring

Narrative 继续使用原生 TypeScript。引擎可提供可选 builder 与 lint：

- duplicate/missing scene、node、choice 和 interaction ID；
- unreachable node/scene、无 yield loop 和无返回 call；
- command/effect schema；
- text、asset、Stage cue 和 renderer reference；
- localization gaps；
- Save interaction boundary；
- bounded control-flow asset prediction。

Builder 的作用是类型推导、减少重复字段、保留诊断位置和生成稳定 IR；它不接管
JavaScript 控制能力，也不引入 parser。

## 9. AI authoring acceptance

Engine Conformance Story 是第二个游戏消费者，也是首要的引擎一致性消费者。R1/R2
已执行三项基础 authoring canary：

1. 新增“货币 + 商店”Module 和真实 typed dependency；
2. 新增带关系条件、选择和 gameplay command 的 TS Narrative branch；
3. 新增一个 React Overlay，通过 semantic action 操作而不直接读写 State。

Surface 作者合同冻结前还要执行新的 capability-floor canary：

1. 增加两个互斥 whole-canvas primary Surface 与一个 detail；
2. 增加 locked modal、Back/focus restore 与 delayed readiness；
3. 证明 pointer-down 后 replace、再 pointer-up 不会应用旧 gesture；
4. 只根据 JSON diagnostic 与 `docsId` 修复 duplicate slot、missing focus 和
   unmanaged input conflict。

Canary 先有允许反馈并修改引擎作者面的 discovery run；每次作者合同改变后，从固定
fresh Story baseline 重新执行 acceptance run。以下硬指标只适用于 fresh-baseline
acceptance run：

- `engine/**` edits = 0；
- deep imports = 0；
- PoC imports = 0；
- foreign State mutation = 0；
- root Vite/build/asset implementation edits = 0；
- internal Surface/Input store access、手写全局 listener/Back 栈、manual
  occurrence/revision counter 和 unmanaged escape hatch = 0；
- 允许在统一 project config 中增加声明；
- check、headless route、Browser route、build 和 prebuilt smoke 全部通过；
- Node/Browser transcript parity 通过；
- invalid examples 返回稳定 diagnostic code、location/pointer 和 suggestion。

辅助记录模型与版本、prompt、baseline commit、seed、首次 passing check
前读取文件数、诊断修复轮次和最终 Story application entry/glue 行数。建议目标是
Web entry 不超过约 15 个非空代码行，第二消费者 application declaration 与 entry
合计不超过约 120 行；这是发现 Composer
泄漏的信号，不是为了通过而压缩可读代码的硬性尺寸 gate。

确定性 contract、headless/browser acceptance 和 public-import guard 是日常 CI
gate。LLM eval 有运行方差，不作为每个提交的唯一随机 gate；但新 authoring API
宣称稳定或 AI-friendly 前，选定的较弱 capability-floor
模型必须在版本化协议下重复运行并达到预先声明的成功率。一次强模型成功不能替代这项证据；持续的同类失败优先触发
API 收窄、安全默认值或 diagnostic 改进，而不是给 prompt 填入内部实现答案。

## 10. Stop rules

作者面冻结后的 fresh-baseline acceptance run
遇到下列情况应暂停并修正作者合同；discovery run 可以修改 engine
helper/diagnostic，然后必须重新冻结并从原 baseline 重跑：

- 为完成 fresh acceptance canary 必须修改 engine core 或复制 PoC runtime/root；
- Authoring Kit 与低层 API 形成两个不一致的 State/Module authority；
- typed capability 退化成 string service locator 或允许 foreign write；
- Composer 通过 Story-specific conditional 知道 Tavern/E2E 内容；
- Agent 为正常游玩获得 raw State、Snapshot setter 或 DebugTools；
- diagnostics 只能依靠解析 stack/message 才能定位普通 authoring error；
- 常见 Surface 要求作者手写 revision、gesture fence、focus trap、input
  isolation、z-index 或 Back 数组；
- 只有提升模型等级、暴露内部 store 或延长带仓库内幕的 prompt 才能通过
  capability-floor canary；
- 为方便 AI 引入任意表达式、回调、eval 或自定义 DSL。
