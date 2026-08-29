# Ambient loop motion proposal（存在期循环动效）

状态：提案（2026-08-15）；**2026-08-15 由所有者接受**（含同日泛化性评审补
充），**同日 M0–M3 全部交付**——切片顺序、admission 裁决与交付记录见
[Ambient Loop Motion V1 计划](../plans/2026-08-15-ambient-loop-motion.md)。
证据门（当时）：外部实验仓
capability backlog P0-2 把它列为下一波高密度表现内容的显式前置——呼吸起伏、
自动眨眼/表情漂移、仪表脉动等**存在期持续**的表现行为，现有 motion 只绑 cue 边沿
一次性播放；用权威 tick 命令驱动会灌爆命令日志（早期实验"并行事件双写灾难"已记
档为反例——不要发明运行时驱动器）。

## Shape（设计草图；字段名以实现切片的 admission 为准）

### 1. 循环即普通 motion 文档

不建第二套动画格式。循环使用现有 `sillymaker.motion` 文档（整数关键帧 + 分段
easing），循环语义由**绑定**声明，不进文档本体——与"文档拥有播什么、绑定拥有边
怎么表现"的既有分层一致。Workbench 原样可编辑（增加循环预览开关即可）。

### 2. 存在期绑定（presence binding）

一次性 motion 绑定在 cue 的 stage edge 上；循环 motion 绑定在**条目的在场期**上：

```jsonc
// Scene 文档 entry（scene-managed Story 的作者入口）
{
  "layerId": "layer.app.characters",
  "tag": "tag.sister",
  "contentId": "content.app.sister",
  "ambient": { "motionId": "motion.app.sister-breathing" },
}
```

编译产物是一份表现侧 ambient catalog（`<layerId, tag>` 或 content/appearance →
循环 motion），与 transition catalog 同族；不用 Scene 文档的低层 Story 直接声明
catalog。placement/appearance 等权威语义完全不变。

### 3. 运行时合成规则

- **驱动**：presentation clock（表现冻结可暂停的那只共享时钟）驱动
  `sampleMotionAtV1(definition, elapsed % total)`；采样值与一次性 transition 相同
  地合成在 settled placement 之上。零权威接触：无命令、无 State、无
  Save/digest/replay 影响。
- **与一次性 motion 的叠加**：V1 收窄为**边沿期间挂起**——条目的 enter/exit/
  replace transition 飞行中，ambient 暂停在 settled 姿态；transition settle 后
  循环重新开始。不做通道级混合（真实需求出现再议）。
- **表现冻结**：冻结时循环停驻当前相位，恢复后相位连续（沿用 presentation
  freeze 的时间偏移语义，不跳不重播）。
- **reduced motion**：循环整体 settle（呼吸静止）；装饰性动效不提供 fallback
  变体（与现有 reduced-motion 合同一致，真实需求再扩展）。
- **相位**：从条目 settle 时刻起算，纯表现数据；不同客户端相位可不同。测试用
  manual presentation clock 取确定性帧。

### 4. 边界与限额

- 每条目 V1 只允许一条 ambient 绑定（呼吸+眨眼合成一份多轨道文档）；
- motion 文档现有时长/关键帧限额沿用；ambient 条目数受 stage entry 上限约束；
- Studio/检查器：`app check` 校验 ambient motionId 存在（与 cue motionId 同族
  lint）；Studio 条目检视器提供 ambient 下拉（可与 Scene Construction 合流）。

### 5. 泛化模式与边界（2026-08-15 评审补充，防"单一消费者专用"跑偏）

机制词汇本身是通用的：绑定落在 `<layerId, tag>` 条目、采样走既有表现通道
（offsetX/offsetY/scale/opacity）——一朵云和一张立绘对舞台是同一种东西。V1 显式
支持两种循环形态：

- **往返循环**（首尾同值）：呼吸起伏、光晕/仪表脉动、雾的浓淡；
- **锯齿循环 + 平铺内容**：`elapsed % total` 在循环边界是硬切，终点 ≠ 起点的锯
  齿轨道只在内容可平铺时视觉无缝——云带 offsetX 漂移、窗外雨条 offsetY 下滚都属
  此类（一个平铺宽度/高度 = 一个循环周期）。回绕连续性是内容技巧，不加引擎侧强
  制；Workbench 的循环预览让作者当场看到边界跳变。

**不属于本原语的**：粒子系统与随机时点的非周期表现（随机闪电、阵风、飘落轨迹各
异的雪花）。周期循环表达不了随机性；这类天气/氛围仍是 Story renderer 自有的表现
实现（渲染组件今天就能做，reduced-motion 走 `useReducedMotionV1`），或将来证据
驱动的另案原语。不要用超长周期 motion 文档硬撑非周期行为。2026-08-29
补充：其中「可重复的随机 draw」已由 [Presentation RNG](presentation-rng.md)
覆盖；renderer 仍拥有像素与时间推进，随机值改由零权威可续接流提供。

## 验收草案

- 角色呼吸/眨眼类循环以声明实现，权威命令流量为零（CommandLog 无新条目）；
- **双消费者防跑偏**（2026-08-15 评审补充）：实现切片同时落两类真实内容——
  实验仓的角色循环（首个消费者）与仓内 example（cat-cafe 开场或
  template）的一条户外环境循环（云漂移或窗外雨，锯齿 + 平铺模式的实证），与
  interaction kit 的"第二真实消费者"纪律同构；
- 冻结画面时循环停驻、恢复后相位连续；reduced-motion 下循环 settle；
- 循环开/关两种构建下，同一 scenario 的 Save/replay/digest 逐字节相同；
- Workbench 可打开循环 motion 调关键帧并保存（CAS 纪律不变）。

## Open questions 裁决（2026-08-15 随实现切片 admission 固化，详见

[实现计划](../plans/2026-08-15-ambient-loop-motion.md) §2）

1. **叠加规则**：V1 = 边沿期间挂起，已交付并被双消费者接受（薄雾/呼吸都不需
   要"入场未完循环已起"）。通道级合成维持 defer——后续高密度内容波若给出真实
   反例，按证据回流另裁；
2. **相位起点**：条目 settle 时刻（已交付）。"场景 open 同刻 settle 不产生
   错相"的盲点由 #4 的显式相位参数覆盖；
3. **appearance 条件绑定**：不进 V1（已裁决）。"闭眼立绘不眨眼"类需求先由多
   轨道文档与内容侧承担——高密度表现内容是最可能把它顶回来的一波，届时按真实
   摩擦另裁；
4. **绑定参数**：允许**一个**可选 `phaseMs`（非负整数、≤60s、表现专用，采样
   相位 = `(elapsed + phaseMs) % 时长`），解决共享文档同刻 settle 的同相问
   题；不做按 tag 哈希的隐式错相（作者不可预期的 magic），强度/延迟仍全部表
   达在 motion 文档轨道里。已随 M1 admission 交付。
