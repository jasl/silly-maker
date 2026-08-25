---
title: "Manual start"
description: "Clone, install, and run the SillyMaker starter without an agent."
---

## Run the repository

SillyMaker currently requires Deno 2.9 or newer.

```sh
git clone https://github.com/jasl/silly-maker
cd silly-maker
deno install
deno task app dev template
```

The starter opens as a minimal playable application. Copy `template/` when starting a product, then remove capabilities the product does not use instead of keeping empty owners.

## Choose the next guide

- **GUI application** explains the neutral React application path.
- **Game application** explains the deterministic game path.

> **TODO:** Complete the standalone-copy and first-release walkthrough.
