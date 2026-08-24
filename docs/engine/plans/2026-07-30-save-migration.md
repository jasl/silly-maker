# Save migration execution plan

状态：2026-07-30 接受执行，审查后从 Snapshot 性能计划拆分；2026-07-31 按
M0a/M0b metadata ownership 与 PF-DET same-HEAD join 重切片；2026-08-03 M1 已
promotion，same-HEAD join 已关闭，并按接受的 State-only contract 把 M2 拆为
M2a–M2e；2026-08-04 M2e 已完成 real-owner/four-runtime promotion，M2 aggregate
已关闭；2026-08-12 M3.0 docs-only exact entry 与 M3.1 read-only inspection
均已完成，M3.1 已转为 historical；M3.2 adoption declaration set 现也已完成并转为
historical；M3.3 same-namespace bounded backup repository substrate 现也已完成并转为
historical；M3.4 upgrade/re-anchor and backup-resolution operations 现也已完成并转为
historical；M3.5 player-readable Save recovery UI 现也已完成并转为 historical；M3.6.0
docs-only exact inventory corrective 与 M3.6a maintained product corpus and Story lifecycle
现也已完成并转为 historical；M3.6b four-runtime corpus parity 现也已完成并转为
historical；M3.6c Browser repeated-download evidence 与 M3.6d live docs/PF5 promotion 也已
完成并转为 historical，PF5/M3 已关闭。当前顺序只由
[production-floor sequence](2026-07-30-production-floor-sequence.md) 拥有。目标合同见
[Save migration design](../design/save-migration.md)；在
[production-floor sequence](2026-07-30-production-floor-sequence.md) 中分为 PF3
与 PF5，并与 PF-DET 按显式 DAG 汇合；不是“完整 PF-DET 后才开始全部 M0–M2”。

## 1. Outcome

- bounded envelope 在 current Snapshot schema 之前可安全解码；
- schema revision 通过相邻、纯函数、确定性的 migration chain 演进；
- migration、same-schema adoption 与 CommandLog compatibility 是不同轴；
- migration 成功后安装新的 authoritative replay anchor，失败不修改原记录或 live Session；
- 每个受支持正式 Save revision 有 maintained fixture，并在 CI 中 migrate + validate + load；
- 玩家可以 dry-run、看到可行动结果，并在写入前保留原记录。

## 2. M0a — Shared Save metadata floor

M0a 紧随 DET0-core，在任何可能改变合法 authoritative bytes/order 的 DET-A 工作前
建立唯一的 maintained Save-metadata corpus。它只冻结已经落地的 envelope
metadata，不冻结 zero RNG、fractional token admission、authoritative ordering、
browser parity 或实际 filesystem collision：

- annotation absent、summary-only、note-only、summary + note、note
  clearing/removal，以及 malformed/over-limit/sparse/accessor-backed shape；
- `summarizeSave` absent/null/empty/valid/throw、exactly-once capture、normalized
  defensive copy/freeze、fixed State/metadata clock bytes，以及 projection failure
  在 physical write 前原子失败；
- autosave rotation 保留每个 candidate capture 时的 summary；annotation rewrite
  绑定 source Host revision 与 exact bytes，stale conflict 保持 newer record bytes；
- note rewrite 保持 Snapshot、`stateDigest`、`savedAt`、captured command sequence、
  provenance、lineage、summary 与 `versionStamp`，只改变允许的 record revision 与
  normalized annotation presence；
- `versionStamp` absent/all-null/partial/fixed full-clean/fixed full-dirty/
  status-unavailable/malformed/accessor/Proxy/throw 的 bounded normalization、一次
  collect、copy/freeze 与 failure fallback；后续 capture/rewrite/rotation/export
  collect delta 为 `0`；
- stamp 是 Snapshot capture origin，不参与 compatibility/adoption/authoritative
  identity；rewrite/rotation/stored export 原样保留，load/import compatibility
  忽略，post-load/import fresh capture 使用 current service stamp；
- PF1 unstamped oracle 保持不变；partial/full stamp 与 annotation 使用追加的独立
  expected bytes/SHA，standard receipt 与 opaque-repository fallback 等价；
- fixed metadata clock 的 UTC `yyyyMMddHHmmss` suggested filename 与 payload
  independence；同一秒名称可以相同。Browser只证明两次download request/event与各自
  bytes，测试自行选择不同临时路径；Desktop真实no-clobber/process-crash durability归PF-D；
- 每个 valid metadata variant 的 list/export/import/load round-trip，以及 physical
  readback、accepted lease fence 与 post-commit failure semantics。

M0a 同时落一个中性、可维护的 shared corpus/testkit seam。DET-B 只消费其 compact
pure summary/stamp/bytes vectors做跨 runtime equality，不复制 lifecycle golden；Browser只消费
相同payload验证两次request/event与bytes，Desktop只在PF-D gate消费相同payload/build receipt
验证真实no-clobber/package integration。
共同 seam/public export 必须在分叉前完成，避免 DET-B 与 M0b/M1 争改同一文件。

`summarizeSave` 是 Story-owned durable deterministic projection；玩家 note 是
persistence input；`versionStamp` 是 bounded presentation/runtime metadata。在尚无
downstream release 时于 `formatRevision: 1` 加入这些 shape 不构成 compatibility
blocker，但 M0a 从此成为唯一 bytes/preservation authority。

**M0a acceptance：** metadata normalization、callback/collector count、failure
atomicity、preservation 与 exact bytes 逐项固定；PF1 oracle 未重生成；无 browser/
filesystem/private-project dependency。

**2026-08-01 M0a promotion：** `@sillymaker/base/testkit` 现在提供 revision `1`
的中性 compact corpus：纯 summary/stamp/record vectors、独立 expected bytes
（immutable base64 + byte length + SHA）以及每次返回 fresh bytes 的固定-clock Host
payload。PF1 unstamped Quick Save 继续是 `1,447` bytes、
`sha256:c69e007af552917ce7207bbab2e3ff8c21a1ece6f34af0ff60a22375b4e0cd83`；
all-null stamp 与其 byte-for-byte 相同，原 `stateDigest`
`sha256:c87eeea0469bd353df29a97b84e773fbffa5b0a661888342e4620353839379a5`
对所有 compact record 保持不变。追加 vectors 为：

| variant                           | bytes | SHA-256                                                            |
| --------------------------------- | ----: | ------------------------------------------------------------------ |
| summary-only                      | 1,517 | `2079b3fa038abf6dc7adc2309a476294dc4461d7183c93fbcda78fd30656e839` |
| note-only                         | 1,504 | `8c0c6b1e3db6d3658aba554d376ae564d03a8f90d44078707fed0ec70bb4e142` |
| summary + note                    | 1,532 | `5967b7572841cea0d933e66c626b35984892370ecd0610e7086808d290e66659` |
| partial stamp                     | 1,559 | `537d5c785bfba490040b3e34ae33d70694edea4d0435b60e31b0485e897d89d3` |
| full clean stamp                  | 1,638 | `062458d80eb8b8e96326827db5e8cc8b8ac80fdcf7fe7e4d1c8765fbbfdadb04` |
| full dirty stamp                  | 1,650 | `c7d853587182247259fcf2b337c5102f18dd90e8876c82e539bdd723554c91e2` |
| status-unavailable stamp          | 1,606 | `884bb5fa9cdcba9d088a14240a54220730ce6dfd43722c1e65d3dc3ef77213d4` |
| summary + note + full dirty stamp | 1,735 | `eb62ceff1033406fe850515bbb0d04de0aa6662d873984de5820a780c2eefcd0` |

14 个 valid lifecycle variants 已逐个覆盖 physical readback、list、stored export、
load/import、lease fence 与 post-commit failure/retry；standard receipt 和 opaque
fallback 的 capture/rewrite/two-rotation raw records 相同。每次 fresh capture 的
`summarizeSave` 为 `0`（absent）或 `1`，stamp collector 为 `0`（absent）或 service
construction 时 `1`；rewrite、rotation、list、stored/current export 的 collector
delta 固定为 `0`。malformed、over-limit、sparse、accessor/Proxy 与 throwing sources
继续由 contract/failure matrix 证明 fail closed；summary throw 在任何 physical Save
write 前失败，stale rewrite 保留 newer raw bytes。该批只增加 testkit seam、测试与
promotion evidence，没有改变 `formatRevision`、canonical JSON、codec、公开 Save/
load/replay semantics、生产 load order，也没有创建 migration shell、callback 或
registry。跨计划下一切片回到 PF-DET `DET1`。

## 3. M0b — Post-DET-A current load baseline

M0b 必须等待完整 DET-A，因为 DET2d 会影响 initial Save path，DET2e 会影响
authoritative ordering/State bytes。它在改 load order 前冻结此时的合法行为：

- current valid Save；future/unsupported `formatRevision`；malformed
  `recordRevision`；stored Host revision 与 envelope `recordRevision` 不一致；
- corrupt JSON、限额、unknown fields、current Snapshot schema invalid、parsed
  Snapshot digest invalid/mismatch；
- reference/invariant failure；
- same-schema adoption allow/deny、simulation lineage boundary；
- auto recovery candidate、export/import 与 live Session install/write；
- M0a metadata variants 在所有上述路径继续保持同一 semantics/bytes。

不得把 DET-A 已拒绝的 zero RNG、经 binary64 舍入入场的 fractional token 或旧
locale-default ordering 重新冻结成兼容基线。fixture 只为已发布或明确承诺维护的
格式建立；临时对象继续由 test factory 生成。

M0b 明确记录当时实现的 failure precedence：Strict JSON → exact outer field set →
`formatRevision` validation/support decision → remaining current envelope/Snapshot schema →
envelope cross-field validation → parsed Snapshot digest → compatibility → references →
invariants。因而 unknown/missing outer field 与 future `formatRevision` 同时存在时先得到
`envelope.schema_invalid`；outer field set 完整的 future format 即使同时有 malformed
current-format `recordRevision`/provenance 等字段，也先得到
`envelope.unsupported_revision`。同一 record 同时具有 current Snapshot schema failure 与
digest mismatch 时先得到
`envelope.schema_invalid`；zero RNG + digest mismatch 则先得到
`rng.invalid_state`。这些是 M0b 当时的 baseline，不是 M1 的目标 load order。

M0b 当时的 stored-load path 在上述 decode/digest 后还先执行 physical Host revision equality 与
story/slot/write-reason identity，再进入第二次 import validation；对应内部 code 分别是
`persistence.record_revision_mismatch` 与 `persistence.slot_identity_mismatch`。import
没有这段 physical phase。`recordRevision` 是每槽 Host CAS/write revision，不是格式或
State migration revision：非法值由 schema 拒绝；无 physical Host revision 的 import
接受任意 positive-safe 值。

**M0b acceptance：** post-DET-A current result 与写入/install point 逐字段固定；
成功 load/import 在返回前原子安装完整 frozen Snapshot、digest、空 CommandLog、同一
Snapshot replay base 与 lineage，并建立新的 autosave anchor、把
`safelySavedCommandSequence` 置回 `null`。显式 Core load/import 只在成功后切换
presentation epoch/origin；每个并发排队请求的 origin 必须绑定自己的 replacement
commit，不能由后来的请求覆盖；这是 replay-base publish 后的可观察 postcondition，
不是 persistence commit 内的第二份 authoritative state。boot resume 保持 bootstrap
origin。quiescent load/import 的 physical Save commit delta 为 `0` 且不重写来源 bytes；
若已有旧 anchor autosave
正在 physical write，只允许既有 exact-anchor repair 语义，不把它误算成 load/import
来源 record rewrite。结构化 rejection 不调用 replacement commit，并保留 Snapshot
identity/digest、log/replay base、lineage、presentation epoch 与来源 record bytes；该
失败操作自身不发起/提交写，但先前已在途的 autosave 可以合法完成。操作仍可短暂发布
`busy`，diagnostic/failure status 可更新，unexpected internal replacement fault 还可把 Session 置为
`fault_paused`，不得把“无 authoritative mutation”扩写成“所有 status bit 不变”。
shared M0a corpus 无漂移；本切片不创建 migration callback、registry 或 browser
config。这里的 write atomicity 只冻结 conforming `HostAtomicRecordStoreV1` 的
batch/fence/CAS/readback 合同，不提前宣称 Desktop crash-atomic durability。

