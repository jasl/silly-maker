# Save migration execution plan

状态：2026-07-30 接受执行，审查后从 Snapshot 性能计划拆分；2026-07-31 继承
PF-DET 的 authority-closure 与 cross-runtime guard。目标合同见
[Save migration design](../design/save-migration.md)；在
[production-floor sequence](2026-07-30-production-floor-sequence.md) 中分为 PF3
与 PF5，PF3 在完整 PF-DET promotion 后开始。

## 1. Outcome

- bounded envelope 在 current Snapshot schema 之前可安全解码；
- schema revision 通过相邻、纯函数、确定性的 migration chain 演进；
- migration、same-schema adoption 与 CommandLog compatibility 是不同轴；
- migration 成功后安装新的 authoritative replay anchor，失败不修改原记录或 live Session；
- 每个受支持正式 Save revision 有 maintained fixture，并在 CI 中 migrate + validate + load；
- 玩家可以 dry-run、看到可行动结果，并在写入前保留原记录。

## 2. M0 — Current behavior and fixture floor

在改 load order 前固定 PF-DET promotion 后的现有行为；不得把 PF-DET 已拒绝的
zero RNG state 或经 binary64 舍入入场的 fractional number token 重新冻结成 Save
兼容基线：

- current valid Save；
- unsupported format/record revision；
- corrupt JSON、超限、unknown fields；
- raw snapshot digest mismatch；
- current schema invalid；
- reference/invariant failure；
- same-schema adoption allow/deny；
- simulation lineage boundary；
- auto recovery candidate；
- export/import bytes；
- annotation field absent、summary-only、note-only、summary + note 与 note
  clearing/removal；
- malformed、over-limit、sparse 与 accessor-backed annotation/summary shape；
- `summarizeSave` absent/null/empty/valid/throw、exactly-once capture、defensive
  copy/freeze、fixed metadata clock，以及 projection failure 后没有 physical Save
  write；
- autosave rotation 保留每个 candidate capture 时的 summary；
- `versionStamp` absent、all-null、partial、fixed full-clean、fixed full-dirty、
  status-unavailable、malformed、accessor/Proxy-backed 与 collector throw；每个
  成功创建的 persistence service 恰好 collect 一次，
  后续 capture/rewrite/rotation/export 的新增 collect count 为 `0`；partial/full
  先做 bounded printable normalization、defensive copy/freeze；
  normalization 不调用 getter，mixed malformed fields 逐字段丢弃，最终
  absent/all-null、accessor-only、hostile Proxy 或 collector throw 降级为 field
  absent 且不阻止 physical Save write；
- stamp 标识 Save candidate 中 Snapshot 的 capture-origin build，不参与
  compatibility、adoption、Snapshot/`stateDigest`、authoritative identity、
  CommandLog 或 replay；annotation rewrite、autosave rotation 与 stored-record
  export 保留每个 record 原有 stamp，不调用当前 runtime collector；load/import
  compatibility 不读取 stamp，post-load/import fresh capture 使用当前 service
  已采集 stamp；
- headless absent/all-null stamp 的 Save bytes 继续等于 PF1 unstamped oracle；
  fixed browser partial/full stamp 使用独立 expected bytes/SHA，并覆盖 standard
  receipt 与 opaque repository fallback；
- fixed metadata clock 的 UTC `yyyyMMddHHmmss` export suggested filename 覆盖
  有/无 extension、invalid clock 与同一秒重复；秒级 suffix 不承诺唯一，
  Desktop/Browser Host 以
  no-clobber collision policy 保留每份导出，filename collision 不改变 payload
  bytes；
- annotation rewrite 绑定 source Host revision 与 exact source bytes 做 conditional
  read-modify-write，随后通过 physical readback、accepted lease fence，以及 built-in
  one-shot write receipt 或 opaque repository 的 exact expected-byte re-encode 验证；
- stale-source conflict 保持 newer record byte-for-byte 不变；post-commit
  fence/readback failure 不得报告成功，也不改变 live Session 或 safely-saved
  state，同时 corpus 明确记录 already-committed physical annotation 是否仍在，和
  normal Save receipt contract 保持一致；
- note rewrite 保持 Snapshot、`stateDigest`、`savedAt`、captured command
  sequence、provenance、lineage、summary 与 `versionStamp`；只允许
  `recordRevision` 和 normalized note/annotation presence 改变；
- 每个 valid annotation variant 的 list/export/import/load round-trip，且 optimized
  receipt 与 opaque-repository fallback 产生相同 bytes。

fixture 只为已经发布或明确承诺维护的格式建立；临时测试对象继续在 test factory 中生成。

`summarizeSave` 是 Story-owned durable deterministic projection：其输出影响
Save/export bytes，但不影响 Snapshot digest、CommandLog、replay 或 gameplay
transition。玩家 note 是 persistence metadata。在尚无 downstream release 时于
`formatRevision: 1` 内加入该 shape 不构成本轮 compatibility blocker；M0 从此冻结
current behavior，再进入 M1 load-order 改造。既有 PF1 unannotated byte oracle 保持
不变，annotation vectors 是追加 corpus，不得以它们重生成或替换旧 oracle。

