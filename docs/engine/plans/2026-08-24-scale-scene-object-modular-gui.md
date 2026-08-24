# Scale、Scene/Object 与模块化 GUI V1 实施计划

状态：**2026-08-24 经所有者接受并开启；M0、M1 已于同日交付，当前下一项为 M2；
M0–M5 必须按序交付，每个里程碑独立复核后再进入下一项。**

[Production-floor sequence](2026-07-30-production-floor-sequence.md) 仍是唯一跨计划排序入口；
本计划接在已关闭的 Browser R2 authoritative handoff 之后。Deno Desktop candidate 继续
package-private、explicit、default-off，等待含目标实现的 stable Deno 发布后独立复验；它不是本计划
的依赖，也不得阻塞 Browser、通用 GUI/game engine、Scene、Inspector 或性能工作。

目标合同由
[Scale, Scene Object, and Modular GUI](../proposals/scale-scene-object-and-modular-gui.md)
拥有；本计划只拥有 M0–M5 的实施顺序、预算、验证与停止条件。

本轮的所有者目标不是把下一次作品重写一步做成最终形态，而是先关闭三类会随规模放大的引擎风险：

1. 100 倍文本与约 10 倍 gameplay/scene 内容不能线性进入初始 Player JS、启动 heap 或 Snapshot；
2. Scene、object、layer、interaction 与 animation 必须有一条比当前零散文档/运行时构造更清晰的
   渐进阶梯，能够直接解释层级顺序、可见热区、场外对象和并行通道；
3. 平台无关 State/Session 内核、GUI/game 必需能力与 DevDock、Inspector、预制 settings UI、Agent
   等外圈能力必须形成可验证的单向依赖；外圈可按产品组合、替换或复制定制，核心不因此碎片化。

本轮只交付 Inspector-first 的对象层级、检视、真实 preview 与少量稳定属性编辑，不设计最终 Studio、
Blueprint、完整 timeline 或代码编辑器。现有 Studio UI 在 Inspector 能覆盖本轮工作流后退出维护面；
已经接受且仍有独立合同的 Authoring Host、document session、structured operations、CAS、private
Extension Runtime 不因仓内消费者变化而误删。

## 1. 当前证据与问题边界

立项基线为 clean HEAD `7a4ceba151da627c0bc2c576bad98bf38cc46aa3`。以下数字只记录
2026-08-24 同机 characterization，不是跨机器承诺：

- 既有 `bench:snapshot` 的 100k-entity Snapshot canonical bytes 为 `2,978,988`；三次本地样本的
  single-field p50/p95 约 `176.94/231.55 ms`，cross-owner p50/p95 约
  `186.06/190.19 ms`。这证明大 Snapshot 的整体验证/digest/freeze 已是显著成本，但尚不证明应改
  Save/State 格式。
- 既有 Composition/State 的 1 MiB、16-module 单样本约 `16.65–16.78 ms/command`，200-entry
  authoritative replay 约 20 秒。live transaction runner 对每个 event 扫描全部 module，再扫描全部
  module 找 touched owner，并在 slot 写入中重复复制 parent State；这是可先消除的已知线性工作。
- Template release build 的 entry 为约 `1,151,955 raw / 274,459 gzip bytes`，preload 为约
  `295,904 / 90,842`，全部 JS 约 `1,419,698 / 361,479`；entry 已越过 Vite 的 500 KiB raw
  warning。普通启动图仍混入可延迟/可排除的 GUI 支持能力。
- 一次无落盘的 100k say-line 构造实验中，runtime IR + text entries + authoring Flow graph 的编译约
  `105.8 ms`，text admission 约 `241.0 ms`，GC 后连同输入保留约 `82.9 MiB` heap。当前 starter
  narrative 在 module evaluation 同时构造运行时节点、文本和完整 Flow；若沿用到 100 倍文本，风险
  会直接进入启动路径。
- 当前 project authoring index 按文档族多次递归扫描并完整 parse；四个 Vite list port 会重复重建
  索引。小型仓已见约 `3.7–10.3 ms` p50/p95，放大到 1,000 scenes/50,000 objects 前必须改为一个
  owner、一次 walk、按需读取与单文件失效。

风险分四个数据面处理，不用一个“万能性能框架”混在一起：

| 数据面              | 可以随内容规模增长                               | 不得随静态内容规模增长                                 |
| ------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| 静态内容            | build-time compiler、pack assets、manifest/index | 初始 Player JS、初始已加载 pack、Snapshot/Save payload |
| 运行时 State        | 实际可变事实、cursor、flag、stable ID            | 全文、Scene source、Flow/source metadata、asset bytes  |
| bundle/module graph | 显式选择的产品能力与 lazy chunk                  | 未选择的 Studio/Inspector/Agent/DevDock/preset UI 实现 |
| Authoring/Inspector | metadata index、按需打开的文档、可见窗口         | 每次 list 的全树重扫、全部文档常驻 AST、全部对象 DOM   |

## 2. 不变量与预算

### 2.1 不变量

- `@sillymaker/base` 的 State/Session/Save/replay/command authority 保持平台和场景无关；Scene/Object
  是 authoring/presentation 编译输入，不进入内核对象模型。
