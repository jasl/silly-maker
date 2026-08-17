# Cue identity proposal（presentation-only 表现边 cue 上下文）

状态：提案（2026-08-17）；同日所有者批复全部 open questions（裁决见文末，已并入
案文正文）并**接受本提案**；**V1 实现切片同日交付**（交付记录见文末；批列表字
段按 admission 定名为 `dispatches`，与既有 timeline cue registry 的 `cues` prop
区分）。**第二消费者验收同日完成**（外部实验仓撤销其唯一
裂 tag；验收记录见文末，回灌两处引擎修正）。边界由
[Authoring Architecture 计划](../plans/2026-08-15-authoring-architecture.md)的
"Cue identity（presentation-only）设计裁决"拥有；本文是该裁决要求的独立设计
文档。证据门已满足：

- **A5 第 1 轮缺口 1**：跨场景同 edge 元组（kind+layer+tag+content）绑不同
  motion 时后者被静默盖住。lint（`scene.cue_binding_collision`）已把静默失败
  变成显式失败，但没有解开表达。
- **A5 第 2 轮**：lint 拦截后的合同性代价——"同一人物两种登场必须裂 stage
  身份"，按建议裂 tag 绕开成本 4 编辑点，且把纯表现差异写进内容身份。
- **真实内容迁移预检 +1**：第二登场立绘"同 tag 同 content 故意无 motion"复现
  bound-vs-unbound 泄漏变体，迁移按先例裂出第二个 tag——同一个角色在
  舞台上成了两个条目，hide/show 协调变成内容自己的负担。

[场景创作模型设计](../design/scene-authoring-and-studio.md)已预留本扩展：
"若未来出现真实场景，再评估 commit 发布的 TransitionRequest 携带 cue 身份
（vn-presentation-runtime §3.1 已预留），那是唯一可能触碰 runtime 合同的
扩展"。真实场景已到，本文即该评估。

## 问题

cue 身份在 mutation 落进权威状态时被抹掉：`cueMutations(cueId, stage)` 返回
普通 `StageMutationV1` 批（字节等同手写，这是 Save/digest/replay 不受影响的
根基，必须保持），reconciler 在提交边上 diff 两个 `StageRenderTargetV1` 得到
`StageTargetChangeV1 { kind, layerId, entryKey, previous, next }`，transition
catalog 只能按这个元组匹配。两个 cue 打到同一条边时，"播哪条 motion / 是否
故意瞬切"这件纯表现的事没有任何合法表达位，只能污染内容身份（裂 tag）。

## Shape（设计草图；字段名以实现切片的 admission 为准）

### 1. 词汇：一次提交的 dispatch 列表

```ts
type StageCueDispatchV1 =
  | {
    readonly sceneId: string; // scene.…（既有 id 模式与 96 字节上限）
    readonly cueId: string; // cue.…（同上）
  }
  | {
    readonly sceneId: string;
    readonly open: true; // openMutations 批（场景 open/重开）
  };
```

一次已提交语义 revision 至多携带一份有界列表（上限随实现 admission 定，量级
为个位数到 32；最终数值按 open question 裁决 #4 等实验内容迁移完毕后定）。它是
**表现边上下文（presentation edge context）**：描述"这条提交边由哪些 cue
dispatch / 场景 open 产生"，V1 内容仅这两种（open 形态按裁决 #2 进 V1 词汇，
使 wire 形状一次定型），不预设其他扩展。

### 2. 产生：从已提交 facts 投影（transient effect 同族）

复用既有 commit-only 通道族。`CoreSemanticAdapterV1` 增加可选投影（与
`projectTransientEffects` 同形）：

```ts
projectStageCueDispatches?(
  facts: readonly DeepReadonly<TTypes["fact"]>[],
): readonly StageCueDispatchV1[];
```

- Story 的 stage 节点/交互效果在执行处本就手握 cueId（`openMutations` 调用处
  同理手握 sceneId）；它以自己的 fact 词汇记录"发生了什么"（新增 fact 种类与
  今天新增任何 fact 相同，是 Story 自己的词汇演进，引擎不新增要求），投影函数
  把 facts 映射为 dispatch 列表。
