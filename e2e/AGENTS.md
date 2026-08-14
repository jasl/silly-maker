# e2e/ agent handbook

This package is the **Engine Lab**: the neutral engine-conformance Story (MIT) and the acceptance surface for engine behavior — the browser E2E suites (`engine/packages/web/e2e/engine/**`) and the headless conformance tests both run on it.

Change discipline: **change only in service of engine work**. It is not a game and accepts no gameplay design; new engine capabilities get a vertical proof here (one minimal real path per capability). Any state-contract change must bump revisions per the sync table and update the test assertions with it.

## Script/text tasks (most common)

Which file to edit: dialogue and UI copy → the textId catalog in `src/presentation.ts`; story nodes/branches/stage directives → `src/narrative.ts`; stage renderers and shell widgets → `src/application/shell-ui.tsx`; the passive production Narrative renderer and its public `defineNarrativeSurfaceV1` adapter → `src/application/narrative-renderer.tsx`; the query-gated WholeCanvas catalog, application source, passive renderer, and public definition → `src/application/whole-canvas-conformance.tsx`; the application declaration, slot orchestration, sole `application.ui().narrative` binding, and exact `whole_canvas_conformance=1` opt-in → `composition.tsx` (do not export PascalCase components from the same file as `labGameApplicationV1`, or Vite Fast Refresh breaks). `core-application.ts` is the headless instance factory.

Before editing, list the full node sequence (one occurrence number per say/choice boundary, starting at 1) so the scenario script (`src/tooling/simulation-target.ts`) and tests are written correctly on the first pass.

Verification loop after every edit (seconds):

```sh
deno task typecheck
deno run -A npm:vitest run <this package directory>
deno task story simulate <appId> --scenario <name>
```

Rules in brief:

- Every new say/choice needs a brand-new `definitionId` (`interaction.<story>.<name>`); never reuse one.
- Engine Lab has one composition-owned Narrative writer. Extend its public `NarrativeSurfaceDefinitionV1`; do not mount another player or mirror its lifecycle, playback, History, input, or Stage state.
- Engine Lab is the neutral second WholeCanvas consumer only when the exact `whole_canvas_conformance=1` query is present. The default route omits `application.ui().wholeCanvas` and allocates no Story WholeCanvas source or Host. Extend the public `defineWholeCanvasSurfaceV1` + `createWholeCanvasApplicationSourceV1` path; the renderer consumes immutable frame props and sends only frame-bound actions/back.
- A `stage` node's `mayShow` honestly lists every contentId it might show; a `branch`'s `choose` must land inside `successors` (tests enforce both).
- New stage content is wired in three places: the contentId constant in narrative, the content catalog in presentation, the renderer in composition.
- Saveable state holds integers only (logical units like `scalePermille`); floats are rejected by canonical JSON.
- Use `show` for content entering an empty stage; `replace` only for content already on stage.

## Module/state tasks

Four wiring points: `state.ts` (interface + schema + initial value) → `simulation.ts` (module owner + commands) → `application/semantic.ts` (action catalog + blockedBy) → `simulation-definition.ts` (manifest entry; module ids in lexicographic order). Keep the package identity revision in `story.ts` synchronized. The revision-sync table and the diagnostics quick-reference are in `docs/engine/authoring-quickstart.md`; do not bump revisions from memory.

## Motion collaboration contract

Stage entrance/exit animations are `src/motions/*.motion.json` assets bound through `motionStageTransitionV1`. Do not overwrite a motion whose `authoring.status` is `"human_tuned"` or that is `locked` unless the task explicitly names it (locked changes go through a new variant file); preserve stable motion/transition ids across scene refactors; new tunable animation goes into a new motion file, never inline duration/easing constants in scene code.

## Scene collaboration contract

The Engine Lab intentionally stays a low-level rig: it declares no `*.scene.json` today, and its placement literals in the script are the exercised low-level API. If a scene document is ever added, the same contract as `template`/`examples` applies — the document becomes that scene's single authoring authority (stage nodes reference cues; no duplicated placement literals or global enter-edge motion inference), sceneId/cueId stay stable across refactors, and the filename stem matches the sceneId's final segment.

## Forbidden

- Import only `@sillymaker/*` package exports; never import engine `src/**` paths, never import another Story.
- For engine-behavior questions read `docs/engine/features.md`; do not guess from engine source.
- Do not loosen assertion semantics to make tests pass; when occurrence assertions mismatch, renumber per the failure message.
