# RNG reseed audit lineage

状态：**deferred diagnostic proposal**（2026-07-29；2026-07-30 收紧）。当前 RNG/Save/replay 合同已满足正常产品需求；没有真实第二消费者前，不新增 Host profile lineage、Save 字段或 public API。

## Current contract to preserve

- authoritative rules 禁止 `Math.random()` 和墙钟；
- `createTransactionalRngV1` 使用 purpose + Snapshot 内 `RngState`；
- same seed + same command sequence 产生相同结果/digest/replay；
- rollback/load 恢复 Snapshot 中 RNG；
- new game/bootstrap entropy 在进入 simulation 前固定为 plain state。

显式 reseed 若出现，必须是普通 authoritative/debug command：它提交新的 `RngState`，进入 CommandLog、Snapshot、Save 与 replay。这个事实本身已经可审计。

## Revised direction

审计信息优先**派生**，不维护第二份可漂移的 lineage：

```text
Snapshot.rng + committed command/result + command sequence
  -> DebugBundle / tooling projection
```

建议工具输出：

- command/occurrence identity；
- command sequence；
- reason/source（gameplay/debug/new cycle）；
- previous/next seed 的短摘要；
- authoritative before/after digest；
- 可选的导出时间（DebugBundle envelope metadata only）。

墙钟只描述“这份调试包何时导出”，不描述 reseed 在确定性序列中的位置。序列位置由 command sequence/occurrence 提供。

## Why Host profile / Save-side wall-clock lineage is deferred

独立可变数组会带来：

- 与 Snapshot/CommandLog 冲突的第二真相；
- 多设备同步/回滚/导入时的合并语义；
- 无上限增长与隐私暴露；
- Save digest/provenance 是否包含它的歧义；
- 为一个低频 debug 功能扩大 migration 负担。

这些成本目前没有产品证据。

## Adoption gate

只有同时满足才立新设计：

1. 真实产品允许玩家或 live-ops 在一次 run 中 reseed；
2. CommandLog/DebugBundle 派生不足以回答合规、客服或平衡问题；
3. 明确 retention、privacy、sync、rollback、import/export 与 migration policy；
4. 第二消费者需要同一语义；
5. 证明不影响 `nextInt` 输入、simulation digest 和 replay。

即使激活，也优先使用 append-only diagnostic/audit store keyed by authoritative command identity，而不是 Host profile 中的随意数组。它必须可丢失、非权威、bounded，并明确不参与 gameplay compatibility。

## Non-goals

- 用时间作为 seed；
- 第二套 RNG；
- 每次 load 追加 audit 项；
- 因调试 UI 需要而修改 gameplay Save；
- 让 renderer/Host 直接 reseed authoritative State。

## Decision record

未批准 API，也不在当前 production-floor queue。任何 `Date.now()` 进入规则 RNG 的临时实现都必须删除；正常 reseed 继续通过 authoritative/debug command 与现有 replay evidence 完成。
