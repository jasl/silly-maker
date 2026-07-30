# Build and local release

状态：当前 Web Player 与发布渠道的维护流程。

## Application projects

Every application is a self-contained project: its own directory declares itself in `sillymaker.config.ts` (named export `sillymakerAppConfigV1`, all paths app-root-relative), owns a five-line `vite.config.ts` that calls `createSillymakerAppViteConfigV1` from `@sillymaker/tooling/vite`, and depends on the engine through package exports (`workspace:*` inside this repository; relative `file:` paths for an external checkout until the packages are published). Copying `template/` is the supported way to start a new game — the copy builds anywhere.

Inside an application directory the whole lifecycle is local:

```sh
deno task dev                              # vite dev server for this application
deno task build:web                        # static Player under <app>/dist-web (`build` is its alias)
deno task build:desktop                    # desktop package(s) under <app>/dist-desktop (needs web.desktop)
deno task preview                          # serve dist-web/ over HTTP
deno task clean                            # remove dist-web/ and dist-desktop/
deno task story check .                    # structured JSON diagnostics
deno task story simulate .                 # scripted run through the Agent port
```

(`.` selects "this application"; every application's `package.json` scripts declare this task set, and `story` wraps the app-local `tools/story.mts`.)

## Workspace registry (repository-level aggregation)

The root `project.config.ts` is only the list of registered application directories. Repository-level commands aggregate the per-app declarations:

```sh
deno task story inspect <application-id>   # resolved Story identity/content summary as JSON
deno task story check <application-id>     # structured JSON diagnostics (also: --all)
deno task story simulate <application-id>  # scripted run through the Agent port
deno task check:stories                    # check --all; part of deno task check
deno task simulate:e2e                     # Engine Lab conformance simulation
```

`simulate` drives the application's declared simulation target exclusively through the player-safe Agent port. An application without a target answers with a structured `project.simulation_unconfigured` diagnostic.

The root Vite config keeps `vite --mode <application-id>` as a convenience dispatch (Playwright suites and `deno task dev` use it); it resolves the directory and delegates to the same `@sillymaker/tooling/vite` assembly the application's own config uses. `vite build --mode e2e` therefore produces `e2e/dist-web`, identical to building inside `e2e/`.

`deno task test:e2e:engine` runs the engine browser suite against the Engine Lab (declared projects cover desktop pointer, WebKit, touch, and a 16:10 tablet, with a pageerror/console diagnostic policy); `deno task test:e2e` is its alias.

## Development server

```sh
deno task dev          # repository root: Engine Lab via --mode dispatch
deno task dev          # inside an application directory: that application
```

The development server uses the application root and supports normal Vite development behavior. Development capability switches and HMR are not separate production build flavors; capability checks remain runtime behavior. Runtime Story assets live at `<appRoot>/assets/**` and are addressed app-root-relative (`assets/x.webp`): the dev server serves them at `/assets/**`, builds copy them into `dist-web/assets/**`.

## Build a Player

```sh
deno task build:web              # inside the application directory (canonical)
deno task story build <app>      # repository root: workspace aggregation (CI)
```

This creates a static Player under the application's own `dist-web/` (the plain `dist/` stays the TypeScript project-references emit directory). Both forms run the application's own `vite.config.ts` from its directory — nothing selects a build switch. A build is useful for local inspection, but it is not by itself a release handoff and does not publish anything.

Build output policy: dependencies split into stable `vendor`/`vendor-react` chunks (application and engine code stay in the entry chunk; all three sit well under the 500 kB warning line and the vendor chunks hash identically across applications for caching). Production output is minified and mangled by default (Vite's built-in minifier — the modern successor to the old "uglify" step); that is baseline code protection, not real obfuscation. Debug switches:

```sh
deno task story build <app> --profile debug   # sourcemap + no minify in one flag
deno task story build <app> --sourcemap       # emit .map files next to the chunks
deno task story build <app> --no-minify       # readable output for debugging
```

`--profile release` names the default (minified, no sourcemaps); `--profile debug` expands to `--sourcemap --no-minify`. The per-application `web.sourcemap` field in the app's `sillymaker.config.ts` remains the configured default; the CLI flags override it for one build (`deno task build:web` passes appended Vite flags straight through, e.g. `deno task build:web --sourcemap`).

Build identity is generated from the application and resolved Story inputs used by the build. The collector is an optional per-application declaration (`web.identity` pointing at `<app>/tools/build-identity.mjs` over `@sillymaker/tooling/identity/*`); it doubles as a structural facet gate (no React/DOM in simulation closures, no cross-facet imports). It resolves engine sources against the repository root, so it is an in-repo gate — external application projects (and the copy-me starter) omit it and run on the default composer identity. Runtime digests and manifests are technical identity for compatibility, caching, diagnostics, and inspection; they are not proof of copyright ownership or asset approval.

### Selective payload materialization (ported applications)

Applications ported from another engine often sit on a large legacy asset export where only a fraction is reachable (the rest is stock runtime residue). `@sillymaker/tooling/vite/asset-selection` exposes `materializeAssetSelectionV1({ sourceRoot, outputDirectory, plan })` for that shape: the application owns a scanner that computes an `AssetSelectionPlanV1` (`files` reachable from its data plus scanner `warnings`), and the materializer copies exactly those files into the build output from a Story build hook (for example `closeBundle`).

The materializer's contract is tuned for ported payloads: the source root may be a symbolic link (research payloads often are), every copied file is dereferenced so the output contains only regular files (the desktop shell's static server fails closed on symlinks), plan paths are contained to the source root (traversal, absolute paths, backslashes, and NUL throw), and a planned file missing from the payload fails the build instead of shipping a hole. The scanner itself is domain knowledge (which opcodes or tables reference which files) and stays in the application; pair it with an application-side test asserting the plan covers every runtime-reachable reference and excludes known residue. The engine's own `/assets/**` runtime-asset pipeline is unchanged and remains the default for first-party assets.

## Prepare a local Artifact

```sh
deno run -A scripts/prepare-artifact.mjs <dist-dir>
```

Artifact preparation takes an already built Player directory and adds the release wrapping. A maintainable Artifact includes:

- the static Player files needed to start the game;
- a technical manifest describing the built files and identities;
- `LICENSE.md`, `NOTICE`, applicable license texts, `THIRD_PARTY_NOTICES.md`, and `TRADEMARKS.md`.

The legal files are a product packaging requirement for the composite bundle, not a Goal-era hash ritual. The manifest should describe actual output and reject missing/tampered product files without requiring one exact machine, exact package-manager patch, Git cleanliness, a Phase checkpoint, or a materialization attestation.

## Test the built Artifact

The Engine Lab has two prebuilt layers; use them after changes to routing, base paths, generated identity, asset loading, persistence bootstrap, bundle composition, or Artifact preparation:

```sh
deno task story build e2e            # build e2e/dist-web through the project CLI
deno task story prebuilt-smoke e2e   # file-level Artifact verification (no browser)
deno task test:e2e:engine:prebuilt   # the full engine browser suite on the Artifact
```

`deno task story dev <app> --smoke` proves the dev server still boots and serves the application page after configuration or dependency changes.

For ordinary browser work against source, use:

```sh
deno task test:e2e
```

## Desktop save server (preview local persistence channel)

`deno task desktop:save-server --dist <app>/dist-web --saves <dir> --port 41800` serves a built Player bundle from one fixed loopback port and owns a save directory behind `/sillymaker/records`. Pages started with `?records=local` use `createHttpHostRecordStoreV1` instead of per-origin IndexedDB. The endpoint accepts only the bounded records protocol: same-origin JSON commits, validated namespaces/keys/revisions/base64, and GET-only record reads; the static side only accepts GET/HEAD and rejects malformed, traversing, or symlinked paths.

The current JSON-file backend is a **preview/reference implementation**. It survives ordinary restarts, uses optimistic revisions, serializes one process, and replaces each record through a unique temporary file plus rename. A process/OS crash between records in one batch can still expose a partial commit, and a second process has no shared CAS authority. Do not describe it as a production atomic store until the [desktop persistence durability plan](plans/2026-07-30-desktop-persistence-durability.md) passes.

## Desktop packaging preview

```sh
deno task build:desktop                                  # in the app directory: host preview <Name>.app
deno task build:desktop --target x86_64-pc-windows-msvc  # cross-compiled package
deno task build:desktop --target aarch64-apple-darwin --target x86_64-unknown-linux-gnu
deno task build:desktop --compress=zstd --profile debug
deno task story desktop <app>                            # repository root: same verb via aggregation
```

Applications that declare `web.desktop` (safe name + lowercase reverse-DNS identifier + optional app-relative `icon`) package under `<app>/dist-desktop/`. The command builds the canonical web Artifact (honoring `--profile`/`--sourcemap`/`--no-minify`), stages a shell under `<app>/dist-desktop/staging/`, embeds `dist/`, injects `__SILLYMAKER_RECORDS__ = "local"` plus the shell lifetime client, and points the records endpoint at the platform user-data directory (`~/Library/Application Support/<identifier>/saves` on macOS, `%APPDATA%` on Windows, `$XDG_DATA_HOME` on Linux). It then invokes the experimental `deno desktop` command from Deno >= 2.9.

The `deno desktop` runtime owns the window while the shell is a plain `Deno.serve` loop, so the shell also owns its own end of life: served pages heartbeat `/sillymaker/lifetime/heartbeat` and send a `pagehide` goodbye beacon, and the shell exits once the page is gone (goodbye grace ≈10s; a suspend-aware stale watchdog at 120s backstops a missing beacon). The shell additionally adopts the startup window so the OS close button ends the process immediately, and serves `/sillymaker/files/download`: the embedded webview does not honor `<a download>`, so pages served with the local-records marker POST export bytes there and the shell writes them into the platform Downloads folder (sanitized single-segment filenames; collisions get a ` (n)` suffix). Closing the window therefore ends the packaged process; reloads and system sleep do not.

Without `--target` the output is the host-platform preview (`<Name>.app`). Each explicit `--target <triple>` adds one cross-compiled package named `<Name>-<triple>.<ext>` with a per-OS copy-and-run format: macOS `.app`, Windows `.msi`, Linux `.AppImage` (the accepted triples are `deno desktop`'s six `x86_64`/`aarch64` × darwin/windows/linux values). `--compress[=xz|lzma|zstd]` makes the payload self-extracting — useful for asset-heavy applications. The configured `.png`/`.icns` icon is macOS-format and is forwarded only to darwin outputs.

Cross-compiled outputs are packaging previews: this repository still has not promoted installers beyond these formats, signing, notarization, auto-update, or crash-atomic desktop persistence. A release claim requires a real build → launch → write → exit → reopen smoke on each named platform, not only an output-directory marker. Engine and Story packages remain independent of Deno Desktop APIs; the web Artifact is the canonical stable fallback.

## Publish to static hosting (GitHub Pages / Cloudflare Workers)

`deno task site:build` composes a publishable static site at `dist/site`: the VitePress documentation at the root and the Cat Cafe Player at `/play/cat-cafe/`. Player bundles build with `base: "./"` and resolve runtime assets against `document.baseURI`, so they are location-independent; only the docs site needs the deployment base, supplied through `SITE_BASE` (defaults to `/`). Saves stay in the visitor's browser (IndexedDB) — no server component is required.

- **GitHub Pages** — `.github/workflows/deploy-pages.yml` builds with `SITE_BASE=/<repo>/` and deploys through `actions/deploy-pages`. One-time setup: repository Settings → Pages → Source: "GitHub Actions", then run the workflow from the Actions tab (uncomment the `push` trigger for continuous deployment). The site lands at `https://<owner>.github.io/<repo>/`.
- **Cloudflare Workers** — `wrangler.jsonc` declares an assets-only Worker serving `dist/site`. Deploy from a local machine with `deno task site:build && deno task site:deploy:cf` (authenticate once with `deno run -A npm:wrangler login`). Root-based hosting, so the default `SITE_BASE=/` is correct; the site lands at `https://silly-maker.<account>.workers.dev/` or a custom domain.

### Standalone application deployment (one Player, no docs site)

A Player bundle is already a self-contained static artifact — relative base, assets resolved against `document.baseURI`, saves in the visitor's IndexedDB — so publishing one application independently is just hosting its `dist-web/`.

- **Cloudflare Workers** — every application project (the template and each example) carries an app-local `wrangler.jsonc` (assets-only Worker serving `./dist-web`) and a `deploy:cf` script. From the application directory: `deno task deploy:cf` (builds, then deploys; authenticate once with `deno run -A npm:wrangler login`). The Player lands at `https://<worker-name>.<account>.workers.dev/`. The `name` field in `wrangler.jsonc` is the Worker name — template copies rename it with the rest of the project; each application deploys as its own Worker, independent of the composed site. The wrangler version is pinned in each project's `package.json` (bump it there, not in scripts).
- **GitHub Pages** — one repository owns one Pages site, and this repository's Pages slot serves the composed site (which already hosts the Player under `/play/<app>/`). For a truly standalone Pages deployment, push the built `dist-web/` contents to a dedicated repository (any branch, Settings → Pages → Deploy from branch); the relative-base bundle works unchanged from any path.

Each application's `<appRoot>/metadata.json` configures the deployed page's share presentation — document title, description, html lang, theme color, Open Graph / Twitter card, share image, and favicon (`parseStoryMetadataV1` validates the shape; the Vite config injects the tags at build time; Stories without the file keep their hand-written head). Share-image paths are story-relative; the site composer absolutizes `og:image`/`twitter:image` and pins `og:url` when `SITE_ORIGIN` is set (the GitHub Pages workflow provides it automatically).

Both targets were validated against a sub-path static server and the local `wrangler dev` runtime (docs, game, runtime assets, and the `/zh/` locale all resolve).

## Release checklist

Before handing an Artifact to another person or machine:

1. run `deno task check`;
2. run browser tests relevant to the change;
3. run `deno task build:web` (or `deno task story build <app>` from the root) and prepare the Artifact;
4. run the prebuilt browser suite for the application;
5. inspect the generated manifest and legal-file presence;
6. for desktop preview output, launch it and verify write → exit → reopen on the target platform;
7. record the source revision and any known gameplay/content/platform limitations in the handoff note.

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
