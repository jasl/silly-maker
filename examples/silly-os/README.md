<!-- SPDX-License-Identifier: MIT -->

# SillyOS Program Preview

SillyOS 正在从复古桌面示例重写为一个服务创作者的 Agent 产品：人类描述想做什么，
Creator 把意图整理成双方都能理解、运行、检查和继续修改的 Program。

```text
Program = reusable workflow + Agent profile + tools/scripts + guided UI
Process = one durable conversation/project + Workspace + domain work/results
```

Agent Creator 与 Translation 是当前两个 bundled Program。Bundling 只表示随 SillyOS 分发，
不授予运行时特权；它们与以后准入的 Program 使用同一个 UI Container、Process/Workspace、
Agent、admission 与 currentness 规则。Program 是可复用的工作方式；每次使用
Program 创建一个持久 Process。对 Translation 而言，这个 Process 本身就是用户理解的翻译
Project，不再另设 Project 身份、列表、路由或生命周期。

## 目前能体验什么

普通入口现在提供 Browser Provider 设置。Settings 明确分为 **General**、**Providers** 和
**Credential Vault** 三类；Creator Home 的 Provider warning 会直接进入 Providers。Provider
只要具备当前 Browser 已实现的单 Key 凭据形状、API 协议适配器和 canonical HTTPS Endpoint，
其目录模型就可以供用户勾选。这只是 Browser 技术兼容边界，不声称 SillyOS 逐个调用、评测或
批准过每个模型。

模型行是多选 checkbox，用于指定哪些模型出现在 Agent Creator；另一个 preferred model 是当前
默认执行目标。全新非秘密设置会从产品维护的推荐 model family 与当前 Pi 目录的精确交集初始化
一组 checked models，用户可以随时增删；推荐不构成质量准入。Creator Home 与 Program
workspace 的输入框复用同一个模型选择组件。可用选项是 checked models 与**已解锁 Vault 中精确
Provider/Endpoint binding** 的交集，不再依赖某个 Agent Worker 此刻是否已持有 Key。没有可用
选项时 Home 只显示 warning；有可用选项时只显示模型选择器，并按 preferred 或首个可用模型向
新 Agent Worker 懒交付对应 Key。同一 credential scope 内切换模型复用当前 Worker；跨
Provider/Endpoint scope 则从 Vault 做新的精确 typed handoff。只有用户模型切换成功后才更新
preferred；保存 Key 与连接测试都不会修改 checked/preferred 模型。

可用 built-in 的详情会在 Connection 区域只读展示产品目录给出的一个或多个固定 Endpoint
scope；同一 Provider 的 **Save** 会把所给 Key 分别绑定到这些完整 normalized scopes。
Custom Endpoint 只保存其自身 profile 与 exact endpoint binding。Save 总是把 Key 加密持久化到
Credential Vault，输入框随后清空；保存本身不请求 Provider，也不需要先测试具体模型。在同一
scope 再次 **Update** 会替换旧密文。完整 Key 不回读到 UI、普通产品状态或 Workspace。

全新 Vault 默认使用 **Automatic**：Vault IndexedDB 保存一个不可导出的设备 AES-GCM key，新的
Vault Worker 会自动验证并解锁，因此刷新或冷启动后可以直接把精确 binding 交给 Agent Worker。
用户也可以在独立 Credential Vault 设置中切换到 **Password**，把现有全部凭据原子 rewrap 到
密码派生 key；Password 模式支持显式 Lock、Unlock 和修改密码，也可以再切回 Automatic。
Connection 的删除图标会删除对应 exact binding，并在它正被 Agent 使用时撤销该 Worker 的凭据。
Key 会一直保存到用户 Forget 或清除此站点数据。

独立的 **Test connection** 只是可选、可重复的时间点诊断。用户可以从该 Provider 所有技术上
可调用的模型中选择测试目标；这不受 checked models 限制，也不会改变 preferred 或可用性。
测试会发出一次很小但可能计费的真实请求；错误的 Key、模型名、Endpoint 或网络条件会在测试
或后续真实 Agent 调用中如实失败，测试成功也不认证其他模型。
保存成功后可以体验：

Bedrock 这类 ambient、OAuth、keyless 或多字段凭据 profile 仍可查看，但不会被压成一个假的
API-key 表单，也不会显示可用的 Test connection。

- 从 Creator Home 提交翻译、写作、角色扮演或通用创作意图；
- 查看确定性的本地 Creator 回复和带明确版本的 Program proposal；
- 在 Program workspace 中同时查看人类/Creator 的分页富文本 Conversation、proposal 与预览；
- 接受或拒绝当前精确版本；补充要求会形成新的 `pending` 版本，旧版本决定会被完整拒绝；
- Program 与 Creator Process 会在同一事务提交后写入此浏览器；返回 Home 或刷新页面后可以从
  “最近的程序”重开同一修订、决定和完整 pageable Conversation；
- 已接受的 Translation Program 可以进入真实的 `sillyos.builtin.translation` revision 1
  Process 路由。该路线创建独立
  Process Workspace，并能 cold-reopen 同一 Process、Conversation、Workspace binding 与 V13
  Translation workset head。guided workbench 已把上传控件和 Process 自有的分页 source workset 接到
  controller。导入取得 Process execution lease 时，会在同一个 IndexedDB transaction 核对
  workset 仍不存在或仍是调用方见到的精确 staging revision；取得 lease 后，Workspace 原件写入、workset begin、每页
  append 与 finalize 都核对同一 attempt/generation；耗时的 Workspace 写入在前台按统一 lease
  cadence 续租，但浏览器冻结后仍以 generation fence 而非后台持续执行作保证。过期且未完成的导入 Process 会保留为
  `interrupted_unrecoverable` 供按 ID 审查，而 Home 的下一次启动会创建新 Process，不会被旧
  Process 永久阻塞。Workset ready 与 completed Process terminal/checkpoint 在同一个 IndexedDB
  transaction 发布，避免出现已完成 workset 配上失败 Conversation 的双重事实。这里没有独立
  Project 身份、列表、路由或生命周期；持久化 Process 直接拥有 source rows、glossary、candidate
  与 review 状态。当前还提供 bounded Agent batch、可编辑候选的整批接受/拒绝和接受后 cold
  reopen，但仍缺格式保持 exporter 与完整 QA，所以还不是可完成翻译的普通用户旅程。

固定 Pi 提供窄 `fetch_url({ url })` 与 `download({ url, destination, overwrite? })` 工具。每个
Program 只有一个 **允许网络访问** 复选框，默认关闭；关闭时工具在 Network Broker 收到请求前
返回 `network_disabled`，开启后两个工具可直接访问通过合同校验的 HTTPS URL，不再出现逐次、
逐 URL 或逐 origin 审批。该选择作为普通非秘密产品设置持久化，不包含完整 URL 或 API Key；
Agent Worker 会在每次 admitted submit 前同步当前 Program 的布尔值。真正的 `GET` 只在独立
origin、无 API key 的 Network Broker 中执行，不携带 Cookie、Authorization、referrer、body
或自定义 header；`fetch_url` 只返回不超过 `256 KiB` 的声明 UTF-8 文本/JSON/XML。目标仍必须
允许 Browser CORS；这不是任意网页抓取或搜索能力。`download` 使用独立 Broker，在 Workspace
Host 准备好私有 staging 后才开始 GET，每次最多转交一个等待 ACK 的 `1 MiB` chunk，完整且仍
current 的 2xx 响应才会通过原有 journal 发布到 Program volume。Chromium 与 WebKit 已各自
验证 `32 MiB` 二进制、SHA-256、generation/receipt 和冷重开；这仍不等于任意站点 CORS、线上
ingress、搜索、解压、认证下载或真实模型调用已经通过。Provider 请求是独立的凭据面能力，不受
Program 网络开关控制。S2-N3 已通过完整 521 项 SillyOS 单元套件、Chromium/WebKit 的
开关/冷重开/`fetch_url`/`32 MiB download` 路径及三份生产构建边界检查，并已进入当前
`a17c3490` 三 origin artifact；artifact availability 不提升上述行为资格。

另有一个只在 `?agent=pi-test` 出现的 B0a 验证入口：它会把产品 lockfile 固定的
`pi-agent-core` / `pi-ai` 0.84.4 懒加载进 Dedicated Worker，通过 typed RPC 运行真实
Pi `Agent`、确定性本地 provider 和唯一的 `sillyos_propose_program_revision`
`AgentTool`，并让一次 follow-up 产生精确的 v2 proposal。这个入口只接受合成测试值；
它不会请求 LLM，也不会把测试值写入 React state、URL、日志、网络请求、Program 数据或
浏览器持久化存储，forget 会终止 Worker。

