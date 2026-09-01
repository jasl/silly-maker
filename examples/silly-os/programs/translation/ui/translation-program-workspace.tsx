// SPDX-License-Identifier: MIT
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Check,
  CheckCircle2,
  Download,
  FileText,
  Languages,
  Play,
  RotateCcw,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import {
  type TranslationProcessRowWindowV1,
  type TranslationProcessUnitProjectionV1,
} from "../runtime/translation-process-view.ts";
import type {
  TranslationInitialUiCopyV1,
  TranslationInitialUiV1,
} from "../runtime/translation-package-facets.ts";
import { BadgeV1 } from "../../../src/ui/design-system/badge.tsx";
import { ButtonV1 as Button } from "../../../src/ui/design-system/button.tsx";
import { FieldErrorV1, FieldLabelV1, FieldV1 } from "../../../src/ui/design-system/field.tsx";
import { InputV1 } from "../../../src/ui/design-system/input.tsx";
import { ProgressV1 as Progress } from "../../../src/ui/design-system/progress.tsx";
import { TextareaV1 } from "../../../src/ui/design-system/textarea.tsx";
import {
  type ProgramRunProjectionV1,
  ProgramUiContainerV1,
  type ProgramUiModeV1,
} from "../../../src/program-platform/ui/program-ui-container.tsx";
import {
  type ProgramOpenUiActionIntentV1,
  type ProgramOpenUiDocumentV1,
} from "../../../src/program-platform/ui/openui/program-openui-document.ts";
import { ProgramOpenUiRendererV1 } from "../../../src/program-platform/ui/openui/program-openui-renderer.tsx";
import { resolveProgramUiLocalizationV1 } from "../../../src/program-platform/ui/program-ui-localization.ts";
import {
  canonicalizeTranslationTargetLocaleV1,
  defaultTranslationTargetLocaleForHostV1,
  translationTargetLanguageSuggestionsV1,
} from "../runtime/translation-target-language.ts";
import type { TranslationMechanicalQaFindingV1 } from "../runtime/translation-mechanical-qa.ts";
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

export interface TranslationProcessRowWindowRequestV1 {
  readonly offset: number;
  readonly limit: number;
  readonly signal: AbortSignal;
}

/** Session-local human edits for one exact immutable candidate. */
export interface TranslationCandidateDraftV1 {
  readonly candidateId: string;
  readonly targets: readonly { readonly unitId: string; readonly target: string }[];
}

/**
 * Small, pageable projection consumed by the Program UI. The complete
 * Translation Process work set remains behind its repository; a React render receives
 * only stable identity, summary counters and the row ranges it can display.
 */
export interface TranslationProcessPresentationSourceV1 {
  readonly revision: number;
  readonly title: string;
  readonly documentPurpose: string;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly totalUnitCount: number;
  readonly committedUnitCount: number;
  readonly committedBatchCount: number;
  readonly glossaryTermCount: number;
  readonly pendingCandidate: {
    readonly candidateId: string;
    readonly firstOrder: number;
    readonly unitCount: number;
    readonly targets: readonly {
      readonly unitId: string;
      readonly target: string;
    }[];
    readonly ambiguities: readonly {
      readonly unitId: string;
      readonly question: string;
    }[];
    readonly findings: readonly TranslationMechanicalQaFindingV1[];
  } | null;
  readonly loadRowWindow: (
    request: TranslationProcessRowWindowRequestV1,
  ) => Promise<TranslationProcessRowWindowV1>;
}

export interface TranslationProgramWorkspacePropsV1 {
  readonly processId: string;
  readonly locale: "en" | "zh-CN";
  readonly mode: ProgramUiModeV1;
  readonly onModeChange: (mode: ProgramUiModeV1) => void;
  readonly translationSource: TranslationProcessPresentationSourceV1 | null;
  readonly stage: TranslationProgramStageV1;
  readonly run: ProgramRunProjectionV1 | null;
  readonly conversationSurface: ReactNode;
  readonly initialUi?: TranslationInitialUiV1 | null;
  readonly defaultTargetLocale?: string;
  readonly toolbarActions?: ReactNode;
  readonly overlaySurface?: ReactNode;
  readonly importPending?: boolean;
  readonly onImportFile: (request: TranslationProgramImportRequestV1) => void | Promise<void>;
  readonly onSubmitInstruction?: (
    instruction: string,
  ) => boolean | void | Promise<boolean | void>;
  readonly startTranslationDisabled?: boolean;
  readonly candidateReviewDisabled?: boolean;
  readonly candidateDraft?: TranslationCandidateDraftV1 | null;
  readonly onCandidateDraftChange?: (draft: TranslationCandidateDraftV1) => void;
  readonly onAcceptCandidate?: (input: {
    readonly expectedWorksetRevision: number;
    readonly candidateId: string;
    readonly targets: readonly { readonly unitId: string; readonly target: string }[];
  }) => void | Promise<void>;
  readonly onRejectCandidate?: (input: {
    readonly expectedWorksetRevision: number;
    readonly candidateId: string;
  }) => void | Promise<void>;
  readonly onRetranslateCandidate?: (input: {
    readonly expectedWorksetRevision: number;
    readonly candidateId: string;
    readonly targets: readonly { readonly unitId: string; readonly target: string }[];
    /** Optional direction supplied by Conversation; guided review uses the default repair loop. */
    readonly instruction: string | null;
  }) => boolean | void | Promise<boolean | void>;
  readonly onExport?: () => void | Promise<void>;
  readonly onOperationError?: (error: unknown) => void;
}

