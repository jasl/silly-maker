# Authorable chrome layout proposal（铬布局文档、Chrome workspace 与意图绑定）

> 2026-08-25 后续裁决：Capacity Contract Reset 删除 boxes/anchors/offsets
> 合计 256 entries 的任意数量上限。Source 资源预算、每个 member 的结构/值校验以及本历史
> 提案的 presentation-only 语义仍有效。

状态：**已交付（M0–M2 + 双消费者，2026-08-22 当日闭合；M3 意图绑定
widget 于 2026-08-29 过证据门并交付）**（同日所有
者裁决接受：Open questions 按建议定；「不确定这个方案是否能完全解决
问题，但可以先这么做，下一轮引擎迭代再统筹更系统的方案（如果存
在）」——本 lane 是务实分层落地，不是场景/物体/交互统一抽象的终局裁
决）。闭合记录：M0（Story 侧布局文档）在外部实验仓先行落地，零引擎
改动；M1（`sillymaker.chrome-layout` 家族 + index + `app check` +
CAS 端口）与 M2（Studio 界面布局工作区 + `StudioBindingV1.chrome`
fixture + template HUD 仓内消费者，浏览器验收 = template.spec.ts 拖
框→保存→落盘毕业）当日合入；外部实验仓 HUD 同日迁移到引擎家族并删
除本地解析器（第二消费者）。M3 证据门于 2026-08-29 由外部实验仓封板
审计满足（第二真实消费者：挿入2 限时菜单的 choice-over-hold 假按钮
组 + `imoutoWindowTimerBarLinesV1` hold 进度条族，两者都是 Story
chrome 手搓「画布坐标 + 意图 id/进度几何」），同日交付：文档家族增
可选 `widgets` 节（`intent` 与 `hold_progress` 两种，box 引用 +
labelTextId + 可选 assetId/intentId），ui 包
`ChromeWidgetSurfaceV1` 通用 chrome host（意图 widget 只报「intent
id 激活」，可用性/置灰理由走 Story 提供的投影端口；hold 进度只读已
提交 `remainingMs/totalMs`，不掺墙钟），Engine Lab 一致性演习为仓内
消费者（widget 激活落 occurrence 围栏 `lab.engage_collector` 写，
hold 轨迹不动，`when` 臂在下一围栏结算 t=0 收割）。执行顺序与验收见
[Authorable chrome layout 计划](../plans/2026-08-22-authorable-chrome-layout.md)。

创作者需求：「道具栏/状态板的页签热区偏了，我只能报 bug——位置明明是
数据，编辑器却覆盖不到」「编辑器应该能覆盖所有 UI 与场景交互的摆放，
不然总有改不了的死角」「场景、物体、交互的抽象要系统性设计：对可视化
编辑友好，对 AI/代码生成也友好」。

证据门：外部实验仓的 imouto HUD——尖尖页签 y 分槽、热区左移 16px、
返回钮移位、数值统一下移 8px，全是纯几何调参，却每次都要走「报 bug →
改 TSX 常量 → 跑测试」的代码回路。引擎侧已有三个同构文档家族证明
「JSON 文档 + admission 一次校验 + Studio 真实渲染编辑 + dev-server
CAS 写回」的回路成立：scene（Scene Construction）、motion（Motion
工坊）、regions（Regions workspace）。chrome 几何是唯一还散在组件常量
里的摆放数据。

## 定性：统一的是「分解」，不是「基类」

舞台热区与 DOM chrome 在语义上真不同（锚点空间 vs 焦点/键盘/无障碍的
原生按钮），硬并成一个 Interactable 继承树要么把 DOM 语义拖进舞台数
据，要么把 React 降级成僵硬 widget schema。可编辑性从来不来自共同基
类，而来自**摆放序列化成编辑器拥有的数据**。本提案把既有的三分解合同
推广到 chrome：

- **几何**（在哪）：盒/锚点/标量偏移，坐标空间显式声明——数据；
- **呈现**（长什么样）：资产引用或 renderer 引用——数据；
- **意图**（点了算什么）：稳定 id，Story 映射到语义调用——id 是数据，
  合法性与处理留在规则代码。

