# Save migration execution plan

状态：2026-07-30 接受执行，审查后从 Snapshot 性能计划拆分。目标合同见 [Save migration design](../design/save-migration.md)；在 [production-floor sequence](2026-07-30-production-floor-sequence.md) 中分为 PF3 与 PF5。

## 1. Outcome

- bounded envelope 在 current Snapshot schema 之前可安全解码；
- schema revision 通过相邻、纯函数、确定性的 migration chain 演进；
- migration、same-schema adoption 与 CommandLog compatibility 是不同轴；
- migration 成功后安装新的 authoritative replay anchor，失败不修改原记录或 live Session；
- 每个受支持正式 Save revision 有 maintained fixture，并在 CI 中 migrate + validate + load；
- 玩家可以 dry-run、看到可行动结果，并在写入前保留原记录。

## 2. M0 — Current behavior and fixture floor

在改 load order 前固定现有行为：

- current valid Save；
- unsupported format/record revision；
- corrupt JSON、超限、unknown fields；
- raw snapshot digest mismatch；
- current schema invalid；
- reference/invariant failure；
- same-schema adoption allow/deny；
- simulation lineage boundary；
- auto recovery candidate；
- export/import bytes。

fixture 只为已经发布或明确承诺维护的格式建立；临时测试对象继续在 test factory 中生成。

**M0 acceptance：** 现有结果逐字段固定，所有写入点与 live Session install 点可追踪。

## 3. M1 — Bounded envelope shell and load order

实现 design 的目标顺序：

1. Strict JSON 限额下 parse envelope shell；
2. 只解析 format/record revision、provenance、slot、savedAt、stateDigest、lineage 等外壳；
3. `snapshot` 保持 bounded raw JSON；
4. 按 stored format 验证 raw snapshot digest；任何会改写 snapshot 的 format/State migration 都不得先于此步骤；
5. 处理 engine-owned envelope format migration；默认只改外壳，确需转换 snapshot 时必须同时生成新 digest/lineage；
6. 根据 State contract revision 选择 migration chain；
7. migration 完成后才用 current Snapshot schema parse；
8. 再执行 compatibility/adoption、reference、invariant 与 install。

不注册 migration 时，现行受支持 Save 的结果与 M0 等价；旧 schema 从“current schema parse 失败”变成稳定的 `migration_unavailable` 类结果，不写入。

**M1 acceptance：** Strict JSON 限额不放宽；tampered raw snapshot 在任何会改写它的 migration 前被拒绝；现格式回归逐字段等价。

## 4. M2 — Migration registry and new replay anchor

### Registry contract

- namespace-keyed；单应用使用 engine/application namespace，未来 Mod 可复用而不改管线；
- 每条 migration 只处理 `N -> N+1`；跨版本由 runtime 组合；
- 输入/输出是 plain bounded data；
- 禁网络、Host clock、随机、live Session 与 renderer；
- migration ID、from/to revision 和 content/reference rename map 可诊断；
- duplicate、gap、cycle、反向或歧义链在 authoring/build 阶段失败。

### Execution

- 在隔离数据上执行完整链；
- current schema/reference/invariant 全部通过后才构造 candidate Snapshot；
- success 安装新的 replay anchor、current digest 与 migration lineage；旧 CommandLog 不跨 anchor 重放；
- failure 返回结构化 inspect/rejection，原 Save bytes 与 live Session 不变；
- migration 与 adoption 可依次出现，但诊断和授权分开。

### Required examples

Engine Lab 提供：

- N → N+1；
- N → N+1 → N+2；
- content ID rename；
- deleted ID 的显式 fallback/rejection；
- migration throw；
- illegal output；
- reference/invariant failure；
- migration success + adoption deny/allow。

**M2 acceptance：** 所有失败原子；同输入重复迁移得到同 bytes/digest；新 anchor replay 自洽。

## 5. M3 — Product surface and release corpus

- dry-run/inspect：不写入，按 slot 返回可直载、需 migration、需 adoption、拒绝及原因；
- 写入前备份：原记录进入可恢复位置或导出流，迁移后的记录才替换目标；
- adoption declaration set：支持多个历史 resolved provenance，替换单声明入口；候选可由 release tooling 生成，但必须人工确认；
- lineage policy：re-anchor 上限、触限提示、导出/回退路径；
- 用户文案：稳定 diagnostic code 映射为人类可理解的结果与操作，不直接展示内部 stack；
- maintained fixture corpus：Engine Lab + 旗舰示例，至少一条多版本链、一次 adoption、一次 lineage 边界与失败备份恢复；
- CI：对 corpus 全量执行 inspect → migrate → current schema/reference/invariant/digest → load → save round-trip。

**M3 acceptance：** design 的 release acceptance 全部满足；任何被声明支持的 revision 都有 fixture；不存在“代码声称支持但 CI 没有真实字节”的版本。

## 6. API discipline

- migration registry 是 authoring/runtime contract，不把 raw storage adapter 暴露给 Story；
- migration function 不取得 arbitrary context；确需静态内容时只取得已 digest 的 read-only migration resources，并由设计先批准；
- 不自动推断 schema diff；作者显式写语义转换；
- 不把 Mod 安装/卸载、content patch、adoption 与 State migration 合并为一个万能 hook；
- diagnostics 包含稳定 code、revision path、migration ID 与 failing validation phase。

## 7. Non-goals

- downgrade；
- 跳版本捷径（除非以后由相邻链性能证据激活）；
- 外部数据库/异步迁移服务；
- 任意脚本 eval；
- Mod distribution；
- renderer/workspace/conversation 数据迁入 gameplay Save；
- CommandLog 跨新 anchor 重放。

## 8. Stop conditions

- shell parse 需要放开当前 JSON size/depth/key 限额；
- migration 需要 live Session、网络、墙钟或随机；
- migration failure 已修改原记录或 authoritative state；
- migration 与 adoption 无法在结果中区分；
- fixture 依赖 `tmp/**`、`references/**` 或未发布复刻；
- current schema validation 仍在 migration 之前执行；
- 实现需要静默改变已接受 design。

## 9. Promotion record

每阶段记录：旧 bytes/红测试、load-order 变化、public contract、失败原子性、fixture revision、focused/aggregate checks、玩家路径、仍未支持的历史版本。M1–M2 只证明机制；M3 通过后才能在 `features.md` 宣称 Save migration 是发布能力。
