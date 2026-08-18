# Application Runtime and Embedded Authoring V1

状态：2026-08-18 由所有者接受为下一条默认/core implementation lane。当前只完成计划与
目标合同，AR0–AR6 尚未启动。引擎能力扩展全部前置；SillyOS、Cat Cafe 与商业克隆第三次
重写是本计划完成后的产品证据顺序，不是本轮切片或完成 blocker。

目标合同由
[Application Runtime and Embedded Authoring](../design/application-runtime-and-embedded-authoring.md)
拥有；既有 Scene/Motion/文档会话领域合同继续由
[统一创作架构](../design/authoring-architecture.md)与
[场景创作模型和 Studio](../design/scene-authoring-and-studio.md)拥有。
[Production-floor sequence](2026-07-30-production-floor-sequence.md) 仍是唯一跨计划
排序入口。`codex/promote-composition-state-runtime` 的 curated tree 是实施基线；本计划不
继续扩张 State/Composition，也不恢复 Cordis。

## 1. Evidence and decision

新的 owner evidence（2026-08-18）明确了三个后续产品压力源：

- 先演进引擎，再将 SillyOS 重做为 Windows-like、非严肃但真实可用的 Agent 产品；
- Cat Cafe 在玩法设计成熟后重做为有游玩欲望的游戏，并 dogfood in-game/in-app
  authoring；
- 外部商业克隆继续补全内容，待本轮合同稳定、内容冻结后第三次重写，以同一 workload
  比较每代引擎的工程进步。

live baseline 同时说明缺口位于 Application Host 与 Authoring Host，而不是 State 热路径：

- Composition/State 实验已通过唯一权威、Save/replay、locality 与性能门；没有 production
  Story 需要 State Format V2，Cordis retain/remove checkpoint 已选择 remove；
- DevDock 已有 `loadDevDockContributions()` 动态 import 的真实 first-party lazy 纵切，但
  loader 尚未成为带 single-flight、retry、late-result fence 和 disposal 的一般内部合同；
- `@sillymaker/studio` 已有 Project Authoring Index、共享 document session、dirty gate、
  undo/redo、CAS、Scene/Motion/Flow workspaces 与原子 HMR publication，但 shell 静态导入
  workspaces，产品形态仍是 dev-only 独立页面；
- `AuthoringDocumentSessionV1` 统一了文档会话，却只公开整文档 `replaceDraft`；Scene UI
  仍以 clone callback 表达编辑，Agent 无法复用同一 typed operation；
- build benchmark 已报告 entry/preload/lazy/all JS/CSS/assets，尚缺稳定的 shell-visible、
  first-actionable 与 optional-ready 信号；当前 `--profile release|debug` 只控制 sourcemap/
  minify，不是产品依赖图；
- 现有 `AgentGamePortV1` 是 player-safe gameplay semantic automation，不是 LLM Agent
  session/client、authoring 或 Artifact port，不能扩成万能接口。

本轮裁决：先建立启动地板、构建期已知的 progressive activation、可嵌入 Authoring Host、
结构化 authoring operation 与最窄 provider-neutral Agent/UiArtifact seam；不先建设通用插件
平台、Mod ABI、Effect Broker 或产品级 Agent backend。

每个切片必须保持：

- 唯一 gameplay Session/State/digest/queue/CommandLog；
- Authoring Host 不接收 State writer，不建立第二 Stage reconciler；
- draft/undo/Agent stream/UiArtifact 不进入 GameSnapshot、Save、RNG 或 replay；
- authoring 写回继续走唯一 source document + existing CAS/atomic rename；
- 普通 runtime release 完全排除 Studio、dev source IO、author adapter 和编译器；
- public API 只有两个真实消费者和行为证据后才冻结；provisional seam 不进 `features.md`；
- 现有 simulate digest、Save/replay 字节与 player-visible behavior 除本切片明确的 Host UI
  外保持不变。

## 2. Implementation sequence

### AR0 — Startup and dependency baseline

先补可比较观测，不引入 loader/plugin 框架。

- 定义 runtime、author 与既有 headless 的静态 entry/dependency policy；不新增或复用名为
  `profile` 的公共概念，也不改变 CLI `--profile release|debug` 语义；
- 为 shell visible、first actionable、optional capability ready 建立稳定 Host/test 信号；
- 扩展现有 bundle report，使 entry/preload/lazy 归属能点名 contribution；报告继续写 OS
  temp/artifact，不含机器身份，不成为跨机器 CI timing gate；
- characterization 当前 Player、独立 Studio route、DevDock lazy activation、HMR dirty-draft
  与 author-code-absence；
