# Mid-hold input writes 提案（hold 中输入写入）

状态：**2026-08-22 所有者裁决接受，同日 M0–M1 全部交付（关闭）**
（open questions q1–q3 全部按建议采纳：组合而非原语、围栏谓词留
Story 惯例、清除责任留 Story 纪律）。兑现
[hold-when](hold-when.md) open question q1 的显式 defer（「hold
中热区是输入轴，缺第二条 admission」）。本文只定合同；切片顺序与
admission 由
[Mid-hold input V1 计划](../plans/2026-08-22-mid-hold-input.md) 拥有
（交付记录也在该计划）；
[production-floor sequence](../plans/2026-07-30-production-floor-sequence.md)
仍是唯一跨计划排序入口。

关闭记录（2026-08-22）：零 base 代码改动，合同全部以消费者证据钉
死。Lab conformance（主仓 `ffef9d0c`）：`lab.engage_collector` 围栏
写 + 绊线臂，五条测试锁（写不动 hold、下一结算 t=0 切、批切不变、
stale 整拒、save/load 存活）。实验仓活路径（克隆刀 #326）：CE18 条
中途嘴区——解码证实原作热区点击是并发状态写入者、改道权全在 CE20 看
门狗，与本合同逐条同构；`imouto.zone_press` 围栏写复用既有
`inspect-kiss` 效果对，+5 分钟推过 2:00 由 bar 自己的 `when` 臂下次
结算超时切断。其余身体热区是逐区内容刀，不再经引擎车道。

一句话：**不需要新引擎原语。** 勘探证实「hold 挂起期间会话拒收一切输
入」是错觉——基座从未挡过普通命令。输入轴是已交付合同的一次声明式组
合：热区激活 →（应用路由）→ hold 围栏栅住的普通写命令 → 该 hold 自己
声明的 `when` 臂在下一次围栏结算 t=0 读到并改道。本提案把这条组合钉成
合同并划清禁区，防止它以「碰巧能跑」的姿态散落进各 Story。

## 证据门

- **实验仓 CE18/CE19（E3 台账唯一未接的一半）**：原作触摸条 8×60f
  WAIT 期间，平行公共事件每帧收点击——条还在走时点身体区写
  `V55`/`V56` 再 CALL 283。克隆现状：zone 点击只能在 touch-menu
  （choice occurrence）上决议；hold 挂起时对它 input resolve 被
  `interaction.kind_mismatch` 拒绝（该合同正确，不动）。条中途点击今
  天无门可走。
- **Engine Lab**：hold `when` 已锁两种时间粒度（自身 tick 同瞬间、监
  视器下一结算 t=0），缺输入粒度的 conformance 证据。

## 勘探结论（2026-08-22，逐条有实证）

1. **基座 dispatch 没有 pending 门。** `GameSessionV1.dispatch` 的入
   院只有会话可用性、故障暂停、Story `commandSchema.parse` 与规范化
   冻结；不存在 `interaction.pending` 拒绝码。挂起期间普通命令本来就
   合法——Lab `lab.toggle_collector` 有「挂起中合法」的成文先例，监
   视器在挂起下写权威域是已交付合同（features.md）。
2. **写入路径是现成的。** 领域事件 + reducer
   （[parallel-monitors](parallel-monitors.md) M1）：命令处理器
   `emit`，模块按声明折叠自己的切片，journal 照常——Save/replay 零新
   字节。
3. **热区激活本来就不出命令。** `onHitRegionActivate` 是 UI → 应用的
   回调（[shaped-hit-regions](shaped-hit-regions.md)），路由是应用层
   自由；热区在 hold 期间照常渲染、照常可点。UI 包零改动。
4. **读取延迟受帧级报时钳制。** `TimeTickV1.elapsedMs >= 1`（无 0ms
   结算动词），但活体宿主按帧报时：写入最迟一帧后进入下一次围栏结算
   t=0。感知上同瞬间，合同上不承诺同瞬间。

## 合同（V1）

### 1. hold 围栏输入写命令（Story 侧模式，非新动词族）

