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

普通入口现在提供 Pi-owned Browser Provider 设置。没有已经测试成功的 Provider 时，Creator
Home 会显示一张可用键盘整体打开的警告卡片；用户需要先进入 Providers。当前已通过
SillyOS Browser 资格验证的精确 built-in profile 是 OpenAI `gpt-4.1-nano`、Anthropic
`claude-sonnet-4-5-20250929`、Google `gemini-2.5-flash`、DeepSeek `deepseek-v4-flash`
与 xAI `grok-4.3`。其余 Pi catalog 记录仍可搜索和查看，但不会因为出现在目录中就被
伪装成浏览器可用。

可用 built-in 的详情把 Pi 模型提供的 preset endpoint 只读展示在 Connection 区域，API key
从 uncontrolled password input 直接交给 Agent Worker。**Test connection** 会通过 Pi 的
`Provider.streamSimple` 发送一次很小但可能计费的真实模型请求；只有成功完成流后才会显示
ready。输入框会立即清空，key 和测试成功状态都只属于当前 Worker/浏览器会话；切换模型、
Forget、关闭页面或刷新页面后都需要重新测试。连接成功后可以体验：

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

P1-B1a 已把 B0b 的 `?agent=pi-openai` 用户入口清理掉。普通 URL 的设置页从固定版本 Pi
Worker 无凭据读取完整 Provider/model catalog；React 不导入 Pi，也不维护第二份目录。
SillyOS 只叠加精确到 `(providerId, modelId, API family, origin)` 的 Browser 资格状态。
B1c 另外把 **Built-in Providers** 和 **Custom Endpoints** 分区。自定义 profile 只允许
HTTPS base URL、model id、显式 context/output 上限，以及 Pi 已提供的四种 API family：
`openai-completions`、`openai-responses`、`anthropic-messages`、
`google-generative-ai`；协议永远不从 URL 猜测。这个有界非秘密 profile 可以保存在产品自有
Browser Settings repository 中，API key 与“已在当前浏览器验证”状态都不会持久化。它也不会
因为一次会话测试成功就升级成 SillyOS 的 built-in 双浏览器资格结论。

当前产品已经有由 Dedicated Worker 持有的 Browser IndexedDB Program repository；它只
保存有界的产品 Program 投影，不保存 API key、Pi session、附件内容或 workspace 文件。
初始 proposal 仍由本地 deterministic preview 产生；接受 proposal 会把精确复核过的
workspace head 发布为本地不可变 Program snapshot，但不会因此生成、部署或托管一个真实
应用。这个边界会在界面中如实显示，不使用假网络层来伪装后端。

P3c-B0 的三个检查点已经把 P3a 验证过的字节路径迁入产品自有的 OPFS Workspace Host，
闭合恢复、争用、规模和可携下载证据。
固定 Pi 0.84.3 的原生 `write`/`read` 通过 typed environment port 操作同一个 Program volume；
小型 IndexedDB continuation manifest 只锚定 Program/repository 与 volume 身份，Host 私有
durable head 则持有连续 generation。关闭后完整刷新页面会用新的 `workspaceSessionId` 重开
同一字节与 generation；mutation receipt 仍是 session-local，不会伪装成 Pi 或 Chat 持久化。

P3a 现已把固定 Pi 的四个原生 workspace 工具全部接到这一个 authority：`read`、`write`、
`edit` 与 `bash`。Browser Local 的 `bash` 由 Workspace Host Worker 内固定的
`just-bash@3.4.2` 执行，闭合 profile 明确标为 `terminal_aggregate`；Pi 仍拥有工具 schema、
截断/溢出文件算法与模型可见结果。它是带有限命令和资源边界的浏览器虚拟 shell，不是
Linux、容器、sandbox 或 live-streaming 终端，也没有 Git、Python/QuickJS、网络或包管理器。

