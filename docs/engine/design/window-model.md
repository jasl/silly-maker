# 窗体与 UI 组件体系：引擎契约、分层与上提清单

状态：2026-07-28 接受。一份文档回答三件事：引擎 UI 的分层结构与上提规则、窗体管理的契约与立场（调研支撑）、以及下一批组装件的规格。背景调研基于 Ren'Py、RPG Maker、Paradox/RimWorld 一类管理游戏与 EVE Online 式全 MDI 的公开行为。

## 调研摘要：各引擎怎么处理窗体

| 需求        | Ren'Py                                         | RPG Maker        | 管理/模拟游戏（Paradox、RimWorld） | 全 MDI（EVE Online）   |
| ----------- | ---------------------------------------------- | ---------------- | ---------------------------------- | ---------------------- |
| 互斥窗口    | screen **tag**：同 tag 的 screen `show` 即替换 | 场景切换整组换窗 | 槽位制（左栏一个、右栏一个）       | 无互斥，自由叠放       |
| 移动窗口    | 少用（`drag` displayable，卡牌类才用）         | 不支持           | 常见（可拖面板 + 位置记忆）        | 核心特性（吸附、组合） |
| 最大/最小化 | 无                                             | 无               | 少量（钉住/折叠）                  | 完整任务栏隐喻         |
| 模态与关闭  | `modal` 属性；右键关                           | 取消键逐层退     | Esc 逐层退                         | 每窗独立               |

规律：**剧情向游戏（VN/RPG/养成）用"固定位置 + 槽位互斥"的窗体模型**；自由移动/最小化属于管理与模拟品类，那是一个真正的窗口管理器子系统（拖拽、边界钳制、位置持久化、焦点置前、任务栏）。

## SillyMaker 的窗体契约（引擎已提供）

三层槽位结构，互斥是**结构性**的，不靠约定：

1. **系统对话框槽**（system 层）：同时只有一个（设置/存档互相替换），Esc/右键/背景点击关闭。
2. **工作区窗体**（workspace overlay 层）：**一个主窗槽 + 详情栈**。`openPrimary(id)` 打开新主窗会**替换**当前主窗并清空详情栈——"点击状态页关掉商店页"就是这个语义，游戏无须自己协调互斥。`pushDetail(id)` 在主窗上叠详情（背包 → 物品详情 → 供应商），逐层关闭。
3. **嵌套确认层**：在对话框之上的独立层级刻度。

每层都自带：`PanelV1` 窗体外壳（钉顶标题栏/关闭/可聚焦滚动区）、层叠令牌、关闭惯例（背景点击与 cancel 关最顶层；`dismissible: false` 锁定）、下层 inert、焦点圈与恢复。表单控件（输入框/下拉/滑杆/勾选）由引擎主题统一样式。

## 立场：拖拽/最大最小化暂不进引擎

按路线图证据规则（能力需要真实 Story 需求证明），自由窗口管理**不预先实现**：已交付的品类（VN/养成/SLG）在业界惯例里就是固定窗体；而可拖拽窗口牵出一整串子系统（舞台缩放坐标换算、边界钳制、位置持久化、点击置前、触屏拖拽与滚动冲突、键盘可移动性）。等真实游戏需要时按下面配方在游戏侧先做，反复出现再上提。

## 游戏侧配方（需要时照此实现）

- **可拖拽窗口**：把拖把手放在 `PanelV1` 的 `actions` 槽（或包一层自制 header）。用 pointer events（`setPointerCapture`）实现拖动；**坐标必须经 `useGameViewportV1()` 的换算**（舞台是等比缩放的，屏幕像素 ≠ 逻辑像素）；位置存 **Story UI state**（`updateStoryUiState`，绝不进玩法状态与存档）；窗口位置随窗体尺寸变化要钳制在舞台内。
- **最小化/折叠**：一个 Story UI state 布尔切换内容区显隐即可（标题栏保留）；"最小化到任务栏"先别做——那是 MDI 品类的隐喻。
- **多窗并存（非互斥）**：详情栈支持有限叠放；真需要两个平级常驻面板（如左角色右库存），把它们做成 **HUD 布局的一部分**（grid 区域）而不是窗体——参考管理游戏的"槽位制"。
- **点击置前**：栈顶永远最前是引擎不变量；若做自由多窗，置前=把该窗 id 移到自管数组尾部重渲染，不要试图改引擎层叠令牌。
- **窗口尺寸档位（"最大化"）**：给 Panel 外层容器切换两档 CSS 尺寸（常规/占满舞台），一个 Story UI state 枚举即可，不需要窗口管理器。
- **表单**：直接写原生 `<input>/<select>/<textarea>`，引擎主题自动生效；不要为样式引第三方表单库。

## SillyOS 实证（2026-07-28）

`examples/silly-os`（复古桌面 shell：重叠窗口/焦点 z 序/最小化/最大化/标题栏拖拽/任务栏/开始菜单 + 确定性扫雷 + 存档持久的记事本 + iframe 浏览器）把上面的"游戏侧配方"推到了极限。结论与产出：

**游戏侧配方成立**：完整窗口管理器是一个约 180 行的 Story 侧 store（open/close/focus/minimize/toggleMaximize/taskbarActivate/move，不可变快照 + subscribe），外加一个 WindowFrame 组件。不需要引擎 WindowManager 原语——单消费者，继续观察。

实证出的关键配方（新增到手册）：

