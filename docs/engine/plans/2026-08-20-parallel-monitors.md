# Parallel Monitors V1（并行监视器、领域事件与持久化安全点）

状态：2026-08-20 起草，同日所有者接受开工，同日 M0–M5 全部交付收口
（本文自此为完成执行记录）。合同、六项裁决（含裁决 #5
同日修订：安全点随本车道实现）与正交性分界见
[parallel-monitors 提案](../proposals/parallel-monitors.md)；本文只拥
有实现切片顺序、admission 落地与验收。
[production-floor sequence](2026-07-30-production-floor-sequence.md)
仍是唯一跨计划排序入口。

## 1. Positioning

hold 交付了「两句台词之间的独占计时」；剩下一族真并行行为——计时累积
与玩家输入同时活着（决策 gauge、场景窗自燃、持续交互期滴）。本车道同
时落三件按裁决绑定的事：唯一时间动词（裁决 #1/#3）、领域事件 + reducer
全量迁移（裁决 #4）、监视器 V1 三型消费者（裁决 #2/#6）；外加裁决 #5
修订领入的持久化安全点与在途段（引擎能力先行，暂无 Story 消费者）。

不变量（每个切片都必须保持）：

- **单一权威与唯一写者**：只有 Session commit 改权威状态；transaction
  runner 是唯一 appender；墙钟时间戳不进 State、Save、digest。
- **同一段流逝只进权威一次**：唯一时间动词一次 commit 结算全部时间消
  费（先折 hold 余量，再按注册序推监视器）；总消费毫秒 = 报告毫秒。
- **批切不影响终态**：`{500,500,500}` ≡ `{1500}`；阈值穿越算术沿
  hold 车道已锁定的家族。
- **命令日志仍是唯一回放输入**：领域事件是 commit 内派生物，可确定重
  导出；不进 digest，默认不进 Save。
- **监视器无脚本体、无路由权**：声明 = 谓词门控 + 节奏 + 事件；改
  pending / 跳段仍是叙事词汇的领地。
- **破坏式重塑**：`hold_tick` 与注册效果命令旧路径显式迁移后删除，不
  留双轨（沿 pause→hold 先例）。

## 2. 车道纪律（所有者要求，2026-08-20）

- **每里程碑一次 review**：里程碑代码完成、focused 测试与
  `deno task check` 绿之后，先对该里程碑 diff 做一次独立 review（新鲜
  视角过一遍变更），修完发现项再提交；交付记录写回本文 §3。
- **收尾扫描（M5，硬门）**：全车道结束前统一扫描——残留死代码、过时
  文档、未迁移实现；引擎侧功能正交性、单向数据流、依赖方向最佳实践。
  扫描发现项清零或显式记录 defer 理由后车道才收口。
- 一次只领一个切片；外部实验仓消费者按其自身刀序推进，引擎侧只记录合
  同与 Lab 证据。

## 3. Slices

### M0 — 唯一时间动词（base + Host + 全消费者归并）

- base：新会话级时间动词（工作名 `time_tick({ elapsedMs })`，最终命名
  随 M0 admission 定）取代 pending 域的 `hold_tick` resolution。同一
  commit 内结算顺序固定：hold pending 先折余量（到期语义、部分 tick
  帧刷新、`tickQuantumMs` 量子纪律全部保留），M2 起再按注册序推监视
  器。
