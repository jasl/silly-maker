# Building a game with a coding agent

Status: operating guide for the current implementation. For anyone using an LLM coding agent to build a new game in this repository. The maintained examples and acceptance commands demonstrate the supported workflow.

## How it works

The repository prepares three tiers of material for the agent; feed them as needed:

1. **Handbook** (required reading, cheap in tokens): `template/AGENTS.md` — the starter skeleton's change discipline, the engine baseline (what you get for free), and the optional-wiring checklist (audio/rollback/save guard etc., one entry point each).
2. **Quickstart** (look up per task): `docs/engine/authoring-quickstart.md` — the difficulty-tiered operating guide and diagnostics quick-reference.
3. **Reference implementations** (study, do not inherit): `examples/bookshop`
   is the focused narrative-authoring example. The accepted VN Reference Tour
   will become the complete current VN product reference only after its active
   plan closes; start new products from `template/`, not from Bookshop.

A curated repository example also follows the complete
[reference-application product contract](../../examples/AGENTS.md#reference-application-product-contract).
The commands below are implementation gates for a small original starter; they
do not prove a reference-derived product's full baseline, target-platform
uplift, content scale, or completion.

The application CLI's `inspect`, `check`, and `simulate` commands emit
structured reports, so the agent can self-check and self-correct; deterministic
simulation lets it play through declared routes without opening a browser.
Typecheck, Vitest, and the complete repository gate keep their native output.

## Task-brief template (paste to the agent; replace the ⟨⟩ parts)

```text
Create a new game in this repository: ⟨one-line premise and goal, e.g. "a rainy-night
taxi driver's three passenger stories, two endings"⟩.

Process requirements:
1. First read template/AGENTS.md, examples/AGENTS.md, and
   docs/engine/authoring-quickstart.md.
2. Copy template/ to examples/⟨new-name⟩, global-rename (template/Template → ⟨new-name⟩),
   register the application directory in the root project.config.ts, keep the
   application's own simulate target in its sillymaker.config.ts, and update
   metadata.json.
3. Write narrative control and stable text references in src/story/narrative.ts;
   put narrative copy in assets/content/*.text-pack.json and its compact manifest
   in src/content/text-content.ts; resident UI copy stays in
   src/content/presentation.ts;
   gameplay state goes into modules
   (src/game/state.ts → src/game/simulation.ts → src/application/semantic.ts → src/story.ts).
4. Before touching the script, table the complete user-visible route/content
   denominator and acceptance. Starter scenarios resolve the current pending
   interaction; pin an occurrence only for an explicit stale-fence test.

Implementation gates (all must pass; these are not product-completion evidence):
- deno task typecheck
- deno run -A npm:vitest run examples/⟨new-name⟩
- deno task app check ⟨app id⟩
- deno task app simulate ⟨app id⟩ --scenario ⟨one scenario per major route⟩
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
2. **Numbers next**: `deno task app simulate <appId> --scenario <name>` — the report contains the final state and command sequence, so that route's completion is obvious at a glance; trace value trajectories with `--trace <dot.paths>`.
3. **Then the browser**: run `deno run dev` inside the application directory (or `deno task app dev <appId>` from the repository root), then play the declared representative viewport/Input classes and product paths. For the small original brief above, click through its dialogue, choices, and each ending; larger products follow their coverage table.
4. **Check the change surface**: `git diff --stat` should land only in the accepted application and repository-registration/docs surface. Engine changes require the separate focused-plan loop; unrelated Stories are rejected outright.
5. **Tuning and inspection**: open the development Inspector for bounded
   Authoring Scene edits and read-only runtime facets; edit unsupported
   authoring data directly at its source. Compare saves with
   `deno task app diff <a> <b>`.

## Common failures and handling

| Symptom                                         | Handling                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Explicit stale-fence occurrence mismatch        | update only the deliberately pinned expected occurrence after reviewing the new interaction order             |
| `app check` reports narrative-graph diagnostics | the report carries node paths: a `branch` target outside `successors`, a missing text id, etc.; fix as stated |
| State rejected by canonical JSON                | saveable state holds integers only (logical units like `scalePermille`); floats never enter saves             |
| The agent modified engine code                  | reject: Stories import only package exports; raise engine issues separately, outside the task brief           |

## Capability upgrade path

Once the first WIP version plays through, have the agent add only the items its
product contract needs from the "optional wiring" checklist in
`template/AGENTS.md`: for example web metadata, audio, dialogue playback QoL,
rollback, save safepoints, hit regions, or content tables. Engine contracts and
focused conformance tests are the authority until a current product reference
demonstrates a complete use. Incremental wiring does not make a curated or
reference-derived example complete before its full product contract closes.
