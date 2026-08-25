# Shared stage input 提案（narrative 挂起共享舞台输入）

状态：**2026-08-26 所有者裁决接受**（open questions 裁决：q1 值域全
收满——`say`/`custom` 一并收；q2、q3 按建议：焦点同键全放、定名
`stageInput`）。兑现
[mid-hold-input](mid-hold-input.md) 关闭记录里点名的最后一段路：命令
级组合（围栏写 / occurrence 决议）已全部交付，但 UI 宿主的一揽子
narrative isolation 仍把舞台热区 `inert`，真实浏览器里指针到不了。
本文只定合同；切片顺序与 admission 由
[Shared Stage Input V1 计划](../plans/2026-08-26-shared-stage-input.md)
拥有；
[production-floor sequence](../plans/2026-07-30-production-floor-sequence.md)
仍是唯一跨计划排序入口。

一句话：**isolation 从来不是安全机制，是 UX 政策；把它从「有 entry
就独占」改成「entry 逐个宣告」。** 决议合法性全在命令围栏（stale 整
拒、hold 对输入决议恒拒 `interaction.kind_mismatch`、zone_press 是
`expectedHoldOccurrenceId` 围栏写），管理面 admission/envelope/stable
authority 从不读 isolation 计数——勘探逐条证实拆掉这层 inert 不触碰
任何权威不变量。扩展 = pending 声明式 Host 提示
`stageInput: "shared"`（`pace` 同族：Story block 声明、pending 携
带、Host 消费、绝不进权威算术），宿主据此不注册 narrative stage
isolation、不夺焦点。

## 证据门

- **实验仓 CE18 自由摸（choice 路径）**：原作触摸菜单开着时身体热区
  照常收点击（菜单图片与热区图片是同一个 event 循环里的并列按钮）。
  克隆现状：zone 决议合同已接（zone click 决议 touch-menu 同一
  occurrence，`composition.tsx` 的 `zonePending` 分支），但 choice
  pending 的 narrative entry 一存在，`background` 层（`SemanticStageV1`
  与 hit regions 所在）就被 `inert`——指针物理到不了，合同空转。
- **实验仓 CE18 条中途（hold 路径）**：mid-hold-input 关闭记录钉死
  的活路径（`imouto.zone_press` 围栏写 + CE20 看门狗 `when` 臂）。
  同样问题：hold pending 的 entry 使层 inert；克隆 hold 分支还自己画
  了全画布 click-eater（那是克隆自己的 WAIT 光标语义，消费本合同时
  按 pending 声明收窄，不是引擎事）。
- **Engine Lab 证据缺口**：mid-hold-input 的 conformance 全部走
  `harness.dispatch`（semantic port），从未走过浏览器指针路径——这
  正是缺口从未在引擎测试露头的原因。输入粒度缺「真实指针」半张证据。

## 勘探结论（2026-08-26，逐条有实证）

1. **阻塞点是一行注册。**
   `ui/src/narrative/narrative-surface-host.tsx`
   `useStageInputIsolationV1("narrative", snapshot.entries.length > 0)`
   ——任何 render entry 存在即注册；`shell/game-stage.tsx` 的政策公
   式把 `narrativeActive` 折进 `gameplay` 与 `ordinary_gameplay` 两
   档 inert（background/character/hud/scene_interaction 全灭）。
2. **命令级早已自持安全。** choice 决议围栏 `occurrenceId`（stale 拒
   而无副作用）；hold 对一切输入决议按合同拒
   `interaction.kind_mismatch`；zone_press 是围栏普通写。管理面
   （admission、envelope、stable action authority、barrier
   controller）没有一处读 isolation 计数——isolation 只被 GameStage
   的 inert 属性消费。拆它不出第二决议路径。
3. **wire 先例现成。** `pace?: PaceHintV1`（`contracts/
   pending-interaction.ts`）：Story block 声明、pending 携带、Host
   消费、「never enters authoritative arithmetic」。parser 的条件精
   确键模式（`declaresPace`/`declaresTickQuantum`）保证未声明形状字
   节恒等——旧 Save 解析不变，canonical bytes 不变。
4. **pending 由 Story 铸造。** base 不铸 pending（narrative runner
   是 Story 侧：Lab `e2e/src/gameplay/narrative.ts`、实验仓
   `runner.ts`/`interaction-kit.ts`）。base 侧改动=合同 + parser，
   零运行时新机器。
5. **DOM 侧核实无第二障碍。** narrative 层的 portal
   （`data-default-narrative-surface-portal`）与 entry shell 均无固
   有命中面（content-sized，grid `align-items: end`）；渲染器画多大
   吃多大。实验仓渲染器根已是 `pointer-events: none` + auto 岛。层
   z 序与 `game-stage.module.css` 的 pointer 规则零改动即可放行。
6. **焦点独占是同一宿主的另外两处，必须同键放松。**
   ① `onFocusIn` outside-focus recapture（焦点落到 owner shell 外
   即微任务夺回）；② shell `onKeyDown` 的 Tab trap
   （`trapNarrativeSurfaceTabInternalV1`）。不放松则键盘用户永远进
   不了舞台，shared 只对指针成立——不诚实。

## 合同（V1）

### 1. pending 声明（base，唯一 wire 改动）

`PendingInteractionV1` 的 `say`、`choice`、`hold`、`custom` 四个变体
新增可选成员（q1 裁决：值域全收满）：

