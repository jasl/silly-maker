# Scalable Authoring, Addressable Runtime, and Mods V1 实施计划

状态：**2026-08-25 经所有者接受并开启；M0–M5 已交付并关闭。**

[Production-floor sequence](2026-07-30-production-floor-sequence.md) 是唯一跨计划排序入口。本计划接在
已关闭的
[Scale / Scene Object / Modular GUI V1](2026-08-24-scale-scene-object-modular-gui.md) 之后；目标合同由
[Scalable Authoring, Addressable Runtime, and Mods V1](../proposals/scalable-authoring-addressable-runtime-and-mods.md)
拥有。

Deno Desktop adapter 保持 package-private、explicit、default-off；首个包含目标语义的 stable 仍须
独立复验后才能启用 maintained Desktop workflow。本计划全部 Browser-first / Host-neutral 工作不等待它。

## 1. 基线与执行纪律

立项基线：`e928abd09ea496406a3b43f310c1223d741cb113`。开始时 branch
`codex/promote-composition-state-runtime` 相对 origin ahead 9，工作树 clean。

本轮面向百万词文本、百倍 Scene 数量和 React/Web GUI，但不提交巨型 fixture，也不为一次里程碑建立
新的 benchmark framework、loader framework、test DSL 或 evidence coordinator。

- 构造数据在测试/benchmark 时生成；输出原始 measurement，不做机器绑定 promotion verdict；
- 外部商业克隆、后续作品重写与 SillyOS 只作本轮关闭后的评价，不成为源码、fixture、命名或验收依赖；
- 同 realm 的产品选择代码可信；只记录 cleanup/authority/fault best practices，不建立副作用防御系统；
- public/source input admission 一次，compiler 产出 direct plans，hot path 不重复 schema/registry/lifecycle
  lookup；
- 每个 React/TSX slice 记录 exact base，收口运行 React Doctor advisory；
- 每个里程碑先 focused tests，再跑受影响 Browser E2E、bench profile 和 canonical `deno task check`；
- 被替代实现、导出、测试和 live docs 同轮删除，不保留 compatibility wrapper。

M0 前先修正唯一排序文档中“上一轮 M5 仍在 stash”的过时记录，并将本计划登记为 current。文档修订与
M0 实现同一工作轮交付，不形成第二套排序。

## 2. M0–M5 顺序

### M0 — Capacity Contract Reset

目标：让 Scene/GUI 内容容量由真实输入资源预算和测量决定，不由早期示例的魔数决定。

删除以下 count-only 产品语义上限及专属错误/导出/测试：

- low-level Scene：64 entries、128 cues；
- Authoring Scene：256 layers、64 visuals、128 cues、每类 256 bindings/interactions/guiControls；
- render target：每 entry 64 hit regions 与 64 frame assets；
- Region document：64 regions；
- presentation cue dispatch：32 entries 与公开 `stageCueDispatchLimitV1`；
- Chrome layout：boxes/anchors/offsets 合计 256 entries。

保留并明确为资源/算法边界：

- Authoring Scene source 的 64 MiB、depth 160、array items 100k、object members 128、nodes 4m、
  string 4096；
- direct-object/递归 traversal 的 total objects 100k 与 object depth 64；
- polygon 3..64 vertices、Motion 32 keyframes 与 Timeline depth/repeat/step/event budgets；
- dev HTTP bytes、Save/wire/RPC/input payload、ID/value/uniqueness/reference、CAS/generation/currentness。

实现同时把 low-level Scene open/reconcile 中反复的 layer/tag `includes/find` 改为函数内一次构建的
Map/Set，使多 layer/entry cold plan 保持线性；不增加长期 cache 或新 runtime owner。

行为验收使用约 300 entries/layers/regions/layout rows、约 600 cues 和约 96 frames/dispatches 等越过
旧阈值的生成数据。这些数量只是 regression samples，不是新上限。证明最后一项可索引/dispatch，
非法成员、重复 ID、unknown reference、polygon/resource bounds 仍按原合同失败。

验证：六个受影响 Base contract/authoring test files、Base typecheck、existing Scene compile/Stage
reducer tests；记录 300/1k/5k open/reconcile/projection raw trends，但不设门槛。

#### M0 闭合记录（2026-08-25）

- 删除上述 count-only checks、专属错误、`stageCueDispatchLimitV1` 导出与仅保护旧上限的测试；
  生成式回归分别跨过旧阈值，并保护最后一个成员没有被截断。
- 保留 Strict JSON/source、direct-object recursion、polygon/Motion/Timeline、ID/reference 与
  Save/wire/RPC/CAS/generation 等真实边界；新增 depth 65 回归锁定 direct-object depth 资源预算。
