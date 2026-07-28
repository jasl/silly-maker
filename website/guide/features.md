# What the engine provides

A tour of the capabilities a Story gets by declaring, not building. Everything here is exercised by the shipped examples and guarded by the engine's own test suites.

## The deterministic core

- **One authoritative session** owns gameplay state; UI and automation send semantic intents, never mutations. Commands commit atomically or leave state untouched.
- **RNG travels inside snapshots** — replaying a save or rolling back and retrying reproduces the identical outcome. No save-scumming, no reroll exploits.
- **Authoritative replay**: the command log can rebuild any session bit-for-bit; the engine verifies digests match. Headless runs and browser runs produce identical states from identical inputs.
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

Declaring a title screen gives a complete front door: boot splash (e.g. an AI-generation notice), New game / Continue / Load game / Settings, and a single-modal system menu (Save and Settings never stack; Escape closes). The save dialog lists slots with timestamps, import/export, and Story-declared safepoints; a successful load enters gameplay directly. Settings ship with three volume sliders, mute, text speed, auto-forward wait, fullscreen, and a developer-tools switch. Dialogue playback includes a typewriter, auto mode, skip-read, and a history panel backed by the saveable narrative backlog. Gameplay windows (album, shop, inventory…) mount into the overlay session and inherit the shared `PanelV1` window chrome.

## Persistence

Saves are plain, versioned, validated data — quick/manual slots plus current/previous autosaves, atomic writes, optimistic revisions. The Host profile keeps preferences and **meta progress** (album unlocks, endings reached) outside saves, so cross-playthrough collections survive restarts and rollbacks. Browser builds persist to IndexedDB; the desktop channel uses file-backed saves.

## Tooling for humans and agents

- `story check` / `story simulate` emit structured JSON: an agent (or CI) can validate a story graph and play every route headlessly. `--trace` prints per-step numeric trajectories; `story diff` compares two saves or reports structurally.
- The **DevDock** (capability-gated, never part of the player UI) hosts live state inspectors, the narrative graph view, and Story tuning panels driven by validated debug commands that go through the same transactional commit path as gameplay.
- One-step delivery: `story build` for the web, `site:build` for static hosting (GitHub Pages / Cloudflare Workers), `story desktop` for a native desktop app with icon and file-backed saves.