- admission 裁定（M0 已落锤，2026-08-20）：
  - **会话级命令 + 可选 hold 栅栏**：`TimeTickV1 = { elapsedMs,
    expectedHoldOccurrenceId? }`。分析确认真实过折风险存在——排队中的
    陈旧报告或自动化投递可在 hold 交替后落到**后继 hold** 头上，预折玩
    家从未观看的毫秒（MV 的 wait 计数也只吃自己帧）。因此：带栅栏的报
    告才有资格折当前 hold（栅栏过期整条拒绝，代码
    `time.hold_occurrence_stale`）；不带栅栏的报告只结算会话全局时间消
    费者（M2 起的监视器），永不折 hold。一个动词、一个可选字段、两个结
    算范围——不是双动词。
  - hold 从 `InteractionResolutionV1` 移除后成为纯时间结算边界：任何
    输入 resolution 对 hold pending 一律 `interaction.kind_mismatch`。
  - 公开算术随归并换名：`applyHoldTickV1` → `applyElapsedToHoldV1`
    （facade `applyElapsedToHold`），`countHoldTickCrossingsV1` → 泛化
    为 `countThresholdCrossingsV1({ fromMs, toMs, everyMs })`（facade
    `countThresholdCrossings`），后者同时服务 M2 监视器累积穿越。
  - Story 侧以自有命令承载动词（如 `lab.time_tick`），沿
    `narrative_resolve` 同款「invocation → command → reducer」路径；
    UI 叙事面新增 `dispatchTime` 绑定（量子分批、skip 折清、到期共用一
    个出口）。
- Host：narrative host / dialogue player 的提议路径换新动词；折余量、
  到期、量子部分提交三类 commit 语义不变。
- 迁移删除：`hold_tick` 全仓移除（admission、facade、测试、文档）；
  Lab `cal-hold`、实验仓滴路径双消费者复跑等价。
- 验收：批切不变性与交错回放 headless 测试；持有中 Save/load 回归；
  迁移后全仓无 `hold_tick` 残留；`deno task check` 绿。
- **交付（2026-08-20，review 后提交 `b2e041e1`）**：`TimeTickV1` 会话级
  动词（`elapsedMs` + 可选 hold 栅栏，陈旧栅栏
  `time.hold_occurrence_stale` 整条拒绝；无栅栏 tick 无条件接受、永不折
  hold）；hold 移出 `InteractionResolutionV1`；算术换名
  `applyElapsedToHoldV1` / `countThresholdCrossingsV1`；UI 叙事面新增可空
  `dispatchTime` 绑定，hold 到期控制器与 skip 折清共用栅栏 tick 出口，
  缺时间端口的 hold 帧直接 fault 玩家控制器（review 发现的无限重试修
  复）。e2e/template 双故事迁移，`hold_tick` 全仓无残留。

### M1 — 领域事件 + reducer（全量迁移，删除旧路径）

- Story 声明事件类型（版本化、admission 校验一次）；生产者（效果代
  码，M2 起监视器阈值穿越）在同一 commit 内 emit；reducer 在同一
  commit 内原子应用——权威更新 = `apply(state, events)`，失败整体不
  动。
- 注册效果命令家族整体迁移到事件 + reducer，迁移完成后删除旧权威路径
  与其 admission/测试/文档（裁决 #4，不做双轨）。
- 事件日志读侧：commit 落盘事件序列供 HUD/统计/调试面订阅增量；诊断
  缓冲有界（上界 M1 内定）；不进 digest、默认不进 Save。
- 验收：同一命令日志两次回放重导出的事件序列逐条相同；清空事件缓冲不
  影响权威终态与 digest；旧路径删除后无消费者残留。
- **交付（2026-08-20，review 后提交 `4eb14116`）**：`transaction.emit`
  取代 `propose`/`apply` 仪式（emit 时对 Story `eventSchema` 校验一次，
  reject/complete 后闩死）；折叠序 = 发射序 + 事件内 UTF-16 模块 ID 序，
  触碰切片折后再验；提交信封/CommandLog/回放携带 `events`；
  `ModuleOwnerCapabilityV1` 与 operation/proposal schema 删除。五故事 +
  testkit 工作负载 + 排序向量全迁移；save fixtures 重盖新 simulation
  digest，故意变更的 golden 重钉。review 发现项全部修复：requires/
  initializesAfter 恢复、绝对值 reducer 单发假设注释、结算后 emit 闩、
  cat-cafe 日历死代码删除、文档折叠语义措辞修正。

### M2 — 权威监视器 V1

