// SPDX-License-Identifier: MIT
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  CheckCircle2,
  Download,
  FileText,
  Languages,
  Play,
  Save,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  projectTranslationProgressV1,
  readTranslationProjectRowWindowV1,
  type TranslationProjectUnitV1,
  type TranslationProjectV1,
} from "../product/translation/translation-project.ts";
import { BadgeV1 } from "./design-system/badge.tsx";
import { ButtonV1 as Button } from "./design-system/button.tsx";
import { FieldLabelV1, FieldV1 } from "./design-system/field.tsx";
import { InputV1 } from "./design-system/input.tsx";
import { ProgressV1 as Progress } from "./design-system/progress.tsx";
import { TextareaV1 } from "./design-system/textarea.tsx";
import {
  type ProgramRunProjectionV1,
  ProgramUiContainerV1,
  type ProgramUiModeV1,
} from "./program-ui-container.tsx";
import "./translation-program-workspace.css";

export type TranslationProgramStageV1 =
  | "import"
  | "analyze"
  | "translate"
  | "review"
  | "export";

export interface TranslationProgramImportRequestV1 {
  readonly file: File;
  readonly sourceLocale: string;
  readonly targetLocale: string;
}

export interface TranslationProgramWorkspacePropsV1 {
  readonly processId: string;
  readonly locale: "en" | "zh-CN";
  readonly mode: ProgramUiModeV1;
  readonly onModeChange: (mode: ProgramUiModeV1) => void;
  readonly project: TranslationProjectV1 | null;
  readonly stage: TranslationProgramStageV1;
  readonly run: ProgramRunProjectionV1 | null;
  readonly conversationSurface: ReactNode;
  readonly overlaySurface?: ReactNode;
  readonly importPending?: boolean;
  readonly onImportFile: (request: TranslationProgramImportRequestV1) => void | Promise<void>;
  readonly onStartTranslation?: () => void | Promise<void>;
  readonly onSaveTarget?: (
    unit: TranslationProjectUnitV1,
    target: string,
  ) => void | Promise<void>;
  readonly onExport?: () => void | Promise<void>;
  readonly onOperationError?: (error: unknown) => void;
}

const translationProgramCopyV1 = {
  en: {
    guided: "Simple",
    conversation: "Conversation",
    stages: ["Import", "Analyze", "Translate", "Review", "Export"],
    importTitle: "Start a translation project",
    importDescription:
      "Import one source file. SillyOS detects its structure, preserves the original, and prepares stable units before the Agent runs.",
    chooseFile: "Choose file",
    dropFile: "Drop a TXT, Markdown, SRT, JSON, or born-digital PDF here",
    supportedFormats:
      "Structure is confirmed after import; unsupported files are not sent to the model.",
    sourceLanguage: "Source language",
    targetLanguage: "Target language",
    automatic: "Detect automatically",
    units: "units",
    translated: "translated",
    batches: "committed batches",
    glossary: "glossary terms",
    source: "Source",
    target: "Target",
    status: "Status",
    pending: "Pending",
    committed: "Committed",
    row: "Unit",
    details: "Unit details",
    saveTarget: "Save target",
    startTranslation: "Start translation",
    export: "Export",
    targetPlaceholder: "Translation appears here after a committed batch, or can be edited here.",
    noUnits: "This document has no translatable units.",
    exactProgress: "Exact mechanical progress",
  },
  "zh-CN": {
    guided: "简单",
    conversation: "对话",
    stages: ["导入", "分析", "翻译", "审查", "导出"],
    importTitle: "开始一个翻译工程",
    importDescription:
      "导入一个源文件。SillyOS 会先识别结构、保留原件并生成稳定条目，之后才让 Agent 工作。",
    chooseFile: "选择文件",
    dropFile: "拖入 TXT、Markdown、SRT、JSON 或文字型 PDF",
    supportedFormats: "导入后再确认结构；不支持的文件不会直接交给模型。",
    sourceLanguage: "源语言",
    targetLanguage: "目标语言",
    automatic: "自动识别",
    units: "个条目",
    translated: "已翻译",
    batches: "个已提交批次",
    glossary: "个术语",
    source: "原文",
    target: "译文",
    status: "状态",
    pending: "待处理",
    committed: "已提交",
    row: "条目",
    details: "条目详情",
    saveTarget: "保存译文",
    startTranslation: "开始翻译",
    export: "导出",
    targetPlaceholder: "批次提交后译文会显示在这里，也可以在这里人工编辑。",
    noUnits: "这个文件没有可翻译条目。",
    exactProgress: "精确机械进度",
  },
} as const;

