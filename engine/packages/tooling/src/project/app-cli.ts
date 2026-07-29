// SPDX-License-Identifier: MIT
import type { ProjectCliInputV1 } from "./cli.ts";
import { runProjectCliV1 } from "./cli.ts";
import { createImportProjectModuleLoaderV1 } from "./loader.ts";
import { loadStandaloneAppProjectV1 } from "./workspace.ts";

export interface AppCliInputV1 {
  /** Absolute application root (the directory holding `sillymaker.config.ts`). */
  readonly appRoot: string;
  readonly argv: readonly string[];
  writeOut(line: string): void;
  writeErr(line: string): void;
  /** Injectable seam for tests; defaults to the real Node runner. */
  readonly runner?: ProjectCliInputV1["runner"];
}

/**
 * The app-local `story` CLI: one application project, rooted at its own
 * directory. `story <verb> .` (or the application ID) resolves against the
 * app's own `sillymaker.config.ts`; builds run the app's own Vite config.
 */
export async function runSillymakerAppCliV1(input: AppCliInputV1): Promise<number> {
  let project: Awaited<ReturnType<typeof loadStandaloneAppProjectV1>>;
  try {
    project = await loadStandaloneAppProjectV1(input.appRoot);
  } catch (error) {
    input.writeErr(error instanceof Error ? error.message : String(error));
    return 1;
  }
  const applicationId = project.applications[0]?.applicationId ?? "";
  // Accept `.` as a convenience selector for "this application".
  const argv = input.argv.map((argument, index) =>
    index === 1 && argument === "." ? applicationId : argument,
  );
  return await runProjectCliV1({
    project,
    argv,
    loader: createImportProjectModuleLoaderV1(input.appRoot),
    repositoryRoot: input.appRoot,
    ...(input.runner === undefined ? {} : { runner: input.runner }),
    writeOut: input.writeOut,
    writeErr: input.writeErr,
  });
}