- 声明 admission：`activeWhen`（复用 branch `when` 谓词词汇，无
  arm/disarm 动词）、`everyMs`、事件载荷、保留策略（`retain` | 清零，
  裁决 #2 双策略同批）、可选 frames/投影通道。
- 会话状态：`{ [monitorId]: accumulatedMs }` 版本化可序列化数据；
  Save 中途保得住；清零/保留按声明执行。
- 结算：唯一时间动词 commit 内、hold 折余之后、按注册序推进；阈值穿
  越发射声明的领域事件（唯一产出通道）。
- 验收：`{500,500,500}` ≡ `{1500}` 终态 digest 相同；gauge 中途存档
  load 后续报同出口；`retain` 与清零各有单测；时间报告与输入
  resolution 交错重放同序同终态。
- **交付（2026-08-20）**：`authoritative-monitor.ts` 合同——
  `parseMonitorDeclarationsV1` admission（唯一 id、正整数节奏、
  `clear`|`retain`、带 `kind` 的事件载荷、`activeWhen` 谓词；声明序 =
  结算序）、`parseMonitorAccumulatorV1`（`{ [monitorId]: accumulatedMs }`
  普通版本化状态切片）、`settleMonitorsV1`（hold 折余之后按声明序推进，
  穿越复用 `countThresholdCrossingsV1`，每次穿越产出一份声明载荷，经
  `transaction.emit` 唯一写者发射；非活跃按声明清零/保留，未声明 id 不
  存活）。验收由合同套件内的 kit 直驱合成故事锁定：批切 digest 等价、
  声明序发射、清零/保留、中途存档续报同出口、交错重放钉定终态。可选
  `frames`/投影通道按 hold 先例（帧节奏是 Story 词汇）defer 到 M4 首个
  HUD 消费者定形。Lab/实验仓活路径归 M4。review 发现项全部修复：
  `__proto__`/`prototype`/`constructor` id 双端 admission 拒绝 +
  `Object.hasOwn` 自有读（消除 Deno 与浏览器 Annex-B 分歧）、累积器
  admission 对齐兄弟解析器（访问器/符号键拒绝、指针转义）、事件载荷
  admission 深冻结（同一引用逐穿越发射）、稀疏声明数组拒绝。

### M3 — 持久化安全点与在途段（引擎能力先行）

- 安全点判定：优先从既有 pending kind 推导（`presentation_barrier` 天
  然在途）；显式在途段声明 commit 内进入/退出，admission 强制有界（界
  的形态——毫秒预算或 commit 数——M3 内定）。
- 存档抑制：持久化编排器在途期把 autosave 推迟或落回最近安全点快照；
  导出永远只见安全点状态；span 内 scratch 不序列化。
- 分界写死：监视器累积、hold 剩余是长寿权威状态必须入档，不属于在途
  段。
- 消费者：持久化编排器自身 + Lab conformance 一条在途段测试路径；无
  gameplay Story 消费者（裁决 #5 修订：能力先行，合适的消费者出现即可
  利用；Desktop durability 车道后续直接消费该合同）。
- 验收：在途段内触发 autosave 推迟或落回最近安全点并可正常 load；
  span 退出恢复正常粒度；无界 span 在 admission 被拒。
