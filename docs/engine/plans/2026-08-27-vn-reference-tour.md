# VN Reference Tour 实施计划

状态：**2026-08-27 经所有者接受，2026-08-29 M0–M5 全部关闭并完成旗舰切换。
引擎维护的 focused default VN Player preset、say-only 全画布推进、贴底布局、Ctrl/Tab/H/V 与鼠标中键、
最终 Stage/ending 媒体、冻结的八项音频、current-voice replay、voice-aware Auto、interaction-level
Back/Forward、产品入口、Save/recovery、Settings、作者接手与产品证据均已交付。VN Reference Tour 现为
维护中的旗舰 Reference Product；M5 完成的是仓库与发布接线，不声称已经执行远程 live deployment。**

[Production-floor sequence](2026-07-30-production-floor-sequence.md) 是唯一跨计划排序入口。本计划同时拥有
产品分母、实现顺序、证据门槛与旗舰提升条件；Bookshop 的后续教学角色不由本计划预裁。它不是 broad engine
lane，也不激活 Ren'Py DSL、Ren'Py Save 兼容、自定义剧本解释器或最终编辑器。

Cat Cafe 已在本计划开始前独立终止；它的应用、revision-1 Save 支持、产品 E2E 与 live 发布责任同步结束，
不转移或迁移到本产品。VN 开发期间曾没有当前旗舰；M5 已把本产品原子提升为旗舰。Bookshop 继续作为
maintained minimal Narrative example，但不是旗舰或完整 VN 产品参考；它的教学角色在本产品完成后另行评审并
显式裁决，不在本计划自动删除。maintained product examples 是 SillyOS + VN。此前 Electronic Pet Reference Product 已停止且
未完成；它的 M0–M2 与已提交 M3 切片只保留历史证据，不成为本产品的源码、素材、fixture、产品分母或实现模板。

## 1. 产品定位与完整分母

VN Reference Tour 是一个原创、独立、内聚、可发布的小型 Visual Novel。它要让玩家自然体验完整短篇，
同时让人类和 Coding Agent 看清当前推荐的 SillyMaker VN 制作路径。它不是 Engine Lab、API gallery、
交互式文档页或把每项引擎能力串成按钮列表的“怪兽示例”。

产品从实现开始时 tracked [`template/`](../../../template/README.md) 完整复制起步，随后删除 coins、inventory
与其他未选择的 starter domain。不得从 Bookshop 或 Cat Cafe 复制应用结构，也不得 import 任何其他 example。
剧情、角色、视觉、音频、名称和品牌均使用项目原创或明确兼容许可的表达；不复制 Ren'Py Quickstart 的文本、
素材、角色或品牌。

第一版完整分母固定为：

- 一段任一路线首次游玩约 10–14 分钟、共 110 条唯一可见对白/旁白/选项文案（任一路线 82 条）的完整原创短篇；
- 两名有姓名的角色与一个 narrator；每名角色至少两种、至多三种有剧情意义的 appearance；
- 两个 Authoring Scene、一个具有真实后果的二选一、两条均有专属内容的路线与两个完整结局；
- 一个 cue-bound 角色入场 Motion、一个背景 crossfade、一个环境 ambient Motion、一个 frame-based blink、
  一次 `setAppearance` 与一个自然的可跳过 `hold`；
- BGM、ambient、至少两种 SFX，以及少量能证明 current-voice replay 的 voice line；
- package-owned Splash/Title、New Game、Continue、Load、Settings、完成后的回到标题/重新开始；
- typewriter/reveal-first、auto、skip-read、History、voice replay 与 Player rollback；
- autosave、`resumeFromAutosave`、quick/manual Save、load、import/export，以及 mid-line、mid-choice、mid-hold
  的恢复证据；
- locale-addressable `zh-CN` / `en` text packs 与显式 fallback；shared、archive route 与 present route 分成
  三个按剧情需求准备的 pack，不把全部剧情 copy 留在 initial JavaScript；
- wide/narrow 响应式构图、鼠标/触控/键盘、200% zoom/reflow、reduced motion、无障碍焦点与自动化无声测试；
- Browser 独立可发布 release build 与当前 Deno Desktop static preview。独立稳定版复验后来已提供维护中的
  `app desktop-dev`，但本产品的 Desktop evidence 仍只领取 static preview；durability 与 production
  packaging promotion 继续由各自条件车道决定。

完整意味着两条路线、两个结局、全部素材、系统界面和恢复路径都可达且经过验证。一个开场、一个 route、
一次 choice 或一个漂亮 vertical slice 都不能代表完成。

## 2. 选择的能力与明确排除项

### 2.1 本产品消费的推荐能力

- `@sillymaker/base/story` 的 current author-facing aliases，以及 Story-owned typed State、semantic
  preview/dispatch、Snapshot、Save/replay 与 transaction rules；
- pure-data interaction document：`say`、`choice`、`branch`、`stage`、`hold`、`end`，由产品本地复制的
  Template kit 编译；这仍是普通 TypeScript 数据，不是新语言或 runtime；
- 显式选择引擎维护的 traditional VN preset 作为唯一 `defineNarrativeSurfaceV1` writer；该 preset 是
  内聚 VN core 加本产品明确需要的 optional History presentation，不建立第二套 runtime；
  一个 Semantic Stage owner 与一个 `WebGameApplicationV1`；renderer 只消费 read-only
  pending/history/player view 并调用 occurrence-fenced actions，generic GameRoot 不隐式安装 preset；
- `sillymaker.authoring-scene` 作为每个场景唯一作者权威，剧本只引用 scene/cue/appearance，不重复 placement；
- Motion/ambient/frame、Stage transition、typed audio intent/transient SFX、text content manifest/session、
  Player Profile、rollback 与默认 Saves/Settings/System hosts；
- dev-only Inspector、Narrative Flow 派生图、`app check`、named `app simulate`、focused tests 与 Browser E2E。

若 M1 的剧情自然需要，产品可以选用至多一处由已提交 Story/Scene event 派生的非权威 `NarrativeAside`，只
展示短暂环境或内心旁白；它不引入 hit region、mid-hold input、monitor 或第二条叙事权威。省略 Aside 不影响
完整分母或里程碑关闭。

### 2.2 本产品不消费的能力

