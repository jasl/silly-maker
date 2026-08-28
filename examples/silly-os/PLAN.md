<!-- SPDX-License-Identifier: MIT -->

# SillyOS product-incubation plan

Status: accepted Browser-first, dual-target product lane with validated P0,
P1-B B0a/B0b, P2, P3a-B0, and all three P3c-B0 checkpoints plus a dev-only Pi
launch helper, 2026-08-27. P2-B0 delivered the product-owned
IndexedDB Worker and exact Program catalog; P2-B1 then delivered Repository V2
plus bounded terminal Agent-run receipts. P2 is closed. P3c-B0 checkpoint 1
replaced P3a's disposable byte owner with the exact OPFS authority/cold-reopen
contract; checkpoint 2 delivered recovery/contender semantics, storage policy,
and the automated Chromium/persistent-WebKit `20 MiB+` scale gate. Checkpoint 3
delivered canonical portable ZIP download, cancellation, bounded Host-resource
ownership, and dual-engine byte evidence, so P3c-B0 closed on 2026-08-27. The
bounded P3a-B1 sequence then delivered fixed Pi's native `edit` and `bash` over
that same authority in two independently reviewed checkpoints. Checkpoint 2
uses exact `just-bash@3.4.2` only as the bounded Browser Local shell inside the
Host Worker, so P3a also closed on 2026-08-27. P3c-B1 checkpoint 1 then
delivered the Browser Workspace Host's bounded immutable snapshot candidate and
cold-reopen contract on 2026-08-27. The owner continued the lane that day;
checkpoint 2's bounded Host publication-lifecycle slice (C2a below) is now
delivered and independently reviewed. C2b then delivered Repository V3,
physical IndexedDB V4, and Worker wire V4; C2c atomically selected that schema
through one application-owned Repository/Host Authority shared by Controller
and fixed Pi. Both passed independent review on 2026-08-28. Checkpoint 3 then
delivered accepted snapshot identity/head presentation, truthful live-head
divergence, winner-held stale rejection, cold reopen, and exact retained-package
evidence in Chromium and persistent-profile WebKit. Both engines verified the
existing `1,001`-file / `21,897,216`-byte corpus inside a `22,065,863`-byte
immutable ZIP, so P3c-B1 closed on 2026-08-28. The committed cutover
was rebuilt from the name-only deployment commit
`60bbb4f559a001e59a4e470e30a7f4808d440ce3` and deployed that day to
`https://silly-os.jasl9187.workers.dev` as Cloudflare version
`919cb0a4-d510-452a-b73d-79070ec8e35e`. The public origin returned HTTP 200,
completed a fresh Creator Home -> durable Program workspace smoke without page,
console, or request errors, and passed the fixed OpenAI qualification in both
Chromium and persistent-profile WebKit. P1-D remains owner-paused, while P3b,
import, and later slices remain inactive. On 2026-08-28 the owner activated
P1-B1 as the next bounded Browser slice. B1a has now delivered the clean
replacement of the fixed query-only OpenAI profile with a Pi-owned
Provider/model catalog, SillyOS-owned Settings, and ordinary-route selection of
the exact qualified OpenAI profile. Its local release gate passed 265 product
tests, the ordinary Settings journey in Chromium and persistent-profile WebKit,
and the real OpenAI stream/tool/cancel/currentness/Forget qualifier in both
engines. B1b's named direct-Provider qualification was accepted next but was not
activated by B1a closure; the owner's later explicit order activated it without
bringing broader endpoint and credential behavior in by implication.
The clean B1a implementation commit
`66eb6755b04d3d625830dbbe915c465886ba13dc` was then deployed to the canonical
origin as Cloudflare version `28022baa-1676-4c79-a194-85d95e5f326d`. The public
HTML reported that exact commit, HTTP 200, and the B1a OpenAI-only
`connect-src`; the application browser loaded all 40 Pi Providers with OpenAI
qualified and Anthropic still a candidate and logged no errors. The same public
origin then passed the real Chromium and persistent-WebKit qualifier with the
same cancel/v2/HTTP-200/durable-key-absence/Forget receipts, so B1a's release
operation is also closed.
The owner then explicitly activated B1b: qualify the five named direct HTTPS
profiles through Pi, add only their exact official origins to the static CSP,
and keep every profile disabled unless its own deployed dual-browser gate
passes. This does not activate arbitrary endpoints, OAuth, relays, or B1c.
The current local B1b gate promotes exact Anthropic
`claude-sonnet-4-5-20250929`, Google `gemini-2.5-flash`, DeepSeek
`deepseek-v4-flash`, and xAI `grok-4.3` profiles after all ten real Pi journeys
passed Chromium and persistent-profile WebKit. Each journey first observed a
readable invalid-credential 4xx and the bounded durable `run_failed` mapping,
then proved cancellation, exact v2, currentness, key absence, and actual Worker
termination. It also corrected SillyOS's
cross-Provider use of Pi to the neutral `toolChoice` values `auto` before the
proposal tool and `none` afterward; the earlier OpenAI-specific `required`
literal was invalid for Anthropic. The Anthropic mutable alias remains a
candidate. OpenRouter `google/gemini-2.5-flash` also remains disabled because
both the Browser path and a direct minimal request with the current account/key
returned HTTP 403 for Provider Terms of Service; that is not recorded as a CORS
failure. B1b closed on 2026-08-28 with that OpenRouter tuple retained as a
disabled candidate: the named profile was evaluated through the same gate, and
an account/Provider rejection is not a reason to hold the product lane open or
to mislabel the route as Browser-qualified.
The current local release gate passes 27 files / 270 product tests, the Settings
journey in both engines, and the complete 5-profile × 2-browser real-Provider
matrix.
The clean B1b implementation commit
`d7377ad36f27b982c8d6f87662e8a8586687f721` is now deployed to the canonical
origin as Cloudflare version `92c143f7-292f-474f-b7ad-ba98318a384a`. Public HTML
returns HTTP 200, that exact build identity, and only the six named Provider
origins under `connect-src`; the application browser shows five exact qualified
profiles and the two intended candidates. All ten public-origin real-Provider
journeys pass. The deployment gate and B1b are therefore closed. The owner then
activated B1c as bounded Provider/settings checkpoints. The model-preference
part is implemented in the current dirty overlay, but the owner subsequently
accepted the Browser security and execution boundary below. B1c-S0 is now
closed locally: the matching WebKit production-response smoke completed on
2026-08-28 after the already-passing source, build, Wrangler-response, and
Chromium gates. **S1a-0 is the only active checkpoint.** B1c remains undeployed;
earlier B1c Provider counts are dated evidence for their pre-security snapshot
and do not by themselves accept the current overlay. This lane
still does not add OAuth, multi-field cloud credentials, a Provider relay,
public HTTP/LAN access, arbitrary headers, or a second Provider runtime, and it
does not claim real custom-endpoint qualification until an exact custom route
passes the later deployed-origin gate.
The raw launcher is not the typed product RPC; the live Browser route is a
separate product path. This plan remains local to `examples/silly-os`; the
neutral async GUI disposer was delivered separately by the engine task and is
consumed here without adding a SillyOS- or Pi-specific engine API. The
implementation baseline before P0 is commit
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

At most one phase below is active at a time. P1-B1a, P1-B1b, and B1c-S0 are
closed locally. B1c's Provider/model UI remains an undeployed local
implementation, while **S1a-0 is the active product checkpoint**. A later phase
may be refined before it starts, but it may not
silently weaken this product model or claim evidence that an earlier phase did
not produce. Product code may not import the ignored `references/` checkouts.

Until the first stable release, every phase also follows DESIGN's clean
replacement rule: breaking product-private contracts may reset preview data,
and the same slice deletes the superseded implementation, types, fixtures, and
tests. Do not retain compatibility shims, dual schemas, deprecated aliases, or
fallback behavior merely to preserve an earlier preview.

## Browser security and execution sequence

The owner accepted this sequence on 2026-08-28. It is the implementation order
for Browser credentials, Agent tools, Workspace execution, generated content,
and later product families. It keeps Pi as the only Agent/tool/plugin authority
and keeps every adapter in `examples/silly-os`; it does not activate a public
SillyMaker sandbox, Agent, Provider, or credential API.

### B1c-S0 — trusted control-plane floor (closed locally 2026-08-28)

S0 first records the three-plane trust model and prevents the current product
from widening an already-known same-origin boundary. Its deliberately bounded
implementation slice is:

1. replace the partial `connect-src` header with one complete enforced policy
   for the static control plane and selected Agent Worker: no wildcard,
   `default-src 'none'`, self-only scripts/styles/workers, no frames/objects/base
   retargeting, self-only form submission, ordinary `connect-src 'self'`, and
   exactly one selected HTTPS endpoint origin only on the Agent Worker;
2. remove product-authored inline script/style, add Trusted Types Report-Only,
   and add source/build regressions for executable-text sinks, raw generated
   HTML, data-controlled dynamic import, CSP fallback, and third-party runtime
   script;
3. keep keys session-only; preserve the strict non-secret Settings repository
   and add an explicit Workspace-protocol regression rejecting credential fields;
   retain the existing Program/volume/currentness and cross-volume tests;
4. fail closed for live execution: `pi_provider` receives the fixed Pi Agent and
   bounded Program-proposal tool but no `read/write/edit/bash` implementations.
   The product-owned deterministic fixture may temporarily retain the fixed
   legacy tool conformance; no live model, user plugin, project code, or imported
   code may use the same-origin Host; and
5. build the actual production artifact, inspect its HTML and response metadata,
   then run focused Chromium and WebKit behavior without calling a paid Provider.

The current source implements items 1–4. The neutral SillyMaker Vite
version-stamp gap was reproduced, repaired in the engine lane, and consumed
without a SillyOS build fork or weaker `script-src`: the production stamp is now
a same-origin external script loaded before the application module. The actual
`dist-web` artifact, `_headers`, local Wrangler responses, and Chromium product
smoke pass the S0 policy. The matching local-Wrangler WebKit smoke also loaded
the exact HTTP-200 policy, Creator Home, and Pi-owned Settings catalog with no
page error, failed request, or unexpected console error. WebKit emitted seven
expected Report-Only diagnostics for the deliberately non-enforced Trusted
Types policy; this keeps enforcement unpromoted rather than falsifying the
rendering/response result. S0 is therefore closed locally, not deployed.

S0 proves only the named response, rendering, protocol, secret-absence, and
fail-closed properties. It does **not** prove an independent Sandbox, physical
Workspace storage isolation, an encrypted Credential Vault, redirect handling,
complete XSS resistance, Linux, Wasm, Python, QuickJS, import/restore, or live
workspace tool behavior.

### S1 — independent-origin Workspace authority (active)

Choose and prove the smallest Browser topology that gives the Workspace runtime
its own origin and storage partition. The likely shape is an exact-origin
Sandbox document/worker owner with a closed bootstrap and transferred typed
channel, but the mechanism is selected only after Chromium/WebKit storage,
lifecycle, download, cancellation, and CSP evidence. The admitted capability is
bound to one exact `(programId, workspaceId, volumeId, workspaceSessionId,
generation)` and exposes no Product Repository, Credential Vault, DOM, cookies,
general host JavaScript, or ambient network.

Move the Workspace VFS, `/tmp`, snapshot/export owner, and tool-effect side of
`WorkspaceExecutionPort` to that origin. Then switch both deterministic and
live Pi runs to the new adapter and delete the superseded same-origin execution
path; pre-stable preview data may reset rather than introducing a migration
framework. Re-enable Pi's unchanged `read/write/edit/bash` schemas only after
the sandbox origin, cross-volume rejection, resource ceilings, cancellation,
crash recovery, and network-off policy pass in both browsers.

S1 is split into bounded checkpoints; only one is active:

1. **S1a-0 — topology qualification (active):** prove an exact-origin Sandbox
   document plus same-origin Host Worker, transferred typed control/environment
   channels, Sandbox-owned OPFS/snapshot/export/storage facts, network-off CSP,
   and Sandbox-owned download in Chromium and persistent WebKit. The ordinary
   product and live Provider remain fail-closed during this qualification; no
   same-origin fallback is added. A cross-origin OPFS, lifecycle, locking, or
   download failure is a stop condition, not permission to weaken the boundary.
2. **S1a-1 — read/write authority cutover:** make the qualified transport the
   only product default, reset incompatible preview data, retain Pi's native
   `read`/`write` schema and binder, and delete the same-origin Host path. Prove
   exact cold reopen, snapshot/export, volume/currentness, limits,
   cancellation, and crash recovery again through the ordinary product.
3. **S1b — remaining native tools:** admit Pi `edit`, then bounded `bash`, only
   after separate evidence. `just-bash`, Python, QuickJS, Wasm, network, import,
   and BYO Sandbox do not enter S1a.

### S2 — execution profiles and explicit capabilities

Run the existing bounded `just-bash` facade inside the Sandbox as the first shell
profile. It receives only the passed VFS and closed command implementations. Add
Python and then QuickJS as separately bounded, terminable one-shot runtimes only
after the four Pi tools are coherent; do not advertise Linux or a container.
Download, `git clone`, package retrieval, or any other network action remains
off until an explicit capability admits exact targets, byte/time/output limits,
cancellation, and receipts. Wasm may implement a runtime but never becomes the
Program or Sandbox contract.

### S3 — optional Credential Vault

Session-only remains the default. Persistent credentials activate only after
the complete CSP/Trusted Types/browser gates and a separate Vault threat model.
The Vault must provide explicit Remember, unlock, Lock, Forget, and Replace;
encrypt local ciphertext; keep plaintext inside the Credential/Agent boundary;
bind each credential to one immutable normalized endpoint; invalidate or
explicitly rebind on custom-endpoint changes; and reject redirect-following
credential transport. Investigate WebAuthn PRF/device verification first, then a
user-passphrase fallback, otherwise remain session-only. Never return a full key
or expose a generic credential-bearing fetch RPC.

