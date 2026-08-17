# Experimental composition kernel and State Runtime

状态：2026-08-18 接受为独立分支上的 strangler experiment。工作分支是
`codex/experimental-cordis-state-runtime`；它不替换已交付 production floor，也不把
Incubation Mod 设计提前变成公开 ABI。X0 基线已完成，当前实现入口是 X1。

本实验要回答两个问题：SillyMaker 能否用一个可逆、可诊断的 composition kernel 组合
能力；能否把唯一权威 Session 从游戏命名中抽成中立 State Runtime，同时保持 State、
Save、digest、replay 与原子事务语义。成功路径是逐步绞杀现有组合根，不是一次性重写。

## 1. 决策与边界

### 1.1 三个互不替代的层

```text
Composition Kernel (cold path)
  plugin/profile/service/registry/scope/reversible lifecycle
                    |
                    v compile and freeze
State Runtime (hot path) ---------> Effect Broker
  one State/Session/queue/log         Host/LLM/network/database + receipt
```

- `@sillymaker/composition` 是 SillyMaker 唯一的 plugin façade。Story、公开 API、command、
  reducer、selector 与 frame path 不得导入 Cordis 类型。
- `@sillymaker/state` 拥有中立命名：`StateRuntime`、`StateSession`、`StateSnapshot`、
  `StateModule`、`StateTransaction`。X4 先适配同一个现有 Session composition；不得保存第二份
  State、digest、status，不得创建第二条队列或 CommandLog。
- Effect Broker 只负责不可逆或需 receipt 的 Host/LLM/network/database 操作。Cordis disposer
  只撤销 listener、subscription、timer、connection handle 等进程内 effect，不能声称撤销已发生
  的外部写入。

Composition activation 是冷路径：先校验依赖、重复 provider 与环，再按稳定顺序 mount，最后
编译为冻结的直接函数/对象表。Session 创建后 authoritative plan 冻结；命令与渲染热路径不再
访问 Cordis Context、Proxy 或 registry。Studio/presentation/tooling 使用另一个 live root，能以
“新 profile 完整 mount -> 原子换入 -> 旧 profile dispose”的方式 reload，不能反向卸载
authoritative module。

### 1.2 Cordis vendor

实验 vendoring 以 Cordis core `4.0.0-rc.8`、commit
`8cc9e33fab69e2d0476d126baaf2acb24e6a6ab4` 为输入，复制完整九个 core source 文件而不复制
loader/HMR/CLI 等 Node-only workspace。相对 import 改为显式 `.ts`，类型 import 使用
`import type`；只由 `@sillymaker/composition` 依赖。`vendor/cordis/LICENSE` 保持原 MIT 文本，
普通第三方声明进入现有 `NOTICE`。不创建 upstream history、来源数据库、自动同步或递归扫描工具。

rc.8 的 reentrant setup/cleanup、unload 期 effect 注册、publication failure ownership 与
`Fiber.update()` awaitability 存在可复现缺口。第一版 façade 不使用 `Fiber.update()`、
`internal/plugin` listener 或 Cordis reactive service lookup，并串行化 mount/reload/dispose；
public scope 在 setup 完成后关闭、unload 开始后拒绝注册，setup 失败由 façade 先回滚其已登记
effect。这样缺口不可达，同时保持最小 vendor diff。若后续真实 consumer 必须放宽这些约束，
先以行为测试重现，再在 rc.8 上做最窄修复；不整棵复制基于 rc.7 的参考 fork。

### 1.3 State、identity 与兼容基线

X1–X4 的 legacy profile identity 只用于 boot audit/诊断，不进入
`BuildProvenance.resolved.simulationDigest`。否则即使 State 与 Snapshot 相同，Save envelope bytes
也会变化，无法证明兼容 facade 没有改变持久化语义。

X5 的 module plugin 复用现有 `GameplayModuleDescriptor` 的 ID、revision、slot 与 dependency
身份；不额外叠加同义 blocking identity。只有显式进入 State Format V2 时，才允许新增或更改
blocking simulation identity，并必须同时提供迁移计划。

