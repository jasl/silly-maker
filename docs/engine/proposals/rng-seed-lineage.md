# RNG seed lineage (changeable seeds with audit timestamps)

状态：**探索性提案**（2026-07-29）。不改变当前已实现契约；记录如何在「种子可更换」的同时保持确定性模拟与可追溯性。

## Current contract (must keep)

- 权威路径禁止 `Math.random()` / 墙钟进规则。
- 抽取走 `createTransactionalRngV1`：purpose 标签 + Snapshot 内 `RngState`（seed/游标随存档走）。
- 同 seed + 同命令序列 → 相同 digest / 可权威 replay。
- rollback 时 RNG 随 Snapshot 回滚（结果钉死在检查点上）。

今日实现已覆盖「新局取 seed → 写入 Snapshot → Save 恢复同一 RngState」。缺口是：**显式更换种子**时如何审计，而不把 Host 时间喂进 `nextInt`。

## Desired addition

允许种子在运行中变化，但每一次变化都是：

1. **已提交的权威命令**（或 capability-gated debug 命令）的结果；
2. 新 `RngState` 进入下一 Snapshot（与改金钱同级的状态变迁）；
3. 旁路 **lineage 记录** 带时间戳，只供追溯 / DebugBundle / 平衡工具，**不参与**规则抽取输入。

## Proposed shape

```text
authoritative Snapshot.rng          ← digest / replay / save 唯一输入
optional provenance.rngLineage[]    ← 审计旁路（Save 元数据或 Host profile）
```

单条 lineage 建议字段（普通 JSON）：

| 字段                        | 含义                                          |
| --------------------------- | --------------------------------------------- |
| `changedAtMs`               | Host clock 墙钟（仅审计）                     |
| `reason`                    | `new_game` / `debug_reseed` / `new_cycle` / … |
| `commandId` 或 occurrence   | 触发变更的权威命令身份                        |
| `previousSeed` / `nextSeed` | 或短摘要，避免无必要泄露完整熵                |
| `source`                    | `gameplay` \| `debug` \| `load`               |

约束：

- **Lineage 不得进入 purpose 字符串或 `nextInt` 参数。**
- Load 旧档：恢复 Snapshot.rng；lineage 若存在则追加 `reason: load` 或保持原列表（产品二选一，需在采用时写死）。
- Restart / New game：新 seed + lineage 重置为一条 `new_game`。
- Debug 重掷：必须走 debugCommand，记入 command log，且 capability 门控。

## What this is not

- 不是「用时间当种子」——`changedAtMs` 只描述*何时改过*，不描述*掷出什么*。
- 不是第二套 RNG。UI / 粒子 / 非权威装饰仍可走 Host 熵，但不得写回 Snapshot.rng。
- 不要求跨设备对齐墙钟；lineage 冲突时以 Snapshot.rng 为准。

## Adoption gate

1. 在 Engine Lab 或 cat-cafe 加一条 debug「重掷 seed」垂直路径：commit 后 digest 变化，replay 仍自洽。
2. Save 往返后 lineage 可读；去掉 lineage 字段的旧档仍能 load（可选字段）。
3. 证明 `changedAtMs` 不出现在 simulation digest 输入（或明确划在 provenance 段且 digest 规范忽略它）。

## Decision record

未批准 API。采用前写入 `architecture.md` / `features.md` 的 persistence 与 diagnostics 段，并删除任何把 `Date.now()` 传入规则 RNG 的临时做法。