P1-B1a 已把 B0b 的 `?agent=pi-openai` 用户入口清理掉。普通 URL 的设置页从产品固定的
Agent Worker 无凭据读取完整 Provider/model catalog；React 不导入底层 runtime，也不维护第二份目录。
B1c 另外把 **Built-in Providers** 和 **Custom Endpoints** 分区。自定义 profile 只允许
HTTPS base URL、model id、显式 context/output 上限，以及 Pi 已提供的四种 API family：
`openai-completions`、`openai-responses`、`anthropic-messages`、
`google-generative-ai`；协议永远不从 URL 猜测。每个非秘密 profile 的字段都经过字节准入，完整
Browser Settings 记录共享明确的 `64 KiB` UTF-8 存储预算，而不是另设 profile/model 条目数上限。
API Key 总是由已解锁 Vault 按该 profile 身份与完整 normalized
HTTPS endpoint 的精确 binding 加密持久化；修改 endpoint 不会隐式重绑旧 Key，需要保存新的
binding，并可从独立 Vault 列表 Forget 已不再使用的旧 binding。最近一次测试状态不会持久化，
一次测试成功也不会升级成 SillyOS 的 built-in 双浏览器资格结论。

当前产品已经有由 Dedicated Worker 持有的 Browser IndexedDB Program Data
Repository V13；它按行保存 Program head/revision/decision、Process、分页富文本
Conversation、Process lease/fencing 状态、`process_commits` 中的精确 operation receipt、
Workspace continuation、Program 网络开关，以及 Translation Process 自有 workset head、精确 import
receipt 和可分页 unit/glossary rows。原始 Translation 文件由同一个 Browser Workspace
Authority 写入 Process 自己的 Workspace；Repository 只保存其 SHA-256、规范相对路径和精确
checkpoint binding。它不保存 API Key、Pi 私有 session/continuation 内容、附件字节或
workspace 文件。Credential Vault
使用独立 Worker 与独立 IndexedDB database 保存 Vault header、
非秘密绑定 metadata 和密文；这属于存储所有权分离，不是同一 origin 内的物理权限隔离。
初始 proposal 仍由本地 deterministic preview 产生；接受 proposal 会把精确复核过的
workspace head 发布为本地不可变 Program snapshot，但不会因此生成、部署或托管一个真实
应用。这个边界会在界面中如实显示，不使用假网络层来伪装后端。

## 已完成的 P4-A 执行与恢复边界

P4-A 已于 2026-08-30 在本地完成并通过独立审查。交付的产品体验是
可分页的 rich Conversation，以及一次只挂载一个 active Process 的 bounded UI projection。
切换 Process 会卸载旧富文本、工具和媒体子树，但不会截断或删除它的持久 Conversation。

执行侧只需要三种 Product Repository 语义原子事务；lease renewal 是单独的活性 CAS，不推进语义
checkpoint：

1. 在 Pi submit 前，原子写入已接受的用户 entry、active attempt、起始 Process/Workspace
   checkpoint 与 `process_commits` 中的精确幂等 operation receipt；
2. 成功时，原子写入 successor Program、admitted terminal transcript batch、绑定当前 lease
   generation 且命名 exact Workspace checkpoint 的最终 Process checkpoint，以及 exact terminal
   operation receipt，避免 Program 成功和 Process 终态只出现一边；
3. 失败、取消、替换或中断时，只写 admitted terminal transcript batch/Process terminal
   与 exact terminal operation receipt；不伪造新的 Program revision，也不推进新的语义
   Workspace checkpoint。

每个正在运行的 attempt 由 **Process-scoped renewable lease** 保护。每个新 attempt（首次执行或
用户明确重试）都会获得严格递增的 fencing generation；heartbeat 只续租，不代表语义进度，也不是 Conversation 或
Workspace checkpoint。任何旧 generation 即使在页面或 Worker 恢复后也不能再发布。
闲置标签页不占有 Process lease，也不预先打开或占用 Program Workspace。Send、Retry 与 Export
在用户触发时才取得一个 exact Workspace session；Send/Retry 随后才通过同一 Product Repository
事务原子竞争 Process lease，竞争失败者释放刚取得的 exact Workspace session 并刷新投影。Export
只临时使用 Workspace，不取得 Process lease。terminal 已持久提交且 Agent terminal acknowledgement
完成后，页面才按 exact `workspaceSessionId` 释放该 session；瞬态释放失败保留为待重试清理，由同一
被动刷新节奏继续尝试，且永远不能关闭后来打开的 successor session。

被动标签页在这个节奏上既检查持久 Process revision，也在 revision 未变但仍有 active attempt 时
检查它的 exact lease 是否已过期。revision 变化或过期恢复落盘后才重载 Conversation；其他标签页
仍持有 lease 时，Composer 保持只读。如果本页在 acquire 竞争中失败，则立即刷新。这只是 UI
投影失效与资源清理触发器，不是第二个正确性通道；页面冻结或漏轮询也不会削弱 IndexedDB
generation fence。仍有一个不能伪装成可恢复的窄窗口：页面在取得 Workspace volume lock 后、原子
取得 Process lease 前被冻结时，其他页面不能安全抢占该 Workspace，只能等待浏览器释放 volume
lock；系统不会用 lease 过期去推断该 Workspace 已可写。

冷启动以原子提交的 Process head 为语义真相：已提交的 terminal 已清空 active attempt
并记录 `lastTerminalAttempt`；仍有 exact active attempt 和 expired lease 则表示 terminal 尚未提交。
后者用 attempt 起点与 Sandbox authority 的 Workspace checkpoint 判断应标记
`interrupted/retryable` 还是 `interrupted/unrecoverable`。发起该 mutation 的同一调用若收到
`outcome_unknown`，只查询它的同一个 exact operation receipt；不扫描整段 Conversation、
不根据 UI 猜测，也不盲目重放写操作。

已经提交的 interrupted terminal 是不可改写的历史。空闲页面没有预先打开 Workspace，因此在
当前 head 尚未知时可以先展示 Retry；点击后才按需打开 exact Workspace session，并把权威
Workspace review 与 Process 保存的 checkpoint 做精确比较。已知 head 不匹配时不展示 Retry；
点击时发现后续漂移或 Workspace 不可用时，重试返回 unavailable，并从当前投影中移除按钮，但
不改写 `lastTerminalAttempt`、不推进 Process revision，也不增加第四种语义事务。

Process lease 与 Sandbox volume lock 是两个分离的权威。lease 已过期但 Workspace
仍报告 `workspace_busy` 时，界面保持可读且处于 recovery-pending；不抢占 volume，
也不把临时锁争用判定为 unrecoverable。后续每次被动轮询都会再次尝试；只有能读取权威
Workspace checkpoint 后才会结算过期 attempt。

这不是逐工具 event sourcing：P4-A 只允许在 lease-bound terminal batch 中持久化面向用户的工具
调用/状态/结果；运行中的 rich parts、interrupted partial、每个 tool 的 mutation receipt 和 workflow
stage 都不作为中途恢复日志。需要持久中间阶段的真实 workflow 必须另开后续 lane。P4-A 也不建设
通用 workflow 引擎、不声称 IndexedDB 与 Sandbox OPFS 可以跨 origin 原子提交，也不提供通用
rollback/replay，或通过反向扫描 Conversation/receipt trail 重建结果。浏览器可能暂停或丢弃后台
执行；lease、fence、receipt 与 checkpoint 的目标是让恢复结果诚实，而不是承诺后台永远继续运行。

P4-A0–P4-A4 均已完成。聚焦独立合同通过 `97/97`；P4-A 的 rich Conversation、reload 与受控 discard
旅程在 Chromium/WebKit 通过 `4/4`，真实双页面 Process lease 竞争/被动观察旅程在两引擎通过
`2/2`。`deno task check` 通过 `481` files / `6,251` tests，并覆盖 public Mod 外部消费者、Browser、
应用 build 与结构排除 gate；React Doctor 的 24 条建议均被归类为非阻断建议，没有机械套用。
完整 Chromium SillyOS 产品套件也通过 `27/28`：一个既有平台条件 case 被跳过，其余 27 个
实际执行 case 全部通过，其中包含 DS1 视觉基线和两条 P4-A journey。

大历史 Browser fixture 只直接播种旧 Conversation 前缀以测量存储、分页与渲染；同一旅程的
attempt/terminal 仍走真实 lease-bound Repository 路径。页面正常销毁目前也不会主动释放 Process
lease，竞争者最久可能等待约 30 秒过期；单调 generation fence 仍保证旧 owner 无法发布。

## Browser 安全与执行边界

2026-08-29 起，SillyOS Browser 使用四个明确分开的职责/权限边界：

```text
SillyOS UI / Product Core
  +-> Credential Vault Worker
  |     -> 独立 IndexedDB database 中的加密 Provider 凭据
  -> typed Agent RPC
产品固定版本的 Pi Agent / Credential plane
  +-> typed WorkspaceExecutionPort
  |     -> 独立 origin 的 Workspace Execution Sandbox
  |          -> 当前 Program 专属 VFS volume
  +-> typed NetworkCapabilityPort
        -> 独立 origin、无凭据的 Network Broker
             -> 有界 Browser HTTPS text fetch
```

SillyOS 控制面只执行产品随附、由 lockfile/build identity 固定的可信代码。用户、Agent、
项目、导入内容或模型生成的 JavaScript、HTML、Python、shell 与其他代码不得在 SillyOS
origin 中执行；生成 HTML 也不得注入控制面 DOM。Pi 仍是唯一 Agent、Provider、模型和
Agent loop 来源。当前 deterministic 与 live Pi 路线都通过独立 origin Sandbox 获得 Pi
原生 `read`/`write`/`edit`/`bash`；SillyOS 另外以 Pi `AgentTool` 注册一个固定、只读、
结构化的 `grep` capability，以及固定的 `fetch_url` / `download` capability。`grep` 使用显式
typed Workspace RPC；网络工具只能在一次性或当前 Program 持久化的精确授权后进入无 Key 的
第三 origin Broker。它们都复用 Pi 的工具/Agent loop，不是第二套 tool dispatcher。Workspace
Sandbox、QJS 和 just-bash 仍保持无网络，未注册 `curl`。

