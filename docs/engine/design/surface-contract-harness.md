# Managed Surface lifecycle contract

状态：2026-07-30 接受；2026-08-25 按 live implementation 与 Complexity Reset 重写。

本文只定义当前 Managed Surface 的产品合同。旧版逐提交 delivery ledger、
docs-only checkpoint、exact result matrix 和 package-internal 对象真实性协议已删除；
历史交付摘要见 [roadmap archive](../roadmap-archive.md)，细节由 Git 历史保留。
当前状态、defer 和 stop conditions 见
[Managed Surface lifecycle execution plan](../plans/2026-07-30-surface-contract-harness.md)。

本文中的 **Managed Surface** 是会改变导航、输入所有权、焦点、模态或 Back
语义的完整 UI 面，例如 Workspace Overlay、System Settings/Saves、
Narrative/History 和 WholeCanvas primary/detail。普通按钮、tooltip、HUD 和装饰层
不因为使用了“surface”一词就进入该系统。

## 1. Decision and authority

SillyMaker 对 Managed Surface 只保留一个 composition-owned lifecycle authority。
它原子决定：

- 当前存在哪些 Surface instance；
- root/child、slot、layer 和 stack 拓扑；
- `preparing | active | suspended | exiting` lifecycle；
- 哪个 instance 参与 managed input、拥有 focus 或遮挡下层；
- readiness、Back/dismiss 与 terminal teardown 的当前结果。

它不是全局 UI store，也不拥有 gameplay State、conversation/artifact 内容、
Snapshot、Save、source document 或 Host repository。各领域仍拥有业务状态和合法性；
Surface 只消费领域发布的稳定目标，并把用户意图返回该领域。

| Data                               | Owner                      | Persistence                                    |
| ---------------------------------- | -------------------------- | ---------------------------------------------- |
| Domain semantic state              | Story/application domain   | 由产品决定；可进入 Game Save 或领域 repository |
| Externally published stable target | Domain/workspace publisher | 上层可持久化稳定 ID 和参数                     |
| Coordinator-owned transient target | Managed Surface authority  | 仅当前 UI session，可重建                      |
| Surface lifecycle publication      | Managed Surface authority  | 瞬时，不进入 Save                              |
| DOM/React/animation/pointer state  | Renderer 或 Host adapter   | 瞬时，不反向改写 Surface authority             |

恢复 gameplay/application 时，上层可从稳定语义目标重建 Surface；不恢复旧
runtime instance ID、focus handle、listener、pointer capture 或 animation progress。

## 2. Public authoring and admission

公开 Surface definition 表达产品合同，而不是 runtime 对象图。它包含：

- stable definition ID、contract revision 和 owner；
- root/child slot、layer/order、placement 与 cardinality；
- modality、managed-input 与 focus policy；
- Back、Escape、backdrop 和 routed-cancel policy；
- initial-open、primary-replacement 与 child-open readiness policy；
- 允许的 semantic action ID、参数 schema、renderer 与必要 ports。

Definition 不包含 React element、DOM node、listener、Promise、clock handle 或可变 store。
作者传入普通 records/arrays；不需要预先 `Object.freeze`、制造特殊 prototype
或使用 package-private token。

数据只在其真实边界 admission 一次：

1. public Story/Host 输入执行 schema、字段、值域、容量和引用检查；
2. admission 将其规范化为普通 typed data；
3. package-internal consumers 信任这个 typed representation。

新的 Host、renderer、Story callback 或 async readiness 结果是新的边界值，需要自己的
最小 admission；但已 admitted 的值不在 parser、Coordinator、family 和 renderer 之间
层层重复检查。

Package-private typed bundle、port、install participant 和 direct collaborator 是可信的
TypeScript 构造。不用 exact-own-key、prototype/property-descriptor scan、
accessor/thenable authenticity、captured intrinsic 或 WeakMap brand 证明它们“真实”。
WeakMap/token 只保留给可到达的 ownership、one-shot、stale/ABA、cross-owner 或
cross-lifetime 问题。

## 3. Targets and observable identities

Surface target 只表达“想显示什么”，不包含 mounted、CSS visibility、z-index、
focus handle 或 pointer handler。

