# Experimental composition kernel and State Runtime

状态：2026-08-18 接受为独立分支上的 strangler experiment。工作分支是
`codex/experimental-cordis-state-runtime`；它不替换已交付 production floor，也不把
Incubation Mod 设计提前变成公开 ABI。X0–X6.3 已完成；X1 最初引入的 Cordis wrapper 已在
retain/remove checkpoint 后由 direct lifecycle 取代。X7 的中立性能证据已完成，但没有激活
State Format V2；X8 与 production Story migration 未启动，也不构成 release blocker。

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
  reducer、selector 与 frame path 不得导入 implementation Context/Fiber 类型。
- `@sillymaker/state` 拥有中立命名：`StateRuntime`、`StateSession`、`StateSnapshot`、
  `StateModule`、`StateTransaction`。X4 先适配同一个现有 Session composition；不得保存第二份
  State、digest、status，不得创建第二条队列或 CommandLog。
- Effect Broker 只负责不可逆或需 receipt 的 Host/LLM/network/database 操作。Composition disposer
  只撤销 listener、subscription、timer、connection handle 等进程内 effect，不能声称撤销已发生
  的外部写入。

Composition activation 是冷路径：先校验依赖、重复 provider 与环，再按稳定顺序 mount，最后
编译为冻结的直接函数/对象表。Session 创建后 authoritative plan 冻结；命令与渲染热路径不再
访问 lifecycle Context、Proxy 或 registry。Studio/presentation/tooling 使用另一个 live root，能以
“新 profile 完整 mount -> consumer publication acknowledge -> 原子换入 -> 旧 profile dispose”
的方式 reload；acknowledge 前旧 snapshot/provider 必须仍 current，失败回滚 candidate，且不能
反向卸载 authoritative module。

### 1.2 Cordis vendor checkpoint（历史输入）

X1 最初以 Cordis core `4.0.0-rc.8`、commit
`8cc9e33fab69e2d0476d126baaf2acb24e6a6ab4` 为输入，复制完整九个 core source 文件而不复制
loader/HMR/CLI 等 Node-only workspace。相对 import 改为显式 `.ts`，类型 import 使用
`import type`；当时只由 `@sillymaker/composition` 依赖，并保留原 MIT LICENSE 与普通第三方
NOTICE。一次性人工归一化检查确认差异只来自上述 ESM/类型适配与本仓 strict aggregate compiler
的 vendor opt-out；没有创建 upstream history、来源数据库、自动同步或递归扫描工具。

rc.8 的 reentrant setup/cleanup、unload 期 effect 注册、publication failure ownership 与
`Fiber.update()` awaitability 存在可复现缺口。第一版 façade 不使用 `Fiber.update()`、
`internal/plugin` listener 或 Cordis reactive service lookup，并串行化 mount/reload/dispose；
public scope 在 setup 完成后关闭、unload 开始后拒绝注册，setup 失败由 façade 先回滚其已登记
effect。这样缺口不可达，同时保持最小 vendor diff。若后续真实 consumer 必须放宽这些约束，
先以行为测试重现，再在 rc.8 上做最窄修复；不整棵复制基于 rc.7 的参考 fork。
这些是实验输入与当时的安全边界，不是当前依赖；§1.3 记录了最终 remove 裁决。

### 1.3 Cordis retain/remove checkpoint

X1 的 Cordis 调用面最终只有每次 profile mount 创建一个 `Context`、挂载一个不读取 Context 的
composite plugin，并把 façade 已实现的 `setupStageV1`/`cleanupStageV1` 再包成一个 Fiber
disposer。Plugin-level scope/effect、逆序 rollback、snapshot retirement、reload publication 与
busy gate 都由 SillyMaker 自己拥有；nested Fiber、inject/isolate、service lookup 与
`Fiber.update()` 没有消费者。

同一 HEAD 的 direct lifecycle A/B 保持 Composition、State、Studio publication/HMR 与 Engine Lab
等价测试通过。16-module cold trend 只在 mount/dispose 出现稳定改善，direct-plan compile 与
Session create 保持噪声中性；维护中的 Player all-JavaScript/CSS 字节不变，因为实验包尚未进入
Player。
独立 composition public-root bundle 则从 40,350/13,557 降为 13,213/4,203 raw/gzip bytes。
因此 vendor、workspace dependency、NOTICE 与 composite Fiber wrapper 一并移除；这不改变公开
exports、Save/digest/replay 或 single-authority 边界。若未来出现必须由 hierarchical Fiber tree、
dynamic injection 或 isolate 解决的真实 consumer，再以那个行为合同重新评估依赖，而不为潜在
用途保留当前无语义职责的 wrapper。

