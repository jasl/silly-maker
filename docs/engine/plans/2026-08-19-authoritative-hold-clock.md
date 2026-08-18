# Authoritative Hold Clock V1（权威计时持有）

状态：2026-08-19 起草，**同日所有者接受，当前 active plan**（引擎侧代
码授权覆盖 template 与 examples）。案文、正交性收敛（归并删除
`pause`、无 `hold_abort` 动词）与裁决记录见
[authoritative-hold-clock 提案](../proposals/authoritative-hold-clock.md)。
本文只拥有实现切片顺序、admission 落地与验收；
[production-floor sequence](2026-07-30-production-floor-sequence.md)
仍是唯一跨计划排序入口。

## 1. Positioning

实验仓高保真剩下的核心引擎缺口：两句台词之间按毫秒持有画面，剩余时长
可保存、可回放，Host 只提议流逝。E2（持有期滴权威）与条件中止/换帧是
同一口钟的后切片，不另开计划。E3 热区、E4 装饰帧集、制作名单不在范围
（轴归属见提案钟表分工）。

不变量（每个切片都必须保持）：

- **单一权威**：只有 Session commit 能改 `remainingMs` 与下一段叙事。
  Presentation clock / rAF / `Date.now()` 不进 State、Save、digest。
- **一条 resolution**：推进只有 `hold_tick({ elapsedMs })`；减到 0 的
  commit 同时到期；中止/换帧由块上声明条件在 commit 内推导，Host 无路
  由权。
- **批切不影响终态**：毫秒和相同 ⇒ Snapshot / digest 相同；滴与换帧按
  阈值穿越结算。
- **无无根据上限**（E6 教训）：只沿用既有 duration / canonical int 入
  院家族，不发明游戏性顶。
- **车道终态只有一个计时停点**：`pause`/`resume` 在本车道内归并删除，
  `cal-hold` 显式迁移；已核实无 pause pending 存档，无需 corpus 迁移。
- **双消费者**：迁移后的 Engine Lab `cal-hold`（机械等价，不加新
  demo）+ 实验仓一条真活 `WAIT`。Cat Cafe 不进 V1。

## 2. Admission 裁决（对应提案裁决记录）

- 新 kind `hold`（`totalMs` / `remainingMs` / `skippable`），正整数毫
  秒；原作帧数在 Story 编译期换算 `round(n × 1000 / 60)`。
- `hold_tick.elapsedMs` 正整数；超量截断 `min(elapsedMs, remainingMs)`，
  不拒绝。
- **部分解决不消费边界**：`remaining > 0` 时 pending 不清、occurrence
  不变——M0 唯一新 evaluator 行为，测试显式锁。
- 无独立 `hold_expire`、无 `hold_abort`。
- skippable 折余量与 `skipCutscenes` 沿用 §6 纪律：折清是一次真 tick
  commit，不绕过 pending。
- Save revision 不 bump；`pause` 删除已核实不涉及存档迁移。
- 字段名与诊断码以 M0 strict admission 为准。

## 3. Slices

一次只领一个切片。

### M0 — Base 合同（`@sillymaker/base`）

- `PendingInteractionV1` 增 `hold`；`InteractionResolutionV1` 增
  `hold_tick`；evaluator 的部分解决语义（occurrence 稳定、超量截断、归
  零到期）；runner 停在 hold、到期按 `next` 续。
- 单测：parse/round-trip、非法 `elapsedMs`、`{500,500,500}` ≡
  `{1500}` 终态相同、持有中 Save/load、replay 禁墙钟、occurrence 跨
  tick 稳定、超量截断。
- 同步 `vn-presentation-runtime.md` §5 与 `features.md`。本切片不接
  Host、不删 `pause`（下一刀原子做）。

### M1 — Host 提议 + `pause` 归并删除

- Dialogue player / Narrative Host：pending 为 hold 时按 presentation
  clock 积累毫秒、折批提议；冻结画面停提议；页面不可见沿用既有
  suspend；skippable 输入与 `skipCutscenes` 折余量；autosave /
  pagehide 前 flush 已积累流逝。
- `cal-hold` 从 `pause` 机械迁移为等价 hold；删除 `pause` kind、
  `resume` resolution 与 player 的 pause 处理；受影响测试显式迁移；四
  runtime parity 复跑。
- 验收：迁移后 Lab 浏览器行为不变（停顿后续句；冻结剩余不变）；
  headless 手动钟测试；`deno task check` 全绿。

### M2 — 作者块 + 实验仓第二消费者

- interaction-table kit `hold` 块（毫秒；可选开场 stage 批）；Flow 图
  新节点种类；template 不强制消费。
- 实验仓迁一条活路径：独浴 `006-01` 后 WAIT 30（500ms），或一本现有
  flipbook 改为 hold 到期开末帧。禁止 silent flash stage。
- 验收：该路径持有中 Save/load 剩余保留；该段墙钟退出权威路径；
  `story-authoring.md` 与实验仓 `fidelity-gaps.md` 回流。

### M3 — 条件、换帧与 E2 滴（证据够再领）

- hold 块可选：tick 效果（阈值穿越结算）、按经过毫秒的 stage 批、声明
  条件（复用 branch `when`）在 commit 内改道。
- 六格条 / `icon04`％ 读 `remainingMs` 或同一 commit 写下的权威域。
- 第一消费者：Engine Lab 一条穿越滴单测路径；实验仓接一条已有投影条的
  活路径（CE277 警戒或口 H 每 5s），不扫全表。
- 验收：滴在 `{500,500,500}` ≡ `{1500}` 下权威加分相同；换帧按阈值
  开，不闪帧。

## 4. Defer

- E3 热区接线与 CE19 双区连击（输入轴；`StageHitRegionV1` 合同已有）。
- E4 装饰帧集 / 制作名单圆擦除（表现钟轴；分界石蕊在提案 §4）。
- 每条目多条并行 hold；MV trigger=2 解释器形态。
- 一次迁完 6 本 flipbook 与全部澡/厕/素股/通勤 `WAIT`（Story 刀逐条
  走）。

## 5. Stop conditions

沿用 production-floor §9。本计划内特别注意：

- 墙钟进入 authoritative State / Save / digest / replay → 停；
- 推荐用法变成逐帧一条命令 → 停；
- Host 需要路由权才能表达某条原作路径 → 回提案（正交性一节）；
- 归并后仍需要保留 `pause` 才能满足某个真实消费者 → 停（两个消费者合
  同冲突）；
- 用 flash stage 或墙钟 flipbook 关闭 E1 → 停。
