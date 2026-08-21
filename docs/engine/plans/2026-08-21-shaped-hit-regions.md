# Shaped hit regions（E3）实施计划

状态：进行中（2026-08-21 开启）。合同：
`docs/engine/proposals/shaped-hit-regions.md`（已接受）。

## Admission 裁决（车道开启时固化）

- 多边形是矩形的加法细化：`polygonPoints?: readonly { x, y }[]`——3..64
  个整数顶点、同一锚点坐标系、全部落在外接框内、鞋带面积非零。校验失败
  **降级为矩形**并报 `stage.hit_region_polygon_invalid`：激活路径不因形
  状笔误死亡（与 geometry/frameAssetIds 的「丢细化、保基座」同族）。
- 悬停揭示：`hoverAssetId?: AssetId`。指针在形状内或该区域按钮获键盘焦
  点时，host 把资产按条目 geometry 框对齐显示为表现覆盖层，离开/失焦即
  隐。V1 固定 geometry 同框（提案 q1：偏移需求出现再加）；未声明
  geometry 的内容不渲染揭示层。揭示资产并入 `requiredAssetIds` 预载；
  无效值丢弃悬停字段并报 `stage.hit_region_hover_invalid`。
- 资产 URL 走既有 `AssetUrlRegistryV1` 变异无关面：`SemanticStageV1`
  与 host 新增可选 `assets` 端口。无注册表或未解析 → 不渲染揭示层
  （反馈增强，不改激活语义；触屏无悬停同理）。
- 键盘可达性不变：Tab 聚焦、Enter/Space 激活、焦点框画外接框。
  clip-path 会裁掉按钮自身的 outline，形状按钮的焦点框由兄弟元素承担。
- 重叠维持 DOM 现状并写进合同：最上层（条目 z 序 + 区域声明序）独占命
  中；「一次点击激活多区域」显式 defer（提案 §5）。
- 区域文档绑定走内容目录 helper（q2）：Story 代码 import 文档 JSON 并经
  `parseRegionsDocumentV1` 后把 `regions` 交给 `resolveContent`；scene
  声明式绑定随 Scene Construction 的真实需求回流。
- trace 工具归 engine devtool（q3），多仓复用。

## 里程碑

- M0 base 合同：`polygonPoints` + `hoverAssetId` 进 `StageHitRegionV1`；
  投影校验与降级诊断；hover 资产并入 `requiredAssetIds`；合同测试。
- M1 host：clip-path 形状命中（浏览器原生指针裁剪，运行时零像素读取）
  - 形状按钮外接框焦点框 + 悬停/焦点揭示层（`assets` 端口）+ 开发轮廓
    显示形状；`SemanticStageV1`/`SemanticStageTargetHostV1` 透传；jsdom
    测试覆盖显隐、无 geometry / 无注册表不渲染。
- M2 区域文档：`sillymaker.regions` 格式 + `parseRegionsDocumentV1` 严
  格入院（regionId 唯一、顶点/外接框规则与投影同源）；授权索引第三家族
  （`.regions.json`）；story check 源 lint；dev-server list/read/write
  CAS 端口（与 motion 端口同构）。
- M3 Studio 区域编辑：画布对着真实底图拉顶点、拖外接框、增删顶点、试
  悬停揭示；保存走共享文档会话 CAS 纪律。
- M4 trace devtool：`story regions trace <image>`——alpha 剪影
  marching squares + 折线简化 → 可编辑区域文档；像素语义只存在于导入
  时刻。
- M5 消费者与文档收口：外部实验仓身体热区（贴合姿态形状 + 剪影悬停高
  亮）+ 仓内消费者（Engine Lab 或 cat-cafe）；features /
  story-authoring / authoring-quickstart / production-floor / AGENTS
  更新。

## 交付记录（2026-08-21，M3）

