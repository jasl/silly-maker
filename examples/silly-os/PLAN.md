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
The B1b release gate passed 27 files / 270 product tests, the Settings
journey in both engines, and the complete 5-profile × 2-browser real-Provider
matrix.
The clean B1b implementation commit
`d7377ad36f27b982c8d6f87662e8a8586687f721` is now deployed to the canonical
origin as Cloudflare version `92c143f7-292f-474f-b7ad-ba98318a384a`. Public HTML
returns HTTP 200, that exact build identity, and only the six named Provider
origins under `connect-src`; the application browser shows five exact qualified
profiles and the two intended candidates. All ten public-origin real-Provider
journeys pass. The deployment gate and B1b are therefore closed. The owner then
activated B1c as bounded Provider/settings checkpoints. Its model-preference
surface and Browser security floor are delivered. B1c-S0 closed locally after
the matching WebKit production-response smoke completed on
2026-08-28 after the already-passing source, build, Wrangler-response, and
Chromium gates. The resulting commit
`a4cc8754b4c5f3050ff270a7c5a426b6c0d18176` is deployed to the canonical origin
as Cloudflare version `e1808054-af9f-446f-a913-22a39bf98e37`; its exact build
identity, response policy, Home, and Settings catalog pass in public Chromium
and WebKit. S1a-0's independent-origin topology qualification has closed
locally. S1a-1's source cutover is now assembled: the independent-origin
transport is the ordinary Authority, physical Product Repository V5
clean-resets preview V4, production composition is build-identity-locked and
fail-closed, download stays inside the Sandbox origin, and the same-origin Host
Worker is deleted. The ordinary Chromium and persistent-WebKit acceptance now
passes, so S1a-1 is closed locally. The owner then activated the Agent/harness
lane while the main UI framework remains intentionally out of scope. **S1b-1
is now closed locally:** the deterministic fixture drives fixed Pi's native
`write -> edit -> read -> proposal` through the independent-origin Sandbox,
and the exact edit bytes, generation 3, receipt, and cold reopen pass in both
Chromium and persistent-profile WebKit. S1b-2 then closed native `bash` for the
deterministic fixture only. S1b-3 is also closed locally: live and deterministic
Pi runs receive the same four native tools plus one fixed structured `grep` Pi
`AgentTool`. A real Chromium Anthropic journey proves an exact `write`
mutation, resulting Sandbox bytes, and currentness; it does not prove
real-model `read`/`edit`/`bash`/`grep`. **S2-Q1 is delivered and closed locally
on 2026-08-29:** one product-shipped synchronous `qjs` command sits below Pi native
`bash`, uses a fresh fixed child Worker and explicit text staging, and has
passing focused plus Chromium/WebKit harness evidence. The exact 10-file
Sandbox graph, lazy load after `bash true`, fresh Host/dedicated Pi-harness
Worker cold reopen, and
control-build QuickJS/Wasm exclusion gate all pass. Python, broader Wasm and
editor integration remain separate inactive
checkpoints. Earlier B1c Provider counts
are dated evidence for their pre-security snapshot
and do not by themselves accept the current overlay. Current source still does
not add OAuth, multi-field cloud credentials, a Provider relay, authenticated
downloads, HTTP requests, arbitrary headers, or a second Provider runtime, and
it does not claim real custom-endpoint qualification until an exact custom route
passes the later deployed-origin gate. S2-N0/N1/N2 and S3 are closed and
deployed on 2026-08-29:
its fixed `fetch_url` and keyless Network Broker admit one exact approved HTTPS
text request, including LAN/private destinations when the Browser permits it.
N1 adds explicit revocable Program grants, N2 adds bounded streamed download to
the current Workspace, and S3 adds opt-in encrypted credential persistence.
The build-matched control, Workspace Sandbox, Broker, and Vault release is
recorded below; it does not activate search, authenticated network, or
public-origin real-model/network-tool qualification.
The owner then accepted S3-R1 as the next clean replacement. Current source now
uses durable automatic device-key unlock by default, gives Password
mode explicit Lock/Unlock, persists Provider keys until Forget/site-data
clearing, and separates Settings/Provider/model/Test semantics. Its focused
contracts and combined Chromium/WebKit product journeys now pass, so S3-R1 is
closed. The owner then accepted and closed S2-N3 as the clean replacement:
remove all network-tool approval/grant/retry behavior and replace it with one
default-off, durable Program **Allow network access** boolean. Provider egress
stays independent. The current `a17c3490` deployment carries both replacements.
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

At most one phase below is active at a time. P1-B1a, P1-B1b, B1c-S0, S1a-0,
S1a-1, S1b-1, S1b-2, S1b-3, S2-Q1, S2-N0/N1/N2/N3, the original S3, S3-R1,
D1, P1-B1d reasoning effort, and E0 engine-baseline absorption are closed. The current
local source is rebased onto engine baseline
`31461f362129e6192f70553a261ada225c2abf8b`. DS1 is the current active product
phase: DS1a and DS1b are delivered, while DS1c–DS1e remain active-plan work. No
Mod phase is active. The current build-matched
three-origin artifact and fixed Vault Worker are deployed from commit
`a17c3490c9940bb43fc8718df485322c2dee1052` (Sandbox
`fb703131-3e37-4e7d-95f4-5b7afa9160cd`, Broker
`07720852-ac1f-462b-8098-086410906839`, control/Vault
`e0b61061-1a07-4e64-a963-74a0a7ee6420`). That release includes the S3-R1,
S2-N3, D1 Browser data-management, and Pi reasoning-effort clean replacements.
D2 remains inactive. The post-Q1 Browser
Workspace namespace/file slice is implemented and locally
verified. N0's exact **Allow once** and N1's Program grants remain historical
delivery records; N2 added bounded remote download, and S3
records the dated delivered opt-in passphrase Vault. Current local S3-R1 source
clean-replaces those credential/Settings semantics, while S2-N3 clean-replaces
the approval/grant network semantics. The S3/V1 and N0/N1 behaviors remain
historical deployment records rather than compatibility paths. R1
does not activate search or authenticated network. Deployment remains a
separately recorded release operation. The public `a17c3490` origin passed the
opt-in real QJS Agent-loop qualifier with Anthropic `claude-sonnet-4-5` in
Chromium: invalid-key 401, valid connection 200, cancel/currentness, four
successful completion requests, exact `write`/`write`/`bash-qjs` receipts,
Sandbox-origin assets and VFS bytes, no key in the inspected control-origin
durable projection, Worker termination, and retained output after Forget. This
does not qualify WebKit public-origin use, cross-reload durable-key reuse, live
reasoning effort, or network tools. A later phase may be refined before it
starts, but it may not
silently weaken this product model or claim evidence that an earlier phase did
not produce. Product code may not import the ignored `references/` checkouts.

Until the first stable release, every phase also follows DESIGN's clean
replacement rule: breaking product-private contracts may reset preview data,
and the same slice deletes the superseded implementation, types, fixtures, and
tests. Do not retain compatibility shims, dual schemas, deprecated aliases, or
fallback behavior merely to preserve an earlier preview.

## Engine absorption and product design-system sequence

The owner activated this narrow lane on 2026-08-30 after the main engine/UI
work closed. It absorbs only implemented public contracts whose ownership is
already neutral. It does not move Program, Pi, Provider, credential, Workspace,
Sandbox, or product workflow semantics into SillyMaker.

### E0 — current engine baseline and UI foundation (closed locally 2026-08-30)

E0 rebases the complete SillyOS product series onto exact engine baseline
`31461f362129e6192f70553a261ada225c2abf8b` while retaining a named pre-rebase
recovery branch. It accepts the upstream async GUI disposer and external
version stamp as equivalent superseding implementations rather than replaying
product copies. The first deliberately bounded UI slice then:

1. consumes the GUI Host's automatically loaded `@sillymaker/ui/styles.css`
   foundation and binds the SillyOS light palette, typography, density, focus,
   radius, and neutral semantic aliases only at
   `[data-application-id="example-silly-os"]`;
2. removes document-global product palette/reset authority while retaining the
   exclusive Host's pre-mount light `color-scheme` selection;
3. composes the existing product `SillyButtonV1` variants over the public
   `@sillymaker/ui` `Button`, preserving the current product API and visual
   contract instead of rewriting screens;
4. keeps reduced-motion and focus behavior under the engine foundation so
   embedded Tool Theme surfaces can rebind their neutral tokens; and
5. consumes the engine's logical safe-area tokens instead of repeating
   physical `env(safe-area-inset-*)` reads; and
6. preserves the full SillyOS Agent/Provider/Workspace contracts and final-
   graph boundaries.

E0 does **not** claim a complete design system, visual redesign, Mod consumer,
or deployed release. Its acceptance is the rebased product/unit/build/security
gate plus a real computed-style Browser check for product-scope colors, normal
and compact control geometry, focus tokens, and reduced motion.

### DS1 — SillyOS component and pattern system (active; DS1a and DS1b delivered 2026-08-30)

The owner has activated DS1 as a product lane. It inventories the real Creator,
Settings, Workspace, Chat, review, progress, empty/error, and overlay states,
then converges them in bounded screen slices while retaining the accepted
keyboard, IME, focus, anti-clipping, responsive, reduced-motion, and mobile
contracts. The complete lane owns product semantic tokens, component variants,
composite patterns, content rules, accessibility states, and visual regression
fixtures; activation is not evidence that those migrations are already
complete.

DS1 selects product-scoped Tailwind CSS 4 utilities with a `sos:` prefix and no
Preflight/global reset. Tailwind is a build-time styling aid rather than a
runtime product or engine contract. The accessible menu, selection, and related
composite interactions follow current shadcn composition patterns over focused
Radix packages, but SillyOS owns their source, semantics, tokens, and visual
recipes. Modal confirmation uses native `dialog` behind the same product-owned
composition: the evaluated Radix alert-dialog path injected dynamic scroll-lock
styles and therefore did not satisfy the fixed control-plane CSP. The shadcn
registry and DaisyUI are not additional runtime design authorities, and
generated global `:root`, `html`, `body`, custom-property registrations, or
unscoped element styles are inadmissible.

The active sequence is:

1. **DS1a — theme and chrome foundation (delivered 2026-08-30).** Add one
   product-owned preference authority for `system`, `light`, or `dark` theme
   mode and interface locale; persist those non-secret preferences on the
   device and propagate changes to other live tabs. Map complete light and dark
   semantic tokens at the SillyOS application boundary, react to system-theme
   changes when `system` is selected, and keep pre-mount `color-scheme` aligned
   with the resolved theme. Add an internal product overlay host so portals do
   not escape the application token/focus boundary. Replace the separate
   language and Settings actions in each product bar with one keyboard-
   accessible product menu containing Theme, Language, and Settings. General
   Settings consumes the same theme and locale authority. Existing reachable
   surfaces must remain legible and operational in both resolved themes even
   where their structural component migration is deferred.
2. **DS1b — shared primitives (delivered 2026-08-30).** Converge the currently repeated Button,
   IconButton, field, native-select, segmented/toggle, tabs, menu, dialog,
   status, progress, and overlay roles behind product-owned components. Reuse
   the public SillyMaker physical primitives where their contract fits and use
   focused Radix behavior where an accessible composite interaction is needed;
   do not maintain parallel hand-written and shared implementations after a
   consumer has migrated. The deliberately bounded **DS1b-1** checkpoint is
   delivered: product-owned Button/IconButton, Input/InputGroup, Field,
   NativeSelect, Card, Badge, Status, and Tabs recipes now use one semantic
   token/state vocabulary. Settings is their first complete stable consumer,
   while all current product Button/IconButton consumers use the same physical
   layer. The retired `controls.tsx` wrapper and superseded control selectors
   are removed. Surface layout rules load after component recipes and retain
   authority over responsive geometry, including the established mobile touch
   targets. The bounded **DS1b-2** checkpoint is also delivered: one
   product-local native Textarea owns shared multiline-input state and one
   product Progress recipe wraps the public SillyMaker `ProgressMeter` contract.
   Creator Home and Workspace Chat retain their own composer geometry and IME/
   Enter behavior; ZIP export and the visible Program meter now share native
   progress semantics without copying the engine's range/accessibility checks.
   The closing **DS1b-3** checkpoint adds one native Checkbox recipe for Program
   network access and Provider model visibility, and routes the query-gated Pi
   test password field through the existing Input recipe. Hidden file inputs
   remain native platform controls because they have no visible recipe and are
   activated through named product Buttons. This closes visible physical
   primitive convergence. Navigation rows, Provider rows, loading/empty states,
   and workflow composition stay explicit for DS1c rather than becoming a
   generic Settings framework.
3. **DS1c — product patterns.** Converge the Creator composer, model/reasoning
   pickers, settings rows, Provider connection controls, proposal/review cards,
   navigation, workpiece, and empty/error/loading states. Product vocabulary
   and workflows remain explicit rather than hidden behind a generic widget
   framework.
4. **DS1d — surface convergence.** Migrate Creator Home, all three Settings
   categories, Chat, Workspace View, and Activity in independently reviewable
   slices. Each slice removes superseded selectors and recipes after its real
   consumers move; the monolithic stylesheet is a migration source, not a
   second permanent design system.
