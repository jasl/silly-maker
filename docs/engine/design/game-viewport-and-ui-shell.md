# Game viewport and UI shell design

状态：2026-07-20 接受；2026-08-25 由
[Adaptive Viewport & Layout Variants V1](../plans/2026-08-25-adaptive-viewport-layout-variants.md)
冻结并交付剩余几何合同。C3、D2、E2 与 F3 对应基线均已落地：`GameViewportV1` 提供逻辑画布、fit
letterbox、两空间查询与 maxScale 居中，Semantic Stage placement 按 authored 坐标渲染，VN/shell
surface 在 live canvas 内布局，首个 PoC 退役后 player/debug 边界由默认 GameRoot 与浏览器验收持续保护。
后来增加的 `fluid` mode 以及 2026-08-25 的 `expand-height` / `expand-width`、显式 layout variant 均已
交付。2026-08-29 又增加了显式 `landscape-only` 内容方向策略；它在物理竖屏容器内旋转同一个
managed canvas，在物理横屏后自动取消补偿，不引入 OS orientation 或第二套坐标权威。

## 1. Original problem statement

本文接受时，UI shell 只是一个响应式 DOM 布局：七个固定层直接随浏览器窗口伸缩，只有 `--silly-stage-max-width` 和 4:3 媒体查询两个约束。它没有逻辑坐标系，没有设计画布，没有 letterbox 语义；素材与布局之间没有可声明的空间合同。

当时的默认 surface 没有视觉基线。引擎组件只输出语义 DOM（例如 DiagnosticExportButton 的 review 面板是一个裸 `<section>`），叠层、对话框容器和排版全部缺席，行为测试全绿的同时画面是坏的。

Debug 与玩家界面的边界当时也被侵蚀。DevDock 按约定由 `debug_tools` capability 门控，但 diagnostic export 按钮与 semantic status 文本被无条件渲染进常驻玩家 UI——一个 task 验收静默覆盖了"debug 只是一个开关，开启后出现调试面板"的设计约定。

成熟游戏引擎（Ren'Py 的 virtual size、Godot 的 viewport stretch）都以"逻辑画布 + 缩放政策"为一等公民。SillyMaker 需要同等标准，但保留 DOM/React 在文本清晰度和可访问性上的优势。

## 2. Ownership and relationship to other designs

- 本文定义 **GameViewport**（逻辑画布与缩放）、**shell 层锚定**、**主题 token 与默认 surface 视觉基线**、**player/debug 边界** 四项标准；
- [VN presentation runtime](vn-presentation-runtime.md) 拥有 Stage 语义、Transition、PendingInteraction 与 Audio；本文只规定它们的绘制落点；
- [AI authoring](ai-authoring.md) 的 UI/Web Composer 是这些标准的实现载体：default GameRoot 必须满足本文基线；
- Story 拥有主题值、素材与具体画面设计（见 `docs/game/` 下对应产品文档）；引擎拥有坐标、缩放、锚定、token 合同和默认组件结构。focused default VN Player preset 是显式选择的 VN 组件结构，不是 generic GameRoot 的隐式 HUD。

## 3. GameViewport and coordinate spaces

### 3.1 Logical canvas

每个固定画布 application 声明一个逻辑画布（design resolution），例如 Engine Lab 的 `1600×1000`（16:10）。逻辑画布是素材构图、Stage placement、hit regions 和遮挡分区的唯一坐标系；美术、Story 和引擎讨论位置时只使用逻辑坐标。

### 3.2 Scaling policy

Viewport 把逻辑画布映射到实际窗口：

- **fit**（已交付、默认）：等比缩放至完全可见，两侧或上下留 letterbox/pillarbox；letterbox 区域属于 shell，不可交互、可由主题填充；
- **fluid**（已交付）：以 1:1 CSS pixel 填满可用区域，不产生 letterbox，适合文档式或桌面式 shell；
- **expand-height**：使用保证 authored canvas 完整可见的 fit scale，保持 authored width，并以同一
  scale 在 block 轴对称扩展 live logical canvas；
- **expand-width**：与上项正交，保持 authored height，并在 inline 轴对称扩展 live logical canvas；
- 未声明 `maxScale` 时按容器继续等比放大；只有应用显式声明上限时才在超过该 scale 后居中，
  `maxScale: 1` 因而是 pixel-art/1:1 ceiling，而不是普通大屏默认；
- 缩放因子连续，不要求整数倍；渲染按 `devicePixelRatio` 保持位图与文本清晰。

