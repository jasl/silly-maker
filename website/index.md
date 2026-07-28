---
layout: home

hero:
  name: SillyMaker
  text: An LLM-friendly game engine for story games
  tagline: TypeScript + React. Deterministic simulation, semantic stages, atomic saves — authorable by humans and AI agents alike.
  actions:
    - theme: brand
      text: Get started with AI
      link: /guide/getting-started
    - theme: alt
      text: Browse the examples
      link: /guide/examples
    - theme: alt
      text: GitHub
      link: https://github.com/jasl/silly-maker

features:
  - title: Built for both audiences
    details: AI agents get structured diagnostics, headless simulation, and authoring canaries. Humans get a DevDock with live inspectors, a writable tuning panel, trajectory traces, and save diffs.
  - title: Deterministic by construction
    details: One session owns authoritative state. Commands commit atomically or not at all; RNG travels inside snapshots, so replay and player rollback reproduce the same run bit for bit.
  - title: Semantic stage, not a canvas
    details: Stories publish plain-data stage targets — content IDs, placements, appearances, hit regions. Renderers are swappable React components; saves never contain renderer state.
  - title: Static data as content tables
    details: Items, activities, events, and reactions live in validated content-database tables with typed queries. Mutable game state stays in modules. Tuning is editing a table row.
  - title: Not just visual novels
    details: SillyOS 98 is an off-label retro desktop on the same engine — overlapping windows, a taskbar, deterministic Minesweeper, and a Notepad whose files survive reboot.
---
