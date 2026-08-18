# Application Runtime and Embedded Authoring

状态：2026-08-18 由所有者接受的目标设计。新的产品方向是继续以游戏为第一压力源，
同时让同一套 React + TypeScript 引擎承载可编程应用、应用内创作和 Agent 产品；这不把
SillyMaker 改成通用桌面系统、IDE、插件市场或任意代码宿主。实施顺序与验收由
[Application Runtime and Embedded Authoring V1](../plans/2026-08-18-application-runtime-embedded-authoring.md)
拥有；[Production-floor sequence](../plans/2026-07-30-production-floor-sequence.md)
仍是唯一跨计划排序入口。设计存在不等于 live capability。

本文扩展[统一创作架构](authoring-architecture.md)与
[场景创作模型和 Studio](scene-authoring-and-studio.md)：Scene、Motion、Project
Authoring Index、共享文档会话、CAS、undo/redo 和 workspace 领域合同保持不变；
“Studio 只能是独立 dev 页面”改为当前 V1 实现，而不是永久产品边界。

## 1. Product position

SillyMaker 的下一阶段定位是 **game-first programmable application runtime**：

- 游戏继续提供确定性 State、Save/replay、Presentation、输入和真实内容规模压力；
- Agent 产品可以把会话、任务、Artifact 和工具交互作为自己的应用领域；
- authoring 可以嵌入应用，也可以由独立 Studio route 承载；
- 可选 UI、workspace 和调试能力按需激活，不阻塞核心产品启动；
- 共用的是 Application Host、Surface、authoring 和 typed-intent 机制，不是把所有领域
  塞进 GameSnapshot。

本文的 **Application Host** 是产品静态启动、核心 shell 与 application lifecycle 的 owner；
它可以按产品装配可选 Authoring Host 或 Agent Host，但不因此取得 gameplay、authoring draft
或 Agent session 的写权威。Authoring Host 只拥有创作会话，Agent Host 只拥有 Agent session；
这个区分先作为设计词汇，不提前冻结同名公共 API。

一个产品的正式 runtime 可以按产品需要包含 Agent。例如未来 SillyOS 是 Agent-first
产品，其 release 可以包含 Agent client 和受控 `UiArtifact` renderer；普通游戏 release
默认不包含它们。`author`、`runtime` 与 `headless` 是依赖图和能力边界，不是权限位，
也不复用现有 CLI `--profile release|debug`（后者只描述构建调试预设）。精确 API 名称由
实施切片和两个消费者决定，设计不提前冻结新的公共 `profile` 类型。

本文的“普通 runtime release/Player”指没有显式 author capability 的产品 runtime entry；它可以
因产品需要包含 Agent 或其他正式能力，但绝不因此包含 Studio、dev source IO、编译器或
source-write authority。

## 2. Authority and persistence domains

这些领域可以同屏协作，但不得共享一份可写状态或伪装成同一种事务：

| Domain                      | Authority                               | Durable data                      | Boundary                                        |
| --------------------------- | --------------------------------------- | --------------------------------- | ----------------------------------------------- |
| Gameplay/product simulation | 唯一 Session/State owner                | Save、CommandLog、replay evidence | 只经 typed semantic/domain command 写入         |
| Application shell           | 产品自己的 application owner            | 窗口、偏好和产品需要的恢复数据    | 不进入 gameplay State，除非它本来就是玩法语义   |
| Authoring draft             | `AuthoringDocumentSession` + 单一源文档 | CAS 写回后的普通作者文件          | draft/undo 不直接 patch Session 或已保存文件    |
| Agent session               | 独立 Agent Host                         | conversation/task/tool evidence   | 客户端可断开；不得拥有 raw GameSession/FilePort |
| Generated UI                | validated `UiArtifact` revision         | 完整、已 admission 的 document    | renderer 只读；交互产生 admitted `UiIntent`     |

