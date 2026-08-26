---
title: "Manual start"
description: "Clone, install, and run the SillyMaker starter without an agent."
---

## Run the repository

SillyMaker currently requires Deno 2.9 or newer. Engine packages are supported
workspace entries in the source repository; they are not published npm
packages yet.

```sh
git clone https://github.com/jasl/silly-maker
cd silly-maker
deno install
deno task app dev template
```

The starter opens as a minimal playable application. Copy `template/` when
starting a product, then remove capabilities the product does not use instead
of keeping empty owners. Its README owns the current copy-inside and
copy-outside-repository recipe.

## Establish the first baseline

From the repository root:

```sh
deno task app check template
deno run -A npm:vitest run template
```

These checks prove the unchanged starter, not the completeness of a new
product. Define that product's visible scope and acceptance separately.

## Choose the next guide

- [GUI application](../../guides/gui-application/) explains the neutral React
  application path and which game files to remove.
- [Game application](../../guides/game-application/) explains the deterministic
  game path.
- [Start with a coding agent](./) adds the shared brief, scope ledger, and
  evidence report.