本产品不为“全能力”名义引入 custom pending、presentation barrier、hold-when、mid-hold input、shared stage
input、authoritative monitors、hit regions、Timeline、产品自定义 WholeCanvas、Workspace Overlay、Content
Database、meta gallery、Narrative/Scene units、Code Surface、Agent/RPC、Runtime Inspector 或产品自有
Desktop HMR。ordinary production Player 静态选择传统 VN preset，不携带 application-local dynamic Mod
controller、DevDock、Inspector/source writer 或 Authoring Host。M4 development composition 显式选择
Reference DevDock 与 Embedded Authoring；其具体工具只在首次明确交互时加载，并从 production final graph
结构排除。这些开发面不改变产品分母或 gameplay State/Save。package-owned
Splash/Title 使用 WholeCanvas 基础设施，不等于产品定义了第二个 WholeCanvas surface。

若剧情自然需要上述某项，必须先修改本分母并说明产品价值；“引擎已经有”不是增加功能的理由。focused
default VN Player preset 只收编成熟 VN 的默认 UI/交互/输入政策，不扩张为公共 script kit、scaffold CLI、
通用 character registry、Blueprint 或编辑器。

## 3. 作者文件与唯一权威

推荐 locality：

```text
examples/vn-reference-tour/
  README.md                         # 运行、发布、作者地图与证据入口
  DESIGN.md                         # 完整分母、路线/结局覆盖表、平台与预算
  assets/
    content/                        # shared/archive/present 的 zh-CN/en text packs
    images/                         # 原创或兼容许可视觉素材
    audio/                          # BGM/ambient/SFX/voice
  src/
    story/narrative.ts              # 一个纯数据 interaction doc；按剧情段落分区
    scenes/control-room/            # Authoring Scene、motions 与 runtime accessor
    scenes/rooftop-antenna/         # Authoring Scene、motions 与 runtime accessor
    content/text-content.ts         # compact locale/pack manifest
    content/presentation.ts         # resident UI copy、Stage/transition catalog
    content/audio.ts                # audio manifest 与 intent/effect mapping
    game/                           # 最小 narrative/signalChoice/stage/audio authority
    ui/stage-renderers.tsx          # 被 Stage catalog 选择的纯 renderer
    application/ui.tsx              # 仅在需要产品 HUD/panel/special surface 时存在；当前未创建
    application/composition.tsx     # 只接线，不保存剧情 copy 或 gameplay rule
    tooling/                        # Inspector binding、Flow、named simulation
    test/                           # Story、presentation、persistence、authoring tests
```

一个值只有一个作者 authority：

- 剧情控制和稳定 text ID 在 `story/narrative.ts`；剧情 copy 只在 text packs；
- scene hierarchy、placement、appearance 默认值、cue 与 Motion reference 只在 Authoring Scene/Motion data；
- resident system/UI copy 与 catalog binding 在 `content/`；React/CSS 只拥有像素、布局与瞬时播放状态；
- `signalChoice`、pending/history、Stage 和 audio intent 属于权威 State；player preference 属于 Host Profile；
- Inspector/Flow 是开发期 projection，不写 gameplay State，也不进入普通 Player final graph。

README 必须保留“想改什么 → 唯一 owner 文件”的小型地图。Application wiring 标为 Advanced；普通台词、
场景和素材修改不能要求作者理解 Session/Persistence/Host 组装。不要为了拆文件建立第二份 graph、registry、
代码生成或同步系统。

## 4. M0–M5 实施顺序

### M0 — 合同、独立项目与负能力删除

状态：**2026-08-27 已交付。**

- 在 `examples/vn-reference-tour` 从实现开始时 tracked Template 建立独立 package；拥有自己的 config、metadata、
  assets、tests、README/DESIGN、build 与 license notices；
- 在 DESIGN 冻结 §1 数量、两条完整 route、两个 ending、semantic coverage table、支持的平台/Input/
  accessibility、当前低端预算和明确排除项；
- 删除 starter coins/inventory/HUD action、reference-only outer UI 与其他未选择的 starter domain；只允许保留
  证明 Narrative/Stage/Authoring/text 接线所需的临时 scaffold，且必须显式标为非产品内容并在 M1 原子替换；
  不得留下零值模块或 disabled placeholder；
- 建立最小 headless Story/application 空壳与 public-import-boundary，证明项目只使用 supported package exports；
- 本阶段不声称 VN 可玩，不修改引擎，不删除 Bookshop，也不重新引入已经终止的 Cat Cafe。

关闭记录：仓库从当时 tracked Template 建立了独立 `examples/vn-reference-tour` workspace package，冻结
《最后一次试音》当时的 59-entry / 2-route / 2-ending 起始产品分母、作者 authority、预算、平台与非目标，并注册
application/config/typecheck/project command/asset/determinism/public-import 检查。M0 保留 Narrative + Stage、
Authoring Scene/Inspector/Flow 与 locale-addressable content 的推荐外壳，删除 inventory/coins、HUD action、
reference-only outer UI、hold-when 和只保护这些未选择路径的测试；没有修改引擎、保留兼容 alias 或复制其他
example。focused tests、`app check`、临时 `scaffold` simulation、Browser product build、asset/determinism checks
与 repository check 通过。临时 Template 故事/Scene/media 仅证明接线，M1 必须用完整产品 author data 原子替换，
不得把它计入 semantic coverage。

### M1 — 完整剧本、场景与作者数据

状态：**2026-08-27 已交付；后续 M2–M5 也已关闭。**

- 写完并注册当时冻结的 59 条文案、二选一、两条 route 与两个 ending；先用 compatible placeholder media 也必须
  保持完整内容 breadth，不以单 route 关闭；
- 建立两个 Authoring Scene、角色 appearance、scene cue、Motion/ambient/frame 与 transition bindings；
- 完成 narrative graph lint/prediction、两条 named simulation 与全部 source/reference diagnostics；
- Inspector 能打开两个 Authoring Scene，选择真实对象，编辑 transform/content/appearance/order，并只读查看
  Motion/interaction/source facets；
- M1 关闭只代表完整 author data/headless routes，不代表 Player、媒体或产品完成。

关闭记录：M1 原子替换了 M0 的临时 Story/Scene 内容，交付当时冻结的 59 个唯一可见 text entries（shared 29、archive
15、present 15；完整 `zh-CN` / `en` variants）、任一路线 44 个可见 entries、一个直接写入
`signalChoice` 的 material choice、两条完整 headless route 与两个 ending。两个 Authoring Scene 现在拥有
稳定 Layer/Object/cue authority，Story 消费 cue-bound entrance、frame blink、rooftop cable ambient、
background transition、`setAppearance` 与 1.2 秒 skippable hold；`archive-voice` / `present-voice` named
simulations、Narrative graph/source/reference diagnostics、Scene/Motion admission 与 Inspector Scene/CAS 路径
构成本里程碑的证据类别。VN focused tests（7 files / 19 tests）、两条 44-step named simulation、`app check`、
product build、asset/determinism checks 与 React Doctor 均通过；`PARALLEL_WORKERS=1 deno task check` 通过 379 个
test files / 5,399 tests 与 6 个 composition benchmark tests。本记录不把这些 M1 author/headless 证据扩张为
VN Player、最终视觉/音频、Save/recovery、Browser 产品旅程或旗舰完成声明。

