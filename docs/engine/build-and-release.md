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

Build output policy: dependencies split into `vendor`/`vendor-react` chunks;
application and engine modules follow the application's static and literal
dynamic-import graph rather than being forced into one entry chunk. A product
that selects a progressive contribution may therefore carry its private Direct
extension backend in that contribution's lazy outputs; an ordinary
no-extension application excludes the backend completely. Chunk size is a
measured product trend, not an assumed 500 kB guarantee; the current release
workflow does not enforce a bundle budget. Use `deno task bench:player:bundle`
to fresh-build Engine Lab and report entry/preload/lazy plus aggregate JS/CSS/
runtime-asset raw and gzip bytes to an OS-temporary JSON file. Its schema-v2
report also records the final Vite chunk/asset graph and the build-known dynamic
entry contribution IDs carried by each output. Shared and mixed outputs retain
every contribution instead of duplicating their physical bytes. The
measurement plugin writes its private receipt only below the OS temporary
directory; it emits nothing into the Player and ordinary builds do not install
it. Template is the no-extension negative control: authoring, real dev-source,
dynamic-extension, and RPC implementation facets are all zero. The
`@sillymaker/ui/debug/dev-source-client` subpath selects its fetch/CAS/open-source
implementation only under the `development` export condition; default/release
resolution receives a fail-closed unavailable stub. Engine Lab is both a
development positive control and a release negative control: Vite dev may inject
the lightweight embedded-author launcher and lazy Host runtime, while its final
production graph contains neither the Studio binding/Host/workspaces nor
embedded-author/dev-source virtual entries. The selected Direct backend still
appears only in lazy DevDock contribution outputs and never in entry. These
receipts prove placement and exclusion, not a fixed bundle or startup number. The first CR3
sample measured the largest Engine Lab entry at 922,550 raw / 214,643 gzip
bytes; that is a visible optimization lead, not a compatibility failure or a
license to raise the warning threshold.
Production output is minified and mangled by default (Vite's built-in minifier
— the modern successor to the old "uglify" step); that is baseline code
protection, not real obfuscation. Debug switches:

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
- `LICENSE.md`, `NOTICE`, the project license texts, and `TRADEMARKS.md`.

The technical manifest describes the Artifact's actual bytes and can reject
missing or tampered files. It is not a hosted-deployment gate and must not
require one exact machine, exact
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

## Save compatibility release floor

A release may claim Save compatibility only for identities backed by checked-in
canonical byte fixtures. The maintained corpus currently contains Engine Lab
State revisions 3, 4, and current 5 (the supported adjacent chain is
`3 -> 4 -> 5`) plus Cat Cafe revision 1, its first supported Save floor. These
fixtures are long-lived compatibility inputs, not a claim that every one was
captured from a historical public release; do not regenerate an older shape from
the current encoder or infer support for an unlisted revision.

Before changing a supported State contract or publishing a release that retains
an existing floor:

1. add or review the exact canonical Save bytes and their declared identity;
2. run the Story lifecycle corpus (inspection, applicable migration/adoption or
   re-anchor, current validation, load, backup/restore, and fresh-save round-trip);
3. run the authoritative migration matrix in Deno, Chromium, Firefox, and WebKit;
4. run the Engine Lab and Cat Cafe `@save` browser flows plus the relevant
   prebuilt Player suite;
5. run `deno task check` and record any intentionally unsupported revision in the
   release note.

The browser flows also export the same pending backup twice under a fixed clock,
save the two download events to distinct test-owned paths, compare both files to
the exact backup bytes, and re-inspect retention. This proves browser request and
payload behavior only. The browser does not promise the final filesystem suffix;
Desktop collision handling and process-crash durability keep their separate
promotion gates.

### 2026-08-13 core/web stabilization

PF7 closed the default core/web production floor on latest stable Deno 2.9.5.
The exact release floor passed the fresh canonical check (271 files / 4,690
tests, assets, five Story checks, Engine Lab 417-module build), the four-file
Save/current-load selection (57 tests), Deno plus Chromium/Firefox/WebKit
determinism, both Story `@save` flows in all three browsers, file-level prebuilt
smokes, and the Engine Lab Chromium prebuilt suite (44/44).

The clean-HEAD bundle reports remain trend evidence. Engine Lab's largest entry
is 922,550 raw / 214,643 gzip bytes; Cat Cafe's largest preload is 1,034,689 /
242,838. Both exceed Vite's advisory 500 kB raw warning. This is an explicit
code-splitting and download-size optimization lead, not a compatibility failure
or a machine-bound release threshold. Cat Cafe also carries about 4.72 MB of
runtime media assets (about 4.61 MB gzip); those product assets, browser cache,
and lazy/preload policy should be reviewed separately from engine JavaScript.

