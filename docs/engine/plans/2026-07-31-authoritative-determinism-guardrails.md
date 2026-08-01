# Authoritative determinism guardrails execution plan

状态：2026-07-31 接受执行；同日按 Save-metadata ownership、DET-A/DET-B join 与
latest-stable Deno policy 重切片；2026-08-01 明确 DET2a command admission 与
DET2b finalized evidence admission 的公开失败 surface、precedence、representability
与原子性。目标合同见
[Authoritative simulation determinism boundary](../design/deterministic-simulation-boundary.md)；
在 [Production-floor sequence](2026-07-30-production-floor-sequence.md) 中属于
PF-DET，排在 PF2 Workspace Overlay pilot 之后，并与 PF3 按显式 DAG 汇合。本文只
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

每次只领取一个可独立合并的子切片。跨计划顺序是：

```text
DET0-core
  -> Save M0a shared metadata floor
  -> DET1 -> DET2a -> DET2b -> DET2c -> DET2d -> DET2e  [DET-A]
      ├-> DET3a -> DET3b -> DET4                         [DET-B]
      └-> Save M0b -> M1 (strictly callback-free)
                    same-merged-HEAD join
                    -> Save M2
```

PF2 不依赖 PF-DET。M0a 先拥有一份 shared Save metadata corpus；DET0-core 只映射
`summarizeSave` authority/call boundary，不复制 metadata lifecycle golden。DET-A
完成后，callback-free M0b/M1 可以与 DET-B 并行；DET-A 不是完整 guardrail
promotion。只有 DET-B 完成才能聚合宣称 PF-DET 落地，Save M2 又必须等待 DET-B 与
M1 在同一 merged HEAD 汇合。PF-D 仍是独立条件 lane。

DET-B 独占 authority collector、determinism task、test-only driver、Playwright
config 与 CI；M0b/M1 独占 Base Save codec/load order/public persistence result types
与对应 tests。共同需要的 testkit seam/public export 必须在 fork 前单独合并。除此
之外，PF-DET 切片不得与另一个正在改相同 Base Session/replay、Story tooling task、
Playwright config 或 Save schema 的切片并行合并。

## 4. DET0-core — Authority map and characterization baseline

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
10. `summarizeSave` owner、Base invocation boundary 与未来 migration extension seam
    的 authority-map/instrumentation entry。annotation/summary/note、callback count、
    `versionStamp`、capture-origin preservation、Save bytes 与 fixed-clock filename
    corpus 由紧随其后的 Save M0a 唯一拥有；DET0-core 只冻结双方共用的
    instrumentation/authority handoff seam，不建立第二套 metadata golden。

DET0-core 可以加入 package-internal/test-only observation，但不改变 production
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
- command handoff freeze traversal；
- conditional CommandLog additional-metadata admission canonical traversal；
- conditional CommandLog additional-metadata freeze traversal；
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
presentation/runtime persistence metadata ingress。其 normalization、freeze、
failure fallback、capture-origin preservation 与 bytes 由 M0a 验收。DET0-core
只把它保留为 Host/Presentation negative control，证明 authority collector 不把该
ingress 误纳入 simulation closure。

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
  authoritative Narrative/debug callbacks 与 current durable Save projector；M2
  之前没有 production migration registry，DET-B 只用 synthetic extension seam
  证明未来可追加 entry；
- `localeCompare` inventory 覆盖全部 live callsite；任何影响 authoritative
  apply/order、bytes 或 stable diagnostics 的 callsite 都有 fixed input/output
  characterization 并明确归入 DET2e，只有证明不在 authoritative closure 的
  Host/Presentation/tooling/test callsite 才能作为 negative control；
- Host entropy、Presentation clock、tooling/bench 不被误分类；
- DET0-core 已冻结供 M0a/DET-B 共用的 projector instrumentation/authority handoff
  seam，Host/Presentation metadata ingress 不被误分类；metadata lifecycle 与 bytes
  expected 留给下一切片 M0a，DET0-core 不建立第二套 corpus；
- 每个后续 slice 都有明确 before count/behavior；
- 保留并复用 PF1 S0 的独立 byte oracle：现有固定 hashes 与对优化前 archive
  `96a0a93` 的比较；不得从当前 source 重新生成 expected，也不得让 expected 与
  actual 共享待测 canonical helper。archive 比较只作一次性/promotion review
  evidence；常规 CI 使用已嵌入的固定 byte length + SHA oracle，不读取 Git history
  或依赖完整 clone；
- DET0-core 为真实 RNG-draw committed case 从同一独立 pre-change oracle 固定额外
  byte-length + SHA/vector；现有 mixed corpus 只创建 RNG 而不 draw，不能冒充该项
  evidence。任何 divergence 先停止调查，不重新生成 golden；
- bootstrap 三条 valid path 使用 fixed entropy，并为涉及 Save 的断言同时固定
  metadata clock；construction 锁 live initial Snapshot/Save，restart 锁 installed
  Snapshot、replay base 与随后捕获的 Save，extension 锁 returned candidate 的
  canonical bytes/digest。每项都记录不可由 DET2d 重新生成的 pre-change byte-length +
  SHA；显式 oracle digest/serialization 不计入上面的 production-path delta；
- DET0-core 合并的是证明当前缺口的 passing characterization tests；DET1–DET3b
  每个行为改变都必须先加入或翻转目标断言并观察 focused red；
- `deno task test` 仍绿，且无 production behavior change。

**2026-08-01 DET0-core promotion：** 本切片只增加 package-internal/test-only
observation、authority collection 与 passing characterization，没有启用任何
admission 或修改 canonical、digest、Save、CommandLog、replay 的公开合同。四类中性
command 的 before/after production counts 相同：no-draw/RNG commit 各为 Snapshot
digest/freeze/physical canonical=`1/1/1`，rejected/faulted 为 `0/0/0`；四类均只做
一次既有 CommandLog continuity verification，command/evidence admission 均为 `0`。
replay corpus 把 `26` 次 Snapshot digest traversal、`34` 次 replay-comparison
traversal 与 `60` 次总 physical canonical traversal 分开计数。bootstrap
construction/restart/extension-helper 的既有 tuple 分别固定为 `0/0/1/1/1`、
`0/0/1/1/1`、`0/0/1/0/0`；三类受控 adapter throw 均为 `0/0/0/0/0`，且逐路径保留
原 Session、Snapshot、RNG、sequence、CommandLog、replay base、persistence owner/
slot bytes。

独立 `96a0a93` oracle 继续固定 PF1 mixed/rollback bytes，并新增 raw-bootstrap
Snapshot `224` bytes / `sha256:5a0f5dda...e6e6`、state digest
`sha256:c87eeea0...9a5`、quick Save `1447` bytes /
`sha256:c69e007a...cd83`，以及真实 RNG draw 的 dispatch/Snapshot/CommandLog
`351/202/900` bytes 与各自固定 SHA；常规测试只消费嵌入的 length+SHA，不读取 Git
history，也不从当前 canonical helper 重生成 expected。固定 seed `97` 的真实 draw
为 cursor `97 -> 25701511`、result `3`。合法值因此保持 byte-for-byte 等价；非法
fractional command/fact/rejection/fault、RNG draw/state 仍在现有 late phase 首次失败，
zero cursor 仍可 parse/resume 且 draw 后保持 zero。这些是 DET1–DET2 的红测试基线，
不是已修复能力。

