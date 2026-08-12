# Production-floor execution sequence

状态：2026-08-13，PF0–PF5 与 Complexity Reset 的 CR0、CR1、CR2.1–CR2.5、CR3 已完成。
原 PF6/S5 泛化工作暂停；当前执行方向继续降低已交付 Managed Surface/Narrative 的内部
复杂度，随后建立真实性能基线，再以真实作者工具纵切验证下一步价值。PF6 不会自动恢复。

本文是唯一跨计划排序入口。它只保留 current、next、依赖、验收与 stop conditions。
旧版逐提交 delivery ledger 已退出 active authority；完成里程碑摘要在
[roadmap archive](../roadmap-archive.md)，更细的历史仍由 Git 保留。

## 1. Current and next

当前：

1. CR4 — 交付 Cat Cafe Story-local、只读的 Narrative-node Stage preview。

后续默认顺序：

1. 重新审查 PF6；只有真实消费者证明仍需要 structural/model/browser harness 时才激活
   对应最小部分。
2. PF7 — release stabilization。

一次只领取一个可命名任务。不得把 CR2.2–CR2.5、CR3、CR4 或 PF6 合成一次重写。

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

## 6. PF7 — Release stabilization

PF7 在当前 active work 完成且 PF6 是否需要已重新裁决后执行：

- latest stable Deno 上运行 canonical check；
- 运行 affected browser/prebuilt、Save corpus 与 four-runtime determinism matrix；
- 用 CR3 数据核对产品预算，不把 CPU 型号、browser patch 或绝对机器证明写入兼容合同；
- public export 由第二消费者证明；
- 删除或明确 deprecate superseded owner/API；
- architecture/features/development/story-authoring/build-and-release 同步；
- 记录仍存在的规模、性能和平台限制。

PF7 不自动激活 Mod、content compiler、genre pack、advanced renderer 或 Desktop production
claim。

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
