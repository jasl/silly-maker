# Snapshot integrity and Save migration execution plan

状态：2026-07-30 接受执行；尚未实现。承接 [roadmap](../roadmap.md) 的 Snapshot integrity and commit performance 与 Save migration as a release capability 两条 continuous track，以及 [Save migration design](../design/save-migration.md)。本文规定实施顺序与验收，不使目标设计自动成为 live capability；能力只有在行为测试与现状文档同步后才进入 `architecture.md` / `features.md`。本计划不谈论日历时间；阶段按质量门推进。

## 1. Outcome

两条相互独立的工作流：

**Workflow 1 — commit hot path（阶段 A–B）**：性能契约存在且有可复现基线；每命令的全量 canonical digest 从 4 次降到 committed 1 次、rejected/faulted 0 次；autosave 路径不再对同一快照重复 digest 与重复序列化；全程不改变任何公共合同语义（同一 transcript 的 digest、CommandLog、replay、Save 字节均等价）。

**Workflow 2 — save migration（阶段 C–E）**：load 顺序改造为 [design](../design/save-migration.md) §2 的目标顺序（current snapshot schema 验证移到迁移之后）；namespace-keyed migration registry、adoption 声明集合、lineage re-anchor 政策与玩家可读结果落地；每个维护中的 Save 格式有 fixture corpus 并在 CI 全量迁移验收。

两条工作流可交错推进；各自内部阶段严格按序。

## 2. Relationship to the other tracks

- **[Surface Contract Harness plan](2026-07-30-surface-contract-harness.md)** 并行推进：两计划的代码热点不相交（本计划改 `base` 的 session/diagnostics/persistence 与 tooling，Surface 计划改 `ui`/`web` 与 Engine Lab UI），共享的只有聚合检查（`deno task check`）。两计划都不得以对方未完成为自己延期理由。
- **IntegrityPolicy 分层与模块级 revision/changed-set**（roadmap Snapshot track 的后续阶段）**不在本计划内**：它需要先接受专门 design（含与 [typed StateStore proposal](../proposals/typed-state-store.md) 的交互取舍）。激活条件：阶段 A 的性能契约显示 dedup 后目标 workload 预算仍不满足，或真实大状态 Story 实测撞墙。
- **Mod track** 的 M3（per-facet provenance 与 per-namespace migration）以 Workflow 2 为前置；本计划实现单应用（单 namespace）形态，不实现 Mod provenance，但 registry 形状必须满足 design §3 的 namespace 组织维度，避免 M3 重建。
- **e2e Engine Lab** 是两条工作流的中性主体：性能 workload 用 base testkit 的中性 fixture 构造，迁移样本以 Engine Lab Story 的真实 State schema 演进为主；旗舰示例补充真实产品格式样本。不引入只为计划服务的一次性 fixture——Save fixture corpus 是维护中的用户可见兼容承诺（见 design §5），性能预算是维护中的产品行为契约。

## 3. Execution order and TDD discipline

A → B 与 C → D → E 各自严格按序。每个阶段使用同一循环：

1. 先写能从公开行为观察到的 failing test 或基线测量，记录它证明的当前成本/缺口；
2. 实现最小改动，使 focused test 通过；
3. 增加边界/property/等价性测试，删除被替代的旧入口；
4. 运行受影响 package tests，再扩大到 `deno task test` / `deno task check`；
5. 只有该阶段 acceptance 全部通过，才进入下一阶段。

性能工作流额外要求**先测量后改动**：没有基线报告的优化提交不接受。时间类断言只存在于 bench 通道；进入常规 test 的只有确定性计数断言与等价性断言，不依赖 wall clock。

## 4. A — Performance contract and baseline harness

**目标：** 建立可重复的性能契约与现状基线，成为 B 的验收仪器和后续 IntegrityPolicy 分层的激活依据。

### A.1 Workloads

用 base testkit 的中性 fixture 构造（不依赖任何具体游戏）：

- 100 / 1k / 10k / 100k entity 量级的 Snapshot；
- 单模块小改动命令（改一个字段）；
- 跨模块原子事务命令；
- 长命令序列回放（混入 rejected/faulted）；
- `every_commit` autosave 开启时的提交路径（含 `auto.previous` 轮转）；
- 长时运行的内存增长采样。

### A.2 Instrumentation and budgets

- 对 `digestCanonical`、深冻结遍历与 Save 序列化提供可注入计数点（仅测试/bench 组合可见，不进入公共 API 承诺面）；
- 每 workload 输出机器可读 JSON：p50/p95 耗时与 digest/freeze/serialize 分项计数；
- 预算按命令类型分级（UI/导航型、普通 gameplay 命令、重模拟步），不用单一全局阈值；预算声明入仓，测量原始输出不入仓（遵守不提交一次性校准数据的仓库规则）。

### A.3 运行通道