5. **DS1e — closure.** Remove the remaining duplicate product controls and
   dead styles, reconcile responsive and content fixtures, and run focused
   component contracts plus Chromium/WebKit keyboard, contrast, theme,
   anti-clipping, and visual-regression evidence. Only then may DS1 be marked
   complete.

DS1a is deliberately bounded: it does not redesign Creator/Workspace
information architecture, migrate every screen component, activate a Mod,
alter Agent/Provider/credential/Workspace contracts, or introduce a public
SillyMaker theming/component ABI. It is accepted only after focused preference,
cross-tab, menu/dialog, token-scope, and system-theme contracts pass together
with the existing SillyOS suite/build/security gates and real Chromium/WebKit
rendered checks.

DS1a delivered that boundary on 2026-08-30. One strict non-secret preference
repository now owns theme mode and locale with cross-tab propagation. An
explicit locale query remains navigation-local and does not rewrite or yield to
the stored preference. A fixed same-origin parser-blocking bootstrap restores
the admitted saved theme before the deferred application entry without adding
inline executable code; the build contains exactly one mutable theme-color
metadata owner. The shared product menu, General controls, application-local
overlay host, native confirmation dialog, semantic light/dark roles, and
responsive focus geometry are live. Tailwind emits only `sos:` product
utilities: the build gate rejects generated theme roots, universal `--tw-*`
fallbacks, and global `@property --tw-*` registrations.

Closure evidence is 70 SillyOS unit files / 576 tests, root typecheck and
type-aware lint, Stylelint, the Browser control-plane build/security boundary,
and the focused settings/theme/locale/menu/dialog suite in both Chromium and
WebKit (10/10), including live `matchMedia` and cross-tab `storage` changes. A
separate in-app Browser pass checked the dark Creator, General,
unified menu, native modal backdrop/focus, and desktop layout. DS1 remains
active: DS1c–DS1e still own pattern, surface, dead-style, and visual-fixture
convergence, so the delivered DS1 checkpoints do not claim that all product
components have already migrated.

DS1b-1 delivered on 2026-08-30 without changing Settings information
architecture, Provider/credential behavior, product flows, or an engine API.
Its behavior contracts cover Button/IconButton semantics, explicit Field and
Status accessibility, Tabs roving focus, unique Credential Vault destructive
action names, and component/layout cascade order. The current combined evidence
is 70 SillyOS unit files / 583 tests, root format/type-aware lint/Stylelint/
typecheck, all three Browser artifact boundary builds, the focused theme/menu/
Settings suite in Chromium and WebKit, and a real in-app Browser pass over
General, Providers, Credential Vault, dark theme, and the narrow Provider
master/detail flow. Layout and product-flow redesign remain later surface work.

DS1b-2 delivered on 2026-08-30 without changing composer behavior, Workspace
export semantics, product layout, or an engine API. `TextareaV1` replaces the
two parallel raw composer textareas while surface CSS retains their responsive
geometry. `ProgressV1` composes the public `@sillymaker/ui` `ProgressMeter` for
the bounded ZIP export and the visible 68% Program meter, preserving exact
accessible names and value text. The combined product unit gate is now 70 files
/ 586 tests; focused Chromium and WebKit rendered checks pass for both
composers, the Program meter, and the complete cancel-then-download ZIP flow
(4/4). All three Browser artifact boundary builds also pass for the committed
clean identity. Loading/empty patterns, navigation, and Provider rows remain
later bounded work.

DS1b-3 closes shared physical primitive convergence on 2026-08-30 without
changing Program network semantics, Provider model preferences, the query-gated
test runtime, product layout, or an engine API. `CheckboxV1` fixes native
checkbox type/ref/state semantics and owns the common product size/accent
recipe; the Program network and Provider model consumers retain their own
labels, disabled rules, and mutations. The test-only password field now uses
`InputV1`, while hidden file inputs remain explicit native exceptions. Focused
behavior and structural guards cover those boundaries. The combined product
gate is 70 files / 588 tests; root format, type-aware lint, Stylelint, and
typecheck pass; the Provider-model and Program-network rendered flows pass in
Chromium and WebKit (4/4); and an in-app Browser pass confirms desktop/narrow
geometry, keyboard focus, state change, and no page overflow. All three Browser
artifact boundaries pass before commit; the closing identity is rebuilt and
rechecked after commit. DS1c–DS1e remain active product work.

SillyMaker remains the home only for neutral primitives and interaction
mechanics that can be reproduced without SillyOS vocabulary. A DS1 discovery
may be proposed upstream only when it is a neutral general capability gap and
has an independent second real consumer (or a demonstrated engine-wide
baseline need); any engine correction is reviewed and delivered in its own
lane. SillyOS palette, theme recipes, branding, Provider/Program semantics,
settings information architecture, Creator composers, workpiece layouts, and
product-specific component recipes stay in `examples/silly-os`. Product-only
Tailwind/Radix dependencies do not enter the engine packages merely because
SillyOS uses them.

### M0 — first SillyOS public Mod consumer (inactive and evidence-gated)

The focused public `@sillymaker/composition/mod` runtime is now available, but
SillyOS does not select it merely because the engine can. A Program, Pi
extension, Workspace file, generated application, suggested capability, QJS
output, and OpenUI artifact are not SillyMaker Mods. The first valid consumer
must be a product-shipped, lockfile/build-known capability that genuinely needs
independent selection, replacement, diagnostics, or structural exclusion.

The smallest candidate is a future presentation-only capability behind a
closed admitted UI artifact catalog. It requires a literal trusted catalog, a
SillyOS-owned React commit acknowledgement, failed-candidate predecessor
retention, awaited cleanup, inert generated strings, and unselected final-graph
exclusion. It receives no Pi, credential, repository, Workspace, network, DOM-
owner, or mutation authority. No such consumer exists today, so the correct E0
result is structural exclusion rather than a synthetic Mod framework.

## Browser security and execution sequence

The owner accepted this sequence on 2026-08-28. It is the implementation order
for Browser credentials, Agent tools, Workspace execution, generated content,
and later product families. It keeps Pi as the only Agent/tool/plugin authority
and keeps every adapter in `examples/silly-os`; it does not activate a public
SillyMaker sandbox, Agent, Provider, or credential API.

### B1c-S0 — trusted control-plane floor (closed locally 2026-08-28)

S0 first records the controlling security-plane trust model and prevents the current product
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
   S0 temporarily allowed the product-owned deterministic fixture to retain the
   fixed legacy tool conformance; no live model, user plugin, project code, or
   imported code could use that same-origin Host. S1a-1 has since deleted it; and
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
rendering/response result. The same exact policy and behavior then passed at
the canonical Cloudflare origin for commit `a4cc8754` in Chromium and WebKit;
WebKit again produced only those seven expected diagnostics. S0 and its release
operation are therefore closed.

S0 proves only the named response, rendering, protocol, secret-absence, and
fail-closed properties. It does **not** prove an independent Sandbox, physical
Workspace storage isolation, an encrypted Credential Vault, redirect handling,
complete XSS resistance, Linux, Wasm, Python, QuickJS, import/restore, or live
workspace tool behavior.

### S1 — independent-origin Workspace authority (closed locally)

Choose and prove the smallest Browser topology that gives the Workspace runtime
its own origin and storage partition. The likely shape is an exact-origin
Sandbox document/worker owner with a closed bootstrap and transferred typed
channel, but the mechanism is selected only after Chromium/WebKit storage,
lifecycle, download, cancellation, and CSP evidence. The admitted capability is
bound to one exact `(programId, workspaceId, volumeId, workspaceSessionId,
generation)` and exposes no Product Repository, Credential Vault, DOM, cookies,
general host JavaScript, or ambient network.

Move the Workspace VFS, `/tmp`, snapshot/export owner, and tool-effect side of
`WorkspaceExecutionPort` to that origin. Then switch the ordinary product
Authority and fixed deterministic Pi fixture to the new adapter and delete the
superseded same-origin execution path; pre-stable preview data may reset rather
than introducing a migration framework. S1a admitted only Pi's unchanged
`write`/`read` schemas; S1b separately admits `edit`, `bash`, and the current
live-model tool list behind their own evidence.

S1 is split into bounded checkpoints. S1a and both native-tool checkpoints are
closed locally:

1. **S1a-0 — topology qualification (closed locally 2026-08-28):** prove an exact-origin Sandbox
   document plus same-origin Host Worker, transferred typed control/environment
   channels, Sandbox-owned OPFS/snapshot/export/storage facts, network-off CSP,
   and Sandbox-owned download in Chromium and persistent WebKit. The ordinary
   product and live Provider remain fail-closed during this qualification; no
   same-origin fallback is added. A cross-origin OPFS, lifecycle, locking, or
   download failure is a stop condition, not permission to weaken the boundary.
2. **S1a-1 — read/write authority cutover (closed locally 2026-08-28):** make
   the qualified transport the only product default,
   reset incompatible preview data, retain Pi's native `write`/`read` schema and
   binder, and delete the same-origin Host path. Prove exact cold reopen,
   snapshot/export, volume/currentness, limits, cancellation, and crash recovery
   again through the ordinary product.
3. **S1b-1 — native edit (closed locally 2026-08-29):** add Pi's unchanged
   `createEditTool` to the deterministic fixture only, retain the existing
   stable `ExecutionEnv` binder and sequential call scope, and drive the exact
   `write -> edit -> read -> proposal` sequence through Pi `Agent`. Focused
   unit evidence verifies Pi's structured edit result, two ordered mutation
   receipts, generation 3, and secret absence. Chromium and persistent-profile
   WebKit each verify the active independent-origin Sandbox, exact final bytes,
   edit as the terminal mutation, and generation-3 cold reopen. This does not
   authorize the live Provider or a shell.
4. **S1b-2 — bounded shell (closed locally 2026-08-29):** the deterministic
   fixture alone binds fixed Pi 0.84.3's native `createBashTool` to the existing
   `just-bash@3.4.2` facade inside the independent-origin Sandbox. The shell
   exposes exactly 25 registered commands, receives no `fetch` or network
   injection, and remains under Sandbox CSP `connect-src 'none'`. Chromium and
   persistent-profile WebKit `@s1b-bash` each pass 1/1, including generation-3
   cold reopen. This is a bounded shell receipt, not live Provider access,
   Linux, a container, Python, QuickJS, Wasm, or a general code sandbox.
5. **S1b-3 — live Provider tools and structured grep (closed locally 2026-08-29):** give
   `pi_provider` the same qualified native `read`/`write`/`edit`/`bash` list,
   correct its capability prompt, and add one fixed read-only `grep` Pi
   `AgentTool` over an explicit Workspace RPC. A faux/unit route owns the exact
   tool list, schema, currentness, cancellation, and mutation-free grep result.
   One real Chromium Anthropic `claude-sonnet-4-5` route additionally proves an
   exact `write` mutation, resulting Sandbox bytes, generation,
   cancellation/currentness, no durable key, and Forget. It does not claim
   real-model `read`, `edit`, `bash`, or `grep` use.
   Prompt text and model compliance never replace call-scope authorization.

QuickJS, Python, broader Wasm, network, import, and BYO Sandbox do not enter S1.

S1a-0 closed without changing the ordinary product authority. One separately
built and separately deployable `silly-os-sandbox` artifact contains only the
exact-origin bootstrap and its fixed Host Worker; the production build excludes
the qualification Worker, Vitest, Pi, Provider, React, and `just-bash` graphs.
The control-origin qualification path transfers typed control and environment
ports to that Host. In both Chromium and a fresh persistent-profile WebKit it
created a Sandbox-origin OPFS volume, ran fixed Pi's native `write`/`read`
through the transferred environment, wrote and re-read an exact 20 MiB corpus,
destroyed the frame and Worker, cold-reopened generation 82, re-read the same
hash, prepared a Sandbox-owned 81-file snapshot, and initiated the byte-exact
ZIP download inside the Sandbox frame. The control origin could not open the
volume path in its own OPFS. A unique cross-origin `fetch` was rejected by
`connect-src 'none'`, and Playwright observed no outgoing marker request.
An independent read-only review found that the first download assertion checked
only archive length; after the shared ZIP parser added exact entry, manifest,
corpus-byte, and rolling-hash checks and both browsers reran, the re-review found
no remaining S1a-0 closure blocker.

S1a-1 now clean-replaces that qualification-only wiring in source:

1. the default Program Workspace Authority creates only the exact-origin frame
   transport; the retired control-origin Host Worker, factory, fallback, and
   live-Provider access are absent;
2. physical Product Repository V5 accepts a fresh database or exact preview V4,
   drops and recreates the V4 stores without reading or migrating rows, and
   rejects other historical/future versions. Old control-origin OPFS bytes may
   remain browser-managed but are unreachable and are not migration input;
3. one product-derived build identity is embedded independently in the control
   artifact, Sandbox bootstrap, and Host Worker. Production rejects
   `development`, absent identity, or any expected/actual mismatch. Local dev
   uses the exact 4173/41740 origin pair, strict CSP on both documents, and HMR
   disabled so the two trusted artifacts cannot hot-update out of lockstep.
   Each control dev-server start generates a fresh random nonce that Vite
   attaches to its injected styles. Dev also omits the observational Trusted
   Types header that Vite cannot satisfy; preview/production retain self-hosted
   external styles and Trusted Types Report-Only, with no nonce production
   policy. The final frame policy admits only the
   exact Sandbox origin plus `blob:` at control and only `blob:` inside the
   Sandbox, which WebKit requires for the private download navigation; the Blob
   URL never crosses the control RPC;
