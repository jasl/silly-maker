# Save migration and load compatibility

状态：2026-07-29 接受的目标设计，2026-07-31 按 callback-free shell、shared
metadata corpus 与 determinism join 修订；2026-08-03 M1 callback-free
shell/load-order floor 已实现，并冻结 M2 为 single-namespace、State-only executable
migration；M2a exact registry/Core current-identity admission、M2b bounded pure
execution kernel、M2c staged Persistence integration 与 M2d atomic replacement/
Session receipt lifecycle 已实现；2026-08-04 M2e real-owner/four-runtime promotion
已实现；2026-08-12 M3.0 docs-only exact entry 与 M3.1 read-only inspection
均已完成，M3.1 已转为 historical slice；M3.2 adoption declaration set 现也已完成并转为
historical；M3.3 same-namespace bounded backup repository substrate 现也已完成并转为
historical；M3.4 upgrade/re-anchor and backup-resolution operations 现也已完成并转为
historical；M3.5 player-readable Save recovery UI 现也已完成并转为 historical；M3.6.0
docs-only exact inventory corrective 与 M3.6a maintained product corpus and Story lifecycle
现也已完成并转为 historical；M3.6b four-runtime corpus parity、M3.6c Browser
repeated-download no-clobber evidence 与 M3.6d live product docs/PF5 promotion 也已完成并转为
historical，PF5/M3 已关闭。其后的 PF6/S5 historical pointer 已由当前
[production-floor sequence](../plans/2026-07-30-production-floor-sequence.md)
中的 Complexity Reset supersede。
本文把 Save
兼容从“分类与拒绝”升级为“一等迁移能力”：固定 migration registry 合同、load
阶段顺序与发布验收。它独立于 Mod 系统并先于其落地；[Mod design](mod-system.md)
第 8 节的 per-namespace migration 建立在本文的引擎级合同之上。当前实现状态见
[features](../features.md)；本文明确区分已支持的 fixture-backed identity 与未声明的历史
兼容范围。迁移函数属于
[authoritative simulation determinism boundary](deterministic-simulation-boundary.md)
定义的 Authoritative Simulation。

## 1. Current state and gap

现有基础已经可靠：

- Save 是 plain、versioned、validated data：`SaveRecordEnvelopeV1` 携带
  `formatRevision`、`recordRevision`、provenance、`stateDigest`、`snapshot` 与
  `simulationLineage`，并可携带 bounded `annotation`（Story-projected summary
  与 player note）及 bounded diagnostic `versionStamp`（Snapshot capture-origin
  build；不参与 compatibility/authoritative identity）；
- 解码入口有 Strict JSON 字节/深度/节点限额（`saveJsonLimitsV1`）；
- `classifySaveCompatibilityV1` 以 story identity、state contract
  revision/digest、engine digest 与 simulation digest 分类为 exact / adoption /
  inspect_only / rejected；adoption 有显式声明与 lineage 上限；
- load 后仍执行 reference 与 invariant 验证。

M1 已把 current-format admission 拆为 bounded shell/raw digest、State revision
fence、current Snapshot schema/normalized digest，再进入 compatibility、reference 与
invariant；stored load 在 Story validation 前另做 Host revision 与 slot identity
检查。State revision 不同时先进入 callback-free pending branch：M2c 对 import/load 的
exact configured chain 执行迁移；缺失或不完整 chain 才在 current Snapshot schema 与 Story
callback 前返回 `migration.unavailable`。两条分支都保留来源 bytes，失败不修改 live Session。

M2e 已闭合 executable migration 的 maintained conformance owner 与跨运行时 promotion；
剩余缺口是产品发布语料与恢复面：

1. M2c 已把 exact registry 接入 import/load staged admission，能够迁移后经 current
   schema/digest/compatibility/reference/invariant validation，并使用既有 replay-anchor
   replacement；Engine Lab 现维护 revision 3/4 到 current revision 5 的相邻迁移 owner，
   list/export/annotation 仍有意不执行 callback；
2. successful migrated replacement 已由 Session 安装 non-durable receipt；ordinary command、
   Save capture 与 CommandLog eviction 保留 exact receipt，无 receipt replay-base replacement
   清除它。Session/Persistence/CommandLog/autosave 通过 package-internal prepare/no-throw
   commit/post-commit token 原子换锚，不把 transaction API 或 receipt accessor 暴露给 Story；
3. Engine Lab 的中性构造 workload 不是发布级历史 Save byte fixture；仍没有产品历史
   fixture corpus，也没有“任意受支持旧 Save
   可迁移、可加载”的发布验收。

在 M3 之前，maintained product 仍不能兑现旧存档迁移与加载承诺；当前 engine
能力只在 application 显式提供 exact registry 时启用，且不会写回来源数据。Engine Lab
owner 是机制的 conformance consumer，不把其历史 identity 自动提升为产品支持策略。
Engine Lab 历史中曾存在一个与 current 同为 State revision 5、但早于 placement opacity
字段的不同 digest；它不在当前 maintained corpus。M2 的相邻 revision chain 不得把这个
same-revision identity伪装成 migration edge或 adoption。若 M3 发现真实 released fixture
需要支持它，必须停止并定义显式 recovery/migration 决策。

## 2. Target load order

```text
bounded strict JSON decode        （现有 saveJsonLimitsV1 限额保持不变）
  -> exact outer fields + format decision
  -> current-format envelope shell parse
                                   （recordRevision、provenance、
                                    slot、savedAt、stateDigest、simulationLineage、
                                    bounded annotation、bounded versionStamp；
                                    snapshot 保持受限 raw 结构）
  -> format-specific raw snapshot digest verification
  -> engine-owned envelope format migration （reserved/deferred；M2 不启用）
  -> identify stored provenance and schema revisions
  -> ordered pure State migrations （state contract revision N -> N+1，M2 起启用）
  -> current snapshot schema validation
  -> normalized current snapshot digest derivation/admission
  -> compatibility classification  （exact / adoption / inspect_only / rejected）
  -> reference and invariant validation
  -> atomically install one new replay anchor
```

outer field set validation 必须先于 format decision；合法但不受支持的
`formatRevision` 必须先于任何 current-format-only shell field validation 被拒绝，不能
拿当前 schema 解释未知 format。M1 已把 current snapshot schema 验证从原 M0b
full-decoder 前置位置移到 raw digest 与 State revision fence 之后；解码的第一阶段只解析
current-format envelope 外壳字段，snapshot 保持为受限 raw 数据。M2 才会在这两个阶段间
启用图中的 migration node。

这也明确改变一组 compound-failure precedence：M0b baseline 先解析完整 current Snapshot
schema、trailing envelope fields 与 cross-field identity，再验证 digest；目标顺序在
shell 成功后先验证 raw snapshot digest，并把 current Snapshot admission 移到其后。
因此所有实际跨越这些 phase 的双缺陷输入都按目标 phase 顺序裁决，而不是只豁免一个
schema 例子。至少维护 Snapshot-schema + digest、zero-RNG + digest、zero-RNG + invalid
trailing shell field、cross-field + digest 四类代表 vector；合法、单缺陷及未受 phase
移动影响的 current-format 结果仍须逐字段回归 M0b。

M1 只交付 callback-free shell、raw-digest verification 与上述 phase ordering；当
shell/digest 合法但 State revision 不同，它返回 `migration.unavailable`，不执行
图中的 migration node。M2 在完整 determinism guard 与 M1 same-HEAD join 后只建立
State migration registry 并启用 State node。Envelope-format node 保留其目标顺序但在
M2 中不活跃；`formatRevision !== 1` 继续由 format decision 返回
`envelope.unsupported_revision`。

要点：

- raw snapshot
  在迁移前只是受限结构数据，不被信任；既有字节/深度/节点/字段限额继续适用，不为迁移放开输入；