- 一个 Session、一个 Snapshot、一个 CommandLog、一个 persistence authority。M1/M2 不增加第二
  State、cache State、增量 Save 权威或异步 command I/O。
- 静态内容以 stable IDs 被 State 引用。Player 的 deterministic command 不 `await` 任意 pack I/O；
  Host 只把已经按 build-known manifest 加载并 admission 的 pack 交给同步 resolver。
- Authoring Scene source 只经一次 bounded JSON parse/schema/value admission，随后信任 normalized
  typed representation。pack bytes 作为 Host 边界输入也只 admission 一次。parser、admission、
  compiler、consumer 不重复 prototype/property descriptor/accessor authenticity 防御。
- Save/digest/replay、CAS、generation/currentness、跨进程 RPC 继续保留真实 exact 边界；不得借性能
  优化削弱它们。反过来，不用 exact source text、完整 DOM/object inventory、命令顺序、机器/进程
  身份证明实现性能或 Inspector 验收。
- private Extension Runtime 保留为 cold-path lifecycle composition；required capability 可以是必选
  composition。外部/companion service（包括 LLM）仍经 typed RPC 接入，不变成 in-process plugin。

### 2.2 Generated Scale Lab

**Scale Lab** 是既有 tests/benchmarks 下若干小型、正交、确定性的 fixture factory 的合称，不是第三个
example、商业内容副本、聚合 generator 或新的长期 runner。大数据只在需要它的测量中写 OS temporary
directory，使用固定公式/stable IDs，不提交 100k 行 fixture，也不读取任何外部实验仓。

- `content-reference/content-scale`：1,000/100,000 text entries；两者使用完全相同的最小 mutable
  State。scale 分成 100 个各 1,000 entries 的 build-known packs，启动只选择第一个 pack；
- `state-16/state-160`：复用 Composition/Snapshot workload，分别测 100 KiB normal State 与 1 MiB
  stress State、触碰 1/16 owners，不与 content profile 比较 Snapshot；
- `index-reference/index-scale`：M0 只生成当前文档合同可表达的 10/1,000 documents，测 cold/list/
  single-file invalidation；M4 冻结 Authoring Scene 后再增加 1,000 scenes/50,000 objects 的 object-scale
  factory；
- `bundle-reference/bundle-scale`：使用同一最小 GUI composition 和首 pack selection，只改变未选择
  content pack 总量；
- 每个 workload 只有自己所需的小型 correctness oracle，例如 stable IDs、pack admission、Snapshot/
  Save round-trip、reducer 结果或 index currentness；不用 wall-clock 猜正确性。

优先扩展既有 `bench:snapshot`、`bench:composition-state`、`bench:player:bundle`、
`bench:gui:startup` 与 authoring-index focused tests。只有现有任务无法报告必要指标时，才增加一个小型
raw measurement adapter；不同数据面不统一 report schema，也不得出现 promotion decision enum、固定
checkout/A-B 编排、机器身份或长期 report coordinator。

### 2.3 持续结构预算（自动验收）

以下是产品结构/字节预算，可在 CI 或 focused tests 稳定断言：

- `content-reference` 与 `content-scale` 在相同 mutable facts 下，Snapshot `state` canonical bytes/node
  count 相同；
  Save 可因 build/simulation identity 不同而有不同 metadata，但不得包含 text、Scene source、Flow、
  asset 或 pack payload。
- `content-scale` 的首次 GUI ready 前只加载 manifest + 第一个 content pack；已加载 text entries 不超过该
  pack admission 后派生的实际 entry count（Scale profile 为 1,000）。100 倍未选择内容不得被
  module evaluation 构造。
- `bundle-scale - bundle-reference` 的 initial transitive Player JavaScript gzip 增量不超过 32 KiB；
  生成内容作为独立 pack assets 计量。M0 记录完整 initial dependency set 的绝对 gzip baseline；M3
  开始实现前由 owner 基于该证据接受持续绝对预算，M3 closure 只证明是否满足，不得事后移动阈值。
  不以拆分 chunk 规避总量。
- Player final-output graph 不含 Flow/source metadata compiler、Inspector/Studio、Agent/RPC、DevDock
  或 preset settings UI implementation；每个 optional positive control 又必须证明其显式选择可达。
- 160-module command 对一个 event 只访问该 event kind 的 ordered subscribers；one-subscriber case
  不得访问 160 reducers。每个 touched owner 每次 commit 至多 materialize/write 一次，最终 aggregate
  validation、whole-Snapshot digest/freeze 与 atomic commit 仍各自保持既有合同次数。
- project index cold build 只有一次 source-tree walk；cached list 为 0 file read/parse；单文件变化只
  re-read/re-admit 该文件。完整文档与 preview payload 只在选择后读取。
- Inspector 的对象/文档列表使用 windowing；mounted row 数随可见窗口 + 固定 overscan 增长，不随
  50,000 objects 线性增长。测试保护“列表仍可搜索/选择/定位”，不认证完整 DOM identity inventory。

### 2.4 Wall-clock 与 heap 趋势（owner review，不进普通 CI）