产品数据、凭据与 workspace bytes 分属 Product Repository、Credential Vault 和 Workspace
Volume Repository。Product Repository 与 Credential Vault 使用不同 Worker 和 IndexedDB
database，因此普通 Program 生命周期与导出不会拥有或混入凭据；但两者仍处于 control origin，
不同 database 名称只提供所有权分离，不构成对同源恶意代码的物理权限隔离。S1a-1 已在 source
中把普通 Program 的唯一 Authority 切到独立 Sandbox origin：控制面创建精确 origin frame
transport，Sandbox 内固定 Host Worker 独占 OPFS、
snapshot/export 与 volume 生命周期，旧控制-origin Host Worker 和 fallback 已删除。物理 Product
Repository V13 是当前 pre-stable clean replacement：规范化
Program/Process/Conversation stores、Process execution lease 与单一
`process_commits` operation-receipt authority 保持不变，并新增唯一
`process_workspace_bindings`，把一个非 Creator Process 精确绑定到自己的
Workspace/OPFS volume；Translation Process 直接拥有 workset head、import receipt、分页
unit/glossary stores、pending candidate 与 accepted-target review 状态。物理 store 和 receipt
统一采用 `translation_workset_*` 语义，不存在独立 Project 产品层级。Program-scoped Workspace continuation 与缺行即默认关闭的
network-access row 仍是不同 authority。Process、首个 transcript checkpoint 和 binding
可在一个 IndexedDB transaction 中提交；OPFS volume 的物理创建仍由 Sandbox Host
单独拥有，不伪装成跨 IndexedDB/OPFS transaction。
由于产品尚未发布稳定持久化合同，V13 对任何较早的预览数据库执行 row-blind reset，
不读取或迁移旧 rows。旧 control-origin OPFS bytes 可能仍由浏览器保留，但产品不再可达，
也不会把它们作为迁移输入。

Credential Vault V2 是 Provider Key 的唯一持久 owner。Fresh initialization 自动创建
**Automatic** 模式，把不可导出的设备 AES-256-GCM `CryptoKey` 保存在 Vault IndexedDB，并在
fresh Worker 中自动验证和解锁。可选 **Password** 模式通过 PBKDF2-SHA-256 派生不可导出的
AES-GCM key；Automatic 与 Password 之间切换时，header 和最多 32 条现有密文会在同一事务内
rewrap。每条 Key 都以完整 normalized HTTPS endpoint 与 Provider/profile identity 作为精确
binding/AAD。Vault 支持 Password Lock/Unlock、Forget、Replace，以及只在 unlocked 且 binding
精确匹配时通过 transferred port 完成的一次 handoff；完整 Key 不在 UI 中回读。旧 V1 Vault
属于 pre-stable clean replacement，不迁移旧密文。Vault Worker 的发布响应固定
`connect-src 'none'`；生产 hashed Worker 继续使用 `worker-src 'none'`，只有 Vite 的 exact final
development module Worker 响应使用 `worker-src 'self'`，供 WebKit 加载产品固定的同源 dev imports。
Vault 本身不暴露 nested Worker 或 fetch 接口。Agent Worker 的 Provider fetch 另外固定 `credentials: "omit"`、
`redirect: "error"`、`no-referrer`，并拒绝跨出选定 endpoint origin 的请求或响应；不会把
Authorization 能力跟随到另一 origin。

Password 模式在锁定状态下保护本地密文；Automatic 模式的设备 key 与密文都可由这个浏览器的
Vault authority 取得，因此不提供同等的 locked-at-rest 保证。两种模式都把 Agent/项目生成代码
与 SillyOS/API Key 隔离，但不声称抵抗控制面 XSS、恶意浏览器扩展、设备恶意软件、供应链攻击，
或控制面在 Vault 已解锁时滥用其能力。WebAuthn PRF/设备验证也尚未实现。

P3c-B0 的三个历史检查点已经为 OPFS Workspace Host 闭合恢复、争用、规模和可携下载证据；
S1a-1 再把 ordinary byte authority 移到独立 origin。
固定 Pi 0.84.3 的原生 `write`/`read` 通过 typed environment port 操作当前 Program volume；
小型 IndexedDB continuation manifest 只锚定 Program/repository 与 volume 身份，Host 私有
durable head 则持有连续 generation。关闭后完整刷新页面会用新的 `workspaceSessionId` 重开
同一字节与 generation；mutation receipt 仍是 session-local，不会伪装成 Pi 或 Chat 持久化。

P3a 的历史证据曾把固定 Pi 的四个原生 workspace 工具接到旧 authority：`read`、`write`、
`edit` 与 `bash`。它不自动准入新 Sandbox。S1a-1 的 `?agent=pi-test` 保留普通 native
`write -> read -> proposal`；S1b-1 已用显式 probe 重新证明 native
`write -> edit -> read -> proposal`，精确最终字节、generation 3 和冷重开在 Chromium/WebKit
通过。S1b-2 又只为 deterministic fixture 准入 Pi 0.84.3 原生 `createBashTool`：独立-origin
Sandbox 内的 just-bash 3.4.2 仅注册 25 个命令，不注入 `fetch`/network，并受
`connect-src 'none'` 约束；`@s1b-bash` 在 Chromium/WebKit 各 1/1，通过 generation 3
冷重开。S1b-3 随后把同一四工具列表接到 live Provider，并增加结构化 `grep`。真实
Chromium Anthropic `claude-sonnet-4-5` 路线只证明了精确 `write` mutation、对应 Sandbox OPFS
bytes、generation、取消/currentness、key 不落盘和 Forget；没有证明真实模型实际调用
`read`、`edit`、`bash`、`grep` 或 `qjs`。它也不代表 Linux、容器、Git、Python、通用 Wasm、
网络或包管理器。

S2-Q1 已在 2026-08-29 本地关闭：一个产品固定的同步 `qjs` custom command 放到 Pi 原生 `bash` 下；没有
新增 AgentTool、通用 runtime RPC 或第二套工具框架。它固定 QuickJS 0.32.0，并为每次调用
创建新的 build-known child Worker。Sandbox production build 因此在 lazy shell 之外增加 lazy
`qjs` broker、Worker 和固定 support modules；普通 VFS 启动不加载 just-bash/QuickJS。该构建
的 exact 10-file graph checker、`bash true` 之后才请求 qjs assets 的 lazy 顺序，以及 fresh
Host/dedicated Pi-harness Worker cold reopen 都已通过。普通 control build 与 Browser security
checker 也通过，
`dist-web` 不含 QuickJS、Emscripten、`ffi` 或 Wasm file/marker；这仍不是部署回执。
准入的常见 guest source error 现在可以沿同一 Pi `bash` 路径返回有界诊断；失败 receipt 为
`effect: none` 且没有 changed path，产品不转发独立 filename/stack 字段或 Host exception。

Install/lock graph 仍含 optional/vendor 依赖，shell bundle 也包含未注册的 `curl` 实现，因此
安全依据是 closed command registry、无网络注入、Sandbox `connect-src 'none'`、fresh Worker
和窄协议，不是“依赖或未使用代码不存在”。

checkpoint 2 已在 Chromium 与持久 WebKit 中自动写入并冷重开 `1,000 × 5 KiB` 文件和一个
`16 MiB` 文件，共 `1,001` 个文件、`21,897,216` 字节，最终 generation 为 `1002`；
`100 MiB`、`256 MiB` 只保留为 origin 容量允许时的可选原始测量，不是支持承诺。固定边界是
`1 MiB` 最大 I/O chunk 和 `4 MiB` **SillyOS 管理的文件系统 payload** in-flight；当前合同没有
固定的单文件、整卷或文件数量上限，实际容量由 origin quota 与真实写入决定。这不测量或限制浏览器
总 heap。页面从不接收 volume bytes，任何组件也不需要让整卷常驻内存。Pi 原生
`read` 的 `256 KiB` wire 上限只限制一次工具调用，并不是 OPFS 卷上限。

`navigator.storage.estimate()` 只描述调用方 origin，不存在跨浏览器、设备统一的固定 quota。
General 的 Data management 分开显示 control origin 与 Sandbox typed status 提供的建议性用量，
并只给出近似总使用量；它不把 origin-wide 数字冒充成某个 volume/store 的精确计量，也不相加
两个 quota。Clear All 通过各自 owner 清理 Product、Provider 设置、Vault 和 Sandbox product root，
是可重试的 best-effort 跨边界操作，不是原子事务；D2 全量导出/恢复仍未实现。

在已打开的持久 Agent workspace 右侧点击“下载工作区 ZIP”，可以下载当前 durable head 的
VFS 文件与根目录 `sillyos-workspace.json`。生成阶段会显示文件/字节进度并可取消；进入
“正在将 ZIP 交给浏览器下载”后，下载已提交给浏览器，finalizing 不再可取消。看到“下载已
开始”只表示 SillyOS 已把文件交给浏览器下载管线，不表示用户已经选择最终位置或浏览器已
保存完成。

