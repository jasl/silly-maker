<!-- SPDX-License-Identifier: MIT -->

# Event pool (conditional weighted draws)

状态：2026-07-28 接受。产品证据来自《雨巷猫舍》"每周常客小剧情"与正式测试。本文是接受的目标合同；实现落地后 `features.md` 记录实况。

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

`parseEventConditionV1` 校验形状、深度（≤8）与分支数（≤32）；number literal
与整份 `context.numbers` 都只接受 safe integer，并显式拒绝 fractional、non-finite、
unsafe integer 与 `-0`。`evaluateEventConditionV1(condition, context)` 是纯函数，
会把 `context.numbers` 的 own enumerable entries 各读取一次、admission 并捕获为
engine-owned numeric projection，而不是只检查当前 condition 访问的 key；后续 number
condition 只读取该 projection。继承的 numeric property 不属于 context map，按缺失 key
处理；represented getter 也只在 capture 时读取一次。缺失的 number/label key 视为不满足
（显式、非抛错）。invalid condition literal 沿用
`event_pool.condition_invalid`；invalid context 使用
`event_pool.context_number_invalid` 与 escaped JSON-Pointer
`/context/numbers/<key>`。

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

语义顺序固定为：逐个一次捕获 candidate `eventId`/`weight` 并完成完整 validation →
整份 context number capture/admission → 逐个一次捕获 candidate `condition` 并按 authoring
order 过滤合格候选 → 按 eligible authoring order 逐项检查并
累加权重 → force/empty 分支 → ordinary RNG → explanation/result。逐项加法在创建
unsafe 中间值前检查；overflow 使用 `event_pool.total_weight_overflow` 与
`/candidates/<index>/weight`，并在 force lookup、ordinary RNG 或任何 explanation
返回前失败。candidate failure 优先于 context failure，context failure 优先于累计与
RNG；所有这些 failure 都不改变 RNG candidate state 或 attempted draws。`force`
命中时不消耗 RNG draw（`roll: null, forced: true`），但仍扫描完整 eligible vector 并
要求事件存在且合格——强制的是选择，不是资格。validation、eligibility、累计、force、
explanation 与 ordinary selection 都只消费上述 captured candidate projection，不重读
caller-owned candidate scalar fields。

### 边界

- 事件**内容**（文本、效果、叙事入口）不属于本合同：Story 把 `eventId` 映射到内容数据库行或叙事节点；
- 冷却、已见去重等**动态状态**属于模块状态模型，Story 在构建候选清单时预过滤；
- 动态权重（按状态缩放）V1 不做：Story 可在预过滤时用多行不同权重表达；真实需求出现再议。
- candidate weight 的公开范围仍是 positive safe integer；ordinary draw 继续服从
  当前 `RuleRngV1.nextInt` 的既有 draw-domain 上限。DET2e 没有借 overflow 修复收窄
  weight shape 或扩张 RNG V1；若真实消费者需要更大 ordinary total，必须单独设计
  RNG/Event Pool 合同，而不是静默改变 draw algorithm。

## 消费惯例

- 候选定义放内容数据库表（条件列存 JSON 条件，解析期 `parseEventConditionV1` 校验；`eventId` 主键；文本列 join 校验）；
- 抽取发生在命令执行器内（同一事务：抽取 → 效果提交 → 解释进 fact）；
- 调试强制走 debugCommand 通道（`source: "debug"` 进日志，重放可剥离）；
- 解释 fact 经瞬态效果流或 DevDock 检查器可视化。

## 验收

契约单测（条件求值、深度/分支上限、确定性抽取、强制语义、解释形状）；猫舍"常客小剧情"作为首个消费者（营业时抽取，条件对照信任/声誉/时段，效果原子提交，重放一致）；features/plan 状态更新。