- 实例在提交时以与 `TransientEffectV1` 相同的纪律盖章配对：**恰好绑定产生它
  的那一个语义 revision 与当时 epoch**；不存储、load/bootstrap 发布不携带
  历史、同 revision 重投影不重发、epoch 变化清零。
- 显式排除的替代通道：全局 current-cue 变量（竞态且被裁决禁止）、从落点
  occurrence 反推路径（汇聚路径下不成立，是启发式不是合同）、把 cueId 写进
  mutation/command（改变 simulation command identity，禁止）。

### 3. 传递：retarget 携带，revision 不符即丢弃

`StageRetargetInputV1` 增加可选字段（名称示意）：

```ts
interface StageRetargetInputV1 {
  readonly target: StageRenderTargetV1;
  readonly revision: number;
  readonly epoch: number;
  readonly cues?: readonly StageCueDispatchV1[]; // 新增，可选
}
```

`SemanticStageV1` props 同步增加可选 `cues`；组合层（narrative composition 的
barrier 感知 delegate、acknowledged-run 路径的 retarget 信封）原样转发。配对
语义是安全性质的核心：**缺失只会退化（走现行解析），存在必须精确**——上下文
的 revision 与本次 retarget 不符即丢弃；同 revision 重投影与 epoch 提升沿用
既有 commit-only / 围栏规则，天然不会重放或跨界携带。

### 4. 消费：change 附带、catalog 解释，reconciler 不解读

reconciler 把本次 retarget 的 dispatch 列表**原样**附到这条提交边 derive 出的
每条 change 上：

```ts
interface StageTargetChangeV1 {
  readonly kind: "enter" | "exit" | "replace" | "appearance" | "move";
  readonly layerId: StageLayerIdV1;
  readonly entryKey: string;
  readonly previous: StageRenderEntryV1 | null;
  readonly next: StageRenderEntryV1 | null;
  readonly cues?: readonly StageCueDispatchV1[]; // 新增，可选
}
```

引擎不解释哪个 cue 对应哪条 change——cue → (kind, layerId, tag, contentId)
的映射知识在场景文档里，归 Story 侧目录。`resolveTransition(change)` 签名
不变；忽略新字段的既有 catalog 完全不受影响。

### 5. 场景绑定：cue-first 解析，回落逐字节等位

`sceneStageTransitionBindingsV1` 的解析顺序变为：

1. **cue-first**：change 携带的 dispatch 里若有属于本场景、且其声明边
   （kind+tag → layer/entryKey/content）与该 change 精确一致的 cue，按该 cue
   的文档声明解析——绑了 `motionId` 播 per-cue motion transition；声明了
   **显式 cut**（见下）返回合成的 `kind: "cut"` 定义（非 null，压制外层
   目录）；两者皆无返回 null 落回（外层规则照常适用）。per-cue 派生 id
   `sceneCueTransitionIdV1(cueId)` 不变，Workbench 点击反查与 barrier 按
   transitionId 匹配继续成立且更精确。open dispatch 不指名 cue，不参与
   cue-first 匹配；**本场景自己的 open** 保持无上下文回落语义（裁决 #2），
   外场景 open 与"上下文存在但本场景无 dispatch 解释"一样不落回（见 2）。
2. **edge-tuple 回落**：无上下文（非 cue 来源的 mutation、自动化、上下文被
   丢弃）时查现有精确匹配表——回落表保留"该边全部绑定 cue 的 motion 与
   effective edge options 一致"的条目（即今天 admission 合法的全部形态），
   因此**无上下文时行为与今天逐字节一致**；效果分歧的多绑定边不进回落表。
3. 都不中返回 null，落回 Story catalog（现行合同）。