Wall-clock、heap、RSS 和 GC 对 Deno/V8、机器、温度与浏览器版本敏感。每个里程碑在相同稳定 Deno、
同一机器、同一 workload 上 warmup 后至少五次采样，输出 raw p50/p95 与必要的 Deno/V8/OS/arch、
source revision 和一个 `workingTreeModified` 布尔值到临时 JSON；它不是 clean-tree gate。报告不记录
hostname、路径、机器身份或 diff inventory，也不让 runner 自己做 promotion 裁决。每个里程碑只重测
受影响指标；完整矩阵仅在 M0 与 M5 收口运行。

本轮 owner review 的目标是：

- minimal Template GUI first-interactive p95 `< 250 ms`；
- 160 modules / 100 KiB 的 touched-1 与 touched-16 steady command p95 均 `< 8 ms`；1 MiB stress
  p95 `< 20 ms`；
- Scale Inspector 1,000 scenes/50,000 objects 的 cold index p95 `< 1 s`，cached list p95
  `< 50 ms`，single-file invalidate-to-current p95 `< 100 ms`；
- `content-scale` 首次 ready 的 retained heap 只反映 manifest、首 pack 与当前 runtime plan；
  `object-scale` Inspector 只保留 metadata、当前 Scene 与可见 window。100 个 pack 全部已加载的 heap
  仅作为显式 stress trend，不是正常启动形态。

未达目标时先提交 profiler/counter 证据与真实热点；不得为了让数字变绿引入 State Format V2、ECS、
SQLite/Worker、通用 streaming 或新 cache authority。连续同机可比运行确认回退后才停止相应里程碑。

## 3. M0–M5 实施顺序

### M0 — Scale Lab、现状基线与可执行预算

- 落地上节各自归属既有 benchmark/test 的小型 fixture factories、correctness oracles 与必要 task
  接线；只使用当前 text/State/index/bundle 合同，不在 M4 前预造 Authoring Scene/object schema。
  不提交生成数据或机器结果。
- 记录静态内容 compile/admission/retained heap、Snapshot bytes/traversals、Composition command/
  replay、Player build graph/bytes、GUI readiness、authoring index read/parse counts 的 pre-change baseline。
- correctness oracles 与现有产品 tests 必须保持绿色；当前未满足的结构预算只进入 raw baseline，不提交
  保护旧低效形状或永久红色的 characterization assertion。确认各风险分别来自 module-evaluation
  content、全 module dispatch、bundle reachability 和重复 index scan，而不是 fixture 自身。
- Scale Lab 不复制完整 Engine Lab 状态机/E2E；现有 unit/integration/Browser tests 继续证明 Save、
  replay、R1/R2/R3、CAS、Agent currentness。Scale Lab 只证明规模轴与本计划新增合同。

**M0 验收：** 每个风险都有一条现有或窄增量的文档化命令与正交 fixture；生成目录在 OS temp；没有
聚合 runner/coordinator。若任何一个 adapter 需要千行级 orchestration，停止自动化并改用既有
benchmark + 人工检查表。

**M0 交付记录（2026-08-24）：** 基于 `1ea2332581283b8c74b009744685213e6c47b074`
与明确记录为 modified 的工作树完成同机 pre-change characterization；raw reports 只留在 OS temp，
没有提交生成数据，也没有把机器数字固化为普通测试阈值。四条风险轴仍是各自独立的小型 task：

- content compiler 的 1,000/100,000-entry profiles 保持相同的 60-byte mutable State 与 exact digest。
  compile p50/p95 分别约 `0.754/0.786 ms` 与 `62.455/68.872 ms`，TextCatalog admission 分别约
  `2.938/3.060 ms` 与 `222.239/223.509 ms`；isolated compile + admission retained heap 约从
  `0.8 MiB` 增至 `69.1 MiB`。这确认风险来自当前完整 runtime/Flow/text 图的构造与 admission，
  不是 State fixture 随文本膨胀。
- real Template Player 的 `bundle-reference/bundle-scale` 保持相同 GUI 与首组内容，scale 只增加 99
  个未选择但静态可达的逻辑组。initial transitive JavaScript gzip 从 `366,873 B` 增至
  `923,711 B`，差值 `556,838 B`；它刻画 M1 前的静态 reachability 缺口，不是 build-time benchmark
  或 promotion 裁决。
- Composition/State 的 100 KiB steady command p50/p95 从 16-module 的约
  `1.36/1.43 ms` 增至 160-module 的约 `1.90/1.91 ms`；1 MiB 的四个组合约在
  `15.14–16.04 ms`。因此小 State 已能看见 full-module dispatch，1 MiB stress 则由 whole-State
  工作主导。400→1,200 commits 的隔离 post-GC heap 趋势没有给出持续线性增长证据。既有 100k-node
  Snapshot 重跑的 single-field p50/p95 为 `154.409/156.999 ms`，canonical bytes 仍为
  `2,978,988`。
- authoring index 的 10/1,000-document cold p50/p95 为 `0.939/0.976 ms` 与
  `73.341/74.771 ms`；四个真实 list ports 总计为 `3.781/4.502 ms` 与
  `293.195/303.875 ms`；单 Scene 变化到当前 list 可见为 `1.015/1.064 ms` 与
  `72.864/73.358 ms`。当前 `4/16/4` 次 walk 与 `N/4N/N` 次 read/admission 只标记为
  `structural_pre_change_baseline`，M2 必须用真实单 owner counters 替代，测试不保护旧结构。
