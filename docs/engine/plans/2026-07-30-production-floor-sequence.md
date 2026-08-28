# Production-floor execution sequence

状态：持续维护的唯一跨计划排序入口；最近排序修订 2026-08-27。PF0–PF7 与 Complexity
Reset 的 CR0、CR1、CR2.1–CR2.5、CR3、CR4 已于 2026-08-13 完成。CR4 的真实作者纵切没有
暴露需要通用 PF6 harness 解决的问题，PF6 已重新裁决为
不激活。同日以真实产品证据接受并完成了
[Authorable Motion Workbench](2026-08-13-authorable-motion-workbench.md)（M1–M5：
motion 资产地板、点击反查溯源、Motion Workbench 编辑闭环、预览捕获/preview case、
协作护栏；外部实验仓的 12 步痛点闭环实测走通）。2026-08-14 以新的真实产品证据
（孤立数字 Workbench 仍无法支撑基本场景修改）接受并于 2026-08-15 完成
[VN Scene Workspace V1](2026-08-14-vn-scene-workspace.md)；目标合同见
[场景创作模型与 SillyMaker Studio 设计](../design/scene-authoring-and-studio.md)。
2026-08-15 以 A5 两轮基准与实验仓真实内容迁移证据及所有者角色决定（常态为试玩与 bug
汇报，日常修改由 Agent 与 Studio 完成）接受
[Authoring Architecture V1](2026-08-15-authoring-architecture.md)，并于同日完成
S0–S5；目标合同见[统一创作架构设计](../design/authoring-architecture.md)。

本文是唯一跨计划排序入口。§1 首段独占 current/next authority；其后的 dated recap 只保存这次
合并吸收的已关闭证据，不形成并列顺序或可领取 backlog。旧版逐提交 delivery ledger 已退出
active authority；完成里程碑摘要在
[roadmap archive](../roadmap-archive.md)，更细的历史仍由 Git 保留。

## 1. Current and next

2026-08-27 所有者接受
[VN Reference Tour](2026-08-27-vn-reference-tour.md) 已完成 M0–M5，并作为维护中的旗舰 Reference Product。它从实现开始时
tracked Template 起步，交付一个原创、完整、紧凑、可发布的 VN，以两名角色、两个 Authoring Scene、一个
真实选择、两条路线、两个结局和完整 Player/Save/audio/i18n/Inspector/author-task 分母验证当前推荐路径；
它不是全引擎 API 展厅，也不建立 Ren'Py DSL、Save 兼容或自定义解释器。M0–M3 已交付并关闭：独立 package、
当时冻结的双路线 author/headless breadth、两个 Authoring Scene、named simulations、引擎维护的 focused
default VN Player、最终媒体/音频与产品矩阵，以及产品入口、Save/recovery、Settings/live locale 和分层恢复
证据均已落地。M4 的 Agent 与所有者授权 participant 已通过同一 Inspector/CAS 路径完成接手，
workstation 自动化证据也已交付。独立审查发现历史 59 unique / 44 per route 虽满足计数却不能支撑冻结的
10–14 分钟阅读分母，当前候选已修正为 110 unique / 82 per route，并按最小视口分页。独立 engine review 与
Starter feedback classification 已完成：没有新的中立 engine gap，也不需要追加 Template 改动。独立 product
re-review 也已通过且没有 product-integrity blocker。2026-08-29 所有者因没有合适设备，取消代表性真实
current-low-end qualification 作为本产品完成门槛；该资格未执行、未通过，也不形成低端设备支持声明。M4
按缩减后的接受范围关闭，M5 已完成 current docs、产品 metadata 与 workspace/build/deploy/site 接线的原子切换；
这不声称已经执行远程 live deployment。Cat Cafe 已在本轮开始前独立终止：应用、
revision-1 Save 支持、产品 E2E 与 live 发布责任
同步结束，不迁移到 VN，也不保留 compatibility wrapper。Bookshop 继续承担 maintained minimal Narrative
example，不是旗舰或完整 VN 产品参考；它的教学角色在 VN 完成后另行评审和显式裁决，M5 没有自动删除。
维护的产品例子是 SillyOS + VN。Desktop production promotion 保持独立，只 gate 对应 production claim，
不阻塞本产品。

同日 Electronic Pet Reference Product 由所有者停止，未完成产品分母或接替 Cat Cafe。其
[实施计划](2026-08-27-electronic-pet-reference-product.md) 与
[产品合同](../../game/electronic-pet.md) 已转为历史：M0–M2 与已提交的 M3 产品切片仍是当时真实实现证据，
但剩余 M3、M4、M5 不再交付，也不能把纵向切片称为完整产品。额外 WIP 只保存在
`codex/archive-electronic-pet-m3-wip`（`a4a3ab9a`），不属于当前工作树、活动产品或后续实现 authority。

2026-08-26 所有者接受并于同日交付关闭
[Neutral GUI Host Readiness、Close 与 Optional Desktop Companion V1](2026-08-26-neutral-gui-host-readiness-close-companion.md)
。M0 交付中性 GUI required-readiness latch + product-selected close
participant，M1 package-private/explicit/最多一个的 Desktop product companion preview，M2
交付 tooling-owned neutral conformance/final-graph evidence/live-doc handoff。Browser external-service interop、
static Deno Desktop preview 与当时等待 verified stable 的 Desktop HMR revalidation 是三条正交路径；
本车道不激活 public subprocess/companion/Agent/Mod ABI、registry、进程扫描、Pi/SillyOS fixture、
Desktop production 或 maintained HMR。HMR stable activation 后来于 2026-08-28 独立关闭，没有回写
本车道 scope。该 closure 没有自动激活后继；电子宠物是所有者在次日另行接受的产品车道。

2026-08-27 另行交付关闭 [Narrative Aside V1](2026-08-27-narrative-aside.md)（提案
[narrative-aside](../proposals/narrative-aside.md)）：Base 提供 typed、zero-authority、commit-only 的
aside page push channel，UI 提供只负责本地翻页、权威对话到达时强制退出和 pending 时丢弃新页的控制器，
Story 保持像素所有权；Engine Lab 的 jsdom 与真实指针 evidence 覆盖 hold 运行中插话、分页、`when`
改道退出和零语义 dispatch。Aside 不进入 State、Save、digest、replay 或 History，也不改变 pending、hold
算术、resolution legality 或 stage-input policy。

