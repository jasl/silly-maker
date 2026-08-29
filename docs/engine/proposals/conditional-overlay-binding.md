# Conditional overlay binding（条件化贴图）裁决

状态：**已裁决并以中性消费者闭合（2026-08-29）**。结论：不新增引擎
原语。高保真演出所需的「同一段进行中，贴图随权威条件翻转」已经能由
现有权威与表现边界正交组合；本轮只把该组合固化为可维护判例。

## 推荐组合

1. 条件的最终离散结果写入 Stage entry 的 `appearance`，随 Snapshot/Save
   成为权威事实；
2. 条件来源属于别的玩法模块时，由 Stage owner fold 同一个 domain event
   并产生既有 `setAppearance` mutation。所有写者共享这一 fold，不为普通
   命令、hold 中写与 monitor 各复制一组镜像 mutation；
3. Story 的 `resolveContent(contentId, appearance)` 把离散 key 映射为素材/
   renderer props。表现层只读 Stage projection，不回头读取原始 gameplay
   State，也不干扰正在运行的 hold 或 transition。

Engine Lab 的样本箱是中性判例：箱子迟到进场时从当前开关播种
`sealed | engaged`；随后普通写或 occurrence-fenced mid-hold 写都经同一个
domain-event fold 更新 appearance，投影在同一提交中选择对应视觉；箱子
不存在时 fold 是 no-op。聚焦测试同时钉住已提交 appearance、投影结果、
hold remainder 不变和迟到进场。

## Defer

- appearance key 到 asset 的声明式变体表仍由 Story catalog 代码承担；
  等作者面出现第二个仓内真实消费者再考虑文档家族；
- 不引入表达式/谓词语言。复杂条件在权威规则中求值，文档与 renderer
  只看到最终字符串 key。

## 停

- renderer/compositor 直接读取原始 gameplay State；
- overlay 获得命令路由或第二套决议路径；
- 每个写者重复维护一份 appearance 镜像。
