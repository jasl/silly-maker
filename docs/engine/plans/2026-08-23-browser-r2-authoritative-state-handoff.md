# Browser R2 Authoritative State Handoff V1 实施计划

状态：**2026-08-23 经所有者确认开启；M0 是唯一下一项，尚未交付**。
[Production-floor sequence](2026-07-30-production-floor-sequence.md) 仍是唯一跨计划排序入口；
本计划只拥有 Browser R2 的 authoritative Save/Session handoff、失败重试和两个真实 GUI
消费者。Deno Desktop HMR 继续 package-private、explicit、default-off，只等待包含目标路径的
stable Deno 发布后独立复验，不是本车道的依赖或交付物。

目标合同已在
[Application Runtime and Embedded Authoring](../design/application-runtime-and-embedded-authoring.md#43-sillymaker-publication-and-reload-authority)
固定：R2 authoritative Application Domain successor 必须满足 compatibility/migration、原子
authority handoff，并保持 Save/replay 与 simulation identity；无法明确分类或迁移时拒绝 candidate，
不能“尽量热替换”。本车道补齐 live Browser 实现低于该合同的部分，不新建 State、Save 或 publication
框架。

## 1. Live evidence 与问题边界

当前 `PersistenceRebootstrapDisposalV1` 只携带 `ownership/code/fence`。predecessor dispose 会尝试把
运行时 Snapshot 送入 autosave 并释放 lease，但 handoff 不携带与本次 predecessor 绑定的 Snapshot、
Save bytes 或 digest。Core successor 则先从新 entropy 创建 fresh Snapshot；收到
`rebootstrapDisposition` 后只调用 `takeOverForRebootstrap`，并因 `else if` 跳过
`resumeFromAutosave`。因此现有 Engine Lab R2 可以做到同 Host/root、零 page reload 与 Authoring sibling
连续，却会让 authoritative State、RNG、command sequence 和 pending interaction 从 bootstrap
重新开始。

另一个同源缺口是 takeover 结果未成为启动门：即使 lease takeover 返回 `read_only`，Core 仍可继续
发布 successor。若 successor 已接管 fence、随后在 Web/UI construction 内失败，starter 的普通
cleanup 会丢掉新一代 release disposition；coordinator retry 仍可能复用 predecessor 的旧 fence，
最终把 read-only candidate 当成功。现有 retry 测试只检查 successor/Agent sibling，没有检查最终
persistence writer ownership，因此不能覆盖该失败。

Cat Cafe 当前不受影响：它尚未安装 Browser R2，开发变更仍走 R3/full-page reload，并由
`resumeFromAutosave`/Continue 恢复。不能在本缺口关闭前把现有 Engine Lab 接线直接复制过去。

## 2. V1 authoritative handoff 合同

- handoff 是 package-private 的版本化 Core/Web 协作合同，成功形状只包含两类真实边界数据：
  本次 fenced predecessor 的 `ExportedSaveV1`（clone 后的 exact bytes + digest）与 exact released
  lease fence。不得传旧 realm 的 raw Snapshot 对象，不得只传 `auto.current` slot/revision，也不得为
  本车道创建新的持久化 receipt schema。
- Save payload currentness 与 lease fence currentness 是两条独立轴。每次 takeover/release 只滚动
  fence；它不能自行授权从 successor 当前 Session 重新捕获 Save。Save payload 只可从 predecessor
  exact Save 前进到通过 candidate admission/migration/adoption 准备好的 authoritative anchor Save；
  fresh bootstrap 永远不是 retry payload。
- Save 必须来自 ingress 已关闭后的同一个 queue-front **当前 Snapshot**。其 canonical authoritative
  轴为 `state`、`rng`、`commandSequence`、`integrity`；pending interaction、monitor accumulator 与其他
  可恢复领域进度由 State 覆盖。handoff digest 必须验证 bytes，不能把对象 identity 或 autosave slot
  currentness 当等价证明。
- 若 Story 声明 persistence safepoint，R2 success 只允许当前 Snapshot 本身是可持久化 safepoint；
  不能用较旧 `lastSafepointSnapshot` 冒充 exact continuity。当前处于 in-flight span 时拒绝本次 R2/
  请求既有 R3 recovery；R3 仍可按正常 crash-recovery 合同恢复最近 safepoint。
- predecessor 在 release 前继续完成既有 exact autosave flush/drain；该写入保护真实用户数据，但
  successor 的 handoff admission 读取内存中的 exact Save payload，不重新读取可能陈旧的
  `auto.current`。Save capture、autosave candidate 与 release 必须绑定同一 fenced Snapshot；flush、
  encode/digest 或 release 任一失败都不能产生 ready handoff。
- successor 对 handoff bytes 只走一次现有 strict Save decode/schema、digest、state migration、
  simulation adoption、reference 与 invariant validation。admission 成功后信任 prepared typed data；
  不在 Core/Web/UI 各层重复 descriptor/exact 防御。
- unchanged compatible Snapshot、registered State migration 和 declared simulation adoption 复用现有
  Save pipeline。migration 只可按既有合同改变 State，并保持 RNG/command sequence/integrity；simulation
  digest 改变但没有明确 adoption 时拒绝。Story/state contract/engine 变化不能仅因 TypeScript shape
  相似而隐式接受。
- successor admission 在 takeover 前生成 candidate-format 的 prepared authoritative anchor Save；
  direct 路径保持 exact Snapshot，migration/adoption 路径只产生既有合同允许的变化。它既是待提交的
  replay base，也是 takeover 后、anchor commit 前失败时唯一合法的 retry Save payload。
- successor 只有在 prepared anchor 可提交且 exact fence takeover 返回 `writable` 后，才能原子安装
  authoritative Snapshot、simulation lineage、Persistence anchor 与 replay base。fresh bootstrap
  不得先对 semantic/UI/automation consumer 可见，也不得在失败时覆盖最后有效 autosave；anchor commit
  到 successor publication 之间不得开放 authoritative ingress。
- handoff Snapshot 成为新代 CommandLog replay base；旧代 CommandLog entries 不跨代搬运。successor
  第一条命令必须从 handoff 的 sequence/RNG/digest 继续并可 authoritative replay。与 load/import
  一致，旧 rollback checkpoint ring 不搬运，新代只以 handoff Snapshot 建立第一个 checkpoint；本
  车道不承诺保留 transient React state、audio/timer/effect instance 或任意旧 realm 对象。
- lease fence 严格从 predecessor 的 `n` 交给 successor 的 `n + 1`，任一时刻最多一个 writer。
  release/takeover 的 `read_only` 结果是启动失败，不是可降级成功。

## 3. Candidate classification 与失败语义

- accepted module 先解析真实 BuildIdentity 和 candidate 声明。若从 provenance、registered migration
  或 declared adoption 无法建立明确路径，在调用 predecessor invalidation/disposal 前拒绝 candidate
  或请求 R3；当前“任意改 simulation digest 仍成功”的 headless fixture 必须改为真实 compatible
  identity，或显式提供 migration/adoption。该 preflight 只证明存在明确路径，不声称具体 State 已通过
  migration/reference/invariant validation；exact admission 仍可能在 retirement 后失败并进入下述
  terminal recovery。
- 一旦 ingress fenced 并开始 exact capture，沿用当前 bounded failure model：本车道不建设可逆
  Session pause、双 Session commit 或 gameplay predecessor rollback。capture/release 后发生的
  unexpected admission/start failure 进入 terminal recovery 或显式 retry；不得谎称 predecessor
  已恢复可写。
- takeover 前失败时，coordinator 可继续使用尚未消费的 ready handoff。takeover 后启动失败时，
  failed successor 必须通过 rebootstrap cleanup 释放自己持有的最新 fence：若 authoritative anchor
  尚未 commit，retry 继续携带已 prepared 的 anchor Save；若已 commit，cleanup 只有在显式确认 runtime
  已以该 anchor 建立且重新关闭 ingress 后，才可从其 current Snapshot 生成更新 payload。任何阶段都
  禁止从 fresh bootstrap 捕获。retry 只能消费最新 Save-currentness + fence-currentness pair，不能复用
  旧 fence。
- `startWebGameApplicationV1()` 在返回 `Started` handle 前发生的 failure 也必须由 starter 内部完成上述
  cleanup，并通过一个 package-private structured start outcome（或等价的单一 typed 机制）把 latest
  handoff 交回 coordinator；不能只 throw 后让 coordinator 猜测 fence，因为此时 caller 尚无 successor
  handle。普通非-R2 start API 与错误表面不扩张。
- 如果 cleanup 无法形成新 ready handoff，transition 进入 terminal recovery并停止自动 retry。
  failure reporting 保持 diagnostic-only；不把 handoff bytes、Snapshot 或原始 Save 内容放进 DOM、
  startup diagnostics 或错误文本。
- equal-R2 application identity 继续请求 R3；R0 document/CAS refresh、R1 React/Authoring successor
  和 product 未 opt-in 的 R3 路径均不改变。Cat Cafe 现有 reload + Continue 是 R3 recovery evidence，
  不被改写成 R2 证明。

## 4. 里程碑

### M0 — Executable contract characterization（red evidence，不单独提交失败测试）

- 用将长期保留的 focused Core/Web product-contract tests 复现三个当前可到达失败并先确认 red：
  有真实 State/RNG/pending 进度的 successor 不得重新 bootstrap；takeover `read_only` 不得发布；
  successor 已消费 fence 后 start failure 的 retry 不得复用 stale fence。不得提交断言错误行为为
  golden 的 characterization test；M1 将这组 contract tests 转绿后一起交付。
- 修正现有 HMR fixture 的语义：presentation-only/compatible identity 才是 direct R2 success；
  simulation change 无 adoption/migration 必须在 predecessor retirement 前拒绝。保留 equal-R2→R3
  与 post-retirement terminal-recovery 边界。

### M1 — Base/Core exact Save adoption 与 writable lease gate

- 以 authoritative handoff contract clean-break 替换 lease-only
  `PersistenceRebootstrapDisposalV1`/`rebootstrapDisposition`，同步删除旧 export、option、测试和文档
  名称；不留 alias、deprecated wrapper 或两套并行路径。
- 从一个 fenced queue-front Snapshot 生成 clone-safe `ExportedSaveV1`，确认 exact autosave 保存与
  physical drain 后才释放 lease并形成 handoff；in-flight current、encode/digest、write 或 release
  失败全部 fail closed。
- 复用 `prepareSaveImportCandidateInternalV1`、migration resume、compatibility/adoption finish 与现有
  authoritative replacement participant；不得另写第二套 Save validator/migrator。
- successor 在 publication 前完成一次 Save admission、exact takeover 并检查 `writable`，随后原子
  安装 Session/Persistence/CommandLog anchor。验证 direct、migration、adoption、corrupt bytes、
  incompatible、reference/invariant failure、lease conflict 与 atomic no-fresh-fallback。
- focused replay 证明 handoff 后零-entry base 合法；successor 第一条 command 的 pre-state digest、
  committed RNG before 与 sequence 精确接续。rollback ring 只从新 replay base 重新播种。

### M2 — Web coordinator lifecycle 与 retry currentness

- `resolved-game-hmr`、Web HMR installer、starter 和 terminal supervisor 只传新的 richer handoff；
  successor publication 必须晚于 authoritative adoption + writable ownership。
- 区分 takeover 前 failure 与 takeover 后 failure；后者的 cleanup 返回最新 handoff 给 coordinator，
  repeated retry 每次只消费 current fence/save pair。starter 在 Promise rejection 前通过一个
  package-private structured outcome 交还 latest handoff，即使 `Started` handle 尚未形成；删除普通
  `dispose()` 吞掉 handoff、从 fresh bootstrap 重新捕获和只保护 lease-only disposition 的路径/tests。
- focused jsdom/headless 覆盖：pre-retirement incompatible rejection 保留 predecessor；post-retirement
  UI-start failure + valid retry 最终是唯一 writer；cleanup/retry 双失败进入 terminal recovery；
  Agent/Authoring sibling 保持既有边界，不扩大 identity inventory。

### M3 — 两个真实 Browser GUI 消费者与收口

- 扩展 Engine Lab 现有 Chromium/WebKit shared-presentation forward/reverse R2 case，不另建 harness：
  更新前消费真实 RNG、进入 pending并保留 dirty Authoring draft；通过真实 Save export
  比较 decoded Snapshot + `stateDigest`，证明零 page reload、Game epoch 换代、State/RNG/sequence/
  integrity/pending 连续且 Authoring sibling 仍可操作；successor 再执行一条命令后反向更新并
  重新比较到反向前基线。
- 既有 held-Agent Game/Session successor case 继续独立覆盖 Agent sibling 行为，不把 Agent
  session/run/Artifact inventory 合并进 State continuity case，也不重复 AR4 currentness matrix。
- 完整 Save bytes 不作为 Browser equality：`savedAt`、record revision、slot metadata 与 presentation
  provenance 可以合法变化。Browser 不扩展 raw admin/replay automation；replay 留在 focused Core tests。
- Cat Cafe 使用同一个中立 R2 installer/identity admission，不能复制 Engine Lab 私有协议。一个
  forward/reverse 产品 E2E 证明 opening occurrence 连续、经营路径实际消费 RNG、更新前后 decoded
  Snapshot/state digest 连续且 successor 仍可提交合法用户操作。Cat Cafe 没有 Authoring/Agent
  sibling，不为矩阵虚构一个；现有 R3 reload/Continue case 继续保留。
- 更新 design、architecture、features、development、roadmap/sequence 与 `AGENTS.md`，明确 Browser
  R2 已覆盖/仍不覆盖的语义。运行 focused tests、受影响 Chromium/WebKit E2E、`deno task check`、
  `deno task docs:build`；若修改 React/TSX，按 slice-start ref 运行 React Doctor advisory audit。

## 5. 验收

- handoff success 的 decoded authoritative Snapshot 在 direct/adoption 路径 canonical exact；State
  migration 只产生既有 migration receipt 允许的 State 变化，其他 Snapshot 轴 exact；Save digest 与
  bytes 一致。
- autosave debounce 尚未落盘时，R2 仍捕获并持久化本次 exact current safepoint；mid-span 不回退旧
  safepoint 冒充 R2 success。
- invalid/corrupt/incompatible Save、migration/adoption 缺失、reference/invariant failure、lease
  release/takeover conflict 均不发布 fresh/read-only successor；可预分类的不兼容 candidate 不退休
  predecessor。
- replay base、第一条 successor command、RNG draw count 与 command sequence 连续；旧 CommandLog/
  rollback history 不跨代。
- repeated failure/retry 只使用最新 fence，最终成功者是唯一 writer；不可恢复 cleanup 进入 terminal
  recovery，绝不继续 silent read-only；takeover 后、adoption commit 前的失败沿用 prepared anchor Save，
  不把 fresh bootstrap 误标为 current。
- Engine Lab 和 Cat Cafe 的真实 forward/reverse Browser HMR 在 Chromium/WebKit 零 page reload 且
  authoritative progress 连续；Engine Lab 的 Authoring sibling 与既有独立 Agent sibling 合同继续
  成立。
- ordinary product builds、R0/R1/R3、Desktop adapter/preflight/activation state 与 public Deno
  `>=2.9.0` floor 不变。

## 6. 明确不做

- Deno Desktop HMR activation、stable revalidation、packaging、durability promotion 或 Electron Host；
- State/Save Format V2、第二 migration/admission framework、通用 two-phase publication 或可逆 Session
  pause/rollback framework；
- 跨 R2 搬运完整 CommandLog、rollback ring、React component state、DOM identity、focus、audio、timer、
  animation、network stream 或 arbitrary extension object；
- public Mod/plugin/Agent ABI、外部 RPC protocol、OpenUI/A2UI、Effect Broker；
- exact source marker、固定源文件全文/完整 DOM sentinel、固定文件/命令顺序或新的 characterization
  harness。真实 HMR 仍可复用少数会恢复原文件的行为级 source mutation，但不得把源文本形状作为
  product assertion。

## 7. Stop conditions

- exact current Snapshot 无法与一个可持久化 safepoint、Save bytes/digest 和 lease fence 绑定；
- candidate compatibility 必须依赖未定义的 implicit State shape compatibility，或 migration/adoption
  不能复用现有 Save pipeline；
- takeover 后失败无法把最新 fence + exact Save handoff 返回 coordinator，存在 stale-fence retry、
  双 writer、silent read-only publication 或 fresh bootstrap 覆盖有效 autosave的可达路径；
- successor startup 在 authoritative anchor publication 前必须执行权威 mutation，导致 prepared Save
  不再是 current，却又没有已提交 anchor 可安全重捕获；
- 正确实现被要求保留完整旧 realm history/transient effects，必须新建通用 reversible publication
  framework 才能满足；
- Cat Cafe 需要 Story-specific fork of handoff protocol，而非同一中立 installer/identity admission。

命中停止条件时保留现有 Cat Cafe R3 与 private Desktop defer，报告真实 authority/Save 冲突；不得把
旧 autosave、read-only successor 或重新开局包装成 R2 success。
