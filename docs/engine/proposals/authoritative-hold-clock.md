# Authoritative hold clock proposal（权威计时持有）

状态：**2026-08-19 所有者接受**（含引擎侧代码授权，覆盖 template 与
examples）。同日所有者先裁决 open questions 的 q2–q6（毫秒单位、无独立
到期、不设无根据上限、首消费者无偏好且不加新 demo、不 bump revision），
再对 q1/q7 提出正交性质询；本文按质询收敛——**归并删除 `pause`、取消
`hold_abort` 动词**——随整案一并被接受。切片顺序与验收由
[Authoritative Hold Clock V1 计划](../plans/2026-08-19-authoritative-hold-clock.md)
拥有；[production-floor sequence](../plans/2026-07-30-production-floor-sequence.md)
仍是唯一跨计划排序入口。

本文修正 [VN presentation runtime](../design/vn-presentation-runtime.md)
§5 PendingInteraction 词汇：新增 `hold`，并把 `pause` 归并进 `hold` 后
删除（显式迁移，见正交性一节）。

## 证据门

外部实验仓（`tmp/imouto-native`）在引擎零改动下收完可绑该句的 STORY。
活清单 `docs/fidelity-gaps.md` 把剩余 1:1 分成：

- **E1**：两句台词之间画面停着，`WAIT` / CE273 / CE274 / CE294 / CE299
  按帧走，期间可换帧、画 `■□` 条、问警戒/剩余时间，到点再续。
- **E2**：持有期滴权威（口 H 每 5s `V157+=1`；CE285–288 浮字后加分；
  CE277 警戒；CE299 射精感）。是 E1 的姐妹命令，不是第二套钟。
- **E3 / E4**：热区与装饰帧集钟。轴归属见正交性与钟表分工两节。

现有引擎不够用的实证：

- 叙事只在 say / choice / pause / barrier 停。`kind: "stage"` 无持有时
  打开下一张只会闪一帧。
- 实验仓 6 本 once-hold flipbook 用 renderer 墙钟播直线
  `SHOW→WAIT→SHOW`。不能问剩余、不能中止、不能滴权威、回放不进
  CommandLog。
- 已有 `pause`（`durationMs` + `skippable` + `resume`）由 Host 等墙钟后
  `resume`，时间本身不进权威：没有可序列化剩余、没有分批、没有持有期
  换帧或滴。Engine Lab `cal-hold` 在用。

P0-2 ambient loop 是**零权威**表现钟，冻结停驻相位。E1 会写权威剩余与
下一段叙事，不是同一缺口。

明确不做：复活 MV 并行 Common Event 解释器；把 `Date.now()` /
`requestAnimationFrame` 直接写入 State / Save / digest。

## 正交性（q1 / q7 的回答，2026-08-19）

pending 词汇按「在等谁」分工才正交：

| kind                   | 在等谁                          |
| ---------------------- | ------------------------------- |
| `say`                  | 玩家确认                        |
| `choice`               | 玩家决定                        |
| `presentation_barrier` | 一次表现收敛（transition 完成） |
| `custom`               | 注册的扩展面                    |
| `pause`                | **Host 的墙钟**——横跨两轴       |

`pause` 与 hold 的重叠是真的：它表达「过一段时间再续」（hold 的轴），
却由 Host 决定何时 `resume`（barrier 的轴），时间不进权威。hold 落地后
`pause` 严格是子集——无滴、无换帧的直线 hold 在最低批节奏下就是「到期
一条 commit」，成本与 pause 相同；`skippable` 旗子原样带走；「载入后重
等全长」只是 Host 不提前 flush 的批策略，而「载入续走剩余」才是 E1 要
的正确行为。保留两个词汇 = 作者每次都要在两种停点里选，选择泄漏引擎内
部——正是质询指出的风险。

**收敛：归并并删除 `pause`。** 本车道内完成：Engine Lab `cal-hold`
（唯一活消费者）机械迁移为等价 hold——可见行为不变、不加新 demo 内容
（尊重 q5）；删除 `pause` kind 与 `resume` resolution。已核实全仓
fixture / 维护 corpus 无任何 pause pending，删除不需要存档迁移；若 M1
落地前出现一份，按既有 corpus 纪律显式迁移（→ 等价 hold，remaining =
全时长）。符合「破坏式重塑允许，但必须显式迁移并删除旧权威路径」的仓库纪
律。归并后每种 pending 恰好等一个对象，词汇比现在还小。