Agent stream 的半成品只是 transient presentation；只有完整、版本明确、通过大小和
schema admission 的 document 才能成为 `UiArtifact` revision。重放 `UiArtifact` 不重新调用模型，
也不自动重放工具。OpenUI Lang、A2UI 或其他协议只是 `UiArtifact` 的可替换 adapter，
不能成为上述 authority 的拥有者。

## 3. Static entries and startup floor

产品由构建期可见的 entry/policy 选择依赖，不由运行中任意字符串发现代码：

- `runtime` entry 只带该产品正式需要的能力；
- `author` entry/route 在可信 dev Host 中加入 source IO、Studio 和诊断；AR0–AR6 不增加
  dev-server 之外的写回端口，未来 Desktop/remote author Host 必须经过自己的 promotion；
- `headless` 继续只消费 simulation/application semantic contracts；
- playtest/debug 能力可以在 dev runtime 内按 capability 开启，但不得让 author-only 代码
  因一个运行时布尔值进入普通 release。

首屏先由静态 boot shell 给出可见、可访问的产品状态。核心应用、首个主操作和失败面不
等待 optional workspace、Agent、网络或非关键资产。构建与浏览器证据分别观察：

- shell visible；
- first actionable；
- optional capability ready；
- entry/preload/lazy JS 与首场景关键资产；
- 失败、离线与 retry 后的可用性。

这些信号属于 Host 诊断，不进入 authoritative State、Save 或 replay。

## 4. First-party progressive activation

V1 只支持**构建期已知、first-party、同一产品显式选择**的 contribution：

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
- 成功后消费者持有直接函数/对象，command、selector、reducer 和 frame path 不查
  activation registry、Context、Proxy 或 service locator；
- author-only implementation 在普通 release 中必须完全缺席，不只是“永不调用”；
- 关键首屏、无明确收益的小模块和马上必用资源不为追求 all-lazy 而拆分。

V1 不支持运行期任意路径 import、目录扫描发现 plugin、远端 executable code、安装后
修改 build graph、第三方 manifest、依赖注入或 provider churn。Vite HMR 仍是开发工具，
不是 production plugin ABI。

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

两种 shell 必须消费同一 Host、同一 workspace implementation、同一文档 session 和同一
source IO；不得各自复制 dirty、undo、save 或 conflict 语义。现有
`/__sillymaker/studio/` 保留为迁移 wrapper，直到 embedded consumer 的浏览器、HMR、
dirty draft 和输入/焦点行为达到对等证据。

嵌入应用不等于把源码编辑器发给玩家：

- 本轮 trusted author surface 只经现有 dev-server source IO 写回；未来 Desktop/remote author
  Host 只有在独立 promotion 后才能取得同一 CAS write contract；
- 普通 release 不含 dev source endpoint、source-write IO、Studio 或编译器；
- playtest inspector 只读或只发明确调试 intent；
- 未来玩家 UGC editor 只编辑产品定义的数据，经自己的 schema/command/persistence，属于
  独立产品设计。

Authoring Host 不接收 `GameSession` writer，不建立第二 Stage reconciler。预览继续消费
detached/read-only target；保存仍走 source CAS，之后由正常 Vite/HMR 或产品加载路径使
runtime 看到 successor。workspace 对连接后 geometry 有需求时必须提供显式 mounted/readiness
证据；现有 detached React layout acknowledgement 不自动证明 connected-browser layout。

## 6. Structured authoring operations

人类和 Agent 共用的边界是领域 operation，不是任意回调、文件路径或第二份隐藏模型：

```text
strict typed operation
  -> pure domain reducer(document, operation)
  -> next document + diagnostics
  -> existing AuthoringDocumentSession history/coalescing
  -> review/diff
  -> existing CAS save
```

