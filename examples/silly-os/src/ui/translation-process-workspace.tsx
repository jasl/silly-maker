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
  type TranslationProjectPresentationSourceV1,
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
  readonly onLoadProjectRowWindow: TranslationProcessControllerV1["loadProjectRowWindow"];
  readonly onOperationError?: (error: unknown) => void;
}

function importRunProjectionV1(
  sourceImport: TranslationSourceImportStateV1,
  project: TranslationActiveProcessProjectionV1["project"],
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
    ? { source: "正在保存原始文件", project: "正在建立翻译条目", finalize: "正在完成导入" }
    : {
      source: "Saving the original source",
      project: "Preparing translation units",
      finalize: "Finalizing import",
    };
  const label = labels[sourceImport.stage];
  const determinate = project !== null && sourceImport.stage !== "source"
    ? {
      kind: "determinate" as const,
      completed: sourceImport.stage === "finalize"
        ? project.expectedUnitCount
        : project.stagedUnitCount,
      total: project.expectedUnitCount,
      label: `${String(project.stagedUnitCount)} / ${String(project.expectedUnitCount)}`,
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
  onLoadProjectRowWindow,
  onOperationError,
}: TranslationProcessWorkspacePropsV1): ReactNode {
  const [mode, setMode] = useState<ProgramUiModeV1>("guided");
  const title = activeProcess.subject?.currentProgram.name ?? activeProcess.definition.name;
  const projectSource = useMemo<TranslationProjectPresentationSourceV1 | null>(() => {
    const project = activeProcess.project;
    if (project === null || project.phase !== "ready") return null;
    return {
      projectId: project.projectId,
      revision: project.revision,
      title: project.title,
      documentPurpose: project.documentPurpose,
      sourceLocale: project.sourceLocale,
      targetLocale: project.targetLocale,
      totalUnitCount: project.expectedUnitCount,
      committedUnitCount: 0,
      committedBatchCount: 0,
      glossaryTermCount: project.stagedGlossaryCount,
      loadRowWindow: ({ offset, limit, signal }) =>
        onLoadProjectRowWindow({
          processId: activeProcess.process.processId,
          expectedProjectRevision: project.revision,
          offset,
          limit,
          signal,
        }),
    };
  }, [activeProcess.process.processId, activeProcess.project, onLoadProjectRowWindow]);
  const run = importRunProjectionV1(sourceImport, activeProcess.project, copy.locale);

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
        projectSource={projectSource}
        stage={projectSource === null ? "import" : "analyze"}
        run={run}
        importPending={sourceImport.phase === "pending"}
        onImportFile={onImportFile}
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
