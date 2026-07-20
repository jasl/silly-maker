# Game viewport and UI shell design

状态：2026-07-20 接受的目标设计。C3 已落地 `GameViewportV1`（逻辑画布/fit letterbox/两空间查询/maxScale 居中）、默认 GameRoot 的 surface 基线与 player/debug 边界（DevDock 仅在 `debug_tools` 下出现，玩家 DOM 零 debug 词汇、探针仅 `data-*`）；Stage placement 换算（D2）、VN 界面锚定（E2）、PoC 玩家 UI 的边界修复（F3）仍待各自任务。本文约束这些任务的实现，不新增独立里程碑。

## 1. Problem statement

当前 UI shell 是一个响应式 DOM 布局：七个固定层直接随浏览器窗口伸缩，只有 `--silly-stage-max-width` 和 4:3 媒体查询两个约束。它没有逻辑坐标系，没有设计画布，没有 letterbox 语义；素材与布局之间没有可声明的空间合同。

默认 surface 没有视觉基线。引擎组件只输出语义 DOM（例如 DiagnosticExportButton 的 review 面板是一个裸 `<section>`），叠层、对话框容器和排版全部缺席，行为测试全绿的同时画面是坏的。

Debug 与玩家界面的边界被侵蚀。DevDock 按约定由 `debug_tools` capability 门控，但 diagnostic export 按钮与 semantic status 文本被无条件渲染进常驻玩家 UI——一个 task 验收静默覆盖了"debug 只是一个开关，开启后出现调试面板"的设计约定。

成熟游戏引擎（Ren'Py 的 virtual size、Godot 的 viewport stretch）都以"逻辑画布 + 缩放政策"为一等公民。SillyMaker 需要同等标准，但保留 DOM/React 在文本清晰度和可访问性上的优势。

## 2. Ownership and relationship to other designs

- 本文定义 **GameViewport**（逻辑画布与缩放）、**shell 层锚定**、**主题 token 与默认 surface 视觉基线**、**player/debug 边界** 四项标准；
- [VN presentation runtime](vn-presentation-runtime.md) 拥有 Stage 语义、Transition、PendingInteraction 与 Audio；本文只规定它们的绘制落点；
- [AI authoring](ai-authoring.md) 的 UI/Web Composer 是这些标准的实现载体：default GameRoot 必须满足本文基线；
- Story 拥有主题值、素材与具体画面设计（见 `docs/game/` 下对应产品文档）；引擎拥有坐标、缩放、锚定、token 合同和默认组件结构。

## 3. GameViewport and coordinate spaces

### 3.1 Logical canvas

每个 application 声明一个逻辑画布（design resolution），例如 Project Tavern 的 `1600×1000`（16:10）。逻辑画布是素材构图、Stage placement、HitMap 和遮挡分区的唯一坐标系；美术、Story 和引擎讨论位置时只使用逻辑坐标。

### 3.2 Scaling policy

Viewport 把逻辑画布映射到实际窗口：

- **fit**（默认）：等比缩放至完全可见，两侧或上下留 letterbox/pillarbox；letterbox 区域属于 shell，不可交互、可由主题填充；
- **expand-height / expand-width**：允许在声明的安全区外露出更多画布（用于为竖屏/极端比例声明扩展构图的 Story）；
- 超过声明的最大逻辑尺寸时居中，不再放大；
- 缩放因子连续，不要求整数倍；渲染按 `devicePixelRatio` 保持位图与文本清晰。

Story 声明画布、允许的伸缩模式和安全区（例如 4:3 核心安全区）；引擎负责换算、letterbox 与 resize/DPR/page-zoom 的一致行为。竖屏等重排布局是 Story 显式声明的另一套 layout variant，不是对 16:10 画布的强行拉伸。

### 3.3 Two spaces: stage space and shell space

- **Stage space**：background、character、prop、scene interaction 等 playfield 内容位于逻辑画布坐标中，随缩放因子整体缩放；placement 使用逻辑坐标/锚点，禁止直接依赖 CSS 视口单位；
- **Shell space**：HUD、对话框、Overlay 面板、系统菜单等文本性 UI **锚定**在逻辑画布的分区上（位置、尺寸预算来自逻辑坐标），但内部排版以设备像素渲染（DOM/矢量），保证任意缩放下文本清晰、focus ring 完整、命中区 ≥ 44×44 CSS px。

