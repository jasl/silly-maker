# 特性切片：把 Module 的内聚性扩展到整个玩法纵切

状态：已执行（2026-07-28）。cat-cafe 与 template 均已按特性切片重排并全量验证（vitest 1378 / E2E 116 全绿，`story check` 通过）；引擎侧助手仍按"两个真实消费者后定型"保留观察。

## 问题

`defineStatefulModule` 给了模拟侧真正的内聚单元（状态槽 + schema + owner），但它只覆盖纵切的一角。今天的 Story 是**按层组织**的——雨巷猫舍约 6500 行分布为：

```text
state.ts            239   所有模块状态
simulation.ts      1329   所有 owner + 一个巨型命令执行器
content.ts          558   所有内容表
presentation.ts    1089   所有文本 + 舞台内容 + 资产
application/semantic.ts     379   所有动作
application/composition.tsx  1734   所有 UI
```

一个玩法特性（比如"抚摸"）的代码横切六个文件：反应表在 content、命中区域在 presentation、pet 命令在 simulation、动作在 semantic、反应气泡与音效映射在 composition。改一个特性要开六个文件；文件本身随特性数线性膨胀——`composition.tsx`（原 web-application.tsx，已随组合层定位改名）1700 行就是这么来的。

## 方向：特性切片（feature slice）

把"按层"翻转成"按特性"。每个玩法特性一个目录，导出它需要的所有层的贡献；应用层只做薄组合：

```text
src/
  features/
    calendar/    模块 + HUD 日历徽章
    petting/     反应表 + pet 命令处理 + 命中区域 + 反应气泡 + purr/hiss 音效映射
    contest/     contest 模块 + 回合规则 + 竞赛面板 + 竞技场 BGM 规则
    album/       图鉴表 + 元进度 watcher + 图鉴窗体
    shop/        shop 模块 + 活动表 + 活动按钮行
    dialogue/    剧本 + 对话面板接线（未来消费 DialoguePanelV1）
    audio/       声音层（已存在：src/audio.ts 就是这个形状的活样本）
  application/   薄组合：story.ts 列模块、semantic 拼动作、web 拼 UI 槽
```

先例：Bevy 的 Plugin（`app.add_plugins(...)` 逐插件注册 systems/resources/UI）、Unreal 的 GameFeatures 插件、以及本仓库的 `audio.ts`——191 行装下声音特性的资产 ID、manifest、意图投影与 SFX 映射，证明纵切在现有契约下成立。

## 关键判断：这是 Story 侧模式，引擎今天就支持

引擎契约没有任何东西阻止特性切片：

- **模块**天生可分文件（story.ts 的 manifest 只要求列出实例）。
- **命令执行器**可以由特性处理器组合：`executeAttempt` 变成 `Map<kind, handler>` 的一次查找，每个特性导出自己的 handlers（事务跨模块能力不受影响——handler 里照常 propose 多个模块）。
- **动作目录 / blockedBy** 同理按特性 concat。
- **UI 槽**是函数：`hud: (ctx) => <>{features.map((f) => f.hudChip?.(ctx))}</>`；overlay resolver 合并特性 map。
- **文本目录**是数组：按特性文件 concat 后交给同一个 parse（解析期校验不变）。

因此迁移是**机械搬运**：公共形状（story entry、semantic adapter、应用定义）不变，测试与 E2E 无须改动。

## 落地形态（2026-07-28）

雨巷猫舍现结构：

