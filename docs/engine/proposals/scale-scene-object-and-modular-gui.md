# Scale, Scene Object, and Modular GUI

状态：2026-08-24 接受；用于下一轮引擎迭代的架构合同，实施顺序另由 active plan
拥有。

## 1. 裁决

SillyMaker 下一轮不等待外部作品完成，也不要求任何一次作品重写达到最终理想形态。
引擎先以自有、构造的中立场景交付三组基础能力：

1. 面向更大文本、玩法和工程规模的可测性能边界；
2. 从现有扁平 Scene 渐进到对象层级、组件检视和确定编译的作者模型；
3. 重新划分核心、Player 能力、Host、authoring 与 devtools，使非必要 GUI 能力可排除、
   可替换，必要时可复制后由产品完整拥有。

本轮只交付 **Inspector-first** 作者产品：对象层级、属性检视/有限编辑、真实 renderer
预览、场外 ghost、source/diagnostic trace 和动画 scrub。不交付最终 Studio、通用
Blueprint、可写行为图、完整 timeline editor 或公共 Mod SDK。

现有 Authoring Host、文档会话、CAS、undo/redo、结构化操作、source IO、detached
preview 和 live-publication 连续性是可复用 substrate；当前五 workspace 的 Studio 产品
外形不是永久合同。新 Inspector 达到本案验收后，旧 shell、旧导出、只保护旧产品形态
的测试和 live 文档一起删除，不保留 compatibility alias 或隐藏双轨。

## 2. 为什么现在做

作品重写是昂贵的综合实验，而且当前一轮尚未结束。让引擎等待作品会把已知架构问题
继续固化进内容；反过来，把一个未完成的外部作品直接变成引擎规范，又会把偶然实现
当成通用合同。

因此采用交替演进：

```text
构造的引擎场景 -> 引擎能力与 Inspector -> 下一轮作品重写
       ^                                      |
       |-------- 被复现的通用缺口 ------------|
```

作品重写用于评估最新引擎对工程的影响。作品工程本身允许留下缺陷；只有能在中立场景中
复现、或明确属于已接受引擎合同的缺口，才回到下一轮引擎迭代。外部作品不是本案构建、
测试、命名、资源或验收依赖。

## 3. Live evidence

以下事实来自当前实现，而不是外部作品的历史判断。

### 3.1 Scene 与 Stage 的排序 authority 分裂

- `SceneEntryV1` 是扁平的 `layerId + tag + contentId + zOrder + placement +
  appearance + ambient`；没有 object、parent、children 或 component。
- `SceneDocumentV1` 不声明有序 layers。游戏初始 Stage 另行传入 `layerIds`，Studio
  detached preview 则按 entries 第一次出现的顺序推导 layers。
- Stage Host 的 layer DOM 没有另一套显式排序；跨 layer 绘制顺序就是 Stage 数组顺序。
- `openMutations` 明确不修正 z-order drift，`StageMutationV1` 也没有独立的
  `setZOrder`。

结果是作者看到的 layer 顺序、运行中的 layer 顺序与更新后的 z-order 可能来自不同
authority。继续添加局部 z 修补不能解决这个问题。

### 3.2 可见、存在和可编辑被混为一体

Scene Canvas 把拖拽 anchor 钳在 canvas 内，并裁剪 canvas 外内容。Motion Workbench 的
start ghost 同样位于裁剪画布内，而且继承真实 motion opacity。一个合法的场外入场、
初始透明对象或只在后续时间点出现的对象，可能在作者工具里无法选择和操纵。

作者模型必须区分：

- 对象是否存在于作者场景；
- Player 当前是否显示它；
- 它是否位于 Player viewport；
- Inspector 是否以 editor-only ghost 显示它。

后两项从不改变 State、Save、digest 或正式渲染。

### 3.3 Visual、Region、Intent 与动画是分散的 facet

- hit regions 由 content catalog 按 `contentId + appearance` 解析；独立 Regions 文档
  再由 Story 代码绑定；
- Stage Host 把 region activation 交给应用 callback，最终 semantic intent 通常仍由
  手写条件解释；