`authoredRect` 是 selected authored canvas 在 live logical canvas 内的矩形；该名刻意区别于平台 notch
所用的 CSS safe-area inset。`fit` 与 `fluid` 的 authored rect
等于 live canvas；扩展 mode 将 authored origin 对称偏移到 authored rect 左上。Scene 可以用负坐标或超过
authored width/height 的坐标在扩展区布置内容；既有 authored 区域不会被裁切或拉伸。达到 `maxScale`
后，剩余区域仍按当前 mode 成为 letterbox 或单轴扩展区。

Story/application 可以声明有限的 ordered layout variants。每项有 stable `id`，以 container 的 CSS
width 和 aspect ratio 的 inclusive min/max 匹配，首个匹配项可以替换 canvas 与 mode；无匹配项使用
顶层 fallback。选择不读取 UA、设备型号、DPR、内存或 Host 名称。`layoutVariantId`、live geometry 与
resize 是 presentation fact，不进入 State、Save、digest、replay、BuildIdentity 或 application
generation。

引擎负责换算、letterbox 与 resize/DPR 的一致行为。显式 variant 和扩展 mode 不应通过对
16:10 画布强行拉伸或组件私自测量窗口来模拟。DPR 只影响 raster density；逻辑几何继续使用 CSS
pixels。平台原生凹口/圆角由 foundation 读取一次四个 physical CSS safe-area inset，再映射为
Stage 使用的 logical block/inline token；应用和组件不得绕开 token 直接读取某一物理边。

没有 portrait 布局的 fixed-canvas 产品可以显式声明 `contentOrientation: "landscape-only"`。当 measured
container 高于宽时，GameViewport 先把 effective available 从 `W×H` 交换为 `H×W`，layout variant、
scale、live canvas 和 authored rect 继续只由这份 geometry 计算，再把同一个 canvas 顺时针旋转 90°。
当设备自动旋转或窗口调整为宽不小于高时，ResizeObserver 令补偿回到 0°；应用/Session 不重建，
State、Save、replay、BuildIdentity 与 presentation epoch 均不改变。DOM control 与 Stage hit region 仍由
浏览器在同一 transform 下命中，不增加 pointer 坐标转换层。旋转态 logical safe area 按
`block-start ← physical right`、`inline-end ← bottom`、`block-end ← left`、`inline-start ← top` 映射，
Stage 内响应式 UI 只查询 named GameStage size container，不能读取未旋转的 viewport width/height。

该策略旋转产品内容，不旋转浏览器地址栏、IME、原生 picker 等平台 chrome，也不承诺真正的设备方向锁。
Web 的 `ScreenOrientation.lock()` 仍存在 fullscreen/实现支持限制，因此不参与默认路径、readiness 或几何
权威；以后若有真实消费者，只能作为用户手势后的 Host best-effort enhancement，失败后继续使用上述
CSS presentation fallback。Deno Desktop 仅按可调整窗口处理，不需要该平台 API。

### 3.3 Two spaces: stage space and shell space

- **Stage space**：background、character、prop、scene interaction 等 playfield 内容位于逻辑画布坐标中，随缩放因子整体缩放；placement 使用逻辑坐标/锚点，禁止直接依赖 CSS 视口单位；
- **Shell space**：HUD、对话框、Overlay 面板、系统菜单等文本性 UI 在 live logical canvas 上选择分区，
  但内部排版以 CSS pixel 渲染（DOM/矢量），保证任意 Stage scale 下文本清晰、focus ring 完整；直接游戏
  触控和 coarse-pointer 操作保留 ≥ 44×44 CSS px，fine-pointer 常驻 chrome 可以采用正常的 32px 控件，
  不以无条件 touch floor 挤占舞台。扩展 mode 不把 shell 强制压回缩小后的 `authoredRect`；应用使用同一个
  `layoutVariantId` / geometry 把额外区域用于 responsive chrome。

这样素材构图获得 Ren'Py 式的确定性，文本 UI 保留 Web 的清晰度与可访问性。两个 space 的换算由 viewport 提供只读查询；renderer 不得自行探测窗口尺寸建立第二套换算。