### S4 — persistent Agent state and closed generated UI

Persist Pi-owned conversation/session state only through a proved Pi-compatible
repository or opaque reference; do not serialize a second SillyOS transcript
format. Add `UiArtifact`/OpenUI only as strictly admitted data mapped through a
closed SillyMaker component/action catalog. Generated HTML and application/code
preview execute only at the Sandbox origin, never in the control-plane DOM.

### S5 — BYO Sandbox, capability composition, and products

After the local Sandbox contract is real, admit a Bring Your Own Sandbox adapter
through the same `WorkspaceExecutionPort` and capability truth surface; do not
copy a provider-specific SDK into the product core. Then build translation,
writing, and role-play as Program capability compositions using fixed Pi
extensions/skills/tools plus closed SillyMaker/OpenUI UI mappings. They remain
generated Programs, not additional built-in apps.

## Current baseline and gaps

The committed P0 Creator Preview is a real responsive product shell backed by
one deterministic in-memory initial producer. B0a added a query-gated,
product-owned Browser Pi Worker behind a typed product facade: the real pinned
Pi Agent runs a deterministic provider and one bounded AgentTool, then offers
an exact P0 successor candidate for atomic publication. B0b historically added
a fixed query-gated OpenAI profile; B1a deleted that user-facing route and fixed
binder. The ordinary route now opens the product-owned Settings surface over
Pi's pinned catalog, persists compatible model checkboxes plus one preferred
model, and supports session-only Save/Test/Forget for built-in or bounded custom
HTTPS profiles. Creator Home still does not request the lazy Pi Worker chunks.
Live Provider runs can use only the bounded proposal tool; same-origin workspace
tools are withheld until S1. P2-B0 now adds a bounded Browser-local Program
database, durable exact Program revisions and decisions, and recent-Program
reload/reopen. P3c-B0 now adds one durable OPFS workspace volume, an exact
continuation anchor, a fresh Pi session over cold reopen, recovery/contender
semantics, explicit Browser storage state, the automated dual-engine
`21,897,216`-byte scale gate, and a canonical portable ZIP containing only its
manifest and VFS files. P3c-B1 now publishes one exact reviewed head as an
immutable accepted snapshot, keeps later mutable drafts independent, and shows
accepted/reviewed/current identity without making React a byte owner. The
product still has no persistent Pi session, import/restore, user-facing
accepted-snapshot download, WASM guest, independent-origin Sandbox, Credential
Vault, or generally active workspace capability. Its initial proposal, Source, translation rows,
remaining capability labels, and separate preview manifest remain explicit
preview material.

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

| Authority                                                                                                     | Owner                                      | Boundary                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Program identity, accepted revisions, proposals, decisions, and publication receipts                          | SillyOS product database                   | Product repository and typed product services                                                                                                                   |
| Creator Chat, live Pi-session binding, and review coordination                                                | SillyOS Creator supervisor                 | Session-local control plane plus bounded durable references/receipts; conversation is not Program content                                                       |
| Draft sources, `.git`, generated files, artifacts, file-resident product data, `AGENTS.md`, and skills        | One workspace volume per Program           | A product-selected `WorkspaceRuntime`; accepted Program state names an exact immutable snapshot                                                                 |
| Agent loop, session semantics, compaction, model/provider calls, tool dispatch, and Agent extension lifecycle | Pi                                         | Fixed `pi-agent-core`/`pi-ai` in Browser; complete fixed `pi-coding-agent` companion in Desktop; public Pi tool/extension contracts                             |
| `read`/`write`/`edit`/`bash` Agent schemas, validation, execution algorithms, updates, and results            | Pi                                         | Browser reuses the shipped agent-core factories after S1; only the fixed deterministic fixture retains legacy same-origin conformance today                     |
| Presentation-facing Agent transport                                                                           | SillyOS target adapter                     | Browser Worker or Desktop companion projects only admitted commands/events; raw Pi/provider records never enter React state                                     |
| Agent-side product functions                                                                                  | Pi plus pinned SillyOS capability adapters | One shared schema/prompt/handler core, registered as a Browser `AgentTool` or Desktop `ExtensionAPI` tool; no parallel Agent/plugin runtime                     |
| Workspace lifecycle, capabilities, generation, change journal, and terminal mutation receipts                 | SillyOS `WorkspaceRuntimePort`             | Product-private owner that supplies a stable Program-scoped Pi `ExecutionEnv`; it is not a second tool API                                                      |
| Workspace filesystem and shell effects                                                                        | Product-selected execution provider        | Browser target is an independent-origin Sandbox with VFS/just-bash; current same-origin Host is deterministic legacy evidence only; no Host-filesystem fallback |
| Pi session and provider credentials                                                                           | Target-local Pi owners                     | Browser Agent Worker owns an ephemeral key/session initially; Desktop owns isolated Pi session/auth storage; Program data holds no secret                       |
| Responsive presentation and application mounting                                                              | SillyMaker GUI contracts                   | React/UI components, input, focus, accessibility, responsive layout, and admitted UI interaction                                                                |
| Human approval and publication                                                                                | SillyOS Program authority                  | Exact proposal, base accepted revision, and reviewed workspace generation are rechecked before snapshot publication                                             |

Pi, product storage, workspace runtimes, and tool implementations are
infrastructure for Programs that need them. They are not optional desktop
icons. Agent-facing capabilities are real Pi extensions/tools selected by a
Program; SillyOS does not mirror them into another executable plugin system.

`WorkspaceRuntimePort` and Pi `ExecutionEnv` are orthogonal rather than
competing abstractions. The former is the eventual owner of a Program
Workspace's lifecycle, provider selection, leases, generations, persistence,
capability truth, and receipts; each phase implements only the fields with a
real consumer. Its Pi-facing execution projection satisfies the latter's
`FileSystem + Shell` contract. Cross-origin or remote typed RPC carries those
environment primitives and product call scope; it does not create a second
Agent/tool framework. After S1, Browser uses two thin adapters over one Sandbox
byte authority: Pi's filesystem adapter for `read`/`write`/`edit`, and
just-bash's `IFileSystem` adapter for commands invoked by Pi `bash`. The current
same-origin adapters are retained only by the deterministic fixture and must not
be mistaken for that target authority or create a second synchronized VFS tree.

SillyOS does not fork or browser-port `pi-coding-agent`. The fixed Pi 0.84.3
distribution already separates the useful shared runtime from the Node-oriented
coding product:

- Browser uses the public `pi-agent-core` `Agent` and `AgentTool` together with
  selectively imported `pi-ai` providers. After S1, it also reuses the shipped
  `createReadTool`/`createWriteTool`/`createEditTool`/`createBashTool` factories
  and host-abstract `ExecutionEnv`; a tiny product-private binder supplies the
  stable `{ env }` context without copying the tools' schemas or algorithms.
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

The one neutral engine gap reproduced by S0 is now closed and consumed:
SillyMaker's generic Vite tooling previously injected an executable inline
version-stamp script; the engine lane replaced it with a build-owned,
same-origin external asset that runs before the application module. SillyOS
keeps the general correction and adds no product-specific nonce/hash, copied
build pipeline, or Pi/SillyOS semantics to the engine.

All Program/Workspace semantics, Creator supervision, Pi tools and extensions,
provider keys, OPFS/VFS, just-bash, Wasm payloads, Desktop or BYO sandbox
adapters, persistence, receipts, and product workflows otherwise remain in
`examples/silly-os`. Any additional engine candidate still requires a minimal
neutral reproduction outside SillyOS, a second consumer, and evidence that a
product-local adapter is insufficient. The engine's private Mod Runtime is never
treated as the Pi plugin system, an execution sandbox, or a public ABI.

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

The accepted execution order is no longer the numeric subsection order:

1. P0, P1-B, P2, and P3a-B0 are delivered prerequisites.
2. **P3c-B0 delivered and closed 2026-08-27:** the already-proved Browser
   `read`/`write` workspace persists as a mutable OPFS checkpoint, cold-reopens,
   and exports as one bounded canonical ZIP.
3. Its independent checkpoint review is complete. No subsequent slice becomes
   active merely because B0 closed.
4. P3a-B1 (`edit`/`bash`) and P3c-B1 (exact accepted snapshot publication) are
   delivered and closed.
5. **P1-B1a delivered and closed 2026-08-28:** Pi-owned Provider/model
   discovery, one native Settings surface, and the exact qualified OpenAI
   profile clean-replaced fixed B0b on the ordinary Browser route.
6. **P1-B1b delivered and closed 2026-08-28:** five exact named direct-Provider
   profiles were evaluated through Pi and the deployed dual-browser gate; four
   joined OpenAI as qualified and OpenRouter remains a truthful disabled
   candidate.
7. B1c's Provider/model preference UI is implemented locally but has no current
   deployment claim.
8. **B1c-S0 closed locally 2026-08-28:** the trusted control-plane source,
   actual-build gate, local Wrangler headers, and Chromium/WebKit product smoke
   pass with Trusted Types deliberately retained as Report-Only. B1c remains
   undeployed.
9. **S1a-0 is active:** qualify the exact independent-origin Workspace topology
   and Sandbox-owned download before changing the ordinary product default.
   S2 execution profiles,
   S3 Credential Vault, S4 Agent/OpenUI state,
   S5 BYO Sandbox/products, P1-D, and broader import/artifact work require their
   named predecessor and separate acceptance; none is retroactively part of the
   closed B1a/B1b/P3 checkpoints.

This order replaces the earlier assumption that shell breadth or a shared
Browser/Desktop provider winner must precede useful Browser persistence.

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

The accepted Browser setup target is Bring Your Own Provider: the user supplies
either a technically compatible built-in Pi profile or a bounded HTTPS custom
endpoint. B0b deliberately implemented only fixed OpenAI Responses model
`gpt-4.1-nano`; B1a/B1b produced dated qualification evidence, while the locally
implemented B1c surface now projects compatibility and session-test results
without a model-quality allowlist. Those test results are optional point-in-time
diagnostics rather than an availability gate. Its custom profile is explicit rather than
guessed and minimally contains:

- Pi API family: `openai-completions`, `openai-responses`,
  `anthropic-messages`, or `google-generative-ai`;
- HTTPS `baseUrl`;
- `modelId`, context window, and output-token ceiling.

The API key is not part of that persisted profile. It is transferred from an
uncontrolled input to the Agent Worker only for the current configured session;
the session becomes usable after request-free Save without waiting for a
Provider diagnostic.

Pi still owns the actual provider stream. Browser compatibility is limited to
the credential/API/HTTPS shapes the product implements; CORS, account/model
permission, streaming, cancellation, and error behavior remain exact runtime
outcomes. Historical dual-browser qualification remains release evidence, not
the current model availability list. Pi supporting a provider on Desktop does
not by itself make that provider a Browser capability.

The API key necessarily exists briefly in the page's password input and browser
memory. The setup form therefore uses an uncontrolled password input and
transfers the value immediately to the Agent Worker. The key is memory-only by
default: it does not enter React state, a URL, logs, telemetry, HTML bootstrap,
the Program database, IndexedDB, OPFS, Cache API, exports, or downloads.
Forgetting credentials terminates and rebuilds the Agent Worker. This Worker is
an ownership boundary that reduces accidental propagation; it is not a defense
against same-origin script compromise or a privileged browser extension.
The bounded non-secret custom endpoint/model profile may persist in the
product-owned Browser Settings repository, but the key and latest connection-
test state do not.

The primary production route is a direct HTTPS request from the Agent Worker to
the user-selected compatible Provider. A custom HTTPS endpoint is conditional on its CORS,
preflight, streaming, cancellation, and protocol behavior. Public HTTP is
rejected as mixed content. `localhost` and LAN endpoints are not a cross-browser
baseline because mixed-content and local-network permission behavior differs.
Under S0, the document and catalog Worker use the complete self-only CSP. For
each admitted built-in or custom profile, the Cloudflare response layer validates
the canonical origin on the Agent Worker URL and gives only that Worker the one
exact selected origin in `connect-src`; no response uses a global `https:` wildcard.
This code has no deployment claim until the strict-CSP actual build and public
route pass their own evidence. A user-deployed relay remains a later explicit product;
SillyOS does not operate a general Cloudflare relay, because that would make the
product a key transit, SSRF, open-proxy, logging, and abuse boundary.

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

#### P1-B1 — Pi-owned Browser Provider settings (B1a/B1b closed; B1c UI local, S0 closed)

P1-B1 replaces B0b's fixed query-only profile; it does not preserve that
pre-stable user-facing route as a compatibility mode. Agent Creator remains the
only built-in user-facing program. Settings is an application control surface
for the Creator supervisor, not another Program. B1 selects the current live
supervisor's device/session execution profile; it does not yet publish that
choice into the Program-owned Pi profile/capability composition. Credentials
never become Program or Workspace content.

Pi 0.84.3 is the single Provider/model authority. The Agent Worker reads the
public Pi catalog and projects bounded display records over product RPC. React
does not import Pi, reconstruct Provider factories, copy model metadata, or
maintain a second Provider/model registry. B1a/B1b historically overlaid exact
`qualified`/`candidate` release evidence. B1c-C supersedes that runtime product
behavior: SillyOS now owns only technical compatibility, current profile,
credential lifetime, endpoint admission, optional session-test diagnostics, and
Settings presentation; it does not rank or approve model quality.

