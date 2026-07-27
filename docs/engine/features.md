# SillyMaker features

状态：当前实现能力清单；随公开导出和实际用户流程维护。

本页回答“引擎现在能做什么”。Project Tavern 七日 PoC 的数值、内容和模块划分不属于引擎特性。

## Story authoring and resolution

- Typed `GamePackage`, `GameSimulation`, and `GameplayModule` definitions.
- A dedicated `@sillymaker/base/authoring` entry with `createRuntimeSchemaV1` (canonical-JSON output, deep-freeze, structured failures) and `fromStandardSchemaV1`, the official Zod adapter accepting any Standard Schema V1 implementation without leaking library types.
- `createGameAuthoringKitV1`: typed capability tokens, `requires`/`provides` with provider factories that build narrow read-only ports from the owner's State slice, a validated capability availability DAG plus an independent `initializesAfter` lifecycle DAG (stable diagnostic codes for missing/duplicate providers, cycles, and undeclared token access), stateful/stateless module helpers with derived proposal schemas, and composition into ordinary low-level module bindings. The low-level `defineGameplayModule`/`defineGameSimulation` API remains the escape hatch; one composition owns one resolved module graph.
- A composition-level transaction runner (`createTransactionRunner`) for cross-owner atomic commands: `read(token)` observes the command-start Snapshot, each owner accepts at most one proposal (duplicates fault with a stable diagnostic), proposals apply in canonical module-ID order so declaration order never changes the candidate, and the engine owns slice replacement, schema/invariant validation, fact collection, commit/reject/fault envelopes, and RNG/sequence rollback. `commitAttemptV1`/`rejectAttemptV1`/`faultAttemptV1` are also public for hand-written executors.
- A shared versioned `DiagnosticEnvelopeV1` (stable code, severity, phase, subject, JSON-pointer location, suggestion, Strict JSON details) used by authoring/definition/resolution failures, plus `collectGamePackageDiagnosticsV1` to aggregate a package's failures as structured diagnostics with human and JSON output.
- Separate simulation (`rule | value`) and presentation (`value | text | asset`) patch surfaces.
- Validated, frozen resolution with Story, engine, state-contract, simulation, presentation, asset, and patch-set identity.
- Story-local schemas, deterministic rule providers, command executors, queries, ViewModel projectors, scene graphs, catalogs, and renderer contributions.
- Optional lazily loaded Story tooling and tooling UI.

