# Architecture

SillyMaker is a browser-first, headless-capable engine for story games. Four MIT packages own the generic machinery; your game is a Story package that declares data and rules.

## The packages

```text
@sillymaker/base      contracts, Story authoring, deterministic runtime,
                      sessions, persistence, replay, diagnostics
                      (no React, no DOM, no browser storage)
@sillymaker/ui        the React game shell: stage, HUD, overlays, panels,
                      audio presenter, playback, DevDock
@sillymaker/web       browser hosting: IndexedDB/HTTP persistence, mounting,
                      capabilities, automation, pointer input
@sillymaker/tooling   project config and the story CLI

e2e/  template/  examples/    Story packages (your game is one of these)
```

Stories import only published package exports — never engine internals, never another Story. A boundary test enforces it.

## The authoritative flow

```text
Story definition
  → resolved GameSimulation
  → GameSession / GameSnapshot        (the single authority)
  → GameQueries → SemanticPublication (immutable projections)
  → RuntimePresentationPublication
  → React renderers                   (swappable, stateless)
```

One session owns gameplay state and serializes every operation. The UI renders immutable projections and sends semantic intents back; input devices (pointer, touch, keyboard, gamepad, automation) map to the same semantic actions. Saves store plain, versioned data — never DOM, renderer state, or animation progress.

## Design principles

- **Single authority, atomic commits.** A command either commits a complete valid result or leaves state untouched. Renderers, audio elements, and React state are never a second source of truth.
- **Determinism where it matters.** RNG rides inside snapshots; replay and rollback reproduce identical runs; headless and browser execution share one semantic contract.
- **Static data vs. dynamic state.** Content tables (validated at parse time, queried read-only) hold definitions; versioned module schemas hold mutable state.
- **Published contracts over conventions.** Stage layer order, stacking scales, state schemas, save formats, text catalogs — each is a validated, tested contract, so whole classes of bugs die in CI instead of in play sessions.
- **Presentation degrades, gameplay never blocks.** Missing images fall back to code-native renderers, missing audio to silence, reduced motion to instant settles.

## Why TypeScript + JSX instead of a DSL

Engines in this genre historically grow a custom script language (Ren'Py's Screen Language, RPG Maker's event commands). SillyMaker deliberately doesn't: scripts, rules, and UI are plain TypeScript and JSX. Type checking validates what a DSL parser would; the full language is available when a game needs real logic; and — decisive for this engine — **LLMs are more fluent in TypeScript/React than in any bespoke game DSL**, which is what makes the [AI-first workflow](/guide/getting-started) reliable. Unity's own trajectory (UXML/USS, an HTML/CSS dialect) suggests game UI converges here anyway; we simply start on the real thing.

The deeper engineering docs live in the repository under `docs/engine/` — [architecture](https://github.com/jasl/silly-maker/blob/main/docs/engine/architecture.md), [features](https://github.com/jasl/silly-maker/blob/main/docs/engine/features.md), and the [roadmap](https://github.com/jasl/silly-maker/blob/main/docs/engine/roadmap.md).
