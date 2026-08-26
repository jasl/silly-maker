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
2. Agent Creator produces a deterministic local response and Program proposal.
3. Continue in **Program Workspace** with the conversation, proposal, preview,
   and activity visible together.
4. Accept or reject that exact local proposal.

This slice validates the GUI structure, responsive workspace, and human review
flow. The preview is deterministic and local; accepting it does not create or
publish a real application.

## Current boundary

There is no real Pi integration, database, RPC backend, Mod activation, or
persistence in this preview. Reloading starts a new local session. The visible
Program and capabilities are proposal data, not evidence that those systems are
connected.
