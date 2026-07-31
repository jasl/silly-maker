# E2E engine validation design

状态：2026-07-19 接受；Engine Lab、Headless/Browser/Prebuilt conformance 和
Agent parity 基线已实现并进入 [features](../features.md)。2026-07-30 接受的
whole-canvas Managed Surface 与 Contract Harness 扩展尚未实现，见
[Surface design](surface-contract-harness.md)。2026-07-31 接受的多 JavaScript
引擎逐 command determinism matrix 尚未实现，见
[Deterministic simulation boundary](deterministic-simulation-boundary.md)。

## 1. Decision

`e2e` 是 SillyMaker 的 **Engine Conformance
Story**：一个短小、确定、可真正游玩的第二消费者，用来证明公开引擎 API、Headless
runtime、React/Web Host、自动化和独立构建可以共同工作。

这不是恢复已经撤除的旧 E2E Story。新实现不继承旧 Goal 的 Save/Debug fixture
集、golden bytes、writer、provenance manifest、视觉基线、固定种子语料、Phase
gate、提交编排或机器证明。

## 2. Responsibilities

测试职责分为以下层级：

| 层级                        | 验证对象                                                              | 主要位置                               |
| --------------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| Package unit/type/property  | Base、UI、Web 的局部合同、恶意输入和边界                              | `engine/packages/*/src`、`type-tests`  |
| Story authoring conformance | 公开 API 是否足够定义独立 Story、Module、Narrative、UI 和 diagnostics | `e2e/src`                              |
| Headless integration        | Session、Module、Semantic、Save、Replay 和 Agent port                 | E2E Story + `@sillymaker/base/testkit` |
| Browser conformance         | React/Web Host、输入、演出、可访问性和 Browser Agent adapter          | `engine/packages/web/e2e/conformance`  |
| Prebuilt conformance        | Story-independent build、base path、manifest 和刷新恢复               | E2E Story 的测试 Artifact              |
| Product Story E2E           | 具体游戏的玩法、内容、视觉路线和发行 Artifact                         | `examples/*` 自己的 E2E suite          |

E2E Story 不承担每个 schema/parser 边界测试。它只覆盖必须跨 package、Host 或
runtime 层才能证明的可观察行为。任何旗舰示例或商业验证实验都不替引擎承担通用
contract tests。

## 3. Conformance Story shape

E2E Story 使用中性的“Engine Lab”内容，不包含任何 Product Story
的人物、世界观或数值。

### 3.1 Live R4 baseline

以下是 R4 结束时已经实现的 conformance shape：

- 一个持有资源 State 的 stateful Module；
- 一个持有流程 State 的 stateful Module；
- 一个由 Module `provides`、另一个 Module `requires` 的真实 typed capability；
- 一个跨 owner 原子 command，以及成功、rejection 和 fault 路径；
- 一个固定 seed 可复现的 RNG 行为；
- 一个 query、semantic action、preview 与 queue-front revalidation；
- 一条 `line -> choice -> branch -> stage transition -> gameplay result -> end`
  的 Narrative；
- 两个背景、两个角色、姿势/表情变化、进退场、BGM/SFX/voice intent；
- 一个使用公开 contribution API 的 Story React Overlay；
- 一个 capability-gated Debug Command，用来验证 RunIntegrity、Save 与
  DebugBundle。

Story 内容允许随公共行为合同一起演进。测试断言 contract 和结果，不冻结完整
Snapshot 或每个中间对象的 bytes。

分期增量是：R1 先完成两 Module、typed capability、跨 owner
command、RNG、query/action 和 Headless harness；R2 增加 project
config、Composer、Browser Agent 与独立 browser/prebuilt conformance；R3 增加
Semantic Stage、PendingInteraction 与 Transition；R4 再加入 media/audio、VN
player、keyboard/gamepad 和 prediction。以上基线已完成。

### 3.2 Pending Managed Surface target extension

2026-07-30 接受、但尚未实现的 Surface track 将在不改变 Engine Lab 业务数字的
前提下增加：

- 中性的 whole-canvas primary targets（home/status/storage/catalog）；
- detail、locked modal、History 和 delayed-readiness Managed Surfaces；
- stable target owner、target occurrence 与 Coordinator reconcile；
- application epoch、instance/topology revision、managed routing lease 与
  readiness fence；
- 对声明 presentation postcondition 的 action 组合分层 receipt、frame-aware
  input 和真实浏览器 hit/focus/capture 证明；普通 action 不引入 universal
  envelope。

这些条目是目标验收，不是当前 R4 能力。实施期间每一阶段都必须保持 live baseline
scenario 绿色，不能用未来 Surface 能力作为当前基线的前置条件。

## 4. Driver model

