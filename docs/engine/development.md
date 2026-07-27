# SillyMaker development guide

状态：日常开发入口。

## Requirements and installation

- Deno >= 2.9.0

Only this compatibility floor is authoritative. An exact patch version, Homebrew service, PostgreSQL server, machine attestation, or pre-materialized browser cache is not required.

```sh
deno install
deno task dev
```

The workspace is ESM, imports TypeScript sources with explicit `.ts`/`.tsx` extensions, and uses one shared `deno.lock` with exact dependency versions (npm packages resolve through Deno's Node compatibility).

Dependency reference rule: engine and Story sources (everything Vite builds or vitest transforms) declare dependencies in `package.json` and import them as bare specifiers — Vite does not resolve `npm:` URLs (`ERR_UNSUPPORTED_ESM_URL_SCHEME`). `npm:` inline specifiers are valid only in Deno-executed code: `scripts/**`, the story CLI, and `deno.json` tasks. Normal installation may use the network. If a browser test reports a missing Playwright browser, install the requested browser with the Playwright CLI for the current lockfile.

## Repository layout

```text
engine/packages/base     framework-neutral authoring, contracts, and runtime
engine/packages/tooling  Node-only tooling (JSONL agent host protocol)
engine/packages/ui       generic React presentation and input
engine/packages/web      browser Host and application adapters
game/stories/e2e         neutral Engine Conformance Story (MIT test consumer)
game/stories/template    minimal starter Story (new-project skeleton)
game/stories/examples    curated example Stories (bookshop; cat-cafe, the engine-gap delivery vehicle)
scripts                  maintained build, asset, and product tooling
docs/engine            active engine documentation
docs/game              active gameplay design
docs/policies          durable repository policy
```

Package manifests define supported cross-package entries. Do not bypass them with imports into another package's `src/**` directory.

## Daily commands

| Command                               | Use                                                                   |
| ------------------------------------- | --------------------------------------------------------------------- |
| `deno task dev`                       | Start the current Project Tavern development server.                  |
| `deno task check`                     | Canonical local code-quality and product-behavior check.              |
| `deno task test`                      | Run engine and game behavior tests.                                   |
| `deno task test:coverage`             | Run unit tests with engine line-coverage reporting.                   |
| `deno task test:e2e:engine`           | Engine browser suite against the Engine Lab Story.                    |
| `deno task test:e2e`                  | Alias of the engine browser suite.                                    |
| `deno task story <verb> <app>`        | Application lifecycle CLI (JSON reports); verbs below.                |
| `deno task check:stories`             | Structured Story diagnostics for every application (part of `check`). |
| `deno task simulate:e2e`              | Scripted Engine Lab run through the Agent port.                       |
| `deno task test:conformance:headless` | Engine Lab headless conformance suite.                                |
| `deno task story desktop <app>`       | Package the built web Artifact as a desktop app (experimental).       |
| `deno task test:e2e:engine:prebuilt`  | Build the Engine Lab and run the engine suite on the Artifact.        |

The application lifecycle CLI covers six responsibilities for every application declared in `game/project.config.ts`:

```text
deno task story inspect <app>                          # resolved identity/program report (JSON)
deno task story check <app> | --all                    # structured Story diagnostics (JSON)
deno task story simulate <app> [--scenario s] [--seed n]  # scripted Agent-port run
deno task story dev <app> --smoke                      # boot the dev server and prove the page
deno task story build <app>                            # build the application's web target
deno task story prebuilt-smoke <app>                   # verify the built Artifact's files
```

`simulate` plays a named scenario from the application's simulation target (for example `deno task story simulate e2e --scenario opening --seed 23049`) through the same player-safe Agent port real agents use. Story applications (story entry, asset verification, simulation target, web dev/build target) are declared in `game/project.config.ts`; see [build-and-release](build-and-release.md).

`deno task check` may remain as a compatibility alias for `deno task check`; new documentation and automation should use `deno task check`.

Use a focused package or test-file command while iterating when that is faster. Run `deno task check` before handing off a change, and add `deno task test:e2e` or prebuilt testing when the affected behavior crosses the browser/build boundary.

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

The reusable `@sillymaker/base/testkit` package is appropriate for compact behavior-level setup shared by real engine/Story tests. A “harness” is not a problem by name; a harness with no maintained product contract is.

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
