<!-- SPDX-License-Identifier: MIT -->

# SillyOS product-incubation plan

Status: accepted Browser-first, dual-target product lane with validated P0,
P1-B B0a/B0b, and P2 implementations plus a dev-only Pi launch helper,
2026-08-27. P2-B0 delivered the product-owned IndexedDB Worker and exact Program
catalog; P2-B1 then delivered Repository V2 plus bounded terminal Agent-run
receipts. P2 is closed. No later slice is automatically active: P1-D remains
owner-paused and P3a is the next bounded candidate but remains inactive pending
owner activation. The raw launcher is not the typed product RPC; the live
Browser route is a separate product path. This plan is local to
`examples/silly-os`; it does not activate an engine lane or change an engine
API. The implementation baseline before P0 is commit
`56ba8ef8ecf0a38243e92cba548f53c1c57c0b73`.

## Product invariant and execution rule

Agent Creator remains the only built-in user-facing program. Every generated
Program remains one cohesive product unit:

```text
Program = project + harness + agent + app
```

Browser and Deno Desktop are the product targets. Browser is the current
implementation priority so the deployed example can become a usable local-first
product; Desktop remains a first-class target behind the same product contracts.
Cloudflare OS remains an interaction and spatial-layout reference only. The
responsive, keyboard, IME, focus, and anti-clipping contracts in
[DESIGN.md](./DESIGN.md) remain the visual/product baseline while this lane adds
real behavior.

The `agent` term above means the explicitly selected Pi profile, extensions,
skills, prompts, models, and tools that make that Program useful. A live Pi
session and Creator Chat belong to the Creator supervisor that opens and edits a
Program; they are not Program content. A Program has a mutable Workspace and
names immutable reviewed Workspace snapshots, but is not identical to either
one live Workspace instance or one conversation. SillyOS does not implement a
second Agent loop, provider layer, tool dispatcher, session format, or extension
system. SillyMaker remains responsible for GUI and interaction contracts; it
does not absorb Pi, model, Program-database, or tool runtime responsibilities.

Future generated UI follows the same split. Pi may produce an admitted OpenUI
artifact through a Pi extension tool, while a closed adapter maps supported
OpenUI component and action names onto SillyMaker UI components and interaction
contracts. OpenUI is an interchange description, not a second renderer,
application authority, or path to arbitrary component execution.

The workspace requirement is likewise behavioral rather than technological.
Each opened Program needs a familiar coding-tool environment plus one
product-owned volume
that coherently contains inputs, outputs, the working tree, temporary files,
file-resident data, `AGENTS.md`, and skills. WebAssembly is a promising portable
execution mechanism, especially in Browser, but it is not the product contract:
the selected target adapters may combine TypeScript, Workers, Wasm payloads, or
a native companion behind the same typed workspace boundary.

Only one phase below is active at a time. A later phase may be refined before
it starts, but it may not silently weaken this product model or claim evidence
that an earlier phase did not produce. Product code may not import the ignored
`references/` checkouts.

Until the first stable release, every phase also follows DESIGN's clean
replacement rule: breaking product-private contracts may reset preview data,
and the same slice deletes the superseded implementation, types, fixtures, and
tests. Do not retain compatibility shims, dual schemas, deprecated aliases, or
fallback behavior merely to preserve an earlier preview.

## Current baseline and gaps

The committed P0 Creator Preview is a real responsive product shell backed by
one deterministic in-memory initial producer. B0a adds a query-gated,
product-owned Browser Pi Worker behind a typed product facade: the real pinned
Pi Agent runs a deterministic provider and one bounded AgentTool, then offers
an exact P0 successor candidate for atomic publication. The ordinary initial
graph still excludes Pi. B0b adds a second explicit query-gated route whose
follow-ups use the same Pi Agent, tool, RPC, and product currentness with a fixed
OpenAI Responses profile. That integrated route is qualified locally and from
its deployed Cloudflare origin. P2-B0 now adds a bounded Browser-local Program
database, durable exact Program revisions and decisions, and recent-Program
reload/reopen. The product still has no persistent Pi session, workspace
volume/runtime, WASM guest, provider selector, or generally active capability.
Its initial proposal, Source, translation rows, remaining capability labels,
and downloaded manifest remain explicit preview material.

The first contract gap was smaller than those integrations: the design said
accept/reject targets an exact proposal revision, but the baseline proposal had
no revision, follow-up text did not produce a successor Program, and decisions
implicitly targeted whichever proposal happened to be current. P0 closes that
ambiguity before an asynchronous Agent or durable writer can participate.

The existing GUI application entry is sufficient for the Browser-first slice:
it supplies an application-owned React tree and Host capabilities, while a
product-owned Dedicated Worker can host Pi behind a typed MessagePort boundary
without changing the engine.

The audit reproduced three neutral Host gaps for a later integrated Desktop
claim: application-private companion routing, async required-domain readiness,
and awaited product close preparation. The main engine task delivered those
general capabilities independently in commit
`8038da10c2b4be7ae42d9ec1e3f6b65cee2db5c0`; the SillyOS review passed its
focused contracts, Chromium/WebKit product path, full repository check, and the
Deno 2.9.5 companion preview. This product branch neither contains nor consumes
that engine commit in B0a. Deno 2.9.6 remains only the separate Desktop HMR
promotion gate, not a prerequisite for the 2.9.5 companion preview path.

## Ownership decisions

| Authority                                                                                                     | Owner                                      | Boundary                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Program identity, accepted revisions, proposals, decisions, and publication receipts                          | SillyOS product database                   | Product repository and typed product services                                                                                               |
| Creator Chat, live Pi-session binding, and review coordination                                                | SillyOS Creator supervisor                 | Session-local control plane plus bounded durable references/receipts; conversation is not Program content                                   |
| Draft sources, `.git`, generated files, artifacts, file-resident product data, `AGENTS.md`, and skills        | One workspace volume per Program           | A product-selected `WorkspaceRuntime`; accepted Program state names an exact immutable snapshot                                             |
| Agent loop, session semantics, compaction, model/provider calls, tool dispatch, and Agent extension lifecycle | Pi                                         | Fixed `pi-agent-core`/`pi-ai` in Browser; complete fixed `pi-coding-agent` companion in Desktop; public Pi tool/extension contracts         |
| `read`/`write`/`edit`/`bash` Agent schemas, validation, execution algorithms, updates, and results            | Pi                                         | Browser uses the shipped agent-core factories; Desktop retains fixed coding-agent built-ins and proved public tool-factory/SDK hooks        |
| Presentation-facing Agent transport                                                                           | SillyOS target adapter                     | Browser Worker or Desktop companion projects only admitted commands/events; raw Pi/provider records never enter React state                 |
| Agent-side product functions                                                                                  | Pi plus pinned SillyOS capability adapters | One shared schema/prompt/handler core, registered as a Browser `AgentTool` or Desktop `ExtensionAPI` tool; no parallel Agent/plugin runtime |
| Workspace lifecycle, capabilities, generation, change journal, and terminal mutation receipts                 | SillyOS `WorkspaceRuntimePort`             | Product-private owner that supplies a stable Program-scoped Pi `ExecutionEnv`; it is not a second tool API                                  |
| Workspace filesystem and shell effects                                                                        | Product-selected execution provider        | Browser Local VFS plus just-bash shell, Desktop native companion, or admitted BYO Sandbox; no Host-filesystem fallback                      |
| Pi session and provider credentials                                                                           | Target-local Pi owners                     | Browser Agent Worker owns an ephemeral key/session initially; Desktop owns isolated Pi session/auth storage; Program data holds no secret   |
| Responsive presentation and application mounting                                                              | SillyMaker GUI contracts                   | React/UI components, input, focus, accessibility, responsive layout, and admitted UI interaction                                            |
| Human approval and publication                                                                                | SillyOS Program authority                  | Exact proposal, base accepted revision, and reviewed workspace generation are rechecked before snapshot publication                         |

