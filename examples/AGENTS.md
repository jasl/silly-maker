# examples/ agent handbook

This directory collects the example Stories; each subdirectory is an independent package:

| Package     | Showcases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | License                             |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `bookshop/` | Minimal complete script authoring example                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | MIT                                 |
| `cat-cafe/` | The flagship complete game: content database, stage hit regions, turn structure, event pool, meta progression, i18n, tuning channel, runtime art pipeline (transparent character art + CSS idle/feedback animation), scene-driven audio layer (BGM/rain/SFX), Narrative runtime QoL (typewriter/auto/skip/history), player rollback (contest start and endings are barriers), save safepoints, package-owned splash + title screen, a publication-selected WholeCanvas ending + epilogue, host/cross-target desktop packaging preview (Darwin icon; file persistence not durability-promoted); design spec in `cat-cafe/DESIGN.md` | Code and text MIT; media assets CC0 |
| `silly-os/` | Retro desktop shell: window manager (overlap/focus/minimize/maximize/drag, UI-transient), app registry, deterministic minesweeper (transaction-RNG mine placement, mine positions never reach the publication), notepad (saving is the hard disk), iframe browser, browser-language auto i18n, fully self-drawn system look (autosave/boot restore, control-panel window, taskbar volume tray, zero engine preset UI exposed)                                                                                                                                                                                                      | Code and text MIT; pixel icons CC0  |

Change discipline: **fix, don't extend** — examples are stable references for capability showcase. New gameplay experiments start a new package (copy from `template/`); do not pile them onto examples.

## Script/text tasks (most common)

Which file to edit: dialogue and UI copy → the textId catalog in `src/presentation.ts`; story nodes/branches/stage directives → `src/narrative.ts` (`src/features/dialogue/script.ts` in cat-cafe); stage renderers → `*StageRenderersV1` in `src/application/composition.tsx` (or the renderers inside a feature slice); HUD/panel components and the passive Narrative renderer → `src/application/ui.tsx`; Cat Cafe's passive ending renderer → `cat-cafe/src/features/endings/ending-screen.tsx`; the sole public Narrative and optional WholeCanvas definitions → `application.ui().narrative` / `application.ui().wholeCanvas` in `composition.tsx` (keep PascalCase components out of that application-declaration file for Vite Fast Refresh). `core-application.ts` is the headless instance factory, not the browser binding.

Before editing, list the full node sequence (one occurrence number per say/choice boundary, starting at 1) so the scenario script (`src/tooling/simulation-target.ts`) and tests are written correctly on the first pass.

Verification loop after every edit (seconds):

```sh
deno task typecheck
deno run -A npm:vitest run <this package directory>
deno task story simulate <appId> --scenario <name>
```

Rules in brief:

- Every new say/choice needs a brand-new `definitionId` (`interaction.<story>.<name>`); never reuse one.
- Bookshop and Cat Cafe use the composition-owned production Narrative surface; SillyOS intentionally omits `application.ui().narrative`. Do not add a second Narrative writer or revive the retired panel/player helpers.
- Cat Cafe is the first Story WholeCanvas consumer: semantic ending state selects its sole `catcafe.ending` primary, Continue enters the endless epilogue, and Restart installs fresh gameplay without returning to Title. Keep the renderer frame-only and dispatch those exact owner actions through the definition; never restore the retired HUD ending writer.
- Existing Splash/Title authoring remains the `titleScreen` declaration even though the package now renders both through its WholeCanvas authority. SillyOS intentionally omits both `titleScreen` and `application.ui().wholeCanvas`, so its default and shutdown paths allocate no WholeCanvas Host or Story definition.
- A `stage` node's `mayShow` honestly lists every contentId it might show; a `branch`'s `choose` must land inside `successors` (tests enforce both).
- New stage content is wired in three places: the contentId constant in narrative, the content catalog in presentation, the renderer in composition. For a scene-managed scene the narrative side is its Scene document (see the scene collaboration contract below).
- Saveable state holds integers only (logical units like `scalePermille`); floats are rejected by canonical JSON.
- Use `show` for content entering an empty stage; `replace` only for content already on stage.

## Module/state tasks

cat-cafe is organized by **feature slices**: one gameplay feature per `src/features/<name>/` directory (`module.ts` module, `content.ts` content tables, `rules.ts` pure rules, `handlers.ts` command handlers, `index.tsx` UI), shared contracts in `src/kernel.ts`, and `src/simulation.ts`/`src/content.ts` doing aggregation and re-export only (outsiders still face just these two facades). A new feature = a new directory + one line at each aggregation point; a missed command kind fails to compile.

Four wiring points: `state.ts` (interface + schema + initial value) → `features/<name>/module.ts` and `handlers.ts` (or `simulation.ts` in the simple packages) → `application/semantic.ts` (action catalog + blockedBy) → `simulation-definition.ts` (manifest entry; module ids in lexicographic order). Keep the package identity revision in `story.ts` synchronized. The revision-sync table and the diagnostics quick-reference are in `docs/engine/authoring-quickstart.md`; do not bump revisions from memory.

## Motion collaboration contract

Narrative entrance/exit animations are `src/**/*.motion.json` assets bound through `motionStageTransition` or a Scene document cue — the human tuning surface (the Motion Workbench edits them). Do not overwrite a motion whose `authoring.status` is `"human_tuned"` or that is `locked` unless the task explicitly names it (locked changes go through a new variant file with a new id); preserve stable motion/transition ids across scene refactors; new tunable animation goes into a new motion file (status `"generated"`), never inline duration/easing constants in scene code.

## Scene collaboration contract

Cat Cafe's opening is scene-managed: `src/scenes/opening/opening.scene.json` is the single authoring authority for that scene's visual composition — entry placements/appearance/zOrder and cue→motion binding. Stage nodes reference cues (`cueMutations`/`cueMayShow`); do not re-add placement literals, `hasTag` guards, or global enter-edge motion inference for a scene-managed scene, and do not edit the same scene through both the document and low-level mutations. Keep sceneId/cueId stable across refactors (transition ids derive from cue ids); the filename stem must stay the sceneId's final segment (`story check` lints scene documents: admission, unique ids, filename↔id, cue motion references).

## Forbidden

- Import only `@sillymaker/*` package exports; never import engine `src/**` paths, never import another Story.
- For engine-behavior questions read `docs/engine/features.md`; do not guess from engine source. The engine baseline and the optional-wiring checklist are in `template/AGENTS.md`.
- Do not loosen assertion semantics to make tests pass; when occurrence assertions mismatch, renumber per the failure message.