4. export is a two-stage authorization. The Host seals the archive and reports
   `ready`; the Authority rechecks exact Host snapshot plus Product continuation
   before exposing readiness and again when the consumer explicitly asks for
   `start_download`. Only then may the Sandbox-private broker trigger download
   and return `download_started`. The UI retains the sealed archive for the
   1,000 ms handoff, then sends `release`; the Host revokes/deletes before
   terminal settlement. The control plane receives no URL, Blob, archive, or
   VFS bytes; and
5. at S1a-1 closure the deterministic fixture registered only Pi's native
   `write` and `read`, and live Provider remained bounded to proposal. Historical
   P3a `edit`/`bash` results did not admit those tools into S1a; the later S1b
   checkpoints own their current admission.

The control-origin storage estimate/persistence UI is removed because it would
describe Product Repository quota rather than the Sandbox-origin volume. A
future Workspace storage display must come from a typed Sandbox-owned status;
S1a-1 does not add that contract.

The ordinary `@s1a-ordinary` gate passes 4/4 in Chromium and 4/4 in a fresh
persistent-profile WebKit. It proves the exact active Sandbox frame at `41740`
while the `41739` control origin cannot open the new volume; native Pi
`write`/`read` with exact bytes; generation-2 checkpoint and cold reopen; two-
page ownership contention, graceful release, and exact successor reopen; one
accepted snapshot and one-file ZIP whose cross-origin download has the exact
manifest and bytes; a real cancel before download authorization with zero
download; and cancel-after-write terminal receipt followed by reload.
A separate WebKit download rerun also passes 1/1.

The reverse-principal regression now separately passes 2/2 in Chromium and 2/2
in persistent-profile WebKit. It creates random non-secret IndexedDB and OPFS
sentinels at the control origin, then proves that the Sandbox receives
`SecurityError` for `parent.document`, sees no same-named IndexedDB value,
receives `NotFoundError` for the same OPFS path, and cannot emit a unique fetch
to the control origin under `connect-src 'none'`. The control sentinels remain
intact. This proves the named control/Sandbox origin boundary only. Future guest
code must still run in a fresh terminable child Worker against a staged narrow
VFS or explicit imports, never ambient Sandbox-origin storage that could inspect
another volume.

This ordinary gate does not repeat the scale qualification. The separate S1a-0
Chromium and WebKit qualifications each pass 3/3 for build identity, network
denial, and the 20 MiB corpus; the earlier dual-browser S1a-0 receipt remains the 81-file cold-
reopen/download feasibility evidence. No S1a-1 production deployment is
claimed, and live Pi file tools remain disabled after local S1a-1 closure.

S1b-1 and S1b-2 change only the deterministic evidence route. The native-edit
physical case passes 1/1 in Chromium and 1/1 in persistent-profile WebKit. The
separate `@s1b-bash` case also passes 1/1 in each engine, ends at generation 3,
and cold-reopens the exact shell-mutated bytes. S1b-3 then reuses those same
four native adapters for ordinary `pi_provider` and adds fixed structured
`grep`; it does not change the earlier physical receipts.

Structured grep bypasses shell parsing and sends only a normalized read-only
`grep_workspace` request. The Host executes fixed `rg` with an argument array,
caps pattern/path/glob at `4 KiB` / `1 KiB` / `512` bytes, caps results at
`100` matches / `50 KiB` / `500` code points per line, and uses one `5`-second
deadline. No-match succeeds; traversal, malformed output, timeout,
cancellation, late data, or any mutation fails. A successful result preserves
generation and emits no mutation receipt. The current implementation invokes
fixed `rg` once per admitted candidate file. Workspace continuity is already
verified separately at `1,001` files / `21,897,216` bytes, but structured grep
has not been remeasured on that large corpus. That measurement, rather than
speculative caching or a generic search framework, gates a larger search claim.

The selected-origin Worker policy now applies to local Vite development as well
as the Cloudflare response. Only one canonical HTTPS origin is accepted; the
query contains no key, model, or endpoint path. Invalid or duplicate request
shapes fail `400`/no-store, the origin is stripped before Vite transforms the
fixed Worker, and only that Worker receives `connect-src 'self' <origin>`.
Ordinary and catalog Workers remain self-only. The real Chromium Anthropic
route passes through this exact development response and proves one `write`
mutation plus exact Sandbox bytes; neither the response nor that journey is a production
deployment receipt.

The raw performance gate uses a dedicated harness Worker over the real Pi
binder and typed Workspace path, not the production Browser Pi Agent Worker.
Across three fresh-profile / warm-server runs, Chromium per-run medians are
`0.8 ms` for warm `true`, `5.4–5.9 ms` for raw bash `rg`, and `7.6–7.9 ms`
for structured grep; WebKit observes `2–6 ms`, `9–26 ms`, and `11–13 ms`.
Host create/open varies `85.8–108.1 ms` in Chromium and `129–276 ms` in the
selected WebKit runs, with an additional approximately `1.31 s` WebKit outlier.
No control-page Long Task is observed in those runs. This is raw dev data, not
a release budget, main-loop guarantee, or total-memory result; detailed startup,
cancel/recovery, timer, and memory limits live in
[WASM-WORKSPACE-RESEARCH.md](./WASM-WORKSPACE-RESEARCH.md).

The S1b-2 production artifact is exactly five files: `_headers`,
`workspace-sandbox.html`, one bootstrap module, one Host Worker module, and one
build-known lazy shell chunk. Observed raw/gzip sizes are `5,850 / 2,204` bytes
for bootstrap, `103,398 / 23,751` bytes for Host, and
`1,291,658 / 353,606` bytes for the shell chunk. No additional Wasm, QuickJS,
CPython, or Node external runtime asset is emitted. That artifact fact is not a
dependency-absence claim: the install/lock graph still includes optional and
vendor dependencies, and the shell bundle contains just-bash's unregistered
`curl` implementation. The executable boundary is instead the 25-command
allowlist, absence of `fetch`/network injection, and Sandbox
`connect-src 'none'` policy.

Focused unit and Host evidence covers cwd/environment projection, non-zero
exit, timeout and abort, aggregate-output overflow, the `128` mutation-attempt
and `64` changed-path ceilings, and receipt-before-terminal ordering. S1b-3
adds live `write` plus exact Sandbox-byte evidence only; it does not prove
real-model `read`/`edit`/`bash`/`grep`, QuickJS/Python execution, broader Wasm, BYO Sandbox,
editor integration, or production deployment.

Focused protocol/runtime gates additionally establish the phase boundary:
before `start_download`, abort, cancel, ready-consumer return/throw, timeout, or
snapshot/continuation drift reaches neither broker nor browser download. After
`start_download`, Close and Forget drain `download_started`, the 1,000 ms
handoff, release, and cleanup rather than aborting an already-authorized native
handoff.

### S2 — execution profiles and explicit capabilities

The first bounded `just-bash` profile runs inside the Browser Sandbox and is
reachable only from fixed Pi native `bash`. It receives the passed VFS and a
closed command registry. S2 extends that registry one capability at a time;
Pi remains the only Agent/tool/plugin authority, so an execution runtime never
becomes another AgentTool framework or generic runtime RPC. Download,
`git clone`, package retrieval, and every other network action remain off until
an explicit capability admits exact targets, byte/time/output limits,
cancellation, and receipts. Current Workspace, just-bash, and QJS code remains
network-off. Accepted S2-N adds only named `fetch_url` and later `download` Pi
tools through their own Broker; it never injects network into `bash` or guest
code. Wasm may implement one runtime but never becomes the Program or Sandbox
contract.

Browser and Desktop share the following semantic denominator:

- one logical `/workspace` bound to exact Program/volume/session/generation;
- Pi-native `read`/`write`/`edit`/`bash` meaning and product capability names;
- lifecycle, currentness, cancellation, bounded output, mutation receipts,
  snapshots, export, and truthful availability;
- no workspace access to credentials, Pi auth storage, Product Repository,
  ambient companion environment, or another Program's volume.

They do not share one physical runtime. Browser stays deliberately small:
separate origin, OPFS authority, bounded just-bash, staged files, and fresh
terminable interpreter Workers. Desktop may later select a fuller native
process sandbox and local volume, then qualify real shell, Git, Tar, Python,
QuickJS, process-tree cancellation, or PTY support independently. Desktop need
not place just-bash in front of native commands or reproduce Browser limits;
Browser is not blocked on Desktop parity, and Desktop capability evidence never
promotes the corresponding Browser capability. Network, host-path mounts, and
credential/environment inheritance remain explicit Desktop capabilities rather
than ambient defaults.

#### S2-Q1 — fixed synchronous QuickJS under Pi native bash (closed locally 2026-08-29)

Q0 was a disposable feasibility spike. Q1 cleanly replaces its test-only
protocol with production-owned code and exposes one fixed `qjs` custom command
under Pi native `bash`. It pins `quickjs-emscripten-core@0.32.0` and
`@jitl/quickjs-singlefile-browser-release-sync@0.32.0`; just-bash's built-in
`javascript` and `python` switches remain false. Pi still owns the `bash`
schema, updates, timeout argument, aggregate result, and terminal tool receipt.
The Q1 command is merely one implementation available to that shell.

Each invocation creates a fresh static child Worker/runtime. The exact command
shape is `qjs [--file PATH]... SCRIPT [ARG...]`. Only the script and explicitly
named UTF-8 text files are staged; the whole volume, OPFS handles, IndexedDB,
DOM, cookies, API keys, ambient host JavaScript, and network are absent. Guest
code receives bounded `workspace.readFile`, `workspace.writeFile`,
`workspace.listFiles`, `argv`, `stdin`, and `print`. Delete is unsupported, and
pending Promise jobs fail closed because Q1 is synchronous.

The fixed limits are:

- source and stdin: `64 KiB` each;
- argv: `32` entries, `4 KiB` each, `16 KiB` aggregate;
- staged text: `32` files, `256 KiB` each, `1 MiB` aggregate;
- result: `16` changed paths, `256 KiB` diff, `64 KiB` stdout;
- runtime: `12 MiB` QuickJS allocator, fixed non-growing `16 MiB` Wasm linear
  memory, `512 KiB` stack, `2 s` internal deadline, and `3 s` outer watchdog.

Message, error, malformed-response, abort, and watchdog paths terminate the
child Worker before settlement and ignore late data. After an exact success,
the Host preflights the complete diff against staged/current bytes and rejects
delete, unstaged overwrite, stale before-bytes, missing parents, invalid paths,
or any limit violation before the first write. Accepted changes use the
existing Program-bound filesystem calls, generation/currentness fencing, and
native Pi `bash` receipt. Writes are then sequential, not transactional: quota,
cancellation, or a later storage failure may leave an earlier admitted write
committed. Q1 makes no atomic multi-file or rollback claim.

Only the Sandbox response gains
`script-src 'self' 'wasm-unsafe-eval'`; it never gains ordinary `unsafe-eval`,
and `connect-src` remains `none`. The control plane and Agent Worker policies do
not gain Wasm evaluation. No runtime script is fetched from a third party.

Closure evidence is deliberately separated:

- focused protocol/command/runtime tests pass 24/24;
- the real Host Worker -> QuickJS child Worker path passes in Chromium and
  WebKit through Pi native `bash`, including exact changed-path receipt, hard
  cancel, ignored late work, fresh-worker recovery, and a bounded failed-script
  diagnostic whose receipt has no mutation;
- raw local first/cancel/recovery observations are approximately
  `100.8 / 111.2 / 21.4 ms` in Chromium and `70 / 104 / 43 ms` in WebKit. Both
  runs observed zero control-page Long Tasks, with maximum rAF/timer delay of
  approximately `10.1 / 13.7 ms` and `22 / 6 ms` respectively; and
- the exact 10-file local production Sandbox graph passes its checker, and
  requests prove QuickJS remains lazy until after an earlier `bash true`; and
- a fresh Host and dedicated Pi-harness Worker cold-reopen the committed Q1
  bytes; and
- `build:web` plus `check:browser-security-build` pass with no QuickJS,
  Emscripten, `ffi`, or Wasm file or marker in `dist-web`, while
  `build:workspace-sandbox` plus `check:workspace-sandbox-build` retain and
  admit only the expected lazy execution assets.

The exact Sandbox graph is `_headers`, HTML, bootstrap, Host Worker, lazy shell,
lazy `qjs` broker, QuickJS child Worker, and fixed `ffi`, Emscripten-module, and
module-bridge chunks. The Wasm payload is embedded; no separate `.wasm` or
third-party runtime URL is admitted.

These are not release budgets, a low-end-device result, a total-memory result,
or a deployment receipt. The `12 MiB` and `16 MiB` values bound only the
QuickJS allocator and Wasm linear memory; staged host objects, JavaScript
modules, structured clones, Worker overhead, OPFS, and browser-process memory
remain unmeasured. The ordinary control build and Browser security checker pass
with no QuickJS, Emscripten, `ffi`, or Wasm file or marker, while the Sandbox
retains only its expected lazy execution assets. Q1 closed locally before its
release; the current `a17c3490` Sandbox deploy carries it and one public
Chromium real-model QJS loop passes.

