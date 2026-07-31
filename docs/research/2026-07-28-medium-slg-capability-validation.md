# 研究笔记：中型日程/数值/空间交互 SLG 的能力验证

日期：2026-07-28。输入：`private-reference:medium-slg-2026-07`
（登记见 [reference-register](reference-register.md)）。这是一个权利状态不明、
只能在外部私有工作区使用的本地参考；其精确身份、版本、目录和内容不保留在
SillyMaker 当前 tracked tree，后续也不得重新写入正式文档或实现。

本笔记只保留与引擎有关的通用需求类别。它不记录作品名、内容摘录、事件或变量清单、
插件清单、素材结构、精确规模、角色/数值模型，也不作为实现 fixture、测试 oracle、
生成输入或兼容任务书。正式能力的 maintained evidence 来自原创
[`examples/cat-cafe`](../../examples/cat-cafe/) 和中性 Engine Lab。

## 1. 可采纳的通用压力

中型 VN/SLG/RPG Story 会同时面对：

- 大量静态活动、技能、角色、日程、商店和图鉴定义；
- 随存档变化的数值、进度、解锁和瞬态战斗状态；
- 图片或舞台区域上的空间交互；
- 跨周目、但不应随单个 Save 回退的收藏/成就；
- 从脚本与事件中分离出来的可校验、本地化文本；
- 演出、输入、导航与 gameplay authority 组合时的生命周期竞态。

这些都是品类层面的普通工程问题。参考材料只证明问题会在完整应用中同时出现，
不授权复制其解决方案，也不证明某个兼容层应该成为公共引擎 API。

## 2. SillyMaker 的独立答案

| 通用需求         | 正式引擎边界                                               | Maintained evidence                             |
| ---------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| 静态结构化内容   | Story 自定义、只读、参与身份的 typed content tables        | Cat Cafe 的活动、部位反应、技能、对手和图鉴表   |
| 可变进度与结算   | Gameplay Module/State；命令原子提交                        | Cat Cafe 规则与 headless replay                 |
| 空间交互         | Semantic Stage hit regions → semantic action → module rule | Cat Cafe 指针/触摸/键盘浏览器验收               |
| 跨存档元进度     | Host profile 的 Story 命名空间，不进入 Game Save           | Cat Cafe 图鉴跨会话测试                         |
| 本地化           | text catalog 与缺键/对等校验                               | Cat Cafe 双语目录；更完整工作流仍按真实需求演进 |
| 回合制或日程玩法 | Story-local module composition                             | Cat Cafe 原创日程与竞赛系统                     |

因此，内容数据库、命中区域和元进度的交付不依赖这个私有参考继续存在。它们由
原创 Story、公开合同和正式测试独立定义并验收。

## 3. 不从单一私有消费者产品化的内容

下面这些需求即使在外部验证应用中出现，也必须等待明确合同和独立消费者，不能直接
从兼容实现提升为公共 API：

- 特定事件解释器、插件命令或图片编号模型；
- 某一作品的等待、补间、点击、回忆或存档 wire shape；
- 为单个 Story 增加的全局播放器偏好；
- 特定素材格式、布局、坐标、数值和调度约定；
- 为复制原作品表现而建立的 renderer equality、计时或兼容 callback。

候选能力先以 Story-local adapter 验证；只有第二个独立消费者证明相同语义后，才进入
引擎设计与 active plan。外部验证工作区可以消费正式引擎，但正式代码、测试、构建和
发布不得反向依赖它。
