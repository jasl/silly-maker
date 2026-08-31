# SillyMaker

English | [简体中文](README.zh-CN.md)

A human–agent co-creation engine for GUI applications and games, built with
TypeScript and React. SillyMaker turns product intent into shared, inspectable
artifacts and executable acceptance: people define and refine the result while
coding agents implement against the same ownership boundaries and runtime
evidence. Browser and [Deno](https://deno.com/) Desktop preview are the current
targets.

**Explore the maintained flagship VN Reference Product**:
[One Last Sound Check](examples/vn-last-sound-check/) is an original, complete,
two-route Visual Novel that exercises the recommended Narrative/Stage, Player,
Save, audio, localization, responsive, and Inspector authoring paths. Its
publishable Browser artifact is wired into the static site; this repository does
not claim that a remote live deployment has been performed.

**Explore the GUI product direction**: [SillyOS](examples/silly-os/) currently
ships the bundled **Agent Creator** and **Translation** Programs. Creator turns
a creative intent into a reviewable Program workspace; Translation owns an
import, Agent candidate, human review, and accepted-result loop inside one
durable Process. Bundling controls distribution and discovery only: both use
the same fixed Program container and runtime rules, with no privileged Program
class. A deterministic local preview remains available;
configured Browser Provider routes run the product-pinned Pi inside an Agent
Worker over typed Worker RPC, with a browser-local Program database and an
OPFS-backed mutable workspace checkpoint. The current recovery
and single-writer ownership contract, Chromium/WebKit 20 MiB-class storage gate,
and origin-storage estimate/persistence-request UI are implemented. SillyOS uses
the public transport-neutral Agent Session client, but its Pi wire, Agent Host,
Programs, Provider UI, and persistence remain product-owned; this is not a public
Agent Host ABI or Desktop-persistence claim. The current mutable Workspace head
can be downloaded as a canonical ZIP and an accepted immutable snapshot is
retained locally; accepted-snapshot download and portable full-product
import/restore are not implemented.

## Why SillyMaker

- **The engine is the harness** — project maps, structured source artifacts,
  explicit owners, diagnostics, simulation, browser evidence, and human review
  keep a coding agent inside the same definition of done. A playable vertical
  slice remains a slice until the declared product scope is complete.
- **Deterministic on supported paths** — one session owns authoritative state; admitted commands commit atomically or not at all; transactional RNG travels inside snapshots, so supported replay and rollback paths reproduce recorded outcomes.
- **Semantic stage, not a canvas** — Stories publish plain-data stage targets (content IDs, placements, appearances, hit regions); renderers are swappable React components; saves never contain renderer state.
- **Static data as content tables** — items, activities, events, and reactions live in validated content-database tables with typed queries; mutable state stays in modules; tuning is editing a table row.
- **Human control stays explicit** — the current development Inspector supports
  bounded Authoring Scene edits and read-only runtime facets; code and source
  data remain first-class. A broader shared editor is a direction, not a
  shipped no-code claim.

## Quick start

Requires Deno >= 2.9.0 (runtime and package manager in one; npm dependencies resolve through Deno's Node compatibility).

```sh
deno install
cd template
deno run dev             # start this application's Vite server
```

Common commands:

- `deno task check` — the canonical local gate: format, lint, typecheck, and the product-level test suite;
- `deno task test` / `deno task test:e2e` — engine/game behavior tests and browser user flows;
- `deno task app <verb> <app>` — the explicit repository application CLI (dev / inspect / check / simulate / build / desktop, JSON reports where applicable);
- `deno task site:build` — compose the publishable static site (docs + the
  flagship VN, with a link to standalone SillyOS) into `dist/site`, then deploy via the GitHub
  Pages workflow or `deno task site:deploy:cf` (Cloudflare Workers); see
  [build-and-release](docs/engine/build-and-release.md).

Start a new product by copying [`template/`](template/) and following its
README. It is game-first; GUI-only products use the documented copy-and-reduce
recipe instead of retaining empty game owners. Each application is a
self-contained project with its own `sillymaker.config.ts`; the root
[`project.config.ts`](project.config.ts) only lists application directories
for repository-wide commands.

## Documentation

- [Documentation map](docs/README.md) — the index of everything below
- [Architecture](docs/engine/architecture.md) · [Features](docs/engine/features.md) · [Roadmap](docs/engine/roadmap.md)
- [Development and testing](docs/engine/development.md) · [Story authoring](docs/engine/story-authoring.md) · [Authoring quickstart](docs/engine/authoring-quickstart.md)
- [Agent game guide](docs/engine/agent-game-guide.md) — turn a complete product
  brief into reviewable implementation slices and evidence
- [Build and release](docs/engine/build-and-release.md) (web, static hosting, desktop packaging)
- Public site (Astro + Starlight, Markdown/MDX, en/zh) lives in [`website/`](website/)

## Repository map

```text
engine/packages/base     Generic contracts, Story authoring, runtime, saves, diagnostics
engine/packages/tooling  Project config and application CLI commands
engine/packages/ui       Generic React GUI/game UI and presentation runtime
engine/packages/web      Browser host, IndexedDB/HTTP persistence, mounting, automation
e2e/                     The neutral engine-conformance Story (Engine Lab)
template/                The starter skeleton for new games
examples/                Maintained products (One Last Sound Check, SillyOS)
project.config.ts        Repository directory list for aggregate commands
scripts/                 Build identity, asset checks, desktop save server, site composer
docs/                    Internal engineering docs (plans, research, proposals, policies)
website/                 The public documentation site (Astro + Starlight, en + zh)
```

Workspace packages are private; “public export” means a supported in-repo package entry, not an npm release.

## License

Copyright © 2026 Jun Jiang (jasl).

The whole repository — engine, examples, scripts, and documentation — is [MIT](LICENSE.md). Project-owned media assets under `examples/*/assets/**` and `art-source/**` are dedicated to the public domain under CC0 1.0: commercial use, derivatives, and redistribution without restriction. Contribution guidelines: [CONTRIBUTING.md](CONTRIBUTING.md).
