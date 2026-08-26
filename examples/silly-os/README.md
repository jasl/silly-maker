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

当前阶段是明确标注的 **deterministic local fake preview**，用于先验证产品模型和
Cloudflare OS 风格的高质量 Agent 工作区：

- 从 Creator Home 提交翻译、写作、角色扮演或通用创作意图；
- 查看确定性的本地 Creator 回复和一份 Program proposal；
- 在 Program workspace 中同时查看人类/Creator 对话、proposal、预览和 activity；
- 接受或拒绝 proposal，并观察 `pending` / `accepted` / `rejected` 状态。

当前没有接入真实 LLM、Pi、数据库、WASM shell、外部服务或持久化。接受 proposal
也不会生成或发布真实应用。这个边界会在界面中如实显示，不使用假网络层来伪装后端。

详细的产品范围、Cloudflare OS 参考快照、语义映射、桌面/移动布局、键盘/IME、
防截断和视觉验收矩阵见 [DESIGN.md](./DESIGN.md)。

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

## 检查

```sh
deno task test
deno task build
deno task build:desktop
```

产品模型的 focused test：

```sh
deno run -A npm:vitest run src/test/creator-session.test.ts
```

视觉验收不能只看一张宽屏截图。开发完成前至少覆盖 `1600x1000`、`1280x800`、
`768x700`、`767x700`、`390x844`、`320x568` 和 `1024x520`，并使用长中文、
长英文、键盘、IME、拖动分栏和全屏焦点恢复进行真实 Browser 检查。

## 当前代码边界

| 位置                               | 所有权                                              |
| ---------------------------------- | --------------------------------------------------- |
| `src/product/contracts.ts`         | Program、proposal、activity 与 Creator session 合同 |
| `src/product/creator-session.ts`   | 本地 session 状态转换与 proposal review             |
| `src/product/fake-creator.ts`      | 确定性 fake Creator；不是 transport 或真实 Agent    |
| `src/application/`                 | Browser/Deno 共用的 React 产品入口与工作区表现      |
| `src/test/creator-session.test.ts` | fake flow 和 review 状态的 focused 行为证据         |

后续真实 Pi、数据库、模型、工具环境和外部服务属于 companion/Host 能力，通过 typed
RPC 接入 renderer；它们不是进程内插件，也不进入 SillyMaker 的确定性 game Save。

## 参考与授权

工作区交互参考
[Cloudflare OS `6223e261`](https://github.com/cloudflare/cloudflare-os/tree/6223e261f18849b817a8d7ca03fe3678b77048ca)，
但 SillyOS 不复制其品牌、资产、文案、截图、前端源码或 Cloudflare Workers 后端。
产品代码与文案按本仓库 MIT 许可发布；第一方媒体素材如后续加入，按仓库素材政策处理。
