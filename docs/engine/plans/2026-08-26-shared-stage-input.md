# Shared Stage Input V1（narrative 挂起共享舞台输入）实施计划

状态：**2026-08-26 开启**（所有者当日裁决接受提案，open questions
裁决：q1 值域全收满，q2/q3 按建议）。合同：
`docs/engine/proposals/shared-stage-input.md`。兑现
[mid-hold-input](2026-08-22-mid-hold-input.md) 关闭记录点名的最后一
段路（命令级组合已交付、UI 宿主 isolation 仍挡指针）。本文只拥有切
片顺序、admission 落地与验收；
[production-floor sequence](2026-07-30-production-floor-sequence.md)
仍是唯一跨计划排序入口。

## Admission 裁决（车道开启时固化）

- **值域全收满（q1）。** `stageInput?: "isolated" | "shared"` 收在
  `say`/`choice`/`hold`/`custom` 四变体上；`presentation_barrier`
  不收（无用户输入可共享，精确键 admission 照常拒带键形状）。
- **焦点同键全放（q2）。** focus-owner entry 为 shared dialogue
  时：outside-focus recapture 与 Tab trap 同时放行；挂载 autofocus
  保留；Escape / History 行为不变；owner 为 history 或 isolated
  entry 全部照旧。
- **定名 `stageInput`（q3）。** 对齐 ui 包 StageInputIsolation 词
  汇；base 侧类型 `StageInputHintV1` + 守卫 `isStageInputHintV1`，
  与 `PaceHintV1`/`isPaceHintV1` 同族同模式。
- **政策公式零改动。** `game-stage.tsx` 层描述符、inert 公式、z 序、
  pointer CSS 合同一概不动；改动只在宿主的 isolation 注册谓词与焦点
  两处；managed-surface admission 机器零触碰。
- **不出第二决议路径。** shared 不为舞台点击开新决议门；落点仍是应
  用层路由到围栏命令（choice occurrence 决议 / hold 围栏写），
  stale 整拒；regions 永不获得路由权。

## 里程碑

- M0 base 合同 + parser：四变体可选成员、`StageInputHintV1` 类型与
  守卫、条件精确键 admission（`pace` 逐字同模式）、公开导出。测试
  锁：四 kind 声明往返、非法值拒、barrier 带键拒、未声明
  `canonicalJsonBytes` 字节恒等。
- M1 宿主谓词 + 焦点：isolation 注册从「有 entry 即注册」改「任一
  entry 要求隔离即注册」（dialogue 读 `rendererProps.pending.stageInput`，
  history 恒要求，preparing/suspended/退场同键保守）；shared owner
  跳过 outside-focus recapture 与 Tab trap。测试锁：shared choice
  下 gameplay 层无 `inert` 且下层可点、isolated 今日行为钉死、
  history 压 shared 隔离回归、shared owner 不夺焦 Tab 可出、混合窗
  口保守隔离。
- M2 Engine Lab conformance + 文档：Lab 声明 shared 夜菜单式节点
  （shared choice + region 激活决议同一 occurrence）；mid-hold 输入
  粒度补真实指针半张证据（浏览器 e2e：点区 → 围栏写 → 下一结算
  t=0 改道）。features.md 与 story-authoring.md 各一段。
- M3 实验仓消费 + 收口（克隆侧提交）：CE18 自由摸（菜单常驻 zone
  直点）与条中途嘴区走真实指针；hold click-eater 分支按 pending 声
  明收窄；NOTES / fidelity-gaps 台账收口；production-floor /
  AGENTS 指针更新。

## 验收

- base：四 kind 往返 + 非法值/barrier 拒 + 未声明字节恒等；旧 Save
  解析不变（缺省 isolated）。
- ui：shared/isolated/history/混合四态的 inert 与焦点矩阵全部钉死；
  `game-stage.tsx` 测试零改动（公式未动的证明）。
- Lab：shared choice 下真实指针点区决议同一 occurrence；hold 路径
  真实指针 → 围栏写 → 下一结算 t=0 改道（批切不变沿用既有锁）。
- 实验仓：CE18 两条活路径过浏览器验收；克隆全量绿。

## Defer

- 无新增。per-option / per-region / per-layer 粒度、narrative
  renderer 舞台几何、say 点透的具体 Story 形态各随自身证据门。

## Stop conditions

沿用提案「停」节：需要动 `game-stage.tsx` 政策公式或层合同 → 停；
需要出第二决议路径或给 regions 路由权 → 停；需要 renderer 侧
isolation 开关 → 停；`stageInput` 被任何权威算术 / `when` 臂 /
digest 语义读取 → 停。
