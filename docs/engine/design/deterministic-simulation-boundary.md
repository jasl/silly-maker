# Authoritative simulation determinism boundary

状态：2026-07-31 接受的目标设计；同日按 Save-corpus ownership 与 DET-A/DET-B
promotion boundary 修订；2026-08-01 明确 DET2a command admission 与 DET2b
finalized evidence admission 的公开失败 surface、precedence、representability 与
原子性。具体
落地顺序见
[Authoritative determinism guardrails plan](../plans/2026-07-31-authoritative-determinism-guardrails.md)。
当前 Snapshot、Save 与 Debug Bundle encoding 已有 integer-only canonical
边界，事务 RNG 已进入 Snapshot，zero xorshift state、command/finalized-evidence
canonical admission 与 Strict JSON number token 的精确数学整数检查也已 fail
closed；bootstrap 尽早入场、ambient input 检查、隔离探针与多 JavaScript 引擎逐
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
  package-internal Strict Canonical Data projection admission 并 deep-freeze 新建的
  ordinary projection，再把同一个 admitted projection 交给 seed reader 与
  `createInitialState`；raw adapter output 不冻结、不保留；
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
  也必须拒绝，所有 negative-zero token 变体同样拒绝；
- Strict parser 的稳定分类是：非零 fractional token 使用
  `number.not_integer`；coefficient 全零且带 lexical `-` 的 token 使用
  `number.negative_zero`；数学上恰为整数、但绝对值超出 safe-integer range 的
  token（包括 binary64 conversion 会成为 non-finite 的巨大正 exponent）使用
  `number.unsafe_integer`。不新增 Decimal、BigInt wire 或另一组 public error code；
- `StrictJsonLimitsV1.maxBytes` 同时是 numeric token 的资源上限，不再发明任意的
  coefficient/exponent 位数上限。在该 byte bound 内以线性字符串扫描和饱和 exponent
  比较完成分类，不按 exponent 分配空间或做幂运算：巨大正 exponent 的非零值是
  unsafe integer，巨大负 exponent 的非零值是 fractional，任意 exponent 的正零仍是
  `0`。合法 exact-integer path 最终只把至多 16 位 normalized digits 转为
  `Number`；下面为兼容旧 failure precedence 而识别的 rejected-fraction path，允许在
  exact rejection 已确定后对原 token 做一次受同一 `maxBytes` 约束的 legacy
  binary64 classification，它不得改变 admission、decoded value 或 canonical bytes；
- 全局 bytes/BOM/UTF-8 preflight 先于 token parser；depth/node/collection limits 与
  object key checks 保留既有 traversal 顺序。对旧 parser 已经会立即拒绝的
  fractional/unsafe/negative-zero token，原 immediate failure 保持；对旧 parser
  因 binary64 舍入而错误接受、DET2c 才发现的 exact-decimal failure，parser 暂存第一
  个 failure，只有余下 document 本来会成功时才返回它，因此 later syntax、trailing
  comma、duplicate-key 或 structural limit 仍保留既有稳定 precedence；
- Strict parse failure 不返回 partial value。Save、Debug Bundle 与其他 import 在
  schema、digest 或 authoritative replacement 前原子拒绝；合法 `1.0` / `1e0` 等
  spelling 解码为同一 safe-integer runtime value，重新编码仍只产生既有 canonical
  bytes。

当前 Snapshot/Save encoder、Strict JSON parser、normalized command 与完整
authoritative evidence 都已执行对应边界，避免 malformed data 先污染
CommandLog、Save import 或 Debug Bundle decode 后才失败。canonical bootstrap
handoff 也已使用同一 engine-owned projection/freeze ownership；authority-aware static
guard 与跨 runtime ambient/parity gate 仍按 active plan 后续切片推进。

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

### 3.4 Bounded helper ordering and accumulation

进入 authoritative callback order、authoritative bytes 或 stable diagnostics 的通用
helper 不读取 Host locale。Content Database string `orderBy`、Game Authoring Kit
dependency/module transaction order、Simulation dependency-cycle root traversal统一使用
UTF-16 code-unit comparator；这与 canonical JSON 的 Unicode code-point key order 是
两个不同合同，不能互换。数值排序以 relational sign 返回 `-1/0/1`，不通过
`left - right` 构造可能越过 safe-integer 的中间差值。