- The Base application composer (`@sillymaker/base/runtime`): `defineCoreGameApplicationV1` declares a Host-neutral core application (GamePackage entry, semantic adapter, validators, diagnostics extensions — no React, no Host handle); `resolveCoreGameApplicationV1` produces an immutable reusable resolved definition with structured failure reporting; `createCoreGameApplicationInstanceV1` creates a disposable instance that owns the Session, semantic port, persistence lease, diagnostics buffer, and lifecycle (`restart`). Failed construction and idempotent disposal leave no active owner or listener. Each instance maintains an instance-local presentation anchor/epoch that advances when the authoritative replay base is replaced (load/import/restart/debug anchor, with origin labels) and never enters SemanticPublication, semantic revisions, or Agent transcripts; `bindToCurrentEpoch` guards stale presentation callbacks structurally. Autosave is an injectable policy (`every_commit` default, or `debounced` with `delayMs`, optional `checkpointEveryCommands`, an injectable scheduler for deterministic tests, and `flushAutoSave` for pagehide-style hosts); explicit slot saves remain available under any policy. Low-level constructors (`createGameSessionV1`, `createPersistenceServiceV1`, `createSemanticGamePortV1`) stay public as escape hatches.
- `@sillymaker/base/testkit` ships `createGameHarnessV1`: a deterministic headless Game harness composed on the core application composer, so tests and real applications share one lifecycle contract. Stories supply only their semantic adapter (queries, projections, action catalog, previews, invocation mapping); the harness provides observe/preview/dispatch/waitForIdle, a deterministic trace, state digests, the persistence port, the underlying `application` instance, an admin surface (command log, authoritative replay, capability-gated debug control, explicit `inspectForTest`), and structured outcomes after disposal. The normal surface exposes no raw Snapshot or State setter.
- A Host-neutral `AgentGamePortV1` (`@sillymaker/base/runtime`): identity plus the player-safe SemanticGamePort operations with a bounded `waitForIdle` (timeout/AbortSignal return structured results without touching gameplay State). Save/import/export and read-only diagnostics are independent revocable capabilities (`createAgentPersistenceCapabilityV1`, `createAgentDiagnosticsCapabilityV1`); a revoked capability answers with `capability_revoked`. `createAgentTranscriptRecorderV1` records operation/result transcripts and `compareAgentTranscriptsV1` checks cross-host parity; the harness exposes `agent` plus capability grants for headless runs.
- `@sillymaker/tooling` (Node-only) hosts the versioned JSONL agent protocol: `createJsonlAgentHostV1` serves hello/observe/describeActions/preview/dispatch/waitForIdle over stdin/stdout-style streams (stdout carries protocol lines only; logs go to the injected sink), gates persistence/diagnostics methods behind explicitly granted capabilities, enforces line/depth/time limits with bounded structured errors and no stack leakage, and shuts down gracefully. `createJsonlAgentClientV1` is the matching minimal client. The method set is closed: no eval, no file paths, no DebugTools. Node in-process and JSONL runs of the same transcript produce identical semantic results and final digests.
- The UI composer (`@sillymaker/ui`): `GameViewportV1` maps a declared logical canvas (design resolution) onto the window with continuous fit scaling, themed letterbox/pillarbox, a `maxScale` center-stop, and read-only two-space conversion queries (`useGameViewportV1`) so renderers never build a second measurement authority. `createGameUiCompositionV1` composes the runtime presentation store (semantic projection plus the instance-local presentation anchor and Story UI state — never polluting SemanticPublication or Agent parity), input router, presentation intent router, and overlay/system dialog sessions with one disposal that revokes every subscription. `DefaultGameRootV1` is a complete playable shell with zero Story React code: viewport-managed seven-layer stage, designed default surfaces (Save overlay, Settings dialog, system menu), Story slots for stage/HUD/narrative/overlay contributions (adding one never modifies the composer), stage-space remount keyed by the presentation epoch, and a hard player/debug boundary — resident player DOM carries no debug vocabulary, machine probes are `data-*` only, and DevDock appears solely behind the `debug_tools` capability.
- The Web composer (`@sillymaker/web`): `startWebGameApplicationV1(application)` boots a complete browser application from one Story declaration (core definition + projector/catalog/slots/labels): web Host, core application instance, capability parsing from the page query, UI composition, default GameRoot mount, capability-gated browser automation bridge, page-lifecycle teardown, and an idempotent `dispose` that unmounts, revokes automation generations and listeners, and releases the persistence lease. Story web entries contain no Session, Persistence, Diagnostics, Input, Automation, or HMR wiring. Pointer/interaction adapters, the presentation clock, audio, and routing join in later milestones (D/E); dev-time module changes fall back to a full reload until the F3 HMR migration.
- The engine browser suite (`pnpm test:e2e:engine`) validates the engine against the Engine Lab Story in real browsers: default shell boot and play, save round-trips across reloads, DOM/Browser-Agent publication parity with player-safe results, capability gating and the player/debug boundary, WCAG A/AA sweeps, GameViewport letterbox geometry across declared viewports (including a 16:10 tablet and 200% zoom), reduced-motion, and touch taps — each declared Playwright project executes real cases, and every test enforces a pageerror/console diagnostic policy. The Project Tavern product suite runs separately (`pnpm test:e2e:poc`).
- `@sillymaker/tooling/project` owns the Story/application project config: `defineSillymakerProjectV1` validates a plain-data application registry (story entry, asset verification, simulation target, optional web dev/build target) with structured diagnostics, and `inspectStoryApplicationV1`/`checkStoryApplicationV1`/`simulateStoryApplicationV1` plus `runProjectCliV1` provide JSON reports over any declared application. Simulation runs exclusively through the player-safe Agent port; applications without a target answer with a structured diagnostic. Repository consumers (Vite mode resolution, runtime asset verification, `pnpm story`) all resolve applications through this one mechanism.

