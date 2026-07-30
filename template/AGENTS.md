# template/ agent handbook

This package is the **starter skeleton for a new game** (MIT). To start a new story: copy this directory to `examples/<new-name>` (or anywhere outside the repository) → global rename (`template`/`Template` → the new name) → update `sillymaker.config.ts` (applicationId/label) and `metadata.json` (page title / share card) → replace the script and modules as needed. Inside this repository, also add the directory to the root `project.config.ts` list; outside it, point the `package.json` dependencies at the engine packages by relative `file:` path and set `"nodeModulesDir": "manual"` in the project's `deno.json`. The copy is a complete project: `deno task dev`, `deno task build:web` / `build:desktop` / `preview`, and `deno task story check .` run from the directory itself.

Change discipline: keep it minimally playable. The placeholder script may be replaced wholesale; do not grow new gameplay structure on the skeleton (that belongs in examples or real games).

## Browser pitfalls: engine-covered vs. game-side

Already covered by the engine (do not re-handle in a Story): text selection / image dragging / iOS long-press callout / double-tap zoom delay / scroll chaining and pull-to-refresh (stage CSS), right-click semantics (controls have no default action, scene background = close the topmost surface, controls may opt in via `data-secondary-action`), audio autoplay unlock and pause-on-hidden, reduced-motion degradation, stacking scales, window chrome and focus.

The game side must handle these itself (the engine cannot):

- **Keep the simulation layer DOM-clean**: `simulation.ts`/`state.ts`/content tables must not reference `window`/`document`/`matchMedia` (headless runs and replay break); browser APIs appear only under `application/` (`composition.tsx` / `ui.tsx`).
- **Application-layer file roles**: `composition.tsx` = projector, slots, labels, the `*GameApplicationV1` declaration; PascalCase React components live in `ui.tsx` (Vite Fast Refresh requires components not to share a file with non-component exports); `core-application.ts` = the headless instance factory; `entry.tsx` boots from `composition.tsx`.
- **No `Math.random()` or `Date.now()` on deterministic paths**: randomness goes through the transaction RNG, time through the engine clock.
- **Bilingual text overflow**: eyeball long strings in both languages (English often runs 30%+ longer than Chinese); lay out HUD/buttons flexibly.
- **Touch targets ≥ 32px**: compact buttons are already at the floor; do not shrink further.
- **Use engine hooks instead of hand-rolling**: asset URLs via `useAssetUrlV1`/`resolveAssetUrlV1`, motion gating via `useReducedMotionV1`, windows via the overlay session + `PanelV1` — hand-rolled copies miss the pitfalls the engine already fixed.

## Engine baseline (free; do not rewrite)

Declaring `titleScreen` (title / background art / optional `splash` intro lines) yields the full front door: splash → title screen (New game / Continue / Load game / Settings). The system menu is single-modal (save and settings are mutually exclusive; Esc / right-click / backdrop click closes the topmost surface; a window may declare `dismissible: false` to lock, in which case only its explicit close control works). The save dialog ships with slot lists, timestamps, import/export, and load-enters-gameplay. Settings ships with three volume sliders (BGM/voice/SFX), mute, text speed, auto-play dwell, fullscreen, and the developer-tools switch — preferences persist in the Host profile across saves.

## Optional wiring (one entry point each; see cat-cafe for examples)