Story 声明普通命令（示例拼写 `story.zone_press`），载荷带
`expectedHoldOccurrenceId` + 声明好的写意图（如 zoneId → 字段写）。
处理器纪律：

- **围栏**：pending 不是同 occurrence 的 hold → 整体拒绝（Story 命名
  空间的 `*.hold_occurrence_stale` 同族码）。谓词与
  `evaluateTimeTickV1` 完全相同（一行比较）；V1 不加基座出口（q2 可
  推翻）。排队中的迟到点击不得污染后继 hold——与围栏 tick 同一条纪律。
- **只写**：直接字段写或 emit 领域事件；**不得**碰 pending、不得结算
  时间（时间仍独占于 `TimeTickV1`）、不得改道。完整提交或整体拒绝。
- **入 journal 照常**：普通命令，回放确定性白送。

### 2. 读取粒度：下一次围栏结算 t=0（监视器同款）

写入对该 hold 的 `when` 臂在下一次 fenced tick 的 t=0 可见，对 tick
效果同理。这与 hold-when 已交付的监视器粒度是同一条合同，不新增语义。
改道权 100% 留在 hold 块声明的 `when` 臂上——输入只写状态，永远不选
路。

### 3. 热区路由（应用侧一行分支）

应用的 `onHitRegionActivate` 在 `pending.kind === "hold"` 时路由到
§1 命令（替代 resolution 路径）。零新 resolution kind；对 hold 的
input resolve 仍 `interaction.kind_mismatch`；零 UI 包改动。

## 边界与限额

- 点击/激活粒度。指针坐标、hover、移动轨迹不入权威态（悬停显形仍是
  shaped-hit-regions 的表现层合同）。
- 写意图必须是声明的字段写或领域事件，不携带自由函数或目标块名。
- 写请求字段是普通版本化状态：中持有 Save/load 自然存活，数字进
  digest。
- 与 [input-binding-surface](input-binding-surface.md)（应用声明层的
  键位/长按绑定）、[pointer-gesture-fence](pointer-gesture-fence.md)
  （浏览器遗留 click 桥）正交：本提案只管会话侧写入纪律。

## 验收草案

- Lab：一条 hold 的 `when` 臂读输入写字段；持有中激活 → 下一结算
  t=0 切断；围栏过期写整体拒绝；写入不破批切不变；中持有 Save/load
  后写请求字段存活。
- 实验仓：CE18 条中途点身体第一条活路径（切换当前动作还是排队下一动
  作，按解码证据在克隆刀上定，不在本提案预判）。
- 文档：features.md、story-authoring.md 各一段（授权模式 + 围栏纪
  律）。

## Open questions（2026-08-22 已随 admission 裁决：全部按建议）

1. **组合而非原语**：不开第二条 admission 边界——hold 节点不声明输
   入 schema，不加第二种 resolution kind。输入轴永远是「普通命令写 +
   `when` 读」。（建议：是。第二边界要发明入院、Save 字节与回放语
   义，而组合的每一环都已交付并有测试。）
2. **围栏谓词的归属**：留 Story 惯例（各仓一行比较 + 自家命名空间拒
   绝码），还是基座出口一个 `holdFenceIsCurrent` 小助手统一诊断？
   （建议：惯例。谓词一行，Lab 与实验仓两处拼写重复不足以立基座合
   同；第三个消费者出现再升。）
3. **写请求的清除责任**：臂命中后，改道目标消费并清除请求字段——这
   是 Story 纪律还是合同条款？（建议：Story 纪律。引擎不认识「请求字
   段」，正如它不认识 `shinyaException`。）

## 停

- hold 节点获得输入 schema、第二种 resolution，或任何新动词族；
- 热区/指针获得路由权（改写 pending、选臂、跳段）；
- regionId、坐标、hover 进入 pending 字节或 Save 格式；
- 输入写命令结算时间、折 hold 余额、或绕过围栏污染后继 hold；
- 每次 pointer-move 一条命令（轨迹不入会话）。