Python is deferred. The Pyodide control is roughly `12.9 MiB` raw / `6.03 MiB`
gzip with `0.85–0.91 s` observed cold startup and a broader JavaScript bridge.
The private CPython assets present under just-bash are not its public Browser
API, and enabling just-bash's Browser `python` option does not provide a
qualified runtime. If Python is later accepted, it appears as a build-known
`python3` command under Pi native `bash` and reuses the existing bash receipt;
it does not create another Agent tool or engine API. Linux, a container, Git,
package installation, and a general process substrate remain separate
capabilities rather than implications of Q1.

The Q1 usability closeout keeps diagnostics inside its existing private Worker
response and Pi native `bash` stderr; it adds no AgentTool, runtime RPC, or
new persistent diagnostic log. Only guest-script `execution_failed` may carry one exact-
admitted common JavaScript error kind, a non-empty single-line message capped at
`512` UTF-8 bytes, and optional positive line/column coordinates. Primitive or
unknown errors and bootstrap/snapshot/deadline/memory/output/async/Worker/
protocol failures retain only a fixed product code. The response has no
filename or source-excerpt field, and the product does not forward a raw stack
or Host exception. Guest-controlled messages may repeat already staged text.
Direct Worker and real Pi `bash` paths pass in Chromium and WebKit.

#### Post-Q1 — Browser Workspace namespace and file operations (implemented and locally verified 2026-08-29)

This slice broadens only the filesystem implementation beneath Pi's unchanged
native `bash` tool. It creates no AgentTool, command-dispatch framework,
general runtime RPC, or SillyMaker engine contract. The fixed just-bash facade
now exposes `mkdir`, `rm`, `cp`, and `mv`; SillyOS adds one deliberately narrow
`touch` command that creates a missing regular file and admits
`-c`/`--no-create`, but rejects timestamp-setting flags rather than pretending
that OPFS metadata is portable POSIX state. `find -delete` now reaches the same
admitted remove operations.

Each changed namespace entry or file publishes its own exact durable successor
generation. Compound commands such as `mkdir -p`, recursive `cp`/`rm`, and
`mv` are command-level best effort, with no multi-entry transaction or rollback.
Quota/capacity failure or cancellation may therefore retain the exact completed
prefix. The existing per-native-`bash` ceilings remain `128` persistent mutation
attempts and `64` distinct changed paths; crossing either ceiling rejects the
next entry before its effect but does not undo earlier entries.

Empty directories are durable Workspace state and survive cold reopen. Portable
ZIP and immutable snapshot V1 remain file-only and omit empty-directory entries;
this slice does not silently revise either format. Focused just-bash, Host,
OPFS recovery, and cold-reopen evidence covers the admitted operations and
`find -delete`. It is not a production deployment receipt.

The separate opt-in real-model qualifier passed once in Chromium using the
configured Anthropic `claude-sonnet-4-5` route. Pi issued two native `write`
calls followed by native `bash`; the QJS invocation produced output matching
the fixed script's uppercase transform of the actual Program-volume input;
proposal v2, pending/mutable generation 4, Sandbox-only QJS assets, absence of
the key from the inspected control-origin durable projection, Agent Worker
Forget, and same-volume output retention after Forget all passed. The model did
not reproduce the requested input bytes
exactly, so instruction fidelity is reported separately from the relational
execution proof. This qualifies one bounded synchronous loop, not packages,
async scripts, large projects, or Python. No Python runtime is implemented,
exposed, or qualified.

This product-side adapter work remains in `examples/silly-os`. Pi owns the
native `bash` schema/result; just-bash owns the admitted command algorithms;
the Sandbox Host owns Program volume generations and recovery. None of these
semantics moves into the use-case-neutral SillyMaker engine.

#### S2-N — explicit Browser network tools through a keyless Broker (N0–N2 closed and deployed 2026-08-29)

Network access is an explicit Program capability, not an ambient Workspace or
guest-runtime property. SillyOS ships fixed Pi `AgentTool` values named
`fetch_url` and `download`; N0 and N2 delivered them in that order. They use
Pi's `AgentTool` contract; Pi
continues to own call lifecycle, ordering, and the Agent loop, while the pinned
SillyOS adapter owns each fixed schema and handler. A product-private
`NetworkCapabilityPort` owns Browser admission, grants, cancellation, and
currentness. This is direct product-fixed tool composition, not a second Agent/
tool framework, public plugin lifecycle, generic `fetch` RPC, or SillyMaker
engine contract.

The product use cases are: download a specified archive, asset, or other file
into the current Program VFS; read bounded text from a known page or HTTPS data endpoint;
and search for candidate sources. N0 and N2 deliberately prove the first two
physical paths. Web search remains an explicit follow-on Pi `AgentTool`, not an
attempt to parse arbitrary search-results HTML through `fetch_url`. Its concrete
provider/adapter and any non-LLM credential ownership are selected only after
the Broker boundary is proved; this follow-on does not block N0 or N2.

Provider egress remains separate. Provider requests and each exact credential
capability stay in the selected fixed Pi Agent Worker after one-time Vault
handoff; the durable ciphertext remains in Credential Vault V2. Product code never configures,
attaches, or derives a Provider key, Authorization header, or Cookie for a
Broker request. The Broker receives no Product Repository, Credential Vault,
general Workspace/VFS handle, or generic request headers/body; N2 may give one
call a bounded write-only staging port. The admitted URL remains user/Agent data
and can itself contain sensitive information. This defends the credential plane
from model-, project-, and guest-generated code under the accepted trusted-
product-code boundary; it does not claim resistance to a compromised product-
fixed Agent Worker, control plane, browser extension, device, or supply chain.

The API key is the principal product-held credential, but Program files and
user input may also be private. Granting an origin intentionally permits the
Agent to encode data into a URL path/query sent to that origin. V1 states that
consequence and requires a user decision; it does not add DLP, inspect prompts,
classify Workspace content, score host reputation, or claim to prevent
prompt-injection-driven disclosure after the user grants a destination.

V1 admits absolute HTTPS URLs and rejects non-HTTPS schemes and URL userinfo. It
does not reject `localhost`, `.local`, private/loopback IP literals, or public
hostnames that resolve to local addresses. Those destinations remain subject
to TLS, CORS, Local Network Access permission, DNS, and target-browser behavior.
HTTP is absent because an HTTPS-deployed Browser product cannot rely on it under
mixed-content policy, not because private-network use is forbidden. SillyOS
does not perform DNS resolution or attempt to outsmart Browser network policy.

The Broker is a third stable tuple origin containing only product-shipped,
build-identity-matched trusted code. Its own response may admit
`connect-src https:` because user-selected origins are not statically
enumerable. The control document admits only the exact Broker frame origin; the
selected Agent Worker retains only its exact Provider `connect-src`, and the
Workspace Sandbox retains `connect-src 'none'`. QJS, just-bash guest code, and
generated code receive no Browser `fetch`; just-bash's bundled but unregistered
`curl` remains unreachable. The Broker is not placed in an opaque-origin frame,
because a stable Broker origin is part of the CORS and audit contract.

##### S2-N0 — bounded `fetch_url` and session-only approval — closed and deployed 2026-08-29

N0 is the deliberately bounded first implementation slice. It adds one fixed
`fetch_url` Pi `AgentTool`, the third-origin Broker, and the smallest
session-only **Allow once** flow. It adds no persistent grant, no broad Settings
surface, no `download`, and no Provider relay. Its deployed artifact
availability does not widen those behavioral limits.

The fixed request behavior is:

- model-controlled input is only one bounded absolute HTTPS URL;
- `GET`, `mode: "cors"`, `redirect: "error"`, `credentials: "omit"`,
  `referrerPolicy: "no-referrer"`, and `cache: "no-store"`;
- no custom method, header, body, Cookie, Authorization, redirect following, or
  browser credential;
- an exact textual MIME allowlist, UTF-8 decoding, no HTML rendering/content
  sniffing, and a `256 KiB` hard ceiling over bytes delivered by the decoded
  Browser response stream;
- fixed total and idle deadlines, cancellation/currentness fencing, and ignored
  late settlement;
- readable bounded 4xx/5xx results, while CORS, DNS, TLS, CSP, LNA, redirect,
  timeout, and transport failures remain one bounded tool failure rather than
  speculative diagnosis; and
- an explicit untrusted-remote-content wrapper in the tool result. It keeps
  bytes inert in the UI but does not claim that an LLM cannot be influenced by
  remote text.

An ungranted call sends no request and terminates with typed
`approval_required`; V1 does not keep a Pi tool promise suspended while waiting
for UI. The minimal approval surface shows the exact origin and full transient
requested URL, including the path/query disclosure warning. **Allow once**
creates one session-memory permit for the exact `(programId,
workspaceSessionId, operation, normalized URL)`, expires with that Workspace
session, and is atomically consumed by the first matching later Pi tool call.
The retry receives a new ordinary run/tool identity and must independently pass
currentness. A deterministic qualifier may receive the same exact pre-admitted
test grant; its controlled endpoint must be a distinct CORS origin so a same-
origin request cannot masquerade as network qualification.

N0 closes only when:

1. focused admission tests reject non-HTTPS, userinfo, malformed input, custom
   request authority, unsupported MIME, and over-limit content without
   accidentally adding a private-address denylist;
2. focused Broker adapter contracts prove success, readable 4xx/5xx, exact
   `redirect: "error"` request authority, bounded fetch-failure mapping, streamed
   size failure, total/idle timeout, cancellation, run/currentness loss, and
   ignored late settlement; the physical target proves the ordinary readable
   CORS success path, while a real-target redirect and missing-CORS qualifier
   remain explicitly unclaimed;
3. captured requests contain no product-added Authorization, Cookie, referrer,
   Provider-key sentinel, Program/Workspace identity, custom header, or body;
   ordinary Browser-generated transport metadata such as `Origin`,
   `Sec-Fetch-*`, and `User-Agent` is expected;
4. Chromium and persistent-profile WebKit prove the exact control -> Pi tool ->
   Broker path without moving response bytes through React or giving Agent/
   Workspace origins general egress;
5. actual control, Agent, Workspace, and Broker builds pass exact CSP,
   build-identity, fixed-asset, and source-graph checks; and
6. current QJS/just-bash network denial, Workspace cold reopen, and credential-
   sentinel regressions remain green.

Stop N0 and review the topology if it requires widening the Agent Worker or
Workspace Sandbox to arbitrary network, deriving a Broker request from the
Credential plane, giving the Broker general VFS authority, buffering the
response in React/Agent state, or weakening
cancellation/currentness. A site's missing CORS, a Browser LNA refusal, or the
inability to inspect a hostname's resolved IP is an expected product limit, not
a reason to build a relay, DNS policy engine, or Browser workaround.

Behavioral closure evidence remains controlled and local. The focused
Deno/Vitest suite passes
`454/454`, including exact protocol admission, streamed limits/MIME/deadlines,
silent Broker-peer timeout, late-result currentness, rapid approval before the
old run drains, and transient product projection. A mutation before approval
retains its original run identity: Allow retry inherits only the acknowledged
receipt watermark, while Deny, close, and Forget drain the old run without
inventing a terminal chat record. Production control, Workspace, and Broker
builds pass their fixed-asset/CSP/build-identity checks. The
controlled physical journey passes in Chromium and persistent-profile WebKit:
zero target request precedes approval; one exact `GET` follows **Allow once**;
the request has no Authorization, Cookie, referrer, body, Provider-key sentinel,
or Program/Workspace identity; denial causes no second request or durable Agent
receipt. This evidence is not itself a deployment receipt, does not exercise a
stochastic real model, prove arbitrary-site CORS, physically qualify target
redirect/missing-CORS behavior, or activate N1/N2/search. Playwright
`route.fulfill()` was tried and
falsified as evidence because it bypassed both Browser checks; N0 does not add a
test-only TLS server/certificate framework merely to test Browser-owned behavior.

The release operation separately deployed exact commit
`329f8cc70a9b4a57d57c9653772dca519e3f9221` as control Cloudflare version
`1dc1a247-ed98-4063-931f-2dd4fa681bee`, Workspace Sandbox version
`7e1310ba-86c4-421e-b284-9015f1a3323b`, and Network Broker version
`b005f590-bea4-4a55-8c15-db1a6a22292b`. Cloudflare Static Assets initially
redirected the exact `.html` bootstrap path; final commit `329f8cc7` fixes both
child deployments with `html_handling: "none"` and regression tests. The final
control `/`, Broker `/network-broker.html`, and Sandbox
`/workspace-sandbox.html` return direct HTTP 200 responses, embed the same
source identity, and retain the exact control/Broker/Sandbox CSP split. A
public Creator Home -> Settings smoke logged no warning or error; a disposable
`?agent=pi-test` initialization reached `Pi test ready` with one active Broker
frame and one active Sandbox frame, then closed without creating a Program.
This release evidence proves shipped composition and bootstrap only. It does
not prove a public-origin real-model call, arbitrary-site CORS, target redirect
or missing-CORS behavior, N1/N2, or search.

##### S2-N1 — durable Program grants (closed 2026-08-29)

After N0, add the smallest durable grant flow. **Allow for this Program** stores
only `(programId, immutable normalized HTTPS origin, admitted operation)` in the
ordinary Product Repository and can be revoked. **Deny** rejects the pending
request without creating a persistent rule system. Full requested URLs remain
transient; the Broker reads no repository and receives only a request already
admitted by Product Core. Network grants are non-secret product preferences and
never enter the Credential Vault, Workspace VFS, Pi transcript persistence, or
Broker storage.

