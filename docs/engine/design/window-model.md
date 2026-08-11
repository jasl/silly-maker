# 窗体与 UI 组件体系：引擎契约、分层与上提清单

状态：2026-07-28 接受；S4.3.1b 已让 Workspace Overlay、System 与
Narrative/History 共用一个 composition-owned Managed Surface authority。
S4b whole-canvas primary/detail 是当前迁移 lane。本文回答引擎 UI 的分层结构与上提规则、
窗体产品模型和通用 WindowManager 的取舍。

## 调研摘要：各引擎怎么处理窗体

| 需求        | Ren'Py                                         | RPG Maker        | 管理/模拟游戏（Paradox、RimWorld） | 全 MDI（EVE Online）   |
| ----------- | ---------------------------------------------- | ---------------- | ---------------------------------- | ---------------------- |
| 互斥窗口    | screen **tag**：同 tag 的 screen `show` 即替换 | 场景切换整组换窗 | 槽位制（左栏一个、右栏一个）       | 无互斥，自由叠放       |
| 移动窗口    | 少用（`drag` displayable，卡牌类才用）         | 不支持           | 常见（可拖面板 + 位置记忆）        | 核心特性（吸附、组合） |
| 最大/最小化 | 无                                             | 无               | 少量（钉住/折叠）                  | 完整任务栏隐喻         |
| 模态与关闭  | `modal` 属性；右键关                           | 取消键逐层退     | Esc 逐层退                         | 每窗独立               |

规律：**剧情向游戏（VN/RPG/养成）用"固定位置 +
槽位互斥"的窗体模型**；自由移动/最小化属于管理与模拟品类，那是一个真正的窗口管理器子系统（拖拽、边界钳制、位置持久化、焦点置前、任务栏）。

## SillyMaker 的窗体产品契约（槽位已提供）

三层槽位的产品语义已经交付，互斥不是由各个 Story 随意解释：

1. **系统对话框槽**（system
   层）：同时只有一个（设置/存档互相替换），Esc/右键/背景点击关闭。
2. **工作区窗体**（workspace overlay 层）：**一个主窗槽 +
   详情栈**。`openPrimary(id)`
   打开新主窗会**替换**当前主窗并清空详情栈——"点击状态页关掉商店页"就是这个语义，游戏无须自己协调互斥。`pushDetail(id)`
   在主窗上叠详情（背包 → 物品详情 → 供应商），逐层关闭。
3. **嵌套确认层**：在对话框之上的独立层级刻度。

`PanelV1` 提供窗体外壳（钉顶标题栏/关闭/可聚焦滚动区），引擎提供层叠令牌、关闭惯例、
下层 inert、焦点圈与恢复，表单控件由主题统一样式。Workspace Overlay、System 与
Narrative/History 现在通过同一个 Coordinator publication 原子绑定 modality、focus、
input、dismiss、readiness 与 pointer gesture；各 Story 不再镜像另一份 writable
lifecycle。system 单槽、workspace primary + detail stack 与确认层仍是产品 topology
recipe，而不是自由桌面 WindowManager。whole-canvas primary/detail 的同权威迁移由
S4b 继续完成。

## 立场：拖拽/最大最小化暂不进引擎

按路线图证据规则（能力需要真实 Story
需求证明），自由窗口管理**不预先实现**：已交付的品类（VN/养成/SLG）在业界惯例里就是固定窗体；而可拖拽窗口牵出一整串子系统（舞台缩放坐标换算、边界钳制、位置持久化、点击置前、触屏拖拽与滚动冲突、键盘可移动性）。等真实游戏需要时按下面配方在游戏侧先做，反复出现再上提。

## 游戏侧配方（需要时照此实现）

- **可拖拽窗口**：把拖把手放在 `PanelV1` 的 `actions` 槽（或包一层自制
  header）。用 pointer events（`setPointerCapture`）实现拖动；**坐标必须经
  `useGameViewportV1()` 的换算**（舞台是等比缩放的，屏幕像素 ≠
  逻辑像素）；位置存 **Story UI state**，或由非游戏产品自己的 workspace
  repository 持久化，绝不混入 gameplay State/Game
  Save；窗口位置随窗体尺寸变化要钳制在舞台内。
- **最小化/折叠**：一个 Story UI state
  布尔切换内容区显隐即可（标题栏保留）；"最小化到任务栏"先别做——那是 MDI
  品类的隐喻。
- **多窗并存（非互斥）**：详情栈支持有限叠放；真需要两个平级常驻面板（如左角色右库存），把它们做成
  **HUD 布局的一部分**（grid 区域）而不是窗体——参考管理游戏的"槽位制"。
- **点击置前**：栈顶永远最前是引擎不变量；若做自由多窗，置前=把该窗 id
  移到自管数组尾部重渲染，不要试图改引擎层叠令牌。
- **窗口尺寸档位（"最大化"）**：给 Panel 外层容器切换两档 CSS
  尺寸（常规/占满舞台），一个 Story UI state 枚举即可，不需要窗口管理器。
- **表单**：直接写原生
  `<input>/<select>/<textarea>`，引擎主题自动生效；不要为样式引第三方表单库。

## SillyOS 实证（2026-07-28）

`examples/silly-os`（复古桌面 shell：重叠窗口/焦点 z
序/最小化/最大化/标题栏拖拽/任务栏/开始菜单 + 确定性扫雷 + 存档持久的记事本 +
iframe 浏览器）把上面的"游戏侧配方"推到了极限。结论与产出：

