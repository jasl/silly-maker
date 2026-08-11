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
Player `38 / 38`. At that checkpoint, S4.1b.1b.1b.2a was complete and
current/next was S4.1b.1b.1b.2b remaining Say/barrier/player adjudication.

S4.1b.1b.1b.2b.1a now adds the dormant physical Say reveal-first vertical.
A bridge-private reveal controller descriptor-captures one exact plain-data
Host port with `capturePhaseInternalV1` and `revealAllInternalV1` callables for
the current Say target/source/frame. That per-frame controller is distinct from
the replaceable physical admission and survives input-binding or active-only
topology churn; source/frame/lifetime loss or a real blocking suspension
revokes the reveal generation. The physical admission remains the only
`InputRouter` binding and mints a frozen zero-key activation attempt without
reading reveal phase. Both authenticated `ui.confirm` and
`narrative.advance` consume that same attempt kind after the existing Surface,
publication, gesture, direct-target, and frame fences. Non-Say attempts retain
their previous `unmapped` alias behavior, while other mapped cross-kind tokens
remain `stale` without being spent.

The routed continuation installs an exact bridge callback gate, spends the
attempt, and only then calls the captured phase function. A callback-triggered
source or authority change wins as `stale`; a still-current invalid phase or
throw is `faulted`. An incomplete phase invokes the captured reveal callable
once and returns the frozen Narrative-only `{ kind: "revealed", completion:
null }` result after another exact currentness check, with zero semantic
dispatch. A complete phase atomically converts the same boundary to the
per-frame semantic in-flight claim and submits the frozen `advance` request to
the preflight-captured semantic receiver/callable. The semantic port Promise
contract is still one-key and source-relative, but settlement now denotes that
semantic publication and synchronous bridge reconcile have drained; the
wrapped completion releases the exact same-frame claim before it becomes
observable and never inspects the opaque Story result.

Callback and semantic claims use separate exact tokens. Reentrant controller
or admission replacement cannot dispatch through the synchronous callback
window. Manual controller disposal while a semantic Promise is pending keeps a
bounded read-only lifecycle observer: same-frame settlement releases it, a
source/frame successor retires the old claim, and an old completion cannot
ABA-clear a successor claim. A real suspension revokes the reveal controller
but retains the same-frame semantic claim across resume until its completion;
active-only topology churn instead preserves the current reveal controller.
The private state remains bounded to one controller, activation attempt,
callback claim, and semantic claim, with only WeakMap provenance behind them.

This delivery remains source-relative and has no package-barrel, generic
Managed Surface result/receipt, React Host, Story, or live input edge. Its
verification passed focused `7 files / 226 tests`, UI `79 files / 1044 tests`,
full `253 files / 3974 tests`, and `deno task check` (including the E2E Story
build). Browser `101 / 101`, examples `45 passed / 2 skipped`, and prebuilt
Player `38 / 38` remain prior evidence and were not rerun for this dormant
slice. At that checkpoint, S4.1b.1b.1b.2b.1a was complete and current/next was
S4.1b.1b.1b.2b.1b, the clock-free content-auto Say controller-attempt floor.

S4.1b.1b.1b.2b.1b now extends that same dormant per-frame reveal controller
with the clock-free content-auto attempt path. `advancePolicy: "confirm"`
cannot issue it. An exact current ready-active `auto` Say may issue one frozen
zero-key attempt bound to the controller generation, target/source/frame,
semantic port, and a fresh topology-sensitive ready-active proof. Issuance is
phase-free and does not require the physical admission, selected input owner,
gesture, PlayerProfile, PresentationClock, or a timer. Active-only topology
change stales the old proof but allows the same controller to issue a fresh
attempt; a real blocking suspension revokes that controller generation and
requires a fresh one after resume.

Automatic dispatch acquires the existing bridge callback gate, irreversibly
spends the attempt, and retires any presigned physical competitor before
reading the captured reveal phase exactly once. Post-callback target, source,
frame, controller, port, and proof drift wins as `stale`; an exact-current
incomplete phase returns the frozen Narrative-only `not_ready` result without
calling `revealAll` or semantic dispatch, and an exact-current invalid/throwing
phase returns `faulted`. Only complete converts the same callback token to the
existing semantic in-flight claim and uses the shared frozen `advance` request
and post-drain completion path. Physical Say dispatch reciprocally retires a
presigned automatic attempt, so either path is first-wins and the loser stays
stale after the winner settles.

The automatic attempt has a separate WeakMap provenance record and one current
strong slot but does not create another controller, route, topology, or
semantic authority. Source/frame successors retire the old claim, old
completions cannot ABA-clear a successor, clone/foreign/wrong-receiver attempts
fail before reveal reads, and 10,000 not-ready rotations retain no strong
attempt history. This source-relative delivery still has no clock, deadline,
player Auto/Skip, Host/React/live claimant, package-barrel, or generic result
edge. Verification passed focused `7 files / 236 tests`, UI `79 files / 1054
tests`, full `253 files / 3984 tests`, and `deno task check`. Browser `101 / 101`,
examples `45 passed / 2 skipped`, and prebuilt Player `38 / 38` remain prior
evidence and were not rerun. At that checkpoint, S4.1b.1b.1b.2b.1b was
complete and current/next was S4.1b.1b.1b.2b.2, the presentation-barrier
acknowledgment/recovery floor.

S4.1b.1b.1b.2b.2a now implements the normal Stage-to-Narrative Barrier
acknowledgment path. Stage owns a source-relative acknowledged-run authority
claimed by one exact claimant per reconciler. Repeating the same claim returns
the same authority; a foreign or cloned claimant fails closed. Once claimed,
that authority is the only Stage mutation writer. The ordinary unclaimed
`StageReconcilerV1` API and its raw retarget, acknowledgment, frame, and
subscription behavior are unchanged.

