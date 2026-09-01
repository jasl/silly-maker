// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type ProgramGuidedSurfaceFailureV1,
  type ProgramRunProjectionV1,
  ProgramUiContainerV1,
  type ProgramUiModeV1,
} from "../program-platform/ui/program-ui-container.tsx";

afterEach(cleanup);

function ProgramUiHarnessV1({
  run = null,
  toolbarActions,
  overlaySurface,
}: {
  readonly run?: ProgramRunProjectionV1 | null;
  readonly toolbarActions?: ReactNode;
  readonly overlaySurface?: ReactNode;
}): ReactNode {
  const [mode, setMode] = useState<ProgramUiModeV1>("guided");
  return (
    <ProgramUiContainerV1
      processId="process.translation.first"
      mode={mode}
      onModeChange={setMode}
      guidedSurface={<GuidedDraftV1 />}
      conversationSurface={<ConversationDraftV1 />}
      run={run}
      toolbarActions={toolbarActions}
      overlaySurface={overlaySurface}
      locale="zh-CN"
    />
  );
}

function ConversationDraftV1(): ReactNode {
  const [draft, setDraft] = useState("");
  return (
    <section aria-label="translation conversation">
      Conversation content
      <label>
        Conversation draft
        <input value={draft} onChange={(event) => setDraft(event.currentTarget.value)} />
      </label>
    </section>
  );
}

function GuidedDraftV1(): ReactNode {
  const [draft, setDraft] = useState("");
  return (
    <section aria-label="guided translation surface">
      Guided content
      <label>
        Target draft
        <input value={draft} onChange={(event) => setDraft(event.currentTarget.value)} />
      </label>
    </section>
  );
}

function SharedProcessProjectionHarnessV1(): ReactNode {
  const [mode, setMode] = useState<ProgramUiModeV1>("guided");
  const [completedOperations, setCompletedOperations] = useState(0);
  const advance = (): void => setCompletedOperations((current) => current + 1);
  return (
    <ProgramUiContainerV1
      processId="process.shared.projection"
      mode={mode}
      onModeChange={setMode}
      guidedSurface={
        <section aria-label="structured Process projection">
          <output>{completedOperations}</output>
          <button type="button" onClick={advance}>Run shared operation</button>
        </section>
      }
      conversationSurface={
        <section aria-label="conversation Process projection">
          <output>{completedOperations}</output>
          <button type="button" onClick={advance}>Ask for shared operation</button>
        </section>
      }
      run={null}
      locale="en"
    />
  );
}

function FailingGuidedSurfaceV1({ active }: { readonly active: boolean }): ReactNode {
  if (active) throw new Error("guided renderer failed");
  return <section aria-label="healthy guided surface">Guided content</section>;
}

function FailingGuidedSurfaceHarnessV1({
  onFailure,
}: {
  readonly onFailure: (failure: ProgramGuidedSurfaceFailureV1) => void;
}): ReactNode {
  const [mode, setMode] = useState<ProgramUiModeV1>("conversation");
  return (
    <ProgramUiContainerV1
      processId="process.guided.failure"
      mode={mode}
      onModeChange={setMode}
      onGuidedSurfaceFailure={onFailure}
      guidedSurface={<FailingGuidedSurfaceV1 active={mode === "guided"} />}
      conversationSurface={<ConversationDraftV1 />}
      run={{
        status: "running",
        label: "Agent is still running",
        recentLines: [],
      }}
      overlaySurface={<section data-testid="failure-overlay">Review remains open</section>}
      locale="en"
    />
  );
}

