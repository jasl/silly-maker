# Application Runtime and Embedded Authoring V1

状态：2026-08-18 由所有者接受为下一条默认/core implementation lane，并在同日以补充 owner
evidence 收紧产品与平台边界。AR0 已于 2026-08-22 交付关闭，AR1 是唯一下一项；AR2–AR6
尚未启动。引擎能力扩展全部前置；本计划完成后的作品、examples 或产品验证由所有者另行选择和
立案，不是本轮切片或完成 blocker。

目标合同由
[Application Runtime and Embedded Authoring](../design/application-runtime-and-embedded-authoring.md)
拥有；既有 Scene/Motion/文档会话领域合同继续由
[统一创作架构](../design/authoring-architecture.md)与
[场景创作模型和 Studio](../design/scene-authoring-and-studio.md)拥有。
[Production-floor sequence](2026-07-30-production-floor-sequence.md) 仍是唯一跨计划排序入口。
`codex/promote-composition-state-runtime` 的 curated tree 是实施基线；本计划不继续扩张
State/Composition，但允许 AR1 对 private extension lifecycle 做一次受限、可删除的 direct 与
Cordis-core-derived A/B。它不激活 public Cordis API 或 Mod runtime。

## 1. Evidence and decision

新的 owner evidence（2026-08-18）明确了产品与平台边界：

- SillyMaker 只服务 GUI 应用和游戏；当前产品 target 是 Browser 与 Deno Desktop，Electron
  只保留未来可能的 Host adapter；
- CLI 只允许作为 Deno Desktop 的普通启动配置入口；headless 只服务开发、测试、确定性
  conformance 和自动化，不是产品形态；
- 产品依赖的后台、companion/background service 与 LLM 经 typed RPC 接入，不作为 in-process
  plugin；
- Game、Authoring 与 Agent UI 是内聚 sibling domain；进程内 extension runtime 只负责构建期
  已知贡献的组合、可逆生命周期、局部重载和动态装卸；
- editor 即使未来扩展为多 workspace、代码编辑器或类似 coding workbench 的产品，也必须在
  Agent 缺席时完整可用，并与其他 Application Domain 独立换代；游戏是首个 conformance
  domain，不是中立 Host 的命名来源；
- 后续可能先做小作品、examples 重写或其他产品验证，但具体选择与顺序尚未决定，不能写成本
  计划的隐含 backlog。

live baseline 同时说明缺口位于 Host、activation 和 lifecycle，而不是 State 热路径：

- Composition/State 实验已通过唯一权威、Save/replay、locality 与性能门；没有 production Story
  需要 State Format V2；
- 实验最初的 Cordis wrapper 只包了平面 mount/dispose，retain/remove checkpoint 只能证明那种
  用法没有价值，不能回答 nested ownership、provider recovery 或大型 editor workspace 的成本；
- DevDock 已有 `loadDevDockContributions()` 动态 import 的真实 first-party lazy 纵切，但
  loader 尚未成为带 single-flight、retry、late-result fence 和 disposal 的一般内部合同；
- `@sillymaker/studio` 已有 Project Authoring Index、共享 document session、dirty gate、
  undo/redo、CAS、Scene/Motion/Flow workspaces 与原子 HMR publication，但 shell 静态导入
  workspaces，产品形态仍是 dev-only 独立页面；
- `AuthoringDocumentSessionV1` 统一了文档会话，却只公开整文档 `replaceDraft`；Scene UI
  仍以 clone callback 表达编辑，未来 Agent/RPC caller 无法复用同一 typed operation；
- AR0 启动前的 build benchmark 已报告 entry/preload/lazy/all JS/CSS/assets，但尚缺稳定的
  shell-visible、recovery-actionable、first-actionable、required-ready 与 optional-ready 信号；
- 现有 `AgentGamePortV1` 是 player-safe gameplay semantic automation，不是 LLM/后台 RPC、
  authoring 或 Artifact port，不能扩成万能接口。

本轮裁决：AR0 先建立 GUI startup/target 地板；AR1 再建立中立 domain factory，并用同一 suite
比较 direct 与 Cordis-core-derived lifecycle。选定唯一 backend 后依次落 structured operation、
embedded Authoring Host 和最窄 Agent RPC/UiArtifact seam。Module Update Source、Extension
Runtime 和 SillyMaker publication/authority 必须分层。Cordis 的 release 标签不是否决理由；实际
语义覆盖、glue/test 成本、bundle/startup 和 failure recovery 才是选择证据。

