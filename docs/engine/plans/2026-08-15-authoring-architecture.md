# Authoring Architecture V1

状态：2026-08-15 由所有者接受并于同日完成；S0–S5 全部切片已交付
（各切片交付记录在文内），计划已结束且无剩余可命名切片。目标合同由
[统一创作架构设计](../design/authoring-architecture.md) 拥有（Scene 文档与 Scene
workspace 的领域合同仍归
[场景创作模型与 SillyMaker Studio](../design/scene-authoring-and-studio.md)）；
[Production-floor sequence](2026-07-30-production-floor-sequence.md) 仍是唯一跨计划
排序入口，本文只拥有本能力的切片顺序与验收。

## 1. Evidence and positioning

- [VN Scene Workspace](2026-08-14-vn-scene-workspace.md) A0–A6 已交付并于
  2026-08-15 完成移交。A5 两轮基准 + 实验仓真实内容迁移证明"调校既有场景"可用，但
  素材/内容进场成本两轮未降（人物 8 登记点、背景 6 点、新 motion 4 文件且要在
  studio binding 重复登记路径），Studio 不能从零构造场景。
- 所有者决定（2026-08-15）：所有者常态角色是**试玩者与 bug 报告者**（试玩
  实验仓项目，借助 Studio/Inspect/状态工具把问题定位到场景/角色/cue/motion/
  状态路径），日常修改主要由 Agent 完成。因此优先级是工程架构与文件组织看齐严肃
  游戏引擎（创作工具信任性、结构化编辑操作、代码局部性），而不是继续扩充底层
  Runtime。原 A3 十步闭环的所有者实测验收按此决定重新定标：直接操纵证据以浏览器
  自动化 + 实验循环真实使用为准（所有者首次实测已回流真实素材缺口并交付修复）。
- 2026-08-15 外部评审结论与所有者一致；其技术论断已逐条对照代码核实。属实并由
  本计划修复：跨场景 bound-vs-unbound 泄漏无 lint（A5 早已记录在案）、同 edge 重
  复 cue 静默丢弃后者 edge options、Studio 脏草稿可被无提示丢弃、异步打开无陈旧
  结果 fence、hide cue 无 motion 编辑闭环（workbench phase 硬编码 entering）、四
  处静默降级丢诊断、saved 视图下仍可改草稿、scene parser 在拒绝前执行 getter、
  template builder 不拒同名 option、motion 双登记。核实修正两处：同文档异 motion
  在 admission 已被拒（first-wins 只影响同 motion 异 options）；"多实例 lease"是
  Player 实例租约（`packages/web`），设计内的 IndexedDB 失败已发布 unavailable，
  缺的只是意外抛错的兜底。
- 外部实验仓 2026-08-15 已用交互文档 kit（补齐 branch/stage/flag/barrier/end）
  生产首批全新内容，十余刀引擎全程零改动——支持本计划"收敛 authoring、不扩
  runtime"的定位。实验的引擎侧回流以其
  capability backlog 为通道：高密度表现内容（下一波）前置于氛围循环动效原语
  （P0-2，见下方设计裁决）；fault cause 诊断（P1-1）与过渡收敛测试助手（P1-3）
  收为 S0 小项；只读叙事图（P2-1）对应 S5；typed state store 维持 optional
  （两轮实证无痛点，不构成激活证据）。

不变量（每个切片都必须保持）：

- 不新建第二 gameplay/Stage 权威；索引与会话是 tooling/编辑器基础设施，不是第二
  配置权威；权威消费路径（显式 import + 确定性闭包 + build identity）不变；
- 布局与索引迁移不得改变任何 simulate digest / Save / replay 字节（纯移动 + 等值
  编译）；
- 写回保持 dev-only CAS 纪律；draft 只在 Studio 内存；Studio/scene 代码不进
  player bundle；
- 不提交生成文件（generated exports 不入库）；索引在 dev/build/check 时构造。

## 2. Slices

### S0 — Studio 作者信任加固

不扩大产品范围，先让既有创作闭环可信。

- **S0.1 Scene 绑定边界 fail-closed（base + tooling）**：
  `sceneStageTransitionBindingsV1` 内不同 cueId 落到同一 edge 时，归一化比较
  `motionId + edge options`（未声明 options 归一为默认值）——完全相同允许复用第
  一条（重开场景的合法 dedup），不同则结构化拒绝（作者需拆 tag/content 或等 cue
  身份扩展）；`story check` 新增跨场景 bound-vs-unbound 碰撞诊断
  （`scene.cue_binding_scope_collision`：同 edge 一方绑 motion、另一方 cue 未绑
  ——未绑场景会继承前者 motion），建议文案与既有 collision lint 同族。验收：lint
  与合同单测；仓内五 Story 绿；实验仓的真实泄漏变体（同 tag 复用的第二登场立绘）能被点名。
- **S0.2 Scene parser getter-free 探测（base）**：optional key 探测改用
  descriptor/`Object.hasOwn`，不在 `readExactRecord` 拒绝前执行任何作者提供的
  getter（`parseSceneDocumentV1` 是公共 strict admission API，属 untrusted-data
  档）。最小测试：getter 零调用；不扩展成 intrinsics 捕获类防御。
