# Application Runtime and Embedded Authoring

状态：2026-08-18 由所有者接受的目标设计。SillyMaker 面向 **GUI 应用和游戏**；游戏继续
作为确定性 State、Save/replay、Presentation、输入、内容规模和创作体验的第一压力源。
当前产品 Host target 是 Browser 与 Deno Desktop；Electron 只保留未来 Host adapter 的位置。
后端服务、CLI 产品和 headless 产品不在目标内。实施顺序与验收由
[Application Runtime and Embedded Authoring V1](../plans/2026-08-18-application-runtime-embedded-authoring.md)
拥有；[Production-floor sequence](../plans/2026-07-30-production-floor-sequence.md)
仍是唯一跨计划排序入口。AR0–AR4 已于 2026-08-22 交付；AR5 build、Browser GUI Host、
lifetime/performance promotion 与 AR6 closure 已于 2026-08-23 交付关闭，下一条 lane 交还 owner
选择；下文明确
标注实现状态的部分才是 live capability，其他目标仍不因
设计存在而自动生效。

本文扩展[统一创作架构](authoring-architecture.md)与
[场景创作模型和 Studio](scene-authoring-and-studio.md)：Scene、Motion、Project
Authoring Index、共享文档会话、CAS、undo/redo 和 workspace 领域合同保持不变；
“Studio 只能是独立 dev 页面”是当前 V1 实现，不是永久产品边界。

## 1. Product position

SillyMaker 的下一阶段定位是 **game-first GUI application runtime**：

- 游戏继续提供确定性、Save/replay、表现、输入和真实内容规模压力；
- GUI 应用可以拥有自己的窗口、任务、文档、Artifact 和交互领域；
- authoring 可以嵌入应用，也可以由独立 Studio route 承载；
- Agent 产品可以把 Agent UI 与会话作为正式产品领域，但依赖的 LLM/后台服务在进程外；
- 可选 UI、workspace 和调试能力按需激活，不阻塞不依赖它们的核心产品；
- 共用的是 Application Host、Surface、authoring、typed intent 和生命周期机制，不是把所有
  领域塞进 GameSnapshot。

本文的 **Application Host** 是产品静态启动、核心 shell 与 application lifecycle 的中性 owner；
它承载一个或多个 **Application Domain**，但不因此取得 gameplay、authoring draft 或 Agent
session 的写权威。Application Domain 指有明确 admission、owner、lifecycle 与 authority boundary
的内聚产品领域；是否支持局部 successor 由该领域合同决定。Game Domain 只是其中一种，非游戏
GUI 产品不需要伪装成 Game。Authoring 与 Agent 可以成为产品选择的 Application Domain；
Authoring Host 与 Agent Host 分别是其创作会话和 Agent UI/session owner。这些词汇先表达
ownership，不提前冻结同名 public API。目标设计不再用 `Game Host` 指代中立宿主。

Browser 与 Deno Desktop 是当前正式兼容矩阵。Deno Desktop 是产品 target，不等于当前
persistence、packaging、签名或三个桌面平台都已经 production-ready；这些仍由独立 Desktop
promotion lane 逐项证明。Electron 只有真实产品需求和新 Host adapter 计划后才进入矩阵。
Node.js server、通用 CLI 和 headless runtime 不作为产品 target；Deno 的 Node compatibility 只是
依赖兼容能力，不是产品方向。

一个正式产品可以要求 Agent 或其他外部能力。例如 Agent-first 产品可以把 Agent client 和受控
`UiArtifact` renderer 作为 required product capability；普通游戏默认不包含它们。required
capability 不等于 in-process plugin：外部 LLM、配套后台和 companion service 统一经 RPC 连接。

本文的“普通 runtime release/Player”指没有显式 author 或 dynamic-extension capability 的 GUI
entry。它可以按产品需要包含其他正式能力，但绝不因此包含 Studio、dev source IO、编译器、
source-write authority 或未选择的 RPC client。

## 2. Authority, persistence, and RPC domains

这些领域可以同屏协作，但不得共享一份可写状态或伪装成同一种事务：

| Domain                      | Authority                               | Durable data                      | Boundary                                       |
| --------------------------- | --------------------------------------- | --------------------------------- | ---------------------------------------------- |
| Gameplay/product simulation | 唯一 Session/State owner                | Save、CommandLog、replay evidence | 只经 typed semantic/domain command 写入        |
| Application shell           | 产品自己的 application owner            | 窗口、偏好和产品需要的恢复数据    | 不进入 gameplay State，除非它本来就是玩法语义  |
| Authoring draft             | `AuthoringDocumentSession` + 单一源文档 | CAS 写回后的普通作者文件          | draft/undo 不直接 patch Session 或已保存文件   |
| Agent UI/session            | 独立 Agent Host                         | 产品定义的 session/task evidence  | 不拥有 raw GameSession 或 source writer        |
| External service connection | Host-owned typed RPC client             | 由产品/服务合同分别定义           | records 视为不可信；远端不是 plugin 或本地权威 |
| Generated UI                | validated `UiArtifact` revision         | 完整、已 admission 的 document    | renderer 只读；交互产生 admitted `UiIntent`    |