2026-08-19 至 2026-08-22 的六条 engine-gap lane 全部交付关闭后，恢复并完成
2026-08-18 所有者以新产品方向证据接受的
[Application Runtime and Embedded Authoring V1](2026-08-18-application-runtime-embedded-authoring.md)
作为本轮默认/core lane。AR0 startup/dependency baseline 已于 2026-08-22 交付关闭：中性 Host、
admitted/frozen GUI bootstrap、runtime/author 静态 shell 与 readiness/recovery signals、final
output contribution attribution，以及 Browser/Deno Desktop 当前 R0–R3 差异均已有 bounded
evidence；它没有宣称 native Desktop launch、Desktop persistence/signing promotion 或 RPC
readiness。AR1 progressive activation 与 private extension-runtime selection 也已于
2026-08-22 交付关闭：Direct 与 Cordis-core-derived backend 的同一 17-case suite 均通过，最终只
保留 SillyMaker-owned Direct backend；lazy DevDock 与 Studio Flow 是两个真实 GUI consumer。
AR2 structured Scene operations 也已于 2026-08-22 交付：Scene UI 与 non-UI caller 现在共用
package-private strict operation、pure reducer、opaque document-successor identity、monotonic draft
revision、atomic stale rejection 和既有 session/history/CAS authority。AR3 embeddable Authoring
Host/stable sibling 同日交付：standalone 与 dev-only embedded shell 共用同一 private Host/
workspace/session factory，persistent-visible R1 先经 inert/offscreen connected staging，Engine Lab
真实 Scene/Studio binding 的 Browser R2 在零 page load 下换代 Game/Session 并保留 Authoring
Host，ordinary release 排除 authoring/real dev-source graph；macOS/Deno 2.9.5 原生 common runtime
也已证明 GUI ready、同窗口 Game/Session restart 与 close-flush/正常退出，但 native Desktop
author/source-write/R0–R2、packaged artifact、多平台与 durability 仍 defer。AR4 experimental Agent
RPC/UiArtifact seam 也已于 2026-08-22 交付关闭；AR5 已完成 neutral single-companion split、完整
Author graph 的 Agent structural exclusion、Browser physical R1/R2/held-Agent lifetime 与 local
performance evidence。AR5 Deno Desktop canary gate 也已于 2026-08-23 完成：显式选择的隔离 official
canary 报告 `98dc759`，参与者将其对应到 Deno PR #36488 merge
`98dc759254a90b98f7bbb62ba5361e531d0db6a5`；最终形状的 package-private/default-off candidate、
既有中立合同 tests、约数百行内且只记录该人工选择并核对 binary 报告的七位 revision、使用隔离目录/
真实 workspace command/direct-child exit-0 的 launch preflight，以及一次人工
native ready/bootstrap/private-route/HMR 无 reload/正常关闭 characterization 全部通过；preflight
没有 renderer receipt、probe、report 或 durable evidence。首次 `shell-ui.tsx` 检查暴露的 mixed
component/registry export 已通过模块边界拆分修复，并由 Chromium/WebKit/native 正反向 HMR 证明状态与
overlay 保留。AR5 因而于 2026-08-23 交付关闭；该 closure 明确不包含 live/maintained Desktop HMR
或 Desktop production promotion。AR6 closure 与 owner checkpoint 也已于同日完成：被替代的
lifecycle/publication/promotion scaffolding 已删除，Direct 选择与 no-extension evidence 保留，live
文档和未满足边界已同步。Application Runtime AR0–AR6 至此关闭。2026-08-23 所有者指示继续下一项
引擎工作；live Host/consumer 复查选择并于同日交付关闭
[Authoring Workspace Focus & Navigation V1](2026-08-23-authoring-workspace-focus-navigation.md)
：已有 closed manifest 的五个纵向 section 已收口为 Host-owned focus、accessible rail 与
单一可见 workspace，保持 standalone/embedded、dirty session、progressive Flow 与 Authoring R1
连续性。它没有建设 IDE/WindowManager/plugin registry，也没有等待或启用 Desktop HMR。普通 Browser
产品 R2 在排序审计中暴露了 authoritative Snapshot continuity 缺口：现有 rebootstrap disposition
只移交 persistence lease，successor 还会跳过 autosave resume，并且 takeover/read-only 与失败重试的
fence currentness 没有成为 publication gate。所有者于 2026-08-23 接受
[Browser R2 Authoritative State Handoff V1](2026-08-23-browser-r2-authoritative-state-handoff.md)
作为当时唯一 engine lane。M0–M3 已于同日交付 exact Save + lease handoff、writable takeover、
stale-fence fail-closed retry、Base/Core 与 Web lifecycle 合同，以及 Engine Lab 和 Cat Cafe 的
forward/reverse Chromium/WebKit product evidence。两个消费者都以真实 Save 导出证明权威进度连续、
一次源码更新只换代一次 Game epoch 且零 page reload；该计划现已关闭。不得由本车道派生 Desktop
activation。2026-08-24 所有者随后接受并开启
[Scale、Scene/Object 与模块化 GUI V1](2026-08-24-scale-scene-object-modular-gui.md)
作为当时唯一 engine lane；目标合同见
[Scale, Scene Object, and Modular GUI](../proposals/scale-scene-object-and-modular-gui.md)。它用仓内
中性生成 workload 先解决大文本/多模块/authoring index 的规模风险，建立编译到现有 Stage/Timeline
runtime 的第一阶 Authoring Scene object hierarchy，重新划分 core/player/devtools/authoring，并以
Inspector-first surface 替换当前 Studio 产品外形。现有 Authoring Host、document session、CAS、
structured operations 与 source IO substrate 保留；旧 workspace shell 在 replacement parity 后同轮
删除。本车道不激活 State Format V2、ECS、最终 Blueprint/Timeline editor、public Mod ABI 或 Desktop
HMR。M0 已于 2026-08-24 以四条独立的 content/bundle/State/index workload 交付 pre-change baseline；
没有聚合 runner、机器阈值或提前的产品实现。结果确认四类风险来自静态 content 构造、initial graph
reachability、full-module dispatch/whole-State 工作和重复 index scan。M1 static content plane 与
initial-bundle separation 也已于同日交付：build-known text packs 与 tooling-only Flow/source 已离开
ordinary Player initial graph 和 Snapshot/Save，Web 通过单一 semantic-invocation/Snapshot-replacement
readiness boundary 按候选需求准备内容。M2 State hot plan 与 single-owner incremental project index
也已于 2026-08-24 交付：cold reducer direct plan/touched-only State materialization 与一个 lazy、
metadata-only、path-incremental dev-server authoring index 满足结构预算。M3 也已于 2026-08-24 交付：
core Player 不再反向 import
DevDock/preset settings/Inspector/Agent，focused reference subpaths 与真实 final-output receipts 证明
显式选择和结构排除。M4 Scene/Object/Layer 也已于 2026-08-24 交付：one-pass admitted Authoring Scene
IR/compiler 输出既有低层 runtime plan 与独立 inspection/source-map facets；Story 显式选择
`authoring_scene`/`low_level_scene` authority，普通 Stage mutation + exact-rebootstrap Session command
协调 Browser R2 successor 的 layer/z 顺序而不替换 adopted Snapshot。增量 index 的
1,000-scene/50,000-object profile 保持 metadata-only 与单文件失效。本车道没有启用 Desktop HMR。
2026-08-24 所有者在 M5 实现提交前暂停该里程碑并插入的独立 runtime-boundary
Complexity Reset 已交付：Snapshot/Semantic 整树冻结、Bootstrap/Command/Evidence 的重复 admission/
handoff/descriptor 防御、只保护实现形状的测试、dead BuildIdentity consumer 与本地 attestation
tooling 已删除；schema、digest、Save/replay、CAS、generation/currentness 与 RPC 边界保留。公开能力
审计与 repository-wide trust/performance reset 通过后，M5 于 2026-08-25 恢复并交付 Inspector-first
clean replacement：同一 Authoring Host/session/CAS/R1 substrate 现在服务 virtualized Scene/object
navigation、真实 Stage preview、场外/透明 ghost、有限属性/顺序编辑和只读 Motion/Timeline/intent/source
facets；旧 Studio route、五 workspace、bindings 与 UI-only tests 同轮删除。Scale / Scene Object /
Modular GUI M0–M5 因而关闭。