**游戏侧配方成立**：完整窗口管理器是一个约 180 行的 Story 侧
store（open/close/focus/minimize/toggleMaximize/taskbarActivate/move，不可变快照 +
subscribe），外加一个 WindowFrame 组件。不需要引擎 WindowManager
原语——单消费者，继续观察。该 store 拥有 MDI
几何、最小化和任务栏等产品状态；其中会改变全局 input/focus/modality 的边界在
Surface track 登记为 managed contribution，而不是另建一套全局输入权威。

SillyOS 也验证了 Narrative 的显式省略路径：它不声明
`NarrativeSurfaceDefinitionV1`，root slots 中也没有 narrative writer，因此自定义桌面
shell 不会意外分配 Narrative Host、player 或 Stage claimant。

实证出的关键配方（新增到手册）：

- **逻辑坐标层**：hud/system 槽是 CSS 尺寸层（不随舞台逻辑坐标缩放）。固定画布
  shell 可给根容器定尺寸为逻辑画布并
  `transform: scale(viewport.scale)`；而桌面/文档式 shell 应直接用
  `viewport: { mode: "fluid" }`（引擎侧增强）——舞台平铺浏览器区域、scale=1、无黑边，窗口矩形即
  CSS px，手机竖屏自然可用（视口变化时用 store 的 clampToBounds
  把窗口拉回桌面）。
- **拖拽**：标题栏 `setPointerCapture` 后事件全归捕获元素——掠过 iframe
  也不丢（老 mousemove 方案的经典坑在 Pointer Capture 下不存在，无需透明护罩）。
- **iframe 内嵌**：多数站点以 `X-Frame-Options`/CSP `frame-ancestors`
  拒绝内嵌且跨源阻断**没有可靠错误事件**——内置页兜底 + 如实提示，不做超时探测。

顺带修正/增强的引擎面（各自独立成立）：

- `hideSystemMenu`（DefaultGameRoot/web 透传）：全定制 shell 收编系统入口。
- `slotContext.systemDialogs`（openSettings/openSaves）：Story
  槽位程序化打开系统对话框（开始菜单、暂停菜单）。对话框 DOM 走
  Portal，与调用方树位置无关。
- 修死锁：saves 未配置时 `open("saves")`
  曾开启输入隔离却不渲染对话框（隔离判据改跟实际渲染的 surface）。
- `resolvePreferredLocaleV1` 落在 `@sillymaker/base`（纯数据，headless 闭包禁碰
  `@sillymaker/ui`——ui barrel 会拉进 CSS module，Deno 原生加载 Story 时失败）。

## 何时上提引擎

同一配方在两个以上真实 Story
里重复出现、且形状稳定时（例如"可拖拽调参浮窗"成为通用工具需求），把它提炼为引擎组件并带契约测试——流程与
`PanelV1`（图鉴/历史两处消费后上提）相同。

## 组件体系分层（自下而上）

| 层            | 内容                                                                                               | 状态                                     |
| ------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| L0 令牌       | 主题（色/距/圆角/触控尺寸）、层叠双刻度（stage-z / surface-z，测试盯守）、表单元素主题化           | ✅ 已交付                                |
| L1 原语       | `Button` / `IconButton` / `ProgressMeter` / `PanelV1`（窗体外壳）/ `BootSplashV1` / `MuteToggleV1` | ✅ 已交付                                |
| L2 窗体与槽位 | 系统对话框单槽、工作区主窗+详情栈、嵌套确认层、标题屏前门、关闭惯例与锁定（`dismissible`）         | ✅ 共享 lifecycle；whole-canvas 进入 S4b |
| L3 组装件     | `NarrativeSurfaceDefinitionV1` Story renderer + composition-owned player/Host/Stage authority      | ✅ 已交付                                |
| 横切 hooks    | `useAssetUrlV1` / `resolveAssetUrlV1` / `useReducedMotionV1` / `useLocaleTextV1`                   | ✅ 已交付                                |

上提规则不变：**两个以上真实 Story 重复且形状稳定**才进引擎，带契约测试。

## L3 上提清单

### Production Narrative surface（✅ 已交付）

三个 Story 的对话面板曾是同一台机器的多份手抄，随后短暂上提为
`DialoguePanelV1`。S4.3.1b 已用更窄的生产合同替换并删除该组件：Story 通过
`defineNarrativeSurfaceV1` 提供一个 `NarrativeSurfaceDefinitionV1`，其 renderer 只接收
immutable pending/history/choice availability、player profile/view、文本解析与 bounded
actions。打字机、normal/auto/skip、History、voice、物理输入、focus/inert、Stage
barrier 与 stale fencing 都由 composition-owned player/Host/Stage authority 持有。

Engine Lab、template、Bookshop 与 Cat Cafe 已迁移到这一公开 seam；SillyOS 显式省略。
旧 `DialoguePanelV1`、`VnLayerV1`、advance surface、raw text-reveal/playback 与
conformance-only exports 已删除，不保留平行播放器或任意 `slots.narrative` writer。
production browser promotion 已通过。

### 已评估项记录

- `useLocaleTextV1`：✅ 已上提，cat-cafe 消费。
- Narrative renderer seam：✅ 已上提，四个 Story 消费，SillyOS 验证省略路径（见上）。
- 数值条：❌ 评估后保留 Story 侧——原生 `<progress>`
  的轨道颜色跨浏览器不可控，6px 细条下视觉严重退化；Story
  需要自定轨道+填充配色。手搓版补了 `role=progressbar` 语义。`ProgressMeter`
  继续服务默认表面（如设置）。
- HUD 布局脚手架：❌ 不上提——HUD 是每个游戏的美术主张，共性只有令牌与原语。
