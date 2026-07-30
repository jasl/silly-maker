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

### D0b delivery record（2026-07-31）

本切片只把 file preview 的两个已知故障变成确定性 characterization；D0
仍未完成，失败结果不进入共享 conformance expected。

**目标：**

- 以 direct-file-only phase observer 精确停在全部 CAS precheck 之后，以及相邻
  file mutation 之间；
- 让两个独立 file-store handle 先同时完成 missing-revision precheck，再顺序释放
  write，确定性证明二者都返回 revision `1` 的 `committed`，后释放者覆盖最终
  bytes；
- 让独立 Deno child 在第一项 rename 完成后受控退出，再以 fresh、无
  instrumentation 的 handle 证明 left 已是 revision `2`/new bytes，而 right
  仍是 revision `1`/old bytes；
- 以普通 observer exception 对照证明现有 best-effort rollback 仍把两项都恢复为
  revision `1`/old bytes。

**非目标：**

- 不修 file adapter 的 partial batch 或 cross-process CAS，不选择
  SQLite/journal/KV；
- 不改变 `HostAtomicRecordStoreV1`、records HTTP wire、SaveRepository、Save
  envelope、desktop packaging 或 package exports；
- 不把受控 child exit 写成断电、`SIGKILL`、fsync 或 recovery promotion
  evidence；
- 不实现 `before transaction`、`after durable write before response`、
  `during recovery/reopen` 的完整 fault matrix；当前 preview adapter 没有
  durable transaction/recovery 可供伪造这些阶段。

**验收规格与证据：**

- phase events 深冻结；两项 batch 精确观察
  `between_checks_and_writes`，随后观察 `between_mutations`，其 completed 与
  remaining mutation count 都是 `1`；
- independent-handle workload 不用 sleep、轮询或调度器胜负，稳定得到
  `2 committed / 0 conflict`，最终为后释放者的 revision `1` bytes；
- ordinary injected error 经过原 rollback 路径，fresh handle 观察完整旧 batch；
  child exit 绕过 catch/rollback 后，fresh handle 稳定观察 mixed batch；
- instrumentation 只从未列入 `@sillymaker/tooling` package exports 的
  `record-file-store.mts` direct file 暴露；正常 factory 不安装 observer，也不新增
  observer await；
- focused fault characterization `1 file / 3 tests`、Tooling Desktop
  `6 files / 29 tests` 与 aggregate typecheck 通过；
- 全仓 `deno task test` 为 `184 files / 1592 tests`；`deno task check`
  全部通过（format、lint、styles、typecheck、unit、assets、Story checks 与
  Engine Lab production build）。

剩余 D0 工作包括完整 validation/corruption/key corpus、其余 fault
边界、真实 signal/power-loss recovery、独立 OS process CAS，以及 transaction
candidate 接入同一 shared conformance。file adapter 继续保持
preview/reference。

### D0c delivery record（2026-07-31）

本切片把已由 `HostRecordMutationV1` 决定的 malformed-input floor 接到真实
Desktop HTTP 路径；D0 仍未完成，file adapter 仍是 preview/reference。

**目标：**

- 用同一中性 workload 让 memory、fake IndexedDB 与真实
  HTTP client → handler → file 组合验证 29 个 malformed Host batch/member、
  discriminator、identity、bytes、revision、late-invalid 与 duplicate case；
- 每个 case 只断言 `TypeError` 类型和三个 namespace 的 key/revision/bytes
  前后完全相同，不冻结精确错误 message；
- HTTP client 在任何 malformed commit 发出 fetch 前完整验证、复制整批
  mutation；额外覆盖 non-array outer value 与 sparse batch；
- raw handler 对 15 个 JSON wire case 在调用 `store.commit` 前返回 `400`，
  file wire parser 在完整 batch parse 时拒绝 sparse member，并与 Base integer
  parser 一致拒绝 `-0`；
- 保留跨 realm `Uint8Array` 作为 HTTP valid-input 正例。

**非目标：**

- 不把额外字段、prototype/accessor、embedded NUL key 或 Unicode collation
  定义成新合同，不决定 stale `MAX_SAFE_INTEGER` 的 conflict/overflow
  优先级；
