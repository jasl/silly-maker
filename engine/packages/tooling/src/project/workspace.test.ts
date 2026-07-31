// SPDX-License-Identifier: MIT
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { AuthoringDiagnosticErrorV1 } from "@sillymaker/base";

import { loadWorkspaceAppsV1 } from "./workspace.ts";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function createAppV1(input: {
  readonly repositoryRoot: string;
  readonly directory: string;
  readonly applicationId: string;
}): Promise<void> {
  const appRoot = join(input.repositoryRoot, input.directory);
  await mkdir(appRoot, { recursive: true });
  await writeFile(
    join(appRoot, "sillymaker.config.ts"),
    `export const sillymakerAppConfigV1 = Object.freeze({\n` +
      `  applicationId: ${JSON.stringify(input.applicationId)},\n` +
      `  label: "Temporary application",\n` +
      `  storyEntry: { module: "src/story.ts", exportName: "storyEntryV1" },\n` +
      `  assetVerification: false,\n` +
      `  simulate: null,\n` +
      `  web: null,\n` +
      `});\n`,
    "utf8",
  );
}

function diagnosticsOf(error: unknown): readonly { readonly code: string }[] {
  if (error instanceof AuthoringDiagnosticErrorV1) return error.diagnostics;
  throw error;
}

describe("loadWorkspaceAppsV1", () => {
  it("rejects duplicate application IDs before root build dispatch", async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), "sillymaker-workspace-"));
    temporaryRoots.push(repositoryRoot);
    await createAppV1({ repositoryRoot, directory: "apps/alpha", applicationId: "same-app" });
    await createAppV1({ repositoryRoot, directory: "apps/beta", applicationId: "same-app" });

    let failure: unknown;
    try {
      await loadWorkspaceAppsV1({
        repositoryRoot,
        workspace: {
          projectId: "workspace-test",
          appDirectories: ["apps/alpha", "apps/beta"],
        },
      });
    } catch (error) {
      failure = error;
    }

    expect(diagnosticsOf(failure)).toMatchObject([{ code: "project.application_duplicate" }]);
  });
});