本文所称的“统一 UI 缩放”是所有引擎维护的 DOM UI 共享同一套 document typography、`rem`
基线与主题/尺寸 token，而不是让 Shell space 跟随 Stage transform。Stage 的逻辑坐标映射只作用于
Stage space；HUD、Narrative、System、DevDock、Inspector 与 Embedded Authoring 不得再乘该 scale，
也不得用 `transform`、`zoom` 或第二套 JavaScript viewport 测量模拟统一缩放。共享的是 token 权威、
基础 recipe 与 override 机制，并不要求不同任务 surface 得到相同的 computed font/control size：编辑器是
紧凑工作区，常驻 HUD 必须为舞台让路，标题和暂停菜单则可以建立更强的局部层级。每个 surface 仍通过自身
容器的 CSS reflow 保持文字清晰、focus 完整和适合输入方式的命中区下限。

### 3.4 Layer anchoring

现有层保留 DOM 顺序与输入语义，并按 space 归类：background/character/sceneInteraction 属于 stage
space；hud/narrative/workspaceOverlay/system 属于 shell space。显式选择的 default VN Player preset
使用 CSS grid 对齐，WholeCanvas 与 blocking surfaces 覆盖 live canvas；产品可用同一
`layoutVariantId` / geometry 声明顶部 HUD 带、底部 VN 带或其他 responsive 分区。当前没有通用
partition schema 或冲突诊断器，不应把
应用 CSS/React 布局描述成已交付的 engine DSL。

### 3.5 响应式轴、内容变体与默认体验

响应式决策分成两个正交轴，不使用“手机/平板/桌面”设备注册表：

- **几何与布局拓扑**只读取当前 Host/container 的 CSS width 与 aspect ratio。应用用有限、稳定的
  `layoutVariants` 选择 `portrait`、`compact`、`wide`、`ultrawide` 等自己的呈现名称；组件通过
  `useGameViewportV1().layoutVariantId` 或 canvas 上同源的 `data-viewport-layout-variant` 重排；
- **操作密度**只读取 primary pointer capability。fine pointer 默认使用 32px 控件，Inspector/开发工具可用
  28px compact 控件；`pointer: coarse` 时 gameplay 与表单操作提升到 44px touch floor，文本输入至少 16px。
  字号不会因为物理 4K/5K 或 DPR 增长；浏览器缩放仍按 Web accessibility 语义工作。

“不同布局可以显示不同内容”只适用于 application-owned、可选的 presentation chrome，例如宽屏状态栏、
辅助信息栏、Inspector properties 或编辑器工具面板。它们可以按同一个 `layoutVariantId` 条件渲染，而不要求
把所有 DOM 先渲染再隐藏。Gameplay/GUI 的权威内容、命令合法性和 Save 不得因 viewport 选择而改变；若同一
任务在窄屏被折叠为 drawer/tab，它仍是同一个功能和 authority。应用不得在每个组件重新读取 `window` 或维护
第二个 responsive store。

默认策略按 surface 任务区分：

- fixed-canvas game 默认 `fit`、不拉伸 authored art，且未声明 `maxScale` 时可以填满 4K/5K 的同宽高比容器；
  portrait 可用 `expand-height`，只有产品拥有可延展背景/侧翼构图时才选择 `expand-width`。超宽 live canvas
  可把新增空间交给 HUD/辅助栏，但不能用拉伸 16:9 素材伪装“支持带鱼屏”。产品若没有 portrait
  topology，可以显式使用 `landscape-only` 内容策略；已提供 portrait variant 的产品保持 `responsive`；
- document/desktop/GUI shell 默认选 `fluid`，工作区占满 Host；文字正文可以限制 readable measure，工作区本身
  不设置 page-level max-width；
- Inspector/作者工具默认使用 container-driven 三栏/两栏/Stage-first 单栏，侧栏有合理上限，新增宽度优先给
  Stage/工作区；Scene preview 默认适应当前工作区，显式百分比 zoom 是用户 override。手机/平板以正常游戏
  体验为主，Inspector 尽量保持可调试，完整编辑器可以明确声明窄屏 tradeoff。

这些是引擎维护的基线和 recipe，不是不可覆盖的产品主题。Application 可以覆盖公开 token、声明自己的有限
variants，或在局部组件 eject renderer；它不需要 fork viewport、Inspector 或默认 VN Player。

## 4. Theme tokens and default surface baseline

### 4.1 单一全局基线与 token 合同

Browser 与 Deno Desktop 的 Game/GUI 文档，以及独立 Inspector 文档，都必须在 bootstrap 时加载一次
`@sillymaker/ui/styles.css`。Embedded Authoring 继承所在应用文档的同一基线，不加载或维护第二套
全局样式。该 stylesheet 统一拥有 box sizing、document 字体与行高、CJK-friendly font stack、
canvas/body 默认颜色、原生表单与基础按钮样式、focus ring 和 reduced-motion。package 或组件样式
不得另建平行 reset、root font scale、默认 palette 或表单 recipe。

