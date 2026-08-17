# Your first Story

> Prefer to delegate? [Getting started with AI](/guide/getting-started) covers the same flow driven by an AI agent.

The `template/` package is a minimal playable, scene-first game kept working by CI. New games start as a copy of it. Before touching any TypeScript, try the visual loop: `deno task dev`, enable developer tools in Settings, open **调试 → 场景 → Studio**, and drag the character — saving writes only `src/scenes/opening/opening.scene.json` and the running game hot-updates. The scene document owns placements and cue→motion bindings; the script references cues.

## Copy and rename

```sh
cp -R template examples/my-game
cd examples/my-game
# global rename: template -> mygame, Template -> Mygame
```

Then register the application in the root `project.config.ts` (copy the template's entry and adjust paths and IDs), add the package to the root `deno.json` workspace list, and run `deno install`.

## The files that matter

| File                               | Role                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `src/scenes/opening/*.scene.json`  | Scene composition: placements, appearance, cue→motion binding (edit in Studio) |
| `src/story/narrative.ts`           | The script: say/choice/stage/branch/end nodes and story flags                  |
| `src/content/presentation.ts`      | Text catalogs (all display text behind textIds), stage content, transitions    |
| `src/ui/stage-renderers.tsx`       | Stage renderers shared by the game and the Studio canvas                       |
| `src/game/state.ts`                | Module state shapes, schemas, and initial values                               |
| `src/game/simulation.ts`           | Modules, commands, and rules                                                   |
| `src/application/semantic.ts`      | The action catalog and availability rules                                      |
| `src/application/ui.tsx`           | React components: HUD and the passive Narrative renderer                       |
| `src/application/composition.tsx`  | Projector, slots, application declaration, and Narrative binding (Advanced)    |
| `src/tooling/simulation-target.ts` | Named headless scenarios for `story simulate`                                  |

The template declares its sole production Narrative writer as `application.ui().narrative`. `defineNarrativeSurfaceV1` packages five Story contributions into an opaque `NarrativeSurfaceDefinitionV1`: select the Narrative projection, dispatch a semantic resolution, render passive UI, resolve localized text, and optionally replay the current voice. The engine-owned composition supplies playback, History, profile, clock, input, focus, and Stage lifecycle; do not mount a second dialogue player beside it.

## The loop

1. Edit the script or a rule.
2. `deno task typecheck` — seconds.
3. `deno run -A npm:vitest run examples/my-game` — the package's own tests.
4. `deno task story simulate my-game --scenario opening` — headless playthrough.
5. `deno task story dev my-game` — play it in the browser.

Two rules save the most time: plan the complete node sequence (and its occurrence numbering, starting at 1) before writing, and give every new say/choice a fresh `definitionId` — never reuse one.

## Working with AI agents

Each Story directory carries an `AGENTS.md` handbook with the wiring tables and forbidden actions. Point an agent at the package, state the goal, and let `deno task check` be the referee.