必要后台、配套服务和 LLM 通过 typed、versioned、bounded RPC port 接入。RPC adapter 在
cross-process 边界做 shape、size、depth、sequence 和 cancellation admission；外部服务不得取得
`GameSession` writer、任意 `FilePort`、AuthoringDocumentSession writer 或 DOM owner。关闭本地连接
只能撤销本地资源，不能声称回滚已经发生的远端 effect。

进程内 plugin/extension 则组合 trusted domain、workspace、UI contribution 与可逆生命周期。
RPC service availability 不是 plugin presence，extension dispose 也不是远端事务 rollback。两种边界
不得由一个模糊的 `context` 或 service locator 合并。

Agent stream 的半成品只是 transient presentation；只有完整、版本明确、通过大小和 schema
admission 的 document 才能成为 `UiArtifact` revision。重放 `UiArtifact` 不重新调用模型，也不
自动重放工具。OpenUI Lang、A2UI 或其他协议只是 `UiArtifact` 的可替换 adapter，不能成为上述
authority 的拥有者。

## 3. GUI entries, startup configuration, and readiness

产品由构建期可见的 GUI entry/policy 选择依赖，不由运行中任意字符串发现代码：

- `runtime` entry 只带该产品正式需要的能力；
- `author` entry/route 加入可信 source IO、Authoring Host 和诊断；Browser 当前只在 dev Host
  写回，Deno Desktop 的 author write/persistence 必须经过独立 promotion；
- auxiliary headless harness 只服务开发、测试、确定性 conformance 和自动化，不是第三种产品
  Host，也不得反向塑造 GUI API；
- playtest/debug 能力可以在 dev GUI 内按 capability 开启，但不得让 author-only code 因一个
  runtime boolean 进入普通 release。

Deno Desktop 可以从普通 CLI 参数读取 endpoint、project path、启动 mode 等 Host bootstrap
配置；参数只在启动边界解析、验证并冻结，不成为 interactive CLI 产品、mutable global config
或 runtime message bus，也不改变既有 `--profile release|debug` 的构建预设语义。Browser 从
浏览器适用的静态/Host 配置源产生相同 admitted config；它不伪造 CLI。

首屏先由静态 boot shell 给出可见、可访问的产品状态。观测必须区分：

- shell visible；
- recovery/configuration actionable；
- first product action；
- required service/domain ready；
- optional capability ready；
- entry/preload/lazy JS 与首场景关键资产。

required RPC 不可用时，依赖它的 domain 不得谎报 ready；GUI 仍须显示明确的 unavailable、配置、
诊断和 retry 状态，而不是白屏。optional workspace/Agent/网络失败不得卸载无关 domain。这些信号
属于 Host 诊断，不进入 authoritative State、Save 或 replay。

## 4. Module update, extension lifecycle, and publication

局部重载、延迟加载和动态装卸分成三个 owner，不能用一个“插件系统”包办：

```text
platform Module Update Source
  -> build-known candidate factory + generation
platform-neutral Extension Runtime
  -> trusted domain/contribution lifecycle
SillyMaker publication and authority
  -> admission -> candidate mount -> consumer ack -> atomic cutover -> predecessor retire
```

### 4.1 Platform Module Update Source

Module Update Source 只负责取得 build-known candidate，不决定 UI publication、Session 替换或
迁移：

- Browser 使用 Vite/dev HMR boundary 与 literal/generated static loader map；
- Deno Desktop 的 plain-Vite 开发路径使用 Deno 官方 in-runtime Vite HMR server，再由
  package-private Host adapter 产生同一 candidate/generation；
- release 中允许的 implementation 必须已在构建/打包图中，不能下载并执行任意远端代码；
- Electron adapter、Node `require.cache`、chokidar、Node ModuleLoader 和 Cordis Node HMR 不在
  当前合同内。

两平台可以有不同 update source，但必须产生同一中立 candidate/generation 合同。Deno Desktop
若当前只能 full restart，就必须如实报告，不能把进程重启冒充局部 successor。

