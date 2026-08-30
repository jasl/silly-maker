// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitBrowserPiAgentDispatchTextV1,
  creatorProgramHarnessReferenceV1,
  serializeBrowserPiCreatorAgentDispatchV1,
  serializeBrowserPiTranslationAgentDispatchV1,
} from "../agent/browser-pi-agent-dispatch.ts";
import { translationProgramHarnessReferenceV1 } from "../product/translation/translation-batch-protocol.ts";

const translationRequestV1 = {
  sourceLocale: "zh-CN",
  targetLocale: "en",
  documentPurpose: "A fictional game scene.",
  style: "Natural, concise dialogue.",
  glossary: [{ source: "回声", target: "Echo", note: "Project codename." }],
  units: [{
    unitId: "translation.unit.000001",
    order: 0,
    locator: "line/1",
    context: null,
    durationMilliseconds: 2_800,
    source: "欢迎回来，⟦SM:0⟧。",
    protectedSegments: [{ token: "⟦SM:0⟧", kind: "placeholder", source: "{name}" }],
  }],
} as const;

describe("SillyOS Browser Pi build-known Agent dispatch", () => {
  it("round-trips the Creator and Translation harnesses through distinct exact envelopes", () => {
    const creator = admitBrowserPiAgentDispatchTextV1(
      serializeBrowserPiCreatorAgentDispatchV1({
        revision: 1,
        proposalId: "proposal.1",
        programId: "program.creator.1",
        baseProgramRevision: 1,
        text: "Create a translation Program.",
      }),
    );
    expect(creator).toMatchObject({
      kind: "admitted",
      value: {
        harnessReference: creatorProgramHarnessReferenceV1,
        programId: "program.creator.1",
      },
    });

    const translation = admitBrowserPiAgentDispatchTextV1(
      serializeBrowserPiTranslationAgentDispatchV1({
        programId: "program.translation.1",
        request: translationRequestV1,
      }),
    );
    expect(translation).toEqual({
      kind: "admitted",
      value: {
        revision: 1,
        harnessReference: translationProgramHarnessReferenceV1,
        programId: "program.translation.1",
        request: translationRequestV1,
      },
    });
  });

  it("rejects unknown harnesses, cross-Program Creator payloads, and malformed translation units", () => {
    const validText = serializeBrowserPiTranslationAgentDispatchV1({
      programId: "program.translation.1",
      request: translationRequestV1,
    });
    const valid = JSON.parse(validText) as Record<string, unknown>;
    expect(admitBrowserPiAgentDispatchTextV1(JSON.stringify({
      ...valid,
      harnessReference: "sillyos.harness.unknown@1",
    }))).toEqual({ kind: "rejected" });

    expect(admitBrowserPiAgentDispatchTextV1(JSON.stringify({
      revision: 1,
      harnessReference: creatorProgramHarnessReferenceV1,
      programId: "program.creator.1",
      submit: {
        revision: 1,
        proposalId: "proposal.1",
        programId: "program.other.1",
        baseProgramRevision: 1,
        text: "Mismatched Program.",
      },
    }))).toEqual({ kind: "rejected" });

    expect(admitBrowserPiAgentDispatchTextV1(JSON.stringify({
      ...valid,
      request: {
        ...translationRequestV1,
        units: [{ ...translationRequestV1.units[0], order: 1 }],
      },
    }))).toEqual({ kind: "rejected" });
  });
});
