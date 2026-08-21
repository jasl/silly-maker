# Authorable Frame Set V1 计划

状态：**已完成**（2026-08-21 接受、同日 M0–M3 全部交付；交付记录见文
末）。合同见[帧集提案](../proposals/authorable-frame-set.md)；本计划拥
有任务顺序与验收。车道顺序由所有者裁决：帧集先行，
[命中区形状提案](../proposals/shaped-hit-regions.md) 第二。

## 目标

`sillymaker.motion` 文档获得一条阶梯语义的 `frame` 通道；采样值经舞台
host 交给条目渲染器；内容侧用 `frameAssetIds` 声明有序帧表。绑定零新
增（cue 边沿一次性 + ambient 存在期循环原样复用）。纯表现：零命令、零
State、零 Save/digest/replay 接触。

## Admission 裁决（2026-08-21，随开工固化）

1. **运输形态**（提案 open q1）：`SemanticStageEntryRendererInputV1`
   新增 `frameIndex: number | null`。host 对 entry 帧表长度做就近钳
   制；渲染器信任收到的下标。逐帧渲染路径不发诊断（60fps 会刷爆），
   帧表本身的校验落在 render target 投影（每次舞台状态变化一次）。
2. **reduced motion**（提案 open q2）：修正提案草案的「停在 t=0 帧」
   ——现行 ambient 在 reduced motion 下整体不采样，帧通道随其他通道
   一起掉回基线；frame 的基线是 **null（无覆盖）**，渲染器显示默认
   画面。作者惯例：帧表 0 号 = 默认姿态，两者视觉等价。
3. **一次性播完驻留**（提案 open q3）：沿用 motion「run 结束覆盖清
   除」。需要驻留的终态用权威 appearance 表达，不给表现钟加持久语义。
4. **帧值上界**：0..255；每文档至多一条 `frame` 轨道（通道唯一性沿
   用）；关键帧数上限沿用 32。
5. **跨文档 lint**：提案草图中的「story check 帧下标不超帧表」需要
   内容声明可见，而内容目录今天是 Story 代码——defer 到内容声明数据
   化的真实车道；运行时钳制 + Workbench 预览承担兜底。

## 里程碑

### M0：base 合同

- `MotionChannelV1` + `"frame"`；admission：值域 0..255、`frame` 轨道
  任何关键帧不允许 easing（新失败码）、阶梯采样不插值；
- `MotionSampleV1.frameIndex: number | null`（无轨道 = null）；
- `motionChannelBaselineV1("frame")` = 0（编辑器新建轨道默认值；采样
  基线仍是 null）；
- motion.test.ts 覆盖：admission 拒绝/接受、阶梯边界（延迟期持首帧、
  段内保持、末帧驻留）、无轨道报 null。

### M1：stage 管线

- `StageContentResolutionV1.frameAssetIds?: readonly AssetId[]`；投影
  校验（非空字符串、上限 64、`stage.frame_assets_invalid` 诊断）、并
  入 `requiredAssetIds` 预载、`StageRenderEntryV1.frameAssetIds`（必
  有，fallback 为空表）；
- host：一次性 motion 采样上提到 `StageEntryV1`（样本传入
  `entryStyleV1`，不再内部采样）；`frameIndex = 飞行样本 ?? (settled
  ? ambient 样本 : null)`，对帧表钳制后进渲染器输入；
  `SemanticStageTargetHostV1` 报 null；
- host / ambient 测试：一次性换帧、ambient 循环换帧、无帧表钳制为
  null、reduced motion 无覆盖。

### M2：Workbench

- `frame` 轨道禁用缓动下拉（admission 拒绝 easing，编辑面不制造无效
  草稿）；数值/拖拽/增删关键帧沿用通道无关 UI；
- 编辑-保存回环测试（CAS 纪律不变）。

### M3：双消费者 + 文档

- 仓内：template opening 场景或 Engine Lab 一条循环换帧真实路径（走
  scene 文档 ambient 声明）；
- 外部实验仓：眨眼或吐息一条循环换帧（替换 renderer CSS），加一条一
  次性帧集路径（浮字/字效族）；
- 文档：features.md、story-authoring.md、提案裁决记录、
  production-floor 车道行、AGENTS.md 摘要。

## 验收（沿提案草案）

- 换帧以文档 + 既有绑定实现，CommandLog 零新条目；帧集开/关两种构建
  下同一 scenario 的 Save/replay/digest 逐字节相同；
- 冻结画面帧停驻、恢复相位连续（随 ambient 现有语义免费获得）；
  reduced motion 下无帧覆盖；
- Workbench 能打开带 frame 轨道的文档、编辑并保存。

## 停

沿用提案「停」节；本计划特有：M1 后若发现渲染器输入形态与真实消费者
冲突（如需要资产而非下标），停下回提案裁决，不在实现里私改合同。

## 交付记录（2026-08-21）

- **M0**：`MotionChannelV1` + `"frame"`（值域 0..255、`frame` 关键帧
  easing 入院拒绝 `motion_frame_easing_forbidden`、阶梯采样不插值）；
  `MotionSampleV1.frameIndex: number | null`；编辑器新建默认 0、采样基
  线 null。motion.test.ts 覆盖入院拒绝/接受、延迟期持首帧、段内保持、
  末帧驻留、无轨道 null。
- **M1**：`StageContentResolutionV1.frameAssetIds`（≤64、
  `stage.frame_assets_invalid` 投影诊断、并入 `requiredAssetIds`）、
  `StageRenderEntryV1.frameAssetIds` 必有；host 一次性采样上提、
  `frameIndex = 飞行样本 ?? (settled ? ambient ?? null)`、帧表钳制、
  `data-stage-frame` 标记；reduced motion 无覆盖。host/ambient 测试
  覆盖四路径。
- **M2**：Workbench `frame` 轨道编辑（缓动下拉换静态「阶梯」标签，数
  值/增删/拖拽沿用通道无关 UI），编辑-保存回环测试。
- **M3 消费者**：Engine Lab 信标 prop 两帧循环（代码原生 ambient
  catalog）+ 入场 motion 内两帧步伐一次性；template opening 场景文档
  声明 Mei 眨眼（`ambient` + `frameAssetIds` + 4s 帧轨道，纯文档路
  径）；外部实验仓 CE240 眨眼从 renderer CSS 迁入 sister ambient 帧轨
  道（呼吸+眨眼合一文档，删除对应 CSS keyframes），5 条 SHOW_PIC→WAIT
  帧串迁成一次性 motion 文档绑定 enter/replace 边（flipbook renderer
  去状态化，只消费 `frameIndex`）。
- **验收**：换帧零命令零 State；主仓 `deno task check` 与实验仓全量
  测试（42 文件 / 686 用例）通过；motion 文档开/关帧轨道不触及
  Save/digest/replay（合同套件既有等位门覆盖）。
- **唯一显式 defer**：跨文档「帧下标不超帧表」story lint，等内容声明
  数据化的真实车道；运行时钳制 + Workbench 预览兜底。
