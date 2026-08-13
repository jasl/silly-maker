# VN Scene Workspace V1

状态：2026-08-14 由所有者接受为当前 active plan。目标合同由
[场景创作模型与 SillyMaker Studio 设计](../design/scene-authoring-and-studio.md)
拥有；[Production-floor sequence](2026-07-30-production-floor-sequence.md) 仍是唯一
跨计划排序入口，本文只拥有本能力的切片顺序与验收。

## 1. Evidence and positioning

真实产品证据：Motion Workbench（M1–M5）交付后，孤立的数字编辑器仍无法让人完成基本
场景修改——所有者本人无法不读 TypeScript 剧情源码就"把小雨向左拖一点"。placement
字面量在剧情节点里、锚点约定在 Story CSS 里、cue→motion 绑定靠全局 resolver 推断、
一个开场散落十余个文件。2026-08-14 外部评审与所有者验收结论一致：缺的是 Scene
Authoring Layer，不是更多 Workbench 数字通道。

定位：roadmap Track D 剩余顺序第 6 项（editor shell）的窄纵切激活 + 既有 Motion
交付的产品化收编。保留并复用 Motion Workbench 的全部交付（资产、溯源、CAS 写回、
seek、preview case、协作护栏）；不重开 PF6/S5 broad harness，不引入 universal
envelope 或第二 runtime authority。

核心合同：

```text
一等 *.scene.json（严格 admission；视觉构图/placement/cue→motion 的唯一作者权威）
  → typed accessors 编译进现有 runtime contracts
    （StageMutation / transition fragment / mayShow / preview case / provenance）
  → StageContentGeometryV1（宽高 + 锚点）由 stage wrapper 拥有锚变换
  → Studio（调试坞「场景 → Studio」，或 /__sillymaker/studio/）：navigator + 真实 renderer 画布 + 直接操纵
  → dev-only CAS 写回（同 motion 端口纪律）→ HMR
```

不变量（每个切片都必须保持）：

- scene 编译产物与手写等值：placements 是相同整数，Snapshot/Save/digest/replay 字节
  不因来源改变；
- 不新建第二 gameplay runtime 或第二 Stage authority；Studio 画布是 detached
  target（无 Session、无第二 reconciler）；
- 一个场景只有一个作者权威（文档或低层 API，二选一）；低层 API 完整保留；
- 写回是 dev-only Host/tooling I/O：路径限定、schema、CAS、原子 rename；draft 只在
  Studio 内存；
- Studio/scene 代码不进 player bundle；runtime 包不得依赖 `@sillymaker/studio`。

## 2. Slices

### A0 — Scene 文档与编译（headless，已完成 2026-08-14）

- `SceneDocumentV1` + `parseSceneDocumentV1` 严格 admission（base contracts，
  exact-record、复用 placement 整数界、`format: "sillymaker.scene"`/`version: 1`、
  结构化诊断 path）；`sceneFromDocumentV1` typed accessors：`cueMutations`（含幂等
  保护）、`mayShow`、transition-catalog fragment（cue 精确绑定 +
  `scene.cue_binding_ambiguous` 冲突诊断）、preview case 派生、cue provenance。
- `story check` 增加 scene 源扫描（tooling，与 motion lint 同族：`scene.*` 诊断码、
  跨文件 sceneId 唯一、文件名 stem 与 id 末段一致、cue 引用的 motionId 存在）。
- 第一消费者：cat-cafe opening 迁移为 `src/scenes/opening/opening.scene.json`；
  script.ts 的 stage 节点改引用 cue accessors，placement 字面量与 transition
  catalog 里的 enter 推断退出剧情/表现源码。
- 不做 UI。
- 验收：cat-cafe 全部测试与 story checks 绿；迁移前后 opening scenario 的模拟
  digest 不变（同值同 digest）；`rg "x: 920" src/features/dialogue` 为空；Engine
  Lab 不受影响。