低层 `mountGameApplicationV1` 保持同步且只附带 Host document geometry；它不暗中维护精简版主题。
直接使用该入口并选择引擎默认视觉的应用显式加载同一个 `@sillymaker/ui/styles.css`。标准 Game/GUI
入口仍在 startup admission 后、React mount 前加载该 stylesheet，因此没有第二个字体、palette、control
或 focus authority，也不为样式去重改变启动时序。

`--silly-text-size-base` 是 15–16px 的正常 document `rem` 基线，不因大显示器继续增长；
`--silly-text-size-compact` 与 `--silly-control-min-size-compact` 是 Inspector、DevDock 等高信息密度工具的
共享派生档，而不是第二套 viewport scale。全局 UI 使用紧凑行高；正文、对白和说明在自身作用域显式使用
readable line height。常驻 HUD 使用正常基线但约束自身占比，Title/暂停菜单通过局部 heading/menu 样式建立
层级。引擎维护的 DOM UI 使用 `rem` 和已有的 `--silly-space-*`、控制尺寸、颜色、圆角与 focus token 表达
排版节奏；容器相对布局仍可使用 `%`、`cqi`、`minmax()` 与 container query。分辨率、窗口变化与浏览器缩放
只在共享 token 和各组件的响应式重排中体现。`px` 继续允许用于 1px 边线、明确的 accessibility minimum、
图标/raster 尺寸及 authored Stage 几何。

引擎附一套中性可用的默认主题。Application 可以在自己的根作用域覆盖公开的 `--silly-*` token；
某个 surface 或组件也可以在更窄作用域覆盖相同 token，或使用其已有的 component-specific token。
普通主题化与局部定制都通过 CSS cascade 完成，不要求 Theme Provider、JavaScript scale service、
组件 fork 或新的 UI runtime。

`[data-application-id]` 是产品主题边界。游戏或 GUI 应用的字体、palette、表单 recipe 与第三方 CSS 只能
在该根或更窄的产品根下激活；不得用 `:root`、`html`、`body`、裸元素或无作用域的 universal selector
把产品视觉主题变成整个 Host 文档的默认值。Application-owned Host 仍可在 `html` / `body` / `#root`
声明尺寸、margin、overflow 等文档几何，并在应用独占文档时选择 `color-scheme`；这些规则不得携带产品
字体、palette 或组件样式进入 sibling engine tools。`@font-face` 可以注册产品字体，但 family 名必须产品
命名空间化，并且只在产品根应用。Tailwind 等产品自选构建工具不得把 Preflight 或组件 reset 泄漏到文档根。

Inspector、DevDock、Embedded Authoring 与相关 portal 标记为 Tool Theme surface。它们在同一全局基线内
把普通 token 重绑定到 `--silly-tool-*` 的紧凑、中性工具规格，因此不会继承所在游戏的字体、palette、
spacing、radius、control density 或 focus 颜色。游戏专属 Inspector/编辑器扩展在该 Tool Theme 根内渲染，
可以使用语义组件和局部样式，但不建立第二套 document reset。这里不使用 Shadow DOM、iframe、
`!important` 字体墙或 hostile-CSS 防御；可信产品代码遵守上述作用域合同。

### 4.2 UI chrome assets

面板边框、卡片框、按钮底、9-slice 框体等 UI chrome 是普通类型化素材（与 image/audio 同级的 `ui` kind），走既有 manifest/digest/加载诊断/fallback 通道。缺失 chrome 素材时默认主题的 code-native 面板仍必须完整可用——fallback 是"朴素但成立的界面"，不是裸文档流。

### 4.3 Default surfaces must have a designed baseline

Composer 提供的每个默认 surface——Save、Settings、系统对话框、诊断导出、错误恢复、加载指示——必须满足：正确的容器语义（modal 对话框有遮罩、焦点陷阱、关闭途径）、消费主题 token、在默认主题下有可交付的视觉呈现。"语义正确但视觉裸奔"的组件不再算完成；对应 C3 任务的验收随本文收紧。