An acknowledged retarget first builds the complete transition plan without
mutating target, revision, occurrence, run, or proof state. Exactly one logical
transition must both request acknowledgment and match the expected transition
ID; zero, multiple, malformed, or throwing resolutions fail closed. The exact
commit guard runs after planning and again after each synchronous old-run
interruption and its observers. A stale guard stops without committing the new
Stage delta; a throwing, invalid, or reentrant guard faults it. The final
successful guard is followed only by prebuilt, callback-free local publication,
including the captured WeakMap proof install, so no caller work can expose a
half-committed target/proof/run.

Each armed run receives a frozen zero-key opaque proof authenticated by its
exact Stage authority. Private terminal delivery is sealed and occurs before
public acknowledgments, diagnostics, and Stage subscribers; observer failures
are contained. The same authority exposes a read-only, exact-receiver terminal-
stack query that uses proof identity rather than caller fields. Its depth covers
instant and animated completion, old-run settle/cancel interruption, and the
readiness-timeout diagnostic/final-notification tail, then returns false as soon
as that proof-bound terminal stack exits.

The Narrative side remains a dormant, source-relative claimant constructed from
the bridge's private composition provenance; no non-test Host, React, Web, or
Story integration creates it. It stores at most one target-level terminal
evidence record bound to the exact target, semantic occurrence, and full
canonical pending bytes. Stage terminal delivery only installs that evidence.
Semantic `barrier_completed` admission happens later through an explicit flush,
which re-captures the fresh source revision, admitted frame, semantic receiver,
and current ready-active runtime proof. A terminal-stack, preparation,
suspension, or readiness-failure gap retains eligible evidence without semantic
dispatch.

| Stage terminal outcome | Narrative evidence and explicit-flush behavior                                          |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `completed`            | Eligible; retain until current ready-active admission can dispatch `barrier_completed`. |
| `skipped`              | Eligible; same retained/explicit-flush path as completion.                              |
| `interrupted`          | Eligible; the old run may first-win before a successor Stage proof commits.             |
| `cancelled`            | Terminal-sealed as `cancelled`; never dispatches a semantic resolution.                 |

An eligible dispatch occupies one target-level in-flight claim. Repeated flushes
while it is pending return the same frozen dispatched result and Promise. Promise
settlement releases only that exact claim by CAS: a still-current target returns
to retained state for a later explicit retry, while retired evidence leaves only
a bounded tombstone until the old Promise drains and cannot ABA-clear a
successor. The closed Narrative terminal result remains
`dispatched | retained | cancelled | stale | faulted` without expanding a
generic Managed Surface result or public API.

This delivery adds no UI root, `./internal`, or package export. Verification
passed focused `8 files / 292 tests`, UI `79 files / 1099 tests`, full
`253 files / 4029 tests`, and `deno task check`, plus fresh engine browser
`101 / 101`, examples browser `45 passed / 2 skipped`, and prebuilt Player
`38 / 38`. S4.1b.1b.1b.2b.2a is complete; at that delivery checkpoint,
current/next was S4.1b.1b.1b.2b.2b.1, the settle/replay recovery
implementation now delivered below.

S4.1b.1b.1b.2b.2b.1 now implements the dormant Barrier recovery floor. The
claimed Stage authority owns the only presentation-generation writer: it
retargets initial or different epochs, leaves same-epoch and disposed requests
stale, and narrows the legacy claimed writer to an already initialized exact
same epoch. A frozen zero-key generation proof is authenticated to that exact
authority and reconciler, cached for the current epoch, and relates prior
same-authority proofs as `initial | equal | higher`, while a current epoch lower
than the authenticated prior proof returns `stale`; prior proofs remain
WeakMap-only provenance, so rotation retains O(1) strong state. The same Stage
mutation fence covers generation, ordinary, skip, and acknowledged retargets,
while the proof-bound terminal-stack query remains read-only during contained
callbacks.

The existing Narrative Barrier controller is now composition-scoped and may be
constructed before any Barrier is current. Recovery state lives on the bridge,
not the controller: one exact Stage authority/proof, stable action authority,
captured one-way activation gate, preexisting target or null, observer, current
settle attempt, and replay result cache survive same-bridge controller
replacement. Initial and higher generation installation snapshots the target
exactly once while the gate is closed; equal reuses the exact snapshot, lower
is stale, and foreign Stage authorities fault without reading the gate or
target. Gate descriptors and receiver/callable identity are checked before and
after every caller callback, and nested synchronization or Stage retarget
poisons the outer transaction so the old generation remains intact.

Only a preexisting `loadRecovery: "settle"` Barrier may issue a frozen zero-key
attempt after that exact gate opens and the target is ready-active. It does not
use a gesture, selected input owner, clock, or timer. Dispatch spends the
attempt only after generation, gate, target/source/frame/semantic-port, and
ready-active proof checks, then shares the normal Barrier target, callback, and
semantic in-flight claims. Normal Stage evidence and recovery therefore remain
first-wins. Promise settlement releases only its exact tombstone by CAS;
higher/lower rotation, source successors, controller replacement, and old
completion cannot clear a successor claim. A preexisting
`loadRecovery: "replay"` Barrier instead yields one frozen cached
`narrative.barrier_replay_unsupported` result per exact generation/target and
never fabricates a Stage proof or semantic dispatch.

The bridge closes recovery ingress before application-disposal notifications,
and its generation observer retires stale attempts before synchronous
replacement or suspension observers can reenter. Fresh application bridges
form fresh domains; foreign, clone, wrong-receiver, stale-generation, and
disposed attempts fail before semantic work. The implementation remains
source-relative and has no package-barrel, public Stage receipt, Base/Save,
Host/React/Web, or live Story claimant change. Verification passed focused
`8 files / 315 tests`, UI `79 files / 1122 tests`, full `253 files / 4052
tests`, and `deno task check`, plus fresh engine browser `101 / 101`, examples
browser `45 passed / 2 skipped`, and prebuilt Player `38 / 38`.
S4.1b.1b.1b.2b.2b.1 is complete; at that delivery checkpoint, current/next
was the aggregate S4.1b.1b.1b.2b.3 player-controls entry, which the active
plans have since split into independently mergeable controls.

