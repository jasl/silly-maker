# Ambient Loop Motion V1（存在期循环动效）

状态：2026-08-15 提案被所有者接受后立项为当前 active plan（案文与证据门见
[ambient-loop-motion 提案](../proposals/ambient-loop-motion.md)，含 2026-08-15
泛化性评审补充）。本文只拥有实现切片顺序、admission 裁决与验收；
[production-floor sequence](2026-07-30-production-floor-sequence.md) 仍是唯一
跨计划排序入口。

## 1. Positioning

- 角色存在期循环（呼吸/眨眼/表情漂移）与户外环境循环（云漂移、窗外雨的
  锯齿 + 平铺形态）是**同一原语**的两类消费者；粒子系统与非周期随机表现
  （随机闪电、阵风）明确不在范围——那是 Story renderer 自有表现或未来另案。
- 高密度表现内容（实验仓下一波）以本能力为显式前置；本计划先用**既有**真实
  内容实证（实验仓角色立绘 + 仓内 example 户外循环），内容波接续消费。

不变量（每个切片都必须保持）：

- **权威零接触**：无新命令、无 State/Save/digest/replay 字节变化；循环开/关
  两种构建下同一 scenario 的权威输出逐字节相同；
- **presentation clock 是唯一驱动**：表现冻结停驻当前相位、恢复后相位连续；
  测试用 manual presentation clock 取确定性帧；
- **循环即普通 motion 文档**：不建第二动画格式；Workbench 编辑、项目索引发现、
  `story check` lint 原样复用；
- ambient catalog 是表现侧**派生目录**（与 transition catalog 同族），不成为
  第二 gameplay/Stage 权威。

## 2. Admission 裁决（实现前固化，对应提案 open questions）

- **相位（open q2 + q4）**：起算点 = 条目 settle 时刻；绑定允许一个可选
  `phaseMs`（非负整数，表现专用数据），采样相位 = `(elapsed + phaseMs) % 总时
  长`。显式、确定，解决"场景 open 同刻 settle + 多条目共享一份漂移文档 → 完全
  同相"的云案例；不做隐式 tag 哈希错相（magic 行为，作者不可预期）。除此之外
  绑定零参数——强度/延迟全部表达在 motion 文档轨道里。
- **叠加（open q1）**：V1 = 边沿期间挂起。条目的 enter/exit/replace transition
  飞行中，ambient 停在 settled 姿态；settle 后循环重新起算。不做通道级混合，
  真实需求出现再议。
- **appearance 条件绑定（open q3）**：不进 V1。"闭眼立绘不眨眼"类需求先由多轨
  道文档与内容侧承担，真实摩擦回流后另议。
- 字段名与边界值以 M1 的 strict admission 为准（提案草图不构成字面合同）。

## 3. Slices

### M0 — 表现侧循环运行时（ui）

- ambient catalog 合同（表现侧 `<layerId, tag>` → `{ motionId, phaseMs? }`）；
  舞台宿主对 settled 条目按 presentation clock 采样循环 motion
  （`sampleMotionAtV1`，相位取模），合成于 settled placement 之上，与一次性
  transition 同一合成语义；条目边沿飞行中挂起、settle 后恢复；冻结停驻相位连
  续；reduced-motion 下整体 settle。
- 验收：manual clock 确定性帧单测覆盖采样/边沿挂起/冻结恢复/reduced-motion
  四类；不触碰 `StageTargetChangeV1`/reconciler 公共合同。

### M1 — Scene 文档 `ambient` + admission + 编译（base + tooling）

- scene entry 可选 `ambient` 字段，strict admission（含 `phaseMs` 边界）；
  `sceneFromDocument` 编译出 ambient catalog；低层（不用 Scene 文档的）Story
  可直接声明同族 catalog。`story check` 新增 lint：ambient motionId 必须解析到
  项目索引内的 motion 文档（与 cue motionId 同族诊断）。
- 验收：admission/lint 合同单测；带 `ambient` 的场景 simulate 输出与权威字节
  与不带时逐字节相同（数字/存档零影响的直接证据）。

### M2 — 创作面（studio + ui/debug）

- Workbench 循环预览开关（按 `elapsed % total` 预览，不改保存语义）；Studio
  条目检视器提供 ambient 下拉（索引背书的 motion 目录，含清除）；缺失/不可解
  析的 ambient 引用进创作诊断面板（Warning，不阻存）。
- 验收：jsdom 交互测试；既有 template/cat-cafe studio spec 不回归。

### M3 — 双消费者实证（提案验收草案全项）