2026-08-25 所有者随后接受
[Scalable Authoring, Addressable Runtime, and Mods V1](2026-08-25-scalable-authoring-addressable-runtime-and-mods.md)
作为当时唯一 engine lane；目标合同见
[Scalable Authoring, Addressable Runtime, and Mods V1](../proposals/scalable-authoring-addressable-runtime-and-mods.md)。
顺序为 M0 capacity contract reset → M1 orthogonal GUI composition/Code Surface → M2 addressable
Scene/Narrative/GUI/code/content units → M3 Runtime Inspector facets → M4 locale-addressable i18n → M5
private build-known application-local Mod Runtime。M0–M5 已于 2026-08-25 交付并关闭。M2 以
type-specific lease owners、一个 application-owned Web readiness
seam 与 Engine Lab opening/drill/query-only GUI 路径交付按需边界；没有通用 loader、LRU、prefetcher、
Worker pool 或 current-only eviction claim。它以小型原创/生成 conformance 和既有 raw benchmark
验收。M3 以 application-owned read-only projection、unsubscribed O(1) publication、per-pack Text
observation、virtualized Runtime Inspector 和 Code Surface inspection/lifecycle facet 交付可观察性；standalone
明确 detached，embedded 才观察 live owner。它不把第三方 React 组件、fake Agent conversation、商业内容
或 SillyOS 变成本轮 fixture；SillyOS
重做现在可以作为独立的下一轮综合产品验证，但尚未自动开启。M4 在同一 Text session 上交付 locale
variants、fallback、atomic preference activation 与 active-only physical residency；M5 只交付 private、
build-known、immutable-per-generation 的 application-local Mod composition，复用既有 Direct lifecycle
并由应用把 active identity 接入既有 BuildIdentity。它没有激活 public resolver/ABI/SDK/distribution、
post-release arbitrary code、untrusted sandbox 或 live hot install。2026-08-25 所有者随后接受
[Adaptive Viewport & Layout Variants V1](2026-08-25-adaptive-viewport-layout-variants.md) 作为下一条有界
engine lane，并于同日交付关闭：在既有单一 logical-canvas owner 上补齐 `expand-height` /
`expand-width`、container-size 声明式 layout variants、authored Stage origin 与中立 Browser
conformance；没有激活 continuous Input、renderer/asset framework、Desktop HMR 或设备 profile。
所有者随后显式选择并于同日完成
[Cards Reference Application](2026-08-25-cards-reference-application.md)：PocketJS Cards 0.6.0 的完整分母、
target uplift、中性 GUI-only Host/config、focused final graph、产品预算、独立审查与 Starter feedback 均已
关闭，只领取了真实 consumer 暴露的窄 engine correction。2026-08-26 官网 Console 与小型 GUI-only
conformance fixture 分别接替可见产品展示和 Host/final-graph 证明后，Cards 产品退役；历史 closure 保留。
Cards closure 没有自动激活下一 engine lane 或 Reference Product，其 product/engine review 不自动形成
backlog；所有者随后于 2026-08-27 另行接受电子宠物产品车道。2026-08-26 从平行商业克隆暴露的
真实指针缺口吸收并同日关闭
[Shared Stage Input V1](2026-08-26-shared-stage-input.md)（提案
[shared-stage-input](../proposals/shared-stage-input.md)）：`say`/`choice`/`hold`/`custom` pending 可声明
`stageInput: "shared"`，Narrative Host 仅放开既有 Stage 输入隔离与焦点独占，应用仍通过同一
occurrence-fenced command 路径路由区域激活。声明值随普通 pending 进入 Save/digest/replay，但不参与
决议、时间算术或 `when`；`game-stage.tsx`、Scene/Region 权威和 Input Router 均未新增分支。Shared
Stage Input 关闭后完成的 Neutral GUI Host slice 见本节开头；其关闭当时没有活动车道，Desktop 持久化仍是
独立晋级门。当前产品车道由本节第一段拥有。
独立 [Desktop HMR stable activation](2026-08-28-deno-desktop-hmr-stable-activation.md) follow-up
已于 2026-08-28 关闭：Deno 2.9.6 release source 收录目标
in-runtime Vite 路径，同一分层的中立 tests、真实 workspace launch、人工同窗 HMR/private-route/
normal-close characterization 全部通过，维护入口为显式 `app desktop-dev <application-id>`。
adapter 保持 package-private，普通入口 default-off；canary-only launcher/test 已删除。该关闭没有重开
AR5/AR6，也不改变 static R3/packaging、public Deno `>=2.9.0` floor、latest-stable required CI 或
Desktop production qualification。目标合同见
[Application Runtime and Embedded Authoring](../design/application-runtime-and-embedded-authoring.md)。
Browser 与 Deno Desktop 是当前 GUI product targets；CLI 只提供 Desktop startup config，
headless 只作开发/测试辅助，外部后台与 LLM 统一经 RPC。AR1 没有激活 public Cordis API、Mod
ABI、runtime code installation、State Format V2、Effect Broker、具体 OpenUI/A2UI adapter 或
production Story State migration；Cordis adapter/vendor/dependency 已删除。ordinary no-extension
静态游戏 release 仍不得包含 author/source-write、selected Direct extension runtime 或 RPC
implementation。Workspace Focus 与 Browser R2 authoritative handoff 都已关闭；作品/examples/产品
验证不会自动激活 engine backlog。Deno Desktop stable activation 已关闭，不占用或阻塞当前 VN
产品车道；Desktop persistence/package/signing 与 authoring R0–R2 仍须单独领取。

