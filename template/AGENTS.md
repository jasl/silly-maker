# template/ agent handbook

This package is the **scene-first starter for a new game** (MIT). The primary authoring loop is: play it (`deno task dev` or `deno task author template`), enable developer tools, open **调试 → 场景 → Studio**, and edit the opening scene visually — placements, scale, and the cue→motion binding live in `src/scenes/opening/opening.scene.json`, and saving writes only that document (plus edited `*.motion.json`) back over the dev-only CAS port. The TypeScript layers below stay the advanced path.

To start a new story: copy this directory to `examples/<new-name>` (or anywhere outside the repository) → global rename (`template`/`Template` → the new name) → update `sillymaker.config.ts` (applicationId/label) and `metadata.json` (page title / share card) → replace the script and modules as needed. Inside this repository, also add the directory to the root `project.config.ts` list; outside it, point the `package.json` dependencies at the engine packages by relative `file:` path and set `"nodeModulesDir": "manual"` in the project's `deno.json`. Format with `deno fmt` (the workspace `deno task format`); do not add Prettier. The copy is a complete project: `deno task dev`, `deno task build:web` / `build:desktop` / `deploy:cf` / `preview` / `clean`, and `deno task story check .` run from the directory itself (`deploy:cf` publishes `dist-web/` as a standalone Cloudflare Worker — rename `name` in `wrangler.jsonc` with the rest of the project).

Change discipline: keep it minimally playable. The placeholder script may be replaced wholesale; do not grow new gameplay structure on the skeleton (that belongs in examples or real games). `application/**` is the Advanced layer — ordinary scene authoring does not edit these files.

## Browser pitfalls: engine-covered vs. game-side

Already covered by the engine (do not re-handle in a Story): text selection / image dragging / iOS long-press callout / double-tap zoom delay / scroll chaining and pull-to-refresh (stage CSS), right-click semantics (controls have no default action, scene background = close the topmost surface, controls may opt in via `data-secondary-action`), audio autoplay unlock and pause-on-hidden, reduced-motion degradation, stacking scales, window chrome and focus.

The game side must handle these itself (the engine cannot):

- **Keep the simulation layer DOM-clean**: `simulation.ts`/`state.ts`/content tables must not reference `window`/`document`/`matchMedia` (headless runs and replay break); browser APIs appear only under `application/` (`composition.tsx` / `ui.tsx`).
- **Application-layer file roles**: `composition.tsx` = projector, slots, labels, the `*GameApplicationV1` declaration, and its `application.ui().narrative` definition; PascalCase React components, including the passive Narrative renderer, live in `ui.tsx` (Vite Fast Refresh requires components not to share a file with non-component exports); `core-application.ts` = the headless instance factory; `entry.tsx` boots from `composition.tsx`.
- **No `Math.random()` or `Date.now()` on deterministic paths**: randomness goes through the transaction RNG, time through the engine clock.
- **Bilingual text overflow**: eyeball long strings in both languages (English often runs 30%+ longer than Chinese); lay out HUD/buttons flexibly.
- **Touch targets ≥ 32px**: compact buttons are already at the floor; do not shrink further.
- **Use engine hooks instead of hand-rolling**: asset URLs via `useAssetUrlV1`/`resolveAssetUrlV1`, motion gating via `useReducedMotionV1`, gameplay windows via `defineWorkspaceOverlayV1` + `slots.overlayResolver` + the normal presentation-intent path (with `context.overlays` only for structural detail/back/close) — the Host supplies `PanelV1`; hand-rolled copies miss the pitfalls the engine already fixed.

## Engine baseline (free; do not rewrite)

Declaring `titleScreen` (title / background art / optional `splash` intro lines) yields the full front door: splash → title screen (New game / Continue / Load game / Settings). Splash and Title are package-owned WholeCanvas renderers, but their authoring shape remains this existing `titleScreen` declaration; do not duplicate them in `application.ui().wholeCanvas`. The system menu is single-modal (save and settings are mutually exclusive; Esc / right-click / backdrop click closes the topmost surface; a window may declare `dismissible: false` to lock, in which case only its explicit close control works). The save dialog ships with slot lists, timestamps, import/export, and load-enters-gameplay. Settings ships with three volume sliders (BGM/voice/SFX), mute, text speed, auto-play dwell, fullscreen, and the developer-tools switch — preferences persist in the Host profile across saves. A Story may use `playerProfile.current().preferences.skipCutscenes` to settle skippable presentation waits and opt into the default checkbox by providing `settingsSkipCutscenesLabel`; it must never bypass authoritative scheduler time or semantic commands.

