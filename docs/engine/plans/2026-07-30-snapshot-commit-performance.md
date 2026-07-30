# Snapshot commit performance execution plan

状态：2026-07-30 接受执行，审查后从 Save migration 拆分。承接 [roadmap](../roadmap.md) 的 Snapshot integrity track；在 [production-floor sequence](2026-07-30-production-floor-sequence.md) 中属于 PF1。本文只处理可证明等价的热路径去重，不实现 `IntegrityPolicy`、module-root digest、changed-set 或 StateStore 重写。

## 1. Outcome

- 有可重复的中性 workload 与机器可读基线；
- 每个 committed command 对 authoritative Snapshot 的全量 canonical digest 从当前重复遍历降到 **1 次**；
- rejected/faulted command 在快照对象恒等成立时为 **0 次**；
- autosave 不再对同一 Snapshot 重复 digest 或重复规范化序列化；
- 同一 transcript 的 digest、CommandLog、replay、debug bundle 与 Save bytes 保持等价。

时间预算用于 bench/nightly 趋势，不作为普通 CI 的宿主相关硬门；计数与等价性断言进入常规 tests。

## 2. S0 — Baseline and instrumentation

### Workloads

用 `@sillymaker/base/testkit` 的中性 fixture 构造：

- 100 / 1k / 10k / 100k entity Snapshot；
- 单模块单字段改动；
- 跨模块原子事务；
- 混合 committed/rejected/faulted 的长序列；
- `every_commit` autosave 与 `auto.previous` 轮转；
- authoritative replay；
- 长时内存增长采样。

### Instrumentation

对下列内部工作提供测试/bench 注入计数点，不扩大生产公共 API：

- canonical traversal / digest；
- deep-freeze traversal；
- Save canonical serialization；
- Strict JSON parse/preflight；
- CommandLog continuity verification。

输出 JSON 至临时/CI Artifact：workload ID、Snapshot 大小、command class、p50/p95、上述计数与运行环境摘要。仓库只保存预算/趋势解释，不提交一次性原始测量。

### S0 acceptance

- 当前实现的重复成本被计数而不是靠代码阅读猜测；
- 常规 test 有确定性计数断言；
- bench 不改变 production behavior；
- baseline 可在同一环境重复运行并给出同数量级结果。

## 3. S1 — Session and CommandLog digest reuse

### Changes

1. Session 安装/替换 authoritative Snapshot 时计算并缓存一次 current digest；
2. command N 的 `preStateDigest` 复用当前缓存；
3. committed command 只为新 Snapshot 计算一次 post digest，并把它安装为下一 command 的 current digest；
4. rejected/faulted 结果已满足 `result.snapshot === preSnapshot` 时，post digest 直接等于 pre digest；
5. CommandLog 保留对象恒等 continuity 断言；digest 重算自检改为明确的 debug/audit internal option，release 路径关闭；
6. anchor replacement、rollback、load、restart 与 debug command 明确刷新 digest cache，不允许隐式漏更新。

### Required tests

- committed/rejected/faulted 计数；
- queue 中连续 command 的 pre/post 链；
- rollback/load/restart/debug anchor；
- subscriber fault 不污染 digest cache；
- audit self-check 能捕获故意篡改；
- cache 不暴露为 Story 可写状态。

### S1 acceptance

- committed = 1 次全量 digest，rejected/faulted = 0 次；
- CommandLog 与 replay 条目逐字段等价；
- 任一 anchor 变化后第一条 command 的 pre digest 正确；
- `deno task test` 通过。

## 4. S2 — Persistence-path reuse

### Changes

- persistence service 只在能够证明 Snapshot 对象/authoritative revision 与 session digest 对齐时复用 digest；
- canonical Save encoding 与 Strict JSON preflight 共享一次规范化产物；
- `auto.current` → `auto.previous` 轮转不重复编码同一记录；
- 无法证明恒等时保留独立校验，不用脆弱 revision 猜测代替；
- public Save record、`stateDigest` 含义与 codec bytes 不变。

### Equivalence corpus

同一 transcript 覆盖：

- normal save/load/export/import；
- autosave rotation；
- rejected/faulted command；
- rollback；
- debug command；
- lease conflict / retry；
- anchor replacement；
- corrupted/tampered record。

改造前后的 digest、CommandLog entries、debug bundle 和 Save bytes 必须 byte-identical；只有内部计数/耗时可变化。