### 1.4 State、identity 与兼容基线

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
- clone 的 `file:` 依赖与 `node_modules` 在 X0 指向另一个独立 engine checkout；该 checkout
  当时恰好也是 `55fc9f80`。后续证据均先把隔离副本显式指到目标工作树并核验解析结果，避免把
  相同提交号误当成持续等价的依赖来源。

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
- command loop 前后 lifecycle lookup/activation count 不变；
- State、Snapshot digest、Save round-trip 与 replay bytes 与无 kernel 路径等价。

### X3 — Live Studio/tooling profile

- authoritative 与 live root 分离；live profile 仅在 consumer publication acknowledge 后原子
  reload，setup/publication 失败保留旧 snapshot/provider/UI；
- reload 后 authoritative plan、revision、Session 与 digest 不变；
- timer/subscription/listener 全部有 disposer，cleanup failure 形成诊断且不阻断 sibling cleanup。

### X4 — Neutral State Runtime façade

- 新增 `@sillymaker/state` 根入口及明确的 legacy adapter 子入口；
- `createStateRuntimeV1` 复用现有 `GameSession` 的一个 snapshot、queue、log、runtime control；
- neutral definition 到 Base runtime input 逐字段构造，physical Session 以单向 assignability
  检查为 neutral Session，不用 whole-object cast 掩盖 Base required-field drift；
- Persistence import/load/migration 仍通过同一个 runtime control 做原子 replacement，并更新同一个
  replay anchor；
- public consumer 不导入 Base GameSession 或 implementation lifecycle 类型也能 typecheck；legacy
  consumer 保持可用。

### X5 — Module/workflow pilot

主仓使用完全原创的中性 fixture：`calendar`、`inventory`、`actor`、`evening` 四个 module 与
`use-evening-supply` workflow。它证明跨 module operation 在一个 transaction 中成功或完整回滚，
不复制商业名称、文本、数值或实现。

neutral module 公开 admission 后冻结的 `contractRevision`，冷路径 carrier 只引用同一个 Base
authoring module；spread/prototype alias 不得让公开 metadata 与 physical binding 分叉。V1 initializer
明确 bootstrap-independent；`StateTransaction` 只读 command-start State、无 read-your-writes、每 owner
至多一个 proposal，并以 UTF-16 module-ID 顺序 apply/收集 facts。module-local invariants 在有真实
执行语义前不进入 neutral surface，aggregate `validateCandidate` 保持唯一中立校验点。

外部 workload 选择现有最窄的 `imouto.tea.brew`，而不是重置 108 fields 且触及更多领域的 sleep。
接入时保持 `imouto.night`、`simulation.night`、全部 108 fields、Save slot 与 command identity，
并用其现有 night-loop、Save/replay 测试做等价验证。四个 pilot module 必须从集中式
`modules.ts/state.ts/rules.ts` 依赖闭包中真实收口；“已有 module/transaction 被重新包一层”不算成功。

### X6 — Night/narrative locality

- X6.1 清除全静态图中的 `game/story` cross-domain SCC，不增加 runtime SCC；module 目录不导入
  root State、presentation/application 或别的 module internals，目标 workflow 改动闭包必须真实下降；
- X6.2 让 State schema 显式接收 Session 前冻结的 node-id integrity catalog，未知 cursor 仍在
  load/admission 时拒绝，State 不再通过总 Narrative façade 抓取 script registry；
- X6.3 把 concrete effect/gate/scene/target registries 收口到 cold environment，compiler/runner
  只消费冻结输入与预绑定 gate/effect plan；production simulation/semantic hot path 只调用捕获的
  函数、Map/WeakMap，不进行 lifecycle Context 或 registry lookup；
- 若只是移动文件或改 barrel、SCC/closure 不变，或引入第二 node/State authority，则停止并撤回抽象。

### X7 — Optional State Format V2 and performance

X7 的性能证据在 X5/X6 等价与 locality 达标后单独完成：直接 plan 使用同机、同 Deno、预热、
交错多轮配对，稳定 command 中位数超过旧路径 10% 时停止；中立 16-module workload 另测
Save size、touched-owner locality、retention/replay 与 process-isolated GC trend。绝对 timing/heap
不是跨机器预算或 CI hard gate。State Format V2 仍未激活；若未来开启，必须同时定义明确的
module-keyed schema、迁移、Save/replay identity 与 corpus，不能与 façade migration 混做。

### X8 — Effects, OpenUI and i18n