describe("SillyOS Program UI Container", () => {
  it("hosts an integrated Program surface without inventing view modes or a Process", () => {
    render(
      <ProgramUiContainerV1
        presentation="integrated"
        processId={null}
        surface={<main aria-label="integrated creator surface">Creator home</main>}
        run={null}
        locale="zh-CN"
      />,
    );

    const container = document.querySelector<HTMLElement>("[data-program-ui-container]");
    expect(container).not.toBeNull();
    expect(container).toHaveAttribute("data-program-ui-presentation", "integrated");
    expect(container).toHaveAttribute("data-program-ui-mode", "integrated");
    expect(container).not.toHaveAttribute("data-program-ui-process-id");
    expect(container).toHaveClass("is-toolbarless");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByRole("main", { name: "integrated creator surface" })).toBeVisible();
  });

  it("switches only the active surface without replacing the Process boundary", () => {
    render(<ProgramUiHarnessV1 />);

    const container = document.querySelector<HTMLElement>("[data-program-ui-container]");
    expect(container).not.toBeNull();
    expect(container).toHaveAttribute(
      "data-program-ui-process-id",
      "process.translation.first",
    );
    expect(container).toHaveAttribute("data-program-ui-mode", "guided");
    expect(screen.getByRole("region", { name: "guided translation surface" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "translation conversation" })).toBeNull();
    expect(document.querySelector('[aria-label="translation conversation"]')).toBeNull();
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("简单");
    fireEvent.change(screen.getByRole("textbox", { name: "Target draft" }), {
      target: { value: "unsaved target" },
    });

    for (const tab of screen.getAllByRole("tab")) {
      expect(document.getElementById(tab.getAttribute("aria-controls")!)).not.toBeNull();
    }

    fireEvent.click(screen.getByRole("tab", { name: "对话" }));

    expect(container).toHaveAttribute(
      "data-program-ui-process-id",
      "process.translation.first",
    );
    expect(container).toHaveAttribute("data-program-ui-mode", "conversation");
    expect(screen.queryByRole("region", { name: "guided translation surface" })).toBeNull();
    expect(screen.getByRole("region", { name: "translation conversation" })).toBeVisible();
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("对话");
    fireEvent.change(screen.getByRole("textbox", { name: "Conversation draft" }), {
      target: { value: "keep this conversation draft" },
    });

    fireEvent.click(screen.getByRole("tab", { name: "简单" }));
    expect(screen.getByRole("textbox", { name: "Target draft" })).toHaveValue(
      "unsaved target",
    );
    const hiddenConversation = document.querySelector<HTMLElement>(
      '[aria-label="translation conversation"]',
    );
    expect(hiddenConversation).not.toBeNull();
    expect(hiddenConversation?.querySelector("input")).toHaveValue(
      "keep this conversation draft",
    );
    fireEvent.click(screen.getByRole("tab", { name: "对话" }));
    expect(screen.getByRole("textbox", { name: "Conversation draft" })).toHaveValue(
      "keep this conversation draft",
    );
  });

  it("keeps guided and Conversation as equivalent projections of one Process authority", () => {
    render(<SharedProcessProjectionHarnessV1 />);

    const container = document.querySelector<HTMLElement>("[data-program-ui-container]");
    expect(container).toHaveAttribute("data-program-ui-process-id", "process.shared.projection");
    fireEvent.click(screen.getByRole("button", { name: "Run shared operation" }));
    expect(
      within(screen.getByRole("region", { name: "structured Process projection" }))
        .getByText("1"),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: "Conversation" }));
    expect(container).toHaveAttribute("data-program-ui-process-id", "process.shared.projection");
    expect(
      within(screen.getByRole("region", { name: "conversation Process projection" }))
        .getByText("1"),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Ask for shared operation" }));

    fireEvent.click(screen.getByRole("tab", { name: "Guided" }));
    expect(
      within(screen.getByRole("region", { name: "structured Process projection" }))
        .getByText("2"),
    ).toBeVisible();
  });

  it("falls back to the same Process Conversation when the guided renderer fails", () => {
    const onFailure = vi.fn<(failure: ProgramGuidedSurfaceFailureV1) => void>();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      render(<FailingGuidedSurfaceHarnessV1 onFailure={onFailure} />);
      fireEvent.change(screen.getByRole("textbox", { name: "Conversation draft" }), {
        target: { value: "keep this draft through fallback" },
      });

      fireEvent.click(screen.getByRole("tab", { name: "Guided" }));

      const container = document.querySelector<HTMLElement>("[data-program-ui-container]");
      const overlay = screen.getByTestId("failure-overlay");
      const runStrip = screen.getByRole("complementary", { name: "Program run status" });
      expect(container).toHaveAttribute("data-program-ui-process-id", "process.guided.failure");
      expect(container).toHaveAttribute("data-program-ui-mode", "conversation");
      expect(container).toHaveAttribute("data-program-ui-guided-status", "failed");
      expect(screen.getByRole("tab", { name: "Conversation" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByRole("region", { name: "translation conversation" })).toBeVisible();
      expect(screen.getByRole("textbox", { name: "Conversation draft" })).toHaveValue(
        "keep this draft through fallback",
      );
      expect(container).toContainElement(overlay);
      expect(container).toContainElement(runStrip);
      expect(onFailure).toHaveBeenCalledTimes(1);
      expect(onFailure.mock.calls[0]?.[0]?.processId).toBe("process.guided.failure");
      expect(onFailure.mock.calls[0]?.[0]?.error).toBeInstanceOf(Error);

      // Selecting Guided is an explicit retry. A repeated renderer failure
      // falls back again instead of leaving an empty active panel.
      fireEvent.click(screen.getByRole("tab", { name: "Guided" }));
      expect(onFailure).toHaveBeenCalledTimes(2);
      expect(container).toHaveAttribute("data-program-ui-mode", "conversation");
      expect(screen.getByRole("textbox", { name: "Conversation draft" })).toHaveValue(
        "keep this draft through fallback",
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("keeps the run strip and Program overlay inside the SillyOS-owned container", () => {
    const run: ProgramRunProjectionV1 = {
      status: "running",
      label: "正在翻译第 41 批",
      progress: {
        kind: "determinate",
        completed: 1_284,
        total: 12_460,
        label: "1,284 / 12,460 个条目",
      },
      recentLines: [
        { lineId: "line.1", kind: "tool", text: "translation workset prepare" },
      ],
      onCancel: vi.fn(),
    };
    render(
      <ProgramUiHarnessV1
        run={run}
        toolbarActions={<button type="button">Process settings</button>}
        overlaySurface={<section data-testid="program-overlay">Review unit</section>}
      />,
    );

    const container = document.querySelector<HTMLElement>("[data-program-ui-container]");
    const strip = screen.getByRole("complementary", { name: "Program 运行状态" });
    const overlayHost = document.querySelector<HTMLElement>("[data-program-ui-overlay-host]");
    const overlay = screen.getByTestId("program-overlay");
    expect(container).not.toBeNull();
    expect(overlayHost).not.toBeNull();
    expect(container).toContainElement(strip);
    expect(container).toContainElement(screen.getByRole("button", { name: "Process settings" }));
    expect(container).toContainElement(overlayHost);
    expect(overlayHost).toContainElement(overlay);
    expect(overlay.parentElement).toBe(overlayHost);
    expect(document.body.children).not.toContain(overlay);

    expect(strip).toHaveTextContent("translation workset prepare");
    expect(within(strip).queryByRole("progressbar")).toBeNull();
    fireEvent.click(within(strip).getByRole("button", { name: "展开活动" }));

    const progress = within(strip).getByRole("progressbar", {
      name: "1,284 / 12,460 个条目",
    });
    expect(progress).toHaveAttribute("aria-valuenow", "1284");
    expect(progress).toHaveAttribute("aria-valuemax", "12460");
    expect(strip).not.toHaveTextContent(/ETA|remaining|剩余/u);
  });

  it("represents an indeterminate model phase without inventing a ratio or ETA", () => {
    const run: ProgramRunProjectionV1 = {
      status: "running",
      label: "Agent 正在分析文档",
      progress: {
        kind: "indeterminate",
        label: "等待模型完成结构分析",
      },
      recentLines: [
        { lineId: "line.1", kind: "agent", text: "正在识别人物、术语与上下文。" },
      ],
    };
    render(<ProgramUiHarnessV1 run={run} />);

    const strip = screen.getByRole("complementary", { name: "Program 运行状态" });
    expect(within(strip).queryByRole("progressbar")).toBeNull();
    expect(strip).toHaveTextContent("正在识别人物、术语与上下文。");
    fireEvent.click(within(strip).getByRole("button", { name: "展开活动" }));
    expect(within(strip).getByRole("status")).toBeInTheDocument();
    expect(strip).toHaveTextContent("等待模型完成结构分析");
    expect(strip).not.toHaveTextContent(/\d+\s*\/\s*\d+|\d+%|ETA|remaining|剩余/u);
  });
});
