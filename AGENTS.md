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
boundaries; they are not in-process plugins. The maintained flagship product is
**One Last Sound Check** (`examples/vn-last-sound-check`). Bookshop retired in
the explicit post-completion review; it is historical evidence rather than a
second maintained authoring path. The maintained product examples are SillyOS
and One Last Sound Check.
Cat Cafe, the stopped Electronic Pet Reference Product, and
the retired Project Tavern PoC live only as historical evidence. The active
work may redesign gameplay, engine APIs, application hosting, state management,
presentation, and authoring workflows.

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
  PF6 remains evidence-gated and inactive. The most recently completed focused lane is
  `docs/engine/plans/2026-08-30-agent-session-asynchronous-connection-loss.md`:
  the owner explicitly activated and closed the handback review's sole neutral
  lifecycle candidate. Public `AgentSessionConnectionV1` now exposes a one-shot
  `whenClosed`; the client observes it before ready, owns exact generation/status
  fencing, preserves accepted Run identity for an explicit successor, and joins
  async cleanup into disposal. SillyOS removed its Browser Pi transport-private
  loss callback and consumes the public `/connection` snapshot before applying
  product recovery. This does not expose close reasons, synthesize Run terminal,
  auto-reconnect, or promote Worker, Pi, Provider, credential, Workspace, or
  product recovery policy. The preceding completed lane is
  `docs/engine/plans/2026-08-30-sillyos-neutral-engine-handback.md`: it
  promoted only the transport/provider-neutral Session/Run
  client and connector to public `@sillymaker/agent/session`; raw request/wire,
  Agent Host, UiArtifact and deterministic fake remain private. SillyOS has
  completed its downstream connector migration without widening that public
  contract. The post-closure clarification rejects the current arbitrary
  96-message/aggregate transcript
  ceiling, requires a pageable single-active rich Conversation projection, and
  defines Browser local Agent execution as interruptible with stale fencing and
  recovery from the last still-readable, admitted durable semantic checkpoint,
  or an explicit unrecoverable state when that evidence is unavailable. Those
  are SillyOS product requirements and evidence gates, not newly delivered
  Engine APIs. The downstream review's asynchronous post-ready connection-loss
  candidate was subsequently activated and closed by the focused lane above;
  the remaining downstream candidates stay inactive.
  The preceding completed lane is
  `docs/engine/plans/2026-08-29-production-mod-v1.md`: it promoted the selected
  build-time trusted Mod contract to public `@sillymaker/composition/mod`, kept
  the private Direct lifecycle behind that boundary, added real staged package
  Artifacts plus a repository-external Deno/Vite/Chromium consumer, and made One
  Last Sound Check the first product-specific post-release declarative text/image
  Mod consumer through an explicitly separate build. It does not provide package
  discovery, runtime npm resolution, a marketplace, arbitrary post-release code,
  a same-realm sandbox, or a public authoritative-gameplay R2 adapter. Failures
  before R2 retirement begins retain the live predecessor. Once R2 disposal
  begins, a release failure is terminal; after a successful release, a Web
  successor failure retains an exact retryable handoff and controller selection,
  not a still-live old application. No Template change was justified because the starter remains a
  complete structural negative control. The preceding completed lane is
  `docs/engine/plans/2026-08-29-vn-genre-mod-authoring.md`: it extracted a
  focused first-party VN interaction/compiler/runtime layer shared by Template
  and One Last Sound Check; made History the first real optional presentation
  Mod with development lazy load/unload, R1 successor publication and
  production structural exclusion; and placed a real read-only VN Inspector
  contribution beside the structured Scene operation/CAS authority shared by
  humans and Agents without adding a Narrative/Text writer. A product may
  explicitly include the supported extension surface in
  production, but that closure did not activate a public resolver/ABI/SDK,
  distribution system, post-release arbitrary-code install path, or Ren'Py
  DSL/runtime clone. The completed
  `docs/engine/plans/2026-08-30-stage-close.md` then reconciled current docs,
  fixed the verified VN/History/Inspector/Narrative cleanup findings, ran a
  pinned React Doctor review plus full repository/VN validation, and found no
  remaining blocker or Template feedback. It activated no new capability or
  successor lane. The preceding
  completed historical product lane is
  `docs/engine/plans/2026-08-27-vn-reference-tour.md`: the original compact VN
  **One Last Sound Check**, which starts from the tracked
  Template and demonstrates the current recommended VN authoring and Player
  path without becoming an
  all-engine API gallery or a Ren'Py DSL. M0–M1 have delivered the independent
  WIP package, frozen product denominator, supported-export boundary, clean
  deletion of unselected starter domains, complete two-route script, two
  Authoring Scenes, author data, and named headless route simulations. M2 has
  delivered and closed the engine-maintained focused
  first-party VN preset (now selected through `@sillymaker/vn`), flush-bottom responsive
  dialogue/choice chrome, say-only full-canvas pointer advance,
  History/playback controls, Ctrl/Tab/H/V plus middle-button hide/restore,
  portrait layout, final Stage media and ending surface, the frozen eight-asset
  audio denominator, current-voice replay, voice-aware Auto, and
  interaction-level Back/Forward over Core's single bounded Snapshot timeline.
  Chromium/WebKit/mobile evidence covers 360×640 through 1280×720, a 200%-zoom
  reflow proxy, pointer/touch/keyboard focus, reduced motion, accessibility, and
  Chinese/English overflow; a participant also characterized the product in
  Chrome at literal 200% zoom. M3 delivered boot-time autosave resume,
  return-to-title/Continue, the default VN system menu and Save surfaces,
  persistent Player settings with live locale, and a layered recovery matrix
  for exact awaitable close plus already-durable Browser reload/forced-close
  state. Browser `pagehide` remains a synchronous fence with best-effort async
  flush and does not promise last-moment IndexedDB durability. M4 delivered a
  package-private Visual ambient-binding operation, one real Agent
  Inspector/CAS handoff, and workstation Browser/build/static-Desktop/
  accessibility/silent-run/raw-performance evidence. The
  2026-08-29 core/optional correction also split the focused Narrative Player
  core from its explicitly selected History renderer/CSS, added a neutral
  private Mod selection-successor contract, and kept the compact VN free of a
  synthetic tooling-Mod consumer. Development now keeps only one small movable
  launcher resident; the complete DevDock menu/window host, each selected
  state-tool body, and Embedded Authoring load only after their own explicit
  interaction, while the production graph excludes DevDock, Inspector/source
  writers, tooling, and the private Mod runtime. The private controller and
  DevDock publication remain separately proved substrate rather than an
  end-to-end product hot-plug system; at that checkpoint History was only
  statically optional. The completed VN Genre Mod lane delivered the first real
  end-to-end History selection consumer.
  A real authoritative Mod remains an R2 consumer for a later product rather
  than a fabricated VN route. The owner-authorized Computer Use-assisted
  participant handoff is complete. M4's independent review found that the
  historical 59-unique / 44-per-route script met its count but not the frozen
  10–14 minute reading denominator; the current candidate therefore carries
  110 unique visible entries / 82 per route with minimum-viewport pagination.
  The independent engine review and Starter-feedback classification are
  complete: the private-import leak in product E2E was removed, no neutral
  engine gap remains, and no additional Template change is justified. The
  independent product re-review has also passed without a product-integrity
  blocker. On 2026-08-29 the owner removed representative real current-low-end
  qualification from this product's completion gates because no suitable device
  was available. That qualification was not run or passed and the flagship makes
  no corresponding low-end support claim. M4 therefore closed on the accepted
  reduced evidence scope. M5 then completed the atomic current-doc,
  workspace/build/deploy and product-metadata cutover, making One Last Sound
  Check the maintained flagship without claiming a live remote deployment.
  Cat Cafe terminated on 2026-08-27 before this lane began; its application,
  revision-1 Save support, product E2E, and live release responsibility ended
  together, without a cross-product migration. The later explicit
  post-completion review retired Bookshop and selected One Last Sound Check as
  the sole maintained VN product reference. The
  preceding Electronic Pet lane stopped incomplete on 2026-08-27: M0–M2 and the
  committed M3 slices remain historical evidence, the remaining denominator
  will not be delivered, and its additional WIP is preserved only on
  `codex/archive-electronic-pet-m3-wip`. The preceding
  `docs/engine/plans/2026-08-26-neutral-gui-host-readiness-close-companion.md`
  delivered and closed M0–M2 on 2026-08-26. The recap below runs oldest to
  newest.
  Two lanes delivered on 2026-08-15:
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
  authorable-chrome-layout lane delivered M0–M2 and both consumers on
  2026-08-22, then closed its evidence-gated intent/committed-progress M3 on
  2026-08-29; its detailed closure record appears below. After absorbing those
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
  2026-08-22: the Agent implementation initially entered only through workspace-private
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
  module/source structural exclusion is proved. The completed 2026-08-30 handback
  lane later promoted only the semantic Session/Run client/connector at
  `@sillymaker/agent/session`; Host/UiArtifact/fake remain private and SillyOS has
  since completed its product-owned downstream migration. AR5 Browser physical evidence is
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
  Desktop HMR activation. That independent follow-up closed on 2026-08-28 after
  Deno 2.9.6 stable passed release-source, neutral-contract, native same-window
  HMR/private-route, and normal-close revalidation. The maintained entry is
  `deno task app desktop-dev <application-id>`; the adapter remains
  package-private and ordinary-path default-off. This activates only the Desktop
  development workflow, not Desktop authoring R0–R2, persistence, packaging,
  signing, crash durability, or multi-platform production qualification.
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
  a real backend or transport, public Agent product/Host/UiArtifact ABI,
  OpenUI/A2UI, Agent persistence,
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
  fake vertical slice. The later focused public Agent Session/Run contract does
  not activate a public Agent Host/UiArtifact product ABI, Cordis API, real RPC
  backend/protocol, OpenUI/A2UI adapter, Agent persistence, Effect
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
  validation rather than fixtures. At that 2026-08-25 checkpoint public Mod
  resolver/ABI/SDK/distribution, post-release arbitrary code, an untrusted-code
  sandbox, and Desktop HMR remained inactive; Production Mod V1 later promoted
  only the focused trusted build-time runtime and product-specific declarative
  text/image subset described above.
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
  editor/Blueprint format. A later 2026-08-29 correction added an opt-in
  `landscape-only` content policy inside the same GameViewport authority:
  portrait containers use swapped effective geometry plus one 90° canvas
  compensation, physical landscape removes it without rebuilding the
  application, logical safe-area tokens rotate with the content, and Stage UI
  reflows from its size container. This is presentation fallback rather than an
  OS orientation-lock promise. The owner then selected and completed
  `docs/engine/plans/2026-08-25-cards-reference-application.md` on 2026-08-25.
  Cards delivers the complete PocketJS Cards 0.6.0 denominator, Browser/Deno
  target uplift, the first neutral GUI-only startup consumer, public GUI
  Composition/Code Surface use, raw product budgets, independent closure, and
  Starter feedback. Its narrow engine corrections added curated focused exports,
  once-admitted GUI-only config, neutral Host landmarks, and first-presentation
  recovery evidence. It did not activate a source-migration framework, project
  symbol graph, Prefab, scaffold CLI, Desktop HMR, or another Reference Product.
  On 2026-08-26 the standalone Cards product retired after its reusable GUI-only
  startup/final-graph proof moved to a small tooling conformance fixture and its
  visible GUI Composition/Input role moved to the website console. The historical
  closure and raw product evidence remain valid; Cards is no longer a workspace
  application, published route, or maintained example. No next engine lane or
  Reference Product is automatically active.
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
  onto the engine family). The M3 intent-binding widget layer passed its
  evidence gate and was delivered 2026-08-29 (the external golden-baseline
  audit supplied both real consumers: a choice-over-hold timed-menu button
  group and a hold-progress HUD bar family): the optional `widgets`
  section (`intent` and `hold_progress` kinds, box references validated at
  admission, shared entry budget), the generic `ChromeWidgetSurfaceV1`
  host in `@sillymaker/ui` (Story supplies the availability projection and
  maps activation onto semantic commands — widgets never gain routing
  power; hold progress reads only committed `remainingMs/totalMs`), the
  Engine Lab chrome-widgets conformance (fenced write over the shared
  tripwire hold), and Studio geometry edits that keep widget box
  references valid (rename rewrites, removal reaps). Layout documents stay
  zero-authority presentation data; behavior booleans and legality stay in
  Story code.
  The shared-stage-input lane (accepted and delivered 2026-08-26,
  owner-ruled q1 full value set on `say`/`choice`/`hold`/`custom`,
  q2/q3 per recommendation) completed M0–M3 the same day:
  `docs/engine/proposals/shared-stage-input.md` (with the closure
  record) and `docs/engine/plans/2026-08-26-shared-stage-input.md` —
  the optional `stageInput?: "isolated" | "shared"` pending hint
  (`pace`-family: conditional exact-key admission and byte-identical when
  undeclared; declared values travel with ordinary pending Save/digest/replay
  data but are never read by authoritative arithmetic or resolution), the narrative
  host registering stage isolation only when some entry demands it and
  releasing focus recapture/Tab trap for shared focus owners
  (`game-stage.tsx` policy formula and tests untouched), Engine Lab
  conformance (shared decision menu + tripwire hold with
  pending-routed crate activation, focused Host matrices, and the
  real-pointer browser spec that supplies mid-hold-input's missing
  evidence half), and the experiment repo's CE18 free-look menus plus
  CE281 right-hand bar holds as live consumers (hold click-eater
  passes the pointer through per declaration; mid-bar kiss lands +5
  minutes through a real pointer). Regions still never gain routing
  power and no second resolution path exists.
  The owner then accepted
  `docs/engine/plans/2026-08-26-neutral-gui-host-readiness-close-companion.md`.
  M0–M2 delivered and closed the same day with three orthogonal seams: one optional
  application-owned required-readiness latch, one optional product close
  participant, and one build-known/exact-target/package-private Desktop direct
  companion. Focused contracts, Chromium/WebKit GUI conformance, the complete
  repository check, and one disposable Deno 2.9.5 compiled-VFS/direct-child/
  HTTP-proxy/normal-close smoke passed; the smoke was removed rather than retained
  as a new harness. No successor lane is automatically active.
  The narrative-aside lane (opened 2026-08-27 by owner order with
  generality and orthogonality as hard constraints, delivered and
  closed the same day) completed M0–M3:
  `docs/engine/proposals/narrative-aside.md` (with the closure record)
  and `docs/engine/plans/2026-08-27-narrative-aside.md` — a typed,
  zero-authority, commit-only aside-dialogue push channel
  (transient-effect family: `asideSequence` + epoch stamps, consumer
  watermark; pages admitted once, rejected commands push nothing,
  load/restart replays nothing), the ui paging controller
  (`createNarrativeAsideControllerV1` + `useNarrativeAsideV1`: local
  paging, force-dismiss when an authoritative say/choice arrives,
  drop-on-arrival while dialogue is pending, zero dispatch) with Story
  renderers owning the pixels, Engine Lab conformance (tripwire-hold
  fenced write projects a two-page aside; jsdom locks paging over the
  running hold, untouched hold trajectory, and `when`-reroute forced
  dismissal; real-pointer browser spec), and the experiment repo's
  CE18 mid-bar zone SAY pages as the live consumer (knife #387: pages
  collected against command-start state ride the fenced `zone_press`
  commit and paint over the still-running bar; the E3 ledger gap is
  closed). The pending slot, hold arithmetic, resolution legality, and
  stage-input policy are untouched; asides never enter
  State/Save/digest/replay/History.
  The external golden-baseline seal audit (2026-08-29) closed its
  remaining engine-capability list on main the same day, all
  evidence-gated by that audit: the chrome-layout M3 widget delivery
  (recorded above), the serializable presentation RNG
  (`docs/engine/proposals/presentation-rng.md` — ui-package
  `derivePresentationSeedV1` + `createPresentationRngStreamV1`,
  xorshift32 with plain-data snapshots, seeds from committed facts only;
  zero-authority: never enters State/Save/digest/replay, and
  authoritative code keeps drawing through `RuleRngV1`), and the
  conditional-overlay ruling
  (`docs/engine/proposals/conditional-overlay-binding.md` — no new
  primitive: `setAppearance` + the stage owner's domain-event fold +
  appearance-keyed `resolveContent` is the sanctioned composition for
  state-conditional art, pinned by the Engine Lab mid-hold-input
  crate-latch conformance; the declarative variant-table family stays
  deferred pending a real consumer).
  There is no active lane (the seal-audit closures on 2026-08-29 were
  evidence-gated deliveries, not a new lane; awaiting the owner's next
  order).
  Desktop persistence remains an independent promotion gate while the
  adapter is preview.
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
- `website/**` — the public documentation site (Astro + Starlight, en + zh);
  ordinary pages use Markdown and interactive pages may use MDX; internal
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