checkpoint 2 已在 Chromium 与持久 WebKit 中自动写入并冷重开 `1,000 × 5 KiB` 文件和一个
`16 MiB` 文件，共 `1,001` 个文件、`21,897,216` 字节，最终 generation 为 `1002`；
`100 MiB`、`256 MiB` 只保留为 origin 容量允许时的可选原始测量，不是支持承诺。固定边界是
`1 MiB` 最大 I/O chunk 和 `4 MiB` **SillyOS 管理的文件系统 payload** in-flight；这不测量或
限制浏览器总 heap。页面从不接收 volume bytes，任何组件也不需要让整卷常驻内存。Pi 原生
`read` 的 `256 KiB` wire 上限只限制一次工具调用，并不是 OPFS 卷上限。

界面显示的 `navigator.storage.estimate()` 是整个 origin 的建议性读数，不存在跨浏览器、设备
统一的固定 quota。只有用户已经创建重要工作后才会显式请求 `persist()`；它是 best effort，
返回 `false` 不会让 workspace 失败或不可用。

在已打开的持久 Agent workspace 右侧点击“下载工作区 ZIP”，可以下载当前 durable head 的
VFS 文件与根目录 `sillyos-workspace.json`。生成阶段会显示文件/字节进度并可取消；进入
“正在将 ZIP 交给浏览器下载”后，下载已提交给浏览器，finalizing 不再可取消。看到“下载已
开始”只表示 SillyOS 已把文件交给浏览器下载管线，不表示用户已经选择最终位置或浏览器已
保存完成。

该 ZIP 使用固定 `client-zip` 2.5.0 生成 canonical STORE-only 文件，只包含 portable manifest
与 `workspace/` 下的 VFS 文件；它不包含 Chat、Program 数据库、凭据、Pi/provider sessions、
terminal/mutation receipts 或 Host metadata。Host Worker 独占 ZIP 临时文件和 object URL，页面
不接收 volume bytes，整卷也不需要常驻内存。Host 为 ready 状态保留默认 30 秒 watchdog；
页面点击下载并调用 `commitRelease()` 锁定不可取消的 finalizing 后，会保留 1,000ms 浏览器
handoff，随后才返回 release；Host 再 revoke URL、删除临时文件并终结任务。目前仍没有
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
reopen、连续 generation、mutation receipt、取消、清理、恢复/争用、storage UI、自动双引擎
`20 MiB+` gate，以及真实取消/下载/解包逐字节验证的 canonical portable ZIP。完整 B0 已在
2026-08-27 独立验收并关闭。随后 P3a-B1 的两个 checkpoint 也已交付并通过独立验收：固定
Pi 0.84.3 的原生 `edit` 与 `bash` 已接到同一 OPFS volume，确定性真实路径为
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
2026-08-28 以这个 truthful disabled disposition 关闭。B1c 是当前本地产品切片：它增加上述
真实连接测试、Home warning、有界 custom HTTPS profile，以及只给选定 Agent Worker 精确
endpoint origin 的 Cloudflare CSP 响应层。B1c 尚未部署，也尚未把任何自定义 endpoint 宣称为
跨浏览器 qualified。当前本地实现已通过 6 个 focused 文件 / 81 个测试、全量 404 个文件 /
5,689 个单元测试、Chromium 与持久 WebKit 的 4 条 built-in/custom Settings 旅程，以及 5 个
qualified built-in × 2 种浏览器的 10 条真实 Provider 旅程；生产构建与 Cloudflare dry-run
也通过。BYO Sandbox、Wasm/更完整执行环境和 import 仍未激活。Desktop
底层仍计划由私有 companion 启动产品打包的 Pi coding-agent，但当前没有激活。

详细的产品范围、Cloudflare OS 参考快照、语义映射、桌面/移动布局、键盘/IME、
防截断和视觉验收矩阵见 [DESIGN.md](./DESIGN.md)。从真实 Pi typed RPC、产品数据库、
Pi 工具到 workspace runtime 的转发、Pi 能力组合、OpenUI 到 SillyMaker 组件映射，
再到翻译/写作/角色扮演产品的分阶段路径见 [PLAN.md](./PLAN.md)。为每个 workspace
Agent 提供熟悉的 Linux-tools harness 和单一工作卷仍是研究门；WASM 是可选执行机制，
不是产品契约。候选路线与统一的 Browser/Deno 验收语料见
[WASM-WORKSPACE-RESEARCH.md](./WASM-WORKSPACE-RESEARCH.md)。

## 运行

在仓库根目录：

```sh
deno task app dev example-silly-os
```

