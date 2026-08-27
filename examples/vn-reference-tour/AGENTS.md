# VN Reference Tour agent handbook

## Status and authority

This package is **M0 delivered / WIP**. The product contract, independent
package, supported-export application shell, and starter-domain deletion are
complete. Temporary Story/Scene/media content remains only to prove wiring; it
is not the product story, a playable slice, or evidence that any M1–M5
denominator has shipped.

Read, in order:

1. `DESIGN.md` — product denominator, authorities, budgets, and exclusions.
2. `../../docs/engine/plans/2026-08-27-vn-reference-tour.md` — milestone order.
3. `../AGENTS.md` — repository example-product contract.

Do not reduce the denominator to close a milestone. Do not infer completion
from a runnable starter, one route, one ending, or green scaffold checks.

## Frozen product denominator

- Original product: 《最后一次试音》 / _One Last Sound Check_.
- 59 unique visible text entries; either route exposes 44.
- Two named characters plus narrator; two appearances per character.
- Two Authoring Scenes: control room and rooftop antenna.
- One material choice, two routes with route-specific content/audio, two endings.
- Selected presentation/audio/i18n/Player/Save/authoring coverage is exactly
  the set in `DESIGN.md`; `NarrativeAside` is optional at most once when the
  finished story naturally benefits from it.

Stable identities:

- application: `example-vn-reference-tour`
- package: `@sillymaker/story-example-vn-reference-tour`
- Story: `story.example.vn-reference-tour`
- prefix: `vn-reference-tour`
- scenes: `scene.vn-reference-tour.control-room` and
  `scene.vn-reference-tour.rooftop-antenna`

Story/Scene/text/asset/action IDs are lower-case kebab-case. TypeScript symbols
use `vnReferenceTour` / `VnReferenceTour`. M0 already removed the starter Story
identity, coins/inventory, and starter HUD/action owners. M1 replaces the
temporary opening Story/Scene/media content with the complete two-route author
data; do not preserve aliases, disabled modules, or a second graph.

## Ownership and locality

- `src/story/narrative.ts`: only narrative control and stable text references.
- `assets/content/*.text-pack.json`: all narrative copy and both locales.
- `src/scenes/control-room/**` and `src/scenes/rooftop-antenna/**`: sole scene
  hierarchy, placement, default appearance, cue, and Motion-reference owners.
- `src/content/text-content.ts`: locale/pack topology.
- `src/content/presentation.ts`: resident UI copy and Stage/transition catalog.
- `src/content/audio.ts`: audio manifest and intent/effect mapping.
- `src/game/**`: minimal authoritative route/narrative/stage/audio state.
- `src/application/ui.tsx`: product pixels and passive Narrative renderer.
- `src/application/composition.tsx`: wiring only; no story copy or rules.
- `src/tooling/**`: dev-only Inspector/Flow/simulation projections.

One value has one owner. Scene placement never reappears in Story or renderer
constants; text never reappears in TSX; transient reveal/transition/hover/audio
objects never enter State/Save. Profile owns locale, playback, and volume
preferences. Inspector is read-only for gameplay and absent from Player graphs.

## Implementation discipline

- Start from supported Template exports and delete unselected starter domains.
- Import no other example and no engine `src/**` path.
- Keep the product a coherent VN, not an API gallery or interactive docs page.
- Use ordinary TypeScript data and the product-local copied kit; do not create a
  Ren'Py DSL, parser, interpreter, public VN framework, or compatibility layer.
- Do not add custom pending, monitor, hit region, shared/mid-hold input,
  Timeline, Mod/Agent, DevDock, Runtime Inspector, or Desktop HMR merely because
  the engine contains them.
- Story references stable Scene/cue IDs. Authoring Scene/Motion data remains the
  human and Agent tuning surface; application code does not mirror it.
- All assets and text are original or compatibly licensed. Reference research
  never authorizes copied expression, branding, recordings, or fixtures.
- Keep status language honest after every slice. M1 author data is not Player
  completion; M2 presentation is not Save completion; M3 is not product review.

## Required scenarios and evidence

Named simulations are `archive-voice` and `present-voice`. Both must traverse a
complete route and distinct ending. Tests additionally cover currentness,
rollback to the choice, mid-line/mid-choice/mid-hold recovery, current-voice
replay, zh/en packs, and deterministic headless convergence.

Product closure requires the viewport/Input/accessibility matrix and numeric
budgets in `DESIGN.md`, Chromium/WebKit journeys, Browser build/publish, current
Desktop static preview, human and Agent author tasks through the same CAS path,
and separate product/engine reviews. Do not replace behavior tests with exact
DOM/source inventories or one-off evidence machinery.

## Verification

From this package while it remains M0:

```sh
deno task format:check
deno task app check .
deno task test
deno task build:web
```

Green M0 scaffold checks prove only the current scaffold/config. Run the two
named simulations only after M1 implements them. If a public/wire/Save/CAS or
license boundary must change, stop and request owner review; otherwise choose
the smallest product-local, verifiable implementation.
