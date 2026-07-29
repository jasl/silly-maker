<!-- SPDX-License-Identifier: MIT -->

# 主流游戏引擎的 Surface、状态与验证机制调研

日期：2026-07-30。

问题：当一个应用把主界面、道具栏、角色状态、相册、对话框等做成整屏或叠加式 UI
时，成熟引擎如何管理它们的生命周期、输入、焦点与测试？SillyMaker
又应如何把这些经验收敛成一条对 AI、尤其是较弱模型友好的安全路径？

本文研究 Unity、Unreal Engine、Godot 与 Bevy 的官方资料，并对照 Web 平台自身的
managed 原语（`<dialog>`/top layer、`inert`、Popover
API、CloseWatcher、Navigation API）。结论是独立的 SillyMaker
设计输入，不照搬任何引擎 API，也不依赖本地商业参考内容。

## 1. 结论

主流引擎已经分别验证了几组重要做法：

- **Unreal CommonUI** 最接近完整的 UI Surface 模型：可激活 Widget
  栈决定当前可见和可交互对象，中央 Action Router
  处理输入，激活/停用同时切换输入配置与默认焦点；
- **Unity** 提供 retained-mode Visual Tree、按 Panel 顺序派发的事件、可启停的
  Input Action Map 与跨帧 Play Mode 测试，但没有统一的“当前 Surface”权威；
- **Godot** 让 SceneTree 管理 Scene 生命周期，GUI 优先消费输入，`InputMap`
  提供语义 Action，并能在编辑器中产生配置警告，但 Scene、CanvasLayer、焦点与
  Action Context 仍需要项目自行约束；
- **Bevy** 用类型化 State、派生 State 和 Enter/Exit schedule 展示了 code-first
  系统中“权威状态、派生状态、转换副作用分离”的清晰形状；
- **Web 平台**本身已提供 UA 强制执行的 managed 原语：`<dialog>` 的 top layer
  栈序无法被 z-index 绕过、`inert` 排除子树输入/焦点、CloseWatcher 把
  Esc/Android back 统一为 close request、Navigation API（2026-01 达
  Baseline）提供可拦截的同文档导航。它们是“managed path
  可行且不可绕过”的最直接先例，也是 SillyMaker DOM adapter
  必须回答共存问题的对象（见 Web 平台一章）。

这些引擎共同提供的是**可组合原语**，而不是“弱模型写错也不会坏”的保证。它们都允许绕过推荐路径：直接启用另一个
Action Map、手工操纵节点或
Widget、混用两套输入方式、在异步帧之间继续使用旧引用。熟练开发者可以依靠经验维持约束，较弱模型则容易在多个局部真相之间反复补丁。

因此 SillyMaker 不应只再提供一组工具函数，而应提供更窄的 managed path：

1. 一个 `SurfaceCoordinator` 独占受管 Surface
   的运行时生命周期、层级、模态、managed routing lease 与焦点计划；
2. 每次 Surface 实例或渲染目标变化都生成可验证的
   `instanceId + topologyRevision`，旧帧、旧手势和旧回调不能提交到新 Surface；
3. 静态检查、headless 模型探索和真实浏览器测试组成分层 Harness；
4. 所有失败产生稳定、可定位、可被模型消费的结构化诊断，而不是让作者从视觉异常或偶发测试失败反推原因。

核心原则是：**单一生命周期权威，不等于单一持久化 Store。**
游戏状态、对话/Artifact、Workspace 布局与瞬态渲染仍由各自领域拥有；Coordinator
只拥有 transient target 与当前运行时 Surface 拓扑；物理事件和 pointer capture
仍由 InputRouter/Host adapter 执行。

## 2. 对照维度

