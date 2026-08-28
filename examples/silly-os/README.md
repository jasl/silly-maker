<!-- SPDX-License-Identifier: MIT -->

# SillyOS Creator Preview

SillyOS 正在从复古桌面示例重写为一个服务创作者的 Agent 产品：人类描述想做什么，
Creator 把意图整理成双方都能理解、运行、检查和继续修改的 Program。

```text
Program = project + harness + agent + app
```

Creator 是唯一内置的用户程序；生成的 Program 是工程、Agent harness 和可运行应用的
内聚整体，不是桌面上的玩具窗口。

## 目前能体验什么

普通入口现在提供 Browser Provider 设置。当前 Agent Worker 没有持有可用 Provider key
与精确模型选择时，Creator Home 会显示一张可用键盘整体打开的警告卡片；用户需要先进入
Providers。Settings 中的模型不再按 SillyOS 自定义的 Qualified/Candidate 质量分级：Provider
只要具备当前
Browser 已实现的单 Key 凭据形状、API 协议适配器和 canonical HTTPS Endpoint，其目录模型就可供
用户选择。这只是 Browser 技术兼容边界，不声称 SillyOS 逐个调用、评测或批准过每个模型。

模型行是多选 checkbox，用于指定哪些模型可以出现在 Agent Creator；另一个 preferred model
是当前执行目标。Creator Home 与 Program workspace 的输入框复用同一个模型选择组件，不会把
这些非秘密偏好冒充成可用凭据：built-in 下拉是 enabled models 与当前 Worker 凭据作用域的
交集，作用域要求相同 `providerId` 与 canonical `baseUrl`；custom Endpoint 只匹配自身精确
profile。底部“模型设置”返回 Provider 设置页，并在返回后把焦点交还原输入框。Home 的 API-key
warning 只在 Worker 尚未持有凭据时出现；已经持有 key 但没有 enabled 作用域模型时，下拉保持
required/空状态并提供“模型设置”，不会谎称需要重新保存 key。取消勾选 active model 时也不会
Forget：若同作用域还有模型，Worker 会先切换到其中一个；否则必须重新选择模型才能继续创建或
发送。切换中保留旧选择、禁用下拉并显示进度，不闪回 warning。稳定的 Provider/Key 状态与
Forget 只属于 Settings，不作为
工作区聊天卡片重复展示；Chat 只保留临时运行反馈和 Cancel。刷新或 Forget 后即使偏好仍在，
两个输入框也不会继续显示它。非秘密的勾选、preferred model 和自定义 Endpoint 会持久化；
固定目录升级后不再存在的引用会被删除，不会猜测替代模型。SillyOS 不合成 `latest` 别名，
也不比较无关模型的版本高低；如果 Pi 在同一 API/Endpoint 路径中同时提供非日期 stable alias
和对应的 `-YYYYMMDD` 快照，选择页只展示 stable alias。不存在这个精确 alias 时，日期版本仍会
如实保留。连接模型会优先使用该 Provider 已启用的 preferred model，而不是目录中的任意首项。

可用 built-in 的详情把初始连接模型的 preset endpoint 只读展示在 Connection 区域。API key
从 uncontrolled password input 通过 **Save key** 直接交给 Agent Worker；保存本身不请求
Provider。Worker 接受 key 并完成本地 Agent session 初始化后，同一 Provider/Endpoint 作用域
内所有 enabled models 立即可用，Home 的 API-key warning 同时消失；不需要先请求或测试
Provider。用户在
下拉中切换时，Worker 先原子选择新模型；只有成功后 UI 才同时更新 active 与 preferred，失败则
保留旧模型。独立的 **Test connection** 只是可选、可重复的时间点诊断，会对当前模型发送一次
很小但可能计费的真实请求。成功或失败都不改变已保存 key、Agent session 或作用域内模型的
可用性，也不认证其他模型；错误的 key、模型名、Endpoint 或网络条件会在测试或后续真实 Agent
调用中如实失败。输入框会立即清空，key 和测试结果都只属于当前 Worker/浏览器会话；作用域内
切换无需重新输入 Key，跨 Provider/Endpoint、Forget、关闭页面或刷新页面后需要重新保存。
保存成功后可以体验：

