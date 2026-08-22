# Application Runtime and Embedded Authoring V1

状态：2026-08-18 由所有者接受为下一条默认/core implementation lane，并在同日以补充 owner
evidence 收紧产品与平台边界。AR0–AR4 已于 2026-08-22 交付关闭，AR5 是唯一下一项；
AR5–AR6 尚未启动。引擎能力扩展全部前置；本计划完成后的作品、examples 或产品验证由所有者
另行选择和立案，不是本轮切片或完成 blocker。

目标合同由
[Application Runtime and Embedded Authoring](../design/application-runtime-and-embedded-authoring.md)
拥有；既有 Scene/Motion/文档会话领域合同继续由
[统一创作架构](../design/authoring-architecture.md)与
[场景创作模型和 Studio](../design/scene-authoring-and-studio.md)拥有。
[Production-floor sequence](2026-07-30-production-floor-sequence.md) 仍是唯一跨计划排序入口。
`codex/promote-composition-state-runtime` 的 curated tree 是实施基线；本计划不继续扩张
State/Composition。AR1 已用同一 17-case suite 完成 private Direct 与 Cordis-core-derived A/B，
选择 SillyMaker-owned Direct implementation，并删除 Cordis adapter、vendor 与依赖；它没有激活
public Cordis API 或 Mod runtime。

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

AR1 进入时的 live baseline 说明缺口位于 Host、activation 和 lifecycle，而不是 State 热路径：

- Composition/State 实验已通过唯一权威、Save/replay、locality 与性能门；没有 production Story
  需要 State Format V2；
- 实验最初的 Cordis wrapper 只包了平面 mount/dispose，retain/remove checkpoint 只能证明那种
  用法没有价值，不能回答 nested ownership、provider recovery 或大型 editor workspace 的成本；
- DevDock 当时已有 `loadDevDockContributions()` 动态 import 的真实 first-party lazy 纵切，但
  loader 尚未成为带 single-flight、retry、late-result fence 和 disposal 的一般内部合同；
- `@sillymaker/studio` 当时已有 Project Authoring Index、共享 document session、dirty gate、
  undo/redo、CAS、Scene/Motion/Flow workspaces 与原子 HMR publication，但 shell 仍静态导入
  workspaces，产品形态仍是 dev-only 独立页面；
- `AuthoringDocumentSessionV1` 统一了文档会话，却只公开整文档 `replaceDraft`；Scene UI
  仍以 clone callback 表达编辑，未来 Agent/RPC caller 无法复用同一 typed operation；
- AR0 启动前的 build benchmark 已报告 entry/preload/lazy/all JS/CSS/assets，但尚缺稳定的
  shell-visible、recovery-actionable、first-actionable、required-ready 与 optional-ready 信号；
- 现有 `AgentGamePortV1` 是 player-safe gameplay semantic automation，不是 LLM/后台 RPC、
  authoring 或 Artifact port，不能扩成万能接口。

本轮裁决：AR0 先建立 GUI startup/target 地板；AR1 再建立中立 domain factory，并用同一 suite
比较 direct 与 Cordis-core-derived lifecycle。Direct 覆盖所需语义且保持最小私有依赖图，因此
成为唯一 backend；后续依次落 structured operation、embedded Authoring Host 和最窄 Agent
RPC/UiArtifact seam。Module Update Source、Extension Runtime 和 SillyMaker
publication/authority 必须继续分层。Cordis 的 release 标签不是选择理由；实际语义覆盖、
glue/test 成本、bundle placement 和 failure recovery 才是选择证据。

“使用 lifecycle/plugin 机制”不表示能力一定 optional。AR1 以 package-internal composition
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
  composition、RPC client、transport、fake API 或 service configuration UI；required domain/local
  binding composition 已由 AR1 拥有，外部 RPC 与 service configuration 分别留给 AR4 与 AR5。

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
- AR0 当时的 reload 边界已如实分类：Browser Studio 的 admitted document/CAS refresh 是 R0，binding/
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

AR1 selection gate 当时要求并已做到只保留一个 production backend：

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

**AR1 closure（2026-08-22）：**

- `@sillymaker/composition/internal/extension-runtime` 交付 package-internal neutral factory、direct
  mount、required-domain/local-binding admission、bound owner、activation controller 与 disposable
  handle；成功后 hot consumer 只持有 direct object，不查询 Context 或 registry；
