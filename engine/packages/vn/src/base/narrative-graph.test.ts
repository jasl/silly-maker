// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { VnNarrativeNodeV1 } from "./interaction-document.ts";
import { projectVnNarrativeGraphV1 } from "./narrative-graph.ts";

type PredicateV1 = { readonly ready: true };

describe("projectVnNarrativeGraphV1", () => {
  it("owns VN control-flow projection while products add source and asset metadata", () => {
    const nodes = [
      {
        kind: "say",
        nodeId: "node.probe.say",
        definitionId: "interaction.probe.say",
        seenRevision: 1,
        speakerTextId: "text.probe.speaker",
        textId: "text.probe.line",
        next: "node.probe.choice",
      },
      {
        kind: "choice",
        nodeId: "node.probe.choice",
        definitionId: "interaction.probe.choice",
        seenRevision: 1,
        promptTextId: "text.probe.prompt",
        options: [
          {
            choiceId: "choice.probe.continue",
            textId: "text.probe.continue",
            effect: null,
            next: "node.probe.branch",
          },
        ],
      },
      {
        kind: "branch",
        nodeId: "node.probe.branch",
        cases: [{ predicate: null, next: "node.probe.stage" }],
        successors: ["node.probe.stage"],
      },
      {
        kind: "stage",
        nodeId: "node.probe.stage",
        mutations: () => [],
        mayShow: ["content.probe.room"],
        dispatches: [],
        next: "node.probe.hold",
      },
      {
        kind: "hold",
        nodeId: "node.probe.hold",
        definitionId: "interaction.probe.hold",
        seenRevision: 1,
        durationMs: 1_000,
        skippable: false,
        when: [{ predicate: { ready: true }, next: "node.probe.rerouted" }],
        next: "node.probe.expired",
      },
      { kind: "end", nodeId: "node.probe.rerouted" },
      { kind: "end", nodeId: "node.probe.expired" },
    ] satisfies readonly VnNarrativeNodeV1<never, PredicateV1>[];

    const graph = projectVnNarrativeGraphV1({
      compiled: { entryNodeId: "node.probe.say", nodes },
      sourceForNode: (node) => `story/probe.ts#${node.nodeId}`,
      assetIdsForNode: (node) => {
        if (node.kind === "stage") return ["asset.probe.room"];
        if (node.kind === "say" || node.kind === "choice" || node.kind === "hold") {
          return [`asset.probe.${node.kind}`];
        }
        return [];
      },
    });

    expect(graph.entryNodeId).toBe("node.probe.say");
    expect(graph.nodes[0]).toMatchObject({
      nodeId: "node.probe.say",
      successors: ["node.probe.choice"],
      dependencies: {
        textIds: ["text.probe.speaker", "text.probe.line"],
        assetIds: ["asset.probe.say"],
      },
    });
    expect(graph.nodes[1]).toMatchObject({
      nodeId: "node.probe.choice",
      successors: ["node.probe.branch"],
      dependencies: {
        textIds: ["text.probe.prompt", "text.probe.continue"],
        assetIds: ["asset.probe.choice"],
      },
    });
    expect(graph.nodes[2]).toMatchObject({
      nodeId: "node.probe.branch",
      kind: "pure",
      successors: ["node.probe.stage"],
    });
    expect(graph.nodes[3]).toMatchObject({
      nodeId: "node.probe.stage",
      source: "story/probe.ts#node.probe.stage",
      dependencies: {
        assetIds: ["asset.probe.room"],
        stageContentIds: ["content.probe.room"],
      },
    });
    expect(graph.nodes[4]).toMatchObject({
      nodeId: "node.probe.hold",
      successors: ["node.probe.rerouted", "node.probe.expired"],
      dependencies: { assetIds: ["asset.probe.hold"] },
    });
  });
});