### S2 acceptance

- autosave 对同一 Snapshot 不重复 digest；
- serialization traversal 明显减少并有计数硬断言；
- equivalence corpus 全绿；
- `deno task check` 与相关 prebuilt/browser 路径通过。

## 5. Promotion decision after S2

S2 结束时记录：

- 各 workload before/after；
- 仍随 Snapshot 总大小线性增长的成本组成；
- 100k entity 与真实经营 Story 是否满足预算；
- deep freeze、validation、canonical traversal 各占比。

只有下列任一成立才新建设计 `IntegrityPolicy`：

1. dedup 后真实目标 workload 仍不满足预算；
2. 100k entity 小改动的 p95 明显受整树 freeze/validation 阻塞；
3. 内存/GC 证明结构共享有实际收益；
4. 第二个大状态 Story 重复出现同一问题。

设计必须比较 changed-set、module revision、persistent data structure 与 typed StateStore，不预设 ECS。

## 6. Non-goals

- 改 digest 算法或 canonical JSON；
- release 模式关闭所有验证；
- changed-subtree freeze、module-root digest、structural sharing；
- ECS/数据库化/ORM；
- Save migration；
- wall-clock microbenchmark 作为每次提交硬 gate。

## 7. Stop conditions

- 需要改变 public digest/Save/replay 语义；
- 需要移除对象恒等 continuity 才能复用；
- cache 可被 Story/renderer 直接修改；
- equivalence corpus 无法 byte-identical；
- 优化提交没有 baseline 或计数证据；
- workload 来自 `tmp/**` / `references/**`。

## 8. Promotion record

每个切片记录：red/baseline、内部合同变化、focused/aggregate 命令、before/after 计数、等价性证据、仍未满足的激活条件。S0–S2 全部通过后，roadmap 只能标记“digest/serialization dedup 已完成”，不能提前宣称 changed-set proportional commit。

### 2026-07-30 — S0a Session/CommandLog baseline

本切片只建立 Session/CommandLog 热路径的测量基础，不完成全部 S0，也不实施 S1/S2：

- `@sillymaker/base/testkit` 提供中性、生成式的 100 / 1k / 10k / 100k entity workload，覆盖单字段提交、多 State slice 提交候选、rejected 与 faulted；本切片不把手工候选误称为真实的跨 owner 事务；
- package-internal 显式注入记录 canonical traversal/digest、Session deep-freeze traversal 与 CommandLog continuity verification；现有 public Session、CommandLog、digest 和 canonical JSON 签名不变；
- 常规测试把 Session setup 固定为 digest/canonical `1`、deep-freeze `1`，并把每个 executed command 的当前基线固定为：

| command class          | canonical traversal | state digest | deep-freeze | CommandLog continuity |
| ---------------------- | ------------------: | -----------: | ----------: | --------------------: |
| single-field committed |                   4 |            4 |           1 |                     1 |
| multi-slice committed  |                   4 |            4 |           1 |                     1 |
| rejected               |                   4 |            4 |           0 |                     1 |
| faulted                |                   4 |            4 |           0 |                     1 |

- instrumented 与 production no-op 路径逐 command 比较 dispatch result、最终 Snapshot 与 CommandLog canonical bytes，保持相等；
- `deno task bench:snapshot` 只把 p50/p95、确定性计数和环境摘要写到 OS 临时目录或显式 CI artifact；墙钟结果不进入普通 CI gate，也不提交本地原始 JSON。

S0a 结束时仍属于 S0、尚未完成：基于真实 `TransactionRunner` 的跨 owner 原子事务、混合长序列（fault 必须置末或经 anchor 恢复）、`every_commit`/`auto.previous` 的 Save serialization 与 Strict JSON 计数、authoritative replay，以及长时内存增长。DebugBundle 只属于后续 byte-equivalence corpus；真实经营 Story 的预算判断属于 S2 后的 promotion decision，二者都不归入 S0 workload。静态扫描已经定位 persistence/replay 路径，但在对应 instrumentation 进入测试前，其预测次数不作为 promotion baseline。S1 digest cache 与 S2 persistence reuse 均未开始。

### 2026-07-30 — S0b Transaction/sequence/replay baseline

本切片扩展 S0 的纯测量面，不实施 S1/S2：