“使用 lifecycle/plugin 机制”不表示能力一定 optional。AR1 会以 package-internal composition
语义区分 required domain、required local binding 与 optional contribution；它不建立公共
`Profile`、extension manifest 或 service locator。外部 required service 继续由 AR4 RPC readiness
表达，不伪装成本地 binding。

每个切片必须保持：

- 唯一 gameplay Session/State/digest/queue/CommandLog；
- Authoring Host 不接收 State writer，不建立第二 Stage reconciler；
- draft/undo/RPC stream/UiArtifact 不进入 GameSnapshot、Save、RNG 或 replay；
- authoring 写回继续走唯一 source document + existing CAS/atomic rename；
- 普通静态游戏 release 完全排除 Studio、dev source IO、动态 extension runtime、未选 RPC adapter
  和编译器；
- Extension Runtime 不拥有 UI publication、Session replacement、source 或 RPC transport；
- public API 只有两个真实消费者和行为证据后才冻结；provisional seam 不进 `features.md`；
- 现有 simulate digest、Save/replay 字节与 player-visible behavior 除本切片明确的 Host UI 外保持
  不变。

## 2. Implementation sequence

### AR0 — GUI target, startup, and dependency baseline

先补可比较观测和平台合同，不引入 loader/plugin/runtime 框架。

| Surface                  | 本轮角色                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Browser                  | 正式 GUI target；记录 build、Vite module update、startup 与恢复行为                      |
| Deno Desktop             | 正式 GUI target；记录 Host startup、CLI config、module update/restart 行为               |
| Auxiliary headless       | 只跑 dev/test/conformance；不形成第三种产品 entry 或 public API owner                    |
| Electron / Node          | 不进入实现或验收矩阵                                                                     |
| Required Host capability | 记录 required records/Host-domain readiness/failure；外部 service/RPC readiness 留给 AR4 |

- 定义 `runtime` 与 `author` GUI entry/dependency policy；headless harness 只作为辅助消费者；
  不新增或复用名为 `profile` 的公共概念，也不改变 `--profile release|debug` 构建语义；
- 定义 Deno Desktop CLI 参数与 Browser Host config 到同一 admitted/frozen bootstrap config 的
  行为边界；参数在启动后不可变，不成为 global config/service bus；
- 把 live `GameHostV1` 识别为历史 game-oriented Host capability port；审计其 `platform`、
  `bootstrapEntropy` 与 records/files/clock/navigation/log 边界，以 Browser 与 Deno Desktop 两个
  target 的真实需求形成中性 Host-capability contract。若 entropy 只服务游戏 bootstrap，就留在
  Game Domain admission 而不伪装成所有 GUI Host 的通用能力；
- 在非游戏消费者进入前迁移 public type/export、内部 consumers 与 live docs，并删除
  `GameHostV1`；只有真实兼容消费者或维护中的兼容承诺才能保留 bounded alias。不得把旧名扩展为
  新的 application root，也不得借重命名复制 Host owner；
- characterise 两平台当前 module-update source、full restart 与 application handoff 行为，并用
  R0 data、R1 presentation/workspace、R2 authoritative Application Domain、R3 Host restart 分类
  现有路径；游戏 fixture 继续以 Game/Session successor 证明 R2；
- 为 shell visible、recovery actionable、first product action、required
  Host-capability/domain ready、optional capability ready 建立稳定 Host/test 信号；
- 扩展现有 bundle report，使 entry/preload/lazy 归属能点名 contribution；报告继续写 OS
  temp/artifact，不含机器身份，不成为跨机器 CI timing gate；
- characterization 当前 Player、独立 Studio route、DevDock lazy activation、HMR dirty-draft、
  author-code-absence 与 ordinary no-extension/no-RPC-client graph；
- 用可控永不 resolve 的 optional loader 和最小 required Host records failure stimulus 证明：
  optional loader 不阻塞核心产品；required Host capability 失败不谎报依赖 domain ready，但 GUI
  仍提供诊断和 retry。AR0 不验证外部 service readiness，也不定义 required domain/local binding
  composition、RPC client、transport、fake API 或 service configuration UI；这些分别由 AR1、AR4
  与 AR5 拥有。