- minimal Template GUI 的五次 first-interactive p95 约 `127.02 ms`；现有 bundle、Snapshot、Save/
  replay correctness 与 focused index/content tests 继续各自承担合同证明。M0 没有复制 Browser 状态机、
  引入 aggregate report schema，或提前实现 M1 content packs、M2 direct plan/index cache。
- 复杂度规模（含计划、文档与测试）为 `+1,912/-225 LOC`；新增单数据面 runner 最大为 content
  `407 LOC`、authoring index `340 LOC`、bundle `313 LOC`，helper 与 tests 独立。保留这些代码是为了
  M1/M2/M5 可复测的四个正交规模轴；没有 aggregate runner、promotion logic、进程管理或新测试 DSL。

这些结果确认了 module-evaluation content、静态 bundle reachability、full-module dispatch 与重复 index
scan 四个独立来源。M1 因而按原排序先拆静态内容面；M0 的 State/index 数据留作 M2 同机趋势基线。
收口验证为 focused content/bundle/index/State tests、canonical `deno task check` 与 `deno task docs:build`；
本切片没有修改 React/TSX 产品代码，因此不触发 React Doctor advisory audit。

### M1 — 静态内容平面与初始 bundle

- 将当前“同一 module evaluation 同时构造 runtime control IR、全部 text entries、完整 Flow/source
  graph”的路径拆成三个输出：Player control plan、只读 text/content packs、Inspector-only authoring
  metadata/source map。普通 Player graph 不可到达后者。
- 只实现本轮有证据的 text/content pack compiler/manifest，不在 M4 前冻结 Scene/object pack，也不激活
  通用 Content DB/ORM、任意 JSON/YAML/CSV importer、patch distribution 或远程 streaming。pack 使用
  build-known IDs/URLs；manifest 只表达 build-known logical topology，不把与 payload 同处、可一起编辑的
  byte receipt 伪装成来源或反修改证明，也不新建签名/provenance 系统。
- 每个 Session 固定一个不可变 manifest revision/digest；一个 pack ID 在该 Session 生命周期内只对应
  一份 admitted bytes。Host 在启动/interaction 边界显式加载并一次 admission pack，必需 pack ready 后
  才允许 dispatch 会引用它的 authoritative command；Session 只接收同步、已 admitted resolver。
  missing/corrupt/unloaded ID 在 command 前稳定失败且 State/Stage 不变；Save/load/replay 通过既有
  build/simulation/content identity 重新取得同一 manifest，不把 arbitrary fetch/Promise 带进 command。
- Scale Lab 证明 100 packs 的初始 Snapshot、initial JS 与 loaded entry 数满足 §2.3；existing story 的
  visible text、Save/load/replay 与 narrative prediction 保持行为等价。

**M1 验收：** 100 倍 text 不线性进入 initial JS/heap/Snapshot；首 pack 可真实解析、显示、切换到第二
pack；ordinary Player final-output receipt 的负面对照通过；corrupt/missing pack 原子失败。

**M1 交付记录（2026-08-24）：** 以 base HEAD
`eb718bcaa6683785634cbfd6efb9ce637efafbd1` 上明确记录为 modified 的最终工作树完成同机复测；
raw reports 仍只作 owner-review evidence，不进入仓库。

- `@sillymaker/base` 新增了只读 `TextContentManifestV1`/pack/session 合同。经 M1 corrective
  收口后，manifest descriptor 只包含 build-known `packId`/`runtimePath`，revision 与按 `packId`
  排序的 logical-topology vector 共同形成 digest。pack wire 严格为
  `sillymaker.text-content-pack` V1 的 `format + version + packId + textCatalogs`；Host bytes 在边界只做一次
  bounded Strict JSON 与 schema/字段/值域 admission，entry count 从 admitted catalogs 派生。
  `byteLength`、`sha256` 和声明式 `entryCount` receipt 及其拟议 generator/currentness workflow 均删除：
  它们不能证明可编辑 payload 的发布者或反修改属性，反而会阻碍直接汉化和本地内容修改。Session 固定一个 immutable
  manifest，对同 pack single-flight，失败后可显式重试，并对已 admitted 的文本提供同步
  locale-fallback resolver；内部 consumer 不重复 admission。
- `@sillymaker/web` 在真实 application start 中对比 resolved presentation 与 application 声明的
  manifest identity，从当前 GUI origin 的 app-root-relative `assets/**` 路径加载。单一
  Web composition readiness binding 依 Story 的 `initialPackIds`、`requiredPackIdsForInvocation`
  与 `requiredPackIdsForSnapshot` 按需准备 packs。semantic invocation 在 Story parse/admission 后、
  command 构造/dispatch 前按调用顺序准备；validated persistence load/import candidate 在 bind/commit 前准备；
  R2 candidate 在 takeover/install 前准备。DevDock State tuner 只在 `debug_tools + cheats` 当前启用后、
  patch 前保守准备全 manifest，execute 仍重检 capability。已验证的候选替换在
  content 失败时原子保留旧 State；missing/corrupt/unloaded 不把 Promise/fetch 带入 authoritative
  command，也不改 State/Stage。该接线复用既有 semantic/Persistence/R2/debug authorities，没有新 facade
  或 raw Base State 耦合。