focused default VN Player preset 同样必须提供可直接使用的 Ren'Py-aligned baseline：贴底对话/选项、
History/playback chrome、say-only 全画布推进、键盘政策、窄屏/缩放/reflow 与可访问 focus。它由 VN
application 显式选择并保持在 focused entry；未选择它的 GUI/game final graph 不应包含其实现。产品可用
token/CSS/媒体建立自己的主题，也可 eject/替换 renderer；Story、Stage/media 与特殊 surface 从不成为
preset 的所有权。

### 4.4 Symbols and text

语义图标继续走 `GameSymbol`；系统图标继续用现有图标库；HUD 数字、表格、进度条继续由代码渲染。整屏概念稿只作构图参考，不切图为控件——沿用既有素材政策。

## 5. Player/debug boundary

恢复并硬化原始约定：

- 玩家常驻 UI（七层中除 system 外的一切，以及 system 层的常驻部分）**零 debug 词汇**：不出现 semantic revision/status 文本、diagnostic export、replay、fixture 或任何工程术语；
- 测试探针只允许 `data-*` 属性，不允许可见文本；现有"语义状态 ready，修订 N"输出移除可见部分；
- DevDock 仍是第一方参考 debug UI 的唯一宿主，但不再由核心 GameRoot 隐式挂载：产品显式选择 reference outer composition 后，`debug_tools` capability 才使它出现；自定义产品可以复制/替换该外圈实现而不改变核心 System/State authority；
- 玩家侧的"导出诊断信息"作为支持功能保留时，只能放在 Settings/系统菜单内，用玩家语言表述，不占常驻 HUD；
- 本边界属于引擎验收：minimal 产品图与普通模式 DOM 无 debug 实现/标识；显式选择 reference outer UI 后，`debug_tools` 模式 DevDock 完整出现。

## 6. Acceptance

本文已随以下既有任务完成基线验收，不追加新阶段：

- **C3（UI/Web Composer，已交付）**：default GameRoot 建立 GameViewport（声明画布、fit letterbox、两 space 换算、DPR/resize 行为一致）；默认 surface 满足 §4.3 基线；player/debug 边界按 §5 断言；
- **D2（Stage projection，已交付）**：StageRenderTarget 的 placement 以逻辑坐标表达并经 viewport 换算渲染；
- **E2（VN player systems，已交付）**：对话框、history、choice 界面按 shell space 锚定并消费 token；
- **F1（vertical slice，已交付）**：验收路线在 1600×1000、1024×768、平板横屏，以及
  1920×1080/DPR 2、2560×1440/DPR 1.5 两种物理 4K 映射下核心画面可用、letterbox
  正确、文本清晰，缩放后的真实 polygon 指针/触摸命中仍准确；
- **F3（PoC migration，已关闭）**：首个 PoC 与其 V1 scene glue 已退役，不再保留待迁移的玩家 UI；当前应用持续遵守 §5。
- **统一 UI authority**：Game/GUI、独立 Inspector 与 Embedded Authoring 使用同一 stylesheet、token 与
  override 机制；Inspector/Embedded Authoring 使用共享 compact 档，Player 常驻 HUD 使用受约束的正常档，
  Title/暂停菜单保留语义层级，不以相同 computed size 冒充一致性；
  默认 Player、System、开发工具和创作 surface 在代表性的普通桌面、大桌面、缩放/reflow 与窄屏容器中
  无 document 级溢出，且 application-root 与 component-scope token override 均能生效。组件内部的
  合法滚动区（例如 Inspector Stage preview）不计为 document 溢出。
- **大屏、触控与拓扑**：未声明 scale cap 的 1600×900 canvas 在 3840×2160 等比填满；显式 cap 仍生效；
  `expand-width` 在 5120×2160 保持 authored rect 居中并把 extra inline space 暴露给 shell。代表性
  fine-pointer desktop、coarse-pointer phone/tablet 与 2560px CSS-width ultrawide 下，默认控件密度、
  Inspector 工作区占用和 layout variant 切换符合 §3.5；不以物理屏幕型号、DPR 或完整 DOM inventory
  作为证据。

## 7. Stop rules

- Viewport 换算出现第二套权威（组件私自读窗口尺寸推位置）时停止并修正；
- 任何默认 surface 以"后续再美化"为由跳过 §4.3 基线时，该任务不得标记完成；
- 需要把 renderer 对象、缩放因子或 DOM 尺寸写入 gameplay State/Save 时停止——viewport 是纯 presentation 事实；
- 普通主题化要求 Story fork 引擎组件源码时停止并修正 token/CSS 合同；产品明确 eject/替换 focused
  preset 时，由产品接管该 renderer，不保留并行兼容层。