**2026-08-02 M0b promotion：** 新增中性、动态生成的 current-load matrix，冻结
post-DET-A codec/validation、stored repository 与 Player 三层结果；没有增加第二份
maintained byte oracle。它逐项固定 Strict JSON/limit、outer-field/format/current-schema/
cross-field/digest precedence、Host `recordRevision` mismatch 与 import 分叉、reference/
invariant callback 次数、exact/adoption/inspect-only/lineage-limit、recovery candidate、
显式 previous load、M0a metadata import 与 exact-byte export。成功 load/import 的
Snapshot、digest、空 CommandLog、replay base、lineage 与 autosave anchor 一次性安装，
physical Save commit delta 为 `0`；所有代表 rejection 在已有非空 CommandLog 时逐项保持
Snapshot、replay-base、digest、CommandLog 与 lineage identity，来源 bytes 不变且 commit
delta 为 `0`。

Core 并发 red 证明旧的单一 pending-origin 标记会把排队的 load/import 发布成
`["import", "replacement"]`；现以 exact queued replacement commit 绑定后固定为
`["load", "import"]`，前一个 rejection 也不会污染后续成功 origin。该修复只增加
PersistenceService direct-module 的 package-internal WeakMap control seam，不扩张 package
barrel 或 `PersistenceServiceV1`/`PersistencePortV1`，也不增加另一份 lifecycle authority。
Core 继续持有原 `runtimeControl` identity；restart 后 save 的
`snapshotDigestTraversals === 2`（encode + committed readback），证明 installed Snapshot
capture 仍命中 PF1 digest cache。focused `3 files / 158 tests`、Base `77/970`、full unit
`226/2833` 全绿。该批没有修改 canonical JSON/digest、Save bytes、公开 Player
load/import/replay semantics，也没有建立 shell、migration callback/registry 或 browser
config；该 promotion 当时的下一独立切片为 M1。

### M0c — Explicit invalid player-slot replacement corrective

实验应用暴露出标准 Save UI 与 repository 的可达合同错位：UI 对 `invalid` 的 Quick/manual
槽仍允许显式 Save，但 repository 在 fresh candidate 写入前解码旧 payload 并固定返回
`invalid_record`。M0c 只移除这项旧-payload gate：fresh player Save 继续从 Host revision
派生下一 `recordRevision`，与 lease touch 在同一 CAS batch 提交，并在成功后执行完整 physical
readback、Strict decode、digest/revision/fence/raw-byte verification。旧 payload 不参与 candidate，
因此 allowance 明确覆盖 malformed、unsupported/future format、schema/digest 与
slot/revision identity invalid；Host read unavailable、revision exhaustion、candidate encoding、
stale fence、CAS loser 与 readback failure 仍 fail closed。

验收必须以中性 generated data 固定 Quick + manual、malformed + structurally valid invalid、
并发 CAS winner、失败 candidate 原 bytes 保留，以及 standard one-shot receipt 与 opaque
fallback 的结果、Host revision、raw bytes 和确定性 work counts 等价。corrupt load、stored
export、annotation rewrite、clear、autosave rotation、M0b authoritative no-mutation 与来源 bytes
合同不变。本 corrective 不增加 backup/quarantine/migration/adoption，不改 Save schema、
`formatRevision`、canonical/digest、公开 result union、CommandLog 或 replay；它是独立 fresh
write behavior，M1 仍保持 callback-free load-order scope。

**2026-08-03 M0c promotion：** TDD red 在 repository malformed/future、invalid-slot
concurrency、candidate encode failure 与 standard receipt/fallback service flow 得到 `4` 个
预期失败；删除旧 payload decode gate 后 focused 为 `2 files / 82 tests`。optimized replacement
计数固定为 `T/D/S/P/F = 3/2/1/1/0`，opaque receipt fallback 为 `5/3/2/1/0`；两路
result、Host revision `3` 与 raw bytes 相等。M0b/PF1 focused regression 为 `2/15`，Base
为 `78/978`；Save Overlay 的 invalid Quick/manual enabled + dispatch baseline 为 `1/16`，
full unit 为 `227/3196`，`deno task check` 全绿并完成 Engine Lab production build。旧实验
仓库没有成为 source、fixture、dependency 或 validation authority；该 corrective
promotion 当时的 linear-core 下一切片仍为 DET3a-C4，并在 C4 关闭 PF-DET 后恢复 M1；
后续 M1 promotion 已关闭 same-merged-HEAD join。

## 4. M1 — Bounded envelope shell and load order

实现 design 的目标顺序：

1. Strict JSON 限额下 parse envelope shell；
2. 只解析 format/record revision、provenance、slot、savedAt、stateDigest、lineage、
   bounded annotation 与 bounded `versionStamp` 等外壳；
3. `snapshot` 保持 bounded raw JSON；
4. 按 stored format 验证 raw snapshot digest；未来任何 envelope-format migration 或 M2
   State migration 都不得先于此步骤；
5. shell/digest 合法但 State revision 不同且尚无 executable chain 时返回明确
   unavailable；
6. current format + current State revision 才进入 current Snapshot schema parse，并对
   normalized current candidate 再验同一 `stateDigest`，禁止 schema default/normalization
   后安装与 stored digest 身份不同的 Snapshot；
7. current candidate digest 通过后再执行 compatibility/adoption、reference、invariant
   与 install。

M1 **严格 callback-free**：不创建 executable registry，不接受 migrator injection，
不执行 Story/engine migration callback，也没有“顺手注册一个 format migrator”的
逃生口。它只建立后续 migration phase 边界；M2 只接入 State migration，format node
继续 deferred。

本切片冻结两层公开可观察合同：

- validation/inspection：`kind: "inspect_only"`、`code:
  "migration.unavailable"`，携带 stored/current state-contract revision；
- Player-facing `PersistenceOperationResultV1`：`{ kind: "rejected", code:
  "migration_unavailable" }`。

`decodeSaveRecordV1`、`validateSaveImportCandidateV1` 及其 rejection code unions 是
lower-level public contract，不是 package-internal seam。M1 会为 normalized-current
identity failure 扩展这些公开 union；Player Save/load/replay bytes 与 mapping 不因此改变。

错误 precedence：Strict JSON 后先验证 exact outer field set，再立即验证/classify
`formatRevision`。missing/unknown outer field 先返回 `envelope.schema_invalid`；outer
field set 完整且 `formatRevision` 是合法但不受支持的 positive-safe revision 时先返回
`envelope.unsupported_revision`，不按 current format 解析其余 shell 字段；只有 current
format 才继续 remaining shell validation。raw digest mismatch 返回
`digest.state_mismatch`；current revision 但 current schema invalid 继续
`envelope.schema_invalid`；current schema 通过但 normalization 改变 canonical identity
时返回独立、公开的 codec/validation-layer `digest.normalized_state_mismatch`，
Player-facing 仍映射
`invalid_record`。它发生在 compatibility 与任何 Story reference/invariant callback 前，
失败时这些 callback count 精确为 `0`。只有 shell/digest 合法、State revision 不同且没有
完整前向链时才是 `migration.unavailable`。compound input 按同一 phase 顺序裁决：通过
shell 后，raw digest mismatch 先于 current Snapshot admission/cross-field validation；
remaining shell field validation 又先于 Snapshot admission。M1 因此有意允许所有由该 phase
移动导致的 compound precedence delta，而不只一个 schema case。至少固定以下不同
codec/validation-layer public transition：Snapshot schema invalid + digest mismatch：
`envelope.schema_invalid` → `digest.state_mismatch`；zero RNG + digest mismatch：
`rng.invalid_state` → `digest.state_mismatch`；zero RNG + invalid trailing shell field：
`rng.invalid_state` → `envelope.schema_invalid`；cross-field invalid + digest mismatch：
`envelope.schema_invalid` → `digest.state_mismatch`。所有 unavailable/rejection path 都不写 record、不安装
Session、不替换 replay/autosave anchor，也不改变 lineage 或来源 bytes；允许既有
busy/diagnostic 状态更新，不得将 status observation 误判为 authoritative mutation。
这些 current-format compound case 的 Player-facing mapping 前后都保持
`{ kind: "rejected", code: "invalid_record" }`；变化的是 lower-level public diagnostic
precedence，不是把 decoder code 扩张到 player port。
State revision decision 明确先于 compatibility：同一输入同时具有 Story identity
mismatch 与不同 State revision 时返回 `migration.unavailable`；只有 State revision
相同时，Story mismatch 才进入既有 `inspect_only`/player `incompatible` 路径。M1 不为
改变这项 precedence 提前调用接收 current typed Snapshot 的 Story compatibility
callback。

M1 的 normalized-current equality 只适用于未执行 migration 的 current State revision。
M2 起若 migration 产生新 candidate，engine 对 normalized migration output 派生新的 digest
作为新 replay/Save anchor identity；不得拿它与 pre-migration stored `stateDigest` 比较。

**M1 acceptance：** Strict JSON 限额不放宽；tampered raw snapshot 在任何未来
migration 前被拒绝；current format 的合法、单缺陷及未受 load-order 调整影响的
compound 回归逐字段等于 M0b；上述由 phase 移动影响的 compound matrix 是预先接受的
intentional precedence delta，M0b current result 与 M1 target 都有 focused tests，
不得用“单一例外”掩盖其他可观察组合。raw 与 normalized-current 双 digest verification、
`digest.normalized_state_mismatch` 的 lower-level/Player mapping、失败前 Story callback count
`0`、Story-mismatch + State-revision-mismatch precedence 都有 focused tests。migration
callback count 精确为 `0`，没有 executable registry/export；
validation/Player unavailable mapping、failure precedence 与 no-install/no-write
atomicity 有 focused tests。

**2026-08-03 M1 promotion：** current-format codec/load 已按唯一 staged authority
拆为 Strict JSON + exact shell、raw Snapshot digest、State revision fence、current
Snapshot/cross-field admission、normalized-current digest，再进入 compatibility、reference、
invariant 与 atomic replay-anchor install。stored load/list/export/annotation 共享 staged
preparation 与 Host revision/slot identity admission；load/list/export 随后完成 Story
validation，annotation 则不调用 compatibility/reference/invariant callback。revision 不同的
current-shape-valid 与 old-shape Snapshot 都在 current schema 前返回 engine-owned
`migration.unavailable`，annotation 不再可能把它重写成 current record。import/load 的
source bytes、Snapshot/RNG、CommandLog、replay base/digest、lineage、autosave anchor、Host
record/revision 与 replacement-commit callback 均保持不变；stored export 返回 exact source
bytes。

公开低层合同同步增加 `SaveRecordEnvelopeSchemaV1`、factory-produced exact schema
identity、`SaveImportValidationContextV1.currentStateContractRevision`、
`SaveMigrationUnavailableInspectionV1`、`digest.normalized_state_mismatch` 与 Player
`migration_unavailable`；built-in Save UI/所有 maintained Story composition 均提供该结果
文案。schema stage metadata 由 package-owned `WeakMap` 绑定 factory 返回对象 identity；
spread/decorated schema 的 encode/decode fail closed，不能形成两套 schema authority。
`SaveCompatibilityClassificationV1` 不包含 unavailable 分支，Story callback 不能伪造它。

