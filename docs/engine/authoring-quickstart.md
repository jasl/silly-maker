# Story authoring quickstart

Status: operating guide for the current implementation. For human authors and LLM agents; layered by task difficulty — weaker models should start at tier A. Conceptual background in [story-authoring](story-authoring.md); full capabilities in [features](features.md).

## 0. One iron rule

Story code imports only `@sillymaker/*` package exports (`@sillymaker/base`, `@sillymaker/base/story`, `@sillymaker/base/runtime`, `@sillymaker/ui`, `@sillymaker/web`, `@sillymaker/tooling/project`). Never import engine `src/**` paths, never import another Story. The `public-import-boundary` test rejects violations.

Prefer importing from `@sillymaker/base/story`: it exports the current author-facing contract under version-suffix-free names (`SemanticStageState`, `StageMutation`, `PendingInteraction`, `NarrativeGraph`, `reduceStageMutations`, `evaluateInteractionResolution`…), fully equivalent to the suffixed originals.

## Scene source first: choose the authority, then the tool

Choose one source authority for every scene before editing it. New hierarchical work should normally use `authoring_scene` and a `*.authoring-scene.json` source; the Template opening is the maintained release example. The current Studio UI has not yet been replaced by M5's Inspector and therefore edits only `low_level_scene` / `*.scene.json`. Do not create both files and try to keep them synchronized.

- Declare the choice in `sillymaker.config.ts`. An Authoring Scene row supplies `{ sceneId, specifier, sourceKind: "authoring_scene", source }`; a low-level row supplies `{ sceneId, specifier, sourceKind: "low_level_scene" }` and no `source`. The exact package specifier is what Story code imports. In `package.json#imports`, map an Authoring Scene specifier to the small source-reading fallback used by non-Vite Deno tooling (copy the Template pattern), and map a low-level specifier to its ordinary JSON/module (see Cat Cafe). Vite compiles only an explicitly selected Authoring Scene source into a runtime-plan virtual module and replaces that fallback in release output.
- An Authoring Scene is `format: "sillymaker.authoring-scene"`, version `1`: ordered layers contain ordered root/child object trees. `objectId` is stable and becomes the runtime Stage tag; groups can transform children without drawing; each visual object references existing content/appearance and may name cues or closed hit-region/Motion/Timeline/GUI/intent bindings. Omitted local transforms, children, and binding members normalize to identity/empty. Layer order plus per-layer DFS preorder is paint order. The compiler emits only the existing Scene runtime plan to Player code; hierarchy, JSON-pointer source locations, off-canvas/transparent inspection, and resolved facets remain authoring-only.
- Until M5, edit `*.authoring-scene.json` directly and run the focused checks below. The current Studio Scene CAS/list port will not open or write it. This is deliberate transitional honesty, not a missing automatic migration. The runtime still uses `sceneFromAuthoringRuntimePlan`, `cueMutations`, `cueMayShow`, `sceneStageTransitionBindings`, and `sceneAmbientCatalog` like the low-level path.
- For `low_level_scene`, start the game (`deno task author <application-id>` or `deno task dev`). The Vite dev page exposes **打开内嵌创作**; **调试 → 工具 → Studio** opens the same Authoring Host in a same-origin standalone tab. Both shells share the Host implementation and dirty/undo/save/conflict rules, but each shell mount owns its own memory. Use the rail to switch Scene, Motion, Regions, Chrome, and Flow; visited inactive workspaces retain local state while only one is visible.
- A low-level scene lives in one `src/scenes/<scene>/<scene>.scene.json`: entries hold layer/tag/content/zOrder/placement/appearance; cues declare show/hide plus optional motion or `cut: true`; entries may bind presence-based ambient loops. This document remains the single authority for that scene. The script references cues and never repeats placement literals.
- In either Studio shell, drag geometry-declared low-level entries, edit exact numbers, rebind cue motions, then use **Motion 工坊** for keyframes. Saving writes through the dev-only CAS port. A digest conflict refreshes the saved baseline while retaining the dirty draft and undo history for explicit retry.
- Closing the embedded shell with dirty Scene/Regions/Motion/Chrome work asks **保存并关闭 / 放弃并关闭 / 取消**. Merely closing and reopening keeps the Host mounted when no discard was chosen. Focused text/numeric editing owns keyboard input and does not trigger gameplay shortcuts.
- Existing Studio scene construction is also low-level-only: 新建场景 writes `*.scene.json`; the Content browser adds entries, the inspector edits/removes them, and the cue table creates or clones Motion documents. These workflows do not emit an Authoring Scene hierarchy. In Flow, summaries and choices may still resolve shared `text.*` ids through the binding's optional `resolveText` port.
- Chrome geometry (HUD strips, docked boards, tab hot zones) lives in `*.chrome-layout.json` and edits in Studio's 界面布局 workspace: drag boxes/anchors on the logical canvas, tune numbers in the inspector, save through CAS — the running game reads the same document, so `git diff` shows only the JSON. A Story that declares a `chrome` fixture on its Studio binding previews the real component; without one the wireframe is still fully editable.
- Authoring documents register nowhere: the Project Authoring Index scans both `*.authoring-scene.json` and `*.scene.json` plus Motion, Regions, and Chrome sources, admits them once into metadata/named skips, and records each scene's source kind. One lazy owner per Vite dev server shares the cached snapshot and refreshes one changed path. The old Scene list/CAS view filters to `low_level_scene`; direct Authoring Scene source admission/compiler is a separate path. `story check` is a one-shot consumer, not the dev server's in-memory owner.
- What still needs code, one tier down: new dialogue/text (Tier A textIds), brand-new stage content declarations (content catalog + renderer + geometry + a `contents` manifest row), wiring a constructed scene into the script (stage nodes referencing its cues), mid-scene appearance beats (script-owned `setAppearance`; V1 cues cover show/hide composition), and gameplay (Tier B/C).

