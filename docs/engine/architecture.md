# SillyMaker architecture

状态：持续维护的现状文档。最后结构性复核：2026-08-10。

本文描述当前实现的主要边界和数据流。它不是冻结 ABI；修改包职责、权威状态、Story
组合、持久化格式或公开入口时，应同时更新本文、相应类型和行为测试。

## 1. System context

SillyMaker 是浏览器优先、可 headless 运行的 Story 游戏引擎；仓库内的 Story
包（旗舰示例《雨巷猫舍》等）是使用它开发的具体游戏。引擎提供可组合的规则运行时、权威
Session、存档/诊断、React presentation 和 Web Host；Story 提供具体
State、Command、规则、查询、内容、Semantic Stage 和应用组合。

当前所有 workspace package 都是 `private`。本文所说的“公开 API”指 package
`exports` 暴露的仓库内受支持入口，不表示 npm 发布承诺。

```text
Story packages and applications
          |            |            |
          v            v            v
 @sillymaker/base  @sillymaker/ui  @sillymaker/web
       contracts      React UI      browser Host
       runtime                      and adapters
```

依赖方向保持从具体游戏指向通用引擎。Base 不依赖 React、DOM、浏览器或具体
Story；UI 和 Web 可以依赖 Base；具体 Story/application 可以依赖三个引擎包。

## 2. Package responsibilities