验收：信号不进入 State/Save；现有 Story digest/Save/replay 不变；明确选择 no-RPC、
no-extension 的静态 game baseline 中 Studio/dev-source/dynamic-extension/RPC implementation 为
零，其他产品只要求未选择或 unrelated implementation 为零；Browser 与 Deno Desktop 的实际差异
被记录，不用一个抽象词掩盖。Deno Desktop persistence/package/signing 的 production promotion
仍归独立 lane。

**AR0 closure（2026-08-22）：**

- public `GameHostV1` 已删除；中性 `ApplicationHostCapabilitiesV1` 只聚合 records、files、
  metadata clock 与 logging。Game bootstrap entropy 留在 Game Domain admission，不成为所有 GUI
  Host 的通用能力，也没有复制第二个 Host owner；
- Base 以 exact `{ revision, entry, target }` admission 产生新的 frozen
  `ApplicationBootstrapConfigV1`。Browser runtime 使用 `runtime/browser`，独立 Studio 使用
  `author/browser`，Desktop shell 使用 `runtime/deno_desktop`；Desktop `author` 仍明确不支持。
  Desktop argv 只在启动边界严格解析，不成为运行期配置总线；
- runtime Vite entry 和独立 Studio route 都先提供 dependency-free、可访问的静态 boot shell 与
  inert config，且诊断 shell 与产品 React root 分离。Host/test 信号区分真实 React layout-ack 后的
  first product commit、当前 entry 的 aggregate required-domain ready、optional capability ready 和
  terminal recovery；失败只展示 bounded diagnostic code 与 Retry，不泄漏原始异常。一个永不
  resolve 的 DevDock loader 不阻塞核心产品，required Host records 失败不谎报 ready。这里没有定义
  或验证 RPC client/service readiness；
- 真实 Template Vite build 证明 final Browser HTML 恰有一个 runtime/browser config 与一个静态
  shell；同一 final HTML 经 Desktop response boundary 后恰有一个 runtime/deno_desktop config，
  Browser target 文本被替换，Web reader 得到 frozen receipt。这是 build/HTML integration evidence，
  不是一次 native Desktop package launch；
- bundle measurement 现在从 final Vite chunk/asset graph 归因每个 output 的 application/
  contribution owners 与 `contributionIds`，包括 CSS-only dynamic entry；private receipt 和默认报告
  只写 OS temp，不修改 Player。Template 静态 release 的 engine-owned authoring、dev-source、
  dynamic-extension 与 RPC implementation facets 均为零；
- 当前 reload 边界已如实分类：Browser Studio 的 admitted document/CAS refresh 是 R0，binding/
  workspace candidate 的 detached-layout publication 是 SillyMaker-owned R1；符合组件边界的纯
  Player presentation module 还可走 Vite React Fast Refresh，但没有 SillyMaker atomic-publication/
  handoff 保证。Web 的 Game/Session R2 只有 helper 与 conformance evidence，任何 maintained runtime
  entry 都尚未安装该 Vite accept boundary；application declaration、core/domain、config、Fast
  Refresh-ineligible 与其他未分类变化走 R3 full-page reload。Deno Desktop 当前打包静态 Player，
  没有 R0–R2 module-update source；代码/config 变化需要 rebuild/process restart，按 R3 记录，不
  伪装成 local successor；
- 本切片没有改变 State、Snapshot、digest、Save、CommandLog 或 replay 语义。Deno Desktop
  persistence/durability、native packaging launch、signing、auto-update、Desktop author/source-write
  与真实 RPC readiness 仍未 promotion，也不包含在 AR0 的完成声明中。

### AR1 — Progressive activation and extension-runtime selection

先定义 orchestrator-neutral 的 domain/contribution factory 与 disposable handle 行为：direct
consumer object、单一 owner、generation fence、明确 ready/error、幂等 async dispose。精确类型名
先保持 package-internal；同一 factory 必须能被静态 GUI entry 直接 mount，也能由 private
Extension Runtime 包装。

Module Update Source 与 Extension Runtime 分开：

- Browser adapter 使用 Vite/dev HMR 和 literal/generated loader map；
- Deno Desktop adapter 只使用 Deno 支持的 ESM/watch/HMR 或明确 full-restart handoff；
- source 只交付 build-known candidate factory/generation，不发布 UI、不换 Session；
- Extension Runtime 只管理 trusted in-process scope/child/effect/dependency/restart/dispose；
- SillyMaker Composition/Host 继续拥有 candidate admission、consumer ack、atomic cutover 与
  predecessor retirement。

