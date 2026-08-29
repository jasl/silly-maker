// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createSemanticStageState, emptyNarrativeHistory } from "@sillymaker/base/story";

import {
  compileVnInteractionDocumentV1,
  createVnInteractionRuntimeV1,
  type VnNarrativeCoreStateV1,
} from "./interaction-document.ts";

type ProbeStateV1 = VnNarrativeCoreStateV1 & {
  readonly route: "left" | "right" | null;
};

const initialStateV1: ProbeStateV1 = {
  phase: "idle",
  cursor: null,
  pending: null,
  sequence: 0,
  route: null,
  history: emptyNarrativeHistory,
};

const emptyStageV1 = () =>
  createSemanticStageState({ stageId: "stage.probe.main", layerIds: ["layer.probe"] });

describe("VN interaction document", () => {
  it("keeps product effects and predicates outside the genre runtime", () => {
    const compiled = compileVnInteractionDocumentV1({
      doc: {
        prefix: "probe",
        docId: "doc.probe",
        entry: "choose",
        blocks: [
          {
            kind: "choice",
            name: "choose",
            prompt: "Choose",
            options: [
              { name: "left", text: "Left", effect: { route: "left" as const }, next: "gate" },
              {
                name: "right",
                text: "Right",
                effect: { route: "right" as const },
                next: "gate",
              },
            ],
          },
          {
            kind: "branch",
            name: "gate",
            cases: [
              { when: { route: "left" as const }, next: "left" },
              { next: "right" },
            ],
          },
          { kind: "say", name: "left", speaker: null, text: "Left route", next: "end" },
          { kind: "say", name: "right", speaker: null, text: "Right route", next: "end" },
          { kind: "end", name: "end" },
        ],
      },
    });
    const runtime = createVnInteractionRuntimeV1<
      ProbeStateV1,
      { readonly route: "left" | "right" },
      { readonly route: "left" | "right" }
    >({
      ...compiled,
      errorPrefix: "probe",
      matchesPredicate: (state, predicate) => state.route === predicate.route,
      applyChoiceEffect: (state, effect) => ({ ...state, route: effect.route }),
    });

    const atChoice = runtime.runUntilInteraction(runtime.atBegin(initialStateV1), emptyStageV1());
    expect(atChoice.narrative.pending?.kind).toBe("choice");
    const choice = runtime.choiceOptionsFor("interaction.probe.choose")[0];
    expect(choice).toBeDefined();
    const afterChoice = runtime.afterResolution(atChoice.narrative, {
      kind: "choose",
      choiceId: choice!.choiceId,
    });
    const atLine = runtime.runUntilInteraction(afterChoice, emptyStageV1());

    expect(atLine.narrative.route).toBe("left");
    expect(atLine.narrative.pending).toMatchObject({
      kind: "say",
      textId: "text.probe.line.left",
    });
    expect(afterChoice.history.entries).toHaveLength(1);
  });

  it("does not impose an arbitrary pure-node count ceiling", () => {
    const branchCount = 100;
    const compiled = compileVnInteractionDocumentV1<never, never>({
      doc: {
        prefix: "long",
        docId: "doc.long",
        entry: "branch-0",
        blocks: [
          ...Array.from({ length: branchCount }, (_, index) => ({
            kind: "branch" as const,
            name: `branch-${String(index)}`,
            cases: [{ next: index + 1 === branchCount ? "line" : `branch-${String(index + 1)}` }],
          })),
          { kind: "say", name: "line", speaker: null, text: "Reached", next: "end" },
          { kind: "end", name: "end" },
        ],
      },
    });
    const runtime = createVnInteractionRuntimeV1<ProbeStateV1, never, never>({
      ...compiled,
      errorPrefix: "long",
      matchesPredicate: () => false,
      applyChoiceEffect: (state) => state,
    });

    const result = runtime.runUntilInteraction(runtime.atBegin(initialStateV1), emptyStageV1());
    expect(result.narrative.pending).toMatchObject({ kind: "say" });
  });

  it("rejects duplicate interaction definition identities during compilation", () => {
    expect(() =>
      compileVnInteractionDocumentV1<never, never>({
        doc: {
          prefix: "duplicate",
          docId: "doc.duplicate",
          entry: "first",
          blocks: [
            {
              kind: "choice",
              name: "first",
              definitionId: "interaction.duplicate.shared",
              prompt: "First",
              options: [{ name: "next", text: "Next", next: "second" }],
            },
            {
              kind: "choice",
              name: "second",
              definitionId: "interaction.duplicate.shared",
              prompt: "Second",
              options: [{ name: "end", text: "End", next: "end" }],
            },
            { kind: "end", name: "end" },
          ],
        },
      })
    ).toThrowError(
      "vn.interaction_doc_invalid:doc.duplicate/second:duplicate_definition_id:interaction.duplicate.shared",
    );
  });

  it("rejects a real pure-node cycle", () => {
    const compiled = compileVnInteractionDocumentV1<never, never>({
      doc: {
        prefix: "cycle",
        docId: "doc.cycle",
        entry: "a",
        blocks: [
          { kind: "branch", name: "a", cases: [{ next: "b" }] },
          { kind: "branch", name: "b", cases: [{ next: "a" }] },
        ],
      },
    });
    const runtime = createVnInteractionRuntimeV1<ProbeStateV1, never, never>({
      ...compiled,
      errorPrefix: "cycle",
      matchesPredicate: () => false,
      applyChoiceEffect: (state) => state,
    });

    expect(() => runtime.runUntilInteraction(runtime.atBegin(initialStateV1), emptyStageV1()))
      .toThrowError("cycle.narrative_pure_cycle:node.cycle.a");
  });

  it("also detects a hold whose entry predicate reroutes in a pure cycle", () => {
    const compiled = compileVnInteractionDocumentV1<never, { readonly ready: true }>({
      doc: {
        prefix: "hold-cycle",
        docId: "doc.hold-cycle",
        entry: "wait",
        blocks: [{
          kind: "hold",
          name: "wait",
          durationMs: 100,
          when: [{ when: { ready: true }, next: "wait" }],
          next: "end",
        }, { kind: "end", name: "end" }],
      },
    });
    const runtime = createVnInteractionRuntimeV1<
      ProbeStateV1,
      never,
      { readonly ready: true }
    >({
      ...compiled,
      errorPrefix: "hold-cycle",
      matchesPredicate: () => true,
      applyChoiceEffect: (state) => state,
    });

    expect(() => runtime.runUntilInteraction(runtime.atBegin(initialStateV1), emptyStageV1()))
      .toThrowError("hold-cycle.narrative_pure_cycle:node.hold-cycle.wait");
  });

  it("keeps compiler-generated hold stage nodes out of the author target namespace", () => {
    expect(() =>
      compileVnInteractionDocumentV1<never, never>({
        doc: {
          prefix: "hold-stage",
          docId: "doc.hold-stage",
          entry: "wait",
          blocks: [{
            kind: "hold",
            name: "wait",
            durationMs: 100,
            ops: [{
              setAppearance: {
                layerId: "layer.probe",
                tag: "tag.probe",
                appearance: { pose: "ready" },
              },
            }],
            next: "wait-stage",
          }],
        },
      })
    ).toThrowError(
      "vn.interaction_doc_invalid:doc.hold-stage/wait:next_unresolved:wait-stage",
    );
  });
});