After editing an Authoring Scene or its explicit binding, run from that application:

```sh
deno task story check .
deno task build:web
```

The build is the authoritative check that the configured source ID matches and
that the exact package specifier compiles to the runtime-only module.

## Tier A: script, text, and choices (weak models start here)

Use the starter template (`template`, minimally playable) or the Engine Lab (`e2e`, full capability) as the runnable example. Scripts are ordinary TypeScript data, not a DSL:

| What to change                                 | Which file                                                                                                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Starter dialogue, narration, option text       | `assets/content/*.text-pack.json`; keep the same stable textId in `src/story/narrative.ts`; no byte/hash/count receipt update is required                      |
| Starter resident UI/bootstrap copy             | `templateTextCatalogsV1` in `src/content/presentation.ts`                                                                                                      |
| Engine Lab dialogue, narration, option text    | `labTextCatalogsV1` in `src/presentation.ts` (textId → text)                                                                                                   |
| Story nodes, branches, stage commands          | starter: `src/story/narrative.ts`; Engine Lab: `src/gameplay/narrative.ts`                                                                                     |
| Scene composition (hierarchy, placement, cues) | preferred: `src/scenes/<scene>/<scene>.authoring-scene.json` + explicit `authoring_scene` binding; Advanced/current Studio: `*.scene.json` + `low_level_scene` |
| Voice/BGM mapping                              | `src/gameplay/audio.ts`                                                                                                                                        |
| Static annotations for the graph lint          | `mayShow` on stage nodes, `successors` on branch nodes                                                                                                         |