The focused trusted build-time Mod contract is public at
`@sillymaker/composition/mod`. It accepts only application-explicit metadata,
catalog sources and typed extension points, and replaces complete immutable
selections through acknowledged successors. Keep package discovery, runtime npm
resolution, download/update services, a marketplace, post-release arbitrary
code, a universal authoritative R2 adapter, and untrusted-code isolation outside
this contract until a real product satisfies their separate gates and another
plan is accepted. One Last Sound Check's declarative text/image Artifact is a
product-specific Stage B consumer, not a universal `.sillymod` format.

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
  unchanged. Focused public `./mod` admits trusted metadata once, resolves and
  cold-compiles only the application-selected generation-immutable data/code set
  through application-owned typed extension points, and mounts explicit setup
  resources through Direct. It owns no package discovery, runtime npm resolver,
  download service, digest, State, Save, Context, service locator, in-place
  hot-install API, or same-realm sandbox. Its public controller only replaces one
  complete immutable selection through successor replacement; it never mutates a
  mounted set in place. A domain or local binding may still be required by a
  product; lifecycle composition does not imply product optionality.
- `@sillymaker/state` is an experimental neutral façade for authoritative
  transactional State, not a generic React/UI store. It must reuse exactly one
  Base Session and transaction runner; it never owns a second State, digest,
  Save, replay, queue, or CommandLog authority. Production Story migration
  remains evidence-gated.