- Motion 是单 entry 的相对 overlay 文档；Scene cue 另行绑定它；
- 通用 Timeline runtime 已支持 sequence、parallel、wait、repeat、event，以及 entry/
  camera target 和同通道并行冲突拒绝，但作者面没有对象级投影；
- GUI button、stage hotspot 和 chrome layout 目前走不同作者路径。

每条能力单独可用，但作者工具不能回答“这个对象有哪些视觉、热区、交互、动画，它们
来自哪里”。本案首先建立统一 inspection/compile projection，不用一个巨型 schema
立即替换所有运行时。

### 3.4 当前 Studio 的成本与价值不在同一层

当前 `@sillymaker/studio` 同时包含 Authoring Host substrate、Scene/Motion/Regions/
Chrome/Flow 五个 workspace、standalone/embedded shell 和可选 Agent companion。真正
应长期保留的是 session、CAS、operations、preview、source trace 与 Host continuity；
五个并列 workspace 是围绕当前分裂文档族形成的产品形状，不是核心能力。本文所说的
replacement surface 只要求 M5 明列的新 Inspector 工作流与 retained substrate continuity；不要求
复刻旧五 workspace 的功能集合。

## 4. 业界参照与取舍

本案采用业界反复验证的分层，不照搬任何一个通用引擎。

- Unreal 把 Actor 作为容器，Scene/Primitive/行为等 Components 分别承担 transform、
  可视/碰撞与逻辑；不可见内容可由 editor-only visualization component 呈现。Blueprint
  Class 还能把组件层级、属性和行为组合成可复用资产。参见
  [Components in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/components-in-unreal-engine)
  与
  [Creating Blueprint Classes](https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-blueprint-classes-in-unreal-engine)。