State module 把 owned state、schema、operation、selector 与 migration 放在同一目录。它不能
导入 root State、application、presentation 或另一 module 的 internals。跨 module 行为是 workflow，
通过公开 module operation 在一个 State transaction 内完成。scene、motion、character、dialogue
line 与内容行仍是数据，不是 plugin。

## 2. X0 基线

锚点：SillyMaker `55fc9f80`；外部 workload `bb9404c`。SillyMaker 基线使用 Deno 2.9.5、
V8 15.0 与 TypeScript 6.0.3；实验开始后 development dependencies 已升级到当日最新正式版，
Cordis 本身只能使用其最新的 `4.0.0-rc.8` prerelease。

主仓基线：

- `deno task check`：299 个 test files、4,970 tests、五个 Story check 与 Engine Lab build 通过；
- committed command 每次做一次 whole-Snapshot canonical digest，rejected/faulted 为零次；旧的
  “四次 digest”审查结论已经失效；
- 100k single-owner commit p50 168.57 ms，cross-owner p50 187.25 ms；
- Engine Lab composition entry 1,150,353 raw / 275,094 gzip bytes，all JS 1,453,475 raw /
  369,251 gzip bytes；
- React Doctor `0.9.12` full scan：score 58，24 errors、207 warnings、110 files。该结果是待人工
  分类的工具信号，不是自动修改清单。

外部 workload 基线：

- tracked TS/TSX 128 files、67,851 physical lines；`src/**` 119 files、66,982 lines；
- `rules.ts` 4,320 lines / 485 exports；`ImoutoNightStateV1` 108 fields；
- 全静态图 390 edges，其中 191 cross-domain；最大 cross-domain SCC 49 files；
- 去掉 type-only edges 后 `game/story` runtime SCC 为零，所以 X6 的目标是编译、认知和改动
  locality，不把它误报为 ESM 初始化故障；
- clone 的 `file:` 依赖与 `node_modules` 当前 realpath 指向
  `/Users/jasl/Workspaces/tavern_game/engine`。它在 X0 恰好也是 `55fc9f80`，但后续实验必须先把
  隔离副本/分支显式指到本工作分支并核验 realpath，才能作为回归或性能证据。

原始性能与扫描 JSON 只写 OS temp 或已忽略的
`tmp/experimental-cordis-state-runtime/**`，不提交机器结果或商业源码 inventory。主仓只提交
命令、聚合指标、阈值与一个 workload revision。

## 3. 实现顺序与验收

### X1 — Cordis vendor and façade

- vendor core、许可与私有 workspace manifest；
- `@sillymaker/composition` 提供 plugin、typed service token、registry token、profile、scope、
  deterministic snapshot/plan 与 mounted lifecycle；
- preflight 缺失 dependency、重复 exclusive provider、重复 registry entry 与依赖环；
- mount failure 原子回滚；重复 mount/dispose 不遗留 contribution/listener/effect；
- Deno headless、Vite/browser bundle 与 public-declaration leak tests 通过。

### X2 — Legacy application profile

- 用一个 legacy application plugin 包住当前 resolved application/host composition；
- 反转 plugin 声明顺序产生相同 plan identity 与直接 execution plan；
- command loop 前后 Cordis lookup/activation count 不变；
- State、Snapshot digest、Save round-trip 与 replay bytes 与无 kernel 路径等价。

### X3 — Live Studio/tooling profile

- authoritative 与 live root 分离；live profile 原子 reload，失败保留旧 snapshot；
- reload 后 authoritative plan、revision、Session 与 digest 不变；
- timer/subscription/listener 全部有 disposer，cleanup failure 形成诊断且不阻断 sibling cleanup。

### X4 — Neutral State Runtime façade

- 新增 `@sillymaker/state` 根入口及明确的 legacy adapter 子入口；
- `createStateSession` 复用现有 `GameSession` 的一个 snapshot、queue、log、runtime control；
- Persistence import/load/migration 仍通过同一个 runtime control 做原子 replacement，并更新同一个
  replay anchor；
- public consumer 不导入 Base GameSession 或 Cordis 也能 typecheck；legacy consumer 保持可用。

