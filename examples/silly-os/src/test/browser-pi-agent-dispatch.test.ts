// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitBrowserPiAgentDispatchTextV1,
  admitBrowserPiBoundAgentDispatchTextV1,
  serializeBrowserPiAgentDispatchV1,
  serializeBrowserPiBoundAgentDispatchV1,
} from "../agent/browser-pi-agent-dispatch.ts";
import {
  creatorProgramRuntimeProfileV1,
  serializeBrowserPiCreatorAgentDispatchV1,
} from "../../programs/creator/runtime-profile/creator-runtime-profile.ts";
import {
  serializeBrowserPiTranslationAgentDispatchV1,
  translationProgramRuntimeProfileV1,
} from "../../programs/translation/runtime-profile/translation-runtime-profile.ts";

const creatorProgramPackageV1 = {
  programId: "sillyos.creator",
  packageVersion: "1.0.0",
} as const;
const translationProgramPackageV1 = {
  programId: "sillyos.translation",
  packageVersion: "1.0.0",
} as const;

const translationRequestV1 = {
  sourceLocale: "zh-CN",
  targetLocale: "en",
  documentPurpose: "A fictional game scene.",
  style: "Natural, concise dialogue.",
  glossary: [{
    entryId: "glossary.echo",
    source: "回声",
    target: "Echo",
    note: "Project codename.",
    locked: true,
    appliesToUnitIds: ["translation.unit.000001"],
  }],
  confirmedMeaningFacts: [],
  neighboringUnits: { preceding: null, following: null },
  units: [{
    unitId: "translation.unit.000001",
    order: 0,
    locator: "line/1",
    context: null,
    durationMilliseconds: 2_800,
    lineBreakPolicy: "forbidden",
    source: "回声欢迎回来，⟦SM:0⟧。",
    protectedSegments: [{ token: "⟦SM:0⟧", kind: "placeholder", source: "{name}" }],
  }],
} as const;

describe("SillyOS Browser Pi build-known Agent dispatch", () => {
  it("round-trips Program compatibility bindings with their fixed runtime profiles", () => {
    const creator = admitBrowserPiAgentDispatchTextV1(
      serializeBrowserPiCreatorAgentDispatchV1({
        programPackage: creatorProgramPackageV1,
        submit: {
          revision: 1,
          proposalId: "proposal.1",
          programId: creatorProgramPackageV1.programId,
          baseProgramRevision: 1,
          text: "Create a translation Program.",
        },
      }),
    );
    expect(creator).toMatchObject({
      kind: "admitted",
      value: {
        runtimeProfile: creatorProgramRuntimeProfileV1,
        programPackage: creatorProgramPackageV1,
        workspaceProgramId: creatorProgramPackageV1.programId,
      },
    });

    const translation = admitBrowserPiAgentDispatchTextV1(
      serializeBrowserPiTranslationAgentDispatchV1({
        programPackage: translationProgramPackageV1,
        programId: translationProgramPackageV1.programId,
        requestedOutputTokens: 4_608,
        instruction: "Translate the admitted batch faithfully.",
        request: translationRequestV1,
      }),
    );
    expect(translation).toEqual({
      kind: "admitted",
      value: {
        revision: 1,
        runtimeProfile: translationProgramRuntimeProfileV1,
        programPackage: translationProgramPackageV1,
        workspaceProgramId: translationProgramPackageV1.programId,
        payload: {
          kind: "batch",
          requestedOutputTokens: 4_608,
          instruction: "Translate the admitted batch faithfully.",
          request: translationRequestV1,
        },
      },
    });
  });

  it("keeps profile payloads opaque while rejecting malformed generic envelopes", () => {
    const validText = serializeBrowserPiTranslationAgentDispatchV1({
      programPackage: translationProgramPackageV1,
      programId: translationProgramPackageV1.programId,
      requestedOutputTokens: 4_608,
      instruction: "Translate the admitted batch faithfully.",
      request: translationRequestV1,
    });
    const valid = JSON.parse(validText) as Record<string, unknown>;
    expect(admitBrowserPiAgentDispatchTextV1(JSON.stringify({
      ...valid,
      runtimeProfile: "agent.unknown.v1",
    }))).toMatchObject({
      kind: "admitted",
      value: { runtimeProfile: "agent.unknown.v1" },
    });

    expect(admitBrowserPiAgentDispatchTextV1(
      serializeBrowserPiCreatorAgentDispatchV1({
        programPackage: creatorProgramPackageV1,
        submit: {
          revision: 1,
          proposalId: "proposal.1",
          programId: "program.created.by.creator",
          baseProgramRevision: 1,
          text: "Keep package and Workspace identities separate.",
        },
      }),
    )).toMatchObject({
      kind: "admitted",
      value: {
        programPackage: creatorProgramPackageV1,
        workspaceProgramId: "program.created.by.creator",
      },
    });

    expect(admitBrowserPiAgentDispatchTextV1(JSON.stringify({
      ...valid,
      workspaceProgramId: "invalid workspace identity",
    }))).toEqual({ kind: "rejected" });

    expect(admitBrowserPiAgentDispatchTextV1(
      serializeBrowserPiAgentDispatchV1({
        revision: 1,
        runtimeProfile: creatorProgramRuntimeProfileV1,
        programPackage: creatorProgramPackageV1,
        workspaceProgramId: creatorProgramPackageV1.programId,
        payload: { invalid: undefined },
      }),
    )).toMatchObject({ kind: "admitted", value: { payload: {} } });
  });

  it("binds one submit to the mounted implementation without changing Process identity", () => {
    const dispatchText = serializeBrowserPiCreatorAgentDispatchV1({
      programPackage: creatorProgramPackageV1,
      submit: {
        revision: 1,
        proposalId: "proposal.bound.1",
        programId: creatorProgramPackageV1.programId,
        baseProgramRevision: 1,
        text: "Keep the mounted implementation coherent.",
      },
    });
    const text = serializeBrowserPiBoundAgentDispatchV1({
      revision: 1,
      implementation: {
        programPackage: creatorProgramPackageV1,
        implementationId: "installation.current.1",
      },
      dispatchText,
    });
    expect(admitBrowserPiBoundAgentDispatchTextV1(text)).toMatchObject({
      kind: "admitted",
      value: {
        implementation: {
          programPackage: creatorProgramPackageV1,
          implementationId: "installation.current.1",
        },
        dispatchText,
      },
    });

    const envelope = JSON.parse(text) as Record<string, unknown>;
    expect(admitBrowserPiBoundAgentDispatchTextV1(JSON.stringify({
      ...envelope,
      dispatchText: "",
    }))).toEqual({ kind: "rejected" });
    expect(admitBrowserPiBoundAgentDispatchTextV1(JSON.stringify({
      ...envelope,
      implementation: {
        programPackage: creatorProgramPackageV1,
        implementationId: "invalid implementation id",
      },
    }))).toEqual({ kind: "rejected" });
  });
});
