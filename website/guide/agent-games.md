# Build a game with a coding agent

SillyMaker is built to be authored by AI agents: the repository carries agent handbooks that most coding-agent tools read automatically, every acceptance command reports structured JSON the agent can self-check against, and headless simulation lets it play the game it just wrote without opening a browser. The `examples/bookshop` Story was produced exactly this way — a model received a task brief and delivered a working game in one pass.

This page is for humans driving the process with their own agent tooling.

## What you need

- A coding-agent tool that can **read and write repository files and run terminal commands**. Any agent in that category works — IDE agents, CLI agents, or cloud agents; we don't recommend specific models, though stronger models produce more coherent stories in fewer rounds.
- A clone of the repository and Deno >= 2.9.0. Verify the baseline before involving the agent:

```sh
deno install
deno task check
```

If `deno task check` is green on a fresh clone, every failure the agent causes later is the agent's to fix — that framing keeps the loop honest.

## Why little preparation is needed

The repository already speaks to agents:

- `AGENTS.md` files at the root and inside `template/`, `examples/`, and `e2e/` describe change discipline, what the engine provides for free, and the optional wire-ups (audio, rollback, save guards…) with one entry point each. Most agent tools load these automatically; if yours doesn't, paste `template/AGENTS.md` into the conversation.
- `deno task story check` and `story simulate` emit JSON reports, so the agent can verify its own story routes headlessly.
- The starter (`template/`) is a complete playable game — the agent edits a working thing rather than assembling scaffolding.

## The prompt

Paste this task brief, replacing the ⟨brackets⟩. It is the same shape that produced the bookshop example:

```text
Create a new game in this repository: ⟨one-line premise — e.g. "a night-shift
taxi driver, three passenger stories, two endings"⟩.

Process:
1. Read template/AGENTS.md and docs/engine/authoring-quickstart.md first.
2. Copy template/ to examples/⟨name⟩, rename globally (template/Template → ⟨name⟩),
   register the app in the root project.config.ts, update metadata.json.
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

## Reviewing what comes back

1. **Numbers first**: `deno task story simulate <app-id> --scenario <name>` — the report shows the end state and command sequence for each route; broken routes are obvious before you ever open a browser.
2. **Then play it**: `deno task dev` (with `--mode <app-id>`) and click through every route and ending.
3. **Check the footprint**: `git diff --stat` should touch only the new Story directory plus `project.config.ts`. Engine or other-Story edits are an automatic rework request.

## Advice that improves results

- **Give a concrete premise** — named characters, a place, and the endings you want. "Make something fun" produces mush; "a lighthouse keeper, one stormy night, a stranger knocks, three ways it ends" produces a game.
- **Demand one simulate scenario per route** in the acceptance list. It forces the agent to actually play every path it wrote.
- **Keep the first pass small**: an opening scene, two or three choices, two endings. Then iterate — the template handbook's optional wire-up list (share metadata, audio, playback QoL, rollback, save guards) is designed to be added one prompt at a time.
- **Paste failures back verbatim.** The engine's diagnostics carry node paths and expected occurrence numbers; agents fix them reliably when given the raw output.
- **Watch the interaction numbering.** Adding or removing a say/choice shifts occurrence numbers; the failure messages state the expected values, so asking the agent to "renumber per the failure output" resolves it.

The in-repo version of this workflow, including the failure playbook, lives in `docs/engine/agent-game-guide.md`.
