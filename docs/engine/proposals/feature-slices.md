# 特性切片：把 Module 的内聚性扩展到整个玩法纵切

状态：提案（2026-07-28）。方向已认可，等待在旗舰示例上执行验证；引擎侧助手待两个真实消费者后再定型。

## 问题

`defineStatefulModule` 给了模拟侧真正的内聚单元（状态槽 + schema + owner），但它只覆盖纵切的一角。今天的 Story 是**按层组织**的——雨巷猫舍约 6500 行分布为：

```text
state.ts            239   所有模块状态
simulation.ts      1329   所有 owner + 一个巨型命令执行器
content.ts          558   所有内容表
presentation.ts    1089   所有文本 + 舞台内容 + 资产
application/semantic.ts     379   所有动作
application/web-application.tsx  1734   所有 UI
```

一个玩法特性（比如"抚摸"）的代码横切六个文件：反应表在 content、命中区域在 presentation、pet 命令在 simulation、动作在 semantic、反应气泡与音效映射在 web-application。改一个特性要开六个文件；文件本身随特性数线性膨胀——`web-application.tsx` 1700 行就是这么来的。

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

## 执行计划（待开工指令）

1. 雨巷猫舍按上述目录重排（一次一个特性搬运，每步跑 `deno task typecheck` + 包内 vitest）。
2. `template/` 增加一个最小特性目录示范（inventory 即现成候选），模板手册更新"新特性 = 新目录"的指引。
3. 迁移中记录摩擦点，作为引擎助手的证据输入。

## 引擎侧候选（证据后定型，不预做）

- `composeCommandExecutorV1(handlers)`：kind→handler 组合器（消灭每个 Story 手写的 switch）。
- 特性包类型 `GameplayFeatureV1`：`{ modules, tables, commands, actions, texts, ui }` 的声明形状——等雨巷猫舍与 template 两个消费者的真实形状收敛后再定。
- 文本目录/overlay map 的 concat 助手（可能太小不值得，迁移后判断）。

## 与既有设计的关系

- [窗体与 UI 组件体系](../design/window-model.md)：L3 组装件（DialoguePanelV1）是特性切片的**消费方**——dialogue 特性变薄正依赖它。两条线合并后，`web-application.tsx` 预期从 1700 行缩到 300 行以内的纯组合。
- [typed-state-store 提案](typed-state-store.md)：正交——那是状态存取的类型学，本提案是代码组织学。
