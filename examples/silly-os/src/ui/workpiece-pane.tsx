// SPDX-License-Identifier: MIT
import {
  CircleCheck,
  Code2,
  Download,
  FileText,
  History,
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
import { SillyButtonV1 as Button, SillyTabsV1 as Tabs } from "./controls.tsx";

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

export interface WorkpiecePanePropsV1 {
  readonly copy: SillyOsCopyV1;
  readonly program: PreviewProgramV1;
  readonly proposal: ProgramProposalV1 | null;
  readonly activity: readonly CreatorActivityV1[];
  readonly activeTab: WorkpieceTabV1;
  readonly fullscreen: boolean;
  readonly agentMode?: BrowserPiWorkerRuntimeV1;
  readonly executionWorkspace?: WorkpieceExecutionWorkspaceV1;
  readonly outputRef: React.RefObject<HTMLElement | null>;
  readonly onRetryExecutionWorkspace?: () => void;
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
  outputRef,
  onRetryExecutionWorkspace,
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

  return (
    <section
      ref={outputRef}
      className={`workpiece-pane${fullscreen ? " is-fullscreen" : ""}`}
      data-workspace-pane="workpiece"
      data-workpiece-tab={activeTab}
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
          <Button
            variant="ghost"
            shape="square"
            size="sm"
            icon={Download}
            aria-label="Download preview manifest"
            onClick={() => savePreviewV1(program, agentMode)}
          />
          <Button
            variant="ghost"
            shape="square"
            size="sm"
            icon={fullscreen ? Minimize2 : Maximize2}
            aria-label={fullscreen ? copy.exitFullscreen : copy.fullscreen}
            onClick={onToggleFullscreen}
          />
          <Button
            variant="ghost"
            shape="square"
            size="sm"
            icon={X}
            aria-label={copy.closePreview}
            onClick={onClose}
          />
        </div>
      </div>

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
          />
        )}
        {activeTab === "activity" && (
          <ProgramActivityV1
            copy={copy}
            activity={activity}
            {...(executionWorkspace === undefined ? {} : { executionWorkspace })}
            {...(onRetryExecutionWorkspace === undefined ? {} : { onRetryExecutionWorkspace })}
          />
        )}
      </div>
    </section>
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
          <span className="translation-workpiece__meter">
            <span />
          </span>
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
}: {
  readonly copy: SillyOsCopyV1;
  readonly capabilities: readonly PreviewProgramCapabilityV1[];
  readonly agentMode?: BrowserPiWorkerRuntimeV1;
  readonly executionWorkspace?: WorkpieceExecutionWorkspaceV1;
  readonly onRetryExecutionWorkspace?: () => void;
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
                ? "固定版本 Pi Agent 正在 Browser Worker 中通过原生 read/write 与受限 proposal 工具操作持久化 Program workspace；这不是 live LLM。"
                : "The pinned Pi Agent uses native read/write and one bounded proposal tool over a persistent Program workspace in Browser Workers. This is not a live LLM."
              : agentMode === "openai_direct"
              ? copy.locale === "zh-CN"
                ? "固定版本 Pi Agent 正在 Browser Worker 中通过 OpenAI gpt-4.1-nano 使用原生 read/write 与受限 proposal 工具；key 仅在 Agent Worker 内存中，Program workspace 持久化在当前浏览器。"
                : "The pinned Pi Agent exposes native read/write and one bounded proposal tool through OpenAI gpt-4.1-nano in Browser Workers. The key stays in Agent Worker memory; the Program workspace persists in this browser."
              : copy.locale === "zh-CN"
              ? "Pi、模型、工具执行与数据库属于未来的 typed RPC companion。"
              : "Pi, models, tool execution, and the database belong to a future typed RPC companion."}
          </p>
          <small>
            {agentMode === "deterministic_test"
              ? copy.locale === "zh-CN" ? "Pi 0.84.3 测试接线" : "Pi 0.84.3 test wiring"
              : agentMode === "openai_direct"
              ? copy.locale === "zh-CN" ? "Pi 0.84.3 · OpenAI 实时连接" : "Pi 0.84.3 · live OpenAI"
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
}: {
  readonly copy: SillyOsCopyV1;
  readonly activity: readonly CreatorActivityV1[];
  readonly executionWorkspace?: WorkpieceExecutionWorkspaceV1;
  readonly onRetryExecutionWorkspace?: () => void;
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
        <ExecutionWorkspaceStatusV1
          copy={copy}
          workspace={executionWorkspace}
          {...(onRetryExecutionWorkspace === undefined
            ? {}
            : { onRetry: onRetryExecutionWorkspace })}
        />
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
        ? "Workspace Host 在操作期间停止。请重新加载并重新初始化 Agent；结果未知的写入不会被盲目重放。"
        : "The Workspace Host stopped during an operation. Reload and initialize the Agent again; a write with an unknown outcome is not replayed blindly.";
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
            ? "最近一次 write 因浏览器容量不足而失败；先前的完整检查点仍被保留。"
            : "The last write exceeded browser capacity. The previous complete checkpoint is retained."
          : receipt === null
          ? copy.locale === "zh-CN"
            ? "当前检查点保存在此浏览器中；重新加载会恢复同一卷与代数，mutation receipt 仅属于本次会话。"
            : "The current checkpoint is stored in this browser. Reload reopens the same volume and generation; mutation receipts remain session-only."
          : copy.locale === "zh-CN"
          ? `最近一次 write：${receipt.outcome} / ${receipt.effect}${
            changedPath === undefined ? "" : ` · ${changedPath}`
          }`
          : `Last write: ${receipt.outcome} / ${receipt.effect}${
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
