# Story authoring with SillyMaker

操作层面的分层指南（含 LLM 代理执行建议与诊断速查）见 [authoring-quickstart](authoring-quickstart.md)。`@sillymaker/base/story` 是作者 prelude：当前代契约的无版本后缀别名。

状态：当前 Story 组合模型。Engine Lab（`e2e`）是唯一维护的参考实例。

## 1. What a Story owns

A Story owns the game-specific parts of a playable application:

- stable identity and state-contract description;
- validated gameplay data and named deterministic rule providers;
- the State shape and GameplayModules that own it;
- commands, rejections, domain events, debug commands, queries, and ViewModels;
- text, assets, scene graph, interactions, semantic actions, and renderer contributions;
- Story-specific application composition and optional tooling.

Generic session, persistence, diagnostics, UI primitives, and browser adapters stay in SillyMaker packages. The Story consumes those packages through workspace public exports.

## 2. Recommended composition sequence

### Define identity and data

Give the Story a stable ID/revision and validate content or balance data at the boundary. Stable IDs, not React components or object identity, connect State to Story content.

Treat a revision as a compatibility statement. Change it when the corresponding Story/state contract requires migration; do not increment every identity field simply because application code was rebuilt.

### Define GameplayModules

Each stateful module declares its owned State slot(s), schema, initial State, public read ports, domain-event reducers over its own slice, and local invariants. Ownership is disjoint: two composed modules may not claim the same slot or a parent/child pair such as `simulation.actor` and `simulation.actor.hp`. Dependencies should name capabilities another module intentionally exposes.

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
produced by Story domain-event/rejection/Debug-error normalizers; a schema
helper may
already have frozen its output. Evidence arrays use one captured own `length`
data descriptor, so Proxy virtual length cannot alter their item vector.
Finalization projects and freezes the Snapshot-free canonical data;
the returned attempt and CommandLog share that admitted projection. Snapshot
objects themselves remain the authoritative identity and are not cloned by this
evidence boundary.

For module wiring, `createGameAuthoringKitV1` captures the Game type family once and provides `defineCapability` (typed tokens), `defineStatefulModule`/`defineStatelessModule` helpers (omit absent command/query surfaces; a stateful module declares a `reducers` map from domain-event kinds to folds over its own slice), `provides` factories that build narrow read-only ports from the module's own State slice, `requires` declarations that feed the validated capability DAG and the module's serialized dependency vector (`transaction.read(token)` resolves any composed provider; the declaration documents and validates the dependency, it does not gate the read), and `initializesAfter` for startup order. `composeModules` validates disjoint State-slot ownership, the capability DAG, and the lifecycle DAG with stable diagnostic codes, compiles event kinds directly to their ordered subscribers, and emits ordinary low-level bindings for `defineGameSimulation`, so kit and hand-written modules never form two authorities.

The aggregate State should align with the modules the Story actually composes. Avoid a universal object containing optional fields for every possible module. Stateless gameplay services can remain named pure capabilities rather than fake State.

### Compose the simulation

Use `defineGameSimulation` to bind:

- the exact module tuple;
- aggregate State, command, domain-event, rejection, and debug schemas;
- bootstrap and initial-State creation;
- gameplay and debug command executors;
- `createQueries(State)`;
- immutable ViewModel projection.

Cross-module commands remain Story-owned orchestration. The handler decides against the command-start Snapshot, emits domain events for every decided outcome, and commits a complete candidate or rejects without changing the current Snapshot. Deterministic rule code uses the supplied serializable RNG capabilities rather than ambient time or `Math.random()`.

The kit composition's `createTransactionRunner` owns the mechanics of that orchestration: the Story handler reads capabilities against the command-start Snapshot, performs every gameplay refusal via `reject(...)` before emitting, and journals decided outcomes with `emit(event)` (validated once against the Story `eventSchema` at emit time); `emit` never rejects — an event is a decided fact of the commit. After `complete()`, the engine folds the journal deterministically through the cold-compiled subscriber plan: events replay in emission order, and within one event the subscribed module reducers run in locale-independent UTF-16 code-unit module-ID order, each folding its own current slice forward. Handlers read the command-start snapshot; repeated events for one owner read that owner's running proposal. Each touched owner then re-validates once, and all admitted slices materialize into one aggregate candidate in a single batched parent copy before aggregate validation. The engine produces the commit/reject/fault attempt envelope (the committed envelope carries the event journal) with full RNG and sequence rollback. The same order reaches the candidate Snapshot, CommandLog evidence, and authoritative replay; Host locale never chooses gameplay order. Events with no subscribed reducer are journal-only broadcast evidence for UI projections and tests. The transaction surface exists only inside command executors; UI and automation never receive it.

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

