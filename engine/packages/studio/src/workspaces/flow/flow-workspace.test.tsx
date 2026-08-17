// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import type { NarrativeFlowGraphV1 } from "../../core/binding.ts";
import { buildFlowDocGroupsV1, buildFlowDocLayoutV1 } from "./flow-model.ts";
import { FlowWorkspaceSectionV1 } from "./flow-workspace.tsx";

afterEach(cleanup);

/** Two documents joined by a call edge, plus one hand-written node. */
const flowV1: NarrativeFlowGraphV1 = Object.freeze({
  nodes: Object.freeze([
    {
      nodeId: "node.demo.tea.intro",
      kind: "say" as const,
      docId: "doc.demo.tea",
      blockName: "intro",
      summary: "text.demo.tea.intro",
      source: "interaction-doc:doc.demo.tea#intro",
    },
    {
      nodeId: "node.demo.tea.menu",
      kind: "menu" as const,
      docId: "doc.demo.tea",
      blockName: "menu",
      summary: "text.demo.tea.menu-prompt",
      source: "interaction-doc:doc.demo.tea#menu",
    },
    {
      nodeId: "node.demo.tea.spin",
      kind: "roll" as const,
      docId: "doc.demo.tea",
      blockName: "spin",
      summary: "demo.draw({}) -> slot",
      source: "interaction-doc:doc.demo.tea#spin",
    },
    {
      nodeId: "node.demo.night.menu",
      kind: "menu" as const,
      docId: "doc.demo.night",
      blockName: "menu",
      summary: "text.demo.night.menu-prompt",
      source: "interaction-doc:doc.demo.night#menu",
    },
    {
      nodeId: "node.demo.legacy",
      kind: "end" as const,
      docId: null,
      blockName: null,
      summary: "end",
      source: "story/narrative.ts#node.demo.legacy",
    },
  ]),
  edges: Object.freeze([
    {
      from: "node.demo.tea.intro",
      to: "node.demo.tea.menu",
      label: Object.freeze({ kind: "next" as const }),
    },
    {
      from: "node.demo.tea.menu",
      to: "node.demo.tea.spin",
      label: Object.freeze({
        kind: "choice" as const,
        choiceId: "choice.demo.tea.green",
        textId: "text.demo.tea.green",
        gates: Object.freeze(["stock.has"]),
      }),
    },
    {
      from: "node.demo.tea.spin",
      to: "node.demo.tea.intro",
      label: Object.freeze({ kind: "roll" as const, outcome: "eq 1" }),
    },
    {
      from: "node.demo.tea.spin",
      to: "node.demo.night.menu",
      label: Object.freeze({ kind: "call" as const, label: "night-menu" }),
    },
  ]),
});

describe("flow model", () => {
  it("groups documents in first-appearance order with hand-written last", () => {
    expect(buildFlowDocGroupsV1(flowV1)).toEqual([
      { docId: "doc.demo.tea", label: "doc.demo.tea", nodeCount: 3 },
      { docId: "doc.demo.night", label: "doc.demo.night", nodeCount: 1 },
      { docId: null, label: "（手写节点）", nodeCount: 1 },
    ]);
  });

  it("ranks nodes from the document entry and stubs cross-document targets", () => {
    const layout = buildFlowDocLayoutV1(flowV1, "doc.demo.tea");
    const rows = new Map(layout.nodes.map((placed) => [placed.node.nodeId, placed.row]));
    expect(rows.get("node.demo.tea.intro")).toBe(0);
    expect(rows.get("node.demo.tea.menu")).toBe(1);
    expect(rows.get("node.demo.tea.spin")).toBe(2);
    // The cross-document call target renders as one jumpable stub.
    expect(layout.stubs).toHaveLength(1);
    expect(layout.stubs[0]).toMatchObject({
      nodeId: "node.demo.night.menu",
      docId: "doc.demo.night",
      known: true,
    });
    // Labels carry the author-meaningful text.
    const texts = layout.edges.map((edge) => edge.text);
    expect(texts).toContain("green [stock.has]");
    expect(texts).toContain("eq 1");
    expect(texts).toContain("@night-menu");
  });
});

describe("FlowWorkspaceSectionV1", () => {
  it("renders the first document, reveals a node's source, and jumps across documents", async () => {
    const user = userEvent.setup();
    const { container } = render(<FlowWorkspaceSectionV1 flow={flowV1} />);

    // First document selected; its nodes render.
    const teaDoc = container.querySelector('[data-studio-flow-doc="doc.demo.tea"]');
    expect(teaDoc).toHaveAttribute("aria-pressed", "true");
    const intro = container.querySelector('[data-studio-flow-node="node.demo.tea.intro"]');
    expect(intro).not.toBeNull();

    // Clicking a node reveals its source reference.
    await user.click(intro as Element);
    expect(container.querySelector("[data-studio-flow-source]")).toHaveTextContent(
      "interaction-doc:doc.demo.tea#intro",
    );

    // Clicking the cross-document stub jumps to that document with the
    // target selected — the read-only "go to source document" loop.
    const stub = container.querySelector('[data-studio-flow-stub="node.demo.night.menu"]');
    expect(stub).not.toBeNull();
    await user.click(stub as Element);
    expect(
      container.querySelector('[data-studio-flow-doc="doc.demo.night"]'),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      container.querySelector('[data-studio-flow-node="node.demo.night.menu"]'),
    ).toHaveAttribute("data-studio-flow-selected", "true");
    expect(container.querySelector("[data-studio-flow-source]")).toHaveTextContent(
      "interaction-doc:doc.demo.night#menu",
    );

    // Hand-written legacy nodes group under their own tab.
    await user.click(
      container.querySelector('[data-studio-flow-doc="hand-written"]') as Element,
    );
    expect(
      container.querySelector('[data-studio-flow-node="node.demo.legacy"]'),
    ).not.toBeNull();
  });
});
