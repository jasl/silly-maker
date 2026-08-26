<!-- SPDX-License-Identifier: MIT -->

# SillyOS workspace harness and WASM research

Status: Browser-first research gate, revised 2026-08-27. No runtime is selected
or implemented by this document. The owning product sequence is
[PLAN.md](./PLAN.md).

## Decision to make

SillyOS needs two separate contracts:

1. Pi remains the Agent and tool-call authority. A pinned Pi extension forwards
   selected Pi tools through one typed product-private port.
2. Each workspace Agent receives one logical `WorkspaceRuntime` with one
   persistent volume and a familiar Linux-tools harness: shell composition,
   repository/file inspection, archives, Git, and optional scripting runtimes.

The product invariant is the harness behavior and volume ownership, not Wasm.
Wasm is a strong candidate mechanism because it can run portable code behind a
bounded Host interface, especially in Browser, but the winning implementation
may combine TypeScript, Web Workers, individual Wasm payloads, or a native
Desktop companion. It need not put the shell, every tool, and the filesystem in
one Wasm image or call the result a container.

The first contract can be implemented and tested without claiming that the
second is already Linux or a container. The runtime remains replaceable behind
the same port until one target pair passes the Chromium, WebKit, and Deno
Desktop corpus.

```text
Browser target
  React UI <- admitted Agent events/actions -> Agent DedicatedWorker
     pi-agent-core/pi-ai -> direct typed tool channel -> Workspace Host Worker
                                                    -> selected harness
                                                    -> OPFS volume

Deno Desktop target
  React UI <- admitted Agent events/actions -> private companion route
  Pi companion -> local WorkspaceRuntimePort adapter
               -> selected runtime -> admitted native/runtime volume
```

SillyMaker owns only the React GUI and interaction behavior. Pi owns the Agent
loop, providers, session semantics, tool registration/calls, extensions, skills,
and prompts. SillyOS owns the two thin target adapters, typed tool channel,
Browser Worker Host, workspace identity, target-local volume lifecycle, accepted
Program snapshots, and product database. A Browser Agent Worker reaches OPFS
through the owning Workspace Host Worker; a remote or Deno companion cannot own
an origin's OPFS directly. Pi tool requests never pass through React state.

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
tool/volume semantics and lifecycle per workspace Agent, not one literal
`WebAssembly.Instance` or one implementation substrate across targets.

## Typed Pi tool forwarding

The shared SillyOS capability core defines the tool schema and handler once. For
the first proof, a thin Browser adapter registers one real workspace
`AgentTool`; the Desktop adapter later registers the same core through
`ExtensionAPI.registerTool()`. Once the runtime is selected, the adapters
preferentially use Pi's public filesystem/tool operation seams where they fit so
Pi retains its native schemas and result shapes. Each call into
`WorkspaceRuntimePort` contains:

- `workspaceId` and expected workspace generation;
- Pi `toolCallId`, tool name, admitted arguments, and working directory;
- a bounded environment projection rather than ambient host environment;
- Pi's cancellation signal and bounded progress callback.

The result contains typed completion/failure/cancellation, bounded structured
content or stdout/stderr, the resulting workspace generation, and a bounded
change summary. Cross-workspace, stale, and duplicate requests are rejected
before execution, and mutating calls are initially serialized per workspace.
Arbitrary shell commands are not transactional and are not promised rollback.
Cancellation terminates the command and all descendants before returning one
terminal receipt with the real final generation and change summary. Late
progress can be discarded; a possibly mutating terminal receipt cannot, because
doing so would hide real file effects. React never receives raw Pi tool events,
guest handles, filesystem handles, or runtime-specific errors.

Workspace `AGENTS.md`, skills, and prompts are data. Pi's current public resource
discovery accepts host filesystem paths, not arbitrary virtual-file contents.
With ambient discovery disabled, the research must prove either controlled,
read-only materialization of one exact workspace generation into Pi's isolated
resource path or projection through a supported public extension prompt/context
hook. Neither route creates a SillyOS skill loader. Executable Pi extensions
remain trusted, build-known companion dependencies outside the Agent-writable
volume. Loading a guest-authored extension into host Pi would escape the
workspace boundary and is not part of this lane.

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