- Scene open/reconcile 每次冷计划只建立 layer map，并为真正访问的 layer 惰性建立 tag map；
  不扫描无关 layer entries，不增加长期 cache/owner。Package-owned admitted Scene 直接构造
  typed mutations，删除对自己刚生成对象的逐条二次 admission；外部 raw mutation 入口仍严格。
- 同一次 Deno 2.9.5 stable / V8 15.0.245.2 / arm64 macOS 进程的 12 次一次性样本如下（ms）。
  数值只是 raw trend，不是机器身份、发布门槛或宏观结论：

  | entries | open plan p50/p95 | typed apply p50/p95 | no-op reconcile p50/p95 | projection p50/p95 |
  | ------: | ----------------: | ------------------: | ----------------------: | -----------------: |
  |     300 |       0.038/0.086 |         0.064/0.107 |             0.038/0.051 |        0.061/0.088 |
  |   1,000 |       0.041/0.095 |         0.071/0.113 |             0.094/0.117 |        0.093/0.160 |
  |   5,000 |       0.214/0.283 |         0.349/0.466 |             0.255/0.353 |        0.232/0.364 |

  在相同一次性脚本中，5,000-entry open plan 在删除重复 mutation admission 前 p50 约
  21.531 ms，删除后约 0.214 ms。这证明的是该次重复工作已消失，不是对所有作品的性能承诺。
- focused 6 files / 86 tests、`deno task typecheck`、residual scan 和 `git diff --check` 通过；
  `deno task check` 通过（363 test files / 5,294 tests，Story checks 与 Engine Lab release build 均通过）。

### M1 — GUI composition 与 Code Surface

目标：冻结一条与 spatial Scene 正交、可由人类/Agent 编辑、同时原生接入 React/CSS 的最小格式和 runtime
seam。

Base：

- 新增 `sillymaker.gui-composition` V1：`compositionId`、stable `nodeId`、build-known `viewId`、
  Strict JSON props、parent-specific named slots；
- source bytes 一次 bounded strict JSON admission；generic schema 只检查 document/node/ID/slot tree，
  不读 React catalog；
- 无固定 node/child/slot count 上限，保留 bytes/depth/node-work 资源预算；
- GUI composition 与 props 是静态 presentation content，不进入 Snapshot/Save/digest；source location
  等待 M2 owning loader 产生真实位置，不在 M1 发明独立格式。

UI：

- `CodeSurfaceDefinitionV1` 声明 stable `viewId`、literal loader、一次 props admission、slot IDs、
  authoring descriptor 与 input/native/portal policy；
- compile 时完成 duplicate/unknown view、unknown parent slot 与 props validation，输出 direct
  definitions；render 时不查 registry；
- 每 node 只用一个薄 `Suspense + ErrorBoundary`，child fault 不卸载 parent/sibling；React effect cleanup
  是普通生命周期，不增加 listener/Abort/Shadow DOM/Proxy sandbox；
- parent view 用自己的 CSS Module 管理 slots，child 管理内部 DOM/CSS，主题只经现有 tokens；格式不含
  className/CSS property map/style text；
- 实施前已确认 eager `UiContributionRegistryV1` 只有自身测试；旧 registry、导出和测试同轮删除，
  不保留双轨。

验收只用 Engine Lab 的 query-gated 小型本地 Code Surface：parent local toggle 首次打开才加载 child；
typed action 到达既有 semantic port；IME/native input 不泄漏到 gameplay；child render fault 局部；删除/
替换 node 正常 cleanup；同 `(nodeId, viewId)` 更新保留 local state。不要引入第三方富文本组件、fake
Agent conversation 或 SillyOS。

#### M1 闭合记录（2026-08-25）

- Base 新增 `sillymaker.gui-composition` V1：stable composition/node/view ID、Strict JSON props 与
  parent-specific named slots。source bytes 只经过 bounded Strict JSON parser 与一次 schema admission；
  product-owned direct object 做一次普通数据规范化。保留 depth/document-work/JSON bytes/nodes 等真实资源
  预算，不恢复 child/node count capacity cap，也不检查 prototype/descriptor authenticity。
- focused `@sillymaker/ui/code-surface` entry 提供 build-known literal loader definition、一次 props
  admission、static catalog 与 cold compiler。compile 拒绝 duplicate definition、unknown view/parent slot
  和 invalid props；direct render plan 不再查 catalog 或 schema。`@sillymaker/ui` root 不重导该能力，
  未选择的普通 Player 可以结构性排除它。