用同一 conformance suite 和两个真实消费者比较两条行为实现：

1. 当前 package-internal direct lifecycle baseline；
2. 只取 Cordis core 能力的 private adapter。

suite 覆盖 single-flight、failure/retry、late result、sibling isolation、nested child ownership、
reversible effect、selected in-process service dependency loss/recovery、per-extension restart、
reentrant/async cleanup、diagnostics、candidate failure 保留 predecessor、listener/timer/
subscription 残留；
DevDock contribution 与一个现有 Studio workspace implementation 分别提供 GUI 纵切。command、
selector、reducer、render 和 frame path 在 ready 后只持有 direct object，不查 Context/registry。

同一 suite 还必须证明：required domain 缺失在 composition admission 阶段失败；required local
binding 在 dependent domain mount 前唯一确定；optional contribution 缺席、失败或 retry 不影响
无关 sibling。这里的 in-process dependency loss 不包括外部 RPC availability、任意 provider
自动择优/替换、public service locator 或通用依赖树自动重建。required readiness/fail-fast 由
Application Host 判断，不能把 backend 的 pending/active 状态直接当成产品状态。Cordis 的
`emit`/`parallel`/`serial`/`bail`/`waterfall` 等 dispatch primitive 即使被 backend 使用，也只是
实现细节；AR1 不冻结全局 event taxonomy、priority/plugin-ID 排序、`next()` 或 authoritative
interception 合同。

选择同时比较：

- 行为覆盖和可达 failure recovery；
- 自研 ownership/state-machine/glue 与 mutation-sensitive test 成本；
- vendor patch/fork delta、诊断与调试成本；
- Browser/Deno Desktop platform coupling；
- entry/preload/lazy bytes、startup 与 repeated activate/dispose。

AR1 关闭时必须选择并只保留一个 production backend：

- direct 足够简单时保留 direct；
- Cordis core 语义明显降低长期编排成本时，可采用 pinned vendor；
- 需要有限裁剪/修正时采用 SillyMaker-owned fork；
- 只需要少数机制时吸收到 private implementation。

这些是胜出路线的源码所有权选择，不是三套永久 backend。删除输家；领域合同、public
declarations 和普通静态 game graph 中不得残留 Cordis/Context。Cordis Loader、Include、Node
HMR、目录扫描、远端 code 与 public Mod resolver 不进入比较。

同时迁入现有 DevDock lazy contribution 和一个 Studio workspace：metadata 可常驻，
implementation 第一次进入前 loader 调用为零；failure 不卸载 core、Session、Authoring Host 或
已加载 sibling。ordinary no-extension game build 必须完全排除 selected dynamic runtime backend。

### AR2 — Structured Scene authoring operations

在嵌入 shell 前先让人类与 non-UI 开发/测试 caller 共享可审查编辑语义。Scene 第一刀至少覆盖：

- 一个连续编辑（例如 placement/scale，可 gesture coalesce）；
- 一个结构编辑（例如 add/remove entry）；
- 一个引用编辑（例如 bind/clear cue motion）。

每个 operation 是可序列化、带自己的 schema revision、strictly admitted 的领域 record；执行
envelope 另带 exact current document identity 与 expected monotonic draft/session revision。pure
reducer 只接收 document + operation，返回 next document 或稳定 diagnostic，不持有 IO、Session、
HMR 或保存能力。相同输入必须得到 canonical bytes 相同的文档。

成功 operation 通过现有 document session 形成一个 undo step；同一 drag/run 可显式 coalesce。
每个成功编辑、undo/redo、reload、discard 或 document successor 都推进 draft revision；晚到
operation 若 document identity 或 expected revision stale，必须在 reducer 前原子拒绝。unknown
schema revision/kind、非法 payload、缺失 target 与 stale envelope 都保持 draft/dirty/undo/redo
不变。

Scene UI、non-UI local/dev adapter 与 auxiliary headless conformance 调用同一 executor；这些
adapter 只接收当前 document identity、expected draft revision 和 admitted operation，不接任意
文件路径/`FilePort`。未来 RPC caller 也必须经产品 adapter 进入同一 operation。本切片不做
跨文档事务、TypeScript AST 修改、operation log persistence、MCP/ACP/Harness ABI 或全局
command/event bus。

### AR3 — Embeddable Authoring Host and stable sibling lifetime

