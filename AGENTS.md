# Project Instructions

## Mission

This repository is **SillyMaker** (https://github.com/jasl/silly-maker), a
reusable React and TypeScript engine for **GUI applications and games**. Games
remain the first pressure source for deterministic State, Save/replay,
presentation, input, content scale, and authoring. Browser and Deno Desktop are
the current product targets; Electron is only a possible future Host adapter.
Backend services, CLI products, and headless products are not engine targets.
Desktop CLI arguments may provide admitted startup configuration, and headless
code may support development, tests, conformance, and automation. Required
external or companion services, including LLMs, connect through typed RPC
boundaries; they are not in-process plugins. The current flagship is the Cat
Cafe example (`examples/cat-cafe`); the retired Project Tavern PoC lives only in
history. The active work may redesign gameplay, engine APIs, application
hosting, state management, presentation, and authoring workflows.

Prefer a coherent maintainable system over compatibility with the completed
first-PoC implementation. When a durable public contract changes, update its
documentation and tests with the code.

## Active sources of truth

Read only the documents relevant to the change:

- `docs/engine/roadmap.md` — accepted vNext direction and continuous engine
  milestones.
- `docs/engine/design/**` — accepted target contracts that are not necessarily
  implemented yet.
- `docs/engine/plans/2026-07-30-production-floor-sequence.md` — the only
  cross-plan execution order. PF0–PF7 and the Complexity Reset are complete;
  PF6 remains evidence-gated and inactive. The two authoring/presentation lanes
  accepted on 2026-08-15 both delivered that day:
  `docs/engine/plans/2026-08-15-authoring-architecture.md` (Studio author-trust
  hardening, the unified authoring shell with workspaces, the project authoring
  index, shared document sessions, story-package locality, Scene Construction,
  and the read-only Flow workspace; contracts in
  `docs/engine/design/authoring-architecture.md` and
  `docs/engine/design/scene-authoring-and-studio.md`) and
  `docs/engine/plans/2026-08-15-ambient-loop-motion.md` (presence-bound ambient
  loop motion; the owner-accepted contract lives in
  `docs/engine/proposals/ambient-loop-motion.md`). Cue identity (presentation
  edge context) delivered 2026-08-17; its contract and closure record live in
  `docs/engine/proposals/cue-identity.md`. Six owner-ordered engine-gap lanes
  then delivered between 2026-08-19 and 2026-08-22: authoritative hold clock
  (`hold`, later unified under `TimeTickV1`), parallel monitors (domain events
  and reducers, authoritative monitors, persistence safepoints, and Host
  pacing), authorable frame sets, shaped hit regions, hold `when`, and
  mid-hold input. Their contracts and closure records live in the corresponding
  proposals and plans dated 2026-08-19 through 2026-08-22. The separate
  authorable-chrome-layout lane also delivered M0–M2 and both consumers on
  2026-08-22; its detailed closure record appears below. After absorbing those
  delivered capabilities, the most recently completed default/core lane is
  `docs/engine/plans/2026-08-18-application-runtime-embedded-authoring.md`:
  Browser/Deno Desktop startup evidence, build-known progressive activation, an
  orchestration-neutral domain lifecycle selected through a bounded historical
  direct/Cordis-core A/B,
  structured authoring operations, an embeddable Authoring Host, and a typed RPC
  plus experimental Agent/UiArtifact seam. AR0 delivered 2026-08-22: neutral
  Application Host capabilities, once-admitted runtime and author bootstrap,
  static GUI startup/readiness/recovery evidence, final-output dependency
  attribution, and a truthful Browser/Deno Desktop R0–R3 baseline. It did not
  promote native Desktop launch, persistence/signing, or RPC readiness. AR1
  also delivered 2026-08-22: the same 17-case suite passed for Direct and
  Cordis-core-derived implementations, SillyMaker-owned Direct became the only
  private backend, Cordis adapter/vendor/dependency were deleted, and lazy
  DevDock plus Studio Flow became the two real GUI consumers. AR2 also delivered
  2026-08-22: package-private, strictly admitted Scene operations, a pure reducer,
  an opaque document-successor identity plus monotonic draft revision, atomic
  stale rejection, and one shared UI/non-UI executor over the existing authoring
  session/history. AR3 also delivered 2026-08-22: one package-private Authoring
  Host now backs the standalone and dev-only embedded shells, R1 candidates use
  connected inert staging before the persistent visible root, and Engine Lab
  proves Scene CAS plus a shared presentation dependency can reach Browser
  Game/Session R2 without rebuilding the Authoring R1 sibling. A macOS/Deno 2.9.5
  native common-runtime smoke also proves GUI ready,
  same-window Game/Session restart, and close-flush/normal exit without promoting
  Desktop authoring, HMR, packaging, or durability. AR4 also delivered
  2026-08-22: the only Agent entry is the workspace-private
  `@sillymaker/agent/internal`; its transport-neutral RPC client, observable Agent
  Host, bounded `UiArtifact`/`UiIntent` admission, closed renderer, generation/
  sequence/cancellation fencing, and deterministic fake back Engine Lab's
  dev-only fake stream → Artifact → admitted intent → AR2 Scene-operation
  vertical slice in Chromium and WebKit. Run currentness is keyed by
  `(sessionId, runId)`; raw adapters must settle submit before forwarding that
  run's first stream record, failed-connection replacement closes the predecessor,
  and `run_failed` terminates its transient draft. An Artifact remains inert until
  its exact AR2 receipt is paired, including when Scene becomes ready later.
  Invalid successors and late cancelled events retain the prior Artifact, and
  ordinary Template/Engine Lab Player graphs exclude Agent/RPC implementation
  modules. AR5 has since split Studio core publication behind a neutral
  single-companion bridge: the complete Template Author graph excludes Agent/RPC,
  while Engine Lab selects the private Agent companion explicitly. The Studio
  manifest keeps a workspace Agent dependency for that opt-in entry, but final
  module/source structural exclusion is proved. AR5 Browser physical evidence is
  intentionally limited to contract-level R1 rejection/retry, shared-presentation
  Player R2 + Authoring R1, and Application R3 recovery; deeper Agent/currentness
  details stay in unit/headless contracts. The one-off paired performance runner
  was deleted after producing dated evidence and replaced by a raw-measurement-only
  generic GUI startup benchmark. The package-private,
  explicitly experimental, default-off Deno Desktop candidate, bounded launch
  preflight, and explicitly selected official canary characterization also passed:
  the binary reported revision `98dc759`, which the participant mapped to upstream
  commit `98dc759254a90b98f7bbb62ba5361e531d0db6a5`; official in-runtime Vite,
  same-window/origin bootstrap/private route, component-only shell Fast Refresh
  with retained state/overlay, normal close flush/drain, and direct-child exit 0.
  The initial mixed component/registry export was split without changing the
  adapter, BuildIdentity, or equal-R2 fallback. The preflight receives the isolated
  binary explicitly, records the participant-selected full upstream commit, checks
  only the seven-character revision reported by `deno --version`, uses isolated
  directories, invokes the real workspace command, manages only its direct child,
  and adds no renderer receipts, probe modules, report endpoints, or durable
  evidence sink. Do not build
  a 2.9.5 proxy/shim/fork, depend on undocumented Deno framework-dev markers, or
  version-gate by a presumed 2.9.6.
  AR5 delivered and closed on 2026-08-23 without claiming live Desktop HMR or
  Desktop production promotion; AR6 closure and owner checkpoint also completed
  that day. The owner then instructed the next engine work to begin; the live
  Host/consumer audit selected and delivered on 2026-08-23
  `docs/engine/plans/2026-08-23-authoring-workspace-focus-navigation.md` as the
  first post-AR6 lane. It turned the existing closed workspace manifest into Host-owned
  session-local focus, an accessible rail, and one visible workspace while
  preserving dirty sessions, progressive Flow, standalone/embedded shells, and
  Authoring R1 continuity. It does not build an IDE, WindowManager, or public
  workspace/plugin ABI, and it neither waits for nor activates Desktop HMR. The
  same audit found that ordinary Browser product R2 still lacked authoritative
  Snapshot continuity across its lease-only rebootstrap disposition. The owner
  accepted
  `docs/engine/plans/2026-08-23-browser-r2-authoritative-state-handoff.md`
  as the next engine lane. M0–M3 delivered the package-private exact Save +
  lease handoff, writable takeover gate, replay-base adoption, current-pair
  retry, focused Base/Core/Web contracts, and Engine Lab plus Cat Cafe
  forward/reverse Chromium/WebKit product evidence on 2026-08-23. Browser R2
  state continuity is therefore promoted for those private opt-in boundaries.
  This is a Save/Session contract, not transient React state preservation or
  Desktop HMR activation. The first
  stable whose source and behavior contain that path must re-run the same
  acceptance before the maintained Desktop development workflow activates. Until
  then the adapter remains package-private, explicit, and default-off. This
  independent Desktop activation follow-up did not block AR5/AR6, Workspace
  Focus, or Browser R2 closure and does not block other owner-accepted work.
  Browser R2 authoritative handoff is closed. On 2026-08-24 the owner accepted
  the Scale/Scene Object/Modular GUI plan listed below as the then-current engine lane.
  Its orthogonal M0 scale baselines and M1 static content plane/initial-bundle
  separation delivered the same day. M1 added the Base-owned immutable text-pack
  manifest/session, once-only strict pack admission, Web same-origin progressive
  loading through one semantic-invocation/Snapshot-replacement readiness boundary,
  Template's opening/ending packs, runtime-asset verification, and the
  ordinary-Player separation from tooling-only Flow/source metadata. Static
  payload stays outside State/Save and initial JavaScript. M1 originally used the
  compact manifest's revision plus sorted `packId`/`runtimePath` topology as
  presentation identity; the later locale-addressable contract extends that
  identity with locale/fallback/variant-path topology. Editing passive text bytes
  at an existing logical location does not change that
  identity or add a Save compatibility warning, and a refresh/restart creates the
  new immutable content session. Exact byte-length/SHA/declared-entry receipts and
  their proposed generator were removed as hostile to ordinary translation/Mod
  style local edits; bounded wire/schema admission remains and entry count is derived after
  admission. That plan's M0–M5 are now closed; the completed 2026-08-25 plan
  subsequently delivered addressable release and locale-addressable text rather
  than retaining the old defer. M2 State hot plans and the single-owner incremental project
  index delivered 2026-08-24: command execution uses a cold-compiled reducer
  direct plan plus touched-only batched State materialization, and each Vite dev
  server owns one lazy metadata-only authoring index with cached list views and
  path-local invalidation. M3 core/outer GUI capability reorganization also
  delivered 2026-08-24: the default Player is minimal, reference DevDock/preset
  settings are explicitly selected focused subpaths, and final receipts prove
  minimal/reference/Inspector/Agent reachability. M4 Scene/Object/Layer also
  delivered 2026-08-24: one bounded admission feeds the normalized Authoring
  Scene IR/compiler; explicit source authority yields a low-level runtime plan
  plus authoring-only inspection/source-map facets; ordinary Stage mutations and
  one exact-rebootstrap Session command preserve Browser R2 authoritative
  continuity while reconciling paint order. The retained authoring index's
  1,000-scene/50,000-object profile remains metadata-only and path-incremental.
  The owner-requested runtime-boundary Complexity Reset delivered 2026-08-24:
  recursive Snapshot/semantic-publication/admission-tree freezing, repeated admission/handoff stacks,
  implementation-shape tests, dead BuildIdentity consumers, and local
  attestation tooling were removed while real schema/digest/Save/replay/CAS/
  currentness/RPC boundaries remain. M5 then delivered the Inspector-first clean
  replacement: one standalone/embedded Authoring Host now exposes virtualized
  Authoring Scene and object/layer navigation, real Stage preview with selectable
  off-canvas/transparent ghost targets, bounded transform/appearance/order edits,
  read-only interaction/Motion/Timeline/intent/source facets and scrub, and the
  existing revision/CAS/history conflict path. The old Studio route, five-workspace
  shell, Story bindings and UI-only tests were removed without deleting the shared
  Host, document session, structured operations, source IO, R1 publication, or
  private Agent companion seam. Ordinary Player graphs continue to exclude the
  Inspector and authoring source writers.
  This lane does not activate
  State Format V2, ECS, a final Blueprint/Timeline editor, public Mod ABI, or
  Desktop HMR. AR4/AR5 did not add
  a real backend or transport, public Agent ABI, OpenUI/A2UI, Agent persistence,
  live Desktop HMR, or Desktop production promotion.
  Desktop persistence remains an accepted, unfinished, conditional promotion
  lane while the adapter is preview.
- `docs/engine/design/application-runtime-and-embedded-authoring.md` — accepted
  target contracts for Browser/Deno Desktop GUI entries, startup configuration,
  external RPC, platform Module Update Sources, the private Extension Runtime,
  SillyMaker-owned publication, the single Authoring Host with standalone and
  embedded shells, structured authoring operations, and separated gameplay,
  authoring, Agent-session, and UiArtifact authorities. It records the closed
  AR1 comparison, selected private Direct backend, and delivered private AR4
  fake vertical slice, but does not activate a public Mod or Agent ABI, Cordis
  API, real RPC backend/protocol, OpenUI/A2UI adapter, Agent persistence, Effect
  Broker, Electron/Node Host, Desktop HMR, or Player source editor.
- `docs/engine/plans/2026-08-18-experimental-composition-state-runtime.md` —
  completed external strangler evidence and the curated promotion boundary for
  the maintained internal Composition package plus the still-experimental
  neutral State façade. It does not activate a public Mod ABI, State Format V2,
  Effect Broker, or production Story migration.
- `docs/engine/plans/2026-08-23-browser-r2-authoritative-state-handoff.md` —
  the completed post-Workspace-Focus engine lane. M0–M3 replaced the lease-only
  Browser R2 disposition with one package-private exact Save + lease handoff,
  gated publication on writable takeover, preserved replay-base/currentness,
  closed stale-fence retry, and added Engine Lab + Cat Cafe Chromium/WebKit
  product evidence. It does not activate Desktop HMR, preserve arbitrary React
  state, or add a Save format/migration framework.
- `docs/engine/proposals/scale-scene-object-and-modular-gui.md` and
  `docs/engine/plans/2026-08-24-scale-scene-object-modular-gui.md` — the accepted
  target contract and completed execution plan. M0 scale characterization,
  M1 static content/runtime/authoring separation, M2 sparse State hot plans plus
  incremental authoring indexing, M3 modular GUI composition, M4's first
  Authoring Scene hierarchy/compiler, and M5's Inspector-first clean replacement
  are delivered. M0–M5 own scale
  evidence, content/runtime separation, sparse State
  hot plans, incremental authoring indexing, GUI module boundaries, the first
  Authoring Scene object hierarchy, and the Inspector-first clean replacement of
  the old Studio shell. External
  experiment repositories remain pressure sources only and never become source,
  fixture, dependency, naming, or validation authority.
- `docs/engine/proposals/scalable-authoring-addressable-runtime-and-mods.md` and
  `docs/engine/plans/2026-08-25-scalable-authoring-addressable-runtime-and-mods.md`
  — the accepted target contract and completed execution plan. Its order was
  M0 capacity-contract reset; M1 orthogonal GUI composition plus build-known
  Code Surfaces; M2 addressable Scene/Narrative/GUI/code/content units; M3
  Runtime Inspector facets; M4 locale-addressable i18n; and M5 a private,
  build-known, application-local Mod Runtime. M0–M5 delivered and closed on
  2026-08-25. M2 added type-specific lease-owned
  Scene, Narrative, GUI and text units, reused literal Code Surface loaders plus
  Asset Registry, and connected one application-owned Web readiness/execution-
  context seam. Engine Lab proves opening/drill/query-only GUI chunk separation
  without a universal loader, LRU, prefetcher or Worker pool. Its synchronous
  replay and Web text consumers conservatively retain visited/prepared units
  until application-generation disposal; current-only eviction is not claimed.
  M3 added an application-owned read-only Runtime Inspector projection, lazy
  snapshot materialization when no Inspector subscribes, O(1) per-pack Web Text
  observation, detached standalone summaries, embedded committed-current
  observation, and explicit Code Surface source/layout/policy/lifecycle facets.
  Inspector selection does not load units or own leases/plans; no DOM/module
  inventory, profiler, same-realm sandbox, or cross-realm coordinator was added.
  M4 extended the existing Text manifest/session with default locale, explicit
  fallback topology, V2 locale variants, per-ID fallback, and atomic latest-wins
  activation while retaining only demanded packs' active chains. M5 added the
  package-private `./internal/mod-runtime`: it cold-compiles a build-known,
  generation-immutable active set through application-owned typed extension
  points, reuses Direct lifecycle/rollback, and leaves identity projection to the
  application. Products that do not select it structurally exclude it.
  It uses small original/generated
  conformance and existing raw benchmarks. Large third-party components, fake
  Agent conversation, commercial content, and SillyOS are post-lane product
  validation rather than fixtures. Public Mod resolver/ABI/SDK/distribution,
  post-release arbitrary code, an untrusted-code sandbox, and Desktop HMR remain
  inactive.
- `docs/engine/design/game-viewport-and-ui-shell.md` and
  `docs/engine/plans/2026-08-25-adaptive-viewport-layout-variants.md` — the
  accepted target contract and completed execution plan. M0–M2 delivered on
  2026-08-25: it adds
  `expand-height` / `expand-width`, finite ordered container-size layout
  variants, one authored Stage rect inside the live logical canvas, and neutral
  Browser geometry/Stage-hit evidence. The authored rect fixes only the Stage
  origin; shell UI remains CSS-pixel layout over the complete live canvas.
  Viewport choice remains presentation data and never enters State, Save,
  replay, BuildIdentity, or application generation. It does not activate
  continuous Input, a renderer/asset/device framework, Desktop HMR, or a final
  editor/Blueprint format. No next engine lane is automatically active; select
  one complete Reference Product explicitly.
- The plans and proposals dated 2026-08-19 through 2026-08-22 own the detailed
  acceptance and closure evidence for the six engine-gap lanes summarized
  above. The authoritative hold clock lane
  (accepted 2026-08-19) delivered M0–M3 the same day:
  `docs/engine/proposals/authoritative-hold-clock.md` and
  `docs/engine/plans/2026-08-19-authoritative-hold-clock.md` (new `hold`
  pending interaction driven by elapsed milliseconds — originally the
  `hold_tick` verb, since unified into `TimeTickV1`; `pause`/`resume`
  merged into `hold` and deleted; `tickQuantumMs` partial commits and
  batch-invariant threshold-crossing tick effects/frame swaps). The
  declared-condition reroute lane (hold `when`, owner-ordered and
  delivered 2026-08-21) completed M0–M2 the same day:
  `docs/engine/proposals/hold-when.md` (with the closure record) and
  `docs/engine/plans/2026-08-21-hold-when.md` — ordered `when` arms on
  `hold` nodes evaluated as occurrence-timeline cuts (t=0 plus after each
  of the hold's own tick/frame crossings; first match truncates, batch
  invariant, entry-time evaluation, skip cannot pass the catch) via the
  base `settleHoldTimelineV1` stepping helper, with template-kit arms,
  both Engine Lab granularities (tick-driven same-instant, monitor-driven
  next-settlement t=0), and the experiment repo's night-room mid-bar
  wake/disgust cut as the first live abort path. The second abort-path
  candidate (alert catch) was decode-falsified 2026-08-22 (experiment
  repo knife #339: CE249 asks after the window / WAIT 100; CE277 does
  not write alert; hanging `when` would skip `V354++` or the 100f
  wait). The input-axis defer was claimed and closed by the
  mid-hold-input lane. The
  parallel-monitors lane (accepted and
  delivered 2026-08-20) completed M0–M5 the same day:
  `docs/engine/plans/2026-08-20-parallel-monitors.md` with its contract in
  `docs/engine/proposals/parallel-monitors.md` — the single session-level
  time verb `TimeTickV1` replacing `hold_tick`, domain events + reducers
  replacing the registered-effect command family, authoritative monitors V1
  (declaration + accumulator + settlement), persistence safepoints /
  in-flight spans with autosave inhibit (engine capability first; the
  persistence orchestrator is the internal consumer), and the monitor pacing
  loop (`pace` hints, session time reporter, realtime rate pin) with the
  Engine Lab drill consuming all three monitor archetypes. Every milestone
  was independently reviewed before commit. The authorable-frame-set lane
  (accepted and delivered 2026-08-21) completed M0–M3 the same day:
  `docs/engine/plans/2026-08-21-authorable-frame-set.md` with its contract
  in `docs/engine/proposals/authorable-frame-set.md` — the stepped `frame`
  motion channel (no easing, sampled `frameIndex`), content-declared
  `frameAssetIds` frame tables delivered by the stage host to entry
  renderers over the existing one-shot and ambient bindings, Workbench
  frame-track editing, and consumers in the Engine Lab, the starter
  template (scene-document-declared blink), and the external experiment
  repo. The only explicit defer is the cross-document frame-index-vs-table
  story lint, gated on content declarations becoming data. The shaped-hit-regions lane
  (accepted and delivered 2026-08-21) completed M0–M5 the same day:
  `docs/engine/plans/2026-08-21-shaped-hit-regions.md` with its contract in
  `docs/engine/proposals/shaped-hit-regions.md` — `polygonPoints` +
  `hoverAssetId` on hit regions with clip-path hits and hover/focus reveal
  through the stage `assets` port, the `sillymaker.regions` document family
  with `app check` lints and dev-server CAS ports, the Studio Regions
  workspace editing against the real host rendering, the `app regions
  trace` bitmap-to-polygon devtool (sub-byte palette PNGs first-class), and
  both consumers (the Engine Lab crate collection port in-repo; the external
  experiment repo's three-pose night-bed body zones, where the vendor
  judgment art proved to be fully opaque 1-bit rectangles and the
  rect-intersect-silhouette refinement is a recorded native improvement).
  The explicit defer is the multi-region activation payload for overlapping
  regions (topmost-wins is the V1 contract), gated on an audited real
  consumer. The mid-hold-input lane (accepted and delivered 2026-08-22)
  completed M0–M1 the same day:
  `docs/engine/proposals/mid-hold-input.md` (with the closure record) and
  `docs/engine/plans/2026-08-22-mid-hold-input.md` — claiming hold `when`'s
  input-axis defer with zero new engine primitives (the session never gated
  ordinary commands while a hold is pending; the lane pinned the
  composition: hit-region activation routes to an
  `expectedHoldOccurrenceId`-fenced ordinary write command, and the hold's
  own `when` arms read the write at the next fenced settlement's t=0), with
  the Engine Lab input-granularity conformance (fenced write command +
  tripwire arm; batch-invariance, stale-fence whole rejection, and mid-hold
  save/load locks) and the experiment repo's CE18 mid-bar kiss zone as the
  live path (decode-verified: original zone clicks are concurrent state
  writers and the reroute authority stays with the CE20 watchdog arms).
  Regions never gain routing power; input commands never settle time;
  remaining body zones are per-zone content knives, not engine work. The
  authorable-chrome-layout lane (accepted and delivered 2026-08-22,
  owner-ruled pragmatic V1 with open questions q1–q3 per recommendation —
  explicitly not the final scene/object/interaction unification) completed
  M0–M2 plus both consumers the same day:
  `docs/engine/proposals/authorable-chrome-layout.md` (with the closure
  record) and `docs/engine/plans/2026-08-22-authorable-chrome-layout.md` —
  the `sillymaker.chrome-layout` document family (boxes/anchors/offsets in
  logical canvas space) mirroring the regions family end to end
  (admission, authoring index, `app check` lints, dev-server CAS port),
  the Studio Chrome workspace (界面布局: drag/resize boxes and anchors,
  offsets inspector, shared authoring session with CAS graduation)
  rendering Story-declared chrome fixtures (`StudioBindingV1.chrome`,
  crash-isolated real components) with a wireframe fallback, and dual
  consumers (the template HUD status strip reads its placement from
  `src/chrome/hud.chrome-layout.json` at runtime with browser acceptance;
  the external experiment repo HUD migrated off its M0 story-local parser
  onto the engine family). The M3 intent-binding widget layer stays behind
  its own evidence gate. Layout documents stay zero-authority
  presentation data; behavior booleans and legality stay in Story code.
- `docs/engine/plans/2026-07-30-desktop-persistence-durability.md`,
  `docs/engine/plans/2026-07-30-snapshot-commit-performance.md`,
  `docs/engine/plans/2026-07-30-save-migration.md`,
  `docs/engine/plans/2026-07-30-surface-contract-harness.md`,
  `docs/engine/plans/2026-07-31-authoritative-determinism-guardrails.md`,
  `docs/engine/plans/2026-08-13-authorable-motion-workbench.md`, and
  `docs/engine/plans/2026-08-14-vn-scene-workspace.md` —
  focused contracts and completed evidence. Only the production-floor sequence
  owns current/next order; do not infer that list order or a historical pointer
  makes the conditional Desktop lane a core blocker.
- `docs/engine/plans/2026-07-19-sillymaker-vnext-foundations.md` and
  `docs/engine/plans/2026-07-28-sillymaker-r5-r7.md` — completed execution
  records whose defer/acceptance notes remain useful historical evidence;
  `docs/engine/roadmap-archive.md` — archived delivery history and completed
  milestone text.
- `docs/engine/architecture.md` — current package and runtime architecture.
- `docs/engine/features.md` — implemented engine capabilities and boundaries.
- `docs/engine/development.md` — setup, tests, and maintenance workflow.
- `docs/engine/story-authoring.md` — current Story composition model.
- `docs/engine/authoring-quickstart.md` — layered authoring playbook (content
  edits, module wiring, application declarations) with the diagnostics
  quick-reference. Story-directory agents also read the per-directory handbooks:
  `e2e/AGENTS.md`, `examples/AGENTS.md`, `template/AGENTS.md`.
- `docs/engine/build-and-release.md` — local Player build and Artifact workflow.
- `docs/game/README.md` — game design notes (historical Project Tavern status;
  new gameplay design also lands here).
- `website/**` — the public documentation site (VitePress, en + zh); internal
  plans/research/proposals stay under `docs/` and are not published.
- `docs/policies/licensing.md` and `docs/policies/assets-and-references.md` —
  project licensing and asset-use policy.
- Root legal files (`LICENSE.md`, `NOTICE`, `TRADEMARKS.md`) — controlling
  project legal scope.

The roadmap and design documents describe accepted direction; they do not make a
feature implemented. `architecture.md`, `features.md`, `story-authoring.md`,
`development.md`, and `build-and-release.md` describe the live implementation
and must be updated as each planned capability lands. Design owns the intended
contract, while the active plan owns task order and acceptance; a task must not
silently override a design decision.

The public Mod design remains incubation. The completed 2026-08-25 plan delivered
only a private, build-known, application-local runtime after its addressable
content and Code Surface prerequisites. Do not start a public resolver/ABI, external
SDK, distribution system, post-release arbitrary-code path, or untrusted-code
sandbox until the roadmap's separate activation gates are explicitly satisfied
and another active plan is accepted.

## Architecture baseline

- `@sillymaker/base` owns generic contracts, Story authoring primitives,
  deterministic runtime state, sessions, persistence orchestration, replay, and
  diagnostics. It also owns the static `sillymaker.gui-composition` document and
  once-only strict boundary admission; GUI documents/props are presentation
  content and never enter State, Save, digest, or replay. Base has no React,
  DOM, browser-storage, or game-specific dependency.
- `@sillymaker/composition` owns cold-path trusted profile composition. Compile
  services and registries into direct plans before hot execution;
  authoritative profiles seal after mount, while a live candidate requires an
  explicit consumer publication acknowledgement. Live effects are installed
  before that acknowledgement and therefore must be staging-safe. Do not add
  dynamic lifecycle lookup to command/render paths. AR1 selected the private
  SillyMaker-owned Direct extension backend after Direct and a
  Cordis-core-derived adapter both passed the same 17-case neutral suite; only
  Direct remains. It must stay structurally excludable from products that
  direct-mount their domains, keep backend/Context types out of domain and public
  contracts, exclude Node HMR, and leave SillyMaker publication/State authority
  unchanged. Its private Mod runtime admits identity for build-known data/code
  sources, loads and cold-compiles only the selected generation-immutable set
  through application-owned extension points, and then mounts the resulting
  contributions through Direct. It owns no resolver, SDK, digest, State, Save,
  hot-install API, or same-realm sandbox. A domain or local binding may still be required by a product;
  lifecycle composition does not imply product optionality.
- `@sillymaker/state` is an experimental neutral façade for authoritative
  transactional State, not a generic React/UI store. It must reuse exactly one
  Base Session and transaction runner; it never owns a second State, digest,
  Save, replay, queue, or CommandLog authority. Production Story migration
  remains evidence-gated.
- `@sillymaker/agent` is an experimental workspace-private GUI/RPC seam. Its only
  package entry is `./internal`; it owns the transport-neutral client, bounded
  cross-process admission, Agent GUI/session lifecycle, immutable
  `UiArtifact` revisions, admitted `UiIntent`, and a closed React renderer. The
  deterministic fake uses the same client port as a future transport. It is not
  a public Agent ABI, provider SDK, OpenUI/A2UI adapter, persistence owner, tool
  executor, or external-effect authority. Ordinary Template/Engine Lab Player
  graphs exclude it. AR5's neutral single-companion split and generated negative
  measurement also prove that a complete Authoring final graph excludes Agent/RPC;
  Engine Lab's Inspector binding selects the private single Agent companion only
  through its explicit opt-in entry, not as an Inspector or final-graph requirement
  and not as a public ABI.
- `@sillymaker/ui` owns reusable React presentation, input, interaction,
  overlays, diagnostics UI, assets, characters, stages, and semantic-publication
  bridges. Its focused `./code-surface` entry cold-compiles build-known literal
  loaders, once-admitted props, parent slots, and minimal authoring metadata into
  direct React plans with lazy children and node-local fault boundaries. The
  root entry does not re-export that optional path. Same-realm components are
  trusted application code; policy metadata guides cooperation and inspection,
  not DOM/network/listener/main-thread sandboxing.
- `@sillymaker/web` owns browser hosting, Browser/Deno Desktop admitted GUI
  bootstrap and startup readiness, IndexedDB persistence adapters, mounting,
  routing, capabilities, automation, pointer input, and the optional development
  rebootstrap helper. Engine Lab's Vite development entry is the maintained R2
  conformance boundary; it admits simulation/presentation identity changes at
  the composition owner while preserving the sibling Authoring Host. Vite React
  Fast Refresh remains available to boundary-safe application UI modules, and
  refresh-ineligible or equal-R2 application changes request R3 full-page reload.
  Ordinary static builds do not install this development boundary.
- Story packages at the repository top level own game-specific state, rules,
  content, projections, application composition, and Story tooling: `e2e/` (the
  neutral Engine Lab conformance Story), `template/` (the minimal starter), and
  `examples/*` (curated showcases). `project.config.ts` at the root only lists
  application directories; each self-contained application
  (`sillymaker.config.ts` + `vite.config.ts`) registers only itself.
- Workspace packages consume one another through declared package exports and
  `workspace:*` dependencies, not another package's `src/**` path.

The current authoritative flow is:

```text
Story definition -> resolved GameSimulation -> GameSession/GameSnapshot
  -> GameQueries -> SemanticPublication -> RuntimePresentationPublication -> renderer
```

One session owns authoritative state and serializes authoritative operations. UI
and automation use semantic/application ports rather than direct State setters.
Browser storage persists versioned plain data; it is not the live simulation
database.

This baseline describes the implementation, not an immutable constitution.
Architectural changes are welcome when they preserve clear ownership,
deterministic behavior where required, atomic failure semantics, and a
documented migration path.

## Development workflow

- The public compatibility floor is Deno >= 2.9.0 (the runtime and package
  manager; npm dependencies resolve through Deno's Node compatibility).
  Maintained development, required CI, and Desktop promotion run on the latest
  stable Deno available at execution time. Do not pin one exact patch, require
  the floor as a second per-PR lane, or require a browser revision, machine
  attestation, or shell layout. Node compatibility supports dependencies; it
  does not make Node.js a SillyMaker product Host target.
- Install with `deno install`. Start a product from its own directory with
  `deno run dev`; the repository root intentionally has no default application.
  Use `deno task app dev <application-id>` only when an explicit root-level
  selector is useful. `deno task check` is the canonical local code-quality
  and product-behavior check.
- Use `deno task test` for automated product/engine tests, `deno task test:e2e`
  when browser behavior is affected, and the commands documented in
  `docs/engine/build-and-release.md` for Player builds.
- Playwright specs use the repository test fixture so browser tests stay silent
  by default while exercising the real audio lifecycle. Opt into audible output
  only for a test whose observable contract requires it.
- At the close of a slice that changes React/TSX behavior, run
  `deno task audit:react --base <slice-start-ref>` with the exact recorded base.
  The on-demand React Doctor scan is an advisory audit outside `deno task check`:
  classify each new finding as confirmed, rejected, or needs-evidence; repair
  confirmed behavior/currentness defects with focused tests, but do not chase a
  score or mechanically rewrite ordered cleanup and deliberate ownership. A
  full scan belongs to a resolved React Doctor version or baseline refresh.
- Keep ESM, TypeScript project references, explicit `.ts`/`.tsx` import
  extensions, exact dependency versions, and the shared `deno.lock` unless an
  intentional tooling change updates them.
- Tests should protect observable engine behavior, game rules, public data
  formats, compatibility promises, or real user flows. Do not protect a plan
  phase, task commit, implementation shape, evidence scaffold, exact source
  text, complete DOM identity inventory, repository file inventory, command
  order, checkout layout, clean Git tree, or machine/process attestation unless
  a reproduced failure or an actual security boundary requires the narrow check.
- Milestone characterization, A/B, and promotion harnesses are temporary
  evidence by default and should be deleted after the decision. Keep one only
  when it has a clear continuing use, and then shrink it into a general-purpose
  maintained tool. A benchmark reports stable raw measurements; it does not
  decide promotion unless an accepted, continuing product budget supplies the
  threshold.
- Do not remove an accepted independent-engine capability only because this
  repository lacks a current consumer: also consider the accepted contract,
  orthogonality, ownership, and maintainable semantics. Experimental scaffolds,
  historical compatibility paths, and superseded implementations are not such
  capabilities. When one contract replaces another, remove the old
  implementation, export, dedicated tests, and live documentation together;
  compatibility requires an explicit product promise rather than a default
  alias or wrapper.
- The maintained dev-only author product is the standalone/embedded Inspector
  over one Authoring Host and Authoring Scene CAS/session. Do not restore the old
  Studio route, five-workspace rail, `StudioBindingV1`, or UI compatibility
  wrappers. This clean break does not authorize deleting reusable accepted
  capabilities such as low-level Scene source IO, Narrative Flow types/projector,
  Motion Workbench, Regions/Chrome document families, structured operations,
  CAS/R1 publication, or the private Agent companion seam merely because the
  current Inspector does not surface them.
- Apply defensive validation in proportion to the trust boundary:
  - bytes, files, URLs, HTTP payloads, Save data, cross-process records, and
    other untrusted input keep strict bounds, canonical validation, atomic
    failure, and stable diagnostics;
  - public Story/authoring input is validated and normalized once at admission,
    then consumed as ordinary typed data. Strictly parsed JSON receives one
    schema/value admission; parser, admission, and consumers must not repeat
    object-authenticity or descriptor defenses;
  - package-internal collaborators are trusted TypeScript construction. Do not
    add WeakMap authenticity brands, exact-claimant tokens, repeated descriptor
    admission, captured language intrinsics, or Proxy/monkey-patch defenses for
    them unless a real stale/ABA, cross-owner, public-boundary, or reproduced bug
    requires it.
- Use identity tokens and WeakMap proofs for concrete ownership/currentness
  problems, not as a default object model. Exact checks remain appropriate for
  real untrusted input, Save/wire formats, digests, CAS, generation/currentness,
  and other observable identity contracts. Preserve generation fencing, CAS,
  single authority, atomic commit, and deterministic replay where those are
  observable product invariants.
- Runtime Snapshot, bootstrap, command, evidence, plan, and semantic projection
  values follow ordinary JavaScript semantics. `DeepReadonly` is the supported
  TypeScript contract; do not recursively freeze engine-owned trees or build a
  custom immutability runtime. Deliberate casts, mutation, Proxy tricks, or
  monkey-patching of trusted values are unsupported and outside the threat
  model. This does not relax schema/digest/Save/replay/CAS/generation/RPC
  boundaries. Cold authoring definitions and resolved graphs may remain sealed
  where that preserves validated registration/digest identity; this is not a
  general runtime immutability policy.
- Product-selected React/npm/TypeScript code running in the application realm is
  trusted code, not an engine threat model. Guide it to use scoped CSS, React
  cleanup, typed ports, short main-thread tasks, and explicit resource owners;
  do not add listener/network/`document.body` interception, Proxy or descriptor
  authentication, mandatory Shadow DOM, or a fake side-effect sandbox. A real
  untrusted-code requirement needs a separately accepted iframe/Worker/process
  isolation boundary.
- Do not infer that a component needs Worker/iframe/process isolation from its
  size, package origin, or third-party status. Event-loop, heap, and startup
  changes require raw benchmark/profiler evidence and confirmation in a real
  product; split main-thread work first, and add a new boundary only when the
  measured behavior requires one.
- Compile cold configuration and registries into direct plans before hot
  execution. Command, reducer, selector, input, and render paths trust those
  plans and do not repeat schema admission, redundant whole-tree traversal,
  dynamic service/registry lookup, or platform branching; retain only work
  required by observable Snapshot/digest/Save/CAS/generation contracts.
- Add a Host/platform seam only when a platform difference changes an
  engine/application-observable result. Keep API-shape adaptation inside the
  owning Host, leave watcher/module-graph/HMR mechanics to Vite/Deno/React, and
  let SillyMaker own only the admitted application response.
- Treat the delivered authoritative-determinism checker as scope-frozen. Do not
  extend syntax proofs, diagnostic precedence, or hypothetical capability
  escapes unless authoritative code exposes a reproducible false negative or
  false positive. A concrete regression may justify the smallest correction;
  completeness alone does not.
- Treat the source-level BuildIdentity import-closure collector as a
  scope-frozen transitional owner for the Engine Lab and Cat Cafe only. Do not
  add resolver heuristics or attach it to products that do not consume an
  admitted R2 boundary. Replacing it requires one actual Host-graph owner plus
  an explicit identity/Save transition; ordinary applications use explicit
  authoritative seeds and normal Vite propagation. Likewise, do not grow the
  retained `/assets/**` adapter with MIME override registries, symlink
  attestation, or another static-file framework; a future `publicDir` migration
  must first preserve the importable authoring-content contract.
- Stop an implementation goal for unresolved public/wire compatibility,
  Save/digest/replay semantics, authority/atomicity, an actual security boundary,
  conflicting real consumers, or a measured production-performance failure. Private
  helper shape, diagnostic precedence, test decomposition, and equally safe
  internal designs are implementation choices; choose the simplest fail-fast
  option and continue.
- Prefer focused tests near the changed behavior, then run the relevant broader
  command. Regenerate a fixture only when it represents a maintained product
  format or user-visible compatibility contract.
- Keep implementation files focused and public interfaces explicit. Source file
  names are kebab-case only (no PascalCase/camelCase files: macOS and Windows
  default to case-insensitive filesystems and mixed-case renames corrupt Git
  state). Use serializable project randomness in deterministic gameplay paths;
  avoid `Math.random()` there.
- Update the active technical documentation when package roles, public exports,
  state ownership, persistence, Story authoring, build output, or supported
  workflows change. Keep active execution plans focused on current/next work,
  dependencies, acceptance, and stop conditions; move completed delivery detail
  to an archive. Use at most two slice-numbering levels and at most one
  docs-only entry before implementation rather than recursively adjudicating
  every internal choice.

## Product and Story work

- The first Tavern PoC application is retired (branch
  `archive/poc-v1-stage-2026-07`); the Engine Lab conformance Story is an engine
  rig, not gameplay guidance.
- New gameplay design belongs in active documents under `docs/game/`; do not
  reactivate archived PoC specifications by editing them in place.
- Story state should remain plain, versioned, validated data. Commands must
  either commit a complete valid result or leave authoritative state unchanged.
- Presentation code renders immutable projections and sends semantic intents. It
  does not become a second gameplay-state authority.
- A future typed in-memory state store is an open design option described in
  `docs/engine/proposals/typed-state-store.md`, not a required migration or
  accepted API.

## Licensing and third-party-code boundaries

- Copyright holder: `Jun Jiang (jasl)`.
- The whole repository — engine packages, Story packages (e2e, template,
  examples including the cat-cafe), scripts, configuration, and documentation —
  is MIT. Project-owned media assets (`examples/*/assets/**`,
  `art-source/**`) are dedicated to the public domain under CC0 1.0 (commercial
  use, derivatives, and redistribution unrestricted). `LICENSE.md` controls.
- Do not add copied or adapted third-party material without first agreeing the
  dependency, license, and required notices with the owner. Compatible material
  must follow its license and preserve required notices. Commercial material or
  code with incompatible terms must be reimplemented clean-room: a spec/test
  author may document public behavior, while the implementer works only from
  that independent specification and must not inspect the incompatible source.
- Do not create a source-history/provenance file, catalog, register, registry,
  database, architecture subsystem, or enforcement harness. Do not recursively
  scan dependency, vendor, build, model, or data trees to populate one. Use the
  ordinary project licenses, SPDX identifiers, package manifests, shared lockfile,
  and release process instead.
- `references/` is ignored, untracked research input. Production code, tests,
  fixtures, generators, builds, and artifacts must not depend on it.
- Media working archives and promoted runtime assets follow
  `docs/policies/assets-and-references.md`. Runtime digests establish technical
  identity only.
- Contributions are accepted inbound=outbound MIT (media assets CC0).

## Generated and local files

Do not commit dependency directories, build output, coverage, local saves,
diagnostics, generated exports, secrets, ignored references, editor-local state,
or disposable calibration data. Extend `.gitignore` when new tools create
persistent local output.