- private Direct 与 Cordis-core-derived adapter 曾通过同一 17-case conformance suite。比较覆盖
  required admission、single-flight、显式 failure/retry、late-result fence、optional sibling
  isolation、nested child/reversible effect、provider loss/recovery、async/reentrant cleanup、
  predecessor retention 和 repeated cleanup 资源归零。Direct 已被选为唯一 SillyMaker-owned
  backend；Cordis adapter、vendor、workspace dependency 与 lock entry 已删除，领域/public contract
  中没有 Cordis/Context 类型；
- lazy DevDock 是第一个 GUI consumer：resident Story/Web 图只保留 literal loader；首次
  `debug_tools` 前调用为零，同一次 open single-flight、ready 复用，失败保留 core/static sibling 并
  给出 bounded diagnostic 与显式 retry。revoke/source change/unmount fence 迟到结果；已发布
  contribution 先从 visible consumer 移除，再 retire lifecycle。optional-ready 仍只在 active
  registry acceptance 后确认，不把 backend ready 冒充产品 ready；
- Studio Flow 是第二个 GUI consumer：resident Studio shell 只保留 metadata、launcher 和 literal
  loader，首次点击“打开 Narrative 流程”才加载 dynamic facade；facade 同时引入 Flow
  implementation 与 selected Direct backend。standalone Studio 在 descendant unmount 后 retire，
  live publication 的外层 owner 跨 rejected/accepted binding successor 复用已 ready Flow，并保留
  共享 authoring session、dirty draft 和未受影响的 Scene/Regions sibling；
- Template 的 ordinary no-extension final graph 中 dynamic-extension implementation 为零；Engine
  Lab 的 selected backend 只归因到 lazy DevDock contribution outputs，不进入 entry。该证据证明
  placement/exclusion，不宣称跨机器 timing 或固定 bundle 数字；
- 本切片没有改变 State、Snapshot、digest、Save、CommandLog、replay、RPC 或 Mod 合同，也没有
  新增 Desktop Module Update Source。Browser 继续使用 AR0 已记录的 R0–R3 边界；Deno Desktop
  R0–R2 仍未接线，`--hmr` 仍只是 AR5 候选。AR2 structured Scene operations 当时是唯一下一项。
- 收尾追加 React Doctor `0.9.12` changed scan，以 `de6bea30` 作为 AR1 精确起点。唯一真实 error
  是 DevDock 在 render 中发布 `debugTools` ref，abandoned successor 可把未提交 capability 泄漏给
  predecessor loader；现已改为 layout-commit publication，并由 Suspense abandoned-render 回归
  证明。最终为 0 errors / 3 warnings：两个 warning 是必须保持 LIFO、non-overlap 的串行 cleanup，
  另一个是既有 Studio shell ownership 重构提示，均不在 AR1 中机械改写。

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

**AR2 closure（2026-08-22）：**

- Studio 新增 package-private `scene-operations` seam。revision 1 operation 覆盖 placement、entry
  add/remove、z-order、appearance、ambient motion、cue add/remove 与 cue motion bind/clear；严格
  admission 拒绝 getter、额外字段、unknown schema/kind 和非法 payload。operation 与 executor
  未加入 `@sillymaker/studio` package export，因此不是 public ABI 或远程协议；
- pure reducer 只接收 admitted Scene document + operation，结构结果统一再经
  `parseSceneDocumentV1`，并以 canonical bytes 拒绝 no-op。entry remove 原子级联其 cue；cue
  motion 操作完整拥有 presentation edge，bind motion 清除 `cut`，clear 同时清除 motion/cut，保持
  两者互斥；
- 既有 `AuthoringDocumentSessionV1` 增加 session-local opaque document-successor identity、单调
  draft revision 与 `replaceDraftIfCurrent`。open/refresh/document successor、成功编辑、undo/redo、
  discard 都按实际 successor 推进 revision；stale identity/revision 在 reducer 前拒绝，reducer
  完成后的第二次 conditional replace 再封住并发 successor。失败和 no-op 不改变 draft、dirty、
  history 或 revision；
- Scene canvas、inspector、construction 与 cue/motion binding 全部改走同一个 local adapter/executor。
  UI envelope 使用与其渲染 draft 匹配的 identity/revision receipt；canvas gesture 只沿自身成功
  operation 返回的 revision 前进，遇到 sibling edit 就 stale-stop，不能在 dispatch 时重采 fresh
  receipt 后覆盖并发修改。placement、z-order、appearance 只有在同一 focus/gesture run 内才以显式
  key coalesce，run 起始 revision 保证 blur/focus 与 React/HMR remount 后进入新的 undo step；结构与
  引用 operation 永不 coalesce；
