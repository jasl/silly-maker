# Application Runtime and Embedded Authoring

状态：2026-08-18 由所有者接受的目标设计。SillyMaker 面向 **GUI 应用和游戏**；游戏继续
作为确定性 State、Save/replay、Presentation、输入、内容规模和创作体验的第一压力源。
当前产品 Host target 是 Browser 与 Deno Desktop；Electron 只保留未来 Host adapter 的位置。
后端服务、CLI 产品和 headless 产品不在目标内。实施顺序与验收由
[Application Runtime and Embedded Authoring V1](../plans/2026-08-18-application-runtime-embedded-authoring.md)
拥有；[Production-floor sequence](../plans/2026-07-30-production-floor-sequence.md)
仍是唯一跨计划排序入口。AR0–AR4 已于 2026-08-22 交付；AR5 build、Browser GUI Host、
lifetime/performance promotion 与 AR6 closure 已于 2026-08-23 交付关闭，下一条 lane 交还 owner
选择。2026-08-26 所有者接受的
[Neutral GUI Host Readiness、Close 与 Optional Desktop Companion V1](../plans/2026-08-26-neutral-gui-host-readiness-close-companion.md)
已完成 focused、Browser、native preview 与 repository validation 并关闭；下文明确
标注实现状态的部分才是 live capability，其他目标仍不因
设计存在而自动生效。

本文扩展[统一创作架构](authoring-architecture.md)与历史
[场景创作模型和 Studio](scene-authoring-and-studio.md)。其中 Authoring Host、Project Authoring
Index、共享文档会话、CAS、undo/redo、structured operations 与 standalone/embedded placement 已
被 M5 Inspector clean break 保留；旧 Studio route、rail、五 workspace 与 binding 已退出 live 产品面，
不形成兼容层。

## 1. Product position

SillyMaker 的下一阶段定位是 **game-first GUI application runtime**：

- 游戏继续提供确定性、Save/replay、表现、输入和真实内容规模压力；
- GUI 应用可以拥有自己的窗口、任务、文档、Artifact 和交互领域；
- authoring 可以嵌入应用，也可以由独立 Inspector route 承载；
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
entry。它可以按产品需要包含其他正式能力，但绝不因此包含 Inspector、dev source IO、编译器、
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

Browser 产品从 admitted endpoint/config 直接建立自己的 typed RPC client，不需要本地进程或
Desktop companion。Deno Desktop 产品若必须随包携带一个后台，可以另行选择下文的私有 transport：
它只把固定 same-origin HTTP namespace 接到该 direct child 的 loopback endpoint；RPC schema、framing、
stream、retry 和产品 readiness 仍由产品自己的 typed client 拥有。平台 transport 不因复用 HTTP
而成为通用 RPC protocol、provider registry 或进程内 plugin。

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
配置；参数只在启动边界解析、验证并转换为 typed config，不成为 interactive CLI 产品、mutable global config
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

live GUI Host 把 first product commit 与 required readiness 分开。产品可以提供一个
application-generation-owned readiness Promise：UI 同步挂载并保持可操作，Promise pending 时 Host
继续报告 `starting`，第一次 resolve 才把 required domain 推进为 ready；未提供时保持静态 GUI 的
即时 ready。recoverable unavailable/retry 留在产品 UI 与 typed client 中；不可恢复 rejection 使用既有
required-startup failure 路径。该 latch 只表达一个 generation 首次满足必要依赖，不是多服务 registry、
依赖图、健康检查器或网络重连状态机。

GUI 产品还可以选择正好一个 close participant：同步、幂等的 `fence()` 停止新的 product mutation/
submission，`prepare()` 等待产品自己的 pending write 或 typed-client drain。没有 participant 的无状态
GUI 保持即时回执；需要关闭多个产品资源时由产品聚合，而不是让 Host 枚举数据库、RPC、Extension 或
React descendants。该异步保证只接入 Desktop native-close receipt；explicit dispose 与 Browser
`pagehide` 不自动取得 native-close receipt。explicit dispose 会在卸载 React root 后等待产品聚合的
单一 UI disposer，并把 rejection 隔离为既有 bounded diagnostic；`pagehide` 只启动同一路径，不伪装成
浏览器会等待异步 cleanup 或 durable flush。

