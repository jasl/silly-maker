# e2e/ agent handbook

This package is the **Engine Lab**: the neutral engine-conformance Story (MIT) and the acceptance surface for engine behavior — the browser E2E suites (`engine/packages/web/e2e/engine/**`) and the headless conformance tests both run on it.

Change discipline: **change only in service of engine work**. It is not a game and accepts no gameplay design; new engine capabilities get a vertical proof here (one minimal real path per capability). Any state-contract change must bump revisions per the sync table and update the test assertions with it.

## Script/text tasks (most common)

Which file to edit: dialogue and UI copy → the textId catalog in `src/presentation.ts`; story nodes/branches/stage directives → `src/narrative.ts`; stage renderers and shell widgets → `src/application/shell-ui.tsx`; the VN player → `narrative-ui.tsx`; the application declaration and slot orchestration → `composition.tsx` (do not export PascalCase components from the same file as `labGameApplicationV1`, or Vite Fast Refresh breaks). `core-application.ts` is the headless instance factory.

Before editing, list the full node sequence (one occurrence number per say/choice boundary, starting at 1) so the scenario script (`src/tooling/simulation-target.ts`) and tests are written correctly on the first pass.

Verification loop after every edit (seconds):

```sh
deno task typecheck
deno run -A npm:vitest run <this package directory>
deno task story simulate <appId> --scenario <name>
```

Rules in brief:

- Every new say/choice needs a brand-new `definitionId` (`interaction.<story>.<name>`); never reuse one.
- A `stage` node's `mayShow` honestly lists every contentId it might show; a `branch`'s `choose` must land inside `successors` (tests enforce both).
- New stage content is wired in three places: the contentId constant in narrative, the content catalog in presentation, the renderer in composition.
- Saveable state holds integers only (logical units like `scalePermille`); floats are rejected by canonical JSON.
- Use `show` for content entering an empty stage; `replace` only for content already on stage.

## Module/state tasks

Four wiring points: `state.ts` (interface + schema + initial value) → `simulation.ts` (module owner + commands) → `application/semantic.ts` (action catalog + blockedBy) → `story.ts` (manifest entry; module ids in lexicographic order). The revision-sync table and the diagnostics quick-reference are in `docs/engine/authoring-quickstart.md`; do not bump revisions from memory.

## Forbidden

- Import only `@sillymaker/*` package exports; never import engine `src/**` paths, never import another Story.
- For engine-behavior questions read `docs/engine/features.md`; do not guess from engine source.
- Do not loosen assertion semantics to make tests pass; when occurrence assertions mismatch, renumber per the failure message.
