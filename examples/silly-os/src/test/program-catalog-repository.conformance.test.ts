// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import {
  createMemoryProgramCatalogRepositoryBackingV1,
  createMemoryProgramCatalogRepositoryV1,
} from "../product/memory-program-catalog-repository.ts";
import type {
  ProgramCatalogApplyRevisionInputV1,
  ProgramCatalogContinuationV1,
  ProgramCatalogCreateInputV1,
  ProgramCatalogDecideInputV1,
  ProgramCatalogRepositoryV1,
} from "../product/program-catalog-repository.ts";
import { cloneProgramCatalogHeadV1 } from "../product/program-catalog-repository.ts";
import type { PreviewProgramV1 } from "../product/contracts.ts";
import type { ProgramWorkspaceSnapshotReceiptV1 } from "../workspace/contracts.ts";

function programV1(programId: string, revision: number): PreviewProgramV1 {
  return {
    programId,
    revision,
    kind: "translation",
    name: `Translator ${String(revision)}`,
    purpose: "Translate an admitted workspace with review.",
    requirements: [`Requirement ${String(revision)}`],
    suggestedCapabilities: [{
      capabilityId: "capability.translate",
      label: "Translate",
      description: "Translate workspace content.",
    }],
  };
}

function continuationV1(programId: string): ProgramCatalogContinuationV1 {
  return {
    revision: 1,
    programId,
    workspaceId: `workspace.${programId}`,
    volumeId: `volume.${programId}`,
    workspaceFormat: 1,
    programRevision: 1,
    repositoryRevision: 1,
  };
}

async function createProgramV1(repository: ProgramCatalogRepositoryV1, programId: string) {
  const continuation = continuationV1(programId);
  return await repository.create({
    commitId: `commit.${programId}.create`,
    program: programV1(programId, 1),
    proposalId: `proposal.${programId}.1`,
    continuation,
    reviewedHead: { checkpointId: `checkpoint.${programId}.1`, generation: 1 },
    updatedAt: 1,
  });
}

function acceptedReceiptV1(programId: string): ProgramWorkspaceSnapshotReceiptV1 {
  return {
    revision: 1,
    snapshotId: `snapshot.${programId}.1`,
    programId,
    workspaceId: `workspace.${programId}`,
    volumeId: `volume.${programId}`,
    workspaceFormat: 1,
    proposalId: `proposal.${programId}.1`,
    programRevision: 1,
    baseRepositoryRevision: 1,
    checkpointId: `checkpoint.${programId}.1`,
    generation: 1,
    fileCount: 2,
    archiveBytes: 128,
  };
}