Scene 是第一消费者，至少证明一项连续编辑、一项结构编辑和一项引用编辑。operation 必须
可序列化、带自己的 schema revision、边界一次 admission；执行 envelope 另带 exact document
identity 和 expected monotonic draft/session revision。每个成功编辑、undo/redo、reload、discard
或 document successor 都推进该 revision；stale operation 不得落到较新的 draft。相同 document +
operation 得到相同结果。unknown kind/schema revision、stale draft revision、非法参数或缺失目标
原子拒绝，draft、dirty 与 undo/redo history 不变。

`replaceDraft` 可以继续是 session 内部 primitive；迁入的 UI 与 local/headless authoring
adapter 不再各自手写 clone-and-mutate 语义。operation 不持有 IO，不保存文件，不执行 HMR，
也不是 gameplay command。V1 不承诺跨文档事务、任意 TypeScript AST 修改、operation log
持久化或通用命令总线。

## 7. Agent Host and UiArtifact seam

引擎只定义 provider-neutral client/artifact 边界；真实 Agent 产品由后续 SillyOS 计划证明：

- Agent Host 拥有 session，client 只 connect/observe/submit/cancel/reconnect；
- Host 慢、离线或失败不阻塞 shell、gameplay 或 authoring；
- cross-process event 按 untrusted data 做 shape、顺序、大小和取消 admission；
- `UiArtifact` 只允许引擎拥有的封闭 data-only component vocabulary 和产品显式允许的 action
  identifiers；unknown node/action 原子拒绝整个 successor，不接受任意 HTML、JavaScript、React
  component、function、module URL 或其他 executable payload；
- Agent 修改作者文档走 §6 operation；Agent 操作游戏继续走现有 player-safe semantic port，
  两者不合并为万能 Agent API；
- `UiArtifact` renderer 只消费冻结、完整的 revision；交互产生 `UiIntent`，再由产品 adapter
  映射到 query、semantic command、authoring operation 或受控 Host action；
- AR4 的 trusted fake 只改 revisioned in-memory draft，不预建独立 approval subsystem；未来
  authoritative、durable 或 external mutation 必须服从 typed capability/permission、
  idempotency 与 queue-front revalidation，只有真实不可逆 external effect 出现时才评估 receipt
  与 Effect Broker。

首次只用 deterministic fake 证明生命周期与失效 fence，并在 dev-only Engine Lab embedded
Host 跑通一条 fake stream → admitted `UiArtifact` → render → admitted intent → §6 Scene operation
纵切；该纵切只修改 in-memory draft，不保存文件、不提交 authoritative state、也不执行
external effect。在 SillyOS 提供真实产品消费者前，这些形状保持
experimental/package-internal；不泄漏 DeepSeek Harness、ACP、AG-UI、OpenUI、A2UI 或 Cordis
类型。

## 8. Promotion and deferred product evidence

本设计先由 Engine Lab、现有 DevDock 和 Studio 提供中性/开发期消费者。后续产品顺序是：

1. 重做 SillyOS，验证 Windows-like Agent 产品、lazy app、真实 Agent sidecar 与一项明确
   选型、受控的 UiArtifact adapter；
2. 重做 Cat Cafe，验证有游玩欲望的游戏、游戏侧 embedded authoring 与普通 release 排除；
3. 商业克隆内容冻结后进行第三次重写，比较同一内容/场景的 locality、编辑触点、启动、
   bundle、资产、Save/replay 与引擎专用补丁。

旧 SillyOS、Cat Cafe 和独立 Studio 只有在替代者接过现有回归责任后才删除。商业内容、
资产和 fixture 不进入正式仓；外部 workload 只提供匿名需求和对比证据。

以下继续 defer：Cordis、public Mod resolver/SDK/distribution、post-release code install、
State Format V2、production Story State migration、完整 Agent persistence、OpenUI adapter、
Effect Broker、通用 WindowManager/IDE、全局 typed event bus、generic content compiler 和
data/UI/timing/save editors。若未来两个真实产品反复需要 nested scope、provider
disappearance/recovery 或 per-extension restart，再在可选 Host 冷层重评 Cordis；不得进入 State
或 Player 热路径。