Pi, product storage, workspace runtimes, and tool implementations are
infrastructure for Programs that need them. They are not optional desktop
icons. Agent-facing capabilities are real Pi extensions/tools selected by a
Program; SillyOS does not mirror them into another executable plugin system.

`WorkspaceRuntimePort` and Pi `ExecutionEnv` are orthogonal rather than
competing abstractions. The former is the eventual owner of a Program
Workspace's lifecycle, provider selection, leases, generations, persistence,
capability truth, and receipts; each phase implements only the fields with a
real consumer. Its Pi-facing execution projection satisfies the latter's
`FileSystem + Shell` contract. Cross-Worker or remote RPC carries those
environment primitives and product call scope; it does not send
`{ toolName, arguments }` through a second tool dispatcher. Browser Local uses
two thin adapters over one byte authority: Pi's filesystem adapter for
`read`/`write`/`edit`, and just-bash's `IFileSystem` adapter for commands invoked
by Pi `bash`. The adapters must not create two synchronized VFS trees.

SillyOS does not fork or browser-port `pi-coding-agent`. The fixed Pi 0.84.3
distribution already separates the useful shared runtime from the Node-oriented
coding product:

- Browser uses the public `pi-agent-core` `Agent`, `AgentTool`, shipped
  `createReadTool`/`createWriteTool`/`createEditTool`/`createBashTool` factories,
  and host-abstract `ExecutionEnv` contract together with selectively
  imported `pi-ai` providers. A tiny product-private binder supplies the stable
  `{ env }` context without copying the tools' schemas or algorithms.
- Desktop packages the complete fixed `pi-coding-agent` artifact because its
  native session files, resource discovery, coding tools, JSONL RPC, and public
  Extension API are real Desktop capabilities.
- The 0.84.3 `AgentHarness` convenience surface is not selected yet: its public
  shape exists, but its prompt, resume, compaction, navigation, lane, and wait
  operations still fail as unimplemented. Browser uses the stable public
  `Agent` rather than filling those methods with a SillyOS-owned harness.

Removing Node/TUI/filesystem/loader behavior from a fork would leave the two
packages Pi already publishes for Browser while creating a permanent merge and
compatibility burden. A fork is reconsidered only if this product reproduces a
neutral shared capability gap. The first response to such a gap is a focused Pi
upstream extraction or public subpath, not a private SillyOS Agent runtime.
Keeping the complete Desktop artifact also preserves Pi's native extension path
for future user-selected plugins. The current raw launcher and first companion
slice do not yet enable arbitrary user or workspace extension discovery; the
first product extension remains build-known and version-pinned.

One opened Program Workspace is paired with one **logical** `WorkspaceRuntime`
and one persistent volume. The word logical is deliberate: the harness may use
TypeScript commands, multiple Web Workers, WebAssembly modules, or a native
companion or remote sandbox, and the target adapters need not use the same SDK.
Product correctness must not depend on the fiction that a complete shell,
process tree, Python, Git, and every CLI inhabit one `WebAssembly.Instance`.
The volume is the mutable working copy; an accepted Program revision is an
immutable snapshot of an exact volume generation plus product metadata.

The engine's workspace-private `@sillymaker/composition/internal/mod-runtime`
is not a public ABI, resolver, SDK, or distribution system. This product plan
does not depend on it. A selected Pi extension may be a build-known,
version-pinned product dependency, but it is not a SillyMaker Mod and it never
turns generated TypeScript into an admitted runtime module.

There is currently no newly reproduced SillyMaker engine gap for the workspace
execution lane. Program/Workspace semantics, Creator supervision, Pi tools and
extensions, provider keys, OPFS/VFS, just-bash, Wasm payloads, Desktop or BYO
sandbox adapters, persistence, receipts, and product workflows remain in
`examples/silly-os`. SillyMaker owns only use-case-neutral GUI/Host/input/focus
contracts and the already private admitted Agent-UI seam. A candidate is handed
back to the engine only after a minimal neutral reproduction outside SillyOS
shows a generally useful GUI/Host capability missing, names a second consumer,
and explains why a product-local adapter is insufficient. Such a reproduction
uses no Pi, Program, Workspace, sandbox, translation, writing, or role-play
vocabulary. The engine's private Mod Runtime is never treated as the Pi plugin
system, an execution sandbox, or a public ABI.

## Reference decisions

The local reference checkouts were inspected at these clean revisions:

- Cloudflare OS `6223e261f18849b817a8d7ca03fe3678b77048ca` informs the
  workspace roles, pane behavior, focus transfer, and responsive spatial model;
  its Workers/Durable Objects/Dynamic Workers kernel does not.
- Pi `8fa7eebd235355522c8104166b4f1f959b4e2f10` supplies two relevant public
  paths. Its Browser smoke bundles `pi-ai`, `pi-agent-core`'s `Agent`, an
  in-memory session repository, and a selectively imported provider; this is
  the P1-B basis. The exact 0.84.3 release also exports host-abstract
  `ExecutionEnv` plus native `read`/`write`/`edit`/`bash` harness-tool factories;
  these are the Browser workspace-tool basis. Its full coding-agent Extension
  loader and public tool-factory/SDK operation hooks remain Node-oriented, while
  its working JSONL subprocess mode is the Desktop basis. The newer strict CBOR protocol
  packages still provide no standalone coding-agent service and are not
  selected. Product capabilities are adapted to a Pi `AgentTool` in Browser and
  `ExtensionAPI.registerTool()` in Desktop; SillyOS does not reproduce the
  Extension API in Browser.
- Oh My Pi `d17c270090562d730e4d42d1aa3fdd93b45cf41a` is a useful tool-composition
  pressure source: it keeps a curated model-visible registry, distinguishes
  essential and discoverable tools, leaves many command-line utilities inside
  its shell, and promotes structured capabilities such as search, LSP, eval,
  browser control, and subagents to Agent tools. It is not a SillyOS dependency
  or fork base. Its Agent/coding product requires Bun and Node APIs plus
  in-process Rust/N-API Brush shell and utility packages, TUI, and other Host
  integrations, so removing a few tools would not create the shared Browser core
  SillyOS needs. Its
  host-filesystem fallback and product-specific schemas also do not replace the
  stricter Program Workspace authority.
- OpenUI `cda504b5e1a8ab8fb945316bdaad09dbb28c2a3f` informs closed renderer
  catalogs, explicit partial/final state, and structured admission failures.
  A future adapter will map admitted OpenUI names and props to SillyMaker UI
  components. Its executable generated actions and permissive dynamic values
  are not an authority-bearing Program contract.
- AI-System-6 `1a5fab8b65e7a098dbadabc1fb4f0ad239af4f2d` reinforces durable
  commit-before-success, replace-and-abort currentness, and truthful capability
  availability. Its broad receipt and multi-window frameworks are deferred.
- Pocket Pi `b7c3c958363022aa2e67a9e1b4925f1f185823cc` informs per-application
  SQLite/files ownership, data surviving runtime eviction, scoped bounded
  tools, and a deliberately small framework surface. Its embedded QuickJS
  runtime and package lifecycle are not SillyOS's WASM implementation.
- InkOS `091048383f411eb99948a8764f42b6fd13006f9b` and LinguaGacha
  `800b34e89e44c3a8af15303a7ec54656cdf10ce0` inform product-owned atomic
  publication, explicit proposed changes plus apply receipts, and concrete
  translation/writing/role-play product denominators. Their Node/Electron
  execution topologies and mature universal harnesses are not copied.
- RisuAI `7101c3c9e71f56e603a25e239554333fc9100695` proves useful
  browser-local WASM workloads and role-play pressure, while also showing why a
  guest must not receive ambient mutation, networking, model, or UI authority.

The product references do not supply a ready Browser-and-Deno workspace harness
for a Pi tool. Current shell, volume, portable-payload, native, and full-
environment candidates and their evidence are tracked separately in
[WASM-WORKSPACE-RESEARCH.md](./WASM-WORKSPACE-RESEARCH.md). The first
workspace implementation binds Pi's shipped `write` and `read` to one stable
Browser `ExecutionEnv` and must prove one real Program artifact action before
it grows to `edit`, `bash`, persistence, or another provider. It does not create
another Agent tool ABI.