The persistent choice is an explicit opt-in checkbox in the current Program's
network settings. Unchecked preserves N0's **Allow once** behavior; checked may
persist only the exact normalized `(programId, origin, operation)` grant and
must never silently promote a one-time decision. Exact placement and visual
polish are deferred with the broader UI rewrite, while the semantics,
revocation, and Program scope are not.

N1 requires cross-Program isolation, once-permit consumption, durable-grant cold
reopen/revocation, zero request before grant, ordinary Chromium/WebKit journeys,
and one deployed controlled-CORS smoke. A stochastic real-model invocation may
be recorded separately but is not deterministic closure authority. If this
would require S3 key persistence, S4 transcript persistence, generic capability
composition, or automatic replay of arbitrary Agent turns, retain terminal
`approval_required` and stop instead of broadening the slice.

N1 delivered on 2026-08-29. The existing Product Repository now owns one
independent `program_network_grants` row per Program under physical schema V6;
the V5→V6 upgrade preserves exact Program/continuation rows and adds no grant
CAS or second repository. Each admitted submit replaces the Agent Worker's
complete Program/workspace-bound grant cache before Pi RPC submission. Durable
origin grants and exact one-shot URL permits remain separate, revoke updates
the repository before Worker acknowledgement, and a failed revoke sync tears
down the stale Worker. The minimal Chat disclosure exposes the explicit
unchecked checkbox and exact revoke action. Focused contracts, the 465-case
SillyOS suite, production build, and ordinary persistent Chromium/WebKit
journeys prove Allow once, opt-in durable reuse across paths, cold reopen,
revocation, exact raw IndexedDB tuples, and zero Provider credential/full-URL
storage. This does not activate N2 download, cross-tab in-flight revocation,
search, background access, or any authenticated Broker request.

##### S2-N2 — streamed `download` into the current Workspace

N2 reuses the Broker and grant authority for a fixed Pi `download` AgentTool.
Model input remains only URL, normalized `/workspace` destination, and
`overwrite`; trusted code binds `programId`, `volumeId`, Workspace session,
expected generation, Agent run, and currentness.

The Broker transfers bounded response chunks directly to Workspace Host staging
over a transferred `MessagePort` with acknowledgement/backpressure. Neither
React nor the Agent Worker retains the body, and Broker storage never becomes a
second volume. Workspace Host owns advisory storage estimation, actual quota
failure, staging cleanup, atomic `overwrite: false` admission, current-head
revalidation, and final publication.

Only a complete 2xx response may publish a file. 4xx/5xx return bounded
diagnostics and leave the VFS unchanged. `Content-Length` may reject early but
never proves final size; Host counts actual streamed bytes. Failure,
cancellation, quota exhaustion, or currentness loss preserves the previous
destination and never publishes partial staging bytes. Success produces one
distinct `tool: "download"` Workspace mutation receipt and one exact durable
generation; this inbound remote-to-VFS operation must not reuse or be confused
with the existing outbound portable-ZIP `start_download` handoff.

The initial `32 MiB` ceiling is a candidate, not a claim. N2 reuses the existing
`1 MiB` chunk and `4 MiB` in-flight bounds where applicable, first repeats the
already-proved `20 MiB+` profile, and promotes 32 MiB only after actual Chromium
and persistent-WebKit ingress, cold reopen, quota failure, cancellation, stale-
head, and memory/backpressure evidence passes. If it does not pass, select the
lower measured bound instead of creating a container, cache, or multipart
framework.

Stop N2 if bounded Broker-to-Host transfer cannot maintain backpressure,
requires full-body accumulation in Agent/control, or requires giving the Broker
VFS/storage authority. Lowering an unproved size ceiling is allowed; widening
Workspace `connect-src`, registering `curl`, or adding a general network
filesystem is not.

`git clone`, package installation, authenticated downloads, arbitrary headers,
POST/body requests, redirect following, background synchronization, guest
network APIs, and HTTP compatibility remain separately evidence-gated. S2-N
activates none of them and does not automatically activate Python, S3, S4, or
S5. General web search is also absent until its separately named Pi tool and
bounded result/provider contract are accepted; N0 does not pretend that
`fetch_url` supplies it.

N2 delivered and joined the combined release on 2026-08-29. One product-fixed Pi
`download({ url, destination, overwrite? })` tool now reuses the N1 operation-
scoped grant boundary. The Agent Worker transfers one endpoint of a private
stream channel to the keyless Broker and the other to the current Workspace
Host; it never reads response bytes. The Broker waits for exact Host
`sink_ready`, performs the credential-free GET, sends at most one unacknowledged
`1 MiB` chunk, and emits scalar-only non-2xx metadata. The Host admits the
destination and overwrite rule before readiness, writes each acknowledged
chunk to private OPFS staging, and publishes only a complete current response
through the existing `replaceFile` journal. Success produces one
`tool: "download"` mutation receipt; failure, cancellation, deadline, stale
authority, protocol error, or a non-2xx response does not publish staging.

The focused integrated suite passes `186/186`, the complete SillyOS suite
passes `482/482`, and the three production artifact builds and boundary checks
pass. Ordinary persistent Chromium and WebKit each stream an exact `32 MiB`
binary response, verify its SHA-256 only from the Sandbox volume, advance one
generation/receipt, and cold-reopen the same bytes. The captured Broker request
contains no Provider key or Program/Workspace identity, and the durable grant
contains only the normalized `(programId, origin, "download")` tuple. This
qualifies the `32 MiB` V1 ceiling for the tested local Browser path; it does not
prove arbitrary-site CORS, public-origin ingress, browser memory telemetry,
quota exhaustion on a real device, redirect behavior, background transfer,
archive extraction, or authenticated download. Playwright fulfillment supplies
the exact bytes but bypasses Browser CORS/redirect enforcement, so those claims
remain absent. N1, N2, and S3 passed the combined release gates and are deployed
together under the exact build identity recorded below.

##### S2-N3 — one Program network switch (closed locally 2026-08-29; deployed 2026-08-30)

The owner rejected tool-by-tool network approval as unnecessary product
friction. N3 clean-replaces N0/N1's pending approval, Allow-once permit,
per-origin/per-operation grant, retry inheritance, revoke list, and associated
RPC/UI state. It does not add a generic approval framework or retain deprecated
wire records for preview compatibility.

Each Program owns exactly one non-secret `ProgramNetworkAccessV1` value:
`{ revision: 1, programId, enabled }`. Missing state means `enabled: false`.
Product Repository V7 preserves the exact V6 Program and Workspace continuation
rows, deletes `program_network_grants`, creates `program_network_access`, and
does not translate old grants. This intentionally makes every upgraded Program
network-off rather than broadening a previously limited origin grant.

Before each admitted submit, and after a settings mutation, Product Core sends
only the current Program/workspace-bound boolean to the fixed Agent Worker.
When false, `fetch_url` and `download` return the bounded `network_disabled`
tool error before Broker ingress; Pi remains free to continue or report the
tool failure normally. When true, either fixed tool may use any URL that passes
the existing absolute-HTTPS/userinfo admission without a separate prompt. A
lost mutation response causes exact Repository replacement and durable reload;
an unconfirmed disable or failed sync disposes only that Program's stale Agent
Worker. Provider/model transport remains an independent Credential-plane path
and is never gated by this Program value.

The Program UI exposes one controlled **Allow network access** checkbox, default
unchecked. It carries one persistent disclosure: an enabled Agent may encode
Program data in URL paths or queries. No per-call destination card appears.
Private/LAN destinations remain allowed when Browser HTTPS, CORS, certificate,
DNS, and Local Network Access policy permit them.

N3 acceptance required:

1. old approval/grant protocol records, runtime state, UI, copy, fixtures, and
   tests are deleted rather than hidden behind aliases;
2. repository conformance proves default false, Program isolation, mutation,
   cold reopen, and the exact fail-closed V6→V7 upgrade without losing Program
   or continuation rows;
3. fixed Pi tool contracts prove disabled zero Broker ingress, enabled direct
   use across different HTTPS origins, disable currentness, no Provider key or
   Program/Workspace identity on the Broker wire, and no run abort solely to
   await UI;
4. Chromium and persistent WebKit repeat the Program checkbox, cold reopen,
   `fetch_url`, and `download` journeys; and
5. production control/Broker/Sandbox builds and current CSP/source-graph gates
   remain green.

All five gates passed locally on 2026-08-29. The complete SillyOS unit suite is
521/521; the focused Agent and Product Repository subsets are respectively
65/65 and 70/70. Controlled Chromium and persistent-WebKit each pass the
Program switch/cold-reopen `fetch_url` journey and the exact `32 MiB` streamed
`download` journey. The control, Broker, and Sandbox production builds and
their three boundary checkers pass. This is local closure, not deployment or a
public-origin/real-model network-tool qualification.

N3 does not claim arbitrary-site CORS, physical redirect/missing-CORS behavior,
public-origin ingress, search, authenticated requests, Browser DLP, safe remote
content, guest network, a Provider relay, or real-model network-tool behavior.
Those limits are not reasons to recreate per-tool approvals.

### S3 — optional Credential Vault (historical; superseded by S3-R1)

S3 delivered and deployed on 2026-08-29. The following is its dated V1 receipt,
not current local product semantics; S3-R1 clean-replaces it. Session-only was
the default. The
Provider form adds an explicit **Remember on this device** choice; it never
silently promotes an ordinary Save. A user-created, passphrase-unlocked Vault
derives a non-extractable AES-256-GCM key with PBKDF2-SHA-256 (`600,000`
iterations), stores only ciphertext plus bounded metadata in the dedicated
`sillymaker.example-silly-os.credentials` IndexedDB database, and binds the
ciphertext through authenticated data to one immutable canonical endpoint and
credential binding ID. Built-in endpoints remain read-only; a custom endpoint
change creates a different binding rather than reusing the old key.

Vault creation/unlock, Lock, Forget, Replace, binding inventory, and a one-time
credential handoff to a fresh product-pinned Pi Agent Worker are typed
operations. There is no full-key read operation. The Vault Worker sends the
decrypted value only across the exact one-shot `MessagePort`, clears its local
reference after transfer, rejects stale or duplicate handoffs, has
`connect-src 'none'`, and owns neither Product Repository nor Workspace VFS.
The receiving Agent Worker validates the exact binding, endpoint, handoff ID,
port count, and deadline before configuring Pi. Provider transport uses
`credentials: "omit"`, `referrerPolicy: "no-referrer"`, `cache: "no-store"`,
and `redirect: "error"`, and rejects endpoint/origin drift. Save and the
optional **Test connection** remain separate actions; neither a remembered key
nor a successful test certifies Provider CORS, account permission, model
availability, or a future request.

Lock and both session/remembered Forget paths first synchronously revoke the
credential owner, terminating the Agent Worker and its Broker before any
best-effort Workspace cleanup. Revoked cleanup does not wait for a stuck
`close_workspace` response or Workspace detach before allowing later
reconfiguration. Normal navigation and application drain retain their graceful
Workspace-close path.

Focused crypto, raw IndexedDB row, protocol/currentness, endpoint-binding,
redirect-guard, response-policy, Agent handoff, and stuck-close/detach revocation
tests pass. A real Chromium
product flow proves Create Vault, explicit Remember, Lock, refresh-to-locked,
unlock, and one-time reuse without placing a key in the ordinary Product or
Workspace repositories. That evidence uses a synthetic key and does not prove a
real public-origin Provider call or cross-browser WebAuthn behavior. WebAuthn
PRF/device verification remains deferred; the delivered unlock path is the
user-passphrase fallback.

The claim is deliberately bounded. Separate IndexedDB names express repository
ownership but are not a same-origin permission boundary. Encryption protects
locked local ciphertext and keeps generated/workspace code away from the Vault
and API key; it does not promise resistance to compromised control-plane code,
XSS, malicious extensions, device malware, supply-chain compromise, passphrase
capture, or misuse while the Vault is unlocked. The product exposes no generic
credential-bearing fetch RPC and the keyless Network Broker remains orthogonal.

The combined release operation deployed exact implementation commit
`ca4104b68312e115c698b9e0d5caeb7cdaf67789` to the canonical control origin as
Cloudflare version `5bc7ad49-d010-4225-8454-4b1dd5b2fa07`, Workspace Sandbox
version `1c228ffe-0e8d-4829-b535-8dd50c4bb770`, and Network Broker version
`fa8e9465-b63d-4d80-a564-990b1acb2f8a`. Control `/`, Sandbox
`/workspace-sandbox.html`, Broker `/network-broker.html`, and the exact hashed
Vault Worker return HTTP 200. The public responses embed the same source
identity and retain the expected control-self-only, Sandbox-network-off,
Broker-HTTPS-only, and Vault-network-off CSP split. A read-only public Browser
smoke reached Creator Home, Settings, Providers, Custom Endpoints, and the
Credential Vault panel with its session-only default, `Not set up`, and zero
remembered bindings; no error-level console record or fatal overlay appeared.
That smoke entered no key and invoked no mutation. It therefore does not prove
Vault create/unlock/encryption/cold reopen, a remembered-key handoff, a real
Provider/model request, durable N1 behavior, N2 ingress, arbitrary-site CORS,
or cross-browser runtime behavior.