### M2 — VN Player、视觉与音频

状态：**2026-08-28 已交付并关闭。**

- 交付引擎维护、focused entry、显式选择的 default VN Player preset：responsive 对话/选项、History、
  playback toolbar、say-only 全画布推进与 Ctrl/Tab/H 默认政策；generic GameRoot 和非 VN final graph 不包含它；
- 产品保留 theme/media/Story/special surfaces，可 override 或 eject preset；交付 rollback/end controls 与完整
  Stage renderers，不复制 Template 的占位视觉；
- 接入 typewriter、auto、skip-read、voice replay、BGM/ambient/SFX/voice、cue Motion、crossfade、ambient/frame
  animation 与 hold；若 M1 已因剧情需要选择 bounded Narrative Aside，则同时接入，未选择不阻塞 M2；
- 用原创或兼容许可的最终视觉/音频替换 placeholder，验证 missing media fallback 与 audio autoplay unlock；
- wide/narrow、鼠标/触控/键盘、focus、200% zoom/reflow、reduced motion 与中英 overflow 在真实产品 UI 通过；
- 不为表现状态增加第二个 gameplay store，不为每帧动画创建 Game command。

进展记录：第一切片以产品本地 React/CSS 原型替换通用浮动系统 HUD，交付传统底部对话窗、说话人名牌、垂直
choice、History 与轻量 auto/skip 控件；`say` 阶段一个透明全画布按钮负责 reveal-first/再推进，choice/History/
播放控件不触发空白推进。后续 Ren'Py gameplay 审计把对话层改为 1280×720 下约 185px 的全宽贴底布局，并
接入 `Tab` 持续 skip-read、按住 `Ctrl` 的单次临时 skip-read 与 `H` 模态隐藏/恢复；隐藏层停止有效 Auto/Skip、
截获 gameplay shortcut，且 `H` / `Enter` / `Space` / 点按恢复不推进也不自动重启播放。H 请求先在界面仍
可见时收敛已经签发的自动推进并停止 mode，只有 stable normal Say 才进入隐藏；package-private Player
会先停止新自动尝试，并把 normal 的观察发布延后到既有 semantic advance 提交或退出之后。Choice/未读 stop 不会
因按键仍按住而重新越界启动；pending 离开 active Say 也会清除 transient hidden。未修饰 `Tab` 只拥有
Skip 路由，`Shift+Tab` 进入播放控件且 `Escape` 返回 gameplay scope。竖屏选择 `expand-height` layout variant，
宽屏与窄屏继续复用同一 authored Stage。
这些已验证的通用 chrome/interaction/input 行为已迁入 `@sillymaker/ui/narrative-player` focused default VN
Player preset；Template 与本产品显式选择同一 renderer/input 默认，产品本地原型已经删除，没有双轨
renderer。产品只保留 theme、media、Story 与 special surfaces；Bookshop 暂时保留低层自定义 renderer，等待
VN 完成后的独立教学角色评审。focused UI tests、真实
Chromium 宽/窄屏行为和 React Doctor 覆盖该切片。当时完整 VN Back/Forward 仍开放：旧 Core 只能按 command
建立 checkpoint/barrier，无法把 `time_tick` 对交互级历史隐藏，也没有 roll-forward；因此该切片没有先接一条
语义错误的 PageUp/滚轮路径。

第二切片交付产品自有的两个最终背景、两名角色五个 pose/frame 与九件透明道具；全部媒体进入 Story 的
resolved Asset manifest，Player 只预载当前 Stage demand，Inspector 使用同一 renderer/registry 并由既有
composition lifecycle 回收其 dev-only registry。九件道具仍是九个独立 Authoring Scene 对象，不因图集生成
来源合并为一张不可编辑舞台图；真实宽屏、`expand-height` 竖屏、两条场景转换和内嵌 Inspector 已走查。
完成态使用产品自有 ending surface，并调用既有 `returnToTitle` system dialog，不建立第二条 restart 路径。
focused Studio/VN tests、typecheck、`app check` 与真实 Browser 资产加载覆盖该切片。rollback/forward controls
在后续第四切片交付；完整中英/200% zoom/accessibility/Chromium+WebKit 矩阵仍开放；本记录不
关闭 M2。

第三切片接入冻结的 1 BGM、2 ambient、3 SFX 与 2 current voices。Story 继续只发布可保存的 continuous intent，
SFX 只来自 commit-only effect，Narrative graph 声明同一组预测依赖；Player 的“语音”/`V` 只调用当前语音 replay，
Auto 在文本 deadline 后等待 exact current voice，自然结束或 fetch/decode 失败后沿同一 semantic advance 路径继续。
Web Audio Host 增加声道活动 currentness 与 stale async load fencing，不保存 buffer/node/cursor，也不让媒体失败阻塞
gameplay。八项 MP3 在 Chromium/WebKit 逐一真实解码；真实产品路径证明挂载后的 gesture unlock、voice replay 与
voice-aware Auto，不可解码媒体证明静音降级。仓库 Playwright 默认静音改为连接到 0-gain terminal，而非断开
destination，因此 WebKit 的真实 `ended` 生命周期仍被覆盖。focused unit/product tests、typecheck、`app check`、
asset check 与 Chromium/WebKit E2E 覆盖该切片；volume/mute settings 仍属于 M3，自动化无声验收属于 M4，
rollback/forward 在后续第四切片交付，完整矩阵仍开放，本记录不关闭 M2。

