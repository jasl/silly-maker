# Adaptive Viewport & Layout Variants V1 实施计划

状态：**2026-08-25 经所有者以“开始第一个任务，改进引擎”接受；同日 M0–M2 交付并关闭。**

[Production-floor sequence](2026-07-30-production-floor-sequence.md) 是唯一跨计划排序入口。本计划把
刚关闭的 Reference Product 准备讨论收敛为一个跨应用、已有 accepted design 和 live-source 缺口共同
证明的窄车道；精确合同由
[Game viewport and UI shell design](../design/game-viewport-and-ui-shell.md) 拥有。

Deno Desktop adapter 继续 package-private、explicit、default-off；stable revalidation 与 production
promotion 是独立条件车道。本计划只改变 Browser/Deno common React GUI runtime，不等待也不启用
Desktop HMR。

## 1. 基线与边界

立项基线：`b04111859dd4fa49f776086272721be70194c503`；开始时 branch
`codex/promote-composition-state-runtime` 与 origin 对齐，工作树 clean。live `GameViewportV1` 只有
`fit | fluid`，而 accepted design 已保留 `expand-height`、`expand-width` 和显式 layout variant。
Reference Product 合同又要求同一完整产品面向 Browser 的手机、平板与电脑 target uplift，因此这是
无需预选某个 Pocket-like 产品也成立的跨应用缺口。

本轮遵守以下限制：

- Viewport 是 container CSS geometry 的唯一 owner；组件不得读取 `window` 建第二坐标权威；
- geometry、variant 与 resize 只是 presentation fact，不进入 State、Save、digest、replay、
  BuildIdentity 或 application generation；
- 声明是可信 application TypeScript。只检查实际计算所需的 canvas/scale 数值，不建立 schema、
  device-profile registry、UA/机器 attestation 或重复 admission；
- resize 只更新 React presentation geometry，不重建 Session、Stage state 或 application root；
- 使用浏览器现有 `ResizeObserver`、CSS pixels、DOM hit testing、focus 和 React cleanup，不创建 renderer、
  input、observer 或 event-loop framework；
- 每个变体都是有限的普通数据，按声明顺序选择首个匹配项。条件只允许 container CSS width 和
  aspect ratio 的 inclusive min/max；不读取 DPR、orientation API、设备型号、内存或 Host 名称；
- 实现与测试只保护可观察 geometry、Stage placement/hit/focus 和 Session continuity，不建立完整 DOM
  identity inventory、截图/pixel-diff 系统或设备矩阵 runner。

明确不在本计划内：continuous/gamepad axes、pointer lock/mouse delta、gesture DSL、Canvas/WebGL/3D
adapter、Asset LRU/prefetch/density manager、最终 editor/Blueprint、public Mod、RPC backend、safe-area
Host abstraction 与 Desktop activation。连续输入和自动资源调度继续等待首个真实 Reference Product 的
可复现证据；CSS `env(safe-area-inset-*)` 继续处理平台原生屏幕安全区。

## 2. M0–M2 顺序

### M0 — 冻结自适应几何合同

在既有 design 中明确：

- `fit`：完整 authored canvas 等比可见，剩余区域 letterbox；
- `fluid`：可用 container 以 1:1 CSS pixel 成为 live logical canvas；
- `expand-height`：先用完整可见的 fit scale，再保持 authored width、以同一 scale 向 block 轴对称扩展
  live canvas；
- `expand-width`：与上项正交，保持 authored height、向 inline 轴对称扩展；
- `authoredRect` 是 authored canvas 在 live logical canvas 中的矩形。Stage authored origin 位于该矩形左上；
  扩展区域允许负坐标或超过 authored width/height 的 Scene 内容可见；
- `layoutVariantId` 只表达当前 presentation choice。首个匹配变体可以替换 canvas 和 mode；无匹配时
  使用 application 顶层声明。

`maxScale` 仍只限制放大。它不裁切 authored canvas；达到上限后的剩余空间按 mode 成为 letterbox 或单轴
扩展区域。

### M1 — 单一 Viewport owner 实现

- 扩展 `GameViewportV1` 的 mode、只读 geometry 和 layout variant declaration；
- canvas box 继续是唯一 CSS sizing authority；`ResizeObserver` 只测量该 owner；
- `SemanticStageHostV1` 的 visible root 覆盖 live canvas，一个薄 coordinate-origin wrapper 把既有
  Stage/camera 坐标放到 `authoredRect`，从而保留 camera、layer、entry、hit-region 的 authored 坐标；
