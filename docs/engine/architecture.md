# SillyMaker architecture

状态：持续维护的现状文档。最后结构性复核：2026-08-01。

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

`@sillymaker/base/runtime/internal` is the narrow cross-package seam for engine
workspace composition that cannot use `src/**` imports. It is consumed only by
`@sillymaker/web`, is absent from ordinary Base/runtime barrels, and is guarded
by negative consumer type tests. It is not a Story API; before any npm
publication, internal export visibility needs an explicit audience policy.

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
The maintained synthetic migration entry proves that later executable
migrators can join this same collection seam without creating a production
migration registry early.

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
Import/load validates bytes, schema, identity, references, and invariants before
replacing the live replay anchor. Internal indexes, clients, closures, React
values, and database handles must not enter a Save.

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

Workspace Overlay is the first live Managed Surface family. A Story declares
validated Overlay definitions and a renderer resolver, then sends
`openPrimary`, `pushDetail`, `closeTop`, or `closeAll` intents through the
composition facade. The UI-owned Coordinator is the sole writable topology,
input, focus, instance, and readiness authority; the facade's snapshot is an
immutable compatibility view, not a second store. Admission completes before
topology mutation. Initial and child preparation use a code-native blocking
fallback, replacement keeps the existing surface until the candidate is ready,
and application-epoch rotation fences late readiness during load, import, HMR,
or another successor. The epoch is presentation/runtime fencing only and never
enters a Save. System dialogs and Narrative have not yet migrated to this
lifecycle kernel.

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
application-epoch fencing, and transition-kind readiness. Workspace Overlay is
its first live pilot and exposes only definitions, renderer resolution, intents,
and an immutable compatibility view to Stories; stable-target reconcile and the
System/Narrative migrations remain planned work. Target documents do not alter
the current data flow until each migration and its behavior tests land.
