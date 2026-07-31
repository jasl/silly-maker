# Story CLI

Applications are self-contained projects (their own `sillymaker.config.ts` and `vite.config.ts`). Builds are application tasks run inside the application directory; the story CLI carries diagnostics and repository-level aggregation (inside an application, `deno task story <verb> .` selects that application).

## Inside an application directory

| Command                                   | What it does                                                                                                                                                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deno task dev`                           | Vite dev server for this application                                                                                                                                                                            |
| `deno task build:web`                     | Production Player bundle into `dist-web/` (`build` is its alias)                                                                                                                                                |
| `deno task build:desktop [--target <t>]…` | Desktop package(s) into `dist-desktop/` (host `.app` by default; triples cross-compile `.app`/`.msi`/`.AppImage`; names carry the app version and git commit when known, e.g. `App-0_1_0-abc1234-<triple>.msi`) |
| `deno task preview`                       | Serve `dist-web/` over HTTP (`file://` cannot load ES modules)                                                                                                                                                  |
| `deno task story <verb> .`                | App-local diagnostics: `inspect`, `check`, `simulate`, `dev --smoke`, `prebuilt-smoke`, `diff`                                                                                                                  |

`build:desktop` forwards appended flags to the packaging verb: `--target <os-arch-triple>` (repeatable), `--compress[=xz|lzma|zstd]`, `--profile <release|debug>`. Local file-store durability is not yet promoted.

## Repository root (workspace aggregation)

| Command                                            | What it does                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `deno task story check <app>` \| `--all`           | Structured Story diagnostics                                     |
| `deno task story simulate <app> --scenario <name>` | Headless scripted playthrough via the Agent port                 |
| `deno task story simulate … --trace <dot.paths>`   | Adds per-step numeric trajectories to the report                 |
| `deno task story inspect <app>`                    | Resolved Story identity and composition report                   |
| `deno task story diff <a.json> <b.json>`           | Structured diff of two JSON files (saves, reports)               |
| `deno task story build <app>`                      | Build a registered application from the root (CI aggregation)    |
| `deno task story desktop <app>`                    | Desktop packaging for a registered application from the root     |
| `deno task story dev <app>`                        | Vite dev server for one application (`--smoke` boots and probes) |

## Repository-wide

| Command                                                             | What it does                                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `deno task check`                                                   | Format check, lint, typecheck, all unit tests, asset and Story checks         |
| `deno task test:e2e`                                                | Browser conformance suites (Chromium, WebKit, touch projects)                 |
| `deno task desktop:save-server --dist <app>/dist-web --saves <dir>` | Preview loopback server with validated file-backed records (`?records=local`) |
| `deno task docs:dev` / `docs:build`                                 | This documentation site                                                       |

Seeds make simulation deterministic: `--seed <uint>` forwards to the application's bootstrap entropy.