collector 从 root registry live recollect `5` 个应用；本次执行观察到 `61` 个 managed
simulation records。callback owner 的 `470` 次 live barrel-closure path visit 只投影为
`61` 个 Story-owned paths；`26` 个 explicit Base roots 按 bounded-closure 或 entry-only
投影为 `41` 个 Base authoritative paths，合并后为 `102` 个 unique authoritative paths，
未退化为 whole-Base
scan。数字只记录本次 promotion，不作为冻结文件清单。closure 包含 Content Database、
Event Pool、Base/Story Narrative 与 debug callback；`17` 个 Host/Presentation/tooling/
Base non-authoritative negative controls 均在 closure 外。仓库 `9` 个
`localeCompare` callsite 已全量分类：Game Authoring Kit `3` 个、simulation cycle
diagnostic `1` 个、Content Database `1` 个进入 DET2e；Host memory record store、Desktop
tooling、testkit 与 test helper `4` 个为 negative controls。当前 `5` 个应用都未配置
production `summarizeSave`，所以 projector owner count 为 `0`；synthetic dedicated
owner 已证明缺 owner、identity mismatch、UI/test closure 与 stale policy 都 fail
closed，Base projector seam 则固定一次调用、相同 state identity、observer failure
不可改变结果/bytes。

Deno `2.9.4` 与 source-served Chromium/WebKit 对四类 command 的同一 exact trace
全量相等；常规 engine/examples/prebuilt browser suites 继续验证现有产品路径。
Firefox 专用
authoritative trace、isolated ambient tripwire、hard determinism task/CI 与
四-runtime matrix 仍属于 DET3a–DET4，不能把本记录解释为完整 PF-DET promotion。
Story callback owner 为满足 fail-closed closure 从 `story.ts` 拆到 dedicated
`simulation-definition.ts`；现有 exports/runtime composition 不变，BuildIdentity digest
按新的真实 source topology 更新。仍 deferred：DET1–DET4、M0a/M0b/M1/M2、Decimal、
named/keyed RNG、Mod sandbox、StateStore/integrity-policy/changed-set。

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

**2026-08-01 DET1 promotion：** compatibility scan 未发现 maintained、承诺有效或
migration corpus 中的 zero-state Save；本切片因此执行已经接受的 V1 schema 可观察
收紧，不静默 reseed，也不建立 migration。`RngStateV1.cursor`、numeric bootstrap seed
和标准 Core 的 restored/replacement Snapshot 统一拒绝 zero，稳定 classification 为
`rng.invalid_state`。Save/import/load、boot autosave、DebugBundle、authoritative replay、
game/debug executor candidate 与 extension/admin anchor 均在安装 candidate 前 fail
closed；Story fault normalizer 返回的 attempt 走同一 admission，不能以 committed zero
绕回 Session。显式 persistence 操作继续返回既有 player-facing `invalid_record`，同时
在 diagnostics status 保留精确 failure code。通用低层 Session/replay 仍保持
RNG-algorithm agnostic，没有新增 public validator 或第二套 state authority。

固定 pre-green 输入不由当前 codec 重生成：correctly-digested `auto.current` Save 为
`1451` bytes / `sha256:d9b01aa8...c67`，zero Snapshot/debug anchor 为 `222` bytes /
`sha256:0b0cd453...1fd`，其 state digest 为 `sha256:0b8ce31f...2b6`。修复前 zero
schema 与 branded numeric bypass 都被接受且 draw 永久保持 zero；修复后两者均在 draw
前拒绝。固定 Save 的 production decode 从 Strict parse / Snapshot digest canonical
traversal=`1/1` 且成功安装，变为 `1/0` 并拒绝；deep-freeze 始终为 `0`。空日志 zero
replay 从 driver construction / Snapshot digest traversal / replay comparison traversal /
total physical canonical traversal=`1/4/4/8`，变为 `0/0/0/0`。runtime/debug anchor 从
replacement preparation / Snapshot freeze / Snapshot digest / install=`1/1/1/1`，变为
`0/0/0/0`；bootstrap zero 也从调用 Story initial-state factory 变为调用次数 `0`。

原子性测试逐入口固定旧 Snapshot identity/digest/RNG/sequence、CommandLog/replay base、
Session status、presentation anchor、lease 与 raw slot bytes；boot-resume 保留 fixed seed
`77` 的 fresh bootstrap，随后 dispatch/save/load/replay 继续可用且没有产生 boot-time
physical write。DET0/S0 的非零 frozen vector、真实 draw、bootstrap、Snapshot、
CommandLog 与 Save length+SHA golden 全部保持 byte-for-byte 相等；algorithm ID、draw
order、purpose/trace shape、canonical JSON、digest 与 Save envelope 未改变。DET2a 及其后
续 command/evidence/bootstrap admission、ambient tripwire 和 matrix 工作仍 deferred。
in-flight anchor 被 HMR invalidation fence 后，stale candidate 的 RNG 读取和 caller
normalizer 调用都为 `0`，继续由原 Session 返回 `hmr_invalidated`；不能把本记录解释为
DET-A 或完整 PF-DET promotion。

Promotion verification 使用 Deno `2.9.4`：focused `6/127`、Base `71/762`、repository
unit `216/2090` 全绿，`deno task check` 同时通过 format/lint/style/typecheck、全部 Story
checks 与 Engine Lab production build。改动局限于 Host-neutral Base contracts/runtime 与
codec，没有浏览器交互变化，因此未机械追加独立 E2E lane。

## 6. DET2a — Canonical command admission

**2026-08-01 contract decision：** Story schema/domain validation 保留既有 result
classification；Strict Canonical Data violation 是 engine-owned contract/integrity
failure。同步 Simulation/CommandLog entry throw、Promise entry reject 从
`@sillymaker/base` root 公开的 `CanonicalJsonError`，root 同时公开
`CanonicalJsonErrorCodeV1`；稳定兼容字段是 `code` 与 `path`，其中 `path` 使用 JSON
Pointer、根路径为 `""`，message 不作兼容合同。
Command-only representability failure 同样使用该 error surface：own symbol key
与 array extra own string property 都使用 `value.unrepresented_property`，custom
array prototype 复用 `value.custom_prototype`。symbol-key `path` 指向 container，
array extra property 指向该 JSON-Pointer-escaped key，custom prototype 指向 array
本身；新 code 加入 root-exported `CanonicalJsonErrorCodeV1` stable union。
`GameSession.dispatch` 的 `commandSchema.parse`
failure 继续 resolve 为既有 `not_executed/validation_failed`；Story-facing
DebugTools 的 schema failure 与 Debug domain validation 继续使用既有 result，后者
仍携带 Story-owned non-empty errors。schema 成功后的 canonical violation 一律按
上述 throw/reject 合同失败；canonical admission 不得伪造/清空 Story errors，也不得
进入 unexpected-fault normalizer。low-level Debug control 本身没有 Story schema，
只执行 unconditional canonical shape gate。本决定不新增 command result branch 或
universal command envelope。

### Changes

- standard Core 与其他 schema-bearing game/debug ingress 先走 Story schema
  normalization，再走 package-internal Strict Canonical Data gate；该 gate 的同一次
  command-admission canonical traversal 在访问每个 container 时先做 command-only
  representability shape check。没有 Story schema 的 low-level Debug control 直接
  执行同一 unconditional admission；
- representability shape check 拒绝 own symbol keys、array extra own string
  properties 与 custom array prototype，并通过 descriptors 拒绝且不调用 represented
  accessor。同一次 traversal 由 descriptor data 生成 byte-identical canonical bytes 和
  engine-owned ordinary-data projection；admission 本身不冻结或保留 upstream normalized
  identity，也不把它交给 Story（schema helper 可按自身合同预先冻结 output），
  Proxy virtual reads、private elements 与 raw-identity-keyed side association 因而不会跨过
  ingress；
- command-admission traversal 使用稳定 depth-first ordering：每个已访问 container
  依次检查 prototype、symbol keys 与 code-point 排序后的 array extra properties，再按
  array index 升序或 plain-object key code-point order 递归。这三类 container-wide
  shape failure 都先于该 container 的 child traversal；represented accessor 只在
  traversal 到达对应 index/key 时以 `value.getter` 拒绝且不调用 getter，因此 earlier
  child failure 可以先于 later accessor。不同 container 仍由既有 depth-first order
  决定第一个 error；
