# Tuning and debugging

The engine treats "adjust the game" as a first-class workflow, for humans and agents alike. Tuning commands go through the same authoritative commit path as gameplay; session and Save maintenance use the engine's explicit lifecycle and persistence ports rather than a second state authority.

## Data first

Most tuning is editing a content-table row (an activity's stamina cost, an event's weight or condition). Vite hot-reloads the change into a fresh session; parse-time validation reports structural mistakes immediately with structured codes.

## The DevDock

Run any app with capabilities enabled:

```text
http://localhost:5173/?capability=debug_tools&capability=cheats
```

- **状态**: engine state and session maintenance. **导出状态** / **导入状态** on one row; engine **状态查看** (authoritative `snapshot.state` JSON) and **状态编辑** (existing number/bool/string leaves through `sillymaker.debug.patch_state`: validate, atomic commit, `source: "debug"` in the command log, replay faithfully — out-of-range or schema-invalid edits fail closed). **刷新状态** serializes the live snapshot (including debug-patched leaves) and loads it as the current session without downloading a file; **初始化** returns to the title. Both ask for confirmation. **清空存储** is the last row (confirmed Core wipe; partial cleanup failures are reported instead of claiming that all local data was wiped).
- **场景**: freeze/resume the presentation clock; Story scene tools such as narrative preview; **Inspector** opens the same-origin `/__sillymaker/inspector/` page when the application declares an Inspector binding and the Vite plugin advertises it. The current surface provides bounded Authoring Scene inspection/editing, not the former multi-workspace Studio. It is absent from production builds and from applications such as Cat Cafe that do not opt in.
- **作弊**: Story-specific cheat-authority windows (not an engine capability area). They submit Story-defined debug commands — set a stat, fast-forward days, force an encounter — on the same commit path. These stay disabled until `cheats` is on.

Enabling developer tools from Settings after boot may require a reload before 状态编辑 can write (debug control is attached at instance construction). The query string above attaches it from the first load.

## Trajectories

```sh
deno task story simulate <app> --scenario <name> \
  --trace game.cat.trust,game.shop.money
```

Per-step numeric curves out of a headless run. Edit a table, re-run, compare.

## Save diffs

```sh
deno task story diff before.json after.json
```

Structured path-level differences between two exported saves or simulate reports — "where exactly did these runs diverge", not just "they differ".
