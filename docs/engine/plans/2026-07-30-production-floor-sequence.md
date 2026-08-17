# Production-floor execution sequence

状态：2026-08-13，PF0–PF7 与 Complexity Reset 的 CR0、CR1、CR2.1–CR2.5、CR3、CR4
已完成。CR4 的真实作者纵切没有暴露需要通用 PF6 harness 解决的问题，PF6 已重新裁决为
不激活。同日以真实产品证据接受并完成了
[Authorable Motion Workbench](2026-08-13-authorable-motion-workbench.md)（M1–M5：
motion 资产地板、点击反查溯源、Motion Workbench 编辑闭环、预览捕获/preview case、
协作护栏；外部实验仓的 12 步痛点闭环实测走通）。2026-08-14 以新的真实产品证据
（孤立数字 Workbench 仍无法支撑基本场景修改）接受并于 2026-08-15 完成
[VN Scene Workspace V1](2026-08-14-vn-scene-workspace.md)；目标合同见
[场景创作模型与 SillyMaker Studio 设计](../design/scene-authoring-and-studio.md)。
2026-08-15 以 A5 两轮基准与实验仓真实内容迁移证据及所有者角色决定（常态为试玩与 bug
汇报，日常修改由 Agent 与 Studio 完成）接受
[Authoring Architecture V1](2026-08-15-authoring-architecture.md) 为当前 active
plan；目标合同见[统一创作架构设计](../design/authoring-architecture.md)。

本文是唯一跨计划排序入口。它只保留 current、next、依赖、验收与 stop conditions。
旧版逐提交 delivery ledger 已退出 active authority；完成里程碑摘要在
[roadmap archive](../roadmap-archive.md)，更细的历史仍由 Git 保留。

## 1. Current and next

当前：[Ambient Loop Motion V1](2026-08-15-ambient-loop-motion.md) 的 M0–M3 已
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
持有交付记录与剩余验收：词汇/facts 投影 seam/retarget 与 change 的可选
`dispatches`/场景绑定 cue-first 与显式 cut/保守 lint 起点/template 取猫节拍首
个消费者；`deno task check` 与浏览器套件绿，引擎切片通过全量退化等位门）。
**第二消费者验收已于 2026-08-17 完成**：外部实验仓撤销其唯一
裂 tag——第二登场立绘回归共享 tag，show/hide 声明显式 cut，dispatch 链
（叙事节点标注 → fact → 适配器投影 → composition）全线打通；digest 经 stash
对照逐字节不变，e2e 断言第二登场立绘瞬现。验收回灌两处引擎修正（同日交付）：外场
景 open 不再具备 edge-tuple 回落资格（裁决 #2 澄清为**仅本场景自己的 open**
保持无上下文回落语义，杜绝共享 enter 边被外场景 open 偷走），以及批盖章前移
——`onAttempt`（发布前）暂存已提交 facts、实例作为 semantic port 首个订阅者
在 UI 收到通知前盖章，消除同步 flush React 宿主下 rev N+1 首帧配对失败的竞
态。证据环收口（2026-08-17 同日）：locality 复测第 2 轮达标（新增词汇行
"改 cue 表现 = 1 场景文档编辑点"；接线为每包一次采纳成本，template 起步为
零），cue/dispatch 全内容普查完成（单 commit 峰值 4 条、上限 32 余量 8 倍、
declared-vs-bare 碰撞零出现）；裁决 #3/#4 同日经所有者批复采纳（上限 32
冻结为终值、lint 保守起点转正），**cue identity 线整体收口**，记录归
[cue-identity 提案](../proposals/cue-identity.md)。下一个可命名任务来自
实验仓新内容波或所有者新证据带来的激活项。2026-08-18，所有者以约 67k 行的外部
State-heavy workload、Cordis 参考实现和明确的中立 State Runtime 目标提供了新的架构证据，
接受[Experimental composition kernel and State Runtime](2026-08-18-experimental-composition-state-runtime.md)
为独立分支 strangler experiment。其 X0 已完成，当前为 X1；该实验必须先通过唯一权威、
Save/replay 等价、dependency locality 与 `<10%` 稳定 command overhead gates，才可能回流正式
架构，不自动激活 Mod ABI、State Format V2 或新的 release blocker。

上一条 lane：[Authoring Architecture V1](2026-08-15-authoring-architecture.md)
（Studio 作者信任加固 → 统一创作外壳与共享文档会话 → project authoring index →
Story 包目录 locality → Scene Construction → Flow workspace；目标合同见
[统一创作架构设计](../design/authoring-architecture.md)）。S0–S5 全部切片已于
2026-08-15 交付（S5 的激活门——interaction-table kit 按提案判据升格进
template——同日满足：`roll` 块补齐并被实验仓真实内容使用、提案四问裁决冻结、
template 的 narrative-kit 换成 interaction 文档 kit 且 simulate 逐字节平价；交付
记录见该计划）。其证据循环复测（S2 "新 motion ≤2 文件"、设计 §5 局部性硬指标）
随实验仓下一轮回流。切片验收与 stop conditions 由各计划拥有。
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

包括 Story definitions、schemas、renderer contributions 与 application declarations。

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

- 本文保持约 200 行量级，只描述 current/next/dependencies/stops；
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
- 不改 authority 的文档和示例；
- CR3 read-only measurement；
- 独立 Desktop evidence；
- 与当前 CR 文件无重叠的 bug fix。

继续 defer：

- Mod resolver/public ABI/distribution；
- generic content compiler；
- genre-wide combat/card/SLG pack；
- advanced renderer；
- machine/browser/runtime patch pinning；
- unmeasured performance hard gates。