- 保留 S0a 的 `multi_slice_committed` 手写 control 和 workload ID，另加 `cross_owner_atomic_committed`；后者使用标准 transactional RNG，并经两个独立 owner 的真实 `TransactionRunner` proposal/apply/schema 路径一次提交 entity 与 audit slice，当前 Session/CommandLog 计数仍为 canonical traversal/digest `4/4`、deep-freeze `1`、continuity `1`；
- 中性 `mixed_long` transcript 固定为 `[cross-owner committed, single-field committed, rejected] × 85 + faulted`。256 条 admitted command 产生 170 committed、85 rejected、1 faulted，fault 保持最后一个 Snapshot 对象恒等并让 Session 进入 `fault_paused`；当前计数为 canonical traversal/digest `1024/1024`、deep-freeze `170`、continuity `256`；
- 200-entry CommandLog 上限真实移动 replay base：保留 ordinal 57–256，replay base/current `commandSequence` 分别为 `38/170`。两个独立运行的 replay base、current Snapshot 与 retained log canonical bytes 相等；
- Core authoritative replay 与 direct-file test/bench seam 共用同一个 current-digest、isolated driver 和 comparison 实现；公开 replay API 不变。成功 replay retained 200 entries 的当前计数为 canonical traversal `3409`、digest `1405`（分别为 `9 + 17N` 与 `5 + 7N`）、deep-freeze `0`、continuity `0`，结果为 authoritative match，且不修改 live Session；
- benchmark 的四档 command matrix 增加真实 cross-owner command；100-entity artifact 另记录 mixed-256 与 retained-200 replay。常规测试只锁定上述计数和等价性，p50/p95 仍只作临时/CI artifact 趋势。

仍属于 S0、尚未完成：`every_commit`/`auto.previous` 的 Save canonical serialization 与 Strict JSON parse/preflight 计数，以及长时内存/GC 增长采样。DebugBundle/Save byte-equivalence corpus、S1 digest cache 与 S2 persistence reuse 均未开始。

### 2026-07-30 — S0c Persistence/autosave baseline

本切片继续扩展 S0 的纯测量面，不实施 S1 digest cache 或 S2 persistence reuse：

- 中性 fixture 固定为 100 entities，使用标准 `every_commit` / `committed_snapshots` 路径连续执行两次真实 `cross_owner_atomic_committed` command，并在每次提交后等待 `autoSaveIdle()`；第一次写入只有 `auto.current`（command sequence / record revision `1/1`），第二次写入后 `auto.current` 为 `2/2`、`auto.previous` 为 `1/1`；
- package-internal / direct-file-only 注入把 Save canonical serialization、Strict JSON parse/preflight 接入既有 Snapshot work counter，公开 Session、Persistence、Save codec、digest 和 canonical JSON API 均未扩大；
- 常规测试固定下列当前基线；两次提交的合计不包含单独列出的 setup：

| phase                         | canonical traversal | state digest | deep-freeze | CommandLog continuity | Save serialization | Strict JSON parse | Strict JSON preflight |
| ----------------------------- | ------------------: | -----------: | ----------: | --------------------: | -----------------: | ----------------: | --------------------: |
| setup                         |                   1 |            1 |           1 |                     0 |                  0 |                 0 |                     0 |
| first commit + autosave idle  |                  11 |            9 |           1 |                     1 |                  2 |                 1 |                     2 |
| second commit + rotation idle |                  14 |           11 |           1 |                     1 |                  3 |                 2 |                     3 |
| two-commit aggregate          |                  25 |           20 |           2 |                     2 |                  5 |                 3 |                     5 |

- instrumented 与 production no-probe 路径逐次比较 dispatch result、最终 Snapshot、CommandLog canonical bytes，以及 Host 中 `auto.current` / `auto.previous` 的原始 record revision 和 bytes，保持相等；
- benchmark 的 persistence class 每个 sample 使用新 fixture，并只计时两次 commit + autosave drain；确定性计数进入普通测试，p50/p95 仍只写临时目录或 CI artifact，不成为宿主相关硬门。

该中性 100k-entity Snapshot 的 Save 会超过现有 Strict JSON `maxNodes: 100_000` 保护上限；S0c 因而固定 100 entities，不改变 Save 格式或公开限额。S0a/S0b 的 command / transaction matrix 仍覆盖 100 / 1k / 10k / 100k 四档，mixed sequence 与 retained replay 则保持固定 100-entity workload。