- `@sillymaker/agent` exposes the focused public `./session` entry for the
  transport/provider-neutral Session/Run client, semantic connector/connection
  ports, bounded response/event admission, observable status, currentness,
  ordered stream, cancel/reconnect and awaited disposal. Workspace-private
  `./internal` retains the Agent GUI/session Host, immutable `UiArtifact`
  revisions, admitted `UiIntent`, closed React renderer, and deterministic fake.
  The public entry exposes no raw request/request ID/wire/provider or connection
  generation. Neither entry is a provider SDK, public Agent Host/renderer ABI,
  OpenUI/A2UI adapter, persistence owner, tool executor, or external-effect
  authority. Ordinary Template/Engine Lab Player
  graphs exclude it. AR5's neutral single-companion split and generated negative
  measurement also prove that a complete Authoring final graph excludes Agent/RPC;
  Engine Lab's Inspector binding selects the private single Agent companion only
  through its explicit opt-in entry, not as an Inspector or final-graph requirement
  and not as a public Host/UiArtifact ABI.
- `@sillymaker/ui` owns reusable React presentation, input, interaction,
  overlays, diagnostics UI, assets, characters, stages, and semantic-publication
  bridges. Its focused `./code-surface` entry cold-compiles build-known literal
  loaders, once-admitted props, parent slots, and minimal authoring metadata into
  direct React plans with lazy children and node-local fault boundaries. The
  root entry does not re-export that optional path. Same-realm components are
  trusted application code; policy metadata guides cooperation and inspection,
  not DOM/network/listener/main-thread sandboxing.