Event Pool 在 candidate validation 后一次 admission 整份 context number map；所有
number condition literal/context value 都拒绝 fractional、non-finite、unsafe integer
与 `-0`。完整 eligibility 形成后，权重按 authoring order 在加法前逐项检查
safe-integer overflow；overflow 在 forced/ordinary result、explanation 与 RNG 之前
失败。Host record adapters、Presentation、tooling 与 test-only comparator 只有在
authority collector 证明位于 closure 外时才是 negative control；它们的 locale 行为
不能流回 authoritative ordering。

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
- Core 对 adapter 输出做一次 canonical projection admission 和 immutable handoff；
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
rule 内部的 filename 猜测。BuildIdentity 的 `storySimulation` record 只是 managed
dependency seed，不是完整 authority closure；DET3a collector 从 root registry
fail-closed 枚举所有应用，把 managed identity seed、dedicated
`simulation-definition.ts` callback owner、template explicit seed 和 engine-owned
runtime explicit entry 合并。Base 的 Session/executor/RNG/replay 与 canonical bootstrap
admission 也从有界显式 authority entries 收集；bounded closure 命中已分类 Base
negative-control entry 时 fail closed。collector 随后把 Story、Base、Save projector 与
synthetic/additional authorities 合并成完整 authoritative path vector；任何已分类
negative-control entry path 出现在该 vector 中，都在 lint 前令整次 collection 失败。
negative-control closure 的其他 deterministic dependency 可以合法重合，不能误写成两边
整段 closure 必须 disjoint。每次检查重新收集 live closure，不缓存 file list，也不能
静默过滤、漏检或退化成全 engine 扫描。

collector 对 `.ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs` 使用 syntax-aware ESM AST，收集
static `import`、`export ... from` 与 string-literal `import()`；因此 `.cjs` 中合法的 ESM
dynamic import 与 `.cts` 中的 ESM syntax 也进入 closure，comment/string lookalike 与
`import.meta` 不形成 dependency。low-level tooling collector 在 identifier、concatenation、
non-static template 或其他 nonliteral `import()` 时返回 frozen diagnostic result；authority/
BuildIdentity caller 必须在 source lint/record admission 前因任一 error fail closed，不能消费或
发布其中的 partial path vector。

Save M2 及以后第一次注册 executable format/State migrator 时，其 entry 才加入
上述 live recollection。DET-B 先用 synthetic extension seam 证明 collector 可追加
entry；它不伪造尚不存在的 production migration registry。

第一批 hard diagnostics 覆盖直接 ambient entropy、clock、network/LLM client、
process environment、Host locale/ICU 与 DOM access；fractional literal、
`parseFloat` 与 approximate math（包括 `Math.pow` 的 `**` 等价写法）在同一 authority
scope 中只允许带算法合同的 node-local 豁免。AST rule 必须先遍历会实际求值的 receiver/
callee、input/spread element、template substitution 与 computed property key，再分类外层
member/call/new/coercion operation；外层 operation 合法或 fail-closed 都不能遮蔽其求值阶段
已经发生的 ambient read。函数形式 `Date()` 无论参数都会读取 ambient current time，
zero-argument `new Date()` 同样不合法；`Number(recordedText)` 保持 deterministic。
`new Date(arg)` 只接受静态证明属于以下集合的 single input：TimeClip
范围内 integer epoch literal/immutable local `const` alias、recognized `Date.UTC(...)`
result、verified `Date.parse(...)` result、exact known Date-instance value copy，或通过
Gregorian field/time/offset 校验的 explicit-zone literal/immutable alias。explicit-zone
spelling 固定为 `YYYY-MM-DDTHH:mm:ss` + optional exact `.sss` + `Z` / `±HH:mm`；literal
descendant member 不能继承 string/Date-value proof。`Date.parse` direct/`call`/`apply` 更窄，
只接受恰好一个上述 explicit-zone proof；`Date.UTC` direct/`call`/`apply` 本身是 deterministic
epoch producer，不执行 parse-style admission。multi-argument local-field construction 与已验证
Gregorian/time 的 zone-less `YYYY-MM-DDTHH:mm`（optional seconds/fraction）direct literal 或
immutable alias 属于 `determinism.host_timezone`；dynamic、其他 spread、mutable alias、
malformed/unsupported spelling 或 provenance-ambiguous input 属于
`determinism.date_input_unverified`。`new Date(...[])` 是静态 zero-argument clock，其他
constructor/parse spread 与非 exact `apply` vector 均 unverifiable。Date rule 按 target function
identity 分类：bare `Date`、
`Date.prototype.constructor` 与 explicit Date instance 的 `.constructor` 都是 constructor
identity，函数调用或 zero-argument construction 读取 ambient time；`Date.now`
仍是 clock。`call` / `apply` 保留 `Date.parse` / `Date.UTC` 的 callable identity：parse
继续执行 exact explicit-zone admission，UTC 直接产生 deterministic epoch；`bind` 只捕获
callable、不执行 operation，因此在 capture site 报
`determinism.ambient_capability_escape`。静态可解析的 explicit/local-binding recorded Date
instance 只允许
`getTime`、`valueOf`、`toISOString`、
`toJSON` 与 UTC getter/setter 等 Host-timezone-independent operation；local-time getter/
setter、`getTimezoneOffset` 与 default rendering 都以 `determinism.host_timezone` 拒绝。
Host-dependent Date method 只有在 exact Date receiver 的 terminal direct/`call`/`apply`
operation 才得到该 Host-timezone 分类；同名 descendant 或 `.bind` capture 都按 capability
escape fail closed。
default rendering 包含 `String(...)`、`new String(...)`、actual
`String.prototype.constructor`、untagged template、`+` / `+=`，以及 `String.raw` carrier
中实际会被读取的 raw elements 与 effective substitutions。抽象相等 `==` / `!=` 仅在另一
operand 不能静态证明属于 null/undefined/non-coercing object 集合时，按 Date default
`ToPrimitive` 分类；strict equality 不做该 coercion。Date 用作 computed property key
或 `in` 左 operand 时执行 `ToPropertyKey`，因此同样属于 Host-timezone default rendering；
receiver/input/key 自身的求值仍先独立检查。只有 exact Date-instance value 或其 conservative
instance class 才能得到 Host-timezone coercion 分类；Date member descendant 或 ambiguous
descendant 无法证明仍是 Date value，只报 capability escape，不误称 Host rendering。