第四切片把上述缺口收敛为现有 Core rollback port 的小型扩展，而没有建立第二个 VN 历史系统。Core 的单一
bounded Snapshot timeline 现在区分 `checkpoint` / `transparent` / `barrier`，以 cursor 保留可前进的已执行后缀，
在 Back 后出现新 commit 时丢弃该后缀，并让 Back/Forward 都通过权威 Snapshot replacement 提升 presentation
epoch。导航在 authoritative queue front 以 timeline generation、source/target checkpoint 和 current Snapshot
共同栅栏过期请求；外部 load/import/restart 以及 Admin/Extension 共用的 debug mutation authority 都重置 timeline。
VN 与 Template 将普通 narrative resolution 作为
交互 checkpoint，将 `time_tick` 与 `scene_reconcile` 分类为 transparent，将 begin-story 与不可逆边界保留为
barrier；presentation-barrier acknowledgement 也不额外制造玩家历史停靠点。focused default VN Player 直接消费
同一个 `instance.rollback`，在 Say/Choice 显示可用性驱动的 Back/Forward，并把 PageUp/PageDown 与滚轮上/下映射
到同一 input action；History/隐藏态不吞这些动作。产品 ending surface 复用同一 Back port，不建立第二条恢复路径。
149 项聚焦 Core/UI/产品测试、完整 382 文件 5,447 项 unit、6 项 composition benchmark、全量 33 项 examples
Chromium/WebKit/mobile E2E、2 项 Engine Lab Chromium/WebKit rollback E2E、VN/Template production build、
全仓 `deno task check` 与 React Doctor changed-files audit 覆盖本切片；两轮独立 Core/UI 复查均无剩余 blocker。
完整 responsive/zoom/accessibility/中英 overflow 矩阵仍开放，本记录不关闭 M2。

第五切片关闭产品 UI 矩阵。focused default VN Player 的 History 按实际可用性启用，滚动 History 可由键盘
聚焦；鼠标中键与 `H` 复用同一个 hide/restore action，不建立第二条 chrome 状态路径。Web Host 从已经成功
激活的 Text session 发布 `<html lang>`，应用必须显式选择 locale-aware root `accessibleName`，标题文本不再
隐式覆盖静态应用名称。产品补齐中英文 root/Stage/Player/ending 文案与可访问名称，保持普通 Player 的静态
默认权威不变。真实产品矩阵覆盖 1280×720、360×640、640×360 的 200% reflow proxy、鼠标/触控/键盘焦点、
reduced motion、Axe WCAG 2 A/AA、中文/英文长文案、Choice、History 与 ending；Chromium 与 WebKit 均执行，
mobile project 单独覆盖 touch。一次 participant-assisted Chrome 200% browser zoom characterization 在不修改
产品或建立长期 harness 的前提下确认标题、Say、History、Choice、ending 与 44px 控件均留在产品 canvas 内，
无水平溢出；页面额外纵向高度来自 canvas 外的 dev-only Inspector launcher。History `<ol tabIndex={0}>` 是为
解决 Axe `scrollable-region-focusable` 的有意可访问性选择，也是 React Doctor 唯一 advisory。M3 继续拥有
Splash/入口、Save/recovery 与 settings；M2 关闭不推导产品完成、旗舰提升、自动化无声证据或 Desktop promotion。
最终稳定工作树通过 382 个测试文件、5,449 项 unit、6 项 Composition benchmark、40 项 examples Browser E2E
（另有 2 项按项目条件明确跳过）、全仓 `deno task check` 与 VN production build；后者保留现有
`advancedChunks` deprecated 和单一大 chunk advisory，不把 M3 之外的 bundle 策略工作偷渡进本切片。

### M3 — 产品入口、Save/recovery 与设置

状态：**2026-08-28 已交付并关闭。五个切片完成 boot-time autosave resume、return-to-title/Continue、
默认 VN system menu/Save、完整最小设置/live locale，以及 closing/hidden/reload/restart 的分层恢复矩阵。**

- 完成 Splash/Title、New/Continue/Load/Settings、return-to-title/restart；默认 Continue 显式载入当前 autosave，
  `resumeFromAutosave` 独立控制 boot-time resume；
- 完成 quick/manual Save/load、import/export、autosave flush、mid-line/mid-choice/mid-hold reopen 与 rollback；
- 完成 locale、text speed、auto wait、music/ambient/SFX/voice volume、mute 与产品需要的最小设置；
- hidden、已持久化 autosave 的 Browser reload、return-to-title/restart 与 normal/awaitable close 后，Stage、
  Narrative、continuous audio、History、hold remainder 与 current route 恢复到同一可观察语义；Browser
  forced close 只要求恢复最后已持久化的 autosave；
- 不增加存档截图、兼容框架或跨产品 Save migration，除非真实产品验收另行接受。

