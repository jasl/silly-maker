# E2E engine validation design

状态：2026-07-19 接受的目标设计；尚未实现。当前浏览器测试仍主要绑定 Project Tavern PoC。

## 1. Decision

重新建立 `e2e`，把它作为 SillyMaker 的 **Engine Conformance Story**：一个短小、确定、可真正游玩的第二消费者，用来证明公开引擎 API、Headless runtime、React/Web Host、自动化和独立构建可以共同工作。

这不是恢复已经撤除的旧 E2E Story。新实现不继承旧 Goal 的 Save/Debug fixture 集、golden bytes、writer、provenance manifest、视觉基线、固定种子语料、Phase gate、提交编排或机器证明。

## 2. Responsibilities

测试职责分为以下层级：

| 层级                        | 验证对象                                                              | 主要位置                               |
| --------------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| Package unit/type/property  | Base、UI、Web 的局部合同、恶意输入和边界                              | `engine/packages/*/src`、`type-tests`  |
| Story authoring conformance | 公开 API 是否足够定义独立 Story、Module、Narrative、UI 和 diagnostics | `e2e/src`                              |
| Headless integration        | Session、Module、Semantic、Save、Replay 和 Agent port                 | E2E Story + `@sillymaker/base/testkit` |
| Browser conformance         | React/Web Host、输入、演出、可访问性和 Browser Agent adapter          | `engine/packages/web/e2e/conformance`  |
| Prebuilt conformance        | Story-independent build、base path、manifest 和刷新恢复               | E2E Story 的测试 Artifact              |
| Tavern product E2E          | 酒馆、角色、采购、经营、路线和产品 Artifact                           | PoC 自己的 E2E suite                   |

E2E Story 不承担每个 schema/parser 边界测试。它只覆盖必须跨 package、Host 或 runtime 层才能证明的可观察行为。Project Tavern 不再替引擎承担通用 contract tests。

## 3. Conformance Story shape

E2E Story 使用中性的“Engine Lab”内容，不包含 Tavern 人物、世界观或数值。以下是 R4 结束时累计形成的 conformance shape，不要求 R1 bootstrap 一次实现后续能力：

- 一个持有资源 State 的 stateful Module；
- 一个持有流程 State 的 stateful Module；
- 一个由 Module `provides`、另一个 Module `requires` 的真实 typed capability；
- 一个跨 owner 原子 command，以及成功、rejection 和 fault 路径；
- 一个固定 seed 可复现的 RNG 行为；
- 一个 query、semantic action、preview 与 queue-front revalidation；
- 一条 `line -> choice -> branch -> stage transition -> gameplay result -> end` 的 Narrative；
- 两个背景、两个角色、姿势/表情变化、进退场、BGM/SFX/voice intent；
- 一个使用公开 contribution API 的 Story React Overlay；
- 一个 capability-gated Debug Command，用来验证 RunIntegrity、Save 与 DebugBundle。

Story 内容允许随公共行为合同一起演进。测试断言 contract 和结果，不冻结完整 Snapshot 或每个中间对象的 bytes。

分期增量是：R1 先完成两 Module、typed capability、跨 owner command、RNG、query/action 和 Headless harness；R2 增加 project config、Composer、Browser Agent 与独立 browser/prebuilt conformance；R3 增加 Semantic Stage、PendingInteraction 与 Transition；R4 再加入 media/audio、VN player、keyboard/gamepad 和 prediction。每一阶段结束时已有 scenario 保持绿色，不用未来能力作为当前阶段的前置条件。

## 4. Driver model

同一 `SemanticGamePort` 由 React controls 直接消费，并由 core `AgentGamePort` 适配给三类 Agent Host：

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

这里的 idle 是 Session queue/publication idle，不是 transition、asset 或 audio settled。Save/import/export 和只读 diagnostics 使用独立可撤销 capability；Replay、DebugBundle 构造、raw Snapshot 和 test inspection 留在 GameHarness/admin surface。

Agent 不获得 Snapshot setter、任意 gameplay command、DebugTools、renderer object、DOM handle 或通用 State client。测试确实需要内部断言时，应通过 `@sillymaker/base/testkit` 的显式 test-only inspection，而不是扩张玩家自动化权限。

Browser 的 transition lifecycle、asset readiness、actual audio 和 focus 由只读 Presentation Observation/DOM conformance 面验证，不进入 core Agent transcript parity。Headless 只比较 Stage target、PendingInteraction、Audio intent 等稳定 semantic projection。

Node 与 Browser 执行同一份语义 transcript，运行时比较：

- semantic revision 变化；
- action availability、preview 和 dispatch outcome kind；
- PendingInteraction 和 Stage target；
- 最终 player-safe semantic state；
- 最终 Snapshot digest。

比较结果在测试进程中生成，不提交 transcript golden。

## 5. Scenario matrix

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
| nested base、manifest、无 PoC closure              |               |                          |         ✓         |