const localeOptionsV1 = [
  { value: "zh-CN", en: "Chinese (Simplified)", "zh-CN": "简体中文" },
  { value: "en", en: "English", "zh-CN": "英语" },
  { value: "ja", en: "Japanese", "zh-CN": "日语" },
  { value: "ko", en: "Korean", "zh-CN": "韩语" },
] as const;

const translationStageOrderV1: readonly TranslationProgramStageV1[] = [
  "import",
  "analyze",
  "translate",
  "review",
  "export",
];

const translationTableHeaderHeightV1 = 34;

function TranslationIntakeV1({
  locale,
  pending,
  onImportFile,
  onOperationError,
}: {
  readonly locale: "en" | "zh-CN";
  readonly pending: boolean;
  readonly onImportFile: TranslationProgramWorkspacePropsV1["onImportFile"];
  readonly onOperationError: TranslationProgramWorkspacePropsV1["onOperationError"];
}): ReactNode {
  const copy = translationProgramCopyV1[locale];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localeSuggestionListId = useId();
  const [sourceLocale, setSourceLocale] = useState("auto");
  const [targetLocale, setTargetLocale] = useState("zh-CN");
  const [dragActive, setDragActive] = useState(false);

  const submitFileV1 = (file: File | undefined): void => {
    if (file === undefined || pending) return;
    Promise.resolve(onImportFile({
      file,
      sourceLocale: sourceLocale.trim() || "auto",
      targetLocale: targetLocale.trim() || "zh-CN",
    })).catch((error) => {
      onOperationError?.(error);
    });
  };

  const onFileChangeV1 = (event: ChangeEvent<HTMLInputElement>): void => {
    submitFileV1(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  };

  const onDropV1 = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragActive(false);
    submitFileV1(event.dataTransfer.files[0]);
  };

  return (
    <section className="translation-intake" aria-labelledby="translation-intake-title">
      <div className="translation-intake__intro">
        <span className="translation-intake__mark" aria-hidden="true">
          <Languages size={22} />
        </span>
        <div>
          <h1 id="translation-intake-title">{copy.importTitle}</h1>
          <p>{copy.importDescription}</p>
        </div>
      </div>

      <div
        className="translation-intake__dropzone"
        data-drag-active={dragActive ? "true" : "false"}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          setDragActive(false);
        }}
        onDrop={onDropV1}
      >
        <Upload size={24} aria-hidden="true" />
        <strong>{copy.dropFile}</strong>
        <span>{copy.supportedFormats}</span>
        <input
          ref={fileInputRef}
          className="silly-os-visually-hidden"
          type="file"
          aria-hidden="true"
          tabIndex={-1}
          accept=".txt,.md,.markdown,.srt,.json,.pdf,text/plain,text/markdown,application/json,application/pdf"
          disabled={pending}
          onChange={onFileChangeV1}
        />
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
        >
          {copy.chooseFile}
        </Button>
      </div>

      <div className="translation-intake__languages">
        <FieldV1>
          <FieldLabelV1 htmlFor="translation-source-locale">{copy.sourceLanguage}</FieldLabelV1>
          <InputV1
            id="translation-source-locale"
            list={localeSuggestionListId}
            value={sourceLocale}
            onChange={(event) => setSourceLocale(event.currentTarget.value)}
          />
        </FieldV1>
        <FieldV1>
          <FieldLabelV1 htmlFor="translation-target-locale">{copy.targetLanguage}</FieldLabelV1>
          <InputV1
            id="translation-target-locale"
            list={localeSuggestionListId}
            value={targetLocale}
            onChange={(event) => setTargetLocale(event.currentTarget.value)}
          />
        </FieldV1>
        <datalist id={localeSuggestionListId}>
          <option value="auto">{copy.automatic}</option>
          {localeOptionsV1.map((option) => (
            <option value={option.value} key={option.value}>{option[locale]}</option>
          ))}
        </datalist>
      </div>
    </section>
  );
}