| 引擎            | 生命周期权威                                         | 输入与焦点                                                | 状态与转换                                          | 测试/验证                                              | 对 SillyMaker 的主要启发                             |
| --------------- | ---------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| Unreal CommonUI | Activatable Widget Stack；栈顶激活，退出后恢复前项   | 中央 Action Router；输入配置与焦点跟随激活状态            | UI 激活状态独立于对象构造；StateTree 可表达层级状态 | Automation、Functional Test、Gauntlet、Data Validation | Surface 栈、集中路由、配置恢复与批量验证应是一套合同 |
| Unity           | Scene/Object 生命周期 + UI Toolkit Visual Tree/Panel | Panel 排序、事件传播、Focus；Action Map 可启停            | 项目自行组合 Scene、组件和 Action Map               | Edit/Play Mode Test、跨帧 `UnityTest`、`OnValidate`    | 需要帧感知测试；只给可组合原语不足以阻止多权威       |
| Godot           | SceneTree 与节点进出树                               | GUI 优先消费；`_unhandled_input`；Control Focus；InputMap | Scene/节点状态由项目组织                            | configuration warning、headless CLI、引擎单元测试      | 稳定主树 + 明确输入阶段 + 作者期诊断很有效           |
| Bevy            | 类型化 `States` / `SubStates` / `ComputedStates`     | 由系统和状态 schedule 约束                                | `NextState` 驱动 Enter/Exit/Transition              | ECS schedule 可被 headless 运行和断言                  | 权威目标、派生投影和转换副作用应类型化分离           |

## 3. Unreal Engine：最接近 Surface Coordinator 的现成经验

### 3.1 生命周期

CommonUI 的
[`UCommonActivatableWidgetStack`](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/CommonUI/UCommonActivatableWidgetStack)
只显示并激活栈顶 Widget；栈顶停用并被移除后，前一个 Widget 恢复激活。Stack
还允许不可移除的 Root Content。这比“多个 React
组件各自决定显示与否”更接近单一拓扑权威。

[`Push Widget`](https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/ActivatableWidgetStack/PushWidget)
的官方说明同时揭示了一个重要陷阱：Widget 可以被池化，并且同一 class
可同时存在多个实例。因此 class、类型名或栈深度都不能充当长期实例身份。SillyMaker
需要显式的 `surfaceInstanceId`，并在实例复用或目标替换时递增 topology revision。

[`UCommonActivatableWidget`](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/CommonUI/UCommonActivatableWidget)
把 activated/deactivated 与 constructed/destructed
分开，并为返回动作、期望输入配置和期望焦点目标提供生命周期入口。可见性、对象是否存在和当前是否拥有交互权因此不是同一个布尔值。

### 3.2 输入与焦点

[CommonUI overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-advanced-multiplatform-user-interfaces-with-common-ui-for-unreal-engine)
描述了输入从 Viewport 进入 Action Router，再沿激活 Widget
树路由的模型；上层停用后，下层恢复交互。CommonUI 还把 Click、Back
等抽象为跨设备语义 Action。