- **Web metadata**: `metadata.json` (title/description/share card/favicon), injected into `<head>` at build time.
- **Audio**: declare audio assets with `resolveAudioManifestV1` (digest required) → project `AudioIntentV1` from the view (bgm/ambient/voice, restored on load) → mount `GameAudioV1` in the UI (map one-shot SFX from transient effects via `resolveEffectAsset`).
- **Dialogue panel**: mount `DialoguePanelV1` directly (typewriter, auto/skip, seen markers, history, click surface, and the shortcut bar in one); wire only pending/history/profile/text catalog and `onResolve`; test selectors use `data-dialogue-*`. The low-level pieces (`createTextRevealV1`/`createPlaybackControllerV1`) are only for custom players.
- **Player rollback**: add `rollback: { capacity, classify }` to the core definition (mark settlement/irreversible commands `"barrier"`); the UI uses `instance.rollback` (available/toPrevious/subscribe).
- **Save safepoints**: add `saveGuard(publication)` to the web definition to disable manual saves mid-dialogue or mid-battle with a reason text.
- **Stage hit regions**: declare `hitRegions` in the content catalog and pass `onHitRegionActivate` to `SemanticStageV1`.
- **Content tables**: `defineContentTable` + `createContentDatabase` — static definitions go into tables (validated at resolve time), mutable state goes into modules.
- **UI styling**: only the published `--silly-*` tokens (no raw z-index; the stacking scales are in the style quick-reference of `docs/engine/authoring-quickstart.md`); gameplay windows mounted on the overlay session get the `PanelV1` chrome automatically; native form controls pick up the theme as-is.
- **Window model**: exclusivity is structural (`openPrimary` replaces the primary window, `pushDetail` stacks details, system dialogs have a single slot); do not coordinate "open A, close B" yourself. For dragging / minimize / maximize needs, follow the game-side recipes in `docs/engine/design/window-model.md` first (coordinates through viewport conversion, positions in Story UI state); promote to the engine only once the pattern recurs.

## Script/text tasks (most common)

Which file to edit: dialogue and UI copy → the textId catalog in `src/presentation.ts`; story nodes/branches/stage directives → `src/narrative.ts`; stage renderers → `*StageRenderersV1` in `src/application/composition.tsx`; HUD/dialogue-panel components → `src/application/ui.tsx`.

Before editing, list the full node sequence (one occurrence number per say/choice boundary, starting at 1) so the scenario script (`src/tooling/simulation-target.ts`) and tests are written correctly on the first pass.

Verification loop after every edit (seconds):

```sh
deno task typecheck
deno run -A npm:vitest run <this package directory>
deno task story simulate <appId> --scenario <name>
```

Rules in brief:

- Every new say/choice needs a brand-new `definitionId` (`interaction.<story>.<name>`); never reuse one.
- A `stage` node's `mayShow` honestly lists every contentId it might show; a `branch`'s `choose` must land inside `successors` (tests enforce both).
- New stage content is wired in three places: the contentId constant in narrative, the content catalog in presentation, the renderer in composition.
- Saveable state holds integers only (logical units like `scalePermille`); floats are rejected by canonical JSON.
- Use `show` for content entering an empty stage; `replace` only for content already on stage.

## Module/state tasks

**A new gameplay feature = a new slice directory**: put the feature's whole contribution under `src/features/<name>/` (`module.ts` module owner, `content.ts` content tables, `rules.ts` pure rules, `handlers.ts` command handlers, UI components); aggregation points gain one line each (the handler map in `simulation.ts` and the table list in `content.ts`; a missed command kind fails to compile). Shared shapes (command/fact/verdict types, schema helpers, the kit) live in `src/kernel.ts`; this package's `features/inventory/` is the minimal sample, and `examples/cat-cafe/src/features/` shows the scaled-up form.

Four wiring points: `state.ts` (interface + schema + initial value) → `features/<name>/module.ts` (module owner) and `features/<name>/handlers.ts` (commands) → `application/semantic.ts` (action catalog + blockedBy) → `story.ts` (manifest entry; module ids in lexicographic order). The revision-sync table and the diagnostics quick-reference are in `docs/engine/authoring-quickstart.md`; do not bump revisions from memory.

## Forbidden

- Import only `@sillymaker/*` package exports; never import engine `src/**` paths, never import another Story.
- For engine-behavior questions read `docs/engine/features.md`; do not guess from engine source.
- Do not loosen assertion semantics to make tests pass; when occurrence assertions mismatch, renumber per the failure message.
