# What the engine provides

A tour of the capabilities a Story gets by declaring, not building. Everything here is exercised by the shipped examples and guarded by the engine's own test suites.

## The deterministic core

- **One authoritative session** owns gameplay state; UI and automation send semantic intents, never mutations. Commands commit atomically or leave state untouched.
- **RNG travels inside snapshots** — replaying a save or rolling back and retrying reproduces the identical outcome. No save-scumming, no reroll exploits.
- **Authoritative replay**: for the supported, validated simulation path, the command log rebuilds state and the engine verifies digests and recorded evidence. The maintained Engine Lab transcript produces identical authoritative state in headless and browser runs; arbitrary Story globals and Presentation/Host timing are outside that guarantee.
- **Player rollback**: an opt-in bounded checkpoint ring with Story-classified hard barriers (a contest entry, a confirmed ending) that history cannot cross.

## Authoring surfaces

- **Narrative scripts** are plain TypeScript data: say / choice / stage / branch / end nodes with flags, validated at parse time, lintable as a graph (unreachable nodes, missing text, illegal branch targets).
- **Content database**: static definitions (items, activities, events, reactions) live in typed tables with Prisma-style queries, validated at parse time — tuning is editing a row. Mutable state stays in versioned, schema-validated modules.
- **Event pools** draw weighted, condition-gated events through transactional RNG with JSON-safe explanations of every draw.
- **Text catalogs** put every display string behind a textId with per-locale catalogs and parity checks — i18n is built in, and the player's language preference persists.

## The stage and presentation

- **Semantic stage**: Stories publish plain-data targets (content IDs, placements, appearances, hit regions); swappable React renderers draw them. Saves never contain renderer state.
- **Hit regions** scale and move with the content they belong to; pointer, touch, and keyboard all reach the same semantic action.
- **Transitions and timelines**: validated plain-data definitions (crossfade/slide/cut; tween/repeat/event steps) executed on a host-neutral presentation clock with reduced-motion fallbacks and skip semantics.
- **Audio**: a saveable continuous intent (BGM / ambient / voice, restored exactly on load) plus commit-only one-shot effects with epoch fencing; per-bus player volumes (music / voice / effects) persist across sessions.
- **Stacking is a published contract**: stage layers and within-layer surfaces take z-order from a token scale guarded by tests — raw z-index numbers are forbidden.

## The player-facing baseline

Declaring a title screen gives a complete front door: boot splash (e.g. an AI-generation notice), New game / Continue / Load game / Settings, and a single-modal system menu (Save and Settings never stack; Escape closes). The standard Saves surface lists slots with timestamps, import/export, and Story-declared safepoints; a Story may replace its body with a custom React component without replacing the System modal, input, focus, or lifecycle authority. A successful load enters gameplay through an installed presentation successor, so the retired dialog cannot later close a freshly opened one. Settings ship with three volume sliders, mute, text speed, auto-forward wait, fullscreen, and a developer-tools switch. Stories that consume the player profile's `skipCutscenes` preference can opt into a cutscene-skip checkbox; it may settle skippable presentation delays but never skip gameplay time or semantic commands. A Story opts into the production Narrative surface with one opaque `NarrativeSurfaceDefinitionV1`, created by `defineNarrativeSurfaceV1` and returned as `application.ui().narrative`. Its five declarations select Narrative data, dispatch semantic resolutions, render passive React UI, resolve localized text, and optionally replay the current voice. The UI composition is the single writer for lifecycle, typewriter/auto/skip-read playback, History, Player Profile, clock, input, focus, and Stage integration. Engine Lab, the starter Template, Bookshop, and Cat Cafe use this path; SillyOS intentionally omits it. Gameplay windows (album, shop, inventory…) are declared as Workspace Overlays and inherit the shared `PanelV1` window chrome. System dialogs, Workspace Overlays, and Narrative share the UI-owned Managed Surface composition: renderer or required-port admission failures leave the current surface, input, and focus unchanged, while delayed replacement keeps the current subtree until the candidate is ready.

## Persistence

Saves are plain, versioned, validated data — a quick slot plus numbered manual slots (count declared per game, default 8, with zero allowed) plus current/previous autosaves. Records may carry a bounded Story summary and player note for custom slot UI; the standard save dialog does not render those annotations yet. The Host profile keeps preferences and **meta progress** (album unlocks, endings reached) outside saves, so cross-playthrough collections survive restarts and rollbacks. Browser builds use the production IndexedDB store with atomic batches and optimistic revisions. The current desktop file channel is a usable preview: it validates the local protocol and atomically replaces each record, but crash-atomic multi-record commits and cross-process CAS are still on the production-floor plan.

## Tooling for humans and agents

- `story check` / `story simulate` emit structured JSON: an agent (or CI) can validate a story graph and play every route headlessly. `--trace` prints per-step numeric trajectories; `story diff` compares two saves or reports structurally.
- The **DevDock** is the sole capability-gated debug UI host (never part of the player UI). It combines live inspectors, the narrative graph, Story tuning panels, and a cheat-gated Session maintenance panel for export/import, confirmed Save-slot cleanup with partial-failure reporting, and reinitialization.
- Delivery: `deno task build:web` produces deployable static `dist-web/` output,
  while `site:build` composes the docs site. Applications that declare
  `build:desktop` can produce host or cross-target Desktop previews
  (`.app`, Windows `.msi` installer, `.AppImage`); the shell adopts the startup
  window, fences private local routes with an exact launch origin plus
  per-launch page capability, and cancels incomplete non-authoritative
  downloads before draining its local HTTP server on native close.
  Signing/notarization and durable-store promotion remain explicit release gates. Distributors must
  expose the SillyMaker MIT text and applicable bundled-material notices
  through a product page, accompanying files, or a stable link; a technical
  Artifact manifest is optional and is not a legal inventory. The Engine Lab,
  starter, and first-party examples include stable `rel="license"` links to the
  MIT text and a [maintained minimum of concrete runtime notices](/reference/licenses)
  in their baseline HTML. Distributors still inspect their actual bundle and
  add notices for other included material.
