// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { lintNarrativeGraphV1, parseNarrativeGraphV1 } from "./narrative-graph.ts";
import {
  createNarrativeGraphBuilderV1,
  narrativePredictionToDemandPlanV1,
  predictNarrativeDependenciesV1,
} from "./narrative-prediction.ts";

function nodeV1(input: {
  readonly nodeId: string;
  readonly kind?: "interaction" | "pure" | "call" | "end";
  readonly successors?: readonly string[];
  readonly callTarget?: string | null;
  readonly definitionId?: string;
  readonly assetIds?: readonly string[];
  readonly textIds?: readonly string[];
  readonly source?: string | null;
}) {
  const kind = input.kind ?? "pure";
  return {
    nodeId: input.nodeId,
    kind,
    successors: input.successors ?? [],
    callTarget: input.callTarget ?? null,
    interaction:
      kind === "interaction"
        ? { definitionId: input.definitionId ?? `${input.nodeId}.def`, seenRevision: 1 }
        : null,
    dependencies: {
      textIds: input.textIds ?? [],
      assetIds: input.assetIds ?? [],
      stageContentIds: [],
    },
    source: input.source ?? null,
  };
}

describe("lintNarrativeGraphV1", () => {
  it("accepts a clean graph", () => {
    const graph = parseNarrativeGraphV1({
      entryNodeId: "node.test.intro",
      nodes: [
        nodeV1({
          nodeId: "node.test.intro",
          kind: "interaction",
          definitionId: "interaction.test.intro",
          successors: ["node.test.call"],
        }),
        nodeV1({
          nodeId: "node.test.call",
          kind: "call",
          callTarget: "node.test.sub",
          successors: ["node.test.finish"],
        }),
        nodeV1({ nodeId: "node.test.sub", kind: "end" }),
        nodeV1({ nodeId: "node.test.finish", kind: "end" }),
      ],
    });
    expect(lintNarrativeGraphV1(graph)).toEqual([]);
  });

  it("reports a missing entry node", () => {
    const graph = parseNarrativeGraphV1({
      entryNodeId: "node.test.ghost-entry",
      nodes: [nodeV1({ nodeId: "node.test.only", kind: "end" })],
    });
    const diagnostics = lintNarrativeGraphV1(graph);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("narrative.entry_missing");
    expect(diagnostics[0]?.location?.jsonPointer).toBe("/entryNodeId");
  });

  it("returns stable codes with source or pointer locations for every failure", () => {
    const graph = parseNarrativeGraphV1({
      entryNodeId: "node.test.a",
      nodes: [
        // Duplicate id, custom source metadata on the duplicate.
        nodeV1({ nodeId: "node.test.a", successors: ["node.test.missing"] }),
        nodeV1({ nodeId: "node.test.a", source: "story.ts#intro" }),
        // Pure loop between b and c with no interaction boundary.
        nodeV1({ nodeId: "node.test.b", successors: ["node.test.c"] }),
        nodeV1({ nodeId: "node.test.c", successors: ["node.test.b"] }),
        // Call target that does not exist.
        nodeV1({ nodeId: "node.test.d", kind: "call", callTarget: "node.test.void" }),
        // Duplicate interaction definition.
        nodeV1({
          nodeId: "node.test.e",
          kind: "interaction",
          definitionId: "interaction.test.same",
        }),
        nodeV1({
          nodeId: "node.test.f",
          kind: "interaction",
          definitionId: "interaction.test.same",
        }),
      ],
    });
    const diagnostics = lintNarrativeGraphV1(graph);
    const byCode = new Map(
      diagnostics.map((diagnostic) => [
        diagnostic.code,
        diagnostic.location?.jsonPointer ?? diagnostic.location?.file ?? null,
      ]),
    );
    expect(byCode.get("narrative.node_duplicate")).toBe("story.ts#intro");
    expect(byCode.get("narrative.successor_missing")).toBe("/nodes/0");
    expect(byCode.get("narrative.call_target_missing")).toBe("/nodes/4");
    expect(byCode.has("narrative.node_unreachable")).toBe(true);
    expect(byCode.has("narrative.pure_loop")).toBe(true);
    expect(byCode.get("narrative.interaction_duplicate")).toBe("/nodes/6");
  });

  it("does not flag loops that cross an interaction boundary", () => {
    const graph = parseNarrativeGraphV1({
      entryNodeId: "node.test.say",
      nodes: [
        nodeV1({
          nodeId: "node.test.say",
          kind: "interaction",
          definitionId: "interaction.test.say",
          successors: ["node.test.back"],
        }),
        nodeV1({ nodeId: "node.test.back", successors: ["node.test.say"] }),
      ],
    });
    expect(lintNarrativeGraphV1(graph)).toEqual([]);
  });
});