## Runtime

- One authoritative `GameSession` queue for gameplay dispatch and State replacement.
- Immutable, schema-validated `GameSnapshot` values; the session deep-freezes every installed Snapshot so live mutation attempts throw.
- Serializable purpose-labelled PRNG with rollback-safe command attempts.
- Structured commit, rejection, validation, and fault outcomes.
- Static module composition with explicit State ownership and dependency validation.
- Semantic preview/dispatch and immutable subscription publications for UI and automation.
- Lifecycle restart/rebootstrap and replay-base replacement.
- Semantic Stage V2 contracts: versioned `SemanticStageStateV2` (ordered layers, stable `<layerId, tag>` entries, integer logical placement/appearance/camera targets) as plain canonical Save data, plus a pure atomic `reduceStageMutationsV2` batch reducer (`show`/`replace`/`hide`/`clearLayer`/`clearStage`/`setPlacement`/`setAppearance`/`setLayerTransform`/`setCamera`) that either commits a complete valid successor or rejects without touching the input state.
- Non-authoritative `StageRenderTargetV2` projection: a Story `StageContentCatalogV2` deterministically resolves semantic content into renderer IDs, asset IDs, accessible names, and Strict JSON props; unresolved content binds a code-native fallback renderer with structured diagnostics. The render target is rebuilt from State plus catalog and never enters a Save.
- Stage-driven projection wiring: Story game views may carry `SemanticStageStateV2` through the semantic publication (headless agents observe the semantic stage target), the Story UI projector rebuilds the render target every projection, and settled `requiredAssetIds` track the current target exactly — superseded assets leave the demand when the stage retargets.
- Stage transition contracts: plain, validated `StageTransitionDefinitionV2` data (cut/crossfade/slide, duration/easing, `block`/`target_active`/`skip_to_end` input policies, `settle_and_retarget`/`cancel_to_target` interruption, reduced-motion settle-or-fallback, immediate-or-bounded asset readiness, optional completion acknowledgment) plus a Story `StageTransitionCatalogV2` resolving old-to-new target changes. Definitions never enter the saveable stage state, and playing them never modifies gameplay State.
- `PendingInteractionV2`: the saveable interaction boundary (say, choice, pause, presentation barrier, and schema-registered custom surfaces) with three separated identities — author-stable `definitionId`, author-controlled `seenRevision`, and a per-entry-unique `occurrenceId` from a deterministic Story-owned sequence. `evaluateInteractionResolutionV2` is the single occurrence-fenced evaluator shared by the action catalog, preview, and queue-front dispatch; stale occurrences, wrong kinds, unknown or disabled choices, mismatched barrier transitions, and out-of-schema custom payloads reject without touching State. Renderer promises and callbacks never enter State or Saves.

## Persistence and compatibility

- Quick Save, automatic Save, and manual Save slots through a Host persistence facade.
- Canonical Save envelope encoding/decoding and strict import validation.
- Story, state-contract, engine, simulation, and patch-lineage compatibility information.
- Validated managed adoption for compatible simulation changes.
- Atomic record revisions, session lease/fencing, and HMR persistence handoff.
- Browser persistence through IndexedDB; injectable record stores for tests and other Hosts.
- File import/export through Host ports.

## Diagnostics and developer capabilities

- Bounded command log and runtime-failure buffer.
- Privacy-aware DebugBundle export with current identity, replay evidence, and Story diagnostics.
- Best-effort inspection and authoritative replay support.
- Capability-gated debug tools and cheats.
- Story-specific fixture/tooling hooks where a maintained product workflow needs them.
- Browser automation bridge over semantic actions, with revocation when capability or ownership changes.
- HMR invalidation and full runtime rebootstrap based on resolved identity.

