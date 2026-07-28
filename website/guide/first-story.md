# Your first Story

The `template/` package is a minimal playable game kept working by CI. New games start as a copy of it.

## Copy and rename

```sh
cp -R template examples/my-game
cd examples/my-game
# global rename: template -> mygame, Template -> Mygame
```

Then register the application in the root `project.config.ts` (copy the template's entry and adjust paths and IDs), add the package to the root `deno.json` workspace list, and run `deno install`.

## The files that matter

| File                                  | Role                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `src/narrative.ts`                    | The script: say/choice/stage/branch/end nodes and story flags               |
| `src/presentation.ts`                 | Text catalogs (all display text behind textIds), stage content, transitions |
| `src/state.ts`                        | Module state shapes, schemas, and initial values                            |
| `src/simulation.ts`                   | Modules, commands, and rules                                                |
| `src/application/semantic.ts`         | The action catalog and availability rules                                   |
| `src/application/web-application.tsx` | React UI: HUD, dialog panel, stage renderers                                |
| `src/tooling/simulation-target.ts`    | Named headless scenarios for `story simulate`                               |

## The loop

1. Edit the script or a rule.
2. `deno task typecheck` — seconds.
3. `deno run -A npm:vitest run examples/my-game` — the package's own tests.
4. `deno task story simulate my-game --scenario opening` — headless playthrough.
5. `deno task story dev my-game` — play it in the browser.

Two rules save the most time: plan the complete node sequence (and its occurrence numbering, starting at 1) before writing, and give every new say/choice a fresh `definitionId` — never reuse one.

## Working with AI agents

Each Story directory carries an `AGENTS.md` handbook with the wiring tables and forbidden actions. Point an agent at the package, state the goal, and let `deno task check` be the referee.
