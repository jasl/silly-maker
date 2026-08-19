# Story authoring with SillyMaker

操作层面的分层指南（含 LLM 代理执行建议与诊断速查）见 [authoring-quickstart](authoring-quickstart.md)。`@sillymaker/base/story` 是作者 prelude：当前代契约的无版本后缀别名。

状态：当前 Story 组合模型。Engine Lab（`e2e`）是唯一维护的参考实例。

## 1. What a Story owns

A Story owns the game-specific parts of a playable application:

- stable identity and state-contract description;
- validated gameplay data and named deterministic rule providers;
- the State shape and GameplayModules that own it;
- commands, rejections, facts, debug commands, queries, and ViewModels;
- text, assets, scene graph, interactions, semantic actions, and renderer contributions;
- Story-specific application composition and optional tooling.

Generic session, persistence, diagnostics, UI primitives, and browser adapters stay in SillyMaker packages. The Story consumes those packages through workspace public exports.

## 2. Recommended composition sequence

### Define identity and data

Give the Story a stable ID/revision and validate content or balance data at the boundary. Stable IDs, not React components or object identity, connect State to Story content.

Treat a revision as a compatibility statement. Change it when the corresponding Story/state contract requires migration; do not increment every identity field simply because application code was rebuilt.

### Define GameplayModules

Each stateful module declares its owned State slot(s), schema, initial State, public read ports, owner-scoped proposals/apply behavior, and local invariants. Dependencies should name capabilities another module intentionally exposes.

Schemas can be hand-written parse functions or, preferably, built through `@sillymaker/base/authoring`: `createRuntimeSchemaV1` wraps a parse function and `fromStandardSchemaV1` adapts a Zod (or any Standard Schema V1) schema. Both enforce canonical-JSON output, deep-freeze the result, and report failures as stable `DiagnosticEnvelopeV1` values with JSON pointers instead of bare exceptions. `collectGamePackageDiagnosticsV1` aggregates definition/resolution failures for a whole package the same way.

A hand-written permissive schema is still supported, but it cannot bypass the
engine's command boundary. `GameSession.dispatch` keeps a thrown Story schema
failure as `not_executed/validation_failed`; after the schema successfully
returns, the engine validates it and constructs a new ordinary Strict Canonical
Data projection before queueing. Only that engine-owned projection is frozen and
delivered to execution/log/replay. Command admission itself neither retains nor
freezes the schema return identity: a mutable hand-written schema result remains
mutable, while `createRuntimeSchemaV1` / `fromStandardSchemaV1` output is already
frozen by the schema contract described above. Shared aliases expand per canonical path, so do not
use object identity as command semantics. A Strict Canonical Data violation instead rejects with
`CanonicalJsonError` (`code` plus JSON-Pointer `path`) from `@sillymaker/base` and
does not enter the Story fault normalizer. Direct low-level Simulation and
CommandLog calls apply the same gate synchronously. Use integer, plain,
cycle-free command data. Do not attach symbol-keyed members or extra own
properties to arrays, and do not replace an array's prototype: those members
are not represented by canonical command bytes or replay. Command admission
rejects unrepresented members as
`value.unrepresented_property` and a custom array prototype as
`value.custom_prototype` without changing the public canonical encoder. Use data
properties rather than accessors; admission rejects an accessor as
`value.getter` without invoking it when traversal reaches that member. Do not
rely on a later Snapshot or Save encode to catch an invalid command.

Likewise, finalization does not retain or itself freeze the upstream identities
produced by Story fact/rejection/Debug-error normalizers; a schema helper may
already have frozen its output. Evidence arrays use one captured own `length`
data descriptor, so Proxy virtual length cannot alter their item vector.
Finalization projects and freezes the Snapshot-free canonical data;
the returned attempt and CommandLog share that admitted projection. Snapshot
objects themselves remain the authoritative identity and are not cloned by this
evidence boundary.

