# Cards Reference Application 实施计划

状态：**2026-08-25 经所有者接受；M0–M4 同日交付关闭。**

[Production-floor sequence](2026-07-30-production-floor-sequence.md) 是唯一跨计划排序入口。本计划选择
Cards 是 Adaptive Viewport 关闭后显式选择的唯一 Reference Product；它是产品验证车道，不是新的 broad
engine lane。只有完整产品实现暴露出的可复现通用缺口，才允许领取一个窄 engine correction。

Deno Desktop adapter 继续 package-private、explicit、default-off；stable source/behavior revalidation 与
production promotion 保持独立。本计划只使用 Browser/Deno Desktop 已有的 common GUI runtime、可调整窗口
和静态 packaging preview，不启用 Desktop HMR。

## 1. 产品分母与边界

Primary fidelity baseline 是本地只读 reference 中 PocketJS `apps/cards` manifest `0.6.0`、commit
`8a6f4313ac91e22a4dc42f987eb3f164906b7dee` 的完整可观察产品。Solid、Vue Vapor 和 Octane 文件是同一
产品的替代框架实现，不是三个产品 mode。reference checkout 只提供行为研究证据；Cards 的源码、测试、
构建、命名和素材不得依赖它。

完整 baseline denominator 是一个全屏单页：header 与三模块计数；按 Layout、Motion、Input 排列的三张
feature card；每张卡的 title/caption/detail/accent；初始无 focus/无 detail；LEFT/RIGHT 从无 focus 分别进入
首/末卡并在边界 clamp；CIRCLE 打开、关闭或原子替换当前卡 detail；移动 focus 不改变已经打开的 detail；
focused card 只抬起并改变背景/边框、不缩放文字；detail 每次 mount 从 22px 位移 spring 入场；两条分别
20s/26s 的一次性 linear ambient streak；底部操作提示。产品没有路由、网络、loading/error、Save、音频、
视频或 app 内 raster asset；不得为不存在的状态制造 framework。

Target-platform uplift 保留上述完整语义，同时用项目自有品牌、文案和 CSS/vector expression 面向当前
Browser phone/tablet/computer 与 computer-class Deno Desktop：

- 480×272 landscape 仍是 fidelity anchor，但默认布局响应 narrow phone、wide phone/tablet 和 desktop；
- pointer/touch、keyboard 与现有 gamepad Input 汇入同一 UI-session 行为，原生 button 保留 Tab、Enter、
  Space 与 screen-reader 语义；
- 文案允许换行，支持 browser zoom、动态字体、safe-area、高 DPI、可见 focus 与足够对比度；
- `prefers-reduced-motion` 下取消 ambient drift 与 spring 位移，状态变化仍完整可理解；
- resize 只改变 presentation，保留当前 focus/open detail，不创建 State、Save 或第二 application authority。

Cards 证明 responsive GUI、Input cooperation、React/Code Surface、motion、accessibility 和 final-graph
exclusion；它不证明大型文本/Scene、addressable working set、Save/replay 或 Mod readiness。

## 2. 已确认的窄 engine gap

Accepted Application Runtime design 已规定非游戏 GUI 不必伪装成 Game，但 live public Web entry 和项目
config 仍强制 `GamePackage`/Story。Cards 不能用 no-op GameSession、假 Snapshot、workspace-private import
或复制 Host 来绕过。先交付一个薄的中性 GUI application path：

- public `WebGuiApplicationV1` / `startWebGuiApplicationV1` 复用现有 build-injected bootstrap receipt、
  accessible startup shell、first-product commit、required-GUI readiness、failure/retry、React mount、
  `GameViewportV1`、Input Router/adapters、native-behavior policy、page lifecycle 与 Desktop close drain；
- GUI-only project config 可省略 Story entry、simulation、Scene 和 Inspector；Story-only commands 对单个
  GUI app 明确报告不适用，`check --all` 只检查有 Story authority 的应用；build/dev/prebuilt/desktop 继续
  面向所有有 Web target 的 application；
- GUI-only path 不创建 Session、State、Save/lease、semantic gameplay、DefaultGameRoot managed surfaces、
  custom HMR、第二 startup controller 或第二 renderer runtime；
- Browser 与 Deno Desktop 使用同一组件和入口；Desktop target consistency 与正常 close 继续复用现有
  private Host seam，但不提升 Desktop HMR 或 durability claim。

这是已接受中性 Application Host 的缺失接线，不是 Cards 特例。若实现需要复制 Game composer 的状态机，
立即收缩到共享 startup/mount helper；不得建设一个平行 application framework。

## 3. M0–M4 顺序

### M0 — 冻结产品合同与开发规则

- 从当前 `template/` 的 tracked project 形状创建 `examples/cards`，然后删除不属于 GUI 产品的 Story/game/
  Studio 内容；复制是起点，不是要求保留无关 skeleton；