VN 能力按 [VN presentation design](vn-presentation-runtime.md) 落地时，继续扩展同一个垂直路线，而不是为每项能力创建互不相干的测试游戏。

R5 以后继续维护同一个 package，但增加 named scenarios，并保留一条 integrated smoke route：

- Timeline：manual-clock、cancel、skip 和 reduced-motion parity；
- DevTools/Editor：只读 inspector、scenario preview 与 capability-gated debug mutation；
- Rollback：checkpoint/barrier、RNG/sequence、Stage、Audio intent 和 interaction recovery；
- Advanced input/media：synthetic gamepad，以及被真实 Story 采用的 renderer adapter fallback。

## 6. Browser test migration

当前 `engine/packages/web/e2e` 中的高价值通用行为保留，但换用 E2E Story：

- Automation observe/preview/dispatch/wait-for-idle；
- DOM、SemanticPublication 与 Agent parity；
- runtime capability、revocation 和 HMR generation；
- Save、refresh recovery、DebugBundle 和 RunIntegrity；
- accessibility、focus、text spacing 和 reduced-motion；
- responsive layout、平板、16:10 上限和超宽屏约束；
- pointer/touch/keyboard interaction lifecycle；
- 通用 nested-base、manifest 和 prebuilt recovery。

下列行为留在 PoC 产品测试：

- “开始这一周”、生活方针、采购、营业和结局流程；
- 女主、关系、酒馆场景和 Tavern 特有 Overlay；
- Tavern Cheat 和 Project Tavern 正式 Artifact 连续性。

迁移顺序是先让 E2E Story 覆盖并通过通用行为，再删除 PoC 中的重复断言，避免出现验证空窗。

## 7. Target command surface

实施后应形成可辨认的命令面；精确命名可在实现时根据 package scripts 调整，但职责不能重新混合：

```text
pnpm test:conformance:headless
pnpm test:e2e:engine
pnpm test:e2e:poc
pnpm build:e2e
pnpm test:e2e:engine:prebuilt
```

聚合语义：

- `pnpm test` 包含 Headless Conformance；
- `pnpm check` 包含 type/unit/headless tests 和 E2E/PoC build，但不强制启动浏览器；
- `pnpm test:e2e` 聚合 Engine 与 PoC browser suites；
- `pnpm test:e2e:smoke` 使用 E2E Story 的最短 Chromium 垂直路线；
- PoC release tests 与 E2E Story prebuilt conformance 保持分离。

浏览器 project 至少覆盖 Chromium 与 WebKit；pointer/touch/keyboard 和 responsive cases 使用明确可达的 project/tag，不保留配置中永远不会执行的分支。

## 8. Fixture and artifact policy

新 E2E Story 第一版不得创建：

- `fixtures/`、`golden/`、`__screenshots__/`；
- `regenerate:*`、`update:golden` 或专用 writer；
- fixture provenance、source manifest、恢复 journal 或 Goal checkpoint；
- 大规模 frozen seed corpus、旧 Goal 的固定 command-log 语料或完整 Snapshot baseline。

允许维护短小、有名字的 semantic scenario/transcript 来驱动确定性验收；禁止的是把一次实现产生的完整 CommandLog bytes 冻结成必须原样复制的 golden。

唯一例外是 bytes 本身就是维护中的外部兼容格式，例如某个 Save codec revision 的最小迁移样本。此类 fixture 必须在文件旁说明兼容承诺和更新路径。

E2E Story 可以被独立 build 并由静态服务器启动，但它不是发行游戏。Prebuilt output 是临时测试 Artifact，不进入 Project Tavern release，也不被宣传为内容产品。

## 9. Acceptance criteria

E2E engine validation 完成需要同时证明：

1. E2E Story 不导入 PoC，也不 deep-import `engine/**/src`；
2. Story 的正常内容开发不需要修改 `engine/**` 或根 Vite/build/asset switch logic；允许在统一 project config 中声明应用；
3. typed capability graph 含真实非空 dependency，lifecycle ordering 通过独立 DAG 验证；
4. commit/reject/fault、RNG、Save 和 replay behavior tests 通过；
5. Node 与 Browser transcript parity 通过；
6. 通用浏览器 tests 已改用 E2E Story，PoC tests 只保留产品职责；
7. E2E Story 可 dev、headless simulate、build 和 prebuilt smoke；
8. 测试不依赖 sleep、屏幕坐标、renderer internals 或 committed golden bytes；
9. current implementation docs 和命令文档已同步更新。

## 10. Stop rules

遇到以下情况应暂停当前实现并修正设计：

- E2E Story 需要特殊 engine branch，真实 Story 不能使用同一 public API；
- Browser 与 Headless 各自实现 gameplay availability 或 Narrative progression；
- 自动化被迫获得 Snapshot、State mutation 或 DebugTools 才能完成正常路线；
- renderer/animation completion 直接修改 gameplay State，绕过 semantic command；
- 为通过测试而恢复旧 fixture/golden/Goal machinery；
- Tavern 专属概念进入 `@sillymaker/*` 公共 contract。
