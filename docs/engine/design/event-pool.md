<!-- SPDX-License-Identifier: MIT -->

# Event pool (conditional weighted draws)

状态：2026-07-28 接受。来源证据：[DoL 对照复查 §2A](../../research/2026-07-28-dol-engine-gap-review.md) 与《雨巷猫舍》"每周常客小剧情"设计。本文是接受的目标合同；实现落地后 `features.md` 记录实况。

## 问题

日程/模拟品类的核心循环之一是"状态 × 时段 → 候选事件筛选 → 加权随机 → 执行"。要求：

- 候选与条件是**静态数据**（可校验、可查询、可翻译），不是可执行表达式；
- 抽取**确定性**（快照 RNG，重放/回滚一致）；
- 结果**可解释**（候选、资格、权重、随机值、命中者全记录）；
- 调试**可强制**（点名事件，不绕过提交路径）。

## 合同（Base）

### 条件语言：受限、可序列化、可静态校验

```ts
interface EventPoolContextV1 {
  readonly numbers: Readonly<Record<string, number>>; // bounded safe integers; 例：cat.trust, shop.reputation, calendar.week
  readonly flags: readonly string[]; // 排序去重的字符串集合
  readonly labels: Readonly<Record<string, string>>; // 例：slot: "dusk"
}

type EventConditionV1 =
  | { kind: "number"; key: string; op: "eq" | "ne" | "lt" | "lte" | "gt" | "gte"; value: number } // bounded safe integer
  | { kind: "flag"; flag: string; present: boolean }
  | { kind: "label"; key: string; anyOf: readonly string[] }
  | { kind: "all"; conditions: readonly EventConditionV1[] }
  | { kind: "any"; conditions: readonly EventConditionV1[] }
  | { kind: "not"; condition: EventConditionV1 };
```

`parseEventConditionV1` 校验形状、深度（≤8）与分支数（≤32）；`evaluateEventConditionV1(condition, context)` 是纯函数。缺失的 number/label key 视为不满足（显式、非抛错），解释数据会标注。

### 候选与抽取

```ts
interface EventPoolCandidateV1 {
  readonly eventId: string;                 // 非空，池内唯一
  readonly weight: number;                  // 正安全整数
  readonly condition: EventConditionV1 | null; // null = 恒真
}

interface EventPoolDrawExplanationV1 {     // JSON-safe，进 fact/诊断
  readonly considered: number;
  readonly eligible: readonly { eventId: string; weight: number }[];
  readonly totalWeight: number;
  readonly roll: number | null;             // 空池或强制时为 null
  readonly forced: boolean;
}

type EventPoolDrawResultV1 =
  | { kind: "drawn"; eventId: string; explanation: EventPoolDrawExplanationV1 }
  | { kind: "empty"; explanation: EventPoolDrawExplanationV1 };

drawFromEventPoolV1(input: {
  candidates: readonly EventPoolCandidateV1[];
  context: EventPoolContextV1;
  rng: TransactionalRngV1;                  // purpose 标注的 nextInt
  purpose: string;                          // 例 "check:cc.encounter"
  force?: string;                           // 调试强制：仍要求该事件在候选中且合格
}): EventPoolDrawResultV1
```

语义：过滤合格候选 → 求权重和 → `rng.nextInt({ purpose, exclusiveMax: totalWeight })` → 线性走表。所有 condition/context 数值都服从 [authoritative determinism](deterministic-simulation-boundary.md) 的 bounded safe-integer / explicit-quantization 合同；`totalWeight` 求和必须在每一步拒绝 safe-integer overflow。`force` 命中时不消耗 RNG draw（`roll: null, forced: true`），但仍要求事件存在且合格——强制的是选择，不是资格。

### 边界

- 事件**内容**（文本、效果、叙事入口）不属于本合同：Story 把 `eventId` 映射到内容数据库行或叙事节点；
- 冷却、已见去重等**动态状态**属于模块状态模型，Story 在构建候选清单时预过滤；
- 动态权重（按状态缩放）V1 不做：Story 可在预过滤时用多行不同权重表达；真实需求出现再议。

## 消费惯例

- 候选定义放内容数据库表（条件列存 JSON 条件，解析期 `parseEventConditionV1` 校验；`eventId` 主键；文本列 join 校验）；
- 抽取发生在命令执行器内（同一事务：抽取 → 效果提交 → 解释进 fact）；
- 调试强制走 debugCommand 通道（`source: "debug"` 进日志，重放可剥离）；
- 解释 fact 经瞬态效果流或 DevDock 检查器可视化。

## 验收

契约单测（条件求值、深度/分支上限、确定性抽取、强制语义、解释形状）；猫舍"常客小剧情"作为首个消费者（营业时抽取，条件对照信任/声誉/时段，效果原子提交，重放一致）；features/plan 状态更新。