- 不改变有效 put/delete 的 JSON fields、status/result、records wire、
  `HostAtomicRecordStoreV1`、SaveRepository、Save envelope 或 package exports；
- 不改变 browser IndexedDB adapter；其 shared malformed corpus 只增加测试；
- 不处理 crash/recovery、cross-process CAS、durable backend 选择、packaging
  或 migration。

**验收规格与证据：**

- red baseline 中 malformed workload 发出 `27` 次 commit HTTP request，而正确
  上限只有合法 seed 的 `1` 次；unknown kind 可变成 delete、普通 array bytes
  可被写入、`NaN` revision 可先提交再由 client 报错；
- raw `expectedRevision: -0` 的 handler baseline 返回 `200` 并调用 backing，
  direct file parser 也不抛错；
- green 后 29 个 shared case 全部为
  `rejectedWithTypeError: true / statePreserved: true`，non-array 与 sparse batch
  的 `/commit` endpoint request count 为 `0`，完整 workload 只有 seed 的 `1`
  次 request；
- literal `-0` 与其余 raw malformed batch 全部返回 `400`，handler
  `store.commit` 调用数为 `0`；跨 realm bytes round-trip 保持
  `[0, 255, 16]`；
- focused red/green 为 `5 files / 26 tests`；Base contracts/testkit 为
  `34 files / 234 tests`，Web Host 为 `5 files / 39 tests`，Tooling Desktop 为
  `7 files / 33 tests`；
- 全仓 `deno task test` 为 `185 files / 1599 tests`；`deno task check`
  全部通过（format、lint、styles、typecheck、unit、assets、Story checks 与
  Engine Lab production build）。

剩余 D0 工作包括 overflow/corrupt/key corpus、其余 fault 边界、真实
signal/power-loss recovery、独立 OS process CAS，以及 transaction candidate
接入同一 shared conformance。cross-realm IndexedDB valid-input parity 是独立 Web
Host 问题，不由本 Desktop malformed 切片改动。

### D0d delivery record（2026-07-31）

本切片只补齐已由 safe-integer revision 与 multi-key atomicity 决定的
matched-MAX exhaustion baseline；D0 仍未完成，file adapter 仍是
preview/reference。

**目标：**

- 用同一中性 workload 验证
  `actualRevision === expectedRevision === Number.MAX_SAFE_INTEGER` 的 put；
- 预置一个可经 Host `read` 精确验证 namespace、key、revision 与 bytes 的合法
  MAX record，再执行“先创建 missing key、后更新 MAX record”的两项 batch；
- memory、fake IndexedDB、direct file preview 与真实
  HTTP client → handler → file 都必须以 `TypeError` 拒绝，前项保持 missing，
  MAX record revision/bytes 完全不变；
- 对 IndexedDB、direct file 与 HTTP/file 组合用 fresh adapter handle 再次验证
  backing 中 MAX record 未变、前项仍 missing；
- HTTP 边界明确产生一次 commit request，并依次观察全部 CAS check 完成与第一项
  mutation 完成的 package-internal phase，证明证据覆盖 server/file rollback，
  而不是 client 或 handler preflight 短路。

**非目标：**

- 不决定 stale MAX 的 conflict/overflow 优先级；memory/IndexedDB 在 storage read
  前计算 next revision，而 file preview 先做 CAS，当前顺序差异不进入合同；
- 不实现 revision wrap、saturation、BigInt 或新的 public error/status；
- 不改变 `HostAtomicRecordStoreV1`、records HTTP/JSON wire、SaveRepository、
  Save envelope、package exports 或生产 adapter；
- 不处理 corrupt record、key grammar/collation、crash/recovery、cross-process
  CAS、durable backend 选择、packaging 或 migration。

**验收规格与证据：**

- shared report 的 seed、overflow rejection、earlier preservation 与 maximum
  preservation 四项均为 `true`，不冻结精确 error message；
- 本切片是现状通过的 conformance baseline：没有诚实的 production behavior
  red，因此只增加 direct-file/test-only workload 与 adapter-local seed fixture，
  不制造生产实现改动；原有 Base/file 单 adapter overflow 测试被 shared workload
  取代；