S0 尚未完成的下一切片是长时内存/GC 增长采样（S0d）。DebugBundle/Save byte-equivalence corpus、S1 digest cache 与 S2 persistence reuse 均未实现。

### 2026-07-30 — S0d Long-lived memory/GC baseline

本切片完成 S0 的最后一项基线，只测量一个长寿命 Session 的 retained-memory 趋势，不实施结构共享、S1 digest cache 或 S2 persistence reuse：

- 新增独立的 `deno task bench:snapshot:memory`；它写入 schema-v1 `snapshot_memory_growth_baseline_v1`，不改变既有 `deno task bench:snapshot` schema v3。默认输出仍位于 OS 临时目录，也可用 `--output <path>` 写 CI artifact；本地原始 JSON 不提交；
- 固定中性 profile 为 1k entities、同一 Session 连续 1,200 次真实 `cross_owner_atomic_committed`，CommandLog 上限保持 200。采样 checkpoints 为 command sequence `0 / 200 / 400 / 800 / 1,200`，steady-state 从 `400` 起算；
- 每个 checkpoint 先读取一次 `Deno.memoryUsage()`，再执行显式 `gc -> macrotask -> gc`，然后读取 after-GC 值。runner 作为独立进程运行并在 JSON 中记录 Deno/V8/target 与 GC 测量方式；
- 常规测试固定 schedule、计数、schema 和 byte-equivalence，不对 memory、wall-clock 或 GC 结果设置 CI 硬门。setup 与 1,200-command run 的当前确定性计数分别为：

| phase | canonical traversal | state digest | deep-freeze | CommandLog continuity | Save serialization | Strict JSON parse | Strict JSON preflight |
| ----- | ------------------: | -----------: | ----------: | --------------------: | -----------------: | ----------------: | --------------------: |
| setup |                   1 |            1 |           1 |                     0 |                  0 |                 0 |                     0 |
| run   |               4,800 |        4,800 |       1,200 |                 1,200 |                  0 |                 0 |                     0 |

- final invariant 为 current command sequence / audit count `1,200/1,200`，target entity `500` 的 value 为 `1,215`，retained CommandLog 为 200 entries，replay base sequence 为 `1,000`，保留 ordinal `1,001–1,200`；recomputed replay-base/current digest 分别等于保存的 replay-base/last-post digest。201-command focused control 还把 instrumented 与 production no-probe 的最终 Snapshot、retained CommandLog 和 eviction 后 replay base 的 canonical bytes 逐字节比较为相等。

当前环境的两次重复运行均为 Deno 2.9.4 / V8 15.0；这些 patch/engine 版本只随测量记录，不成为支持版本固定条件：

| sample | dispatch total | post-GC steady heapUsed delta (`400 -> 1,200`) | post-GC steady heapUsed end | post-GC steady RSS delta |
| ------ | -------------: | ---------------------------------------------: | --------------------------: | -----------------------: |
| A      |     5,664.5 ms |                                       60,224 B |                 7,337,552 B |              2,719,744 B |
| B      |     5,743.4 ms |                                      570,648 B |                 7,848,040 B |              2,326,528 B |

趋势解释只到这里：CommandLog 填满后，post-GC retained heap 保持同一数量级并接近平台；RSS 与 V8 `heapTotal` 不等同于 live-object 数量，以上结果也不是启动结构共享或 `IntegrityPolicy` 的结论。是否激活更深的 proportional-commit 设计仍须等待 S1/S2 去重后的 promotion decision。

S0 至此完成。S1 Session/CommandLog digest reuse 与 S2 persistence-path reuse 尚未开始；DebugBundle/Save 的完整 byte-equivalence corpus属于对应后续切片。

### 2026-07-30 — S1 Session digest authority and CommandLog audit policy

本切片完成 S1，不进入 persistence digest/serialization reuse：

