# Agent Session 异步断连收口

状态：**2026-08-30 经所有者显式接受并完成；公共合同、SillyOS 真实消费者迁移、全仓验证与独立终审均已关闭。**

本计划只关闭
[Neutral Agent Session/Run 与 SillyOS Engine Handback](2026-08-30-sillyos-neutral-engine-handback.md)
终审留下的唯一中立 lifecycle 候选：connector 已经 ready、没有 pending call 时，底层连接仍可能异步失效。
它不重开 Agent Host、UiArtifact、Program/Process、Pi、Provider 或 Browser background recovery。

## 1. 权威与合同

- `AgentSessionConnectionV1.whenClosed` 是稳定的一次性 `Promise<void>`。connection 一旦不可再用就 fulfill，
  包括本地预期 `close()`；adapter 不在该信号中编码 Worker、credential、provider、workspace 或恢复原因。
- client 在发布 `ready` 前安装 closed observer，并留出一个 Promise reaction turn；因此 connector 在返回前已
  关闭的 connection 不会短暂谎报 ready。
- 当前 generation 异步关闭时，client 退休 exact connection/generation，发布一次
  `unavailable + agent_session.connection_failed /connection`，并 fence 在途调用和迟到 event。
- 关闭不是 Run terminal。client 不合成 `run_failed`、不清理已接受的 `(sessionId, runId)`/sequence/seen
  identity，也不自动重连；显式 successor 可以继续同一 active tuple。
- reconnect/dispose 先退休 current generation 再调用 `close()`，所以预期关闭信号不产生短暂 failure；旧
  generation 的迟到信号无权改变 successor。异步 `close()` 进入现有 cleanup barrier，应用 dispose 必须等待。

## 2. SillyOS 真实消费者

- Browser Pi connector 的每个 connection 由自己的 deferred `whenClosed` 表达不可用；所有 `closeState`
  路径都 settle，同一 `closed` fence 保证一次性。
- transport-private `onConnectionLost` 旁路已删除。Creator facade 只消费公共 client 的 exact
  `unavailable /connection` snapshot，再拥有产品自己的 credential retirement、facade failure 与 UI recovery
  通知。
- 主动 forget/dispose 在关闭前退休产品 credential owner；fatal record 继续保留 `/sequence` 等精确诊断；
  Workspace Host failure 继续保留 `/workspace/host`。后到的中立 closed signal 不覆盖这些产品事实。

## 3. 明确不做

- 不公开 close reason、Worker error、Provider retry、credential、Workspace、Pi 或产品恢复策略；
- 不自动 reconnect、resume、replay request/tool effect 或合成远端 terminal；
- 不增加第二套 lifecycle framework、service locator、heartbeat、background liveness 或 Agent persistence；
- 不改变 SillyOS 的 Browser 可中断执行与 durable semantic checkpoint 合同。

## 4. 验收门

- pure public connector：ready 后异步 close 只发布一次 `/connection`，不产生 stream terminal；
- already-closed connection：`connect()` 返回 unavailable，观察历史不出现 ready；
- in-flight submit：close 后迟到 resolve/reject 均 superseded，迟到成功不能提交 Run identity；
- successor：旧 closed signal/event 无副作用，active tuple 可在新 connection 延续；
- expected close：reconnect/dispose 不发布 unavailable，async cleanup 被 disposal join；
- SillyOS：Worker error/protocol failure 走公共 snapshot；配置失败、可选 connection test、forget/dispose、
  fatal sequence 与 Workspace Host failure 保持各自既有语义；
- focused tests、typecheck、SillyOS builds、Browser product E2E、全仓 `deno task check`、docs build 与
  `git diff --check` 通过后关闭。

## 5. 关闭证据

- Agent client/public contract 与 SillyOS Worker 的 focused 回归：3 个文件、79 个测试通过；
- `deno task check`：476 个 Vitest 文件、6,232 个测试、6 个 Composition/State benchmark 测试、公共 Mod
  external tarball + Deno/Vite/Chromium consumer smoke、资源校验及全部应用静态检查/构建通过；
- `deno task docs:build`：49 个页面构建通过；
- `deno task test:e2e:examples`：Chromium、WebKit 与 mobile 项目共 120 个通过、3 个按既有条件跳过；
- `deno task typecheck`、`deno task lint` 与 `git diff --check` 通过；
- 两轮独立终审均无 blocker：代码审查确认 currentness、cleanup barrier、Run authority 与 SillyOS
  单权威迁移；文档边界审查确认公共面未泄漏 close reason、Worker、Pi、Provider、credential、Workspace
  或产品恢复策略。

本计划至此关闭。没有自动激活 Agent Host、UiArtifact、Program/Process、后台恢复或自动重连后继。
