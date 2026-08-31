// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type ProgramRunProjectionV1,
  ProgramUiContainerV1,
  type ProgramUiModeV1,
} from "../ui/program-ui-container.tsx";

afterEach(cleanup);

function ProgramUiHarnessV1({
  run = null,
  overlaySurface,
}: {
  readonly run?: ProgramRunProjectionV1 | null;
  readonly overlaySurface?: ReactNode;
}): ReactNode {
  const [mode, setMode] = useState<ProgramUiModeV1>("guided");
  return (
    <ProgramUiContainerV1
      processId="process.translation.first"
      mode={mode}
      onModeChange={setMode}
      guidedSurface={<GuidedDraftV1 />}
      conversationSurface={
        <section aria-label="translation conversation">Conversation content</section>
      }
      run={run}
      overlaySurface={overlaySurface}
      locale="zh-CN"
    />
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

describe("SillyOS Program UI Container", () => {
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

    fireEvent.click(screen.getByRole("tab", { name: "简单" }));
    expect(screen.getByRole("textbox", { name: "Target draft" })).toHaveValue(
      "unsaved target",
    );
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
