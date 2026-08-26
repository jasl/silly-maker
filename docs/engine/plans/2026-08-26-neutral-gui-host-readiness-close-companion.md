# Neutral GUI Host Readiness、Close 与 Optional Desktop Companion V1 实施计划

状态：**2026-08-26 经所有者接受；M0–M2 已交付关闭。**

[Production-floor sequence](2026-07-30-production-floor-sequence.md) 是唯一跨计划排序入口。
本文直接记录这个小型切片的目标合同、顺序和验收，不另建 proposal、治理系统或通用 lifecycle
framework。它领取 roadmap 已确认的跨应用 readiness 缺口，为下一 Reference Product 提供中性
GUI Host 地板；产品实现不属于本计划。

## 1. 当前缺口与所有权

`startWebGuiApplicationV1` 已提供 Browser/Deno Desktop 共用的静态 shell、首个 React product
commit、Host、Viewport 与 Input，但当前仍有两个诚实性缺口：

- GUI binding 完成后无条件报告 required domain ready；产品依赖的数据库或外部服务无法把自己尚未
  ready、unavailable、retry 后 ready 的状态接入 Host readiness；
- Deno Desktop GUI 安装的是空 `fence` 与立即 resolved 的 close flush。Shell 只能在该回执后
  停止 private HTTP ingress 并等待**已经发出**的 Host request；产品尚未发起的 debounce write、
  pending transaction 或 async companion drain 不能参与回执。

Game entry 已有自己的 Session invalidation + exact autosave flush，本计划不修改或泛化 Game
Session/Persistence。GUI 产品的数据与外部服务生命周期由 application owner 明确选择；Host 和
Desktop adapter 只执行其各自的平台责任：

```text
application-owned readiness / close preparation
  -> renderer close receipt
  -> Desktop Host stops private ingress and drains active requests
  -> optional Desktop companion graceful stop
  -> native process exit
```

## 2. 接受的 V1 合同

### 2.1 Required readiness 是一个 application-owned latch

- GUI application 可以选择一个 required-readiness latch；未选择时保持当前静态 GUI 的自动 ready。
- first product commit 与 required ready 仍是两个独立信号。产品 recovery/configuration UI 可以先
  render、可交互，而 required ready 保持 pending；外部服务第一次真正可用后只把 latch 推进到
  ready 一次。
- recoverable unavailable、配置和 retry 状态由产品 UI/typed client owner 持有；它们不触发整棵
  React root 卸载，也不把网络波动伪装成 plugin/provider loss。动态连接状态仍是产品状态，latch
  只表示本次 application generation 首次满足 required-domain readiness。
- readiness 不进入 State、Snapshot、Save、digest、replay 或 BuildIdentity。V1 不建立多服务
  registry、依赖图、权重、超时、自动重试或 service locator。

### 2.2 Close 只有一个 product-selected participant

GUI binding 可以返回一个可选 close participant，语义固定为：

- `fence()` 同步、幂等地停止新的产品 mutation、job、write admission 和 companion submission；
- `prepare()` 在 fence 后运行，可异步等待应用自己的 pending database writes、typed RPC drain 或
  companion graceful close；失败后允许下一次明确 close 再试；
- Desktop renderer 只有在 `prepare()` resolve 后才发布 `flushed`。同步异常或 rejection 发布
  `failed`，native shell 保持窗口、private server 和 ingress 存活，不用 timeout 转成强制退出；
- 没有 participant 的无状态 GUI 继续获得即时回执。引擎不自动枚举数据库、RPC client、Mod、
  Extension 或 React descendant；需要多个内部资源时由产品聚合成这一个 participant；
- V1 只把该 participant 接入 native Desktop receipt。现有 explicit application disposal 仍是
  deterministic resource cleanup，Browser `pagehide` 仍不宣称浏览器会等待异步 durable work；不得
  为统一三个终止源再建 terminal coordinator。产品需要更强 Browser unload 语义时必须另有可验证的
  平台合同。

现有 private renderer bridge 的 requestId、`preparing | flushed | failed` 与 shell fail-closed
语义保持不变。`ApplicationHostCapabilitiesV1` 不增加 close registry：Host record API 继续只保证
一次 admitted request 的原子/CAS 语义，Desktop server 继续只 drain 已经开始的 request。

### 2.3 Optional Desktop companion 是私有平台适配，不是产品插件 API

- Deno Desktop preview 可以由 build-known application target 显式选择**最多一个** package-private
  companion definition；普通 Browser/renderer final graph 不包含该 implementation，无 companion
  Desktop 不启动 child、也不注入 connection bootstrap。
- Desktop Host adapter 只拥有这个 direct child 的 start、一次 bounded launch result、graceful stop
  和 exit observation。renderer 只取得 admitted typed connection/bootstrap data，不取得
  `Deno.Command`、`Deno.ChildProcess`、PID、signal 或任意 subprocess handle。