确定性 work baseline 有意反映双 digest：successful public decode 的 digest traversal
从 `1` 变为 raw + normalized `2`，correctly-digested zero RNG 从 `0` 变为 raw `1`；
PF1 every-commit workload 的 canonical traversal/digest 从 first auto `6/3` 到 `7/4`、
rotation `9/5` 到 `11/7`、aggregate `15/8` 到 `18/11`。standard player Save optimized
从 `3/2` 到 `4/3`、opaque receipt fallback 从 `5/3` 到 `6/4`；annotation optimized
从 `4/3` 到 `6/5`、fallback 从 `6/4` 到 `8/6`。所有路径继续使用同一 package-internal
instrumentation；没有把 staged work 从 PF1 计数中隐藏。

accepted B-prime spelling、current Save decode/encode bytes、M0a metadata corpus、PF1
unstamped oracle、canonical JSON/digest 算法与 Strict JSON 限额均未改变。focused 为
`8 files / 259 tests`，affected Base + Save UI 为 `79/999`，full unit 为
`227/3329`；Deno `2.9.4` determinism `1/3`、Chromium/Firefox/WebKit repeat matrix `6/6` 与
`deno task check` 全绿。仓库没有 executable registry、migrator injection/callback/export、
历史 Save install 或 M2 placeholder；M1/DET-B same-HEAD join 据此关闭，当时的下一独立切片为
M2a。

## 5. M2 — State migration registry and new replay anchor

M2 的 DET-B/M1 same-merged-HEAD 前置 gate 已由上述 promotion 关闭；两边各自绿本来
不算完成，关闭证据同时覆盖 focused M0a/M0b/M1、shared Save bytes、
`deno task test`、`deno task check` 与 dedicated Deno/Chromium/Firefox/WebKit matrix，
并证明 executable migrator 不存在、callback count 为 `0`。M2 从该 joined baseline
首次引入执行能力，但只实现 `formatRevision: 1` 的 aggregate State migration；不实现
envelope format migration。M2 的完整边界是 single application、single explicit
namespace、synchronous adjacent chain、non-durable replacement-origin receipt、source Save
no-writeback；M3 dry-run/backup/UX、durable history 与 Mod namespaces 均不在本阶段。

### M2a — Public authoring contracts and exact registry factory（已实现）

**目标：** 新增 State contract identity、namespace/migration/reason IDs、step result、
reference rename/delete declaration与 factory-produced exact registry合同。factory 规范化、
复制、冻结 declaration，用 private brand/`WeakMap` 保留 callback identity；只接受零步
current registry或完整的相邻链，maximum chain length 为 `16`。Core definition增加可选 exact
registry，definition-time admission拒绝伪造 identity，application resolution验证 registry
current identity等于 resolved State contract；两处都不执行 callback。factory/normalization与
pure Core identity admission在同一切片进入 bounded Base authority。

**非目标：** 不把 registry 接入 Persistence/load execution，不执行 callback，不改变
`SaveImportValidationResultV1`/Player result，不安装 receipt/replay/autosave anchor，不注册
Engine Lab production owner，也不改变 Save bytes、format、canonical/digest 或 M1 load order。
任何 maintained/root-registry application在 M2e 前都不得配置真实 registry；后续 wiring不得
把 M2a 的 declaration/resolution API描述成 live migration capability。

**Red/acceptance：** valid empty/one-step/two-step declarations成功且 callback count 为 `0`；
输入后续 mutation 不影响 normalized registry；所有 retained metadata frozen。fake/spread/
decorated registry fail closed。duplicate migration ID/from identity、non-adjacent、reverse、gap、
ambiguous/disconnected path、identity digest discontinuity、target mismatch、invalid rename/delete
resolution 与 `>16` steps均在 factory/package-internal admission失败。reference delete 必须有
fallback target 或 stable rejection reason；declaration不是自动 State string rewrite。
Core current target mismatch在 application resolution结构化失败。focused/type/public-export tests
先 red 后 green，M1 callback-free regression不变。

**2026-08-03 M2a promotion：** Base 现在公开 State identity、stable
namespace/migration/reason IDs、reference declaration、同步 readonly callback与 opaque exact
registry factory；package-owned `WeakMap` 保存 detached/frozen normalized declaration与 callback
identity。factory 固定 single namespace、完整相邻 identity chain、16-step bound和 reference tuple
normalization；Core definition只捕获 official registry，resolution只验证 current State identity。
Persistence/load/import 未读取 registry，所有 maintained application 均未配置 registry，callback
count保持 `0`，因此这不是 live migration capability。TDD red覆盖缺模块/公共导出/authority policy，
并在审查中捕获 callback method bivariance、Core getter identity TOCTOU与巨大 sparse-array
preallocation；修复后 focused M2a + M1 regression为 `5 files / 161 tests`，affected Base为
`79/999`，full unit为 `228/3346`，typecheck、determinism guard与 `deno task check`全绿。Save
bytes、canonical/digest、M1 load order/result、Persistence/Session/CommandLog/replay与 Debug Bundle
均未改变。下一独立切片为 M2b pure execution kernel。

### M2b — Pure one-step/two-step execution kernel（已实现）

**目标：** 在 bounded Base authority 内解析 complete chain，并在 detached
Strict Canonical Data 上同步执行每一步。每步返回 migrated/rejected union；historical State 与每个
migrated output各执行一次 canonical/limit admission 和 detached projection，再交给
下一步；本切片新增 immutable failure attempt、opaque successful completion与 pure receipt
finalizer。executor不计算 receipt 的 `migratedStateDigest`；M2c完成 whole-Snapshot
reconstruction/schema/digest后把 final normalized Snapshot digest交给 finalizer。

为保持 chain-before-shell precedence，package-internal protocol拆为 chain resolve与 callback
execution两步；M2c必须在二者之间完成 historical engine-owned Snapshot shell admission。

**非目标：** 不接 load/import、Session、Persistence、Host、Core production owner或
browser matrix；不处理 format migration、RNG、command sequence、integrity、annotation、
lineage 或 arbitrary context。

**Red/acceptance：** one/two-step、rename、delete fallback/reject、repeat equality、exact callback
counts、input/output alias detachment、missing/illegal result fields、invalid reason、cycle、
fractional/non-finite/unsafe number与over-limit output。missing/incomplete chain
callback count 为 `0`；explicit reject=`migration.rejected`，illegal output=
`migration.output_invalid`，throw=`migration.callback_threw`且不暴露 message/stack。所有 M2b
failure attempt的 `migratedStateDigest`为 `null`；receipt finalizer只接受 exact successful
completion与调用者提供的 whole-Snapshot digest，不能接受 failure/fake/spread token。

**2026-08-03 M2b promotion；2026-08-24 Complexity Reset：** Base 在 bounded authority 内保留
exact non-empty suffix resolution、同步 one/two-step execution、immutable failure attempt、opaque
completion与 whole-Snapshot receipt finalizer。2026-08-24 reset 删除了原 promotion 中递归
deep-freeze、descriptor/prototype result-envelope authentication 与一次性对抗 harness；当前实现用
维护中的 canonical+limits encoder 和 Strict JSON parser 产生 detached State，callback result只做
普通 discriminant/field/value检查，额外字段不获得 authority。Promise若没有同步合法 union仍
fail closed，kernel不 await或调用 `.then`。真实 chain/completion ownership、每步 canonical/limits、
failure phase、whole-Snapshot digest与原子 replacement合同不变。Persistence/load/import、
maintained migration owner、Save bytes、canonical/digest、Session/CommandLog/replay与 Debug Bundle
均未改变。

### M2c — Staged load/import integration and failure mapping（已实现）

**目标：** 把 exact registry 接入 Core/Persistence staged admission。Core/application resolution
验证 registry current identity 等于 resolved State contract；load/import在 raw digest与
State branch后执行 M2b，只替换 candidate `snapshot.state`，保留其他 Snapshot/envelope字段；
只更新 candidate provenance 的 State revision/digest，再执行 current schema/RNG、migrated
digest、compatibility/adoption、references 与 invariants。低层 success增加正交
`migration: receipt | null`；Player success shape不变，新增 failure mapping
`migration_rejected`。

**失败 precedence：** Strict/outer/format/shell/raw digest先于 branch；stored Host/slot
identity先于 chain；chain/source mismatch=`migration.unavailable`且 callback `0`；historical
Snapshot shell=`envelope.schema_invalid`；callback reject/throw/output invalid先于所有后续
validation；current schema/RNG/reference/invariant与compatibility/adoption沿用既有 code。
partial attempt只出现在失败/diagnostic，不安装 receipt。

上述 engine-owned migration failure作为 `SaveImportValidationResultV1` 的正交 branches加入；
不得扩张 Story compatibility callback可返回的 `ImportRejectionCodeV1`，避免 Story伪造
migration phase/code。

**Red/acceptance：** current exact/adopted携带 `migration: null`且 M1结果/bytes保持；一步/
两步 migration exact、migration+adoption allow；Story/engine mismatch、adoption deny/lineage
limit、current schema/RNG/reference/invariant failure。每个失败逐项保持 source bytes、Host/
record revision、live Snapshot/RNG/CommandLog/replay digest、lineage、receipt、autosave与Host
write count；load/import不写回 source Save，fresh Save自然使用 current provenance/digest。

**2026-08-03 M2c promotion；2026-08-24 runtime-semantics correction：** Core把 exact registry identity原样传入 Persistence；import与
stored load在 raw digest/State branch（以及 stored physical identity）之后解析完整 chain，
admit exact historical Snapshot shell并同步迁移 State。schema前 shell与 schema输出 full record
都经 bounded detached Strict Canonical projection；current schema输出在 whole-Snapshot digest前
重新 admission，因此不能通过 retained raw alias改写非 State字段或绕过 limits。schema与
cross-field callbacks按 `DeepReadonly` 合同消费普通 JavaScript data；runtime不以递归冻结防御
绕过类型约束的对象 mutation。candidate
只更新 State及其 provenance identity/whole-Snapshot digest；RNG、command sequence、integrity、
annotation、versionStamp、slot、savedAt、record revision与lineage保持。current revision callback
为 `0`；list/stored export/annotation保持 callback-free。缺 chain产生合同规定的 unavailable，
callback reject/invalid/throw保留 execution attempt，所有结构化返回的 post-chain validation
failure均附 phase attempt；这些路径都不修改 source、Host或 authoritative authorities。既有
Story callback bug/throw仍沿用 unexpected fault语义。低层 success携带
`migration: receipt | null`，Player success shape不变；
Session receipt lifecycle和 composite prepare/no-throw commit保留给 M2d，maintained owner保留给
M2e。focused为 `6 files / 271 tests`，affected Base + UI为 `142/1661`，full unit为
`229/3405`；latest-stable Deno `2.9.4`上的 typecheck、determinism guard与
`deno task check`全绿。browser matrix按合同保留给 M2e。

### M2d — Atomic Session/Persistence/CommandLog/autosave anchor commit

**目标：** 建立 package-internal prepare/commit token。任何可能失败的 validation、freeze、
digest、allocation、safe-integer admission、autosave/repair/bookkeeping与lease plan都在 mutation
前完成；commit只安装预计算值，不做 validation/digest/increment/allocation/callback/Host I/O/
Promise/observer publication。全部 owner commit后才发布 Session并排 post-commit autosave。

**Receipt lifecycle：** successful migrated replacement安装 receipt；ordinary command、Save
capture与CommandLog eviction保留。fresh/restart/current-revision load/import、debug replacement、
fresh paired Session/Persistence composition（包括 Core rebootstrap successor）或无 receipt
replay-base replacement清零；同一 Session 上新建 service 不清 Session-owned receipt；failed
operation保留旧 receipt exact identity/value。Debug Bundle wire在 M2不变。

**Composition boundary：** composite guarantee覆盖 package-owned GameSession/Core/Persistence，
以及保留 exact outcome或 exact package prepare callback的透明 wrapper。若 public low-level
custom runtime control同时重建两者，它只保留 current-revision、`migration: null` legacy callback
path，不获得 M2 composite guarantee；extension/custom caller显式传入 legacy
`prepareReplacementCommit`也属于同一 escape hatch。migrated replacement必须在 authoritative
Snapshot/replay/Persistence mutation前 fail closed，允许进入 `fault_paused`，不得把它归为
package prepare failure/`ready`。