- envelope format（`formatRevision`）与 State schema（state contract
  revision）是两条独立迁移轴：前者未来由 engine-owned migration 处理，后者由应用
  声明；二者不共享一个模糊 registry。M2 只实现后者，且只接受当前 revision-1 outer
  envelope 与 engine-owned `{ state, rng, commandSequence, integrity }` Snapshot shell。
  第一次真实 envelope 演进必须另开切片，先定义 historical shell、raw-digest domain、
  metadata shape、output format、byte corpus 与 revision progression；
- `annotation` 是 envelope persistence metadata，不是 authoritative State。
  State migration 默认原样保留且不得读取、生成或改写它；只有明确的
  engine-owned envelope format migration 可以转换 annotation shape，并必须为
  absent、summary、note 与 cleared-note 提供 byte/semantic corpus；
- 目标 `versionStamp` 是 bounded presentation/runtime persistence metadata，记录
  Save candidate 中 Snapshot 的 application/engine capture origin。它会改变
  envelope bytes，但不参与 Snapshot/`stateDigest`、compatibility、adoption、
  authoritative identity、CommandLog 或 replay。State migration、annotation
  rewrite、rotation 与 stored-record export 默认原样保留；不得用运行 migration
  或 export 的当前 build stamp 覆盖。load/import compatibility 不读取 stamp，
  post-load/import fresh capture 使用当前 service stamp，不传播旧 envelope
  metadata。absent/all-null、malformed 或 collector throw 规范化为 field absent；mixed
  malformed fields 逐字段丢弃后可形成 partial stamp，partial/full 经 bounded
  printable normalization 与 copy，且不调用 getter；得到的 typed value 按普通
  JavaScript 运行时语义使用，不再递归 freeze；
- `stateDigest` 校验对象是存档原文的 snapshot，并在 envelope shell parse
  之后、任何会改写 snapshot 的 format/State migration 之前完成；verifier 由已解析的
  stored `formatRevision` 选择。Envelope format migration 默认只能改外壳；若历史格式
  必须转换 snapshot 表示，它只能在原始 digest 已验证后执行，并同时产生新的 Snapshot、
  digest 与 lineage 记录。迁移绝不在完整性未证实的数据上运行；
- current State revision 的 raw digest 通过后，current Snapshot schema 仍可能通过
  default/normalization 产生不同 canonical candidate；安装前必须再次验证 normalized
  current Snapshot 的 digest 等于 stored `stateDigest`。该失败使用独立、公开的
  codec/validation-layer rejection code `digest.normalized_state_mismatch`，Player-facing
  mapping 仍为 `invalid_record`，且发生在 compatibility 与任何 Story
  reference/invariant callback 前，因此这些 callback count 精确为 `0`。raw
  verification 保护 migration 输入，normalized-current verification
  保护最终 authoritative identity，二者不能互相替代。真正执行 State migration 的后续
  路径不拿迁移后的 candidate 与 pre-migration stored digest 比较，而是由 engine 对
  normalized migration output 派生新 digest，作为新 replay/Save anchor 的 identity；
- 可预期的 candidate validation/migration failure 留下原 Save 数据不变，结果是结构化
  rejection 或 inspect_only，不存在半迁移状态；callback throw 与可预见的 replacement
  prepare failure 返回 faulted/preserve 且 Session 保持 `ready`。只有 package-internal
  no-throw commit protocol 的意外 invariant failure 才允许进入 `fault_paused`。失败不得安装部分
  Session、替换 replay anchor、
  推进 lineage 或 autosave anchor；成功结果只能在完整 current candidate 通过
  schema、compatibility、reference 与 invariant 后一次性发布。短暂 busy、结构化
  diagnostics/failure status 以及 unexpected internal fault 的 `fault_paused` 不属于
  authoritative State mutation；
- stored load 在 codec/digest 后还验证 physical Host revision equality 与
  story/slot/write-reason identity；import 没有 physical Host identity。结构化失败指该
  操作不发起或提交 Save write 并保留来源 record，不能据此禁止先前已在途的 autosave
  合法完成；
- `recordRevision` 是 Host 每槽 CAS/write revision，不是 envelope-format 或 State
  migration revision。非法值属于 schema failure；stored Host revision 与合法 envelope
  值不一致属于 repository integrity failure；无 physical revision 的 import 接受任意
  positive-safe 值且不执行该比较。
- 上述 load/import/inspection/migration rejection 的来源保留合同不把显式 fresh player
  Save 变成 migration。玩家选择 `quick` 或 numbered manual slot 保存时，旧 Save payload
  不是新 candidate 的输入；只要 Host record 与 revision 可读、下一 revision 合法，写入就以
  observed Host revision 和同一 session lease touch 做原子 CAS replacement。该 destructive
  replacement 同样适用于当前 decoder 分类为 malformed、identity/revision invalid 或
  unsupported/future format 的 payload；它不备份、迁移或采用旧 bytes。candidate encoding、
  lease/fence 或 CAS loser 等 pre-commit failure 必须保留旧 raw record；CAS 已提交后的
  readback failure 沿用既有 non-success/repair 语义，不伪装成已回滚。load、stored export 与
  annotation rewrite 继续 fail closed，clear 仍是独立的显式 recovery action；Host backing
  自身不可读不在此 allowance 内。

### Phase and corpus ownership

- Save M0a 是 annotation/summary/note、`summarizeSave`、`versionStamp`
  normalization/preservation 与 exact bytes 的唯一 maintained corpus owner；
- determinism DET-B 拥有 projector/migrator authority closure、ambient negative
  controls 与 M0a compact vectors 的跨 runtime equality，不复制 Save lifecycle
  golden；
- Browser Host 拥有 download request/event 与 payload bytes；测试选择不同临时路径，不宣称
  JavaScript 控制最终 suffix。Desktop 的真实 filename collision/no-clobber 与 process-crash
  durability 只有 PF-D promotion 后才能声明；D4 只消费同一 payload/build receipt 验证
  package integration，不重复 Save migration matrix；
- 两个执行 lane 共用的 testkit seam/public export 必须在 fork 前合并；M0b/M1 只改
  Base Save codec/load order/result contracts，DET-B 只改 collector/driver/browser/CI。

### M2 scope and precedence

M2 的完整范围固定为：一个 application、一个显式 aggregate-State namespace、同步相邻
State migration、非持久化 replacement-origin receipt；不做 Save 写回、format migration、
M3 产品 UX、durable history 或 Mod migration。State migration 只替换
`snapshot.state`，保留 RNG、command sequence、integrity、annotation、`versionStamp`、
`savedAt`、record revision 与 slot metadata。

共同 admission 先后为 Strict JSON/limits、exact outer fields/format decision、revision-1
shell、raw Snapshot digest、State-revision branch selection。current-revision branch 保持 M1
顺序。migration branch 对 stored load 先验证 Host revision/slot identity（import 无此
phase），随后按下列顺序裁决；更晚阶段不得覆盖更早失败：

1. complete chain/source identity；缺失或不完整返回 `migration.unavailable`，callback 为 `0`；
2. historical engine-owned Snapshot shell；非法返回 `envelope.schema_invalid`；
3. each synchronous callback；显式拒绝为 `migration.rejected`，throw 为
   `migration.callback_threw`；
4. callback result 的普通 discriminant/field admission 与 per-step canonical/limit admission；
   缺失/非法 union、非法 reason code、non-canonical 或 over-limit output 均为
   `migration.output_invalid`；
5. final current Snapshot/RNG/schema 与 migrated digest derivation；
6. compatibility/adoption、references、invariants；
7. replacement prepare，然后执行不可抛错、无 publication 中间态的 logical commit。