const translationProgramCopyV1 = {
  en: {
    guided: "Simple",
    conversation: "Conversation",
    stages: ["Import", "Analyze", "Translate", "Review", "Export"],
    importTitle: "Start translating",
    importDescription:
      "Import one source file. SillyOS detects its structure, preserves the original, and prepares stable units before the Agent runs.",
    chooseFile: "Choose file",
    dropFile: "Drop a TXT, Markdown, SRT, VTT, ASS, JSON, or born-digital PDF here",
    supportedFormats:
      "Structure is confirmed after import; unsupported files are not sent to the model.",
    sourceLanguage: "Source language",
    targetLanguage: "Target language",
    targetLanguageScope:
      "Translation into Chinese and English is in the quality-validation scope. Other languages are best effort and depend on the selected model.",
    invalidTargetLanguage:
      "Enter a BCP 47 language, script, region, or variant target such as en, zh-CN, or fr-CA; extensions and private-use tags are not targets.",
    automatic: "Detect automatically",
    units: "units",
    translated: "translated",
    batches: "committed batches",
    glossary: "glossary terms",
    source: "Source",
    target: "Target",
    status: "Status",
    pending: "Pending",
    awaitingReview: "Awaiting review",
    committed: "Committed",
    row: "Unit",
    details: "Unit details",
    reviewTitle: "Review this batch",
    reviewDescription:
      "Edit the bounded candidate before accepting it. Accepted progress changes only after the complete batch is committed.",
    acceptCandidate: "Accept batch",
    rejectCandidate: "Reject candidate",
    retranslateCandidate: "Retranslate candidate",
    retranslationRunning:
      "Retranslation is running. This candidate remains available until its successor is ready.",
    mechanicalWarnings: "Mechanical review signals",
    mechanicalWarning: "Mechanical review signal",
    mechanicalWarningsSummary: (count: number) =>
      `${count.toLocaleString("en")} mechanical review ${count === 1 ? "signal" : "signals"}`,
    modelAmbiguity: "Model-reported ambiguity",
    modelAmbiguitiesSummary: (count: number) =>
      `${count.toLocaleString("en")} model-reported ${count === 1 ? "ambiguity" : "ambiguities"}`,
    noMechanicalWarnings:
      "No mechanical review signals were found. Meaning and style still require review.",
    ambiguity: "Model asks for clarification",
    readOnlyTarget: "Accepted and pending rows are read-only until a review candidate exists.",
    startTranslation: "Start translation",
    export: "Export",
    targetPlaceholder: "Translation appears here after a committed batch, or can be edited here.",
    noUnits: "This document has no translatable units.",
    exactProgress: "Exact mechanical progress",
    rowsLoading: "Loading translation units…",
    rowsFailed: "Translation units could not be loaded.",
    retryRows: "Retry",
  },
  "zh-CN": {
    guided: "简单",
    conversation: "对话",
    stages: ["导入", "分析", "翻译", "审查", "导出"],
    importTitle: "开始翻译",
    importDescription:
      "导入一个源文件。SillyOS 会先识别结构、保留原件并生成稳定条目，之后才让 Agent 工作。",
    chooseFile: "选择文件",
    dropFile: "拖入 TXT、Markdown、SRT、VTT、ASS、JSON 或文字型 PDF",
    supportedFormats: "导入后再确认结构；不支持的文件不会直接交给模型。",
    sourceLanguage: "源语言",
    targetLanguage: "目标语言",
    targetLanguageScope:
      "中文和英文属于翻译质量验证范围；其他语言按所选模型的能力尽力处理，不作质量保证。",
    invalidTargetLanguage:
      "请输入 BCP 47 语言、文字、地区或变体目标，例如 zh-CN、en 或 fr-CA；不支持扩展和私有用途标签。",
    automatic: "自动识别",
    units: "个条目",
    translated: "已翻译",
    batches: "个已提交批次",
    glossary: "个术语",
    source: "原文",
    target: "译文",
    status: "状态",
    pending: "待处理",
    awaitingReview: "待审查",
    committed: "已提交",
    row: "条目",
    details: "条目详情",
    reviewTitle: "审查本批候选",
    reviewDescription: "可先编辑这批候选，再整体接受。只有完整批次提交后，已翻译进度才会变化。",
    acceptCandidate: "接受批次",
    rejectCandidate: "拒绝候选",
    retranslateCandidate: "重新翻译候选",
    retranslationRunning: "正在重译；新候选准备好之前，当前候选会继续保留。",
    mechanicalWarnings: "机械审查提示",
    mechanicalWarning: "机械审查提示",
    mechanicalWarningsSummary: (count: number) => `${count.toLocaleString("zh-CN")} 个机械审查提示`,
    modelAmbiguity: "模型报告的歧义",
    modelAmbiguitiesSummary: (count: number) => `${count.toLocaleString("zh-CN")} 个模型歧义`,
    noMechanicalWarnings: "机械检查未发现审查提示；语义与文风仍需审查。",
    ambiguity: "模型请求澄清",
    readOnlyTarget: "已接受或待处理条目为只读；出现待审查候选后才能编辑。",
    startTranslation: "开始翻译",
    export: "导出",
    targetPlaceholder: "批次提交后译文会显示在这里，也可以在这里人工编辑。",
    noUnits: "这个文件没有可翻译条目。",
    exactProgress: "精确机械进度",
    rowsLoading: "正在加载翻译条目…",
    rowsFailed: "翻译条目加载失败。",
    retryRows: "重试",
  },
} as const;

