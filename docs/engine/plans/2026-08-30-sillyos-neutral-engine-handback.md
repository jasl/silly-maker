# Neutral Agent Session/Run 与 SillyOS Engine Handback 计划

状态：**2026-08-30 经所有者接受并完成 M0–M3 的公共 Agent Session/Run engine slice；
SillyOS 随后完成独立 downstream handoff，当前没有自动激活的后继。**

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

此清单不是 M0–M3 关闭门槛。并行 UI foundation 和 DS1 关闭后，已按原边界执行：

1. 以命名恢复分支保留完整 DS1 提交基线，并在干净 worktree 上吸收引擎提交；
2. Browser Pi connector 和 Creator Agent port 改用 `@sillymaker/agent/session`，删除
   `@sillymaker/agent/internal` 的 RPC imports；
3. 产品 connector 保留自己的 Worker request/response/event wire；Engine 不认识 Worker protocol；
4. 当前固定 Creator 提示继续由产品 connector 拥有；Program bootstrap 与 resource message part 只有在真实
   Program/附件纵切确定合同后才单独激活；
5. Program candidate 由 `output_data` 到达并由 SillyOS admission；普通文本由 `output_text_delta` 到达；
6. SillyOS Provider/Worker/currentness/cancel/forget/close 与 UI foundation evidence 作为产品候选门继续验证；
7. SillyOS DESIGN/PLAN/README 与引擎当前文档已改为 delivered public Session 消费者，同时保留
   private Host/`UiArtifact` 和产品 Worker wire 的边界；
8. downstream 候选通过 SillyOS 77 个文件 / 640 个单元测试、Chromium + WebKit 产品 E2E 51 项通过 / 1 项
   runner 条件式 characterization 跳过、三类 Browser artifact build/security check，以及仓库总检查的 475 个文件 /
   6,198 个测试；pinned React Doctor 从 10 errors / 58 warnings 收敛为 0 errors / 54 项已逐类审阅的
   warnings，未为清零 heuristic 重写产品状态机。

## 5. 条件式后续候选

以下候选只记录 handoff 原始结论，不自动激活：

| Candidate                            | 激活证据                                                                              | 最小中立提升                                                                    | Stop rule                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Asynchronous connection loss         | 已 ready 且无 pending call 时，真实 connector 可异步失去底层连接                      | connector 发出一次中立 closed signal；client 统一 generation fencing 与 status  | 不暴露 Worker、credential、provider、workspace 或产品恢复策略 |
| Session bootstrap / resource message | 一个真实 Program process 需固定 revision，或一个真实附件纵切不能由 connector 局部表达 | versioned bootstrap 或 immutable opaque resource reference，分别 admission      | 不暴露 prompt、路径、URL、Blob、provider 或产品 storage       |
| Multi-attachment Host intake         | 翻译 Program 需要一次选择多个真实文件                                                 | bounded `selectMany`，保留名称、媒体类型、每文件与总字节预算                    | 一旦需要目录/VFS/数据库，退回 SillyOS 产品层                  |
| OpenUI / UiArtifact                  | 一个真实翻译流程完成动态 UI 闭环                                                      | immutable revision、catalog identity、CAS/currentness、intent routing、fallback | 不把 OpenUI schema、产品组件或业务 mutation 放进 Base         |
| GUI application portal target        | SillyOS UI foundation 稳定后仍需避免 portal 逃出产品主题/Host                         | application-owned portal/overlay target                                         | 不整体上游 Tailwind/Radix recipes 或 SillyOS design system    |
| Exact Mod restore guard              | Process 恢复实测可能在 catalog 更新后解析到不同 closure                               | publication 前比较 optional expected resolved manifest                          | 不建设全局多版本 catalog、runtime npm resolver 或 marketplace |
| Neutral resource source/lease        | SillyOS 与第二个 VN/Mod/authoring consumer出现相同大资源需求                          | immutable resource identity、lazy open、lease/dispose                           | 不把 Program asset store、OPFS、retention 或 GC 放进 Engine   |

## 6. 必须留在 SillyOS 的产品能力

- ProgramDefinitionRevision、ProcessInstance、conversation、branch、reroll、memory；
- Program/Process repositories、revision retention、migration 和 GC；
- Pi workflow、prompt、skills、tools、provider/model、credential 和 network permission；
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
restore 或 resource-source 候选。

downstream 终审同时确认 asynchronous connection loss 是一个中立 handback 候选：当前公共
`AgentSessionConnectorV1` 只有 event sink，无法在 ready 后且没有 pending operation 时通知 client
连接已丢失；SillyOS 目前用产品私有 `onConnectionLost` callback 正确兜底。此发现不阻塞当前产品迁移，
也不授权本分支扩公共 API；应在后续独立 Engine lane 先以纯 connector 复现，再决定是否激活 §5 对应候选。
