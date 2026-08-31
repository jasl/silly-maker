// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prepareTranslationDocumentV1 } from "../product/translation/translation-document-codec.ts";
import {
  createTranslationProjectV1,
  readTranslationProjectRowWindowV1,
  type TranslationProjectUnitV1,
  type TranslationProjectV1,
} from "../product/translation/translation-project.ts";
import {
  type TranslationProjectPresentationSourceV1,
  TranslationProgramWorkspaceV1,
} from "../ui/translation-program-workspace.tsx";

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

function presentationSourceV1(
  project: TranslationProjectV1,
  options: {
    readonly revision?: number;
    readonly rowOverride?: (row: TranslationProjectUnitV1) => TranslationProjectUnitV1;
    readonly load?: TranslationProjectPresentationSourceV1["loadRowWindow"];
  } = {},
): {
  readonly source: TranslationProjectPresentationSourceV1;
  readonly loadRowWindow: ReturnType<
    typeof vi.fn<TranslationProjectPresentationSourceV1["loadRowWindow"]>
  >;
} {
  const loadRowWindow = vi.fn<TranslationProjectPresentationSourceV1["loadRowWindow"]>(
    options.load ?? ((request) => {
      if (request.signal.aborted) return Promise.reject(request.signal.reason);
      const window = readTranslationProjectRowWindowV1(project, request);
      return Promise.resolve({
        ...window,
        rows: options.rowOverride === undefined
          ? window.rows
          : window.rows.map(options.rowOverride),
      });
    }),
  );
  return {
    source: {
      projectId: project.projectId,
      revision: options.revision ?? project.revision,
      title: project.title,
      documentPurpose: project.documentPurpose,
      sourceLocale: project.sourceLocale,
      targetLocale: project.targetLocale,
      totalUnitCount: project.units.length,
      committedUnitCount: project.committedUnitCount,
      committedBatchCount: project.committedBatchIds.length,
      glossaryTermCount: project.glossary.length,
      loadRowWindow,
    },
    loadRowWindow,
  };
}

function renderProjectV1(
  projectSource: TranslationProjectPresentationSourceV1,
  onSaveTarget = vi.fn(),
) {
  return render(
    <TranslationProgramWorkspaceV1
      processId="process.translation.large-vn"
      locale="zh-CN"
      mode="guided"
      onModeChange={vi.fn()}
      projectSource={projectSource}
      stage="review"
      run={null}
      conversationSurface={<div>Conversation</div>}
      onImportFile={vi.fn()}
      onSaveTarget={onSaveTarget}
    />,
  );
}