AR5 已交付的 Deno Desktop candidate 形状不为旧 stable 建 external Vite/native companion、第二
server/proxy、手工 shim 或 Deno fork。官方 in-runtime Vite server 只提供 platform update source；
WebView 仍是 browser realm，native API 不越过 typed Host bridge，SillyMaker publication 继续拥有
R1/R2 admission 与 handoff。adapter 由 SillyMaker 明确 launch intent 加实际 Desktop capability
fail closed，不以 semver 字符串猜行为，也不把 Deno 未文档化的 framework-dev marker 作为公共或
唯一 admission authority。现有 static Desktop R3 shell/packaging 是独立路径，不为 HMR 改造。

该路径采用三段 promotion：先由人工显式选择隔离安装的 official canary 做 provisional platform
characterization；该 binary 报告 revision `98dc759`，参与者将其对应到 Deno PR #36488 merge
`98dc759254a90b98f7bbb62ba5361e531d0db6a5`。通过后可以实现 package-private inactive candidate，
但它只能由显式传入该隔离 binary 的 bounded local launch preflight 触达。分层 acceptance 由既有中立合同
tests、一个约数百行内且只记录参与者选择的完整 upstream commit、机械核对 `deno --version` 报告的七位
revision、使用隔离目录、调用真实 workspace command、接受 direct-child exit 0 的 launch preflight，
以及一次人工参与的 native ready/bootstrap/private-route/真实 HMR 无 reload/正常关闭 characterization
组成；preflight 不建立 renderer receipt、probe module、report endpoint 或 durable evidence sink。三层在
canary 上全部通过后 candidate 才可提交/保留。它不进入 ordinary
task/config/generated command/release，也不作为 maintained workflow 写入 user-facing
development/features/build docs；首个经 release source 与实际行为确认包含同一 upstream 语义的
stable 上重跑同一分层验收后，才成为 maintained Desktop dev workflow。2.9.6 是预期候选而不是合同；
canary 证据不提升 public Deno `>=2.9.0` floor、latest-stable
required CI 或任何 Desktop production claim。stable revalidation 是独立、条件性 defer，只 gate 该
maintained Desktop workflow，不阻塞 AR5 closure、AR6 或其他工作。

### 4.2 Platform-neutral Extension Runtime

Extension Runtime 只管理 trusted in-process domain/contribution 的 scope、child ownership、
reversible effect、service dependency、restart 与 dispose。它不扫描或下载代码，不拥有 State、
source、UI publication 或 RPC transport，也不进入 command、selector、reducer、render 和 frame
hot path。成功激活后，owner 持有直接函数/对象。

领域 factory 必须既能直接 mount，也能由私有 Extension Runtime 包装；普通静态游戏可以直接
创建内聚 Game Domain，并从依赖图完全排除动态 extension runtime。Application Host 下被产品
选择的 Game、Authoring、Agent 或其他 Application Domain 是相互独立的 sibling，各自可以拥有
可换代的子 scope，但不按每个 reducer、renderer 或 service 碎成 plugin。

进程内 participation 按产品语义分类，而不是由“是否使用 plugin lifecycle”决定：

- **required domain**：产品声明缺少该领域就不能完成 composition，缺失时在 admission 阶段失败；
- **required local binding**：依赖领域 mount 前必须从 build-known 实现中选定一个本地 binding；
- **optional contribution**：缺席或激活失败不得卸载无关 sibling，并提供明确 disable/retry。

这些只是 package-internal composition 语义，不建立公共 `Profile`、extension manifest 或 DI API。
required RPC service 也不是 required local binding：它允许在进程启动后不可用，此时依赖领域不
报告 ready，而 recovery/configuration GUI 继续可用。required admission、readiness 与 fail-fast
由 Application Host 判断，不能把 extension backend 的 pending/active 状态直接当成产品状态。若
胜出 backend 提供 Fiber、scope 或 isolation primitive，Application Host 下的 Application Domain/
child-scope ownership tree 仍由 SillyMaker adapter 显式建立，不从通用 Context 或 isolation label
自动推导。

AR1 已以同一 17-case 中立 conformance suite 比较 package-internal Direct lifecycle 与只使用
Cordis core 语义的 private adapter。两者均覆盖 required admission、nested cleanup、provider
loss/recovery、per-extension restart、failure diagnostics、predecessor retention 与残留资源归零；
选择依据是 ownership/state-machine、glue/test 成本、build placement 与真实 GUI consumer，而不是
Cordis 的 RC 标签。

最终选择是 SillyMaker-owned private Direct implementation。它吸收本合同需要的最小机制，保持
domain consumer 为 direct object，并让 ordinary no-extension application 从依赖图排除整个
backend。Cordis adapter、vendor 与依赖已删除；领域合同和 public declarations 不出现
Cordis/Context 类型，Cordis Loader、Include 和 Node HMR 也没有引入。该选择是 implementation
decision，不把 private Extension Runtime 升格为稳定 public API。

