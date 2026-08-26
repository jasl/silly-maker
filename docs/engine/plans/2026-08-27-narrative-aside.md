# Narrative Aside V1（插话）实施计划

状态：**2026-08-27 开启（M0–M3 交付中）**。所有者下令开启并附两条硬
约束（通用、与既有能力正交）；open questions 按提案建议随 admission
固化（q1 推流、q2 引擎合同 + Story 像素、q3 定名 aside、q4 挂起权威
对话时到达即丢）。合同：
[docs/engine/proposals/narrative-aside.md](../proposals/narrative-aside.md)。
本计划拥有切片顺序、admission 落地与验收；
[production-floor sequence](2026-07-30-production-floor-sequence.md)
仍是唯一跨计划排序入口。

## Admission 裁决（车道开启时固化）

- 通道 = commit-only 推流，与 `projectTransientEffects` /
  `subscribeTransientEffects` 同族同模式（`asideSequence` 单调 +
  epoch 盖章，消费者水位线去重）；不发明第三种保留语义。
- 类型化：`NarrativeAsidePageV1`（`speakerTextId` 可空 + `textId`，
  与 say pending 同准入）；`parseNarrativeAsidePagesV1` 一次准入
  （1–16 页、精确键）；实例准入失败 observer fault、fail-open。
- 零权威：无 occurrenceId、无决议、无路由；不进
  State / Save / digest / replay / publication / History；load 与
  restart 零重放。
- 宿主政策零改动：不经 narrative-surface-host、不注册 stage
  isolation、不夺焦点；`game-stage.tsx` 公式与测试零改动为验收项。
- 引擎不画窗：ui 交 `createNarrativeAsideControllerV1` 纯状态机 +
  `useNarrativeAsideV1` 接线，像素归 Story 渲染器。

## 里程碑

- **M0 base 合同**：`contracts/narrative-aside.ts`（类型 + 准入）、
  `CoreSemanticAdapterV1.projectNarrativeAside` 钩子、实例
  `subscribeNarrativeAsides` 推流（正常提交与调试提交同路）。测试
  锁：准入界、盖章单调、fail-open、被拒命令零推、load / restart 零重
  放且 epoch 推进。
- **M1 ui 控制器**：`narrative-aside-controller.ts`（纯状态机）+
  `use-narrative-aside.ts`（订阅接线）。测试锁：打开 / 翻页 / 末页退
  场、say / choice 到达强退、挂起期到达即丢、epoch 清空、水位线去
  重、新批替换、全程零 dispatch。
- **M2 Engine Lab conformance + 文档**：绊线 hold 围栏写
  （`lab.engage_collector`）投影两页插话，Lab 渲染器画
  `data-lab-aside` 最小窗；jsdom 锁「条上插话可翻、hold occurrence
  与余额不动、`when` 改道 catch say 强退插话」；浏览器真实指针 e2e
  （点样本箱 → 插话弹出 → 翻页 → 条照走）；`features.md` 与
  `story-authoring.md` 各一段。
- **M3 实验仓消费 + 收口**：克隆侧条中途嘴区 CE18 台词页上插话（时
  钟 +5、右手插图在、条不动、台词可读），E3 台账改记已闭合；
  production-floor / AGENTS / roadmap 指针更新与关闭记录。

## 验收

- base：准入与推流测试全绿；`deno task check` 全绿。
- ui：控制器与 hook 测试全绿；`game-stage.tsx` 及其测试零改动。
- Lab：jsdom conformance + 浏览器真实指针证据；hold 权威轨迹
  （occurrence / 余额 / `when` 改道）与无插话时逐位一致。
- 实验仓（克隆侧，不进本 lane 验收）：条中途亲吻台词可读，权威落账
  与克隆刀 #326 交付时逐位一致。
- 文档：`features.md`、`story-authoring.md` 已记；提案关闭记录 +
  本计划交付记录 + 三处指针（production-floor §1 / AGENTS /
  roadmap §4）落笔。

## Defer

- 无新增。auto 翻页 / 打字机 / History / 排队 / choice-over-hold 均
  为显式不收（见提案边界），不设证据门。

## Stop conditions

沿用提案「停」节：插话获得决议 / 路由权或被权威语义读取 → 停；需要
进 State / Save / History / 命令身份 → 停；必须动 pending 槽合同、
narrative-surface-host 政策、`game-stage.tsx` 公式或层合同 → 停；
需要可决议的第二条 narrative pending 轨 → 停（另立提案）。
