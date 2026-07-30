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
