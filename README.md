# SillyMaker

English | [简体中文](README.zh-CN.md)

An LLM-friendly TypeScript + React game engine for visual novels, management sims, and RPG-flavored story games. Deterministic simulation, a semantic stage, atomic saves — authorable by humans and AI agents alike, running on [Deno](https://deno.com/).

**Play the flagship example**: the [Cat Cafe](examples/cat-cafe/) (《雨巷猫舍》) is a complete, publishable game built to drive the engine — title screen, scheduling gameplay, petting hit-regions, a turn-based contest, an album, multiple endings with a postgame, dialogue playback QoL (typewriter / auto / skip / history / rollback), scene-driven audio, save slots with safepoints, bilingual text, and one-step desktop packaging.

## Why SillyMaker

- **Deterministic by construction** — one session owns authoritative state; commands commit atomically or not at all; RNG travels inside snapshots, so replay and player rollback reproduce the same run bit for bit.
- **Semantic stage, not a canvas** — Stories publish plain-data stage targets (content IDs, placements, appearances, hit regions); renderers are swappable React components; saves never contain renderer state.
- **Static data as content tables** — items, activities, events, and reactions live in validated content-database tables with typed queries; mutable state stays in modules; tuning is editing a table row.
- **Built for both audiences** — AI agents get structured diagnostics, headless simulation, and authoring canaries; humans get a DevDock with live inspectors, a writable tuning panel, trajectory traces, and save diffs.

## Quick start

Requires Deno >= 2.9.0 (runtime and package manager in one; npm dependencies resolve through Deno's Node compatibility).

```sh
deno install
deno task dev            # Vite dev server (pick an app with --mode <applicationId>)
```

Common commands:

- `deno task check` — the canonical local gate: format, lint, typecheck, and the product-level test suite;
- `deno task test` / `deno task test:e2e` — engine/game behavior tests and browser user flows;
- `deno task story <verb> <app>` — the application lifecycle CLI (inspect / check / simulate / dev --smoke / build / desktop, JSON reports);
- `deno task site:build` — compose the publishable static site (docs + the playable Cat Cafe) into `dist/site`, then deploy via the GitHub Pages workflow or `deno task site:deploy:cf` (Cloudflare Workers); see [build-and-release](docs/engine/build-and-release.md).

Start a new game by copying [`template/`](template/) and following its README; every application registers in [`project.config.ts`](project.config.ts).

## Documentation

- [Documentation map](docs/README.md) — the index of everything below
- [Architecture](docs/engine/architecture.md) · [Features](docs/engine/features.md) · [Roadmap](docs/engine/roadmap.md)
- [Development and testing](docs/engine/development.md) · [Story authoring](docs/engine/story-authoring.md) · [Authoring quickstart](docs/engine/authoring-quickstart.md)
- [Agent game guide](docs/engine/agent-game-guide.md) — point a coding agent at this repo and get a game back
- [Build and release](docs/engine/build-and-release.md) (web, static hosting, desktop packaging)
- Public site (VitePress, en/zh) lives in [`website/`](website/)

## Repository map

```text
engine/packages/base     Generic contracts, Story authoring, runtime, saves, diagnostics
engine/packages/tooling  Project config and story CLI commands
engine/packages/ui       Generic React game UI and presentation runtime
engine/packages/web      Browser host, IndexedDB/HTTP persistence, mounting, automation
e2e/                     The neutral engine-conformance Story (Engine Lab)
template/                The starter skeleton for new games
examples/                Example Stories (bookshop, cat-cafe)
project.config.ts        Where every application registers
scripts/                 Build identity, asset checks, desktop save server, site composer
docs/                    Internal engineering docs (plans, research, proposals, policies)
website/                 The public documentation site (VitePress, en + zh)
```

Workspace packages are private; “public export” means a supported in-repo package entry, not an npm release.

## License

Copyright © 2026 Jun Jiang (jasl).

The whole repository — engine, examples, scripts, and documentation — is [MIT](LICENSE.md). AI-generated and synthesized media assets (images and audio under `examples/*/assets/**` and `art-source/**`) are dedicated to the public domain under CC0 1.0: commercial use, derivatives, and redistribution without restriction. Third-party materials keep their own terms. Contribution guidelines: [CONTRIBUTING.md](CONTRIBUTING.md).