```ts
readonly stageInput?: "isolated" | "shared";
```

- 缺省（成员不存在）= `isolated`，即今日行为，canonical 形状未声明
  时省略（与 `pace` 逐字同模式：条件精确键 admission、值域校验、字
  节恒等）。
- `shared` 宣告：此 pending 挂起期间，舞台 gameplay 层保持输入可达。
- `presentation_barrier` 不收：Barrier 是引擎自动确认的呈现结算边
  界，不存在可共享的用户输入，声明它是无意义键（精确键 admission 照
  常拒）。
- 该成员永不进入权威算术、决议合法性、`when` 臂求值、replay/digest
  语义。它是 Host 提示，与 `pace` 同一信任级。

### 2. 宿主 isolation 谓词（ui）

narrative stage isolation 从「有 entry 即注册」改为「任一 entry 要
求隔离即注册」：

- dialogue entry：其 `rendererProps.pending.stageInput === "shared"`
  则不要求隔离；否则要求。
- history entry：恒要求（模态阅读面，什么都不共享）。
- preparing / suspended / 退场中的 entry 同键评估——isolated entry
  卸载前隔离保守维持。

`game-stage.tsx` 的政策公式、层描述符、z 序**零改动**；shared 状态
下 interaction/overlay/whole_canvas/system 各 context 的支配关系原
封不动（system 对话照样压住一切）。指针手势围栏（dismiss 吞一击）不
变——shared 下它更重要，收菜单的那一击不得漏进热区。

### 3. 宿主焦点（ui，同键）

focus-owner entry 是 shared dialogue 时：跳过 outside-focus
recapture，跳过 Tab trap（Tab/Shift+Tab 可自然进出舞台焦点序）。挂
载 autofocus 保留（菜单打开仍先获焦，MV parity）；Escape、History
打开/关闭行为不变。owner 是 history 或 isolated entry 时全部照旧。

### 4. 权界重申（不动，防散落）

- regions 永不获得路由权（[shaped-hit-regions](shaped-hit-regions.md)
  原文）；shared 不为舞台点击开任何新决议门——落点仍是应用层路由到
  围栏命令（choice occurrence 决议或 hold 围栏写），stale 整拒。
- 输入命令永不结算时间；hold 的 skip 决议路径（`narrative.resume`）
  不受影响——但 Story 给 skippable hold 声明 shared 时，画布点击落
  向舞台而非 skip，skip 须由显式控件承担（Story 自己的取舍）。
- narrative 层 DOM 仍在 gameplay 层之上；渲染器自己负责 pointer 透
  明（现有 CSS 合同：层 `pointer-events: none`、直接子元素 auto、
  shell content-sized——全部不动）。

## 边界与限额

- 不新增 stage layer、不改 z 序、不给 narrative renderer 舞台几何。
- 粒度 = pending。不做 per-option / per-region / per-layer 粒度。
- `NarrativeSurfaceSelectionV1`、`DefineNarrativeSurfaceInputV1` 等
  composition 公共形状零改动——hint 随 pending 走，宿主在 entry 上
  读。
- forward-compat 姿态与 `pace` 出厂时一致：旧 Save 在新引擎照常解析
  （缺省 isolated）；声明了新成员的 Save 在旧引擎按精确键 admission
  拒载。monorepo 内引擎与 Story 同步演进，接受。

## 验收草案

- **base parse**：say/choice/hold/custom 声明 `shared`/`isolated`
  往返；非法值拒；barrier 带键拒；未声明与今日 pending 的
  `canonicalJsonBytes` 恒等。
- **ui host（jsdom）**：shared choice → gameplay 层无 `inert`，下层
  按钮可点且菜单按钮同时可点；isolated → 今日行为钉死；history 压
  shared → 隔离回归；shared owner 不夺焦、Tab 可出；isolated 退场
  + shared 当前的混合窗口保守隔离。
- **Engine Lab**：夜菜单式 conformance 节点（shared choice + region
  激活决议同一 occurrence）；mid-hold 输入粒度补上真实指针半张证据
  （浏览器 e2e 点区 → 围栏写 → 下一结算 t=0 改道）。
- **实验仓消费（克隆侧，不进本 lane 验收）**：CE18 自由摸菜单常驻
  下 zone 直点、条中途嘴区走真实指针；hold click-eater 分支按
  pending 声明收窄。

## Open questions（2026-08-26 所有者已裁决）

- **q1 值域**：~~要不要一次收满 `say`/`custom`？~~ **裁决：全收满**
  ——`say`/`choice`/`hold`/`custom` 四变体一并收（VN 点透文本框等形
  态一步到位），`presentation_barrier` 维持不收（无用户输入可共享）。
- **q2 焦点放松深度**：**按建议**——recapture 与 Tab trap 同键全
  放；shared 即宣告「舞台是合法输入面」，留一半是给键盘用户设陷阱。
- **q3 命名**：**按建议**——`stageInput`，对齐 ui 包既有
  StageInputIsolation 词汇。

## 停

- 公共 wire 改动（pending 可选成员）未获所有者点头前不落地。
- `game-stage.tsx` 政策公式、层合同、managed-surface admission 机器
  一概不动；若实现中发现必须动，停下重议。
- 不出第二决议路径、不给 regions 路由权、不做 renderer 侧 isolation
  开关（authority 必须留在 pending 声明，不能留给展示代码临场起意）。