- companion availability 进入 §2.1 的产品 readiness；renderer/client drain 进入 §2.2 的产品 close
  participant。renderer 回执与 private Host request drain 完成后，Desktop shell 才等待自己直接持有的
  companion graceful stop；失败不伪造成功退出。
- 不扫描 `/bin/ps`，不发现或终止孙进程，不建立 PID/PPID/lstart/currentness、SIGKILL、进程树清理、
  daemon supervisor 或多 companion registry。若真实 companion 自己产生后代，其生命周期是该
  companion 的产品责任。
- 这不是为 Deno HMR 建的 external Vite/proxy/native shim。它不提供 source update、module
  generation 或 publication handoff，也不改变现有 Desktop-dev adapter。

### 2.4 三条正交路径

| 路径                             | 本计划拥有                                                                                                      | 本计划不拥有                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Browser external-service interop | 产品用浏览器适用的 admitted config 创建 typed RPC/service client；使用同一 readiness latch 与 close participant | 启动本地进程、Browser subprocess API、任意 provider discovery                     |
| Deno Desktop preview             | 现有 static shell/private routes，加一个显式、最多一个的 package-private direct companion owner                 | persistence/signing/multi-platform production promotion、通用进程管理             |
| Desktop HMR stable defer         | 只保证新 readiness/close 合同不依赖 HMR，未来 stable revalidation 可复用中立测试                                | 启用 maintained Desktop HMR、猜测 `2.9.6`、canary promotion、Vite proxy/shim/fork |

Browser external service 不因没有本地 companion 而降级；Desktop product companion 也不等待 stable
HMR。首个经 source/behavior 确认包含目标路径的 Deno stable 仍须按既有 gate 独立 revalidate 后，
才能启用 maintained Desktop HMR workflow。

## 3. 里程碑

### M0 — Neutral GUI readiness + close

- 为 focused `@sillymaker/web/gui-application` 增加 §2.1 的一个可选 readiness latch 和 §2.2 的一个
  可选 close participant；公共形状保持小而正交，不复制 Game composer/terminal supervisor；
- 让 first product commit 可在 readiness pending 时成立；ready 只由当前 application generation 的
  latch 推进一次。无 latch 的 GUI byte/behavior baseline 不变；
- Desktop close bridge 接入真实 product fence/prepare，不再把所有 GUI 硬编码成 no-op；无 participant
  分支仍显式可测；
- 保持 explicit dispose/pagehide 的既有 cleanup 合同；同步 fence、异步 preparation、失败回执和
  retry 不通过 descriptor/exact-object 防御或新的 terminal coordinator 实现；
- focused tests 覆盖 pending → ready、先 render recovery 再 ready、无 latch 自动 ready、
  `fence -> prepare -> flushed`、held prepare、rejection/重试、无 participant，以及 native close 与
  dispose/pagehide 的诚实差异。测试只看可观察信号和调用边界，不建内部对象/DOM inventory。

### M1 — Optional Desktop single companion preview

- 在 tooling-owned private Desktop assembly 中增加显式的单 companion selection；未选择路径零行为
  变化，renderer/public Web API 不暴露 subprocess；
- launch input 只在 Desktop 启动边界 admission 一次，之后 shell 信任 typed representation；
  bounded launch result 只携带连接所需的产品数据，不成为通用 IPC、环境变量或命令执行 API；
- shell 拥有 direct child，按 renderer preparation → private Host drain → companion graceful stop →
  exit 的顺序关闭。任何一步失败均不发布更强成功；不得以强杀和进程扫描补“全自动清理”；
- Browser path 不 import Desktop companion implementation；无 companion Desktop 的 static
  packaging/close 行为保持成立。本里程碑只宣称 preview adapter，不宣称 production
  durability、packaging、signing 或跨平台资格。

### M2 — Neutral conformance、final-graph evidence 与 handoff

- 扩展 tooling-owned GUI-only conformance fixture，而不是 SillyOS、Pi、Cat Cafe 或下一个 Reference
  Product：用小型 deferred owner 证明 first commit/readiness 和 close barrier；
- Browser Chromium/WebKit 只证明外部服务可晚 ready、unavailable UI 仍可操作、retry 后 ready，且
  无 Desktop process owner；Desktop focused tests/一个有界 preview smoke 只证明显式单 companion
  start、admitted connection handoff、normal close/drain/direct-child exit。native smoke 不重演完整
  RPC、Agent、State、CAS 或 DOM matrix；
- final dependency evidence 证明 Browser GUI/renderer 不含 Desktop companion implementation，且
  no-companion Desktop 没有 launch/bootstrap 行为；普通 GUI 继续排除 Game/Story/Save/Agent/Mod/
  Inspector owners。不冻结完整模块清单或 shell 文件 inventory；
- 实现完成后同步 live handoff：
  - `docs/engine/architecture.md`：Application/Web/Tooling ownership、单 participant 与单 companion；
  - `docs/engine/features.md`：GUI readiness/close 的真实能力及 Desktop preview 限制；
  - `docs/engine/development.md`：Browser external service 与 Desktop companion 的选择/验证 recipe；
  - `docs/engine/roadmap.md`：本切片 closure 与仍独立的 public ABI/production/HMR gates；
  - `AGENTS.md`：current lane closure、package ownership、验证结果和不得扩张的边界；
