<!-- SPDX-License-Identifier: MIT -->

# SillyOS workspace harness and WASM research

Status: Browser-first research record, reordered 2026-08-29 after the security
cutover. All three P3c-B0 checkpoints are delivered and closed: the Workspace
Host Worker and OPFS own the native Pi `read`/`write` bytes,
recovery/contention/storage policy and the automated
Chromium/persistent-WebKit `20 MiB+` scale gate pass, and the exact head
downloads as a bounded canonical ZIP. The old P3a-B1 `edit` and just-bash
results remain same-origin historical evidence only. S1a has since made the
independent Sandbox origin the only ordinary byte authority. S1b-1 separately
re-qualified fixed Pi's native `edit` there, and S1b-2 then qualified fixed
Pi's native `bash` through the bounded just-bash facade for the deterministic
fixture only. Their exact generation-3 bytes and cold reopen pass in Chromium
and persistent-profile WebKit. Both checkpoints are closed locally. S1b-3 is
the current bounded overlay: deterministic and live Pi runs receive the same
four native tools plus one fixed structured `grep` AgentTool. A real Chromium
Anthropic receipt proves an exact `write` mutation and resulting Sandbox bytes,
not real-model `read`, `edit`, `bash`, or `grep`. P3c-B1 checkpoint 1 then
delivered the Host-owned immutable snapshot candidate and cold-reopen contract,
and checkpoint 2's C2a Host publication lifecycle has also delivered. C2b
Repository V3/physical V4 and C2c's shared Repository/Host Authority then closed
together as an independently reviewed internal cutover on 2026-08-28.
Checkpoint 3 then closed P3c-B1 with exact accepted snapshot presentation and
retained-package evidence in Chromium and persistent-profile WebKit. The
committed baseline was deployed and smoke-verified from the public Cloudflare
origin at `https://silly-os.jasl9187.workers.dev` on 2026-08-28. No
broader shell/process provider or BYO Sandbox is selected or implemented. The
owning product sequence is [PLAN.md](./PLAN.md).

## Current S1b-3 and runtime disposition

The structured `grep` capability applies the narrow Oh My Pi composition lesson
without copying its Browser-incompatible runtime. It is one fixed Pi
`AgentTool` with structured pattern/path/glob inputs and bounded path/line/text
results. It sends an explicit read-only `grep_workspace` request; the Sandbox
invokes only fixed `rg` with an argument array. Raw `rg` remains under Pi native
`bash` when pipelines are useful. The request caps pattern/path/glob at
`4 KiB` / `1 KiB` / `512` bytes, results at `100` matches / `50 KiB` /
`500` code points per line, and time at `5` seconds. Success preserves
generation and emits no mutation receipt. Workspace continuity is separately
proved at `1,001` files / `21,897,216` bytes, but the current per-candidate-file
grep implementation has not been remeasured on that corpus.

The disposable QuickJS Q0 falsification is complete in dev/test, not in the
product. It fixes `quickjs-emscripten-core@0.32.0` plus
`@jitl/quickjs-singlefile-browser-release-sync@0.32.0`, uses a fresh child
Worker/runtime and copied bounded text-file set, and returns only an exact
terminal diff. Pending Promise jobs fail closed because Q0 intentionally
supports synchronous scripts only. Chromium and WebKit prove failed import/fetch, absent ambient
Browser/Node globals, deadline, hard termination, OOM and fresh recovery. The
Wasm memory is injected with equal `initial`/`maximum` at `16 MiB`; QuickJS's
allocator is separately capped at `12 MiB`. This corrects the upstream default
variant's observed ability to grow its Wasm memory despite an allocator limit,
but it does not bound staged host objects, module JavaScript, structured clones,
Worker overhead or browser-process memory.

Only an explicit Q0 development mode adds Sandbox-origin
`wasm-unsafe-eval`; ordinary development, preview and control responses remain
strict, Sandbox `connect-src` remains `none`, and the production Sandbox build
still excludes QuickJS/Wasm. Q0 does not bind a Program volume, use OPFS, commit
a diff, emit a receipt or connect Pi. Q1 must prove those product contracts
and an outer wall-clock terminate watchdog before a synchronous fixed `qjs`
command can appear under Pi native `bash`.

Python is deferred. The Pyodide control is about `12.9 MiB` raw / `6.03 MiB`
gzip with `0.85–0.91 s` cold startup and a broader JavaScript bridge. The
private CPython files installed below just-bash are not its public Browser API;
enabling just-bash's Browser Python or JavaScript switches does not provide a
qualified runtime. QuickJS exists only as the disposable Q0 dev/test spike;
neither QuickJS nor Python is implemented or deployed as a Program capability.

The current harness performance receipt is raw local-development data, not a
release gate or budget. Three runs reuse warm HTTP/Vite server and dependency
caches, but each creates a fresh Browser profile, Program volume, Sandbox Host
Worker, and dedicated harness Worker. That harness Worker reuses the real Pi
tool binder and typed Workspace path; it is not the production Browser Pi Agent
Worker. The fixture is `100,096` bytes / `2,048` lines / `128` matches; warm
`true`, raw bash `rg`, and structured grep each use seven samples per run.

| Three-run observed range          |        Chromium |       WebKit |
| --------------------------------- | --------------: | -----------: |
| Host create + open                | `85.8–108.1 ms` | `129–276 ms` |
| harness Worker startup            |  `30.8–86.5 ms` |  `43–113 ms` |
| first `execute_shell` / `true`    | `89.8–130.0 ms` | `103–136 ms` |
| per-run warm `true` median        |        `0.8 ms` |     `2–6 ms` |
| per-run raw bash `rg` median      |    `5.4–5.9 ms` |    `9–26 ms` |
| per-run structured grep median    |    `7.6–7.9 ms` |   `11–13 ms` |
| cancel                            |  `28.8–31.2 ms` |   `29–36 ms` |
| recovery `true`                   |    `0.7–0.9 ms` |     `2–5 ms` |
| per-run maximum rAF delta         |    `9.0–9.3 ms` |   `21–22 ms` |
| per-run maximum 16-ms timer delay |    `1.1–6.5 ms` |    `6–10 ms` |
| observed Long Tasks               |             `0` |          `0` |

“First” above means only the first shell execution in a fresh Sandbox Host
Worker; it is not Browser, process, server, or dependency-cache cold start. A
separate repeated WebKit run observed roughly `1.31 s` Host create/open, so the
table is raw variance, not an upper bound. These runs observed no control-page
Long Task, but cannot prove that all devices or concurrent workspaces avoid
interference. `measureUserAgentSpecificMemory` was unavailable. Chromium exposed
only a non-standard bucketed control-page JS heap of `27.6–29.4 MB`, with each
run's before/after bucket unchanged; it excludes harness/Sandbox Workers, OPFS,
Wasm, and browser-process memory. WebKit exposed no memory value. Total and peak
harness memory remain unproved.

## Decision to make

SillyOS needs three orthogonal contracts:

1. Pi remains the Agent and model-visible tool authority. Fixed Pi 0.84.3
   already supplies the `read`, `write`, `edit`, and `bash` schemas, algorithms,
   updates, and results; SillyOS does not redefine them.
2. Pi's public `ExecutionEnv = FileSystem + Shell` is the tool-facing execution
   projection. A Program-scoped environment connects those tools to one
   workspace byte authority.
3. `WorkspaceRuntimePort` is the eventual product-private owner of provider
   selection, lifecycle, capabilities, volume generation, change journal,
   persistence, and terminal receipts. It may select Browser Local, Desktop
   native, or a later BYO Sandbox without becoming a second tool dispatcher.
   The delivered control implements only open/close, sequential call scope,
   generation preflight, disposable volume effects, and a terminal mutation
   receipt. P3c-B0 has added Browser OPFS continuity and the bounded portable
   export writer to that proven surface; neither changes the tool authority.

The product invariant is a familiar coding-tool environment and one volume
authority, not Wasm or Linux. Wasm is a strong candidate mechanism because it
can run portable code behind a bounded Host interface, especially in Browser,
but the winning implementation may combine TypeScript, Web Workers, individual
Wasm payloads, a native Desktop companion, or an admitted remote sandbox. It
need not put the shell, every tool, and the filesystem in one Wasm image or call
the result a container.

The Pi tool binding and product call scope can be implemented and tested without
claiming that the physical execution provider is already Linux or a container.
The runtime remains replaceable behind the same port until one target pair
passes the Chromium, WebKit, and Deno Desktop corpus.

```text
Browser target
  React UI <- admitted Agent events/actions -> Agent DedicatedWorker
     pi-agent-core/pi-ai -> qualified Pi native read/write/edit/bash
                         -> stable Program-scoped ExecutionEnv
                              -> typed environment RPC -> separate-origin Sandbox Host Worker
                                                           FileSystem -> Sandbox volume/OPFS
                                                           Shell.exec -> bounded just-bash facade

Deno Desktop target
  React UI <- admitted Agent events/actions -> private companion route
  fixed Pi companion -> proved tool-factory/SDK operation hooks
                     -> local WorkspaceRuntimePort provider
                     -> admitted native/runtime volume

BYO Sandbox target
  Agent owner -> admitted environment RPC -> remote filesystem/shell provider
```

P3a-B0 co-located its disposable volume with the Agent Worker. P3c-B0 later
moved the proved `read`/`write` byte authority into the legacy Workspace Host
Worker and OPFS. S1a has now clean-replaced that owner with the separate-origin
Sandbox Host and deleted the same-origin product path. S1b-1 reuses the
transferred filesystem primitives for native `edit`; S1b-2 proved that the
bounded just-bash facade can remain as one lazy build-known module in that Host
graph. Any non-cooperative custom, Python, QuickJS, or Wasm command requires a
separately terminable execution owner before a hard-stop claim.

SillyMaker owns only the React GUI and interaction behavior. Pi owns the Agent
loop, providers, session semantics, model-visible tool definitions/calls,
extensions, skills, and prompts. SillyOS owns the target environment adapters,
typed environment/volume channels, Browser Worker Host, workspace identity,
target-local volume lifecycle, accepted Program snapshots, and product database.
A Browser Agent Worker reaches OPFS through the owning Workspace Host Worker; a
remote or Deno companion cannot own an origin's OPFS directly. Pi tool effects
never pass through React state.

## Workspace and persistence model

The mutable workspace volume contains:

- admitted input and import files;
- source and content files;
- `.git` and local Git objects;
- generated files and export artifacts;
- file-resident Program data;
- `AGENTS.md`, skills, prompts, and other Program harness data.

Workspace-local temporary paths are governed by the same volume owner and
isolation boundary even when policy makes them disposable. Tools never fall
back to ambient Host temp directories. The selected snapshot contract must say
which scratch paths are excluded rather than silently persisting or publishing
them.

The product database contains the Program catalog, accepted revision metadata,
proposal/decision receipts, workspace identity, exact snapshot references,
bounded product-visible terminal-run receipts, and opaque Pi session references.
It does not duplicate working-tree bytes or provider credentials. Pi owns its
own auth and session stores. These facts land only with the phase that has their
first real consumer.

In Browser, these owners map deliberately onto platform stores:

- one Dedicated Workspace Host Worker is the only writer for a workspace's OPFS
  project bytes, artifacts, temporary paths, `AGENTS.md`, and skills;
- IndexedDB owns the Program catalog, schema version, workspace index, and the
  bounded commit/recovery journal, not copies of workspace file bytes;
- Cache API owns the application shell and immutable Wasm/tool assets.

IndexedDB, Cache API, and OPFS share one origin's quota and eviction fate.
`localStorage` is limited, synchronous string storage and is not a VFS.
`navigator.storage.estimate()` is an origin-wide advisory reading, not a
SillyOS-volume allowance or one uniform fixed browser quota. The product asks
for `persist()` only through an explicit action after the user creates important
work, catches `QuotaExceededError`, and treats private browsing and user-cleared
site data as explicit states. Persistence is best effort: `false` does not fail
or disable the workspace, and `true` neither increases quota nor turns local
bytes into a backup. P3c-B0 checkpoint 3 portable export is delivered;
import/restore and optional sync remain unimplemented independent decisions.

OPFS and IndexedDB do not provide one cross-API transaction. Publication uses
temporary files plus an atomic same-filesystem replacement where supported, a
commit marker/recovery journal, and idempotent reopen reconciliation. Large
files are read and written by range or stream. They do not pass through React,
whole-value structured clone, or an unconditional `arrayBuffer()` allocation.
Deployment uses one stable production HTTPS origin because preview and changed
origins receive separate storage. Cloudflare's static per-file limit constrains
downloadable runtime assets, not the size of user files already stored in OPFS.

Pi tools may mutate the draft volume and advance its monotonic workspace
generation. That is ordinary coding-Agent work, not publication. Human review
names the exact proposal, base accepted Program revision, and workspace
generation/snapshot. Only a successful product transaction makes that snapshot
the next accepted Program revision. Failed or stale publication retains the
previous accepted revision and the repairable draft.

Delivered immutable publication uses a durable receipt rather than pretending
IndexedDB/SQLite and the volume form one transaction. The volume owner closes
and verifies an immutable snapshot candidate, returns an opaque identity that
it guarantees can be reopened, and only then allows the product database to
publish that reference after rechecking the review envelope. That snapshot path
is not part of P3c-B0: the delivered path persists only the mutable head and
reconciles its small continuation manifest. The delivered P3c-B0 checkpoint 3
exports that head without publishing it as an immutable snapshot. P3c-B1 now
owns the separately retained Host package, Repository publication receipt, and
accepted/reviewed/mutable identity projection. Import/restore and user-facing
accepted-snapshot download remain separate inactive work.

One logical runtime may use TypeScript, multiple Web Workers, WebAssembly
modules, a native companion, or guest processes. The product contract is the
tool/volume semantics and lifecycle per open Program Workspace, not one literal
`WebAssembly.Instance` or one implementation substrate across targets.

