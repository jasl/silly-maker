# Content database proposal (typed static tables + queries)

状态：已实现第一刀（2026-07-28）：`engine/packages/base/src/contracts/content-database.ts`，首个消费者 `examples/cat-cafe`。本文档保留为设计依据；后续演进（分页、索引、多值外键）按真实需求提案。

与 [typed-state-store 提案](typed-state-store.md)的关系：**互补且严格分层**。本提案只管**静态内容数据**（authoring 时定义、运行时只读、参与 Story 身份）；可变游戏状态仍归 GameplayModule/StateStore 世界。参考游戏把两者混进同一个无类型变量池，是其不可维护性的根源——这条边界是本提案最重要的设计决定。

## Motivation

中型以上的 VN/SLG/RPG 携带大量结构化内容数据：活动定义（消耗/产出/解锁条件）、物品、技能、角色档案、日程模板、商店条目、图鉴条目。把这些定义和可变进度一起堆进脚本或无类型全局变量池，会让校验、查询、本地化和维护同时失效。行业先例（RPG Maker 数据库、魔兽的 DBC 表）证明数据驱动的价值，但固定品类 schema 也容易被 Story 绕开——引擎必须让 Story 定义自己的表。

对 SillyMaker 还有一个特有动机：**LLM authoring**。生成表行是模型最可靠的产出形式（结构重复、逐行可校验）；把内容从代码常量迁到带 schema 的表，直接提高真实 Story 创作的可交付性。

## Shape (design sketch)

```ts
// Story 侧：定义表（zod schema + 行数据；builder 与 literal 同契约）
const activitiesTableV1 = defineContentTable({
  tableId: "table.catcafe.activities",
  schema: z.strictObject({
    id: z.string(), // 主键，稳定 ID
    nameTextId: z.string(), // i18n 感知列：textId 引用，跨表校验
    staminaCost: z.number().int().safe(),
    rewards: z.array(z.strictObject({ stat: z.string(), delta: z.number().int().safe() })),
    unlockFlag: z.string().nullable(),
  }),
  primaryKey: "id",
  rows: [/* … 数百行普通数据 … */],
});

// 运行时：类型化只读查询（Prisma 风格 + KV 直取）
const db = createContentDatabase({ tables: [activitiesTableV1, itemsTableV1] });
db.table("table.catcafe.activities").byId("activity.train"); // KV
db.table("table.catcafe.activities").findMany({
  where: { staminaCost: { lte: 20 }, unlockFlag: null },
  orderBy: "staminaCost",
}); // 查询
```

## Constraints (non-negotiable)

1. **只读**：运行时没有 insert/update/delete。内容变更 = 改源码 = 新 Story revision。可变状态永远走模块。
2. **JSON-safe + 确定性**：行数据是普通数据，参与 facet digest（simulation 侧表进 simulationDigest，presentation 侧表进 presentationDigest）；同一 Story 的查询结果跨 Host 完全一致。Simulation facet 的数值服从 [authoritative determinism](../design/deterministic-simulation-boundary.md) 的 bounded safe-integer / explicit-quantization 合同；presentation-only facet 若确需有限 binary64，必须由自己的 schema 明确声明并保证不流入 authoritative State、command、facts、Save 或 replay。
3. **同步、内存内、无依赖**：不引入 SQL、SQLite、IndexedDB 或 Prisma 本体；"Prisma 风格"只指类型化可发现的查询 API。
4. **解析时全量校验**：主键唯一、外键（跨表引用列）、textId 引用进文本目录校验（沿用 resolver 现有的 catalog join 模式）、行数上限。坏数据在 `story check` 阶段拒绝，带 JSON pointer。
5. **i18n 原生**：文本列存 textId 而非字符串；缺失键检测属于表校验的一部分，避免把可翻译文本烧进规则脚本或事件定义。

## Adoption evidence

首个 adoption gate 已由原创 `examples/cat-cafe` 满足：其设计规格先定义日程、数值、技能、对手、部位反应和图鉴需求，再由六张真实表消费 Base 契约、resolver/catalog join 与 Story 校验。后续分页、索引、多值外键或新的查询语法仍必须由独立真实消费者驱动，不先建空 API。

## Open questions

- 表挂在哪个 facet：simulation（数值规则表）与 presentation（图鉴/文案表）大概率都需要；是否允许一张表被两侧引用？
- 查询构建器的类型推导深度（where 的列级类型）与编译成本；
- 与未来 StateStore 的读语义统一（`db.table(...)` 与 `state.collection(...)` 的 API 对称性）；
- 热修（Hotfix patch surface）是否允许 patch 表行。
