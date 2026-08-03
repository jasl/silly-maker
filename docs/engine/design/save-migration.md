# Save migration and load compatibility

状态：2026-07-29 接受的目标设计，2026-07-31 按 callback-free shell、shared
metadata corpus 与 determinism join 修订；2026-08-03 M1 callback-free
shell/load-order floor 已实现，并冻结 M2 为 single-namespace、State-only executable
migration；M2a exact registry/Core current-identity admission、M2b bounded pure
execution kernel 与 M2c staged Persistence integration 已实现，M2d–M2e 与 M3
产品发布语料仍未实现。本文把 Save
兼容从“分类与拒绝”升级为“一等迁移能力”：固定 migration registry 合同、load
阶段顺序与发布验收。它独立于 Mod 系统并先于其落地；[Mod design](mod-system.md)
第 8 节的 per-namespace migration 建立在本文的引擎级合同之上。当前实现状态见
[features](../features.md)；本文区分 staged engine capability 与尚未 promotion 的产品
兼容承诺。迁移函数属于
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

M2c 已建立 executable migration 路径，剩余缺口是 promotion 与完整原子 provenance：

1. M2c 已把 exact registry 接入 import/load staged admission，能够迁移后经 current
   schema/digest/compatibility/reference/invariant validation，并使用既有 replay-anchor
   replacement；但没有 maintained application owner，list/export/annotation 也有意不执行
   callback；
2. 低层 success 已产生 replacement-origin receipt，但 Session/Persistence 尚未安装或管理
   receipt lifecycle，也没有 M2d composite prepare/no-throw commit token；
3. 没有历史 fixture corpus，也没有“任意受支持旧 Save
   可迁移、可加载”的发布验收。

在 M2e/M3 之前，maintained product 仍不能兑现旧存档迁移与加载承诺；当前 staged
能力只在 application 显式提供 exact registry 时启用，且不会写回来源数据。

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
  metadata。absent/all-null、完全 malformed、
  accessor-only、hostile Proxy 或 collector throw 规范化为 field absent；mixed
  malformed fields 逐字段丢弃后可形成 partial stamp，partial/full 经 bounded
  printable normalization、copy 与 freeze，且不调用 getter；
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
- Browser/Desktop Host 拥有真实 filename collision/no-clobber；D4 只消费同一
  payload/build receipt 验证 package integration，不重复 Save migration matrix；
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
4. exact result envelope 与 per-step canonical/limit admission；thenable、非法 union、
   non-canonical 或 over-limit output 均为 `migration.output_invalid`；
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
Snapshot并派生其 digest → finalize receipt。M2b executor只返回 detached/frozen migrated State与
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
- migrator 只接收 raw-digest-verified historical Snapshot 的 `state`，经 package-owned
  detached canonical projection 与 deep-freeze 后交付；每步 migrated output 再执行
  descriptor-safe capture、canonical/limits admission、detached projection 与 deep-freeze；
  limits 在 capture 时 fail fast，不得先复制/编码完整 over-limit tree；exact own-key vector
  只捕获一次。Promise/thenable、accessor、custom prototype、alias mutation 与非 exact result
  均不能穿透；kernel不 await、不继续 migration，也不读取或调用 arbitrary `.then`；
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
load/import、debug fixture/debug-bundle replacement、rebootstrap/new Persistence service，以及
任何不携带 receipt 的显式 replay-base replacement把它清为 `null`。失败保留此前 receipt
identity/value。

State migration 只把 candidate provenance 的 `resolved.stateContractRevision` 与
`resolved.stateContractDigest` 提升到 current identity；Story、engine、simulation、
presentation、patch-set axes、existing `simulationLineage` 与 persistence metadata全部保留
stored 值，再执行既有 compatibility/adoption。因此 migration 不得以 current provenance
整对象覆盖绕过 Story/engine/simulation mismatch。

### Atomic replacement

M2 使用 package-internal prepare/commit，不把公开 `GameSessionRuntimeControlV1` 扩张成
通用 transaction-participant framework。prepare 在任何 mutation 前完成 final validation/
freeze/digest、empty CommandLog/replay anchor、next ordinal、lineage/receipt copy、autosave
next-epoch admission、repair/bookkeeping plan、lease fence 与所有 allocation；不得清 map、
推进 epoch、调用 Host write/observer/Story callback 或发布 Snapshot。

commit 只安装预计算值：Persistence lineage/receipt、autosave anchor bookkeeping、CommandLog
replay base/digest/empty entries/next ordinal、Session Snapshot/digest/status 与 safely-saved
anchor。commit 不做 validation、digest、integer increment、allocation、callback、Host I/O、
Promise creation 或 observer publication；autosave repair/write 只在 composite commit 后排队。
JS 单线程下的 atomic 指同一 queue turn 中无可观察中间 publication，且 validated token 的
commit path 结构上不抛错。

## 4. Product surface