进展记录：第一切片只让产品显式选择 Base 已有的 `resumeFromAutosave`，没有建立产品本地 Persistence、Save
schema 或第二套 Title authority。共享 Host record store 的产品测试证明新实例恢复同一 Narrative、History 与
Stage，而 command log 与 rollback timeline 按合同从新的实例局部基线重新开始；Chromium/WebKit 的真实 reload
旅程证明 fresh boot 的 Continue 禁用，写入 autosave 后重新加载会启用 Continue，并显露同一 pending occurrence。
稳定工作树通过 382 个测试文件、5,450 项 unit、6 项 Composition benchmark、42 项 examples Browser E2E
（另有 2 项按 project 条件明确跳过）、全仓 `deno task check` 与 VN production build。
第二切片修正共享默认 Title 的真实 Continue 合同：它载入据以启用按钮的 `auto.current`，只由成功 load
产生的既有 presentation anchor 关闭 Title；rejected load 保持 Title 与当前 epoch，不增加新 lifecycle 或错误协议。
共享的 package-private Host lifecycle 只在 return-to-title 的 restart 前 flush autosave；New Game 仍直接 restart，
VN ending 保持纯委托并沿用已有的 fail-closed/retry 交互。Chromium/WebKit 旅程证明立即返回标题再 Continue
仍恢复 completed ending。可见 Save/quick controls、mid-choice/mid-hold reopen、import/export 与 settings 仍属于
后续切片；不得把本记录报告为 M3 关闭。第二切片稳定工作树通过 382 个测试文件、5,452 项 unit、6 项
Composition benchmark、42 项 examples Browser E2E（另有 2 项按 project 条件明确跳过）、全仓
`deno task check`、VN production build，以及从 `2704ceef` 起算的 React Doctor changed-files audit（0 findings）；
production build 仅保留既有 `advancedChunks` deprecated 与单一大 chunk advisory。
第三切片让 focused default VN Player 通过 package-private controller 消费共享 Game Root 已有的 Saves、
Settings、return-to-title 与 Persistence 权威；普通 Player graph 未选择该 preset 时不增加公开系统菜单合同。
Say/Choice 的紧凑控制条提供 Menu、Save、Q.Save 与带确认的 Q.Load，完整 Save overlay 继续负责 manual slot、
import/export 与冲突反馈；菜单会先停止 transient Auto/Skip，Escape 与鼠标右键复用 `ui.cancel`，History 优先在
既有 managed physical admission 中关闭，未建立第二条 dismissal authority。产品补齐中英 Player/menu/Save copy。
产品级 quick mid-choice 与 manual mid-hold 测试证明 load 后精确恢复 Narrative、History、Stage、continuous
audio、hold remainder、route State 与 digest，并按合同从新的 load anchor/空 command log/rollback baseline 继续。
响应式验收同时修正 Narrative Host 的真实焦点缺口：CSS 隐藏的窄屏 controls 不再进入自定义 Tab 环。
本切片稳定工作树通过 382 个测试文件、5,461 项 unit、6 项 Composition benchmark、VN Chromium/WebKit
20 项 E2E（另有 2 项 mobile 条件跳过）、全仓 `deno task check` 与 VN production build。React Doctor 的 3 个
advisory 均经源码复核：两个对应 disabled/close 时清理瞬时菜单状态，一个对应 dialog 内层的 Tab/Escape
focus scope；均为有意产品行为而非 blocker。locale、text speed、auto wait、分声道 volume/mute 与剩余
closing/hidden/restart 恢复矩阵仍属于后续切片；不得把本记录报告为 M3 关闭。
第四切片复用现有 Player Profile、默认 Settings sections 与 Web Text locale activation，没有建立产品本地设置或
i18n store。产品现在提供 locale、text speed、auto wait、BGM/voice/SFX volume、mute 与 fullscreen；这些偏好
独立于 Save 持久化，reload 后恢复。语言选择仍沿用 Web Host 的单一顺序：先原子激活 Text session，再发布
Player Profile locale。一个窄的纯 copy projection 让 root/Stage accessible name、Title、菜单与之后打开的 Save
使用当前语言；静态产品不新增 profile subscription，Title 只走现有 same-target refresh 并保留 managed surface
instance，已经打开的 System dialog 则按合同保留 opening copy，关闭后重开才采用新 catalog，Save surface
topology 不因语言切换改变。Settings 使用原生 label/range/select 语义和窄屏重排，独立视觉检查修正了最初的
横向裁切。稳定工作树通过 382 个测试文件、5,463 项 unit、6 项 Composition benchmark、VN Chromium/WebKit/
mobile 23 项 E2E（另有 2 项按 project 条件明确跳过）、全仓 `deno task check` 与 VN production build；独立
复查无剩余 blocker。React Doctor 的既有 large-component 提示与对显式 pure copy projection 的 render-time
调用提示均经源码复核，不构成行为问题，也没有为消除 advisory 引入第二套 store。closing/hidden/restart 的
剩余恢复矩阵仍属于后续切片；不得把本记录报告为 M3 关闭。
第五切片关闭恢复矩阵而没有增加 lifecycle harness。Web Host 在唯一共享 presentation clock 边界排除 document
hidden 的经过时间，Stage 与 Audio 也在挂载时立即采用当前 visibility；hidden 恢复不会解除独立的 DevDock
手动 freeze。产品 carrier-lock 使用既有 `tickQuantumMs: 200` 合同，让正常 Player 在到期前提交 bounded partial
remainder，而不是由测试伪造一个只能手动构造的中间态。产品测试以 60 秒未触发 debounce 证明 normal dispose
前 `auto.current` 仍为空、dispose 后 fresh instance 却精确恢复同一 partial hold、route、Narrative/History、
Stage、continuous audio 与 digest；command log/rollback 仍从新实例局部基线开始。Chromium/WebKit 又证明真实
Player 会产生 partial checkpoints，以及中途 quick-load 后经系统菜单 return-to-title 再 Continue 会恢复完整
game/Narrative publication。已有 Browser reload 旅程继续只证明已经持久化的 autosave；`pagehide` 仍是同步 fence
与 best-effort async flush，强制关闭只能恢复最近已完成的 autosave，不能冒充 awaitable exact-close 合同。这组
证据与既有 quick/manual/import/export、mid-line/mid-choice/mid-hold、rollback、terminal supervisor 和 Desktop
close receipt 合同共同关闭 M3；没有新增 `beforeunload`、隐藏标签页伪造、进程/lifecycle harness 或第二套
persistence authority。最终稳定工作树通过 383 个测试文件、5,467 项 unit、6 项 Composition benchmark、
VN Chromium/WebKit/mobile 25 项 E2E（另有 2 项按 project 条件明确跳过）、全仓 `deno task check`、VN
production build 与独立实现审查。React Doctor 唯一新增 advisory 对应 `GameAudio` 已显式移除 visibility listener、
退订 stores 并释放 presenter/host 的 effect cleanup，不构成泄漏，也没有为消除误报改写生命周期。

### M4 — 作者任务、产品证据与 Starter feedback

状态：**2026-08-29 已关闭。第一 authoring slice、Agent 与所有者授权 Computer Use-assisted participant
接手任务、workstation 自动化产品证据、独立 product/engine review 与 Starter feedback 已完成。所有者因没有
合适设备，取消代表性真实 current-low-end qualification 作为本产品完成门槛；该资格未执行、未通过，也不形成
低端设备支持声明。M4 按这一明确缩减后的证据范围关闭。**

- 一名人类从 Inspector 微调场景构图/appearance/Motion reference，一名 Agent 使用同一 source、diagnostics、
  structured operation/CAS 路径完成修改；人类随后继续审查、undo/redo 与保存；
- focused tests、两条 simulate、`app check`、Chromium/WebKit 产品 E2E、build/prebuilt smoke、Deno Desktop static
  preview、accessibility 与自动化默认无声测试全部通过；产品默认非静音，mute 仍是持久化用户偏好；修改
  React/TSX 时运行项目约定的 React Doctor advisory audit；
- 记录 startup/first interactive、initial JS/CSS/assets、关键交互 Long Tasks、frame time 与 heap 的 raw
  measurement；阈值只来自本产品预算，不做跨项目 promotion 排名；
- 独立 product review 对照 semantic coverage table 逐项确认早期、中段、分支、结局、恢复和作者任务；独立
  engine review 将发现分成产品 bug、文档/Starter 改进、可复现中立 engine gap 与明确非目标；
- 只有被 Template 与本产品共同证明的通用 starter 改进才反馈到 Template；focused default VN Player preset
  由引擎维护，产品主题、故事、媒体和特殊规则留在本地。

