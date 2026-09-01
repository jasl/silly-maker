// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { type ComponentProps, useState } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { getSillyOsCopyV1 } from "../../../src/content/copy.ts";
import { translationProgramPackageSourceV1 } from "../distribution/bundled-package-source.ts";
import translationInitialUiSourceV1 from "../package/initial-ui.json" with { type: "json" };
import { prepareTranslationDocumentV1 } from "../runtime/translation-document-codec.ts";
import { admitTranslationInitialUiV1 } from "../runtime/translation-package-facets.ts";
import type { TranslationActiveProcessProjectionV1 } from "../runtime/translation-process-controller.ts";
import { type TranslationProcessUnitProjectionV1 } from "../runtime/translation-process-view.ts";
import { TranslationProcessWorkspaceV1 } from "../ui/translation-process-workspace.tsx";
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
const originalScrollIntoView = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView",
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
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
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
  if (originalScrollIntoView === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  } else {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
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
    readonly onRetranslateCandidate?: (
      input: Parameters<
        NonNullable<
          ComponentProps<typeof TranslationProgramWorkspaceV1>["onRetranslateCandidate"]
        >
      >[0],
    ) => boolean | void | Promise<boolean | void>;
    readonly candidateReviewDisabled?: boolean;
    readonly onOperationError?: (error: unknown) => void;
  } = {},
) {
  function ControlledCandidateDraftHarnessV1() {
    const [candidateDraft, setCandidateDraft] = useState<
      NonNullable<ComponentProps<typeof TranslationProgramWorkspaceV1>["candidateDraft"]> | null
    >(null);
    return (
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
        candidateDraft={candidateDraft}
        onCandidateDraftChange={setCandidateDraft}
        {...(options.onAcceptCandidate === undefined
          ? {}
          : { onAcceptCandidate: options.onAcceptCandidate })}
        {...(options.onRejectCandidate === undefined
          ? {}
          : { onRejectCandidate: options.onRejectCandidate })}
        {...(options.onRetranslateCandidate === undefined
          ? {}
          : { onRetranslateCandidate: options.onRetranslateCandidate })}
        {...(options.candidateReviewDisabled === undefined
          ? {}
          : { candidateReviewDisabled: options.candidateReviewDisabled })}
        {...(options.onOperationError === undefined
          ? {}
          : { onOperationError: options.onOperationError })}
      />
    );
  }
  return render(
    <ControlledCandidateDraftHarnessV1 />,
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

function emptyActiveProcessV1(): TranslationActiveProcessProjectionV1 {
  const processId = "process.translation.settings-default";
  const packageMetadata = translationProgramPackageSourceV1.metadata;
  return {
    process: {
      schemaVersion: 1,
      processId,
      revision: 1,
      programPackage: packageMetadata.reference,
      subjectProgramId: null,
      status: "active",
      transcriptFrontier: 0,
      activeAttempt: null,
      lastTerminalAttempt: null,
      checkpoint: null,
      createdAt: 1,
      updatedAt: 1,
    },
    programPackage: {
      reference: packageMetadata.reference,
      manifest: packageMetadata.manifest,
      instructions: null,
      initialUi: null,
      settings: {
        effective: {
          targetLocale: "en",
          defaultStyle: "Natural target-language prose.",
        },
        effectiveSource: "program_defaults",
        diagnostics: [],
        admittedProcessOverrideJson: null,
      },
    },
    workspace: {
      revision: 1,
      processId,
      workspaceId: "workspace.translation.settings-default",
      volumeId: "volume.translation.settings-default",
      workspaceFormat: 1,
    },
    transcript: {
      entries: [],
      byteLength: 0,
      nextBeforeSequence: null,
      newerOmitted: false,
      phase: "ready",
    },
    workset: null,
    pendingCandidate: null,
  };
}

function readyActiveProcessV1(): TranslationActiveProcessProjectionV1 {
  const base = emptyActiveProcessV1();
  const processId = base.process.processId;
  return {
    ...base,
    process: {
      ...base.process,
      checkpoint: {
        checkpointId: "checkpoint.translation.ready",
        throughSequence: 1,
        workspaceId: base.workspace.workspaceId,
        workspaceCheckpointId: "workspace-checkpoint.translation.ready",
        workspaceGeneration: 1,
      },
    },
    transcript: {
      entries: [{
        schemaVersion: 1,
        processId,
        sequence: 1,
        entryId: "entry.translation.ready",
        role: "system",
        state: "committed",
        parts: [{
          kind: "text_markdown",
          partId: "part.translation.ready",
          markdown: "Translation workspace is ready.",
        }],
      }],
      byteLength: 128,
      nextBeforeSequence: null,
      newerOmitted: false,
      phase: "ready",
    },
    workset: {
      schemaVersion: 2,
      processId,
      importOperationId: "operation.translation.ready",
      revision: 1,
      phase: "ready",
      title: "Ready dialogue",
      document: {
        format: "plain_text",
        capabilityGrade: "round_trip_supported",
        capabilityReason: "known_format",
      },
      source: {
        fileName: "ready.txt",
        mediaType: "text/plain; charset=utf-8",
        workspacePath: "translation-processes/process.translation.settings-default/source.txt",
        byteLength: 12,
        sha256: "a".repeat(64),
      },
      sourceBinding: {
        revision: 1,
        workspaceId: base.workspace.workspaceId,
        volumeId: base.workspace.volumeId,
        workspaceFormat: 1,
        path: "translation-processes/process.translation.settings-default/source.txt",
        checkpointId: "workspace-checkpoint.translation.ready",
        generation: 1,
      },
      sourceLocale: "en",
      targetLocale: "zh-CN",
      documentPurpose: "Dialogue",
      style: "Natural.",
      expectedUnitCount: 1,
      stagedUnitCount: 1,
      expectedGlossaryCount: 0,
      stagedGlossaryCount: 0,
      acceptedUnitCount: 0,
      acceptedBatchCount: 0,
      pendingCandidateId: null,
      createdAt: 1,
      updatedAt: 1,
    },
  };
}

function readyActiveProcessWithPendingCandidateV1(
  candidateId = "candidate.translation.ready",
  target = "早上好。",
): TranslationActiveProcessProjectionV1 {
  const base = readyActiveProcessV1();
  const processId = base.process.processId;
  const sourceUnit = {
    unitId: "unit.translation.ready",
    order: 0,
    locator: "line/1",
    context: null,
    durationMilliseconds: null,
    lineBreakPolicy: "forbidden" as const,
    source: "Good morning.",
    protectedSegments: [],
  };
  return {
    ...base,
    workset: base.workset === null ? null : { ...base.workset, pendingCandidateId: candidateId },
    pendingCandidate: {
      schemaVersion: 2,
      processId,
      candidateId,
      baseWorksetRevision: base.workset?.revision ?? 1,
      firstOrder: 0,
      unitCount: 1,
      request: {
        sourceLocale: "en",
        targetLocale: "zh-CN",
        documentPurpose: "Dialogue",
        style: "Natural.",
        glossary: [],
        confirmedMeaningFacts: [],
        neighboringUnits: { preceding: null, following: null },
        units: [sourceUnit],
      },
      targets: [{ unitId: sourceUnit.unitId, target }],
      ambiguities: [],
      findings: [],
      attemptId: "attempt.translation.ready",
      generation: 1,
      createdAt: 2,
    },
  };
}

function renderReadyTranslationProcessWorkspaceV1(input: {
  readonly locale: "en" | "zh-CN";
  readonly mode?: "guided" | "conversation";
  readonly onSubmitInstruction: (text: string) => boolean | Promise<boolean>;
  readonly onRetranslateCandidate?: NonNullable<
    ComponentProps<typeof TranslationProcessWorkspaceV1>["onRetranslateCandidate"]
  >;
  readonly onLoadOlderTranscript?: () => boolean | Promise<boolean>;
  readonly onReloadLatestTranscript?: () => boolean | Promise<boolean>;
  readonly nextBeforeSequence?: number | null;
  readonly newerOmitted?: boolean;
  readonly pendingCandidate?: boolean;
  readonly activeProcess?: TranslationActiveProcessProjectionV1;
  readonly initialViewState?: ComponentProps<
    typeof TranslationProcessWorkspaceV1
  >["initialViewState"];
  readonly onViewStateChange?: ComponentProps<
    typeof TranslationProcessWorkspaceV1
  >["onViewStateChange"];
  readonly piAgentRun?: ComponentProps<typeof TranslationProcessWorkspaceV1>["piAgentRun"];
}) {
  const activeProcess = input.activeProcess ??
    (input.pendingCandidate ? readyActiveProcessWithPendingCandidateV1() : readyActiveProcessV1());
  return render(
    <TranslationProcessWorkspaceV1
      copy={getSillyOsCopyV1(input.locale)}
      activeProcess={{
        ...activeProcess,
        transcript: {
          ...activeProcess.transcript,
          nextBeforeSequence: input.nextBeforeSequence ?? null,
          newerOmitted: input.newerOmitted ?? false,
        },
      }}
      initialViewState={input.initialViewState ?? {
        mode: input.mode ?? "guided",
        draft: "",
        conversation: {
          scrollAnchor: { kind: "bottom" },
          composerSelectionStart: 0,
          composerSelectionEnd: 0,
        },
        candidateDraft: null,
      }}
      {...(input.onViewStateChange === undefined
        ? {}
        : { onViewStateChange: input.onViewStateChange })}
      onHome={vi.fn()}
      onLocaleChange={vi.fn()}
      theme="system"
      onThemeChange={vi.fn()}
      onImportFile={vi.fn()}
      sourceImport={{ phase: "idle" }}
      onLoadTranslationRowWindow={vi.fn(() =>
        Promise.resolve({
          offset: 0,
          limit: 1,
          totalRowCount: 1,
          rows: [{
            unitId: "unit.translation.ready",
            order: 0,
            locator: "line/1",
            context: null,
            durationMilliseconds: null,
            lineBreakPolicy: "forbidden" as const,
            source: "Good morning.",
            protectedSegments: [],
            target: null,
          }],
          nextOffset: null,
        })
      )}
      onSubmitInstruction={input.onSubmitInstruction}
      {...(input.piAgentRun === undefined ? {} : { piAgentRun: input.piAgentRun })}
      {...(input.onRetranslateCandidate === undefined
        ? {}
        : { onRetranslateCandidate: input.onRetranslateCandidate })}
      {...(input.onLoadOlderTranscript === undefined
        ? {}
        : { onLoadOlderTranscript: input.onLoadOlderTranscript })}
      {...(input.onReloadLatestTranscript === undefined
        ? {}
        : { onReloadLatestTranscript: input.onReloadLatestTranscript })}
    />,
  );
}

describe("SillyOS Translation Program workspace", () => {
  it("routes the admitted package OpenUI action through the ordinary instruction callback", async () => {
    const process = tenThousandUnitProcessV1();
    const { source } = presentationSourceV1(process);
    const initialUi = admitTranslationInitialUiV1(translationInitialUiSourceV1);
    const onSubmitInstruction = vi.fn(() => Promise.resolve(true));
    expect(initialUi).not.toBeNull();

    render(
      <TranslationProgramWorkspaceV1
        processId="process.translation.openui"
        locale="zh-CN"
        mode="guided"
        onModeChange={vi.fn()}
        translationSource={source}
        stage="analyze"
        run={null}
        initialUi={initialUi}
        conversationSurface={<div>Conversation</div>}
        onImportFile={vi.fn()}
        onSubmitInstruction={onSubmitInstruction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "翻译下一批" }));
    await waitFor(() => expect(onSubmitInstruction).toHaveBeenCalledTimes(1));
    expect(onSubmitInstruction).toHaveBeenCalledWith(
      "翻译下一批已准备好的内容。保持原意、人物关系、术语、格式和受保护标记，并返回可供审阅的候选结果。",
    );
  });

  it("loads older Conversation pages through the Process callback", () => {
    const onLoadOlderTranscript = vi.fn(() => Promise.resolve(true));
    renderReadyTranslationProcessWorkspaceV1({
      locale: "en",
      mode: "conversation",
      onSubmitInstruction: vi.fn(() => true),
      onLoadOlderTranscript,
      nextBeforeSequence: 1,
    });

    fireEvent.click(screen.getByRole("button", { name: "Load earlier messages" }));

    expect(onLoadOlderTranscript).toHaveBeenCalledOnce();
  });

  it("returns an older bounded Conversation window to the latest Process page", () => {
    const onReloadLatestTranscript = vi.fn(() => Promise.resolve(true));
    renderReadyTranslationProcessWorkspaceV1({
      locale: "en",
      mode: "conversation",
      onSubmitInstruction: vi.fn(() => true),
      onReloadLatestTranscript,
      newerOmitted: true,
    });

    fireEvent.click(screen.getByRole("button", { name: "Jump to latest messages" }));
    expect(onReloadLatestTranscript).toHaveBeenCalledOnce();
  });

  it("submits Conversation and localized guided instructions through one Process callback", async () => {
    const onSubmitInstruction = vi.fn(() => Promise.resolve(true));
    renderReadyTranslationProcessWorkspaceV1({
      locale: "en",
      mode: "conversation",
      onSubmitInstruction,
    });

    const composer = screen.getByLabelText("Ask for a change…");
    fireEvent.change(composer, {
      target: { value: "Use a restrained, formal voice for this batch." },
    });
    fireEvent.keyDown(composer, { key: "Enter" });
    await waitFor(() => expect(onSubmitInstruction).toHaveBeenCalledTimes(1));
    expect(onSubmitInstruction).toHaveBeenNthCalledWith(
      1,
      "Use a restrained, formal voice for this batch.",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Simple" }));
    fireEvent.click(screen.getByRole("button", { name: "Start translation" }));
    await waitFor(() => expect(onSubmitInstruction).toHaveBeenCalledTimes(2));
    expect(onSubmitInstruction).toHaveBeenNthCalledWith(
      2,
      "Translate the next batch using the current settings, and check terminology, relationships, negation, and references before submitting the candidate.",
    );

    cleanup();
    const onSubmitChineseInstruction = vi.fn(() => Promise.resolve(true));
    renderReadyTranslationProcessWorkspaceV1({
      locale: "zh-CN",
      onSubmitInstruction: onSubmitChineseInstruction,
    });
    fireEvent.click(screen.getByRole("button", { name: "开始翻译" }));
    await waitFor(() => expect(onSubmitChineseInstruction).toHaveBeenCalledTimes(1));
    expect(onSubmitChineseInstruction).toHaveBeenCalledWith(
      "请按照当前设置翻译下一批内容，并在提交候选前检查术语、人物关系、否定和指代。",
    );
  });

  it("projects a live follow-up draft in the same Process Conversation", () => {
    renderReadyTranslationProcessWorkspaceV1({
      locale: "en",
      mode: "conversation",
      onSubmitInstruction: vi.fn(() => true),
      piAgentRun: {
        runtime: "pi_provider",
        status: "running",
        draft: "Reviewing the completed translation…",
        diagnosticPath: null,
        onCancel: vi.fn(),
        onForget: vi.fn(),
      },
    });

    expect(screen.getByText("Reviewing the completed translation…")).toBeVisible();
    expect(document.querySelector("[data-pi-agent-run-status='running']")).not.toBeNull();
  });

  it("keeps Conversation available for an explicit instruction while the same Process has a candidate", async () => {
    const onSubmitInstruction = vi.fn(() => Promise.resolve(true));
    const onRetranslateCandidate = vi.fn(() => Promise.resolve(true));
    const view = renderReadyTranslationProcessWorkspaceV1({
      locale: "en",
      mode: "guided",
      pendingCandidate: true,
      onSubmitInstruction,
      onRetranslateCandidate,
    });

    const target = await screen.findByRole("textbox", { name: "Target" });
    fireEvent.change(target, { target: { value: "Good day." } });
    fireEvent.click(screen.getByRole("tab", { name: "Conversation" }));
    const composer = screen.getByLabelText("Ask for a change…");
    expect(composer).toBeEnabled();
    fireEvent.change(composer, {
      target: { value: "Keep the clock reference literal and retranslate this batch." },
    });
    fireEvent.keyDown(composer, { key: "Enter" });

    await waitFor(() =>
      expect(onRetranslateCandidate).toHaveBeenCalledWith({
        expectedWorksetRevision: 1,
        candidateId: "candidate.translation.ready",
        targets: [{ unitId: "unit.translation.ready", target: "Good day." }],
        instruction: "Keep the clock reference literal and retranslate this batch.",
      })
    );
    expect(onSubmitInstruction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: "Simple" }));
    expect(await screen.findByRole("textbox", { name: "Target" })).toHaveValue("Good day.");
    expect(view.container.querySelector("[data-process-id='process.translation.settings-default']"))
      .not.toBeNull();
  });

  it("restores the visible candidate draft when the same workspace session reopens", async () => {
    type ViewStateV1 = NonNullable<
      ComponentProps<typeof TranslationProcessWorkspaceV1>["initialViewState"]
    >;
    let retainedViewState: ViewStateV1 | undefined;
    const first = renderReadyTranslationProcessWorkspaceV1({
      locale: "en",
      pendingCandidate: true,
      onSubmitInstruction: vi.fn(() => true),
      onRetranslateCandidate: vi.fn(() => true),
      onViewStateChange: (next) => {
        retainedViewState = next;
      },
    });

    fireEvent.change(await screen.findByRole("textbox", { name: "Target" }), {
      target: { value: "Session-local reviewed target." },
    });
    await waitFor(() =>
      expect(retainedViewState?.candidateDraft?.targets[0]?.target).toBe(
        "Session-local reviewed target.",
      )
    );
    first.unmount();

    renderReadyTranslationProcessWorkspaceV1({
      locale: "en",
      pendingCandidate: true,
      onSubmitInstruction: vi.fn(() => true),
      onRetranslateCandidate: vi.fn(() => true),
      initialViewState: retainedViewState,
    });
    expect(await screen.findByRole("textbox", { name: "Target" })).toHaveValue(
      "Session-local reviewed target.",
    );
  });

  it("does not apply a session draft to a successor candidate ID", async () => {
    renderReadyTranslationProcessWorkspaceV1({
      locale: "en",
      activeProcess: readyActiveProcessWithPendingCandidateV1(
        "candidate.translation.successor",
        "Successor target.",
      ),
      onSubmitInstruction: vi.fn(() => true),
      onRetranslateCandidate: vi.fn(() => true),
      initialViewState: {
        mode: "guided",
        draft: "",
        conversation: {
          scrollAnchor: { kind: "bottom" },
          composerSelectionStart: 0,
          composerSelectionEnd: 0,
        },
        candidateDraft: {
          candidateId: "candidate.translation.predecessor",
          targets: [{
            unitId: "unit.translation.ready",
            target: "Stale predecessor edit.",
          }],
        },
      },
    });

    expect(await screen.findByRole("textbox", { name: "Target" })).toHaveValue(
      "Successor target.",
    );
  });

  it("keeps an untouched zh-CN intake target when the settings draft is saved", async () => {
    const onUpdateSettingsOverride = vi.fn((json: string | null) => {
      const effective = json === null
        ? {
          targetLocale: "en",
          defaultStyle: "Natural target-language prose.",
        }
        : JSON.parse(json) as {
          targetLocale: string;
          defaultStyle: string;
        };
      return Promise.resolve({
        kind: "completed" as const,
        value: {
          kind: "saved" as const,
          settings: {
            effective,
            effectiveSource: json === null
              ? "program_defaults" as const
              : "process_override" as const,
            diagnostics: [],
            admittedProcessOverrideJson: json,
          },
        },
      });
    });
    render(
      <TranslationProcessWorkspaceV1
        copy={getSillyOsCopyV1("zh-CN")}
        activeProcess={emptyActiveProcessV1()}
        onHome={vi.fn()}
        onLocaleChange={vi.fn()}
        theme="system"
        onThemeChange={vi.fn()}
        onImportFile={vi.fn()}
        sourceImport={{ phase: "idle" }}
        onLoadTranslationRowWindow={vi.fn()}
        onUpdateSettingsOverride={onUpdateSettingsOverride}
      />,
    );

    expect(screen.getByLabelText("目标语言")).toHaveValue("zh-CN");
    fireEvent.click(screen.getByRole("button", { name: "Process 设置" }));
    const draft = screen.getByLabelText("目标语言与默认风格（JSON）") as HTMLTextAreaElement;
    expect(JSON.parse(draft.value)).toMatchObject({ targetLocale: "zh-CN" });
    fireEvent.click(screen.getByRole("button", { name: "保存覆盖" }));

    await waitFor(() => expect(onUpdateSettingsOverride).toHaveBeenCalledTimes(1));
    expect(JSON.parse(onUpdateSettingsOverride.mock.calls[0]![0]!)).toMatchObject({
      targetLocale: "zh-CN",
    });

    fireEvent.click(screen.getByRole("button", { name: "恢复默认值" }));
    await waitFor(() => expect(onUpdateSettingsOverride).toHaveBeenCalledTimes(2));
    expect(onUpdateSettingsOverride.mock.calls[1]![0]).toBeNull();
    expect(JSON.parse(draft.value)).toMatchObject({ targetLocale: "zh-CN" });
    expect(screen.getByText("已恢复当前界面语言对应的目标语言和 Program 默认风格。"))
      .toBeInTheDocument();
  });

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
    fireEvent.change(screen.getByLabelText("目标语言"), { target: { value: "fr-ca" } });
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

  it.each(
    [
      ["en", "en"],
      ["zh-CN", "zh-CN"],
    ] as const,
  )("uses the %s Host locale as the untouched intake target", (locale, targetLocale) => {
    render(
      <TranslationProgramWorkspaceV1
        processId={`process.translation.default.${locale}`}
        locale={locale}
        mode="guided"
        onModeChange={vi.fn()}
        translationSource={null}
        stage="import"
        run={null}
        conversationSurface={<div>Conversation</div>}
        onImportFile={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(locale === "zh-CN" ? "目标语言" : "Target language"))
      .toHaveValue(targetLocale);
  });

  it("follows a Host locale change only until the user edits the target", async () => {
    const props = {
      processId: "process.translation.locale-change",
      mode: "guided" as const,
      onModeChange: vi.fn(),
      translationSource: null,
      stage: "import" as const,
      run: null,
      conversationSurface: <div>Conversation</div>,
      onImportFile: vi.fn(),
    };
    const view = render(<TranslationProgramWorkspaceV1 {...props} locale="en" />);

    view.rerender(<TranslationProgramWorkspaceV1 {...props} locale="zh-CN" />);
    await waitFor(() => expect(screen.getByLabelText("目标语言")).toHaveValue("zh-CN"));

    fireEvent.change(screen.getByLabelText("目标语言"), { target: { value: "ja" } });
    view.rerender(<TranslationProgramWorkspaceV1 {...props} locale="en" />);
    expect(screen.getByLabelText("Target language")).toHaveValue("ja");
  });

  it("uses exact package copy, then its declared fallback, inside the Host container", () => {
    const initialUi = {
      schemaVersion: 3 as const,
      surface: "translation.workspace.v1" as const,
      defaultLocale: "en" as const,
      locales: {
        en: {
          intakeDocument: {
            schemaVersion: 1 as const,
            documentId: "translation.test.intake",
            revision: 1,
            root: {
              kind: "stack" as const,
              gap: "regular" as const,
              children: [{
                kind: "heading" as const,
                level: 1 as const,
                text: "Package intake title",
              }, {
                kind: "text" as const,
                tone: "muted" as const,
                text: "Package intake description.",
              }],
            },
          },
          workbenchDocument: {
            schemaVersion: 1 as const,
            documentId: "translation.test.workbench",
            revision: 1,
            root: { kind: "stack" as const, gap: "regular" as const, children: [] },
          },
          dropLabel: "Package drop label",
          formatNote: "Package format note.",
          chooseFileLabel: "Package choose file",
          sourceLanguageLabel: "Package source language",
          targetLanguageLabel: "Package target language",
        },
      },
    };
    render(
      <TranslationProgramWorkspaceV1
        processId="process.translation.package-copy"
        locale="zh-CN"
        mode="guided"
        onModeChange={vi.fn()}
        translationSource={null}
        stage="import"
        run={null}
        initialUi={initialUi}
        conversationSurface={<div>Conversation</div>}
        onImportFile={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Package intake title" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Package choose file" })).toBeInTheDocument();
  });

  it("offers common targets without making them an allowlist or suggesting auto as a target", () => {
    const onImportFile = vi.fn();
    const view = render(
      <TranslationProgramWorkspaceV1
        processId="process.translation.language-scope"
        locale="en"
        mode="guided"
        onModeChange={vi.fn()}
        translationSource={null}
        stage="import"
        run={null}
        conversationSurface={<div>Conversation</div>}
        onImportFile={onImportFile}
      />,
    );
    const targetInput = screen.getByLabelText("Target language");
    const targetList = view.container.querySelector<HTMLDataListElement>(
      `#${targetInput.getAttribute("list") ?? "missing"}`,
    );

    expect(targetList).not.toBeNull();
    expect(
      [...targetList!.querySelectorAll("option")].map((option) => [option.value, option.text]),
    ).toEqual(expect.arrayContaining([
      ["zh-TW", "Chinese (Traditional)"],
      ["uk", "Ukrainian"],
    ]));
    expect([...targetList!.querySelectorAll("option")].some((option) => option.value === "auto"))
      .toBe(false);
    expect(view.container).toHaveTextContent(
      "Translation into Chinese and English is in the quality-validation scope.",
    );

    fireEvent.change(targetInput, { target: { value: "auto" } });
    const file = new File(["Text"], "source.txt", { type: "text/plain" });
    const fileInput = view.container.querySelector<HTMLInputElement>('input[type="file"]');
    fireEvent.change(fileInput!, { target: { files: [file] } });

    expect(onImportFile).not.toHaveBeenCalled();
    expect(screen.getByText(/BCP 47 language, script, region, or variant target/u))
      .toBeInTheDocument();
  });

  it("starts one translation run and disables the action while its callback is pending", async () => {
    const process = tenThousandUnitProcessV1();
    const { source } = presentationSourceV1(process);
    let finishStart!: () => void;
    const onSubmitInstruction = vi.fn(() =>
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
        onSubmitInstruction={onSubmitInstruction}
      />,
    );

    const start = screen.getByRole("button", { name: "Start translation" });
    fireEvent.click(start);
    fireEvent.click(start);

    expect(onSubmitInstruction).toHaveBeenCalledTimes(1);
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
        findings: [],
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

  it("separates mechanical warnings from model ambiguities and retranslates the edited candidate", async () => {
    const process = tenThousandUnitProcessV1();
    const firstUnit = process.units[0]!;
    const { source } = presentationSourceV1(process, {
      pendingCandidate: {
        candidateId: "candidate.batch.qa",
        firstOrder: 0,
        unitCount: 1,
        targets: [{ unitId: firstUnit.unitId, target: firstUnit.source }],
        ambiguities: [{
          unitId: firstUnit.unitId,
          question: "Is this narration or dialogue?",
        }],
        findings: [{
          code: "source_target_identical",
          severity: "warning",
          unitId: firstUnit.unitId,
        }, {
          code: "model_ambiguity",
          severity: "review",
          unitId: firstUnit.unitId,
          question: "Is this narration or dialogue?",
        }],
      },
    });
    const onRetranslateCandidate = vi.fn(() => Promise.resolve(true));
    renderProcessV1(source, { onRetranslateCandidate });

    expect(await screen.findByText("译文与原文完全相同。")).toBeVisible();
    expect(screen.getByText("1 个机械审查提示")).toBeVisible();
    expect(screen.getByText("1 个模型歧义")).toBeVisible();
    expect(screen.getByText("Is this narration or dialogue?")).toBeVisible();
    expect(screen.getByText("模型请求澄清")).toBeVisible();

    fireEvent.change(screen.getByRole("textbox", { name: "译文" }), {
      target: { value: "A reviewed direction for retranslation." },
    });
    fireEvent.click(screen.getByRole("button", { name: "重新翻译候选" }));

    await waitFor(() => expect(onRetranslateCandidate).toHaveBeenCalledTimes(1));
    expect(onRetranslateCandidate).toHaveBeenCalledWith({
      expectedWorksetRevision: process.revision,
      candidateId: "candidate.batch.qa",
      targets: [{
        unitId: firstUnit.unitId,
        target: "A reviewed direction for retranslation.",
      }],
      instruction: null,
    });
  });

  it("renders a possible refusal as a review signal without blocking acceptance", async () => {
    const process = tenThousandUnitProcessV1();
    const firstUnit = process.units[0]!;
    const { source } = presentationSourceV1(process, {
      pendingCandidate: {
        candidateId: "candidate.batch.refusal-signal",
        firstOrder: 0,
        unitCount: 1,
        targets: [{ unitId: firstUnit.unitId, target: "抱歉，我无法协助翻译这段内容。" }],
        ambiguities: [],
        findings: [{
          code: "target_looks_like_refusal",
          severity: "warning",
          unitId: firstUnit.unitId,
          matchedPattern: "zh.cannot_translate",
        }],
      },
    });
    renderProcessV1(source, { onAcceptCandidate: vi.fn(() => Promise.resolve()) });

    expect(await screen.findByText("译文疑似出现明确拒绝话术，请对照原文审查。"))
      .toBeVisible();
    expect(screen.getByRole("button", { name: "接受批次" })).toBeEnabled();
  });

  it("keeps the predecessor visible and disables review actions during retranslation", async () => {
    const process = tenThousandUnitProcessV1();
    const firstUnit = process.units[0]!;
    const { source } = presentationSourceV1(process, {
      pendingCandidate: {
        candidateId: "candidate.batch.retranslation-running",
        firstOrder: 0,
        unitCount: 1,
        targets: [{ unitId: firstUnit.unitId, target: "Predecessor stays reviewable." }],
        ambiguities: [],
        findings: [{
          code: "number_tokens_changed",
          severity: "warning",
          unitId: firstUnit.unitId,
          sourceTokens: ["1"],
          targetTokens: [],
        }],
      },
    });
    renderProcessV1(source, {
      candidateReviewDisabled: true,
      onAcceptCandidate: vi.fn(),
      onRejectCandidate: vi.fn(),
      onRetranslateCandidate: vi.fn(),
    });

    expect(await screen.findByRole("textbox", { name: "译文" })).toHaveValue(
      "Predecessor stays reviewable.",
    );
    expect(
      screen.getByText(
        /日期本地化或数字文字化可能导致合理差异/u,
      ),
    ).toBeVisible();
    expect(screen.getByText("正在重译；新候选准备好之前，当前候选会继续保留。"))
      .toBeVisible();
    expect(screen.getByRole("button", { name: "拒绝候选" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "重新翻译候选" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "接受批次" })).toBeDisabled();
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
        findings: [{
          code: "model_ambiguity",
          severity: "review",
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
        findings: [],
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
