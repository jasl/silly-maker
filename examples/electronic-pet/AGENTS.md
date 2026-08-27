# Electronic Pet agent handbook

This package is the independent WIP successor described by
`docs/game/electronic-pet.md` and
`docs/engine/plans/2026-08-27-electronic-pet-reference-product.md`. The product
contract and active milestone override copied starter conventions. Cat Cafe
remains the flagship until M5 retirement closes.

## Current boundaries

- M0–M2 are complete. The current baseline is one room, one cat, two toys,
  authored contact/grooming volumes, and the first authoritative adoption/care
  loop; it is still a WIP, not the complete game. M3 expands
  relationship depth, interactions, content, feedback, and product art without
  shrinking the accepted denominator.
- Use project-owned or compatible assets and mature Three/React packages.
  `references/Meow-Generator` is research-only and must not enter source,
  assets, fixtures, names, tests, or build inputs.
- Keep one authoritative Game State. DOM, Three objects, pointer trajectories,
  animation blends and transient physics stay in presentation. Commit one
  semantic result after renderer-local gesture aggregation.
- Direct petting targets mouse and touch only. Do not add keyboard or gamepad
  substitutes, and do not persist the physical input source. Ordinary DOM UI
  must retain its native keyboard and accessibility behavior.
- Every authorable object has one stable ID and one author authority, with
  traceable resource/clip, renderer, behavior, interaction, source and
  diagnostics. Human and Agent edits share structured operations, CAS and
  undo/redo.
- Do not import engine `src/**`, copy Authoring Host/session/source IO, or add a
  second writable store. Use supported package exports only.
- Do not introduce a generic 3D engine, ECS, physics abstraction, Prefab,
  Blueprint, behavior-tree DSL, cache/Worker framework, public Mod API, or
  Desktop promotion path.

## Locality

- `src/game/**`: deterministic State, schemas, rules, commands and queries;
- `src/content/**`: product-owned behavior, interaction, item, and presentation
  declarations;
- `src/application/**`: Host-neutral core and Browser/Desktop web binding;
- `src/presentation/**`: Three renderer, assets/clips, interaction picking and
  resource disposal;
- `src/authoring/**`: product author document/compiler, operation mapping and
  dev-only Inspector binding;
- `src/ui/**`: product care controls and pointer-driven play surfaces;
- `src/tooling/**`: development-only product source route and IO;
- `assets/**`: application-owned runtime bytes.

Keep React components out of mixed non-component export files so Vite Fast
Refresh remains valid. Tests protect observable rules, atomic/current behavior,
Object bindings, authoring CAS and resource lifecycle; do not build exact DOM,
Three-object, source-file or command inventories.

Browser tests import the shared fixture from `examples/e2e/fixtures.ts`; it
disconnects final audio output by default while preserving real graph/fetch
behavior. Do not add a product-specific test mute system.
