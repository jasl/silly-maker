// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prepareTranslationDocumentV1 } from "../product/translation/translation-document-codec.ts";
import {
  type TranslationProcessUnitProjectionV1,
} from "../product/translation/translation-process-view.ts";
import {
  type TranslationProcessPresentationSourceV1,
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

interface TranslationProcessFixtureV1 {
  readonly revision: number;
  readonly title: string;
  readonly documentPurpose: string;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly units: readonly TranslationProcessUnitProjectionV1[];
  readonly acceptedUnitCount: number;
  readonly acceptedBatchCount: number;
  readonly glossaryTermCount: number;
}

function tenThousandUnitProcessV1(): TranslationProcessFixtureV1 {
  const source = Array.from(
    { length: 10_000 },
    (_unused, index) => `第 ${String(index + 1)} 行等待翻译。`,
  ).join("\n");
  const document = prepareTranslationDocumentV1({
    fileName: "large-vn-script.txt",
    mediaType: "text/plain; charset=utf-8",
    text: source,
  });
  return {
    revision: 1,
    title: "Large VN script",
    documentPurpose: "Dialogue for a medium-sized visual novel.",
    sourceLocale: "zh-CN",
    targetLocale: "en",
    units: document.sourceUnits.map((unit) => ({
      ...unit,
      target: null,
    })),
    acceptedUnitCount: 0,
    acceptedBatchCount: 0,
    glossaryTermCount: 0,
  };
}

function readProcessRowWindowV1(
  process: TranslationProcessFixtureV1,
  request: { readonly offset: number; readonly limit: number },
) {
  const rows = process.units.slice(request.offset, request.offset + request.limit);
  return {
    offset: request.offset,
    limit: request.limit,
    totalRowCount: process.units.length,
    rows,
    nextOffset: request.offset + rows.length < process.units.length
      ? request.offset + rows.length
      : null,
  };
}

function presentationSourceV1(
  process: TranslationProcessFixtureV1,
  options: {
    readonly revision?: number;
    readonly rowOverride?: (
      row: TranslationProcessUnitProjectionV1,
    ) => TranslationProcessUnitProjectionV1;
    readonly load?: TranslationProcessPresentationSourceV1["loadRowWindow"];
    readonly pendingCandidate?: TranslationProcessPresentationSourceV1["pendingCandidate"];
  } = {},
): {
  readonly source: TranslationProcessPresentationSourceV1;
  readonly loadRowWindow: ReturnType<
    typeof vi.fn<TranslationProcessPresentationSourceV1["loadRowWindow"]>
  >;
} {
  const loadRowWindow = vi.fn<TranslationProcessPresentationSourceV1["loadRowWindow"]>(
    options.load ?? ((request) => {
      if (request.signal.aborted) return Promise.reject(request.signal.reason);
      const window = readProcessRowWindowV1(process, request);
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
      revision: options.revision ?? process.revision,
      title: process.title,
      documentPurpose: process.documentPurpose,
      sourceLocale: process.sourceLocale,
      targetLocale: process.targetLocale,
      totalUnitCount: process.units.length,
      committedUnitCount: process.acceptedUnitCount,
      committedBatchCount: process.acceptedBatchCount,
      glossaryTermCount: process.glossaryTermCount,
      pendingCandidate: options.pendingCandidate ?? null,
      loadRowWindow,
    },
    loadRowWindow,
  };
}

function renderProcessV1(
  translationSource: TranslationProcessPresentationSourceV1,
  options: {
    readonly onAcceptCandidate?: (
      input: Parameters<
        NonNullable<
          ComponentProps<typeof TranslationProgramWorkspaceV1>["onAcceptCandidate"]
        >
      >[0],
    ) => void | Promise<void>;
    readonly onRejectCandidate?: (
      input: Parameters<
        NonNullable<
          ComponentProps<typeof TranslationProgramWorkspaceV1>["onRejectCandidate"]
        >
      >[0],
    ) => void | Promise<void>;
    readonly onOperationError?: (error: unknown) => void;
  } = {},
) {
  return render(
    <TranslationProgramWorkspaceV1
      processId="process.translation.large-vn"
      locale="zh-CN"
      mode="guided"
      onModeChange={vi.fn()}
      translationSource={translationSource}
      stage="review"
      run={null}
      conversationSurface={<div>Conversation</div>}
      onImportFile={vi.fn()}
      {...(options.onAcceptCandidate === undefined
        ? {}
        : { onAcceptCandidate: options.onAcceptCandidate })}
      {...(options.onRejectCandidate === undefined
        ? {}
        : { onRejectCandidate: options.onRejectCandidate })}
      {...(options.onOperationError === undefined
        ? {}
        : { onOperationError: options.onOperationError })}
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
        translationSource={null}
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

  it("starts one translation run and disables the action while its callback is pending", async () => {
    const process = tenThousandUnitProcessV1();
    const { source } = presentationSourceV1(process);
    let finishStart!: () => void;
    const onStartTranslation = vi.fn(() =>
      new Promise<void>((resolve) => {
        finishStart = resolve;
      })
    );
    render(
      <TranslationProgramWorkspaceV1
        processId="process.translation.start"
        locale="en"
        mode="guided"
        onModeChange={vi.fn()}
        translationSource={source}
        stage="analyze"
        run={null}
        conversationSurface={<div>Conversation</div>}
        onImportFile={vi.fn()}
        onStartTranslation={onStartTranslation}
      />,
    );

    const start = screen.getByRole("button", { name: "Start translation" });
    fireEvent.click(start);
    fireEvent.click(start);

    expect(onStartTranslation).toHaveBeenCalledTimes(1);
    expect(start).toBeDisabled();
    act(() => finishStart());
    await waitFor(() => expect(start).toBeEnabled());
  });

  it("overlays one pending batch candidate on pageable rows without advancing accepted progress", async () => {
    const process = tenThousandUnitProcessV1();
    const firstUnit = process.units[0]!;
    const { source, loadRowWindow } = presentationSourceV1(process, {
      pendingCandidate: {
        candidateId: "candidate.batch.1",
        firstOrder: 0,
        unitCount: 1,
        targets: [{ unitId: firstUnit.unitId, target: "The first reviewed candidate." }],
        ambiguities: [],
      },
    });
    const view = renderProcessV1(source);

    const candidate = await screen.findByText("The first reviewed candidate.", {
      selector: ".translation-unit-table__text",
    });
    const candidateRow = candidate.closest<HTMLButtonElement>("button");
    expect(candidateRow).not.toBeNull();
    expect(candidateRow).toHaveAttribute("data-translation-unit-status", "candidate");
    expect(within(candidateRow!).getByText("待审查")).toBeVisible();
    expect(view.container).toHaveTextContent("0 / 10,000 已翻译 · 1 待审查");
    expect(await screen.findByRole("textbox", { name: "译文" })).toHaveValue(
      "The first reviewed candidate.",
    );
    expect(loadRowWindow).toHaveBeenCalled();
    expect(loadRowWindow.mock.calls[0]![0].limit).toBeLessThan(100);
  });

  it("loads initial, middle and final row windows without requesting the 10,000-unit workset", async () => {
    const process = tenThousandUnitProcessV1();
    const { source, loadRowWindow } = presentationSourceV1(process);
    const view = renderProcessV1(source);
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
      expect(request.limit).not.toBe(process.units.length);
    }
    const callsBeforeReturn = loadRowWindow.mock.calls.length;
    scrollTableToOrderV1(viewport!, 0);
    expect(await within(table).findByText("第 1 行等待翻译。")).toBeVisible();
    await waitFor(() => expect(loadRowWindow.mock.calls.length).toBeGreaterThan(callsBeforeReturn));
  });

  it("aborts a superseded visible window instead of accumulating fast-scroll reads", async () => {
    const process = tenThousandUnitProcessV1();
    type RequestV1 = Parameters<TranslationProcessPresentationSourceV1["loadRowWindow"]>[0];
    type WindowV1 = Awaited<
      ReturnType<TranslationProcessPresentationSourceV1["loadRowWindow"]>
    >;
    const pending: {
      readonly request: RequestV1;
      readonly resolve: (window: WindowV1) => void;
      readonly reject: (error: unknown) => void;
    }[] = [];
    const { source } = presentationSourceV1(process, {
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
    const view = renderProcessV1(source);
    const viewport = view.container.querySelector<HTMLElement>(
      ".translation-unit-table__viewport",
    );
    expect(viewport).not.toBeNull();

    await waitFor(() => expect(pending).toHaveLength(1));
    pending[0]!.resolve(readProcessRowWindowV1(process, pending[0]!.request));
    await screen.findByText("第 1 行等待翻译。", {
      selector: ".translation-unit-table__text",
    });

    scrollTableToOrderV1(viewport!, 5_000);
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[1]!.request.signal.aborted).toBe(false);
    scrollTableToOrderV1(viewport!, 9_999);
    await waitFor(() => expect(pending[1]!.request.signal.aborted).toBe(true));
    await waitFor(() => expect(pending).toHaveLength(3));
    pending[2]!.resolve(readProcessRowWindowV1(process, pending[2]!.request));
    expect(
      await screen.findByText("第 10000 行等待翻译。", {
        selector: ".translation-unit-table__text",
      }),
    ).toBeVisible();
  });

  it("keeps candidate drafts across row selection and accepts the complete exact batch", async () => {
    const process = tenThousandUnitProcessV1();
    const firstUnit = process.units[5_000]!;
    const secondUnit = process.units[5_001]!;
    const { source, loadRowWindow } = presentationSourceV1(process, {
      pendingCandidate: {
        candidateId: "candidate.batch.middle",
        firstOrder: firstUnit.order,
        unitCount: 2,
        targets: [
          { unitId: firstUnit.unitId, target: "First model candidate." },
          { unitId: secondUnit.unitId, target: "Second model candidate." },
        ],
        ambiguities: [{
          unitId: firstUnit.unitId,
          question: "Does this line address one person or a group?",
        }],
      },
    });
    const onAcceptCandidate = vi.fn();
    const view = renderProcessV1(source, { onAcceptCandidate });
    const viewport = view.container.querySelector<HTMLElement>(
      ".translation-unit-table__viewport",
    );
    expect(viewport).not.toBeNull();

    expect(await screen.findByRole("textbox", { name: "译文" })).toHaveValue(
      "First model candidate.",
    );
    expect(screen.getByText("Does this line address one person or a group?")).toBeVisible();
    scrollTableToOrderV1(viewport!, 5_000);
    const secondSourceCell = await screen.findByText("第 5002 行等待翻译。", {
      selector: ".translation-unit-table__text",
    });
    fireEvent.change(screen.getByRole("textbox", { name: "译文" }), {
      target: { value: "Human-edited first target." },
    });
    fireEvent.click(secondSourceCell.closest("button")!);
    expect(screen.getByRole("textbox", { name: "译文" })).toHaveValue(
      "Second model candidate.",
    );
    fireEvent.change(screen.getByRole("textbox", { name: "译文" }), {
      target: { value: "Human-edited second target." },
    });
    const firstSourceCell = screen.getByText("第 5001 行等待翻译。", {
      selector: ".translation-unit-table__text",
    });
    fireEvent.click(firstSourceCell.closest("button")!);
    expect(screen.getByRole("textbox", { name: "译文" })).toHaveValue(
      "Human-edited first target.",
    );

    fireEvent.click(screen.getByRole("button", { name: "接受批次" }));
    await waitFor(() => expect(onAcceptCandidate).toHaveBeenCalledTimes(1));
    expect(onAcceptCandidate).toHaveBeenCalledWith({
      expectedWorksetRevision: process.revision,
      candidateId: "candidate.batch.middle",
      targets: [
        { unitId: firstUnit.unitId, target: "Human-edited first target." },
        { unitId: secondUnit.unitId, target: "Human-edited second target." },
      ],
    });
    expect(screen.queryByRole("button", { name: "保存译文" })).toBeNull();
    expect(loadRowWindow.mock.calls.every(([request]) => request.limit < 100)).toBe(true);
  });

  it("rejects the exact candidate reference without changing candidate targets", async () => {
    const process = tenThousandUnitProcessV1();
    const firstUnit = process.units[0]!;
    const { source } = presentationSourceV1(process, {
      pendingCandidate: {
        candidateId: "candidate.batch.reject",
        firstOrder: 0,
        unitCount: 1,
        targets: [{ unitId: firstUnit.unitId, target: "Candidate to reject." }],
        ambiguities: [],
      },
    });
    const onRejectCandidate = vi.fn();
    renderProcessV1(source, { onRejectCandidate });

    expect(await screen.findByRole("textbox", { name: "译文" })).toHaveValue(
      "Candidate to reject.",
    );
    fireEvent.click(screen.getByRole("button", { name: "拒绝候选" }));

    await waitFor(() => expect(onRejectCandidate).toHaveBeenCalledTimes(1));
    expect(onRejectCandidate).toHaveBeenCalledWith({
      expectedWorksetRevision: process.revision,
      candidateId: "candidate.batch.reject",
    });
  });

  it("resets the row cache on workset revision and keeps non-candidate targets read-only", async () => {
    const process = tenThousandUnitProcessV1();
    const first = presentationSourceV1(process);
    const commonProps = {
      processId: "process.translation.concurrent-revision",
      locale: "zh-CN" as const,
      mode: "guided" as const,
      onModeChange: vi.fn(),
      stage: "review" as const,
      run: null,
      conversationSurface: <div>Conversation</div>,
      onImportFile: vi.fn(),
    };
    const view = render(
      <TranslationProgramWorkspaceV1 {...commonProps} translationSource={first.source} />,
    );

    expect(await screen.findByRole("textbox", { name: "译文" })).toHaveAttribute("readonly");
    const second = presentationSourceV1(process, {
      revision: process.revision + 1,
      rowOverride: (row) =>
        row.order === 0
          ? { ...row, source: "修订后的第一行。", target: "Authoritative target" }
          : row,
    });

    view.rerender(
      <TranslationProgramWorkspaceV1 {...commonProps} translationSource={second.source} />,
    );

    expect(
      await screen.findByText("修订后的第一行。", {
        selector: ".translation-unit-table__text",
      }),
    ).toBeVisible();
    expect(second.loadRowWindow).toHaveBeenCalled();
    expect(await screen.findByRole("textbox", { name: "译文" })).toHaveValue(
      "Authoritative target",
    );
    expect(screen.getByRole("textbox", { name: "译文" })).toHaveAttribute("readonly");
  });

  it("shows asynchronous loading and offers a retry after a row-window failure", async () => {
    const process = tenThousandUnitProcessV1();
    let rejectWindows = true;
    const onOperationError = vi.fn();
    const { source } = presentationSourceV1(process, {
      load: async (request) => {
        await Promise.resolve();
        if (rejectWindows) throw new Error("temporary row read failure");
        return readProcessRowWindowV1(process, request);
      },
    });
    const view = render(
      <TranslationProgramWorkspaceV1
        processId="process.translation.retry"
        locale="zh-CN"
        mode="guided"
        onModeChange={vi.fn()}
        translationSource={source}
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
