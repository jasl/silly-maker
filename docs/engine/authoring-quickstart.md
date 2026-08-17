# Story authoring quickstart

Status: operating guide for the current implementation. For human authors and LLM agents; layered by task difficulty — weaker models should start at tier A. Conceptual background in [story-authoring](story-authoring.md); full capabilities in [features](features.md).

## 0. One iron rule

Story code imports only `@sillymaker/*` package exports (`@sillymaker/base`, `@sillymaker/base/story`, `@sillymaker/base/runtime`, `@sillymaker/ui`, `@sillymaker/web`, `@sillymaker/tooling/project`). Never import engine `src/**` paths, never import another Story. The `public-import-boundary` test rejects violations.

Prefer importing from `@sillymaker/base/story`: it exports the current author-facing contract under version-suffix-free names (`SemanticStageState`, `StageMutation`, `PendingInteraction`, `NarrativeGraph`, `reduceStageMutations`, `evaluateInteractionResolution`…), fully equivalent to the suffixed originals.

## Scene authoring first: play the game, open Studio

Ordinary scene work — moving an actor, resizing it, changing which motion plays on an entrance — does not start in a TypeScript tree. Start the game (`deno task author <application-id>` or `deno task dev`), enable developer tools, and open **调试 → 场景 → Studio** (a same-origin new tab; the live session keeps running so saves apply over HMR). The starter (`template`) and the Cat Cafe opening are live scene-managed references.

- A scene lives in one document: `src/scenes/<scene>/<scene>.scene.json` is the **single authoring authority** for that scene's visual composition — entries (layer/tag/content/zOrder/placement/appearance), named cues (`show`/`hide`, each optionally declaring its edge presentation: one `*.motion.json` binding or an explicit instant `cut: true` — two cues may declare divergent presentations on one edge, resolved per dispatching cue through presentation edge context since cue identity, 2026-08-17), and presence-bound ambient loops (`ambient: { motionId, phaseMs? }` on an entry: an ordinary motion document sampled while the entry is settled — breathing idles, drifting mist/cloud bands, window rain; the scene package compiles `sceneAmbientCatalog` and the composition passes it to the stage's `ambient` prop). The script references cues (`cueMutations`/`cueMayShow`); it never repeats placement literals.
- In Studio: drag geometry-declared actors on the canvas (snap to edges/centers, corner handle scales), edit exact numbers in the inspector, rebind cue motions in the cue table, and tune keyframes in the embedded Motion Workbench. When the Studio binding supplies an asset registry, the canvas preloads and draws the real backgrounds/poses (Cat Cafe does; asset-free stories keep code-native placeholders). Saving writes the scene/motion document through the dev-only CAS port; `git diff` should show only those JSON files.
- Scene construction needs no code either (Authoring Architecture S4): the navigator's 新建场景 form writes a blank `src/scenes/<name>/<name>.scene.json`; the Content browser (the binding's `contents` manifest) adds declared backgrounds/characters as entries with derived stable tags and default placements; the inspector removes entries (dependent cues included) and edits appearance through structured selects (`appearanceFields`); the cue table appends/removes show/hide cues and creates-or-clones a `*.motion.json` next to the scene, bound to that cue. Placeable content without declared geometry is flagged — it cannot be dragged, only numerically placed.
- Scene and motion files register nowhere: the Project Authoring Index scans the story tree by convention (`*.scene.json`, `*.motion.json`) and feeds Studio's navigator, motion dropdown, and `story check` from one implementation. A new motion is the document itself plus the scene package's explicit import for runtime playback — the Studio binding lists no source paths, and inadmissible files surface as named warnings in Studio's diagnostics panel.
- What still needs code, one tier down: new dialogue/text (Tier A textIds), brand-new stage content declarations (content catalog + renderer + geometry + a `contents` manifest row), wiring a constructed scene into the script (stage nodes referencing its cues), mid-scene appearance beats (script-owned `setAppearance`; V1 cues cover show/hide composition), and gameplay (Tier B/C).

## Tier A: script, text, and choices (weak models start here)