Extension backend 可以在内部使用可逆 notification 或 dispatch primitive，但其派发模式不自动
成为 SillyMaker 领域合同。已提交的 domain-event journal 仍由 authoritative Session/CommandLog 拥有；
authoritative intent、tool 或 policy interception 若未来出现，必须另有 typed admission、稳定顺序、
idempotency 与 queue-front revalidation，不能仅以通用 event 或 `waterfall` 获得写权威。本次选择
没有冻结全局 event taxonomy、plugin priority、plugin ID 排序或 `next()` 语义。

### 4.3 SillyMaker publication and reload authority

现有 SillyMaker publication 继续拥有 candidate admission、staging-safe mount、consumer
acknowledgement、atomic cutover 与 predecessor retirement。Extension backend 不能自行替换
visible UI、GameSession 或 AuthoringDocumentSession，也不能把“fiber active”当成 product
published。

换代按权威影响分类，不按文件扩展名分类：

- **R0 — admitted data/document refresh**：不换 domain owner；经过原有 schema/CAS/admission；
- **R1 — presentation/tool/workspace successor**：只换目标 contribution，保留未受影响的 domain
  authority 与 stable sibling；存在 GameSession 时也保留；
- **R2 — authoritative Application Domain successor**：必须满足该领域的 compatibility/migration
  与原子 handoff；Game Domain 的 Game/Session successor 还必须保持 Save/replay 与 simulation
  identity 合同。Authoring/Agent sibling 不随该领域重建；
- **R3 — Host restart**：bootstrap config、Host/runtime implementation 或无法安全分类的变化触发
  完整 restart/handoff；受控 restart 前必须完成既有 save/discard/cancel dirty gate，或证明目标
  Host 已支持的 recovery handoff，但不承诺未 promotion 的 Desktop durable draft，也不承诺保留
  进程内 domain identity。

Module Update Source 只报告 candidate；publication owner 决定 R0–R3。无法明确分类或迁移时拒绝
candidate，不做“尽量热替换”。

### 4.4 First-party progressive activation

首轮只支持构建期已知、first-party、同一产品显式选择的 contribution：

```text
small admitted metadata
  + static loader (() => import("literal-or-generated-module"))
  -> idle / loading / ready / error / disposed
  -> direct consumer object
```

合同要求：

- metadata 可常驻，implementation 在第一次真实需要时加载；
- 同一 generation single-flight；close/revoke/dispose 后的迟到结果不得挂载；
- error 有稳定诊断和显式 retry，失败不卸载核心 shell、Session 或已就绪 sibling；
- author-only implementation 在普通 release 中必须完全缺席，不只是“永不调用”；
- 关键首屏、无明确收益的小模块和马上必用资源不为追求 all-lazy 而拆分。

这不是 public Mod ABI。首轮不支持运行期任意路径 import、目录扫描发现 plugin、远端 executable
code、安装后修改 build graph、第三方 manifest、resolver 或 distribution。

## 5. One Authoring Host, multiple shells

统一创作架构的“一个外壳”演进为“一个 **Authoring Host**、多个承载方式”：

```text
Authoring Host
  project index / navigation / selection / diagnostics
  shared document sessions / dirty gate / undo-redo / CAS
  workspace metadata + lazy implementation loaders
  preview and publication coordination
        |                         |
        v                         v
standalone Studio route      embedded author surface
```

两种 shell 必须消费同一 Host、同一 workspace implementation、同一文档 session 和同一 source
IO；不得各自复制 dirty、undo、save 或 conflict 语义。现有 `/__sillymaker/studio/` 保留为迁移
wrapper；AR3 已证明 embedded consumer 的 GUI、R1、dirty draft 和输入/焦点行为，standalone
route 仍作为同一 Host 的有用完整页面保留，不是第二套编辑器。

Authoring Host 与 Application Host 下其他 Application Domain 是相互独立的 sibling。其他领域的
R1 presentation/tool/workspace successor 与 R2 authoritative Application Domain successor 的
成功、失败或 rollback 都不能重建 Authoring Host，也不能丢失 document identity、dirty draft、
undo/redo、selection 或 workspace state；游戏 conformance 以 Game/Session successor 证明这一
合同。Agent 完全缺席时，编辑器仍须是完整可用的 authoring 产品；Agent 只是可选
sibling/client。

嵌入应用不等于把源码编辑器发给玩家：

- Browser trusted author surface 当前只经 dev-server source IO 写回；
- Deno Desktop 的 Host/lifecycle 可以在本计划验证，但 source write、persistence、packaging 与
  production claim 仍由独立 Desktop lane promotion；