从现有 Studio 抽出一个 Host + workspace manifest；保留已有 Project Authoring Index、shared
session、dirty navigation gate、undo/redo、diagnostics、selection、preview、CAS 和 HMR
publication，不重写这些内核。

- 现有 `/__sillymaker/studio/` 先改为同一 Host 的 standalone wrapper；
- Engine Lab 增加一个最小、真实的 scene-managed conformance document 与对应 Studio binding；
  该文档是这条 scene 的唯一 authoring source，不使用隐藏 test-only document；
- Engine Lab 在此基础上增加最窄 dev-only embedded author surface，按需激活同一
  Authoring Host/workspace，并作为 AR4 UiArtifact 纵切的 conformance shell；
- 两个 shell 消费同一个 session factory、workspace implementation 和 source IO；不得复制
  dirty/undo/save/conflict 状态机；
- Agent/RPC 完全缺席时，Authoring Host、project navigation、draft、undo、save 和 workspace
  仍完整可用；
- R1 presentation/tool/workspace successor 与其他 sibling Application Domain 的 R2 authoritative
  successor，其 success、failure、rollback 都不能重建 Authoring Host，不能丢 document identity、
  dirty draft、undo/redo、selection 或 workspace state；游戏 conformance 必须覆盖 Game/Session
  successor；
- draft 操作、undo/redo、discard 在 save 前不改变 live application digest；CAS success 仍经
  file write → Module Update Source → SillyMaker publication；
- 409 刷新 saved/digest 并保留 draft；failed workspace load 不丢 predecessor；
- embedded surface 的 focus/input 归现有 Host/Surface authority，editable keyboard 不泄漏给
  gameplay；关闭 dirty workspace 仍给 save/discard/cancel；
- layout-sensitive workspace 必须显式等待 connected mounted/readiness，不把 detached React
  layout acknowledgement 冒充 connected geometry；
- Browser 与 Deno Desktop 均验证 GUI Host/lifecycle；Deno 证据不得冒充 Desktop source-write、
  persistence 或 packaging production promotion。

普通静态 game build 中 Authoring Host、workspace implementation、dev endpoint 和 source-write
IO 必须完全缺席。未来重型 code editor/index worker 可以另立 lazy workspace，但本切片不建设
通用 IDE、browser TS compiler 或 VS Code extension host。

### AR4 — Experimental Agent RPC and UiArtifact seam

这一刀只验证中立 GUI/RPC 合同，不接真实 backend、LLM 或 OpenUI，也不宣称稳定 public ABI。

- 用 deterministic fake transport 实现同一个 typed RPC client port，证明
  connect/status/start/submit/cancel/stream/reconnect；
- required service 未配置、连接慢、离线或失败时，Agent domain 不得报告 ready；shell、
  Authoring Host、配置/诊断/retry GUI 仍可使用，startup 不等待网络；
- cancel/dispose/successor 后的迟到 event 由 generation fence 丢弃，重连不重复提交 chunk；
  local dispose 不宣称撤销 remote effect；
- cross-process records 按 untrusted data 做 exact shape、size/depth、sequence admission；
- `UiArtifact` 只允许 package-owned 的封闭 data-only component kinds 与产品显式允许的 action
  IDs；unknown node/action 原子拒绝整个 successor，任意 HTML/JS/React component/function/
  module URL 或 executable payload 一律不进入 renderer；
- partial stream 只形成 transient draft；只有完整 admitted document 能产生 immutable
  `UiArtifact` revision，非法完成不替换上一份有效 revision；
- renderer 只读消费 revision；交互产出 admitted `UiIntent`，不得自动写 State、文件或网络；
- Agent 发起 Scene 修改走 AR2 operation；gameplay automation 继续走现有
  `AgentGamePortV1`/semantic intent；RPC 不是 plugin，也不取得 `FilePort` 或 Session writer；
- 重新打开 revision 不重新调用模型或执行 tool。

Engine Lab 的 dev-only embedded Host 必须在 AR3 同一 conformance document 上跑通：fake RPC
stream → bounded `UiArtifact` → render → admitted `UiIntent` → AR2 Scene operation。unknown
node/action、stale operation 与 cancelled late event 的 GUI 证据都保留 predecessor Artifact 和
draft。纵切只修改 in-memory draft，不触发 save/CAS、authoritative commit、真实网络或 external
effect。

