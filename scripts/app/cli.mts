// SPDX-License-Identifier: MIT
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The repository imports TypeScript sources with explicit .ts/.tsx
// extensions, so both Deno (natively) and Node (--experimental-strip-types)
// run this CLI without loader hooks.

const repositoryRootV1 = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

const [
  { runProjectCliV1 },
  { loadWorkspaceProjectV1 },
  { createImportProjectModuleLoaderV1 },
  { sillyMakerConfigV1 },
] = await Promise.all([
  import("../../engine/packages/tooling/src/project/index.ts"),
  import("../../engine/packages/tooling/src/project/workspace.ts"),
  import("../../engine/packages/tooling/src/project/loader.ts"),
  import("../../project.config.ts"),
]);

// Every registered application declares itself in its own directory
// (`<dir>/sillymaker.config.ts`); the root registry is only the list of
// those directories, aggregated here for repository-level commands.
const projectConfigV1 = await loadWorkspaceProjectV1({
  repositoryRoot: repositoryRootV1,
  workspace: sillyMakerConfigV1,
});

process.exitCode = await runProjectCliV1({
  project: projectConfigV1,
  argv: process.argv.slice(2),
  loader: createImportProjectModuleLoaderV1(repositoryRootV1),
  repositoryRoot: repositoryRootV1,
  writeOut: (line) => console.log(line),
  writeErr: (line) => console.error(line),
});
