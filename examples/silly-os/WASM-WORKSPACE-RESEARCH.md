<!-- SPDX-License-Identifier: MIT -->

# SillyOS workspace harness and WASM research

Status: Browser-first research gate, revised 2026-08-27. just-bash is selected
only as the bounded P3a-B1 Browser Local shell control; no persistent workspace
execution provider is selected or implemented. The owning product sequence is
[PLAN.md](./PLAN.md).

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
   The first control implements only open/close, sequential call scope,
   generation preflight, volume effects, and a terminal mutation receipt.

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
     pi-agent-core/pi-ai -> Pi native read/write/edit/bash
                         -> stable Program-scoped ExecutionEnv
                              -> typed environment RPC -> Workspace Host Worker
                                                           FileSystem -> volume/OPFS
                                                           Shell.exec -> just-bash -> same volume

Deno Desktop target
  React UI <- admitted Agent events/actions -> private companion route
  fixed Pi companion -> proved tool-factory/SDK operation hooks
                     -> local WorkspaceRuntimePort provider
                     -> admitted native/runtime volume

BYO Sandbox target
  Agent owner -> admitted environment RPC -> remote filesystem/shell provider
```

P3a may co-locate its disposable volume and just-bash in one Browser Local
runtime. P3c may move that unit into the Workspace Host Worker for OPFS. A
dedicated just-bash Worker is not required; only a later non-cooperative custom
or Wasm command needs a separately terminable Worker.

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
`localStorage` is limited, synchronous string storage and is not a VFS. The
product uses `navigator.storage.estimate()`, requests `persist()` only after the
user creates important work, catches `QuotaExceededError`, and treats private
browsing, user-cleared site data, and a rejected persistence request as explicit
states. Persistence does not increase quota or turn local bytes into a backup;
export/import or optional later sync is required for recovery.

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

Cross-store publication uses a durable receipt rather than pretending SQLite
and the volume form one transaction. The volume owner atomically creates and
flushes an immutable snapshot, returns an opaque identity that it guarantees can
be reopened, and only then may the product database publish that reference after
rechecking the review envelope. A database failure leaves an unreachable orphan
for bounded cleanup. A database success pointing to a missing snapshot is a
reported corruption/recovery case, never a silent fallback to different bytes.

One logical runtime may use TypeScript, multiple Web Workers, WebAssembly
modules, a native companion, or guest processes. The product contract is the
tool/volume semantics and lifecycle per open Program Workspace, not one literal
`WebAssembly.Instance` or one implementation substrate across targets.

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
or fork that Agent framework. The four tools initially execute sequentially.
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

Workspace `AGENTS.md`, skills, and prompts remain inert data throughout P3. P3b
characterizes and P3c persists their bytes but neither interprets them or ties
resource activation to an execution-provider choice. P4 may qualify a current
public Pi resource route per target. Agent-core's current `AgentHarness` resource
surface is not usable evidence for Browser discovery. With ambient discovery
disabled, that later slice may prove controlled read-only materialization of one
exact workspace generation for Desktop or a supported public prompt/context
route. Neither creates a SillyOS skill loader. Executable Pi extensions remain
trusted, build-known dependencies outside the Agent-writable volume; loading
guest-authored extension code into Host Pi would escape the workspace boundary.

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

| Candidate or pressure source    | Evidence relevant to this product                                                                                                                                | Unproved or mismatched boundary                                                                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Emscripten/WASI modular toolbox | Strong Browser-JS interop; compile individual search/archive/QuickJS controls; explicit host calls and filesystem adapters                                       | No general Linux `fork`/`exec`, process tree, PTY, or job control; Ripgrep still requires an actual port proof; shell orchestration would be product/runtime code                                                                     |
| just-bash                       | Apache-2.0 TypeScript shell with a Browser bundle, bounded execution, `AbortSignal`, an asynchronous filesystem interface, and build-known custom commands       | A simulated shell rather than Linux; no bundled persistent Browser backend or Git; Browser excludes Tar, Python, SQLite, YQ, Xan, and its optional QuickJS command; hard cancellation of custom commands requires a Worker/process    |
| Oh My Pi                        | MIT Pi fork demonstrating a curated essential/discoverable Agent-tool registry, structured search/LSP/eval/subagent tools, and an in-process shell/CLI strategy  | Bun/Node/Rust/N-API coding product rather than Browser core; its schemas, Brush shell/utilities, internal URLs, extension loader, and Host-filesystem fallback are product-specific and are not a portable execution provider         |
| agent-sandbox                   | MIT Rust/Wasmtime control with a WASIp1 toolbox, host-directory volume, native Node binding, separate stdout/stderr and exit code, fuel and memory limits        | Native Wasmtime/N-API host, not a Browser runtime; custom partial Git/Ripgrep/Node and sequential shell rather than actual Linux tools/processes; no public abort and the current wall timeout cannot stop a running blocking task    |
| Wasmer JS + WASIX               | Public Browser SDK exposes WASIX processes, pipes, TTY, subprocess-oriented extensions, and mounted directories                                                  | WASIX is non-standard; Browser cross-origin isolation is required; the JS SDK is not current Deno-native evidence; persistent OPFS, cold reopen, costs, and cancellation need direct proof                                            |
| BrowserPod                      | Existing Browser product closest to the desired model: Bash, Git, BusyBox tools, preview Python, worker-backed processes, Ext2-style disk, and local persistence | Version 3.0.1 is proprietary; ordinary plans require a metered API key and do not include self-hosting; Deno Desktop, redistribution/offline operation, Ripgrep/QuickJS, and process-tree cancellation require separate qualification |
| CoWasm                          | Open-source Emscripten/WASI Unix and Python experiment with Dash, Tar, some core utilities, and CPython                                                          | Incomplete ports and no Deno qualification; process, persistent-volume, maintenance, and product-distribution costs require direct measurement                                                                                        |
| Full Linux/emulation control    | `container2wasm`, CheerpX/WebVM, and similar systems demonstrate that an actual Linux ABI and unmodified binaries can run in a browser                           | Image size, startup, CPU/memory, networking, licensing, and Deno integration may be incompatible with an everyday product                                                                                                             |
| WebContainers control           | Mature Browser process/filesystem/terminal experience and useful UX behavior                                                                                     | Node-focused, cross-origin-isolation dependent, and currently limited to one booted container per page; not evidence for Linux, CPython, or the Deno target                                                                           |

Primary sources:

- [Wasmer JS](https://github.com/wasmerio/wasmer-js) and its
  [filesystem guide](https://docs.wasmer.io/sdk/wasmer-js/how-to/use-filesystem/)
- [WASIX documentation](https://wasix.org/docs/)
- [just-bash](https://github.com/vercel-labs/just-bash) and its
  [Browser exclusions](https://github.com/vercel-labs/just-bash/blob/de3c2f368ee1c11bab4d7250aaf43306e052a008/packages/just-bash/src/commands/browser-excluded.ts)
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
layer for Browser Local**, not a container or an Agent tool registry. At
inspected commit `de3c2f368ee1c11bab4d7250aaf43306e052a008`, package 3.4.2 is
explicitly beta but provides a Browser export, shell parser/interpreter, bounded
execution, an `IFileSystem` boundary, explicit command allowlists, custom
commands, stdin/stdout/stderr/exit results, and cooperative `AbortSignal`. Its
custom-command context already carries the filesystem, working directory,
environment, stdin, execution budget, and signal needed to adapt one build-known
external command, including an optional Wasm payload. See the
[package README](https://github.com/vercel-labs/just-bash/blob/de3c2f368ee1c11bab4d7250aaf43306e052a008/packages/just-bash/README.md),
[`IFileSystem`](https://github.com/vercel-labs/just-bash/blob/de3c2f368ee1c11bab4d7250aaf43306e052a008/packages/just-bash/src/fs/interface.ts),
and [custom-command contract](https://github.com/vercel-labs/just-bash/blob/de3c2f368ee1c11bab4d7250aaf43306e052a008/packages/just-bash/src/custom-commands.ts).

Its limitations are also useful because they keep the claim honest. It is a
virtual shell with JavaScript command implementations, not Linux and not a
process host. Its Browser build excludes Tar, Python, SQLite, YQ, and Xan; its
optional QuickJS command is also documented as unavailable in Browser. It has
no Git command and no OPFS/IndexedDB persistence adapter. Cancellation is
cooperative for the interpreter, and its public `exec()` has no streaming output
callback. The project explicitly warns that arbitrary host custom-command code
cannot be forcibly stopped and needs a terminable Worker or process when
external side effects require that guarantee. The source's Browser exclusion
list, rather than broad README wording, is the qualification authority. Every
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
  -> coherent exec operation -> Browser Local runtime -> just-bash
                                                   -> JustBashFileSystemAdapter
                                                   -> same WorkspaceVolumePort
  -> admitted built-in or build-known custom-command Worker
     (Wasm payload only when useful)
```