S4.1b.1b.1b.2b.3a now removes `player.toggle_ui` from the dormant Dialogue
managed-definition action catalog. Because executable action IDs are part of
the static definition contract, `surface.narrative.dialogue` advances from
contract revision 1 to 2. The History child remains revision 1 with only
`ui.cancel` and `player.toggle_history`, and the Dialogue sidecar continues to
reference the exact revised Dialogue definition.

The generic `playerInputActionIdsV1.toggleUi` value and the existing live
Engine Lab/Dialogue characterization remain unchanged. An authenticated
binding-origin `player.toggle_ui` envelope is therefore consumed by Input but
rejected as `surface.action_unpublished` before the Narrative consumer; it has
zero lower-context fallthrough, semantic dispatch, topology, notification, or
attempt-spend effect. This corrective adds no hide/show state, generic route
result, package export, public API, or live claimant. Verification passed
focused `2 files / 156 tests`, UI `79 files / 1123 tests`, full
`253 files / 4053 tests`, and `deno task check`. Browser `101 / 101`, examples
`45 passed / 2 skipped`, and prebuilt Player `38 / 38` remain prior evidence
and were not rerun. S4.1b.1b.1b.2b.3a is complete; at that delivery
checkpoint, current/next was the voice-replay implementation delivered below.

S4.1b.1b.1b.2b.3b.1 now adds the dormant, source-relative voice replay
physical route. Candidate preflight accepts either no voice port or one exact
plain own-data `replayCurrentVoiceInternalV1(): boolean` callable. It captures
the callable and its exact receiver once into a private WeakMap and stores only
a frozen zero-key handle in the admitted frame; later property replacement,
accessors, clones, and malformed adapters cannot become invocation authority.

The existing Narrative physical admission is still the only managed binding
and route owner. It issues a frozen zero-key, one-shot voice attempt only for
the exact current ready-active Say, including when the optional port is absent.
The authenticated generic route runs before any spend. Once the exact
`player.replay_voice` mapping authenticates a same-admission attempt, it spends
the attempt, rechecks the direct-target proof, stable input contract,
target/source/frame, and captured handle, then returns `ignored` for an absent
port or invokes the captured callable with its original receiver and no
arguments.

Non-null invocation reuses the bridge-wide `sayCallbackClaim`; it does not add
a voice-specific claim, controller, binding, or semantic path. The shared claim
blocks manual/content-auto and cross-binding reentry. Post-callback
target/source/suspension/disposal drift wins as `stale`; otherwise exact `true`
is `handled`, exact `false` is `ignored`, and throw or non-boolean output is
`faulted`. Cleanup releases only its own token by exact CAS. All four outcomes
remain Input-consumed, and the outer voice route adds zero semantic, gameplay,
topology, or notification delta. A callback-triggered source, suspension, or
disposal operation retains only that nested operation's exact delta.

The port, captured handle, attempt, and result remain source-relative and are
absent from the UI root, `./internal`, and package exports. No generic route,
Base, Host/React/Web, audio presenter, or live Story claimant changed.
Verification passed focused `2 files / 137 tests`, UI `79 files / 1136 tests`,
full `253 files / 4066 tests`, and `deno task check`. Browser `101 / 101`,
examples `45 passed / 2 skipped`, and prebuilt Player `38 / 38` remain prior
evidence and were not rerun. S4.1b.1b.1b.2b.3b.1 is complete; at that delivery
checkpoint, current/next was the Auto/Skip implementation delivered below.

S4.1b.1b.1b.2b.3c.1 now implements the dormant, source-relative bridge-owned
Auto/Skip transient-mode floor. Each Narrative bridge starts with one fresh,
frozen, private one-key `normal` mode-state identity. Its record is the only
writer and strongly retains only the exact current identity; the bridge exposes
only the read-only `readPlaybackModeInternalV1()` primitive projection. Every
effective toggle installs another fresh identity, so a primitive
`normal -> auto -> normal` cycle cannot revive a capability bound to the first
`normal` state.

The existing physical admission remains the only binding and route authority.
It issues frozen zero-key, one-shot Auto/Skip attempts bound to the exact
admission, requested mode, issuance mode-state identity, and current
target/source/frame proof. Generic application, Surface, Input, publication,
catalog, and gesture fences run before spend. An exact mapped attempt spends
once, rechecks the complete currentness set, computes the six closed Say toggle
transitions, and commits a fresh successor by identity CAS. Ready-active choice,
pause, custom, and `presentation_barrier` targets can authenticate the same
controls, but their consumed family result is `ignored` while mode remains
`normal`; the Barrier path neither reads nor changes Stage or semantic
authority.

Accepted Say successors, readiness retry, and temporary root suspension retain
the current mode identity while their old target/source/frame-bound attempts
become stale. When the current mode is non-`normal`, an accepted non-Say
boundary or empty publication instead pre-stages a fresh `normal` identity
after schema, preflight, and admission planning but before composite apply and
its synchronous listeners; an already-`normal` boundary preserves its exact
mode-state identity. A
non-applied result or throw restores the exact predecessor by CAS; a successful
apply performs no later mode write, so a listener-installed Say successor and
toggle cannot be clobbered. Mode issue and route share only the synchronous Say
callback claim as their reentry guard. They do not read, install, release, or
otherwise participate in the Say semantic-in-flight claim, so a pending
semantic Promise does not block a later mode toggle.