### 3.1 Optional Desktop companion preview

Deno Desktop packaging 可以为每个 exact target 从 build-known application config 中选择最多一个
application-private companion artifact。只有选中的 package 才 stage 该 artifact 与 package-private
Host owner、include companion bytes，并授予未限定的 `--allow-run`；默认/未选择路径 stage 一个 inert
config，不包含 companion Host/artifact、不启动 child，也没有 subprocess permission 或 renderer
bootstrap。Deno 2.9.5 会在启动时解析 scoped `--allow-run=<name/path>`，无法用它授权之后才从 compiled
VFS 物化出来的随机绝对路径，因此该 preview 只在明确选择 companion 时承担 unscoped permission；
这不是 engine-wide permission policy 或生产安全资格。

private Host 把 included artifact 复制到 product user-data 下自己拥有的随机物理路径，在 POSIX 上设为
`0700`，并只直接启动这一份固定 artifact。child stdout 的第一行是至多 1,024 bytes 的 bounded JSON
launch receipt（`revision: 1` 与 loopback `port`）；Host 据此把
`/sillymaker/companion/*` 交给现有 exact-origin/capability HTTP admission，再代理到
`127.0.0.1:<port>`。renderer 只得到 package-private HTTP port，不得到 artifact path、PID、signal、
`Deno.Command`、`Deno.ChildProcess` 或任意命令执行能力。

native close 的顺序固定为：renderer product `fence()` / `prepare()` → shell 停止 private ingress 并
drain 已接收的 Host requests → companion stdin EOF → shell 等待自己直接持有的 child exit 0 → native
exit。失败不得伪造成正常退出；Host 不扫描或终止孙进程，也不建立 PID/currentness、SIGKILL、进程树
清理、多 companion registry 或 supervisor。该 preview 不承诺 persistence durability、signing、安装器、
跨平台资格或产品 RPC protocol，并且与 Desktop HMR update source 正交：它不启动 Vite、不产生
candidate/generation，也没有随 2026-08-28 的 stable HMR activation 获得额外权限或 production claim。

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
canary 上全部通过后 candidate 才可提交/保留。它当时不进入 ordinary
task/config/generated command/release，也不作为 maintained workflow 写入 user-facing
development/features/build docs。Deno 2.9.6 后来成为首个经 release source 与实际行为确认包含同一
upstream 语义的 stable，并于 2026-08-28 重跑分层验收通过；维护中的
`app desktop-dev <application-id>` 因而显式选择该 package-private adapter。普通入口继续
default-off；该结果不提升 public Deno `>=2.9.0` floor、latest-stable required CI 或任何 Desktop
production claim。

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

Mod 的“热插拔”复用同一分类，不建立第五种换代协议：

| Mod 影响面                                                                      | 换代 | 保留的 owner                                          | 可观察结果                                                                 |
| ------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| content/document bytes                                                          | R0   | Application Domain 与 Session                         | admitted refresh；需要 CAS 的 source 继续走 CAS                            |
| presentation、History UI、DevDock、Inspector/editor 或其他 tooling contribution | R1   | Game/Session 与未受影响 sibling                       | 同窗原子换代；失败保留旧 contribution                                      |
| GameplayModule、Simulation rules、State contract 或其他 authoritative domain    | R2   | Host、Authoring/Agent sibling；Game 由 successor 接管 | exact Save + lease handoff；零 page reload；失败保留或只消费可重试 handoff |
| Host/runtime/bootstrap implementation                                           | R3   | 只保留已明确支持的 durable/recovery data              | 受控 Host restart                                                          |

因此每个 application generation 内的 resolved Mod set 仍不可变。R1 由新的 contribution generation
替换目标 owner；R2 由新的 Application/Game generation 接管，而不是给存活 Session 暴露
`setActiveMods()`、改写 reducer registry 或让新旧 Simulation contribution 并存。卸载与安装使用同一
successor 路径：候选先 load/compile/mount，通过 consumer acknowledgement 后才发布并退休 predecessor。
浏览器 module cache 中已经求值的 ESM/CSS 不保证物理擦除；“卸载”保证的是 publication、listener、
resource handle 与 lifecycle owner 退出，不冒充 JavaScript realm sandbox。

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