For module wiring, `createGameAuthoringKitV1` captures the Game type family once and provides `defineCapability` (typed tokens), `defineStatefulModule`/`defineStatelessModule` helpers (omit absent command/query surfaces; proposal schemas derive from operation schemas), `provides` factories that build narrow read-only ports from the owner's own State slice, `requires` declarations that surface as typed dependency ports in `owner.propose`, and `initializesAfter` for startup order. `composeModules` validates both the capability DAG and the lifecycle DAG with stable diagnostic codes and emits ordinary low-level bindings for `defineGameSimulation`, so kit and hand-written modules never form two authorities.

The aggregate State should align with the modules the Story actually composes. Avoid a universal object containing optional fields for every possible module. Stateless gameplay services can remain named pure capabilities rather than fake State.

### Compose the simulation

Use `defineGameSimulation` to bind:

- the exact module tuple;
- aggregate State, command, fact, rejection, and debug schemas;
- bootstrap and initial-State creation;
- gameplay and debug command executors;
- `createQueries(State)`;
- immutable ViewModel projection.

Cross-module commands remain Story-owned orchestration. They gather validated owner proposals and commit a complete candidate or reject without changing the current Snapshot. Deterministic rule code uses the supplied serializable RNG capabilities rather than ambient time or `Math.random()`.

The kit composition's `createTransactionRunner` owns the mechanics of that orchestration: the Story handler reads capabilities against the command-start Snapshot, stages at most one proposal per owner, and returns `complete()` or `reject(...)`; proposal callbacks therefore run in the Story's explicit call order. After `complete()`, the engine sorts staged owner IDs by locale-independent UTF-16 code units, applies each proposal against its command-start owner slice, accumulates State replacements and facts in that exact order, validates the aggregate candidate, and produces the commit/reject/fault attempt envelope with full RNG and sequence rollback. The same order reaches the candidate Snapshot, CommandLog evidence, and authoritative replay; Host locale never chooses gameplay order. The transaction surface exists only inside command executors; UI and automation never receive it.

### Design queries and semantic actions

Queries are the read boundary for gameplay meaning. Return narrow, player-safe DTOs rather than raw State or content registries. Compute availability, explanations, forecasts, and execution from shared evaluators when they must agree.

Semantic actions adapt concrete UI/automation intent into typed Story commands:

```text
Semantic invocation -> preview -> confirmation/form/choice
                    -> Session dispatch -> projected result
```

Parameterized actions should expose bounded input catalogs and validation metadata without handing UI a generic State client. The command executor re-evaluates at the Session queue front before committing.

### Define presentation

The presentation facet contains validated Story-owned data:

- localized text catalogs;
- promoted asset packs and stable asset IDs;
- SceneGraph and renderer IDs;
- character rigs/appearances;
- interaction targets, hit maps, and presentation values.

Story React contributions resolve stable renderer IDs inside the application closure. They receive immutable semantic/presentation projections and send semantic or presentation intents. Scene data that participates in resolution should stay plain and serializable.

Narrative entrance/exit animation is authored as Motion assets: `sillymaker.motion` JSON documents (strictly admitted integer keyframes with per-segment easing), bound to stage edges through `motionStageTransition` in the transition catalog — or, for a scene-managed scene, through its Scene document's cue bindings. Motions compose over the settled placement (layout stays authoritative) and never enter authoritative State, Saves, digests, or replay. They are the human tuning surface — the DevDock provenance panel locates them from the running picture and the Motion Workbench edits and saves them (a save marks `authoring.status: "human_tuned"`; agents must not overwrite human-tuned or locked assets — see the collaboration contract in `authoring-quickstart.md`). `story check` lints every motion file: admission, unique ids, and filename↔id agreement.