- 外部实验仓：既有场景给角色立绘挂一条呼吸循环（下一波内容接续
  消费同一原语）；仓内 example：cat-cafe 开场或 template 落一条户外环境循环
  （云漂移或窗外雨——锯齿 + 平铺形态的实证）。
- 验收：权威命令流量为零（CommandLog 无新条目）；冻结停驻/恢复相位连续与
  reduced-motion settle 各至少一条浏览器断言；循环开/关构建的 Save/replay/
  digest 逐字节相同；Workbench 可开循环文档调关键帧并保存（CAS 纪律不变）；
  实验仓台账回流。

交付记录（2026-08-15，M0–M3 全部切片）：

- **M0**：`StageAmbientBindingV1`/`StageAmbientCatalogV1` 合同落 base（与
  transition catalog 同族）；`SemanticStageV1` 可选 `ambient` prop——每渲染对
  settled 条目采样 `(now − settledAt + phaseMs) % duration` 合成于 settled
  placement（offsets 相加、permille 相乘，与一次性 motion 同一算术）；宿主新增
  `data-stage-ambient` 标记。边沿飞行中挂起（settledAt 遗忘 → settle 重新起
  相）；常驻 tick 只在有活跃循环时请求，`data-stage-settled` 语义不变；冻结停
  驻/恢复相位连续直接由 freeze clock 的 offset 语义承担；reduced-motion 整体
  settle 并停表（媒体监听同步触发重渲染）。manual clock 确定性帧单测 5 例
  （采样回绕/边沿挂起与重起相/冻结连续/reduced-motion 零 tick/phaseMs 错相）。
- **M1**：scene entry 可选 `ambient` strict admission（`scene_ambient_invalid`/
  `scene_ambient_motion_id_invalid`/`scene_ambient_phase_invalid`，phaseMs ≤
  60000）；`sceneAmbientCatalogV1(scene, { motions })` 编译精确匹配目录（layer +
  entry key + content，换内容即回退 null）；`story check` 新 lint
  `scene.ambient_motion_missing`（吃项目索引）。合同测试锁定：带/不带 `ambient`
  的文档 cue/open mutations 逐字节相同。
- **M2**：Studio 条目检视器「循环动效」下拉（索引背书的 motion 目录 + 清除，
  一步可撤销草稿编辑，显式 phaseMs 换 motion 时保留）；未索引的 ambient 引用进
  创作诊断面板（Warning 不阻存）。**核实后收敛**：Workbench 的循环预览开关
  （`循环`，默认开）在 Motion Workbench M3 已交付，无需新面。
- **M3 双消费者**：template 开场新增「雨后的薄雾」——平铺雾带内容
  （repeating-gradient，周期 320px，几何 2240×200 = 画布 + 两周期）+ 锯齿漂移
  循环（9s 一周期整位移，回绕无缝），场景文档声明 `ambient`，composition 挂
  `ambient` + `presentationFreeze.clock`；实验仓角色立绘挂 3.6s 呼吸往返
  循环（实验仓台账）。**字节证据**：template simulate 在 ambient 字段
  剥离/保留两种树下输出逐字节相同（新雾带条目本身是合法内容变更，digest 基线
  随之更新）；实验仓 opening simulate 与迁移前基线逐字节相同（该场景只加字
  段）。浏览器验收：template spec 新用例——薄雾 `data-stage-ambient` 漂移中
  `data-stage-settled` 保持 true、调试坞 冻结画面 停驻、恢复画面 后继续
  （Chromium + WebKit）。
- 验收证据：全量 `deno task check` 绿（299 文件 / 4954 测试；其间 Node-safe
  闭包守卫按其文本纪律要求注释里的 Document 大写——最小修正）；聚焦单测——
  舞台 ambient 5、scene 合同 27、scene lint 9、studio jsdom 28（含 ambient 绑
  定/清除与未索引警告）；浏览器 template spec 14/14（含 ambient 漂移/冻结/恢复
  用例）、cat-cafe studio 6/6、引擎 e2e 118/118（Chromium + WebKit 及响应式
  project）。features/quickstart、template AGENTS/README 同步；实验仓台账
  回流。

## 4. Defer

- 通道级混合（入场未完呼吸已起）、appearance 条件绑定、每条目多条 ambient、
  非周期/随机表现原语、粒子系统——全部等真实需求回流。

## 5. Stop conditions

沿用 production-floor §9。本计划内特别注意：

- 任何实现路径要求权威 State/命令/Save/digest/replay 参与 → 停；
- 需要第二套动画格式或 motion 文档语义分叉 → 停；
- 不改 `StageTargetChangeV1`/reconciler 公共合同就无法落地 → 停（回到设计
  裁决）。