- Template 是第一个真实 consumer：小量常驻 UI/bootstrap copy 保留在 presentation，开场与结尾
  dialogue 分别位于两个 `assets/content/*.text-pack.json`。实际 Story control plan 只保留 stable
  text IDs，不再常驻 dialogue copy；完整 Flow/source projection 与 authoring copy 移入
  `src/tooling/**`，ordinary Player final graph 不可达。这是 runtime/authoring 责任分离，不是第二套
  narrative compiler。
- manifest 是 resolved presentation identity 的一部分，但该 identity 只覆盖 revision 与 sorted
  `packId`/`runtimePath` topology。增删/改 manifest topology 会改变 presentation digest；在同一 logical
  location 直接修改被动文本 payload 不改变该 digest，也不凭空产生 Save compatibility warning。若同时修改
  presentation source，story digest 仍可因既有 source identity 改变。pack payload、Flow/source graph 和
  loaded-pack cache 都不进入 Snapshot/Save，没有新 Save field 或 migration framework。一个已加载 pack 在
  当前 immutable session 内不热替换；开发者或玩家 refresh/restart 后读取新 bytes。
- `deno task check:assets` 现在会解析每个启用 runtime-asset verification 的 Story，除既有
  asset manifest 外，还用同一 Base session 从该 application root 读取并 bounded-admit 所有声明的
  text packs，验证 wire/schema、logical pack identity、catalog topology/IDs 与跨 pack 冲突，不要求
  payload 与可共同编辑的 length/hash/count receipt 同步。实际 Template release build 保留两个独立 pack assets；build receipt 同时证明
  Player 排除 tooling Flow/source，Author graph 仍可显式到达它。
- 同机五样本 Scale Lab 保持 1/100 packs、1,000/100,000 declared entries 的相同两节点
  control plan 与相同 60-byte State/digest。manifest build p50/p95 为
  `0.505/1.970 ms` 与 `35.872/37.205 ms`；两者只加载首个 1,000-entry pack，首 pack
  admission p50/p95 为 `7.679/8.303 ms` 与 `7.227/7.903 ms`，session retained-heap
  delta 为 `186,864 B` 与 `212,264 B`。这些数字是 corrective slice 前、包含旧 receipt 字段的原始
  M1 checkpoint；继续作为静态 payload 已分离的历史证据，不伪装成新 descriptor shape 的重测值。
  全部未选内容只体现在 compact manifest 和独立 pack assets，不在已加载 text index 中。
- 真实 Vite/Template GUI 的 bundle profiles 将 initial transitive JavaScript gzip 从
  `361,312 B` 增至 `366,431 B`，100 倍内容的增量仅 `5,119 B`，低于 `32 KiB`
  结构预算；独立 content-pack assets gzip 从 `5,850 B` 增至 `585,737 B`。这与 M0
  的 `+556,838 B` initial-JS 缺口相比，证明静态 payload 已移出初始 module graph，
  没有用另一个 JavaScript chunk 隐藏总量。
- M1 corrective 在同一 base HEAD 的 modified worktree 上重新跑两组五样本 compile profiles：
  logical manifest build 的 1/100-pack p50/p95 为 `0.348/0.363 ms` 与
  `0.899/0.934 ms`，首个 1,000-entry pack admission 为 `7.797/9.107 ms` 与
  `7.884/8.954 ms`；两者仍只有一个 loaded pack 和 1,000 个 loaded entries，State 均为
  60 bytes/同一 digest。一次 retained-session trend 为 `217,760 B` 与 `747,328 B`，只作
  non-portable owner review，不建立 heap promotion threshold。重跑真实 bundle profiles 后，1/100-pack
  initial JavaScript 为 `1,421,028/361,006 B` 与 `1,428,354/361,664 B`（raw/gzip），增量缩至
  `7,326 B raw / 658 B gzip`；独立 pack assets 仍为 `1/100` 个、`102,186/10,218,600 B raw`
  与 `5,850/585,737 B gzip`。因此删除 receipt 没有削弱 M1 裁决，并移除了原 benchmark 为未选择
  packs 预构造 payload/hash 的伪工作。retained-heap 单点结果不具备可重复比较性，不参与该裁决。

收口验证包括 Base/Web/Template focused tests、`deno task check:assets`、Template release
build/final-output receipt、Template Chromium/WebKit 实际从首 pack 进入第二 pack 的可观察路径，
以及两组 `bench:content:compile`/`bench:content:bundle` profiles。本里程未添加 Content
DB/ORM、remote streaming、Worker/SQLite、第二 State/cache authority、异步 command I/O、签名或
provenance 系统。i18n/message-catalog 与 pack unload 继续 defer 到 M0–M5 全部完成后的独立实证评估；
可能由后续作品重写触发，但不插入当前既定顺序。

统一 readiness 边界的实际 focused 复验命令为：

```sh
deno task typecheck
deno task test:unit engine/packages/base/src/runtime/application/core-game-application.test.ts template/src/test/text-content-runtime.test.ts
deno run -A npm:@playwright/test/playwright test --config examples/e2e/playwright.examples.config.ts --project=chromium examples/e2e/template.spec.ts --grep "Template (uses|automation dispatch)"
deno run -A npm:@playwright/test/playwright test --config examples/e2e/playwright.examples.config.ts --project=webkit examples/e2e/template.spec.ts --grep "Template (uses|automation dispatch)"
```