String direct/new/call/apply 只在 preserving holes 的 exact static effective-argument vector 上做
operation classification；first argument 之前的 dynamic spread、unverifiable apply vector 或
其他无法定位 effective argument 的形式按 capability escape fail closed。`String.raw` 同时检查
static string/array 与带 exact non-negative integer `length` 的 static array-like `raw`
carrier：raw element 只检查有效 index，substitution 只检查 `raw.length - 1` 个实际会被
coerce 的位置，多余 substitution 不产生 Host-timezone diagnostic。object literal 中 statically
proven primitive/null `__proto__` setter 不可能提供 inherited `raw`/index，carrier admission 将其视为 inert
metadata，但 setter value expression 仍按正常求值检查；object-valued 或其他可能继承
`raw`/index 的 carrier fail closed。dynamic/unverifiable carrier 同样是 capability escape。
recognized String/Date callable 的 tagged-template direct/`call`/`apply` 形式按 JavaScript tag
调用形状静态模拟 effective arguments：从 `[templateObject, ...substitutions]` 出发，direct
保留该 vector，`call` 把 template object 当 `thisArg` 后传递 substitutions，`apply` 只接受可静态
展开的首个 substitution array；随后复用相同 operation admission。`bind`、nested 或 invalid
wrapper path 的 wrapper classification 报 capability escape，substitution 自身的求值 diagnostic
仍保留，但不能仅因其中出现 Date value 就猜测 Host coercion。普通 custom tag 只传递 value，
不因 Date substitution 被当成隐式 `ToString`。

String callable 的 `bind` 同样按 capability capture 分类。tracked ambient capability 的动态
computed member production 一律 fail closed；Date instance descendant 也因无法证明是 UTC/value
operation 而按 capability escape 拒绝。对 tracked ambient capability/intrinsic root/member 与
Date instance/prototype member 的 direct assignment、destructuring target、update、`delete` 或
`for in/of` write 一律 capability fail-closed，不尝试模拟被改写后的内建
identity；`Reflect.set`、`Object.defineProperty` 等 reflection mutation 仍由 DET3b runtime
tripwire 覆盖。`delete` 的 non-reference operand 仍先按普通 expression 求值，只有 identifier/
member reference 进入 write-target classification，且不会把旧 member value 再当作普通 read。
latest-stable Deno 已暴露的
`Temporal.Now` 属于 ambient clock；直接 member call 报 clock，静态 destructure 捕获
`Now` namespace 时先报 capability escape，若仍继续调用 alias 则该 read 再报 clock。
`Temporal.Instant` / `Temporal.PlainDate` 等明确 deterministic namespace 可直接调用或
静态 destructure，但 bare `Temporal` root 不能逃逸。已知 ambient member provenance 上
恢复的 `.constructor` 在 downstream `call` / `apply` / `bind` 分类前按 capability escape
拒绝；唯一例外是上文明确识别的实际 Date constructor identity。bare
`Math` / `Date` / `Number` / `Temporal` / `globalThis` / `Deno` / `process` 与 CommonJS
`module` capability root 不得通过 alias、argument、return 或 export 逃离逐文件
verification；已分类的 direct member operation 继续按其具体 rule 判断。即使显式给出 locale，
`Intl` / `toLocale*` / `localeCompare` 仍依赖 Host ICU，因此不进入 authoritative
algorithm；玩家可见的本地化格式化属于 Presentation。Host provider、Presentation、tooling、test timing 和 bench
不在 authority closure 中。`createBootstrapInput` 的 callback owner 仍在
fail-closed closure；checker 只对该函数中由 exact `@sillymaker/base` named import
验证过的 `BootstrapEntropyV1` 参数为根的直接方法调用给窄 allowance（local import
alias 合法）。namespace/re-export/local/relative import 与 lexical shadow 都不构成验证，
也不能排除整个文件，因为同一 source 也可能拥有
`createInitialState` 等 authoritative callback。

