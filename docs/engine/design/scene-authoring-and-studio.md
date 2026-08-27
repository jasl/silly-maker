# 场景创作模型与 SillyMaker Studio

状态：2026-08-14 接受并已交付的 V1 设计；其 Scene 文档/runtime 编译合同仍描述 live 能力，
但五 workspace Studio 产品外形已于 2026-08-24 被
[Scale, Scene Object, and Modular GUI](../proposals/scale-scene-object-and-modular-gui.md)
取代为当前目标。新 Inspector 达到 M5 accepted replacement surface 前，本文继续如实描述现有实现；
之后旧 shell、
旧导出、专属测试与过时产品表述同轮删除，不建立兼容双轨。

产品证据：所有者本人无法用当前工具完成"把小雨向左拖一点、入场再快一点"级别的基本场景修改；
外部实验仓（真实规模内容项目，外部台账）持续复现同类作者痛点。本文记录 V1 Human Authoring Model
（Scene 文档、authoring geometry、cue→motion 绑定）与 SillyMaker Studio 合同；2026-08-14 已交付
V1 的实施顺序与验收记录由
[VN Scene Workspace 计划](../plans/2026-08-14-vn-scene-workspace.md) 保留，live 实况由
`features.md` 记录。设计存在不等于 live capability。

2026-08-18 接受的
[Application Runtime and Embedded Authoring](application-runtime-and-embedded-authoring.md)
把本文的独立 dev Studio 页面重新定位为已交付的 V1 shell，而非永久放置限制。Scene 文档、
authoring geometry、cue→motion、dev-only CAS 与普通 Player 排除 source-write 的合同仍由本文
拥有；standalone/embedded shell 共享同一 Authoring Host 的目标由新设计拥有。AR0–AR6 不增加
dev-server 之外的写回；未来 Desktop/remote author Host 必须经过独立 promotion 才能复用该
CAS contract。

## 1. 问题：有 Runtime，没有 Authoring Model

引擎的 runtime 侧（确定性内核、Save/replay/migration、Managed Surface、Semantic
Stage、Motion 资产）已经很强，但源代码按 runtime 责任组织，人类按创作对象思考
（"序章"、"小雨"、"小雨第一次登场"）。两者之间缺一层作者模型。现状证据
（2026-08-14 立项时的 live 代码事实；本设计与 VN Scene Workspace / Authoring
Architecture 计划已交付，cue 身份于 2026-08-17 交付——transition 解析现可携带
dispatching cue 的 presentation edge context。以下清单保留为立项证据，不再是现
状，实况以 [features](../features.md) 为准）：

- **人物最终位置埋在剧情代码里**：template 的 Mei 写在 `template/src/narrative.ts`
  （`placement: { x: 1180, y: 880, … }`），cat-cafe 的小雨写在
  当时的 `examples/cat-cafe/src/features/dialogue/script.ts`（`x: 920, y: 600`；
  产品已退役）。改一个
  站位要求人类在 TypeScript 剧情节点里手填逻辑坐标。
- **锚点约定藏在 Story CSS 里**：engine wrapper 只做
  `translate3d(x,y) scale(s)`（origin 0 0），"placement 是底部中心"的约定由每个
  Story renderer 自己写 `transform: translate(-50%, -100%)`（template、cat-cafe、
  Engine Lab、bookshop 四处重复）。`StageContentResolutionV1` 没有 width/height/
  anchor，编辑器无从画出选择框、pivot 或 ground line。
- **cue 与 motion 的绑定靠全局推断**：transition resolver 只接收
  `StageTargetChangeV1 { kind, layerId, entryKey, previous, next }`，没有 cue 身份。
  cat-cafe 的绑定注释自己承认假设："Runs on every stage enter edge (the cat is the
  only entry that enters mid-scene)"。同一人物在不同场景用不同入场动画时，只能把
  程序化判断越写越复杂。
- **一个"场景"散落十余处**：编辑 cat-cafe 开场（站位、入场动画、背景、表情）至少
  涉及 script.ts、presentation.ts（文案 + content catalog + transition catalog）、
  motion JSON、stage renderers、assets 六处必改文件，外加 composition、stage-view、
  preview、simulation-target、graph/tests 六处必须知道的消费者。
