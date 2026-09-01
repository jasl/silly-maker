// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { translationProgramRuntimeProfileImplementationV1 } from "../runtime-profile/translation-runtime-profile.ts";
import { translationProgramAgentAdapterV1 } from "../runtime-profile/translation-agent-adapter.ts";
import {
  translationProgramIdV1,
  translationProgramPackageSourceV1,
} from "../distribution/bundled-package-source.ts";
import { translationProgramRuntimeProfileV1 } from "../runtime-profile/translation-runtime-profile.ts";
import {
  browserWorkspaceQuickJsRuntimeAllocatorLimitBytesV1,
  browserWorkspaceQuickJsStackLimitBytesV1,
  browserWorkspaceQuickJsWasmLinearMemoryBytesV1,
  type BrowserWorkspaceQuickJsRequestV1,
} from "../../../src/workspace/browser-workspace-quickjs-protocol.ts";
import { browserWorkspaceSandboxArtifactBuildIdentityV1 } from "../../../src/workspace/browser-workspace-sandbox-build-identity.ts";
import { executeBrowserWorkspaceQuickJsV1 } from "../../../src/workspace-sandbox/browser-workspace-quickjs.worker.ts";
describe("SillyOS Translation Program fixed-harness contract", () => {
  it("keeps the package identity separate from its selected Host runtime profile", () => {
    expect(translationProgramIdV1).toBe("sillyos.translation");
    expect(translationProgramRuntimeProfileV1).toBe("agent.translation.v1");
    expect(translationProgramRuntimeProfileImplementationV1.runtimeProfile).toBe(
      translationProgramRuntimeProfileV1,
    );

    // The only Translation harness tool reads immutable resources from the
    // exact Process-pinned package. It grants no Process Workspace mutation.
    expect(translationProgramRuntimeProfileImplementationV1.harnessToolIds).toEqual([
      "program_resource",
    ]);
  });

  it("classifies malformed envelopes without repairing or publishing them", () => {
    const unit = {
      unitId: "translation.unit.000001",
      order: 0,
      locator: "line/1",
      context: null,
      durationMilliseconds: null,
      lineBreakPolicy: "forbidden",
      source: "Keep ⟦SM:1⟧ unchanged.",
      protectedSegments: [{ token: "⟦SM:1⟧", kind: "placeholder", source: "{name}" }],
    } as const;
    const dispatch = {
      revision: 1,
      runtimeProfile: translationProgramRuntimeProfileV1,
      programPackage: translationProgramPackageSourceV1.metadata.reference,
      workspaceProgramId: translationProgramIdV1,
      payload: {
        kind: "batch",
        requestedOutputTokens: 1_024,
        instruction: "Translate the admitted batch faithfully.",
        request: {
          sourceLocale: "en",
          targetLocale: "zh-CN",
          documentPurpose: "A fictional dialogue.",
          style: "Natural.",
          glossary: [],
          confirmedMeaningFacts: [],
          neighboringUnits: { preceding: null, following: null },
          units: [unit],
        },
      },
    } as const;
    const admitted = translationProgramRuntimeProfileImplementationV1.admitDispatch(dispatch);
    if (admitted.kind === "rejected") throw new Error("Translation dispatch was rejected");

    if (admitted.invocation.completion.kind !== "candidate") {
      throw new Error("Translation batch completion protocol was not selected");
    }
    expect(admitted.invocation.completion.admitCandidate({
      targets: JSON.stringify([{ unitId: unit.unitId, target: "保持 ⟦SM:1⟧ 不变。" }]),
      ambiguities: [],
    })).toEqual({ kind: "rejected", failure: "candidate_invalid" });
    expect(admitted.invocation.completion.admitCandidate({
      targets: [
        { unitId: unit.unitId, target: "保持 ⟦SM:1⟧ 不变。" },
        { unitId: unit.unitId, target: "保持 ⟦SM:1⟧ 不变。" },
      ],
      ambiguities: [],
    })).toEqual({ kind: "rejected", failure: "candidate_invalid" });
    expect(admitted.invocation.completion.admitCandidate({
      targets: [{ unitId: unit.unitId, target: "不要更改名字。" }],
      ambiguities: [],
    })).toEqual({ kind: "rejected", failure: "candidate_context_mismatch" });
  });

  it("projects typed-envelope rejection separately from content-constraint rejection", async () => {
    const run = {
      kind: "batch",
      agentRunId: "translation.run.classification",
      programPackage: translationProgramPackageSourceV1.metadata.reference,
      processId: "process.translation.classification",
      processAttemptGeneration: 1,
      workspaceCheckpointId: "checkpoint.translation.classification",
      workspaceGeneration: 1,
      programId: translationProgramIdV1,
      expectedWorksetRevision: 1,
      replacesCandidateId: null,
      requestedOutputTokens: 1_024,
      instruction: "Translate the admitted batch faithfully.",
      batch: {
        sourceLocale: "en",
        targetLocale: "zh-CN",
        documentPurpose: "A fictional dialogue.",
        style: "Natural.",
        glossary: [],
        confirmedMeaningFacts: [],
        neighboringUnits: { preceding: null, following: null },
        units: [{
          unitId: "translation.unit.000001",
          order: 0,
          locator: "line/1",
          context: null,
          durationMilliseconds: null,
          lineBreakPolicy: "forbidden",
          source: "Hello.",
          protectedSegments: [],
        }],
      },
    } as const;
    const prepared = await translationProgramAgentAdapterV1.prepareRun(run);
    if (prepared.kind === "rejected") throw new Error("Translation run was rejected");
    const malformedProjection = translationProgramAgentAdapterV1.projectStream({
      prepared: prepared.prepared,
      state: prepared.prepared.state,
      event: {
        kind: "output_data",
        sessionId: "session.translation.classification",
        runId: "remote.translation.classification",
        sequence: 1,
        value: {
          targets: JSON.stringify([{
            unitId: run.batch.units[0]!.unitId,
            target: "Hello.",
          }]),
          ambiguities: [],
        },
      },
    });
    expect(malformedProjection).toMatchObject({
      kind: "terminal",
      terminal: {
        outcome: "failed",
        value: { outcome: "failed", diagnosticCode: "candidate_structure_invalid" },
      },
      cancelRemote: true,
    });
    if (malformedProjection.kind !== "terminal") {
      throw new Error("Malformed candidate was not rejected");
    }
    expect(malformedProjection.terminal.value).not.toHaveProperty("candidate");

    const eventForV1 = (remoteCode: string) => ({
      kind: "run_failed" as const,
      sessionId: "session.translation.classification",
      runId: "remote.translation.classification",
      sequence: 1,
      diagnostic: {
        code: "agent_session.operation_failed" as const,
        path: `/remote/${remoteCode}`,
      },
    });

    expect(translationProgramAgentAdapterV1.projectStream({
      prepared: prepared.prepared,
      state: prepared.prepared.state,
      event: eventForV1("candidate_invalid"),
    })).toMatchObject({
      kind: "terminal",
      terminal: {
        outcome: "failed",
        value: { outcome: "failed", diagnosticCode: "candidate_structure_invalid" },
      },
    });
    expect(translationProgramAgentAdapterV1.projectStream({
      prepared: prepared.prepared,
      state: prepared.prepared.state,
      event: eventForV1("candidate_context_mismatch"),
    })).toMatchObject({
      kind: "terminal",
      terminal: {
        outcome: "failed",
        value: { outcome: "failed", diagnosticCode: "candidate_invalid" },
      },
    });
  });

  it("publishes a bounded text draft for completed-workset follow-up", async () => {
    const context = {
      worksetRevision: 9,
      title: "A completed translation",
      sourceFileName: "story.srt",
      documentFormat: "srt",
      sourceLocale: "en",
      targetLocale: "zh-CN",
      documentPurpose: "A fictional dialogue.",
      style: "Natural.",
      translatedUnitCount: 128,
      acceptedBatchCount: 4,
      recentConversation: [],
    } as const;
    const dispatch = {
      revision: 1,
      runtimeProfile: translationProgramRuntimeProfileV1,
      programPackage: translationProgramPackageSourceV1.metadata.reference,
      workspaceProgramId: translationProgramIdV1,
      payload: {
        kind: "follow_up",
        requestedOutputTokens: 1_024,
        instruction: "Summarize what was completed.",
        context,
      },
    } as const;
    const admitted = translationProgramRuntimeProfileImplementationV1.admitDispatch(dispatch);
    if (admitted.kind === "rejected") throw new Error("Follow-up dispatch was rejected");
    expect(admitted.invocation.completion).toEqual({ kind: "text" });
    expect(admitted.invocation.textOutput).toMatchObject({ kind: "publish" });
    expect(JSON.parse(admitted.invocation.userPrompt)).toEqual({
      schema: "sillyos.translation-follow-up.v1",
      instruction: "Summarize what was completed.",
      processSummary: context,
    });

    const run = {
      kind: "follow_up",
      agentRunId: "translation.run.follow-up",
      programPackage: translationProgramPackageSourceV1.metadata.reference,
      processId: "process.translation.follow-up",
      processAttemptGeneration: 2,
      workspaceCheckpointId: "checkpoint.translation.follow-up",
      workspaceGeneration: 1,
      programId: translationProgramIdV1,
      expectedWorksetRevision: context.worksetRevision,
      requestedOutputTokens: 1_024,
      instruction: "Summarize what was completed.",
      context,
    } as const;
    const prepared = await translationProgramAgentAdapterV1.prepareRun(run);
    if (prepared.kind === "rejected") throw new Error("Follow-up run was rejected");
    const active = translationProgramAgentAdapterV1.projectStream({
      prepared: prepared.prepared,
      state: prepared.prepared.state,
      event: {
        kind: "output_text_delta",
        sessionId: "session.translation.follow-up",
        runId: "remote.translation.follow-up",
        sequence: 1,
        text: "All 128 units were translated ",
      },
    });
    if (active.kind !== "active") throw new Error("Follow-up draft was not projected");
    expect(active.state).toMatchObject({
      kind: "follow_up",
      draft: "All 128 units were translated ",
    });
    const continued = translationProgramAgentAdapterV1.projectStream({
      prepared: prepared.prepared,
      state: active.state,
      event: {
        kind: "output_text_delta",
        sessionId: "session.translation.follow-up",
        runId: "remote.translation.follow-up",
        sequence: 2,
        text: "and accepted.",
      },
    });
    expect(continued).toMatchObject({
      kind: "active",
      state: { draft: "All 128 units were translated and accepted." },
    });
    if (continued.kind !== "active") throw new Error("Follow-up draft did not remain active");
    expect(translationProgramAgentAdapterV1.projectStream({
      prepared: prepared.prepared,
      state: continued.state,
      event: {
        kind: "run_completed",
        sessionId: "session.translation.follow-up",
        runId: "remote.translation.follow-up",
        sequence: 3,
      },
    })).toMatchObject({
      kind: "terminal",
      terminal: {
        outcome: "completed",
        value: {
          outcome: "completed",
          assistantReply: "All 128 units were translated and accepted.",
        },
      },
    });
  });

  it("executes the required regular-expression forms in the fixed QuickJS runtime", async () => {
    const source = `
      const values = {
        ordinary: "cat cat".match(/cat/g).length,
        unicode: /^\\p{L}+$/u.test("猫咪"),
        lookbehind: /(?<=ID:)\\d+/u.exec("ID:42")[0],
        named: /(?<speaker>[^:]+):(?<line>.+)/u.exec("Mochi:hello").groups.speaker,
      };
      print(JSON.stringify(values));
    `;
    const request: BrowserWorkspaceQuickJsRequestV1 = {
      revision: 1,
      kind: "quickjs_execute",
      requestId: 1,
      buildIdentity: browserWorkspaceSandboxArtifactBuildIdentityV1,
      source,
      argv: [],
      stdin: "",
      files: [{ path: "/workspace/script.js", text: source }],
    };

    const result = await executeBrowserWorkspaceQuickJsV1(request);

    expect(JSON.parse(result.response.stdout)).toEqual({
      ordinary: 2,
      unicode: true,
      lookbehind: "42",
      named: "Mochi",
    });
    expect(result.response.runtimeAllocatorLimitBytes).toBe(
      browserWorkspaceQuickJsRuntimeAllocatorLimitBytesV1,
    );
    expect(result.response.wasmLinearMemoryBytes).toBe(
      browserWorkspaceQuickJsWasmLinearMemoryBytesV1,
    );
    expect(result.response.stackLimitBytes).toBe(browserWorkspaceQuickJsStackLimitBytesV1);
  });
});