这样素材构图获得 Ren'Py 式的确定性，文本 UI 保留 Web 的清晰度与可访问性。两个 space 的换算由 viewport 提供只读查询；renderer 不得自行探测窗口尺寸建立第二套换算。

### 3.4 Layer anchoring

现有七层（background、character、sceneInteraction、hud、workspaceOverlay、narrative、system）保留 DOM 顺序与输入语义，并按 space 归类：background/character/sceneInteraction 属于 stage space；hud/workspaceOverlay/narrative/system 属于 shell space，各自声明锚定分区（例如顶部 HUD 带、底部 VN 带、中央 Overlay 区）。分区值由 Story/application 主题声明，引擎提供锚定机制与冲突诊断。

## 4. Theme tokens and default surface baseline

### 4.1 Token contract

引擎定义主题 token 的名称合同（surface、text、accent、positive、warning、danger、border、focus、遮罩、圆角、间距、字号阶），并附一套中性可用的默认主题。Story 通过普通 TS/CSS 变量提供自己的主题值；替换主题不 fork 组件。

### 4.2 UI chrome assets

面板边框、卡片框、按钮底、9-slice 框体等 UI chrome 是普通类型化素材（与 image/audio 同级的 `ui` kind），走既有 manifest/digest/加载诊断/fallback 通道。缺失 chrome 素材时默认主题的 code-native 面板仍必须完整可用——fallback 是"朴素但成立的界面"，不是裸文档流。

### 4.3 Default surfaces must have a designed baseline

Composer 提供的每个默认 surface——Save、Settings、系统对话框、诊断导出、错误恢复、加载指示——必须满足：正确的容器语义（modal 对话框有遮罩、焦点陷阱、关闭途径）、消费主题 token、在默认主题下有可交付的视觉呈现。"语义正确但视觉裸奔"的组件不再算完成；对应 C3 任务的验收随本文收紧。

### 4.4 Symbols and text

语义图标继续走 `GameSymbol`；系统图标继续用现有图标库；HUD 数字、表格、进度条继续由代码渲染。整屏概念稿只作构图参考，不切图为控件——沿用既有素材政策。

## 5. Player/debug boundary

恢复并硬化原始约定：

- 玩家常驻 UI（七层中除 system 外的一切，以及 system 层的常驻部分）**零 debug 词汇**：不出现 semantic revision/status 文本、diagnostic export、replay、fixture 或任何工程术语；
- 测试探针只允许 `data-*` 属性，不允许可见文本；现有"语义状态 ready，修订 N"输出移除可见部分；
- DevDock 仍是 debug 能力的唯一 UI 宿主：`debug_tools` capability 开启后出现，包含 diagnostic export、状态检查与 Story tooling 面板；
- 玩家侧的"导出诊断信息"作为支持功能保留时，只能放在 Settings/系统菜单内，用玩家语言表述，不占常驻 HUD；
- 本边界属于引擎验收：E2E conformance 断言普通模式 DOM 无 debug 标识，`debug_tools` 模式 DevDock 完整出现。

## 6. Acceptance

本文并入以下既有任务的验收，不追加新阶段：

- **C3（UI/Web Composer）**：default GameRoot 建立 GameViewport（声明画布、fit letterbox、两 space 换算、DPR/resize/page-zoom 行为一致）；默认 surface 全部满足 §4.3 基线；player/debug 边界按 §5 断言；
- **D2（Stage projection）**：StageRenderTarget 的 placement 以逻辑坐标表达并经 viewport 换算渲染；
- **E2（VN player systems）**：对话框、history、choice 界面按 shell space 锚定并消费 token；
- **F1（vertical slice）**：验收路线在 1600×1000、1024×768、平板横屏与 200% zoom 下核心画面可用、letterbox 正确、文本清晰；
- **F3（PoC migration）**：PoC 玩家 UI 移除违反 §5 的常驻 debug 元素。

## 7. Stop rules

- Viewport 换算出现第二套权威（组件私自读窗口尺寸推位置）时停止并修正；
- 任何默认 surface 以"后续再美化"为由跳过 §4.3 基线时，该任务不得标记完成；
- 需要把 renderer 对象、缩放因子或 DOM 尺寸写入 gameplay State/Save 时停止——viewport 是纯 presentation 事实；
- 主题化要求 Story fork 引擎组件源码时停止并修正 token/contribution 合同。