- **交付（2026-08-20）**：`persistence-safepoint.ts` 合同——
  `parsePersistenceSafepointPolicyV1` admission（精确键、函数分类器、
  1..256 有界 commit 预算；界的形态定为 commit 数，与回滚环同量纲，无
  第二墙钟入持久化策略）；resolve 期结构化失败
  `persistence_safepoint.invalid`，早于任何 Session/持久化所有者。编排
  落地 core application：在途 commit 永不成为 autosave 候选
  （`every_commit` 直接跳过；`debounced` 保留上一安全点候选与其定时
  器），flush 落回本锚纪元最近安全点快照（纪元内无安全点则不写，存量
  记录即崩溃恢复目标），玩家槽存档在途拒绝 `in_flight`（默认 Save 覆
  盖层渲染 `rejected.in_flight` 标签，五故事标签齐备），load/import/
  restart 锚替换重置 span 追踪。越界 span 弃权抑制并单次上报
  `persistence.safepoint_span_exceeded`；分类器抛错/回错上报
  `persistence.safepoint_classify_failed` 并按安全点放行——声明故障永远
  饿不死存档。分类不入权威状态/存档/digest/回放。Lab conformance：
  `presentation_barrier` 天然在途（barrier 挂起时实时存档拒绝、
  autosave 落回过场前边界、过场后恢复粒度并可正常 load）；barrier 的
  `loadRecovery` 对确实携带 barrier 的存档（弃权/遗留/导入）仍是读档
  权威——default-ui 用无策略孪生定义预置遗留中途档并证明 settle 读档
  不回放转场。

### M4 — 三型消费者 + `pace` 提示

- `pace: cinematic | realtime` 声明落地（hold 与监视器窗）：realtime
  窗 Host 不应用倍速、skip 至此停；只约束 Host 行为，不进权威算术。
- 三型各一条活路径（裁决 #6，一步到位）：决策 gauge（活菜单点击取档
  位，realtime 首消费者）、场景窗自燃（谓词门控在场滴）、持续交互期滴
  （持住交互面累积）。Lab 各一条中性 conformance 路径；外部实验仓按其
  刀序接真实玩法路径。
- 验收：门控翻转启停、HUD 读同一累积、玩家中途点击拿到正确档位；
  realtime 窗下倍速被钉回、skip 停在窗前；e2e 浏览器证据。
- **交付（2026-08-20）**：
  - 合同（M4.1）：hold 与监视器声明同名可选 `pace: "cinematic" |
    "realtime"`（缺省归一 cinematic，非法值拒绝；部分 tick 保留字
    段），`anyRealtimeMonitorActiveV1`/facade 谓词判定活跃 realtime
    段。
  - 运行时（M4.2）：`PresentationRatePortV1` 增 `pinRealtime()`（有效
    倍率钉 1×，可叠可释、释放幂等，请求倍率保留自恢复，缩放时间跨钉/
    释连续）与 `{ rate, effectiveRate, pinned }` 状态；新
    `createSessionTimeReporterV1` 会话报时器——组合表现钟（倍率缩放、
    冻结感知）按 quantum 分批取整报告，闸关丢弃亚 quantum 尾、开闸重
    锚，派发拒绝即闩死（无条件可受理的时间被拒 = 接线错误）单次上报。
  - composer（M4.3）：`WebGameUiDefinitionV1` 新增 `timeReporting`
    （quantum + publication 谓词 + Story 时间命令派发）与
    `realtimeWindow` 声明；`installPresentationPacingInternalV1` 接
    线——hold pending / 文档隐藏自动闭闸（hold 走栅栏到期控制器，同
    一段流逝进权威恰好一次），`pace: "realtime"` hold 与 Story 声明
    realtime 段叠加钉回；调试坞倍速行「实时段 1×」徽章。
  - Lab（M4.4–M4.7）：`lab.monitors` 模块（rev5→6 迁移 + 夹具重钉 +
    state-6 新夹具）承载三型各一条活路径——realtime 决策 gauge（演习
    菜单下蓄力，释放换积分/放空清零）、场景窗自燃（chamber say 在场
    滴）、`retain` 收集器（跨普通边界滴、关断保留余量）。headless 钉
    批切不变计数、hold 栅栏内结算、中途存档续报；hosted UI 套件证明
    metronome 走声明派发喂真实钟、gauge 菜单钉回并在决议后恢复请求倍
    率；浏览器证据 `pacing.spec.ts`（chromium/webkit/touch，dev 与
    prebuilt 双模式）——计数器仅靠会话时间上涨、realtime 段随菜单开
    合、保留策略跨关断存续。声明可选 frames/投影通道在首个 HUD 消费者
    处证实不需要（Lab 从普通版本化状态投影读数），不引入。
  - skip 停窗：Lab 无 skip 面，realtime 下 skip 停窗语义由钉回 1× +
    choice pending 天然覆盖（skip 本就停在 choice 前，hold 车道既有
    语义），无新增合同面。
  - review 发现项全部修复：pacing 安装条件补上纯 hold 故事（叙事运行
    时存在即安装，引擎型 `pace:"realtime"` hold 无需 composer 声明也
    钉回）；演习决议提交内显式丢弃 gauge 累积残量（`clear` 只在结算
    内生效、决议后报时闸恰好关闭，残量本会泄入下一段与存档——二段新
    鲜性测试锁定）；异步派发拒绝的故障闩单次上报（多份在途报告只报一
    次，dispose 后到达的拒绝吞掉）；补决策中途 save/load 续报测试
    （半节奏残量跨读档精确续穿越）。