**Post-commit order：** authoritative owners全部安装后，Session只在 listener publication窗口
暴露预分配的 Session-bound opaque context供 Core归因；随后撤销 context、调用 throw-isolated
observational `onReplacementCommit`，最后安排 autosave repair/write。context不是 callback、第二
authority或 durable state。

**Red/acceptance：** autosave epoch exhaustion、prepare allocation/fault与每个 M2c failure均
证明零 partial mutation；validated commit token的 commit path不抛错。成功后 replay base===
current Snapshot、digest===receipt migrated digest、CommandLog空、immediate replay执行 `0`
entries、next ordinal `1` 且 next `preStateDigest` 等于 migrated anchor。callback/invalid output/
prepare fault在 composite boundary内保持 Session `ready`；只有 unexpected commit-protocol
invariant failure与上述 opaque low-level escape exception允许 `fault_paused`。若只能扩张公开
universal transaction API，停止。

**2026-08-03 M2d promotion：** repository-owned Session/Core/Persistence现以 exact outcome或
exact prepare-callback identity领取一次性 package-internal participant；prepare完成 final
Snapshot freeze/digest、CommandLog anchor、lineage/autosave/fence/bookkeeping与全部 allocation，
validated commit只安装预计算 authority。全部 owner安装后，Session-bound opaque context只在
listener publication窗口提供 Core origin，随后才执行 observational callback并安排 autosave
post-commit。migrated replacement安装 Session-owned non-durable receipt；command/Save/log eviction
保留，current/restart/debug/rollback与 fresh paired successor清除，失败保留 exact prior receipt。
cross-owner/reused token、epoch exhaustion、reentrant fence/HMR、migration+adoption、immediate replay
与 next ordinal均有 mutation-sensitive evidence。opaque custom control与显式 legacy prepare
callback保留 current-revision escape hatch，migrated candidate fail closed且不伪造 composite
success。公开 Save/replay/debug wire、digest/canonical算法与 barrel API均未扩张。focused为
`5 files / 282 tests`、affected Base + UI为 `142/1691`、full unit为 `229/3435`；latest-stable
Deno `2.9.4`上的 typecheck、determinism guard、Story checks、Engine Lab build与
`deno task check`全绿。四 runtime migration matrix仍按合同保留给 M2e，下一独立切片为 M2e。

### M2e — Real authority, tripwire and four-runtime promotion（已实现）

**目标：** Engine Lab 配置一个真实 app-local registry/owner。Core registry与
`ApplicationAuthorityPolicyV1.saveStateMigrationOwner` module/export必须 exact identical；
collector live枚举全部 callbacks/import closure并分类 `save_state_migration`。M2e 复验 M2a–M2d
逐片加入的 bounded Base authority；isolated Worker真实执行 one/two-step/reject/throw/invalid-output；
现有 determinism matrix增加单一 `saveStateMigration` vector。

**Red/acceptance：** registry无 owner、stale owner、owner export不等于 Core registry或closure
不完整均在 source lint前 fail closed；不能只靠 synthetic additional-authority或硬编码 file
list。Deno、Chromium、Firefox、WebKit真实执行并比较 normalized output、attempt/receipt、
diagnostic phase/code、source/migrated digest、callback counts、adoption组合与repeat equality；
缺 browser不得 skip。现有 synthetic seam可保留，但不算 M2 evidence。

**M2 aggregate acceptance：** 所有失败原子；同输入重复迁移得到同 output/receipt/digest；
新 anchor replay自洽；Save/canonical/digest algorithm、metadata corpus、format revision与 source
bytes不变；real registry/source进入 static/tripwire guard，四 runtime matrix全绿。

**2026-08-04 M2e / M2 aggregate promotion：** Engine Lab 现配置唯一 real app-local
registry/owner；Core 与 authority policy 指向同一个 factory-produced object，live map 记录 `1`
个 `save_state_migration` owner、`2` 个 callback，并在 source lint 前验证 owner closure 的
managed BuildIdentity 完整性。maintained conformance chain 为 revision 3 → 4 增加空 Narrative
history，revision 4 → current 5 把 Stage contract `2 → 3`、为每个 placement 增加
`opacityPermille: 1000`，并增加 `rapport: 0` 与 `wallet.credits: 0`。State contract identity
依次为：

- revision 3：`sha256:15b2ba494428229ab0354ed2e3668b56046a6c3f340569872d07f78db7193f64`；
- revision 4：`sha256:42d426e6fb95566cf38787ee1de8c32f853b1e3eb4a16003c05fbfb109408667`；
- current revision 5：`sha256:c6407d9e0b5bd4d93fbe6e54d61fc62f59d209892d71a663a70190a4970735e3`。

单独的 migration Worker 通过真实 staged validation 执行 one-step、two-step、explicit reject、
callback throw、invalid output 与 migration + adoption；callback count 固定为
`1/2/1/1/1/2`。三个失败分别固定为
`migration.rejected/callback_rejected`、`migration.callback_threw/callback` 与
`migration.output_invalid/result_envelope`，migration 与 adoption 保持正交。revision 3/4
source whole-Snapshot digest 分别为
`sha256:f01859baf1688d2ea613ec3e72de6e817f8202cbf4dcbabef73ef26f13ecc1a2` 与
`sha256:b3ed32df507c0cb29f22da0260a0bd67a4bdcc8ba38a8df4bb061f27304c6258`；两条成功
路径得到同一 current whole-Snapshot digest
`sha256:b26574952975aaa002cb03990f439d6594e46f1435fd7a025c7ef86ba1576d58`。
该 Worker 与 DET3b ambient-tripwire Worker 分离，后者的窄 closure 未扩张；aggregate matrix
在 Deno 与 Chromium/Firefox/WebKit 各执行两次并逐字段比较 output、attempt/receipt、digest、
callback count、adoption 与 source-byte preservation。

M2 aggregate 的 Session/Persistence/CommandLog/autosave 原子安装与 replay-anchor 证据来自
M2c/M2d 回归，不由 Worker vector 冒充。focused 为 `6 files / 23 tests`，affected Base +
Engine Lab 为 `105/1213`，full unit 为 `232/3443`；latest-stable Deno `2.9.4` 的 Deno matrix
`1/3`、Chromium/Firefox/WebKit repeat matrix `6/6`、determinism guard、typecheck 与
`deno task check` 全绿。Save/canonical/digest algorithm、metadata corpus、format revision、
source bytes、公开 replay/Debug Bundle wire 均未改变。

Engine Lab 历史中 pre-opacity、同为 revision 5 但 digest 不同的 State 不在 maintained/released
corpus；M2 不增加 same-revision edge，也不以 adoption 伪装 State 转换。若 M3 的真实 fixture
要求支持它，必须停止并设计 recovery/migration。M2 机制 gate 据此关闭；下一 Save slice 是
PF5/M3 的表述是当时历史 pointer；M3.0 exact entry、M3.1 inspection、M3.2 adoption set、
M3.3 backup substrate、M3.4 semantic operations 与 M3.5 player recovery UI 现均已完成；
M3.6.0 docs-only inventory corrective、M3.6a maintained corpus/Story lifecycle、M3.6b
four-runtime corpus parity、M3.6c Browser repeated-download evidence 与 M3.6d live docs/PF5
promotion 均已关闭并转为 historical；PF5/M3 已完成。

## 6. M3 — Product surface and release corpus

M3 broad checkpoint 已由 M3.0 重切；M3.0–M3.6d 均已完成并转为 historical，PF5 已关闭。
其执行严格按 `M3.6c -> M3.6d` 线性推进，没有把 corpus lifecycle、four-runtime parity、
Browser no-clobber 与 live docs/promotion 合成一个 refactor。后续 current 顺序只由
production-floor sequence 拥有。

### M3.0 — Exact entry contract（docs-only，已完成）

本切片只修改：

- `docs/engine/design/save-migration.md`；
- `docs/engine/plans/2026-07-30-save-migration.md`；
- `docs/engine/plans/2026-07-30-production-floor-sequence.md`。

它冻结 design 第 4 节的 single-slot taxonomy、pure staged/零 mutation inspection、
adoption set、同 namespace 单层 backup、restore owner、lineage 16/re-anchor、真实 fixture
floor 与下列 implementation allowlist；不交付 source/test/runtime/public/live capability。
M3.0 完成后的 direct RED gate 是 M3.1；该 historical pointer 已由下述 M3.1 delivery 关闭。

### M3.1 — Single-slot read-only inspection（已完成；historical）

**Outcome：** `PlayerPersistencePortV1` 只增加 `inspectSave(slotId)`，执行纯 staged
admission，返回 design 4.1 的 exact union：
`direct | migration_required | adoption_required | migration_and_adoption_required |
inspect_only | rejected | faulted`。本 slice 不增加 `inspectSaves()`，不改现有单个
`adoptionDeclaration`，也不交付 backup/action/UI。`listSlots()` 继续保持 State migrator
execution count `0`，但不跳过 M1/M2 已有 stored admission与适用的Story/reference/invariant
validation；显式 inspection 可执行 synchronous pure migration callback，但 Host commit、lease
touch、Session/replay/Persistence mutation 必须全部为 `0`。

`inspect_only.code` 只允许 `migration_unavailable | incompatible | reanchor_required`；
`rejected.code` 只允许 `empty_slot | unavailable | invalid_record | migration_rejected`。
`faulted.slotId` 为 `SaveSlotIdV1 | null`：合法 slot 的 unclassified Host/repository throw、
callback throw 或 runtime fault 保留该 slot，未通过 public slot shape/count admission 的
programmer input 返回 `null`。recognized Host unavailable 是 `rejected/unavailable`，不得因
adapter 不同漂移成 `faulted`。

**Exact source/test allowlist（除此之外先停并修订 M3.0，不顺手改 UI/Host/Story）：**

- `engine/packages/base/src/contracts/application.ts`；
- `engine/packages/base/src/contracts/persistence.ts`；
- `engine/packages/base/src/contracts/index.ts`；
- `engine/packages/base/src/index.ts`；
- `engine/packages/base/src/runtime/persistence/persistence-service.ts`；
- `engine/packages/base/src/runtime/persistence/current-load-baseline.test.ts`；
- `engine/packages/base/type-tests/application.test-d.ts`；
- `engine/packages/base/type-tests/persistence-diagnostics.test-d.ts`。

**Direct RED：** public type exact union/defensive freeze；
empty、exact、adoption-only、one/two-step migration、migration+adoption、unavailable、identity
mismatch、invalid/rejected、callback throw、recognized Host unavailable、unclassified Host throw
与 invalid slot null identity；`listSlots()` State migration callback count `0` 且既有
Story/reference/invariant validation回归不变，
explicit inspection exact callback count；每一分支 record commit/delete、lease、Session queue/
replacement、anchor/receipt、status、clock/export delta 均为 `0`；同一 service 连续 10,000 次
inspection 不保留 candidate/attempt history。不得只断言 TypeScript shape 或 mock result。

**Gates：** `current-load-baseline.test.ts` focused inspection tests、两个 allowlisted type-test
files、Base package tests、`deno task test:determinism` 与 `deno task check`。若 RED 证明需要
修改 allowlist 外的 compatibility/Core/Story 文件、Save
wire/canonical/digest、Host namespace/store、Session public API、Debug Bundle 或 UI，立即停止。

**2026-08-12 M3.1 single-slot read-only inspection delivery（已完成；historical）：**
实现严格保持上述八路径 source/test allowlist，交付 public single-slot `inspectSave` exact
result、defensive freeze、recognized/unclassified Host fault projection、按需同步 State migration
与全分支零 Host write/lease/Session/replay/Persistence mutation；未增加 `inspectSaves()`、adoption
set、backup 或 UI。实现前的真实 mutation RED 产生 `7` 个失败，随后同一 mutation-sensitive
suite 转为 GREEN。

