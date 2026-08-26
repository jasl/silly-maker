# SillyMaker architecture

状态：持续维护的现状文档。最后结构性复核：2026-08-25。

本文描述当前实现的主要边界和数据流。它不是冻结 ABI；修改包职责、权威状态、Story
组合、持久化格式或公开入口时，应同时更新本文、相应类型和行为测试。

默认 web/core production floor 已完成 PF0–PF7 stabilization。2026-08-24 的初始
Complexity Reset 与当前 follow-up 继续简化预发布 workspace 合同和
package-internal collaboration；被取代的成员会直接删除，不保留 shim 或双轨。
Save/wire 与 authoritative semantics 未改变；PF6 broad harness 经 Cat Cafe 真实作者
纵切复审后没有激活。
当前执行顺序不由这份 live architecture 拥有，统一以
[production-floor sequence](plans/2026-07-30-production-floor-sequence.md) 为准；本文只随已落地
能力更新。Desktop durability/packaging 仍是独立 preview lane。
独立 Composition/State strangler experiment 已完成 X0–X6.3 与 X7 性能证据；curated promotion
把 Composition 收口为 maintained internal capability，State façade 继续 experimental。它验证了
本节的 single-authority 和 direct-plan 边界，但没有把 State 接入 production Story flow，也没有
激活 State Format V2、Effect Broker/OpenUI、i18n 或 production migration。
Application Runtime AR0–AR5 主线已交付当前 Host/activation/authoring/Agent fake、Browser
lifetime、Author graph structural exclusion 与 local performance evidence。Deno Desktop 已保留
package-private、explicit、default-off 的 HMR candidate 并通过指定 canary characterization，但
maintained Desktop HMR workflow 仍独立 defer 到首个包含目标语义的 stable 上重新验收；Desktop
Authoring/Agent Host 的 R1/R2 也仍未接线。该条件性 Desktop activation defer 不排序或阻塞其他
engine/product lane。
Authoring Workspace Focus & Navigation 曾交付 closed manifest、Host-owned focus 与单一可见
workspace；Scale/Scene Object/Modular GUI M5 已以 clean break 取代该产品外形。当前维护面是
standalone/embedded Inspector：它复用 Authoring Host、document session、structured operations、
CAS/history、source IO、persistent R1 publication 与 private companion seam，但不保留旧 Studio
route、rail、五 workspace、binding 或兼容层。M0–M5 的静态 content plane、State hot plan、增量
authoring index、core/outer GUI 边界、Authoring Scene source/compiler 与 Inspector-first surface
均已落地；该轮没有激活 Desktop HMR。

## 1. System context

SillyMaker 是面向 Browser 与 Deno Desktop 的 GUI 应用和游戏引擎；headless 只服务开发、测试、
conformance 与自动化。仓库内的 Story 包（旗舰示例《雨巷猫舍》等）是使用它开发的具体游戏。
引擎提供可组合的规则运行时、权威 Session、存档/诊断、React presentation 和 Host adapter；
Story/application 提供具体 State、Command、规则、查询、内容、Semantic Stage 和应用组合。

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
Story；UI 和 Web 可以依赖 Base；具体 Story/application 可以依赖三个引擎包。实验性的
`@sillymaker/state` 目前只依赖 Base；`@sillymaker/composition` 依赖 State 的中立组合契约并
直接拥有其 package-internal lifecycle kernel，State 不反向依赖 Composition。State façade 与
Composition profile/state bridge 尚未进入上图的 Story/application production flow；Composition 的
workspace-only private extension runtime 只进入产品显式选择的 first-party lazy contribution graph，
ordinary no-extension application 会从最终依赖图完全排除它。实验性的 `@sillymaker/agent` 只依赖
Base 和 React peer，只有 workspace-private `./internal` entry。Inspector core publication 与 embedded
surface 只依赖中立的 package-private single-companion bridge；显式
`@sillymaker/studio/internal/agent` entry 才引入 Agent client/Host/renderer。Template 的完整 generated
Author-entry graph 保留 Authoring Host、Inspector 与 dev-source implementation，同时排除 Agent/
RPC/experimental Agent modules；Engine Lab 的 selected private companion graph 包含它们作为 positive control。
Studio package 为该 private opt-in entry 仍声明 `@sillymaker/agent` workspace dependency，因此这项保证是
final module/source graph structural exclusion，不是 package installation 或 public ABI 保证。

## 2. Package responsibilities