## Phased product lane

### P0 — exact Creator proposal revisions

This delivered slice makes the existing local review loop safe enough to accept
a later external producer without claiming that producer, persistence, or tool
execution already exists.

Outcome:

- every preview Program has a per-Program monotonic revision and explicit
  accumulated requirements;
- every proposal names the exact Program revision it presents;
- a follow-up produces a deterministic successor Program and a new pending
  proposal revision instead of merely promising a future revision in chat;
- accept/reject supplies the expected proposal identity and Program revision,
  and stale checks compare both;
- a stale decision is rejected as a whole and leaves the current proposal
  untouched;
- the visible proposal, Source facet, Activity, and preview download expose the
  current revision truthfully.

The slice remains synchronous, deterministic, in memory, and preview-only. It
does not add RPC envelopes, fake connection state, persistence interfaces,
capability activation, generated code, a WASM placeholder, or engine changes.

Acceptance:

- focused tests cover initial revision, deterministic successor generation,
  accepted/rejected current revision, stale whole rejection, input bounds,
  observable publication, the Browser-facing follow-up to pending-successor
  journey, and return to Home;
- at P0 closure, the Browser/Deno build graph contained no Pi, database, Agent,
  composition-runtime, or WASM dependency; B0a later added Pi only to its
  query-gated lazy Browser route;
- visible copy continues to say deterministic/local and preview-only;
- the package documentation describes both the delivered slice and every
  remaining defer without promoting the product.

P0 evidence refreshed on 2026-08-27: the two focused SillyOS test files pass all
19 cases; the complete SillyOS product spec passes all 12 Chromium/WebKit cases,
including follow-up → pending successor → Source/Activity and the maintained
responsive/keyboard journeys; the repository TypeScript gate, focused lint,
changed-file format, diff check, and production Browser build pass. A final
bundle scan finds no launcher or provider-key identifiers. The slice did not
change Desktop Host or packaging code, so Desktop packaging was not rerun.

### P1 — real Pi conversation through a product RPC

P1 has one product facade and two target adapters. Browser will be implemented
and qualified first; Desktop follows without changing the Creator contract.

#### P1-B — Browser Agent Worker

The first real route is entirely client-side after static application delivery:

```text
React Creator
  -> CreatorAgentPortV1 product facade
  -> admitted MessagePort RPC
  -> Agent DedicatedWorker
       -> pi-agent-core Agent
       -> selectively imported pi-ai provider
       -> one pinned SillyOS Pi AgentTool
  -> provider HTTPS endpoint
```

The Worker owns the pinned Pi `Agent`, the selected `pi-ai` provider adapter,
streaming, cancellation, and the initially in-memory Pi session. React owns
only presentation and `CreatorAgentPortV1`; it never receives raw Pi messages,
provider response records, or tool implementation objects. The strict product
wire owns request admission, `(sessionId, runId, seq)` currentness, replacement,
terminalization, cancellation, and bounded text/tool-result projection. This is
a GUI transport contract, not a second Agent loop or provider abstraction.

The first product capability has one implementation of its prompt contribution,
input/result schema, and handler. A thin Browser adapter registers it as the
public Pi `AgentTool` named `sillyos_propose_program_revision`. Only that tool's
complete schema-admitted result may propose a P0 successor. Free-form and
streaming model text is transient and inert. Full `pi-coding-agent`, its Node
extension loader, dynamic Pi Packages, ambient extensions/skills/prompts, host
read/bash/edit/write tools, and extension UI are not imported into Browser.
The model-visible tool schema contains only `requirement`; its trusted handler
binds `revision`, proposal and Program identities, base revision, and original
text from the already admitted submit. The Worker then rechecks the complete
candidate before publication, so prompt compliance never owns currentness.

The accepted Browser setup target is Bring Your Own Provider: the user will
supply either a product-qualified provider profile or an HTTPS compatible
endpoint. B0b deliberately implements only fixed OpenAI Responses model
`gpt-4.1-nano`; it does not yet expose this general surface. A later custom
profile is explicit rather than guessed and minimally contains:

- protocol: `openai-responses`, `openai-chat`, or `anthropic-messages`;
- HTTPS `baseUrl`;
- `modelId` and any admitted model limits not safely supplied by the profile;
- an API key.

Pi still owns the actual provider stream. Browser support is a product-qualified
subset of Pi providers, established per provider/protocol in Chromium and
WebKit for CORS preflight, streaming, tool calls, cancellation, and error
mapping. Pi supporting a provider on Desktop does not by itself make that
provider a Browser capability.

The API key necessarily exists briefly in the page's password input and browser
memory. The setup form therefore uses an uncontrolled password input and
transfers the value immediately to the Agent Worker. The key is memory-only by
default: it does not enter React state, a URL, logs, telemetry, HTML bootstrap,
the Program database, IndexedDB, OPFS, Cache API, exports, or downloads.
Forgetting credentials terminates and rebuilds the Agent Worker. This Worker is
an ownership boundary that reduces accidental propagation; it is not a defense
against same-origin script compromise or a privileged browser extension.
Endpoint/model profiles may persist later, but the key does not.

The primary production route is a direct HTTPS request from the Agent Worker to
a known qualified provider. A custom HTTPS endpoint is conditional on its CORS,
preflight, streaming, cancellation, and protocol behavior. Public HTTP is
rejected as mixed content. `localhost` and LAN endpoints are not a cross-browser
baseline because mixed-content and local-network permission behavior differs.
The first release uses a small `connect-src` allowlist. An arbitrary endpoint
requires a later precise-origin CSP/reload design or a user-deployed relay; the
default policy is not widened to `connect-src https:`. SillyOS does not operate
a general Cloudflare relay, because that would make the product a key transit,
SSRF, open-proxy, logging, and abuse boundary.

P1-B is deliberately split at the credential boundary:

1. **B0a, implement without a real key.** Lazy-load one Pi Agent Worker behind
   the typed product RPC, exercise it through Pi's public Agent surface with a
   deterministic provider test double, register the one real AgentTool, and
   prove streamed text, exact proposal revision, cancel, replacement, failure,
   late-event fencing, Worker teardown, and unavailable setup states. The
   Creator initial graph must exclude Pi and provider code. A synthetic key
   proves by inspection and browser tests that no durable store, URL, log, or
   product record contains it.
2. **B0b, one live provider profile.** Add the explicit
   `?agent=pi-openai` route with fixed OpenAI Responses model
   `gpt-4.1-nano`. Its uncontrolled password input transfers one key directly
   to the existing Agent Worker and clears immediately. The Worker uses the
   same Pi `Agent`, product tool, typed RPC, currentness, cancellation, and
   candidate admission as B0a; only the Pi-owned provider stream changes. One
   real follow-up must stream a bounded reply, call the one tool, and offer an
   exact P0 successor. A missing or rejected key fails visibly and never falls
   back to the deterministic provider. Local Chromium/WebKit evidence is
   necessary but not sufficient: the same route must pass through the deployed
   Cloudflare static origin before B0b closes.

B0a closed on 2026-08-27. Exact `0.84.3` dependencies for
`pi-agent-core`, `pi-ai`, and the separate Desktop/development
`pi-coding-agent` artifact are product-manifest and root-lockfile inputs. The
ordinary Creator entry dynamically imports only the product facade after the
explicit `?agent=pi-test` request; that facade constructs the Agent Worker only
after setup. The Worker reports the exact Browser distribution identity, owns
the one-time synthetic credential, runs Pi's real `Agent` with its deterministic
faux provider, registers only `sillyos_propose_program_revision`, and returns
only admitted product records. The same exact candidate/currentness check backs
both deterministic and Pi-produced P0 successors. Forget/dispose terminates the
Worker; no fallback to a host Pi, private Mod Runtime, or separate Agent loop
exists.