Visual scene composition may be authored as a first-class Scene document: a `sillymaker.scene` JSON file (`src/scenes/<scene>/<scene>.scene.json`, strictly admitted) declaring the scene's entries (stable `<layerId, tag>` identity, contentId, zOrder, placement, appearance) and named cues (`show`/`hide` per entry, optionally binding a motion to exactly that cue's stage edge). `sceneFromDocument` compiles it into typed accessors: stage nodes call `cueMutations(cueId, stage)` (idempotent — show ensures the declared content and keeps placement/appearance continuity on a content replace; hide only removes what is present) or `openMutations(stage)` (open/reopen the whole scene: strangers on declared layers hide, declared entries settle back to their declared content/placement/appearance; idempotent, and layers the document does not declare stay untouched) and annotate `mayShow` from `cueMayShow(cueId)`; the transition catalog composes `sceneStageTransitionBindings(scene, { motions, edges? })`, which resolves exact edges (kind + layer + entry key + content) instead of Story-global inference; the optional per-cue `edges` overrides own edge behavior (input policy, acknowledgment, …) so barrier-acknowledged entrances stay expressible. For a scene-managed scene the document is the single authoring authority for placements and cue→motion binding — scripts must not repeat placement literals. Compiled mutations are byte-identical to hand-written ones, so Snapshot/Save/digest/replay are unaffected. `story check` lints every scene file: admission, unique ids, filename↔id agreement, cue motion references, and cross-document edge collisions (two scenes binding different motions to one stage edge; `scene.*` diagnostics). The Cat Cafe opening (`examples/cat-cafe/src/scenes/opening/`) is the first consumer; the starter template's opening (`template/src/scenes/opening/`) is the second, so a copied starter is scene-managed out of the box.

### Create the Story package

Keep the simulation facet and its materialization/construction callbacks in
a dedicated simulation-definition module (`src/game/simulation-definition.ts`
in the by-authoring-object story layout; the Engine Lab rig keeps flat
`src/simulation-definition.ts`), without Presentation or React imports. Compose
that definition with the presentation facet in `src/story.ts` using
`defineGamePackage`. Define separate simulation and presentation patch surfaces
only for reviewed bootstrap-time replacement points. Resolve the package before
creating the Session so provenance describes the actual program in use.

The Engine Lab demonstrates this in:

- `e2e/src/story.ts`
- `e2e/src/simulation-definition.ts`
- `e2e/src/gameplay/simulation.ts`
- `e2e/src/application/semantic.ts`
- `e2e/src/application/composition.tsx`
- `e2e/src/application/entry.tsx`

Reuse the engine pattern, not the Tavern-specific ten-module partition, names, numbers, or content structure.

### Compose a Host application

A Story ships one `WebGameApplicationV1` declaration (core definition with the semantic adapter, validators, and optional Story extensions; projector; optional Narrative and WholeCanvas definitions; UI slots; Workspace Overlay definitions; labels; input maps) and boots it with `startWebGameApplicationV1`. The composers own the Session, persistence, capability session, diagnostics construction, input adapters, automation, and the dev HMR boundary — an entry never assembles engine services by hand. The Engine Lab follows this path.

When a Story has Narrative, create one frozen five-key input with
`selectNarrative`, `dispatchResolution`, `renderer`, `resolveText`, and
`replayCurrentVoice`, pass it to `defineNarrativeSurfaceV1`, and return the
opaque `NarrativeSurfaceDefinitionV1` as `ui.narrative`. The renderer receives
immutable pending/history/choice availability plus the current player profile
and player view. It can invoke only the supplied occurrence-fenced actions; it
does not own a player controller, clock, Host, Semantic Stage, Session, or
writable lifecycle store. `DefaultGameRootV1` mounts the production Host from
the composition definition, so do not add `slots.narrative`, a direct semantic
writer, or a second stage claimant. Engine Lab, the starter template, Bookshop,
and Cat Cafe are the maintained examples. SillyOS intentionally omits the
definition and therefore mounts no Narrative surface.