## Optional wiring (one entry point each; see cat-cafe for examples)

- **Web metadata**: `metadata.json` (title/description/share card/favicon), injected into `<head>` at build time.
- **Audio**: declare audio assets with `resolveAudioManifestV1` (digest required) → project `AudioIntentV1` from the view (bgm/ambient/voice, restored on load) → mount `GameAudioV1` in the UI (map one-shot SFX from transient effects via `resolveEffectAsset`).
- **Narrative surface**: declare the Story's one production writer as `narrative: defineNarrativeSurfaceV1(...)` inside `application.ui()`. Supply exactly the semantic selector, resolution dispatcher, passive `NarrativeSurfaceRendererPropsV1` renderer, locale-aware text resolver, and optional current-voice replay callback. The composition owns lifecycle, playback (typewriter/auto/skip-read), History, Player Profile, clock, input, and Stage integration; do not mount a second player or mirror that state. Test selectors may remain Story-owned `data-dialogue-*` attributes on the renderer.
- **WholeCanvas surface**: declare the Story's one optional definition as `wholeCanvas: defineWholeCanvasSurfaceV1(...)` inside `application.ui()`. Use a publication selector when semantic state owns the primary (Cat Cafe's ending), or the narrow `createWholeCanvasApplicationSourceV1` for presentation-only replacement/detail navigation (Engine Lab's exact-query rig). Supply the catalog, target resolver, owner-action dispatcher, passive renderer, optional preparation, and text resolver; the renderer consumes immutable primary/detail frames and calls only frame-bound `onAction` / `onBack`. The package owns readiness, exact-parent detail, input, focus, Stage placement, and Splash/Title. Do not add a Root slot, local visibility boolean, or second Host; omit `wholeCanvas` entirely when unused.
- **Player rollback**: add `rollback: { capacity, classify }` to the core definition (mark settlement/irreversible commands `"barrier"`); the UI uses `instance.rollback` (available/toPrevious/subscribe).
- **Save safepoints**: add `saveGuard(publication)` to the web definition to disable manual saves mid-dialogue or mid-battle with a reason text.
- **Stage hit regions**: declare `hitRegions` in the content catalog and pass `onHitRegionActivate` to `SemanticStageV1`.
- **Motion assets**: narrative entrance/exit animations live in `src/motions/*.motion.json` (`sillymaker.motion` documents), bound through `motionStageTransition` in the transition catalog — never as inline duration/easing literals or CSS transitions in scene code (component-local hover effects stay CSS). `story check` lints every motion file (admission, unique ids, filename = id's final segment).
- **Content tables**: `defineContentTable` + `createContentDatabase` — static definitions go into tables (validated at resolve time), mutable state goes into modules.
- **UI styling**: only the published `--silly-*` tokens (no raw z-index; the stacking scales are in the style quick-reference of `docs/engine/authoring-quickstart.md`); gameplay windows declared with `defineWorkspaceOverlayV1` and resolved through `slots.overlayResolver` get the `PanelV1` chrome automatically; native form controls pick up the theme as-is.
- **Window model**: ordinary primary opens use the presentation-intent path; `context.overlays.openPrimary` is available for structural replacement, `pushDetail` stacks details, and `closeTop`/`closeAll` remove them. The Overlay facade is Coordinator-backed and its snapshot is read-only, so do not mirror it into another writable store or coordinate "open A, close B" yourself. Definitions requiring a port/service name it in `requiredPortIds` and the application supplies the concrete `overlayPorts` binding. An optional resolver `prepare()` may prepare presentation/resources only, never send semantic commands. System dialogs retain their existing single-slot lifecycle; separately, a Workspace Overlay definition may set `dismissible: false`. For dragging / minimize / maximize needs, follow the game-side recipes in `docs/engine/design/window-model.md` first (coordinates through viewport conversion, positions in Story UI state); promote to the engine only once the pattern recurs.

## Script/text tasks (most common)

Which file to edit: scene composition (placements, appearance at entry, cue→motion binding) → `src/scenes/opening/opening.scene.json` (Studio or direct edit); dialogue and UI copy → the textId catalog in `src/presentation.ts`; story nodes/branches/stage directives → `src/narrative.ts`; stage renderers → `templateStageRenderersV1` in `src/stage-renderers.tsx`; HUD and the passive Narrative renderer → `src/application/ui.tsx`; the public Narrative definition → the `application.ui().narrative` field in `src/application/composition.tsx`.

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
- New stage content is wired in three places: the contentId constant in narrative, the content catalog in presentation, the renderer in `src/stage-renderers.tsx`. For a scene-managed scene the entry/placement side is its Scene document (see the scene collaboration contract below).
- Saveable state holds integers only (logical units like `scalePermille`); floats are rejected by canonical JSON.
- Scene cues use ensure semantics (`show` places or content-swaps idempotently; `hide` removes what is present); low-level `show`/`replace` mutations remain for non-scene-managed stages.

## Module/state tasks

**A new gameplay feature = a new slice directory**: put the feature's whole contribution under `src/features/<name>/` (`module.ts` module owner, `content.ts` content tables, `rules.ts` pure rules, `handlers.ts` command handlers, UI components); aggregation points gain one line each (the handler map in `simulation.ts` and the table list in `content.ts`; a missed command kind fails to compile). Shared shapes (command/fact/verdict types, schema helpers, the kit) live in `src/kernel.ts`; this package's `features/inventory/` is the minimal sample, and `examples/cat-cafe/src/features/` shows the scaled-up form.

Four wiring points: `state.ts` (interface + schema + initial value) → `features/<name>/module.ts` (module owner) and `features/<name>/handlers.ts` (commands) → `application/semantic.ts` (action catalog + blockedBy) → `simulation-definition.ts` (manifest entry; module ids in lexicographic order). Keep the package identity revision in `story.ts` synchronized. The revision-sync table and the diagnostics quick-reference are in `docs/engine/authoring-quickstart.md`; do not bump revisions from memory.

## Motion collaboration contract

Motion assets are the human tuning surface (the Motion Workbench edits and saves them):

- Do not overwrite a motion file whose `authoring.status` is `"human_tuned"` or whose `authoring.locked` is `true` unless the task explicitly names that asset; to change a locked asset's feel, create a new variant file with a new motion id and rebind the transition.
- Preserve stable motion ids and transition ids when regenerating or restructuring scenes; a scene refactor may rebind which motion an edge uses, but must not regenerate existing motion files.
- New animation that a human may want to tune goes into a new `*.motion.json` (status `"generated"`), not inline constants.

## Scene collaboration contract

The opening is scene-managed: `src/scenes/opening/opening.scene.json` is the single authoring authority for that scene's visual composition — entry placements/appearance/zOrder and cue→motion binding. Stage nodes reference cues (`cueMutations`/`cueMayShow`); do not re-add placement literals, `hasTag` guards, or global enter-edge motion inference for a scene-managed scene, and do not edit the same scene through both the document and low-level mutations (mid-scene `setAppearance` beats stay script-owned — V1 cues cover show/hide composition). Keep sceneId/cueId stable across refactors (transition ids derive from cue ids); the filename stem must stay the sceneId's final segment (`story check` lints scene documents: admission, unique ids, filename↔id, cue motion references, and cross-document edge collisions — two scenes must not bind different motions to one stage edge). The dev-only Studio binding (`src/tooling/studio-binding.tsx`, declared as `studio` in `sillymaker.config.ts`) shares the content catalog and `src/stage-renderers.tsx` with the composition; it never enters the player bundle.

## Forbidden

- Import only `@sillymaker/*` package exports; never import engine `src/**` paths, never import another Story.
- For engine-behavior questions read `docs/engine/features.md`; do not guess from engine source.
- Do not loosen assertion semantics to make tests pass; when occurrence assertions mismatch, renumber per the failure message.
