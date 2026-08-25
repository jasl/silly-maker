# Having a coding agent generate a game

Status: operating guide for the current implementation. For anyone using an LLM coding agent to build a new game in this repository. The maintained examples and acceptance commands demonstrate the supported workflow.

## How it works

The repository prepares three tiers of material for the agent; feed them as needed:

1. **Handbook** (required reading, cheap in tokens): `template/AGENTS.md` — the starter skeleton's change discipline, the engine baseline (what you get for free), and the optional-wiring checklist (audio/rollback/save guard etc., one entry point each).
2. **Quickstart** (look up per task): `docs/engine/authoring-quickstart.md` — the difficulty-tiered operating guide and diagnostics quick-reference.
3. **Reference implementations** (copy as needed): `examples/bookshop` (minimal complete script) and `examples/cat-cafe` (full-capability flagship; design spec in its `DESIGN.md`).

A curated repository example also follows the complete
[reference-application product contract](../../examples/AGENTS.md#reference-application-product-contract).
The commands below are implementation gates for a small original starter; they
do not prove a reference-derived product's full baseline, target-platform
uplift, content scale, or completion.

The engine's acceptance commands all emit structured JSON, so the agent can self-check and self-correct; deterministic simulation (`story simulate`) lets it play through its own game without opening a browser.

## Task-brief template (paste to the agent; replace the ⟨⟩ parts)

```text
Create a new game in this repository: ⟨one-line premise and goal, e.g. "a rainy-night
taxi driver's three passenger stories, two endings"⟩.

Process requirements:
1. First read template/AGENTS.md, examples/AGENTS.md, and
   docs/engine/authoring-quickstart.md.
2. Copy template/ to examples/⟨new-name⟩, global-rename (template/Template → ⟨new-name⟩),
   register the application and simulate target in the root project.config.ts,
   update metadata.json.
3. Write the script (src/story/narrative.ts + the text catalog in src/content/presentation.ts);
   gameplay state goes into modules
   (src/game/state.ts → src/game/simulation.ts → src/application/semantic.ts → src/story.ts).
4. Before touching the script, table the node sequence (one occurrence number per
   say/choice) so the scenario script and tests are written correctly in one pass.

Implementation gates (all must pass; these are not product-completion evidence):
- deno task typecheck
- deno run -A npm:vitest run examples/⟨new-name⟩
- deno task story check ⟨app id⟩
- deno task story simulate ⟨app id⟩ --scenario ⟨one scenario per major route⟩
- deno task check (final, full)

Boundaries: import only @sillymaker/* package exports; do not modify the engine or
other Stories. This minimal starter brief adds no dependencies; a separately
accepted product brief may use mature ecosystem dependencies under the Examples
product contract.
```

## How a human accepts the result

1. **Product contract first**: for a curated/reference-derived example, reconcile
   the complete baseline and target-platform-uplift coverage table, then obtain
   the independent completion review required by `examples/AGENTS.md`. A
   playable route or successful demo remains WIP evidence only.
2. **Numbers next**: `deno task story simulate <appId> --scenario <name>` — the report contains the final state and command sequence, so that route's completion is obvious at a glance; trace value trajectories with `--trace <dot.paths>`.
3. **Then the browser**: `deno task dev` (`--mode <appId>`) and play the declared representative viewport/Input classes and product paths. For the small original brief above, click through its dialogue, choices, and each ending; larger products follow their coverage table.
4. **Check the change surface**: `git diff --stat` should land only in the accepted application and repository-registration/docs surface. Engine changes require the separate focused-plan loop; unrelated Stories are rejected outright.
5. **Tuning**: enable developer tools in Settings → the DevDock tuning panel changes values live; compare saves with `deno task story diff <a> <b>`.

## Common failures and handling

| Symptom                                           | Handling                                                                                                          |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Occurrence assertion mismatch                     | renumber per the failure message (adding/removing interaction boundaries shifts numbers; see the template README) |
| `story check` reports narrative-graph diagnostics | the report carries node paths: a `branch` target outside `successors`, a missing text id, etc.; fix as stated     |
| State rejected by canonical JSON                  | saveable state holds integers only (logical units like `scalePermille`); floats never enter saves                 |
| The agent modified engine code                    | reject: Stories import only package exports; raise engine issues separately, outside the task brief               |

## Capability upgrade path

Once the first WIP version plays through, have the agent add items from the
"optional wiring" checklist in `template/AGENTS.md` one by one: web share
metadata → audio layer (synthesized placeholder audio first) → dialogue playback
QoL → player rollback → save safepoints → stage hit regions / content tables.
Each has a complete reference in cat-cafe. This incremental path does not make a
curated/reference-derived example complete before its full product contract
closes.