An authoritative screen-hold between two lines is authored as a `hold`
interaction: positive integer `totalMs`/`remainingMs` plus the author's
`skippable` flag (original frame counts convert to milliseconds at Story
compile time). The single advancing resolution is `hold_tick({ elapsedMs })`;
Story runners apply it with `applyHoldTick` from `@sillymaker/base/story` — a
partial tick keeps the same boundary occurrence and decrements `remainingMs`,
and the tick that reaches zero expires into the node's successor. The
Narrative Host owns the presentation clock and proposes the commits: without
a declared cadence it commits only skip-folds and expiry, while a hold that
sets the optional `tickQuantumMs` gets partial commits per quantum, so a
mid-hold Save restores the hold with the last committed remainder (loss
bounded by one quantum) and wall clocks never enter State, Saves, digests,
or replay. A hold that drips authority or swaps frames mid-hold settles
those inside the same `hold_tick` commit by threshold crossing:
`countHoldTickCrossings` from `@sillymaker/base/story` counts how many
interval boundaries fall in `(elapsed before, elapsed after]`, so the
outcome depends only on the millisecond sum and never on how the Host
batches ticks. Show the held picture by committing its stage node before
the hold — the starter template's interaction-document kit does this with a
`hold` block whose inline `ops` compile to a preceding stage node — never by
flashing a zero-duration stage during the wait.

For a whole-canvas primary or exact-parent detail, freeze the seven-key input
to `defineWholeCanvasSurfaceV1`: `catalog`, `source`, `resolveTarget`,
`dispatchAction`, `renderer`, `prepareTarget`, and `resolveText`. Use a
publication source when semantic state selects the primary, as Cat Cafe does
for `catcafe.ending`; use `createWholeCanvasApplicationSourceV1` when local
navigation is the product contract, as in Engine Lab's opt-in conformance
route. The renderer is passive: it receives immutable primary/detail data and
frame-bound `onAction`/`onBack`, while the package owns readiness, routed input,
focus, and detail lifecycle. Existing `titleScreen` declarations automatically
use the same package-owned Splash/Title authority without requiring
`ui.wholeCanvas`. A Story-defined WholeCanvas consumer omits `ui.wholeCanvas`
when unused; an application allocates no WholeCanvas Host, source, lease, or
subscription only when both that field and `titleScreen` are absent, as SillyOS
demonstrates.

Declare each gameplay window with `defineWorkspaceOverlayV1`, including its
contract revision, dismissal policy, and required port IDs. Supply concrete
`overlayPorts` bindings for those requirements, then return its accessible name,
content, and optional preparation from `slots.overlayResolver`. Story code opens
an ordinary primary through
`context.intents.execute({ kind: "overlay.open", overlayId })`; structural
replacement/detail/back/close flows may use the narrow `context.overlays`
facade. That facade translates directly to the UI-owned Coordinator and exposes
only an immutable primary/detail snapshot. It is not a Story-owned topology
store. The optional `prepare()` hook is for presentation/resource preparation
only; it must not send semantic commands or advance gameplay. An admission
rejection leaves the current topology, input, and focus unchanged, and Story
content does not mount while an initial or detail candidate is still behind the
code-native fallback. The current pilot accepts exact-ID transient targets only;
it has no source revision, parameter vector, or stable-target reconcile API.

System dialogs use the same composition-owned transient lifecycle; a Story does
not create a System store or standalone dialog Host. Slot code may call
`context.systemDialogs.openSettings()` or `openSaves()` and handle the returned
structured preparing/applied/unchanged/rejected/faulted result. It receives no
raw close, Coordinator, epoch, instance, readiness, or topology evidence. The
required `SystemDialogHostV1` receives the composition-created opaque session.
When a Story replaces standard Saves through `customSaves`, it supplies a React
component identity; the Host mounts that component inside React, so hooks remain
valid and the Story does not invoke or own a render callback. Settings and Saves
still replace each other in one root slot, and load/clear/import confirmation
remains the exact-parent managed child of the current Saves root.

`context.systemDialogs.returnToTitle()` always returns a Promise. Without an
application lifecycle it rejects with `ui.lifecycle_restart_unavailable` before
presentation mutation. In the composed Web path, success means the Core anchor
and exact presentation successor are both installed; the old Root must not
close System or Overlay afterward. Likewise, a successful load/import makes the
old Saves continuation stale, so Story code must not add a post-load close or
finalizer that could target the successor.