B0a evidence is seven focused Browser Pi tests covering fixed distribution
identity, exact admission, unavailable setup, real Pi tool execution,
submit-before-stream ordering, contiguous sequencing, replacement,
cancellation, current-run retention, and Worker teardown; the four focused
SillyOS files pass 33 cases. The query-gated
product journey passes in Chromium and WebKit and checks that its synthetic key
does not appear in the input after transfer, URL, DOM, console, network, or
browser durable-store projection. The production build emits Pi only in a lazy
23.29 kB facade plus 195.85 kB Worker asset; the ordinary HTML preload graph
contains neither, every asset is far below Cloudflare's 25 MiB limit, and no
coding-agent or live provider implementation appeared in the B0a Browser
output.
Repository TypeScript, focused lint/style/format, lockfile, and diff gates pass.
The B0b pre-implementation gate used operator-supplied keys without logging or
persisting their values. Direct Pi 0.84.3 Deno probes returned HTTP 200 and a
complete response for Anthropic, OpenAI, DeepSeek, and xAI. The selected
OpenRouter model failed with a permission-class error, while the selected
Gemini model failed as unavailable; neither is promoted or diagnosed further
by this slice. A raw OpenAI Responses request from the local SillyOS origin then
returned HTTP 200, a streamed body, and an observed abort in both Chromium and
WebKit. This establishes the first profile's credential, CORS, preflight,
streaming, and cancellation prerequisites.

The integrated B0b route then passed locally in Chromium and WebKit. In each
browser the uncontrolled input cleared after transferring the key; a run was
cancelled after an actual Provider request and could not advance proposal v1;
the next follow-up completed the single trusted proposal-tool path and offered
the exact v2 successor; the tested durable-store projection contained no key;
and Forget removed the live surface by terminating the Worker. The permanent
qualification command reads `OPENAI_API_KEY` from the local `.env`, inspects no
request headers or bodies, and emits only bounded status evidence.

B0b closed on 2026-08-27 after Wrangler 4.123.0 deployed commit
`6d353ab4ac215c059603f86a8707dab5433e7c92` to
`https://silly-maker-silly-os.jasl9187.workers.dev` as Cloudflare version
`acfb774e-eb05-4a44-8d4c-ddb151f6cd55`. The origin returned HTTP 200, the exact
build identity, and the expected `connect-src` policy. The permanent
qualification then passed in Chromium and WebKit with the same cancellation,
exact v2, two completion requests at HTTP 200, durable-key absence, and Forget
receipts as the local run. This closes only the fixed B0b profile; it does not
activate a general Provider UI, persistence, workspace tools, or a later phase.

The current B0b production build keeps the Agent facade lazy at 23.32 kB and
emits one 388.00 kB Pi Worker asset; the ordinary HTML preload graph still
excludes both and every asset remains below 25 MiB. The Cloudflare `_headers`
artifact admits only self and `https://api.openai.com` under `connect-src` for
this profile. Vite reports that Pi's `provider-env` `node:fs` fallback was
externalized for Browser compatibility. Both real browsers pass because that
guarded Bun fallback is unreachable on this route. Pi 0.84.3 has no narrower
public Provider entry that removes the warning without copying Pi model or
adapter authority into SillyOS, so this slice records the warning instead of
forking or patching Pi.

B0b intentionally does not add a provider selector, custom endpoint, OAuth,
credential persistence, multi-turn Pi transcript persistence, WorkspaceRuntime,
or another provider adapter. Those remain separate evidence gates after the one
fixed profile proves the complete product path.

P1-B adds no workspace VFS, shell, Wasm payload, database, durable Pi session,
provider relay, OAuth flow, general endpoint proxy, or OpenUI. Cloudflare owns
only static application delivery in this slice. A single static asset must stay
below the platform's 25 MiB limit; large future Wasm/tool payloads are split or
streamed rather than folded into the Creator bundle.

#### P1-D — Deno Desktop companion parity

After the Browser route is sound, adapt the same `CreatorAgentPortV1` and shared
capability core to the Desktop topology:

```text
React Creator
  -> CreatorAgentPortV1
  -> application-private Host companion route
  -> SillyOS companion
  -> real Pi coding-agent JSONL subprocess
```

The companion launches the pinned real Pi coding-agent RPC with session
persistence disabled through `--no-session`. Built-in host tools, ambient
extension/skill/prompt discovery, and context-file discovery are also disabled.
It loads exactly one version-pinned SillyOS Creator extension through Pi's
supported Extension API. Its thin adapter registers the same shared Creator
capability core with `ExtensionAPI.registerTool()`; it does not duplicate the
Browser AgentTool handler or emulate the Extension API.

The companion uses an isolated `PI_CODING_AGENT_DIR`, an explicit Pi provider
and model, `--no-session`, `--no-extensions` plus one explicit `-e` entry,
`--no-tools`, and disables skills, prompt templates, context files,
themes, and implicit project approval. Provider/model values remain opaque and
are validated by the pinned Pi process; SillyOS does not copy Pi's provider or
model registry.

For local development and testing, the product-private `pi:rpc` launcher accepts
Pi's existing `--provider`, `--model`, and selected-provider `--api-key` surface,
inherits process environment variables, and uses Deno's exact `--env-file`
support plus the runtime's standard parser for a selected directory's `.env`.
A Pi executable is not startup configuration: the launcher never searches host
`PATH` and exposes no environment or argument override. It resolves only the
exact `@earendil-works/pi-coding-agent@0.84.3` CLI artifact materialized by this
product's lockfile-backed dependency installation, requires a local regular
file, and runs it with the current Deno executable. A missing or malformed
artifact fails before dry-run or launch. Desktop packaging must later copy that
same fixed package closure into the product rather than consulting a host
installation. Browser `pi-agent-core` / `pi-ai` dependencies are separately
pinned and never consume the coding-agent CLI artifact.
A raw key argument is an explicit
developer convenience that may be visible in shell history or process
inspection, and surrounding task runners may echo their received arguments. The
launcher itself redacts the key from its diagnostic summary and never persists
it, sends it through the product wire, places it in React/HTML bootstrap state,
or stores it in the Program database. The normal route remains an isolated Pi
auth owner or Pi's documented provider environment variables. Runtime
`--api-key` wins for the selected provider; Pi auth then retains its own
precedence over inherited environment, whose process values win over `.env`
values.

The dev launcher can also delegate `--list-models` to the pinned Pi executable,
so the isolated instance can report its currently available provider/models
without a SillyOS allowlist or UI configuration. This is not an unauthenticated
static catalog: Pi filters it through the credentials and configuration visible
to that isolated instance. Opaque `--provider` and `--model` values still leave
the pinned Pi process as their sole validator. The launcher starts raw Pi RPC
with all tools, extensions, skills, prompts, themes, context discovery, and
project approval disabled. It is a launch/configuration proof only: raw JSONL
still goes to its stdio and is not connected to Creator until P1-D's admitted
companion transport lands. This launcher is useful for development and Desktop;
deployed Browser configuration uses the P1-B UI and never reads server `.env`,
desktop process environment, or CLI arguments.

`CreatorAgentPortV1` remains the product facade. Its single engine-projection
adapter may reuse the workspace-private `@sillymaker/agent/internal` currentness
implementation only where its existing contract fits exactly. Its types do not
enter Program data or become the SillyOS wire, and they are not promoted as a
public Agent ABI. The complete internal Agent Host is not used merely because a
Program proposal is not a generated UI artifact.

The companion still owns the real network/raw transport, server-side admission,
Pi JSONL parsing, and child-process correlation; the private engine package does
not provide those pieces. It buffers Pi stream records until the matching prompt
response settles as accepted and only then forwards that run's first event. It
maps records into text, the one named Creator tool result, final, failure, and
cancel events; terminalizes once; ignores late or replaced records; and treats
process exit as a failure of the current run. Wire admission has explicit byte,
depth, node, and text limits. This is transport correctness, not a second Agent
state machine.

