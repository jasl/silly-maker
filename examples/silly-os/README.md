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
- 接受或拒绝当前精确版本；补充要求会形成新的 `pending` 版本，旧版本决定会被完整拒绝。

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

当前产品仍没有数据库、workspace tool harness（包括任何 WASM payload）、持久化或通用
外部服务配置。初始 proposal 仍由本地 deterministic preview 产生；接受 proposal 也不会
生成或发布真实应用。这个边界会在界面中如实显示，不使用假网络层来伪装后端。

已接受的下一条路线是 **Browser 优先、Desktop 并行保留**。Browser 将在 Dedicated
Worker 中运行 Pi 的 `Agent`/`pi-ai`，逐个资格化通过 UI 接受用户自己的 provider API key 或明确
协议的 HTTPS endpoint，并把 Pi 工具直接转发给拥有 OPFS 工作卷的 Workspace Host
Worker。B0a 已闭合无真实 key 的 Pi/Worker/typed-RPC 接线；B0b 已完成固定 OpenAI
profile 的本地及部署源资格化。Desktop 使用同一产品接口和能力核心，底层
改由私有 companion 启动产品打包的 Pi coding-agent；Desktop live route 尚未实现。

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
提交一次 follow-up。普通 URL 不会加载 Pi Worker 或它的 provider/runtime 代码。

要运行 B0b live 路线，在地址追加 `?locale=zh-CN&agent=pi-openai`，通过页面加载
OpenAI key，再创建 Program 并提交 follow-up。加载完成只表示 Worker profile 已配置；
真正的凭据/Provider 验证发生在首次运行。Key 输入会立即清空，Forget 会终止持有 key 的
Worker。这个显式路线只支持当前固定模型，不读取开发机 `.env`。

当前已资格化的 Cloudflare 部署是
[silly-maker-silly-os.jasl9187.workers.dev](https://silly-maker-silly-os.jasl9187.workers.dev/)。
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
