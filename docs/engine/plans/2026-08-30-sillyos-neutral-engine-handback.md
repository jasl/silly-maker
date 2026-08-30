# Neutral Agent Session/Run 与 SillyOS Engine Handback 计划

状态：**2026-08-30 经所有者接受并完成 M0–M3 的公共 Agent Session/Run engine slice；
SillyOS 随后完成独立 downstream handoff。本计划关闭时没有自动激活的后继；其终审留下的唯一中立
lifecycle 候选后来由独立的
[Agent Session 异步断连收口](2026-08-30-agent-session-asynchronous-connection-loss.md) 计划交付。**

2026-08-30 所有者的 post-closure 澄清补充了 §2 / §4–§6 的下游长 Conversation、Process 与
Browser 中断恢复合同；它不重开 M0–M3，也不声称新的 Engine API 已交付。

[Production-floor sequence](2026-07-30-production-floor-sequence.md) 仍是唯一跨计划排序入口。本计划以
SillyOS 的真实产品实现作为第二消费者证据，但交付边界必须保持 GUI 应用、游戏和 provider 中立。落盘的
条件式候选不因本计划启动而自动进入实现。

## 1. 当前事实与裁决

引擎已经交付 neutral GUI Host、公共 Mod Stage A、异步 contribution/resource cleanup、产品主题隔离，
以及 package-private 的 Agent RPC/Host/UiArtifact fake vertical slice。SillyOS 的并行 worktree 已经让
Browser Pi transport 与 Creator Agent port 直接穿透 `@sillymaker/agent/internal`；它因此成为把
transport-neutral Session/Run seam 提升为受支持公共合同的真实第二消费者。

本轮裁决是：

- 提升**语义级**连接、Session、Run、stream、cancel、reconnect 与 awaited disposal；
- 不公开现有 raw request envelope、request ID、Worker wire、Agent Host、UiArtifact admission/renderer 或
  deterministic fake；
- 公共 stream 只表达中立 text delta、JSON-safe data output 与 Run terminal outcome，不把 Program candidate
  或 UiArtifact 写进 Session 合同；
- 本轮 `start` 不接收产品 bootstrap，`submit` 只接收已被真实消费者证明的单段 text；Program revision、
  message parts 与资源引用留在 handoff 后的独立证据门；
- Agent RPC 是外部服务边界而不是 Mod。Program 可以选择可信 Mod，但 Program 本身不是 Mod。

当前公共 Mod runtime 已足以支持可信、build-known 能力的依赖解析、延迟加载、完整 selection successor、
卸载、失败回滚、异步资源退出和生产结构排除。本计划不扩建 Mod runtime。

## 2. 权威与职责

| Owner                | 本轮拥有                                                                                                                                              | 本轮明确不拥有                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Engine Agent Session | transport-neutral connector、connection/session/run lifecycle、currentness、ordered stream admission、cancel/reconnect、diagnostics、awaited disposal | Program/Process、Pi、provider wire、prompt、tool、conversation persistence |
| Product adapter      | 把公共语义调用映射到 Worker/RPC/provider；解释 bootstrap、resource reference 和 data output                                                           | 改写 Engine currentness 或建立第二个 Session lifecycle                     |
| SillyOS              | Program/Process、Workspace、OPFS/IndexedDB、Pi、Provider/Credential/Network、OpenUI adapter、业务 mutation                                            | 把这些产品权威塞进 Engine Session 或 Mod resolver                          |
| Mod runtime          | 可信能力组合、完整 generation successor、resource owner                                                                                               | 外部 Agent service、动态 UI document、Program repository                   |

一个未来 Process 可以固定 Program revision、application BuildIdentity 与 resolved Mod manifest，并为自己的
运行实例创建独立 Mod controller。旧 revision 的物理代码/素材保留、迁移和 GC 仍由产品负责。

Process 同时拥有一份经 SillyOS admission 的、可分页恢复和审查的 presentation transcript。
它与 Pi 自己的 context、compaction、session continuation 和 provider wire 是两个不重叠的 ownership domain，
不是同一份 Conversation fact 的双权威：SillyOS Process transcript 是用户可见历史的唯一产品权威；
Pi/provider continuation 是模型续跑的 opaque adapter/provider 权威。Engine Session 只传递事件并拥有
currentness，不持久 continuation reference、不决定恢复策略。模型 context 被摘要或压缩不得静默删除
用户可见历史；presentation transcript 也不得反过来伪装成 Pi continuation。

## 3. Delivered engine milestones

### M0 — 唯一公共 Session 合同

