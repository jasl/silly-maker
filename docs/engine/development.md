# SillyMaker development guide

状态：日常开发入口。

## Requirements and installation

- Deno latest stable (public compatibility floor: >= 2.9.0)

The floor is an engine compatibility claim, not a second required CI lane.
Maintained development follows the latest stable release so the experimental
Desktop toolchain receives current fixes. The accepted CI/Desktop promotion
policy does the same and records the actual Deno version, but does not pin an
exact patch. It also does not require a Homebrew service, PostgreSQL server,
machine attestation, or pre-materialized browser cache.

```sh
deno install
cd template
deno run dev
```

The repository root deliberately has no default application. Start an
application from its own directory, or use `deno task app dev <application-id>`
when a repository-level command must select one explicitly.

Pull requests targeting `main` and pushes to `main` run one quality job followed
by two independent browser jobs. `CI quality (Deno latest stable)` reports the
actual Deno version, uses `deno ci` against the shared lockfile, and runs
`deno task check` without installing or starting a browser. After it succeeds,
`CI Engine Lab prebuilt smoke (Chromium)` installs only the lockfile-selected
Playwright Chromium and runs the Engine Lab smoke cases against a production
build, while `CI authoritative determinism (Deno + Chromium + Firefox + WebKit)`
installs the three locked browsers and runs `deno task test:determinism`. These
stable job names are available as branch-protection check identities; repository
policy activation is separate from landing the workflow and must be verified in
the remote settings rather than inferred from this file. `deno install` remains
the normal interactive setup command.