## Storage-first P3c-B0 boundary

P3c-B0 deliberately selects Browser OPFS ownership without selecting a shell or
execution-provider denominator. The already-qualified native Pi `read`/`write`
path is sufficient to prove that useful Agent-produced Program bytes can become
a durable mutable checkpoint. One Workspace Host Worker owns each open
Program's OPFS handles and streams filesystem primitives over a typed
MessagePort; the page and Agent Worker never own or whole-value clone the tree.

The product repository stores only the exact bounded continuation manifest
defined in [PLAN.md](./PLAN.md): Program/workspace identity, opaque `volumeId`,
workspace format, and exact anchored Program/repository revisions. It is not a
chat log, Pi session repository, provider record, file index, generation
mirror, mutation journal, or accepted snapshot reference. Goal, phase,
decisions, and open review work remain in the exact existing P2 Program
projection selected by those anchors; the manifest neither duplicates Chat nor
replays it into Pi. A reopen combines that projection with the OPFS-owned
current volume head, creates a fresh execution lease and empty session-local
receipt queue, and continues the durable generation and bytes. The exact
Host-private `BrowserWorkspaceDurableHeadV1` in [PLAN.md](./PLAN.md) identifies
that mutable head by `(volumeId, workspaceFormat, checkpointId, generation)`;
“last acknowledged receipt” is not a recovery identity, and this head is not an
immutable published snapshot.

Creating the first volume and indexing its ownership is one bounded cross-store
operation. After that, OPFS alone owns continuous generation and every changed
tool operation: no per-mutation IndexedDB update is allowed. P2 Program changes
move the manifest's revision anchors only inside the same Program-repository
transaction, without reading or publishing OPFS bytes.

Before that manifest exists, contenders use a short-lived bootstrap lock keyed
by the durable Program/workspace identity rather than by an as-yet-unknown
`volumeId`. The winner resolves the repository CAS before the workspace or Pi is
made available. A conflict or unknown-response loser reloads the winner,
deletes only its unattached orphan candidate, and then competes for the winner's
ordinary volume lease.

The Worker owns OPFS handles, but a separate origin-wide lease owns write
exclusivity for the complete open volume session. P3c-B0 uses Web Locks or an
equivalent mechanism proved in both Chromium and WebKit; an in-memory mutex,
`BroadcastChannel`, or last-writer-wins policy is insufficient. Close and Agent
Forget reject new work, drain and flush the head, release handles, and then
release that lease. Forget removes transient Pi/execution state only; it never
deletes the durable volume or continuation manifest.

Checkpoint 2's automated Chromium and persistent-WebKit gate persists and cold-
reopens exactly 1,000 `5 KiB` files plus one `16 MiB` file: `1,001` files,
`21,897,216` bytes, and generation `1002`. `100 MiB`, `256 MiB`, and larger runs
are optional raw evidence points rather than mandatory supported capacities or
closure gates. Browser capacity remains a dynamic origin property; a successful
large local run does not promise the same quota on another device, profile, or
origin. The delivered P3a-B0 `2 MiB` ceiling belongs only to its retired
disposable in-memory control and is not carried into OPFS.

Range/stream access ensures the page receives no volume bytes and no owner needs
the complete volume resident in memory. The B0 implementation pins `1 MiB`
maximum chunks and `4 MiB` of aggregate **SillyOS-managed filesystem payload
bytes** in flight independent of total volume size. That instrumentation does
not measure or cap total page, Worker, WebCrypto, or browser heap. Before a Pi
`read`, the Host rejects any file above `256 KiB` from metadata with the exact
existing Pi `FileError` fixed in [PLAN.md](./PLAN.md), before reading or cloning
its bytes. This native Pi wire limit is not a file or volume capacity ceiling.

Checkpoint 3's delivered canonical revision-1 ZIP contains only VFS entries
plus a bounded non-Chat manifest for checkpoint
identity/generation and exact Program/repository anchors. It must exclude Chat,
the Program database, credentials, provider data, Pi/provider sessions,
terminal/mutation receipts, Host metadata, and export temporaries, and streams
through an OPFS temporary with backpressure rather than materializing the whole
volume or archive through the page. No import reader, accepted-snapshot
download, sync, or restore semantics are active in this portable-export path;
P3c-B1 separately owns accepted snapshot publication.

This storage-first slice therefore supplies direct evidence to later runtime
research: candidates must mount or coherently reach the same volume rather than
forcing persistence to wait for a Linux-like environment. It activates no
just-bash, Wasm command, Git, provider/BYO Sandbox route, Desktop adapter,
sandbox claim, or SillyMaker engine work.

## Pi-native tools and typed execution binding

