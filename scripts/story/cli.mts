// SPDX-License-Identifier: MIT
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The repository imports TypeScript sources with explicit .ts/.tsx
// extensions, so both Deno (natively) and Node (--experimental-strip-types)
// run this CLI without loader hooks.

const repositoryRootV1 = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

const [
  { defineSillymakerProjectV1, runProjectCliV1 },
  { createImportProjectModuleLoaderV1 },
  { mergeLocalStoryApplicationsV1, readLocalStoryApplicationsV1, sillymakerLocalConfigFileNameV1 },
  { sillyMakerConfigV1 },
] = await Promise.all([
  import("../../engine/packages/tooling/src/project/index.ts"),
  import("../../engine/packages/tooling/src/project/loader.ts"),
  import("../../engine/packages/tooling/src/project/local-overlay.ts"),
  import("../../project.config.ts"),
]);

// The optional gitignored local overlay registers private/local applications
// (for example tmp-only verification games) into the same lifecycle.
const localConfigPathV1 = resolve(repositoryRootV1, sillymakerLocalConfigFileNameV1);
const projectConfigV1 = existsSync(localConfigPathV1)
  ? mergeLocalStoryApplicationsV1(
      sillyMakerConfigV1,
      readLocalStoryApplicationsV1(
        (await import(pathToFileURL(localConfigPathV1).href)) as Readonly<Record<string, unknown>>,
      ),
    )
  : sillyMakerConfigV1;

process.exitCode = await runProjectCliV1({
  project: defineSillymakerProjectV1(projectConfigV1),
  argv: process.argv.slice(2),
  loader: createImportProjectModuleLoaderV1(repositoryRootV1),
  repositoryRoot: repositoryRootV1,
  writeOut: (line) => console.log(line),
  writeErr: (line) => console.error(line),
});