先定义 Effect Broker request/receipt 与 replay policy，再接 Host/LLM/network/database。OpenUI、i18n
与 presentation plugin 只消费只读 State projection/receipt，不获得 authoritative writer。任何已发生
外部 effect 都不能靠 composition unload 假装回滚。

## 4. 全局 stop conditions

出现以下任一项就暂停相应切片，不以“实验性”绕过：

- 两个 State writer、两份 digest/status、两条 authoritative queue 或两套 CommandLog；
- Save/replay 不兼容且没有明确 migration/identity 边界；
- lifecycle Context/Proxy lookup 进入 command、reducer、selector 或 frame hot path；
- implementation lifecycle 类型出现在 Story 或任一受支持 package declaration；
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
  Narrative 的 effect 已把 `observe()` 返回的 disposer 作为 React cleanup 返回，不会遗留未清理
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
- `deno task test:composition-state-bench`
- `deno task bench:composition-state`
- `deno task bench:composition-state:memory`（每个 GC cell 使用独立进程）
- `deno task bench:player:bundle`
- `deno run -A scripts/research/ts-locality.mts --repo <explicit-path> ...`
- pinned React Doctor full/changed JSON scans
- 外部 workload 的 focused parity、Save/replay 与配对 benchmark（先核验 dependency realpath）

每个切片先跑 changed behavior 的聚焦测试，再跑适当的 broader gate。X4/X5 的 State/Save/replay
等价、X5/X6 的 locality 与 X7 性能证据均已成立；它们使实验有资格进入独立的 promotion 讨论，
但不会自动激活 Format V2、X8 或 production Story migration。

## 7. 实验结果

### 7.1 主仓 X1–X5 与最终 lifecycle

- Composition kernel 在 setup 前完成 graph/token/provider/registry/cycle preflight，authoritative
  mount 永久冻结；live reload 在旧 snapshot/provider 仍 current 时要求 consumer publisher 确认
  完整 candidate，拒绝则回滚，确认后才换入并退休 predecessor。Token 运行时 identity、
  lifecycle re-entry、factory create/dispose 交叉死锁和 failed cleanup 都有可重现回归。
  `activateStateApplicationV1` 强制 State direct plan 编译早于 factory activation/Session
  创建，失败时 factory 仍 inactive。§7.4 的 retain/remove checkpoint 最终把没有独立语义职责的
  Cordis wrapper 替换为 package-internal direct staging/disposal，没有改变这些公开合同。
- Engine Lab direct/composed 路径的 Snapshot、state digest、CommandLog、authoritative replay 和
  Save bytes 精确相等；command loop 前后 plugin activation count 不变。Dev-only Studio 已是
  真实 X3 live consumer：detached epoch root 的 layout acknowledgement 早于 host cutover；失败或
  abort 保留 exact 旧 React tree、dirty document session、snapshot/provider，teardown 先卸载
  React consumer 再释放 providers。
- `@sillymaker/state` root 只有一个 exact Base Session，没有第二 State/digest/status/
  queue/CommandLog。runtime definition 与 authoring config/runner 都显式逐字段桥接；中立
  module/workflow 复用一个 Base authoring kit/transaction runner。module revision 是稳定 neutral
  字段，私有 cold carrier 不可枚举且只接受 own property，避免 alias metadata 双权威；原创四
  module fixture 验证一次原子提交、owner reject 和 candidate invariant fault 的完整回滚。
  显式 `./legacy` adapter 用 Base 公开 constructor 重建完整 binding 并保留消费者的
  exact `GameSimulationTypeMapV1`，不要求 Story 展开隐藏字段或 `as unknown`。
- Cordis removal 后的最终 canonical check、bundle 与 lifecycle A/B 见 §7.4。committed command
  仍只做一次 whole-Snapshot digest，rejected/faulted 为零次；维护中的 Player all-JavaScript/CSS
  字节不变，
  因为实验 Composition/State 包仍未进入 production Story flow。

### 7.2 外部 workload X5–X6.3

隔离 workload 分支是 `codex/experimental-state-runtime-pilot`。X5 commit
`ac390a21d7d8da37a12aab5cea080a1a7a75a18f` 把 calendar/items/player/night 收口为四个真实
ownership 目录，所有九个 authoritative module 由中立 kit compose；tea 作为 operation-plan
contributor 与 Narrative/Stage 一起在同一个 outer `StateWorkflow` transaction 内提交，不存在
嵌套第二事务。X6.1 commit `8e8da6c62cbeb18d4080174131383e8c77bc511e` 把 gate
reason/context/definition/helper 收口为零 import leaf contract，保留旧 public/deep import 的单向
re-export。

