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
  Sparkles,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

import type { SillyOsCopyV1 } from "../content/copy.ts";
import type {
  CreatorActivityV1,
  PreviewProgramCapabilityV1,
  PreviewProgramV1,
  ProgramProposalV1,
} from "../product/contracts.ts";
import { SillyButtonV1 as Button, SillyTabsV1 as Tabs } from "./controls.tsx";

export type WorkpieceTabV1 = "view" | "source" | "capabilities" | "activity";

export interface WorkpiecePanePropsV1 {
  readonly copy: SillyOsCopyV1;
  readonly program: PreviewProgramV1;
  readonly proposal: ProgramProposalV1 | null;
  readonly activity: readonly CreatorActivityV1[];
  readonly activeTab: WorkpieceTabV1;
  readonly fullscreen: boolean;
  readonly outputRef: React.RefObject<HTMLElement | null>;
  readonly onTabChange: (tab: WorkpieceTabV1) => void;
  readonly onToggleFullscreen: () => void;
  readonly onClose: () => void;
}

function savePreviewV1(program: PreviewProgramV1): void {
  const payload = JSON.stringify(
    {
      previewOnly: true,
      source: "deterministic_fake_preview",
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
  outputRef,
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
            onClick={() => savePreviewV1(program)}
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
          <ProgramCapabilitiesV1 copy={copy} capabilities={program.suggestedCapabilities} />
        )}
        {activeTab === "activity" && <ProgramActivityV1 copy={copy} activity={activity} />}
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
}: {
  readonly copy: SillyOsCopyV1;
  readonly capabilities: readonly PreviewProgramCapabilityV1[];
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
            {copy.locale === "zh-CN"
              ? "Pi、模型、工具执行与数据库属于未来的 typed RPC companion。"
              : "Pi, models, tool execution, and the database belong to a future typed RPC companion."}
          </p>
          <small>{copy.locale === "zh-CN" ? "尚未连接" : "Not connected"}</small>
        </article>
      </div>
    </div>
  );
}

function ProgramActivityV1({
  copy,
  activity,
}: {
  readonly copy: SillyOsCopyV1;
  readonly activity: readonly CreatorActivityV1[];
}): ReactNode {
  return (
    <div className="program-activity">
      <header>
        <History size={20} aria-hidden="true" />
        <div>
          <h2>{copy.activityTab}</h2>
        </div>
      </header>
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