结果为 typecheck 通过，focused unit `2 files / 122 tests`，Chromium/WebKit 各 `2 passed`；
targeted format/lint 也在修正一处 `no-shadow` 后重跑通过。

### M2 — State hot plan 与增量 project index

**M2.1 State hot plan**

- 在 Composition/Simulation cold compile 阶段生成 `event kind -> ordered reducers` direct plan；hot
  transaction 不动态遍历全部 modules/registries。顺序、每 owner 每 transaction 的 proposal 纪律、
  rejection/fault whole-attempt atomicity不变。
- 对一个 command 收集 touched slot results，完成各 touched owner 一次 schema/value validation 后，
  一次 materialize parent State；保留真正的 aggregate invariant/reference validation、一个 authoritative
  Snapshot digest/freeze、CommandLog continuity 和 replay。不因 locality 跳过跨 owner invariant。

**M2.2 Incremental project index**

- project authoring index 改为一个 project/dev-server owner：一次 walk 得到 metadata，按 `(path,
  digest/revision)` 缓存 parse/admission，list ports 共享 snapshot，单文件 watcher 只失效对应 record；
  Inspector 打开时才读取完整 document/preview。
- 给 reducer visits、slot materializations、walk/read/parse/invalidation 加 package-internal deterministic
  counters；它们只服务长期预算，不扩大公共 API，也不围绕 GC/object allocation 搭建证明框架。

M2.1 与 M2.2 独立复核，不以其中一项的 wall-clock trend 阻塞另一项的正确性提交。

**M2 验收：** §2.3 的 dispatch/index 结构预算全绿；100 KiB/1 MiB raw trends 完成；相同生成命令的
decoded authoritative State、Snapshot state digest、CommandLog、replay、rejection/fault 与 pre-change
oracle 等价。build/simulation metadata 的预期变化不伪装成 Save byte-equivalence；Save round-trip 仍须
恢复同一权威结果。

### M3 — 核心与外圈 GUI 能力重组

- 先用 import graph/exports/final-output receipt 列出并收口三层，而不是先创建大量新 packages：
  1. 平台无关 kernel：State、Session、command、Save/replay、generic semantic contracts；
  2. GUI/game 必需层：presentation/stage、input/focus、assets 与 Browser/Desktop Host ports；
  3. 外圈能力：DevDock、Inspector/authoring shell、preset settings UI、Agent/RPC adapter。
- 依赖只从外圈指向 GUI/game 与 kernel。kernel 不 import React/DOM/DevDock/Inspector/settings UI/Agent；
  GUI/game core 不反向 import 外圈。仅当 final graph 与 ownership 需要时拆 package；能用 focused
  subpath/export 解决时不做 package churn。
- DevDock 与 preset settings UI 成为可独立 import 的参考实现。产品可以直接组合、包装或复制后深度
  定制；通用 profile/settings contract 可留在 Host/core，具体 React 面板不留在核心 umbrella export。
- 将 Template 分成 minimal 与 explicit reference/full composition。minimal initial graph 只含必要
  GUI/game runtime；Inspector、DevDock、Agent 与 preset settings UI 由显式 optional/lazy entry 选择。
- 继续使用 SillyMaker-owned private Direct Extension Runtime 做 cold lifecycle composition，或由产品
  static direct-mount required domain；不恢复 Cordis，不把每个函数碎成 plugin，不建立 public Mod ABI、
  resolver、marketplace 或 distribution。required product capability 不因“可组合”变成可有可无。
- 删除被新边界明确替代的旧 re-export、wrapper、专属 tests/docs；不留 compatibility alias 或双轨。
  不因仓内消费者少而删除已接受、正交且可维护的 independent engine contract。

**M3 验收：** 复用现有 final-output receipt，对 minimal/full/Inspector/Agent 的实际 entries 增加必要
semantic facets 与正负 reachability；不创建四个合成应用或新 matrix coordinator。minimal 满足 M0
据实接受的 initial transitive gzip 预算，选择外圈能力后功能可达；无 import cycle、无第二 lifecycle/
State authority。

### M4 — Scene/Object/Layer 渐进模型

- 交付一个新的
  `Authoring Scene source -> admitted/normalized Authoring Scene IR -> deterministic compile`
  阶梯；一次 admission 后只消费 typed IR。字段名与 source format version 由本里程碑冻结，但它只是
  本轮可演进的第一阶，不宣称最终 Blueprint 或通用 scene graph。
- Authoring Scene IR 明确：
  - 唯一、显式、有序的 layers（stable `layerId`），每个 layer 自己拥有 ordered roots；
  - stable `objectId`、roots/children hierarchy 与 integer/permille local transform；整个 subtree 继承
    所属 layer，第一阶禁止 child 跨 layer；
  - group 可有 transform/children 但不生成 Stage entry；可渲染 object 第一阶最多一个 Visual；
  - Visual 对现有 content/appearance/geometry/catalog 的引用，不复制 renderer/asset authority；
  - hit region、motion、Timeline、interaction binding 与 source span 的可追踪 facets；无法证明的
    binding 显示为 external/unresolved，不猜测；
  - Inspector provenance（source pointer、compiled object/layer/intent/motion IDs）。