Node kinds: `say` (speakerTextId/textId/next), `choice` (options: choiceId/textId/requiresSamples/consumesSamples/next), `stage` (`mutations(stage)` returns a StageMutation array; `mayShow` statically declares the contentIds it might show), `branch` (`choose(context)` is a pure function picking next, which must land inside `successors`), `hold` (durationMs/skippable, optional ordered `when` reroute arms — branch-vocabulary predicate → target, evaluated as cuts on the hold's own occurrence timeline — plus optional tick machinery, `tickQuantumMs`, and a `pace` hint; the screen holds for an authoritative duration settled through the session time verb, a matching arm cuts at its instant, skip folds the remainder through the same walk, and expiry advances to `next`), `barrier`, `custom`, `end`. Every new say/choice needs a brand-new `definitionId` (`interaction.<story>.<name>`); never reuse one.

Verification loop after every edit (fast enough to run per change):

```sh
deno task typecheck                                # types and contracts
deno run -A npm:vitest run e2e/src/test/narrative-graph.test.ts   # graph lint clean + honest annotations
deno task story simulate e2e --scenario calibration   # play the full narrative without a browser, JSON output
deno task check:assets                              # bounded pack wire/schema/identity/catalog + ordinary assets
deno task test:conformance:headless                # all headless conformance tests
```

For a starter pack edit, keep the wire's four exact top-level fields. The manifest
descriptor contains only `packId` and `runtimePath`; there is no byte-length,
SHA or declared-entry receipt to regenerate. `check:assets` performs the same
bounded Strict JSON/schema/value admission as runtime, validates the logical pack
identity/catalog topology, and derives the actual entry count. One pack is capped
at 16 MiB by `textContentPackJsonLimitsV1`; split larger content into multiple
packs at real loading boundaries. A running content
session keeps an admitted pack immutable, so refresh/restart after a direct edit.
Keep early and later copy in
separate build-known packs only when the application can declare which pack a
startup, semantic invocation, or candidate Snapshot needs through
`initialPackIds`, `requiredPackIdsForInvocation`, and
`requiredPackIdsForSnapshot`. Web binds those planners into the existing Core
semantic/Persistence readiness boundary; do not add an `ensure` call to a
React/UI callback or create another content facade. Do not
import the JSON pack into runtime Story/UI code: the Host reads it through `assets/**`, while the
tooling-only Flow projection may import the same authoring copy under
`src/tooling/**`.

Edits move occurrence numbers (each interaction boundary is numbered in order): the `calibration` scenario script for `simulate` and several tests step by number, so after inserting a boundary sync them — failure messages state the expected/actual numbers directly. Stories copied from the starter template avoid both taxes: its interaction-document kit (`template/src/story/narrative-kit.ts`) compiles pure-data blocks into a control plan with stable text references, while its scenarios/tests resolve the current pending interaction; adding a line means one control block plus one pack entry with the same textId. The Engine Lab deliberately stays the numbered low-level rig.

## Tier B: a new gameplay module (medium; the F2-canary-verified path)

**Code organization**: story packages use the by-authoring-object layout (Authoring Architecture S3: `game/` authoritative rules, `content/` presentation declarations, `scenes/`, `story/` narrative, `ui/`, `application/` advanced integration). template and cat-cafe use the feature-slice layout inside it — one gameplay feature per `src/game/features/<name>/` directory (module/content/rules/handlers/UI in their places), shared contracts in `src/game/kernel.ts`, and `src/game/simulation.ts` + `src/game/content.ts` doing aggregation and re-export only (outsiders face just these two facades; the command kind→handler map is an exhaustive mapped type, so a missed wire fails to compile). The Engine Lab (e2e/) intentionally stays a single-file low-level rig. Prefer "new directory + one line per aggregation point" for new features.

A new module = four wiring points, all inside the Story package:

1. `src/game/state.ts` (Engine Lab: `src/gameplay/state.ts`): state interface + zod schema + initial value, mounted into the aggregate state.
2. `src/game/simulation.ts` or `src/game/features/<name>/module.ts` (Engine Lab: `src/gameplay/simulation.ts`): `kit.defineStatefulModule` (the module's `reducers` map folds its own slice per domain-event kind); commands into the Story command/domain-event/rejection unions; open a transaction in the executor (decide against the command-start snapshot, `reject(...)` before emitting, then `transaction.emit(event)` — every subscribed module folds the same event atomically within the same command).
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

One application = one `WebGameApplicationV1` declaration + one `startWebGameApplicationV1` call. Start from `template` (copy the directory + global rename; the copy is a complete project — `sillymaker.config.ts`, `vite.config.ts`, `tools/story.mts` — and inside this repository you additionally add its directory to the root `project.config.ts` list); the full reference is `e2e/src/application/`. Application-directory conventions: `composition.tsx` (projector/slots/the `*GameApplicationV1` declaration), `ui.tsx` or `shell-ui.tsx` (runtime exports are PascalCase React components only, in a separate file from the application declaration and non-component registries for Vite Fast Refresh), `core-application.ts` (headless instance factory), `entry.tsx` (boots from composition). Builds are application tasks; the story CLI carries diagnostics (app-locally via `deno task story <verb> .`, or at the repository root once the directory is listed in `project.config.ts`):

For a Narrative application, `composition.tsx` creates exactly one
`NarrativeSurfaceDefinitionV1` with `defineNarrativeSurfaceV1`. Pass one ordinary
five-key input (`selectNarrative`, `dispatchResolution`, `renderer`,
`resolveText`, `replayCurrentVoice`) and use
`satisfies DefineNarrativeSurfaceInputV1<YourSemanticPublication>` to preserve
contextual typing and reject extra keys. Put the React renderer in `ui.tsx` and
return the definition as `ui.narrative`. The renderer uses only its immutable
public props and bounded callbacks; never add `slots.narrative`, import the
removed playback/conformance components, or mount another Host/Stage writer.
Applications without Narrative simply omit `ui.narrative`, as SillyOS does.

For a Story-defined WholeCanvas application surface, create exactly one
definition with `defineWholeCanvasSurfaceV1`. Pass its ordinary seven-key input (`catalog`, `source`,
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
public link. Offline packaging, signing, and integrity checks use the selected
target platform's tools and do not replace that review.

## Diagnostics quick-reference (all from real pitfalls)

| Symptom                                                                                                              | Cause and fix                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `story.contract_invalid: State-contract module IDs must be strictly increasing`                                      | manifest module entries not in lexicographic id order; reorder                                                                                                                                                                                                                  |
| `story.simulation_invalid: State-contract manifest does not match GameSimulation stateful modules`                   | manifest and `composeModules` disagree on modules/revisions; sync per the table above                                                                                                                                                                                           |
| `authoring.module.overlapping_state_slot`                                                                            | two composed stateful modules claim the same State slot or a parent/child pair; move each owner to a disjoint slot and use declared capabilities for cross-module reads                                                                                                         |
| `story.nondeterministic: Story definitions differ`                                                                   | `define()` returned a fresh object each call; hoist the definition to a module constant                                                                                                                                                                                         |
| `ui.narrative_surface_definition_invalid`                                                                            | the definition input is not the admitted six-field public shape or one of its required callables is invalid; copy the template construction                                                                                                                                     |
| `ui.whole_canvas_surface_definition_invalid`                                                                         | the WholeCanvas definition/catalog does not satisfy its admitted public shape; copy Cat Cafe or the query-gated Engine Lab construction                                                                                                                                         |
| `interaction.occurrence_mismatch`                                                                                    | resolving with a stale occurrenceId; take `narrative.pending.occurrenceId` from the latest publication                                                                                                                                                                          |
| `CanonicalJsonError: number.not_integer`                                                                             | a float reached saveable state; use integer logical units (e.g. `scalePermille`)                                                                                                                                                                                                |
| `e2e.ui_text_missing:<textId>`                                                                                       | the script references an unregistered textId; add the catalog entry                                                                                                                                                                                                             |
| `narrative.successor_missing` / `narrative.pure_loop` (graph lint)                                                   | a node's `next` targets a missing node / pure nodes form a loop with no interaction boundary; the diagnostic points back to the definition                                                                                                                                      |
| `motion.document_invalid` / `motion.document_json_invalid` (`story check`)                                           | a `src/**/*.motion.json` fails strict Motion admission or is not JSON; fix the file the diagnostic points at                                                                                                                                                                    |
| `motion.id_duplicate` / `motion.id_filename_mismatch` (`story check`)                                                | two motion files claim one id / the filename stem is not the id's final segment; rename so click-to-locate and the write port stay stable                                                                                                                                       |
| `scene.document_invalid` / `scene.document_json_invalid` (`story check`)                                             | a `src/**/*.scene.json` fails strict Scene admission or is not JSON; fix the file the diagnostic points at                                                                                                                                                                      |
| `scene.id_duplicate` / `scene.id_filename_mismatch` / `scene.cue_motion_missing` (`story check`)                     | two scene files claim one id / the filename stem drifts from the id / a cue references a motion no `*.motion.json` declares                                                                                                                                                     |
| `authoring_scene_json_invalid` / `authoring_scene_*` (index/build)                                                   | a `*.authoring-scene.json` is invalid JSON or violates the closed hierarchy/reference schema; follow the reported JSON pointer, then rebuild the exact configured scene specifier                                                                                               |
| `authoring_scene_source.scene_id_mismatch` (Vite build)                                                              | the configured `sceneSources[].sceneId` differs from the admitted Authoring Scene document; make the explicit binding and source agree rather than adding a second scene file                                                                                                   |
| `scene.ambient_motion_missing` (`story check`)                                                                       | an entry's `ambient` loop references a motion no `*.motion.json` in this source tree declares — the loop would silently never play                                                                                                                                              |
| `regions.document_json_invalid` / `document_invalid` / `id_duplicate` / `id_filename_mismatch` (`story check`)       | a `src/**/*.regions.json` is not valid JSON, fails strict admission, two files claim one regionsId, or the filename stem is not the id's final segment; fix the file the diagnostic points at                                                                                   |
| `stage.hit_region_polygon_invalid` / `stage.hit_region_hover_invalid` (projection diagnostics)                       | a region's `polygonPoints` break the shape rules (3–64 integer vertices inside the box, non-zero area) or its `hoverAssetId` is invalid; the region degrades to its rectangle / drops the hover — repair the regions document (Studio's Regions workspace shows the real shape) |
| `regions.trace_image_invalid` / `regions.trace_budget_unreachable` (`story regions trace`)                           | the input is not a supported PNG (needs RGBA, gray+alpha, or palette+tRNS; no interlacing — `details.reason` names the problem; re-export the image) / the silhouette cannot simplify into `--max-vertices`; raise the budget                                                   |
| `chrome_layout.document_json_invalid` / `document_invalid` / `id_duplicate` / `id_filename_mismatch` (`story check`) | a `src/**/*.chrome-layout.json` is not valid JSON, fails strict admission, two files claim one layoutId, or the filename stem is not the id's final segment; fix the file the diagnostic points at                                                                              |
| `motion_frame_easing_forbidden` (Motion admission)                                                                   | a `frame` track keyframe declares `easing`; frame tracks sample stepwise (each value holds until the next keyframe) — delete the easing key                                                                                                                                     |
| the stage ignores a motion's `frame` track                                                                           | the entry's content declares no `frameAssetIds` (or the index exceeds the table and clamps); declare the ordered frame table in the content catalog's `resolveContent` and make the renderer consume `frameIndex`                                                               |
| `scene_cue_cut_invalid` / `scene_cue_cut_motion_conflict` (Scene admission)                                          | a cue's `cut` is not the literal `true`, or a cue declares both `cut` and `motionId`; a cue's edge presentation is one motion xor one explicit instant cut                                                                                                                      |
| `scene.cue_binding_scope_collision` (`story check`)                                                                  | a declared presentation (motion or explicit cut) shares a stage edge with a **bare** cue; without dispatch context the fallback matches the edge, not the cue — declare the bare cue explicitly (`cut: true` or the same motion) instead of forking the stage identity          |
| `scene.cue_binding_context_missing` (runtime, dev diagnostics)                                                       | a stage edge with divergent per-cue bindings resolved without presentation edge context and fell through to the outer catalog; check that the application projects stage cue dispatches and passes the batch to the stage's `dispatches` prop                                   |
| Test assertions mismatch occurrence numbers                                                                          | a new boundary shifted the numbering; renumber per the failure message                                                                                                                                                                                                          |

Browser-test settle signals (instead of sleeping or counting DOM nodes): the stage root publishes `data-stage-settled` — it reads `"false"` while any transition is in flight (a crossfade keeps old and new entries mounted until then), so wait on `[data-semantic-stage][data-stage-settled="true"]`. For typewriter text, the dialogue renderer receives `playerView.revealComplete`; publish it as a Story-owned `data-dialogue-*` attribute (template: `data-dialogue-reveal="complete"`) and wait on that selector before advancing.

## Motion assets and the Workbench loop

Narrative entrance/exit animation is data, not code: a `sillymaker.motion` JSON document in `src/motions/` (integer keyframes over offsetX/offsetY/scalePermille/opacityPermille with per-segment easing, plus the stepped easing-free `frame` track for discrete frame swaps), bound to a stage edge with `motionStageTransition({ transitionId, motion })` in the transition catalog. Layout stays authoritative — the motion composes over the settled placement and clears to identity when its run finishes. A `frame` track needs the content side too: the catalog's `resolveContent` declares the ordered `frameAssetIds` table and the renderer maps the delivered `frameIndex` onto it (null = no override; author frame 0 as the default pose and end a one-shot run on the settled appearance).

The human tuning loop starts from source-backed Scene cues in the standalone or embedded Authoring Host: open the Scene, choose its Motion case, scrub/play, edit duration/delay/keyframes, A/B against saved, then save. The DevDock provenance panel remains a read-only way to locate the transition, motion, and source file from the running picture; it does not own a second writable Workbench under the Game root. Saving is compare-and-swap against the file digest, rewrites only that motion file deterministically, and marks it `authoring.status: "human_tuned"`. Diagnostic panels still declare their stage behavior through `DevDockPanelV1.stage`: click-to-inspect stays `live`, while a panel that must inspect a transient frame sets `stage: "frozen"`. The launcher's 冻结画面 / 恢复画面 toggle is the manual lever — opening tools does not freeze the world.

Low-level Scene stories get the current dev-only Authoring Host in embedded and standalone form. Its Scene workspace navigates `*.scene.json`, constructs entries and cues, renders a detached real-renderer canvas, and saves through the low-level Scene CAS port; the separate **Motion 工坊** edits selected motion cases. Rail focus still does not carry a typed scene/cue/motion/region/chrome/flow target into another workspace. Authoring Scene sources are discovered by the shared index but are not opened by this workspace; M5 will replace the old Studio UI with the Inspector-first surface rather than maintaining both. Ordinary production builds exclude the Host, Studio binding, source-write endpoints, and real dev-source client. For an `authoring_scene` release build, Vite additionally excludes its source JSON, admission/compiler, inspection facets, and the non-Vite fallback, retaining only the virtual runtime plan.

Stories whose interaction-document compiler emits the flow projection can hand it to the binding's `flow` field. Select **Narrative 流程** on the closed workspace rail; the read-only Flow implementation and its lifecycle backend load only on that first visible selection. Once ready it renders each document as a labeled graph (choices, branch conditions, roll outcomes, cross-document `@label` calls) — click a node for its source reference, click a cross-document stub to jump there. Load failure leaves Scene, Motion, Regions, Chrome, and their Host-owned draft/session state usable; only the visible Flow panel offers an explicit retry. Flow edits nothing, stores no layout, and a ready implementation is reused across compatible Studio binding HMR successors.

Clickable zones follow the same loop with the **Regions** workspace: pick a `*.regions.json` (or 新建), pick a compiled-scene entry as the live backdrop, and edit against the host's real rendering — the actual clip-path shapes and hover reveals are the preview. Drag the box, scale from the corner, move/insert/delete polygon vertices, convert rectangle⇄polygon; saves go through the regions CAS port with the same dirty-navigation and undo discipline, and a save graduates `authoring.status` to `human_tuned`. To start from legacy bitmap judgment art, `deno task story regions trace <image.png> --out src/regions/<name>.regions.json` converts the alpha silhouette into an editable polygon document (status `generated`; the vertex budget defaults to 32 — tune in Studio afterwards). Binding stays in Story code: import the JSON, `parseRegionsDocumentV1`, hand `regions` to `resolveContent`, and dispatch semantic invocations from `onHitRegionActivate`.

Game scenes opt into the first-party launcher by assigning
`outerUi: createReferencePlayerOuterUiV1(...)` in `application.ui()`. That explicit
outer composition supplies the preset settings sections and `ReferenceDevDockV1`;
its `loadContributions` option keeps Story panels lazy behind `debug_tools`, while
`position`, `chip`, `info`, and labels remain product choices. The launcher groups
**状态**, **场景**, **倍速**, **工具**, and Story **作弊** panels as before. Keep
writable Motion work in the standalone/embedded Authoring Host; DevDock provenance
may locate source but must not create a second editor session under the Game root.
Minimal/custom products omit this adapter and use the generic System host plus the
neutral `auxiliarySurface` slot; they do not disable a hidden core DevDock.
`clearAllSaves` must remain the Core wipe operation, and the dock never reads
Snapshot/Story state. Multi-instance takeover chrome remains
`InstanceLeaseBannerV1` (`@sillymaker/ui`), driven by `instanceLease`. External
`file:` engine consumers already get Vite `resolve.dedupe` for `react`/`react-dom`
from `createSillymakerAppViteConfigV1`; Vitest configs that render those engine
components need the same dedupe, or hooks break on two physical React copies.

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