- executor 与 CommandLog 使用同一个 admitted frozen projection；共享 raw alias 按
  canonical path 展开，active-ancestor cycle 仍失败，重复 ingress 各自产生新 projection；
- game schema parse failure 在 executor、RNG 与 Session queue mutation 前返回既有
  `not_executed/validation_failed`；schema 成功后的 game/debug command 以及 public
  Simulation/CommandLog/authoritative replay 的 canonical violation 按上述同步
  throw / Promise reject 合同失败；
- Story-facing DebugTools 的 capability denial 先于 Story schema；schema 成功返回后，
  下层 Session control 的 capability/session/HMR denial/stale preflight 先于
  command-admission canonical traversal 与 queue。下层 fence 胜出时不枚举/读取
  normalized command、不调用该 traversal 且不进入 queue，但不承诺上层 schema
  尚未执行；command admitted 后，queue front 仍重新检查 capability 与 Session/HMR
  状态；
- canonical admission failure 不调用 unexpected-fault normalizer，且在 queue、
  executor/authoritative replay driver、RNG、candidate Snapshot traversal/post-digest /
  freeze、CommandLog continuity/append 前原子失败；
- authoritative replay 先保留 blocking identity mismatch precedence；identity 匹配后
  先同步、各一次地 capture 完整 recorded-command vector 的 source/command identity，
  不枚举 command、不执行 canonical traversal 或 freeze；再按 entry 顺序先验证 source
  属于 `game | debug`、随后 prepare captured command。invalid source 在同 entry command
  traversal 前以 `TypeError` 失败；每个 prepare 执行一次带上述 shape check 的 command-admission
  canonical traversal。全部成功后才统一 freeze，且早于 Snapshot validation/digest
  与 driver construction；driver 只接收 captured source 与 admitted projection（包括合法
  `null`），按 prepared-record presence 选择 value，不用 nullish fallback 重新读取 entry
  slot。以一为起点的第 `k` 个 entry 若 source invalid，command canonical
  traversal 为 `k - 1`；source 合法而 command admission 失败则为 `k`。两者的 handoff
  freeze 与 driver construction 都为 `0/0`；best-effort inspection 保持 ungated；
- 所有 public Session/Simulation/CommandLog 入口无条件执行 canonical shape
  gate；标准 Core composition 另外执行 Story command schema
  normalization。test/bench injection 只能观察/counter，不得替换或绕过
  admission。
- public `createGameSessionV1` 直接构造路径也必须执行 canonical admission；不得因
  绕开 standard Core composition 而保留 permissive bypass。
- direct CommandLog additional enumerable metadata 是独立 authoritative ingress：在
  command/evidence admission 与 continuity 后、ordinal/eviction/publication 前做
  descriptor-only capture、canonical projection 与 freeze。top-level symbol/accessor
  metadata 与 enumerable engine-owned field collision 在 metadata traversal 前拒绝且
  getter=`0`；collision 不静默覆盖 engine field，returned entry type 也只暴露 engine-owned
  value。字段公开枚举顺序保持不变，raw nested identity 不保留。标准
  `{source, command}` path 不产生 metadata traversal。

### Required tests

- fractional、non-finite、unsafe integer、`-0`、getter、custom object/array
  prototype、sparse/cycle command；
- root/nested own symbol key、array extra own string property 与它们的稳定
  `value.unrepresented_property` / `value.custom_prototype` `code/path`；array
  index getter 与 extra-property getter 均不得被调用；
- multi-failure command 按 command-admission traversal 的稳定 ordering 选择第一个
  error：同一 container 的 prototype/symbol/array-extra shape failure 先于 children，
  但 earlier child failure 先于 later represented accessor；representability failure
  时 command canonical traversal/freeze 为 `1/0`；
- authoritative replay 的 later-entry representability failure 也保持全向量 command
  canonical traversal 等于走到失败 entry 的数量，handoff freeze/driver construction
  为 `0/0`；
- authoritative replay 在 prepare 前各一次 capture 全向量 source/command identity；
  prepare 后修改 entry slot 不改变 driver submission，且 capture 本身不新增 command
  canonical traversal；合法 `null` command 也只读 slot 一次并按 exact admitted
  projection 提交；
- authoritative replay 的 invalid source 在全向量 slot capture 后、该 entry command
  projection 前失败；later slots 仍各读一次，freeze/driver=`0/0`；
- Proxy virtual `get`、private elements、WeakMap raw association 与 shared alias fixtures
  证明 executor/log/replay 只收到 path-local ordinary projection；admission 不保留或冻结
  upstream identity，不同 ingress projection identity 不复用；推荐 schema 自身的既有
  output-freeze contract 继续成立；
- direct CommandLog additional metadata 的成功 `+1/+1`、numeric/value canonical failure
  `+1/0`、top-level getter/symbol descriptor rejection 与 engine-field collision `0/0`、
  nested canonical failure `1/0` 与 standard path `0/0` purpose counts；
  `__proto__`、alias、公开 key order、
  continuity-before-metadata precedence 及 no-log-mutation；
- public `canonicalJsonBytes` 对同一 symbol-keyed object、extra-property/custom-prototype
  array 的 exact bytes 与既有行为不变；
- schema 把 authoring shorthand 规范化为合法 integer command；
- schema 产生非法 output；
- game dispatch、low-level Debug 与 authoritative replay 三条路径；
- public `CanonicalJsonError` / `CanonicalJsonErrorCodeV1` root export 与稳定
  `code/path`；同步 CommandLog/Simulation throw，异步 `GameSession.dispatch`、
  low-level Debug 与 authoritative replay reject，且不进入 Story fault normalizer；
- Story-facing DebugTools capability denial 的 schema=`0`；下层 capability disabled、
  session unavailable、fault paused 与 HMR invalidated precedence。带 getter 的
  malformed normalized command 在这些下层 fence 胜出时 getter/admission/queue 调用
  均为 `0`，但上层 schema 可已执行；admitted command 在 queue front 仍有 live
  recheck；
- invalid command 的 Snapshot identity/digest、RNG、sequence、CommandLog
  全不变；
- invalid command 的 candidate Snapshot traversal/post-digest/freeze 为
  `0/0/0`；
- valid command 的 dispatch result、log bytes、replay 与 PF1 Snapshot
  digest/freeze purpose count 等价；command admission 的 canonical traversal 与
  normalized handoff freeze traversal 按 DET0-core purpose tag 单独锁定。

### Acceptance

- permissive schema 不再允许 invalid canonical command 执行或得到 replay match；
- Story schema/domain validation result 与 non-empty Debug error invariant 保持不变；
- canonical violation 的 error fields、precedence、零 normalizer/queue/executor/RNG /
  Snapshot/CommandLog mutation 由确定性测试锁定；
- admitted command 是由 canonical traversal 构造和冻结的唯一 engine-owned projection；
  admission 不冻结或保留 upstream normalized identity，receipt 只绑定 exact admitted
  projection；schema helper 的独立 output-freeze contract 不变；
- 不新增 public universal command envelope；
- public `canonicalJsonBytes` 保持已有 symbol/array-member/prototype 行为；不改变
  canonical JSON、digest algorithm 或合法 Save/replay bytes。

**2026-08-01 DET2a promotion：** command schema 的既有 result classification 保持
不变；schema 成功后的所有 public Session/Simulation/CommandLog command ingress 与
authoritative replay 现在都执行 engine-owned canonical admission。root export 新增
`CanonicalJsonError` 与 closed `CanonicalJsonErrorCodeV1`；同步入口 throw、Promise
入口 reject，稳定字段是 `code/path`（root=`""`），message 不作合同。command-only
container checks 以 prototype → symbol → code-point-sorted array extra property 的顺序
拒绝 canonical bytes 无法表示的 own members；represented accessor 仍在普通
index/key traversal 位置拒绝。public `canonicalJsonBytes` 的 permissive legacy projection
没有改变。TDD red 实际证明了 array extra/symbol/prototype bypass、CommandLog 重复 getter
读取、Replay post-preflight command replacement 与 target receipt 泛化复用；最小 green
原 promotion 的最小 green 只增加 package-internal exact-target one-shot handoff、
source/command capture 与 admission-only representability mode；其 raw same-identity freeze
主张后来被 hidden-state red tests 推翻，并由 DET2c 后记录的 projection contract repair
完整 supersede。最终合同没有新增 universal command envelope 或第二份 authoritative
command。

