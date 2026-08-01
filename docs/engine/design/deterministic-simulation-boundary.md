# Authoritative simulation determinism boundary

状态：2026-07-31 接受的目标设计；同日按 Save-corpus ownership 与 DET-A/DET-B
promotion boundary 修订；2026-08-01 明确 DET2a command admission 的公开失败
surface、command identity representability、Debug fence precedence 与原子性。具体
落地顺序见
[Authoritative determinism guardrails plan](../plans/2026-07-31-authoritative-determinism-guardrails.md)。
当前 Snapshot、Save 与 Debug Bundle encoding 已有 integer-only canonical
边界，事务 RNG 已进入 Snapshot，zero xorshift state 与 command canonical
admission 也已 fail closed；Strict JSON number token 的精确数学整数检查、
bootstrap/evidence 尽早入场、ambient input 检查、隔离探针与多 JavaScript 引擎逐
command parity 尚未实现。本文其余部分描述目标合同，不把未落地项写成当前能力。

## 1. Guarantee and threat boundary

SillyMaker 保证的对象是**受支持的 authoritative transition**，不是任意
TypeScript/JavaScript 程序的所有执行细节：

```text
nextSnapshot + authoritativeEvidence
  = reduce(
      previousSnapshot,
      normalizedCanonicalCommand,
      versionedDeterministicContext
    )
```

同一 engine/application build、同一合法 Snapshot、同一规范化 command
和同一版本化 deterministic context 应产生相同的：

- dispatch outcome class；
- committed/rejected/faulted evidence；
- RNG state 与 draw evidence；
- authoritative Snapshot bytes/digest；
- CommandLog/replay evidence。

Presentation frame、DOM layout、媒体解码、Host
时间、线程调度、网络延迟和机器性能不在这个等价集合中。它们可以影响表现与 I/O
时机，但不能暗中决定 gameplay State。

Story 是构建期可信代码。引擎可以提供 supported
API、静态检查、运行时边界、测试探针和跨引擎证据，但不把 same-realm JavaScript
描述成 sandbox，也不声称能够阻止作者故意绕过检查、隐藏 global alias
或执行动态代码。不可信 Mod 的隔离与认证属于 Mod 激活后的独立 threat model。

## 2. Three execution zones

### 2.1 Authoritative Simulation

包括：

- `createBootstrapInput` 输出经过 Core canonical admission 和 deep-freeze 后，
  `createInitialState` 实际接收的 plain input；
- GameCommand / DebugCommand 的规范化结果；
- command executor、module `propose/apply`、invariant 与 authoritative Narrative
  reducer；
- Snapshot state、RNG、command sequence 与 run integrity；
- facts、rejections、stable fault evidence、RNG draw evidence；
- Save migration；
- 影响 replay 判断或 authoritative receipt 的字段。

这个区域只能读取 command-start Snapshot、显式注入的确定性能力和带稳定
identity/digest 的只读资源。它不直接读取 Host clock、系统熵、网络、LLM、DOM、
locale default 或进程环境。

### 2.2 External decision / oracle admission

网络、LLM、真实时间、远端服务、系统熵和人工输入可以在 Simulation 外产生事实，但
这些事实只有先变成**完整、版本化、schema-normalized、Strict Canonical Data 的
command 或资源引用**后，才可以影响 authoritative transition：

```text
external observation
  -> Host/application policy
  -> validated canonical command or versioned resource identity
  -> Session queue
  -> authoritative transition
```

重放使用已经记录的 command/resource identity，不重新调用外部
oracle。若外部结果太大而不能直接进入
command，必须记录足以唯一恢复同一不可变资源的稳定 ID、revision 与
digest；只记录一个会再次查询网络的 URL 不足以重放。

“Oracle”在这里是边界分类，不是新的 runtime package、第二份 State 或通用
application envelope。

### 2.3 Presentation / Host

