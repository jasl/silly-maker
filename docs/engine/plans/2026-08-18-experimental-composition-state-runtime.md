# Experimental composition kernel and State Runtime

状态：2026-08-18 接受为独立分支上的 strangler experiment。工作分支是
`codex/experimental-cordis-state-runtime`；它不替换已交付 production floor，也不把
Incubation Mod 设计提前变成公开 ABI。X0–X5 与最小 X6.1 cycle cut 已完成；
X6.2/X6.3 的更深 runtime ownership 收口、State Format V2 与 X8 仍需新的产品证据，
本次不启动。

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
- `createStateRuntimeV1` 复用现有 `GameSession` 的一个 snapshot、queue、log、runtime control；
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

### 5.1 0.9.12 最终分类

`doctor.config.json` 将 `references`/`vendor`/`tmp`/dependency/coverage/build output 排除在产品
扫描之外，关闭 supply-chain 遍历和 score/blocking，避免工具为追分或遍历第三方树改变
实验边界。原始 full baseline 是 24 errors / 207 warnings / 110 files；最终产品范围扫描是
9 errors / 209 warnings / 103 files。由于最终扫描增加了明确 ignore，warning 总数不作前后绩效
对比；原始 24 个 error 则已逐一归类为 15 个修复和 9 个拒绝。

`confirmed` 并已修复：

- 15 个 error 属于 React concurrent/abandoned render 可泄漏的 currentness 簇。Overlay、System
  Dialog、Narrative、Whole Canvas、Semantic Stage 和 Runtime Failure Dialog 的 snapshot、focus
  ledger、callback/catalog、ambient phase 及 focus-restore target 改为 layout commit 后发布。每一簇
  都有 Suspense/abandoned-successor 行为测试；把修复局部回退会让对应测试转红。
- 5 个高置信 warning 被采纳：Story resolver 的重复 ID 查找改用 `Set`，SillyOS 的
  address/boot/toolbar 三个可访问性问题修复，Semantic Stage reduced-motion holder 改为惰性
  初始化。

`rejected` 并保留：

- 2 个 `effect-needs-cleanup` 是规则无法跟踪 `observe()` 的函数契约；Game Audio 与
  Narrative 的 effect 已把 `observe()` 返回的 disposer 作为 React cleanup 返回，没有未释放
  的 subscription。
- 7 个 `no-ref-current-in-render` 是 `ref.current ??=` 形式的确定性惰性建构，初始值
  不取决于被放弃 render，且不对外发布。保留位置是 Default Game Root、Dev Dock
  及其测试、Narrative 两处、System Dialog 和 Whole Canvas。机械地改成 effect 会延后对象
  可用性，却不修复任何可达故障。

`needs_evidence` 与明确延后：

- 48 个 JSON clone 大多数刻意验证 Strict JSON/serialization 语义；`structuredClone` 会改变
  Date/Map/Set/`undefined` 语义，不作等价替换。
- async loop/server sequential await 目前承载 ordering、backpressure、determinism 或逆序
  cleanup；没有配对性能证据前不并行化。Fetch status/body 建议与现有诊断优先级相关，
  numeric parse 有 guard，均需具体失败用例再改。
- combine-iterations、cache-property、Set/Map lookup、`toSorted` 等是未证明热点的微优化；
  giant/multi-component/derived-state 属于所有权重构；剩余 a11y 多为 backdrop/pointer
  fence 等非 action 元素。它们只在性能或真实用户路径证据出现后逐项开启。

最终 Web targeted 扫描为 0 errors / 2 warnings；full 扫描剩余的 9 errors 恰好是上述明确
拒绝项，不存在未分类 error。扫描 JSON 是临时诊断，不作为产品 fixture 提交。

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

## 7. 实验结果

### 7.1 主仓 X1–X5

- Cordis core `4.0.0-rc.8` 以九个完整 source files 和 MIT LICENSE 私有引入；
  归一化后与 upstream commit
  `8cc9e33fab69e2d0476d126baaf2acb24e6a6ab4` 只差显式 `.ts`、type-only import 与
  本仓 strict aggregate compiler 的 vendor opt-out。Deno mount/dispose smoke 与 browser bundle 通过；
  Composition root/legacy/State entry 的 minified browser bundle 分别是 39,714/13,168、
  6,287/2,075 与 57,712/16,295 raw/gzip bytes。
- Composition kernel 在 setup 前完成 graph/token/provider/registry/cycle preflight，authoritative
  mount 永久冻结，live reload 先完整 mount candidate 再换入。Token 运行时 identity、
  lifecycle re-entry、factory create/dispose 交叉死锁和 failed cleanup 都有可重现回归。
  `activateStateApplicationV1` 强制 State direct plan 编译早于 factory activation/Session
  创建，失败时 factory 仍 inactive。
