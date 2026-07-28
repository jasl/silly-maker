# Getting started

SillyMaker is a TypeScript + React engine for visual novels, life sims, and light RPGs. Everything — the engine, the tools, and your game — runs on [Deno](https://deno.com) (>= 2.9).

## Set up

```sh
git clone <repository>
cd silly-maker
deno install
```

## Run an example

The repository ships playable examples. `example-cat-cafe` exercises most engine systems (schedules, stats, touch interactions, a turn-based contest, an event pool, meta progress, i18n):

```sh
deno task story dev example-cat-cafe
```

Open the printed URL. Right-click is "back", `Enter`/`Space` advances dialog, and the Settings dialog switches the language live.

## Verify like the project does

```sh
deno task check        # format, lint, typecheck, all unit tests, story checks
deno task test:e2e     # browser conformance suites (Chromium + WebKit)
```

## Play headlessly

Every application declares scripted scenarios that run without a browser — the same Agent port AI automation uses:

```sh
deno task story simulate example-cat-cafe --scenario first-day
deno task story simulate example-cat-cafe --scenario first-day \
  --trace game.cat.trust,game.shop.money
```

The `--trace` flag prints per-step numeric trajectories — the balance-tuning feedback loop.

## Where to go next

- [Core concepts](/guide/concepts) — the five ideas everything else builds on.
- [Your first Story](/guide/first-story) — copy the starter template and make it yours.
- [Tuning and debugging](/guide/tuning) — DevDock, debug commands, traces, and diffs.