describe("Memory Program catalog repository", () => {
  it("stores normalized heads, immutable revisions, decisions, and an independent continuation facet", async () => {
    const backing = createMemoryProgramCatalogRepositoryBackingV1();
    const first = createMemoryProgramCatalogRepositoryV1({ backing });
    const created = await createProgramV1(first, "program.alpha");
    expect(created).toMatchObject({
      kind: "committed",
      record: { head: { repositoryRevision: 1, proposal: { status: "pending" } } },
    });
    const decided = await first.decide({
      programId: "program.alpha",
      expectedRepositoryRevision: 1,
      expectedProposal: { proposalId: "proposal.program.alpha.1", programRevision: 1 },
      commitId: "commit.program.alpha.accept",
      continuation: continuationV1("program.alpha"),
      status: "accepted",
      snapshotReceipt: acceptedReceiptV1("program.alpha"),
      updatedAt: 2,
    });
    expect(decided).toMatchObject({
      kind: "committed",
      record: {
        head: {
          repositoryRevision: 2,
          proposal: { status: "accepted" },
          pendingReviewBinding: null,
        },
        latestDecision: {
          programId: "program.alpha",
          status: "accepted",
          snapshot: { snapshotId: "snapshot.program.alpha.1" },
        },
      },
    });
    const reopened = createMemoryProgramCatalogRepositoryV1({ backing });
    expect(await reopened.loadProgramRevision("program.alpha", 1)).toEqual(
      programV1("program.alpha", 1),
    );
    expect(await reopened.loadDecision("program.alpha", "proposal.program.alpha.1", 1))
      .toMatchObject({ programId: "program.alpha", status: "accepted" });
    expect(await reopened.loadContinuation("program.alpha")).toMatchObject({
      repositoryRevision: 2,
      programRevision: 1,
    });
  });

  it("keeps Programs independent and lists beyond the retired aggregate count", async () => {
    const repository = createMemoryProgramCatalogRepositoryV1();
    for (let index = 0; index < 70; index += 1) {
      expect((await createProgramV1(repository, `program.many.${String(index)}`)).kind).toBe(
        "committed",
      );
    }
    const summaries = [];
    let before = null;
    do {
      const page = await repository.listPrograms({ before, maximumBytes: 1024 });
      summaries.push(...page.summaries);
      before = page.nextCursor;
    } while (before !== null);
    expect(summaries).toHaveLength(70);
    expect((await repository.load("program.many.0"))?.head.repositoryRevision).toBe(1);
    expect((await repository.load("program.many.69"))?.head.repositoryRevision).toBe(1);
  });

  it("uses reverse binary tuple order for equal-timestamp Program pages", async () => {
    const repository = createMemoryProgramCatalogRepositoryV1();
    const programIds = [
      "program.tie.a",
      "program.tie.A",
      "program.tie.z",
      "program.tie.Z",
      "program.tie.0",
      "program.tie.9",
      "program.tie.10",
      "program.tie.2",
      "program.tie.aa",
      "program.tie.aA",
      "program.tie.Aa",
      "program.tie.AA",
    ];
    for (const programId of programIds) await createProgramV1(repository, programId);
    const actual: string[] = [];
    let before = null;
    let pages = 0;
    do {
      const page = await repository.listPrograms({ before, maximumBytes: 1_024 });
      pages += 1;
      actual.push(...page.summaries.map((summary) => summary.programId));
      before = page.nextCursor;
    } while (before !== null);
    const expected = [...programIds].sort((left, right) =>
      left === right ? 0 : left > right ? -1 : 1
    );
    expect(pages).toBeGreaterThan(1);
    expect(actual).toEqual(expected);
  });

  it("treats reordered but semantically identical mutation inputs as exact replay", async () => {
    const repository = createMemoryProgramCatalogRepositoryV1();
    const programId = "program.canonical";
    const createInput: ProgramCatalogCreateInputV1 = {
      commitId: "commit.canonical.create",
      program: programV1(programId, 1),
      proposalId: "proposal.canonical.1",
      continuation: continuationV1(programId),
      reviewedHead: { checkpointId: "checkpoint.canonical.1", generation: 1 },
      updatedAt: 1,
    };
    expect((await repository.create(createInput)).kind).toBe("committed");
    const reorderedCreate = {
      updatedAt: 1,
      reviewedHead: { generation: 1, checkpointId: "checkpoint.canonical.1" },
      continuation: {
        repositoryRevision: 1,
        programRevision: 1,
        workspaceFormat: 1,
        volumeId: `volume.${programId}`,
        workspaceId: `workspace.${programId}`,
        programId,
        revision: 1,
      },
      proposalId: "proposal.canonical.1",
      program: {
        suggestedCapabilities: [{
          description: "Translate workspace content.",
          label: "Translate",
          capabilityId: "capability.translate",
        }],
        requirements: ["Requirement 1"],
        purpose: "Translate an admitted workspace with review.",
        name: "Translator 1",
        kind: "translation",
        revision: 1,
        programId,
      },
      commitId: "commit.canonical.create",
    } as ProgramCatalogCreateInputV1;
    expect((await repository.create(reorderedCreate)).kind).toBe("unchanged");

    const applyInput: ProgramCatalogApplyRevisionInputV1 = {
      programId,
      expectedRepositoryRevision: 1,
      expectedProposal: { proposalId: "proposal.canonical.1", programRevision: 1 },
      commitId: "commit.canonical.apply",
      program: programV1(programId, 2),
      proposalId: "proposal.canonical.2",
      continuation: continuationV1(programId),
      reviewedHead: { checkpointId: "checkpoint.canonical.2", generation: 2 },
      updatedAt: 2,
    };
    expect((await repository.applyRevision(applyInput)).kind).toBe("committed");
    const reorderedApply = {
      updatedAt: 2,
      reviewedHead: { generation: 2, checkpointId: "checkpoint.canonical.2" },
      continuation: reorderedCreate.continuation,
      proposalId: "proposal.canonical.2",
      program: {
        ...reorderedCreate.program,
        revision: 2,
        name: "Translator 2",
        requirements: ["Requirement 2"],
      },
      commitId: "commit.canonical.apply",
      expectedProposal: { programRevision: 1, proposalId: "proposal.canonical.1" },
      expectedRepositoryRevision: 1,
      programId,
    } as ProgramCatalogApplyRevisionInputV1;
    expect((await repository.applyRevision(reorderedApply)).kind).toBe("unchanged");

    const continuation = await repository.loadContinuation(programId);
    if (continuation === null) throw new Error("missing continuation");
    const decideInput: ProgramCatalogDecideInputV1 = {
      programId,
      expectedRepositoryRevision: 2,
      expectedProposal: { proposalId: "proposal.canonical.2", programRevision: 2 },
      commitId: "commit.canonical.decide",
      continuation,
      status: "rejected",
      updatedAt: 3,
    };
    expect((await repository.decide(decideInput)).kind).toBe("committed");
    const reorderedDecision = {
      status: "rejected",
      updatedAt: 3,
      continuation: {
        repositoryRevision: continuation.repositoryRevision,
        programRevision: continuation.programRevision,
        workspaceFormat: 1,
        volumeId: continuation.volumeId,
        workspaceId: continuation.workspaceId,
        programId: continuation.programId,
        revision: 1,
      },
      commitId: "commit.canonical.decide",
      expectedProposal: { programRevision: 2, proposalId: "proposal.canonical.2" },
      expectedRepositoryRevision: 2,
      programId,
    } as ProgramCatalogDecideInputV1;
    expect((await repository.decide(reorderedDecision)).kind).toBe("unchanged");
  });

  it("rejects invalid read identities and impossible latest-accepted heads", async () => {
    const repository = createMemoryProgramCatalogRepositoryV1();
    await expect(repository.load("bad id")).rejects.toThrow(TypeError);
    await expect(repository.loadProgramRevision("program.read", 0)).rejects.toThrow(TypeError);
    await expect(repository.loadDecision("program.read", "bad id", 1)).rejects.toThrow(TypeError);
    await expect(repository.loadLatestAcceptedDecision("bad id")).rejects.toThrow(TypeError);
    await expect(repository.loadContinuation("bad id")).rejects.toThrow(TypeError);

    const created = await createProgramV1(repository, "program.head");
    if (created.kind !== "committed") throw new Error("expected created Program");
    expect(() =>
      cloneProgramCatalogHeadV1({
        ...created.record.head,
        latestAccepted: { proposalId: "proposal.other", programRevision: 1 },
      })
    ).toThrow(TypeError);
  });

  it("preserves every immutable revision without a revision-history cap", async () => {
    const repository = createMemoryProgramCatalogRepositoryV1();
    await createProgramV1(repository, "program.revisions");
    let continuation = continuationV1("program.revisions");
    for (let revision = 2; revision <= 40; revision += 1) {
      const current = await repository.load("program.revisions");
      if (current === null) throw new Error("missing Program");
      const applied = await repository.applyRevision({
        programId: "program.revisions",
        expectedRepositoryRevision: current.head.repositoryRevision,
        expectedProposal: current.head.proposal,
        commitId: `commit.program.revisions.${String(revision)}`,
        program: programV1("program.revisions", revision),
        proposalId: `proposal.program.revisions.${String(revision)}`,
        continuation,
        reviewedHead: {
          checkpointId: `checkpoint.program.revisions.${String(revision)}`,
          generation: revision,
        },
        updatedAt: revision,
      });
      expect(applied.kind).toBe("committed");
      continuation = (await repository.loadContinuation("program.revisions"))!;
    }
    expect(await repository.loadProgramRevision("program.revisions", 1)).toEqual(
      programV1("program.revisions", 1),
    );
    expect(await repository.loadProgramRevision("program.revisions", 40)).toEqual(
      programV1("program.revisions", 40),
    );
  });

  it("uses exact CAS and commit idempotency without changing a predecessor on conflict", async () => {
    const repository = createMemoryProgramCatalogRepositoryV1();
    const created = await createProgramV1(repository, "program.cas");
    expect((await createProgramV1(repository, "program.cas")).kind).toBe("unchanged");
    if (created.kind !== "committed") throw new Error("expected created Program");
    expect(
      await repository.create({
        commitId: "commit.program.cas.create.other",
        program: programV1("program.cas", 1),
        proposalId: "proposal.program.cas.1",
        continuation: continuationV1("program.cas"),
        reviewedHead: { checkpointId: "checkpoint.program.cas.1", generation: 1 },
        updatedAt: 1,
      }),
    ).toMatchObject({ kind: "conflict", current: created.record });
    const mutation = {
      programId: "program.cas",
      expectedRepositoryRevision: 1,
      expectedProposal: { proposalId: "proposal.program.cas.1", programRevision: 1 },
      commitId: "commit.program.cas.revise",
      program: programV1("program.cas", 2),
      proposalId: "proposal.program.cas.2",
      continuation: continuationV1("program.cas"),
      reviewedHead: { checkpointId: "checkpoint.program.cas.2", generation: 2 },
      updatedAt: 2,
    } as const;
    expect((await repository.applyRevision(mutation)).kind).toBe("committed");
    expect(await repository.applyRevision(mutation)).toMatchObject({
      kind: "unchanged",
      record: { head: { repositoryRevision: 2 } },
    });
    expect(
      await repository.applyRevision({
        ...mutation,
        program: { ...mutation.program, name: "Mismatch" },
      }),
    ).toMatchObject({
      kind: "conflict",
      current: { head: { repositoryRevision: 2, currentProgramRevision: 2 } },
    });
    const continuation2 = await repository.loadContinuation("program.cas");
    if (continuation2 === null) throw new Error("missing continuation");
    expect(
      await repository.decide({
        programId: "program.cas",
        expectedRepositoryRevision: 2,
        expectedProposal: { proposalId: "proposal.program.cas.2", programRevision: 2 },
        commitId: "commit.program.cas.reject",
        continuation: continuation2,
        status: "rejected",
        updatedAt: 3,
      }),
    ).toMatchObject({ kind: "committed", record: { head: { repositoryRevision: 3 } } });
    expect(await repository.applyRevision(mutation)).toMatchObject({
      kind: "unchanged",
      record: { head: { repositoryRevision: 3 } },
    });
    const predecessor = await repository.load("program.cas");
    expect(
      await repository.decide({
        programId: "program.cas",
        expectedRepositoryRevision: 1,
        expectedProposal: { proposalId: "proposal.program.cas.1", programRevision: 1 },
        commitId: "commit.program.cas.stale",
        continuation: continuationV1("program.cas"),
        status: "rejected",
        updatedAt: 4,
      }),
    ).toMatchObject({ kind: "conflict" });
    expect(await repository.load("program.cas")).toEqual(predecessor);
  });

  it("rejects apply and decision timestamps older than the current head", async () => {
    const repository = createMemoryProgramCatalogRepositoryV1();
    await repository.create({
      commitId: "commit.time.create",
      program: programV1("program.time", 1),
      proposalId: "proposal.program.time.1",
      continuation: continuationV1("program.time"),
      reviewedHead: { checkpointId: "checkpoint.program.time.1", generation: 1 },
      updatedAt: 10,
    });
    const predecessor = await repository.load("program.time");
    expect(
      await repository.applyRevision({
        programId: "program.time",
        expectedRepositoryRevision: 1,
        expectedProposal: { proposalId: "proposal.program.time.1", programRevision: 1 },
        commitId: "commit.time.apply.old",
        program: programV1("program.time", 2),
        proposalId: "proposal.program.time.2",
        continuation: continuationV1("program.time"),
        reviewedHead: { checkpointId: "checkpoint.program.time.2", generation: 2 },
        updatedAt: 9,
      }),
    ).toMatchObject({ kind: "conflict" });
    expect(
      await repository.decide({
        programId: "program.time",
        expectedRepositoryRevision: 1,
        expectedProposal: { proposalId: "proposal.program.time.1", programRevision: 1 },
        commitId: "commit.time.decide.old",
        continuation: continuationV1("program.time"),
        status: "rejected",
        updatedAt: 9,
      }),
    ).toMatchObject({ kind: "conflict" });
    expect(await repository.load("program.time")).toEqual(predecessor);
  });

  it("keeps decisions distinct when one proposal id spans Program revisions", async () => {
    const repository = createMemoryProgramCatalogRepositoryV1();
    const programId = "program.shared-proposal";
    const proposalId = `proposal.${programId}.1`;
    await createProgramV1(repository, programId);
    await repository.decide({
      programId,
      expectedRepositoryRevision: 1,
      expectedProposal: { proposalId, programRevision: 1 },
      commitId: "commit.shared.accept",
      continuation: continuationV1(programId),
      status: "accepted",
      snapshotReceipt: acceptedReceiptV1(programId),
      updatedAt: 2,
    });
    expect(await repository.loadLatestAcceptedDecision(programId)).toMatchObject({
      proposalId,
      programRevision: 1,
    });
    const continuation2 = await repository.loadContinuation(programId);
    if (continuation2 === null) throw new Error("missing continuation");
    await repository.applyRevision({
      programId,
      expectedRepositoryRevision: 2,
      expectedProposal: { proposalId, programRevision: 1 },
      commitId: "commit.shared.revise",
      program: programV1(programId, 2),
      proposalId,
      continuation: continuation2,
      reviewedHead: { checkpointId: "checkpoint.shared.2", generation: 2 },
      updatedAt: 3,
    });
    expect((await repository.load(programId))?.head).toMatchObject({
      latestAccepted: { proposalId, programRevision: 1 },
      pendingReviewBinding: { baseAcceptedProgramRevision: 1 },
    });
    const continuation3 = await repository.loadContinuation(programId);
    if (continuation3 === null) throw new Error("missing continuation");
    await repository.decide({
      programId,
      expectedRepositoryRevision: 3,
      expectedProposal: { proposalId, programRevision: 2 },
      commitId: "commit.shared.reject",
      continuation: continuation3,
      status: "rejected",
      updatedAt: 4,
    });
    expect(await repository.loadDecision(programId, proposalId, 1)).toMatchObject({
      status: "accepted",
      programRevision: 1,
    });
    expect(await repository.loadDecision(programId, proposalId, 2)).toMatchObject({
      status: "rejected",
      programRevision: 2,
    });
    expect(await repository.loadLatestAcceptedDecision(programId)).toMatchObject({
      status: "accepted",
      programRevision: 1,
    });
  });

  it("pages accepted lineage while rejected rows consume budget and advance the cursor", async () => {
    const repository = createMemoryProgramCatalogRepositoryV1();
    const programId = "program.lineage";
    await createProgramV1(repository, programId);
    await repository.decide({
      programId,
      expectedRepositoryRevision: 1,
      expectedProposal: { proposalId: `proposal.${programId}.1`, programRevision: 1 },
      commitId: "commit.lineage.accept",
      continuation: continuationV1(programId),
      status: "accepted",
      snapshotReceipt: acceptedReceiptV1(programId),
      updatedAt: 2,
    });
    for (let revision = 2; revision <= 40; revision += 1) {
      const current = await repository.load(programId);
      const continuation = await repository.loadContinuation(programId);
      if (current === null || continuation === null) throw new Error("missing Program");
      await repository.applyRevision({
        programId,
        expectedRepositoryRevision: current.head.repositoryRevision,
        expectedProposal: current.head.proposal,
        commitId: `commit.lineage.apply.${String(revision)}`,
        program: programV1(programId, revision),
        proposalId: `proposal.${programId}.${String(revision)}`,
        continuation,
        reviewedHead: {
          checkpointId: `checkpoint.lineage.${String(revision)}`,
          generation: revision,
        },
        updatedAt: revision * 2 - 1,
      });
      const pending = await repository.load(programId);
      const pendingContinuation = await repository.loadContinuation(programId);
      if (pending === null || pendingContinuation === null) {
        throw new Error("missing pending Program");
      }
      await repository.decide({
        programId,
        expectedRepositoryRevision: pending.head.repositoryRevision,
        expectedProposal: pending.head.proposal,
        commitId: `commit.lineage.reject.${String(revision)}`,
        continuation: pendingContinuation,
        status: "rejected",
        updatedAt: revision * 2,
      });
    }
    const accepted = [];
    let cursor = null;
    let pages = 0;
    let emptyProgressPage = false;
    do {
      const page = await repository.listAcceptedDecisions({
        programId,
        beforeProgramRevision: cursor,
        maximumBytes: 4_096,
      });
      pages += 1;
      if (page.decisions.length === 0 && page.nextCursor !== null) emptyProgressPage = true;
      accepted.push(...page.decisions);
      cursor = page.nextCursor;
    } while (cursor !== null && pages < 20);
    expect(pages).toBeGreaterThan(1);
    expect(emptyProgressPage).toBe(true);
    expect(accepted.map((decision) => decision.programRevision)).toEqual([1]);
  });

  it("rejects an accepted decision whose Workspace receipt is not the pending review binding", async () => {
    const repository = createMemoryProgramCatalogRepositoryV1();
    await createProgramV1(repository, "program.receipt");
    const predecessor = await repository.load("program.receipt");
    const receipt = acceptedReceiptV1("program.receipt");
    expect(
      await repository.decide({
        programId: "program.receipt",
        expectedRepositoryRevision: 1,
        expectedProposal: { proposalId: "proposal.program.receipt.1", programRevision: 1 },
        commitId: "commit.program.receipt.bad",
        continuation: continuationV1("program.receipt"),
        status: "accepted",
        snapshotReceipt: { ...receipt, checkpointId: "checkpoint.wrong" },
        updatedAt: 2,
      }),
    ).toMatchObject({ kind: "conflict" });
    expect(await repository.load("program.receipt")).toEqual(predecessor);
  });
});
