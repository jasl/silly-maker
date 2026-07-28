# Tuning and debugging

The engine treats "adjust the game" as a first-class workflow, for humans and agents alike. Nothing here bypasses the authoritative session — every tool goes through the same commit path the game uses.

## Data first

Most tuning is editing a content-table row (an activity's stamina cost, an event's weight or condition). Vite hot-reloads the change into a fresh session; parse-time validation reports structural mistakes immediately with structured codes.

## The DevDock

Run any app with capabilities enabled:

```text
http://localhost:5173/?capability=debug_tools&capability=cheats
```

- **Read-only inspectors** show the live game view, interactions, and the narrative graph with lint results.
- The **tuning panel** (cheat authority) submits Story-defined debug commands — set a stat, fast-forward days, force an encounter. They validate first, commit atomically, land in the command log tagged `source: "debug"`, and replay faithfully.

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
