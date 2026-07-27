// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The repository imports TypeScript sources with explicit .ts/.tsx
// extensions, so both Deno (natively) and Node (--experimental-strip-types)
// run this CLI without loader hooks.

const repositoryRootV1 = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

const [
  { defineSillymakerProjectV1, runProjectCliV1 },
  { createImportProjectModuleLoaderV1 },
  { projectTavernConfigV1 },
] = await Promise.all([
  import("../../engine/packages/tooling/src/project/index.ts"),
  import("../../engine/packages/tooling/src/project/loader.ts"),
  import("../../game/project.config.ts"),
]);

process.exitCode = await runProjectCliV1({
  project: defineSillymakerProjectV1(projectTavernConfigV1),
  argv: process.argv.slice(2),
  loader: createImportProjectModuleLoaderV1(repositoryRootV1),
  repositoryRoot: repositoryRootV1,
  writeOut: (line) => console.log(line),
  writeErr: (line) => console.error(line),
});
