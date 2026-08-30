// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSillyOsCopyV1 } from "../content/copy.ts";
import type { PreviewProgramV1, ProgramProposalV1 } from "../product/contracts.ts";
import {
  type WorkpieceExecutionWorkspaceV1,
  WorkpiecePaneV1,
  type WorkpieceTabV1,
} from "../ui/workpiece-pane.tsx";

afterEach(cleanup);

const programV1: PreviewProgramV1 = {
  programId: "program.truthful-workpiece.7",
  revision: 7,
  kind: "translation",
  name: "Archive translation desk",
  purpose: "Translate the admitted archive without inventing project output.",
  requirements: [
    "Preserve every speaker label.",
    "Keep uncertain lines available for human review.",
  ],
  suggestedCapabilities: [
    {
      capabilityId: "capability.truthful-review",
      label: "Exact review queue",
      description: "Keep review decisions attached to the current Program revision.",
    },
  ],
};

const proposalV1: ProgramProposalV1 = {
  proposalId: "proposal.truthful-workpiece.7",
  programRevision: 7,
  status: "accepted",
};

const executionWorkspaceV1: WorkpieceExecutionWorkspaceV1 = {
  phase: "open",
  descriptor: {
    workspaceSessionId: "workspace-session.truthful-workpiece.7",
    generation: 7,
  },
  lastReceipt: {
    sequence: 3,
    agentRunId: "agent-run.truthful-workpiece.3",
    tool: "write",
    outcome: "succeeded",
    effect: "changed",
    resultingGeneration: 7,
    changedPaths: ["/workspace/output/chapter-01.txt"],
    diagnosticCode: null,
  },
  diagnostic: null,
};

function renderWorkpieceV1(activeTab: WorkpieceTabV1, locale: "en" | "zh-CN" = "en") {
  return render(
    <WorkpiecePaneV1
      copy={getSillyOsCopyV1(locale)}
      program={programV1}
      proposal={proposalV1}
      activeTab={activeTab}
      fullscreen={false}
      agentMode="pi_provider"
      executionWorkspace={executionWorkspaceV1}
      workspaceExport={{ phase: "idle" }}
      outputRef={createRef<HTMLElement>()}
      onExportWorkspace={vi.fn()}
      onTabChange={vi.fn()}
      onToggleFullscreen={vi.fn()}
      onClose={vi.fn()}
    />,
  );
}

describe("SillyOS truthful Workpiece presentation", () => {
  it("shows only Program and Workspace facts in the overview", () => {
    renderWorkpieceV1("view");

    expect(screen.getByRole("heading", { name: programV1.name })).toBeVisible();
    expect(screen.getByText(programV1.purpose)).toBeVisible();
    expect(screen.getByText("v7 · Program accepted")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "No visual workpiece has been published yet" }),
    ).toBeVisible();

    expect(screen.queryByLabelText("Project files")).toBeNull();
    expect(screen.queryByLabelText("Translation review queue")).toBeNull();
    expect(screen.queryByRole("progressbar", { name: "Project progress" })).toBeNull();
    expect(screen.queryByText("prologue.ks")).toBeNull();
    expect(screen.queryByText("station.ks")).toBeNull();
    expect(screen.queryByText("memory.ks")).toBeNull();
    expect(screen.queryByText("68%")).toBeNull();
    expect(screen.queryByText("program.ts")).toBeNull();
    expect(screen.queryByText(/@sillyos\/creator/u)).toBeNull();
    expect(screen.queryByRole("tab", { name: "Source" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Download preview manifest" })).toBeNull();
    expect(screen.getByRole("button", { name: "Download workspace ZIP" })).toBeVisible();
  });

  it("keeps proposed capability facts without claiming that they are active", () => {
    renderWorkpieceV1("capabilities");

    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.getByText("Exact review queue")).toBeVisible();
    expect(
      screen.getByText("Keep review decisions attached to the current Program revision."),
    ).toBeVisible();
    expect(screen.getByText("Proposed capability")).toBeVisible();
    expect(
      screen.getByText(
        "Program capability cards show the proposed composition. The Agent and tools card reflects the current runtime state.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        "The product-pinned Agent runtime uses your selected model. Provider credentials stay separate from the Workspace, and Workspace tools run only through the Sandbox bound to this Program.",
      ),
    ).toBeVisible();
  });
});