- **S0.3 Studio 文档会话信任（studio）**：脏草稿导航闸门（切场景/重新加载/浏览器
  刷新关闭统一走 保存/放弃/取消，dirty 时挂 `beforeunload`）；`openScene` 加
  monotonic request id 或 AbortSignal 的陈旧结果 fence + 加载态（加载中禁止保
  存——现状旧脏草稿在切换途中仍可保存）；Workbench saved 视图发生任何编辑手势即
  显式切回 draft 并给出视觉提示。验收：jsdom 交互测试 + 浏览器验收（脏草稿切换
  确认至少一条 e2e）。
- **S0.4 Exit motion 编辑闭环（studio + ui）**：workbench preview fixture 升级为
  `phase: "enter" | "exit"`（enter 动画 after-target 的新条目；exit 动画
  before-target 中即将离开的条目）；workbench frame 不再硬编码 `"entering"`；
  hide cue 与 show cue 一样提供 motion 下拉。验收：hide+motion 的 case 可打开、
  可拖 ghost、可保存；合同已允许（`motionId`: enter for show, exit for hide），
  仓内补一个真实 hide cue 消费者或 fixture 级测试。
- **S0.5 Authoring diagnostics 面板（studio）**：停止静默丢弃——projection
  diagnostics、motion admission 失败、workbench 构造失败、asset preload 失败进入
  统一面板；Blocking（文档非法/cue 目标缺失/motion 或 renderer 缺失）阻止保存，
  Warning（资产回退/geometry 缺失/appearance 键忽略）可见不阻止。Player 的
  fallback 韧性不变。
- **S0.6 Player 实例租约后台刷新兜底（web）**：`instance-lease` 的定时器/
  BroadcastChannel/visibility 触发的 `void refreshV1()` 统一 catch → 发布
  `unavailable` 并上报；显式 Take Over 的失败仍返回 UI。
- **S0.7 template builder option 唯一性（template）**：`defineTemplateScriptV1`
  choice 内 option name 建唯一集，重名构造期抛错（与 README"重名构造期报错"承诺
  对齐）。
- **S0.8 Fault cause 诊断通道（base + ui debug）**：执行器 fault attempt 信封携
  带结构化诊断（message + 栈摘要；非权威数据，不进 Save/digest/replay），调试坞
  显示最近一次 fault cause。证据：实验仓 P1-1——现状信封只带 code，定位
  "每 owner 每事务一次提案"违约靠临时 console。
- **S0.9 过渡收敛测试助手（ui 测试面）**：舞台"过渡飞行中"数据属性或测试助手，
  e2e 一行等待收敛。证据：实验仓 P1-3——crossfade 双图并存、打字机首击补全
  都是正确合同，但每个 e2e 都要自带循环/等待知识。

交付记录（2026-08-15，S0 全部子项）：

- **S0.1**：`sceneStageTransitionBindingsV1` 重复边从静默 first-wins 改为实效行为
  比较——五个 edge option 字段经 `motionStageTransitionV1` 默认值归一后相等才允许
  别名（重开场景的合法 dedup；显式默认值与省略等价），分歧以
  `scene_cue_edge_options_conflict` 拒绝。`scene.cue_binding_scope_collision`
  lint 登记全部 cue 边：bound 遇先到的 unbound 报一次并消费记录，unbound 遇已
  bound 的边每个泄漏点各报一次，双向点名文件/cue 并给拆分建议。
- **S0.2**：optional key 探测改 descriptor（`hasOwnDataValueV1`）——accessor 记
  在场、交给 `readExactRecord` 以 `data_property_expected` 拒绝（getter 零调用，
  测试锁定）；显式 `undefined` 数据属性仍走 `object_keys` 拒绝。
- **S0.3**：Studio 脏草稿导航闸门（切换/重载统一 保存并继续/放弃修改/取消；
  dirty 时挂 `beforeunload`）；`openScene` monotonic fence + loading 态（加载中
  禁存、迟到读取丢弃、切换后完成的保存不复活旧场景身份）；Workbench saved 视图
  发生任何编辑手势自动切回 draft（A/B 开关同步反映）。jsdom 三用例；浏览器闸门
  用例放在 template studio spec（cat-cafe studio spec 的写盘用例会跨浏览器
  project 触发 vite JSON 整页重载，与长期持有脏草稿的用例互相干扰——starter 的
  spec 无写盘邻居，闸门确定性可测）。已知边界记录：重载/放弃后条目选择重置回首
  个条目；vite 对 scene JSON 的整页重载遇到脏草稿时由 `beforeunload` 兜底。
- **S0.4**：`MotionWorkbenchPreviewV1.phase`（enter/exit）取代硬编码 entering；
  Studio 为 hide cue 构造退场 case（结算到该 cue 前一刻、条目在场校验、标签注明
  退场）并给 hide cue 开放同款 motion 下拉；exit 预览按 exiting 边渲染。
- **S0.5**：创作诊断面板——投影诊断（content 无解析/geometry 非法）、motion
  admission 失败、Workbench case 不可构造、资产预载失败、renderer 未注册全部
  可见（Warning 不阻塞保存）；编译失败仍是唯一 Blocking（禁存）。
