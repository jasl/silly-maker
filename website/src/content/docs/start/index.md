---
title: "Start with a coding agent"
description: "Turn product intent into a bounded SillyMaker mission with shared artifacts and acceptance."
---

SillyMaker treats a coding agent as a collaborator inside the project, not as a
demo generator. Define the whole result before asking for the first
implementation slice.

## Define completion first

```text
Product goal:
Complete user-visible scope:
Required screens / scenes / routes / content scope:
Target devices and input:
Human-tuned or non-negotiable areas:
Automated acceptance:
Manual acceptance:
Explicitly out of scope:
```

A playable vertical slice is progress evidence, not product completion, unless
the brief explicitly says the slice is the whole product.

## Give the agent this operating prompt

```text
Work as a product engineer, not as a demo generator.

Before editing:
1. Read AGENTS.md, the nearest directory AGENTS.md, and only the current
   implementation guides relevant to this task.
2. Restate the complete user-visible scope, target devices/input, human-tuned
   areas, and acceptance paths. A vertical slice is not completion unless the
   brief says so.
3. Locate the existing owners for State, Scene, content, presentation, and
   input. Reuse them; do not create parallel authorities.

During and after:
4. Implement one reviewable slice while maintaining a ledger of the complete
   scope.
5. Run focused checks, app check/simulate where applicable, and the declared
   browser/manual paths.
6. Report completed scope, omitted scope, verification evidence, and engine
   gaps separately.
```

## Give it the smallest useful project map

- Repository [AGENTS.md](https://github.com/jasl/silly-maker/blob/main/AGENTS.md)
  routes current work to the relevant source of truth.
- The nearest directory AGENTS.md defines local ownership and change rules.
- [template/README.md](https://github.com/jasl/silly-maker/blob/main/template/README.md)
  maps common product intent to starter files and commands.
- [Implemented features](https://github.com/jasl/silly-maker/blob/main/docs/engine/features.md)
  answer whether an engine capability exists today.
- The [authoring quickstart](https://github.com/jasl/silly-maker/blob/main/docs/engine/authoring-quickstart.md)
  covers current Scene, text, rule, and Inspector workflows.
- Read the [architecture](https://github.com/jasl/silly-maker/blob/main/docs/engine/architecture.md)
  only when changing ownership or engine boundaries.
- The roadmap describes direction; it is not evidence that a capability ships.

These are currently supported workspace package entries used from a SillyMaker
source checkout, not published npm packages.

## Choose the product path

- Continue with [GUI application](../guides/gui-application/) when ordinary
  React and CSS own the product surface.
- Continue with [game application](../guides/game-application/) when the product
  needs authoritative State, scenes, Save, or replay.
- Use [project structure](./project-structure/) to locate the first files, or
  [start manually](./manual/) without a coding agent.

## Review the result together

Require the final report to separate:

1. the declared scope that is complete;
2. the scope still omitted or represented only by placeholders;
3. automated and manual evidence actually run;
4. engine gaps discovered while implementing the product.

Human review decides whether the evidence matches the intended work.
