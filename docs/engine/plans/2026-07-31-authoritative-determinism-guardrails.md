# Authoritative determinism guardrails execution plan

状态：2026-07-31 接受执行。目标合同见
[Authoritative simulation determinism boundary](../design/deterministic-simulation-boundary.md)；
在 [Production-floor sequence](2026-07-30-production-floor-sequence.md) 中属于
PF-DET，排在 PF2 Workspace Overlay pilot 之后、PF3 Save migration 之前。本文只
补齐受支持 authoritative path 的数值、direct ambient input 与跨 runtime
证据，不引入
`decimal.js`、RNG V2、StateStore 或 Mod sandbox。

## 1. Outcome

- 对当前 authoritative input/output 的真实 gate 与漏口有可重复、中性的
  baseline；
- xorshift32 的 zero absorbing state 被显式处理，不再作为普通合法恢复状态；
- Story-owned `createBootstrapInput` 只作为显式 entropy ingress adapter，其输出在
  `createInitialState` 前由 Core canonical admission + deep-freeze；
- normalized game/debug command 与完整 authoritative evidence 在执行/记录点尽早
  通过 Strict Canonical Data admission；
- fail-closed authoritative closure 有 path-aware ambient entropy/numeric
  diagnostics，且不误伤 Host/Presentation；
- test-only isolated tripwire 捕获绕过 static rule 的直接 ambient access；
- Deno、Chromium、Firefox、WebKit 对同一中性 transcript 逐 command 等价；
- 合法 Snapshot/digest/Save/replay/DebugBundle bytes 与 PF1 的 Snapshot
  digest/freeze 次数不回退；新增 bootstrap/command/evidence admission 的物理
  canonical/freeze 遍历单独计数，不把它们隐藏成“总 traversal 不变”。

这批工作提高 supported-path confidence，不认证任意 JavaScript，也不把 wall-clock
timing、机器型号或一次性 browser 数值设为 CI 硬门。

## 2. Verified starting point

2026-07-31 live audit 已确认：

- canonical encoder 对 runtime value 拒绝 fractional、non-finite、unsafe integer
  与 `-0`；Snapshot commit digest、Save encode/decode 和 Debug Bundle encode
  已走该边界；
- Strict JSON parser 先把 number token 转成 binary64 再检查 safe
  integer，因而会把数学上仍为小数、但转换时发生舍入的
  `1e-324`、`0.999999999999999999999` 和 `9007199254740990.6` 分别当成 `0`、`1`
  与 `9007199254740991` 接受；
- `createRuntimeSchemaV1` / Standard Schema adapter 会 canonicalize + freeze，但
  public `RuntimeSchemaV1` 允许手写 permissive `parse`；
- Session 只执行 `commandSchema.parse`，`factSchema` / `rejectionSchema` 未接入
  execution path，fault 没有 simulation schema；
- permissive fixture 的 `0.25` command、`0.5` committed fact 与 `0.75` rejection
  可以进入内存 CommandLog；Debug Bundle 到 export 才失败；
- replay 不重新验证 recorded command，若 driver 产出相同合法
  evidence，包含小数的 command 仍可得到 `matches: true`；
- Core 把 Story-owned `createBootstrapInput(options.host.entropy)` 的原始返回对象直接
  交给 `readBootstrapRngSeedV1` 与 authoritative `createInitialState`；整个
  bootstrap 没有 package-internal canonical admission/deep-freeze，且同一 helper
  被 initial construction、restart 与 extension context 复用；
- `rngStateV1Schema` 和测试明确接受 `cursor: 0`，xorshift32 从该状态永久输出零；
- core 没有直接 `decimal.js` import；lock 中版本只是 jsdom 的传递依赖；
- root lint 是 Oxlint；当前没有 determinism lint 或 tripwire；
- BuildIdentity 当前为四个应用记录从 `*/simulation.ts` 出发的 managed simulation
  dependency closure；连同 template 的显式 simulation entry，现有 collector 得到
  56 个 source 文件且扫描为零命中，但它漏掉五个 `*/src/story.ts` 中拥有
  `materialize*SimulationProgram` / `create*SimulationFromProgram` callback 的
  authority owner，因此不是完整 authoritative closure；
- 现有 browser suite 有 Chromium/WebKit，prebuilt 只有 Chromium，没有 Firefox
  或跨 project 的逐 command evidence comparison。
- Persistence 已接受可选的 Story-owned `summarizeSave(state)` projector。它的
  normalized output 是 durable Save annotation，会改变 Save/export bytes，但不改变
  Snapshot `stateDigest`、CommandLog、replay 或 gameplay transition。projector 对每个
  实际写入 candidate 只 capture 一次，返回数组立即 copy/freeze；null 与 empty 都表示
  “无 summary”。PF1 的 unannotated byte oracle 仍有效，但还没有 promoted
  cross-runtime summary/annotated-Save vector。

这些是计划 baseline，不等于 guardrail 已实现。

## 3. Slice order

每次只领取一个可独立合并的子切片：

```text
DET0
  -> DET1
  -> DET2a
  -> DET2b
  -> DET2c
  -> DET2d
  -> DET2e
  -> DET3a
  -> DET3b
  -> DET4
```

PF2 不依赖 PF-DET。PF3 必须等待 PF-DET promotion：M0 一旦冻结 current Save/load
行为，就不应再把 zero RNG 或 malformed command evidence 当作未决定的
历史基线。PF-D 仍是独立条件 lane。