- **新舞台内容要在三个文件接线**（narrative contentId + presentation catalog +
  composition renderer，template/examples/e2e AGENTS 明文规定）；
  `WebGameApplicationV1` 有 15 个泛型参数，quickstart 直接告诉 agent"抄现有声明，
  别自己写"。
- **Motion Workbench 是数字编辑器**：duration/delay/at‰/value 都是 number input，
  轨道圆点只能 seek，画布没有任何指针拖拽。它解决了"不用手改 JSON"，没有解决
  "我怎么知道该填多少"。

结论：不是再给 Workbench 加通道，而是补上缺失的一层——

```text
人类可理解的 Scene / Entry / Cue / Motion 文档
  ↓ 编译（admission + typed accessors）
现有 SillyMaker Runtime contracts（StageMutation / transition / preview）
```

## 2. 产品定位：Runtime 是编译目标，Studio 是创作产品

- **SillyMaker Runtime**（现有 `base`/`ui`/`web`）继续拥有 State、command、确定性
  模拟、Save/replay/migration、Stage reconciliation、Surface lifecycle、input/focus、
  assets 与交付。普通作者不直接编辑这里的大部分构造；它成为 Scene 文档的编译目标。
- **SillyMaker Studio** 是项目级作者工具：scene navigator、真实 renderer 的场景画布、
  placement inspector、cue 列表与嵌入的 Motion Workbench、dev-only CAS 写回、HMR。
  现有 Motion Workbench 收编为 Studio 的一个 panel，不再是孤立的最终产品。
- 与 North star 一致：这**不是** Unity/Godot 通用编辑器或 scene tree。V1 是一条窄而
  完整的 VN 场景制作纵切（打开场景 → 拖人物 → 选表情 → 绑入场 motion → 拖起点 →
  预览 → 保存 → 游戏 HMR 生效）。Editor 写普通 JSON/TS 稳定数据，不形成第二种运行
  时语言（roadmap Track D 既有原则）。

## 3. Human Authoring Model：Scene 文档

### 3.1 SceneDocumentV1

一等的场景作者文档，与 `MotionDocumentV1` 同族：`format: "sillymaker.scene"`、
`version: 1`、严格 exact-record admission、整数界复用 `parseStagePlacementV1` 的
现有边界、结构化诊断 path。概念形状（字段名以 A0 admission 为准）：

```jsonc
{
  "format": "sillymaker.scene",
  "version": 1,
  "sceneId": "scene.catcafe.opening",
  "label": "雨后的咖啡店门口",
  "canvas": { "width": 1280, "height": 720 },
  "entries": [
    {
      "layerId": "layer.catcafe.background",
      "tag": "tag.catcafe.backdrop",
      "contentId": "content.catcafe.background.shopfront",
      "zOrder": 0,
    },
    {
      "layerId": "layer.catcafe.characters",
      "tag": "tag.catcafe.xiaoyu",
      "contentId": "content.catcafe.character.xiaoyu",
      "zOrder": 10,
      "placement": {
        "x": 920,
        "y": 600,
        "scalePermille": 1000,
        "opacityPermille": 1000,
        "mirrored": false,
      },
      "appearance": { "stage": "kitten", "expression": "calm" },
    },
  ],
  "cues": [
    { "cueId": "cue.catcafe.opening.shopfront", "kind": "show", "tag": "tag.catcafe.backdrop" },
    {
      "cueId": "cue.catcafe.opening.kitten-enters",
      "kind": "show",
      "tag": "tag.catcafe.xiaoyu",
      "motionId": "motion.catcafe.cat-entrance",
    },
  ],
}
```

要点：

- entry 身份沿用现有稳定实体身份 `<layerId, tag>`，不发明新的 entryId 概念；
  placement/appearance/zOrder 是现有 `StageMutationV1` 的同一批字段与同一批整数。
- cue 是"这一步视觉发生什么"的命名步骤：V1 支持 `show`/`hide`，目标
  placement/appearance 来自 entry 声明。`show` 是 ensure 语义（不在场→show；同内
  容在场→跳过；异内容在场→只替换 content、保持 placement/appearance 连续性），
  `hide` 只移除在场条目——两者幂等，叙事重入不会重复改台。独立的 `replace` cue
  kind 被 ensure 语义覆盖（A0 收窄）；`setPlacement`/`setAppearance` 等真实需求出
  现再加。`motionId` 把入场/离场动画**精确绑定在 cue 上**，替代全局 resolver 推断。