The exact Pi 0.84.3 release exports `createReadTool`, `createWriteTool`,
`createEditTool`, and `createBashTool` from `pi-agent-core`, together with the
host-abstract `ExecutionEnv` they consume. The factories already own the
model-visible schemas, argument normalization, edit behavior, output
truncation, progress shape, and native Pi results. See the fixed
[tool exports](https://github.com/earendil-works/pi/blob/4e58f324fae8ebfa98a3d45181fb248072a2afac/packages/agent/src/harness/tools/index.ts),
[environment contract](https://github.com/earendil-works/pi/blob/4e58f324fae8ebfa98a3d45181fb248072a2afac/packages/agent/src/harness/types.ts),
and [coding-agent binding precedent](https://github.com/earendil-works/pi/blob/4e58f324fae8ebfa98a3d45181fb248072a2afac/packages/coding-agent/src/server/create-harness.ts).

This is a SillyOS-qualified Browser path, not a blanket upstream Browser
guarantee: the package metadata still declares Node, while the Node environment
implementation is isolated under the separate `pi-agent-core/node` export. The
audit's temporary exact-root-entry bundle succeeded with esbuild
`platform=browser` and no Node built-ins; every selected tool/provider
combination still requires the real SillyOS Worker build plus current Chromium
and WebKit evidence.

Browser therefore keeps the mature Pi `Agent` and uses one tiny product-private
binder: it preserves every harness-tool field and binds the fifth execution
argument to a stable `{ env }` context. Pi 0.84.3's broader `AgentHarness` is not
selected because its prompt, resume, compaction, navigation, cancellation, and
wait operations still report `HarnessNotImplemented`; SillyOS does not complete
or fork that Agent framework. The delivered `read`/`write`/`edit` tools execute
sequentially; later `bash` must preserve that outer ordering until its own
multi-effect and cancellation evidence says otherwise.
Pi's file-mutation queue is keyed by `ExecutionEnv` identity and path, so an open
Program Workspace reuses one environment instance rather than constructing a
new wrapper for every call.

The wrapper receives Pi's ordinary `toolCallId`, params, `AbortSignal`, and
update callback. It first enters one product-owned call scope, then invokes the
native harness tool as `tool.execute(toolCallId, params, signal, onUpdate,
{ env })`, and closes the scope only after environment effects quiesce and its
terminal receipt settles. Pi does not forward `toolCallId` into `FileSystem` or
`Shell` methods, so the stable environment owner resolves the current scope
internally while those primitives run. The first implementation permits only
one scope at a time and rejects nesting or parallel calls; this makes generation
preflight and receipts implementable without replacing the stable environment
object or changing Pi's tool contract.

The current Pi `read` implementation still calls `readBinaryFile()` for the
complete file before applying offset or output truncation. The first control
volume therefore admits a bounded file size. A later real large-file failure is
a neutral Pi-tool requirement to reproduce and hand upstream, not a reason to
invent a SillyOS read schema or a SillyMaker engine API.

The boundaries are deliberately nested:

```text
Pi Agent/tool lifecycle
  -> Pi read/write/edit/bash schema and algorithm
  -> stable Program-scoped Pi ExecutionEnv
       FileSystem -> PiFileSystemAdapter -> WorkspaceVolumePort
       Shell.exec -> JustBashShellAdapter -> just-bash
                                      \-> JustBashFileSystemAdapter
                                           -> same WorkspaceVolumePort

WorkspaceRuntimePort (outside the Pi result)
  -> provider/session lifecycle, workspace lease, expected generation
  -> change journal, persistence/snapshot, capability truth, terminal receipt
```

Pi's `FileSystem` and just-bash's `IFileSystem` have incompatible error/return
contracts, so one class must not pretend to implement both. They are two thin
adapters over one product-owned volume. Pi `read`, `write`, and `edit` call the
Pi filesystem adapter directly; converting them into quoted shell commands
would discard typed semantics and native results. Pi `bash` alone calls
`ExecutionEnv.exec`, which Browser Local maps to just-bash. just-bash commands
receive its separate filesystem projection onto the same bytes, including
workspace-owned temporary paths. There is no second MEMFS to synchronize.

Cross-Worker and remote transport carries environment primitives such as
filesystem operations or one coherent shell execution, not a generic
`{ toolName, arguments }` envelope. The product's outer call scope binds
`workspaceId`, expected generation, admitted `(sessionId, runId, toolCallId)`,
bounded cwd/env, the execution lease, cancellation, and the final change
receipt. Duplicate, stale, cross-workspace, and post-lease operations fail
before effects. Native Pi tool content still flows to Pi and the model; the
product receipt separately records the real final generation and bounded change
summary. A possibly mutating receipt is reconciled even after its Agent run
becomes stale, because discarding it would hide real file effects. React
receives only admitted progress/result/receipt projections.

Browser Local cannot initially claim descendant termination: just-bash offers
cooperative `AbortSignal`, while its public `exec()` returns aggregate terminal
stdout/stderr rather than a live output callback. The adapter maps cancellation,
timeout, errors, cwd, and environment into Pi's typed `Result`, reports
terminal-only output truthfully, and runs any future non-cooperative custom or
Wasm command in a separately terminable Worker before strengthening the claim.
Desktop and BYO providers execute their own coherent shell requests rather than
placing just-bash in front of a native or remote process host.

Workspace `AGENTS.md`, skills, and prompts remain inert data throughout P3.
P3c-B0 persists their bytes before P3b characterizes broader execution
providers; neither interprets them or ties resource activation to an execution-
provider choice. P4 may qualify a current
public Pi resource route per target. Agent-core's current `AgentHarness` resource
surface is not usable evidence for Browser discovery. With ambient discovery
disabled, that later slice may prove controlled read-only materialization of one
exact workspace generation for Desktop or a supported public prompt/context
route. Neither creates a SillyOS skill loader. Executable Pi extensions remain
trusted, build-known dependencies outside the Agent-writable volume; loading
guest-authored extension code into Host Pi would escape the workspace boundary.

## Current just-bash S1b-2 feasibility

The repository already contains a useful bounded facade; S1b-2 is not a request
to design another shell. Exact `just-bash@3.4.2` exposes a Browser entry with
`Bash`, `InMemoryFs`, and `MountableFs`, accepts an explicit filesystem,
closed command list, execution limits, `AbortSignal`, optional custom commands,
and network configuration. Network is off when not configured. Its Python and
JavaScript runtimes are separately opt-in, so S1b-2 keeps both false.

`browser-workspace-just-bash-runtime.ts` already pins a small command set and
bounds filesystem support bytes, command text, reads, aggregate output, command
count, loop iterations, time, mutation attempts, and changed paths. It mounts
the persistent `/workspace` projection under an ephemeral support filesystem
and maps resulting byte changes back to the product volume. It does not own the
volume or redefine Pi's `bash` schema.

The Sandbox production build now emits that module as one build-known lazy
shell chunk, leaving filesystem-only startup in the small Host Worker. Its
exact five-file artifact checker rejects extra chunks/assets, Node externals,
nested Workers, executable WebAssembly, or emitted Python/QuickJS/CPython
runtimes. The install/lock graph still includes optional/vendor dependencies,
and the single just-bash Browser bundle still contains unregistered curl code.
Network denial therefore relies on the exact 25-command registry, no
`fetch`/network injection, and Sandbox `connect-src 'none'`, not on a claim
that unused code or dependencies are absent. Cooperative cancellation at shell
statement boundaries is also not descendant/process-tree termination; the
product reports only the behavior it observes.

The first shell proof is limited to Pi native `bash` using the existing closed
commands, exact cwd/env, network-off, timeout/abort, terminal aggregate and
overflow behavior, bounded multi-path mutation receipts, and cold reopen on the
same Sandbox volume. It does not add Python, QuickJS, Git, tar, package fetch,
PTYs, jobs, process trees, Linux, or a container claim.

## Python one-shot follow-on (researched, inactive)

Python should eventually appear as one build-known `python3` command under
Pi's native `bash`, not as a second SillyOS Agent tool. A private runtime request
would bind one exact Workspace generation, a `/workspace` script path, bounded
argv/stdin/cwd/environment, `inheritEnv: false`, one Host deadline, network off,
and bounded aggregate output. Its durable effects would still settle through
the existing `tool: "bash"` receipt. A fresh per-invocation Worker should stage
or journal changes and let the Host commit only an admitted current diff after
successful completion; termination must leave no late OPFS write.

The exact just-bash installation already contains private CPython 3.13.2
Emscripten artifacts: approximately `108,476` bytes of glue, `5,974,624` bytes
of Wasm, and a `4,303,799`-byte standard-library archive. They are not a public
just-bash Browser API. Its Browser entry reports Python unavailable, while the
Node implementation depends on Node Worker/SAB filesystem machinery. The
current Sandbox build correctly emits none of these assets. Presence in the
install/lock graph therefore supports only a disposable boot experiment, not a
shipping dependency or Browser capability claim.

The first falsification spike must remain outside Pi, UI, and production
protocols. It may try one fixed small script and bounded staged VFS in a fresh
Sandbox-origin Worker, then prove cwd/argv/stdin/env, UTF-8 and binary changes,
hard termination of an infinite loop, no late mutation, network/host-JS/OPFS
denial, exact asset bytes, and Chromium/WebKit startup. Stop if either engine
needs Node builtins, general fetch/CDN, ambient host JavaScript, an OPFS handle,
unbounded whole-volume copying, or cannot terminate without late effects. A
successful private-artifact boot would only justify comparing a reproducibly
owned fixed CPython build with an independently bounded Pyodide control.

## Why Emscripten is a payload choice, not the harness contract

Emscripten is a strong compiler and JavaScript-interoperability choice for
individual C/C++ programs. Its filesystem layer provides POSIX-like paths and
several backends: MEMFS is memory-only, IDBFS persists through IndexedDB and
requires synchronization, while WasmFS is the newer Wasm-resident
implementation. See the official
[Emscripten File System API](https://emscripten.org/docs/api_reference/Filesystem-API.html).

It does not supply a Linux kernel or a complete process substrate. Emscripten's
official pthreads documentation states that POSIX-style process creation such as
`fork()` is unsupported, and browser threads require `SharedArrayBuffer` plus
cross-origin isolation. See
[Pthreads support](https://emscripten.org/docs/porting/pthreads.html).
Consequently, compiling Bash and a collection of applets does not by itself
produce correct pipelines, job control, process trees, signals, PTYs, or Python
`subprocess` behavior.

Emscripten therefore remains in the experiment as:

- an Emscripten-focused Browser/JavaScript interoperability control for
  individually compiled tools;
- a possible modular toolbox if the product only needs bounded command
  equivalents rather than Linux process semantics;
- a possible compiler used by one selected runtime component, not the name of
  the whole workspace architecture or a product requirement.

Browser persistent storage is also a Host concern. The origin-private file
system offers private, quota-governed storage and synchronous access handles in
workers, but it is origin-scoped and is removed when site data is cleared. See
[MDN: Origin private file system](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system).
Quota, eviction, persistence requests, and user-cleared storage remain explicit
product cases; see
[MDN: Storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

## Candidate evidence, not a selection

| Candidate or pressure source    | Evidence relevant to this product                                                                                                                                | Unproved or mismatched boundary                                                                                                                                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Emscripten/WASI modular toolbox | Strong Browser-JS interop; compile individual search/archive/QuickJS controls; explicit host calls and filesystem adapters                                       | No general Linux `fork`/`exec`, process tree, PTY, or job control; Ripgrep still requires an actual port proof; shell orchestration would be product/runtime code                                                                           |
| just-bash                       | Apache-2.0 TypeScript virtual shell with bounded execution, `AbortSignal`, an asynchronous filesystem interface, and build-known custom commands                 | Exact 3.4.2 Browser publication still has a static `node:zlib` build edge; no persistent Browser backend or Git; Browser excludes Tar, Python, SQLite, YQ, Xan, and QuickJS; hard cancellation of custom commands requires a Worker/process |
| Oh My Pi                        | MIT Pi fork demonstrating a curated essential/discoverable Agent-tool registry, structured search/LSP/eval/subagent tools, and an in-process shell/CLI strategy  | Bun/Node/Rust/N-API coding product rather than Browser core; its schemas, Brush shell/utilities, internal URLs, extension loader, and Host-filesystem fallback are product-specific and are not a portable execution provider               |
| agent-sandbox                   | MIT Rust/Wasmtime control with a WASIp1 toolbox, host-directory volume, native Node binding, separate stdout/stderr and exit code, fuel and memory limits        | Native Wasmtime/N-API host, not a Browser runtime; custom partial Git/Ripgrep/Node and sequential shell rather than actual Linux tools/processes; no public abort and the current wall timeout cannot stop a running blocking task          |
| Wasmer JS + WASIX               | Public Browser SDK exposes WASIX processes, pipes, TTY, subprocess-oriented extensions, and mounted directories                                                  | WASIX is non-standard; Browser cross-origin isolation is required; the JS SDK is not current Deno-native evidence; persistent OPFS, cold reopen, costs, and cancellation need direct proof                                                  |
| BrowserPod                      | Existing Browser product closest to the desired model: Bash, Git, BusyBox tools, preview Python, worker-backed processes, Ext2-style disk, and local persistence | Version 3.0.1 is proprietary; ordinary plans require a metered API key and do not include self-hosting; Deno Desktop, redistribution/offline operation, Ripgrep/QuickJS, and process-tree cancellation require separate qualification       |
| CoWasm                          | Open-source Emscripten/WASI Unix and Python experiment with Dash, Tar, some core utilities, and CPython                                                          | Incomplete ports and no Deno qualification; process, persistent-volume, maintenance, and product-distribution costs require direct measurement                                                                                              |
| Full Linux/emulation control    | `container2wasm`, CheerpX/WebVM, and similar systems demonstrate that an actual Linux ABI and unmodified binaries can run in a browser                           | Image size, startup, CPU/memory, networking, licensing, and Deno integration may be incompatible with an everyday product                                                                                                                   |
| WebContainers control           | Mature Browser process/filesystem/terminal experience and useful UX behavior                                                                                     | Node-focused, cross-origin-isolation dependent, and currently limited to one booted container per page; not evidence for Linux, CPython, or the Deno target                                                                                 |

Primary sources:

- [Wasmer JS](https://github.com/wasmerio/wasmer-js) and its
  [filesystem guide](https://docs.wasmer.io/sdk/wasmer-js/how-to/use-filesystem/)
- [WASIX documentation](https://wasix.org/docs/)
- [just-bash 3.4.2](https://github.com/vercel-labs/just-bash/tree/just-bash%403.4.2),
  its [Browser entry](https://github.com/vercel-labs/just-bash/blob/just-bash%403.4.2/packages/just-bash/src/browser.ts),
  [command registry](https://github.com/vercel-labs/just-bash/blob/just-bash%403.4.2/packages/just-bash/src/commands/registry.ts),
  and the open [`node:zlib` Browser build issue](https://github.com/vercel-labs/just-bash/issues/81)
- [Oh My Pi](https://github.com/can1357/oh-my-pi/tree/d17c270090562d730e4d42d1aa3fdd93b45cf41a)
- [agent-sandbox](https://github.com/Parassharmaa/agent-sandbox)
- [BrowserPod architecture deep dive](https://labs.leaningtech.com/blog/browserpod-deep-dive)
  and [BrowserPod documentation](https://browserpod.io/docs/overview)
- [BrowserPod filesystem](https://browserpod.io/docs/understanding-browserpod/filesystem),
  [FAQ](https://browserpod.io/docs/more/FAQ),
  [licensing](https://browserpod.io/docs/more/licensing), and
  [BrowserCode](https://github.com/leaningtech/browsercode)
- [CoWasm](https://github.com/sagemathinc/cowasm)
- [`container2wasm`](https://github.com/container2wasm/container2wasm)
- [WebContainers quickstart](https://webcontainers.io/guides/quickstart) and
  [process API](https://webcontainers.io/guides/running-processes)
- [Deno WebAssembly/WASI support](https://docs.deno.com/runtime/reference/wasm/)

## BrowserPod disposition

BrowserPod is the first full-environment candidate to characterize, but it is
not a selected shipping dependency. Its current product shape matches the
experiment unusually well: execution and the persistent filesystem live in the
client, `storageKey` selects a resumable disk, and the documented environment
already includes Bash, Git, Node, core command-line tools, and preview Python.
That makes it a useful test of the desired workspace behavior in a Browser
Worker and, separately, in the Deno Desktop WebView.

The public repository does not make the runtime open source. The published
`browserpod` 3.0.1 npm package contains four small published files and a
proprietary `LICENSE.txt`; its loader dynamically imports the actual versioned
runtime from `rt.browserpod.io`. The public `browserpod-meta` repository is the
loader, types, metadata, documentation, and examples rather than buildable
source for the kernel, system images, and served runtime. BrowserCode is an
open-source application built on BrowserPod, not the BrowserPod runtime source.
Current commercial and deployment facts are:

- Personal permits non-commercial use and technical evaluation, requires
  attribution, and forbids resale or redistribution.
- Pro permits commercial use without attribution, but remains API-key and
  token metered. Self-hosting is not included in Personal or Pro.
- Self-hosting and custom deployment are Enterprise terms that require a
  separate agreement. The public material does not promise offline boot or a
  redistributable, vendor-independent runtime.
- `BrowserPod.boot()` requires an API key, deducts tokens, and fails without
  sufficient balance. The ordinary npm loader also fetches the runtime from the
  vendor CDN. Client-side execution therefore does not currently mean an
  embedded or vendor-independent activation path.
- Files and code are documented as remaining on-device for execution, but
  outbound Pod network requests are proxied through BrowserPod infrastructure.
  The first SillyOS corpus has no guest network, so this route is neither used
  nor presented as a local network sandbox.

Primary evidence: [licensing](https://browserpod.io/docs/more/licensing),
[pricing and deployment matrix](https://browserpod.io/pricing),
[`boot()`](https://browserpod.io/docs/reference/BrowserPod/boot), the
[`browserpod-meta` package](https://github.com/leaningtech/browserpod-meta), and
[BrowserCode](https://github.com/leaningtech/browsercode).

The bounded trial therefore has three gates:

1. **Evaluation gate.** Use an operator-supplied evaluation key outside source
   control. Do not commit BrowserPod runtime bytes, a key, a redistributable
   bundle, or a product dependency. Run the common corpus as a deletable
   characterization, beginning with boot, Bash/Git/local files, persistent
   cold reopen, and terminal behavior. This belongs to P3b research, not the P1
   Pi route or P3a's first dependable forwarded tool.
2. **Target gate.** Prove `SharedArrayBuffer`, `crossOriginIsolated`, Worker and
   storage behavior in current Chromium, WebKit, and the packaged Deno Desktop
   renderer. BrowserPod requires COOP/COEP response headers. The current
   SillyMaker static Desktop response has CORP but does not emit those two
   headers, and no BrowserPod/WebView proof exists. Its packaged shell also
   selects a fresh random loopback port on every launch, hence a new Web origin;
   BrowserPod's IndexedDB/OPFS-backed `storageKey` persistence is origin-scoped
   and cannot yet prove a workspace reopens across Desktop launches. A stable
   origin, a supported Host-volume bridge, or exact export/import would need
   direct evidence. If characterization reproduces either constraint as a
   general Host capability gap, record a neutral reproduction for the engine
   lane; do not modify the engine from SillyOS.
3. **Adoption gate.** Before selection, obtain terms that explicitly permit
   SillyOS to distribute and update the client runtime and clarify offline
   boot, asset hosting, activation/metering, outbound proxy removal, supported
   WebViews, permitted origin binding, production-key exposure/abuse ownership,
   and support lifetime. A technically successful Enterprise-only build remains
   a commercial/product decision, not an open-source runtime result.

The semantic gate remains the shared corpus, not the BrowserCode demo. In
particular, BrowserPod's public `run()` API resolves after command completion,
its public `Process` reference does not document PID, exit status, signal,
kill, or process-tree control, and its custom-terminal type exposes output but
no documented programmatic stdin channel. The direct filesystem API likewise
does not expose the complete list/stat/rename/delete/export surface; examples
shell out for some of those operations. Real Pi `AbortSignal` propagation,
separate bounded stdout/stderr, exit identity, descendant termination,
Ripgrep, Tar, Git, CPython, QuickJS, and exact cold-reopen bytes must all be
observed or recorded as unsupported. A Browser pass alone cannot promote Deno
Desktop.

## Modular-toolbox disposition

`just-bash` is the strongest current candidate for the **shell and composition
layer for Browser Local**, not a container or an Agent tool registry. Exact npm
package 3.4.2 is Apache-2.0 and resolves from tag commit
`a021f95f53f7e01df48dab71b46ffd4637fb4b53`; it is explicitly beta but provides
a Browser export, shell parser/interpreter, bounded execution, an `IFileSystem`
boundary, explicit command allowlists, custom commands,
stdin/stdout/stderr/exit results, and cooperative `AbortSignal`. Its
custom-command context already carries the filesystem, working directory,
environment, stdin, execution budget, and signal needed to adapt one build-known
external command, including an optional Wasm payload. See the
[package README](https://github.com/vercel-labs/just-bash/blob/just-bash%403.4.2/packages/just-bash/README.md),
[`IFileSystem`](https://github.com/vercel-labs/just-bash/blob/just-bash%403.4.2/packages/just-bash/src/fs/interface.ts),
and [custom-command contract](https://github.com/vercel-labs/just-bash/blob/just-bash%403.4.2/packages/just-bash/src/custom-commands.ts).

Its limitations are also useful because they keep the claim honest. It is a
virtual shell with JavaScript command implementations, not Linux and not a
process host. Its Browser command registry excludes Tar, Python, SQLite, YQ,
Xan, and QuickJS. More importantly, the exact published 3.4.2 Browser entry
still statically reaches `node:zlib`; a strict `platform=browser` bundle fails
before runtime. Checkpoint 2 therefore requires an explicit fail-closed product
shim or fixed package patch and must exclude gzip/gunzip/zcat plus compressed
`rg`, then prove the final graph. It has no Git command and no OPFS/IndexedDB
persistence adapter. Cancellation is
cooperative for the interpreter, and its public `exec()` has no streaming output
callback. The project explicitly warns that arbitrary host custom-command code
cannot be forcibly stopped and needs a terminable Worker or process when
external side effects require that guarantee. The source's Browser exclusion
list, rather than broad README wording, is the qualification authority. The
package's default resource profiles are not SillyOS product limits; checkpoint
2 must set smaller explicit command/source/output/time/filesystem bounds. Every
required command still runs the shared corpus and every mutating custom command
that executes untrusted or non-cooperative code runs in an owned Worker that
acknowledges termination.

The valid composition is one filesystem authority rather than two synchronized
trees:

```text
Pi createReadTool/createWriteTool/createEditTool
  -> Pi ExecutionEnv.FileSystem -> PiFileSystemAdapter
  -> typed volume operations -> Browser Local runtime -> WorkspaceVolumePort

Pi createBashTool
  -> Pi ExecutionEnv.Shell.exec -> JustBashShellAdapter
  -> coherent exec operation -> Workspace Host Worker -> just-bash 3.4.2
       MountableFs
         ephemeral InMemoryFs -> /bin /usr/bin /dev /proc /tmp
         persistent mount     -> /workspace -> JustBashFileSystemAdapter
                                             -> same WorkspaceVolumePort
  -> admitted built-in or build-known custom-command Worker
     (Wasm payload only when useful)
```

`WorkspaceVolumePort` remains the byte boundary. The delivered P3a-B1 checkpoint-2
Browser adapter backs it
with an indexed OPFS owner and exposes separate Pi and just-bash filesystem
projections. just-bash's otherwise asynchronous interface includes a synchronous
path inventory, so Browser Local co-locates just-bash and that bounded
generation-indexed view with the volume owner instead of adding a dedicated
just-bash Worker. This implementation constraint does not become the product
storage contract. A Wasm-backed command must reach the same volume through
admitted WASI host calls or a narrow command RPC; it must not receive a second
MEMFS and copy the whole workspace before and after each call. Args, cwd,
bounded env, exact stdin, terminal stdout/stderr, exit code, and `AbortSignal`
cross the command adapter. The command set is pinned SillyOS runtime code used by
Pi `bash`, not a user-facing just-bash plugin registry or another Agent extension
system.

Oh My Pi is a distinct Agent-product reference, not an execution-provider
candidate. At inspected MIT commit
`d17c270090562d730e4d42d1aa3fdd93b45cf41a` (18.0.7), its audit finds 29 fixed
built-in names, two settings-gated custom built-ins, and three hidden tools. It
keeps a small essential set model-visible, leaves many core utilities
inside its in-process shell, and promotes structured capabilities such as
`grep`, `glob`, LSP, eval, subagents, browser control, and memory to Agent tools.
That reinforces two SillyOS rules: a shell command remains under Pi `bash` when
shell composition is its value; a capability earns a separate Pi `AgentTool`
only when structured inputs/results, policy, lifecycle, or model ergonomics
justify it. SillyOS does not expose every command as a tool.

OMP itself is not reusable Browser infrastructure. Its coding-agent and Agent
core require Bun/Node APIs plus in-process Rust/N-API Brush shell and utility
packages, TUI and Host integrations; its `browser` tool is Puppeteer/CDP
automation, not evidence that the Agent runs inside a Web Browser. Its dynamic edit formats,
internal-URL filesystem, `xd://` transport, registry/extension behavior,
persistent process model, and Host-filesystem fallback are OMP product choices,
not stock Pi contracts. SillyOS keeps the fixed earendil-works Pi distribution
and treats OMP only as pressure evidence for later build-known Pi capabilities.
See OMP's [tool catalog](https://github.com/can1357/oh-my-pi/blob/d17c270090562d730e4d42d1aa3fdd93b45cf41a/README.md),
[built-in names](https://github.com/can1357/oh-my-pi/blob/d17c270090562d730e4d42d1aa3fdd93b45cf41a/packages/coding-agent/src/tools/builtin-names.ts),
[essential-tool policy](https://github.com/can1357/oh-my-pi/blob/d17c270090562d730e4d42d1aa3fdd93b45cf41a/packages/coding-agent/src/tools/essential-tools.ts),
and [runtime package](https://github.com/can1357/oh-my-pi/blob/d17c270090562d730e4d42d1aa3fdd93b45cf41a/packages/coding-agent/package.json).

`agent-sandbox` is a different control. At inspected commit
`3c121bee522a8cbcf52968039bd06cc2767eeb11`, Rust 0.4.0/npm 0.4.1 is MIT and
fully publishes its own source, but the shipping host is native Wasmtime with a
Node-API addon and same-architecture precompiled module. It mounts a native Host
directory at `/work`; it does not provide a Browser runtime. Deno supports
Node-API addons only with local `node_modules` and explicit `--allow-ffi`, so it
is plausible only as a trusted Deno Desktop companion experiment, not shared
Browser evidence. See [Deno Node/npm compatibility](https://docs.deno.com/runtime/fundamentals/node/).

The guest is a project-authored WASIp1 toolbox, not a Linux userspace. Its
`git` implements only a small `init/status/add/commit/log/diff`-like format, its
`node` is Boa without Node built-ins, and its shell documents sequential
temp-file pipes with no process spawning, signals, or job control. More
seriously for Pi forwarding, the public API has no `AbortSignal`; current
execution wraps a `spawn_blocking` Wasmtime call in an async timeout. Tokio
documents that a running `spawn_blocking` task cannot be aborted, so returning a
timeout cannot establish that later workspace mutations have stopped. See the
[runtime implementation](https://github.com/Parassharmaa/agent-sandbox/blob/3c121bee522a8cbcf52968039bd06cc2767eeb11/crates/agent-sandbox/src/runtime/mod.rs)
and [`spawn_blocking` contract](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html).
Until this is fixed or isolated behind a killable process, agent-sandbox may
measure Deno-native startup and command behavior but cannot back P3a's mutating
cancellation receipt.

After P3c-B0 has independently proved the shared OPFS volume, the preferred
execution experiment order is:

1. just-bash as the Browser-capable `ExecutionEnv.exec` control for P3a-B1;
2. one Worker-owned external command sharing the same volume, with a Wasm search
   or archive payload as the portability control rather than a requirement;
3. agent-sandbox as a separate Deno companion control, without transferring its
   partial CLI semantics to Browser;
4. BrowserPod and the other full-environment candidates for the stronger
   Linux-like denominator.

This keeps the modular-toolbox route viable even if no full environment passes,
while avoiding a speculative universal runtime framework.

CPython and QuickJS are separate payload decisions. Pyodide is a maintained
Emscripten CPython distribution with strong JavaScript interoperability, but it
does not support `fork`, `multiprocessing`, or `subprocess`; see the
[Pyodide FAQ](https://pyodide.org/en/stable/usage/faq.html). QuickJS is a small,
embeddable JavaScript engine and a plausible compiled payload; see the
[QuickJS project](https://bellard.org/quickjs/). Neither proves the surrounding
shell/process/container contract.

## Characterization corpus

Every serious candidate runs the same tests in current Chromium, WebKit, and the
maintained Deno Desktop renderer/companion topology. A vendor demo or a
successful `echo` is insufficient. Conflicting vendor statements about Safari
or other targets are a reason to test, not evidence to inherit.

The deletable fixture begins with the same logical tree for every candidate:

```text
/workspace/
  AGENTS.md
  .pi/skills/fixture/SKILL.md
  inputs/source.txt
  src/input.txt
  src/space name.txt
  scripts/write_artifact.py
  scripts/write_artifact.js
  artifacts/
  tmp/
```

### Filesystem and persistence

- create, read, overwrite, append, rename, and delete UTF-8 and binary files;
- preserve nested directories, executable intent where meaningful, mtimes, and
  filenames with spaces, CJK text, and shell metacharacters;
- characterize symbolic links and reject `..` or link-based escapes from the
  workspace root;
- atomically replace a file or report that the candidate cannot provide that
  guarantee;
- handle 1,000 small files and one 16 MiB file without corrupting or silently
  omitting entries;
- reopen after runtime teardown and full application reload without losing the
  acknowledged generation;
- keep admitted inputs, working files, generated artifacts, and workspace-local
  temporary paths under the same volume authority while applying the declared
  scratch cleanup/snapshot policy;
- isolate two workspaces with identical paths and reject cross-workspace handles;
- copy/export and restore a representative workspace without making Git or the
  product database a second byte owner;
- define quota-full, interrupted-flush, and corrupted-volume behavior.

### Shell and process behavior

- quoting, environment assignment, `cwd`, exit status, stdout, and stderr;
- pipelines and redirection, for example `printf ... | grep ... > result.txt`;
- cancellation of a long-running command and all of its descendants;
- two concurrent commands keep stdout, stderr, exit, and cancellation identity
  separate;
- stdin, interrupt, and terminal resize are either supported and tested or
  rejected with a stable typed reason;
- output truncation without deadlock and bounded progress updates;
- signal/PTY/job-control behavior stated honestly; unsupported behavior must
  fail with a stable typed reason rather than hang;
- no process or open-handle leakage after runtime disposal.

### Required CLI workload

- BusyBox/coreutils-quality `ls`, `cp`, `mv`, `mkdir`, `rm`, `find`, and text
  processing sufficient for Agent workflows;
- real `grep`, Ripgrep search, and Tar create/extract over a representative
  multilingual repository;
- local Git `init`, `status`, `diff`, `add`, `commit`, `log`, branch, and
  checkout without network;
- CPython and QuickJS startup, file IO, structured output, exception/exit
  propagation, and cancellation;
- a mixed script that creates an artifact, inspects it with `rg`, archives it,
  and leaves the exact bytes visible after cold reopen.

At minimum the executable corpus asserts stdout, stderr, exit status, output
bytes, and the final workspace generation for these commands or their explicitly
declared unsupported result:

```sh
grep -n alpha src/input.txt
rg -n alpha .
tar -cf artifacts/src.tar src
tar -tf artifacts/src.tar
printf 'alpha\nbeta\n' | grep beta > artifacts/pipe.txt
sh -c 'echo err >&2; exit 7'
```

Remote Git, package managers, DNS, sockets, and arbitrary HTTP are absent from
the initial corpus. Browser CORS and credentials make them a separate explicit
network-broker decision.

### Product budgets and distribution

- cold and warm runtime startup;
- first tool latency and repeated command latency;
- downloaded/installed bytes, persistent bytes, and peak memory for one and two
  logical workspaces;
- responsiveness while commands run in a worker;
- Browser headers such as COOP/COEP and their deployment consequences;
- Cloudflare's 25 MiB per-static-file limit and lazy/split runtime assets;
- `navigator.storage.persist()` and `estimate()` outcomes, quota exhaustion,
  and `QuotaExceededError` recovery on Browser targets;
- Deno permissions and packaging;
- source availability, license, commercial terms, update ownership, and offline
  distribution.
- runtime/tool chunks remain lazy and do not enter the Creator first-screen
  graph;
- one, two, and four workspaces have recorded Worker/process/memory cost and
  release resources after teardown.

No universal numeric budget is invented before measuring the Creator Preview on
the maintained low-end target. Raw measurements and observable failures are the
decision evidence.

## Executable trust boundary

Once a later P3a-B1/P3b or subsequent P3c slice executes Agent-generated shell
commands or scripts, guest code is
untrusted relative to companion credentials, the product database, Host APIs,
and every other workspace. The initial guest capability is its own volume,
bounded compute/memory/output, admitted time/cancellation, and no network.
Qualification must exercise path and symlink escape attempts, host-import
absence, cross-workspace handles, CPU/memory/output exhaustion, descendant
termination, and teardown. This is the boundary that may eventually justify a
sandbox claim; the mere use of WebAssembly does not.

## Research and implementation order

1. Treat delivered P1-B, P2-B1, P3c, S0, and S1a as prerequisites: one Browser
   Pi Agent Worker, typed product RPC, bounded durable whole-run receipt,
   independent-origin Sandbox/OPFS authority, exact native `write`/`read`, cold
   reopen, scale, cancellation, contention, and bounded ZIP evidence. Old P3a
   edit/bash results are characterization inputs, not current authority.
2. **S1b-1 native edit closed locally on 2026-08-29.** Fixed Pi 0.84.3's native
   `edit` reuses the same stable `ExecutionEnv`, transferred filesystem
   primitives, bounded UTF-8 read and exact mutation receipt. The deterministic
   Agent executes `write -> edit -> read -> proposal`; focused tests plus
   Chromium and persistent-profile WebKit prove generation 3, exact final
   bytes, secret absence, and cold reopen. Keep the `256 KiB` native Pi
   whole-file ceiling. S1b-3 later reuses this adapter for live runs.
3. **S1b-2 bounded shell closed locally on 2026-08-29.** Fixed Pi 0.84.3's
   native `bash` reaches the existing network-off 25-command facade only from
   the deterministic fixture. The lazy build graph, deadline/abort, terminal
   aggregate/overflow, multi-path mutation ceilings, receipt ordering, exact
   bytes and generation-3 cold reopen pass their focused and Chromium/WebKit
   gates. No Python, QuickJS, Git, tar, PTY, process-tree, Linux, or container
   claim enters this checkpoint.
4. **S1b-3 is the current bounded overlay.** `pi_provider` receives the same
   qualified native list plus fixed structured grep and a corrected prompt.
   Focused evidence owns exact tool names/schemas/currentness; the real Chromium
   Anthropic route additionally proves only `write` plus exact Sandbox bytes,
   not real-model use of the other tools.
5. **QuickJS Q0 closed as dev/test feasibility on 2026-08-29.** The fixed
   Browser dependency runs in a fresh terminable child Worker against only a
   copied bounded text-file set, with network off, a non-growing `16 MiB` Wasm
   memory, a `12 MiB` allocator, explicit source/file/diff/stdout/deadline
   limits, sync-only pending-job rejection, exact diff,
   OOM/deadline/hard-termination recovery and Chromium/
   WebKit evidence. It is not yet a Program capability. Q1 must bind staging
   and current-only commit to the existing Pi `bash` mutation path before
   synchronous `qjs` appears. Python follows only after that product boundary is proved;
   neither runtime is implied by just-bash package availability.
6. Only after those smaller profiles may the Wasm, agent-sandbox,
   Wasmer/WASIX, BrowserPod, CoWasm, full-Linux, or WebContainers corpus choose
   a broader command/process adapter. BYO Sandbox, import/restore, Desktop
   parity, and editor staging remain separate admitted capabilities.

This order does not start a public tool ABI, package manager, Linux distribution,
container orchestrator, untrusted-code sandbox, remote build service, or Pi
replacement. If no target pair passes the complete matrix, SillyOS retains the
Pi `ExecutionEnv` binding and ships a smaller admitted coding-tool environment
rather than claiming Linux or a container.