- 运行 focused Web/Tooling tests、GUI-only Chromium/WebKit E2E、受影响 build/final-graph evidence、
  `deno task check`；若改 React/TSX，按规则运行 React Doctor advisory。完成 owner review 后更新
  production-floor 为关闭，才交还下一 Reference Product。

## 4. Non-goals

- public subprocess/process Host API、公共 companion/Agent/RPC/Mod ABI、SDK、provider registry、DI
  container 或 service locator；
- Pi、真实 LLM/backend、OpenUI/A2UI、数据库产品、SillyOS 或任何 Reference Product fixture；
- 多 companion 编排、动态发现/安装、process scanning、孙进程治理、PID fencing、SIGKILL、watchdog、
  timeout force-exit 或 durable evidence/report framework；
- 新 RPC wire protocol、通用消息 DSL、远端 effect rollback、任意网络/文件/DOM authority；
- Game Session/Persistence 重写、State/Save/digest/replay 变化、public Mod 激活；
- Deno Desktop HMR、source-write、persistence durability、packaging/signing 或多平台 production
  promotion。

## 5. Stop conditions

出现以下情况才暂停请求 owner 裁决：

- 需要把任意 subprocess handle 暴露给 renderer/public product code，或需要超过一个 companion；
- 必须创建第二个 HTTP/Vite proxy、Deno shim/fork 或依赖未文档化 HMR marker；
- 必须改变 public Host record、Save/wire/digest/replay、Game disposal 或 Desktop close receipt protocol；
- 无法在不扫描/终止进程树、不建立 registry/framework 的情况下让 direct child 正常退出；
- 中立 fixture 无法复现，只能以 SillyOS、Pi 或真实服务作为 engine acceptance authority。

普通命名、内部文件组织、最小 typed launch-result 形状和测试注入方式采用最简单可验证方案继续，不形成
新的 open-question ledger。

## 6. Closure record（2026-08-26）

M0 交付了同步 UI 构造之外的一个 application-owned required-readiness Promise，以及一个
product-selected `fence()` / `prepare()` close participant。前者只 gate required-domain receipt，后者
只参与 Desktop native-close；无选择路径保持原有即时 ready / 即时 close。Host 没有新增 service 或
close-hook registry，Game Session/Persistence、State、Save、replay 和 BuildIdentity 均未改变。

M1 交付了 build-known、exact-target、最多一个的 Desktop companion preview。只有选中的 package 才
stage artifact、private Host、companion include 和 unscoped `--allow-run`；默认 package 只有 inert config，
没有 artifact、Host implementation、child 或 subprocess permission。private Host 从 compiled VFS 将
artifact 直接复制到 application user-data 的随机物理路径，启动自己唯一的 direct child，只接受一行
不超过 1,024 bytes 的 `{ revision: 1, port }` JSON receipt，并通过既有 exact-origin/capability admission
代理固定 `/sillymaker/companion/*` HTTP namespace。renderer 看不到 path、PID、signal、Command 或
ChildProcess，产品仍拥有 RPC schema、stream、retry、readiness 和响应消费。单个已取消请求可以退出
receipt 等待而不取消共享 child；close 只按 renderer preparation → Host drain → stdin EOF → exit 0
推进，不扫描或强杀进程树。

Deno 2.9.5 对运行期才从 compiled VFS 物化出的随机绝对路径无法使用启动时解析的 scoped
`--allow-run=<name/path>`，因此 selected preview 明确承担 unscoped permission；这没有被写成生产安全、
签名、持久化或跨平台资格。Desktop HMR 的 verified-stable revalidation/activation defer 原样保留，
Browser external-service client 也不依赖本地 companion。

M2 以 tooling-owned GUI-only fixture 证明 recovery UI 先可用、Host 保持 starting、retry 后首次 ready；
Chromium 与 WebKit 各通过一条真实用例。final-graph evidence 继续证明普通 Browser GUI 不包含 Desktop
companion port，no-companion packaging 测试证明没有 Host/artifact/`--allow-run`。一次 disposable Deno
2.9.5 native smoke 在物理源 artifact 移走后，从 compiled VFS 完成 copy、POSIX executable materialize、
direct-child launch、bounded receipt、HTTP proxy、stdin EOF、exit 0；临时 smoke 随后移除，没有形成长期
harness。

最终验证通过：focused Web/Tooling 8 files / 96 tests；GUI-only Chromium/WebKit 2 tests；完整
`deno task check` 的 format/lint/styles/typecheck/determinism、378 files / 5,407 unit tests、6
composition benchmarks、assets、全部 application checks 与 release build。React Doctor 扫描 21 个
变更文件，没有 React/TSX 问题；唯一 generic advisory 是 cold packaging path 对最多五个 exact target
artifact 的顺序 preflight，保留其确定性诊断顺序而不为消除告警引入并发编排。
