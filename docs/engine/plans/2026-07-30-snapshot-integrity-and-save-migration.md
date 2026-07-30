# Snapshot integrity and Save migration execution plan（已拆分）

状态：**superseded as an execution plan**。2026-07-30 审查发现本文件把“零语义变化的性能去重”和“跨版本 Save 产品合同”合成一个 promotion record，容易让实现、验收与回滚边界互相污染。原方向保留，任务已拆为：

- [Snapshot commit performance](2026-07-30-snapshot-commit-performance.md)
- [Save migration](2026-07-30-save-migration.md)
- 跨计划顺序见 [Production-floor execution sequence](2026-07-30-production-floor-sequence.md)

Codex/Agent 不再从本文件领取任务。历史提交或外部链接可继续落到这里，因此保留该路径而不删除。