Bridge, application, and coordinator terminal state make the read projection
fail closed to `normal` and closes fresh issue and route ingress. The mode adds
no subscriber, notification, numeric revision, timer, clock, deadline,
remaining state, semantic dispatch, gameplay mutation, or persistent data. Its
strong bridge state stays O(1), with old identities retained only behind
caller-held attempt keys. The mode, attempts, results, and read method remain
source-relative and absent from the UI root, `./internal`, package exports,
generic Managed Surface contracts, Host/React/Web, and live Story integration.
Verification passed focused `2 files / 153 tests`, UI `79 files / 1152 tests`,
full `253 files / 4082 tests`, and `deno task check`. Browser `101 / 101`,
examples `45 passed / 2 skipped`, and prebuilt Player `38 / 38` remain prior
evidence and were not rerun. The superseded S4.1b.1b.1b.2b.3c broad checkpoint,
its S4.1b.1b.1b.2b.3c.0 docs-only entry, and S4.1b.1b.1b.2b.3c.1 are complete;
at that delivery checkpoint, current/next was the History-intent floor
delivered below.

S4.1b.1b.1b.2b.3d.1 now implements the dormant, source-relative History
exact-parent open-intent floor. Candidate preflight keeps the existing opaque
`historyObservationPort` unchanged for later History content integration and
separately requires one exact ordinary-object
`readHistoryAvailabilityInternalV1(): boolean` port. It descriptor-captures
the original receiver and callable into a private WeakMap and stores only a
fresh frozen zero-key handle in the admitted frame. Missing availability uses
the existing `narrative.required_port_missing` result with
`narrative.history_availability`; malformed or trapping adapters use the
existing candidate-preflight fault and allocate no stable publication state.

The existing physical admission remains the sole binding and route owner. It
can issue a frozen zero-key History attempt for each exact current ready-active
Dialogue parent kind: Say, choice, pause, custom, or `presentation_barrier`.
The attempt is privately bound to its issuing admission, the stable action
authority and direct-target proof, parent/source/frame, and captured
availability handle. Existing application, topology, Input, catalog,
publication, and gesture gates run before the family consumer and before any
spend. Mapping or cross-kind probes leave an authentic token unspent; a
correct `player.toggle_history` route spends once before its family
currentness and claim checks.

Availability invocation reuses the bridge-wide `sayCallbackClaim` and requires
the existing Say semantic-in-flight claim to remain empty, without installing
or clearing that semantic claim. The route rechecks the exact
admission/parent/source/frame/handle before and after calling the captured
receiver once. Callback-triggered replacement, suspension, disposal, or claim
drift wins as `stale`; otherwise exact `false` is the canonical `ignored`
result, throw or non-boolean is canonical `faulted`, and exact `true` creates a
fresh frozen zero-key intent plus exact `requested` result. Cleanup clears
only its own callback token by identity CAS. The Barrier carrier path neither
reads nor changes Stage acknowledgment, recovery, or semantic authority, and
the outer History route adds zero topology, runtime, semantic, gameplay, or
notification delta.

Attempts and intents are authenticated only by package-private WeakMaps; the
bridge and admission retain no current token or token history, so production
strong state stays O(1). This slice only mints the future exact-parent intent.
It does not expose an inspection/redemption method or perform a Coordinator
child transaction; S4.2 owns atomic revalidation, one-shot spend, and History
child prepare/open. All new port, handle, attempt, intent, result, and issue
spellings remain absent from the UI root, `./internal`, package exports,
generic Managed Surface APIs, Host/React/Web, and live Story wiring.

Verification passed focused `2 files / 189 tests`, UI `79 files / 1188 tests`,
full `253 files / 4118 tests`, and `deno task check`. Browser `101 / 101`,
examples `45 passed / 2 skipped`, and prebuilt Player `38 / 38` remain prior
evidence and were not rerun. The superseded S4.1b.1b.1b.2b.3d broad
checkpoint, its S4.1b.1b.1b.2b.3d.0 docs-only entry, and
S4.1b.1b.1b.2b.3d.1 are complete; at that delivery checkpoint, current/next
was the dormant S4.2 execution split and atomic History-child preparation floor
delivered below.

S4.2.1 now implements the dormant, DOM-free exact-parent History-child
preparation floor. A narrow reducer helper can pure-plan one transient
`preparing / child_open` instance whose `parentInstanceId` is an authenticated
stable ready-instance identity absent from the transient publication. The
ordinary reducer and generic Coordinator still cannot fabricate that
cross-axis link. The stable composite owns its validation against the exact
stable parent, shared application identity cursor, resolved single child slot,
owner/layer rules, and whole-composite topology policy.

One source-relative, first-claimant authority is retained per exact composite
kernel and reused only by the same Narrative-family claimant. It authenticates
the existing direct-target proof and current ready-active parent, builds and
validates the complete successor, and then uses the runtime kernel's existing
prepared-state install. The descriptor-captured commit guard receives one
fresh frozen zero-key candidate and may only perform the Narrative intent's
no-throw identity CAS from unspent to spent. A false, throwing, non-boolean,
stale, or faulted gate installs no state and spends no intent. On success the
generic candidate is authenticated after the guard wins but before state
assignment, so synchronous listeners cannot observe an installed child without
its committed capability state.

Cross-axis provenance remains structurally derived rather than introducing a
second topology store. Stable replacement preparation and readiness failure
retain the exact old parent plus History child. Successful cutover, greater
empty publication, publisher disposal, and Coordinator terminal disposition
retire the old parent and its cross-axis subtree in the same composite install;
the child is never promoted to a transient root or reparented to the successor.
Preparing children retire through the existing readiness-failure transition,
while ready children use the existing exact close transition.