`WorkspaceVolumePort` remains the byte boundary. A Browser adapter may back it
with an indexed OPFS owner and expose separate Pi and just-bash filesystem
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
`d17c270090562d730e4d42d1aa3fdd93b45cf41a` (18.0.7), it exposes 31 built-in
tools, keeps a small essential set model-visible, leaves many core utilities
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

The resulting preferred experiment order is:

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

Once P3c executes Agent-generated shell commands or scripts, guest code is
untrusted relative to companion credentials, the product database, Host APIs,
and every other workspace. The initial guest capability is its own volume,
bounded compute/memory/output, admitted time/cancellation, and no network.
Qualification must exercise path and symlink escape attempts, host-import
absence, cross-workspace handles, CPU/memory/output exhaustion, descendant
termination, and teardown. This is the boundary that may eventually justify a
sandbox claim; the mere use of WebAssembly does not.

## Research and implementation order

1. Treat delivered P1-B as the Agent prerequisite: one Browser Pi Agent Worker,
   typed product RPC, memory-only provider key ownership, and one product
   proposal `AgentTool`. It proves the Agent path without pretending a VFS or
   shell exists.
2. Execute P2-B1: persist one product-owned terminal Agent-run receipt for
   completion, failure, cancellation, or replacement under the existing Program
   CAS. Prove idempotence, reopen, lost-response reconciliation, and credential
   absence without storing Pi history, deltas, or tool payloads.