parser 按 `.ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs` extension 选择 TypeScript/JSX
grammar，并接受 standard decorator syntax。pure type-only AST 不作为 runtime access；
runtime-bearing TypeScript namespace/enum/`import =`/`export =`、default/computed/catch
pattern、class generic shadow、decorator expression，以及 `ClassAccessorProperty` initializer/
computed key 必须进入和 JavaScript 相同的 traversal；TypeScript instantiation wrapper 保留
wrapped callable identity，不能因 node type 以 `TS` 开头而跳过。type-only `import =` 仍是
erased syntax，runtime external-module
`import = require(...)` 则按 CommonJS loader 拒绝。
runtime-transparent TS expression/pattern wrappers（包括 `as`、non-null 与 `satisfies`）
同样保留 write target、destructuring 与 provenance semantics。stable lexical scope model 为 Block/Catch/For 建独立 lexical scope、让整个
Switch 共享一个 scope，并把 Class StaticBlock 与 runtime TS namespace 视为独立 var/function
boundary；hoist collection 不得穿透后两者。`for in/of` 按 RHS、每轮 write-target/pattern
runtime evaluation、local target unknown-provenance join、body 的顺序检查；ambient target
fail closed，不能把 left 当作普通 read。

Node ambient-provider matching 对 bare 与 `node:` specifier 都包含 subpath；例如
`fs/promises` 与 `node:fs/promises` 必须得到相同拒绝，不能借 Deno 的 Node compatibility
绕过 Host filesystem boundary；`require.call` / `require.apply` / `require.bind` 与
unshadowed `module.require` 使用相同分类，`module` / `node:module` 的 `createRequire`
入口本身属于 provider import。静态 provider specifier 报
`determinism.ambient_provider_import`。当前没有 CommonJS dependency graph，因此所有
unshadowed `require` / `module.require` direct call、`call` / `apply` / `bind` wrapper、capture、
computed member 与 partial wrapper 都必须拒绝：provider literal 保留更具体的 provider
diagnostic，其余 CommonJS loader use（包括 runtime TS `import = require(...)` 与 bare
`module` escape）报 `determinism.ambient_capability_escape`。只有实际 runtime lexical local
shadow 是 ordinary code；erased `declare` 与未初始化、不会覆盖 CommonJS wrapper binding 的
`var require` / `var module` 不构成 shadow。“static relative import 合法”只指已被上文
syntax-aware collector 纳入 closure 的 ESM dependency，不能外推到 CommonJS loader。

static diagnostic precedence 先按 JavaScript runtime 顺序遍历 receiver/callee、input/template/
property key 的求值，再以“先分类当前可证明的 capture/escape，再分类 downstream operation”
为准：known ambient constructor recovery、`Temporal.Now` namespace capture 与无法静态验证的
loader 都先报 capability escape；直接 clock/Host-timezone/provider operation 保留更具体的
category，无法证明的 Date input 使用独立
`determinism.date_input_unverified`。recognized callable 的 `.bind` 在 bind expression 处分类，
不把预绑定参数误写成 operation 已执行；CommonJS bind 的 literal 已命中 ambient provider
时仍由更具体的 provider diagnostic 优先。一次 source 可以因此在不同位置同时拥有 capture 与 use
diagnostic；最终仍按 UTF-16 file/range/code 稳定排序。checker 只返回完整 frozen diagnostic
vector 和 non-zero status，不发布 partial success receipt，也不写 authoritative State、Save、
artifact 或 cached inventory。