该 ZIP 使用固定 `client-zip` 2.5.0 生成 canonical STORE-only 文件，只包含 portable manifest
与 `workspace/` 下的 VFS 文件；它不包含 Chat、Program 数据库、凭据、Pi/provider sessions、
terminal/mutation receipts 或 Host metadata。Sandbox Host Worker 独占 ZIP 临时文件和 object
URL。Host seal archive 并发出 `ready` 后不会自动下载：Authority 先复核 Host snapshot + Product
continuation，再在 UI 明确请求时复核第二次，全部 current 才发送 `start_download`。Sandbox
Host 随后通过只与 bootstrap frame 相连的私有 broker port 触发下载；broker 的 started 回执成为
control port 上的 `download_started`。控制面不接收 URL、Blob、archive 或 volume bytes，整卷也
不需要常驻内存。

`download_started` 后 UI 进入不可取消的 finalizing，保留 1,000ms browser handoff，再发送
`release`；Host 随后 revoke URL、删除临时文件并发出 terminal `released`。在
`start_download` 之前，cancel、abort、consumer return/throw、30 秒 ready timeout 或任一次
currentness drift 都不会调用 broker，也不会产生浏览器 download；授权后 Close/Forget 会等待
download-started、handoff、release 与 cleanup 全部 drain。目前仍没有
Workspace ZIP import/restore reader。Agent Forget 会清理 Pi/执行态并释放 lease，但
不会删除 durable volume。

Accept 现在会保留另一份 Host-owned immutable snapshot，并在审查卡片中分别显示最新 accepted
snapshot、pending proposal 的 reviewed head 与当前 mutable head。Pi 工具在运行中推进 generation
时，旧 checkpoint 不会继续显示成 current；Host 不可用时 currentness 会明确显示 unavailable。
后续 pending/rejected revision 也不会抹掉已接受 snapshot 的身份。当前“下载工作区 ZIP”仍只
导出 mutable head；产品尚未提供 accepted snapshot 的用户下载按钮或 Workspace archive
import/restore。

路线仍是 **Browser 优先、Desktop 保留**，但不是要求两个目标使用同一个物理 runtime。
两边共享 Program/volume identity、逻辑 `/workspace`、Pi native tool 语义、lifecycle、
generation/currentness、cancel、receipt、snapshot/export 与 capability truth。Browser 当前使用
独立 origin + OPFS + bounded just-bash + fresh interpreter Worker；未来 Desktop 可以在同一
typed `WorkspaceExecutionPort` 后使用更完整的 native process sandbox 和本地 volume，分别
准入真实 shell、Git、Tar、Python、QuickJS、process-tree cancellation 或 PTY，不必经过
just-bash，也不需要复制 Browser 的紧缩限制。

Desktop 更完整不等于降低边界：native Workspace sandbox 默认仍不能继承 Provider key、Pi
auth store、Product Repository handles 或 companion ambient environment；network 与 host path
mount 都必须是显式 capability。某能力只在一个目标通过时就只在该目标如实显示。Browser
Q1 不阻塞 Desktop 选择更强的 sandbox，Desktop 证据也不能替代 Browser 资格。

未来 SillyMaker 编辑器可以成为同一个 fixed Pi + `WorkspaceExecutionPort` seam 的另一个
产品消费者：把一个 exact Authoring receipt 投影到隔离 staging workspace，由 Host 计算并
复核 candidate，再映射到已有 structured Authoring operation 与显式 Save/CAS。它不会复用
SillyOS UI，也不会把 Pi、workspace sandbox、source writer 或 Agent API 放进 SillyMaker
engine。该 editor inheritance 仍是后续 proof，不是当前实现。

P2 已闭合事务提交后发布、最近 Program
重开、双页面 stale currentness、凭据不落盘和 bounded terminal receipt。B0a 已闭合无
真实 key 的 Pi/Worker/typed-RPC 接线；B0b 已完成固定 OpenAI profile 的本地及部署源
资格化；P3c-B0 已闭合原生 Pi `write`/`read` 到 OPFS checkpoint 的 authority、close/cold
reopen、连续 generation、mutation receipt、取消、清理、恢复/争用、当时的同源 storage UI、自动双引擎
`20 MiB+` gate，以及真实取消/下载/解包逐字节验证的 canonical portable ZIP。完整 B0 已在
2026-08-27 独立验收并关闭。随后 P3a-B1 的两个 checkpoint 也已交付并通过独立验收：固定
Pi 0.84.3 的原生 `edit` 与 `bash` 曾接到当时的同源 OPFS volume，历史确定性路径为
`write -> edit -> read -> bash/rg -> proposal`，最终 bytes 与 generation `4` 可跨冷重开保留；
超过 Pi 50 KiB 阈值的已完成输出会把完整 aggregate 持久化到同一卷的
`.sillyos/tmp/bash-<opaque>.log`。P3a 因而关闭。P3c-B1 的三个 checkpoint 也已在
2026-08-28 关闭：Chromium 与持久 WebKit 都验证了
generation-1002 的 accepted snapshot、generation-1005 的独立 later draft、胜出页持有 Host
时的 stale Accept、cold reopen，以及 `1,001` 个文件逐字节一致的 `22,065,863`-byte retained
ZIP。该物理 ZIP 读取是 test-only OPFS 证据，不是产品下载 API。P1-B1a 已交付并通过本地
release gate：25 个文件的 265 个产品测试、Chromium/持久 WebKit 的普通设置旅程，以及两种
浏览器中的真实 OpenAI stream/tool/cancel/currentness/Forget 资格检查均通过。B1b 随后被
激活；Anthropic 固定快照、Google、DeepSeek 与 xAI 的精确 profile 已在 Chromium 和持久
WebKit 中通过同一真实 Pi gate。OpenRouter 当前测试 profile 因现有账号/key 返回 Provider
Terms-of-Service 403 而仍是 candidate；这不是 CSP 或 CORS 成功/失败的替代结论。B1b 已在
2026-08-28 以这个 truthful disabled disposition 关闭。B1c 的 Provider/model preference
界面已在当前本地实现；B1c-S0 也已在 2026-08-28 本地关闭。它用
Provider 技术兼容与持久化模型偏好取代产品中的模型质量准入，并保留真实连接测试、
Home warning、有界 custom HTTPS profile，以及只给选定 Agent Worker 精确 endpoint origin 的
Cloudflare CSP 响应层；同时先补齐控制面 CSP/渲染约束、存储分权合同，并从 live Provider
撤下同源 workspace tools。B1c-S0 保留历史公开域名的严格 CSP、Home 与 Settings
Chromium/WebKit 回执；当前组合 source 已在本轮以一个精确 build identity 重新部署。WebKit 当时产生了预期的 Trusted Types
Report-Only 诊断，因此 enforcement 没有被提升；没有页面错误、失败请求或其他意外 console
错误。S1a-0 已在 Chromium 与持久 WebKit 中通过：独立 origin frame + 固定 Host Worker、
typed control/environment port、20 MiB OPFS generation-82 冷重开与同 hash 复核、81 文件
snapshot、Sandbox 内触发的逐字节 ZIP 下载、控制-origin OPFS 不可见，以及
`connect-src 'none'` 在请求发出前拒绝网络。该单独构建的 artifact 不包含测试 Worker、Pi、
Provider、React 或 just-bash，也没有 production deployment receipt。S1a-1 已完成 source
cutover：资格 transport 是普通产品唯一 read/write Authority，旧同源执行 owner 已删除，physical
Product Repository V5 clean-reset preview V4，Sandbox bootstrap/Host/control artifact 通过同一
build identity fail-closed 组合，下载 URL 也不离开 Sandbox。local dev 的 control/sandbox 文档都
启用严格 CSP 并关闭 HMR。普通 `@s1a-ordinary` Creator/Program journey 已在 Chromium 4/4、
持久 WebKit 4/4 通过，S1a-1 因而在本地关闭。S1b-1 的独立 native edit case 与 S1b-2 的
bounded bash case 又分别在 Chromium 1/1、持久 WebKit 1/1 通过并在本地关闭。S1b-3
随后只通过同一 independent-origin Authority 为 ordinary live Provider 准入这些工具，绝不
回退同源 Worker。cwd/env、非零退出、timeout/abort、
aggregate overflow、128 次 mutation attempt、64 个 changed path 以及
receipt-before-terminal 已有 focused unit/Host 证据。
BYO Sandbox、Wasm/更完整执行环境和 general archive/package import 仍未激活。Desktop
底层仍计划由私有 companion 启动产品打包的 Pi coding-agent，但当前没有激活。

这 4 条 ordinary case 证明 active frame 精确来自 `41740`、`41739` control origin 没有新
volume、Pi `write`/`read` 的 exact bytes 与 generation-2 cold reopen、双页面 ownership
contention/release/successor reopen、accepted one-file snapshot 与跨 origin ZIP manifest/bytes，
真实 cancel-before-download-authorization 的零下载，以及 cancel-after-write terminal receipt +
reload。单独的 Chromium/WebKit qualification 各 3/3
负责 build identity、network denial 和 20 MiB corpus；ordinary 4 条没有重复 20 MiB/81-file scale，
也不构成 production deployment evidence。