同一 `SemanticGamePort` 由 React controls 直接消费，并由 core `AgentGamePort`
适配给三类 Agent Host：

```text
                                  in-process Node Agent
                                 /
E2E Story -> SemanticGamePort -> AgentGamePort -> JSONL stdio Agent
            \\                    \
             React/DOM controls    Browser global Agent adapter
```

Core Agent 操作面至少包含：

- `observe()`；
- `describeActions()`；
- `preview(invocation)`；
- `dispatch(invocation)`；
- `waitForIdle(afterRevision?)`。

这里的 idle 是 Session queue/publication idle，不是 transition、asset 或 audio
settled。Save/import/export 和只读 diagnostics 使用独立可撤销
capability；Replay、DebugBundle 构造、raw Snapshot 和 test inspection 留在
GameHarness/admin surface。

Agent 不获得 Snapshot setter、任意 gameplay command、DebugTools、renderer
object、DOM handle 或通用 State client。测试确实需要内部断言时，应通过
`@sillymaker/base/testkit` 的显式 test-only
inspection，而不是扩张玩家自动化权限。

Live baseline 中的 Browser transition lifecycle、asset readiness、actual audio
和 focus 由只读 Presentation Observation/DOM conformance 面验证，不进入 core
Agent transcript parity。Headless 比较 Stage target、PendingInteraction、Audio
intent 等稳定 semantic projection。Pending Surface extension
将沿用这个隔离：Surface testkit 验证纯 topology、transition receipt 与 stale
fencing，Browser Presentation Observation 验证
topology/readiness/focus；两者都不能向 core Agent 暴露 DOM 或 live Coordinator
setter。

Node 与 Browser 执行同一份语义 transcript，运行时比较：

- semantic revision 变化；
- action availability、preview 和 dispatch outcome kind；
- PendingInteraction 和 Stage target；
- 最终 player-safe semantic state；
- 最终 Snapshot digest。

比较结果在测试进程中生成，不提交 transcript golden。

PF-DET 将增加一条**独立的 test-only admin parity driver**。它不扩张上图的
player-safe Agent port，而是让同一中性 transcript 在 Deno、Chromium、Firefox 与
WebKit 逐 command 比较：

- normalized command 与 outcome kind；
- facts/reasons/fault；
- RNG before/after、attempted draws 与 command sequence；
- pre/post Snapshot digest；
- finalized CommandLog/replay evidence。

报告必须定位第一处分歧的 command identity、sequence 与字段 path；只比较最终
Snapshot 或只比较 Deno/Chromium 两个 V8 Host 不足以证明目标。该矩阵是 pending
target，不是当前 Node/Browser semantic transcript parity 的既有能力。

## 5. Scenario matrix

### 5.1 Live baseline matrix

| 场景                                               |   Headless    |         Browser          |     Prebuilt      |
| -------------------------------------------------- | :-----------: | :----------------------: | :---------------: |
| 只通过 package exports resolve Story               |       ✓       |        boot 证明         |         ✓         |
| 非空 typed capability dependency                   |       ✓       |         间接证明         |                   |
| 跨 owner 原子 commit                               |       ✓       |   DOM/Agent 各执行一次   |                   |
| rejection/fault 保持 State、RNG、sequence          |       ✓       |                          |                   |
| 固定 seed transcript 一致                          |       ✓       |   Node/Browser parity    |                   |
| preview 与 queue-front dispatch 重检               |       ✓       |     stale invocation     |                   |
| Narrative 和 PendingInteraction                    |       ✓       |       可见、可操作       |     刷新恢复      |
| Semantic Stage、角色与 Audio intent                |    可观察     |       可见 target        |  恢复稳定 target  |
| Transition/asset/actual-audio lifecycle            |               |   Presentation observe   |   settled 恢复    |
| Save/load/import                                   |       ✓       |         公共 UI          |    刷新连续性     |
| Replay、DebugBundle                                | Harness admin | capability-gated DevDock | evidence/recovery |
| Debug/Cheat/Automation capability 与撤销           |       ✓       |            ✓             |         ✓         |
| Pointer、Touch、Keyboard、Gamepad、focus isolation |               |            ✓             |                   |
| WCAG、平板、16:10 上限、reduced-motion             |               |            ✓             |                   |
| 素材加载失败和 code-native fallback                |               |            ✓             |         ✓         |
| nested base、manifest、无 Product Story closure    |               |                          |         ✓         |

VN 能力按 [VN presentation design](vn-presentation-runtime.md)
落地时，继续扩展同一个垂直路线，而不是为每项能力创建互不相干的测试游戏。

### 5.2 Pending Managed Surface extension matrix

下表描述 Surface plan 完成时的目标覆盖；“target”不表示当前测试已通过：

