# Cards agent handbook

This package is a complete maintained **Reference Product**, not an API gallery.
Its fidelity denominator, target-platform uplift, budgets, and 2026-08-25
closure evidence live in `README.md`; a later passing slice never reduces that
denominator.

The project started as a tracked copy of `template/`, then deliberately removed
the Story, GameSession, Scene, Save, Studio, and simulation skeleton because
Cards is a GUI-only product. Do not restore a fake game authority to reuse a
game entry.

## Ownership

- `src/gui/cards.gui-composition.json` owns stable screen/card data, order, and
  props. It is admitted once and compiled through the public Code Surface entry.
- `src/gui/catalog.ts` owns the build-known view catalog and prop schemas.
- `src/gui/views/cards-screen.tsx` owns the one transient focus/open session;
  `feature-card.tsx` renders a card and its detail. This state is not State/Save.
- `src/application/entry.tsx` selects the neutral public Web GUI application
  path. Browser and Deno Desktop use the same component graph.

Keep the root/card split coarse. Do not turn decorative spans, streaks, text,
or detail bars into more Code Surfaces. Use native button, focus, pointer, touch,
and CSS behavior before inventing an input or motion abstraction.

## Required behavior

- Initial focus and detail are empty. Previous from empty focuses Input; next
  from empty focuses Layout. Both ends clamp.
- Activating the focused card toggles it; activating another card replaces the
  detail. Moving focus alone never changes the open detail.
- Focus changes background/border and removes a 4px resting offset; it never
  scales text. Detail mount replays its spring-like translation.
- Both ambient streaks run once and stop. Reduced motion removes ambient and
  detail/focus movement without removing state feedback.
- Resize/reflow preserves transient focus/open state.

## Boundaries

- Import supported `@sillymaker/*` exports only. Never import `internal`, engine
  `src/**`, another Example, or the local PocketJS checkout.
- Keep all released copy, CSS, vectors, and metadata project-owned. The local
  reference is behavioral evidence only.
- Do not add Story, Save, addressable loading, Inspector, Agent, Mod, networking,
  or error/loading UI to this synchronous three-card product.
- Keep React component modules component-only for Fast Refresh. Put shared
  context, action IDs, schemas, and compiled plans in non-component modules.

Verification while iterating:

```sh
deno task typecheck
deno run -A npm:vitest run examples/cards/src
deno task app build example-cards
```