- Cards README 记录 exact baseline、普通 Markdown semantic coverage、target uplift、许可替换、代码导航和
  startup/bundle/interaction/frame/heap/storage/accessibility 预算；完成独立 review 前始终标记 WIP；
- `viewId` 冻结为当前 admitted props + named slots 合同身份，并与 `nodeId` 共同形成 React lifecycle
  identity。兼容变化保留 ID；breaking contract 使用新 `viewId` 并普通 remount。没有已维护 released source
  需求时不增加平行 `viewContractRevision` 或 migration registry；
- 当前 pre-release authoring source 只消费 current format。格式变化同步修改 source、reader、tests 并删除
  旧路径；只有真实 persisted/released source compatibility 才能另立 migration 计划；
- Reference Product 关闭时必须做 Starter feedback classification；不创建持续同步、template migration 或
  scaffold CLI。

### M1 — 补齐中性 GUI 启动接缝

- 实施第 2 节的 Web public entry 与 GUI-only project config；
- focused contract tests 覆盖 document-entry readiness、injected-root tests、React failure/retry、input cleanup、
  normal dispose、GUI-only config/build 与 Story-command separation；
- 保持现有 Game entry 行为和 Browser/Deno static baseline 不变。

### M2 — 完整原生 Cards 产品

- 使用 `sillymaker.gui-composition` 与 supported `@sillymaker/ui/code-surface` 建立少量、内聚的 screen/card
  数据与 React/CSS 分界；不把每个视觉叶节点碎成 surface；
- composition source 持有稳定 node/view、card copy/accent 与 slot order；Code Surface catalog 做一次 props
  admission、literal component import 和 direct-plan compile；
- focus/open/detail/motion progress 是 React-local/UI-session transient state；原生 DOM focus 与现有 Input
  Router 共享同一 action owner；
- 完成整个 denominator 与 target uplift，不以代表性 slice、漂亮新增或 engine limitation 抵消缺失行为；
- release graph 排除 Story/GameSession、Save、Agent/RPC、Inspector/Studio、authoring source IO、Mod/
  Composition runtime、reference DevDock 与 addressable loader。

### M3 — 产品级证据

- focused tests：初态、首/末进入与 clamp、同卡开关、跨卡替换、focus/open 分离、slot order、reduced motion；
- Browser E2E：desktop/tablet/phone，pointer/touch/keyboard，现有 adapter 下的 gamepad action，resize 后状态连续、
  200% zoom/reflow 与 reduced motion；只断言用户可观察合同，不建 DOM identity inventory 或 pixel-diff 系统；
- application-local build/test、Story/config checks、prebuilt smoke、final dependency receipt、accessibility、
  `deno task check` 与 React Doctor advisory；
- 复用 `bench:gui:startup --application example-cards` 记录至少三次 raw samples，并记录 release JS/CSS/chunks、
  interaction long tasks、motion frame/headroom 与 repeated-toggle heap trend。benchmark 不作 promotion 裁决，
  不建立 Cards 专用 runner。

### M4 — 独立闭合与 Starter 回馈

- 非实现作者对照 coverage table 审查完整 denominator、target uplift、数量、主要旅程和预算；
- 分开裁决 application defect、文档/API ergonomics、reusable integration candidate 与通用 engine gap；
- 通用 engine fix 必须拥有中立 contract evidence，Cards 删除 workaround 并复验后才能关闭；
- 把真实证明为通用的 defaults、目录形状、文档与工程体验反馈到 `template/`；产品专属数据、视觉和 motion
  留在 Cards；不做持续同步或 scaffold CLI；
- 更新 live docs/website/Examples 清单并关闭本计划。后续 Reference Product 仍需 owner 显式选择。

## 4. Stop gates 与明确 defer

只有下列情况暂停请求裁决：baseline/许可/Host exception 无法明确；必须导入 internal/engine `src/**`；必须
复制 State/Input/Host authority；必须改变 Save/wire/digest/replay compatibility；profiling 证明预算只能靠新的
Worker/renderer/resource-owner 边界；或只能缩减 Cards denominator 才能继续。

不因下列候选暂停或扩张：source migration framework、project-wide symbol/reference graph、Prefab、Scene
batch operations、rich property framework、scaffold CLI、public Mod SDK、Effect Broker、3D、Desktop HMR 或
其他 Reference Product。GUI source 只有在 Cards 的真实 authoring 需求出现时才按现有 metadata-only Project
Index 模式增加最小 metadata；本轮不预建 GUI editor。

## 5. 关闭记录（2026-08-25）

M0–M4 均已交付。Cards 从当时 tracked `template/` 工程形状创建，然后删除 Story/Game/Inspector/Scene
authority；README 冻结 exact PocketJS 0.6.0 denominator、target uplift、预算、许可与普通 Markdown coverage。
`viewId` 的 props + named-slot contract identity 已写入 live authoring/development 规则，没有新增 revision 轴、
migration registry、双 parser 或 scaffold CLI。

