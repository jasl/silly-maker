# Desktop persistence durability plan

状态：2026-07-30 审查后接受执行。本文只处理桌面 Host persistence；不改变 Gameplay Snapshot、Save envelope、slot 语义或浏览器 IndexedDB adapter。

当前 `record-file-store.mts` 已具备：

- 严格 wire 值校验；
- 乐观 revision precheck；
- 同进程串行化；
- 单记录 unique-temp + rename；
- 普通进程内错误的 best-effort rollback；
- corrupt record fail-closed；
- local HTTP 的 same-origin/content-type/body/path 边界。

但它**还不是** `HostAtomicRecordStoreV1` 的 production-grade 桌面实现：进程或 OS 在多记录 batch 中途终止仍可能留下部分提交，两个应用进程也没有共同的 CAS/transaction authority。因此文件 adapter 仅是 desktop preview/reference adapter，不能用“原子存档”概括其多记录 durability。

## 1. Scope and invariants

本计划必须维持：

1. `HostAtomicRecordStoreV1` 是唯一上层合同；Base、SaveRepository 和 Story 不依赖 SQLite、Deno KV、文件布局或 HTTP。
2. 一次 `commit([m1, ...mn])` 在进程崩溃、断电模拟和并发进程下只能出现两种可观察结果：全部旧值或全部新值。
3. revision conflict 不写入任何 mutation；成功提交为每个 put 返回单调、safe-integer revision。
4. read/list 不把 corrupt、incomplete 或 unknown-schema data 当作 missing。
5. persistence backend 不成为第二份 gameplay authority；它只保存已经由 Session 产生的 Host records。
6. wire endpoint 只接受受控 JSON 协议，不成为任意文件读写 API。
7. desktop package 的平台/格式能力必须按已验证目标声明；目标平台是
   macOS、Windows 与 Linux，但当前 `story desktop` 只验证 macOS `.app`，不能从
   Deno CLI 的跨平台能力推导 SillyMaker 已支持全部平台。
8. persistence durability、package format 和 auto-update 是三条独立 promotion
   轴；某个平台尚未支持 package/update，不能降低 durable store 的事务合同，也不能
   在 durable evidence 已通过时反向阻塞其他平台的 persistence promotion。

## 2. D0 — Contract tests and fault model

先建立 backend-independent conformance suite，memory、IndexedDB test double、当前 file preview 和候选 durable backend 都运行同一组语义测试：

- empty/malformed/duplicate mutation rejection；
- single-key put/delete/conflict；
- multi-key all-or-nothing；
- concurrent writers with the same expected revision；
- revision overflow；
- list ordering and immutable copies；
- corrupt metadata/value fail-closed；
- case-distinct、非 ASCII、超长与 filesystem-reserved key 的无碰撞 round-trip；
- reopen/restart persistence。

再建立可注入 fault points：

```text
before transaction
between checks and writes
between mutation 1 and mutation N
after durable write before response
during recovery/reopen
```

测试不得依赖真实 `kill -9` 作为唯一证据；先用 deterministic fault injection 覆盖所有边界，再用子进程 crash tests 验证真实恢复。

**Promotion gate D0:** conformance suite 能让当前 file adapter稳定暴露“batch 中途 crash 可部分提交”，而 memory/候选 transaction backend 通过语义基线。

### D0a delivery record（2026-07-30）

本切片只建立共享语义 conformance floor；D0 仍未完成。

**目标：**

- 用一个不依赖测试框架、且不进入任何 package barrel 的中性 workload，统一验证
  memory、fake IndexedDB 与经 test-only bytes/base64 bridge 接入的 file preview；
- 首批冻结 empty/duplicate rejection、single-key put/update/delete/conflict、
  multi-key success/conflict、同 expected revision 并发 CAS、stable list 与
  input/commit/read/list defensive-copy 语义；
- 对具备持久 backing 的 IndexedDB 与 file preview，用新建 adapter handle 证明
  revision/bytes 可读并可继续 CAS；
- memory 在读取当前 revision 前完整 normalize batch，并以 staged Map 一次发布，
  保证后项 revision overflow 不留下前项写入。

**非目标：**

- 不实现 deterministic crash/fault injection、真实子进程 crash、cross-process
  CAS、corrupt/recovery fixture 或 case/Unicode/reserved/超长 key 完整矩阵；
- 不选择 SQLite、journal 或 Deno KV，不改变 records HTTP/JSON wire、Save
  envelope、SaveRepository 或 desktop packaging；
- 不扩大 `HostAtomicRecordStoreV1`、Base root/testkit export 或 Story API；
- 普通 reopen 只证明 backing 可重开，不证明 batch crash atomicity；file adapter
  继续保持 preview/reference。

**验收规格：**

