# Production-floor execution sequence

状态：2026-07-30 接受执行，2026-08-01 根据 PF2 promotion、authoritative
determinism/Save graph、CI 与 Desktop 审计修订；2026-08-02 旧 DET-B/PF-DET
promotion 已完成，但其 broad static contract 随后被 DET3a conservative-syntax corrective
target supersede。corrective C1 import/loader admission、C2 Date/String/provenance kernel、C3
B-prime Base UTC isolation、C4 cleanup、DET3b invariant revalidation 与 DET4 full
re-promotion 现已完成，aggregate PF-DET corrective gate 再次关闭；2026-08-03 接受的
time-boundary clarification 只闭合 C3 metadata scope，不改变 B-prime 或 C2。callback-free
Save M1 与 DET-B same-HEAD join 已于 2026-08-03 完成；M2 已冻结为 State-only 的
M2a–M2e；M2a exact registry/Core-admission floor、M2b bounded pure execution kernel、
M2c staged Persistence integration、M2d atomic replacement 与 M2e real-owner/four-runtime
promotion 均已关闭。2026-08-08 dormant `PF4/S3c.1 Host-commit readiness`、
`PF4/S3d Saves confirmation child` 与
`PF4/S3e.0 composition successor acknowledgment and terminal teardown` 已关闭；
2026-08-09 `PF4/S3e live cutover and promotion` 与
`PF4/S1-R.0 stable publication/identity/failure contract floor` 与
`PF4/S1-R.1 publisher lease + source/occurrence allocators`、
`PF4/S1-R.2a corrective admission contract` 与
`PF4/S1-R.2b Base bounded canonical projection seam` 已关闭，linear core下一独立
切片为 `PF4/S1-R.2c stable-vector admission`。
同日 S1-R pre-implementation review 将 external reconcile gate 重切为 S1-R.0–S1-R.5；
顺序变化不把任何 planned stable-target contract写成 live capability。
2026-08-04 已冻结 S3 的 shared-Coordinator transient topology、atomic initial-candidate
supersede、retained-active pending cancellation、exact result/delta matrix、Host-commit
readiness、StrictMode terminal-once fence 与 public API cutover，并已重切为 S3a–S3e。
同日 S3a dormant System contract/snapshot floor 与 package-internal atomic initial
supersede/retained-active cancellation、S3b composition-owned shared Coordinator 与
dormant System session/catalog、S3c.0 all-family successor activation barrier 已完成；S3
的 S3c.1 Host-commit readiness/Host lease、S3d exact-parent confirmation child 与
S3e.0 composition successor acknowledgment/terminal teardown、S3e live cutover与
promotion与 S1-R.0–R2b dormant internal floor均已完成；下一独立切片为 S1-R.2c。
旧 promotion 数字保留为
历史证据。本文是当前唯一的跨计划排序入口；
具体合同仍由各 design 文档拥有，主要任务由五个独立计划拥有：

- [Desktop persistence durability](2026-07-30-desktop-persistence-durability.md)
- [Snapshot commit performance](2026-07-30-snapshot-commit-performance.md)
- [Save migration](2026-07-30-save-migration.md)
- [Managed Surface lifecycle](2026-07-30-surface-contract-harness.md)
- [Authoritative determinism guardrails](2026-07-31-authoritative-determinism-guardrails.md)

PF0.1 的 CI0/AUTO0 是两个刻意保持很小的 pre-pilot maintenance slice，不另建 focused
plan；它们的 scope、TDD/验收与 stop boundary 由本文第 2 节直接拥有。下一位 Agent
领取它们时以该小节为任务 authority，仍一次只实现一个切片。

本文不把尚未实现的目标写成 live capability。`architecture.md`、`features.md` 与公开网站只描述已经通过验收的行为。

## 1. Why one sequence

五个方向都属于 production floor，但风险形态不同：

- Desktop persistence 是 Host transaction/durability 缺口；当前 file adapter 只有单文件 replace 与同进程串行，不能冒充多记录 crash-atomic store；
- Snapshot 优化是低语义风险、可通过等价性证明的热路径改造；
- Save migration 是跨版本产品承诺，必须在第一次正式存档格式演进前建立；
- Surface lifecycle 是高组合风险架构迁移，必须以一个真实 surface family 为
  pilot，不能一次重写 Overlay、System、Narrative、Browser input 和 Agent
  receipt。
- Authoritative determinism guardrail 是 trusted Story/low-level schema 的入场与
  认证缺口：不能用现有 Snapshot canonical digest 冒充对 command、evidence、
  ambient entropy 或跨 JavaScript 引擎的完整保证。

因此不接受“把五个大设计并行交给多个
Agent，最后一次合并”的执行方式。每个切片必须可独立合并、可独立回滚、可独立更新现状文档；下一切片只依赖已通过
promotion record 的合同。

## 2. Core sequence and independent promotion lane

### PF0 — Repository and tooling guardrails（已随本次审查落地）

- workspace registry 在加载 app 前验证 project ID、目录形状与重复目录；
- app declaration 在根 Vite 与 CLI 路径上使用同一结构化验证；
- duplicate application ID 在 root build dispatch 前失败，不再由 `.find()` 静默选择第一个；
- runtime asset dev server 使用真实路径边界而不是字符串前缀，拒绝 malformed URL、目录、穿越与 symlink；production copy 同样拒绝 symlink tree；
- desktop static server 同样拒绝 malformed URL、穿越与 symlink，只允许 GET/HEAD；records endpoint 统一执行 same-origin、JSON、body-size、namespace 与 wire validation；
- desktop config 拒绝不安全 bundle filename/reverse-DNS identifier，packager 显式携带全部 shell helper；
- stage pointer gesture fence 只通过 `useStagePointerGestureFenceV1` 暴露给 Story，raw controller 保持 package-internal；非主按钮和键盘 click 不被误吞；
- `manualSaveSlotCount: 0` 是合法产品配置，只保留 quick 与双自动档。

PF0 不代表全部 tooling 已完成；它只消除本次新增“应用即项目”与 pointer fence 中会在后续计划放大的确定性缺口。

### PF0.1 — Pre-pilot maintenance gates（已完成）

在继续 S1-T 前先分别完成两个小切片；二者不能与 Surface kernel 合并成一个提交：

**CI0 — latest-stable required CI：**

- 为 pull request 与 `main` push 建立 required、browser-free quality lane；执行时
  使用 Deno latest stable、`deno ci` 与 `deno task check`；
- 不增加 Deno 2.9.0 lane，不固定 patch。`>=2.9.0` 只保留为 public
  compatibility floor；workflow/promotion log 记录实际 Deno 版本；
- 另用 locked Playwright 的 Chromium 执行 Engine Lab prebuilt smoke；完整普通
  browser matrix 可先由 nightly/manual 运行，DET4 再接管 dedicated
  Deno/Chromium/Firefox/WebKit parity gate；
- Deno 是 repository tool/build host，不是 Web Player runtime dependency；产物
  correctness 由 prebuilt/browser tests 约束，而不是通过固定构建机 patch 推导；
- Pages build 改用 `deno ci`，且自动发布只能消费同一 commit 已通过 required
  validation 的 build；当前只有手动 Pages workflow，不能把 general CI 写成已存在
  capability。

**CI0 acceptance：** versioned workflow 明确触发 pull request 与 `main` push，quality
job 打印实际 `deno --version`、只配置 latest stable、依次执行 `deno ci` 与
`deno task check`，且不安装/启动 browser；独立 Chromium prebuilt-smoke job 只在
quality 成功后运行。Pages 若启用 push deployment，只能在同一 commit 的这些 gate
成功后 build/deploy。workflow static validation、一次本地 `deno ci` +
`deno task check` 与一次真实 GitHub run 全绿；stable job name 可配置为 branch
protection required check。若当前权限不能修改 branch protection，promotion record
必须把“workflow landed”与“required policy active”分开并向用户报告，不能虚称已
required。CI0 不引入 floor lane、browser matrix、Deno patch pin 或 Player runtime
dependency。

