# Manual setup

This is what [Getting started with AI](/guide/getting-started) has the agent do for you — the same steps as plain commands, for when you want to understand the machine or work without an agent.

SillyMaker runs entirely on [Deno](https://deno.com) (>= 2.9): runtime, package manager, and tooling in one. npm dependencies resolve through Deno's Node compatibility.

## Set up

```sh
git clone https://github.com/jasl/silly-maker
cd silly-maker
deno install
```

## Run an example

The repository ships playable examples. `example-cat-cafe` exercises most engine systems (schedules, stats, touch interactions, a turn-based contest, an event pool, meta progress, audio, i18n):

```sh
deno task story dev example-cat-cafe
```

Open the printed URL. Right-click is "back", `Enter`/`Space` advances dialog, and the Settings dialog switches the language live.

## Verify like the project does

```sh
deno task check        # format, lint, typecheck, all unit tests, story checks
deno task test:e2e     # browser conformance suites (Chromium + WebKit)
```

A green `deno task check` is the project's own definition of "working" — the same gate the CI and the coding agents use.

## Play headlessly

Every application declares scripted scenarios that run without a browser — the same Agent port AI automation uses:

```sh
deno task story simulate example-cat-cafe --scenario first-day
deno task story simulate example-cat-cafe --scenario first-day \
  --trace game.cat.trust,game.shop.money
```

The `--trace` flag prints per-step numeric trajectories — the balance-tuning feedback loop.

## Where to go next

- [Your first Story](/guide/first-story) — copy the starter template and make it yours, by hand.
- [Tuning and debugging](/guide/tuning) — DevDock, debug commands, traces, and diffs.
- [Core concepts](/guide/concepts) — the five ideas everything else builds on.