- 普通 release 不含 dev source endpoint、source-write IO、Studio 或编译器；
- playtest inspector 只读或只发明确调试 intent；
- 未来重型 code editor、搜索/index worker 或更多 workspace 可以作为 lazy contribution，但本轮
  不激活通用 IDE、任意 TS compiler 或 VS Code extension host；
- 未来玩家 UGC editor 只编辑产品定义的数据，经自己的 schema/command/persistence，属于独立
  产品设计。

Authoring Host 不接收 `GameSession` writer，不建立第二 Stage reconciler。预览继续消费
detached/read-only target；保存仍走 source CAS，再由正常 module-update/publication 路径使 runtime
看到 successor。workspace 对连接后 geometry 有需求时必须提供显式 mounted/readiness 证据；
offscreen connected staging 的 layout acknowledgement 不自动证明 user-visible paint 或精确
on-screen geometry。

实现状态（2026-08-22，AR3）：`@sillymaker/studio` 已抽出一个 package-private Authoring Host，
统一协调 Project Authoring Index-facing navigation，并拥有 Scene/Regions document sessions、Motion
store、Flow activation、dirty close participants 和 CAS conflict handling；persistent surface 保留
scene selection、diagnostics 与兼容的 local workspace state。standalone
Studio route 与 dev-only embedded shell 渲染同一个 closed workspace manifest 和实现；embedded
页面只常驻轻量 launcher，首次打开才加载 Host、workspaces 与真实 dev-source client。这里的“同一
Host/session”是同一 private factory、contract 和状态机；每个 shell mount 拥有自己的 Host lifetime，
独立 browser tab 不声称共享 in-memory draft instance。
Engine Lab 不再在 Game root 的 DevDock 中挂第二个可写 Motion Workbench：DevDock 舞台溯源保持
只读，真实 Scene cue 在 standalone/embedded Authoring Host 内产生唯一受维护的 Motion case。这样
`debug_tools` 撤销、Game R2 换代或 R3 重启都不能绕过 Host 的 dirty participant 后销毁另一份
component-local 编辑会话。

R1 publication 现在保留一个 visible React root；candidate 先在 inert、`aria-hidden`、
visibility-hidden、offscreen 但 document-connected 的 staging root 完成 layout acknowledgement，
connected layout failure 因而在触碰 visible root 前拒绝。accepted candidate 再进入同一 visible root，
保留 Host、文档 identity、dirty/history、selection 与兼容的 component-local state；同步 visible
render-factory failure 可重渲 predecessor plan 而不替换该 state，candidate/rollback factory 双失败才
terminal dispose。这一窄证明不泛化为“任意 nondeterministic visible effect 都可无损 rollback”；
connected staging 也不等于 user-visible paint 或精确 on-screen geometry。409/CAS conflict 刷新 saved
bytes/digest 而保留 draft，embedded dirty close 复用同一 save/discard/cancel participants；独立 focus
owner 与 pointer/context-menu/wheel fencing 阻止 editor keyboard 和 author chrome 的 secondary input
泄漏给 gameplay。

Engine Lab 提供一个被 runtime 和 authoring 共同消费的真实
`src/scenes/procedure/procedure.scene.json` 及对应 Studio binding，不存在隐藏 test-only document。
它的 Vite owner 把 live collector 产生的真实 `BuildIdentity` 注入 composition self-accept candidate；
普通 Scene/Motion R2 变化折叠到该 composition module。若同一个原始 changed module 的 live importer
graph 也到达已加载 Studio binding，则只额外保留该 module 为 Authoring R1 propagation root，其他深层
Scene/simulation module 仍被过滤。Chromium 与 WebKit 的物理证据只保留用户可观察与架构合同：
Studio-binding R1 incompatible rejection + compatible retry 期间 dirty Authoring 和显式 Agent 仍可用且
page load 为零；共享 `presentation.ts` edit 分别到达 Game R2 与 Authoring R1 并保留 dirty draft；
Application identity edit 走 R3 reload 后 GUI 恢复可操作。Browser 不认证完整 Host/DOM identity inventory；
被改 source 的 teardown 只负责等待 reverse update 并恢复原始 bytes。
Browser 的 Game/Session restart 与 composition R2 纵切把 Authoring 作为 Game root 外的 sibling：
success 与 replacement 前 fault 都不重建 Authoring Host。当前 Web R2 在 predecessor retirement 后
若 successor start 失败进入 terminal recovery，不承诺恢复 gameplay predecessor；这里不得写成
transactional Game rollback。macOS arm64 / Deno 2.9.5 的原生 common-runtime smoke 已用最新
Engine Lab static Player 证明 GUI ready、权威操作、同窗口 Game/Session restart、restart 后继续
操作，以及 native close acknowledgement 后 autosave flush 与正常退出。它没有装入 embedded
author、source CAS、R0–R2 update source 或 `deno desktop --hmr`，也不证明 packaged artifact、
多平台、crash durability 或 Desktop persistence/packaging/signing production readiness；这些仍留给
单独的 Desktop HMR revalidation 或 production promotion lane。

