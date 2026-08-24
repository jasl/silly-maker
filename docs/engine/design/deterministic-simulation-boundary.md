# Authoritative simulation determinism boundary

状态：2026-08-02 接受 DET3a conservative-syntax corrective target。此前
DET3a–DET4 promotion 证明的是当时的 broad static-analysis contract；其测试数字、
byte-equivalence 与 runtime evidence 作为历史记录保留，但 Date/String provenance、
dynamic-import 与 failure-classification 规则已由本次目标 supersede，不构成 corrective
contract 的实现或 promotion evidence。DET3a-C1 import/loader admission、C2
Date/String/provenance kernel、C3 B-prime Base UTC isolation 与 C4 dead-path cleanup 已按新
合同落地；DET3b inventory/reachability 已复核，DET4 Deno、Chromium、Firefox、WebKit
full matrix 已重新通过，corrective aggregate PF-DET 现已关闭。`development.md` 与
`features.md` 描述当前 live implementation；准确实测 evidence 由 active plan 的 corrective
promotion record 拥有。具体落地顺序见
[Authoritative determinism guardrails plan](../plans/2026-07-31-authoritative-determinism-guardrails.md)。
当前 Snapshot、Save 与 Debug Bundle encoding 已有 integer-only canonical
边界，事务 RNG 已进入 Snapshot；zero xorshift state、bootstrap 尽早入场、
command/finalized-evidence canonical admission、Strict JSON number token 精确数学整数
检查、ambient static guard、隔离探针与多 JavaScript 引擎逐 command parity 均已
fail closed 或进入 maintained matrix。本文其余部分同时记录 live 合同与明确 deferred
边界。

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

- `createBootstrapInput` 输出经过 Core 一次 canonical admission 后，
  `createInitialState` 实际接收的 detached plain input；
- GameCommand / DebugCommand 的规范化结果；
- command executor、module domain-event reducers、invariant 与 authoritative
  Narrative reducer；
- Snapshot state、RNG、command sequence 与 run integrity；
- domain events、rejections、stable fault evidence、RNG draw evidence；
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
- `createBootstrapInput` 的返回值是显式 ingress data；Core 先对整个值做一次
  package-internal Strict Canonical Data projection admission，再把同一个 admitted
  ordinary projection 交给 seed reader 与 `createInitialState`。内部 typed consumer
  不重复 admission；raw adapter output 不保留；
- 该 handoff 不新增 public bootstrap schema/envelope 或第二份 authoritative
  state；其中通过既有 seed validation 的版本化 seed 可以进入 initial Snapshot；
- 不通过闭包或 mutable singleton 反向改变规则；
- 需要影响 gameplay 时，必须发送新的 validated semantic/authoritative command；
- 仍受各自 presentation epoch、readiness、input 和 persistence fence 约束。

这个区域中的 **durable deterministic projection** 是窄例外：它不改变 gameplay
transition，却会改变持久化 bytes，因此不能继承普通 Presentation 的 ambient
能力。当前 `summarizeSave(state)` 只能读取 authoritative read-only State，并为同一 State 返回同一
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
handoff 也已使用同一 detached engine-owned projection；authority-aware static
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
- `performance` 的 Host clock API/metadata（包括 `now()`、`timeOrigin` 与
  `toJSON()`）；
- 其他隐式 Host entropy、clock 或 locale-dependent default。

合法入口：

- composition root 把 Host entropy provider 作为 `BootstrapEntropyV1` 显式注入
  Story-owned `createBootstrapInput` ingress adapter；只有对该参数的方法调用获得窄
  capability allowance，adapter 仍不得直接调用 ambient entropy/clock；
- Core 对 adapter 输出做一次 canonical projection admission；admitted typed value
  遵循普通 JavaScript runtime 语义；
  `createInitialState` 才是消费 bootstrap 的 authoritative callback；
- gameplay randomness 只经 Snapshot-owned transactional RNG；
- gameplay-authoritative time 是 Story-owned canonical State/Command data，通常使用有界整数
  tick、turn、day、duration、sequence 或 closed phase；其中 `day` 等字段只表达 Story
  domain，不承诺 Gregorian 语义；
- wall-clock 仅作 Host/presentation/diagnostic
  metadata，不能成为未记录的规则输入；
- Save migration 禁网络、clock、random 与 live Session。

### 4.1 Wall-clock metadata 与 authoritative gameplay time

C3 的 Gregorian/UTC 语义只治理 durable wall-clock metadata：Save `savedAt`、Debug Bundle
`generatedAt`、runtime-fault `occurredAt`，以及 Host-facing export filename timestamp。前三者
共用 strict `IsoUtcInstant` admission；filename 使用独立 loose Host normalization。这些值可
进入 persistence/diagnostic artifact bytes，但不得成为 Snapshot、`stateDigest`、RNG、
CommandLog 或 replay rule decision 的未记录输入。

