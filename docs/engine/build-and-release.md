# Build and local release

状态：当前 Web Player 与发布渠道的维护流程。

## Application projects

Every application is a self-contained project: its own directory declares itself in `sillymaker.config.ts` (named export `sillymakerAppConfigV1`, all paths app-root-relative), owns a five-line `vite.config.ts` that calls `createSillymakerAppViteConfigV1` from `@sillymaker/tooling/vite`, and depends on the engine through package exports (`workspace:*` inside this repository; relative `file:` paths for an external checkout until the packages are published). Copying `template/` is the supported way to start a new game — the copy builds anywhere.

Inside an application directory the web lifecycle is local:

```sh
deno task dev                              # vite dev server for this application
deno task build:web                        # static Player under <app>/dist-web (`build` is its alias)
deno task preview                          # serve dist-web/ over HTTP
deno task clean                            # remove dist-web/ and dist-desktop/
deno task story check .                    # structured JSON diagnostics
deno task story simulate .                 # scripted run through the Agent port
```

Applications that declare `web.desktop` and a `build:desktop` task can also
package Desktop previews under `dist-desktop/`. The Engine Lab has no Desktop
task. (`.` selects "this application"; `story` wraps the app-local
`tools/story.mts`.)

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

`deno task test:e2e:engine` runs the engine browser suite against the Engine Lab
(declared projects cover desktop pointer, WebKit, touch, and a 16:10 tablet,
with a pageerror/console diagnostic policy). `deno task test:e2e` runs both that
engine suite and the example browser suite.

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

This creates a static Player under the application's own `dist-web/` (the plain
`dist/` stays the TypeScript project-references emit directory). Both forms run
the application's own `vite.config.ts` from its directory — nothing selects a
build switch. `dist-web/` is deployable static-hosting input; the build command
does not itself publish it.