## 6. Structured authoring operations

人类、开发/测试工具和未来 Agent 共用的边界是领域 operation，不是任意回调、文件路径或第二份
隐藏模型：

```text
strict typed operation
  -> pure domain reducer(document, operation)
  -> next document + diagnostics
  -> existing AuthoringDocumentSession history/coalescing
  -> review/diff
  -> existing CAS save
```

Scene 是第一消费者，至少证明一项连续编辑、一项结构编辑和一项引用编辑。operation 必须可
序列化、带自己的 schema revision、边界一次 admission；执行 envelope 另带 exact document
identity 和 expected monotonic draft/session revision。每个成功编辑、undo/redo、reload、discard
或 document successor 都推进该 revision；stale operation 不得落到较新的 draft。相同 document +
operation 得到相同结果。unknown kind/schema revision、stale draft revision、非法参数或缺失目标
原子拒绝，draft、dirty 与 undo/redo history 不变。

`replaceDraft` 可以继续是 session 内部 primitive；迁入的 UI 与 non-UI local/dev adapter 不再
各自手写 clone-and-mutate 语义。auxiliary headless conformance 可以调用同一 executor，但不因此
成为产品 API owner。RPC caller 也只能经 admitted product adapter/operation，不能取得任意文件
路径或 `FilePort`。operation 不持有 IO，不保存文件，不执行 HMR，也不是 gameplay command。
V1 不承诺跨文档事务、任意 TypeScript AST 修改、operation log 持久化或通用命令总线。

实现状态（2026-08-22）：AR2 已按本节交付 package-private Scene operation revision 1、严格
admission、pure reducer、共用 local executor，以及既有 authoring session 上的 opaque
document-successor identity、monotonic draft revision 和 conditional replace。Scene UI 与 non-UI
caller 已共用该路径；它仍未导出为 public ABI、RPC schema 或持久化 operation log。

## 7. Agent GUI, RPC client, and UiArtifact seam

引擎只定义 transport/provider-neutral client 与 artifact 边界；真实 Agent 产品、后台和 LLM 由
后续产品计划证明：

- 产品选择 Agent capability 时，Agent Host 的 session、run/step、cancel/resume 与 GUI lifecycle
  构成一个内聚 required domain，不为追求细粒度 plugin 化而拆散；本地 panel、tool UI 或 renderer
  可以是 optional contribution，真实模型、工具后台和 companion service 仍统一经 RPC；
- Agent Host 拥有 GUI/session；RPC client 只 connect/observe/submit/cancel/reconnect；
- deterministic fake 实现同一 RPC client port，不建立第二套只供测试使用的 lifecycle；
- required service 慢、离线或失败时，Agent domain 不得谎报 ready，但 shell、配置、诊断和 retry
  GUI 仍可用；不依赖它的 Game/Authoring sibling 继续工作；
- cross-process event 按不可信数据做 shape、顺序、大小和取消 admission；
- cancel/dispose 后的迟到 event 被 generation fence 丢弃；本地 dispose 不宣称撤销远端 effect；
- `UiArtifact` 只允许引擎拥有的封闭 data-only component vocabulary 和产品显式允许的 action
  identifiers；unknown node/action 原子拒绝整个 successor，不接受任意 HTML、JavaScript、React
  component、function、module URL 或其他 executable payload；
- Agent 修改作者文档走 §6 operation；Agent 操作游戏继续走现有 player-safe semantic port；
- renderer 只读消费冻结、完整的 revision；交互产生 admitted `UiIntent`，再由产品 adapter 映射到
  query、semantic command、authoring operation 或受控 Host action；
- 需要 domain receipt 的 action 只有在 Artifact 与 exact current domain receipt 配对后才可交互；
  domain 尚未 ready 时 renderer 保持 inert，后续 readiness/revision 可以为同一 Artifact 补配，不能
  先开放 action 再异步寻找 authority；
- trusted fake 只改 revisioned in-memory draft，不预建独立 approval subsystem；未来
  authoritative、durable 或 external mutation 必须服从 typed capability/permission、idempotency
  与 queue-front revalidation，只有真实不可逆 external effect 出现时才评估 receipt/Effect Broker。

