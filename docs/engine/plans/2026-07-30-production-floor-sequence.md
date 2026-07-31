# Production-floor execution sequence

状态：2026-07-30 接受执行，2026-07-31 根据 PF2 pilot、authoritative
determinism/Save graph、CI 与 Desktop 审计修订。本文是当前唯一的跨计划排序入口；
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
**Workspace Overlay**。S1a–S1d.2 已交付 dormant baseline，S1d.3–S1f 完成
S1-T 的剩余部分：

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
7. 真实浏览器覆盖 Escape/backdrop/pointer/keyboard、initial/replace/detail
   readiness、failure/focus restore、candidate cancellation、epoch rotation 与 stale
   gesture/readiness receipt。

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
forgery fail closed。该批没有决定 composition-root epoch ownership 或实现
S1d.3+；下一独立切片是 S1d.3。

S2 只依赖 S1-T，全部 Overlay target 都是 Coordinator-owned transient target；它不
等待 S1-R，也不得为了统一形状预埋 source publication revision、stable-target
reconcile 或参数等价字段。本切片明确不实现 application-level end-to-end
receipt、弱模型战役、全 surface fuzz explorer，也不迁移 System/Narrative。若同一
cutover slice 无法消除 Overlay 双重 writable authority，停止并修订设计；pilot
失败时必须可以删除 Coordinator 而不留下双写。

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
   `createInitialState` 前对整个 output 做 package-internal canonical admission +
   deep-freeze，所有 initial-Snapshot 路径共用同一个 admitted value，不新增 public
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
