# e2e/ agent handbook

This package is the **Engine Lab**: the neutral engine-conformance Story (MIT) and the acceptance surface for engine behavior — the browser E2E suites (`engine/packages/web/e2e/engine/**`) and the headless conformance tests both run on it.

Change discipline: **change only in service of engine work**. It is not a game and accepts no gameplay design; new engine capabilities get a vertical proof here (one minimal real path per capability). Any state-contract change must bump revisions per the sync table and update the test assertions with it.

## Script/text tasks (most common)

Which file to edit: dialogue and UI copy → the textId catalog in `src/presentation.ts`; story nodes/branches/stage directives → `src/narrative.ts`; static stage asset/renderer registries → `src/application/stage-rendering.tsx`; shell widgets → `src/application/shell-ui.tsx` (runtime exports must remain PascalCase React components only so Vite Fast Refresh can retain the page); the passive production Narrative renderer and its public `defineNarrativeSurfaceV1` adapter → `src/application/narrative-renderer.tsx`; the query-gated WholeCanvas catalog, application source, passive renderer, and public definition → `src/application/whole-canvas-conformance.tsx`; the application declaration, slot orchestration, sole `application.ui().narrative` binding, and exact `whole_canvas_conformance=1` opt-in → `composition.tsx` (do not export PascalCase components from the same file as `labGameApplicationV1`, or Vite Fast Refresh breaks). `core-application.ts` is the headless instance factory.

Before editing, list the full node sequence (one occurrence number per say/choice boundary, starting at 1) so the scenario script (`src/tooling/simulation-target.ts`) and tests are written correctly on the first pass.

Verification loop after every edit (seconds):

```sh
deno task typecheck
deno run -A npm:vitest run <this package directory>
deno task app simulate <appId> --scenario <name>
```

Rules in brief:

- Every new say/choice needs a brand-new `definitionId` (`interaction.<story>.<name>`); never reuse one.
- Engine Lab has one composition-owned Narrative writer. Extend its public `NarrativeSurfaceDefinitionV1`; do not mount another player or mirror its lifecycle, playback, History, input, or Stage state.
- Engine Lab is the neutral second WholeCanvas consumer only when the exact `whole_canvas_conformance=1` query is present. The default route omits `application.ui().wholeCanvas` and allocates no Story WholeCanvas source or Host. Extend the public `defineWholeCanvasSurfaceV1` + `createWholeCanvasApplicationSourceV1` path; the renderer consumes immutable frame props and sends only frame-bound actions/back.
- A `stage` node's `mayShow` honestly lists every contentId it might show; a `branch`'s `choose` must land inside `successors` (tests enforce both).
- New stage content is wired in three places: the contentId constant in narrative, the content catalog in presentation, and the renderer registry in `src/application/stage-rendering.tsx`.
- Saveable state holds integers only (logical units like `scalePermille`); floats are rejected by canonical JSON.
- Use `show` for content entering an empty stage; `replace` only for content already on stage.

## Module/state tasks

Four wiring points: `state.ts` (interface + schema + initial value) → `simulation.ts` (module owner + commands) → `application/semantic.ts` (action catalog + blockedBy) → `simulation-definition.ts` (manifest entry; module ids in lexicographic order). Keep the package identity revision in `story.ts` synchronized. The revision-sync table and the diagnostics quick-reference are in `docs/engine/authoring-quickstart.md`; do not bump revisions from memory.

## Motion collaboration contract

Stage entrance/exit animations are `src/motions/*.motion.json` assets bound through `motionStageTransitionV1`. Do not overwrite a motion whose `authoring.status` is `"human_tuned"` or that is `locked` unless the task explicitly names it (locked changes go through a new variant file); preserve stable motion/transition ids across scene refactors; new tunable animation goes into a new motion file, never inline duration/easing constants in scene code.

## Scene collaboration contract

The Engine Lab intentionally stays a low-level rig except for one minimal Player authoring path: `src/scenes/procedure/procedure.authoring-scene.json` is the single authority for the procedure scene's hierarchy, layers, characters, placements, opening appearances, and Motion cue. Its explicit `sceneSources` package import compiles to a runtime-only plan; `labStageMutationsForBeginV1` derives its whole-scene open from that plan, and an accepted R2 successor may reconcile only authoritative layer/z ordering through an ordinary Stage command. Do not duplicate those declarations in gameplay code or tests. `src/scenes/inspector/inspector-conformance.authoring-scene.json` is the separate Project Authoring Index/standalone Inspector behavior fixture; it is discovered for Inspector CAS, hierarchy/facet/ghost/scrub coverage and never participates in Player composition. DevDock provenance is read-only and must not grow a second writable Motion session under the Game root. Any further scene source follows the same contract as `template`/`examples` — stage nodes reference cues, sceneId/cueId stay stable across refactors, and no global enter-edge motion inference replaces explicit scene bindings.

## Experimental Agent/UiArtifact conformance

AR4's dev-only vertical proof now enters through `src/tooling/inspector-binding.ts`. It supplies the Engine Lab's real presentation seams, decorates that bounded Inspector binding through `@sillymaker/studio/internal/agent`, creates the deterministic fake from `@sillymaker/agent/internal`, and allowlists one pre-admitted AR2 Scene operation. Keep it fake and provider-neutral. Do not add a real backend/LLM, network protocol, OpenUI/A2UI payload, Agent persistence, tool/permission system, public Agent ABI, or direct Scene session/file/Game State authority here.

The path is fake stream → transient draft → fully admitted immutable Artifact → closed renderer → current admitted intent → the existing captured-receipt Scene executor. Run identity is `(sessionId, runId)`; remote `run_failed` terminates both run and streaming draft. An Artifact action remains inert until paired with an exact AR2 Scene receipt, and a later-ready Scene may pair the same Artifact before enabling it. Unknown node/action, stale Scene receipt, old connection/run, invalid completion, and cancellation-late completion must not replace the predecessor Artifact or mutate the Scene draft. A valid action may change only the in-memory procedure Scene draft; tests must keep source bytes and source-IO writes unchanged until an explicit human save. Hiding and reopening the embedded panel preserves the same Authoring Host, Agent Host, and retained Artifact without another RPC/model/tool call.

The full Artifact/currentness matrix remains in the unit/jsdom acceptance at `src/test/authoring-host-lifetime.test.tsx`. Browser coverage is deliberately narrower: `engine/packages/web/e2e/engine/embedded-authoring.spec.ts` proves the held Agent stream and predecessor action remain usable across the contract-level Authoring R1 rejection/retry path, while `engine/packages/web/e2e/engine/inspector.spec.ts` owns standalone Authoring Scene behavior. Ordinary Engine Lab Player measurement must continue to exclude all `engine/packages/agent/**` and RPC implementation modules. The complete Template Inspector Author graph is the authoring-only negative control: it retains the Authoring Host and development source client while excluding Agent/RPC and the experimental Agent surface. Engine Lab's Inspector companion is an explicit private opt-in, not a final-graph requirement or public ABI. This experimental Agent Host is unrelated to Base's player-safe `AgentGamePortV1`: never widen that gameplay automation port into RPC, authoring, or Artifact authority.

## Forbidden

- Import only `@sillymaker/*` package exports; never import engine `src/**` paths, never import another Story.
- For engine-behavior questions read `docs/engine/features.md`; do not guess from engine source.
- Do not loosen assertion semantics to make tests pass; when occurrence assertions mismatch, renumber per the failure message.
