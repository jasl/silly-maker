// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  admitProgramOpenUiDocumentV1,
  type ProgramOpenUiAdmissionBudgetsV1,
} from "./program-openui-document.ts";
import { ProgramOpenUiRendererV1 } from "./program-openui-renderer.tsx";

afterEach(cleanup);

const budgetsV1: ProgramOpenUiAdmissionBudgetsV1 = {
  maximumSourceBytes: 4_096,
  maximumTextBytes: 1_024,
  maximumNodes: 16,
  maximumDepth: 4,
};

function admittedDocumentV1() {
  const result = admitProgramOpenUiDocumentV1({
    schemaVersion: 1,
    documentId: "translation.ready",
    revision: 7,
    source: `root = Stack([
  Heading("Ready to translate", 1),
  Text("The same Process continues in Conversation mode.", "muted"),
  Callout("Review the detected format first.", "warning"),
  ActionButton("continue", "Continue", "Continue with the prepared translation.", "primary")
], "regular")`,
  }, budgetsV1);
  if (result.kind !== "admitted") throw new Error("fixture_not_admitted");
  return result.document;
}

describe("SillyOS private OpenUI renderer", () => {
  it("renders only the closed SillyOS catalog and emits a readable typed intent", () => {
    const onAction = vi.fn();
    render(<ProgramOpenUiRendererV1 document={admittedDocumentV1()} onAction={onAction} />);

    expect(screen.getByRole("heading", { level: 1, name: "Ready to translate" }))
      .toBeInTheDocument();
    expect(screen.getByText("The same Process continues in Conversation mode."))
      .toHaveAttribute("data-tone", "muted");
    expect(screen.getByText("Review the detected format first."))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onAction).toHaveBeenCalledWith({
      schemaVersion: 1,
      kind: "program_openui_action",
      documentId: "translation.ready",
      documentRevision: 7,
      actionId: "continue",
      prompt: "Continue with the prepared translation.",
    });
  });

  it("lets the Host disable actions while the shared Process is running", () => {
    render(
      <ProgramOpenUiRendererV1
        document={admittedDocumentV1()}
        disabled
        onAction={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });
});
