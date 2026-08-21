# Authorable frame set proposal（可作者的帧集轨道）

状态：**已接受并交付**（2026-08-21 所有者接受，同日 M0–M3 全部交付；
帧集先行、命中区形状第二的车道顺序随裁决确定）。切片顺序、admission
裁决与交付记录见
[Authorable Frame Set V1 计划](../plans/2026-08-21-authorable-frame-set.md)。

创作者需求：「这三张眼帧每 4 秒眨一次」「这组气泡帧循环起伏」「这个浮字
出现后放大到 150%、停住、消失——用它真实的多帧素材」。这类**内容形状的
装饰换帧**今天只能写进 Story renderer 的 CSS：Studio 看不见、story
check 摸不着、Workbench 改不了。这就是权威持有钟提案钟表分工表右列的
「帧集（E4）」轴——早已定名，尚无原语。

证据门：外部实验仓 E4 债集中暴露——自动眨眼、吐息泡、浮字帧序列全是
renderer CSS；多帧字效只能显示首格代表片。仓内 example 同样无法声明
「帧集循环」。ambient loop motion（已交付）解决了循环**绑定**，但采样
通道只有位移/缩放/透明，换不了片。

## Shape（设计草图；字段名以实现切片的 admission 为准）

### 1. 帧集是 motion 文档的一条新通道，不是第二套动画格式

`sillymaker.motion` 文档新增 `frame` 通道：

```jsonc
{
  "channel": "frame",
  "keyframes": [
    { "atPermille": 0, "value": 0 },
    { "atPermille": 900, "value": 1 }, // 闭眼帧
    { "atPermille": 950, "value": 0 },
  ],
}
```

- 采样是**阶梯**语义：值保持到下一关键帧，不插值；`frame` 轨道的关键帧
  不允许 easing（admission 拒绝）。
- `value` 是 0 起的整数帧下标；每文档至多一条 `frame` 轨道（现有通道唯
  一性沿用）。
- `MotionSampleV1` 增加 `frameIndex: number | null`（无轨道 = null =
  不覆盖）。

### 2. 帧下标到像素的映射在内容侧

`StageContentResolutionV1` 增加可选 `frameAssetIds: readonly AssetId[]`
——与条目 geometry 同框的有序帧表。舞台 host 把采样出的下标随现有表现
通道一起交给条目渲染器（引擎不越权替 renderer 画图）；帧资产并入
`requiredAssetIds` 预载，杜绝换片瞬间闪白。下标越界按表现诊断 + 就近
钳制处理（表现路径不炸场）。

### 3. 绑定零新增

两种既有边沿原样复用：

- **一次性**：cue 边沿的 `kind: "motion"` transition——浮字 = delay +
  scale/opacity 轨道 + frame 轨道，一份文档；
- **循环**：ambient 存在期绑定（已交付）——眨眼/吐息即「带 frame 轨道
  的 ambient 文档」。

### 4. 钟表分工不动摇

帧集永远在权威持有钟分工表的右列：纯表现、零命令、零 State、零
Save/digest/replay 接触。**有玩法意义的换帧不走这里**——gauge 档位、
持有中段换帧仍按阈值穿越走权威 `frames` 家族（parallel-monitors 已裁
决）。石蕊不变：要进 Save/回放/能被条件打断的时间才是 hold。

### 5. Workbench / Studio

Workbench 时间线为 `frame` 轨道提供阶梯块编辑（非曲线），块上显示帧缩
略图；循环预览开关沿用。story check 对声明式绑定处（scene 文档
ambient / cue motionId）新增「帧下标不超出内容帧表」的跨文档 lint。

## 边界与限额

- 关键帧上限沿用文档现有 32；帧下标入院上界（如 0..255）防误写；
- reduced motion：帧轨道随循环一起 settle 到 t=0 帧（通常是中立帧），
  与 ambient「呼吸静止」语义一致；
- 非周期随机表现（随机眨眼间隔抖动、闪电）仍不属于本原语——沿用
  ambient 提案 §5 的边界，不用超长文档硬撑随机性。

## 验收草案

- 眨眼/吐息类换帧以文档 + ambient 绑定实现，CommandLog 零新条目；帧集
  开/关两种构建下同一 scenario 的 Save/replay/digest 逐字节相同；
- 双消费者：外部实验仓一条循环换帧（眨眼或吐息）+ 仓内 example 一条
  （cat-cafe 蒸汽/招牌两帧循环或 Engine Lab 演示），一次性浮字型至少
  一条真实路径；
- 冻结画面帧停驻、恢复相位连续；reduced motion 下停在 t=0 帧；
- Workbench 能打开带 frame 轨道的文档、编辑并保存（CAS 纪律不变）。

## Open questions 裁决（2026-08-21 随实现计划 admission 固化，详见

[实现计划](../plans/2026-08-21-authorable-frame-set.md) 裁决节）

1. **运输形态** → 渲染器输入新增 `frameIndex: number | null`，host 对
   帧表钳制；props 保持 Story 静态数据；
2. **reduced motion** → 修正本文验收草案的「停在 t=0 帧」：帧通道与
   其他通道同构掉回基线，frame 的基线是 null（无覆盖）。作者惯例帧表
   0 号 = 默认姿态，视觉等价；
3. **一次性驻留** → 沿用「run 结束覆盖清除」；驻留终态用权威
   appearance 表达。

## 停

- 帧集写入 authoritative State / Save / digest / CommandLog；
- 用帧集冒充 gauge 档位、持有中段换帧等有玩法意义的换帧；
- 发明第二套动画/帧表文档格式，或给 renderer 之外的引擎层加图元绘制权；
- 用超长周期帧文档硬撑非周期随机表现。