这些形状在真实第二消费者前保持 experimental/package-internal，不泄漏 DeepSeek Harness、ACP、
AG-UI、OpenUI、A2UI、Cordis 或具体 RPC implementation 类型。本切片不实现 backend service、
conversation/task/artifact storage、permission UI、Mutation gateway 或 Effect Broker。

### AR5 — Build, GUI Host, and performance promotion

把 AR0–AR4 作为 Browser + Deno Desktop 产品依赖图验证，而不是只跑 unit/headless tests：

- static shell 先出现；optional loader、RPC fake、网络和非关键资产不阻塞不依赖它们的 first
  action；
- required RPC failure 保留 configuration/recovery GUI，依赖 domain 不谎报 ready；
- Browser 跑通 Vite candidate、activation double-trigger、failure/retry、close/late result、
  input/focus、standalone/embedded parity、dirty draft across HMR 与 connected readiness；
- Deno Desktop 跑通 bootstrap CLI config、同一 domain factory、selected Extension Runtime、
  RPC failure/retry 和至少一个真实 build-known candidate flow；若只能 full restart，明确验证
  R3 handoff，不把它写成 local reload；
- 两平台都证明 R1 presentation candidate，以及其他 sibling Application Domain 的 R2 candidate，
  其 success、failure、rollback 均保留 Authoring Host identity、document、dirty、undo 和 selection；
  游戏 conformance 必须覆盖 Game/Session candidate；
- 在 in-flight fake Agent session/stream 下，两平台的 R1 presentation 与其他 sibling
  Application Domain 的 R2 successor，其 success、failure、rollback 都保留 Agent Host/session
  identity；游戏 conformance 必须覆盖 Game/Session successor。其他领域换代不得 cancel、
  reconnect 或重建 Agent；任何 domain-bound late intent 必须针对 current generation 重新
  admission 或稳定拒绝，不能落到 stale domain authority；
- 两平台都跑通 AR4 fake stream → admitted Artifact → render → intent → AR2 operation；
- ordinary static game build 精确排除 Authoring Host、selected dynamic extension backend
  （包括可能的 Cordis/fork）、unrelated RPC client、Node/Electron code 和 author-only graph；
- auxiliary headless 只补 deterministic/conformance evidence，不替代 GUI acceptance；
- Engine Lab prebuilt、相关 runtime/author builds、bundle report、Story checks、Save/replay
  corpus 与 canonical `deno task check` 全绿；
- 同机交错 fresh-context A/B 至少五组；first actionable median 同时回退超过 10% 且超过
  50ms，并在第二次独立 run 重现时停止；数值仍是本机 promotion evidence，不进普通 CI；
- stable command paired median 回退超过 10%，或 command/render hot path 出现 lifecycle lookup
  时停止；
- repeated activate/dispose 后不得遗留 listener、timer、subscription、RPC connection 或 late
  publication。

本 gate 不提升 Deno Desktop persistence、packaging、signing、auto-update 或三个 OS 的
production claim；这些继续由独立 Desktop lane 拥有。

### AR6 — Closure and owner checkpoint

- 删除被替代的 lifecycle backend、monolithic shell glue 和重复 adapter；standalone route 若仍
  提供价值则保留，不为“零旧文件”而删；
- 记录 AR1 最终选择 direct、pinned vendor、owned fork 或 absorbed implementation 的理由、
  semantic delta、license/notice、no-extension build 与升级策略；
- 只更新已经成为 live 的 architecture/features/development/story-authoring/build/quickstart；
- Engine Lab 手册随真实 consumer 更新；template/examples handbook 只有实际进入后续计划时才
  更新；
- 记录 Browser/Deno Desktop 已验证边界，以及仍未满足的 Desktop production、真实 RPC/
  backend、public Mod、connected geometry 和 source-write 限制；
- 把下一轮作品、examples 或产品 evidence 的选择交还 owner；本计划不预列名称、数量和顺序。

本计划完成不自动把 Composition/State/Extension Runtime 变为 public Mod runtime，也不自动激活
任何 deferred lane。

## 3. Stop conditions

仅在以下可观察边界出现时停止并请求裁决：

- 第二个 Gameplay Session、State、digest、queue、CommandLog、Stage reconciler、source document
  writer 或可变配置权威；
- Extension Runtime 自行发布 UI、替换 Session、执行 migration，或获得 source/RPC authority；
- Authoring Host/Agent/UiArtifact 绕过 structured operation + CAS 修改 source，或绕过 typed
  semantic/domain intent 修改 gameplay；
