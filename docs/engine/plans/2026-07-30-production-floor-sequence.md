# Production-floor execution sequence

状态：2026-07-30 接受执行，2026-08-01 根据 PF2 promotion、authoritative
determinism/Save graph、CI 与 Desktop 审计修订；2026-08-02 DET4 的同一 Session
implementation 与修正后的 promotion verification 均已完成，DET-B/aggregate PF-DET
已关闭，线性 core 下一独立切片为 Save M0b。本文是当前唯一的跨计划排序入口；
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
不伪造 production migration registry。M2 首次注册真实 format/State migration
时必须 live recollect、加入同一 static/tripwire scope 并扩展四 runtime matrix；
以后每个新 migrator 也重复这项认证，不能把 PF-DET 当作一次性完成。

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

**2026-08-01 DET3a promotion：** required browser-free check 现在每次从 root registry
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

**DET3a adversarial correction promotion（2026-08-02）：** promotion 后的
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

修订后的 active contract 按 operation 区分 Date proof。`new Date(arg)` 只允许 TimeClip
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

**2026-08-02 DET3b promotion：** Engine Lab 的 test-only `e2e/src/testing/**` 现在
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

**2026-08-02 DET4 / DET-B / PF-DET promotion：** 独立 test-only matrix/comparator 在
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
或 production Browser Agent surface。DET4/DET-B/aggregate PF-DET 至此关闭，当前线性 core
下一独立切片为 Save `M0b`，随后是 `M1`；`M2` 仍必须等待 M1 与 DET-B 在同一 merged HEAD
通过 join gate。

### PF3 — Save envelope and migration registry

执行 [Save migration plan](2026-07-30-save-migration.md) 的分段 gate：

1. **M0a** 在 DET0-core 后先建立唯一的 shared Save metadata corpus：annotation/
   summary/note、`summarizeSave`、`versionStamp`、capture-origin preservation、
   unstamped/stamped bytes 与 fixed-clock filename payload independence；
2. **DET-A** 完成后，**M0b** 冻结 post-DET-A current load baseline；随后 **M1**
   只实现 bounded envelope shell、raw digest verification、load-order 与明确的
   `migration_unavailable` public rejection，不注册、不注入、不执行任何 migrator；
3. M0b/M1 可以与 DET-B 并行，但文件 ownership 必须分离：DET-B 独占 authority
   collector、determinism task、test-only driver、Playwright config 与 CI；M0b/M1
   独占 Base Save codec/load order/public persistence result type 及其 tests；双方共同
   需要的 testkit seam/public export 必须在分叉前单独合并；
4. DET-B 与 M1 必须在**同一个 merged HEAD** 汇合；该 HEAD 同时通过 focused
   M0a/M0b/M1、`deno task test`、`deno task check`、shared Save byte corpus 与
   dedicated Deno/Chromium/Firefox/WebKit matrix，并证明 migration callback count
   为 `0`；
5. 只有该 join 通过，**M2** 才建立 namespace-keyed adjacent-revision executable
   registry、一步/两步 migration、失败原子性与新 replay anchor；migration 与
   same-schema adoption 保持不同语义。

PF3 完成后，State schema 才允许进入第一个需要跨版本迁移的正式发布周期。

### PF4 — Remaining managed surface migrations

Surface pilot 通过后按 family 分开合并：

1. S3：System dialogs；
2. S1-R：external stable-target reconcile gate；
3. S4：Narrative dialogue/history；
4. S4b：whole-canvas primary/detail 独立 family；
5. input/gesture reset（pointercancel、focus loss、visibility change）与 Browser
   Agent observation。

S1-R 在第一个真实 externally published stable-target family 前完成。按 accepted
target ownership，S4 Narrative 计划从 semantic publication 派生 stable target，
因此顺序是 **S3 → S1-R → S4 → S4b**；若更早的 family 后续选择 external stable
target，S1-R 必须随 gate 前移，不能让该 family 自行发明 source revision
或参数等价规则。
S1-R 统一冻结 definition schema normalization → Strict Canonical Data →
canonical bytes comparison、完整 target identity、per-owner monotonic source
publication revision、atomic vector reconcile 与 stable readiness fence；hash 不作
唯一等价依据。

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
- 实现必须依赖 `tmp/**`、`references/**` 或私有复刻工程；
- packaged desktop 只能检查目标平台产物存在，不能真实启动、写入并重开。