- focused 为 `4 files / 16 tests`；Base contracts/testkit 为
  `34 files / 234 tests`，Web Host 为 `5 files / 40 tests`，Tooling Desktop 为
  `7 files / 34 tests`；
- 全仓 `deno task test` 为 `185 files / 1601 tests`；`deno task check`
  全部通过（format、lint、styles、typecheck、unit、assets、Story checks 与
  Engine Lab production build）。

剩余 D0 工作包括 corrupt/key corpus、其余 fault 边界、真实
signal/power-loss recovery、独立 OS process CAS，以及 transaction candidate
接入同一 shared conformance。stale MAX precedence 仍需单独合同决定，不得从本
baseline 推导。

### D0e delivery record（2026-07-31）

本切片只建立 persisted-record 的 read/list fail-closed baseline；D0
仍未完成，file adapter 仍是 preview/reference。

**目标：**

- 用 direct-file/test-support-only report 让 fake IndexedDB 与 direct file
  preview 对客观非法的 persisted metadata/value 执行相同 read/list probe；
- 两个 adapter 都覆盖 missing revision、`-0` revision、missing bytes 与错误
  bytes 表示；file 额外覆盖 truncated JSON；
- 每次 `read(corruptKey)` 与 `list(namespace)` 使用分别新建、只含一个 corrupt
  target 与一个合法 neighbor 的 backing，必须 reject 而不能返回 missing 或静默
  省略坏记录；
- 每次 rejection 后，合法 neighbor 的 namespace/key/revision/bytes 必须保持
  完全一致且仍可读取；
- 原 file invalid-JSON 单测由更强的同 corpus read/list + neighbor-preservation
  证据取代。

**非目标：**

- 不决定 persisted record extra-field policy；IndexedDB 当前 exact-reject，
  file 当前忽略额外字段，而 file format 尚无 accepted per-record schema marker；
- 不定义 unknown/future record schema、repair、rewrite、delete、quarantine、
  recovery 或 migration；
- 不覆盖 commit-on-corrupt、fresh reopen、raw backing byte preservation、
  corrupt database、disk full/read-only、filename/key collision 或 HTTP error
  mapping；
- 不冻结 error class、message、code/status，不改变 Host、Save、records wire、
  package export 或生产 adapter。

**验收规格与证据：**

- 每个 case 的 frozen report 中 `readRejected`、`listRejected`、
  `neighborPreservedAfterRead` 与 `neighborPreservedAfterList` 均为 `true`；
- 本切片是现状通过的 conformance baseline，没有 production behavior red，
  因而没有制造生产实现改动；
- focused 为 `2 files / 16 tests`；Web Host 为 `5 files / 44 tests`，
  Tooling Desktop 为 `7 files / 38 tests`；
- 全仓 `deno task test` 为 `185 files / 1609 tests`；`deno task check`
  全部通过（format、lint、styles、typecheck、unit、assets、Story checks 与
  Engine Lab production build）。

剩余 D0 corruption 工作包括 commit-on-corrupt atomicity、raw backing/fresh
handle 证据、额外 persisted shape 与 future-schema policy，以及 corrupt
database/recovery。key corpus、其余 fault 边界、真实 signal/power-loss、
独立 OS process CAS 和 transaction candidate 也仍未完成。

### D0f delivery record（2026-07-31）

本切片只建立 valid-revision/invalid-value 的 commit-on-corrupt atomic
baseline；D0 仍未完成，file adapter 仍是 preview/reference。

**目标：**

- 用 direct-file/test-support-only workload 让 fake IndexedDB 与 direct file
  preview 执行同一个两项 put batch：先创建 missing earlier key，再以
  `expectedRevision: 1` 更新 raw revision 同为 `1` 的 corrupt target；
- 两个 adapter 都覆盖 persisted value 缺失和错误表示：IndexedDB 的 missing
  `bytes`/string `bytes`，以及 file 的 missing `bytesBase64`/invalid base64；
- commit 必须 reject 而不能返回 conflict 或 committed，earlier mutation
  必须保持 missing；
- 在任何 post-read 或 fresh-open 前，用 adapter-local snapshot 证明完整逻辑
  record backing 未变：IndexedDB 比较全部 raw rows、own fields、value 类型与
  bytes，file 比较完整相对 entry tree 与原始文件 bytes；