最终 promotion matrix 全绿：focused `17 / 17`、current-load baseline `38 / 38`、Base
`81 files / 1156 tests`、两个 type-test files、determinism Deno `3 / 3` 与
Chromium/Firefox/WebKit `6 / 6`；scoped oxlint、fmt、diff、typecheck 均通过。Canonical
`deno task check` 覆盖 format `955 files`、full lint/style/typecheck/determinism、
`266 files / 4533 tests`、assets、five registered Story checks 与 Engine Lab production build
`415 modules`，全部 green。M3.1 据此转为 completed/historical；该 delivery 当时把唯一
current/next、core slice与 direct RED/implementation gate 推进到 M3.2，该 historical pointer
现已由下述 M3.2 delivery 关闭。

### M3.2 — Adoption declaration set（已完成；historical）

**Outcome：** 把 application/service/classifier 的单个 `adoptionDeclaration` 替换为 immutable
`adoptionDeclarations` set，长度上限固定为 256；第 257 项在任何 Host I/O/classifier/runtime
allocation 前 fail closed。既有七字段 tuple exact match 为唯一 admission；零 match
`inspect_only`，一 match adoption，多 match `compatibility.adoption_ambiguous` rejected；
configuration duplicate 在 Host I/O 前 fail closed，array order 不影响结果。M3.1 的四个
positive inspection kinds 不变；本 slice 不写 backup/Save、不改 Session。

**Exact source/test allowlist：**

- `engine/packages/base/src/contracts/persistence.ts`；
- `engine/packages/base/src/runtime/application/core-game-application.ts`；
- `engine/packages/base/src/runtime/application/core-game-application.test.ts`；
- `engine/packages/base/src/runtime/persistence/compatibility.ts`；
- `engine/packages/base/src/runtime/persistence/compatibility.test.ts`；
- `engine/packages/base/src/runtime/persistence/persistence-service.ts`；
- `engine/packages/base/src/runtime/persistence/persistence-service.test.ts`；
- `engine/packages/base/src/runtime/persistence/current-load-baseline.test.ts`；
- `engine/packages/base/src/testkit/snapshot-persistence-workload.ts`；
- `engine/packages/base/src/testkit/snapshot-persistence-workload.test.ts`；
- `engine/packages/base/type-tests/application.test-d.ts`；
- `engine/packages/base/type-tests/persistence.test-d.ts`；
- `e2e/src/testing/save-state-migration-driver.ts`；
- `e2e/src/test/save-state-migration-vector.test.ts`。

不得扫描依赖/源码树/Git 历史来生成声明；declaration 必须是fixture-backed、人工审查的
compatibility input。若 exact public type exposure 需要额外 barrel，停止回 M3.2 entry
review而不静默扩表。

**Direct RED/gates：** `0/1/256/257` length、`0/1/2` matches、duplicate tuple、permutation、
hostile array/accessor/Proxy、defensive copy/freeze、pre-I/O fail closed；同一 caller 10,000 次
over-limit/duplicate attempt不保留数组或增长lookup；single declaration行为回归；Deno/三
browser vector parity、Base/Engine Lab aggregate与 `deno task check`。若 multiple matches 只能
first-win或需要改变 Save/lineage wire，停止。

**2026-08-12 M3.2 adoption declaration set delivery（已完成；historical）：** 真实 RED 证明
旧 classifier 仍读取 singular `adoptionDeclaration` property，focused suite 因而失败。实现将
application/Core、Persistence service/classifier 与 Engine Lab 统一到 maximum-256 immutable
exact seven-field declaration set；configuration 在 Host I/O 前完成 descriptor-safe capture、
validation与freeze，覆盖 `0 / 1 / >1` match、stable ambiguous rejection、permutation independence
及 10,000-attempt boundedness，未交付 M3.3 backup substrate或后续 operation/UI/corpus。

最终 promotion matrix 全绿：focused `6 files / 274 tests`、Base `81 files / 1163 tests`、两个
type-test files、typecheck与scoped fmt/oxlint/diff、determinism Deno `3 / 3` 与
Chromium/Firefox/WebKit `6 / 6`。Canonical `deno task check` 覆盖 format `955 files`、full
lint/style/typecheck/determinism、`266 files / 4540 tests`、assets、five registered Story checks
与 Engine Lab production build `415 modules`，全部 green。M3.2 据此转为
completed/historical；唯一 current/next、core slice与 direct RED/implementation gate 推进到
M3.3。该 historical pointer 现已由下述 M3.3 delivery 关闭。

### M3.3 — Same-namespace bounded backup repository substrate（已完成；historical）

**Outcome：** 只实现 design 4.3 的 package-internal key、one-generation raw-byte backup 和
multi-record CAS primitive；不暴露 player operation，不执行 migration/re-anchor/restore。
backup key 固定为
`save-migration-backup.v1:${encodeURIComponent(storyId)}:${slotId}`，namespace 固定
`save`；不得新增 namespace/table/database/history。existing backup 阻止新 backup/migration；
普通 Save/Auto/clear/annotation 都不得 silently overwrite/delete pending backup。

**Exact allowlist：**

- `engine/packages/base/src/runtime/persistence/slot-keys.ts`；
- `engine/packages/base/src/runtime/persistence/save-repository.ts`；
- `engine/packages/base/src/runtime/persistence/save-repository.test.ts`；
- `engine/packages/base/src/runtime/persistence/save-repository.property.test.ts`；
- `engine/packages/base/src/runtime/persistence/persistence-service.test.ts`（只加 repository
  integration/no-mutation oracle）；
- `engine/packages/web/src/host/indexeddb-record-store.conformance.test.ts`（只加 multi-record
  atomicity oracle，如 shared conformance 已覆盖则不改）。

**Direct RED：** exact key grammar与 slot bounds；raw bytes byte-for-byte copy与既有 size bound；
embedded `recordRevision` 属于原 target且不与 backup Host revision比较，restore/export只做
bounded shell/digest与Story/slot/writeReason identity admission，restore以live target下一
`recordRevision`重编码；
每 Story/slot 只有一条 backup；backup/target/lease expected revision conflict 的全无语义；Host
fault 无 partial write；existing backup 返回 `backup_pending` 且 callback/write delta `0`；
quick/manual fresh save、Auto rotation、clear、annotation rewrite、list/inspection/load/import/
export 都保留 pending backup；只有显式 restore/discard 后续 operation消费，export-backup也保留；
10,000 次尝试记录数保持 slot-count bounded。Host Memory/IndexedDB contract tests必须证明多
mutation commit atomic，不用 service mock 冒充；Desktop preview不在本 gate。

**Gates：** focused repository/property/Persistence tests，Base package、受影响 Host conformance、
full unit 与 `deno task check`。若原子语义必须增加 Host namespace、public transaction、第二份
backup 或跨 namespace ordering，立即停止。

**2026-08-12 M3.3 same-namespace bounded backup repository substrate delivery（已完成；
historical）：** 实现严格落在上述 allowlist，以 package-internal exact key、bounded
shell/identity read、one-generation raw-byte backup 与 backup/target/lease 单批 CAS primitive
关闭 substrate；普通 Save、Auto、clear、annotation、list/inspection/load/import/export 均保留
pending backup。未暴露 player operation、Host transaction、额外 namespace、第二份 backup，
也未把 Desktop preview 提升为 crash-durable。

真实 mutation RED 中，反转 existing-backup guard 使 exact one-generation row 产生 `1` 个
失败；把 IndexedDB 三记录 batch 拆为独立 commit 则分别使 conflict 与 fault rows 转 RED。
最终 promotion matrix 全绿：focused repository/property/Persistence/IndexedDB
`4 files / 121 tests`、Base `81 files / 1177 tests`、typecheck 与 scoped fmt/oxlint/diff。
Canonical `deno task check` 覆盖 format `955 files`、`266 files / 4557 tests`、assets、five
registered Story checks 与 Engine Lab production build `415 modules`，全部 green。M3.3 据此
转为 completed/historical；唯一 current/next、core slice 与 direct RED/implementation gate
当时推进到 M3.4；该 historical pointer 已由下述 M3.4 delivery 关闭。

### M3.4 — Upgrade, re-anchor and backup-resolution operations（已完成；historical）

**Outcome：** Persistence service 消费 M3.1 inspection、M3.2 adoption set 与 M3.3 primitive，
提供语义化 inspect-backup/upgrade/re-anchor/restore/export-backup/discard-backup operation。
`inspectBackup(slot)` 每次 fresh-read package-internal backup，只返回 deeply frozen 的
`available | rejected/{empty_backup,unavailable,invalid_backup} | faulted` player-safe 状态；它不返回
bytes/key/Host revision，不取得 lease、不写入、不改变 Persistence status 或 live Session。upgrade 从当前
bytes 重跑 admission；无 pending backup 时成功 CAS
backup+target+lease；re-anchor 仅用于将会产生第 17 条 lineage 的 otherwise-valid unique
adoption，写 current exact baseline + empty lineage；pending 时新 migration 返回
`backup_pending`。restore 验证 backup 后 CAS target+backup delete+lease；export-backup
只返回defensively copied `ExportedSaveV1` exact raw bytes且不touch lease，Web download后仍保留
backup；discard只 CAS delete backup+touch lease。
这些 operation 成功都不 mutation live Session，玩家另行 load。

**Exact allowlist：**

- `engine/packages/base/src/contracts/application.ts`；
- `engine/packages/base/src/contracts/persistence.ts`；
- `engine/packages/base/src/contracts/index.ts`；
- `engine/packages/base/src/index.ts`；
- `engine/packages/base/src/runtime/application/core-game-application.ts`；
- `engine/packages/base/src/runtime/application/core-game-application.test.ts`；
- `engine/packages/base/src/runtime/persistence/compatibility.ts`；
- `engine/packages/base/src/runtime/persistence/compatibility.test.ts`；
- `engine/packages/base/src/runtime/persistence/save-repository.ts`；
- `engine/packages/base/src/runtime/persistence/save-repository.test.ts`；
- `engine/packages/base/src/runtime/persistence/persistence-service.ts`；
- `engine/packages/base/src/runtime/persistence/persistence-service.test.ts`；
- `engine/packages/base/src/runtime/persistence/current-load-baseline.test.ts`；
- `engine/packages/base/type-tests/application.test-d.ts`；
- `engine/packages/base/type-tests/persistence.test-d.ts`；
- `engine/packages/base/type-tests/persistence-diagnostics.test-d.ts`。

**Direct RED：** backup status 的 available/empty/invalid/unavailable/faulted 投影、fresh-read currentness
与零 lease/write/Session/status mutation；upgrade migration-only/migration+adoption；
inspection-to-action stale read；backup
create/pending；target/backup/lease conflicts与callback/validation/Host fault；lineage lengths
`0/15/16/>16`；16 exact remains loadable，16+adoption requires re-anchor，successful re-anchor
lineage exactly `[]`；zero/multi adoption match不可 re-anchor；restore invalid/stale/repeat/success；
export-backup exact bytes/download-failure并始终保留、discard confirmation/conflict；每个
failure source/target/backup/live Session/anchor/status unchanged，success 仍不 install Session；
10,000 次 pending attempts不增长 durable history。

**Gates：** focused Base tests、Base aggregate、Host conformance、determinism、full unit与
`deno task check`。若 action 必须信任 inspection token、绕过重新读取/validation，或 restore
owner 不能保持 package-internal/lease-fenced，立即停止。

**2026-08-12 M3.4 upgrade, re-anchor and backup-resolution operations delivery（已完成；
historical）：** public persistence port 现提供 single-slot read-only `inspectBackup` 与
`upgradeSave`、`reanchorSave`、`restoreBackup`、`exportBackup`、`discardBackup`。每个 action
都重读当前 Host bytes，不信任 inspection token；upgrade/re-anchor 原子提交一代 raw backup、
current target 与 lease，pending backup 在 callback/write 前 fail closed。restore/discard 是唯一
消费 backup 的 action，export defensively copy exact raw bytes 且始终保留 backup。所有成功与
失败都不安装 Session、不替换 replay anchor、不改变 Persistence status；恰好 16 条 lineage 的
exact Save 保持可加载，只有 otherwise-valid unique adoption 能 re-anchor 为 empty lineage，
`>16`、zero/multi adoption 与 validation failure 均不能借此绕过。

