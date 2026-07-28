# Story authoring quickstart

Status: operating guide for the current implementation. For human authors and LLM agents; layered by task difficulty — weaker models should start at tier A. Conceptual background in [story-authoring](story-authoring.md); full capabilities in [features](features.md).

## 0. One iron rule

Story code imports only `@sillymaker/*` package exports (`@sillymaker/base`, `@sillymaker/base/story`, `@sillymaker/base/runtime`, `@sillymaker/ui`, `@sillymaker/web`, `@sillymaker/tooling/project`). Never import engine `src/**` paths, never import another Story. The `public-import-boundary` test rejects violations.

Prefer importing from `@sillymaker/base/story`: it exports the current author-facing contract under version-suffix-free names (`SemanticStageState`, `StageMutation`, `PendingInteraction`, `NarrativeGraph`, `reduceStageMutations`, `evaluateInteractionResolution`…), fully equivalent to the suffixed originals.

## Tier A: script, text, and choices (weak models start here)

Use the starter template (`template`, minimally playable) or the Engine Lab (`e2e`, full capability) as the runnable example. Scripts are ordinary TypeScript data, not a DSL:

| What to change                        | Which file                                                         |
| ------------------------------------- | ------------------------------------------------------------------ |
| Dialogue, narration, option text      | `labTextCatalogsV1` in `src/presentation.ts` (textId → text)       |
| Story nodes, branches, stage commands | `labNarrativeScriptV1` in `src/gameplay/narrative.ts` (node array) |
| Voice/BGM mapping                     | `src/gameplay/audio.ts`                                            |
| Static annotations for the graph lint | `mayShow` on stage nodes, `successors` on branch nodes             |

Node kinds: `say` (speakerTextId/textId/next), `choice` (options: choiceId/textId/requiresSamples/consumesSamples/next), `stage` (`mutations(stage)` returns a StageMutation array; `mayShow` statically declares the contentIds it might show), `branch` (`choose(context)` is a pure function picking next, which must land inside `successors`), `pause`, `barrier`, `custom`, `end`. Every new say/choice needs a brand-new `definitionId` (`interaction.<story>.<name>`); never reuse one.

Verification loop after every edit (fast enough to run per change):

```sh
deno task typecheck                                # types and contracts
deno run -A npm:vitest run e2e/src/test/narrative-graph.test.ts   # graph lint clean + honest annotations
deno task story simulate e2e --scenario calibration   # play the full narrative without a browser, JSON output
deno task test:conformance:headless                # all headless conformance tests
```

Edits move occurrence numbers (each interaction boundary is numbered in order): the `calibration` scenario script for `simulate` and several tests step by number, so after inserting a boundary sync them — failure messages state the expected/actual numbers directly.

## Tier B: a new gameplay module (medium; the F2-canary-verified path)

**Code organization**: template and cat-cafe use the feature-slice layout — one gameplay feature per `src/features/<name>/` directory (module/content/rules/handlers/UI in their places), shared contracts in `src/kernel.ts`, and `src/simulation.ts` + `src/content.ts` doing aggregation and re-export only (outsiders face just these two facades; the command kind→handler map is an exhaustive mapped type, so a missed wire fails to compile). The Engine Lab (e2e/) intentionally stays a single-file low-level rig. Prefer "new directory + one line per aggregation point" for new features.

A new module = four wiring points, all inside the Story package:

