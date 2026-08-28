# VN Reference Tour agent handbook

## Status and authority

This package is **M0–M3 delivered / WIP; M4 is in progress**. The product contract,
independent package, supported-export application shell, starter-domain
deletion, complete two-route script, two Authoring Scenes, author data, and
named headless simulations are implemented. M2 selects
the engine-maintained focused default VN Player, which adds flush-bottom responsive dialogue/choice chrome, say-only full-canvas
pointer advance, History/playback controls, Ctrl/Tab/H/V and middle-button VN input, and a portrait layout variant.
Later slices added the final Stage media and ending surface plus BGM, two ambient
tracks, three SFX, two current voices, replay, and voice-aware Auto. A later
slice added interaction-level Back/Forward through the engine Snapshot timeline,
PageUp/PageDown and wheel input, plus ending Back. The responsive/input/accessibility/i18n product matrix
closed M2. M3 added boot-time autosave resume, return-to-title/Continue, the
engine-maintained system menu and Save surfaces, persistent Player settings
with live locale, and layered exact-close/already-durable Browser recovery
evidence. Browser `pagehide` does not guarantee a last-moment asynchronous
IndexedDB flush. M4's package-private ambient-binding operation and Agent
Inspector/CAS handoff are delivered. M4 is also proving the accepted
core/optional-Mod boundary: the traditional VN preset keeps the complete
product experience, while its dedicated History presentation is structurally
absent from the focused core graph. Development keeps only a small shared
launcher resident; the complete Debug menu/window host, selected tool body,
and Embedded Authoring surface are interaction-lazy rather than a synthetic tooling Mod.
The owner-authorized Computer Use-assisted author handoff and independent
product/engine reviews are complete. Representative real current-low-end
qualification is the only remaining gate, so this playable WIP is not a
complete reference or evidence that M4–M5 have shipped.

Read, in order:

1. `DESIGN.md` — product denominator, authorities, budgets, and exclusions.
2. `../../docs/engine/plans/2026-08-27-vn-reference-tour.md` — milestone order.
3. `../AGENTS.md` — repository example-product contract.

Do not reduce the denominator to close a milestone. Do not infer completion
from complete headless routes, one rendered slice, or green author-data checks.

## Frozen product denominator

- Original product: 《最后一次试音》 / _One Last Sound Check_.
- 110 unique visible text entries; either route exposes 82.
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
opening Story/Scene author content with the then-frozen 59-unique / 44-per-route
two-route author data. M4 product review proved that volume contradicted the
already-frozen 10–14 minute contract, so the accepted evidence-driven correction
now owns 110 unique / 82 per route plus bounded engine/tooling corrections;
do not restore aliases, disabled modules, or a second graph. M3 closed product
entry, Save/recovery, and settings. M4 also owns author handoff and final
product evidence.

## Ownership and locality

- `src/story/narrative.ts`: only narrative control and stable text references.
- `assets/content/*.text-pack.json`: all narrative copy and both locales.
- `src/scenes/control-room/**` and `src/scenes/rooftop-antenna/**`: sole scene
  hierarchy, placement, default appearance, cue, and Motion-reference owners.
  Inspector may edit one Visual ambient binding/phase through the existing
  structured-operation/CAS path; Motion documents, cue transitions, and other
  binding references remain focused-tool or code/data work.
- `src/content/text-content.ts`: locale/pack topology.
- `src/content/presentation.ts`: resident UI copy and Stage/transition catalog.
- `src/content/audio.ts`: audio manifest and intent/effect mapping.
- `src/game/**`: minimal authoritative route/narrative/stage/audio state.
- `@sillymaker/ui/narrative-player`: traditional VN preset; its focused core
  entry owns dialogue/choice/advance while optional History presentation is
  selected explicitly. History State remains Story/Save authority in either graph.
- `src/application/composition.tsx`: product wiring, text-label mapping, and preset selection only; no story copy or rules.
- `src/tooling/**`: dev-only Inspector/Flow/simulation projections and the
  lightweight development composition whose complete tooling surfaces are
  interaction-lazy.

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
  Timeline, Agent/RPC, gameplay Mod, production DevDock/Runtime Inspector, or
  product-owned Desktop HMR merely because the engine contains them. Do not invent a
  synthetic tool consumer only to demonstrate lifecycle machinery or fragment
  this compact VN into an artificial public Mod ecosystem.
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
budgets in `DESIGN.md`, Chromium/WebKit journeys, a publishable Browser release build, current
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