- 交付记录：`engine/packages/base/src/contracts/scene.ts` —
  admission（sceneId/cueId/motionId 模式与 96 字节上限、label ≤120、canvas
  1..1_000_000、entries ≤64（文档级 tag 唯一使 cue 引用无歧义）、cues ≤128、cue
  tag 必须指向声明的 entry、同边异 motion 拒绝）+ `sceneFromDocumentV1`
  （`cueMutations`/`cueMayShow`/`mayShow`/`cueMotionId`）+
  `sceneCueTransitionIdV1`（`cue.…` → `transition.…` 确定性派生）+
  `sceneStageTransitionBindingsV1`（enter/exit 边按 kind+layer+entryKey+content
  精确匹配；`definitions` 供 Story catalog 合成；未绑定边返回 null 落回）+
  `sceneSettledMutationsV1`（cue 顺序重放为 detached 预览批次，供 A2 画布/preview
  case）。公开导出进 base barrel 与 `@sillymaker/base/story` prelude（无 V1 后缀
  别名）。tooling `scene-diagnostics.ts` 接入 `checkStoryApplicationV1`。
  cat-cafe：`src/scenes/opening/{opening.scene.json, motions/cat-entrance.motion.json,
  index.ts}`；script.ts 两个 stage 节点改引用 cue，`hasTagV1`/`batchV1` 与坐标字
  面量删除；presentation.ts 的 catalog 改为 scene 绑定优先 + replace→crossfade 兜
  底。**收窄决定一**：cue kind 只有 `show`（ensure 语义：不在场→show，同内容→跳
  过，异内容→仅替换 content 保持 placement/appearance 连续性）与 `hide`；独立
  `replace` kind 被 ensure 覆盖，`setPlacement`/`setAppearance` 等真实需求再加。
  **收窄决定二（行为修正）**：旧 catalog 把小雨入场 motion 绑在所有 enter 边
  （注释自认"the cat is the only entry that enters mid-scene"），开场背景入场也
  在播 120px 跳跃动画；scene 精确绑定后背景 enter 恢复瞬切——这是本设计承诺的
  cue 精确性，非回归（digest/测试不受影响）。**检查器最小修正**：权威叙事代码经
  JSON import attribute 引用 scene/motion 文档后，两个 `.json` 首次进入权威闭包，
  scope-frozen 的 determinism checker 将其误报为 `determinism.source_unsupported`
  ——JSON 是惰性数据、无法表达调用，属于 AGENTS 允许的"真实权威代码暴露的可复现
  误报"。按最小修正原则：`.json` 闭包成员要求 `JSON.parse` 通过（坏文件仍 fail
  fast），不做语法证明，不新增诊断码；`.json` 保留在闭包内（placement 变化必须进
  build identity）。验收证据：base scene 14 tests、
  tooling 14 tests、cat-cafe 40/40、opening scenario simulate 报告与迁移前逐字节
  相等（`finalStateDigest`
  `sha256:3b835abbd0b2583a60cab659c8ed297b5ae91d129069e41a87b243ead621af81`）、
  `rg "x: 920" src/features/dialogue` 为空、typecheck/lint/`deno task check` 全绿；
  features.md/story-authoring.md/authoring-quickstart 诊断表/examples AGENTS
  scene 协作合同同步。

### A1 — Authoring geometry（已完成 2026-08-14）

- `StageContentGeometryV1`（width/height/anchorXPermille/anchorYPermille）作为
  `StageContentResolutionV1` 可选字段；投影校验整数界。
- stage wrapper 对声明 geometry 的内容拥有锚点变换（锚偏移在 scale 内合成）；
  template/cat-cafe/Engine Lab/bookshop renderers 删除 `translate(-50%, -100%)`；
  未声明 geometry 的内容保持现状（SillyOS 不受影响）。
- hit region 坐标系不变（本就以锚点空间声明）。
- 验收：锚变换单元测试（四角锚点 + 缩放 + 镜像组合）；四个 Story 的现有 e2e/浏览
  器断言保持绿（视觉等位）；`rg "translate\(-50%, -100%\)"` 在四个迁移 Story 为空。
- 交付记录：`stage-render-target.ts` 增加 `StageContentGeometryV1` + 投影校验
  （`stage.geometry_invalid` 降级为无 geometry，不断投影）+
  `StageRenderEntryV1.geometry?`；stage host 在 renderer 外包 engine content box
  （`data-stage-content-box`，宽高 + `translate(-ax, -ay)`，合成在 wrapper 的
  scale/mirror 之后——与旧 renderer CSS 完全同位，镜像绕锚点翻转），hit region
  仍是 wrapper 直属子元素、锚点空间不变。四个 Story 迁移：template/bookshop/
  Engine Lab 角色（220×420/220×420/220×360，底中锚）、Lab 道具按 border-box 实际
  可视盒声明（166×126/426×78，renderer 补 `box-sizing: border-box` 保持逐像素等
  位）、cat-cafe 猫按成长阶段帧表声明（帧表挪入 React-free
  `features/stage/frame.ts` 供 headless catalog 与 renderer 共用；code-native
  fallback 改为帧盒内底对齐，可见 blob 像素不变）。验收证据：投影/host 新测试
  （四角锚 + 缩放 + 镜像 + hit region 同位 + 无 geometry 不包盒）、
  `rg "translate\(-50%, -100%\)"` 四 Story 为空、`deno task check` 全绿
  （4,836 tests）、engine e2e 118 项（117 过 + 1 项 chromium workspace-overlay
  负载偶发、单独重跑 5/5 过）、examples e2e 56 过 2 跳（Cat Cafe/模板/Bookshop/
  SillyOS 浏览器断言全绿）。