Bedrock 这类 ambient、OAuth、keyless 或多字段凭据 profile 仍可查看，但不会被压成一个假的
API-key 表单，也不会显示可用的 Test connection。

- 从 Creator Home 提交翻译、写作、角色扮演或通用创作意图；
- 查看确定性的本地 Creator 回复和带明确版本的 Program proposal；
- 在 Program workspace 中同时查看人类/Creator 对话、proposal、预览和 activity；
- 接受或拒绝当前精确版本；补充要求会形成新的 `pending` 版本，旧版本决定会被完整拒绝；
- Program 会在事务提交后写入此浏览器的本地目录，返回 Home 或刷新页面后可以从“最近的
  程序”重开同一修订、决定、消息和 Activity。

另有一个只在 `?agent=pi-test` 出现的 B0a 验证入口：它会把产品 lockfile 固定的
`pi-agent-core` / `pi-ai` 0.84.3 懒加载进 Dedicated Worker，通过 typed RPC 运行真实
Pi `Agent`、确定性本地 provider 和唯一的 `sillyos_propose_program_revision`
`AgentTool`，并让一次 follow-up 产生精确的 v2 proposal。这个入口只接受合成测试值；
它不会请求 LLM，也不会把测试值写入 React state、URL、日志、网络请求、Program 数据或
浏览器持久化存储，forget 会终止 Worker。

P1-B1a 已把 B0b 的 `?agent=pi-openai` 用户入口清理掉。普通 URL 的设置页从产品固定的
Agent Worker 无凭据读取完整 Provider/model catalog；React 不导入底层 runtime，也不维护第二份目录。
B1c 另外把 **Built-in Providers** 和 **Custom Endpoints** 分区。自定义 profile 只允许
HTTPS base URL、model id、显式 context/output 上限，以及 Pi 已提供的四种 API family：
`openai-completions`、`openai-responses`、`anthropic-messages`、
`google-generative-ai`；协议永远不从 URL 猜测。这个有界非秘密 profile 可以保存在产品自有
Browser Settings repository 中，API key 与最近一次测试状态都不会持久化。它也不会
因为一次会话测试成功就升级成 SillyOS 的 built-in 双浏览器资格结论。

当前产品已经有由 Dedicated Worker 持有的 Browser IndexedDB Program repository；它只
保存有界的产品 Program 投影，不保存 API key、Pi session、附件内容或 workspace 文件。
初始 proposal 仍由本地 deterministic preview 产生；接受 proposal 会把精确复核过的
workspace head 发布为本地不可变 Program snapshot，但不会因此生成、部署或托管一个真实
应用。这个边界会在界面中如实显示，不使用假网络层来伪装后端。

## Browser 安全与执行边界

2026-08-28 起，SillyOS Browser 使用三个明确分开的安全平面：

```text
SillyOS UI / Product Core
  -> typed Agent RPC
产品固定版本的 Pi Agent / Credential plane
  -> typed WorkspaceExecutionPort
独立 origin 的 Workspace Execution Sandbox
  -> 当前 Program 专属 VFS volume
```

SillyOS 控制面只执行产品随附、由 lockfile/build identity 固定的可信代码。用户、Agent、
项目、导入内容或模型生成的 JavaScript、HTML、Python、shell 与其他代码不得在 SillyOS
origin 中执行；生成 HTML 也不得注入控制面 DOM。Pi 仍是唯一 Agent、Provider、模型和
Agent loop 来源。当前 deterministic 与 live Pi 路线都通过独立 origin Sandbox 获得 Pi
原生 `read`/`write`/`edit`/`bash`；SillyOS 另外以 Pi `AgentTool` 注册一个固定、只读、
结构化的 `grep` capability。它使用显式 typed Workspace RPC，不是第二套 tool dispatcher。

