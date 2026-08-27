# VN Reference Tour 实施计划

状态：**2026-08-27 经所有者接受，当前唯一活动 Reference Product；M0–M1 已交付，M2 进行中。第一版
引擎维护的 focused default VN Player preset、say-only 全画布推进、贴底布局与 Ctrl/Tab/H 输入已由 Template
和本产品共同选择并可试玩；最终 Stage 视觉、结局 surface 与 Player/Inspector 共用媒体链已经接入，
冻结的八项音频、current-voice replay 与 voice-aware Auto 也已接入；interaction-level Back/Forward、
PageUp/PageDown 与滚轮导航现已接入。完整产品矩阵仍未关闭，当前 WIP 不是产品完成证据或旗舰。**

[Production-floor sequence](2026-07-30-production-floor-sequence.md) 是唯一跨计划排序入口。本计划同时拥有
产品分母、实现顺序、证据门槛与旗舰提升条件；Bookshop 的后续教学角色不由本计划预裁。它不是 broad engine
lane，也不激活 Ren'Py DSL、Ren'Py Save 兼容、自定义剧本解释器或最终编辑器。

Cat Cafe 已在本计划开始前独立终止；它的应用、revision-1 Save 支持、产品 E2E 与 live 发布责任同步结束，
不转移或迁移到本产品。VN 开发期间没有当前旗舰。Bookshop 继续作为 maintained minimal Narrative example，
但不是旗舰或完整 VN 产品参考；它的教学角色只在本产品完成后另行评审并显式裁决，不在本计划自动删除。
预期完成后的 maintained product examples 是 SillyOS + VN。此前 Electronic Pet Reference Product 已停止且
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

- 一段任一路线首次游玩约 10–14 分钟、共 59 条唯一可见对白/旁白/选项文案（任一路线 44 条）的完整原创短篇；
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
- wide/narrow 响应式构图、鼠标/触控/键盘、200% zoom/reflow、reduced motion、无障碍焦点与默认静音测试；
- Browser 独立 build/publish 与当前 Deno Desktop static preview。Desktop HMR、durability 与 production
  packaging promotion 仍由各自条件车道决定。

完整意味着两条路线、两个结局、全部素材、系统界面和恢复路径都可达且经过验证。一个开场、一个 route、
一次 choice 或一个漂亮 vertical slice 都不能代表完成。

## 2. 选择的能力与明确排除项

### 2.1 本产品消费的推荐能力

- `@sillymaker/base/story` 的 current author-facing aliases，以及 Story-owned typed State、semantic
  preview/dispatch、Snapshot、Save/replay 与 transaction rules；
- pure-data interaction document：`say`、`choice`、`branch`、`stage`、`hold`、`end`，由产品本地复制的
  Template kit 编译；这仍是普通 TypeScript 数据，不是新语言或 runtime；
- 显式选择引擎维护的 focused default VN Player preset 作为唯一 `defineNarrativeSurfaceV1` writer；一个
  Semantic Stage owner 与一个 `WebGameApplicationV1`；renderer 只消费 read-only pending/history/player
  view 并调用 occurrence-fenced actions，generic GameRoot 不隐式安装 preset；
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
Database、meta gallery、Narrative/Scene units、Code Surface、Mod Runtime、Agent/RPC、DevDock、Runtime
Inspector 或 Desktop HMR。package-owned Splash/Title 使用 WholeCanvas 基础设施，不等于产品定义了第二个
WholeCanvas surface。

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
《最后一次试音》的 59-entry / 2-route / 2-ending 产品分母、作者 authority、预算、平台与非目标，并注册
application/config/typecheck/project command/asset/determinism/public-import 检查。M0 保留 Narrative + Stage、
Authoring Scene/Inspector/Flow 与 locale-addressable content 的推荐外壳，删除 inventory/coins、HUD action、
reference-only outer UI、hold-when 和只保护这些未选择路径的测试；没有修改引擎、保留兼容 alias 或复制其他
example。focused tests、`app check`、临时 `scaffold` simulation、Browser product build、asset/determinism checks
与 repository check 通过。临时 Template 故事/Scene/media 仅证明接线，M1 必须用完整产品 author data 原子替换，
不得把它计入 semantic coverage。

### M1 — 完整剧本、场景与作者数据

状态：**2026-08-27 已交付。M2 进行中。**

- 写完并注册全部 59 条文案、二选一、两条 route 与两个 ending；先用 compatible placeholder media 也必须
  保持完整内容 breadth，不以单 route 关闭；
- 建立两个 Authoring Scene、角色 appearance、scene cue、Motion/ambient/frame 与 transition bindings；
- 完成 narrative graph lint/prediction、两条 named simulation 与全部 source/reference diagnostics；
- Inspector 能打开两个 Authoring Scene，选择真实对象，编辑 transform/content/appearance/order，并只读查看
  Motion/interaction/source facets；
- M1 关闭只代表完整 author data/headless routes，不代表 Player、媒体或产品完成。

关闭记录：M1 原子替换了 M0 的临时 Story/Scene 内容，交付 59 个唯一可见 text entries（shared 29、archive
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

状态：**进行中。**

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
asset check 与 Chromium/WebKit E2E 覆盖该切片；volume/mute settings 仍属于 M3，默认静音验收属于 M4，
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

### M3 — 产品入口、Save/recovery 与设置

- 完成 Splash/Title、New/Continue/Load/Settings、return-to-title/restart；`resumeFromAutosave` 使 Continue 语义真实；
- 完成 quick/manual Save/load、import/export、autosave flush、mid-line/mid-choice/mid-hold reopen 与 rollback；
- 完成 locale、text speed、auto wait、music/ambient/SFX/voice volume、mute 与产品需要的最小设置；
- closing/hidden/reload/restart 后 Stage、Narrative、continuous audio、History、hold remainder 与 current route 恢复
  到同一可观察语义；
- 不增加存档截图、兼容框架或跨产品 Save migration，除非真实产品验收另行接受。

### M4 — 作者任务、产品证据与 Starter feedback

- 一名人类从 Inspector 微调场景构图/appearance/Motion reference，一名 Agent 使用同一 source、diagnostics、
  structured operation/CAS 路径完成修改；人类随后继续审查、undo/redo 与保存；
- focused tests、两条 simulate、`app check`、Chromium/WebKit 产品 E2E、build/prebuilt smoke、Deno Desktop static
  preview、accessibility 与默认静音测试全部通过；修改 React/TSX 时运行项目约定的 React Doctor advisory audit；
- 记录 startup/first interactive、initial JS/CSS/assets、关键交互 Long Tasks、frame time 与 heap 的 raw
  measurement；阈值只来自本产品预算，不做跨项目 promotion 排名；
- 独立 product review 对照 semantic coverage table 逐项确认早期、中段、分支、结局、恢复和作者任务；独立
  engine review 将发现分成产品 bug、文档/Starter 改进、可复现中立 engine gap 与明确非目标；
- 只有被 Template 与本产品共同证明的通用 starter 改进才反馈到 Template；focused default VN Player preset
  由引擎维护，产品主题、故事、媒体和特殊规则留在本地。

### M5 — 旗舰提升与文档收口（Bookshop 保持）

M5 只有在 M0–M4 全部关闭、完整产品独立审查通过后才开始，并在一个原子 cutover 中：

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
broad VN framework、Blueprint、最终编辑器、public Mod ABI 或 Desktop HMR activation。