M1 交付 public `@sillymaker/web/gui-application`、focused Base/UI/Web entries 与 GUI-only project config。
GUI entry 复用既有 bootstrap/startup shell、React mount、first-product commit、Host、Viewport、Input、
native-behavior、pagehide 与 Desktop close seam；不创建 Game Session、Snapshot、Save/lease、semantic
gameplay、automation 或 HMR owner。GUI config 的 module export 只 admission 一次，之后 path anchoring 与
workspace aggregation 信任 typed result。focused Host/Strict JSON entries 经过 curated barrel，只暴露既有
public contract；Host wrapper 不声明 `main`/`role=application`，产品拥有 landmark。原 Game entry 行为未被
替换，只共用 first-product-commit/retry helper。

M2 完整交付三张 canonical card、全部 copy/accent、header/count/help、empty/focus/open、两端 clamp、
toggle/replace、focus/open separation、150 ms focus lift、22 px detail remount motion、20 s/26 s 一次性
ambient streak，以及 phone/tablet/desktop responsive uplift、pointer/touch/keyboard/gamepad、semantic DOM、
contrast 与 reduced-motion。瞬时 UI 状态只在 React owner；Input 使用中性 `interaction` context。没有路由、
网络、loading/error、持久化、音频、视频或 app 内 raster asset。

M3 的最终证据为：

- Cards focused 3/3；GUI Host/Tooling/Cards focused 6 files / 68 tests；Cards Browser E2E 在 Chromium、
  WebKit 与 mobile portrait 为 9 pass / 2 expected project skips。自动证据保护合同级行为；480×272、
  Tab/Space、gamepad-left 与 normal-motion exact timing 是独立人工 characterization，不伪装成 DOM/CSS
  inventory 自动证明；
- 三次 fresh Chromium release sample 的 GUI ready 为 `53.102 / 53.818 / 52.173 ms`，first interactive 为
  `843.371 / 819.392 / 814.821 ms`；均为 raw local trend；
- final release graph 为 JS 7 files、`315,238 raw / 97,955 gzip`，CSS 3 files、`12,448 / 4,025`，全部
  11 files、`330,059 / 103,044`。它排除 Game/Story/Save/Agent/Mod/Inspector/reference UI、运行时
  persistence authority 与 Base/UI/Web root barrels；保留未被 Cards 调用的中性 Host record/file adapter；
- local interaction profile 为 focus `0.20/0.40 ms` p50/p95、toggle `0.10/0.20 ms`，Long Tasks 0；
  120-frame raw interval 为 `8.3/9.3 ms` p50/p95。GC 后首 200 toggles 增约 169 KiB、后 200 增约
  20 KiB，embedder heap 持平；这些只用于发现明显回退，不提升为跨机器阈值；
- release build、prebuilt smoke、public site composition、host-platform Deno Desktop `.app` preview、
  stylelint、typecheck 与 React Doctor（0 findings）通过。Desktop HMR、durability、signing 与 production
  promotion 没有被宣称；repository-wide `deno task check` 通过 format 1,392 files、type-aware lint/
  stylelint/typecheck/determinism、unit 379 files / 5,392 tests、6-case Composition/State trend suite、
  runtime assets、全部五个 Story authority checks 与 Engine Lab release build。

M4 的独立产品审查无 blocker，确认这是完整单屏产品而非纵向切片。独立 engine review 找到的四项真实
blocker——focused subpath 泄漏 internal helper、三层 config admission、Host 强制/嵌套 landmark、缺少首屏
React failure/retry glue 证据——均以删除/收缩方式修正并复验。Starter feedback 只有通用 GUI-only
复制后删减 recipe、focused entry 文档和中性 Host/config 能力回到 engine/template；Cards 的数据、视觉、
motion 和产品测试保持本地。没有持续同步、template migration 或 scaffold CLI。

本计划关闭后没有自动激活的下一 engine lane 或 Reference Product；后续仍由所有者显式选择。条件性的
Desktop stable revalidation/promotion 车道保持原状态。

## 6. 产品退役与证明迁移（2026-08-26）

Cards 已完成作为首个 GUI-only Reference Product 的历史任务。官网重建后，其可见 GUI Composition、Code
Surface、Input、响应式与 reduced-motion 展示由网站首页 Console 接替；中性
`@sillymaker/web/gui-application` 的 `storyEntry: null` Vite final graph、首个真实 Browser presentation、
遗漏 Game/Story/Save/Agent/Inspector/Mod owner 和 root barrel 的结构排除，则迁移到 tooling-owned 小型
conformance fixture。该 fixture 只保留产品无关的启动与依赖图合同，不复制 Cards 的三卡内容、视觉、
motion、设备矩阵、性能 characterization 或产品测试。

因此 `examples/cards`、example E2E server/spec、`/play/cards/` 发布路径和所有活跃 workspace 引用同轮删除。
本计划前述 denominator、review、raw measurement 与 2026-08-25 closure 是已发生的历史证据，继续保留；
Cards 不再是维护中的 example、workspace application 或当前产品能力 owner。