或者进入本目录：

```sh
deno task dev
```

然后打开终端中 Vite 输出的地址。当前 Browser 和 Deno Desktop 共享同一个响应式
React 产品面；Desktop 是产品目标，不会另外模拟操作系统桌面。

要运行不访问 LLM 的 Browser Pi B0a 接线检查，在该地址追加
`?locale=zh-CN&agent=pi-test`，输入任意可丢弃的合成测试值并初始化，再创建 Program、
提交一次 follow-up。确定性 Pi 流程会用原生 `write`/`edit`/`read` 在持久 Program
workspace 完成编辑往返，再由原生 `bash` 调用 Browser Local 的 `tee` 与 `rg` 验证另一个
持久文件，最后形成 proposal；此时 workspace generation 为 `4`。返回 Home、等待 workspace
close 完成并刷新页面后，重新初始化 Pi test 仍会打开同一 generation 和文件。普通 URL 的
Creator Home 不会实例化 Pi Worker、Workspace Host 或 just-bash；首次打开设置时才会启动
一个无凭据 catalog Worker，并在得到目录后立即终止它。

要运行 live 路线，直接打开普通 URL。未配置时点击 Creator Home 的 Provider warning，进入
Providers 后选择上述任一已资格化的精确模型；确认只读 endpoint，输入该 Provider 的 key，
再点击 **Test connection**。该操作会立即发出一次很小但可能计费的 Pi 模型请求；只有它成功
完成后 Agent Creator 才会 ready，Home warning 也才会消失。Key 输入会立即清空，Forget 会
终止持有 key 的 Worker。网页不会读取开发机 `.env`。Anthropic 的可变别名
`claude-sonnet-4-5` 与 OpenRouter
`google/gemini-2.5-flash` 仍作为 candidate 显示且不能连接；Pi 的其他目录项也不会被自动
视为 Browser 支持。

需要兼容 endpoint 时，在 **Custom Endpoints** 中新增 HTTPS profile，显式选择四种 Pi API
family 之一并填写 model/limits，再用同一个 Connection 流程测试。刷新后只会恢复这个非秘密
profile；API key 和 verified 状态都不会恢复。成功只证明当前 endpoint/key/model/API family
组合在本次浏览器会话中完成了 Pi probe，不等于 SillyOS 已把它列为 Browser-qualified。