- **逻辑坐标层**：hud/system 槽是 CSS 尺寸层（不随舞台逻辑坐标缩放）。需要逻辑像素布局的全屏 shell 给根容器定尺寸为逻辑画布并 `transform: scale(viewport.scale)`（origin 0 0）——窗口矩形、拖拽换算（client 位移 ÷ scale）、任务栏一次对齐。
- **拖拽**：标题栏 `setPointerCapture` 后事件全归捕获元素——掠过 iframe 也不丢（老 mousemove 方案的经典坑在 Pointer Capture 下不存在，无需透明护罩）。
- **iframe 内嵌**：多数站点以 `X-Frame-Options`/CSP `frame-ancestors` 拒绝内嵌且跨源阻断**没有可靠错误事件**——内置页兜底 + 如实提示，不做超时探测。

顺带修正/增强的引擎面（各自独立成立）：

- `hideSystemMenu`（DefaultGameRoot/web 透传）：全定制 shell 收编系统入口。
- `slotContext.systemDialogs`（openSettings/openSaves）：Story 槽位程序化打开系统对话框（开始菜单、暂停菜单）。对话框 DOM 走 Portal，与调用方树位置无关。
- 修死锁：saves 未配置时 `open("saves")` 曾开启输入隔离却不渲染对话框（隔离判据改跟实际渲染的 surface）。
- `resolvePreferredLocaleV1` 落在 `@sillymaker/base`（纯数据，headless 闭包禁碰 `@sillymaker/ui`——ui barrel 会拉进 CSS module，Deno 原生加载 Story 时失败）。

## 何时上提引擎

同一配方在两个以上真实 Story 里重复出现、且形状稳定时（例如"可拖拽调参浮窗"成为通用工具需求），把它提炼为引擎组件并带契约测试——流程与 `PanelV1`（图鉴/历史两处消费后上提）相同。

## 组件体系分层（自下而上）

| 层            | 内容                                                                                                                    | 状态                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------- |
| L0 令牌       | 主题（色/距/圆角/触控尺寸）、层叠双刻度（stage-z / surface-z，测试盯守）、表单元素主题化                                | ✅ 已交付             |
| L1 原语       | `Button` / `IconButton` / `ProgressMeter` / `PanelV1`（窗体外壳）/ `AdvanceSurfaceV1` / `BootSplashV1` / `MuteToggleV1` | ✅ 已交付             |
| L2 窗体与槽位 | 系统对话框单槽、工作区主窗+详情栈、嵌套确认层、标题屏前门、关闭惯例与锁定（`dismissible`）                              | ✅ 已交付（本文上半） |
| L3 组装件     | `DialoguePanelV1`（打字机/自动/快进/已读/历史/点击面/快捷条一体的对话播放器）                                           | ✅ 已交付（本轮）     |
| 横切 hooks    | `useAssetUrlV1` / `resolveAssetUrlV1` / `useReducedMotionV1` / `useLocaleTextV1`                                        | ✅ 已交付             |

上提规则不变：**两个以上真实 Story 重复且形状稳定**才进引擎，带契约测试。

## L3 上提清单

### DialoguePanelV1（✅ 已交付）

三个 Story 的对话面板曾是同一台机器的三份手抄（cat-cafe 约 270 行胶水；template/bookshop 是它的简化版）。现已提炼为引擎组件 `@sillymaker/ui` 的 `DialoguePanelV1`：打字机（profile 文字速度、reduced-motion 立即显示）+ 播放策略机（自动/快进，经共享决议契约派发）+ 已读标记（权威 history → `markSeen`）+ 历史面板（`PanelV1`）+ 点击面（`AdvanceSurfaceV1`）+ 快捷条。测试选择器统一为 `data-dialogue-*`。最终形状：

```ts
DialoguePanelV1(props: {
  pending: PendingInteractionV1 | null;      // 引擎标准投影（say/choice；其余 kind 不渲染）
  history: NarrativeHistoryV1;               // 权威 backlog（choice 选项就在 pending.options 上）
  playerProfile: PlayerProfileStoreV1;       // 文字速度/自动停留/已读
  uiText(textId: string): string;            // Story 文本目录（useLocaleTextV1 产物）
  onResolve(occurrenceId, resolution): void; // 共享交互决议契约
  labels: DialoguePanelLabelsV1;             // 快捷条与历史文案
  quickMenuExtras?: ReactNode;               // Story 追加按钮（回退等）
  panelStyle?: CSSProperties;                // 面板皮肤归 Story
  clock?: PresentationClockV1;               // 测试注入
})
```

验收（已完成）：cat-cafe 迁移删除全部本地播放机（薄适配 ~40 行）；template/bookshop 作为第二、三消费者，简版面板换成完整播放器（打字机/自动/快进/历史随迁移免费获得，各补 6 条文案）；E2E 116 全绿。代码组织维度的配套执行见 [特性切片提案](../proposals/feature-slices.md)。

### 已评估项记录

- `useLocaleTextV1`：✅ 已上提，cat-cafe 消费。
- `DialoguePanelV1`：✅ 已上提，三个 Story 消费（见上）。
- 数值条：❌ 评估后保留 Story 侧——原生 `<progress>` 的轨道颜色跨浏览器不可控，6px 细条下视觉严重退化；Story 需要自定轨道+填充配色。手搓版补了 `role=progressbar` 语义。`ProgressMeter` 继续服务默认表面（如设置）。
- HUD 布局脚手架：❌ 不上提——HUD 是每个游戏的美术主张，共性只有令牌与原语。