The Narrative family exposes only a source-relative bridge-bound History-child
lifecycle. It revalidates the `.3d.1` intent, exact active bridge, stable action
authority, direct parent/source/frame proof, and existing callback and semantic
claims before planning. The kernel-keyed family claimant survives a same-kernel
bridge successor, while each lifecycle remains bound to its exact bridge so a
disposed predecessor and all of its intents stay stale. Only the prepared
install guard spends the intent. A successful call returns a fresh frozen
zero-key preparation through the closed `preparing` result; stale and faulted
rows are canonical. Listener reentry sees the spent intent, installed child,
and suspended parent as one boundary, and an immediate later retirement does
not rewrite the historical successful result.

This slice adds no Host lease, readiness API, History content observation,
close/dismiss/focus route, timer, React integration, generic Coordinator
operation, public receipt, barrel export, or live Story claimant. Attempts,
generic candidates, and Narrative preparations remain WeakMap-authenticated;
the kernel and bridge retain only current structural state and one per-kernel
claimant/authority, as exercised by 10,000 prepare/retire cycles.

Verification passed focused `4 files / 297 tests`, UI `79 files / 1211 tests`,
full `253 files / 4141 tests`, typecheck, lint, formatting, diff checks, and
`deno task check`. The first full test pass encountered one unrelated Engine
Lab Auto-mode timer timeout; that exact test passed in isolation and the full
suite passed on immediate rerun. Browser `101 / 101`, examples
`45 passed / 2 skipped`, and prebuilt Player `38 / 38` remain prior evidence and
were not rerun. The superseded broad S4.2 checkpoint, its S4.2.0 docs-only
execution split, and S4.2.1 are complete. At that delivery checkpoint,
current/next was S4.2.2, which the exact entry and implementation delivered
below split further.

S4.2.2.1 now implements the DOM-free Narrative session/readiness attachment
floor defined by the completed S4.2.2.0 exact entry. Each exact active
publisher bridge retains one frozen source-relative session and one exact
History-child lifecycle. A lifecycle created before the session is adopted by
that session; a same-kernel bridge successor receives fresh session and
lifecycle identities while reusing only the existing per-kernel
Narrative-family claimant. The standalone session module owns types only. The
family bridge remains the sole runtime owner of every private record and
factory.

The existing History prepared-install guard now authenticates and records the
opaque History preparation and the bridge-private eventual-session slot before
composite state assignment and synchronous notification. False, stale,
faulted, or losing gates register nothing. Root preparations are separately
memoized from the exact current stable preparing attempt. A session projects
only current opaque root and History preparations into a frozen root-first
vector of at most two entries. Repeated reads return the same cached snapshot
identity while that exact vector is unchanged; a real entry or order change
mints a fresh frozen vector and snapshot. History structural currentness covers
both the current ready root and a retained predecessor during replacement
preparation or failure without exposing generic candidates, readiness evidence,
instance IDs, renderer data, or a second topology store.

One composite subscription per session updates that cache and contains
subscriber failure. The getter also refreshes lazily, so a kernel listener
registered before the session still observes the preparation installed by the
same notification. If an earlier subscriber terminalizes the bridge, delivery
stops before later captured subscribers run. Bridge disposal fences the
session, lease, lifecycle, cached snapshot, and subscription before entering
the composite transition. An externally committed Coordinator terminal is
likewise detected by the observer and every authority-bearing session ingress,
closing the assignment-before-observer window without notifying session
subscribers.

`attachHostInternalV1` is still DOM-free: it owns only one logical Host identity
and a fresh exact lease generation for each same-identity reattach. A distinct
identity conflicts before kernel inspection. Release is idempotent and uses one
coalesced per-session microtask to clear only the still-released current
generation; it never settles readiness or mutates Surface, input, focus, or
topology. Session snapshots, preparations, leases, and old generations remain
WeakMap-authenticated with only bounded current strong slots. Root and
`./internal` public inventories reject every new type, factory, and member
spelling; no barrel, package export, React, action-route, stable-composite, or
live claimant changed.

Verification passed focused `3 files / 209 tests`, UI `80 files / 1222 tests`,
full `254 files / 4152 tests`, and the complete `deno task check`. Browser
`101 / 101`, examples `45 passed / 2 skipped`, and prebuilt Player `38 / 38`
remain prior evidence and were not rerun. S4.2.2.0 and S4.2.2.1 are complete.
At that checkpoint, current/next was S4.2.2.2, whose own exact
React/renderer/input/readiness entry still had to land before RED. At the next
checkpoint, that entry and its generic atomic substrate were complete, and
current/next was S4.2.2.2.2, followed by S4.2.3, S4.2.4, S4.2.5, S4.3, and S4b.

S4.2.2.2.1 now implements the DOM-free generic Host-commit atomic substrate
defined by the completed S4.2.2.2.0 exact entry. Contract-bound action routing
can reserve an inert binding against an exact router/context without replacing
the current logical binding. A frozen zero-key token carries the canonical
future input contract, and a source-relative prepared handle exposes only
one-shot commit, abort, and post-commit binding lookup. An authenticated
consumer may be claimed before commit. The commit itself performs only exact
token, slot, and expected-current checks plus module-owned pointer writes; it
does not call the router, registrar, gesture callback, action authority, or
consumer.

Each exact router/context retains one stable managed dispatcher, one logical
current record, and at most two latest-per-authority inert preparations. The
router owns one scalar publication-revision high-water, so aborts and stale
attempts burn gaps without rolling evidence back. The first registrar is
descriptor-captured only while creating that dispatcher; later registrar
properties are not read, and an initializing registrar that may already have
performed side effects poisons the bounded context rather than allowing a
second registration. Successful replacement clears all predecessor links,
while retired records remain reachable only through caller-retained opaque
handles. Direct untagged input still falls through, binding-origin input keeps
the existing routed/unhandled semantics, and a claimed same-event reentry can
enter the authenticated action/gesture/consumer gate only once.