PF-DET 切片不得与另一个正在改相同 Base Session/replay、Story tooling task、
Playwright config 或 Save schema 的切片并行合并。

## 4. DET0 — Authority map and characterization baseline

### Work

用 `@sillymaker/base/testkit` 与 Engine Lab 中性数据固定：

1. permissive handwritten command schema 接受 fractional command 的当前路径；
2. raw/mutable bootstrap handoff、`createInitialState` 接收非 canonical bootstrap
   field 的当前路径，以及 initial construction、restart 和 synthetic extension
   capture/invoke 三个调用面的现有 valid/failure shape；
3. committed fact、rejection、fault 与 RNG evidence 的 current admission
   timing；
   对 fallback fault 本身非法的 case，固定 returned result / rejected Promise、
   Session status、Snapshot/RNG/sequence 与 CommandLog 是否变化；
4. Debug Bundle late failure 与 replay command admission；
5. `cursor: 0` parse、resume 和 absorbing draw vector；
6. Strict JSON number token 的 exact-decimal gap，包括舍入后变成 safe integer 的
   fractional token、合法的数学整数替代写法和 safe-integer 边界；
7. command classes：no-draw commit、RNG commit、rejected、faulted；
8. 当前 managed simulation closure、实际 Story callback owner、template 与
   engine authority entry，以及合法 Host/Presentation negative controls；
   同时固定 Content Database authoritative `orderBy` 和 Game Authoring Kit
   transaction/apply ordering 当前使用 locale-default
   `String.prototype.localeCompare` 的路径，以及 Event Pool 对 invalid context
   number / `totalWeight` safe-integer overflow 的当前处理；枚举仓库其余
   `localeCompare` callsite，并逐项分类它是否影响 authoritative callback/order、
   bytes、stable diagnostics，还是只属于 Host/Presentation/tooling/test negative
   control；
9. 当前 Deno 与已安装 browser 的 per-command trace shape；
10. durable Save projector characterization：无 projector、null、empty、valid、
    malformed 与 throw 的 `summarizeSave`，以及 callback count、normalized frozen
    copy、fixed-state/fixed-metadata-clock Save bytes、standard receipt 与 opaque
    repository fallback equivalence；
11. bounded presentation/runtime persistence metadata characterization：
    `versionStamp` absent、all-null、partial、full、malformed 与 collector throw，
    per-service collector count、bounded printable normalization、defensive
    copy/freeze、fixed Snapshot/fixed metadata clock bytes，以及 standard receipt
    与 opaque repository fallback equivalence；同时固定 stamp 作为 Snapshot
    capture origin 在 annotation rewrite、autosave rotation 与 stored-record
    export 中被保留，而不是由后来处理记录的 runtime 重采集；load/import
    compatibility 不读取 stamp，post-load/import fresh capture 使用当前 service
    stamp。导出 filename 另以
    fixed metadata clock 覆盖有/无 extension、invalid clock 与同一秒重复建议名；
    后者只锁“秒级名称可能相同”，最终 no-clobber 由 Host collision policy 保证。

DET0 可以加入 package-internal/test-only observation，但不改变 production
behavior、public API、canonical algorithm 或 schema。JSON 输出只写 OS temp/CI
artifact；常规测试锁 outcome、count、bytes 与 first failure phase，不锁 wall
clock。

bootstrap characterization 必须把两类 case 分开：一类让 non-canonical output
当前成功到达 `createInitialState`；另一类让 adapter 在返回前受控 throw，用来固定
未来 canonical admission failure 必须保留的 call-site failure surface。synthetic
extension 只捕获并同步调用现有 `context.createInitialSnapshot`，不增加新的 production
入口。

计数 observation 必须区分：

- Snapshot digest traversal；
- Snapshot freeze traversal；
- bootstrap admission canonical traversal；
- bootstrap handoff freeze traversal；
- command admission canonical traversal；
- evidence admission canonical traversal；
- replay comparison traversal；
- total physical canonical traversal。

每个 command class 都记录公式化 before count，后续 slice 只比较对应
purpose；新增 admission 不能靠把它算进旧 Snapshot 标签或只报告 logical
invocation 来隐去真实成本。

authority map 必须从 root application registry fail-closed
枚举所有应用。每个应用必须同时有 managed BuildIdentity record（或显式 dependency
seed）和 callback-owner/explicit authority classification，并覆盖真正拥有
simulation facet callback 的
source。若 `story.ts` 同时拖入 Presentation/React，先拆出 dedicated
simulation-definition entry，不能把整棵 UI closure 当作 authoritative
scope。每次 guard 运行都重新收集 live closure，不缓存文件清单。

同一 authority map 必须把每个已配置的 `summarizeSave` owner 与 Base invocation
boundary 归类为 durable deterministic projection path。若 projector 与
React/Presentation composition 共置，先提取 dedicated save-projection entry，不能把
整棵 renderer closure 纳入 authoritative scope。玩家 note 是 persistence
metadata/input，不是 authoritative simulation callback。

`versionStamp` collector 不属于 authoritative closure；它是
presentation/runtime persistence metadata ingress。DET0 仍必须证明它只生成
bounded frozen envelope metadata，且 compatibility、adoption、Snapshot
digest/identity、CommandLog 与 replay 对其 absent/partial/full 变化保持不敏感。
malformed output、accessor/Proxy side effect 或 throw 不得污染或中止
authoritative transition；目标 normalization 不调用 getter，逐字段丢弃 malformed
值，并让最终 all-null、accessor-only 或 hostile Proxy shape 降级为 stamp absent。

### Acceptance