The current pinned catalog contains forty runtime Providers and 1,312 static
model records. That is discovery input, not forty Browser support
claims. Bedrock, Node-only OAuth, ambient cloud credentials, account-derived
origins, dynamic catalogs, and local HTTP endpoints remain unavailable or
unverified until their exact Browser route exists. Provider factories and
protocol SDKs remain build-known Pi imports in the lazy Agent Worker; bundle
and chunk evidence must show that opening Creator Home alone still does not
load Pi.

The first Settings information architecture deliberately borrows only the
useful shape of the read-only CherryStudio reference: Provider discovery and
Provider-specific models are one master/detail task, while selection of the
Creator supervisor's active model is a distinct setting. SillyOS keeps its own
chrome, spacing, colors, controls, focus treatment, and responsive contract.
Wide layouts may show navigation, Provider list, and details together; at
`767px` and below the same task becomes sequential full-width views with
44-pixel targets, not a compressed Electron three-column layout. Loading,
empty, failure, retry, candidate, key-saved, testing, ready, and forgotten
states must be visible and keyboard reachable.

Credential and profile ownership remain separate:

- an API key is read from an uncontrolled password input, transferred directly
  to the Agent Worker, cleared immediately, and held only in Worker memory;
- Forget terminates that Worker and makes the profile visibly disconnected;
  changing Provider or model also terminates it and requires the key to be
  entered again, rather than returning a retained key to React for rebinding;
- non-secret `(providerId, modelId)` and a later admitted endpoint profile may
  be device-local Settings data, but are never Program data;
- the first checkpoint may keep those non-secret choices session-local rather
  than modifying the just-closed Program Repository schema;
- keyless and multi-field Provider auth require their own admitted profile
  shape and are not forced through a fake non-empty API-key field.

CSP and CORS are independent gates. CSP can permit a destination; only the
Provider can permit the SillyOS origin to read its response. Pi has no Browser
CORS capability flag and no relay. A Provider is promoted only after the
deployed Cloudflare origin passes Chromium and persistent-profile WebKit for
preflight, authentication failure, first stream data, complete settlement,
the exact Pi tool call, cancellation/currentness, and bounded error mapping.
`mode: no-cors`, a Service Worker, or relaxing CSP cannot repair a failed CORS
response.

The accepted checkpoint order is:

1. **B1a — catalog, Settings, and clean OpenAI replacement — delivered and
   closed 2026-08-28.** Add a typed
   pre-credential catalog request to the lazy Agent Worker; render the full Pi
   Provider/model projection with truthful Browser status; add Settings entry
   points from Home and Workspace; select the one already-qualified Pi
   `openai/gpt-4.1-nano` profile while the rest of the Pi catalog remains
   visible but unavailable; and
   initialize the existing qualified OpenAI path from the ordinary product URL.
   Delete the user-facing `?agent=pi-openai` setup and fixed model binder in the
   same checkpoint. The deterministic `?agent=pi-test` route may remain solely
   as bounded internal qualification evidence. No secret or raw Pi record may
   enter React or durable storage.

   The delivered Worker projects Pi 0.84.3's 40 Providers and 1,312 model
   records before credentials exist, then terminates the catalog Worker. Only
   the exact OpenAI tuple can initialize. Home and Workspace share one
   responsive Settings surface with focus return, sequential mobile detail, and
   44-pixel mobile controls. The product-local Vite config prebundles the fixed
   Pi packages for a stable first lazy load while the production entry graph
   still excludes the Pi Worker/catalog/transport chunks. The final local gate
   passed 25 files / 265 Vitest cases, the fresh-dependency Chromium and
   persistent-WebKit Settings E2E, and the real OpenAI qualifier in both engines:
   cancellation retained v1, the next run used Pi's exact tool to publish v2,
   both completion requests returned 200, the durable projection contained no
   key, and Forget terminated the Worker.
2. **B1b — direct-Provider qualification (delivered and closed 2026-08-28).** Use Pi's own Provider factories and
   model stream for one named Anthropic, Google Gemini, OpenRouter, DeepSeek,
   and xAI profile apiece. Qualification is attached to the exact
   `(providerId, modelId, api, endpoint origin)` profile, not to every model
   beneath a Provider.
   Current CORS preflight from the canonical origin makes them candidates, not
   claims. Add their exact official HTTPS origins to the static `connect-src`
   allowlist and promote each independently only after the real-key dual-browser
   gate above. A failing candidate remains visible with an honest status and
   cannot silently fall back to OpenAI or the deterministic provider.

   The current implementation admits only five total qualified tuples: the
   already-closed OpenAI profile plus the fixed Anthropic snapshot, Google,
   DeepSeek, and xAI profiles above. Their readable invalid-credential 4xx,
   bounded `run_failed` mapping, real cancellation, exact v2 tool proposal, two
   successful completion requests, currentness, durable-key absence, and
   Worker-termination journeys pass in Chromium and persistent WebKit. The
   static CSP names only self plus the six exact Provider origins under B1a/B1b.
   Anthropic's mutable alias and the tested OpenRouter tuple remain disabled
   candidates; OpenRouter's current 403 is an account/Provider outcome, not
   evidence that CSP or CORS failed. The generic qualifier reads the exact
   profile's environment key without printing keys, request headers, request
   bodies, or URLs and defaults to the five qualified tuples. The same ten
   journeys pass from the committed canonical Cloudflare deployment, whose
   response header carries only the exact six-origin CSP.
3. **B1c — request-free credential configuration, optional connection
   diagnostics, and custom HTTPS profiles
   (locally delivered; deployment gate open).** Deliver it as two reviewable
   checkpoints rather than treating a settings form as proof of arbitrary
   Browser compatibility.

   **B1c-A — truthful built-in connection surface.** Move Connection before the
   long model catalog. For an admitted single-key Provider route, render the
   initial Pi model's actual `baseUrl` as a read-only endpoint, an uncontrolled
   memory-only API-key field, a request-free **Save key** action, and a separate
   repeatable **Test connection** action. Save transfers the key to a fresh
   Worker, completes local Agent RPC/session initialization, and makes every
   enabled model in that Provider/base-URL credential scope usable without
   calling the Provider. Test is optional and
   sends a tiny, potentially billable model request through Pi's own
   `Provider.streamSimple`; every invocation sends a new request because each
   success or failure is only point-in-time diagnostic evidence. Neither result
   grants nor revokes Agent Creator availability, and it never certifies sibling
   models. A failed diagnostic retains the Worker/key and usable Agent session
   for ordinary calls, another test, or replacement, while saying to check the
   key, model, endpoint, account permission, and Browser access rather than
   falsely diagnosing every opaque fetch failure as a bad key. Unavailable OAuth,
   ambient, keyless, and multi-field profiles such as Bedrock remain inspectable
   but do not receive a fake API-key form. Creator Home shows one keyboard-
   reachable API-key warning exactly while the Worker holds no credential; the
   whole warning opens Providers. Home creation and Program follow-up reuse
   one credential-bound composer model picker, including its keyboard behavior,
   model-settings footer, and focus return. A retained credential with no
   enabled in-scope model leaves that picker empty and required without showing
   the API-key warning. Stable Provider/key status and Forget are Settings concerns, not
   chat cards; the workspace may show only transient run feedback and Cancel.

   The exact B1a/B1b qualification matrix remains historical release evidence,
   not a runtime model allowlist. B1c-C below removes the pre-stable
   `qualified` / `candidate` model overlay instead of preserving it as product
   compatibility behavior.

   **B1c-B — one bounded custom profile shape.** Separate **Built-in Providers**
   from **Custom Endpoints** and admit a stable profile id, display name, one of
   the explicit Pi API families `openai-completions`, `openai-responses`,
   `anthropic-messages`, or `google-generative-ai`, a normalized HTTPS base URL,
   one model id, and declared context/output ceilings. The first slice is
   single-key, text-only, standard-protocol behavior; it does not expose Pi's
   full compatibility/header matrix. Never infer protocol from a URL. Pi's
   public custom-provider/API adapters own payload, auth-header, stream, error,
   and later Agent behavior. A successful probe is only **a passed diagnostic in
   this browser session**, not a use prerequisite or SillyOS qualification
   across browsers.

   Persist only the bounded non-secret profile in a versioned product-owned
   Browser Settings repository; never persist or return its key. Add a small
   Cloudflare static-asset response layer that validates the canonical endpoint
   origin carried only by the Agent Worker URL and replaces that Worker's CSP
   with the exact selected `connect-src`; the default document policy is not
   widened to `connect-src https:`. The origin is non-secret deployment
   metadata, while Provider traffic and keys remain direct
   Browser-to-Provider. Reject URL credentials, query/fragment-bearing base
   URLs, and public HTTP. Browser failures may truthfully distinguish a readable
   auth/status response from a protocol response, but an opaque network failure
   stays the bounded generic `connection_failed` result in this slice; CSP
   cannot repair Provider CORS. A relay, OAuth service, shared key, arbitrary
   headers, and HTTP/LAN bypass remain separate explicit products.

   Acceptance requires mutation-sensitive admission/repository/Worker tests;
   Settings and Home component tests; Chromium and persistent-WebKit responsive,
   keyboard, key-absence, Save-with-zero-Provider-I/O, immediate post-Save use,
   credential-keyed warning behavior, optional test pass/fail without
   availability changes, custom-profile reload/removal, and Worker-termination
   journeys; a production build whose ordinary entry still excludes Pi;
   Cloudflare response-layer tests proving one exact selected origin and no
   `https:` wildcard; and a deployed-origin header plus real custom-profile
   qualification before claiming the deployment supports that exact custom
   route.

   **B1c-C — Provider compatibility and model preferences (implemented locally;
   B1c-S0 closed locally, deployment still pending S1a-0 separation).** Keep Pi
   as the only Provider/model catalog and request authority, but remove model
   quality admission from SillyOS. The Browser adapter may classify only the
   technical shape it owns: a Pi Provider whose API-key setup is the admitted
   single-secret form, whose selected model uses a Browser-loaded Pi API
   adapter, and whose exact endpoint is canonical HTTPS. Every model under that
   admitted Provider route is selectable. CORS, account permissions, model
   retirement, and request behavior remain runtime outcomes; one Test
   Connection result never certifies sibling models and never gates use of any
   enabled model in the configured credential scope.

   Replace the model radio list with persisted checkboxes. The exact sorted
   `(providerId, modelId)` set controls which built-in models are eligible in
   Agent Creator; a separate preferred model is the current execution target.
   Home must not infer a credential from either preference: its shared
   Home/workspace composer picker intersects enabled models with the current
   Worker credential scope. Built-ins share scope only for the same exact
   `providerId` and canonical `baseUrl`; custom profiles remain exact. The
   picker provides a separate footer action back to model settings with focus
   restored to its originating surface. Refresh and Forget leave the non-secret
   preferences intact but empty both composer pickers.
   Home renders the Provider API-key warning only while the Worker lacks a
   credential, never merely because the credential-bound picker is empty.
   `untested`, `testing`, `passed`, and `failed` diagnostic states do not alter
   this invariant. Disabling the active model retains the credential and selects
   one remaining enabled same-scope model through the typed Worker path; with no
   such model, the picker stays required and creation/follow-up remain disabled
   until a model is selected. An in-scope selection change calls the
   credential-owning Worker asynchronously: the picker is disabled and
   `initializing` while it settles without flashing the warning; success alone
   updates active plus preferred, while failure retains the old usable
   selection.
   Start empty rather than selecting an old qualification
   fixture. Display Pi's catalog names and IDs verbatim and prefer a
   Provider-owned stable alias over an exact `-YYYYMMDD` snapshot only when the
   suffix-free ID already exists on the same API/base-URL route. Do not
   synthesize aliases, rank unrelated version strings, or replace a dated ID
   when no exact alias exists. If a stored ID disappears after the product's Pi
   pin moves or is hidden by this presentation rule, intersect it out of the
   rendered preference view and never silently replace it. Initialize the
   Connection model from the enabled preferred model for that Provider unless a
   live credential session already owns another exact target.

   Extend the existing bounded Browser Settings repository with only custom
   endpoint metadata, enabled model references, and the preferred reference.
   It uses a new strict revision/key and rejects unknown or secret-bearing
   fields. API keys, connection-test results, Provider sessions, and Agent state
   remain Worker-memory-only. `localStorage`, IndexedDB, OPFS, and a same-origin
   WebCrypto key are not described as an XSS-resistant vault. A future explicit
   local credential vault needs its own threat model, user-mediated unlock,
   recovery/deletion contract, and at-rest-only claim; Desktop may instead use
   an OS keychain and a hosted product may choose a server-side secret owner.

   Generalize the existing selected-origin Agent Worker response to built-in
   selections as well as custom endpoints, so each production Agent Worker gets
   only the exact chosen HTTPS origin in `connect-src`. The ordinary page and
   catalog Worker remain `connect-src 'self'`; never replace this with a global
   `https:` wildcard or a copied list of every Pi endpoint. The Worker resolves
   and verifies the supplied non-secret Provider/model/API/base-URL tuple against
   the same pinned Pi catalog before any credential or request is accepted.

   Acceptance is one coherent vertical slice: strict settings repository
   reopen/corruption/secret-rejection tests; full Pi catalog projection with no
   model qualification statuses; checkbox and preferred-model interaction;
   Home picker filtering plus credential-keyed warning behavior; one saved built-in key
   switching among enabled models inside its Provider/base-URL scope while
   excluding cross-Provider/base-URL models; failed-switch retention; exact
   selected-origin CSP; request-free Save followed by immediate use, optional
   Test pass/fail with no availability change, and Forget regression; and
   Chromium plus persistent-WebKit Settings/Home evidence. Historical provider
   qualification tools may
   remain release diagnostics, but their dated model choices do not drive
   product defaults or availability.