产品数据、凭据与 workspace bytes 分属 Product Repository、未来的 Credential Vault 和
Workspace Volume Repository。S1a-1 已在 source 中把普通 Program 的唯一 Authority 切到独立
Sandbox origin：控制面创建精确 origin frame transport，Sandbox 内固定 Host Worker 独占 OPFS、
snapshot/export 与 volume 生命周期，旧控制-origin Host Worker 和 fallback 已删除。物理 Product
Repository V5 会直接清空并重建精确 preview V4 stores，不读取或迁移旧记录；旧控制-origin OPFS
bytes 可能仍由浏览器保留，但产品不再可达，也不会把它们作为迁移输入。当前唯一实现的
credential 模式仍是 session-only；“记住在此设备”、加密 Vault、
WebAuthn PRF/密码解锁、Lock、Forget、Replace、endpoint 重绑定与重定向拒绝都属于后续独立
阶段，不能从现在的 Save key 推断出来。

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
`read`、`edit`、`bash` 或 `grep`。它也不代表 Linux、容器、Git、Python/QuickJS/Wasm、网络或
包管理器。

当前 Sandbox production artifact 精确为 5 个文件：`_headers`、HTML、bootstrap、Host Worker
和一个 build-known lazy shell chunk。观测到的 raw/gzip 大小分别为 bootstrap
`5,850 / 2,204`、Host `103,398 / 23,751`、shell `1,291,658 / 353,606` bytes；没有额外输出
Wasm、QuickJS、CPython 或 Node external runtime asset。但 install/lock graph 仍含 optional/vendor
依赖，shell bundle 也包含未注册的 `curl` 实现，因此安全依据是命令白名单、无网络注入和 CSP，
不是“依赖或未使用代码不存在”。

checkpoint 2 已在 Chromium 与持久 WebKit 中自动写入并冷重开 `1,000 × 5 KiB` 文件和一个
`16 MiB` 文件，共 `1,001` 个文件、`21,897,216` 字节，最终 generation 为 `1002`；
`100 MiB`、`256 MiB` 只保留为 origin 容量允许时的可选原始测量，不是支持承诺。固定边界是
`1 MiB` 最大 I/O chunk 和 `4 MiB` **SillyOS 管理的文件系统 payload** in-flight；这不测量或
限制浏览器总 heap。页面从不接收 volume bytes，任何组件也不需要让整卷常驻内存。Pi 原生
`read` 的 `256 KiB` wire 上限只限制一次工具调用，并不是 OPFS 卷上限。

`navigator.storage.estimate()` 只描述调用方 origin，不存在跨浏览器、设备统一的固定 quota。
S1a-1 后 Workspace bytes 属于 Sandbox origin，因此控制面暂时移除了原有 estimate/persist UI，
避免把 Product Repository 所在 control origin 的读数冒充成 volume 状态。未来若恢复这项 UI，
必须先由 Sandbox 通过 typed status 提供自己的建议性读数；当前不声称已申请持久化 storage。

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
import/restore reader。Agent Forget 会清理 Pi/执行态并释放 lease，但
不会删除 durable volume。

Accept 现在会保留另一份 Host-owned immutable snapshot，并在审查卡片中分别显示最新 accepted
snapshot、pending proposal 的 reviewed head 与当前 mutable head。Pi 工具在运行中推进 generation
时，旧 checkpoint 不会继续显示成 current；Host 不可用时 currentness 会明确显示 unavailable。
后续 pending/rejected revision 也不会抹掉已接受 snapshot 的身份。当前“下载工作区 ZIP”仍只
导出 mutable head；产品尚未提供 accepted snapshot 的用户下载按钮或 import/restore。