Failure precedence 已由确定性测试固定为：Story-facing DebugTools capability → Story
schema；lower Session capability/session/HMR fence → admission → queue-front recheck；
authoritative replay blocking identity → 全向量 source/command 各一次 capture → 逐 entry
source runtime check + command prepare → 全成功后统一 freeze → Snapshot/driver。best-effort
inspection 仍 ungated。invalid
live command 的 queue/executor/normalizer/RNG/candidate Snapshot/continuity/log mutation 均为
`0`，原 Snapshot identity/digest、sequence、status 与 replay base 不变；Replay 第 `k`
条 command 失败时 command canonical traversal=`k`，第 `k` 条 source invalid 则为
`k - 1`；两者 handoff freeze/driver 都是 `0/0`，command admission 本身不冻结 raw
input。driver 只使用 captured source 与 admitted command projection，
异步期间替换 slot 或追加 entry 都不会扩张本次 replay vector。captured source 还在同 entry
command projection 前做 `game | debug` runtime check；operation receipt 只可由 exact target、
exact admitted-projection identity 消费一次；独立或嵌套 ingress 必须重新 admission。

确定性 before/after 计数为：committed command 的 Snapshot digest/freeze 仍为 `1/1`，
另加 command admission/freeze `0/0 -> 1/1`，总 canonical/freeze `1/1 -> 2/2`；
rejected/faulted command 的 Snapshot `0/0` 不变，总计 `0/0 -> 1/1`。三 entry replay
为 canonical `60 -> 63`、command freeze `0 -> 3`，Snapshot digest `26` 与 replay
comparison `34` 不变；256-command recording 为 canonical/freeze `170/170 ->
426/426`、continuity `256` 不变；retained-200 replay 为 canonical `3409 -> 3609`、
deep-freeze `0 -> 200`、digest `1405` 不变。persistence first/rotation 为
canonical/deep-freeze `4/1 -> 5/2`、`7/1 -> 8/2`，Save serialization 与 Strict JSON
counts 不变。合法 RNG commit 的 dispatch/Snapshot/CommandLog 仍分别为
`351/202/900` bytes，SHA-256 仍为
`4af2e55854e0b159e52e15d9d0746fb9f386326672802c04e49a3a6a4b307632`、
`4dea43d8d13fc2c044a8c0e05dd2ba98ffb0f75506ca0e3d3b85cf02095e313a`、
`d9d5f751b390c1b3ef5ec45b3ed0d1ffd2b7a54d4d03e9ced17b4d6a802100c5`；S0
mixed/rollback/bootstrap/Save corpus 与 public canonical characterization 均保持
byte-for-byte 相等。

原 DET2a promotion（projection repair 前）verification 使用 latest-stable Deno `2.9.4`：focused `6/137`、Base
`72/803`、repository unit `217/2131` 全绿；`deno task check` 通过 format/lint/style/
typecheck、同一完整 unit suite、asset/Story checks 与 Engine Lab production build。
改动局限于 Host-neutral Base contracts/runtime/testkit counts 与 live docs，没有浏览器
交互变化，因此未机械追加 Playwright E2E。DET2b finalized evidence、DET2c Strict JSON
token、DET2d bootstrap、DET2e late boundary，以及 DET3/DET4/DET-A 仍 deferred；
decimal package、RNG reseed/named streams、Worker/Mod/StateStore/IntegrityPolicy 仍不在本
切片。下一独立切片是 DET2b，并继续服从其 public fault-contract stop condition。

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

### Failure classification, precedence, and atomicity

- fact/rejection schema、Debug validation-error schema 与 fault/RNG/receipt
  canonical/exact-shape failure 都属于 attempt-finalization failure；不伪装成
  command validation、Story rejection 或新 public result kind。direct synchronous
  Simulation 对 own `result` + `diagnostics` 的 attempt-shaped result、以及 direct
  CommandLog，保留既有 throw channel；opaque generic `TAttempt` 的其他 result 原样
  返回。Session 只调用一次既有 game/debug unexpected-fault callback，不增加公开
  error/envelope 或收窄 `GameSimulationV1`；
- 固定顺序是：DET2a ingress/capability/session/queue fences → post-callback HMR fence →
  descriptor-only outer attempt capture → Standard Core candidate Snapshot RNG admission
  → outcome/non-committed identity invariant → branch schema normalization → 完整
  evidence-only canonical projection → projection freeze/receipt → candidate Snapshot integrity /
  whole-tree freeze / post-digest → CommandLog continuity/append → install 与
  authoritative publication。direct CommandLog 在 source/debug-outcome 与 command
  admission 后做 evidence finalization，再做 continuity/digest audit；第一个失败胜出；
- preparation 不包含 Snapshot，也不部分冻结 earlier upstream evidence identity。所有项
  成功后才统一冻结 engine-owned evidence projection，重建 admitted attempt，并签发绑定
  exact target 与 exact admitted-attempt identity 的 one-shot package-internal receipt；
  evidence admission 本身不保留或冻结 upstream normalized identity，schema helper
  可以按自身合同预先冻结 output。result Snapshot 与 finalized `preSnapshot` 是明确的
  identity-preserving 例外；CommandLog 消费 receipt 不重做 traversal，独立或嵌套
  ingress 必须重新 finalization。跨 `await` 的 generic low-level Session adapter 若在
  自身 callback 中另行调用 public Simulation，后者属于独立 ingress；不得用 global
  async deferral 让相同 Snapshot/command 的并发 direct call 绕过 gate；
- valid canonical same-Snapshot fault fallback 只记录一条 fallback entry、返回既有
  executed/faulted 并进入 `fault_paused`；原 malformed attempt 不发布、不记录。
  normalizer 缺失/throw、返回非-faulted，或 fallback Snapshot/evidence 仍非法时不递归
  normalizer，Promise reject、回到 original stable status，且 Snapshot/RNG/sequence/
  replay base/log 不变。合法 Debug validation failure 仍不写 log；malformed errors
  走同一个 debug fallback policy；
- 已进入 queue 的 busy/idle observer notification 可以照旧发生，但 preparation failure
  前不得有 candidate Snapshot traversal/post-digest/freeze、`onAttempt`、transient/
  semantic publication、continuity/ordinal/eviction 或 persistence/autosave mutation。
  若 HMR 是 Story evidence schema callback 在 preparation 内同步触发，已开始的 schema/
  canonical/freeze 工作无法追溯撤销；finalization 后必须再 fence，且 CommandLog、install、
  publication 与 persistence mutation 仍为零；

### Fault stop rule

当前没有 `faultSchema`。先用 DET0-core fixture 证明一个最小 package-internal
finalizer 是否能保持现有 public result shape。若必须新增 public
Session/Simulation/CommandLog/fault contract、`GameSimulation` contract
revision、universal receipt 或跨 Base/UI/Web 的 fault envelope；若无法保持 DET1
zero-RNG precedence、fallback-invalid 的 rejected-Promise + original stable status +
no-new-log 合同，或无法在零 candidate Snapshot traversal 下失败，停止 DET2b 并提交
design revision 给用户决定，不能在实现中偷偷扩 API。

### Acceptance

- fractional fact/rejection/fault/RNG evidence 在 first finalization boundary
  稳定失败；