B1a deliberately proved catalog authority, navigation, model selection,
credential lifetime, ordinary-route activation, and clean replacement with one
already-qualified Provider before B1b independently evaluated five exact
profiles. Its tests are
mutation-sensitive to copied catalog data, secret persistence, disabled
candidate selection, stale profile activation, Worker replacement, and
responsive/keyboard regressions. Production build/chunk evidence, the local
dual-engine gate, the committed Cloudflare deployment, and the public-origin
qualifier are closed and reported independently.

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
provider SDKs or translate provider streams itself. Browser calls a selected,
compatible, session-configured Provider directly from the Agent Worker; an
optional Test connection remains a point-in-time diagnostic. Desktop uses Pi's
auth store, environment contract, or explicit development argument. Neither
route exposes raw provider records to React or stores credentials in Program
data.

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
P3c-B0 introduces only Browser OPFS workspace continuity, its exact small
continuation manifest, and a portable ZIP of the checkpoint manifest plus VFS
files, using the already-proved `read`/`write` consumer. It does not wait for a
shell/provider winner and does not introduce admitted artifact or immutable
snapshot references. P3b and later P3c slices own those broader questions only
after separate activation. This prevents the product database from
pre-committing to facts without a consumer while no longer making basic Browser
file durability depend on speculative runtime research.

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

P2-B1 closed the bounded product terminal Agent-run receipt needed by P3a's
first real tool consumer. P3a-B0 delivered on 2026-08-27, and P3c-B0 persistence
and portable download subsequently delivered before P3a-B1 began. The owner
activated P3a-B1 on 2026-08-27 as two mandatory checkpoints. Checkpoint 1
delivered and passed independent review that day, adding only native Pi
`edit`; checkpoint 2's exact contract was then frozen, corrected through
independent review, delivered, and independently accepted the same day. With
P3a-B0 and both B1 checkpoints complete, P3a is closed.

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

#### P3a-B0 delivered implementation contract

P3a-B0 has one session-local execution owner. `open_workspace` takes the exact
durable `programId` and existing Creator `workspaceId`, creates a fresh opaque
`workspaceSessionId`, generation `1`, one stable `ExecutionEnv` instance, and
one empty disposable volume. The three identities are not aliases: the
Creator `workspaceId` identifies the product work area, while
`workspaceSessionId` identifies only this open execution volume. Repeating an
open for the same pair returns the current descriptor; a different pair must
close the current session before it can open. B0 admits one active Agent run
and one native tool call scope at a time.

Every Agent submit envelope carries this separate session-local binding beside
the unchanged durable `CreatorAgentRunRequestV1`; the binding never enters P2's
terminal receipt:

```ts
interface CreatorAgentExecutionBindingV1 {
  revision: 1;
  programId: string;
  workspaceId: string;
  workspaceSessionId: string;
  expectedGeneration: number;
}
```

The Browser Worker determines its transient Pi `(sessionId, runId)` before
constructing the Agent and bound tools. Submit admission checks that the binding
matches the open workspace and initializes a run-local generation cursor from
`expectedGeneration`. The binder then admits each native invocation under
`(workspaceSessionId, sessionId, runId, toolCallId)` and supplies the same
`{ env }` object to Pi. Duplicate, nested, cross-workspace, post-close, or
concurrent scopes fail before an effect. The low-level Pi `Agent` explicitly
uses `toolExecution: "sequential"`; no product dispatcher receives a tool name
or reinterprets Pi arguments.

The execution generation is a positive session-local integer. It starts at
`1` and advances exactly once when one `write` call leaves different file bytes
in the volume, including when Pi later reports that call as failed or cancelled.
Writing byte-identical content is a complete no-op: it changes neither
generation nor observable `mtimeMs`. Implicit parent-directory creation is part
of that one logical write and is not a second generation or changed path. A
rejected or failed call with no byte effect leaves the generation unchanged.
`read` never changes the generation. The port rejects an already-stale submit
before starting Pi, with no tool call and therefore no mutation receipt; the
caller obtains the current descriptor before retrying. Each later tool scope
rechecks the runtime generation against the run-local cursor before entering
the environment, then advances that cursor to the settled
`resultingGeneration`. This permits sequential `write -> read` and multiple
writes in one run without weakening the initial stale fence. On every receipt,
`expectedGeneration` remains the generation admitted at submit while
`baseGeneration` is the cursor at that tool-call boundary. An unexpected cursor
mismatch is a pre-effect protocol failure and also produces no mutation
receipt.

Only an attempted `write` produces `WorkspaceMutationReceiptV1`; `read` is
proved through Pi's native tool result and produces no mutation receipt. The
product-facing receipt is exact:

```ts
interface WorkspaceMutationReceiptV1 {
  revision: 1;
  sequence: number;
  programId: string;
  workspaceId: string;
  workspaceSessionId: string;
  agentRunId: string;
  toolCallId: string;
  tool: "write";
  expectedGeneration: number;
  baseGeneration: number;
  resultingGeneration: number;
  outcome: "succeeded" | "failed" | "cancelled";
  effect: "none" | "changed";
  changedPaths: string[];
  diagnosticCode:
    | null
    | "cancelled"
    | "path_rejected"
    | "capacity_exceeded"
    | "execution_failed";
}
```

`sequence` is contiguous within one `workspaceSessionId`. `changedPaths` is
empty for `none` and contains exactly one normalized workspace-relative POSIX
path for B0's `changed` write. `succeeded` has a null diagnostic; failed and
cancelled calls use the matching closed diagnostic while their effect
independently reports the final bytes. The receipt contains no tool arguments,
file contents, Pi transcript, provider data, credential, or transient Pi
session/run identity.

The outcome/diagnostic combinations are closed: `succeeded` requires `null`,
`cancelled` requires `cancelled`, and `failed` requires `path_rejected`,
`capacity_exceeded`, or `execution_failed`. Outcome and effect remain
independent. Stale submit, duplicate identity, nested/concurrent scope,
cross-workspace scope, post-close scope, cursor mismatch, and a full receipt
queue are admission rejections; none creates a mutation receipt.

The Worker may use transient Pi identity internally, but the product transport
must project it to `agentRunId` while that mapping is still live and remove the
Pi identities before exposing the receipt. The port retains at most 32
unacknowledged receipts. Every mutating tool scope reserves one queue slot
before invoking Pi; when no slot remains, that tool call fails before effect and
without creating another receipt. Acknowledgement removes only a contiguous
prefix; uncertain receipt delivery never retries the `write` call. For cancel
or replacement, the Worker first marks the run non-current and aborts it, then
waits for the active environment effect to quiesce, settles and publishes its
mutation receipt, and only then publishes the associated terminal Agent event
and releases the correlation mapping. A replacement request may be accepted
while that drain occurs, but the successor cannot enter `prompt()` or a tool
scope until the predecessor's receipt and terminal event are published. A
changed receipt therefore survives a failed, cancelled, replaced,
stale-candidate, or proposal-free Agent outcome for the remainder of the open
product session.

Replacement has one deliberately narrow generation rule. The Worker checks the
successor binding before disturbing the predecessor. It accepts an exact
current descriptor, or the predecessor's admitted generation while that
predecessor still owns unpublished mutation effects. After the predecessor is
drained and its receipt plus terminal event are published, the Worker rebases
that accepted successor once to the resulting descriptor before constructing
Pi. No other stale binding is rebased, and a rejected stale request neither
cancels the current run nor enters Pi.

The two receipt families remain orthogonal. P2's durable Agent-run receipt says
how the whole Creator run ended and whether a Program successor committed; it
does not claim that workspace bytes persist. P3a-B0's mutation receipt says
what happened to the disposable volume; it does not make a Program revision or
survive reload. Repository V2 remains unchanged. Reload creates a new
`workspaceSessionId`, empty volume, and generation `1`; the UI must report that
the execution workspace reset rather than infer recovery from a restored P2
receipt. Durable bytes, mutation receipts, admitted artifacts, and snapshot
references remain P3c work.

The B0 volume admits canonical paths below `/workspace` only, has no symlinks
and no Host fallback, and uses these fixed ceilings:

- canonical relative path: 512 UTF-8 bytes and 32 components;
- one regular file: 256 KiB after UTF-8 encoding;
- whole volume: 2 MiB and 256 regular files;
- native `readBinaryFile()` input: one admitted file of at most 256 KiB;
- unacknowledged mutation receipts: 32, with at most one changed path each.

Capacity and containment failures are atomic and occur before volume mutation.
The unused `Shell.exec` half of `ExecutionEnv` returns Pi's admitted execution
failure rather than invoking an ambient command. `close_workspace` rejects new
work, aborts and awaits any active scope, publishes any reserved mutating
scope's terminal receipt before the Agent terminal event, calls environment
cleanup exactly once, and then rejects all filesystem and scope operations.
Close retains the bounded receipt queue for contiguous acknowledgement even
after the volume is unavailable. Explicit Worker forget is the authority to
abandon remaining unacknowledged receipts; it performs close and terminal
ordering first, then discards both the disposable bytes and the queue.

P3a-B0 acceptance requires focused conformance for stable environment identity,
native Pi schemas and results, multiple cursor-advancing writes, same-byte
writes, stale submit without Pi prompt/effect/receipt and descriptor-based retry,
duplicate scopes, per-tool receipt backpressure, path/capacity rejection,
abort-before-write, write-committed-then-aborted, replacement ordering,
receipt acknowledgement, close/forget cleanup, and Repository V2
reopen truthfulness. Chromium and WebKit must exercise the real lazy Pi Worker
factory path through one combined
`write -> read -> sillyos_propose_program_revision -> completed` journey and
observe both the session-local mutation receipt and durable P2 terminal receipt.
A cancelled or replaced run after a byte change must separately prove that
Agent outcome and workspace effect can differ. The release graph must continue to exclude OPFS, just-bash, Wasm,
Node filesystem/process adapters, Host `PATH`, extension discovery, and all
P3a-B1/P3b assets.

P3a-B0 closed on 2026-08-27. One product-owned in-memory runtime now opens and
closes the disposable volume, owns its stable `ExecutionEnv`, generation cursor,
bounded mutation journal, acknowledgement, drain, cleanup, and forget behavior.
The fixed Pi 0.84.3 native `createWriteTool` and `createReadTool` factories are
bound without changing their schemas or results; the low-level Agent runs them
sequentially in its lazy Worker. Raw mutation records retain Pi correlation only
inside the Worker/transport boundary and are projected to product `agentRunId`
receipts before the associated terminal event. Creator UI opens the execution
session explicitly, reports its disposable generation and last write truth, and
acknowledges mutation receipts only after the durable P2 terminal mutation has
settled.

The fixed Pi runtime values pass through a local ESM bridge while TypeScript sees
only the public tool/environment structures this product consumes. This avoids
expanding an unrelated provider SDK declaration closure under the repository's
TypeScript 7 check; it is neither a Pi fork nor a copied tool implementation and
does not relax `skipLibCheck`. Focused workspace/protocol conformance passes 13
cases, and the complete SillyOS unit suite passes 90 cases across ten files.
Chromium and WebKit pass all 18 SillyOS journeys, including the native
`write -> read -> proposal -> completed` path, reload reset to generation `1`,
and a post-effect cancellation whose workspace receipt remains
`succeeded/changed` while the whole Agent run is cancelled. The local live
OpenAI qualification also passes in both engines with two successful Responses
requests per completion, cancellation currentness, no durable credential, and
explicit Worker forget. The production build emits the Pi Worker only as a lazy
416.96 kB asset and the Agent port as a lazy 41.32 kB chunk; ordinary startup
still excludes them. Source and output scans contain no OPFS, just-bash, Wasm,
or extension-discovery asset in the Browser product; the P3a diff adds no Node
filesystem/process adapter or Host `PATH` fallback. No SillyMaker engine gap was
reproduced and no engine API changed.

#### P3a-B1 checkpoint contract and checkpoint-1 closure

P3a-B1 completes the default Browser execution-tool surface in two mandatory,
ordered checkpoints. It does not create a generic tool dispatcher or a second
Agent capability system.

**Checkpoint 1 — native Pi `edit` over the persistent volume — delivered and
passed independent review on 2026-08-27.** The
Browser Agent Worker imports the fixed Pi 0.84.3 `createEditTool()` factory and
the existing binder supplies the same stable Program-scoped `ExecutionEnv` used
by native `read` and `write`. SillyOS adds only the truthful environment
primitives that factory consumes: addressed file metadata, bounded UTF-8 text
read, and the existing replacement write. All three filesystem projections
reach the exact P3c-B0 OPFS volume through typed environment RPC. Pi retains
the schema, argument preparation, exact-match algorithm, line-ending/BOM
behavior, diff/patch/first-changed-line details, cancellation checks, and
model-visible result.

The existing `256 KiB` native Pi whole-file ceiling applies before the edit's
whole-file read and replacement write; metadata may report a larger file so the
read can reject it without transferring bytes. It is not a volume limit. One
admitted edit owns one sequential tool scope and reserves one mutation receipt.
The receipt tool discriminator becomes the closed union `"write" | "edit"`.
Only a durable byte change advances generation and names one changed path.
Pi rejects a replacement that would produce identical content, so same-byte,
missing, directory, invalid UTF-8, path, ambiguous-match, no-match, or capacity
failure leaves the prior bytes and generation with `failed/none`. Outcome and
effect remain orthogonal: cancellation before the
durable write is `cancelled/none`, while cancellation observed after that write
is `cancelled/changed` and never rolls the bytes back. Reload/cold reopen must
retain the exact edited bytes and generation while receipts remain
session-local.