`migration.rejected` 与 `migration.output_invalid` 在 Player 层统一映射
`migration_rejected`；`migration.callback_threw` 保持 faulted code，不暴露 callback
message、stack 或 cause。post-migration current schema/RNG/reference/invariant 与 adoption
failure 沿用既有 code/mapping。失败结果可以携带 immutable migration attempt（已完成 steps、
failing step/phase、可用时的 final migrated digest），但 partial attempt 永不安装。

raw digest mismatch 优先于 missing chain；stored Host/slot identity mismatch 优先于 chain；
missing chain 优先于 historical State/body interpretation；callback reject/throw/illegal output
优先于所有后续 validation；migration success 后才允许产生 compatibility exact/adopted/
inspect-only 结果。

上述 precedence 要求 package-internal protocol 显式拆为：resolve exact non-empty chain →
M2c historical Snapshot shell admission → execute State callbacks → M2c reconstruct/validate final
Snapshot并派生其 digest → finalize receipt。M2b executor只返回 detached admitted migrated State与
opaque completed path；它不能读取 RNG/commandSequence/integrity，也不能把 State-only digest
冒充 receipt 的 `migratedStateDigest`。M2b 提供的 pure receipt finalizer必须由 M2c 传入最终
normalized whole-Snapshot digest。

## 3. Migration registry contract

Executable registry 从 M2 才存在。M2 的标准 Core 只允许零或一个 factory-produced exact
registry；namespace 由 application/Story 显式声明，不能从 Story ID 推导。它只表示一个
aggregate gameplay-State namespace，不建立多 namespace execution order、Mod namespace、
per-module revision 或 partial State installation。

概念合同（字段语义固定，文件拆分可以调整）：

```ts
interface SaveStateContractIdentityV1 {
  readonly stateContractRevision: PositiveSafeInteger;
  readonly stateContractDigest: Digest;
}

interface SaveStateMigrationStepIdentityV1 {
  readonly migrationId: SaveStateMigrationIdV1;
  readonly from: SaveStateContractIdentityV1;
  readonly to: SaveStateContractIdentityV1;
}

type SaveStateMigrationStepResultV1 =
  | { readonly kind: "migrated"; readonly state: StrictJsonValueV1 }
  | { readonly kind: "rejected"; readonly reasonCode: SaveStateMigrationReasonCodeV1 };

interface SaveStateMigrationReferenceChangesV1 {
  readonly renames: readonly {
    readonly referenceSetId: string;
    readonly fromId: string;
    readonly toId: string;
  }[];
  readonly deletions: readonly {
    readonly referenceSetId: string;
    readonly id: string;
    readonly resolution:
      | { readonly kind: "fallback"; readonly toId: string }
      | { readonly kind: "reject"; readonly reasonCode: SaveStateMigrationReasonCodeV1 };
  }[];
}

interface SaveStateMigrationStepV1 {
  readonly migrationId: SaveStateMigrationIdV1;
  readonly namespace: SaveStateMigrationNamespaceV1;
  readonly from: SaveStateContractIdentityV1;
  readonly to: SaveStateContractIdentityV1;
  readonly references: SaveStateMigrationReferenceChangesV1;
  readonly migrate: (
    state: DeepReadonly<StrictJsonValueV1>,
  ) => SaveStateMigrationStepResultV1;
}
```

要求：

- registry 由唯一 public factory 构造，规范化 declaration 存于 package-owned private
  brand/`WeakMap`；spread、decorate 或手写伪对象 fail closed；Core 配置的 registry 与
  determinism authority owner export 必须是同一个 exact object；
- registry 声明 namespace、minimum/current State contract identity 与相邻 steps；单次
  chain 最多 16 steps，identifier/reason code 最多 128 UTF-8 bytes；
- namespace、migration ID 与 reason code 使用 ASCII lowercase stable-token grammar：首字符
  为 `a-z`，后续只允许 `a-z`、`0-9`，或由 `.`/`_`/`-` 分隔的非空 segment；长度为
  1..128 UTF-8 bytes。reference set/source/target ID复用现有 State-contract stable-ID
  admission。factory按 `(referenceSetId, sourceId)` 的 code-unit order规范化映射，拒绝同源
  rename/delete冲突、duplicate source、self rename、delete无 exact fallback/reject resolution；
  target是否存在于 current manifest留到 Core/runtime binding验证，不在 M2a猜测；
- 每步严格 `N -> N+1`；首步等于 minimum、末步等于 current、相邻 identity 完整衔接，
  migration ID/from identity 唯一。duplicate、gap、reverse、cycle、shortcut、ambiguity、
  current target mismatch 或超限在 factory/application resolution 阶段失败；
- valid `minimum === current` 使用空 steps；runtime 在第一个 callback 前解析出完整、唯一、
  bounded chain；stored identity 低于 minimum或不匹配声明 source identity仍返回
  `migration.unavailable`；
- 每步迁移是同步纯函数、确定性、禁网络、禁时钟、禁随机；
- migration registration 的 source entry 必须进入已经落地的 authoritative
  import-closure static guard 与 isolated test tripwire；“文档写着 pure”不能替代
  可执行 evidence；
- migrator 只接收 raw-digest-verified historical Snapshot 的 `state`；package-owned canonical
  encoding 与 Strict JSON parser 对 historical State 和每步 migrated output 各执行一次
  canonical/limits admission，并交付 detached plain data。callback result 使用普通 JavaScript
  discriminant/field 读取；无同步合法 union 的 Promise、缺失字段与非法 reason code fail closed，
  但不做 prototype、descriptor、accessor 或 exact-key authenticity 认证，也不把额外字段当成
  authority。runtime 不递归冻结 State；`DeepReadonly` 是受支持用法，callback 若绕过类型约束
  修改已交付对象，后果由 callback 自身承担。kernel 不 await，也不读取或调用 arbitrary
  `.then`；每个成功 output 在交给下一步前重新 detached admission，因此 callback 持有的 raw
  input/output alias 不能在返回后改变后续 migrated State；
- callback 不接收整个 Save、arbitrary context、Host、Session、clock、RNG、network、
  renderer、database 或 mutable resource client；
- content/reference rename/delete 是显式、可验证的 declaration 与诊断义务，不是 engine
  对任意 State string 的自动替换。delete 必须声明 fallback target 或 stable rejection
  reason；callback 负责语义转换，最终 reference validator 负责证明结果；
- migration 与 adoption 是不同物：migration 转换 State；adoption 声明“旧 State
  无需转换即可被新 Simulation 接管”。二者都不能用宽泛 semver 猜测（与
  [Mod design](mod-system.md) 第 8 节一致）；
- CommandLog 兼容轴独立管理：迁移安装新 replay anchor，旧命令日志不跨迁移重放。

### State migration receipt and provenance

`SaveStateMigrationReceiptV1` 描述“当前 Session 由哪一次显式 migrated load/import
replacement 建立”，包含 namespace、source/target State identity、ordered step identities、
source raw-Snapshot digest 与 final migrated-Snapshot digest。它是 immutable package data，
只记录本次完整 path，不是累计 history，也不声称跟随 CommandLog retention 推进的
`replayBase()`。

```ts
interface SaveStateMigrationReceiptV1 {
  readonly namespace: SaveStateMigrationNamespaceV1;
  readonly source: SaveStateContractIdentityV1;
  readonly target: SaveStateContractIdentityV1;
  readonly steps: readonly [
    SaveStateMigrationStepIdentityV1,
    ...SaveStateMigrationStepIdentityV1[],
  ];
  readonly sourceStateDigest: Digest;
  readonly migratedStateDigest: Digest;
}

type SaveStateMigrationFailurePhaseV1 =
  | "snapshot_shell"
  | "callback"
  | "callback_rejected"
  | "result_envelope"
  | "output_admission"
  | "current_snapshot_schema"
  | "compatibility"
  | "references"
  | "invariants"
  | "replacement_prepare"
  | "replacement_commit";

interface SaveStateMigrationAttemptV1 {
  readonly namespace: SaveStateMigrationNamespaceV1;
  readonly source: SaveStateContractIdentityV1;
  readonly target: SaveStateContractIdentityV1;
  readonly sourceStateDigest: Digest;
  readonly completedSteps: readonly SaveStateMigrationStepIdentityV1[];
  readonly failingStep: SaveStateMigrationStepIdentityV1 | null;
  readonly failingPhase: SaveStateMigrationFailurePhaseV1;
  readonly migratedStateDigest: Digest | null;
}
```