### M5 — 收尾扫描（硬门）

- 死代码/过时文档/未迁移实现全仓扫描（含 `hold_tick`、注册效果命令、
  旧术语残留）；引擎正交性、单向数据流、依赖方向 review；发现项清零或
  显式 defer。
- 文档回流：`features.md`、`architecture.md`、`story-authoring.md`、
  `vn-presentation-runtime.md` 与提案交付记录；production-floor §1 收
  口。
- 两仓 `deno task check` + `deno task test:e2e` 全绿收口。
- 交付（2026-08-20）：
  - 未迁移实现：外部实验仓全量迁上新面——模块 owner/propose 换
    reducers + fold 辅助、`ImoutoFactV1`→事件族（各模块 `*_set` + 信息
    性事件）、命令处理器统一 emit、新增时间动词处理器与
    `dispatchTime` 接线、44 处测试决议换 `TimeTickV1`；三处刀285/286
    后未跟进的陈旧 e2e 断言修正（日计数入调试坞、figure 包裹背景、普
    段着按日轮换）；vitest 658 / Playwright 7 全绿。
  - 死代码：digest 重钉临时脚本清除；`hold_tick`/fact 家族源码零残留
    （唯一保留是负向解析测试，证明退役动词不再受理）；公开出口无孤儿
    别名；车道文件无 TODO 标记。
  - 过时文档：roadmap 证据词汇 facts→events；feature-slices 状态头补
    owner→reducers 时代注记；deterministic-simulation-boundary 的
    「factSchema/rejectionSchema 尚未接入」失真句改为现状
    （`eventSchema` 于 emit 接入、`rejectionSchema` 于 evidence
    admission 接入、fault 仍无 schema）。历史提案与已完成计划按封存
    证据保留当时词汇；网站无旧 API 记述。
  - 正交性/单向数据流/依赖：base 新合同零 React/DOM/Host 依赖；ui 不
    依赖 web；pacing 回路只经命令路径回权威（表现层不直写状态）；包
    间消费走声明出口与 `workspace:*`，无 `src/**` 跨包引用。发现项清
    零，无 defer 新增。
  - 两仓 `deno task check` + `deno task test:e2e` 全绿。

## 4. Defer

- 声明条件改道（hold `when` 中止），沿 hold 车道原 defer，等第一条真
  实中止路径。
- 事件日志进 Save 的诊断环形缓冲（除非 M1 内有真实需要）。
- 监视器多实例模板/参数化（第一个真实需要再领）。
- Studio/Flow 对监视器与在途段的创作面（合同稳定后另领）。

## 5. Stop conditions

沿用 production-floor §9 与提案「停」节；本计划内特别注意：

- 同一段墙钟流逝进权威两次（双钟并行报时）→ 停；
- 领域事件可绕过序列化写者、或消费者从事件日志重建第二份权威 → 停；
- 归并重构中途停在双动词并存、或事件迁移停在双轨并存 → 停（要么完成
  要么回滚）；
- 在途段被用来藏非确定性、或长寿权威状态借它逃出 Save → 停；
- 监视器获得脚本体或路由权 → 回提案。