For large immutable dialogue, keep stable text IDs in the Story control plan and
move copy into build-known text packs instead of constructing every localized
entry during Player module evaluation. Keep only small startup/UI copy in the
resident `TextCatalogSetV1`. Put each payload under the application's
`assets/content/` tree as the exact `sillymaker.text-content-pack` V1 wire
(`format`, `version`, `packId`, `textCatalogs`), and declare its app-relative
runtime path plus stable `packId` in one `TextContentManifestV1`. The same
manifest belongs in the materialized presentation and the application's
`textContent` declaration, alongside bootstrap catalogs and build-known
initial/required pack IDs. Do not add or generate sibling byte-length, SHA or
declared-entry receipts for these passive payloads; admission derives the actual
entry count after one bounded Strict JSON/schema/value check.

Declare `initialPackIds`, `requiredPackIdsForInvocation(admittedInvocation)`,
and `requiredPackIdsForSnapshot(validatedSnapshot)` next to the application
composition so Web can bind one readiness hook into the existing Core semantic
and Persistence authorities. The invocation planner receives Story-admitted
input before command construction/dispatch; the Snapshot planner receives a
validated replacement candidate before bind/commit (and before R2
takeover/install). Do not call `ensure` from a UI callback, and do not fetch or
await inside a command executor. UI and automation keep using the ordinary
semantic port; Save-surface load/import keep using Persistence. A candidate is
not allowed to replace the old State until its required packs are ready;
ordinary dev-only State-tuner writes may conservatively prepare all declared
packs after their capability gate. UI text
resolution is synchronous through the supplied `TextContentSessionV1`. Missing
or corrupt content must report a Host/application failure and leave the current
semantic and Stage publication unchanged. Do not build a second content facade
or couple the planner to raw Base State.

Treat manifest revision plus sorted `packId`/`runtimePath` topology as
presentation identity and its bytes as static payload: neither packs nor
loaded-session indexes enter State, Snapshot, Save, CommandLog, or replay.
Directly editing text at an existing logical location does not change that
identity or add a Save compatibility warning; changing topology or ordinary
presentation source retains its existing identity behavior. An already loaded
pack stays immutable for the current session, so refresh/restart after editing
to load the new payload. Keep source-aware
Flow summaries, source maps, and complete authoring copy in a tooling-only
module; the ordinary Player graph should import only the control plan, compact
manifest, bootstrap copy, and runtime resolver. The starter template demonstrates
this split with opening/ending packs and `src/tooling/narrative-flow.ts`. Run
`deno task check:assets` after changing any pack or manifest topology; it reads
every declared pack from its own application root and exercises the same Base
bounded admission contract. Pack unload and a separate i18n/message-catalog lane
remain deferred until the active M0–M5 plan closes.

Narrative entrance/exit animation is authored as Motion assets: `sillymaker.motion` JSON documents (strictly admitted integer keyframes with per-segment easing), bound to stage edges through `motionStageTransition` in the transition catalog — or, for a scene-managed scene, through its Scene document's cue bindings. Motions compose over the settled placement (layout stays authoritative) and never enter authoritative State, Saves, digests, or replay. They are the human tuning surface — the DevDock provenance panel may locate them from the running picture, while the standalone/embedded Authoring Host owns the maintained Motion Workbench that edits and saves them (a save marks `authoring.status: "human_tuned"`; agents must not overwrite human-tuned or locked assets — see the collaboration contract in `authoring-quickstart.md`). `story check` lints every motion file: admission, unique ids, and filename↔id agreement.

Discrete frame swaps (blinks, breathing sheets, burst frame runs) are the same Motion asset: a `frame` track samples stepwise (no interpolation, no easing) and selects an index into the frame table the content declares via `StageContentResolution.frameAssetIds` (ordered, ≤64; joins asset preloading). The stage host hands the sampled `frameIndex` to the entry renderer — one-shot cue motions override while in flight, an entry's `ambient` loop overrides while settled, otherwise `frameIndex` is `null` and the renderer shows its default appearance. Author frame 0 as the default pose (reduced motion drops the override), and make a one-shot run's last frame equal the settled appearance so the settle is invisible. The runtime clamps out-of-table indices; the Workbench edits frame keyframes like any other track (easing controls replaced by a stepped label).

