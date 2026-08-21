# Hold `when` proposal（持有声明条件改道）

状态：**2026-08-21 所有者下令开启**（认领权威持有钟车道唯一显式
defer）。切片顺序与 admission 由
[Hold When V1 计划](../plans/2026-08-21-hold-when.md) 拥有；
[production-floor sequence](../plans/2026-07-30-production-floor-sequence.md)
仍是唯一跨计划排序入口。本文只定合同：Host 仍然只报流逝毫秒，中止在
`TimeTickV1` commit 内由权威状态 + hold 块声明的 `when` 推导。同日
复审修订 §2–§5：改道时刻定义在 occurrence 时间线上（截断点），不是
commit 末尾的一个阶段——初稿的「commit 末尾评一次」是批切可变的。

本文兑现 [authoritative-hold-clock](authoritative-hold-clock.md) q7：
`hold_abort` 不是被 defer 的功能，而是**取消的动词**。中止不是 Host
的决定。

## 证据门

外部实验仓把不需要新合同的 STORY 活债收完（CE248 第二层 CHOICES、
CE251 素股第一票后 SHOW `bg_001_01`）。剩下的真中止路径已经写在活清
单上，不再是「等一条出现」：

- **警戒抓包**：偷窥 / 警戒条持有期间，权威警戒升到门槛 → 改道抓包
  句，不能把整段 WAIT 走完再问。
- **深夜房条中途觉醒 / 厌恶**：CE281 8×60f 持有期滴睡眠深度与嫌恶，
  中途越线必须离开条、进觉醒/厌恶，不能等到期。

两条都是「同一口钟上的状态谓词」，不是第二套叙事 VM，也不是 Host 按
钮。hold 中热区（条还在走时点身体）是**输入轴**，见 open question
q1——V1 不靠它开门。

现有引擎不够用的实证：hold 块只有 `next`（到期 / skip 折清）。tick
效果与监视器可以在持有期写权威域，但写完之后 runner 仍停在同一
occurrence，直到 `remainingMs` 到 0。没有「谓词为真则本 commit 改
道」的声明口。

明确不做：复活 `hold_abort` / `resume` 以外的中止动词；让 Host 或
renderer 决定去向；监视器获得路由权（[parallel-monitors](parallel-monitors.md)
§5 已禁）；把热区激活偷做成 hold 的第二种 resolution。

## Shape（设计草图；字段名以 M0 admission 为准）

### 1. hold 块加法：`when` 臂

复用 branch 的 `when` 词汇（同一套字段比较 / `and`）。hold 块可选：

```ts
when?: readonly {
  readonly when: WhenCompare; // 与 branch case 同一入院
  readonly next: string;      // 文档内块名或 @label
}[];
```

- 每条臂必须带谓词（没有隐式 else——else 是「继续持有 / 到期走块上
  的 `next`」）；
- 声明序第一条命中获胜，与 branch 相同；
- `when` / 改道 `next` 是节点声明，**不抄进 pending 字节**（与到期
  `next` 同纪律）。

### 2. 唯一推进仍是 `TimeTickV1`；改道时刻是时间线上的点

Host / skip / headless 继续只报 `elapsedMs` + 可选 hold 围栏。关键
裁决：**`when` 不是 commit 末尾的一个阶段，而是 occurrence 时间线
上的截断点**。若把评测推到全部穿越与监视器之后，`{1000}×8` 与
`{8000}` 会在「滴了几次才改道」上分岔——恰好在两条证据路径上违反钟
合同「终态只跟毫秒和，不跟 Host 批切」。所以围栏结算按时间序步进：

1. **t=0 评臂**：按 commit 起始权威状态（含此前未围栏 tick、普通
   命令写入的一切）评 `when`，命中 → 零消耗改道；
2. **逐穿越步进**：hold 自身的状态变化只发生在穿越瞬间（tick 效
   果、`frames` 换帧）。每应用一个穿越评一次臂，第一条命中即**截
   断**——本 hold 消耗 = 到命中瞬间的毫秒，其后穿越与换帧不再应
   用，occurrence 结束，runner 同 commit 走该臂 `next`；
3. **到期 = 时间线走完而无臂命中**（超量仍截断到 remaining）。最
   后一格穿越恰落在到期瞬间时：穿越先应用、臂命中赢，无需特例。

截断丢弃的余量**不预折改道目标**——与既有纪律同源：陈旧上报不得预
折玩家没看过的后继 hold。`settleMonitorsV1` 是会话级消费者，**仍收
全额上报毫秒**、维持既有折后顺序；hold 轴的截断不影响会话轴。

未围栏 tick 仍不折 hold、也不评 hold `when`；它写下的状态在下一次
围栏结算的 t=0 检查（或入场检查）浮现。

### 3. 谓词粒度：与 `activeWhen` 同一条纪律

