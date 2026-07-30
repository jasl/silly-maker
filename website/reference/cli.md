# Story CLI

All commands run through Deno tasks from the repository root; every verb also runs app-locally inside an application directory via `deno run -A tools/story.mts <verb> .` (applications are self-contained projects with their own `sillymaker.config.ts` and `vite.config.ts`).

## Everyday

| Command                                            | What it does                                                                                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `deno task story dev <app>`                        | Vite dev server for one application (`--smoke` boots, probes, and exits)                                                                               |
| `deno task story check <app>` \| `--all`           | Structured Story diagnostics                                                                                                                           |
| `deno task story simulate <app> --scenario <name>` | Headless scripted playthrough via the Agent port                                                                                                       |
| `deno task story simulate … --trace <dot.paths>`   | Adds per-step numeric trajectories to the report                                                                                                       |
| `deno task story build <app>`                      | Production Player bundle into `<app>/dist-web`                                                                                                         |
| `deno task story desktop <app>`                    | Desktop packaging preview (host `.app`; `--target <triple>` cross-compiles `.app`/`.msi`/`.AppImage`); local file-store durability is not yet promoted |
| `deno task story diff <a.json> <b.json>`           | Structured diff of two JSON files (saves, reports)                                                                                                     |
| `deno task story inspect <app>`                    | Resolved Story identity and composition report                                                                                                         |

## Repository-wide

| Command                                                             | What it does                                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `deno task check`                                                   | Format check, lint, typecheck, all unit tests, asset and Story checks         |
| `deno task test:e2e`                                                | Browser conformance suites (Chromium, WebKit, touch projects)                 |
| `deno task desktop:save-server --dist <app>/dist-web --saves <dir>` | Preview loopback server with validated file-backed records (`?records=local`) |
| `deno task docs:dev` / `docs:build`                                 | This documentation site                                                       |

Seeds make simulation deterministic: `--seed <uint>` forwards to the application's bootstrap entropy.