- characterization test 能在当前实现上稳定证明四类真实缺口：raw/mutable bootstrap
  handoff、command/evidence late admission、replay command 未 admission 与 zero
  RNG；
- bootstrap before matrix 对每次 helper invocation 固定：
  - construction valid：admission/freeze/createInitialState/Snapshot
    freeze/digest=`0/0/1/1/1`；
  - restart valid：`0/0/1/1/1`；
  - captured extension-helper valid：`0/0/1/0/0`，只返回未安装 candidate；
  - 三条受控 adapter-throw path 均为 `0/0/0/0/0`；
- adapter-throw failure 逐路径固定 Promise/throw/result、Session status、
  Snapshot identity/digest/RNG/sequence、CommandLog entries/replay base 与
  persistence anchor/slot bytes；construction 必须证明没有留下
  Session/listener/persistence owner，extension helper 必须证明同步 throw 且 live
  instance 完全不变；
- fallback fault 本身非法时的 Promise/result、Session status、
  Snapshot/RNG/sequence 与 CommandLog 现状被逐字段固定；若 DET2b 不能在不改
  public shape 的前提下保留该合同，触发 fault stop rule；
- authority map 覆盖 simulation、rules/handlers、module `propose/apply`、
  authoritative Narrative/debug callbacks、current durable Save projector 与当前已
  注册 migration entry；PF3 新增真实 migrator 时再由 PF3 注册该 callback 并扩 corpus；
- `localeCompare` inventory 覆盖全部 live callsite；任何影响 authoritative
  apply/order、bytes 或 stable diagnostics 的 callsite 都有 fixed input/output
  characterization 并明确归入 DET2e，只有证明不在 authoritative closure 的
  Host/Presentation/tooling/test callsite 才能作为 negative control；
- Host entropy、Presentation clock、tooling/bench 不被误分类；
- `versionStamp` corpus 固定 absent/all-null/partial/full/malformed/throw 的
  normalization、freeze identity 与 Save bytes；每个成功创建的 service 恰好
  collect 一次，后续 capture/rewrite/rotation/export 的新增 collect count 为 `0`；
  headless absent/all-null oracle 与 PF1 unstamped bytes 完全相同，partial/full 的
  独立 fixed bytes/SHA 不从待测 collector 或 encoder 生成；
- stamp 在 annotation rewrite、每次 autosave candidate rotation 与 stored-record
  export 后仍等于原 Snapshot capture origin；这些路径不调用当前 runtime
  collector。load/import compatibility 不读取 stamp，post-load/import fresh
  capture 使用当前 service stamp；两者都不把 stamp 纳入
  compatibility/authoritative identity；
- fixed-clock export filename corpus 明确证明秒级 suffix 不提供唯一性：同一秒可
  得到相同 suggested filename，Desktop/Browser Host 的 no-clobber collision
  policy 单独验证且不得改变 payload bytes；
- 每个后续 slice 都有明确 before count/behavior；
- 保留并复用 PF1 S0 的独立 byte oracle：现有固定 hashes 与对优化前 archive
  `96a0a93` 的比较；不得从当前 source 重新生成 expected，也不得让 expected 与
  actual 共享待测 canonical helper。archive 比较只作一次性/promotion review
  evidence；常规 CI 使用已嵌入的固定 byte length + SHA oracle，不读取 Git history
  或依赖完整 clone；
- DET0 为真实 RNG-draw committed case 从同一独立 pre-change oracle 固定额外
  byte-length + SHA/vector；现有 mixed corpus 只创建 RNG 而不 draw，不能冒充该项
  evidence。任何 divergence 先停止调查，不重新生成 golden；
- bootstrap 三条 valid path 使用 fixed entropy，并为涉及 Save 的断言同时固定
  metadata clock；construction 锁 live initial Snapshot/Save，restart 锁 installed
  Snapshot、replay base 与随后捕获的 Save，extension 锁 returned candidate 的
  canonical bytes/digest。每项都记录不可由 DET2d 重新生成的 pre-change byte-length +
  SHA；显式 oracle digest/serialization 不计入上面的 production-path delta；
- DET0 合并的是证明当前缺口的 passing characterization tests；DET1–DET3b
  每个行为改变都必须先加入或翻转目标断言并观察 focused red；
- `deno task test` 仍绿，且无 production behavior change。

## 5. DET1 — RNG zero-state contract repair

### Target behavior

- numeric seed input 和 restored `RngStateV1.cursor` 都在 runtime 拒绝 zero；
- 非零 `xorshift32-v1` frozen vectors、draw count、purpose、Snapshot
  bytes/digest 不变；
- zero 不得自动映射到固定 seed、Host entropy 或时间；
- Snapshot/Save/import/replay/debug-anchor 遇到 zero state 原子拒绝，不安装
  Snapshot、不改变 live Session；
- stable diagnostic 区分 invalid RNG state 与普通 schema mismatch。

### Compatibility gate

实现前再次扫描 maintained Save fixture、发布承诺与真实 migration
corpus。当前仓库没有维护中的 zero-state Save bytes，但 V1 public schema
曾接受它，因此必须在 promotion record 明确记录可观察收紧。

如果发现承诺有效的 zero-state record，立即停止。xorshift32 zero state 无法恢复原
non-zero lineage；不得用静默重种冒充 migration 或 byte-for-byte
replay。由用户决定保留旧零流、声明不兼容或建立新的显式产品迁移政策后再继续。

### TDD and acceptance