Checkpoint 1 acceptance required focused bridge/binder, protocol, environment,
Host/OPFS, receipt and Worker coverage; a real fixed-Pi
`write -> edit -> read -> proposal` journey; stale-generation, receipt
backpressure, close/replacement and before/after-effect cancellation evidence;
Chromium and persistent WebKit cold-reopen evidence; and production-graph proof
that ordinary startup still excludes Pi while the lazy Agent graph still
excludes just-bash, Wasm, Node process/filesystem adapters, and Host `PATH`
fallback. The UI may truthfully name native `read`/`write`/`edit`; it must keep
`bash` unavailable. Proposal `suggestedCapabilities` remains preview content,
not runtime capability truth. This checkpoint does not close P3a-B1 or P3a.

The delivered Browser Agent Worker now binds fixed Pi 0.84.3's unchanged
`createEditTool()` beside native `read` and `write`. Its addressed metadata,
strict bounded UTF-8 read, and one replacement write cross the existing typed
environment RPC to the sole OPFS Host. The deterministic real-Pi journey is
`write -> edit -> read -> proposal`; the proposed revision is admitted only
after Pi's structured edit result and exact final bytes agree. Mutation
receipts now discriminate `write | edit`, preserve outcome/effect
orthogonality, apply the existing bounded queue to both mutators, and advance
generation only for a durable byte change. The UI reports the actual last
mutation tool while keeping `bash` unavailable. Focused and complete SillyOS
unit suites pass, including all 171 cases across 20 SillyOS test files.
Chromium and persistent-WebKit cold-reopen/cancellation journeys pass, as do
the 395-file/5,549-case repository check, release build, and ordinary/lazy
graph exclusion scans. No SillyMaker engine gap was reproduced and no engine
API changed.

**Checkpoint 2 — native Pi `bash` through just-bash — delivered and closed on
2026-08-27.** The dependency is
exact `just-bash@3.4.2` (Apache-2.0), resolved by the shared lockfile. Its npm
tarball integrity is
`sha512-T0Vpy7YRgCjxJdqG3tkxn0ZnIDLJvVwb8hH4L+6NVdp+Te27jQxjxnszW9ODjEKbWxWujj83rP5S0GQxCSufgg==`
and the corresponding upstream tag resolves to
`a021f95f53f7e01df48dab71b46ffd4637fb4b53`. SillyOS imports only
`just-bash/browser`. A strict Browser characterization reproduces the published
bundle's unresolved static `node:zlib` imports from gzip and compressed-file
`rg`; the runtime `commands` filter cannot tree-shake that already-published
bundle. The bounded product build therefore aliases only `node:zlib` to a
build-known fail-closed module with the exact named exports `gzipSync`,
`gunzipSync`, and `constants`: the two functions throw, and every constants
property read throws. The
runtime allowlist excludes `gzip`, `gunzip`, and `zcat`, and SillyOS does not
claim compressed-file `rg`. The alias is not a zlib implementation or a
general Node-compatibility layer. The characterized upstream Browser artifact
is about 1.24 MB raw / 348 kB gzip before the product build; only the final
release graph is acceptance evidence. Network, Python, JavaScript execution,
custom commands, and optional Wasm runtimes remain disabled.

The exact bundled-command allowlist is `basename`, `cat`, `cut`, `dirname`,
`echo`, `env`, `false`, `find`, `grep`, `head`, `ls`, `printenv`, `printf`,
`pwd`, `rg`, `sed`, `sleep`, `sort`, `stat`, `tail`, `tee`, `tr`, `true`,
`uniq`, and `wc`. just-bash's shell grammar and builtins remain available where
their required primitive exists; this list is a product capability profile,
not a security boundary and not a claim that every GNU flag is compatible.
`mkdir`, `touch`, `rm`, `cp`, `mv`, links, permissions, Git, Tar, compression,
`awk`, `jq`, Python, QuickJS/Node, SQLite, package managers, fetch, and sockets
are absent. Pipes plus `>`, `>>`, and the admitted `tee` command may create or
replace files only under an already-existing persistent directory. Native Pi
`write` remains the first way to create a missing parent directory in this
checkpoint.

The physical runtime is co-located with the sole Workspace Host/OPFS owner and
is reached by one coherent typed shell-exec request from the Agent Worker.
This is required because just-bash's `IFileSystem.getAllPaths()` is synchronous.
Each execution first builds one bounded generation-current path view. Before
constructing `Bash`, the Host creates a fresh `InMemoryFs` with an explicit
2 MiB retained-byte ceiling and uses its public async methods to initialize the
small `/bin`, `/usr/bin`, `/dev/fd`, `/proc/self/fd`, `/tmp`, device-file, and
virtual-process support set. It then mounts the persistent OPFS projection at
`/workspace` with `MountableFs`. `/bin`, `/usr/bin`, `/dev`, `/proc`, and `/tmp` are
execution-local shell support and never enter OPFS, generation, receipts, or
portable exports. The persistent adapter implements only read, stat, directory
listing, replacement, append, existence, path resolution, `lstat = stat`,
realpath-without-links, and the synchronous current path view. It still
implements the complete required `IFileSystem` shape; `mkdir`, remove,
copy/move, chmod/utimes, and symbolic/hard-link methods fail with stable
unsupported errors. `find` uses `readdir` plus `lstat`, while `rg` uses the
available async directory listing. There is no second persistent MEMFS and no
copy-back phase. just-bash's `maxFileSystemBytes` is not misrepresented as a
limit on either this explicit ephemeral base or the OPFS mount.

The admitted cwd is an existing directory inside `/workspace`. `inheritEnv`
means only the fixed product shell environment plus Pi's prepared per-call
values, never Window/Worker globals, provider credentials, `.env`, or Host
process variables. Product defaults are `HOME=/workspace`, `PWD=/workspace`,
`OLDPWD=/workspace`, `PATH=/usr/bin:/bin`, `TMPDIR=/tmp`, and
`LANG/LC_ALL=C.UTF-8`; `inheritEnv: false` starts from Pi's supplied map plus
the cwd-derived `PWD`. At most 32 per-call keys and 8 KiB of UTF-8 key/value
data cross the wire. The command source is at most 16 KiB UTF-8. One shell read
materializes at most 16 MiB in the Host Worker; aggregate input is 32 MiB,
retained live/intermediate data is 64 MiB, aggregate terminal output is
256 KiB, a heredoc is 1 MiB, one traversal visits at most 8,192 entries and 32
levels, and one execution admits at most 512 commands, 10,000 loop/transform
iterations, 100,000 work units, 128 file descriptors, and 30 seconds of
cooperatively checked just-bash wall time. A Pi-requested timeout must be finite,
positive, and no greater than 30 seconds; larger values fail before effects.
These are execution-call limits, not OPFS volume limits or fixed Worker-heap
claims.

Pi 0.84.3 remains the only `bash` tool authority: SillyOS imports its unchanged
`createBashTool()` and binds the existing stable `ExecutionEnv`. The Host returns
just-bash's terminal aggregate stdout, stderr, and exit code. Because its public
Browser API exposes no production-time chunks, this bounded Browser Local
backend intentionally does not conform to Pi `Shell`'s production-time callback
guidance: it invokes Pi's stdout callback once and then its stderr callback once
before settling. Native Pi still owns the schema, tail/overflow algorithm and
tool result, but its merged Browser output is explicitly stdout aggregate then
stderr aggregate rather than chronological interleave. Capability truth and
tests must say `terminal_aggregate`; there is no live-streaming claim.

Nonzero exit is a successful Shell result that Pi turns into its native tool
failure. External abort observed first maps to `ExecutionError("aborted")`; a
requested timeout of at most 30 seconds observed first maps to
`ExecutionError("timeout")`; callback failure maps to `callback_error`; and an
ordinary command that itself exits 124 remains an ordinary nonzero exit. A
requested timeout above 30 seconds fails before effects as `ExecutionError`
`unknown` with an explicit Browser Local limit message, never as a false elapsed
timeout. With no requested timeout, just-bash's 30-second execution-capacity
limit remains its ordinary bounded exit/status and is not mapped to Pi timeout,
avoiding Pi's `undefined seconds` message. The adapter records the first
external-abort/requested-timeout cause separately from exit code so a later
signal cannot reclassify an already-settled command.

Every persistent byte-changing replacement or append publishes its own exact
successor head immediately; same-byte primitives do not advance generation.
One bash scope admits at most 128 persistent mutation attempts and 64 distinct
changed paths, in first-change order. Every 129th persistent mutation attempt
fails before any effect. After 64 distinct changed paths, the first attempt to
touch a 65th persistent path also fails before effect, while a remaining
in-bound attempt may revisit one of those 64 paths. The scope reserves exactly one mutation receipt even
for a read-only command. Its `tool` discriminator is `bash`, its base generation
is the generation at native Pi tool admission, its resulting generation is the
last durably published head, and its de-duplicated paths cover both shell
redirection/`tee` and Pi's own overflow log. Redirection is intentionally not
transactional: a truncate and later rewrite may advance twice, and a later
failure, timeout, cancellation, or Worker loss never rolls back an already
published effect. Existing P3c-B0 per-replacement journal recovery remains the
only crash authority; terminal receipts remain session-local.

Pi's native 2,000-line/50 KiB tail rule remains unchanged. When it requests a
full-output file, the environment accepts only Pi's `bash-`/`.log` pattern,
creates a unique persistent
`/workspace/.sillyos/tmp/bash-<opaque>.log`, and appends the sanitized aggregate
output through the same OPFS mutation scope. The just-bash 256 KiB aggregate
output bound also bounds this file's new content per call. Creation or append
failure fails the native Pi tool without hiding earlier shell effects. Creating
the previously absent empty file is itself one namespace-changing mutation and
publishes one successor generation; append may publish another. If creation
succeeds and append fails, the empty file, changed path, generation, and failed/
changed receipt remain truthful. Both steps count toward the same 128-attempt/
64-path native bash scope. These
product-visible logs survive cold reopen and appear in a portable workspace
export; shell-internal `/tmp` does not.

Checkpoint 2 proves explicit cwd/env mapping, allowed pipelines/redirection,
terminal aggregate stdout/stderr/exit status, bounded output and temporary
files, cooperative timeout/abort with any already-published effects retained,
and a minimal closed execution-profile projection. It does not claim live
shell streaming, PTY, background jobs, process trees, arbitrary binaries,
transactional rollback, Git, Tar, compression, Python, QuickJS, SQLite, GNU
compatibility, Linux, a container, or a sandbox. Non-cooperative future
custom/Wasm commands must run in an owned terminable Worker before stronger
cancellation can be claimed. P3c-B0 durable `read`/`write` bytes preceded B1
rather than waiting for P3a to close.

Checkpoint 2 delivered and passed independent review on 2026-08-27. The
unchanged native Pi `createBashTool()` now reaches one closed
`browser_local_just_bash` profile whose exact output mode is
`terminal_aggregate`; the allowlist and resource bounds above are its actual
runtime inputs. One Host-owned first-cause deadline starts before the lazy
runtime import and covers the generation-current OPFS path view plus command
execution without restarting the requested timeout. OPFS enumeration checks
cooperative cancellation through final file metadata. Capacity failures remain
distinct from ordinary execution failure, and already-published bytes are not
rolled back.

The real deterministic Pi journey is now
`write -> edit -> read -> bash(tee + rg) -> proposal`, reaches durable
generation `4`, and cold-reopens the exact files in Chromium and persistent
WebKit. A separate full-chain native Pi test persists and byte-compares a
completed `60,000`-byte aggregate at
`.sillyos/tmp/bash-<opaque>.log`; abort/timeout tests prove classification and
retained effects but deliberately do not claim that just-bash preserves partial
terminal output after physical interruption. Raw protocol evidence separately
proves that only the run-owned Pi overflow path may drain after cancellation.
Focused contracts, the complete repository unit suite, the dual-engine product
journey, release build, and lazy-graph scans pass. The ordinary page and Pi
Worker exclude just-bash; only the Workspace Host Worker contains it. The
Host chunk necessarily retains dormant code and registry strings from the
published just-bash monolith, but the closed allowlist plus `python: false` and
`javascript: false` expose no Python, QuickJS, SQLite, or Wasm command and the
build emits no separate runtime/Wasm/native asset. There is no Node
Host-filesystem/PATH fallback or engine API change. This closes P3a-B1 and P3a
without activating P3b.

`AGENTS.md`, skills, and prompts in the workspace volume remain inert data in
P3. P3c-B0 persists their bytes without activating them; later P3b
characterizes execution providers but does not reinterpret those files. P4 may
qualify a target-appropriate public Pi resource route:
Browser can supply admitted resources through proven Agent inputs, while
Desktop may use companion-controlled, read-only materialization of one exact
workspace generation or another supported prompt/context hook. Neither route
creates a SillyOS skill loader. Executable extension modules are different:
only build-known, version-pinned product dependencies may execute.
Agent-writable TypeScript inside the volume is never loaded as a Pi extension in
either target.

### P3b — historical Workspace execution research, superseded by S1/S2

P3c-B0 independently proved Browser OPFS continuity, but the 2026-08-28 security
decision removes a same-origin Browser Local runtime from the live-provider
candidate set. The substrate comparisons below remain research evidence; the
accepted implementation order is now S1 independent-origin Workspace authority,
then S2 execution profiles. The target still requires one logical environment
per open Program Workspace, a persistent
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
  -> Browser Sandbox: independent-origin VFS owner + just-bash + optional bounded runtimes
  -> Desktop Native: fixed Pi companion + admitted native volume/processes
  -> BYO Sandbox: typed HTTPS/WSS RPC + provider-declared filesystem/shell capabilities
