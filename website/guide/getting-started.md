# Getting started with AI

The fastest way to use SillyMaker is to not touch it at all: you drive a coding agent, the agent drives the engine. Setup, game creation, debugging — everything below is a prompt you paste into your agent tool. You never leave it.

**What you need**: any coding-agent software that can read/write files and run terminal commands (an IDE agent, a CLI agent, or a cloud agent — all fine; stronger models simply produce more coherent stories in fewer rounds).

## Prompt 1 — set up the environment

Paste this into your agent:

```text
Set up the SillyMaker engine on this machine:

1. Check whether Deno >= 2.9 is installed (`deno --version`); if not, install it
   (macOS/Linux: `curl -fsSL https://deno.land/install.sh | sh`,
   Windows PowerShell: `irm https://deno.land/install.ps1 | iex`) and make sure
   it is on PATH.
2. Clone https://github.com/jasl/silly-maker and cd into it.
3. Run `deno install` to resolve dependencies.
4. Run `deno task check` and report the result. Everything must be green —
   this is the baseline; any failure you cause later is yours to fix.
```

When the agent reports a green `deno task check`, you have a working engine plus its whole test suite as a safety net.

## Prompt 2 — make a game

Replace the ⟨brackets⟩ and paste. This is the same task-brief shape that produced the `examples/bookshop` Story (a model delivered it in one pass):

```text
Create a new game in this repository: ⟨one-line premise — e.g. "a night-shift
taxi driver, three passenger stories, two endings"⟩.

Process:
1. Read template/AGENTS.md and docs/engine/authoring-quickstart.md first.
2. Copy template/ to examples/⟨name⟩ (or anywhere outside the repository), rename
   globally (template/Template → ⟨name⟩), update sillymaker.config.ts and
   metadata.json. Inside this repository also add the directory to the root
   project.config.ts list; outside it, point package.json dependencies at the
   engine packages by relative file: path.
3. Write the script in src/narrative.ts + text catalogs in src/presentation.ts;
   gameplay state goes through src/state.ts → src/simulation.ts →
   src/application/semantic.ts → src/story.ts.
4. Before editing the script, list the node sequence (one occurrence number per
   say/choice boundary) so scenario scripts and tests are written correctly once.

Acceptance (all must pass):
- deno task typecheck
- deno run -A npm:vitest run examples/⟨name⟩
- deno task story check ⟨app-id⟩
- deno task story simulate ⟨app-id⟩ --scenario ⟨one per major route⟩
- deno task check

Boundaries: import only @sillymaker/* package exports; do not modify the engine
or other Stories; no new dependencies.
```

## Prompt 3 — play and debug

Still without leaving the agent:

```text
Start the dev server for ⟨app-id⟩ (deno task story dev ⟨app-id⟩) and give me
the URL to open in my browser. Then:
1. Run every simulate scenario and summarize the end state of each route.
2. Run `git diff --stat` and confirm the changes touch only the new Story
   directory (plus the one-line project.config.ts list entry, if in-repo).
3. If I report a bug, reproduce it in a simulate scenario first, fix it, and
   rerun the acceptance commands.
```

Open the URL it gives you and play. If you prefer running things yourself, the underlying commands are plain:

```sh
deno task story dev <app-id>                          # play in the browser
deno task story simulate <app-id> --scenario <name>   # play headlessly
deno task story simulate <app-id> --scenario <name> \
  --trace game.<dot.path>                             # numeric trajectories
```

## Prompt 4 — publish

A Player build is a self-contained static bundle (relative paths, saves in each visitor's browser — no server), so publishing is just static hosting. Every project ships a ready `deploy:cf` task for Cloudflare Workers:

```text
Publish ⟨app directory⟩ to Cloudflare Workers:

1. If wrangler is not authenticated yet, run `deno run -A npm:wrangler login`
   and hand the browser authorization to me.
2. Check wrangler.jsonc in the app directory: the `name` field is the Worker
   name and becomes the public `<name>.<account>.workers.dev` URL — rename it
   to match the game if it still carries the template name.
3. Run `deno task deploy:cf` from the app directory (it builds dist-web/ and
   deploys it), then give me the deployed URL to open.
```

For GitHub Pages instead: one repository hosts one Pages site, so give the game its own repository — push the built `dist-web/` contents to it and enable Settings → Pages → Deploy from branch. The relative-base bundle works unchanged from any path. Details for both targets live in [Build and release](https://github.com/jasl/silly-maker/blob/main/docs/engine/build-and-release.md).

## Advice that improves results

- **Give a concrete premise** — named characters, a place, and the endings you want. "Make something fun" produces mush; "a lighthouse keeper, one stormy night, a stranger knocks, three ways it ends" produces a game.
- **Demand one simulate scenario per route** in the acceptance list — it forces the agent to actually play every path it wrote.
- **Keep the first pass small**: an opening scene, two or three choices, two endings. Then iterate — the template handbook's optional wire-up list (share metadata, audio, playback QoL, rollback, save guards) is designed to be added one prompt at a time.
- **Paste failures back verbatim.** The engine's diagnostics carry node paths and expected occurrence numbers; agents fix them reliably when given the raw output.

## How it works underneath

Curious what the agent actually did — or want to do it by hand? [Manual setup](/guide/manual-setup) walks the same steps as commands, and the Introduction section ([What the engine provides](/guide/features), [Architecture](/guide/architecture), [Core concepts](/guide/concepts)) explains why the engine is shaped this way.