- 用可控永不 resolve 的 optional loader 证明 shell 与至少一个核心操作仍可用；
- 同一构建、固定 browser/throttle 的 fresh-context 趋势至少三轮，记录而不先设绝对预算。

验收：信号不进入 State/Save；现有 Story digest/Save/replay 不变；ordinary release 的依赖图
基线能明确指出 Studio/dev-source code 为零；no-white-screen 用例在 optional pending/failure
下成立。

### AR1 — First-party progressive activation

实现构建期已知的最小内部 activation state machine：small admitted metadata + static loader
function + `idle/loading/ready/error/disposed`。V1 只服务 first-party contribution，不解析第三方
manifest 或依赖图。

- 同一 generation single-flight；失败有稳定 diagnostic 和显式 retry；
- close、capability revoke、retry successor 或 dispose 后的迟到结果不得挂载；
- 一个 contribution 失败不卸载核心 shell、Session、已加载 sibling 或 predecessor UI；
- success 后把直接消费对象交给 owner，render/command 热路径不查 activation registry；
- 先迁入现有 DevDock lazy contribution，保持 capability、focus、freeze 和关闭行为等位；
- 第二消费者迁入一个 Studio workspace implementation；metadata 可常驻，workspace 首次进入
  前 loader 调用为零；
- build 证明 on-demand implementation 不进入 entry/preload，ordinary release 不含 author-only
  module。

验收包括并发双触发、failure/retry、dispose/late result、sibling isolation、真实 lazy chunk 与
listener/timer/subscription cleanup。若需要任意路径 import、运行期目录扫描、service locator、
hierarchical scope 或 provider churn，立即停止而不是扩成插件系统。

### AR2 — Structured Scene authoring operations

在嵌入 shell 前先让人类与非 UI 调用方共享可审查编辑语义。Scene 第一刀至少覆盖：

- 一个连续编辑（例如 placement/scale，可 gesture coalesce）；
- 一个结构编辑（例如 add/remove entry）；
- 一个引用编辑（例如 bind/clear cue motion）。

每个 operation 是可序列化、带自己的 schema revision、strictly admitted 的领域 record；执行
envelope 另带 exact current document identity 与 expected monotonic draft/session revision。pure
reducer 只接收 document + operation，返回 next document 或稳定 diagnostic，不持有 IO、
Session、HMR 或保存能力。相同输入必须得到 canonical bytes 相同的文档。

成功 operation 通过现有 document session 形成一个 undo step；同一 drag/run 可显式 coalesce。
每个成功编辑、undo/redo、reload、discard 或 document successor 都推进 draft revision；晚到
operation 若 document identity 或 expected revision stale，必须在 reducer 前原子拒绝。
unknown schema revision/kind、非法 payload、缺失 target 与 stale envelope 都保持 draft/dirty/
undo/redo 不变。Scene UI 与 headless/local authoring adapter 必须调用同一 executor；adapter
只接收当前已打开 document identity、expected draft revision 和 admitted operation，不接任意
文件路径/FilePort。

迁入路径不再各自直接调用 `replaceDraft`；它可以继续作为 session 内部 primitive。本切片不做
跨文档事务、TypeScript AST 修改、operation log persistence、MCP/ACP/Harness ABI 或全局
command/event bus。

### AR3 — Embeddable Authoring Host

从现有 Studio 抽出一个 Host + workspace manifest；保留已有 Project Authoring Index、shared
session、dirty navigation gate、undo/redo、diagnostics、selection、preview、CAS 和 HMR
publication，不重写这些内核。

- 现有 `/__sillymaker/studio/` 先改为同一 Host 的 standalone wrapper；
- Engine Lab 增加一个最小、真实的 scene-managed conformance document 与对应 Studio binding；
  该文档是这条 conformance scene 的唯一 authoring source，runtime/author consumer 复用同一
  admission，不使用隐藏的 test-only in-memory document，也不迁移整套既有 rig 内容；
- 该 consumer 真正落地的同一切片同步更新 `e2e/AGENTS.md` 中当前“没有 Scene/Studio
  binding”的 live 约束；计划接受时不提前改写 handbook；
- Engine Lab 在此基础上增加最窄 dev-only embedded author surface，按需激活
  Authoring Host/workspace，并作为 AR4 UiArtifact 纵切的同一 conformance shell；template 本轮
  不承担第二份嵌入实现；
- 两个 shell 消费同一个 session factory、workspace implementation 和 source IO；不得复制
  dirty/undo/save/conflict 状态机；
- draft 操作、undo/redo、discard 在 save 前不改变 live application digest；CAS success 仍经
  文件写回 → Vite/HMR → composition publication；