详细的产品范围、Cloudflare OS 参考快照、语义映射、桌面/移动布局、键盘/IME、
防截断和视觉验收矩阵见 [DESIGN.md](./DESIGN.md)。从真实 Pi typed RPC、产品数据库、
Pi 工具到 workspace runtime 的转发、Pi 能力组合、OpenUI 到 SillyMaker 组件映射，
再到翻译/写作/角色扮演产品的分阶段路径见 [PLAN.md](./PLAN.md)。Translation P5-A
完成了四格式确定性 round-trip laboratory 和双路线 model-protocol smoke；后续正式基础已经
加入真实 Translation Process 路由、独立 Process Workspace、同一 Authority 的原件导入、V13
Process-owned workset head/分页 rows、cold reopen，以及按需加载的文字型 PDF text-reflow。它们仍不代表
Translation Program 已可用或任一路线已通过资格。当前正式路径已经把所选模型的 context/output
envelope 转成无隐藏条数上限的 bounded batch，经共享的单一 Agent Worker/Session 产生一个
Process-owned pending candidate；候选可逐条编辑并以 exact workset revision/candidate ID 整批接受或
拒绝，接受后译文与进度持久化，浏览器刷新后仍可读取。Chromium/WebKit 的 deterministic product
journey 已覆盖 import → Agent → review edit → accept → cold reopen。尚未完成的是更完整的结构化
QA、格式保持 exporter、OpenUI、Conversation 自由 follow-up 与真实 Provider 产品资格；因此这仍是
执行/审查闭环，而不是完成的 Translation Program。
当前 Browser workspace 已交付独立 origin 的单一工作卷、受限 shell/QJS，以及
`mkdir`/`touch`/`cp`/`mv`/`rm` 文件操作；更广的执行 profile 仍是研究门。每个变更 entry
独立推进 generation，复合命令是保留已完成前缀的 best-effort 操作而非原子事务；空目录可冷重开，
但 portable ZIP 与 immutable snapshot V1 仍只保存文件。WASM 是可选执行机制，不是产品契约。
S1b-2、S1b-3 与 S2-Q1 已在 2026-08-29 本地关闭。固定同步
`qjs` 已通过 Pi native `bash` 接到 Program VFS/currentness/receipt 路线，并通过 focused tests、
Chromium/WebKit 实际 nested-Worker harness、exact 10-file Sandbox graph、lazy request ordering 和
fresh Host/dedicated Pi-harness Worker cold reopen；control-build QuickJS/Wasm exclusion gate
也已通过。Python、
更广的 Wasm、BYO Sandbox 和 editor proof 均未
激活。当前 Sandbox/live-tools/Q1 artifact 已随三 origin release 发布，但尚无 public-origin
QJS 行为或真实模型 read/edit/grep/qjs 资格结果。
候选路线与统一的 Browser/Deno 验收语料见
[WASM-WORKSPACE-RESEARCH.md](./WASM-WORKSPACE-RESEARCH.md)。

结构化 `grep` 适合让模型直接传 pattern/path/glob 并获得有界的 path/line/text 结果；raw
`rg` 仍保留在 Pi `bash` 中用于 pipeline。当前 grep 是 read-only fixed capability：最多
4 KiB pattern、1 KiB path、512-byte glob、100 matches、50 KiB result、每行 500 code
points、5 秒，成功不推进 generation，也不产生 mutation receipt。它不是“把所有 CLI 都
暴露成工具”。

反向隔离 regression 已在 Chromium/WebKit 证明 Sandbox 无法读取 control document 或
同名的 control IndexedDB/OPFS sentinel，向 control origin 的网络请求也在发出前被 CSP
阻止。这不代表浏览器能抵抗所有 XSS、扩展或设备攻击，也不允许未来 guest runtime 直接
获得 Sandbox origin 的 ambient OPFS/IndexedDB。Disposable QuickJS Q0 已使用 fresh child
Worker、copied bounded text files、fixed `16 MiB` Wasm memory、`12 MiB` allocator 和 hard
terminate 证明了可行性；Q1 已用 production-owned protocol 清理替换它。当前命令形状是
`qjs [--file PATH]... SCRIPT [ARG...]`，只 stage script 与显式指定的 UTF-8 text files，不
复制整卷，也不向 guest 暴露 OPFS、IndexedDB、DOM、Key、ambient Host JavaScript 或 network。
它只执行同步脚本，检测到 pending Promise job 会失败；delete 不支持。source/stdin 各
`64 KiB`，argv 最多 `32` 项 / 单项 `4 KiB` / 合计 `16 KiB`，staging 最多 `32` files /
单文件 `256 KiB` / 合计 `1 MiB`，result 最多 `16` changed paths / `256 KiB` diff /
`64 KiB` stdout；内部 deadline `2 s`，外层 `3 s` watchdog 会 terminate Worker。

Sandbox dev/preview/production response 仅为固定 runtime 增加
`script-src 'self' 'wasm-unsafe-eval'`，不增加普通 `unsafe-eval`，并继续保持
`connect-src 'none'`；control plane policy 不变。Host 会在首个 write 前完整 preflight exact
diff，但通过后仍逐个写入，因此后续 quota/cancel/storage failure 可能留下已经写入的 earlier
change；Q1 不声明 multi-file atomicity 或 rollback。Python 因资产、启动和 JS bridge 成本
后置，也不能通过打开 just-bash 的 Browser flag 获得。

三轮 fresh-profile / warm-server 的 raw dev harness 数据中，Chromium 的 warm `true`、raw
bash `rg`、structured grep 每轮 median 分别为 `0.8 ms`、`5.4–5.9 ms`、`7.6–7.9 ms`；
WebKit 为 `2–6 ms`、`9–26 ms`、`11–13 ms`。对应 Host create/open 为 Chromium
`85.8–108.1 ms`、WebKit `129–276 ms`，另一次 WebKit 重跑出现约 `1.31 s` 离群。
这些测试使用专用 harness Worker 复用真实 Pi binder/typed Workspace path，不是 production
Agent Worker；没有观测到 control-page Long Task 也不是所有设备/并发 workspace 的保证。
Chromium 只有 `27.6–29.4 MB` 的 bucketed control-page JS heap，WebKit 没有可读数值；两者
都没有证明 Agent/Sandbox Worker、OPFS、Wasm 或浏览器进程的 total/peak memory。

Q1 此前记录的一轮 raw local harness 另外观测到 first qjs / hard cancel / fresh recovery：Chromium
约为 `100.8 / 111.2 / 21.4 ms`，WebKit 约为 `70 / 104 / 43 ms`。两边都通过同一个 Pi
native `bash` path 得到 exact changed-path receipt，取消后新 Worker 可以恢复；该轮 control
page Long Task 为 0。Chromium 的最大 rAF delta / timer delay 约为 `10.1 / 13.7 ms`，WebKit
约为 `22 / 6 ms`。这仍只是开发机原始观测，不是低端设备预算、主循环保证或 total-memory
结论；`12 MiB` allocator 与 `16 MiB` linear memory 也不包含 host objects、module JS、
structured clone、Worker、OPFS 或 browser process。

仅 guest script 求值阶段的 `execution_failed` 可以返回一个 exact-admitted 的常见 JavaScript
error kind、非空单行消息（最多 `512` UTF-8 bytes）以及可选的正数行列号。primitive throw、
未知/运行时内部 error、bootstrap/snapshot、deadline、memory/output、async、Worker 和 protocol
失败仍只返回固定产品错误码。响应没有 filename/source-excerpt 字段，产品不转发 raw stack 或
Host exception。该诊断已在 Chromium/WebKit 的直接 Worker 和真实 Pi native `bash` 路径通过；
guest 可以主动把本次已经显式 stage 的数据（包括形似 filename 的文本）写入自己的错误消息，但
它拿不到 credential 或 ambient product storage。

## 运行

普通 Browser 产品需要 control、Workspace Sandbox 与 keyless Network Broker 三个严格分离的
origin。先在本目录的三个终端分别启动：

```sh
deno task dev:workspace-sandbox
deno task dev:network-broker
deno task dev
```

然后打开 control server 输出的 `http://127.0.0.1:4173`。Sandbox 固定为
`http://127.0.0.1:41740`，Broker 固定为 `http://127.0.0.1:41741`；三个 dev server 都发出严格
CSP 并关闭 HMR，代码变化后要完整刷新，不能用 Fast Refresh 把可信 artifact 更新到不同版本。
每次启动 control Vite dev server
都会生成一个新的随机 style nonce，并由 Vite 加到它注入的 style 上；这不是 production nonce
策略。dev 不发送 Vite 自身无法满足的 Trusted Types Report-Only 观察头；preview/production
继续使用 self-hosted external style 并保留 TT Report-Only。也可以从仓库根目录分别运行：

```sh
deno task --cwd examples/silly-os dev:workspace-sandbox
deno task --cwd examples/silly-os dev:network-broker
deno task app dev example-silly-os
```

当前 Browser 和 Deno Desktop 共享同一个响应式
React 产品面；Desktop 是产品目标，不会另外模拟操作系统桌面。

