# Shaped hit regions proposal（命中区形状、悬停揭示与区域文档）

> 2026-08-25 后续裁决：Capacity Contract Reset 删除每个 content 的任意
> region 数量上限。作为几何/算法资源边界的每个 polygon 3..64 顶点以及本提案的
> paint/pick/accessibility 语义仍有效。

状态：**已接受并交付**（2026-08-21 所有者接受，同日 M0–M5 全部交付，
含双消费者）。admission 裁决与交付记录见
[Shaped hit regions 计划](../plans/2026-08-21-shaped-hit-regions.md)。

创作者需求：「在立绘/物件上画**跟着美术走的**可点区域，不是矩形」「指
针悬停时这块区域亮起来给反馈」「区域要能在 Studio 里对着图拉顶点，不
是在 TS 里手填坐标」「我手里已有的判定素材是位图剪影，希望直接变成可
编辑数据」。今天 `StageHitRegionV1` 只有矩形，无悬停反馈词汇，坐标只
能写在内容目录代码里——三条都缺。

证据门：外部实验仓 E3 债——躺卧角色的身体热区需要贴合姿态的判定形状
与悬停剪影高亮，现成素材只有整幅透明位图；引擎侧 E3 在权威持有钟提案
q7 已定为独立输入轴（合同有、缺接线），但「形状/悬停/Studio 编辑」是
接线前就存在的合同缺口。通用消费者显而易见：查找物/身体检查/密室点击
类玩法全靠它。

## Shape（设计草图；字段名以实现切片的 admission 为准）

### 1. 多边形是矩形字段的加法细化

```ts
export interface StageHitRegionV1 {
  readonly regionId: string;
  readonly accessibleNameText: string;
  readonly x: number; // 外接框保留：焦点框、Studio 手柄、退化形状
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly polygonPoints?: readonly { x: number; y: number }[]; // 新增
  readonly hoverAssetId?: AssetId; // 新增（§2）
}
```

- 顶点是锚点空间整数坐标（与现行矩形同一坐标系），3..64 个，入院校验
  落在外接框内、面积非零；
- DOM host 用现有透明按钮 + `clip-path: polygon(...)` 实现——指针命中
  天然按形状（浏览器原生行为），**运行时零像素读取**、纯可序列化数据；
- 键盘可达性走外接框：Tab 聚焦、Enter/Space 激活语义与现行完全一致，
  焦点框画外接框。形状只收窄指针命中，不制造键盘死区。

### 2. 悬停揭示是声明的表现反馈，不是 CSS 逃生舱

区域可选 `hoverAssetId`：指针在形状内（或该区域按钮获键盘焦点）时，
host 把该资产按条目 geometry 框对齐显示为表现覆盖层，离开即隐。

- 剪影高亮素材本来就是与底图同框的整幅图——「对齐条目框」即原语义；
- 纯 UI transient：零权威、零 Save/digest/replay 接触，与 hover 光标
  同族；键盘焦点同样触发，可达性反馈免费获得；
- 揭示资产并入 `requiredAssetIds` 预载。

### 3. 区域文档：Studio 可编辑的第一入口

新增 `sillymaker.regions` 文档家族（与 motion 文档同族的独立 JSON）：

```jsonc
{
  "format": "sillymaker.regions",
  "version": 1,
  "regionsId": "regions.app.heroine-lying",
  "label": "躺卧姿态热区",
  "regions": [/* StageHitRegionV1[] */],
}
```

内容目录用 `resolveRegionsDocumentV1` 按 contentId + appearance 绑定
（绑定关系仍归 Story 代码/scene 文档，与 motion 绑 cue 同构）。Studio
获得画布区域编辑器：对着真实底图拉顶点、拖外接框、试悬停揭示；story
check lint 区域 id 唯一、顶点数、外接框边界。

### 4. 存量素材桥：位图剪影一次转多边形

开发侧工具（`app regions trace <image>`）对 alpha 剪影位图跑
marching squares + 折线简化，产出一份区域文档供作者继续编辑。像素语义
只存在于**导入时刻**的开发工具里；运行时与 Save/回放永远只见多边形数
据。这是「素材不便发挥」的正解：把遗留判定位图变成一等可编辑数据，而
不是让引擎学会读像素。

### 5. 重叠与激活

V1 维持 DOM 现状并写进合同：多区域重叠时最上层（条目 z 序 + 区域声明
序）独占命中。「一次点击同时激活多区域」缺被审计的真实路径，显式
defer——出现真实消费者再按证据裁决激活载荷形态。

## 边界与限额

- 每内容区域数沿用现行 `validateHitRegionsV1` 上限；顶点 ≤ 64；
- 悬停揭示 V1 为显/隐两态（无淡入曲线）；需要更豪华的反馈时用 cue +
  motion 表达，不在悬停原语里长出第二套动画；
- 触屏无悬停：揭示仅是反馈增强，激活语义不依赖它。

## 验收草案

- 多边形区域指针命中按形状、键盘激活按外接框；命中/悬停开关两种构建下
  同一 scenario 的 Save/replay/digest 逐字节相同；
- 悬停/焦点揭示显隐可测（jsdom 断言覆盖层出现），CommandLog 零新条目；
- Studio 画布能新建/编辑多边形并保存区域文档（CAS 纪律不变）；
- trace 工具从一张 alpha 位图产出可编辑文档，顶点数在限额内；
- 双消费者：外部实验仓身体热区 + 仓内一例（cat-cafe 可抚摸的猫或
  Engine Lab 演示）。

## Open questions（建议随 admission 裁决）

1. 悬停揭示的对齐：V1 固定「与条目 geometry 同框」，还是允许区域级偏
   移——建议固定同框，偏移需求出现再加；
2. 区域文档是否直接进 scene 文档 entry（`regions: "regions.app.x"`）
   ——建议 V1 先走内容目录 helper，scene 声明式绑定随 Scene
   Construction 的真实需求回流；
3. trace 工具的归宿：engine devtool 还是 Story 脚本——建议 devtool，
   多仓复用。

## 停

- 运行时读取像素做命中判定，或把位图 alpha 语义带进合同；
- 悬停状态进入 authoritative State / Save / semantic transcript；
- 区域获得路由权（决定去向而非报告 regionId 激活）；
- 出现第二套区域坐标格式，或 Studio 之外再造一个区域编辑面。
