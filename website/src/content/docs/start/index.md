---
title: "Agent-first start"
description: "Give a coding agent the minimum reliable context for a SillyMaker GUI application or game."
---

This is the canonical entry for working with SillyMaker through a coding agent.

## Copy this prompt

```text
Work in this SillyMaker project as a product engineer.
1. Read the repository AGENTS.md and the nearest directory handbook.
2. Identify whether the product is a GUI application or a game before selecting packages.
3. Use only current public package entries and current source-of-truth documentation.
4. Preserve one owner for each State, presentation, input, and content concern.
5. Run the focused checks for every behavior you change, then report what was and was not verified.
```

## Choose a product path

- Continue with **GUI application** when ordinary React/CSS is the product surface.
- Continue with **game application** when the product needs deterministic State, scenes, Save, or replay.

> **TODO:** Add copy-ready prompts for a fresh external project after the starter recipe is finalized.