`StageHitRegionV1` 已经是这个形状（regions 文档可编辑、可 trace）；
chrome 只缺几何这一半进文档。

## Shape（设计草图；字段名以实现切片的 admission 为准）

### 1. 布局文档家族

新增 `sillymaker.chrome-layout` 文档家族（与 motion/regions 同族的独
立 JSON）：

```jsonc
{
  "format": "sillymaker.chrome-layout",
  "version": 1,
  "layoutId": "layout.app.main-hud",
  "label": "主场景 HUD",
  "canvas": { "width": 1024, "height": 576 },
  "boxes": {
    "board.item.tab.peek": { "x": -16, "y": 240, "width": 40, "height": 100 },
  },
  "anchors": { "sheet.back": { "x": 900, "y": 16 } },
  "offsets": { "board.value-nudge-y": 8 },
}
```

- 坐标是逻辑画布空间整数（与 `GameViewport` 声明画布同系），入院校验
  整数/尺寸为正/名字非空；负 x/y 合法（停靠板露头就是负位）；
- `boxes` 是带尺寸的命中/摆放框，`anchors` 是只定位不定尺寸的点（自
  适应尺寸的按钮），`offsets` 是命名标量（字体度量补偿这类）；
- 文档按 surface 拆小（一份 HUD 一份），不做全局注册大文件——diff 局
  部、AI 上下文小、冲突少。

### 2. Story 消费：admission 一次，组件读类型化数据

组件从解析后的类型化数据读几何（缺名即抛，模块加载即失败），行为不变：
互斥/占用门/toggle 语义仍是代码。文档值变化不触碰
Save/digest/replay——与 geometry/regions 同一纪律，表现数据零权威。

### 3. Studio Chrome workspace

Studio 新增 Chrome workspace：挂 fixture publication 渲染**真实 HUD
组件**（Motion 工坊 fallbackPreview 的老路），叠拖拽手柄；拖动写回布
局文档走现成 dev-server CAS 端口（原子改名 + 409 冲突 + 重读恢复）。
尖尖偏了 = 拖一下、保存、完——不再报 bug。

### 4. 意图与提交态进度 widget（2026-08-29 交付）

图标按钮类 chrome（通知/保存/读取/相册/数据）本质是「画布坐标 + 资产

- 意图 id」三元组；进度槽则是「画布坐标 + 已提交进度投影」。V1 在可选
  `widgets` 节提供 `intent` 与 `hold_progress` 两类，由 focused
  `@sillymaker/ui/chrome` host 承载原生按钮/进度语义。可用性、置灰理由与
  进度值都由 Story 的已发布投影提供；产品可换像素，但 host 保留可访问名、
  disabled gate、单次激活与 progressbar 语义。widget 永远只报告
  `intentId`，路由权与合法性留在 Story 规则——与 mid-hold-input 钉死的
  「regions never gain routing power」同一条边界。复杂板体（道具格、状态
  数值）继续留在 renderer，不扩张成通用 UI DSL。

交付形状：可选 `widgets` 节承载两
种 widget——`intent`（box 引用 + `intentId` + `labelTextId` + 可选
`assetId`）与 `hold_progress`（box 引用 + `labelTextId`，渲染只读进
度条，数据源是 Story 递入的已提交 pending-hold 视图
`remainingMs/totalMs`，永不掺墙钟插值）。通用 host 是 ui 包
`ChromeWidgetSurfaceV1`：Story 提供 `stateOf(intentId) →
enabled/disabled(+理由文本 id)/hidden` 投影端口与 `onActivate` 回
调，未知 intent id 报 hidden；激活映射到哪条语义命令（普通 invoke、
围栏 hold_write、choice resolve）完全是 Story 代码。choice-over-hold
（原作限时菜单叠在仍在填的窗上）由此拿到声明式落点：菜单按钮是
`intent` widget，激活落 occurrence 围栏普通写，窗自己的 `when` 臂在
下一围栏结算 t=0 读写路由——单决议路径不变，第二个 pending 不存在。

## 边界与限额