**显式 cut 声明**（裁决 #1 采纳）：cue 在场景文档里声明"这条边故意瞬切"
（字段示意 `cut: true`，与 `motionId` 互斥，admission 拒绝同时出现）。复杂度
核实为低——`"cut"` 本就是 `StageTransitionKindV1` 的既有成员、reconciler 对
`kind: "cut"` 已按瞬切处理（不启动 run）、组合目录里非 null 返回天然压制
外层；净增量只有文档一个互斥字段 + bindings 为它合成一条定义。它让"故意
瞬切"不再依赖"外层规则碰巧接不住"，与 motion 绑定同为一等表达。显式 cut
只经 cue-first 命中生效（无上下文时该边走回落表/外层规则，与今天一致）。

admission 相应松绑但保持 fail-closed：同边多 cue 绑不同 motion / 不同 edge
options 从拒绝（`scene_cue_binding_ambiguous` /
`scene_cue_edge_options_conflict`）变为合法的 per-cue 绑定；这类分歧边只能由
上下文解析，无上下文命中时返回 null（瞬切）并发一条 dev 诊断。跨场景
`scene.cue_binding_collision` lint 的最终处置归实现切片（保守起点：双方都
per-cue 可解的组合降级，其余维持报错；最终处置按裁决 #3 等实验内容迁移完毕后
再评估）。

### 6. 不进入清单（与裁决一致）

`SemanticStageStateV1`、`StageMutationV1`、command schema 与 simulation
command identity、Save、state digest、replay 语义、`sceneCueTransitionIdV1`
派生、ambient catalog、acknowledged-run 证明机制：一律不变。上下文是提交边
的暂态注记，不是状态；丢掉它的最坏结果是退回今天的表现。

## 边界与非目标

- **按次序选不同 motion**（同一 cue 第 N 次触发选第 N 条）维持 defer——上下
  文携带"是哪个 cue"，不携带"第几次"；真实场景出现再另案。
- load / rollback / rebootstrap 不携带上下文（epoch 围栏既有规则；恢复稳定
  target 本就不派生边）。
- 非 cue / 非 open 来源的舞台变更（gameplay `setPlacement`、直接 mutation）
  不产生上下文，走现行解析。`openMutations` 批按裁决 #2 产生场景级 open
  dispatch（词汇与管线 V1 就位）；其绑定解释 evidence-gated——V1 绑定对 open
  上下文按无上下文回落处理，预期首个消费者是文档级 open 表现声明（如
  `open` 边整体瞬切/整体某 motion），等"场景重开需要区别表现"的真实场景
  激活，届时零 wire 变更。
- 不建通用"表现事件总线"：V1 的上下文内容只有 cue dispatch 与场景 open
  两种。

## 验收草案

- 三条证据案例全部不裂 tag 可表达：同场景一条目两种登场（两 show cue 各播
  各的 motion）；同边一 cue 有 motion、一 cue 以**显式 cut** 声明故意瞬切
  （压制外层规则，不再依赖外层碰巧接不住）；跨场景同边不同 motion 各自
  解析，无静默覆盖。
- **双消费者**：外部实验仓撤销裂 tag（第二登场立绘回归共享 tag，
  瞬切语义由显式 cut cue 表达）；仓内 example（cat-cafe 或
  template）给同一条目落第二个真实登场变体。
- **无上下文退化等位**：不改内容的前提下，既有 e2e、浏览器断言与全部
  simulate digest 逐字节不变；关掉投影函数（不提供 `projectStageCueDispatches`）
  等价于今天；open dispatch 在 V1 绑定下按回落处理（等位断言覆盖）。
- reduced-motion / readiness / interruption / input policy 语义不变（上下文
  只参与"选哪条 definition"，不改变 run 语义）。
- lint 案例更新：原 `scene_cue_binding_ambiguous` 拒绝样例改写为 per-cue 双
  绑定的通过样例 + 无上下文瞬切诊断样例。

## Stop conditions

- 上下文成为权威状态、Save、digest、replay 或命令身份的正确性依赖 → 停；
- 配对需要把上下文存进 session/Save、或 load 后重发历史上下文 → 停；
- catalog 解析需要跨调用可变状态（等价于 current-cue 全局变量）→ 停；
- reconciler 需要解释 cue 语义（超出"原样附带"）→ 停，回到设计；
- 触碰 `StageTargetChangeV1`/reconciler 的实现超出本文声明的可选字段 → 停。