- 最小 authoring descriptor 只公开 label、可呈现 prop 的 `propId/label/valueKind`、`opaque/slots`
  outer placeholder mode 与 state-owner hint；它不是第二 props schema，也不决定最终 Inspector 控件。
  input/native/portal policy 是应用组件与未来 Host/Inspector 的协作声明，不是 same-realm sandbox 或强制
  隔离。真实 source location 等待 M2 loader/M3 Inspector 消费者，不在本轮制造 source-map framework。
- 每个 node 使用一个薄的 React lazy/Suspense/Error Boundary；child 首次由 parent 真实 render 对应 slot
  时才加载，render/lifecycle fault 只替换该 child，stable `(nodeId, viewId)` 保留 local state，改变
  `viewId` 触发普通 cleanup。event handler、任意 async callback、DOM/network/global listener 和主线程工作
  仍是可信应用代码责任。
- Engine Lab 只增加 exact-query `?code_surface_conformance=1` 的小型本地 composition；默认和近似 query
  均不激活。Chromium/WebKit 共 6 个行为用例证明 lazy child、native textarea 不触发 Player shortcut、
  typed semantic action 更新 authoritative gameplay 且 React local draft 保留。fault、cleanup 与 identity
  留在 focused UI tests，不建立 DOM inventory。
- 已删除旧 `UiContributionRegistryV1` 实现、types、专属测试与根导出（370 行）以及最后一个只保护旧
  `UiRendererBindingV1` 的 Base 负向 type sentinel；DevDock/Narrative/WholeCanvas 等不同合同未误删。
- focused 3 files / 17 tests、typecheck、lint/stylelint、`deno task check` 通过（364 test files /
  5,285 tests，Story checks 与 Engine Lab release build）；Code Surface Chromium/WebKit 6/6 通过。
  React Doctor 使用已核实立项基线 `e928abd09ea496406a3b43f310c1223d741cb113` 扫描 30 个 changed
  files，零 advisory。最初记录的完整 SHA 后缀错误已就地纠正，没有建立额外 provenance 系统。

### M2 — Addressable Scene / Narrative / GUI / Code / Content

目标：把启动和当前工作集从全项目规模中分离。

- 为 Scene runtime plan、Narrative chapter/segment、GUI composition、Code Surface 与 text/assets 建立
  type-specific manifest/loader；只共享 stable logical ID、generation、readiness 与 acquire/release
  结果，不建立万能 loader object；
- Scene/Narrative cross-unit references 在 build/check 建闭包；当前 command 前由 Host 准备 unit，
  authoritative command 本身不等待 network/file I/O；
- concurrent acquire single-flight；retry 和 generation fencing 保证 failed/stale candidate 不替换
  current predecessor；
- activate 后 consumer 持有 direct plan；release 清理 parsed indexes、subscriptions、instances 和显式
  resources，但不承诺浏览器物理卸载 ESM/CSS cache；
- initial Player graph 只包含 bootstrap/current opening units；unselected chapters/views/CSS 不进入 initial
  JS/chunks；
- 若新的 owner 完整替代 grow-only text session，旧 path 与 tests 同轮删除，不加 alias。

第一轮只做 explicit acquire/release，不做 LRU、自动 prefetch scheduler、Worker pool 或通用 cache service。
原始测量分解 fetch/decode/admit/activate、current resident heap、initial JS/CSS/modules、open/render hot
path 和 main-thread blocking。

#### M2 闭合记录（2026-08-25）

- Base 新增 Scene 与 Narrative 的 type-specific manifest/session；Text session 从 grow-only `ensure`
  演进为独立 lease。UI 的 package-private GUI unit owner 读取同源 runtime bytes、一次 admit
  `sillymaker.gui-composition`，再以已有 Code Surface catalog 冷编译 direct React plan。Code Surface
  component chunks 继续由 literal loader 拥有，asset 继续由现有 exact-demand Asset Registry 拥有；没有
  第二 asset/code loader、万能 content object、LRU、prefetch scheduler、Worker pool 或 cache service。
- 各 owner 只共享一个 package-private residency primitive：application-generation、single-flight、
  load/admit/activate timing、independent lease、last-release retirement、failed-flight retry 与 dispose/late-result
  fencing。stable ID、manifest topology、source admission、compiler 和 plan type 仍由各自 owner 定义；hot
  command/render path 只持有 direct plan，不查询 manifest、registry 或 lifecycle Context。
- Narrative manifest 关闭 cross-unit entry/call/successor 引用，并以单独 application-composition check
  关闭 Scene、GUI composition、text-pack 与 asset IDs；Save 仍只保存既有 stable Narrative cursor，没有
  module object、parsed plan、新 Save 字段或 migration。Web 只增加一个 application-owned addressable
  runtime/readiness seam，把 opening、admitted invocation 与 replacement Snapshot 的准备接到 Core 现有
  pre-dispatch/pre-commit boundary；authoritative command/replay 本身保持同步、无 I/O。