- sibling array order 是 paint authority；compiler 按每层 depth-first preorder 展平、用稳定整数舍入
  parent transform、派生 dense z-order，并把 `objectId` 映射到现有 runtime tag。一个 subtree 在 layer
  内保持连续，排序不依赖 import/DOM/CSS stacking accident。Inspector 只修改 authoring document 与
  detached preview；保存后的正常 module-update/publication successor 必须通过 authoritative
  `setZOrder` 或等价 reconcile 把 reorder 带入产品 Stage，Inspector 不直接取得活动 GameSession writer。
- compiler 输出现有低层 `SceneDocumentV1`/runtime scene plan、ordered layer IDs、现有 motion/Timeline/
  hit-region/input binding indexes、object-to-Timeline target mapping、inspection projection 与 source
  map；外部 Timeline 定义仍由其既有 owner 提供。不新增 runtime Scene State authority，也不把
  authoring IR 放进 Snapshot。`SceneDocumentV1` 继续作为低层 IR/Advanced 手写入口，
  但 Story binding 必须显式声明 `authoring_scene` 或 `low_level_scene`，同一个 scene 只能选择一个 source
  authority；不按文件/import graph 猜测，也不建 wrapper、alias、双向同步或双写。
- object 可在画布外、透明或 runtime 当前未实例化，仍须在 Inspector tree/overlay 可选择；runtime
  culling/opacity 与 authoring force-visible ghost 分离。
- 并行动画/操作复用现有 Timeline/motion channel、Session serialization、monitor/input contracts：
  disjoint object/channel 可并行，既有同 target/channel conflict 必须显式显示并可测。不创建第二 clock、
  通用 scheduler 或 Blueprint VM。
- 本轮只把 stage hit region、GUI control、motion、Timeline 与 intent 投影到 object-level inspection；
  “stage hotspot 与 GUI button 共用新的 typed InteractionTarget 可写组件”保持 evidence-gated，不把 DOM
  button 伪装成 stage polygon。
- paint order 固定为 layer order + 每层 depth-first preorder；pointer pick order 由 compiler 独立生成
  topmost-first region sequence，可以从 paint order 派生但不得依赖 DOM 偶然顺序；focus order 继续由
  现有 input/focus 合同拥有，不从 z-order 推导。

**M4 验收：** 此时新增 object-scale factory，覆盖 1,000 scenes/50,000 objects；layer/sibling order 在 import 扰动下仍按
合同稳定；nested transform lowering 字节稳定；场外/透明对象与全部 interaction shapes 可被 Inspector
projection 定位；disjoint parallel channels 同时可见且既有冲突拒绝诚实；compiled runtime 与现有
Stage/Save/replay 结果等价。

### M5 — Inspector 替代 Studio 与收口

- 交付一个 dev-only Inspector，复用同一个 Authoring Host、document session、structured operations、
  CAS/undo/redo 与 M2 project index，不创建第二 editor runtime。最小工作流：应用/Scene 搜索 ->
  layer/object hierarchy -> 真实 stage preview + selection overlay -> Transform/Visual/Appearance/Render
  Order 检视与有限编辑 -> hit region/motion/Timeline/interaction 只读 facets -> source provenance。
- tree/list/window 使用 virtualization；preview 只 materialize 当前 Scene，支持 pan/zoom/overscan，
  overlay 与 force-visible ghost 独立于 runtime visibility/culling，所以场外动画起点、透明对象与不可见
  触摸区都能选择、检视和 scrub；scrub 不修改 State。错误以结构化 diagnostics 展示，不扫描源码猜测
  实现。
- 有限编辑必须与非 UI tooling/Agent 复用同一 document identity、draft revision、operation admission、
  CAS、history 与 compiler diagnostics。不得直接改 React/runtime object；不得为 Inspector 另建 command
  DSL。selection/navigation 仍是 Host session-local transient state，不进入 document CAS/history。
- 本轮不提供 HitShape/Interaction 可写 component、Flow 编辑、Blueprint、完整 timeline/curve editor、
  code editor 或 Agent 生成 UI。
- Inspector 覆盖本节所列最小工作流并保持 retained substrate continuity 后，即达到本计划所称的
  **M5 accepted replacement surface**；它不要求旧五 workspace 的 feature parity。达到该表面后，删除/
  退出旧 Studio React workspaces、route、bundle 与只保护旧 UI 的
  tests/docs；默认开发入口只呈现 Inspector，不双轨维护。保留的 Authoring Host/document session/
  index/operations 每项必须对应已接受的独立合同或可达 consumer。
- 用 Scale Lab 和一个现有中立 Story 做 Browser Chromium/WebKit 行为验收；普通 Player build 继续
  排除 Inspector/source IO。更新 architecture、features、development、roadmap/sequence 与相关
  authoring docs；不把本计划交付记录塞进新的长篇治理文档。

**M5 验收：** 50,000 objects 下搜索、选择、有限编辑、保存/CAS、定位、shape overlay、parallel
channel scrub、intent/provenance 可用并满足 §2 预算；Studio UI 无 live route/build reachability/专属
测试残留；普通 Player 无 Inspector/source write；所有 retained authoring primitives 都有合同级测试或
真实 consumer。