进展记录：真实 VN 接手任务暴露了一个窄的通用 Inspector 缺口：Authoring Scene 已把
`visual.ambient` 作为场景唯一 Motion-reference authority，但 Inspector 只能读取和 scrub，无法通过已有
structured operation/CAS/history 路径调整该绑定。第一切片因此只新增 package-private
`scene.object.set_ambient`，原子编辑一个现有 Visual 的 `{ motionId, phaseMs? } | null`；Motion definitions、
cue transition 与其他 bindings 仍只读，group 仍拒绝 Visual edit，operation schema revision 保持 2。可选项来自
Project Authoring Index 的 metadata list；加载器只读取当前 Scene 已引用的 Motion 文档，不建立资产图、Motion
editor、Agent runner 或公开 ABI。Inspector 同时修正窄栏中 label 被长 ID 挤成逐字换行的问题。
真实 standalone 复核还发现 nested Inspector route 让 `document.baseURI` 指向自身目录，产品相对 runtime
asset 因而全部降级为占位图；dev-only Inspector HTML 现在显式把文档 base 设为应用根。focused HTML contract
test 与真实 Browser 共同证明当前 Scene 的 7 个图片资源成功加载，且没有 `asset.fetch_failed`。

Agent 已在真实 standalone Inspector 中打开屋顶 Scene，把“摆动电缆”的 `cable-sway` ambient phase 调整为
350ms，随后完成 undo、redo 与 CAS save；保存后的产品 source 是唯一 authority。focused admission/reducer/
executor/source-loader/Inspector tests 与真实 Browser 操作共同覆盖该路径。2026-08-29 所有者明确允许以
Computer Use 模拟原定的人类接手验收；participant 在真实 standalone Inspector 中视觉审查屋顶构图与
Motion facet，经语义浏览器操作把 phase 从 350ms 调到 400ms，完成 undo（恢复 350）、redo（恢复 400）、
CAS save，并在刷新后重新打开同一 Scene/Object 确认 source 与控件均为 400ms。Computer Use 负责真实桌面
视觉复核；因 macOS/Safari 的辅助操作通道无法稳定命中虚拟列表，精确字段操作使用同一页面的 Browser
语义自动化完成，没有修改系统辅助功能设置。该所有者授权的 participant pass 关闭本计划的人类接手项，
但不替代 current-low-end qualification 或随后已经完成的独立 product/engine review。

扩写前的 workstation characterization 来自 2026-08-28 的本地 Apple M4 Max / 128 GiB / macOS 26.6.2 /
Deno 2.9.5 / Chromium 151，不是低端设备 qualification。音频修正后的 7 次 GUI ready /
first-interactive 分别为 199.20/199.26、130.70/130.76、131.83/131.89、124.35/124.40、
134.12/134.17、133.06/133.15、100.97/100.99 ms。release build 为 418.59ms；JS gzip 344,235 B，
CSS gzip 9,058 B，runtime assets raw/gzip 1,571,801/1,422,632 B，完整产物 raw/gzip
2,937,217/1,775,925 B。Title 的 initial media transfer 为 0；第一 Say 累计 713,414 B，完整 archive route
累计 1,396,433 B。

第一轮真实交互 profile 曾发现 New Game 的冷 `new AudioContext()` 在点击任务内占用 130–203ms，超过 §7
单次 `<100ms` 预算。修正只让现有 Web Audio Host 在可见 Title 挂载时预建 context，继续等待真实手势解锁，
没有新增公开 API、音频状态机或预加载媒体。修正后 5 个独立 Chromium 进程从 New Game 到第一 Say 分别为
64.54、68.61、72.93、81.94、70.80ms，New Game 与随后完整 route 均记录 0 个 Long Task。最终 Stage/ambient
挂载时的 180 个 frame intervals 为 median 8.3ms、p95 9.4ms、max 17.3ms，0 个超过 33.34/50ms；强制 GC 后
heap 从 Title 4.77 MiB 到单路线结束 8.76 MiB，回到 Title 后每隔 2 秒三次均为 8.59 MiB，没有持续单调增长。
上述 bespoke raw facts 全部在 §7 冻结预算内，但对应扩写前候选，只保留为修复冷 AudioContext 与观察
Long Task/frame/heap 的历史证据，不能冒充最终内容候选或 current-low-end 设备 qualification。

M4 独立产品审查随后用实际字数与逐页行为证明 M1 当时冻结的 59 unique / 44 per route 只能承载约 3–5 分钟，
与已经冻结的 10–14 分钟产品合同和最小视口分页要求自相矛盾。因此本轮进行 evidence-driven correction，
不是任意扩 scope：作者数据补足为 110 unique / 82 per route，除两段必须保持 exact voice transcript 的
station call 外，每个 Say page 不超过两句。分页改变 Narrative occurrence topology，故 Narrative module
contract revision 从 2 提升到 3、Story identity revision 从 3 提升到 4；State schema revision 2 与
state-contract revision 1 保持不变，也不保留 development-only compatibility wrapper。

最终内容候选在 Deno 2.9.6 / Chromium 151 workstation 上的 7 次通用 GUI ready / first-interactive 为
252.29/252.36、130.59/130.65、130.14/130.23、131.72/131.75、129.35/129.39、128.65/128.70、
131.74/131.78ms。release build 的完整产物 raw/gzip 为 2,968,937/1,783,590 B；Browser 产品矩阵在
Chromium/WebKit/mobile 为 38 passed、2 个 project-conditional skipped，覆盖 Axe、200% 等效 reflow、
640×360 最小视口、reduced motion、中英文 overflow、真实音频解码、通过真实 Settings UI 的 locale/Profile
持久化，以及 Embedded Authoring/Save/Back/Forward/Auto。测试基座把真实音频图接到 0-gain terminal，产品
默认值则由测试锁定为非静音。release Browser build、8 项 Engine Lab prebuilt `@smoke`、当前 Deno Desktop
static package 的真实 Title 启动与正常关闭均通过；Desktop 证据仍只是 static preview，不提升 HMR、
durability 或 production packaging。两条 82-step named simulation 完整覆盖两个结局；
真实 Browser 完整走通 archive route，并在 present route 覆盖到权威 partial-hold/reopen 边界。这是按权威
状态机与 Host 接缝分层的产品证据，不冒充两次逐点击的 Browser 人工游玩。

独立 product re-review 已确认当前 110/82 候选不再是纵向小切片：archive/present 分别约有 3,290/3,309
个中文非空白字符与 1,976/1,990 个英文词，两条路线各含 28 条互不混入的专属内容并进入不同结局；按正常
阅读速度并计入 Choice、voice、hold 和操作停顿，10–14 分钟合同合理可达。默认 Auto 的真实 Chromium
完整运行也分别在约 141/142 秒抵达两个结局；该加速播放数据只证明 Auto 收敛，不能替代首次阅读时长。
因此独立 product/engine review 与 Starter feedback 均已关闭且没有提交阻塞；在当时，M4 只剩代表性真实
current-low-end qualification。2026-08-29 所有者随后明确取消该项作为完成门槛，因为没有合适设备；该项未
执行、未通过，也不能用于声明低端设备支持。