- 增加唯一公共 `@sillymaker/agent/session` export；公开中立 client、connector/connection ports、输入、输出、
  snapshot、diagnostic 与 result 类型；
- connection port 使用 `start`、`submit`、`cancel` 等语义方法，不公开 generic `request(unknown)`、request ID
  或某个 Worker/network wire envelope；
- `start` 不接收产品参数；`submit` 只接收非空 `sessionId` 与 text，不预置 Program、prompt、role、resource
  或 provider 字段；
- stream 使用 `output_text_delta`、`output_data`、`run_completed` 和 `run_failed`；`output_data` 在边界投影为
  bounded Strict JSON；
- Host、UiArtifact 与 fake 继续只从 private entry 进入，不形成 public Agent product/renderer ABI。

### M1 — 单一实现与生命周期证据

- 迁移现有 client currentness、stream ordering、unknown tuple、duplicate/gap、replacement connection、cancel、
  reconnect、slow-connect disposal 与 async close tests 到公共合同；
- connector 返回的 raw response/event 只在 Engine admission 一次；getter、prototype、oversize、invalid
  identifier/text/data output 原子拒绝；
- submit response 必须先 settle，connector 才可向 client 交付该 Run 的首个 event；具体 wire 若乱序，由产品
  connector 做 bounded reorder；
- `cancel_requested` 只确认请求已被 connector 接受，不伪装成远端 terminal；client 继续维护该 Run 的
  sequence/currentness，直到 `run_completed` 或 `run_failed`，上层 Host 可立即停止展示迟到 output；
- dispose 等待当前 connection close，fence connect/request/stream 的迟到完成，但不宣称撤销远端 effect；
- 删除被公共合同替代的 private RPC aliases，避免 public/private 双轨和第二 authority。

### M2 — 仓内真实消费者与结构边界

- Engine Lab/Studio 的 Agent binding 只从公共 session entry 取得 client port/factory；private entry 只保留
  Agent Host、UiArtifact 和 deterministic fake；
- Engine Lab fake 继续解释 `output_data` 为 UiArtifact，证明公共 Session 不拥有 Artifact 语义；
- ordinary Template、Player 和未选择 Agent 的 GUI final graph 继续不导入 Agent package；本轮不要求 Template
  修改，也不制造 SillyOS public Mod consumer；
- 增加从 package subpath 导入的 focused smoke/type evidence，证明消费者无需访问 `src/**` 或 private RPC types。

### M3 — 文档、验证与收口

- 同步 production-floor sequence、roadmap、architecture、features、development、AGENTS 和 package exports；
- 运行 Agent/Studio/Engine Lab focused tests、typecheck、lint、format、结构搜索、全仓 `deno task check` 和
  `git diff --check`；
- 复审重复 admission、未等待 Promise、wire 泄漏、Session/Host 双权威、render/command 热路径 lookup、
  private import 残留和无依据通用框架；
- 完成后把本计划记为 engine slice closed；SillyOS downstream handoff 保持独立、可继续执行的清单。

## 4. SillyOS downstream handoff record

此清单不是 M0–M3 关闭门槛。并行 UI foundation 和 DS1 关闭后，public Session seam 已按原边界执行；
完成 public Session seam 迁移不表示长 Conversation/Process clean replacement 已完成。

### 4.1 Public Session seam 迁移

1. 以命名恢复分支保留完整 DS1 提交基线，并在干净 worktree 上吸收引擎提交；
2. Browser Pi connector 和 Creator Agent port 改用 `@sillymaker/agent/session`，删除
   `@sillymaker/agent/internal` 的 RPC imports；
3. 产品 connector 保留自己的 Worker request/response/event wire；Engine 不认识 Worker protocol；
4. 当前固定 Creator 提示继续由产品 connector 拥有；Program bootstrap 与 resource message part 只有在真实
   Program/附件纵切确定合同后才单独激活；
5. Program candidate 由 `output_data` 到达并由 SillyOS admission；普通文本由 `output_text_delta` 到达。
   产品可先把 rich transcript 的 product-private structured parts 作为 `output_data` 搬运并在 SillyOS
   admission；Engine 不解释其 tool/reasoning/Artifact 语义，也不因此宣称 public typed vocabulary 已交付；
6. SillyOS Provider/Worker/currentness/cancel/forget/close 与 UI foundation evidence 已作为产品候选门验证；
7. SillyOS DESIGN/PLAN/README 与引擎当前文档已改为 delivered public Session 消费者，同时保留
   private Host/`UiArtifact` 和产品 Worker wire 的边界；