- non-UI caller 只取得当前 receipt 与 `execute`，不能取得 path、`FilePort`、保存或 HMR 能力。异步
  motion file create 捕获开始时的 receipt；若等待期间 draft 已推进，文件保留但不会自动绑定到新
  successor。selection 与未完成 numeric input 在 undo/redo、文档切换和 pending save 边界按当前
  draft 对齐；试穿预览仍是明确的 ephemeral render override，不伪装成作者文档编辑；
- AR2 顺带修复两条现有 document-session currentness 缺陷：pending save 完成时不再覆盖等待期间的
  新 draft/history；旧文档 refresh 结果也不能与其后 open 的 document identity/path/saved digest
  混合。保存先前 revision 后若仍有新编辑，Studio 保持 dirty 并明确提示；
- focused admission/reducer/executor、document-session 与 Studio UI 测试覆盖连续、结构、引用、
  coalesce、undo/redo、stale、pending-save 和 refresh/open race。真实 Browser Studio 另验证非法
  scale 原子拒绝并失焦恢复、合法后续编辑清除旧错误、cue motion bind/undo，以及 entry remove
  级联/undo。最终 focused suite 为 5 files / 59 tests，`deno task check` 为 342 files / 5459 tests、
  5 项 composition/state bench、全部 Story check 与 E2E production build 通过，Template Chromium
  为 7/7；React Doctor changed scan 为 0 error / 1 个与切片起点 `40819d25` fingerprint 相同的既有
  `StudioApp` `prefer-useReducer` warning，留待 AR3 Host/workspace 拆分自然处理。这里没有新增第二
  State/Save/IO authority、RPC、Mod、operation persistence 或 Desktop Module Update Source。AR3
  embeddable Authoring Host 是唯一下一项。

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
- layout-sensitive workspace 必须显式等待所需 mounted/readiness；document-connected offscreen
  staging 的 layout acknowledgement 不得冒充 user-visible paint 或精确 on-screen geometry；
- Browser 与 Deno Desktop 均验证 GUI Host/lifecycle；Deno 证据不得冒充 Desktop source-write、
  persistence 或 packaging production promotion。

普通静态 game build 中 Authoring Host、workspace implementation、dev endpoint 和 source-write
IO 必须完全缺席。未来重型 code editor/index worker 可以另立 lazy workspace，但本切片不建设
通用 IDE、browser TS compiler 或 VS Code extension host。

**AR3 closure（2026-08-22）：**

- `@sillymaker/studio` 已抽出一个 package-private Authoring Host；它唯一拥有共享 Scene/Regions
  document sessions、Motion store、Flow activation、close participants 与 Host snapshot。closed
  workspace manifest 只描述 resident Scene/Motion/可选 Regions 和 progressive Flow，不是 public
  plugin registry。standalone `/__sillymaker/studio/` 与 dev-only embedded shell 由同一 Host
  factory/contract、workspace/session implementation 和稳定 source IO contract 支撑；每个 shell
  mount 拥有自己的 Host lifetime，独立浏览器 tab 不伪装成共享内存实例，但没有复制状态机。
  Agent/RPC 为零时全部创作能力仍可用；
- R1 publication 不再用替换 visible React root 保存状态。它保留一个 persistent visible root，
  candidate 先在 inert、`aria-hidden`、visibility-hidden、offscreen 但 document-connected 的 staging
  root 完成 layout acknowledgement；connected layout failure 在触碰 visible root 前拒绝，accepted
  candidate 再进入同一 root，保留 exact Host/DOM 和兼容的 component-local editor state。同步
  visible render-factory failure 可重渲 predecessor plan 而不替换该 state，factory/rollback 双失败
  才 terminal dispose；该窄证据不宣称任意 nondeterministic visible effect 都可无损 rollback，也不
  把 connected staging 冒充 user-visible paint/精确 on-screen geometry；
- embedded surface 由 dev page 的 lightweight resident launcher 首次打开后加载，关闭 dirty
  Scene/Regions/Motion 统一给 save/discard/cancel；仅隐藏/重开不销毁 Host。Scene、Regions 和 Motion
  的 409/`digest_conflict` 都刷新 saved bytes/digest 并保留 draft/history 供 retry。独立
  application-focus owner、native-text scope 与 pointer/context-menu/wheel fencing 使 active Narrative
  下 focused editor 的 `KeyA` 和 author chrome 的 secondary input 不泄漏给 gameplay；