本 authoring slice 的提交时回归覆盖 6 个 focused test files / 32 tests、Inspector Chromium/WebKit 2 项
真实编辑 E2E、两条 44-step named simulation、VN Chromium/WebKit 24 项产品 E2E（另有 2 项按 project
条件跳过）、`app check`、release build/prebuilt smoke、49 页文档 build，以及全仓 `deno task check`
的 383 个 test files / 5,470 tests 与 6 项 Composition benchmark。React Doctor changed-files audit
只报告现有 coherent `object-inspector.tsx` 的 giant-component advisory；本切片没有为评分拆散同一个对象
编辑面板。上述回归关闭第一 authoring slice，不关闭 M4；剩余证据仍按上一段执行。

M4 的真实视觉复核随后把默认 VN chrome 作为一个响应式系统纠正，而非只缩放正文。Title、Say、Choice、
History、System Menu、Settings、ending 与开发入口共享 document-wide stylesheet、`rem`/theme token 和
override 机制，但不再把“统一”解释成所有 surface 同倍率放大。默认 document 基线固定在正常浏览器 UI
大小且不随大屏继续增长；Inspector/Embedded Authoring 使用共享 compact 档和 IDE 式 Stage-first 布局，
常驻 VN 对话/playback chrome 约束舞台占比，Title 与暂停菜单才保留更强的局部层级。短宽屏的
Title/System Menu 改为双列，竖屏继续单列；Settings 删除内容组件自有的第二层滚动，由既有 managed
blocking dialog 独占 stage-bounded overflow；fine-pointer 常驻控件允许正常 32px 密度，coarse-pointer
设备保留 bottom sheet 与 44px touch floor。
1920×1080 填满 16:9 canvas，1920×1200 在同一 1920×1080 canvas 上保持对称纵向 letterbox；Save/Load
是唯一在该宽度改变内容拓扑的系统面板，使用更宽的三列 slot grid，而不建立第二套 typography scale。
大屏复核随后明确区分 physical resolution、CSS viewport 与 DPR：未声明 `maxScale` 的 fixed canvas 不再由
引擎默认锁在 1×，同宽高比 4K/5K 可以填满；当前 VN 的 16:9 美术在 ultrawide 仍诚实保留 `fit`，不把固定
1600×900 背景拉伸或在空白侧翼冒充完整构图。通用 `expand-width`、公开 `layoutVariantId`/CSS attribute 与
shell-space HUD 已足以让具备可延展背景的后续产品使用超宽空间，本产品不为缺少真实素材预建 backdrop DSL。

共享 baseline 也收进启动与作者工具边界：Game/GUI entry 在 Host failure UI 可发布前加载一次
`@sillymaker/ui/styles.css`，独立 Inspector entry 显式加载同一 stylesheet，Embedded Authoring 继承产品
document；GameShell/DevDock 不再重复 import。原生按钮得到低特异性的中性默认样式，Stage authored hit
region 与 Inspector object overlay 显式保留精确几何；Inspector/Embedded Authoring 删除自有默认 palette，
直接消费共享 compact token，并用 container reflow 防止窄栏溢出。Application-root token
override 与单组件 scoped override 均由真实 Browser 行为验证，不需要 Theme Provider、JavaScript scale
service 或第二套 viewport。

1280×720、640×360、360×640、1920×1080、1920×1200 与 2560×1080 的 Chromium/WebKit 合同 E2E 证明可见操作留在
画布内、无 document 级横向溢出，窄屏 Stage 在导航/属性区之前出现，普通与大桌面 Stage 至少获得主要工作宽度，
短 Scene 列表不再保留固定空白高度。Vite development 现在通过独立 development composition 自动选择一个
轻量入口与既有 Reference DevDock（session-only `debug_tools` / `cheats`），产品自有 Settings 不被重复注入；“打开内嵌制作”和
“调试”共享一个半透明开发工具面板，可在 Host canvas 内拖动并吸附到最近角落。制作缺席时只显示调试，
调试被禁用时只显示制作，两者都不可用时整个面板不渲染。未选择 Reference UI 的应用仍得到一个制作专用的
固定回退入口。production build 结构性排除该 development composition、DevDock implementation/launcher 与
Inspector/source writer；共享 input-exclusion selector 仍可留在 Player bundle。上述修正不把
DevDock、Inspector 或 Authoring Host 变成产品能力或 production surface。

development 的常驻部分只包含组合入口、能力观察与共享可移动 launcher；首次点击“调试”才动态加载完整
DevDock 菜单/window host，选择具体工具后自动收起菜单，保留前景 launcher 供再次打开，并确保 launcher 与
所选窗口不重叠。各工具 body 继续按首次打开加载；“打开内嵌制作”沿独立动态入口加载 Authoring Host，点击
制作不会顺带加载 DevDock。Debug chunk 失败只替换这枚入口的局部状态，Player 继续运行并提供显式页面
重载恢复；这里没有新增通用 loader framework、预取器或测试专用协议。

2026-08-29 所有者进一步裁决：Mod 是组合/生命周期机制而不是碎片化目标；核心玩法模块保持内聚，
围绕核心且可被真实产品省略、替换或单独换代的能力才作为 optional Mod。M4 因而增加一个 bounded
engine-correction/product-consumer 子切片；它本身没有改变当时的 59-entry / 2-route / 2-ending 玩家分母。
后来独立产品审查发现的是另一项产品合同缺口，并单独触发上述 110/82 correction：

- private Mod Runtime 增加 selection successor controller；每个 generation 的 active set 仍不可变，
  install/uninstall 通过候选 generation、原子 publication 和 predecessor retirement 完成；
- VN Player cleanly 分出内聚 core 与 optional History presentation；traditional preset 显式组合两者，
  本产品继续选择完整体验，focused core-only build 则结构排除专用 History renderer、入口控制与 CSS；
  shared generic Narrative family 暂不为此拆分，两种选择运行同一 Story 时 Snapshot/Save/digest 不变；
- core/full 构建图证明 optional History presentation 的静态选择和结构排除；private successor controller
  以中立合同证明候选 generation、失败保留 predecessor、提交确认后退休旧 owner；VN 不为此伪造
  装卸消费者，development 只验证真实 DevDock menu/window host、工具 body 与 Embedded Authoring 的分层交互懒加载，production Player
  排除 controller、DevDock/Inspector/Tooling implementation；
