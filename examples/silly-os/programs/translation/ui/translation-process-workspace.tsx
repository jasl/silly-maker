// SPDX-License-Identifier: MIT
import { RotateCcw, Save, Settings2, X } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import type { SillyOsCopyV1, SillyOsLocaleV1 } from "../../../src/content/copy.ts";
import type { SillyOsThemeModeV1 } from "../../../src/application/preferences/browser-product-preferences-repository.ts";
import type {
  TranslationActiveProcessProjectionV1,
  TranslationProcessControllerV1,
  TranslationSourceImportStateV1,
} from "../runtime/translation-process-controller.ts";
import type {
  ProgramRunProjectionV1,
  ProgramUiModeV1,
} from "../../../src/program-platform/ui/program-ui-container.tsx";
import { ButtonV1 as Button, IconButtonV1 } from "../../../src/ui/design-system/button.tsx";
import {
  FieldDescriptionV1,
  FieldErrorV1,
  FieldLabelV1,
  FieldV1,
} from "../../../src/ui/design-system/field.tsx";
import { TextareaV1 } from "../../../src/ui/design-system/textarea.tsx";
import { ChatPaneV1 } from "../../../src/ui/chat-pane.tsx";
import {
  type TranslationProgramImportRequestV1,
  type TranslationProgramWorkspacePropsV1,
  type TranslationProcessPresentationSourceV1,
  TranslationProgramWorkspaceV1,
} from "./translation-program-workspace.tsx";
import { ProgramWorkspaceTopbarV1 } from "../../../src/ui/workspace-chrome.tsx";

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
  readonly onUpdateSettingsOverride?: TranslationProcessControllerV1["updateSettingsOverride"];
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
  onUpdateSettingsOverride,
  onAcceptCandidate,
  onRejectCandidate,
  onOperationError,
}: TranslationProcessWorkspacePropsV1): ReactNode {
  const [mode, setMode] = useState<ProgramUiModeV1>("guided");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState("");
  const [settingsPending, setSettingsPending] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<
    { readonly kind: "saved" | "error"; readonly text: string } | null
  >(null);
  const title = activeProcess.programPackage.manifest.name;
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

  const settingsCopy = copy.locale === "zh-CN"
    ? {
      action: "Process 设置",
      title: "翻译 Process 设置",
      description:
        "这是当前 Process 的完整 JSON 覆盖，只支持 targetLocale 和 defaultStyle；创建翻译工作集时会读取这两个值。",
      field: "目标语言与默认风格（JSON）",
      defaultNote:
        "清除覆盖后会恢复这个 Program 包内的默认值。无效 JSON 不会被保存，也不会阻止对话继续。",
      save: "保存覆盖",
      clear: "恢复默认值",
      close: "关闭设置",
      saved: "设置已保存；之后导入的源文件会使用这些默认值。",
      cleared: "已恢复 Program 默认值。",
      stale: "设置已在其他页面更新，请关闭后重新打开再试。",
      failed: "设置未保存。",
      invalid: "无效设置；请检查：",
    }
    : {
      action: "Process settings",
      title: "Translation Process settings",
      description:
        "This complete Process override supports only targetLocale and defaultStyle; both are read when the translation workset is created.",
      field: "Target locale and default style (JSON)",
      defaultNote:
        "Clearing the override restores this Program package's defaults. Invalid JSON is not saved and never blocks the conversation.",
      save: "Save override",
      clear: "Use defaults",
      close: "Close settings",
      saved: "Settings saved. A subsequently imported source will use these defaults.",
      cleared: "Program defaults restored.",
      stale: "Another page changed these settings. Close and reopen before trying again.",
      failed: "Settings were not saved.",
      invalid: "Invalid settings. Check:",
    };

  const openProcessSettingsV1 = (): void => {
    const current = activeProcess.programPackage.settings.admittedProcessOverrideJson;
    const json = current ?? JSON.stringify(activeProcess.programPackage.settings.effective);
    try {
      setSettingsDraft(JSON.stringify(JSON.parse(json), null, 2));
    } catch {
      setSettingsDraft(JSON.stringify(activeProcess.programPackage.settings.effective, null, 2));
    }
    setSettingsMessage(null);
    setSettingsOpen(true);
  };

  const updateProcessSettingsV1 = async (json: string | null): Promise<void> => {
    if (onUpdateSettingsOverride === undefined || settingsPending) return;
    setSettingsPending(true);
    setSettingsMessage(null);
    try {
      const result = await onUpdateSettingsOverride(json);
      if (result.kind === "busy") {
        setSettingsMessage({ kind: "error", text: settingsCopy.failed });
        return;
      }
      if (result.kind === "failed") {
        setSettingsMessage({ kind: "error", text: `${settingsCopy.failed} (${result.code})` });
        return;
      }
      if (result.value.kind === "stale") {
        setSettingsMessage({ kind: "error", text: settingsCopy.stale });
        return;
      }
      if (result.value.kind === "invalid") {
        const paths = result.value.settings.diagnostics
          .filter((diagnostic) => diagnostic.source === "process_override")
          .map((diagnostic) => diagnostic.path)
          .join(", ");
        setSettingsMessage({
          kind: "error",
          text: `${settingsCopy.invalid} ${paths || "/"}`,
        });
        return;
      }
      const savedJson = result.value.settings.admittedProcessOverrideJson;
      const effective = result.value.settings.effective;
      setSettingsDraft(
        JSON.stringify(savedJson === null ? effective : JSON.parse(savedJson), null, 2),
      );
      setSettingsMessage({
        kind: "saved",
        text: json === null ? settingsCopy.cleared : settingsCopy.saved,
      });
    } catch (error) {
      onOperationError?.(error);
      setSettingsMessage({ kind: "error", text: settingsCopy.failed });
    } finally {
      setSettingsPending(false);
    }
  };

  return (
    <main
      className="program-workspace"
      data-silly-os-view="translation-workspace"
      data-process-id={activeProcess.process.processId}
      data-program-id={activeProcess.process.programPackage.programId}
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
        toolbarActions={onUpdateSettingsOverride === undefined || activeProcess.workset !== null
          ? undefined
          : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              icon={Settings2}
              aria-haspopup="dialog"
              aria-expanded={settingsOpen}
              onClick={openProcessSettingsV1}
            >
              {settingsCopy.action}
            </Button>
          )}
        overlaySurface={settingsOpen && activeProcess.workset === null
          ? (
            <div className="translation-process-settings__backdrop">
              <section
                className="translation-process-settings"
                role="dialog"
                aria-modal="true"
                aria-labelledby="translation-process-settings-title"
              >
                <header>
                  <div>
                    <h2 id="translation-process-settings-title">{settingsCopy.title}</h2>
                    <p>{settingsCopy.description}</p>
                  </div>
                  <IconButtonV1
                    type="button"
                    size="sm"
                    variant="ghost"
                    icon={X}
                    accessibleName={settingsCopy.close}
                    onClick={() => setSettingsOpen(false)}
                  />
                </header>
                <FieldV1>
                  <FieldLabelV1 htmlFor="translation-process-settings-json">
                    {settingsCopy.field}
                  </FieldLabelV1>
                  <TextareaV1
                    id="translation-process-settings-json"
                    className="translation-process-settings__editor"
                    value={settingsDraft}
                    spellCheck={false}
                    disabled={settingsPending}
                    onChange={(event) => {
                      setSettingsDraft(event.currentTarget.value);
                      setSettingsMessage(null);
                    }}
                  />
                  <FieldDescriptionV1>{settingsCopy.defaultNote}</FieldDescriptionV1>
                  {settingsMessage === null
                    ? null
                    : settingsMessage.kind === "error"
                    ? <FieldErrorV1>{settingsMessage.text}</FieldErrorV1>
                    : (
                      <p className="translation-process-settings__success" role="status">
                        {settingsMessage.text}
                      </p>
                    )}
                </FieldV1>
                <footer>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={RotateCcw}
                    disabled={settingsPending}
                    onClick={() => void updateProcessSettingsV1(null)}
                  >
                    {settingsCopy.clear}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    icon={Save}
                    disabled={settingsPending}
                    onClick={() => void updateProcessSettingsV1(settingsDraft)}
                  >
                    {settingsCopy.save}
                  </Button>
                </footer>
              </section>
            </div>
          )
          : undefined}
        initialUi={activeProcess.programPackage.initialUi}
        defaultTargetLocale={activeProcess.programPackage.settings.effective.targetLocale}
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
            agentName={title}
            transcript={{ ...activeProcess.transcript, newerOmitted: false, phase: "ready" }}
            onSend={() => false}
            agentInteractionPending
          />
        }
      />
    </main>
  );
}
