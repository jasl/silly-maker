# Presentation RNG（表现层可序列化随机流）

状态：**已交付（2026-08-29 当日闭合）**。证据门：外部实验仓（imouto
golden baseline）封板审计的「字效瞬态通道」缺口——原作字效是盒内随机
位置 + WAIT→SHOW→MOVE 帧钟，克隆按 E4 裁决用首格@盒中点静态片，夜抽
签/眨眼相位放渲染器本地零权威随机。逐帧平价需要**同一条已提交轨迹重
放时画面逐次相同**，renderer 本地 `Math.random()` 给不了；而
ambient-loop-motion 提案早已把「随机时点的非周期表现」判给「Story
renderer 自有实现或将来证据驱动的另案原语」。本案即该另案原语的最小
形态：只有确定性随机流，不含粒子系统、不新增文档家族、不进权威面。

## 合同

`@sillymaker/ui`（`presentation-run` 族）：

- `derivePresentationSeedV1(parts: readonly (string | number)[]): number`
  ——把稳定标识（occurrence id、瞬态序号、cue id、effect id、已提交序
  号……**跨重载稳定的已提交事实，永不掺 presentation epoch 或墙钟**）
  按类型标签折叠成非零 uint32 种子（FNV-1a 变体，
  `["a", 1]` / `["a1"]` / `["a", "1"]` 互异；空表/非有限数抛
  `ui.presentation_rng_*` 稳定诊断）。折叠为 0 时映射到固定常数（
  xorshift32 不能踩 0）。
- `createPresentationRngStreamV1(seed | state): PresentationRngStreamV1`
  ——`nextUint32()` / `nextInt(exclusiveMax)`（拒绝采样无偏）/
  `nextIntInRange(min, maxInclusive)`（盒内散布形）/ `state()`（纯数据
  快照 `{ algorithm: "xorshift32-v1", cursor }`，回传即精确续流）。
- 生成器核与权威 `RuleRngV1` 同为 xorshift32（一套受审计的核，两侧不
  共享任何状态）；表现流无 purpose/trace 机制——那是事务性权威抽签的
  审计面，表现侧不需要。

## 边界（零权威）

- 流与快照永不进入 State / Save / digest / replay / CommandLog；
- 权威代码（规则/效果/监视器）继续用会话的 `RuleRngV1` 抽签——本原语
  在 ui 包，权威面根本 import 不到；
- 种子从跨重载稳定的已提交事实派生；presentation-run epoch 会随重载或
  successor publication 改变，不能作为种子。同一条已提交轨迹 → 同一画面；load/replay 后
  重放自然一致，不需要任何持久化；
- `state()` 快照只服务**单次运行内**的续流（remount/HMR 连续性），
  想跨 Save 恢复表现相位 → 停（那是把表现拽进权威面的信号）。

## 消费者

- 外部实验仓（golden baseline 下一轮重写）：字效盒内散布、夜抽签、眨
  眼相位——封板尾注点名的三处 renderer 本地随机全部换到本原语；
- 仓内：ui 单元测试钉派生稳定性、tag 区分、流重放、快照续流、无偏边
  界与「与权威核同步进」（seed 1 首步 = 0x42021）。

## 停

- 粒子系统 / 天气系统 / 随机表现的文档家族（内容技巧或另案证据）；
- 表现流状态进 Save 或权威 State；
- 权威路径改用本原语（`RuleRngV1` 是唯一权威抽签面）；
- 墙钟/时间作种子。