这里的 determinism 是指同一 metadata string 在所有 maintained runtime 得到相同的 admission/
rejection，不要求 Host metadata clock 在不同运行或不同 artifact 中产生相同 timestamp。

这不是 gameplay calendar、scheduler、`WorldTime` model 或 genre contract，也不蕴含 Story
使用 Gregorian year/month/leap day、wall-clock progression 或 Unix epoch gameplay wire。
每个 Story 继续自行选择 scalar elapsed time、day/slot、duration、sequence 或其他 canonical
deterministic representation；calendar 可以只是该 State 的 policy/projection，也可以由 Story
明确选择为 authoritative fields，但不得产生第二份可独立变化的 time authority。

如果现实时间影响玩法，Host 必须在 authoritative transition 外按产品 policy 采样，再提交带
单位、范围与 revision 的 bounded canonical command 或 immutable resource identity。replay 只
消费已记录值，永不重新读取 wall clock。

C3 package-internal UTC parser/formatter 只是 metadata infrastructure，不得被导出或复用为
engine-level `CalendarPolicy`、`WorldTime`、gameplay scheduler、genre package、Unix timestamp
wire 或 Story-facing date helper，也不修改 Cat Cafe gameplay。Cat Cafe 只是第一个
Story-local calendar/time-economy consumer；出现 behaviorally independent 的第二消费者前，
不设计 reusable engine capability。若未来满足 promotion gate，应优先提取两个消费者共同需要
的最小 deterministic arithmetic/scheduling operation，而不是 universal calendar model。

### 4.2 Package-internal wall-clock metadata policies

Base 的 `IsoUtcInstant` admission 与 Host-facing export filename timestamp path 只能使用
repository-owned、package-internal 的 ASCII/integer UTC primitives；不得导出通用
instant/Date helper。两条 policy 必须分离，只共享 lexical scanning、decimal fields、
Gregorian leap-year/days-in-month 与 day-increment primitives：

- strict wall-clock metadata admission 接受
  `YYYY-MM-DDTHH:mm:ss(?:.digits+)?Z`，year 为 `0000..9999` 的 proleptic Gregorian，
  month/day 必须构成真实日期，minute/second 为 `00..59`；hour 通常为 `00..23`，只有
  minute/second 全零且 fraction 缺省或全部为零时才接受 `24`。不接受 leap second、offset、
  lowercase `z`、whitespace、expanded year、date-only 或非 ASCII digit；accepted value 原样
  返回，不规范化 spelling，fraction 在本切片不设最大长度；
- Debug Bundle `generatedAt` 与 runtime fault `occurredAt` 复用同一 package-internal
  `IsoUtcInstant` admission：maintained-valid spelling/bytes 不变，malformed value 经现有
  schema failure 拒绝；位于 Debug Bundle decode 时维持 `envelope.schema_invalid` mapping，
  不新增 revision 或 error family；
- legacy export filename formatter 保持独立 loose policy：month `1..12`、day `1..31`
  先 admission 再做 forward Gregorian overflow normalization，exact-zero `24:00` rollover，
  invalid clock 回退 bare configured filename。其现有 year padding/overflow output 在 C3
  只 characterization，不修正。

这是对此前 runtime-dependent validator 的 deterministic convergence，并明确收紧 malformed
input；它不改变 Save envelope shape 或 `formatRevision`，maintained-valid Save/Debug Bundle
无需迁移且 bytes/digest 不变。若维护 fixture 或真实 released Save 含 newly rejected malformed
timestamp，必须停止并设计显式 legacy recovery/migration。C2 authoritative Date syntax proof
仍是独立合同：real Gregorian、hour `00..23`、fraction `1..3`、`Z` 或 explicit offset；不得把
metadata admission 的 arbitrary fraction 或 `24:00`、filename overflow policy 注入 C2
safe-set。C2 只是 authoritative source 对显式记录 instant 的 conservative static syntax proof，
不定义 gameplay calendar、time progression 或 scheduler semantics。

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
  `createInitialState` 前做一次 canonical admission；
- durable Save projector 只消费 authoritative read-only State，输出立即 normalize 与
  copy；异常必须在任何 physical Save write 前原子失败；
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