- 先把现有 “zero parses” test 改成目标 rejection 并观察 red；
- 覆盖 branded numeric `0 as NonZeroUint32` 的 runtime bypass；
- 构造 stateDigest 正确但 `cursor: 0` 的 raw Save，覆盖 load/import 的稳定
  diagnostic classification、原子拒绝与 live Session 不变；
- 把同一份 correctly-digested fixed zero-state Save bytes 写入 `auto.current`，以
  `resumeFromAutosave` 走完整 Core boot-resume integration；构造必须继续使用 fresh
  bootstrap Snapshot/digest/RNG/sequence，Session 保持 ready，CommandLog 为空且
  replay base 仍是 fresh bootstrap，lease/persistence ownership 与 anchor
  可继续使用，并在 boot 有意不向玩家暴露 load rejection 的同时由 diagnostics
  保留与显式 load/import 相同的 stable invalid-RNG classification；不得产生 physical
  Save write 或安装 zero-state candidate；
- 覆盖 zero-state replay anchor / debug-anchor 拒绝，以及 rejection/fault
  rollback；
- 用独立 fixed bytes/SHA 固定 zero-state Save 与 debug-anchor 输入，并逐入口锁定
  first failing phase、stable diagnostic、returned result 与 live
  Snapshot/RNG/sequence/CommandLog 不变；`auto.current` boot-resume 必须复用同一
  fixed Save oracle，不得在 DET1 green 后重生成这些输入；
- 覆盖 valid resume、load/import、replay 与 debug-anchor；
- valid corpus 的 RNG/CommandLog/Snapshot/Save bytes 完全相等；
- 不改变 algorithm ID、draw order、trace shape 或 Save envelope。

## 6. DET2a — Canonical command admission

### Changes

- game/debug command 先走 Story schema normalization，再走 package-internal
  Strict Canonical Data gate；
- executor 与 CommandLog 使用同一个 normalized frozen value；
- invalid command 在 executor、RNG 与 Session queue mutation 前返回现有稳定
  validation classification；
- authoritative replay 在把 recorded command 交给 driver 前执行同一 admission；
- 所有 public Session/Simulation/CommandLog 入口无条件执行 canonical shape
  gate；标准 Core composition 另外执行 Story command schema
  normalization。test/bench injection 只能观察/counter，不得替换或绕过
  admission。
- public `createGameSessionV1` 直接构造路径也必须执行 canonical admission；不得因
  绕开 standard Core composition 而保留 permissive bypass。

### Required tests

- fractional、non-finite、unsafe integer、`-0`、getter、custom prototype、
  sparse/cycle command；
- schema 把 authoring shorthand 规范化为合法 integer command；
- schema 产生非法 output；
- game/debug/live replay 三条路径；
- invalid command 的 Snapshot identity/digest、RNG、sequence、CommandLog
  全不变；
- invalid command 的 candidate Snapshot traversal/post-digest/freeze 为
  `0/0/0`；
- valid command 的 dispatch result、log bytes、replay 与 PF1 Snapshot
  digest/freeze count 等价；command admission 自身的 canonical traversal 按 DET0
  purpose tag 单独锁定。

### Acceptance

- permissive schema 不再允许 invalid canonical command 执行或得到 replay match；
- 不新增 public universal command envelope；
- 不改变 canonical JSON、digest algorithm 或合法 Save/replay bytes。

## 7. DET2b — Canonical finalized evidence admission

### Changes

在 candidate Snapshot/RNG 安装、publish 和 CommandLog append 前，对完整 attempt
evidence 做一次 package-internal finalization：

- facts 逐项走 `factSchema` normalization + canonical gate；
- rejections 逐项走 `rejectionSchema` normalization + canonical gate；
- debug validation evidence 走既有 schema；
- fault、RNG state/draw trace 和当前 receipt fields 至少通过 Strict Canonical
  Data 与 exact shape gate；
- CommandLog 只复制已经 finalization/freeze 的 evidence；
- Debug Bundle 不应再首次发现 live CommandLog 的 fractional evidence。

Invalid committed/rejected evidence 必须原子失败：不安装 candidate
Snapshot/RNG、不推进 sequence、不 append malformed entry。优先通过现有
Story-owned unexpected-fault policy 得到 stable canonical fault；若 fallback
fault 本身非法，则不得记录它。finalization 必须发生在 whole-tree candidate
Snapshot freeze/post-digest 前；command-start identity 只能复用已经存在的
current digest，不得为失败 attempt 重新遍历 Snapshot。

### Fault stop rule

当前没有 `faultSchema`。先用 DET0 fixture 证明一个最小 package-internal
finalizer 是否能保持现有 public result shape。若必须新增 public
Session/Simulation/CommandLog/fault contract、`GameSimulation` contract
revision、universal receipt 或跨 Base/UI/Web 的 fault envelope，停止 DET2b
并提交 design revision 给用户决定，不能在实现中偷偷扩 API。

### Acceptance

- fractional fact/rejection/fault/RNG evidence 在 first finalization boundary
  稳定失败；
- valid normalized evidence 与当前 CommandLog/replay/DebugBundle bytes
  byte-identical；
- failed evidence 的 Snapshot identity/digest、RNG 与 sequence 不变；
- failed evidence 的 candidate Snapshot traversal/post-digest/freeze 精确为
  `0/0/0`；
- committed command 仍是 PF1 的一次 Snapshot digest/freeze；evidence admission
  自身的 canonical traversal 按 DET0 purpose tag 单独锁定，且不重做整树 Snapshot
  traversal；
