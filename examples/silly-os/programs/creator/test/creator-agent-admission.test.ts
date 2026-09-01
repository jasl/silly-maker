// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitCreatorAgentSubmitTextV1,
  admitCreatorAgentSubmitV1,
  admitCreatorProgramRevisionCandidateV1,
  serializeCreatorAgentSubmitV1,
} from "../runtime/creator-agent-admission.ts";
import {
  creatorAgentTextMaximumCharactersV1,
  type CreatorAgentSubmitV1,
} from "../runtime/contracts.ts";

const submitV1: CreatorAgentSubmitV1 = {
  revision: 1,
  proposalId: "workspace.preview.1.proposal.1",
  programId: "program.workspace.preview.1",
  baseProgramRevision: 1,
  text: "Make the review step more explicit.",
};

describe("SillyOS Creator Agent product admission", () => {
  it("serializes the exact submit contract inside the public Agent Session text field", () => {
    const text = serializeCreatorAgentSubmitV1(submitV1);

    expect(text).toBe(JSON.stringify(submitV1));
    expect(admitCreatorAgentSubmitTextV1(text)).toEqual({
      kind: "admitted",
      value: submitV1,
    });
  });

  it("admits syntactically valid identifiers longer than the former arbitrary limit", () => {
    const longIdentifier = `program.${"segment".repeat(24)}`;
    expect(admitCreatorAgentSubmitV1({
      ...submitV1,
      proposalId: `proposal.${"segment".repeat(24)}`,
      programId: longIdentifier,
    })).toMatchObject({ kind: "admitted" });
  });

  it("rejects missing, extra, accessor, and invalid submit fields", () => {
    expect(admitCreatorAgentSubmitV1({ ...submitV1, extra: true })).toEqual({
      kind: "rejected",
      path: "/",
    });
    const { text: _missing, ...withoutText } = submitV1;
    expect(admitCreatorAgentSubmitV1(withoutText)).toEqual({
      kind: "rejected",
      path: "/",
    });
    expect(admitCreatorAgentSubmitV1({ ...submitV1, revision: 2 })).toEqual({
      kind: "rejected",
      path: "/revision",
    });
    expect(admitCreatorAgentSubmitV1({ ...submitV1, baseProgramRevision: 0 })).toEqual({
      kind: "rejected",
      path: "/baseProgramRevision",
    });
    expect(admitCreatorAgentSubmitV1({ ...submitV1, proposalId: "bad id" })).toEqual({
      kind: "rejected",
      path: "/proposalId",
    });
    expect(
      admitCreatorAgentSubmitV1({
        ...submitV1,
        text: "x".repeat(creatorAgentTextMaximumCharactersV1 + 1),
      }),
    ).toEqual({ kind: "rejected", path: "/text" });

    let getterCalls = 0;
    const accessor = { ...submitV1 } as Record<string, unknown>;
    Object.defineProperty(accessor, "text", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return submitV1.text;
      },
    });
    expect(admitCreatorAgentSubmitV1(accessor)).toEqual({
      kind: "rejected",
      path: "/",
    });
    expect(getterCalls).toBe(0);
  });

  it("rejects malformed and oversized public Agent Session submit text", () => {
    expect(admitCreatorAgentSubmitTextV1("not json")).toEqual({
      kind: "rejected",
      path: "/",
    });
    expect(admitCreatorAgentSubmitTextV1("x".repeat(8_193))).toEqual({
      kind: "rejected",
      path: "/",
    });
    expect(() =>
      serializeCreatorAgentSubmitV1({
        ...submitV1,
        text: "\u0000".repeat(creatorAgentTextMaximumCharactersV1),
      })
    ).toThrow("sillyos.creator_agent_submit.too_large");
  });

  it("admits only the exact complete Program revision candidate", () => {
    const candidate = {
      ...submitV1,
      requirement: "Require an explicit human review checkpoint.",
    };
    expect(admitCreatorProgramRevisionCandidateV1(candidate)).toEqual({
      kind: "admitted",
      value: candidate,
    });
    expect(admitCreatorProgramRevisionCandidateV1({ ...candidate, extra: true })).toEqual({
      kind: "rejected",
      path: "/",
    });
    expect(admitCreatorProgramRevisionCandidateV1({ ...candidate, requirement: "  " })).toEqual({
      kind: "rejected",
      path: "/requirement",
    });
  });
});
