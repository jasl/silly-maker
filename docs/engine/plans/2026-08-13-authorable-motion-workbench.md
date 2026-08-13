# Authorable Motion Workbench

状态：2026-08-13 由所有者接受为当前 active plan；M1–M5 全部完成，I4 闭环已在
external-experiment 实测走通（外部证据，见其 NOTES 台账）。本计划交付完毕。
[Production-floor sequence](2026-07-30-production-floor-sequence.md) 仍是唯一跨计划排序入口，
本文只拥有本能力的切片顺序与验收。

## 1. Evidence and positioning

真实产品证据：外部实验的手玩期反复出现「动画/节奏只能靠对话描述、AI 盲改」的
作者痛点；cat-cafe 的角色入场/反馈动画内联在 Story CSS 与 transition 字面量里，人类
无法定位与微调。R5 当年把 `keyframes(...)` defer 到「真实创作成本出现」，该条件现已满足。

定位：roadmap Track D 创作工具既定后续顺序第 2/3 项（arbitrary-boundary Stage
preview、Timeline scrubber）与 Track F 表现适配的落地。这不是 PF6/S5 Surface harness
的重开：不引入 universal envelope、第二 runtime authority 或 broad structural harness。

核心合同（design 归属 [vn-presentation-runtime](../design/vn-presentation-runtime.md) §9）：

```text
稳定 motion ID → 独立 *.motion.json 资产（admission 严格校验）
  → kind:"motion" 过渡绑定到 stage edge（复用 PresentationRun/reconciler 生命周期）
  → dev-only 反向定位（画面 → 资产/源文件）
  → Workbench 真实 Renderer 预览 + 受控时钟 + draft A/B
  → CAS 原子写回源文件 → HMR
```

不变量（每个切片都必须保持）：

- motion 是 presentation-only：不进 Snapshot、Save、digest、CommandLog、replay、RNG；
- 布局权威不变：motion 是 settled placement 上的临时覆盖，结束回 identity；
- draft 只存在于编辑器内存与预览 resolver，live game 与构建产物不消费 draft；
- 写回是 Host/tooling I/O：路径限定、schema 校验、id↔路径一致、CAS、原子 rename，仅 dev。

## 2. Slices

### M1 — Motion 资产地板（已完成 2026-08-13）

- `MotionDocumentV1`/`MotionDefinitionV1` + `parseMotionDocumentV1` 严格 admission
  （exact-record、整数界、首尾 keyframe 钉 0/1000、段级 easing 含 cubic_bezier permille
  控制点、authoring 元数据可剥离）；纯采样 `sampleMotionAtV1`。
- `StageTransitionDefinitionV1` 增加 `kind: "motion"`（legacy 形状原样有效；motion 键仅在
  motion kind 出现）；`motionStageTransitionV1` 从文档推导 durationMs 并绑定边行为。
- Reconciler/host：帧条目携带 motion payload，host 按线性 run progress 采样合成
  （offset 加法、permille 乘法），reduced-motion/skip/interruption 语义免费复用。
- 消费者：Engine Lab `motions/char-enter.motion.json`（角色入场，ease_out_back 过冲）、
  cat-cafe `motions/cat-entrance.motion.json`（小雨登场）。`resolveJsonModule` 开启，
  JSON import attribute 经 Deno/tsc/Vite 全管线验证。
- 验收证据：base/ui 新测试（admission 失败面、采样保持/缓动/过冲/贝塞尔、舞台集成
  delay-hold→中点→settle identity、exit ghost 包络）、typecheck/lint/story checks/
  Engine Lab release build 全绿。

### M2 — Provenance 与反向定位（已完成 2026-08-13）

- dev-only 表现溯源：渲染中的 stage entry → contentId/transitionId/motionId → 源文件路径；
  motion 源索引由应用声明的 motion 目录构建，不进生产 DOM 与权威状态。
- Stage 点击反查（debug capability 下）：点击条目 → 溯源卡片 → "Open Source"
  （vite open-in-editor）→ "Edit Motion" 入口。