更早一条已关闭的能力车道（不形成 active/next）：
[Authorable Chrome Layout V1](2026-08-22-authorable-chrome-layout.md)
（提案
[authorable-chrome-layout](../proposals/authorable-chrome-layout.md)，
2026-08-22 所有者裁决接受，q1–q3 全按建议；定性务实 V1，非场景/物
体/交互统一抽象的终局裁决，下一轮引擎迭代再统筹）——把 chrome/HUD
几何从代码常量迁成 Story 拥有的零权威布局文档，Studio 可视编辑。
**同日 M0–M2 + 双消费者全部交付收口**：M0（实验仓 Story 侧
`hud-layout.json` + 本地解析器先行，零引擎改动）→ M1
（`sillymaker.chrome-layout` 第四文档族：boxes/anchors/offsets 逻辑
画布整数、严格入院、authoring index、story check lint、dev-server
CAS 端口）→ M2（Studio 界面布局工作区：框/锚点拖拽缩放、offsets 检
查器、共享文档会话 + CAS 毕业 `human_tuned`；`StudioBindingV1.chrome`
Story 声明 fixture 崩溃隔离渲染真组件，缺 fixture 落线框；template
HUD 状态条运行时读 `src/chrome/hud.chrome-layout.json`，浏览器验收
= template.spec.ts 拖框→保存→落盘）→ 双消费者（template 仓内 +
实验仓 HUD 同日迁引擎家族删本地解析器，全量 vitest 绿）。M3（意图
绑定 widget 层）按证据门保持未开；行为布尔与合法性留 Story 代码。

更早一条：[Mid-hold Input V1](2026-08-22-mid-hold-input.md)（提案
[mid-hold-input](../proposals/mid-hold-input.md)，2026-08-22 所有者
裁决接受，q1–q3 全按建议：组合而非原语、围栏留 Story 惯例、清除留
Story 纪律）——认领 hold `when` 唯一输入轴 defer。零新引擎原语：
勘探证实基座 dispatch 无 pending 门，输入轴 = 已交付合同的声明式组
合（热区激活 → 应用路由 → `expectedHoldOccurrenceId` 围栏的普通写
命令 → 该 hold 自身 `when` 臂下一围栏结算 t=0 读到并改道）。**同日
M0–M1 全部交付收口**：M0（Engine Lab `lab.engage_collector` 围栏写

- 绊线臂，五条测试锁：写不动 hold、下一结算 t=0 切、批切不变、
  stale 整拒、中持有 save/load 存活仍切；features / story-authoring
  模式段）→ M1（实验仓 CE18 条中途嘴区活路径，克隆刀 #326：解码证实
  原作热区点击是并发状态写入者、CE281 臂入场闩定不切分支、改道权全在
  CE20 看门狗——`imouto.zone_press` 围栏写复用既有 `inspect-kiss` 效果
  对，+5 分钟推过 2:00 由 bar 自身 `when` 臂下次结算 t=0 超时切断；克
  隆 723 例全绿，NOTES / fidelity-gaps E3 / capability-backlog /
  AGENTS 四处台账收口）。其余身体热区是逐区内容刀，不再经引擎车道。

再前一条：[Hold When V1](2026-08-21-hold-when.md)（提案
[hold-when](../proposals/hold-when.md)，2026-08-21 所有者下令开启）
——认领权威持有钟 M3 唯一显式 defer：hold 块声明条件改道。**同日
M0–M2 全部交付收口**：M0（base `settleHoldTimelineV1` occurrence 时
间线步进：t=0 + 每个自身穿越后评臂，首中截断、消耗到命中瞬间、其后
穿越不应用、截断余量不预折改道目标；skip 同规则不能越过截断点；入
场按事务内工作状态也评一次；合同测试锁批切不变与中持有 Save/load；
template kit `when` 臂 + starter hurry 演示）→ M1（Engine Lab 锁两
种粒度：vigil 自身 tick 同瞬间截断、stakeout 监视器写真下一围栏结
算 t=0 零耗时改道；lint 图臂后继在到期边之前）→ M2（实验仓第一条真
中止活路径——深夜房 CE281 触摸条三段 bar 挂 `shinyaException >= 2`
臂，`touch-tick` 与左手监视器折叠同 commit 重算例外缓存，左手越格
压深度过觉醒线时该结算 t=0 切断，实验仓刀 #325 全库 720 例全绿；
features / story-authoring / AGENTS 收口）。显式 defer：hold 中热区
（输入轴，2026-08-22 由 mid-hold-input 关闭）、第二条真中止路径
（警戒抓包，2026-08-22 实验仓刀 #339 证伪——CE249 窗尽 / WAIT 100
后再问，不是条中途 `when`）、监视器路由叙事（仍禁）、`when` 臂
Studio 可视化编辑。