No package public export was added during Complexity Reset, CR3, or CR4, so
there is no newly promoted ABI awaiting a second consumer. Desktop JSON-file
persistence, multi-process/crash durability, packaging, and final filesystem
download naming retain their separate preview/promotion boundaries.

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

This command stages a static runtime Player only. It does not package an author
entry, source-write/CAS endpoints, the embedded Authoring Host, or the real
dev-source client, and it does not pass Deno Desktop's development `--hmr`
flag. A separate macOS arm64 / Deno 2.9.5 native common-runtime smoke has proved
the latest Engine Lab static Player's GUI readiness, authoritative operation,
same-window Game/Session restart, close acknowledgement, autosave flush, and
normal process exit. It does not establish native Desktop embedded authoring,
R0–R2 updates, source persistence, the packaged artifact, multi-platform
launch, or crash durability. Those remain AR5 or separately accepted Desktop
Module Update Source/persistence lanes; this preview still does not make a
persistence, packaging, signing, or multi-platform production claim.

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
- **Cloudflare Workers** — `wrangler.jsonc` declares an assets-only Worker serving `dist/site`. Deploy from a local machine with `deno task site:build && deno task site:deploy:cf` (authenticate once with `deno run -A npm:wrangler@4.123.0 login`). Root-based hosting, so the default `SITE_BASE=/` is correct; the site lands at `https://silly-maker.<account>.workers.dev/` or a custom domain.

### Standalone application deployment (one Player, no docs site)

A Player bundle is already self-contained static hosting input — relative base,
assets resolved against `document.baseURI`, saves in the visitor's IndexedDB —
so publishing one application independently can deploy `dist-web/` directly.
It does not need an Artifact manifest.

- **Cloudflare Workers** — the template and each example carry an app-local `wrangler.jsonc` (assets-only Worker serving `./dist-web`) and a `deploy:cf` script. From the application directory: `deno task deploy:cf` (builds, then deploys; authenticate once with `deno run -A npm:wrangler@4.123.0 login`). The Player lands at `https://<worker-name>.<account>.workers.dev/`. The `name` field in `wrangler.jsonc` is the Worker name — template copies rename it with the rest of the project; each application deploys as its own Worker, independent of the composed site. The wrangler version is pinned in each project's `package.json` and task; bump both together.
- **GitHub Pages** — one repository owns one Pages site, and this repository's Pages slot serves the composed site (which already hosts the Player under `/play/<app>/`). For a truly standalone Pages deployment, publish the built `dist-web/` contents from a dedicated repository; the relative-base bundle works unchanged from any path.

Remote distribution makes the SillyMaker MIT text available through the
Player's project-license link or the files in an offline Artifact. A template
copy may choose its own license for new project-owned Story code and content
while retaining the SillyMaker MIT text for engine code it distributes.

Each application's `<appRoot>/metadata.json` configures the deployed page's share presentation — document title, description, html lang, theme color, Open Graph / Twitter card, share image, and favicon (`parseStoryMetadataV1` validates the shape; the Vite config injects the tags at build time; Stories without the file keep their hand-written head). Share-image paths are story-relative; the site composer absolutizes `og:image`/`twitter:image` and pins `og:url` when `SITE_ORIGIN` is set (the GitHub Pages workflow provides it automatically).

Both targets were validated against a sub-path static server and the local `wrangler dev` runtime (docs, game, runtime assets, and the `/zh/` locale all resolve).

## Distribution checklist

Before deploying a hosted Player:

1. run `deno task check`;
2. run browser tests relevant to the change;
3. run `deno task build:web` (or `deno task story build <app>` from the root);
4. run the prebuilt browser suite for the application;
5. confirm the deployed product exposes the SillyMaker project license;
6. record the source revision and any known gameplay/content/platform
   limitations in the deployment note.

If the release advertises compatibility with maintained Saves, also run the
four-fixture lifecycle corpus and four-runtime migration matrix described above;
list the supported floor explicitly rather than promising unbounded historical
compatibility.

For an offline handoff, integrity workflow, signed package, updater, or store
submission, also prepare the optional Artifact, inspect its technical manifest
and project license files, and test the exact package. Current Desktop output
remains a preview and has not completed that release handoff gate. For a Desktop
preview, launch on the named target and verify write → exit → reopen.

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
manifest belong in the Player. Local `references/` and media working archives,
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