### A2 — Studio shell 与写回（已完成 2026-08-14）

- 新包 `@sillymaker/studio`（依赖 base/ui/tooling；不进 player bundle）；
  `story author <application-id>` verb + 根 `deno task author` 分发：启动该应用
  dev server 并挂 Studio 入口（`apply: "serve"` 纪律，构建/预览不存在）。
- V1 面板：scene navigator（scanner 列出 `*.scene.json`，点击即开、无需玩到该场
  景）、真实 renderer 画布（detached target）、Inspector（entry 的 content/
  appearance/x/y/scale/mirror/zOrder/入场 motion；数字输入为精细入口）、cue 列表、
  嵌入现有 `MotionWorkbenchLauncherV1`（case 由 scene 文档派生）。
- tooling 增加 scene CAS 端口（`/__sillymaker/dev-sources/scene`：GET 带 sha256
  digest、POST CAS 写回，路径限定 `*.scene.json`、schema admission、409/422、临时
  文件 + 原子 rename、确定性格式化，仅 dev）。
- 验收：在 cat-cafe 上打开 Studio → 选 opening → Inspector 改 x/y → 保存 →
  `git diff` 只有 scene JSON → 运行中的游戏 HMR 生效 → 权威 digest 不变。
- 交付记录：tooling `scene-port.ts`（read/write CAS + `scene_id_mismatch` +
  `/__sillymaker/dev-sources/scenes` 列表端点，坏文档不进 navigator）注册进
  `devSourcesPluginV1`；`sillymaker.config.ts` 新增 `studio: { module,
  exportName }` 声明（config-types/config/derive 全链），`studioPluginV1`
  （`apply: "serve"`）用 `server.transformIndexHtml` 出 Studio HTML（vite client
  - React preamble 注入）+ 虚拟入口 `/__sillymaker/studio-entry.tsx` 挂载
    binding；`story author <appId>` verb + 根 `deno task author`。新包
    `@sillymaker/studio`（workspace 注册 + tsconfig references base/ui）：
    `StudioBindingV1`（catalog + renderers + motions）、`createDevServerSceneIoV1`
    （list/read/write 浏览器客户端）、`StudioAppV1`（navigator 自动开第一个场景；
    detached 画布 `SemanticStageTargetHostV1` 缩放预览；Inspector 数字编辑写 draft
    并实时重编译，编译失败横幅阻塞保存；cue 表「到此为止」重放 + show cue 的
    motion 下拉改绑定；保存走 CAS，409 提示重新加载；draft 只在内存）。cat-cafe
    第一消费者：`src/tooling/studio-binding.tsx`（registry-less renderers 画
    code-native 猫，placement/锚点/预览与真实资产完全同参）。验收证据：scene-port
    5 tests + Studio jsdom 4 tests（列表/画布/CAS 保存载荷/409 草稿保留/到此为止/
    编译错误阻塞）；浏览器验收 `examples/e2e/cat-cafe-studio.spec.ts` 2/2（改 x
    920→880 → 保存 → 磁盘只有 scene JSON 变化并还原；cue 绑定显示 + 重放 + 工坊
    case 列表）；`story build example-cat-cafe` 后 `dist-web` 无任何 Studio 标识
    （player bundle 干净）；typecheck/lint 全绿。HMR 生效链与 A0 相同（场景 JSON
    是剧情模块的 import，Vite 自动失效）；「权威 digest 不变」= Studio 浏览/草稿
    编辑不触碰 live session（detached target，无 Session/reconciler）。

### A3 — 直接操纵（实现完成 2026-08-14，十步闭环待所有者实测）

- Placement 模式：画布 overlay 按投影 target 的 placement + geometry 画出可点
  选的选择框（锚点/镜像/缩放同参），拖动写 x/y（pointer ÷ preview scale → 整数
  逻辑坐标，钳制画布内），吸附画布边界与水平/垂直中线（8 CSS px 阈值、吸附导
  线高亮），选中态显示锚点圆点与角部缩放手柄（拖动改 scalePermille，10‰–
  100000‰ 钳制）；镜像/层级沿用 A2 Inspector 控件，数字输入保留为精确次级入口。
