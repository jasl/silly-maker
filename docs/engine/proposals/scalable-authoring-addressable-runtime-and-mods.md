# Scalable Authoring, Addressable Runtime, and Mods V1

状态：**2026-08-25 经所有者接受；M0–M5 已交付并关闭。** 本文拥有 M0–M5 的目标合同；实施顺序与验收由
[active plan](../plans/2026-08-25-scalable-authoring-addressable-runtime-and-mods.md) 拥有。

## 1. 裁决

上一轮 Scale / Scene Object / Modular GUI 已交付第一阶 Authoring Scene、稀疏 State 热路径、
按需 text pack、模块化 Player 和 Inspector。下一轮继续解决会在百万词文本、百倍 Scene 数量和
传统 Web GUI 中放大的问题：

1. 删除 Scene、Region、frame、transition 和 GUI layout 中没有真实资源边界依据的数量上限；
2. 把空间 Scene、DOM GUI composition 与 code-native React surface 定义为正交作者模型；
3. 把 Scene plan、Narrative chapter、GUI plan、Code Surface、text/i18n 和 assets 组织为稳定寻址、
   按需取得的 runtime units；
4. 继续扩展现有 Inspector 的运行时观测面，而不先建设最终编辑器；
5. 在上述格式和加载合同稳定后交付窄范围 i18n 与 private、build-known、application-local Mod
   Runtime。

Browser-first / Host-neutral 的引擎工作继续推进。Deno Desktop adapter 仍 package-private、
explicit、default-off，等待包含目标语义的 stable Deno 独立复验；它不阻塞本案。

本案不等待外部作品完成，也不把 SillyOS、商业克隆或大型第三方 React 组件变成验收依赖。
它们在本轮关闭后评价工程局部性、可维护性和真实性能，再把能在中立场景复现的缺口反馈给下一轮。

## 2. 不变量与压力

### 2.1 唯一 authority

- 一个运行实例只有一个 authoritative State / Session / Save / replay authority；
- Scene、Narrative、GUI、代码模块、文本和素材是静态或 presentation content，不复制进 Snapshot；
- React local state、Inspector selection、Agent run/transcript、loaded-unit cache 与 module instance
  各有自己的非权威 owner；
- 只有显式 typed semantic command 或 structured authoring operation 的结果进入对应 authority；
- 外部 bytes/files/URL/HTTP/RPC/Save 在拥有它的入口做一次 bounded parse、schema/value admission
  与 typed normalization，内部 hot path 信任该表示。

### 2.2 JavaScript 主线程现实