8. downstream 候选通过 SillyOS 77 个文件 / 640 个单元测试、Chromium + WebKit 产品 E2E 51 项通过 / 1 项
   runner 条件式 characterization 跳过、三类 Browser artifact build/security check，以及仓库总检查的 475 个文件 /
   6,198 个测试；pinned React Doctor 从 10 errors / 58 warnings 收敛为 0 errors / 54 项已逐类审阅的
   warnings，未为清零 heuristic 重写产品状态机。

### 4.2 SillyOS Process/Conversation clean replacement

1. 先在独立 worktree 的 controlling DESIGN/PLAN 选定 Program head 与 Process/transcript segments 分离的新 schema，
   并明确裁决 pre-stable preview data 是直接 reset 还是执行一次 exact migration。同一 slice 替换旧 V3
   aggregate/admitter/fixtures/tests，删除旧 reader，不保留 dual reader 或 compatibility shim；
2. 删除当前每 Program 96 messages / 96 Activity、32 terminal receipts 和把完整 transcript 塞入
   512 KiB Program aggregate 的临时合同；Conversation/Process 在逻辑上不设任意总消息条数上限，
   不静默截断、不静默删除旧历史，也不因长期 Process 超过一个聚合字节预算就拒绝整份快照；
3. Program head/summary 可以保持有界，但 transcript 必须按 `processId` 和单调 entry/part identity
   分段、分页持久化；单条、单块、单个 Artifact 和存储交易仍做明确字节 admission，超出时继续新块或
   给出可操作的配额错误，不把存储预算转换成语义历史上限。Activity 只有在作为可从 transcript/
   receipts 重建的最近摘要时才可单独有界；若它是唯一 tool/run 审计记录，就必须同样分页保留；
4. Conversation 必须能呈现富文本消息 parts、assistant 流式输出、tool call/status/result、Artifact 引用，
   以及 provider/Pi 明确暴露并允许展示的 reasoning summary/transcript；不承诺、推断或伪造模型未公开的
   hidden chain-of-thought。当前 public Session 的 text delta / generic data / terminal 不声称已覆盖这些结构语义；
5. 同一时刻只挂载当前 Process 的 Conversation subtree；切换前保存 draft、scroll anchor 和 selection，
   然后卸载旧 subtree 并释放 rich-text/OpenUI/tool/media/object-URL/observer 资源。当前 transcript
   按页读取并 window/virtualize；`content-visibility` 只能作为 layout/paint 优化，不作为 DOM 资源回收；
6. Browser local Pi 按下文的可中断执行合同工作；用长 transcript、富文本/tool blocks、Process 切换、
   reload 和可控 discard/recovery 情景验收无历史丢失、mounted resource 有界、输入/流式输出仍可响应，
   以及 retired generation 永不发布。性能 fixture 必须明显大于任何单个内存 window/page，但不把 fixture 规模
   反向冻结成产品历史上限。

### 4.3 Conversation/Process 与 Browser 可中断执行合同

SillyOS 的 Browser local Agent 必须诚实承诺：

> **前台执行，允许中断；保证不发布 stale 结果。最近的已确认持久语义检查点仍可读且 admission
> 成功时恢复到该检查点；否则进入明确的 interrupted/unrecoverable recovery UI，绝不从 Worker 内存或 stale 事件伪造恢复。**

这是 Process/Pi adapter 合同，不是浏览器能保证的后台继续运行：

- Dedicated Worker 是执行/性能隔离，不是 durability boundary；隐藏页面可被冻结或直接丢弃，
  discard 当下没有可依赖的 JavaScript callback。[Chrome Page Lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)
  要求把 `hidden` 当作最后一个可靠的保存机会，并在重载时用 `document.wasDiscarded` 识别丢弃恢复；
- Process 在接受用户输入后、任何可见或外部副作用前，先持久 `processId`、`attemptId/runId`、
  generation、accepted input 与起始 checkpoint；不把只存在 Worker 内存的 active run 当作可恢复证据；
- 持久语义检查点至少包括 accepted user input、committed assistant/tool record、workspace mutation
  receipt 与 workflow-stage completion。流式 text/reasoning delta 是当前 attempt 的 transient projection；
  中断后可以保留带明确 `partial/interrupted` 标记的有界草稿作为诊断，但不得伪装成 committed message；
- 当页面进入 `hidden`，产品立即保存未提交 Process/view state、停止无意义 UI update，并请求 Pi
  进入可检查点。`freeze` / `pagehide` 只用于 fence 新 effect、启动已就绪的 commit 与关闭连接，
  不承诺浏览器会等待新的 async flush。因此持久化必须在运行途中持续发生，而不是把关闭事件当作唯一保险；