| Package                   | Workspace public entries                                                                                                                                                                                                                                                                                | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@sillymaker/base`        | `.`, `./application-bootstrap`, `./authoring`, `./gui-composition`, `./host`, `./runtime`, `./story`, `./strict-json`, `./text-content`, `./values`, `./testkit` + testkit subentries; workspace-only `./runtime/internal`                                                                              | Contracts, the Story prelude and authoring kit, deterministic resolution, authoritative sessions, persistence orchestration, replay, diagnostics, lease-owned text/Scene/Narrative runtime units, the static `sillymaker.gui-composition` document/admission contract, the agent port, and reusable behavior-test helpers. The focused contract entries let GUI-only applications avoid pulling the authoritative Game runtime through the root barrel.                                                                                                                                                                                                                                                                                                                                                                                                             |
| `@sillymaker/agent`       | workspace-only `./internal`                                                                                                                                                                                                                                                                             | Experimental transport-neutral RPC client and deterministic fake, bounded cross-process admission, observable Agent GUI/session Host, retained `UiArtifact` revisions, admitted `UiIntent`, and the closed React renderer. It has no root/public entry and owns no real backend/protocol, persistence, tool execution, source/Game writer, OpenUI/A2UI adapter, or external effect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `@sillymaker/composition` | `.`, `./legacy`, `./state`; workspace-only `./internal/extension-runtime`, `./internal/mod-runtime`                                                                                                                                                                                                     | Maintained internal cold-path façade for typed plugins, profiles, services, registries, direct-plan compilation, authoritative registration sealing, live reload, reversible staging-safe in-process lifecycle effects, and the neutral State-module registry bridge. Its selected private Direct extension runtime owns build-known factory activation and disposal for explicit lazy contributions. The private Mod runtime cold-compiles one application-generation's build-known active set through application-owned extension points and reuses that lifecycle. Neither entry is a stable public Mod SDK, and no dynamic Context is part of a supported entry.                                                                                                                                                                                                |
| `@sillymaker/state`       | `.`, `./legacy`                                                                                                                                                                                                                                                                                         | Experimental neutral State Runtime, StateModule, StateTransaction, and StateWorkflow compatibility façade. Runtime and authoring adapters reuse the exact Base Session and transaction runner; `./legacy` exposes the same raw composition/runtime control for migration equivalence work. It is not a production Story runtime or a second persistence/replay owner.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `@sillymaker/tooling`     | `.`, `./project` + subentries, `./vite` + subentries, `./identity/*`                                                                                                                                                                                                                                    | Non-browser project and application CLI, Vite assembly, build identity, JSONL agent protocol/client, the dev-only Authoring Scene/Motion/source ports and Inspector page plugin, and package-internal Desktop preview packaging/local-server tools. Never imported by Base or ordinary Player bundles.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `@sillymaker/studio`      | `.`, `./composition`; workspace-only `./internal/agent`                                                                                                                                                                                                                                                 | The dev-only Inspector, Authoring Host, and standalone/embedded shells. It owns virtualized Authoring Scene and layer/object navigation, real-renderer preview plus authoring ghost overlays, bounded transform/appearance/order edits over the shared document session/CAS/history, read-only facets and Motion/Timeline scrub, persistent R1 publication, and a package-private neutral single-companion bridge. `./internal/agent` explicitly selects Engine Lab's experimental Agent and is absent from the core Authoring graph. Vite serves the standalone Inspector route and a lazy embedded launcher; Player and ordinary runtime never import Inspector/source-write implementation. The old Studio workspace shell is not retained.                                                                                                                      |
| `@sillymaker/ui`          | `.`, `./assets`, `./code-surface`, `./debug`, `./debug/dev-source-client`, `./diagnostics`, `./input`, `./native-behavior`, `./reference`, `./reference/dev-dock`, `./reference/settings`, `./styles.css`, `./viewport`; workspace-only `./internal`, `./code-surface/internal`, `./reference/internal` | React shell, the single-owner GameViewport (fit/fluid/single-axis expansion plus container layout variants), UI composition and default GameRoot, stage, characters, assets, interaction/input, overlays, Narrative/WholeCanvas presentation, generic System/settings hosts, semantic/presentation bridges, recovery UI, the development-conditional source client, and the published global theme stylesheet. The focused `./code-surface`, `./input`, `./native-behavior`, and `./viewport` entries let neutral GUI products select only their actual presentation owners; `./code-surface/internal` owns GUI-composition unit residency. The root entry does not re-export optional Code Surface/reference implementations. The focused `./reference/*` entries form the explicit copy/eject-friendly DevDock plus preset settings surface.                      |
| `@sillymaker/web`         | `.`, `./gui-application`, `./reference`; workspace-only `./internal/application-startup`, `./internal/application-build-identity`, `./internal/application-hmr`                                                                                                                                         | Browser Host, IndexedDB record storage, files/images, Desktop-channel HTTP record/file adapters, admitted Browser/Deno Desktop startup, same-origin build-known runtime-byte loading, one application-owned addressable-readiness seam, neutral `startWebGuiApplicationV1`, Game-owning `startWebGameApplicationV1`, mounting, routing, pointer input, capabilities, automation, neutral build-known outer-UI binding, and private opt-in BuildIdentity/HMR rebootstrap coordination. `./gui-application` is the focused GUI-only entry and imports no Game Session, Save, Story, automation, persistence authority/orchestration, or HMR owner; the neutral Host record/file adapters remain available to applications. `./reference` explicitly binds the reference DevDock/settings surface and its lazy Direct-backed contributions; core Web never imports it. |
| `@sillymaker/story-e2e`   | `.`                                                                                                                                                                                                                                                                                                     | The neutral Engine Conformance Story (Engine Lab, `e2e/`): gameplay modules, narrative script, presentation catalogs, semantic actions, and application composition used to validate engine contracts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Application packages      | `.` per package                                                                                                                                                                                                                                                                                         | `template/` (the minimal game starter, MIT) and `examples/*` (bookshop, cat-cafe, silly-os) each compose one self-contained application project (`sillymaker.config.ts` + `vite.config.ts`). The root `project.config.ts` only lists their directories for repository-level aggregation. A small tooling-owned application fixture—not a published example—keeps GUI-only startup and final-graph conformance independent of product content.                                                                                                                                                                                                                                                                                                                                                                                                                       |

Cross-package imports use package exports and declared `workspace:*`
dependencies. Application-only composition may stay internal to a Story package
when no other package should consume it.

### Runtime layers and dependency direction

The runtime is organized in three layers. These are supported-entry and final-graph
boundaries, not a rule that every workspace package occupies exactly one layer.
Dependencies point downward; a lower entry never imports a higher one:

1. **Platform-neutral kernel** — Base State, Session, commands, Save/replay,
   diagnostics, and generic semantic contracts. This layer has no React, DOM,
   browser, Desktop, Inspector, DevDock, settings UI, or Agent dependency.
2. **GUI/game runtime** — presentation, Stage, input/focus, assets, the maintained
   Browser Host, and the package-private Desktop-preview ports needed by an
   application or game.
3. **Outer capabilities** — Inspector and source IO, reference DevDock
   and settings UI, Agent/RPC adapters, and other product-selectable support.
   Products may compose, replace, or copy these without moving their lifecycle
   or UI implementation into the kernel.

In the current graph, `@sillymaker/base` and the experimental State facade form
the platform-neutral floor; focused Base contracts, `@sillymaker/ui/input`,
`@sillymaker/ui/viewport`, `@sillymaker/ui/native-behavior`,
`@sillymaker/ui/code-surface`, and `@sillymaker/web/gui-application` form the
smallest maintained neutral GUI runtime. The core `@sillymaker/ui` and
`@sillymaker/web` entries add the complete game runtime. `@sillymaker/ui/debug`, the focused
`@sillymaker/ui/reference/*` and `@sillymaker/web/reference` entries, Inspector,
Agent internals, and Tooling are outer capabilities. Composition is a selected
cold lifecycle service: it can build a direct plan for a GUI or outer product,
but its lifecycle/registry machinery does not enter command, reducer, input, or
render hot paths.

The data flow follows the same direction: an owning Host or public authoring
entry converts external input into typed data once; cold composition compiles
that data into direct plans; internal command, reducer, input, and render paths
trust those plans. Platform detection, parsing, schema work, descriptor checks,
and recursive object traversal do not belong in those hot paths.

Story packages own their static text payload, compact manifest and pack-selection
boundaries. The starter keeps only bootstrap/UI copy resident, ships dialogue as
two `assets/content/*.text-pack.json` files, and keeps its source-aware Flow/text
join under `src/tooling/**`; ordinary Player builds never import that authoring
projection.

### Data and trust boundaries

- Host input and other untrusted bytes, files, URLs, HTTP payloads, and
  cross-process records are bounded, parsed, validated, and converted once per
  value at their owning ingress. A later Host, callback, or RPC result is a new
  input value, not a reason to re-admit the prior typed representation. Save,
  wire, RPC, and digest boundaries retain strict admission and atomic failure;
  CAS, lease, generation, and currentness remain operation-time identity fences.
- Public Story and authoring declarations are normalized and validated once at
  admission. Their package-internal consumers then trust the resulting typed
  representation instead of repeating schema, prototype, descriptor, accessor,
  thenable, or object-authenticity defenses.
- Package-internal TypeScript collaborators are trusted. Runtime values follow
  ordinary JavaScript semantics and `DeepReadonly` is a supported type-level
  contract; recursive freeze/clone layers do not compensate for deliberate
  casts, Proxy tricks, or monkey-patching.
- Cold configuration, registration, and composition compile direct plans that
  are treated as immutable. Command, reducer, selector, input, and render hot
  paths use those plans directly: they do not perform descriptor/schema
  admission, recursive freeze/clone, dynamic service/profile/registry lookup,
  or platform branching. This does not remove the operation-time currentness
  checks above.

### Host and module-update ownership

Add a Host adapter only when a Browser, Deno Desktop, or future platform
difference would otherwise change an engine/application-observable result; pure
API-shape differences stay inside the owning Host implementation. Do not mirror
every platform API behind an engine abstraction. Vite and Deno each own their
file watching, HMR, and module graph; React Fast Refresh likewise remains
framework behavior. For module updates, SillyMaker owns only the admitted
application response: R1 binding continuity, R2 Game/Session replacement and
authoritative handoff, or R3 full-page recovery.

The Deno Desktop development candidate remains package-private, explicit, and
default-off. It is deferred until a stable Deno containing the required behavior
passes the maintained revalidation; that defer neither promotes Desktop HMR nor
blocks Browser or engine work.

### Maintained internal composition kernel

`@sillymaker/composition` is the only SillyMaker plugin façade. Each mounted
profile creates one admitted staging record and one composite disposer; public
plugins receive only the typed façade scope. Profile admission validates the
whole graph before setup, setup registers only façade-owned services, registry
entries, and reversible effects, and `compileDirectPlan` resolves them once into
ordinary direct objects/functions. Command, reducer, selector, and frame paths
therefore do not perform lifecycle-context or registry lookup.

Authoritative profiles are permanently sealed against further registration by successful mount. A legacy
application is exposed as a cold factory: profile setup captures dependencies
without creating a Session. State-backed consumers call
`activateStateApplicationV1`, which first compiles the admitted State modules,
then activates the factory and finally creates the application/Session; a State
compile failure leaves that factory inactive. Live profiles use a different
kernel: a candidate first mounts completely, then a required consumer publisher
acknowledges it while the exact previous snapshot and providers remain current;
only that acknowledgement replaces the snapshot and retires the predecessor. A
disposer covers in-process resources and application leases; it does not claim
to reverse an external Host, network, LLM, or database write. Candidate effects
are installed by the completed mount before publication and coexist with their
predecessors during acknowledgement, so live effects must be staging-safe and
fully reversible. Exclusive cutover resources are not supported yet. The kernel
can roll back the candidate profile; preserving or restoring a consumer that
partially mutated before rejecting remains the trusted publisher's obligation.

The distinct workspace-only `./internal/extension-runtime` entry owns the
selected private Direct lifecycle for build-known domains and contributions. A
neutral factory can mount directly or through an activation controller;
required domain/local-binding admission happens before mount, while optional
sibling failure and retry remain isolated. The backend owns nested children,
reversible effects, generation fencing, and idempotent async disposal, then
hands the owner a direct consumer object. It never publishes UI, replaces a
Session, chooses a Module Update Source, or enters command/render hot paths.
Direct and Cordis-core-derived implementations both passed the same historical
17-case suite; Direct was selected as the only maintained backend, and the
Cordis adapter/vendor were deleted.

The maintained runtime consumer is Engine Lab's lazy DevDock contribution: its
explicit `@sillymaker/web/reference` outer composition keeps a literal loader,
while the dynamic facade imports the contribution implementation and Direct
backend together. The reference DevDock publishes the accepted registry before
announcing optional-ready and removes a visible contribution before retiring its
lifecycle. The old Studio Flow lazy workspace was removed with M5; this does not
remove the accepted Direct extension runtime or Narrative Flow projection.

The separate workspace-only `./internal/mod-runtime` is a cold application
composer over that same Direct lifecycle. Its catalog admits build-known data
identity or a literal code loader; only the explicitly selected, immutable active
set is loaded, dependency-ordered, checked against application-owned typed
extension points, and compiled before any lifecycle child mounts. Unknown targets,
kind/collision errors, missing/cyclic dependencies, load errors, and compile errors
reject the candidate before publication. A lifecycle setup failure uses Direct's
existing rollback and leaves the predecessor application generation untouched.
The resulting owner exposes only ordered active identity, direct compiled point
values, and disposal. The application decides whether and how active identity
enters its existing BuildIdentity/simulation digest.

This runtime does not discover packages, resolve a public Mod graph, hot-install
or restart an active set, execute arbitrary post-release code, own State/Save/
digest, or sandbox trusted same-realm JavaScript. Code loaders and extension-point
compilers are cold, resource-free staging functions by contract; any reversible
resource belongs in the existing Direct lifecycle. Products that do not select
this private entry remain complete and structurally exclude the Mod and Direct
implementation modules.

The dev-only Inspector Vite entry and embedded author surface consume the same
private Authoring Host implementation. Each mounted shell has one Host owner;
separate browser tabs do not pretend to share an in-memory instance. The Host owns
the current Authoring Scene document session, selection, dirty/undo/redo state,
CAS/conflict handling, source IO and close participant. The Inspector owns only
view-local search, scroll/zoom and virtualization state. Its fixed-row scene and
layer/object windows keep mounted rows proportional to the visible window plus
bounded overscan rather than project size. The standalone route and lazy embedded
shell render the same Inspector implementation and retain their source IO owners
across compatible R1 candidates. Neither shell receives an authoritative gameplay
Session or State writer.

The Vite dev-sources layer owns one separate, lazy Project Authoring Index per
configured application server. Its first list request performs one all-family
tree walk and admits each matching Authoring Scene (`*.authoring-scene.json`),
low-level Scene (`*.scene.json`), Motion, Regions, or Chrome document once,
retaining only path/id/label/source-kind metadata or a named skip. All list
consumers share that stable snapshot; app-root watcher events and successful
CAS/create writes invalidate only the affected path. Selected document GET/CAS
operations continue reading the complete payload directly from disk. The current
Inspector Authoring Scene port filters the shared index to `authoring_scene` and
reads/writes that selected source through its CAS boundary. Lower-level family
ports may serve code/data workflows, but no current Studio workspace is implied. One-shot
application CLI checks reuse the enumeration/admission implementation without sharing
the dev-server instance. This is tooling discovery, not another Story, document,
or runtime authority.

### Authoring Scene compile and runtime boundary

An application chooses exactly one source authority per scene in
`sillymaker.config.ts`: `authoring_scene` names an explicit JSON source and
package-import specifier, while `low_level_scene` keeps an ordinary
`SceneDocumentV1` module. Tooling does not infer authority from file existence or
the import graph, and the two paths are not synchronized. The starter Template
opening is the first release consumer of `authoring_scene`; the current Inspector
opens that authority directly. Low-level Scene remains the advanced hand-authored
source authority and is not synchronized or silently migrated.

The Authoring Scene source boundary reads bounded bytes, performs one Strict JSON
and schema/value admission, and returns a normalized hierarchy plus JSON-pointer
source map. The compiler then trusts that typed IR. Ordered layers contain ordered
root object trees; `objectId` is also the runtime Stage tag, group objects may
carry transforms without producing entries, and visual objects lower by per-layer
depth-first preorder into dense z-order. Parent/local transforms are composed once
with deterministic integer/permille rounding. The compiler result is deliberately
split:

- `runtimePlan` contains only `sourceKind: "authoring_scene"`, the existing
  low-level `SceneDocumentV1`, and ordered layer IDs;
- object targets, closed binding references, inspection data, JSON-pointer source
  locations, and catalog-backed hit-region/Motion/Timeline/GUI/intent facets stay
  authoring-side and never enter State, Snapshot, Save, or the Player plan.

Vite intercepts only the exact configured authoring specifier and emits an
in-memory module containing that runtime plan. The checked release graph contains
the virtual runtime module but excludes the source JSON, compiler, and the
non-Vite Deno tooling fallback. `sceneFromAuthoringRuntimePlan` materializes the
existing Scene accessors without a second admission or a second live Scene
database.

Authoring paint authority is explicit: ordered layers, then each layer's DFS
preorder. The compiler assigns dense z-order, while the authoring facet projection
reverses the catalog's bottom-to-top region sequence into an explicit
topmost-first `pointerPickOrder` (therefore later regions of one object are picked
before earlier ones). Keyboard focus remains owned by the existing Stage
input/focus and catalog/DOM order; it is not inferred from z-order. The Stage
reconciles accepted authoring order with ordinary atomic `setLayerOrder` and
`setZOrder` mutations. A same-set layer permutation is valid; a changed/duplicate
set or missing entry rejects the complete batch. Browser R2 may run that ordinary
command only after exact Save + lease adoption, preserving hidden cue targets and
gameplay-owned placement/appearance. No DOM-only reorder becomes authoritative.

Inspector preview renders the compiled scene through the real
`SemanticStageHostV1`. Authoring inspection bounds keep off-canvas, transparent,
and non-visual group objects selectable through dashed ghost overlays; selecting
an object can also reveal its projected rectangular or polygon hit regions. This
overlay is not a second Stage or runtime geometry authority.

The publication owns one persistent visible React root. Every R1 Inspector-binding
candidate first renders in an inert, `aria-hidden`, visibility-hidden,
offscreen but document-connected staging root and acknowledges an exact layout-
effect commit; synchronous `root.render()` is never acceptance. A connected
layout failure is therefore rejected before the visible root is touched. Only
an accepted candidate is rendered into that existing visible root, preserving
its DOM, compatible component-local Inspector state, Host identity, document
session, selection, and dirty history. A synchronous visible render-factory
failure can rerender the predecessor plan without replacing that local state;
candidate plus rollback failure poisons and disposes. This narrow proof does not
promise that arbitrary nondeterministic visible effects can always be reversed.
The staging root proves document connection and layout-effect success, not
user-visible paint or exact on-screen geometry; future geometry-sensitive tools
must still declare and test their stronger readiness. Standalone/embedded teardown
removes descendants before lifecycle disposal.

Embedded mode may select exactly one package-private companion definition on its
typed Inspector binding. Core publication sees only a neutral compatibility ID,
content signature, owner factory, renderer, and async disposer; Agent types stay
behind the explicit private Agent entry. Compatible R1 candidates reuse the same
companion owner, while a changed compatibility ID or content signature rejects
before owner replacement. If candidate and visible rollback rendering both fail,
the terminal publication poisons once and retires the companion and Authoring
owners once. This is a single selected sibling seam, not a registry, public plugin
surface, or Mod ABI.

The embedded shell is activated from the resident dev-only launcher and stays
mounted while merely hidden. Its independent application-focus owner keeps
editable keyboard/input out of gameplay, and dirty close uses the same Host
Authoring Scene participant for save/discard/cancel. A CAS
`digest_conflict` refreshes the saved bytes/digest while preserving the current
draft and history for explicit retry. This does not add another source writer:
all saves still use the existing dev-source port and the source document remains
the single authoring authority.

Authoring Scene editing inside that shared session passes through the package-
private structured-operation stack. One revisioned operation boundary normalizes
and admits UI or non-UI requests; internal collaborators trust that typed envelope.
A pure reducer produces a re-admitted Authoring Scene document or a stable
diagnostic; one executor then conditionally installs
the result into the existing session/history. The session exposes an opaque,
session-local document-successor identity and monotonic draft revision so both
UI and non-UI local callers reject stale work atomically before reduction and
again at installation. UI envelopes carry the receipt matching their rendered
draft: a canvas gesture advances only through its own successful receipts and
stops when a sibling edit wins. Transform, existing appearance values, visual
content, sibling object order, and layer order may coalesce
only inside one focus/gesture run identified by its starting revision;
structural and reference edits remain individual steps. The local adapter
exposes neither source paths nor IO/save/HMR capability. Component creation,
group-to-visual conversion, writable hit-region/interaction authoring and an
editable Blueprint/Timeline remain outside this bounded surface. Read-only source,
compiled-layer, hit-region, Motion, Timeline and intent facets plus scrub consume
the compiler sidecar without entering State or Save. This seam is not a
package export, remote protocol, persisted operation log, gameplay command bus,
or second document/State authority.

### Experimental private Agent/RPC seam

`@sillymaker/agent/internal` is the only live Agent package entry. Its raw transport is a
small connection/request callback boundary; the client above it owns observable
`unconfigured/disconnected/connecting/ready/unavailable/disposed` status and
`start/submit/cancel/reconnect` calls. The deterministic fake implements that exact raw
transport rather than a separate test Host. It supplies controllable unconfigured, slow,
offline, failed, and ready connections plus late-record injection, so connection disposal,
retry, and lifecycle fencing remain deterministic without a network or provider. A raw adapter
must settle submit before forwarding that `(sessionId, runId)` tuple's first stream record;
wire-order inversion is the adapter's bounded-reordering responsibility.

Every raw RPC request, response, and stream record crosses Base's bounded canonical-data
projection before exact schema admission. The client keys each submitted run by
`(sessionId, runId)` and accepts only that tuple's next contiguous positive sequence; a
`runId` may recur under another session. Duplicate, gap, unknown-tuple,
old-connection, superseded-connect, and post-dispose input becomes a stable diagnostic or is
fenced before a Host observer sees it. A connect replacing a request-failed connection closes
the predecessor first; reconnect likewise closes and replaces without replaying requests.
This is local resource ownership, not remote transaction rollback.

One Agent Host then owns the GUI/session snapshot, current run, transient draft, diagnostics,
and a bounded local history of retained Artifact revisions. Local cancel first retires the
streaming run from acceptance, so deliberately late completion cannot publish. A malformed or
unknown successor marks only that run/draft invalid and retains the predecessor revision;
remote `run_failed` terminates both the active run and any streaming draft, fencing later
records. Reopening a retained revision performs no request or tool invocation. These records
do not enter gameplay Snapshot, Save, CommandLog, replay, source persistence, or the extension
runtime.

The current `UiArtifact` vocabulary is closed to admitted plain-data `column`, `text`, and
`action` data with unique node IDs and product-allowlisted action IDs. The React renderer does
not resolve HTML, JavaScript, arbitrary components, functions, or module URLs. It emits an
exact Host/Artifact/node/action `UiIntent`, which is re-admitted against the current revision.
Engine Lab's explicit private Agent companion decorates its typed Inspector binding with one fake
client factory and pre-admitted AR2 Scene operations. The embedded surface keeps Artifact actions
inert until it captures the Scene document identity and draft revision; if Artifact arrives first, a later
Authoring revision may pair that same Artifact before enabling interaction. Applying a current
intent uses the same Scene executor as human UI, while a later human edit makes the old
envelope stale rather than rebasing it.

This is a dev-only Engine Lab vertical slice, not a public Agent product surface. It has no
real transport/backend/LLM, wire-protocol promise, Agent persistence, tool/permission system,
OpenUI/A2UI adapter, Effect Broker, public Agent ABI, or Desktop HMR. Chromium and WebKit physical
HMR retain three contract-level cases: an incompatible Authoring R1 candidate rejects and a
compatible retry succeeds while the dirty Authoring sibling and explicitly selected held Agent stay
usable; a shared presentation change publishes Player R2 plus Authoring R1 without losing the dirty
draft; and an Application identity change performs R3 reload and recovers an actionable GUI. This
Browser layer deliberately does not inventory internal panel, Host, run, connection, Artifact, or
DOM-node identities.

Headless Web R2 separately proves that a post-retirement successor UI-start failure and later valid
retry do not rebuild or reconnect the Agent; jsdom proves terminal candidate-plus-rollback failure
retires the companion owner, and ten repeated Agent activate/dispose cycles return connections,
subscriptions, and late publications to zero. These layers do not claim that every failure or
rollback has a physical Browser proof. Template and Engine Lab ordinary Player measurements assert
Agent/RPC absence, while the complete Template Author-entry measurement supplies the stronger
authoring-product negative control described above. The Deno Desktop adapter remains package-private,
explicit, default-off, and unpromoted after its selected-canary characterization. Only its activation
as a maintained Desktop HMR workflow remains deferred to stable source-and-behavior revalidation;
the AR5 mainline is delivered, and this independent defer does not order unrelated work.

The one-off AR5 paired runner produced dated same-machine evidence, then was
removed by the AR0–AR5 Complexity Reset together with its fixed ordering,
thresholds, and decision schema. The maintained GUI startup benchmark instead
measures one selected application and reports raw GUI-readiness and
first-interactive timings plus environment facts. It neither compares revisions
nor makes a promotion decision; a threshold requires a separately accepted,
continuing product budget.

The profile-kernel and extension-runtime lifecycle implementations are private
to the composition package; no supported public package declaration or Story
import exposes a dynamic Context.
Composition boot identity is diagnostic-only in X1-X4 and is not included in
Save `simulationDigest`.

The external X6.2/X6.3 workload validates the same boundary at larger scale
without becoming a repository dependency. Its State schemas capture one admitted
Narrative node-integrity catalog before Session creation. Concrete effect, gate,
scene, and target registries are admitted by one cold environment; the compiler
and runner then retain only typed data, one runtime node index, choice maps,
and direct gate/effect functions. Production simulation and semantic consumers
call that singleton runtime rather than looking up a registry or lifecycle
Context. Compatibility exports remain exact aliases, so this evidence does not
introduce a second State or Narrative authority.

### Experimental neutral State facade and module pilot

`@sillymaker/state` is the implemented X4 strangler seam, not a production
promotion. `createStateRuntimeV1` accepts a neutral `StateRuntimeDefinitionV1`,
invokes Base `createGameSessionV1` exactly once, and returns a `StateRuntimeV1`
whose only owned runtime member is the exact physical Session under the neutral
`StateSessionV1` type. It does not proxy or spread that Session and does not keep
a second State, digest, status, queue, or CommandLog. The bridge constructs the
Base runtime input field by field and directionally type-checks the physical
Session as a neutral Session; it no longer relies on a whole-definition or
whole-Session cast that could hide a new required Base field.

The explicit `@sillymaker/state/legacy` entry returns the same runtime together
with the exact Base `GameSessionCompositionV1` and
`GameSessionRuntimeControlV1`. This entry exists for equivalence tests and
incremental migration work; wrapping or reconstructing those authorities would
break its contract. Base still owns the implemented physical Snapshot,
whole-Snapshot digest, CommandLog, Save/persistence, migration, and replay
semantics.

That legacy entry also owns the only neutral-to-GameSimulation authoring seam.
`createLegacyGameplayModuleBindingsV1` normalizes each physical binding once
through Base's public constructor, explicitly rebuilds every stateful/stateless field,
attaches the legacy aggregate command Schema, and returns the mapped tuple.
Story migration code therefore does not spread a neutral descriptor or cast
hidden Base binding fields. This adapter is deliberately absent from the
neutral State root.

X5 adds neutral `StateModule`, capability, `StateTransaction`, and
`StateWorkflow` contracts. Their adapter creates one Base authoring kit and
delegates composition and execution to its existing transaction runner; it does
not keep another event journal, candidate State, RNG, queue, or commit path. The
admitted module captures its `contractRevision`; a package-private symbol carries
the exact Base authoring module into the cold composition path. The adapter does
not re-authenticate the shape or construct a second module authority. Module initializers
in V1 are deliberately bootstrap-independent, while aggregate candidate
validation remains the only neutral invariant hook. Each module declares a
disjoint owned State slot and pure reducers keyed by domain-event kind; exact and
parent/child slot overlap fails during cold composition. A transaction reads the
command-start State without read-your-writes; the workflow rejects before
emission or emits events that are admitted by its `eventSchema`. Base
cold-compiles event kinds to ordered subscribers, then folds events in emission
order and, within one event, subscribed reducers in UTF-16 module-ID order.
Repeated events fold through the owner's running proposal; each touched owner
validates once and all touched slices materialize through one batched
aggregate-State copy. Events without a reducer remain journal-only evidence.
Rejection or fault atomically preserves the command-start Snapshot and RNG. The original
`calendar`/`inventory`/`actor`/`evening` pilot proves a cross-module event commit,
workflow rejection rollback, and candidate-validation fault rollback. It is an
engine fixture, not commercial game content. There is still no module-keyed State
Format V2 or migrated production Story composition.

The repository's neutral Composition/State benchmark composes 16 generated
modules through these same public seams. Its 3x3 Save-size/touched-owner matrix,
retention-crossing replay, isolated import/export, and process-isolated GC cells
all continue to use the exact Base Session and transaction runner. The benchmark
adds neither production instrumentation nor another persistence/replay owner;
absolute wall-clock and heap observations are local trend evidence only.

`@sillymaker/base/runtime/internal` is the narrow cross-package seam for
engine-owned implementation that cannot use `src/**` imports. Web consumes its
Host composition seams, while UI consumes only the bounded canonical projection
needed by the composition-owned Managed Surface kernel. The Base seam is absent
from ordinary Base/runtime barrels and guarded by negative consumer type tests.
These internal paths are not Story APIs; before any npm publication, internal
export visibility needs an explicit audience policy.

`@sillymaker/ui/internal` is the equivalent Host-only composition seam. Web
uses it to inject the realm-stable Managed Surface epoch allocator and the
validated hosted Narrative/WholeCanvas environment. Stories use the ordinary UI
exports: `NarrativeSurfaceDefinitionV1`, `defineNarrativeSurfaceV1`,
`WholeCanvasSurfaceDefinitionV1`, `defineWholeCanvasSurfaceV1`,
`createWholeCanvasApplicationSourceV1`, and their renderer/source types. They
cannot reach Overlay, Narrative, or WholeCanvas lifecycle internals through the
public composition facade. The former `@sillymaker/ui/conformance` entry was
removed at production promotion; raw family, session, bridge, player, lease,
attempt, readiness, Host, and Stage-binding authorities remain package-private.

Implementation anchors:

- Base root exports: `engine/packages/base/src/index.ts`
- Base runtime exports: `engine/packages/base/src/runtime/index.ts`
- Composition facade exports: `engine/packages/composition/src/index.ts`
- Composition legacy factory exports: `engine/packages/composition/src/legacy.ts`
- Composition State bridge exports: `engine/packages/composition/src/state.ts`
- State facade root exports: `engine/packages/state/src/index.ts`
- State legacy adapter exports: `engine/packages/state/src/legacy.ts`
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

### Static text/content plane

Large static text is presentation content, not authoritative State. A Story
may put a `TextContentManifestV1` in its resolved presentation and declare the
same manifest plus bootstrap catalogs and build-known initial/required pack IDs
on `WebGameApplicationV1`. The manifest owns one default locale, an explicit
acyclic fallback graph, and logical pack descriptors. Each pack has one stable
`packId` plus build-known locale variants whose `runtimePath` is app-root-relative
under `assets/**`; manifest revision plus the sorted locale/fallback/pack/variant
topology forms its digest. Exact payload byte length,
SHA-256 and a declared localized-entry count are deliberately not descriptor
fields: a sibling receipt cannot authenticate an editable passive payload and
would turn ordinary translation or local content edits into metadata churn.
Each physical variant is an exact `sillymaker.text-content-pack` V2 object
containing `format`, `version`, `packId`, `locale`, and `entries`.

Base owns this data boundary. `admitTextContentPackV1` performs one bounded
Strict JSON parse, then one wire shape, pack/locale identity and entry admission;
it derives the actual entry count from the admitted variant. The exported
`textContentPackJsonLimitsV1` sets a 16 MiB per-variant byte
ceiling plus structural limits; larger content should be split along ordinary
pack/load boundaries instead of maintaining an exact expected-size receipt.
`createTextContentSessionV1` fixes one manifest/generation for the runtime
session, single-flights each physical variant, permits retry after a failed
flight, and returns one independent logical-pack lease per acquire. The default
variant closes every Text ID; translated variants may be partial but cannot add
IDs. `activateLocale` stages only the active locale/fallback chain for currently
demanded packs and atomically swaps the presentation owner; failure or an older
superseded request retains the predecessor. Last release removes that pack's
parsed variants and indexes; dispose fences late loads. Synchronous lookup sees
bootstrap plus currently leased packs through the current fallback chain. It
creates no second State, Save, cache authority, asynchronous command path,
database, or streaming service.

Web owns the Host seam. Its default loader resolves the selected variant against
`document.baseURI`, requires the current GUI origin, fetches bytes, and hands
them to Base. The application declares `initialPackIds` plus deterministic
`requiredPackIdsForInvocation` and `requiredPackIdsForSnapshot` planners. Web
binds their preparations through the package-private
`bindCoreApplicationReadinessOptionsInternalV1` boundary:
initial packs precede Core instance creation; an admitted semantic invocation
prepares its packs, in invocation order, before command construction/dispatch;
a validated persistence load/import candidate prepares its packs before
bind/commit; an R2 rebootstrap candidate does so before takeover/install. UI and
automation therefore keep using the same semantic port, while Save-surface
load/import keep using the same Persistence replacement boundary. A candidate
whose content preparation fails never replaces the old State. The DevDock State
tuner may conservatively prepare the whole manifest only after `debug_tools +
cheats` is current and before patching; execution still rechecks capability.
Product load/import does not prepare every pack by default. A failure therefore
leaves the current semantic/Stage publication unchanged instead of allowing a
command or replacement to commit with unavailable copy. Authoritative execution
and `resolveText` remain synchronous and I/O-free; Story UI does not own a
parallel content gate. This is one Web-to-Core readiness binding over the
existing semantic, Persistence, R2, and debug authorities, not a new facade,
public Base Host/loading API, or raw Base State dependency.

The Web-owned Player profile selects its persisted locale before acquiring the
initial packs. Later `updatePreferences({ locale })` waits for Text activation
and publishes/persists the preference only after the atomic owner switch;
unsupported or unavailable persisted preferences report a Host failure and retry
the initial packs under the manifest default. Locale remains Host/presentation
preference and never enters gameplay State.

The complete manifest's revision and sorted locale/fallback/pack/variant-path topology
participate in the resolved presentation digest, while pack payload and
loaded-session indexes do not enter Snapshot or Save. Changing manifest topology
therefore produces the existing presentation-identity digest change. Editing
passive text bytes at the same logical location does not change that identity or
add a Save compatibility warning; a rebuilt presentation source may still change
the Story digest through its existing source identity. There is no additional
Save field or migration path. A loaded pack is not hot-replaced within that runtime
session, so a refresh/restart creates a new session and reads edited bytes.
During development, `deno task check:assets` resolves each
opted-in Story and admits all of its declared packs from that application's own
root; Vite serves and copies them through the existing `/assets/**` pipeline.
There is no generated payload-receipt/currentness workflow. The Web readiness
owner currently retains every pack it prepares for the life of that Web start;
this conservative first consumer supports exact release at successor/application
dispose but does not claim current-chapter-only logical-pack residency. Within
those demanded packs, locale activation retains only the active fallback chain
apart from the short-lived predecessor/candidate overlap; it does not retain all
locale payloads or create another text store.

### Addressable runtime units

Large applications split runtime content along type-owned boundaries instead of
placing an entire project in the startup module graph. Base's Scene unit manifest
maps stable Scene IDs to literal build-known loaders for the existing
`sceneSources` compiler output; admission checks the loaded Scene identity and
activates the existing direct `AuthoringSceneRuntimeV1`. Narrative units keep a
stable `{ unitId, nodeId }` control position, local graph plus public entry
points, explicit cross-unit edges, and typed Scene/GUI/text/asset dependencies.
Manifest construction closes Narrative targets, while application composition
closes those typed dependencies against the other owning manifests. Loaded
Story control plans remain opaque to Base.

GUI composition residency stays behind `@sillymaker/ui/code-surface/internal`.
It uses Web's same-origin byte transport for one Strict-JSON composition and one
literal catalog import, then invokes the existing Code Surface compiler. React
children and their CSS remain literal imports owned by their definitions and do
not need another module loader. Assets likewise stay with the existing exact-
demand Asset Registry; M2 only made a settled failed/aborted load retryable while
preserving successfully loaded URL caching.

Each type-specific owner has its own manifest, schema, compiler, diagnostics and
plan. A small package-private residency primitive shares only application
generation, single-flight, load/admit/activate timings, independent leases,
last-release retirement, failed-flight retry and late-result fencing. It is not
a universal content object, registry, LRU, prefetch scheduler, Worker pool or
cache service. Once ready, command and render paths retain the direct typed plan
and perform no manifest lookup, schema admission, dynamic lifecycle lookup or
network/file I/O.

Literal dynamic imports do not escape application identity. The maintained
Story BuildIdentity owner accepts explicit additional roots for a simulation or
presentation facet and follows their ordinary import closures. Engine Lab lists
its addressable Narrative and Scene wrapper modules there; both Authoring Scene
sources retain the existing raw-presentation plus semantic-simulation records.
Manifest identity therefore stays compact and topology-only while live code and
semantic source bytes remain owned by BuildIdentity and its existing R2 policy.

`WebAddressableRuntimeDefinitionV1` is the application-owned Host seam. Web
creates it once per start, provides same-origin runtime-byte loading, awaits its
opening units before Core construction, and composes its admitted-invocation and
replacement-Snapshot preparation with the existing single Core readiness hook.
Its typed execution context reaches live execution and authoritative replay, so
the same plan authority is used in both. A non-`undefined` execution-context type
makes the Core option and Web `addressableRuntime` declaration statically
required; contexts that include `undefined` retain the no-runtime form.
Startup/preparation failure disposes the candidate and leaves the prior
authoritative publication unchanged.

Engine Lab is the first small Browser consumer: opening readiness dynamically
loads procedure Scene plus calibration Narrative; `lab.begin_drill` prepares the
drill pair before dispatch; replacement uses the stable Narrative cursor; and an
exact query activates one GUI composition. Its generation deliberately retains
visited Scene/Narrative leases until dispose because existing authoritative
replay is synchronous. General sessions support earlier release, but M2 does not
claim browser ESM/CSS physical unload, automatic current-only eviction, LRU,
prefetching or a replay-preload framework.

### Runtime Inspector projection

The dev-only Inspector consumes an optional application-owned
`RuntimeInspectorSourceV1`; it does not discover or own runtime units. The source
projects stable Scene, Narrative, GUI, and Text identities, current committed
references, owner/status, attempt/failure, raw acquisition timing, diagnostics,
dependencies, working-set counts, and an explicit retry only for an already
failed acquisition. Asset IDs remain dependency references owned by the Asset
Registry rather than invented Inspector units. Selection is local read-only UI
state and never acquires a unit.

Engine Lab's projection reads the existing type-specific owners. Its active
owner can expose all build-known summaries, while staging and retired owners
retain only units with actual acquisition history. Without a subscriber it marks
the snapshot dirty in O(1) and materializes the directory only on demand. The Web
Text bridge likewise reports one changed pack ID and performs an O(1) lookup;
unchanged absolute rows are no-ops, so a live successor does not republish the
complete manifest once per untouched descriptor. These projections neither admit
the already-typed plans again nor enter command, replay, or render execution.

Code Surface plans carry a static diagnostic facet for declared source,
parent-slot/application layout ownership, authoring/state-owner hints, and
input/native-text/portal cooperation. Optional lifecycle callbacks report the
real Suspense loading, React mount/release, and node-local fault boundary. The
mutable projection changes synchronously, while one React effect wave coalesces
subscriber materialization and notification into one microtask; an explicit
`getSnapshot` still reads the current wave immediately. When no observer is
installed the ordinary render path adds no lifecycle effects. This is
observation, not DOM/component/listener/module inventory or a same-realm sandbox.

An embedded Inspector shares the Player realm and can observe the live source.
The separately loaded standalone Inspector intentionally shows detached static
manifest summaries and a zero working set; SillyMaker does not add a cross-realm
protocol merely to make that page appear live. A future product that needs live
remote inspection must own a separately accepted RPC boundary.

Repository applications keep the simulation definition in a dedicated
simulation-definition module (`src/game/simulation-definition.ts` in the
by-authoring-object story layout — game/content/scenes/story/ui/application;
the Engine Lab rig keeps flat `src/simulation-definition.ts`). That module owns the materialization and
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
derives its whole-Snapshot digest, and returns detached typed attempts or a low-level
receipt. A successful migrated replacement installs that non-durable receipt in
the Session while one prepared commit updates Persistence/autosave, CommandLog,
and Session before publication; failures preserve the prior authorities and
receipt. Engine Lab configures the maintained revision 3/4-to-current 5 chain.
Its three checked-in canonical records and Cat Cafe's revision 1 record form the
explicit supported release corpus; they do not claim capture from a historical
public release or imply support for any unlisted identity.

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
materializes both facets, derives technical provenance, and returns a normalized
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
local queries, domain-event reducers over their own slice, and invariants.
Stateless modules may provide named pure capabilities.

`defineGameSimulation` combines the selected module tuple with aggregate schemas
and Story-owned behavior:

- bootstrap and initial-State factories;
- gameplay and debug command executors;
- `createQueries(State)`;
- read-only typed game ViewModel projection.

Story-owned `createBootstrapInput` is a composition-root/Host ingress adapter,
not an authoritative transition callback. Standard Core creates one detached
canonical projection, parses its RNG seed, and passes that admitted typed value
to the root and stateful-module initializers. Construction, queued restart, and
the extension initial-Snapshot helper share this path. A failure cannot acquire
or replace Session, replay-base, or persistence ownership; queued restart also
retains its HMR/currentness fences. Internal consumers trust the admitted value
without a second validation or recursive freeze.

Commands are canonicalized once at real runtime ingresses: public Session
dispatch/Debug control, public `CommandLog`, and authoritative replay. The
Session passes the resulting detached command to its trusted Simulation
callback and internal CommandLog. Direct calls to package-internal resolved
Simulation collaborators are ordinary typed calls, not a separate hostile-input
surface. Authoritative replay preflights the complete source/command vector
before driver creation. These gates do not change public canonical JSON,
digest, Save, Debug Bundle, or replay bytes.

After a resolved Standard Core executor returns, Session finalization trusts its
typed event and RNG evidence while retaining the real result-branch,
candidate-Snapshot RNG/run-integrity, non-commit Snapshot identity, and
Debug-outcome constraints. Emitted events were already admitted once at
`transaction.emit`; each rejected reason is normalized once through the Story's
`rejectionSchema`, and Debug validation errors are likewise normalized at their
own callback boundary. Core does not canonically traverse the complete attempt
again. The public low-level `GameSession` still strictly admits arbitrary
executor evidence, and the public low-level `CommandLog` independently admits
commands/evidence and keeps its full digest audit. The Session-owned internal
log trusts the finalized attempt. Both paths retain source/Debug-outcome rules,
Snapshot identity, digest continuity, ordinals, and eviction. Additional public
CommandLog metadata is canonicalized once after rejecting engine-field
collisions. Internal typed records use ordinary JavaScript field access rather
than descriptor authentication or one-shot global handoff stacks.

The current validator checks disjoint State ownership (including parent/child
overlap) and an acyclic module dependency graph. A Story's aggregate State
should reflect the modules it actually composes; unused modules should not force
placeholder State.

The Game Authoring Kit transaction runner journals `transaction.emit(event)`
calls in the Story's explicit emission order (each event validated once against
the Story's `eventSchema` at emit time). Cold composition maps every event kind
directly to its UTF-16 module-ID-ordered subscribers. After `complete()`, the
engine folds the journal in event-major order without scanning unrelated
modules, retains one running proposal per touched owner, validates each proposal
once, and materializes all touched slots through one sparse aggregate-State
copy. The engine then runs the optional `validateCandidate` cross-slice
invariant hook, finalizes evidence (the committed envelope carries the event
journal), appends CommandLog, and only then installs/publishes a committed
Snapshot. It does not reparse the whole candidate through the aggregate State
schema.
Authoritative replay runs the same executor/order. The comparator is
package-internal and Host-locale-independent; it is not the Unicode code-point
comparator used by canonical JSON keys.

Authoritative monitors are the declared parallel-timing vocabulary on top of
that pipeline: `parseMonitorDeclarationsV1` admits `{ id, everyMs, retention,
event, activeWhen }` declarations once (unique ids, positive cadence, `clear` |
`retain`, a `kind`-bearing domain-event payload, an authoritative-state
predicate — no lifecycle verbs, no script body), `parseMonitorAccumulatorV1`
admits the plain `{ [monitorId]: accumulatedMs }` slice that lives inside
versioned Story State (Saves keep a mid-gauge accumulation; wall clocks never
enter), and `settleMonitorsV1` is the shared handler arithmetic the Story's
single time-verb command applies after folding the pending hold: declarations
advance in declaration order, threshold crossings reuse
`countThresholdCrossingsV1`, and each crossing yields one declared event
payload that the handler emits through the ordinary `transaction.emit` writer
— so monitors gain no second write path and batch splits cannot change the
terminal Snapshot or digest.

The Host half of that loop lives in the composer: a `WebGameUiDefinitionV1`
may declare `timeReporting` (a report quantum, an `enabledWhen` predicate over
the live publication, and a dispatch that sends the Story's unfenced time
command) and `realtimeWindow` (a publication predicate for reaction spans).
`startWebGameApplication` installs presentation pacing from those
declarations: a session time reporter (`createSessionTimeReporterV1` in
`@sillymaker/ui`) batches the composed presentation clock — rate-scaled,
freeze-aware — into whole-millisecond unfenced ticks while the predicate
holds, no hold is pending (holds report through the fenced expiry controller),
and the document is visible; and the presentation rate port pins the effective
rate to 1× (`pinRealtime`) while a `pace: "realtime"` hold or a declared
realtime span is active. Wall-clock instants stay inside the Host; authority
only ever consumes reported integer milliseconds.

The authoritative runtime value is a `GameSnapshot`:

```text
GameSnapshot = Gameplay State + serializable RNG state
             + command sequence + run integrity
```

Gameplay State remains plain, versioned, schema-validated data. RNG is
serializable and transaction-local so a rejected or faulted attempt cannot
silently consume randomness. Command logs and the emitted domain-event journal
are diagnostic evidence, not a second source of State.

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
then admits every captured command before constructing the driver. The engine
does not recursively freeze these admitted command/replay trees or installed
Snapshot/publication trees. The driver
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
  -> read-only typed SemanticPublication
  -> RuntimePresentationPublication
  -> React renderer
```

The semantic port previews and dispatches Story-specific semantic invocations at
the Session queue boundary. UI, browser automation, and presentation code
consume projections and semantic descriptors; they do not receive a Snapshot
setter or a generic gameplay-State client.

The Base application composer (`defineCoreGameApplicationV1` /
`resolveCoreGameApplicationV1` / `createCoreGameApplicationInstanceV1`)
distinguishes the author definition, the resolved typed definition, and the
disposable application instance that owns the live Session, persistence lease,
listeners, autosave policy, and an instance-local presentation anchor/epoch.
Definitions may declare Story extensions (`createExtensions`) — diagnostics
services, DebugBundle codecs, debug tooling — that the composer constructs with
a controlled context and disposes with the instance. The testkit harness and
headless applications compose on it; direct low-level construction remains
available as an escape hatch.

Maintained games boot through `startWebGameApplicationV1`: each supplies one
`WebGameApplicationV1` declaration (core definition, projector, UI slots,
overlays, labels, input maps, DevDock loaders), and their ordinary product
entries contain no Session, Persistence, Diagnostics, Input, Automation, or HMR
construction. The web game composer owns the persisted capability session, the
pointer/keyboard/gamepad adapters, the capability-gated automation bridge, the
DebugBundle UI-context binding, startup diagnostics, and disposal. The Vite
entry producer installs a dependency-free static shell plus one inert serialized
`{ revision: 1, entry: "runtime", target: "browser" }` config before the
application module runs. The Web reader parses and admits a fresh typed receipt
after module execution begins. The Desktop response replaces the exact
serialized config with `target: "deno_desktop"`; runtime admission rejects a
target/Host-marker mismatch. Inspector owns the corresponding `author`/`browser`
config/read receipt and a mount root separate from its startup shell;
`author`/`deno_desktop` is not supported.

Neutral GUI-only products boot through the focused
`@sillymaker/web/gui-application` entry and one `WebGuiApplicationV1`
declaration. `startWebGuiApplicationV1` reuses the same admitted runtime target,
accessible startup shell, first-product commit, React mount, Web Host, viewport,
input/native-behavior owners, page lifecycle, Desktop target consistency, and
normal close drain. It deliberately does not create a Story/Game Session,
Snapshot, Save or lease, semantic gameplay, automation bridge, rebootstrap
controller, or second renderer runtime. Host wrappers remain semantically
neutral; each product owns its landmarks and accessible application structure.
A small tooling-owned `storyEntry: null` application fixture exercises this
entry through the real Vite assembly and Chromium/WebKit startup. Its final
receipt excludes the Base/UI/Web root barrels as well as all omitted Game and
outer-capability owners. The website console separately consumes GUI Composition
and Input as a visible Astro island; it does not stand in for this Host contract.

The shell publishes independent Host evidence for required-domain readiness,
accepted optional capabilities, and the first real React layout commit. A
terminal startup or presentation failure restores the shell with a bounded
diagnostic code and Retry action without exposing the private error. Optional
DevDock readiness is acknowledged only after the still-active consumer validates
and publishes the contribution registry. These signals are Host/DOM evidence;
they do not enter State, Save, digest, replay, or CommandLog.

`installWebGameApplicationHmrV1` remains an opt-in composer helper: it fences a
predecessor, transfers its persistence disposition, starts the successor on the
same Host/root, and installs the successor module's next boundary. Engine Lab is
the first maintained, deliberately dev-only R2 consumer. Its Vite identity owner
injects the current real `BuildIdentity` into the composition module. When an
owned R2 input changes, the plugin refreshes that identity and returns the
invalidated, literal-self-accepting composition module. If the original changed
module also reaches the loaded Inspector binding through Vite's live importer graph,
that exact module remains a second propagation root so its new bytes reach the
Authoring R1 boundary; unrelated deep Scene/simulation modules remain filtered.
The plugin normalizes every compared and looked-up module path at the Vite
boundary, so Windows separators cannot bypass injection or candidate lookup.
The composition resolves the candidate provenance synchronously and hands it to
the Web composer. Product Stories do not inherit this boundary merely by using
Vite. Vite React Fast Refresh remains a separate framework-owned path for
eligible component-only presentation modules, without a SillyMaker atomic
publication/handoff guarantee. Application-only changes keep Vite's normal
propagation; if such a change reaches composition with an unchanged R2 tuple,
the boundary requests R3 instead of silently swallowing it.
The current module-update classification is:

| Class | Browser                                                                                                                                                                                                                                                                                                                                                                                     | Deno Desktop                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R0    | Inspector Authoring Scene read, refresh, and CAS admission update one existing authoring document session; Motion sources feed read-only scrub. Low-level Scene/Regions/Chrome ports remain tooling data paths but have no current Studio workspace. A saved Authoring Scene change also recompiles its configured virtual module and follows the product's ordinary R2/R3 update boundary. | The static Player shell has no author/source update path.                                                                                                                       |
| R1    | Standalone and embedded Inspector-binding HMR use an inert/offscreen, document-connected staging root followed by one persistent visible root. Eligible component-only Player modules may also use Vite React Fast Refresh.                                                                                                                                                                 | Not wired.                                                                                                                                                                      |
| R2    | Engine Lab and Cat Cafe each own a literal composition self-accept boundary with real owner-injected `BuildIdentity`; the Web composer transfers an exact Save + lease pair and replaces Game/Session on the same Host/root. Engine Lab's sibling Authoring Host remains mounted.                                                                                                           | Not wired.                                                                                                                                                                      |
| R3    | Product applications without an admitted R2 boundary, config changes, Fast Refresh-ineligible changes, and otherwise unclassified changes use Vite full-page reload. A normal persisted Save may recover; in-process identity is not retained.                                                                                                                                              | Built static `dist/` changes require rebuild and Host relaunch. Preview records may recover Save; durable drafts, an author entry, and production persistence are not promised. |

The current Web R2 coordinator invalidates and retires the predecessor before it
starts the admitted successor. A failure before replacement leaves the existing
domain/anchor untouched; a start failure after retirement follows terminal
recovery and does **not** claim to restore the gameplay predecessor. Authoring
remains a sibling outside that Game root in either case, but this is not a
transactional predecessor-rollback guarantee for Game R2.

The Browser R2 coordinator now transfers one package-private exact encoded Save
and released lease fence. Core reuses the existing migration/adoption pipeline,
atomically establishes the Session/Persistence/CommandLog replay base, and gates
publication on writable `n + 1` takeover; retry can use only a proven-current
Save/fence pair. Focused Core/Web tests cover those semantics. Engine Lab and
Cat Cafe now add forward/reverse Chromium/WebKit product evidence over real
Player Save exports: decoded State/RNG/sequence/integrity/digest and pending
progress remain current, each source update produces one Game successor with
zero page reload, and the successor can commit a legal command. This promotes
the Browser R2 State/Save continuity described by the matrix. It does not
preserve arbitrary React state: Cat Cafe's new Whole Canvas shell reopens its
title screen and ordinary Continue only closes that transient front door onto
the already adopted Session. The
[Browser R2 authoritative handoff plan](plans/2026-08-23-browser-r2-authoritative-state-handoff.md)
is closed. Desktop HMR remains independently inactive.

[Deno documents `deno desktop --hmr` as a platform development option](https://docs.deno.com/runtime/desktop/hmr/),
but the current SillyMaker Desktop staging/packaging command does not pass or
integrate that mode. Platform availability therefore does not promote an R1/R2
SillyMaker contract. The package-private candidate is reachable only through its
explicit bounded characterization preflight and remains default-off; its canary
evidence does not change the live matrix above. Do not replace stable revalidation
with an external proxy/companion, shim, Deno fork, undocumented marker, or a presumed
2.9.6 version gate. A macOS arm64 / Deno 2.9.5 native common-runtime smoke does
now prove the latest Engine Lab static Player's GUI readiness, authoritative
operation, same-window Game/Session restart, close acknowledgement, autosave
flush, and normal process exit; it does not extend the Desktop cells above or
promote packaging, multi-platform launch, or persistence durability.

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
leases, and settings. `ApplicationHostCapabilitiesV1` is the neutral capability
aggregate for records, files, metadata clock, and logging;
`createWebHostV1` supplies the browser implementation. Game bootstrap entropy is
admitted separately by the Game Domain and is not an Application Host
capability. Tests or other Hosts can inject a different record store without
moving browser concerns into Base. The current desktop channel exercises that
seam through a loopback HTTP adapter backed by local files. Its file backend
remains a durability preview
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

The player persistence boundary exposes fresh single-slot Save and backup
inspection plus migration upgrade, lineage re-anchor, backup restore/export,
and backup discard. Upgrade and re-anchor first preserve the exact source bytes
as one bounded same-namespace backup and atomically update backup, target, and
lease on Host stores that support atomic batches. Restore and discard are the
only consuming operations; export remains byte-exact and retains the backup.
The managed Saves UI maps these results to bounded player-readable actions and
never receives raw record bytes, Host keys/revisions, stack traces, or lease
fences. This atomicity is promoted for Memory and IndexedDB stores; the Desktop
file channel remains a separate durability preview.

Persistence safepoints are the application-declared re-entry policy on top of
that orchestration: `defineCoreGameApplicationV1` may declare
`persistenceSafepoint: { classify, maxInFlightCommits }`, admitted once by
`parsePersistenceSafepointPolicyV1` (a deterministic classifier over committed
authoritative state plus a 1..256 span bound; unbounded declarations fail
resolution). A commit whose state classifies `in_flight` sits inside an
in-flight span: the orchestrator defers its autosave, `flushAutoSave` falls
back to the most recent safepoint Snapshot of the current anchor era (or
writes nothing when the era has none), and player-slot saves reject with
`in_flight` until the next safepoint commit. The bound keeps spans honest —
exceeding it forfeits the inhibit with one diagnostic, and a throwing
classifier fails open as a safepoint — so a span can defer the Save but never
starve it. Anchor replacement (load/import/restart) resets span tracking. The
classification lives outside authoritative state, Saves, digests, and replay:
every commit remains complete and replayable; a span only expresses which
committed states a Save should re-enter.

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
identity for recovery. The optional HMR helper compares resolved identity,
invalidates the previous runtime, fences persistence ownership, and constructs a
successor application instead of mutating a live simulation definition in
place. This is helper/conformance capability, not a boundary installed by the
maintained runtime entries.

## 8. Presentation architecture

`@sillymaker/ui` separates reusable rendering infrastructure from Story-owned
appearance and content:

- a shell and central layered stage;
- spatial Scene renderers plus an orthogonal static DOM GUI composition/
  build-known Code Surface path;
- scene, character, HUD, Narrative, WholeCanvas, overlay, system, and
  interaction surfaces;
- semantic-publication and runtime-presentation stores;
- asset registry, exact-demand loading, diagnostics, and code-native fallback;
- input routing, pointer hit testing, accessibility-oriented controls, and
  settings;
- Save and diagnostic UI ports that do not own persistence or gameplay logic.

Story presentation code maps its read-only typed semantic publication and catalogs
into these generic surfaces. Missing assets can degrade to a visible fallback
without changing authoritative gameplay. A GUI composition rejects unknown
views, unknown parent slots, or invalid props during cold compilation; a lazy
Code Surface render/lifecycle failure is contained by that node's visible local
fallback and likewise does not change authoritative gameplay.

`sillymaker.gui-composition` is static presentation content: stable `nodeId` /
build-known `viewId`, Strict JSON props, and parent-owned named slots. It does
not enter State, Save, digest, or replay. The application catalog admits props
once and compiles a direct render plan; the render path performs no catalog or
schema lookup. Stable `(nodeId, viewId)` is the React lifecycle identity. The
parent owns slot layout/CSS, each child owns its internal DOM/CSS, and the
application supplies a narrow typed context for semantic or presentation
intents. Code Surfaces and npm components are trusted same-realm application
code: the engine documents cleanup and input/portal cooperation but does not
pretend to sandbox DOM, network, global listeners, or main-thread work.

Image and audio providers identify logical runtime locations rather than
author-maintained byte receipts. Image pack identity covers provider topology
(ID/path/type/dimensions); ordinary same-path media edits neither require
length/SHA metadata churn nor authenticate a publisher. The Web Host derives
its image cache key from the resolved URL, decodes media using platform APIs,
and preserves the existing missing/decode fallback behavior. Build or
distribution tooling that needs content-addressed output derives that identity
from the actual Host graph or artifact.

Workspace Overlay, System dialogs, Narrative/History, and WholeCanvas are the
live Managed Surface families. For each application epoch, composition creates
one package-private `ManagedSurfaceCompositeKernelBundleInternalV1`. That typed
authority graph carries the Coordinator, publisher-lease registry, stable
admission authority, and composite runtime kernel; it is not another mutable
state owner. Narrative and WholeCanvas receive that same bundle as one trusted
package-internal collaborator instead of receiving its parts plus parallel
aggregate sidecar/slot vectors. They do not repeat descriptor, schema, or
configuration look-alike admission for same-package factory output. Public
definitions and hosted environment values are still validated and normalized
once before composition, while invalid epoch, owner, slot, or definition
catalog construction fails before subscriptions or publication.

The shared bundle preserves one application epoch, stable publication identity,
input/focus ownership, and successor lifetime. A successor composition creates
a fresh bundle; family attachment checks its epoch, while publisher lease,
source revision, generation/currentness, CAS, readiness, terminal teardown, and
late async-result fences continue to protect the observable lifecycle. An
injected stable-lease sequence domain is exclusive only while its registry is
live; registry disposal releases that claim without reviving old leases, and a
successor continues the allocator's monotonic sequence. A Story
declares validated Overlay definitions and a
renderer resolver, then sends `openPrimary`, `pushDetail`, `closeTop`, or `closeAll`
intents through the composition facade. System Settings and Saves share one
root slot; a load, clear, or import confirmation is the exact-parent child of
the current Saves root. Narrative Stories construct one
`NarrativeSurfaceDefinitionV1` with `defineNarrativeSurfaceV1`; Web binds its
definition, player profile, presentation clock, and live reduced-motion query
before allocating the composition. `DefaultGameRootV1` mounts the current
Narrative Host when present and binds it to the composition's Semantic Stage
authority. It
does not accept an arbitrary narrative slot or expose a second writer. None of
these public facades exposes Coordinator, epoch, instance, readiness, or
writable topology evidence.

WholeCanvas enters through the public `defineWholeCanvasSurfaceV1` definition
factory. A Story chooses either a semantic-publication selector or the narrow
`createWholeCanvasApplicationSourceV1` navigation port; its renderer receives
read-only typed primary/detail data and frame-bound actions, while the package owns
readiness, exact-parent detail, routed input, focus, and topology. Web also
normalizes the existing `titleScreen` declaration into the same WholeCanvas
authority, so Splash and Title are package-owned front-door renderers rather
than a parallel System or Root writer. Cat Cafe's ending is the first real
consumer, Engine Lab's `whole_canvas_conformance=1` route is the opt-in second
consumer. The GUI-only SillyOS uses the neutral Web GUI entry rather than a
Story/Game declaration, so it allocates no WholeCanvas Host, source, lease, or
subscription.
The public catalog and target inputs are normalized once by that front door.
The package-private session trusts the resulting root target, computes only its
stable canonical key, and retains the real catalog/placement constraint. A
Story `resolveTarget` result crosses one complete admission in the session;
the hosted adapter only attaches its locale/presentation revision and does not
pre-scan actions or require an exact source-object shape.

Narrative keeps strict admission at its public definition/Web boundary and for
the tagged candidate-preflight result and snapshot. During that admission, its
seven package-internal semantic, voice, History-availability,
History-observation, profile, clock, and text ports are ordinary typed
package collaborators and are called directly after the owning public boundary
has normalized its input. They use no authenticity brand, private `WeakMap`
binding, repeated descriptor/exact-key admission, or cached language intrinsic.
The public selection parses `PendingInteractionV1` once; reconciliation receives
that typed value directly and computes canonical bytes only for the real stable
frame identity comparison. Resolution and time requests constructed by the
family remain typed through the Story dispatch adapter rather than being parsed
a second time.
Target/frame/source-revision,
generation, ready-active, one-shot/semantic-in-flight, listener, async-currentness,
and terminal fences remain the lifecycle and authority proofs.

The package-internal Narrative composition definition follows the same trust
policy: its typed caller supplies the two required callables directly. It does
not pre-freeze an exact-key record or inspect callable prototype/thenable
look-alikes.

The composition-owned Coordinator remains the sole lifecycle facade through which
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
tracked in the [engine roadmap](roadmap.md). The current Managed Surface
architecture has one composition-owned authority for Workspace Overlay, System,
Narrative/History, and WholeCanvas. Narrative and WholeCanvas are authored
through public definition factories and rendered by at most one current
production Host per present family; Splash/Title use the same WholeCanvas owner.
PF5/M3 Save migration product surface is complete. The current production-floor
order lives only in the
[production-floor sequence](plans/2026-07-30-production-floor-sequence.md).