- Story loader 产出的 typed `NarrativeGraphV1` 不在 Base unit owner 二次 parse；owner 只做自身负责的
  lint/entry/reference closure。Engine Lab acquire 成功后把 direct Scene/Narrative plans 写进两个 instance-
  private maps，execution context 热路径不调用 residency/session lookup；失败不写、dispose 同步清除。
- BuildIdentity collector 的 simulation/presentation facet 可声明额外 literal roots。Engine Lab 因而把两个
  addressable Narrative modules、两个 Scene wrapper modules 和两份 Authoring Scene source 纳入原有 live-byte/
  semantic identity；unit code 变化不会因 dynamic import 落到仅 application facet，也没有把 source bytes/
  SHA 塞回 unit manifest。
- Engine Lab 使用两个 literal Scene units、两个 literal Narrative units 和 exact-query GUI unit。普通启动
  只准备 procedure Scene + calibration Narrative；`lab.begin_drill` 在提交前准备 drill pair；R2/Persistence
  replacement 按 Snapshot cursor 准备对应 pair。`?code_surface_conformance=1` 才动态取得 GUI owner、
  catalog、两个 React children 及其 CSS。受影响的完整 drill pacing + Code Surface Chromium/WebKit
  10/10 通过。
- release API 会清除 parsed indexes/compiled plan 和显式实例，但不虚构浏览器 ESM/CSS cache 的物理卸载。
  Engine Lab 为支持现有同步 authoritative replay，在一个 application generation 内保留已经进入过的
  Scene/Narrative plans，到 successor/application dispose 一次释放；Web text readiness 同样保守保留本代
  已准备 pack。因而本轮证明 initial/未访问内容与启动、当前短程工作集解耦，不宣称“永远只保留当前
  Scene/chapter”。M4 locale/current-content reconciliation 与后续真实作品 profile 可在不改变 unit/session
  合同的前提下缩短持有期；本轮没有为此新增 replay preload framework。
- Engine Lab release receipt 的 initial HTML/preload 不包含 calibration/drill/procedure unit modules，也不
  包含 query-only GUI runtime/catalog/children/CSS；opening pair 由 readiness dynamic import 在 GUI ready
  前取得，drill 与 GUI assets 保持 lazy。release 全图为 29 个 JS（1,481,391 bytes raw / 399,798
  bytes gzip）和
  6 个 CSS；这只是当前 graph measurement，不是 bundle budget。
- 三个 fresh Deno process 的小型真实 owner 样本如下（每格为 min..max ms）；动态 module/file cache、
  机器和工作树都会影响数值，因此不作为 promotion 门槛：

  | unit                  |         load |        admit |     activate |        total |
  | --------------------- | -----------: | -----------: | -----------: | -----------: |
  | procedure Scene       | 1.935..2.297 | 0.006..0.007 | 0.005..0.006 | 1.947..2.308 |
  | calibration Narrative | 1.553..3.176 | 0.486..0.542 | 0.002..0.003 | 2.041..3.678 |
  | drill Scene           | 0.249..0.652 | 0.002..0.002 | 0.003..0.003 | 0.253..0.657 |
  | drill Narrative       | 0.397..0.748 | 0.241..0.265 | 0.000..0.001 | 0.643..0.989 |
  | GUI composition       | 0.641..0.960 | 0.515..0.769 | 0.067..0.078 | 1.351..1.542 |

- 既有 content profiles 从 1 pack/1,000 entries 扩到 100 packs/100,000 entries 时只加载一个
  1,000-entry pack；session heap delta 为 262,360 → 263,256 bytes，manifest p50 为 0.286 →
  0.815 ms，pack-admission p50 为 5.930 → 5.938 ms。bundle profile 的 initial JS 从
  1,246,995/327,680 bytes raw/gzip 变为 1,254,321/328,412，约 10.2 MB 静态内容保持外置。该趋势不
  外推为百万词证明，百万词和百倍 Scene 的最终结论仍交给持续 benchmark 与作品重写。
- 通用 Player trend benchmark 继续记录启动、交互、heap/allocation，并以浏览器原生
  `PerformanceObserver("longtask")` 增加 count/total/max 原始观测，不设阈值。在 Chromium 4x CPU
  throttle 的最终三次样本中，cold-start + Narrative 各有 3 个 long tasks、max 127..131 ms；skip
  各有 1 个、max 62..64 ms；WholeCanvas 操作段为 0。这个结果诚实保留了主线程风险，而不是把 M2 写成
  性能达标裁决；后续 M3 profile 与真实项目负责定位持续热点。
