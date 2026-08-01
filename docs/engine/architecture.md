# SillyMaker architecture

状态：持续维护的现状文档。最后结构性复核：2026-07-31。

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

| Package                 | Workspace public entries                                                                     | Responsibility                                                                                                                                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@sillymaker/base`      | `.`, `./authoring`, `./runtime`, `./story`, `./testkit`; workspace-only `./runtime/internal` | Contracts, the Story prelude and authoring kit, deterministic resolution, authoritative sessions, persistence orchestration, replay, diagnostics, the agent port, and reusable behavior-test helpers.                                                                               |
| `@sillymaker/tooling`   | `.`, `./project` + subentries, `./vite` + subentries, `./identity/*`                         | Non-browser project and Story CLI, Vite assembly, build identity, JSONL agent protocol/client, and package-internal Desktop preview packaging/local-server tools. Never imported by Base or browser bundles.                                                                        |
| `@sillymaker/ui`        | `.`, `./assets`, `./debug`, `./diagnostics`, `./styles.css`; workspace-only `./internal`     | React shell, GameViewport, UI composition and default GameRoot, stage, characters, assets, interaction/input, overlays, narrative, settings, semantic/presentation bridges, recovery UI, and the published global theme stylesheet.                                                 |
| `@sillymaker/web`       | `.`                                                                                          | Browser Host, IndexedDB record storage, files/images, Desktop-channel HTTP record/file adapters, `startWebGameApplicationV1`, mounting, routing, pointer input, capabilities, automation, Loader, and HMR rebootstrap.                                                              |
| `@sillymaker/story-e2e` | `.`                                                                                          | The neutral Engine Conformance Story (Engine Lab, `e2e/`): gameplay modules, narrative script, presentation catalogs, semantic actions, and application composition used to validate engine contracts.                                                                              |
| Story packages          | `.` per package                                                                              | `template/` (the minimal starter, MIT) and `examples/*` (bookshop, cat-cafe, silly-os) each compose one self-contained application project (`sillymaker.config.ts` + `vite.config.ts`); the root `project.config.ts` only lists their directories for repository-level aggregation. |

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

The current validator checks unique State ownership and an acyclic module
dependency graph. A Story's aggregate State should reflect the modules it
actually composes; unused modules should not force placeholder State.

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