- `@sillymaker/vn` is the focused first-party VN genre layer. Its Base entry
  owns generic interaction documents, compilation, stable derived IDs, and
  deterministic run-to-interaction policy plus the shared Base NarrativeGraph
  lint/prediction projection; focused UI entries compose existing
  Narrative/Stage/Input primitives, and History is a separately selectable
  presentation Mod. It owns no second Session, State, Save, replay, source
  writer, service locator, or private Mod backend. Products provide typed
  predicates/effects, content, theme, and special surfaces. Template and One
  Last Sound Check consume the same layer rather than retaining copied kits.
- `@sillymaker/web` owns browser hosting, Browser/Deno Desktop admitted GUI
  bootstrap, first-product-commit and required-readiness signaling, the single
  product-selected close participant, IndexedDB persistence adapters, mounting,
  routing, capabilities, automation, pointer input, and the optional development
  rebootstrap helper. Its package-private Desktop companion port exposes only a
  fixed same-origin HTTP namespace and a request-drain close participant; it does
  not expose a process handle or define a product RPC protocol. Engine Lab's Vite
  development entry is the maintained R2
  conformance boundary; it admits simulation/presentation identity changes at
  the composition owner while preserving the sibling Authoring Host. Vite React
  Fast Refresh remains available to boundary-safe application UI modules, and
  refresh-ineligible or equal-R2 application changes request R3 full-page reload.
  Ordinary static builds do not install this development boundary.