当前已资格化的 Cloudflare 部署是
[silly-os.jasl9187.workers.dev](https://silly-os.jasl9187.workers.dev/)。
P1-B1b 实现提交 `d7377ad36f27b982c8d6f87662e8a8586687f721` 已于 2026-08-28 发布为
Cloudflare 版本 `92c143f7-292f-474f-b7ad-ba98318a384a`；公网 HTML 返回 HTTP 200、该精确
build identity，以及仅包含 self 和六个命名 Provider origin 的 `connect-src`。应用内浏览器
读取到 OpenAI、Anthropic、Google、DeepSeek 与 xAI 为 qualified，OpenRouter 为 candidate；
Anthropic 固定快照可选、可变 alias 禁用，OpenRouter profile 也保持禁用。随后公网 origin
通过了上述五个 profile 在 Chromium 与持久 WebKit 中的全部十个真实资格旅程。它只托管
静态产品；key 和模型请求从 Agent Worker 直接发送给所选 Provider，不经过 SillyOS 或
Cloudflare relay。B1a 的独立部署历史保留在 [PLAN.md](./PLAN.md) 与 [DESIGN.md](./DESIGN.md)。
这个公网版本仍是已提交并验收的 B1b baseline；本 README 描述的 B1c Connection/custom
endpoint 工作尚未部署，不能从该 URL 推断 B1c 已发布。

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
提供静态应用；模型请求从浏览器 Agent Worker 直接到用户选择的已资格化 Provider，不经过
SillyOS 官方代理。当前五个精确 profile 已验证 Worker 内存/forget 所有权。生产 UI key 仍须
保持只在 Worker 内存中，不能写入 React state、URL、日志、Program 数据、IndexedDB、
OPFS 或导出文件；custom profile 的 API key 也不会进入保存非秘密 profile 的
`localStorage`。当前 B1c Cloudflare Worker 只在自定义 Agent Worker URL 携带经过验证的
`endpoint-origin` 时，把该 Worker 响应的 `connect-src` 换成 self 加这一个精确 origin；没有
该参数的文档、catalog 与 built-in Worker 继续使用固定六 origin policy，且任何响应都不使用
`connect-src https:`。这个选择只解决 CSP admission，不会让 Provider 返回允许 SillyOS origin
读取的 CORS 响应。自定义 endpoint 仍必须满足 HTTPS、CORS、streaming 与取消合同，并非 Pi
在 Desktop 支持的全部 Provider 都会自动获得 Browser 资格；`no-cors`、Service Worker 或放宽
CSP 都不能绕过 Provider CORS。

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
deno task build:desktop
```

产品模型、Browser Pi Worker 和固定 Desktop 启动合同的 focused tests：

```sh
deno run -A npm:vitest run \
  src/test/creator-session.test.ts \
  src/test/creator-agent-admission.test.ts \
  src/test/browser-pi-browser-qualification.test.ts \
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

| 位置                                                  | 所有权                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `src/product/contracts.ts`                            | Program、proposal、activity 与 Creator session 合同          |
| `src/product/creator-session.ts`                      | 本地 session、proposal review 与 Agent candidate 原子发布    |
| `src/product/creator-agent-admission.ts`              | submit/candidate 的严格 product wire admission               |
| `src/product/browser-provider-settings-repository.ts` | 有界非秘密 custom HTTPS profile 持久化；不接收 key           |
| `src/product/fake-creator.ts`                         | 默认初始 proposal 的确定性 fake Creator                      |
| `src/agent/creator-agent-port.ts`                     | React 可见的 product facade；不暴露 raw Pi records           |
| `src/agent/browser-pi-*`                              | 懒加载 Worker、固定 Pi identity、catalog 与 Browser 资格叠加 |
| `src/deployment/cloudflare-selected-origin-worker.ts` | custom Agent Worker 的精确 selected-origin CSP 响应层        |
| `src/companion/pi-rpc-startup.ts`                     | dev-only 固定 Pi artifact、启动参数、隔离 flags 与脱敏摘要   |
| `src/application/`                                    | Browser/Deno 共用的 React 产品入口与工作区表现               |
| `src/test/browser-pi-worker.test.ts`                  | Pi tool、RPC 顺序/currentness、取消、替换与 Worker teardown  |
| `tools/pi-rpc.mts`                                    | raw Pi RPC 开发启动器；尚未连接 Creator                      |
| `PLAN.md`                                             | 独立产品孵化顺序、所有权、停止条件与明确 defer               |
| `WASM-WORKSPACE-RESEARCH.md`                          | workspace harness 候选、共同语料和选型证据门                 |

后续 Agent loop、模型/provider、会话、tool dispatch 与 Agent 扩展统一由 Pi 负责。
Browser Agent Worker 或 Desktop companion 只做目标适配、Program 数据所有权和 typed
transport 投影；React 不接触 raw Pi RPC/provider records，也不持久化 provider key。
Agent 侧独特能力只实现一次 schema/prompt/handler 核心，Browser 薄适配为 Pi
`AgentTool`，Desktop 薄适配为 Pi Extension tool。未来 OpenUI 数据映射到 SillyMaker
的闭集 UI 组件与交互 intent；SillyMaker 不另建 Agent runtime，这些数据也不进入其
确定性 game Save。每个 workspace Agent 对应一个逻辑 workspace runtime 与持久工作卷，
保存源码、`.git`、产物、文件型持久数据、`AGENTS.md` 和 skills；Pi 工具可以修改草稿
工作卷，但只有通过精确人类复核的 workspace snapshot 才会成为新的 accepted Program
revision。

## 参考与授权

工作区交互参考
[Cloudflare OS `6223e261`](https://github.com/cloudflare/cloudflare-os/tree/6223e261f18849b817a8d7ca03fe3678b77048ca)，
但 SillyOS 不复制其品牌、资产、文案、截图、前端源码或 Cloudflare Workers 后端。
产品代码与文案按本仓库 MIT 许可发布；第一方媒体素材如后续加入，按仓库素材政策处理。