- rejection 后才创建 fresh adapter handle，再次证明 earlier missing、corrupt
  target read reject，且合法 neighbor 的 namespace/key/revision/bytes 完全一致。

**非目标：**

- 不把 IndexedDB/SQLite 文件、WAL、transaction metadata、mtime 或 inode 的物理
  byte-for-byte 不变升级成 Host 合同；
- 不覆盖 missing/`-0`/负数/非整数/unsafe persisted revision；这些 case
  无法构造合法且精确匹配的 Host expected revision，会引入 corruption 与
  conflict/preflight precedence 决策；
- 不覆盖 truncated JSON、wrong identity、delete-on-corrupt、extra fields、
  future schema、repair、quarantine、recovery 或 stable error taxonomy；
- 不改变 production adapter、Host/Save/records wire、package exports，也不把
  opaque Host bytes 的应用 payload 内容定义成 storage corruption。

**验收规格与证据：**

- frozen report 的 `commitRejected`、`recordBackingUnchangedAfterCommit`、
  `earlierMutationAbsent`、`freshHandleEarlierMutationAbsent`、
  `freshHandleCorruptReadRejected` 与 `freshHandleNeighborPreserved` 均为
  `true`；
- TDD red 为新增 runner 尚不存在时 `4 failed / 16 passed`；最小 test-support
  runner 后 focused green 为 `2 files / 20 tests`，没有 production source
  改动；
- Web Host 为 `5 files / 46 tests`，Tooling Desktop 为
  `7 files / 40 tests`；
- 全仓 `deno task test` 为 `185 files / 1613 tests`；`deno task check`
  全部通过（format、lint、styles、typecheck、unit、assets、Story checks 与
  Engine Lab production build）。

该证据只证明 corrupt-current precheck fail-closed 且没有 partial record
mutation，不证明 crash atomicity、durability 或 fault-injection promotion。
剩余 D0 corruption 工作包括 persisted revision precedence、额外 shape 与
future-schema policy、repair/quarantine/recovery。key corpus、其余 fault
边界、真实 signal/power-loss、独立 OS process CAS 和 transaction candidate
也仍未完成。

### D0g delivery record（2026-07-31）

本切片只把 file preview 缺少独立 OS-process CAS authority 的事实变成确定性
characterization；D0 仍未完成，失败结果不进入共享 conformance expected。

**目标：**

- 启动两个 PID 不同、同时存活的真实 Deno child，共享同一临时 file backing，
  对同一个 missing lease key 以 `expectedRevision: null` 提交不同 bytes；
- 每个 child 通过 direct-file-only phase observer 在全部 precheck 完成、任何
  write 之前发送 `ready`，然后等待 parent 的精确 `release` token；
- parent 必须先等两个 child 都 ready，再释放 left 并等待其正常完成，最后释放
  right 并等待其正常完成；
- 两个 child 都必须精确返回 committed revision `1` 与各自 bytes，fresh、
  无 instrumentation 的 store 最终精确读到 revision `1`/right bytes；
- IPC 只使用 stdin/stdout 协议，不用 sleep、轮询或 scheduler winner；所有成功/
  失败路径都关闭 pipe、终止必要 child 并等待真实 process close。

**非目标：**

- 不修 cross-process CAS、不加锁、不选择 SQLite/journal/KV，不把 file adapter
  promotion 为 production/durable Host store；
- 不覆盖 existing-revision update/delete、multi-key batch、其他 interleaving、
  stress、crash、signal、power loss、fsync、recovery、migration 或
  disk-full/read-only；
- 不改变 production store、HTTP wire、SaveRepository、Save envelope、
  Base/Story API、package exports、desktop packaging 或平台支持声明；
- 不从当前机器的 child-process 结果推导 Windows/Linux 已验证；timeout 只作为
  挂死保护，不作为协调或通过条件。

**验收规格与证据：**

- TDD red 为 child fixture 尚不存在时 `1 failed / 3 passed`；加入
  test-only child handshake 后 focused green 为 `1 file / 4 tests`，同一 focused
  测试连续 `30/30` 通过；