Stable-composite readiness now has guarded root ready and failed settlement,
plus an independent same-claimant exact-parent transient-child readiness
authority for History. The pure successor supplies either a captured future
contract token or exact `null`; only a successful no-throw guard can precede
state assignment and synchronous notification. A separate History child action
authority captures only current ready input provenance. Ordinary generic
readiness, close, dismiss, History actions, and owner mutation against an
authenticated cross-axis child retain their existing stale-evidence precedence
but otherwise return `rejected / surface.invalid_transition` with zero state,
identity, cursor, binding, and notification delta. Claimed readiness and the
existing replacement, empty, publisher-disposal, and Coordinator-terminal
structural cascades remain the only applied paths.

Candidate provenance is WeakMap-authenticated by the live exact instance and
stores only its origin and bounded identity/evidence fields; it does not retain
a predecessor state or second topology. The stable dispatcher likewise remains
physically registered across logical replacement and terminal disposal while
the current pointer, gesture, and Coordinator ingress fail closed. Existing UI
characterizations now assert that boundary directly instead of using
per-binding unregister callbacks as a lifecycle owner. Prior Narrative cleanup
characterizations retire History through an allowed root cutover rather than
reopening the newly fenced generic readiness-failure path.

This delivery changes no public or `./internal` barrel, package export, generic
Coordinator operation/result/code, Narrative production source, React Host,
renderer, focus, timer, or live Story graph. Verification passed focused
`3 files / 119 tests`, UI `80 files / 1244 tests`, full
`254 files / 4174 tests`, and the complete `deno task check`. Browser
`101 / 101`, examples `45 passed / 2 skipped`, and prebuilt Player `38 / 38`
remain prior evidence and were not rerun. S4.2.2.2.0 and S4.2.2.2.1 are
complete. At that checkpoint, current/next was S4.2.2.2.2, the dormant
Narrative React Host slice, followed by S4.2.3, S4.2.4, S4.2.5, S4.3, and S4b.

S4.2.2.2.2 now implements that dormant Narrative React Host as a
source-relative `@sillymaker/ui` vertical without changing a public barrel,
package export, live Story composition, GameStage, CSS, or legacy Dialogue/VN
Host. Narrative candidate preflight descriptor-captures the exact two-method
History observation port into a frozen zero-key handle while keeping History
availability separate. The family-private render observation parses each raw
snapshot into canonical immutable `NarrativeHistoryV1` data, reuses identity
for equal canonical bytes, publishes a fresh copy for changed bytes, and owns
one captured raw subscription for the live History entry. Structural retirement
and terminal disposal unsubscribe once and fence caller-retained observation
handles without re-reading the raw port.

Each bridge-retained session now owns one shared cached Host render source in
addition to the earlier preparation-only readiness snapshot. The render source
derives its root-before-child order from the existing whole-composite state and
family provenance; it is not a second topology store. It preserves stable
render keys and entry identities across unchanged phases, retains the exact
root plus History subtree while a replacement prepares or fails, and publishes
at most the retained root, its History child, and one successor candidate.
Ready entries remain renderable after their preparation token retires, while
entry, observation, and action records are scrubbed as their structural
instances retire.

`createNarrativeStableHostRuntimeInternalV1` binds one exact session Host
generation to an explicit portal, InputRouter, and stable gesture callback. A
candidate root or History entry receives an inert prepared contract-bound
action binding and authenticated consumer before readiness. Its frozen
zero-key ready token prebuilds the exact per-entry focus registration outside
the transition. The existing guarded root settlement or separately claimed
History settlement then commits the prepared input contract, per-entry Host
generation, and the single current focus-ownership pointer before Surface state
assignment and synchronous notification. Failure restores the retained root
binding in the same guarded install and fresh-repairs any still-current sibling
candidate whose expected input pointer moved.

The dormant `NarrativeSurfaceHostInternalV1` renders only through the explicit
portal. It uses one module-level keyed History child and
`useSyncExternalStore` for both the shared render source and each History
observation. Preparing shells are layout-mounted but hidden, inert, and
pointer-disabled; suspended roots stay mounted and inert while the active
History child remains interactive. Renderer, observation, ref, layout, portal,
or ready-mint faults before accepted readiness settle that exact candidate
failed once. Faults after accepted readiness or a successful reattach are
re-thrown to the existing outer diagnostics owner.

StrictMode cleanup fences the old ready, action-consumer, and per-entry focus
generation synchronously while retaining only the logical binding and focus
target identities through one coalesced session microtask. A same-Host,
same-portal successor installs fresh per-entry attachments and returns
`reattached` without another readiness settlement, topology revision, input
publication, or notification. If no successor appears, cleanup fails any
preparing root first and History second, rechecking after each synchronous
notification, then terminal-fences the session, render source, action/focus
ingress, and caller-retained runtime handles before disposing the captured
bridge. Ready History `ui.cancel` and `player.toggle_history` remain
stable-consumed no-ops with exact zero topology change; S4.2.3 still owns their
future close/dismiss behavior and real focus transfer/restore.

All Host, ready-token, render-entry, observation, action, and focus provenance
remains WeakMap-authenticated with bounded current strong slots. A real 10,000
round release/reattach test rotates full Host runtimes while retaining one
render source and active snapshot, proving old runtime callbacks stale, old
attachments inert, and topology/notification identity unchanged before final
terminal cleanup. Root and `./internal` negative inventories reject every new
top-level and member spelling. Verification passed focused
`4 files / 238 tests`, UI `81 files / 1273 tests`, full
`255 files / 4203 tests`, typecheck, lint, formatting, diff checks, and the
complete `deno task check`. Browser `101 / 101`, examples
`45 passed / 2 skipped`, and prebuilt Player `38 / 38` remain prior evidence
because this path is dormant and does not enter the live composition graph.
S4.2.2.2.2 is complete. At that checkpoint, current/next was S4.2.3, whose
completed S4.2.3.0 exact entry split implementation into the generic exact
History-child lifecycle substrate delivered below and the dormant Narrative
close/input/root + History focus Host lifecycle.

