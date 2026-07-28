# Imouto verification: content vs runtime boundary (migration memo)

状态：**探索性备忘**（2026-07-29）。不是实现任务单；记录从 `tmp/imouto-mono` MV 兼容验证里抽出的分层结论，供原创复刻或引擎演进对照。与已实现的 [content-database](content-database.md) 和探索中的 [typed-state-store](typed-state-store.md) 对齐，不另起权威状态。

## Motivation

民间 MV 复刻把「静态设定」和「运行时数值」挤进同一套 `$gameVariables` / 事件脚本字符串。验证层必须先跑通解释器，但长期可维护的 SillyMaker Story 不能把整库 `CommonEvents.json` 当作产品模型。本备忘固定一条边界，避免后续把 Content DB、IndexedDB、或 StateStore 误当成「第二个 RPG Maker 变量池」。

## Boundary (non-negotiable)

| 层                          | 装什么                                                            | 可变？          | 进存档？                      |
| --------------------------- | ----------------------------------------------------------------- | --------------- | ----------------------------- |
| **Content database**        | 问卷题库、称号表、活动/日程模板、选项文案、CE 元数据、解锁条件行  | 否（作者期）    | 否（进 Story digest）         |
| **Text catalog**            | 可本地化字符串（含原 `\V[n]` 占位的模板）                         | 否              | 否                            |
| **Module / Snapshot state** | 金钱、行动力、精力、信赖、图片槽、解释器游标、pending interaction | 是，原子 commit | 是                            |
| **Host records**            | Save 字节、settings、lease                                        | 异步持久化      | Save 信封，不是 live 查询引擎 |

原则：

1. **一份权威内存 State**。IndexedDB / 桌面 records 只是 Save 通道，不是每条 gameplay 命令的查询引擎。
2. **Content DB 只读**。运行时没有 insert；改内容 = 改源码 = 新 Story revision。
3. **不把 MV 事件数组整表塞进 Content DB 再当 VM 跑**。Content DB 存的是抽取后的结构化行；流程用 Story 事件图 / PendingInteraction，不用 `$gameVariables` 字符串 eval。
4. **Typed StateStore（若采用）只替换可变 state 的读写 DX**，不合并 Content DB，也不替代 Host 持久化。

## What the verification already taught

- `\V[n]` / `\_` 是 **投影时替换**（HUD popup template 已走这条路），不是「缺 SQL」。
- 选项里的 `if(v[n])…` 应变成 **条件选项**（已在 tmp 用 `resolveMvChoiceLabelV1` 隐藏 falsy 项）；正经 Story 应落成 content 行上的 `parseEventConditionV1` / choice enablement，而不是残留脚本碎片。
- 行动力改变（CE244）依赖 `$gameVariables.value(a) + $gameVariables.value(b)` 一类脚本操作数——这是 **运行时规则**，属于 command executor + RNG/算术，不是 Content DB。
- 图片热区、立绘、PSM popup 是 **运行时呈现状态**；静态立绘目录 / 尺寸表可以是生成的只读表。

## Suggested migration shape (for a real remake, not the tmp VM)

```text
authoring
  content tables (activities, titles, quiz pools, album unlocks)
  text catalog (templates with {var} or engine textId + substitute)
  event / interaction graph (no free JS in choice labels)

runtime Snapshot
  stats module (gold, AP, energy, sister stats, clocks)
  stage / pictures module
  narrative pending
  → Save envelope → HostAtomicRecordStore
```

验收标准（备忘级）：

- 开局问卷、夜命令、洗澡/睡觉改行动力，全部不读 `CommonEvents.json` 字符串；
- `story check` 能拒绝坏外键 / 缺失 textId；
- 同 seed 双跑 digest 一致；Save/load 不丢行动力与精力。

## Out of scope

- 继续产品化 MV 解释器进 `@sillymaker/*`（明确不做）。
- 用 SQL/SQLite 承载 live gameplay。
- 在未证明样板痛点前强制迁移到 Typed StateStore。

## Decision record

本备忘不批准新 API。tmp 兼容层可继续存在于 gitignored 目录；引擎只吸收可泛化缺口（opacity、hitRegions、overlay、title `beginNewGame`、narrative isolation 等）。原创复刻应以 Content DB + module state 重写，而不是「把 www 数据挂进 Content DB」。
