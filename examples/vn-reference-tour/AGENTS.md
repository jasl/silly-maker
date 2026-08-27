# VN Reference Tour agent handbook

## Status and authority

This package is **M0–M3 delivered / WIP; M4 is next**. The product contract,
independent package, supported-export application shell, starter-domain
deletion, complete two-route script, two Authoring Scenes, author data, and
named headless simulations are implemented. M2 selects
the engine-maintained focused default VN Player, which adds flush-bottom responsive dialogue/choice chrome, say-only full-canvas
pointer advance, History/playback controls, Ctrl/Tab/H/V and middle-button VN input, and a portrait layout variant.
Later slices added the final Stage media and ending surface plus BGM, two ambient
tracks, three SFX, two current voices, replay, and voice-aware Auto. A later
slice added interaction-level Back/Forward through the engine Snapshot timeline,
PageUp/PageDown and wheel input, plus ending Back. The responsive/input/accessibility/i18n product matrix
closed M2. M3 adds boot-time autosave resume, return-to-title/Continue, the
engine-maintained system menu and Save surfaces, persistent Player settings
with live locale, and layered exact-close/already-durable Browser recovery
evidence. Browser `pagehide` does not guarantee a last-moment asynchronous
IndexedDB flush. M4 product evidence remains open, so this playable WIP is not
a complete reference or evidence that M4–M5 have shipped.

Read, in order:

1. `DESIGN.md` — product denominator, authorities, budgets, and exclusions.
2. `../../docs/engine/plans/2026-08-27-vn-reference-tour.md` — milestone order.
3. `../AGENTS.md` — repository example-product contract.

Do not reduce the denominator to close a milestone. Do not infer completion
from complete headless routes, one rendered slice, or green author-data checks.

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
use `vnReferenceTour` / `VnReferenceTour`. M0 removed the starter Story identity,
coins/inventory, and starter HUD/action owners. M1 replaced the temporary
opening Story/Scene author content with the complete two-route author data; do
not restore aliases, disabled modules, or a second graph. M3 now owns the
remaining product entry, Save/recovery, and settings work.

## Ownership and locality

- `src/story/narrative.ts`: only narrative control and stable text references.
- `assets/content/*.text-pack.json`: all narrative copy and both locales.
- `src/scenes/control-room/**` and `src/scenes/rooftop-antenna/**`: sole scene
  hierarchy, placement, default appearance, cue, and Motion-reference owners.
- `src/content/text-content.ts`: locale/pack topology.
- `src/content/presentation.ts`: resident UI copy and Stage/transition catalog.
- `src/content/audio.ts`: audio manifest and intent/effect mapping.
- `src/game/**`: minimal authoritative route/narrative/stage/audio state.
- `@sillymaker/ui/narrative-player`: default VN chrome, focus, Ctrl/Tab/H, middle-button, and Back/Forward policy.
- `src/application/composition.tsx`: product wiring, text-label mapping, and preset selection only; no story copy or rules.
- `src/tooling/**`: dev-only Inspector/Flow/simulation projections.

One value has one owner. Scene placement never reappears in Story or renderer
constants; text never reappears in TSX; transient reveal/transition/hover/audio
objects never enter State/Save. Profile owns locale, playback, and volume
preferences. Inspector is read-only for gameplay and absent from Player graphs.

## Implementation discipline

- Start from supported Template exports and delete unselected starter domains.
- Import no other example and no engine `src/**` path.
- Keep the product a coherent VN, not an API gallery or interactive docs page.
- Use ordinary TypeScript data and the product-local copied story kit; use the
  focused default VN Player rather than creating a second skin/runtime. Do not create a
  Ren'Py DSL, parser, interpreter, broad VN framework, or compatibility layer.
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

From this package after M1:

```sh
deno task format:check
deno task app check .
deno task test
deno task app simulate . --scenario archive-voice
deno task app simulate . --scenario present-voice
deno task build:web
```

Green focused checks prove the implemented author data and current Player,
Stage-media, audio, and product-matrix slices only. They do not prove M3 Save/recovery
or M4 product evidence. Record actual gate results rather than
inferring them from milestone status. If a public/wire/Save/CAS or license
boundary must change, stop and request owner review; otherwise choose the
smallest product-local, verifiable implementation.