- **S0.6**：Player 实例租约的后台刷新（轮询/BroadcastChannel/visibility）统一
  catch → 发布 `unavailable`、后续成功刷新可恢复；显式 refresh/takeOver 仍向调
  用方抛出。
- **S0.7**：`defineTemplateScriptV1` choice 内 option 重名构造期抛错
  （`script_duplicate_option:<choice>.<option>`）；跨 choice 复用共享标签（如
  "返回"）仍合法且共享派生条目（双向测试锁定）。
- **S0.8**：`SessionFaultCauseV1` 非权威 fault cause 通道——session 在四个
  fault-normalize 捕获点记录原始 message + 栈摘要（dispatch/debug/session），
  `GameSessionV1.getLastFaultCause()` → `instance.admin.lastFaultCause()` →
  调试坞「最近故障」块；不进 attempt 信封、CommandLog、Save、digest、replay
  （测试断言日志序列化不含原始消息）。
- **S0.9**：核实后收敛为发现性补齐——舞台 `data-stage-settled` 与 template 的
  `data-dialogue-reveal` 两个收敛信号早已交付且有 e2e 消费；quickstart 诊断表
  增补两个新诊断码与"浏览器等待信号"段，template AGENTS 增补同款条目，未新增
  引擎面。
- features.md 四处同步（scene admission/lint、Studio 信任行为与诊断面板、
  Workbench A/B 与 phase、调试坞最近故障）。
- 验收证据：全量 `deno task check` 绿（format/lint/styles/typecheck/determinism/
  全部单测/assets/五 Story checks/Engine Lab release build）；聚焦单测——base
  scene 与 tooling lint 31、template 与 web lease 25、session 与 dock 99、studio
  与 workbench 20；浏览器验收 cat-cafe studio spec 6/6、template spec 8/8
  （Chromium + WebKit，含新的脏草稿 reload 闸门用例）。

### S1 — Studio core 与共享文档会话

- **S1.1 Studio 包内部模块化**：`studio-app.tsx`（885 行单文件）拆为
  `core/`（project-index、document-session、commands、diagnostics、selection、
  navigation、preview host）与 `workspaces/`（scene、motion）；不拆第二个包；
  行为不变（现有 jsdom/e2e 全绿）。
- **S1.2 Authoring Document Session 统一**：设计 §4 的会话合同收编 scene 与
  motion 两个真实消费者（saved/draft/dirty/diagnostics/apply(command)/undo/redo/
  save/reload/discard）；S0.3 的导航闸门与 fence 语义上移为会话所有；undo/redo
  首次进入两个 workspace。验收：两域共用同一会话实现；CAS/409 语义不变；undo/
  redo 在 scene 与 motion 各有行为测试。

交付记录（2026-08-15，S1 两个子项）：

- **S1.2 共享会话**：`createAuthoringDocumentSessionV1`（React-free 状态机 +
  `useAuthoringDocumentSessionV1` 绑定）统一拥有 saved/draft/dirty、monotonic
  open fence（陈旧读取与被更新 open 取代的保存一律丢弃）、CAS 保存（成功后草稿
  = 已写入文档；作者调整过的载荷——如 human_tuned 升格——成为一步可撤销）、
  `refreshSaved`（409 恢复：刷新 saved 与 digest、保留草稿）、可撤销的
  discard、有界 undo/redo（`coalesceKey` 把一次拖拽手势或同字段连续输入折叠为
  一步）。**放置决定（显式记录，偏离设计 §2 草图）**：会话原语落在
  `@sillymaker/ui/debug` 而非 studio/core——包方向 studio→ui 决定了这是唯一能让
  Motion Workbench（DevDock 内嵌与 Studio 共用的 ui 组件）与 Studio 场景侧消费
  同一实现的位置；studio/core 保留场景适配 `createSceneDocumentSessionV1`。
  DevDock 内嵌工坊因此顺带获得 undo/redo。
- **S1.2 两个消费者**：Motion Workbench 删除自带的 saved/draft/revert 状态机改
  跑会话——保存后 dirty 归零的干净语义取代旧的"saved 已升格、draft 未升格"错
  位，409 重读保草稿语义保留；Studio 场景侧 loaded/draft/fence/save 全部收编，
  S0.3 的导航闸门/beforeunload/确认条留在 shell 消费会话 dirty。两侧新增
  撤销/重做（motion 在 A/B 行、scene 在顶栏），undo/redo 与编辑手势一样在
  saved 视图下自动回切 draft。
- **S1.1 模块化**：`studio-app.tsx`（1186 行单文件）拆为 shell（~520 行：导航/
  顶栏/确认/诊断/资产预载/会话装配）+ `core/{scene-io,scene-session,binding}` +
  `workspaces/scene/{scene-compile,scene-canvas,scene-inspector,scene-cues}` +
  `workspaces/motion/{motion-cases,motion-workspace}`；不新增包；公开导出与 DOM
  选择器不变。
