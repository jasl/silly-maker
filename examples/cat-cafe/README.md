<!-- SPDX-License-Identifier: CC-BY-NC-SA-4.0 -->

# 《雨巷猫舍》（example-cat-cafe）

全年龄原创示例：七周之内经营巷尾猫舍、养大捡来的奶猫"小雨"、参加街区猫咪运动会。它是引擎缺口的交付载体——设计规格见 [DESIGN.md](DESIGN.md)，缺口分析见 [研究笔记](../../../../docs/research/2026-07-28-mv-slg-gap-analysis.md)。

## 它证明了什么

| 系统                            | 引擎能力                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 活动/反应/技能/对手/图鉴五张表  | **内容数据库**（`defineContentTable`/`createContentDatabase`）：静态定义查表、动态状态进模块，解析期校验主键/外键/textId |
| 抚摸小雨（头/下巴/背/尾巴）     | **舞台命中区域**：内容目录按成长阶段解析区域，指针/触摸/键盘同一语义路径                                                 |
| 猫咪运动会（第 3/5/7 周周日暮） | 回合制战斗纯 Story 侧实现；RNG 进快照（回滚无法重掷）                                                                    |
| 成长相册                        | **Host 元进度**（`profile.meta`）：解锁跨存档保留                                                                        |
| 日程/数值/多结局                | 模块化状态、原子提交、内容表驱动的可用性规则                                                                             |

## 运行

```bash
deno task story dev example-cat-cafe          # 浏览器开发
deno task story simulate example-cat-cafe --scenario first-day
deno run -A npm:vitest run examples/cat-cafe
```

浏览器验收在引擎套件：`engine/packages/web/e2e/engine/hit-regions.spec.ts`。

## 授权

软件 PolyForm Noncommercial 1.0.0；文本与设计 CC BY-NC-SA 4.0（见仓库根 `LICENSE.md`）。