**2026-08-01 CI0 promotion：** versioned `CI` workflow 已在 pull request 与 `main`
push 上提供 latest-stable、browser-free quality job，并在其成功后运行 locked Chromium
Engine Lab prebuilt smoke；Pages 保持手动触发且改用 `deno ci`。commit `216767e` 的
[GitHub run 30648776840](https://github.com/jasl/silly-maker/actions/runs/30648776840)
在实际 Deno 2.9.4 上两项全绿，且没有旧 checkout runtime annotation。`main` branch
protection 已将两个稳定 job name 绑定为 GitHub Actions app 提供的 required checks；
`strict` 与 admin enforcement 保持关闭，未附带 PR review 或 push restriction。CI0
没有增加 2.9.0 floor lane、普通 browser matrix、Deno patch pin、Pages push deploy
或 Player runtime dependency。下一独立切片是 AUTO0。

**AUTO0 — autosave policy admission：**

- TDD 固定当前 `delayMs` 会接受 `Infinity`、fractional、unsafe integer 与 `-0`，
  `checkpointEveryCommands` 也没有完整 runtime admission；
- `delayMs` 必须是 non-negative safe integer 且拒绝 `-0`；可选
  `checkpointEveryCommands` 必须是 positive safe integer；在 Session、Host owner、
  timer 或 persistence side effect 创建前原子拒绝；
- valid policy 的 schedule/capture/flush 次数与 bytes 不变，不改变 public
  persistence/Save/autosave outcome。

`auto.current` boot 遇到 corrupt/invalid record 时保持 fresh bootstrap 的现有玩家
行为；DET1 负责让 precise rejection 进入 Core diagnostics。AUTO0 不把一个
catch-only patch 冒充 determinism closure。

**AUTO0 acceptance：** focused red/green 分别覆盖每个 invalid number class、合法
zero/positive boundary 与 omitted checkpoint；invalid construction 的 Session、Host
owner、timer、persistence factory/write count 全为 `0`，valid schedule/capture/flush
count 与 fixed Save bytes 等于 pre-change oracle。受影响 package tests、
`deno task test`、`deno task check` 与 diff hygiene 全绿；若只能通过改变 public Save/
autosave result、boot recovery 或 scheduling semantics 才能收紧，立即停止并修订
合同。

**2026-08-01 AUTO0 promotion：** Core composer 现在会在读取 scheduler、创建 Session、
进入 persistence factory 或取得 lease owner 前，一次性读取、验证并冻结 debounced
policy；`delayMs` 接受 `0..Number.MAX_SAFE_INTEGER` 但拒绝 `-0`，可选 checkpoint
接受 `1..Number.MAX_SAFE_INTEGER`。red baseline 证明旧实现会放行 `-0`、fractional、
unsafe integer、`Infinity` 与全部非法 checkpoint 类；green path 对每类非法输入的
Session/persistence factory、scheduler/timer、Host commit、lease acquisition 与 Save
write 计数均为 `0`。合法 workload 保持两次 schedule、一次 checkpoint capture、一次
显式 flush 和两次 `auto.current` write，checkpoint/final Save 的 byte length 与 SHA-256
仍等于 pre-change oracle。Save/autosave outcome、boot recovery、调度语义和 public
export 均未改变；下一独立切片是 S1d.1。

### PF-D — Desktop durability/package promotion（独立、条件性发布轨）

执行 [Desktop persistence plan](2026-07-30-desktop-persistence-durability.md)：

Durability 子轨 D0–D3：

1. 建立 `HostAtomicRecordStoreV1` 共享 conformance 与 deterministic fault injection；
2. 用当前 file adapter 明确重现 multi-record crash partial 与 cross-process CAS 缺口；
3. 下一切片 D1b 在执行时 latest stable 上完成 SQLite operational decision；除非
   出现可复现的发布/运行 blocker，选择 SQLite，journal/manifest 与实验性 Deno
   KV 不再是必须先实现的平行比较；
4. 实现真正的 batch transaction、跨进程 optimistic conflict、reopen/recovery 与旧 JSON record 幂等导入；

Packaging 子轨 D4：

1. 先在当前 live 的 macOS `.app` 完成 build → launch → write → exit → reopen
   smoke；
2. Windows/Linux 在各自真实 OS runner 使用同一集成合同按平台独立
   promotion。

Platform target、output shape 与 promotion-report contract 定稿后，D4
即可独立启动，不等待 D0–D3。使用 preview/reference adapter 得到的 packaged
write/reopen smoke 只证明 packaging integration，不证明 durability。

当前 Desktop wrapper/file channel 是可使用的 preview；仓库外产品反馈可以决定
优先级，但不能成为源码、fixture、测试、构建依赖或 promotion evidence。File
adapter 在 PF-D promotion 前保持 `preview/reference` 身份；它的普通错误 rollback
和单文件 rename 不能作为 `HostAtomicRecordStoreV1` crash-atomic 的发布证据。

PF-D 可在 PF0 后独立启动，但**不是 PF1–PF6 / PF-DET 的默认串行 blocker**：只要
desktop 仍明确标为 preview，核心 production-floor 顺序从 PF1
开始。若某次发布要把某个平台的 desktop durability 或 packaging 晋级为
production，则对应 PF-D 子轨的 evidence 必须在该发布的 PF7
前完成。Durability、packaging 与 auto-update 各自独立记录；packager/updater
缺口不阻塞 backend durability promotion。若产品声称“packaged app 使用 atomic
persistence”，则 promotion record 同时引用已通过的 durability 与 packaging
evidence。PF-D 可以与纯 benchmark/fixture 准备并行；D0–D3 与 D4
也可在目标/报告合同定稿后并行，但 D4 不得同时改变共享 Host/Save/records wire
contract。PF-D 不得与 PF3 同时改变 `HostAtomicRecordStoreV1`、SaveRepository 或
records wire contract。

### PF1 — Snapshot baseline and digest dedup（已完成）

执行 [Snapshot plan](2026-07-30-snapshot-commit-performance.md) 的 S0–S2：

1. 先建立计数型性能契约与可重复 workload；
2. 复用相邻 command digest、短路 rejected/faulted、模式化 CommandLog 自检；
3. 去掉 autosave 对同一 Snapshot 的重复 digest/serialization；
4. 以 byte-for-byte 等价性证明 digest、CommandLog、debug bundle、Save 与 replay 没有语义变化。

完成 PF1 后再判断是否激活 `IntegrityPolicy` / changed-set design。不得因为路线图已经写了目标形状就直接实现模块摘要、结构共享或 ECS。

2026-07-30 promotion：S0–S2 的中性 workload、确定性计数、byte-equivalence
corpus、browser/prebuilt evidence 与同机趋势均已完成。结果只标记
digest/serialization dedup；四项 evidence gate 均未达到充分标准，
`IntegrityPolicy` / changed-set design 未激活。

### PF2 — Surface lifecycle kernel and one pilot family

执行 [Surface plan](2026-07-30-surface-contract-harness.md) 的
**S0 → S1d.1 → S1d.2 → S1d.3 → S1e → S1f → S2**，只迁移
**Workspace Overlay**。该序列已于 2026-08-01 完成；S1a–S1f 交付 S1-T，S2
完成首个 live family cutover：

1. 用现有 bug/trace 建立红测试；
2. S1d.1 让 binding-origin action fail closed，同时保持 direct untagged
   InputRouter fallthrough；S1d.2 先以 Coordinator-lifetime monotonic allocator/
   bounded cursor 取代 append-only retired-ID history；
3. S1d.3 冻结 global root slot、parent-scoped child slot，拆开
   modality/input/focus/navigation owner，并区分 publication 与 active-topology
   revision，先验收现有同步 transition；publication-only commit 不轮换未变化的
   input binding/`inputPublicationRevision`；
4. S1e 把 bounded identity cursor 与 composition-root-owned monotonic application
   epoch 组合并封闭 successor；S1f 建立按 transition kind 表达的 readiness；
   readiness receipt 绑定 epoch + candidate attempt（stable target 后续再加 source
   revision），相关 mutation 原子取消 pending，无关 revision 变化不误杀 candidate，
   并补齐 preparation/fallback/ready/failure/cancel 的 exact 双 revision delta table
   与 retain-current binding continuity；
5. S2 在 topology mutation 前完成 definition、definition contract
   revision、schema、renderer resolver、required port、parent 与 slot
   preflight；缺失直接结构化拒绝，不创建
   active-but-invisible instance，也不为 pilot 建通用 fault surface；
6. 同一 S2 cutover slice 把 Overlay 的 open/detail/back/close 写权迁入
   Coordinator，并删除或只读化旧 lifecycle authority；legacy adapter 只能把旧调用
   翻译为 Coordinator intent，或从 immutable publication 派生只读 view，禁止双写
   和异步 writable mirror；
7. 真实浏览器覆盖 Escape/backdrop/routed cancel、pointer click-through、keyboard、
   focus trap/restore、initial/replace/detail readiness 与可见 failure/cancellation/
   successor；malformed admission、direct disposal、exact revision 与 stale receipt
   identity/count 由 deterministic unit/headless harness 覆盖，不为 browser 暴露
   internal test hook。

2026-08-01 promotion：S1d.1 已让所有 binding-origin action 保留 package-internal
provenance，并经过既有 publication/gesture/Coordinator admission；current
unpublished action 现在返回 `surface.action_unpublished`，stale、rebind 与各类
dispose 后的 route 全部 fail closed，ordinary/lower handler count 为 `0`；被拒的
route 本身不再改变已有 publication（owner/Coordinator dispose transition 已先独立
提交）。direct untagged InputRouter event 仍保留 ordinary fallthrough。该批没有新增
public export 或 live Surface family。S1d.2 随后以 frozen finite resolved-owner
domain 与 current-epoch scalar allocation high-water 取代三个 append-only retired-ID
arrays；10,000 次 deterministic churn 从 `19,998` 个历史 tombstone 收敛为一个
`6,667` high-water、一个 live instance 和零 tombstone collection。unknown owner 在
allocation/publication/revision/subscriber 前拒绝，identity replay 与 component
forgery fail closed。S1d.3 随后把 root slot 改为 global scope、child slot 改为
exact-parent-instance scope，并让 cardinality 只来自 frozen resolved descriptor；
blocking/input/focus/navigation target 独立派生，Back/`closeTop` 不再从 input owner
反推。同步 topology commit、空 owner dispose 与 rejected/unchanged 的
publication/topology delta 分别冻结为 `1/1`、`1/0`、`0/0`；publication-only commit
复用同一 binding、registration 与 `inputPublicationRevision`，公共 InputRouter shape
和六字段 Surface action envelope 未改变。S1e 随后增加 package-internal lifetime
owner 与 Web realm-stable allocator cell：同 realm + application ID 的 epoch 严格单调，
新 realm 可从 `1` 重启；四类 successor 都在旧 binding/gesture/Coordinator 完整 cleanup
后才 allocate/construct/open ingress。两代 local sequence 可同时从 `n1` 开始而 compound
identity 不复用，旧 handle/action/gesture 分别稳定 stale 且 lower handler、publication
mutation 与 notification 均为 `0`。runtime 不暴露 whole-generation Coordinator
`dispose()`，reentrant handoff 与 cleanup/allocation/construction failure 均 fail closed。
在该 S1e commit 时仍未实现 readiness 或 live Surface family，allocator/lifetime
也尚未接入真实 startWeb/HMR caller；后续 S1f/S2 在各自独立提交中关闭这些缺口。

S2 只依赖 S1-T，全部 Overlay target 都是 Coordinator-owned transient target；它不
等待 S1-R，也不得为了统一形状预埋 source publication revision、stable-target
reconcile 或参数等价字段。本切片明确不实现 application-level end-to-end
receipt、弱模型战役、全 surface fuzz explorer，也不迁移 System/Narrative。若同一
cutover slice 无法消除 Overlay 双重 writable authority，停止并修订设计；pilot
失败时必须可以删除 Coordinator 而不留下双写。

**2026-08-01 PF2 promotion：** S1f 已冻结 transition-kind readiness、fresh attempt
identity、fallback/retain-current、failure/cancellation/stale receipt 与 exact revision
delta；S2 随后只把 exact-ID transient Workspace Overlay 接入该 kernel。definition、
contract revision、schema、renderer、concrete required port、parent 与 slot 在 mutation
前 admission；initial/detail fallback 不挂载 Story content，replacement 在 ready 前
保留旧 DOM/focus。Web composition 使用 realm-stable per-application epoch，load/import
anchor 与 HMR/rebootstrap successor 在 ingress 前 dispose predecessor；epoch 不进入
Save。

Coordinator 现在是 Workspace Overlay 唯一 writable lifecycle authority。
`OverlaySessionStoreV1` 只做 direct intent delegation 与同 publication 的 immutable
derived view，旧 independent writer/factory 已删除且没有 async mirror。compatibility
facade 只在 typed intent surface 尚未覆盖 primary/detail/back/close、direct-composer/
Engine Lab/debug-read consumers 尚未全部迁移时保留；此期间不得扩张第二套 lifecycle
语义。普通 close 只取消 topology-related preparation；Overlay 的 package-internal
owner-preparation variants 则把 exact/current close 与该 owner pending cancellation
合并为一次 commit，candidate-bound fallback dismiss 不依赖 ready-only owner handle。
Engine Lab 中性 rig 的真实浏览器行覆盖 native/routed dismissal、pointer
click-through、keyboard/focus、三类 readiness/failure、candidate cancellation、epoch
successor 与 late ready/failure；malformed admission、direct disposal 与 exact
identity/count 留在 deterministic unit/headless。最终 aggregate
`210 files / 1994 tests`、engine browser `101/101`、
examples `45 passed / 2 skipped`、prebuilt `38/38` 与 `deno task check` 全绿。

该 promotion 没有实现 S1-R、System、Narrative/History、whole-canvas、通用 fault
surface 或 application-level receipt，也没有改变 Save/digest/replay/persistence wire
语义。默认 core 下一独立切片是 PF-DET `DET0-core`，不是 PF4 S3。

### PF-DET — Authoritative determinism guardrails

PF2 pilot 通过后，Determinism 与 Save 按以下跨计划 DAG 执行，不能再解释为
“完整 PF-DET 后才开始全部 PF3”：

```text
DET0-core
  -> M0a shared Save-metadata floor
  -> DET1 -> DET2a -> DET2b -> DET2c -> DET2d -> DET2e  [DET-A]
      ├-> DET3a -> DET3b -> DET4                         [DET-B]
      └-> M0b -> M1 (strictly callback-free)
                    join on the same merged HEAD
                    -> M2
```

当前 corrective gate 追加在旧历史顺序之后，不重做 DET0–DET2：

```text
historical DET3a -> DET3b -> DET4
  -> C0 contract reset
  -> C1 import/loader admission
  -> C2 Date/String/provenance
  -> C3 Base UTC isolation
  -> C4 cleanup + DET3b invariant revalidation + DET4 full re-promotion
  -> PF-DET corrective closure
```

[Determinism plan](2026-07-31-authoritative-determinism-guardrails.md) 的
DET0-core/DET-A/DET-B 负责：

1. 用中性 fixture 固定 raw/mutable bootstrap handoff、permissive
   command/evidence 的 late admission、replay command 漏口与 xorshift32 zero
   absorbing state；
2. runtime 拒绝 zero seed/restored cursor；若发现被承诺维护的 zero-state Save，
   因无法恢复原 non-zero lineage 而停止并请求明确兼容性决定；同一 fixed
   zero-state Save 还必须作为 `auto.current` 走 `resumeFromAutosave` boot
   integration，证明 fresh bootstrap/Session/replay base、lease/persistence anchor
   与 stable diagnostic 保持正确；
3. normalized game/debug command 在 executor 前 canonical admission，完整
   facts/rejections/fault/RNG evidence 在 Snapshot/RNG install 和 CommandLog
   append 前、candidate Snapshot freeze/post-digest 前 finalization；合法
   bytes/digest/Save/replay 与 PF1 Snapshot digest/freeze count 不回退，新增
   admission canonical traversal 另行 purpose-tagged 计数；
4. Strict JSON 在 binary64 转换前按 token 精确数学值拒绝“舍入成整数”的小数，同时
   保留 `1.0` / `1e0` 等数学整数写法，不改变 canonical output/digest；
5. 把 Story-owned `createBootstrapInput` 定义为只消费 injected
   `BootstrapEntropyV1` 的 composition-root ingress adapter；Core 在
   `createInitialState` 前对整个 output 做 package-internal canonical projection
   admission，并只 deep-freeze engine-owned projection；所有 initial-Snapshot 路径共用
   同一个 admitted projection，admission 不冻结或保留 raw adapter output，不新增 public
   bootstrap schema/envelope；新增 bootstrap canonical/freeze traversal 单独
   purpose-tagged 计数；
6. 收紧 live bounded helper：Event Pool 在 forced/ordinary 两条路径都拒绝
   invalid context number 与逐步 `totalWeight` overflow；Content Database
   authoritative order 使用明确 code-unit/numeric comparator，不读取 Host locale
   或用可能越过 safe integer 的 subtraction；Game Authoring Kit
   transaction/apply ordering 同样改用 canonical code-unit comparator，并分类所有
   其余 `localeCompare` callsite，凡影响 authoritative bytes/order 或 stable
   diagnostics 的都在 DET2e 以 fixed vector 收口；DET2e 只在 Deno 冻结可复用的
   order/draw/apply pure vectors；
7. 从 root registry fail-closed 枚举应用，以 BuildIdentity managed simulation
   records 为 seed，并补齐实际 simulation callback owner 与显式 authority
   entries；同时用有界显式 entries 覆盖 Base Session/executor/RNG/replay
   closure。增加独立 determinism lint，保留 Oxlint，不固定 Deno patch，不全仓库
   禁止合法 Host/Presentation；
8. isolated test-only realm 捕获 direct entropy/clock/network/environment/
   locale-default/DOM ambient access，不能污染 Player realm 或冒充 sandbox；
9. 同一中性 test-only authoritative transcript 在 Deno、Chromium、Firefox、
   WebKit 逐 command 比较 outcome、facts/reasons/fault、RNG、sequence、pre/post
   digest 与 log/replay evidence，并报告第一处分歧；fixture 必须含显式
   deterministic fault 和必然触发 rejection sampling 的受控 vector，production
   check CI 显式安装 lock 对应的三种 browser；DET4 在四 runtime 直接执行 DET2e
   已由 Deno 固定的 exact order/draw/apply vectors，不复制或重生成 expected。
10. corrective static proof 只接受 Date conservative syntactic safe-set、StaticString 与
    exact-singleton local provenance；definition-level diagnostic precedence 为每个 maximal
    chain 选择唯一 primary winner，unknown/cycle/budget 均 fail closed；
11. parser-backed collector 唯一拥有 unsupported dynamic `import()` pre-lint failure，
    type-only edges 不进入 runtime closure；rule core 唯一拥有真实 CommonJS/
    `createRequire` 的 `determinism.capability.dynamic_require` failure。任一 admission
    failure 不发布 partial
    closure、provenance 或 success receipt；
12. C3 Gregorian/UTC semantics 只治理 Save `savedAt`、Debug Bundle `generatedAt`、
    runtime-fault `occurredAt` 与 Host-facing export filename timestamp 这一 wall-clock metadata
    family；gameplay time 保持 Story-owned canonical State/Command，现实时间只有经 Host 在
    authoritative transition 外采样为 bounded/versioned canonical command/resource 后才能影响
    玩法，replay 不重读 wall clock。C2 static Date proof 不因此成为 gameplay calendar；
13. corrective DET3a 后必须复核 DET3b guard inventory 并完整重跑 DET4 四 runtime matrix，
    旧 aggregate record 不能自动关闭新合同。

PF-DET 不引入 `decimal.js`、通用 numeric package、named/keyed RNG、trace V2、
production Simulation Worker、untrusted Mod 隔离或 universal application
receipt。当前没有 `faultSchema`；若 DET2b 不能通过 package-internal finalizer 与
现有 stable fault policy 闭合，或需要改变 public
Session/Simulation/CommandLog/fault contract，停止并修订 design，不借机扩张
Surface receipt。若 DET2d 需要新增 public `GameSimulation` revision、bootstrap
schema/envelope，或改变合法 initial Snapshot/Save bytes，也同样停止并提交
contract decision。

DET-A 完成只允许 callback-free Save lane 分叉，不等于完整 PF-DET promotion；只有
DET-B 通过后才能更新 live capability 或 PF7 promotion。PF2 不依赖 PF-DET；把它放
在 pilot 后，是为了保持 Overlay 单 authority 切片不混入
Base/tooling/browser determinism 改造。

DET-B 用 synthetic callback 冻结可追加 authority entry 与 pure-vector runner，
不伪造 production migration registry。M2e 首次注册真实 State migration时已完成
live recollection、加入同一 static/tripwire scope并扩展四 runtime matrix；以后每个新
migrator 也重复这项认证，不能把 PF-DET 当作一次性完成。

**2026-08-01 DET0-core promotion：** root-registry authority collector、dedicated
Story callback owners、bounded Base/Save projector entries、Host/Presentation negative
controls、四类中性 command workload、bootstrap/late-admission/replay/zero-RNG/
Strict-JSON/Event-Pool/locale-order characterization，以及 Deno/Chromium/WebKit exact trace
已经完成。当前 observation 为 `5` 个应用、`61` 个 managed records、`102` 个去重
authoritative paths、`0` 个 production Save projector；这些是 live recollection 的
本次结果，不是冻结 inventory。DET0 只加 observation，没有修复已证明的 deterministic
缺口，也没有改变公开 canonical/digest/Save/replay 语义。详细 counts、byte oracle、
atomicity、exemption 与 deferred runtime matrix 见 determinism plan 的 DET0 promotion
record。跨计划下一切片现为 Save `M0a`，不是 DET1；M0a 合并后才回到 DET1。

**2026-08-01 M0a promotion：** revision `1` 的 shared Save-metadata corpus 已成为
annotation/summary/note、capture-origin `versionStamp`、unstamped/stamped raw bytes
与 fixed-clock Host payload 的唯一维护权威。PF1 unstamped bytes/SHA 未重生成且无
漂移；14 个 valid metadata variants、negative normalization、exact callback/collector
counts、receipt/fallback equality、round-trip、lease fence、stale rewrite 与
post-commit failure/retry 已固定。该批没有改变生产 codec/canonical/load order 或
公开 Save/replay semantics，也没有 migration callback/registry、browser/filesystem 或
private-project dependency。该批完成后 core 回到 PF-DET `DET1`。

**2026-08-01 DET1 promotion：** xorshift32 的 zero absorbing state 已从 seed、
restored Snapshot、Save/load/import、Debug Bundle，以及 standard Core 的
authoritative replay / game/debug candidate admission 中 fail-closed 拒绝，稳定 code
为 `rng.invalid_state`；未发现承诺维护的 zero-state compatibility corpus，因此没有
静默 reseed 或 migration。合法 Snapshot/digest/Save/replay bytes、algorithm/draw
order 与 PF1 traversal 合同保持不变。默认 core 下一独立切片现在是 PF-DET
`DET2a`。

**2026-08-01 DET2a promotion：** schema 成功后的 public
Session/Simulation/CommandLog command ingress 与 authoritative replay 已有
engine-owned canonical admission；root `CanonicalJsonError` 公开稳定 `code/path`，
command-only mode 拒绝 canonical bytes 未表示的 symbol/array-extra/custom-array-
prototype members，同一次 traversal 构造 byte-identical、path-local ordinary projection，
随后只递归 freeze/交付该 projection；admission 不冻结或保留 upstream normalized identity，
而 schema helper 的独立 output-freeze contract 不变。exact-target
one-shot internal receipt
让一次 Session/replay operation 只做一次 command traversal，并阻断独立嵌套 ingress
借用；authoritative replay 先 capture 全向量 source/command，再逐 entry runtime-check
`game | debug` source、prepare admitted command projection，全部成功后统一 freeze；失败不
构造 driver，best-effort 仍 ungated。合法 canonical/digest/Save/replay
bytes 与 PF1 Snapshot digest/freeze purpose counts 保持不变；新增成本已由 command
admission/freeze purpose 独立计数，标准 Session 的 additional CommandLog metadata purpose
为 `0/0`；只有 direct generic extras 才条件性新增 `1/1`。256-command recording 为
`170/170 -> 426/426`，
retained-200 replay 为 canonical `3409 -> 3609`、freeze `0 -> 200`。latest-stable
Deno `2.9.4` 的 focused/Base/full unit 与 `deno task check` 全绿；Host-neutral 改动没有
追加浏览器 E2E。默认 core 下一独立切片现在是 PF-DET `DET2b`。

**2026-08-01 DET2b promotion：** Session、independent CommandLog、Standard Core
authoritative replay、Debug validation 与 attempt-shaped direct Simulation result 已有
package-internal finalized-evidence admission；fact/rejection/debug-error 走既有 schema，
fault/RNG/receipt 走 exact shape + Strict Canonical Data。Standard Core 保留 zero-RNG
precedence，Session 在 post-callback 与 post-finalization 两处执行 HMR fence；valid fault
fallback 只记录一次，invalid/non-faulted fallback 不递归 normalizer。Session→CommandLog
handoff 绑定承载 evidence projection 的 exact admitted-attempt identity，不重复 traversal；
upstream normalized evidence 不被 admission 保留或冻结，schema helper freeze 与 Snapshot
identity 是明确例外。opaque `GameSimulationV1`
generic result 与 public
Save/CommandLog/replay shape 均未改变。每 attempt 新增一次 Snapshot-free evidence
canonical/freeze；256-command recording `426/426 -> 682/682`，Snapshot digest `170` 与
continuity `256` 不变。latest-stable Deno `2.9.4` 的 focused `7/211`、Base `73/834`、
full unit `218/2162` 与 `deno task check` 全绿；Host-neutral 改动未追加浏览器 E2E。默认
core 下一独立切片现在是 PF-DET `DET2c`。

**2026-08-01 DET2c promotion：** Strict JSON number token 现在在 binary64 value
admission 前按 decimal coefficient/scale/exponent 精确分类；rounded fractions、真正
negative zero 与 exact unsafe integer 分别使用既有 stable code，合法 alternate integer
spellings 仍 normalization-equivalent。`maxBytes` 是唯一 token resource bound；为保留旧
compound-input precedence，exact-rejected fraction 只可额外做一次 byte-bounded legacy
classification，不参与 admission/value/bytes。M0a fixed Save corpus、Save/DebugBundle
canonical bytes/digests 与 PF1 state digest 均未改变；focused `6/132`、Base `73/877`、
full unit `218/2205`、`deno task check` 与 Engine Lab browser `103/103` 全绿。默认 core
下一独立切片现在是 PF-DET `DET2d`。

**2026-08-01 DET2a/DET2b contract repair：** command 与 Snapshot-free evidence admission
不再自行 freeze 或保留 upstream raw identity；原一次 canonical traversal 同时生成 byte-identical path-local
ordinary projection，executor/CommandLog/replay 只共享该 admitted projection，Snapshot
identity 明确保留。该选择封闭 Proxy/private/WeakMap raw-identity state，且不形成第二
authoritative value；schema helper 可能已按自身合同冻结 output。Evidence collection 以一次
own length descriptor capture 固定 vector。direct CommandLog extras 条件性独立
project/freeze（标准 path `0/0`），engine-owned field collision 同步拒绝；authoritative
replay 还在 command projection 前 runtime-check captured source，并对合法 `null`
projection 不重读 slot。
public canonical hot path、合法 canonical/digest/Save/CommandLog/replay bytes 与 PF1 counts
保持不变；focused `12/289`、Base `73/899`、full unit `218/2227`、`deno task check`、Snapshot
benchmark deterministic counts 与 browser `103/103` 全绿。DET2d 的 active contract 已同步
采用相同 projection ownership；该 repair 完成时下一切片仍是 `DET2d`，后续状态由
下面的 promotion record 继续推进。

**2026-08-01 DET2d promotion：** Standard Core construction、queued restart 与
captured extension initial-Snapshot helper 现在共用一个 package-internal canonical
bootstrap admission。每次 ingress 从 adapter raw value 构造 path-local ordinary
projection并只 freeze 该 projection；seed descriptor-read/parse 一次，同一 frozen
identity 进入 root 与 stateful module initializers。adapter/canonical/freeze/seed/Story
failure 保持既有 public channel、HMR precedence 与 no-install atomicity；无 public
bootstrap schema/receipt/hook，合法 initial Snapshot/State digest/quick Save bytes 与
PF1 benchmark counts 不变。latest-stable Deno `2.9.4` 的 focused `3/133`、Base
`74/947`、full unit `219/2275`、`deno task check` 与 Engine Lab browser `103/103`
全绿；默认 core 下一切片推进为 `DET2e`。

**2026-08-01 DET2e / DET-A promotion：** Event Pool 完整 context number admission 与
逐项 total-weight overflow 已在 ordinary/forced 结果和 RNG 前 fail closed；Content
Database numeric/string order、Game Authoring Kit staged transaction/dependency order 与
Simulation cycle diagnostics 已切换到明确的 relational sign / UTF-16 code-unit
semantics。DET0 分类的 `5` 个 authoritative/stable locale callsite 已清零，`4` 个
Host/tooling/test negative control 不变；direct-file Deno pure vector 固定 Event Pool、
Content DB、candidate Snapshot、CommandLog 与 authoritative replay，未来 DET4 必须直接
复用。maintained Save/replay/diagnostic corpus 与 PF1 oracle bytes/counts 不变；latest-stable
Deno `2.9.4` 的 focused `8/89`、Base `75/958`、full unit `220/2286`、
`deno task check` 全绿。DET-A 至此关闭，但不构成完整 PF-DET、也不注册 migrator；
callback-free M0b/M1 fork 现在合法，当前线性 core 选择先进入 `DET3a`。

以下 DET3a–DET4 记录属于 superseded broad static contract。测试数字、byte-equivalence 与
runtime infrastructure evidence 保留；其中“active contract”“gate closed”“PF-DET closed”
只描述当时 checkpoint，不表示 corrective target 已实现。

**Historical DET3a promotion — superseded contract（2026-08-01）：** required browser-free check 现在每次从 root registry
重建 `5` 个 application 的 managed/callback-owner closure，并合并 `27` 个 bounded/
entry-only Base authorities、`0` 个 production Save projector 与一个 synthetic
migration extension；当前 exact vector 为 `107` 个去重 source paths（不含 synthetic
时 `106`），而不是 frozen inventory。canonical bootstrap admission 已成为显式 Base
entry；negative-control entry 必须使用 exact canonical repo-relative spelling 并存在于
自身 live closure。bounded Base closure 命中 classified Base negative-control entry，或 Story、Base、
Save projector、synthetic/additional authority 的完整 merged path vector 命中 `17` 个
classified negative-control entry 中任一个，都会在 lint 前 fail closed；不要求
negative-control closure 的其他 deterministic dependency 与 authority closure 全面 disjoint。

唯一 AST rule core 覆盖 ambient entropy/clock/network/provider/environment/locale/DOM、
ambient capability-root escape，以及 fractional/negative-zero literal、`parseFloat`、
approximate Math/`**`；alias、destructure、computed/globalThis、lexical shadow、
type-only/versioned provider、runtime-bearing TypeScript 与 standard decorator expression、
exact-decimal spellings都有 fixed contracts。bare ambient roots 不得通过 capture/pass/
return/export 绕过逐文件 provenance；Date constructor/now/parse/UTC 按 callable identity
区分，`call`/`apply` 保留 parse/UTC identity，`bind` 按 capability capture 拒绝。
`createBootstrapInput` 只有由 exact `@sillymaker/base`
named import 验证的 `BootstrapEntropyV1` 参数可 direct 调用两个 capability 方法；local
import alias 合法，其他 import 来源、lexical type shadow、未验证参数、capability
alias/return/pass 与 closure escape 均失败。当前 closure 唯一需要的 `7` 个 numeric
exemption 都是以 `Object.is(..., -0)` 识别并拒绝 invalid input 的 admission guard，
分布在 canonical JSON、Event Pool、Strict JSON 与 value parser；每个 directive 都
绑定真实 `*.test.ts#vector-id`，且对应文件恰好含一处 exact
`sillymaker-determinism-vector` `CommentLine` marker；template/string text 不能伪造。
evidence test 不加入 authoritative closure，
ambient diagnostics 不能豁免。

repo-owned Deno runner 对 exact paths 各读取一次，稳定分类 read/unsupported/parse
failure，冻结并按 UTF-16 file/range/code 排序；`check:determinism` 已进入普通
`deno task check`，Oxlint 仍是 general lint。首轮 authority-map red 为 `3/7`、
rule-core scaffold red 为 `54/79`、runner red 为 `6/7`；多轮 adversarial red 继续覆盖
`18/144`、`1/17`、`13/141`、`2/18`、`13/161` 与 `8/171`，最终 focused green 为
`3 files / 189 tests`，live closure clean；latest-stable Deno `2.9.4` 的 Base suite 为
`75 files / 958 tests`，repository full unit 为 `222 files / 2470 tests`，
`deno task check` 全绿。由于 browser/runtime graph 未改变，没有机械追加 browser E2E；
canonical check 已包含 Engine Lab production build。本批没有 runtime/public API、canonical/
digest/Save/replay bytes、migration registry 或 browser bundle change；DET-B 尚需
DET3b/DET4，当前线性 core 下一切片是 `DET3b`。

**Historical DET3a adversarial correction promotion — superseded contract（2026-08-02）：** promotion 后的
独立 review 先以 `8/181`、`13/195`、String-wrapper `3/202`、`10/216` 与 `7/223`
red 补出 source-local recorded Date Host-timezone/default-rendering、known-Date dynamic
member、Deno `Temporal.Now`、bare Node provider subpath/loader wrapper、ambient constructor
wrapper/destructure、`+=` 与 capability capture/use precedence，并移除 blanket
`.constructor`/`Temporal` false positive。随后 syntax-aware import/callable/coercion 批次以
`3 files / 22 failed / 249 passed` red 固定 comment/string import lookalike、literal 与
nonliteral dynamic ESM import、全部 unshadowed CommonJS loader、Date constructor identity、
exact callable target 和 String coercion；Date safe-set/provenance 批次再以
`3 files / 12 failed / 271 passed` red 固定 input classification 与 conservative join。
promotion self-review 再以 `2 files / 31 failed / 300 passed` red 固定 Date proof descendant/
callable-unknown join、String static spread/dynamic apply/array-like raw、`.cjs/.cts` ESM closure、
runtime TS import-equals、erased/no-init loader fake shadow 与 bare `module` escape。
最终 adversarial 扩展继续固定 operation evaluation、Date implicit `ToPrimitive`、tagged
wrapper、`String.raw` effective substitution/prototype carrier、tracked intrinsic write、
order-independent root/closure provenance、stable lexical scopes、transparent TS wrappers 与
`ClassAccessorProperty` computed key。

当时 promoted、现已 superseded 的 contract 按 operation 区分 Date proof。`new Date(arg)` 只允许 TimeClip
范围内 integer epoch literal/immutable `const` alias、recognized `Date.UTC` result、verified
`Date.parse` result、exact known Date-instance value copy，以及经 Gregorian field/time/offset
校验的 explicit-zone literal/immutable alias；explicit spelling 固定为
`YYYY-MM-DDTHH:mm:ss` + optional exact `.sss` + `Z` / `±HH:mm`。`Date.parse`
direct/call/apply 只允许 exactly one explicit-zone proof；`Date.UTC` direct/call/apply 是
deterministic epoch producer。multi-argument local-field 或 validated zone-less date-time
literal/immutable alias 报 Host timezone；dynamic、mutable、其他 spread、malformed、unsupported
或 ambiguous input 报 `determinism.date_input_unverified`，`new Date(...[])` 是 zero-argument
clock。runtime-producing receiver/callee、input/spread、template substitution 与 computed
property key 先按求值语义检查，再分类 enclosing operation；`call`/`apply` 保持 recognized
identity，`bind` 是 capability capture。known Date 的 local/default String rendering、需要
object-to-primitive 的 abstract equality、computed property key 与 `in` 左 operand 报 Host
timezone；known non-coercing equality 不新增 Host-timezone，operand 自身 diagnostic 仍保留。
Host-dependent method 只有 exact Date receiver 的 terminal direct/call/apply 才报 Host timezone；
`.bind`、Date member/ambiguous descendant 或同名 descendant 因无法证明该 Host operation 已执行，
只报 capability escape，dynamic member 同样 fail closed。

String effective vector 保留 holes、展开 static literal spread，dynamic spread/apply 按
capability escape；recognized String/Date tagged-template direct/call/apply wrapper 静态模拟实际
tag-call arguments，invalid/nested wrapper fail closed。`String.raw` 检查 static array-like raw
elements，但只检查 `raw.length - 1` 个 effective substitutions；statically proven primitive/
null `__proto__` setter 不提供 inheritance，可能继承 `raw`/index 的 carrier 则 fail closed。普通 custom tag 只
接收 value。tracked ambient capability/intrinsic root/member 与 Date instance/prototype 的 direct assignment/
destructuring/update/delete/`for in/of` write 直接 capability fail-closed；reflection mutation
仍归 DET3b；non-reference `delete` operand 保留 ordinary expression evaluation，只有 identifier/
member reference 进入 write-target classification，且不把旧 member value 当普通 read。lexical
shadows 合法；`for in/of` 按 RHS/target/body 顺序检查并 conservative
invalidate local target；准确顺序是 RHS、write-target/pattern runtime evaluation、local
target unknown-provenance join、body，不能把 left 当作普通 read。transparent TS wrappers
（包括 `as`、non-null 与 `satisfies`）与 `ClassAccessorProperty` initializer/computed key 进入
同一 runtime traversal，Class StaticBlock/runtime namespace 保持独立 var boundary，整个 Switch
共享一个 lexical scope。

source-local conditional/logical expression 与 reassignment 使用 path-insensitive conservative
provenance join；Date callable 与 different/unknown candidate 必须变成 ambiguity，不能晋升
verified epoch。root 与已发现的 source-local closures 通过有界单调 central worklist 收敛到
order-independent fixed point，只有 final conservative replay 发布 traversal diagnostics，不能
收敛则 fail closed。function return/container/reflection 仍归 DET3b，不宣称 sound whole-program
analysis 或 sandbox。

closure collector 现在跨 `.ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs` 只认可 syntax-aware
static ESM import/export 与 literal `import()`；nonliteral `import()` 令 low-level collector
返回 error，authority/BuildIdentity admission 在 lint/record 前原子失败，不能发布 partial
vector。当前没有 CommonJS dependency graph，因此所有 unshadowed CommonJS loader use、
runtime TS import-equals 与 bare `module` escape 都直接拒绝；erased `declare`/no-init CommonJS
var 不伪造 shadow，只有 actual runtime lexical shadow 合法。本 correction 还把
Base persistence export filename 的 Date parsing/formatting 改为 package-internal pure integer/
string helper，并用 fixed vectors 保持既有 filename normalization；它不改变 Save envelope、
canonical/digest、CommandLog 或 replay bytes。

focused green 为 `5 files / 573 tests`，Base 为 `75/958`，tooling 为 `23/193`，repository
full unit 为 `222/2784`。首轮 full unit 只有两条 live repository scan 在全套并发负载下
超过 Vitest 默认 5 秒；四条 checker scan 统一采用 30 秒通用 timeout 后，同一断言均通过。
第二轮 adversarial correction 又令一条 authority-map transitive scan 超过原有 15 秒预算；
把该 live repository scan 同样统一到 30 秒后全绿。timeout 调整没有改变断言，也不是性能
验收门。新增 adversarial corpus 后的最终 `deno task check` 全绿，覆盖 format、lint/stylelint、
typecheck、live determinism closure、`222/2784` full unit、assets、全部 Story admission 与 Engine
Lab production build。本批修改 Base runtime persistence export filename 的 package-internal
formatter，因此此前已追加 Engine Lab browser E2E，`103 tests` 全绿。DET-B/PF-DET 仍需
DET3b/DET4；本 correction gate 已关闭，下一独立切片是 DET3b。

**Historical DET3b promotion record — runtime infrastructure remains live；corrective invariant revalidation completed by C4（2026-08-02）：** Engine Lab 的 test-only `e2e/src/testing/**` 现在
拥有 pure guard harness、parent runner、短命 module Worker 与 browser-executable neutral
driver。guard registry 在 dynamic import 前按固定顺序完成 descriptor replacement、
effective self-test 或重复 native-absence probe；失败以首个 `tripwire_unavailable` 且
driver import/run `0/0` 结束。全部 guard 成功后才 arm；首个 violation 在抛 sentinel 前
latch，优先于随后 import/run failure，被测代码 catch 不能吞掉。protected-slot reflection
mutation 归 capability escape；malformed request/receipt 或 message transport validation
与 Worker error/timeout 只发布 `driver_failed.protocol | driver_failed.worker` 的空 coverage。
每个 terminal path exactly-once
terminate，realm 内不 restore global。

realm 外 fixed bootstrap input 被 Base neutral workload 实际用作 Session/RNG seed；
no-draw、RNG、rejected 与显式 faulted 四类 compact trace 等于既有固定 expected。driver
通过窄化的 Base testkit subpath 保持 closure 不含 Web、UI、application Host、persistence
composition 或 Presentation bootstrap，普通 Player/main page 与 production Simulation
lifecycle 不受影响。本批未改变 canonical/digest/Snapshot/Save/CommandLog/replay 或公开
runtime semantics。真实 Deno isolated realm 与 pure browser descriptor/install harness 已
覆盖 DET3b，但尚未建立真实 browser tripwire、dedicated Playwright config/task、三浏览器
安装、CI job 或四-runtime parity；紧随其后的 DET4 implementation 与 promotion
verification 已补齐并关闭这些缺口。

**Historical 2026-08-02 DET4 / DET-B / PF-DET promotion — superseded static contract：** 独立 test-only matrix/comparator 在
不扩张 DET0/DET3b 窄 tripwire closure 的前提下，组合一条四-command authoritative
transcript/replay、DET2e ordering vectors 与 M0a Save-metadata pure vectors。Base 的窄
`@sillymaker/base/testkit/determinism-vectors` subpath 复用原 owner 的唯一 expected；
synthetic `summarizeSave` callback 证明 State-to-summary normalization，没有复制或重生成
ordering/Save oracle。同一 Session 按 no-draw、rejection、RNG、fault 顺序执行，累计
四条 retained CommandLog entries（ordinals `1..4`），sequence 为
`0 -> 1 -> 1 -> 2 -> 2`；逐 command
trace 与一次 `executedEntries = 4` 的完整 authoritative replay 来自同一 run，并比较
跨 entry digest/RNG/sequence continuity。Session 的 RNG seed
`1_236_431_772` / max `7` 令 rejection 与后续 RNG commit 使用同一受控 vector：首 raw
`4_294_967_292` 等于 rejection limit，次 raw `1_015_932` 被接受；前者 rollback，后者
commit。first-divergence evidence 固定 project、repeat、vector、command
ordinal/identity、sequence、JSON pointer 与 expected/actual。self-review 的 P2 red 证明
entry-scoped replay mismatch 丢失 command context；green 后 comparator 通过 `logOrdinal`
回映 transcript command，global-scoped mismatch 的 command context 保持 `null`。

Deno、Chromium、Firefox、WebKit 各执行两个 repeat。dedicated tasks、Playwright config
与 latest-stable CI job 已落地；job 在 `deno ci` 后安装 lock 对应的 Chromium/Firefox/
WebKit，再运行 aggregate matrix，普通 `deno task check` 与 UI suite 保持 browser-free/
不含 Firefox。此前 fresh one-command candidate 的测试结果不构成本合同的 promotion
evidence；修正后的 latest-stable Deno `2.9.4` evidence 为 focused `3 files / 21 tests`、
Base `76/962`、Engine Lab headless `22/120`、full unit `225/2825`、dedicated Deno matrix
`3/3`、三 browser 各两个 repeat 合计 `6/6`、普通 Engine/UI browser `101/101`，以及
typecheck、`check:determinism`、最终 `deno task check` 全绿。最终 check 的 format phase
检查 `883 files`，并覆盖 lint/stylelint、typecheck、static determinism、unit、assets、
Story checks 与 build。workflow 已配置 determinism job，但不能自证远端 branch-protection
已把该 status 设为 required。本批不改变 canonical/digest/Snapshot/Save/CommandLog/replay
或 production Browser Agent surface。DET4/DET-B/aggregate PF-DET 在当时合同下关闭，并使
Save `M0b` 可领取；M0b promotion 见下。在该 promotion 时，`M2` 仍必须等待 M1 与 DET-B
在同一 merged HEAD 通过 join gate。本 closure 随 corrective target 接受而 reopen；下方 C4 record 已按新
acceptance vectors 重跑 DET3a–DET4 并恢复 aggregate closure。

**2026-08-02 Save M0b promotion：** 中性 generated current-load matrix 已冻结
post-DET-A current codec/validation/repository/Player 结果、stored/import 分叉、atomic
install/no-write、recovery/export 与 M0a metadata preservation。它没有增加第二份 byte
golden。并发 Core load/import 的旧标量 origin race 由 exact queued replacement-commit
binding 修复：red observation `["import", "replacement"]` 现在固定为
`["load", "import"]`；package-internal WeakMap seam 未进入 barrel，原 runtime-control
identity 与 PF1 digest cache 保持，restart 后 save traversal 固定为 `2`。focused
`3/158`、Base `77/970`、full unit `226/2833` 全绿；canonical JSON/digest、Save bytes、
Player load/import/replay semantics 与 browser config 均未改变。该历史 checkpoint 的下一
独立切片曾为 Save `M1`；corrective gate 接受后 M1 保持暂停。

**DET3a-C0 acceptance（2026-08-02）：** owning design、active plan 与本文完成
conservative contract reset；没有修改 implementation 或 live capability。

**DET3a-C1 promotion（2026-08-02）：** runtime-vs-type-only import closure、exact
direct-literal dynamic-import admission 与统一的
`determinism.capability.dynamic_require` 已按 active plan 落地。collector/rule-core/checker
focused 为 `4 files / 564 tests`，affected tooling + determinism suites 为 `26/747`，full unit
为 `226/2880`，`deno task check` 全绿；独立审查补闭 parenthesized import、static
createRequire-capable capture 与 computed/rest namespace provenance。`development.md` 已同步，
`features.md` 保持到 C4。
该批不改 public/runtime/Save/canonical/digest/CommandLog/replay 或 browser graph。当前下一
独立切片为 `C2`，随后为 `C3`、`C4`。

**DET3a-C2 promotion（2026-08-02）：** conservative Date/StaticString safe-set、exact
KnownDate terminals、constructor/dynamic failure precedence、exact-singleton alias 与 atomic
cycle/budget failure 已按 owning design 落地；risk-only callable proof 不会扩大 safe allowance，
exact-alias invalidation 的 adversarial traversal 保持 deterministic linear step count。最终
rule-core 为 `1/839`，determinism suites 为 `3/860`，full unit 为 `226/3187`，
`deno task check` 全绿并完成 Engine Lab production build。`development.md` 已同步，
`features.md` 保持到 C4；该批不改 public/runtime/Save/canonical/digest/CommandLog/replay 或
browser graph。当前下一独立切片为 `C3`，随后为 `C4`。

**DET3a-C3 B-prime contract amendment（2026-08-02）：** C3 以 repository-owned strict
persistence/diagnostic `IsoUtcInstant` corpus 收敛 runtime-dependent validation，同时保留 accepted
原 spelling、maintained-valid bytes、现有 rejection/atomicity 与独立 loose filename overflow
policy。两条 policy 只共享 internal lexical/calendar primitives；persistence 的 arbitrary fraction、
exact-zero `24:00` 和 filename normalization 不进入 C2 authoritative Date proof。maintained Save
fixture 扫描未发现 newly rejected malformed timestamp，migration stop 未触发；C3 尚未因此
amendment 被宣称完成。

**DET3a-C3 promotion（2026-08-02）：** Base strict timestamp admission 与 loose legacy filename
policy 已分离到 package-internal integer primitives，Host `Date.parse` 从 Base 路径移除；valid
Save/Debug Bundle bytes、公开 rejection mapping、Player atomicity、filename overflow/year-edge 与
C2 safe-set 均由 focused evidence 保持。最终 focused `7/135`、Base `78/975`、full unit
`227/3192`、Chromium/Firefox/WebKit `6` 个 repeat cases 及 Deno matrix 全绿；maintained Save
corpus 未触发 migration stop。无 production public helper、format revision、canonical/digest、
CommandLog 或 replay change；existing testkit vector seam 只追加固定 corpus evaluator。当前下一
独立切片为 `C4` cleanup、DET3b invariant revalidation 与 DET4 aggregate re-promotion。

**DET3a-C3 time-boundary clarification（2026-08-03）：** C3 的 Gregorian/UTC semantics 仅属于
durable wall-clock metadata，不定义 gameplay calendar、scheduler、`WorldTime`、Unix epoch wire
或 genre contract。Story 自行选择 scalar elapsed time、day/slot、duration、sequence 或 closed
phase 等 canonical representation；现实时间只有记录后才进入 authoritative command/resource，
replay 永不重采样。B-prime 与 C2 不变，既有 C3 equivalence evidence 仍覆盖三个 strict
`IsoUtcInstant` consumer 与独立 filename policy。Cat Cafe 是首个 Story-local calendar/
time-economy consumer；第二个 behaviorally independent consumer 出现前不提升 reusable
capability，未来优先提取最小公共 deterministic arithmetic/scheduling operation，而非 universal
calendar。该 amendment 只改 design/active plans，不新增 implementation 或 tests；下一切片仍为
`C4`。

**2026-08-03 Save M0c corrective：** 外部实验只作为缺口发现来源；正式仓库以中性
Quick/manual、malformed/future-format、CAS/lease/failure 与 PF1 receipt/fallback vectors
独立复现并修复 standard Save UI 可达的 invalid-slot overwrite failure。显式 fresh player Save
现在以 Host revision CAS replacement 覆盖 Host-readable invalid payload；旧 bytes 不参与
candidate，也不被迁移或备份。load/export/annotation、M0b no-authoritative-mutation、Save
schema/format/canonical/digest/CommandLog/replay 与 M1 callback-free scope 均不变。该独立 bugfix
不恢复已暂停 Goal、也不推进 linear core；下一 production-floor 切片仍是 `C4`。

**2026-08-03 DET3a-C4 / corrective PF-DET promotion：** C2 exact classifier 取代后的 broad
Date provenance、argument evaluator 与 unreachable fallback 已删除，同一 cleanup baseline
前后保持 `8 files / 894 tests`。TDD 补闭 DET3b optional `1..3` explicit-zone fraction、
runtime TypeScript internal `import =` Date capture precedence，以及 unknown `globalThis` /
tracked-ambient descendant 在 sequence、pattern、alias、operation 与 write target 间丢失
fail-closed provenance 的缺口；specific diagnostic 与 checked intrinsic clean winner 保持优先。
final static determinism 为 `3/984`、aggregate focused 为 `8/1018`、DET3b focused 为 `3/32`。live guard recollection 为
`65` 个唯一定义、`8` 个类别；latest-stable Deno `2.9.4` matrix `3/3`，Chromium、Firefox、
WebKit 各两次、browser `6/6`，repository full unit `227/3324` 与 `deno task check` 全绿。
public API、Save/canonical/digest、Snapshot/RNG/CommandLog/replay、Debug Bundle 与
gameplay-time contract 不变。corrective PF-DET 据此关闭；在该 promotion 时 linear core
恢复 callback-free Save `M1`，其 DET-B/M1 join 随后由下方 M1 promotion 关闭。

**2026-08-03 Save M1 / DET-B join promotion：** Base Save admission 现在以唯一
factory-bound staged schema 执行 exact shell、raw digest、State revision fence、current
Snapshot/normalized digest、Story validation 与 atomic install；stored operations 共享 staged
preparation 与 physical Host/slot identity，load/list/export 随后完成 Story validation，
annotation 不调用 Story callback。different revision 返回 engine-owned
`migration.unavailable`，normalized identity failure 返回
`digest.normalized_state_mismatch`，二者的 load/import/list/export/annotation、来源 bytes 与
authoritative no-mutation 已由中性 corpus 固定。successful decode 的 digest traversal 从 `1`
变为 raw + normalized `2`；PF1 persistence aggregate traversal/digest 从 `15/8` 变为
`18/11`，bytes/canonical/digest algorithm/Strict limits 不变。focused `8/259`、affected Base +
Save UI `79/999`、full unit `227/3329`、latest-stable Deno `2.9.4` matrix `1/3` 与
Chromium/Firefox/WebKit repeat matrix `6/6`、`deno task check` 全绿。没有 executable
registry/migrator/callback、历史 Save install 或 M2 placeholder；join gate 已关闭，linear core
下一独立切片为 `M2`。

**2026-08-03 Save M2a promotion：** Base 已建立 single explicit aggregate-State namespace、
stable IDs、synchronous adjacent steps、reference declarations与 factory/`WeakMap`-owned exact
registry。Core definition捕获 official identity，application resolution验证 registry current
identity；两处 callback count均为 `0`。该 bounded Base authority已进入 live determinism map，
但 maintained applications、Persistence/load/import与 real migration owner均未接入，Save bytes、
format、canonical/digest、Session/CommandLog/replay和 Debug Bundle不变。focused M2a + M1为
`5/161`、affected Base `79/999`、full unit `228/3346`，typecheck、determinism guard与
`deno task check`全绿。linear core下一独立切片为 `M2b`。

**2026-08-03 Save M2b promotion：** Base bounded authority现已提供 exact chain suffix
resolution、capture-time bounded detached/frozen State projection、同步 one/two-step callback
execution、immutable failure attempt、opaque completion与 whole-Snapshot receipt finalizer。
executor不读取 Snapshot其他字段、不计算 State-only伪 digest，也不接 Persistence；Promise/
thenable与非法 result同步 fail closed且不读取 arbitrary `.then`。focused为 `2/49`、affected
Base为 `80/1032`、full unit为 `229/3379`，typecheck、determinism guard与 `deno task check`
全绿。Save bytes、canonical/digest、Session/CommandLog/replay、Debug Bundle与 maintained
application owner均未改变。linear core下一独立切片为 `M2c`。

**2026-08-03 Save M2c promotion：** Base/Core/Persistence 已接通 application-provided exact
registry 的 staged import/load integration：stored physical identity先于 chain，historical
Snapshot shell只允许 exact engine-owned shape，callback只替换 State；schema前输入与 schema
输出均作 bounded detached/deep-frozen canonical capture，非 State normalization或 mutation
fail closed。current Snapshot、whole-Snapshot digest、compatibility/adoption、reference 与
invariant全部通过后才沿既有 atomic replay-anchor replacement安装 candidate；来源 Save不写回。
list/stored export/annotation保持 callback-free，current revision即使存在 registry也不执行
callback。低层 success返回 `receipt | null`，所有结构化返回的 post-chain validation failure
附 exact phase attempt，Story callback bug/throw仍沿用既有 unexpected fault语义；
Session receipt lifecycle/composite no-throw commit仍归 M2d，maintained owner与四 runtime promotion
仍归 M2e。focused为 `6/271`、affected Base + UI为 `142/1661`、full unit为
`229/3405`；latest-stable Deno `2.9.4`上的 typecheck、determinism guard与
`deno task check`全绿，browser matrix按合同保留给 M2e。linear core下一独立切片为 `M2d`。

**2026-08-03 Save M2d promotion：** package-owned Session/Core/Persistence现通过一次性 exact
outcome/prepare-callback participant执行 prepare/no-throw commit；Persistence/autosave、CommandLog、
Session Snapshot/digest/status与 Session-owned migration receipt在 listener publication前全部安装。
预分配 Session-bound context只在 publication窗口提供 Core origin，之后才调用 observational
replacement callback并安排 autosave post-commit。receipt lifecycle、failed exact preservation、
cross-owner/reuse/HMR/fence/epoch failures、migration+adoption组合、zero-entry replay与 next ordinal
均由确定性测试锁定；opaque control与显式 legacy callback的 current-revision escape不冒充
composite guarantee。公开 Save/replay/debug wire、canonical/digest与 barrel API不变。focused为
`5/282`、affected Base + UI为 `142/1691`、full unit为 `229/3435`；latest-stable Deno `2.9.4`
上的 typecheck、determinism guard、Story checks、Engine Lab build与 `deno task check`全绿。四
runtime/real owner仍归 M2e，linear core下一独立切片为 `M2e`。

**2026-08-04 Save M2e / M2 aggregate promotion：** Engine Lab 配置 real app-local
revision 3/4 → current 5 registry；Core 与 policy owner exact-identical，live authority map
枚举 `1` 个 owner、`2` 个 callback，并在 lint 前验证 app-local closure/BuildIdentity 完整性。
单独 migration Worker 执行 one/two-step、reject、throw、invalid-output 与
migration-plus-adoption，保留 DET3b ambient-tripwire Worker 的窄 closure；Deno 与
Chromium/Firefox/WebKit 各两次比较 exact output、attempt/receipt、whole-Snapshot digest、
callback count、adoption 与 source bytes。focused `6/23`、affected Base + Engine Lab
`105/1213`、full unit `232/3443`、Deno matrix `1/3`、browser repeat matrix `6/6`，latest-stable
Deno `2.9.4` 的 determinism guard、typecheck 与 `deno task check` 全绿。M2c/M2d 的原子
install/replay-anchor 回归共同关闭 M2 aggregate；Save/canonical/digest/format/source bytes 与
公开 replay/Debug Bundle wire 不变。pre-opacity same-revision-5 State不在 maintained corpus，
若未来 released fixture要求支持则触发 Save stop。M2 是机制 promotion而非产品历史 Save
承诺；linear core下一切片为 `PF4/S3 System dialogs`，Save PF5/M3仍在其后。

### PF3 — Save envelope and migration registry

执行 [Save migration plan](2026-07-30-save-migration.md) 的分段 gate：

1. **M0a** 在 DET0-core 后先建立唯一的 shared Save metadata corpus：annotation/
   summary/note、`summarizeSave`、`versionStamp`、capture-origin preservation、
   unstamped/stamped bytes 与 fixed-clock filename payload independence；
2. **DET-A** 完成后，**M0b** 冻结 post-DET-A current load baseline；随后 **M1**
   只实现 bounded envelope shell、raw digest verification、load-order 与明确的
   `migration_unavailable` public rejection，不注册、不注入、不执行任何 migrator。
   M0b 同时记录 current full-schema-before-digest precedence；M1 把
   所有受 Snapshot-admission 后移影响的 compound case 有意切换为 shell/raw-digest-first
   phase precedence（包括 schema/RNG/cross-field 与 digest 的代表组合），除此之外
   current-format regression 逐字段保持不变；current schema normalization 若改变
   canonical identity，则在任何 Story callback 前以公开 codec/validation-layer
   `digest.normalized_state_mismatch` 拒绝并映射为 Player `invalid_record`；
3. M0b/M1 可以与 DET-B 并行，但文件 ownership 必须分离：DET-B 独占 authority
   collector、determinism task、test-only driver、Playwright config 与 CI；M0b/M1
   独占 Base Save codec/load order/public persistence result type 及其 tests；双方共同
   需要的 testkit seam/public export 必须在分叉前单独合并；
4. DET-B 与 M1 必须在**同一个 merged HEAD** 汇合（该 gate 已于上述 M1 promotion
   关闭）；该 HEAD 同时通过 focused
   M0a/M0b/M1、`deno task test`、`deno task check`、shared Save byte corpus 与
   dedicated Deno/Chromium/Firefox/WebKit matrix，并证明 migration callback count
   为 `0`；
5. 只有该 join 通过，**M2** 才按 M2a contracts/factory、M2b pure kernel、M2c staged
   integration、M2d atomic anchor、M2e real determinism promotion依次建立
   namespace-keyed adjacent-revision executable State migration；migration 与 same-schema
   adoption 保持不同语义。M2a/M2b/M2c/M2d/M2e 均已关闭，M2 aggregate 已完成。

M2 只治理 `formatRevision: 1` 中的 aggregate State：它安装 non-durable
replacement-origin receipt，但不写回 source Save。Envelope format migration、产品
inspection/backup、durable history 与 Mod namespaces继续 deferred；不得用空 format registry
或 synthetic-only authority evidence冒充已实现能力。

PF3 完成后，State schema 才允许进入第一个需要跨版本迁移的正式发布周期。

### PF4 — Remaining managed surface migrations

Surface pilot 通过后按 family 分开合并：

1. S3：System dialogs；
2. S1-R：external stable-target reconcile gate；
3. S4：Narrative dialogue/history；
4. S4b：whole-canvas primary/detail 独立 family；
5. input/gesture reset（pointercancel、focus loss、visibility change）与 Browser
   Agent observation。

S3 是 Coordinator-owned transient family，与 Workspace Overlay 共用同一个
composition-owned Coordinator、application epoch、immutable publication 与 successor
lifetime，不等待 S1-R。settings/saves 共用 single root slot；load/clear/import
confirmation 是 current Saves 的 exact-parent single child。initial root 与 child 使用
blocking fallback，root replacement retain current subtree；没有 synchronous
intent-time settle，candidate 只在正确 System portal 内完成成功 React Host commit 后
ready，StrictMode probe 不得产生额外 receipt/revision/allocation。S3a–S3d 保持新路径
dormant，S3e 才同时切换 live ingress并删除旧 writable store、Host fallback、React-local
confirmation lifecycle、standalone public lifecycle APIs 与 public `SaveOverlayV1`
component；initial pending supersede 和 retained-active pending cancellation 遵守 exact
result/delta matrix；任何中间态不得双写或建立 writable mirror。

S3a 已关闭 dormant definition/slot/result/root-candidate snapshot 与 composite-kernel
floor；S3b 已抽取唯一 composition-owned Coordinator lifetime/publication/input binding，
让 Overlay 与 dormant System facade 共用 application epoch/successor，并实现
Settings/Saves known-field config snapshot/catalog。新 System catalog 在正式 composition
中仍未附着，legacy System store/Host 仍是唯一 live writer。S3c 已先以 S3c.0 闭合
all-family bind/activation-arming/shared-gate-release barrier，并串行 drain notification 内
reentrant application-anchor rotation；S3c.1 随后实现
Host-commit readiness、one logical Host lease 与 StrictMode/error-boundary fence。
S3c.1 已以 dormant、未导出的 React Host 闭合该边界：candidate 在正确 System portal
完成 successful Host commit 后才通过 microtask acknowledgment ready，preparing shell
保持同 key、`inert`/`aria-hidden`/不可交互且不使用 `hidden`/`display:none`；code-native
fallback 独立持有 blocking isolation/focus，initial failure 恢复 fallback 之前的 exact
connected focus owner，并以 fallback-only System InputRouter gate 截断 action/viewport
向 gameplay 穿透。StrictMode probe、initial supersede、replacement fail/ready、Host
unmount、successor stale receipt、catalog R1/R2 freeze 与 accepted-ready fault delegation
均由 mutation-sensitive vectors 固定。one logical Host lease 在 distinct Host、live portal
identity change 与 stale terminal acknowledgment 上 fail closed；真实 unmount 立即关闭
ingress，grace 到期后一次 owner close 原子退休 active/pending subtree而不 dispose共享
Coordinator。新 Host/catalog仍未接入 production root，legacy store/Host仍是唯一 live
System writer；S3d 下一步实现 exact-parent confirmation child。

S3d 的 completion 采用 strict child-bound：pending cancel 只关闭 exact child，不取消已
dispatch operation；child 关闭同时撤销它的 confirmation-bound child/root result sink，
因此 later settle 对已关闭 child、仍存活的原 Saves root 与后来 root 都是零
confirmation-result mutation。operation binding 的 independent finally仍可清 busy并按
现有 read/status source refresh仍存活的 exact原 root，但不得命中 retired/later root，且
Surface delta为零。child 保持 current 才允许 result 投递到 exact parent并关闭 child。所有
非-successor child close 最终恢复 connected exact opener，只有 opener 已断开才退回
surviving exact Saves root initial focus target；result summary 不得抢焦。S3d 仍是 dormant、
package-internal 切片，不接 production ingress、不删除 legacy live writer，也不改变
Persistence/Save/canonical/digest/replay/wire 语义。该边界在交付时通过 reviewed full diff、
bounded import/export/attachment reference search 与 worktree dead-path audit 复核并记录，
不新增只为冻结 exact file/source inventory 或 provisional import graph 的常规 CI test。

**2026-08-08 S3d delivery：** dormant Managed System session 现在只从 frozen、
descriptor-snapshotted operation binding 与 normalized load/clear/import invocation，为
current ready Saves root 创建一个 fresh exact-parent confirmation child。prepare/ready/
failure/cancel 全部复用 S3c.1 Host-commit gate；child preparing 与 active 期间 exact parent
均保持原 DOM/React state但被 `inert`/`aria-hidden` 阻断。typed content intent 不接收
opener、focus registration、instance、handle 或 readiness evidence；Host 在 mutation 前
捕获 exact connected opener，并在 child 关闭后优先恢复它，断开时才选择 exact parent 的
首个合法 initial target。active confirmation 拥有 closed Tab trap、System input/focus 与
pointer gesture fence，candidate preparing仍无普通 authority。

每个 child 的 operation 只 dispatch 一次；completion 在 close notification 后重新验证
exact child/root 与 parent generation，fresh child、root replacement、epoch successor、Host
release、detach/dispose均使旧 result sink stale。cancel 后 operation 可自然 settle，但只在
captured exact原 root仍存活时执行一次独立 `finalizeExactRoot`；该 finalizer 与 result sink
的 sync/async fault只进入 diagnostics，不回滚 lifecycle，也不产生 Surface commit。kernel
新增 exact-candidate fallback dismiss，关闭 child时保留 same-owner root replacement；四种
dismiss operation 在 policy lookup 前拒绝非 closed kind。同步 observer retirement、resolver/
port reentry、Proxy callback TOCTOU、Promise own-`then`/constructor 与 close-notify fresh-child
交错均由 mutation-sensitive vectors固定。新 Host/catalog仍未接入 production composition、
browser graph或 package barrel；legacy store/Host仍是唯一 live writer，且
Save/Persistence/M2/canonical/digest/replay/wire无 diff。下一独立切片为 S3e.0。

S3e 恢复前先执行 **S3e.0**。该准备批不切换 System live authority：standard
tokenized Core operation 以既有 authoritative replacement publication context mint
package-internal exact operation token；UI 在
shared successor/all-family activation/UI anchor/post-liveness 完整成功后才按 token ack；Web 以
per-token broker和 producer-side terminal supervisor区分 raw authoritative anchored与 composed
anchored。不得用 latest/current anchor、call-time `before + 1`、origin-only或 timeout相关。
successor activation failure不改写 public `SessionAnchorResultV1`，而是在 producer callback
stack先 fence全部 application ingress，再用 deferred-first、reentrant、cleanup-failure-safe
teardown始终释放 Core/Persistence，最终 reject
`ui.presentation_successor_activation_failed`。settled lifecycle result按 exact descriptor shape
admission，malformed在标准 Web path完成 terminal teardown后异步 reject
`ui.lifecycle_restart_result_invalid`，bare Root只reject；Promise assimilation保留
ECMAScript语义。S3e.0 不恢复 live cutover WIP、不改变 Save/Persistence/M2/canonical/digest/
replay/wire，也不 promotion live System；通过独立审查后下一切片仍为 S3e。
受控 legacy/generic replacement 保留 `null` context characterization，不参与 per-token
composed-anchored 提升；其 activation failure 仍进入同一 terminal latch。
bare Root 消费该 parser、lifecycle absence/New Game/return-to-title/DevDock admission 与
anchored 后 legacy writer cleanup 删除仍属 S3e 原子 cutover，不是 S3e.0 delivery。

**2026-08-08 S3e.0 delivery：** Core 现在能在 standard composed restart 启动前 mint
fresh package-internal publication-context token，并以 one-shot prepared operation 将其绑定
exact committed anchor event；公开 anchor 与 `SessionAnchorResultV1` 未改变。Hosted UI
按 generation 串行完成 shared Coordinator successor、all-family activation notification、
UI anchor publication 与 post-callback liveness 后才 ack exact token。Web broker在 UI drain
前绑定 exact anchor identity；wrong anchor、conflicting bind、failed、missing、mismatched，
以及 event/ack 与 rejected、faulted、raw throw/rejection 的 desynchronization 都 fail closed，
其中 producer/event-stack failure 会先同步 terminal-fence 再交给 Core observer diagnostics。

Web teardown 已收敛为 deferred-first、first-wins、可重入 state machine：automation、physical
input、presentation/Managed Surface 与 Core/Persistence mutation ingress 全部完成 fence 后才
unmount/cleanup，逐项 cleanup、Host logger与 release failure均不替换 terminal primary；
pagehide 仍保持 flush-before-Core/Persistence-release barrier。UI-owned settled-result parser
按 exact data descriptors/closed codes分类，且不把 token/ack扩入 public API。terminal focus
restore 在 Overlay、legacy System 与 dormant managed System Host均被抑制。delivery audit确认
legacy System仍是唯一 live writer，隔离的 S3e WIP stash未恢复，DefaultGameRoot live admission
与 legacy cleanup仍留给下一批 S3e；Save/Persistence/M2/canonical/digest/replay/wire无 diff。
验证通过 Base/UI/Web package tests、`deno task test`（240 files / 3622 tests）、
`deno task check`、Engine E2E（101 tests）、examples E2E（45 passed / 2 skipped）与 prebuilt
Player（38 tests）。下一独立切片为 S3e live cutover and promotion。

**2026-08-09 S3e delivery and promotion：** live System
settings/saves ingress现已原子切到与 Overlay相同的 composition-owned Coordinator、application
epoch、immutable publication与 successor lifetime。required managed Host接收 opaque
composition-created session；其 public facade只提供 read snapshot与 typed settings/saves open
intents。legacy writable store、fallback Host、standalone Settings/confirmation/Save lifecycle
exports与 public `SaveOverlayV1`已删除；custom Saves改为由 Host挂载的 React component identity。
successful load/import的 predecessor completion在 successor后 stale，不会 close、finalize或投递
result到 fresh System root；composed return-to-title成功后 Root不再执行任何 family close/reset，
因此 activation subscriber同步打开的 fresh Surface保持 current且没有第二次 publication delta。
Save/Persistence/M2/canonical/digest/replay/wire不变，transient System未引入 S1-R字段。

验证通过 focused cutover（14 files / 170 tests）、UI package（69 / 745）、
`deno task test`（242 / 3631）、`deno task check`、Engine browser（101 / 101）、examples
browser（45 passed / 2 skipped）与 prebuilt Player（38 / 38）；最终 adversarial review无
finding。S3 promotion与 S1-R.0–R2b完成，linear core当前节点与下一独立切片均为
S1-R.2c；S4仍受 S1-R aggregate gate约束。

S1-R 在第一个真实 externally published stable-target family 前完成。按 accepted
target ownership，S4 Narrative 计划从 semantic publication 派生 stable target，
因此顺序是 **S3 → S1-R.0–S1-R.5 → S4 → S4b**；若更早的 family 后续选择 external stable
target，S1-R 必须随 gate 前移，不能让该 family 自行发明 source revision
或参数等价规则。
S1-R 统一冻结 definition schema normalization → Strict Canonical Data →
canonical bytes comparison、包含 parent/order 的完整 target identity、与普通 semantic
revision 分离的 per-lease source domain、accepted desired/runtime divergence、empty/dispose、
cross-owner rejection、atomic vector reconcile 与 lease/source-bound readiness fence；hash
不作唯一等价依据。

S1-R 按以下独立可合并切片推进：S1-R.0 normative/internal-contract floor；S1-R.1
publisher lease 与 revision/occurrence allocator；S1-R.2a corrective admission contract；
S1-R.2b Base bounded canonical projection seam；S1-R.2c UI stable-vector admission；
S1-R.3 pure atomic reconcile；S1-R.4 readiness/retry fence；S1-R.5 neutral harness、bounded
churn 与 dead-path audit。S1-R.0 本身不实现 kernel mutation；S1-R aggregate 完成前不接
Narrative/React/Web，也不更新 live feature 文档。详细目标、delta与stop rules由
[Managed Surface lifecycle focused plan](2026-07-30-surface-contract-harness.md)拥有。

**2026-08-09 S1-R.0 delivery：** package-internal pure contract 已固定 stable publication/
target/admitted identity、opaque lease/source revision/canonical-byte snapshot、`64` target 与
`65,536 bytes / depth 32 / nodes 4,096` parameter bounds、closed codes、exact admission
precedence及 empty/gap/cursor/dispose/failure delta rows。没有 allocator、admission、reconcile/
Coordinator/readiness或 live family wiring；public/internal barrels、transient contracts、
architecture/features 与 Save/Persistence/canonical/digest/replay/wire均未改变。下一切片 R1
只实现 deterministic injected publisher lease 与 source/occurrence issuance domains。验证通过
focused `1 / 7`、UI package `70 / 754`、`deno task test`（`243 / 3640`）与完整
`deno task check`；三路 adversarial review 无 finding。

**2026-08-09 S1-R.1 delivery：** package-internal publisher registry以一次性 claimed、
composition-owned epoch-local allocator签发 opaque lease；同一 resolved owner最多一个
current lease，source/occurrence exact-next issuance、immutable accepted-occurrence
high-water、conservative gap-burn、exact-token dispose、exhaustion/ABA与10k bounded churn
均已闭合。R1没有 accepted source/vector、admission、Coordinator/reconcile/readiness或live
family wiring；下一切片 R2a 只领取 corrective admission contract。验证通过
R0+R1 focused `2 / 22`、UI package `71 / 769`、`deno task test`（`244 / 3655`）与完整
`deno task check`；三路 adversarial review 最终无 finding。

**2026-08-09 S1-R.2 entry-gate adjudication：** external review 的 hard-stop canonical、
post-lower target capture、scope-local equality、foreign root reservation与 admitted proposal
方向已接受；repository review进一步要求 exact accepted-baseline/reservation private provenance、
per-target first-failure、R3 apply-time CAS、reflection-error spoof fencing与
`structurallyStableRetained` order comparison。为保持独立可合并与 package layering，R2重切为
R2a（docs + R0 corrective tables/tests）、R2b（Base runtime/internal bounded canonical seam）与
R2c（UI stable-vector admission/proposal）。三批都保持 dormant；不改 public/transient contracts、
Coordinator/live family、Save/Persistence canonical bytes或 live feature docs。

**2026-08-09 S1-R.2a delivery：** dormant R0 master inventory新增target-shape invalid code并删除
owner-scope dead code；flat stage rows已替换为literal-preserving named check rows，重复semantic
code可在多个check提供evidence，但master inventory仍全局唯一。Frozen parameter policy固定raw-target
顺序、per-target schema/canonical-first-event/retained-bytes顺序，equal/greater-invalid与所有
non-admitted结果继续exact zero delta；R0 result不新增`admitted`。本批没有R1 import、Base canonical
seam、stable admission evaluator、Coordinator/readiness、barrel/transient/live wiring。验证通过R0+R1
focused `2 / 23`、UI package `71 / 770`、`deno task test`（`244 / 3656`）与完整
`deno task check`；三路adversarial review无finding。下一独立切片为 R2b。

**2026-08-09 S1-R.2b delivery：** Base在既有`@sillymaker/base/runtime/internal`交付
caller-bounded、descriptor-safe、fully-represented canonical projection seam。它按first traversal
event对bytes/depth/nodes hard-stop，同次生成fresh canonical bytes与detached deep-frozen value；
known canonical/limit失败为closed typed outcome，任一reflection trap throw保持exact identity。
共享scalar primitives经existing canonical regressions与跨运行时determinism证明byte-equivalent；
public canonical、Strict migration、Save/Persistence、package export map/subpath inventory与live
Surface均不变，ordinary root/runtime/authoring API没有该seam。验证通过focused `3 / 82`、Base
`81 / 1,137`、全量
`245 / 3,698`、`deno task check`、Deno matrix `3 / 3`及Chromium/Firefox/WebKit `6 / 6`；
三路adversarial review无finding。下一独立切片为 R2c。

每个 family 的迁移提交必须删除旧 owner；禁止长期 adapter 双写。
`DialoguePanelV1` / `VnLayerV1` 的 controller/view/host 拆分在 Narrative family
中完成，不与 Overlay pilot 混合。

### PF5 — Migration product surface and maintained fixtures

执行 Save plan 的 M3：

- dry-run inspection；
- 写入前备份和回退；
- adoption declaration set；
- 玩家可读结果；
- Engine Lab + 旗舰示例的 maintained Save fixture corpus；
- CI 全量 migrate → validate → load → reference/invariant/digest。

fixture 是长期兼容承诺，不是一次性 plan fixture；每个正式 Save revision 都必须留下真实样本。

### PF6 — Surface contract harness and authoring promotion

只有所有 live surface family 已迁移，才建设：

1. structural check 与 JSON diagnostics；
2. pure reducer/model tests；
3. seeded exploration + shrink；
4. frame-aware virtual input；
5. Engine Lab whole-canvas browser matrix；
6. stable authoring builder 与 quickstart。

PF6 不给所有 action 强加 application-wide envelope。普通 action 继续返回
input、Surface、semantic/workspace 各自的分层 receipt；但 action 一旦声明
presentation postcondition，application-composition bridge 就必须组合这些不可变
证据，并在 domain 已 commit、UI 目标却未成立时返回
`postcondition_failed`，同时保留 committed evidence。不得为追求“完整事件链”
提前把 Base、UI、Web、Workspace 全部绑定到一个超大 envelope。

弱模型 fresh-baseline canary 是作者 API **promote 为 stable/AI-friendly 前的冻结证据**，不是 runtime migration 的前置条件，也不进入每次提交 CI。

### PF7 — Release stabilization

- 在执行时 latest stable Deno（记录实际版本、不固定 patch、不另设 2.9.0 lane）上，
  `deno task check`、受影响的 browser/prebuilt matrix、Save fixture corpus、
  PF-DET 四 runtime 逐 command matrix 和性能计数 gate 全绿；若本次发布包含
  desktop durability promotion，只要求对应 D0–D3 evidence；若包含 packaging
  promotion，只要求对应 D4 evidence；只有 “packaged app 使用 atomic
  persistence”的组合声明才同时要求两轨全绿；
- public exports 经过第二消费者证明；
- superseded owner/API 被删除或明确 deprecated；
- architecture/features/development/story-authoring/build-and-release 与实现同步；
- 形成一份 production-floor promotion record，列出仍未解决的规模和平台限制。

PF7 只完成 production floor，不自动激活 Mod。Mod M0–M2 仍必须满足 roadmap 的
全部 activation gates，并由新的 active plan 接受后才能开始。Content compiler、
战斗 core、genre pack 或高级 renderer 也由真实产品证据和各自计划激活；Story-local
玩法不受此限制。

## 3. Merge discipline for Codex/Agents

每次实现只领取一个切片中的一个可命名任务，并遵守：

1. 先重现/red test 或记录 baseline；
2. 写出本任务明确不改的合同；
3. 最小实现；
4. focused tests；
5. package/aggregate checks；
6. 删除 superseded path；
7. 更新 live docs 与 promotion record。

禁止：

- 在一个 PR 同时做 Snapshot 数据结构重写、Save migration 和 Surface
  Coordinator；
- 把 determinism lint、zero RNG、command/evidence admission 与 Surface/Save
  migration 合成一个提交；
- 把 desktop file adapter 的进程内 mutex/rollback 描述为 crash-atomic
  transaction；
- 以“后续会统一”为理由保留双写；
- 为 plan phase 建一次性测试命令或 frozen 文件清单；
- 将 design 中的建议字段一次性全部冻结成公共 API；
- 只跑 typecheck 就宣称 architecture migration 完成。

## 4. Parallel work that is safe

在一个切片正在实现时，可并行进行但不得改变其目标合同的工作：

- PF-D 的 backend spike、fault fixture 与 packaged smoke，可与 PF1/PF2/PF-DET
  的纯准备工作并行；D4 在 target/output/report contract 定稿后也可与 D0–D3
  并行；一旦触及共享 Host/Save/records wire contract 即停止并串行；
- DET-A 后唯一额外允许的 implementation fork 是 DET-B 与 strictly
  callback-free M0b/M1；两边遵守 PF3 写明的文件 ownership，并在同一 merged HEAD
  通过 join gate 后才进入 M2；
- 文档校对、测试夹具准备、benchmark 运行和结果分析；
- 不同 package 的纯 bug fix；
- 真实 Story 的 Story-local 内容/玩法；
- 已有公共 API 上的示例改进。

除上述显式 fork 外，共享 `GameSession`、Save decode、Surface/input ownership、
Story import-closure tooling、browser parity config 或 public export 的工作不得并行
落地。

## 5. Deferred tracks

下列内容保留设计方向，但不是当前 Codex 执行队列：

- `IntegrityPolicy`、module-root digest、changed-subtree freeze；
- Mod resolver/distribution/third-party package SDK；
- engine-level 通用 combat core 与 genre packs（Story-local SLG/VN/卡牌玩法可并行）；
- engine-level gameplay `CalendarPolicy`、`WorldTime`、scheduler 或 genre-time package；Cat Cafe
  只是首个 Story-local consumer，须等待第二个 behaviorally independent consumer；
- Pixi/WebGL/Live2D 等高级 renderer adapter；
- OpenUI/GenUI workspace；
- 可视化 editor shell；
- RNG reseed wall-clock lineage、named/keyed streams、RNG/trace V2；
- Decimal runtime 与通用 FixedPoint/Ratio package。

它们分别由 performance evidence、第二消费者或产品项目激活，不以“设计文档已存在”为激活条件。

## 6. Stop conditions

遇到以下情况停止当前切片并先修订 design：

- 需要 Base 导入 React/DOM/browser/tooling；
- 需要第二份 authoritative gameplay State；
- migration 需要 live Session、网络、墙钟或随机；
- Coordinator 必须读取/写入 gameplay State 才能决定基本 lifecycle；
- 旧/新 owner 双写无法在同一切片删除；
- 只能通过 sleep、像素截图或偶然坐标稳定 browser test；
- 性能优化改变 canonical digest/Save/replay 语义；
- authoritative command/evidence gate 需要 universal application receipt
  或无法在 candidate install 前原子失败；
- zero RNG 兼容性只能靠静默重种；
- determinism lint 只能全仓库禁止合法 Host/Presentation，或跨 runtime parity
  必须跳过 Firefox/只比较最终 Snapshot；
- DET3a safe-set 只能靠 general constant evaluation、执行 Story code 或跨 source/container
  dataflow 才能实现；
- exact singleton allowance 必须 widening 成 union/class，或 unknown/cycle/budget 不能 stable
  fail closed；
- static diagnostic precedence 无法为 maximal chain 选出唯一 stable winner；
- dynamic import 只能靠 regex、lint 后 failure 或 partial closure，或 CommonJS 必须建设
  dependency graph 才能继续；
- package-internal integer UTC parser/formatter 无法保持 B-prime accepted spelling、
  maintained-valid Save/Debug Bundle bytes 或 legacy export filename policy，或发现 maintained
  fixture / real released Save 含 newly rejected malformed timestamp；
- C3/C4 要求新增 gameplay `CalendarPolicy`、`WorldTime`、scheduler、genre package、Unix
  timestamp wire、Story-facing date helper 或 Cat Cafe gameplay change，authoritative replay 必须
  重读 wall clock，或在第二个 behaviorally independent Story consumer 前必须提升 reusable
  time/calendar capability；
- corrective work 要求新增 public instant helper，或改变 Save/canonical/digest/CommandLog/
  replay 语义；
- 实现必须依赖 `tmp/**`、`references/**` 或私有复刻工程；
- packaged desktop 只能检查目标平台产物存在，不能真实启动、写入并重开。
- composed successor只能通过 current/latest anchor、call-time `before + 1`、origin-only/FIFO
  或 timeout猜测，无法绑定 exact Core replacement operation；
- successor activation failure只能等 raw Core Promise continuation才可 fence application
  ingress，或 teardown cleanup throw/reentry会跳过 Core/Persistence release并替换 primary fault；
- lifecycle result admission必须改变 public `SessionAnchorResultV1`/anchor/Save wire，或必须执行
  accessor/Proxy getter才能分类 malformed settled value。
