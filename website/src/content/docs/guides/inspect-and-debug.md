---
title: "Inspect and debug"
description: "Use the runtime Inspector, diagnostics, focused tests, and browser tools."
---

Use the running product and its declared source authorities together. The
Inspector is a development surface for Authoring Scene projects; it is not a
general browser debugger or a finished visual editor.

## Open the current Inspector

Start the application from its directory or the repository root:

```sh
deno task app dev <application-id>
```

Open the same-origin `/__sillymaker/inspector/` route. The application must
declare an Inspector binding in `sillymaker.config.ts`; production Player
builds exclude that binding, source writers, and the Inspector implementation.

## What it can change

For an `*.authoring-scene.json` source, the Inspector can:

- search scenes and navigate the virtualized Layer/Object hierarchy;
- select visible, transparent, grouped, or off-canvas objects in the real Stage
  preview;
- edit local transform, visual content, existing appearance values, sibling
  order, and layer order;
- save through the Scene compare-and-swap path, retaining a dirty draft for an
  explicit retry when the saved source changed.

Hit regions, Motion, Timeline, interaction/GUI intent, compiled layers, and
source provenance are read-only facets. Motion/Timeline scrub is detached
presentation sampling. Object creation, code, low-level Scene, Regions/Chrome
documents, and Motion keyframes remain direct source or focused-tool work.

## Follow one issue to evidence

1. Reproduce the visible problem and identify the selected Scene/Object or
   runtime facet.
2. Follow the displayed source location to the single owning document or code
   path.
3. Change that authority; do not mirror the fix into a second store.
4. Run the focused check, then the relevant application and browser path:

```sh
deno task app check <application-id>
deno task app simulate <application-id> --scenario <name>
```

Simulation applies to game applications with a declared scenario. GUI-only
applications use their focused unit and browser acceptance instead. Report the
observed behavior, changed authority, automated evidence, manual evidence, and
any remaining engine gap separately.