- `@sillymaker/tooling` owns the optional Desktop companion's build-time exact-
  target selection and the package-private shell owner. A selected package stages
  exactly one build-known artifact plus its private Host implementation and grants
  unscoped `--allow-run`; an unselected package stages neither and grants no
  subprocess permission. Deno 2.9.5 cannot use startup-resolved name/path scoping
  for the later random absolute path materialized from its compiled VFS, so do not
  pretend this preview is narrowly permission-scoped or production-qualified. The
  shell owns only its direct child and closes in the order product fence/prepare,
  Host ingress drain, child stdin EOF, and child exit 0. Do not grow this into a
  subprocess API, provider registry, process-tree supervisor, public companion/RPC
  ABI, or Desktop HMR path.
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
- Game-specific authoring UI may enter through the focused public
  `sceneInspector.properties` contribution on `InspectorBindingV1`. The Host
  admits that build-known set once and supplies only the current admitted Scene,
  read-only facets/selection, and the existing revision-fenced Scene operation
  port. Do not expose Authoring Host, Session, source IO, Save, Context, or a
  service locator to contributions, and do not expand this Scene slot into a
  workspace/layout/plugin DSL. A new document family needs its own focused
  consumer contract. DevDock/Inspector contribution outputs and public Mod
  extension points remain separate focused contracts; neither exposes the
  private Direct backend, Authoring Host, Context, or service locator.
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
- Product CSS activates fonts, palette, control recipes, and third-party styles
  only under `[data-application-id]` or a narrower product root; it does not
  theme `:root`, `html`, `body`, bare controls, or an unscoped universal
  selector. An application-owned Host may still set document geometry
  (`html`/`body`/`#root` size, margin, and overflow) and whole-document
  `color-scheme`; those rules must not carry the product font, palette, or
  component styling into sibling engine tools.
  Product `@font-face` families are namespaced and activated only in that root.
  Inspector, DevDock, Embedded Authoring, and game-specific tool extensions use
  the engine-owned `--silly-tool-*` Tool Theme and must not inherit product
  theme tokens. Tailwind/daisyUI remain optional application-owned build tools;
  their Preflight/reset and theme classes never become an engine or document
  global contract.
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
  scope-frozen transitional owner for Engine Lab only. Do not
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
- The whole repository — engine packages, active Story packages (e2e, template,
  and examples), scripts, configuration, and documentation —
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
