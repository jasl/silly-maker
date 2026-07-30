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