- Engine Lab direct/composed 路径的 Snapshot、state digest、CommandLog、authoritative replay 和
  Save bytes 精确相等；command loop 前后 plugin activation count 不变。Dev-only Studio 已是
  真实 X3 live consumer，失败 HMR candidate 保留旧 snapshot/UI，teardown 先卸载 React
  consumer 再释放 providers。
- `@sillymaker/state` root 只有一个 exact Base Session，没有第二 State/digest/status/
  queue/CommandLog。中立 module/workflow 复用一个 Base authoring kit/transaction runner；原创四
  module fixture 验证一次原子提交、owner reject 和 candidate invariant fault 的完整回滚。
  显式 `./legacy` adapter 用 Base 公开 constructor 重建完整 binding 并保留消费者的
  exact `GameSimulationTypeMapV1`，不要求 Story 展开隐藏字段或 `as unknown`。
- 最终 `deno task check` 通过 307 个 test files / 5,018 tests、五个 Story check 与 Engine Lab
  production build。100k single/cross-owner Snapshot spot check p50 是 175.63/191.46 ms，基线为
  168.57/187.25 ms；committed 仍只做一次 whole-Snapshot digest，rejected/faulted 为零次。
  Engine Lab all-JavaScript 是 1,459,909 raw / 371,062 gzip bytes（相对 X0 +0.44%/+0.49%），
  最大 composition chunk 是 1,152,685/275,690 bytes（+0.20%/+0.22%）。

### 7.2 外部 workload X5/X6.1

隔离 workload 分支是 `codex/experimental-state-runtime-pilot`。X5 commit
`ac390a21d7d8da37a12aab5cea080a1a7a75a18f` 把 calendar/items/player/night 收口为四个真实
ownership 目录，所有九个 authoritative module 由中立 kit compose；tea 作为 operation-plan
contributor 与 Narrative/Stage 一起在同一个 outer `StateWorkflow` transaction 内提交，不存在
嵌套第二事务。X6.1 commit `8e8da6c62cbeb18d4080174131383e8c77bc511e` 把 gate
reason/context/definition/helper 收口为零 import leaf contract，保留旧 public/deep import 的单向
re-export。没有商业内容、资产或 fixture 回流主仓。

等价与原子性：

- clean baseline/current 在同 seed 的 opening→night→tea 33-entry trajectory 上，完整
  State JSON、State digest、108 个 night fields、`stateContractDigest`、`simulationDigest` 和
  authoritative replay 全部相等；两份 Save 都是 10,985 bytes 且逐 byte 相等，baseline
  Save 导入 current 是 `compatibility: "exact"`。
- zero-stock tea 精确 reject `imouto.item_out_of_stock`，原 Snapshot identity、sequence 和 State
  不变。Focused night/opening/rollback 是 20/20，X6.1 后 gate 聚焦总计 28/28。Full suite
  426/428，仅有两个既知未放入本地的商业资产失败；Story check 无诊断，
  standalone typecheck/lint 都只减少旧诊断而没有新诊断。
- Deno 2.9.5/V8 15.0 同进程 500 warmup/variant、9 轮每轮 400 operations 细粒度交错基准：
  baseline/current 独立 median 是 1.2197848/1.22667271 ms/op（+0.565%），paired
  overhead median -0.055%，逐轮范围 -0.492%…+3.470%，没有稳定 >10% 回归。

Locality：

- `modules.ts` 1,630→434 LOC，`state.ts` 798→293，`rules.ts` 4,320→4,253。Tea workflow
  闭包是 8 all-static / 2 runtime files，tea rules 是 2/1，不是给旧集中式事务加一层包装。
- X6.1 将 game/story all-static SCC 从 49 直接清零；全仓最大 SCC 现在是无关的
  application UI 4 files，runtime SCC 保持 2。`state.ts` reverse static/runtime closure
  99/34→46/34，`rules.ts` 103/80→89/80。新 leaf 使 tracked files 137→138、runtime edges
  372→373，但是单向兼容 re-export，不形成新环。

### 7.3 暂不开启的层

X6.1 是 type ownership/cycle cut，不冒充 runtime ownership 完成。Simulation runtime closure 仍为
81 files，Narrative compiler/runner 仍静态抓取全局 registries/content。下一个可命名切片是：

1. X6.2：把 Narrative State schema 对总 Facade 的 runtime import 改为显式注入、冻结的 node-id
   integrity catalog；必须保留未知 cursor 的 load rejection 与完整 Save bytes。
2. X6.3：让 compiler/runner 消费 Session 前编译的 frozen environment/direct gate plan；hot path
   只走捕获的函数/Map，不允许 Cordis/Context lookup。

当前 State/Save/replay 已精确等价且稳定 command overhead 远低于 10%，没有证据支持冒险
改变物理 State 格式，因此不开启 Format V2。当前切片也没有需要 receipt/replay policy 的
真实 Host/LLM/network/database effect consumer，因此不为了完成编号而提前发明 X8 broker
ABI。
