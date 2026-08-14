# Interaction table authoring proposal (声明式交互文档 → 叙事节点编译)

状态：提案（2026-08-14）。孵化地：`tmp/external-experiment` 真实规模实验（story 侧实现，
不动引擎核心）；验证后经 `template/` narrative-kit 升格，引擎化再议。
与 [content-database 提案](content-database.md)（已实现第一刀）**互补且分层**：
content-database 管"目录行"（物品、价目、数值带），本提案管"交互流程"（菜单、
台词、闸门、效果、掷骰的编排）。与 [typed-state-store](typed-state-store.md) 无耦合。

## Motivation（来自外部实验的实证）

external-experiment 菜单闭环（2026-08-14 交付）暴露的真实摩擦：**给枢纽菜单加一种
茶饮要改 5 处**——规则表常量、文案目录、选项闸门表、效果 id 联合、叙事节点
（选项 + 两句台词 + 效果节点）。这五处全部可以从"一行定义"推导。原作
（RPG Maker）作者加一行事件表就完事——数据表驱动正是它可被单人维护的原因。

对 SillyMaker 的特有动机与 content-database 相同：**LLM authoring**。追加一个
声明块比跨五个文件手写节点可靠一个量级，diff 可审、逐块可校验。高密度表现场景等
后续内容的事件量是菜单的十倍，手写节点先撑爆维护性。

行业参照（取其收敛点，不搬形态）：

- **RPG Maker**：一切内容是表行 + 事件指令列表。优点是加行即加内容；缺点是
  无 schema、stringly-typed、逻辑藏在指令流里。
- **Unreal DataTable / RimWorld Defs / Paradox script**：schema 先行的数据行 +
  从数据引用**注册过的**代码工人（BlueprintCallable / WorkerClass）。数据与
  代码的边界永远是"注册表"。
- **ink / Yarn**：线性块 + 标签跳转的写作友好格式，编译期校验全部引用。
  自由图不利于 diff 与生成，**顺序块 + 显式跳转**是叙事内容的最佳颗粒。

收敛结论：**三层**——目录行（content-database，已有）、交互文档（本提案）、
注册表代码（效果/闸门 handler，普通 TS）。文档只含数据与注册 id 引用，
绝不内嵌函数。

## Shape（设计草图）

### 1. 注册表：效果与闸门（代码侧，一次定义）

```ts
// kernel 侧：每种效果一个 id + 参数 schema + handler（提案模块操作）。
// handler 收 shadow 读上下文 + 事务缓冲，编译器/运行器自动按模块合批
// （吸收今天手写的 ~200 行 batch 样板与 12 个模板字面量效果 id）。
const effectRegistryV1 = defineEffectRegistryV1({
  "tea.brew": {
    params: z.strictObject({ drink: z.string() }), // 外键 → 茶饮目录表
    apply: ({ params, tables, stage, rng }) => { /* consume/restore/advance… */ },
  },
  "shop.buy": { params: z.strictObject({ item: z.string() }), apply: … },
  "sleep.process": { params: z.strictObject({}), apply: … },
});

// 闸门：声明式谓词行 → 原因码自动映射。一张表同时服务
// 发布视图（置灰+理由文案）、决议重检、语义动作可用性——单一可用性规则。
const gateRegistryV1 = defineGateRegistryV1({
  "ap.min": { params: z.number(), blockedBy: "not_enough_ap" },
  "stock.has": { params: z.string(), blockedBy: "item_out_of_stock" },
  "night.once": { params: z.enum(["tea", "bath"]), blockedBy: "already_tonight" },
  "hour.before": { params: z.number(), blockedBy: "too_late" },
});
```

### 2. 交互文档（数据侧，一个交互一份）

TS 承载的纯数据（JSON-safe；后续可直接换 JSON 文件 + admission parse，与
scene document 同款姿势）。短名派生 id 沿用 template narrative-kit A6 的
既有合同（`node.<prefix>.<name>` / 台词内联收集进文案目录 / 显式 id 覆盖
保证迁移后存档字节级兼容）。

```ts
const teaInteractionV1 = defineInteractionDocV1({
  prefix: "story.tea",
  entry: "intro",
  blocks: [
    { kind: "say", name: "intro", speaker: null, text: "泡点什么喝吧。", next: "menu" },
    {
      kind: "menu",
      name: "menu",
      prompt: "泡什么好呢……",
      options: [
        // 每行从茶饮目录表展开：标签、闸门、台词、效果全部由 drink 外键推导。
        ...teaDrinksTableV1.rows.map((drink) => ({
          name: drink.id,
          text: drink.labelText,
          gates: [{ gate: "stock.has", params: drink.itemId }],
          next: `${drink.id}-say`,
        })),
        { name: "cancel", cancel: true, text: "返回", next: "@night.menu" },
      ],
    },
    // 掷骰块：持久化 roll 槽（对话中途存档稳定），outcome 按区间路由。
    // { kind: "roll", name: "spark", draw: { max: 3 }, outcomes: [{ eq: 1, next: "bonus" }], else: "@leave" },
    // 场景块：引用 scene 文档 open/cue，mayShow 自动推导。
    // { kind: "stage", name: "towel", open: "scene.story.night-towel", next: "@close" },
    // 效果块：
    // { kind: "effect", name: "green-grant", effect: "tea.brew", params: { drink: "green" }, next: "@leave" },
  ],
});
```

`@` 前缀是跨文档标签（共享尾巴：`@leave` 重坐、`@night.menu` 回菜单），由
编译器解析成真实 nodeId 并纳入图校验。

### 3. 编译与校验（kit 侧）