collector 对 `.ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs` 使用 syntax-aware ESM AST。runtime
closure 收集 static value `import`、runtime-bearing `export ... from`，以及 direct
`import()` 的唯一 positive grammar：一个 ordinary quoted string literal 参数；该 specifier
再按既有 relative/workspace/external path policy 解析。type-only import/export 不扩张
runtime authority closure，comment/string lookalike 与 `import.meta` 不形成 dependency。
template、concatenation、identifier、spread、options argument、零/多参数或其他
`import()` shape 在 parser-backed collector 中每个 source 只产生一次
`determinism.import_closure.dynamic_specifier` pre-lint failure。authority/BuildIdentity
caller 必须在 source lint/record admission 前因任一 error 原子 fail closed，不能消费或
发布 partial path vector，也不能把同一 dynamic import 再交给 rule core 重复报告。

Save M2e 已把 Engine Lab 的 real app-local State-migration owner entry 加入上述 live
recollection；collector 从 Core 配置与 owner export 验证 exact registry identity，并检查
app-local closure 被 managed BuildIdentity 完整覆盖。DET-B 的 synthetic extension seam 继续
作为独立 collector regression，不计作 real-owner evidence。Envelope format migration在
M2中仍未激活，不能用空 registry 或 test-only format callback代替真实历史格式合同。

第一批 hard diagnostics 覆盖直接 ambient entropy、clock、network/LLM client、
process environment、Host locale/ICU 与 DOM access；fractional literal、
`parseFloat` 与 approximate math（包括 `Math.pow` 的 `**` 等价写法）在同一 authority
scope 中只允许带算法合同的 node-local 豁免。AST rule 必须先遍历会实际求值的 receiver/
callee、input/spread element、template substitution 与 computed property key，再分类外层
member/call/new/coercion operation；外层 operation 合法或 fail-closed 都不能遮蔽其求值阶段
已经发生的 ambient read。DET3a 的 Date proof 是 definition-level conservative syntactic
proof，不执行一般 constant evaluation。函数形式 `Date()` 无论参数都会读取 ambient current
time，zero-argument `new Date()` 同样不合法。Date direct-safe 只包括：

- TimeClip 范围内 exact static integer epoch；
- unshadowed direct `Date.UTC` 的 exactly-seven-argument static form；七项均为 exact
  integer，year `100..9999`、month `0..11`、真实 Gregorian day、hour `0..23`、
  minute/second `0..59`、millisecond `0..999`，不接受 overflow normalization；
- unshadowed direct `Date.parse` 或 direct single-argument `new Date` 的 strict full-zone
  `StaticString`：`YYYY-MM-DDTHH:mm:ss`、optional `1..3` fraction digits、`Z` 或
  `±HH:mm`，并验证真实 Gregorian date/time/offset；不接受 date-only、whitespace、
  expanded year、`24:00` 或 leap second；
- 指向上述一个 exact singleton value 的 immutable local `const` value alias。

`Number(...)`、dynamic `IsoUtcInstant`、known Date copy、multi-argument `new Date`、
Date callable alias，以及 Date/parse/UTC 的 `call`、`apply`、`bind` 均不构成 allowance。
literal descendant、conditional/logical/reassignment、mutable binding、spread、wrapper 与
general constant folding 同样不能制造 proof；风险路径仍被 conservative detection 拒绝。

`StaticString` 只由 ordinary string literal、no-substitution ordinary template、direct
unshadowed `String(...)` over a statically foldable primitive（string/boolean/null/undefined/
exact number），以及 no-substitution direct unshadowed `String.raw` tag 产生。
`new String` 是 boxed object；有 substitution 的 template、自定义 tag、alias、
`call`/`apply`/`bind`、nested wrapper 或其他 tagged-template shape 都不授予
`StaticString`。附着在 producer Call/New/TaggedTemplate runtime node 上的 TypeScript
type arguments 同样属于 runtime-erased wrapper syntax，不得绕过 direct-form 检查。除唯一的
no-substitution direct `String.raw` form 外，tagged template
按普通函数调用处理；其 runtime-evaluated substitutions 仍独立遍历。