- Engine Lab 新增真实 `src/scenes/procedure/procedure.scene.json` 与 Story Studio binding；runtime
  通过 `sceneFromDocument` 消费同一文档，不存在隐藏 test-only authoring model；其真实
  `cue.e2e.alpha-enters` 也为 Host Motion workspace 提供 conformance case。原先挂在 Game root 的
  重复可写 DevDock Workbench 已删除，舞台溯源面板保持只读，避免 `debug_tools` 撤销、Game R2
  或 R3 unmount 绕过 Host dirty gate。embedded Host 在
  explicit Game/Session restart 的 success 和 replacement 前 `runtime.anchor_failed` 下均保留 exact
  Host、document identity、dirty、undo/redo、selection 与 DOM/input identity；
- Engine Lab Vite identity owner 在 composition module 注入 live collector 的真实 `BuildIdentity`，
  普通 owned Scene/simulation R2 变化折叠到 invalidated、literal-self-accepting composition
  candidate；若原始 changed module 的 live importer graph 同时到达已加载 Studio binding，则只额外
  保留该 exact module 让新 bytes 进入 Authoring R1，其他深层 module 仍被过滤。Web composer 在同一
  Vite boundary 的 path compare 与 module-graph lookup 统一规范化，Windows separator 不会绕过
  injection/candidate lookup。Web composer 在同一 Host/root 完成 R2 persistence handoff 与
  Game/Session successor，再由 successor 安装下一代 boundary。application-only 变化保留
  Vite/Fast Refresh 的正常传播；若它到达
  composition 但 R2 tuple 未变，则明确请求 R3，不静默吞掉更新。Chromium 与 WebKit 的真实物理
  Studio-binding R1 edit 均在零 page load 下保留 dirty Host DOM/identity、selection、input 与 undo；真实
  Scene/Motion CAS 均在零 page load 下换代 Game application epoch，并保留 sibling Authoring Host；
  共享 `presentation.ts` edit 在同一次物理变化中分别到达 Game R2 与 Authoring R1，仍保留 exact
  Host/draft/selection/undo。focused Playwright 为 10/10，teardown 等待 reverse update 后逐字节恢复
  源 Scene、Motion、binding 与 presentation；
- 这不是 Game predecessor 的 transactional rollback 承诺：当前 Web R2 在 replacement 前失败会
  保留现有 anchor，但已 retire predecessor 后若 successor start 失败进入 terminal recovery，不
  恢复 gameplay predecessor。Authoring 作为 Game root 外 sibling 仍不被重建；文档只记录实际
  failure boundary，不把它扩大为不存在的 rollback；
- ordinary production graph 精确排除 Authoring Host/workspaces、Studio binding、embedded-author
  virtual entries、dev-source endpoints 和真实 source-write client。`@sillymaker/ui/debug/dev-source-client`
  只有 `development` conditional export 指向 fetch/CAS implementation，default/release 指向
  fail-closed unavailable stub；Engine Lab release 仍只把 selected Direct backend 归因到 lazy
  DevDock contribution，而不是 entry；
- macOS arm64 / Deno 2.9.5 的原生 `deno desktop` common-runtime smoke 已从最新 Engine Lab
  static Player 证明 GUI ready、权威操作、同窗口 Game/Session restart、restart 后继续操作，以及
  native close acknowledgement 后 `auto.current` flush 与正常进程退出。该证据没有装入 embedded
  author、source CAS、R0–R2 update source 或 `deno desktop --hmr`，也没有验证 packaged artifact、
  多平台或 crash durability；这些留给 AR5 或单独的 Desktop Module Update Source / persistence
  lane，Desktop packaging、signing 与 production promotion 均未提升；
- React Doctor `^0.9.12` changed scan 最初确认 Motion close participant 会随每次 draft edit
  注销再注册，令 Host aggregate dirty 可能瞬时 `true → false → true`；participant 现按 session/source
  lifetime 稳定注册，实时读取当前 session draft/validation，并由回归测试锁定 dirty 期间零 clean
  闪烁。复扫为 0 error / 4 warning；剩余 JSON clone 是既有 schema-admitted plain-data test fixture，
  两个 `prefer-useReducer` 命中既有且生命周期独立的 state cluster，Scene numeric field 命中则是保留
  half-typed text 与 revision currentness 的受控 buffer，均按代码与既有行为测试判定为非本切片缺陷；