- 恢复/reload 创建新 execution generation，只能从三条路径中选择一条：有 Pi/provider-owned opaque
  continuation 时 attach/restore 并对账 authoritative run status；只有 admitted product workflow checkpoint 时，
  创建新 attempt 从该业务阶段恢复，但不声称延续同一 Pi session/context；两者都没有时把旧 attempt
  终结为 `interrupted/retryable`，不自动续跑，不得继续显示 `running`，也不得把 presentation transcript 重放为 Pi context；
- tool/capability 为副作用声明 replay policy 与幂等/receipt identity。无法确定是否已发生的 file write、
  command、download 或外部 mutation 不得盲目重放；必须对账、人工确认或显式失败；
- UI 选中与 execution currentness 分离。不可见 Process 在 Host 仍能执行时可继续 best-effort 运行，
  但结果只能按 exact Process + attempt + generation + sequence 写回自己的 repository，不能取得当前可见 UI 的所有权。

### 4.4 Workflow 与未来子 Agent 顺序

SillyOS 可以吸收 `references/pi-workflow` 的 fixed stage graph、run record、Artifact/output、stop/resume
和 durable checkpoint 思想，但该实现依赖 Node 文件、进程与 async-context 能力，不直接进入 Browser 构建。
Program 需要的浏览器工作流继续是 SillyOS 产品数据与 Pi adapter 能力，不改写 Engine `StateWorkflowV1`。

`pi-workflow` 已依赖另一个 `@agwab/pi-subagent`；不同时引入独立的 `references/pi-subagents`。
先以单 Agent 翻译 Program 交付“多阶段 + 可取消 + 可中断恢复 + 副作用对账”的真实纵切；
只有一个真实 Program 需要并行专家分工后，才把子 Agent 定义为可选 Pi/Program capability，
并同时定义 parent/child identity、有界并发/成本预算、取消传播、独立 checkpoint/receipt 与人类可见状态。
若真实消费证明它的 build-known code/resource lifecycle 适合产品 Mod 边界，再由产品显式选为 trusted Mod；
否则保持 Pi extension/product adapter。该能力不默认进入 Program，也不进入 SillyMaker 内核。

## 5. 条件式后续候选

Asynchronous connection loss 候选已由所有者在本计划关闭后显式激活，并由独立
[Agent Session 异步断连收口](2026-08-30-agent-session-asynchronous-connection-loss.md)交付；它不再是
inactive backlog。以下其余候选只记录 handoff 原始结论，不自动激活：

| Candidate                            | 激活证据                                                                                                   | 最小中立提升                                                                                   | Stop rule                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Session bootstrap / resource message | 一个真实 Program process 需固定 revision，或一个真实附件纵切不能由 connector 局部表达                      | versioned bootstrap 或 immutable opaque resource reference，分别 admission                     | 不暴露 prompt、路径、URL、Blob、provider 或产品 storage                                 |
| Multi-attachment Host intake         | 翻译 Program 需要一次选择多个真实文件                                                                      | bounded `selectMany`，保留名称、媒体类型、每文件与总字节预算                                   | 一旦需要目录/VFS/数据库，退回 SillyOS 产品层                                            |
| OpenUI / UiArtifact                  | 一个真实翻译流程完成动态 UI 闭环                                                                           | immutable revision、catalog identity、CAS/currentness、intent routing、fallback                | 不把 OpenUI schema、产品组件或业务 mutation 放进 Base                                   |
| GUI application portal target        | SillyOS UI foundation 稳定后仍需避免 portal 逃出产品主题/Host                                              | application-owned portal/overlay target                                                        | 不整体上游 Tailwind/Radix recipes 或 SillyOS design system                              |
| Exact Mod restore guard              | Process 恢复实测可能在 catalog 更新后解析到不同 closure                                                    | publication 前比较 optional expected resolved manifest                                         | 不建设全局多版本 catalog、runtime npm resolver 或 marketplace                           |
| Neutral resource source/lease        | SillyOS 与第二个 VN/Mod/authoring consumer出现相同大资源需求                                               | immutable resource identity、lazy open、lease/dispose                                          | 不把 Program asset store、OPFS、retention 或 GC 放进 Engine                             |
| Structured conversation stream       | SillyOS 先用 product-private `output_data` projection 证明真实语义，再出现第二个中立消费者或重复稳定 shape | versioned typed parts/events、stable entry/part ID、ordered patch 与 terminal/finalized event  | 不暴露 raw provider wire、可执行 HTML/React 或 hidden chain-of-thought                  |
| Durable Session attach/reconcile     | Desktop/remote Pi 或第二个 connector 能提供 authoritative continuation/status                              | 由产品提供的 opaque session reference、observed run snapshot/events-after、detach/destroy 语义 | Engine 不持久 reference，不建 Process repository、tool journal 或 provider retry policy |
| Application activity/recovery signal | SillyOS 与第二个 GUI consumer 都真实消费 hidden/freeze/resume/discard recovery                             | Host-owned observable activity/currentness signal                                              | 不拥有 checkpoint store、Pi resume policy 或 OS background guarantee                    |

