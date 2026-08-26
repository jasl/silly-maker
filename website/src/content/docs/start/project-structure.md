---
title: "Project structure"
description: "Find the files to edit in a SillyMaker application and in the engine repository."
---

Use this map after the product brief identifies what is changing. Do not ask a
coding agent to read the entire repository first.

## Repository roles

| Intent                                                  | Owner              |
| ------------------------------------------------------- | ------------------ |
| Reusable runtime or public workspace contract           | `engine/packages/` |
| Copyable game-first application shell                   | `template/`        |
| Products and focused examples that evaluate the engine  | `examples/`        |
| Neutral browser conformance                             | `e2e/`             |
| Public bilingual documentation                          | `website/`         |
| Accepted design, implementation truth, and active plans | `docs/engine/`     |

## Inside a copied application

- `sillymaker.config.ts` selects the application entry, target, and tooling
  bindings.
- `src/application/` owns Host composition and product UI.
- `src/game/` owns authoritative rules and State for a game; a GUI-only
  product removes this authority.
- `src/story/` owns narrative control and stable text references.
- `src/scenes/` and adjacent JSON documents own authorable composition,
  placement, Motion, and presentation data.
- `assets/content/` owns addressable localized text packs.
- `src/tooling/` owns development-only simulation and Inspector bindings.
- `src/test/` and product E2E own declared acceptance evidence.

The current exact starter map lives in
[`template/README.md`](https://github.com/jasl/silly-maker/blob/main/template/README.md).
When a file and a roadmap statement disagree about current behavior, verify
against the implemented feature documentation and source rather than treating
the roadmap as shipped code.
