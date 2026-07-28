# Core concepts

Five ideas carry the whole engine. Every API you will meet is one of them wearing a specific hat.

## 1. One authoritative session

A Story resolves into a deterministic simulation; a session owns its state. All writes go through **commands** that either commit a complete valid result or leave state untouched. The command log, saves, replay, and player rollback all hang off this single spine.

```text
Story definition -> resolved GameSimulation -> GameSession/GameSnapshot
 -> GameQueries -> SemanticPublication -> presentation -> renderer
```

UI and automation never mutate state directly — they dispatch **semantic invocations** ("play with the cat", "run the shop") that map to commands.

## 2. Modules own state slots

Gameplay state is split into modules (calendar, cat, shop…), each owning a validated slot with a schema and a revision. A command's effects across several modules commit in one atomic transaction. Randomness comes from a transactional RNG whose state lives inside the snapshot — a rolled-back retry reproduces the same outcome.

## 3. Static data is content, not state

Item tables, activity definitions, event candidates, and reaction rules are **content-database tables**: validated at definition (primary keys, cross-table references, text references), queried through a typed read-only surface (`byId`, `findMany` with conditions), and never mutated at runtime. The boundary is strict — if it changes during play, it belongs to a module; if it's authored, it belongs to a table.

## 4. The stage is semantic

What's on screen is described as plain data: layers, entries with content IDs, integer placements, appearances, and optional hit regions. A content catalog resolves IDs to renderer props; React renderers draw them; a viewport letterboxes the whole logical canvas uniformly (absolute layout at a design resolution — static art scales as one unit). Pointer, touch, and keyboard all land in the same semantic path.

## 5. Explanations are data

Draws from the event pool report their candidates, weights, and roll. Rejected commands return structured codes. Diagnostics are typed envelopes. Transient presentation feedback derives from committed facts. This is what makes the engine legible to AI agents and debuggable by humans — the same explanation objects feed tests, DevDock panels, and simulation reports.
