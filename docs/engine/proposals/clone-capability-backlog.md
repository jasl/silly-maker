# Clone-experiment capability backlog (优先级评价)

状态：提案（2026-08-14）。来源：`tmp/external-experiment` 真实规模实验——开场 +
菜单闭环两轮交付后的能力缺口盘点（实证见该仓 NOTES #27 与 `tmp/external-mv`
冻结基线的教训清单）。本文件是与评审/外部模型讨论的上下文载体，**不改变
production-floor sequence 的排序权**；任何一项激活都需所有者接受并另立
active plan。

判据：菜单闭环在引擎零改动下完成（离散命令、菜单、场景切换、静态命中区
都够用）；缺口集中在**下一波内容**（后续高密度内容）会撞上的
表现原语与 authoring 摩擦。

## P0 — 高密度表现场景开工前必须就位

### P0-1 交互文档表格化（interaction table kit）

- 案文：[interaction-table-authoring.md](interaction-table-authoring.md)。
- 证据：加一种茶饮改 5 处；菜单 1.4k 行事件 ≈ 600 行手写节点，高密度表现场景约
  十倍事件量；LLM 逐块生成表行远比跨文件手写节点可靠。
- 落点：story 侧 kit（external-experiment 孵化 → template 升格），引擎核心零改动。
- 吸收项：kit 层多操作合批样板（今日每个 Story 手写 ~200 行 batch 折叠）、
  带参效果（消掉模板字面量效果 id 对穷尽检查的破坏）。
- 验收草案：茶/网购/聊天/就寝四段迁移后 id 字节级不变、金标与全套测试绿；
  新增一种茶饮 = 目录表 +1 行、其余零改动。

### P0-2 氛围循环动效原语（ambient/looping presentation motion）

- 缺口：呼吸起伏、自动眨眼/表情漂移、仪表脉动等**存在期持续**的表现行为。
  现有 motion 只绑 cue 边沿一次性播放；权威 tick 命令会灌爆命令日志（反例：
  mono 的并行事件双写灾难，NOTES 教训"不要发明运行时驱动器"）。
- 方向：authorable-motion workbench 车道的自然延伸——舞台条目声明"存在期
  循环 motion"（presentation clock 驱动、表现冻结可暂停、权威状态零接触、
  reduced-motion 合同沿用）。
- 落点：引擎（ui/base motion 合同）+ Studio/工坊可调。需要独立小案文定
  合同（循环边界、相位确定性、与一次性 motion 的叠加规则）。
- 验收草案：实验仓 高密度表现场景的呼吸/眨眼用声明实现，无权威命令流量；冻结画面
  时循环停驻、恢复后相位连续。

## P1 — 高价值，不阻塞

### P1-1 故障诊断通道（fault cause diagnostics）

- 证据：执行器 fault 信封只带 code，原始异常被丢弃；本轮靠临时 console 才
  定位"每 owner 每事务一次提案"违约。已在 实验仓 侧留 console 兜底。
- 方向：attempt 信封携带结构化诊断（message + 栈摘要，非权威数据、不进
  Save/replay），调试坞显示最近一次 fault cause。改动小、回报高。

### P1-2 MV 事件解码器入库（external-experiment `tools/`）

- 证据：本轮行为规格全部来自一次性 python 解码脚本（/tmp，已丢弃）；下一个
  接手的 agent（无论哪家模型）需要同一把铲子 + "解码 → 规格进 NOTES →
  实现 → 经济断言"的硬纪律。
- 落点：external-experiment 仓 `tools/`（读 vendor 软链，研究工具，与软链同地位，
  不进主仓、不被产物依赖）。

### P1-3 过渡收敛测试助手（transition-settled helper）

- 证据：背景 crossfade 期间新旧两张并存、打字机 say 首击只补全文本——皆为
  正确合同，但每个 e2e 都要自带循环/等待知识。
- 方向：测试侧助手或舞台"过渡飞行中"数据属性，e2e 一行等待收敛。

## P2 — 观察后再动

### P2-1 Studio 只读叙事图视图（blueprint 只读镜头）

- 依据：`narrative-graph.ts` 已把脚本投影成通用 NarrativeGraph（lint 在用），
  数据结构现成；菜单 ~90 节点靠脑内成图，人和 agent 审流程都吃力。
- 边界：**只读投影**。source of truth 是交互文档/脚本；图编辑不在计划内
  （若表格化落地后仍有真实需求，另案）。

### P2-2 typed state store

- 维持 [typed-state-store](typed-state-store.md) 的 optional 地位。两轮实证：
  运行时状态存储无痛点（模块 + zod + 加法字段兼容工作良好），本实验不构成
  激活证据。

## 明确不做（本实验的证伪清单）

- **alpha 命中测试**：AABB 足够（mono 与 native 两轮验证）；除非出现可复现
  的判定缺陷。
- **MV 解释器形态的任何回潮**：mono 两晚教训的根因；引擎只认领域状态 +
  语义命令。
- **第二套 UI OS / 窗口管理**：现有 slot + portal + 发布可用性已覆盖；
  高密度表现场景也应走"命中区 + 语义命令 + 表现投影"。

## 依赖与顺序建议（供讨论）

P0-1 与 P0-2 互不依赖、可并行；高密度表现场景以两者为前置。白天循环内容只依赖
P0-1（甚至可作为其试点扩面）。P1-2 应在任何模型接手内容工作前完成。