- 验收证据：会话单测 7/7（fence、CAS、409 恢复保草稿、coalesce 与历史上限、
  discard 可撤销、无 digest 禁存、后一次 open 失败保留当前文档）；studio +
  ui/debug 全部 14 文件 126 测试绿（含 scene/motion 双侧 undo/redo、首场景打开
  失败不重试、既有全部交互用例原样通过）。自查修正：首场景打开失败时
  `loading` 的 false-edge 若留在 auto-open effect 依赖里会无限重试（S0 的
  `loaded === null` 不会在失败后重触发）——改为一次性 auto-open ref，导航器
  点击仍可显式重试。全量 `deno task check` 绿（296 文件 / 4921 测试）；浏览器
  cat-cafe studio 6/6、template 8/8（Chromium + WebKit，拆分后 DOM 行为等位）。

### S2 — Project Authoring Index

- tooling 按目录约定扫描 `scenes/**/*.scene.json`、`scenes/**/motions/*.motion.json`
  构造统一索引（dev/build/check 时构造，不落盘）；`story check` 的既有 scanner 与
  Studio 枚举收敛到同一实现；`StudioBindingV1` 收窄为 content catalog + renderers
  - assets（+ 可选预览适配），删除手工 motion path 列表。
- 验收：新增一个 motion 文件 = 1 个文档，Studio 与 runtime（经 scene 包显式
  import）自动可见，`git diff` 无 studio-binding 变化；template 与 cat-cafe 迁
  移；`story check` 与 Studio 的枚举结果一致；实验循环复测"新 motion 4 文件 →
  ≤2"（文档本身 + scene 包 import）。

交付记录（2026-08-15）：

- **统一索引**：`buildAuthoringProjectIndexV1`（tooling/project）一次目录扫描产出
  `{scenes, motions, skipped}`——严格 admission、确定性路径序、跳过
  node_modules/点目录/symlink；不可入册文件带结构化 reason 进 `skipped`，不静默
  消失。**约定裁决（显式记录）**：本切片按后缀约定扫描整棵 story 树
  （`*.scene.json` / `*.motion.json`），与现布局和 S3 目标布局都兼容；计划正文的
  `scenes/**` 字面 glob 属 S3 布局迁移后的形态，S3 纯移动时索引无需改动。
- **一处发现，处处消费**：scene/motion 两个 `story check` lint 的私有 walker 删
  除，改走共享 `listAuthoringSourceFilesV1`（scene lint 的已知 motion id 集直接
  取自索引）；scenes 列表端点改为索引视图并新增 `skipped`；新增
  `/__sillymaker/dev-sources/motions` 列表端点（`listMotionSourceFilesV1`）。
  枚举一致性由 parity 单测锁定（索引 skip ⊆ lint 点名文件、文件集合相等）。
- **StudioBindingV1 收窄**：删除 `motions` 手工登记（`StudioMotionSourceV1` 类型
  随之删除）；binding 只剩 catalog + renderers + 可选 assets。Studio 壳新增必填
  `motionIo`（`MotionSourceIoV1` 增加 `list()`，dev 客户端实现列表解析），启动时
  list + read 构建 motion 目录与 Workbench 源；索引 skip 与读取失败以
  「motion 文档未索引/读取失败」进创作诊断面板，场景 skip 同样点名。生成的
  Studio 入口传入 `createDevServerMotionIoV1()`。
- **迁移**：template 与 cat-cafe 的 studio-binding 删除 motion 登记与 JSON
  import——新增 motion = 文档本身 + scene 包显式 import（runtime 播放），Studio
  自动可见（starter e2e 的 mei-entrance 下拉断言现在走索引路径）。已知边界：
  没有任何模块 import 的全新文件不会触发 vite 重载，Studio 刷新页面后可见。
- 验收证据：索引/lint/端口聚焦单测 7 文件 32 用例（含 S2 parity 用例与
  skipped 形状）；studio + ui/debug 14 文件 127 用例（新增索引枚举 + skip 点名
  用例）；全量 `deno task check` 绿（297 文件 / 4927 测试）；浏览器 cat-cafe
  studio 6/6、template 8/8（Chromium + WebKit）。实验循环"新 motion 4 文件 →
  ≤2"的复测由下一轮回流。

### S3 — Story 包目录 locality（template 先行）

- template 收敛到设计 §5 的按创作对象布局（game/content/scenes/story/ui/
  application；精确目录名本切片与所有者确认），examples 随后逐个迁移；纯移动，
  每个 Story 迁移前后 simulate digest 逐字节相同；AGENTS 手册与 quickstart 同步。
- 验收：digest 平价；实验循环复测局部性硬指标（设计 §5 表）。

交付记录（2026-08-15）：

- **所有者确认的目录名**（三项裁决）：顶层 `game/content/scenes/story/ui/
  application` 按设计示意执行；`presentation.ts`（文本+content+transition 混合
  facet，纯移动不拆）落 `content/presentation.ts`（S4 内容工作区在此生长）；
  gameplay feature 切片保留 feature-slice 词汇落 `game/features/<slice>/`（切片
  内含其 UI 组件）。`story.ts` 留在 `src/` 根：它是 config 的 storyEntry，
  `story check` 与 authoring index 的扫描根 = 其所在目录，移深会缩小扫描范围。