`migratedStateDigest` 在 failure attempt 中只有完整 chain 已产生、且 current schema 已把
final Snapshot 规范化后才非空。attempt 只描述失败操作的已完成 path，不安装为 Session
receipt，也不改变之前已安装的 receipt。

receipt 不进入 Save、Snapshot、`stateDigest`、CommandLog、replay comparison、
`simulationLineage`、BuildIdentity、compatibility identity 或 M2 Debug Bundle wire。低层 runnable
`SaveImportValidationResultV1` 的 exact/adopted success 携带正交的
`migration: SaveStateMigrationReceiptV1 | null`；migration 后再 adoption 是合法组合。
Player `PersistenceOperationResultV1` 的 success shape 不暴露 receipt，`compatibility` 表示
migration 后的 compatibility outcome。

M2c 的 `migration.rejected`、`migration.output_invalid` 与
`migration.callback_threw` 是 engine-owned orthogonal result branches，不加入 Story
compatibility callback可返回的 `ImportRejectionCodeV1`；否则 Story可以伪造 migration
failure并破坏 phase authority。

成功 migrated replacement 原子安装 receipt；ordinary command、Save capture、CommandLog
eviction 与 presentation epoch 不清除它。fresh construction/restart、current-revision
load/import、debug fixture/debug-bundle replacement、fresh paired Session/Persistence
composition（包括 Core rebootstrap successor），以及任何不携带 receipt 的显式 replay-base
replacement 把它清为 `null`。在同一 Session 上单独构造另一个 Persistence service 不是
successor，也不改变 Session-owned receipt。失败保留此前 receipt identity/value。

State migration 只把 candidate provenance 的 `resolved.stateContractRevision` 与
`resolved.stateContractDigest` 提升到 current identity；Story、engine、simulation、
presentation、patch-set axes、existing `simulationLineage` 与 persistence metadata全部保留
stored 值，再执行既有 compatibility/adoption。因此 migration 不得以 current provenance
整对象覆盖绕过 Story/engine/simulation mismatch。

### Atomic replacement

M2 使用 package-internal prepare/commit，不把公开 `GameSessionRuntimeControlV1` 扩张成
通用 transaction-participant framework。prepare 在任何 mutation 前完成 final validation/
digest、empty CommandLog/replay anchor、next ordinal、lineage copy、receipt admission/capture、
autosave next-epoch admission、repair/bookkeeping plan、lease fence 与
所有 allocation；不得清 map、推进 epoch、调用 Host write/observer/Story callback 或发布
Snapshot。

commit 只安装预计算值：Persistence lineage/autosave anchor bookkeeping/safely-saved anchor、
CommandLog replay base/digest/empty entries/next ordinal，以及 Session Snapshot/digest/status/
Session-owned receipt。commit 不做 validation、digest、integer increment、allocation、callback、
Host I/O、Promise creation 或 observer publication。

全部 authoritative owner commit 完成后，Session 只在 listener notification 窗口暴露预分配、
Session-bound 的 opaque publication context，发布 Session listener并立即撤销 context；随后调用
throw-isolated observational `onReplacementCommit`，最后安排 post-commit autosave repair/write。
publication context 是 origin attribution，不是另一个 authority、callback或 durable state。
JS 单线程下的 atomic 指同一 queue turn 中无可观察中间 authoritative publication，且 validated
token 的 commit path 结构上不抛错。

该 composite guarantee 的边界是 repository-owned GameSession/Core/Persistence composition，
以及保留 exact replacement outcome identity 或 exact package prepare-callback identity 的透明
wrapper。公开的低层 `GameSessionRuntimeControlV1` 仍允许自定义实现；若 wrapper 同时重建
outcome 并替换 prepare callback，使所有 package-internal attempt carrier 都丢失，它只保留
既有 current-revision、`migration: null` 的 legacy callback path，不获得 M2 composite
atomicity 承诺。extension/custom caller显式提供 legacy `prepareReplacementCommit` 时同样主动
离开 composite path；该 escape hatch只支持 current-revision、`migration: null` 语义。
migrated replacement 在这些路径必须于 authoritative Snapshot/replay/Persistence mutation 前
fail closed，不能伪造 success；由于它已越过 package-owned protocol admission，Session status
可以转为 `fault_paused`，不得表述为普通 package prepare failure 会保持 `ready`。不得用
public universal participant API 扩张这个边界。

## 4. M3 product surface exact contract

- **M1 unavailable contract（已实现）**：shell/digest valid、State revision 不同但没有完整
  forward chain 时，internal staged validation 返回
  `{ kind: "inspect_only", code: "migration.unavailable", storedStateContractRevision,
  currentStateContractRevision }`，ordinary Player load 返回
  `{ kind: "rejected", code: "migration_unavailable" }`。Unsupported envelope
  format、raw digest mismatch 与 current-revision schema invalid 保持各自更早的
  rejection；State revision decision 先于 compatibility，因此 Story ID mismatch 与
  State revision mismatch 同时存在时仍为 `migration.unavailable`，相同 State revision
  的 Story mismatch 才保留既有 `inspect_only`/player `incompatible`。此结果不写
  record、不安装 Session、不替换 replay anchor；M3.1 public `inspectSave` 将同一结果投影为
  `{ kind: "inspect_only", code: "migration_unavailable" }`；
  以下 M3.0 合同已冻结；4.1–4.4 的 runtime capability 已随 M3.1–M3.4 实现，4.5 的
  player-readable UI 与 browser path 已由 M3.5 交付；maintained corpus、Browser evidence 与
  live-doc promotion 已由 M3.6a–M3.6d 交付并关闭 PF5。

### 4.1 Read-only inspection（已实现；historical slice）

M3.1 只增加 `PlayerPersistencePortV1.inspectSave(slotId)`，检查一个合法配置槽位；不增加
all-slots/aggregate convenience，也不改变 `listSlots()`。调用者若需检查多个槽位，必须按
已配置 slot list 逐个调用并保留每项结果；引擎不提供会 short-circuit、聚合 authority 或
隐藏 per-slot fault 的第二入口。每次结果都是 defensively copied/frozen 的
`SaveInspectionResultV1`，exact kind 为：

- `direct`：无需 State migration 或 adoption，可由普通 load exact 接受；
- `migration_required`：完整相邻 State chain 已成功执行，current validation/compatibility
  为 exact，结果携带 migration receipt；
- `adoption_required`：无需 State migration，现有单个 declaration exact match，结果携带
  adoption；M3.2 才把该入口提升为 set；
- `migration_and_adoption_required`：完整 State chain 成功后只有 simulation digest
  mismatch，现有单个 declaration exact match；结果同时携带 migration receipt 与 adoption；
- `inspect_only`：bytes 已完成适用的 bounded admission、但当前 build 没有 runnable 普通
  load 路径；code 只能是 `migration_unavailable | incompatible | reanchor_required`；
- `rejected`：code 只能是 `empty_slot | unavailable | invalid_record |
  migration_rejected`；shell/digest/schema/reference/invariant rejection 统一向 player boundary
  投影为 `invalid_record`，migration explicit reject/output invalid 投影为
  `migration_rejected`，细分原因只留在 bounded diagnostics；
