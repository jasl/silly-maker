import { resolve } from "node:path";
import { defineConfig } from "vite";

import { createSillymakerAppViteConfigV1 } from "@sillymaker/tooling/vite";
import { loadWorkspaceAppsV1 } from "@sillymaker/tooling/project/workspace";

import { sillyMakerConfigV1 } from "./project.config.ts";

const repositoryRoot = import.meta.dirname;

/**
 * Repository test dispatch: `vite --mode <application-id>` selects a
 * registered application directory and delegates to the same Vite assembly
 * that application's own `vite.config.ts` uses. Application projects are
 * the source of truth; this file only maps an explicit ID to a directory for
 * Playwright suites that coordinate several applications.
 */
export default defineConfig(async ({ mode }) => {
  const applicationId = mode;
  const apps = await loadWorkspaceAppsV1({
    repositoryRoot,
    workspace: sillyMakerConfigV1,
  });
  const app = apps.find((candidate) => candidate.config.applicationId === applicationId);
  if (app === undefined) {
    const knownIds = apps.map((candidate) => candidate.config.applicationId);
    throw new TypeError(
      `unknown web application "${applicationId}"; applications: ${knownIds.join(", ")}`,
    );
  }
  return createSillymakerAppViteConfigV1({
    appRoot: resolve(repositoryRoot, app.directory),
    config: app.config,
  });
});
