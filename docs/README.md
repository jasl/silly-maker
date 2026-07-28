# Project documentation

Active documentation describes the code and decisions maintained after the first PoC Goal. Update it alongside implementation changes; do not use old milestone plans as hidden authority.

## Current SillyMaker implementation

- [Architecture](engine/architecture.md) — packages, ownership, data flow, runtime, persistence, and extension boundaries.
- [Features](engine/features.md) — implemented authoring, runtime, UI, Web, diagnostics, and tooling capabilities.
- [Development](engine/development.md) — setup, repository layout, testing policy, and maintenance workflow.
- [Story authoring](engine/story-authoring.md) — composing a Story from gameplay and presentation facets.
- [Agent game guide](engine/agent-game-guide.md) — how to have a coding agent generate a game here.
- [Windowing and the UI component system](engine/design/window-model.md) — the layered UI contract, windowing recipes, and the component promotion backlog (DialoguePanelV1 next).
- [Feature slices proposal](engine/proposals/feature-slices.md) — extending Module cohesion to whole gameplay verticals; the code-organization answer to layer-file bloat.
- [Build and release](engine/build-and-release.md) — development server, Player build, local Artifact, desktop save server, and smoke verification.
- [Authoring quickstart](engine/authoring-quickstart.md) — the layered playbook agents and humans follow for Story edits.

The public documentation site lives in `website/` (VitePress, English and Chinese) and is the audience-facing portal; this `docs/` tree holds internal engineering documents and is not published.

## Accepted direction and active plan

- [Engine roadmap](engine/roadmap.md) — continuous vNext, VN, tooling, editor, rollback, and Tavern feedback sequence.
- [AI-friendly Story authoring](engine/design/ai-authoring.md) — Authoring Kit, diagnostics, composers, tooling, harness, and Agent contract.
- [E2E engine validation](engine/design/e2e-engine-validation.md) — the new Engine Conformance Story and test ownership.
- [VN presentation runtime](engine/design/vn-presentation-runtime.md) — semantic Stage, Transition, PendingInteraction, Audio, and player systems.
- [Game viewport and UI shell](engine/design/game-viewport-and-ui-shell.md) — logical canvas, scaling, theme tokens, default surface baseline, and the player/debug boundary.
- [vNext foundations implementation plan](engine/plans/2026-07-19-sillymaker-vnext-foundations.md) — the R1–R4 execution record.
- [R5–R7 execution plan](engine/plans/2026-07-28-sillymaker-r5-r7.md) — Timeline, DevTools data plane, rollback, and the evidence-driven defer/delivery ledger.
- [Event pool design](engine/design/event-pool.md) — conditional weighted draws with explanations.

These documents describe accepted targets and planned work. A capability remains unimplemented until the current implementation documents and behavior tests say otherwise.

## Exploratory proposals

- [Typed StateStore proposal](engine/proposals/typed-state-store.md) — an independent, non-binding State-management option to evaluate only against concrete authoring/gameplay friction.
- [Content database proposal](engine/proposals/content-database.md) — delivered 2026-07-28; kept as the design rationale for the shipped tables.

## Research

- [Reference register](research/reference-register.md) — every ignored local reference and its usage boundary.
- [RPG Maker MV gap analysis](research/2026-07-28-imouto-rpgmv-gap-analysis.md) and [DoL engine gap review](research/2026-07-28-dol-engine-gap-review.md) — the capability-gap evidence behind the content database, hit regions, meta progress, event pool, and tuning channel.

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

The [first PoC Goal archive](archive/2026-07-first-poc-goal/README.md) contains the former Goal, plans, specifications, runbooks, PoC rules, balance documents, and design baselines. It is intentionally non-authoritative and is not part of normal development navigation.