3. Execute P3a-B0: bind Pi's shipped `write` and `read` to one stable
   Program-scoped `ExecutionEnv` over a deterministic disposable volume. Prove
   a real artifact round trip, native Pi schema/result behavior, generation
   preflight, cancellation, terminal receipt, and cleanup. Do not introduce a
   custom tool schema or persistence claim.
4. Execute P3a-B1: bind Pi `edit`, then map Pi `bash`'s `Shell.exec` to
   just-bash over the same volume. Prove edit, cwd/env, pipe/redirection,
   terminal output, timeout/abort mapping, and honest capability status. This
   closes the Browser default-tool control without Git, Wasm, Python, PTY,
   process-tree, or Linux claims.
5. In P3b, run one build-known Worker-owned Wasm search or archive command over
   the same volume, then run the full corpus against agent-sandbox on Deno,
   Wasmer/WASIX, BrowserPod,
   and CoWasm where licensing and target access allow. A Deno-specific adapter
   is allowed behind the same contract; SDK identity across targets is not a
   goal. Keep full-Linux emulation and WebContainers as measured controls rather
   than assumed dependencies.
6. In P3c, select only the smallest Browser Local/Desktop provider pair that
   passes the required semantics. Give the Browser Workspace Host Worker an OPFS
   volume and prove reload/cold-reopen byte identity, 1,000 small files, one
   16 MiB file, quota-full recovery, interrupted-write recovery, snapshot
   publication, and the complete Pi default-tool path. Qualify BYO Sandbox
   separately against the applicable conformance rather than making it a local
   shipping prerequisite.

This order does not start a public tool ABI, package manager, Linux distribution,
container orchestrator, untrusted-code sandbox, remote build service, or Pi
replacement. If no target pair passes the complete matrix, SillyOS retains the
Pi `ExecutionEnv` binding and ships a smaller admitted coding-tool environment
rather than claiming Linux or a container.
