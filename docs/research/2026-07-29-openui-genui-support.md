<!-- SPDX-License-Identifier: MIT -->

# OpenUI（Generative UI 开放标准）与 SillyMaker 的兼容性调研

日期：2026-07-29。输入：`references/openui`（thesysdev/openui，MIT，revision `5266f735`，登记见 [reference-register.md](reference-register.md)）。

问题：**Agent 动态生成 UI 的 OpenUI 标准，我们的引擎能支持吗？**

结论：**OpenUI Lang/Renderer 可以干净地接入 SillyMaker 的 Presentation/Host 边界；Story 级受控渲染试点不需要修改 Base simulation。** 面向正式 Agent 产品的持久 Conversation、不可变 Artifact revision、Workspace 恢复和工具权限网关则是新的应用域设施；它们不属于 GameSnapshot，也不能由 OpenUI Renderer 自动提供。

## 1. What OpenUI is

- **OpenUI Lang**：面向 LLM 输出的紧凑行式语言（`id = Component(args)`），支持流式解析、前向引用、响应式 `$variable`、`Query()`/`Mutation()`、Action plan 与内建函数。本次参考的语言规范为 v0.5。
- **组件库即渲染合同**：`defineComponent`（名字、描述、Zod props、renderer）组成 library，模型提示词只枚举已注册组件。模型只能构造注册组件和受限数据 props；这限制渲染面，不自动限制 action、tool 或 Host 权限。
- **包分层**：本次 revision 的 `@openuidev/lang-core@0.2.10` 负责 parser/prompt/runtime，`@openuidev/react-lang@0.2.9` 负责 React Renderer；npm 包版本与 OpenUI Lang v0.5 语言版本不是同一轴。
- **交互**：Renderer 支持本地状态、Action plan、Query/Mutation tool provider、`onAction`、`onStateUpdate`/`initialState` 与结构化错误。

## 2. Dependency fit

| Item         | OpenUI reference requirement         | Repository                              | Result     |
| ------------ | ------------------------------------ | --------------------------------------- | ---------- |
| React        | `^18.3.1 \|\| ^19.0.0`               | 19.2.7                                  | compatible |
| Zod          | `^3.25.0 \|\| ^4.0.0`                | 4.4.3                                   | compatible |
| Module shape | TS/ESM, no native runtime dependency | Deno npm compatibility                  | compatible |
| MCP SDK      | optional peer                        | function provider is enough for a pilot | optional   |
| License      | MIT                                  | MIT                                     | compatible |

集成时消费正式 npm Artifact，不从 `references/openui` checkout 复制代码。当前兼容判定只说明依赖可安装，不等于 SillyMaker 已提供 OpenUI package、Agent backend 或生产权限系统。

## 3. Architectural fit

OpenUI 适合作为非权威 presentation document：

```text
domain or gameplay authority
  -> immutable publication / authorized data Artifact
  -> OpenUI program + pinned component/tool contracts
  -> derived render target
  -> React UI
  -> validated Host or semantic intent
```

这与 SillyMaker 的 Simulation → SemanticPublication → Presentation → renderer 流向相容：

- OpenUI program 是可序列化输入，不是 live React tree；
- component library 是 allowlisted renderer catalog；
- Query 可以读取窄、player-safe publication DTO；
- gameplay/product 写入仍由原有 Session 或产品 domain command authority 提交；
- streaming、loading、focus、layout 与 Query cache 都不成为第二权威。

但“同一 OpenUI 文本必得同一 UI”不成立。解析还依赖 language/parser 与 library schema；逻辑渲染依赖 component implementation 和 tool contract；Query 依赖当前数据；精确视觉还依赖 theme、assets、fonts、locale 和 build identity。

## 4. Action, Query, and Mutation boundary

OpenUI v0.5 的主要路径不是统一的 `onAction -> semantic dispatch`：

```text
Query() / @Run(Query)
  -> Renderer runtime
  -> toolProvider
  -> read-only Query gateway

@Run(Mutation)
  -> Renderer runtime
  -> toolProvider
  -> Mutation policy gateway
  -> semantic command or product-domain command

@ToAssistant / @OpenUrl / custom or legacy action
  -> onAction
  -> conversation continuation, navigation, Presentation or Host intent

@Set / @Reset
  -> local OpenUI state
```

### Read path

Query gateway 只能提供明确 allowlist 的只读 DTO，不能暴露 raw State、GameQueries、Snapshot setter、database client 或 Host handle。工具需要参数/结果 schema、超时、并发、刷新频率、结果大小和取消预算。

