// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import type { WorkspaceExecutionDescriptorV1 } from "../workspace/contracts.ts";
import {
  admitQualificationRequestV1,
  anchorHeadHashV1,
  assertQualificationCorpusBytesV1,
  containsPayloadV1,
  failureResponseV1,
  qualificationCorpusBytesV1,
  qualificationCorpusFileBytesV1,
  qualificationCorpusFileCountV1,
  qualificationCorpusTotalBytesV1,
  qualificationCreateFinalGenerationV1,
  QualificationFailureV1,
  QualificationIoTrackerV1,
  type QualificationSuccessResponseV1,
  qualificationTextV1,
} from "./browser-workspace-sandbox-qualification.worker.ts";

const createDescriptorV1: WorkspaceExecutionDescriptorV1 = {
  revision: 1,
  programId: "program.sandbox.qualification",
  workspaceId: "workspace.sandbox.qualification",
  workspaceSessionId: "workspace-session.sandbox.create",
  generation: 1,
};
const verifyDescriptorV1: WorkspaceExecutionDescriptorV1 = {
  ...createDescriptorV1,
  workspaceSessionId: "workspace-session.sandbox.verify",
  generation: qualificationCreateFinalGenerationV1,
};

describe("SillyOS independent-origin Workspace qualification Worker", () => {
  it("exact-admits only fixed create and read-only verify requests", () => {
    const create = {
      revision: 1,
      kind: "workspace_sandbox_qualification_request",
      requestId: 1,
      mode: "create",
      descriptor: createDescriptorV1,
    } as const;
    const verify = {
      ...create,
      requestId: 2,
      mode: "verify",
      descriptor: verifyDescriptorV1,
    } as const;
    expect(admitQualificationRequestV1(create)).toEqual(create);
    expect(admitQualificationRequestV1(verify)).toEqual(verify);
    expect(admitQualificationRequestV1({ ...create, extra: true })).toBeNull();
    expect(admitQualificationRequestV1({
      ...create,
      descriptor: { ...createDescriptorV1, generation: 2 },
    })).toBeNull();
    expect(admitQualificationRequestV1({
      ...verify,
      descriptor: { ...verifyDescriptorV1, generation: 81 },
    })).toBeNull();
    expect(admitQualificationRequestV1(Object.defineProperty(
      { ...create },
      "mode",
      { enumerable: true, get: () => "create" },
    ))).toBeNull();
    expect(admitQualificationRequestV1({
      ...create,
      [Symbol("untrusted")]: true,
    })).toBeNull();
  });

  it("uses exactly eighty bounded files for a deterministic twenty MiB corpus", () => {
    expect(qualificationCorpusFileBytesV1).toBe(256 * 1_024);
    expect(qualificationCorpusFileCountV1).toBe(80);
    expect(qualificationCorpusTotalBytesV1).toBe(20 * 1_024 * 1_024);
    expect(qualificationCreateFinalGenerationV1).toBe(82);
    const first = qualificationCorpusBytesV1(0);
    const repeated = qualificationCorpusBytesV1(0);
    expect(first).toEqual(repeated);
    expect(() => assertQualificationCorpusBytesV1(0, first)).not.toThrow();
    first[qualificationCorpusFileBytesV1 - 1] = (first.at(-1) ?? 0) ^ 1;
    expect(() => assertQualificationCorpusBytesV1(0, first)).toThrow("unexpected bytes");
  });

  it("returns only bounded scalar metadata and stable cold-open head identity", async () => {
    const tracker = new QualificationIoTrackerV1();
    tracker.observeWritePayload(qualificationCorpusFileBytesV1);
    tracker.observeReadPayload(qualificationCorpusFileBytesV1);
    tracker.observeHashInput(qualificationCorpusFileBytesV1);
    tracker.observeReceiptQueue(16);
    const corpusHash = "a".repeat(64);
    const createHash = await anchorHeadHashV1({
      descriptor: createDescriptorV1,
      generation: qualificationCreateFinalGenerationV1,
      corpusHash,
    });
    const verifyHash = await anchorHeadHashV1({
      descriptor: verifyDescriptorV1,
      generation: qualificationCreateFinalGenerationV1,
      corpusHash,
    });
    const response: QualificationSuccessResponseV1 = {
      revision: 1,
      kind: "workspace_sandbox_qualification_response",
      requestId: 3,
      ok: true,
      response: {
        mode: "verify",
        anchor: {
          programId: verifyDescriptorV1.programId,
          workspaceId: verifyDescriptorV1.workspaceId,
        },
        head: { generation: qualificationCreateFinalGenerationV1, hash: verifyHash },
        initialGeneration: qualificationCreateFinalGenerationV1,
        fileCount: qualificationCorpusFileCountV1,
        totalBytes: qualificationCorpusTotalBytesV1,
        corpusHash,
        ioMaximums: tracker.snapshot(),
      },
    };
    expect(createHash).toBe(verifyHash);
    expect(createHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(response.response.ioMaximums).toEqual({
      writePayloadBytes: qualificationCorpusFileBytesV1,
      readPayloadBytes: qualificationCorpusFileBytesV1,
      hashInputBytes: qualificationCorpusFileBytesV1,
      receiptQueueDepth: 16,
    });
    expect(containsPayloadV1(response)).toBe(false);
    expect(JSON.stringify(response)).not.toContain(qualificationTextV1.trim());
  });

  it("maps failures to a closed code set without exposing exception text", () => {
    expect(failureResponseV1(4, new QualificationFailureV1("timeout", "secret"))).toEqual({
      revision: 1,
      kind: "workspace_sandbox_qualification_response",
      requestId: 4,
      ok: false,
      code: "timeout",
    });
    expect(failureResponseV1(5, new Error("provider secret"))).toEqual({
      revision: 1,
      kind: "workspace_sandbox_qualification_response",
      requestId: 5,
      ok: false,
      code: "execution_failed",
    });
  });
});