## 5. One Authoring Host, Inspector-first shells

2026-08-25 的 Scale/Scene Object/Modular GUI M5 以 clean break 取代旧 Studio 产品外形，
但保留本设计的 one Host / standalone-and-embedded placement、document session、CAS、
dirty/history、structured operations、source IO、selection 和 R1 continuity。当前 live surface
是 Inspector；旧 `/__sillymaker/studio/` route、五 workspace rail、`StudioAppV1`、
`StudioBindingV1`、Story workspace bindings 和只保护旧 UI 的测试已删除，不保留 migration
wrapper 或 feature-parity 双轨。

```text
Authoring Host
  Authoring Scene source IO / document session / CAS
  dirty gate / undo-redo / selection / diagnostics
  public Scene operation vocabulary / private executor
  persistent publication + optional private companion
        |                         |
        v                         v
standalone Inspector       embedded Inspector
```

两种 placement 消费同一 Host contract、同一 `InspectorAppV1` implementation 和同一类 source
IO；每个 mount 拥有自己的 in-memory lifetime，独立 tab 不声称共享 draft。应用以
`inspector: { module, exportName }` 显式选择，并导出小型 `InspectorBindingV1`：content
catalog、真实 Stage renderers，以及可选 assets、Motion、Timeline catalogs 和 build-known
`sceneInspector.properties` contributions。每个直接 mount 或 R1 candidate 在 publication 边界对
contribution set 做一次普通 shape/value admission；probe 与 visible 使用同一 typed copy，之后内部信任该
结果。binding 不携带 source paths、FilePort、GameSession writer、workspace registry、
Context/service locator 或任意插件 registry。

当前 Inspector 只交付有持续价值的 bounded workflow：

- project Authoring Scene 搜索与 fixed-row virtualization；
- 当前 scene 的 layer/object hierarchy 搜索与 fixed-row virtualization；
- tree 与真实 `SemanticStageHostV1` preview 的共享选择；
- 对 off-canvas、transparent 和 non-visual group object 的 selectable ghost/inspection bounds；
- local transform、visual content、既有 appearance value、sibling object order 和 layer order 的
  revision-fenced edits；游戏可在 core Object Inspector 旁增加少量专属 properties tools，并通过同一
  current document identity/draft revision operation port 完成这些已支持编辑；
- hit-region（含 polygon overlay）、Motion、Timeline、interaction/GUI intent、compiled layer、
  diagnostics 和 JSON-pointer source provenance 的只读 facets；
- Motion/Timeline 的 detached scrub，包括 parallel disjoint channels；
- Authoring Scene CAS save；`digest_conflict` 刷新 saved baseline/digest，同时保留 dirty draft
  与 history 供显式 retry。

Inspector 不创建 component，不把 group 转换为 visual，不写 standalone Regions/Chrome 文档，不
编辑 Blueprint/任意 TypeScript，也不取得活动 gameplay Session writer。low-level Scene source IO、
Regions/Chrome document families、Motion Workbench 与 Narrative Flow projection 继续作为底层或
专门工具能力保留，但它们不是 Inspector workspace。其他文档族的专门 editor、code editor、search/index
worker 或 UGC surface 需要自己的真实 consumer 与 focused contract，不把 Scene contribution 扩张为
通用 workspace/layout DSL，也不恢复旧 rail。

Authoring Host 与 Application Host 下其他 Application Domain 是 sibling。Game/Session R2
successor、Player R3 recovery 或 Agent absence 不能重建 Authoring Host 或丢失其 admitted document
identity、dirty draft、history、selection；Authoring 也不取得 gameplay authority。保存只走 source
CAS，再由正常 module-update/publication path 让 runtime 看见 successor。ordinary release 排除
Inspector、Host、dev-source endpoint、source-write IO、authoring compiler/facets 和 Agent/RPC；
release 只保留选定 Authoring Scene 的 virtual runtime plan。

