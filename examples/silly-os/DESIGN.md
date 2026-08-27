<!-- SPDX-License-Identifier: MIT -->

# SillyOS product and visual contract

Status: active Browser-first dual-target rewrite with P2 Browser Program
persistence, bounded terminal Agent-run receipts, and all three P3c-B0
checkpoints delivered and closed on 2026-08-27: OPFS Program workspace
authority, cold reopen, recovery/contender semantics, explicit storage policy,
the automated Chromium/persistent-WebKit `20 MiB+` scale gate, and canonical
portable ZIP download. P3a-B1 checkpoint 1 also delivered on 2026-08-27,
binding fixed Pi's native `edit` to the same OPFS authority. P3a-B1 checkpoint
2 subsequently delivered native Pi `bash` through the bounded Browser Local
just-bash profile and closed P3a that day. P3c-B1 checkpoint 1 then delivered a
Host-owned immutable snapshot candidate plus cold-reopen contract on
2026-08-27. Checkpoint 2's bounded Host publication-lifecycle slice then
delivered target-neutral receipts, exact retained-package ownership, review-head
capture, explicit publication resume, and the transient Host fence that day.
Repository V3/physical V4 and the single shared Repository/Host Authority then
cut over together and passed independent review on 2026-08-28. Checkpoint 3
then delivered the accepted/reviewed/mutable head presentation, truthful live
divergence, winner-held stale rejection, cold reopen, and exact retained ZIP
evidence in Chromium and persistent-profile WebKit. P3c-B1 therefore closed on
2026-08-28. The name-only deployment commit
`60bbb4f559a001e59a4e470e30a7f4808d440ce3` rebuilt the same product at
`https://silly-os.jasl9187.workers.dev` as Cloudflare version
`919cb0a4-d510-452a-b73d-79070ec8e35e`; a fresh public-origin Creator Home ->
durable Program workspace smoke and the Chromium/persistent-WebKit fixed OpenAI
qualification passed. P1-B1a has now delivered and closed the clean
replacement: the ordinary route exposes Pi-owned Provider/model discovery,
SillyOS-owned Settings, and selection of the exact qualified OpenAI profile. Its
local gate passed 265 product tests plus the Settings and real OpenAI journeys
in Chromium and persistent-profile WebKit. B1b/B1c, broad execution-provider
research, import, and later workspace slices remain inactive; no successor
checkpoint is activated by this closure. The
former "SillyOS 98" desktop
experiment has been retired as a product direction. It remains useful only as
repository history; it is not a compatibility baseline for this rewrite.

Until the first stable release, SillyOS promises no backward compatibility for
its product-private APIs, persisted preview schemas, launch flags, or internal
artifacts. A breaking product change replaces the old contract and may reset
preview-local data. Delete superseded implementations, types, admissions,
fixtures, and tests in the same slice; do not add dual readers, migration
frameworks, shims, fallback paths, or deprecated aliases. Once a stable release
explicitly freezes a public or durable contract, later plans must define its
migration policy before changing it.

## Product definition

SillyOS is a creator-oriented Agent product built with SillyMaker. Its purpose
is to turn a person's intent into a Program that both the person and a coding
agent can understand, run, inspect, and revise.

**Creator is the only built-in user-facing program.** Platform services, model
access, storage, RPC transports, tool runtimes, and databases are infrastructure,
not icons in an imitation desktop. Creator starts on a focused prompt surface,
then opens the resulting Program in a persistent work area.

In this product, a **Program** is one cohesive unit:

```text
Program = project + harness + agent + app
```

- **project** — the Program's durable identity, sources, content,
  configuration, generated artifacts, project-local data, and exact accepted
  snapshot lineage;
- **harness** — the Pi instructions, extensions, skills, tools, constraints,
  and executable acceptance that guide both the person and the agent;
- **agent** — the Program's explicitly selected Pi profile and capability
  composition, not one live Pi session or transcript;
- **app** — the runnable user-facing interface and outputs.

This equation describes product ownership, not four authorities or four things
that must always be optional. A Program **has** a Workspace; it is not identical
to the mutable Workspace instance. The Workspace is the operational projection
of the project and harness for one generation, while an accepted Program
revision names an immutable reviewed snapshot. A translation Program, for
example, may require translation and model capabilities and still be one
complete product.

Creator Chat is the Program's supervisor and editor surface, not Program
content. A Creator supervisor session binds a live Pi session to one Program
and its current Workspace, explains work, requests changes, and coordinates
review. The same Program can be reopened under a later supervisor session, and
conversation does not enter an accepted Program revision unless the user or a
tool deliberately saves some content as a project artifact. Opaque session
references and bounded activity receipts may be product metadata without making
the transcript part of the Program.

The initial intended product families are translation, writing, role-play, and
general creator tools. They are not four built-in applications. Creator makes a
Program by selecting and configuring the required product capabilities.

Pi is the Agent runtime authority. SillyOS does not create another Agent loop,
provider SDK, session format, tool dispatcher, or plugin system beside it.
Program-specific Agent behavior is implemented with Pi's extension, skill,
prompt, model, and tool contracts. SillyMaker owns the GUI and interaction
surface that presents those capabilities; it does not become their backend.

Each opened Program Workspace is paired with one logical execution environment
and one persistent volume. The volume contains the mutable working tree, `.git`,
Agent outputs, artifacts, file-resident Program data, `AGENTS.md`, and Program
skills and prompts. Pi tools may change this draft. An accepted Program revision
is a separate immutable snapshot selected through exact human review; it does
not advance merely because a tool wrote a file. The stable requirement is a
familiar coding-tool environment over this one volume, not a particular
container or a complete Linux claim. A logical environment may combine
TypeScript commands, several workers or Wasm modules, and a target-native or
user-selected sandbox provider; it is not required to pretend that a complete
Linux environment is one literal WebAssembly instance.

## Reference and fidelity boundary

