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
deno task dev
```

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

Dependency reference rule: engine and Story sources (everything Vite builds or vitest transforms) declare dependencies in `package.json` and import them as bare specifiers — Vite does not resolve `npm:` URLs (`ERR_UNSUPPORTED_ESM_URL_SCHEME`). `npm:` inline specifiers are valid only in Deno-executed code: `scripts/**`, the story CLI, and `deno.json` tasks. Normal installation may use the network. If a browser test reports a missing Playwright browser, install the requested browser with the Playwright CLI for the current lockfile.

## Repository layout

```text
engine/packages/base     framework-neutral authoring, contracts, and runtime
engine/packages/tooling  non-browser CLI, Vite/identity, JSONL, and Desktop preview tools
engine/packages/ui       generic React presentation and input
engine/packages/web      browser Host and application adapters
e2e/                     neutral Engine Conformance Story (MIT test consumer)
template    minimal starter Story (new-project skeleton)
examples/                curated example Stories (bookshop; cat-cafe; SillyOS)
project.config.ts        the workspace registry (application directory list)
website/                 the public documentation site (VitePress, en + zh; deno task docs:dev)
scripts                  maintained build, asset, and product tooling
docs/engine            active engine documentation
docs/game              active gameplay design
docs/policies          durable repository policy
```

Package manifests define supported cross-package entries. Do not bypass them with imports into another package's `src/**` directory.

## Daily commands

| Command                                          | Use                                                                                                                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deno task dev`                                  | Start the Vite development server (pick an app with `--mode`; inside an app directory it serves that app).                                                 |
| `deno task check`                                | Canonical local code-quality and product-behavior check.                                                                                                   |
| `deno task test`                                 | Run engine and game behavior tests.                                                                                                                        |
| `deno task test:coverage`                        | Run unit tests with engine line-coverage reporting.                                                                                                        |
| `deno task check:determinism`                    | Recollect and statically check the exact authoritative import closure (also part of `check`).                                                              |
| `deno task test:determinism:deno`                | Run two Deno repeats of the guarded authoritative matrix.                                                                                                  |
| `deno task test:determinism:browsers`            | Run the dedicated matrix twice in each locked Chromium, Firefox, and WebKit installation.                                                                  |
| `deno task test:determinism`                     | Aggregate the Deno and three-browser determinism gates; requires all browser binaries to be installed.                                                     |
| `deno task bench:snapshot`                       | Write a neutral Snapshot hot-path baseline JSON to a temporary path.                                                                                       |
| `deno task bench:snapshot:memory`                | Sample retained memory for one long-lived neutral Snapshot Session.                                                                                        |
| `deno task test:e2e:engine`                      | Engine browser suite against the Engine Lab Story.                                                                                                         |
| `deno task test:e2e`                             | Run the engine and example browser suites.                                                                                                                 |
| `deno task build:web` (in an app directory)      | Canonical web build → `<app>/dist-web` (`build` is its alias; `preview` serves it over HTTP).                                                              |
| `deno task build:desktop` (where declared)       | Usable Desktop preview package(s) → `<app>/dist-desktop`; no platform has passed D4 production promotion, and the file store remains a durability preview. |
| `deno task story <verb> <app>`                   | Story diagnostics and workspace aggregation CLI (JSON reports); verbs below.                                                                               |
| `deno task check:stories`                        | Structured Story diagnostics for every application (part of `check`).                                                                                      |
| `deno task story simulate <app> --trace <paths>` | Headless play with per-step numeric trajectories (balance tuning).                                                                                         |
| `deno task story diff <a.json> <b.json>`         | Structured diff of two JSON files (exported saves, simulate reports).                                                                                      |
| `deno task simulate:e2e`                         | Scripted Engine Lab run through the Agent port.                                                                                                            |
| `deno task test:conformance:headless`            | Engine Lab headless conformance suite.                                                                                                                     |
| `deno task test:e2e:engine:prebuilt`             | Build the Engine Lab and run the engine suite on the built Player.                                                                                         |

Every application is a self-contained project: `<app>/sillymaker.config.ts` declares it (paths app-root-relative), `<app>/vite.config.ts` calls the shared `@sillymaker/tooling/vite` assembly, and the root `project.config.ts` only lists the registered directories for repository-level aggregation. Builds are application tasks; the story CLI is the diagnostics and aggregation surface (it also runs app-locally through `<app>/tools/story.mts`, where `.` selects the app):

```text
# Inside an application directory — canonical build entries:
deno task dev                                          # Vite dev server for this application
deno task build:web                                    # web Player → dist-web/ (`build` is its alias)
deno task build:desktop [--target <triple>]...         # where declared: desktop package(s) → dist-desktop/
deno task preview                                      # serve dist-web/ over HTTP
deno task clean                                        # remove dist-web/ and dist-desktop/

# Story diagnostics (app-local `deno task story <verb> .`, or root `deno task story <verb> <app>`):
deno task story inspect <app>                          # resolved identity/program report (JSON)
deno task story check <app> | --all                    # structured Story diagnostics (JSON)
deno task story simulate <app> [--scenario s] [--seed n]  # scripted Agent-port run
deno task story dev <app> --smoke                      # boot the dev server and prove the page
deno task story prebuilt-smoke <app>                   # verify the built Player's referenced files
```

The `story build`/`story desktop` verbs remain as the plumbing behind the build tasks and for repository-level aggregation (CI builds a registered app from the root); new documentation and automation should use the application's `build:*` tasks. `simulate` plays a named scenario from the application's simulation target (for example `deno task story simulate e2e --scenario opening --seed 23049`) through the same player-safe Agent port real agents use. Story applications (story entry, asset verification, simulation target, web dev/build target) are declared in each application's own `sillymaker.config.ts`; see [build-and-release](build-and-release.md).

### Local and external application projects

Private studies, outside-checkout validation applications, and other external checkouts do not register into the repository at all: they are ordinary application projects. Copy `template/`, keep `sillymaker.config.ts` + `vite.config.ts` + `tools/story.mts`, and point `package.json` dependencies at the engine packages by relative `file:` path (with `"nodeModulesDir": "manual"` in the project's `deno.json`, required for `file:` npm dependencies). `deno install` inside the project directory materializes the engine link; `deno task dev`, the declared `build:*` tasks, `deno task test`, and the app-local story CLI then run without any root-registry edit or engine `src/**` alias.

An external application may provide anonymous product feedback and help
prioritize engine work. Promotion evidence must still be reproduced by neutral,
maintained repository fixtures/workloads; do not import external content or make
source, tests, builds, or release claims depend on that checkout.

Use a focused package or test-file command while iterating when that is faster. Run `deno task check` before handing off a change, and add `deno task test:e2e` or prebuilt testing when the affected behavior crosses the browser/build boundary.

`deno task check:determinism` is the browser-free authoritative-source guard.
It recollects the root application registry, managed simulation dependencies,
declared callback owners, bounded Base authorities, and the maintained synthetic
migration extension on every execution; it does not read a cached file list.
Collection/classification failures abort before linting. After collection, every
unique exact path is read once; read, unsupported-extension, and parse failures
use stable diagnostics, and all output is ordered by UTF-16 file/range/code.
The checker and the Node-only tooling import-closure collector use the exact
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

`deno task bench:snapshot` runs generated 100/1k/10k/100k-entity Session workloads for single-field commits, multi-slice committed controls, real cross-owner atomic commits, rejection, and fault. Its full matrix also includes a neutral 256-command mixed sequence at 100 entities, authoritative replay of the retained 200-entry CommandLog, and a fixed 100-entity `every_commit` persistence workload that drains each of two committed commands and records the resulting `auto.previous` rotation. By default its schema-v3 report writes machine-readable p50/p95 and deterministic traversal, digest, freeze, continuity, Save serialization, and Strict JSON counts under an operating-system temporary directory; pass `--output <path>` for a CI artifact.

The deterministic counters distinguish bootstrap admission/freeze, command
admission/freeze, finalized-evidence admission, conditional additional
CommandLog-metadata admission/freeze, Snapshot digest/freeze, and CommandLog
continuity. Each Standard Core initial-Snapshot helper performs exactly one
bootstrap canonical projection and one engine-owned projection freeze before
resolved initial-State construction. The resulting tuple
`bootstrap admission / bootstrap freeze / createInitialState / Snapshot freeze /
Snapshot digest` is `1/1/1/1/1` for construction and queued restart, and
`1/1/1/0/0` for the captured extension helper. Adapter throws record all zeros;
canonical or projection-traversal failure records `1/0/0/0/0`; projection-freeze
or canonical-valid seed failure records `1/1/0/0/0`. These counters are
package-internal test/bench observations and do not add a public bootstrap hook.
For queued restart, an already-invalidated HMR preflight records all zeros; a
valid helper that invalidates during its adapter records `1/1/1/0/0`, while an
invalidating projection trap that throws records `1/0/0/0/0`. In both latter
cases the HMR outcome wins and no candidate Snapshot is installed.

Each finalized attempt performs one Snapshot-free evidence canonical projection
traversal and freeze; Session-to-CommandLog handoff does not repeat it. The
standard `{source, command}` path records metadata `0/0`; a direct generic log
entry with non-empty valid extras adds `1/1`; symbol/accessor descriptor
rejection at the top-level extra-field capture, or an enumerable engine-owned
field collision, records `0/0`; any canonical failure reached after metadata
projection starts (including a nested symbol/accessor) records `1/0`. Failure
fixtures assert zero candidate Snapshot traversal/digest/freeze rather than
using wall-clock timing.

Save encoding performs canonical serialization and the Strict depth/node/collection/string/dangerous-key checks in the same package-internal traversal. The benchmark's `strictJsonPreflights` counter therefore means a separate post-encoding Strict parse traversal and is zero for each encode; `strictJsonParses` still counts decoder/readback parsing of untrusted bytes.

The public current-format decoder deliberately performs two canonical digest
traversals on success: one over the bounded raw Snapshot, then one over the
schema-normalized current Snapshot. Import validation and stored operations add
the State-revision fence between those phases, before current Snapshot parsing.
A raw-digest mismatch stops after the first traversal without current Snapshot
parsing; a current-schema or RNG failure after a valid raw digest records only
that first digest; a differing State revision on validation/service paths also
stops before current Snapshot and Story callbacks. Stored load/list/export
finish compatibility/reference/invariant validation after staged preparation
and Host revision/slot identity checks. Annotation shares preparation and the
physical checks but intentionally performs no Story validation callback before
its revision-aware rewrite. These are deterministic package-internal counts,
not wall-clock gates; executable Save migration remains a later plan slice.

Strict JSON numeric regression tests use exact decimal token vectors rather
than wall-clock timing: rounded fractions, safe boundaries, negative-zero
spellings, long coefficient/exponent inputs, and legacy parser-error precedence.
The maintained Save metadata byte corpus is decoded directly and must
canonicalize back to the same bytes, byte digest, and Snapshot state digest;
Save and Debug Bundle tests also prove that exact-integer alternate spellings
normalize without changing canonical output while fractional imports reject
before schema/digest mutation.

`deno task bench:snapshot:memory` is a separate schema-v1 process-isolated memory baseline; it does not change the `bench:snapshot` report. It holds one neutral 1k-entity Session for 1,200 real cross-owner atomic commits, samples `Deno.memoryUsage()` before and after an explicit `gc -> macrotask -> gc` cycle at command sequences 0/200/400/800/1,200, and treats sequence 400 onward as steady state after the 200-entry CommandLog has filled. Dispatch timing excludes collection and sampling; its interval percentiles use each batch's average per-command duration so differently sized checkpoint intervals remain comparable. It likewise writes to an operating-system temporary directory by default and accepts `--output <path>` for a CI artifact. Run it as its own process through the task so the exposed collector and retained-heap measurements are isolated.

Wall-clock, memory, and GC values from either benchmark are trend evidence, not ordinary CI gates. Normal tests assert deterministic schedules, internal work counts, report schemas, and byte-equivalent Snapshot/CommandLog behavior; they do not assert one machine's timing, heap, RSS, or collector result. Raw local baseline JSON is not committed.

## Change workflow

1. Read the active document and implementation nearest the behavior being changed.
2. Decide which package owns the change and whether it affects a workspace public export or persisted data.
3. Add or adjust a focused behavior test when it meaningfully reduces regression risk.
4. Implement the smallest coherent change; keep Story-specific concepts outside generic engine packages.
5. Run focused tests, then the relevant broader commands.
6. Update active docs when the architecture, supported workflow, user-visible behavior, or compatibility promise changes.

Commits can be organized for reviewability, but there is no required Phase-to-commit mapping, checkpoint hash, exact staging contract, or clean-tree admission script.

## Testing policy

Browser commands exercise the Engine Lab conformance Story ([E2E engine validation design](design/e2e-engine-validation.md)); the retired PoC product suite left with its application.

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
- exact repository file inventories or task-specific command sequences;
- one exact host toolchain, browser revision, cache, or machine attestation;
- Git cleanliness as application behavior;
- byte-for-byte snapshots of provisional balance, reference strategies, or disposable calibration reports;
- copied fixture trees when a small in-memory builder can express the business case.

A checked-in fixture is justified when its bytes are themselves a maintained external format or compatibility promise—for example, a Save migration sample. Document what compatibility it protects and provide an intentional update path.

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

## Dependencies and toolchain

- Add dependencies at the narrowest package that uses them and keep versions exact.
- Update the shared lockfile with the manifest.
- Review browser compatibility, ESM support, license, bundle effect, and maintenance cost in proportion to the dependency's role.
- Do not add a repository-wide legal scanner or third-party notice inventory as a substitute for direct rights review.
- Keep direct Node TypeScript tools compatible with the way their package scripts execute them; ordinary project code is still typechecked by TypeScript.

The minimum engine compatibility versions belong in root `package.json#engines`. Do not duplicate a stricter toolchain pin in documentation unless a real upstream incompatibility temporarily requires it.

## Public API and documentation maintenance

When changing a package export:

1. update its `package.json#exports` and public barrel intentionally;
2. add an API/consumer behavior test if external Story code depends on the shape;
3. update [architecture](architecture.md), [features](features.md), or [Story authoring](story-authoring.md) where the responsibility changed;
4. identify any Save, Hotfix, tooling, or application consumers that require migration.

Version suffixes such as `V1` identify the current contract family. They do not prohibit replacement; a replacement should make coexistence and migration explicit, then retire obsolete paths rather than maintaining parallel authorities forever.

## Debugging failures

Start with the narrowest failing test or command. Classify the failure as product behavior, type/API drift, browser environment, generated output, or a stale test assumption. Repair the responsible layer rather than adding another wrapper whose only purpose is to satisfy command ordering.

Runtime failures visible to players should use structured outcomes and bounded diagnostics. Unexpected browser/runtime faults can be inspected through the existing diagnostic and DebugBundle features; do not put secrets or unrestricted local data into those exports.
