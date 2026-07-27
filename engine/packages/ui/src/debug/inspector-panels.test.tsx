// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { parseNarrativeGraphV1 } from "@sillymaker/base";

import { DebugNarrativeGraphViewV1, DebugValueInspectorV1 } from "./inspector-panels.tsx";

afterEach(cleanup);

describe("DebugValueInspectorV1", () => {
  it("renders the live value and follows source updates", () => {
    let value: unknown = { credits: 1 };
    const listeners = new Set<() => void>();
    const source = {
      read: () => value,
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    const { container } = render(
      <DebugValueInspectorV1 inspectorId="test-value" source={source} />,
    );
    const pre = container.querySelector("[data-debug-inspector='test-value']");
    expect(pre?.textContent).toContain('"credits": 1');

    act(() => {
      value = { credits: 7 };
      for (const listener of [...listeners]) listener();
    });
    expect(pre?.textContent).toContain('"credits": 7');
  });

  it("truncates oversized values instead of flooding the dock", () => {
    const source = {
      read: () => ({ blob: "x".repeat(30_000) }),
      subscribe: () => () => undefined,
    };
    const { container } = render(
      <DebugValueInspectorV1 inspectorId="test-large" source={source} />,
    );
    const text = container.querySelector("[data-debug-inspector='test-large']")?.textContent ?? "";
    expect(text.length).toBeLessThan(21_000);
    expect(text).toContain("chars truncated");
  });
});

describe("DebugNarrativeGraphViewV1", () => {
  const graph = parseNarrativeGraphV1({
    entryNodeId: "node.a",
    nodes: [
      {
        nodeId: "node.a",
        kind: "interaction",
        successors: ["node.b"],
        interaction: { definitionId: "interaction.test.a", seenRevision: 1 },
        dependencies: { textIds: [], assetIds: [], stageContentIds: [] },
        callTarget: null,
        source: "test.ts#node.a",
      },
      {
        nodeId: "node.b",
        kind: "end",
        successors: [],
        interaction: null,
        dependencies: { textIds: [], assetIds: [], stageContentIds: [] },
        callTarget: null,
        source: "test.ts#node.b",
      },
    ],
  });

  it("lists nodes, highlights the active interaction, and reports clean lint", () => {
    const { container } = render(
      <DebugNarrativeGraphViewV1
        graph={graph}
        diagnostics={[]}
        activeDefinitionId="interaction.test.a"
      />,
    );
    const active = container.querySelector("[data-graph-active='true']");
    expect(active?.getAttribute("data-graph-node")).toBe("node.a");
    expect(container.querySelector("[data-graph-lint='clean']")).not.toBeNull();
    expect(container.querySelectorAll("[data-graph-node]")).toHaveLength(2);
  });

  it("flags diagnosed nodes and lists structured issues", () => {
    const { container } = render(
      <DebugNarrativeGraphViewV1
        graph={graph}
        diagnostics={[
          { code: "narrative.node_unreachable", nodeId: "node.b", message: "unreachable" },
        ]}
      />,
    );
    const flagged = container.querySelector("[data-graph-flagged='true']");
    expect(flagged?.getAttribute("data-graph-node")).toBe("node.b");
    expect(
      container.querySelector("[data-graph-diagnostic='narrative.node_unreachable']"),
    ).not.toBeNull();
  });
});