The primary interaction reference for the workspace is
[Cloudflare OS](https://github.com/cloudflare/cloudflare-os/tree/6223e261f18849b817a8d7ca03fe3678b77048ca)
at commit `6223e261f18849b817a8d7ca03fe3678b77048ca` (2026-08-25), together with the
owner-supplied "Q3 Planning Workspace" screenshot reviewed on 2026-08-26. The
reference establishes the practical two-pane Agent workspace, compact chrome,
workpiece tabs, focused output, and single-pane mobile adaptation.

The reference is an interaction and product-design input, not a runtime or
source dependency:

- do not copy Cloudflare branding, logo, orange identity, screenshots, demo
  text, fonts, illustrations, or other assets;
- do not copy the Cloudflare Workers backend, Durable Objects, Dynamic Workers,
  Gatekeepers, deployment topology, authentication, or multi-user system;
- do not import or read `references/cloudflare-os` from product code, tests,
  builds, fixtures, screenshots, or generated Artifacts;
- do not fork its large frontend. Implement the accepted roles natively with
  SillyMaker, React, CSS, and deliberately selected upstream UI dependencies;
- preserve SillyOS's own blue/mint identity and approachable light surfaces.

High fidelity means preserving the reference's user-observable roles, spatial
clarity, responsive behavior, input quality, and visual finish. It does not mean
preserving Cloudflare's names, content, architecture, or distinctive expression.

| Cloudflare OS role           | SillyOS role                   | First-preview status                                |
| ---------------------------- | ------------------------------ | --------------------------------------------------- |
| Home prompt                  | Creator home                   | Deterministic local prompt flow                     |
| Workspace chat               | Creator session                | User and Creator messages                           |
| Gadget / workpiece           | Program and its current output | One local Program lineage at its current revision   |
| Blueprint                    | Program recipe/template        | Deferred; no public format yet                      |
| App / document / slides view | View                           | Fake runnable preview                               |
| Code                         | Source                         | Presentation-only placeholder or omitted until real |
| Connections                  | Capabilities                   | Declared preview only; no real connection           |
| Activity                     | Proposal and action history    | Local create/revise/accept/reject history           |
| Provisional change           | Program proposal revision      | Exact local revision review with stale rejection    |

## First-stage boundary: Creator Preview

The first deliverable is deliberately called **SillyOS Creator Preview**. It
exists to settle the product model, visual system, responsive work area, and
human/Agent revision interaction before integrating an expensive or stateful
backend.

It may provide:

- a Creator home prompt for translation, writing, role-play, or a general
  request;
- a deterministic local Creator response;
- one local Program lineage whose proposals contain a name, summary, selected
  capabilities, accumulated requirements, and fake output preview;
- a Program work area with the user/Creator conversation, the proposal, and
  activity;
- local monotonic Program revisions with pending, accepted, and rejected
  proposal states;
- deterministic follow-up revisions and whole rejection of a decision naming a
  stale `(proposalId, programRevision)` pair.

The opt-in `?agent=pi-test` B0a route may additionally lazy-load the product's
lockfile-pinned `pi-agent-core` / `pi-ai` 0.84.3 into one Dedicated Worker, run
Pi's real `Agent` against its deterministic faux provider, register the single
`sillyos_propose_program_revision` `AgentTool`, stream a bounded final reply,
and offer that tool's exact candidate to the same product revision authority.
This is wiring evidence, not a live provider or a second Creator product mode.
The ordinary route does not load that Worker graph.

The ordinary Browser route exposes one application-level Settings surface.
Opening it lazily asks the product-pinned Pi Worker for its complete public
Provider/model catalog before any credential exists; React renders a bounded
projection and never imports Pi or maintains another catalog. SillyOS overlays
only exact target facts. In B1a, only Pi's
`(openai, gpt-4.1-nano, openai-responses, https://api.openai.com/v1)` profile is
qualified and selectable. Other Pi records remain inspectable but disabled;
five named B1b profiles may be labelled candidates without becoming support
claims. The removed `?agent=pi-openai` value has no user-facing compatibility
behavior and resolves like any ordinary URL.

The selected API key moves from an uncontrolled password input directly to a
fresh Agent Worker, is cleared from the input immediately, and remains only in
that Worker's memory. Initialization means only that the profile is configured;
authentication is established by a run. Switching or Forget terminates the
Worker and requires re-entry. The non-secret selection is current
device/session supervisor configuration and is not yet Program-owned Pi
composition; neither it nor the key is persisted in Program, Workspace,
IndexedDB, OPFS, URL, logs, or exports.

It does **not** claim:

- that B0a makes a real model request, or that B1a's one qualified live
  follow-up profile proves general BYO Provider, workspace tool,
  Wasm, network-service, or workspace-runtime readiness;
- Pi-session or workspace-file persistence, project import/export, background
  execution, generated-code execution, or arbitrary package installation;
- a public Mod, Agent, Program, Blueprint, or connection ABI;
- production translation, writing, role-play, or OpenUI behavior;
- that an accepted fake proposal has created a distributable application.

The B0a route must separately identify its real Pi Agent plus deterministic
provider and must not imply that the synthetic test value is a provider key.
The ordinary route must expose its Pi catalog, exact Browser qualification,
current selection, and memory-only credential ownership without presenting
disabled catalog records as usable.
Fake events use the same product-owned session model as the UI. P2 persists
that admitted product projection and bounded terminal run meaning through the
real Program repository; it does not rename the projection Pi history or wrap
it in a generic storage framework.

## Product and engine ownership

SillyOS is a GUI product for Browser and Deno Desktop. Browser is the current
implementation priority so the deployed example can become a usable local-first
product; Desktop remains a first-class route behind the same product contracts.
The same React product surface and responsive contracts apply to both targets.
Target-specific chrome or services belong to a Host boundary only when they
change a real product behavior.

- Creator supervisor session and Program proposal state are separate product
  authorities. They do not create a second SillyMaker game State, Save, replay,
  or command authority.
- A Creator supervisor session owns Chat, live Pi-session binding, and review
  coordination. The Program owns its selected Pi profile/capabilities and
  accepted artifacts, not that live conversation. P2's bounded
  `CreatorSessionSnapshot` packaging is an implementation-stage persistence
  shape, not the final domain claim that Chat belongs to Program content.
- The mutable workspace volume owns working-tree bytes. The SillyOS product
  database owns Program catalog metadata, exact accepted revision/snapshot
  references, decisions, and product-visible receipts; it does not duplicate
  those bytes. Pi auth/session storage is a third, separate owner.
- The first preview uses no Game/Story simulation and no Save path.
- Program presentation may use ordinary React and mature web packages. A
  third-party component remains responsible for ordinary same-realm browser
  behavior; SillyMaker does not invent a JavaScript sandbox around trusted UI.
- The existing private, build-known Mod runtime is not a public ecosystem and
  is not selected by the first preview. Agent-side capabilities use Pi's public
  extension/tool mechanisms instead; they are not SillyMaker Mods, and arbitrary
  generated code is not admitted as either kind of extension.
- React presentation never owns Pi, provider streams, the Program database,
  workspace tools, companion processes, or external services. In Browser, a
  Dedicated Worker owns Pi and temporarily owns the user-supplied credential;
  in Desktop, the private companion owns them. A typed product transport exposes
  only the state and actions needed by the GUI; it is not a second Agent
  protocol or runtime.
- Product-private development launch arguments and `.env` files may select a Pi
  provider/model and supply credentials without a UI. They remain companion
  configuration: no key, provider record, or environment snapshot enters React,
  bootstrap HTML, Program data, logs, or the product RPC wire.
- The deployed fixed Browser route accepts a user-supplied OpenAI key through
  UI. A later qualified profile may additionally accept a compatible HTTPS
  endpoint; that surface is not implemented yet. The key necessarily enters the
  password input, then transfers immediately to the Agent Worker and remains
  memory-only by default. It never enters React state, URLs, logs, telemetry,
  Program data, IndexedDB, OPFS, Cache API, exports, or downloads. Terminating
  the Worker is the forget operation. This ownership split is not a defense
  against same-origin script compromise or privileged browser extensions.
- Pi owns Agent session behavior and its native session data. SillyOS owns
  Program revisions, human decisions, product artifacts, and domain data, with
  only opaque Pi session/credential references crossing that boundary. Neither
  is deterministic game Save. P2 durably stores the bounded Program catalog,
  product-session projection, and terminal product receipt keyed by a
  product-owned `agentRunId`; Pi session/run identities, credentials, provider
  data remain non-durable in the delivered baseline. P3c-B0 adds only an
  OPFS-backed mutable Program checkpoint, its small product continuation
  manifest, recovery/scale evidence, and a portable ZIP of that checkpoint's
  manifest plus VFS files; it still does not persist or export Pi private
  sessions, credentials, Provider data, mutation receipts, or Creator Chat.
- Browser ultimately binds Pi's shipped `read`, `write`, `edit`, and `bash` tool factories
  to one stable Program-scoped Pi `ExecutionEnv`. The product-private workspace
  boundary eventually owns runtime lifecycle, capability truth, generation
  fencing, the change journal, persistence, and terminal receipts; it does not
  redefine those four tool schemas or results. A sequential outer call scope
  binds product run/tool identity and generation around the native Pi
  `tool.execute(...)`, because Pi environment primitives do not receive that
  identity themselves. Delivered `read`/`write` and P3a-B1 checkpoint-1
  `edit` use the environment's filesystem projection directly. Delivered
  checkpoint 2 uses the environment's shell projection and one closed
  `browser_local_just_bash` profile whose exact output mode is
  `terminal_aggregate`; its thin filesystem projection reaches the same volume.
  Desktop may use the fixed coding-agent's public factory/SDK operation
  hooks through a programmatically constructed fixed tool set or another proved
  public integration route; those hooks are not Extension API overrides. A later
  BYO Sandbox supplies an admitted remote environment. None may fall back to
  ambient Host files or tools. SillyMaker renders projected state and
  interactions only; it does not register tools, run shell processes, or own the
  Agent loop. Executable Pi extensions remain build-known and cannot be loaded
  from the Agent-writable workspace volume.
- Future OpenUI output is admitted as data and mapped through a closed catalog
  to SillyMaker UI components and interaction intents. OpenUI never loads a
  renderer, executes arbitrary actions, or bypasses Program authority.

### Target integration contract

The two targets share `CreatorAgentPortV1`, proposal/currentness rules, Program
repositories, and capability cores. They do not pretend to share one physical
runtime:

```text
Browser: React -> typed MessagePort -> Agent Worker -> pi-agent-core/pi-ai
                                      -> Pi core read/write/edit
                                      -> later bash
                                      -> Program-scoped ExecutionEnv
                                           -> typed environment RPC
                                           -> Workspace Host Worker
                                                filesystem -> OPFS volume
                                                shell.exec -> just-bash 3.4.2
                                                  ephemeral shell base + OPFS `/workspace`

Desktop: React -> private Host route -> companion -> Pi coding-agent subprocess
                                      -> proved tool-factory/SDK operation hooks
                                      -> local workspace provider/volume

BYO:     React -> Agent owner -> admitted sandbox RPC -> remote environment
```

P3a-B0 co-locates its disposable volume with the Agent Worker. P3c-B0 moves the
already-proved `read`/`write` filesystem projection behind the Workspace Host
Worker and OPFS before any shell is selected. Delivered P3a-B1 checkpoint 1 adds
only Pi's native `edit` over that same volume. P3a-B1 checkpoint 2 is also
delivered: exact just-bash 3.4.2 is co-located with the Host/volume owner,
reached by coherent shell RPC, and mounts the sole
persistent OPFS workspace below an ephemeral shell-support filesystem. It adds
no dedicated just-bash Worker. Only a later
non-cooperative custom or Wasm command needs its own terminable Worker.

The current raw Desktop/development launcher resolves only this product's exact
`@earendil-works/pi-coding-agent@0.84.3` CLI artifact from the lockfile-backed
dependency installation and runs it with the current Deno executable. It has no
`PATH`, environment, or argument command override and fails when the local
artifact is absent or is not a regular file. A future Desktop package must
materialize that same fixed artifact closure inside the product; no engine API
owns its materialization. Browser separately bundles the exact
`pi-agent-core` / `pi-ai` dependencies into its lazy Worker chunk and reports
their exact versions in the admitted Worker readiness identity. Exact package
manifest versions plus the root lockfile own dependency resolution; the built
chunk hash and application commit stamp identify the resulting product build.
Neither target searches a host installation or silently falls back when its
product-owned distribution is unavailable.

Browser registers product-specific capabilities such as Program proposal as
public Pi `AgentTool` values and separately binds Pi's shipped workspace tools
to the Program `ExecutionEnv`. Desktop registers the same product-specific cores
with Pi's public `ExtensionAPI.registerTool()`. Its workspace built-ins are a
different integration problem: the public `ReadOperations`, `WriteOperations`,
`EditOperations`, and `BashOperations` are tool-factory/SDK hooks, not
`ExtensionAPI` overrides, so the companion must prove a programmatically
constructed fixed tool set or another public route before claiming isolated
workspace effects. SillyOS does not emulate the complete Extension API in
Browser or create its own Agent/plugin lifecycle. Pi owns the loop, tool schemas,
session semantics, model stream, tool invocation, and Agent-visible lifecycle;
SillyMaker owns only the GUI and interaction surface.
SillyOS does not fork or browser-port `pi-coding-agent`: Browser uses its fixed
public core/AI packages, while Desktop retains the complete fixed coding-agent
artifact and native extension path. The current companion work still admits
only build-known product extensions and does not claim user plugin discovery.
For proposal revisions, the model-visible tool accepts only a requirement; the
trusted handler binds all proposal/currentness fields from the admitted submit,
and the Worker rechecks the resulting candidate.

### First Browser workspace slice

P3a-B0 adds an explicitly disposable execution projection, not the future
durable Program workspace. Opening an existing Creator work area creates a new
opaque `workspaceSessionId`, generation `1`, one empty in-memory volume, and one
stable Pi `ExecutionEnv`. `programId`, the existing Creator `workspaceId`, and
the execution-only `workspaceSessionId` remain distinct. Every ephemeral Agent
submit envelope carries a separate exact execution binding beside the unchanged
durable Agent-run value; no Worker ambient state or `programId` inference
silently chooses a filesystem. Admission initializes a run-local generation
cursor, which advances after each sequential mutating tool settles so one run
can safely perform `write -> read` or more than one write.

Only Pi 0.84.3's public native `write` and `read` factories are bound in this
slice. A tiny binder supplies the stable `{ env }` context and an exact
sequential call scope without changing Pi's tool name, schema, argument
preparation, algorithm, updates, cancellation signal, or model-visible result.
The environment is the byte-effect authority; Pi remains the tool and Agent
authority. The shell half reports unavailable, and no Host path or command is a
fallback.

A write call has two independent terminal facts:

```text
Workspace mutation-call outcome: succeeded | failed | cancelled
Workspace byte effect: none | changed
```

The volume generation advances once only when the final bytes changed, even if
Pi observes cancellation after the write; a byte-identical write also leaves
observable modification time unchanged. Its session-local, bounded mutation
receipt records the exact Program/workspace/session, product Agent run, tool
call, expected/base/resulting generations, outcome, effect, at most one
normalized changed path, and a closed diagnostic. It records no arguments,
contents, transcript, provider data, credential, or Pi session identity. The
transport projects transient Pi run identity to product `agentRunId` and makes
the mutation receipt visible before the associated terminal Agent-run event.
An initially stale execution binding is rejected before Pi starts and therefore
does not invent a tool call or mutation receipt.
For replacement only, a successor that exactly names the still-active
predecessor's admitted generation may wait for that predecessor's unpublished
effects to drain and then rebase once to the resulting descriptor. The Worker
checks this eligibility before it aborts the predecessor; unrelated stale
bindings neither cancel current work nor enter Pi.

P2 and P3a-B0 deliberately do not pretend to share durability. Repository V2's
bounded Agent-run receipt survives reload and reports whole-run/Program commit
meaning. The P3a-B0 mutation receipt and bytes live only for the open execution
session and report actual volume effects even when a run is failed, cancelled,
replaced, or produces no admissible Program candidate. Reload resets the volume
and generation and must be shown as such. P3c-B0 now owns persistent workspace
bytes and their portable download; durable tool receipts and admitted artifacts
remain later independent work. Delivered P3c-B1 owns the immutable Host package,
its publication lifecycle, the exact accepted-revision receipt, and the
accepted/reviewed/mutable identity projection; it still does not turn tool
receipts or arbitrary artifacts into Program content.

The exact DTO, close/cancel ordering, query/ack backpressure, generation rules,
path and capacity ceilings, and Browser acceptance are owned by the delivered
P3a-B0/P3c-B0 contracts and delivered P3a-B1 checkpoint contracts in
[PLAN.md](./PLAN.md). Checkpoint 1 activates only Pi `edit`; checkpoint 2
activates only native Pi `bash` through the bounded just-bash Browser facade.
It does not activate Wasm, Git, Python,
extension discovery, a Linux/sandbox claim, Desktop execution, or any
SillyMaker engine API.

The Browser route calls a product-qualified provider directly from the Agent
Worker. A compatible custom endpoint must declare its protocol, HTTPS base URL,
and model rather than relying on endpoint guessing, and must pass CORS,
streaming, cancellation, and error tests in Chromium and WebKit. Pi's complete
Desktop provider list is not automatically the Browser list. Public HTTP and a
general Cloudflare proxy are outside the baseline; a user-deployed relay is a
later explicit fallback for otherwise compatible endpoints without browser
CORS support. CSP and CORS are orthogonal: SillyOS may permit an HTTPS origin in
`connect-src`, but only that Provider can return a response readable by the
deployed origin. Neither `no-cors`, a Service Worker, nor a broader CSP repairs
a failed CORS contract. B1a therefore retains the already-qualified OpenAI
origin; B1b adds only the five exact official origins under test. Arbitrary
custom origins require B1c's selected-origin Worker response policy rather than
global document `connect-src https:`.

### First persistent Browser Program checkpoint

P3c-B0 promotes only the mutable Browser working checkpoint. One product-owned
Workspace Host Worker is the sole OPFS byte owner; the Agent Worker reaches its
filesystem through typed environment RPC, never through React state. A first
open creates one opaque `volumeId`, while each reopen still creates a fresh
execution-only `workspaceSessionId`. The durable volume generation starts at
`1` and continues monotonically across cold reopen instead of resetting with
the Agent Worker. A Host-only OPFS head records exact
`(volumeId, workspaceFormat, checkpointId, generation)` currentness; the opaque
`checkpointId` changes only with bytes and identifies the mutable head, not an
immutable Program snapshot.

The Workspace Host's Dedicated Worker is not sufficient mutual exclusion
across tabs. Each open session holds one origin-wide exclusive lease for its
`volumeId` through Web Locks or a Chromium/WebKit-proved equivalent. A second
tab receives bounded busy state. Close or Agent Forget drains and flushes,
releases OPFS handles and then the lease; Forget deletes only transient Pi/
execution state, never the durable volume or continuation manifest.

The first open has a separate short-lived bootstrap lease keyed by the durable
Program/workspace identity, because two tabs do not yet share a `volumeId`.
Inside that lease the product reloads the continuation manifest, creates a
candidate volume only when it is still absent, and resolves the repository's
exact insert-if-absent operation before exposing a workspace. A conflict or
unknown response reloads the winning manifest, closes and removes its unattached
orphan candidate when ownership is known, and then opens only the winner's
volume. Pi never starts before the winning manifest is known and its volume
lease has been acquired.

The Program repository owns one small exact continuation manifest per Program:
`programId`, `workspaceId`, opaque `volumeId`, workspace format revision, and
the exact anchored Program and repository revisions. It contains no workspace
generation, file list or bytes, Creator Chat, model/provider record, credential,
Pi transcript, or Pi private session/run identity. The OPFS volume head—not
IndexedDB—owns continuous generation. Tool writes therefore update and flush
only OPFS; they do not create a Program-repository transaction for every
mutation. The manifest is not an accepted Program snapshot, immutable
publication receipt, or mutation history. P3a's tool receipts remain bounded
and session-local.

Continuation is the composition of existing authorities rather than new
duplicated content. The manifest selects one exact P2 Program/repository
projection: the Program intent and accumulated requirements provide the goal,
the current proposal supplies phase and open review work, and existing exact
decisions, Activity, and terminal receipts provide bounded decision meaning.
The Workspace Host separately opens the current durable volume head. The
manifest never copies the Creator message list, and a fresh Pi session never
receives a replayed Chat or a serialized Pi session as synthetic context.
Later P2 mutations advance the manifest's Program/repository anchors in the same
IndexedDB transaction; workspace mutations do not touch those anchors.

The Host reads and writes OPFS files by range or stream and keeps only bounded
active-operation buffers. It never loads or copies the complete volume through
the page, Agent Worker, structured clone, or one unconditional `ArrayBuffer`.
The page receives no volume bytes, and no product component needs the complete
volume resident in memory. P3a-B0's `2 MiB` ceiling remains solely the retired
disposable in-memory control's guardrail; it is not the persistent Program
capacity.

Checkpoint 2's automated Chromium and persistent-WebKit gate retains and cold-
reopens exactly 1,000 `5 KiB` files plus one `16 MiB` file: `1,001` files and
`21,897,216` bytes at generation `1002`. `100 MiB`, `256 MiB`, and larger runs
remain optional raw characterizations when that origin has room, not mandatory
gates or universal support promises. `navigator.storage.estimate()` reports an
origin-wide advisory reading; it does not establish one uniform fixed quota for
all browsers, devices, profiles, or origins. An explicit
`navigator.storage.persist()` request is best effort. A `false` result is shown
truthfully but does not fail or disable the workspace.

The implemented bounds are `1 MiB` per I/O chunk and `4 MiB` of aggregate
**SillyOS-managed filesystem payload bytes** in flight, independent of volume
size. This instrumentation neither measures nor caps total page, Worker,
WebCrypto, or browser heap. The current Pi read wire rejects a selected file
over `256 KiB` from Host metadata before allocating, reading, or cloning its
contents; that per-call native Pi tool bound is not an OPFS file or volume
capacity limit.

Cold reopen combines the exact anchored P2 projection with the current durable
OPFS head and its generation under a new execution lease. Missing or corrupt
manifests or volumes, interrupted writes, quota exhaustion, private browsing, rejected
`persist()`, user-cleared site data, and a changed deployment origin are
explicit recovery states; none silently creates an empty replacement for a
known Program. OPFS, IndexedDB, and Cache API share origin quota and eviction
fate, so local persistence is not presented as backup.

Checkpoint 3 portable ZIP export delivered and closed P3c-B0 on 2026-08-27. Its
exact contract starts one independently cancellable Host job only for the open,
run-quiescent workspace and one exact durable `(checkpointId, generation)`.
The product-lockfile-pinned writer is `client-zip` 2.5.0 in writer-only,
STORE-only streaming mode: sorted VFS files are read in at most `1 MiB` chunks
and written with backpressure to a quota-checked Host-only OPFS temporary. The
source stream uses high-water mark 0, and source plus destination reservations
share the existing abort-aware `4 MiB` filesystem I/O budget. Export admits at
most `16,384` files, `16 MiB` of encoded
path/central-directory metadata, `16,384` visited directories, `4,096` children
per directory, the existing `32`-part / `512` UTF-8-byte normalized-path bound,
and a safe-integer predicted archive length; empty directories are not portable
V1 entries. Those are bounded writer-resource rules, not workspace capacity
claims.

The canonical archive contains exact UTF-8 `sillyos-workspace.json` first and
then only normalized `workspace/<relative-path>` files in code-unit order, all
with a fixed timestamp and file mode. The manifest records export/workspace
format 1, Program/workspace identities, exact Program/repository revisions,
and the durable checkpoint identity/generation. Its compact UTF-8 JSON plus LF
has a `1 KiB` encoded ceiling. It omits `volumeId`, Creator
Chat, the Program database, credentials, provider data, Pi/provider sessions,
terminal Agent-run receipts, mutation receipts, Host metadata, and export
temporaries. The Program authority rechecks its continuation before download;
drift, reload failure, or download-trigger failure cancels the job and
suppresses download. Only an exact recheck followed by a triggered native
download can commit release.

The Host Worker creates the completed OPFS `File`'s object URL and sends only
that URL, ordered progress, and small metadata over an export-specific port.
Every internal progress value is validated, while outward progress is merged at
initial totals, each `1 MiB` or `64` files, and exact ready/terminal state. A
ready job has a default `30`-second watchdog. After a successful
`<a download>` click, the page calls `commitRelease()`, enters non-cancellable
`finalizing`, and preserves the Host URL plus OPFS backing for the
Chromium-evidenced `1,000 ms` browser handoff before returning `release`. The
Host then revokes the URL, deletes the temporary, and only afterward emits
terminal `released`; cancel/failure/close perform the same cleanup before
release is committed, and the next volume open removes crash debris. The UI's
“Download started” reports only browser-pipeline handoff, not a completed user
save. React receives no VFS chunks, file-tree clone, whole-archive `Blob`, or
`ArrayBuffer`.

Real Chromium and persistent-profile WebKit both cancel before download and
then download, independently unpack, and byte-check the canonical archive for
the exact `1,001`-file, `21,897,216`-byte workspace corpus. The durable head is
unchanged and exclusion checks find no Chat, Program database, credential,
provider/Pi session, receipt, or Host metadata. This still adds no import reader,
restore semantics, immutable snapshot, Pi shell/wire change, Wasm, Git,
provider selection, or engine API.

This checkpoint does not publish immutable reviewed snapshots or connect
workspace bytes to P2 accept/reject. It adds no `edit`, `bash`, shell, Wasm,
Git, provider selector, BYO Sandbox, Pi extension discovery, Desktop storage,
or SillyMaker engine API. The smaller Browser persistence path has passed
cold-reopen, quota/recovery, streaming-scale, and export evidence; those broader
boundaries nevertheless remain inactive and require separate activation.

## First immutable snapshot candidate

P3c-B1 starts by making one exact quiescent mutable head retainable without
changing Accept. The Browser Workspace Host streams that head through the
existing canonical, STORE-only writer into a Host-owned OPFS snapshot package.
The package contains the bounded workspace manifest and VFS bytes. Before
archive I/O, one compact prepare marker at the volume control root reserves the
only unpublished candidate and records its exact review/head envelope. A
separate compact commit marker inside `snapshots/<snapshotId>/`, written only
after the archive closes and its exact length is re-read, records an opaque
product-attempt `snapshotId`, the proposal, Program revision,
`baseRepositoryRevision`, volume/workspace
identity, exact checkpoint/generation, file count, and archive length. A valid
marker plus the exact retained archive is the only reopenable state. No public
API can mutate snapshot bytes.

Both markers are exact-key UTF-8 JSON bounded to `2 KiB` with revision 1. The
prepare marker contains `snapshotId`, `programId`, `workspaceId`, `volumeId`,
`workspaceFormat`, `proposalId`, `programRevision`,
`baseRepositoryRevision`, `checkpointId`, and `generation`. The commit marker
is the exact receipt and adds `fileCount` and `archiveBytes`; only it is a
candidate commit point. A volume retains at most one complete unpublished
candidate. The same identity and envelope is idempotent; another identity or
envelope is rejected until explicit discard.

Checkpoint 1 exposes only product-private prepare, exact query, and explicit
discard operations under the current origin-wide volume lease. Prepare is
rejected while an Agent run, tool, or portable
export is active or when the requested durable head is stale. It preserves the
existing `1 MiB` source-chunk and `4 MiB` aggregate filesystem-I/O bounds; VFS
bytes never cross React, the page, or IndexedDB. It snapshots the exact portable
V1 VFS set, including workspace-local scratch present at that head, while Host
control/export/snapshot temporaries remain outside the VFS. Cold reopen admits the exact
marker and archive, removes incomplete artifact debris, and never treats a
complete unreferenced prepare as accepted.

The Program repository still owns no snapshot reference in checkpoint 1.
Checkpoint 2 first completes the Host lifecycle that publication needs: the
sole unpublished candidate is discoverable without already knowing its ID; an
exact retained package remains queryable after publication; and an idempotent
adopt verifies the commit and archive before removing only the unpublished
pointer. Prepare refuses to overwrite a retained identity. Discard deletes only
an exact pointer-owned unpublished package and never deletes retained bytes.
Bootstrap candidate creation returns the exact initial durable head alongside
its anchor. A separate Host-linearized review-head capture rejects an active
run, export, or publication and supplies the authoritative head for a later
proposal-producing Repository mutation; an ordinary page projection is not a
review receipt.

Prepare-to-adopt/discard is one transient Host publication critical section. A
newly materialized prepare acquires it, and an exact retry in that same already-
fenced session retains it. A reopened existing candidate does not acquire it.
While fenced, the session rejects a new Agent run, export, or different
publication until the exact attempt settles or the session closes.
Session close abandons only this in-memory fence; it does not adopt or discard
the durable candidate. Checkpoint-1 same-envelope prepare intentionally remains
readable after mutable-head drift, so it cannot reacquire a publication fence
after reopen. Recovery instead exact-verifies the unpublished receipt, re-reads
and matches the live head, and only then resumes the fence before any Repository
CAS. It prevents an unseen tool write between the
last head check and decision commit without turning an immutable candidate into
a permanent lock on the mutable Workspace. Adopt returns only `adopted` or
`already_retained` after complete receipt and archive-length verification;
discard returns `discarded`, `absent`, or `retained` and never silently removes
retained bytes.

Repository V3 owns one proposal-scoped `reviewBinding` separate from the
Creator session snapshot. It names the exact pending proposal and Program, the
base accepted Program revision, current Repository revision, workspace/volume/
format, and the durable checkpoint/generation observed when that proposal
became current. Initial Program creation stores its fresh volume anchor/head,
aggregate, continuation, and review binding in one two-store Repository
transaction. A proposal-producing follow-up or completed Agent terminal first
captures a run-quiescent Host head and stores that head with the successor in
the same transaction. A terminal that produces no successor retains the prior
reviewed head; if tools changed the mutable volume, Accept therefore becomes
stale instead of relabelling those bytes as reviewed.

The binding is one flat exact record with `proposalId`, `programId`,
`programRevision`, `baseAcceptedProgramRevision`, `repositoryRevision`,
`workspaceId`, `volumeId`, `workspaceFormat`, `checkpointId`, and `generation`;
only `baseAcceptedProgramRevision` may be null. Aggregate V3 keeps the
`reviewBinding` property present: pending means non-null and a decided proposal
means null. An accepted decision alone has a `snapshot` property containing the
complete target-neutral `ProgramWorkspaceSnapshotReceiptV1`; a rejected
decision omits that property entirely.

The review state machine is exact. A pending proposal has one review binding;
an accepted or rejected proposal has none, because its decision is then the
historical evidence. The first binding has
`baseAcceptedProgramRevision: null`; later bindings name the latest accepted
decision's Program revision, and Reject does not change that base. A terminal
that creates no successor retains the same reviewed head while advancing its
Repository currentness. Each V3 aggregate has exactly one matching continuation
row, which remains the sole volume locator; create and every later mutation
advance both rows in one transaction. Missing, orphaned, or mismatched pairs
are invalid. The old detached continuation insertion operation is removed.

An accepted decision contains the complete target-neutral Host receipt; a
rejected decision has no snapshot field. Accepted CAS rechecks the proposal,
Program/repository revision, continuation, durable review binding, and complete
receipt. Unknown outcome is reconciled by loading and comparing that exact
decision plus receipt, never by comparing only the visible Creator snapshot.
Only durable exact acceptance permits adopt. Missing or corrupt bytes for that
reference are recovery-required, not permission to use the mutable head.

One application-owned Browser Program Workspace Authority owns Repository,
Host, and product-operation serialization. The Controller does not create a
second Repository. Pi is a borrower: Forget drains and detaches the Pi side but
cannot close or dispose the shared Host while proposal capture or publication
is active. Home/route close waits or returns busy through the same authority.
Application shutdown admits no new operation, drains Pi, settles publication,
closes the Host session, and disposes the shared authority/Repository last.

The existing Accept control has switched internally to this non-visual
composition in checkpoint 2 because the clean replacement schema has no
snapshot-less accepted shape. Checkpoint 3 adds identity/head/divergence presentation and real cross-
page/dual-browser evidence; it does not introduce a second Accept path. The UI
shows the latest accepted snapshot receipt and pending reviewed head separately
from the mutable head. A newer live execution generation removes the old
mutable checkpoint from the current position and marks the relevant anchors
changed; a non-open or failed execution projection makes currentness
unavailable. Historical accepted identity remains visible across later pending
or rejected revisions. This
ordered composition is the durable cross-store receipt, not a fabricated OPFS +
IndexedDB transaction. Import/restore, broader artifacts, Desktop parity, BYO
Sandbox, capability composition, OpenUI, and engine APIs remain outside B1. The
V3 Repository review boundary and shared-authority composition cut over as one
product change; no C2b-only database reset is deployable. C2c is likewise not
deployed or advertised separately before checkpoint 3 supplies the real Browser
product evidence.

## Information architecture

### Creator home

Home is a quiet starting surface, not a desktop or launcher. It contains the
Creator prompt, concise examples of supported intent, and recent Programs from
the Browser-local catalog. It must not display fake operating-system status,
battery, Wi-Fi, clocks, taskbars, or decorative windows.

Submitting a request creates or opens a Program work area. In the preview this
is a deterministic local transition; later the same user journey may be backed
by typed Agent RPC.

### Program work area

The work area has three stable regions:

1. a compact product bar containing Home, Program identity, and low-frequency
   Program actions;
2. a Creator conversation pane;
3. a focused Program pane containing View and, only when real, Source,
   Capabilities, and Activity facets.

The conversation is the Creator supervisor that explains and revises the
Program; it is not a component of the Program or its app. The Program pane is
the primary work product, not a decorative demo placed beside marketing copy.
A proposal requiring human review is visible in the supervisor conversation and
Activity.
The preview's accept/reject operates on the exact
`(proposalId, programRevision)` pair. Once a mutable workspace exists, the
review envelope additionally names the base accepted Program revision and exact
workspace generation used to render the preview/diff; a later tool write makes
that decision stale rather than publishing unseen bytes. In the preview, the
product session—not the fake content producer—owns the monotonic successor and
accumulated requirements.

## Visual system

The visual tone is light, calm, flat, and tool-like. It borrows the reference's
near-neutral surface hierarchy and compact density while using SillyMaker
identity:

- near-white canvas, slightly raised/tinted work surfaces, and neutral 1px
  hairlines;
- one blue primary accent and a restrained mint status accent; accent denotes
  intent, selection, focus, or status—not decoration;
- modest radii, no liquid glass, fake reflections, textured canvas, oversized
  shadows, or ornamental gradients behind working content;
- standard, legible React controls with coherent hover, pressed, disabled, and
  focus-visible states;
- the actual runtime system font stack. Visual checks wait for
  `document.fonts.ready`; they never assume that Cloudflare's reference fonts
  exist on the machine.

Cloudflare's screenshot is framed by outside whitespace, a rounded container,
and a presentation shadow. Those belong to the screenshot composition. The
actual SillyOS application fills its visual viewport.

## Responsive layout contract

### Desktop and tablet landscape (`width >= 768px`)

- Product bar: `56px` high.
- Program pane toolbar: `48px` high.
- Conversation pane: `420px` default, `280px` minimum.
- Program pane: `400px` minimum.
- The visible divider is `1px`; its pointer hit target extends `8px` on each
  side without changing layout.
- Resizing uses pointer capture so crossing an iframe or embedded surface does
  not lose the drag. The width is clamped again on window resize and may be
  remembered as a presentation preference.
- The active Program/output tab remains completely visible after selection and
  after pane resizing. Other tabs may truncate and the strip may scroll; tool
  buttons never shrink or leave the viewport.

At the breakpoint boundary, the layout must switch modes rather than allowing
either pane to become narrower than its contract.

### Phone and narrow window (`width <= 767px`)

- Product bar is `52px` high.
- A `56px` switcher exposes Chat, Preview, and Activity as full-width,
  single-pane views.
- The compact facet strip remains available in the visible workpiece and may
  scroll horizontally; a More menu is only introduced if real facet pressure
  later makes that simpler than the strip.
- The divider and output rail do not render and leave no tabbable descendants.
- Primary touch targets are at least `44px`; text inputs use at least `16px`
  text to avoid unwanted mobile zoom.
- The layout uses dynamic viewport height and safe-area insets. The composer
  and modal actions stay reachable without scrolling the entire application
  behind them; a direct `visualViewport` owner is added only if a reproduced
  keyboard defect cannot be expressed with those platform primitives.

### Scroll ownership

- The application viewport and workspace shell do not scroll.
- Conversation messages, Program content, Source, Capabilities, Activity, and
  tab strips own only the scroll axis they need.
- Every flex ancestor on a scroll path declares the needed `min-width: 0` or
  `min-height: 0`.
- The composer remains attached to the bottom of the visible conversation pane;
  long history scrolls behind its own boundary.
- A long Program name or tab label may use a documented single-line ellipsis
  with an accessible full name. Conversation, proposal, error, and action text
  wrap and must never be silently clipped.

## Text, alignment, and anti-clipping contract

The public website iteration exposed two failures this product must not repeat:
font descenders were clipped by a tight line box, and independently sized
inline items appeared on different baselines.

- Do not give variable user text a fixed height. Except for explicit one-line
  labels, a text ancestor must not use `overflow: hidden`.
- Body and control text have an explicit, font-appropriate line height. Display
  text reserves real ascender and descender space; a highlight or gradient
  layer cannot double as the text clipping mask.
- Controls in one bar use shared height tokens and `align-items: center`.
  Icon centers in the same bar may differ by at most one CSS pixel; do not tune
  individual controls with unexplained transforms or negative margins.
- Chinese, English, mixed-script text, long Program names, long model names,
  long capability names, and 200% text size are first-class cases.
- No key content or action may depend on hover to become discoverable. Hover
  affordances remain reachable through focus and touch alternatives.
- A layout is not accepted until it has been viewed with the actual shipped
  font. Placeholder-font screenshots do not count.

## Pointer and keyboard contract

- Tab order follows product bar, current pane navigation/actions, current pane
  content, then the Creator composer. Hidden panes contain no focusable nodes.
- Tabs expose an accessible selected state. Every interactive control has a
  visible focus indicator that is not clipped by an overflow ancestor.
- In the composer, `Enter` submits and `Shift+Enter` inserts a newline.
- During IME composition, Enter, Escape, arrows, and candidate-selection keys
  remain owned by the IME. Do not submit or dismiss from `isComposing` events
  (including the legacy key-code `229` signal).
- Editable names use Enter to commit and Escape to cancel.
- The desktop divider is an accessible vertical separator. Pointer drag and
  keyboard resize share the same clamp: Arrow adjusts by a small step,
  Shift+Arrow by a larger step, and Home/End select the minimum/maximum.
- Full-screen View moves focus into an accessible dialog/surface. Escape exits
  even when focus is in an embedded surface; exit restores the invoking
  element, or a stable fallback if that element no longer exists.
- Opening and closing a proposal, menu, dialog, mobile pane, or fullscreen View
  preserves a useful focus location rather than returning focus to `body`.

## Verification matrix

Behavior tests and real screenshots are complementary. Geometry tests catch
overflow and ownership errors; screenshots catch glyph clipping, SVG mistakes,
baseline drift, and one-pixel seams. Tests protect product behavior, not a full
DOM identity inventory.

| Viewport      | Required evidence                                               |
| ------------- | --------------------------------------------------------------- |
| `1600 x 1000` | Populated reference desktop workspace screenshot and behavior   |
| `1280 x 800`  | Long bilingual content, multiple tabs, proposal actions         |
| `768 x 700`   | Exact two-pane breakpoint boundary                              |
| `767 x 700`   | Exact single-pane breakpoint boundary                           |
| `390 x 844`   | Phone Chat and Preview screenshots plus pane switching          |
| `320 x 568`   | Narrow/short wrapping, menu, composer, and touch reachability   |
| `1024 x 520`  | Short visual viewport and keyboard-safe modal/composer behavior |

Each relevant case checks:

- `document.scrollWidth <= document.clientWidth`;
- product bar and pane toolbar heights;
- desktop pane minimums and the one-pixel seam;
- the composer and visible actions remain inside the visual viewport;
- visible text and focus indicators remain inside their clipping ancestors;
- pointer resizing, keyboard resizing, pane switching, IME-safe submission,
  fullscreen Escape, and focus restoration;
- long English, long Chinese, and mixed-script fixtures;
- reduced motion without removing state changes;
- Chromium and WebKit. The maintained Deno Desktop preview receives a real
  visual and interaction smoke before a release claim.

Golden screenshots use deterministic fake data, device scale factor 1, the
runtime font stack, completed font loading, reduced motion, and settled layout.
Only nondeterministic values such as a real timestamp may be masked. Header,
tabs, conversation, proposal, composer, pane boundaries, and long text must
remain visible to the diff. Updating a baseline requires viewing the result;
passing a pixel threshold alone is not design approval.

## Semantic coverage and honest status

This table is the completion denominator for the rewrite. A working preview is
evidence for the preview only.

| Area               | Accepted product role                                     | Current preview evidence                                                             | Remaining before product-ready                         |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Creator home       | Express intent and create/open a Program                  | Pi catalog Settings + exact OpenAI profile + P2 recent reopen                        | Attachments and broader qualified Provider set         |
| Creator supervisor | Chat supervises one Program without becoming Program data | Durable run receipts + fresh Pi session over a durable checkpoint                    | Program-anchored artifacts                             |
| Program workspace  | One focused mutable workspace produces reviewed snapshots | OPFS checkpoint + native tools + recovery/scale/export + immutable accepted snapshot | Import and admitted artifacts                          |
| Human review       | Accept/reject an exact proposed revision                  | Exact accepted snapshot/head + truthful divergence + winner-held stale rejection     | Rich diff and approval history                         |
| Activity           | Explain what happened and what needs review               | Durable run events + session-local last-mutation receipt                             | Complete tool/action history and approvals             |
| Capabilities       | Required Agent and UI abilities are understandable        | Proposal tool + native read/write/edit/bash + closed Browser Local profile           | Broader capability composition                         |
| Generated UI       | Agent-authored UI remains legible and controllable        | Not implemented                                                                      | OpenUI mapped to closed SillyMaker components          |
| Source             | Inspect and refine the Program where useful               | Presentation-only recipe preview                                                     | Persistent source/artifact views                       |
| Translation        | A usable translation Program                              | Intent classification only                                                           | Complete workflow, data, QA, export                    |
| Writing            | A usable writing Program                                  | Intent classification only                                                           | Complete workflow, data, revision tools                |
| Role-play          | A usable role-play Program                                | Intent classification only                                                           | Complete sessions, characters, VN behavior             |
| Browser            | Publishable local-first product with BYO Provider         | Pi-owned catalog + one exact qualified profile + exportable `20 MiB+` workspace      | B1b direct profiles, B1c custom HTTPS, product closure |
| Deno Desktop       | Same product with admitted Host integrations              | Responsive preview target                                                            | Companion acceptance, storage, packaging qualification |

Before SillyOS is called a complete reference product, this table must be
reconciled with implementation and tests, the current-low-end startup,
interaction, memory, and bundle budgets must be measured, and an independent
review must confirm the declared major journeys. A convincing fake conversation
or one generated Program is not evidence that the complete product exists.

## Explicit defers

The closed P3c-B0 slice in [PLAN.md](./PLAN.md) governs the delivered Browser
OPFS checkpoint and portable download plus the delivered P3a-B1 native Pi
`edit` and bounded Pi `bash`/just-bash checkpoints over that same volume. P3a
is closed. P3c-B1 checkpoints 1–3, including Repository V3/physical V4, the
shared Repository/Host Authority, accepted snapshot identity/head presentation,
and dual-browser product evidence, closed on 2026-08-28. Deployment is a release
operation from that committed baseline and completed that day. P1-B1a's clean
replacement and local dual-browser gate are delivered and closed; its committed
deployment and public-origin qualification remain release receipts rather than
another product contract. B1b/B1c, broader execution-provider research, and
import remain inactive. The plan also
governs later real Pi integration, product persistence, Pi-native workspace
tool binding, provider research, Pi capability composition,
OpenUI-to-SillyMaker mapping, and the first complete product families. Runtime
candidates and the common Browser/Deno
evidence corpus are recorded in
[WASM-WORKSPACE-RESEARCH.md](./WASM-WORKSPACE-RESEARCH.md). A later phase is not
current implementation merely because a plan names it. Provider OAuth/login,
persistent provider keys, an official arbitrary endpoint relay, arbitrary
generated code, share/collaboration, background schedules, unrestricted
network/package installation, a public SillyMaker Mod/Program SDK, Pi Package
marketplace/distribution, and a final Source editor remain explicitly deferred.
Their future need does not justify placeholders or framework code in the
Creator Preview.
