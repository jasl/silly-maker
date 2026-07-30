# External content import vs runtime State boundary

状态：**探索性备忘**（2026-07-29，2026-07-30 去项目化修订）。不是实现任务单；记录从外部事件/变量格式兼容实验中抽出的分层结论。与已实现的 [content database](content-database.md) 和探索中的 [typed StateStore](typed-state-store.md) 对齐，不另起权威状态。

## Motivation

许多旧式或第三方游戏格式把静态设定、运行时数值、事件脚本、显示状态和全局变量挤进同一变量池/事件数组。兼容验证可以先解释原格式，但长期可维护的 SillyMaker Story 不应把整库事件 JSON、自由脚本字符串或数据库连接当成产品模型。

本备忘固定 Content、mutable State、Presentation 与 Host persistence 的边界，避免把 Content DB、SQLite/IndexedDB 或 StateStore 误当成第二个变量池。

## Boundary

| Plane                           | Owns                                                                                          | Mutable at runtime?               | Save behavior                               |
| ------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------- |
| **Authoring Content DB**        | characters/items/activities/titles/quiz pools/event templates/text/asset metadata/unlock rows | No                                | enters Story/content digest, not run state  |
| **Text catalog**                | localizable templates and substitutions                                                       | No                                | referenced by stable text IDs               |
| **Gameplay modules / Snapshot** | currency/AP/energy/relationships/clocks/interpreter cursor/pending interaction/run flags      | Yes, only through atomic commands | Yes                                         |
| **Presentation runtime**        | current visual instances, popup/tween progress, renderer handles                              | Transient                         | No; Save keeps stable semantic targets only |
| **Host records**                | Save bytes/settings/profile/cache/lease/editor index                                          | Async persistence                 | not a live gameplay query authority         |

## Non-negotiable rules

1. **One authoritative in-memory gameplay State.** Browser/desktop records are persistence channels, not per-command databases.
2. **Content is read-only at runtime.** Content changes produce a new content/Story identity; temporary runtime facts belong in module state.
3. **Importers compile, they do not preserve accidental source architecture.** External event arrays and variable pools should become typed content rows, event/interaction graphs and module rules.
4. **No free script fragments in content labels/conditions.** Conditions and effects become typed expressions or code-owned rules with stable diagnostics.
5. **Typed StateStore, if adopted, changes mutable-State DX only.** It does not merge Content DB, renderer state or Host persistence.
6. **SQLite is an authoring/editor backend, not a second transaction authority.** Shipped runtime should prefer compiled, read-only content packs unless a product-specific adapter has an explicit boundary.

## Migration shape

```text
authoring/import
  source adapter
    -> normalized content tables
    -> text catalog
    -> event / interaction graph
    -> asset manifest and source map
    -> schema/FK/reference/localization validation

runtime
  module-owned mutable state
  + pending interaction / semantic stage targets
  + deterministic commands
  -> Save envelope -> Host record store
```

Examples of classification:

- string placeholders are resolved by text projection, not by adding SQL;
- conditional choices become typed choice enablement, not embedded `if(...)` strings;
- arithmetic/resource changes are command rules, not content-table mutations;
- static sprite dimensions/hit metadata may be generated content; current sprite instance/tween is presentation runtime;
- importer cursor needed for resumable gameplay belongs in Snapshot; editor import progress belongs in tooling state.

## Acceptance for a real importer

- imported content has no runtime dependency on the original event JSON or script evaluator;
- `story check` rejects broken foreign keys, missing text/asset IDs and unsupported source constructs with stable diagnostics;
- same seed + same command sequence yields the same digest;
- Save/load preserves all mutable gameplay facts but does not serialize renderer/editor/database objects;
- source map can point a diagnostic back to the imported source without making source format the runtime API;
- external source updates produce an explicit content identity/patch, not an in-place mutable database surprise.

## Out of scope

- productizing a generic legacy event interpreter in `@sillymaker/*`;
- generic untyped variable/switch pools;
- SQL/SQLite as live gameplay State;
- automatic conversion of arbitrary source scripts into safe rules;
- mandatory migration to Typed StateStore without measured authoring pain.

## Decision record

本备忘不批准新 public API。兼容实验可留在 gitignored/local research；引擎只吸收由原创第二消费者证明的通用缺口。正式 importer 应输出 SillyMaker content/module contracts，而不是把来源工程挂进 runtime。