```

just-bash is a Browser Sandbox facade, not a mandatory hop in front of Desktop
or BYO Sandbox. A remote provider receives coherent environment operations and
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

No broader shell/process provider denominator is selected until the independent-
origin Browser Sandbox and Desktop have evidence for startup, command semantics,
cancellation, output bounds, filesystem isolation, representative repository
operations, bundle/memory cost, and license/distribution fit. P3c-B0's current
same-origin OPFS byte owner is storage evidence, not the selected security
boundary. BYO Sandbox is later qualified against the same applicable
conformance. Network is initially absent; remote
Git, package installation, credentials, and arbitrary outbound access require a
later explicit broker/capability decision. No implementation substrate is
advertised as a security sandbox without a stated threat model and executable
boundary tests; WebAssembly alone is not such evidence.

### P3c — Browser Program workspace continuity

#### P3c-B0 delivered implementation contract

P3c-B0 persisted the filesystem behavior already proved by P3a-B0; it did not
select a broader execution provider. Its dated evidence kept Pi 0.84.3's native
`read` and `write`, the exact product execution binding, sequential call scope,
generation fence, cancellation ordering, and session-local mutation receipt.
After S0, only the fixed deterministic fixture retains that same-origin route;
live Provider runs wait for S1.
It replaces only the disposable byte owner with a product-owned Workspace Host
Worker whose OPFS volume can survive Agent Worker disposal and a full page
reload. `edit`, `bash`, just-bash, Wasm, Git, provider research, and Desktop
parity were not P3c-B0 prerequisites. Native `edit` subsequently delivered in
P3a-B1 checkpoint 1, and the separately delivered checkpoint-2 native Pi
`bash` followed without retroactively changing P3c-B0. The other listed
capabilities remain inactive.

Implementation proceeds through three review checkpoints without creating more
slice numbers:

1. **Authority and cold reopen (delivered 2026-08-27).** Add the exact continuation store, bootstrap
   and volume leases, Workspace Host Worker with its private head/journal, and
   the Agent environment proxy. The real Browser product path must complete
   native Pi `write -> close -> full reload -> reopen -> read` with a new
   `workspaceSessionId` and continued generation before this checkpoint lands.
   It adds no scale claim or export UI.
2. **Recovery and scale (delivered 2026-08-27).** Exercise every stated ownership/mutation crash point,
   two-tab first/open contention, quota and persistence states, the mandatory
   `20 MiB` corpus, fixed bounded filesystem I/O payload, and oversized Pi-read
   failure. This does not measure or cap total Worker heap.
3. **Portable export (delivered 2026-08-27).** Add only the canonical
   cancellable ZIP writer, download lifecycle, independent Chromium/WebKit
   unpacking, and secret/exclusion scans.

Each checkpoint received focused review and could commit independently, but none
alone closed or advertised P3c-B0. The complete B0 acceptance below has passed;
P3a-B1 checkpoint 1 was the separately selected next slice and has since
delivered; checkpoint 2 subsequently delivered and closed P3a, while P3b
remains inactive.

Checkpoint 1 delivered on 2026-08-27. The Program repository now owns one exact
insert-only continuation record and advances its Program/repository anchors in
the same transaction as later P2 mutations. A product-owned Workspace Host
Worker exclusively owns the OPFS volume/head/journal and volume Web Lock; the
Pi Worker receives only a transferred typed environment port and continues to
use Pi 0.84.3's native `write`/`read`. Chromium and persistent-profile WebKit
both prove `write -> close-settled -> full reload -> reopen -> exact read`, a
fresh `workspaceSessionId`, continued generation, an empty reopened mutation
queue, cancellation ordering, and Forget/reinitialize lock release. Playwright's
ephemeral/private WebKit context rejects OPFS and is not used to manufacture a
success claim; checkpoint 2 records that unavailable state explicitly. The retired
disposable runtime and arbitrary continuation replacement path were deleted.
Checkpoint 1 alone makes no scale, recovery-completeness, export, shell, or
sandbox claim and does not close P3c-B0.

Checkpoint 2 delivered on 2026-08-27. Focused recovery tests cover interrupted
replacement/head publication, quota and unavailable storage, exact candidate
reuse, and bounded ranges. Real Chromium and persistent-profile WebKit prove
first/open contention, bounded busy state, Worker-loss lease release, exact
cold reopen, and an automated corpus of 1,000 `5 KiB` files plus one `16 MiB`
file: `1,001` files, `21,897,216` bytes, and generation `1002`. The same route
proves page isolation from volume bytes and rejects native Pi reads above
`256 KiB` from metadata. Browser storage UI reports the origin-wide advisory
estimate and exposes an explicit best-effort persistence request; a `false`
result leaves the workspace usable. Checkpoint 2 alone did not implement ZIP,
import/restore, shell, or sandbox behavior and therefore did not close P3c-B0.

Checkpoint 3 delivered and closed P3c-B0 on 2026-08-27. The product now streams
one canonical STORE-only ZIP into a Host-owned OPFS temporary, transfers only a
Host-owned object URL and bounded metadata to the page, and exposes explicit
progress, cancellation, finalization, and download-started states. Real
Chromium and persistent-profile WebKit both cancel before download and then
download, independently unpack, and byte-check the exact `1,001`-file,
`21,897,216`-byte workspace corpus without changing its durable head. The
downloaded archive adds only the root portable manifest; it does not add an
import reader, immutable snapshot, shell, Wasm guest, Pi wire change, or engine
API.

One Program has one mutable Browser volume. Its identities stay distinct:

- durable `programId` names the Program aggregate;
- durable `workspaceId` names its product work area;
- opaque durable `volumeId` locates one OPFS volume without becoming a Host
  path; and
- fresh `workspaceSessionId` names only one open execution lease and is never
  persisted.

The first persistent open creates an empty volume at generation `1`. A cold
reopen creates a new `workspaceSessionId` but returns the exact last durable
generation and bytes. Later writes continue that monotonic generation; they do
not reset it merely because the Agent Worker or page restarted. A known
manifest whose volume is missing or corrupt fails explicitly and never falls
back to a new empty volume.

The OPFS volume owns one exact internal current-head record:

```ts
interface BrowserWorkspaceDurableHeadV1 {
  revision: 1;
  volumeId: string;
  workspaceFormat: 1;
  checkpointId: string;
  generation: number;
}
```

`checkpointId` is a fresh opaque identifier for the initial head and each
byte-changing mutation; a same-byte write preserves both it and `generation`.
The record lives in a reserved Host-only OPFS metadata namespace that Pi tools
cannot name and a future portable export must omit. It identifies only the current mutable
head and is not an immutable or accepted Program snapshot; an older
`checkpointId` is not promised to remain reopenable. A bounded volume-local
pending-mutation record plus staged replacement lets reopen either discard an
unapplied write or finish a file replacement whose new bytes are already
durable before publishing the new head. Recovery never guesses generation from
a directory scan or a Program-repository value.

The Browser topology is exact and product-private:

```text
Program Repository Worker -> IndexedDB continuation manifest
React/product controller  -> typed workspace lifecycle commands
Agent Worker              -> direct typed environment MessagePort
                              -> Workspace Host Worker
                                   -> one Program OPFS volume