React state、animation progress、layout、audio gain、camera interpolation、
`performance.now()`、Host metadata time、raw ambient entropy provider 和 I/O
retry 可以使用有限 binary64 与 ambient capabilities。Story 编写的
`createBootstrapInput` 在生命周期上属于 composition-root/Host ingress
adapter，而不是 authoritative transition callback；它只能消费显式注入的
`BootstrapEntropyV1`，不得自行读取 ambient entropy、clock、network、environment
或 DOM。这个区域：

- raw capability/provider、未采样 entropy 与 Host-only metadata 不进入 gameplay
  Snapshot/Save/digest；
- `createBootstrapInput` 的返回值仍视为不可信 ingress data；Core 必须先对整个值做
  package-internal Strict Canonical Data admission 和 deep-freeze，再把同一个
  admitted value 交给 seed reader 与 `createInitialState`；
- 该 handoff 不新增 public bootstrap schema/envelope 或第二份 authoritative
  state；其中通过既有 seed validation 的版本化 seed 可以进入 initial Snapshot；
- 不通过闭包或 mutable singleton 反向改变规则；
- 需要影响 gameplay 时，必须发送新的 validated semantic/authoritative command；
- 仍受各自 presentation epoch、readiness、input 和 persistence fence 约束。

这个区域中的 **durable deterministic projection** 是窄例外：它不改变 gameplay
transition，却会改变持久化 bytes，因此不能继承普通 Presentation 的 ambient
能力。当前 `summarizeSave(state)` 只能读取 immutable State，并为同一 State 返回同一
bounded canonical summary；不得读取 clock、random、network、environment、locale
default 或 DOM。其 normalized output 进入 Save annotation，但不进入 Snapshot
digest、CommandLog 或 replay。玩家 note 是显式 persistence input，不是 Story
callback。

另一个窄类别是 **bounded presentation/runtime persistence metadata**。目标
`versionStamp` 由 persistence composition root 在每个 service 生命周期内采集一次，
标识创建 Save candidate 所包含 Snapshot 的 application/engine build，即
**Snapshot capture origin**；它不标识之后执行 annotation rewrite、rotation 或
stored-record export 的 runtime。该 stamp 可以进入 Save envelope，因此会
改变 Save/export bytes，但必须：

- 先把每个字段规范化为最多 128 Unicode code points、trimmed 且不含
  control/format/surrogate/line-separator/paragraph-separator 的 plain
  string/null，再 defensive copy 与 freeze；
- absent、all-null、完全 malformed、accessor-only、hostile Proxy 或 collector
  throw 都降级为 stamp absent，不阻止 Snapshot capture 或 physical Save write；
  mixed malformed fields 逐字段降级为 null，仍有合法字段时形成 partial stamp，且
  normalization 不调用 getter；
- annotation rewrite、autosave rotation 与 stored-record export 原样保留
  capture-origin stamp，不用当前 runtime stamp 覆盖；load/import compatibility
  不读取 stamp，而 post-load/import 的 fresh capture 使用当前 service 已采集的
  stamp，不传播旧 envelope metadata；
- 不进入 Snapshot、`stateDigest`、BuildIdentity/simulation digest、CommandLog、
  replay、gameplay transition 或 authoritative evidence，也不参与 Save
  compatibility、adoption 或 authoritative identity 判断。

导出建议文件名中的 Host timestamp 与之不同：它只来自显式 metadata clock，不进入
Save bytes、digest 或 identity。UTC `yyyyMMddHHmmss` 秒级后缀只帮助人类辨认导出时间，不承诺唯一；同一秒
的冲突由实际下载 Host 使用 no-clobber suffix、浏览器下载策略或等价的原子
collision policy 解决，不能靠重写 Save bytes 获得唯一性。

这三类证据只有一份 owner：Save M0a corpus 拥有 summary/annotation/note 与
`versionStamp` normalization、exact bytes、capture/rewrite/rotation/export
preservation；DET-B 只拥有 projector authority closure、ambient negative controls
与 M0a compact pure vectors 的跨 runtime equality；Browser/Desktop Host 拥有真实
filename collision/no-clobber。Desktop D4 可以消费同一 build receipt/bytes 证明
package integration，但不得复制 Save lifecycle/migration matrix。