Because P1 has no workspace volume yet, its review receipt remains the P0
`(proposalId, programRevision)` pair. P2 extends durable product ownership before
any mutable draft participates. P1-D is explicitly an operator-preconfigured
provider/auth profile plus real conversation; the current Pi JSONL RPC has no
general login or credential-management command.

P1-D does not expose Pi RPC types, paths, provider records, extension UI, or
session files to React. It does not enable Pi's read/bash/edit/write tools,
user/project extension discovery, Pi Packages, or dynamic extension paths. Its
integrated bootstrap/readiness/close claim waits for acceptance of the neutral
Host candidate above. Individual companion contracts may still be characterized
on the maintained Deno 2.9.5 runtime. That does not activate the Desktop product
lane: by owner sequencing P1-D remains paused while Browser is the implementation
priority and until Desktop work is resumed explicitly. Stable Deno 2.9.6 remains
only the separate Desktop HMR promotion gate; it is not a prerequisite for
companion contract work. P1 does not adopt the experimental Pi
protocol/client/server packages until a real coding-agent service and
target-runtime evidence exist.

Provider integration stays inside Pi in both targets. SillyOS does not implement
provider SDKs or translate provider streams itself. Browser calls a qualified
provider directly from the Agent Worker; Desktop uses Pi's auth store,
environment contract, or explicit development argument. Neither route exposes
raw provider records to React or stores credentials in Program data.

### P2 — product persistence and database ownership

Give SillyOS one product repository contract and one exact current schema owner
for the Program catalog, immutable Program revisions, exact P0 proposal
decisions, and P1 terminal Agent-run receipts. Before the first stable release,
a breaking repository change replaces and resets the preview schema instead of
carrying a migrator or dual reader; migration obligations begin only after a
durable contract is explicitly frozen. An opaque Pi session reference is added
only for a target that has proved a Pi-owned persistent session implementation.
Stream drafts, process state, raw Pi events, and non-terminal progress remain
transient. Pi owns Agent session history/compaction and its own session format.
Provider credentials stay in the target-local Pi owner and never enter Program
data.

A success becomes observable only after its transaction commits. Failed writes
retain the previous durable Program record. P2 persists and rechecks P0's exact
`(proposalId, programRevision)` decision contract. Per-Program domain tables or
a bounded namespace may be added only for an accepted product family with a
real consumer; derived indexes remain rebuildable.

Durable ownership stays outside React state. The first Browser adapter is a
Worker-owned IndexedDB repository because P2 needs bounded catalog records, not
a speculative SQL/Wasm stack. SQLite-WASM/OPFS remains an evidence-gated option
if a real query or transaction need exceeds that adapter. A
companion-owned native SQLite driver is the Deno Desktop candidate. Selected
database adapters run the same product repository conformance and schema-version
contract, while exactly one adapter owns a live catalog in either target. Pi
session persistence and the Program database own different facts; neither is an
alternate authority for the other. SillyMaker Game Save owns neither.

P2 deliberately does not add durable workspace identity, tool receipts,
artifact references, a workspace volume, snapshot format, filesystem adapter,
or cross-store publication path. P3a adds only the session-scoped workspace
identity and terminal tool receipt needed by its real control-volume consumer.
P3b selects the runtime/storage pair. P3c introduces durable workspace,
admitted artifact, and snapshot references with their exact owning schema. This
prevents the product database from pre-committing to facts without a consumer or
to a filesystem a winning runtime cannot mount.

P2 keeps the target distinction explicit. Browser initially creates a fresh
in-memory Pi session after reload; durable Browser Agent history waits for a
public, browser-compatible Pi session repository to pass reopen, compaction,
replacement, and deletion evidence. SillyOS does not serialize Pi internals as
a substitute. Desktop may remove `--no-session`, assign an isolated Pi session
directory/lifecycle to the Program, and store only its opaque reference plus
product-side currentness. Product persistence can ship before both target Agent
session adapters have parity, provided the UI reports the session limitation.

#### P2-B0 — Browser durable Program catalog

P2-B0 is the delivered first persistence implementation after B0b. It proves
one useful Browser product path without pre-committing P3's
workspace runtime or generalizing storage into an engine framework:

```text
React Creator
  -> product-private ProgramRepositoryV1
  -> admitted repository Worker RPC
  -> Dedicated Program Repository Worker
  -> sillymaker.example-silly-os.programs IndexedDB schema V1
```

The first repository owns only facts that already have a P0 consumer: a bounded
Program catalog head, immutable admitted Program revisions, the exact current
proposal pair and accepted/rejected decisions, and bounded product-visible
messages and Activity. V1 admits at most 64 Programs per origin, 32 revisions,
96 messages, and 96 Activity entries per Program, with a 512 KiB encoded
aggregate ceiling and summary-only list results. Crossing a bound rejects the
whole mutation. The visible messages are a product projection, not Pi's session
format or a replacement for Pi history/compaction. Browser reload still starts
a fresh Pi session and requires fresh credential setup.

The Browser adapter owns its database connection, exact schema/version
admission, transactions, and lifecycle inside one Dedicated Worker. React and
the Agent Worker receive no `IDBDatabase`, object-store handle, or raw stored
row. The repository wire is product-private and exposes only `initialize`,
`list`, `load`, `create`, `applyRevision`, `decide`, and `dispose`. It is not a
general CRUD, SQL, migration, or cross-product storage protocol. The existing
Web Host record store is implementation evidence, but its closed
`save | lease | settings` ownership is not used as a Program namespace and no
private engine source is imported.

Every mutation carries the expected repository revision and the applicable P0
proposal/base-Program currentness. The Worker rereads and checks those values
inside one `readwrite` transaction. A successor revision is appended without
rewriting earlier logical revisions; its catalog head, messages, and Activity
commit atomically. Decision history is exact and append-only. The page treats
only the transaction `complete` receipt as success, then publishes the new
product snapshot. Abort, quota, stale, corrupt-schema, blocked-upgrade, or
unavailable failures proven before commit retain the previous durable and
visible Program; there is no optimistic success followed by rollback and no
silent in-memory fallback. If the Worker or transport disappears after commit
could have completed but before its receipt arrives, the result is
`outcome_unknown`: the controller reloads and reconciles the exact durable head
before it reports success or offers a retry. It never blindly repeats that
mutation.

The first user-visible surface is deliberately small. Creator Home loads a
recent-Programs list with name, kind, current revision, and proposal status.
Creating a Program, applying a deterministic or Pi successor, and deciding a
proposal show success only after commit. Returning Home does not delete the
Program. Reloading the origin and opening a recent Program restores the exact
durable revision, proposal status, messages, and Activity while requiring a
fresh Browser Pi setup. Repository-unavailable and write-failure states are
explicit and retryable.

P2-B0 acceptance is:

- one product repository conformance covers create/list/load, immutable v1/v2
  revisions, exact accepted/rejected decisions, idempotence, stale CAS, and
  reopen;
- schema/open failure, corrupt rows, transaction abort/quota, Worker disposal,
  post-commit lost receipts, and two-client conflicts never expose a partial
  successor or trigger a blind replay;
- focused Creator tests prove commit-before-publication, unchanged state on
  repository failure, and retry of a Pi candidate whose first commit failed;
- Chromium and WebKit prove create -> Home -> reload -> reopen, decision
  continuity, v2 follow-up continuity, and cross-page stale rejection;
- the existing B0a/B0b credential sentinel scans every durable store and still
  finds no key; and
- the ordinary initial graph contains the Program repository Worker but still
  excludes Pi, provider, OPFS, workspace runtime, and Wasm assets.

P2-B0 does not yet close all of P2. P1 terminal Agent-run receipts remain P2-B1
because the current Agent facade needs one bounded product receipt identity and
terminal projection before failure/cancel/replacement can be stored without
copying Pi lifecycle state. P2-B0 also excludes credential/profile persistence,
a general Provider UI, Pi session references, attachments, OPFS, workspace
identity, filesystem bytes, artifacts, snapshots, tool receipts, export/import,
quota dashboards, `navigator.storage.persist()` policy, SQLite, and Desktop
parity. Those remain separate slices with real consumers and target evidence.
In particular, P2-B0 does not rename its Program catalog a workspace volume or
pull P3 forward.