## 6. 必须留在 SillyOS 的产品能力

- ProgramDefinitionRevision、ProcessInstance、conversation、branch、reroll、memory；
- Program/Process repositories、分页 presentation transcript、revision retention、migration 和 GC；
- Pi workflow、prompt、skills、tools、provider/model、credential、network permission、run journal、checkpoint、
  replay policy 与 interruption reconciliation；
- Workspace、OPFS/IndexedDB、Program asset bundle 与 mutable overlay；
- 翻译格式识别、术语表、人物关系、写作与角色扮演规则；
- OpenUI adapter 的产品 component catalog 与业务 Query/Mutation；
- 真实 Agent backend、模型调用成本、权限 UI 和产品恢复策略。

Engine 的 `StateWorkflowV1` 是确定性领域事件事务，不是 Agent DAG/workflow；不得为复用名字而扩张。Host record
store 继续只服务明确的 engine/application record authority，不演化为通用数据库。

## 7. 明确不做

- public Agent Host、UiArtifact renderer/admission、OpenUI/A2UI adapter 或 conversation persistence；
- Program/Process/Workflow/Database/VFS 的通用 engine model；
- Pi runtime、extension system、Provider、Credential 或 Network Broker；
- Mod marketplace、package discovery、runtime npm resolver、任意 post-release executable 或 sandbox；
- 为证明 API 而伪造 authoritative gameplay Mod、SillyOS Mod 或第二套 Agent runtime；
- 修改仍由另一 task 拥有的 SillyOS UI foundation worktree。

## 8. Engine slice closure record

M0–M3 于 2026-08-30 关闭。最终实现额外收掉了四个由回归和独立复审确认的 lifecycle/currentness
缺口：submit settlement reaction 的首事件排序、terminal observer reentrancy、同一 Session 的 run ID
ABA 复用，以及 reconnect/concurrent-dispose 对同一 async close barrier 的 join。client 不为 active runs
设置任意数量上限；terminal 退役 active tuple，但保留本 Session 的 seen identity 以拒绝旧流伪装成新 Run。

最终证据：

- `deno task check`：format、lint、stylelint、typecheck、determinism、399 个 Vitest 文件 / 5,563 个测试、
  Composition/State bench contracts、仓外 public Mod tarball Deno/Vite/Chromium smoke、assets、全部应用检查与
  E2E production build 通过；
- focused Agent/Studio/Engine Lab：5 个文件 / 23 个测试通过；新增 public Session contract 与 type-only
  export boundary 覆盖；
- Chromium + WebKit 的 incompatible Authoring R1 reject / compatible retry + held Agent 纵切：2/2 通过；
- pinned React Doctor 0 项，`git diff --check` 与 public/private structural search 通过；
- 独立 diff review 的 terminal-before-observer、same-session ABA、in-flight close join 与 concurrent dispose
  findings 均有先失败后通过的回归。

本 M0–M3 关闭证据在当时不宣称 SillyOS 已迁移。随后的 downstream handoff 已按 §4
完成，不重新定义 Engine Session/Run，也不激活 §5 的 bootstrap、附件、OpenUI、portal、Mod
restore 或 resource-source 候选。公共 Session currentness 只保证拒绝 retired generation / run 的迟到事件，
不保证页面冻结/丢弃后继续后台执行、中途 token 恢复或未回执 tool effect 的自动重放。

downstream 终审当时确认 asynchronous connection loss 是一个中立 handback 候选：原公共 connector
无法在 ready 后且没有 pending operation 时通知 client，SillyOS 因而保留了产品私有 transport callback。
所有者随后显式授权独立 lane；纯 connector 回归已复现缺口并由上述收口计划交付中立 closed signal、client
generation/status fencing 与 SillyOS 公共 snapshot 迁移。历史 M0–M3 的其余边界不变。