## 3. Numeric contract

### 3.1 Authoritative wire values

Authoritative command、Snapshot、evidence、Save、replay 和 Debug Bundle 的
gameplay 部分使用现有 Strict Canonical Data 数值合同：

- `number` 只允许 safe integer；
- 拒绝 fractional number、`NaN`、`Infinity`、`-Infinity`、unsafe integer 和
  `-0`；
- `bigint`、class instance 和 Decimal instance 不是 canonical wire value；
- schema normalization 必须先于 canonical bytes/digest；
- engine 生成 canonical bytes；目标 import 可以接受数学上恰为 safe integer 的
  Strict JSON 替代写法（如 `1.0`、`1e0`），再由 schema normalization 产生
  runtime value，不要求输入原始 bytes 已按 canonical key order/number spelling
  编码；
- number token 必须在转换为 binary64 前按十进制 coefficient/scale/exponent
  验证数学值；数学上仍为 fractional 的 token 即使转换时舍入为 safe integer
  也必须拒绝，所有 negative-zero token 变体同样拒绝。

当前 Snapshot/Save encoder 已执行这条边界；目标 guardrail 还要把 normalized
command 和完整 authoritative evidence 在执行/记录点尽早封口，避免污染到
CommandLog 后才在 Debug Bundle export 暴露。当前 Strict JSON parser 先执行
`Number(token)`，所以会错误接受 `1e-324`、`0.999999999999999999999` 与
`9007199254740990.6`；这是计划中的已验证 import gap，不是已实现能力。

### 3.2 Domain representations

默认选择按需求从小到大：

1. 货币、数量、tick、逻辑坐标使用有界 safe integer 最小单位；
2. 百分比使用 permille、basis points 或 Story 明确命名的整数刻度；
3. 比例使用 schema-normalized 的整数 numerator/denominator plain data，并定义
   denominator、约分、符号、舍入与 overflow；
4. authoring 输入的小数字符串在内容编译/解析边界转换为上述表示；
5. 只有真实 arbitrary-precision/decimal 需求达到激活条件时再设计 Decimal
   adapter。

这不是要求“JavaScript 不使用 binary64”——safe integer 本身也由 binary64
承载。要求是 authoritative 算法对范围、舍入、溢出与分支语义有明确定义，且最终
值/决策可以被 canonical evidence 完整重放。

### 3.3 Intermediate fractional math

默认受支持路径不让 fractional/approximate math 决定 authoritative
branch。若某个真实算法必须使用：

- 先定义输入范围、舍入 mode、tie breaking、overflow 和 exceptional value；
- 在 authoritative boundary 前归一为 canonical integer/ratio；
- 增加边界向量与跨 JavaScript 引擎逐 command parity；
- 通过窄、带理由的静态检查豁免，不允许 whole-file blanket disable。

`parseFloat`、fractional literal、依赖实现近似的 `Math` 函数属于需要审查的信号，
但不能用“全局禁止 `Math.*`”误伤 RNG 中对整数执行的 `Math.floor` 等已定义操作。

## 4. Entropy and clock contract

Authoritative code 不直接调用：

- `Math.random()`；
- `crypto.getRandomValues()` / `crypto.randomUUID()`；
- `Date.now()` / zero-argument `new Date()`；
- `performance.now()`；
- 其他隐式 Host entropy、clock 或 locale-dependent default。

合法入口：

- composition root 把 Host entropy provider 作为 `BootstrapEntropyV1` 显式注入
  Story-owned `createBootstrapInput` ingress adapter；只有对该参数的方法调用获得窄
  capability allowance，adapter 仍不得直接调用 ambient entropy/clock；
- Core 对 adapter 输出做一次 canonical admission 和 immutable handoff；
  `createInitialState` 才是消费 bootstrap 的 authoritative callback；