- Debug validation error、attempt-shaped direct Simulation result 与 independent public
  CommandLog ingress 覆盖相同 schema/canonical/exact-shape gate，同时保留 opaque generic
  `TAttempt` result；multi-invalid fixture 固定 post-callback HMR → outer shape → candidate
  RNG → branch schema → canonical evidence 的 first-error order；
- invalid original + valid fallback 只调用一次 normalizer、只记录 fallback 并进入
  `fault_paused`；invalid/absent fallback 不递归 normalizer，Promise reject、Session
  回到 original stable status 且不新增 log；
- valid normalized evidence 与当前 CommandLog/replay/DebugBundle bytes
  byte-identical；
- failed evidence 的 Snapshot identity/digest、RNG 与 sequence 不变；
- failed evidence 的 candidate Snapshot traversal/post-digest/freeze 精确为
  `0/0/0`；
- two-phase prepare failure 不由 evidence admission 部分冻结 earlier upstream identity，也不
  发布或冻结 partial engine-owned projection；每个完整 attempt
  只有一次 `evidence_admission` traversal，CommandLog handoff 为 exact target、exact
  admitted-attempt identity、one shot 且不重复 admission；admission 不冻结或保留
  upstream evidence identity，Snapshot identity 例外保持原 authoritative identity；
- facts/reasons/attemptedDraws/Debug errors 各以一次 own `length` data descriptor capture
  固定完整 vector，Proxy virtual `get("length")` 为 `0`；
- committed command 仍是 PF1 的一次 Snapshot digest/freeze；evidence admission
  自身的 canonical traversal 按 DET0-core purpose tag 单独锁定，且不重做整树 Snapshot
  traversal；
- public Save record 与 Surface/application receipt 语义不变。

**2026-08-01 DET2b promotion：** finalized attempt/Debug validation evidence 现在先做
descriptor-only exact outer capture；Standard Core 依次执行 candidate Snapshot RNG、
result constraint、Story fact/rejection/debug-error normalization 与一次 Snapshot-free
`evidence_admission` canonical projection/freeze。Session→CommandLog 使用绑定 exact admitted
attempt identity 的 one-shot handoff，independent CommandLog 与 attempt-shaped direct
Simulation 自行 admission；admission 不保留或冻结 upstream normalized evidence，schema
helper 的既有 freeze contract 与 Snapshot identity 都明确保留；opaque
generic `TAttempt` 保持原样。没有新增 public evidence hook/receipt、fault schema、result
branch 或 `GameSimulation` revision。Core authoritative replay 复用相同 normalization 与
fault fallback；Debug original replay 同 live path 禁止 rejected，fallback 必须 faulted。

失败分类保持既有 surface：sync direct ingress throw，Session/authoritative replay reject 或
只调用一次既有 unexpected-fault normalizer。合法 same-Snapshot canonical fault 是唯一可
记录 fallback；invalid/non-faulted fallback 不递归 normalizer。固定 precedence 是
post-callback HMR → outer shape → Core candidate RNG → result constraint/non-commit identity →
branch schemas → evidence canonical/freeze → Snapshot integrity/freeze/digest → post-finalization
HMR → CommandLog continuity/append → install/publication。若 Story schema 在 preparation 内
同步触发 HMR，已经开始的 pure preparation 不可回滚，但 log/install/publication 仍为零。
generic async Session adapter 内显式调用 public Simulation 属于独立 nested ingress，不用
global cross-await deferral 混淆并发 direct call。

TDD red 先证明 fractional fact/rejection/fault/RNG/Debug error、outer getter/extra shape、
重复 Session→CommandLog admission、zero-RNG/evidence precedence、invalid fallback、replay
normalization 与 partial freeze 的 permissive 行为；独立复审又复现并关闭 Debug raw getter、
Debug-rejected pre-freeze、live/replay fallback kind divergence、post-callback/post-finalization
HMR、undefined attempt、primitive Debug fault、stale failure attribution，以及 max-length sparse
array 的 OOM 路径。最大 `0xffff_ffff` sparse facts 现在不物化 index vector，稳定在
`/result/facts/0` 拒绝。

确定性 before/after 计数为：committed command 总 canonical/freeze `2/2 -> 3/3`，
rejected/faulted `1/1 -> 2/2`；每个 completed finalization 精确新增一次
`evidence_admission` canonical 与 freeze，原 Snapshot digest/freeze 分别保持 `1/1`、
`0/0`。256-command recording canonical/freeze `426/426 -> 682/682`，Snapshot digest
`170`、continuity `256` 不变；5/201-attempt memory probes `10/10 -> 15/15`、
`402/402 -> 603/603`；persistence first/rotation `5/2 -> 6/3`、`8/2 -> 9/3`，
two-attempt aggregate `13/4 -> 15/6`，Save serialization/Strict parse、digest 与 continuity
counts 不变。retained-200 replay execution canonical/freeze 仍为 `3609/200`，录制侧随 256
次 finalization 变为 `682/682`。

合法 RNG commit 的 dispatch/Snapshot/CommandLog 仍为 `351/202/900` bytes，既有三个
SHA-256 golden、mixed/rollback/bootstrap/Save corpus、authoritative replay 与 DebugBundle
bytes 全部保持 byte-for-byte 相等；canonical JSON、digest、Save/CommandLog/replay public
shape 未改变。latest-stable Deno `2.9.4` 验证为 focused `7/211`、Base `73/834`、repository
unit `218/2162` 全绿；`deno task check` 通过 format/lint/style/typecheck、同一完整 unit、
assets/全部 Story checks 与 Engine Lab production build。改动仅限 Host-neutral Base 与 live
docs，未机械追加浏览器 E2E。下一独立切片是 DET2c Strict numeric token exactness。

## 8. DET2c — Strict numeric token exactness

### Changes

在 Strict JSON parser 把 number token 转成 JavaScript `number` 前，按 token 的
十进制 coefficient、scale 与 exponent 精确判断数学值：

- 继续接受数学上恰为 safe integer 的替代写法，例如 `1.0`、`1e0` 与 `100e-2`；
- 拒绝数学上仍为 fractional 的 token，即使 `Number(token)` 恰好舍入到 safe
  integer；
- coefficient 全零且 lexical sign 为负时返回既有 `number.negative_zero`；非零但数学
  值仍为 fractional 时返回 `number.not_integer`；数学上恰为整数、但绝对值超出
  safe-integer range 时返回 `number.unsafe_integer`，包括 binary64 conversion 会成为
  non-finite 的巨大正 exponent；
- `StrictJsonLimitsV1.maxBytes` 是唯一 numeric-token 资源上限；在这个 bound 内做线性
  coefficient scan、饱和 exponent comparison；合法 exact-integer path 只对至多 16
  位 normalized digits 做最终 `Number` conversion。为保留下面的旧 failure
  precedence，已由 exact math 判定为 fractional、但旧 parser 可能因舍入接受的 token
  可额外执行一次受同一 `maxBytes` 约束的 legacy binary64 classification；该结果只决定
  failure 是立即返回还是 deferred，不参与 admission、decoded value 或 canonical
  bytes。不引入 BigInt/Decimal、按 exponent 的 allocation/幂运算或第二个任意
  token-length limit。巨大负 exponent 的非零值归类为 fractional，任意 exponent 的
  正零仍归一为 `0`；
- 不改变 canonical JSON output、key order、number spelling 或 digest algorithm。

这是 Save、Debug Bundle 与其他 Strict JSON import 的公开 admission 收紧。实施前
扫描 maintained fixture 与发布兼容 corpus；若任何承诺维护的 record 依赖 binary64
舍入后入场，停止并提交兼容性决定，不能静默重写 expected bytes。

### TDD and acceptance

- 先固定当前会错误通过的 `1e-324`、`0.999999999999999999999` 与
  `9007199254740990.6` baseline，再观察目标 rejection red/green；
