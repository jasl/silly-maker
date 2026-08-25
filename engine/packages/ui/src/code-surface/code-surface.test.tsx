// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { admitGuiCompositionDocumentV1 } from "@sillymaker/base";
import type { StrictJsonObjectV1 } from "@sillymaker/base";
import {
  CodeSurfaceCompileErrorV1,
  CodeSurfaceCompositionHostV1,
  compileCodeSurfaceCompositionV1,
  defineCodeSurfaceCatalogV1,
  defineCodeSurfaceV1,
} from "./code-surface.tsx";
import type { CodeSurfaceViewPropsV1 } from "./code-surface.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

interface TestContextV1 {
  readonly dispatch: (action: string) => void;
}

function readTitlePropsV1(value: StrictJsonObjectV1): { readonly title: string } {
  if (typeof value.title !== "string") throw new TypeError("title_required");
  return { title: value.title };
}

const policiesV1 = {
  input: "application",
  nativeText: "allowed",
  portal: "none",
} as const;

function documentV1(root: Record<string, unknown>) {
  return admitGuiCompositionDocumentV1({
    format: "sillymaker.gui-composition",
    version: 1,
    compositionId: "gui.test.code-surface",
    root,
  });
}

describe("Code Surface direct composition", () => {
  it("rejects ambiguous public authoring properties", () => {
    expect(() =>
      defineCodeSurfaceV1({
        viewId: "view.test.duplicate-properties",
        slotIds: [],
        admitProps: () => ({}),
        load: async () => ({ default: () => null }),
        authoring: {
          label: "Duplicate properties",
          properties: [
            { propId: "title", label: "Title", valueKind: "string" },
            { propId: "title", label: "Other title", valueKind: "string" },
          ],
          preview: "opaque",
          stateOwner: "react_local",
        },
        policy: policiesV1,
      })
    ).toThrowError(CodeSurfaceCompileErrorV1);
  });

  it("loads a child only when its parent renders the named slot", async () => {
    let detailLoads = 0;
    const ShellV1 = (
      props: CodeSurfaceViewPropsV1<TestContextV1, { readonly title: string }, "detail">,
    ) => {
      const [open, setOpen] = useState(false);
      return (
        <section>
          <h2>{props.props.title}</h2>
          <button type="button" onClick={() => setOpen((current) => !current)}>
            Toggle detail
          </button>
          {open ? props.slots.detail : null}
        </section>
      );
    };
    const DetailV1 = () => <p>Lazy detail ready</p>;
    const catalog = defineCodeSurfaceCatalogV1<TestContextV1>([
      defineCodeSurfaceV1({
        viewId: "view.test.shell",
        slotIds: ["detail"],
        admitProps: readTitlePropsV1,
        load: async () => ({ default: ShellV1 }),
        authoring: {
          label: "Shell",
          properties: [{ propId: "title", label: "Title", valueKind: "string" }],
          preview: "slots",
          stateOwner: "react_local",
        },
        policy: policiesV1,
      }),
      defineCodeSurfaceV1({
        viewId: "view.test.detail",
        slotIds: [],
        admitProps: () => ({}),
        load: async () => {
          detailLoads += 1;
          return { default: DetailV1 };
        },
        authoring: {
          label: "Detail",
          properties: [],
          preview: "opaque",
          stateOwner: "react_local",
        },
        policy: policiesV1,
      }),
    ]);
    const composition = compileCodeSurfaceCompositionV1(
      documentV1({
        nodeId: "node.test.shell",
        viewId: "view.test.shell",
        props: { title: "Conformance shell" },
        slots: {
          detail: [{
            nodeId: "node.test.detail",
            viewId: "view.test.detail",
            props: {},
            slots: {},
          }],
        },
      }),
      catalog,
    );
    render(
      <CodeSurfaceCompositionHostV1
        composition={composition}
        context={{ dispatch: () => undefined }}
      />,
    );

    await screen.findByRole("heading", { name: "Conformance shell" });
    expect(detailLoads).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Toggle detail" }));
    await screen.findByText("Lazy detail ready");
    expect(detailLoads).toBe(1);
  });

  it("validates parent-specific slots and props once during compile", async () => {
    let admissions = 0;
    const catalog = defineCodeSurfaceCatalogV1<TestContextV1>([
      defineCodeSurfaceV1({
        viewId: "view.test.leaf",
        slotIds: [],
        admitProps(value) {
          admissions += 1;
          return readTitlePropsV1(value);
        },
        load: async () => ({
          default: (props) => <p>{(props.props as { readonly title: string }).title}</p>,
        }),
        authoring: {
          label: "Leaf",
          properties: [{ propId: "title", label: "Title", valueKind: "string" }],
          preview: "opaque",
          stateOwner: "react_local",
        },
        policy: policiesV1,
      }),
    ]);
    expect(() =>
      compileCodeSurfaceCompositionV1(
        documentV1({
          nodeId: "node.test.leaf",
          viewId: "view.test.leaf",
          props: { title: "Leaf" },
          slots: { content: [] },
        }),
        catalog,
      )
    ).toThrowError(CodeSurfaceCompileErrorV1);

    const composition = compileCodeSurfaceCompositionV1(
      documentV1({
        nodeId: "node.test.leaf",
        viewId: "view.test.leaf",
        props: { title: "Admitted once" },
        slots: {},
      }),
      catalog,
    );
    expect(admissions).toBe(1);
    const view = render(
      <CodeSurfaceCompositionHostV1
        composition={composition}
        context={{ dispatch: () => undefined }}
      />,
    );
    await screen.findByText("Admitted once");
    view.rerender(
      <CodeSurfaceCompositionHostV1
        composition={composition}
        context={{ dispatch: () => undefined }}
      />,
    );
    expect(admissions).toBe(1);
  });

  it("contains a child render fault without unmounting its parent or sibling", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const faults: unknown[] = [];
    const ParentV1 = (
      props: CodeSurfaceViewPropsV1<TestContextV1, Record<never, never>, "content">,
    ) => <section aria-label="Parent survives">{props.slots.content}</section>;
    const FaultV1 = () => {
      throw new Error("child failed");
    };
    const HealthyV1 = () => <p>Healthy sibling</p>;
    const catalog = defineCodeSurfaceCatalogV1<TestContextV1>([
      defineCodeSurfaceV1({
        viewId: "view.test.parent",
        slotIds: ["content"],
        admitProps: () => ({}),
        load: async () => ({ default: ParentV1 }),
        authoring: {
          label: "Parent",
          properties: [],
          preview: "slots",
          stateOwner: "react_local",
        },
        policy: policiesV1,
      }),
      defineCodeSurfaceV1({
        viewId: "view.test.fault",
        slotIds: [],
        admitProps: () => ({}),
        load: async () => ({ default: FaultV1 }),
        authoring: {
          label: "Fault",
          properties: [],
          preview: "opaque",
          stateOwner: "react_local",
        },
        policy: policiesV1,
      }),
      defineCodeSurfaceV1({
        viewId: "view.test.healthy",
        slotIds: [],
        admitProps: () => ({}),
        load: async () => ({ default: HealthyV1 }),
        authoring: {
          label: "Healthy",
          properties: [],
          preview: "opaque",
          stateOwner: "react_local",
        },
        policy: policiesV1,
      }),
    ]);
    const composition = compileCodeSurfaceCompositionV1(
      documentV1({
        nodeId: "node.test.parent",
        viewId: "view.test.parent",
        props: {},
        slots: {
          content: [
            { nodeId: "node.test.fault", viewId: "view.test.fault", props: {}, slots: {} },
            {
              nodeId: "node.test.healthy",
              viewId: "view.test.healthy",
              props: {},
              slots: {},
            },
          ],
        },
      }),
      catalog,
    );
    render(
      <CodeSurfaceCompositionHostV1
        composition={composition}
        context={{ dispatch: () => undefined }}
        reportFault={(fault) => faults.push(fault)}
      />,
    );

    await screen.findByRole("region", { name: "Parent survives" });
    await screen.findByText("Healthy sibling");
    expect(await screen.findByRole("alert")).toHaveTextContent("Code surface unavailable");
    await waitFor(() => expect(faults).toHaveLength(1));
    expect(faults[0]).toMatchObject({
      compositionId: "gui.test.code-surface",
      nodeId: "node.test.fault",
      viewId: "view.test.fault",
    });
  });

  it("preserves same node/view local state and cleans up a replaced view", async () => {
    let cleanups = 0;
    const StatefulV1 = () => {
      const [count, setCount] = useState(0);
      useEffect(() => () => {
        cleanups += 1;
      }, []);
      return <button onClick={() => setCount((current) => current + 1)}>Count {count}</button>;
    };
    const ReplacementV1 = () => <p>Replacement ready</p>;
    const catalog = defineCodeSurfaceCatalogV1<TestContextV1>([
      defineCodeSurfaceV1({
        viewId: "view.test.stateful",
        slotIds: [],
        admitProps: () => ({}),
        load: async () => ({ default: StatefulV1 }),
        authoring: {
          label: "Stateful",
          properties: [],
          preview: "opaque",
          stateOwner: "react_local",
        },
        policy: policiesV1,
      }),
      defineCodeSurfaceV1({
        viewId: "view.test.replacement",
        slotIds: [],
        admitProps: () => ({}),
        load: async () => ({ default: ReplacementV1 }),
        authoring: {
          label: "Replacement",
          properties: [],
          preview: "opaque",
          stateOwner: "react_local",
        },
        policy: policiesV1,
      }),
    ]);
    const compile = (viewId: string) =>
      compileCodeSurfaceCompositionV1(
        documentV1({ nodeId: "node.test.content", viewId, props: {}, slots: {} }),
        catalog,
      );
    const view = render(
      <CodeSurfaceCompositionHostV1
        composition={compile("view.test.stateful")}
        context={{ dispatch: () => undefined }}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Count 0" }));
    expect(screen.getByRole("button", { name: "Count 1" })).toBeInTheDocument();
    view.rerender(
      <CodeSurfaceCompositionHostV1
        composition={compile("view.test.stateful")}
        context={{ dispatch: () => undefined }}
      />,
    );
    expect(screen.getByRole("button", { name: "Count 1" })).toBeInTheDocument();
    expect(cleanups).toBe(0);

    view.rerender(
      <CodeSurfaceCompositionHostV1
        composition={compile("view.test.replacement")}
        context={{ dispatch: () => undefined }}
      />,
    );
    await screen.findByText("Replacement ready");
    expect(cleanups).toBe(1);
  });

  it("projects explicit source and parent-slot layout metadata without inspecting the DOM", () => {
    const catalog = defineCodeSurfaceCatalogV1<TestContextV1>([
      defineCodeSurfaceV1({
        viewId: "view.test.inspection-parent",
        slotIds: ["content"],
        admitProps: () => ({}),
        load: async () => ({ default: (props) => <>{props.slots.content}</> }),
        source: "src/inspection-parent.tsx",
        authoring: {
          label: "Inspection parent",
          properties: [],
          preview: "slots",
          stateOwner: "ui_session",
        },
        policy: { input: "application", nativeText: "allowed", portal: "application_owned" },
      }),
      defineCodeSurfaceV1({
        viewId: "view.test.inspection-child",
        slotIds: [],
        admitProps: () => ({}),
        load: async () => ({ default: () => null }),
        source: "src/inspection-child.tsx",
        authoring: {
          label: "Inspection child",
          properties: [],
          preview: "opaque",
          stateOwner: "react_local",
        },
        policy: policiesV1,
      }),
    ]);
    const composition = compileCodeSurfaceCompositionV1(
      documentV1({
        nodeId: "node.test.inspection-parent",
        viewId: "view.test.inspection-parent",
        props: {},
        slots: {
          content: [{
            nodeId: "node.test.inspection-child",
            viewId: "view.test.inspection-child",
            props: {},
            slots: {},
          }],
        },
      }),
      catalog,
    );

    expect(composition.inspection.nodes).toEqual([
      expect.objectContaining({
        nodeId: "node.test.inspection-parent",
        source: "src/inspection-parent.tsx",
        parentNodeId: null,
        slotId: null,
        layoutDomain: "application",
        outerGeometryOwner: "application",
      }),
      expect.objectContaining({
        nodeId: "node.test.inspection-child",
        source: "src/inspection-child.tsx",
        parentNodeId: "node.test.inspection-parent",
        slotId: "content",
        layoutDomain: "parent_slot",
        outerGeometryOwner: "parent_code_surface",
      }),
    ]);
  });

  it("reports lazy node loading, mount, and release at the real React lifecycle", async () => {
    let resolveView!: (value: { readonly default: () => ReactElement }) => void;
    const loaded = new Promise<{ readonly default: () => ReactElement }>((resolve) => {
      resolveView = resolve;
    });
    const catalog = defineCodeSurfaceCatalogV1<TestContextV1>([
      defineCodeSurfaceV1({
        viewId: "view.test.lifecycle",
        slotIds: [],
        admitProps: () => ({}),
        load: () => loaded,
        authoring: {
          label: "Lifecycle",
          properties: [],
          preview: "opaque",
          stateOwner: "react_local",
        },
        policy: policiesV1,
      }),
    ]);
    const composition = compileCodeSurfaceCompositionV1(
      documentV1({
        nodeId: "node.test.lifecycle",
        viewId: "view.test.lifecycle",
        props: {},
        slots: {},
      }),
      catalog,
    );
    const phases: string[] = [];
    const context = { dispatch: () => undefined };
    const observeLifecycle = (event: { readonly phase: string }): void => {
      phases.push(event.phase);
    };
    const view = render(
      <CodeSurfaceCompositionHostV1
        composition={composition}
        context={context}
        observeLifecycle={observeLifecycle}
      />,
    );
    await waitFor(() => expect(phases).toContain("loading"));
    resolveView({ default: () => <p>Lifecycle ready</p> });
    await screen.findByText("Lifecycle ready");
    await waitFor(() => expect(phases).toContain("mounted"));
    const settledPhases = [...phases];
    view.rerender(
      <CodeSurfaceCompositionHostV1
        composition={composition}
        context={context}
        observeLifecycle={observeLifecycle}
      />,
    );
    await Promise.resolve();
    expect(phases).toEqual(settledPhases);
    view.unmount();
    expect(phases.at(-1)).toBe("released");
  });
});