describe("createNarrativeGraphBuilderV1", () => {
  it("produces the identical runtime contract as a hand-written literal", () => {
    const built = createNarrativeGraphBuilderV1({ entryNodeId: "node.test.intro" })
      .interaction({
        nodeId: "node.test.intro",
        definitionId: "interaction.test.intro",
        successors: ["node.test.stage"],
        dependencies: { textIds: ["text.test.line"] },
      })
      .pure({
        nodeId: "node.test.stage",
        successors: ["node.test.done"],
        dependencies: { stageContentIds: ["content.test.bg"], assetIds: ["asset.test.bg"] },
      })
      .end({ nodeId: "node.test.done" })
      .build();

    const literal = parseNarrativeGraphV1({
      entryNodeId: "node.test.intro",
      nodes: [
        {
          nodeId: "node.test.intro",
          kind: "interaction",
          successors: ["node.test.stage"],
          callTarget: null,
          interaction: { definitionId: "interaction.test.intro", seenRevision: 1 },
          dependencies: { textIds: ["text.test.line"], assetIds: [], stageContentIds: [] },
          source: "builder#0",
        },
        {
          nodeId: "node.test.stage",
          kind: "pure",
          successors: ["node.test.done"],
          callTarget: null,
          interaction: null,
          dependencies: {
            textIds: [],
            assetIds: ["asset.test.bg"],
            stageContentIds: ["content.test.bg"],
          },
          source: "builder#1",
        },
        {
          nodeId: "node.test.done",
          kind: "end",
          successors: [],
          callTarget: null,
          interaction: null,
          dependencies: { textIds: [], assetIds: [], stageContentIds: [] },
          source: "builder#2",
        },
      ],
    });
    expect(built).toEqual(literal);
    expect(lintNarrativeGraphV1(built)).toEqual([]);
  });
});

describe("predictNarrativeDependenciesV1", () => {
  function branchyGraphV1() {
    return createNarrativeGraphBuilderV1({ entryNodeId: "node.test.choice" })
      .interaction({
        nodeId: "node.test.choice",
        definitionId: "interaction.test.choice",
        successors: ["node.test.left", "node.test.right"],
      })
      .pure({
        nodeId: "node.test.left",
        successors: ["node.test.loop"],
        dependencies: { assetIds: ["asset.test.left"], textIds: ["text.test.left"] },
      })
      .pure({
        nodeId: "node.test.right",
        successors: ["node.test.call"],
        dependencies: { assetIds: ["asset.test.right"] },
      })
      .call({
        nodeId: "node.test.call",
        callTarget: "node.test.sub",
        successors: ["node.test.loop"],
      })
      .interaction({
        nodeId: "node.test.sub",
        definitionId: "interaction.test.sub",
        dependencies: { assetIds: ["asset.test.sub"] },
      })
      .pure({ nodeId: "node.test.loop", successors: ["node.test.choice"] })
      .build();
  }

  it("walks every branch and call deterministically without deciding choices", () => {
    const graph = branchyGraphV1();
    const first = predictNarrativeDependenciesV1(graph, "node.test.choice");
    const second = predictNarrativeDependenciesV1(graph, "node.test.choice");
    expect(second).toEqual(first);
    // Both branches and the called scene contribute; the cycle terminates.
    expect(first.assetIds).toEqual(["asset.test.left", "asset.test.right", "asset.test.sub"]);
    expect(first.textIds).toEqual(["text.test.left"]);
    expect(first.truncated).toBe(false);
  });

  it("ends under budget on cycles, deep calls, and large branches", () => {
    const graph = branchyGraphV1();
    const byNodes = predictNarrativeDependenciesV1(graph, "node.test.choice", {
      maxNodes: 2,
      maxDepth: 16,
      maxAssets: 32,
    });
    expect(byNodes.visitedNodeIds).toHaveLength(2);
    expect(byNodes.truncated).toBe(true);

    const byDepth = predictNarrativeDependenciesV1(graph, "node.test.choice", {
      maxNodes: 64,
      maxDepth: 1,
      maxAssets: 32,
    });
    expect(byDepth.truncated).toBe(true);
    expect(byDepth.visitedNodeIds.length).toBeLessThan(6);

    const byAssets = predictNarrativeDependenciesV1(graph, "node.test.choice", {
      maxNodes: 64,
      maxDepth: 16,
      maxAssets: 1,
    });
    expect(byAssets.assetIds).toHaveLength(1);
    expect(byAssets.truncated).toBe(true);
  });

  it("maps predictions to an opportunistic demand plan", () => {
    const graph = branchyGraphV1();
    const prediction = predictNarrativeDependenciesV1(graph, "node.test.choice");
    const plan = narrativePredictionToDemandPlanV1(prediction, { planId: "plan.test.prefetch" });
    expect(plan.entries).toEqual([
      { assetId: "asset.test.left", priority: "opportunistic", group: "narrative-prefetch" },
      { assetId: "asset.test.right", priority: "opportunistic", group: "narrative-prefetch" },
      { assetId: "asset.test.sub", priority: "opportunistic", group: "narrative-prefetch" },
    ]);
  });
});
