// SPDX-License-Identifier: MIT
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { AuthoringDiagnosticErrorV1, createDiagnosticV1 } from "@sillymaker/base";

import type {
  SillymakerAppConfigV1,
  SillymakerProjectConfigV1,
  SillymakerWorkspaceConfigV1,
} from "./config-types.ts";
import { defineSillymakerProjectV1, deriveStoryApplicationV1 } from "./config.ts";

/** The file an application project declares itself in, at its root. */
export const sillymakerAppConfigFileNameV1 = "sillymaker.config.ts";
/** The named export that file must provide. */
export const sillymakerAppConfigExportNameV1 = "sillymakerAppConfigV1";

function workspaceErrorV1(code: string, message: string, pointer: string): never {
  throw new AuthoringDiagnosticErrorV1([
    createDiagnosticV1({
      code,
      phase: "build",
      message,
      location: { jsonPointer: pointer },
      details: {},
    }),
  ]);
}

/** One loaded application project: its directory plus its own declaration. */
export interface WorkspaceAppV1 {
  readonly directory: string;
  readonly config: SillymakerAppConfigV1;
}

/** Imports `<appRoot>/sillymaker.config.ts` and returns its declaration. */
export async function loadSillymakerAppConfigV1(appRoot: string): Promise<SillymakerAppConfigV1> {
  const configPath = resolve(appRoot, sillymakerAppConfigFileNameV1);
  let record: Readonly<Record<string, unknown>>;
  try {
    record = (await import(pathToFileURL(configPath).href)) as Readonly<Record<string, unknown>>;
  } catch (error) {
    workspaceErrorV1(
      "project.app_config_unloadable",
      `could not load "${configPath}": ${error instanceof Error ? error.message : String(error)}`,
      "/app",
    );
  }
  const config = record[sillymakerAppConfigExportNameV1];
  if (config === undefined || config === null || typeof config !== "object") {
    workspaceErrorV1(
      "project.app_config_export_missing",
      `"${configPath}" does not export "${sillymakerAppConfigExportNameV1}"`,
      "/app",
    );
  }
  return config as SillymakerAppConfigV1;
}

/** Loads every registered application directory's own project declaration. */
export async function loadWorkspaceAppsV1(input: {
  readonly repositoryRoot: string;
  readonly workspace: SillymakerWorkspaceConfigV1;
}): Promise<readonly WorkspaceAppV1[]> {
  const apps = await Promise.all(
    input.workspace.appDirectories.map(async (directory) => {
      const config = await loadSillymakerAppConfigV1(resolve(input.repositoryRoot, directory));
      return Object.freeze({ directory, config });
    }),
  );
  return Object.freeze(apps);
}

/**
 * Builds the validated repository-level project view from the workspace
 * registry: each application project is loaded from its own directory and
 * anchored under it. This is the aggregation the root CLI, asset
 * verification, and the root Vite `--mode` dispatch consume.
 */
export async function loadWorkspaceProjectV1(input: {
  readonly repositoryRoot: string;
  readonly workspace: SillymakerWorkspaceConfigV1;
}): Promise<SillymakerProjectConfigV1> {
  const apps = await loadWorkspaceAppsV1(input);
  return defineSillymakerProjectV1({
    projectId: input.workspace.projectId,
    applications: apps.map((app) => deriveStoryApplicationV1(app.directory, app.config)),
  });
}

/**
 * Builds the single-application project view for the app-local CLI: the
 * application root is the working root, so every path stays app-relative.
 */
export async function loadStandaloneAppProjectV1(
  appRoot: string,
): Promise<SillymakerProjectConfigV1> {
  const config = await loadSillymakerAppConfigV1(appRoot);
  const application = deriveStoryApplicationV1(".", config);
  return defineSillymakerProjectV1({
    projectId: application.applicationId,
    applications: [application],
  });
}