- **M1 unavailable contract（已实现）**：shell/digest valid、State revision 不同但没有完整
  forward chain 时，inspection 返回
  `{ kind: "inspect_only", code: "migration.unavailable", storedStateContractRevision,
  currentStateContractRevision }`，Player persistence 返回
  `{ kind: "rejected", code: "migration_unavailable" }`。Unsupported envelope
  format、raw digest mismatch 与 current-revision schema invalid 保持各自更早的
  rejection；State revision decision 先于 compatibility，因此 Story ID mismatch 与
  State revision mismatch 同时存在时仍为 `migration.unavailable`，相同 State revision
  的 Story mismatch 才保留既有 `inspect_only`/player `incompatible`。此结果不写
  record、不安装 Session、不替换 replay anchor；
  以下 product surface 仍是 M3 目标，不是当前能力：

- **dry-run / forward inspection**：只检查、不写入；输出结构化
  diagnostics（哪些槽位可直迁、哪些需要 adoption、哪些会被拒绝及原因）；
- **写入前备份**：迁移写入前保留原记录（复用现有 lineage/slot
  机制），玩家路径失败可回退到迁移前状态；
- **adoption 声明集合与发布工具**：兼容分类必须接受一组 adoption
  declaration（覆盖多个受支持历史构建），而不是单条；发布/build 流程从历史
  resolved provenance 自动生成候选声明，人工只做确认与裁剪，不逐字段手工枚举
  digest。现实现的单声明入口（且应用侧恒传空）是本 track 要替换的缺口；
- **lineage 边界策略**：adoption lineage 当前只增不减且上限 16；本 track 须明确
  re-anchor 语义（何时把已 adopt/已迁移的存档重新锚定为新基线以修剪
  lineage）、上限取值与触限时的产品路径（提示玩家
  re-anchor/导出/回滚），不把触限留成静默拒绝；
- **玩家可读结果**：rejected / inspect_only
  必须映射为用户可读文案与可行动选项（回滚版本、导出存档、放弃迁移），诊断码不是最终用户界面；
- migration failure/attempt 进入结构化 diagnostics；M2 不改变 Debug Bundle wire。若 M3
  要导出 durable receipt/history，必须另行定义 revision、limits 与 privacy contract；
- **导出文件名**：Host 可使用显式 metadata clock 生成 UTC `yyyyMMddHHmmss`
  suggested filename，但它不进入 Save bytes/identity，也不保证同一秒唯一。实际
  Desktop/Browser 下载必须以 no-clobber suffix、浏览器下载策略或等价的原子
  collision policy 保留所有导出；不得通过修改 payload 来消除文件名冲突。

## 5. Release acceptance

- metadata expected bytes 只由 M0a shared corpus 维护；DET、Host、Desktop 与
  migration fixtures 直接消费，不复制或从待测 encoder 重生成；
- 每个发布版本为维护中的产品格式保存真实 Save fixture（旗舰示例与 e2e
  conformance Story）；
- CI 对支持范围内全部历史 fixture 执行 migrate + load + reference + invariant +
  digest 验证；
- 每个 registered migration vector 使用 PF-DET 建立的 test-only driver 在
  Deno、Chromium、Firefox、WebKit 比较 normalized output、diagnostic 与 digest；
  缺 browser 不得 silently skip；
- fixture corpus 至少包含一条跨多个发布版本的 migration/adoption 链样本（含逼近
  lineage 上限的边界样本）；
- fixture corpus 覆盖 annotation absent、summary-only、note-only、summary + note
  与 cleared-note，并证明 State migration 不消费或改写 annotation；
- fixture corpus 覆盖 `versionStamp` absent/all-null/partial/fixed full-clean/fixed
  full-dirty/status-unavailable/malformed/throw、normalized freeze 与 fixed
  bytes；headless absent/all-null 保留 PF1 unstamped
  oracle，fixed browser stamp 有独立 byte oracle，并证明 migration、annotation
  rewrite、rotation 与 stored-record export 保留 Snapshot capture origin；
  load/import compatibility 忽略 stamp，post-load/import fresh capture 使用当前
  service stamp；
- Host acceptance 覆盖同一秒重复 suggested filename，证明 collision policy
  no-clobber 且两个落盘 payload bytes 都等于各自导出内容；
- fixture 代表用户可见的兼容承诺，符合项目测试原则；它不是计划执行凭据；
- 支持范围与放弃策略是显式、文档化的产品决定，不是缺省的无限承诺。

## 6. Non-goals

- 不做自动 schema diff 推断迁移；每步迁移是显式作者代码；
- 不承诺跳版本直迁或降级迁移；
- 不引入外部数据库或异步迁移服务；迁移在 load 路径内同步完成；
- 不改变“Save 只存 plain data”的边界；迁移代码不进入存档。
- M2 不实现 envelope format migration、durable migration history、dry-run/backup UX、
  multi-namespace/Mod migration、自动 reference rewrite 或公开通用 transaction API。

## 7. Relationship to existing documents

- [roadmap](../roadmap.md)：Save migration 属于 production floor 方向；Mod track
  的 M3 以本文为前置；
- [Mod design](mod-system.md)：其 per-namespace migration 复用本文的解码顺序与
  registry；单应用（无 Mod）Save 是单 namespace 的特例；
- [build and release](../build-and-release.md)：M3 fixture corpus
  进入发布流程后再更新该文档；M1/M2 不把机制验收写成发布兼容承诺。