- `canvas` 记录 placements 假设的设计空间；与应用 viewport 声明不一致时给结构化
  诊断（Studio 用它画画布，运行时不消费）。

### 3.2 编译产物与消费方式

Scene 文档像 motion 一样以 ESM JSON import 进入 Story，模块级一次 admission：

```ts
import openingSceneDocument from "./scenes/opening/opening.scene.json" with { type: "json" };
const openingScene = sceneFromDocumentV1(openingSceneDocument);
```

typed accessors（形状由 A0 拥有）至少提供：

- `cueMutations("cue.…")` → 该 cue 的 `StageMutation[]`，内置幂等保护（现状
  cat-cafe 手写的 `hasTagV1(...) ? [] : batch(...)` 模式由编译层接管）；剧情
  `stage` 节点从内联字面量改为引用 cue；
- `mayShow` → 供 stage 节点静态注解的 contentId 列表（从 cue/entry 派生）；
- transition-catalog fragment → 由 cue 的表现声明（`motionId` 或显式
  `cut: true`，互斥）派生的 **per-cue** 绑定。解析 cue-first（2026-08-17 接受
  并交付的 [cue-identity 提案](../proposals/cue-identity.md)）：提交边携带的
  presentation edge context（`{sceneId, cueId}` / `{sceneId, open}` dispatch
  列表，从已提交 domain events 投影、与语义 revision 精确配对）指名哪个 cue 引发这条
  边，各 cue 解析各自的声明——motion、压制外层的合成 cut、或裸 cue 的 null
  落回；同边分歧声明因此合法。无上下文的边走 edge-tuple 回落（仅"全部绑定
  一致"的边保留条目，与前上下文行为逐字节等位）；上下文存在时"本场景无
  dispatch 解释的 change 不得由回落认领"对 cue 与外场景 open 一律适用，
  **本场景自己的 open** 保持无上下文回落语义（所有者裁决 #2）。`app check` 仍诊断"声明对裸 cue"的同边组合
  （`scene.cue_binding_scope_collision`，修法是显式声明而非裂 tag）；lint 保守
  起点经真实内容普查后由所有者批复转正（2026-08-17，记录归 cue-identity 提案）；
- preview case → 每个 cue 可派生 detached settled target + 绑定，直接喂
  `MotionWorkbenchLauncherV1` 与 Studio 画布；场景文档**取代**手写
  `MotionPreviewCaseV1` 声明（Engine Lab 现状）与 `preview.json` 之类的平行文件；
- provenance → sceneId/cueId 进入现有 dev-only 溯源链（点击画面 → cue → 文档）。

### 3.3 单一作者权威

对一个由 Studio 管理的场景，`*.scene.json` 是视觉构图、placement 与 cue→motion
绑定的**唯一作者权威**；剧情脚本只引用 cueId，不再复写 placement 字面量或全局
enter 推断。低层 Runtime API 完整保留（SillyOS、Engine Lab 与任何不用 Studio 的
Story 不受影响），但同一个场景不得同时被两套输入写入。该规则按 M5 先例以协作合同
交付（AGENTS + quickstart），不做启发式源码扫描执法；出现真实双写事故再以事故为
证据考虑机械检查。

Scene 文档**不拥有**：叙事流程（say/choice/branch 的文本与顺序仍在 narrative）、
gameplay State/规则、renderer 实现。它编译进现有合同，不新建第二 gameplay runtime
或第二 Stage authority；placements 是与今天相同的整数，进入 Snapshot/Save 的字节
不因来源改变（同值同 digest）。

## 4. Authoring geometry：人类不算坐标

### 4.1 显式内容几何

`StageContentResolutionV1` 增加可选 authoring geometry：

```ts
interface StageContentGeometryV1 {
  readonly width: number; // 逻辑画布像素
  readonly height: number;
  /** 0..1000；500/1000 = 底部中心。 */
  readonly anchorXPermille: number;
  readonly anchorYPermille: number;
}
```