`versionStamp` 是 bounded presentation/runtime persistence metadata，不是 durable
deterministic projection；它从显式 build/runtime ingress 采集一次并记录 Snapshot
capture origin。其 vectors 同样只追加 corpus：PF1 unstamped oracle 保持不变，
stamp 不得成为 compatibility 或 authoritative identity 的新轴。export timestamp
filename 是 Save envelope 外的 Host metadata，也不进入 migration corpus 的 payload
identity。

**M0 acceptance：** 现有结果逐字段固定，所有写入点与 live Session install 点可追踪。

## 3. M1 — Bounded envelope shell and load order

实现 design 的目标顺序：

1. Strict JSON 限额下 parse envelope shell；
2. 只解析 format/record revision、provenance、slot、savedAt、stateDigest、lineage、
   bounded annotation 与 bounded `versionStamp` 等外壳；
3. `snapshot` 保持 bounded raw JSON；
4. 按 stored format 验证 raw snapshot digest；任何会改写 snapshot 的 format/State migration 都不得先于此步骤；
5. 处理 engine-owned envelope format migration；默认只改外壳，确需转换 snapshot 时必须同时生成新 digest/lineage；
6. 根据 State contract revision 选择 migration chain；
7. migration 完成后才用 current Snapshot schema parse；
8. 再执行 compatibility/adoption、reference、invariant 与 install。

不注册 migration 时，现行受支持 Save 的结果与 M0 等价；旧 schema 从“current schema parse 失败”变成稳定的 `migration_unavailable` 类结果，不写入。

M1 默认只建立 callback-free envelope shell 与调用顺序，不凭空发布 format
migration。若同一切片确实注册 executable engine-owned format migrator，其 source
必须作为 explicit authority entry 进入 PF-DET static/tripwire scope，并把 pure
input/output/diagnostic/digest vector 接入已经建立的 Deno/Chromium/Firefox/WebKit
matrix；否则停止并拆出独立 migration slice。

**M1 acceptance：** Strict JSON 限额不放宽；tampered raw snapshot 在任何会改写它的 migration 前被拒绝；现格式回归逐字段等价；callback-free shell 不冒充已实现 migration，任何真实 format migrator 都有 authority entry 与四 runtime vector。

## 4. M2 — Migration registry and new replay anchor

### Registry contract

- namespace-keyed；单应用使用 engine/application namespace，未来 Mod 可复用而不改管线；
- 每条 migration 只处理 `N -> N+1`；跨版本由 runtime 组合；
- 输入/输出是 plain bounded data；
- 禁网络、Host clock、随机、live Session 与 renderer；
- migration ID、from/to revision 和 content/reference rename map 可诊断；
- duplicate、gap、cycle、反向或歧义链在 authoring/build 阶段失败；
- registered migration source entry 进入 PF-DET 已建立的 authoritative
  import-closure lint 与 isolated tripwire，不靠文件名猜测或作者自觉；

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
- migration success + adoption deny/allow；
- 同一一步/两步 migration vector 在 Deno、Chromium、Firefox、WebKit 使用 PF-DET
  test-only driver 得到相同 normalized output、diagnostic 与 digest。

**M2 acceptance：** 所有失败原子；同输入重复迁移得到同 bytes/digest；新 anchor
replay 自洽；migration registry/source 已进入 determinism static/tripwire
guard，四 runtime vector 全绿且缺 browser 不得 silently skip。

## 5. M3 — Product surface and release corpus

- dry-run/inspect：不写入，按 slot 返回可直载、需 migration、需 adoption、拒绝及原因；
- 写入前备份：原记录进入可恢复位置或导出流，迁移后的记录才替换目标；
- adoption declaration set：支持多个历史 resolved provenance，替换单声明入口；候选可由 release tooling 生成，但必须人工确认；
- lineage policy：re-anchor 上限、触限提示、导出/回退路径；
- 用户文案：稳定 diagnostic code 映射为人类可理解的结果与操作，不直接展示内部 stack；
- maintained fixture corpus：Engine Lab + 旗舰示例，至少一条多版本链、一次 adoption、一次 lineage 边界与失败备份恢复；
- corpus 保留 M0 的 `versionStamp` absent/all-null/partial/fixed full-clean/fixed
  full-dirty/status-unavailable/malformed/throw 与
  headless/browser fixed bytes，并逐版本证明 migration、annotation rewrite、
  autosave rotation 与 stored export 不覆盖 Snapshot capture origin；load/import
  compatibility 忽略 stamp，post-load/import fresh capture 使用当前 service
  stamp；
- Host export acceptance 固定同一秒重复 suggested filename，证明
  Desktop/Browser collision policy no-clobber，且 filename/落盘路径不进入或改写
  Save bytes；
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
