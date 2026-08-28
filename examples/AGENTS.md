# examples/ agent handbook

This directory collects independent application packages. A completed example
must be cohesive and publishable; an active WIP must label its incomplete
denominator explicitly:

| Package              | Showcases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | License           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `bookshop/`          | Maintained minimal script-authoring example. The completed VN Reference Tour does not delete it; an owner review must separately decide whether this narrower teaching role remains useful.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | MIT               |
| `silly-os/`          | GUI-only Creator Preview: Creator Home opens a Program Workspace where the one built-in Agent Creator produces a deterministic local proposal, preview, and review flow. The current slice does not connect real Pi, a database, RPC, Mod activation, or persistence; design contract in `silly-os/DESIGN.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Code and text MIT |
| `vn-reference-tour/` | Maintained flagship Reference Product. Its independent package, 110-unique / 82-per-route story, two Authoring Scenes, engine-maintained default VN Player, final media/audio, Back/Forward, responsive/accessibility matrix, system menu and Save surfaces, persistent settings/live locale, layered recovery, Agent/participant authoring handoff, and independent product/engine reviews are complete. Browser forced close restores the last durable autosave rather than promising a last-moment async flush. On 2026-08-29 the owner removed representative real current-low-end qualification from this product's completion gates because no suitable device was available; it was not run or passed, and the product makes no corresponding low-end claim. M4 closed on that reduced evidence scope and M5 completed the flagship cutover. | MIT               |

SillyOS is a GUI-only Creator product slice. Preserve its current public
journey—Creator Home → Program Workspace—and label the deterministic local
preview honestly. Agent Creator is its only built-in user-facing program. Do
not imply that accepting a preview proposal invokes real Pi, stores a Program,
crosses an RPC boundary, activates a Mod, or persists anything.

## Reference application product contract

Examples are product-grade architecture workloads, not API galleries. They may
be original products or high-fidelity reimplementations of an accepted
reference. For a reference-derived example, the declared baseline's entire
user-observable behavior, content breadth and scale, and product depth
are the minimum completion contract. The result may add features, content, and
polish, but additions never compensate for a missing or simplified baseline
area. “More complex” describes the product, not permission to make its code or
engine architecture more complex.

High fidelity preserves that complete semantic/product denominator and the
intended role of each experience; it does not preserve a source device's
hardware ceiling. When a reference was shaped by retro, embedded, or low-power
targets, the example must define and deliver a target-platform uplift for
SillyMaker's Browser device classes—from current low-end through mainstream
phones, tablets, and computers—and the current computer-class Deno Desktop
surface. Reauthor responsive/high-DPI layout, input across relevant touch,
pointer, and keyboard classes, accessibility, compatible visual/audio assets,
content density, and polish where the source hardware constrained them. A
deliberate retro aesthetic may remain as a product choice; accidental hardware
limitations do not.

Available resolution, compute, storage, and memory are budgets, not quotas.
Spend them only for user-visible product value, retain a current-low-end floor
and headroom, and prefer efficient progressive/addressable loading over a large
initial graph or resident working set. An example does not demonstrate the
engine by consuming every available resource.

The reference does not own SillyMaker's source structure, module boundaries,
names, assets, or runtime design. Implement it natively with supported
SillyMaker contracts and understandable code. A target-Host impossibility must
be declared and owner-accepted before implementation; an engine limitation,
performance problem, or implementation cost is an unfinished item or engine-gap
finding, not permission to shrink the baseline. Licensing constraints require
original or compatible expression and assets rather than silent loss of product
coverage.

Before calling a new or rewritten example complete, check every item:

- [ ] The example owns its config, source, assets, tests, README/design notes,
      deployment metadata, license notices, and release build. It imports no
      other example.
- [ ] A reference-derived example declares in its README/design note the
      primary fidelity baseline and version/date (or clean-room specification),
      secondary inspirations, additive extensions, material substitutions, and
      every pre-accepted Host-specific exception. For a named reimplementation,
      the primary baseline is the entire named application/version or a
      clean-room specification covering that whole observable product—not an
      author-selected chapter, map, route, mode, or feature subset. A narrower
      slice may be an intermediate WIP/prototype, but cannot be the fidelity
      baseline or a complete repository example. The denominator cannot be
      reduced during implementation to obtain completion.
- [ ] The same note distinguishes intentional product aesthetics from
      constraints imposed by the source target, declares supported
      device/viewport/Input classes and a current-low-end performance floor,
      and defines the accepted target-platform uplift for layout, accessibility,
      presentation/media quality, content density, and polish. Completion means
      the entire primary baseline plus this uplift, not an unchanged rendering
      of the source device's limits.
- [ ] The same note maintains a small semantic coverage table—`area`,
      `baseline`, `implementation/evidence`, and `intentional difference`—for
      modes/screens; scenes, maps, levels, chapters, and content groups; distinct
      mechanics, interactions, and Input; progression, branches, failure, and
      endings; settings, Save/recovery, accessibility; and material visual,
      animation, timing, and audio behavior. Record reference and implemented
      quantities where they meaningfully define product scale. This is not an
      exact source, file, DOM, or asset inventory.
- [ ] Except for pre-accepted target-Host exceptions, it delivers every baseline
      area, all user-reachable baseline content—including optional and minor
      content—and the complete set of major user journeys. A playable day loop,
      route, ending, demo path, or other representative vertical slice is
      evidence for that slice only; until the full semantic coverage table
      closes, the product remains WIP and cannot be called complete,
      reference-ready, or proof that the engine carries the full product.
- [ ] It consumes supported package exports only and follows the current
      recommended application, State, presentation, input, content, and Host
      paths.
- [ ] Its Browser product is independently buildable and publishable. Desktop
      claims use only capabilities actually supported by the current Deno
      Desktop target; removed target-specific behavior is documented, not
      emulated through speculative engine abstractions. A limitation on one
      target does not remove behavior from another target that can provide it.
- [ ] Authoritative State, transient React/renderer state, static content,
      resource and input ownership, and external-service RPC boundaries are
      explicit. No integration creates a second engine authority.
- [ ] Mature React, Canvas, WebGL, 3D, media, physics, and virtualization
      libraries are preferred to engine-local reinvention. Use an upstream
      dependency directly until a reusable SillyMaker-specific integration
      boundary has been demonstrated.
- [ ] The implementation remains easy to study: the README/design note maps
      each major mode, scene family, and system to discoverable owner modules
      and key implementation entry points; repeated or large content stays
      data/addressable; each distinct mechanic has readable implementation and
      focused behavior tests. Hard-coded demos, stubs, recorded playback, or a
      special happy path cannot stand in for the actual system.
- [ ] Optional Agent, Inspector, reference UI, Mod, and ecosystem integration
      paths are selected explicitly; relevant unselected paths are absent from
      the final module/source graph.
- [ ] Product checks prove declared content registration/reachability and real
      behavior across early, middle, late, and end states, every distinct mode
      and mechanic, major branches, recovery, and accessibility across the
      declared representative viewport and Input classes. Profiling and raw
      measurements are evaluated against this product's own current-low-end
      startup, interaction/frame, memory, storage, and bundle budgets while
      retaining headroom—not an exact-machine attestation or cross-project
      ranking.
- [ ] A completion reviewer other than the implementation author reconciles the
      semantic coverage table with the declared baseline, checks the recorded
      quantities and representative paths, reviews the baseline behavior and
      experience roles plus the accepted layout, Input, accessibility, visual,
      timing, audio, and content-density uplift, and reports remaining gaps. Do
      not infer completeness from the implementer's summary or a successful
      demo.
- [ ] Reference use follows the
      [asset/reference policy](../docs/policies/assets-and-references.md) and
      [licensing policy](../docs/policies/licensing.md). High fidelity does not
      authorize copying incompatible code, text, data, distinctive expression,
      assets, or branding; compatible or project-owned substitutions preserve
      the declared behavior, role, breadth, and scale.
- [ ] The closing product review and engine review described in the
      [development guide](../docs/engine/development.md#reference-applications-and-the-engine-feedback-loop)
      are complete. Record the classification, retained application workaround,
      and known limitation in the example's README/design note or the owning
      plan closure. Any promoted engine fix is consumed through the recommended
      path before the example closes.
- [ ] The package started from the current tracked `template/` project shape,
      removed irrelevant starter domains rather than preserving a fake product
      authority, and completed a Starter feedback classification: proven
      general defaults/docs/engineering improvements were applied back to the
      template; product-specific behavior, data, visuals, and speculative
      integrations stayed local. This does not require continuous synchronization,
      source migration, or a scaffold CLI.

Completed examples are stable products: fix or evolve each only within its own
product scope. A newly accepted GUI/game reference product gets
a new package copied from `template/`; do not pile unrelated experiments into
an existing example. The active VN Reference Tour is such a new package: it
must not import or grow out of Bookshop, and it is not complete until its
declared compact product denominator is fully delivered.

## Script/text tasks (most common)

Which file to edit: dialogue control and text references → `src/story/narrative.ts`; localized narrative copy → the addressable text packs; resident UI copy → `src/content/presentation.ts`; stage renderers → `src/ui/stage-renderers.tsx`; product HUD/panel or special surfaces → `src/application/ui.tsx` when present; the sole public Narrative and optional WholeCanvas definitions → `application.ui().narrative` / `application.ui().wholeCanvas` in `composition.tsx`. VN products should select `@sillymaker/ui/narrative-player` before writing a renderer; theme it with its published CSS variables or explicitly eject/replace it, never mount both. `core-application.ts` is the headless instance factory, not the browser binding. Follow `template/` when a package uses a different local name for the same owner.

Before editing, list the full node sequence (one occurrence number per say/choice boundary, starting at 1) so the scenario script (`src/tooling/simulation-target.ts`) and tests are written correctly on the first pass.

Verification loop after every edit (seconds):

```sh
deno task typecheck
deno run -A npm:vitest run <this package directory>
deno task app simulate <appId> --scenario <name>
```

Rules in brief:

- Every new say/choice needs a brand-new `definitionId` (`interaction.<story>.<name>`); never reuse one.
- Bookshop uses the composition-owned production Narrative surface; GUI-only applications do not declare that surface. Do not add a second Narrative writer or revive the retired panel/player helpers.
- Existing Splash/Title authoring remains the `titleScreen` declaration even though the package now renders both through its WholeCanvas authority. A GUI-only application with `storyEntry: null` allocates neither a WholeCanvas Host nor a Story definition.
- A `stage` node's `mayShow` honestly lists every contentId it might show; a `branch`'s `choose` must land inside `successors` (tests enforce both).
- New stage content is wired in three places: the contentId constant in narrative, the content catalog in presentation, the renderer in composition. For a scene-managed scene the narrative side is its Scene document (see the scene collaboration contract below).
- Saveable state holds integers only (logical units like `scalePermille`); floats are rejected by canonical JSON.
- Use `show` for content entering an empty stage; `replace` only for content already on stage.

## Module/state tasks

The starter demonstrates the supported **feature-slice** shape: one gameplay feature per `src/game/features/<name>/` directory (`module.ts` module, `content.ts` content tables, `rules.ts` pure rules, `handlers.ts` command handlers, UI alongside its product owner), shared contracts in `src/game/kernel.ts`, and `src/game/simulation.ts`/`src/game/content.ts` doing aggregation and re-export only. A new feature = a new directory + one line at each aggregation point; a missed command kind fails to compile.

Four wiring points: `game/state.ts` (interface + schema + initial value) → `game/features/<name>/module.ts` and `handlers.ts` (or `game/simulation.ts` in the simple packages) → `application/semantic.ts` (action catalog + blockedBy) → `game/simulation-definition.ts` (manifest entry; module ids in lexicographic order). Keep the package identity revision in `story.ts` synchronized. The revision-sync table and the diagnostics quick-reference are in `docs/engine/authoring-quickstart.md`; do not bump revisions from memory.

## Motion collaboration contract

Narrative entrance/exit animations are `src/**/*.motion.json` assets bound through `motionStageTransition` or a Scene document cue — the human tuning surface (the Motion Workbench edits them). Do not overwrite a motion whose `authoring.status` is `"human_tuned"` or that is `locked` unless the task explicitly names it (locked changes go through a new variant file with a new id); preserve stable motion/transition ids across scene refactors; new tunable animation goes into a new motion file (status `"generated"`), never inline duration/easing constants in scene code.

## Scene collaboration contract

An Authoring Scene source is the single authority for that scene's ordered
layers/objects, transforms, appearance, cue bindings, and presence-bound
ambient references. Narrative blocks refer to stable scene/cue ids; do not
duplicate placement/order in gameplay code or edit the same composition through
a parallel low-level Scene path. Keep scene/object/cue ids stable across
refactors and let `app check` enforce admission, identity, and referenced Motion
rules. Use the starter's opening scene and Inspector binding as the current
recommended pattern; low-level `sillymaker.scene` documents remain an explicit
advanced source kind, not a second synchronized representation.

## Forbidden

- Import only `@sillymaker/*` package exports; never import engine `src/**` paths, never import another Story.
- For engine-behavior questions read `docs/engine/features.md`; do not guess from engine source. The engine baseline and the optional-wiring checklist are in `template/AGENTS.md`.
- Do not loosen assertion semantics to make tests pass; when occurrence assertions mismatch, renumber per the failure message.