声明了 geometry 的内容，由 engine stage wrapper 拥有锚点变换（锚偏移在 scale 之
内合成），Story renderer 删除私藏的 `translate(-50%, -100%)`；未声明 geometry 的
内容保持现状 CSS 约定不破坏。hit region 本就以"entry 锚点空间"为坐标系
（`StageHitRegionV1` 注释明文），与 geometry 一致，不需迁移。

### 4.2 直接操纵取代手填数字

- 逻辑画布（fit 缩放、整数坐标）保留；Studio 负责
  `screen pointer ÷ viewport scale = logical coordinate` 的换算与钳制
  （`useGameViewportV1()` 已暴露 scale/toCssPx）。
- **Placement 模式**：拖人物改 `x/y`；缩放手柄改 `scalePermille`；镜像/层级按钮改
  `mirrored`/`zOrder`；提供画布边界、地平线与左/中/右吸附。数字输入保留为
  Inspector 的精细调整入口，不是主工作流。
- **Motion 模式**：选中 keyframe 时画布显示 settled actor 与该 keyframe 的 ghost；
  拖 ghost 自动写 `offsetX`/`offsetY`（`motion offset = ghost 锚点位置 − settled
  placement 锚点位置`）；时间轴拖 keyframe 改 `atPermille`。Workbench 已有逻辑
  canvas、preview scale、selected entry、settled target 与纯采样，这是给现有画布加
  交互层，不是第二套 runtime。

## 5. SillyMaker Studio V1 standalone 外形

- 入口：在应用目录运行 `deno run dev`，或从仓库根显式运行
  `deno task app dev <application-id>`，启动该应用的 Vite dev server 并挂 Studio 页。人类从游戏调试坞
  「场景 → Studio」打开（同源新标签，不替换进行中的会话）。这一 standalone shell
  只存在于 dev（同 `sillymaker:dev-sources` 的 `apply: "serve"` 纪律）；普通构建/预览/
  Player 不包含 source-write 能力，未声明 `studio` 绑定的应用不显示该入口。未来可信
  embedded author surface 复用同一 Host，不改变这一 release 边界。
- 左侧 navigator：scene scanner 列出项目内全部 `*.scene.json`（点击即开，无需把游
  戏玩到该场景）+ content/asset 浏览。
- 中央画布：真实 Story renderer（`SemanticStageHostV1` detached target，同 CR4/
  Workbench 模式，无 Session、无第二 reconciler）+ selection outline、anchor、
  guides、transform handles、motion ghost。
- 右侧 Inspector：选场景（sceneId/canvas/背景）、选 entry（content/appearance/
  x/y/scale/mirror/zOrder/入场 motion）、选 motion（duration/delay/keyframes/
  easing）。
- 下方 cue 列表：V1 不做通用电影 timeline；选中带 motion 的 cue 显示该单 motion
  的时间轴（现有 Workbench）。等真实场景需要同时编排人物/相机/BGM/SFX/对白，再
  评估 Scene Timing Sheet（Motion Workbench 计划的既有 defer 钩子）。
- 写回：tooling 增加 scene 端口，完整复用 motion 端口纪律——路径限定
  `*.scene.json`、schema admission、sha256 CAS（409 conflict）、临时文件 + 原子
  rename、确定性格式化、body 上限、拒 symlink/穿越/node_modules、仅 dev。draft 只
  存在于 Studio 内存；live game 只消费已保存文档；保存 → Vite HMR → 游戏立即生效。

## 6. 工程结构：runtime 与 authoring 的常规引擎分层

包布局向"runtime / editor"惯例收敛，现有四包角色不变，新增一个：

```text
engine/packages/
  base      # runtime 内核 + 文档合同（scene/motion 的 schema 与 admission）
  ui        # runtime React 表现（stage host、Workbench 组件）
  web       # browser host
  tooling   # 构建与 dev 端口（scene/motion lint、CAS 写回端口、vite、application CLI）
  studio    # 新增：项目级创作 UI（navigator/画布/Inspector/cue 列表）
```