- focused M2 与修复回归、format/lint/style/typecheck、determinism、assets、五个 Story checks、composition
  benchmark 和 release build 均通过；canonical `deno task check` 为 371 test files / 5,327 tests。
  `git diff --check` 与 `deno task docs:build` 通过。Browser 结果如上；整轮 React Doctor 留在本计划
  最终收口，不把每个非 React milestone 重复变成一次全仓 advisory。

### M3 — Runtime Inspector facets

目标：为以后编辑器和真实项目 profile 提供可观察性，不恢复旧 Studio。

- 在现有 virtualized Inspector/Authoring Host 上增加 loaded-unit、current Scene/Narrative/GUI reference、
  acquire phase/timing、owner、failure/retry 与 working-set facet；
- Code Surface 显示 node/view、outer geometry/layout domain、load/fault/lifecycle、state-owner hint、portal/
  native policy 与 source；
- unloaded unit 只显示 stable reference/summary，不强制加载；
- Inspector 不枚举内部 DOM、component identity、listener、module file inventory 或 command order，不创建
  第二 runtime/session/source authority。

验收保护用户可观察状态、虚拟列表规模、retry/selection 行为和 ordinary Player final-graph exclusion。

#### M3 闭合记录（2026-08-25）

- Studio 只增加一个 optional、application-owned `RuntimeInspectorSourceV1` read model。Scene、Narrative、
  GUI 与 Text 的真实 owner 投影 stable identity/source、acquiring/loaded/failed/released、attempt/failure、
  原始 load/admit/activate timing、dependency references 与显式失败 retry；Inspector 不取得 lease、不编译
  plan，选择 unloaded row 不触发加载。Asset 只作为 dependency reference 展示，不伪造第二个 Asset owner。
- Engine Lab 的 projection store 保留一个真实 generation/retirement fence。active owner 显示完整 build-known
  summaries，staging/retired 只保留 actually touched evidence；从未 acquire 的 Text/Scene 等不会在 retirement
  时被伪装成 released。没有 Inspector subscriber 时 publication 只做 O(1) revision/dirty，完整 snapshot 仅在
  `getSnapshot` 或 live subscriber 需要时惰性物化；相同的 absolute unloaded projection 直接 no-op，live
  successor 不会按每个 untouched pack 反复物化全目录，`setRetry` 也不制造 N 次目录 publication。
- Web 的既有 Text session 通过 stable pack descriptors、O(1) `get(packId)` 和只通知该 `packId` 的 listener
  投影状态；它不在每次变化时扫描 manifest，也不重复 admission。untouched pack 保持 `unloaded/attempt 0`；
  retry 的真实 boolean refusal/success 一路返回 Inspector。Web 不另造不可达的 released 状态，application
  owner retirement 负责最终 released evidence。
- current Scene/Narrative/GUI 只来自 committed semantic publication 与真实 GUI selection，不从 loaded 猜测。
  embedded Inspector 与 Player 在同 realm 观察 live owner；standalone Inspector 明确显示 detached static
  manifest summaries 与零 working set，不为此增加 BroadcastChannel/RPC/heartbeat 或第二 runtime authority。
- Code Surface compiled plan 增加显式 source、outer layout/geometry owner、authoring/state-owner/policy 的静态
  inspection facet；实际 Suspense/mount/unmount/fault boundary 报告 node lifecycle。未提供 observer 的普通
  consumer 不挂载 lifecycle effects；observer 本身失败不能替换产品 surface。它仍不枚举 DOM、listener、
  component identity、module graph 或 CSS inventory，也不声称限制可信 same-realm React/npm code 的平台能力。
- Runtime list 的 1,000-row focused profile 最多挂载 16 rows并自动 reveal committed current row；Engine Lab
  opening active owner 的 5 个 build-known units 中只有 procedure Scene 与 calibration Narrative loaded，其他
  3 个保持 unloaded。选择 drill 不改变状态，真实 command 后才变成 loaded/current；standalone working set
  为零。per-unit heap、browser module/CSS physical eviction 与 main-thread attribution 继续交给现有 benchmark/
  profiler 和后续真实作品，不把 Inspector 扩成 profiler。
- focused runtime/Code Surface/Studio/Web/Engine Lab 8 files / 34 tests、typecheck 与 Chromium/WebKit 6 个
  M3 Browser cases 通过。Engine Lab release receipt 也通过：ordinary Player 的 Studio authoring/Inspector、
  dev-source、Agent 与 RPC implementation facets 均为空；dev-only Author entry 继续按设计包含 Inspector。
  本里程碑没有
  大型第三方组件、fake Agent conversation 或 SillyOS 范例，它们按所有者裁决留到本计划关闭后的 SillyOS
  重做。

### M4 — Locale-addressable i18n V1

