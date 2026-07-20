// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Node runs this repository's TypeScript sources directly; these hooks remap
// compiled-style specifiers onto live sources for every module the commands
// load, so they stay registered for the whole process.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.endsWith(".mjs")) {
        return nextResolve(`${specifier.slice(0, -4)}.mts`, context);
      }
      if (specifier.endsWith(".js")) {
        return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
      }
      throw error;
    }
  },
});

const repositoryRootV1 = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

const [
  { defineSillymakerProjectV1, runProjectCliV1 },
  { createImportProjectModuleLoaderV1 },
  { projectTavernConfigV1 },
] = await Promise.all([
  import("../../engine/packages/tooling/src/project/index.js"),
  import("../../engine/packages/tooling/src/project/loader.js"),
  import("../../game/project.config.js"),
]);

process.exitCode = await runProjectCliV1({
  project: defineSillymakerProjectV1(projectTavernConfigV1),
  argv: process.argv.slice(2),
  loader: createImportProjectModuleLoaderV1(repositoryRootV1),
  writeOut: (line) => console.log(line),
  writeErr: (line) => console.error(line),
});