```text
src/
  kernel.ts      共享契约：命令/事实/裁决类型、命令 schema、schema 助手、kit、效果行规则
  runtime.ts     模块合成、事务运行器、handler 输入形状与 kind→handler 完整映射类型
  simulation.ts  聚合门面：装配特性 handlers（漏一个命令 kind 无法编译）+ 公共契约再导出
  content.ts     聚合门面：组装内容数据库（解析期校验）+ 查询句柄与类型再导出
  features/
    audio/       声音层（资产 ID、manifest、意图投影、SFX 映射）
    album/       图鉴（content 表、解锁谓词→元进度 watcher、卡面映射、图鉴视图）
    calendar/    时段常量、日历模块、advance_slot 命令
    cat/         猫模块、成长阶段常量与立绘成长规则
    contest/     竞赛模块、moves/rivals 表、赛程规则、开赛/出招命令、竞赛面板+胜负 toast
    dialogue/    剧本（script.ts，原 narrative.ts）、叙事模块、begin/resolve 命令、自动开场 hook
    encounters/  事件池表、条件树、常客抽取规则、相遇通知 hook
    endings/     结局判定规则、enter_postgame 命令、全屏结局幕
    petting/     反应表、pet 命令、反应气泡 hook
    shop/        店铺模块、活动表、do_activity 命令
    stage/       舞台模块、渲染器（背景/猫立绘+待机动画 CSS）、舞台槽组件（命中区域抚摸接线）
  application/
    ui-kit.ts    共享 UI 基座：主题令牌、locale 文本、发布/端口类型、派发助手
    stat-bar.tsx 共享数值条（自绘轨道；评估记录见 window-model）
    labels.ts    系统外壳文案（中英双语根标签、存档对话框、安全点提示）
    composition.tsx  纯组合（~670 行）：投影、HUD 编排、槽位、设置节、应用声明
```

template 以 `kernel.ts` + `features/inventory/`（模块+能力）做最小示范；两个手册（`template/AGENTS.md`、`examples/AGENTS.md`）已写入"新特性 = 新目录"的指引。

外部消费面不变：`simulation.ts`/`content.ts` 仍是唯一门面（类型与句柄全部再导出），semantic/composition/测试/CLI 无需感知内部布局。

## 后续批次

- ✅ HUD 内部拆分（第二批，2026-07-28）：竞赛面板+胜负 toast → contest、结局幕 → endings、相遇通知 → encounters、自动开场 → dialogue、舞台组件+渲染器+抚摸接线 → stage/petting、双语外壳文案 → application/labels.ts、数值条 → application/stat-bar.tsx。`composition.tsx` 从 1734 行降到约 670 行（纯编排：投影、HUD 骨架、槽位、设置节、应用声明）。顺带修正一处上批遗漏：对话快捷条按钮紧凑化选择器仍指向已废弃的 `data-cc-narrative`，现改 `data-dialogue`。
- `presentation.ts`（文本+舞台内容+资产）按特性归属拆分——收益最低，等真实摩擦再动。
- 迁移摩擦记录：见下"引擎侧候选"，两批均未出现新增摩擦（机械搬运 + 每步 typecheck/vitest 即可）。

## 引擎侧候选（证据后定型，不预做）

- `composeCommandExecutorV1(handlers)`：kind→handler 组合器。cat-cafe 落地用 `CatcafeCommandHandlerMapV1` 映射类型 + 一次查表已消灭 switch（约 15 行）；通用化收益待 template 之外的第三个消费者出现再评估。
- 原候选特性包类型 `GameplayFeatureV1`（`{ modules, tables, commands, actions, texts, ui }`）不再单独预冻结。它可以成为 [Mod design](../design/mod-system.md) 内部的 contribution/facet factory 形状，但 Story-local feature slice 仍无需身份、版本、依赖或发布合同；只有出现独立选择/分发需求和第二个非复制消费者后才提升为 Mod。
- 文本目录/overlay map 的 concat 助手（可能太小不值得，迁移后判断）。

## 与既有设计的关系

- [窗体与 UI 组件体系](../design/window-model.md)：L3 组装件（DialoguePanelV1）是特性切片的**消费方**——dialogue 特性变薄正依赖它。两条线合并后，`composition.tsx` 预期从 1700 行缩到 300 行以内的纯组合。
- [Mod composition and distribution](../design/mod-system.md)：Feature slice 是 Story/Mod 内部的代码组织；Mod 是跨 facet 的 activation、identity、compatibility 与 distribution 单元。一个 Mod 可包含多个 slices/GameplayModules，二者不能互换命名。
- [typed-state-store 提案](typed-state-store.md)：正交——那是状态存取的类型学，本提案是代码组织学。