- `GameSession` 以词法私有状态持有与当前 authoritative Snapshot 同步的 digest；它不进入 Snapshot、Save、rollback checkpoint、Story state、public port 或 package export，不构成第二份 authoritative state；
- initial Snapshot 在 deep-freeze 后计算一次 digest，并把同一值用于 CommandLog replay base。committed candidate 先完成 integrity finalization 和整树 freeze，再计算唯一 post digest；`onAttempt`、CommandLog 与 subscriber 因而不会看到 digest 后仍可变的 Snapshot。rejected/faulted 在 Snapshot 对象恒等成立后直接令 post digest 等于 cached pre digest；
- Session 的 package-internal CommandLog 路径关闭每条 entry 的全量 digest 重算，但继续无遍历地验证 pre Snapshot 对象恒等、`pre digest == previous post / replay-base digest`、non-committed `post == pre` 与 non-committed Snapshot 对象恒等。显式 internal audit 会重算 pre/post；公共 `createCommandLogV1` 仍默认开启完整 audit，并忽略 JS 调用夹带的 internal-only digest hint，原有坏 digest 拒绝语义不变；
- runtime replay-base replacement 在 callback 成功后一起安装 prepared CommandLog anchor、prepared digest 与 Snapshot；load、exact/adopted import、boot autosave resume、restart 和 rollback 均走该路径。fixture/DebugBundle anchor 则对加入 integrity mutation reason 后的最终 Snapshot 计算并安装 digest。callback failure、rejected import 与 HMR skip 不安装候选 cache；
- queued command、throwing subscriber、committed/faulted DebugCommand、201-entry eviction、authoritative replay、actual application anchors 与 observer mutation 均有 focused coverage。instrumented/no-probe workload 继续逐字节比较 dispatch result、Snapshot、retained CommandLog 和 replay base；public replay 仍独立审计，不读取 Session cache。

确定性计数变化如下；deep-freeze、CommandLog continuity、Save serialization 与 Strict JSON 计数均保持不变：

| workload / phase                    | canonical traversal before | canonical traversal after | state digest before | state digest after |
| ----------------------------------- | -------------------------: | ------------------------: | ------------------: | -----------------: |
| Session setup                       |                          1 |                         1 |                   1 |                  1 |
| committed command                   |                          4 |                         1 |                   4 |                  1 |
| rejected / faulted command          |                          4 |                         0 |                   4 |                  0 |
| mixed 256 commands (170 committed)  |                      1,024 |                       170 |               1,024 |                170 |
| 201 committed commands              |                        804 |                       201 |                 804 |                201 |
| 1,200 committed commands            |                      4,800 |                     1,200 |               4,800 |              1,200 |
| first autosave including Session    |                         11 |                         8 |                   9 |                  6 |
| rotating autosave including Session |                         14 |                        11 |                  11 |                  8 |
| two autosaves aggregate             |                         25 |                        19 |                  20 |                 14 |

同一 Deno 2.9.4 / V8 15.0 环境、`warmup = 0`、单样本复测只作为方向性趋势，不作为 CI gate：100k `single_field_committed` 从 `650.5 ms` 降至 `185.1 ms`，10k `cross_owner_atomic_committed` 从 `69.6 ms` 降至 `35.7 ms`。1k-entity / 1,200-command memory workload 的两次复测总 dispatch 时间从 S0d 的约 `5.7 s` 降至约 `1.91 s`，确定性 run digest 计数从 `4,800` 降至 `1,200`；post-GC `heapUsed` 终值和 steady delta 仍与 S0d 同数量级，因此本切片只记录 CPU 趋势，不声称 retained-memory 改善。所有原始 JSON 仍只位于 OS 临时目录。

Autosave 仍对同一 Snapshot 执行 persistence-owned digest、Save canonical serialization、Strict JSON preflight/readback 与 rotation encoding；这些已计数的剩余重复只属于 S2。PF1 尚未完成，`IntegrityPolicy`、changed-set、结构共享与 StateStore 仍未激活。

### 2026-07-30 — S2a Installed-Snapshot digest evidence

本切片只建立 Session → Persistence 的 exact-identity digest 证据，不完成 S2 的 encoding/preflight reuse：

- `GameSession` 用双层弱引用表把 exact runtime-control identity、已经成功安装的 exact Snapshot identity 与 freeze 后 digest 绑定。initial、game/debug commit 与 runtime/debug anchor 都只在 Snapshot/digest 已同步安装后、任何 publish/subscriber 前登记；历史 committed Snapshot 只作为弱键保留，因此 delayed/debounced candidate 可以命中而不会被强引用；
- lookup 只允许 package-internal direct-file import，不增加 runtime-control own property、public subscription 参数、Story state、Snapshot、Save 或 package export。same-bytes clone、另一 Session、opaque runtime-control wrapper 与未成功安装的 anchor candidate 都不能命中；
- Persistence 在 `makeRecord` 时惰性 lookup；miss 保留原来的独立 digest。Save record / Snapshot schema 会创建 normalization 后的新对象，且 `RuntimeSchemaV1` 允许转换输出，因此 public/internal codec 对 normalized Snapshot 的 digest audit、physical readback audit 与坏 digest 拒绝语义都保持不变，不能把 pre-parse Session 证据越权传给它们。