先例对齐：motion 已经是"schema 在 base、lint 与端口在 tooling、编辑 UI 在 ui"，
scene 照搬同一分层；`studio` 包拥有 Authoring Host、workspace UI 与当前 standalone
wrapper，依赖 base/ui/tooling，任何 runtime 包不得反向依赖它。V1 的 DevDock 只提供
同源入口链接；未来 dev-only embedded shell 按新设计从产品 author entry 消费 Host，普通
Player 依赖图仍完全排除它。

Story 侧目录约定（scene-managed Story）：

```text
<app>/src/
  scenes/<scene>/
    <scene>.scene.json      # 视觉作者权威
    motions/*.motion.json   # 该场景的入场/演出资产（现有 lint 规则原样适用）
  content/…                 # content catalog + geometry（人物/背景声明）
  application/…             # 高级层：普通场景制作不修改
```

Starter 重定位（A4 已定名，2026-08-14）：`template/` 原地重建为 scene-first 起点
（主入口是在应用目录运行 `deno run dev`，或从仓库根运行
`deno task app dev <application-id>`——用户先看到示例场景，再从调试坞
进 Studio，而不是 TypeScript 工程树），不新建第二个 starter 目录；低层 authoring
API 以同包 Advanced 层保留（`application/**` 标注 "Advanced — ordinary scene
authoring does not edit these files."，quickstart 低层 Tier 降为高级路径）。
cat-cafe opening 是第一条完整 dogfood 纵切，template opening 是第二个
scene-managed 消费者。

## 7. 非目标

- 通用 Unity/Godot 替代、通用 scene tree、任意 DOM/CSS/React UI 编辑器；
- 卡牌/SLG/战棋编辑器、通用 node graph；
- 新的 Save/digest/replay 语义（scene 编译产物与手写等值）；
- rotation/任意 CSS 通道等 Workbench 数字能力扩张（维持既有 defer）；
- gameplay 数据表编辑器（roadmap Track D 第 4 项，另行激活）；
- dev 之外的写回端口、不可信内容分发（Mod incubation 边界不变）。

## 8. 产品级验收基线

以 cat-cafe opening 为准的十步闭环（由所有者本人实测）：

1. 在应用目录运行 `deno run dev`（或从仓库根运行 `deno task app dev <application-id>`）启动游戏后，调试坞 → 工具 → Studio；
2. navigator 选"雨后的咖啡店门口"；
3. 画布点击小雨；
4. 拖动小雨向左；
5. 入场时长调到 470ms；
6. 拖动起点 ghost；
7. 播放预览；
8. 保存；
9. 正式游戏 HMR 生效；
10. `git diff` 只变化 `opening.scene.json` 与 `cat-entrance.motion.json`。

全程不得要求打开 `features/dialogue/script.ts`、`presentation.ts`、
`application/composition.tsx`、transition catalog 或 renderer CSS。

## 9. 与既有文档的关系

- [vn-presentation-runtime](vn-presentation-runtime.md) §10 editor path 第 5 项
  （"依据实际创作成本决定可视化 editor"）由本设计激活；Semantic Stage/Motion 合同
  本体不变。
- [Authorable Motion Workbench 计划](../plans/2026-08-13-authorable-motion-workbench.md)
  的交付全部保留并被复用（资产、溯源、CAS、seek、preview case、协作护栏）；其
  Defer 节的"Scene Timing Sheet / cue 文档化"两个钩子由本设计接管演进。
- [window-model](window-model.md) 与 Managed Surface 合同不受影响：当前 standalone
  Studio wrapper 不进入游戏窗体体系；未来 embedded author surface 仍须服从既有
  Host/Surface authority，不自建第二窗口或输入权威。
- [Application Runtime and Embedded Authoring](application-runtime-and-embedded-authoring.md)
  接管 Authoring Host 的 shell placement、progressive activation 与普通 release 排除；本文
  继续拥有 Scene 领域合同与 V1 authoring workflow。
- 2026-08-14 V1 的执行记录由
  [VN Scene Workspace 计划](../plans/2026-08-14-vn-scene-workspace.md) 保留；
  2026-08-18 的后续切片由
  [Application Runtime plan](../plans/2026-08-18-application-runtime-embedded-authoring.md)
  拥有；
  [production-floor sequence](../plans/2026-07-30-production-floor-sequence.md)
  仍是唯一跨计划排序入口。
