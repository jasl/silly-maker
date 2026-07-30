# Project documentation

Active documentation describes the code and decisions maintained after the first PoC Goal. Update it alongside implementation changes; do not use old milestone plans as hidden authority.

## Current SillyMaker implementation

- [Architecture](engine/architecture.md) — packages, ownership, data flow, runtime, persistence, and extension boundaries.
- [Features](engine/features.md) — implemented authoring, runtime, UI, Web, diagnostics, and tooling capabilities.
- [Development](engine/development.md) — setup, repository layout, testing policy, and maintenance workflow.
- [Story authoring](engine/story-authoring.md) — composing a Story from gameplay and presentation facets.
- [Agent game guide](engine/agent-game-guide.md) — how to have a coding agent generate a game here.
- [Windowing and the UI component system](engine/design/window-model.md) — the layered UI contract, windowing recipes, and product slot semantics; the unified Surface lifecycle authority is owned by the [Surface Contract Harness design](engine/design/surface-contract-harness.md).
- [Feature slices proposal](engine/proposals/feature-slices.md) — extending Module cohesion to whole gameplay verticals; the code-organization answer to layer-file bloat.
- [Build and release](engine/build-and-release.md) — development server, Player build, local Artifact, desktop save server, and smoke verification.
- [Authoring quickstart](engine/authoring-quickstart.md) — the layered playbook agents and humans follow for Story edits.

The public documentation site lives in `website/` (VitePress, English and Chinese) and is the audience-facing portal; this `docs/` tree holds internal engineering documents and is not published.

## Accepted direction and active plans

- [Engine roadmap](engine/roadmap.md) — accepted direction, remaining milestones, and continuous tracks; dated delivery history lives in the [roadmap archive](engine/roadmap-archive.md).
- [Production-floor execution sequence](engine/plans/2026-07-30-production-floor-sequence.md) — the only cross-plan ordering entry; the core sequence starts with Snapshot S0, while desktop durability is a conditional promotion lane.
- [Desktop persistence durability plan](engine/plans/2026-07-30-desktop-persistence-durability.md) — independent Host-record conformance, crash/cross-process transaction backend, recovery, and real packaged-app promotion before desktop leaves preview.
- [Snapshot commit performance plan](engine/plans/2026-07-30-snapshot-commit-performance.md) — baseline, digest/serialization reuse, and byte-equivalence gates.
- [Save migration plan](engine/plans/2026-07-30-save-migration.md) — bounded envelope load order, migration registry, product path, and maintained fixtures.
- [Managed Surface lifecycle plan](engine/plans/2026-07-30-surface-contract-harness.md) — pilot-first Coordinator migration, then System/Narrative and the verification harness.
- [Managed Surface lifecycle and contract harness](engine/design/surface-contract-harness.md) — the accepted Surface contract behind the plan above.
- [Save migration design](engine/design/save-migration.md) — first-class migration registry and the reworked load order.
- [Mod composition and distribution](engine/design/mod-system.md) — accepted incubation design; activation is gated behind the production floor and proven reusable capability slices.
- [AI-friendly Story authoring](engine/design/ai-authoring.md) — Authoring Kit, diagnostics, composers, tooling, harness, and Agent contract.
- [E2E engine validation](engine/design/e2e-engine-validation.md) — the Engine Conformance Story and test ownership.
- [VN presentation runtime](engine/design/vn-presentation-runtime.md) — semantic Stage, Transition, PendingInteraction, Audio, and player systems.
- [Game viewport and UI shell](engine/design/game-viewport-and-ui-shell.md) — logical canvas, scaling, theme tokens, default surface baseline, and the player/debug boundary.
- [Event pool design](engine/design/event-pool.md) — conditional weighted draws with explanations.

These documents describe accepted targets and planned work. A capability remains unimplemented until the current implementation documents and behavior tests say otherwise.

## Exploratory proposals

- [Typed StateStore proposal](engine/proposals/typed-state-store.md) — an independent, non-binding State-management option to evaluate only against concrete authoring/gameplay friction.
- [Content database proposal](engine/proposals/content-database.md) — delivered 2026-07-28; kept as the design rationale for the shipped tables.
- [Pointer gesture fence proposal](engine/proposals/pointer-gesture-fence.md) — delivered tactical bridge; only the stage hook is public, and the Surface web adapter owns its absorption/removal gate.
- [External content import vs runtime State boundary](engine/proposals/external-content-runtime-boundary.md) — where imported/static content ends and mutable gameplay State begins, without binding the engine contract to a private experiment.
- [RNG reseed audit lineage proposal](engine/proposals/rng-seed-lineage.md) — deferred; prefer CommandLog/DebugBundle-derived evidence over a second wall-clock lineage store.

## Research

- [Reference register](research/reference-register.md) — every ignored local reference and its usage boundary.
- [RPG Maker MV gap analysis](research/2026-07-28-mv-slg-gap-analysis.md) and [DoL engine gap review](research/2026-07-28-dol-engine-gap-review.md) — the capability-gap evidence behind the content database, hit regions, meta progress, event pool, and tuning channel.
- [Game-engine surface/state/verification survey](research/2026-07-30-game-engine-surface-state-harness.md) — the cross-engine comparison behind the Surface Contract Harness design.
- [OpenUI Generative UI research](research/2026-07-29-openui-genui-support.md) — dependency/architecture fit, the Query/Mutation permission boundary, and the durable UI Artifact model.

## Game design

- [Gameplay redesign status](game/README.md) — current product intent and what is deliberately open for redesign.
- [Presentation and UI redesign](game/presentation-and-ui.md) — screen framework, visual language, asset plan, and the playable acceptance bar.

New game-design documents should be added under `docs/game/` and linked from that page. The implementation is the best description of current behavior until a replacement design is accepted.

## Durable policies and research

- [Licensing](policies/licensing.md)
- [Assets, AIGC, third-party material, and local references](policies/assets-and-references.md)
- [Reference register](research/reference-register.md)
- [Existing reference-study notes](research/degrees-of-lewdity-notes.md)
- [Ren'Py engine capability study](research/renpy-engine-study.md)

Root legal files remain controlling when a summary conflicts with them.

## Historical material

- [Roadmap archive](engine/roadmap-archive.md) — dated delivery/acceptance history and the full text of completed milestones.
- [vNext foundations implementation plan](engine/plans/2026-07-19-sillymaker-vnext-foundations.md) — the R1–R4 execution record.
- [R5–R7 execution plan](engine/plans/2026-07-28-sillymaker-r5-r7.md) — Timeline, DevTools data plane, rollback, and the evidence-driven defer/delivery ledger (defer gates remain active).
- The first Tavern PoC application is retired on branch `archive/poc-v1-stage-2026-07`; do not reactivate its specifications by editing them in place.