- 409 刷新 saved/digest 并保留 draft；remount/HMR/failed workspace load 不丢 dirty draft；
- embedded surface 的 focus/input 归现有 Host/Surface authority，editable keyboard 不泄漏给
  gameplay；关闭 dirty workspace 仍给 save/discard/cancel；
- layout-sensitive workspace 必须显式等待 connected mounted/readiness，不把 detached React
  layout acknowledgement 冒充 connected geometry；
- standalone 与 embedded 的代表浏览器流程行为等位；旧 route 在达到等价前不得删除。

普通 Player build 中 Authoring Host、workspace implementation、dev endpoint 和 source-write
IO 必须完全缺席。应用内 authoring 仍是可信 author mode，不激活 release UGC/source editor。

### AR4 — Experimental Agent Host and UiArtifact seam

这一刀只准备 SillyOS consumer，不接真实 sidecar 或 OpenUI，也不宣称稳定 public ABI。

- 用 deterministic fake 证明 provider-neutral connect/status/start/submit/cancel/stream/reconnect；
- Agent 未连接、连接慢或失败时，核心 shell 与 Authoring Host 可独立使用，startup 不 await
  Agent；
- cancel/dispose/successor 后的迟到 event 由 generation fence 丢弃，重连不重复提交 chunk；
- cross-process records 按 untrusted data 做 exact shape、size/depth、sequence admission；
- `UiArtifact` 只允许 package-owned 的封闭 data-only component kinds 与产品显式允许的 action
  IDs；
  unknown node/action 原子拒绝整个 successor，任意 HTML/JS/React component/function/module URL
  或 executable payload 一律不进入 renderer；
- partial stream 只形成 transient draft；只有完整、admitted document 能产生 immutable
  `UiArtifact` revision，非法完成不替换上一份有效 revision；
- renderer 只读消费 revision；交互产出 admitted `UiIntent`，不得自动写 State、文件或网络；
- Agent 发起 Scene 修改走 AR2 operation；gameplay automation 继续走现有
  `AgentGamePortV1`/semantic intent；
- 重新打开 revision 不重新调用模型或执行 tool。

Engine Lab 的 dev-only embedded Host 必须在 AR3 的同一 conformance document 上提供一个最小
纵切：deterministic fake 产生 bounded `UiArtifact`，renderer 显示它，一个 admitted
`UiIntent` 经产品 adapter 调用 AR2 Scene operation；
unknown node/action、stale operation 与 cancelled late event 的浏览器证据都保留 predecessor
`UiArtifact` 和 draft。纵切只修改 in-memory draft，不触发 save/CAS、authoritative commit、网络或
其他 external effect。它是 engine conformance consumer，不把 provisional seam 宣称为产品
ABI，也不激活独立 permission/receipt subsystem。

这些形状在 SillyOS 提供真实第二消费者前保持 experimental/package-internal，不泄漏 DeepSeek
Harness、ACP、AG-UI、OpenUI、A2UI 或 Cordis 类型。本切片不实现 conversation/task/artifact
storage、permission UI、Mutation gateway 或 Effect Broker。

### AR5 — Build, browser and performance promotion

把 AR0–AR4 作为一个产品依赖图验证，而不是只跑 unit tests：

- static shell 先出现；optional loader、Agent fake、网络和非关键资产不阻塞 first actionable；
- ordinary release 精确排除 author-only graph；author workspace 确实首次进入才加载；
- browser 覆盖 activation double-trigger、failure/retry、close/late result、input/focus、standalone/
  embedded parity、dirty draft across HMR 与 connected readiness；
- browser 跑通 AR4 的 fake stream → admitted `UiArtifact` → render → intent → AR2 operation，并证明
  unknown node/action、stale draft revision 与 cancelled late event 不替换 predecessor 或 draft；
- Engine Lab prebuilt、相关 runtime/author builds、bundle report、Story checks、Save/replay corpus 与
  canonical `deno task check` 全绿；
- 同机交错 fresh-context A/B 至少五组；first actionable median 同时回退超过 10% 且超过
  50ms，并在第二次独立 run 重现时停止；数值仍是本机 promotion evidence，不进普通 CI；
- stable command paired median 回退超过 10%，或 command/render hot path 出现 activation/
  lifecycle lookup 时停止；
- 重复 activate/dispose 后不得遗留 listener、timer、subscription 或 late publication。

### AR6 — Closure and product handoff

- 删除被替代的 monolithic shell glue；standalone route adapter 若仍提供价值则保留，不为“零旧
  文件”而删；
- 只更新已经成为 live 的 architecture/features/development/story-authoring/build/quickstart；
- Engine Lab 手册随真实 consumer 更新；template handbook 只有实际接入 consumer 时才更新，
  examples handbook 此时仍保持 fix-only；