目标：让百万词文本按 content unit 与 locale 同时局部化，并保持翻译者直接编辑友好。

- 演进现有 `TextContentManifestV1` / catalogs/packs，不创建第二 text store；
- stable `textId`，default locale 引用闭包完整；其他 locale 可部分覆盖并沿声明 fallback chain；
- active locale + fallback + current chapters 按需加载，locale switch 原子替换 presentation owner；
- locale/profile 属于 Host/presentation preference，不进入 gameplay State；
- 不恢复 byteLength、SHA、declared entry count receipt；translation 修改现有 logical location 不被当作
  Save incompatible；
- V1 只做 `textId -> string`；参数化/富文本继续显式 TypeScript/React/`Intl`，以后由真实 consumer
  决定是否需要 message syntax。

用生成的多 locale/chapter 数据证明初始与 resident working set 不随所有 locale 总文本线性增长；不提交
百万词 fixture。

#### M4 闭合记录（2026-08-25）

- `TextContentManifestV1` 现在唯一拥有 default locale、acyclic fallback、logical packs 与 locale
  variants；physical wire 直接演进为 V2 `{ format, version, packId, locale, entries }`，旧 V1
  implementation/fixtures 同轮删除，没有 compatibility parser、第二 text store 或 receipt generator。
- Base session 以 logical-pack lease 表达 demand。`activateLocale` 只 staging 当前 demanded packs 的
  target/fallback variants，完整 candidate 成功后才原子替换 presentation owner；latest request wins，
  failed/stale candidate 保留 predecessor。owner 构造和 loaded-pack 投影也只遍历 active/demanded
  集合，不把 O(all manifest packs) 带回 locale switch。最后一个 lease release 删除 parsed variants/
  indexes；dispose 与 concurrent acquire/retry/late result 继续 generation fenced。
- default variant 完成 TextId closure；translation 可部分覆盖并按 pack 内 fallback，但不能新增 default
  不存在的 ID。一次 Strict JSON/wire/schema admission 后直接构造 Map；没有 byteLength、SHA、declared
  entry count、descriptor/prototype authenticity 或内部重复 admission。
- Web 在 initial pack acquisition 前激活 persisted Player-profile locale；不可用 preference 报告后以
  manifest default 重试并修复 profile。运行时 preference 只有在 Text owner 切换成功后才 publish/
  persist；locale 不进入 gameplay State/Save。Web 继续保守持有本代 required logical-pack leases 到
  application dispose，但每个 demanded pack 只保留 active fallback chain；Browser HTTP cache 不归引擎。
- Template 成为第一实际 consumer：`zh-CN` default，opening/ending 各有 directly editable V2 physical
  variants，partial `en` 按 TextId 回退中文。runtime asset verifier admission 每个 variant，但跨 pack
  只保留 default-ID closure 与当前 logical pack 的短期 maps，不把全部翻译字符串常驻。
- 当前 compile profiles 为 2 packs × 3 locales 与 100 packs × 8 locales。两者都只 demand 1 pack、
  load 2 variants / 1,500 entries、cold loads 为 0；五次 raw p50/p95（ms）分别为 manifest
  `0.177/0.348` 与 `4.106/11.922`、pre-demand locale selection `0.0045/0.0065` 与
  `0.0045/0.0061`、first-pack admission `5.097/7.041` 与 `4.703/7.082`。一次 retained-heap delta
  `237,352 B` / `583,312 B` 只作 noisy trend，不作预算。
- V2 bundle profiles 的 initial JS 为 reference `1,255,578/329,681 B`、scale
  `1,265,676/330,457 B` raw/gzip；外置 variants 为 `102,111/5,787 B` 与
  `10,211,100/579,253 B`。benchmark 只输出 raw measurements，不做 promotion verdict。
- focused Base/Web/Template/assets/addressable 7 files / 43 tests、bundle helper 4 tests、Template story
  check、assets check、typecheck、两档 compile/bundle benchmark、docs build 与 diff check 通过。
  M4 没有增加大型第三方组件、fake Agent conversation、SillyOS、Worker pool 或 Desktop activation。

### M5 — Private build-known Mod Runtime

目标：验证“完整基础产品 + 可选纵向切片”，但不提前建设公共生态基础设施。

- application 声明 build-known mod catalog 与 immutable-per-generation active set；
- 游戏声明 stable extension points、allowed contribution kinds、merge/collision policy；engine 不猜游戏
  语义；
- data mod 引用允许的 Scene/Narrative/GUI/text/asset IDs；trusted code mod 只经 literal loader 贡献
  definitions；
- private Direct Extension Runtime 复用 mount/dispose/child lifetime/generation fencing；它不进入
  command/render hot path；
