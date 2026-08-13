# Tuning and debugging

The engine treats "adjust the game" as a first-class workflow, for humans and agents alike. Tuning commands go through the same authoritative commit path as gameplay; session and Save maintenance use the engine's explicit lifecycle and persistence ports rather than a second state authority.

## Data first

Most tuning is editing a content-table row (an activity's stamina cost, an event's weight or condition). Vite hot-reloads the change into a fresh session; parse-time validation reports structural mistakes immediately with structured codes.

## The DevDock

Run any app with capabilities enabled:

```text
http://localhost:5173/?capability=debug_tools&capability=cheats
```

- **Read-only inspectors** open as floating windows from the 调试 launcher and show the live game view, interactions, and the narrative graph with lint results.
- The **tuning panel** (cheat authority) submits Story-defined debug commands — set a stat, fast-forward days, force an encounter. They validate first, commit atomically, land in the command log tagged `source: "debug"`, and replay faithfully.
- **Session maintenance** is inlined in the launcher (not a floating cheat panel): export or import state, reinitialize the session, and clear Save slots behind an explicit confirmation. Partial cleanup failures are reported instead of claiming that all local data was wiped.

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