- gameplay randomness 只经 Snapshot-owned transactional RNG；
- logical time 是 State/command 中的整数 tick、turn、day 或 sequence；
- wall-clock 仅作 Host/presentation/diagnostic
  metadata，不能成为未记录的规则输入；
- Save migration 禁网络、clock、random 与 live Session。

如果现实时间本身是玩法输入，Host 必须按产品 policy 采样并提交带单位、范围和
provenance 的 canonical command。重放使用该已记录值，而不是再次读取时钟。

## 5. RNG invariants

当前 `xorshift32-v1` 的目标不变：

- seed/cursor 必须是 runtime-validated `NonZeroUint32`；
- Snapshot 持有 algorithm、cursor 与 raw draw count；
- rejected/faulted attempt 不提交 RNG candidate；
- draw purpose 是诊断标签，不是独立 stream identity；
- 同一合法起点与 draw order 得到相同 state/evidence。

`cursor: 0` 是 xorshift32 的 absorbing state，不是合法 seed 或可恢复
cursor；不得静默重种。当前 V1 schema 曾接受它，因此修复属于 Save/import/replay
可观察合同收紧：若存在被承诺维护的 zero-state
bytes，必须先做明确的兼容性决定，不能假装 byte-for-byte 等价。

以下不在当前 guardrail 批次：

- named/keyed streams；
- RNG algorithm/state V2；
- raw-attempt 与 accepted-sample trace V2；
- 改变 draw 次数、顺序或 purpose 的通用领域 RNG API；
- reseed wall-clock audit lineage。

它们分别会改变 Snapshot/Save/replay 或 CommandLog/DebugBundle evidence，只有真实
draw-order coupling、诊断歧义或第二消费者出现后才单独设计与迁移。

## 6. Defense in depth

### 6.1 Architecture

- Session 是唯一 authoritative mutation queue；
- deterministic capabilities 通过 execution context/transaction 注入；
- external decision 先 canonical admission；
- bootstrap entropy 只经显式 provider 进入 ingress adapter，其输出在
  `createInitialState` 前 canonical admission + deep-freeze；
- durable Save projector 只消费 immutable State，输出立即 normalize、copy 与
  freeze；异常必须在任何 physical Save write 前原子失败；
- Presentation/Host 不获得 State setter。

### 6.2 Static guard

静态检查以实际 authoritative import closure/注册入口为 scope，不用目录名或 lint
rule 内部的 filename 猜测。当前 BuildIdentity 的 `storySimulation` record 只是从
`*/simulation.ts` 出发的 managed dependency seed，不是完整 authority closure：
实际 `*/src/story.ts` 还拥有 materialize/create simulation callback。目标
collector 必须从 root registry fail-closed 枚举所有应用，把 managed identity
seed、callback owner、template 和 engine-owned runtime explicit entry
合并；如果 callback owner 与 React/Presentation 耦合，先拆 dedicated
simulation-definition entry。Base 的 Session/executor/RNG/replay 也从有界显式
authority entries 收集，不能因 Story collector 过滤 Base 而漏检，也不能退化成
全 engine 扫描。每次检查重新收集 live closure，不缓存 file list。

Save M2 及以后第一次注册 executable format/State migrator 时，其 entry 才加入
上述 live recollection。DET-B 先用 synthetic extension seam 证明 collector 可追加
entry；它不伪造尚不存在的 production migration registry。

第一批 hard diagnostics 覆盖直接 ambient entropy、clock、network/LLM client、
process environment、locale-default 与 DOM access；fractional literal、
`parseFloat` 与 approximate Math 先以同一 authority scope 建立零误报基线，再按
明确算法豁免收紧。显式 `new Date(recordedInstant)` 合法，zero-argument
`new Date()` 不合法。Host provider、Presentation、tooling、test timing 和 bench
不在 authority closure 中。`createBootstrapInput` 的 callback owner 仍在
fail-closed closure；checker 只对该函数中以已验证 `BootstrapEntropyV1` 参数为根的
方法调用给窄 allowance，不能排除整个文件，因为同一 source 也可能拥有
`createInitialState` 等 authoritative callback。