- unknown target、missing dependency、collision、setup/activate failure 原子拒绝且 predecessor 保留；
- active set 改变经 application successor/rebootstrap；不在 live Session graph 上任意热改；
- authoritative contribution 进入既有 simulation identity/Save policy；不增加第二 State、per-Mod State
  authority 或 migration framework；
- no-Mod product 完整可运行，final graph 排除 Mod/Direct/code-mod implementation。

验收只用 base + 一个原创 data mod + 一个原创 code mod。M5 仍不导出 public resolver/SDK、市场/
distribution、post-release arbitrary code、untrusted sandbox 或 hot install；若实现必须越过这条边界，
命中 stop condition 并回到 owner。

#### M5 闭合记录（2026-08-25）

- 新增唯一 private subpath `@sillymaker/composition/internal/mod-runtime`；package root 不重导。
  runtime 只捕获 immutable-per-generation active set，输出 ordered `activeIdentity`、application-owned
  cold-compiled direct point values 与 `dispose`，没有 install/uninstall/restart/resolver/SDK/registry API。
- catalog 全量只 admission build-known identity；只有 active data bodies 被遍历，inactive code literal
  loader 保持 cold。active definitions 按 dependencies 拓扑排序；missing/cycle、unknown target、kind
  mismatch、duplicate/collision、load/identity/compile failure 均在 publication 前拒绝。
- application extension point 唯一拥有 contribution payload、allowed kind、collision/merge 与 direct-plan
  compile 语义。loader/compiler 是 trusted cold、resource-free staging；可回滚资源只经既有 Direct
  lifecycle `setup/effect/mountChild`，所以 setup failure 复用同一 rollback/diagnostic/cleanup，不另造
  Mod lifecycle 或副作用拦截。
- Engine Lab 增加仅测试导入的 228-line application-local conformance：完整 base rule 加一个原创 data
  Mod 和一个 literal-loader code Mod；ordered active identity 由应用作为 `story_simulation` BuildIdentity
  record 输入既有 resolver，改变 simulation digest，Mod Runtime 自身不拥有 digest/State/Save。失败
  successor candidate 完整 rollback 后 predecessor direct plan/lifecycle 仍可用。
- 长期 build-dependency receipt 的既有 `dynamicExtensionImplementation` 分类只扩展识别
  `mod-runtime/**`；真实 Template ordinary/reference 与 Engine Lab ordinary release graph 均排除 Mod
  Runtime。没有另建 receipt schema/facet 或 Mod-only graph framework。
- core 约 `521 LOC`，core tests 约 `350 LOC`，application proof `228 LOC`，receipt 分类/断言净增约
  `16 LOC`。focused core + consumer 2 files / 8 tests、含真实 receipt 的 3 files / 16 tests、typecheck、
  format 与 diff check 通过。M5 不改变 Browser product UI，因此没有制造无行为价值的 Browser spec。

## 3. Closure gates

每个里程碑同步实际改变的 architecture/features/development/story-authoring/build docs。最终要求：

- focused unit/integration tests、受影响 Chromium + WebKit E2E、Story checks 与 release graph receipts；
- `deno task check`、`deno task docs:build`；
- 所有 React/TSX slices 的 exact-base React Doctor advisory 分类；
- raw startup/content/index/working-set/main-thread measurements 与保留复杂度理由；
- ordinary Player/no-Mod graph 的结构排除；
- superseded implementation/export/test/doc residual scan 为零。

#### 最终闭合证据（2026-08-25）

- M4 focused Base/Web/Template/assets/benchmark 7 files / 43 tests 与 M5 core/application/真实 receipt
  3 files / 16 tests 通过；旧 physical Text V1、`UiContributionRegistryV1` implementation/export/test、
  public Mod root export 与过时的未完成里程碑 live-doc residual 均为零。
- 受影响的 Code Surface、parallel pacing 与 Runtime Inspector Chromium/WebKit 共 16/16 通过；M5 没有
  Browser product UI，所以没有为 test-only Mod conformance 制造 E2E。
- `deno task check` 通过：377 test files / 5,367 tests，以及 format/lint/style/typecheck、determinism、
  Composition/State benchmark contract、assets、所有 Story checks 与 Engine Lab release build 全部绿色；
  `deno task docs:build` 与 `git diff --check` 通过。
- exact-base React Doctor advisory 以立项基线
  `e928abd09ea496406a3b43f310c1223d741cb113` 扫描 140 个 changed files。一个无争议的 mutable-sort
  suggestion 改为 `toSorted` 后复扫；最终收口复扫 149 files，剩余七条均未确认成产品缺陷：Narrative manifest property access 与
  Inspector string filtering 是冷路径微优化/规则误报，Mod dependency compilation、Direct child mount 和
  Web pack retention 的四个 `await` 必须保持声明/依赖/失败/rollback 顺序；content benchmark 的第五个
  `await` 正是被测量的 sequential acquire protocol。没有为 advisory score 改写 authority 或原子失败语义。