| 场景                                                   | Headless/model target | Browser target             | Prebuilt target  |
| ------------------------------------------------------ | --------------------- | -------------------------- | ---------------- |
| whole-canvas primary/detail/modal/Back topology        | pure model            | DOM + presentation observe | refresh rebuild  |
| 同 gesture 跨 replace、stale instance/occurrence       | frame-aware harness   | real pointer               |                  |
| async readiness、focus restore、visibility loss        | virtual clock         | presentation + DOM observe | fallback/recover |
| 声明 postcondition 的 action 组合分层 receipt          | evidence composition  | UI/Browser Agent evidence  |                  |
| CSS/layout/focus/pointer-capture adapter-only failures | not simulated         | browser action + DOM trace | focused smoke    |

R5 以后继续维护同一个 package，但增加 named scenarios，并保留一条 integrated
smoke route。前四项沿用 live baseline；最后一项属于 pending Surface target：

- Timeline：manual-clock、cancel、skip 和 reduced-motion parity；
- DevTools/Editor：只读 inspector、scenario preview 与 capability-gated debug
  mutation；
- Rollback：checkpoint/barrier、RNG/sequence、Stage、Audio intent 和 interaction
  recovery；
- Advanced input/media：synthetic gamepad，以及被真实 Story 采用的 renderer
  adapter fallback。
- **Pending Managed Surface**：whole-canvas replace、detail/modal/Back、async
  readiness、application epoch/topology revision、pointer gesture fence；只有
  Coordinator invariant failure 要求最小 model trace，browser-only failure
  保留稳定 action/publication/DOM-hit-focus trace。

## 6. Browser conformance ownership

`engine/packages/web/e2e` 中的通用行为使用 E2E Story：

- Automation observe/preview/dispatch/wait-for-idle；
- DOM、SemanticPublication 与 Agent parity；
- runtime capability、revocation 和 HMR generation；
- Save、refresh recovery、DebugBundle 和 RunIntegrity；
- accessibility、focus、text spacing 和 reduced-motion；
- responsive layout、平板、16:10 上限和超宽屏约束；
- pointer/touch/keyboard interaction lifecycle；
- 通用 nested-base、manifest 和 prebuilt recovery。

下列行为留在具体 Product Story 自己的测试：

- 某个游戏的日程、经营、战斗、养成、路线和结局；
- 产品角色、世界观、独有 UI 与美术验收；
- 产品存档政策、发行 Artifact 和平台专项流程。

通用行为先由 E2E Story 覆盖并通过，再删除 Product Story
中的重复断言，避免出现验证空窗。`tmp/**` 与 `references/**`
中的本地验证实验永远不是 E2E fixture 或 build dependency。

## 7. Target command surface

实施后应形成可辨认的命令面；精确命名可在实现时根据 package scripts
调整，但职责不能重新混合：

```text
deno task test:conformance:headless
deno task test:e2e:engine
deno task test:e2e:examples
deno task story build e2e
deno task test:e2e:engine:prebuilt
```

聚合语义：

- `deno task test` 包含 Headless Conformance；
- `deno task check` 包含 format/lint/type/unit/headless/story checks 和 E2E
  build，但不强制启动完整浏览器矩阵；
- `deno task test:e2e` 聚合 Engine 与 example browser suites；
- `deno task test:e2e:smoke` 使用 E2E Story 的最短 Chromium 垂直路线；
- Product Story release tests 与 E2E Story prebuilt conformance 保持分离。

浏览器 project 至少覆盖 Chromium 与 WebKit；pointer/touch/keyboard 和 responsive
cases 使用明确可达的 project/tag，不保留配置中永远不会执行的分支。PF-DET 的专用
determinism config 另覆盖 Chromium/Firefox/WebKit，但不把 Firefox 强塞进所有 UI
cases。普通 `deno task check` 继续不隐式下载完整 browser matrix；DET3b 必须先创建
shared config/task 与 production-check CI job，按 lock 中的 Playwright 版本显式
安装并运行三种 browser 的 tripwire；DET4 再扩展同一 substrate 运行 parity。CI0
只提供 latest-stable、browser-free quality job 与其后的 locked Chromium prebuilt
smoke；它不是 DET3b 的三浏览器 determinism gate。workflow 落地也不自动证明
branch-protection policy 已启用，二者的 promotion evidence 必须分开记录。缺 browser
不得 silently skip。

## 8. Fixture and artifact policy

新 E2E Story 第一版不得创建：

- `fixtures/`、`golden/`、`__screenshots__/`；
- `regenerate:*`、`update:golden` 或专用 writer；
- fixture provenance、source manifest、恢复 journal 或 Goal checkpoint；
- 大规模 frozen seed corpus、旧 Goal 的固定 command-log 语料或完整 Snapshot
  baseline。