### X5 — Module/workflow pilot

主仓使用完全原创的中性 fixture：`calendar`、`inventory`、`actor`、`evening` 四个 module 与
`use-evening-supply` workflow。它证明跨 module operation 在一个 transaction 中成功或完整回滚，
不复制商业名称、文本、数值或实现。

外部 workload 选择现有最窄的 `imouto.tea.brew`，而不是重置 108 fields 且触及更多领域的 sleep。
接入时保持 `imouto.night`、`simulation.night`、全部 108 fields、Save slot 与 command identity，
并用其现有 night-loop、Save/replay 测试做等价验证。四个 pilot module 必须从集中式
`modules.ts/state.ts/rules.ts` 依赖闭包中真实收口；“已有 module/transaction 被重新包一层”不算成功。

### X6 — Night/narrative locality

- 清除全静态图中的 `game/story` cross-domain SCC，不增加 runtime SCC；
- module 目录不导入 root State、presentation/application 或别的 module internals；
- `rules.ts` 直接依赖者与目标 workflow 改动闭包显著下降；
- 若只是移动文件或改 barrel、49-file SCC 和改动闭包不变，则停止并撤回抽象。

### X7 — Optional State Format V2 and performance

只有 X5/X6 等价与 locality 均达标才开启。先测直接 plan 的稳定 command 开销；同机、同 Deno、
预热、交错多轮中位数超过旧路径 10% 时停止。Format V2 必须有明确 module-keyed schema、迁移、
Save/replay identity 与 corpus，不能与 façade migration 混做。

### X8 — Effects, OpenUI and i18n

先定义 Effect Broker request/receipt 与 replay policy，再接 Host/LLM/network/database。OpenUI、i18n
与 presentation plugin 只消费只读 State projection/receipt，不获得 authoritative writer。任何已发生
外部 effect 都不能靠 Cordis unload 假装回滚。

## 4. 全局 stop conditions

出现以下任一项就暂停相应切片，不以“实验性”绕过：

- 两个 State writer、两份 digest/status、两条 authoritative queue 或两套 CommandLog；
- Save/replay 不兼容且没有明确 migration/identity 边界；
- Cordis Context/Proxy lookup 进入 command、reducer、selector 或 frame hot path；
- Cordis 类型出现在 Story 或任一受支持 package declaration；
- 同机配对基准连续确认稳定 command median overhead 超过 10%；
- X5 后 dependency locality 与目标 workflow 改动闭包没有改善；
- module 需要 root State、presentation/application 或其他 module internals；
- irreversible effect 没有 broker receipt，或 disposer 被当成外部回滚；
- live tooling reload 能改变已租用 authoritative plan。

## 5. React Doctor 处理规则

固定使用同一正式版、fresh output directory 与 JSON output。先跑全量 baseline，再按 rule 聚合：

1. `confirmed`：能从 React/JavaScript 语义和现有用户路径证明，添加或强化行为测试后修复；
2. `rejected`：测试代码、稳定 ref pattern、必要序列化或规则与实际语义不符，记录拒绝理由；
3. `needs_evidence`：可能改善但缺少可观测问题或性能数据，保留而不修改。

优先审查 error rules，再处理高重复、高收益 warning；同版本 full rescan 才能比较结果。score 不是
验收目标，不能为了提分改变 authoritative ordering、effect lifetime、React external-store contract
或清晰度。最终记录每条采纳、拒绝和未决理由。

## 6. 验证入口

- `deno outdated --recursive`
- `deno task check`
- `deno task bench:snapshot`
- `deno task bench:player:bundle`
- `deno run -A scripts/research/ts-locality.mts --repo <explicit-path> ...`
- pinned React Doctor full/changed JSON scans
- 外部 workload 的 focused parity、Save/replay 与配对 benchmark（先核验 dependency realpath）

每个切片先跑 changed behavior 的聚焦测试，再跑适当的 broader gate。只有 X4/X5 的 State/Save/
replay 等价与 X5/X6 的 locality 指标一起成立，实验才有资格进入 Format V2 或公开 promotion 讨论。