DET3a 对 direct expression、source-local conditional/logical expression 与 reassignment 做
path-insensitive conservative provenance join：tracked candidate 不会被另一条 clean/unknown
assignment 擦除，两个不同 tracked identity 合并为 capability ambiguity；Date callable 与任何
different/unknown candidate 也必须降为 ambiguity，不能把调用结果升级成 verified epoch。
所有 candidates 均为 proven Date-instance 时只保留 Date-instance class；Date instance 与
unknown/non-Date、不同 Date-input proof 或 mutable input 均降为对应 ambiguity。root 与已发现的
source-local closure 通过一个有界、单调的 central worklist 重放到 fixed point，使
reassignment provenance 与 diagnostics 不依赖 declaration/use 的文本顺序；迭代上限由已发现
function/binding 集合约束，不能收敛时 fail closed。中间 convergence pass 不发布 traversal
diagnostic，只有 final conservative replay 进入输出。这个机制只在同一 source 的 bindings/
closures 及上述 stable lexical scopes 内传播，不分析任意 function return、container、
reflection 或 implicit coercion flow，
也不声称 sound whole-program analysis；跨 function return/container 后才恢复的 Date method/
constructor、`Reflect.get` 等动态路径由 DET3b isolated runtime tripwire 捕获。两层都不是第三方
代码 sandbox 或 security boundary。

numeric exemption 的 `allow-next-line` 是物理行合同：directive 与目标 node 必须位于
相邻两行，blank line 或另一 comment 都不能跨越。它只抑制下一行第一处 matching
numeric diagnostic；同一 node 的 ambient diagnostic 仍保留。metadata 固定为 non-empty
`code/reason/bounds/rounding/test`，其中 test 是 repo-relative
`*.test.ts#case-name`。该文件必须存在且恰好包含一处 exact trimmed marker
`// sillymaker-determinism-vector: case-name`；evidence file 不因此进入 authoritative
closure。missing file/marker、ambiguous duplicate marker、malformed、duplicate、stale、
wrong-code 与 whole-file directive 全部 fail closed，numeric diagnostic 不被抑制。

### 6.3 Runtime admission

- `createBootstrapInput` 输出在任何 seed read / `createInitialState` 调用前做
  package-internal canonical projection gate，并 deep-freeze engine-owned ordinary
  projection；admission 不保留或冻结 adapter raw output（adapter 自身可以返回已冻结
  value）。初次
  construction、restart 与 extension 使用的现有 initial-Snapshot helper 必须共用这一条
  路径；
- bootstrap helper 的固定 stage order 是：调用 adapter → 完整 canonical projection
  traversal → projection recursive freeze → descriptor-safe seed read/parse（结果只读取一次并
  复用）→ resolved `createInitialState`（root callback/State schema，随后按 module tuple
  顺序执行每个 stateful initializer/schema/equivalence）→ Snapshot envelope schema → 仅在
  安装路径执行 Session Snapshot freeze/digest。不得为了分类错误而提前 seed read，也不得在
  Story callback 后重新读取 raw bootstrap；
- projection traversal 按 command/evidence 已接受的 fully-represented own-data 规则生成
  byte-identical canonical bytes 与新的 ordinary-data tree；raw shared alias 按 path 展开，
  cycle 拒绝。freeze 只访问 engine-owned projection，不再需要保存 raw descriptor graph 或在
  freeze 后重验 hostile Proxy shape，也不增加第二次 canonical traversal；
- bootstrap failure classification 与 precedence 按上述 stage order 取第一个失败：adapter
  throw 原样保留；canonical violation 使用 root-public
  `CanonicalJsonError(code, path)`；Proxy reflection、projection allocation /
  `defineProperty`、freeze 等 operational throw 原样保留；canonical-valid 的 missing /
  invalid seed 保留既有 bootstrap seed error（zero 仍为 `rng.invalid_state`）；其后 Story
  callback、State/module schema/equivalence 与 Snapshot-envelope failure 保留各自既有 error。
  因此 canonical-invalid + zero seed 报 canonical failure，canonical-valid zero seed 先于
  Story initializer failure，root/aggregate failure 先于 module tuple 中的第一处 failure；
- direct construction Promise 与 captured extension helper 分别从既有 reject / sync throw
  channel 暴露原 error；queued restart 保留 Session fence 与既有归一化：普通 helper
  failure 返回 `runtime.anchor_failed` 并进入 `fault_paused`，pre/post HMR fence 胜出时仍返回
  既有 HMR outcome。preflight HMR 不运行 adapter；若 Story/Proxy code 在同步 helper 内主动
  invalidates，post-operation/catch fence 只覆盖 public outcome 与 authoritative install，
  不承诺撤销已执行的 transient adapter/projection work；
- canonical traversal 完整成功后才开始 projection freeze，因此 canonical-invalid raw
  value 不会被部分冻结。若 projection freeze 自身失败，partial engine projection 保持不可达；
  raw adapter value、seed reader、root/module callback、Snapshot/Session/persistence mutation
  均不受影响；
- 任何 bootstrap failure 都不得创建/替换 authoritative Snapshot、Session、CommandLog
  replay base 或 persistence anchor。construction failure 发生在 Session/listener/lease
  acquisition 前；restart failure 保持 installed Snapshot identity/digest/RNG/sequence、
  CommandLog/replay base 与 persistence bytes；extension failure 不修改 live Session。
  Story callback 自身的外部副作用不是可回滚的 authoritative mutation，author 仍须保持
  initializer pure；