## UI and presentation

- React game shell with a central layered stage and runtime error recovery.
- HUD, narrative, workspace overlays, system dialogs, Save UI, and diagnostic export UI.
- Static and paper-doll character renderers with Story-contributed renderer IDs.
- `SemanticStageHostV2`: renders a projected Semantic Stage V2 target with stable `layerId:tag` DOM identities, layer/camera/placement composition from integer logical units, Story-registered entry renderers, and a code-native fallback plus diagnostic for unregistered renderer IDs.
- Presentation runs and the Stage Reconciler: an injectable `PresentationClockV1` (animation-frame or deterministic manual), a reusable `PresentationRunV1` lifecycle (start/pause/resume/skip/settle/cancel/dispose with exactly-once outcome fencing; the future Timeline reuses it), and `createStageReconcilerV2`, which derives commit-only transition occurrences from committed target edges, renders previous + target + retained exiting entries, unions retained-exit asset demand, gates input by policy, suspends on page visibility, honors reduced motion live, drops stale edges across epoch changes (load/rollback), and emits exactly-once completion acknowledgments.
- `SemanticStageV2`: the animated stage component owning one reconciler per mount — feeds it committed publication targets, exposes `data-stage-settled`/input-gate lifecycle attributes for automation, and disposes every tick and listener on unmount, so browser tests observe lifecycle signals instead of sleeping.
- Scene backgrounds, interaction surfaces, normalized hit maps, pointer adaptation, and semantic controls.
- Input routing, focusable code-native controls, settings, symbols, reduced-motion support, and content preferences.
- Asset registry with requested-asset loading, fault diagnostics, and code-native fallback.
- Immutable presentation projection that combines semantic output with local presentation state without becoming gameplay authority.

## Web Host and application delivery

- Explicit Story-to-application composition and React mounting.
- Injectable autosave/checkpoint policy with a debounced browser default (`defaultWebAutosavePolicyV1`: quiet-period flush plus an every-N-commands checkpoint backstop), so committed Snapshots stay saveable at any time but long dialogues never write IndexedDB per line; the pagehide teardown flushes any pending capture before releasing the lease.
- Browser entropy, clock, logging, navigation, files, image loading, and IndexedDB adapters.
- Hash routing and query-driven development capabilities.
- Loader recovery when a Hotfix cannot be admitted.
- Vite development and static Player builds.
- Local Artifact preparation with legal notices and a technical manifest.

## Current non-goals and planned design areas

The engine does not currently provide a backend/account service, networked multiplayer authority, runtime LLM, ECS, SQL query layer, or a general-purpose database client for UI. These are descriptions of the present implementation, not permanent bans.

The script-language decision is durable: Story, Module, Narrative, UI, and official Hotfix code use TypeScript/JavaScript. SillyMaker does not plan Ren'Py DSL/Save compatibility, a custom script interpreter, or an untrusted-code security sandbox. Direct Host-global access remains possible JavaScript but is outside the supported engine API.

Semantic Stage V2 contracts and the pure reducer are implemented (see Runtime above), but Stage projection into semantic publications, Transition execution, PendingInteraction, media/audio, VN player systems, typed Timeline, a bounded Presentation Scene Graph, advanced media/renderer adapters, authoring DevTools/editors, and Player rollback are planned in the [engine roadmap](roadmap.md). They are not implemented features yet.

State access and persistence may be redesigned. The current exploratory direction is recorded in [the typed StateStore proposal](proposals/typed-state-store.md). Any adopted design should replace or simplify existing machinery rather than create two competing authoritative states.

The current Project Tavern Story is a worked integration example. It should not be used to infer that every future Story needs its exact calendar, actor, inventory, facility, Tavern, workflow, progression, or narrative module split.