| Candidate family                | Evidence relevant to this product                                                                                                                                | Unproved or mismatched boundary                                                                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Emscripten/WASI modular toolbox | Strong Browser-JS interop; compile individual search/archive/QuickJS controls; explicit host calls and filesystem adapters                                       | No general Linux `fork`/`exec`, process tree, PTY, or job control; Ripgrep still requires an actual port proof; shell orchestration would be product/runtime code                                                                     |
| just-bash                       | Apache-2.0 TypeScript shell with a Browser bundle, bounded execution, `AbortSignal`, an asynchronous filesystem interface, and build-known custom commands       | A simulated shell rather than Linux; no bundled persistent Browser backend or Git; Browser excludes Tar, Python, SQLite, YQ, Xan, and its optional QuickJS command; hard cancellation of custom commands requires a Worker/process    |
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
  [Browser exclusions](https://github.com/vercel-labs/just-bash/blob/main/packages/just-bash/src/commands/browser-excluded.ts)
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
layer outside Wasm**, not a container. At inspected commit
`63cd01319691db61d4f239335c58940257c1f864`, package 3.4.2 is explicitly beta
but provides a Browser export, shell parser/interpreter, bounded in-memory
filesystem, an asynchronous `IFileSystem` boundary, explicit command allowlist,
custom commands, stdin/stdout/stderr/exit results, and cooperative
`AbortSignal`. Its custom-command context already carries the filesystem,
working directory, environment, stdin, execution budget, and signal needed to
adapt one build-known external command, including an optional Wasm payload. See
the [package README](https://github.com/vercel-labs/just-bash/blob/63cd01319691db61d4f239335c58940257c1f864/packages/just-bash/README.md),
[`IFileSystem`](https://github.com/vercel-labs/just-bash/blob/63cd01319691db61d4f239335c58940257c1f864/packages/just-bash/src/fs/interface.ts),
and [custom-command contract](https://github.com/vercel-labs/just-bash/blob/63cd01319691db61d4f239335c58940257c1f864/packages/just-bash/src/custom-commands.ts).

Its limitations are also useful because they keep the claim honest. It is a
virtual shell with JavaScript command implementations, not Linux and not a
process host. Its Browser build excludes Tar, Python, SQLite, YQ, and Xan; its
optional QuickJS command is also documented as unavailable in Browser. It has
no Git command and no OPFS/IndexedDB persistence adapter. Cancellation is
cooperative for the interpreter. The project explicitly warns that arbitrary
host custom-command code cannot be forcibly stopped and needs a terminable
Worker or process when external side effects require that guarantee. Therefore
the first proof can use the Browser shell and filesystem shape, but every
required command still runs the shared corpus and every mutating custom command
that executes untrusted or non-cooperative code runs in an owned Worker that
acknowledges termination.

The valid composition is one filesystem authority rather than two synchronized
trees:

```text
Pi extension -> WorkspaceRuntimePort.exec
             -> just-bash shell + admitted built-ins
             -> build-known custom command in owned Worker
                (Wasm payload when useful)
             -> the same WorkspaceVolumePort
```

`WorkspaceVolumePort` remains the product boundary. A Browser adapter may back
it with an indexed OPFS owner and expose the required `IFileSystem` projection
to just-bash. A Wasm-backed command must reach that same volume through admitted
WASI host calls or a narrow tool RPC; it must not receive a second MEMFS and copy
the whole workspace before and after each call. A TypeScript command may operate
directly on the same filesystem projection. Args, cwd, bounded env, exact stdin,
separate stdout/stderr, exit code, and `AbortSignal` cross the custom-command
adapter in either case. The command set is pinned SillyOS runtime code selected
behind Pi's tools, not a user-facing just-bash plugin registry or another Agent
extension system.

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

1. just-bash as the Browser-capable shell/control and deterministic P3a adapter;
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

1. Finish P1-B first: one browser Pi Agent Worker, typed product RPC, memory-only
   provider key ownership, and one proposal `AgentTool`. This proves the Agent
   path without pretending a VFS or shell exists.
2. Freeze `WorkspaceRuntimePort` from one Browser Pi tool and a deterministic
   runtime. Then give one Workspace Host Worker an OPFS workspace and prove one
   create/read artifact action, reload/cold reopen byte identity, 1,000 small
   files, one 16 MiB file, quota-full recovery, and interrupted-write recovery.
   This B1 slice still has no shell, Git, Python, or Linux claim.
3. Characterize just-bash as the Browser shell/control over that same
   single-owner volume. Run one build-known Worker-owned Wasm Ripgrep or Tar
   command against the same bytes. This B2 slice tests composition without
   selecting a full container.
4. Run the full corpus against agent-sandbox on Deno, Wasmer/WASIX, BrowserPod,
   and CoWasm where licensing and target access allow. A Deno-specific adapter
   is allowed behind the same contract; SDK identity across targets is not a
   goal. Keep full-Linux emulation and WebContainers as measured controls rather
   than assumed dependencies.
5. Select only the smallest target pair that passes the required semantics in
   Chromium, WebKit, and Deno Desktop. Record unsupported shell behavior
   explicitly, then promote it behind the already-proved Pi forwarding path.
   Expand toward Pi's native read/write/edit/bash operations and the required CLI
   image only after that proof and review.

This order does not start a public tool ABI, package manager, Linux distribution,
container orchestrator, untrusted-code sandbox, remote build service, or Pi
replacement. If no target pair passes the complete matrix, SillyOS retains the
typed port and ships a smaller admitted Linux-tools harness rather than claiming
Linux or a container.