q7 同理收敛：`hold_abort` 不是被 defer 的功能，而是**取消的动词**。中
止不是 Host 的决定——Host 永远只报时间流逝；到期、条件中止、中段换帧
全部在 commit 内由权威状态 + hold 块声明的条件推导（复用 branch 的
`when` 词汇，后切片交付）。于是 defer 清单不再含「别的组件已承担、这里
又留一份」的项：E3 是输入轴（`StageHitRegionV1` + input router 合同已
有，缺的是接线车道）；E4 与制作名单圆擦除是装饰性表现钟（ambient /
Timeline 轴），分界见钟表分工。

## Shape（设计草图；字段名以 M0 admission 为准）

### 1. 新的 PendingInteraction：`hold`

hold 是两句台词之间的唯一 pending（不与 say/choice 并行）。上一句 say
已 resolve，舞台画面留在上一拍；对话面板不进 History。

概念字段：

- `totalMs` / `remainingMs`：正整数毫秒（q2 裁决）。权威单位是毫秒，不
  随设备刷新率漂移；Host 用表现钟量毫秒再提议。原作 `WAIT n`（60fps
  帧）由 Story 在编译期换算 `round(n × 1000 / 60)`：WAIT 30 = 500ms、
  WAIT 50 ≈ 833ms，半帧内偏差玩家不可感，换算属内容侧。
- `skippable`：作者意图，沿用原 pause 的旗子。原作 `WAIT` 一律不可跳；
  skippable 持有允许玩家输入 / `skipCutscenes` 把余量一次折清——折清
  仍是一次 `hold_tick` commit 进日志，不绕过 pending（§6 既有纪律）。
- 到期去向 = 叙事图 `next`，不抄进 pending 字节。
- 入院复用既有 duration 入院（safe integer、≥1；`pause` 现行家族顶
  600,000ms 一并沿用，实测真实内容最长 CE281 470f ≈ 7.8s）。**不发明
  新的游戏性上限**（q4 裁决；E6 的 16 格教训——无根据顶被像素级克隆
  绊出来才修）。若未来真实消费者需要更长持有，按 E6 纪律撤顶，不辩护
  习惯数。

### 2. 唯一推进：`hold_tick`

Host / headless / skip 都走同一条 resolution：

```text
narrative.resolve(expectedOccurrenceId, { kind: "hold_tick", elapsedMs })
```

- `elapsedMs` 为正整数。会话结算 `consumed = min(elapsedMs,
  remainingMs)`——超量截断，不拒绝（帧突刺不该炸档，也不逼 Host 在边
  缘做防御性钳制）。
- `remainingMs` 减到 0 的那次 commit **同时到期**：runner 写下一段
  （q3 裁决：没有独立 `hold_expire`）。
- `remaining > 0` 时 pending 不清、occurrence 不变——同一边界，字段递
  减。这是本案唯一真正的新合同行为：**部分解决不消费边界**的
  resolution。stale occurrence 围栏照旧：旧 UI、双击、晚到 timer 不能
  tick 已变化的边界。
- 回放只重放这些 resolution；executor 禁读墙钟。

### 3. 分批：终态只跟毫秒和

470f ≈ 7,833ms 的持有不得产生 470 条命令，也**不限制** Host 的批节奏
（q4）。Host 按表现钟把流逝折成批：无滴、无 HUD 需求时一条到期 commit
就够（与旧 pause 等成本）；有滴/条时按声明粒度对齐；autosave /
pagehide 前把已积累流逝 flush 成一次 tick，持有中存档才真的保得住进
度。

CommandLog 长度可因批切不同；**权威终态 / digest / replay 只依赖毫秒
和**。带滴与换帧时同样成立——效果按阈值穿越结算（§5），不按 tick 次
数。测试锁终态，不锁「必须 N 条 tick」。

### 4. 钟的分工（与 E4 / ambient / Timeline 的分界）

