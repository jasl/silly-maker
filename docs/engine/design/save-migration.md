# Save migration and load compatibility

状态：2026-07-29 接受的目标设计，2026-07-31 按 callback-free shell、shared
metadata corpus 与 determinism join 修订；尚未实现。本文把 Save
兼容从“分类与拒绝”升级为“一等迁移能力”：固定 migration registry 合同、load
阶段顺序与发布验收。它独立于 Mod 系统并先于其落地；[Mod design](mod-system.md)
第 8 节的 per-namespace migration 建立在本文的引擎级合同之上。当前实现状态见
[features](../features.md)；本文不把现状描述成已有 migration。迁移函数属于
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

缺口是没有迁移路径，而且当前顺序阻止未来补上：

1. `decodeSaveRecordV1` 在解码时就用 current `snapshotSchema` 解析整个
   envelope。旧 schema 的 Snapshot 在任何 compatibility/migration
   逻辑运行之前，即以 `envelope.schema_invalid` 被拒绝；
2. state contract revision 变化被分类为
   inspect_only，没有“迁移后正常加载”这条腿；
3. 没有 migration registry、历史 fixture corpus，也没有“任意受支持旧 Save
   可迁移、可加载”的发布验收。

对长期维护的产品，这意味着每次 State schema 演进都默默放弃旧存档。

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
  -> engine-owned envelope format migration （formatRevision N -> N+1；M2 起启用）
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
拿当前 schema 解释未知 format。与现状的差异是：current snapshot schema 验证从解码期
移到迁移之后；解码期只解析 current-format envelope 外壳字段，snapshot 保持为受限 raw
数据。

这也明确改变一组 compound-failure precedence：现实现先解析完整 current Snapshot
schema、trailing envelope fields 与 cross-field identity，再验证 digest；目标顺序在
shell 成功后先验证 raw snapshot digest，并把 current Snapshot admission 移到其后。
因此所有实际跨越这些 phase 的双缺陷输入都按目标 phase 顺序裁决，而不是只豁免一个
schema 例子。至少维护 Snapshot-schema + digest、zero-RNG + digest、zero-RNG + invalid
trailing shell field、cross-field + digest 四类代表 vector；合法、单缺陷及未受 phase
移动影响的 current-format 结果仍须逐字段回归 M0b。

M1 只交付 callback-free shell、raw-digest verification 与上述 phase ordering；当
shell/digest 合法但 State revision 不同，它返回 `migration.unavailable`，不执行
图中的 migration node。M2 在完整 determinism guard 与 M1 same-HEAD join 后才首次
建立 executable registry/启用这些 node。

要点：

- raw snapshot
  在迁移前只是受限结构数据，不被信任；既有字节/深度/节点/字段限额继续适用，不为迁移放开输入；
- envelope format（`formatRevision`）与 State schema（state contract
  revision）是两条独立迁移轴：前者由 engine-owned migration
  处理，后者由应用（未来由 Mod namespace）声明；二者不共享一个模糊 registry；
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
  rejection 或 inspect_only，不存在半迁移状态；operational/unexpected failure 返回
  faulted，prepare-commit fault 可把 Session 置为 `fault_paused`。失败不得安装部分
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

## 3. Migration registry contract

Executable registry 从 M2 才存在。概念合同（名字可在实现原型中调整）：

```ts
interface SaveStateMigrationV1 {
  readonly fromStateContractRevision: number; // N
  readonly toStateContractRevision: number; // 恒为 N + 1
  migrate(state: BoundedRawStateV1): MigrationStepResultV1;
}
```

要求：

- 每步迁移是纯函数、确定性、禁网络、禁时钟、禁随机；
- migration registration 的 source entry 必须进入已经落地的 authoritative
  import-closure static guard 与 isolated test tripwire；“文档写着 pure”不能替代
  可执行 evidence；
- engine-owned envelope-format migrator 与 State migrator 受同一要求约束；
  callback-free shell/order 可以先落地，但不能因此宣称已有 format migration；
- 只允许相邻 revision `N -> N+1`；跨版本由 runtime
  组合迁移链完成，不承诺跳版本直迁；
- registry 以 State namespace 为组织维度：engine-owned envelope format
  迁移之外，每条 State 迁移链隶属一个 namespace；单应用（无 Mod）是单 namespace
  特例，Mod 的 per-namespace migration（[Mod design](mod-system.md) 第 8
  节）复用同一 registry 而不是另建；跨 namespace 的执行顺序由 resolved
  provenance 的 namespace 集合确定性派生；
- content/reference ID rename 或 delete 必须有显式映射表，不依赖偶然 fallback；
- migration 与 adoption 是不同物：migration 转换 State；adoption 声明“旧 State
  无需转换即可被新 Simulation 接管”。二者都不能用宽泛 semver 猜测（与
  [Mod design](mod-system.md) 第 8 节一致）；
- CommandLog 兼容轴独立管理：迁移安装新 replay anchor，旧命令日志不跨迁移重放。

## 4. Product surface

- **M1 unavailable contract**：shell/digest valid、State revision 不同但没有完整
  forward chain 时，inspection 返回
  `{ kind: "inspect_only", code: "migration.unavailable", storedStateContractRevision,
  currentStateContractRevision }`，Player persistence 返回
  `{ kind: "rejected", code: "migration_unavailable" }`。Unsupported envelope
  format、raw digest mismatch 与 current-revision schema invalid 保持各自更早的
  rejection；State revision decision 先于 compatibility，因此 Story ID mismatch 与
  State revision mismatch 同时存在时仍为 `migration.unavailable`，相同 State revision
  的 Story mismatch 才保留既有 `inspect_only`/player `incompatible`。此结果不写
  record、不安装 Session、不替换 replay anchor；
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
- 迁移过程与结果进入现有结构化 diagnostics 与 debug bundle。
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

## 7. Relationship to existing documents

- [roadmap](../roadmap.md)：Save migration 属于 production floor 方向；Mod track
  的 M3 以本文为前置；
- [Mod design](mod-system.md)：其 per-namespace migration 复用本文的解码顺序与
  registry；单应用（无 Mod）Save 是单 namespace 的特例；
- [build and release](../build-and-release.md)：fixture corpus
  进入发布流程后更新该文档；实现前不修改其现状声明。