- `faulted`：unclassified Host/repository throw、migration callback throw 或其它不可归因于
  Save bytes 的运行故障；已分类的 Host unavailable 必须是 `rejected/unavailable`，不能因
  adapter 不同漂移成 fault。

每个非 `faulted` 结果使用 bounded stable code、stored/current State revision、migration
attempt/receipt、adoption 与 warnings 的适用子集；不返回 raw/candidate Snapshot、Host
revision/bytes、stack、callback error、lease fence、commit capability 或可在稍后重放为 load
的 token。`faulted` 也只暴露稳定 code，不暴露 stack 或任意 thrown value；其 `slotId` 为
`SaveSlotIdV1 | null`，合法 slot 的运行故障保留该 slot，invalid programmer slot 返回
`null`，不得把未验证输入回显为 typed slot。

普通 `listSlots()` 保持 M2 **migration-callback-free** summary：State migrator execution count
固定为 `0`，同时保留 M1/M2 已有 stored admission 与适用的 Story/reference/invariant
validation，不把“callback-free”扩大解释为跳过这些既有验证。显式 inspection 执行与真实
load 相同的 bounded raw-read/shell/digest 阶段，并在 State revision 不同时同步执行已配置的
纯 migration callback，随后执行 current schema/digest、compatibility/adoption、reference 与
invariant validation。该运行每次从当前 Host bytes 重新开始；inspection 是 **零写入、零
Session mutation**：不 commit/delete record，不创建 backup，不 touch
lease，不 enqueue/prepare/commit replacement，不安装 replay anchor/receipt，不改变
Persistence status/clock/export，也不复用此前 inspection candidate。

**2026-08-12 M3.1 delivery：** single-slot `inspectSave` 已按上述 exact union、fault
projection 与零 mutation 边界交付；后续 Complexity Reset 删除了无必要的 defensive
freeze，而没有改变 inspection data 或 authority。真实 mutation RED 在实现前产生 `7`
个失败，随后同一 focused suite 转绿；完整 promotion matrix 记录在 owning plan 第 6 节。
M3.1 现为 completed/historical；其 delivery 当时把实现指针推进到 M3.2，该 historical
pointer 已由 M3.2 delivery 关闭。

### 4.2 Adoption declaration set（已实现；historical slice）

M3.2 把单个 `adoptionDeclaration` 替换为 application composition 在启动时显式提供的
`adoptionDeclarations` 有限集合，长度固定为 `0..256`；official configuration admission 在
任何 Host I/O、classifier或runtime allocation 前拒绝第 257 项。每个 declaration 仍使用
既有七字段 identity：
`storyId`、`storyRevision`、`stateContractRevision`、`stateContractDigest`、
`fromSimulationDigest`、`toSimulationDigest`、`simulationPatchSetDigest`。实现一次读取、
校验与一次 ordinary copy，并按这七字段组成的 canonical tuple 建只读 lookup；
数组顺序不参与结果，也没有“first match wins”。

只有 compatibility mismatch 恰为 `simulation_digest`，且 declaration 的七字段与
stored/current resolved identity 全部相等时才算 match。零个 match 保持 `inspect_only`；
一个 match 产生 adoption candidate；多于一个 match 必须以稳定
`compatibility.adoption_ambiguous` rejected。official application admission 在任何 Host I/O
前拒绝 over-limit与duplicate tuple，classifier 仍保留多-match fail-closed 防线。
declaration 只来自
明确支持且有 maintained fixture 的发布 identity；不扫描依赖、源码树、Git 历史或仓外
材料，不自动猜测/生成兼容关系。

**2026-08-12 M3.2 delivery：** application/Core、Persistence service/classifier 与 Engine Lab
现统一消费上述 maximum-256 immutable exact seven-field set。实现前的真实 RED 证明旧
classifier 仍读取 singular `adoptionDeclaration` property 并使 focused suite 失败；随后
descriptor-safe pre-I/O admission、`0 / 1 / >1` match、stable ambiguous rejection、permutation、
10,000-attempt boundedness 与跨 Core/Service/Engine Lab 路径均转 GREEN。完整 promotion matrix
记录在 owning plan 第 6 节。M3.2 现为 completed/historical；其当时推进到 M3.3 的
historical pointer 已由 M3.3 delivery 关闭。

### 4.3 Bounded backup and restore（M3.3–M3.4 已实现；historical slices）

M3.3/M3.4 只复用现有 `"save"` Host namespace 和 `HostAtomicRecordStoreV1`，不得增加
namespace、数据库、unbounded history 或通用 transaction API。每个 Story/slot 至多一个
package-internal backup record，固定 key 为：

```text
save-migration-backup.v1:${encodeURIComponent(storyId)}:${slotId}
```

`createSaveMigrationBackupRecordKeyV1` 与现有 slot parser 共同验证 Story/slot；backup value
是受既有 Save byte limit 约束的迁移前 exact raw target-record bytes，不重编码、不追加
metadata。backup bytes 内嵌的 `recordRevision` 属于原目标 slot capture，不等于 backup-key 的
Host revision；restore/export 不得把 backup 当普通 slot 执行 target Host revision equality
检查。
一次 upgrade/re-anchor commit 只允许在 backup key 不存在时执行，并必须在同一个 Host CAS
中：以 `expectedRevision: null` put 原始 backup，以目标 slot Host revision put 新 Save，并
touch 当前 lease。任一 expected revision conflict/Host failure 均为全无；目标、backup、
lease 不得部分改变。若 backup 已存在，新 upgrade/re-anchor 在 migration callback 与任何
write 之前返回 `backup_pending`；不得 silent overwrite，也不得用“取最新/最旧”猜测 owner。

retention 固定为一个显式 pending generation：普通 quick/manual Save、Auto rotation、clear、
annotation rewrite、启动、inspection、list/load/import/export current record 与失败尝试均不
覆盖或删除 backup。它一直保留到玩家显式选择 `restoreBackup` 或 `discardBackup`；
`exportBackup` 只导出 exact raw backup bytes，成功或失败都不删除/消费 backup，因为 download
request 不能证明用户已持久保存；Persistence 返回 defensively copied `ExportedSaveV1`，Web
再发 download request，二者都不 touch lease。每 Story/slot 的记录数仍为常数，但新 migration
会被 pending backup 阻止。`discardBackup` 只以 backup revision + current lease CAS 删除
backup，不触碰目标 slot。

restore 由持有当前 lease 的 Persistence service 独占；Story/UI 不取得 raw store、key、bytes
或 CAS revision。`restoreBackup` 每次重读 target（可为空）、backup/lease，对 backup 做
bounded shell/raw digest admission及 Story/slot/writeReason identity validation，但跳过普通 slot
的 embedded recordRevision == backup Host revision 检查；随后以 live target 的下一
`recordRevision` 重编码恢复内容，
并用一个 CAS put target、delete backup、touch lease。stale target/backup/lease、invalid backup
或失败 commit 不覆盖任何记录。成功 restore 只恢复持久 slot 并消费 backup，不 load/mutate
live Session；玩家随后显式 load。UI 只能调用语义化 upgrade/re-anchor/restore/export-backup/
discard-backup action，并提供 cancel。为了让重启后的 UI 不必物化最多 5 MiB 的 export payload
来发现 pending backup，M3.4 还提供 single-slot `inspectBackup`：每次 fresh-read，只投影
`available | rejected/{empty_backup,unavailable,invalid_backup} | faulted`，结果 deeply frozen，且不暴露
bytes/key/Host revision、不取得 lease、不写入、不改变 Persistence status 或 live Session。

这里的原子承诺限于 `HostAtomicRecordStoreV1` 已 promotion 的 Memory/IndexedDB store。Desktop
adapter 仍是 preview；M3 不把进程内 rollback/mutex 说成 process-crash atomic，也不替 PF-D
关闭 durability gate。

