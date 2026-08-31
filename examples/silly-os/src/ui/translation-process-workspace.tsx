// SPDX-License-Identifier: MIT
import { type ReactNode, useMemo, useState } from "react";

import type { SillyOsCopyV1, SillyOsLocaleV1 } from "../content/copy.ts";
import type { SillyOsThemeModeV1 } from "../product/browser-product-preferences-repository.ts";
import type {
  TranslationActiveProcessProjectionV1,
  TranslationProcessControllerV1,
  TranslationSourceImportStateV1,
} from "../product/translation/translation-process-controller.ts";
import { ChatPaneV1 } from "./chat-pane.tsx";
import type { ProgramRunProjectionV1, ProgramUiModeV1 } from "./program-ui-container.tsx";
import {
  type TranslationProgramImportRequestV1,
  type TranslationProgramWorkspacePropsV1,
  type TranslationProcessPresentationSourceV1,
  TranslationProgramWorkspaceV1,
} from "./translation-program-workspace.tsx";
import { ProgramWorkspaceTopbarV1 } from "./workspace-chrome.tsx";

export interface TranslationProcessWorkspacePropsV1 {
  readonly copy: SillyOsCopyV1;
  readonly activeProcess: TranslationActiveProcessProjectionV1;
  readonly onHome: () => void;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
  readonly theme: SillyOsThemeModeV1;
  readonly onThemeChange: (theme: SillyOsThemeModeV1) => void;
  readonly onOpenSettings?: () => void;
  readonly onImportFile: (
    request: TranslationProgramImportRequestV1,
  ) => void | Promise<void>;
  readonly sourceImport: TranslationSourceImportStateV1;
  readonly onLoadTranslationRowWindow: TranslationProcessControllerV1["loadTranslationRowWindow"];
  readonly agentRun?: ProgramRunProjectionV1 | null;
  readonly onStartTranslation?: () => void | Promise<void>;
  readonly onAcceptCandidate?: TranslationProgramWorkspacePropsV1["onAcceptCandidate"];
  readonly onRejectCandidate?: TranslationProgramWorkspacePropsV1["onRejectCandidate"];
  readonly onOperationError?: (error: unknown) => void;
}

function translationProgramStageV1(
  source: TranslationProcessPresentationSourceV1 | null,
  pendingCandidate: TranslationActiveProcessProjectionV1["pendingCandidate"],
  agentRun: ProgramRunProjectionV1 | null,
  hasActiveAgentAttempt: boolean,
): "import" | "analyze" | "translate" | "review" | "export" {
  if (source === null) return "import";
  if (pendingCandidate !== null) return "review";
  if (hasActiveAgentAttempt || agentRun?.status === "running") return "translate";
  if (source.totalUnitCount > 0 && source.committedUnitCount === source.totalUnitCount) {
    return "export";
  }
  return "analyze";
}

function importRunProjectionV1(
  sourceImport: TranslationSourceImportStateV1,
  workset: TranslationActiveProcessProjectionV1["workset"],
  locale: SillyOsLocaleV1,
): ProgramRunProjectionV1 | null {
  if (sourceImport.phase === "idle") return null;
  if (sourceImport.phase === "failed") {
    return {
      status: "failed",
      label: locale === "zh-CN" ? "导入未完成" : "Import incomplete",
      recentLines: [{
        lineId: `translation-import-failed:${sourceImport.code}`,
        kind: "system",
        text: sourceImport.code,
      }],
    };
  }
  const labels = locale === "zh-CN"
    ? { source: "正在保存原始文件", prepare: "正在建立翻译条目", finalize: "正在完成导入" }
    : {
      source: "Saving the original source",
      prepare: "Preparing translation units",
      finalize: "Finalizing import",
    };
  const label = labels[sourceImport.stage];
  const determinate = workset !== null && sourceImport.stage !== "source"
    ? {
      kind: "determinate" as const,
      completed: sourceImport.stage === "finalize"
        ? workset.expectedUnitCount
        : workset.stagedUnitCount,
      total: workset.expectedUnitCount,
      label: `${String(workset.stagedUnitCount)} / ${String(workset.expectedUnitCount)}`,
    }
    : { kind: "indeterminate" as const, label };
  return {
    status: "running",
    label,
    progress: determinate,
    recentLines: [{
      lineId: `translation-import:${sourceImport.stage}`,
      kind: "tool",
      text: label,
    }],
  };
}

/**
 * Product route for one durable Translation Process. The Program UI Container
 * owns guided/conversation switching; SillyOS keeps navigation and settings
 * outside the Program-rendered surface.
 */
