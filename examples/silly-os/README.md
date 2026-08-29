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

可用 built-in 的详情把初始连接模型的 preset endpoint 只读展示在 Connection 区域。API Key
从 uncontrolled password input 通过 **Save key** 进入凭据流程；保存本身不请求 Provider。
**Remember on this device** 默认不勾选，因此普通 Save 仍只把 Key 交给当前 Agent Worker
会话。只有用户先用密码创建并解锁 Credential Vault、再显式勾选该项时，产品才会把 Key
加密后写入 Vault，并通过一次性 typed handoff 配置新的 Agent Worker。Worker 接受 Key 并完成
本地 Agent session 初始化后，同一 Provider/Endpoint 作用域内所有 enabled models 立即可用，
Home 的 API-key warning 同时消失；不需要先请求或测试 Provider。用户在
下拉中切换时，Worker 先原子选择新模型；只有成功后 UI 才同时更新 active 与 preferred，失败则
保留旧模型。独立的 **Test connection** 只是可选、可重复的时间点诊断，会对当前模型发送一次
很小但可能计费的真实请求。成功或失败都不改变已保存 key、Agent session 或作用域内模型的
可用性，也不认证其他模型；错误的 key、模型名、Endpoint 或网络条件会在测试或后续真实 Agent
调用中如实失败。输入框会立即清空，测试结果始终只属于当前 Worker/浏览器会话。session-only
Key 在跨 Provider/Endpoint、Forget、关闭页面或刷新后需要重新保存；记住的 Key 在刷新后仍保持
加密锁定，用户解锁 Vault 后可明确点击 **Use remembered key**，不需要读取或回显完整 Key。
**Lock** 会清除解锁能力并终止当前持 Key 的 Agent Worker；**Forget session key** 只结束当前
会话；**Forget remembered key** 删除精确持久绑定，若它正被使用也会结束当前 Agent Worker。
在同一精确绑定上再次勾选 Remember 并 Save 新 Key 即为 Replace。
保存成功后可以体验：

Bedrock 这类 ambient、OAuth、keyless 或多字段凭据 profile 仍可查看，但不会被压成一个假的
API-key 表单，也不会显示可用的 Test connection。

- 从 Creator Home 提交翻译、写作、角色扮演或通用创作意图；
- 查看确定性的本地 Creator 回复和带明确版本的 Program proposal；
- 在 Program workspace 中同时查看人类/Creator 对话、proposal、预览和 activity；
- 接受或拒绝当前精确版本；补充要求会形成新的 `pending` 版本，旧版本决定会被完整拒绝；
- Program 会在事务提交后写入此浏览器的本地目录，返回 Home 或刷新页面后可以从“最近的
  程序”重开同一修订、决定、消息和 Activity。

S2-N0 还为固定 Pi 增加了一个窄 `fetch_url({ url })` 工具。模型首次请求某个精确 HTTPS URL
时不会发出网络请求，而会在 Chat 中显示完整 URL、origin 和 path/query 外传风险；用户选择
**Allow once** 后，产品通过普通新 run 重试并在请求前消费该精确许可。真正的 `GET` 只在独立
origin、无 API key 的 Network Broker 中执行，不携带 Cookie、Authorization、referrer、body
或自定义 header，只返回不超过 `256 KiB` 的声明 UTF-8 文本/JSON/XML。目标仍必须允许 Browser
CORS；这不是任意网页抓取或搜索能力。N1 已增加 Program 级显式 opt-in：未勾选
仍是 **Allow once**，勾选只持久化该 Program 对精确 normalized origin/operation 的授权，并可
撤销。授权只进入普通 Product Repository，不包含完整 URL 或 API Key；Agent Worker 会在每次
admitted submit 前同步当前 Program 的完整 grant set。N2 还增加了固定
`download({ url, destination, overwrite? })` 工具：独立 Broker 在 Workspace Host 准备好私有
staging 后才开始 GET，每次最多转交一个等待 ACK 的 `1 MiB` chunk，完整且仍 current 的 2xx
响应才会通过原有 journal 发布到 Program volume。Chromium 与 WebKit 已各自验证 `32 MiB`
二进制、SHA-256、generation/receipt 和冷重开；这仍不等于任意站点 CORS、线上 ingress、搜索、
解压、认证下载或真实模型调用已经通过。当前三 origin artifact 已发布的仍是上一版本；本轮
N1/N2/S3 完成后会从同一 committed build identity 重新部署。

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
Browser Settings repository 中。API Key 默认不持久化；只有显式启用 Remember 且 Vault 已
解锁时，才会按该 profile 身份与完整 normalized HTTPS endpoint 的精确绑定加密保存。修改
endpoint 不会隐式重绑旧 Key；需要新建/确认新绑定。最近一次测试状态不会持久化，一次会话
测试成功也不会升级成 SillyOS 的 built-in 双浏览器资格结论。