R1 publication 保留一个 visible React root。candidate 先在 inert、`aria-hidden`、
visibility-hidden、offscreen 但 document-connected 的 staging root 完成 layout-effect
acknowledgement；失败在触碰 visible predecessor 前拒绝，成功才进入同一 visible root。该合同保留
Host/session/selection/兼容的 local Inspector state，不承诺任意 visible side effect 可逆，也不把
connected staging 当作真实 paint/geometry evidence。standalone/embedded teardown 先 unmount React
descendants，再 dispose optional companion、同步或异步 binding resources 和 Host；successor retirement
与最终 close 都等待 binding cleanup settle。

embedded mode 可以在 typed Inspector binding 上选择正好一个 package-private neutral companion。
它只提交 compatibility identity、content signature、owner/renderer/disposer；Host 不提供任意 lookup、
command bus、workspace DSL、surface set 或 service locator。现有 Agent Host、`UiArtifact` 与 renderer
类型仍只从 `@sillymaker/studio/internal/agent` 进入；Session client/factory/types 从 focused public
`@sillymaker/agent/session` 进入。Engine Lab 显式选择 deterministic fake Agent companion，
Template 的完整 Author graph 则排除 Agent/RPC。Artifact action 必须与 current Authoring Scene
document identity/draft revision receipt 配对后才可用，并通过同一 structured-operation executor；
它不能保存文件、改 Game State 或调用 external effect。这是 private Agent Host/UiArtifact seam，
不是 public plugin/Mod ABI；public Session/Run 合同也不授予这些 authority。

Browser Chromium/WebKit evidence 只保护合同级行为：standalone/embedded Inspector 可用，
virtualized list/tree 与真实 preview/ghost/facets 可观察，有限编辑通过 Authoring Scene CAS，
incompatible R1 reject + compatible retry 保留 dirty Authoring/selected companion，shared
presentation change 形成 Player R2 + Authoring R1，Application identity change 走 R3 recovery。
unit/headless suites继续保护 operation stale fencing、CAS conflict、Agent generation/sequence/cancel；
Browser 不逐项认证完整 DOM/object identity inventory。

Deno Desktop 的静态 Player/common-runtime、selected-canary characterization 与现已维护的
`app desktop-dev` HMR workflow 仍不等于 live Desktop authoring。Inspector/source CAS、Desktop
R0–R2、packaging/persistence/signing promotion 均未激活；private adapter 继续 package-private，
只有显式 Desktop development command 选择它。

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

实现状态（2026-08-29）：AR2 已交付初始 Scene structured operation 路径、严格 admission、pure reducer、共用
local executor，以及既有 authoring session 上的 opaque document-successor identity、monotonic draft
revision 和 conditional replace；Inspector-first M5 随后把当前 Scene operation vocabulary 演进至 revision 2。
Scene UI 与 non-UI caller 共用该路径。`@sillymaker/studio` 现在公开 operation vocabulary、schema revision 和
execution result，供 build-known game/editor tools 编译；工具只从
`SceneInspectorRenderInputV1.execute` 获得已绑定 current document/revision 的执行端口。execution envelope、
admission owner、executor、Authoring Host、Session 和 source IO 仍为内部实现。这不是 public Mod resolver/
ABI/SDK、RPC schema、任意 operation handler registry 或持久化 operation log。

## 7. Public Agent Session/Run and private Agent GUI/UiArtifact seam

引擎公开一个 focused transport/provider-neutral Session/Run client，同时保留 private Agent Host 与
artifact 边界；真实 Agent 产品、后台和 LLM 由后续产品计划证明：

- 产品选择 Agent capability 时，Agent Host 的 session、run/step、cancel/resume 与 GUI lifecycle
  构成一个内聚 required domain，不为追求细粒度 plugin 化而拆散；本地 panel、tool UI 或 renderer
  可以是 optional contribution，真实模型、工具后台和 companion service 仍统一经 RPC；
- private Agent Host 拥有 GUI/session 与 Artifact 解释；public Session client 只
  connect/observe/start/submit/cancel/reconnect/dispose；