- Motion 模式（Workbench）：点击时间轴圆点＝选中并 seek；选中后 ghost 显示该
  keyframe 停点姿态并可拖拽，拖 ghost 在该停点写 offsetX/offsetY（精确停点更
  新、缺失停点插入、缺失轨道以 baseline 端点创建，值 ±100000 取整钳制）；拖中
  间圆点改 atPermille（严格钳在邻居之间，0‰/1000‰ 端点固定）。两个编辑都是纯
  函数（`engine/packages/ui/src/debug/motion-edit.ts`），产物重新过 Motion 严格
  admission，数字 Inspector 保留为同数据的次级能力。
- 已有验收证据：motion-edit 7 tests；Workbench jsdom 交互（选中 → ghost 拖拽
  写停点值 → 时间轴拖动 500‰→700‰）；Studio jsdom 拖拽/吸附导线/边界钳制/缩放
  手柄；浏览器验收 `cat-cafe-studio.spec.ts` 画布拖拽 −45 CSS px → x 920→840 →
  CAS 保存 → 磁盘断言并还原（3/3）；全量单测 290 files / 4855 tests 与 engine
  `workbench.spec.ts` 全绿。
- 剩余验收：设计 §8 十步闭环由所有者在 cat-cafe opening 实测走通，全程不打开
  script.ts/presentation.ts/composition.tsx/renderer CSS，`git diff` 只有
  `opening.scene.json` + `cat-entrance.motion.json`。

### A4 — Starter 与文档迁移

- 发现入口：`deno task author` / `deno task dev` 启动同源 Vite；人类从游戏里打开
  调试 → 场景 → Studio（新标签页，不替换进行中的会话）。生产构建与未声明
  `studio` 绑定的应用不显示该入口。不要求 `author` 自动弹出浏览器。
- scene-first starter：用户先看到可玩示例场景，再从调试坞进 Studio；现有低层
  starter 降级为 advanced/low-level 参考（目录命名与迁移方式由本切片与所有者确
  认）；`application/**` 标注 Advanced。
- authoring-quickstart 重写为「玩游戏 → 调试坞 Studio」优先，`deno task author`
  仍是 CLI 启动方式；低层 Tier 保留为高级路径；template/examples/e2e AGENTS 增加
  scene 协作合同（单一作者权威、不复写 placement、cue 命名纪律），与 M5 motion
  合同同族。
- 验收：新 starter 开箱可玩且调试坞能打开 Studio；文档与 AGENTS 同步；旧 starter
  的引用路径全部更新。

### A5 — 第二消费者验证

- 用 external-experiment 重写实验验证：多人物、多场景、同一人物不同登场 motion、
  背景切换、表情、场景重开、人类修改与 AI 重构后保留人工资产（`human_tuned`/
  `locked` 纪律沿用）。
- 外部实验只提供匿名需求反馈与真实使用验证；promotion 证据仅来自仓库内 Engine
  Lab 与 examples 消费者（新增仓内第二 scene-managed 消费者后，评估把 Studio 与
  scene 合同写入 features.md 的 promotion）。
- 验收：反馈以最窄切片回流本计划；未满足的限制记录在案。

## 3. Defer

- Scene Timing Sheet（人物/相机/BGM/SFX/对白同轴编排）：等单 cue + 单 motion 无法
  解决场景节奏的真实证据（沿用 Motion Workbench 计划的 defer 钩子）；
- `TransitionRequest` 携带 cue 身份的 runtime 扩展：等"同 tag 同 kind 需按次序选不
  同 motion"的真实场景；V1 用 scene 派生的精确绑定 + 冲突诊断覆盖；
- rotation/任意 CSS 通道、通用 node graph、任意 DOM/UI 编辑器、卡牌/SLG/战棋编辑
  器：非目标；
- gameplay 数据表编辑器（Track D 第 4 项）与 Save migration inspector（第 5 项）：
  另行激活；
- 双写执法的机械扫描：按 M5 先例以协作合同交付，出现真实事故再考虑。

## 4. Stop conditions

沿用 production-floor §9。本计划内特别注意：

- scene 文档要成为第二 gameplay/State 权威，或编译产物无法与手写等值（digest/
  replay 变化）→ 停；
- 写回端口出现在 dev 之外、draft 成为第二配置权威 → 停；
- Studio 需要一套无法由正常 application 重现的规则实现 → 停；
- cue 绑定需要改 `StageTargetChangeV1`/reconciler 公共合同才能落地 V1 → 停（那是
  defer 的显式扩展，需单独裁决）；
- 同一场景出现两套作者输入的真实冲突且协作合同不足以拦截 → 停并升级为机械检查
  裁决。
