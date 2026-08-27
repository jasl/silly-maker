---
title: "SillyOS"
description: "A GUI-only Creator Home to Program Workspace deterministic preview."
---

SillyOS Creator Preview is a GUI-only product slice built with SillyMaker. Its
only built-in user-facing program is **Agent Creator**.

[Open SillyOS](../../play/silly-os/)

## Current journey

1. Describe a translation, writing, role-play, or general creation intent on
   **Creator Home**.
2. By default, Agent Creator produces a deterministic local response and
   Program proposal.
3. Continue in **Program Workspace** with the conversation, proposal, preview,
   and activity visible together.
4. Accept or reject that exact local proposal.

This slice validates the GUI structure, responsive workspace, and human review
flow. The preview is deterministic and local; accepting it does not create or
publish a real application.

## Current boundary

The default entry remains the deterministic local preview. Explicit query-gated
Browser routes load the product-pinned Pi into an Agent Worker and connect it to
the page and Workspace Host through typed Worker RPC. The Program catalog and
continuation records live in a browser-local database; mutable project files and
their current checkpoint live in OPFS. A reload can reopen that exact local
volume and generation instead of silently creating an empty workspace.

The current checkpoint gate covers recovery and single-writer ownership,
Chromium and WebKit evidence for a 20 MiB-class workspace, and a UI for the
browser's origin-wide storage estimate and explicit persistence request. The
estimate is advisory for the complete site origin, not a Program-specific limit.
The browser may deny a persistence request without disabling the workspace.

The deployed Worker serves assets only. Program data remains under the
visitor's current browser origin; Cloudflare does not receive, synchronize, or
back it up. Changing origin or clearing site data loses that local checkpoint.
Immutable snapshots and ZIP export/import for portable backup and recovery are
not implemented. There is also no public Mod or Agent ABI, general LLM Provider
UI, or promoted Desktop persistence.