- command schema normalization 后、进入 Session queue/executor 前做 canonical
  admission；同一次 command-admission canonical traversal 在访问每个 container 时先做
  command-only representability shape check，再按现有算法编码，同时通过 descriptor-only、
  traversal-position 的懒 descriptor 读取构造 engine-owned ordinary-data projection；成功后
  只 deep-freeze 并交付该 projection。command admission 本身不冻结或保留 upstream
  normalized identity，也不把它交给 executor；推荐 schema helper 可能已按自身合同冻结
  output。Story-facing DebugTools 的 capability denial 先于 Story
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
- command-only representability shape check 拒绝无法被 canonical bytes 表示的
  descriptor-visible runtime members：任意 own symbol key 使用
  `value.unrepresented_property`，任意 array own string key（除 `length` 与
  `0..length-1` 的 canonical index）也使用 `value.unrepresented_property`，array
  prototype 不是 `Array.prototype` 时复用 `value.custom_prototype`。symbol-key
  failure 的 `path` 指向所在 container，因为 symbol 没有 JSON Pointer segment；
  array extra property 的 `path` 指向按 JSON Pointer escaping 编码的 property，
  custom array prototype 指向 array 本身。根 container 仍使用 `""`；新 code
  进入 root export 的 `CanonicalJsonErrorCodeV1` stable union。projection 不沿用 raw
  container identity，因此 Proxy virtual `get`、private element 与 raw-identity-keyed
  `WeakMap` association 都不会跨过 ingress；
- command-admission traversal 在每个已访问 container 先检查 prototype，再检查 symbol
  keys，再按 Unicode code-point order 选择第一个 array extra property，随后才按既有
  canonical depth-first order 继续编码：array index 升序、plain-object string key 按
  Unicode code point 排序。这三类 container-wide shape failure 都先于该 container
  的 child traversal。represented accessor 不属于 container-wide shape check；
  traversal 到达对应 array index 或 plain-object key 时才使用现有 `value.getter`
  拒绝且不调用 getter，因此 earlier child failure 可以先于 later accessor 胜出。
  不同 container 之间仍由既有 depth-first traversal 决定第一个 stable
  `CanonicalJsonError`。Proxy reflection trap、allocation、`defineProperty` 或 freeze 自身
  抛出的 operational error 继续走原 throw/reject channel，但不承诺上述 stable error
  ordering；任何失败都不得发布部分 projection；
- 这个更窄的 command rule 不改变 public `canonicalJsonBytes` 的既有行为：
  公共 encoder 仍按原算法忽略 symbol-keyed members 与 array extra
  properties，也不为 array prototype 新增拒绝。command admission 在 package-internal
  projection traversal 拒绝它们，而不是修改 canonical JSON、digest、Save/Debug Bundle
  bytes。该 traversal 同步生成 byte-identical canonical bytes 与一棵新的普通对象/数组
  tree；共享 raw alias 按 canonical path 展开，active-ancestor cycle 仍拒绝，`__proto__`
  作为安全 own data property 安装。该 projection 是本次 ingress 唯一进入 executor、
  recursive freeze、CommandLog 与 replay 的 command；raw identity 立即丢弃，因此不形成
  第二份 authoritative command。不同 ingress 即使复用同一个 raw value 也各自产生新的
  projection；本边界只封闭 ingress-attached hidden state，不宣称 sandbox Story callback
  或消除 realm/global prototype 等 ambient state；
- command admission failure 在任何 queue mutation、executor/authoritative replay
  driver、fault normalizer、RNG、candidate Snapshot traversal/post-digest/freeze 或
  CommandLog continuity/append 前原子失败；Snapshot identity/digest、RNG、command
  sequence、Session status 与 CommandLog 保持不变；package-internal traversal 对
  represented getter 通过 descriptor 检测拒绝且不调用。schema-bearing ingress 在
  gate 前仍可按 Story 自有 schema 语义读取 raw input，本合同不把 getter-zero 保证
  扩张到 schema；
- executor 或 Debug validator 返回后，Session 先执行 post-callback HMR fence；fence
  胜出时不读取 stale candidate、调用 normalizer 或执行 evidence traversal。随后才
  descriptor-only capture attempt/result/diagnostics 外壳与 branch；capture 不读取
  accessor、不遍历 candidate Snapshot。Standard Core 再使用 DET1 的既有 xorshift
  schema 验证 captured candidate
  Snapshot RNG，再进入 evidence finalization；因此同一个 candidate 同时包含 zero
  RNG 与 malformed evidence 时，`rng.invalid_state` 仍先胜出。不得把 evidence gate
  提前包进 resolved `GameSimulation` executor 而反转该 precedence；