Clickable body/prop zones are authored as Regions documents: a `sillymaker.regions` JSON file (`*.regions.json`, strictly admitted) declaring named regions — bounding box plus accessible name, optionally refined by a `polygonPoints` shape (pointer hits then follow the polygon via CSS clip-path; keyboard activation keeps the box) and a `hoverAssetId` silhouette highlight the host reveals on hover/focus when the Story passes an `assets` registry. Story code imports the document, runs `parseRegionsDocumentV1` once, and hands `document.regions` to the content catalog's `resolveContent` (`hitRegions`); activations arrive through the stage's `onHitRegionActivate` and become ordinary semantic invocations — regions never carry gameplay authority, and hover state never enters State, Saves, or replay. `story check` lints every regions file (admission, unique ids, filename↔id agreement); Studio's Regions workspace edits them against the compiled scene's real rendering, and `story regions trace <image.png>` bootstraps a document from a bitmap alpha silhouette (status `generated`) for hand tuning.

Chrome placement (HUD icons, docked boards, tab hot zones, sheet return anchors — the DOM chrome outside the semantic stage) is authored as Chrome-layout documents: a `sillymaker.chrome-layout` JSON file (`*.chrome-layout.json`, strictly admitted) carrying one surface's hand-tuned geometry in logical canvas space — `boxes` (position + size; negative positions are legal for parked/peeking elements), `anchors` (position-only points for self-sizing elements), and `offsets` (named integer scalars such as font-metric nudges). Story code imports the document, runs `parseChromeLayoutDocument` once, and reads named entries as frozen typed data (fail fast on unknown names); behavior — board exclusivity, occupancy gates, intent legality — stays in Story code, and layout documents never enter State, Saves, digests, or replay. `story check` lints every layout file (admission, unique ids, filename↔id agreement), and the dev server exposes the same CAS write-back ports as motion and regions documents. Studio's Chrome workspace (界面布局) edits them visually: every discovered layout document lists in the panel, boxes drag and corner-scale on the canvas, anchors drag as points, offsets edit as numbers, and saving graduates `authoring.status` to `human_tuned` through CAS. Declaring an optional `chrome` fixture on the Studio binding (`StudioChromeFixtureV1`: `layoutId` + `render(draft)` — render the real chrome component with frozen sample data, geometry read from the passed draft) previews the actual UI under the handles; documents without a fixture stay fully editable as a wireframe.

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

A Story ships one `WebGameApplicationV1` declaration (core definition with the semantic adapter, validators, and optional Story extensions; projector; optional Narrative and WholeCanvas definitions; UI slots; Workspace Overlay definitions; labels; input maps) and boots it with `startWebGameApplicationV1`. The composers own the Session, persistence, capability session, startup/runtime diagnostics, input adapters, automation, and disposal — an entry never assembles engine services by hand. Eligible component-only presentation modules may receive Vite React Fast Refresh; application declaration, core/domain, config, ineligible, and unclassified changes fall back to full-page reload unless the product owns an admitted R2 boundary. `installWebGameApplicationHmrV1` is the opt-in successor/persistence-handoff helper. Engine Lab is its first maintained dev-only consumer: a Story-owned Vite identity plugin injects real `BuildIdentity` into a literal-self-accepting composition candidate, then the Web composer replaces Game/Session on the same Host/root. This is conformance evidence, not the default for every Story; ordinary product entries still contain no HMR construction.

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
compile time). A hold is a time-settlement boundary, not an input boundary:
every input resolution against it rejects, and elapsed time arrives as the
session-level time verb `TimeTick` (`parseTimeTick`/`evaluateTimeTick` from
`@sillymaker/base/story`) — a tick carries `elapsedMs` plus the
`expectedHoldOccurrenceId` fence naming the hold it settles, and a stale
fence rejects without touching State. Story runners apply an accepted tick
with `applyElapsedToHold` — a partial tick keeps the same boundary occurrence
and decrements `remainingMs`, and the tick that reaches zero expires into the
node's successor. The Story's narrative surface binds a `dispatchTime`
handler next to `dispatchResolution` (pass `null` only when the Story has no
holds); the Narrative Host owns the presentation clock and dispatches the
tick commits through it: without a declared cadence it commits only skip-folds and
expiry, while a hold that sets the optional `tickQuantumMs` gets partial
commits per quantum, so a mid-hold Save restores the hold with the last
committed remainder (loss bounded by one quantum) and wall clocks never enter
State, Saves, digests, or replay. A hold that drips authority or swaps frames
mid-hold settles those inside the same time-tick commit by threshold
crossing: `countThresholdCrossings` from `@sillymaker/base/story` counts how
many interval boundaries fall in `(elapsed before, elapsed after]`, so the
outcome depends only on the millisecond sum and never on how the Host
batches ticks. Show the held picture by committing its stage node before
the hold — the starter template's interaction-document kit does this with a
`hold` block whose inline `ops` compile to a preceding stage node — never by
flashing a zero-duration stage during the wait.