function scrollTableToOrderV1(viewport: HTMLElement, order: number): void {
  Object.defineProperty(viewport, "scrollTop", {
    configurable: true,
    writable: true,
    value: order * 68,
  });
  fireEvent.scroll(viewport);
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
        projectSource={null}
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

  it("loads initial, middle and final row windows without requesting the 10,000-unit Project", async () => {
    const project = tenThousandUnitProjectV1();
    const { source, loadRowWindow } = presentationSourceV1(project);
    const view = renderProjectV1(source);
    const table = screen.getByRole("region", { name: "10,000 个条目" });
    const viewport = view.container.querySelector<HTMLElement>(
      ".translation-unit-table__viewport",
    );
    expect(viewport).not.toBeNull();

    expect(await within(table).findByText("第 1 行等待翻译。")).toBeVisible();
    scrollTableToOrderV1(viewport!, 5_000);
    const middleSource = await within(table).findByText("第 5001 行等待翻译。");
    expect(middleSource).toBeVisible();
    fireEvent.click(middleSource.closest("button")!);
    scrollTableToOrderV1(viewport!, 9_999);
    expect(await within(table).findByText("第 10000 行等待翻译。")).toBeVisible();

    const rows = table.querySelectorAll(".translation-unit-table__row");
    expect(rows.length).toBeLessThan(100);
    expect(loadRowWindow.mock.calls.length).toBeGreaterThanOrEqual(3);
    for (const [request] of loadRowWindow.mock.calls) {
      expect(request.limit).toBeLessThan(100);
      expect(request.limit).not.toBe(project.units.length);
    }
    const callsBeforeReturn = loadRowWindow.mock.calls.length;
    scrollTableToOrderV1(viewport!, 0);
    expect(await within(table).findByText("第 1 行等待翻译。")).toBeVisible();
    await waitFor(() => expect(loadRowWindow.mock.calls.length).toBeGreaterThan(callsBeforeReturn));
  });

  it("aborts a superseded visible window instead of accumulating fast-scroll reads", async () => {
    const project = tenThousandUnitProjectV1();
    type RequestV1 = Parameters<TranslationProjectPresentationSourceV1["loadRowWindow"]>[0];
    type WindowV1 = Awaited<
      ReturnType<TranslationProjectPresentationSourceV1["loadRowWindow"]>
    >;
    const pending: {
      readonly request: RequestV1;
      readonly resolve: (window: WindowV1) => void;
      readonly reject: (error: unknown) => void;
    }[] = [];
    const { source } = presentationSourceV1(project, {
      load: (request) =>
        new Promise<WindowV1>((resolve, reject) => {
          request.signal.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
          pending.push({ request, resolve, reject });
        }),
    });
    const view = renderProjectV1(source);
    const viewport = view.container.querySelector<HTMLElement>(
      ".translation-unit-table__viewport",
    );
    expect(viewport).not.toBeNull();

    await waitFor(() => expect(pending).toHaveLength(1));
    pending[0]!.resolve(readTranslationProjectRowWindowV1(project, pending[0]!.request));
    await screen.findByText("第 1 行等待翻译。", {
      selector: ".translation-unit-table__text",
    });

    scrollTableToOrderV1(viewport!, 5_000);
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[1]!.request.signal.aborted).toBe(false);
    scrollTableToOrderV1(viewport!, 9_999);
    await waitFor(() => expect(pending[1]!.request.signal.aborted).toBe(true));
    await waitFor(() => expect(pending).toHaveLength(3));
    pending[2]!.resolve(readTranslationProjectRowWindowV1(project, pending[2]!.request));
    expect(
      await screen.findByText("第 10000 行等待翻译。", {
        selector: ".translation-unit-table__text",
      }),
    ).toBeVisible();
  });

  it("saves the exact selected async row identity and its dirty target", async () => {
    const project = tenThousandUnitProjectV1();
    const { source } = presentationSourceV1(project);
    const onSaveTarget = vi.fn();
    const view = renderProjectV1(source, onSaveTarget);
    const viewport = view.container.querySelector<HTMLElement>(
      ".translation-unit-table__viewport",
    );
    expect(viewport).not.toBeNull();

    await screen.findByText("第 1 行等待翻译。", {
      selector: ".translation-unit-table__text",
    });
    scrollTableToOrderV1(viewport!, 5_000);
    const sourceCell = await screen.findByText("第 5001 行等待翻译。", {
      selector: ".translation-unit-table__text",
    });
    const selectedRow = sourceCell.closest<HTMLButtonElement>("button");
    expect(selectedRow).not.toBeNull();
    fireEvent.click(selectedRow!);
    expect(selectedRow).toHaveAttribute("data-selected", "true");

    const editor = await screen.findByRole("textbox", { name: "译文" });
    fireEvent.change(editor, { target: { value: "Translated middle row." } });
    fireEvent.click(screen.getByRole("button", { name: "保存译文" }));

    await waitFor(() => expect(onSaveTarget).toHaveBeenCalledTimes(1));
    expect(onSaveTarget).toHaveBeenCalledWith(
      expect.objectContaining({
        unitId: project.units[5_000]?.unitId,
        order: 5_000,
        source: "第 5001 行等待翻译。",
      }),
      "Translated middle row.",
    );
    expect(
      within(view.container).queryByRole("button", {
        name: /接受|拒绝|Accept|Reject/u,
      }),
    ).toBeNull();
  });

  it("resets row cache on Project revision while preserving a dirty draft for the same unit", async () => {
    const project = tenThousandUnitProjectV1();
    const first = presentationSourceV1(project);
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
      <TranslationProgramWorkspaceV1 {...commonProps} projectSource={first.source} />,
    );

    const editor = await screen.findByRole("textbox", { name: "译文" });
    fireEvent.change(editor, { target: { value: "尚未保存的人工译文" } });
    const second = presentationSourceV1(project, {
      revision: project.revision + 1,
      rowOverride: (row) =>
        row.order === 0
          ? { ...row, source: "修订后的第一行。", target: "Authoritative target" }
          : row,
    });

    view.rerender(
      <TranslationProgramWorkspaceV1 {...commonProps} projectSource={second.source} />,
    );

    expect(
      await screen.findByText("修订后的第一行。", {
        selector: ".translation-unit-table__text",
      }),
    ).toBeVisible();
    expect(second.loadRowWindow).toHaveBeenCalled();
    expect(await screen.findByRole("textbox", { name: "译文" })).toHaveValue(
      "尚未保存的人工译文",
    );
  });

  it("shows asynchronous loading and offers a retry after a row-window failure", async () => {
    const project = tenThousandUnitProjectV1();
    let rejectWindows = true;
    const onOperationError = vi.fn();
    const { source } = presentationSourceV1(project, {
      load: async (request) => {
        await Promise.resolve();
        if (rejectWindows) throw new Error("temporary row read failure");
        return readTranslationProjectRowWindowV1(project, request);
      },
    });
    const view = render(
      <TranslationProgramWorkspaceV1
        processId="process.translation.retry"
        locale="zh-CN"
        mode="guided"
        onModeChange={vi.fn()}
        projectSource={source}
        stage="review"
        run={null}
        conversationSurface={<div>Conversation</div>}
        onImportFile={vi.fn()}
        onOperationError={onOperationError}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("正在加载翻译条目");
    expect(await screen.findByRole("alert")).toHaveTextContent("翻译条目加载失败");
    expect(onOperationError).toHaveBeenCalled();

    rejectWindows = false;
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(
      await screen.findByText("第 1 行等待翻译。", {
        selector: ".translation-unit-table__text",
      }),
    ).toBeVisible();
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(view.container.querySelectorAll(".translation-unit-table__row").length).toBeLessThan(
      100,
    );
  });
});