- 显式 bench task（命名沿现有 task 约定收敛）本地与 CI/nightly 可跑；
- 时间预算不作为每次提交的硬 gate（宿主噪声），计数断言进入常规 test 成为硬 gate。

**A acceptance：**

- harness 对当前实现产出基线报告，报告能定量复现 roadmap 记录的现状（每命令 4 次全量 digest、rejected 同样支付、autosave 路径 ≥5 次全量 digest 与 2 次全量序列化）；
- 计数断言以确定性方式进入常规 test；
- harness 不修改任何生产代码路径的行为。

## 5. B — Digest dedup with unchanged contracts

**目标：** 去掉热路径冗余的全量 digest 与重复序列化。不改变 digest 算法、canonical 形式、freeze 行为或任何公共合同语义；freeze/validation 分层属于后续 IntegrityPolicy design，不在本阶段。

依据（已核实的现状）：`finalizeCommandAttemptV1` 对 before/after 各做一次全量 digest；`CommandLog` append 校验对同两个快照各重算一次（`command-log.ts` 的 continuity 校验同时含对象恒等断言与 digest 重算）；非 committed 结果已被断言 `result.snapshot === preSnapshot`（对象恒等）。

### B.1 Pre-digest 复用

命令 N 的 `preStateDigest` 复用命令 N-1 的 `postStateDigest`；session 安装/替换快照时计算一次作为链首。健全性依据是 CommandLog 已有的对象恒等 continuity 断言——复用不得放弃该断言。

### B.2 Rejected/faulted 短路

非 committed 结果 `postStateDigest := preStateDigest`（依据既有对象恒等断言），不再重算。

### B.3 Append 重算校验模式化

CommandLog append 内的 digest 重算从无条件执行变为可配置自检：测试与 debug/audit 组合默认开启，release 组合关闭。最小开关形状由实现原型决定（不引入完整 `IntegrityPolicy`）；开启时行为与现状完全一致。

### B.4 Autosave 复用

持久化保存路径在对象恒等可证明时复用 session 已计算的 post digest，并把 encode 的规范化序列化与 Strict JSON preflight 合并为一次遍历产物；无法证明恒等时保持现行为。`stateDigest` 的 Save 字节含义不变。

### B.5 等价性证明

同一 transcript（含 rejected/faulted、debug command、anchor 替换、autosave 轮转、rollback）在改动前后产生 byte-identical 的 digest、CommandLog 条目、debug bundle 与 Save 记录。

**B acceptance：**

- 计数断言：committed 命令全量 digest = 1，rejected/faulted = 0；autosave 提交路径对同一快照不重复 digest、序列化次数减半；
- B.5 等价性测试通过；audit/debug 自检开启路径与现状一致；
- harness 产出 before/after 对比报告，单模块小改动命令的成本在大 Snapshot workload 上显著下降但仍呈线性（作为 IntegrityPolicy 分层的激活证据记录，不作为本阶段失败）；
- `deno task test` 与 `deno task check` 全绿。

## 6. C — Envelope shell decode and load-order rework

**目标：** 实现 design §2 的目标 load 顺序，为迁移创造执行点；不注册任何迁移时，受支持输入的行为与结果完全不变。

- envelope shell parser 只解析外壳字段（`formatRevision`、`recordRevision`、provenance、slot、`savedAt`、`stateDigest`、`simulationLineage`），`snapshot` 保持受限 raw 结构；`saveJsonLimitsV1` 限额不放开；
- `stateDigest` 在 shell parse 之后、任何迁移之前对 raw snapshot 校验（design §2 要点）；
- `formatRevision` 轴建立 engine-owned envelope format migration 挂点（当前只有 1；挂点与 unsupported 路径有测试）；
- current snapshot schema 验证移到迁移链之后，compatibility classification / reference / invariant 顺序对齐 design；
- 旧 schema 输入从解码期 `envelope.schema_invalid` 变为走新顺序后的稳定结构化结果（无可用迁移时明确拒绝，诊断码稳定并区别于 envelope 损坏）；这是设计内的既定行为变化，必须有红测试记录变化前后语义。

**C acceptance：**

- 全部现行受支持存档（现 schema、adoption、损坏、超限、digest 不匹配、lineage 超限样本）在改造前后结果逐字段等价；
- 现有 save-repository property tests 扩展覆盖 shell parse 边界；
- 旧 schema 输入获得稳定新诊断；不注册迁移时无任何写入行为。

## 7. D — Migration registry and replay anchor

**目标：** 落地 design §3 的 registry 合同与执行管线。

