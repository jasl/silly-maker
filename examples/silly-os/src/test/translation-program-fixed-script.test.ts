// SPDX-License-Identifier: MIT
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { browserWorkspaceSandboxArtifactBuildIdentityV1 } from "../workspace/browser-workspace-sandbox-build-identity.ts";
import {
  type BrowserWorkspaceQuickJsFileV1,
  type BrowserWorkspaceQuickJsRequestV1,
} from "../workspace/browser-workspace-quickjs-protocol.ts";
import { executeBrowserWorkspaceQuickJsV1 } from "../workspace-sandbox/browser-workspace-quickjs.worker.ts";

const scriptPathV1 = "/workspace/translation-project.js";
const scriptSourceV1 = readFileSync(
  new URL(
    "../../research/translation/program-candidate/scripts/translation-project.js",
    import.meta.url,
  ),
  "utf8",
);

const projectV1 = {
  schema: "sillyos.translation-project.research.v1",
  projectId: "project.echo",
  revision: 1,
  sourceLocale: "zh-CN",
  targetLocale: "en",
  documentPurpose: "A short fictional game scene.",
  style: "Natural restrained dialogue.",
  glossary: [
    { source: "回声", target: "Echo", note: "Project codename.", locked: true },
    { source: "雾灯站", target: "Foglight Station", note: null, locked: true },
    { source: "未命中", target: "Unused", note: null, locked: true },
  ],
  units: [
    {
      unitId: "unit.1",
      order: 0,
      locator: "line/1",
      context: "Echo is a project codename.",
      durationMilliseconds: null,
      source: "别让列车带走我们的回声。",
      target: null,
    },
    {
      unitId: "unit.2",
      order: 1,
      locator: "line/2",
      context: "The placeholder owns the light.",
      durationMilliseconds: 2_000,
      source: "在⟦SM:1⟧的灯熄灭前回来。",
      target: null,
    },
    {
      unitId: "unit.3",
      order: 2,
      locator: "line/3",
      context: null,
      durationMilliseconds: null,
      source: "雾灯站仍在等待。",
      target: null,
    },
  ],
  committedBatches: [],
} as const;

async function runScriptV1(
  argv: readonly string[],
  files: readonly BrowserWorkspaceQuickJsFileV1[],
) {
  const request: BrowserWorkspaceQuickJsRequestV1 = {
    revision: 1,
    kind: "quickjs_execute",
    requestId: 1,
    buildIdentity: browserWorkspaceSandboxArtifactBuildIdentityV1,
    source: scriptSourceV1,
    argv,
    stdin: "",
    files: [{ path: scriptPathV1, text: scriptSourceV1 }, ...files],
  };
  return await executeBrowserWorkspaceQuickJsV1(request);
}

function createdJsonV1(
  response: Awaited<ReturnType<typeof runScriptV1>>,
  path: string,
): unknown {
  const change = response.response.changes.find((candidate) => candidate.path === path);
  expect(change).toMatchObject({ kind: "created", before: null });
  if (change?.after === null || change?.after === undefined) {
    throw new Error(`Expected ${path} to be created`);
  }
  return JSON.parse(change.after);
}