**2026-08-12 M3.3 delivery：** package-internal exact backup key、bounded shell/identity read、
one-generation raw-byte backup 与 backup/target/lease 单批 CAS primitive 已按上述边界交付；
普通 Save、Auto、clear、annotation、list/inspection/load/import/export 均保留 pending backup，
未增加 Host namespace、public transaction、第二份 backup、player operation 或 Desktop
durability 声明。真实 mutation RED 中，反转 existing-backup guard 使 exact one-generation
row 产生 `1` 个失败；把 IndexedDB 三记录 batch 拆为独立 commit 则分别使 conflict 与 fault
rows 转 RED，证明 pending admission 与多记录全无语义均由可达行为保护。

最终 promotion matrix 全绿：focused repository/property/Persistence/IndexedDB
`4 files / 121 tests`、Base `81 files / 1177 tests`、typecheck 与 scoped fmt/oxlint/diff。
Canonical `deno task check` 覆盖 format `955 files`、`266 files / 4557 tests`、assets、five
registered Story checks 与 Engine Lab production build `415 modules`，全部 green。M3.3 据此
转为 completed/historical；唯一当前实现切片当时推进到 M3.4 upgrade/re-anchor and
backup-resolution operations，该 historical pointer 已由下述 M3.4 delivery 关闭。

**2026-08-12 M3.4 delivery：** single-slot `inspectBackup` 与
`upgradeSave`、`reanchorSave`、`restoreBackup`、`exportBackup`、`discardBackup` 已按上述
fresh-read、lease-fenced、same-namespace bounded backup 合同交付。upgrade/re-anchor 在一个
backup/target/lease CAS 中全有或全无；restore/discard 是唯一消费 backup 的 operation，export
始终保留 exact raw backup bytes；成功或失败均不安装 Session 或改变 replay anchor/status。
恰好 16 条 lineage 的 exact Save 保持可加载，只有 otherwise-valid unique adoption 能取得
re-anchor authority，超过 16 条仍 fail closed。

真实 public ABI RED 与 mutation-sensitive focused rows 覆盖 backup status、stale read、
pending generation、target/backup/lease conflict/fault、migration/adoption/re-anchor、restore/
export/discard 及 10,000 次 bounded attempts。最终 gates 全绿：M3.4 specific
`4 files / 298 tests`、focused integration `6 files / 356 tests`、Base
`81 files / 1221 tests`、IndexedDB `13 / 13`、determinism Deno `3 / 3` 与
Chromium/Firefox/WebKit `6 / 6`；canonical `deno task check` 覆盖 format `955 files`、
`266 files / 4604 tests`、lint/style/typecheck/determinism/assets、five registered Story checks
与 Engine Lab production build `415 modules`。首次 canonical 的唯一失败是保留的 10,000-attempt
stress row 在并行负载下用时约 `47s`，超过测试默认 `30s` budget；只把该显式 test budget 调整为
`120s` 后，focused 用时 `15.11s` 且 canonical 全绿。这是 test-budget corrective，不是产品
failure。M3.4 据此转为 completed/historical；其当时推进到 M3.5 的 historical pointer 已由
下述 M3.5 delivery 关闭。

### 4.4 Lineage cap and re-anchor（M3.4 已实现；historical slice）

`simulationLineage` 的硬上限保持 16 条：长度 `0..15` 的唯一 adoption 追加一条；长度正好
16 且不需要 adoption 的 exact/migration load 仍可继续并保留 lineage；长度 16 且唯一
adoption 本会产生第 17 条时，inspection 返回 `inspect_only` +
`reanchor_required`，diagnostics 保留既有 `compatibility.lineage_limit`；普通 load 保持
`lineage_limit` rejected。输入中已超过 16
或 shape 无效的 lineage 仍是 invalid/rejected，不可借 re-anchor 修复。

re-anchor 只在上述“否则可成功但会产生第 17 条”的条件开放。它必须从当前 slot bytes
重新执行 migration（如需）、current validation 和唯一 adoption admission，先按 4.3 留下
backup，再把结果写成 current-build exact baseline 并将 `simulationLineage` 置为 `[]`；它
不是绕过 mismatch、migration failure、ambiguous declaration 或 validation 的 escape hatch。
失败保持 source/backup/live Session 不变；成功也不 mutate Session，后续普通 load 才安装
新 replay anchor。玩家触限路径固定提供 re-anchor、先导出、restore/回滚与取消，不静默
丢弃 lineage。

### 4.5 Player result and export（M3.5 已实现；historical slice）

- `rejected` / `inspect_only` / `faulted` 必须映射为用户可读文案与可行动选项；稳定
  diagnostic code 不是最终用户界面，内部 stack 永不展示；
- **确认 authority**：M3.5 必须复用已交付的 managed System exact-parent confirmation child，
  不得在 Save overlay 内 inline 第二套 modal/lifecycle authority。
  `SystemDialogConfirmationInvocationInternalV1` 的 closed union 只在既有
  `load | clear | import` 上追加 slot-bound `reanchor | restore | discard`；前三种 invocation
  shape、copy 与 completion 语义保持不变。`reanchorSave`、`restoreBackup`、
  `discardBackup` 必须先经该 child 确认；`upgradeSave` 是显式且受 pre-write backup 保护的
  operation，不再叠加 destructive confirmation；`exportBackup` 只读且不消费 backup，也不确认。
  confirm/cancel、double click、late/stale settlement、focus trap 与 opener restore 全部沿用
  managed child/session，System dialog Host 只扩展 operation-to-localized-copy mapping；
- migration attempt/receipt 只进入 bounded in-memory inspection/result diagnostics；M3
  不新增 durable receipt/history，也不改变 Debug Bundle wire；
- **浏览器矩阵**：Engine Lab 与 Cat Cafe 在各自既有 Playwright spec 内增加 stable-locator
  `@save` flow。Chromium/WebKit 仍运行既有 project；两份 config 只为 Firefox 增加
  `grep: /@save/` 的 desktop project，Firefox 不接管或扩大整套普通 browser matrix。
  Prebuilt smoke 保持既有 Chromium Artifact gate；
- **导出文件名**：Host 可使用显式 metadata clock 生成 UTC `yyyyMMddHHmmss`
  suggested filename，但它不进入 Save bytes/identity，也不保证同一秒唯一。Browser
  JavaScript 不承诺控制最终 filesystem path/suffix；验收只证明同名连续导出产生两次
  download request/event，Playwright 把两次 download 分别保存到不同临时路径且 bytes
  均正确。Desktop 的真实 no-clobber/process-crash durability 继续由 PF-D promotion 拥有；
  不得通过修改 payload 来消除文件名冲突。

**2026-08-12 M3.5 delivery：** UI/Web 现只经 optional atomic recovery group 消费
single-slot inspection、backup status 与 semantic operation；所有 disposition、backup status、
operation success/failure 与 stable rejection code 都映射为本地化 player copy，不展示
stack、digest、raw bytes、Host key/revision 或 fence。re-anchor、restore、discard 复用同一个
managed System exact-parent confirmation child；upgrade 与 export-backup 不确认。显式 inspection
保持 slot-local，pending read/write mutually exclusive；operation/result 都按 exact slot/kind
fail closed。Web 只在 exact same-slot backup export 后触发 download，UI boundary 不取得 file、
bytes 或 digest。

真实 RED 首先使尚无 recovery bridge 的 focused Web rows 产生 `6` 个失败；随后 WebKit 暴露
delegated pointer capture 与 target callback 之间的 microtask checkpoint 会过早清除 provisional
opener，使 confirmation 留在 root shell。修复后 request 仍即时消费并重验 exact parent/root
instance，而 provisional opener 只在同 task 结束时过期；把该边界改回旧行为会使真实 browser
row 转 RED。补齐 acceptance gap 后相关 test matrix 为 `79 / 79`。