要运行不访问 LLM 的 Browser Pi B0a 接线检查，在该地址追加
`?locale=zh-CN&agent=pi-test`，输入任意可丢弃的合成测试值并初始化，再创建 Program、
提交一次 follow-up。普通确定性 Pi 流程用原生 `write`/`read` 在独立-origin 持久 Program
workspace 完成字节往返，再形成 proposal。以
`Exercise the pinned native Pi edit tool with exact text:` 开头的显式 S1b-1 probe 会另外执行
Pi 原生 `write -> edit -> read`。显式 S1b-2 bash probe 则只在 deterministic fixture 中调用
Pi 原生 `createBashTool` 和当前 29-command just-bash built-in facade；产品另外固定提供
`qjs` 与窄化的 `touch`。普通 live Provider 现在复用同一
四工具列表，并有额外的固定结构化 `grep`；返回 Home、
等待 workspace close 完成并刷新页面后，重新初始化 Pi test 会通过新的 Sandbox frame/Host
session 重开同一 generation 和文件。普通 URL 首次打开设置时才会启动一个无凭据 catalog
Worker，并在得到目录后立即终止它。

要运行 live 路线，直接打开普通 URL。未配置时点击 Creator Home 的 Provider warning，进入
Providers 后在 **Available models** 勾选希望出现在 Creator 选择器中的一个或多个兼容模型。
fresh 设置会先勾选产品维护的推荐 family 与实际 Pi 目录的精确交集，但这只是可编辑的初始值。
在 Connection 中选择可选的测试模型、确认只读 endpoint scopes，输入该 Provider 的 key，再点击
**Save**。Fresh Vault 已处于 Automatic unlocked；Save 会把 Key 加密保存到每个展示的 exact
scope，但不会请求 Provider，也不会改变 checked/preferred。按 preferred 或首个可用模型完成
Vault-to-Agent handoff 后，Agent Creator 的 Provider/proposal 路线和当前 Program-bound workspace
工具立即可用，Home warning 消失。网页不会读取开发机 `.env`；Key 输入会立即清空，完整 Key
不会回显。

Home 与 Program workspace 的模型选择器共用一个 **Reasoning effort** 控件。可选值完全来自
固定 Pi 对当前 built-in 模型声明的能力；产品偏好默认 `medium`，实际执行使用 Pi clamp 后的
effective level。切换模型不会改写全局偏好，custom endpoint 在显式 schema 之前固定为 `off`。
该设置与 Key、Test、模型 checkbox 及 Program 数据相互独立；当前公网 artifact 已包含这条路径，
但尚没有 public live-Provider reasoning 资格回执。

**Test connection** 是独立、可选、可重复的时间点诊断；只有点击它才会针对“Test with model”
当前选择发出一次很小但可能计费的请求，成功或失败都不会改变 Key、checked/preferred 或可用性。
失败后仍可继续实际调用、重新测试或 **Update**；实际调用若遇到无效 Key、模型、Endpoint
或网络错误，会通过正常 Agent 失败路径报告。模型偏好和加密 Key 都能跨刷新保留，测试结果不
保留。需要显式 locked-at-rest 行为时，进入独立 **Credential Vault** 设置切换到 Password 模式；
之后可以 Lock/Unlock、修改密码或切回 Automatic。Connection 的删除图标会删除精确 binding，并终止
正在使用它的 Agent Worker。Save 与 Test connection 始终是两个独立按钮。

需要兼容 endpoint 时，在 **Custom Endpoints** 中新增 HTTPS profile，显式选择四种 Pi API
family 之一并填写 model/limits，再用同一个 Connection 流程保存 key；测试仍然可选。刷新后
会恢复这个非秘密 profile；API Key 在 unlocked Vault 中按该 profile 与完整 normalized endpoint
的精确 binding 恢复为加密记录，测试状态不会恢复。修改 profile endpoint 不会重绑旧 Key，旧
binding 可在独立 Vault 列表中 Forget。一次测试成功只描述当前
endpoint/key/model/API family 组合在本次浏览器会话中的那一次请求，不是使用前提。