exact known Date instance 只允许 terminal direct `getTime`、`valueOf`、`toISOString`
与 UTC getters；所有 local getters/rendering、`getTimezoneOffset`、`toJSON`、全部 setters
（包括 UTC setters）、method wrapper/capture、value escape、dynamic member 与 mutation
都 fail closed。call/new/tag、class heritage、`instanceof` RHS、sync/async iterator 与
runtime pattern/default/enum sink 等 non-terminal use 同样 fail closed。Date 的
coercion/default-rendering detection 仍用于识别风险，不作为
`StaticString` 或 Date-input proof producer。`Reflect.set`、`Object.defineProperty` 等
reflection mutation 继续由 DET3b isolated tripwire 覆盖。
附着在 terminal CallExpression 上的 TypeScript type arguments 不属于 direct terminal。
bare `performance` root 及其任一 direct member read/call 都按 Host clock metadata 归
`determinism.performance_clock`；`Deno` / `process` 的 direct member
read/call（包括 env、filesystem 与 cwd）归 `determinism.environment`，bare root
capture/escape 仍归 capability escape。
latest-stable Deno 已暴露的
`Temporal.Now` 属于 ambient clock；直接 member call 报 clock，静态 destructure 捕获
`Now` namespace 时先报 capability escape，若仍继续调用 alias 则该 read 再报 clock。
`Temporal.Instant` / `Temporal.PlainDate` 等明确 deterministic namespace 可直接调用或
静态 destructure，但 bare `Temporal` root 不能逃逸。direct
`Date.prototype.constructor` 与 direct exact KnownDate `.constructor` 先归约为 Date target
identity；computed/optional selector 使用 dynamic-member failure，不获得 recovered identity。
该 non-direct-selector risk 必须穿过后续 member/call/new/tag 与 computed destructuring，
不能因 descendant path 或 pattern-derived alias 再次归约为 Date。
随后 `.now` 使用
`determinism.clock.date_now`，`.parse` / `.UTC` / recovered Date constructor use 使用
`determinism.capability.indirect_intrinsic`，`Date.now.constructor(...)` 或等价 Function
constructor chain 使用 `determinism.capability.dynamic_code`；等价链必须先证明 owner callable，
证明范围是 maintained exact callable table（包括 direct intrinsic、`Function.prototype` 及
exact `require` / `module.require` / returned-loader / `createRequire` function base），不从任意
local/user function object 或 loader arbitrary descendant 推断全局 `Function` identity；primitive
owner 或其他 unknown
`.constructor` 使用 `determinism.capability.constructor_escape`。该 callable identity 只服务于
risk classification，不是 Date/StaticString/KnownDate allowance：immutable local `const` alias、
static destructure、runtime-transparent parenthesis/TypeScript wrapper/type arguments，以及
runtime-value-preserving sequence/assignment result 与 exact callable `.bind(...)` result 可以
保留 exact callable；conditional、
binding reassignment 与 unknown join 不保留。exact callable 是已知
truthy/non-null value，因此 logical `lhs || rhs` / `lhs ?? rhs` 选择 lhs，`lhs && rhs` 选择
rhs；lhs producer 始终按 runtime semantics 求值，只有实际选择的 rhs 才遍历，discarded lhs
operation 仍保留具体 diagnostic。C1 的 dynamic-loader provenance 不参加该 short-circuit
proof，继续 conservative join。selected bound constructor 只有在 enclosing exact immediate
execution 已拥有 winner 时才抑制 capture，未证明 descendant 仍报 escape。
conditional callee 不保留 exact callable proof，并遍历两个可能执行的 branch；outer unknown/
loader join 不能吞掉 branch 自身的 clock/random/capability diagnostic。static
`module`/`node:module` import 只为 exact `createRequire` binding/namespace member 和其 proven
factory/call/apply/bound-factory invocation 的 returned loader 提供 risk-only callable proof，
不为 arbitrary provider/loader descendant 或 Function-constructor result 提供 loader identity。

只有 current node 本身是 direct `new Date(...)`、`Date.parse(...)` 或 `Date.UTC(...)` 时，
其专用 input failure 才拥有对应参数。alias/recovered/wrapper 路径的 outer
`indirect_intrinsic` 不吞掉实际求值的 KnownDate argument 或 `thisArg` escape；SpreadElement
operand 会先执行 iterator protocol，因此 direct Date spread 也必须保留 KnownDate child
failure。static destructured `Date.now` / `.parse` / `.UTC` 在 capture site 分别使用
`date_now` / `indirect_intrinsic`，不能通过 pattern 变成 clean alias。exact winner 在 generic
capability/wrapper classification 前决定，同一 maximal chain 只产生一个 current-node primary
diagnostic；receiver/callee/input 中确实执行的 child expression diagnostic 仍保留。bare
`Math` / `Date` / `Number` / `Temporal` / `globalThis` / `Deno` / `process` 与 CommonJS
`module` capability root 不得通过 alias、argument、return 或 export 逃离逐文件
verification；已分类的 direct member operation 继续按其具体 rule 判断。unshadowed static
`globalThis.<root>...` 只恢复现有 classifier 的 root identity，不授予 Date/StaticString direct
allowance：exact/specific winner 先行，既有 intrinsic root 在 classifier 返回 clean 时保持
clean，tracked ambient 或未分类 first hop/descendant 则 generic fail closed，dynamic selector
仍使用 `dynamic_member`。该 provenance 必须穿过 sequence last-value、runtime `import =`、
destructure/alias 与 write target，不能因语法换形丢失 root。即使显式给出 locale，
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