- `authoredRect` 只固定 Stage authored origin；shell text/chrome 不随 Stage scale 缩小，继续在整个 live
  canvas 上以 CSS pixel 布局，并从同一 geometry/variant 选择自己的区域；blocking/full-canvas surfaces
  仍可覆盖整个 live canvas；
- public package exports、GameShell/Web application declaration 自动携带新字段，不增加平行 API 或
  compatibility wrapper。

### M2 — 中立 Browser conformance 与收口

- focused UI tests 覆盖四种 mode、`maxScale`、变体选择/fallback、authored-origin offset 和 Stage origin；
- Engine Lab 声明一个同-canvas portrait `expand-height` 变体，Chromium/WebKit 验证 desktop fit、phone
  portrait expansion、运行中双向 resize、同一 application epoch、真实 Stage hit/focus 与既有
  touch/pointer semantic action；
- DPR 继续只改变 raster density，不改变 CSS/logical geometry；保留既有 DPR=2 evidence，不把它误称
  为 browser page zoom；
- 更新 architecture/features/story-authoring/website 的 live 能力描述，运行 focused tests、受影响
  Browser E2E、`deno task check` 和以本计划基线为 base 的 React Doctor advisory；
- 独立 review 确认没有第二坐标/Session authority、没有借机引入连续 Input 或设备 profile。

完成后把本计划和唯一排序入口标记关闭。后续只按 Reference Product loop 显式选择一个完整产品；本计划
不自动激活下一 engine lane。

## 3. Stop rules

- 需要读取 UA/设备型号或用 DPR 选择 gameplay/layout variant 时停止；
- 需要把 viewport geometry 写入 State/Save/BuildIdentity 或重建 Session 才能 resize 时停止；
- Stage、shell 或第三方 surface 必须再次测量 window 才能解释同一 authored coordinate 时停止；
- 变体条件开始演变为 CSS/Blueprint DSL、设备 catalog 或任意 callback framework 时停止并缩回；
- 真实产品要求连续输入、renderer readiness 或资源调度时另开有 consumer evidence 的 focused plan，
  不扩张本计划。

## 4. 交付记录（2026-08-25）

- **M0** 在既有 design 中冻结四种 mode、单轴扩展公式、`authoredRect`、有序首匹配 variant 和
  presentation-only 身份；没有引入设备 profile、第二坐标权威或新的 State/Save 身份。
- **M1** 扩展 `GameViewportV1` 的公开类型与只读 geometry；一个 Stage coordinate-origin wrapper 把
  camera/layer/entry/hit 坐标放到 authored rect，同时让 visible root 覆盖 live canvas。应用声明自动经
  既有 Web/GameShell 路径携带 variants，没有 compatibility wrapper 或平行 viewport API。
- **M2** 让 Engine Lab 的 phone portrait 选择 `expand-height`，验证 desktop fit、DPR=2、运行中双向
  resize、同一 presentation epoch、保留的样本状态以及真实 pointer/touch/focus Stage action。Browser
  验证还纠正了一处设计假设：把 HUD 随 authored rect 缩放会让 44 CSS px 控件遮挡竖屏 Stage 命中区，
  因此 `authoredRect` 只固定 Stage origin；shell 始终在完整 live canvas 中以 CSS pixel 自适应。

验证结果：

- focused UI：2 files / 15 tests；
- Viewport Browser matrix：Chromium、WebKit、Chromium Touch、tablet landscape 共 28/28；
- `deno task check`：377 test files / 5,377 tests，Story checks、benchmark 与 release build 全部通过；
- `deno task docs:build` 通过；
- `deno task audit:react --base b04111859dd4fa49f776086272721be70194c503` 扫描 9 个文件，0 findings；
- 额外完整 `deno task test:e2e:engine` 两次均为 146/147：唯一失败是 WebKit 的既有 shell 手动存档
  reload 路径报 `Importing a module script failed`；该 exact test 独立复跑 1/1，通过。本计划不把这个
  只在完整套件顺序下出现的模块加载竞态扩成 viewport 或测试框架工作，受影响的 Viewport matrix 已全绿。

本计划关闭。当前没有自动激活的下一 engine lane；后续按 Reference Product loop 显式选择一个完整
应用，再由其可复现证据领取有界引擎工作。