Use the starter template (`template`, minimally playable) or the Engine Lab (`e2e`, full capability) as the runnable example. Scripts are ordinary TypeScript data, not a DSL:

| What to change                             | Which file                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Dialogue, narration, option text           | `labTextCatalogsV1` in `src/presentation.ts` (textId → text)                                |
| Story nodes, branches, stage commands      | `labNarrativeScriptV1` in `src/gameplay/narrative.ts` (node array)                          |
| Scene composition (placements, cue→motion) | `src/scenes/<scene>/<scene>.scene.json` (Studio or direct edit; scene-managed stories only) |
| Voice/BGM mapping                          | `src/gameplay/audio.ts`                                                                     |
| Static annotations for the graph lint      | `mayShow` on stage nodes, `successors` on branch nodes                                      |

Node kinds: `say` (speakerTextId/textId/next), `choice` (options: choiceId/textId/requiresSamples/consumesSamples/next), `stage` (`mutations(stage)` returns a StageMutation array; `mayShow` statically declares the contentIds it might show), `branch` (`choose(context)` is a pure function picking next, which must land inside `successors`), `pause`, `barrier`, `custom`, `end`. Every new say/choice needs a brand-new `definitionId` (`interaction.<story>.<name>`); never reuse one.

Verification loop after every edit (fast enough to run per change):

```sh
deno task typecheck                                # types and contracts
deno run -A npm:vitest run e2e/src/test/narrative-graph.test.ts   # graph lint clean + honest annotations
deno task story simulate e2e --scenario calibration   # play the full narrative without a browser, JSON output
deno task test:conformance:headless                # all headless conformance tests
```

Edits move occurrence numbers (each interaction boundary is numbered in order): the `calibration` scenario script for `simulate` and several tests step by number, so after inserting a boundary sync them — failure messages state the expected/actual numbers directly. Stories copied from the starter template avoid both taxes: its interaction-document kit (`template/src/story/narrative-kit.ts`) compiles pure-data blocks — one short name derives node/interaction/text ids with the default-locale line inline (other locales override by the same textId) — and its scenarios/tests resolve the current pending interaction, so inserting a line touches only the document's block array. The Engine Lab deliberately stays the numbered low-level rig.

## Tier B: a new gameplay module (medium; the F2-canary-verified path)

**Code organization**: story packages use the by-authoring-object layout (Authoring Architecture S3: `game/` authoritative rules, `content/` presentation declarations, `scenes/`, `story/` narrative, `ui/`, `application/` advanced integration). template and cat-cafe use the feature-slice layout inside it — one gameplay feature per `src/game/features/<name>/` directory (module/content/rules/handlers/UI in their places), shared contracts in `src/game/kernel.ts`, and `src/game/simulation.ts` + `src/game/content.ts` doing aggregation and re-export only (outsiders face just these two facades; the command kind→handler map is an exhaustive mapped type, so a missed wire fails to compile). The Engine Lab (e2e/) intentionally stays a single-file low-level rig. Prefer "new directory + one line per aggregation point" for new features.

A new module = four wiring points, all inside the Story package:

1. `src/game/state.ts` (Engine Lab: `src/gameplay/state.ts`): state interface + zod schema + initial value, mounted into the aggregate state.
2. `src/game/simulation.ts` or `src/game/features/<name>/module.ts` (Engine Lab: `src/gameplay/simulation.ts`): `kit.defineStatefulModule` (the owner's propose/apply); commands into the Story command/fact/rejection unions; open a transaction in the executor (cross-module writes via `transaction.propose(otherModule, …)`, atomically committed with the same command).
3. `src/application/semantic.ts`: action id into the catalog + the `blockedBy` availability rule (catalog/preview/dispatch share this one function).
4. `src/game/simulation-definition.ts` (Engine Lab: `src/simulation-definition.ts`): add the module entry to the state-contract manifest (**module ids in lexicographic order**) and sync its contract revisions; then bump the package identity in `src/story.ts` as required by the table below.

Revision-sync rules (mistakes are rejected at startup by structured diagnostics; just follow them):

| What changed                     | What must move                                                               |
| -------------------------------- | ---------------------------------------------------------------------------- |
| A module's state schema          | that module's `stateSchema.revision` + `moduleContractRevision`              |
| Module rules / command semantics | `moduleContractRevision`                                                     |
| Module added/removed             | manifest entry + `aggregateStateSchema.revision` + `stateContractRevision`   |
| Any of the above                 | story `identity.revision` +1, and update the `storyRevision` test assertions |

## Tier C: a new application / new Story (recommended for strong models)

One application = one `WebGameApplicationV1` declaration + one `startWebGameApplicationV1` call. Start from `template` (copy the directory + global rename; the copy is a complete project — `sillymaker.config.ts`, `vite.config.ts`, `tools/story.mts` — and inside this repository you additionally add its directory to the root `project.config.ts` list); the full reference is `e2e/src/application/`. Application-directory conventions: `composition.tsx` (projector/slots/the `*GameApplicationV1` declaration), `ui.tsx` or `shell-ui.tsx` (PascalCase components, in a separate file from the application declaration for Vite Fast Refresh), `core-application.ts` (headless instance factory), `entry.tsx` (boots from composition). Builds are application tasks; the story CLI carries diagnostics (app-locally via `deno task story <verb> .`, or at the repository root once the directory is listed in `project.config.ts`):

For a Narrative application, `composition.tsx` creates exactly one
`NarrativeSurfaceDefinitionV1` with `defineNarrativeSurfaceV1`. Freeze the exact
five-key input (`selectNarrative`, `dispatchResolution`, `renderer`,
`resolveText`, `replayCurrentVoice`) and use
`satisfies DefineNarrativeSurfaceInputV1<YourSemanticPublication>` to preserve
contextual typing and reject extra keys. Put the React renderer in `ui.tsx` and
return the definition as `ui.narrative`. The renderer uses only its immutable
public props and bounded callbacks; never add `slots.narrative`, import the
removed playback/conformance components, or mount another Host/Stage writer.
Applications without Narrative simply omit `ui.narrative`, as SillyOS does.

For a Story-defined WholeCanvas application surface, create exactly one
definition with `defineWholeCanvasSurfaceV1`. Freeze its seven-key input (`catalog`, `source`,
`resolveTarget`, `dispatchAction`, `renderer`, `prepareTarget`, `resolveText`)
and return it as `ui.wholeCanvas`. Choose a semantic-publication selector when
game state owns the primary (Cat Cafe ending), or
`createWholeCanvasApplicationSourceV1` for presentation-only replacement/detail
navigation (Engine Lab's opt-in rig). Put the passive React renderer in
`ui.tsx`; it consumes immutable props and frame-bound `onAction`/`onBack` only.
Do not add a Root slot, page boolean, raw input/focus writer, or a second Host.
Existing `titleScreen` automatically uses the same package-owned Splash/Title
authority and does not require `ui.wholeCanvas`. Splash and Title are sequential
scenes: gameplay HUD/stage/narrative stay concealed until New game/Continue/Load
dismisses the front door. Openings that need an explicit boot command belong on
`titleScreen.beginNewGame(semantic)`, not a second in-game control. An application
allocates no WholeCanvas Host, source, lease, or subscription only when it omits
both `titleScreen` and `ui.wholeCanvas`, as SillyOS does.

```sh
deno task dev                    # inside the application directory
deno task build:web
deno task build:desktop          # only when the application declares Desktop packaging
deno task preview
deno task story inspect <app>    # resolved identity and program report
deno task story check <app>      # structured Story diagnostics
deno task story simulate <app> [--scenario s] [--seed n]
deno task story dev <app> --smoke
deno task story prebuilt-smoke <app>
```

`dist-web/` can be deployed directly to static hosting. A distributed Player
must make the SillyMaker MIT text and any notices required by its bundled
material available through an in-product page, accompanying files, or a stable
public link; a technical Artifact manifest is optional and does not replace
that review.

## Diagnostics quick-reference (all from real pitfalls)

| Symptom                                                                                            | Cause and fix                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `story.contract_invalid: State-contract module IDs must be strictly increasing`                    | manifest module entries not in lexicographic id order; reorder                                                                                                                                                                                                         |
| `story.simulation_invalid: State-contract manifest does not match GameSimulation stateful modules` | manifest and `composeModules` disagree on modules/revisions; sync per the table above                                                                                                                                                                                  |
| `story.nondeterministic: Story definitions differ`                                                 | `define()` returned a fresh object each call; hoist the definition to a module constant                                                                                                                                                                                |
| `ui.narrative_surface_definition_invalid`                                                          | the definition input is not a frozen exact five-key record or one of its required callables is invalid; copy the template construction                                                                                                                                 |
| `ui.whole_canvas_surface_definition_invalid`                                                       | the WholeCanvas definition/catalog is not the frozen exact public shape; copy Cat Cafe or the query-gated Engine Lab construction                                                                                                                                      |
| `interaction.occurrence_mismatch`                                                                  | resolving with a stale occurrenceId; take `narrative.pending.occurrenceId` from the latest publication                                                                                                                                                                 |
| `CanonicalJsonError: number.not_integer`                                                           | a float reached saveable state; use integer logical units (e.g. `scalePermille`)                                                                                                                                                                                       |
| `e2e.ui_text_missing:<textId>`                                                                     | the script references an unregistered textId; add the catalog entry                                                                                                                                                                                                    |
| `narrative.successor_missing` / `narrative.pure_loop` (graph lint)                                 | a node's `next` targets a missing node / pure nodes form a loop with no interaction boundary; the diagnostic points back to the definition                                                                                                                             |
| `motion.document_invalid` / `motion.document_json_invalid` (`story check`)                         | a `src/**/*.motion.json` fails strict Motion admission or is not JSON; fix the file the diagnostic points at                                                                                                                                                           |
| `motion.id_duplicate` / `motion.id_filename_mismatch` (`story check`)                              | two motion files claim one id / the filename stem is not the id's final segment; rename so click-to-locate and the write port stay stable                                                                                                                              |
| `scene.document_invalid` / `scene.document_json_invalid` (`story check`)                           | a `src/**/*.scene.json` fails strict Scene admission or is not JSON; fix the file the diagnostic points at                                                                                                                                                             |
| `scene.id_duplicate` / `scene.id_filename_mismatch` / `scene.cue_motion_missing` (`story check`)   | two scene files claim one id / the filename stem drifts from the id / a cue references a motion no `*.motion.json` declares                                                                                                                                            |
| `scene.ambient_motion_missing` (`story check`)                                                     | an entry's `ambient` loop references a motion no `*.motion.json` in this source tree declares — the loop would silently never play                                                                                                                                     |
| `scene_cue_cut_invalid` / `scene_cue_cut_motion_conflict` (Scene admission)                        | a cue's `cut` is not the literal `true`, or a cue declares both `cut` and `motionId`; a cue's edge presentation is one motion xor one explicit instant cut                                                                                                             |
| `scene.cue_binding_scope_collision` (`story check`)                                                | a declared presentation (motion or explicit cut) shares a stage edge with a **bare** cue; without dispatch context the fallback matches the edge, not the cue — declare the bare cue explicitly (`cut: true` or the same motion) instead of forking the stage identity |
| `scene.cue_binding_context_missing` (runtime, dev diagnostics)                                     | a stage edge with divergent per-cue bindings resolved without presentation edge context and fell through to the outer catalog; check that the application projects stage cue dispatches and passes the batch to the stage's `dispatches` prop                          |
| Test assertions mismatch occurrence numbers                                                        | a new boundary shifted the numbering; renumber per the failure message                                                                                                                                                                                                 |

Browser-test settle signals (instead of sleeping or counting DOM nodes): the stage root publishes `data-stage-settled` — it reads `"false"` while any transition is in flight (a crossfade keeps old and new entries mounted until then), so wait on `[data-semantic-stage][data-stage-settled="true"]`. For typewriter text, the dialogue renderer receives `playerView.revealComplete`; publish it as a Story-owned `data-dialogue-*` attribute (template: `data-dialogue-reveal="complete"`) and wait on that selector before advancing.

## Motion assets and the Workbench loop

Narrative entrance/exit animation is data, not code: a `sillymaker.motion` JSON document in `src/motions/` (integer keyframes over offsetX/offsetY/scalePermille/opacityPermille, per-segment easing), bound to a stage edge with `motionStageTransition({ transitionId, motion })` in the transition catalog. Layout stays authoritative — the motion composes over the settled placement and clears to identity when its run finishes.

The human tuning loop (dev server + `debug_tools`): enable click-to-inspect in the DevDock provenance panel → click the picture on the live stage → the card shows its transition/motion/source file → "编辑 Motion" opens the Motion Workbench on the captured scene (or a Story-declared preview case) → scrub/play, edit duration/delay/keyframes, A/B against saved → save. Saving is compare-and-swap against the file digest, rewrites only that motion file deterministically, and marks it `authoring.status: "human_tuned"`. Different diagnostic operations declare different stage behavior (`DevDockPanelV1.stage`): click-to-inspect stays `live` so the game remains interactive beside the card; the Workbench stays `live` because it edits a detached capture; a panel that must inspect a transient frame sets `stage: "frozen"` (the presentation clock holds for that window's lifetime). The launcher's 冻结画面 / 恢复画面 toggle is the manual lever — opening tools does not freeze the world.

Scene-managed stories also get the dev-only SillyMaker Studio. Start the game (`deno task author <application-id>` or `deno task dev`), enable developer tools, and open **调试 → 场景 → Studio** — a new tab on the same origin, so the live session keeps running for HMR. The workspace is a navigator over `*.scene.json` (plus 新建场景), a Content browser that adds declared backgrounds/characters as entries, a real-renderer canvas without playing there, a placement inspector (structured appearance + entry removal), a cue table with motion bindings and create-or-clone, and the embedded Motion Workbench. Actors with declared geometry are draggable right on the canvas (snapping to canvas edges/centers, corner handle for scale), and in the Workbench clicking a timeline dot selects that keyframe so the ghost can be dragged to write its offsets — numeric inputs stay as the precision entry for both. Saves go through the CAS scene port and HMR updates the running game; the Scene document stays the single authoring authority. Stories whose interaction-document compiler emits the flow projection can also hand it to the binding's `flow` field: the read-only **Narrative 流程** workspace then renders each document as a labeled graph (choices, branch conditions, roll outcomes, cross-document `@label` calls) — click a node for its source reference, click a cross-document stub to jump there. It edits nothing and stores no layout.

Game scenes get that launcher from `DefaultGameRoot` behind `debug_tools` (`StoryDebugDockV1`, chip label 调试). The launcher groups **状态** (export / import, engine **状态查看** / **状态编辑**, reload-current, reinitialize, and wipe), **场景** (freeze, Studio when the Vite plugin advertises the page, and other `read_only` scene tools), and Story-specific **作弊** (`cheat` tools, locked until cheats are on). Contribute panels through `loadDevDockContributions`; the launcher lists the live registry and inlines session maintenance. A Story that wants the chip before `debug_tools` (or live stats in `info`) sets `devDockChip: false` and mounts the same `StoryDebugDockV1`: pass `visible` (Story-owned; do not make always-on the engine default), `clearAllSaves` from `application.ui()` (Core wipe, not a `savePort.clear` loop), freeze via `presentationFreeze`, and an optional `info` slot. Expanding the chip grants `debug_tools`+`cheats` so lazy contributions can load; omit `tools` unless the Story must label panels before the registry exists. The dock never reads Snapshot/Story state. Wipe confirmation is a modal `alertdialog`; the backdrop accessible name must stay distinct from the dialog Cancel button. Desktop/MDI shells that are not a letterboxed game scene set `devDockChip: false` and omit a Story dock. Multi-instance takeover chrome is `InstanceLeaseBannerV1` (`@sillymaker/ui`), driven by the `instanceLease` port; portal it into the scaled viewport canvas so it tracks the picture rather than the letterbox. External `file:` engine consumers already get Vite `resolve.dedupe` for `react`/`react-dom` from `createSillymakerAppViteConfigV1`; Vitest configs that render those engine components need the same dedupe, or hooks break on two physical React copies.

Collaboration contract (agents): never overwrite a `human_tuned` or `locked` motion unless the task explicitly names it — locked changes go through a new variant file with a new id; preserve motion/transition ids across scene refactors; put new tunable animation in a new motion file instead of inline duration/easing constants in scene code (component-local hover effects stay CSS).

## Execution advice for LLM agents

- Do one tier's work at a time: an A-tier task must not casually touch B/C-tier files.
- Before editing a script, table the full node sequence (with the occurrence number of every interaction boundary), then write the scenario script and tests correctly in one pass instead of iterating on numbers.
- Run the tier-A verification loop after every edit and let diagnostics drive the next step, rather than batching edits and guessing at failures.
- For generic instantiations (`WebGameApplicationV1` has 15 type parameters), always copy an existing application declaration and modify it wholesale; never write one from scratch.
- For engine-behavior questions read the matching section of `docs/engine/features.md` first; do not guess from engine source.

## UI style quick-reference

- Skin and layout use only the published tokens: colors/spacing/radii/sizes are `--silly-color-*`, `--silly-space-*`, `--silly-radius-*`, `--silly-control-min-size` (control chrome), `--silly-target-min-size` (touch-target floor) — defined in `theme/tokens.css` of `@sillymaker/ui`. The default palette is professional-neutral dark with no brand hue; Stories theme by overriding the tokens under their application scope.
- **No raw z-index**: the eight stage layers use `--silly-stage-z-*` (matching `stageLayerIdsV1`), within-layer surfaces use the `--silly-surface-z-*` scale (base < raised < front-door < splash < dialog-backdrop < dialog < confirm-backdrop < confirm); the contract is test-guarded.
- Narrative appearance belongs in the Story renderer supplied to `defineNarrativeSurfaceV1`; player timing, History lifecycle, focus/inert authority, physical input, and Stage reconciliation belong to the composition-owned Host.
- WholeCanvas appearance belongs in the Story renderer supplied to `defineWholeCanvasSurfaceV1`; primary/detail lifecycle, readiness, focus/inert authority, routed input, and Splash/Title front-door ownership belong to the composition-owned Host.
- Characters and props declare `geometry` (box + permille anchor, usually 500/1000 bottom center) on their content-catalog resolution; the engine stage host owns the anchor transform. Do not hand-roll `translate(-50%, -100%)` in stage renderers — fill the engine content box (`width/height: 100%`) instead. Hit-region coordinates stay anchor-relative.
- Do not hand-roll chrome for gameplay windows (shop/inventory/album/history): declare each exact-ID transient target with `defineWorkspaceOverlayV1`, add it to `overlayDefinitions`, and resolve its accessible name/content through `slots.overlayResolver`; required ports/services use concrete `overlayPorts` bindings. Ordinary primary opens use `context.intents.execute({ kind: "overlay.open", overlayId })`; structural replacement/detail/back/close may use the narrow `context.overlays` facade (`openPrimary`, `pushDetail`, `closeTop`, `closeAll`). That facade is Coordinator-backed and its snapshot is read-only — never mirror it into another writable store. An optional resolver `prepare()` may prepare presentation/resources only; it must not send semantic commands or advance gameplay. The Host supplies `PanelV1` chrome automatically; standalone panels use `PanelV1` directly (title bar + close + focusable scroll body). Backdrop click and right-click close the topmost window by default; a definition declaring `dismissible: false` is locked (only explicit close works). Right-click on controls has no default behavior (controls may declare `data-secondary-action`); the scene background's right-click action comes from the Story pointer map (default `cancel`, remappable to e.g. player rollback). Asset URLs via `useAssetUrlV1`/`resolveAssetUrlV1`, motion gating via `useReducedMotionV1`. Letterboxed CSS-pixel floaters reuse `PanelV1` (`closeControl: "icon"`) and `useClampedElementDragV1`; do not open debug tools through OverlayHost. Scaled MDI drag stays Story-side — see `docs/engine/design/window-model.md`.