1. `src/gameplay/state.ts`: state interface + zod schema + initial value, mounted into the aggregate state.
2. `src/gameplay/simulation.ts`: `kit.defineStatefulModule` (the owner's propose/apply); commands into `LabCommandV1`, facts into `LabFactV1`, rejection codes into `LabRejectionCodeV1`; open a transaction in the executor (cross-module writes via `transaction.propose(otherModule, …)`, atomically committed with the same command).
3. `src/application/semantic.ts`: action id into the catalog + the `blockedBy` availability rule (catalog/preview/dispatch share this one function).
4. `src/story.ts`: add the module entry to the state-contract manifest (**module ids in lexicographic order**) and sync revisions per the table below.

Revision-sync rules (mistakes are rejected at startup by structured diagnostics; just follow them):

| What changed                     | What must move                                                               |
| -------------------------------- | ---------------------------------------------------------------------------- |
| A module's state schema          | that module's `stateSchema.revision` + `moduleContractRevision`              |
| Module rules / command semantics | `moduleContractRevision`                                                     |
| Module added/removed             | manifest entry + `aggregateStateSchema.revision` + `stateContractRevision`   |
| Any of the above                 | story `identity.revision` +1, and update the `storyRevision` test assertions |

## Tier C: a new application / new Story (recommended for strong models)

One application = one `WebGameApplicationV1` declaration + one `startWebGameApplicationV1` call. Start from `template` (copy the directory + global rename + register one application); the full reference is `e2e/src/application/`. Application-directory conventions: `composition.tsx` (projector/slots/the `*GameApplicationV1` declaration), `ui.tsx` or `shell-ui.tsx` (PascalCase components, in a separate file from the application declaration for Vite Fast Refresh), `core-application.ts` (headless instance factory), `entry.tsx` (boots from composition). Once registered in `project.config.ts`, six lifecycle verbs are available:

```sh
deno task story inspect <app>    # resolved identity and program report
deno task story check <app>      # structured Story diagnostics
deno task story simulate <app> [--scenario s] [--seed n]
deno task story dev <app> --smoke
deno task story build <app>
deno task story prebuilt-smoke <app>
```

## Diagnostics quick-reference (all from real pitfalls)

| Symptom                                                                                            | Cause and fix                                                                                                                              |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `story.contract_invalid: State-contract module IDs must be strictly increasing`                    | manifest module entries not in lexicographic id order; reorder                                                                             |
| `story.simulation_invalid: State-contract manifest does not match GameSimulation stateful modules` | manifest and `composeModules` disagree on modules/revisions; sync per the table above                                                      |
| `story.nondeterministic: Story definitions differ`                                                 | `define()` returned a fresh object each call; hoist the definition to a module constant                                                    |
| `interaction.occurrence_mismatch`                                                                  | resolving with a stale occurrenceId; take `narrative.pending.occurrenceId` from the latest publication                                     |
| `CanonicalJsonError: number.not_integer`                                                           | a float reached saveable state; use integer logical units (e.g. `scalePermille`)                                                           |
| `e2e.ui_text_missing:<textId>`                                                                     | the script references an unregistered textId; add the catalog entry                                                                        |
| `narrative.successor_missing` / `narrative.pure_loop` (graph lint)                                 | a node's `next` targets a missing node / pure nodes form a loop with no interaction boundary; the diagnostic points back to the definition |
| Test assertions mismatch occurrence numbers                                                        | a new boundary shifted the numbering; renumber per the failure message                                                                     |

## Execution advice for LLM agents

- Do one tier's work at a time: an A-tier task must not casually touch B/C-tier files.
- Before editing a script, table the full node sequence (with the occurrence number of every interaction boundary), then write the scenario script and tests correctly in one pass instead of iterating on numbers.
- Run the tier-A verification loop after every edit and let diagnostics drive the next step, rather than batching edits and guessing at failures.
- For generic instantiations (`WebGameApplicationV1` has 15 type parameters), always copy an existing application declaration and modify it wholesale; never write one from scratch.
- For engine-behavior questions read the matching section of `docs/engine/features.md` first; do not guess from engine source.

## UI style quick-reference

- Skin and layout use only the published tokens: colors/spacing/radii/touch sizes are `--silly-color-*`, `--silly-space-*`, `--silly-radius-*`, `--silly-target-min-size` (defined in `theme/tokens.css` of `@sillymaker/ui`).
- **No raw z-index**: the seven stage layers use `--silly-stage-z-*` (matching `stageLayerIdsV1`), within-layer surfaces use the `--silly-surface-z-*` scale (base < raised < front-door < splash < dialog-backdrop < dialog < confirm-backdrop < confirm); the contract is test-guarded.
- Do not hand-roll chrome for gameplay windows (shop/inventory/album/history): mount them on the overlay session to get the `PanelV1` chrome automatically; standalone panels use `PanelV1` directly (title bar + close + focusable scroll body). Backdrop click and right-click close the topmost window by default; a window declaring `dismissible: false` is locked (only explicit close works). Right-click on controls has no default behavior (controls may declare `data-secondary-action`); the scene background's right-click action comes from the Story pointer map (default `cancel`, remappable to e.g. player rollback). Asset URLs via `useAssetUrlV1`/`resolveAssetUrlV1`, motion gating via `useReducedMotionV1`. Window exclusivity is slot-structural (`openPrimary` replaces / `pushDetail` stacks details); for dragging and other complex window needs see `docs/engine/design/window-model.md`.