- 验收：Engine Lab 里点击入场角色能显示其 motion 资产与文件路径；生产构建无此面。
- 交付记录：`StageFrameEntryV1.transitionId`（in-flight 定义 id 上帧）；
  `@sillymaker/ui/debug` 新增 `createStageInspectControllerV1`（帧上报 + last-identity
  记忆 + 选择）、`createMotionSourceIndexV1`（模块记录 → motionId→路径，重复 id fail
  fast）、`StageProvenancePanelV1`（检视开关/条目列表/溯源卡/Open Source/Edit Motion
  入口）与 `openStorySourceInDevServerV1`；stage host 收 `inspect` prop，检视开启时才
  渲染 `data-stage-inspect-hit` 命中面。tooling 新增 `sillymaker:dev-sources` vite
  中间件（`apply: "serve"`，POST `/__sillymaker/dev-sources/open`，路径限定 app 根、
  拒 symlink/node_modules/穿越，launch-editor 打开；构建/预览不存在）。Engine Lab 接
  `panel.e2e.provenance`；浏览器验收 `provenance.spec.ts`（chromium+webkit）：点击已
  settle 的入场角色 → 卡片显示 `transition.e2e.char-enter` / `motion.e2e.char-enter` /
  `src/motions/char-enter.motion.json`。"Edit Motion" 目前只是回调入口，M3 接
  Workbench。

### M3 — Motion Workbench（单 motion 编辑闭环，已完成 2026-08-13）

- 画布复用 detached preview 模式（`SemanticStageTargetHostV1`，无 Session、无第二 reconciler）；
- 受控时钟：PresentationRun/timeline player 增加 seek（即 Timeline scrubber）+ play/pause/loop/倍速；
- Inspector/时间轴：duration/delay/easing/逐轨 keyframe 编辑；saved/draft A/B；draft 只进预览 resolver；
- 写回端口：tooling vite dev middleware——read/validate/write，路径限定 + schema + id↔路径
  - expectedSourceDigest CAS + 临时文件原子 rename + 确定性格式化；仅 dev。
- 验收：在消费者应用里改 duration/起点/透明度 keyframe → A/B → 保存 → git diff 只有
  motion JSON → HMR 生效 → 权威 digest 不变。
- 交付记录：`PresentationRunV1.seek`（pending/paused 停靠不触发完成、running 续播、
  settled/cancelled 忽略）；`MotionWorkbenchV1`（`@sillymaker/ui/debug`）——detached 画布
  以 `settledStageFrameV1` + 合成 motion 帧直接喂 `SemanticStageHostV1`（纯采样、无
  reconciler、无 Session），起点 ghost 常显、播放/暂停/重播/循环/0.25–2× 倍速/毫秒
  scrubber、duration/delay/逐轨 keyframe（at‰/值/命名 easing/增删中间帧）、draft/saved
  A/B 与恢复、无效草稿阻塞保存；`createDevServerMotionIoV1` 走 tooling 的
  `/__sillymaker/dev-sources/motion` 端口（GET read 带 sha256 digest、POST write 做
  CAS：`digest_conflict` 409、schema `motion_invalid` 422、`motion_id_mismatch` 422、
  路径限定 `*.motion.json` + 拒 symlink/穿越/node_modules，临时文件 + 原子 rename +
  `formatMotionDocumentV1` 确定性格式化；`apply: "serve"` 仅 dev）。Engine Lab 接
  `panel.e2e.workbench`（溯源卡 "编辑 Motion" → 工坊，或直接从 motion 列表打开），
  预览 fixture 为 storeroom 背景 + alpha 角色 detached target。浏览器验收
  `workbench.spec.ts`（chromium+webkit）：改 duration 470 + 起点 keyframe 200 → A/B →
  保存 → 磁盘文件变更且测试内还原。draft 只存在于组件内存；live 场景只消费已保存
  资产。HMR 生效与"git diff 只有 motion JSON"的完整闭环由 I4 在 external-experiment 上
  走通（12 步验收）。

### M4 — 预览捕获与 Preview Case（已完成 2026-08-13）