最终 gates 全绿：focused exact `9 files / 219 tests`、UI + Web aggregate
`113 files / 1942 tests`、typecheck 与 exact 27-path fmt/oxlint/diff；Engine Lab 与 Cat Cafe
Chromium/WebKit/Firefox `@save` flow 各 `3 / 3`。Prebuilt gate 为 Engine Lab build
`415 modules` + Chromium `44 / 44`（real `52.50s`）。Canonical `deno task check` 覆盖 format
`955 files`、`266 files / 4682 tests`、assets、five registered Story checks 与 Engine Lab
production build `415 modules`，real `36.93s`，全部 green。M3.5 据此转为
completed/historical。

**2026-08-12 M3.6.0 docs-only exact inventory corrective：** release acceptance 本身不变；
owning plan 只把原来无法承载四 runtime parity 与 Browser no-clobber acceptance 的 13-path
inventory 修正并细分为 M3.6a–M3.6d。该 corrective 未修改 corpus、fixture、driver、browser
spec 或 live product docs，也不声明任何 M3.6 runtime delivery；其当时恢复的 M3.6a
implementation gate 现已由下述 delivery 关闭。

M3.6a 首次 capture 另证明 canonical compact Save byte fixtures 与 generic JSON formatter
不可兼得：formatter 重排会改变 exact export bytes。owning plan 因此以 docs-only corrective
把 `deno.json` 加入 exact inventory，只允许 `fmt.exclude` 精确排除四个已声明 maintained
fixture，不排除目录或其它 JSON。fixture 继续是无尾换行的 official canonical bytes，测试不得
format、trim、canonicalize 或重新 encode 后再消费；该配置边界不是 runtime delivery。

随后 M3.6b implementation pre-audit 证明 immutable fixture file bytes 会让既有 migration
driver 的 corpus 路径变为 async：原同步 direct test 必须显式 `await`，worker protocol test 也
必须进入 exact scope（允许 zero-diff）。owning plan 因此以 docs-only corrective 把 aggregate
inventory 从 24 修正为 26、M3.6b 从 7 修正为 9，新增的仅是既有
`e2e/src/test/save-state-migration-vector.test.ts` 与
`e2e/src/test/save-state-migration-worker.test.ts`。该 pre-audit 当时认为既有 Base testkit
facade 已足以承载 corpus；随后 canonical authority-map gate 反证 broad
`@sillymaker/base/testkit` 会把 `runtime/application` 与 `persistence-service` 拉入 migration
Worker closure。owning plan 因此以第二个 docs-only scope corrective 把既有窄 facade
`engine/packages/base/src/testkit/save-state-migration-determinism.ts` 纳入 M3.6b，使该 slice
从 9 修正为 10、aggregate 从 26 修正为 27。该 facade 只允许向 migration driver 重导出
release-corpus admission、inventory 与 descriptor types；corrective 不修改 source/test/runtime，
不声明 M3.6 runtime delivery。它当时保留的 M3.6b implementation gate 现已由下述 delivery
关闭。

M3.6d closeout pre-audit 随后证明原五份 final docs 无法独自完成 stale-pointer gate：
`docs/engine/roadmap.md` 与
`docs/engine/plans/2026-07-30-surface-contract-harness.md` 仍各自拥有把 PF5/M3 标为
live/current 的有效指针；若 PF5 closeout 不更新它们，就会留下错误的当前执行入口。owning plan
因此以独立 docs-only scope corrective 把这两份既有文档加入 M3.6d，使该 slice 从 5 修正为
7、aggregate 从 27 修正为 29。corrective 本身不修改这两份新增文档，不声明 M3.6c 或
M3.6d delivery/promotion；该 corrective 完成时 M3.6c 仍为当前切片，随后已由上文 delivery
关闭；当时计划的 seven-doc M3.6d 又由下述 whole-doc corrective supersede。

七份文档的候选 closeout 落盘后，whole-doc active-pointer scan 又证明
`docs/engine/design/surface-contract-harness.md` 与
`docs/engine/design/vn-presentation-runtime.md` 的有效顶层状态仍把 PF5/M3 标为 current。第一轮
corrective 只覆盖 roadmap 与 focused Surface plan，仍不足以合法关闭 PF5。owning plan 因此以
第二个 docs-only stale-pointer scope corrective 把这两份既有 design owner 加入 M3.6d，使该
slice 从 7 修正为 9、aggregate 从 29 修正为 31。corrective 本身只修改三份 owning Save docs，
不修改这两份新增文档，不交付 runtime/test/fixture/live capability，不声明 M3.6d
delivery/promotion，也不推进 production-floor pointer；随后恢复的 exact-nine candidate 已完成
两份新增 owner，但又由下述 exhaustive-scan corrective supersede。

exact-nine candidate 落盘后，对全部 tracked Markdown、website 与 config 执行 active PF5/M3
pointer 及 Save migration/corpus/inspection/backup/recovery planned/unimplemented 语义扫描，又
证明 `docs/engine/architecture.md` 的 current/next 指针、`docs/engine/development.md` 的 current
指针和 planned capability 声明，以及 `docs/engine/design/window-model.md` 的顶层 implementation
gate 都仍是有效 live truth。website、Story authoring 与 build/release 文档没有额外冲突声明。
owning plan 因此以第三个 docs-only stale-pointer scope corrective 把这三份既有 live owner 加入
M3.6d，使该 slice 从 9 修正为 12、aggregate 从 31 修正为 34。corrective 只修改三份 owning
Save docs，不修改三份新增文档，不交付 runtime/test/fixture/live capability，不声明 M3.6d
delivery/promotion，也不推进 production-floor pointer；该 corrective 当时保留的 pending
exact-twelve closeout 已由下述 final delivery 关闭。

**2026-08-12 M3.6c repeated-download delivery（已完成；historical）：** exact two-spec
实现先让新 byte assertions 消费旧 `void` seed helper，typecheck 在 Engine Lab 与 Cat Cafe
两处产生 TS2769 RED；helper 随后从同一 IndexedDB read/write transaction 返回 defensive
expected bytes。两份 `@save` flow 都在首次导航前固定 metadata clock，捕获两次 download
event，断言相同 suggested filename，以两个不同 `testInfo.outputPath` 保存并逐 byte 比较真实
pending backup，随后重新 inspection 证明 export 不消费 backup，再继续既有 Engine discard 与
Cat restore。

Engine Lab/Cat Cafe × Chromium/Firefox/WebKit 为 `6 / 6`；exact two-file fmt、type-aware
oxlint、full typecheck 与 diff-check 全绿。Prebuilt gate 为 Engine Lab build `415 modules` +
Chromium `44 / 44`（real `54.95s`）。Canonical `deno task check` 覆盖 format `959 files`、
`269 files / 4701 tests`、assets、five registered Story checks 与 Engine Lab build
`415 modules`，real `42.96s`，全部 green。该证据不声明 Browser JS 决定最终 suffix，也不
声明 Desktop preview 已有 process-crash atomicity。M3.6c 据此转为 completed/historical；
M3.6d 随后只同步 live docs并关闭 PF5。

**2026-08-12 M3.6d exact-seven candidate（未交付）：** 第一轮候选已把 inspection、adoption
set、same-namespace backup/recovery、re-anchor、玩家 UI、四份 maintained corpus、four-runtime
parity 与 Browser repeated-download evidence 同步到七份文档，且没有扩大 Browser suffix 或
Desktop crash-atomicity 声明；但上述 whole-doc scan 证明它遗漏两份 active design pointer owner，
因此不构成 M3.6d delivery 或 PF5 promotion；随后的 exact-nine candidate 又遗漏上述三份 live
owner，同样不构成 delivery/promotion。最终 closeout 必须严格命中修正后的 exact twelve-doc
scope，并在 fresh canonical gate 全绿后才可把 PF5/M3 转为 historical；后续 current
顺序只由 production-floor sequence 拥有。

