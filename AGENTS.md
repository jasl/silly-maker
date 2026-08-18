# Project Instructions

## Mission

This repository is **SillyMaker** (https://github.com/jasl/silly-maker), a
reusable React and TypeScript engine for **GUI applications and games**. Games
remain the first pressure source for deterministic State, Save/replay,
presentation, input, content scale, and authoring. Browser and Deno Desktop are
the current product targets; Electron is only a possible future Host adapter.
Backend services, CLI products, and headless products are not engine targets.
Desktop CLI arguments may provide admitted startup configuration, and headless
code may support development, tests, conformance, and automation. Required
external or companion services, including LLMs, connect through typed RPC
boundaries; they are not in-process plugins. The current flagship is the Cat
Cafe example (`examples/cat-cafe`); the retired Project Tavern PoC lives only in
history. The active work may redesign gameplay, engine APIs, application
hosting, state management, presentation, and authoring workflows.

Prefer a coherent maintainable system over compatibility with the completed
first-PoC implementation. When a durable public contract changes, update its
documentation and tests with the code.

## Active sources of truth

Read only the documents relevant to the change:

- `docs/engine/roadmap.md` — accepted vNext direction and continuous engine
  milestones.
- `docs/engine/design/**` — accepted target contracts that are not necessarily
  implemented yet.
- `docs/engine/plans/2026-07-30-production-floor-sequence.md` — the only
  cross-plan execution order. PF0–PF7 and the Complexity Reset are complete;
  PF6 remains evidence-gated and inactive. The two authoring/presentation lanes
  accepted on 2026-08-15 both delivered that day:
  `docs/engine/plans/2026-08-15-authoring-architecture.md` (Studio author-trust
  hardening, the unified authoring shell with workspaces, the project authoring
  index, shared document sessions, story-package locality, Scene Construction,
  and the read-only Flow workspace; contracts in
  `docs/engine/design/authoring-architecture.md` and
  `docs/engine/design/scene-authoring-and-studio.md`) and
  `docs/engine/plans/2026-08-15-ambient-loop-motion.md` (presence-bound ambient
  loop motion; the owner-accepted contract lives in
  `docs/engine/proposals/ambient-loop-motion.md`). Cue identity (presentation
  edge context) delivered 2026-08-17; its contract and closure record live in
  `docs/engine/proposals/cue-identity.md`. The current default/core lane is
  `docs/engine/plans/2026-08-18-application-runtime-embedded-authoring.md`:
  Browser/Deno Desktop startup evidence, build-known progressive activation, an
  orchestration-neutral domain lifecycle with a bounded direct/Cordis-core A/B,
  structured authoring operations, an embeddable Authoring Host, and a typed RPC
  plus experimental Agent/UiArtifact seam. AR1 chooses exactly one private
  lifecycle backend; AR3 keeps Authoring stable across Game successors. Engine
  capabilities land before any separately accepted follow-on product or work.
  Desktop persistence remains an accepted, unfinished, conditional promotion
  lane while the adapter is preview.
- `docs/engine/design/application-runtime-and-embedded-authoring.md` — accepted
  target contracts for Browser/Deno Desktop GUI entries, startup configuration,
  external RPC, platform Module Update Sources, the private Extension Runtime,
  SillyMaker-owned publication, the single Authoring Host with standalone and
  embedded shells, structured authoring operations, and separated gameplay,
  authoring, Agent-session, and UiArtifact authorities. It allows the bounded
  AR1 Cordis-core comparison but does not activate a public Mod ABI, Cordis API,
  OpenUI/A2UI adapter, Effect Broker, Electron/Node Host, or Player source editor.
- `docs/engine/plans/2026-08-18-experimental-composition-state-runtime.md` —
  completed external strangler evidence and the curated promotion boundary for
  the maintained internal Composition package plus the still-experimental
  neutral State façade. It does not activate a public Mod ABI, State Format V2,
  Effect Broker, or production Story migration.
- `docs/engine/plans/2026-07-30-desktop-persistence-durability.md`,
  `docs/engine/plans/2026-07-30-snapshot-commit-performance.md`,
  `docs/engine/plans/2026-07-30-save-migration.md`,
  `docs/engine/plans/2026-07-30-surface-contract-harness.md`,
  `docs/engine/plans/2026-07-31-authoritative-determinism-guardrails.md`,
  `docs/engine/plans/2026-08-13-authorable-motion-workbench.md`, and
  `docs/engine/plans/2026-08-14-vn-scene-workspace.md` —
  focused contracts and completed evidence. Only the production-floor sequence
  owns current/next order; do not infer that list order or a historical pointer
  makes the conditional Desktop lane a core blocker.
- `docs/engine/plans/2026-07-19-sillymaker-vnext-foundations.md` and
  `docs/engine/plans/2026-07-28-sillymaker-r5-r7.md` — completed execution
  records whose defer/acceptance notes remain useful historical evidence;
  `docs/engine/roadmap-archive.md` — archived delivery history and completed
  milestone text.
- `docs/engine/architecture.md` — current package and runtime architecture.
- `docs/engine/features.md` — implemented engine capabilities and boundaries.
- `docs/engine/development.md` — setup, tests, and maintenance workflow.
- `docs/engine/story-authoring.md` — current Story composition model.
- `docs/engine/authoring-quickstart.md` — layered authoring playbook (content
  edits, module wiring, application declarations) with the diagnostics
  quick-reference. Story-directory agents also read the per-directory handbooks:
  `e2e/AGENTS.md`, `examples/AGENTS.md`, `template/AGENTS.md`.
- `docs/engine/build-and-release.md` — local Player build and Artifact workflow.
- `docs/game/README.md` — game design notes (historical Project Tavern status;
  new gameplay design also lands here).
- `website/**` — the public documentation site (VitePress, en + zh); internal
  plans/research/proposals stay under `docs/` and are not published.
- `docs/policies/licensing.md` and `docs/policies/assets-and-references.md` —
  project licensing and asset-use policy.
- Root legal files (`LICENSE.md`, `NOTICE`, `TRADEMARKS.md`) — controlling
  project legal scope.

The roadmap and design documents describe accepted direction; they do not make a
feature implemented. `architecture.md`, `features.md`, `story-authoring.md`,
`development.md`, and `build-and-release.md` describe the live implementation
and must be updated as each planned capability lands. Design owns the intended
contract, while the active plan owns task order and acceptance; a task must not
silently override a design decision.

The Mod design is incubation, not an active implementation plan. Do not start a
resolver, public Mod ABI, external SDK, or distribution system until the
roadmap's activation gates are explicitly satisfied and a new active plan is
accepted.

## Architecture baseline

- `@sillymaker/base` owns generic contracts, Story authoring primitives,
  deterministic runtime state, sessions, persistence orchestration, replay, and
  diagnostics. It has no React, DOM, browser-storage, or game-specific
  dependency.
- `@sillymaker/composition` owns cold-path trusted profile composition. Compile
  services and registries into direct plans before hot execution;
  authoritative profiles seal after mount, while a live candidate requires an
  explicit consumer publication acknowledgement. Live effects are installed
  before that acknowledgement and therefore must be staging-safe. Do not add
  dynamic lifecycle lookup to command/render paths. The active AR1 may compare
  the current direct lifecycle with a private Cordis-core-derived backend under
  one neutral conformance suite; the selected backend must remain optional,
  keep Cordis/Context out of domain and public contracts, exclude Node HMR, and
  leave SillyMaker publication/State authority unchanged.
- `@sillymaker/state` is an experimental neutral façade for authoritative
  transactional State, not a generic React/UI store. It must reuse exactly one
  Base Session and transaction runner; it never owns a second State, digest,
  Save, replay, queue, or CommandLog authority. Production Story migration
  remains evidence-gated.
- `@sillymaker/ui` owns reusable React presentation, input, interaction,
  overlays, diagnostics UI, assets, characters, stages, and semantic-publication
  bridges.
- `@sillymaker/web` owns browser hosting, IndexedDB persistence adapters,
  mounting, routing, capabilities, automation, pointer input, and development
  rebootstrap.
- Story packages at the repository top level own game-specific state, rules,
  content, projections, application composition, and Story tooling: `e2e/` (the
  neutral Engine Lab conformance Story), `template/` (the minimal starter), and
  `examples/*` (curated showcases). `project.config.ts` at the root only lists
  application directories; each self-contained application
  (`sillymaker.config.ts` + `vite.config.ts`) registers only itself.
- Workspace packages consume one another through declared package exports and
  `workspace:*` dependencies, not another package's `src/**` path.

The current authoritative flow is:

```text
Story definition -> resolved GameSimulation -> GameSession/GameSnapshot
  -> GameQueries -> SemanticPublication -> RuntimePresentationPublication -> renderer
```

One session owns authoritative state and serializes authoritative operations. UI
and automation use semantic/application ports rather than direct State setters.
Browser storage persists versioned plain data; it is not the live simulation
database.

This baseline describes the implementation, not an immutable constitution.
Architectural changes are welcome when they preserve clear ownership,
deterministic behavior where required, atomic failure semantics, and a
documented migration path.

## Development workflow

- The public compatibility floor is Deno >= 2.9.0 (the runtime and package
  manager; npm dependencies resolve through Deno's Node compatibility).
  Maintained development, required CI, and Desktop promotion run on the latest
  stable Deno available at execution time. Do not pin one exact patch, require
  the floor as a second per-PR lane, or require a browser revision, machine
  attestation, or shell layout. Node compatibility supports dependencies; it
  does not make Node.js a SillyMaker product Host target.
- Install with `deno install`. Use `deno task dev` for local development and
  `deno task check` as the canonical local code-quality and product-behavior
  check.
- Use `deno task test` for automated product/engine tests, `deno task test:e2e`
  when browser behavior is affected, and the commands documented in
  `docs/engine/build-and-release.md` for Player builds.
- Keep ESM, TypeScript project references, explicit `.ts`/`.tsx` import
  extensions, exact dependency versions, and the shared `deno.lock` unless an
  intentional tooling change updates them.
- Tests should protect observable engine behavior, game rules, public data
  formats, compatibility promises, or real user flows. Do not add fixtures or
  scripts whose only purpose is to enforce a plan phase, task commit, exact file
  inventory, command order, clean Git tree, host attestation, or frozen
  provisional balance output.
- Apply defensive validation in proportion to the trust boundary:
  - bytes, files, URLs, HTTP payloads, Save data, cross-process records, and
    other untrusted input keep strict bounds, canonical validation, atomic
    failure, and stable diagnostics;
  - public Story/authoring input is validated and normalized once at admission,
    then consumed as ordinary typed data;
  - package-internal collaborators are trusted TypeScript construction. Do not
    add WeakMap authenticity brands, exact-claimant tokens, repeated descriptor
    admission, captured language intrinsics, or Proxy/monkey-patch defenses for
    them unless a real stale/ABA, cross-owner, public-boundary, or reproduced bug
    requires it.
- Use identity tokens and WeakMap proofs for concrete ownership/currentness
  problems, not as a default object model. Preserve generation fencing, CAS,
  single authority, atomic commit, and deterministic replay where those are
  observable product invariants.
- Treat the delivered authoritative-determinism checker as scope-frozen. Do not
  extend syntax proofs, diagnostic precedence, or hypothetical capability
  escapes unless authoritative code exposes a reproducible false negative or
  false positive. A concrete regression may justify the smallest correction;
  completeness alone does not.
- Stop an implementation goal for unresolved public/wire compatibility,
  Save/digest/replay semantics, authority/atomicity, an actual security boundary,
  conflicting real consumers, or a measured production-performance failure. Private
  helper shape, diagnostic precedence, test decomposition, and equally safe
  internal designs are implementation choices; choose the simplest fail-fast
  option and continue.
- Prefer focused tests near the changed behavior, then run the relevant broader
  command. Regenerate a fixture only when it represents a maintained product
  format or user-visible compatibility contract.
- Keep implementation files focused and public interfaces explicit. Source file
  names are kebab-case only (no PascalCase/camelCase files: macOS and Windows
  default to case-insensitive filesystems and mixed-case renames corrupt Git
  state). Use serializable project randomness in deterministic gameplay paths;
  avoid `Math.random()` there.
- Update the active technical documentation when package roles, public exports,
  state ownership, persistence, Story authoring, build output, or supported
  workflows change. Keep active execution plans focused on current/next work,
  dependencies, acceptance, and stop conditions; move completed delivery detail
  to an archive. Use at most two slice-numbering levels and at most one
  docs-only entry before implementation rather than recursively adjudicating
  every internal choice.

## Product and Story work

- The first Tavern PoC application is retired (branch
  `archive/poc-v1-stage-2026-07`); the Engine Lab conformance Story is an engine
  rig, not gameplay guidance.
- New gameplay design belongs in active documents under `docs/game/`; do not
  reactivate archived PoC specifications by editing them in place.
- Story state should remain plain, versioned, validated data. Commands must
  either commit a complete valid result or leave authoritative state unchanged.
- Presentation code renders immutable projections and sends semantic intents. It
  does not become a second gameplay-state authority.
- A future typed in-memory state store is an open design option described in
  `docs/engine/proposals/typed-state-store.md`, not a required migration or
  accepted API.

## Licensing and third-party-code boundaries

- Copyright holder: `Jun Jiang (jasl)`.
- The whole repository — engine packages, Story packages (e2e, template,
  examples including the cat-cafe), scripts, configuration, and documentation —
  is MIT. Project-owned media assets (`examples/*/assets/**`,
  `art-source/**`) are dedicated to the public domain under CC0 1.0 (commercial
  use, derivatives, and redistribution unrestricted). `LICENSE.md` controls.
- Do not add copied or adapted third-party material without first agreeing the
  dependency, license, and required notices with the owner. Compatible material
  must follow its license and preserve required notices. Commercial material or
  code with incompatible terms must be reimplemented clean-room: a spec/test
  author may document public behavior, while the implementer works only from
  that independent specification and must not inspect the incompatible source.
- Do not create a source-history/provenance file, catalog, register, registry,
  database, architecture subsystem, or enforcement harness. Do not recursively
  scan dependency, vendor, build, model, or data trees to populate one. Use the
  ordinary project licenses, SPDX identifiers, package manifests, shared lockfile,
  and release process instead.
- `references/` is ignored, untracked research input. Production code, tests,
  fixtures, generators, builds, and artifacts must not depend on it.
- Media working archives and promoted runtime assets follow
  `docs/policies/assets-and-references.md`. Runtime digests establish technical
  identity only.
- Contributions are accepted inbound=outbound MIT (media assets CC0).

## Generated and local files

Do not commit dependency directories, build output, coverage, local saves,
diagnostics, generated exports, secrets, ignored references, editor-local state,
or disposable calibration data. Extend `.gitignore` when new tools create
persistent local output.