- public connection 以一次性 `whenClosed` 中立表达不可再用；client 在 ready 前订阅、统一退休 current
  generation、发布 `/connection`、fence 迟到调用/event 并等待 cleanup。它不公开原因、不合成 Run terminal、
  不自动重连或拥有产品恢复；
- private deterministic fake 实现同一 public connector port，不建立第二套只供测试使用的 lifecycle；
- required service 慢、离线或失败时，Agent domain 不得谎报 ready，但 shell、配置、诊断和 retry
  GUI 仍可用；不依赖它的 Game/Authoring sibling 继续工作；
- cross-process event 按不可信数据做 shape、顺序、大小和取消 admission；
- cancel/dispose 后的迟到 event 被 generation fence 丢弃；本地 dispose 不宣称撤销远端 effect；
- `UiArtifact` 只允许引擎拥有的封闭 data-only component vocabulary 和产品显式允许的 action
  identifiers；unknown node/action 原子拒绝整个 successor，不接受任意 HTML、JavaScript、React
  component、function、module URL 或其他 executable payload；
- Agent 修改作者文档走 §6 operation；Agent 操作游戏继续走现有 player-safe semantic port；
- renderer 只读消费已 admitted、完整的 typed revision；交互产生 admitted `UiIntent`，再由产品 adapter 映射到
  query、semantic command、authoring operation 或受控 Host action；
- 需要 domain receipt 的 action 只有在 Artifact 与 exact current domain receipt 配对后才可交互；
  domain 尚未 ready 时 renderer 保持 inert，后续 readiness/revision 可以为同一 Artifact 补配，不能
  先开放 action 再异步寻找 authority；
- trusted fake 只改 revisioned in-memory draft，不预建独立 approval subsystem；未来
  authoritative、durable 或 external mutation 必须服从 typed capability/permission、idempotency
  与 queue-front revalidation，只有真实不可逆 external effect 出现时才评估 receipt/Effect Broker。

首次只用 deterministic fake 跑通 Engine Lab dev-only embedded Host 的 stream → admitted
`UiArtifact` → render → admitted intent → §6 Scene operation；该纵切不保存文件、不提交
authoritative state、不调用真实网络或 external effect。后续 SillyOS 并行产品实现提供了第二消费者
压力，只足以提升中立 Session/Run connector/client；真实 RPC transport/backend、具体 OpenUI/A2UI
adapter、conversation/task persistence、tool execution 以及 Agent Host/Artifact product surface 均后置。

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
dev-only Inspector companion 必须在 action 变为 interactive 前让 Artifact 与 current Authoring Scene receipt
配对；Artifact 先到而 Scene 尚未 ready 时保持 inert，后续 Authoring revision 可为同一 Artifact 补配。
human edit 后的旧 action 稳定 stale-reject；有效 action 只改现有 in-memory draft，未保存文件、未改
Game State、未调用网络。service unavailable/retry、valid successor、invalid successor、late
cancellation 和隐藏/重开 Host 的 jsdom 与 Chromium/WebKit evidence 已落地。ordinary Template/
Engine Lab Player release graph 显式排除 Agent/RPC implementation modules；AR4 关闭时 authoring/
Agent source graph 仍静态耦合，后续 AR5/M5 已通过 neutral companion split 与 Inspector graph
negative control 关闭该结构缺口。

实现状态（2026-08-30，focused promotion 已交付）：`@sillymaker/agent/session` 公开唯一的语义级
Session/Run client、connector/connection port、snapshot/diagnostic/result 与 stream event 类型。
`start` 无产品参数，`submit` 只接收非空 `sessionId` 与 text；stream 只表达
`output_text_delta`、bounded Strict JSON `output_data`、`run_completed` 与 `run_failed`。公共合同不暴露
raw request envelope、request ID、具体 wire、provider、connection generation、Agent Host、
`UiArtifact` 或 deterministic fake。connector 的 unknown response/event 由 client 边界 admission 一次；
currentness、连续 sequence、cancel/reconnect 和 awaited disposal 继续由同一实现拥有。SillyOS 的产品
connector 已完成 downstream handoff：它自己拥有 Worker wire 与 Pi/provider 绑定，Creator facade
拥有 Program candidate/CAS 与持久 terminal projection。2026-08-30 的 focused 后继补充了 public connection
一次性 `whenClosed`、ready 前 observation、current `/connection` fencing 与 cleanup join；SillyOS 已删除
Browser Pi transport 的私有断连旁路，Creator facade 只在消费公共 snapshot 后触发产品恢复。该消费者证据不会把 conversation
persistence、tool execution、permission UI、OpenUI/A2UI adapter、Effect Broker 或 public Agent
product/renderer ABI 提升为引擎能力。