所有真实 unshadowed `require`、`module.require`、runtime `import = require(...)`，以及由
static `module` / `node:module` provider binding 证明的 `createRequire` factory/returned loader
及其 direct/wrapper/tag/capture/computed/partial use，由 parser-backed rule core 唯一分类为
`determinism.capability.dynamic_require`；provider specifier 不改变 loader operation 的
failure kind。static ESM provider acquisition 仍可独立报告 provider import，bare `module`
escape 则保持 generic ambient-capability classification。只有实际 runtime lexical local
shadow 是 ordinary code；erased `declare` 与未初始化、不会覆盖 CommonJS wrapper binding
的 `var require` / `var module` 不构成 shadow。type-only import/export 不形成 runtime
dependency，也不能触发 loader rule。

static failure precedence 是：authority/collector admission；read/extension/parse；
runtime-evaluated child diagnostics；current-node exact classification；最后按 UTF-16
file/range/code stable sort。collector failure 不运行 source lint。current-node exact winner
顺序固定为 `dynamic_code`、`dynamic_require`、`intrinsic_mutation`、`date_now`、
`date_function_call`、`date_zero_argument_constructor`、`indirect_intrinsic`、Date input/UTC/
local-time/mutable-instance diagnostics、`constructor_escape`、`dynamic_member`、provenance
cycle/budget、numeric diagnostics。普通 unknown/non-exact proof 使用 owning operation 的最具体
failure code。一个 maximal chain 不因 generic fallback 重复报告；
child runtime evaluation 仍可在不同 range 拥有独立 diagnostic。checker 只返回完整 frozen
diagnostic vector 和 non-zero status，不发布 partial success receipt，也不写 authoritative
State、Save、artifact 或 cached inventory。

上述 corrective category 的 stable code 固定为
`determinism.capability.dynamic_code`、
`determinism.capability.dynamic_require`、
`determinism.capability.intrinsic_mutation`、
`determinism.clock.date_now`、
`determinism.clock.date_function_call`、
`determinism.clock.date_zero_argument_constructor`、
`determinism.capability.indirect_intrinsic`、
`determinism.date_input_unverified`、
`determinism.date_utc_unverified`、
`determinism.host_timezone`、
`determinism.date_instance_unverified`、
`determinism.date_instance_mutation`、
`determinism.capability.constructor_escape`、
`determinism.capability.dynamic_member`、
`determinism.provenance.cycle` 与
`determinism.provenance.budget_exhausted`。budget exhaustion 是 admission-level atomic
failure：不得把耗尽前的 traversal diagnostic 或 partial proof vector 一并返回。

Date-input、StaticString 与 KnownDate provenance allowance 只接受 exact singleton。相同 exact
singleton 的 immutable local `const` value alias 可以保留；conditional/logical expression、reassignment、不同 singleton、
clean/unknown branch、mutable binding、cycle 或 budget exhaustion 一律降为 unknown 并
fail closed，不产生 union、semantic candidate class 或 Date-instance class。risk detection
使用 source-local conservative join；不要求完整 CFG 或 interprocedural analysis，任意 function
return、container、reflection 与 implicit coercion flow 都不能升级 proof。root 与已发现的
source-local closures 使用有界单调 worklist；不能收敛或耗尽预算时使用专用 stable diagnostic，
且不发布 partial provenance。跨边界动态恢复由 DET3b isolated runtime tripwire 补强；两层都
不是第三方代码 sandbox 或 security boundary。

numeric exemption 的 `allow-next-line` 是物理行合同：directive 与目标 node 必须位于
相邻两行，blank line 或另一 comment 都不能跨越。它只抑制下一行第一处 matching
numeric diagnostic；同一 node 的 ambient diagnostic 仍保留。metadata 固定为 non-empty
`code/reason/bounds/rounding/test`，其中 test 是 repo-relative
`*.test.ts#case-name`。该文件必须存在且恰好包含一处 exact trimmed marker
`// sillymaker-determinism-vector: case-name`；evidence file 不因此进入 authoritative
closure。missing file/marker、ambiguous duplicate marker、malformed、duplicate、stale、
wrong-code 与 whole-file directive 全部 fail closed，numeric diagnostic 不被抑制。

### 6.3 State migration callback boundary