### 6.3 Runtime admission

- `createBootstrapInput` 输出在任何 seed read / `createInitialState` 调用前做
  package-internal canonical gate 和 deep-freeze；初次 construction、restart 与
  extension 使用的现有 initial-Snapshot helper 必须共用这一条路径；
- invalid bootstrap output 不调用 `createInitialState`，不创建/替换
  Snapshot、Session 或 persistence anchor；各调用点保留既有 construction/anchor
  failure classification；
- command schema normalization 后、进入 Session queue/executor 前做 canonical
  admission；同一次 command-admission canonical traversal 在访问每个 container 时先做
  command-only representability shape check，再按现有算法编码，成功后才做
  same-identity deep-freeze。Story-facing DebugTools 的 capability denial 先于 Story
  schema；schema 成功返回后，下层 Session control 的 capability/session/HMR
  preflight 先于
  command-admission canonical traversal 与 queue。下层 fence 胜出时不得枚举或读取
  normalized command、调用该 traversal 或进入 queue，但不承诺上层 Story schema
  尚未执行；admission 通过后，queue front 仍重新检查 capability 与 Session/HMR
  状态，关闭 preparation 与 execution 之间的竞态；
- Story schema/domain validation 保留既有 result classification：
  `GameSession.dispatch` 的 `commandSchema.parse` failure 继续 resolve 为
  `not_executed/validation_failed`，Story-facing DebugTools 的 schema failure 与
  Debug domain validation 继续使用既有 result，后者仍携带 Story-owned non-empty
  errors。schema 成功后发现的 Strict Canonical Data violation 不伪装成 Story
  error，也不进入 unexpected-fault normalizer；同步 Simulation/CommandLog entry
  throw、Promise entry reject 从 `@sillymaker/base` root 公开的
  `CanonicalJsonError`；root 同时公开 `CanonicalJsonErrorCodeV1`，稳定兼容字段为
  `code` 与 `path`。`path` 使用 JSON Pointer，根路径为空字符串 `""`，message 只作
  diagnostics。low-level Debug control 本身没有 Story schema，只执行 unconditional
  canonical shape gate；
- command-only representability shape check 拒绝无法被 canonical bytes 表示、却仍能被
  executor 从原始 identity 观察的 runtime members：任意 own symbol key 使用
  `value.unrepresented_property`，任意 array own string key（除 `length` 与
  `0..length-1` 的 canonical index）也使用 `value.unrepresented_property`，array
  prototype 不是 `Array.prototype` 时复用 `value.custom_prototype`。symbol-key
  failure 的 `path` 指向所在 container，因为 symbol 没有 JSON Pointer segment；
  array extra property 的 `path` 指向按 JSON Pointer escaping 编码的 property，
  custom array prototype 指向 array 本身。根 container 仍使用 `""`；新 code
  进入 root export 的 `CanonicalJsonErrorCodeV1` stable union；
- command-admission traversal 在每个已访问 container 先检查 prototype，再检查 symbol
  keys，再按 Unicode code-point order 选择第一个 array extra property，随后才按既有
  canonical depth-first order 继续编码：array index 升序、plain-object string key 按
  Unicode code point 排序。这三类 container-wide shape failure 都先于该 container
  的 child traversal。represented accessor 不属于 container-wide shape check；
  traversal 到达对应 array index 或 plain-object key 时才使用现有 `value.getter`
  拒绝且不调用 getter，因此 earlier child failure 可以先于 later accessor 胜出。
  不同 container 之间仍由既有 depth-first traversal 决定第一个 error；