`startWebGameApplicationV1` then:

1. creates a `GameHostV1` (IndexedDB, files, clock, navigation, logging, entropy);
2. builds the persisted capability session (Host records overlaid by the page query);
3. resolves the Story and creates the core application instance (Session, semantic port, persistence lease, autosave, Story extensions);
4. composes the UI (presentation store, input router, intent router, one shared Workspace Overlay/System/Narrative/WholeCanvas Managed Surface authority, plus the interaction session) and mounts the default GameRoot with the Story's ordinary slots and, when declared, the composition-owned Narrative and WholeCanvas Hosts;
5. installs the automation bridge and optional pointer adapter, binds the DebugBundle UI context, and registers page-lifecycle teardown;
6. owns disposal and — through `installWebGameApplicationHmrV1` — the dev HMR rebootstrap with persistence handoff.

The composer is the composition root. Base, UI, and Web must not import a concrete Story to make this happen.

Player playback choices live in the per-Story Host profile, outside every Game Save. A Story that consumes `playerProfile.current().preferences.skipCutscenes` may opt into the default Settings checkbox with `settingsSkipCutscenesLabel`; otherwise the control is absent. The preference may only settle explicitly skippable presentation waits to their stable end state. Any gameplay progression still goes through the same validated semantic commands, so normal and collapsed playback converge on the same authoritative Snapshot, digest, and replay evidence.

## 3. Persistence considerations

Save only plain versioned data and stable IDs. A Save must not contain Store clients, derived indexes, functions, component instances, DOM values, or Host handles.

When changing State:

- decide whether old Saves remain valid;
- update schema and state-contract identity deliberately;
- provide an explicit migration/adoption path when compatibility is promised;
- test import failure as well as successful migration;
- make load establish one new authoritative replay base.

Presentation-only changes should not invalidate gameplay State. Internal data-structure or index changes should not change Save compatibility when canonical exported State is unchanged.

## 4. Story testing

Prefer small in-memory Story builders for most tests. Cover:

- initial State and module invariants;
- command success and zero-write rejection/fault behavior;
- deterministic RNG outcomes;
- query/preview/dispatch parity;
- State reference and Save validation;
- semantic publications and important narrative/gameplay routes;
- Story application composition and player-facing browser flows.

Do not freeze provisional balance or a large command corpus merely because it was once used for calibration. Keep golden/fixture bytes only when the current game design or an external compatibility format intentionally depends on them.

## 5. Tooling and Hotfixes

Story tooling is optional and should exist for a maintained authoring, debugging, migration, or content workflow. It may be lazy-loaded so ordinary play does not pay its cost. Debug and cheat operations remain capability-gated.

For a detached Narrative/Stage preview, keep the selection and replay logic in the Story tooling
slice. Purely replay the Story's script from an initial semantic Stage, project each selected point to
a `StageRenderTarget`, and render it with `SemanticStageTargetHostV1`. The preview component should
not receive the application instance, Session, semantic dispatch port, or `SemanticStageV1`; that
keeps it read-only and avoids a second Stage reconciler. Cat Cafe's DevDock panel is the maintained
reference, including explicit choice-route cases and a digest-stability test.

Hotfixes are deterministic bootstrap-time replacements on named patch slots. They are appropriate when a deployed Story needs a controlled correction, not as a substitute for ordinary source changes or a general mod scripting API. A simulation-changing Hotfix must participate in compatibility/provenance decisions; a presentation-only patch must not claim authority to migrate State.

## 6. Evolving the model

The current module/owner/query model can be redesigned. [Typed StateStore](proposals/typed-state-store.md) records one candidate direction. An adopted replacement should make Story authoring simpler while retaining a single authoritative State, explicit write authority, atomic commands, testable queries, and clean persistence boundaries.
