# Save migration execution plan

状态：2026-07-30 接受执行，审查后从 Snapshot 性能计划拆分；2026-07-31 按
M0a/M0b metadata ownership 与 PF-DET same-HEAD join 重切片；2026-08-03 M1 已
promotion，same-HEAD join 已关闭，下一独立切片为 M2。目标合同见
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
4. 按 stored format 验证 raw snapshot digest；未来任何会改写 snapshot 的
   format/State migration 都不得先于此步骤；
5. shell/digest 合法但 State revision 不同且尚无 executable chain 时返回明确
   unavailable；
6. current format + current State revision 才进入 current Snapshot schema parse，并对
   normalized current candidate 再验同一 `stateDigest`，禁止 schema default/normalization
   后安装与 stored digest 身份不同的 Snapshot；
7. current candidate digest 通过后再执行 compatibility/adoption、reference、invariant
   与 install。

M1 **严格 callback-free**：不创建 executable registry，不接受 migrator injection，
不执行 Story/engine migration callback，也没有“顺手注册一个 format migrator”的
逃生口。它只建立未来 M2 插入 format/State migration 的阶段边界。

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
历史 Save install 或 M2 placeholder；M1/DET-B same-HEAD join 据此关闭，下一独立切片为 M2。

## 5. M2 — Migration registry and new replay anchor

M2 的 DET-B/M1 same-merged-HEAD 前置 gate 已由上述 promotion 关闭；两边各自绿本来
不算完成，关闭证据同时覆盖 focused M0a/M0b/M1、shared Save bytes、
`deno task test`、`deno task check` 与 dedicated Deno/Chromium/Firefox/WebKit matrix，
并证明 executable migrator 不存在、callback count 为 `0`。M2 从该 joined baseline
首次引入下述执行能力。

### Registry contract

- 本切片首次建立 executable registry；M1 shell 没有隐藏 callback path；
- namespace-keyed；单应用使用 engine/application namespace，未来 Mod 可复用而不改管线；
- 每条 migration 只处理 `N -> N+1`；跨版本由 runtime 组合；
- 输入/输出是 plain bounded data；
- 禁网络、Host clock、随机、live Session 与 renderer；
- migration ID、from/to revision 和 content/reference rename map 可诊断；
- duplicate、gap、cycle、反向或歧义链在 authoring/build 阶段失败；
- registered migration source entry 进入 PF-DET 已建立的 authoritative
  import-closure lint 与 isolated tripwire，不靠文件名猜测或作者自觉；
- 每个真实 entry 在包含它的同一 HEAD 上 live recollect，并扩展四 runtime matrix；
  missing/gapped chain 保留 M1 的 `migration_unavailable` mapping；

### Execution

- 在隔离数据上执行完整链；
- current schema/reference/invariant 全部通过后才构造 candidate Snapshot；
- success 安装新的 replay anchor、current digest 与 migration lineage；旧 CommandLog 不跨 anchor 重放；
- failure 返回结构化 inspect/rejection，原 Save bytes 与 live Session 不变；
- migration 与 adoption 可依次出现，但诊断和授权分开。

### Required examples

Engine Lab 提供：

- N → N+1；
- N → N+1 → N+2；
- content ID rename；
- deleted ID 的显式 fallback/rejection；
- migration throw；
- illegal output；
- reference/invariant failure；
- migration success + adoption deny/allow；
- 同一一步/两步 migration vector 在 Deno、Chromium、Firefox、WebKit 使用 PF-DET
  test-only driver 得到相同 normalized output、diagnostic 与 digest。

**M2 acceptance：** 所有失败原子；同输入重复迁移得到同 bytes/digest；新 anchor
replay 自洽；migration registry/source 已进入 determinism static/tripwire
guard，四 runtime vector 全绿且缺 browser 不得 silently skip。

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
- migration function 不取得 arbitrary context；确需静态内容时只取得已 digest 的 read-only migration resources，并由设计先批准；
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

## 9. Stop conditions

- shell parse 需要放开当前 JSON size/depth/key 限额；
- migration 需要 live Session、网络、墙钟或随机；
- migration failure 已修改原记录或 authoritative state；
- migration 与 adoption 无法在结果中区分；
- fixture 依赖 `tmp/**`、`references/**` 或未发布复刻；
- current schema validation 仍在 migration 之前执行；
- M1 必须接受或执行 executable migrator 才能建立 shell/load order，或 M2 想在
  DET-B/M1 same-HEAD join 前开始；
- 实现需要静默改变已接受 design。

## 10. Promotion record

每阶段记录：旧 bytes/红测试、load-order 变化、public contract、失败原子性、fixture revision、focused/aggregate checks、玩家路径、仍未支持的历史版本。M1–M2 只证明机制；M3 通过后才能在 `features.md` 宣称 Save migration 是发布能力。