M2 State migrator 是 Authoritative Simulation callback，但只接收 raw-digest-verified
historical Snapshot 的 `state`。package-owned canonical encoder 与 Strict JSON parser 对
historical State 和每步 migrated output 各执行一次 canonical/limits admission，并交付 detached
plain data。callback 同步返回 migrated/rejected union，不取得 Save envelope、Host、clock、
random、network、Session、renderer、database 或 arbitrary context；result 使用普通 JavaScript
discriminant/field 读取，Promise、缺失字段、非法 reason code 与不满足 Strict JSON/limits 的
State fail closed。该边界不认证 prototype、descriptor、accessor 或 exact own-key shape，也不
递归冻结 State；`DeepReadonly` 是受支持的类型合同，绕过类型约束修改对象属于未支持行为。
每个成功 output 在交给下一步前重新 detached admission，因此 callback 持有的 raw input/output
alias 不能在返回后改变后续 migrated State。kernel 不 await，也不读取或调用 arbitrary
`.then`。

Core中配置的 factory-produced exact registry必须与
`ApplicationAuthorityPolicyV1.saveStateMigrationOwner` 指定 module/export是同一对象；collector
从 live registry枚举全部 callback identity和owner import closure，缺 owner、stale owner、
identity/completeness mismatch均在 source lint前 fail closed。registry factory、chain resolver、
execution/admission kernel与receipt/attempt construction属于 bounded Base authority；若其 closure
吸入 Host、Presentation或broad persistence composition，应拆出pure kernel而不是扩大 authority。

isolated Worker必须真实执行 Engine Lab one/two-step、explicit rejection、throw与illegal-output
vectors；只 import或只静态 lint source不算 tripwire evidence。现有 Deno/Chromium/Firefox/
WebKit matrix比较 normalized output、path/phase/code、source/migrated digest、receipt/attempt、
callback count、adoption组合与same-runtime repeat，缺 browser不得 skip。

该 migration Worker 与 DET3b ambient-tripwire Worker 分离：前者允许进入 staged
Persistence/schema integration，后者继续保持不含 Persistence composition 的窄 authoritative
transition closure。aggregate matrix 同时运行二者；分离不能把真实 migration owner 从 static
authority recollection 移除，也不能用父 realm 直接执行 callback 冒充 Worker evidence。

`SaveStateMigrationReceiptV1` 是非持久化 replacement-origin diagnostic package data，不进入
Snapshot、State digest、CommandLog、Save、Debug Bundle或 authoritative replay comparison；
receipt的跨 runtime equality仍须验证，以证明 migration结果和新 anchor identity一致。

### 6.4 Runtime admission

Runtime admission protects concrete data boundaries; it is not an object
authenticity or hostile-JavaScript subsystem.

- `createBootstrapInput` is treated as Host ingress. Core creates one detached
  canonical projection, parses the RNG seed, and passes that admitted typed
  value to the root and stateful-module initializers. Construction, restart,
  and the extension initial-Snapshot helper share this path. Failure is atomic
  with respect to Session, replay-base, and persistence ownership.
- Public Session gameplay/Debug commands, public `createCommandLogV1`, and the
  authoritative replay vector each canonicalize commands at their own true
  ingress. A Session passes its admitted command to trusted Simulation and
  internal CommandLog collaborators without repeating validation. Replay
  preflights the complete source/command vector before driver creation.
- Session finalization validates result kind, candidate Snapshot RNG and run-integrity data,
  non-commit Snapshot identity, `eventSchema`/`rejectionSchema`/Debug-error
  normalization, RNG evidence, and Snapshot-free canonical evidence once. It
  then applies integrity, digest, log, and install steps. A malformed attempt
  reaches the existing unexpected-fault normalizer at most once; an invalid
  fallback cannot mutate authoritative state.
- The public low-level CommandLog independently admits its command and
  finalized evidence and recomputes state digests. The Session-owned internal
  log trusts the already admitted command/finalized attempt but still enforces
  source and Debug-outcome rules, Snapshot identity, digest continuity,
  ordinals, and eviction. Public extra metadata is canonicalized once and may
  not collide with engine-owned fields.
- Admitted Snapshot, command, evidence, bootstrap, and semantic projection
  objects follow ordinary JavaScript runtime semantics. `DeepReadonly` is the
  supported TypeScript contract; deliberate casts, mutation, Proxy tricks,
  private side tables, or monkey-patching are outside the engine contract and
  threat model. The engine does not recursively freeze these trees or
  authenticate prototypes/descriptors/accessors at every internal layer.
- This simplification does not weaken strict bytes/files/URLs/HTTP/RPC/Save
  parsing, Snapshot schema and digest, replay comparison, CAS, generation or
  sequence currentness, persistence atomicity, or deterministic execution.
  Valid public canonical bytes, Save/Debug Bundle formats, and replay data are
  unchanged.

