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

- `@sillymaker/base/testkit` ships `createGameHarnessV1`: a generic headless Game harness that resolves a package, bootstraps with deterministic entropy, and wires the session, semantic port, in-memory persistence, failure buffer, and disposal. Stories supply only their semantic adapter (queries, projections, action catalog, previews, invocation mapping); the harness provides observe/preview/dispatch/waitForIdle, a deterministic trace, state digests, the persistence port, an admin surface (command log, authoritative replay, capability-gated debug control, explicit `inspectForTest`), and structured outcomes after disposal. The normal surface exposes no raw Snapshot or State setter.

## Runtime

- One authoritative `GameSession` queue for gameplay dispatch and State replacement.
- Immutable, schema-validated `GameSnapshot` values; the session deep-freezes every installed Snapshot so live mutation attempts throw.
- Serializable purpose-labelled PRNG with rollback-safe command attempts.
- Structured commit, rejection, validation, and fault outcomes.
- Static module composition with explicit State ownership and dependency validation.
- Semantic preview/dispatch and immutable subscription publications for UI and automation.
- Lifecycle restart/rebootstrap and replay-base replacement.

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
- Scene backgrounds, interaction surfaces, normalized hit maps, pointer adaptation, and semantic controls.
- Input routing, focusable code-native controls, settings, symbols, reduced-motion support, and content preferences.
- Asset registry with requested-asset loading, fault diagnostics, and code-native fallback.
- Immutable presentation projection that combines semantic output with local presentation state without becoming gameplay authority.

## Web Host and application delivery

- Explicit Story-to-application composition and React mounting.
- Browser entropy, clock, logging, navigation, files, image loading, and IndexedDB adapters.
- Hash routing and query-driven development capabilities.
- Loader recovery when a Hotfix cannot be admitted.
- Vite development and static Player builds.
- Local Artifact preparation with legal notices and a technical manifest.

## Current non-goals and planned design areas

The engine does not currently provide a backend/account service, networked multiplayer authority, runtime LLM, ECS, SQL query layer, or a general-purpose database client for UI. These are descriptions of the present implementation, not permanent bans.

The script-language decision is durable: Story, Module, Narrative, UI, and official Hotfix code use TypeScript/JavaScript. SillyMaker does not plan Ren'Py DSL/Save compatibility, a custom script interpreter, or an untrusted-code security sandbox. Direct Host-global access remains possible JavaScript but is outside the supported engine API.

Semantic Stage/Transition, PendingInteraction, media/audio, VN player systems, typed Timeline, a bounded Presentation Scene Graph, advanced media/renderer adapters, authoring DevTools/editors, and Player rollback are planned in the [engine roadmap](roadmap.md). They are not implemented features yet.

State access and persistence may be redesigned. The current exploratory direction is recorded in [the typed StateStore proposal](proposals/typed-state-store.md). Any adopted design should replace or simplify existing machinery rather than create two competing authoritative states.

The current Project Tavern Story is a worked integration example. It should not be used to infer that every future Story needs its exact calendar, actor, inventory, facility, Tavern, workflow, progression, or narrative module split.