- public Save record 与 Surface/application receipt 语义不变。

## 8. DET2c — Strict numeric token exactness

### Changes

在 Strict JSON parser 把 number token 转成 JavaScript `number` 前，按 token 的
十进制 coefficient、scale 与 exponent 精确判断数学值：

- 继续接受数学上恰为 safe integer 的替代写法，例如 `1.0`、`1e0` 与 `100e-2`；
- 拒绝数学上仍为 fractional 的 token，即使 `Number(token)` 恰好舍入到 safe
  integer；
- 拒绝所有 negative-zero token 变体、non-finite outcome、unsafe integer 与超出
  支持范围的 exponent/coefficient；
- 不改变 canonical JSON output、key order、number spelling 或 digest algorithm。

这是 Save、Debug Bundle 与其他 Strict JSON import 的公开 admission 收紧。实施前
扫描 maintained fixture 与发布兼容 corpus；若任何承诺维护的 record 依赖 binary64
舍入后入场，停止并提交兼容性决定，不能静默重写 expected bytes。

### TDD and acceptance

- 先固定当前会错误通过的 `1e-324`、`0.999999999999999999999` 与
  `9007199254740990.6` baseline，再观察目标 rejection red/green；
- 覆盖合法 exact-integer 替代写法、`0` 与正负 safe-integer 边界、fractional
  临界值、negative-zero 变体和恶意长 token/大 exponent；
- limit、duplicate-key 与 parse-error precedence 保持现有稳定顺序；
- 合法 Save/DebugBundle/import corpus 的 decoded value、re-encoded canonical
  bytes、digest 与 PF1 独立 oracle 完全相等；
- 不改 runtime canonical value 合同、public envelope shape 或 digest algorithm。

## 9. DET2d — Canonical bootstrap handoff

### Boundary and changes

`createBootstrapInput` 虽由 Story 编写，但它在生命周期上是
composition-root/Host ingress adapter；`createInitialState` 才是消费 bootstrap 的
authoritative callback。本切片保持现有 public `GameSimulationV1` shape：

- adapter 只能消费 Core 显式注入的 `BootstrapEntropyV1` 参数；调用
  `nextUuidV4()` / `nextNonZeroUint32()` 是受控 ingress，不允许直接读
  `Math.random()`、`crypto`、clock、network、environment、locale default 或 DOM；
- Core 在 `readBootstrapRngSeedV1` 和 `createInitialState` 前，对 adapter 的整个
  output 做一次 package-internal Strict Canonical Data gate，再做一次 deep-freeze；
- seed reader 与 `createInitialState` 消费同一个 admitted frozen value，不保留 raw
  mutable mirror，也不建立第二份 authoritative state；
- initial construction、restart 与 extension context 暴露的现有
  `createInitialSnapshot` helper 全部复用该路径；
- 不新增 public bootstrap schema/envelope、`GameSimulation` contract revision 或
  application-wide receipt。

Domain-specific bootstrap validation 仍由既有 seed reader 和 Story 初始 State
schema 承担；本切片只封闭 plain canonical shape 与 immutable handoff，不能借机发明
第二套 schema contract。

### TDD and acceptance

- DET0 先固定当前 raw object identity、mutable handoff 与 non-canonical extra field
  可达 `createInitialState` 的 passing characterization；DET2d 翻转目标断言并观察
  focused red；
- invalid fixture 覆盖 fractional、non-finite、unsafe integer、`-0`、
  `undefined`、getter、custom prototype、sparse array 与 cycle；
- `createInitialState` 只收到同一个 admitted、递归 frozen value；无 Story
  依赖修改 bootstrap object；
- resolved `GameSimulation.createInitialState` 内的 Story root callback 与每个
  stateful GameplayModule initializer 都必须在 valid case 各执行一次、收到同一
  admitted object；canonical-invalid case 的这些 callback count 全为 `0`；
- 每个 canonical-invalid case 都在第一次 admission 失败，不执行 handoff freeze 或
  `createInitialState`；
- 不改变 canonical JSON/digest algorithm、合法 Save/replay bytes 或 public API。

每次 helper invocation 的 DET2d-owned delta 必须精确满足下表；tuple 顺序是
`bootstrap canonical admission / bootstrap handoff freeze / createInitialState /
Snapshot freeze / Snapshot digest`，显式 oracle comparison 不计入 production
delta。tuple 中的 `createInitialState` 是 resolved GameSimulation wrapper
invocation；其内部 root/module callback count 由上面的独立断言锁定：

| path                      | valid delta | canonical-invalid delta | required outcome                                                                                                                                                                 |
| ------------------------- | ----------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| initial construction      | `1/1/1/1/1` | `1/0/0/0/0`             | invalid 时 application Promise 在 GameSession/listener/persistence ownership 前 reject                                                                                           |
| queued restart            | `1/1/1/1/1` | `1/0/0/0/0`             | invalid 时返回既有 `runtime.anchor_failed`、Session 保持既有 `fault_paused`；Snapshot identity/digest/RNG/sequence、CommandLog/replay base 与 persistence anchor/slot bytes 不变 |
| captured extension helper | `1/1/1/0/0` | `1/0/0/0/0`             | valid 只返回未安装 candidate；invalid 同步 throw，live Session status/state/log/replay base/persistence 全不变                                                                   |