- **四个 Story 全部迁移**：template（kernel/state/simulation/simulation-definition
  → game，narrative 三件 → story，stage-renderers → ui）；bookshop（同构子
  集）；silly-os（runtime.ts → game，OS app 切片整体进 game/features）；
  cat-cafe（玩法内容数据库 `content.ts` → `game/content.ts`——它是权威侧只读数
  据，不是 presentation content；剧本保持 feature 所有
  `game/features/dialogue/script.ts`，`narrative-graph.ts` 投影 → story/）。
  e2e（Engine Lab）按计划范围不迁移，保持平铺 rig。
- **纯移动证据**：四个 app 的 `story simulate` 完整 JSON 迁移前后逐字节相同
  （finalStateDigest 与全部 steps）；五 Story `story check` 全绿。
- **守卫配置跟随（最小修正，非扩展）**：determinism authority map 的每 app
  `callbackOwnerEntry`/dependency seed 更新到 `src/game/simulation-definition.ts`；
  presentation 负控入口从字符串插值改为显式 per-app `presentationEntry` 政策字
  段；simulation 纯度检查的 presentation pattern 同时覆盖新旧两种布局（迁移使旧
  pattern 出现具体漏报，属"具体回归的最小修正"）。三个 example 的
  build-identity collector 入口路径与 forbidden 前缀同步（build identity 是构建
  标识，不在受保护的 simulate digest/Save/replay 字节集内）。检查器在迁移中间态
  抓住了 8 处漏改的 feature→application import，证明其价值。
- **文档同步**：template/examples AGENTS 手册、authoring-quickstart（含布局
  段）、architecture、story-authoring、agent-game-guide、website 四篇指南
  （en+zh）；设计与已完成计划里的历史记述不改写。
- 验收证据：`deno task check` 全绿（297 文件 / 4927 测试，含 determinism 检查与
  五 Story checks）；完整 examples 浏览器套件跑两轮，各 75/78 过、2 例条件跳过、
  各 1 例 WebKit 失败——两轮失败用例不同（一次 studio 回放、一次 petting 命中
  区），均隔离复跑即过，chromium/firefox-save/mobile 两轮全绿：判定为 78 用例串
  行长跑下的 WebKit 抖动，与本切片纯移动无关（digest 平价 + 单测/typecheck 全绿
  佐证）；engine 套件不受影响（S3 未触碰引擎包与 e2e）。局部性硬指标（设计 §5
  表）复测归实验循环下一轮回流。

### S4 — Scene Construction V1

- `StudioContentDescriptorV1` content authoring manifest 进 studio binding；
  Content workspace：内容浏览、拖入场景自动建 entry（稳定 tag 派生）、增删
  entry、增删 show/hide cue、appearance 结构化控件（`appearanceFields`）、
  geometry 缺失诊断；新建/克隆 motion 并经 S2 索引自动登记；新建 scene 文档。
- 验收（普通作者零接线）：从空白新建场景 → 浏览器加背景/人物 → 拖动 → 建 cue →
  新建/选 motion → 保存，全程不编辑 scene barrel、transition catalog、studio
  binding motion 列表、application composition、renderer 注册路径或 project
  config；浏览器 e2e 走通一条完整构造链。

交付记录（2026-08-15）：

- **合同落位**：`StudioContentDescriptorV1` + `StudioAppearanceFieldV1` 进
  `StudioBindingV1` 可选 `contents`（category/默认 layer/zOrder/placement/
  appearance/结构化外观字段）。**显式偏离设计 §3 概念形状**：描述符不带
  `geometry`——catalog 的 `resolveContent` 已是 geometry 唯一声明点，不做第二
  权威；geometry 缺失诊断改由 manifest category + catalog 解析推导。
- **创建端口（create = CAS 的"无文件"形态）**：scene/motion 两个 dev 端口的
  POST 接受 `expectedDigest: null`——文件必须不存在（409 `already_exists`）、
  strict admission、文件 stem 必须是 id 最后一段（与 `story check` lint 同
  规）、树内 id 重复以 `already_exists` 点名既有文件拒绝；缺失目录创建 + 临时
  文件原子 rename；路径解析与读写共用同一 shape/包含/反 symlink 纪律
  （`resolveDevSourceCreatePathV1`）。仅 dev；浏览器客户端增加 `create()`。
- **Content workspace**：导航列内容浏览按类别分组（背景/人物/道具/效果）；
  「加入」派生稳定 tag（`content.<rest>` → `tag.<rest>`，重名 `-2` 去重）+
  描述符默认值，未声明 defaultPlacement 的可放置内容落画布中心（背景不带
  placement），加入即选中可拖。**交互裁决（显式记录）**：“拖入场景”实现为
  点击加入 + 画布拖拽定位（验收动词=「浏览器加背景/人物 → 拖动」），不做
  列表到画布的 DnD。移除条目连带其全部 cue（admission 要求 cue tag 可解
  析），一步可撤销；cue 表新增/删除派生 id 的 show/hide cue
  （`cue.<story>.<scene>.<tag 尾段>[-hide]`）；`appearanceFields` 渲染为结构
  化下拉（未设置=删键，空 appearance 删字段）；可放置内容解析无 geometry →
  浏览器「不可拖拽」徽记 + 每条目诊断警告（背景合法省略，保持安静）。
