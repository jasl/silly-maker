# Hold `when` proposal（持有声明条件改道）

状态：**2026-08-21 所有者下令开启**（认领权威持有钟车道唯一显式
defer）。切片顺序与 admission 由
[Hold When V1 计划](../plans/2026-08-21-hold-when.md) 拥有；
[production-floor sequence](../plans/2026-07-30-production-floor-sequence.md)
仍是唯一跨计划排序入口。本文只定合同：Host 仍然只报流逝毫秒，中止在
`TimeTickV1` commit 内由权威状态 + hold 块声明的 `when` 推导。

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

### 2. 唯一推进仍是 `TimeTickV1`

Host / skip / headless 继续只报 `elapsedMs` + 可选 hold 围栏。围栏
tick 的 commit 顺序固定：

1. `applyElapsedToHoldV1` 折 remaining（超量截断，occurrence 不变或
   到期）；
2. 本段已有的阈值穿越：tick 效果、`frames` 换帧；
3. `settleMonitorsV1`（监视器在 hold 折完之后，既有顺序）；
4. **新**：对折后权威状态评 `when`。命中则**结束该 occurrence**，
   runner 走该臂 `next`，丢弃剩余毫秒——本 commit 不再为丢弃的余量
   计穿越。

未围栏 tick 仍不折 hold、也不评 hold `when`（全局监视器可以写状态；
下一次围栏 tick 或入场评测会看见）。

### 3. 入场也评一次

打开 hold 的那次 commit（还没有流逝）按**当时已提交状态**评 `when`。
入场时谓词已真 → 立刻改道，不演一整条空条。这覆盖「进条前警戒已经
满 / 睡眠深度已经破」的原作短路径。

### 4. skip 折清

`skippable` 折清仍是一次围栏 tick、`elapsedMs = remainingMs`。先走
完全部剩余穿越（与现合同相同），再评 `when`。折清后谓词为真 → 走
改道，不走到期 `next`。终态仍只跟毫秒和 + 权威状态，不跟 Host 批
切。

### 5. Save / 回放 / digest

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

## 验收草案

- 围栏 tick 在穿越把谓词写真的同一 commit 改道；`{500,500,500}` ≡
  `{1500}` 下改道时刻与终态相同；
- 入场时已真 → 零流逝改道，pending 不停留；
- skip 折清后谓词为真 → 改道，不走到期 `next`；
- 中持有 Save/load 后，下一次围栏 tick 按载入状态评，不重演墙钟；
- Host / UI 零新 resolution kind；对 hold 的 input resolve 仍
  `interaction.kind_mismatch`；
- 双消费者：Engine Lab 一条穿越改道单测路径；实验仓接一条真中止活
  路径（警戒抓包或深夜房条中途觉醒/厌恶，先到先接）。

## Open questions（建议随 admission 裁决）

1. **hold 中热区**（条还在走时激活身体区）是输入，不是时间派生谓
   词。V1 建议**显式 defer**：先交货真中止两条（警戒 / 觉醒）。若
   热区必须在条中途改道，另开 admission——要么允许一条 hold 围栏下
   的普通语义命令写状态再靠 `when` 读，要么承认那是第二种边界。不
   把 regionId 塞进 hold resolution。
2. 入场评测是否要一个显式 `when` 空 tick，还是 runner 在打开 hold
   的同一 commit 内联评——建议内联，不发明 0ms `TimeTick`。

## 停

- 新增 `hold_abort` / Host 选臂 / renderer 决定去向；
- 监视器或热区获得路由权（改写 pending / 跳段）；
- `when` 抄进 pending / Save 字节；
- 墙钟、指针坐标、或未入权威的 hover 进入谓词；
- 推荐用法变成「每个谓词一跳就一条命令」。