路线仍是 **Browser 优先、Desktop 保留**。P2 已闭合事务提交后发布、最近 Program
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
撤下同源 workspace tools。B1c-S0 已从提交 `a4cc8754` 部署为 Cloudflare 版本
`e1808054-af9f-446f-a913-22a39bf98e37`；本地与公开域名的严格 CSP 响应、Home、Settings
目录均在 Chromium/WebKit 通过。WebKit 产生了预期的 Trusted Types
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
BYO Sandbox、Wasm/更完整执行环境和 import 仍未激活。Desktop
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
再到翻译/写作/角色扮演产品的分阶段路径见 [PLAN.md](./PLAN.md)。为每个 workspace
Agent 提供熟悉的受限工具环境和单一工作卷仍是研究门；WASM 是可选执行机制，不是产品契约。
S1b-2 与 S1b-3 已在 2026-08-29 本地关闭。QuickJS Q0 也已作为可删除的 dev/test
feasibility spike 通过 Chromium/WebKit，但没有接入 Pi、Program VFS、receipt 或 production
CSP；Python、更广的 Wasm、BYO Sandbox 和 editor proof 均未激活。当前 Sandbox/live-tools
overlay 没有 production deployment receipt。
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
terminate 通过；它只执行同步脚本，检测到 pending Promise job 会失败。普通 dev/preview CSP 仍拒绝 Wasm，只有显式 Q0 mode 加
`wasm-unsafe-eval`。它只返回 diff，不提交 VFS。Python 因资产、启动和 JS bridge 成本后置。
两者都尚未成为产品能力，也不能通过打开 just-bash 的 Browser flags 获得。

三轮 fresh-profile / warm-server 的 raw dev harness 数据中，Chromium 的 warm `true`、raw
bash `rg`、structured grep 每轮 median 分别为 `0.8 ms`、`5.4–5.9 ms`、`7.6–7.9 ms`；
WebKit 为 `2–6 ms`、`9–26 ms`、`11–13 ms`。对应 Host create/open 为 Chromium
`85.8–108.1 ms`、WebKit `129–276 ms`，另一次 WebKit 重跑出现约 `1.31 s` 离群。
这些测试使用专用 harness Worker 复用真实 Pi binder/typed Workspace path，不是 production
Agent Worker；没有观测到 control-page Long Task 也不是所有设备/并发 workspace 的保证。
Chromium 只有 `27.6–29.4 MB` 的 bucketed control-page JS heap，WebKit 没有可读数值；两者
都没有证明 Agent/Sandbox Worker、OPFS、Wasm 或浏览器进程的 total/peak memory。

## 运行

S1a-1 的普通产品需要 control 与 Sandbox 两个严格分离的 origin。先在本目录的两个终端分别启动：

```sh
deno task dev:workspace-sandbox
deno task dev
```

然后打开 control server 输出的 `http://127.0.0.1:4173`。Sandbox 固定为
`http://127.0.0.1:41740`；两个 dev server 都发出严格 CSP 并关闭 HMR，代码变化后要完整刷新，
不能用 Fast Refresh 把两份可信 artifact 更新到不同版本。每次启动 control Vite dev server
都会生成一个新的随机 style nonce，并由 Vite 加到它注入的 style 上；这不是 production nonce
策略。dev 不发送 Vite 自身无法满足的 Trusted Types Report-Only 观察头；preview/production
继续使用 self-hosted external style 并保留 TT Report-Only。也可以从仓库根目录分别运行：