- 这个更窄的 command rule 不改变 public `canonicalJsonBytes` 的既有行为：
  公共 encoder 仍按原算法忽略 symbol-keyed members 与 array extra
  properties，也不为 array prototype 新增拒绝。command admission 在 package-internal
  traversal mode 拒绝它们，而不是修改 canonical JSON、digest、Save/Debug Bundle
  bytes 或先 clone/strip 出第二份 command。这保证 executor、recursive freeze、
  CommandLog 与 replay 观察的正好是 canonical bytes 所表示的同一 identity；
- command admission failure 在任何 queue mutation、executor/authoritative replay
  driver、fault normalizer、RNG、candidate Snapshot traversal/post-digest/freeze 或
  CommandLog continuity/append 前原子失败；Snapshot identity/digest、RNG、command
  sequence、Session status 与 CommandLog 保持不变；package-internal traversal 对
  represented getter 通过 descriptor 检测拒绝且不调用。schema-bearing ingress 在
  gate 前仍可按 Story 自有 schema 语义读取 raw input，本合同不把 getter-zero 保证
  扩张到 schema；
- attempt 的 facts/rejections/fault/RNG evidence 在安装 Snapshot/RNG、发布或
  append CommandLog 前、且在 candidate Snapshot whole-tree freeze/post-digest
  前完整验证；
- authoritative replay 保留 blocking identity mismatch 的最高 precedence；identity
  匹配后先同步、各一次地 capture 完整 recorded-command vector 的 `source` 与
  `command` identity；capture 不枚举 command、不执行 canonical traversal，也不
  freeze。随后按 entry 顺序 prepare 每个 captured command；每个 prepare 执行一次
  包含 representability check 的 command-admission canonical traversal。全部 entry
  prepare 成功后才统一 freeze，并且仍早于 Snapshot digest/validation 与 driver
  construction；driver 只接收 captured source/command identity，不重新读取可变 entry
  slot。因此第 `k` 个 entry 失败时已有 `k` 次 command canonical traversal，但
  handoff freeze 与 driver construction 均为 `0`；best-effort replay inspection 不
  执行该 gate；
- invalid evidence 原子失败：不安装 candidate Snapshot/RNG，不推进
  sequence，不写入 malformed CommandLog；
- 所有 public Session/Simulation/CommandLog path 都执行无条件 canonical shape
  gate；标准 Core composition 另外执行 Story fact/rejection schema
  normalization，test/bench 只能注入 observation/counter，不得替换或绕过 gate；
- 有效输入不改变 canonical algorithm、digest、Save bytes 或 PF1 的 Snapshot
  digest/freeze contract。bootstrap/command/evidence admission 会产生新增物理
  traversal，instrumentation 必须按 Snapshot digest/freeze、bootstrap admission /
  handoff freeze、command admission/handoff freeze、evidence admission、replay
  comparison 与 total 分标签报告。

当前 `factSchema` / `rejectionSchema` 存在但未接入 execution path，fault
没有对应 simulation schema。DET2a 只公开上述既有 canonical error class 与稳定
fields，不新增 command result branch、universal command envelope 或 Story failure
projector。后续 evidence admission 若无法通过 package-internal composition 和现有
stable fault policy 闭合，或必须再改变任何 public
Session/Simulation/CommandLog/fault contract，必须先修订设计；不得为此发明
universal application receipt 或把 Surface envelope 扩张到所有 command。

### 6.4 Test-only isolated tripwire

短命 Worker/realm 可以在 dynamic import authoritative driver 前，把 direct
ambient entropy、clock、network、environment、locale-default 与 DOM access API
替换为 throwing guard。它必须：

- 启动时逐项证明 guard 可安装，否则结构化失败 `tripwire_unavailable`；
- 只接收 realm 外已经构造的 fixed canonical bootstrap input；
- 不加载正常 Player Host/Presentation；
- test 结束直接 terminate，不在共享 realm 跨 `await` patch/restore；
- 只作为错误探针，不作为 sandbox 或 production security boundary。

每个 runtime 只需 patch 实际存在的 API；不存在的 global 由 probe
证明访问稳定失败，不能把 absence 记成 silently skipped coverage。

### 6.5 Cross-runtime parity