### 6.5 Test-only isolated tripwire

短命 Worker/realm 可以在 dynamic import authoritative driver 前，把 direct
ambient entropy、clock、Host timezone、network、environment、locale-default 与 DOM access API
替换为 throwing guard。它必须：

- 启动时逐项证明 guard 可安装，否则结构化失败 `tripwire_unavailable`；
- 只接收 realm 外已经构造的 fixed canonical bootstrap input；
- 不加载正常 Player Host/Presentation；
- test 结束直接 terminate，不在共享 realm 跨 `await` patch/restore；
- 只作为错误探针，不作为 sandbox 或 production security boundary。

clock registry 在已知 `performance.now` / `timeOrigin` / `toJSON` member guard 之后
保护完整 `performance` root；environment registry 同样在已知 member 外保护完整
`Deno` / `process` root，避免其他 Host runtime capability 从未枚举 member 穿透。Date runtime admission 与静态规则使用同一分类：经
Gregorian 校验的 zone-less local spelling 是 Host-timezone violation，malformed、
impossible 或其他 unverifiable input 是 `determinism.date_input_unverified`。direct
`Date.parse` / single-argument `new Date` 的 explicit-zone runtime proof 与 C2 一致，只接受
`1..3` 位 optional fraction；neutral driver 固定 `.1` / `.12` 正向路径，guard self-test
固定 `.1234` 拒绝边界。

每个 runtime 只需 patch 实际存在的 API；不存在的 global 由 probe
证明访问稳定失败，不能把 absence 记成 silently skipped coverage。

probe 的 package-internal result 是闭合 union：`passed`、
`tripwire_unavailable`、`tripwire_violation` 与 `driver_failed`。realm 内
`driver_failed.phase` 只有 `module_import | driver_run`；malformed request/receipt 或
message transport validation 归 `protocol`，Worker error/timeout 归 `worker`。后两类没有
valid guarded-driver result，因此必须使用空 coverage，不能携带或推断 realm evidence。安装阶段保持
`armed = false`，按固定 registry 顺序逐项定位 descriptor、替换并执行 effective
invocation/access self-test；self-test sentinel 本身不记 violation。任一既有 API
不可替换、替换后不生效或 absence probe 不能证明固定失败，都以首个
`tripwire_unavailable` 结束，且 driver import/run count 必须仍为零。全部 guard
完成后才一次性 arm，再 dynamic import driver。

armed 后 guard 在抛出 sentinel 前先 latch 首个 category/code/phase；即使被测代码
捕获，最终结果仍为 `tripwire_violation`。已 latch violation 高于随后发生的 module 或
driver error；只有没有 latch 的 import/run 异常才归 realm-side `driver_failed`。reflection 对已保护
slot 的 `Object.defineProperty`、`Reflect.defineProperty`、`Reflect.set` 等 mutation
同样 latch capability escape，而不是仅依赖平台 `TypeError`。`passed` 要求每个声明的
guard 都有 `installed` 或经 probe 证明的 `native_absent` evidence，并且 driver 成功。
结果不传输平台相关 stack/message 作为 parity 字段。

parent receipt admission 还必须验证 exact guard registry order/categories、
counts/coverage 关系、closed keys/enums 与四条 command 的 compact trace shape；任何
forged 或 out-of-contract `passed` receipt 都降为带空 coverage 的
`driver_failed.protocol`。这层只做 transport/shape admission，固定 expected 的
exact value equality 仍由外层 determinism test 断言，不能把二者混成一个 receipt
validator。

realm 外输入不是装饰性 receipt：fixed canonical bootstrap value 经消息边界进入 realm
后，必须由 neutral authoritative workload 实际读取来构造初始 RNG/Session。parent 对
success、unavailable、violation、driver failure 与 malformed message 都在 `finally`
exactly-once terminate；realm 内不 restore 部分安装的 global。

### 6.6 Cross-runtime parity

一个中性、短小的 transcript 在 Deno、Chromium、Firefox 与 WebKit 使用同一
test-only driver 执行。每个 command 比较：

- normalized input identity；
- outcome kind 与 events/reasons/fault；
- committed RNG before/after、attempted draws 与 sequence；
- pre/post Snapshot digest；
- finalized CommandLog/replay evidence。

报告第一处分歧的 command identity、sequence 与字段 path，而不是只比较最终
Snapshot。相同 runtime 也重复执行以区分普通 nondeterminism 和跨 engine
差异。矩阵还直接消费 M0a 唯一拥有的 compact summary/unstamped/stamped pure
vectors 与 fixed expected bytes，不复制 lifecycle corpus或从待测 encoder 重生成
expected。矩阵证明维护中的受支持路径，不认证任意第三方 JavaScript。