- **M3**：Studio 新增 Regions 工作区（`studio` 包
  `workspaces/regions/`）：dev-server regions 端口的浏览器侧 IO +
  共享创作会话（同一 CAS/undo/redo/脏导航纪律，`regions-io.ts` /
  `regions-session.ts`）；画布把草稿 regions 注入场景工作区已编译底图的
  选定条目——host 的真实 clip-path 形状与悬停揭示就是预览，点形状即选
  中；叠加层只对选中区域画拖拽手柄（外接框移动/右下角缩放/顶点/边中点
  插入），拖动经指针差 ÷ 预览缩放 ÷ 条目缩放（含镜像）回锚点空间，每次
  手势合并为一步撤销。纯编辑命令 `regions-edit.ts`（矩形⇄多边形种子、
  顶点增删移、外接框平移携带多边形、缩放按比例重投），保存门直接复跑
  `parseRegionsDocumentV1`（入院即门禁），保存时 `authoring.status` 升
  `human_tuned`。`StudioAssetRegistryPortV1` 增可选 `resolve`（cat-cafe
  绑定传完整注册表即自动满足，悬停揭示在 Studio 预览用真图）；
  `@sillymaker/ui` 根导出补 `AssetUrlRegistryV1` 类型；dev studio 入口
  生成代码接 `createDevServerRegionsIoV1`。jsdom 覆盖列表/自动打开/host
  形状选中/拖拽/多边形顶点编辑/入院门禁/脏切换确认/新建推断前缀。

## 交付记录（2026-08-21，M0–M2）

- **M0**：`StageHitRegionV1.polygonPoints`（3..64 整数顶点、外接框内、
  鞋带面积非零，共享判定 `hitRegionPolygonValidV1`）与 `hoverAssetId`；
  投影降级诊断 `stage.hit_region_polygon_invalid` /
  `stage.hit_region_hover_invalid`；hover 资产并入 `requiredAssetIds`；
  `AssetUsageV1` 增 `"stage_hover_reveal"`。
- **M1**：host 以 CSS `clip-path` 承载形状命中（指针裁剪浏览器原生，
  运行时零像素读取）；形状按钮焦点框由兄弟元素画外接框；悬停/焦点揭
  示层走新增可选 `assets` 端口（`SemanticStageV1` →
  `SemanticStageTargetHostV1` 透传），无 geometry / 无注册表 / 触屏不
  渲染；开发轮廓叠加形状填充。jsdom 覆盖显隐、降级与轮廓。
- **M2**：`sillymaker.regions` 格式 + `parseRegionsDocumentV1` 严格入院
  （base `contracts/stage-regions.ts`；regionId 唯一、顶点/外接框规则
  与投影同源）；授权索引第三家族 `.regions.json`（列表 + 结构化 skip）；
  `story check` 源 lint（`regions.*` 五码，与 motion lint 同构）；
  dev-server list/read/write/create CAS 端口
  （`/__sillymaker/dev-sources/regions-document[s]`，与 motion 端口同
  构）。顺带修复全量套件下的既有测试竞态：closure CLI 测试的子 deno
  进程会重建 workspace node_modules 符号链接，与 determinism
  authority-map 的 realpath 并发竞争，spawn 加
  `--node-modules-dir=none` 消除（实证 6 次 spawn 49 个 ENOENT 窗口 →
  0）。

## 验收（承提案）

- 多边形区域指针命中按形状、键盘激活按外接框；命中/悬停开关两种构建下
  同一 scenario 的 Save/replay/digest 逐字节相同；
- 悬停/焦点揭示显隐可测（jsdom 断言覆盖层出现），CommandLog 零新条目；
- Studio 画布能新建/编辑多边形并保存区域文档（CAS 纪律不变）；
- trace 工具从一张 alpha 位图产出可编辑文档，顶点数在限额内；
- 双消费者：外部实验仓身体热区 + 仓内一例。

## 停（承提案）

- 运行时读取像素做命中判定，或把位图 alpha 语义带进合同；
- 悬停状态进入 authoritative State / Save / semantic transcript；
- 区域获得路由权（决定去向而非报告 regionId 激活）；
- 出现第二套区域坐标格式，或 Studio 之外再造一个区域编辑面。