- parent/left/right 三个 PID 互不相同且双方 child 都 ready；结果固定为
  `2 committed / 0 conflict`、revision `[1, 1]`，left 完成后 fresh read 为
  left bytes，right 完成后 fresh read 为 right bytes；
- child stdout 只含 `ready` 与一行 JSON result，stdin 精确校验 `release\n`，
  stderr 只作诊断；协议 result 与只由 process close 结算的 `exited` 分离；
- 变更只含 direct test 与未进入 package exports 的 child fixture，没有
  production source 改动；
- Tooling Desktop 为 `7 files / 41 tests`；全仓 `deno task test` 为
  `185 files / 1614 tests`；`deno task check` 全部通过（format、lint、styles、
  typecheck、unit、assets、Story checks 与 Engine Lab production build）。

该证据只证明当前 preview adapter 在确定性门控下可让两个独立进程都提交同一
missing revision；它不证明 crash atomicity 或 durability。剩余 D0 工作包括
key corpus、其余 fault 边界、真实 signal/power-loss/recovery，以及 transaction
candidate 接入共享 conformance；cross-process CAS 的修复属于后续 durable
backend 实现。

### D0h delivery record（2026-07-31）

本切片只补齐 file preview 现有两个 phase 的异常/真实 signal 证据；D0 仍未
完成，结果不进入 durable backend 的共享 conformance expected。

**目标：**

- 在 `between_checks_and_writes` 直接注入普通异常，证明全部 precheck 完成后、
  任一 mutation 开始前的失败留下精确的旧 pair；
- 启动真实、PID 不同的 Deno child，在第一项 file mutation 已完成、第二项尚未
  开始的 `between_mutations` phase 发送 `ready` 并阻塞；
- parent 只在收到 `ready` 后发送真实 `SIGKILL`，等待真实 process close，再用
  fresh、无 instrumentation 的 handle 证明 left 是 revision `2`/new bytes，
  right 仍是 revision `1`/old bytes；
- IPC 不使用 sleep、轮询或 scheduler winner；timeout 只作为挂死保护，所有退出
  路径都终止必要 child 并等待 close。

**非目标：**

- 不修 partial batch、不增加 transaction/journal/fsync/lock/recovery，不选择或
  接入 durable backend；
- 不把 `SIGKILL` 称为 power loss，也不把单文件 rename 称为 durability
  boundary；
- 不覆盖 transaction 前后、durable write 后 response 前、recovery/reopen
  中途、disk-full/read-only、schema migration 或 backup/restore；
- 不改变 production file store、Host/Save/HTTP wire、package exports、
  desktop shell/package 或平台支持声明；POSIX signal 测试在 Windows 明确跳过，
  当前结果不推导 Windows/Linux 已验证。

**验收规格与证据：**

- TDD red 为 SIGKILL child fixture 尚不存在时 `1 failed / 5 passed`；加入
  test-only child handshake 后 focused green 为 `1 file / 6 tests`，同一
  focused 文件连续 `30/30` 通过；
- prewrite observer 只收到 frozen `between_checks_and_writes`，commit 抛出注入
  异常，fresh read 的两个 record 都逐字段保持 revision `1`/old bytes；
- SIGKILL child stdout 精确只有 `ready`，stderr 为空，close 精确为
  `code=null`、`signal=SIGKILL`，且可区分的 watchdog 没有触发；fresh read 精确
  得到 left revision `2`/new bytes 与 right revision `1`/old bytes；
- 变更只含 direct fault test、未进入 package exports 的 child fixture 和本
  delivery record，没有 production source 改动；
- Tooling Desktop 为 `7 files / 43 tests`；全仓 `deno task test` 为
  `185 files / 1616 tests`；`deno task check` 全部通过（format、lint、styles、
  typecheck、unit、assets、Story checks 与 Engine Lab production build）。

该证据只证明当前 POSIX child 在确定性 mutation gate 收到真实 `SIGKILL` 后，
preview backing 可重开并观察到 partial batch；它不证明断电、fsync 或 durable
recovery。剩余 D0 包括 key corpus，以及由 D1–D3 候选 backend 才能诚实提供的
transaction、durability、recovery、跨平台与 power-loss evidence；不得为了按
字面关闭 D0 而给 preview adapter 虚构这些 phase。

