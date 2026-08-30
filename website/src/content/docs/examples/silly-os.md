---
title: "SillyOS"
description: "A browser-local Agent Creator product with isolated workspace and network companions."
---

SillyOS is a browser-local Agent product built with SillyMaker. Its only
built-in user-facing program is **Agent Creator**.

[Open the standalone SillyOS deployment](https://silly-os.jasl9187.workers.dev/)

## Current journey

1. Describe a translation, writing, role-play, or general creation intent on
   **Creator Home**.
2. Agent Creator produces a local Program proposal, using the deterministic
   preview or an explicitly configured Provider route.
3. Continue in **Program Workspace** with the conversation, proposal, preview,
   and activity visible together.
4. Accept or reject that exact local proposal.

This product validates the GUI structure, responsive workspace, browser-local
Agent execution, and human review flow. Accepting a proposal updates the local
Program and workspace; it does not publish a remote application.

## Current boundary

The deterministic preview remains available, while configured Browser routes
load the product-pinned Pi into an Agent Worker and connect it to the page and
Workspace Host through typed Worker RPC. The Program catalog and
continuation records live in a browser-local database; mutable project files and
their current checkpoint live in OPFS. A reload can reopen that exact local
volume and generation instead of silently creating an empty workspace.

SillyOS is deliberately deployed as a control application plus independent
Workspace Sandbox and Network Broker origins. The documentation site links to
that deployment instead of embedding an incomplete static copy that cannot
satisfy those origin and CSP contracts.

The current checkpoint gate covers recovery and single-writer ownership,
Chromium and WebKit evidence for a 20 MiB-class workspace, and a UI for the
browser's origin-wide storage estimate and explicit persistence request. The
estimate is advisory for the complete site origin, not a Program-specific limit.
The browser may deny a persistence request without disabling the workspace.

The deployed Worker serves assets only. Program data remains under the
visitor's current browser origin; Cloudflare does not receive, synchronize, or
back it up. Changing origin or clearing site data loses that local checkpoint.
The current mutable Workspace head can be exported as a canonical ZIP, and an
accepted immutable snapshot is retained locally. That ZIP is not a full-product
backup: accepted-snapshot download and portable import/restore are not
implemented. There is also no public Agent Host ABI or promoted Desktop
persistence.