当前产品已经有由 Dedicated Worker 持有的 Browser IndexedDB Program repository；它只
保存有界的产品 Program 投影与 Program 网络授权，不保存 API Key、Pi session、附件内容或
workspace 文件。Credential Vault 使用独立 Worker 与独立 IndexedDB database 保存 Vault header、
非秘密绑定 metadata 和密文；这属于存储所有权分离，不是同一 origin 内的物理权限隔离。
初始 proposal 仍由本地 deterministic preview 产生；接受 proposal 会把精确复核过的
workspace head 发布为本地不可变 Program snapshot，但不会因此生成、部署或托管一个真实
应用。这个边界会在界面中如实显示，不使用假网络层来伪装后端。

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
Repository V6 在既有 stores 上增加 Program network grants；旧控制-origin OPFS bytes 可能仍由
浏览器保留，但产品不再可达，也不会把它们作为迁移输入。

Credential Vault 是可选能力，session-only 仍是默认。用户用密码创建/解锁后，Worker 通过
WebCrypto 以 PBKDF2-SHA-256 派生不可导出 AES-GCM key，按完整 normalized HTTPS endpoint 与
Provider/profile 身份作为精确绑定/AAD 加密 API Key。Vault 支持 Lock、Forget、Replace，以及
只在解锁且绑定精确匹配时通过 transferred port 完成的一次 remembered handoff；完整 Key 不在
UI 中回读。Vault Worker 的发布响应固定 `connect-src 'none'`。Agent Worker 的 Provider fetch
另外固定 `credentials: "omit"`、`redirect: "error"`、`no-referrer`，并拒绝跨出选定 endpoint
origin 的请求或响应；不会把 Authorization 能力跟随到另一 origin。

这些边界只保护锁定状态下的本地密文，并把 Agent/项目生成代码与 SillyOS/API Key 隔离；它们
不声称抵抗控制面 XSS、恶意浏览器扩展、设备恶意软件、供应链攻击，或控制面在 Vault 已解锁时
滥用其能力。WebAuthn PRF/设备验证也尚未实现。

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
Chromium/WebKit 回执；当前组合 source 仍待本轮重部署。WebKit 当时产生了预期的 Trusted Types
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
再到翻译/写作/角色扮演产品的分阶段路径见 [PLAN.md](./PLAN.md)。当前 Browser
workspace 已交付独立 origin 的单一工作卷、受限 shell/QJS，以及
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
在 Connection 中选择当前模型，确认只读 endpoint，输入该 Provider 的 key，再点击
**Save key**。保存不会请求 Provider；Worker 接受 key 后 Agent Creator 的 Provider/proposal
路线和当前 Program-bound workspace 工具立即可用，Home warning 消失，并且主页显示这个
credential-bound 模型。**Test connection** 是可选、可重复的时间点诊断；只有点击它才会
发出一次很小但可能计费的模型请求，成功或失败都不会改变当前模型的可用性。失败后 key 仍在
Worker 内存中，可继续实际调用、重新测试或输入新 key 替换；实际调用若遇到无效 key、模型、
Endpoint 或网络错误，会通过正常 Agent 失败路径报告。Key 输入会立即清空，Forget 会终止持有
key 的 Worker。网页不会读取开发机 `.env`。勾选与 preferred model 在刷新后保留；测试结果
不保留，Key 默认也不保留。若需要持久化，先在同页创建/解锁 Credential Vault，再显式勾选
**Remember on this device** 后 Save；刷新后重新解锁并点击 **Use remembered key** 即可配置新的
Agent Worker。Save 与 Test connection 始终是两个独立按钮。