- RPC 绕过 admission、把 remote service 当 plugin，或向外部服务暴露 raw Session writer、
  `FilePort`、DOM/source authority；
- required service failure 导致白屏，或 GUI 在服务不可用时谎报依赖 domain ready；
- Studio、dev endpoint、source-write IO、dynamic extension backend、未选 RPC adapter 或
  compiler 进入普通 static game release；
- Module Update Source 需要任意 runtime path、远端 executable code、`references/`、目录或
  `node_modules` 扫描；
- AR1 只有同时保留 direct 与 Cordis 两套 production backend 才能通过，或 backend 类型泄漏到
  domain/public declaration；
- 需要 Cordis Loader/Include/Node HMR、Node/Electron implementation、public Mod ABI/SDK/
  distribution、runtime code install 或不可信 sandbox 才能完成；
- 两个平台无法隐藏在同一 Module Update Source candidate contract 后，且最窄 adapter 仍无法
  保持 authority；
- activation/reload 丢失 dirty draft、跨 generation 发布 stale result，或 cleanup 产生残留；
- Save/digest/replay/State authority 必须改变却没有独立兼容理由与 migration plan；
- 需要 State Format V2、production Story State migration、Effect Broker、Desktop production
  promotion、Player source editor、真实 backend 服务或通用 IDE 才能完成；
- 两个真实消费者对拟公开合同有矛盾需求；
- measured baseline 触发 AR5 性能门且最小归因修复仍需扩大范围；
- bootstrap CLI config 在启动后成为 mutable runtime bus，或改变既有 build profile 含义。

私有 helper/API 命名、文件拆分、状态机内部表示、test decomposition、loader map 生成方式，以及
AR1 胜出路线的 vendor/fork/absorb 所有权选择不是 stop condition；选择最简单可验证实现继续。

## 4. Deferred and follow-on evidence

本计划不实现：

- 任何尚未由 owner 单独接受的小作品、examples 重写或商业 workload；
- 真实 Agent/LLM/backend service、具体 RPC protocol、conversation/task/artifact persistence；
- OpenUI/A2UI renderer、permission UI、capability receipt、Effect Broker 或不可逆 tool workflow；
- public Mod resolver/ABI/SDK/distribution、plugin marketplace、post-release arbitrary code
  install；
- Cordis Loader/Include/Node HMR、Electron/Node product Host、不可信 code sandbox；
- Player/UGC source editor、通用 IDE、browser TS compiler 或 VS Code extension host；
- 通用 WindowManager/Application OS、全局 typed event bus/interceptor；
- generic content compiler、data/UI/timing/save editor；
- State Format V2、production Story State migration、Desktop source-write/persistence/package/
  signing promotion 或新 genre pack。

AR6 后由 owner 单独讨论候选作品或产品。外部 workload 先保留 product-local implementation 和
痛点记录；同一需求只有在独立 consumer 重复出现、能在 Engine Lab 最小中性复现、owner/authority
明确且 focused behavior/build/performance evidence 成立后，才成为 engine candidate。整件作品、
商业内容、资产和 fixture 不进入本仓 conformance。

AR1 关闭并完成 private extension backend 的首次选择后，后续作品只验证选择是否继续成立，
不自动激活 public Mod。public Mod 仍必须满足 roadmap 的独立 activation gates 和新的 active
plan。

## 5. Validation entrypoints

每个切片先跑 changed behavior 的 focused unit/GUI/build tests，再运行受影响的 broader gate。
计划级关闭至少包括：

- `deno task check`；
- Browser 与 Deno Desktop 的 runtime/author GUI flows；
- Engine Lab prebuilt、现有 Studio representative Chromium + WebKit flows；
- auxiliary headless deterministic/conformance tests；
- affected Story checks、simulate digest 与 Save/replay corpus；
- runtime/author/no-extension build dependency graph 与 bundle report；
- AR0/AR5 startup trend、AR1 direct/Cordis A/B evidence、activation cleanup 与 stable-command
  negative control；
- public declaration closure（不得出现 Cordis/Context、Node HMR、backend 或协议实现类型）。

原始 timing、heap、bundle diagnostics 与 external workload reports 继续只写 OS temp/artifact，不
提交机器结果或绝对路径。计划完成后才由 owner 的下一轮 evidence 决定哪些 provisional seams
可以升格。