- 本切片没有新增第二 State/Session/Save/source authority，没有改变 Snapshot、digest、CommandLog
  或 replay，也没有激活 RPC、Agent、UiArtifact、Mod、code editor 或 Player source editor。AR3
  交付时 experimental typed RPC/UiArtifact seam 是唯一下一项；它现已由下节 AR4 交付关闭。

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

**AR4 closure（2026-08-22）：**

- 新增 workspace-private `@sillymaker/agent`，且唯一 package entry 是 `./internal`。它以一个
  observable client port 表达 `connect/status/start/submit/cancel/reconnect/dispose`，同一 port
  由 deterministic fake transport 实现；fake 的 `unconfigured/slow/offline/failed/ready` 状态、
  可控 slow settlement、逐连接 late-record injection、请求计数和 close 计数使 lifecycle/failure
  行为可重复验证。这里没有真实网络 adapter、provider SDK 或 wire-protocol compatibility 承诺；
- RPC request、response 和 stream record 在边界投影成 getter-free canonical data，并做 exact shape
  admission。单条投影上限为 65,536 bytes、depth 16、2,048 nodes，identifier 最长 128 chars，
  submit/chunk text 最长 8,192 chars；每个已提交 run 只接受从 1 开始的连续正安全整数 sequence。
  run identity 是 `(sessionId, runId)`，不同 session 可以合法复用同一 `runId`；raw protocol adapter
  必须保证 admitted submit response settle happens-before 该 run 的首个 stream record，若 wire frames
  反序到达则由 adapter bounded reorder。duplicate、gap、unknown tuple 和非法 record 只产生稳定
  diagnostic，不交付给 Host。connection generation 加 lifecycle epoch 丢弃旧连接、slow-connect
  dispose 和 reconnect 后的 late record；request failure 后的 replacement connect 先关闭 predecessor
  connection，reconnect 不重提既有 request/chunk，本地 dispose 只关闭本地 connection，不声称回滚
  远端 effect；
- 一个 observable Agent Host 作为独立 sibling owner 持有 readiness、session、active run、transient
  draft、diagnostic 与本地 Artifact revision history。取消先把 active run/draft 切为
  `cancel_requested/cancelled`，随后到达的 stream 不再匹配 active run；旧 run 的迟到 event、
  dispose 后 event 和非法完成都不能覆盖已接受 predecessor。draft 限 65,536 UTF-8 bytes，最多
  保留 16 个 immutable Artifact revisions；重开 retained revision 只切换本地指针，不新增 RPC
  request、模型调用或 tool；remote `run_failed` 同时把 active run 和仍在 streaming 的 transient
  draft 终结为 `failed`，后续 record 不再被接受；
- `UiArtifact` admission 先做 65,536-byte/depth-12/1,024-node canonical 投影，再限制封闭树为
  depth 8、128 nodes、每个 column 32 children、text/label 4,096 chars。唯一 node kinds 是
  `column`、`text`、`action`，node identity 必须唯一，action ID 必须来自产品 allowlist；任意 accessor、
  unknown kind/action、duplicate ID、HTML/JS/React/function/module URL 或超限 successor 原子拒绝，
  不替换上一份有效 revision。closed React renderer 把 payload text 当文字；它只发出带 exact
  Host identity、Artifact revision、node/action identity 的 `UiIntent`，current revision 再 admission；
- `@sillymaker/studio/internal/agent` 只为 Engine Lab 的 frozen Studio binding 附加 fake client factory
  和一组已 admission 的 AR2 Scene operations，没有改变稳定 `StudioBindingV1`。embedded Agent
  surface 不取得 Scene session、source path、`FilePort`、save、HMR、Game Session 或 State writer；
  每个 Artifact 只有先与 exact AR2 document identity/draft revision 配对后，其 action 才可交互；
  Artifact 先到而 Scene 尚未 ready 时保持 inert，后续 Authoring revision 使 Scene ready 后可以补配
  同一 Artifact。human edit 后的旧 intent 稳定返回 `scene_authoring.revision_stale`，不静默 rebase；