- finalized evidence 使用 package-internal 两阶段 prepare/commit：先检查 outer exact
  shape 与 non-committed Snapshot identity，再按 outcome branch 的 array index 顺序做
  fact/rejection schema normalization（fault 无 Story schema），随后依次准备
  `committedRngBefore`、`attemptedDraws`、可选 `candidateRngAfter`、
  `committedRngAfter` 与已有 engine receipt fields。Standard Core 还对 Debug
  validation errors 按 index 使用既有 schema；low-level generic path 仍执行无条件
  exact-shape + Strict Canonical Data gate。`facts`、`reasons`、`attemptedDraws` 与 Debug
  errors 各自只 capture 一次 own `length` data descriptor，并以该固定 length 做 extra-key /
  index validation；不得读取 Proxy virtual `get("length")`。所有准备完成后，对不含 Snapshot 的完整
  evidence candidate 做一次 `evidence_admission` canonical projection traversal；成功才
  冻结 engine-owned projection，重建包含 Snapshot identity 例外的 admitted attempt，并
  签发绑定该 exact admitted-attempt identity 的 package-internal exact-target、one-shot
  receipt。evidence admission 本身不保留或冻结 upstream normalized identity；schema
  helper 可能已按自身合同冻结其 output。candidate/result 中的 Snapshot 与 finalized
  `preSnapshot` 是显式 identity-preserving 例外，不进入 projection。CommandLog 消费
  receipt 时不得重复 traversal，独立或嵌套 ingress 必须
  自行重新 finalization。该 receipt 只覆盖 Standard Core 对同步
  `GameSimulationV1` callback 的受控调用和 Session→CommandLog handoff；generic
  low-level Session 允许 async adapter，若 adapter 在自身 callback 内显式调用 public
  Simulation，那是 callback 返回前已经发生的独立 ingress，不得用全局跨-`await`
  deferral 绕过或混淆并发 direct call；
- evidence finalization 必须早于 candidate Snapshot integrity mutation、whole-tree
  freeze、post-digest、install、authoritative/semantic publication 与 CommandLog
  continuity/append。prepare 失败前 engine 不部分冻结 earlier upstream evidence identity，
  candidate Snapshot traversal/post-digest/freeze 精确为 `0/0/0`，并保持 installed
  Snapshot identity/digest、RNG、sequence、replay base 与 existing log 不变；queue 的
  既有 busy/idle observer notification 不属于 authoritative publication；
- failure classification 保持现有 public surface：fact/rejection schema、Debug
  validation-error schema、fault/RNG/receipt shape 或 canonical failure 都是
  attempt-finalization failure，不伪装成 command `validation_failed`、Story rejection
  或新 result kind。direct synchronous Simulation 对同时带有 own `result` 与
  `diagnostics` 的 attempt-shaped result、以及 direct CommandLog，继续从既有 throw
  channel 暴露 schema error 或 root-public `CanonicalJsonError(code, path)`；Session
  把该 error 交给既有 game/debug unexpected-fault callback **恰好一次**。现有
  `GameSimulationV1` 的 `TAttempt` 是有意保持 opaque 的 generic；不具备该结构的
  Story 自定义 result 原样返回，DET2b 不借机收窄其 public type 或语义；
- normalizer 返回合法、canonical、保留 command-start Snapshot identity 的 faulted
  fallback 时，只 append 这一条 fallback，返回既有 executed/faulted 并进入
  `fault_paused`；原 malformed attempt 不被记录、observer 或 transient publication
  看见。normalizer 缺失/throw、返回非-faulted，或 fallback 的 Snapshot/evidence 仍
  非法时，不递归 normalizer：第二次 finalization/回调 error 使 Promise reject，Session
  回到原 stable status，Snapshot/RNG/sequence/replay base 与 log 不变；malformed Debug
  validation errors 同样走该 policy，合法 non-empty errors 才返回既有
  `validation_failed` 且不写 log；
- authoritative replay 保留 blocking identity mismatch 的最高 precedence；identity
  匹配后先同步、各一次地 capture 完整 recorded-command vector 的 `source` 与
  `command` identity；capture 不枚举 command、不执行 canonical traversal，也不
  freeze。随后按 entry 顺序先验证 captured source 是 `game | debug`，再 prepare 该
  captured command；invalid source 在该 entry 的 command traversal 前以 `TypeError`
  失败。每个 prepare 执行一次包含 representability check 的 command-admission
  projection traversal。全部 entry prepare 成功后才统一 freeze，并且仍早于 Snapshot
  digest/validation 与 driver construction；driver 只接收 captured source 与 admitted
  command projection（包括合法 `null`），并按 prepared-record presence 选择该 value，
  不用 nullish fallback 重新读取可变 entry slot。因此第 `k` 个 command 失败时已有
  `k` 次 command canonical traversal，但
  handoff freeze 与 driver construction 均为 `0`；best-effort replay inspection 不
  执行该 gate；
