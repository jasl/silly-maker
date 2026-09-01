// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  admitProgramOpenUiDocumentV1,
  type ProgramOpenUiAdmissionBudgetsV1,
} from "./program-openui-document.ts";

const budgetsV1: ProgramOpenUiAdmissionBudgetsV1 = {
  maximumSourceBytes: 8_192,
  maximumTextBytes: 2_048,
  maximumNodes: 32,
  maximumDepth: 8,
};

function documentV1(source: string): unknown {
  return {
    schemaVersion: 1,
    documentId: "translation.intake",
    revision: 3,
    source,
  };
}

describe("SillyOS private OpenUI document admission", () => {
  it("projects a complete static OpenUI document into the closed SillyOS nodes", () => {
    const result = admitProgramOpenUiDocumentV1(
      documentV1(`root = Stack([heading, body, note, start], "spacious")
heading = Heading("Translate a document", 1)
body = Text("Choose a file and review the detected format.", "muted")
note = Callout("You can change the target language before starting.", "info")
start = ActionButton("start", "Start translation", "Translate the attached file.", "primary")`),
      budgetsV1,
    );

    expect(result).toEqual({
      kind: "admitted",
      document: {
        schemaVersion: 1,
        documentId: "translation.intake",
        revision: 3,
        root: {
          kind: "stack",
          gap: "spacious",
          children: [
            { kind: "heading", text: "Translate a document", level: 1 },
            {
              kind: "text",
              text: "Choose a file and review the detected format.",
              tone: "muted",
            },
            {
              kind: "callout",
              text: "You can change the target language before starting.",
              tone: "info",
            },
            {
              kind: "action",
              actionId: "start",
              label: "Start translation",
              prompt: "Translate the attached file.",
              variant: "primary",
            },
          ],
        },
      },
    });
  });

  it("keeps partial, unresolved, orphaned, and parser-invalid documents inert", () => {
    expect(admitProgramOpenUiDocumentV1(
      documentV1('root = Stack([Text("unfinished")'),
      budgetsV1,
    )).toMatchObject({ kind: "rejected", reason: "incomplete" });
    expect(admitProgramOpenUiDocumentV1(
      documentV1("root = Stack([missing])"),
      budgetsV1,
    )).toMatchObject({ kind: "rejected", reason: "unresolved_reference" });
    expect(admitProgramOpenUiDocumentV1(
      documentV1('root = Stack([Text("visible")])\nunused = Text("orphan")'),
      budgetsV1,
    )).toMatchObject({ kind: "rejected", reason: "orphaned_content" });
    expect(admitProgramOpenUiDocumentV1(
      documentV1('root = Stack([Unknown("value")])'),
      budgetsV1,
    )).toMatchObject({ kind: "rejected", reason: "parser_error" });
  });

  it("rejects reactive/runtime features instead of evaluating them in the renderer", () => {
    expect(admitProgramOpenUiDocumentV1(
      documentV1('root = Stack([Text($message)])\n$message = "dynamic"'),
      budgetsV1,
    )).toMatchObject({ kind: "rejected", reason: "dynamic_content" });
    expect(admitProgramOpenUiDocumentV1(
      documentV1('root = Stack([Text("static")])\nlookup = Query("files")'),
      budgetsV1,
    )).toMatchObject({ kind: "rejected", reason: "unsupported_feature" });
  });

  it("applies caller-owned source, text, node, and depth budgets", () => {
    expect(admitProgramOpenUiDocumentV1(
      documentV1('root = Stack([Text("too long")])'),
      { ...budgetsV1, maximumSourceBytes: 2 },
    )).toMatchObject({ kind: "rejected", reason: "budget_exceeded" });
    expect(admitProgramOpenUiDocumentV1(
      documentV1('root = Stack([Text("too long")])'),
      { ...budgetsV1, maximumTextBytes: 2 },
    )).toMatchObject({ kind: "rejected", reason: "budget_exceeded" });
    expect(admitProgramOpenUiDocumentV1(
      documentV1('root = Stack([Text("one"), Text("two")])'),
      { ...budgetsV1, maximumNodes: 2 },
    )).toMatchObject({ kind: "rejected", reason: "budget_exceeded" });
    expect(admitProgramOpenUiDocumentV1(
      documentV1('root = Stack([Stack([Text("nested")])])'),
      { ...budgetsV1, maximumDepth: 2 },
    )).toMatchObject({ kind: "rejected", reason: "budget_exceeded" });
  });

  it("rejects duplicate action identities", () => {
    expect(admitProgramOpenUiDocumentV1(
      documentV1(`root = Stack([
  ActionButton("next", "Next", "Continue."),
  ActionButton("next", "Again", "Continue again.")
])`),
      budgetsV1,
    )).toMatchObject({ kind: "rejected", reason: "invalid_node" });
  });
});