- **Externally published stable target** 由 gameplay、conversation 或 workspace owner 发布。
  Coordinator 不乐观镜像第二份 stable state。
- **Coordinator-owned transient target** 表达当前 UI session 的 detail、modal 或导航。
  一旦产品要求跨 restart 恢复，目标必须升级为上层领域所有。

以下 identity 分工明确，不合并成一个含糊 `generation` 或对象真实性系统：

| Identity/fence                  | Meaning                                                      |
| ------------------------------- | ------------------------------------------------------------ |
| application epoch               | 同一 page/realm 内的 application/Coordinator successor       |
| target occurrence               | 一次 stable/transient target occurrence；close/reopen 不复用 |
| parent occurrence               | child 必须绑定当前精确父 occurrence                          |
| runtime instance/attempt        | 一次 preparation 和 runtime lifetime                         |
| publication revision            | 任何可观察 Surface publication commit                        |
| topology revision               | active topology/action/input 的 currentness fence            |
| publisher lease/source revision | stable owner lifetime 与其 monotonic publication domain      |
| semantic occurrence             | Story/Base 交互身份；不是 Surface instance ID                |

CAS、lease、source revision、generation/currentness 和 exact-parent 检查是操作时合同，
不是对已 admitted 内部对象重做 schema 认证。长时间 churn 只保留 resolved
owners、live/pending topology 和有界 cursor，不保留 append-only retired-object history。

## 4. Topology, readiness, and atomic publication

Coordinator 是 topology、routing、focus、instance 和 readiness 的唯一可写入口。
Modality、input owner、focus owner 和 navigation target 是四个独立派生维度；不从对方、
DOM 存在或 React mount 状态反推。

一次 transition 要么安装一个完整 successor，要么保留旧权威。完整 successor
同时包含：

- lifecycle/topology state；
- render publication；
- action availability/routing；
- managed input/focus ownership；
- readiness/fallback 结果与必要 diagnostics。

Initial open、primary replacement 和 child/detail open 可以有不同 readiness policy。
Preparation 在不获得普通 input/focus/semantic authority 的状态下运行；只有当 candidate
的 epoch、instance/attempt、target occurrence、source revision 与当前 owner 仍匹配时，
ready 才能提交。

State install 遵循简单的 prepare/validate/commit 边界：可失败的 planning 在分配可观察
authority 之前完成；logical commit 在 assignment 之前完成，physical completion 在完整
notification 之后完成。Fault、abort、stale 或 capacity failure 不得暴露 partial successor。

Terminal teardown 第一次生效，封闭后续 intent、timer、listener、readiness 和 async result，
释放 input/focus/lease，并且不因单个 cleanup/observer failure 跳过其余资源。

## 5. Stable publication

Stable publisher 拥有一个 lease、monotonic source revision 和 target-occurrence allocator。
它发布完整 ordered target vector，而不对当前 runtime 做局部双写。Root 的 parent
为 `null`；child 绑定同一 publication 中先出现的 exact parent occurrence。

Target 参数在公开 schema 边界规范化为 bounded Strict Canonical Data。跨 publication
的 stable 等价性使用 definition revision、occurrence/parent/slot 与 canonical parameter
identity；不使用 renderer callback、普通对象 deep equality 或 publisher attestation。

Reconcile 先检查 current lease、source revision、accepted baseline 和 reservation/currentness，
再规划完整 successor。这些证明只保护跨 publication/owner lifetime 的真实身份和
atomicity；不延伸为对 package-owned record、callable 或 configuration bundle 的真实性证明。

Publisher dispose 与该 lease 的 accepted/runtime retirement 使用同一 commit。旧 lease、低
revision、stale readiness 或不当 cross-owner parent 全部失败且零 partial publication。

## 6. Action, input, focus, and gesture currentness

Renderer 只收到 read-only typed projection 和当前 frame-bound actions。它不接收 Coordinator、
registry、lease、raw input router 或可写 topology。

一个 managed action 只在以下条件同时成立时 dispatch：

- application epoch 与 runtime instance 仍 current；
- topology revision、route/input context 和 action ID 仍属于当前 binding；
- instance 处于允许交互的 active phase；
- 需要 physical gesture 时，pointer-down 到 activation 使用同一当前 gesture lease。