- **新建/克隆 motion**：未绑 cue 一键新建 300ms 透明度渐变（show 淡入 /
  hide 淡出，`authoring.status: "generated"`），已绑 cue 克隆其文档为新
  id；文件落场景旁 `motions/<stem>.motion.json`，经 S2 索引自动进目录与
  Workbench，改绑 cue 是一步可撤销的草稿编辑（scene 保存时一起落盘）。
- **新建 scene**：导航器表单派生 sceneId 前缀（既有场景 → contents manifest
  的 story 段 → 字面 `story`），空文档落 `src/scenes/<stem>/<stem>.scene.json`
  并经脏草稿闸门打开；空场景编译为「还没有条目」空态，构造从内容浏览开始。
- **两个 Story 声明清单**：template（两背景 + 小梅 expression 字段）、
  cat-cafe（两背景 + 小雨 stage/expression 字段）；binding 只加数据行，无
  路径登记。
- 验收证据：端口聚焦单测 19（含 create 的 already_exists/id-stem/越界拒
  绝）、studio jsdom 22（新增 6 个 S4 用例：加入内容/geometry 警告/增删
  cue 与条目级联/结构化外观/新建场景全链/新建与克隆 motion）、closure 收集
  器 11；全量 `deno task check` 绿 + `vitest` 连续四轮 297 文件 / 4937 测试
  全绿；浏览器验收 template spec 5/5、cat-cafe studio 3/3（Chromium +
  WebKit 双引擎）——新增的 starter 构造链 e2e 从空白新建场景 → 内容浏览器加
  背景与人物 → 新增 cue → 新建 motion 并绑定 → 保存，全程零
  barrel/catalog/binding 列表/composition/config 编辑，落盘文件测试后清理
  （无模块 import，无 HMR 干扰）。
- 观察记录：全量套件早前两次出现 `check.test.ts` 的实时仓库闭包瞬时误报
  （`unknown workspace import`，隔离与后续连续四轮均绿）——解析器的两个
  静默 catch 现在把失败原因（errno/消息）附进 unknown 分类文案（最小诊断
  修正，不改判定语义），下次出现即可定位；另见一次 vitest/vite transform
  基建抖动，与产品代码无关。

### S5 — Flow workspace 只读投影

- 激活门：interaction-table kit 按提案判据升格进 template（第二真实消费者）后。
  **已满足（2026-08-15）**，升格记录：
  - 实验仓前置（外部台账）：`roll` 成块——注册 effect 抽签 + 持久化
    槽 + outcome 路由一体，编译成既有 effect+branch 节点对（`routeName` 覆盖位
    保迁移 id），两处真实内容迁移后运行时节点逐字节相同；
    branch/stage 早经十余刀新内容实证。
  - 提案四个 open questions 裁决冻结（跨文档标签=显式注册表且允许成环、gate 仅
    AND、注入句柄只读、UI 选中记忆不入档）；`NarrativeFlowGraphV1` 形状补入
    `barrier`（第九种节点），`roll` 投影为单节点（内部 route 是 kit 管道）。
  - template 升格：`narrative-kit.ts` 换成 interaction 文档 kit 的 template 版
    （纯数据 say/choice/stage/branch/end 块 + admission + `@label` 外部目标 +
    流程图投影；stage 块 = scene open/cue 短键或 `setAppearance` 封闭词汇，
    branch 块 = 声明式 flag 路由）。剧本改写为 `doc.template.opening` 纯数据文
    档；`story simulate --scenario opening` 完整 JSON 迁移前后逐字节相同，聚焦
    单测 13 例绿（admission 拒绝、id 派生、投影形状、金标 playthrough）。IR、
    runner、simulation 零改动；引擎包零改动。
- 范围：消费 `NarrativeFlowGraphV1` 只读投影 + 点击节点跳转源文档；不存布局、不
  可编辑、不成为第二作者权威。可编辑写回按设计 §6 的载体分级另行裁决。

交付记录（2026-08-15）：

- **合同落位**：`NarrativeFlowGraphV1`（+ node/edge/label 类型）进
  `StudioBindingV1` 可选 `flow`——提案冻结的形状原样落在 studio binding 合同
  （九种节点、docId/blockName 分组、summary、source 引用、带标签边）。投影是
  story 侧编译器吐出的**派生数据**：binding 只递交，引擎不解析源文档、不建第
  二权威；未声明 `flow` 的应用（如 cat-cafe）工作区整体隐藏。
- **Flow workspace**：按文档分块浏览（手写存量节点归入独立分组）；布局由查看
  器现算——从文档首节点 BFS 分层、文档序破平，投影按合同不带坐标；SVG 渲染
  带标签边（choice 尾名+gates、branch 条件、roll outcome、`@label` call）；
  跨文档目标渲染为虚线 stub。**"跳转源文档"的第一阶段语义（显式记录）**：点
  节点在详情栏亮出 `interaction-doc:<docId>#<block>` 源引用（TS 文档按设计
  §6 属"源码/Agent 编辑"，Studio 不打开它），点跨文档 stub 跳到目标文档并选中
  目标节点——文档间导航闭环在 Studio 内完成。