- 本轮没有加入第三方大型 React 组件、fake Agent conversation、商业内容或 SillyOS；same-realm code
  保持 trusted，benchmark 继续只报告原始测量。Deno Desktop adapter 仍 private、explicit、default-off。

#### 收口复审修正与 defer 复裁（2026-08-25）

- Text owner 不再在每次 acquire/release 重建全部 loaded-pack TextId 索引；default-locale ownership 只随
  pack demand 增量增删，locale replacement 复用该拓扑。Strict JSON 与 exact wire shape 仍在唯一外部
  边界验证，但 closed-key 检查改为 key count + `Object.hasOwn` 的线性遍历；`now()` 在唯一
  demand/request fence 前读取，不再 build 后重复 fencing。新增 benchmark 只输出全 pack 顺序
  acquire/release 原始分布，不增加阈值或 promotion 裁决。
- Authoring Scene 专用 document session 对 admitted typed value 使用 identity clone + `Object.is`，不再
  JSON clone/equality 扫描；reducer 保留完整 reindex/world-transform/compiler validation，Inspector 对同一
  Scene object 复用该次 compile receipt。没有增量 compiler、第二 Scene authority 或为测试暴露的 result
  字段。5,000-object 末项编辑的临时本机 p50 从 `79.03 ms` 降至 `36.81 ms`；剩余成本来自真实 object
  lookup、reindex 与 compiler。
- Code Surface lifecycle 仍同步改变 projection，但一次 React effect wave 的 subscriber materialization/
  notification 合并到一个 microtask；显式 `getSnapshot` 仍立即可见，普通 owner/fault publication 会吸收
  已排队的 wave。2,000 nodes 的临时本机表征为 synchronous `0.55 ms`、settled `6.40 ms`、一次
  notification；收口前逐 node publication 的同机审查样本约 `324 ms`。
- 非 `undefined` execution-context contract 现在在 Core construction、Game Harness 与 Web
  `addressableRuntime` 声明上静态必填；允许 `undefined` 的应用保持可省略。Debug Bundle 的 package-owned
  UI context 只由完整 bundle schema admission 一次，untrusted bytes decode 仍严格；Engine Lab 的
  Narrative closure check 从 module import 副作用移回已有 focused test。
- defer 重新按当前测量裁决：50,000-unit Runtime Inspector projection 的临时 p50/p95 为
  `6.12/9.61 ms`，继续保留现有 lazy projection + row virtualization，不加第二索引/store；5,000-object
  Scene 编辑仍约 `36.81 ms`，但“百倍 Scene 数量”由 addressable/index 路径处理，并不等于单 Scene
  5,000 objects，需等真实大型 current-Scene Browser profile 再决定 indexed operation/reindex 或局部
  compiler。100 packs/100,000 logical entries（active + fallback 共 150,000 resident entries）的五次趋势
  为 first-pack p50/p95 `5.50/5.59 ms`、全 pack 顺序 acquire `332.77/335.06 ms`、全 release
  `3.87/4.00 ms`；因此继续要求 progressive demand，并把 Web visited-pack 持有期/heap 作为真实作品驱动的
  明确 follow-up，而不是现在发明 LRU。Scene preview 的 O(current-Scene objects) React/DOM 成本与 Stage
  ambient 的真实 DOM commit 成本仍缺大型 Browser profile，保持 evidence-gated；不为它们建立临时
  benchmark framework。

本计划关闭后再单独设计 SillyOS，作为 Agent-first GUI、第三方 React 生态、Code Surface、RPC、长期
transcript/session owner 与真实 event-loop 性能的综合验证；它不是倒逼本计划增加大型范例的理由。

## 4. Stop conditions

只在以下情况暂停：

- public/wire/Save/digest/replay compatibility 或 migration policy 发生未裁决变化；
- 无法保持单一 writable authority、原子 commit/CAS/generation/currentness；
- authoritative command 必须等待 Host/network/file I/O；
- Scene paint/pick、GUI layout/focus、loaded-unit owner 或 Mod collision 出现冲突的真实 authority；
- repeated profile 证明主线程/heap 预算必须由新 Worker/process/renderer boundary 才能解决；
- M5 必须变成 public resolver/ABI/SDK/distribution 才能继续。

private helper 名称、文件拆分、测试组织、符合上述 trusted same-realm 合同的等价
CSS/React 实现和 raw benchmark 样本数不构成
stop condition；采用最简单、可验证方案继续。