再前一条：[命中区形状车道](2026-08-21-shaped-hit-regions.md)（提案
[shaped-hit-regions](../proposals/shaped-hit-regions.md) 2026-08-21 所有
者接受）——**同日 M0–M5 全部交付收口**：M0（`polygonPoints` +
`hoverAssetId` 合同与共享判定，投影降级诊断）→ M1（host clip-path 命
中 + 兄弟焦点环 + hover/focus 显示层走 `assets` 口）→ M2
（`sillymaker.regions` 第三文档族：严格入院、authoring index、story
check lint、dev-server CAS 端口）→ M3（Studio Regions 工作区：真实
host 渲染当画布，框/顶点/矩形⇄多边形编辑走共享文档会话）→ M4
（`story regions trace` 位图剪影→多边形文档 devtool，严格最小 PNG
alpha 解码器 + marching-squares + 预算内 Douglas–Peucker）→ M5 双消费
者（仓内：Engine Lab 样本箱八边形采集口——regions 文档 + hover 辉光 +
激活派发普通语义采集；外部实验仓：三姿势夜床身体热区——判定图证据为
全不透明 1-bit 矩形、原作热区即摆放矩形，矩形 ∩ 身体剪影裁边为原生改
良，激活决议隐藏 zone 选项、合法性/重放全在叙事引擎；顺带把 trace 解
码器的 1/2/4 位调色板 PNG 收为一等）。唯一显式 defer：「一次点击同时
激活多重叠区域」的激活载荷形态，等被审计的真实消费者（V1 合同为最上
层独占命中）。

更前一条：[帧集提案](../proposals/authorable-frame-set.md)
（2026-08-21 所有者接受；帧集先行、命中区形状第二的车道顺序随裁决确
定）与 [Authorable Frame Set V1](2026-08-21-authorable-frame-set.md)——
**同日 M0–M3 全部交付收口**：M0（motion 文档 `frame` 通道：阶梯采样、
easing 入院拒绝、`MotionSampleV1.frameIndex`）→ M1（内容侧
`frameAssetIds` 帧表 + 预载并入 + 舞台 host 每帧下发 `frameIndex`，一
次性/ambient 双路径与钳制）→ M2（Workbench 帧轨道编辑，缓动下拉换阶梯
标签）→ M3（消费者：Engine Lab 信标两帧循环 + 入场步伐一次性、
template 用 opening 场景文档声明 Mei 眨眼、外部实验仓把 CE240 眨眼从
renderer CSS 换成 ambient 帧轨道并把 5 条 SHOW_PIC→WAIT 帧串换成一次
性 motion 文档）。唯一显式 defer：跨文档「帧下标不超帧表」story
lint，等内容声明数据化的真实车道（运行时钳制 + Workbench 预览兜底）。

更早：[并行监视器提案](../proposals/parallel-monitors.md)
（2026-08-20 所有者接受，含同日六项裁决与裁决 #5 修订）与
[Parallel Monitors V1](2026-08-20-parallel-monitors.md)——**同日 M0–M5
全部交付收口**：M0（唯一时间动词 `TimeTickV1`，`hold_tick` 归并删除）
→ M1（领域事件 + reducer，注册效果命令家族全量迁移删除）→ M2（权威监
视器 V1，`retain`/清零双策略）→ M3（持久化安全点与在途段 + autosave
抑制，引擎能力先行、持久化编排器为内部消费者）→ M4（三型消费者各一条
活路径 + `pace` 提示 + Host 报时/钉回环）→ M5（收尾扫描）。车道纪律按
所有者要求执行：每个里程碑独立 review 后提交；收尾统一扫描死代码、过
时文档、未迁移实现与正交性/单向数据流/依赖最佳实践（交付记录见该计
划）。Desktop persistence 仍是独立 promotion gate（安全点合同先行不改
变该门）。

前一波：[Ambient Loop Motion V1](2026-08-15-ambient-loop-motion.md) 的 M0–M3 已
于 2026-08-15 当日交付（表现侧循环运行时、Scene 文档 `ambient` admission、创作
面、双消费者实证；交付记录见该计划）。高密度内容波已在外部实验仓完成
（2026-08-15 开工，2026-08-17 收口：约 65 轮迭代、台词逐字覆盖 99.4%，残余全
部是运行时插值模板字面量与源数据笔误；内容全程引擎零改动）。2026-08-17 证据环收环结论（详见
[Authoring Architecture V1](2026-08-15-authoring-architecture.md) 证据循环）：本
波未产生新的引擎激活项——叙事内动态文本经核实可在既有 narrative surface
`resolveText` 注入合同内由 Story 侧解决（残余插值里 8 行真实功能缺口以实验仓
内容刀落地，不扩 runtime）；appearance 交换循环与文档聚合税维持观察记录。cue
identity 独立设计文档于 2026-08-17 起草、**同日经所有者批复 open questions 后
接受，V1 实现切片同日交付**（[cue-identity 提案](../proposals/cue-identity.md)
持有交付记录与剩余验收：词汇/提交证据投影 seam（8/20 后由 domain events 承载）、
retarget 与 change 的可选
`dispatches`/场景绑定 cue-first 与显式 cut/保守 lint 起点/template 取猫节拍首
个消费者；`deno task check` 与浏览器套件绿，引擎切片通过全量退化等位门）。
**第二消费者验收已于 2026-08-17 完成**：外部实验仓撤销其唯一
裂 tag——第二登场立绘回归共享 tag，show/hide 声明显式 cut，dispatch 链
（叙事节点标注 → committed evidence〔8/20 后迁移为 domain event〕→ 适配器投影 →
composition）全线打通；digest 经 stash
对照逐字节不变，e2e 断言第二登场立绘瞬现。验收回灌两处引擎修正（同日交付）：外场
景 open 不再具备 edge-tuple 回落资格（裁决 #2 澄清为**仅本场景自己的 open**
保持无上下文回落语义，杜绝共享 enter 边被外场景 open 偷走），以及批盖章前移
——`onAttempt`（发布前）暂存当时已提交 facts（8/20 后为 events）、实例作为 semantic port
首个订阅者
在 UI 收到通知前盖章，消除同步 flush React 宿主下 rev N+1 首帧配对失败的竞
态。证据环收口（2026-08-17 同日）：locality 复测第 2 轮达标（新增词汇行
"改 cue 表现 = 1 场景文档编辑点"；接线为每包一次采纳成本，template 起步为
零），cue/dispatch 全内容普查完成（单 commit 峰值 4 条、上限 32 余量 8 倍、
declared-vs-bare 碰撞零出现）；裁决 #3/#4 同日经所有者批复采纳（上限 32
冻结为终值、lint 保守起点转正），**cue identity 线整体收口**，记录归
[cue-identity 提案](../proposals/cue-identity.md)。这轮收口后的新证据于
2026-08-18 到来：所有者以约 67k 行的外部
State-heavy workload、Cordis 参考实现和明确的中立 State Runtime 目标提供了新的架构证据，
接受[Experimental composition kernel and State Runtime](2026-08-18-experimental-composition-state-runtime.md)
为独立分支 strangler experiment。其 X0–X6.3 已完成：X6.2 注入唯一 Narrative integrity
catalog，X6.3 把 concrete registries 收口到 Session 前冻结的 environment/direct plans；实验已通过
唯一权威、Save/replay 等价、dependency locality 与 `<10%` 稳定 command overhead gates。X1
最初使用的 Cordis wrapper 经 retain/remove checkpoint 证明当时的平面 wrapper 没有承担独立
scope/fiber 语义，最终由 package-internal direct lifecycle 取代；该历史结论没有回答 editor
nested ownership/provider recovery 的实现成本，后续 AR1 已用同一 17-case suite 与两个真实 GUI
consumer 完成裁决并选择唯一 Direct backend。X7 的中立
matrix/隔离 GC 与外部 paired 性能证据已完成，
源实验历史保留在 `codex/experimental-cordis-state-runtime`，经验证的最终树由
`codex/promote-composition-state-runtime` 重组为后续主仓开发基线。但这没有激活 State Format
V2、Effect Broker/OpenUI、独立的 i18n/message-catalog lane 或 production Story migration，也不因
实验完成而成为 release blocker。