- `SaveStateMigration` 合同：namespace-keyed 相邻 revision 迁移链；纯函数、确定性、禁网络/时钟/随机；跨版本由 runtime 组合；单应用是单 namespace 特例，registry 形状满足未来 Mod per-namespace 复用；
- 执行管线按 design §2：任何一步失败原子放弃（原 Save 数据不变，结果为结构化 rejection/inspect_only），成功原子安装新 replay anchor 并记录新 digest 与 lineage；
- content/reference ID rename/delete 显式映射表挂点与验证；
- CommandLog 兼容轴独立：迁移安装新 anchor，旧命令日志不跨 anchor 重放（行为测试）；
- migration 与 adoption 语义区分：same-schema Simulation drift 仍走 adoption；schema change 走 migration；两者叠加的组合场景有测试。

**D acceptance：**

- Engine Lab Story 提供一次真实 State schema 演进（revision N → N+1）与一条两步链（N → N+1 → N+2）的迁移样本；
- 失败注入（迁移抛错、产出非法 State、引用悬空、invariant 失败、digest 不匹配）全部原子拒绝且原数据可再次加载；
- 迁移路径全程无时钟/随机/网络访问（结构性测试或 lint 证明）。

## 8. E — Product surface, fixtures, and CI acceptance

**目标：** 把迁移从机制变成发布能力，覆盖 design §4–§5 的产品面。

- dry-run / forward inspection：只检查不写入，输出每槽位的结构化诊断（可直迁 / 需 adoption / 拒绝及原因）；
- 写入前备份与回退：迁移写入前保留原记录（复用 lineage/slot 机制），玩家路径失败可回退；
- adoption 声明集合：兼容分类接受声明集合（覆盖多个受支持历史构建）；build/发布流程从历史 resolved provenance 生成候选声明供人工确认；替换并删除现单声明入口（现应用侧恒传空）；
- lineage 边界策略：re-anchor 语义、上限取值与触限产品路径（提示玩家 re-anchor/导出/回滚）落地并有测试；触限不再是静默拒绝；
- 玩家可读结果：rejected / inspect_only 映射为用户可读文案与可行动选项；诊断码不是最终用户界面；
- fixture corpus：为维护中的 Save 格式建立真实 fixture（Engine Lab + 旗舰示例），至少一条跨多版本 migration/adoption 链与一条逼近 lineage 上限的边界样本；CI 任务对 corpus 全量执行 migrate + load + reference + invariant + digest 验证；
- 文档同步：`features.md`、`architecture.md`、`development.md`（测试通道）更新；实现与 design 冲突时先修订 design 并解释取舍。

**E acceptance：** design §5 的 Release acceptance 全部满足；superseded 单声明 adoption 入口已删除。

## 9. Global acceptance

1. Workflow 1：性能契约与计数断言进 CI；committed/rejected 命令全量 digest 为 1/0；autosave 复用生效；B.5 等价性证明通过（公共合同零语义变化）；
2. Workflow 2：任意受支持历史 fixture 在 CI 可迁移、可加载；load 顺序为 design 目标顺序；adoption 集合、lineage 政策与玩家可读结果落地；
3. `deno task test`、`deno task check` 与受影响的 `deno task test:e2e` 全部通过；
4. public exports 与 architecture/features/development 文档同步，superseded 入口有迁移或删除记录；
5. 新增 fixture 与 workload 不来自 `tmp/**`、`references/**` 或未发布复刻；研究输入只提供抽象需求证据。

## 10. Explicit non-goals

- `IntegrityPolicy` 分层、changed-subtree freeze、模块级 revision/changed-set、结构共享（等专门 design 接受后另立计划）；
- digest 算法、canonical 形式或深冻结行为的变更；
- ECS 或 State store 改写；
- Mod per-facet provenance 与 per-namespace 多 Mod 迁移（M3）；
- 降级迁移、跳版本直迁、自动 schema diff 推断迁移；
- 外部数据库或异步迁移服务；
- 把时间预算做成每次提交的硬 CI gate（计数断言除外）。

## 11. Stop conditions

出现以下任一情况，暂停实现，先修订对应 design/track 并解释取舍：

- dedup 需要改变 digest 语义、canonical 形式或放弃 CommandLog 对象恒等断言才能达标；
- B.5 等价性测试无法在不弱化断言的前提下通过；
- envelope shell parse 无法在不放开 Strict JSON 限额的前提下保持现有拒绝面；
- 迁移执行需要读取 live Session、时钟、随机或网络；
- 需要把 renderer/workspace/conversation 状态塞进 migration registry（见 Surface plan 的 track 关系节）；
- fixture 或 workload 需要从 `tmp/**` / `references/**` 复制数据；
- 实现发现 live tree 与已接受 design 冲突；task plan 不得静默覆盖 design。

## 12. Promotion record

每个阶段结束时在实施提交或本计划补记中记录：

- 基线/对比报告或 red test；
- 新增或改变的 public contract；
- 被删除的 superseded 入口；
- focused、aggregate、必要时 browser 的验证命令；
- 尚未满足的 defer 或 stop condition。

Workflow 1 证明性能契约与零语义回归；Workflow 2 证明迁移是发布能力。两类证据缺一，对应 roadmap track 都不得标记完成。