- 覆盖合法 exact-integer 替代写法、`0` 与正负 safe-integer 边界、fractional
  临界值、negative-zero 变体和恶意长 token/大 exponent；
- bytes/BOM/UTF-8 preflight、depth/node/collection limit、object key 与 number token
  的 traversal 顺序不变。旧 parser 已经立即拒绝的 numeric token 保持 immediate
  failure；只对旧 parser 因 binary64 舍入而接受、DET2c 才发现的 exact-number
  failure 做 deferred reporting，使 document 余下部分原本会产生的 later syntax、
  trailing-comma、duplicate-key 或 structural-limit failure 保持 precedence；若余下
  document 合法，则返回最早的 deferred `number.not_integer`；
- 合法 Save/DebugBundle/import corpus 的 decoded value、re-encoded canonical
  bytes、digest 与 PF1 独立 oracle 完全相等；
- Strict parse 失败不返回 partial value；Save/DebugBundle decoder 必须在 schema、
  digest 与 authoritative replacement 前原子返回既有 rejection，不新增 result
  branch 或 envelope field；
- 不改 runtime canonical value 合同、public envelope shape 或 digest algorithm。

**2026-08-01 DET2c promotion：** tracked config、静态 JSON value、M0a 的 10 份
fixed Save metadata records、DET1 zero-state fixture、Save golden 与 DebugBundle raw
input 审计均未发现任何 maintained valid record 依赖 binary64 舍入，因此没有触发
compatibility stop condition。Strict parser 现在先手工扫描 JSON number grammar，再以
coefficient/fraction length/trailing zeros 与饱和 exponent 精确分类；合法 path 只构造
至多 16 位 integer digits。`1e-324`、`0.999999999999999999999`、
`9007199254740990.6` 等 rounded fractions 稳定返回 `number.not_integer`，真正的
negative-zero spelling 返回 `number.negative_zero`，数学整数但超 safe range（包括
`1e309`）返回 `number.unsafe_integer`；`1.0`、`1e0`、`100e-2`、长尾零抵消与正负
safe boundary 仍解码为同一整数。没有新增 error code、numeric package、public API 或
第二个 token limit。

第一轮 focused red 为 `31` tests 中 `7` red，精确固定四类 rounding gap 与 non-finite/
巨大 exponent 的旧错误分类；第二轮 precedence red 为 `35` tests 中 `4` red。最终
parser 对旧实现因舍入而接受的 fractional token 暂存第一处 exact failure，保留 later
syntax/trailing-comma/duplicate-key/node-limit 的既有 precedence；旧实现本来立即拒绝的
numeric token 仍立即失败。独立 BigInt oracle 的 `788,018` 个生成 token 与 20 MB 级
resource probe 均通过；常规测试另保留 `2,048` 个确定性 oracle vector。Save
`formatRevision: 1.0` 与 DebugBundle `1e0` 输入 decode 后重编码为原 canonical bytes，
fractional variant 在 schema/digest 前原子拒绝；10 份 fixed Save records 逐份
Strict-decode 后的 canonical bytes、byte digest 与 Snapshot state digest 全部等于既有
oracle。每次 decoder 的 `strictJsonParses` 仍为 `1`，encode preflight、canonical/
digest/traversal work counts 未改变。

latest-stable Deno `2.9.4` 验证为 focused `6/132`、Base `73/877`、repository unit
`218/2205` 全绿；`deno task check` 通过 format/lint/style/typecheck、同一完整 unit、
assets/全部 Story checks 与 Engine Lab production build。实际 Web import/build path 另以
Engine Lab Chromium/WebKit/touch/responsive suite `103/103` 通过。下一独立切片是 DET2d
canonical bootstrap handoff。

**2026-08-01 DET2a/DET2b projection contract repair：** Proxy virtual reads、class private
elements 与 identity-keyed `WeakMap` fixture 证明“验证后 freeze raw identity”不能兑现
canonical-only ingress；保留 raw identity 也不存在 portable reflection proof。command 与
Snapshot-free evidence admission 因而改为在原一次 canonical traversal 内构造 path-local
ordinary projection，只 freeze/交付该 projection；admission 本身不冻结或保留 upstream
identity，schema helper 可能已冻结自身 output；
Snapshot/preSnapshot identity 明确保留。shared alias 按 path 展开、cycle 仍拒绝；public
bytes-only encoder 保持原 hot-path body 与 Proxy length-read characterization，valid ordinary
projection bytes、重新编码 bytes、现有 digest/Save/CommandLog/replay corpus 均 byte-identical。

同一 repair 关闭了 direct generic CommandLog extra-field raw identity 旁路：non-empty
enumerable metadata 独立 project/freeze 并保留 entry key order，标准 Session path 为 `0/0`；
valid extras 为 `1/1`，top-level symbol/accessor 或 engine-field collision rejection 为
`0/0`，已进入 traversal 的 nested/numeric/value failure 为 `1/0`，且都无 publication。
Evidence array 使用固定 own length descriptor，authoritative replay
在全向量 slot capture 后逐 entry runtime-check source；第 `k` 个 invalid source 只有 `k - 1`
次 command traversal，freeze/driver=`0/0`。TDD red 的 command/evidence hidden-state matrix 为
`16` tests 中 `4` red；dynamic evidence length + replay `null` follow-up 为 `41` 中 `4` red，
CommandLog engine-field collision 为 `31` 中 `1` red。green 后 focused `12/289`、Base
`73/899`、repository unit `218/2227`、`deno task check` 与 Engine Lab browser `103/103`
全绿。Snapshot benchmark 的
100/1k/10k/100k command counts 仍为 commit `3/3`、reject/fault `2/2`（canonical/freeze），
mixed recording `682/682`、retained replay `3609/200`、persistence `15/6`；wall-clock 只作
trend evidence。下一独立切片仍是已按 projection ownership 修订的 DET2d。

## 9. DET2d — Canonical bootstrap handoff

### Boundary and changes

`createBootstrapInput` 虽由 Story 编写，但它在生命周期上是
composition-root/Host ingress adapter；`createInitialState` 才是消费 bootstrap 的
authoritative callback。本切片保持现有 public `GameSimulationV1` shape：

- adapter 只能消费 Core 显式注入的 `BootstrapEntropyV1` 参数；调用
  `nextUuidV4()` / `nextNonZeroUint32()` 是受控 ingress，不允许直接读
  `Math.random()`、`crypto`、clock、network、environment、locale default 或 DOM；
- Core 在 `readBootstrapRngSeedV1` 和 `createInitialState` 前，对 adapter 的整个
  output 做一次 package-internal Strict Canonical Data projection traversal，再对
  engine-owned ordinary projection 做一次 deep-freeze；
- projection traversal 使用 fully-represented-own-data mode，拒绝 own symbol、array
  extra property 与 custom array prototype；同一 traversal 生成 unchanged canonical bytes
  和 path-local plain projection，public canonical JSON/digest algorithm 保持不变；
- seed reader 与 `createInitialState` 消费同一个 admitted frozen projection；adapter raw
  output 保持 caller-owned 且不冻结、不保留，不建立第二份 authoritative state。seed 只做
  descriptor-safe read/parse 一次并复用，不能在 Story callback 后重读；
- initial construction、restart 与 extension context 暴露的现有
  `createInitialSnapshot` helper 全部复用该路径；
- 不新增 public bootstrap schema/envelope、`GameSimulation` contract revision 或
  application-wide receipt。

Domain-specific bootstrap validation 仍由既有 seed reader 和 Story 初始 State
schema 承担；本切片只封闭 plain canonical shape 与 immutable handoff，不能借机发明
第二套 schema contract。

### Failure classification, precedence, and atomicity

helper 的 stage order 与第一个失败 precedence 固定为：

1. `createBootstrapInput` adapter；
2. fully-represented Strict Canonical Data projection traversal；
3. engine-owned projection recursive freeze；
4. descriptor-safe seed read 与既有 seed parse；
5. resolved `createInitialState`：Story root callback/aggregate State schema，随后按
   module tuple 顺序执行每个 stateful initializer/schema/owned-slice equivalence；