**2026-08-12 M3.6d live product docs/PF5 promotion delivery（已完成；historical）：** final
exact-twelve overlay 把 implemented inspection、bounded adoption/backup/recovery/re-anchor、
player-readable UI、四份 maintained corpus、four-runtime parity 与 repeated-download exact-byte
evidence 同步到 live architecture/features/development/release docs，并更新所有有效 execution
pointer；Surface 两份长历史记录由各自顶层 global supersession 明确归档。全量 tracked Markdown、
website 与 config 扫描确认 exact scope 之外没有额外 live contradiction 或 navigation/link 更新。
Scoped format、diff、stale-pointer 与 exact inventory gate 全绿；fresh final `deno task check`
覆盖 format `959 files`、`269 files / 4701 tests`、assets、five registered Story checks 与
Engine Lab production build `415 modules`；`/usr/bin/time -p` 为 real `46.59s`、user `224.14s`、
sys `47.21s`，全部 green。M3.6d 与 PF5/M3
据此转为 completed/historical；当时的 PF6/S5 pointer 已由后续 Complexity Reset
supersede。

**2026-08-12 M3.6a maintained corpus and Story lifecycle delivery（已完成；historical）：**
实现严格命中 frozen exact `10` paths（含只精确排除四份 maintained Save bytes 的
`deno.json`），没有修改 four-runtime driver、Browser spec 或 live product docs。真实 RED
先让三份新增 corpus suites 因 release-corpus helper/barrel 尚不存在而在 module resolution
失败；随后同一 suites 以 checked-in immutable bytes 转 GREEN。Base admission 固定 supported
inventory、exact length/SHA-256、canonical compact bytes、Story/State identity 与 fresh defensive
copy；两个 Story 直接从 physical fixture 执行 inspection、适用的 migration/adoption/re-anchor、
current validation、load 与 fresh-save round-trip，并覆盖 failure no-mutation、backup/restore、
lineage `15/16`、ambiguous declaration、annotation 与 M0a `versionStamp` capture-origin 保留。

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
core slice与 direct RED/implementation gate 当时推进到 M3.6b four-runtime corpus parity；
该 historical pointer 现已由下述 delivery 关闭。

**2026-08-12 M3.6b four-runtime corpus parity delivery（已完成；historical）：** 首个真实 RED
把 expected determinism vector 增加 ordered four-case release corpus，而 actual collector 仍为空；
实现以四个 literal `?no-inline` URL 异步读取并经 narrow Base migration testkit admission，保持
synthetic M2 vector 与 product corpus 分离。Engine Lab revision 3/4 执行真实相邻 migration
callbacks，revision 5 与 Cat Cafe revision 1 执行 current exact admission；Deno 与三 browser
runtime 比较 normalized source/target identity、bytes/state digests、steps/callback count、diagnostic
与 source-byte preservation。

Canonical 随后产生 authority-map `1 / 14` 的第二个真实 RED并报告四条 forbidden transitive
paths；narrow facade corrective 使 driver 不再 import broad Base testkit，同一 authority-map 转为
`14 / 14` GREEN。Frozen exact `10` paths 中实际 `4` paths 有 diff、`6` paths zero-diff。Final
gates 为 focused `3 files / 6 tests`、Deno matrix `1 file / 3 tests`、
Chromium/Firefox/WebKit repeat-each-two `6 / 6`（real `10.41s`）与 canonical format `959 files`、
`269 files / 4701 tests`、assets、five Stories、Engine Lab build `415 modules`（real `41.83s`），
全部 green。M3.6b 据此转为 completed/historical；唯一 live/current/next、core slice与 direct
RED/implementation gate推进到 M3.6c Browser repeated-download no-clobber evidence。

## 5. Release acceptance

- metadata expected bytes 只由 M0a shared corpus 维护；DET、Host、Desktop 与
  migration fixtures 直接消费，不复制或从待测 encoder 重生成；
- 每个明确声明支持的 Save identity 都保存 maintained byte fixture（旗舰示例与 e2e
  conformance Story）；fixture 是兼容合同，不默认声称来自历史 product release capture；
- CI 对支持范围内全部 maintained fixture 执行 migrate + load + reference + invariant +
  digest 验证；
- 每个 registered migration vector 使用 PF-DET 建立的 test-only driver 在
  Deno、Chromium、Firefox、WebKit 比较 normalized output、diagnostic 与 digest；
  缺 browser 不得 silently skip；
- fixture corpus 至少包含一条跨多个发布版本的 migration/adoption 链样本（含逼近
  lineage 上限的边界样本）；
- fixture corpus 覆盖 annotation absent、summary-only、note-only、summary + note
  与 cleared-note，并证明 State migration 不消费或改写 annotation；
- fixture corpus 覆盖 `versionStamp` absent/all-null/partial/fixed full-clean/fixed
  full-dirty/status-unavailable/malformed/throw、normalized value 与 fixed
  bytes；headless absent/all-null 保留 PF1 unstamped
  oracle，fixed browser stamp 有独立 byte oracle，并证明 migration、annotation
  rewrite、rotation 与 stored-record export 保留 Snapshot capture origin；
  load/import compatibility 忽略 stamp，post-load/import fresh capture 使用当前
  service stamp；
- Browser acceptance 覆盖同一秒重复 suggested filename，证明有两次 download request/event；
  Playwright 选择两个不同临时路径并验证各自 payload bytes。此证据不宣称 Browser JS
  决定最终 suffix，也不宣称 Desktop preview 已 process-crash atomic；
- fixture 代表用户可见的兼容承诺，符合项目测试原则；它不是计划执行凭据；
- Cat Cafe 当前 State revision 1 是该产品首个受支持 Save floor；M3 不虚构 Cat revision
  0/历史 fixture，也不对不存在的已发布 Cat Save 作兼容承诺；
- Engine Lab 维护 revision 3、4 到 current revision 5 的 compatibility fixtures，并只通过
  既有相邻 chain `3 -> 4 -> 5` 验收；这些 bytes 是长期维护的兼容合同，不伪称来自历史
  product release capture，也不能由 current encoder 反向生成来冒充旧 shape；
- Engine Lab 曾出现的 same-revision/different-digest revision 5 不在支持 floor。若找到真实
  released bytes 必须支持它，M3 立即停止并先接受显式 recovery/State-migration contract；
  不得新增 `5 -> 5` edge、改 digest、借 adoption 做 State shape conversion 或伪造 fixture；
- 支持范围与放弃策略是显式、文档化的产品决定，不是缺省的无限承诺。

## 6. Non-goals

- 不做自动 schema diff 推断迁移；每步迁移是显式作者代码；
- 不承诺跳版本直迁或降级迁移；
- 不引入外部数据库或异步迁移服务；迁移在 load 路径内同步完成；
- 不改变“Save 只存 plain data”的边界；迁移代码不进入存档。
- M3 不实现 envelope format migration、durable migration history、multi-namespace/Mod
  migration、自动 reference rewrite 或公开通用 transaction API；backup 是同一 `save`
  namespace 的单层产品恢复记录，不是新历史系统。

## 7. Relationship to existing documents

- [roadmap](../roadmap.md)：Save migration 属于 production floor 方向；Mod track
  的 M3 以本文为前置；
- [Mod design](mod-system.md)：其 per-namespace migration 复用本文的解码顺序与
  registry；单应用（无 Mod）Save 是单 namespace 的特例；
- [build and release](../build-and-release.md)：M3 fixture corpus
  进入发布流程后再更新该文档；M1/M2 不把机制验收写成发布兼容承诺。