首次只用 deterministic fake 跑通 Engine Lab dev-only embedded Host 的 stream → admitted
`UiArtifact` → render → admitted intent → §6 Scene operation；该纵切不保存文件、不提交
authoritative state、不调用真实网络或 external effect。真实 RPC transport/backend、具体
OpenUI/A2UI adapter、conversation/task persistence 与 tool execution 均后置。在真实第二消费者前，
这些形状保持 experimental/package-internal，且不泄漏任何协议实现类型。

实现状态（2026-08-22）：AR4 已按本节交付 workspace-private `@sillymaker/agent/internal`。同一个
observable RPC client port 和 deterministic fake 覆盖 explicit readiness、start/submit/cancel/
reconnect/dispose；cross-process request/response/stream record 经过 getter-free canonical 投影、
exact record admission、65,536-byte/depth/node limits、以 `(sessionId, runId)` 为 identity 的
contiguous sequence admission，以及 connection-generation/lifecycle-epoch fence；同一 `runId` 可在
不同 session 重用。raw protocol adapter 必须保证 submit response settle happens-before 对应 tuple 的
首个 stream record，wire 乱序由 adapter bounded reorder。duplicate/gap/unknown-tuple record、旧连接
late event 和 cancel/dispose 后完成均不能进入 current Host。request failure 后 replacement connect
先关闭 predecessor；reconnect 不重提已发送请求，dispose 不声称回滚远端 effect。

同一 private package 的 Agent Host 拥有 observable session/run、transient draft 和最多 16 个本地
immutable Artifact revisions；invalid completion、unknown node/action、stale/late run 与 cancelled
completion 保留 exact predecessor，remote `run_failed` 终结 active run 和 streaming draft，重开
retained revision 不调用 RPC、模型或 tool。
`UiArtifact` 的 live closed vocabulary 只有 `column`、`text` 和 `action`；renderer 把 text 当普通
文字并只发出带 current Host/Artifact/node/action identity 的 admitted `UiIntent`。Engine Lab 的
dev-only Studio adapter 必须在 action 变为 interactive 前让 Artifact 与 exact AR2 Scene receipt
配对；Artifact 先到而 Scene 尚未 ready 时保持 inert，后续 Authoring revision 可为同一 Artifact 补配。
human edit 后的旧 action 稳定 stale-reject；有效 action 只改现有 in-memory draft，未保存文件、未改
Game State、未调用网络。service unavailable/retry、valid successor、invalid successor、late
cancellation 和隐藏/重开 Host 的 jsdom 与 Chromium/WebKit evidence 已落地。ordinary Template/
Engine Lab Player release graph 显式排除 Agent/RPC implementation modules；AR4 关闭时 Studio/
Agent source graph 仍静态耦合，authoring-only/no-Agent build graph 尚未证明，该缺口不追溯计入
AR4。

这些实现形状仍是 provisional internal seam：没有 root/public Agent export，也没有 real transport、
backend/LLM、具体 wire protocol、Agent/session/artifact persistence、tool execution、permission UI、
OpenUI/A2UI adapter、Effect Broker 或 Desktop HMR。它不进入 `features.md`，直到真实第二消费者与
后续 promotion 证明稳定合同。

实现状态（2026-08-23，AR5 已交付关闭）：Studio core publication/embedded surface 已改为
只依赖 package-private 的 neutral single-companion bridge；Agent client/Host/renderer 只从显式
`@sillymaker/studio/internal/agent` 选择路径进入。Template 的完整 generated Author-entry measurement
保留 Authoring Host、workspaces 与 dev-source implementation，同时排除 Agent package、RPC/fake 和
experimental Agent surface；Engine Lab 显式选择图包含这些模块作为 positive control。Studio
manifest 仍为该 private opt-in entry 保留 `@sillymaker/agent` workspace dependency，因此这项事实只
是 final module/source graph structural exclusion，不是 public ABI、独立 package installation 或
Desktop author-build claim。

Browser physical HMR 在 Chromium 与 WebKit 只保留三组合同级行为：合法不兼容
`configurationId` 的 Authoring R1 candidate rejection + compatible retry，同时 dirty Authoring sibling
和显式选择的 held Agent 仍可用；shared presentation change 形成 Player R2 + Authoring R1 且 dirty
draft 保留；Application identity change 形成 R3 reload 并恢复 actionable GUI。它不再逐项认证
panel/Host/session/run/connection/Artifact/stream/DOM node identity。headless Web R2 的
post-retirement UI-start failure + valid retry、jsdom terminal
candidate/rollback 双失败 cleanup，以及 10 次 Agent activate/dispose 资源归零分别补足更窄的
lifecycle evidence；这些证据不合并为“所有 failure/rollback 都有 physical Browser proof”。