```

The Workspace Host Worker is the only OPFS writer. React, the Program
Repository Worker, and the Agent Worker receive neither OPFS handles nor a
complete file-tree clone. The Agent channel carries admitted filesystem
primitives plus the existing run/tool scope, not `{ toolName, arguments }` and
not raw Pi records. One Host instance may serve only the currently open Program
in B0; a pool, shared scheduler, generic VFS protocol, and cross-origin service
are unnecessary.

A Dedicated Worker is not an origin-wide lock because another tab can create a
second Worker. Before opening an existing `volumeId`, the Host must acquire one
exclusive origin-wide volume lease keyed by that opaque identity. The baseline
candidate is Web Locks held for the complete open workspace session; a proved
equivalent is allowed only if Chromium and WebKit demonstrate the same crash
release and mutual exclusion. An in-memory mutex, BroadcastChannel election, or
"last writer wins" is not sufficient. Failure to acquire returns a bounded
`workspace_busy` state without opening handles or entering Pi. Close/Forget
first reject new work, drain and flush the durable head, release OPFS handles,
then release the origin lease; Worker termination must also let the platform
release it before another tab reopens the exact head.

The existing Program repository database advances only far enough to own a
separate `workspace_continuations` record keyed by `programId`. The Program V2
aggregate remains the Program authority and does not absorb file bytes. The
database schema becomes exact V3: the existing `programs` store and V2 aggregate
stay byte-for-byte admitted as before, while one `workspace_continuations`
object store uses `keyPath: "programId"`, no auto-increment, and no indexes.
Fresh creation makes both stores; upgrading the exact delivered V2 database
adds only the empty continuation store and neither reads nor rewrites Program
rows. This is one current schema, not a dual reader or migration framework.
Newer/unknown schemas still fail explicitly. The continuation value is exact
and bounded:

```ts
interface BrowserProgramContinuationManifestV1 {
  revision: 1;
  programId: string;
  workspaceId: string;
  volumeId: string;
  workspaceFormat: 1;
  programRevision: number;
  repositoryRevision: number;
}
```

All identities use the current product identifier grammar,
`programRevision` and `repositoryRevision` are positive safe integers, and the
encoded record is at most `1 KiB`. There is at most one manifest per Program
and no secondary index. It contains no filenames, hashes, file bytes, accepted
snapshot reference, Creator message or transcript, prompt/model/provider
record, credential, `agentRunId`, workspace generation, Pi session/run
identity, or Pi private session state.

The manifest is the product-owned volume/index anchor to one exact P2 Program
projection, not a second source for continuation semantics. On reopen, the
product repository loads the exact anchored Program/repository revision. Its
current Program intent and accumulated requirements provide the goal; current
proposal status provides the phase and open review work; existing exact
decisions, Activity, and terminal product receipts provide bounded decision
meaning. The Workspace Host separately supplies the current durable generation
and bytes. This composition never copies the Creator message list into the
manifest, never treats that UI projection as Program content, and never replays
it into a new Pi session. Browser Pi starts fresh and may inspect the admitted
Program projection and workspace files through existing product paths only.

Ownership creation is the one bounded OPFS/IndexedDB coordination: the Host
creates an empty `volumeId`, then one Program-repository insert-if-absent
operation publishes its manifest anchored to the exact current
Program/repository revision. Failure or an unknown response is reconciled by
that identity and may leave only a bounded new-volume orphan for cleanup; it
never creates two visible owners. Later P2
Program mutations advance the two revision anchors, when a manifest exists, in
the same IndexedDB transaction as the Program aggregate. They neither read OPFS
nor claim a byte snapshot.

Because a missing manifest provides no common `volumeId`, first ownership is
serialized under a short-lived origin-wide bootstrap Web Lock keyed by the
durable `programId` and `workspaceId`. Each contender reloads the manifest only
after entering that lock. It creates a candidate volume only if the record is
still absent, and it does not publish handles, create a `workspaceSessionId`, or
enter Pi before the manifest insertion settles and the selected volume lease is
held. If insertion conflicts or its response is unknown, the contender reloads the exact
record. When another `volumeId` won, it closes and deletes its still-unattached
orphan and proceeds only with the winner; when its own identity won, it resumes
that candidate. Simultaneous first open therefore cannot create two public
workspaces even though later mutual exclusion is keyed by `volumeId`.

Continuous filesystem generation belongs solely to the Workspace Host's
durable OPFS volume head. Every changed tool operation settles its file and that
head without writing IndexedDB. P3a terminal mutation receipts remain session-
local and reopen with an empty queue. A lost filesystem response is reconciled
against the Host's exact call/volume head and is never blindly replayed, but it
does not create a per-write cross-store saga. On cold reopen, a mismatched
manifest identity/format, missing volume, or invalid OPFS head is reported as
recovery-required corruption; no owner substitutes different bytes.

Close rejects new work, drains the current P3a scope, durably flushes the OPFS
volume head, releases all OPFS handles, and then closes the execution lease. It
does not perform a Program-repository write merely because generation changed.
Agent Forget still clears the credential, Pi session, transient mapping, and
receipt queue, but no longer deletes the Program's durable volume or
continuation manifest. Program deletion is not introduced by this slice.

P3a-B0's fixed `2 MiB` volume and `256 KiB` file ceilings are guardrails for its
disposable in-memory control only. They are not inherited as OPFS capacity.
Checkpoint 2 delivers the automated Chromium and persistent-WebKit gate as
exactly `1,000 × 5 KiB + 16 MiB`: `1,001` files, `21,897,216` bytes, and final
generation `1002`. `100 MiB`, `256 MiB`, and larger several-hundred-MiB
workloads remain optional raw characterizations when the current origin has
room, not mandatory gates or promised quotas. Browser capacity is dynamic
across engine, device, free disk, engagement, private mode, and origin policy.
`navigator.storage.estimate()` reports advisory usage/quota for the whole
origin, not a SillyOS volume allowance or one uniform fixed browser quota. The
product requests `navigator.storage.persist()` only through an explicit action
after the user has created important work, catches `QuotaExceededError`, and
reports whether persistence was granted. A best-effort request returning
`false` does not fail or disable the volume, and a granted request does not turn
local storage into backup. Checkpoint 3 therefore admits a complete origin
storage estimate only as a known-insufficient temporary-headroom preflight;
unknown or advisory estimates remain non-promissory, and the real OPFS write is
the quota authority.

The Host uses range/stream operations and bounded directory/index pages. It
must not retain the complete volume, copy the whole tree across a Worker
message, or allocate an unconditional whole-volume `ArrayBuffer`/string. The
page receives no volume bytes, and no owner needs the complete volume resident
in memory. The implementation publishes fixed `1 MiB` maximum I/O chunks and
`4 MiB` of aggregate **SillyOS-managed filesystem payload bytes** in flight;
focused tests inspect those bounds while the volume grows. This observation
does not measure or cap total page, Worker, WebCrypto, or browser heap. Pi 0.84.3
`read` still reads one complete selected file before truncating its model-
visible result, so the delivered wire keeps an explicit `256 KiB` per-call file
bound.
After obtaining only OPFS file metadata, the Workspace Host rejects a larger
file through the existing Pi error type:

```ts
new FileError(
  "invalid",
  "Workspace file exceeds the 256 KiB native Pi read ceiling",
  absolutePath,
);
```

It does so before opening a content stream, slicing or allocating a content
buffer, calling `arrayBuffer()`, or cloning bytes to the Agent Worker. This is
an existing Pi environment failure, not a new SillyOS read schema, and it does
not become the OPFS volume limit.

Checkpoint 3 portable ZIP delivered on 2026-08-27. A user action starts one
independent Host export job only after the
current workspace session has no active Pi run and its requested
`(checkpointId, generation)` still equals the durable head. The control request
returns `started` immediately; a transferred, export-specific MessagePort owns
ordered progress, cancellation, ready/release, and terminal settlement. A
new Pi run is rejected while that job exists. Before release is committed,
Close and Forget abort and drain it instead of waiting behind a long-running
lifecycle command. After release is committed, they await the non-cancellable
finalizing and cleanup settlement before closing the workspace; transport
disposal is terminal failure, not release success.

The job uses the product-lockfile-pinned `client-zip` 2.5.0 writer-only module.
It feeds sorted normalized VFS files through fixed `1 MiB` maximum source
chunks, awaits destination backpressure, and writes STORE-only entries without
compression or a Wasm/worker codec. The source `ReadableStream` uses high-water
mark 0 so `client-zip` cannot prefetch ranges while the destination is stalled.
Source reads and destination writes share the existing `4 MiB` I/O budget;
budget waiters are abort-aware and a source reservation remains held until the
corresponding ZIP destination write settles. Within the admitted file-count
bound, the writer switches to ZIP64 for a `4 GiB` file or local-data offset;
the bound remains below the classic ZIP entry-count limit. It writes directly
to one Host-only OPFS temporary. Before file reads it admits at most
`16,384` VFS files, at most `16,384` visited directories, at most `4,096`
children in any directory, the existing `32`-part / `512` UTF-8-byte normalized
path ceiling, at most `16 MiB` of encoded path/central-directory metadata, and
an exact predicted archive length no larger than JavaScript's safe-integer
range. Empty directories are not portable V1 entries. These are export-worker
memory/number bounds, not workspace-volume or browser-quota claims. A complete
origin storage estimate may reject known-
insufficient temporary headroom; unknown/advisory estimates do not promise
space, and actual OPFS writes remain authoritative for quota failure.

The archive order is canonical: root `sillyos-workspace.json` first, followed by
`workspace/<relative-path>` entries in JavaScript code-unit order. Every entry
uses one fixed local DOS timestamp and fixed file mode, so browser locale and
wall clock do not change the bytes. The manifest is exact and encoded as
compact UTF-8 JSON with one trailing LF and a `1 KiB` encoded ceiling:

```ts
interface SillyOsWorkspaceExportManifestV1 {
  readonly revision: 1;
  readonly kind: "sillyos-workspace";
  readonly exportFormat: 1;
  readonly workspaceFormat: 1;
  readonly programId: string;
  readonly workspaceId: string;
  readonly programRevision: number;
  readonly repositoryRevision: number;
  readonly checkpointId: string;
  readonly generation: number;
}
```

`volumeId` is intentionally absent because it is private Host location
metadata, not portable identity. The archive likewise excludes the Program
database, Creator Chat, credentials, provider data, Pi/provider sessions,
terminal Agent-run receipts, mutation receipts, all OPFS Host metadata, and
export temporaries. The Program authority reloads the continuation immediately
before making the completed archive downloadable; anchor drift, reload failure,
or download-trigger failure cancels the job and suppresses download. Only an
exact recheck followed by a successfully triggered native download can commit
release. This is an exact export anchor, not an IndexedDB +
OPFS transaction, immutable snapshot, or accepted Program revision.

The Host Worker creates the object URL from the completed OPFS `File` and sends
only that URL plus bounded metadata to the page. The page never receives a file
tree, VFS byte chunk, whole-archive `Blob`, or `ArrayBuffer`. A ready job has a
default `30`-second Host watchdog; an absent page decision aborts and cleans the
temporary instead of leaving a live URL. After a successful `<a download>`
click, the page calls `commitRelease()`, enters non-cancellable `finalizing`,
and keeps the Host URL plus OPFS backing alive for the Chromium-evidenced
`1,000 ms` browser handoff before returning `release`. The Host then revokes the
URL, removes the temporary, and only afterward emits terminal `released`.
Before release is committed, cancellation and failure perform the same cleanup
before terminal settlement. A Worker lost before release can leave only that
reserved temporary, which the next volume open removes before admitting another
export. `released` and the UI's “Download started” mean only that SillyOS handed
the file to the browser download pipeline; neither claims that the user selected
a final destination or that the browser finished saving it. A directly selected
`FileSystemWritableFileStream` may be a later feature-detected enhancement,
never the only export path. This checkpoint invokes neither Pi `bash`, Tar,
Git, nor a Wasm payload and adds no import reader or restore semantics.

P3c-B0 acceptance is deliberately bounded:

Delivered checkpoints 1 and 2 provide:

- focused Host/repository conformance for initial ownership, changed and same-
  byte writes, exact durable head/checkpoint identity, interrupted mutation
  recovery, quota/unavailable storage, fresh-lease cold reopen, two-Program
  isolation, anchored continuation, and no per-write IndexedDB/Chat copy;
- real Chromium and persistent-WebKit evidence for origin-wide contention,
  bounded busy admission, automatic lease release after Worker loss, exact-head
  cold reopen by the successor, and explicit non-persistent WebKit OPFS failure
  without substituting a workspace;
- the automated dual-engine corpus of exactly 1,000 `5 KiB` files plus one
  `16 MiB` file (`1,001` files, `21,897,216` bytes, generation `1002`), with
  range/hash verification after Worker termination and cold reopen. Optional
  raw `100 MiB`, `256 MiB`, and larger runs are not closure gates or universal
  quota claims;
- observed `1 MiB` maximum chunks and `4 MiB` maximum SillyOS-managed
  filesystem payload bytes in flight, with the page receiving no volume bytes
  and no whole-volume resident allocation. This is not total heap evidence;
- native Pi `read` rejecting the persisted `16 MiB` file through its fixed
  `256 KiB` metadata preflight before any content read or transfer, without
  treating that wire ceiling as the file or volume limit; and
- an origin-wide advisory storage estimate plus explicit best-effort
  persistence request whose `false` result leaves the workspace open and usable.

Delivered checkpoint 3 additionally proves:

- one canonical streaming ZIP writer whose VFS bytes and bounded non-Chat
  checkpoint/anchor manifest are independently unpacked and byte-checked in
  Chromium and WebKit;
- real cancellation before download and a later native download in each engine
  over the exact `1,001`-file, `21,897,216`-byte corpus, with unchanged durable
  head and exact extracted file bytes;
- bounded, abort-aware backpressure through `1 MiB` source chunks, high-water
  mark 0, and the shared `4 MiB` filesystem I/O budget; bounded progress; no
  whole-archive page payload; and no leaked temporary or object URL after
  cancellation, failure, release, close, or cold reopen;
- the `30`-second ready watchdog plus the non-cancellable, `1,000 ms`
  Chromium-evidenced post-click handoff before Host revoke/delete and terminal
  `released`, without presenting that handoff as a completed user save;
- exclusion scans for Chat, the Program database, credentials, provider data,
  Pi/provider sessions, terminal/mutation receipts, and Host metadata; and
- source/final-graph exclusion of just-bash, Wasm, Git implementations,
  shell/process adapters, Provider/BYO Sandbox code, snapshot publication,
  import/restore readers, and SillyMaker private engine modules.

Those ZIP checks passed on 2026-08-27 and close P3c-B0 with a portable download
claim only. Import, restore, and immutable snapshot publication remain absent.

P3c-B0 does not change P2 accept/reject or make a mutable checkpoint an accepted
Program revision. It does not add immutable snapshots, proposal-generation
publication, artifact admission, import, sync/share, background execution,
network, shell, `edit`, `bash`, just-bash, Wasm, Git, Python, QuickJS, provider
selection, BYO Sandbox, Desktop persistence, a sandbox claim, or an engine API.
No later P3c slice becomes active when B0 closes.

### P3c-B1 — exact reviewed snapshot publication (delivered 2026-08-28)

P3c-B1 closes the first integrity gap created by real workspace tools: Pi may
change the durable mutable head, while the current Accept action still names
only `(proposalId, programRevision)`. The existing fixed `pi-test` journey is
the consumer: its admitted `write -> edit -> read -> bash/rg -> proposal` path
finishes at one exact durable head. Accept must eventually publish those exact
bytes, not whichever head happens to exist when a later operation settles.

The Browser implementation first uses a Host-owned immutable snapshot
candidate. It is not another live volume, repository row containing file
bytes, or in-memory clone. Before archive I/O, the Workspace Host writes one
compact prepare marker that owns the volume's only unpublished candidate. It
then streams one run-quiescent `(checkpointId, generation)` through the already
bounded canonical STORE-only archive writer directly into that candidate's
OPFS package. A second compact commit marker is written last, after the archive
writer closes and its exact length is re-read. A product-attempt-generated
opaque `snapshotId`, admitted before Host I/O, plus the committed receipt names the
Program/workspace/volume, proposal, Program revision and
`baseRepositoryRevision`, workspace
format, durable head, file count, and byte length. Only a complete artifact and
valid marker are reopenable. There is no mutation method for a snapshot.

Checkpoint 1 allows at most one complete, unpublished snapshot candidate per
Program volume. Repeating the same `snapshotId` and exact prepare envelope is
idempotent; any different ID or field is rejected until the current candidate
is explicitly discarded. This bounds retained duplicate bytes without guessing
whether an unpublished candidate was accepted.

The V1 prepare marker is compact UTF-8 JSON with exact keys
`revision`, `snapshotId`, `programId`, `workspaceId`, `volumeId`,
`workspaceFormat`, `proposalId`, `programRevision`,
`baseRepositoryRevision`, `checkpointId`, and `generation`. The V1 commit
marker is the exact snapshot receipt: it has those keys plus `fileCount` and
`archiveBytes`. Both markers have revision 1, exact-key admission, and an
encoded ceiling of `2 KiB`. The prepare marker lives at the volume control
root; the commit marker lives inside `snapshots/<snapshotId>/` and is the only
candidate commit point. Prepare, query, and discard run only under the current
origin-wide volume lease and must match that volume's Program/workspace
identity. The candidate includes exactly the portable V1 VFS file set,
including workspace-local scratch that exists at the selected head; Host
control, export temporaries, and snapshot temporaries live outside that VFS and
are excluded.

OPFS and IndexedDB remain separate durability authorities. B1 does not pretend
they share a transaction:

```text
quiesce + recheck review/head
  -> Host close and re-read immutable snapshot candidate
  -> Repository CAS rechecks proposal / Program / repository / continuation
  -> one accepted decision publishes the exact snapshot receipt
  -> reload reconciles exact snapshot identity after an unknown outcome