S4.2.3.1 now implements the source-relative exact History-child lifecycle
substrate frozen by that entry. A separate
`ManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1`
is claimed by the same exact composite claimant as preparation, readiness, and
action, but it exposes only authenticated close and dismiss methods. The first
claimant remains exclusive, the same claimant receives the retained authority,
and a foreign claimant, cloned authority, stale candidate, or borrowed method
cannot mutate state.

Both preparing and ready History close use the authenticated reducer
`close_top` transition after exact current close-target validation; user close
does not masquerade as readiness failure and does not use the ready-only
`close_expected` route. Preparing dismiss uses exact-candidate fallback
dismiss, while ready dismiss uses routed dismiss. Each applied path validates
the exact receipt code and child instance, preserves the active stable parent
and any same-owner root replacement, derives the parent's nonnull future input
contract, and prepares whole-composite reflow before entering the install gate.
Only a successful frozen commit guard may commit that parent contract before
Surface state assignment and synchronous notification. Guard false is stale;
throwing or non-boolean guards are faulted; locked, stale, and faulted paths
leave state, allocation, input publication, and notification identity exact.

The existing generic protected-child fence remains unchanged: ordinary close,
dismiss, owner mutation, and action operations still cannot bypass the claimed
cross-axis child. Claimed readiness settlement and structural root cutover,
empty, publisher disposal, and Coordinator-terminal cascades remain separately
allowed. Listener reentry observes the restored parent and closed child as one
boundary, and a fresh child installed by that listener is not rewritten by the
historical outer result. Claim records remain weakly kernel-keyed and retain no
per-close token, topology, tombstone, or history, including through 10,000
lifecycle cycles.

This delivery changes only the stable-composite source/test pair and
`engine/packages/ui/src/public-api.test.ts`; it changes no reducer,
runtime-kernel, Coordinator, Narrative production source, React Host, public or
`./internal` barrel, package export, or live Story composition. Root and
`./internal` inventories reject all new top-level and member spellings.
Verification passed focused
`2 files / 78 tests`, UI `81 files / 1281 tests`, full
`255 files / 4211 tests`, typecheck, lint, formatting, diff checks, and the
complete `deno task check`. Browser `101 / 101`, examples
`45 passed / 2 skipped`, and prebuilt Player `38 / 38` remain prior evidence
and were not rerun because the path is still dormant. S4.2.3.0 and S4.2.3.1
are complete. At that checkpoint, current/next was S4.2.3.2, the dormant
Narrative close/input/root + History focus Host lifecycle delivered below.

S4.2.3.2 now completes that dormant lifecycle. Every exact History candidate
owns one source-relative `NarrativeStableHistoryChildControllerInternalV1`
whose identity survives preparing-to-ready and same-Host reattach but becomes
permanently stale on child retirement, cutover, terminal state, or detach.
Authenticated ready actions keep their existing managed publication, routing,
catalog, and gesture gates: `player.toggle_history` performs exact close,
`ui.cancel` performs routed-cancel dismiss, the outer action remains consumed
with `surface.action_routed`, and the lifecycle result stays inside the
consumer result. The controller never enters renderer or Story props.

Preparing History and the sole initial Dialogue fallback use one bounded
Host-generation managed input registration. A ready, failed, closed, released,
or terminal entry becomes logically inert before Surface assignment and is
then physically unregistered outside the transition guard. Exact History
close/dismiss prepares the surviving root input binding first; the generic
same-claimant lifecycle guard atomically commits that binding, current focus
ownership, physical admission, and child/fallback fencing before the Surface
assignment and synchronous notification. Locked, stale, and faulted paths
preserve publication identity and repair any superseded dormant candidate
binding without creating an input gap.

The dormant React Host now owns actual Dialogue and History focus containment.
Each entry has a focusable outer scope and a nested renderer shell: the current
preparing fallback can receive real browser focus and trap Tab on the outer
scope while the renderer remains hidden, inert, aria-hidden, and
pointer-disabled until ready. The Host keeps only the current root previous
owner and History opener, restores them in one coalesced microtask after exact
parent/successor/external-owner revalidation, and suppresses restoration on
cutover, true detach, application successor, publisher disposal, or Coordinator
terminal state. The source-relative pure
`isNarrativeStableHostRuntimeCurrentInternalV1` query checks only module-owned
runtime, lease, session, and bridge records before restore scheduling and again
at delivery; it adds no runtime object member or public export.

Escape respects the DevDock owner, backdrop dismiss requires an exact primary
same-pointer gesture and arms the existing Stage pointer fence before closing,
and the Host reuses the existing Narrative input isolation hook without
changing GameStage or live Story wiring. StrictMode reattach, focus faults,
listener reentry, fallback teardown, controller churn, and 10,000 lifecycle
cycles retain only topology-bounded action/focus/controller/DOM records and one
physical fallback registration.

This delivery changes exactly the Narrative family, session, and Host
source/test pairs plus `engine/packages/ui/src/public-api.test.ts`. Root and
`./internal` inventories reject every new top-level and member spelling; no
barrel, package export, GameStage, Web, Story, or live composition file changes.
Verification passed focused `4 files / 263 tests`, UI
`81 files / 1306 tests`, full `255 files / 4236 tests`, typecheck, lint,
formatting, diff checks, and the complete `deno task check`. Browser
`101 / 101`, examples `45 passed / 2 skipped`, and prebuilt Player `38 / 38`
remain prior evidence and were not rerun because the Host is still dormant.
S4.2.3.2 is complete. At that checkpoint, current/next was S4.2.4, whose
completed S4.2.4.0 exact entry split player timing delivery into the generic
prepared state-install participant substrate delivered below, the DOM-free
Narrative DialoguePlayerController core, and dormant Host player-view
integration.