P2-B0 closed on 2026-08-27. One shared memory/IndexedDB conformance proves exact
create/revision/decision replay, immutable revision history, CAS, reopen,
schema/version admission, bounded capacity, quota/abort behavior, and detached
results. Typed Worker tests prove that a lost post-commit response becomes
`outcome_unknown` and that an invalid matching response terminates the transport
without hanging replacement. Focused product tests prove commit-before-visible
publication and exact retry/reconcile behavior. The complete SillyOS suite
passed 56 tests, and the eight-product-journey matrix passed all 16 Chromium and
WebKit cases, including accepted v1 reload/reopen, Pi-test v2 reload with fresh
credential setup, credential sentinel scanning, and two-page stale rejection.
The Browser build emits the Program repository as its own Worker asset while the
ordinary initial graph continues to exclude Pi/provider code. These results do
not activate P2-B1, P3, Desktop persistence, or any engine work.

#### P2-B1 — bounded terminal Agent-run receipts

P2-B1 is the next bounded Browser product slice. It extends the existing
Program repository only far enough to persist the terminal product meaning of
one submitted Creator run before P3 introduces real workspace effects. It does
not persist Pi messages, provider records, streaming deltas, tool-call payloads,
credentials, stack traces, mutable Agent phase, or Pi session files.

Before submit, the Creator controller allocates one product-owned `agentRunId`
that is unique within the Program and binds it to the exact `programId`,
`proposalId`, `baseProgramRevision`, and expected repository revision. The
transient adapter pairs that identity with Pi's `(sessionId, runId)` after Pi
accepts the submit; Pi identifiers remain lifecycle fences and never become the
durable primary key. Exactly one terminal projection may then be committed:

- `completed`, with the bounded final Creator reply and the exact admitted
  candidate reference that P0 may later apply;
- `failed`, with one admitted product diagnostic code;
- `cancelled`; or
- `replaced`.

The durable shape is one deliberate Program Repository schema V2, not a second
store or a general event log. The IndexedDB database version becomes 2 while
retaining exactly one `programs` object store with `keyPath: "programId"`, no
auto-increment, and no indexes. The exact aggregate changes from
`schemaVersion: 1` to `schemaVersion: 2` and adds only
`agentRunReceipts`, with at most 32 entries per Program. Every receipt has these
exact fields:

- `agentRunId`, `proposalId`, `userMessageId`, and nullable
  `creatorMessageId` use the existing 1–128-character identifier grammar;
- `sequence` is contiguous from 1, while `baseProgramRevision`,
  `baseRepositoryRevision`, and nullable `resultingProgramRevision` are positive
  safe integers;
- `outcome` is exactly `completed | failed | cancelled | replaced`; and
- `diagnosticCode` is null except for `failed`, where it is one value from the
  existing closed `CreatorAgentDiagnosticCodeV1` set. No diagnostic text is
  stored.

Each receipt's `userMessageId` must resolve to a `role: "user"` message whose
text passes the existing submit limit of 4,000 characters. A completed receipt
must resolve `creatorMessageId` to a `role: "creator"` message of at most 8,192
characters and set `resultingProgramRevision` to
`baseProgramRevision + 1`; all three other outcomes require both completed-only
fields to be null and leave the Program revision unchanged. Receipt IDs are
unique, sequences are contiguous, and references must resolve within the same
aggregate. The existing maxima of 96 messages, 96 Activity entries, 32 Program
revisions, and 512 KiB for the complete encoded aggregate remain hard limits;
crossing any one rejects the whole mutation.

Opening a fresh database performs `0 -> 2` and creates that one exact store. An
earlier preview database performs a deliberately destructive versionchange: it
deletes the old `programs` store without reading or admitting any row, then
creates an empty exact V2 store. This is a preview-data reset, not a migration.
All Program Repository V1 aggregate types, admitters, Worker wire shapes, memory
implementations, fixtures, and tests are replaced in the same slice; none remain
as compatibility code. Upgrade failure or a blocked connection leaves no
claimed success, and database versions newer than 2 still fail explicitly.
Runtime code and Worker wire admit and return only aggregate V2.

For `completed`, one repository transaction appends the terminal receipt while
performing the existing admitted `applyRevision` transition, so the final
Creator reply, successor Program/proposal, messages, and Activity become durable
together. It does not store a second copy of the candidate or a durable
completion that points at an unapplied successor. For `failed`, `cancelled`, or
`replaced`, the transaction atomically appends the submitted `role: "user"`
message, the receipt, and one bounded Activity projection. It appends no Creator
message and does not change the Program or proposal revision. Thus every
`userMessageId` resolves without introducing a separate pre-submit durable
start state.

Every mutation runs under the existing Program CAS. Duplicate delivery of an
identical `agentRunId` and terminal value is unchanged; a different terminal
value, cross-Program identity, stale base, or mismatched candidate is rejected
as a whole. The controller publishes terminal success only after transaction
completion. A lost response becomes `outcome_unknown` and is reconciled by
loading the exact Program aggregate rather than resubmitting the Agent run. A
replacement or cancellation remains terminal even when its late Pi records are
correctly fenced from the current UI.

P2-B1 acceptance is:

- repository conformance proves fresh V2 creation, destructive reset of an old
  preview catalog to an empty V2 store without reading or retaining its rows,
  blocked/newer-version behavior, and V2-only runtime admission; a structural
  check finds no retained Program Repository V1 aggregate/admitter/wire path;
- focused port/controller/repository tests cover completion, provider failure,
  cancellation, replacement, duplicate delivery, stale CAS, and post-commit
  lost-response reconciliation;
- reopen restores the exact terminal receipt and bounded Activity projection
  without reconstructing a Pi session or a transcript;
- the existing credential sentinel still finds no key or provider-auth value in
  any durable store, exportable record, URL, or log; and
- Chromium and WebKit prove one completed run and one cancelled or replaced run
  across reload, while the initial graph still excludes workspace, OPFS,
  just-bash, and Wasm assets.

P2-B1 closes P2. It does not store workspace generations, file mutations, tool
receipts, or snapshots; those first gain a real owner and consumer in P3a and
P3c.

P2-B1 closed on 2026-08-27. Program Repository V2 is now the only repository
aggregate, memory adapter, IndexedDB schema, and Worker wire. IndexedDB performs
fresh `0 -> 2` creation or a row-blind destructive `1 -> 2` preview reset. One
atomic `settle_agent_run` mutation covers completed, failed, cancelled, and
replaced outcomes under Program CAS and exact replay; Pi session/run identities,
provider records, streaming data, credentials, and workspace bytes remain
transient or absent. Focused product tests pass 75 cases; Chromium and WebKit
pass all 18 SillyOS journeys, including completed and cancelled receipts across
reload plus the credential sentinel. The one-shot live OpenAI qualification also
passes in both engines with cancellation, a v2 successor, two successful
Responses requests, no durable key, and explicit Worker forget. The release
build keeps the Pi port and Worker in lazy assets and contains no Workspace,
OPFS, just-bash, or Wasm asset. No SillyMaker engine gap was reproduced.

### P3a — Pi-native workspace tool binding

P2-B1 has closed the bounded product terminal Agent-run receipt needed by P3a's
first real tool consumer. P3a remains inactive until the owner explicitly
activates that next slice.

Use the fixed Pi 0.84.3 workspace tools rather than adding a SillyOS equivalent.
The Browser Agent Worker imports Pi's shipped `createReadTool`,
`createWriteTool`, `createEditTool`, and `createBashTool`. A tiny binder turns
each five-argument harness tool into an ordinary `AgentTool` by supplying one
stable, Program-scoped `{ env: ExecutionEnv }` context. Pi therefore continues
to own tool names, schemas, argument preparation, validation, file-edit
algorithms, truncation, updates, cancellation inputs, and model-visible results.
The existing `sillyos_propose_program_revision` tool remains a separate
product-domain capability; it is not replaced by a workspace primitive.