type TranslationMechanicalWarningV1 = Extract<
  TranslationMechanicalQaFindingV1,
  { readonly severity: "warning" }
>;

function translationMechanicalWarningTextV1(
  finding: TranslationMechanicalWarningV1,
  locale: "en" | "zh-CN",
): string {
  switch (finding.code) {
    case "non_locked_glossary_missing":
      return locale === "zh-CN"
        ? `未发现预期术语“${finding.expectedTarget}”。`
        : `Expected glossary term “${finding.expectedTarget}” was not found.`;
    case "source_target_identical":
      return locale === "zh-CN" ? "译文与原文完全相同。" : "Target is identical to source.";
    case "number_tokens_changed": {
      const source = finding.sourceTokens.length === 0 ? "∅" : finding.sourceTokens.join(", ");
      const target = finding.targetTokens.length === 0 ? "∅" : finding.targetTokens.join(", ");
      return locale === "zh-CN"
        ? `数字标记发生变化：原文 ${source}；译文 ${target}。日期本地化或数字文字化可能导致合理差异，请对照审查。`
        : `Number tokens changed: source ${source}; target ${target}. Localized dates or spelled-out numbers may be valid; compare with the source.`;
    }
    case "line_break_count_changed":
      return locale === "zh-CN"
        ? `换行数量发生变化：原文 ${String(finding.sourceCount)}；译文 ${
          String(finding.targetCount)
        }。`
        : `Line-break count changed: source ${String(finding.sourceCount)}; target ${
          String(finding.targetCount)
        }.`;
    case "target_looks_like_refusal":
      return locale === "zh-CN"
        ? "译文疑似出现明确拒绝话术，请对照原文审查。"
        : "Target resembles an explicit refusal rather than a translation; compare it with the source.";
  }
  const unsupported: never = finding;
  return unsupported;
}

