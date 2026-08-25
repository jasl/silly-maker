<!-- SPDX-License-Identifier: MIT -->

# Feature Cards

Status: **complete Reference Product (2026-08-25).** The complete denominator,
target-platform uplift, product budgets, Browser evidence, Desktop packaging
preview, independent product/engine reviews, and Starter feedback all closed in
the owning plan. This is not a representative vertical slice.

Feature Cards is a responsive, accessible GUI application built with SillyMaker's
neutral Application Host, static GUI Composition, and build-known React Code
Surfaces. It deliberately has no GameSession, State, Save, Story, Scene,
Inspector, Agent, Mod, or external service.

## Fidelity baseline

The primary behavioral reference is the complete PocketJS `apps/cards`
application, manifest version `0.6.0`, repository commit
`8a6f4313ac91e22a4dc42f987eb3f164906b7dee` as inspected on 2026-08-25.
PocketJS's Solid, Vue Vapor, and Octane sources are alternative framework
implementations of that one product, not three product modes.

The complete user-observable denominator is:

- one full-screen page with an eyebrow/title, three-module count, exactly three
  ordered Layout/Motion/Input cards, one detail region, and persistent help;
- each card has a distinct accent, title, caption, and complete explanatory
  detail;
- no initial focus or detail; next/previous enters the first/last card from that
  empty state and clamps at both ends;
- activation opens the focused card, closes the same card, or atomically
  replaces a different open detail; focus movement alone leaves detail intact;
- a focused card lifts by removing its resting Y offset and changes its
  background/border without scaling glyphs;
- each detail mount replays a spring-like 22px translation with no opacity or
  color fade;
- two clipped ambient gradient streaks run once—20 seconds forward and 26
  seconds backward—then stop;
- there is no route, network, loading/error state, persistence, audio, video,
  or in-app raster asset.

PocketJS branding, PSP launcher art, source structure, native renderer, and
fixed-device limitations are not part of the implementation contract. This
package uses original SillyMaker copy/CSS and supported public package exports.

## Target-platform uplift

The 480×272 landscape arrangement remains a fidelity anchor, while the same
product supports current Browser phones, tablets, and computers plus the common
runtime of resizable Deno Desktop windows:

- portrait phones reflow to a readable single column; landscape, tablets, and
  desktops retain the three-card composition when space/aspect permits;
- pointer/touch click, Tab, arrow keys, Enter/Space, the original Z/Circle
  keyboard convention, and current gamepad directions/primary action reach the
  same transient UI owner;
- semantic buttons, headings, `aria-expanded`/`aria-controls`, a polite detail
  status, visible focus, high contrast, text wrapping, browser zoom, safe-area
  padding, and high-DPI CSS rendering replace framebuffer-era constraints;
- resize changes CSS presentation only and preserves focus/open detail;
- `prefers-reduced-motion` removes focus/detail translation and ambient work
  while preserving color, border, content, and every interaction.

Deno Desktop adds no product-only feature and does not activate the private HMR
candidate or a production durability claim.

## Semantic coverage

| Area                      | Baseline                                                              | Implementation / evidence                                                       | Intentional difference                                |
| ------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Screen/header             | One page, showcase eyebrow, Feature Cards title, `3 MODULES`          | `cards-screen.tsx`; focused and Browser checks                                  | Original SillyMaker branding                          |
| Card content              | Exactly Layout, Motion, Input with caption/detail/accent              | GUI Composition source + prop admission + role queries                          | Copy describes equivalent SillyMaker/Web capabilities |
| Empty/focus               | Empty initial focus; next→first, previous→last; clamp                 | UI-session tests and keyboard/gamepad Browser paths                             | Native semantic focus rather than PocketJS NodeMirror |
| Activation                | Open/close/replace focused detail                                     | Focused tests plus pointer/touch/keyboard E2E                                   | Enter/Space and direct tap added                      |
| Focus/open split          | Focus movement never changes open detail                              | Dedicated behavior test                                                         | None                                                  |
| Focus presentation        | 150ms lift/background/border, no scale                                | CSS + reduced-motion automation; normal motion manually characterized           | Responsive surface polish and hover affordance added  |
| Detail                    | One panel; title, accent bar, full detail; 22px spring on every mount | Component remount key + behavior tests; normal motion manually characterized    | CSS keyframes approximate a damped spring             |
| Ambient                   | Two clipped one-shot 20s/26s streaks                                  | CSS implementation + manual Browser characterization; reduced-motion automation | Higher-DPI gradients; reduced-motion static path      |
| Help/input                | Persistent previous/next + primary-action hint                        | Footer + keyboard/touch/pointer/gamepad checks                                  | Modality names are expanded for discoverability       |
| Persistence/failure/media | None                                                                  | Final graph and reload initial-state check                                      | None added                                            |
| Responsive/a11y           | Fixed 480×272 button-first source                                     | phone/tablet/desktop/zoom/reduced-motion matrix                                 | Required target uplift                                |

## Code map