臂读「commit 起始状态 + 本 hold 自身已应用的穿越」。这与交付引擎里
`settleMonitorsV1` 的 `activeWhen` 读 command-start 状态是同一条粒
度缝：同一结算内监视器事件（或外部命令）写下的状态，臂到**下一次
结算的 t=0** 才看见。推论：精确到瞬间的改道只对「hold 自身 tick 效
果驱动的臂」承诺——两条证据路径（警戒滴、睡眠/嫌恶滴）都是这种；监
视器驱动的臂是「下一结算」粒度，与监视器系统自身已接受的陈旧度一
致。V1 不为合并时间线重写监视器结算。

### 4. 入场也评一次

打开 hold 的那次 commit（还没有流逝）按**事务内工作状态**评
`when`——runner 在效果节点之后才开 hold，入场检查必须看见同事务已
应用的效果。入场时谓词已真 → 立刻改道，不演一整条空条。这覆盖「进
条前警戒已经满 / 睡眠深度已经破」的原作短路径。

### 5. skip 折清：不能越过截断点

`skippable` 折清仍是一次围栏 tick、`elapsedMs = remainingMs`，代入
同一条步进规则——**skip 不能快进穿过被抓的那一刻**。折清途中臂命中
→ 在命中瞬间截断改道，消耗与滴数与按节奏播放完全一致；走完无命中
才走到期 `next`。终态只跟毫秒和 + 权威状态，不跟 Host 批切。

### 6. Save / 回放 / digest

中持有存档只多了「下一次围栏 tick 会看见的状态」——`when` 本身不进
Save。同一条 CommandLog + 同一初始状态必须重导出同一改道。digest
不因声明了 `when` 而变化，除非某次 commit 真的走了改道（那是状态
差，不是声明差）。

## 边界

- V1 谓词只读权威状态（branch 上下文字段）。不读墙钟、不读 pointer、
  不读「本帧点了哪块热区」除非那次点击已经作为**普通命令**写入状
  态（见 q1）。
- 改道是叙事图跳转，不是第二 pending。hold 仍是唯一边界；改道后的
  下一拍是普通 say/choice/hold/end。
- 一条 hold 上的 `when` 臂数跟 branch 同一入院顶，不发明新游戏性上
  限。
- base 层**不发明数据化谓词 DSL**：时间线步进助手与
  `applyElapsedToHoldV1` 同级落在 base，收有序谓词回调（沿
  `activeWhen` 先例），三个 runner 共享步进语义；比较语法留在 kit
  （branch `when` 词汇）。
- 作者指引（非合同）：带臂 hold 保持 `tickQuantumMs ≤
  tick.everyMs`——截断瞬间是精确的，但承载它的 commit 按 quantum
  落地，quantum 过大时条会在画面上跑过命中点再回跳。

## 验收草案

- 穿越把谓词写真的**同一瞬间**截断改道：`{500,500,500}` ≡
  `{1500}` 下改道时刻、消耗毫秒、已应用穿越数与终态 / digest 全
  同；
- 入场时已真 → 零流逝改道，pending 不停留；
- skip 折清途中命中 → 命中瞬间截断，滴数与按节奏播放一致，不走到
  期 `next`；
- 改道目标是另一 hold 时，被截断的余量不预折它；
- 监视器写真的臂在下一次围栏结算 t=0 改道（粒度合同）；
- 声明了永不命中的臂 → Save / digest / 回放逐字节不变；
- 中持有 Save/load 后，下一次围栏 tick 按载入状态评，不重演墙钟；
- Host / UI 零新 resolution kind；对 hold 的 input resolve 仍
  `interaction.kind_mismatch`；
- 双消费者：Engine Lab 锁两种粒度（自身 tick 同瞬间截断 + 监视器
  下一结算）；实验仓接一条真中止活路径（警戒抓包或深夜房条中途觉
  醒/厌恶，先到先接）。

## Open questions（建议随 admission 裁决）

1. **hold 中热区**（条还在走时激活身体区）是输入，不是时间派生谓
   词。V1 建议**显式 defer**：先交货真中止两条（警戒 / 觉醒）。若
   热区必须在条中途改道，另开 admission——要么允许一条 hold 围栏下
   的普通语义命令写状态再靠 `when` 读，要么承认那是第二种边界。不
   把 regionId 塞进 hold resolution。
2. 入场评测是否要一个显式空 tick——**已随 admission 裁决**：runner
   在打开 hold 的同一 commit 内联评（事务内工作状态），不发明 0ms
   `TimeTick`。

## 停

- 新增 `hold_abort` / Host 选臂 / renderer 决定去向；
- 监视器或热区获得路由权（改写 pending / 跳段）；
- `when` 抄进 pending / Save 字节；
- 墙钟、指针坐标、或未入权威的 hover 进入谓词；
- 推荐用法变成「每个谓词一跳就一条命令」。