Cloudflare 入口是
[silly-os.jasl9187.workers.dev](https://silly-os.jasl9187.workers.dev/)。N1、N2 与本节
Credential Vault 已从精确 commit `ca4104b68312e115c698b9e0d5caeb7cdaf67789`
一起部署；control、Workspace Sandbox 与 Network Broker 的 Cloudflare version 分别是
`5bc7ad49-d010-4225-8454-4b1dd5b2fa07`、
`1c228ffe-0e8d-4829-b535-8dd50c4bb770` 与
`fa8e9465-b63d-4d80-a564-990b1acb2f8a`。三个公开入口和 hashed Vault Worker 均返回
HTTP 200；源码身份、三 origin CSP 分权与 Vault network-off 响应策略已核对。产品仍是
静态客户端：Provider Key 和模型请求从 Agent Worker 直接发送给所选 Provider，不经过 SillyOS
或 Cloudflare relay；`fetch_url` / `download` 的远程响应则只从无 Key 的 Browser Broker 发出。
公网只读 smoke 已到达 Creator Home、Settings、Providers、Custom Endpoints 与 Credential Vault
面板；页面显示 session-only 默认、`Not set up` 与 `0 remembered`，没有 error-level console
记录或致命 overlay。该 smoke 没有输入或更改任何 key。
这份 artifact/response 回执不自动证明 public-origin 真实模型工具调用、remembered-key
真实 Provider journey、任意站点 CORS、线上 ingress 或 search。

以上 commit/version/smoke 是 2026-08-29 的 **S3/V1 已部署历史**，不会被后续 Vault V2
实现追溯改写。当前公开 release 已由下面的 R1 回执取代。

2026-08-30 从干净 commit
`a17c3490c9940bb43fc8718df485322c2dee1052` 按 Sandbox、Network Broker、control/Vault 的顺序
发布：Cloudflare version 分别是 `fb703131-3e37-4e7d-95f4-5b7afa9160cd`、
`07720852-ac1f-462b-8098-086410906839` 和
`e0b61061-1a07-4e64-a963-74a0a7ee6420`。三个入口均返回 HTTP 200 与同一 source identity；
control 只连接自身并只嵌入两个固定 origin，Sandbox `connect-src 'none'`，只有不持有 Key 的
Broker 允许 `connect-src https:`，固定 Vault Worker 仍为 network-off。公开页面无 error-level
console 记录；无 Key 时 Home 只显示 warning，General 能读取两个 origin 的建议性用量，Providers
与 Credential Vault 可达。

同一公开 release 还通过一次临时 Chromium profile 的真实 Anthropic
`claude-sonnet-4-5` QJS loop：无效 Key 401、有效 Test 200、取消/currentness、四次成功完成请求、
精确 `write`/`write`/`bash-qjs` receipts、Sandbox-origin QJS assets 和 VFS bytes 均匹配；检查的
control-origin durable projection 不含 Key 明文，结束时删除 Key 并终止 Worker，Workspace output
仍保留。该回执不证明 public WebKit、跨刷新 durable-key reuse、其他 Provider、live reasoning、
`read`/`edit`/`grep`/网络工具、任意站点 CORS 或 search。

开发资格检查会按精确 profile 从本目录的 `.env` 读取对应 Provider key，依次启动普通
Chromium context 与运行后删除的一次性持久 WebKit profile，
先把明确无效的凭据保存到 Automatic Vault、证明 Provider 4xx 可读和可选测试的失败映射，再
Forget 该 exact binding；随后保存外部真实测试 Key，并在 Home warning 已消失后独立执行连接
测试。完整 Agent journey 继续证明取消不会推进 v1、下一次运行形成精确 v2、控制 origin 的
持久化投影不含任何凭据明文，最后等待 Forget 实际终止 Agent Worker。它不读取或打印 Provider
请求头、请求体或 Key；Save 本身不发送 Provider 请求，Test 也不是产品可用性的前置条件。
资格检查沿用普通产品的
三 origin：先分别启动固定 `41740` Sandbox、`41741` keyless Broker 和 `4173` control，再运行：

```sh
deno task dev:workspace-sandbox
deno task dev:network-broker
deno task dev --host 127.0.0.1 --port 4173 --strictPort
deno task qualify:browser:qualified
```

`qualified` 会检查当前五个可选 profile；也可通过
`deno task qualify:browser:provider anthropic` 检查一个精确 profile。验收部署源时可把
HTTPS 地址作为下一个参数传入同一命令。OpenRouter candidate 不属于 `qualified` 集合；
重新资格化它需要先在受控候选 build 中开放该精确 tuple，而不能绕过正式 UI 的 disabled
状态。`qualify:browser:b1b` 表示五个命名 B1b 目标的完整 checkpoint，因此 OpenRouter 未
通过期间预期为红；日常 release matrix 使用 `qualified`。

默认 `qualify:browser:provider` 仍运行上述 Provider 旅程，不会隐式触发 QJS。要人工资格化
真实模型的完整 Agent loop，可在同一三-origin dev topology 上明确运行 Chromium-first 的
`deno task qualify:browser:qjs-loop`。该 opt-in 选择配置的 Anthropic
`claude-sonnet-4-5` route，给完成轮
至少 `120 s`：提示要求模型依次用两次 native `write` 写入精确 input/script，再用 native
`bash` 执行产品固定的 `qjs --file …`，最后才形成 v2 proposal。Harness 会复核 receipt sequence `3`、
完整 `write`/`write`/`bash` receipt 顺序与 changed paths、generation `4`、pending/mutable
currentness、Sandbox 中 bounded input、引用
固定 input/output 路径及 `workspace.readFile/writeFile` 的 bounded script、output 与实际 input 的精确
uppercase 关系、只在该轮出现且来自 Sandbox origin 的 QJS command/Worker 请求，以及 Forget 终止
Agent Worker 后同一 volume 的输出仍可读取。该入口可能产生少量 Provider 费用，不属于默认
release matrix。Script 必须与固定 qualifier script 一致；模型是否逐字复述提示中的 input
另作结果字段记录，不与 QJS harness 的能力结论混为一谈。2026-08-29 配置 Anthropic
`claude-sonnet-4-5` route 的 Chromium 运行已通过：两次 native
`write`、一次 native `bash/qjs`、proposal v2、generation/currentness、Sandbox-only QJS assets、
Forget 后 Worker 终止与 volume output 保留均得到真实 Provider 证据；这仍只资格化该有界同步循环。

共享 examples Playwright 套件也必须通过 `examples/silly-os/vite.config.ts` 启动本产品，
这样 dev/E2E 使用与普通开发相同的 Worker alias 和固定 Pi 依赖预打包；这不改变生产 chunk、
Provider 资格或 CSP。

Browser 目标可作为 Cloudflare Workers Static Assets 发布的本地优先产品。部署方只
提供静态应用；模型请求从浏览器 Agent Worker 直接到用户选择的 Provider，不经过
SillyOS 官方代理。生产 UI 不得把明文 Key 写入 React state、URL、日志、Program 数据、Workspace
OPFS、导出文件或保存非秘密 profile 的 `localStorage`。Key 只能进入专属 Vault Worker，由它
按 exact normalized endpoint binding 加密写入独立 Credential Vault IndexedDB；Agent Worker
只通过一次性 transferred-port handoff 获得当前 scope 的明文能力。Automatic 模式还会在同一
Vault database 保存不可导出的设备 `CryptoKey`，Password 模式则不持久化密码或派生 key。
独立 database 是所有权分离，不是同源权限隔离。

B1c-S0 为文档、静态资源和 selected Agent Worker 定义完整的无 wildcard CSP：显式设置
`default-src`、`script-src`、`style-src`、`style-src-elem`、`style-src-attr`、
`worker-src`、`connect-src`、`object-src`、
`base-uri`、`frame-src`、`frame-ancestors` 与 `form-action`，并附加 Trusted Types Report-Only、
Permissions Policy、`no-referrer`、`nosniff` 和嵌入 denial。control 文档的 `frame-src` 只允许
精确 Sandbox、Network Broker origin 与 `blob:`，Sandbox 文档的 `frame-src` 只允许 `blob:`，用于 WebKit 的
Sandbox-private download navigation；该 Blob URL 从不跨 control RPC。Sandbox 文档的
`frame-ancestors` 也只允许精确 control origin。Network Broker 同样只允许精确 control
ancestor，不持有 Provider key、Product Repository 或 Workspace VFS。普通文档与 catalog Worker 的
`connect-src` 只有 self；built-in 或 custom Agent Worker URL 携带经过验证的
`endpoint-origin` 时，只有该 Worker 增加这一个精确 HTTPS origin。Cloudflare 和 local
Vite dev 使用同一 canonical rule；dev 对重复、HTTP 或畸形 origin 返回 400/no-store，并在
Vite transform 前移除 query。query 不包含 key、model 或 endpoint path。独立 Broker response
为动态 Program 授权使用 `connect-src https:`；control、Agent、catalog 与 Workspace response
不会因此获得通配网络能力。任何 response 都不使用 `unsafe-inline` 或 `unsafe-eval`。

该选择只解决 CSP admission，不会让 Provider 返回允许 SillyOS origin 读取的 CORS 响应。
自定义 endpoint 仍必须满足 HTTPS、CORS、streaming 与取消合同；Pi 在 Desktop 支持的全部
Provider 不会自动成为 Browser 能力，`no-cors`、Service Worker 或放宽 CSP 都不能绕过
Provider CORS。先前的 actual-build blocker 已由通用 SillyMaker tooling 修复并被本产品消费：
版本戳现在是应用模块之前加载的同源外部脚本，生产 HTML 不再含可执行 inline script。
S1a-1 及 S2-N0 进一步让 local dev 使用精确三 origin 的 strict CSP 并关闭 HMR；生产 artifact checker
会拒绝 `development` identity、混合 control/bootstrap/Host identity、宽泛 `frame-src` 和退休的
同源 Host Worker。control dev server 的随机 style nonce 只允许 Vite 当次注入的 style；preview/
production 仍是 self-hosted external style，不把 nonce 变成发布策略。通过这些 build checks 仍不替代 ordinary Chromium/WebKit product evidence
或 production deployment receipt。

### Pi RPC 开发启动器

仓库另带一个 **尚未连接 Creator UI** 的原始 Pi RPC 启动器，用来验证 provider、model、
凭据与固定隔离参数。它绝不搜索 `PATH`，也不接受 Pi 命令或路径覆盖；只解析本产品在
`package.json` 与根 lockfile 中固定的 `@earendil-works/pi-coding-agent@0.84.4` CLI
artifact，并使用当前 Deno executable 启动。依赖未物化或不是普通文件时，会在
dry-run/启动前明确失败，不会回退到机器上已安装的 `pi`。未来 Desktop 包也必须把同一
固定 package closure 物化进产品。这条路线与 Browser 中单独固定、懒加载的
`pi-agent-core` / `pi-ai` Worker 依赖相互独立。

先让 Pi 列出当前隔离配置和凭据下可用的 provider/model：

```sh
deno task pi:rpc -- --list-models
```

使用环境变量（推荐）：

```sh
ANTHROPIC_API_KEY=... deno task pi:rpc -- \
  --provider anthropic \
  --model claude-sonnet-4-5
```

也可复制 [.env.example](./.env.example) 到目标目录的 `.env`。`--directory` 同时选择
Pi 的工作目录和自动加载的 `<directory>/.env`：

```sh
deno task pi:rpc -- \
  --directory /absolute/project \
  --provider openai \
  --model gpt-5.4
```

若要使用任意其他 env 文件，可在 task 层显式传
`deno task --env-file=/absolute/keys.env pi:rpc -- ...`；它进入进程环境，因此优先于
目录 `.env`。

Pi 支持的其他 provider key（例如 `OPENAI_API_KEY`、`OPENROUTER_API_KEY`）使用同一
方式，不在 SillyOS 中维护另一份 provider 列表。需要在同一进程中切换 provider 时，
把多组 key 同时放入环境或 `.env`；Pi 原生的单个 `--api-key` 只覆盖本次所选
provider，启动器不另造 provider-to-key 映射。`--list-models` 不是无凭据的静态全集；
它遵循该隔离 Pi 实例实际可见的凭据和配置。一次启动可这样显式覆盖：

```sh
deno task --quiet pi:rpc -- \
  --provider openrouter \
  --model z-ai/glm-5.3-flash \
  --api-key ...
```

`--api-key` 可能出现在 shell history、task runner 输出和系统进程信息中，只用于明确
的本地开发/测试；示例用 `--quiet` 避免 Deno task 回显完整调用。启动器自己的
`--dry-run` 摘要不会回显 key。有效优先级为本次 `--api-key`、隔离 Pi auth、进程环境、
`.env`；默认隔离配置目录是所选工作目录下已被忽略的
`tmp/sillyos-pi-agent`。这个工具输出的是 raw Pi JSONL，不代表 typed SillyOS companion、
Browser 路由或产品 Agent 已经完成。

这个 ENV/`.env`/args 入口只服务本地开发、测试和 Desktop companion。部署后的网页
不能读取开发机环境或命令行参数；它使用上述 Browser UI 的 BYO Provider 路线。

SillyOS 不 fork `pi-coding-agent`。Browser 只懒加载产品固定的 `pi-agent-core`/`pi-ai`；
Desktop 将物化并启动完整、同版本的 coding-agent artifact，绝不回退到 `PATH`，因此
保留 Pi 原生 Extension API 和未来用户插件路线。当前 raw 启动器与首个 companion
切片尚未交付用户插件发现/安装，不能把“保留扩展能力”写成已经可用的产品功能。

## 检查

```sh
deno task test
deno task build
deno task check:browser-security-build
deno task build:workspace-sandbox
deno task check:workspace-sandbox-build
deno task build:network-broker
deno task check:network-broker-build
deno task build:desktop
```

独立 Sandbox topology 的真实双浏览器资格检查从仓库根目录运行：

```sh
deno run -A npm:@playwright/test test \
  examples/e2e/silly-os-workspace-sandbox.spec.ts \
  --config examples/e2e/playwright.examples.config.ts \
  --project=chromium --workers=1
deno run -A npm:@playwright/test test \
  examples/e2e/silly-os-workspace-sandbox.spec.ts \
  --config examples/e2e/playwright.examples.config.ts \
  --project=webkit --workers=1
```

S1a-1 的 ordinary Creator/Program evidence 来自同一双-server 配置；只重跑上面的
qualification spec 不能证明 ordinary Authority 已切换：

```sh
deno run -A npm:@playwright/test test \
  examples/e2e/silly-os.spec.ts \
  --config examples/e2e/playwright.examples.config.ts \
  --project=chromium --workers=1
deno run -A npm:@playwright/test test \
  examples/e2e/silly-os.spec.ts \
  --config examples/e2e/playwright.examples.config.ts \
  --project=webkit --workers=1
```

产品模型、Credential Vault、Browser Pi Worker 和固定 Desktop 启动合同的 focused tests：

```sh
deno run -A npm:vitest run \
  src/test/program-catalog-repository.conformance.test.ts \
  src/test/program-process-repository.conformance.test.ts \
  src/test/program-data-repository-indexeddb.test.ts \
  src/test/program-data-repository-worker.test.ts \
  src/test/creator-controller.test.ts \
  src/test/creator-agent-admission.test.ts \
  src/test/browser-control-plane-security.test.ts \
  src/test/browser-credential-vault-port.test.ts \
  src/test/browser-credential-vault-security.test.ts \
  src/test/browser-pi-browser-compatibility.test.ts \
  src/test/browser-pi-catalog-port.test.ts \
  src/test/browser-pi-provider-fetch-guard.test.ts \
  src/test/browser-pi-provider-runtime-bridge.test.ts \
  src/test/browser-pi-worker.test.ts \
  src/test/browser-provider-settings-repository.test.ts \
  src/test/cloudflare-selected-origin-worker.test.ts \
  src/test/credential-vault-crypto.test.ts \
  src/test/credential-vault-protocol.test.ts \
  src/test/credential-vault-runtime.test.ts \
  src/test/indexeddb-credential-vault.test.ts \
  src/test/provider-credential-binding.test.ts \
  src/test/provider-settings-ui.test.tsx \
  src/test/pi-rpc-startup.test.ts
```

视觉验收不能只看一张宽屏截图。开发完成前至少覆盖 `1600x1000`、`1280x800`、
`768x700`、`767x700`、`390x844`、`320x568` 和 `1024x520`，并使用长中文、
长英文、键盘、IME、拖动分栏和全屏焦点恢复进行真实 Browser 检查。

## 当前代码边界

| 位置                                                            | 所有权                                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/product/contracts.ts`                                      | Program、proposal 与 Creator Agent 终态投影合同                                |
| `src/product/program-catalog-repository.ts`                     | Program head、不可变 revision、review decision 与分页目录合同                  |
| `src/product/program-process-repository.ts`                     | Creator Process、attempt/checkpoint 与富文本 Conversation 分页合同             |
| `src/product/program-data-repository.ts`                        | Program 与 Process 复合提交的唯一产品持久化边界                                |
| `src/product/creator-controller.ts`                             | 单 active Process、分页 Conversation、proposal review 与 Agent currentness     |
| `src/product/translation/translation-process-controller.ts`     | Translation Process 路由、原件导入、cold reopen 与自有 workset 分页投影        |
| `src/product/translation/translation-workset-repository.ts`     | Process-owned workset、receipt、unit/glossary/candidate pages 与 review CAS    |
| `src/product/translation/pdf/`                                  | 按需 born-digital PDF text-reflow；不提供 OCR 或 PDF round-trip                |
| `src/product/creator-agent-admission.ts`                        | submit/candidate 的严格 product wire admission                                 |
| `src/product/browser-provider-settings-repository.ts`           | 有界非秘密 custom HTTPS profile 持久化；不接收 key                             |
| `src/product/fake-creator.ts`                                   | 默认初始 proposal 的确定性 fake Creator                                        |
| `src/agent/browser-program-agent-port.ts`                       | bundled Creator/Translation 共用单 Worker/Session owner 与 typed facades       |
| `src/product/translation/translation-agent-contracts.ts`        | Translation Run/terminal 的 Process/currentness 合同                           |
| `src/product/translation/translation-batch-planner.ts`          | 依模型 context/output envelope 规划无隐藏条数上限的下一批                      |
| `src/product/translation/translation-process-view.ts`           | Process-owned workset 的 bounded UI row-window 投影                            |
| `src/agent/browser-pi-*`                                        | 公共 Agent Session connector、产品私有 Worker wire、固定 Pi 与 workspace tools |
| `src/agent/pi-workspace-tool-binder.ts`                         | Pi 原生四工具绑定与固定 structured `grep` AgentTool                            |
| `src/credential/`                                               | 独立 Vault Worker、WebCrypto、exact binding、IndexedDB、handoff 与 client      |
| `src/deployment/browser-credential-vault-security.ts`           | Vault Worker 的 network-off CSP 与专属 response headers                        |
| `src/workspace/browser-workspace-just-bash-runtime.ts`          | bounded just-bash facade、fixed-`rg` grep 与 lazy fixed-`qjs` registry         |
| `src/workspace/browser-workspace-quickjs-{protocol,command}.ts` | Q1 exact DTO、limits、explicit text staging、diff preflight 与 child broker    |
| `src/workspace-sandbox/browser-workspace-quickjs.worker.ts`     | fixed QuickJS 0.32.0 fresh child runtime；无 ambient storage/network           |
| `src/deployment/cloudflare-selected-origin-worker.ts`           | built-in/custom Agent Worker 的完整 strict-CSP 与精确 selected-origin 响应层   |
| `src/deployment/cloudflare-workspace-sandbox-worker.ts`         | 独立 Sandbox artifact 的固定响应头与 Cloudflare 静态边界                       |
| `src/workspace/browser-workspace-sandbox-frame-transport.ts`    | 控制 origin 到固定 Sandbox origin 的 fail-closed bootstrap/typed channel       |
| `src/workspace/browser-workspace-sandbox-build-identity.ts`     | control/bootstrap/Host 共用的 product-derived build identity admission         |
| `src/workspace/browser-workspace-sandbox-download-protocol.ts`  | Sandbox Host 到 bootstrap frame 的私有 download request/receipt                |
| `src/workspace-sandbox/`                                        | Sandbox 文档 bootstrap 与同 origin 固定 Host Worker                            |
| `src/product/indexeddb-program-data-repository.ts`              | physical Product Repository V13、Program/Process 与 Translation workset 事务   |
| `src/product/browser-program-data-repository.ts`                | V13 Worker client、响应 identity 与 outcome-unknown fencing                    |
| `src/companion/pi-rpc-startup.ts`                               | dev-only 固定 Pi artifact、启动参数、隔离 flags 与脱敏摘要                     |
| `src/application/`                                              | Browser/Deno 共用的 React 产品入口与工作区表现                                 |
| `src/test/browser-pi-worker.test.ts`                            | Pi tool、RPC 顺序/currentness、取消、替换与 Worker teardown                    |
| `tools/pi-rpc.mts`                                              | raw Pi RPC 开发启动器；尚未连接 Creator                                        |
| `PLAN.md`                                                       | 独立产品孵化顺序、所有权、停止条件与明确 defer                                 |
| `WASM-WORKSPACE-RESEARCH.md`                                    | workspace harness 候选、共同语料和选型证据门                                   |

后续 Agent loop、模型/provider、会话、tool dispatch 与 Agent 扩展统一由 Pi 负责。
Browser Agent Worker 或 Desktop companion 只做目标适配、Program 数据所有权和 typed
transport 投影；React 不接触 raw Pi RPC/provider records，也不读取或持久化完整 Provider Key。
当前 Browser adapter 通过公共 `@sillymaker/agent/session` 获得中立的 Session/Run
currentness、stream admission、cancel/reconnect 和 awaited disposal；它自己仍拥有
Worker envelope、Pi 绑定与 submit/event ordering。`CreatorAgentPortV1` 另行拥有
Program candidate admission、product-run correlation、Repository/Workspace CAS 和持久 terminal
projection。公共 client 定义中立 reconnect 语义，但当前持有 credential 的 Browser
connector 不做透明重连；关闭 connector 会终止 Worker，恢复时需要重新交付 credential。
这不公开 raw wire，也不选择 private Agent Host/`UiArtifact` 路线。
持久化只由专属 Credential Vault Worker 在 exact endpoint binding 下完成。
Agent 侧独特能力只实现一次 schema/prompt/handler 核心，Browser 薄适配为 Pi
`AgentTool`，Desktop 薄适配为 Pi Extension tool。未来 OpenUI 数据映射到 SillyMaker
的闭集 UI 组件与交互 intent；SillyMaker 不另建 Agent runtime，这些数据也不进入其
确定性 game Save。每个 workspace Agent 对应一个逻辑 workspace runtime 与持久工作卷，
保存源码、`.git`、产物、文件型持久数据、`AGENTS.md` 和 skills。S1 完成后，Pi 工具才可
通过独立 origin Sandbox 修改草稿工作卷；当前 deterministic 与 live Pi 都使用这条 authority，
而 Q1 的 `qjs` 仍只是 native `bash` 下的一项 Browser execution implementation。只有通过
精确人类复核的 workspace snapshot 才会成为新的 accepted Program revision。

## 参考与授权

工作区交互参考
[Cloudflare OS `6223e261`](https://github.com/cloudflare/cloudflare-os/tree/6223e261f18849b817a8d7ca03fe3678b77048ca)，
但 SillyOS 不复制其品牌、资产、文案、截图、前端源码或 Cloudflare Workers 后端。
产品代码与文案按本仓库 MIT 许可发布；第一方媒体素材如后续加入，按仓库素材政策处理。
