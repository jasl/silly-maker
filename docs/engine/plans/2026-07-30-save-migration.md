# Save migration execution plan

状态：2026-07-30 接受执行，审查后从 Snapshot 性能计划拆分；2026-07-31 按
M0a/M0b metadata ownership 与 PF-DET same-HEAD join 重切片；2026-08-03 M1 已
promotion，same-HEAD join 已关闭，并按接受的 State-only contract 把 M2 拆为
M2a–M2e；2026-08-04 M2e 已完成 real-owner/four-runtime promotion，M2 aggregate
已关闭。M3 仍按
production-floor sequence 排在 PF4 后。目标合同见
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
  independence；同一秒名称可以相同，真正 no-clobber 由 Browser/Desktop Host
  单独证明；
- 每个 valid metadata variant 的 list/export/import/load round-trip，以及 physical
  readback、accepted lease fence 与 post-commit failure semantics。

M0a 同时落一个中性、可维护的 shared corpus/testkit seam。DET-B 只消费其 compact
pure summary/stamp/bytes vectors做跨 runtime equality，不复制 lifecycle golden；
Host/Desktop 只消费相同 payload/build receipt 做真实 no-clobber/package integration。
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

**目标：** 在 bounded Base authority 内解析 complete chain，并在 detached、deep-frozen
Strict Canonical Data 上同步执行每一步。每步只返回 exact migrated/rejected union；每个
migrated output重新 descriptor-safe capture、canonical/limit admission、copy/freeze，再交给
下一步；本切片新增 immutable failure attempt、opaque successful completion与 pure receipt
finalizer。executor不计算 receipt 的 `migratedStateDigest`；M2c完成 whole-Snapshot
reconstruction/schema/digest后把 final normalized Snapshot digest交给 finalizer。

为保持 chain-before-shell precedence，package-internal protocol拆为 chain resolve与 callback
execution两步；M2c必须在二者之间完成 historical engine-owned Snapshot shell admission。

**非目标：** 不接 load/import、Session、Persistence、Host、Core production owner或
browser matrix；不处理 format migration、RNG、command sequence、integrity、annotation、
lineage 或 arbitrary context。

**Red/acceptance：** one/two-step、rename、delete fallback/reject、repeat equality、exact callback
counts、input/output alias mutation、thenable、non-exact/extra/symbol/accessor result、custom
prototype、cycle、fractional/non-finite/unsafe number与over-limit output。missing/incomplete chain
callback count 为 `0`；explicit reject=`migration.rejected`，illegal output=
`migration.output_invalid`，throw=`migration.callback_threw`且不暴露 message/stack。所有 M2b
failure attempt的 `migratedStateDigest`为 `null`；receipt finalizer只接受 exact successful
completion与调用者提供的 whole-Snapshot digest，不能接受 failure/fake/spread token。

**2026-08-03 M2b promotion：** Base 现已在 bounded authority 内提供 exact non-empty suffix
resolution、detached/deep-frozen Strict State admission、同步 one/two-step execution、immutable
failure attempt、opaque completion与 whole-Snapshot receipt finalizer。capture-time limits 在
排序或 descriptor traversal 前约束 collection、key/string、node/depth与 canonical bytes；每个
own-key vector只捕获一次，Promise/thenable同步 fail closed且不读取 `.then`。TDD red先证明缺失
module/public data type/authority registration；对抗 red随后捕获 post-hoc over-limit traversal、
双 own-key snapshot、超长 key preflight与合同外 Promise sink，均已收紧。focused为
`2 files / 49 tests`，affected Base为 `80/1032`，full unit为 `229/3379`，typecheck、
determinism guard与 `deno task check`全绿。Persistence/load/import、maintained migration owner、
Save bytes、canonical/digest、Session/CommandLog/replay与 Debug Bundle均未改变。下一独立切片为
M2c staged integration。

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

**2026-08-03 M2c promotion：** Core把 exact registry identity原样传入 Persistence；import与
stored load在 raw digest/State branch（以及 stored physical identity）之后解析完整 chain，
admit exact historical Snapshot shell并同步迁移 State。schema前 shell与 schema输出 full record
都经 bounded descriptor-safe detached/deep-frozen canonical capture，因此 permissive schema或
cross-field validator不能通过 alias改写非 State字段、绕过 limits或造成 stale digest。candidate
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
PF5/M3，而全局 linear core 下一切片是 `PF4/S3 System dialogs`。

## 6. M3 — Product surface and release corpus

- dry-run/inspect：不写入，按 slot 返回可直载、需 migration、需 adoption、拒绝及原因；
- 写入前备份：原记录进入可恢复位置或导出流，迁移后的记录才替换目标；
- adoption declaration set：支持多个历史 resolved provenance，替换单声明入口；候选可由 release tooling 生成，但必须人工确认；
- lineage policy：re-anchor 上限、触限提示、导出/回退路径；
- 用户文案：稳定 diagnostic code 映射为人类可理解的结果与操作，不直接展示内部 stack；
- maintained fixture corpus：Engine Lab + 旗舰示例，至少一条多版本链、一次 adoption、一次 lineage 边界与失败备份恢复；
- corpus 直接消费 M0a 的 `versionStamp` absent/all-null/partial/fixed full-clean/fixed
  full-dirty/status-unavailable/malformed/throw 与
  headless/browser fixed bytes，并逐版本证明 migration、annotation rewrite、
  autosave rotation 与 stored export 不覆盖 Snapshot capture origin；load/import
  compatibility 忽略 stamp，post-load/import fresh capture 使用当前 service
  stamp；
- Host export acceptance 以 M0a payload 为唯一 expected，固定同一秒重复 suggested
  filename，证明 Desktop/Browser 实际生成两个不覆盖文件，且各自 payload 等于
  shared corpus；不得另建 Host/Desktop Save golden；
- CI：对 corpus 全量执行 inspect → migrate → current schema/reference/invariant/digest → load → save round-trip。

**M3 acceptance：** design 的 release acceptance 全部满足；任何被声明支持的 revision 都有 fixture；不存在“代码声称支持但 CI 没有真实字节”的版本。

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
- migration 需要多个 runtime namespace/Mod ordering、skipped-revision shortcut、自动 State
  string rewrite、M3 backup/dry-run/durable history或产品 UI；
- receipt 必须进入 Save、Snapshot、CommandLog、replay identity、`simulationLineage` 或 M2
  Debug Bundle；
- 16-step mechanism bound不足以承载真实已承诺历史版本；
- package-internal prepare/no-throw commit无法实现，必须新增公开 universal transaction API；
- callback/invalid output只能通过让 Session进入 `fault_paused` 才能表达；
- maintained/released fixture要求不同 failure/migration semantics；
- real migration owner无法与 Host/Presentation closure分离，或只能靠 hard-coded path进入 lint。

## 10. Promotion record

每阶段记录：旧 bytes/红测试、load-order 变化、public contract、失败原子性、fixture revision、focused/aggregate checks、玩家路径、仍未支持的历史版本。M1–M2 只证明机制；M3 通过后才能在 `features.md` 宣称 Save migration 是发布能力。
