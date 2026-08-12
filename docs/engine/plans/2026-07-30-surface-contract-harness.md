# Managed Surface lifecycle execution plan

状态：S0–S4b 已完成，Workspace Overlay、System、Narrative/History 与 WholeCanvas 已由
composition-owned authority 生产化。Complexity Reset CR2–CR4 已完成；CR4 的真实消费者
没有证明需要重启 PF6 泛化，因此 PF6 维持暂停；PF7 stabilization 也已完成。当前顺序只由
[production-floor sequence](2026-07-30-production-floor-sequence.md) 决定。

旧版本文包含 S0–S4b 的逐提交 delivery ledger 和递归 docs-only 切片。它们已退出 active
authority；完成里程碑摘要在 [roadmap archive](../roadmap-archive.md)，详细旧账仍由 Git
历史保留。本文只保留 live contract、待验证方向与 stop conditions。

## 1. Live outcome

当前实现满足：

- 一个 composition-owned Managed Surface authority；
- transient 与 externally published stable target 共享 topology/input/focus/lifecycle owner；
- Workspace Overlay、System、Narrative/History、WholeCanvas primary/detail 是真实消费者；
- Story authoring 通过公开 definition/application source 接入；
- stale generation、application epoch、source revision、exact parent 与 gesture fencing；
- atomic publication/rollback、terminal teardown 与 late async-result rejection；
- Presentation 不成为第二 gameplay authority；
- SillyOS 可合法省略 Narrative/WholeCanvas。

这些是产品合同。Complexity Reset 可以改变 package-internal object model、文件划分与 private
helpers，但不能削弱上述行为。

## 2. Maintained boundaries

### Transient surfaces

Coordinator 解释 open/replace/push/close/dismiss/action intent，原子发布 topology、routing、
focus 与 readiness。identity token 用于 instance/currentness，而不是证明普通内部对象不可伪造。

### Stable surfaces

Stable publisher 使用 lease、source revision、accepted baseline 与 runtime attempt identity
处理 publish/reconcile/dispose。跨 publication、async readiness 与 owner lifetime 的 token 保留。

### Public authoring

Story definition、schema、renderer/action/port contribution 在 public boundary validate once，
随后由 normalized typed representation 驱动 runtime。Tooling 不加载 React Host 来发现结构。

### Package-internal collaboration

同 package factory output、port bundle、install participant 与 direct collaborator 是可信构造。
不得默认要求 frozen exact-own-key、prototype/descriptor scan、WeakMap authenticity brand、
exact claimant 或 captured intrinsic。

## 3. Complexity Reset candidates for surfaces

本计划不拥有 current/next；以下是由
[production-floor sequence](2026-07-30-production-floor-sequence.md) 排序的候选工作：

1. 简化 runtime state-install participant（已完成）；
2. 删除 Narrative cached intrinsics，合并 captured port sidecars（已完成）；
3. 删除 test-only stable private-provenance comparator（已完成）；
4. 整体传递 composition-owned typed bundle，去除重复 look-alike admission（已完成）；
5. Narrative definition 与 History observation 叶模块拆分已完成；进一步拆分 Narrative
   lifecycle/family 或 stable composite 只在 measured maintenance/product evidence 下激活，当前
   deferred，不是 Goal；
6. 建立真实 lifecycle/browser/build 性能趋势（已完成）；
7. 交付 Cat Cafe detached Narrative/Stage preview（已完成）。

每步必须保留：

- expected state/install generation CAS；
- reentrant prepare 后的 stale 判定；
- logical commit 在 assignment 前，physical completion 在 notification 后；
- fault/abort 不产生 partial authority publication；
- controller、timer、input 与 async operation generation fencing；
- public definition 与 untrusted publication/Save admission。

## 4. Deferred PF6 candidates

以下方向仍可取，但不是 active commitment：

- structural diagnostics for public authoring definitions；
- pure reducer/model exploration；
- seeded shrink/replay；
- frame-aware virtual input；
- whole-canvas cross-browser conformance expansion；
- stable authoring helpers 与 quickstart；
- presentation postcondition receipt for explicitly declared actions。

重新激活某项前必须完成当前已知 CR2 去堡垒化、由 CR4 暴露现有工具无法解决的具体
作者/产品问题、取得两个真实消费者和 CR3 数据。不得把这些方向一次合成 generalized
harness，也不得为了 completeness 给所有 action 增加 universal envelope。

2026-08-13 复审：Cat Cafe 使用现有 Story script、Semantic Stage projection、
`SemanticStageTargetHostV1` 与普通 DevDock contribution 即完成全部节点和两条 choice 路线的
detached preview；它没有 Session/semantic write port，关闭后 live application 不变。实现未暴露
新的公共 authoring gap，且没有第二个需要相同新 API 的 preview 消费者，所以本轮不激活上述
任何 PF6 candidate。

WholeCanvas public factory 目前仍要求作者预先冻结 dense arrays 与 plain records。严格 ID、
duplicate、placement、reserved-action 与 schema validation 必须保留，但“普通 readonly/plain
input → validate/defensive copy/normalize → engine-owned freeze”登记为 evidence-gated author API
ergonomics debt；在第二个真实作者消费者或 editor generator 证明当前写法形成实际成本前，不因此
重开 PF6。

上述第二消费者门槛不阻止单一消费者的真实 lifecycle bug 获得最窄 regression/property test 或
局部 pure model；只有把它提升为 broad harness/public abstraction 时才需要满足 promotion gate。

## 5. Product-facing acceptance

若 PF6 的某项重新激活，至少证明：

- public authoring diagnostics 可修复而且不依赖 React/browser Host；
- pure model 与 live runtime 对同一 observable transition 等价；
- virtual input 表达真实 frame/gesture currentness，不靠 sleep；
- browser matrix 覆盖真实 Engine Lab/Cat path；
- second consumer 使用相同 public seam；
- weak-model canary 只为 stable/AI-friendly promotion 提供证据。

## 6. Non-goals

- 第二 gameplay/session/state authority；
- runtime ORM 或通用 application envelope；
- 把 private object authenticity 当安全边界；
- 递归 docs-only adjudication；
- exact file inventory/process-enforcement tests；
- 在没有产品 evidence 时激活 Mod/genre/advanced renderer；
- 用 wall-clock/heap 的单机绝对值做兼容合同。

## 7. Stop conditions

停止并请求裁决，仅当：

- 需要改变 public Surface/Story contract；
- stale/ABA、cross-owner 或 cross-lifetime currentness 无法保留；
- atomic publication/rollback 或 single authority 无法保留；
- two real consumers 的公开需求冲突；
- measured player baseline 明确回退；
- proposed work 需要 universal envelope、第二 authority 或未激活 public ABI。

内部 helper、private diagnostic、文件拆分和同等安全实现选择不阻塞。