`compileInteractionDocsV1(docs, registries, tables)` 输出既有的叙事节点数组 +
文案条目（与手写节点**同一运行时 IR**，可与存量脚本逐段共存混编）。
admission 一次性全量校验，坏数据在 `story check`/vitest 阶段带 JSON pointer
拒绝：

1. 所有跳转目标（含 `@` 跨文档）可解析；图 lint（复用现有
   `parseNarrativeGraph`）+ 可达性；
2. 每个 gate/effect id 已注册且 params 过 schema；目录外键（如 `drink.id`）
   进 content-database 校验；
3. 文案覆盖双向核对（未用/缺失）；speaker 键已声明；
4. roll 槽声明与 outcome 区间穷尽；
5. 派生 id 冲突、`seenRevision` 缺省=1。

## Constraints（不可谈判）

1. **文档是纯数据**：不内嵌函数/表达式；一切行为经注册表 id + params 引用。
   逃生舱=多注册一种效果，不是在数据里写代码。
2. **同一运行时 IR**：编译产物就是现有节点类型；运行器、图 lint、存档
   cursor 语义零改动。手写节点与编译节点可长期共存。
3. **id 稳定性**：派生 id 有显式覆盖位；迁移存量脚本必须能保持 nodeId
   字节级不变（对话中途存档不作废；hub 档本就无关）。
4. **digest 姿势显式声明**：文档经 kernel 导入编译（digest 不可见，与今日
   手写节点同权，配合 NOTES #21 的省调校习惯）为缺省；需要参与 Story 身份
   的成品可改走 content-database/story data facet 注册——二选一，明确写下。
5. **RNG 纪律**：roll 块只走事务 RNG + 持久化槽；文档不可表达
   `Math.random()` 类行为。

## 文档载体（已定，2026-08-14）

**规范形状 = JSON-safe schema，admission parser 只有一个；载体有先后**：

1. **第一载体：TS 数据模块**。类型推导即时（agent/人改错当场爆红，不用等
   admission）、允许从目录表**程序化展开**行（上文 `teaDrinksTableV1.rows.map`
   ——展开后的产物才是被接纳的文档；JSON 写不出展开）。
2. **第二载体：`.json` 文件**（与 scene document 同款姿势）。给未来的
   编辑器/外部工具写；两种载体过同一个 parser，形状零分叉。
3. 可视化编辑器（若有那天）读写的是 JSON 载体；TS 永远保留给程序化内容。

参照 ComfyUI：它的 workflow JSON 是可编辑源、UI 是 authoring 层。我们把
对应关系倒过来一半——**交互文档是源，图是投影**（见下节）；将来编辑器写的
仍是文档，不是图。

## 叙事图投影：`NarrativeFlowGraphV1`（只读镜头的数据形状）

图是**派生数据**：永远从编译后的节点投影，绝不手工编辑。因此形状里**没有
坐标/布局**——布局由查看器计算（dagre/ELK 自动排版）；将来若要钉住手调
位置，另存 sidecar 布局文件，不污染语义数据。

现有 `NarrativeGraph`（lint 在用）已有 nodes/kind/successors/dependencies/
source；可视化还缺两样：**带标签的边**（哪个选项/掷骰结果/分支条件走向哪里）
与**分组**（节点来自哪份文档的哪个块）。投影形状（JSON-safe）：

```ts
interface NarrativeFlowGraphV1 {
  readonly nodes: readonly {
    readonly nodeId: string;
    readonly kind: "say" | "menu" | "effect" | "roll" | "stage" | "branch" | "flag" | "end";
    /** 来源交互文档 id；手写存量节点为 null。 */
    readonly docId: string | null;
    readonly blockName: string | null;
    /** 人可读摘要：textId / effect id+params / gate 列表。 */
    readonly summary: string;
    readonly source: string;
  }[];
  readonly edges: readonly {
    readonly from: string;
    readonly to: string;
    readonly label:
      | { readonly kind: "next" }
      | {
        readonly kind: "choice";
        readonly choiceId: string;
        readonly textId: string;
        readonly gates: readonly string[];
      }
      | { readonly kind: "roll"; readonly outcome: string }
      | { readonly kind: "branch"; readonly condition: string }
      | { readonly kind: "call"; readonly label: string }; // `@` 跨文档标签
  }[];
}
```

ComfyUI 工作流 JSON（nodes + links + 类型化端口）是同构参照：node ≈ node、
labeled edge ≈ link、docId 分组 ≈ group。查看器（Studio 面板）按能力清单
的 P2 节奏另行实现；本节只冻结形状，让编译器从第一天就能吐这份投影。

## 应用路径（external-experiment 先行）

1. 落 kit（registry + defineInteractionDocV1 + compiler + admission 校验），
   与手写菜单共存；
2. 试点迁移「泡茶喝」（最表格化：8 行茶饮 ≈ 90 行手写节点 + 闸门 + 效果 id），
   id 覆盖保持不变，金标/单测/e2e 全绿为验收；
3. 迁「网购」「聊天」「就寝」；新内容（看电视/打游戏/白天循环）表格先行；
4. 高密度表现场景仅在本 kit + 氛围动效原语（另案）就绪后开工；
5. 稳定后上提 `template/`（替换现 narrative-kit 为超集）；Studio 只读图
   查看器消费上节的 `NarrativeFlowGraphV1` 投影，按真实需求再提案。

## Open questions（留给评审讨论）

- 跨文档标签命名空间与循环引用的裁决；
- gate 的组合语义（目前 AND；是否需要 OR/NOT，还是拆成多选项）；
- 效果 handler 与未来 content-database 查询 API 的注入面（tables 参数）
  是否应约束为只读句柄；
- 表达"每行选项记忆上次选择"（原作 VAR1384 类）之类 UI 态是否入档。