## V1 交付记录（2026-08-17）

- **词汇与 admission**：`StageCueDispatchV1`（cue / open 联合）、
  `parseStageCueDispatchesV1`（严格 admission：id 模式、96 字节、`open: true`
  字面量、临时上限 `stageCueDispatchLimitV1 = 32`）、
  `StageCueDispatchBatchV1 { revision, epoch, dispatches }`
  （`engine/packages/base/src/contracts/stage-transition.ts`）。
- **产生**：`CoreSemanticAdapterV1.projectStageCueDispatches?(facts)`；实例在
  提交处一次 admission（失败即丢上下文 + observer fault，提交照常呈现）、以
  该提交的语义 revision 与当时 epoch 盖章、只保留最新一批
  （`instance.stageCueDispatches()`），anchor 替换（load/import/restart/
  rollback）清零；debug 提交走同一路径。
- **传递**：`SemanticStageV1` 可选 `dispatches` prop 做 revision+epoch 精确配
  对（不匹配即丢弃）；`StageRetargetInputV1.dispatches` 原样进 reconciler；
  claimed 的 acknowledged-run / presentation-generation 捕获按精确键纪律接受
  可选键。
- **消费**：reconciler 把列表原样附到本条提交边的每条
  `StageTargetChangeV1.dispatches`；`sceneStageTransitionBindingsV1` cue-first
  解析（motion / 合成 `kind: "cut"` / 裸 cue null），上下文存在而本场景无
  dispatch 解释该 change 时不查回落表（消灭跨场景静默覆盖——对 cue 与外场景
  open 一律适用；**本场景自己的 open** 保持无上下文回落语义，裁决 #2。实验仓
  撤销裂 tag 的第二消费者证实了细化的必要：第二场景 open 的共享 enter
  边不得被开场入场绑定经 open 资格偷走）；回落表仅保留"全部绑定一致"的边，
  无上下文行为逐字节等位；分歧边无上下文发
  `scene.cue_binding_context_missing` 观察诊断。
- **文档 admission**：`SceneCueV1.cut?: true`（与 `motionId` 互斥）；同边分歧
  声明合法（`scene_cue_binding_ambiguous` / `scene_cue_edge_options_conflict`
  拒绝退役）。lint 保守起点：声明对声明不再诊断，声明对裸 cue 保留
  `scene.cue_binding_scope_collision`（建议改为显式声明，不再建议裂 tag）。
- **首个消费者（template）**：kit stage 节点带静态 `dispatches` 注解 → 叙事
  推进器收集 → `template.stage_changed` fact 携带 → adapter 投影 →
  composition 传 prop；开场新增"取猫"节拍——`mei-fetches`（hide, cut）与
  `mei-returns`（show, cut）同边分歧于 `mei-enters` 的仪式性入场 motion。
- **验证**：`deno task check` 全绿（4,964 单测，含 base 合同/reconciler/
  SemanticStage 配对/core 实例发射/lint/template 目录与 playthrough 新用例；
  determinism、五个 Story `story check`、e2e 构建）；引擎切片先行通过全量
  等位门（内容未动时 299 文件全绿三连）；浏览器 examples 套件 81/82 过
  （1 例为 vite 依赖优化器暖身竞态，隔离重跑双浏览器过），template spec 新增
  取猫节拍断言。

## 第二消费者验收（2026-08-17，外部实验仓）

实验仓撤销其唯一裂 tag：第二登场立绘回归与首场景相同的舞台身份（共享
tag），第二场景的 show/hide cue 声明显式 `cut: true`；dispatch 链在实验仓全
线打通（interaction-kit stage 节点静态标注 → runner 收集 → stage_changed
fact 携带 → `projectStageCueDispatches` 投影 → composition prop）。验收证据：
实验仓 vitest 24 文件 419 例（组合目录 cue-first 解析矩阵：入场 motion /
第二场景 cue cut / 外场景 open null / 无上下文等位）、e2e 7/7 新增"第二登场
立绘出现瞬间即 settled"断言、opening simulate digest 经 stash 对照逐字节不变。