三条 valid path 必须逐项等于 DET0 用 fixed entropy（Save 另用 fixed metadata
clock）记录的 pre-change byte-length + SHA：construction 比 live initial
Snapshot/Save，restart 比 installed Snapshot、replay base 与随后捕获的
Save，extension 比 returned candidate bytes/digest。不得以 post-change
current-vs-current 或重生成 golden 自证。届时全部 registered application 与
template 都必须覆盖；任何合法 bytes divergence 先触发 stop rule。

若实现必须新增 public bootstrap schema/envelope、提升 `GameSimulation` contract
revision、改变合法 initial Snapshot/Save bytes，或发现维护中的 Story 依赖 mutable /
non-canonical bootstrap，停止并提交 contract decision，不能静默收紧后重写 fixture。

## 10. DET2e — Bounded authoritative helpers

### Changes

收紧两条已经进入 live Base、但尚未满足 accepted deterministic numeric contract 的
通用 helper：

- Event Pool 在 condition/context admission 时拒绝 fractional、non-finite、
  unsafe integer 与 `-0`；无论 ordinary draw 或 forced selection，累加每个 eligible
  weight 时都检查 safe-integer overflow，并在调用 RNG 或返回 explanation 前
  fail closed；
- Content Database 数值排序不使用可能越过 safe-integer 的 subtraction comparator；
  字符串排序改用明确的 canonical code-unit comparator，不调用
  locale-default `localeCompare`、`Intl` 或 Host locale。
- Game Authoring Kit staged transaction 的 module/apply order 使用同一明确的
  canonical code-unit semantics；owner `apply`、facts 聚合、candidate Snapshot 与
  CommandLog/replay evidence 不再由 Host locale 决定。
- 按 DET0 inventory 处理其余 `localeCompare`：凡是影响 authoritative callback
  order、authoritative bytes 或 stable diagnostics 的 callsite，都在本切片改为有
  fixed vector 的 canonical code-unit comparator；只有已证明位于
  Host/Presentation/tooling/test negative-control closure 的 callsite 才保持原状。

本切片不新增通用 numeric package、collator、自然语言排序或 locale-aware 内容 API。
若 Story 需要玩家可见的本地化排序，它属于 Presentation projection，不能反向成为
authoritative row order。

### TDD and acceptance

- Event Pool 覆盖 invalid context number、单个合法权重、逐步 overflow、forced 与
  ordinary draw；所有失败都在 RNG draw 前发生，不返回 unsafe `totalWeight`，合法
  explanation/fact/RNG vector byte-identical；
- Content Database 覆盖 safe-integer 极值、ASCII、非 ASCII、大小写和 canonically
  equivalent-but-distinct strings，固定中性 expected order，不从
  `localeCompare`/`Intl.Collator` 生成 oracle；
- transaction/apply vector 使用顺序敏感的 module IDs 与不同 owner
  proposals，逐项固定 `apply` call order、facts order、candidate Snapshot、
  CommandLog 与 replay evidence；expected 不从 `localeCompare` 或当前 Host
  locale 生成；
- 每个被归类为 authoritative bytes/stable diagnostics 的其余 callsite 都有
  focused fixed vector；DET3a 启用 hard rule 前，authoritative closure 中不再遗留
  locale-default comparator；
- DET2e 把 order/draw/apply vectors 落成可复用的 pure runner，并只在 Deno 对 fixed
  expected 执行断言；本切片不创建 Playwright config、安装 browser 或把 DET4
  browser evidence 作为自身 acceptance；
- 当前 registered Stories、PF1 oracle 与 maintained valid corpus 的
  Save/replay/diagnostic bytes 保持相等。若某个维护中的消费者依赖
  locale-default ordering，停止并提交 compatibility decision，不能重生成 golden；
- 不改变 public shape、canonical JSON 或 digest algorithm。

## 11. DET3a — Import-closure-aware static guard

### Implementation direction

保留现有 Oxlint 作为 general lint。新增独立 determinism lint/check：

- 外层从 root application registry 枚举所有应用，以现有 BuildIdentity
  managed-simulation records 作为 dependency seed，再合并 DET0 确认的 simulation
  callback owner 与显式 authority entry；
- template 使用同一个 import-closure collector 和显式 repo-internal authority
  entry；
- Base 使用有界、显式的 Session/executor/RNG/replay authority entries 收集
  dependency closure；不得扫描整个 engine，也不得因 Story collector 过滤 Base
  就漏掉 core authoritative code；
- engine-owned authoritative/migration callbacks 使用显式 entry；
- Story-owned `createBootstrapInput` callback owner 必须保留在 collected closure；
  checker 只对该函数中以已验证 `BootstrapEntropyV1` 参数为根的 capability 调用给予窄
  allowance，不能排除整个 source，也不能允许该函数直接访问 ambient provider；
- 已配置的 Story-owned `summarizeSave` owner 必须保留在 collected closure；projector
  只消费 immutable State，同一 State 必须得到同一 normalized summary，且不得读取
  ambient clock/random/network/environment/locale/DOM；
- PF-DET 先用 synthetic repo-local callback 冻结“追加显式 authority entry”的
  tooling contract；它只是 test fixture，不创建 production migration registry
  或未来文件清单。PF3 注册真实 migrator 时必须 live recollect、复用该入口并扩展
  corpus；
- 任一 registered application 缺 managed dependency seed 或缺 callback-owner /
  explicit authority classification 时都 fail closed；只有 BuildIdentity identity
  但未声明 callback owner 仍必须失败。每次运行 live recollect closure，不读取
  cached file list；
- 精确文件列表交给专用 lint runner，规则本身不依赖未验证的 filename API；
- dedicated lint config 只启用 determinism rules，不同时运行 Deno built-in
  general rules；Oxlint 仍是唯一 general lint；