6. Snapshot envelope schema；
7. 仅在 construction/restart install path 发生的 Session Snapshot
   integrity/freeze/digest 与 anchor preparation。

| first failure                           | direct construction / extension                                                         | queued restart                               | deterministic work before failure       |
| --------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------- |
| adapter throw                           | 保留 exact thrown value；construction reject、extension sync throw                      | 既有 `runtime.anchor_failed`；`fault_paused` | `0/0/0/0/0`                             |
| canonical/representability violation    | root-public `CanonicalJsonError(code, path)`；construction reject、extension sync throw | 既有 `runtime.anchor_failed`；`fault_paused` | `1/0/0/0/0`                             |
| reflection/projection operational throw | 保留 exact Proxy/allocation/define error；construction reject、extension sync throw     | 既有 `runtime.anchor_failed`；`fault_paused` | `1/0/0/0/0`                             |
| projection freeze throw                 | 保留 exact thrown value；不得进入 seed/Story callback                                   | 既有 `runtime.anchor_failed`；`fault_paused` | `1/1/0/0/0`                             |
| canonical-valid seed failure            | 保留既有 seed error；zero 仍为 `rng.invalid_state`                                      | 既有 `runtime.anchor_failed`；`fault_paused` | `1/1/0/0/0`                             |
| Story/State/module/Snapshot failure     | 保留当前 callback/schema/equivalence error channel                                      | 既有 `runtime.anchor_failed`；`fault_paused` | `1/1` 加实际已到达 callback；无 install |

tuple 顺序是 `bootstrap canonical admission / bootstrap handoff freeze / resolved
createInitialState / Snapshot freeze / Snapshot digest`。canonical traversal 完整成功后才开始
freeze；bootstrap admission 本身不冻结 raw output，freeze 只访问新建 projection，failure 时 partial
projection 不可达。Proxy reflection trap 可能从 traversal 的 operational channel 抛出，但
不得发布 partial projection；不保存 raw descriptor graph，也不增加 post-freeze verification
或第二次 canonical traversal。

组合 failure 的稳定 precedence 也由该顺序决定：canonical-invalid + zero seed 报
canonical failure；canonical-valid zero seed 先于任何 Story initializer failure；root
callback/aggregate schema 先于 module initializer，module failure 按声明 tuple 的第一项
胜出。canonical container 内先检查 prototype、own symbols 与按 Unicode code-point
排序的 array extra property，再按 depth-first order（array index 升序、object key 按
Unicode code point）遍历 child；represented getter 只在到达它时拒绝且绝不调用。

queued restart 继续受既有 pre/post HMR fence 保护：preflight HMR 时 helper work 为
`0/0/0/0/0`；若 Story/Proxy code 在同步 helper 中主动触发 invalidation，post-operation /
catch fence 的 HMR outcome 胜出并禁止 install，但已经执行的 transient adapter/projection
work 不回滚。DET2d 不给 captured extension helper 新增 queue、HMR 或 disposed fence。

所有 helper failure 均不得创建或替换 authoritative Snapshot、Session、CommandLog replay
base 或 persistence anchor：construction 必须在 Session/listener/lease 前失败；restart
保持 installed Snapshot identity/digest/RNG/sequence、log/replay base 与 persistence bytes；
extension 保持 live Session/status/log/persistence。Story callback 自行产生的外部副作用不在
engine rollback 边界内，initializer 仍必须是 pure。

### TDD and acceptance

- DET0-core 先固定当前 raw object identity、mutable handoff 与 non-canonical extra field
  可达 `createInitialState` 的 passing characterization；DET2d 翻转为 engine-owned
  path-local projection 目标断言并观察
  focused red；
- invalid fixture 覆盖 fractional、non-finite、unsafe integer、`-0`、
  `undefined`、getter、custom object/array prototype、own symbol、array extra property、
  sparse array 与 cycle；另用 canonical-invalid + zero、canonical-valid zero 与
  projection-freeze operational failure fixture 锁定跨阶段 precedence；
- `createInitialState` 只收到同一个 admitted、递归 frozen projection；admission 不冻结或
  保留 raw adapter output，shared alias 按 path 展开，Proxy/private/WeakMap identity state 不跨
  ingress；无 Story 依赖修改 bootstrap object；
- resolved `GameSimulation.createInitialState` 内的 Story root callback 与每个
  stateful GameplayModule initializer 都必须在 valid case 各执行一次、收到同一
  admitted projection object；canonical-invalid case 的这些 callback count 全为 `0`；
- 每个 canonical-invalid case 都在第一次 admission 失败，不执行 handoff freeze 或
  `createInitialState`；
- canonical-valid seed-invalid 与 projection-freeze throw 分别固定 `1/1/0/0/0`；adapter
  throw 保持 `0/0/0/0/0`；canonical/projection traversal operational throw 固定
  `1/0/0/0/0`；
- Proxy virtual `get`、private elements、WeakMap raw association 与 shared alias fixture
  证明 seed reader/root/modules 只收到 projection；admission 不冻结 raw，valid path 不增加
  第二次 canonical traversal；
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

三条 valid path 必须逐项等于 DET0-core 用 fixed entropy（Save 另用 fixed metadata
clock）记录的 pre-change byte-length + SHA：construction 比 live initial
Snapshot/Save，restart 比 installed Snapshot、replay base 与随后捕获的
Save，extension 比 returned candidate bytes/digest。不得以 post-change
current-vs-current 或重生成 golden 自证。届时全部 registered application 与
template 都必须覆盖；任何合法 bytes divergence 先触发 stop rule。

若实现必须新增 public bootstrap schema/envelope、提升 `GameSimulation` contract
revision、改变合法 initial Snapshot/Save bytes，或发现维护中的 Story 依赖 mutable /
non-canonical bootstrap，停止并提交 contract decision，不能静默收紧后重写 fixture。

**2026-08-01 DET2d promotion：** Standard Core 的 initial construction、queued restart 与
captured extension helper 现共用一次 package-internal bootstrap admission：adapter raw output
在一次 fully-represented canonical traversal 中变为 path-local ordinary projection，随后只对
engine-owned projection 做一次 recursive freeze。raw 保持 caller-owned 且不冻结、不保留；
shared alias 按 path 展开，cycle 拒绝，Proxy virtual read、private element 与 raw-identity
`WeakMap` association 均未跨 ingress。seed 从 frozen projection descriptor-safe 读取并 parse
一次，resolved root 与每个 stateful module initializer 按 tuple order 收到同一个 projection；
没有新增 public schema、receipt、hook、contract revision 或第二份 authoritative state。

pre-DET2d committed path 的 tuple 为 construction/restart `0/0/1/1/1`、extension
`0/0/1/0/0`；本切片后分别稳定为 `1/1/1/1/1` 与 `1/1/1/0/0`。adapter throw 仍为
`0/0/0/0/0`，canonical-invalid 与 traversal operational throw 为 `1/0/0/0/0`，
projection-freeze 与 canonical-valid zero seed 为 `1/1/0/0/0`。construction failure 在任何
Session/listener/lease 前 reject；restart 保留 installed Snapshot identity/digest/RNG/sequence、
CommandLog/replay base 与 Save bytes，并进入既有 `fault_paused`；extension 同步失败保持 live
Session 为 `ready`。其后的 root/module ordering 与 HMR fence 沿用已有 resolved wrapper 和
Session queue 合同；完整回归套件保持这些 failure channels。