function TranslationStageRailV1({
  locale,
  stage,
}: {
  readonly locale: "en" | "zh-CN";
  readonly stage: TranslationProgramStageV1;
}): ReactNode {
  const copy = translationProgramCopyV1[locale];
  const activeIndex = translationStageOrderV1.indexOf(stage);
  return (
    <nav
      className="translation-stage-rail"
      aria-label={locale === "zh-CN" ? "翻译流程" : "Translation workflow"}
    >
      {translationStageOrderV1.map((candidate, index) => (
        <span
          key={candidate}
          data-stage={candidate}
          data-state={index < activeIndex
            ? "complete"
            : index === activeIndex
            ? "active"
            : "pending"}
          aria-current={index === activeIndex ? "step" : undefined}
        >
          <span className="translation-stage-rail__marker" aria-hidden="true">
            {index < activeIndex ? <CheckCircle2 size={14} /> : index + 1}
          </span>
          {copy.stages[index]}
        </span>
      ))}
    </nav>
  );
}

function TranslationProjectWorkbenchV1({
  locale,
  project,
  stage,
  onStartTranslation,
  onSaveTarget,
  onExport,
  onOperationError,
}:
  & Pick<
    TranslationProgramWorkspacePropsV1,
    | "locale"
    | "project"
    | "stage"
    | "onStartTranslation"
    | "onSaveTarget"
    | "onExport"
    | "onOperationError"
  >
  & { readonly project: TranslationProjectV1 }): ReactNode {
  const copy = translationProgramCopyV1[locale];
  const progress = projectTranslationProgressV1(project);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: progress.totalUnitCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 68,
    overscan: 8,
    initialRect: { width: 920, height: 476 },
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const firstVirtualIndex = virtualRows[0]?.index ?? 0;
  const lastVirtualIndex = virtualRows.at(-1)?.index ?? -1;
  const visibleWindow = useMemo(() =>
    readTranslationProjectRowWindowV1(project, {
      offset: firstVirtualIndex,
      limit: Math.max(1, lastVirtualIndex - firstVirtualIndex + 1),
    }), [firstVirtualIndex, lastVirtualIndex, project]);
  const visibleRowsByOrder = useMemo(
    () => new Map(visibleWindow.rows.map((row) => [row.order, row])),
    [visibleWindow],
  );
  const [requestedOrder, setRequestedOrder] = useState(0);
  const selectedOrder = project.units.length === 0
    ? 0
    : Math.min(requestedOrder, project.units.length - 1);
  const selectedUnit = useMemo(
    () =>
      readTranslationProjectRowWindowV1(project, { offset: selectedOrder, limit: 1 }).rows[0] ??
        null,
    [project, selectedOrder],
  );
  const [targetDraft, setTargetDraft] = useState(() => ({
    unitId: selectedUnit?.unitId ?? null,
    baseline: selectedUnit?.target ?? "",
    value: selectedUnit?.target ?? "",
  }));
  const [savePending, setSavePending] = useState(false);
  const selectedUnitId = selectedUnit?.unitId ?? null;
  const selectedUnitTarget = selectedUnit?.target ?? "";
  const visibleTargetDraft = targetDraft.unitId === selectedUnitId
    ? targetDraft.value
    : selectedUnitTarget;

  // A clean editor follows an authoritative target revision; a dirty editor
  // keeps the human draft until the user saves it or selects another unit.
  useEffect(() => {
    setTargetDraft((current) => {
      if (current.unitId !== selectedUnitId) {
        return {
          unitId: selectedUnitId,
          baseline: selectedUnitTarget,
          value: selectedUnitTarget,
        };
      }
      if (current.baseline === selectedUnitTarget) return current;
      return {
        unitId: current.unitId,
        baseline: selectedUnitTarget,
        value: current.value === current.baseline ? selectedUnitTarget : current.value,
      };
    });
  }, [selectedUnitId, selectedUnitTarget]);

  const invokeV1 = (operation: (() => void | Promise<void>) | undefined): void => {
    if (operation === undefined) return;
    Promise.resolve(operation()).catch((error) => onOperationError?.(error));
  };

  const saveTargetV1 = (): void => {
    if (selectedUnit === null || onSaveTarget === undefined || savePending) return;
    setSavePending(true);
    Promise.resolve(onSaveTarget(selectedUnit, visibleTargetDraft)).catch((error) => {
      onOperationError?.(error);
    }).finally(() => setSavePending(false));
  };

  return (
    <section className="translation-workbench" data-translation-stage={stage}>
      <TranslationStageRailV1 locale={locale} stage={stage} />

      <header className="translation-workbench__summary">
        <div className="translation-workbench__identity">
          <span className="translation-workbench__identity-icon" aria-hidden="true">
            <FileText size={18} />
          </span>
          <div>
            <h1>{project.title}</h1>
            <p>{project.documentPurpose}</p>
          </div>
        </div>
        <div
          className="translation-workbench__language-pair"
          aria-label={`${project.sourceLocale} → ${project.targetLocale}`}
        >
          <span className="translation-workbench__locale">{project.sourceLocale}</span>
          <span aria-hidden="true">→</span>
          <span className="translation-workbench__locale">{project.targetLocale}</span>
        </div>
        <div className="translation-workbench__actions">
          {progress.phase !== "complete" && onStartTranslation !== undefined && (
            <Button
              type="button"
              size="sm"
              variant="primary"
              icon={Play}
              onClick={() => invokeV1(onStartTranslation)}
            >
              {copy.startTranslation}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={Download}
            disabled={progress.phase !== "complete" || onExport === undefined}
            onClick={() => invokeV1(onExport)}
          >
            {copy.export}
          </Button>
        </div>
      </header>

      <div className="translation-workbench__progress" aria-label={copy.exactProgress}>
        <Progress
          accessibleName={copy.exactProgress}
          max={Math.max(1, progress.totalUnitCount)}
          value={progress.committedUnitCount}
          valueText={`${String(progress.committedUnitCount)} / ${String(progress.totalUnitCount)}`}
        />
        <span>
          {`${progress.committedUnitCount.toLocaleString(locale)} / ${
            progress.totalUnitCount.toLocaleString(locale)
          } ${copy.translated}`}
        </span>
        <span>{`${progress.committedBatchCount.toLocaleString(locale)} ${copy.batches}`}</span>
        <span>{`${project.glossary.length.toLocaleString(locale)} ${copy.glossary}`}</span>
      </div>

      {progress.totalUnitCount === 0
        ? <p className="translation-workbench__empty">{copy.noUnits}</p>
        : (
          <div className="translation-workbench__body">
            <section
              className="translation-unit-table"
              aria-label={`${progress.totalUnitCount.toLocaleString(locale)} ${copy.units}`}
            >
              <div ref={scrollRef} className="translation-unit-table__viewport">
                <div
                  className="translation-unit-table__canvas"
                  style={{
                    "--translation-table-header-height": `${translationTableHeaderHeightV1}px`,
                    blockSize: `${
                      String(rowVirtualizer.getTotalSize() + translationTableHeaderHeightV1)
                    }px`,
                  } as CSSProperties}
                >
                  <div className="translation-unit-table__header" aria-hidden="true">
                    <span>{copy.row}</span>
                    <span>{copy.source}</span>
                    <span>{copy.target}</span>
                    <span>{copy.status}</span>
                  </div>
                  {virtualRows.map((virtualRow) => {
                    const unit = visibleRowsByOrder.get(virtualRow.index);
                    if (unit === undefined) return null;
                    return (
                      <button
                        type="button"
                        key={unit.unitId}
                        className="translation-unit-table__row"
                        data-selected={selectedOrder === unit.order ? "true" : "false"}
                        aria-pressed={selectedOrder === unit.order}
                        data-translation-unit-status={unit.target === null
                          ? "pending"
                          : "committed"}
                        style={{
                          blockSize: `${String(virtualRow.size)}px`,
                          transform: `translateY(${
                            String(virtualRow.start + translationTableHeaderHeightV1)
                          }px)`,
                        }}
                        onClick={() => setRequestedOrder(unit.order)}
                      >
                        <span className="translation-unit-table__order">{unit.order + 1}</span>
                        <span className="translation-unit-table__text">{unit.source}</span>
                        <span
                          className="translation-unit-table__text"
                          data-empty={unit.target === null ? "true" : "false"}
                        >
                          {unit.target ?? "—"}
                        </span>
                        <BadgeV1 variant={unit.target === null ? "neutral" : "success"}>
                          {unit.target === null ? copy.pending : copy.committed}
                        </BadgeV1>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {selectedUnit === null ? null : (
              <aside
                className="translation-unit-detail"
                aria-labelledby="translation-unit-detail-title"
              >
                <header>
                  <div>
                    <span className="translation-unit-detail__kicker">{copy.details}</span>
                    <h2 id="translation-unit-detail-title">
                      {`${copy.row} ${String(selectedUnit.order + 1)}`}
                    </h2>
                  </div>
                  <BadgeV1 variant={selectedUnit.target === null ? "neutral" : "success"}>
                    {selectedUnit.target === null ? copy.pending : copy.committed}
                  </BadgeV1>
                </header>
                <dl>
                  <div>
                    <dt>ID</dt>
                    <dd>{selectedUnit.unitId}</dd>
                  </div>
                  <div>
                    <dt>Locator</dt>
                    <dd>{selectedUnit.locator}</dd>
                  </div>
                </dl>
                <section>
                  <h3>{copy.source}</h3>
                  <p>{selectedUnit.source}</p>
                </section>
                <FieldV1>
                  <FieldLabelV1 htmlFor="translation-target-editor">{copy.target}</FieldLabelV1>
                  <TextareaV1
                    id="translation-target-editor"
                    rows={7}
                    value={visibleTargetDraft}
                    placeholder={copy.targetPlaceholder}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setTargetDraft({
                        unitId: selectedUnit.unitId,
                        baseline: selectedUnitTarget,
                        value,
                      });
                    }}
                  />
                </FieldV1>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={Save}
                  disabled={onSaveTarget === undefined || savePending ||
                    visibleTargetDraft.length === 0 ||
                    visibleTargetDraft === selectedUnitTarget}
                  onClick={saveTargetV1}
                >
                  {copy.saveTarget}
                </Button>
                {selectedUnit.protectedSegments.length === 0
                  ? null
                  : (
                    <div className="translation-unit-detail__protected">
                      <ShieldCheck size={14} aria-hidden="true" />
                      <span>
                        {selectedUnit.protectedSegments.map((segment) => segment.source).join(
                          " · ",
                        )}
                      </span>
                    </div>
                  )}
              </aside>
            )}
          </div>
        )}
    </section>
  );
}

/**
 * First ordinary React consumer of the SillyOS Program UI harness. Future
 * admitted OpenUI may replace parts of the guided surface, never the Container.
 */
export function TranslationProgramWorkspaceV1({
  processId,
  locale,
  mode,
  onModeChange,
  project,
  stage,
  run,
  conversationSurface,
  overlaySurface,
  importPending = false,
  onImportFile,
  onStartTranslation,
  onSaveTarget,
  onExport,
  onOperationError,
}: TranslationProgramWorkspacePropsV1): ReactNode {
  const copy = translationProgramCopyV1[locale];
  return (
    <ProgramUiContainerV1
      processId={processId}
      mode={mode}
      onModeChange={onModeChange}
      locale={locale}
      guidedLabel={copy.guided}
      conversationLabel={copy.conversation}
      guidedSurface={project === null
        ? (
          <TranslationIntakeV1
            locale={locale}
            pending={importPending}
            onImportFile={onImportFile}
            onOperationError={onOperationError}
          />
        )
        : (
          <TranslationProjectWorkbenchV1
            locale={locale}
            project={project}
            stage={stage}
            {...(onStartTranslation === undefined ? {} : { onStartTranslation })}
            {...(onSaveTarget === undefined ? {} : { onSaveTarget })}
            {...(onExport === undefined ? {} : { onExport })}
            {...(onOperationError === undefined ? {} : { onOperationError })}
          />
        )}
      conversationSurface={conversationSurface}
      run={run}
      overlaySurface={overlaySurface}
    />
  );
}