本轮所有者证据已经激活上述 engine-only lane；未写入该计划的 roadmap 候选仍不能自行领取。
已接受但未完成的 Desktop promotion 是独立、条件性且不阻塞 core 的 lane，仍由 §7 拥有。

补充交付记录（2026-08-19 起草、**同日经所有者接受、同日 M0–M3 全部
交付**）：[权威计时持有](../proposals/authoritative-hold-clock.md) 与
[Authoritative Hold Clock V1](2026-08-19-authoritative-hold-clock.md)。
证据：实验仓可绑该句的 STORY 已收完，剩余 1:1 卡在两句台词之间的
WAIT / 换帧 / 滴权威（实验仓 `docs/fidelity-gaps.md` E1/E2）。切片
M0（base 合同）→ M1（Host 提议 + `pause` 归并删除）→ M2（作者块 +
实验仓消费者）→ M3（`tickQuantumMs` 部分 commit + 阈值穿越滴/换帧，
Lab 与实验仓滴路径双消费者）。唯一显式 defer：hold 块声明条件改道，等
第一条真实中止路径（记录见该计划 §3）。Desktop persistence 仍是独立
promotion gate。

更早的 lane：[Authoring Architecture V1](2026-08-15-authoring-architecture.md)
（Studio 作者信任加固 → 统一创作外壳与共享文档会话 → project authoring index →
Story 包目录 locality → Scene Construction → Flow workspace；目标合同见
[统一创作架构设计](../design/authoring-architecture.md)）。S0–S5 全部切片已于
2026-08-15 交付（S5 的激活门——interaction-table kit 按提案判据升格进
template——同日满足：`roll` 块补齐并被实验仓真实内容使用、提案四问裁决冻结、
template 的 narrative-kit 换成 interaction 文档 kit 且 simulate 逐字节平价；交付
记录见该计划）。其证据循环复测（S2 "新 motion ≤2 文件"、设计 §5 局部性硬指标）
已随 2026-08-15 至 2026-08-17 的实验仓内容波完成。切片验收与 stop conditions 由各计划拥有。
[VN Scene Workspace V1](2026-08-14-vn-scene-workspace.md) 已于
2026-08-15 完成并移交（A3 所有者实测按所有者角色决定重新定标，A5 证据循环由新计
划承接）。

一次只领取一个可命名任务。不得把 S0–S5 合成一次重写，也不得把 CR2.2–CR2.5、CR3、
CR4 或 PF6 合成一次重写。

## 2. Completed production floor

以下能力已经交付，Complexity Reset 不撤销它们：

- Snapshot commit/digest 性能与 authoritative determinism guardrails；
- composition-owned Managed Surface authority，包含 Workspace Overlay、System、
  Narrative/History 与 WholeCanvas；
- stale generation、exact-parent lifecycle、input/focus fencing 与原子 publication；
- Save inspection、bounded backup/recovery、maintained release corpus 与四 runtime
  migration parity；
- Engine Lab 与 Cat Cafe 的真实浏览器、Story、build 与 Save 产品证据。

Authoritative determinism checker 的现有交付范围冻结：除非 authoritative code 暴露可复现
漏报或误报，不继续扩展 syntax proof、diagnostic precedence 或假想 capability escape。
Completeness 不是新增静态证明的理由。

完成不等于内部实现不可简化。CR2 以现有行为测试作为 characterization；它删除防御层，
不改变公开 API、Save/wire 格式、authoritative state、player-visible semantics 或 Story
composition ownership。

CR0/CR1 已把 active authority 收口到本文并固定三档信任模型。CR2.1 已把 runtime
state-install participant 从 WeakMap claim/descriptor authenticity 改为 package-internal
one-shot setter，同时保留 install-generation CAS、reentry stale、atomic abort/commit、terminal
fencing 与 notification/completion 顺序。

CR2.2 已删除 Narrative 的 cached language intrinsic alias 与七组 package-internal captured-port
brand/WeakMap sidecar，改为一次读取 callable、捕获 receiver 的普通 frozen typed record 与 direct
method call；CR2.3 已删除无 production consumer 的 stable private-provenance comparator。两项均未
改变 public/wire/Save 合同，并继续由 currentness、atomicity、terminal teardown 与 listener
ordering 行为测试保护。

CR2.4 已把每个 application epoch 的 composition-owned authority graph 收敛为五字段 typed
bundle，由 Narrative 与 WholeCanvas 直接消费；删除了 aggregate sidecar/slot 的平行副本、family
look-alike matcher 与 composite configuration matcher。Public authoring 仍在边界归一化一次，epoch、
lease、source revision、CAS、readiness、exact-parent 与 late-async fences 保持不变。