X6.2 commit `04ae512d7a211c1da41b2d5685218b4d6c824bce` 让 State schema 显式接收唯一
Narrative node-id integrity catalog；同一冻结 catalog 在 Session 前生成并被 root/narrative Schema
复用，未知 cursor 仍拒绝。X6.3 commit `66a829febf5f993fba03c0348d5475c2cd3223f2`
新增 concrete cold environment：它一次 snapshot effect/gate/scene/target registries，content compile
后不保留源 Proxy/record；runtime admission 建立一个 node Map、choice Maps 与按 exact effect-ref
identity 保存的预绑定计划。Simulation 与 Semantic production consumers 只调用同一个冻结 runtime，
旧 façade 名称保持 exact aliases。没有商业内容、资产或 fixture 回流主仓。

等价、原子性与 admission：

- clean baseline/current 在同 seed 的 opening→night→tea 33-entry trajectory 上，完整 State JSON、
  State digest、9 个 root fields、108 个 night fields、`stateContractDigest`、`simulationDigest` 和
  authoritative replay 全部相等；两份 Save 都是 10,985 bytes 且逐 byte 相等，baseline Save 导入
  current 是 `compatibility: "exact"`。Narrative fingerprint 也是 exact 1,003,391 bytes。
- zero-stock tea 精确 reject `imouto.item_out_of_stock`，原 Snapshot identity、sequence 和 State
  不变。X6.3 focused 是 5 files / 28 tests；完整 suite 仍只剩同两个未放入本地的商业图片失败，
  format、changed-file lint 与 diff check 通过，standalone check 没有新增诊断。
- mutation-sensitive tests 锁定 environment 不晚读源 records、script source mutation 不改变 runtime、
  duplicate node/choice 与 missing gate/effect 在 admission 时 fail-fast、gate 顺序保持 authored first
  blocked，以及所有 legacy alias 的 exact identity。Parameter schema 只在 content compile 时解析一次，
  bind 和 hot execution 不重复 admission。

Locality：

- `modules.ts` 1,630→434 LOC，`state.ts` 798→293，`rules.ts` 4,320→4,253。Tea workflow
  闭包是 8 all-static / 2 runtime files，tea rules 是 2/1，不是给旧集中式事务加一层包装。
- X6.1 将 game/story all-static SCC 从 49 清零；X6.3 后全仓最大 static/runtime SCC 仍为 4/2，
  game/story SCC 仍为 0。tracked TS/TSX 是 141 files，static/runtime edges 是 460/382。
- X6.2→X6.3 的 compiler forward closure 从 23/22 降为 4/3，runner 从 64/64 降为 3/1；
  concrete environment 是 24/23。Narrative façade保持 65/65，simulation 保持 84/81，State 保持
  9/9，没有为追求表面数字把真实 consumer 移出闭包。reverse closure 是 rules 90/81、State 48/36、
  compiler 76/66、runner 51/40。

最终 paired runner commit 是 `0e52f9bbb354b0c048f9fb879e37cb22a3714f4d`。每轮使用 fresh
applications，40 warmup、600 个 AB/BA pairs，共 9 轮；输出只有 labels 与聚合值，不写 raw samples
或机器路径：

- `tea-green-attempt` 从同一个固定 tea-menu Snapshot 依次执行 choose gate、say advance、brew-effect
  advance，证明 direct gate/effect plans、三次 State transaction 与最终 stock/night/calendar/player/fact
  变化都真实可达；baseline/current ratio median `0.9994891`（-0.0511%），范围
  `0.9764788..1.0111181`，0/9 超过 +10%。
- `set-money-commit` 在计时前填满 200-entry CommandLog，并在 steady window 保持 retention；ratio
  median `1.0008746`（+0.08746%），范围 `0.9977538..1.0038850`，0/9 超过 +10%。

### 7.3 X7 性能证据与未开启层

主仓 owner-grade neutral matrix 使用 16 个原创 State modules，完整覆盖 exact exported-Save
`10 KiB / 100 KiB / 1 MiB` × atomically touched modules `1 / 4 / 16`。每格 correctness 先执行
256 commits，锁定 retained=200、replay base sequence=56、ordinals 57..256；authoritative replay
执行全部 200 entries，isolated import/export 的 State、digest 与 Save bytes 全等，source Session
不被替换。随后 fresh Session 先执行 256 次 untimed prefill，再测 64 次 steady commands。

同机 owner run 的毫秒 p50/p95 如下；这些是本次趋势证据，不是 portable budget：