Live DET4 使用独立的 test-only matrix module/comparator 组合这些证据；DET0/DET3b
tripwire driver 保持只加载窄化的 authoritative workload closure，不为 aggregate
matrix 引入 persistence 或 Browser/Presentation authority。M2e 在同一 matrix 中增加唯一的
`saveStateMigration` vector，但由第二个短命 Worker 进入 staged Persistence migration
closure；migration callback 不在 patched ambient-tripwire realm 中执行。矩阵通过
`@sillymaker/base/testkit/determinism-vectors` 复用 DET2e hand-written ordering
expected 与 M0a 唯一的 Save-metadata expected，并用 synthetic `summarizeSave`
callback 证明 State-to-summary normalization；没有复制 expected 或 lifecycle corpus。

四个 command 在同一个 Session 中按 no-draw commit、rejection、RNG commit、fault
顺序执行，累计四条 retained CommandLog entries（ordinals `1..4`）；command sequence 固定为
`0 -> 1 -> 1 -> 2 -> 2`。matrix 从该 run 的同一组 dispatch/log evidence 形成逐 command
trace，随后对同一完整 log 执行一次 authoritative replay，`executedEntries = 4`，不能用
另一组 run 或四个 single-entry replay 拼接。相邻 entry 的 pre/post digest、committed RNG
before/after 与 sequence 必须连续；rejection/fault 继续证明 Snapshot/digest/RNG/sequence
retention。Session 固定使用 seed `1_236_431_772` 与 `exclusiveMax = 7`：rejection 的
candidate 与后续 RNG commit 都先得到等于 rejection limit 的 raw draw
`4_294_967_292`，必须拒绝，再接受 `1_015_932`；前者 rollback，后者 commit。每个
runtime 执行两次；comparator 返回第一处
divergence 的 project、repeat、vector、command ordinal/identity、sequence、JSON
pointer 与 expected/actual。matrix 不扩张 production Browser Agent，也不向其暴露
Snapshot、RNG 或 CommandLog。

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

首选落点是 content compiler/authoring normalization。Snapshot、command、domain events 与
Save 中不保存 Decimal instance；若未来 runtime 真需 Decimal，也必须先转换为已
版本化的 plain canonical wire representation。

## 8. Promotion and stop rules

DET1–DET2e（DET-A）完成只允许 callback-free Save M0b/M1 分叉，不构成完整
promotion。旧 DET3a–DET4 promotion evidence 仍只证明 superseded broad contract；随后完成的
corrective DET3a、DET3b invariant revalidation 与 DET4 full matrix re-promotion 已按
conservative-syntax contract 再次关闭 aggregate PF-DET。准确实测 evidence 由 active plan 的
historical 与 corrective promotion record 分别拥有：

1. current-gap tests 先证明 raw/mutable bootstrap handoff、zero cursor、
   command/evidence late failure 与 replay admission 的旧行为；
2. 合法 corpus 的 Snapshot/digest/Save/replay bytes 保持等价；
3. invalid bootstrap output 在 `createInitialState` 前失败；有效 handoff 是一个
   detached admitted value，内部按 typed data 使用，且不新增 public schema/envelope；
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
- safe-set 只能通过一般 constant evaluation、执行 Story code 或跨 source/container dataflow
  才能实现；
- exact singleton provenance 必须 widening 成 union/semantic class 才能接受，或 unknown/
  cycle/budget exhaustion 不能稳定 fail closed；
- classification precedence 无法为 maximal chain 选出唯一 stable winner；
- dynamic import 只能通过发布 partial closure、lint 后失败或 regex discovery 才能处理；
- CommonJS 需要建设 dependency graph 才能继续；
- package-internal UTC helper 无法保持 B-prime accepted corpus 的原 spelling、maintained-valid
  Save/Debug Bundle bytes 或 legacy export filename normalization，或发现 maintained fixture / real
  released Save 含 newly rejected malformed timestamp；
- C3/C4 必须新增 `CalendarPolicy`、`WorldTime`、gameplay scheduler、genre package、Unix
  timestamp wire、Story-facing date helper 或 Cat Cafe gameplay change，authoritative replay 必须
  重读 wall clock，或在第二个 behaviorally independent Story consumer 出现前必须提升 reusable
  time/calendar capability；
- 修复要求新增 public instant/Date helper，或改变 Save/canonical/digest/CommandLog/replay
  语义；
- 工作扩张到 Save migration、Surface、Mod sandbox、StateStore 或 Decimal
  runtime。