```

A stale proposal, repository revision, continuation, checkpoint, generation,
active Agent run/tool/export, quota failure, invalid marker, or missing artifact
publishes nothing. The previous accepted revision and mutable draft remain.
Complete unreferenced prepares are not guessed to be accepted: the later
publication checkpoint either matches and publishes their exact identity or
explicitly discards them. Incomplete Host artifacts are crash debris and are
removed before another snapshot operation. Missing bytes for a published
reference fail closed as recovery-required rather than silently accepting the
mutable head.

P3c-B1 is deliberately split into independently reviewed checkpoints:

1. **Checkpoint 1 — Host immutable snapshot candidate.** Add only the product-private
   Host/OPFS prepare, query, and explicit discard contract. Prove exact-head and
   run-quiescent admission, streaming bounds, archive-close-before-commit-marker ordering,
   cold reopen, idempotent exact-identity query, immutability after later draft
   mutation, interrupted-artifact cleanup, two-Program isolation, and no page
   or IndexedDB file-byte copy. No production Accept path calls it yet.
2. **Checkpoint 2 — publication transaction.** Cleanly replace the preview
   repository schema with one exact accepted-snapshot reference per accepted
   decision, bind every durable pending proposal to the workspace head reviewed
   when that proposal became current, and compose Host prepare with Repository
   CAS and unknown-outcome reconciliation. Reject remains a decision with no
   snapshot. A known conflict explicitly discards only the unpublished prepare
   owned by that failed attempt. Because the replacement schema no longer admits
   an accepted decision without a snapshot, this checkpoint also switches the
   existing Controller Accept command to the complete non-visual publication
   composition; it does not leave a dormant second decision path for checkpoint
   3.
3. **Checkpoint 3 — product evidence (delivered 2026-08-28).** Keep the existing Accept control and add
   the accepted snapshot identity/head plus truthful mutable-head divergence,
   then prove stale cross-page Accept rejection, cold reopen, later-draft
   independence, and exact archive bytes for the existing `1,001`-file,
   `21,897,216`-byte corpus in Chromium and persistent-profile WebKit.

Checkpoint 2 is itself bounded by three independently reviewed sub-checkpoints.
C2a–C2c and checkpoint 3 are delivered. Their committed baseline was published
and smoke-verified from the public Cloudflare origin on 2026-08-28:

1. **C2a — Host publication lifecycle (delivered 2026-08-27).** Move the exact immutable receipt to a
   target-neutral SillyOS workspace contract shared by Host wire and the later
   Repository. Cleanly replace the ID-requiring candidate query with the
   unambiguous query for the volume's sole unpublished candidate; add exact
   retained-package verification and an idempotent adopt operation that removes
   only the unpublished ownership pointer after re-reading the commit plus
   archive length. Adopt keeps `snapshots/<snapshotId>/workspace.zip` and its
   commit receipt. Discard may delete only the exact pointer-owned unpublished
   package and becomes a no-op once that package is retained. Prepare refuses
   to overwrite any retained package with the same ID. Candidate creation also
   returns its already-written exact initial durable head, and a separate
   run/export/publication-quiescent capture operation returns the authoritative
   head for a later proposal-producing mutation; ordinary page state is not a
   review receipt.

   A prepare that materializes a new candidate owns one transient Host
   publication fence for that exact receipt until adopt, discard, or session
   close; an exact retry in that already-fenced session retains the fence. A
   reopened existing candidate does not acquire it. The fence rejects a new
   Agent run, export, or different publication attempt after prepare and before
   Repository settlement; same-envelope retry remains idempotent. Session close
   abandons only this in-memory fence and neither adopts nor discards the durable
   candidate. Because checkpoint-1 exact prepare intentionally reopens an
   existing candidate even after mutable-head drift, recovery uses a distinct
   exact `resume publication` mutation: it verifies the unpublished receipt,
   re-reads the live head, requires that head to equal the receipt/review binding,
   and only then reacquires the fence. Repository CAS is forbidden without that
   fence. Adopt reports `adopted` or `already_retained` only after full receipt
   and archive-length verification; discard reports `discarded`, `absent`, or
   `retained` and never silently deletes retained bytes. Focused OPFS/runtime/protocol/Page-port
   tests prove cold discovery without a known ID, retained reopen, ID collision
   rejection, lost mutation outcomes, and the critical-section fence. C2a adds
   no Repository row, Controller call, UI, or browser E2E.
2. **C2b — exact Repository replacement (delivered 2026-08-28).** Replace Aggregate V2 with V3,
   physical IndexedDB V3 with a clean-reset V4, and Worker V3 with V4; delete
   the superseded product-private schemas and readers. Aggregate V3 owns one
   proposal-scoped, target-neutral review binding containing proposal/Program
   identity, the base accepted Program revision, repository revision,
   workspace/volume/format, and exact checkpoint/generation. Accepted and
   rejected decisions are exact discriminated shapes: accepted contains the
   complete snapshot receipt; rejected has no snapshot field. Initial creation
   stores aggregate, continuation, and initial reviewed head in one two-store
   transaction. A proposal-producing revision stores its already-captured
   run-quiescent head in the same transaction; a non-producing Agent terminal
   retains the prior proposal's reviewed head, so later head divergence is
   stale rather than silently re-labelled as reviewed. Every Program mutation
   advances the continuation and the review binding's repository currentness
   together. The accepted CAS requires the receipt head to equal the durable
   review binding and its `baseRepositoryRevision` to equal the exact pre-state.
   A fresh V4 database is created directly; exact physical V3 is deleted and
   rebuilt without row conversion; malformed, unknown, or future schema fails
   closed. OPFS is outside that reset and is neither scanned nor guessed into
   the new catalog. A pending proposal always has one review binding; an accepted
   or rejected proposal always has none because the decision is then the
   historical evidence. `baseAcceptedProgramRevision` is null for the first
   proposal and otherwise equals the latest accepted decision's Program
   revision; Reject never advances it. Every V3 Program row has exactly one
   continuation row, and the detached insert-continuation mutation is deleted.
   Missing, orphaned, or mismatched aggregate/continuation pairs fail as
   `schema_invalid` on every load and mutation.

   The exact Aggregate V3 property is `reviewBinding`. It is non-null exactly
   while the current proposal is pending and otherwise null. Its exact flat
   fields are `proposalId`, `programId`, `programRevision`,
   `baseAcceptedProgramRevision`, `repositoryRevision`, `workspaceId`,
   `volumeId`, `workspaceFormat`, `checkpointId`, and `generation`.
   `baseAcceptedProgramRevision` is the only nullable field. The exact accepted
   decision property is `snapshot`; it contains the complete target-neutral
   `ProgramWorkspaceSnapshotReceiptV1`. The rejected decision shape omits
   `snapshot` entirely rather than storing null. These names are product-private
   durable schema, not a Browser Host wire or public engine API.
3. **C2c — product-owned composition and atomic cutover (delivered 2026-08-28).** Make one application-owned Browser
   Program Workspace Authority serve both fixed Pi and the Controller. The
   Controller no longer creates or disposes a separate Repository client; the
   shared authority owns Repository plus Host and is disposed last by the
   application. Agent Forget drains and detaches only its Pi attachment. It may
   neither close nor dispose the shared Host while review/publication is active;
   Forget, Home, and route close wait or return busy through the authority, which
   serializes final session close. Application disposal stops admission, drains
   Pi, settles publication, closes the Host session, and disposes the shared
   authority/Repository last. Proposal-producing Controller mutations obtain the authoritative
   Host head before their Repository CAS, including the initial candidate head,
   so a pending proposal is never durably created without its review binding.
   Accept discovers or creates the sole exact candidate, reacquires the Host
   publication fence, rechecks current proposal/repository/continuation, commits
   the accepted receipt, reconciles an unknown result by fresh Repository load,
   and only then adopts. Exact durable accepted receipt is the recovery truth:
   missing or corrupt retained bytes are `recovery_required`, never a mutable-
   head fallback. A proven conflict may exact-discard; an unknown Repository
   outcome or durable accepted reference never may. Reject performs only its
   Repository decision and contains no snapshot; after a durable Reject, an
   unrelated failed Accept candidate may be exact-discarded only after proving
   that no decision references it. Focused composition/Controller tests replace
   the old Accept behavior without adding snapshot identity UI. C2b is an
   internal conformance/review boundary, not a deployable half-product: C2b and
   C2c land in one production cutover that selects V3/V4, resets the preview DB,
   and deletes V2/V3 only after the shared authority can create and revise V3
   Programs. No long-lived dual reader or fallback is committed.

   Initial creation is exact: stage the Program/workspace identities, create a
   candidate volume and its exact initial head under the bootstrap lease, then
   create aggregate + continuation + review binding in one Repository
   transaction. An unknown result reloads both rows; only exact durable
   ownership permits open/attach, while a known conflict discards only the
   unowned candidate. A follow-up or successful Agent terminal captures a Host-
   linearized quiescent head after the run ends, then stores that head with the
   successor in one transaction. The authority serializes a new Agent submit
   until that mutation settles.

   C2c is not deployed or advertised as a user-reachable product checkpoint on
   its own. Checkpoint 3 supplies the real Browser acceptance before the changed
   Accept path is deployed; focused C2 composition tests are not presented as
   Browser product evidence.

C2b and C2c closed together after independent Repository, Controller, Authority,
and product-integration reviews. The clean cutover deletes Aggregate V2, selects
the exact two-store V3/V4 pair, verifies every accepted historical receipt, and
routes real `CreatorAgentPort` submit through the same Authority serialization as
review-head capture and Repository CAS. Focused Repository/Worker/Controller/
Authority/Pi coverage passes 81/81; the complete SillyOS unit suite passes
237/237, along with typecheck and the production build. Review-found regressions
now pin disposed Controller admission, cold Reject cleanup, all-history accepted
recovery, exact create ownership after unknown or mismatched outcomes, and the
Agent-submit fence. Checkpoint 3 subsequently replaced that code-only disposition
with the Browser evidence below; deployment still occurs only from its committed
baseline.

Checkpoint 3 passed on 2026-08-28. The UI retains the existing Accept control
and now projects the latest accepted snapshot receipt, pending reviewed head,
and observable mutable head. A newer live Pi execution generation immediately
marks the review changed without presenting an old checkpoint as current; a
failed or unavailable Host makes currentness unavailable. Historical accepted
identity remains visible across later pending or rejected revisions. Chromium
and persistent-profile WebKit each accepted the generation-1002 corpus,
advanced an independent pending v3 draft to generation 1005, rejected stale v2
Accept while the winner page still owned the Host, cold-reopened the winner,
and directly verified the retained immutable package. In both engines the
mutable export and retained package were exactly `22,065,863` bytes; the ZIP
manifest names Program v2/base Repository revision 2, all `1,001` VFS entries
match byte-for-byte, and the later-draft file is absent. The physical ZIP read
is test-only OPFS evidence, not a user-facing accepted-snapshot download API.
The final product gate also passes the complete 23-file SillyOS unit suite
(`250/250`), focused Repository/Authority/Controller checks (`89/89`), targeted
independent re-review checks (`66/66`), the remaining Chromium/WebKit file
matrix (`23` passed, one intentional non-applicable skip), mobile portrait
(`1/1`), canonical typecheck, scoped lint/style/format, and the release build.

The shared receipt has exactly the checkpoint-1 fields: revision,
`snapshotId`, Program/workspace/volume/format identity, proposal and Program
revision, `baseRepositoryRevision`, checkpoint/generation, file count, and
archive length. The Repository does not import a Browser Host protocol, and
the Host does not import Repository code. The product-private coordinator is
the only OPFS/IndexedDB composition owner; React, Pi, and SillyMaker never own a
snapshot ID or imitate a cross-store transaction.

The exact recovery table is deliberately small:

| Repository truth                                                  | Host truth                      | Required action                                                                   |
| ----------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------- |
| any admitted decision history contains the exact accepted receipt | exact unpublished candidate     | adopt                                                                             |
| any admitted decision history contains the exact accepted receipt | exact retained package          | succeed                                                                           |
| any admitted decision history contains the exact accepted receipt | missing/corrupt/different bytes | recovery required; never discard or fall back                                     |
| exact decision pre-state                                          | exact unpublished candidate     | retry only after exact head-equal resume; otherwise exact discard or report stale |
| exact decision pre-state                                          | no candidate                    | prepare only if live head still equals the durable review binding                 |
| exact decision pre-state                                          | retained package                | recovery required; never infer an accepted decision                               |
| unknown or unavailable Repository truth                           | any candidate/package state     | preserve bytes and retry the exact query; never discard                           |
| durable state proven not to reference the receipt                 | exact unpublished candidate     | exact discard, then report conflict                                               |

No retained package is automatically adopted, deleted, enumerated, or attached
to another Program merely because it exists.

Checkpoint 1 delivered on 2026-08-27. Its product-private typed control admits
prepare, nullable exact query, and receipt-CAS discard. OPFS writes the sole
unpublished ownership pointer before archive I/O, streams the canonical archive
directly into a per-identity Host-private package, and writes the exact commit
receipt last after close and length verification. Exact same-envelope retry is
idempotent even after the mutable head advances; another envelope is rejected
until explicit discard. Cold reopen preserves only a complete candidate,
cleans an unmaterialized pointer or invalid/incomplete commit, and fails closed
when committed identity or archive bytes disagree. Focused protocol, Page-port,
runtime, and OPFS tests cover lost-outcome classification, run/export fencing,
quota cleanup, later-draft independence, same-ID two-Program isolation, and
discard ordering. An independent storage/runtime review found no remaining
blocker. This closure does not activate checkpoint 2, Accept publication, a
repository schema, or UI.

Checkpoint 1 is delivered. The owner activated checkpoint 2 on 2026-08-27 after
focused Repository, composition, and persistence audits of checkpoint 1. Those
audits reproduced the missing candidate discovery, retained adoption, durable
review binding, exact decision reconciliation, and prepare-to-CAS fencing
requirements above. C2a then delivered the target-neutral receipt, exact
candidate and retained-package queries, initial candidate head, review-head
capture, explicit head-equal publication resume, typed adopt/discard, and the
transient Host publication fence. Focused protocol, Page-port, runtime, OPFS,
authority, and Pi-worker tests pass, including lost-response classification,
cold reopen, retained-package survival, retained-ID collision, successful and
stale resume, run/export fencing, and the fail-closed package-then-pointer
discard cleanup boundary. Three independent read-only reviews found no blocker;
one recorded that a failed pointer removal deliberately needs cold reopen after
the package has already been removed, and the focused fault-injection test now
pins that recovery. C2a adds no Repository row, Controller call, UI, or Browser
product claim by itself. C2b and C2c subsequently closed as one internal cutover
on 2026-08-28 after focused and independent review. Checkpoint 3 then closed
P3c-B1 with identity/head/divergence presentation and real cross-page/dual-browser
product acceptance. The complete cutover was rebuilt from the name-only
deployment commit `60bbb4f559a001e59a4e470e30a7f4808d440ce3` and deployed to
`https://silly-os.jasl9187.workers.dev` as Cloudflare version
`919cb0a4-d510-452a-b73d-79070ec8e35e`; no later feature is implied.
P3c-B1 adds no archive import/restore reader, artifact admission, sync/share,
background execution, provider selector, custom endpoint, broader shell or
process provider, Wasm, Git implementation, Python, QuickJS, BYO Sandbox,
Desktop persistence, Pi extension composition, OpenUI, or SillyMaker engine
API.

#### Later P3c slices (inactive)

Admitted artifact references beyond the reviewed snapshot, import/restore,
Desktop volume parity, and any larger-file Pi tool requirement each need a
separately reviewed slice with a real consumer. Broad shell/process/provider
selection remains P3b work; it is not retroactively folded into persistence.

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