```sh
deno task --cwd examples/silly-os dev:workspace-sandbox
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
Pi 原生 `createBashTool` 和 25-command just-bash facade。普通 live Provider 现在复用同一
四工具列表，并有额外的固定结构化 `grep`；返回 Home、
等待 workspace close 完成并刷新页面后，重新初始化 Pi test 会通过新的 Sandbox frame/Host
session 重开同一 generation 和文件。普通 URL 首次打开设置时才会启动一个无凭据 catalog
Worker，并在得到目录后立即终止它。

要运行 live 路线，直接打开普通 URL。未配置时点击 Creator Home 的 Provider warning，进入
Providers 后在 **Available models** 勾选希望出现在 Creator 选择器中的一个或多个兼容模型。
在 Connection 中选择当前模型，确认只读 endpoint，输入该 Provider 的 key，再点击
**Save key**。保存不会请求 Provider；Worker 接受 key 后 Agent Creator 的 Provider/proposal
路线和当前 Program-bound workspace 工具立即可用，Home warning 消失，并且主页显示这个
credential-bound 模型。**Test connection** 是可选、可重复的时间点诊断；只有点击它才会
发出一次很小但可能计费的模型请求，成功或失败都不会改变当前模型的可用性。失败后 key 仍在
Worker 内存中，可继续实际调用、重新测试或输入新 key 替换；实际调用若遇到无效 key、模型、
Endpoint 或网络错误，会通过正常 Agent 失败路径报告。Key 输入会立即清空，Forget 会终止持有
key 的 Worker。网页不会读取开发机 `.env`。勾选与 preferred model 在刷新后保留；Key 与测试
结果不保留。

需要兼容 endpoint 时，在 **Custom Endpoints** 中新增 HTTPS profile，显式选择四种 Pi API
family 之一并填写 model/limits，再用同一个 Connection 流程保存 key；测试仍然可选。刷新后
只会恢复这个非秘密 profile；API key 和测试状态都不会恢复。一次测试成功只描述当前
endpoint/key/model/API family 组合在本次浏览器会话中的那一次请求，不是使用前提。

当前已资格化的 control-plane Cloudflare 部署是
[silly-os.jasl9187.workers.dev](https://silly-os.jasl9187.workers.dev/)。
B1c-S0 提交 `a4cc8754b4c5f3050ff270a7c5a426b6c0d18176` 已于 2026-08-28 发布为
Cloudflare 版本 `e1808054-af9f-446f-a913-22a39bf98e37`，并通过当时 control-plane 的
Chromium/WebKit 响应与行为 smoke。它只托管静态产品；key 和模型请求从 Agent Worker 直接
发送给所选 Provider，不经过 SillyOS 或 Cloudflare relay。B1a/B1b 的独立部署历史保留在
[PLAN.md](./PLAN.md) 与 [DESIGN.md](./DESIGN.md)。S1a-1 尚无 production deployment receipt；
不能从这个 URL 推断 ordinary independent-origin Authority 或 Sandbox 域名已经发布。

开发资格检查会按精确 profile 从本目录的 `.env` 读取对应 Provider key，依次启动普通
Chromium context 与运行后删除的一次性持久 WebKit profile，
先用明确无效的凭据证明 Provider 4xx 可读且产品只持久化有界 `run_failed`，再证明真实请求
后的取消不会推进 v1、下一次运行形成精确 v2、测试的持久化投影不含 key，最后等待 Forget
实际终止 Agent Worker。它不读取或打印 Provider 请求头、请求体或 key。先在另一个终端以
`--port 4175 --strictPort` 启动 Vite，再运行：

```sh
deno task dev --host 127.0.0.1 --port 4175 --strictPort
deno task qualify:browser:qualified
```

`qualified` 会检查当前五个可选 profile；也可通过
`deno task qualify:browser:provider anthropic` 检查一个精确 profile。验收部署源时可把
HTTPS 地址作为下一个参数传入同一命令。OpenRouter candidate 不属于 `qualified` 集合；
重新资格化它需要先在受控候选 build 中开放该精确 tuple，而不能绕过正式 UI 的 disabled
状态。`qualify:browser:b1b` 表示五个命名 B1b 目标的完整 checkpoint，因此 OpenRouter 未
通过期间预期为红；日常 release matrix 使用 `qualified`。

共享 examples Playwright 套件也必须通过 `examples/silly-os/vite.config.ts` 启动本产品，
这样 dev/E2E 使用与普通开发相同的 Worker alias 和固定 Pi 依赖预打包；这不改变生产 chunk、
Provider 资格或 CSP。

Browser 目标可作为 Cloudflare Workers Static Assets 发布的本地优先产品。部署方只
提供静态应用；模型请求从浏览器 Agent Worker 直接到用户选择的 Provider，不经过
SillyOS 官方代理。生产 UI key 仍须保持只在 Worker 内存中，不能写入 React state、URL、
日志、Program 数据、IndexedDB、OPFS 或导出文件；custom profile 的 API key 也不会进入
保存非秘密 profile 的 `localStorage`。

B1c-S0 为文档、静态资源和 selected Agent Worker 定义完整的无 wildcard CSP：显式设置
`default-src`、`script-src`、`style-src`、`style-src-elem`、`style-src-attr`、
`worker-src`、`connect-src`、`object-src`、
`base-uri`、`frame-src`、`frame-ancestors` 与 `form-action`，并附加 Trusted Types Report-Only、
Permissions Policy、`no-referrer`、`nosniff` 和嵌入 denial。control 文档的 `frame-src` 只允许
精确 Sandbox origin 与 `blob:`，Sandbox 文档的 `frame-src` 只允许 `blob:`，用于 WebKit 的
Sandbox-private download navigation；该 Blob URL 从不跨 control RPC。Sandbox 文档的
`frame-ancestors` 也只允许精确 control origin。普通文档与 catalog Worker 的
`connect-src` 只有 self；built-in 或 custom Agent Worker URL 携带经过验证的
`endpoint-origin` 时，只有该 Worker 增加这一个精确 HTTPS origin。Cloudflare 和 local
Vite dev 使用同一 canonical rule；dev 对重复、HTTP 或畸形 origin 返回 400/no-store，并在
Vite transform 前移除 query。query 不包含 key、model 或 endpoint path。任何响应都不使用
`connect-src https:`、`unsafe-inline` 或 `unsafe-eval`。

该选择只解决 CSP admission，不会让 Provider 返回允许 SillyOS origin 读取的 CORS 响应。
自定义 endpoint 仍必须满足 HTTPS、CORS、streaming 与取消合同；Pi 在 Desktop 支持的全部
Provider 不会自动成为 Browser 能力，`no-cors`、Service Worker 或放宽 CSP 都不能绕过
Provider CORS。先前的 actual-build blocker 已由通用 SillyMaker tooling 修复并被本产品消费：
版本戳现在是应用模块之前加载的同源外部脚本，生产 HTML 不再含可执行 inline script。
S1a-1 进一步让 local dev 使用精确双 origin 的 strict CSP 并关闭 HMR；生产 artifact checker
会拒绝 `development` identity、混合 control/bootstrap/Host identity、宽泛 `frame-src` 和退休的
同源 Host Worker。control dev server 的随机 style nonce 只允许 Vite 当次注入的 style；preview/
production 仍是 self-hosted external style，不把 nonce 变成发布策略。通过这些 build checks 仍不替代 ordinary Chromium/WebKit product evidence
或 production deployment receipt。

### Pi RPC 开发启动器

仓库另带一个 **尚未连接 Creator UI** 的原始 Pi RPC 启动器，用来验证 provider、model、
凭据与固定隔离参数。它绝不搜索 `PATH`，也不接受 Pi 命令或路径覆盖；只解析本产品在
`package.json` 与根 lockfile 中固定的 `@earendil-works/pi-coding-agent@0.84.3` CLI
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
  --model openai/gpt-5.4 \
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

产品模型、Browser Pi Worker 和固定 Desktop 启动合同的 focused tests：

```sh
deno run -A npm:vitest run \
	  src/test/creator-session.test.ts \
	  src/test/creator-agent-admission.test.ts \
	  src/test/browser-control-plane-security.test.ts \
	  src/test/browser-pi-browser-compatibility.test.ts \
  src/test/browser-pi-catalog-port.test.ts \
  src/test/browser-pi-provider-runtime-bridge.test.ts \
  src/test/browser-pi-worker.test.ts \
  src/test/browser-provider-settings-repository.test.ts \
  src/test/cloudflare-selected-origin-worker.test.ts \
  src/test/provider-settings-ui.test.tsx \
  src/test/pi-rpc-startup.test.ts