实现状态（2026-08-25，AR5 保留、M5 已吸收）：Inspector core publication/embedded surface 只
依赖 package-private 的 neutral single-companion bridge；Agent client/Host/renderer 只从显式
`@sillymaker/studio/internal/agent` 选择路径进入。Template 的完整 generated Author-entry measurement
保留 Authoring Host、Inspector 与 dev-source implementation，同时排除 Agent package、RPC/fake 和
experimental Agent surface；Engine Lab 显式选择 private companion 图包含这些模块作为 positive
control。该事实只是 final module/source graph structural exclusion，不是 public ABI、独立 package
installation 或 Desktop author-build claim。

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
作为当前 engine lane。M0–M3 已实现 package-private exact encoded Save + released lease fence，复用
既有 Save migration/adoption/replay-base，只在 writable takeover 后发布，并令 retry 只消费可证明
current 的 Save/fence pair。Engine Lab 保留中立合同；已退役的 Cat Cafe forward/reverse
Chromium/WebKit evidence 曾用真实
Player Save export、pending/RNG/sequence/integrity/digest、单次 Game epoch 换代、零 page reload 与
successor command 完成普通产品 authoritative R2 promotion；Engine Lab 另保持 dirty Authoring sibling。
该合同不搬运 Whole Canvas 标题页等 transient React state；产品可以通过普通“继续”关闭新建
标题页后回到已接管 Session。该补口不改变 post-retirement failure 的 terminal-recovery 边界，不建设
gameplay predecessor rollback，也不等待或激活 Desktop HMR。

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
adapter、BuildIdentity、equal-R2→R3 fallback 或 native harness。Deno 2.9.6 stable 于 2026-08-28
完成后续 source/行为 revalidation：官方 in-runtime Vite、同窗同 origin Desktop bootstrap/private
route、component-only HMR/restore 零 reload、状态/overlay 保留、正常 native close、flush/drain 与
direct-child exit 0 再次成立。维护中的 `app desktop-dev` 因而正式打开；canary-only preflight/test
随裁决删除。adapter 仍 package-private，普通路径仍 default-off，Desktop production claims 不变。

## 8. Promotion and deferred evidence

本设计先由 Engine Lab、现有 DevDock 和 Inspector 提供中性/开发期消费者。已完成的 AR6 把已验证能力、
唯一 extension backend 选择和未满足边界交还 owner；后续小作品、examples 重做或其他产品压力源
由 owner 另行讨论、选择和立案，不在本计划预先列清单或排序。外部 workload 只提供匿名需求和
对比证据；可泛化合同仍需在 Engine Lab 做最小中性复现。

以下继续 defer：

- public Mod resolver/ABI/SDK/distribution、post-release arbitrary code install 和 plugin
  marketplace；
- Cordis Loader/Include/Node HMR、Node product Host、Electron adapter 与不可信代码 sandbox；
- 真实 Agent/LLM/backend 服务、具体 RPC protocol、完整 Agent persistence、OpenUI/A2UI adapter
  和 Effect Broker；
- Desktop source-write/persistence/package/signing production promotion；
- State Format V2、production Story State migration、通用 WindowManager/IDE、browser TS compiler、
  全局 typed event bus、generic content compiler 和 data/UI/timing/save editors；
- 任何尚未由 owner 单独接受的小作品、examples 重写或商业 workload。

AR1 的 direct/Cordis-core-derived A/B 是已关闭的 private implementation checkpoint；选定并只保留
SillyMaker-owned Direct backend 后，仍不激活 public Mod。历史 A/B 不改变上述中立合同、
no-extension build 和 SillyMaker publication authority。