- 以上 evidence precedence 位于 DET2a command admission 与 queue-front/post-callback
  HMR fence 之后；HMR fence 胜出时不读取 callback 返回的 stale candidate 或执行
  Session-owned evidence traversal；它不能追溯撤销 callback 内显式完成的另一个 public
  ingress。Story schema callback 自身若在 evidence preparation 中同步触发 HMR，Session
  在 preparation/finalization 返回后、CommandLog append/install/publication 前再次检查
  fence：已开始的 normalization/canonical/freeze 不能回滚，但 candidate 仍不得成为
  authoritative state 或 log evidence；
  direct CommandLog 先做 source/debug-outcome 约束与 command admission，再做 evidence
  finalization 和 continuity/digest audit；若 logged-command 含 source/command 与
  engine-reserved fields 之外的 enumerable metadata，随后 descriptor-only capture 并
  独立 canonical-project/freeze 这些 fields，保留公开 entry 的字段枚举顺序。symbol 或
  accessor metadata 在 top-level extra-field capture 时拒绝且不调用 getter；任何 enumerable
  engine-reserved field collision 也同步拒绝而不是静默覆盖，returned entry type 只把
  engine-owned value 暴露为这些 field。continuity failure 先于 metadata failure，任何
  metadata failure 都早于 ordinal/eviction/publication，log/replay base 保持不变；
- 所有 public Session/CommandLog path 与 attempt-shaped direct Simulation result 都执行
  无条件 canonical shape gate；标准 Core composition 另外执行 Story fact/rejection
  schema normalization，test/bench 只能注入 observation/counter，不得替换或绕过
  gate；
- 有效输入不改变 canonical algorithm、digest、Save bytes 或 PF1 的 Snapshot
  digest/freeze contract。bootstrap/command/evidence admission 会产生新增物理
  traversal，instrumentation 必须按 Snapshot digest/freeze、bootstrap admission /
  handoff freeze、command admission/handoff freeze、conditional CommandLog metadata
  admission/freeze、evidence admission、replay comparison 与 total 分标签报告。标准
  `{source, command}` Session path 的 metadata count 固定为 `0/0`；非空合法 metadata
  额外为 `1/1`，top-level symbol/accessor descriptor rejection 与 engine-field collision
  为 `0/0`；已经进入 projection traversal 的 canonical failure（含 nested
  symbol/accessor 或 numeric/value failure）为 `1/0`。

当前 `factSchema` / `rejectionSchema` 存在但尚未接入 execution path，fault 没有对应
simulation schema。DET2b 只允许使用 package-internal composition、engine-owned outer
shape/canonical gate 与现有 stable fault policy；不新增 public evidence hook/receipt、
command result branch、`GameSimulation` revision、fault schema/envelope 或 universal
application receipt，也不把 Surface envelope 扩张到所有 command。若实现不能保持
DET1 zero-RNG precedence、fallback-invalid 的 rejected-Promise + original stable
status + no-new-log 合同，或不能在零 candidate Snapshot traversal 下闭合，必须先
停止并修订设计。

### 6.4 Test-only isolated tripwire

短命 Worker/realm 可以在 dynamic import authoritative driver 前，把 direct
ambient entropy、clock、Host timezone、network、environment、locale-default 与 DOM access API
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
4. invalid command/evidence 在 first authoritative boundary 原子失败；evidence
   finalization 保持 DET1 zero-RNG precedence，valid fallback 只记录一条 canonical
   fault 并进入 `fault_paused`，invalid/absent fallback 则 reject、回到原 stable
   status 且不新增 log；
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
- evidence admission 无法保留 DET1 candidate-RNG precedence、fallback-invalid 的
  rejected-Promise/status/no-log 合同，或无法在 candidate Snapshot 零 traversal 下
  原子失败；
- canonical bootstrap handoff 需要新增 public `GameSimulation` revision、
  bootstrap schema/envelope，或改变合法 initial Snapshot/Save bytes 才能实现；
- lint 只能靠全仓库禁止 clock/float，因而误伤合法 Host/Presentation；
- parity 只能通过删字段、只比最终 Snapshot 或跳过 Firefox；
- 必须把 arbitrary Story code 移入 production Worker 才能继续；
- 工作扩张到 Save migration、Surface、Mod sandbox、StateStore 或 Decimal
  runtime。