- **两个真实消费者**：template 的 kit 编译产物直接上 binding
  （`flow: templateFlowGraphV1`）；外部实验仓合并 25 份编译文档的投影上
  binding（多入口内部文档的投影导出，细节归实验仓台账）。
- 验收证据：studio 聚焦 jsdom 26 例（flow 模型分组/分层/stub、节点点选与跨文
  档跳转、binding 有无 `flow` 的显隐）；template 单测 13 例；浏览器 template
  spec 12/12（Chromium + WebKit，新增 S5 用例：Flow 区可见、点 greeting 节点
  亮源引用、branch 条件边标签可见）、cat-cafe studio 6/6（无 flow 声明的应用
  原样通过）；全量 `deno task check` 绿（298 文件 / 4942 测试）——其间
  `check.test.ts` 实时仓库闭包用例出现一次 S4 已记档的并载瞬时误报，隔离复跑
  11/11 与整管线复跑均绿。roadmap Track D 的 Narrative Flow workspace 移入
  Live。

### 证据循环（承接 A5）

- 外部实验仓（真实规模的本地内容项目；语料、素材与逐刀台账均不入本仓）按轮复测
  同一张度量表（文件触碰数、编辑点数、人类步骤、Agent 一次到绿率、从需求到可玩
  耗时、workaround 清单、候选能力、第二消费者状态）；设计 §5 的局部性硬指标是
  每轮的判据线。回流只保留匿名度量与工程结论，逐刀台账归实验仓所有。

2026-08-15 至 2026-08-17 回流摘要（三轮：S0–S5 交付后首轮、内容波收环、普查轮）：

- **局部性硬指标（设计 §5 表）三轮全部达标且无回退**：加一句台词 = 1 剧本文档
  编辑点；添加一个场景 = 1 scene package + kit 场景注册表 1 行（application
  composition 零改动）；新建一个 motion ≤2 编辑点（S2 验收挂账的「4 文件 →
  ≤2」达成）；素材背书的内容 = 4 编辑点（素材 digest 纪律的固有成本）；改一个
  cue 的表现（motion↔cut↔bare）= 1 个场景文档编辑点（第 3 轮新增词汇行）。cue
  identity 的 dispatch 链接线是每包一次的采纳成本（实验仓实测 8 文件），从
  template 起步的新 Story 包为零。
- **内容规模实证**：实验仓一波约 113 轮真实内容迭代全程引擎零改动——kit 块、
  状态 set-int、离散 effect、场景包、状态驱动外观（appearance 键控 content +
  渲染器内映射助手）、choice gate、例外路由覆盖全部需求；并行监视/帧计时类
  源形态按已记档纪律离散化到命令边界。choice 上限 16、故事侧批折叠上限等既有
  合同足够，整波未产生引擎缺口。
- **digest 语义教训（记档）**：`story simulate` digest 稳定只保证「命令轨迹不
  变」；新增持久快照字段是另一次合法快照身份，不要把「digest 未变」写成状态
  schema 冻结。
- **叙事内动态文本裁决（收环核实，不扩 runtime）**：narrative surface 的
  `resolveText` 是纯注入点（say 文本出现时解析、选项标签逐渲染解析、History
  打开时重解析），Story 侧 composition 让 resolver 读取同一份已发布投影即可
  完成占位符插值——无需任何 `@sillymaker/*` 改动，不构成引擎激活项。已在实验
  仓落地实证（库存数标签，digest 不变；History 重解析取当前值记档为已知表现
  语义），内容波功能缺口清零。
- **观察记录（不立案）**：appearance 交换循环（眨眼/表情漂移类）按提案边界暂
  归 renderer 自有表现；交互文档聚合税 ≈7 编辑点跨 6 文件，候选能力「文档聚合
  自动化」继续观察不先建 API；一次表现层组合竞态（快速连点）记档为引擎侧证
  据，已由 cue identity 线认领收口。
- **2026-08-17 证据环普查（locality 第 3 轮 + cue/dispatch 全内容普查）**：叙
  事图 3,905 节点、60 stage 节点、单 commit 最大 4 条 dispatch（上限 32 余量
  8 倍）；23 场景 26 cue（22 bare / 3 cut / 1 motion），共享边 3 条（1 分歧 =
  立项场景本身，2 一致），declared vs bare 碰撞零出现。数据喂给 cue-identity
  提案的裁决 #3/#4 评估，建议与细节归提案拥有。

### Cue identity（presentation-only）设计裁决

- 证据门已满足（A5 第 1 轮缺口 1、第 2 轮"裂 tag 合同代价"、真实内容迁移预检
  +1）。下一步是**独立设计文档**：一次表现 retarget 携带"来自哪个 cue"的
  ephemeral presentation edge context（scene cue dispatch → Stage retarget/
  reconciler → transition catalog），不进入 `SemanticStageState`、Save、digest、
  replay 或 simulation command identity，不用全局 current-cue 变量。实现只在该设
  计被接受后开始（它触碰 `StageTargetChangeV1`/reconciler 的受保护面，原计划
  stop condition 依然有效）；落地前 S0.1 的 lint + fail-closed 是止血。
