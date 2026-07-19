# Project documentation

Active documentation describes the code and decisions maintained after the first PoC Goal. Update it alongside implementation changes; do not use old milestone plans as hidden authority.

## Current SillyMaker implementation

- [Architecture](engine/architecture.md) — packages, ownership, data flow, runtime, persistence, and extension boundaries.
- [Features](engine/features.md) — implemented authoring, runtime, UI, Web, diagnostics, and tooling capabilities.
- [Development](engine/development.md) — setup, repository layout, testing policy, and maintenance workflow.
- [Story authoring](engine/story-authoring.md) — composing a Story from gameplay and presentation facets.
- [Build and release](engine/build-and-release.md) — development server, Player build, local Artifact, and smoke verification.

## Accepted direction and active plan

- [Engine roadmap](engine/roadmap.md) — continuous vNext, VN, tooling, editor, rollback, and Tavern feedback sequence.
- [AI-friendly Story authoring](engine/design/ai-authoring.md) — Authoring Kit, diagnostics, composers, tooling, harness, and Agent contract.
- [E2E engine validation](engine/design/e2e-engine-validation.md) — the new Engine Conformance Story and test ownership.
- [VN presentation runtime](engine/design/vn-presentation-runtime.md) — semantic Stage, Transition, PendingInteraction, Audio, and player systems.
- [vNext foundations implementation plan](engine/plans/2026-07-19-sillymaker-vnext-foundations.md) — current task order, acceptance, and stop conditions.

These documents describe accepted targets and planned work. A capability remains unimplemented until the current implementation documents and behavior tests say otherwise.

## Exploratory proposals

- [Typed StateStore proposal](engine/proposals/typed-state-store.md) — an independent, non-binding State-management option to evaluate only against concrete authoring/gameplay friction.

## Project Tavern

- [Gameplay redesign status](game/README.md) — current product intent and what is deliberately open for redesign.

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