- 三个 adapter 对同一 core workload 产生相同 frozen report；
- later-key conflict 后两个 key 均保持旧值，合法 batch 后同时变为新值；
- 同一 adapter authority 的两个 same-revision caller 恰好一个 committed、一个
  conflict，存储 bytes 与 committed receipt 一致；
- 四条互不重叠的 mutation probe 分别证明 input、commit result、read 与 list
  bytes 不反写 authoritative backing；
- IndexedDB/file 的 fresh handle 读到 revision `1`，继续 CAS 到 revision `2`，
  再次 fresh handle 仍观察 revision `2`；
- seeded memory 的两项 batch 在第二项从 `MAX_SAFE_INTEGER` overflow 时抛错，第一
  项保持 missing、原 maximum record byte-for-byte 不变。

**执行证据：**

- shared focused conformance：3 files / 9 tests；
- 受影响 package：Base contracts/testkit 34 files / 232 tests，Web host 5 files /
  38 tests，Tooling desktop 5 files / 26 tests；
- 全仓 `deno task test`：182 files / 1574 tests；
- `deno task check` 全部通过（format、lint、styles、typecheck、unit、assets、
  Story checks 与 Engine Lab production build）。

剩余 D0 工作包括完整 malformed/overflow/corrupt/key corpus、五个 deterministic
fault points、file preview batch-crash partial 与独立 writer CAS
characterization、真实子进程 crash/reopen，以及 D1 选出的 transaction candidate
接入同一 conformance。完成这些证据前不得 promotion durability。

## 3. D1 — Backend decision record

在不改变上层合同的前提下做一个短期 spike，并留下 decision record。至少比较：

### SQLite transaction adapter（默认候选）

- 单文件 ACID transaction；
- process 间 locking/CAS；
- schema/version/recovery 工具成熟；
- 可用表 `(namespace, key, revision, bytes)`，在一个 transaction 内完成 read-check-mutate；
- 需要证明 Deno Desktop 的目标平台、cross-compile、native/wasm dependency 和 bundle size 可接受。

### Journal + manifest file adapter

- 无数据库依赖，文件可直接检查；
- 必须自行实现 lock、fsync 顺序、journal replay、manifest generation、orphan cleanup 与 Windows rename 语义；
- 只有在 SQLite 的发布约束不可接受时才进入生产实现，不把“代码更少”当作依据。

### Deno KV adapter（实验对照，不是默认生产路径）

- 原生 atomic check/mutation 与本地 SQLite backend 有吸引力；
- 目前仍需要 unstable KV 能力，不能让引擎长期 persistence contract 绑定其 API；
- 可作为 adapter spike 或未来替换候选，不作为 D1 自动结论。

Decision record 必须记录：支持平台、依赖/许可、包体、启动/commit 延迟、最大记录与 batch、备份可读性、故障恢复、cross-process 行为和退出策略。

**Promotion gate D1:** 选择一个 backend，并先用独立 backend
spike 在当前真实 macOS Host 证明启动、写入、退出、重开与 schema
upgrade。Windows/Linux 随后在各自真实 OS runner 上独立补齐相同 backend
evidence。这里不要求 `story desktop` 已支持该平台的 package format；未通过
D0–D3 前，该平台的 desktop persistence 保持 `preview`，当前 file adapter
本身也始终保持 preview/reference，除非它通过同样故障门槛。应用 auto-update
不属于本 gate。

## 4. D2 — Durable adapter implementation

实现 package-internal durable adapter：

1. storage schema 带明确 `schema_version`；
2. `(namespace, key)` 唯一；
3. transaction 内读取所有现有 revision 并比较所有 expected revision；
4. 任一 conflict 时 rollback，无可见写入；
5. 全部 mutation 同一 transaction commit；
6. commit response 只在 durability boundary 完成后返回；
7. open 时执行 bounded schema migration/recovery；
8. unknown/newer schema fail-closed；
9. close/dispose 明确，测试无遗留 handle。

如果使用 SQLite，建议逻辑表保持最小：

```sql
host_record(namespace TEXT, key TEXT, revision INTEGER, bytes BLOB,
            PRIMARY KEY(namespace, key))
metadata(name TEXT PRIMARY KEY, value TEXT)
```

不要在数据库中拆解 Save JSON、建立 gameplay 表或允许 Story 发 SQL；这不是 Runtime ORM。

当前 per-record JSON backend 可保留为：

- 开发调试/reference implementation；
- 明确命名的 preview adapter；
- durable backend 的 import source。

它不能继续作为 packaged desktop 的默认 store，除非自身通过 D0–D3 的相同故障门槛。

## 5. D3 — Recovery, migration, and operations