### S3-R1 — device-default Vault and Provider settings clean replacement (closed and deployed)

S3-R1 implements the bounded Browser clean replacement. The combined local
Chromium/WebKit product gate passes, and the exact `a17c3490` release receipt is
recorded in the current-status section above. It supersedes the delivered
session-only/**Remember on this device** product semantics without rewriting the
dated S3/V1 delivery receipts above.

The replacement has three implemented contract groups:

1. **Vault mode and durable-Save contract.** On fresh install the fixed Vault
   Worker creates and persists one random non-extractable device key within its
   own boundary and selects **Automatic unlock**. Every Provider key Save is
   durable until explicit Forget or site-data clearing; remove session-only and
   per-key Remember inputs, wire values, branches, copy, and tests in the same
   clean replacement. Add a whole-Vault **Password** mode using the existing
   PBKDF2-SHA-256 (`600,000`) and AES-256-GCM path, with explicit Lock/Unlock.
   Preserve exact endpoint binding, no full-key read, one-time direct Agent
   Worker handoff, network-off Vault policy, synchronous credential-owner
   revocation, and separation from Product Repository and Workspace storage.
   Automatic mode must state that the durable device key provides no locked
   at-rest protection; only password mode while locked has that claim. Do not add
   WebAuthn, recovery, sync, a server secret, or a compatibility framework for
   the pre-stable Vault schema.
2. **Settings and Provider/model separation.** **General**, **Providers**, and
   **Credential Vault** are the three first-level Settings categories rather
   than repeating the complete Vault panel in each Provider detail. Provider
   detail is identity -> Connection -> Available models. Connection owns
   endpoint plus key Save/Replace/Forget and optional exact technical-model
   Test; its Test selector is diagnostic and performs no preference mutation.
   Available models owns only checked models; the reusable Agent Creator
   composer picker owns the separate preferred/current model. A built-in Provider shows
   **Available** only while its exact endpoint credential is configured and
   otherwise shows no label. A complete admitted custom profile shows
   **Available** while credential state remains a separate Connection fact.
3. **First-install recommendations and diagnostics.** Add one small ordered,
   product-maintained list of recommended model families. On a new non-secret
   Settings repository, project exact current references from the pinned Pi
   catalog and technical Browser route before seeding checked models only;
   leave preferred unset and silently skip missing/ineligible references. This list is
   only a first-install preference seed—Pi remains the Provider/model catalog,
   schema, capability, and request authority. Keep Test optional and repeatable;
   expose all technically callable models for the selected Provider in one
   diagnostic selector, then test exactly the selected model through Pi. Test results never
   alter checked models, preferred model, Provider labels, runtime admission, or
   a qualification/allowlist record.

Built-in Connection Save is model-independent. One Save projects the supplied
key to the deduplicated fixed scope set formed from the Provider's own admitted
`baseUrl`, when present, plus every exact endpoint used by its technically
callable models in the current product-pinned Pi catalog. The Vault keeps each
record under the complete `(bindingId, credentialKind, baseUrl)`
identity, so this is neither a wildcard Provider credential nor endpoint
rebinding. An exact Test selection requires the corresponding binding and may
receive it only through the one-time handoff; no generic credential read API is
introduced. Provider Connection Forget removes every stored binding in that
fixed scope set; Credential Vault inventory still supports one-binding Forget.
This multi-endpoint path is covered by focused projection/storage contracts and
the same locally closed product gate. The public `a17c3490` deployment and one
real Anthropic Chromium QJS journey are recorded above; cross-reload durable-key
reuse, public WebKit, and broader Provider qualification remain separate
evidence.

Local closure evidence is deliberately product-level and mutation-sensitive:

- focused Vault protocol/crypto/storage tests prove fresh automatic creation,
  non-extractable persisted device-key use after cold reopen, durable Replace and
  Forget, password-mode conversion plus Lock/reload/Unlock, exact endpoint
  binding, and absence of a generic plaintext read;
- sentinel tests continue to find no key in Product Repository, Workspace
  volume, logs, diagnostics, model preferences, network grants, or Broker wire;
- Provider/settings tests prove that credential Save performs no Provider call,
  persists without a Remember choice, survives reload through the Vault handoff,
  and that Forget removes availability and revokes the active Agent Worker;
- model tests prove first-install checked-only seed intersection,
  missing-reference skip, independent checkbox/preferred behavior,
  built-in/custom label rules, exact multi-endpoint binding projection, and
  single-selection Test results that leave every preference and label unchanged;
- Chromium and persistent-profile WebKit each cover fresh automatic setup,
  reload reuse, Provider Forget, password Lock/Unlock, responsive category/
  master-detail navigation, keyboard/focus return, and no fatal console error.
  The two named journeys pass in both engines (`4/4` total); public-origin
  cross-reload durable-key reuse and broader Provider requests remain separate
  release evidence.

Stop rather than broaden S3-R1 if it would require a generic credential API,
Provider relay, arbitrary authentication fields/headers, WebAuthn/recovery,
cross-device sync, model-quality scoring, a copied Pi catalog, or SillyMaker
engine changes. A failure of one Provider/model Test is a diagnostic result, not
permission to reintroduce qualification gating.

### D1 — Browser data management (closed locally 2026-08-29; deployed 2026-08-30)

General gains one product-owned Data management card without turning storage
into a SillyMaker engine concern. This slice has two capabilities:

1. read `StorageManager`'s advisory usage/quota projection separately from the
   control origin and the independent Workspace Sandbox origin, then show the
   two usage values and an approximate sum without attributing bytes to a store
   or adding quotas; and
2. after an accessible second confirmation, revoke the live Agent credential
   capability, cancel/settle current Workspace work, reset the Vault to a fresh
   empty Automatic state, clear the Product Repository's three owned stores and
   the exact Provider-settings key, and purge the Sandbox's product-owned root
   behind its maintenance fence.

The cross-authority delete is idempotent best effort, not a transaction. The
product reports busy, failed, or partial results and permits retry. It never
reports success from a UI state reset alone. D1 does not enumerate managed OPFS
bytes, introduce a storage database framework, export credentials, or modify an
engine API. A concurrent tab may hold the Sandbox shared maintenance lease or
create new data after the reset boundary; D1 reports the former as partial and
does not attempt a universal cross-origin write freeze.

D1 also publishes one non-secret control-origin reset identity through an exact
`localStorage` key. Other live control-plane tabs listen for that key only,
revoke their Agent and reload Home so their Workspace shared leases are released.
The signal carries no user state. Separate tabs remain free to operate different
Programs and Pi sessions over the shared IndexedDB/OPFS authorities; same-Program
collaboration, durable shared Agent state, and a generic tab-sync framework are
not part of D1.

D1 closed with focused Product Repository, Vault, Sandbox Host, Authority,
settings, formatter, and reset-coordinator contracts; the combined focused suite
passed 294 cases. Type-aware lint, CSS lint, formatting, the control-plane build
boundary, the Workspace Sandbox build boundary, and the unchanged Network Broker
build boundary passed. A real two-tab Chromium run kept a Translation Program and
a Writing Program open under two independent fixed-Pi test sessions, then cleared
from the first tab while the second still held its Workspace. Both returned to
Home with no console error, and the Product list plus Sandbox volumes were empty.
This evidence does not promote same-Program collaboration or make cross-origin
deletion atomic; `volume_busy` and partial retry remain truthful outcomes.

### D2 — streamed all-data backup and restore (inactive)

The product-level backup is a separate slice because the existing ZIP exports
only one active Workspace and intentionally keeps its bytes at the Sandbox
origin. D2 will first freeze a bounded non-secret Product/settings snapshot and
exact Program/volume anchors. The fixed Sandbox Host will validate those anchors
and stream one backup containing Product/Program state and all Workspace volumes
without returning volume bytes to the credential-bearing control plane. Before
download it will recheck currentness; restore will admit the complete manifest
and publish Product pointers only after all volumes stage successfully.

The manifest declares `credentialsIncluded: false`. API-key plaintext, Vault
ciphertext, device keys, password material, salts, and verifiers never enter the
archive. Until D2 and its restore path pass Chromium/WebKit evidence, the current
per-Program Workspace ZIP remains the only export and the General surface must
not label it as an all-data backup.

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

### Editor inheritance follow-on (inactive, product/tooling-side)

The editor may later consume the same fixed Pi backend and qualified Workspace
execution adapters, but it does not inherit SillyOS UI or move Pi into the
SillyMaker engine. The safe editing flow is:

```text
exact Authoring document receipt
  -> isolated staging workspace / Pi tools
  -> Host-derived immutable candidate + diff + validation
  -> human review
  -> exact receipt revalidation
  -> existing structured Authoring operation and in-memory history
  -> explicit source-digest CAS save
```

The Agent never receives an Authoring `FilePort`, source writer, product
database, or live `GameSession`. Applying a candidate does not write source;
only the existing explicit Save owns that effect. The first proof will use an
Engine Lab `authoring_scene` fixture and one already-supported transform
operation, verifying zero source writes before Save, stale rejection after an
intervening human edit, undo/redo, and one final expected-digest CAS write. It
will not claim arbitrary JSON/TypeScript editing, multi-file atomic changes,
hunk staging, Git commit, or Cat Cafe Inspector support. Those require
separate product/tooling adapters and real consumers, not a general engine
workflow framework.

## Current baseline and gaps

The committed P0 Creator Preview is a real responsive product shell backed by
one deterministic in-memory initial producer. B0a added a query-gated,
product-owned Browser Pi Worker behind a typed product facade: the real pinned
Pi Agent runs a deterministic provider and one bounded AgentTool, then offers
an exact P0 successor candidate for atomic publication. B0b historically added
a fixed query-gated OpenAI profile; B1a deleted that user-facing route and fixed
binder. The ordinary route now opens the product-owned Settings surface over
Pi's pinned catalog, persists compatible model checkboxes plus one preferred
model, and current local source separates General/Providers/Credential Vault,
durable Save/Replace/Forget, optional exact-model Test, and automatic/password
Vault modes for built-in or bounded custom HTTPS profiles. Creator Home still
does not request the lazy Pi Worker chunks.
The current live Provider route receives the bounded proposal tool, Pi-native
`read`/`write`/`edit`/`bash`, and fixed structured `grep`. P2-B0 adds a bounded Browser-local Program
database, durable exact Program revisions and decisions, and recent-Program
reload/reopen. P3c-B0 now adds one durable OPFS workspace volume, an exact
continuation anchor, a fresh Pi session over cold reopen, recovery/contender
semantics, explicit Browser storage state, the automated dual-engine
`21,897,216`-byte scale gate, and a canonical portable ZIP containing only its
manifest and VFS files. P3c-B1 now publishes one exact reviewed head as an
immutable accepted snapshot, keeps later mutable drafts independent, and shows
accepted/reviewed/current identity without making React a byte owner. The
product still has no persistent Pi session, import/restore, user-facing
accepted-snapshot download, Python guest, or broader execution profile. S3-R1's
durable-by-default credential semantics, independent Vault Settings IA,
Provider/model/Test separation, and first-install checked-model recommendation
seeds are closed and carried by the current deployment. S1a-1
clean-replaces the ordinary same-origin Workspace
owner with the independent-origin transport and physical Product Repository V5;
S1b-3 is the live-tools consumer, and closed S2-Q1 adds only fixed
synchronous QuickJS beneath Pi native `bash`.
Its initial proposal, Source, translation rows,
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

| Authority                                                                                                     | Owner                                        | Boundary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Program identity, accepted revisions, proposals, decisions, and publication receipts                          | SillyOS product database                     | Product repository and typed product services                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Creator Chat, live Pi-session binding, and review coordination                                                | SillyOS Creator supervisor                   | Session-local control plane plus bounded durable references/receipts; conversation is not Program content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Draft sources, `.git`, generated files, artifacts, file-resident product data, `AGENTS.md`, and skills        | One workspace volume per Program             | A product-selected `WorkspaceRuntime`; accepted Program state names an exact immutable snapshot                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Agent loop, session semantics, compaction, model/provider calls, tool dispatch, and Agent extension lifecycle | Pi                                           | Fixed `pi-agent-core`/`pi-ai` in Browser; complete fixed `pi-coding-agent` companion in Desktop; public Pi tool/extension contracts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `read`/`write`/`edit`/`bash` Agent schemas, validation, execution algorithms, updates, and results            | Pi                                           | Deterministic and live runs use all four shipped Pi tools through the independent-origin Sandbox                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Structured `grep` schema, bounded result, and fixed Workspace adapter                                         | Pi plus pinned SillyOS capability adapter    | One fixed Browser `AgentTool` and explicit read-only `grep_workspace` operation; raw `rg` remains inside Pi `bash`, and no generic dispatcher is added                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Fixed `fetch_url`/`download` schemas and Agent lifecycle                                                      | Pi plus pinned SillyOS network adapters      | Product-shipped `AgentTool` values over one non-generic typed port; no `curl`, guest fetch, arbitrary headers/body, or Credential-plane integration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Program network switch and Browser egress execution                                                           | SillyOS Program authority and keyless Broker | One default-off non-secret Program boolean; enabled fixed Pi tools may use admitted HTTPS URLs without per-tool approval. Product code derives no Broker request from Provider credentials, and the Broker receives no repository, general Workspace authority, or user/guest code                                                                                                                                                                                                                                                                                                                                                                                                              |
| Fixed Browser `qjs` command and child-runtime admission                                                       | SillyOS Browser execution adapter            | One product-shipped implementation below Pi native `bash`; fresh Worker, explicit text staging, no extra AgentTool/runtime RPC, and no Desktop parity claim                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Presentation-facing Agent transport                                                                           | SillyOS target adapter                       | Browser Worker or Desktop companion projects only admitted commands/events; raw Pi/provider records never enter React state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Agent-side product functions                                                                                  | Pi plus pinned SillyOS capability adapters   | One shared schema/prompt/handler core, registered as a Browser `AgentTool` or Desktop `ExtensionAPI` tool; no parallel Agent/plugin runtime                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Workspace lifecycle, capabilities, generation, change journal, and terminal mutation receipts                 | SillyOS `WorkspaceRuntimePort`               | Product-private owner that supplies a stable Program-scoped Pi `ExecutionEnv`; it is not a second tool API                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Workspace filesystem and shell effects                                                                        | Product-selected execution provider          | Browser VFS and bounded shell are independent-origin Sandbox capabilities; no control-origin or Host-filesystem fallback remains                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Pi session and provider credentials                                                                           | Credential Vault plus target-local Pi owner  | Current Browser source uses Vault V2 automatic device-key persistence by default, optional Password Lock/Unlock, and direct one-time exact-binding handoff to the matching Agent Worker. A built-in Save projects only to the deduplicated fixed scopes formed from the Provider's admitted `baseUrl`, when present, plus exact technically callable model endpoints; Provider Connection Forget removes the stored scopes while Vault inventory may remove one binding. Test requires the corresponding selection binding and has no generic key read. The current public deployment carries this R1 contract. Desktop may use isolated Pi/OS credential storage; Program data holds no secret |
| Responsive presentation and application mounting                                                              | SillyMaker GUI contracts                     | React/UI components, input, focus, accessibility, responsive layout, and admitted UI interaction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Human approval and publication                                                                                | SillyOS Program authority                    | Exact proposal, base accepted revision, and reviewed workspace generation are rechecked before snapshot publication                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

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
Agent/tool framework. S1a-1 uses one thin Pi filesystem adapter for native
`write`/`read` over the Sandbox byte authority, S1b-1 reuses that exact adapter
for native `edit`, and S1b-2 binds just-bash's separate `IFileSystem` adapter to
native Pi `bash`. S1b-3 selects those same four adapters for live runs and adds
one separate read-only grep operation. S2-Q1 registers `qjs` only inside that
Browser shell adapter; it remains one Pi `bash` call and receipt. The control-
origin adapter is deleted rather than retained as a synchronized or fallback
VFS tree. S2-N registers named Pi `AgentTool` values orthogonally to native
`bash`; it never adds `curl` or Browser `fetch` to the Workspace execution
projection.

SillyOS does not fork or browser-port `pi-coding-agent`. The fixed Pi 0.84.3
distribution already separates the useful shared runtime from the Node-oriented
coding product:

- Browser uses the public `pi-agent-core` `Agent` and `AgentTool` together with
  selectively imported `pi-ai` providers. S1a-1 reuses the shipped
  `createWriteTool`/`createReadTool` factories and host-abstract `ExecutionEnv`;
  S1b-1 adds the shipped `createEditTool`. A tiny product-private binder
  supplies the stable `{ env }` context without copying the tools' schemas or
  algorithms. S1b-2 adds `createBashTool`; S1b-3 selects the same fixed list for
  live runs and registers the product-specific structured `grep` AgentTool.
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

The focused public `@sillymaker/composition/mod` subpath is a supported trusted
build-time metadata/resolution/lifecycle contract, but SillyOS does not select
it without a real independently selectable product capability. Its private
Direct implementation is not a public ABI, resolver, SDK, or execution
sandbox. A selected Pi extension may be a build-known, version-pinned product
dependency, but it is not a SillyMaker Mod and it never turns generated
TypeScript into an admitted runtime module.

The one neutral engine gap reproduced by S0 is now closed and consumed:
SillyMaker's generic Vite tooling previously injected an executable inline
version-stamp script; the engine lane replaced it with a build-owned,
same-origin external asset that runs before the application module. SillyOS
keeps the general correction and adds no product-specific production nonce/hash,
copied build pipeline, or Pi/SillyOS semantics to the engine. The later random
style nonce is confined to each local control Vite dev-server process so Vite
can label its injected styles; it is not an engine or shipped-artifact policy.

All Program/Workspace semantics, Creator supervision, Pi tools and extensions,
provider keys, OPFS/VFS, just-bash, Wasm payloads, Desktop or BYO sandbox
adapters, persistence, receipts, and product workflows otherwise remain in
`examples/silly-os`. Any additional engine candidate still requires a minimal
neutral reproduction outside SillyOS, a second consumer, and evidence that a
product-local adapter is insufficient. The public Mod runtime is never treated
as the Pi plugin system or an execution sandbox, and its private Direct backend
is never treated as public ABI.

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
  stricter Program Workspace authority. The fixed audit counts 29 ordinary
  built-in names, two settings-gated custom built-ins, and three hidden tools;
  SillyOS does not copy that catalog. It applies only the narrower lesson that
  structured grep merits one fixed AgentTool while compositional `rg` stays in
  the shell.
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
[WASM-WORKSPACE-RESEARCH.md](./WASM-WORKSPACE-RESEARCH.md). The current
workspace implementation binds all four shipped Pi tools to one stable Browser
`ExecutionEnv` and adds only fixed structured grep. It does not create another
Agent tool ABI.

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
7. B1c's Provider/model preference UI is delivered with the S0 release.
8. **B1c-S0 and its release operation closed 2026-08-28:** the trusted control-plane source,
   actual-build gate, local Wrangler headers, and Chromium/WebKit product smoke
   pass with Trusted Types deliberately retained as Report-Only. Commit
   `a4cc8754` and Cloudflare version
   `e1808054-af9f-446f-a913-22a39bf98e37` pass the same public-origin gate.
9. **S1a-0 and S1a-1 closed locally:** the exact independent-origin topology and Sandbox-owned
   download passed their qualification. The ordinary Authority now selects that
   transport, preview Product Repository V4 clean-resets to physical V5, the
   same-origin execution owner is deleted, and deterministic Pi selects only
   `write`/`read`. Chromium and persistent-WebKit ordinary product evidence
   passes. This closure alone did not activate S1b.
10. **S1b-1 and S1b-2 closed locally 2026-08-29:** the separately accepted
    deterministic edit probe selects fixed Pi's native `edit` in addition to
    `write`/`read`, and exact generation-3 cold reopen passes in Chromium and
    persistent WebKit. The bounded-shell probe then selects native Pi `bash`
    through the independent-origin, network-off 25-command facade; its own
    generation-3 cold reopen passes in both engines.
11. **S1b-3 and S2-Q1 are closed locally:** live Pi receives the same
    four native tools plus fixed structured grep. Focused contracts cover the
    exact list, grep bounds, cancellation/currentness and read-only result. One
    real Chromium Anthropic route proves only `write` plus exact Sandbox bytes.
    Q1 adds fixed synchronous `qjs` beneath native `bash`; focused and dual-
    engine harness evidence, the exact 10-file Sandbox graph, lazy-load order,
    fresh Host/dedicated Pi-harness Worker cold reopen, and control-build
    QuickJS/Wasm exclusion gate
    pass. Bounded admitted guest source diagnostics also reach the same native
    `bash` result in both engines with no mutation on failure; the product does
    not forward a dedicated filename/stack field or Host exception. The
    build-matched S1b-3/Q1 artifact is now deployed, but no public-origin
    real-model read/edit/grep/qjs behavior is qualified by that release.
12. **The post-Q1 namespace/file slice is implemented and locally verified:**
    fixed just-bash `mkdir`/`rm`/`cp`/`mv` and narrow product `touch` remain
    beneath Pi native `bash`; every changed entry publishes its own durable
    generation, compounds are best-effort, and `find -delete` works. Empty
    directories cold-reopen but portable ZIP/immutable snapshot V1 omit them.
    One opt-in configured-Anthropic/Chromium write/write/bash-qjs loop passes
    with exact relational output and same-volume post-Forget bytes; Python
    remains absent.
13. **S2-N0/N1/N2 and S3 are closed and deployed:** a keyless third-origin Broker, fixed
    `fetch_url`, and session-only exact **Allow once** now cross the ordinary
    typed Pi path. Focused `454/454` contracts and controlled Chromium/
    persistent-WebKit journeys prove zero pre-approval request, bounded CORS
    HTTPS text fetch, rapid approval/retry currentness, denial, deadlines,
    cancellation, credential-free wire shape, and separated builds. The exact
    three-origin release receipt is recorded above. N1 adds the explicit
    revocable Program grant, N2 adds bounded streamed remote-to-VFS download,
    and S3 adds the opt-in encrypted Vault while keeping session-only default.
    Their combined artifact and read-only public UI smoke do not claim search,
    authenticated request, arbitrary Browser egress, public-origin N2 ingress,
    or public-origin real-model network behavior.
    Python and other later S2 execution profiles, S4 Agent/OpenUI state,
    S5 BYO Sandbox/products, P1-D, and broader import/artifact work require their
    named predecessor and separate acceptance; none is retroactively part of the
    closed B1a/B1b/P3 checkpoints.
14. **S3-R1 is closed and deployed:** current source
    clean-replaces the session-only/Remember product path with fresh-install
    automatic device-key persistence plus user-selected Password Lock/Unlock;
    provides General, Providers, and Credential Vault categories; separates
    Connection/key state from model checkboxes, preferred model, and optional
    exact single-model Test; and seeds only first-install checked models from a
    small product list intersected with Pi's current technical catalog. Focused
    contracts plus the combined Chromium/WebKit product journeys pass. The
    build-matched `a17c3490` public artifact carries these semantics, and one
    ephemeral-profile real Anthropic Chromium QJS journey passes. Cross-reload
    durable-key reuse, public WebKit, and broader Providers remain separate
    qualification.
    S4, Python, BYO Sandbox, and broader product-family work remain later slices.

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
`gpt-4.1-nano`; B1a/B1b produced dated qualification evidence, while the current
B1c surface projects compatibility and point-in-time Test results without a
model-quality allowlist. Current local S3-R1 keeps Test optional and exposes all
technically callable models for a Provider in one selector, while each invocation
tests exactly one selected model without changing labels, checkboxes, preferred
model, or runtime admission. Its custom profile is explicit rather than
guessed and minimally contains:

- Pi API family: `openai-completions`, `openai-responses`,
  `anthropic-messages`, or `google-generative-ai`;
- HTTPS `baseUrl`;
- `modelId`, context window, and output-token ceiling.

The API key is not part of that persisted non-secret profile. Under current
local S3-R1, request-free Save always persists the key in the separate Credential Vault
until Forget/site-data clearing, then uses an exact one-time handoff from that
Vault to a fresh Agent Worker. Fresh installs use automatic device-key unlock;
users may switch the Vault to Password mode and explicit Lock/Unlock. Provider
use never waits for a diagnostic.

Pi still owns the actual provider stream. Browser compatibility is limited to
the credential/API/HTTPS shapes the product implements; CORS, account/model
permission, streaming, cancellation, and error behavior remain exact runtime
outcomes. Historical dual-browser qualification remains release evidence, not
the current model availability list. Pi supporting a provider on Desktop does
not by itself make that provider a Browser capability.

The API key necessarily exists briefly in the page's uncontrolled password
input and browser memory. Save sends it to the separate Credential Vault as
encrypted ciphertext plus bounded endpoint-binding metadata, then performs a
one-time transfer into a fresh Agent Worker. It never enters React state, a URL,
logs, telemetry, HTML bootstrap, Product Repository, Workspace OPFS, Cache API,
exports, or downloads, and plaintext is never exposed through a read API.
Provider Connection Forget terminates the active Agent Worker and deletes every
stored fixed-scope binding for that Provider; Credential Vault inventory Forget
deletes only the selected exact binding.
Password Lock terminates the Agent Worker and discards the unlocked password-
derived key. Automatic mode retains its non-extractable device key and therefore
does not provide locked at-rest protection. These Workers reduce accidental
propagation and isolate generated/workspace code, but are not a defense against
compromised same-origin control code, a privileged extension, or a compromised
device. Test results do not become preference or qualification state.

The primary production route is a direct HTTPS request from the Agent Worker to
the user-selected compatible Provider. A custom HTTPS endpoint is conditional on its CORS,
preflight, streaming, cancellation, and protocol behavior. Public HTTP is
rejected as mixed content. `localhost` and LAN endpoints are not a cross-browser
baseline because mixed-content and local-network permission behavior differs.
Under S0, the document and catalog Worker use the complete self-only CSP. For
each admitted built-in or custom profile, the Cloudflare response layer validates
the canonical origin on the Agent Worker URL and gives only that Worker the one
exact selected origin in `connect-src`; no response uses a global `https:` wildcard.
This selected-origin response path is included in the current exact release;
each real custom endpoint still needs its own public-origin behavior evidence
before making a release support claim. A user-deployed relay remains a later explicit product;
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
Worker; it never falls back to a host Pi, any SillyMaker Mod runtime, or a
separate Agent loop.

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
S3-R1 is the closed and deployed successor contract: it keeps
that Pi authority, adds only a product-maintained first-install checked-model
recommendation seed, and removes any
qualification or Test result from runtime availability and preference state.

The current pinned catalog contains forty runtime Providers and 1,312 static
model records. That is discovery input, not forty Browser support
claims. Bedrock, Node-only OAuth, ambient cloud credentials, account-derived
origins, dynamic catalogs, and local HTTP endpoints remain unavailable or
unverified until their exact Browser route exists. Provider factories and
protocol SDKs remain build-known Pi imports in the lazy Agent Worker; bundle
and chunk evidence must show that opening Creator Home alone still does not
load Pi.

The current Settings information architecture deliberately borrows only the
useful shape of the read-only CherryStudio reference. **General**,
**Providers**, and **Credential Vault** are separate first-level categories.
General is the default product Settings entry. Provider discovery
and Provider-specific models remain one master/detail task; within a detail,
Connection owns endpoint/key state plus an optional exact diagnostic-model
selector, while Available models independently owns checkboxes and the reusable
composer picker owns preferred/current selection. The Vault category owns automatic/password
mode plus password Lock/Unlock and binding inventory. SillyOS keeps its own
chrome, spacing, colors, controls, focus treatment, and responsive contract.
Wide layouts may show navigation, Provider list, and details together; at
`767px` and below category/list/detail become sequential full-width views with
44-pixel targets, not a compressed Electron three-column layout. Loading,
empty, failure, retry, key-saved, testing, ready, locked, and forgotten states
must be visible and keyboard reachable.

Credential and profile ownership remain separate:

- a saved API key passes once from an uncontrolled password input into the
  exact-endpoint Vault/Agent handoff path, is cleared from the UI boundary, and
  persists in the Vault until Forget or site-data clearing;
- one built-in Connection Save projects only to the deduplicated fixed scope set
  formed from the Provider's admitted `baseUrl`, when present, plus its current
  pinned Pi catalog's technically callable model endpoints; every Vault identity
  includes exact `baseUrl`, and a Test selection must match one of those bindings
  before direct handoff;
- Provider Connection Forget terminates the credential-owning Agent Worker and
  removes every stored binding in that fixed scope set; Vault inventory may
  instead forget one exact binding. Model changes never require React to read or
  rebind the key;
- automatic unlock uses a Vault-generated persisted non-extractable device key
  and makes no locked at-rest claim; Password mode alone provides explicit
  Lock/Unlock and locked-ciphertext protection;
- non-secret `(providerId, modelId)`, custom endpoint profiles, checked models,
  preferred model, and first-install checked-model recommendation application may be
  device-local Settings data, but are never Program or credential data;
- keyless and multi-field Provider auth require their own admitted profile
  shape and are not forced through a fake non-empty API-key field.

CSP and CORS are independent gates. CSP can permit a destination; only the
Provider can permit the SillyOS origin to read its response. Pi has no Browser
CORS capability flag and no relay. Technical callability is derived from the
pinned Pi adapter plus admitted canonical HTTPS route, not from a dated
qualification tuple or Test result. A later request may still fail because of
CORS, account permission, key expiry, model retirement, or Provider behavior;
that failure is reported at the call site. Deployed Chromium/WebKit journeys
remain release evidence only. `mode: no-cors`, a Service Worker, or relaxing CSP
cannot repair a failed CORS response.

The B1 checkpoint order below is a dated delivery record. S3-R1 supersedes its
session-only, repeated-Vault-panel, empty-default, Connection-model, and
qualification-label product semantics without rewriting those receipts:

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
   bodies, URL queries, or fragments; its bounded diagnostics may name the
   public method/origin/path route. It defaults to the five qualified tuples. The same ten
   journeys pass from the committed canonical Cloudflare deployment, whose
   response header carries only the exact six-origin CSP.
3. **B1c — request-free credential configuration, optional connection
   diagnostics, and custom HTTPS profiles
   (delivered and included in the current exact release).** Deliver it as two reviewable
   checkpoints rather than treating a settings form as proof of arbitrary
   Browser compatibility.

   **B1c-A — truthful built-in connection surface.** Move Connection before the
   long model catalog. For an admitted single-key Provider route, render the
   initial Pi model's actual `baseUrl` as a read-only endpoint, an uncontrolled
   API-key field whose B1c baseline is session-only, a request-free **Save key**
   action, and a separate
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

   **B1c-C — Provider compatibility and model preferences (implemented and
   deployed; S1a-0 is a separate later authority gate).** Keep Pi
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
   fields. At B1c delivery, API keys, connection-test results, Provider sessions,
   and Agent state remained Worker-memory-only. S3 later adds a separate,
   explicitly selected encrypted Credential Vault without putting secret fields
   into this Settings repository; connection-test results and Agent state still
   remain session-only. Neither the separate IndexedDB database nor WebCrypto is
   described as an XSS-resistant boundary. Desktop may instead use an OS keychain
   and a hosted product may choose a server-side secret owner.

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

#### P1-B1d — Pi-owned reasoning effort (delivered and deployed 2026-08-30)

The former Browser bridge hard-coded Pi `thinkingLevel: "off"`. This bounded
slice now delivers the missing vertical path without creating a SillyOS
reasoning/provider layer.

- Fixed, lockfile-pinned Pi remains the authority for each built-in model's
  exact supported thinking levels, clamping behavior, and Provider-specific
  request mapping. The catalog projection carries only that bounded capability
  data; React does not copy a support table or infer support from model names.
- The product label is **Reasoning effort**, mapped directly to Pi
  `thinkingLevel`. One ordinary device-local preference defaults to `medium`.
  The current built-in route displays and executes Pi's clamped effective
  value; switching to a narrower model does not rewrite the global preference.
- Creator Home and the Program-workspace follow-up composer reuse one control
  beside their shared model picker. An effort-only change updates the live
  Agent configuration without changing enabled models, the preferred model,
  credentials, Provider availability, or Program/Workspace state.
- Test Connection remains an independent point-in-time credential/model
  diagnostic and does not gate or mutate this preference; its existing bounded
  request semantics stay unchanged. Save, Replace, Forget, Vault Lock/Unlock,
  and endpoint binding are also orthogonal.
- The current custom-endpoint schema declares no reasoning capability. Custom
  routes therefore stay effective `off`; SillyOS must not infer a level set
  from their API family, endpoint, or model id. A later schema revision may add
  explicit capability data.
- The exact effort is admitted through the product-private typed Agent Worker
  protocol and reaches fixed Pi Agent construction. Fixed Pi's own clamp helper
  determines the effective value at that boundary; deterministic fixtures may
  observe the same admitted control without making a live-Provider reasoning
  claim.

Acceptance is a strict catalog/protocol/settings/Worker path proving Pi-owned
level projection, default and reopen behavior, effective clamping across a
reasoning and non-reasoning built-in route, custom-route `off`, effort-only
reconfiguration, and the exact value reaching real Pi construction. Focused
Home and Program-workspace component coverage must prove one shared keyboard-
reachable control; ordinary startup must still exclude the lazy Pi graph. No
SillyMaker engine API, credential schema, Test Connection semantics, public Pi
ABI, or Provider qualification is changed by this slice.

Closure: fixed Pi supplies and clamps the exact level set; the strict Worker
protocol carries one preferred value and returns the effective route value;
the real Pi Agent receives that effective value; an ordinary bounded
device-local repository defaults to `medium` and participates in Clear All;
Home and Program workspace reuse the same keyboard-operable control. Active
runs and point-in-time connection tests fence effort changes as busy, while a
model switch retains the global preference and recomputes only the effective
value. Custom endpoints remain `off`. Local focused contracts and the Web
production build and exact `a17c3490` deployment close this product-side slice;
public live-Provider reasoning
qualification remains outside the claim.

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
release graph is acceptance evidence. At this historical checkpoint, network,
Python, JavaScript execution, custom commands, and optional Wasm runtimes
remained disabled; Q1 later added only the fixed `qjs` command.

At checkpoint closure, the bundled-command allowlist was `basename`, `cat`, `cut`, `dirname`,
`echo`, `env`, `false`, `find`, `grep`, `head`, `ls`, `printenv`, `printf`,
`pwd`, `rg`, `sed`, `sleep`, `sort`, `stat`, `tail`, `tee`, `tr`, `true`,
`uniq`, and `wc`. just-bash's shell grammar and builtins remain available where
their required primitive exists; this list is a product capability profile,
not a security boundary and not a claim that every GNU flag is compatible.
The post-Q1 current profile additionally exposes fixed just-bash `cp`, `mkdir`,
`mv`, and `rm`, plus the product's narrow `touch`; `find -delete` is now
functional. Links, mutable permissions/timestamps, Git, Tar, compression,
`awk`, `jq`, Python, SQLite, package managers, fetch, and sockets remain absent.

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
portable exports. The persistent adapter implements read, stat, directory
listing, replacement, append, existence, path resolution, `lstat = stat`,
realpath-without-links, and the synchronous current path view. The post-Q1
adapter also maps directory creation, file/empty-directory removal, and the
file operations composed by just-bash `cp`/`mv` to independently durable Host
mutations. Mutable timestamps and symbolic/hard links still fail closed.
`find` uses `readdir` plus `lstat`, while `rg` uses the
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
files, and file-resident data, plus the same P3a product lifecycle/currentness/
receipt semantics in Browser and Deno Desktop. Familiar shell behavior,
pipes/redirection, `grep`/`rg`, Git, Tar, CPython, QuickJS, process semantics,
and cancellation are individually reported target capabilities rather than a
mandatory physically identical set. This is a workspace execution profile, not
a blanket Linux promise; putting every part inside Wasm is neither required nor
assumed.

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

Each broader shell/process provider is selected per target only after that
adapter has evidence for its declared startup, command semantics, cancellation,
output bounds, filesystem isolation, representative repository operations,
bundle/memory cost, and license/distribution fit. Browser and Desktop share the
applicable conformance semantics, but neither waits for the other's physical
runtime or capability breadth. P3c-B0's historical same-origin OPFS byte owner
is storage evidence, not the selected security boundary. BYO Sandbox is later
qualified against the same applicable conformance. Network is initially absent; remote
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
`256 KiB` from metadata. That historical same-origin checkpoint displayed its
origin-wide advisory estimate and exposed an explicit best-effort persistence
request; S1a-1 removes the UI because it would describe the control origin, not
the Sandbox volume. Checkpoint 2 alone did not implement ZIP,
import/restore, shell, or sandbox behavior and therefore did not close P3c-B0.

Checkpoint 3 delivered and closed P3c-B0 on 2026-08-27. At that historical
same-origin checkpoint the product streamed one canonical STORE-only ZIP into a
Host-owned OPFS temporary, transferred only a Host-owned object URL and bounded
metadata to the page, and exposed explicit progress, cancellation,
finalization, and download-started states. S1a-1 replaces the URL transfer with
the private Sandbox-frame broker described above. Real
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
historical same-origin product requested `navigator.storage.persist()` only
through an explicit action after the user created important work, caught
`QuotaExceededError`, and reported whether persistence was granted. S1a-1
removes that control-origin UI; a replacement requires Sandbox-owned status.
Checkpoint 3 therefore admitted a complete origin
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
ordered progress, sealed `ready`, explicit `start_download`,
`download_started`, `release`, and terminal settlement. A new Pi run is rejected
while that job exists. Before download authorization, Close and Forget cancel
and drain it. After `start_download`, they await the broker receipt, 1,000 ms
handoff, explicit release, and Host cleanup before closing the Workspace;
transport disposal is terminal failure, not release success.

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
export temporaries. After sealed `ready`, the Program Authority rechecks exact
Host snapshot and Product continuation before exposing readiness, then repeats
both checks when the consumer explicitly requests `start_download`. Anchor
drift, reload failure, abort, timeout, or consumer return/throw before that
authorization cancels/fails the job with no broker call or download. This is an exact export anchor, not an IndexedDB +
OPFS transaction, immutable snapshot, or accepted Program revision.

S1a-1 keeps the object URL inside the Sandbox. Only after authorization does the
Host call the private bootstrap-frame broker; its bounded started receipt becomes
`download_started` on the control port. The control page receives neither URL,
Blob, file tree, VFS byte chunk, whole archive, nor `ArrayBuffer`. A sealed ready
job has a default `30`-second Host watchdog; an absent authorization aborts and
cleans the temporary without calling the broker. After `download_started`, the
UI enters non-cancellable `finalizing`, keeps the Host URL plus OPFS backing
alive for the Chromium-evidenced `1,000 ms` handoff, then returns `release`.
The control port sends release; the Host revokes the URL, removes the temporary,
and only afterward emits terminal `released`. Close and Forget drain this
post-authorization sequence. A Worker lost before cleanup can leave only the
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
  persistence request whose `false` result left the historical same-origin
  workspace open and usable. S1a-1 removes this UI until Sandbox-owned status
  exists.

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
- sealed ready plus the `30`-second authorization watchdog, double Host-
  snapshot/Product-continuation currentness, explicit `start_download`, private
  broker `download_started`, and the non-cancellable `1,000 ms` handoff before
  explicit release, Host revoke/delete, and terminal `released`, without
  presenting that handoff as a completed user save;
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