TDD red 先得到 S1 后的旧计数 `8/6`、`11/8`、aggregate `19/14`；green 后只有同一个 installed Snapshot 上的两次 `makeRecord` digest 被消除：

| phase                         | canonical traversal before | canonical traversal after | state digest before | state digest after |
| ----------------------------- | -------------------------: | ------------------------: | ------------------: | -----------------: |
| first commit + autosave idle  |                          8 |                         6 |                   6 |                  4 |
| second commit + rotation idle |                         11 |                         9 |                   8 |                  6 |
| two autosaves aggregate       |                         19 |                        15 |                  14 |                 10 |

deep-freeze、CommandLog continuity、Save serialization 与 Strict JSON parse/preflight 计数不变。中性 workload 另用 opaque runtime-control wrapper 强制 fallback，确认它恢复旧计数，同时 optimized/fallback 两轮 `auto.current` / `auto.previous` Host revision 与原始 bytes 完全相等。S2 仍未完成：同一 normalized Save envelope 的 expected re-encoding、canonical/Strict-limits shared traversal、rotation 的唯一必要 encodes，以及完整 equivalence corpus 属于后续切片。

### 2026-07-30 — S2b Attempt-local Save write receipt

本切片只消除一次成功物理写后、为比较 expected bytes 而执行的同一 current envelope 二次编码；canonical encoding 与 Strict JSON limits 仍是两次独立遍历：

- 只有 standard Persistence composition 为 built-in `SaveRepository` 启用 package-internal receipt evidence。Repository 在 Host CAS commit 前保留一份 encoded current bytes 的防御性副本，并且只在 commit 返回 committed 后，把 exact repository identity + exact frozen saved-result identity 绑定到这次 attempt；
- Persistence 仍执行 physical read/decode、normalized Snapshot digest、lease fence、Host/Save revision、captured command sequence 与 raw-byte 验证。exact one-shot receipt 命中时在内部直接比较并消费；receipt mismatch 仍是 conflict，miss 才执行原来的 `makeRecord + encode`；
- custom/decorated Repository、result clone、另一 Repository、standalone public Repository 与 rejected/CAS-loser attempt 都没有 receipt。receipt 不进入 `SaveRepositoryV1`、write result、runtime barrel 或 Snapshot/Save 数据，也不成为跨 attempt 的 latest-bytes cache；
- `auto.previous` 的 slot ID / record revision 与旧 `auto.current` 不同，rotation 仍必须 decode current，并分别编码 previous 与新 current。receipt 只对应本次新 current，不能 raw-copy 给 previous。

TDD red 先把 standard workload 目标改为下表，在 S2a HEAD 上得到 3/3 失败与旧计数 `6/4`、`9/6`、aggregate `15/10`。green 只删除每轮一次 expected `makeRecord + encode`：

| phase                         | canonical traversal before | canonical traversal after | state digest before | state digest after | Save serialization before | Save serialization after | Strict preflight before | Strict preflight after |
| ----------------------------- | -------------------------: | ------------------------: | ------------------: | -----------------: | ------------------------: | -----------------------: | ----------------------: | ---------------------: |
| first commit + autosave idle  |                          6 |                         4 |                   4 |                  3 |                         2 |                        1 |                       2 |                      1 |
| second commit + rotation idle |                          9 |                         7 |                   6 |                  5 |                         3 |                        2 |                       3 |                      2 |
| two autosaves aggregate       |                         15 |                        11 |                  10 |                  8 |                         5 |                        3 |                       5 |                      3 |

Strict readback parse 保持 `1 / 2 / aggregate 3`，deep-freeze 与 CommandLog continuity 保持每轮各 1。只遮蔽 receipt 的 opaque Repository wrapper 恢复 S2a 的 `6/4`、`9/6` 与 `2/3` 次 serialization/preflight；只遮蔽 Session digest evidence、仍命中 receipt 的 runtime-control wrapper 则为 `5/4`、`8/6`。两类 fallback 与 optimized 两轮 `auto.current` / `auto.previous` Host revision 和原始 bytes 完全相等；既有 semantic-equivalent physical-byte tamper 测试仍返回 conflict。