| 钟                                   | 拥有                                                   | 不做             |
| ------------------------------------ | ------------------------------------------------------ | ---------------- |
| 权威 `remainingMs`                   | Save、回放、六格条 / `icon04`％、到期与条件去向、E2 滴 | 读 `Date.now()`  |
| Presentation clock                   | 量毫秒、提议 `hold_tick`；冻结画面停止提议             | 自己写 State     |
| ambient / Timeline / 帧集（E4）/ CSS | 眨眼、吐息、装饰循环、制作名单擦除                     | 冒充持有、滴权威 |

分界石蕊：**这段时间有没有玩法意义——要进 Save/回放、能滴权威、能被
条件打断？** 有 → hold；没有 → 表现钟。E4 的帧集原语永远在右列，不会
与 hold 长到一起；六格条与射精感％读 hold 的剩余毫秒（或同一 commit 写
下的权威域），不开第二口权威钟。

### 5. E2（同计划后切片，不是另一案）

hold 块可选 tick 效果：同一次 `hold_tick` commit 里发一条 Story 注册的
命令。结算按**阈值穿越**：Story 声明粒度（如每 5,000ms +1），效果吃
`(消耗前累计, 消耗后累计]` 区间里跨过的阈值数——与批切无关，天然保持
毫秒和不变性。不写进 flipbook 帧，不发明并行解释器。

V1 直线持有可以没有 tick 效果。CE285–288 / CE277 / CE299 等活路径在后
切片接第一条穿越结算效果。

### 6. 与 stage / flipbook

持有开始时舞台已是目标画面（上一拍 stage 或本块附带的一场 mutation）。
直线 `SHOW→WAIT→SHOW` 的第二张在**到期后的下一拍**打开，不是持有中闪
一帧。

中段换帧（偷看 `3-02…06`、口 `4-14↔4-15`）是后切片：按经过毫秒的阈值
穿越应用已声明的 stage 批，与滴同一结算法。现有 6 本墙钟 flipbook 不在
V1 一次迁完；第二消费者只迁一条活路径证明合同，其余仍是 Story 刀。

## 裁决记录（2026-08-19，所有者）

1. **q1 扩写 pause？** 质询后收敛为归并删除（见正交性一节），随整案一
   并被接受。
2. **q2 刻的单位** → 毫秒。设备刷新率不同不该让演出不稳；60fps 习惯数
   不进权威。
3. **q3 独立 hold_expire** → 不要，先做无妨。tick 减到 0 即到期。
4. **q4 批节奏 / 上限** → 不设无根据限制。E6 已证明无根据限制绊倒实现
   （16 格上限被 1:1 克隆抓出）。撤 36000 建议顶；skip 折余量自由；只
   沿用既有 duration 入院家族边界。
5. **q5 首消费者** → 无偏好，不加新 demo。Lab 只做删除 pause 所需的
   `cal-hold` 机械迁移；真实展示由实验仓活路径承担。
6. **q6 Save revision** → 克隆未验收，bump 与否不关键；按建议不 bump，
   走加法词汇；已核实无 pause pending 存档需要迁移。
7. **q7 defer 的正交性** → `hold_abort` 取消（中止 = 声明条件）；E3 /
   E4 / 制作名单按轴归属，defer 不再含重叠项。

## 验收（随接受锁定）

- Headless：同一 hold 用 `{500,500,500}` 与 `{1500}` 两种批切，终态
  digest 相同；replay 不读墙钟。
- Save：持有中（已 flush 部分流逝）存档，load 后 `remainingMs` 保留，
  续 tick 到期走到同一句。
- 浏览器：迁移后的 Engine Lab `cal-hold` 可见行为不变；冻结画面停止提
  议、剩余不变；恢复续走。
- 归并：`pause` kind 与 `resume` resolution 已删除；受影响测试显式迁
  移；四 runtime parity 不回退。
- 实验仓一条活路径不再用 silent stage 闪帧，也不再把该段墙钟写入权威。

## 停

沿用 production-floor §9。本提案特有：

- 任何实现把墙钟写入 authoritative State / Save / digest；
- 逐帧一条命令成为推荐用法；
- Host 获得路由权（决定中止/去向），而不是只报时间；
- 归并迁移窗口结束后仍存在第二个计时停点词汇；
- 用 flash stage 或墙钟 flipbook 宣称 E1 完成；
- 复活 MV 解释器或第二套叙事 VM。