- 只有**被人调过的几何**进文档；布尔行为（板互斥、占用门）留代码；
- 派生几何不进文档（命令插图 Y 从 say 盒反推这类），派生留代码；
- 坐标空间 V1 只有逻辑画布空间；舞台条目锚点空间已归 regions 文档，
  不在此重复；
- 文档由 Source 资源预算约束，不再设置无依据的 entry 数量上限；每个
  member 的名字、结构与坐标仍严格校验。名字用点分层级便于 lint 与检索。

## 分刀计划

- **M0（Story 侧，已先行）**：外部实验仓把 HUD 手调常量收进
  `hud-layout.json` + 本地 admission，组件与测试改读文档。零引擎改动
  ——先证明「几何进文档」的消费形状。
- **M1（引擎）**：`sillymaker.chrome-layout` 家族进 base（parse +
  admission 诊断码），dev-server 布局端口（列举/读/CAS 写），story
  check lint（名字唯一、画布匹配、Source 资源预算）。
- **M2（Studio）**：Chrome workspace（真实组件渲染 + 拖拽写回 +
  saved/draft 会话），双消费者：仓内一例（template 或 Engine Lab 极小
  chrome 盒）+ 外部实验仓 HUD 全量迁移。
- **M3（2026-08-29 交付）**：意图绑定 widget。证据门（第二个需要声
  明式图标按钮的真实消费者）由外部实验仓封板审计满足：挿入2 限时菜单
  假按钮组与 hold 进度条族。交付 = `widgets` 节 admission + ui
  `ChromeWidgetSurfaceV1` + Engine Lab 一致性演习（chrome-widgets
  jsdom 用例：围栏写路由、部分围栏 tick 推进度、禁用零派发、切臂即
  撤）；Studio 编辑面对 widget 保持只读透传，但盒改名/删除会同步/收
  割其 widget 引用，草稿永不因几何编辑卡死在 admission 外。
- **M3 补刀（同日，golden baseline 迁移实证）**：Story 像素接管钩子
  `renderIntent` / `renderHoldProgress`（宿主保留全部语义——按钮元素
  /可达名/禁用门/单次激活、progressbar role/已提交数值/box 定位；
  Story 只画内部像素，hold 钩子回 null 即隐藏该 widget），及
  `holdProgress` 接受按 widget 名解析视图的函数形态（多槽位 HUD：只
  点亮当前 hold 占用的槽）。证据：外部实验仓的 挿入2 深色面板与
  ■□ 描边文字格条都必须 Story 自有像素，且约 30 个计时窗规格共享
  8 个 popup 槽位。缺省路径字节不变。

## 验收草案

- M0：文档值与原常量逐项相等，既有 HUD 测试不改语义全绿；
- M1：非法文档（非整数/零尺寸/重名/超出 Source 资源预算）按稳定诊断码拒绝；合法文档
  变更不改任何 Save/digest/replay 字节；
- M2：Studio 拖尖尖 → 保存 → 运行中的游戏热区实时更新（HMR 回路）；
  CAS 409 恢复与 motion 端口同构；
- M3：禁用/隐藏 intent 不派发，启用 intent 只回报一个 id；提交态 hold
  进度不读墙钟；Stage polygon 与 chrome 按钮都能落到同一 occurrence-
  fenced 写路径，切出 hold 后两类 widget 一起撤出；
- AI 回路：agent 改 JSON → `app check` 校验 → 按诊断码修，全程不碰
  TSX。

## Open questions（2026-08-22 所有者裁决：均按建议定）

1. 文档粒度：**按 surface**（一份 HUD 一份文档），出现真实聚合需求
   再并；
2. `anchors`/`offsets`：**V1 与 `boxes` 三者都要**（M0 已证明三类都
   有真实条目）；
3. Chrome workspace 的 fixture publication：**Story 在 config 里声明**
   （与 studio binding 同构），引擎不猜。

## 停

- 布局文档获得路由权（决定去向而非报告 intent id 激活）；
- 行为布尔/占用规则/合法性进文档；
- 第二套 retained-mode UI 系统或全局 UI 场景图（与 React 竞争）；
- 全局注册大文件；
- 运行时从 DOM 反测几何写回文档（编辑面只在 Studio/dev-server）。