- 第一次启用 durable backend 时，检测旧 JSON record directory；
- 旧 `encodeURIComponent(key).json` 布局只作为 import source；导入时检测 case-insensitive/reserved-name/长度碰撞，不从文件名默默猜测两个逻辑 key 是同一记录；
- 只读扫描、完整校验后在一个 transaction 中导入；
- 导入成功后写 migration marker，再保留旧目录备份，不边读边删；
- 重复启动必须幂等；
- 提供 `inspect` / `backup` / `restore` 的 package-internal primitives，公开 CLI 由真实支持需求激活；
- diagnostics 不记录 save bytes，只记录 backend/schema/path category、record counts 和 stable error code；
- HTTP handler 继续执行 same-origin、JSON、body limit、path decode 与 namespace validation；静态服务只允许 GET/HEAD。

需要覆盖：

- transaction commit 前 crash；
- commit 后 response 前 crash（重试得到 conflict/已提交，而不是重复 revision）；
- schema migration 中途 crash；
- 两进程同时更新 lease/save/settings；
- disk full、read-only、corrupt database、backup restore；
- 非 ASCII 与包含 `/` 的 key。

**Durability promotion gate D3:** 某个平台的 durable conformance、deterministic
fault injection、真实子进程 crash/reopen、cross-process CAS 和 migration/recovery
fixture 全绿后，才可在该平台把 backend 称为 `HostAtomicRecordStoreV1` 的 durable
实现。此结论不依赖该平台 packager 或 updater 已 promotion。

## 6. D4 — Per-platform desktop packaging promotion

上游 `deno desktop` 是 experimental、跨平台能力；SillyMaker 的目标矩阵是
macOS、Windows 与 Linux。当前 live wrapper 仍固定产出并检查 macOS `.app`，所以
只有 macOS preview，不把目标矩阵写成已实现能力。

`story desktop` packaging 按平台独立 promotion，必须：

1. 用仓库 CI 声明的 Deno `latest` stable channel 运行真实
   `story desktop`，并在 promotion record 记录实际版本；
2. 在对应真实 OS runner 构建并启动该平台的真实产物，验证 embedded
   `dist`、HTML marker、records API、write → exit → reopen；
3. 验证 packaged VFS 下 static resolver 的 `lstat`/`realpath` 行为；
4. 验证 prebuilt Vite assets 原样嵌入；若 `deno desktop` 暴露等价的 as-is
   include 能力，优先使用，否则加入包含 `.js`/`.mjs` 资产的 smoke fixture 防止
   module-resolution 改写；
5. 记录该平台尚未支持的签名、notarization、installer 与 updater 边界。

D4 在 platform target、output shape 与 promotion-report contract
定稿后即可独立启动，不等待 D0–D3。它可以先使用明确标为 preview/reference
的 record adapter 验证 packaged records wiring；这条 write/reopen evidence
只证明 packaging integration，不证明 batch crash atomicity。D4 若必须改变
`HostAtomicRecordStoreV1` 或 records wire contract，则停止独立推进，与正在进行的
D0–D3 slice 串行协调。

Packaging availability 与 persistence durability 分开记录：D3 决定 durable
backend 是否可 promotion，D4 决定 `story desktop` 是否可宣称支持该平台产物。若要
宣称“该平台的 packaged app 使用 atomic persistence”，promotion record
引用两条独立 evidence，而不是把它们混成一个 gate。Auto-update 另有
capability/promotion record；它未实现或受上游限制时只影响 updater
声明，尤其不能成为 Windows persistence promotion 的 blocker。

**Packaging promotion gate D4:** 某平台的真实 package build/launch、embedded
assets、records integration 与 write → exit → reopen smoke 全绿后，
`features.md` 才可把该平台 packaging 从 preview 晋级为 supported/production
（或移除 preview 标签）。Preview 能力可以继续诚实列出当前边界。平台矩阵逐项提升；
一个平台失败不撤销另一个已经取得的 packaging 或 durability evidence。

## 7. Execution order

两条独立 lane 不组成一个 D0 → D4 串行队列：

- **Durability lane:** D0 shared conformance + fault-injection interface → D1
  backend spike/decision record → D2 transaction adapter → D3 old-record
  import/recovery/operations；
- **Packaging lane:** 先冻结 platform target/output/report contract，再按平台执行
  D4 wrapper、真实 package smoke 与 documentation promotion。它可与 D0–D3
  并行，但不改变共享 Host/Save/records wire contract。

每个提交都可独立回滚。不要在同一提交同时修改 Save envelope migration、Snapshot representation 或 Surface Coordinator。

## 8. Stop conditions

遇到以下情况先停下修订 design：

- backend 要求 Base/Story import Deno/SQLite API；
- transaction 只能保证单记录，不能保证整个 mutation batch；
- cross-process conflict 依赖进程内 mutex；
- crash recovery 需要猜测“最后可能写到哪”；
- durable store 开始解释或查询 gameplay fields；
- desktop package smoke 只能验证产物存在，无法在目标平台启动并重开；
- 为使用实验性 Host API 而把不稳定类型暴露为公共合同。