- Engine Lab 的 dev-only vertical slice 在 Agent service 初始 unavailable 时仍保持 Authoring usable
  和 retry actionable；随后跑通 fake stream → transient draft → admitted revision → closed render →
  admitted intent → captured AR2 Scene operation。unit/jsdom 与真实 Chromium + WebKit GUI evidence
  覆盖两份 valid revisions、stale operation、unknown node/action、cancelled late completion、panel
  隐藏/重开保留同一 Authoring/Agent Host 与 predecessor Artifact，并证明 source bytes/Scene IO
  writes、Game application epoch 和 page-load count 不变。Template 与 Engine Lab ordinary Player
  release measurement 显式断言没有 `engine/packages/agent/**` 或 RPC implementation module；这只证明
  两个 ordinary Player graph。当前 `@sillymaker/studio` manifest/source 仍静态依赖 Agent/internal
  surface，尚未证明一个功能完整的 authoring-only/no-Agent product graph 可结构排除 Agent；
- 本切片没有改变 authoritative State、Snapshot、digest、Save、CommandLog、replay、source CAS 或
  extension lifecycle，也没有实现真实 Agent/LLM/backend、具体 RPC protocol、Agent/session/artifact
  persistence、tool execution、permission/approval UI、OpenUI/A2UI adapter、Effect Broker、public Agent
  ABI、Desktop authoring/HMR 或 production promotion。AR5 build、双 GUI Host 与 performance
  promotion 成为唯一下一项。

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
- ordinary no-extension static game build 精确排除 Authoring Host、selected Direct dynamic
  extension backend、unrelated RPC client、Node/Electron code 和 author-only graph；
- 另建 authoring-only/no-Agent build measurement：它必须保留完整 Authoring Host/workspaces 而排除
  `@sillymaker/agent`、RPC client/fake 和 experimental Agent surface；当前 Studio/Agent 静态 package/
  source coupling 若使该 graph 不成立，AR5 在不改变稳定 Authoring contract 的前提下拆分依赖；
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

[Deno Desktop `--hmr`](https://docs.deno.com/runtime/desktop/hmr/) 只作为开发期候选 Module
Update Source。当前 SillyMaker static staging/packaging command 不传入也未集成该模式，AR0 的
Desktop baseline 仍只有 R3。AR5 若能在不扩张切片的前提下以真实 native dev launch 证明
build-known candidate/generation、R1/R2 publication/handoff 与 failure/rollback，可以一并领取；
否则 AR6 只记录 defer，由 owner 另行接受 Deno Desktop Module Update Source 专项计划。平台 flag、
plain-app live patch 或 framework Fast Refresh 的存在本身都不能升格为 SillyMaker R1/R2 合同。

### AR6 — Closure and owner checkpoint

- 删除被替代的 lifecycle backend、monolithic shell glue 和重复 adapter；standalone route 若仍
  提供价值则保留，不为“零旧文件”而删；
- 保留 AR1 选择 SillyMaker-owned Direct implementation 的理由、历史 A/B semantic delta、
  no-extension build 与升级策略；
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
- 未来重新同时保留 direct 与 Cordis 两套 production backend，或 backend 类型泄漏到
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

私有 helper/API 命名、文件拆分、状态机内部表示、test decomposition 与 loader map 生成方式不是
stop condition；选择最简单可验证实现继续。

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

AR1 已关闭并完成 private Direct backend 的首次选择；后续作品只验证选择是否继续成立，不自动
激活 public Mod。public Mod 仍必须满足 roadmap 的独立 activation gates 和新的 active plan。

## 5. Validation entrypoints

每个切片先跑 changed behavior 的 focused unit/GUI/build tests，再运行受影响的 broader gate。
计划级关闭至少包括：

- `deno task check`；
- 每个改变 React/TSX 的切片运行
  `deno task audit:react --base <slice-start-ref>`，逐条分类新增 findings；
- Browser 与 Deno Desktop 的 runtime/author GUI flows；
- Engine Lab prebuilt、现有 Studio representative Chromium + WebKit flows；
- auxiliary headless deterministic/conformance tests；
- affected Story checks、simulate digest 与 Save/replay corpus；
- runtime/author/no-extension build dependency graph 与 bundle report；
- AR0/AR5 startup trend、AR1 historical 17-case direct/Cordis A/B evidence、activation cleanup 与
  stable-command negative control；
- public declaration closure（不得出现 Cordis/Context、Node HMR、backend 或协议实现类型）。

原始 timing、heap、bundle diagnostics 与 external workload reports 继续只写 OS temp/artifact，不
提交机器结果或绝对路径。计划完成后才由 owner 的下一轮 evidence 决定哪些 provisional seams
可以升格。
