# Build and local release

状态：当前 Project Tavern Web Player 的维护流程。

## Application registry

Story applications are declared once in `game/project.config.ts` and typed by `@sillymaker/tooling/project`. Vite target resolution (`vite --mode <application-id>`), runtime asset verification, and the project commands below all consume that one registry; adding a Story application means adding one declaration, not editing the Vite implementation, the asset verifier, or a build switch.

```sh
deno task story inspect <application-id>   # resolved Story identity/content summary as JSON
deno task story check <application-id>     # structured JSON diagnostics (also: --all)
deno task story simulate <application-id>  # scripted run through the Agent port
deno task check:stories                    # check --all; part of deno task check
deno task simulate:e2e                     # Engine Lab conformance simulation
```

`simulate` drives the application's declared simulation target exclusively through the player-safe Agent port. An application without a target answers with a structured `project.simulation_unconfigured` diagnostic.

The Engine Lab Story also declares a browser target: `vite --mode e2e` serves it and `vite build --mode e2e` produces `dist/e2e`. That build is an engine test Artifact; a future product application will own its own release flow through the same `deno task story build`/`prepare-artifact` machinery.

`deno task test:e2e:engine` runs the engine browser suite against the Engine Lab (declared projects cover desktop pointer, WebKit, touch, and a 16:10 tablet, with a pageerror/console diagnostic policy); `deno task test:e2e` is its alias.

## Development server

```sh
deno task dev
```

The development server uses the current Story application root and supports normal Vite development behavior. Development capability switches and HMR are not separate production build flavors; capability checks remain runtime behavior.

## Build a Player

```sh
deno task story build <app>
```

This creates a static Player for the selected application under its declared `dist/` target (`deno task story build e2e` today). A build is useful for local inspection, but it is not by itself a release handoff and does not publish anything.

Build identity is generated from the application and resolved Story inputs used by the build. Runtime digests and manifests are technical identity for compatibility, caching, diagnostics, and inspection; they are not proof of copyright ownership or asset approval.

## Prepare a local Artifact

```sh
node --experimental-strip-types scripts/prepare-artifact.mjs <dist-dir>
```

Artifact preparation takes an already built Player directory and adds the release wrapping. A maintainable Artifact includes:

- the static Player files needed to start the game;
- a technical manifest describing the built files and identities;
- `LICENSE.md`, `NOTICE`, applicable license texts, `THIRD_PARTY_NOTICES.md`, and `TRADEMARKS.md`.

The legal files are a product packaging requirement for the composite bundle, not a Goal-era hash ritual. The manifest should describe actual output and reject missing/tampered product files without requiring one exact machine, exact package-manager patch, Git cleanliness, a Phase checkpoint, or a materialization attestation.

## Test the built Artifact

The Engine Lab has two prebuilt layers; use them after changes to routing, base paths, generated identity, asset loading, persistence bootstrap, bundle composition, or Artifact preparation:

```sh
deno task story build e2e            # build dist/e2e through the project CLI
deno task story prebuilt-smoke e2e   # file-level Artifact verification (no browser)
deno task test:e2e:engine:prebuilt   # the full engine browser suite on the Artifact
```

`deno task story dev <app> --smoke` proves the dev server still boots and serves the application page after configuration or dependency changes.

For ordinary browser work against source, use:

```sh
deno task test:e2e
```

## Desktop packaging (experimental)

```sh
deno task story desktop <app>
```

Applications that declare `web.desktop` (name + bundle identifier) can be packaged as a desktop app. The command builds the web target, stages a thin explicit host under `dist/desktop/<app>/staging/` (the exact web Artifact copied to `dist/` plus a Vite SPA marker), and runs `deno desktop` (requires a local Deno >= 2.9; the feature is experimental upstream). Engine and Story code never depend on Deno Desktop APIs — the web Artifact remains the canonical delivery and the stable fallback.

Known limitation, verified 2026-07-28: `deno desktop` binds its local server to a runtime-chosen port on every launch and the port cannot be fixed, so the webview origin changes across launches and browser-storage persistence (IndexedDB saves) does not survive a restart. Desktop distribution therefore requires a Host-side persistence adapter (routing the HostRecordStore through the desktop process to files) before it can be a real release channel. macOS release builds additionally need signing and notarization.

## Release checklist

Before handing an Artifact to another person or machine:

1. run `deno task check`;
2. run browser tests relevant to the change;
3. run `deno task story build <app>` and prepare the Artifact;
4. run the prebuilt browser suite for the application;
5. inspect the generated manifest and legal-file presence;
6. record the source revision and any known gameplay/content limitations in the handoff note.

Artifact preparation proves that the software can be packaged and started; it does not certify final game design, player experience, content approval, or commercial readiness.

## Remote distribution

No command in this document pushes, deploys, uploads, creates CI, or publishes a release. Hosting and remote distribution require a separately chosen target, credentials, retention policy, and rollback process. They should consume the already tested local Artifact rather than redefine game compatibility.

## Asset boundary

Only promoted runtime assets referenced by the Story and its technical asset manifest belong in the Player. Local `references/`, AIGC source archives, candidates, prompts, calibration reports, browser-test output, Saves, and diagnostics do not enter the Artifact. See [assets and references policy](../policies/assets-and-references.md).

## Troubleshooting

- If source tests pass but the prebuilt Player fails, inspect base paths, generated identity, manifest contents, and files copied during Artifact preparation.
- If persistence behaves differently between dev and prebuilt modes, verify that both applications use the same Story/state-contract identity and the intended IndexedDB database name.
- If a browser executable is missing, install the browser required by the current Playwright version; do not pin documentation to one cached revision.
- If a build-only import fails, confirm that it uses a declared package export and that browser code does not import Node-only tooling.