The Browser keeps using the mature low-level Pi `Agent`. Pi 0.84.3's
`AgentHarness` has useful types and factories but its run/lifecycle operations
remain an unimplemented scaffold, so SillyOS neither depends on it nor fills in
its missing Agent behavior. The Desktop companion retains the complete fixed
coding-agent and later routes its same-named built-ins through Pi's public
`ReadOperations`, `WriteOperations`, `EditOperations`, and `BashOperations`
factory/SDK operation hooks. Those hooks are not `ExtensionAPI` overrides. A
Desktop workspace provider therefore requires a programmatically constructed,
fixed companion tool set through that public surface, or another specifically
proved public coding-agent integration route. Product-specific Agent tools
remain the separate `ExtensionAPI.registerTool()` case. Shared product semantics
and conformance do not require the two targets to import the same physical
wrapper.

`WorkspaceRuntimePort` is the eventual product owner of provider choice,
execution lifecycle, generations, the change journal, capability state,
persistence, teardown, and terminal receipts. Its Pi-facing projection is the
public `ExecutionEnv = FileSystem + Shell`; the port does not receive a tool name
and re-dispatch admitted tool arguments. P3a-B0 implements only open/close, one
sequential call scope, generation preflight, volume effects, and one terminal
mutation receipt. Provider selection, persistence, and broader capability
composition stay in their later phases.

Pi does not pass a tool-call identity into `ExecutionEnv` primitives. The tiny
binder therefore wraps the whole native `tool.execute(...)` invocation in a
product call scope containing exact Program/Workspace identity, expected
generation, admitted `(sessionId, runId, toolCallId)`, cancellation, and bounded
cwd/env. The stable environment owner resolves that current scope internally
for each filesystem or shell primitive, waits for its effects to quiesce, then
settles the final mutation receipt before the scope closes. Initial execution is
strictly sequential: nested or concurrent scopes are rejected. This keeps the
same `ExecutionEnv` object identity for Pi's mutation queue without changing
Pi's params or result shape. A later Worker or BYO Sandbox adapter transports
the scoped environment primitives, not a generic tool call.

The same stable `ExecutionEnv` instance is reused for one open Workspace so
Pi's per-environment, per-path mutation queue remains effective. The first
surface additionally selects sequential Pi tool execution until shell mutation
and Workspace lease concurrency have independent evidence. Directory
containment, symlink policy, temp-file ownership, and absence of ambient Host
fallback are execution-environment responsibilities. A possibly mutating
terminal receipt is reconciled even if the originating Agent run is no longer
current; discarding it would hide real file effects.

One known Pi-side limitation remains bounded rather than hidden: the 0.84.3
agent-core `read` tool currently obtains the complete file with
`readBinaryFile()` before applying offset/truncation. P3a-B0 therefore admits a
small-file ceiling. If a real large-file product corpus exceeds it, reproduce
the issue against neutral Pi `ExecutionEnv` conformance and hand an incremental
read requirement to Pi; do not replace the native tool or modify SillyMaker.

The deliberately bounded first implementation slice, **P3a-B0**, is Browser
only. It supplies one deterministic disposable Workspace volume and stable Pi
`ExecutionEnv`, binds only Pi's shipped `write` and `read`, and proves a real
write/read artifact round trip, native Pi schemas/results, stale-generation
preflight, cancellation, one terminal mutation receipt, and whole cleanup. It
does not add a custom workspace tool, OPFS, just-bash, Wasm, Git, Python,
extension discovery, persistence, or a Linux/sandbox claim.

The following **P3a-B1** completes the default Browser execution-tool surface:
bind Pi `edit`, then bind Pi `bash` with a just-bash-backed `Shell.exec` over a
second thin filesystem adapter to the **same** disposable volume. It proves
exact edit results, cwd/env mapping, pipelines/redirection, terminal
stdout/stderr/exit status, timeout/abort mapping, bounded output, and truthful
capability flags. just-bash's public call returns terminal aggregate output, so
this slice does not claim live shell streaming, PTY, background jobs, process
trees, Git, Tar, Python, or Linux. Non-cooperative future custom/Wasm commands
must run in an owned terminable Worker before stronger cancellation can be
claimed. P3a closes only after B0 and B1; durable bytes remain P3c.

`AGENTS.md`, skills, and prompts in the workspace volume remain inert data in
P3. P3b characterizes and P3c persists their bytes; neither phase activates or
interprets them. P4 may qualify a target-appropriate public Pi resource route:
Browser can supply admitted resources through proven Agent inputs, while
Desktop may use companion-controlled, read-only materialization of one exact
workspace generation or another supported prompt/context hook. Neither route
creates a SillyOS skill loader. Executable extension modules are different:
only build-known, version-pinned product dependencies may execute.
Agent-writable TypeScript inside the volume is never loaded as a Pi extension in
either target.

### P3b — Workspace execution provider research gate

Characterize physical execution providers before choosing the persistent
denominator: one logical environment per open Program Workspace, a persistent
volume as the working tree and unified owner of inputs, outputs, temporary
files, and file-resident data, familiar shell behavior, pipes/redirection,
declared process/cancellation semantics, `grep`/`rg`, Git, Tar, optional CPython
and QuickJS, and the same P3a product lifecycle/receipt contract in Browser and
Deno Desktop. This is a workspace execution capability profile, not a blanket
Linux promise; putting every part inside Wasm is neither required nor assumed.

Emscripten remains a preferred toolchain/control for individual programs and
JavaScript/filesystem interoperability, not an assumed Linux container. It
does not itself supply a Linux kernel, general `fork`/`exec`, job control, or a
multi-process shell. A conforming runtime may combine TypeScript commands,
several Wasm modules and workers, or a target-native companion while still
presenting one logical workspace instance and one filesystem authority.

The three provider roles remain explicit:

```text
WorkspaceRuntimePort
  -> Browser Local: VFS/OPFS owner + just-bash Shell + optional Worker/Wasm commands
  -> Desktop Native: fixed Pi companion + admitted native volume/processes
  -> BYO Sandbox: typed HTTPS/WSS RPC + provider-declared filesystem/shell capabilities
```

just-bash is a Browser Local facade, not a mandatory hop in front of Desktop or
BYO Sandbox. A remote provider receives coherent environment operations and
executes its own declared shell; SillyOS does not split one pipeline across a
local just-bash parser and a remote process host.

The research compares just-bash as a Browser-capable shell/control,
agent-sandbox as a Deno-native Wasmtime control, an individual Emscripten/WASI
tool payload, WASIX/Wasmer, BrowserPod, CoWasm, and bounded full-Linux/emulation
references using one command/filesystem/persistence corpus. Pyodide and QuickJS
are evaluated as optional language payloads inside or beside the selected
workspace, not as proof of a Linux process substrate. WebContainers is a
process/filesystem UX reference, not a presumed Browser-and-Deno or Python
solution.

BrowserPod receives the first full-environment characterization because its
client execution, shell, Git, and per-key disk are closest to this shape. It
remains a P3b evaluation rather than the P3a Pi-tool backend: the current runtime
is proprietary, ordinary plans are API-key/token metered and not self-hosted,
and the public process API does not yet prove dependable cancellation or
process-tree termination. The exact licensing, target, persistence, and semantic
gates live in [WASM-WORKSPACE-RESEARCH.md](./WASM-WORKSPACE-RESEARCH.md).

No persistent provider denominator is selected until Browser Local and Desktop
have evidence for startup, command semantics, persistence/reopen, cancellation,
output bounds, filesystem isolation, representative repository operations,
bundle/memory cost, and license/distribution fit. BYO Sandbox is independently
qualified against the same applicable conformance; it is not required for the
local product to ship. Network is initially absent; remote Git, package
installation, credentials, and arbitrary outbound access require a later
explicit broker/capability decision. No implementation substrate is advertised
as a security sandbox without a stated threat model and executable boundary
tests; WebAssembly alone is not such evidence.

### P3c — selected persistent workspace denominator