2026-08-23 的 post-AR6 排序复查确认，上述 live Browser R2 只证明 Host/root 与 sibling lifecycle，
尚未满足本设计 §4.3 的 authoritative continuity：lease-only disposition 不携带本次 predecessor 的
Snapshot/Save，Core successor 取得 lease 后还会跳过 autosave resume；takeover `read_only` 与
post-takeover retry 的 fence currentness 也没有成为 publication gate。所有者已接受
[Browser R2 Authoritative State Handoff V1](../plans/2026-08-23-browser-r2-authoritative-state-handoff.md)
作为当前 engine lane。目标是 package-private exact encoded Save + released lease fence，复用既有
Save migration/adoption/replay-base，并只在 writable takeover 后发布；在该计划关闭前不得把 Engine Lab
lifecycle evidence 推广为普通产品的 authoritative R2。该补口不改变 post-retirement failure 的
terminal-recovery 边界，不建设 gameplay predecessor rollback，也不等待或激活 Desktop HMR。

AR5 的一次性五组交错 fresh-build/fresh-Chromium-context runner 曾实测 first actionable paired
median delta `-4.23ms / -3.54%`、stable command paired median delta
`-0.72ms / -1.40%`。该日期化结果继续作为历史 evidence；AR0–AR5 Complexity Reset 已删除 runner、
固定轮数、threshold 与 decision schema。长期保留的小型 GUI startup benchmark 只测一个显式选择的
应用，输出原始 readiness/first-interactive 与必要环境信息，不比较 revision、不自行 promotion。

Deno Desktop private inactive adapter、bounded launch preflight 与 selected-canary characterization 已于
2026-08-23 完成。显式选择的 official canary 报告 `98dc759`，参与者将其对应到完整 upstream commit
`98dc759254a90b98f7bbb62ba5361e531d0db6a5`；该 binary 通过真实 workspace
`deno desktop --hmr .` 启动官方 in-runtime Vite server；同一 startup window/origin
完成 Desktop bootstrap、隔离 private records route、正向及源码还原 HMR、正常 native close、
flush/drain 与 direct-child exit 0。首次修改 `shell-ui.tsx` 暴露该 Story 把会重建 identity 的 stage
registry 与 React 组件混合导出，React Fast Refresh 因而正确降级 R3；registry 拆到独立
`stage-rendering.tsx` 后，Chromium、WebKit 与 native canary 都证明 component-only `LabHudV1`
更新保留 exact HUD state 与已打开的日志 overlay，且 page reload 为零。该修复没有改变 Desktop
adapter、BuildIdentity、equal-R2→R3 fallback 或 native harness。candidate 仍 package-private、explicit、
default-off；只有首个经 source/行为确认包含目标路径的 stable 上重跑同一分层验收后才可激活
maintained Desktop workflow。这项 stable revalidation 是独立、条件性 defer，只 gate 该 Desktop
workflow，没有阻塞已关闭的 AR5/AR6，也不阻塞其他工作。

## 8. Promotion and deferred evidence

本设计先由 Engine Lab、现有 DevDock 和 Studio 提供中性/开发期消费者。已完成的 AR6 把已验证能力、
唯一 extension backend 选择和未满足边界交还 owner；后续小作品、examples 重做或其他产品压力源
由 owner 另行讨论、选择和立案，不在本计划预先列清单或排序。外部 workload 只提供匿名需求和
对比证据；可泛化合同仍需在 Engine Lab 做最小中性复现。

以下继续 defer：

- public Mod resolver/ABI/SDK/distribution、post-release arbitrary code install 和 plugin
  marketplace；
- Cordis Loader/Include/Node HMR、Node product Host、Electron adapter 与不可信代码 sandbox；
- 真实 Agent/LLM/backend 服务、具体 RPC protocol、完整 Agent persistence、OpenUI/A2UI adapter
  和 Effect Broker；
- Desktop HMR 在首个包含目标路径的 stable 上的 revalidation 与 maintained workflow activation；
- Desktop source-write/persistence/package/signing production promotion；
- State Format V2、production Story State migration、通用 WindowManager/IDE、browser TS compiler、
  全局 typed event bus、generic content compiler 和 data/UI/timing/save editors；
- 任何尚未由 owner 单独接受的小作品、examples 重写或商业 workload。

AR1 的 direct/Cordis-core-derived A/B 是已关闭的 private implementation checkpoint；选定并只保留
SillyMaker-owned Direct backend 后，仍不激活 public Mod。历史 A/B 不改变上述中立合同、
no-extension build 和 SillyMaker publication authority。