function translationMechanicalWarningKeyV1(
  finding: TranslationMechanicalWarningV1,
): string {
  return finding.code === "non_locked_glossary_missing"
    ? `${finding.code}:${finding.unitId}:${finding.glossaryEntryId}`
    : `${finding.code}:${finding.unitId}`;
}

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
  packageCopy,
  defaultTargetLocale,
  pending,
  onImportFile,
  onOperationError,
}: {
  readonly locale: "en" | "zh-CN";
  readonly packageCopy: TranslationInitialUiCopyV1 | null;
  readonly defaultTargetLocale: string;
  readonly pending: boolean;
  readonly onImportFile: TranslationProgramWorkspacePropsV1["onImportFile"];
  readonly onOperationError: TranslationProgramWorkspacePropsV1["onOperationError"];
}): ReactNode {
  const copy = translationProgramCopyV1[locale];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetLocaleTouchedRef = useRef(false);
  const sourceLocaleSuggestionListId = useId();
  const targetLocaleSuggestionListId = useId();
  const [sourceLocale, setSourceLocale] = useState("auto");
  const canonicalDefaultTargetLocale = canonicalizeTranslationTargetLocaleV1(
    defaultTargetLocale,
  ) ?? defaultTranslationTargetLocaleForHostV1(locale);
  const [targetLocale, setTargetLocale] = useState(canonicalDefaultTargetLocale);
  const [targetLocaleError, setTargetLocaleError] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (targetLocaleTouchedRef.current) return;
    setTargetLocale(canonicalDefaultTargetLocale);
  }, [canonicalDefaultTargetLocale]);

  const admittedTargetLocaleV1 = (): string | null => {
    const candidate = targetLocale.trim().length === 0
      ? canonicalDefaultTargetLocale
      : targetLocale;
    const canonical = canonicalizeTranslationTargetLocaleV1(candidate);
    setTargetLocaleError(canonical === null);
    if (canonical !== null) setTargetLocale(canonical);
    return canonical;
  };

  const submitFileV1 = (file: File | undefined): void => {
    if (file === undefined || pending) return;
    const admittedTargetLocale = admittedTargetLocaleV1();
    if (admittedTargetLocale === null) return;
    Promise.resolve(onImportFile({
      file,
      sourceLocale: sourceLocale.trim() || "auto",
      targetLocale: admittedTargetLocale,
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
    <section className="translation-intake" aria-label={copy.importTitle}>
      <div className="translation-intake__intro">
        <span className="translation-intake__mark" aria-hidden="true">
          <Languages size={22} />
        </span>
        {packageCopy === null
          ? (
            <div>
              <h1>{copy.importTitle}</h1>
              <p>{copy.importDescription}</p>
            </div>
          )
          : (
            <ProgramOpenUiRendererV1
              document={packageCopy.intakeDocument}
              disabled
              onAction={() => undefined}
            />
          )}
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
        <strong>{packageCopy?.dropLabel ?? copy.dropFile}</strong>
        <span>{packageCopy?.formatNote ?? copy.supportedFormats}</span>
        <input
          ref={fileInputRef}
          className="silly-os-visually-hidden"
          type="file"
          aria-hidden="true"
          tabIndex={-1}
          accept=".txt,.md,.markdown,.srt,.vtt,.ass,.json,.pdf,text/plain,text/markdown,text/vtt,text/x-ssa,application/x-subrip,application/json,application/pdf"
          disabled={pending}
          onChange={onFileChangeV1}
        />
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (admittedTargetLocaleV1() !== null) fileInputRef.current?.click();
          }}
        >
          {packageCopy?.chooseFileLabel ?? copy.chooseFile}
        </Button>
      </div>

      <div className="translation-intake__languages">
        <FieldV1>
          <FieldLabelV1 htmlFor="translation-source-locale">
            {packageCopy?.sourceLanguageLabel ?? copy.sourceLanguage}
          </FieldLabelV1>
          <InputV1
            id="translation-source-locale"
            list={sourceLocaleSuggestionListId}
            value={sourceLocale}
            onChange={(event) => setSourceLocale(event.currentTarget.value)}
          />
        </FieldV1>
        <FieldV1>
          <FieldLabelV1 htmlFor="translation-target-locale">
            {packageCopy?.targetLanguageLabel ?? copy.targetLanguage}
          </FieldLabelV1>
          <InputV1
            id="translation-target-locale"
            list={targetLocaleSuggestionListId}
            value={targetLocale}
            aria-invalid={targetLocaleError}
            onBlur={admittedTargetLocaleV1}
            onChange={(event) => {
              targetLocaleTouchedRef.current = true;
              setTargetLocaleError(false);
              setTargetLocale(event.currentTarget.value);
            }}
          />
          {targetLocaleError ? <FieldErrorV1>{copy.invalidTargetLanguage}</FieldErrorV1> : null}
        </FieldV1>
        <datalist id={sourceLocaleSuggestionListId}>
          <option value="auto">{copy.automatic}</option>
          {translationTargetLanguageSuggestionsV1.map((option) => (
            <option value={option.locale} key={option.locale}>{option.labels[locale]}</option>
          ))}
        </datalist>
        <datalist id={targetLocaleSuggestionListId}>
          {translationTargetLanguageSuggestionsV1.map((option) => (
            <option value={option.locale} key={option.locale}>{option.labels[locale]}</option>
          ))}
        </datalist>
        <p className="translation-intake__language-scope">{copy.targetLanguageScope}</p>
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

function TranslationProcessWorkbenchV1({
  processId,
  locale,
  translationSource,
  stage,
  openUiDocument,
  onSubmitInstruction,
  startTranslationDisabled,
  candidateReviewDisabled,
  candidateDraft,
  onCandidateDraftChange,
  onAcceptCandidate,
  onRejectCandidate,
  onRetranslateCandidate,
  onExport,
  onOperationError,
}:
  & Pick<
    TranslationProgramWorkspacePropsV1,
    | "processId"
    | "locale"
    | "translationSource"
    | "stage"
    | "onSubmitInstruction"
    | "startTranslationDisabled"
    | "candidateReviewDisabled"
    | "candidateDraft"
    | "onCandidateDraftChange"
    | "onAcceptCandidate"
    | "onRejectCandidate"
    | "onRetranslateCandidate"
    | "onExport"
    | "onOperationError"
  >
  & {
    readonly translationSource: TranslationProcessPresentationSourceV1;
    readonly openUiDocument: ProgramOpenUiDocumentV1 | null;
  }): ReactNode {
  const copy = translationProgramCopyV1[locale];
  const candidate = translationSource.pendingCandidate;
  const initialCandidateTargetByUnitId = useMemo(
    () =>
      new Map(
        candidate?.targets.map(({ unitId, target }) => [unitId, target]) ?? [],
      ),
    [candidate],
  );
  const ambiguityByUnitId = useMemo(
    () => new Map(candidate?.ambiguities.map(({ unitId, question }) => [unitId, question]) ?? []),
    [candidate],
  );
  const mechanicalWarnings = useMemo(
    () =>
      candidate?.findings.filter(
        (finding): finding is TranslationMechanicalWarningV1 => finding.severity === "warning",
      ) ?? [],
    [candidate],
  );
  const mechanicalWarningsByUnitId = useMemo(() => {
    const grouped = new Map<string, TranslationMechanicalWarningV1[]>();
    for (const finding of mechanicalWarnings) {
      const current = grouped.get(finding.unitId) ?? [];
      current.push(finding);
      grouped.set(finding.unitId, current);
    }
    return grouped;
  }, [mechanicalWarnings]);
  const candidateDraftMatches = candidate !== null &&
    candidateDraft?.candidateId === candidate.candidateId &&
    candidateDraft.targets.length === candidate.targets.length &&
    candidateDraft.targets.every((target, index) =>
      target.unitId === candidate.targets[index]?.unitId
    );
  const candidateTargetByUnitId = useMemo(
    () =>
      candidateDraftMatches
        ? new Map(candidateDraft.targets.map(({ unitId, target }) => [unitId, target]))
        : initialCandidateTargetByUnitId,
    [candidateDraft, candidateDraftMatches, initialCandidateTargetByUnitId],
  );
  const progressPhase = translationSource.totalUnitCount === 0
    ? "empty"
    : translationSource.committedUnitCount === 0
    ? "pending"
    : translationSource.committedUnitCount === translationSource.totalUnitCount
    ? "complete"
    : "in_progress";
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: translationSource.totalUnitCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 68,
    overscan: 8,
    initialRect: { width: 920, height: 476 },
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const firstVirtualIndex = virtualRows[0]?.index ?? 0;
  const lastVirtualIndex = virtualRows.at(-1)?.index ?? -1;
  const worksetRevision = translationSource.revision;
  const rowCache = useMemo(() => ({
    processId,
    worksetRevision,
    active: true,
    rows: new Map<number, TranslationProcessUnitProjectionV1>(),
    pending: new Map<
      string,
      { readonly offset: number; readonly limit: number; readonly controller: AbortController }
    >(),
    failures: new Map<string, { readonly offset: number; readonly limit: number }>(),
  }), [processId, worksetRevision]);
  const [rowCacheVersion, invalidateRowCache] = useReducer((current: number) => current + 1, 0);

  useEffect(() => {
    // React StrictMode replays Effects in development. Each setup therefore
    // reopens this revision-local cache after the preceding cleanup.
    rowCache.active = true;
    return () => {
      rowCache.active = false;
      for (const request of rowCache.pending.values()) request.controller.abort();
      rowCache.pending.clear();
    };
  }, [rowCache]);

  const requestRowWindowV1 = useCallback((offset: number, requestedLimit: number): void => {
    if (offset < 0 || offset >= translationSource.totalUnitCount || requestedLimit < 1) return;
    const limit = Math.min(requestedLimit, translationSource.totalUnitCount - offset);
    let complete = true;
    for (let order = offset; order < offset + limit; order += 1) {
      if (!rowCache.rows.has(order)) {
        complete = false;
        break;
      }
    }
    if (complete) return;
    for (const pending of rowCache.pending.values()) {
      if (pending.offset <= offset && pending.offset + pending.limit >= offset + limit) return;
    }

    const requestKey = `${String(offset)}:${String(limit)}`;
    if (rowCache.pending.has(requestKey)) return;
    const controller = new AbortController();
    rowCache.pending.set(requestKey, { offset, limit, controller });
    rowCache.failures.delete(requestKey);
    invalidateRowCache();

    translationSource.loadRowWindow({ offset, limit, signal: controller.signal }).then((window) => {
      if (controller.signal.aborted || !rowCache.active) return;
      if (
        window.offset !== offset ||
        window.limit !== limit ||
        window.totalRowCount !== translationSource.totalUnitCount ||
        window.rows.length !== limit
      ) {
        throw new Error("sillyos.translation_program.row_window_identity_mismatch");
      }
      for (let index = 0; index < window.rows.length; index += 1) {
        const row = window.rows[index];
        if (row === undefined || row.order !== offset + index) {
          throw new Error("sillyos.translation_program.row_window_order_mismatch");
        }
        rowCache.rows.set(row.order, row);
      }
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      rowCache.failures.set(requestKey, { offset, limit });
      onOperationError?.(error);
    }).finally(() => {
      if (rowCache.pending.get(requestKey)?.controller !== controller) return;
      rowCache.pending.delete(requestKey);
      if (!rowCache.active) return;
      invalidateRowCache();
    });
  }, [onOperationError, translationSource, rowCache]);

  useEffect(() => {
    if (lastVirtualIndex < firstVirtualIndex) return;
    requestRowWindowV1(
      firstVirtualIndex,
      lastVirtualIndex - firstVirtualIndex + 1,
    );
  }, [firstVirtualIndex, lastVirtualIndex, requestRowWindowV1]);

  const [requestedOrder, setRequestedOrder] = useState(
    () => translationSource.pendingCandidate?.firstOrder ?? 0,
  );
  const selectedCandidateIdRef = useRef<string | null>(
    translationSource.pendingCandidate?.candidateId ?? null,
  );
  useEffect(() => {
    if (
      candidate === null || selectedCandidateIdRef.current === candidate.candidateId
    ) return;
    selectedCandidateIdRef.current = candidate.candidateId;
    setRequestedOrder(candidate.firstOrder);
  }, [candidate]);
  const selectedOrder = translationSource.totalUnitCount === 0
    ? 0
    : Math.min(requestedOrder, translationSource.totalUnitCount - 1);
  const selectedUnit = rowCache.rows.get(selectedOrder) ?? null;

  useEffect(() => {
    if (translationSource.totalUnitCount > 0) requestRowWindowV1(selectedOrder, 1);
  }, [translationSource.totalUnitCount, requestRowWindowV1, selectedOrder]);

  useEffect(() => {
    const hasVisibleRange = lastVirtualIndex >= firstVirtualIndex;
    const retainedOrderV1 = (order: number): boolean =>
      order === selectedOrder || hasVisibleRange &&
        order >= firstVirtualIndex && order <= lastVirtualIndex;
    const retainedWindowV1 = (offset: number, limit: number): boolean => {
      const finalOrder = offset + limit - 1;
      return selectedOrder >= offset && selectedOrder <= finalOrder ||
        hasVisibleRange && offset <= lastVirtualIndex && finalOrder >= firstVirtualIndex;
    };
    let changed = false;
    for (const order of rowCache.rows.keys()) {
      if (retainedOrderV1(order)) continue;
      rowCache.rows.delete(order);
      changed = true;
    }
    for (const [key, pending] of rowCache.pending) {
      if (retainedWindowV1(pending.offset, pending.limit)) continue;
      pending.controller.abort();
      rowCache.pending.delete(key);
      changed = true;
    }
    for (const [key, failure] of rowCache.failures) {
      if (retainedWindowV1(failure.offset, failure.limit)) continue;
      rowCache.failures.delete(key);
      changed = true;
    }
    if (changed) invalidateRowCache();
  }, [
    firstVirtualIndex,
    lastVirtualIndex,
    rowCache,
    rowCacheVersion,
    selectedOrder,
  ]);

  const [reviewPending, setReviewPending] = useState(false);
  const [startPending, setStartPending] = useState(false);
  const selectedUnitId = selectedUnit?.unitId ?? null;
  const selectedUnitCandidateTarget = selectedUnitId === null
    ? undefined
    : candidateTargetByUnitId.get(selectedUnitId);
  const selectedUnitTarget = selectedUnitCandidateTarget ?? selectedUnit?.target ?? "";
  const selectedAmbiguity = selectedUnitId === null
    ? undefined
    : ambiguityByUnitId.get(selectedUnitId);
  const selectedMechanicalWarnings = selectedUnitId === null
    ? []
    : mechanicalWarningsByUnitId.get(selectedUnitId) ?? [];

  const loadingRows = rowCache.pending.size > 0;
  const failedRows = Array.from(rowCache.failures.values());
  const retryRowsV1 = (): void => {
    rowCache.failures.clear();
    invalidateRowCache();
    if (lastVirtualIndex >= firstVirtualIndex) {
      requestRowWindowV1(firstVirtualIndex, lastVirtualIndex - firstVirtualIndex + 1);
    }
    requestRowWindowV1(selectedOrder, 1);
  };

  const invokeV1 = (operation: (() => void | Promise<void>) | undefined): void => {
    if (operation === undefined) return;
    Promise.resolve(operation()).catch((error) => onOperationError?.(error));
  };

  const submitInstructionV1 = (instruction: string): void => {
    if (
      onSubmitInstruction === undefined || startTranslationDisabled === true || startPending ||
      progressPhase === "empty" || stage === "translate" || stage === "review"
    ) return;
    setStartPending(true);
    Promise.resolve(onSubmitInstruction(instruction)).catch((error) => {
      onOperationError?.(error);
    }).finally(() => setStartPending(false));
  };

  const onOpenUiActionV1 = (intent: ProgramOpenUiActionIntentV1): void => {
    submitInstructionV1(intent.prompt);
  };

  const editCandidateTargetV1 = (unitId: string, target: string): void => {
    if (
      candidate === null || onCandidateDraftChange === undefined ||
      !initialCandidateTargetByUnitId.has(unitId)
    ) return;
    onCandidateDraftChange({
      candidateId: candidate.candidateId,
      targets: candidate.targets.map((candidateTarget) => ({
        unitId: candidateTarget.unitId,
        target: candidateTarget.unitId === unitId
          ? target
          : candidateTargetByUnitId.get(candidateTarget.unitId) ?? candidateTarget.target,
      })),
    });
  };

  const acceptCandidateV1 = (): void => {
    if (
      candidate === null || onAcceptCandidate === undefined || reviewPending ||
      candidateReviewDisabled === true
    ) return;
    const targets = candidate.targets.map(({ unitId }) => ({
      unitId,
      target: candidateTargetByUnitId.get(unitId) ?? "",
    }));
    if (targets.some(({ target }) => target.trim().length === 0)) return;
    setReviewPending(true);
    Promise.resolve(onAcceptCandidate({
      expectedWorksetRevision: translationSource.revision,
      candidateId: candidate.candidateId,
      targets,
    })).catch((error) => {
      onOperationError?.(error);
    }).finally(() => setReviewPending(false));
  };

  const rejectCandidateV1 = (): void => {
    if (
      candidate === null || onRejectCandidate === undefined || reviewPending ||
      candidateReviewDisabled === true
    ) return;
    setReviewPending(true);
    Promise.resolve(onRejectCandidate({
      expectedWorksetRevision: translationSource.revision,
      candidateId: candidate.candidateId,
    })).catch((error) => {
      onOperationError?.(error);
    }).finally(() => setReviewPending(false));
  };

  const retranslateCandidateV1 = (): void => {
    if (
      candidate === null || onRetranslateCandidate === undefined || reviewPending ||
      candidateReviewDisabled === true
    ) return;
    const targets = candidate.targets.map(({ unitId }) => ({
      unitId,
      target: candidateTargetByUnitId.get(unitId) ?? "",
    }));
    if (targets.some(({ target }) => target.trim().length === 0)) return;
    setReviewPending(true);
    Promise.resolve(onRetranslateCandidate({
      expectedWorksetRevision: translationSource.revision,
      candidateId: candidate.candidateId,
      targets,
      instruction: null,
    })).catch((error) => {
      onOperationError?.(error);
    }).finally(() => setReviewPending(false));
  };

  const candidateTargetsComplete = candidate !== null &&
    candidate.targets.every(({ unitId }) =>
      (candidateTargetByUnitId.get(unitId) ?? "").trim().length > 0
    );

  return (
    <section className="translation-workbench" data-translation-stage={stage}>
      <TranslationStageRailV1 locale={locale} stage={stage} />

      {progressPhase === "complete" || openUiDocument === null ? null : (
        <ProgramOpenUiRendererV1
          document={openUiDocument}
          disabled={onSubmitInstruction === undefined || startTranslationDisabled ||
            startPending || progressPhase === "empty" || stage === "translate" ||
            stage === "review"}
          onAction={onOpenUiActionV1}
        />
      )}

      <header className="translation-workbench__summary">
        <div className="translation-workbench__identity">
          <span className="translation-workbench__identity-icon" aria-hidden="true">
            <FileText size={18} />
          </span>
          <div>
            <h1>{translationSource.title}</h1>
            <p>{translationSource.documentPurpose}</p>
          </div>
        </div>
        <div
          className="translation-workbench__language-pair"
          aria-label={`${translationSource.sourceLocale} → ${translationSource.targetLocale}`}
        >
          <span className="translation-workbench__locale">{translationSource.sourceLocale}</span>
          <span aria-hidden="true">→</span>
          <span className="translation-workbench__locale">{translationSource.targetLocale}</span>
        </div>
        <div className="translation-workbench__actions">
          {progressPhase !== "complete" && openUiDocument === null &&
            onSubmitInstruction !== undefined && (
            <Button
              type="button"
              size="sm"
              variant="primary"
              icon={Play}
              disabled={progressPhase === "empty" || startTranslationDisabled === true ||
                startPending ||
                stage === "translate" || stage === "review"}
              onClick={() =>
                submitInstructionV1(
                  locale === "zh-CN"
                    ? "请按照当前设置翻译下一批内容，并在提交候选前检查术语、人物关系、否定和指代。"
                    : "Translate the next batch using the current settings, and check terminology, relationships, negation, and references before submitting the candidate.",
                )}
            >
              {copy.startTranslation}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={Download}
            disabled={progressPhase !== "complete" || onExport === undefined}
            onClick={() => invokeV1(onExport)}
          >
            {copy.export}
          </Button>
        </div>
      </header>

      <div className="translation-workbench__progress" aria-label={copy.exactProgress}>
        <Progress
          accessibleName={copy.exactProgress}
          max={Math.max(1, translationSource.totalUnitCount)}
          value={translationSource.committedUnitCount}
          valueText={`${String(translationSource.committedUnitCount)} / ${
            String(translationSource.totalUnitCount)
          }`}
        />
        <span>
          {`${translationSource.committedUnitCount.toLocaleString(locale)} / ${
            translationSource.totalUnitCount.toLocaleString(locale)
          } ${copy.translated}${
            translationSource.pendingCandidate === null
              ? ""
              : ` · ${
                translationSource.pendingCandidate.unitCount.toLocaleString(locale)
              } ${copy.awaitingReview}`
          }`}
        </span>
        <span>
          {`${translationSource.committedBatchCount.toLocaleString(locale)} ${copy.batches}`}
        </span>
        <span>
          {`${translationSource.glossaryTermCount.toLocaleString(locale)} ${copy.glossary}`}
        </span>
      </div>

      {candidate === null ? null : (
        <section
          className="translation-candidate-review"
          aria-labelledby="translation-candidate-review-title"
        >
          <div>
            <h2 id="translation-candidate-review-title">{copy.reviewTitle}</h2>
            <p>{copy.reviewDescription}</p>
            <div className="translation-candidate-review__findings" aria-live="polite">
              {mechanicalWarnings.length === 0
                ? <span>{copy.noMechanicalWarnings}</span>
                : (
                  <BadgeV1 variant="warning">
                    {copy.mechanicalWarningsSummary(mechanicalWarnings.length)}
                  </BadgeV1>
                )}
              {candidate.ambiguities.length === 0 ? null : (
                <BadgeV1 variant="neutral">
                  {copy.modelAmbiguitiesSummary(candidate.ambiguities.length)}
                </BadgeV1>
              )}
              {candidateReviewDisabled === true
                ? <span role="status">{copy.retranslationRunning}</span>
                : null}
            </div>
          </div>
          <div className="translation-candidate-review__actions">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={X}
              disabled={onRejectCandidate === undefined || reviewPending ||
                candidateReviewDisabled === true}
              onClick={rejectCandidateV1}
            >
              {copy.rejectCandidate}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={RotateCcw}
              disabled={onRetranslateCandidate === undefined || reviewPending ||
                candidateReviewDisabled === true || !candidateTargetsComplete}
              onClick={retranslateCandidateV1}
            >
              {copy.retranslateCandidate}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="primary"
              icon={Check}
              disabled={onAcceptCandidate === undefined || reviewPending ||
                candidateReviewDisabled === true ||
                !candidateTargetsComplete}
              onClick={acceptCandidateV1}
            >
              {copy.acceptCandidate}
            </Button>
          </div>
        </section>
      )}

      {translationSource.totalUnitCount === 0
        ? <p className="translation-workbench__empty">{copy.noUnits}</p>
        : (
          <div className="translation-workbench__body">
            <section
              className="translation-unit-table"
              aria-label={`${
                translationSource.totalUnitCount.toLocaleString(locale)
              } ${copy.units}`}
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
                    const unit = rowCache.rows.get(virtualRow.index);
                    if (unit === undefined) return null;
                    const candidateTarget = candidateTargetByUnitId.get(unit.unitId);
                    const target = candidateTarget ?? unit.target;
                    const unitHasMechanicalWarning = mechanicalWarningsByUnitId.has(unit.unitId);
                    const unitHasModelAmbiguity = ambiguityByUnitId.has(unit.unitId);
                    const status = candidateTarget === undefined
                      ? unit.target === null ? "pending" : "committed"
                      : "candidate";
                    return (
                      <button
                        type="button"
                        key={unit.unitId}
                        className="translation-unit-table__row"
                        data-selected={selectedOrder === unit.order ? "true" : "false"}
                        aria-pressed={selectedOrder === unit.order}
                        data-translation-unit-status={status}
                        data-mechanical-warning={unitHasMechanicalWarning ? "true" : "false"}
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
                          data-empty={target === null ? "true" : "false"}
                          data-candidate={candidateTarget === undefined ? "false" : "true"}
                        >
                          {target ?? "—"}
                        </span>
                        <BadgeV1
                          variant={status === "candidate"
                            ? "warning"
                            : status === "committed"
                            ? "success"
                            : "neutral"}
                        >
                          {status === "candidate"
                            ? unitHasMechanicalWarning
                              ? copy.mechanicalWarning
                              : unitHasModelAmbiguity
                              ? copy.modelAmbiguity
                              : copy.awaitingReview
                            : status === "committed"
                            ? copy.committed
                            : copy.pending}
                        </BadgeV1>
                      </button>
                    );
                  })}
                  {loadingRows && failedRows.length === 0
                    ? (
                      <div className="translation-unit-table__load-state" role="status">
                        {copy.rowsLoading}
                      </div>
                    )
                    : null}
                  {failedRows.length > 0
                    ? (
                      <div className="translation-unit-table__load-state" role="alert">
                        <span>{copy.rowsFailed}</span>
                        <Button type="button" variant="secondary" size="sm" onClick={retryRowsV1}>
                          {copy.retryRows}
                        </Button>
                      </div>
                    )
                    : null}
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
                  <BadgeV1
                    variant={selectedUnitCandidateTarget !== undefined
                      ? "warning"
                      : selectedUnit.target === null
                      ? "neutral"
                      : "success"}
                  >
                    {selectedUnitCandidateTarget !== undefined
                      ? copy.awaitingReview
                      : selectedUnit.target === null
                      ? copy.pending
                      : copy.committed}
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
                {selectedMechanicalWarnings.length === 0 ? null : (
                  <section
                    className="translation-unit-detail__mechanical-warnings"
                    aria-label={copy.mechanicalWarnings}
                  >
                    <h3>{copy.mechanicalWarnings}</h3>
                    <ul>
                      {selectedMechanicalWarnings.map((finding) => (
                        <li key={translationMechanicalWarningKeyV1(finding)}>
                          {translationMechanicalWarningTextV1(finding, locale)}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {selectedAmbiguity === undefined ? null : (
                  <section
                    className="translation-unit-detail__ambiguity"
                    aria-label={copy.ambiguity}
                  >
                    <h3>{copy.ambiguity}</h3>
                    <p>{selectedAmbiguity}</p>
                  </section>
                )}
                <FieldV1>
                  <FieldLabelV1 htmlFor="translation-target-editor">{copy.target}</FieldLabelV1>
                  <TextareaV1
                    id="translation-target-editor"
                    rows={7}
                    value={selectedUnitTarget}
                    placeholder={copy.targetPlaceholder}
                    readOnly={selectedUnitCandidateTarget === undefined ||
                      onCandidateDraftChange === undefined}
                    aria-describedby={selectedUnitCandidateTarget === undefined ||
                        onCandidateDraftChange === undefined
                      ? "translation-target-readonly-note"
                      : undefined}
                    onChange={(event) => {
                      if (
                        selectedUnitCandidateTarget === undefined ||
                        onCandidateDraftChange === undefined
                      ) return;
                      editCandidateTargetV1(selectedUnit.unitId, event.currentTarget.value);
                    }}
                  />
                </FieldV1>
                {selectedUnitCandidateTarget === undefined || onCandidateDraftChange === undefined
                  ? (
                    <p
                      id="translation-target-readonly-note"
                      className="translation-unit-detail__readonly-note"
                    >
                      {copy.readOnlyTarget}
                    </p>
                  )
                  : null}
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
  translationSource,
  stage,
  run,
  conversationSurface,
  initialUi = null,
  defaultTargetLocale,
  toolbarActions,
  overlaySurface,
  importPending = false,
  onImportFile,
  onSubmitInstruction,
  startTranslationDisabled = false,
  candidateReviewDisabled = false,
  candidateDraft = null,
  onCandidateDraftChange,
  onAcceptCandidate,
  onRejectCandidate,
  onRetranslateCandidate,
  onExport,
  onOperationError,
}: TranslationProgramWorkspacePropsV1): ReactNode {
  const copy = translationProgramCopyV1[locale];
  const packageCopy = resolveProgramUiLocalizationV1(initialUi, locale);
  const intakeDefaultTargetLocale = defaultTargetLocale ??
    defaultTranslationTargetLocaleForHostV1(locale);
  return (
    <ProgramUiContainerV1
      processId={processId}
      mode={mode}
      onModeChange={onModeChange}
      locale={locale}
      guidedLabel={copy.guided}
      conversationLabel={copy.conversation}
      guidedSurface={translationSource === null
        ? (
          <TranslationIntakeV1
            key={processId}
            locale={locale}
            packageCopy={packageCopy}
            defaultTargetLocale={intakeDefaultTargetLocale}
            pending={importPending}
            onImportFile={onImportFile}
            onOperationError={onOperationError}
          />
        )
        : (
          <TranslationProcessWorkbenchV1
            processId={processId}
            locale={locale}
            translationSource={translationSource}
            stage={stage}
            openUiDocument={packageCopy?.workbenchDocument ?? null}
            {...(onSubmitInstruction === undefined ? {} : { onSubmitInstruction })}
            startTranslationDisabled={startTranslationDisabled}
            candidateReviewDisabled={candidateReviewDisabled}
            candidateDraft={candidateDraft}
            {...(onCandidateDraftChange === undefined ? {} : { onCandidateDraftChange })}
            {...(onAcceptCandidate === undefined ? {} : { onAcceptCandidate })}
            {...(onRejectCandidate === undefined ? {} : { onRejectCandidate })}
            {...(onRetranslateCandidate === undefined ? {} : { onRetranslateCandidate })}
            {...(onExport === undefined ? {} : { onExport })}
            {...(onOperationError === undefined ? {} : { onOperationError })}
          />
        )}
      conversationSurface={conversationSurface}
      run={run}
      toolbarActions={toolbarActions}
      overlaySurface={overlaySurface}
    />
  );
}