### Write path

Mutation gateway 至少负责：

- exact tool-name and argument schema；
- user/tenant authentication 与 capability/ACL；
- sensitive operation preview/confirmation；
- idempotency key、expected revision/occurrence 和 concurrency control；
- semantic/domain dispatch；
- result schema、receipt 与 audit。

OpenUI 的函数表本身不是权限边界；prompt 中把工具标为 read-only/destructive 也不等于 runtime enforcement。本次参考实现的 Query 和 Mutation 最终都按 tool name 调用同一 provider，provider call 本身不携带“这次来自 Query 还是 Mutation”的可靠授权上下文。

因此安全试点应二选一：

1. `toolProvider` 只提供只读 Query；写操作由窄包装组件的 allowlisted action 经独立 semantic adapter 完成；
2. 在把完整 program 交给带写工具的 Renderer 前先独立 parse/preflight，验证 `Query name ∈ readSet`、`Mutation name ∈ writeSet`，再构造冻结、最小化的 provider。

不得把未经完整授权预检的模型流直接交给带写工具的 live Renderer。流式预览可以使用无工具或只读 provider；Mutation 只在完整文档验证、用户交互和 gateway policy 后执行。

`onAction` 的参数同样是不可信外部数据。自定义 action 先过 exact schema/allowlist；`@OpenUrl` 由 Host 校验 scheme/domain/navigation policy，不直接执行任意 URL。

## 5. Durable UI model

正式 Agent 产品不应把原始模型响应塞进 GameSnapshot。概念持久模型：

```text
UiArtifact
  artifactId
  headRevisionId

UiArtifactRevision
  revisionId / parentRevisionId
  sourceConversationId / sourceMessageId
  complete materialized OpenUI program + digest
  OpenUI language revision
  lang-core / react-lang / SillyMaker adapter identity
  component library contract + schema/renderer digest
  tool catalog contract + schema digest
  data mode and immutable DataArtifact references

MessageUiRef
  messageId -> exact revisionId
```

对语义重放至少钉住 language、parser/adapter、component library 与 tool contract。若产品承诺视觉复现，还要钉住 renderer/theme/assets/locale/build identity。

Conversation 中的历史消息固定到当时的精确 revision。Workspace 中“当前打开的 Artifact”可以显式选择 follow head；两者不能用一个可变指针混淆。

OpenUI 自身把 thread storage 与 artifact storage 分开，这是正确方向；其可变 `ArtifactStorage.update(content)` 仍不足以直接承担 SillyMaker 需要的 immutable revision、compare-and-swap 和历史引用合同。

## 6. Four state categories

`$variables`/formState 不应一概称为瞬态。OpenUI 支持宿主通过 `onStateUpdate` 保存，并用 `initialState` 回灌。SillyMaker 应按语义分类：

| Category                  | Examples                                                                                         | Owner                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------- |
| Durable business/Artifact | Conversation message、immutable UiRevision、DataArtifact、Mutation receipt、正式领域写入         | Conversation/Artifact/domain repository |
| Recoverable Workspace     | window position/open/minimized/pinned、tab/filter/selection、`$variables`、formState、可选 draft | Workspace/Host repository               |
| Derived cache             | parsed render target、validated component tree                                                   | rebuildable cache                       |
| Ephemeral                 | stream chunk、partial AST、skeleton、in-flight/query cache、optimistic state、hover/focus/drag   | renderer/runtime only                   |

“跨 reload 恢复”不等于“进入 gameplay authority”。Game Save 继续只保存 GameSnapshot；正式 Agent GUI 需要独立的 Conversation/Artifact/Workspace repository，而不是把全部数据塞进 Save 或 settings。

恢复 OpenUI local/form state 时必须同时匹配 `revisionId + sourceDigest + state schema`。不兼容时丢弃可恢复 UI state 并诊断，不能把旧字段盲目回灌到新 program。

## 7. Live dashboard vs snapshot report

- **Live Artifact**：每次访问按当前主体/租户重新授权并 Query 当前数据；同一 UiRevision 日后显示新数据是明确的产品语义。
- **Snapshot Report**：同样在每次访问时重新做 artifact-read authorization；授权后读取 immutable `DataArtifact` 的固定字节。它记录 `asOf`、schema revision、digest 与 provenance，但创建时 ACL 不是绕过以后撤权的永久 grant；重开历史消息不得重新生成或改写数据。