### D0i delivery record（2026-07-31）

本切片只建立 backend-independent logical key corpus，并让 file preview 与真实
HTTP → file 边界运行同一 workload 以记录 filename-mapping 缺口；D0 仍未完成，
preview 失败不进入共享成功 expected。

**目标：**

- 每个类别都使用 fresh empty store，提交不同 bytes，并记录 committed/listed
  total、exact committed/read/listed 数量、重复 list 稳定性与任一操作
  rejection；
- logical corpus 覆盖 case-distinct 两键、两个明显不同且包含 `/` 的非 ASCII
  key、`CON`/`NUL`/`COM1`/filesystem-reserved punctuation，以及两个末位不同的
  1024-code-unit representative long key；
- memory、fake IndexedDB 与 HTTP-over-memory 精确匹配同一 frozen expected；
- direct file preview 与真实 browser HTTP adapter → handler → file backing 运行
  同一 workload，并稳定暴露至少 representative-long 类不满足 logical expected。

**非目标：**

- 不改变 `HostAtomicRecordStoreV1`、key validator、HTTP wire、filename mapping、
  list comparator、production store 或 package exports；
- 不修 file preview，不选择 durable backend，不进入旧 JSON import/migration；
- 不覆盖 embedded NUL、empty key、lone surrogate/Unicode-scalar validity、
  Unicode normalization/equivalence 或跨 backend Unicode collation；这些会
  改变当前分歧的有效输入/ordering 合同；
- 1024 只是代表性 workload，不定义公共最大 key 长度或 URL/body 上限；
- 不从当前 macOS backing 推导 Windows/Linux reserved-name、case 或 length
  行为，不宣称 durability、packaging 或平台 promotion。

**验收规格与证据：**

- TDD red 为 shared runner 尚不存在时 Base focused `1 failed / 7 passed`；
  实现 test-support-only runner 后 Base focused 为 `1 file / 8 tests`；自审又用
  会在后续 read/list 原地改写旧结果的合成 adapter 复现一个活引用 false
  positive（`1 failed / 8 passed`），再用返回 `number[]` bytes 的 adapter 复现
  snapshot 正规化非法 observation 的 false positive（`1 failed / 9 passed`），
  最后用 read 返回 `Uint8ClampedArray` 复现独立 read 漏检
  （`1 failed / 10 passed`）；runner-owned record/bytes snapshot 与 cross-realm-safe
  `Uint8Array` validation 后 Base focused 为 `1 file / 11 tests`；
- 全通过 expected 的类别 key 数量固定为 `[2, 2, 4, 2]`，每类 committed/listed
  total 与 committed/read/listed exact count 都等于 key count，重复 list 稳定
  且无 rejection；
- memory、fake IndexedDB 与 HTTP-over-memory 逐字段等于 expected；report、cases
  array 与每个 case 都 frozen；
- 当前 macOS direct-file characterization 为：case-distinct committed
  total/exact `2/2`、read exact `1`、listed total/exact `1/0`；非 ASCII 为
  `2/2, 2, 2/2`；reserved 为 `4/4, 4, 4/4`；representative-long 为
  `0/0, 0, 0/0 + rejected`；每类重复 list 稳定。真实 HTTP → file 逐字段等于
  同宿主 direct-file report；两个边界都固定非 ASCII 成功类与完整 long 失败
  形状，避免任意全面拒绝伪装成已知 filename 缺口；
- focused 跨边界为 `5 files / 49 tests`；Web Host 为 `5 files / 48 tests`；
  Tooling Desktop 为 `7 files / 45 tests`；全仓 `deno task test` 为
  `185 files / 1624 tests`；`deno task check` 全部通过（format、lint、styles、
  typecheck、unit、assets、Story checks 与 Engine Lab production build）。

该 workload 冻结逻辑 key 的无碰撞期望和当前 preview 的可重复失败形状，但不把
宿主 filename 行为提升为合同。剩余 key gate 包括 general key grammar
（embedded NUL、empty key 与 lone surrogate/Unicode-scalar validity）、跨
backend deterministic ordering、公开长度/字节上限与真实 Windows/Linux
evidence；这些必须先由设计/平台 evidence 决定，不能由本机文件系统偶然定义。

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