一个中性、短小的 transcript 在 Deno、Chromium、Firefox 与 WebKit 使用同一
test-only driver 执行。每个 command 比较：

- normalized input identity；
- outcome kind 与 facts/reasons/fault；
- committed RNG before/after、attempted draws 与 sequence；
- pre/post Snapshot digest；
- finalized CommandLog/replay evidence。

报告第一处分歧的 command identity、sequence 与字段 path，而不是只比较最终
Snapshot。相同 runtime 也重复执行以区分普通 nondeterminism 和跨 engine
差异。矩阵还直接消费 M0a 唯一拥有的 compact summary/unstamped/stamped pure
vectors 与 fixed expected bytes，不复制 lifecycle corpus或从待测 encoder 重生成
expected。矩阵证明维护中的受支持路径，不认证任意第三方 JavaScript。

## 7. Decimal decision

当前不把 `decimal.js` 作为 core runtime 依赖或“确定性解决方案”。仓库 lock
中工具测试依赖可能传递包含 Decimal library，不等于 engine runtime 采用它。

只有同时满足才接受新的 Decimal 设计：

1. 真实 Story 的 arbitrary precision 或十进制舍入需求无法由有界整数/ratio
   清晰表达；
2. 至少两个消费者需要相同语义，或一个正式产品有不可回避的长期数据合同；
3. rounding、precision、comparison、overflow、canonical wire、contract
   revision、Save migration、digest/replay、browser bundle 与 performance
   一起定义；
4. 通过 Deno/Chromium/Firefox/WebKit golden/parity evidence；
5. Story 不直接 import library；由唯一 engine/tooling-owned adapter 封装。

首选落点是 content compiler/authoring normalization。Snapshot、command、facts 与
Save 中不保存 Decimal instance；若未来 runtime 真需 Decimal，也必须先转换为已
版本化的 plain canonical wire representation。

## 8. Promotion and stop rules

DET1–DET2e（DET-A）完成只允许 callback-free Save M0b/M1 分叉，不构成完整
promotion。只有 DET3a–DET4（DET-B）也完成、四 runtime matrix 全绿后，guardrail
才能写入 live features/development：

1. current-gap tests 先证明 raw/mutable bootstrap handoff、zero cursor、
   command/evidence late failure 与 replay admission 的旧行为；
2. 合法 corpus 的 Snapshot/digest/Save/replay bytes 保持等价；
3. invalid bootstrap output 在 `createInitialState` 前失败；有效 handoff 是一个
   admitted、deep-frozen value，且不新增 public schema/envelope；
4. invalid command/evidence 在 first authoritative boundary 原子失败；
5. Strict JSON 按 number token 的精确数学值拒绝舍入后伪装成整数的小数，同时保留
   合法 exact-integer 替代写法；
6. static guard 覆盖 fail-closed authoritative closure，Host/Presentation
   negative-control 不误报；
7. isolated tripwire 不加载或污染正常 Host realm；
8. 四 runtime 的逐 command matrix 和同 runtime repeat 全绿；
9. `deno task test`、`deno task check` 与专用 browser gate 通过。

遇到下列情况停止：

- 修复必须改变 canonical JSON/digest algorithm；
- zero-state compatibility 无法在保留坏状态与拒绝旧记录之间作明确产品决定；
- stable fault evidence 需要 public Session/Simulation/CommandLog/fault contract
  change 或 universal receipt/envelope 才能表达；
- canonical bootstrap handoff 需要新增 public `GameSimulation` revision、
  bootstrap schema/envelope，或改变合法 initial Snapshot/Save bytes 才能实现；
- lint 只能靠全仓库禁止 clock/float，因而误伤合法 Host/Presentation；
- parity 只能通过删字段、只比最终 Snapshot 或跳过 Firefox；
- 必须把 arbitrary Story code 移入 production Worker 才能继续；
- 工作扩张到 Save migration、Surface、Mod sandbox、StateStore 或 Decimal
  runtime。