Mutation 结果以 receipt 留痕。重放 UiRevision 永远不重新执行 Mutation。不可见的历史 UI 也不应在后台自动刷新 live Query。

## 8. Incremental editing

OpenUI 的 `mergeStatements` 负责按 statement name 合并文本，不提供持久化事务或并发控制。SillyMaker 侧的编辑协议应为：

1. 编辑请求携带 `baseRevisionId + baseDigest`；
2. streaming patch 只形成 draft，不执行工具、不移动 Artifact head；
3. 完成后与 base 合并为完整 materialized document；
4. 按 pinned library/tool catalog 做 strict parse、schema、allowlist、深度/大小/Query budget 校验并 canonicalize；
5. 对 head 执行 compare-and-swap；冲突时显式 rebase/branch，不做 silent last-write-wins；
6. 原子创建新的 immutable UiRevision；
7. 持久化完整 materialized document；patch 只保留为 audit evidence。

编辑器产生的 UI 变化同样先留在 Draft。用户 Apply/Save 后才产生项目 revision 或 Artifact revision。

## 9. Component and preview security

受控 OpenUI document 只能构造已注册的窄包装组件。不要把原生 React/native props 整包暴露给模型；`style`、`className`、event handler、raw HTML、任意 URL 和任意 children 默认不在 schema 中。

使用 SillyMaker primitives 可以继承 theme token、focus ring 和部分 native accessibility；input context、modal focus ownership、label/error semantics、keyboard/gamepad parity 与 axe coverage 仍需 adapter 明确实现和测试。

Agent 生成的任意 HTML/JavaScript/React 是另一类 **Code Artifact**，应在独立 origin 或严格 sandbox iframe 中预览：

- 不直接访问 parent DOM、GameSession、Host ports 或 storage；
- versioned `postMessage`/RPC allowlist；
- CSP、network/navigation/download policy；
- CPU/memory/output budget 与 dispose/kill；
- 未审查代码不能自动成为产品 UI 或 Mod。

通过 source review、tests、build 与 release 后，代码才可提升为 trusted Mod。

## 10. Relationship to Mod

OpenUI adapter、component library、tool gateway 和 window integration 可以成为 trusted first-party/optional Mod，主要贡献 presentation/Host/tooling facets。

Agent 生成的 OpenUI program 是 `UiArtifactRevision`，不是 Mod。Application bootstrap 时冻结 Mod 提供的 component/tool catalogs；运行中可以创建新的 Artifact revision，但不能动态注入新的 executable component/tool code。新代码需要更新 Mod 并 rebootstrap。

缺少 OpenUI presentation Mod 时，相关 Artifact 应显示 missing renderer/tool-contract diagnostics 和安全 fallback；presentation 缺失本身不证明 GameSnapshot 已损坏。

详见 [Mod design](../engine/design/mod-system.md)。

## 11. Adoption path

1. **Story-level rendering proof**：使用发布 npm 包、小型 wrapper component library、本地 mock stream、只读或无工具 provider；验证 streaming、invalid program、fallback、a11y 和 semantic action。
2. **Permission proof**：独立 Query/Mutation allowlist、preflight、confirmation/idempotency/receipt；不复用 `debug_tools` 作为生产认证。
3. **Artifact proof**：实现 UiArtifact/UiRevision、Conversation pin、Workspace recovery、snapshot/live data 与 incremental-edit CAS。
4. **Reusable Mod**：至少两个产品消费者证明相同 adapter/contract 后，才抽 first-party OpenUI Mod。
5. **Code preview**：若 Agent 产品确实需要任意前端预览，再实现隔离 Code Artifact Host；不与 OpenUI renderer 混为一体。

## 12. Conclusion

OpenUI 证明 SillyMaker 的 Simulation/Presentation/Host 分层适合承载 Generative UI：受控文档和组件 library 可以进入表现层，授权后的意图继续走既有领域边界。

它不证明 Conversation、Artifact、权限和 Workspace persistence 已经属于游戏 Session。Story 级试点可以零 Base 改动；正式、可长期重放的 Agent GUI 仍需要独立产品合同，并与 GameSnapshot 保持分离。

参考：

- [OpenUI Lang v0.5 specification](https://www.openui.com/docs/openui-lang/specification-v05)
- [OpenUI interactivity](https://www.openui.com/docs/openui-lang/interactivity)
- [OpenUI queries and mutations](https://www.openui.com/docs/openui-lang/queries-mutations)
- [OpenUI incremental editing](https://www.openui.com/docs/openui-lang/incremental-editing)