Replace、close、suspend、focus loss、visibility reset 或 Host cancellation 会撤销旧 gesture/action
能力。旧 callback 必须 fail closed，但未命中 managed route 的 ordinary InputRouter
fallthrough 仍保持原语义。

Input owner 和 focus owner 可不同。Focus restore 只返回 still-connected 且仍属于当前
lifecycle 的目标；旧 root/child 不能在新 Surface 安装后夺回 focus。

## 7. Package and Host boundaries

- **Composition root** 为每个 application epoch 创建一个 package-private typed kernel
  bundle，并在 successor ingress 开放前完成 family binding/activation。
- **`@sillymaker/ui`** 拥有 generic Coordinator/runtime kernel、React Hosts、publication
  stores 与 InputRouter integration；它不拥有 gameplay State 或 durable repository。
- **`@sillymaker/web`** 只规范化 DOM focus/inert、pointer/visibility/capture 等 physical
  Host 机制；不定义另一套业务 availability 或 transition rule。
- **Story/application** 拥有 definitions、renderers、stable targets 和 semantic/workspace
  intents；普通作者不手写 epoch、runtime instance 或 Coordinator lifecycle。
- **Tooling/Studio** 可以检查公开 definition/source 并渲染 authoring UI；不为了
  discovery 加载生产 React Host 或成为第二 authority。

Platform adapter 只在 Browser/Desktop 差异否则会改变上述可观察结果时存在。
Headless 和 Browser 使用同一 topology/availability/transition 规则。Deno Desktop candidate
仍 package-private、explicit、default-off 且未 promotion；它不激活另一套 Surface 合同，
也不阻塞 Browser 或 engine 工作。

React/Pixi/DOM 只消费 publication 和报告 readiness/failure。Mount、DOM existence、
listener registration 或 renderer-local state 不得反向成为 lifecycle authority。

## 8. Maintained behavior and evidence

当前 production consumers 是 Workspace Overlay、System Settings/Saves、Narrative/History 与
WholeCanvas primary/detail。SillyOS 证明产品可以合法省略 Narrative/WholeCanvas，
省略的 family 不分配 Host、source、lease 或 subscription。

行为验证应聚焦：

- open/replace/push/close/dismiss 后的可观察 topology、input 和 focus；
- readiness success/failure/retry 与 predecessor continuity；
- stale epoch/instance/source/gesture/async result 零 mutation；
- exact-parent child、publisher dispose 和 terminal teardown 的 atomicity；
- real Browser 的 pointer、focus、inert、visibility 和 StrictMode lifecycle；
- final graph 中未选 family/outer capability 的结构排除。

测试不保护 package-private object key inventory、Object.freeze 状态、property descriptor、
Proxy/monkey-patch 行为、固定源文本、文件布局或一次性 delivery checkpoint。只有一个
已复现的跨 owner/lifetime/currentness 失败才能引入对应的最小身份证明和回归测试。

标准作者路径应让人类和较弱的模型通过一个 definition/intent 语汇完成常见
Surface，不手写 boolean soup、Back stack、z-index、focus restore 或 global listener。
这是 authoring ergonomics 要求，不是永久保留 generalized harness 的理由。

## 9. Non-goals and stop conditions

本合同不建立：

- 第二 gameplay/session/State/Save authority；
- 通用 Redux/ORM/ECS、WindowManager 或文档数据库；
- 任意 UI/DOM/animation 状态持久化；
- public Mod ABI、untrusted-code sandbox 或 universal application envelope；
- 对 package-private 对象的 authenticity framework；
- 为完整性而存在的 model/test DSL、promotion harness 或历史兼容层。

只在以下情况停止并请求新裁决：

- 必须改变公开 Surface/Story 或 wire/Save 合同；
- single authority、atomic publication/rollback 或 stale/ABA/currentness 无法保留；
- 两个真实消费者的公开需求冲突；
- 解决问题需要第二 writable authority、universal envelope 或未激活的 public ABI；
- measured production performance 在最小修复后仍明确回退。

Private helper 形状、diagnostic precedence、文件拆分、测试分组和同等安全的内部实现
不是 stop condition；选择最简单、可验证的方案继续。