CR2.5 在不改变 package export、产品合同或运行时行为的前提下，先把 Narrative family 的
definition/schema 与 History render observation 拆成两个 source-relative 叶模块。Dialogue Player、
History child 与 Physical Action 仍共享 family-private lifecycle records；在出现清晰 registry/facade
边界前不为追求文件尺寸强拆这些 authority clusters。现有 Narrative/session/public-boundary
characterization tests 继续保护 currentness、listener、teardown 与渲染行为。

CR3 已增加三条独立、trend-only 的真实性能入口：Stable publication 以 1/4/16 targets、
small/medium parameters 与 initial/equal-noop/one-change/all-change/empty 组成 30-row
matrix；prebuilt Chromium 对 fresh-context cold start、Narrative、WholeCanvas、retained heap
与 sampled transition allocations 重复三次；release build 按 entry/preload/lazy、all JS/CSS 与
runtime assets 报 raw/gzip bytes。报告默认只写 OS temp/artifact，记录 HEAD/dirty 与实际运行
环境，不进入普通 CI hard gate。首份 Engine Lab release build 的最大 entry 为 922,550 raw /
214,643 gzip bytes；它是待观察的产品趋势，不是新兼容阈值或 CR4 blocker。

CR4 已在 Cat Cafe DevDock 交付 Story-local detached Narrative/Stage preview。工具从真实 10
个脚本节点纯重放出 12 个 settled preview cases，明确区分“命名为小雨 / 稍后命名”两条
choice 路线；组件只接 Player profile、资产 registry 与只读 `StageRenderTarget`，使用
`SemanticStageTargetHostV1`，只拥有局部 Stage projection state，不创建或接收
`GameSession`、application instance 或 semantic setter。Focused 测试证明全部节点/路线覆盖及
preview 前后 application digest 不变；Chromium/WebKit 证明代表节点可见且关闭面板后 live
日历、数值与 Stage 完全不变。Cat Cafe 40/40、typecheck、Story check 与 release build 均通过。

## 3. Trust boundary

SillyMaker 使用三档信任模型。

### Untrusted data

包括 bytes、files、URL、HTTP、Host records、imported Saves 与用户生成数据。

要求：

- strict shape 与 size/depth bounds；
- canonical admission；
- stable diagnostics；
- write 前完整验证；
- CAS/atomic failure；
- 不依赖 ignored/private input。

### Public authoring input

包括 Story definitions、schemas、spatial Scene renderers、Code Surface definitions 与
application declarations。

要求：

- 在 public/package boundary validate and normalize once；
- diagnostic 指向作者可修复位置；
- normalized representation 之后按普通 typed data 使用；
- 不在每个内部消费者重复 descriptor/prototype/frozen admission。

### Package-internal collaborators

包括同 package factory output、直接 collaborator 与 private lifecycle hook。

要求：

- 信任 TypeScript contract 与 construction-time assertions；
- 使用普通对象、闭包和 direct method call；
- 不为 hostile Proxy、same-realm monkey patch、forged look-alike 或 deliberate internal
  sabotage 建立安全剧场；
- WeakMap/token 只用于真实 stale/ABA、cross-lifetime、cross-owner 或 public-boundary
  currentness。

必须保留的内部机制包括 generation fencing、single writable authority、CAS、atomic
commit、async stale-result rejection 与 deterministic authoritative replay。

## 4. Complexity Reset acceptance

### CR0 — Governance

- current/next authority 只在 §1 首段表达；已关闭 lane 的 recap 不得反向激活任务；
- focused Surface plan 不再承载已完成 S0–S4b 的逐提交账本；
- slice 编号最多两级；
- 一个功能最多一次 docs-only entry；
- 不增加 exact-file inventory、phase enforcement script 或 history linter。

### CR1 — Proportional defense

- repository instructions 明确三档信任模型；
- Goal 只因 public/wire compatibility、Save/digest/replay、writable authority/atomicity、
  actual security boundary、conflicting real consumers 或 measured production performance
  而停；
- private helper shape、diagnostic precedence、test decomposition 与等价内部设计由实现者
  选择最简单的 fail-fast 方案。

### CR2 — De-fortification

每项必须满足：

- public exports 与 durable formats 不变；
- focused behavior tests 先锁住 current observable semantics；
- 删除 hostile-object/monkey-patch/look-alike 测试，而不是把它们改写成另一种品牌；
- stale/currentness、atomic no-partial-commit、terminal teardown 与 listener ordering 保持；
- 文件和测试的净复杂度下降；
- 不同时新增新的 generalized harness。

### CR3 — Performance evidence

首轮只记录趋势，不设机器绑定的 CI hard gate：

- Stable publication：1/4/16 targets，小/中参数，initial/no-op/one-change/all-change/empty；
- Narrative：semantic commit 到 visible ready、choice、say、auto/skip、History；
- WholeCanvas：initial、replacement、detail；
- Player：entry/preload/lazy/all JS/CSS/assets 的 raw/gzip，fresh-context cold start，
  retained heap 与 transition allocation 趋势。

报告记录当前 HEAD/dirty、Deno/V8/browser、OS/arch，写入 OS temp/artifact，不提交原始
机器结果。至少三次同类采样后才讨论产品预算。semantic preparation/notification count
继续是复杂度证据，不能冒充 JS allocation。

### CR4 — Product and author value

第一个纵切是 Cat Cafe detached Narrative/Stage preview：

- 可从每个剧情节点和明确 branch variant 预览；
- 使用只读 StageRenderTarget 与 SemanticStageTargetHostV1；
- 不创建第二 Stage reconciler，不写 Session，不调用 semantic setter；
- preview 前后 authoritative application digest 不变；
- browser 证明代表节点可见且关闭 preview 后 live game 未改变。

真实使用之后，才决定是否把最小 selection/panel helper 提升到 UI/debug tooling。

## 5. PF6 reactivation

旧 PF6/S5 broad structural/model/browser harness 不再是默认 current。

只有同时满足以下条件才重开其中某一部分：

- CR2 已去除当前已知 package-internal anti-forgery；
- CR3 已有可复现趋势数据；
- CR4 暴露了现有 check/inspect/simulate 或 Story-local preview 无法解决的具体作者问题；
- 至少两个真实消费者需要同一最小能力；
- proposed API 不重新引入 universal application envelope 或第二权威。