A hold that must end early when a declared condition becomes true — a
watcher catching the player mid-bar, a gauge crossing its line — declares
`when` reroute arms on the hold block: each arm pairs a branch-vocabulary
predicate with a reroute target, the first declared match wins, and there is
no implicit else (no match means keep holding, or expire into the block's
`next`). Do not invent an abort verb or let the Host pick a target; the
reroute is derived inside the ordinary time-tick commit. Story runners step
fenced settlements with `settleHoldTimeline` from `@sillymaker/base/story`:
arms evaluate at t=0 against command-start state and again after each of the
hold's own tick/frame crossings, and the first match truncates the hold at
that instant — consumed milliseconds stop at the cut, later crossings never
apply, and the discarded remainder is never pre-folded into the target. The
commit that opens the hold evaluates arms against in-transaction working
state, so an already-true arm reroutes without spending a hold occurrence;
a skippable fold runs through the same stepping, so skip cannot jump past
the catch. Know the granularity promise before wiring predicates: an arm
over state the hold's own tick effects write cuts at the exact crossing,
while monitor or external-command writes surface at the next fenced
settlement's t=0 (the same discipline as monitor `activeWhen`). Two
authoring notes: an arm-carrying hold should keep `tickQuantumMs ≤
tick.everyMs` — the cut instant is exact either way, but the commit that
carries it lands per quantum, and an oversized quantum lets the on-screen
bar run visibly past the catch before snapping back; and a kit whose
effects only apply at command boundaries (the starter template's shape)
should reject `when` combined with `tick` on one block, because the arms
could never observe that block's own tick writes.

Player input during a hold — pressing a body zone while a touch bar runs,
throwing a switch mid-watch — is the same `when` machinery plus one write
discipline, never a new interaction kind. The session does not gate
ordinary commands while a hold is pending, so declare an ordinary write
command whose payload carries `expectedHoldOccurrenceId` and whatever
declared write intent the press means; the handler compares that fence
against the pending hold in one line (reject the whole command with your
Story's `*.hold_occurrence_stale` code when it does not match — a stale
press queued behind a cut must never write into the next hold), and on
the current occurrence it **only writes**: a field write or a domain
event, never the pending interaction, never time (`TimeTickV1` stays the
only time verb), never a reroute. The hold's own `when` arms read the
committed write at the next fenced settlement's t=0 — the monitor
granularity — so the input picks state and the declared arms pick the
route. Route the activation in your application layer: when
`pending.kind === "hold"`, a hit-region activation dispatches the fenced
write command instead of an interaction resolution (input resolutions
against holds keep rejecting `interaction.kind_mismatch` by contract).
Keep write-request fields plain versioned Story state so they survive
mid-hold save/load, and make the reroute target consume and clear any
request latch it acted on — the engine does not know your request fields,
so that hygiene is yours. Never put pointer coordinates, hover state, or
region ids into authoritative state, and never dispatch per pointer-move.

A timing accumulation that must run while the player can still act — a
decision gauge rising under a live menu, a scene-scoped drip while the player
reads, a held-interaction drip — is an authoritative monitor, not a hold.
Declare monitors once with `parseMonitorDeclarations` (from
`@sillymaker/base/story`): each entry is `{ id, everyMs, retention, event,
activeWhen }`, where `activeWhen` is an authoritative-state predicate in the
branch `when` vocabulary (effects write state, the flipping predicate starts
and stops accumulation — there are no arm/disarm commands) and `event` is the
domain-event payload emitted once per threshold crossing. Keep the
accumulator in a module slice as plain `{ [monitorId]: accumulatedMs }` data
admitted by `parseMonitorAccumulator`, so a mid-gauge Save simply keeps the
milliseconds. Inside the Story's time-verb command handler, after folding a
pending hold's remainder, call `settleMonitors` with the reported
`elapsedMs`, the command-start state, and the current accumulator; emit the
returned events plus an accumulator-set event through `transaction.emit` like
any other domain events. Declaration order is settlement order, inactive
monitors clear or retain their accumulation per declaration, and the
arithmetic is batch invariant — `{500,500,500}` and `{1500}` produce the same
terminal state, so Host tick batching can never change outcomes. Monitors
have no script body and cannot route the narrative; anything that needs to
change the pending interaction stays in narrative vocabulary.

Session time reaches that handler through the composer, not a Story timer:
declare `timeReporting` on the `WebGameUiDefinitionV1` — a `quantumMs` batch
size, an `enabledWhen` predicate over the live publication (project a
"reporting active" flag from your monitor predicates so the metronome only
runs while some monitor is active), and a `dispatch` that sends your unfenced
time command through the semantic port. Unfenced session time must be
unconditionally admissible in your command handler — never gameplay-rejected
— and if your dispatch wrapper can fail, surface the failure as a rejected
promise (not a resolved rejection object) so the engine can latch reporting
off with a diagnostic instead of spamming the command log. The engine gates
the reporter off while a hold is pending (holds report through the fenced
expiry controller) and while the document is hidden, so hidden-tab time
never accumulates.
Pace is the second declaration: mark a reaction window — a gauge charging
under a live decision menu — with `pace: "realtime"` on the monitor (and on a
hold that must run at wall parity), project an "realtime active" flag
(`anyRealtimeMonitorActive`), and declare `realtimeWindow` with that
predicate; while it holds, the engine pins the presentation rate to exactly
1× and releases it when the window closes, so player fast-forward never
compresses a reaction span. Cinematic pace (the default) means scaled time is
fine. Keep both predicates cheap, deterministic reads of the publication — a
throwing predicate latches its feature off with one diagnostic.

A bounded stretch of commits whose intermediate states a Save should not
re-enter — a presentation barrier in progress, an asset assembly, an external
side-effect bracket — is an in-flight span, declared as application policy
rather than Story choreography: give `defineCoreGameApplicationV1` a
`persistenceSafepoint` whose `classify(state)` derives `safepoint` |
`in_flight` deterministically from committed authoritative state (prefer
existing vocabulary — the Engine Lab classifies a pending
`presentation_barrier` as in-flight — or an explicit span field your domain
events set and clear) and whose `maxInFlightCommits` (1..256) bounds the
span. While the span is open the engine defers autosave, falls back to the
last safepoint Snapshot on flush, and rejects player-slot saves with
`in_flight` (give the Save labels' `rejected.in_flight` entry a
player-readable reason); the next safepoint commit restores ordinary
granularity. Long-lived authoritative state — monitor accumulations, hold
remainders — must stay saveable and never hides inside a span; a span that
outlives its bound forfeits the inhibit with a diagnostic and keeps saving.
Loads stay available mid-span, and a barrier's `loadRecovery` still owns what
a restored barrier does. This is orchestration policy, not data safety: every
commit remains complete, valid, and replayable.

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

1. for the default document entry, admits the exact frozen runtime Browser/Desktop
   bootstrap receipt, cross-checks the Desktop Host marker, and attaches to the
   static startup shell; it then creates neutral `ApplicationHostCapabilitiesV1`
   (records, files, metadata clock, and logging) and admits Game bootstrap entropy
   separately;
2. builds the persisted capability session (Host records overlaid by the page query);
3. resolves the Story and creates the core application instance (Session, semantic port, persistence lease, autosave, Story extensions);
4. composes the UI (presentation store, input router, intent router, one shared Workspace Overlay/System/Narrative/WholeCanvas Managed Surface authority, plus the interaction session) and mounts the default GameRoot with the Story's ordinary slots and, when declared, the composition-owned Narrative and WholeCanvas Hosts;
5. installs the automation bridge and optional pointer adapter, binds the DebugBundle UI context, and registers page-lifecycle teardown;
6. publishes required-domain readiness independently of the first real React layout
   commit, acknowledges a lazy optional contribution only after its active consumer
   accepts it, restores a generic actionable shell on terminal failure, and owns
   disposal.

The startup receipt and DOM signals are Host evidence only. They never enter
State, Save, digest, replay, RNG, or CommandLog. An application that deliberately
uses `installWebGameApplicationHmrV1` must install and own that separate opt-in
boundary; the maintained Story entries do not.

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