真实 public ABI RED 证明这些 semantic entry 尚不存在；mutation-sensitive rows 随后冻结
backup status 的 fresh-read/zero-mutation、stale inspection-to-action、one-generation pending、
target/backup/lease conflict与Host/callback/validation fault、migration/adoption combinations、
lineage `0/15/16/>16`、restore/export/discard 的 repeat与消费边界，以及 10,000 次 pending
attempts 不增长 durable history。Final gates 全绿：M3.4 specific `4 files / 298 tests`、focused
integration `6 files / 356 tests`、Base `81 files / 1221 tests`、IndexedDB `13 / 13`、
determinism Deno `3 / 3` 与 Chromium/Firefox/WebKit `6 / 6`。Canonical `deno task check`
覆盖 format `955 files`、`266 files / 4604 tests`、lint/style/typecheck/determinism/assets、five
registered Story checks 与 Engine Lab production build `415 modules`。

首次 canonical 的唯一失败是保留的 10,000-attempt stress row 在并行负载下用时约 `47s`，
超过测试默认 `30s` budget；没有降低 attempt count 或产品断言，只把该显式 test budget 调整为
`120s`。随后 focused 用时 `15.11s`，canonical 全绿；这是 test-budget corrective，不是产品
failure。M3.4 据此转为 completed/historical；其当时推进到 M3.5 的 historical pointer 已由
下述 M3.5 delivery 关闭。

### M3.5 — Player-readable Save recovery UI（已完成；historical）

**Outcome：** UI/Web 只消费 M3.1/M3.4 public semantic results（包括 read-only backup status），
把 stable code 映射为本地化、
可访问、可行动的检查/升级/re-anchor/导出/restore/export-backup/discard-backup/取消流程；不展示 stack/raw bytes/key/
revision/fence，不让 UI 自行 CAS 或修改 Session。

**Exact allowlist：**

- `engine/packages/ui/src/persistence/save-overlay.tsx`；
- `engine/packages/ui/src/persistence/save-overlay.test.tsx`；
- `engine/packages/ui/src/persistence/save-overlay.module.css`；
- `engine/packages/ui/src/persistence/index.ts`；
- `engine/packages/ui/src/system/system-dialog-managed-contract.ts`；
- `engine/packages/ui/src/system/system-dialog-managed-contract.test.ts`；
- `engine/packages/ui/src/system/system-dialog-managed-session.ts`；
- `engine/packages/ui/src/system/system-dialog-managed-session.test.ts`；
- `engine/packages/ui/src/system/system-dialog-managed-host.tsx`；
- `engine/packages/ui/src/system/system-dialog-managed-host.test.tsx`；
- `engine/packages/ui/src/system/system-dialog-host.tsx`；
- `engine/packages/ui/src/system/system-dialog-host.test.tsx`；
- `engine/packages/ui/src/index.ts`；
- `engine/packages/ui/src/public-api.test.ts`；
- `engine/packages/web/src/application/create-player-ui-ports.ts`；
- `engine/packages/web/src/application/create-player-ui-ports.test.ts`；
- `engine/packages/web/src/application/create-player-save-surfaces.ts`；
- `engine/packages/web/src/application/create-player-save-surfaces.test.ts`；
- `engine/packages/web/src/application/start-web-game-application.tsx`；
- `engine/packages/web/e2e/engine/shell.spec.ts`；
- `engine/packages/web/playwright.engine.config.ts`；
- `e2e/src/application/composition.tsx`；
- `e2e/src/test/composition.test.tsx`；
- `examples/cat-cafe/src/application/composition.tsx`；
- `examples/cat-cafe/src/application/labels.ts`；
- `examples/e2e/cat-cafe.spec.ts`；
- `examples/e2e/playwright.examples.config.ts`。

**2026-08-12 M3.5 docs-only scope corrective（已完成；historical）：** 原十五项
保持不变，新增上述十二个既有 source/test/config path，共二十七项。原表遗漏了已经交付的
managed System exact-parent confirmation contract/session/Host 及其 tests，导致实现只能在 Save
overlay 内复制确认 authority；也遗漏了 `system-dialog-host` 的 localized copy mapping source/test。
本 corrective 只允许把 closed confirmation invocation 从既有 `load | clear | import` 扩为
`load | clear | import | reanchor | restore | discard`，前三者的 shape 与行为不变；
re-anchor、restore、discard 必须确认，受 pre-write backup 保护的 explicit upgrade 不确认，
只读且保留 backup 的 export-backup 不确认。cancel、late/stale settlement、double click、focus
与 opener restore 必须复用同一个 managed child/session，不得 inline 第二套 confirmation modal。

原表也没有任何能承载冻结 browser gate 的 spec/config。Engine Lab 只在既有
`engine/packages/web/e2e/engine/shell.spec.ts` 增加 `@save` flow，Cat Cafe 只在既有
`examples/e2e/cat-cafe.spec.ts` 增加 `@save` flow；两份既有 Playwright config 可各增加一个
desktop Firefox project，并以 `grep: /@save/` 只运行 Save-tagged specs。Chromium/WebKit
project 与 Chromium prebuilt smoke 的既有范围不变；不得借 Firefox gate 扩大整套 browser
matrix。本 corrective 未修改 source/test/config；其 implementation gate 已由下述 delivery
关闭。

**Direct RED：** 每个 disposition/code 的玩家文案与允许 action；loading/confirm/cancel、double
click、late/stale result、failure/restore retry；re-anchor 必有 export/restore/cancel 且
re-anchor/restore/discard 必须走同一 managed confirmation child，upgrade/export-backup 不走确认；
键盘、focus、screen-reader status 与 reduced-motion；无 stack/digest/raw key 泄漏；single-slot
exact result；Engine Lab 与 Cat 真实 composition；browser 不靠 sleep/coordinates/text-only selector。

**Gates：** focused UI/Web/Story tests、UI/Web aggregates、Engine Lab + Cat Chromium/Firefox/
WebKit Save flow（Firefox project 只运行 `@save` specs）、prebuilt smoke 与 `deno task check`。
若两个 Story需要不同 persistence语义、UI必须取得 raw store或新增第二 authoritative状态，
立即停止。

**2026-08-12 M3.5 player-readable Save recovery UI delivery（已完成；historical）：** UI/Web
只经 optional atomic recovery group 消费 M3.1/M3.4 single-slot semantic results，并把每个
disposition、backup status、operation outcome 与 stable rejection code 映射为本地化、可访问的
player copy；没有把 stack、digest、raw bytes、Host key/revision/fence 或 exported file authority
暴露给 UI。re-anchor、restore、discard 复用同一个 managed System exact-parent confirmation
child；upgrade 与 export-backup 不确认。explicit inspection 保持 slot-local，pending read/write
mutually exclusive；stale/mismatched result fail closed，成功 operation 不安装 Session。

真实 RED 中，初始 Web recovery bridge 缺失使 focused suite 产生 `6` 个失败；WebKit 随后证明
delegated pointer capture 与 target callback 之间的 microtask checkpoint 会过早清除 provisional
opener，使 confirmation 留在 root shell。修复后 request 仍即时消费并重验 exact parent/root
instance，provisional opener 只在同 task 结束时过期；旧行为会让真实 browser row 转 RED。
补齐 test-matrix acceptance gap 后相关 suite 为 `79 / 79`。

Final gates 全绿：focused exact `9 files / 219 tests`、UI + Web aggregate
`113 files / 1942 tests`、typecheck 与 exact 27-path fmt/oxlint/diff；Engine Lab 与 Cat Cafe 的
Chromium/WebKit/Firefox `@save` flow 各 `3 / 3`。Prebuilt gate 为 Engine Lab build
`415 modules` + Chromium `44 / 44`（real `52.50s`）。Canonical `deno task check` 覆盖 format
`955 files`、`266 files / 4682 tests`、assets、five registered Story checks 与 Engine Lab
production build `415 modules`，real `36.93s`，全部 green。M3.5 据此转为
completed/historical；唯一 live/current/next、core slice与 direct RED/implementation gate
当时推进到 M3.6a；该 historical pointer 现已由下述 M3.6a delivery 关闭。

### M3.6.0 — Exact promotion inventory corrective（docs-only，已完成）

M3.6 的 supported floor、fixture authenticity、full lifecycle、four-runtime parity、Browser
download/no-clobber evidence 与最终 promotion contract 全部保持不变。原 13-path inventory
只列出 corpus/fixture、两个 Story test 与最终 docs，遗漏了现有 migration driver/worker、
authoritative matrix 及 Browser `@save` evidence owner，因此无法在 exact scope 内执行已冻结的
acceptance。本 corrective 只把 execution 拆为 M3.6a–M3.6d；M3.6a 的 formatter corrective
随后把 aggregate inventory 修正为 24 路径；M3.6b implementation pre-audit corrective 再补入
两个既有 direct/protocol test owner，形成 26 路径。canonical authority-map gate 随后证明
broad Base testkit barrel 会污染 migration Worker closure，因此第二个 M3.6b docs-only scope
corrective 再加入一个既有窄 facade，形成 27 路径。M3.6d closeout pre-audit 先证明原五份
final docs 会遗漏两个有效 live/current 指针；seven-doc candidate 落盘后的 whole-doc scan 又
发现两个 active design pointer owner；exact-nine candidate 落盘后的全量 tracked Markdown、
website 与 config active-pointer/语义扫描再发现三份 live owner。因此三次 stale-pointer
corrective 依次把 M3.6d 修正为 7、9、12，形成下列 34 路径。七次 corrective 都不声明 M3.6
runtime delivery。

M3.6a–M3.6d 的 exact allowlist 合集除下列路径外不含其它 source/test/fixture/docs；列内允许
zero-diff，若 implementation 必须越界则停止并先修订本 `.0`：

- `engine/packages/base/src/testkit/save-migration-release-corpus.ts`（新增）；
- `engine/packages/base/src/testkit/save-migration-release-corpus.test.ts`（新增）；
- `engine/packages/base/src/testkit/index.ts`；
- `engine/packages/base/src/testkit/save-state-migration-determinism.ts`；
- `deno.json`（只增加下述四个 exact maintained Save byte fixture 的 `fmt.exclude`）；
- `e2e/fixtures/saves/engine-lab-state-3.save.json`（新增）；
- `e2e/fixtures/saves/engine-lab-state-4.save.json`（新增）；
- `e2e/fixtures/saves/engine-lab-state-5.save.json`（新增）；
- `e2e/src/test/save-migration-release-corpus.test.ts`（新增）；
- `examples/cat-cafe/fixtures/saves/cat-cafe-state-1.save.json`（新增）；
- `examples/cat-cafe/src/test/save-migration-release-corpus.test.ts`（新增）；
- `e2e/src/testing/save-state-migration-driver.ts`；
- `e2e/src/testing/save-state-migration-runner.ts`；
- `e2e/src/testing/save-state-migration-worker.ts`；
- `e2e/src/test/save-state-migration-vector.test.ts`；
- `e2e/src/test/save-state-migration-worker.test.ts`；
- `e2e/src/testing/authoritative-determinism-matrix.ts`；
- `e2e/src/tooling/authoritative-determinism-matrix.ts`；
- `e2e/src/test/authoritative-determinism-matrix.test.ts`；
- `engine/packages/web/e2e/determinism/authoritative-determinism.spec.ts`；
- `engine/packages/web/e2e/engine/shell.spec.ts`；
- `examples/e2e/cat-cafe.spec.ts`；
- `docs/engine/features.md`；
- `docs/engine/build-and-release.md`；
- `docs/engine/architecture.md`；
- `docs/engine/development.md`；
- `docs/engine/roadmap.md`；
- `docs/engine/design/surface-contract-harness.md`（pointer/current-entry only）；
- `docs/engine/design/vn-presentation-runtime.md`（pointer/current-entry only）；
- `docs/engine/design/window-model.md`（pointer/current-entry only）；
- `docs/engine/design/save-migration.md`（status/promotion record only）；
- `docs/engine/plans/2026-07-30-save-migration.md`（promotion record only）；
- `docs/engine/plans/2026-07-30-production-floor-sequence.md`（pointer only）；
- `docs/engine/plans/2026-07-30-surface-contract-harness.md`（pointer/current-entry only）。

