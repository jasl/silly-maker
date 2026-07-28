<!-- SPDX-License-Identifier: MIT -->

# OpenUI（Generative UI 开放标准）与 SillyMaker 的兼容性调研

日期：2026-07-29。输入：`references/openui`（thesysdev/openui，MIT，revision `5266f735`，登记见 [reference-register.md](reference-register.md)）。问题：**Agent 动态生成 UI 的 OpenUI 标准，我们的引擎能支持吗？** 结论先行：**能，而且是干净的表现层集成——零引擎改动即可在 Story 层落地**；若验证成熟，可再抽一个可选适配层。

## 1. OpenUI 是什么

- **OpenUI Lang**：面向 LLM 输出的行式 DSL（`id = Component(args)`），流式优先（逐行解析、前向引用先渲染骨架）、比 JSON 省约 50–67% token。v0.5 加入 `$variable` 响应式状态、`Query()`/`Mutation()` 工具调用、`Action([@Set…])` 与内建函数。
- **组件库即合同**：`defineComponent`（名字 + 描述 + Zod props + 渲染器）→ `createLibrary` → `.prompt()` 自动生成系统提示词。模型**只能**输出库里注册的组件——受控渲染，不是任意 HTML。
- **分层**：`@openuidev/lang-core`（无框架：解析、提示词生成、运行时求值；peer 依赖仅 zod `^3.25||^4`，MCP SDK 可选）；`@openuidev/react-lang`（React 渲染器，peer React ≥19）；`@openuidev/react-ui`（自带设计系统的成品聊天 UI，可不用）。
- **事件模型**：`<Renderer onAction={(e) => …}>` 收到结构化 `ActionEvent { type, params, humanFriendlyMessage, formState? }`；`toolProvider`（函数表或 MCP client）处理 `Query`/`Mutation`；`onError` 输出结构化、LLM 可自纠的错误。

## 2. 兼容性判定

### 依赖与运行时：直接匹配

| 项       | OpenUI 要求           | 本仓库现状                  | 判定 |
| -------- | --------------------- | --------------------------- | ---- |
| React    | peer ≥ 19             | 19.2.7                      | ✓    |
| zod      | `^3.25 \|\| ^4.0`     | 4.4.3（base 与各 Story 包） | ✓    |
| 模块形态 | 纯 TS/ESM，无原生依赖 | Deno npm 兼容层             | ✓    |
| MCP SDK  | 可选 peer             | 不需要（函数表即可）        | ✓    |
| 许可证   | MIT                   | MIT                         | ✓    |

### 架构：与引擎纪律同构

引擎的既有铁律恰好就是 OpenUI 需要的宿主形状：

1. **表现层渲染不可变投影、回发语义意图**。OpenUI 渲染产物就是表现层：`onAction` 一对一映射到语义意图 dispatch；`toolProvider` 的 `Query` 映射到发布面（publication）的只读投影、`Mutation` 映射到语义意图。生成的 UI 永远成不了第二个状态权威。
2. **OpenUI Lang 文本是纯数据**。想让"Agent 生成的面板"成为游戏内容（进存档、可重放），把**完整**响应文本经命令原子提交进权威状态即可——解析是纯函数，重放同一文本必得同一 UI。流式中的半截文本则是 UI 瞬态（同打字机 reveal 的地位）。存档仍是纯版本化数据，不含渲染器状态。
3. **LLM 调用是外部边界**。引擎模拟必须确定性；流式请求留在 Host/Story 侧，结果要么完整提交要么不留痕迹——与任何外部 API 的既有规则一致。引擎不需要内置 LLM 客户端。
4. **受控组件库 = 我们的主题与可达性**。自定义 library 把 OpenUI 组件映射到 `@sillymaker/ui` 原语（Button、PanelV1、ProgressMeter…），生成的 UI 自动继承 tokens、焦点环、输入路由与 a11y；跳过 `react-ui` 也就避开了它自带的设计系统与样式冲突。
5. **挂载点现成**：Story slot / overlay 会话 / SillyOS 窗口（一个 "Assistant.exe" 就是天然演示位）。能力门（capability）可以把 Agent 控制台关在 `debug_tools` 或独立能力后面。

### 需要守住的边界

- `Query()` 随 `$variable` 变化自动重取——只许读投影，不许写；写必须走 `Mutation` → 语义意图 → 命令。
- `$variables`/`formState` 是 UI 瞬态；要持久就经命令提交（`initialState` 支持回灌）。
- 半截流式文本不得进权威状态（命令原子性本来就禁止）。
- 集成时依赖**发布的 npm 包**；不从 `references/openui` checkout 复制任何代码。

## 3. 建议的落地路径（如决定做）

1. **Story 层试点（零引擎改动）**：某示例加 `@openuidev/lang-core` + `@openuidev/react-lang` 依赖；定义映射引擎原语的小组件库；一个 overlay/窗口装 `<Renderer>`；`onAction` → `composition.intents`。LLM 流由 Story 自带的 host 适配器提供（开发期可用本地 mock 流验证全链路，不引入网络依赖）。
2. **验证过再抽引擎件**：若多个 Story 复用，抽可选包（例如 `@sillymaker/ui-genui` 桥：ActionEvent→语义意图、Query→投影读、引擎原语组件库预设）。不预先设计。
3. **暂不采用**的部分：`react-ui`（成品聊天壳与自带样式）、`browser-bundle`（CDN 嵌入）、MCP 通路（函数表足够；引擎语义端口本身就是更强的合同）。

## 4. 结论

OpenUI 与 SillyMaker 的分层几乎是镜像的：它的"组件库 = 模型能力边界"对应我们的"语义发布面 = UI 能力边界"；它的 ActionEvent 对应我们的语义意图；它的纯文本 UI 描述对应我们的纯数据存档纪律。版本（React 19、zod 4）与许可证（MIT）均无障碍。**支持它不需要动引擎核心——这正是分层正确的证据。**
