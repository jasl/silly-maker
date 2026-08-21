# Mid-hold Input V1（hold 中输入写入）实施计划

状态：**2026-08-22 开启**（所有者当日裁决接受提案，open questions
q1–q3 全按建议采纳）。合同：
`docs/engine/proposals/mid-hold-input.md`。认领
[hold-when](2026-08-21-hold-when.md) 唯一输入轴 defer（提案 q1）。
本文只拥有切片顺序、admission 落地与验收；
[production-floor sequence](2026-07-30-production-floor-sequence.md)
仍是唯一跨计划排序入口。

## Admission 裁决（车道开启时固化）

- **零新引擎原语。** 基座 dispatch 本无 pending 门（Lab
  `lab.toggle_collector` 成文先例；监视器挂起下写权威域是已交付合
  同）。本车道不改 base 代码，只把组合钉成合同：普通命令写 + hold
  自身 `when` 臂读。
- **围栏是 Story 惯例（q2）。** 输入写命令载荷带
  `expectedHoldOccurrenceId`，处理器一行比较（与
  `evaluateTimeTickV1` 同谓词），不同 occurrence 整体拒绝
  （`*.hold_occurrence_stale` 同族码）。不加基座出口；第三个消费者
  出现再议。
- **只写不路由。** 输入命令不得碰 pending、不得结算时间（时间独占
  于 `TimeTickV1`）、不得改道。改道权 100% 在 hold 声明的 `when`
  臂；读取粒度为下一次围栏结算 t=0（监视器同款，已交付合同）。
- **清除责任是 Story 纪律（q3）。** 臂命中后改道目标消费并清除写请
  求字段；引擎不认识请求字段。
- **热区路由零 UI 改动。** `onHitRegionActivate` 在
  `pending.kind === "hold"` 时由应用路由到输入写命令；零新
  resolution kind；对 hold 的 input resolve 仍
  `interaction.kind_mismatch`。

## 里程碑

- M0 Engine Lab 输入粒度 conformance + 文档：Lab 声明一条围栏输入写
  命令与一条读该字段的 hold `when` 臂（可挂在现有 drill 汇路上）。
  测试锁：持有中写 → 下一次围栏结算 t=0 切断；围栏过期写整体拒绝
  （持有结束/改道后的迟到点击不污染后继 hold）；写入不破批切不变；
  中持有 Save/load 后写请求字段存活。features.md 与
  story-authoring.md 各一段（模式 + 围栏纪律 + 清除责任）。
- M1 实验仓活路径 + 收口：CE18 条中途点身体第一条活路径——zone 激
  活在触摸条挂起时路由到围栏写命令，bar 的 `when` 臂下一结算改道
  （切换当前动作还是排队下一动作，按解码证据在克隆刀上定）；克隆
  NOTES / fidelity-gaps E3 收口；production-floor / AGENTS 指针更
  新。

## 验收

- Lab：持有中激活 → 下一围栏结算 t=0 改道，occurrence 语义与
  stakeout 粒度一致；
- 围栏过期的输入写整体拒绝，Save / digest / 回放逐字节不受迟到点击
  影响；
- 批切矩阵下（`{500,500,500}` ≡ `{1500}`）写入落点不改变改道时刻与
  终态；
- CommandLog 无新 resolution kind；对 hold 的 input resolve 仍
  `kind_mismatch`；
- 实验仓一条真输入轴活路径 + E3 台账收口。

## Defer

- 无新增。重叠热区多区载荷、帧表 lint、警戒抓包、Studio 臂编辑各随
  自身车道/证据门（见提案与 production-floor）。

## Stop conditions

沿用提案「停」节：hold 节点获得输入 schema 或第二种 resolution →
停；热区/指针获得路由权 → 停；坐标/hover 进权威态或 Save → 停；输
入命令结算时间或折 hold 余额 → 停；每 pointer-move 一条命令 → 停。