- private controller 与 DevDock publication seam 尚未被真实产品端到端连接；本切片只交付 private
  hot-swap substrate，不宣称 History 已能动态装卸，也不宣称 public、完整的热插拔 Mod 系统；
- 影响 GameplayModule/Simulation 的 Mod 不在存活 Session 原地改 graph，而是复用 Browser R2 exact
  Save + lease handoff建立 successor。这个子切片至少固定中立 controller 合同；若 VN 没有一个真实
  authoritative Mod 变化，就不为演示伪造第二条玩法路线，完整 R2 产品消费者留给后续真实游戏重写。

该子切片不激活 public resolver/manifest/ABI/SDK/distribution、目录扫描、远端 executable install、
marketplace、per-Mod watcher/HMR protocol、任意 State patch、service locator 或通用 build-profile DSL。
代码模块已被浏览器求值后也不宣称从 ESM/CSS cache 物理删除；卸载只保证 publication、listener、
resource handle 与 lifecycle owner 退出。

2026-08-29 follow-up 根据真实商业克隆的专属调试/编辑工具需求收口 tooling public boundary，但不为本
compact VN 伪造新的工具 Mod：

- DevDock 的 lazy result 使用公开 `DevDockContributionLoadHandleV1`；动态加载边界对 producer 的普通
  typed panel set admission 一次，删除 producer 重复 admission、每侧 16 panel 硬上限和中文不自然的 title
  byte cap。已取得 handle 的异步 `dispose` 接入 Web application terminal close barrier，exactly-once/joinable；
- `@sillymaker/studio` 新增一个 focused `sceneInspector.properties` contribution contract。game/editor Mod
  可在 core Object Inspector 旁增加专属工具，只得到当前 admitted Scene、read-only facets、selection 与
  current document/revision-fenced Scene operation port；Host/Session/source IO/Save/Context 不公开；
- Scene operation vocabulary/schema/result 随 Studio contract 公开给这些 build-known tools，envelope admission、
  executor 和 source owner 仍为内部实现。binding 的同步或异步 cleanup 由既有 Inspector composition 在
  rollback、successor retirement 与 final close 等待；
- VN Reference Tour 与 Template 当前都不需要专属 Scene tool，因此保持空选择。其他 document family、完整
  workspace/editor replacement、public resolver/manifest/SDK 仍需独立真实 consumer 和 focused contract。

**M4 关闭记录（2026-08-29）：** 上述作者任务、自动化证据、独立 product/engine review、Starter
classification 与最终 110/82 产品分母均已关闭。所有者因没有合适设备，明确取消代表性真实
current-low-end qualification 作为本产品完成门槛；这是一项证据范围裁决，不是 qualification PASS。本产品
没有执行该资格，也不据此声明当前低端设备支持。M4 因而按缩减后的接受范围关闭，允许进入 M5。

### M5 — 旗舰提升与文档收口（Bookshop 保持）

状态：**2026-08-29 已完成。** M5 在 M0–M4 按接受范围关闭、完整产品独立审查通过后开始，并在一个原子
cutover 中：

- 把 VN Reference Tour 设为维护中的旗舰和网站/示例入口，更新 current docs、workspace、build/deploy 与 lockfile；
- Bookshop 保持到 VN 完成。M5 只记录两者教学覆盖差异并安排完成后的独立评审；是否退役必须由该评审显式
  裁决，不把删除 Bookshop 作为 VN completion gate，也不在本计划预留自动删除步骤；
- Cat Cafe 产品及其 revision-1 Save/E2E/live 发布责任已在本计划开始前终止；M5 不重做该删除、不承接旧
  Save，也不重新引入跨产品兼容层；
- 保留 Cat Cafe 已证明的通用引擎能力与历史计划证据。不得因当前 consumer 数量减少删除 Event Pool、Content
  Database、rollback、audio、Motion、WholeCanvas、low-level Scene 或其他已接受能力；
- 删除 VN 自身只服务 milestone 的临时 fixture、A/B harness 和报告脚手架，保留长期产品 tests、raw benchmark、
  authoring docs 与发布所需材料。

M5 可以在 Bookshop 仍维护时关闭；后续评审若决定退役，必须在独立原子清理中处理 package、tests、workspace/
site wiring 与 live docs，不留下“已退休但仍维护 route”的半个示例。

**M5 关闭记录（2026-08-29）：** VN Reference Tour 已成为维护中的旗舰 Reference Product。当前状态文档、
产品 metadata、workspace/build/deploy 接线与网站/示例入口同步切换；既有 `project.config.ts`、Deno workspace、
TypeScript references 与 lockfile 在 M5 前已经包含该包，经核实无需制造无意义 churn。Bookshop 保持 maintained
minimal Narrative example，后续教学角色由独立 owner review 裁决。Cat Cafe 的历史终止保持不变。M5 只建立
并验证静态发布接线，不声称已经执行 GitHub Pages、Cloudflare Workers 或其他远程 live deployment。

## 5. 验收、引擎缺口与停止条件

实现优先消费当前能力。产品本地代码不能完成以下事项时，先用最小 fixture 复现，再考虑 focused engine
correction：

- supported exports 无法表达 §1 的 VN 行为或唯一 State/Stage/Narrative authority；
- Authoring Scene/Inspector 无法完成已声明的人类/Agent author task；
- Save/currentness/rollback/audio/i18n 在可达产品路径上违反既有合同；
- measured hot path 或 initial graph 无法达到冻结的产品预算，且问题可在中立 fixture 重现。

以下不是引擎缺口：产品品牌主题与媒体/文案质量、角色表、剧情拆分、私有 helper shape、一个产品想要的存档
缩略图、未选择的特殊互动，或作者希望把普通 TypeScript 全部变成表单。显式选择的 focused default VN
Player preset 若缺少其已声明的默认 UI/交互/输入政策，则是引擎缺口；这不使产品特殊 surface 成为引擎责任。

只有 public/wire/Save/digest/replay compatibility、唯一 writable authority、CAS/atomicity 或许可边界变化时
暂停请求所有者裁决。Cat Cafe revision-1 Save 责任已经随产品终止，不是本计划的开放问题。其他内部选择采用
最简单可验证方案继续。任何 focused correction 都不授权 Ren'Py DSL/Save compatibility、custom interpreter、
broad VN framework、Blueprint、最终编辑器、public Mod ABI、Desktop HMR 合同改造或 Desktop
production promotion。
