# Narrative aside 提案（插话：hold 进行中的零权威台词批）

状态：**2026-08-27 所有者下令开启（M0–M3 交付中）**。下令语带两条硬
约束：引擎侧新需求必须**通用**（不是实验仓专用形状），且与既有引擎能
力保持**正交**（不动已交付合同）；open questions 按建议随 admission
固化。兑现 [mid-hold-input](mid-hold-input.md) 交付后实验仓台账里明
记的 ENGINE 缺口：围栏写与 `when` 臂改道已闭合，但原作在并行事件持条
时叠在画面上的**风味台词**至今无处落——pending 槽是权威轨，塞进去要
么停条要么造第二决议路径。本文只定合同；切片顺序与 admission 由
[Narrative Aside V1 计划](../plans/2026-08-27-narrative-aside.md)
拥有（交付记录也在该计划）；
[production-floor sequence](../plans/2026-07-30-production-floor-sequence.md)
仍是唯一跨计划排序入口。

一句话：**台词不一定是决议。把「一次性、零权威的台词批」做成
commit-only 表现通道家族的第三个类型化成员（transient effect 同族推
流），由 Story 命令的领域事件投影产生、宿主本地翻页退场——pending 槽、
hold 算术、决议合法性、Save/replay 零改动。**

## 证据门

- **实验仓 CE18 条中途（hold 路径）**：mid-hold-input 关闭记录钉死的
  活路径（`imouto.zone_press` 围栏写 + CE20 看门狗 `when` 臂）落了数
  值（+5 分钟）、shaped-hit-regions 保住了插图，但原作 CALL 的 SAY
  页（两页亲吻台词）被显式砍掉——实验仓 fidelity 台账 E3 明记为
  ENGINE 缺口：「say 无法叠加在 running hold 上」。
- **实验仓澡窗「先条后句」家族**：澡按摩/洗身位一系（克隆刀
  #365–#369、#372 备注）原作是台词与跑条同屏，克隆全部改序为「条结
  束后补句」——同一缺口的一整批既有消费者，本合同落地后可逐刀回填。
- **Engine Lab 证据缺口**：演习绊线 hold 的围栏写（样本箱热区 →
  `lab.engage_collector`）只有数值落账，conformance 从未覆盖「hold
  进行中给玩家一行文字反馈」的表现路径。
- **显式不收**：choice-over-hold（实验仓 R6 触摸菜单常驻）不在本
  lane——choice 有决议权与 occurrence 生命周期，是权威轨问题，证据
  不足不立项。

## 勘探结论（2026-08-27，逐条有实证）

1. **pending 槽是权威轨，不可承载。** say pending 的 advance 是
   occurrence 围栏决议（`narrative-managed-surface-family.ts` 的
   `dispatchAdvanceInternalV1`），进 Save/replay；hold 挂起期间
   `evaluateInteractionResolution` 对输入决议恒拒
   `interaction.kind_mismatch`（mid-hold-input 勘探原文）。并行台词
   若做成第二 pending 轨，即第二决议路径——已关三条 lane
   （hold-when / mid-hold-input / shared-stage-input）反复重申的停线。
2. **commit-only 表现通道家族已有两个成员，保留语义现成。**
   - `projectStageCueDispatches` → 最新批，semantic revision +
     epoch 精确配对，错配即丢（cue-identity；`core-game-application.ts`
     stamp 于首个 semantic 订阅者）。
   - `projectTransientEffects` → 推流，`effectSequence` + epoch，消
     费者水位线去重（SFX；`asset-demand.ts`、AudioPresenter
     `onTransientEffect`）。
     台词批必须在**后续 commit 之间活着给人读**——hold 每滴答一次
     revision +1，精确 revision 配对会在一秒内把字打掉，物理不适；推
     流 + 水位线语义恰好：一次推送、当场消费、load/bootstrap 不重放。
     不发明第三种保留语义。
3. **说窗像素本来就是 Story 画的。** 引擎宿主只 portal Story 渲染器
   （`defineNarrativeSurfaceV1` /
   `NarrativeSurfaceDialogueRendererPropsV1`），`data-dialogue-*` 标
   记全在 Story `ui.tsx`。插话窗同理：引擎交合同与控制器，不开始画窗。
4. **isolation / 焦点政策零牵连。** 插话不经 narrative-surface-host
   （不是 entry）、不注册 `useStageInputIsolationV1`、不夺焦点；
   shared-stage-input 交付的宿主谓词与 `game-stage.tsx` 政策公式零改
   动。舞台输入可达性仍由挂起中 pending 的 `stageInput` 声明独裁。
5. **命名核查。** `transient`（base SFX 流）、`overlay`（ui 工作区
   叠层家族）、`notice`（base `noticeTextIds`）均被占用；`aside` 全
   库无占用，且戏剧术语语义精确（面向观众、不进剧情的插话）。

## 合同（V1）

### 1. 类型与准入（base）

```ts
export interface NarrativeAsidePageV1 {
  readonly speakerTextId: string | null;
  readonly textId: string;
}

export interface NarrativeAsideV1 {
  readonly asideSequence: number;
  readonly epoch: number;
  readonly pages: readonly NarrativeAsidePageV1[];
}
```

- 页字段与 say pending 同名同准入（interaction id 模式）；
  `parseNarrativeAsidePagesV1` 一次准入：1–16 页、精确键记录、
  `speakerTextId` 可空。