M3.6b pre-audit 当时认为既有 public determinism-vector facade 足以承载 corpus vector；canonical
authority-map gate 随后反证 driver 若从 broad `@sillymaker/base/testkit` 读取 corpus admission，
会把 `runtime/application` 与 `persistence-service` 拉入 migration Worker closure。上述新增的
既有窄 facade 因此只重导出 corpus admission、inventory 与 descriptor types，不扩 production
barrel或 runtime authority；若 implementation 仍需越界，必须停止并先修订本 `.0`，不得先越界
再补文档。M3.6.0 据此完成；其当时恢复的 M3.6a implementation gate 现已由下述 delivery 关闭。

**2026-08-12 M3.6d docs-only stale-pointer scope corrective（已完成）：** PF5 closeout
pre-audit 证明 `docs/engine/roadmap.md` 与
`docs/engine/plans/2026-07-30-surface-contract-harness.md` 仍各自拥有把 PF5/M3 标为
live/current 的有效指针。原 M3.6d 五份文档无法合法更新它们，若直接 closeout 会留下错误的
当前执行入口并违反 frozen stale-pointer gate。因此本 corrective 只把上述两份既有文档加入
M3.6d/aggregate exact allowlist，使 M3.6d 从 5 修正为 7、aggregate 从 27 修正为 29；它不修改
新增的两份文档，不交付 runtime/test/fixture/live product capability，也不声明 M3.6c 或 M3.6d
delivery/promotion。该 corrective 完成时 M3.6c 仍为当前切片，随后已由上文 delivery关闭；
当时计划的 seven-doc M3.6d 又由下述 whole-doc corrective supersede。

**2026-08-12 M3.6d docs-only whole-doc stale-pointer scope corrective（已完成）：** seven-doc
candidate 落盘后的 active-pointer scan 进一步证明
`docs/engine/design/surface-contract-harness.md` 与
`docs/engine/design/vn-presentation-runtime.md` 的顶层状态仍把 PF5/M3 标为 current。第一轮
corrective 只覆盖 roadmap 与 focused Surface plan，仍会在 PF5 closeout 后留下两个错误 live
入口。因此本 corrective 只把上述两份既有 design owner 加入 M3.6d/aggregate exact allowlist，
使 M3.6d 从 7 修正为 9、aggregate 从 29 修正为 31；它只修改三份 owning Save docs，不修改
两份新增文档，不交付 runtime/test/fixture/live product capability，不声明 M3.6d
delivery/promotion，也不推进 production-floor pointer。M3.6d 仍为当前 closeout；待 exact-nine
candidate 更新两份新增 owner 后继续全量审计；该候选现已由下述 exhaustive-scan corrective
supersede。

**2026-08-12 M3.6d docs-only exhaustive live-doc scope corrective（已完成）：** exact-nine
candidate 落盘后，对全部 tracked Markdown、website 与 config 执行 active PF5/M3 pointer 及
Save migration/corpus/inspection/backup/recovery planned/unimplemented 语义扫描。扫描证明
`docs/engine/architecture.md` 仍有两个有效 PF5 current/next 指针，
`docs/engine/development.md` 仍把 PF5 写成 current 且把 release fixtures 与玩家
inspection/backup/recovery 写成 planned，`docs/engine/design/window-model.md` 的顶层状态仍把
PF5/M3 写成 current implementation gate。website、Story authoring 与 build/release 文档没有
额外冲突声明，因此不扩入其它文件。本 corrective 只把上述三份既有 live owner 加入
M3.6d/aggregate exact allowlist，使 M3.6d 从 9 修正为 12、aggregate 从 31 修正为 34；它只
修改三份 owning Save docs，不修改三份新增文档，不交付 runtime/test/fixture/live product
capability，不声明 M3.6d delivery/promotion，也不推进 production-floor pointer。M3.6d 仍是
当前 pending exact-twelve docs-only closeout。

### M3.6a — Maintained corpus and Story lifecycle（已完成；historical）

**Supported floor：** Cat Cafe 当前 revision 1 是首个支持 floor，只保存真实 current bytes，
不虚构 revision 0/旧 Cat Save。Engine Lab 维护 revision 3、4 到 current 5 的 compatibility
fixtures 与既有 `3 -> 4 -> 5` chain，不伪称来自历史 product release capture。发现必须支持的
same-revision/different-digest revision 5 bytes 时立即
停止，先接受显式 recovery/migration contract；不得补 `5 -> 5` edge、借 adoption 转换 State
或从 current encoder 倒造历史 fixture。

**Exact allowlist：**

- `engine/packages/base/src/testkit/save-migration-release-corpus.ts`（新增）；
- `engine/packages/base/src/testkit/save-migration-release-corpus.test.ts`（新增）；
- `engine/packages/base/src/testkit/index.ts`；
- `deno.json`（只增加下述四个 exact maintained Save byte fixture 的 `fmt.exclude`）；
- `e2e/fixtures/saves/engine-lab-state-3.save.json`（新增）；
- `e2e/fixtures/saves/engine-lab-state-4.save.json`（新增）；
- `e2e/fixtures/saves/engine-lab-state-5.save.json`（新增）；
- `e2e/src/test/save-migration-release-corpus.test.ts`（新增）；
- `examples/cat-cafe/fixtures/saves/cat-cafe-state-1.save.json`（新增）；
- `examples/cat-cafe/src/test/save-migration-release-corpus.test.ts`（新增）。

**2026-08-12 M3.6a docs-only formatter scope corrective（已完成）：** 首个真实 fixture
capture 证明 official Save export 是无尾换行的 canonical compact JSON bytes，而 repository
canonical `deno fmt --check` 会把 `*.save.json` 重排为 pretty JSON，从而改变 byte length、SHA
和用户实际导出 payload。fixture 不得为迎合 formatter 而改写，也不得在测试中重新 encode。
因此本 corrective 只把 `deno.json` 加入 M3.6a/aggregate exact allowlist，并只允许在
`fmt.exclude` 精确列出上述四个 maintained fixture；不排除 fixture 目录、其它 JSON、source
或 tests，不改变 runtime/Save wire，也不声明 corpus delivery。Deno 官方 formatter contract
明确由 `fmt.exclude` 处理不应被格式化的 checked-in bytes；配置落地后 M3.6a implementation
当时继续为唯一 current gate，该 historical pointer 现已由下述 delivery 关闭。

**Direct RED/acceptance：** checked-in fixture bytes 在测试中不得由待测/current encoder
重生成；Cat revision 1 initial floor 可一次性用当前 official encoder capture并经review冻结，
随后只作为immutable input消费。corpus 全量执行
inspect → migrate/adopt/re-anchor（适用时）→ current schema/reference/invariant/digest → load →
fresh save round-trip；Engine Lab 3/4/5、Cat 1、adoption、lineage `15/16`、ambiguous declaration、
failure backup/restore；annotation 与 M0a `versionStamp` matrix保持 capture origin；断言支持清单与
fixture 一一对应。不得以合成 migration vector 冒充发布 byte corpus。本 slice 只关闭 maintained
bytes与两个 Story 的完整 lifecycle，不改 four-runtime driver、Browser spec或 live docs。

**Gates：** focused corpus helper与两个 Story lifecycle suites、Base与受影响 Story aggregate、
`deno task check`。fixture/corpus gate 全绿后才推进 M3.6b。

**2026-08-12 M3.6a maintained corpus and Story lifecycle delivery（已完成；historical）：**
实现严格命中上述 exact `10` paths（含 `deno.json`），未修改 four-runtime driver、Browser spec
或 live product docs。真实 RED 首先使三份新增 corpus suites 因 release-corpus helper/barrel
尚不存在而在 module resolution 失败；实现 helper/barrel 与四份 checked-in fixtures 后，同一
suites 转 GREEN。Base admission 固定 exact inventory、length/SHA-256、canonical compact bytes、
Story/State identity 与 fresh defensive copy；Engine Lab 与 Cat Cafe suites 从 physical fixture
执行完整 lifecycle，并覆盖 failure no-mutation、backup/restore、adoption、lineage `15/16`、
ambiguous declaration、annotation 与 M0a `versionStamp` capture-origin 保留。

四份无尾换行 canonical fixtures 冻结为：Engine Lab revision 3：`2163` bytes、
`sha256:f40396978f6c721e147834546809770d368548efc604d8c446c0332df6bba795`；revision 4：
`2188` bytes、`sha256:42573be3dca88e2e5262c9be7d38356056cba662211e7ff17b117563f6565534`；
revision 5：`2246` bytes、
`sha256:e19a79e7c340349b75b89e1fe27d1ce3bfdff5fa72ded9df52260fa771e2f01d`；
Cat Cafe revision 1：`2092` bytes、
`sha256:48630fdae6e7edcd69ce4384c9f8aa33ede0f624acf172eb674a01863d5c478a`。

Final gates 全绿：focused `3 files / 19 tests`、Base `82 files / 1227 tests`、Engine Lab
`27 files / 150 tests`、Cat Cafe `10 files / 38 tests`、typecheck、scoped fmt `6 files`、Deno
lint `5 files`、oxlint 与 diff。Canonical `deno task check` 覆盖 format `959 files`、
`269 files / 4701 tests`、assets、five registered Story checks 与 Engine Lab production build
`415 modules`，real `41.23s`。M3.6a 据此转为 completed/historical；唯一 live/current/next、
core slice与 direct RED/implementation gate 当时推进到 M3.6b；该 historical pointer 现已由
下述 M3.6b delivery 关闭。

### M3.6b — Four-runtime corpus parity（已完成；historical）

**Exact allowlist：**

- `engine/packages/base/src/testkit/save-state-migration-determinism.ts`；
- `e2e/src/testing/save-state-migration-driver.ts`；
- `e2e/src/testing/save-state-migration-runner.ts`；
- `e2e/src/testing/save-state-migration-worker.ts`；
- `e2e/src/test/save-state-migration-vector.test.ts`；
- `e2e/src/test/save-state-migration-worker.test.ts`；
- `e2e/src/testing/authoritative-determinism-matrix.ts`；
- `e2e/src/tooling/authoritative-determinism-matrix.ts`；
- `e2e/src/test/authoritative-determinism-matrix.test.ts`；
- `engine/packages/web/e2e/determinism/authoritative-determinism.spec.ts`。

**2026-08-12 M3.6b docs-only async-driver scope corrective（已完成）：** maintained corpus
必须从 checked-in immutable file bytes 读取，不得在 driver 内复制、重生成或重新 encode；该
I/O 使 driver corpus path 必须 async。原本同步调用 driver 的既有
`e2e/src/test/save-state-migration-vector.test.ts` 因而必须进入 allowlist 并显式 `await`；既有
`e2e/src/test/save-state-migration-worker.test.ts` 是 worker request/result protocol 的 direct
owner，也进入 allowlist但允许 zero-diff。pre-audit 已证明既有 Base facade 足够，不增加 Base
source/test；该判断随后由下述 canonical corrective supersede。本 corrective 只修正文档中的
exact inventory，不修改 driver、test、worker 或 runtime，不声明 M3.6b delivery；其当时保留的
M3.6a current gate 已由上述 delivery 关闭，并在当时把 implementation gate 推进到 M3.6b；
该 historical pointer 现已由下述 delivery 关闭。