```

视觉验收不能只看一张宽屏截图。开发完成前至少覆盖 `1600x1000`、`1280x800`、
`768x700`、`767x700`、`390x844`、`320x568` 和 `1024x520`，并使用长中文、
长英文、键盘、IME、拖动分栏和全屏焦点恢复进行真实 Browser 检查。

## 当前代码边界

| 位置                                                           | 所有权                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/product/contracts.ts`                                     | Program、proposal、activity 与 Creator session 合同                            |
| `src/product/creator-session.ts`                               | 本地 session、proposal review 与 Agent candidate 原子发布                      |
| `src/product/creator-agent-admission.ts`                       | submit/candidate 的严格 product wire admission                                 |
| `src/product/browser-provider-settings-repository.ts`          | 有界非秘密 custom HTTPS profile 持久化；不接收 key                             |
| `src/product/fake-creator.ts`                                  | 默认初始 proposal 的确定性 fake Creator                                        |
| `src/agent/creator-agent-port.ts`                              | React 可见的 product facade；不暴露 raw Pi records                             |
| `src/agent/browser-pi-*`                                       | 懒加载 Worker、固定 Pi identity、catalog、Provider 与 admitted workspace tools |
| `src/agent/pi-workspace-tool-binder.ts`                        | Pi 原生四工具绑定与固定 structured `grep` AgentTool                            |
| `src/workspace/browser-workspace-just-bash-runtime.ts`         | bounded just-bash facade 与只读 fixed-`rg` structured grep                     |
| `src/deployment/cloudflare-selected-origin-worker.ts`          | built-in/custom Agent Worker 的完整 strict-CSP 与精确 selected-origin 响应层   |
| `src/deployment/cloudflare-workspace-sandbox-worker.ts`        | 独立 Sandbox artifact 的固定响应头与 Cloudflare 静态边界                       |
| `src/workspace/browser-workspace-sandbox-frame-transport.ts`   | 控制 origin 到固定 Sandbox origin 的 fail-closed bootstrap/typed channel       |
| `src/workspace/browser-workspace-sandbox-build-identity.ts`    | control/bootstrap/Host 共用的 product-derived build identity admission         |
| `src/workspace/browser-workspace-sandbox-download-protocol.ts` | Sandbox Host 到 bootstrap frame 的私有 download request/receipt                |
| `src/workspace-sandbox/`                                       | Sandbox 文档 bootstrap 与同 origin 固定 Host Worker                            |
| `src/product/indexeddb-program-repository.ts`                  | physical Product Repository V5 与 exact preview-V4 clean reset                 |
| `src/companion/pi-rpc-startup.ts`                              | dev-only 固定 Pi artifact、启动参数、隔离 flags 与脱敏摘要                     |
| `src/application/`                                             | Browser/Deno 共用的 React 产品入口与工作区表现                                 |
| `src/test/browser-pi-worker.test.ts`                           | Pi tool、RPC 顺序/currentness、取消、替换与 Worker teardown                    |
| `tools/pi-rpc.mts`                                             | raw Pi RPC 开发启动器；尚未连接 Creator                                        |
| `PLAN.md`                                                      | 独立产品孵化顺序、所有权、停止条件与明确 defer                                 |
| `WASM-WORKSPACE-RESEARCH.md`                                   | workspace harness 候选、共同语料和选型证据门                                   |