需要兼容 endpoint 时，在 **Custom Endpoints** 中新增 HTTPS profile，显式选择四种 Pi API
family 之一并填写 model/limits，再用同一个 Connection 流程保存 key；测试仍然可选。刷新后
会恢复这个非秘密 profile；API Key 只有在显式 Remember 且 Vault 解锁时才以该 profile 与完整
normalized endpoint 的精确绑定恢复为加密记录，测试状态不会恢复。一次测试成功只描述当前
endpoint/key/model/API family 组合在本次浏览器会话中的那一次请求，不是使用前提。

Cloudflare 入口仍是
[silly-os.jasl9187.workers.dev](https://silly-os.jasl9187.workers.dev/)，但当前线上 artifacts 是
上一轮已验证基线；N1、N2 与本节 Credential Vault 改动待本轮重部署。历史部署回执保留在
[PLAN.md](./PLAN.md) 与 [DESIGN.md](./DESIGN.md)，不能用来声称当前 source 已在线。产品仍是
静态客户端：Provider Key 和模型请求从 Agent Worker 直接发送给所选 Provider，不经过 SillyOS
或 Cloudflare relay；`fetch_url` / `download` 的远程响应则只从无 Key 的 Browser Broker 发出。
本地 N1/N2 Chromium/WebKit evidence 与 Vault focused tests 不自动证明 public-origin 真实模型
工具调用、任意站点 CORS、线上 ingress 或 search。

开发资格检查会按精确 profile 从本目录的 `.env` 读取对应 Provider key，依次启动普通
Chromium context 与运行后删除的一次性持久 WebKit profile，
先用明确无效的凭据证明 Provider 4xx 可读且产品只持久化有界 `run_failed`，再证明真实请求
后的取消不会推进 v1、下一次运行形成精确 v2、测试的持久化投影不含 key，最后等待 Forget
实际终止 Agent Worker。它不读取或打印 Provider 请求头、请求体或 key。资格检查沿用普通产品的
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
OPFS、导出文件或保存非秘密 profile 的 `localStorage`。session-only Key 只进入 Agent Worker
内存；显式 Remember 的 Key 只能进入专属 Vault Worker，由它加密后写入独立 Credential Vault
IndexedDB。独立 database 是所有权分离，不是同源权限隔离。

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
  src/test/creator-session.test.ts \
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
| `src/product/contracts.ts`                                      | Program、proposal、activity 与 Creator session 合同                            |
| `src/product/creator-session.ts`                                | 本地 session、proposal review 与 Agent candidate 原子发布                      |
| `src/product/creator-agent-admission.ts`                        | submit/candidate 的严格 product wire admission                                 |
| `src/product/browser-provider-settings-repository.ts`           | 有界非秘密 custom HTTPS profile 持久化；不接收 key                             |
| `src/product/fake-creator.ts`                                   | 默认初始 proposal 的确定性 fake Creator                                        |
| `src/agent/creator-agent-port.ts`                               | React 可见的 product facade；不暴露 raw Pi records                             |
| `src/agent/browser-pi-*`                                        | 懒加载 Worker、固定 Pi identity、catalog、Provider 与 admitted workspace tools |
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
| `src/product/indexeddb-program-repository.ts`                   | physical Product Repository V6、Program 状态与独立的网络授权 store             |
| `src/companion/pi-rpc-startup.ts`                               | dev-only 固定 Pi artifact、启动参数、隔离 flags 与脱敏摘要                     |
| `src/application/`                                              | Browser/Deno 共用的 React 产品入口与工作区表现                                 |
| `src/test/browser-pi-worker.test.ts`                            | Pi tool、RPC 顺序/currentness、取消、替换与 Worker teardown                    |
| `tools/pi-rpc.mts`                                              | raw Pi RPC 开发启动器；尚未连接 Creator                                        |
| `PLAN.md`                                                       | 独立产品孵化顺序、所有权、停止条件与明确 defer                                 |
| `WASM-WORKSPACE-RESEARCH.md`                                    | workspace harness 候选、共同语料和选型证据门                                   |

后续 Agent loop、模型/provider、会话、tool dispatch 与 Agent 扩展统一由 Pi 负责。
Browser Agent Worker 或 Desktop companion 只做目标适配、Program 数据所有权和 typed
transport 投影；React 不接触 raw Pi RPC/provider records，也不读取或持久化完整 Provider Key。
可选持久化只由专属 Credential Vault Worker 在 exact endpoint binding 下完成。
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