The workspace is ESM, imports TypeScript sources with explicit `.ts`/`.tsx` extensions, and uses one shared `deno.lock` with exact dependency versions (npm packages resolve through Deno's Node compatibility).

The root `deno.json` pins `"nodeModulesDir": "manual"`: only `deno install` writes `node_modules`. Auto mode re-materialized the workspace symlinks on every `deno run` startup — including every vitest fork worker — which raced any concurrently running test that resolves through those links (observed as transient `ERR_MODULE_NOT_FOUND` in the determinism authority-map under full-suite load). Re-run `deno install` after dependency changes.

Dependency reference rule: engine and Story sources (everything Vite builds or vitest transforms) declare dependencies in `package.json` and import them as bare specifiers — Vite does not resolve `npm:` URLs (`ERR_UNSUPPORTED_ESM_URL_SCHEME`). `npm:` inline specifiers are valid only in Deno-executed code: `scripts/**`, the application CLI, and `deno.json` tasks. Normal installation may use the network. If a browser test reports a missing Playwright browser, install the requested browser with the Playwright CLI for the current lockfile.

## Repository layout

```text
engine/packages/base     framework-neutral authoring, contracts, and runtime
engine/packages/agent    experimental workspace-private Agent/RPC/UiArtifact seam
engine/packages/composition maintained internal cold-path plugin façade
engine/packages/state    experimental neutral State Runtime facade over Base
engine/packages/tooling  non-browser CLI, Vite/identity, JSONL, and Desktop preview tools
engine/packages/studio   dev-only Inspector, Authoring Host, and private Agent companion seam
engine/packages/ui       generic React presentation, Narrative/WholeCanvas surfaces, and input
engine/packages/web      browser Host and application adapters
e2e/                     neutral Engine Conformance Story (MIT test consumer)
template    minimal starter Story (new-project skeleton)
examples/                curated applications (Bookshop and Cat Cafe Stories; GUI-only SillyOS)
project.config.ts        the workspace registry (application directory list)
website/                 the public documentation site (Astro + Starlight, en + zh; deno task docs:dev)
scripts                  maintained build, asset, and product tooling
docs/engine            active engine documentation
docs/game              active gameplay design
docs/policies          durable repository policy
```

Package manifests define supported cross-package entries. Do not bypass them with imports into another package's `src/**` directory.

### Experimental State Runtime work

`@sillymaker/state` is currently an experimental compatibility package. Use its
root entry for neutral `State*` contracts and `createStateRuntimeV1`; the factory
creates one Base `GameSession` composition and returns that exact Session as the
only runtime authority. Do not add a Session proxy/spread wrapper or parallel
State, digest, status, queue, or log cache.

Migration and equivalence tests that need Base internals use only the explicit
`@sillymaker/state/legacy` entry. Its adapter exposes the exact composition and
runtime control created for the neutral runtime; do not import
`engine/packages/state/src/legacy-adapter.ts` directly. Persistence, Save,
migration, digest, and replay changes still belong to `@sillymaker/base` until a
later accepted slice deliberately transfers ownership.

When a strangler Story still constructs a legacy `GameSimulation`, convert a
neutral module composition with
`createLegacyGameplayModuleBindingsV1(composition, aggregateCommandSchema)`
from that same legacy entry. It rebuilds complete Base bindings through the Base
constructor while preserving tuple order. Do not spread `StateModuleBindingV1`
or cast it to a Game binding: the neutral root intentionally promises only its
descriptor. Once constructed, package-internal typed bindings are trusted; the
adapter does not add a second immutability or authenticity layer.

X5's `createStateAuthoringKitV1` exposes neutral State module/workflow names but
delegates to the one Base authoring kit and transaction runner. Do not add a
parallel event journal, candidate State, RNG, queue, or commit path. Engine Lab
uses the State-composition bridge only for experimental equivalence coverage;
no maintained production Story uses the State runtime, and the experiment does
not define State Format V2.

`StateModuleV1.contractRevision` is the immutable revision admitted by
`defineModule`; do not clone a module with object spread and then compose the
clone. V1 module initializers are intentionally bootstrap-independent, and the
neutral API does not expose Base module-local invariant metadata because the
current transaction runner does not execute it. Use workflow
`validateCandidate` as the sole aggregate cross-slice invariant seam; touched
slice schemas are not followed by a redundant whole-State parse. `StateTransactionV1` reads only
command-start State (no read-your-writes). Modules declare pure reducers keyed
by domain-event kind and must own disjoint State slots; exact and parent/child
slot overlap is rejected at composition. A workflow admits emitted events
through `eventSchema` and must reject before its first `emit`. Cold composition
compiles each event kind to its UTF-16 module-ID-ordered subscribers. Hot
execution folds in emission order, accumulates one proposal per touched owner,
validates that owner once, and batch-materializes all touched slots without
scanning unrelated modules. An event with no subscriber remains journal-only
evidence. Rejection and fault leave the authoritative Snapshot and committed RNG
unchanged.

`@sillymaker/composition` is cold-path only. Public plugins use its scope and
typed tokens; no dynamic lifecycle Context is exported. Compile services and
registries into direct plans before Session creation. State-backed legacy
applications use `activateStateApplicationV1` from the `./state` entry so this
ordering is enforced rather than left to caller convention. Authoritative mount
is permanently sealed; use a separate kernel for reloadable Inspector/
presentation/tooling profiles. Lifecycle cleanup covers in-process resources
only. A live candidate's effects are installed before consumer publication and
coexist with predecessor effects during acknowledgement; they must be
staging-safe, must not write authoritative State or perform irreversible work,
and must roll back completely. Exclusive cutover resources are unsupported.
The kernel rolls back its candidate profile, while a publisher that partially
mutated an external consumer remains responsible for preserving or restoring
the predecessor publication.

The X1 Cordis wrapper was removed after a retain/remove checkpoint showed that
it owned no independent Fiber tree, injection, isolation, or publication
semantics. That historical result applies to the profile kernel. AR1 later ran
the private Direct and Cordis-core-derived extension backends through the same
17-case suite and two real GUI consumers, selected the SillyMaker-owned Direct
implementation, and deleted the Cordis adapter/vendor/dependency.

Use the workspace-only `@sillymaker/composition/internal/extension-runtime`
only for build-known in-process domains or contributions that need progressive
activation and reversible lifecycle. Resident entries keep admitted metadata
and a literal loader; a dynamic facade imports the implementation and selected
backend together. After ready, hot consumers retain a direct object rather than
looking up Context or a registry. Remove a published UI consumer before
retiring its lifecycle. External services remain future typed RPC consumers,
not local extension bindings.

The generated dev-only standalone Inspector entry and embedded author runtime
both use `@sillymaker/studio/composition` and the same private Authoring Host.
Applications opt in with `inspector: { module, exportName }`; the exported
`InspectorBindingV1` supplies the content catalog, real renderers, and optional
assets/Motion/Timeline catalogs that a source scan cannot provide. The Host owns
the selected Authoring Scene document session, selection, dirty/undo/redo state,
CAS/conflict handling, source IO and close participant. The shells must not create
another document, save, history, Stage, or gameplay Session authority. The game
page keeps only a lightweight launcher; embedded Inspector and real dev-source
client load on first open.

The current product surface is one Inspector, not a workspace rail. Project scene
search and the current layer/object tree use fixed-row virtualization; mounted
rows follow the visible window plus bounded overscan. Tree and real Stage preview
share selection. Authoring inspection bounds keep off-canvas, transparent and
group objects selectable as ghosts; selected hit-region geometry is an overlay,
not a second hit-test authority. Keep tests at these user-observable contracts,
not a complete DOM/object/source inventory.

The publication retains one connected visible React root. A live R1 candidate
first renders in an inert, `aria-hidden`, visibility-hidden, offscreen but
document-connected staging root and acknowledges an exact layout-effect commit;
only then is it rendered into that same visible root. Connected layout failure
is rejected before the visible root is touched, so Host identity, DOM,
selection, compatible component-local state, and document history remain exact.
A synchronous visible render-factory failure may rerender the predecessor plan
without replacing that state; if candidate and rollback factories both fail,
disposal is terminal. Do not generalize that narrow case into a promise that
arbitrary nondeterministic visible effects are reversible. Never use the return
from `root.render()` as publication evidence or move rendering into plugin
setup. Connected staging proves DOM connection and layout-effect success, not
visible paint or exact screen geometry; stronger tool readiness still
needs its own browser evidence.

Embedded close delegates save/discard/cancel to the Host participant. Authoring
Scene save uses the existing conflict rule: on `digest_conflict`,
refresh the saved baseline/digest while preserving the dirty draft and history,
then let the author retry. The embedded shell is an independent application
focus owner and native-text scope; focused editor keys must not reach gameplay.
Standalone/embedded teardown unmounts descendants before disposing the Host and
optional private companion. Neither shell receives a Game Session writer.

### Structured Authoring Scene operation workflow

The current Inspector's limited edits operate on the explicit `authoring_scene`
authority and use the
package-private `engine/packages/studio/src/core/scene-operations/` stack. Add or
change an edit by updating its revisioned contract, once-only boundary admission, pure
reducer, and behavior tests together. The reducer must return a completely
re-admitted Authoring Scene document or a stable diagnostic; it must not receive a
session, path, `FilePort`, save callback, or HMR capability. UI code and non-UI
local/dev callers use the same executor and document identity/revision receipt.
Capture the receipt that corresponds to the draft used to build an operation;
do not sample a newer receipt at dispatch time for an older rendered payload.
After that boundary, internal collaborators trust the typed envelope; do not add
descriptor/prototype authenticity or repeated admission at parser, executor and
consumer layers. Do not reintroduce clone-and-mutate callbacks beside this path.

`AuthoringDocumentSessionV1` remains the only draft, dirty, coalescing,
undo/redo, CAS, and saved-digest authority. Use its conditional replacement for
operation results; stale work, failures, and no-ops leave revision/history
unchanged. Local transform, visual content/existing appearance, sibling object
order and layer order are the bounded edit set; coalescing keys must identify one
focus/gesture run from its starting draft revision. Component creation,
group-to-visual conversion, writable hit-region/interaction, Blueprint and
editable Timeline operations are not part of this surface. Motion, Timeline,
interaction/GUI intent, compiled-layer and source-provenance facets are read-only.
Scrub is detached presentation sampling and never enters the session or save path.

Focused operation/Inspector checks include:

```sh
deno run -A npm:vitest run engine/packages/studio/src/core/scene-operations engine/packages/studio/src/core/authoring-scene-io.test.ts engine/packages/studio/src/inspector
deno task typecheck
```

### Authoring Scene source/compiler workflow

For a hierarchical scene, declare one explicit source authority in the
application's `sillymaker.config.ts`:

```ts
export const sillymakerAppConfigV1 = {
  // ...the rest of the application declaration...
  sceneSources: [{
    sceneId: "scene.example.opening",
    specifier: "#sillymaker/scene/opening",
    sourceKind: "authoring_scene",
    source: "src/scenes/opening/opening.authoring-scene.json",
  }],
} as const satisfies SillymakerAppConfigV1;
```

`authoring_scene` requires the app-relative source path; `low_level_scene` keeps
the ordinary package module and must not declare `source`. Do not infer or switch
authority because both suffixes exist. The Project Authoring Index admits
`*.authoring-scene.json` and `*.scene.json` into the same metadata snapshot with
their source kinds. The Inspector Authoring Scene port lists/reads/writes the
selected `authoring_scene` source through CAS; low-level Scene remains an advanced
hand-edited/code path and is never synchronized or silently migrated.

Map the same `specifier` under the application's `package.json#imports`. For an
Authoring Scene, that mapping points to a small local fallback which reads the
source bytes, performs the same admission/compile, and exports `sceneRuntimePlanV1`
for non-Vite Deno tooling and tests; `template/src/scenes/opening/authoring-source.ts`
is the maintained pattern. A low-level binding maps the specifier directly to
its ordinary JSON/module, as Cat Cafe does. Do not import either target by a
relative path from Story code—the exact package specifier is the declared
authority boundary.

Authoring Scene files use `format: "sillymaker.authoring-scene"`, version `1`.
Run bounded source bytes through `admitAuthoringSceneSourceBytesV1` once, then
pass the admitted normalized IR to `compileAuthoringSceneV1`; internal consumers
must not repeat source admission. Layer/root/children array order is authoring
paint authority. Stable `objectId` values become Stage tags directly. Omitted
`localTransform`, `children`, and binding members normalize to identity/empty
values. Keep runtime consumption on `compiled.runtimePlan`; `objectTargets`,
`bindings`, `inspection`, `sourceMap`, and the result of
`projectAuthoringSceneFacetsV1` are authoring-only data.

The Scene-specific Inspector session trusts admitted Scene values as immutable
typed data: history uses identity cloning and `Object.is`, and the reducer's
required compiler validation and the following Inspector projection share the
compilation for that exact Scene object. Do not restore JSON clone/equality or a
second full compile at the consumer. Direct mutation of an admitted object is an
unsupported same-realm hack, not an engine threat model.

The Vite plugin watches the configured source, intercepts only its exact package
specifier, and generates a virtual module containing the runtime plan. A small
source-reading fallback module may support non-Vite Deno Story tooling/tests, but
the release Player graph must use the virtual module and exclude that fallback,
the source JSON, and the authoring admission/compiler. The Template opening is
the maintained release example. This build path does not activate Deno Desktop
HMR or Desktop production promotion; the private Desktop adapter remains
explicit, default-off, and separately evidence-gated.

Focused M4 source/compiler checks are:

```sh
deno run -A npm:vitest run \
  engine/packages/base/src/authoring/authoring-scene.test.ts \
  engine/packages/base/src/authoring/authoring-scene-facets.test.ts \
  engine/packages/tooling/src/project/authoring-index.test.ts \
  engine/packages/tooling/src/vite/authoring-scene-source.test.ts \
  engine/packages/tooling/src/vite/build-dependency-receipt.test.ts
deno task typecheck
```

### Experimental Agent/RPC vertical slice

AR4 is implemented only through `@sillymaker/agent/internal` and
`@sillymaker/studio/internal/agent`. These are workspace-private engine seams, not Story-facing
public APIs. Do not add a root Agent export, provider-specific protocol type, raw Session/
`FilePort`/document-session writer, or direct source/game mutation to them. A product-side
binding admits an allowlist of inert action IDs and structured Authoring Scene operations once; a remote
Artifact carries only those IDs, and the embedded surface executes a captured Authoring Scene
document/revision envelope through the existing Scene executor.

Core Authoring publication and the embedded surface import only the package-private neutral
single-companion contract. Agent client/Host/renderer imports belong behind the explicit
`@sillymaker/studio/internal/agent` entry and its experimental runtime leaf. Keep the bridge to
one selected sibling: compatible R1 candidates reuse its owner, a changed compatibility ID or
content signature rejects before replacement, and terminal candidate-plus-rollback failure
retires the owner once. Do not turn this seam into a registry, public plugin surface, or Mod ABI.

The deterministic fake is the maintained AR4 transport. Extend its controlled mode,
connection, queued-response, or late-record hooks when a reproducible lifecycle case is
missing; do not create a second fake-only Agent state machine. Raw records remain untrusted:
preserve bounded canonical projection, exact response/event shapes, per-run contiguous
sequence admission keyed by `(sessionId, runId)`, connection/lifecycle generation fencing,
and atomic rejection. A raw adapter must settle submit before forwarding that tuple's first
stream event; it owns bounded reordering when wire frames arrive first. Replacement after a
request-failed connection must close the predecessor. Local cancel must retire the run from
stream acceptance before awaiting the RPC response, and remote `run_failed` must terminate
both the active run and streaming draft. Invalid completion, unknown nodes/actions,
old-run/old-connection records, and cancellation-late completion must leave the predecessor
Artifact unchanged.

`UiArtifact` remains closed data, currently `column`, `text`, and `action`. Add a node kind only
with bounded admission, inert renderer behavior, intent currentness, and a
real Engine Lab need; never accept arbitrary HTML, JavaScript, React components, functions, or
module URLs. Reopening a retained revision is local replay and must not submit, call a model,
or run a tool. Keep an Artifact action inert until it has an exact AR2 Scene receipt; when Scene
becomes ready later, an Authoring revision may pair the same Artifact before enabling it. The
current vertical slice changes only the existing in-memory Scene draft and must keep source IO
writes, Save/State, network, and external effects at zero.

Focused AR4 checks are:

```sh
deno run -A npm:vitest run engine/packages/agent/src e2e/src/test/authoring-host-lifetime.test.tsx
deno run -A npm:@playwright/test/playwright test --config engine/packages/web/playwright.engine.config.ts --project=chromium --project=webkit --grep "experimental Agent and UiArtifact seam"
deno run -A npm:vitest run engine/packages/tooling/src/vite/build-dependency-receipt.test.ts
deno task typecheck
```

The Browser cases require the dev-source fixture and use only the deterministic fake. The AR4
vertical slice is not HMR evidence. AR5's bounded Chromium/WebKit physical layer retains only
incompatible Authoring R1 rejection plus compatible retry, shared-presentation Player R2 +
Authoring R1, and Application R3 reload/recovery. Dirty Authoring and the explicitly selected
held Agent are checked as visible behavior; internal Host/session/run/connection/Artifact identity,
CAS, and detailed failure/currentness stay in the focused unit/headless suites. None of these is
real-backend, OpenUI/A2UI, persistence, Desktop, or universal physical failure/rollback evidence.
Keep the private seam out of `features.md` until a later promotion has a real second consumer.

### Addressable runtime unit workflow

Use addressable units to keep startup and the resident working set independent
from total Story size. Do not create one generic loader or registry. Scene units
wrap the existing configured `#sillymaker/scene/*` compiler outputs; Narrative
units own stable `{ unitId, nodeId }` positions, public entries, cross-unit edges
and typed Scene/GUI/text/asset dependencies; text keeps its own manifest/session;
GUI composition stays behind `@sillymaker/ui/code-surface/internal`; Code Surface
module/CSS loading and assets remain with literal React loaders and Asset
Registry respectively.

The application owns one `WebAddressableRuntimeDefinitionV1` per Web start. Its
literal loaders may do I/O only in `prepareInitial`, admitted invocation
preparation, or validated replacement preparation. Core receives its typed
execution context once; command, replay and render code require a resident direct
plan and never fall back to loading, schema admission or registry lookup. The
types enforce this boundary: a simulation whose execution context excludes
`undefined` must provide Core `executionContext` and Web `addressableRuntime`;
only a context type that includes `undefined` may omit them. Close
Narrative cross-unit and cross-owner references when composing the application.
Also list literal dynamic simulation/presentation roots in the existing Story
BuildIdentity owner's `additionalEntries`; do not copy source hashes into unit
manifests or let changed authoritative unit code fall into only the application
facet.

Every successful acquire returns an independent lease. Release it when the real
consumer no longer needs parsed indexes, subscriptions, React instances or other
explicit resources; dispose the owner at successor/application close. Do not
claim that release evicts browser ESM/CSS caches. Engine Lab intentionally keeps
visited Scene/Narrative units for its generation because its authoritative replay
is synchronous, and Web currently keeps prepared text packs until start disposal.
These are conservative consumer policies, not an LRU/current-only engine claim.

Focused M2 checks are:

```sh
deno run -A npm:vitest run engine/packages/base/src/runtime/content engine/packages/base/src/contracts/text-content.test.ts engine/packages/ui/src/code-surface/gui-composition-units.test.ts engine/packages/ui/src/assets/asset-registry.test.ts engine/packages/web/src/application/web-addressable-runtime.test.ts engine/packages/web/src/application/load-web-runtime-bytes.test.ts e2e/src/test/addressable-runtime.test.ts
deno run -A npm:@playwright/test/playwright test --config engine/packages/web/playwright.engine.config.ts engine/packages/web/e2e/engine/code-surface.spec.ts engine/packages/web/e2e/engine/pacing.spec.ts --project=chromium --project=webkit
deno task bench:player:bundle --application e2e
deno task bench:content:compile --profile content-scale
deno task bench:content:bundle --profile bundle-scale
deno task bench:player
```

The performance commands emit raw, machine-dependent trends only. The Player
trend uses Chromium's native Long Tasks observer for count/total/max alongside
startup, interaction, heap and allocation; no threshold means promotion.

### Runtime Inspector workflow

An application may add `InspectorBindingV1.runtime` as a read-only projection of
its real addressable owners. Keep the projection out of authority: it may report
stable unit/source identity, committed current references, status/timing,
diagnostics, working-set counts, and delegate an explicit retry for a failed
unit. It must not retain leases, compile plans, load on selection, enumerate DOM
or module inventories, or become a second registry/session. Package-internal
typed owner results are trusted and are not admitted again.

Publish unit changes by stable ID and no-op an unchanged absolute projection.
When the Inspector is not subscribed, do not scan or clone the full manifest;
defer list materialization until a snapshot is actually requested. Standalone and embedded entries are different browser
realms: the standalone page should say it is detached and show static summaries,
not acquire a cross-realm coordinator. Add RPC only for a separately accepted
product consumer.

Code Surface definitions provide source and authoring/cooperation metadata
explicitly. Use React effect cleanup and typed resource owners for listeners,
requests, timers, workers, and portals. SillyMaker does not wrap trusted
same-realm npm/Story code in Proxy, Shadow DOM, descriptor checks, or a synthetic
event loop. Use the existing raw Player benchmark and browser profiler for long
tasks/heap; do not turn Inspector lifecycle reporting into a profiler.

Focused M3 checks are:

```sh
deno run -A npm:vitest run engine/packages/web/src/application/web-addressable-runtime.test.ts engine/packages/ui/src/code-surface/code-surface.test.tsx engine/packages/studio/src/inspector e2e/src/test/runtime-inspection.test.ts e2e/src/test/runtime-inspection-react.test.tsx e2e/src/test/addressable-runtime.test.ts e2e/src/test/inspector-binding.test.ts
deno run -A npm:@playwright/test/playwright test --config engine/packages/web/playwright.engine.config.ts engine/packages/web/e2e/engine/runtime-inspector.spec.ts --project=chromium --project=webkit
deno run -A npm:vitest run engine/packages/tooling/src/vite/build-dependency-receipt.test.ts
```

### Locale-addressable text workflow

Declare locale topology once in `TextContentManifestV1`: one default locale, an
acyclic explicit fallback for every supported locale, and logical packs whose
`variants` map available locales to app-root-relative `assets/**` paths. Each
physical file uses the exact V2 wire
`{ format, version, packId, locale, entries }`. The default variant defines a
logical pack's Text IDs; translated variants may be partial but must not add IDs.
There are no byte-length, SHA, or declared-count receipts to synchronize after a
translation edit.

Acquire logical packs only through the application readiness planners. The Text
session loads the active locale plus its declared fallback variants for demanded
packs, then resolves text synchronously. `activateLocale` stages a complete
candidate and swaps the current presentation owner atomically; failure retains
the predecessor and the latest request wins. The Web Player-profile port awaits
that activation before publishing or persisting a locale preference. A React
control uses the profile preference port; it does not call `acquire`, invent an
`ensure` facade, or fetch a variant itself.

The resident parsed working set is active locale chain × demanded logical packs,
apart from the short-lived predecessor/candidate overlap during a switch. A final
lease release removes that logical pack from the Text owner. Web currently keeps
its required logical-pack leases until application disposal, and browser HTTP
caches remain Host behavior; neither fact is a second engine cache or an eviction
claim. Directly edited physical bytes become a new immutable content session on
refresh/restart.

Focused M4 checks are:

```sh
deno run -A npm:vitest run engine/packages/base/src/contracts/text-content.test.ts engine/packages/web/src/application/load-web-text-content-pack.test.ts engine/packages/web/src/application/text-locale-player-profile.test.ts template/src/test/text-content-runtime.test.ts template/src/test/content-scale-bench.test.ts scripts/assets/verify-runtime-assets.test.ts scripts/performance/content-bundle-scale-helpers.test.ts
deno task check:assets
deno task bench:content:compile --profile content-reference
deno task bench:content:compile --profile content-scale
deno task bench:content:bundle --profile bundle-reference
deno task bench:content:bundle --profile bundle-scale
```

Both benchmark pairs report raw machine-dependent measurements. They neither
carry a promotion verdict nor establish a universal threshold.

### Private application-local Mod workflow

Use `@sillymaker/composition/internal/mod-runtime` only for a build-known Mod
selection owned by one application generation. Keep catalog rows small: a data
row carries its admitted first-party definition; a code row carries only exact
`modId`/`generation` identity plus a literal/generated loader. Supply the active
IDs once at application construction. The runtime loads only that set, orders
declared dependencies before dependents, validates contributions against the
application's typed extension points, cold-compiles direct values, and then
mounts optional code lifecycles through the existing Direct parent/child owner.
There is no supported mutation of the active set; construct an ordinary successor
application generation to change it.

The application owns each extension point's payload type, contribution kind,
collision rule, and compiled consumer plan. It also owns projecting ordered
`activeIdentity` into the existing BuildIdentity/digest inputs when the active
selection changes authoritative behavior. The Mod runtime must not create a
second digest, State, Save, Session, or publication authority. Keep `load()` and
`compile()` resource-free and staging-pure; acquire reversible listeners, timers,
or other resources only in the existing Direct lifecycle. This is a trusted
same-realm composition contract, not a sandbox or side-effect interception layer.

Do not add filesystem/package discovery, a public resolver/ABI/SDK, download or
signature policy, post-release arbitrary-code loading, or install/restart APIs to
this entry. A no-Mod product must remain complete and omit the private runtime
from its final graph. The maintained Engine Lab proof is test-only and deliberately
small; SillyOS, third-party React packages, and Agent conversation are downstream
product validation rather than fixtures for this engine slice.

Focused M5 checks are:

```sh
deno run -A npm:vitest run engine/packages/composition/src/mod-runtime/runtime.test.ts e2e/src/test/mod-conformance.test.ts engine/packages/tooling/src/vite/build-dependency-receipt.test.ts
```

### GUI startup and module-update baseline

Every maintained runtime Vite entry receives a dependency-free accessible boot
shell and one inert serialized `runtime`/`browser` bootstrap config before its
module executes. The Web reader later parses and admits a fresh typed receipt.
The Desktop HTML response replaces the serialized config with
`runtime`/`deno_desktop`; Web admission rejects a target that disagrees with the
Desktop Host marker. The dev-only Inspector page owns the corresponding
`author`/`browser` config/read receipt and a separate React mount root. Desktop
author entry is intentionally unsupported.

The private `@sillymaker/web/internal/application-startup` seam publishes one DOM
event, `sillymaker:application-startup-signal`, with independent
`required_domain_ready`, `optional_capability_ready`,
`first_product_commit`, `terminal_startup_failure`, and `recovery_requested`
details. The first product signal follows a real React layout commit; a lazy
DevDock contribution becomes optional-ready only after the active consumer has
validated and published its registry. Terminal failures restore the static shell
with a bounded `SM-STARTUP-*` code and Retry, never the raw error. These are
Host/test signals, not State or persistence data.

The explicitly selected reference DevDock host invokes its literal loader only
after `debug_tools`, single-flights one open, reuses ready, and exposes a bounded
failure with explicit retry while core/static siblings remain mounted. Core
`@sillymaker/ui` and `@sillymaker/web` do not import this implementation;
products opt in through `createReferencePlayerOuterUiV1` or compose their own
auxiliary surface.
Source-change, revoke, and unmount fence late results. A ready contribution is
removed from the renderer before lifecycle disposal; a never-published late
result may be disposed immediately. Keep `optional_capability_ready` tied to
accepted active-registry publication, never backend activation alone.

Current R0–R3 characterization:

| Class | Browser                                                                                                                                                                                                                                                                                                                                                          | Deno Desktop                                                                                                                                                         |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R0    | Inspector Authoring Scene read, refresh, and CAS admission update one authoring document session; Motion sources feed read-only scrub. A saved Authoring Scene also recompiles its configured virtual module and follows the product's ordinary R2/R3 update boundary. Low-level Scene/Regions/Chrome ports remain tooling paths, not current Studio workspaces. | The static Player shell has no author/source update path.                                                                                                            |
| R1    | Standalone/embedded Inspector-binding HMR uses inert/offscreen, document-connected staging and one persistent visible root. Eligible component-only Player modules may also use Vite React Fast Refresh without SillyMaker atomic publication.                                                                                                                   | Not wired.                                                                                                                                                           |
| R2    | Engine Lab's Vite identity owner injects current real `BuildIdentity` into a literal-self-accepting composition candidate; the Web composer replaces Game/Session on the same Host/root and preserves the sibling Authoring Host.                                                                                                                                | Not wired.                                                                                                                                                           |
| R3    | Product applications without an admitted R2 boundary, config changes, Fast Refresh-ineligible changes, and otherwise unclassified changes use full-page reload. Persisted Save may recover; in-process identity is not promised.                                                                                                                                 | Built `dist/` changes require rebuild and Host relaunch. Preview records may recover Save; durable draft, author entry, and production persistence are not promised. |

The focused Chromium/WebKit Inspector cases protect contract-level user behavior:
standalone/embedded opening, virtualized navigation and selection, bounded edit +
Authoring Scene CAS/conflict recovery, and compatible R1 continuity while Player
R2 replaces the Game/Session. They do not inventory every DOM identity, repeat
unit-level operation/currentness cases, or claim Desktop HMR.

The AR3 native common-runtime smoke uses the latest Engine Lab static Player on
macOS arm64 with Deno 2.9.5. It proves GUI ready, authoritative operations, an
in-window Game/Session restart, post-restart operation, native close
acknowledgement, autosave flush, and normal process exit. It is not embedded
authoring, source CAS, Desktop R0–R2/HMR, a packaged-artifact or multi-platform
launch test, or a persistence durability promotion gate.

The Engine Lab identity owner normally collapses an R2 facet change to the
composition candidate. If one of the original changed Vite modules also reaches
the already-loaded Inspector binding through the live importer graph, the owner
returns that exact changed module beside the composition candidate: Vite then
refreshes its bytes through the Authoring R1 boundary while Game still cuts over
through R2. Unrelated deep Scene/simulation modules remain filtered. Application-
only changes retain Vite's ordinary propagation and React Fast Refresh
opportunities; if an application-only update reaches the composition boundary
with the same R2 tuple, that boundary requests R3 rather than treating the update
as an accepted no-op.

The Web R2 helper retires its predecessor before starting the successor. A
failure before replacement leaves the current Game anchor untouched; a failure
after retirement uses terminal recovery and does not restore the gameplay
predecessor. Test Authoring sibling continuity in both cases, but do not call the
latter a transactional R2 rollback.

The package-private Browser R2 coordinator now carries one exact encoded Save +
released lease fence. Core admits it through the existing Save migration/
adoption pipeline, installs it as the Session/Persistence/CommandLog replay base,
and publishes only after writable takeover; failed retries retain only a proven
current Save/fence pair. Focused tests protect that authority contract. Engine
Lab and Cat Cafe now add the completed forward/reverse Chromium and WebKit
product evidence through real Player Save exports, one Game epoch change per
source update, zero page reload, and a legal successor command. The
[Browser R2 handoff plan](plans/2026-08-23-browser-r2-authoritative-state-handoff.md)
is closed. R2 does not preserve arbitrary React state; a product shell may show
its ordinary title screen again while the adopted Session remains exact. Do not
use `auto.current` alone as the handoff and do not broaden this work into
Desktop HMR or predecessor rollback.

The AR5 headless seam keeps an in-flight Agent snapshot, request count, and RPC
connection exact across a post-retirement successor UI-start failure and later
valid retry. Inspector publication jsdom tests separately require terminal candidate-plus-rollback
failure to dispose the companion owner once, and the Agent Host test repeats ten
activate/dispose cycles with one close per connection and no accepted late
publication. Keep these failure/resource claims separate from the physical
Chromium/WebKit success/restore and incompatible-candidate rejection evidence.

[Deno Desktop supports a platform `--hmr` development flag](https://docs.deno.com/runtime/reference/cli/desktop/),
but SillyMaker's current static staging/packaging command does not pass or
integrate it. A package-private, explicit, default-off candidate exists and has
passed its selected-canary characterization, but only the bounded characterization
preflight reaches it; it is not a maintained command and does not change the live
matrix above. Stable source-and-behavior revalidation gates only activation of that
Desktop HMR workflow, not other engine or product work. Do not replace it with an
external proxy/companion, shim, Deno fork, undocumented marker, or presumed 2.9.6
version gate, and do not report the platform flag or canary evidence as a live
SillyMaker R1/R2 path.

Focused startup checks are:

```sh
deno run -A npm:vitest run e2e/src/test/application-startup.test.tsx
deno run -A npm:vitest run engine/packages/web/src/application/application-startup-diagnostics.test.ts
deno run -A npm:vitest run engine/packages/tooling/src/vite/application-entry-bootstrap.test.ts
deno run -A npm:vitest run engine/packages/tooling/src/vite/inspector.test.ts
deno task app build template --profile release
```

Focused AR1 activation and placement checks are:

```sh
deno run -A npm:vitest run engine/packages/composition/src/extension-runtime/extension-runtime.conformance.test.ts
deno run -A npm:vitest run engine/packages/ui/src/composer/default-game-root.test.tsx
deno run -A npm:vitest run e2e/src/test/dev-dock-extension.test.tsx
deno run -A npm:vitest run engine/packages/studio/src/react-publication.test.tsx
deno run -A npm:vitest run engine/packages/studio/src/inspector
deno run -A npm:vitest run engine/packages/tooling/src/vite/build-dependency-receipt.test.ts
deno task typecheck
```

Focused AR3 Host, R1, R2, release-graph, and browser checks are:

```sh
deno run -A npm:vitest run engine/packages/studio/src/react-publication.test.tsx engine/packages/studio/src/inspector engine/packages/studio/src/core/authoring-scene-io.test.ts
deno run -A npm:vitest run e2e/src/test/authoring-host-lifetime.test.tsx e2e/src/test/application-hmr.test.tsx e2e/src/test/build-identity-owner.test.ts e2e/src/test/inspector-binding.test.ts
deno run -A npm:vitest run engine/packages/tooling/src/vite/inspector.test.ts engine/packages/tooling/src/vite/authoring-scene-port.test.ts engine/packages/tooling/src/vite/build-dependency-receipt.test.ts
deno task app build e2e --profile release
deno run -A npm:@playwright/test/playwright test --config engine/packages/web/playwright.engine.config.ts engine/packages/web/e2e/engine/embedded-authoring.spec.ts engine/packages/web/e2e/engine/inspector.spec.ts --project=chromium --project=webkit
```

The Playwright case writes the real Engine Lab Authoring Scene through the dev-only CAS
port and restores its original bytes in teardown. Run it only against a dev
server and keep its `@dev-source-io` tag out of prebuilt/release projects.

While iterating on this package, run the focused runtime test plus the repository
typecheck so its consumer type test is included:

```sh
deno run -A npm:vitest run engine/packages/state/src/state-runtime.test.ts
deno run -A npm:vitest run engine/packages/state/src/state-authoring.test.ts
deno run -A npm:vitest run engine/packages/state/src/legacy-authoring-adapter.test.ts
deno run -A npm:vitest run engine/packages/composition/src/kernel.test.ts
deno run -A npm:vitest run engine/packages/composition/src/state.test.ts
deno run -A npm:vitest run e2e/src/test/experimental-composition-equivalence.test.ts
deno run -A npm:vitest run engine/packages/studio/src/composition.test.ts
deno run -A npm:vitest run engine/packages/tooling/src/vite/inspector.test.ts
deno task test:composition-state-bench
deno task typecheck
```

## Daily commands

| Command                                        | Use                                                                                                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deno run dev` (in an application directory)   | Start that application's Vite development server; the repository root has no implicit application.                                                         |
| `deno task check`                              | Canonical local code-quality and product-behavior check.                                                                                                   |
| `deno task audit:react`                        | Run the advisory React Doctor scan for new findings introduced by one React/TSX slice; pass `--base <slice-start-ref>` when it has commits.                |
| `deno task test`                               | Run engine and game behavior tests.                                                                                                                        |
| `deno task test:coverage`                      | Run unit tests with engine line-coverage reporting.                                                                                                        |
| `deno task test:composition-state-bench`       | Run the deterministic Composition/State workload, report-schema, and fake-GC behavior tests without recording timing.                                      |
| `deno task check:determinism`                  | Recollect and statically check the exact authoritative import closure (also part of `check`).                                                              |
| `deno task test:determinism:deno`              | Run two Deno repeats of the guarded authoritative matrix.                                                                                                  |
| `deno task test:determinism:browsers`          | Run the dedicated matrix twice in each locked Chromium, Firefox, and WebKit installation.                                                                  |
| `deno task test:determinism`                   | Aggregate the Deno and three-browser determinism gates; requires all browser binaries to be installed.                                                     |
| `deno task bench:snapshot`                     | Write a neutral Snapshot hot-path baseline JSON to a temporary path.                                                                                       |
| `deno task bench:snapshot:memory`              | Sample retained memory for one long-lived neutral Snapshot Session.                                                                                        |
| `deno task bench:composition-state`            | Run the neutral 16-module exact-Save/touched-owner matrix and write a trend-only temporary JSON report.                                                    |
| `deno task bench:composition-state:memory`     | Sample one explicitly selected neutral Composition/State GC cell in an isolated process.                                                                   |
| `deno task bench:surfaces`                     | Record the 30-row Stable publication lifecycle matrix as a trend-only temporary JSON report.                                                               |
| `deno task bench:player`                       | Build Engine Lab, then record three Chromium interaction/heap/allocation trend samples in the OS temp directory.                                           |
| `deno task bench:player:bundle`                | Fresh-build a release Player; report final graph, contribution IDs, grouped bytes, and Template negative facets to OS temp.                                |
| `deno task test:e2e:engine`                    | Engine browser suite against the Engine Lab Story.                                                                                                         |
| `deno task test:e2e`                           | Run the engine and example browser suites.                                                                                                                 |
| `deno task build:web` (in an app directory)    | Canonical web build → `<app>/dist-web` (`build` is its alias; `preview` serves it over HTTP).                                                              |
| `deno task build:desktop` (where declared)     | Usable Desktop preview package(s) → `<app>/dist-desktop`; no platform has passed D4 production promotion, and the file store remains a durability preview. |
| `deno task app <verb> <app>`                   | Explicit repository application lifecycle, Story diagnostics, and aggregation CLI; verbs below.                                                            |
| `deno task app check --all`                    | Structured Story diagnostics for every Story-capable application (part of `check`).                                                                        |
| `deno task app simulate <app> --trace <paths>` | Headless play with per-step numeric trajectories (balance tuning).                                                                                         |
| `deno task app diff <a.json> <b.json>`         | Structured diff of two JSON files (exported saves, simulate reports).                                                                                      |
| `deno task test:conformance:headless`          | Engine Lab headless conformance suite.                                                                                                                     |
| `deno task test:e2e:engine:prebuilt`           | Build the Engine Lab and run the engine suite on the built Player.                                                                                         |

Run `audit:react` after implementing and behavior-testing a slice that changes
React/TSX, before its final handoff. The task declares React Doctor `^0.9.12`,
so each on-demand run may take a SemVer-compatible `0.9.x` update. It is not a
workspace dependency and does not enter the shared lockfile. The task uses
`doctor.config.json`, defaults to the current worktree (including untracked files)
against `HEAD`, and disables score, telemetry, supply-chain traversal, and
automatic blocking. If the slice already contains commits, append
`--base <slice-start-ref>`; the later argument overrides the task default and
prevents a long-lived branch from re-reporting unrelated history. Add `--json`
when a machine-readable report is useful; keep raw reports in OS temp rather
than the repository.

The result requires review, not score chasing. Classify every new diagnostic as
`confirmed`, `rejected`, or `needs_evidence`; fix confirmed behavior,
concurrency, accessibility, or measured-performance defects and rerun affected
tests. Preserve intentional serial cleanup, deterministic ordering, and clear
ownership when a heuristic suggests a mechanical rewrite. React Doctor is not
part of canonical `deno task check`, and docs-only or non-React slices do not
run it. Refresh the full baseline whenever the resolved React Doctor version
changes or an explicit baseline refresh is requested.

Every application is a self-contained project: `<app>/sillymaker.config.ts` declares it (paths app-root-relative), `<app>/vite.config.ts` calls the shared `@sillymaker/tooling/vite` assembly, and the root `project.config.ts` only lists the registered directories for repository-level aggregation. Builds are application tasks; the application CLI is the diagnostics and aggregation surface (it also runs app-locally through `<app>/tools/app.mts`, where `.` selects the app):

```text
# Inside an application directory — canonical build entries:
deno task dev                                          # Vite dev server for this application
deno task build:web                                    # web Player → dist-web/ (`build` is its alias)
deno task build:desktop [--target <triple>]...         # where declared: desktop package(s) → dist-desktop/
deno task preview                                      # serve dist-web/ over HTTP
deno task clean                                        # remove dist-web/ and dist-desktop/

# Application-local Story diagnostics (`.` means this application):
deno task app inspect .                               # resolved identity/program report (JSON)
deno task app check .                                 # structured Story diagnostics (JSON)
deno task app simulate . [--scenario s] [--seed n]  # scripted Agent-port run

# Repository aggregation and explicit application selection:
deno task app dev <app>                               # Vite dev server for the selected application
deno task app dev <app> --smoke                       # boot, prove the page, then stop
deno task app check --all                             # check every Story-capable application
deno task app prebuilt-smoke <app>                    # verify the built Player's referenced files
```

The `app build`/`app desktop` verbs are the plumbing behind application build
tasks and repository-level aggregation (CI builds a registered application from
the root); ordinary development should use the application's `build:*` tasks.
`simulate` plays a named scenario from the application's simulation target (for
example `deno task app simulate e2e --scenario opening --seed 23049`) through
the same player-safe Agent port real agents use. Story-capable applications
(Story entry, asset verification, simulation target, and web dev/build target)
declare those facets in their own `sillymaker.config.ts`; see
[build-and-release](build-and-release.md).

### Local and external application projects

Private studies, outside-checkout validation applications, and other external checkouts do not register into the repository at all: they are ordinary application projects. Copy `template/`, keep `sillymaker.config.ts` + `vite.config.ts` + `tools/app.mts`, and point `package.json` dependencies at the engine packages by relative `file:` path (with `"nodeModulesDir": "manual"` in the project's `deno.json`, required for `file:` npm dependencies). `deno install` inside the project directory materializes the engine link; `deno task dev`, the declared `build:*` tasks, `deno task test`, and the app-local application CLI then run without any root-registry edit or engine `src/**` alias.

An external application may provide anonymous product feedback and help
prioritize engine work. Promotion evidence must still be reproduced by neutral,
maintained repository fixtures/workloads; do not import external content or make
source, tests, builds, or release claims depend on that checkout.

### Reference applications and the engine feedback loop

Repository examples are independent, complete, publishable reference products
and architecture workloads, not API galleries. They may be original products or
high-fidelity reimplementations. Once a reference baseline is accepted, its
entire user-observable behavior, content breadth/scale, and product depth are
the minimum completion contract: the SillyMaker version may add or deepen the
product, but cannot silently narrow or simplify it. The reference does not own
SillyMaker's module layout, source, names, assets, tests, or runtime structure.
Nor does its hardware ceiling own the target presentation. A reference shaped
by retro, embedded, or low-power devices requires an accepted target-platform
uplift for the Browser's current-low-end through mainstream phone/tablet/
computer classes and the current computer-class Deno Desktop surface. Preserve
the complete product denominator and experience roles while redesigning
responsive/high-DPI layout, relevant touch/pointer/keyboard Input,
accessibility, compatible media quality, content density, and polish for those
targets. An intentional retro aesthetic may remain; hardware-imposed limitations
do not remain by default.

Only a current target-Host impossibility accepted before implementation may
remove behavior; legal/material constraints use original or compatible
substitutions. An engine gap, performance problem, or implementation cost keeps
the product incomplete rather than reducing its denominator. The mandatory
completion checklist lives in
[`examples/AGENTS.md`](../../examples/AGENTS.md#reference-application-product-contract).

Advance one reference product at a time through this loop:

1. Define the complete product contract and product budgets. For a
   reference-derived product, record the primary baseline/version or clean-room
   specification, secondary inspirations, additive extensions, owner-accepted
   Host exceptions, compatible material substitutions, and the semantic
   coverage table required by the checklist. A named baseline means the entire
   named application/version or a specification of that whole observable
   product; a chapter, map, route, mode, or feature subset remains only a WIP
   slice. Also record which constraints came from the source device, the target
   device/viewport/Input classes, the accepted presentation/content uplift, and
   the product's current-low-end startup, interaction/frame, memory, storage,
   and bundle budgets.
2. Build in manageable slices with supported SillyMaker exports and mature
   React/Web ecosystem dependencies, but keep the product explicitly WIP until
   every accepted baseline area is implemented. New showcase features do not
   offset missing baseline coverage. Do not pre-emptively generalize every
   application need into the engine.
3. Reconcile the complete coverage table before using the product as evidence
   about engine readiness. Validate content registration/reachability, real
   behavior across early/middle/late/end states and every distinct mode/system,
   responsive presentation and interaction across the declared representative
   viewport/Input classes, the release build, final graph, and product-local
   budget measurements. A completion reviewer other than the implementation
   author independently compares this evidence with the declared denominator,
   reviews both the baseline behavior/experience roles and the accepted
   target-platform uplift, and reports remaining gaps; a passing demo or
   implementer summary is not that review.
4. Review the product and engine separately. Classify each finding as an
   application-domain defect, documentation/recipe/API-ergonomics issue,
   reusable optional integration candidate, or reproducible general engine
   contract gap.
5. Fix the first two at their owner. A reusable integration may be extracted
   under the rules below. A general engine gap requires a focused accepted plan
   and a neutral contract test/workload. If the change promotes a public/stable
   contract, it must also satisfy the applicable second-consumer promotion
   gate; one example does not freeze a public API by itself.
6. After an engine correction, migrate the reference product off its workaround
   and re-run its product evidence. Close it only after confirming that it uses
   the recommended path and still forms a coherent product.

Every new reference product starts from the current tracked `template/` project
shape, then deletes irrelevant starter domains instead of preserving a fake
Game/Story skeleton. At closure, classify Starter feedback explicitly: proven
general defaults, directory shape, documentation, and engineering ergonomics go
back to `template/`; product data, visual policy, and one-off integration remain
with the product. This is a one-time review, not continuous synchronization,
template migration, or a reason to build a scaffold CLI before repeated manual
copy/rename failures justify one.

This review produces evidence and candidate work, not an automatic engine
backlog. A later reference product is selected explicitly after the current one
closes.

A representative vertical slice proves only the behavior and architecture of
that slice. It never proves that the reference product is complete or that the
engine can carry the reference's full content and scale. The coverage table is
ordinary Markdown in the product's existing README/design note; do not build a
new schema, runner, exact upstream file/source/DOM inventory, or pixel-comparison
framework around it. Product-level additions may increase experience depth, but
the implementation still favors simple, idiomatic, discoverable modules and
data-addressable bulk content. Hardware headroom is not a consumption target:
use progressive/addressable loading and larger assets or working sets only when
they create user-visible value, and retain the declared current-low-end floor
plus reasonable headroom. Product budgets use representative profiles and raw
measurements, not exact SKU/machine attestation.

### Optional ecosystem integration packages

Start with a direct dependency on the mature upstream library. Extract a
`contrib/<integration>` package only when a real product demonstrates a reusable,
independently maintainable SillyMaker-specific boundary such as typed
projection/intent mapping, Input translation, resource ownership and disposal,
a Code Surface definition, Host readiness, or an Inspector facet. A provider,
component, hook, or few lines of application configuration do not justify a
wrapper. Do not create an empty `contrib/` hierarchy, registry, or universal
integration interface before the first accepted package exists.

Each contrib integration is an opt-in physical package with narrow supported
exports, its own upstream dependencies, documentation, tests, and applicable
license notices. The dependency direction is:

```text
application/example
  -> selected contrib integration
       -> supported @sillymaker/* exports
       -> upstream React/browser library

engine packages  -X-> contrib
contrib          -X-> engine src/** or @sillymaker/*/internal
contrib          -X-> examples/**
```

Fixed product UI may mount the upstream React integration directly;
authorable/addressable lazy GUI may use the focused
`@sillymaker/ui/code-surface` entry. A contrib package exports the smallest
useful component, hook, typed adapter, Code Surface factory, or—only when there
is genuine cold service/registry composition—a supported
`CompositionPluginV1`. Do not introduce a Composition profile merely to make an
ordinary component look like a plugin. Preserve useful upstream escape hatches,
and keep product rules, State schemas, control mapping, and visual policy in the
application.

No engine/root umbrella entry re-exports all integrations. An unselected
integration must be absent from the final application module/source graph;
installation or lockfile presence alone is not activation. A product may
locally adapt a contrib factory into its private, build-known Mod extension
point, but the product continues to own that point's payload, collision policy,
identity, and activation. Contrib packages never import or publish the private
Extension/Mod Runtime contract and do not activate a public Mod ABI, resolver,
SDK, installation protocol, or distribution system.

Use a focused package or test-file command while iterating when that is faster. Run `deno task check` before handing off a change, and add `deno task test:e2e` or prebuilt testing when the affected behavior crosses the browser/build boundary.

`deno task check:determinism` is the browser-free authoritative-source guard.
It recollects the root application registry, managed simulation dependencies,
declared callback owners, bounded Base authorities, and the maintained synthetic
migration extension on every execution; it does not read a cached file list.
The M2a State-migration registry factory/normalizer and M2b pure execution
kernel are bounded Base authorities. M2c connects an exact registry supplied by
Core to staged import/load: the package-internal kernel resolves only exact
non-empty paths and returns detached typed attempt/completion data, while Persistence
owns historical Snapshot admission, final whole-Snapshot digest, and failure
mapping. Engine Lab publishes the first real migration owner. The collector
requires its Core registry and policy export to be exact-identical, live-enumerates
the callback closure, and verifies that every app-local path is covered by the
managed Simulation BuildIdentity before linting.
Collection/classification failures abort before linting. After collection, every
unique exact path is read once; read, unsupported-extension, and parse failures
use stable diagnostics, and all output is ordered by UTF-16 file/range/code.
The checker and the tooling-only import-closure collector use the exact
`@babel/parser` AST dependency already pinned by their owning package. Across
`.ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs`, the collector follows runtime-bearing
static ESM imports/exports. Fully type-only declarations/specifiers and
TypeScript import types do not expand the runtime authority closure;
side-effect imports, empty runtime imports/exports, and mixed type/value
declarations remain runtime edges. A direct `import()` is admitted only when it
has exactly one ordinary quoted string literal argument and no options, spread,
or wrapper. The literal then follows the existing relative/workspace/external
resolution policy. Template literals, concatenation, identifiers, TypeScript
expression wrappers, options arguments, spreads, and zero/multiple arguments
produce one `determinism.import_closure.dynamic_specifier` collector failure per
source before source lint. Callers never consume or publish a partial path
vector.
The parser does not enter browser bundles, replace Oxlint as the general
linter, or expose a gameplay runtime API. Parser selection follows the source
extension for TypeScript and JSX and accepts standard decorators.
Purely type-only syntax is not treated as runtime access; runtime-bearing
TypeScript namespace/enum/`import =`/`export =`, parameter/pattern expressions,
decorator expressions, and `ClassAccessorProperty` initializers/computed keys
enter the same rule traversal as JavaScript; TypeScript instantiation wrappers
preserve the wrapped callable identity. Runtime-transparent TypeScript wrappers,
including `as`, non-null, and `satisfies`, also preserve assignment/update
targets and nested destructuring semantics.
Type-only exclusion applies only to erased dependency edges. Runtime
`import = require(...)` remains executable loader syntax and is rejected by the
rule core; `import type = ...` remains erased.
Block, Catch, and For nodes receive stable lexical scopes; all Switch cases share
one scope; Class StaticBlock and runtime TypeScript namespace bodies are separate
var/function boundaries that hoist collection cannot cross.

Ambient entropy, clock, network/provider, environment, locale/ICU, and
DOM/storage diagnostics cannot be disabled. Do not capture, pass, return, or
export bare ambient capability roots such as `Math`, `Date`, `Number`,
`Temporal`, `globalThis`, `Deno`, or `process`; use a checked direct member
operation or pass canonical recorded data. Bare `performance` and any of its
direct member reads/calls are clock metadata; any direct `Deno` / `process` member read or call is
an environment capability, while bare-root capture remains a capability escape.
Static `globalThis.<root>` syntax recovers only an existing classified root: a
specific diagnostic wins first, a checked deterministic intrinsic operation may
remain clean, and an unknown first hop or unclassified tracked-ambient descendant
fails with capability escape. Dynamic selection remains `dynamic_member`; the same
risk survives sequence last-values, runtime `import =`, object patterns, aliases,
and write targets. This recovery never makes a qualified Date operation direct-safe.
Explicit `Number(recordedText)` remains deterministic. Runtime-producing
receivers/callees, inputs and spread values, template substitutions, and
computed property keys are visited before the enclosing operation is
classified, so a safe or fail-closed outer operation cannot hide an ambient
read performed by an evaluated child.

Date admission uses a conservative syntactic proof, not general constant
evaluation. The only direct-safe inputs are:

- an exact static integer epoch inside the TimeClip range;
- an unshadowed direct `Date.UTC` call with exactly seven exact integer
  arguments, validated ranges, a real Gregorian day, and no overflow
  normalization;
- an unshadowed direct `Date.parse` call or direct one-argument `new Date` over
  a strict full-zone `StaticString`; and
- an immutable local `const` alias of one exact singleton above.

The strict full-zone spelling is `YYYY-MM-DDTHH:mm:ss`, optionally followed by
one to three fraction digits, then `Z` or `±HH:mm`; real calendar/time/offset
values are required. Date-only text, whitespace, expanded years, `24:00`, leap
seconds, malformed or local-zone input do not become deterministic proof.
`Number(...)`, dynamic instant text, a KnownDate copy, multi-argument
construction, spread, expression wrappers, mutable or joined values, Date
callable aliases, and Date/parse/UTC `call`/`apply`/`bind` routes do not grant
admission. `Date()` always reads the clock; zero-argument `new Date()` has its
own clock diagnostic. Unsupported direct Date input fails with
`determinism.date_input_unverified` or
`determinism.date_utc_unverified`; a statically recognized local-zone operation
uses `determinism.host_timezone`. Only the current node's direct `new Date`,
`Date.parse`, or `Date.UTC` operation owns that dedicated input failure. An
alias, recovered constructor, or call/apply/bind route retains its
`determinism.capability.indirect_intrinsic` winner and separately reports any
evaluated KnownDate argument or `thisArg` as
`determinism.date_instance_unverified`. A spread operand executes its iterator
protocol before effective arguments exist, so a KnownDate spread keeps that
child diagnostic even for a direct Date operation. Static destructuring of
`Date.now`, `Date.parse`, or `Date.UTC` is classified at the capture site just
like the corresponding direct member capture. A runtime TypeScript internal
`import Alias = Date.member` uses the same concrete capture code and source range;
bare `Date` remains one capability escape and bare `Date.prototype` remains a
risk-only local alias until an unsupported member/use escapes.

`StaticString` proof is limited to an ordinary string literal, a
no-substitution ordinary template, direct unshadowed `String(...)` over one
statically foldable primitive, or a no-substitution direct unshadowed
`String.raw` tag. `new String`, substitutions, aliases, custom tags,
`call`/`apply`/`bind`, nested wrappers, and other tagged-template shapes do not
produce proof. TypeScript type arguments attached to the producer
Call/New/TaggedTemplate runtime node are also wrapper syntax and do not produce
proof. Except for that one `String.raw` form, a tagged template is
checked as an ordinary function call and every evaluated substitution remains
independently visible to the checker.

An exact KnownDate may only receive a direct, non-optional terminal call to
`getTime`, `valueOf`, `toISOString`, or one of the UTC getters. Local getters and
rendering, `getTimezoneOffset`, `toJSON`, every setter including UTC setters,
method capture/wrappers, optional or computed members, callable/tag/protocol
use, containers, return/export, and other value escape fail closed. Direct
terminal calls carrying TypeScript type arguments are wrappers and fail closed. Direct
Date-to-string/default-rendering operations are still identified as
`determinism.host_timezone`; ambiguous descendants use
`determinism.date_instance_unverified` rather than claiming a known Host
rendering operation. Strict equality and statically known object/nullish
comparisons do not invoke Date coercion.

Base persistence and diagnostic timestamp admission is a separate runtime data
contract, not an extension of that authoritative syntax proof.
`parseIsoUtcInstantV1` uses package-internal ASCII/integer Gregorian logic and
accepts `YYYY-MM-DDTHH:mm:ss(?:.digits+)?Z` with a real date; exact-zero
`24:00` is accepted, accepted spelling is retained verbatim, and no Host
`Date.parse` participates. Save `savedAt`, Debug Bundle `generatedAt`, and
runtime-fault `occurredAt` share this strict admission. The persistence export
filename path deliberately uses a separate legacy loose formatter: day values
through 31 normalize forward, exact-zero `24:00` rolls over, and invalid clock
text returns the configured bare filename. Do not reuse either runtime policy
as DET3a `StaticString` proof, export the internal scanner/calendar helpers, or
"fix" legacy year padding/overflow without a separate compatibility decision.
When changing this area, run the focused Base codec/Player/diagnostic tests and
`deno task test:determinism`; the latter executes the fixed admission corpus in
Deno, Chromium, Firefox, and WebKit.

Direct assignment, destructuring, update, delete, and `for in/of` writes to an
ECMAScript intrinsic root/member use
`determinism.capability.intrinsic_mutation`; Date-instance/prototype mutation
uses `determinism.date_instance_mutation`. DET3b's isolated runtime probe
additionally guards reflection-based mutation of its protected slots. Dynamic
member production from a tracked capability uses
`determinism.capability.dynamic_member`. A non-reference `delete` operand is
evaluated as an ordinary expression; only identifier/member references enter
write-target classification, without reading their prior value as an ordinary
member access. One maximal operation gets one current-node winner, while an
actually evaluated receiver, key, argument, or substitution keeps its own child
diagnostic.
Lexical shadows remain ordinary code. `for in/of` visits the
RHS, evaluates the write target/pattern without treating it as a normal read,
joins unknown provenance into a local target, and only then visits the body.
`Temporal.Now` is ambient; capturing that namespace is a capability
escape and invoking it is a clock read. Deterministic named namespaces such as
`Temporal.Instant` may be used directly or statically destructured, while the
bare root cannot escape. Direct `Date.prototype.constructor` and direct
`.constructor` on an exact KnownDate retain recovered Date identity. `.now` is
`determinism.clock.date_now`; recovered Date construction and recovered
`.parse`/`.UTC` are `determinism.capability.indirect_intrinsic`;
`Date.now.constructor(...)` and a proven Function-constructor route are
`determinism.capability.dynamic_code`. Any other unproved `.constructor` route
uses `determinism.capability.constructor_escape`. Computed or optional Date
constructor selection is a dynamic member, not a direct recovered identity;
that risk remains attached through descendant member/call/new/tag and computed
destructuring paths. Callable proof comes only from the maintained exact table:
direct intrinsics, `Function.prototype`, and exact loader function bases. A
local/user function object or arbitrary loader descendant does not prove the
global `Function` constructor identity. This proof is only for risk
classification and never grants Date/StaticString/KnownDate allowance. It can
survive an immutable local alias, static destructure, runtime-transparent
parentheses/TypeScript wrappers/type arguments, or a sequence/assignment
expression/exact `.bind(...)` whose runtime value is the exact callable;
conditional, binding
reassignment, and unknown joins drop it. Because an exact callable is
truthy and non-null, `lhs || rhs` and `lhs ?? rhs` select that lhs while
`lhs && rhs` selects the rhs. The lhs producer is always evaluated; an
unreachable rhs is not reported, and a discarded lhs operation keeps its own
specific diagnostic. Dynamic-loader provenance remains a conservative join and
does not use this short-circuit proof. An exact immediate constructor execution
owns its inline bound producer, but an unproved descendant still reports the
selected bound-constructor capture. A conditional callee drops exact callable
proof and checks both potentially executed branches, so an outer unknown/loader
join cannot hide a branch-specific clock, random, or capability diagnostic.
Static `module`/`node:module` imports provide risk-only callable identity only
for an exact `createRequire` binding/namespace member and the returned loader
from a proven factory/call/apply/bound-factory invocation, never for an arbitrary
provider/loader descendant or Function-constructor result.

Bare and `node:` provider imports are subpath-aware, so `fs/promises` cannot
bypass the filesystem boundary. Static runtime ESM imports of ambient providers
remain provider violations, but an exact CommonJS loader or recognized
`createRequire` capability uses the more specific
`determinism.capability.dynamic_require` classification. Every real unshadowed
`require`, `module.require`, runtime `import = require(...)`, and recognized
`createRequire` use—including direct calls, aliases proven from a static
`module`/`node:module` provider binding, call/apply/bind/tag wrappers, capture,
computed access, and partial use—fails with that code; a provider literal does
not change the failure kind. Bare `module` escape remains the ordinary ambient
capability rule unless the path identifies `module.require`.

Actual runtime lexical loader shadows remain ordinary code. Erased declarations
and an uninitialized `var require` / `var module` that does not replace the
CommonJS wrapper binding do not create an allowance. The guard does not
construct a CommonJS dependency graph.

Date-input/StaticString/KnownDate allowance proof survives only an immutable
local `const` alias of one exact singleton. Conditional/logical expressions, reassignment, mutable bindings,
different or unknown candidates, wrappers, containers, cycles, and analysis
budget exhaustion cannot preserve it. Separately, risk detection applies a
path-insensitive conservative source-local join, so a tracked candidate cannot
be erased by a clean or unknown branch. A bounded monotonic worklist replays the
root and discovered local closures to a fixed point, so classification does not
depend on declaration/use text order. Cycles fail closed; budget exhaustion
returns only `determinism.provenance.budget_exhausted`, never diagnostics or
proofs from a partial pass. Exact-proof memoization is invalidated through real
alias dependencies; an unrelated exact declaration does not invalidate a stable
alias graph. This is intentionally not CFG-complete or
interprocedural analysis. DET3b's test-only isolated runtime tripwire owns the
remaining dynamic bypass probes. Neither layer is a sandbox or a security
boundary.

The pure installer and descriptor/absence harness live under
`e2e/src/testing/ambient-tripwire.ts`; the sibling parent runner, short-lived module
Worker, and neutral authoritative driver remain Engine Lab test infrastructure.
The driver imports the narrow
`@sillymaker/base/testkit/authoritative-determinism` subpath, and a live closure
test rejects Web, UI, application Host, persistence-composition, or Presentation
bootstrap dependencies. The Worker installs or proves native absence and self-tests
the complete fixed registry while unarmed, arms once, then dynamically imports the
driver. A caught guard sentinel still produces the first latched violation. Malformed
requests/receipts or message transport validation use `driver_failed.protocol`; Worker
errors/timeouts use `driver_failed.worker`. Both carry empty coverage and never invent
realm evidence. Receipt admission checks the exact guard registry order/categories,
count-to-coverage relations, closed result keys/enums, and all four compact command
shapes; the outer test separately owns equality with the fixed expected trace. The parent terminates every
created Worker exactly once, and the isolated realm never restores partially installed
globals.

The guarded `Date.parse` and single-argument `new Date` runtime paths use the same
optional one-to-three-digit explicit-zone fraction boundary as C2. The neutral driver
executes `.1` and `.12` positive spellings, while guard installation self-tests that
`.1234` remains `determinism.date_input_unverified` in every matrix runtime.

The fixed bootstrap value crosses the message boundary and is actually parsed into
the neutral Session/RNG construction. Ordinary `deno task test` exercises the real
Deno isolated realm. DET4 now adds an independent matrix module/comparator around the
unchanged narrow tripwire driver: it runs the tripwire and aggregate parity vectors
twice in Deno and twice in each dedicated Chromium, Firefox, and WebKit project. The
matrix consumes the unique DET2e/M0a expected values through
`@sillymaker/base/testkit/determinism-vectors`, and a synthetic `summarizeSave`
callback exercises engine-owned summary normalization without copying the Save
lifecycle corpus. One Session runs no-draw/rejection/RNG/fault in order, accumulating
four retained CommandLog entries with ordinals `1..4` and sequence
`0 -> 1 -> 1 -> 2 -> 2`; the compact
per-command trace and one complete authoritative replay come from that same run.
Replay executes all four entries, and the matrix checks adjacent digest, committed-RNG,
and sequence continuity instead of stitching together one-command Sessions. The Session
uses seed `1_236_431_772` and maximum `7`; rejection rolls back the controlled rejected raw
`4_294_967_292`/accepted raw `1_015_932` pair, then the RNG commit repeats and commits it.
First-divergence output includes project, repeat, vector, command
ordinal/identity, sequence, JSON pointer, and expected/actual.

The dedicated tasks/config/CI job are intentionally outside `deno task check` and
the ordinary UI suite; those paths remain browser-free and do not acquire Firefox.
The Player/main page never imports or applies the guards, and the production Browser
Agent still cannot read raw Snapshot, RNG, or CommandLog state.

A reviewed fractional literal,
`parseFloat`, or approximate-math node may use exactly one directive on the
immediately preceding physical source line (blank or comment lines do not
bridge it):

```ts
// sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"recognize and reject negative-zero input","bounds":"binary64 zero representations only","rounding":"exact comparison; reject before commit","test":"path/to/focused-vector.test.ts#case-name"}
if (Object.is(value, -0)) throw new TypeError("negative zero");
```

The JSON object must contain only non-empty `code`, `reason`, `bounds`,
`rounding`, and `test` strings. `code` must be one of the three numeric
diagnostics, and `test` must be a repository-relative `*.test.ts#case-name`
reference. The referenced file must exist and contain exactly one exact, trimmed
evidence marker matching the fragment:

```ts
// sillymaker-determinism-vector: case-name
```

Evidence files verify the exemption; they do not thereby join the authoritative
closure or become lint inputs. Missing files or markers, ambiguous duplicate
markers, malformed or duplicate directives, stale/wrong-code exemptions, and
whole-file directives fail closed and leave the numeric diagnostic unsuppressed.
New authoritative callback families must be added to the live authority policy;
the first real executable Save migrator will reuse this seam rather than
introducing another checker.

`deno task bench:snapshot` runs generated 100/1k/10k/100k-entity Session workloads for single-field commits, multi-slice committed controls, real cross-owner atomic commits, rejection, and fault. Its full matrix also includes a neutral 256-command mixed sequence at 100 entities, authoritative replay of the retained 200-entry CommandLog, and a fixed 100-entity `every_commit` persistence workload that drains each of two committed commands and records the resulting `auto.previous` rotation. By default its report writes machine-readable p50/p95 plus deterministic canonical-traversal, digest, continuity, Save-serialization, and Strict-JSON counts under an operating-system temporary directory; pass `--output <path>` for a CI artifact.

The counters distinguish Snapshot digest, bootstrap admission, command
admission, finalized-evidence admission, conditional additional CommandLog
metadata admission, replay comparison, and CommandLog continuity. They measure
real maintained work, not removed freeze/handoff machinery. Standard Core
performs one bootstrap canonical projection before initial-State construction
and one command projection at Session dispatch; its resolved typed executor
attempt reaches finalization and the internal CommandLog without a second
Snapshot-free evidence projection. The low-level public `GameSession` workloads
retain one evidence admission for their arbitrary executor boundary, and public
`createCommandLogV1` independently admits its inputs and retains full digest
audit. Failure fixtures assert atomic state/log behavior and the absence of
candidate Snapshot digest work instead of descriptor ordering or wall-clock
timing.

Save encoding performs canonical serialization and the Strict depth/node/collection/string/dangerous-key checks in the same package-internal traversal. The benchmark's `strictJsonPreflights` counter therefore means a separate post-encoding Strict parse traversal and is zero for each encode; `strictJsonParses` still counts decoder/readback parsing of untrusted bytes.

The public current-format decoder deliberately performs two canonical digest
traversals on success: one over the bounded raw Snapshot, then one over the
schema-normalized current Snapshot. Import validation and stored operations add
the State-revision fence between those phases, before current Snapshot parsing.
A raw-digest mismatch stops after the first traversal without current Snapshot
parsing; a current-schema or RNG failure after a valid raw digest records only
that first digest; a differing State revision first enters a callback-free
pending branch. Stored load/list/export finish current-record compatibility/
reference/invariant validation after staged preparation and Host revision/slot
identity checks. For a historical revision, only load continues from that
physical check into exact-chain resolution and synchronous migration; list and
stored export retain unavailable inspection/source bytes. Annotation shares
preparation and the physical checks but executes neither migration nor Story
validation callbacks. Public import has no physical Host phase and continues
directly. Authors construct a registry with `defineSaveStateMigrationRegistryV1`
and pass it as `saveStateMigrations` on the Core definition; callbacks must stay
synchronous, deterministic, State-only, and inside the registered authoritative
source closure. Focused tests should assert exact callback counts,
whole-Snapshot digest/receipt identity, and zero mutation/write on every failure.
These are deterministic package-internal counts, not wall-clock gates. Session
receipt lifecycle and the composite M2d commit protocol are implemented through
direct-module internal seams: Story code does not read/install receipts or join
replacement participants. Package-owned controls and transparent wrappers must
preserve the exact replacement outcome or exact prepare callback; a custom
low-level control that strips both keeps only the legacy current-revision path
and cannot install a migrated candidate. Supplying the legacy replacement-
prepare callback explicitly selects that same non-composite escape hatch. A real
maintained Engine Lab registry now exercises one/two-step, rejection, throw,
invalid-output, and migration-plus-adoption cases in a separate short-lived
Worker. `deno task test:determinism` compares its exact callback counts,
attempt/receipt, whole-Snapshot digests, adoption, and source-byte preservation
twice in Deno and twice in Chromium, Firefox, and WebKit. The same authoritative
matrix now also consumes the checked-in four-record release corpus: Engine Lab
State revisions 3/4/current 5 and Cat Cafe revision 1. Story-local lifecycle
suites own inspection, applicable migration/adoption or re-anchor, current
validation, load, backup/restore, and fresh-save round-trip.
Registry inspection and callback counting use the repository-only
`@sillymaker/base/testkit/save-state-migration-determinism` subpath. Production
Story code must use the ordinary authoring/runtime contracts and must not depend
on this instrumentation seam.

PF5/M3 Save migration product surface is complete. Current/next work is owned
only by the [production-floor sequence](plans/2026-07-30-production-floor-sequence.md).

Strict JSON numeric regression tests use exact decimal token vectors rather
than wall-clock timing: rounded fractions, safe boundaries, negative-zero
spellings, long coefficient/exponent inputs, and legacy parser-error precedence.
The maintained Save metadata byte corpus is decoded directly and must
canonicalize back to the same bytes, byte digest, and Snapshot state digest;
Save and Debug Bundle tests also prove that exact-integer alternate spellings
normalize without changing canonical output while fractional imports reject
before schema/digest mutation.

`deno task bench:snapshot:memory` is a separate schema-v1 process-isolated memory baseline; it does not change the `bench:snapshot` report. It holds one neutral 1k-entity Session for 1,200 real cross-owner atomic commits, samples `Deno.memoryUsage()` before and after an explicit `gc -> macrotask -> gc` cycle at command sequences 0/200/400/800/1,200, and treats sequence 400 onward as steady state after the 200-entry CommandLog has filled. Dispatch timing excludes collection and sampling; its interval percentiles use each batch's average per-command duration so differently sized checkpoint intervals remain comparable. It likewise writes to an operating-system temporary directory by default and accepts `--output <path>` for a CI artifact. Run it as its own process through the task so the exposed collector and retained-heap measurements are isolated.

`deno task bench:composition-state` measures the neutral Composition/State path
that the physical Snapshot benchmark does not cover. Its generated fixture has
16 neutral State modules by default and retains the complete historical
`10 KiB / 100 KiB / 1 MiB` exported-Save by `1 / 4 / 16` atomically
touched-module matrix. The same workload accepts `--module-count 160`; M0's
scale baseline selects 16 and 160 modules, `100kib` and `1mib` Saves, and 1 and
16 touched owners without creating another runner. Save payload is ASCII data
distributed across all selected module-owned strings; calibration happens
before timing, the final export has the declared exact byte size, and every
string remains below the Save codec's 262,144-byte UTF-8 limit.

Each matrix cell first proves a fixed 256-commit transcript: the CommandLog
retains ordinals 57 through 256, its replay base is sequence 56, authoritative
replay executes all 200 retained entries, and export to an isolated import
Session round-trips the Save bytes and Snapshot digest without replacing the
source Session. That retention-crossing duration is labelled separately. The
steady command measurement uses a fresh Session, performs 256 untimed commits
to fill the retention window and warm the path, then measures 64 more commits.
Cold activation is also independent and reports profile mount, direct State
plan plus application-factory resolution, sole Session creation, and complete
disposal as four separate distributions. Defaults are one warmup and five
samples; `--module-count`, `--save-class`, `--touched-modules`, `--warmup`,
`--samples`, and `--output` narrow or customize a run. The M0 scale timing
matrix is:

```sh
deno task bench:composition-state \
  --module-count 16 --module-count 160 \
  --save-class 100kib --save-class 1mib \
  --touched-modules 1 --touched-modules 16
```

`deno task bench:composition-state:memory` accepts exactly one declared GC cell
per process. It retains the five historical 16-module cells and makes all eight
M0 scale combinations selectable (`16 / 160` modules × `100kib / 1mib` ×
`1 / 16` touched owners), for 11 unique declared cells in total. Pass all three
axes explicitly, for example:

```sh
deno task bench:composition-state:memory \
  --module-count 160 --save-class 100kib --touched-modules 16
```

It samples sequences 0/200/400/800/1,200 after the same explicit
`gc -> macrotask -> gc` protocol. Run separate invocations for each needed
cell; one report never combines process heaps. Both Composition/State CLIs
write schema-v2 JSON to an operating-system temporary directory by
default and print only its path. Reports include Deno/V8/TypeScript and OS/arch,
the source revision, and a `workingTreeModified` boolean, but no hostname,
current directory, repository path, diff inventory, or machine identifier.
The focused `deno task test:composition-state-bench` behavior suite is part of
`deno task test`; it creates no report and locks only the matrix, correctness,
portable report schema, and fake GC schedule.

Wall-clock, memory, and GC values from either benchmark are trend evidence, not ordinary CI gates. Normal tests assert deterministic schedules, internal work counts, report schemas, and byte-equivalent Snapshot/CommandLog behavior; they do not assert one machine's timing, heap, RSS, or collector result. Raw local baseline JSON is not committed.

The completed owner-grade 3x3 matrix and five isolated GC-cell observations are recorded in the [experimental Composition/State plan](plans/2026-08-18-experimental-composition-state-runtime.md). They are a dated local checkpoint, not default expectations for another machine.

The same policy applies to Composition/State measurements. Absolute p50/p95,
heap, RSS, collection, and cold-activation observations are candidates for an
owner-reviewed budget only after comparable repeated runs. The experiment's
greater-than-10-percent stable-command stop condition applies only to repeated
same-resolved-dependency comparisons; it is a review decision, not a portable
CI threshold. The existing roughly 3 MiB physical Snapshot workload remains
the high-node-count evidence and should not be duplicated by inflating this
Save-locality matrix.

The Scale Lab's static-content axis stays separate from State. Run the compact
manifest build and first-pack admission one profile per process:

```sh
deno task bench:content:compile --profile content-reference
deno task bench:content:compile --profile content-scale
```

The current profiles generate 2 logical packs × 3 locales and 100 packs × 8
locales, with 1,000 default entries per pack and partial non-default variants,
while sharing the same two-node control plan and minimal mutable State. Each
process performs one warmup, records five raw manifest-build, pre-demand locale-
selection, and first-pack-admission samples with p50/p95, and takes isolated
retained-heap checkpoints around the session after the explicit two-pass GC
protocol. Both profiles demand only the first logical pack and load only its
active plus default-fallback variants: 2 variants / 1,500 admitted entries, with
zero cold-variant loads. The scale session therefore retains a larger compact
topology, not the other 99 packs or 798 physical variants. The generated fixture
stays process-local and the JSON report lives only in an OS temporary directory;
timings and heap remain trend evidence. Ordinary tests protect these structural
counts, per-ID fallback, an inline-copy-free control plan, and identical 60-byte
State/digest, not one machine's measurements.

The 2026-08-24 M1 same-machine five-sample checkpoint used the final modified
worktree over base HEAD `eb718bcaa6683785634cbfd6efb9ce637efafbd1`. It measured
manifest-build p50/p95 `0.505/1.970 ms` versus `35.872/37.205 ms`, first-pack
admission `7.679/8.303 ms` versus `7.227/7.903 ms`, and session retained-heap
delta `186,864 B` versus `212,264 B` for 1,000/100,000 declared entries. These
are raw review evidence, not portable thresholds. They predate the corrective
removal of exact length/SHA/declared-entry receipt fields and remain historical
evidence for payload separation, not a remeasurement of the smaller logical
descriptor. The corrective modified-worktree rerun measured logical manifest-build
p50/p95 `0.348/0.363 ms` versus `0.899/0.934 ms`, first-pack admission
`7.797/9.107 ms` versus `7.884/8.954 ms`, and 1/100-pack initial JavaScript
`361,006 B` versus `361,664 B` gzip (`+658 B`). Both profiles still load one
1,000-entry pack and retain the same 60-byte State/digest; raw reports remain
temporary owner-review evidence.

The 2026-08-25 M4 five-sample rerun uses the current multi-locale fixture. The
2-pack/3-locale reference versus 100-pack/8-locale scale profiles measured
manifest-build p50/p95 `0.177/0.348 ms` versus `4.106/11.922 ms`, pre-demand
locale selection `0.0045/0.0065 ms` versus `0.0045/0.0061 ms`, and first logical-
pack admission `5.097/7.041 ms` versus `4.703/7.082 ms`. Both retained exactly
one demanded pack, two variants, and 1,500 entries with zero cold-variant loads.
The single retained-heap deltas (`237,352 B` / `583,312 B`) are noisy trend data,
not a memory budget or proof of proportionality.

`deno task bench:authoring-index` generates a 10-document mixed-family reference
profile and a 1,000-Authoring-Scene scale profile (50 objects per scene). It
measures a fresh lazy project owner, one sweep through the real metadata/list
consumers over its cached snapshot, and one changed Scene becoming current after
path invalidation. The report records
raw timing plus the owner's real `treeWalks/fileReads/parses/invalidations`
deltas. For N valid documents the maintained structural expectations are
`1/N/N/0`, `0/0/0/0`, and `0/1/1/1`; the last case is one direct logical
invalidation, not a claim that a Vite watcher and an explicit CAS write can
never both signal the same physical edit. The benchmark reports measurements
and does not make a promotion decision. Generated documents are removed and the
JSON report defaults to OS temp; `--output <path>` selects an artifact location.

The 2026-08-24 M4 modified-worktree, Deno 2.9.5 checkpoint (one warmup plus five
samples) measured the 1,000-scene/50,000-object profile at cold-build p50/p95
`186.112/189.645 ms`, cached sweep `0.040/0.052 ms`, and single-file
invalidate-to-current `0.639/0.710 ms`. Cold work was one tree walk plus 1,000
reads and 1,000 parses; cached work was all zero; invalidation performed one read,
one parse, and one invalidation with no tree walk. These are raw local trends and
structural work counts, not a portable timing threshold or promotion decision.

The bundle axis uses the real Template Player entry and the maintained
SillyMaker Vite config, while holding its GUI and selected first 1,000-entry
pack constant:

```sh
deno task bench:content:bundle --profile bundle-reference
deno task bench:content:bundle --profile bundle-scale
```

The scale profile adds another 99 compact manifest descriptors and 99 external
JSON pack assets; none is statically imported into JavaScript. The task performs
one structural release build, walks Vite's manifest from the sole entry through
static `imports`, and reports raw/gzip initial and total JavaScript plus separate
content-asset bytes and source/environment provenance. It does not time builds,
compare revisions, or decide promotion. Source/build fixtures are deleted from
OS temp; the small JSON report remains in OS temp unless `--output` is supplied.
The historical 2026-08-24 final-worktree checkpoint measured initial transitive JavaScript gzip
`361,312 B` versus `366,431 B` (`+5,119 B`, below the accepted 32 KiB structure budget) and pack
assets gzip `5,850 B` versus `585,737 B`; unlike M0's `+556,838 B` JavaScript
gap, payload growth is now visible in the deployable content assets where it
belongs.

The 2026-08-25 M4 V2/variant-topology rerun measured reference versus scale
initial JavaScript at `1,255,578/329,681 B` versus `1,265,676/330,457 B`
raw/gzip. External physical variants measured `102,111/5,787 B` versus
`10,211,100/579,253 B` raw/gzip. These remain raw structural observations; the
benchmark itself applies no promotion threshold.

For maintained Story payloads, run the product verifier rather than either
benchmark:

```sh
deno task check:assets
```

It resolves each application that opted into runtime-asset verification, checks
its ordinary asset manifest, then creates one Base text-content session and
reads and bounded-admits every declared pack from that application's root. The
runtime contract checks the exact V1 wire shape, logical pack identity,
text-catalog topology/IDs and cross-pack conflicts, and derives the actual entry
count. It does not compare editable payloads with sibling length/hash/count
receipts or require a generator/currentness step. Runtime-image paths are
admitted once as app-root-relative `assets/**` names; the trusted project Host
maps those names and the verifier checks file presence, decoded media type, and
dimensions without realpath/symlink attestation. Vite development/build serving
and copying continue to use the existing `assets/**` pipeline; refresh/restart a
running fixed-manifest content session after a direct text edit.

The CR3 Player baselines follow the same policy. `deno task bench:surfaces`
runs 1/4/16-target Stable publication workloads with small and medium parameters
through initial, equal no-op, one-change, all-change, and empty transitions. It
reports p50/p95 plus the engine's semantic notification/preparation hints; those
hints describe engine work and are explicitly not JavaScript object-allocation
counts. `--warmup`, `--samples`, and `--output` customize the run; the default
output is an OS-temporary schema-v1 JSON file.

`deno task bench:player` fresh-builds Engine Lab and runs a dedicated prebuilt
Chromium configuration three times. Each fresh context records cold start,
Narrative semantic-to-visible readiness, Say, Choice, Auto/Skip, History,
WholeCanvas initial/replacement/detail, post-GC retained heap, and a CDP sampled
allocation trend around WholeCanvas transitions. The report records browser,
Deno/V8, OS/arch, HEAD/dirty, a 4x CPU-throttle factor, and sampling interval;
it is Chromium-runtime-specific and must not be compared as a cross-browser
compatibility promise. Playwright writes each `baseline.json` under the OS temp
directory (or `SILLYMAKER_PERFORMANCE_OUTPUT_DIR`).

`deno task bench:player:bundle` performs a fresh release-profile build and
reports raw/gzip bytes for entry, preload, lazy, all JavaScript, all CSS,
runtime assets, and all files. Schema v2 adds the final chunk/asset dependency
graph and per-output `contributionIds`, including CSS-only dynamic entries; all
recorded edges name real final outputs. Template and Engine Lab ordinary release
Player measurements are semantic negative controls for absent Agent modules; they also
classify Inspector/authoring, DevDock, preset-settings, Agent, RPC, and private-extension
implementation facets without freezing an exact full-module inventory. Template's ordinary
release proves every outer facet absent and keeps its initial static JavaScript at or below the
accepted 360 KiB gzip product budget. `template/reference.html` is the real positive control
for the first-party reference settings/DevDock composition; Engine Lab release selects the
same outer boundary plus its lazy private-extension contribution, while Template and Engine
Lab Author entries remain the Inspector and Agent structural controls. The
`@sillymaker/ui/debug/dev-source-client` subpath
resolves to the fetch/write implementation only under the `development` condition; the default
and release graph receive a fail-closed unavailable stub. Engine Lab's release
graph also excludes its dev-only Inspector binding plus embedded-author virtual
entries. The
measurement receipt and default report stay in OS temp and never enter the
Player. The task accepts `--application`, `--out-dir`, and `--output`; defaults
are Engine Lab and OS-temp output. Byte sizes are build facts, while build
duration is machine-specific. None of these tasks adds a normal per-commit CI
threshold. Review at least three comparable samples before proposing a product
budget, and never commit raw local reports.

AR5's generated Author-entry measurement now covers standalone and embedded Inspector
composition. Template is the negative control: its complete measured Author graph retains the
Authoring Host, Inspector, and real development source client while excluding
`engine/packages/agent/**`, Agent RPC/fake, and the experimental Agent runtime/surface. Engine
Lab explicitly selects the private Agent companion and is the positive control for those same
modules. This is final module/source graph structural exclusion, not package-installation
evidence or a Desktop author build.

`deno task bench:gui:startup --application e2e --samples 3` runs the maintained generic GUI
startup benchmark. It resolves the selected application through the workspace config, builds it
once, then uses a fresh Chromium context per raw sample. The two measurements are the admitted
GUI startup shell reaching `ready` and the first visible enabled interaction inside the application
root. `--application` selects another configured application and `--output` selects the JSON path;
the default report lives under OS temp. The report includes Deno/V8/TypeScript, OS/arch, browser,
HEAD/dirty, and individual samples. It does not compare revisions, calculate a decision, or apply a
promotion threshold, and raw local reports are never committed.

The retired one-off AR5 runner's 2026-08-23 five-pair result remains only as historical evidence:
first-actionable paired median delta `-4.23ms / -3.54%` and stable-command paired median delta
`-0.72ms / -1.40%`. Its baseline/candidate checkout orchestration, fixed ordering and rounds,
thresholds, decision enum, and report protocol were deleted after that milestone decision. These
local numbers do not promote Desktop behavior. The AR5 mainline is delivered; only activation of
the independent Desktop HMR candidate remains deferred to accepted stable Deno source-and-behavior
revalidation, without blocking unrelated lanes.

## Change workflow

1. Read the active document and implementation nearest the behavior being changed.
2. Decide which package owns the change and whether it affects a workspace public export or persisted data.
3. Add or adjust a focused behavior test when it meaningfully reduces regression risk.
4. Implement the smallest coherent change; keep Story-specific concepts outside generic engine packages.
5. Run focused tests, then the relevant broader commands.
6. For a React/TSX slice, run `deno task audit:react --base <slice-start-ref>`, classify every new finding, and rerun affected tests after any repair.
7. Update active docs when the architecture, supported workflow, user-visible behavior, or compatibility promise changes.

Commits can be organized for reviewability, but there is no required Phase-to-commit mapping, checkpoint hash, exact staging contract, or clean-tree admission script.

Pre-release workspace API and source-shape compatibility are not product goals.
Only an explicitly accepted external or persisted contract, such as a Save or
wire format, can justify a compatibility path; an old export, internal consumer,
test, or historical implementation does not create that promise.

Authoring files likewise use the current admitted format during pre-release.
When that format changes, update maintained source, reader, tests, and live docs
together and remove the old path. Do not add a migration registry, dual parser,
or per-view revision axis until a concrete released/persisted source population
has an accepted compatibility requirement.

Cleanup does not remove an accepted independent-engine capability merely because
the current repository has no consumer. Confirm its accepted contract,
orthogonality, owner, and maintainable semantics. By contrast, once a contract
is replaced, remove its old implementation, export, dedicated tests, and live
documentation together unless a concrete compatibility promise says otherwise.

## Testing policy

Browser commands exercise the Engine Lab Story ([E2E engine validation design](design/e2e-engine-validation.md)); the retired PoC product suite left with its application. Production Narrative coverage also runs through the starter template, Bookshop, and Cat Cafe. WholeCanvas browser coverage uses Engine Lab's exact `whole_canvas_conformance=1` opt-in plus Cat Cafe's real ending. GUI-only applications such as the current SillyOS use the separate `startWebGuiApplicationV1` path and therefore make no Story, Narrative, or WholeCanvas claim. Focused composition tests protect omission inside Game applications. The promoted matrix exercises the same public definitions and default Hosts used by applications rather than conformance-only engine entries.

Playwright tests and E2E runs are silent by default so local and CI execution do
not play audible media. The real audio Host, playback, interruption, cleanup,
and lifecycle paths still run; only audible output is suppressed. A test that
specifically needs audible playback can opt in with
`test.use({ audibleAudio: true })`.

Headless Story tests should drive gameplay through `createGameHarnessV1` from `@sillymaker/base/testkit` rather than assembling private Session/semantic/persistence fixtures.

Tests and scripts are maintained when they protect product or reusable-engine value:

- command commit/rejection/fault behavior;
- deterministic rules and randomness;
- module ownership and public API behavior;
- Save/load/import compatibility and recovery;
- semantic preview/dispatch parity;
- presentation, accessibility, input, and browser flows;
- diagnostics and capability safety;
- build output that a Player actually needs.

Avoid tests or fixtures that exist only to prove development choreography, such as:

- Phase completion or a named task commit;
- exact source replacements, complete DOM identity inventories, repository file
  inventories, task-specific command sequences, or checkout layouts;
- one exact host toolchain, browser revision, cache, machine/process attestation,
  or process-tree cleanup proof;
- Git cleanliness as application behavior;
- byte-for-byte snapshots of provisional balance, reference strategies, or disposable calibration reports;
- copied fixture trees when a small in-memory builder can express the business case.

Milestone characterization, A/B, and promotion harnesses are temporary evidence
by default. Delete them after the decision, or shrink the genuinely reusable
part into a small general-purpose tool. Benchmarks publish raw measurements and
environment facts; they do not make a promotion decision unless an accepted,
continuing product budget defines the threshold.

Use exact validation for actual boundaries such as untrusted bytes, Save/wire
formats, digests, CAS, generation/currentness, and observable identity. After a
boundary has parsed, normalized, and admitted data into a typed representation,
internal consumers trust it rather than repeating prototype, descriptor,
accessor, or captured-intrinsic defenses.

A checked-in fixture is justified when its bytes are themselves a maintained external format or compatibility promise—for example, a Save migration sample. Document what compatibility it protects and provide an intentional update path.

The Save compatibility release corpus keeps its four canonical records as
physical, immutable files: Engine Lab revisions 3/4/5 and Cat Cafe revision 1.
Do not regenerate an older record from the current encoder, re-encode it inside
a test, or infer an unlisted compatibility floor. A supported State change must
update the deliberate fixture declaration and rerun the Story lifecycle corpus,
the Deno/Chromium/Firefox/WebKit migration matrix, affected `@save` browser
flows, relevant prebuilt Player gate, and `deno task check`; the exact release
workflow is in [build and release](build-and-release.md).

The reusable `@sillymaker/base/testkit` package is appropriate for compact behavior-level setup shared by real engine/Story tests. A “harness” is not a problem by name; a harness with no maintained product contract is. Its revisioned Save-metadata corpus is the shared byte authority for runtime/Host parity work: expected records use lossless base64 plus maintained lengths and SHA-256 values, while Host payload helpers return fresh byte copies. Update that corpus only with an intentional Save-contract change, record the old/new bytes in the active migration plan, and rerun the focused lifecycle matrix before aggregate checks; do not regenerate it from the implementation under test or duplicate it in Browser/Desktop fixtures.

DET2e's browser-neutral ordering implementation remains direct-file-only under
`engine/packages/base/src/testkit/`: `authoritative-ordering-vectors.ts` runs one
Event Pool, Content Database, Session transaction, CommandLog, and authoritative
replay vector, while `authoritative-ordering-vector-expected.ts` owns the hand-written
fixed expected. Neither file is a package-barrel API. DET4 exposes only the narrow
test-only `@sillymaker/base/testkit/determinism-vectors` facade, which re-exports those
same values alongside M0a's unique compact corpus and the synthetic summary-normalization
seam. Browser runners consume this facade rather than copying or sorting a new oracle.
The expected module must never derive order from `localeCompare`, `Intl`, the
implementation comparator, or current Host locale.

## Current core/web stabilization record

The 2026-08-13 PF7 local stabilization ran on latest stable Deno 2.9.5. The
fresh canonical gate passed 271 unit-test files / 4,690 tests, assets, all five
Story checks, and the Engine Lab release build. The maintained Save/current-load
selection passed 4 files / 57 tests; the authoritative matrix passed its Deno
suite and two repeats in each of Chromium, Firefox, and WebKit. Both Engine Lab
and Cat Cafe passed their `@save` flows in all three browsers, and the Engine
Lab prebuilt suite passed 44/44. Raw machine reports stayed in OS temporary
directories.

This record does not add a Deno patch pin, browser revision promise, Git-state
test, or performance threshold. It also does not promote Desktop durability or
packaging. The build still reports large-chunk warnings; use the CR3 bundle and
browser trends to guide later code splitting, and require comparable repeated
evidence before proposing a budget.

## Dependencies and toolchain

- Add dependencies at the narrowest package that uses them and keep versions exact.
- Update the shared lockfile with the manifest.
- Review browser compatibility, ESM support, bundle effect, and maintenance cost
  in proportion to the dependency's role. Discuss intentionally copied or
  adapted third-party material with the owner before adding it.
- Do not add a legal scanner, attribution inventory, or source-history system.
- Keep direct Node TypeScript tools compatible with the way their package scripts execute them; ordinary project code is still typechecked by TypeScript.

The minimum engine compatibility versions belong in root `package.json#engines`. Do not duplicate a stricter toolchain pin in documentation unless a real upstream incompatibility temporarily requires it.

## Public API and documentation maintenance

When changing a package export:

1. update its `package.json#exports` and public barrel intentionally;
2. add an API/consumer behavior test if external Story code depends on the shape;
3. update [architecture](architecture.md), [features](features.md), or [Story authoring](story-authoring.md) where the responsibility changed;
4. identify any Save, Hotfix, tooling, or application consumers that require migration.

Version suffixes such as `V1` identify the current contract family. They do not prohibit replacement; a replacement should make coexistence and migration explicit, then retire obsolete paths rather than maintaining parallel authorities forever.

For Narrative UI, external Story code uses `NarrativeSurfaceDefinitionV1` and
`defineNarrativeSurfaceV1` from `@sillymaker/ui`, then returns the definition as
`ui.narrative`. Do not recreate the removed `@sillymaker/ui/conformance`,
`DialoguePanelV1`, `VnLayerV1`, advance-surface, or raw text-reveal/playback
exports, and do not add a `slots.narrative` writer. Tests should drive the
public renderer actions and observe authoritative publication, Host focus/inert
behavior, and Semantic Stage settlement.

For WholeCanvas UI, external Story code uses `defineWholeCanvasSurfaceV1` and,
when navigation is not semantic-publication selected,
`createWholeCanvasApplicationSourceV1` from `@sillymaker/ui`. Return the
once-admitted typed definition as `ui.wholeCanvas`; internal consumers trust it
without runtime brand/origin checks. Do not import the private Host/session, add a
Root slot, or retain frame/topology evidence. Tests should drive renderer
actions and assert read-only primary/detail replacement, readiness, focus,
input isolation, successor fencing, and omission. Title/Splash tests exercise
the same package-owned WholeCanvas front door rather than a direct Root writer.

## Debugging failures

Start with the narrowest failing test or command. Classify the failure as product behavior, type/API drift, browser environment, generated output, or a stale test assumption. Repair the responsible layer rather than adding another wrapper whose only purpose is to satisfy command ordering.

Runtime failures visible to players should use structured outcomes and bounded diagnostics. Unexpected browser/runtime faults can be inspected through the existing diagnostic and DebugBundle features; do not put secrets or unrestricted local data into those exports.