```text
src/application/entry.tsx           neutral Browser/Deno common-runtime start
src/application/cards-app.tsx       application declaration and compiled GUI host
src/gui/cards.gui-composition.json  stable product data and slot order
src/gui/catalog.ts                  Code Surface definitions and prop schemas
src/gui/composition.ts              once-admitted direct plan
src/gui/input.ts                    product action IDs
src/gui/views/cards-screen.tsx      screen and transient UI-session owner
src/gui/views/feature-card.tsx      semantic card/detail renderer
src/gui/cards.css                   responsive presentation and one-shot motion
src/test/cards.test.tsx             product behavior contracts
```

## Product budgets and evidence

Budgets are evaluated on representative current-low-end and mainstream Browser
profiles as raw trends, not exact-machine attestation or a cross-project score.
At least three comparable fresh samples are recorded before closure.

| Axis              | Completion budget / evidence                                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Startup           | Existing `bench:gui:startup --application example-cards`; first enabled card is the first-actionable target; no Cards-specific runner                                         |
| Bundle            | Record raw/gzip JS and CSS plus dynamic chunks; no images/fonts; Story/Game/Save/Agent/Inspector/Mod/reference UI/addressable owners absent from the final graph              |
| Interaction       | Previous/next/click/tap/activation commits without a Long Task; record warm p50/p95 raw samples                                                                               |
| Frame/main thread | Ambient, focus, and detail motion retain 60Hz headroom on the declared low-end profile; record Long Tasks; reduced motion has no sustained animation                          |
| Memory            | Ready heap and repeated focus/toggle/replacement trend do not monotonically retain components, listeners, or animations                                                       |
| Storage           | Zero application Save/data by contract; do not add persistence for a measurement row                                                                                          |
| Responsive/a11y   | 480×272 anchor, phone portrait/landscape, tablet, desktop, narrow Desktop window, 200% zoom, keyboard-only, touch, pointer, and reduced motion remain reachable and unclipped |

Raw local reports stay outside the repository. Closure records the evaluated
summary, final dependency receipt, release build, and independent reviewer result.

### Closure evidence (2026-08-25)

- Three fresh Chromium release-start samples reported GUI ready at
  `53.102 / 53.818 / 52.173 ms` and first interactive at
  `843.371 / 819.392 / 814.821 ms`. These are raw local measurements, not a
  machine-independent budget or promotion threshold.
- The final release receipt records 7 JavaScript files at `315,238 raw /
  97,955 gzip bytes`, 3 CSS files at `12,448 / 4,025`, and all 11 emitted files
  at `330,059 / 103,044`. It excludes Game Session/runtime, Story, Save,
  Agent/RPC, Composition/Mod, Studio/Inspector, Managed Surface/Narrative,
  persistence orchestration, reference UI, and the Base/UI/Web root barrels.
  Neutral IndexedDB/HTTP record/file Host adapters remain available but Cards
  performs zero record reads, lists, commits, or application Save writes.
- One local interaction profile recorded focus commits at `0.20 ms` p50 /
  `0.40 ms` p95 (41 samples) and detail toggles at `0.10 / 0.20 ms`
  (40 samples), with zero Long Tasks. A 120-frame raw trace reported `8.3 ms`
  p50 / `9.3 ms` p95 intervals in the headless Chromium environment; it is
  trend evidence, not a universal frame claim.
- After an explicit local GC, 200 repeated toggles increased used JS heap by
  about `169 KiB`; the next 200 added about `20 KiB`, while embedder heap stayed
  flat. Together with ordinary unmount tests this found no monotonic retained
  component/listener/animation trend; it does not define a cross-machine heap
  threshold.
- Focused product tests pass 3/3. Contract-level Cards E2E passes 9 cases across
  Chromium, WebKit, and mobile portrait with 2 expected project skips. Automated
  coverage owns focus/open behavior, pointer/touch/keyboard/gamepad-primary,
  responsive state continuity, 200%-zoom pressure, reduced motion, and the
  single `main`; manual characterization additionally covered 480×272,
  Tab/Space, gamepad-left, and the exact normal-motion timings without building
  a CSS/DOM inventory.
- Release build, file-level prebuilt smoke, public site composition, stylelint,
  TypeScript, React Doctor (no findings), and a host-platform Deno Desktop
  `.app` preview build pass. Desktop HMR, durability, signing, and production
  promotion remain outside this product claim.
- The repository-wide `deno task check` passes: formatting over 1,392 files,
  type-aware lint/stylelint/typecheck/determinism, 379 unit files / 5,392 tests,
  the 6-case Composition/State trend suite, runtime assets, all five
  Story-authority checks, and the Engine Lab release build.
- Independent product review found no blocker and confirmed the entire
  PocketJS 0.6.0 single-screen product, not one journey. Independent engine
  review's four blockers were fixed before closure: curated focused exports,
  once-only config admission, neutral Host landmarks, and first-presentation
  failure/retry evidence.

## Licensing

This package's code and text are MIT licensed. Its visual expression is original
project-owned CSS/vector work and uses system fonts. PocketJS is an MIT-licensed
behavioral reference (copyright 2026 Yifeng “Evan” Wang); no PocketJS source,
golden image, PSP launcher art, font, or other asset is shipped or imported.

## Local workflow

```sh
deno task dev
deno task test
deno task build:web
deno task build:desktop
deno task deploy:cf
```

The generic app-local `app build .`/`app desktop .` lifecycle remains available.
Story-only `inspect`, `check`, and `simulate` correctly report that this GUI-only
application declares no Story authority.