- repo-owned rule core 是唯一 rule authority；若采用仍标记 experimental 的 Deno
  custom lint plugin API，plugin 只能作为该 core 的 adapter，并使用 dedicated
  `deno test` 合同测试，因为 `Deno.lint.runPlugin` 不能在当前
  Vitest-via-`deno run` 进程中直接调用；同时保留不依赖 experimental plugin API
  的 repo-owned runner fallback；
- plugin adapter 与 fallback 对同一 corpus 的 diagnostic code、file/range、message
  完全等价，并实际覆盖 plugin unavailable 时的 fallback path；
- 在 Deno 2.9.0 support floor 与 current stable 都真实运行可用 path 与同一
  diagnostics corpus，不固定开发者 host patch；
- 本切片把 dedicated determinism task 纳入 `deno task check`，不替换 Oxlint。

### Rules

第一批 error：

- `Math.random()`；
- `crypto.getRandomValues()` / `crypto.randomUUID()`；
- `Date.now()` / zero-argument `new Date()`；
- `performance.now()`；
- `fetch`、`XMLHttpRequest`、`WebSocket` 与直接 LLM/network client；
- `Deno.env`、`process.env`；
- `navigator.language` / `navigator.languages`、locale-default `Intl` /
  `toLocale*` / `String.prototype.localeCompare`；
- DOM/document/window storage 读取；
- 直接 import 已知 ambient entropy、clock、network 或 environment provider。

同一切片对 fractional literal、`parseFloat` 与 approximate `Math` 建立
diagnostic + explicit narrow exemption。当前不完整 collector 的零命中只作
baseline；DET0 得到的 fail-closed authority closure 必须在 hard rule 启用前
clean。任何 exception 必须带 reason、algorithm bounds/rounding 和 focused
vector test，不能 whole-file disable。

### Acceptance

- 每条 rule 有 positive、alias/destructure 与 negative contract tests；
- `createBootstrapInput(entropy)` 调用 injected entropy parameter 不报错；同一函数
  直接调用 `Math.random` / `crypto` 会报错，同一 source 的
  `createInitialState` 读取任何 ambient capability 也会报错；
- `new Date(explicitInstant)` 等显式、已记录输入不会被 zero-argument rule 误报；
- 所有当前 authoritative closure clean；
- Web Host bootstrap entropy、UI/presentation clock、tooling 与 benchmark
  negative controls 不在 scope；
- closure 新增一个违规依赖时会被捕获，删除依赖后不残留 stale file list；
- 新增只有 managed identity、未声明 callback owner 的 application 会 fail
  closed；
- synthetic migration-style entry 的违规被捕获，证明后续 PF3 不需要另建 lint
  path；
- Base Session/executor/RNG/replay closure 新增违规依赖时会被捕获；
- diagnostics 有 stable code、file/line/column 与修复方向；
- no exact Deno patch/browser revision attestation。

## 12. DET3b — Test-only isolated ambient tripwire

### Changes

建立短命 Deno/browser Worker 或等价 isolated realm：

1. 在 dynamic import test-only authoritative driver 前安装 throwing guards；
2. guards 至少覆盖 DET3a 的 entropy、clock、network、environment、
   locale-default 与 DOM ambient categories；
3. 启动时逐项自检 descriptor/替换是否有效；
4. realm 外构造 fixed canonical bootstrap input，执行 no-draw、RNG、
   rejected/faulted transcript；
5. terminate realm 作为清理。

不得在正常 Player/main page realm patch global，不得跨共享 `await` 做
patch/restore，也不得把 Simulation production runtime 重写为 Worker。每个
runtime 只 patch 其中实际存在的 API；缺失的 global 必须由 probe 证明访问会
稳定失败，不能把“该 runtime 没有此 API”记为 skipped coverage。

本切片建立 isolated tripwire contract 与 browser-executable test driver，但不
provision 四 runtime dependency matrix。DET4 负责 dedicated determinism
Playwright config/task、browser 安装与 production-check CI job，并在每个 browser
运行同一个 tripwire driver。普通 `deno task check` 保持 browser-free。

### Acceptance

- intentional direct ambient call 被稳定归类；
- guard 无法安装时返回 `tripwire_unavailable` 并失败，不 silently skip；
- test driver 证明没有加载 Web Host/Presentation bootstrap；
- Deno isolated realm 验证 guard availability；browser guard
  installation/descriptor 行为具有 pure harness contract，等待 DET4 的真实 browser
  matrix 验证；
- 普通 Host/bootstrap/browser E2E 不受影响；
- 文档明确它是 test probe，不是 security boundary。

## 13. DET4 — Four-runtime per-command parity

### Driver and matrix

使用 `e2e/src/testing/**` 的 test-only neutral authoritative driver，不扩张
production automation bridge，也不依赖普通 Engine Lab route 碰巧具有 fault 或
rejection-sampling command。driver 必须提供显式 deterministic fault
fixture，以及由受控 seed/raw draw 与 `exclusiveMax` 组成、必然进入 rejection
region 的 RNG vector，不能用约 `1 / 2^32` 的概率事件冒充覆盖。短小中性
transcript 至少包含：

1. no-draw committed command；
2. rejection（Snapshot/digest/RNG/sequence 不动）；
3. RNG committed command，包含 rejection-sampling evidence；
4. faulted command；
5. replay verification。