- 案文已落 [cue-identity 提案](../proposals/cue-identity.md)（2026-08-17，
  docs-first 条目），**待所有者接受**。要点：dispatch 词汇
  `{sceneId, cueId}` 与场景 open、产生走 transient-effect 同族的 facts 投影
  （`projectStageCueDispatches`，commit-only、恰好配对一个语义 revision）、
  `StageRetargetInputV1`/`StageTargetChangeV1` 各加一个可选 `cues` 字段
  （reconciler 原样附带、不解释）、场景绑定 cue-first 解析且无上下文时回落
  行为逐字节等位、同边多 cue 从 admission 拒绝改为 per-cue 绑定。验收含
  双消费者（实验仓撤销裂 tag + 仓内 example 第二登场
  变体）与"关掉投影等价于今天"的退化等位。实现切片在接受后另行排期。
- 2026-08-17 所有者批复提案 open questions（裁决已并入案文）：显式 per-cue
  `cut` **采纳**（复杂度核实为低——`"cut"` 是既有过渡词汇、reconciler 已按
  瞬切处理，净增量 = 文档一个互斥字段 + bindings 合成一条定义）；
  `openMutations` 场景级上下文**采纳**（open dispatch 进 V1 词汇与管线，
  绑定解释 evidence-gated）；跨场景 collision lint 处置与 dispatch 上限数值
  **等实验内容迁移完毕后再评估**（实现先取保守起点/临时值）。
- 同日所有者**接受提案**，V1 实现切片**同日交付**：dispatch 词汇 + facts 投影
  seam + 实例批盖章/清零 + `SemanticStageV1` 配对转发 + reconciler 原样附带 +
  场景绑定 cue-first（含合成 cut、跨场景防偷取、open 按无上下文回落）+ 文档
  `cut` admission 与同边分歧合法化 + lint 保守起点 + template 取猫节拍首个消
  费者。交付记录、验证证据与第二消费者验收由
  [cue-identity 提案](../proposals/cue-identity.md)拥有；批列表字段定名
  `dispatches`。
- **第二消费者验收同日完成**（实验仓撤销其唯一裂 tag，digest 逐字节不变、
  e2e 断言第二登场立绘瞬现），并回灌两处引擎修正：外场景
  open 回落资格收紧（仅本场景自己的 open 保持无上下文回落语义）与批盖章前移
  到发布前（`onAttempt` 暂存 + 实例首个订阅者盖章，消除同步 flush React 宿主
  的首帧配对竞态）。细节见提案的第二消费者验收节。lint 处置与 dispatch 上限
  经证据环普查评估后由所有者同日批复采纳（上限 32 冻结、lint 保守起点转正），
  裁决记录归提案拥有。

### Ambient loop motion（存在期循环动效）设计裁决

- 证据门已满足（实验仓 P0-2：呼吸/眨眼/表情漂移类需要"存在期持续"
  的表现行为，是下一波内容的显式前置；用权威 tick 命令驱动会灌爆命令日志的反例
  已记档）。案文已落
  [ambient-loop-motion 提案](../proposals/ambient-loop-motion.md)（2026-08-15）：
  循环即普通 motion 文档、存在期绑定（scene entry `ambient` / 低层 catalog）、
  presentation clock 驱动、边沿期间挂起、冻结停驻相位连续、reduced-motion
  settle、权威零接触。2026-08-15 评审对泛化性的补充已入案文：往返与"锯齿 +
  平铺"两种显式循环形态（云漂移/窗外雨）、粒子与非周期随机表现划归 renderer
  边界、相位偏移反例进 open question、验收要求实验仓角色循环 + 仓内 example
  户外环境循环的双消费者。实现只在所有者接受该提案后开始并单独排期。

## 3. Defer

- Scene Timing Sheet、gameplay data grid、UI layout、Save/migration inspector、
  卡牌/SLG/战棋域工具：evidence-gated workspaces（roadmap Track D 拥有清单）；
- 可编辑图写回（阶段 2）与图成为作者源（阶段 3）：按设计 §6 分级另行裁决；
- rotation/任意 Motion 通道、通用 node graph、任意 DOM/UI 编辑器：非目标；
- interaction kit 进 `base`：升格判据由提案拥有，先冻结其四个 open questions；
- 落盘生成索引文件：需所有者显式修订 generated-exports 纪律后才可考虑。

## 4. Stop conditions

沿用 production-floor §9。本计划内特别注意：

- 索引成为第二配置权威，或改变权威闭包/build identity 语义 → 停；
- 文档会话需要绕过 CAS/原子写回，或持有跨实例权威 → 停；
- 布局/索引迁移改变任何 simulate digest、Save 或 replay 字节 → 停；
- cue identity 未经设计接受就触碰 `StageTargetChangeV1`/reconciler 公共合同 → 停；
- Scene Construction 需要修改 runtime 合同才能落地 → 停（回到设计裁决）。