Browser 的 JavaScript job 是 run-to-completion；长 job 会延迟 input、render 和其他任务。参见
[MDN JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
与 [web.dev long-task guidance](https://web.dev/articles/optimize-long-tasks)。本案不试图改变平台：

- cold path 编译 direct plan/index，hot path 不做 schema admission、目录扫描或 lifecycle lookup；
- 大内容按 addressable unit 加载，作者列表 virtualize；
- 长任务、heap、启动图与加载阶段由现有 benchmark、profiler 和真实项目测量；
- 只有测量证明主线程隔离有持续价值时才讨论 Worker 或新的 Host boundary。

同一 JavaScript realm 中由产品选择的 React/npm/TS 代码是可信应用代码。SillyMaker 只提供清晰
authority、生命周期、局部 fault boundary、typed ports 与最佳实践；不监控或禁止其修改
`document.body`、注册全局 listener、访问网络、阻塞主线程或使用平台 API，也不增加 Proxy、
descriptor 认证、Shadow DOM 强制、listener interception 或伪 sandbox。真正不可信代码属于未来
iframe/Worker/process 隔离车道。

## 3. 容量合同

Scene 与 GUI 的合法内容量由输入资源预算和实际可用内存/时间约束，而不是由某个早期示例推导的
64、128、256 等产品语义上限约束。

删除：

- 单 Scene 的 entries、cues、visual objects 与 layers 数量上限；
- 单 object 的 region/motion/timeline/interaction/GUI-control 引用数量上限；
- 单 render entry 的 hit regions 与 frame assets 数量上限；
- Region document、Chrome layout 和一次 presentation dispatch list 的任意数量上限。

保留：

- 不可信 source bytes 的 max bytes/depth/nodes/array items/object members/string bytes；
- 防止递归算法或几何算法失控的明确 depth/vertex/coordinate 预算；
- ID/label/value 范围、唯一性、引用闭包、CAS/generation/currentness；
- Save/wire/RPC/input payload 等真实跨边界资源预算。

这些输入资源预算必须按其真实用途命名和说明，不能再作为 gameplay/authoring capacity 宣称。
大项目仍应通过 M2 的 chapters/units 获得局部加载和工作集，而不是把一个无限大的 Scene 常驻内存。

## 4. 正交作者模型

### 4.1 Spatial Scene

Authoring Scene 继续拥有逻辑 canvas、有序 layers/object hierarchy、local transform、paint order、
Stage target、hit region、Motion/Timeline 与 intent references。它编译到现有扁平 Stage direct plan；
CSS 不参与空间 transform、paint 或 pick authority。

本层继续吸收
[上一轮提案的 Unity / Unreal / Godot 分层](scale-scene-object-and-modular-gui.md#4-业界参照与取舍)，
但不引入 ECS、第二 Scene runtime 或通用 Blueprint VM。

### 4.2 DOM GUI composition

传统 Web GUI 使用独立 `sillymaker.gui-composition` 文档。文档是 stable-ID tree：每个 node 选择一个
build-known `viewId`，携带 admitted JSON props，并把 children 放进该父 view 声明的命名 slots。

```ts
interface GuiCompositionNodeV1 {
  readonly nodeId: string;
  readonly viewId: string;
  readonly props: StrictJsonObjectV1;
  readonly slots: Readonly<Record<string, readonly GuiCompositionNodeV1[]>>;
}
```

slot 语义属于 parent definition，不存在全局万能 `children`、万能 layout record 或 runtime slot
registry。第一方或产品可以提供 `flow`、`grid`、`overlay`、`canvas_scaled`、`canvas_anchored` 等普通
React/CSS view；它们各自声明 props、slots 和 authoring descriptor。数组顺序只定义该 parent slot
内的次序。

### 4.3 Code Surface

`CodeSurfaceDefinitionV1` 是 code-side、build-known definition：

- stable `viewId`；
- literal dynamic `import()` loader；
- 一次 props admission；
- parent-specific slot IDs；
- authoring descriptor（label、公开属性、outer preview/placeholder、state-owner hint）；
- input/native-text/portal policy 与只读 application context。

GUI JSON 不包含 npm package name、module path/URL、JSX、React component、CSS module hash、任意 CSS
文本或可执行表达式。应用静态 catalog 把 `viewId` 映射到 literal loader；compiler 一次性解析
unknown view、unknown slot、props 与 duplicate identity，输出 direct definitions。render path 不查动态
registry。

按 React 官方合同，代码可用 [`lazy`](https://react.dev/reference/react/lazy) 与
[`Suspense`](https://react.dev/reference/react/Suspense) 延迟到首次真实 render；Vite 对 literal dynamic
imports 与其 CSS 进入独立 chunks 的行为由平台工具链拥有，参见
[Vite features](https://vite.dev/guide/features)。引擎不重做 module graph。

每个 node 可有局部 Suspense/Error Boundary：它缩小 render/lifecycle fault 的可见半径并报告
`compositionId/nodeId/viewId/error`，但不宣称捕获 event handler、普通 async callback 或全局副作用。
同 `(nodeId, viewId)` 的更新保留 React local state；删除 node 或改变 `viewId` 正常 unmount，资源 cleanup
由 React effect 或组件自己的 typed resource owner 完成。

### 4.4 CSS、input 与 state ownership

- parent Code Surface 拥有自己命名 slots 的内部布局和 CSS；child 拥有自身 root 内的 DOM/CSS；
- Host 只拥有 surface 外框、macro stacking、focus/input/native behavior 和受控 portal root；
- 主题通过现有 CSS custom properties/tokens 协作；global npm CSS 作为可信应用代码，不承诺隔离；
- Inspector 以后只编辑 definition 明确公开的 props/variant 与外框，未声明 authoring metadata 的 view
  显示为 opaque preview，不反编译 DOM/CSS；
- rich editor、Agent conversation 等通常把 draft/selection/scroll/transcript 留在 React 或专用
  session/RPC store；它们只有显式提交的产品事实进入 authoritative State。

## 5. Addressable runtime units

M2 统一以下逻辑单位的寻址、readiness 与生命周期：

- Scene runtime plan；
- Narrative chapter/segment control plan；
- GUI composition plan；
- Code Surface JS + CSS chunk；
- text/i18n pack 与 assets。

每类 unit 保留自己的 schema/compiler/loader；不创建万能 content object 或 loader framework。共同合同：

1. stable logical ID 与 immutable application-generation manifest；
2. Host 在会引用 unit 的 authoritative command 前完成 acquire/load/admission；
3. concurrent acquire single-flight；失败可重试且不替换 current predecessor；
4. activate 后 hot consumer 持有 direct typed plan；
5. release 清理 live parsed indexes、subscriptions、DOM/React instances 与显式资源；
6. 不宣称 ESM module 或注入过的 CSS bytes 从浏览器缓存物理卸载；
7. 不在第一轮增加 LRU、预测调度器、Worker pool 或跨平台 cache framework。

Scene/Narrative 的跨 unit reference 必须在 build/check 建立闭包与 diagnostics。Save 只保存 stable
content/control position 与既有 application identity；load/replay 通过同一 generation manifest 重新取得
unit，不保存 parsed plan 或 module object。

## 6. Runtime Inspector

继续扩展当前 standalone/embedded Inspector，而不是恢复 Studio 或建立第二 authoring runtime。只读
runtime facets 包括：

- current Scene/Narrative/GUI unit 与 loaded/acquiring/failed/released 状态；
- acquire/decode/admit/activate 原始 timing、resident owner 与最近 diagnostic；
- Code Surface 的 `nodeId/viewId`、layout domain/outer geometry、load/fault/lifecycle、state-owner hint、
  portal/native policy 与 source location；
- 当前工作集与未加载 reference。

Inspector 不认证完整 DOM/component identity、不枚举每个 listener、不证明 source text 或 module graph，
也不成为性能采样框架。

## 7. i18n V1

在现有 text catalog/pack 上增加 locale-addressable variants，不创建第二 text system：

- stable `textId`，default locale reference closure 必须完整；
- 其他 locale 可部分覆盖并沿声明 fallback 查找；
- 只加载 active locale、fallback chain 和当前 content units；locale 切换原子替换 presentation owner；
- locale/profile 是 Host/presentation preference，不进入 gameplay State；
- 翻译者可以直接编辑文本 pack；不恢复 byteLength/SHA/declared-entry receipt；
- V1 保持 `textId -> string`，复杂格式继续用显式 TypeScript/React/平台 `Intl`，直到真实作品证明需要
  更丰富 message syntax。

## 8. Private Mod Runtime V1

M5 只激活 **private、build-known、application-local** Mod Runtime，不激活 roadmap 中的 public
resolver/ABI/SDK/distribution：

- base product 在不含 Mod Runtime 时完整可运行，final graph 结构排除它；
- 游戏声明自己的 stable extension points、允许的 contribution kinds 与 merge/collision policy；
- declarative mod 只能引用允许的 Scene/Narrative/GUI/text/asset stable IDs；
- trusted code mod 通过 literal loader 贡献 build-known definitions；
- private Direct Extension Runtime 只拥有 mount/dispose、nested lifecycle 与 generation fencing；
- active mod set 在一个 application generation 内 immutable，改变集合经 successor/rebootstrap，而不在
  live Session graph 上热改；
- unknown target、missing dependency、duplicate/collision 与 candidate failure 原子失败，predecessor 保留；
- 影响 authoritative simulation 的 contribution 进入现有 application/simulation identity 与 Save policy；
  不增加第二 State、per-mod State authority 或独立 migration framework。

公共 manifest resolver、external SDK、市场/分发、post-release arbitrary code installation、不可信代码
sandbox 与热安装继续 incubation，必须另行满足 roadmap gates 和接受新计划。

## 9. 验收与后续作品

本轮只用小型原创/生成式 conformance：

- 越过旧 Scene/Region/frame/dispatch/layout 阈值；
- 两个按需 Scene/Narrative units 与一个小型 GUI composition；
- 一个本地 lazy Code Surface，证明 slot、input/IME/portal、local fault 与 cleanup；
- 两个 locale units；
- base + 一个 data mod + 一个 code mod，并证明 no-Mod graph exclusion。

不引入真实第三方富文本组件、fake Agent conversation、商业内容或 SillyOS 大型范例。本轮关闭后再单独
重做 SillyOS，作为 Agent 产品、React 生态嵌入、工程局部性和长期主线程性能的综合验证；并行/后续作品
重写同样只回报可复现的引擎缺口。

持续 benchmark 输出 raw measurements：GUI readiness/interactive、initial JS/chunks/CSS、unit fetch/
decode/admit/activate、current working-set heap、authoring index、command/render hot path 与 main-thread
blocking/long-task observations。没有持续产品预算时不做自动 promotion 裁决。

## 10. 非目标与停止条件

非目标：最终 editor/Blueprint/Timeline、任意 DOM/CSS 可视编辑、通用 plugin marketplace、public Mod
SDK/distribution、浏览器 sandbox、Worker scheduler、第二 State/Scene runtime、Desktop HMR promotion。

仅在以下情况停下请求裁决：

- 必须改变 public/wire/Save/digest/replay 可观察兼容语义；
- 需要第二 writable authority，或 async Host I/O 必须进入 authoritative command；
- Scene paint/pick、GUI layout/focus 或 Mod collision 出现两个无法归并的真实 owner；
- measured long task/heap regression 的最小修复必须引入新的隔离边界或 runtime owner；
- M5 无法保持 private/build-known/application-local，必须提前激活 public resolver/SDK/distribution。

private helper shape、测试拆分、组件文件位置和等价 CSS 实现由实施选择最简单、可验证方案继续。