- 记录未满足限制，尤其 AR4 未经 SillyOS 证明、connected geometry 的真实覆盖范围和 author
  Host 平台边界；
- 把下一顺序交给独立产品计划：SillyOS Agent/明确选型的 UiArtifact adapter → Cat Cafe
  gameplay/in-game authoring → 内容冻结后的商业克隆第三次重写。

本计划完成不自动把 Composition/State 变为 public Mod runtime，也不自动激活下列任何 deferred
lane。

## 3. Stop conditions

仅在以下可观察边界出现时停止并请求裁决：

- 第二个 Gameplay Session、State、digest、queue、CommandLog、Stage reconciler、source
  document writer 或配置权威；
- Authoring Host/Agent/UiArtifact 绕过 structured operation + CAS 修改 source，或绕过 typed
  semantic/domain intent 修改 gameplay；
- Studio、dev endpoint、source-write IO、author adapter 或 compiler 进入普通 runtime release；
- optional capability/Agent/network 阻塞 shell visible/first actionable，或失败导致白屏、
  Session/authoring 不可用；
- activation/HMR 丢失 dirty draft、跨 generation 发布 stale result，或 cleanup 产生可观察残留；
- 生产加载依赖任意运行期路径、远端 executable code、`references/`、`node_modules` 扫描或
  ignored source；
- 需要 resolver、public Mod ABI/SDK/distribution、runtime install/uninstall、global middleware
  bus、hierarchical scope、provider churn、dynamic Context 或 Cordis；
- Cordis/Harness/ACP/AG-UI/OpenUI/A2UI implementation type 泄漏到中立 package declaration；
- Save/digest/replay/State authority 必须改变却没有独立兼容理由与 migration plan；
- 需要 State Format V2、production Story State migration、Effect Broker、Desktop promotion、
  Player source editor 或不可信代码 sandbox 才能完成；
- 两个真实消费者对拟公开合同有矛盾需求；
- measured baseline 触发 AR5 性能门且最小归因修复仍需扩大范围；
- 实现要求改变既有 `--profile release/debug` 的含义。

私有 helper/API 命名、文件拆分、状态机内部表示、测试 decomposition 与同等安全的 loader map
生成方式不是 stop condition，选择最简单可验证实现继续。

## 4. Deferred and follow-on evidence

本计划不实现：

- SillyOS、Cat Cafe 或商业克隆重写；
- OpenUI/A2UI renderer、真实 Agent sidecar、conversation/task/general-artifact/workspace
  persistence；
- capability approval/receipt、Effect Broker 或不可逆 tool workflow；
- Cordis、Mod resolver、public extension SDK、plugin marketplace、runtime code installation；
- Player/UGC source editor、任意 TS browser compiler、untrusted sandbox；
- 通用 WindowManager/Application OS、全局 typed event bus/interceptor；
- generic content compiler、data/UI/timing/save editor；
- State Format V2、production Story State migration、Desktop promotion 或新 genre pack。

后续产品使用同一顺序但分别立案：

1. SillyOS 先以 deterministic product fixtures 接入真实 Agent Host，再选择一种明确命名的
   UiArtifact adapter；普通 shell 不能 await Agent，真实 external effect 出现后才评估 receipt/
   Effect Broker；
2. Cat Cafe 在玩法 brief 成熟后 clean rewrite，接过旧版 Scene、WholeCanvas、Save、audio、
   asset 和 authoring 回归责任后才删除旧实现；
3. 商业克隆内容冻结后从干净分支第三次重写，以相同内容/场景比较 locality、编辑触点、
   first actionable、entry/lazy bytes、资产、Save/replay 与 engine-specific patch count；商业内容
   不进入本仓 fixture；
4. 只有至少两个真实产品重复需要 nested scope、provider disappearance/recovery、per-extension
   restart 或 live install 时，才在 optional Host cold layer 重评 Cordis/extension runtime。

## 5. Validation entrypoints

每个切片先跑 changed behavior 的 focused unit/browser/build tests，再运行受影响的 broader gate。
计划级关闭至少包括：

- `deno task check`；
- Engine Lab runtime/author dev flows 与 prebuilt suite；
- template/现有 Studio representative Chromium + WebKit flows；
- affected Story checks、simulate digest 与 Save/replay corpus；
- runtime/author build dependency graph 与 `deno task bench:player:bundle`；
- AR0/AR5 startup trend、activation cleanup 与 stable-command negative control；
- public declaration closure（不得出现 provider implementation、Cordis、Harness 或协议类型）。

原始 timing、heap、bundle diagnostics 与 external workload reports 继续只写 OS temp/artifact，不
提交机器结果或绝对路径。计划完成后才由产品 evidence 决定哪些 provisional seams 可升格。