**2026-08-12 M3.6b docs-only authority-map scope corrective（已完成）：** 首次完整
`deno task check` 证明 driver 直接 import broad `@sillymaker/base/testkit` 会让 authoritative
import-closure map 把 `runtime/application` 与 `persistence-service` 归入 migration Worker
closure，违反既有窄 callback authority。corpus contract 与 runtime 均不需要扩张；本 corrective
只把既有 `engine/packages/base/src/testkit/save-state-migration-determinism.ts` 加入 exact
allowlist，使 M3.6b 从 9 修正为 10、aggregate 从 26 修正为 27，并限定它只重导出
release-corpus admission、inventory 与 descriptor types。它不修改 source/test/runtime，不声明
M3.6b delivery或 promotion；它当时保留的 M3.6b implementation gate 现已由下述 delivery
关闭。

**Direct RED/acceptance：** 把 M3.6a 全量 maintained corpus 作为 immutable input 接入现有
authoritative matrix；Deno、Chromium、Firefox、WebKit 必须比较 normalized result、diagnostic与
digest，缺任一 browser fail closed。driver 以 async exact-byte read 消费 checked-in fixture，
所有 direct caller 显式 await；driver/worker 不重生成 fixture，不把 synthetic M2 vector 冒充
release corpus。driver 只从上述 narrow migration facade 取得 corpus admission/descriptors；
migration Worker closure 不得因该读取引入 `runtime/application` 或 `persistence-service`。

**Gates：** focused driver/worker/matrix tests、Deno matrix与三 browser repeat matrix、
`deno task check`。四 runtime parity 全绿后才推进 M3.6c。

**2026-08-12 M3.6b four-runtime corpus parity delivery（已完成；historical）：** 首个
mutation-sensitive RED 先把 hand-maintained expected vector 增加 ordered four-case
`releaseCorpus`，而 actual collector 仍为空，direct exact comparison 因而失败；实现随后以四个
literal `?no-inline` URL 异步读取 checked-in immutable bytes，经 narrow Base migration testkit
admission 后保持原 synthetic M2 vector 与 release corpus 分离。Engine Lab revision 3/4 执行真实
`3 -> 4 -> 5` callbacks，revision 5 与 Cat Cafe revision 1 执行 current exact admission；normalized
result 固定 source/target identity与digest、migration steps/callback count、diagnostic 与
source-byte preservation。

首次 canonical gate 又产生第二个真实 RED：authority-map `1 / 14` 失败并报告四条 forbidden
transitive paths，证明 broad `@sillymaker/base/testkit` 把 application/persistence authority 拉入
migration Worker closure。上述 docs-only corrective 落地后，既有 narrow
`save-state-migration-determinism` facade 只 direct re-export corpus admission/inventory/type，
driver 改为单一 narrow specifier，同一 authority-map 转为 `14 / 14` GREEN。

实现严格命中 frozen exact `10` paths：narrow facade、driver、direct vector test 与 worker 共
`4` paths 有 diff，其余 runner、worker protocol test、authoritative matrix source/tooling/test 与
Browser spec 共 `6` paths 保持 zero-diff并继续执行 exact-currentness。Final gates 全绿：focused
direct/worker/matrix `3 files / 6 tests`、authority-map `14 / 14`、Deno matrix `1 file / 3 tests`、
Chromium/Firefox/WebKit repeat-each-two matrix `6 / 6`（real `10.41s`），以及 exact fmt/oxlint/
diff与 full typecheck。Canonical `deno task check` 覆盖 format `959 files`、
`269 files / 4701 tests`、assets、five registered Story checks 与 Engine Lab production build
`415 modules`，real `41.83s`，全部 green。M3.6b 据此转为 completed/historical；唯一
live/current/next、core slice与 direct RED/implementation gate推进到 M3.6c。

### M3.6c — Browser repeated-download no-clobber evidence（已完成；historical）

**Exact allowlist：**

- `engine/packages/web/e2e/engine/shell.spec.ts`；
- `examples/e2e/cat-cafe.spec.ts`。

**Direct RED/acceptance：** 同一秒、同一 suggested filename 的 export 必须触发两次 download
request/event；Playwright 将它们保存到两个不同临时路径并验证各自 payload bytes。该证据不宣称
Browser JavaScript 决定最终 suffix，也不声明 Desktop preview 已有 process-crash atomicity。

**Gates：** Engine Lab与 Cat Cafe Chromium/Firefox/WebKit `@save` flow、既有 Chromium
prebuilt smoke与 `deno task check`。Browser evidence 全绿后才推进 M3.6d。

**2026-08-12 delivery：** 新 assertions 首先消费旧 `void` seed helper，使 Engine Lab 与 Cat
Cafe 两处 typecheck 产生 TS2769 RED；helper 随后在同一 IndexedDB transaction 内复制 pending
backup bytes 并返回 defensive oracle。两份 flow 均在首次导航前固定 metadata clock，捕获两次
download event、断言相同 suggested filename、`saveAs` 到两个 distinct
`testInfo.outputPath`、逐 byte 对比两份落盘 payload，并在 export 后重新 inspection 证明 backup
仍 available，再完成既有 discard/restore。

Engine Lab/Cat Cafe × Chromium/Firefox/WebKit `6 / 6`，exact fmt/oxlint/typecheck/diff 全绿；
prebuilt 为 build `415 modules` + Chromium `44 / 44`（real `54.95s`）。Canonical
`deno task check` 为 format `959 files`、`269 files / 4701 tests`、assets、five Stories 与
build `415 modules`（real `42.96s`）。M3.6c 据此转为 completed/historical；未声明 Browser
filesystem suffix authority或 Desktop process-crash atomicity。

### M3.6d — Live product docs and PF5 promotion（已完成；historical）

**Exact allowlist：**

- `docs/engine/features.md`；
- `docs/engine/build-and-release.md`；
- `docs/engine/architecture.md`；
- `docs/engine/development.md`；
- `docs/engine/roadmap.md`；
- `docs/engine/design/surface-contract-harness.md`（pointer/current-entry only）；
- `docs/engine/design/vn-presentation-runtime.md`（pointer/current-entry only）；
- `docs/engine/design/window-model.md`（pointer/current-entry only）；
- `docs/engine/design/save-migration.md`（status/promotion record only）；
- `docs/engine/plans/2026-07-30-save-migration.md`（promotion record only）；
- `docs/engine/plans/2026-07-30-production-floor-sequence.md`（pointer only）；
- `docs/engine/plans/2026-07-30-surface-contract-harness.md`（pointer/current-entry only）。

M3.6a–M3.6c 全部通过后才更新 live capability、supported floor/release workflow并关闭 PF5；
M3.6d 不补 runtime/test/fixture。Final gate 为十二份 exact docs 的 fmt/diff、stale-pointer audit与
fresh `deno task check`。

**M3 acceptance：** design 的 release acceptance 全部满足；任何被声明支持的 revision 都有
真实 fixture；不存在“代码声称支持但 CI 没有真实字节”的版本。

**2026-08-12 exact-seven candidate（未交付）：** 第一轮候选同步了 live capability、supported
floor 与 release workflow并记录 M3.6c 完整 gate，但 whole-doc scan 随后证明它遗漏上述两份
active design pointer owner，因此不能构成 M3.6d delivery、PF5 promotion 或 pointer advancement。
本 slice 仍不修改 runtime/test/fixture/config；后续 exact-nine candidate 虽更新两份新增 owner，
但 exhaustive live-doc scan 又发现三份 active owner，因此仍未交付。

**2026-08-12 exact-nine candidate（未交付）：** 该候选严格修改当时的九份 docs，但
`architecture.md`、`development.md` 与 `design/window-model.md` 的上述有效状态/能力声明仍会
让 PF5 closeout 留下错误 live truth，因此不构成 M3.6d delivery、PF5 promotion 或 pointer
advancement。待修正后的 exact-twelve overlay 更新三份新增 owner、十二份 docs 的
fmt/diff/stale-pointer audit 与 fresh `deno task check` 全绿后，才可记录最终 delivery并
关闭 PF5/M3。

**2026-08-12 final exact-twelve delivery（已完成；historical）：** final overlay 严格命中上述
十二份 docs，更新 live capability、supported Save floor、release workflow 与全部有效 execution
pointer；未修改 runtime/test/fixture/config，未扩大 Browser filesystem suffix 或 Desktop
process-crash atomicity 声明。全量 tracked Markdown、website 与 config scan 没有发现 exact
scope 外的 live contradiction 或 navigation/link 更新。Scoped format、diff、stale-pointer 与 exact
inventory gate 全绿；fresh final `deno task check` 覆盖 format `959 files`、
`269 files / 4701 tests`、assets、five registered Story checks 与 Engine Lab production build
`415 modules`；`/usr/bin/time -p` 为 real `46.59s`、user `224.14s`、sys `47.21s`，全部 green。
M3.6d、M3 与 PF5 据此转为 completed/historical；
当时的 PF6/S5 pointer 已由后续 Complexity Reset supersede。

## 7. API discipline

- migration registry 是 authoring/runtime contract，不把 raw storage adapter 暴露给 Story；
- migration function 不取得 arbitrary context；M2 不注入 read-only resource client，owner
  只可闭包引用同一 authoritative import closure 中的 module-level immutable constants；
- 不自动推断 schema diff；作者显式写语义转换；
- 不把 Mod 安装/卸载、content patch、adoption 与 State migration 合并为一个万能 hook；
- diagnostics 包含稳定 code、revision path、migration ID 与 failing validation phase。

## 8. Non-goals

- downgrade；
- 跳版本捷径（除非以后由相邻链性能证据激活）；
- 外部数据库/异步迁移服务；
- 任意脚本 eval；
- Mod distribution；
- renderer/workspace/conversation 数据迁入 gameplay Save；
- CommandLog 跨新 anchor 重放。
- envelope format migration；
- durable migration receipt/history 与 Debug Bundle wire；
- multi-namespace/Mod migration order；
- 自动扫描并重写任意 State string reference。

## 9. Stop conditions

- shell parse 需要放开当前 JSON size/depth/key 限额；
- migration 需要 live Session、网络、墙钟或随机；
- migration failure 已修改原记录或 authoritative state；
- migration 与 adoption 无法在结果中区分；
- fixture 依赖 `tmp/**`、`references/**` 或未发布复刻；
- current schema validation 仍在 migration 之前执行；
- M1 必须接受或执行 executable migrator 才能建立 shell/load order，或 M2 想在
  DET-B/M1 same-HEAD join 前开始；
- 实现需要静默改变已接受 design；
- 迁移需要改变 `formatRevision`、outer envelope shape 或 engine-owned Snapshot shell；
- migrator 必须修改 RNG、commandSequence 或 integrity，或必须 async/Promise；
- **M1/M2 mechanism slice** 若必须同时实现多个 runtime namespace/Mod ordering、
  skipped-revision shortcut、自动 State string rewrite、M3 backup/dry-run/durable history或
  产品 UI；该历史 stop 不禁止已进入 PF5 的 M3 按第 6 节独立切片交付 inspection、backup与UI；
- receipt 必须进入 Save、Snapshot、CommandLog、replay identity、`simulationLineage` 或 M2
  Debug Bundle；
- 16-step mechanism bound不足以承载真实已承诺历史版本；
- package-internal prepare/no-throw commit无法实现，必须新增公开 universal transaction API；
- callback/invalid output只能通过让 Session进入 `fault_paused` 才能表达；
- maintained/released fixture要求不同 failure/migration semantics；
- real migration owner无法与 Host/Presentation closure分离，或只能靠 hard-coded path进入 lint。

## 10. Promotion record

每阶段记录：旧 bytes/红测试、load-order 变化、public contract、失败原子性、fixture revision、focused/aggregate checks、玩家路径、仍未支持的历史版本。M1–M2 只证明机制；M3 通过后才能在 `features.md` 宣称 Save migration 是发布能力。