- 语义：一批 = 一次插话（顺序页）；每 commit 至多一批。

### 2. 投影钩子与实例推流（base）

`CoreSemanticAdapterV1` 新增第三个 commit-only 表现钩子：

```ts
projectNarrativeAside?(
  events: readonly DeepReadonly<TTypes["event"]>[],
): readonly NarrativeAsidePageV1[];
```

- 空数组 = 本次 commit 无插话。实例准入一次并盖章（`asideSequence`
  实例内单调 + 当前呈现 epoch），推给
  `subscribeNarrativeAsides(listener)`（与
  `subscribeTransientEffects` 并列）。
- 投影抛错 / 产物非法 → observer fault，fail-open：本次 commit 无插
  话呈现，权威结果不受影响。
- 永不进入 State / Save / digest / replay / SemanticPublication；
  load、bootstrap、restart、rollback 不重推（epoch 语义与
  transient effect 逐字一致）。被拒 / faulted 命令零推送。

### 3. 消费控制器（ui）

- `createNarrativeAsideControllerV1`：无 DOM 纯状态机 +
  `useNarrativeAsideV1` React 包装（订阅接线）。
  - **丢弃**：epoch 错批、水位线以下重推、到达时权威对话
    （say / choice pending）挂起。
  - **展示**：本地页游标；`advance()` 翻页，末页翻页即退场；新批到达
    替换旧批（游标归零）。
  - **强退**：say / choice pending 出现（权威说窗独占对话面）、
    epoch 变更（load / rollback / restart）。
  - 全程零 semantic dispatch：翻页与退场是纯呈现动作，不触碰命令面。
- 像素归 Story 渲染器：content-sized、自吃自己的点击（现有层 CSS 合
  同不动）；引擎不新增窗组件、不新增 stage layer。

### 4. 权界重申（不动，防散落）

- 插话无 `occurrenceId`、无决议、无路由权；规则 / `when` 臂 /
  digest / replay / 命令身份永不读它。
- pending 槽合同、hold 算术（`TimeTickV1` / `settleHoldTimelineV1`）、
  `evaluateInteractionResolution`、narrative-surface-host 谓词、
  `game-stage.tsx` 政策公式零改动。
- regions 仍无路由权；不出第二决议路径。插话不是第二条 narrative
  pending 轨——若某天需要**可决议**的并行轨（choice-over-hold），另
  立提案重议权威模型。

## 边界与限额

- 每 commit ≤ 1 批；每批 1–16 页；id 准入与 pending 文本 id 同模式。
- V1 无 auto 翻页 / 打字机 / History / 语音合同——Story 可自接
  presentation clock 与自家字效，插话不进对话 History（零权威、无日
  志）。
- 存档在插话展示中途落下时插话不入 Save，读档后消失（与 SFX 同一记
  档语义，文档明记）。
- 不改 `SemanticStageV1`、不给舞台几何、不新增 z 层。
- choice-over-hold（实验仓 R6）显式不在本 lane。

## 验收草案

- **base**：准入界（页数 0 / 17 拒、非法 id 拒、精确键拒）；盖章
  （sequence 单调、epoch 当前）；投影抛错 fail-open；被拒命令零推；
  load / restart 后零重放且 epoch 推进；调试提交同路。
- **ui（纯函数 + jsdom）**：打开 / 翻页 / 末页退场；say / choice 到
  达即强退；挂起 say / choice 期间到达即丢；epoch 变更清空；水位线去
  重；新批替换；全程零 dispatch。
- **Engine Lab**：绊线 hold 围栏写附带两页插话；jsdom——条上插话可
  翻、hold occurrence 与余额不动、`when` 改道 catch say 时插话强退；
  浏览器真实指针半张证据（点样本箱 → 插话弹出 → 翻页 → 条照走）。
- **实验仓消费（克隆侧，不进本 lane 验收）**：条中途嘴区 CE18 台词页
  上插话——时钟 +5、右手插图在、条不动、台词可读。

## Open questions（2026-08-27 开启时按建议固化）

1. **通道语义**：推流（transient effect 同族）还是最新批（cue 同
   族）？（建议：推流。hold 每滴答一次 revision +1，精确配对会在一秒
   内打掉要读的字；复用既有水位线保留语义，不发明第三种。）
2. **承载面**：引擎画窗还是 Story 画窗？（建议：引擎交类型合同 + 控
   制器（配对 / 翻页 / 退场），像素归 Story——与说窗 /
   dialogue-player-controller 的既有分工同构。）
3. **命名**：（建议：`aside`。transient / overlay / notice 均被占，
   aside 全库无占用且语义精确。）
4. **权威对话互斥**：挂起 say / choice 时到达的插话丢弃还是排队？
   （建议：丢弃。排队要发明一个无权威的队列生命周期，超出现有证据；
   Story 若需要顺序保证，把台词并进权威 say 即可。）

## 停

- 插话获得任何决议 / 路由权，或被规则、`when` 臂、digest、replay 读
  取 → 停。
- 插话需要进入 State / Save / History / 命令身份 → 停。
- 实现中发现必须动 pending 槽合同、narrative-surface-host 政策、
  `game-stage.tsx` 公式或层合同 → 停下重议。
- 需要可决议的第二条 narrative pending 轨 → 停（另立提案）。