receipt 路径保留一次 commit 前的 encoded-byte 防御性复制，以及由 matcher 执行的既有 raw-byte comparison；这两个线性 byte pass 不伪装成 canonical traversal，留到 S2d 统一 benchmark/成本归因。S2 仍未完成：S2c 将在不改变 schema/digest/canonical/Strict 错误顺序的前提下共享 canonical encoding 与 Strict limits traversal；S2d 仍需完整 equivalence corpus、browser/prebuilt 验证、before/after benchmark 与 PF1 promotion decision。

### 2026-07-30 — S2c Shared Save canonical/Strict traversal

本切片只合并 Save encode 的 canonical serialization 与 Strict limits preflight，不完成 S2 的 equivalence corpus 或 promotion：

- Save encode 的 `record schema parse -> envelope validation -> normalized Snapshot digest audit` 顺序不变。随后 package-internal combined helper 只执行一次 observed canonical traversal，同时统计 depth、nodes、array items、object members、decoded string bytes 与 dangerous keys；生成后的 bytes 不再交给 `parseStrictJson` 做第二次 preflight traversal。public/digest/replay 使用的 unobserved canonical encoder 保留原递归 fast path，不承担 Save-only observer bookkeeping；
- public `canonicalJsonBytes`、`parseStrictJson`、Save codec 签名、`saveJsonLimitsV1` 与 decoder 均未改变。untrusted bytes 的 decode 仍完整执行 Strict UTF-8 / BOM / syntax / duplicate-key / limits parser，再进行 schema 与 digest audit；
- inline tracker 只记录第一个 Strict 候选，绝不提前终止 canonical encoding。任一后续 canonical error、array getter 或原生异常仍优先；canonical 成功后，最终 byte length 的 `limit.bytes` 仍覆盖其他 Strict 候选。其余顺序保持 depth before nodes、array/object count before extra child/key、key string limit before dangerous key；
- `strictJsonPreflights` 继续只计“canonical bytes 生成后另行执行的 Strict parse traversal”，因此每次 Save encode 从 `1` 降为 `0`；inline limits protection 已包含在同一次 `saveCanonicalSerializations` / `canonicalTraversals` 中，不另造一个会掩盖已消除遍历的逻辑事件。

TDD red 在 S2b HEAD 上得到 codec 1 个、persistence workload 4 个确定性失败，received 仍为每次 encode 一个独立 preflight。green 后，tuple 按 `canonical traversal / digest / Save serialization / Strict read parse / standalone preflight` 记录为：

| path                    | first commit + autosave |            rotation |             aggregate |
| ----------------------- | ----------------------: | ------------------: | --------------------: |
| standard                |     `4 / 3 / 1 / 1 / 0` | `7 / 5 / 2 / 2 / 0` |  `11 / 8 / 3 / 3 / 0` |
| runtime digest fallback |     `5 / 4 / 1 / 1 / 0` | `8 / 6 / 2 / 2 / 0` | `13 / 10 / 3 / 3 / 0` |
| write-receipt fallback  |     `6 / 4 / 2 / 1 / 0` | `9 / 6 / 3 / 2 / 0` | `15 / 10 / 5 / 3 / 0` |

deep-freeze 与 CommandLog continuity 仍为每轮各 `1`。一个固定 Save canonical text golden 防止新旧路径只用共享 core 自证；direct-file differential matrix 把 combined helper 与旧 composition `canonicalJsonBytes + parseStrictJson` 对照，覆盖全部六项 limits、dangerous keys、Unicode/key order、多重违规优先级、canonical errors、cycle/shared alias 与 object/array accessor 行为。既有 standard/no-probe、digest fallback 与 receipt fallback workload 继续逐 slot 比较 Host revision 及 `auto.current` / `auto.previous` 原始 bytes。

S2 仍未完成。S2d 还需 normal save/load/export/import、autosave rotation、rejected/faulted、rollback、debug command、lease conflict/retry、anchor replacement 与 corrupted/tampered record 的完整 byte-equivalence corpus，browser/prebuilt 验证、before/after benchmark、剩余 byte-copy/compare 成本归因，以及 PF1 promotion decision。