production change 前的 red run 为 repository `219` files / `2269` tests 中 `11` red：
admission `7` 项精确命中旧 raw identity/freezing 与缺少 projection-freeze failure，Core `4` 项
命中三入口同一问题；其余 `2258` 项通过。初始 green 为 `2/111`；独立 acceptance review 又补入
raw Proxy descriptor/virtual-seed negative control、root/aggregate/first-module sentinel 与 restart
HMR preflight/post/catch fence，最终 focused 为 `3/133`。这些测试覆盖 invalid shape matrix、
failure precedence/atomicity、三入口 work tuple 与 projection byte parity；相关合同组为 `5/144`，
Base 为 `74/947`，repository unit 为 `219/2275`。pre-change fixed oracle 逐项保持：
construction Snapshot `223` bytes / `sha256:6c99d0d9a0c04502afed614772cd2a477eb532379bce41b3e27f2ea1321b65ea`、
State digest `sha256:8e239525d6a136d496011d477d123c90bfebb343c2b548d791457dfff60ddfdd`、
quick Save `1446` bytes / `sha256:830ca8717f94430b384fb8a42c4521becdb3e935d1b23c07446c5f01f9986ac4`；
subsequent Snapshot `224` bytes / `sha256:4e3d87e3fd4ae7f95af30380b018f686dc76176ee68a75fec254fa76fa41e236`、
State digest `sha256:b609af2038e7cec8ec3995f452dd8d0a76e952c7753db1d335d9e177093fbfad`、
quick Save `1447` bytes / `sha256:14bd0f03e919398a146bf9a54b0f29af856a409cf4008fc16ad05578f1ca01a8`。

latest-stable Deno `2.9.4` 下 typecheck、完整 `deno task check` 与 Engine Lab browser
`103/103` 通过；全部 registered Stories/template 保持 check/build。Snapshot benchmark
schema-v3 report 写入 OS 临时目录，既有 Session workload 计数未改变：commit `3/3`、
reject/fault `2/2`（canonical/freeze），mixed recording `682/682`、retained replay
`3609/200`、persistence `15/6`。public canonical encoder 保持 pre-slice source，合法
Snapshot/digest/Save/replay bytes 未变化。下一独立切片是 DET2e bounded authoritative
helpers。

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
- 按 DET0-core inventory 处理其余 `localeCompare`：凡是影响 authoritative callback
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

**DET-A gate：** DET1–DET2e 全部完成后，合法 authoritative bytes/order 才成为
M0b 的 current baseline。此时可以分叉 callback-free M0b/M1，但不得宣称完整
determinism promotion，也不得注册 executable migrator。

## 11. DET3a — Import-closure-aware static guard

### Implementation direction

保留现有 Oxlint 作为 general lint。新增独立 determinism lint/check：

- 外层从 root application registry 枚举所有应用，以现有 BuildIdentity
  managed-simulation records 作为 dependency seed，再合并 DET0-core 确认的 simulation
  callback owner 与显式 authority entry；
- template 使用同一个 import-closure collector 和显式 repo-internal authority
  entry；
- Base 使用有界、显式的 Session/executor/RNG/replay authority entries 收集
  dependency closure；不得扫描整个 engine，也不得因 Story collector 过滤 Base
  就漏掉 core authoritative code；
- engine-owned authoritative callbacks 使用显式 entry；migration callback 在 M2
  首次真实注册时才加入 live recollection，DET3a 只用 synthetic extension seam
  验证该能力；
- Story-owned `createBootstrapInput` callback owner 必须保留在 collected closure；
  checker 只对该函数中以已验证 `BootstrapEntropyV1` 参数为根的 capability 调用给予窄
  allowance，不能排除整个 source，也不能允许该函数直接访问 ambient provider；
- 已配置的 Story-owned `summarizeSave` owner 必须保留在 collected closure；projector
  只消费 immutable State，同一 State 必须得到同一 normalized summary，且不得读取
  ambient clock/random/network/environment/locale/DOM；
- PF-DET 先用 synthetic repo-local callback 冻结“追加显式 authority entry”的
  tooling contract；它只是 test fixture，不创建 production migration registry
  或未来文件清单。Save M2 首次注册真实 migrator 时必须 live recollect、复用该
  入口并扩展 corpus；
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
- public compatibility floor 仍为 Deno `>=2.9.0`；required CI/promotion 只在执行
  时 latest stable 上运行可用 path 与 diagnostics corpus，记录实际版本、不固定
  patch，也不增加 2.9.0 per-PR lane；
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
baseline；DET0-core 得到的 fail-closed authority closure 必须在 hard rule 启用前
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
- synthetic migration-style entry 的违规被捕获，证明后续 Save M2 不需要另建 lint
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
synthetic normalization callback 证明 shape，并直接消费 M0a 的 compact fixed
vectors：fixed State/metadata clock 下的 normalized `summarizeSave` output、annotated
Save bytes、headless absent/all-null `versionStamp` 的 PF1 unstamped bytes，以及 fixed
partial/full stamp 的 normalized value/stamped bytes。Expected 只由 M0a corpus
拥有，DET4 不重生成。Exactly-once capture、malformed/throw fallback、annotation
rewrite/rotation/export preservation、post-load fresh capture 与真实 filename
no-clobber 属于 Save/Host lifecycle tests，不在 DET4 重复；DET4 只证明同一 pure
input vector 的 normalized value/bytes 在四 runtime 等价，且 Snapshot
digest/compatibility/authoritative trace 不因 metadata 改变。
DET4 还必须直接消费 DET2e 已在 Deno 固定的 exact order/draw/apply vectors，不得在
browser path 复制或重生成 expected。Save M2 及以后每次注册真实 format/State
migration 时，再把对应 vector 接入同一 Deno/browser matrix。PF-DET 不伪造尚不
存在的 migration registry。

同一 driver/compact expected vector 在：

- Deno headless；
- Chromium；
- Firefox；
- WebKit

执行。本切片在 CI0 的 latest-stable required CI 上增加独立 determinism
Playwright config/task/job，按 locked Playwright version 安装
Chromium/Firefox/WebKit，并同时运行 DET3b tripwire 与 parity matrix；不把 Firefox
强塞进全部 UI suite。若 CI0 尚未落地，先停止补齐它，不能把 general CI 当作既有
前提。缺 browser 是环境 blocker，不能 skip 后报绿。

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
- M0a 的 compact summary/unstamped/stamped pure vectors 在四 runtime 分别等于同一
  独立 expected value/bytes；DET4 没有复制 lifecycle corpus，PF1 unstamped oracle
  未被重生成或替换；
- production Browser Agent 仍不获得 raw Snapshot/RNG/CommandLog；
- 不提交 raw local report、browser cache 或一次性 transcript JSON；
- focused Deno test、dedicated browser task、`deno task test` 与
  `deno task check` 全绿；
- PF7/CI 将 dedicated matrix 作为 production promotion evidence，但普通
  `deno task check` 不因本机未安装全部 browser 而隐式下载或静默 skip。

**DET-B gate：** DET3a–DET4 完成后才构成完整 PF-DET promotion。若 M0b/M1 已在
另一分支完成，进入 Save M2 前必须在同一 merged HEAD 重跑 focused
M0a/M0b/M1、shared Save byte corpus、`deno task test`、`deno task check` 与本节
四 runtime matrix，并证明尚无 executable migrator、migration callback count 为
`0`。两边各自绿但未完成该 join，不得开始 M2。

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

1. 在执行时 latest stable Deno 上记录实际版本（不固定 patch、不另跑 2.9.0
   required lane）；DET0-core 建立 passing characterization baseline；其余行为改变
   slice 先记录 focused red 的命令、断言与预期失败原因；
2. minimal implementation；
3. focused green；
4. affected package tests；
5. `deno task test`；
6. `deno task check`；
7. 只在 browser path 受影响时运行 dedicated parity/prebuilt matrix；
8. staged/unstaged/untracked、`git diff --check` 与独立自审。

promotion record 必须列：

- before/after admission phase 与 deterministic counts；
- bootstrap raw-to-admitted projection handoff、projection freeze identity 与
  invalid-output atomicity；
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