export function TranslationProcessWorkspaceV1({
  copy,
  activeProcess,
  onHome,
  onLocaleChange,
  theme,
  onThemeChange,
  onOpenSettings,
  onImportFile,
  sourceImport,
  onLoadTranslationRowWindow,
  agentRun = null,
  onStartTranslation,
  onAcceptCandidate,
  onRejectCandidate,
  onOperationError,
}: TranslationProcessWorkspacePropsV1): ReactNode {
  const [mode, setMode] = useState<ProgramUiModeV1>("guided");
  const title = activeProcess.subject?.currentProgram.name ?? activeProcess.definition.name;
  const translationSource = useMemo<TranslationProcessPresentationSourceV1 | null>(() => {
    const workset = activeProcess.workset;
    if (workset === null || workset.phase !== "ready") return null;
    return {
      revision: workset.revision,
      title: workset.title,
      documentPurpose: workset.documentPurpose,
      sourceLocale: workset.sourceLocale,
      targetLocale: workset.targetLocale,
      totalUnitCount: workset.expectedUnitCount,
      committedUnitCount: workset.acceptedUnitCount,
      committedBatchCount: workset.acceptedBatchCount,
      glossaryTermCount: workset.stagedGlossaryCount,
      pendingCandidate: activeProcess.pendingCandidate === null ? null : {
        candidateId: activeProcess.pendingCandidate.candidateId,
        firstOrder: activeProcess.pendingCandidate.firstOrder,
        unitCount: activeProcess.pendingCandidate.unitCount,
        targets: activeProcess.pendingCandidate.targets,
        ambiguities: activeProcess.pendingCandidate.ambiguities,
      },
      loadRowWindow: ({ offset, limit, signal }) =>
        onLoadTranslationRowWindow({
          processId: activeProcess.process.processId,
          expectedWorksetRevision: workset.revision,
          offset,
          limit,
          signal,
        }),
    };
  }, [
    activeProcess.pendingCandidate,
    activeProcess.process.processId,
    activeProcess.workset,
    onLoadTranslationRowWindow,
  ]);
  const importRun = importRunProjectionV1(sourceImport, activeProcess.workset, copy.locale);
  const run = importRun ?? agentRun;
  const stage = translationProgramStageV1(
    translationSource,
    activeProcess.pendingCandidate,
    agentRun,
    sourceImport.phase === "idle" && activeProcess.process.activeAttempt !== null,
  );
  const startTranslationDisabled = sourceImport.phase !== "idle" ||
    activeProcess.process.activeAttempt !== null || activeProcess.pendingCandidate !== null ||
    agentRun?.status === "running";

  return (
    <main
      className="program-workspace"
      data-silly-os-view="translation-workspace"
      data-process-id={activeProcess.process.processId}
      data-program-id={activeProcess.process.subjectProgramId ?? undefined}
      data-workspace-id={activeProcess.workspace.workspaceId}
    >
      <ProgramWorkspaceTopbarV1
        copy={copy}
        workspaceTitle={title}
        onHome={onHome}
        onLocaleChange={onLocaleChange}
        theme={theme}
        onThemeChange={onThemeChange}
        {...(onOpenSettings === undefined ? {} : { onOpenSettings })}
      />
      <TranslationProgramWorkspaceV1
        processId={activeProcess.process.processId}
        locale={copy.locale}
        mode={mode}
        onModeChange={setMode}
        translationSource={translationSource}
        stage={stage}
        run={run}
        importPending={sourceImport.phase === "pending"}
        onImportFile={onImportFile}
        startTranslationDisabled={startTranslationDisabled}
        {...(onStartTranslation === undefined ? {} : { onStartTranslation })}
        {...(onAcceptCandidate === undefined ? {} : { onAcceptCandidate })}
        {...(onRejectCandidate === undefined ? {} : { onRejectCandidate })}
        {...(onOperationError === undefined ? {} : { onOperationError })}
        conversationSurface={
          <ChatPaneV1
            copy={copy}
            agentName={activeProcess.definition.name}
            transcript={{ ...activeProcess.transcript, newerOmitted: false, phase: "ready" }}
            proposal={null}
            program={null}
            workspaceReview={null}
            workpieceOpen={false}
            onAccept={() => undefined}
            onReject={() => undefined}
            onOpenWorkpiece={() => undefined}
            onSend={() => false}
            agentInteractionPending
          />
        }
      />
    </main>
  );
}