验收回灌两处引擎修正（同日交付，主仓侧）：

1. **外场景 open 回落资格收紧**：V1 原按"open dispatch 一律视同无上下文回
   落"，第二场景 open 的共享 enter 边被首场景入场绑定经该资格认领——正是本提案要
   消灭的跨场景静默覆盖换了入口。修正为**仅本场景自己的 open** 保持无上下文
   回落语义（裁决 #2 的实现级澄清）：本场景 open 真实产生其声明条目的边；外
   场景 open 与"上下文存在而本场景无 dispatch 解释"同样不落回。
2. **批盖章前移到发布前**：盖章原在 `session.dispatch()` 返回后进行，而 web
   宿主在发布通知里同步 flush React，rev N+1 的首帧 retarget 在盖章前发生，
   配对失败退化为无上下文。修正：session 的 `onAttempt`（发布前钩子）暂存已
   提交 facts，实例作为 semantic port 的**首个订阅者**在 UI 收到通知前完成
   admission 与盖章；debug 提交走同一路径。配对语义（revision+epoch 精确、
   不匹配即丢弃）不变。

## 迁移后评估（2026-08-17，裁决 #3/#4 的数据与建议——所有者同日批复采纳）

裁决 #3/#4 的前置"实验内容迁移完毕"已满足（内容波收口、第二消费者落地）。
实验仓证据环全内容普查（叙事图可达性分析 + 全场景文档扫描，数据细节归实验
仓台账拥有）：

- **规模**：叙事图 3,905 节点、60 个 stage 节点，dispatch 密度每节点 1–2
  条（cue 18 / open 58）；**单次 commit 最大累积 4 条**（就寝链），无环。
- **声明形态**：23 场景 / 26 cue（22 bare / 3 cut / 1 motion）；共享边仅
  3 条——1 条跨场景分歧（撤销裂 tag 的角色 enter 边，cue-first 按设计工
  作）、2 条一致（合法留在回落表）；**declared vs bare 碰撞零出现**。

**结论（所有者批复采纳，2026-08-17）**：

1. **`stageCueDispatchLimitV1 = 32` 冻结为终值**（裁决 #4 关闭）。观测峰
   值 4 的 8 倍余量足以容纳蒙太奇式连续场景链；admission 上限只防病态输
   入，不是设计预算，不值得再引入一次 wire 变更去收紧。
2. **lint 保守起点原样转正**（裁决 #3 关闭）：同边分歧声明合法（两退役诊
   断不复活）、`scene.cue_binding_scope_collision`（declared vs bare）保
   留为错误、`scene.cue_binding_context_missing` 维持观察级。与真实内容
   形态完全吻合（唯一分歧边是立项场景本身，碰撞零出现——零误报零漏报）；
   仅当真实作者混淆证据出现时再议。

至此本提案全部裁决关闭，cue identity 线整体收口。

## Open questions 裁决（2026-08-17 所有者批复，已并入正文）

1. **显式 per-cue `cut`**：**采纳**（所有者倾向 + 复杂度核实为低——`"cut"`
   是既有过渡词汇成员、reconciler 已按瞬切处理、非 null 返回天然压制外层，
   净增量 = 文档一个互斥字段 + bindings 合成一条定义）。已并入 §5：显式 cut
   与 motion 绑定同为一等表达，只经 cue-first 命中生效。
2. **`openMutations` 携带场景级上下文**：**采纳**。open dispatch 进 V1 词汇
   与管线（wire 形状一次定型）；V1 绑定对它按无上下文回落处理，绑定解释
   （文档级 open 表现声明）等"场景重开需要区别表现"的真实场景激活，届时零
   wire 变更。已并入 §1/§2/§5 与边界节。
3. **跨场景 collision lint 的最终处置**：**等实验内容迁移完毕后再评估**。
   实现切片先交付保守起点（双方都 per-cue 可解的组合降级，其余维持报错）。
4. **每 commit dispatch 上限的具体数值**：**等实验内容迁移完毕后再评估**。
   实现 admission 先取保守临时值（个位数到 32 量级），以实验真实内容量级
   定终值。