Only after P3b selects a viable target pair, connect the winner to the P3a port
and prove one real Pi session can create an artifact, inspect it, cancel a
running command, dispose the runtime, reopen the volume, and observe identical
acknowledged bytes. The required initial command denominator is local-only Bash
or an honestly smaller shell, `grep`, Ripgrep, Tar, and local Git operations.
Unsupported PTY, job-control, signal, symlink, or permission behavior must be
declared rather than approximated invisibly.

P3c gives each Program its durable workspace volume. The volume is the sole
owner of mutable working-tree and artifact bytes: sources, `.git`, generated
files, file-resident application data, `AGENTS.md`, skills, and prompts. The
product database owns only admitted artifact metadata/references/receipts and
accepted workspace snapshot references. Git history may be useful evidence
inside the volume, but a Git hash is not by itself the Program authority.

Target topology is allowed to differ behind the same contract. In Browser, a
product-owned Workspace Host Worker owns the origin's OPFS volume, and the Agent
Worker reaches it through a direct typed MessagePort tool channel without
routing calls through React state. IndexedDB owns only catalog/recovery metadata,
not a duplicate tree. In Deno Desktop, the companion may invoke a local runtime
adapter over an admitted native directory or runtime-owned volume. The targets
share logical operations and conformance, not necessarily one SDK or physical
storage implementation.

Every workspace-backed proposal review envelope adds
`baseAcceptedProgramRevision` and `expectedWorkspaceGeneration` to the existing
proposal identity and proposed Program revision. The reviewed preview and diff
derive from that exact generation. On accept, the volume owner atomically
creates and durably flushes an immutable snapshot only if that generation is
still current, then returns an opaque reopenable snapshot receipt. One product
database transaction rechecks the complete pending envelope and publishes that
receipt. Database failure leaves a recoverable orphan snapshot; database
success requires that the snapshot remain reopenable. A later tool write makes
the pending decision stale as a whole and can never add unreviewed bytes at
click time.

Browser P3c implements Pi agent-core's public `ExecutionEnv` over the selected
volume and shell provider so Pi retains its native tool schemas and result
shapes. Desktop uses the fixed coding-agent's public `ReadOperations`,
`WriteOperations`, `EditOperations`, and `BashOperations` where its companion
needs remote or isolated effects. These are public tool-factory/SDK operation
hooks, not `ExtensionAPI` overrides; the selected Desktop route must prove a
programmatically constructed fixed companion tool set or another supported
public integration path. A product-private lifecycle/receipt adapter remains
only around those Pi seams where Program identity, generation, or a real target
mismatch requires it; it does not become a parallel tool API.

CPython and QuickJS join the runtime only when the first real product uses them
and their startup, memory, file semantics, cancellation, and distribution cost
pass the same target corpus. They remain scripting payloads, not proof that the
surrounding runtime is Linux. This phase does not enable package installation,
remote Git, guest networking, or workspace-authored executable Pi extensions.
Agent-generated code is untrusted relative to companion credentials, the
product database, Host APIs, and other workspaces; P3c must enforce and test its
bounded volume/compute/memory/output/no-network capability before any sandbox
claim.

### P4 — Pi extension composition and OpenUI mapping

Generalize only after Pi, storage, and the P3 tool are real consumers. A reviewed
Program revision selects a closed, version-pinned set of Pi capabilities,
skills, prompts, models, and enabled tool names. Browser composes public
`AgentTool` values and admitted resources directly; Desktop maps the same
capability cores through its proven extension/resource route and Pi tool
allowlists. Availability is reported truthfully per target. Pi remains the only
Agent capability registry and lifecycle owner; SillyOS does not build a
parallel plugin loader, dependency solver, tool dispatcher, or session runtime.

When a real Program needs generated UI, a named Pi extension tool may return one
complete OpenUI document. A product-private adapter first admits the whole
document and translates only its supported component/prop/action subset into an
ordinary candidate for the workspace-private `@sillymaker/agent/internal`
UiArtifact path. That existing path then performs its own closed admission,
revision/currentness handling, rendering, and UiIntent admission. The renderer
never parses OpenUI and OpenUI types never become the engine artifact contract.

The current private UiArtifact vocabulary is exactly
`column`/`text`/`action`; it is the initial closed denominator, not a complete
OpenUI component system. A product authority rechecks the admitted UiIntent,
exact artifact receipt, Program revision, and relevant workspace generation
before mutation. Partial OpenUI is inert. No generated action directly calls a
tool, mutates the database, opens an arbitrary component, or becomes executable
source. A real Program that needs another generally useful UI component supplies
the neutral second-consumer evidence for an engine handback; SillyOS does not
build its own dynamic component registry around the gap.

The capability view projects these real Pi and UI bindings; it is not another
runtime. The first lane uses only build-known extensions shipped with SillyOS.
Broader Pi Package installation, a marketplace, and post-release arbitrary code
remain separate product/distribution decisions. No public SillyMaker Mod,
Agent, Program, or plugin ABI is introduced.

Complete Browser/Desktop Extension API parity is explicitly deferred. Browser
does not emulate Pi's Node/TUI/CLI/exec extension surface. If a later Program
needs an extension event that cannot be expressed by the shared capability core
plus public browser `AgentTool`/Agent inputs, that is an upstream Pi capability
request backed by the real consumer, not permission to create a second runtime.

### P5 — translation Program

Make translation the first complete product consumer. Its denominator is one
real import-to-export journey: ordered source units, one-to-one mapping,
language pair, glossary and placeholder/tag constraints, bounded batching,
resume after committed batches, editable target text, discovery-oriented QA,
explicit human review, and format-preserving export. Translation owns concrete
domain records and artifacts; it is not a demo skin over a generic Creator
framework.

Only shared boundaries reproduced by this product may graduate into the P4 Pi
extension and UI mapping. Startup, bundle, memory, and long-project evidence are
measured on real representative data without vendoring a reference product.

### P6 — writing Program

Add a complete writing journey with a brief, outline, manuscript sections,
revision decisions, and export. Writing reuses proven Program/session/storage/
tool contracts but owns its artifact package and editorial workflow. It does
not force translation's segment model into a universal content schema.

### P7 — role-play Program

Add a complete role-play journey with a world contract, characters, scenario,
append-only run events/transcript, materialized current branch state, explicit
human interventions, and restart/export. Source lore, rebuildable projections,
and current branch state remain distinct. Role-play does not begin by adding a
public SillyMaker plugin API, unbounded Pi Package installation, a graph
database, a prompt-combinator framework, or multiple scripting languages.

### P8 — product closure

Reconcile the semantic table in [DESIGN.md](./DESIGN.md) against real
implementation. Qualify Browser and Deno Desktop startup, recovery, persistence,
backup/restore, cancellation, accessibility, responsive behavior, final module
graphs, representative scale, and packaging. Each additional OpenUI component,
action family, or product family requires separate evidence after the fixed
product journeys are sound.

## Stop and handback rules

Stop the product lane and hand a finding to the main SillyMaker engine task only
when a general GUI capability fails in a neutral reproduction outside SillyOS.
The report must identify the current public contract, minimal reproduction,
both target effects, and why a product-local Host/React solution is insufficient.
SillyOS does not modify engine APIs while that evidence is absent.

Also stop a phase rather than broadening it when it would require any of the
following:

- a second authority for Program or database state;
- renderer access to raw Pi, SQLite, host filesystem, or guest implementation
  objects;
- unversioned or unvalidated external data;
- Agent output mutating product state without an exact admitted receipt;
- a fake readiness, durability, tool, translation, writing, or role-play claim;
- a public SillyMaker Mod/Agent/Program/plugin ABI or arbitrary generated-code
  execution (explicit pinned Pi extensions are the selected Agent mechanism);
- a generic framework justified only by a hypothetical later product.

Verification remains proportional: focused contract tests for authority and
currentness, one real interop smoke for each external boundary, repository
conformance for both storage adapters, and the existing visual matrix only when
a phase changes user-observable layout or interaction. A phase is not rerun
through unrelated suites merely to accumulate green output.