Build output policy: dependencies split into stable `vendor`/`vendor-react` chunks (application and engine code stay in the entry chunk; all three sit well under the 500 kB warning line and the vendor chunks hash identically across applications for caching). Production output is minified and mangled by default (Vite's built-in minifier — the modern successor to the old "uglify" step); that is baseline code protection, not real obfuscation. Debug switches:

```sh
deno task story build <app> --profile debug   # sourcemap + no minify in one flag
deno task story build <app> --sourcemap       # emit .map files next to the chunks
deno task story build <app> --no-minify       # readable output for debugging
```

`--profile release` selects the minified, no-sourcemaps preset;
`--profile debug` expands to `--sourcemap --no-minify`. With no profile, the
per-application `web.sourcemap` field in `sillymaker.config.ts` remains the
configured default and production minification stays enabled unless explicitly
disabled. CLI flags override the application setting for one build
(`deno task build:web` passes appended Vite flags straight through, e.g.
`deno task build:web --sourcemap`).

Build identity is generated from the application and resolved Story inputs used by the build. The collector is an optional per-application declaration (`web.identity` pointing at `<app>/tools/build-identity.mjs` over `@sillymaker/tooling/identity/*`); it doubles as a structural facet gate (no React/DOM in simulation closures, no cross-facet imports). It resolves engine sources against the repository root, so it is an in-repo gate — external application projects (and the copy-me starter) omit it and run on the default composer identity. Runtime digests and manifests are technical identity for compatibility, caching, diagnostics, and inspection; they are not proof of copyright ownership or asset approval.

### Selective payload materialization

An application may own a large source payload while only a selected subset is
runtime-reachable. `@sillymaker/tooling/vite/asset-selection` exposes
`materializeAssetSelectionV1({ sourceRoot, outputDirectory, plan })` for that
shape: the application owns a scanner that computes an
`AssetSelectionPlanV1` (`files` reachable from its selected inputs plus scanner
`warnings`), and the materializer copies exactly those files into the build
output from a Story build hook (for example `closeBundle`).

The materializer's contract is tuned for application-owned external payloads:
the source root may be a symbolic link, every copied file is dereferenced so the
output contains only regular files (the desktop shell's static server fails
closed on symlinks), plan paths are contained to the source root (traversal,
absolute paths, backslashes, and NUL throw), and a planned file missing from the
payload fails the build instead of shipping a hole. The scanner itself is
domain knowledge (which opcodes or tables reference which files) and stays in
the application; pair it with an application-side test asserting the plan
covers every runtime-reachable reference and excludes known unreachable files. The
engine's own `/assets/**` runtime-asset pipeline is unchanged and remains the
default for first-party assets. Local research inputs, unlicensed material, and
commercial-game payloads are outside this contract and must not become build
dependencies.

## Prepare an optional handoff Artifact

```sh
deno run -A scripts/prepare-artifact.mjs <dist-dir>
```

Artifact preparation takes an already built Player directory and adds an
offline handoff wrapper. Use it when a recipient needs a self-contained
download, technical integrity checks, reproducible file inventory, signing,
store/update packaging, or another workflow that consumes a manifest. It is not
a prerequisite for deploying `dist-web/` to static hosting.

A maintainable prepared Artifact includes:

- the static Player files needed to start the game;
- a technical manifest describing the built files and identities;
- `LICENSE.md`, `NOTICE`, applicable license texts, `THIRD_PARTY_NOTICES.md`, and `TRADEMARKS.md`.

The technical manifest describes the Artifact's actual bytes and can reject
missing or tampered files. It is not a license inventory, rights review, or
hosted-deployment gate, and must not require one exact machine, exact
package-manager patch, Git cleanliness, a Phase checkpoint, or a materialization
attestation. Likewise, a platform manifest such as `wrangler.jsonc`, an app
bundle plist, or installer metadata configures that platform; it does not
inventory copyright notices.

## Test the built Player

The Engine Lab has two prebuilt layers; use them after changes to routing, base
paths, generated identity, asset loading, persistence bootstrap, or bundle
composition:

```sh
deno task story build e2e            # build e2e/dist-web through the project CLI
deno task story prebuilt-smoke e2e   # file-level Player verification (no browser)
deno task test:e2e:engine:prebuilt   # the full engine browser suite on dist-web/
```

`deno task story dev <app> --smoke` proves the dev server still boots and serves the application page after configuration or dependency changes.

For ordinary browser work against source, use:

```sh
deno task test:e2e
```

## Desktop save server (preview local persistence channel)

`deno task desktop:save-server --dist <app>/dist-web --saves <dir> --port 41800` serves a built Player bundle from one fixed loopback port and owns a save directory behind `/sillymaker/records`. Pages started with `?records=local` use `createHttpHostRecordStoreV1` instead of per-origin IndexedDB. The endpoint accepts only the bounded records protocol: same-origin JSON commits, validated namespaces/keys/revisions/base64, and GET-only record reads; the static side only accepts GET/HEAD and rejects malformed, traversing, or symlinked paths. This query-selected server is a trusted local development channel, not the packaged Desktop private-route authority; do not expose it to untrusted pages or treat its fixed port as authorization.

The current JSON-file backend is a **preview/reference implementation**. It survives ordinary restarts, uses optimistic revisions, serializes one process, and replaces each record through a unique temporary file plus rename. A process/OS crash between records in one batch can still expose a partial commit, and a second process has no shared CAS authority. Do not describe it as a production atomic store until the [desktop persistence durability plan](plans/2026-07-30-desktop-persistence-durability.md) passes.

## Desktop packaging preview

```sh
deno task build:desktop                                  # in the app directory: host-platform preview
deno task build:desktop --target x86_64-pc-windows-msvc  # cross-compiled package
deno task build:desktop --target aarch64-apple-darwin --target x86_64-unknown-linux-gnu
deno task build:desktop --compress=zstd --profile debug
deno task story desktop <app>                            # repository root: same verb via aggregation
```

Applications that declare `web.desktop` (safe name + lowercase reverse-DNS
identifier + optional app-relative `icon`) package under
`<app>/dist-desktop/`. The command builds the web Player (honoring
`--profile`/`--sourcemap`/`--no-minify`), stages a shell under
`<app>/dist-desktop/staging/`, embeds `dist/`, and injects both the
`__SILLYMAKER_RECORDS__ = "local"` marker and one per-launch 32-byte
capability. The page captures that capability once and attaches it only to the
packaged shell's records/download requests. It never enters the URL, Save,
local storage, logs, or diagnostics. The records endpoint points at the
platform user-data directory (`~/Library/Application Support/<identifier>/saves`
on macOS, `%APPDATA%/<identifier>/saves` on Windows, and
`${XDG_DATA_HOME:-~/.local/share}/<identifier>/saves` on Linux). The command
then invokes the experimental `deno desktop` command using the current latest
stable Deno. The engine/tooling compatibility floor remains `>=2.9.0`, but
Desktop build and promotion deliberately track current stable fixes; promotion
records the actual version without pinning one patch.

The shell adopts Deno Desktop's startup window instead of creating a second
window. Closing that window first fences renderer mutation ingress, asks the
page to verify the exact current authoritative Snapshot in `auto.current`, and
waits for that close request's acknowledgement. Only then does the shell stop
new download admission, cancel non-authoritative downloads still receiving a
body, stop HTTP ingress, drain active record commits and already-complete
download publications, and exit. A failed or missing acknowledgement keeps the
shell and download coordinator alive instead of discarding the latest
Snapshot; no page heartbeat or timeout force-exits the process.

The shell binds its HTTP ingress explicitly to loopback and admits every
request only for the exact origin (host and runtime-selected port) allocated to
that launch. Its private records/download routes additionally require the
per-launch capability and reject cross-site or mismatched-Origin requests. A
marker with a missing or malformed capability fails application startup
instead of silently falling back. Launch-specific HTML is never cached and
cannot be embedded in another page, so a stale capability or clickjacked shell
cannot become an ingress path. The capability is a browser-network fence, not
protection against same-origin script compromise or another trusted local process.

The shell also serves
`/sillymaker/files/download` for the embedded webview, which does not honor
ordinary `<a download>` clicks. Shell-marked pages (not the standalone
`?records=local` save-server flow) stream bounded export bytes to that endpoint.
The shell sanitizes the requested single-segment filename, writes an exclusive
same-directory temporary file, and atomically publishes a non-overwriting final
name; collisions append a space and parenthesized number before the extension,
and failed writes leave no partial final file. A package-internal coordinator admits at most two concurrent downloads
and gives each incoming body a 30-second deadline; overload/closed admission is
`503`, a body cancelled by deadline or close is `408`, and cleanup closes and
removes its temporary file before the server drain completes.

Before the web build starts, Desktop packaging collects one immutable,
human-facing version receipt. Vite injects that exact receipt into the page and
the packager derives the artifact stem from it, so the page/Save stamp cannot
drift from the filename during one build. Known application versions are
portable-normalized and known full Git commits are shortened only in the
filename; an observed uncommitted checkout keeps the `-dirty` suffix (for
example `SillyGame-0_1_0-abc1234-dirty`). Invalid, overlong, unavailable, or
status-unverifiable fields are omitted, and the final filename stays within a
portable single-segment byte budget. This stamp is diagnostic provenance, not
an exact dirty-tree identity or a replacement for BuildIdentity, byte digests,
or an optional prepared Artifact manifest.

Without `--target` the output is a host-platform preview in the format selected
for that platform. Each explicit supported `--target <triple>` adds one
cross-compiled package named `<Stem>-<triple>.<ext>`: macOS `.app`, a Windows
`.msi` installer, or Linux `.AppImage`. An `.msi` must be installed; it is not a
copy-and-run directory. SillyMaker's current explicit target allowlist is
`aarch64-apple-darwin`, `x86_64-apple-darwin`,
`x86_64-pc-windows-msvc`, `aarch64-unknown-linux-gnu`, and
`x86_64-unknown-linux-gnu`. It is not derived from the `>=2.9.0` compatibility
floor: a target added by a later Deno release joins the public contract only
after intentional platform evidence. `--compress[=xz|lzma|zstd]`
asks Deno Desktop to compress the payload. The configured `.png`/`.icns` icon
is currently forwarded only to darwin outputs.

Cross-compiled outputs are usable packaging previews: this repository still has not
promoted installers beyond these formats, signing, notarization, auto-update,
or crash-atomic desktop persistence. A release claim requires a real build →
launch → write → exit → reopen smoke on each named platform, not only an
output-directory marker. Engine and Story packages remain independent of Deno
Desktop APIs; the web Player is the stable fallback.

## Publish to static hosting (GitHub Pages / Cloudflare Workers)

`deno task site:build` composes a publishable static site at `dist/site`: the VitePress documentation at the root, the Cat Cafe Player at `/play/cat-cafe/`, and the SillyOS 98 Player at `/play/silly-os/`. Player bundles build with `base: "./"` and resolve runtime assets against `document.baseURI`, so they are location-independent; only the docs site needs the deployment base, supplied through `SITE_BASE` (defaults to `/`). Saves stay in the visitor's browser (IndexedDB) — no server component is required.

- **GitHub Pages** — `.github/workflows/deploy-pages.yml` uses `deno ci`, builds with `SITE_BASE=/<repo>/`, and deploys through `actions/deploy-pages`. One-time setup: repository Settings → Pages → Source: "GitHub Actions", then run the workflow from the Actions tab. Push deployment is intentionally disabled; enabling it requires the deployment build to wait for the same commit's required CI quality and Engine Lab prebuilt-smoke gates. The site lands at `https://<owner>.github.io/<repo>/`.
- **Cloudflare Workers** — `wrangler.jsonc` declares an assets-only Worker serving `dist/site`. Deploy from a local machine with `deno task site:build && deno task site:deploy:cf` (authenticate once with `deno run -A npm:wrangler@4.114.0 login`). Root-based hosting, so the default `SITE_BASE=/` is correct; the site lands at `https://silly-maker.<account>.workers.dev/` or a custom domain.

### Standalone application deployment (one Player, no docs site)

A Player bundle is already self-contained static hosting input — relative base,
assets resolved against `document.baseURI`, saves in the visitor's IndexedDB —
so publishing one application independently can deploy `dist-web/` directly.
It does not need an Artifact manifest.

- **Cloudflare Workers** — the template and each example carry an app-local `wrangler.jsonc` (assets-only Worker serving `./dist-web`) and a `deploy:cf` script. From the application directory: `deno task deploy:cf` (builds, then deploys; authenticate once with `deno run -A npm:wrangler@4.114.0 login`). The Player lands at `https://<worker-name>.<account>.workers.dev/`. The `name` field in `wrangler.jsonc` is the Worker name — template copies rename it with the rest of the project; each application deploys as its own Worker, independent of the composed site. The wrangler version is pinned in each project's `package.json` and task; bump both together.
- **GitHub Pages** — one repository owns one Pages site, and this repository's Pages slot serves the composed site (which already hosts the Player under `/play/<app>/`). For a truly standalone Pages deployment, publish the built `dist-web/` contents from a dedicated repository; the relative-base bundle works unchanged from any path.

Remote distribution still has a license-availability obligation. Make the
SillyMaker MIT text and notices that actually apply to bundled material
available to recipients through at least one durable channel: an in-Player
licenses page, accompanying files on the same distribution, or a stable public
link. The Engine Lab, starter template, and first-party examples carry stable
`rel="license"` links to the SillyMaker MIT text and the maintained
first-party hosted Player baseline in `THIRD_PARTY_NOTICES.md`. The latter
contains concrete copyright and license text for runtime packages observed in
the current first-party bundles. It is a maintained minimum, not an exhaustive
inventory for arbitrary Stories, and does not discharge the distributor's duty
to inspect the actual bundle and publish notices for other included material.
The prepared Artifact is one convenient offline channel, not the only valid
one. A template copy or example distributed independently must retain the
SillyMaker MIT notice for the engine code it contains and publish any notices
required by the material it actually bundles; the new Story may choose its own
license for its project-owned game content.

Each application's `<appRoot>/metadata.json` configures the deployed page's share presentation — document title, description, html lang, theme color, Open Graph / Twitter card, share image, and favicon (`parseStoryMetadataV1` validates the shape; the Vite config injects the tags at build time; Stories without the file keep their hand-written head). Share-image paths are story-relative; the site composer absolutizes `og:image`/`twitter:image` and pins `og:url` when `SITE_ORIGIN` is set (the GitHub Pages workflow provides it automatically).

Both targets were validated against a sub-path static server and the local `wrangler dev` runtime (docs, game, runtime assets, and the `/zh/` locale all resolve).

## Distribution checklist

Before deploying a hosted Player:

1. run `deno task check`;
2. run browser tests relevant to the change;
3. run `deno task build:web` (or `deno task story build <app>` from the root);
4. run the prebuilt browser suite for the application;
5. confirm the deployed product makes the SillyMaker MIT text and every
   applicable bundled-material notice available through an in-product surface,
   accompanying file, or stable link;
6. record the source revision and any known gameplay/content/platform
   limitations in the deployment note.

For an offline handoff, integrity workflow, signed package, updater, or store
submission, also prepare the optional Artifact, inspect its technical manifest
and legal files, and test the exact package. An installed/offline Desktop
package must carry local SillyMaker MIT text and every notice applicable to its
bundled third-party material; the hosted Player's `rel="license"` link alone is
not sufficient. Current Desktop output remains a preview and has not completed
that release handoff gate. For a Desktop preview, launch on the named target and
verify write → exit → reopen.

Neither a successful build nor Artifact preparation certifies final game
design, player experience, content approval, or commercial readiness.

## Remote distribution

`deploy:cf` and the site deployment tasks are explicit remote operations; the
ordinary build, test, prebuilt-smoke, and Artifact-preparation commands remain
local. Remote distribution requires target credentials, a retention/rollback
policy, and the license-availability check above. Static hosting may consume the
tested `dist-web/` directly; workflows needing a packaged handoff may consume
the prepared Artifact.

## Asset boundary

Only promoted runtime assets referenced by the Story and its technical asset
manifest belong in the Player. Local `references/`, AIGC source archives,
candidates, prompts, calibration reports, browser-test output, Saves, and
diagnostics enter neither `dist-web/` nor a prepared Artifact. See
[assets and references policy](../policies/assets-and-references.md).

## Troubleshooting

- If source tests pass but the prebuilt Player fails, inspect base paths,
  generated identity, and files copied into `dist-web/`; inspect the Artifact
  manifest only when testing a prepared handoff.
- If persistence behaves differently between dev and prebuilt modes, verify that both applications use the same Story/state-contract identity and the intended IndexedDB database name.
- If a browser executable is missing, install the browser required by the current Playwright version; do not pin documentation to one cached revision.
- If a build-only import fails, confirm that it uses a declared package export and that browser code does not import Node-only tooling.