S4.2.4.1 now supplies that generic participant substrate across all three
runtime-kernel assignment paths: ordinary transient transitions, direct state
transitions, and prepared-state commits. One source-relative claimant installs
a frozen exact participant. For each real state change, planning first derives
the exact previous and next states under the existing transition lock; the
participant then prepares outside the lock, revalidates state, install
generation, participant identity, and its own exact prepared value after the
lock is reacquired, commits logical controller fencing before the sole state
assignment, and completes physical cancellation or scheduling only after the
full existing listener vector returns.

Prepared-token authentication and initial currentness still precede every
participant callback. Post-prepare state or participant drift, including an
A-to-B-to-A identity cycle, is stale; participant descriptor, validation, or
logical-commit faults preserve exact-zero state and notification effects.
Existing operation-guard false and throwing behavior remains compatible:
false aborts the authenticated participant, while a throwing guard aborts once
and rethrows the original error. Terminal assignment permanently fences the
claim before listeners while still allowing that historical transaction to
complete once after notification.

The stable-composite wrapper reaches the generic runtime only through its
existing private configuration alias; it does not extend either frozen kernel
shape or create a reverse package dependency. One weak registry stores a
kernel-keyed claim record and a participant-keyed owner token with no reverse
kernel reference. The token permanently prevents participant transfer across
kernels while allowing an abandoned nonterminal kernel to be reclaimed; a
terminal record scrubs claimant, participant, and callback references. No
participant vector, prepared-identity tombstone, module-owned append-only
install history, or second composition authority is retained, including
through 10,000 sequential installs. Caller-retained unconsumed opaque prepared
tokens and their expected/next state records remain the explicit existing
exception; consuming a token releases its record.

This delivery changes exactly the runtime-kernel source/new test pair, the
stable-composite source/test pair, and
`engine/packages/ui/src/public-api.test.ts`. Root and `./internal` inventories
reject every new top-level and member spelling; no public barrel, package
export, reducer, InputRouter, Coordinator, Narrative source, React Host, or
live Story composition changes. Verification passed focused
`3 files / 129 tests`, UI `82 files / 1357 tests`, full
`256 files / 4287 tests`, typecheck, lint, formatting, diff checks, and the
complete `deno task check`. Browser `101 / 101`, examples
`45 passed / 2 skipped`, and prebuilt Player `38 / 38` remain prior evidence
and were not rerun because this package-internal substrate has no live
composition wiring. S4.2.4.0 and S4.2.4.1 are complete. Current/next is
S4.2.4.2, the DOM-free Narrative DialoguePlayerController core, followed by
S4.2.4.3, S4.2.5, S4.3, and S4b.

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
S4.1b.1b.1b.2b.1a adds the dormant physical Say reveal-first controller and
admission path described above. S4.1b.1b.1b.2b.1b adds the clock-free
content-auto path on that same controller. S4.1b.1b.1b.2b.2a adds the dormant
normal Stage-to-Narrative Barrier acknowledgment claimant described above.
S4.1b.1b.1b.2b.2b.1 adds the bridge-owned settle/replay recovery generation,
attempt, and unsupported-result floor described above. S4.1b.1b.1b.2b.3a
applies the Dialogue catalog corrective described above, while retaining the
generic input action and legacy live characterization. S4.1b.1b.1b.2b.3b.1
adds the captured optional voice replay route on the same physical admission
and shared Say callback fence. S4.1b.1b.1b.2b.3c.1 adds the bridge-owned
Auto/Skip identity, authenticated toggle, atomic reset, and fail-closed terminal
floor described above; the superseded broad `.3c` checkpoint and docs-only
`.3c.0` entry are historical. S4.1b.1b.1b.2b.3d.1 adds the captured History
availability route and future exact-parent intent floor described above; the
superseded broad `.3d` checkpoint and docs-only `.3d.0` entry are historical.
The superseded broad S4.2 checkpoint and S4.2.0 docs-only entry split dormant
execution into independently mergeable floors. S4.2.1 adds the exact-parent
cross-axis reducer plan, composite prepared-install authority, structural
retain/cascade, and bridge-bound History intent redemption described above.
S4.2.2.0 then freezes the Narrative session/readiness split, and S4.2.2.1 adds
the retained DOM-free session, opaque preparation snapshot, single Host lease,
and terminal fencing described above. S4.2.2.2.0 then freezes the Host-commit
split, and S4.2.2.2.1 adds the prepared action binding, guarded root/History
readiness, cross-axis generic fence, and stable dispatcher described above;
S4.2.2.2.2 adds the dormant Narrative Host, canonical History observation,
cached render source, guarded action/focus commit, and StrictMode-safe portal
lifecycle described above. S4.2.3.0 freezes the exact History lifecycle split,
and S4.2.3.1 adds the same-claimant exact-child close/dismiss authority,
guarded parent input restoration, and preserved ordinary generic fence
described above. S4.2.3.2 adds the candidate-bound Narrative History
controller, managed fallback teardown, actual root/History focus lifecycle,
physical dismiss fencing, and terminal-safe restore query described above.
S4.2.4.0 freezes the exact Dialogue-player timing split, and S4.2.4.1 adds the
generic prepared state-install participant, stable-composite private claim,
ABA-fenced logical commit, post-notification completion, and bounded terminal
ownership described above. Current/next is S4.2.4.2, the DOM-free Narrative
DialoguePlayerController core, followed by S4.2.4.3, S4.2.5, S4.3, and S4b.
Player rendering integration and the live migration remain planned work; the
source-relative Host does not alter the live Host data flow until those slices
and their behavior tests land.