| Save / touched | steady command  | Save round-trip   | authoritative replay    |
| -------------- | --------------- | ----------------- | ----------------------- |
| 10 KiB / 1     | 0.188 / 0.201   | 1.985 / 2.356     | 192.381 / 202.901       |
| 10 KiB / 4     | 0.203 / 0.210   | 1.609 / 1.670     | 198.840 / 200.043       |
| 10 KiB / 16    | 0.257 / 0.260   | 1.579 / 1.627     | 220.871 / 221.043       |
| 100 KiB / 1    | 1.420 / 1.425   | 11.754 / 12.527   | 1,668.646 / 1,685.316   |
| 100 KiB / 4    | 1.426 / 1.440   | 11.668 / 11.916   | 1,684.418 / 1,692.777   |
| 100 KiB / 16   | 1.487 / 1.507   | 11.566 / 12.622   | 1,711.615 / 1,740.821   |
| 1 MiB / 1      | 15.400 / 15.559 | 130.427 / 130.965 | 18,504.462 / 18,627.625 |
| 1 MiB / 4      | 15.380 / 15.772 | 127.125 / 133.236 | 18,472.519 / 18,617.169 |
| 1 MiB / 16     | 15.437 / 15.857 | 133.356 / 135.045 | 18,656.402 / 18,778.708 |

同一 run 将 cold path 分开计时：profile mount `0.347/0.414`、direct State plan + factory resolve
`0.138/0.178`、唯一 Session create `0.161/0.325`、完整 dispose `0.053/0.054` ms p50/p95，
没有把 activation、Session create 或 retention crossing 混入 steady command。

五个 GC cells 分别在独立进程按 sequence 0/200/400/800/1,200 执行两次显式 GC 和一个 macrotask。
post-GC `heapUsed` MiB 序列与 400→1,200 增量是：

| Cell        | 0 / 200 / 400 / 800 / 1,200 MiB           | 400→1,200 |
| ----------- | ----------------------------------------- | --------- |
| 10 KiB / 1  | 7.544 / 8.404 / 8.209 / 8.264 / 8.267     | +0.057    |
| 10 KiB / 16 | 7.544 / 8.379 / 8.539 / 8.587 / 8.594     | +0.054    |
| 100 KiB / 4 | 7.720 / 8.486 / 8.470 / 8.504 / 8.755     | +0.285    |
| 1 MiB / 1   | 9.524 / 10.264 / 10.189 / 10.237 / 10.406 | +0.217    |
| 1 MiB / 16  | 9.524 / 10.350 / 10.504 / 10.537 / 10.550 | +0.046    |

这些 double-GC snapshots 只显示 retention 满后的本机趋势；它们不测 GC latency，RSS/heapTotal
reservation 也不能单独证明或否定 live-object leak。报告不含 hostname、cwd、repository path 或
machine identifier，raw JSON 只在 OS temp。X7 的性能证据因此完成，但结果没有提供改变物理 State
格式的产品理由，State Format V2 未激活。当前也没有需要 receipt/replay policy 的真实
Host/LLM/network/database effect consumer；X8 与 production Story migration 未启动，且都不是
release blocker。

### 7.4 Cordis retain/remove checkpoint

- 移除前的实际调用面只有 `new Context()`、一个不读取 Context 的 composite `ctx.plugin()`、await Fiber 与
  `fiber.dispose()`；Cordis 看不到单个 SillyMaker plugin/effect，也不承担 nested scope、依赖注入、
  reload publication 或 authority fencing。九个 TS source 是 1,866 LOC / 60,096 bytes；连许可与
  manifest 共 12 files / 61,989 bytes。`kernel.ts` 的 Deno graph 从 14 nodes / 98,697 reported
  source bytes 降为 3 nodes / 37,849 bytes，并移除唯一使用 `cosmokit` 的 runtime edge。
- Direct 版本的 focused parity 是 10 files / 71 tests；完整 removal 后 canonical check 通过
  308 files / 5,037 tests、五项 neutral bench behavior tests、五个 Story checks 与 Engine Lab
  build。五个独立 cold samples 各含 60 warmup + 300 个 AB/BA pairs；mount paired p50 为
  -83.79%…-85.05%，dispose 为
  -89.37%…-89.76%，四阶段合计为 -52.85%…-55.01%，而 direct-plan compile 与 Session create
  保持在约 1% 的噪声带内。这些数值只说明本次同机 trend，不是跨机器预算或 CI gate。
- Engine Lab release ABBA 的 all-JavaScript 四次均为 1,459,909 raw / 371,062 gzip bytes；实验
  composition 尚未进入维护中的 Player。独立 public-root bundle 为 40,350/13,557 →
  13,213/4,203 raw/gzip bytes。行为全等且没有可归因的 Fiber 语义，因此 checkpoint 选择 remove。