- Unity 的 GameObject 是 component 容器，Transform 形成层级，Prefab 提供可复用定义与
  instance overrides；Visual Scripting 提供 node-based behavior workflow，同时 Unity 保留
  Inspector、Timeline 和代码等专门创作面。参见
  [GameObjects](https://docs.unity3d.com/6000.0/Documentation/Manual/GameObjects.html)、
  [Components](https://docs.unity3d.com/6000.0/Documentation/Manual/Components.html) 与
  [Prefabs](https://docs.unity3d.com/6000.0/Documentation/Manual/Prefabs.html)、
  [Visual Scripting](https://docs.unity3d.com/6000.0/Documentation/Manual/com.unity.visualscripting.html)。
- Godot 把游戏组织为 scene tree，保存后的 scene 可以复用为 node 类型；CanvasItem 又把
  z-order 与 input processing 明确区分，说明 render、pick 和 focus 顺序不能靠一个
  隐含数字包办。参见
  [Nodes and Scenes](https://docs.godotengine.org/en/stable/getting_started/step_by_step/nodes_and_scenes.html)
  与
  [CanvasItem](https://docs.godotengine.org/en/stable/classes/class_canvasitem.html)。

共同模式是：

```text
对象层级 + components/facets + Inspector + 可复用资产
                         + 专门的 Timeline / Behavior Graph / Code
```

SillyMaker 的取舍：

- 保留唯一 deterministic State/Session 与现有扁平 Stage runtime；
- 先增加作者对象与纯编译层，不增加第二个 live scene database；
- Inspector 是第一产品面，行为图和完整时间轴晚于真实消费者；
- Story 复杂规则继续使用 TypeScript；
- 不把 GUI/game 引擎扩成通用 3D ECS、IDE 或任意 DOM 编辑器。

## 5. Authoring Scene Model

### 5.1 第一阶概念

字段名和版本由实施切片冻结，但第一阶语义必须覆盖：

```ts
interface AuthoringScene {
  readonly sceneId: string;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly layers: readonly AuthoringLayer[]; // 唯一、显式、有序
}

interface AuthoringLayer {
  readonly layerId: string;
  readonly label: string;
  readonly roots: readonly AuthoringObject[]; // 顺序即 sibling paint authority
}

interface AuthoringObject {
  readonly objectId: string; // 稳定，不从数组位置派生
  readonly label: string;
  readonly localTransform: AuthoringTransform;
  readonly children: readonly AuthoringObject[];
  readonly visual?: AuthoringVisual; // 第一阶最多一个
  readonly bindings?: AuthoringBindings; // 引用，不拥有规则
}
```

第一阶约束：

- group 可有 transform 与 children，但不产生 runtime Stage entry；
- root 与整个 subtree 继承其 AuthoringLayer，第一阶禁止 child 跨 layer；
- 一个可渲染 object 最多一个 Visual，复杂组合用 child objects；
- sibling 数组顺序是作者 paint authority；编译器按每层 depth-first preorder 展平并派生
  无歧义的 dense z-order，使一个 subtree 在该 layer 内保持连续；
- layer 顺序由同一作者文档声明，并作为初始 Stage layer order 的编译产物；
- stable objectId 映射到 runtime tag，Timeline object target 编译为现有
  `{ layerId, tag }`；
- parent transform 以被测试的整数/permille 舍入规则展平；不得在 React/CSS 中另算；
- Visual 引用现有 contentId/appearance/geometry/catalog，不复制 renderer 或 asset
  authority；
- hit regions、motion、timeline 与 intent 首先作为可追踪 facet 投影；不能证明的
  binding 显示为 external/unresolved，不猜测；
- authoring-only label、selection、ghost、source span 不进入 runtime State 或 Save。

### 5.2 编译边界

```text
Authoring Scene source
  -> one admission and normalization
  -> pure Authoring Scene IR
  -> deterministic compile
       SceneDocumentV1/runtime scene plan
       ordered layer ids
       object-to-Timeline target bindings/index
       authoring inspection projection
       source map + diagnostics
  -> existing SemanticStage / Motion / Timeline runtime
```

`SceneDocumentV1` 可以继续作为低层 runtime IR 和 Advanced 手写入口；它不与新的作者
source 争夺同一场景的作者 authority。Story binding 必须显式声明 `authoring_scene` 或
`low_level_scene` source kind；不得从文件存在性或 import graph 猜测。一个场景只能选择一个 source
authority。第一阶
不为旧 Studio 文档建立 wrapper、alias 或自动双向同步。

编译必须满足：

- 同一 admitted input 产生字节稳定的 runtime plan；
- object/layer/reference 缺失、循环 parent、重复 ID、排序歧义和 timeline target 缺失
  在 build/check 阶段失败；
- runtime 热路径不查动态 registry，不遍历作者 object tree；
- build artifact 不包含 Inspector metadata，Player graph 不包含 source IO/React editor；
- 编译产物与现有 mutation/Timeline 合同保持同一 State/Session authority；
- Inspector 编辑只修改 authoring document 与 detached preview；保存后由正常 module-update/
  publication successor 把编译结果带入产品。Inspector/Authoring Host 不直接取得活动 GameSession
  writer。产品 successor 若改变 z-order，必须经原子 `setZOrder` 或等价 reconcile 进入 authoritative
  Stage，不能只改 DOM；
- paint order 是 layer order + 每层 depth-first preorder；pointer pick order 由 compiler 独立生成
  topmost-first region sequence，可以从 paint order 派生但不依赖偶然 DOM 顺序；focus order 继续由
  现有 input/focus 合同拥有，不从 z-order 推断。

### 5.3 面向 Agent 和人类的同一操作面

Inspector、Agent 和非 UI tooling 共用结构化对象寻址与文档修改能力。selection/navigation 是
Authoring Host 拥有的 session-local transient state；它不推进 draft revision，不进入 CAS、undo/redo
或 authoring source。设置 local transform、修改 appearance、调整 sibling order 等文档修改才进入
既有 structured-operation executor，并共用：

- 同一 schema admission；
- 同一 document identity、draft revision 和 CAS；
- 同一 undo/redo history；
- 同一 compiler diagnostics 和 source map；
- 同一原子失败语义。

Agent 不直接操纵 React state 或生成不可检视的运行时对象。人类摆好草稿后 Agent 可以
补结构与代码；Agent 生成场景后，人类能在 hierarchy、Inspector 和 preview 中继续打磨。

## 6. Inspector-first 产品范围

### 6.1 本轮实现

- ordered layer/object hierarchy；
- selection 与 source location；
- Transform、Visual、Appearance、Render Order 的属性检视和有限编辑；
- Hit Regions、Motion、Timeline、Interaction binding 的只读 facet 与诊断；
- Story 真实 renderer 的 detached preview；
- canvas pan/zoom/overscan，Player viewport 边界参考；
- 对场外、透明、当前隐藏对象的 editor-only force-visible ghost；
- Motion/Timeline 的只读 scrub，可同时显示 disjoint parallel channels；
- 保存、CAS conflict、undo/redo、dirty navigation 与 standalone/embedded Host continuity；
- build/check 与 Browser 行为证据；普通 Player 结构排除。

Inspector 中的数字输入是精确入口，hierarchy/直接选择是主工作流。第一阶允许只编辑
少量稳定字段；缺少编辑器不等于缺少 runtime 能力。

### 6.2 以后由证据激活

- HitShape/Interaction 成为可写 object component；
- stage hotspot 与 GUI control 共享 typed InteractionTarget/availability/intent，但继续
  使用适合自己的 renderer；
- Motion/Timeline curve editor；
- prefab/object asset 与有限 instance override；
- 受限、typed behavior graph；
- 自定义 component/graph-node authoring SDK；
- 公共 Mod ABI、resolver 或分发。

## 7. Studio substrate 与旧产品外形

### 7.1 保留

- Authoring Host 的 session/lifetime owner；
- document session、CAS、undo/redo、dirty close 与 stale fence；
- Project Authoring Index 和 dev-only source IO；
- structured operation executor；
- detached renderer preview 和 authoring diagnostics；
- standalone/embedded shell placement 与 live-publication continuity；
- 可选 Agent companion 的隔离 seam。

这些能力可移动到更准确的模块，但不得重新实现第二套。

### 7.2 退役或重宿主

- 当前 Scene/Motion/Regions/Chrome/Flow 五 workspace rail 不是新产品合同；
- `StudioAppV1` 的 monolithic shell 在达到 M5 accepted replacement surface 后删除；
- Scene Construction 的 flat-entry selector 被 object hierarchy 取代；
- Regions/Motion 的纯编辑算术若仍匹配新模型，可作为以后 Inspector facet 重宿主；
- Chrome/Flow 的 UI 没有本轮持续用途时退出 active product，其 runtime/data contract 不
  因 UI 退役而删除；
- “Studio 是最终形态”的文档、导出和专属测试与旧实现一起删除。

退役不影响已接受的 Authoring Host、AR2 structured operations、AR3 sibling continuity 或
Agent/RPC 隔离合同；这些是 substrate，不是五 workspace UI 的兼容承诺。

## 8. Core、Player、Host、authoring 与 devtools

模块边界按 authority、是否共同变化和是否为完整产品必需决定，不按概念名词无限拆包。

### 8.1 Kernel/core

始终保持最小、内聚：

- stable ids、admission 与 diagnostics 基础；
- 唯一 State/Session、transaction、RNG、CommandLog；
- Snapshot/digest、Save/replay、CAS/generation/currentness；
- 不含 Scene/Stage、React shell、DevDock、Settings、Inspector、Agent provider 或 platform-specific
  Host。Semantic Stage 合同当前可以物理位于 Base，但逻辑上属于 GUI/game domain，不改变平台/
  场景无关 State kernel 的边界。

### 8.2 Player runtime capabilities

产品按静态 composition 选择 stage renderer、narrative UI、audio、managed surfaces、Save
UI、Settings UI 等。能力可选不代表产品可缺失：一个产品可把某 capability 声明为必选，
最终图仍是 build-known 的。

可复用能力有三种交付形态，不强迫全部走 runtime plugin：

1. 稳定 framework-neutral/presentation port 加 first-party 默认 UI；
2. 可静态排除的 first-party capability package；
3. copy/eject recipe：复制源码后由应用拥有和定制。

Settings 的 schema/storage port 可以复用；具体设置项与外观属于产品。高度可定制的
DevDock chrome、Settings shell 和产品导航优先提供 copy/eject recipe，避免为一个内置
组件不断增加 slots/callbacks 和长期兼容负担。

### 8.3 Host adapters

Browser 与 Deno Desktop 提供 window、storage、input、startup config 和 RPC transport
adapter。Desktop preview/default-off 裁决不因本案改变，也不阻塞 Browser/engine 工作。

### 8.4 Authoring 与 devtools

- 非 React authoring contract/compiler/source map 属于 build/dev cold path；
- Inspector、source-write IO、Agent authoring companion 和 DevDock 属于 dev-only 外圈；
- production Player graph 必须结构排除它们；
- Composition Direct 只负责冷路径 lifecycle/selection，不进入 command/render hot path；
- 外部后台与 LLM 继续通过 typed RPC，绝不变成 in-process plugin。

### 8.5 Mod

成人内容或其他纵向 feature 可以由静态 product profiles 证明“完整基础产品 + 可选纵向
切片”，但本案不激活公共 Mod ABI。先分清：游戏暴露哪些稳定扩展点、引擎只需提供哪些
composition/build/state 支持。至少两个独立纵切证明前，不实现 resolver、SDK 或分发。

## 9. Scale and performance floor

本轮性能工作以测量、所有权和结构性排除为先，不以微优化替代架构。

### 9.1 数据所有权

- Snapshot 只保存恢复 authoritative gameplay 所需的最小、可变、版本化数据；
- 大文本、静态对话、场景 authoring metadata、assets、索引和编译图不进入 Snapshot；
- runtime State 引用稳定 content/document ids，不复制整份目录或文本；
- presentation caches、Inspector selection 和 editor layout 各自属于非权威 owner；
- 任何拆分都不得产生第二个 State/digest/Save/replay authority。

### 9.2 Build-known progressive activation

- 大文本保持 text-first、按文档编译；Flow 是索引/投影，不把每行文字变成常驻图节点；
- scene/object source 在 build/check 编译为 runtime closure 和 source map；
- runtime 只加载启动、当前场景和明确预测窗口需要的 chunks；
- 一个 Session 固定一份 immutable content manifest revision/digest；同一 pack ID 在该 Session 内只对应
  一份 admitted bytes。Host 在任何会引用该 pack 的 authoritative command 前完成加载/admission，
  Save/load/replay 通过既有 build/simulation/content identity 重新取得同一 manifest；
- Inspector/Flow/Agent/devtools 进入独立 dev graph；
- 不在 command/render path 做动态 lifecycle lookup 或目录扫描。

### 9.3 测量

通用 benchmark 只输出原始数据和必要环境信息：

- GUI readiness 与首个可交互时刻；
- initial JS/module/chunk bytes 与启动模块数；
- 当前场景和代表性大场景的 resident heap；
- Snapshot serialized bytes、finalize/digest p50/p95；
- command transaction p50/p95；
- authoring index cold scan 与单文件增量更新时间。

阈值必须来自后续接受的持续产品预算。不得把一次机器测量包装成普适 promotion 裁决，
也不得重建 baseline/candidate 双 checkout harness。

## 10. Neutral conformance scenes

全部证据使用仓内自有的构造场景，不引用外部作品内容：

1. **object-stack**：有序 layers、嵌套 groups、同层重叠 objects；证明 paint/pick 顺序、
   sibling reorder 与 live z reconcile。
2. **offscreen-entry**：对象在 viewport 外且初始 opacity=0，通过 motion 入场；证明
   hierarchy 可选、ghost 可见、scrub 不改 State。
3. **dual-controls**：一个装置含左右两个 child visuals/regions；证明两个 interaction
   facets 可见、可独立激活，并明确外部 intent binding。
4. **parallel-stage**：两个 objects 的 disjoint Timeline channels 并行；证明同一时刻
   预览和已有 parallel-conflict 拒绝。
5. **generated-scale**：测试/benchmark 时生成大量 documents/objects/text references；
   不提交巨型 fixture，不把固定数量变成产品上限。

验收只保护用户可观察合同：排序与激活结果、对象可检视性、编译确定性、State 不被
preview 修改、Player graph 排除和原始性能测量。不认证完整 DOM inventory、source text、
文件清单、命令顺序或计划阶段。

## 11. 非目标

- 一次重写所有 examples 或外部作品；
- 以某个作品目录、角色、玩法或素材作为引擎 fixture；
- 最终 Studio 产品设计、通用 IDE、代码编辑器或 WindowManager；
- 通用 Blueprint、可写 narrative graph、完整 Timeline/curve editor；
- ECS、第二个 scene runtime 或第二个 gameplay State；
- 任意 React/DOM/CSS 可视编辑；
- public component/plugin/Mod ABI、外部 SDK、resolver、热安装或分发；
- Desktop HMR/production promotion；
- 为旧 Studio 保留 wrapper、alias、双写或双向同步；
- 因缺少仓内消费者删除已接受、正交且可维护的引擎能力。

## 12. Stop conditions

实施只因以下问题停下并回到 owner：

- 新作者模型要求改变 Save/digest/replay 的可观察语义；
- 无法维持唯一 State/Session 或原子 mutation authority；
- object identity、layer order、pick/focus order 存在两个无法归并的真实 consumer；
- 新 source/wire format 需要跨版本公共兼容承诺；
- measured production workload 证明 compile/runtime 结构不满足预算；
- Inspector 无法结构排除出普通 Player；
- 需要激活公共 Mod/extension ABI 才能继续。

private helper shape、文件拆分、React 组件分解、同等安全的整数舍入实现和测试组织由
实施选择最简单、可验证的方案继续。

## 13. Anti-overengineering rules

- 第一阶只实现当前 conformance scenes 所需字段；不预留万能 component registry。
- 作者对象在 cold path 编译；runtime hot path 继续消费 direct plans。
- 不为未来可能的 3D、physics、network replication 或 arbitrary scripting 添加字段。
- 不因为名称叫 component 就引入 ECS、动态查询或 per-frame service lookup。
- 不把 every optional capability 都实现成同一种 plugin；优先普通函数、静态 composition、
  package export 或 copy/eject recipe。
- 不为 Inspector 自证明添加 durable evidence、完整 DOM/source inventory 或长期 automation
  framework。
- 不重复 admission：source 在边界解析、规范化一次，内部信任 typed IR。
- 不用 exact source、固定 fixture 数量或 machine identity 代替行为测试。
- 不维护旧 Studio compatibility；M5 accepted replacement surface 达到后同轮删除旧路径。
- 不因“已经写了很多”保留错误产品形态，也不因产品形态退役删除独立 runtime 能力。
- 若一个 Inspector facet 需要上千行专用框架才能只读展示，先改用简单属性表和人工
  checklist；真实编辑需求出现后再推广。

## 14. 完成本案所要求的结果

下一轮引擎实施完成时，应能证明：

- 一个自有 Authoring Scene 以唯一 ordered layers/object hierarchy 编译到现有 runtime；
- layer/z-order 更新实际进入 authoritative Stage，而非只改变 Inspector DOM；
- 场外/透明对象在 Inspector 可选、可 ghost、可 scrub；
- hit region、Motion/Timeline 和 source binding 能按 object 检视；
- Inspector 与 Agent/非 UI tooling 共用 structured operations、CAS 和 diagnostics；
- 旧 Studio 产品 shell 已退役，保留 substrate 有明确 consumer；
- ordinary Player final graph 排除 Inspector、source IO、Agent authoring 和 devtools；
- 大静态内容不进入 Snapshot，代表性 scale 测量有原始数据；
- focused unit/integration/Browser tests、`deno task check` 与涉及的 React Doctor advisory
  audit 通过；
- 文档如实区分已实现能力、实验 authoring source 与以后 evidence-gated 能力。

这是一条渐进阶梯的第一阶，不是假装完成最终编辑器。下一轮作品重写负责评价它是否
真的降低工程成本；评价结果再决定第二阶，而不是要求作品为本轮架构预先证明一切。
