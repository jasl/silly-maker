// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prepareTranslationDocumentV1 } from "../product/translation/translation-document-codec.ts";
import {
  createTranslationProjectV1,
  type TranslationProjectV1,
} from "../product/translation/translation-project.ts";
import { TranslationProgramWorkspaceV1 } from "../ui/translation-program-workspace.tsx";

const originalOffsetHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "offsetHeight",
);
const originalOffsetWidth = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "offsetWidth",
);

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get() {
      return this.classList.contains("translation-unit-table__viewport") ? 476 : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() {
      return this.classList.contains("translation-unit-table__viewport") ? 920 : 0;
    },
  });
  if (globalThis.ResizeObserver !== undefined) return;
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: class ResizeObserverV1 {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  });
});

afterAll(() => {
  if (originalOffsetHeight === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, "offsetHeight");
  } else {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", originalOffsetHeight);
  }
  if (originalOffsetWidth === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, "offsetWidth");
  } else {
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalOffsetWidth);
  }
});

afterEach(cleanup);

function tenThousandUnitProjectV1(): TranslationProjectV1 {
  const source = Array.from(
    { length: 10_000 },
    (_unused, index) => `第 ${String(index + 1)} 行等待翻译。`,
  ).join("\n");
  return createTranslationProjectV1({
    projectId: "translation.project.large-vn",
    title: "Large VN script",
    document: prepareTranslationDocumentV1({
      fileName: "large-vn-script.txt",
      mediaType: "text/plain; charset=utf-8",
      text: source,
    }),
    sourceLocale: "zh-CN",
    targetLocale: "en",
    documentPurpose: "Dialogue for a medium-sized visual novel.",
    style: "Natural and faithful dialogue.",
    glossary: [],
  });
}

describe("SillyOS Translation Program workspace", () => {
  it("submits the selected File and locale preferences from the initial Program UI", async () => {
    const onImportFile = vi.fn();
    const view = render(
      <TranslationProgramWorkspaceV1
        processId="process.translation.import"
        locale="zh-CN"
        mode="guided"
        onModeChange={vi.fn()}
        project={null}
        stage="import"
        run={null}
        conversationSurface={<div>Conversation</div>}
        onImportFile={onImportFile}
      />,
    );

    fireEvent.change(screen.getByLabelText("源语言"), { target: { value: "ja-JP" } });
    fireEvent.change(screen.getByLabelText("目标语言"), { target: { value: "fr-CA" } });
    const file = new File(["1\n00:00:00,000 --> 00:00:02,000\nこんばんは。"], "opening.srt", {
      type: "application/x-subrip",
    });
    const fileInput = view.container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, { target: { files: [file] } });

    await waitFor(() => expect(onImportFile).toHaveBeenCalledTimes(1));
    expect(onImportFile).toHaveBeenCalledWith({
      file,
      sourceLocale: "ja-JP",
      targetLocale: "fr-CA",
    });
    expect(view.container).not.toHaveTextContent(/接受|拒绝|Accept|Reject/u);
  });

  it("windows a 10,000-unit Project while keeping visible rows selectable and editable", async () => {
    const project = tenThousandUnitProjectV1();
    const onSaveTarget = vi.fn();
    const view = render(
      <TranslationProgramWorkspaceV1
        processId="process.translation.large-vn"
        locale="zh-CN"
        mode="guided"
        onModeChange={vi.fn()}
        project={project}
        stage="review"
        run={null}
        conversationSurface={<div>Conversation</div>}
        onImportFile={vi.fn()}
        onSaveTarget={onSaveTarget}
      />,
    );

    const table = screen.getByRole("region", { name: "10,000 个条目" });
    await waitFor(() => {
      expect(table.querySelectorAll(".translation-unit-table__row").length).toBeGreaterThan(1);
    });
    const rows = Array.from(
      table.querySelectorAll<HTMLButtonElement>(".translation-unit-table__row"),
    );
    expect(rows.length).toBeLessThan(100);
    expect(rows.length).toBeLessThan(project.units.length / 100);

    const selectedRow = rows[1];
    expect(selectedRow).toBeDefined();
    fireEvent.click(selectedRow!);
    expect(selectedRow).toHaveAttribute("data-selected", "true");

    const editor = screen.getByRole("textbox", { name: "译文" });
    fireEvent.change(editor, { target: { value: "Translated visible row." } });
    fireEvent.click(screen.getByRole("button", { name: "保存译文" }));

    await waitFor(() => expect(onSaveTarget).toHaveBeenCalledTimes(1));
    const selectedOrder =
      Number(selectedRow!.querySelector(".translation-unit-table__order")?.textContent) - 1;
    expect(onSaveTarget).toHaveBeenCalledWith(
      expect.objectContaining({
        order: selectedOrder,
        source: `第 ${String(selectedOrder + 1)} 行等待翻译。`,
      }),
      "Translated visible row.",
    );
    expect(
      within(view.container).queryByRole("button", {
        name: /接受|拒绝|Accept|Reject/u,
      }),
    ).toBeNull();
  });

  it("preserves an unsaved target when an unrelated Project revision arrives", async () => {
    const project = tenThousandUnitProjectV1();
    const commonProps = {
      processId: "process.translation.concurrent-revision",
      locale: "zh-CN" as const,
      mode: "guided" as const,
      onModeChange: vi.fn(),
      stage: "review" as const,
      run: null,
      conversationSurface: <div>Conversation</div>,
      onImportFile: vi.fn(),
      onSaveTarget: vi.fn(),
    };
    const view = render(
      <TranslationProgramWorkspaceV1 {...commonProps} project={project} />,
    );

    const editor = await screen.findByRole("textbox", { name: "译文" });
    fireEvent.change(editor, { target: { value: "尚未保存的人工译文" } });

    view.rerender(
      <TranslationProgramWorkspaceV1
        {...commonProps}
        project={{ ...project, revision: project.revision + 1 }}
      />,
    );

    expect(screen.getByRole("textbox", { name: "译文" })).toHaveValue(
      "尚未保存的人工译文",
    );
  });
});
