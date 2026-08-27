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

默认入口仍是明确标注的 **deterministic local fake preview**，用于先验证产品模型和
Cloudflare OS 风格的高质量 Agent 工作区：

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

`?agent=pi-openai` 是刻意受限的 B0b live 入口：它仍使用相同的固定 Pi `Agent`、唯一
proposal tool、typed RPC 和 currentness，只把 provider stream 换成固定的 OpenAI
Responses `gpt-4.1-nano`。真实 follow-up、工具候选、取消、v2 successor、内存 key 和
Forget 已在本地及 Cloudflare 部署源的 Chromium/WebKit 完整通过。B0b 已关闭，但它仍
不是通用 Provider 设置界面。

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
`.sillyos/tmp/bash-<opaque>.log`。P3a 因而关闭。当前没有激活中的 SillyOS 实现片；广泛
P3c-B1 的三个 checkpoint 也已在 2026-08-28 关闭：Chromium 与持久 WebKit 都验证了
generation-1002 的 accepted snapshot、generation-1005 的独立 later draft、胜出页持有 Host
时的 stale Accept、cold reopen，以及 `1,001` 个文件逐字节一致的 `22,065,863`-byte retained
ZIP。该物理 ZIP 读取是 test-only OPFS 证据，不是产品下载 API。广泛 Provider/BYO Sandbox
研究、Wasm/更完整执行环境和 import 仍未激活。Desktop
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
close 完成并刷新页面后，重新初始化 Pi test 仍会打开同一 generation 和文件。普通 URL 不会
加载 Pi Worker、Workspace Host 或 just-bash 的 lazy runtime 代码。

要运行 B0b live 路线，在地址追加 `?locale=zh-CN&agent=pi-openai`，通过页面加载
OpenAI key，再创建 Program 并提交 follow-up。加载完成只表示 Worker profile 已配置；
真正的凭据/Provider 验证发生在首次运行。Key 输入会立即清空，Forget 会终止持有 key 的
Worker。这个显式路线只支持当前固定模型，不读取开发机 `.env`。

当前已资格化的 Cloudflare 部署是
[silly-maker-silly-os.jasl9187.workers.dev](https://silly-maker-silly-os.jasl9187.workers.dev/)。
P3c-B1 checkpoint 3 的提交
`87de75cbfc990b5d2738b26c24a0864474a10c98` 已于 2026-08-28 发布为 Cloudflare
版本 `a99ade98-e333-49a7-a92f-cd46e6e8e074`；全新浏览器上下文从公网完成了 Creator
Home 到持久 Program workspace 的冒烟检查，HTTP、页面、console 和资源请求均无错误。
它只托管静态产品；OpenAI key 和模型请求从 Agent Worker 直接发送给 OpenAI，不经过
SillyOS 或 Cloudflare relay。

开发资格检查会从本目录的 `.env` 读取 `OPENAI_API_KEY`，依次启动 Chromium/WebKit，
证明真实请求后的取消不会推进 v1、下一次运行形成精确 v2、测试的持久化投影不含 key，
然后执行 Forget。它不读取或打印 Provider 请求头、请求体或 key。先在另一个终端以
`--port 4175 --strictPort` 启动 Vite，再运行：

```sh
deno task dev --host 127.0.0.1 --port 4175 --strictPort
deno task qualify:browser:openai
```

验收部署源时可把 HTTPS 地址作为参数传入同一命令。

Browser 目标可作为 Cloudflare Workers Static Assets 发布的本地优先产品。部署方只
提供静态应用；B0b 的模型请求从浏览器 Agent Worker 直接到 OpenAI，不经过 SillyOS
官方代理。当前本地与部署源 B0b 均已验证 Worker 内存/forget 所有权。生产 UI key 仍须
保持只在 Worker 内存中，不能
写入 React state、URL、日志、Program 数据、IndexedDB、OPFS 或导出文件。自定义
endpoint 仍必须满足 HTTPS、CORS、streaming 与取消合同，并非 Pi 在 Desktop 支持的
全部 provider 都会自动出现在 Browser 能力列表中。

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
  src/test/browser-pi-worker.test.ts \
  src/test/pi-rpc-startup.test.ts
```

视觉验收不能只看一张宽屏截图。开发完成前至少覆盖 `1600x1000`、`1280x800`、
`768x700`、`767x700`、`390x844`、`320x568` 和 `1024x520`，并使用长中文、
长英文、键盘、IME、拖动分栏和全屏焦点恢复进行真实 Browser 检查。

## 当前代码边界

| 位置                                     | 所有权                                                       |
| ---------------------------------------- | ------------------------------------------------------------ |
| `src/product/contracts.ts`               | Program、proposal、activity 与 Creator session 合同          |
| `src/product/creator-session.ts`         | 本地 session、proposal review 与 Agent candidate 原子发布    |
| `src/product/creator-agent-admission.ts` | submit/candidate 的严格 product wire admission               |
| `src/product/fake-creator.ts`            | 默认初始 proposal 的确定性 fake Creator                      |
| `src/agent/creator-agent-port.ts`        | React 可见的 product facade；不暴露 raw Pi records           |
| `src/agent/browser-pi-*`                 | 懒加载 Worker transport、固定 Pi identity 与 B0a/B0b Pi 适配 |
| `src/companion/pi-rpc-startup.ts`        | dev-only 固定 Pi artifact、启动参数、隔离 flags 与脱敏摘要   |
| `src/application/`                       | Browser/Deno 共用的 React 产品入口与工作区表现               |
| `src/test/browser-pi-worker.test.ts`     | Pi tool、RPC 顺序/currentness、取消、替换与 Worker teardown  |
| `tools/pi-rpc.mts`                       | raw Pi RPC 开发启动器；尚未连接 Creator                      |
| `PLAN.md`                                | 独立产品孵化顺序、所有权、停止条件与明确 defer               |
| `WASM-WORKSPACE-RESEARCH.md`             | workspace harness 候选、共同语料和选型证据门                 |

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