[Input fundamentals](https://dev.epicgames.com/documentation/en-us/unreal-engine/input-fundamentals-for-commonui-in-unreal-engine)
把输入配置和焦点目标绑定到 Activatable Widget
激活周期，并建议显式指定焦点目标。文档也警告：同时使用 CommonUI Input Config
与其他输入模式会互相覆盖，错误的最后配置甚至可能让界面失去可用输入。这说明“集中路由”本身不够；managed
path 还必须检测或禁止旁路写入。

[Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine)
的 Mapping Context 可以在运行时按优先级添加和移除，适合表达
gameplay、menu、modal 等上下文。但如果多个位置都能直接改
Context，所有权仍会分裂。SillyMaker 应让 Coordinator 原子地产生有效 input
context，而不是让每个 Surface 自行启停全局映射。

### 3.3 状态、测试与验证

[StateTree](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-state-tree-in-unreal-engine)
用层级 State、Enter Condition、Task 与 Transition
表达运行时状态机。它的可借鉴点不是把所有 UI
重写成状态机，而是让“当前权威目标”和“进入/退出所触发的动作”显式分离。

[Automation Test Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-test-framework-in-unreal-engine)
支持单元、功能、Smoke、内容压力和截图测试；[Functional Testing](https://dev.epicgames.com/documentation/en-us/unreal-engine/functional-testing-in-unreal-engine)
覆盖关卡内行为；[Gauntlet](https://dev.epicgames.com/documentation/en-us/unreal-engine/gauntlet-automation-framework-overview-in-unreal-engine)
把验证扩展到打包产物、设备和多进程 Session。

[Automation Driver](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-driver-in-unreal-engine)
则从平台输入层模拟 focus、click、press/release、typing、scroll 和
drag。启用后它会隔离大部分真实输入；官方优先推荐稳定的显式 element ID，并指出
hierarchy path 更脆弱。Driver action
会等待目标出现、可见并可交互，不要求每个测试自行猜一个 sleep。这直接支持
SillyMaker 为标准控件自动生成稳定 action/element ID、以 readiness/postcondition
同步，并让 sequence 停在第一个失败动作。

[Data Validation](https://dev.epicgames.com/documentation/en-us/unreal-engine/data-validation-in-unreal-engine)
可通过自定义 Validator 检查
Asset、依赖、目录和项目，并从命令行运行。这说明作者期合同不应只存在于运行时异常中，CI
与编辑器都应能调用同一验证核心。

### 3.4 借鉴与不足

可借鉴：

- 可激活栈作为单一 Surface 拓扑；
- activated 与 mounted/constructed 分离；
- 输入配置、返回动作和焦点目标属于激活合同；
- Validator、功能测试和打包环境测试分层。

不足：

- CommonUI 仍允许与其他输入 API 混用并产生软锁；
- 对象池意味着旧引用与复用实例仍需项目谨慎处理；
- 它面向编辑器与人类开发者，不会自动给出适合模型修复的最小因果轨迹。

SillyMaker 应吸收其集中式结构，同时把“混用造成的建议性警告”提升为 managed
Surface 的确定性拒绝或结构化诊断。

## 4. Unity：丰富原语与帧感知测试，但缺少统一 Surface 权威

### 4.1 生命周期

[UI Toolkit](https://docs.unity3d.com/Manual/UIElements.html) 使用 retained-mode
Visual Tree。元素树适合统一布局、样式、事件和焦点，但 Visual Tree
只回答渲染树结构，不天然回答哪个整屏功能是当前语义页面。

Scene 的加载/卸载仍由
[`SceneManager`](https://docs.unity3d.com/ScriptReference/SceneManagement.SceneManager.html)
管理；对象还可通过
[`DontDestroyOnLoad`](https://docs.unity3d.com/ScriptReference/Object.DontDestroyOnLoad.html)
跨 Scene 存活。项目若同时用 Scene、常驻管理器、Panel 与局部 React-like
状态表达页面，就很容易形成多个生命周期真相。

### 4.2 输入与焦点

[UI Toolkit runtime event system](https://docs.unity3d.com/Manual/UIE-Runtime-Event-System.html)
按 Panel 排序向多个 Panel 派发 Pointer Event；第一个影响焦点的 Panel 成为
focused
panel。事件停止传播和焦点变化是两个不同机制，因此“点击被遮罩消费”不自动等于“焦点也已转移正确”。

[`InputActionMap`](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/api/UnityEngine.InputSystem.InputActionMap.html)
把 Action 按上下文分组，并支持整体启停；稳定 Action ID
也比直接绑定按键更适合重绑与持久引用。gameplay、menu、modal 分 Map 是正确方向。

但
[`PlayerInput.currentActionMap`](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/api/UnityEngine.InputSystem.PlayerInput.html)
只描述由该 `PlayerInput` 管理的 Map，其他代码仍可直接启用
Map。这再次证明：如果引擎只给
`enable/disable`，就不能保证全局只有一个输入上下文权威。

### 4.3 状态、测试与验证

Unity 没有要求 UI
页面必须由一种状态模型管理。Scene、组件字段、ScriptableObject、Animator、Input
Map 与第三方状态机都可组合，灵活但依赖项目纪律。

[Unity Test Framework](https://docs.unity3d.com/Manual/com.unity.test-framework.html)
区分 Edit Mode 与 Play Mode
测试；[`UnityTest`](https://docs.unity3d.com/Packages/com.unity.test-framework@2.0/api/UnityEngine.TestTools.UnityTestAttribute.html)
可 yield 多帧，覆盖加载、销毁和输入在帧边界上的行为。对 Surface
而言，这是必要能力：同步 reducer 测试不能证明 pointerdown 后替换页面、下一帧
pointerup 不会误触新页面。

[Input System testing](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/Testing.html)
还允许测试从隔离的 Input System 状态开始，编程生成 press/release/touch，控制
input time，并把 event queue 与 input update 分开。这正对应 Surface Harness
所需的：

```text
queuePointerDown
replaceSurface
advanceInputFrame
queuePointerUp
```

[UI Input support](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/UISupport.html#distinguishing-between-ui-and-game-input)
同时说明了低层原语的边界：UI 使用某次 click 不保证 gameplay Action
自动收不到同一物理输入；在 Action callback 中查询 UI pointer
状态还可能读到上一轮 UI update 的结果。项目仍需显式切换 UI/gameplay
mode。SillyMaker 因而不能只暴露任意 `enable/disable Action Map`，而应由同一
Coordinator 从 active topology 派生 managed input context。

[`MonoBehaviour.OnValidate`](https://docs.unity3d.com/ScriptReference/MonoBehaviour.OnValidate.html)
可在 Inspector 数据变化时做局部配置检查，但它不能替代跨对象、跨 Scene 的项目级
Surface 验证。

### 4.4 借鉴与不足

可借鉴：

- retained tree 与事件传播提供稳定 UI 基础；
- Action Map 是语义输入 Context 的实用单位；
- Edit/Play Mode 和可 yield 的跨帧测试值得直接映射到 headless/browser 两层。

不足：

- Scene、Panel、Focus、Action Map 的所有权可以分别漂移；
- `PlayerInput` 不会阻止其他代码绕过它；
- Inspector validation 更擅长局部组件，不能证明整个 Surface 拓扑成立。

SillyMaker 应让 Surface publication 在一个原子版本中同时给出 active
instances、层级、modal owner、focus owner 与 managed input
context，避免消费者分别观察这些值。

## 5. Godot：SceneTree、分阶段输入与作者期配置警告

### 5.1 生命周期

[`SceneTree`](https://docs.godotengine.org/en/stable/classes/class_scenetree.html)
持有当前 Scene；切换时旧 Scene 被移除，新 Scene 在帧末加入，并通过
`scene_changed` 通知完成。旧节点引用因此不能被当作新 Scene 的身份。

[Scene organization](https://docs.godotengine.org/en/stable/tutorials/best_practices/scene_organization.html)
推荐稳定的 Main 节点，并把 World 与 GUI 组织为独立分支。这比让每个 Scene
同时拥有全局 UI 和领域状态更稳健，也与 SillyMaker 的稳定 Host + 可替换 Surface
Target 接近。

[`CanvasLayer`](https://docs.godotengine.org/en/stable/classes/class_canvaslayer.html)
只负责绘制层级与变换；它不会自动成为输入、焦点或导航权威。仅靠 z-index/Layer
修复点击问题是典型误区。

### 5.2 输入与焦点

[InputEvent flow](https://docs.godotengine.org/en/stable/tutorials/inputs/inputevent.html)
明确区分 `_input`、GUI `_gui_input`、shortcut、`_unhandled_input` 与 object
picking。GUI 可 `accept_event()` 消费事件，gameplay 则可在 `_unhandled_input`
中只接收未被 UI 使用的输入。输入阶段本身就是可验证合同，而不是由 DOM
冒泡的偶然结果。

[`Control`](https://docs.godotengine.org/en/stable/classes/class_control.html)
管理 focus mode、mouse filter 与显式
`grab_focus()`；[GUI navigation](https://docs.godotengine.org/en/stable/tutorials/ui/gui_navigation.html)
提醒自动推断的导航邻居可能不符合预期，并要求为初始界面显式获取焦点。

[`InputMap`](https://docs.godotengine.org/en/stable/classes/class_inputmap.html)
将物理输入映射为语义 Action，但它是全局集合，不自带“哪个 Surface 拥有哪个
Action”的上下文协议。官方还提醒内建 `ui_*` Action 不宜直接复用于 gameplay。

### 5.3 状态、测试与验证

Godot 的状态主要由 Scene/Node 与项目脚本表达；引擎不强制 UI
页面使用单一状态机。它的优势是节点进入/退出 SceneTree
有明确生命周期，缺点是作者仍可在 Autoload、Scene、CanvasLayer
和脚本变量间复制真相。

[`_get_configuration_warnings()`](https://docs.godotengine.org/en/stable/tutorials/plugins/running_code_in_the_editor.html#reporting-node-configuration-warnings)
允许节点在编辑器中报告缺少依赖、属性冲突等配置问题。这是 AI
友好性的好参照：组件应主动解释“哪条合同不成立”，而不是等待运行时视觉故障。

[Command line tutorial](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html)
支持 headless
运行；官方[引擎单元测试](https://docs.godotengine.org/en/stable/engine_details/architecture/unit_testing.html)主要面向
Godot 自身 C++ 代码。换言之，headless 基础设施存在，但用户项目的跨 Scene/Surface
模型检查仍需自己建设。

### 5.4 借鉴与不足

可借鉴：

- 稳定 Main/Host 与可替换 World/GUI 分支；
- 输入按阶段流动，UI 消费先于 gameplay；
- 初始焦点显式声明；
- 配置警告在作者期就给出因果说明。

不足：

- CanvasLayer、Scene、Focus 与 InputMap 仍是分开的原语；
- 全局 InputMap 不表达 Surface ownership；
- 缺少用户项目级的 Surface 状态空间探索和最小失败序列。

SillyMaker 应把 Godot 式配置警告提升为 CLI、DevDock 与 Agent inspection
共用的诊断信封，并把输入阶段纳入 Coordinator publication。

## 6. Bevy：code-first 的类型化状态补充

Bevy 不是本文的主要 UI 参照，但其官方
[`bevy_state`](https://docs.rs/bevy/latest/bevy/state/index.html)
文档提供了一个重要的 code-first 形状：

- `States` 表示独立权威状态；
- `SubStates` 只在来源状态满足条件时存在；
- `ComputedStates` 从其他 State 派生，不能被任意手工改写；
- `NextState` 请求转换，`OnEnter`、`OnExit`、`OnTransition` schedule
  执行边界副作用。

这支持 SillyMaker 把以下概念分开：

```text
domain/application target
  -> derived Surface target publication
  -> SurfaceCoordinator transition
  -> atomic runtime Surface publication
  -> renderer frame
```

Renderer 不应反向修改权威目标；派生 publication 也不应成为第二个可写 Store。Bevy
的不足同样明显：类型化 State
不是模态、焦点、输入路由或浏览器手势安全的完整答案，这些仍需要 Surface
专门合同。

## 7. Web 平台原语：引擎宿主自带的 managed 先例

SillyMaker 的宿主不是空白画布。浏览器已经为模态、焦点、关闭与导航提供了 UA
强制执行的原语，它们既是设计输入，也是共存约束：

- **`<dialog>` 与 top layer**：`showModal()` 把对话框放入 top
  layer，其余文档变为 inert；top layer 的栈序由 UA 管理，`z-index`
  无法覆盖。它证明“单一 modality 权威 + 不可绕过的层序”在 Web
  上是平台级现实，不是引擎发明。`closedby` 属性（2025）进一步声明 light-dismiss
  行为；
- **`inert` 属性**：整棵子树排除点击、焦点与辅助技术，正是“非 active Surface
  不接收输入”的现成执行机制；
- **Popover API**：top layer + light dismiss 的非模态浮层，适合 transient
  dismissible Surface；
- **CloseWatcher**：把 Escape 与 Android back 手势统一为 close request，并与
  dialog/popover 集成——与 dismiss policy/物理 Back 语义直接对应；Safari
  尚未支持，需要 keydown 降级路径；
- **Navigation API**：可拦截的同文档导航与历史条目管理，2026-01 达 Baseline
  Newly Available（Chrome/Edge、Firefox、Safari 26.2）。Surface 拓扑不应复制
  `window.history`，但产品级浏览器 Back 整合应经由它而不是 popstate hack；
- **View Transitions API**：为 DOM 状态切换提供原子视觉快照，可作为 Surface
  切换动画的增强，不承担 lifecycle 真相。

对 SillyMaker 的含义有三条：

1. **执行机制优先包装原生**：modal 渲染走 `<dialog>`/top layer、输入排除走
   `inert`、Esc/back 走 close request 路由，免费获得可访问性、焦点语义与 UA
   强制保证；Coordinator 保留拓扑与 lifecycle 权威，原生事件回流为 typed
   transition；
2. **共存必须显式**：作者/Mod 内容直接使用原生 `<dialog>`/`popover` 会绕过
   Coordinator 形成第二模态权威；structural check
   必须能发现并警告这种旁路。现有实现基于 Radix 的 JS 管理对话框（非原生 top
   layer），迁移到 Coordinator 时机制选型无法回避；
3. **React 生态坐标**：React Aria 展示了成熟的 focus/overlay 管理；React 19.2 的
   `<Activity>` 对应 `suspended` 阶段的保留挂载；`useSyncExternalStore`
   是消费原子 publication 而不撕裂的标准接口；`fast-check`（PBT + shrink）与
   `@xstate/graph`（模型路径枚举）是 explorer
   评估复用的候选，自研前应记录选型结论。

导航型 managed path 的正反先例也值得记录：iOS/Android 的导航框架（UIKit/SwiftUI
navigation、Jetpack Navigation 与 predictive back）证明受管栈 +
系统手势整合可以成为默认路径；Flutter Navigator 2.0（Router
API）则因向使用者暴露过多内部概念而成为公认的复杂度失败案例——这 对
SurfaceCoordinator 是直接警示：occurrence/revision
等内部身份不得出现在标准作者面上（设计已把它们限制在 reconcile/publication
层）。

## 8. 对 SillyMaker 的映射

### 8.1 SurfaceCoordinator 的职责

Coordinator 应是受管 Surface 的唯一运行时生命周期权威，至少原子发布：

- `applicationEpoch`；
- stable target occurrence；
- 稳定的 `surfaceInstanceId` 与单调 `topologyRevision`；
- lifecycle phase（例如 opening/active/closing/suspended）；
- layer、z-order 与 modal owner；
- focus owner 与 fallback；
- managed input context、可用 semantic actions 与 dismiss policy；
- render readiness；
- 当前 Surface Target revision。

它不拥有游戏角色数值、对话历史、报表 Artifact 或 Workspace 的 durable
layout。各领域发布稳定目标，Coordinator 负责把目标协调为当前 runtime
topology。持久化时保存领域事实或可恢复 Workspace 意图，不保存 DOM 引用、当前
focus、动画中间态和瞬态实例 ID。

这里必须区分两条路径：

- domain/workspace 拥有的 stable target 只能通过 typed intent 改变；owner
  原子发布新的 source revision 与稳定 `targetOccurrenceId`，Coordinator 随后
  reconcile。同一 occurrence 的无关 publication 不 remount；close 后即使同参数
  reopen 也使用新 occurrence；
- 只属于当前 UI session 的 transient target 才由 Coordinator 直接
  `open/replace/pushDetail/close`。

两次 commit 以 source revision 因果关联，不应伪装成跨 owner
分布式事务。两条路径都不应把 `toggle`
作为核心操作：重复执行、异步重试或旧回调触发时，toggle 无法表达期望后置状态。

### 8.2 Generation fence

仅有 React key 或 route name 不足以防止旧事件写入新 Surface。每个绑定 Managed
Surface 的输入和异步完成回调都应携带捕获时的 canonical dispatch
envelope（唯一权威清单见 design 的 input/gesture
一章：applicationEpoch、surfaceInstanceId、surfaceTopologyRevision、actionId、gestureId、inputPublicationRevision；target
occurrence 只出现在 reconcile/publication 层，epoch 内与 instance 一一对应）。

InputRouter 先核对 physical gesture token、application epoch 和当前 managed
routing lease；Coordinator 对 transition/readiness 再核对 expected instance 与
topology revision。发生 `pointerdown -> replace surface -> pointerup/click`
时，后半个手势仍属于旧 topology revision，必须被确定性消费或拒绝，不能落到新
Surface 的同位置控件。异步图片加载、动画完成、查询响应和延迟 focus
也遵守同一规则。

Renderer 必须从同一 atomic publication 绘制画面、建立 hit target 并注册
action；不能渲染新 projection，却从旧闭包读取 action，或用新 state 解释旧
pointer。

### 8.3 分层 Harness

成熟引擎的测试分层说明，单一测试技术无法覆盖这一问题。建议四层：

1. **静态 authoring check**\
   验证 Surface ID 唯一、父子/层级合法、modal 有 focus fallback、action 有
   owner、关闭路径存在、持久化分类明确，拒绝受管 Surface 直接操作全局
   input/focus。
2. **纯模型/Headless contract test**\
   对 Coordinator 的状态转换做表驱动、随机序列和性质测试：任意步骤后只能有一个
   modal/focus owner；back 的结果确定；close 重放幂等；无悬空 input context。
3. **最小失败序列探索**\
   用固定 seed 生成 open/replace/push/back/close/input/readiness 序列；失败后
   shrink 为最短 trace。模型拿到的是 5 步反例，而不是 300 行日志。
4. **真实浏览器 conformance**\
   覆盖 pointerdown/up/click 跨帧、坐标 hit testing、DOM focus、遮罩、animation
   frame、真实路由和整屏
   Surface。语义测试避免脆弱坐标；专门的浏览器合同测试可使用声明过的逻辑命中点与
   `elementFromPoint` 证明实际遮挡关系。

Hard gate 应是确定性的合同测试。真实模型生成测试可作为 API
可用性与能力下限证据，但不应把非确定的单次 LLM 输出变成每次提交的发布门。

### 8.4 AI-friendly diagnostics

“能报错”还不够。较弱模型需要稳定、局部、可执行的反馈：

- 固定 diagnostic code，不以易变自然语言作为断言；
- `path`、owner、expected/actual、当前 topology vector；
- attempted transition 与被违反的 invariant；
- 最短 reproducer/seed；
- `docsId` 与受支持的修复动作；
- 明确区分 input、Surface、semantic/workspace 的分层结果；application
  postcondition 未满足时返回 `postcondition_failed` 并保留已经 committed 的
  evidence；
- 同一问题只报告根因，派生噪声折叠到 related diagnostics；
- CLI、DevDock、测试和 Agent port 共享同一 JSON-safe envelope。

示例：

```json
{
  "code": "surface.stale_topology_revision",
  "path": "surfaces.storage.actions.close",
  "attempted": {
    "instanceId": "storage:7",
    "topologyRevision": 12,
    "gestureId": "pointer:44"
  },
  "current": {
    "instanceId": "status:8",
    "topologyRevision": 13
  },
  "outcome": "consumed",
  "docsId": "surface-topology-fence",
  "trace": ["pointerDown(storage.close)", "replace(status)", "pointerUp(pointer:44)"]
}
```

诊断建议应指向受支持的 authoring primitive，而不是自动生成任意补丁。若 Story
选择 unmanaged escape hatch，工具必须明确标记失去哪些保证，不能静默混入 managed
topology。

## 9. 面向弱模型的能力下限

AI 友好不能只凭“API 看起来简洁”判断，应建立固定、可重复的 authoring canary：

- 从全新 starter 开始，实现“home → storage（互斥整画布页）→ 详情 modal → back”；
- 添加一个异步 ready 的整屏 Surface，并证明 first-click 不丢失；
- 处理 `pointerdown -> replace -> pointerup` 而不修改引擎内部；
- 从一次故意制造的 Surface 冲突诊断中完成修复；
- 不允许 deep import、直接写 input/focus、手工 revision 或关闭验证器。

记录模型、版本、提示词、尝试次数、诊断轮次和最终 deterministic test 结果（托管
LLM API 不保证 seed 复现，确定性由 contract test
保证）。评测以冻结点战役组织：每次至少 5
次隔离运行、报告成功率区间与中位修复轮次；真正的发布门仍是静态检查、contract
test 与 browser conformance。协议细节见 design 与 plan。

这与主流引擎最大的差异在于：它们主要让专家“有能力写对”，SillyMaker
应让普通作者与较弱模型“沿默认路径很难写错，而且写错时能一次定位根因”。

## 10. 不应照搬的部分

- 不复制 Unreal 的 Widget/API 命名、对象池实现或编辑器工作流；
- 不把 Unity 的 Scene、Panel 与 Action Map 多中心组合原样带入；
- 不用 Godot CanvasLayer 或 DOM z-index 代替交互所有权；
- 不因 Bevy State 清晰就把所有业务、Workspace 和 UI 都塞进一个全局状态机；
- 不把 SurfaceCoordinator 扩展成 Runtime ORM、通用 WindowManager
  或持久化数据库；
- 不要求所有展示组件都是 Surface。只有拥有生命周期、输入/焦点、模态、返回或
  readiness 语义的界面才进入 managed contract。

## 11. 建议决策

1. 将 Surface lifecycle unification 从“共享几个状态字段”提升为正式
   `SurfaceCoordinator + atomic publication` 合同。
2. 先以现有 API 证明 source-publication/gesture 裂缝，再在首个 Coordinator slice
   建立 topology revision fence、原子 frame/action publication 与 managed
   routing lease，避免给 legacy store 临时补另一套 revision。
3. Engine Lab 增加中性的整屏 home/status/storage/specimen-catalog、嵌套 modal
   和异步 readiness 场景，不使用第三方内容。
4. 同一 invariant 核心同时驱动 `story check`、headless explorer、DevDock
   与浏览器断言。
5. 把弱模型 authoring canary 作为公共 API 冻结证据；若模型必须接触内部
   revision、Effect 时序或多套输入 API 才能完成任务，说明引擎抽象仍未完成。
6. DOM adapter 的执行机制对 `<dialog>`/top layer、`inert`、CloseWatcher
   逐项做出采用/包装/自建三选一决策，并把作者直接使用原生模态原语的旁路纳入
   structural check。

最终目标不是消灭所有 UI 状态，而是使每类状态只有一个明确 Owner，并让跨 Owner
的转换成为可检查、可重放、可缩减的协议。

## 参考资料

### Unreal Engine

- [Common UI overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-advanced-multiplatform-user-interfaces-with-common-ui-for-unreal-engine)
- [Common UI input fundamentals](https://dev.epicgames.com/documentation/en-us/unreal-engine/input-fundamentals-for-commonui-in-unreal-engine)
- [Common Activatable Widget Stack](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/CommonUI/UCommonActivatableWidgetStack)
- [Common Activatable Widget](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/CommonUI/UCommonActivatableWidget)
- [Push Widget](https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/ActivatableWidgetStack/PushWidget)
- [Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine)
- [StateTree overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-state-tree-in-unreal-engine)
- [Data Validation](https://dev.epicgames.com/documentation/en-us/unreal-engine/data-validation-in-unreal-engine)
- [Automation Test Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-test-framework-in-unreal-engine)
- [Automation Driver](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-driver-in-unreal-engine)
- [Functional Testing](https://dev.epicgames.com/documentation/en-us/unreal-engine/functional-testing-in-unreal-engine)
- [Gauntlet](https://dev.epicgames.com/documentation/en-us/unreal-engine/gauntlet-automation-framework-overview-in-unreal-engine)

### Unity

- [UI Toolkit](https://docs.unity3d.com/Manual/UIElements.html)
- [UI Toolkit runtime event system](https://docs.unity3d.com/Manual/UIE-Runtime-Event-System.html)
- [SceneManager](https://docs.unity3d.com/ScriptReference/SceneManagement.SceneManager.html)
- [InputActionMap](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/api/UnityEngine.InputSystem.InputActionMap.html)
- [PlayerInput](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/api/UnityEngine.InputSystem.PlayerInput.html)
- [Unity Test Framework](https://docs.unity3d.com/Manual/com.unity.test-framework.html)
- [UnityTestAttribute](https://docs.unity3d.com/Packages/com.unity.test-framework@2.0/api/UnityEngine.TestTools.UnityTestAttribute.html)
- [Input System testing](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/Testing.html)
- [UI Input support](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/UISupport.html#distinguishing-between-ui-and-game-input)
- [MonoBehaviour.OnValidate](https://docs.unity3d.com/ScriptReference/MonoBehaviour.OnValidate.html)

### Godot

- [SceneTree](https://docs.godotengine.org/en/stable/classes/class_scenetree.html)
- [Scene organization](https://docs.godotengine.org/en/stable/tutorials/best_practices/scene_organization.html)
- [InputEvent flow](https://docs.godotengine.org/en/stable/tutorials/inputs/inputevent.html)
- [Control](https://docs.godotengine.org/en/stable/classes/class_control.html)
- [GUI navigation](https://docs.godotengine.org/en/stable/tutorials/ui/gui_navigation.html)
- [InputMap](https://docs.godotengine.org/en/stable/classes/class_inputmap.html)
- [CanvasLayer](https://docs.godotengine.org/en/stable/classes/class_canvaslayer.html)
- [Running code in the editor and configuration warnings](https://docs.godotengine.org/en/stable/tutorials/plugins/running_code_in_the_editor.html)
- [Command line tutorial](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html)
- [Engine unit testing](https://docs.godotengine.org/en/stable/engine_details/architecture/unit_testing.html)

### Bevy

- [`bevy_state` crate documentation](https://docs.rs/bevy/latest/bevy/state/index.html)

### Web platform

- [`<dialog>`: The Dialog element (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)
- [Top layer (MDN glossary)](https://developer.mozilla.org/en-US/docs/Glossary/Top_layer)
- [`inert` global attribute (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert)
- [Popover API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)
- [CloseWatcher (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/CloseWatcher)
- [Navigation API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API)
- [View Transition API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