后续 Agent loop、模型/provider、会话、tool dispatch 与 Agent 扩展统一由 Pi 负责。
Browser Agent Worker 或 Desktop companion 只做目标适配、Program 数据所有权和 typed
transport 投影；React 不接触 raw Pi RPC/provider records，也不持久化 provider key。
Agent 侧独特能力只实现一次 schema/prompt/handler 核心，Browser 薄适配为 Pi
`AgentTool`，Desktop 薄适配为 Pi Extension tool。未来 OpenUI 数据映射到 SillyMaker
的闭集 UI 组件与交互 intent；SillyMaker 不另建 Agent runtime，这些数据也不进入其
确定性 game Save。每个 workspace Agent 对应一个逻辑 workspace runtime 与持久工作卷，
保存源码、`.git`、产物、文件型持久数据、`AGENTS.md` 和 skills。S1 完成后，Pi 工具才可
通过独立 origin Sandbox 修改草稿工作卷；当前只有固定 deterministic fixture 保留旧的同源
工具证明。只有通过精确人类复核的 workspace snapshot 才会成为新的 accepted Program revision。

## 参考与授权

工作区交互参考
[Cloudflare OS `6223e261`](https://github.com/cloudflare/cloudflare-os/tree/6223e261f18849b817a8d7ca03fe3678b77048ca)，
但 SillyOS 不复制其品牌、资产、文案、截图、前端源码或 Cloudflare Workers 后端。
产品代码与文案按本仓库 MIT 许可发布；第一方媒体素材如后续加入，按仓库素材政策处理。