弱模型 canary 只在某个作者 API 要宣称 stable/AI-friendly 时执行，不是 runtime 或每提交 CI
前置。

2026-08-13 的 CR4 复审结论是不激活 PF6：现有 Story script、Semantic Stage projection、
`SemanticStageTargetHostV1` 与 DevDock contribution 已完成完整纵切，没有出现 check/inspect/
simulate 或 Story-local preview 无法处理的作者问题；当前也只有一个真实 preview 消费者。
因此缺少“具体未解决问题 + 两个消费者”两项必要条件。该结论不删除 deferred ideas；未来只有
新的仓库内产品证据同时满足上述条件时，才单独激活最小切片。

“两个真实消费者”只约束 broad abstraction 和 public promotion。单一消费者一旦出现可复现的
stale、readiness ABA、exact-parent、atomic partial-commit 或 successor callback bug，仍可直接增加
最窄 regression/property test 或局部 pure model；这不构成 PF6 harness 激活。

## 6. PF7 — Release stabilization

PF7 已于 2026-08-13 完成；PF6 已重新裁决为不激活：

- latest stable Deno 上运行 canonical check；
- 运行 affected browser/prebuilt、Save corpus 与 four-runtime determinism matrix；
- 用 CR3 数据核对产品预算，不把 CPU 型号、browser patch 或绝对机器证明写入兼容合同；
- public export 由第二消费者证明；
- 删除或明确 deprecate superseded owner/API；
- architecture/features/development/story-authoring/build-and-release 同步；
- 记录仍存在的规模、性能和平台限制。

PF7 不自动激活 Mod、content compiler、genre pack、advanced renderer 或 Desktop production
claim。

最终 stabilization evidence：

- latest stable Deno 为 2.9.5；`deno upgrade --dry-run` 确认没有更新版本；fresh canonical
  `deno task check` 为 format 970 files、unit 271 files / 4,690 tests、assets、五个 Story
  checks 与 Engine Lab 417-module release build 全绿；
- maintained Save corpus/current-load 为 4 files / 57 tests；Deno authoritative matrix 为
  1 file / 3 tests，Chromium/Firefox/WebKit 各两次共 6/6；
- Engine Lab 与 Cat Cafe 的 `@save` 均在 Chromium/WebKit/Firefox 3/3；Engine Lab 与 Cat
  Cafe file-level prebuilt smoke 全绿，Engine Lab 完整 Chromium prebuilt suite 44/44；CR4
  detached preview 的 Chromium/WebKit 代表流程各 1/1；
- clean-HEAD performance review 重跑 Stable 30-row workload 与 Chromium fresh-context
  3/3。Engine Lab 最大 entry 为 922,550 raw / 214,643 gzip bytes；Cat Cafe 最大 preload
  为 1,034,689 / 242,838。Vite 500 kB warning 与拆包优化保留为产品限制，不提升为机器绑定
  hard gate；
- 从 PF5 完成点到 PF7 的 public barrel/package exports 没有新增入口。CR2 删除的均是
  source-relative private claim/brand/matcher，CR3 是 benchmark task，CR4 是 Story-local
  tooling；因此本轮没有未经第二消费者证明的新 public ABI。未完成的 PF6 manifest/scaffold
  也不存在；
- Desktop JSON file persistence、packaging 与跨平台 durability 仍是独立 preview lane；本次
  不宣称 Desktop production、Mod、compiler、genre pack 或通用 editor/harness。

## 7. Independent Desktop promotion lane

Desktop persistence/package promotion 保持独立，不阻塞默认 web/core 顺序。其详细合同由
[Desktop persistence durability](2026-07-30-desktop-persistence-durability.md) 拥有。

- durability claim 需要目标平台 D1b–D3；
- packaging claim 需要目标平台 D4；
- packaged app 使用 atomic persistence 的组合 claim 才同时要求两轨；
- auto-update 保持独立；
- 当前 JSON file store 与 packaging 仍是 preview，不能由 CR/PF7 文案暗中提升。

## 8. Merge discipline

每个任务：

1. 先读 live implementation、相关 design 与 real consumers；
2. 记录 observable characterization 或真实性能 baseline；
3. 写明不改变的 public/wire/authority semantics；
4. 实现最小删除或产品纵切；
5. 跑 focused tests，再跑受影响的 broader gate；
6. 删除 superseded code/tests；
7. 只更新确实改变的 live docs。

不要求为每项建立 exact allowlist。正常实现中发现的私有 helper 选择由 task owner 直接裁决。

## 9. Stop conditions

立即停止并请求裁决，仅当：

- 需要改变 public API、Save/wire/digest/replay semantics；
- 无法保持 single writable authority、CAS 或 atomic no-partial-commit；
- 出现真实 security/trust-boundary 问题；
- 两个 real consumers 对公开合同有矛盾要求；
- measured production baseline 明确回退且最小修复仍需范围扩张；
- 需要把 Desktop preview 提升为 production claim；
- 需要恢复 universal envelope、第二 runtime authority 或未激活 Mod ABI。

以下情况不阻塞：private helper shape、内部 error-code precedence、测试文件拆分、同等安全的
one-shot setter 与 constructor factory 选择、formatter delta 或历史计划行号变化。

## 10. Safe parallel work and deferred tracks

可并行：

- Story-local gameplay/content；
- 外部商业克隆补齐内容与只读对比证据；它不改变本仓 active contract，也不把商业内容带回；
- 不改 authority 的文档和示例；
- Deno upstream release/source 状态的只读核对；独立 Desktop follow-up 仍不得越过 canary
  characterization → private inactive integration → verified-stable activation 顺序，但不替代或阻塞
  未来 owner-accepted current/next；
- 与未来 owner-accepted lane 无重叠的 bug fix。

继续 defer：

- Mod resolver/public ABI/distribution；
- generic content compiler；
- genre-wide combat/card/SLG pack；
- advanced renderer；
- AR6 后由所有者另行选择并立案的作品、examples 或产品实现；
- 真实 Agent/OpenUI/A2UI adapter、Agent persistence 与 Effect Broker；
- machine/browser/runtime patch pinning；
- unmeasured performance hard gates。