describe("Translation Program fixed QuickJS script candidate", () => {
  it("prepares only pending units and glossary entries relevant to the batch", async () => {
    const response = await runScriptV1(
      ["prepare", "/workspace/project.json", "/workspace/batch.json", "2"],
      [{ path: "/workspace/project.json", text: JSON.stringify(projectV1) }],
    );
    expect(createdJsonV1(response, "/workspace/batch.json")).toMatchObject({
      schema: "sillyos.translation-batch.research.v1",
      projectId: "project.echo",
      projectRevision: 1,
      glossary: [{ source: "回声", target: "Echo", locked: true }],
      units: [
        { unitId: "unit.1", order: 0 },
        { unitId: "unit.2", order: 1 },
      ],
    });
  });

  it("validates, commits and verifies without letting the model rewrite source units", async () => {
    const prepared = await runScriptV1(
      ["prepare", "/workspace/project.json", "/workspace/batch.json", "2"],
      [{ path: "/workspace/project.json", text: JSON.stringify(projectV1) }],
    );
    const batch = createdJsonV1(prepared, "/workspace/batch.json");
    const candidate = {
      targets: [
        { unitId: "unit.1", target: "Don't let the train take our Echo away." },
        { unitId: "unit.2", target: "Return before ⟦SM:1⟧'s light goes out." },
      ],
      ambiguities: [],
    };
    const batchFile = { path: "/workspace/batch.json", text: JSON.stringify(batch) } as const;
    const candidateFile = {
      path: "/workspace/candidate.json",
      text: JSON.stringify(candidate),
    } as const;
    const validation = await runScriptV1(
      ["validate", batchFile.path, candidateFile.path, "/workspace/validation.json"],
      [batchFile, candidateFile],
    );
    expect(createdJsonV1(validation, "/workspace/validation.json")).toMatchObject({
      batchId: (batch as { batchId: string }).batchId,
      accepted: true,
      findings: [],
    });

    const committed = await runScriptV1(
      [
        "commit",
        "/workspace/project.json",
        batchFile.path,
        candidateFile.path,
        "/workspace/project.next.json",
      ],
      [
        { path: "/workspace/project.json", text: JSON.stringify(projectV1) },
        batchFile,
        candidateFile,
      ],
    );
    const next = createdJsonV1(committed, "/workspace/project.next.json") as {
      revision: number;
      units: readonly { source: string; target: string | null }[];
      committedBatches: readonly string[];
    };
    expect(next.revision).toBe(2);
    expect(next.units.map(({ source, target }) => ({ source, target }))).toEqual([
      {
        source: "别让列车带走我们的回声。",
        target: "Don't let the train take our Echo away.",
      },
      {
        source: "在⟦SM:1⟧的灯熄灭前回来。",
        target: "Return before ⟦SM:1⟧'s light goes out.",
      },
      { source: "雾灯站仍在等待。", target: null },
    ]);
    expect(next.committedBatches).toEqual([(batch as { batchId: string }).batchId]);

    const verification = await runScriptV1(
      ["verify", "/workspace/project.json", "/workspace/verification.json"],
      [{ path: "/workspace/project.json", text: JSON.stringify(next) }],
    );
    expect(createdJsonV1(verification, "/workspace/verification.json")).toMatchObject({
      projectRevision: 2,
      complete: false,
      findings: [{ code: "target_missing", unitId: "unit.3" }],
    });

    const secondPrepared = await runScriptV1(
      ["prepare", "/workspace/project.json", "/workspace/batch.json", "2"],
      [{ path: "/workspace/project.json", text: JSON.stringify(next) }],
    );
    const secondBatch = createdJsonV1(secondPrepared, "/workspace/batch.json");
    expect(secondBatch).toMatchObject({
      projectRevision: 2,
      glossary: [{ source: "雾灯站", target: "Foglight Station", locked: true }],
      units: [{ unitId: "unit.3", order: 2, source: "雾灯站仍在等待。" }],
    });
    const secondCandidate = {
      targets: [{ unitId: "unit.3", target: "Foglight Station is still waiting." }],
      ambiguities: [],
    };
    const secondCommit = await runScriptV1(
      [
        "commit",
        "/workspace/project.json",
        "/workspace/batch.json",
        "/workspace/candidate.json",
        "/workspace/project.next.json",
      ],
      [
        { path: "/workspace/project.json", text: JSON.stringify(next) },
        { path: "/workspace/batch.json", text: JSON.stringify(secondBatch) },
        { path: "/workspace/candidate.json", text: JSON.stringify(secondCandidate) },
      ],
    );
    const completeProject = createdJsonV1(
      secondCommit,
      "/workspace/project.next.json",
    ) as { revision: number };
    expect(completeProject.revision).toBe(3);

    const finalVerification = await runScriptV1(
      ["verify", "/workspace/project.json", "/workspace/verification.json"],
      [{ path: "/workspace/project.json", text: JSON.stringify(completeProject) }],
    );
    expect(createdJsonV1(finalVerification, "/workspace/verification.json")).toMatchObject({
      projectRevision: 3,
      complete: true,
      findings: [],
    });
  });

  it("rejects a same-revision batch whose source or constraints do not match the project", async () => {
    const prepared = await runScriptV1(
      ["prepare", "/workspace/project.json", "/workspace/batch.json", "2"],
      [{ path: "/workspace/project.json", text: JSON.stringify(projectV1) }],
    );
    const batch = createdJsonV1(prepared, "/workspace/batch.json") as {
      glossary: unknown[];
      units: Record<string, unknown>[];
    };
    const mismatchedBatch = {
      ...batch,
      glossary: [],
      units: [
        { ...batch.units[0], source: "猫来了。" },
        batch.units[1],
      ],
    };
    const mismatchedCandidate = {
      targets: [
        { unitId: "unit.1", target: "The cat came." },
        { unitId: "unit.2", target: "Return before ⟦SM:1⟧'s light goes out." },
      ],
      ambiguities: [],
    };

    await expect(runScriptV1(
      [
        "commit",
        "/workspace/project.json",
        "/workspace/batch.json",
        "/workspace/candidate.json",
        "/workspace/project.next.json",
      ],
      [
        { path: "/workspace/project.json", text: JSON.stringify(projectV1) },
        { path: "/workspace/batch.json", text: JSON.stringify(mismatchedBatch) },
        { path: "/workspace/candidate.json", text: JSON.stringify(mismatchedCandidate) },
      ],
    )).rejects.toMatchObject({ code: "execution_failed" });
  });

  it("rejects protected-token and locked-glossary violations before commit", async () => {
    const prepared = await runScriptV1(
      ["prepare", "/workspace/project.json", "/workspace/batch.json", "2"],
      [{ path: "/workspace/project.json", text: JSON.stringify(projectV1) }],
    );
    const batch = createdJsonV1(prepared, "/workspace/batch.json");
    const invalidTokenCandidate = {
      targets: [
        { unitId: "unit.1", target: "Don't let the train take our Echo away." },
        { unitId: "unit.2", target: "Return before the light goes out." },
      ],
      ambiguities: [],
    };
    await expect(runScriptV1(
      ["validate", "/workspace/batch.json", "/workspace/candidate.json", "/workspace/out.json"],
      [
        { path: "/workspace/batch.json", text: JSON.stringify(batch) },
        { path: "/workspace/candidate.json", text: JSON.stringify(invalidTokenCandidate) },
      ],
    )).rejects.toMatchObject({ code: "execution_failed" });

    const missingGlossaryCandidate = {
      targets: [
        { unitId: "unit.1", target: "Don't let the train take our signal away." },
        { unitId: "unit.2", target: "Return before ⟦SM:1⟧'s light goes out." },
      ],
      ambiguities: [],
    };
    const validation = await runScriptV1(
      ["validate", "/workspace/batch.json", "/workspace/candidate.json", "/workspace/out.json"],
      [
        { path: "/workspace/batch.json", text: JSON.stringify(batch) },
        { path: "/workspace/candidate.json", text: JSON.stringify(missingGlossaryCandidate) },
      ],
    );
    expect(createdJsonV1(validation, "/workspace/out.json")).toMatchObject({
      accepted: false,
      findings: [{
        code: "locked_glossary_missing",
        unitId: "unit.1",
        expectedTarget: "Echo",
      }],
    });
    await expect(runScriptV1(
      [
        "commit",
        "/workspace/project.json",
        "/workspace/batch.json",
        "/workspace/candidate.json",
        "/workspace/next.json",
      ],
      [
        { path: "/workspace/project.json", text: JSON.stringify(projectV1) },
        { path: "/workspace/batch.json", text: JSON.stringify(batch) },
        { path: "/workspace/candidate.json", text: JSON.stringify(missingGlossaryCandidate) },
      ],
    )).rejects.toMatchObject({ code: "execution_failed" });
  });
});