driver/comparator 还要提供可复用的 pure authoritative vector seam；PF-DET 用
synthetic normalization callback 证明 shape，并以 fixed State、fixed metadata
clock 的 `summarizeSave` vector 比较 normalized summary 与 annotated Save bytes；
同一 persistence seam 还要运行两个独立 `versionStamp` oracle：headless
absent/all-null stamp 必须继续产生 PF1 unstamped bytes；固定 browser-injected
partial/full stamp 必须在四 runtime 得到相同 normalized frozen value 与 stamped
Save bytes。all-null、完全 malformed、accessor-only、hostile Proxy 与 collector
throw corpus 固定降级为 absent，且成功创建 service 的 collector count 为 `1`、
后续处理新增 count 为 `0`；Snapshot digest、compatibility 与 authoritative trace
不因 runtime 改变。annotation rewrite、rotation 与 stored-record export 的 vector
保留原 capture-origin stamp；load/import compatibility 忽略 stamp，后续 fresh
capture 使用当前 service stamp；
fixed-clock filename vector 只比较 suggested name，并明确同一秒碰撞交给 Host
no-clobber policy，不把 filename 当作 Save identity；
DET4 还必须直接消费 DET2e 已在 Deno 固定的 exact order/draw/apply vectors，不得在
browser path 复制或重生成 expected。PF3 M1/M2 每次注册真实 format/State migration
时，再把对应 vector 接入同一 Deno/browser matrix。PF-DET 不伪造尚不存在的
migration registry。

同一 driver/compact expected vector 在：

- Deno headless；
- Chromium；
- Firefox；
- WebKit

执行。本切片建立独立 determinism Playwright config/task 与 production-check CI
job，按 locked Playwright version 安装 Chromium/Firefox/WebKit，并同时运行 DET3b
tripwire 与 parity matrix；不把 Firefox 强塞进全部 UI suite。仓库当前只有 Pages
deployment workflow，不能把 general CI 当作既有前提。缺 browser 是环境 blocker，
不能 skip 后报绿。

### Per-command comparison

- command identity 与 normalized input；
- dispatch outcome kind、facts/reasons/fault；
- committed RNG before/after、attempted draws、sequence；
- pre/post Snapshot digest；
- retained CommandLog/finalized evidence；
- replay match/mismatch classification。

报告第一处 divergence 的 project、command ordinal/identity、sequence、JSON
pointer 与 expected/actual。每个 runtime 同 transcript 重复两次；只比最终
Snapshot、只比 V8 两端或只跑 Chromium 都不算完成。

### Acceptance

- 四 runtime 逐 command compact vector 与各自 repeat 全相等；
- DET2e 的 exact Event Pool、Content Database 与 transaction/apply pure vectors
  使用同一 fixed expected 在 Deno、Chromium、Firefox、WebKit 全相等；
- headless unstamped 与 fixed browser-stamped persistence vectors 在四 runtime
  分别等于独立 expected bytes；stamp normalization、collector count/freeze、
  capture-origin preservation 和 malformed/throw fallback 无 divergence，PF1
  unstamped oracle 未被重生成或替换；
- production Browser Agent 仍不获得 raw Snapshot/RNG/CommandLog；
- 不提交 raw local report、browser cache 或一次性 transcript JSON；
- focused Deno test、dedicated browser task、`deno task test` 与
  `deno task check` 全绿；
- PF7/CI 将 dedicated matrix 作为 production promotion evidence，但普通
  `deno task check` 不因本机未安装全部 browser 而隐式下载或静默 skip。

## 14. Deferred work

本计划不实现：

- `decimal.js` 或其他 Decimal runtime；
- 通用 FixedPoint/Ratio/BasisPoints package；
- named/keyed RNG streams、RNG V2、trace V2；
- RNG reseed wall-clock lineage；
- async authority schedule perturbation（等待真实 async workload）；
- untrusted Mod sandbox/certification/taint；
- production Simulation Worker；
- canonical/digest algorithm 变化；
- Save migration、Surface、StateStore、ECS；
- `IntegrityPolicy`、module-root digest、changed-set、structural sharing 与
  changed-subtree freeze。

固定点/ratio 继续由 Story 使用带领域名字和 bounds 的 safe integers/plain data。
Decimal 只有在 design 的 activation gates 达到后才单独立项，首选 content
compiler/authoring adapter。

## 15. Validation and promotion record

每个 slice 按顺序：

1. DET0 建立 passing characterization baseline；其余行为改变 slice 先记录 focused
   red 的命令、断言与预期失败原因；
2. minimal implementation；
3. focused green；
4. affected package tests；
5. `deno task test`；
6. `deno task check`；
7. 只在 browser path 受影响时运行 dedicated parity/prebuilt matrix；
8. staged/unstaged/untracked、`git diff --check` 与独立自审。

promotion record 必须列：

- before/after admission phase 与 deterministic counts；
- bootstrap raw-to-admitted handoff、freeze identity 与 invalid-output atomicity；
- valid byte-equivalence；
- invalid failure atomicity；
- authority closure coverage 与 exemptions；
- Deno/Chromium/Firefox/WebKit evidence；
- public contract tightening；
- 仍 deferred 的 Decimal/RNG/Mod/StateStore/integrity-policy work。

每个 slice 都同步它实际落地的 public contract 与 live
`architecture.md`、`features.md`、`development.md` 或 Story authoring
文档；只影响 package-internal test/tooling 的 slice 不虚构 public capability。只有
PF-DET 完整 promotion 后，才能在公开网站或 live docs 聚合宣称整套 guardrails
已经实现。仅 design/plan 接受不构成 capability。