允许维护短小、有名字的 semantic scenario/transcript
来驱动确定性验收；禁止的是把一次实现产生的完整 CommandLog bytes
冻结成必须原样复制的 golden。

唯一例外是 bytes 本身就是维护中的外部兼容格式，例如某个 Save codec revision
的最小迁移样本。此类 fixture 必须在文件旁说明兼容承诺和更新路径。

E2E Story 可以被独立 build 并由静态服务器启动，但它不是发行游戏。Prebuilt output
是临时测试 Artifact，不进入任何 Product Story release，也不被宣传为内容产品。

## 9. Acceptance criteria

### 9.1 Completed live-baseline acceptance

当前 R4 baseline 已按以下条件完成；后续修改必须保持这些条件：

1. E2E Story 不导入任何 Product Story，也不 deep-import `engine/**/src`；
2. Story 的正常内容开发不需要修改 `engine/**` 或根 Vite/build/asset switch
   logic；应用在自己的 `sillymaker.config.ts` 里声明（根 `project.config.ts`
   仅为目录清单）；
3. typed capability graph 含真实非空 dependency，lifecycle ordering 通过独立 DAG
   验证；
4. commit/reject/fault、RNG、Save 和 replay behavior tests 通过；
5. Node 与 Browser transcript parity 通过；
6. 通用浏览器 tests 使用 E2E Story，examples tests 只保留产品职责；
7. E2E Story 可 dev、headless simulate、build 和 prebuilt smoke；
8. semantic tests 不依赖 sleep、屏幕坐标、renderer internals 或 committed golden
   bytes；
9. current implementation docs 和命令文档已同步更新。

### 9.2 Pending Managed Surface acceptance

Surface extension 只有在以下目标全部实现后才可标为 live：

1. whole-canvas/detail/modal/Back 与 stable target reconcile 有 pure-model
   证明，包括无关 source revision 不 remount、同参数 reopen 创建新 instance；
2. stale instance/occurrence、同 gesture 跨 replace、readiness 和 focus restore
   有 frame-aware runtime 证明；
3. 声明 presentation postcondition 的 action 能以 scoped application receipt
   关联 input、Surface、semantic/workspace evidence；semantic 已 commit 但
   presentation postcondition 失败时返回 `postcondition_failed` 并保留
   committed evidence；普通 action 保持分层 receipt，不要求 universal
   envelope；
4. 真实浏览器证明 hit order、遮挡、DOM focus 与 pointer capture；contract
   使用定义的 logical hit point、稳定 element ID/role 或
   `elementFromPoint`，不依赖偶然截图坐标；
5. Coordinator invariant failure 能 shrink 为 model
   trace；CSS/layout/focus/capture adapter-only failure 保留 browser
   action、publication vector 与 DOM/hit/focus evidence；
6. whole-canvas route 的 prebuilt refresh/recovery 从 stable target 创建新的
   runtime instance，不反序列化旧 Surface session。

### 9.3 Pending cross-runtime determinism acceptance

PF-DET 只有在以下目标全部实现后才可标为 live：

1. Deno、Chromium、Firefox、WebKit 使用同一个中性 test-only authoritative driver
   与 compact expected vector，不扩张 production automation bridge；
2. transcript 至少覆盖 no-draw commit、RNG commit、rejection、fault 与 replay；
3. driver 提供显式 deterministic fault，以及受控 seed/raw draw 与 `exclusiveMax`
   组成、必然进入 rejection-sampling region 的 vector；不得依赖普通 Engine Lab
   route 或低概率 draw 碰巧覆盖；
4. 每个 runtime 重复执行，逐 command evidence 全等；
5. 第一处差异报告 project、command identity/ordinal、sequence 与 JSON pointer；
6. production Browser Agent 不获得 raw Snapshot、RNG 或 CommandLog；
7. 本地 raw report、browser cache 与一次性 transcript JSON 不进入仓库。

## 10. Stop rules

遇到以下情况应暂停当前实现并修正设计：

- E2E Story 需要特殊 engine branch，真实 Story 不能使用同一 public API；
- Browser 与 Headless 各自实现 gameplay availability 或 Narrative progression；
- 自动化被迫获得 Snapshot、State mutation 或 DebugTools 才能完成正常路线；
- renderer/animation completion 直接修改 gameplay State，绕过 semantic command；
- 为通过测试而恢复旧 fixture/golden/Goal machinery；
- 任一 Product Story 专属概念进入 `@sillymaker/*` 公共 contract；
- Headless 试图模拟 CSS/DOM hit-test，或 Browser 另写一套 Surface/gameplay
  availability；
- 只新增 Surface Coordinator 而不迁移并删除旧
  Overlay/System/Narrative/History/whole-canvas/Input lifecycle authority。