## 4. 每个里程碑的验证纪律

- 先跑 changed package 的 focused unit/integration tests，再跑 Scale Lab 对应 profile；涉及 Save/replay/
  State 时必须同时跑现有 Snapshot、Composition/State correctness 与 authoritative replay tests。
- bundle/module graph 变化跑 `deno task bench:player:bundle`；GUI readiness 跑
  `deno task bench:gui:startup`；wall-clock 报告按 §2.4 只做 owner trend review。
- Scene/Inspector/React 变化跑受影响的 Chromium + WebKit Browser E2E；不得用完整 DOM sentinel 代替
  用户可观察行为。最终运行 `deno task check` 和 `deno task docs:build`。
- 每个修改 React/TSX 的 slice 记录 exact slice-start ref，并运行
  `deno task audit:react --base <slice-start-ref>`。React Doctor 是 advisory：confirmed defect 修复并加
  focused test；rejected/needs-evidence 记录判断，不追分数或机械重写 deliberate lifecycle code。
- 每个里程碑报告删除/新增 LOC、bundle/pack/Snapshot/index counters、raw trends、保留复杂度及其真实
  consumer/contract；不得以“测试更多”掩盖新框架膨胀。

## 5. 必须现在做与 evidence-gated follow-up

本轮必须完成：静态 text/Scene pack 分离、首 pack progressive load、Player/authoring graph 分离、
reducer direct plan + batched touched writes、single-owner incremental project index、核心/外圈依赖重组、
Authoring Scene IR/compiler、Inspector-first 产品面与 Studio UI clean break。

只有 M0–M5 的可比 measurement 仍失败或新的真实 consumer 到达时才讨论：

- State/Save Format V2、changed-set/root digest、persistent data structure、ECS；
- SQLite/Worker project index、secondary/full-text content indexes、通用 streaming/cache service；
- advanced renderer/culling system、通用 scene graph、arbitrary component/Blueprint VM；
- HitShape/Interaction 可写 object component、final in-app editor、Scene Timing Sheet、Flow/gameplay data
  editor、code editor 或 coding Agent product；
- public Mod ABI/resolver/distribution、第三方不可信 Mod sandbox、Effect Broker；
- Deno Desktop HMR activation、Desktop persistence promotion 或 Electron Host。

## 6. 外部实验边界

- 外部商业克隆/作品可以继续基于当前 main 并行补齐；本计划不得 import、copy、scan 或在 tests/selector/
  benchmark 中引用其源码、资产、成人内容、仓库路径或内部命名。
- 外部项目只提供匿名的问题类别：内容规模、工程局部性、layer ordering、不可见 interaction shape、
  场外 motion preview 与 parallel channels。Scale Lab 用原创生成数据复现这些类别。
- M5 后的下一轮外部重写应只消费届时推荐的 public/authoring contracts，并作为独立 baseline comparison
  回报缺口。工程上的遗留缺陷可以进入下一轮证据，不要求本计划为单个作品一次解决全部问题。
- 将成人内容从游戏本体分离是后续 Mod/composition 实验；届时必须区分 Story 暴露的 extension points
  与引擎 lifecycle/pack support。本计划不借该目标提前激活 public Mod system。

## 7. 明确不做

- 不做 Unity/Godot/VS Code 替代、通用无代码开发、最终 Blueprint、IDE 或 editor window manager；
- 不把所有引擎能力插件化，不恢复 Cordis，不引入 Node/Electron Host；
- 不把 static content、Authoring Scene IR、Flow/source graph、Inspector selection/cache 放进 Snapshot/Save；
- 不复制第二套 State/command/replay、presentation reconciler、input router、authoring Host 或 source-write
  authority；
- 不创建 benchmark framework、test DSL、admission framework、object-authenticity framework、自动
  promotion decision 或 durable evidence coordinator；
- 不用 source-file LOC 上限当架构测试；通过单一 owner、明确 exports、可替换 outer module、final graph
  exclusion 和可维护的 focused files 解决工程化问题。

## 8. Stop conditions

仅在以下真实合同冲突出现时暂停并交还所有者：

- pack progressive load 要求 deterministic command 等待 Host/network I/O，或同一 content ID 在一次
  Session 中可能解析成不同 admitted bytes；
- State hot-plan 无法保持 reducer order、cross-owner invariant、atomic rejection/fault、authoritative
  State/digest/replay 语义等价，或 Save byte 差异超出预期的 build/simulation identity metadata；
- Authoring Scene source 必须新增第二 runtime Scene/Stage authority，或同一 scene 无法保持单一 source
  authority；
- 核心/外圈重组要求改变 public wire/Save compatibility、跨包 authority 或真实外部 service RPC 边界；
- Inspector 为实现本轮 bounded inspection/editing 工作流仍需要全量 50,000-object DOM/AST 常驻，且
  简单 index/windowing 无法满足
  可比 trend；
- repeated same-machine evidence 在 M1/M2 的最小修复后仍超过 §2.4 目标，此时先提交 profiler 结果并
  单独裁决更深的 State/index/render 方案。

未命中这些条件时，private helper 名称、package/subpath 放置、测试拆分和同等安全实现均采用最简单
可验证方案继续；不得以追求最终形态、未知未来 Mod/编辑器或极端边界为由扩张本轮。
