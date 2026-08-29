// SPDX-License-Identifier: MIT
import {
  CircleCheck,
  Code2,
  Download,
  FileText,
  FolderArchive,
  History,
  LoaderCircle,
  Maximize2,
  Minimize2,
  PlugZap,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

import type { BrowserPiWorkerRuntimeV1 } from "../agent/browser-pi-worker-protocol.ts";
import type { SillyOsCopyV1 } from "../content/copy.ts";
import type {
  CreatorActivityV1,
  PreviewProgramCapabilityV1,
  PreviewProgramV1,
  ProgramProposalV1,
} from "../product/contracts.ts";
import { ButtonV1 as Button, IconButtonV1 } from "./design-system/button.tsx";
import { ProgressV1 as Progress } from "./design-system/progress.tsx";
import { TabsV1 as Tabs } from "./design-system/tabs.tsx";
import { formatStorageBytesV1 } from "./storage-format.ts";

export type WorkpieceTabV1 = "view" | "source" | "capabilities" | "activity";

export type WorkpieceExecutionWorkspaceDiagnosticCodeV1 =
  | "request_failed"
  | "protocol_invalid"
  | "workspace_busy"
  | "storage_unavailable"
  | "volume_missing"
  | "volume_corrupt"
  | "capacity_exceeded"
  | "recovery_required"
  | "disposed";

export interface WorkpieceExecutionWorkspaceV1 {
  readonly phase: "closed" | "opening" | "open" | "closing" | "failed" | "forgotten" | "disposed";
  readonly descriptor: {
    readonly workspaceSessionId: string;
    readonly generation: number;
  } | null;
  readonly lastReceipt: {
    readonly sequence: number;
    readonly agentRunId: string;
    readonly tool: "write" | "edit" | "bash" | "download";
    readonly outcome: "succeeded" | "failed" | "cancelled";
    readonly effect: "none" | "changed";
    readonly resultingGeneration: number;
    readonly changedPaths: readonly string[];
    readonly diagnosticCode:
      | null
      | "cancelled"
      | "path_rejected"
      | "capacity_exceeded"
      | "execution_failed";
  } | null;
  readonly diagnostic: {
    readonly code: WorkpieceExecutionWorkspaceDiagnosticCodeV1;
    readonly path: string;
  } | null;
}

export type WorkpieceBrowserStoragePersistenceRequestV1 =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable";

export type WorkpieceBrowserStorageV1 =
  | {
    readonly phase: "checking";
    readonly persistenceRequest: "idle";
  }
  | {
    readonly phase: "unavailable";
    readonly persistenceRequest: "idle";
  }
  | {
    readonly phase: "available";
    readonly persisted: boolean;
    readonly usageBytes?: number;
    readonly quotaBytes?: number;
    readonly remainingBytes?: number;
    readonly persistenceRequest: WorkpieceBrowserStoragePersistenceRequestV1;
  };

export interface WorkpieceWorkspaceExportProgressV1 {
  readonly filesCompleted: number;
  readonly filesTotal: number;
  readonly bytesWritten: number;
  readonly bytesTotal: number;
}

export type WorkpieceWorkspaceExportV1 =
  | { readonly phase: "idle" }
  | ({ readonly phase: "exporting" } & WorkpieceWorkspaceExportProgressV1)
  | ({ readonly phase: "cancelling" } & WorkpieceWorkspaceExportProgressV1)
  | ({ readonly phase: "finalizing" } & WorkpieceWorkspaceExportProgressV1)
  | ({ readonly phase: "download-started" } & WorkpieceWorkspaceExportProgressV1)
  | ({ readonly phase: "cancelled" } & WorkpieceWorkspaceExportProgressV1)
  | {
    readonly phase: "failed";
    readonly diagnosticCode: WorkpieceExecutionWorkspaceDiagnosticCodeV1;
  };

export interface WorkpiecePanePropsV1 {
  readonly copy: SillyOsCopyV1;
  readonly program: PreviewProgramV1;
  readonly proposal: ProgramProposalV1 | null;
  readonly activity: readonly CreatorActivityV1[];
  readonly activeTab: WorkpieceTabV1;
  readonly fullscreen: boolean;
  readonly agentMode?: BrowserPiWorkerRuntimeV1;
  readonly executionWorkspace?: WorkpieceExecutionWorkspaceV1;
  readonly browserStorage?: WorkpieceBrowserStorageV1;
  readonly workspaceExport?: WorkpieceWorkspaceExportV1;
  readonly workspaceExportDisabled?: boolean;
  readonly outputRef: React.RefObject<HTMLElement | null>;
  readonly onRetryExecutionWorkspace?: () => void;
  readonly onRequestStoragePersistence?: () => void;
  readonly onExportWorkspace?: () => void;
  readonly onCancelWorkspaceExport?: () => void;
  readonly onTabChange: (tab: WorkpieceTabV1) => void;
  readonly onToggleFullscreen: () => void;
  readonly onClose: () => void;
}

function savePreviewV1(
  program: PreviewProgramV1,
  agentMode: WorkpiecePanePropsV1["agentMode"],
): void {
  const payload = JSON.stringify(
    {
      previewOnly: true,
      source: agentMode ?? "deterministic_fake_preview",
      program,
    },
    null,
    2,
  );
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${
    program.name.replaceAll(/[^\p{Letter}\p{Number}]+/gu, "-").toLowerCase()
  }.preview.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function WorkpiecePaneV1({
  copy,
  program,
  proposal,
  activity,
  activeTab,
  fullscreen,
  agentMode,
  executionWorkspace,
  browserStorage,
  workspaceExport,
  workspaceExportDisabled = false,
  outputRef,
  onRetryExecutionWorkspace,
  onRequestStoragePersistence,
  onExportWorkspace,
  onCancelWorkspaceExport,
  onTabChange,
  onToggleFullscreen,
  onClose,
}: WorkpiecePanePropsV1): ReactNode {
  const tabs = [
    { value: "view", label: copy.previewTab },
    { value: "source", label: copy.sourceTab },
    { value: "capabilities", label: copy.capabilitiesTab },
    { value: "activity", label: copy.activityTab },
  ];
  const showWorkspaceExport = executionWorkspace?.phase === "open" &&
    workspaceExport !== undefined && onExportWorkspace !== undefined;

  return (
    <section
      ref={outputRef}
      className={`workpiece-pane${fullscreen ? " is-fullscreen" : ""}${
        showWorkspaceExport ? " has-workspace-export" : ""
      }`}
      data-workspace-pane="workpiece"
      data-workpiece-tab={activeTab}
      data-workspace-export-state={showWorkspaceExport ? workspaceExport.phase : undefined}
      aria-label={program.name}
      tabIndex={-1}
    >
      <div className="workpiece-pane__document-strip">
        <span className="workpiece-pane__document is-active">
          <FileText size={14} aria-hidden="true" />
          <span>{program.name}</span>
        </span>
        <span className="workpiece-pane__document">
          <Code2 size={14} aria-hidden="true" />
          <span>program.ts</span>
        </span>
      </div>

      <div className="workpiece-pane__toolbar">
        <Tabs
          className="workpiece-pane__tabs"
          listClassName="workpiece-pane__tab-list"
          value={activeTab}
          tabs={tabs}
          onValueChange={(value) => onTabChange(value as WorkpieceTabV1)}
          labels={{ tabList: copy.locale === "zh-CN" ? "工作产物视图" : "Workpiece views" }}
        />
        <div className="workpiece-pane__toolbar-actions">
          <IconButtonV1
            variant="ghost"
            size="sm"
            icon={Download}
            accessibleName={copy.locale === "zh-CN" ? "下载预览清单" : "Download preview manifest"}
            onClick={() => savePreviewV1(program, agentMode)}
          />
          <IconButtonV1
            variant="ghost"
            size="sm"
            icon={fullscreen ? Minimize2 : Maximize2}
            accessibleName={fullscreen ? copy.exitFullscreen : copy.fullscreen}
            onClick={onToggleFullscreen}
          />
          <IconButtonV1
            variant="ghost"
            size="sm"
            icon={X}
            accessibleName={copy.closePreview}
            onClick={onClose}
          />
        </div>
      </div>

      {showWorkspaceExport && (
        <WorkspaceExportStatusV1
          copy={copy}
          state={workspaceExport}
          disabled={workspaceExportDisabled}
          onExport={onExportWorkspace}
          {...(onCancelWorkspaceExport === undefined ? {} : { onCancel: onCancelWorkspaceExport })}
        />
      )}

      <div className="workpiece-pane__body">
        {activeTab === "view" && (
          <ProgramCanvasV1 copy={copy} program={program} proposal={proposal} />
        )}
        {activeTab === "source" && <ProgramSourceV1 program={program} />}
        {activeTab === "capabilities" && (
          <ProgramCapabilitiesV1
            copy={copy}
            capabilities={program.suggestedCapabilities}
            {...(agentMode === undefined ? {} : { agentMode })}
            {...(executionWorkspace === undefined ? {} : { executionWorkspace })}
            {...(onRetryExecutionWorkspace === undefined ? {} : { onRetryExecutionWorkspace })}
            {...(browserStorage === undefined ? {} : { browserStorage })}
            {...(onRequestStoragePersistence === undefined ? {} : { onRequestStoragePersistence })}
          />
        )}
        {activeTab === "activity" && (
          <ProgramActivityV1
            copy={copy}
            activity={activity}
            {...(executionWorkspace === undefined ? {} : { executionWorkspace })}
            {...(onRetryExecutionWorkspace === undefined ? {} : { onRetryExecutionWorkspace })}
            {...(browserStorage === undefined ? {} : { browserStorage })}
            {...(onRequestStoragePersistence === undefined ? {} : { onRequestStoragePersistence })}
          />
        )}
      </div>
    </section>
  );
}

function workspaceExportCopyV1(
  copy: SillyOsCopyV1,
  state: WorkpieceWorkspaceExportV1,
): string {
  switch (state.phase) {
    case "idle":
      return copy.locale === "zh-CN"
        ? "下载当前持久化工作区的 VFS 文件与可移植 manifest。"
        : "Download the current durable workspace VFS files and portable manifest.";
    case "exporting": {
      if (state.filesTotal === 0 && state.bytesTotal === 0) {
        return copy.locale === "zh-CN" ? "正在准备工作区 ZIP……" : "Preparing the workspace ZIP…";
      }
      const files = copy.locale === "zh-CN"
        ? `${String(state.filesCompleted)} / ${String(state.filesTotal)} 个文件`
        : `${String(state.filesCompleted)} of ${String(state.filesTotal)} files`;
      const bytes = state.bytesTotal === 0
        ? ""
        : ` · ${formatStorageBytesV1(state.bytesWritten, copy.locale)} / ${
          formatStorageBytesV1(state.bytesTotal, copy.locale)
        }`;
      return copy.locale === "zh-CN"
        ? `正在生成工作区 ZIP：${files}${bytes}`
        : `Building workspace ZIP: ${files}${bytes}`;
    }
    case "cancelling":
      return copy.locale === "zh-CN"
        ? "正在取消工作区 ZIP 导出……"
        : "Cancelling workspace ZIP export…";
    case "finalizing":
      return copy.locale === "zh-CN"
        ? "正在将 ZIP 交给浏览器下载……"
        : "Handing the ZIP to the browser download…";
    case "download-started":
      return copy.locale === "zh-CN"
        ? `下载已开始 · ${String(state.filesTotal)} 个文件 · ${
          formatStorageBytesV1(state.bytesWritten, copy.locale)
        }`
        : `Download started · ${String(state.filesTotal)} files · ${
          formatStorageBytesV1(state.bytesWritten, copy.locale)
        }`;
    case "cancelled":
      return copy.locale === "zh-CN"
        ? "工作区 ZIP 导出已取消。"
        : "Workspace ZIP export cancelled.";
    case "failed": {
      switch (state.diagnosticCode) {
        case "capacity_exceeded":
          return copy.locale === "zh-CN"
            ? "浏览器空间不足，无法创建临时 ZIP；工作区文件未被修改。"
            : "The browser lacks space for the temporary ZIP. Workspace files were not changed.";
        case "workspace_busy":
          return copy.locale === "zh-CN"
            ? "工作区正在处理另一项操作，请稍后重试。"
            : "The workspace is handling another operation. Try again shortly.";
        case "storage_unavailable":
        case "volume_missing":
        case "volume_corrupt":
        case "recovery_required":
          return copy.locale === "zh-CN"
            ? "当前持久化工作区不可用于导出。"
            : "The durable workspace is not currently available for export.";
        case "protocol_invalid":
        case "request_failed":
          return copy.locale === "zh-CN"
            ? "工作区 ZIP 导出失败，请重试。"
            : "Workspace ZIP export failed. Try again.";
        case "disposed":
          return copy.locale === "zh-CN"
            ? "Agent 工作区连接已关闭，无法导出。"
            : "The Agent workspace connection is closed and cannot export.";
      }
      const exhaustive: never = state.diagnosticCode;
      return exhaustive;
    }
  }
  const exhaustive: never = state;
  return exhaustive;
}

function WorkspaceExportStatusV1({
  copy,
  state,
  disabled,
  onExport,
  onCancel,
}: {
  readonly copy: SillyOsCopyV1;
  readonly state: WorkpieceWorkspaceExportV1;
  readonly disabled: boolean;
  readonly onExport: () => void;
  readonly onCancel?: () => void;
}): ReactNode {
  const cancellable = state.phase === "exporting" || state.phase === "cancelling";
  const working = cancellable || state.phase === "finalizing";
  const progress = state.phase === "failed" || state.phase === "idle" ? null : state;
  return (
    <aside
      className={`workpiece-workspace-export is-${state.phase}`}
      role={state.phase === "failed" ? "alert" : "status"}
      aria-live="polite"
      data-workspace-export-status={state.phase}
      data-workspace-export-files-completed={progress?.filesCompleted}
      data-workspace-export-files-total={progress?.filesTotal}
      data-workspace-export-bytes-written={progress?.bytesWritten}
      data-workspace-export-bytes-total={progress?.bytesTotal}
    >
      <div className="workpiece-workspace-export__summary">
        {working
          ? <LoaderCircle className="is-spinning" size={16} aria-hidden="true" />
          : state.phase === "download-started"
          ? <CircleCheck size={16} aria-hidden="true" />
          : <FolderArchive size={16} aria-hidden="true" />}
        <span>
          <strong>{copy.locale === "zh-CN" ? "可移植工作区" : "Portable workspace"}</strong>
          <small>{workspaceExportCopyV1(copy, state)}</small>
        </span>
      </div>
      {working && progress !== null && progress.bytesTotal > 0 && (
        <Progress
          accessibleName={copy.locale === "zh-CN"
            ? "工作区 ZIP 导出进度"
            : "Workspace ZIP export progress"}
          max={progress.bytesTotal}
          value={Math.min(progress.bytesWritten, progress.bytesTotal)}
        />
      )}
      <div className="workpiece-workspace-export__actions">
        {cancellable
          ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={onCancel === undefined || state.phase === "cancelling"}
              data-workspace-export-action="cancel"
              onClick={onCancel}
            >
              {state.phase === "cancelling"
                ? copy.locale === "zh-CN" ? "正在取消" : "Cancelling"
                : copy.locale === "zh-CN"
                ? "取消"
                : "Cancel"}
            </Button>
          )
          : state.phase === "finalizing"
          ? null
          : (
            <Button
              type="button"
              size="sm"
              icon={Download}
              disabled={disabled}
              data-workspace-export-action="start"
              onClick={onExport}
            >
              {copy.locale === "zh-CN" ? "下载工作区 ZIP" : "Download workspace ZIP"}
            </Button>
          )}
      </div>
    </aside>
  );
}

function ProgramCanvasV1({
  copy,
  program,
  proposal,
}: {
  readonly copy: SillyOsCopyV1;
  readonly program: PreviewProgramV1;
  readonly proposal: ProgramProposalV1 | null;
}): ReactNode {
  return (
    <div className="program-canvas" data-program-kind={program.kind}>
      <article className="program-surface">
        <header className="program-surface__header">
          <div>
            <span className="program-surface__eyebrow">
              {program.kind === "translation"
                ? copy.locale === "zh-CN" ? "视觉小说翻译工程" : "Visual-novel translation project"
                : copy.locale === "zh-CN"
                ? "创作者程序"
                : "Creator program"}
            </span>
            <h2>{program.name}</h2>
            <p>{program.purpose}</p>
          </div>
          <span className={`program-surface__state is-${proposal?.status ?? "pending"}`}>
            <span />
            {proposal?.status === "accepted"
              ? copy.accepted
              : proposal?.status === "rejected"
              ? copy.rejected
              : copy.preview}
          </span>
        </header>

        {program.kind === "translation"
          ? <TranslationWorkpieceV1 copy={copy} />
          : <GeneralWorkpieceV1 copy={copy} program={program} />}
      </article>
    </div>
  );
}

function TranslationWorkpieceV1({ copy }: { readonly copy: SillyOsCopyV1 }): ReactNode {
  const rows = copy.locale === "zh-CN"
    ? [
      ["A quiet station at the edge of the sea.", "海边尽头，一座安静的车站。", "approved"],
      ["You really came back.", "你真的回来了。", "review"],
      ["The last train leaves before dawn.", "末班车会在黎明前出发。", "draft"],
    ]
    : [
      ["海边尽头，一座安静的车站。", "A quiet station at the edge of the sea.", "approved"],
      ["你真的回来了。", "You really came back.", "review"],
      ["末班车会在黎明前出发。", "The last train leaves before dawn.", "draft"],
    ];

  return (
    <div className="translation-workpiece">
      <aside className="translation-workpiece__files" aria-label="Project files">
        <div className="translation-workpiece__files-heading">
          <strong>{copy.locale === "zh-CN" ? "脚本" : "Scripts"}</strong>
          <span>24</span>
        </div>
        <button type="button" className="is-active">
          <FileText size={14} aria-hidden="true" />
          <span>prologue.ks</span>
          <span>18</span>
        </button>
        <button type="button">
          <FileText size={14} aria-hidden="true" />
          <span>station.ks</span>
          <span>42</span>
        </button>
        <button type="button">
          <FileText size={14} aria-hidden="true" />
          <span>memory.ks</span>
          <span>31</span>
        </button>
        <div className="translation-workpiece__progress">
          <span>{copy.locale === "zh-CN" ? "工程进度" : "Project progress"}</span>
          <strong>68%</strong>
          <Progress
            className="translation-workpiece__meter"
            accessibleName={copy.locale === "zh-CN" ? "工程进度" : "Project progress"}
            value={68}
            max={100}
            valueText="68%"
          />
        </div>
      </aside>
      <section className="translation-workpiece__editor" aria-label="Translation review queue">
        <div className="translation-workpiece__editor-heading">
          <div>
            <strong>prologue.ks</strong>
            <span>{copy.locale === "zh-CN" ? "第 1 章 · 18 行" : "Chapter 1 · 18 lines"}</span>
          </div>
          <span className="translation-workpiece__filter">
            {copy.locale === "zh-CN" ? "全部状态" : "All states"}
          </span>
        </div>
        <div className="translation-workpiece__columns" aria-hidden="true">
          <span>{copy.locale === "zh-CN" ? "原文" : "Source"}</span>
          <span>{copy.locale === "zh-CN" ? "译文" : "Translation"}</span>
          <span>{copy.locale === "zh-CN" ? "状态" : "Status"}</span>
        </div>
        <div className="translation-workpiece__rows">
          {rows.map(([source, translation, status], index) => (
            <article className="translation-line" key={source}>
              <span className="translation-line__number">
                {String(index + 14).padStart(2, "0")}
              </span>
              <p lang={copy.locale === "zh-CN" ? "en" : "zh-CN"}>{source}</p>
              <div className="translation-line__translation">
                <p>{translation}</p>
                {status === "review" && (
                  <small>
                    <Sparkles size={12} fill="currentColor" aria-hidden="true" />
                    {copy.locale === "zh-CN"
                      ? "语气可能需要人工确认"
                      : "Tone may need human review"}
                  </small>
                )}
              </div>
              <span className={`translation-line__status is-${status}`}>
                {status === "approved"
                  ? copy.locale === "zh-CN" ? "已确认" : "Approved"
                  : status === "review"
                  ? copy.locale === "zh-CN" ? "待审" : "Review"
                  : copy.locale === "zh-CN"
                  ? "草稿"
                  : "Draft"}
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function GeneralWorkpieceV1({
  copy,
  program,
}: {
  readonly copy: SillyOsCopyV1;
  readonly program: PreviewProgramV1;
}): ReactNode {
  return (
    <div className="general-workpiece">
      <section>
        <span>01</span>
        <strong>{copy.locale === "zh-CN" ? "结构" : "Structure"}</strong>
        <p>{program.suggestedCapabilities[0]?.description}</p>
      </section>
      <section>
        <span>02</span>
        <strong>{copy.locale === "zh-CN" ? "工作产物" : "Workpiece"}</strong>
        <p>{program.suggestedCapabilities[1]?.description}</p>
      </section>
      <section>
        <span>03</span>
        <strong>{copy.locale === "zh-CN" ? "人工验收" : "Human review"}</strong>
        <p>{program.suggestedCapabilities[2]?.description}</p>
      </section>
    </div>
  );
}

function ProgramSourceV1({
  program,
}: {
  readonly program: PreviewProgramV1;
}): ReactNode {
  const source = [
    'import { defineProgram } from "@sillyos/creator";',
    "",
    "export default defineProgram({",
    `  name: ${JSON.stringify(program.name)},`,
    `  revision: ${String(program.revision)},`,
    `  purpose: ${JSON.stringify(program.purpose)},`,
    "  requirements: [",
    ...program.requirements.map((requirement) => `    ${JSON.stringify(requirement)},`),
    "  ],",
    "  capabilities: [",
    ...program.suggestedCapabilities.map((capability) =>
      `    ${JSON.stringify(capability.capabilityId)},`
    ),
    "  ],",
    '  approval: "human",',
    "});",
  ].join("\n");

  return (
    <div className="program-source">
      <header>
        <div>
          <Code2 size={18} aria-hidden="true" />
          <span>
            <strong>program.ts</strong>
          </span>
        </div>
        <span>TypeScript</span>
      </header>
      <pre tabIndex={0} aria-label="Program preview source"><code>{source}</code></pre>
    </div>
  );
}

function ProgramCapabilitiesV1({
  copy,
  capabilities,
  agentMode,
  executionWorkspace,
  onRetryExecutionWorkspace,
  browserStorage,
  onRequestStoragePersistence,
}: {
  readonly copy: SillyOsCopyV1;
  readonly capabilities: readonly PreviewProgramCapabilityV1[];
  readonly agentMode?: BrowserPiWorkerRuntimeV1;
  readonly executionWorkspace?: WorkpieceExecutionWorkspaceV1;
  readonly onRetryExecutionWorkspace?: () => void;
  readonly browserStorage?: WorkpieceBrowserStorageV1;
  readonly onRequestStoragePersistence?: () => void;
}): ReactNode {
  return (
    <div className="program-capabilities">
      <header>
        <span>{copy.locale === "zh-CN" ? "程序组合" : "Program composition"}</span>
        <h2>{copy.capabilitiesTab}</h2>
        <p>
          {copy.locale === "zh-CN"
            ? "这一页展示建议的边界；当前切片不会安装 Mod，也不会建立虚假的模型连接。"
            : "This page shows the proposed boundaries. The slice does not install Mods or fake a model connection."}
        </p>
      </header>
      <div className="program-capabilities__grid">
        {capabilities.map((capability, index) => (
          <article key={capability.capabilityId}>
            <span className="program-capabilities__ordinal">0{index + 1}</span>
            <CircleCheck size={20} aria-hidden="true" />
            <strong>{capability.label}</strong>
            <p>{capability.description}</p>
            <small>
              {copy.locale === "zh-CN" ? "建议的本地能力" : "Proposed local capability"}
            </small>
          </article>
        ))}
        <article className="is-external">
          <span className="program-capabilities__ordinal">RPC</span>
          <PlugZap size={20} aria-hidden="true" />
          <strong>{copy.locale === "zh-CN" ? "Agent Host" : "Agent Host"}</strong>
          <p>
            {agentMode === "deterministic_test"
              ? copy.locale === "zh-CN"
                ? "固定版本 Agent runtime 正在 Browser Worker 中通过 read/write/edit/bash 与受限 proposal 工具操作持久化 Program workspace；bash 使用 Browser Local 虚拟 shell 的终端聚合输出，并非 Linux 容器或 live LLM。"
                : "The pinned Agent runtime uses read/write/edit/bash and one bounded proposal tool over a persistent Program workspace in Browser Workers. Bash uses terminal-aggregate output from the Browser Local virtual shell; this is neither a Linux container nor a live LLM."
              : agentMode === "pi_provider"
              ? copy.locale === "zh-CN"
                ? "固定版本 Agent runtime 正在 Browser Worker 中通过你选择的模型使用受限 proposal 工具。保存的 Key 留在凭据保险库中，当前 Worker 只接收匹配 Provider 的一次性精确交接；read/write/edit/bash 要等独立来源的 Workspace Sandbox 接通后才会开放。"
                : "The pinned Agent runtime uses one bounded proposal tool with your selected model in a Browser Worker. The saved key remains in the Credential Vault, and the current Worker receives only an exact one-time handoff for the matching Provider; read/write/edit/bash remain unavailable until the independent-origin Workspace Sandbox is connected."
              : copy.locale === "zh-CN"
              ? "模型、工具执行与数据库属于未来的 typed RPC companion。"
              : "Models, tool execution, and the database belong to a future typed RPC companion."}
          </p>
          <small>
            {agentMode === "deterministic_test"
              ? copy.locale === "zh-CN" ? "确定性测试接线" : "Deterministic test wiring"
              : agentMode === "pi_provider"
              ? copy.locale === "zh-CN"
                ? "浏览器 Agent · 实时连接"
                : "Browser Agent · live connection"
              : copy.locale === "zh-CN"
              ? "尚未连接"
              : "Not connected"}
          </small>
          {agentMode !== undefined && executionWorkspace !== undefined && (
            <ExecutionWorkspaceStatusV1
              copy={copy}
              workspace={executionWorkspace}
              {...(onRetryExecutionWorkspace === undefined
                ? {}
                : { onRetry: onRetryExecutionWorkspace })}
            />
          )}
          {agentMode !== undefined && executionWorkspace !== undefined &&
            browserStorage !== undefined && (
            <BrowserWorkspaceStorageStatusV1
              copy={copy}
              workspace={executionWorkspace}
              storage={browserStorage}
              {...(onRequestStoragePersistence === undefined
                ? {}
                : { onRequestPersistence: onRequestStoragePersistence })}
            />
          )}
        </article>
      </div>
    </div>
  );
}

function ProgramActivityV1({
  copy,
  activity,
  executionWorkspace,
  onRetryExecutionWorkspace,
  browserStorage,
  onRequestStoragePersistence,
}: {
  readonly copy: SillyOsCopyV1;
  readonly activity: readonly CreatorActivityV1[];
  readonly executionWorkspace?: WorkpieceExecutionWorkspaceV1;
  readonly onRetryExecutionWorkspace?: () => void;
  readonly browserStorage?: WorkpieceBrowserStorageV1;
  readonly onRequestStoragePersistence?: () => void;
}): ReactNode {
  return (
    <div className="program-activity">
      <header>
        <History size={20} aria-hidden="true" />
        <div>
          <h2>{copy.activityTab}</h2>
        </div>
      </header>
      {executionWorkspace !== undefined && (
        <>
          <ExecutionWorkspaceStatusV1
            copy={copy}
            workspace={executionWorkspace}
            {...(onRetryExecutionWorkspace === undefined
              ? {}
              : { onRetry: onRetryExecutionWorkspace })}
          />
          {browserStorage !== undefined && (
            <BrowserWorkspaceStorageStatusV1
              copy={copy}
              workspace={executionWorkspace}
              storage={browserStorage}
              {...(onRequestStoragePersistence === undefined
                ? {}
                : { onRequestPersistence: onRequestStoragePersistence })}
            />
          )}
        </>
      )}
      <ol>
        {activity.map((item) => (
          <li key={item.activityId}>
            <span className="program-activity__sequence">
              {String(item.sequence).padStart(2, "0")}
            </span>
            <span className="program-activity__line" aria-hidden="true" />
            <div>
              <strong>{item.summary}</strong>
              <small>{item.kind.replaceAll("_", " ")}</small>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function shouldOfferBrowserWorkspacePersistenceV1(input: {
  readonly workspace: WorkpieceExecutionWorkspaceV1;
  readonly storage: WorkpieceBrowserStorageV1;
  readonly requestAvailable: boolean;
}): boolean {
  return input.requestAvailable && input.workspace.phase === "open" &&
    (input.workspace.descriptor?.generation ?? 0) > 1 &&
    input.storage.phase === "available" && !input.storage.persisted &&
    input.storage.persistenceRequest === "idle";
}

function browserStorageEstimateCopyV1(
  copy: SillyOsCopyV1,
  storage: Extract<WorkpieceBrowserStorageV1, { readonly phase: "available" }>,
): string {
  const usage = storage.usageBytes === undefined
    ? null
    : formatStorageBytesV1(storage.usageBytes, copy.locale);
  const quota = storage.quotaBytes === undefined
    ? null
    : formatStorageBytesV1(storage.quotaBytes, copy.locale);
  const remaining = storage.remainingBytes === undefined
    ? null
    : formatStorageBytesV1(storage.remainingBytes, copy.locale);
  const scope = copy.locale === "zh-CN"
    ? "这些是此网站来源的浏览器估算，包含 OPFS 及其他来源存储，并非当前 Program 的独占用量或固定上限。"
    : "These are advisory browser estimates for this site origin, including OPFS and other origin storage—not this Program's exclusive usage or a fixed limit.";
  if (usage !== null && quota !== null) {
    return copy.locale === "zh-CN"
      ? `估算已使用 ${usage} / ${quota}${
        remaining === null ? "" : `，约剩余 ${remaining}`
      }。${scope}`
      : `Estimated usage is ${usage} of ${quota}${
        remaining === null ? "" : `, with about ${remaining} remaining`
      }. ${scope}`;
  }
  if (usage !== null) {
    return copy.locale === "zh-CN"
      ? `估算已使用 ${usage}；浏览器未报告总配额。${scope}`
      : `Estimated usage is ${usage}; the browser did not report a quota. ${scope}`;
  }
  if (quota !== null) {
    return copy.locale === "zh-CN"
      ? `浏览器报告的来源配额约为 ${quota}，但未报告已使用量。${scope}`
      : `The browser reports an origin quota of about ${quota}, but no usage value. ${scope}`;
  }
  return copy.locale === "zh-CN"
    ? `浏览器未报告可显示的容量数字。${scope}`
    : `The browser did not report displayable capacity numbers. ${scope}`;
}

function browserStoragePersistenceCopyV1(
  copy: SillyOsCopyV1,
  storage: Extract<WorkpieceBrowserStorageV1, { readonly phase: "available" }>,
  importantWork: boolean,
): string {
  if (storage.persisted) {
    return storage.persistenceRequest === "granted"
      ? copy.locale === "zh-CN"
        ? "浏览器已接受本次请求，并报告此来源使用持久化存储。"
        : "The browser accepted the request and reports persistent storage for this origin."
      : copy.locale === "zh-CN"
      ? "浏览器报告此来源已使用持久化存储。"
      : "The browser reports persistent storage for this origin.";
  }
  switch (storage.persistenceRequest) {
    case "requesting":
      return copy.locale === "zh-CN"
        ? "正在请求浏览器保留此来源的数据……"
        : "Requesting persistent storage for this origin…";
    case "denied":
      return copy.locale === "zh-CN"
        ? "浏览器未授予持久化存储；工作区仍可使用，但数据仍可能按浏览器策略被回收。"
        : "The browser did not grant persistent storage. The workspace remains available, but its data may still be evicted under browser policy.";
    case "unavailable":
      return copy.locale === "zh-CN"
        ? "持久化请求 API 不可用或请求失败；工作区仍可使用。"
        : "The persistence request API is unavailable or failed. The workspace remains available.";
    case "granted":
      return copy.locale === "zh-CN"
        ? "浏览器先前接受了请求，但当前检查仍未报告持久化；以当前检查结果为准。"
        : "The browser previously accepted the request, but the current inspection does not report persistence; the current inspection is authoritative.";
    case "idle":
      return importantWork
        ? copy.locale === "zh-CN"
          ? "此来源尚未获持久化存储。你可以在已有重要工作后主动请求；拒绝不会停用工作区。"
          : "This origin does not have persistent storage. You can request it after important work exists; denial will not disable the workspace."
        : copy.locale === "zh-CN"
        ? "此来源尚未获持久化存储。工作区仍以浏览器的普通持久化策略保存。"
        : "This origin does not have persistent storage. The workspace remains under ordinary browser storage policy.";
  }
  const exhaustive: never = storage.persistenceRequest;
  return exhaustive;
}

function BrowserWorkspaceStorageStatusV1({
  copy,
  workspace,
  storage,
  onRequestPersistence,
}: {
  readonly copy: SillyOsCopyV1;
  readonly workspace: WorkpieceExecutionWorkspaceV1;
  readonly storage: WorkpieceBrowserStorageV1;
  readonly onRequestPersistence?: () => void;
}): ReactNode {
  const importantWork = workspace.phase === "open" &&
    (workspace.descriptor?.generation ?? 0) > 1;
  const offerPersistence = shouldOfferBrowserWorkspacePersistenceV1({
    workspace,
    storage,
    requestAvailable: onRequestPersistence !== undefined,
  });
  return (
    <aside
      className="program-browser-storage"
      role="status"
      aria-live="polite"
      data-browser-storage-status={storage.phase}
      data-browser-storage-persisted={storage.phase === "available"
        ? String(storage.persisted)
        : undefined}
      data-browser-storage-persistence-request={storage.persistenceRequest}
    >
      <strong>
        {copy.locale === "zh-CN" ? "浏览器来源存储" : "Browser origin storage"}
      </strong>
      {storage.phase === "checking"
        ? (
          <small>
            {copy.locale === "zh-CN"
              ? "正在读取浏览器提供的来源级存储估算……"
              : "Reading the browser's origin-level storage estimate…"}
          </small>
        )
        : storage.phase === "unavailable"
        ? (
          <small>
            {copy.locale === "zh-CN"
              ? "浏览器未提供存储估算或查询失败；SillyOS 不会显示推测值。工作区可用性由上方检查点状态单独报告。"
              : "The browser did not provide a storage estimate or the inspection failed. SillyOS does not show guessed values; workspace availability is reported separately above."}
          </small>
        )
        : (
          <>
            <small>{browserStorageEstimateCopyV1(copy, storage)}</small>
            <small>{browserStoragePersistenceCopyV1(copy, storage, importantWork)}</small>
            {offerPersistence && onRequestPersistence !== undefined && (
              <Button type="button" size="sm" onClick={onRequestPersistence}>
                {copy.locale === "zh-CN" ? "请求持久化存储" : "Request persistent storage"}
              </Button>
            )}
          </>
        )}
    </aside>
  );
}

function executionWorkspaceFailureCopyV1(
  copy: SillyOsCopyV1,
  code: WorkpieceExecutionWorkspaceDiagnosticCodeV1,
): string {
  switch (code) {
    case "request_failed":
      return copy.locale === "zh-CN"
        ? "工作区请求失败。请稍后再试。"
        : "The workspace request failed. Try again later.";
    case "protocol_invalid":
      return copy.locale === "zh-CN"
        ? "工作区返回了无效协议响应，无法安全继续。"
        : "The workspace returned an invalid protocol response and cannot continue safely.";
    case "workspace_busy":
      return copy.locale === "zh-CN"
        ? "另一个页面正在使用此 Program 工作区。关闭另一页面后重试。"
        : "Another page is using this Program workspace. Close the other page, then retry.";
    case "storage_unavailable":
      return copy.locale === "zh-CN"
        ? "此浏览器上下文无法提供持久化本地工作区；SillyOS 没有创建替代卷。"
        : "This browser context cannot provide a durable local workspace. SillyOS did not create a replacement volume.";
    case "volume_missing":
      return copy.locale === "zh-CN"
        ? "此 Program 的本地工作区数据已丢失或被清除；SillyOS 没有用空卷替代它。"
        : "This Program's local workspace data is missing or was cleared. SillyOS did not substitute an empty volume.";
    case "volume_corrupt":
      return copy.locale === "zh-CN"
        ? "此 Program 的检查点无法可靠恢复；SillyOS 没有用空卷替代它。"
        : "This Program's checkpoint cannot be recovered reliably. SillyOS did not substitute an empty volume.";
    case "capacity_exceeded":
      return copy.locale === "zh-CN"
        ? "浏览器存储容量已用尽；先前的完整检查点仍被保留。"
        : "Browser storage capacity was exhausted. The previous complete checkpoint is retained.";
    case "recovery_required":
      return copy.locale === "zh-CN"
        ? "Workspace Host 已停止。请重新加载并重新初始化 Agent；若某次写入的结果未知，SillyOS 不会盲目重放。"
        : "The Workspace Host stopped. Reload and initialize the Agent again; if a write has an unknown outcome, SillyOS does not replay it blindly.";
    case "disposed":
      return copy.locale === "zh-CN"
        ? "Agent 工作区连接已关闭。请重新初始化 Agent。"
        : "The Agent workspace connection is closed. Initialize the Agent again.";
  }
  const exhaustive: never = code;
  return exhaustive;
}

function ExecutionWorkspaceStatusV1({
  copy,
  workspace,
  onRetry,
}: {
  readonly copy: SillyOsCopyV1;
  readonly workspace: WorkpieceExecutionWorkspaceV1;
  readonly onRetry?: () => void;
}): ReactNode {
  const generation = workspace.descriptor?.generation;
  const receipt = workspace.lastReceipt;
  const changedPath = receipt?.changedPaths[0];
  const mutationTool = receipt?.tool ?? "workspace mutation";
  const failureCopy = workspace.phase === "failed"
    ? workspace.diagnostic === null
      ? copy.locale === "zh-CN"
        ? "工作区当前不可用，且未返回诊断信息。"
        : "The workspace is unavailable and did not return a diagnostic."
      : executionWorkspaceFailureCopyV1(copy, workspace.diagnostic.code)
    : null;
  const phaseLabel = workspace.phase === "open"
    ? copy.locale === "zh-CN" ? "已打开" : "Open"
    : workspace.phase === "opening"
    ? copy.locale === "zh-CN" ? "正在打开" : "Opening"
    : workspace.phase === "closing"
    ? copy.locale === "zh-CN" ? "正在关闭" : "Closing"
    : workspace.phase === "failed"
    ? copy.locale === "zh-CN" ? "不可用" : "Unavailable"
    : copy.locale === "zh-CN"
    ? "已关闭"
    : "Closed";
  return (
    <aside
      className="program-execution-workspace"
      role={workspace.phase === "failed" ? "alert" : "status"}
      data-execution-workspace-status={workspace.phase}
      data-execution-workspace-generation={generation}
      data-execution-workspace-receipt-sequence={receipt?.sequence}
    >
      <strong>
        {workspace.phase === "failed"
          ? copy.locale === "zh-CN" ? "Program 工作区" : "Program workspace"
          : copy.locale === "zh-CN"
          ? "Program 工作区检查点"
          : "Program workspace checkpoint"}
      </strong>
      <span>
        {phaseLabel}
        {generation === undefined
          ? ""
          : copy.locale === "zh-CN"
          ? ` · 第 ${String(generation)} 代`
          : ` · generation ${String(generation)}`}
      </span>
      <small>
        {failureCopy !== null
          ? failureCopy
          : receipt?.diagnosticCode === "capacity_exceeded"
          ? copy.locale === "zh-CN"
            ? `最近一次 ${mutationTool} 因浏览器容量不足而失败；先前的完整检查点仍被保留。`
            : `The last ${mutationTool} exceeded browser capacity. The previous complete checkpoint is retained.`
          : receipt === null
          ? copy.locale === "zh-CN"
            ? "当前检查点保存在此浏览器中；重新加载会恢复同一卷与代数，mutation receipt 仅属于本次会话。"
            : "The current checkpoint is stored in this browser. Reload reopens the same volume and generation; mutation receipts remain session-only."
          : copy.locale === "zh-CN"
          ? `最近一次 ${mutationTool}：${receipt.outcome} / ${receipt.effect}${
            changedPath === undefined ? "" : ` · ${changedPath}`
          }`
          : `Last ${mutationTool}: ${receipt.outcome} / ${receipt.effect}${
            changedPath === undefined ? "" : ` · ${changedPath}`
          }`}
      </small>
      {workspace.phase === "failed" && workspace.diagnostic?.code === "workspace_busy" &&
        onRetry !== undefined && (
        <Button type="button" size="sm" icon={RotateCcw} onClick={onRetry}>
          {copy.retry}
        </Button>
      )}
    </aside>
  );
}