| Package                 | Workspace public entries                                                                                          | Responsibility                                                                                                                                                                                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@sillymaker/base`      | `.`, `./authoring`, `./runtime`, `./story`, `./testkit` + testkit subentries; workspace-only `./runtime/internal` | Contracts, the Story prelude and authoring kit, deterministic resolution, authoritative sessions, persistence orchestration, replay, diagnostics, the agent port, and reusable behavior-test helpers.                                                                               |
| `@sillymaker/tooling`   | `.`, `./project` + subentries, `./vite` + subentries, `./identity/*`                                              | Non-browser project and Story CLI, Vite assembly, build identity, JSONL agent protocol/client, and package-internal Desktop preview packaging/local-server tools. Never imported by Base or browser bundles.                                                                        |
| `@sillymaker/ui`        | `.`, `./assets`, `./debug`, `./diagnostics`, `./styles.css`; workspace-only `./internal`                          | React shell, GameViewport, UI composition and default GameRoot, stage, characters, assets, interaction/input, overlays, narrative, settings, semantic/presentation bridges, recovery UI, and the published global theme stylesheet.                                                 |
| `@sillymaker/web`       | `.`                                                                                                               | Browser Host, IndexedDB record storage, files/images, Desktop-channel HTTP record/file adapters, `startWebGameApplicationV1`, mounting, routing, pointer input, capabilities, automation, Loader, and HMR rebootstrap.                                                              |
| `@sillymaker/story-e2e` | `.`                                                                                                               | The neutral Engine Conformance Story (Engine Lab, `e2e/`): gameplay modules, narrative script, presentation catalogs, semantic actions, and application composition used to validate engine contracts.                                                                              |
| Story packages          | `.` per package                                                                                                   | `template/` (the minimal starter, MIT) and `examples/*` (bookshop, cat-cafe, silly-os) each compose one self-contained application project (`sillymaker.config.ts` + `vite.config.ts`); the root `project.config.ts` only lists their directories for repository-level aggregation. |

Cross-package imports use package exports and declared `workspace:*`
dependencies. Application-only composition may stay internal to a Story package
when no other package should consume it.

`@sillymaker/base/runtime/internal` is the narrow cross-package seam for
engine-owned implementation that cannot use `src/**` imports. Web consumes its
Host composition seams, while UI's dormant source-relative stable-vector
admission module consumes only the bounded canonical projection seam; the
composite registration/context seam consumes that same UI admission authority.
The Base seam is absent from ordinary Base/runtime barrels and guarded by
negative consumer type tests. The dormant UI admission module is likewise
absent from the UI public and `./internal` barrels and is not wired to the
Coordinator or any live Surface family. These internal paths are not Story
APIs; before any npm publication, internal export visibility needs an explicit
audience policy.

`@sillymaker/ui/internal` is the equivalent Host-only composition seam. Web
uses it to inject the realm-stable Managed Surface epoch allocator; Stories use
the ordinary UI exports and cannot reach Overlay lifecycle internals through
the public composition facade.

Implementation anchors:

- Base root exports: `engine/packages/base/src/index.ts`
- Base runtime exports: `engine/packages/base/src/runtime/index.ts`
- HTTP record store (desktop channel):
  `engine/packages/web/src/host/http-record-store.ts`
- UI exports: `engine/packages/ui/src/index.ts`
- Web exports: `engine/packages/web/src/index.ts`
- current Story root: `e2e/src/story.ts`
- current simulation callback owner: `e2e/src/simulation-definition.ts`
- Engine Lab State-migration owner: `e2e/src/save-state-migrations.ts`

## 3. Story resolution

A Story package supplies a `GamePackageV1` with two facets:

- **Simulation**: state contract, module composition, schemas, commands,
  rule/value program, queries, and ViewModel projection.
- **Presentation**: Semantic Stage/content, text and asset catalogs,
  presentation values, and renderer identifiers.

Repository applications keep the simulation definition in a dedicated
`src/simulation-definition.ts` module. That module owns the materialization and
simulation-construction callbacks and does not import Presentation or React;
`src/story.ts` composes it with the presentation facet. Configured BuildIdentity
collectors, or an explicit dependency seed when an application has no collector,
and the determinism authority collector all start the Story simulation closure
at that dedicated owner.

The repository-owned determinism checker is a development boundary, not a
package API. On every run it rebuilds the registered-application graph from the
root registry, joins managed BuildIdentity dependencies with each declared
simulation callback owner, then adds bounded explicit Base authorities for
Session/execution/RNG/replay and canonical bootstrap admission. A bounded Base
closure that reaches a classified Base negative-control entry fails closed. The
collector also builds the complete merged authoritative path vector from Story,
Base, Save-projector, and synthetic/additional authorities, then rejects any
classified negative-control entry path found anywhere in that vector before
linting. Negative-control closures may share deterministic dependencies; their
entry paths, not their entire closures, form the exclusion fence. Each such
entry must use its canonical repo-relative spelling and appear exactly in its
own live closure. The resulting
exact path vector is read once and passed to one AST rule core; no generated
inventory or second rule authority is retained.
The maintained synthetic migration entry remains an independent collector
regression. Engine Lab now contributes the real app-local migration owner: its
Core registry and policy export must be the same factory-produced object, and
the collector live-enumerates every callback plus the app-local owner closure
before source lint.
Repository tooling and the parity driver inspect/wrap that opaque registry only
through `@sillymaker/base/testkit/save-state-migration-determinism`; this
test-only subpath is not a Story or production runtime API.
Base owns the M2a exact aggregate-State registry factory, the M2b bounded pure
execution authority, the M2c staged Persistence integration, and the M2d
package-internal atomic replacement protocol.
Core captures only a factory-produced registry and verifies its declared current
State identity during application resolution, then passes that exact registry
to Persistence. The internal kernel resolves an exact non-empty suffix, admits
detached State within Strict limits while capturing, and executes synchronous
callbacks. Staged import/load reconstructs and validates the current Snapshot,
derives its whole-Snapshot digest, and returns immutable attempts or a low-level
receipt. A successful migrated replacement installs that non-durable receipt in
the Session while one prepared commit updates Persistence/autosave, CommandLog,
and Session before publication; failures preserve the prior authorities and
receipt. Engine Lab configures the maintained revision 3/4-to-current
conformance chain; this proves the mechanism and does not establish a released
historical-Save compatibility range.

The runtime complement remains outside production package lifecycles.
`e2e/src/testing/**` owns the pure ambient-guard harness, parent runner,
short-lived module Worker, and browser-executable neutral driver. The driver
imports only the narrow
`@sillymaker/base/testkit/authoritative-determinism` subentry; its maintained
closure reaches Base Session/execution/RNG/digest/CommandLog authorities but no
Web, UI, application Host, persistence composition, or Presentation bootstrap.
The Worker is created and terminated by the test parent, and neither the normal
Player realm nor production Simulation runtime imports or restores its guards.
This is a determinism error probe, not a sandbox or security boundary. The
dedicated DET4 path executes that guarded driver twice in Deno and twice in each
of Chromium, Firefox, and WebKit, then compares the same authoritative trace,
replay, ordering, and Save-metadata vectors across runtimes.

Save migration uses a second short-lived module Worker so its broader
Persistence/schema closure does not widen the ambient-tripwire Worker. It runs
one-step, two-step, rejection, callback-throw, invalid-result, and
migration-plus-adoption cases through the real validation path. The shared
matrix compares exact normalized State output, callback counts, attempt/receipt,
whole-Snapshot digests, adoption, and source-byte preservation in Deno and the
same three browser engines; conformance-only failing registries never replace
the real Core owner.

`defineGamePackage` creates the package entry. `resolveGamePackageV1` validates
the definition, applies authorized simulation and presentation patches,
materializes both facets, derives technical provenance, and returns a frozen
`ResolvedGameV1`.

Simulation and presentation patch surfaces are deliberately separate. A
simulation patch can change rules or values and therefore simulation identity; a
presentation patch can change values, text, or assets without pretending to be a
gameplay migration. Hotfix support is an application bootstrap mechanism, not a
general script runtime.

Resolved provenance distinguishes Story identity, engine identity,
state-contract identity, simulation digest, presentation digest, and patch-set
identity. These fields let Save, HMR, diagnostics, and release tooling reason
about compatibility without using the application version as a substitute for
actual runtime identity.

## 4. Simulation and authoritative state

A `GameplayModuleDescriptorV1` declares a stable module ID, revision, owned
State slots, and dependencies. Stateful modules provide schema, initial State,
local queries, owner-scoped proposals/apply operations, and invariants.
Stateless modules may provide named pure capabilities.

`defineGameSimulation` combines the selected module tuple with aggregate schemas
and Story-owned behavior:

- bootstrap and initial-State factories;
- gameplay and debug command executors;
- `createQueries(State)`;
- immutable game ViewModel projection.

Story-owned `createBootstrapInput` is a composition-root/Host ingress adapter,
not an authoritative transition callback. Standard Core uses one
package-internal admission path that traverses the complete raw return once and
constructs a path-local ordinary-data projection. Core neither
retains nor freezes the raw adapter output: shared aliases expand independently
at each canonical path, and Proxy-, private-field-, or WeakMap-backed hidden
identity state cannot cross the boundary. Only after the projection succeeds
does Core recursively freeze that engine-owned value, descriptor-read and parse
its RNG seed once, and pass the frozen projection to the resolved root and
stateful-module initializers. Construction, queued restart, and the extension
initial-Snapshot helper share this admission. Canonical failure precedes seed
and Story validation; failed construction acquires no Session or persistence
ownership, while failed restart/extension never replaces the installed
Snapshot, replay base, or persistence anchor. Queued restart retains its
pre-operation, post-operation, and catch HMR fences: an invalidated outcome can
win before admission or after transient bootstrap work, but never install the
candidate. This internal mode does not change public canonical JSON, digest,
Snapshot, Save, or replay bytes.

Every public Simulation command callback has an engine-owned Strict Canonical
Data gate. The command-admission canonical traversal adds package-internal
container-shape checks that reject symbol-keyed members, extra own array
properties, and custom array prototypes before encoding that container's
children. A represented accessor is instead rejected without invocation when
the ordinary index/key traversal reaches that member, so an earlier child
failure can retain precedence over a later accessor. These values could
otherwise be observed through the caller's identity even though canonical
command bytes, CommandLog, and replay do not represent them. From the same
descriptor-safe traversal, the gate constructs byte-identical canonical bytes
and a new path-local ordinary-object/array projection, then recursively freezes
only that projection before a Story executor or Debug domain validator sees it.
The admission step neither retains nor freezes the upstream normalized identity;
schema helpers may already have frozen their own output under their separate
contract. Shared aliases expand per canonical path, cycles still reject, and
Proxy virtual reads, private elements, and raw-identity side tables do not cross
the ingress.
A Session operation reuses one package-internal exact-projection admission
receipt through Simulation and CommandLog, so the operation traverses the
command once without creating a second normalized authority. Direct Simulation
and CommandLog calls cannot bypass the gate. Authoritative replay captures every
source/command slot once, checks the closed source kind, then supplies only the
admitted command projection to its driver. This stricter traversal does not
change public `canonicalJsonBytes`, digest, Save, or Debug Bundle encoding
behavior.

Finalized attempt evidence has a separate package-internal admission boundary.
After an executor returns, Standard Core captures the attempt envelope without
invoking accessors, validates the candidate Snapshot RNG, then normalizes Story
facts/rejections and Debug validation errors through their declared schemas.
Evidence collections capture their own array `length` data descriptor once and
validate every represented index against that fixed length; a Proxy's virtual
`get("length")` cannot truncate or expand the admitted vector.
The complete Snapshot-free evidence candidate is converted into an engine-owned
Strict Canonical Data projection before any candidate Snapshot integrity
mutation, whole-tree freeze, digest, CommandLog continuity check, installation,
or publication. One exact admitted-attempt handoff lets the Session append the
projection carried by that attempt without a second traversal. Evidence
admission itself neither retains nor freezes upstream normalized identities;
an upstream schema may already have frozen its output. Result/pre-attempt
Snapshots deliberately preserve authoritative identity and are not projected.
Independent CommandLog calls still self-admit,
while direct
Simulation results are admitted only when their opaque generic result is
structurally attempt-shaped (`result` plus `diagnostics`). A finalization failure
uses the existing unexpected-fault normalizer once; an invalid fallback is not
normalized recursively and leaves the stable Snapshot and log unchanged.

Additional enumerable fields on a direct generic CommandLog command are a
separate conditional ingress after continuity and before ordinal/publication.
They are descriptor-captured, projected, frozen, and retain their public field
enumeration order; symbol/accessor metadata rejects without invoking a getter.
An enumerable collision with an engine-owned entry field is rejected
synchronously, also without invoking an accessor, rather than being silently
overwritten or masquerading as a generic field in the returned type.
The ordinary Session `{source, command}` path performs no metadata traversal.

The current validator checks unique State ownership and an acyclic module
dependency graph. A Story's aggregate State should reflect the modules it
actually composes; unused modules should not force placeholder State.

The Game Authoring Kit transaction runner keeps proposal construction in the
Story's explicit call order, then applies the completed staged owner vector by
UTF-16 code-unit module-ID order. Each owner apply reads its command-start slice;
the engine accumulates replacements and facts in that fixed order, validates the
aggregate candidate, finalizes evidence, appends CommandLog, and only then
installs/publishes a committed Snapshot. Authoritative replay runs the same
executor/order. The comparator is package-internal and Host-locale-independent;
it is not the Unicode code-point comparator used by canonical JSON keys.

The authoritative runtime value is a `GameSnapshot`:

```text
GameSnapshot = Gameplay State + serializable RNG state
             + command sequence + run integrity
```

Gameplay State remains plain, versioned, schema-validated data. RNG is
serializable and transaction-local so a rejected or faulted attempt cannot
silently consume randomness. Command logs and emitted facts are diagnostic
evidence, not a second source of State.

The standard Core composition treats `xorshift32-v1` cursor zero as an invalid
runtime state: numeric bootstrap seeds and restored Snapshot candidates are
rejected before Story initial-state construction, command finalization, replay work, or
authoritative replacement can install them. Save and DebugBundle decoding retain
the stable `rng.invalid_state` classification. The generic low-level Session and
replay constructors remain algorithm-agnostic escape hatches; the standard Core
owns this xorshift admission without changing canonical JSON, digest, or Save
envelope formats.

## 5. Session and semantic read/write flow

One `GameSession` owns the current Snapshot. Its queue serializes authoritative
dispatch, lifecycle replacement, validated load/import, debug mutation, and
other operations that can replace State. A command attempt either installs one
complete valid Snapshot or leaves the previous Snapshot authoritative.

Gameplay dispatch first preserves the Story command-schema contract: schema
failure resolves as `not_executed/validation_failed`. Once a schema returns,
non-canonical output rejects with the root-exported `CanonicalJsonError` before
queue/status publication, executor, RNG, Snapshot work, or CommandLog
continuity. Low-level Debug control applies its capability/session/HMR preflight
before admission and rechecks the live fence at queue front. Authoritative
replay preflights its complete recorded-command vector before Snapshot digest
or driver construction: it first captures every source/command identity once,
then prepares each captured command and freezes none until all pass. The driver
does not reread mutable entry slots. Best-effort inspection remains permissive. Stable
canonical-error compatibility fields are `code` and JSON-Pointer `path` (root
`""`), not the diagnostic message. A command-only unrepresented member uses
`value.unrepresented_property`: its path identifies an extra array property or
the containing value for a symbol key. A custom array prototype uses
`value.custom_prototype` at the array path.

Read and presentation flow:

```text
GameSimulation
  -> GameQueries over Gameplay State
  -> immutable SemanticPublication
  -> RuntimePresentationPublication
  -> React renderer
```

The semantic port previews and dispatches Story-specific semantic invocations at
the Session queue boundary. UI, browser automation, and presentation code
consume projections and semantic descriptors; they do not receive a Snapshot
setter or a generic gameplay-State client.

The Base application composer (`defineCoreGameApplicationV1` /
`resolveCoreGameApplicationV1` / `createCoreGameApplicationInstanceV1`)
distinguishes the author definition, the immutable resolved definition, and the
disposable application instance that owns the live Session, persistence lease,
listeners, autosave policy, and an instance-local presentation anchor/epoch.
Definitions may declare Story extensions (`createExtensions`) — diagnostics
services, DebugBundle codecs, debug tooling — that the composer constructs with
a controlled context and disposes with the instance. The testkit harness and
headless applications compose on it; direct low-level construction remains
available as an escape hatch.

Maintained applications boot exclusively through `startWebGameApplicationV1`:
each supplies one `WebGameApplicationV1` declaration (core definition,
projector, UI slots, overlays, labels, input maps, DevDock loaders), and their
entries contain no Session, Persistence, Diagnostics, Input, Automation, or HMR
construction. The web composer owns the persisted capability session, the
pointer/keyboard/gamepad adapters, the capability-gated automation bridge, the
DebugBundle UI-context binding, and the dev HMR boundary
(`installWebGameApplicationHmrV1`), whose rebootstrap hands the persistence
lease from the disposed predecessor to the successor instance.

Renderer-local hover, animation, focus, overlay, and asset-loading state is
non-authoritative. It may produce semantic or presentation intents, but it
cannot independently decide gameplay availability or mutate Gameplay State.

## 6. Persistence and browser storage

Persistence is separate from live State management:

```text
authoritative in-memory Snapshot
  -> versioned Save envelope and provenance
  -> HostAtomicRecordStore
  -> browser IndexedDB adapter
```

`HostAtomicRecordStoreV1` is a revisioned byte-record interface used for saves,
leases, and settings. `createWebHostV1` supplies its IndexedDB implementation
plus browser entropy, file, clock, navigation, and logging ports. Tests or other
Hosts can inject a different record store without moving browser concerns into
Base. The current desktop channel exercises that seam through a loopback HTTP
adapter backed by local files. Its file backend remains a durability preview
until it proves crash-atomic multi-record commits, cross-process revisions, and
old-record migration/recovery. Desktop packaging is a separate preview axis
until each named platform proves a real package build, launch, write, exit, and
reopen. The two axes promote independently; only a combined claim that a
packaged app uses atomic persistence requires both sets of evidence.

A Save carries its Snapshot, state digest, provenance, and simulation lineage.
Current-format import/load first admits bounded Strict JSON and an exact envelope
shell while keeping Snapshot as raw data, verifies its raw canonical digest, and
then applies an engine-owned State-revision fence. A matching revision proceeds
through current Snapshot schema/cross-field validation and a second normalized-
Snapshot digest check before compatibility, references, invariants, and one
atomic replay-anchor replacement. Stored load additionally checks Host record
revision and slot identity between staged admission and Story validation. A
different State revision remains callback-free for list, stored export, and
annotation: list reports `migration.unavailable`, stored export preserves exact
source bytes, and annotation rejects with `migration_unavailable`. Import/load
without a complete chain also maps unavailable. Import and stored load with an
exact configured chain admit the historical engine-owned Snapshot shell, migrate
only `snapshot.state`, preserve
the other Snapshot/envelope fields, advance only the State identity in candidate
provenance, validate the current Snapshot, derive its new whole-Snapshot digest,
and then run compatibility, references, and invariants. Stored physical identity
is checked before chain resolution. Successful candidates use a package-internal
composite prepare/no-throw commit: Persistence/autosave, CommandLog, the Session
Snapshot/digest, and the Session-owned non-durable migration receipt change
before Session publication. A preallocated Session-bound context is visible
only while listeners receive that publication, then clears; the observational
replacement callback runs next, and autosave receipt settlement/repair I/O runs
last. Prepare failure preserves every prior authority and leaves the
Session ready. This composite guarantee covers the repository-owned
GameSession/Core/Persistence composition and transparent wrappers that preserve
the exact outcome or package prepare-callback identity. A low-level custom
`GameSessionRuntimeControlV1` wrapper that destroys both identities retains only
the legacy current-revision (`migration: null`) callback path, as does a caller
that explicitly supplies the legacy replacement-prepare callback; migrated
replacement fails closed before authoritative Snapshot/replay/Persistence
mutation and is outside the M2 composite guarantee. The source Save is never
written back.
Internal indexes, clients, closures, React values, and database handles must not
enter a Save.

Untrusted Save, Debug Bundle, lease, preference, and related JSON bytes share
the bounded Strict JSON parser before schema or digest work. Numeric tokens are
classified from their exact decimal coefficient/scale/exponent before a final
safe-integer conversion: exact alternate spellings such as `1.0` and `1e0`
normalize to the same runtime value, while rounded fractions, negative-zero
spellings, and exact integers outside the safe range reject. The parser uses
the enclosing byte limit as its numeric resource bound and never allocates or
computes in proportion to the exponent. A rejection exposes no partial decoded
value, so persistence replacement remains atomic; canonical encoding and digest
bytes are unchanged.

IndexedDB therefore remains durable storage, not the live query API. A future
typed in-memory store may change how Gameplay State is accessed internally while
preserving this persistence boundary.

## 7. Diagnostics, capabilities, and recovery

Base runtime provides bounded command logs and runtime failures, DebugBundle
encoding/decoding, privacy scrubbing, best-effort and authoritative replay,
persistence services, and capability-aware debug operations.

Runtime capabilities currently include debug tools, cheats, and a browser
automation bridge. Capabilities are checked at operation time and do not create
a second build flavor. Automation exposes the Story's semantic surface rather
than internal debug or State mutation APIs.

The Web Loader can resolve a Story with Hotfixes and retain the last successful
identity for recovery. HMR compares resolved identity, invalidates the previous
runtime, fences persistence ownership, and constructs a successor application
instead of mutating a live simulation definition in place.

## 8. Presentation architecture

`@sillymaker/ui` separates reusable rendering infrastructure from Story-owned
appearance and content:

- a shell and central layered stage;
- stable renderer-ID contribution registries;
- scene, character, HUD, narrative, overlay, system, and interaction surfaces;
- semantic-publication and runtime-presentation stores;
- asset registry, exact-demand loading, diagnostics, and code-native fallback;
- input routing, pointer hit testing, accessibility-oriented controls, and
  settings;
- Save and diagnostic UI ports that do not own persistence or gameplay logic.

Story presentation code maps its immutable semantic publication and catalogs
into these generic surfaces. Missing assets or renderer contributions can
degrade to a visible fallback without changing authoritative gameplay.

Workspace Overlay and System dialogs are the live transient Managed Surface
families. They share one composition-owned Coordinator, application epoch,
immutable publication, input/focus ownership, and successor lifetime. A Story
declares validated Overlay definitions and a renderer resolver, then sends
`openPrimary`, `pushDetail`, `closeTop`, or `closeAll` intents through the
composition facade. System Settings and Saves share one root slot; a load,
clear, or import confirmation is the exact-parent child of the current Saves
root. The composition creates an opaque System session, and the required
`SystemDialogHostV1` mounts the standard or custom Saves component without
creating a fallback store. Neither facade exposes Coordinator, epoch, instance,
readiness, or writable topology evidence.

The live transient Coordinator remains the sole lifecycle facade through which
topology, input, focus, instance, and readiness are writable. Its only state
owner is one composition-owned runtime authority and generic kernel: the exact
reducer state, mutation/reentry fence, captured-listener delivery, and
instance/routing identity cursor are shared rather than mirrored. Admission
completes before topology mutation. Active/suspended phase derivation now runs
through one source-relative pure topology-policy leaf. The transient reducer is
its lossless live adapter: it supplies the existing insertion preorder and
blocking/fallback facts, while the leaf orders only by layer plus that supplied
preorder and never treats runtime allocation identity as z-order. Initial and child
preparation use a code-native blocking fallback, replacement keeps the existing
subtree until the candidate is ready, and application-epoch rotation fences
late readiness during load, import, HMR, or another successor. After a composed
successor acknowledgment, the predecessor Root performs no family close/reset;
successful load/import also leaves its old Saves completion stale, so it cannot
close or finalize a fresh System root. The epoch is presentation/runtime fencing
only and never enters a Save.

The generic kernel also has optional package-internal post-reducer seams for
composite transitions. The nonterminal finalization/result-override hook
captures the exact adapter receiver and complete output before installation,
shares the existing mutation fence, and defaults to the reducer's exact
state/receipt when absent. Callback or output-capture failure installs nothing;
successful combined installation preserves transient-before-state notification
order and synchronous listener reentry. Terminal Coordinator disposal bypasses
that hook and retains the reducer's terminal receipt. A separate optional
first-terminal prepare/gate seam is triggered only by the reducer's exact
`applied / surface.coordinator_disposed` result. It captures and validates the
complete successor and notification vectors before a repository-owned commit
gate, then assigns the captured state without an intervening lookup. Adapters
without the terminal seam retain the exact prior reducer behavior.

A dormant, source-relative stable composite seam now reuses that same internal
kernel. It binds admitted targets to exact registry/configuration provenance,
derives the stable root-contributor vector and its generation, and can
dynamically register an exact current stable publisher lease before future
ingress. The same R2 authority creates the exact unpublished baseline, and the
composite's single canonical `stableAcceptedBaselines` array remains its only
baseline authority. First registration commits one composite-state notification
and no transient notification; read-only context capture returns a frozen exact current
baseline plus same-authority current-generation reservation snapshot without
composite/source/runtime mutation or runtime identity allocation, while each capture may create and
authenticate a fresh reservation snapshot. The composition terminal gate runs before registry,
baseline, or candidate inspection. A disposed bound registry or application-epoch divergence fails globally;
registered-registry lifetime divergence then also fails closed before candidate
classification, so direct external dispose cannot admit a successor around the
atomic owner-dispose path. The same dormant owner now authenticates an exact R2
proposal, applies the ordered lease/baseline/reservation preconditions, checks the
whole baseline-to-runtime graph, and installs one canonically planned successor
through that shared kernel. Effective publisher disposal prebuilds its successor
and uses the claimed exact R1 disposal receiver as the no-throw commit gate, so
registry close and composite assignment cannot expose an intermediate state;
repeat and external divergence remain distinct. These source-relative seams expose
neither the registry nor contributor/runtime evidence through a package barrel.
The same dormant owner now consumes the terminal prepare/gate seam: it derives
one complete terminal composite successor, clears stable baselines, runtime,
contributors, and private strong attempt/candidate provenance, preserves the
shared identity cursor, and rotates the reservation generation only when the
root contributor vector changes. The gate closes the exact bound registry;
`disposed` and an external earlier `already_disposed` both converge before the
installed state is observed. First delivery remains transient-before-state and
then clears both listener sets; repeat is unchanged and allocation-free. A
source-relative read-only comparison probe exposes only frozen identity booleans
and collection sizes for deterministic teardown and bounded-churn auditing,
including bound and pending attempts, preserved readiness-failure gaps, and
stable contributor candidates. Already-terminal
transient state cannot seed a fresh composite with a live registry.
The dormant stable owner now consumes the dedicated readiness contract through
two source-relative `ready` and `failed` settlement methods. They enter the same
kernel fence before reading evidence, then check application epoch, exact
candidate attempt, lease, and source revision before inspecting whole-composite
coherence. Ready cutover and terminal failure both run one shared topology
reflow; stale or planning/capacity failure keeps the exact old composite and
notifies neither listener axis. The same reflow is also the single planning
authority for stable proposal/empty/effective-dispose transitions and for the
specialized kernel's nonterminal transient finalizer.

Planning first projects the visible roots and existing runtime through the
shared topology policy without allocating child identities. It then combines
new stable roots, explicitly eligible child retries, and every newly-active
same- or other-owner parent's direct `parent_unavailable` children into one R3
canonical planning batch. One detached shared-cursor allocation supports valid
cross-publisher batches above 64 without inheriting the older one-at-a-time
pending/depth limits; capacity is checked before any install or publisher
dispose gate. Grandchildren remain gaps. Retained predecessor phase changes
produce a same-origin authenticated aggregate while preserving exact attempts,
and installed readiness-failure gaps retain exact provenance across later
reflow without making forged suspended-parent gaps admissible.

Transient phase materialization stays owned by the reducer's source-relative
publication projector. A direct stable transition that changes that projection
advances the existing transient publication/topology revisions and delivers one
transient notification before the one composite-state notification; otherwise
only the composite listener fires. A nonterminal transient transition coalesces
the same projection into its existing revision and atomically rolls back to the
old transient and stable state with `surface.transition_faulted` if phase or
capacity planning fails. Equal-layer rows without an R2, retained-subtree, or
existing transient preorder remain a closed planning fault rather than gaining
an allocation-derived z-order.

These stateful methods remain package-internal and source-relative: no live
stable publisher/family/renderer ingress calls them yet. A test-local neutral
two-owner harness now checks the complete stable publication/readiness/empty/
dispose boundary against an explicit semantic projection and runs 10,000 full
reconcile/failure/empty cycles without retaining historical attempts, failure
gaps, contributors, state snapshots, or receipts; the registry retains only
the two current publishers plus scalar cursors. The UI root and `./internal`
barrels, package export map, and transient evidence/receipt shapes remain unchanged.
This closes the S1-R aggregate implementation gate; S4 remains the next
independent live-family migration and is not activated by the dormant harness.

The first S4 Narrative slice now adds a source-relative family declaration and
publisher bridge without connecting that bridge to React, Web, or a Story. The
declaration fixes the Dialogue stable root and History transient child recipes;
the bridge claims one exact composition-bound publisher, registers its
unpublished baseline, and projects each normalized `PendingInteractionV1` into
a dedicated per-lease source revision and fresh Surface occurrence. It retains
one bounded full-pending canonical proof for same-occurrence drift detection and
prepositions the candidate frame before synchronous composite notification.
Readiness-failure retry keeps the target occurrence but re-runs candidate
preflight and binds a fresh snapshot to the new source revision.

Candidate preflight captures one exact data-only tagged result plus one exact
data-only snapshot without invoking caller getters. Expected family admission
outcomes are source-relative `narrative.renderer_missing` and
`narrative.required_port_missing` over a closed five-port inventory; malformed,
throwing, or explicitly faulted preflight converges to
`narrative.candidate_preflight_faulted`. These results carry exact zero delta
and do not extend the generic stable-result table. Every callback outcome is
followed by an exact lease/baseline/reservation currentness check before it can
win; successful capture then rechecks source/occurrence capacity before any
issuance. The UI barrels and package exports remain unchanged. The family
bridge itself exposes no action admission; the source-relative physical and
automatic adapters described below consume it without changing those barrels.
Host/History integration and live Story cutover remain later S4 slices.

S4.1b.0 now factors the existing managed action route through one
source-relative contract-bound core while preserving the live transient adapter's
public shape and behavior. The same per-`InputRouter` publication registry and
private managed-dispatch context still own publication and gesture admission. An
optional claimed continuation can run only after the exact Surface route succeeds
and both publication and gesture currentness are rechecked; an untagged router
event remains ordinary input, while a binding-origin route cannot fall through
after a claim. The stable composite derives its selected managed input owner from
the same whole-composite topology projection used for phase ordering. It exposes
an opaque direct-target proof only for the exact current accepted ready target;
a retained predecessor may preserve its routing contract but carries no direct
target, source revision, or semantic proof. Preparing, suspended, foreign,
replaced, disposed, and stale-source targets cannot authenticate. These seams
remain source-relative and add no root, `./internal`, package, InputRouter,
Coordinator, or action-envelope export. Narrative semantic dispatch and
automatic controller-attempt admission are not implemented by this floor;
S4.1b.1a now preserves the authenticated envelope action ID through that gate
by passing a frozen exact `{ actionId, attempt }` to the claimed continuation;
the opaque attempt cannot replace the authenticated action ID. This corrective
has no non-test claimant and adds no semantic dispatch.

The same shared stable action authority now also issues a source-relative
ready-active proof for an exact direct stable target independently of which
whole-composite node currently owns managed input. The proof binds the exact
application epoch, topology revision, runtime instance, publisher lease,
target occurrence/source revision, and active phase; any topology change
invalidates the old proof, while the same still-active target can be captured
again. Physical input capture, ready-active capture, both proof-currentness
checks, and routed physical actions all first require the exact registry
inventory and baseline-to-runtime graph to remain coherent. After the existing
application-epoch/topology evidence precedence, a raw publisher-registry
dispose or registry-wide divergence therefore faults the route and invalidates
both proof kinds instead of leaving either physical or automatic semantic
dispatch usable. This is an extension of the same cached kernel authority, not
a second lifecycle or topology owner.

S4.1b.1b.0 now closes one narrow, source-relative semantic vertical for
`narrative.choose`. Candidate preflight descriptor-captures the exact receiver
and one own data `dispatchResolutionInternalV1` callable before candidate or
runtime identity allocation, then exposes only a frozen zero-key handle in the
admitted frame. A physical admission derives the stable action authority only
from its authenticated bridge's composite kernel. It can mint a one-shot
zero-key choice attempt only for the exact current ready-and-active direct
choice target and an option in that captured frame. After the shared Surface,
input-publication, and gesture gates authenticate `narrative.choose`, the same
admission rechecks target, source, frame, and port provenance, then invokes the
captured receiver with a frozen `{ expectedOccurrenceId, resolution: {
kind: "choose", choiceId } }` request. A synchronous port throw becomes a
rejected completion and does not roll back Surface state. Unsupported action
IDs return source-relative `unmapped` before attempt inspection; a supported
action paired with the wrong attempt kind returns `stale` before spending that
token. Stale or replaced targets dispatch nothing. One active admission owns
the binding, and exact disposal releases only that admission's claim so a later
ready occurrence can bind a fresh successor. The seam remains dormant and adds
no generic result code, barrel, package export, React Host, or live Story edge.

S4.1b.1b.1a extends that same admission authority with the first remaining
physical mapping: `narrative.resume` for a current direct ready-and-active
pause. Every ready pause may hold the root's single managed physical binding,
but only a frame whose exact captured `skippable` flag is `true` can mint a
frozen zero-key pause-resume attempt. Choice and pause attempts share one
discriminated WeakMap provenance authority; action-to-attempt kind is checked
before the one-shot token is spent. The admitted route rechecks the exact
target, source, frame, captured semantic port, and `skippable` flag, then sends
a frozen `{ expectedOccurrenceId, resolution: { kind: "resume" } }` request to
the preflight-captured receiver and callable. `ui.confirm`,
`narrative.advance`, player controls, and every other unsupported action return
`unmapped` before attempt inspection and cannot consume a valid pause token;
mapped choice/resume cross-kind attempts return `stale` before spending either
token.
Preparing, replacement, retained-only, suspended, disposed, foreign, cloned,
and repeated capabilities dispatch nothing; a synchronous semantic throw only
rejects the returned completion Promise and does not roll back Surface state.
The slice remains source-relative and dormant. At that checkpoint, remaining
say, custom, barrier, and player-control policies stayed with
S4.1b.1b.1b.2; no raw resolution ingress was exposed ahead of those mappings.

S4.1b.1b.1b.1 now adds the bridge-private automatic pause-expiry controller on
top of that same stable authority. An exact current direct ready-and-active
pause can create one composition-bound controller whether `skippable` is
`true` or `false`; the flag continues to gate only the physical resume token.
The controller holds one current frozen zero-key attempt and binds it to its
generation, exact ready-active proof, target/source, admitted frame, and
preflight-captured semantic receiver/callable. It uses no gesture or
`InputRouter` evidence. A topology change makes the old attempt stale, but the
same generation may mint a fresh topology-bound attempt when the same target is
still active. Suspension revokes the generation; replacement, empty,
publisher/coordinator disposal, or source/frame change also prevent dispatch.
Only an exact unspent current attempt submits the frozen
`{ expectedOccurrenceId, resolution: { kind: "resume" } }` request. The
semantic result is normalized to a Promise, so a synchronous throw becomes a
rejected completion without rolling back Surface state.

This controller remains dormant and source-relative: it adds no live Story or
React Host edge, public/`./internal` barrel, package export, timer, clock read,
deadline, remaining-duration state, or scheduler. Verification for the slice
passed focused `7 files / 204 tests`, UI `79 files / 1022 tests`, full
`253 files / 3950 tests`, and `deno task check`. Browser `101 / 101`, examples
`45 passed / 2 skipped`, and prebuilt Player `38 / 38` are prior evidence only
and were not rerun for this slice. At that checkpoint S4.1b.1b.1b.1 was
complete and current/next was S4.1b.1b.1b.2 remaining mapping adjudication and
implementation; the next delivery refines that node.

S4.1b.1b.1b.2a extends the same dormant physical admission with authenticated
`narrative.custom` dispatch. The Host-owned admission first captures the exact
current direct custom target, source-bound admitted frame, stable proof, and
preflight-captured semantic receiver/callable. It then projects the proposed
payload through Base's `parseInteractionResolutionV1` custom branch. Because
that projection may invoke caller accessors, the admission rechecks its exact
active claim and recaptures the target, source, routing contract, frame, and
proof before it mints a frozen zero-key one-shot attempt. A getter-triggered
dispose or successor publication therefore wins without leaving a predecessor
capability. Only the authenticated `narrative.custom` route can spend that
attempt; mapped cross-kind and unsupported actions fail before spending, and a
final proof/frame/port check immediately precedes the frozen semantic request.
The Narrative module captures its own exact freeze intrinsic before any payload
getter can run and uses it for the attempt, resolution, request, and dispatched
result, so the Base-to-UI handoff cannot leave mutable action evidence.
Base remains the queue-front Story-schema authority, and semantic rejection or
a synchronous port throw does not roll back Surface state.

This slice also corrects Base's bounded interaction `StrictJsonObjectV1`
projection. Sorted enumerable keys are defined as exact own data members, so
`__proto__`, `constructor`, and `prototype` survive without invoking the legacy
prototype setter or changing the detached object's prototype. The projector
captures its property-definition and freeze intrinsics at module initialization,
so a payload getter cannot truncate or unfreeze the remaining projection.
Ordinary maintained payload bytes are unchanged; the interaction-resolution
union, evaluator, session queue, and Save format are unchanged. The Narrative
seam remains source-relative and has no live Host/Story claimant, public or
`./internal` barrel, package export, raw semantic port, or caller-owned gesture
authority. Verification passed focused `8 files / 216 tests`, UI
`79 files / 1028 tests`, full `253 files / 3958 tests`, `deno task check`, engine
browser `101 / 101`, examples browser `45 passed / 2 skipped`, and prebuilt
Player `38 / 38`. S4.1b.1b.1b.2a is complete; current/next is
S4.1b.1b.1b.2b remaining Say/barrier/player adjudication.

## 9. Changing the architecture

Architecture evolution is expected. A substantial change should state:

1. which package owns the new responsibility;
2. which public types or data formats change;
3. whether existing Saves or Story definitions need migration;
4. how authoritative state and failure atomicity remain unambiguous;
5. what behavior-level tests demonstrate the new contract;
6. which active documents now describe it.

Historical Phase plans and contract catalogs are evidence of one implementation
journey, not approval requirements for the next design.

Implemented portions of the [AI authoring design](design/ai-authoring.md),
[E2E engine validation design](design/e2e-engine-validation.md), and
[VN presentation runtime design](design/vn-presentation-runtime.md) are
described above and in [features](features.md). Further accepted evolution is
tracked in the [engine roadmap](roadmap.md). The
[Managed Surface lifecycle and contract harness](design/surface-contract-harness.md)
has a package-internal S1-T kernel for transient topology, action provenance,
application-epoch fencing, and transition-kind readiness. Workspace Overlay and
System dialogs are its live transient adopters: their public facades expose only
definitions/configuration, structured intents, and read-only views while one
composition authority owns lifecycle mutation. A source-relative dormant seam
now proves how future stable runtime state can share that authority and identity
domain and holds dormant exact lease/baseline registration plus read-only
admission context. It now applies exact stable proposals and performs atomic
publisher disposal through that same owner, settles source-bound stable
readiness, and performs whole-composite global cascade through the shared
topology policy. It remains unavailable through a package barrel. The live
transient reducer consumes the same pure topology policy, while the dormant
stable owner also performs the complete registry-gated terminal composite
disposition described above. The R5 neutral harness closes the generic
source-relative aggregate conformance gate. S4.1a now consumes it through the
dormant Narrative family/publisher bridge above, and S4.1b.0 supplies the shared
contract-bound physical gate plus whole-topology stable input-owner proof.
S4.1b.1a preserves authenticated action context through the claimed route
without dispatching semantic work. S4.1b.1b.0 now consumes that context only
for authenticated current-choice dispatch through the exact preflight-captured
semantic callable. S4.1b.1b.1a adds authenticated physical resume only for an
exact current skippable pause while retaining the same single binding for a
non-skippable pause without minting a physical semantic capability.
S4.1b.1b.1b.1 adds the bridge-private automatic pause-expiry controller for
both skippable values through the global-coherence-gated ready-active proof.
S4.1b.1b.1b.2a adds authenticated custom payload dispatch plus the bounded
interaction JSON dangerous-own-key corrective described above.
S4.1b.1b.1b.2b remaining Say/barrier/player adjudication is current/next;
Host integration and the Narrative live migration remain planned work.
Target documents do not alter the current data flow until that migration and
its behavior tests land.