- 从 live dev 画面捕获非权威表现 fixture（stage target + 绑定）直接打开 Workbench；
- 持久化命名 preview case（cat-cafe narrative-preview 先例），脱离剧情进度可达。
- 交付记录：inspect 控制器新增 `capture()` —— 把最近渲染帧重建为 detached settled
  `StageRenderTargetV1`（丢弃 exiting ghost）+ 当前选中条目键；明确不是 Save/
  Snapshot/replay anchor，不能回进 gameplay。溯源面板 "编辑 Motion" 现在携带该捕获
  （`onEditMotion(entry, capture)`）。新增 `MotionWorkbenchLauncherV1` +
  `createMotionWorkbenchStoreV1`（`@sillymaker/ui/debug`）：三个入口按优先级——live
  捕获 > 命名 preview case（`MotionPreviewCaseV1`，Story 源码里声明，脱离剧情进度
  可达）> Story fallback 预览；空态列出全部 case 与 motion 源。Engine Lab 的工坊
  面板改用启动器并声明 `case.e2e.char-enter` 案例；workbench e2e 从 case 打开。
  测试：捕获重建（stageId/条目/选中键）、启动器三入口（case 画布 x=500、capture
  x=300、fallback x=100 的 t=0 采样位移各自正确）。

### M5 — 协作护栏（已完成 2026-08-13）

- `authoring.status`/`locked` 的工具与文档语义：不覆盖 human-tuned/locked、场景重生成保留
  motion ID、locked 改动走 variant（authoring-quickstart + template/examples AGENTS）；
- `story check` 诊断：表现 cue 缺稳定 ID、应引用 motion 处的内联时长字面量（窄范围）；
- features/architecture/story-authoring 文档同步。
- 交付记录：Workbench 保存自动升格 `authoring.status: "human_tuned"`（M3 保存路径，
  运行时 `motionDefinitionFromDocumentV1` 剥离不变）。`story check` 新增 motion 源
  lint（`collectMotionSourceDiagnosticsV1`：扫描 story entry 所在源树的
  `*.motion.json`——严格 admission、跨文件 motionId 唯一、文件名 stem 必须是 id 末
  段；诊断码 `motion.document_json_invalid` / `motion.document_invalid` /
  `motion.id_duplicate` / `motion.id_filename_mismatch`，phase `lint`，跳过
  node_modules/符号链接/点目录）。**收窄决定**：计划原文的「内联时长字面量」启发式
  源码扫描器不实现——对 Story 场景代码做正则级 CSS/字面量识别误报率高（仓内
  cat-cafe 的合法组件级动画会立即被打），且违背「测试不做计划阶段执法」的仓规；
  该规则以协作合同交付（template/examples/e2e AGENTS「Motion collaboration
  contract」+ authoring-quickstart「Motion assets and the Workbench loop」+
  story-authoring 表现节），并已由 Grok 4.6 两轮真实内容/重构任务实证遵守（见
  external-experiment 台账）。出现真实覆盖事故且合同不足以拦截时，再以事故为证据考虑
  机械检查。文档同步：features.md（M2/M3/M4 三条能力）、vn-presentation-runtime
  §9/§10 状态、authoring-quickstart 诊断表 + 工作流节、story-authoring 表现节、
  三份 AGENTS。

## 3. Defer

- rotation 通道、任意 CSS 属性、任意 DOM selector：等真实消费者需要；
- 多 motion 编排的 Scene Timing Sheet：等单 motion Workbench 无法解决场景节奏的证据；
- Timeline cue 文档化（`*.cue.json`）与 cue 编辑：等第二个真实需求；
- 移动边（move kind）的参数化 motion：现由 slide/fromPlacement 覆盖。

## 4. Stop conditions

沿用 production-floor §9。本计划内特别注意：

- 写回端口出现在 dev 之外、或 draft 成为第二配置权威 → 停；
- motion 数据要进入 Save/digest/replay 语义 → 停；
- 需要为编辑器引入第二套规则实现（无法由正常 application 重现）→ 停。

外部实验只提供匿名需求反馈与真实使用验证；promotion 证据仅来自仓库内
Engine Lab 与 examples 消费者。
