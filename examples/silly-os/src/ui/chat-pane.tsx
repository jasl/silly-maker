// SPDX-License-Identifier: MIT
import {
  ArrowUp,
  CircleCheck,
  CircleX,
  FileText,
  KeyRound,
  LoaderCircle,
  Paperclip,
  Sparkles,
  StopCircle,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";

import type { BrowserPiWorkerRuntimeV1 } from "../agent/browser-pi-worker-protocol.ts";
import type { SillyOsCopyV1 } from "../content/copy.ts";
import type {
  CreatorChatMessageV1,
  PreviewProgramV1,
  ProgramProposalV1,
} from "../product/contracts.ts";
import type { ProgramWorkspaceReviewProjectionV1 } from "../workspace/contracts.ts";
import { SillyButtonV1 as Button } from "./controls.tsx";

const pendingReviewStatusDescriptionIdV1 = "workspace-review-pending-status";

function acceptedStatusCopyV1(
  copy: SillyOsCopyV1,
  status: ProgramWorkspaceReviewProjectionV1["acceptedStatus"],
): string | null {
  if (status === "matches") return copy.acceptedSnapshotMatches;
  if (status === "changed") return copy.acceptedSnapshotChanged;
  if (status === "unavailable") return copy.acceptedSnapshotUnavailable;
  return null;
}

function pendingStatusCopyV1(
  copy: SillyOsCopyV1,
  status: ProgramWorkspaceReviewProjectionV1["pendingStatus"],
): string | null {
  if (status === "matches") return copy.pendingReviewMatches;
  if (status === "changed") return copy.pendingReviewChanged;
  if (status === "unavailable") return copy.pendingReviewUnavailable;
  return null;
}

export function ProgramWorkspaceReviewV1({
  copy,
  review,
}: {
  readonly copy: SillyOsCopyV1;
  readonly review: ProgramWorkspaceReviewProjectionV1 | null;
}): ReactNode {
  if (
    review === null || (review.latestAccepted === null && review.pendingReview === null)
  ) return null;
  const acceptedStatus = acceptedStatusCopyV1(copy, review.acceptedStatus);
  const pendingStatus = pendingStatusCopyV1(copy, review.pendingStatus);
  const numberFormat = new Intl.NumberFormat(copy.locale);

  return (
    <section
      className="program-workspace-review"
      data-workspace-review=""
      aria-labelledby="workspace-review-heading"
    >
      <h3 id="workspace-review-heading">{copy.workspaceReview}</h3>
      <dl>
        {review.latestAccepted === null ? null : (
          <div data-workspace-review-accepted="">
            <dt>{copy.acceptedSnapshot}</dt>
            <dd>
              <span>
                <span>{copy.snapshotId}</span>
                <code>{review.latestAccepted.snapshotId}</code>
              </span>
              <span>
                <span>{copy.programRevision}</span>
                <strong>{`v${String(review.latestAccepted.programRevision)}`}</strong>
              </span>
              <span>
                <span>{copy.acceptedHead}</span>
                <code>{review.latestAccepted.checkpointId}</code>
                <small>
                  {`${copy.generation} ${String(review.latestAccepted.generation)}`}
                </small>
              </span>
              <span>
                <span>{copy.fileCount}</span>
                <strong>{numberFormat.format(review.latestAccepted.fileCount)}</strong>
                <span aria-hidden="true">·</span>
                <span>{copy.archiveSize}</span>
                <strong>{numberFormat.format(review.latestAccepted.archiveBytes)}</strong>
              </span>
            </dd>
          </div>
        )}
        {review.pendingReview === null ? null : (
          <div data-workspace-review-pending="">
            <dt>{copy.pendingReview}</dt>
            <dd>
              <span>
                <span>{copy.proposalId}</span>
                <code>{review.pendingReview.proposalId}</code>
              </span>
              <span>
                <span>{copy.programRevision}</span>
                <strong>{`v${String(review.pendingReview.programRevision)}`}</strong>
              </span>
              <span>
                <span>{copy.reviewedHead}</span>
                <code>{review.pendingReview.checkpointId}</code>
                <small>{`${copy.generation} ${String(review.pendingReview.generation)}`}</small>
              </span>
            </dd>
          </div>
        )}
        <div data-workspace-review-mutable="">
          <dt>{copy.mutableHead}</dt>
          <dd>
            {review.mutableHead === null ? <span>{copy.mutableHeadUnavailable}</span> : (
              <span>
                <code>{review.mutableHead.checkpointId}</code>
                <small>{`${copy.generation} ${String(review.mutableHead.generation)}`}</small>
              </span>
            )}
          </dd>
        </div>
      </dl>
      <div
        className="program-workspace-review__status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {acceptedStatus === null ? null : (
          <p
            data-workspace-review-accepted-message=""
            data-review-status={review.acceptedStatus ?? undefined}
          >
            {acceptedStatus}
          </p>
        )}
        {pendingStatus === null ? null : (
          <p
            id={pendingReviewStatusDescriptionIdV1}
            data-workspace-review-pending-message=""
            data-review-status={review.pendingStatus ?? undefined}
          >
            {pendingStatus}
          </p>
        )}
      </div>
    </section>
  );
}

export interface ChatPanePropsV1 {
  readonly copy: SillyOsCopyV1;
  readonly messages: readonly CreatorChatMessageV1[];
  readonly proposal: ProgramProposalV1 | null;
  readonly program: PreviewProgramV1 | null;
  readonly workspaceReview: ProgramWorkspaceReviewProjectionV1 | null;
  readonly workpieceOpen: boolean;
  readonly onAccept: () => void;
  readonly onReject: () => void;
  readonly onOpenWorkpiece: () => void;
  readonly onSend: (text: string) => boolean | void | Promise<boolean | void>;
  readonly mutationPending?: boolean;
  readonly piAgentRun?: {
    readonly runtime: BrowserPiWorkerRuntimeV1;
    readonly status:
      | "connecting"
      | "ready"
      | "running"
      | "completed"
      | "failed"
      | "disposed";
    readonly draft: string;
    readonly diagnosticPath: string | null;
    readonly onCancel: () => void;
    readonly onForget: () => void;
  };
}

export function ChatPaneV1({
  copy,
  messages,
  proposal,
  program,
  workspaceReview,
  workpieceOpen,
  onAccept,
  onReject,
  onOpenWorkpiece,
  onSend,
  mutationPending = false,
  piAgentRun,
}: ChatPanePropsV1): ReactNode {
  const [draft, setDraft] = useState("");
  const feedEndRef = useRef<HTMLDivElement>(null);
  const resourceInputRef = useRef<HTMLInputElement>(null);
  const liveAgent = piAgentRun?.runtime === "openai_direct";
  const agentTitle = liveAgent ? copy.piLiveTitle : copy.piTestTitle;
  const agentReady = liveAgent ? copy.piLiveReady : copy.piTestReady;
  const agentFailed = liveAgent ? copy.piLiveFailed : copy.piTestFailed;
  const agentForget = liveAgent ? copy.piLiveForget : copy.piTestForget;
  const pendingReviewChanged = workspaceReview?.pendingStatus === "changed";

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const submitV1 = (event?: FormEvent): void => {
    event?.preventDefault();
    const text = draft.trim();
    if (text.length === 0) return;
    void Promise.resolve(onSend(text)).then((accepted) => {
      if (accepted === false) return;
      setDraft((current) => current.trim() === text ? "" : current);
    });
  };

  return (
    <section className="chat-pane" aria-label={copy.chat} data-workspace-pane="chat">
      <div className="chat-pane__feed" role="log" aria-live="polite">
        <div className="chat-pane__intro">
          <span className="chat-pane__creator-avatar" aria-hidden="true">
            <Sparkles size={16} fill="currentColor" />
          </span>
          <div>
            <strong>{copy.creatorName}</strong>
          </div>
        </div>

        {messages.map((message) => (
          <article
            className={`chat-message chat-message--${message.role}`}
            key={message.messageId}
            data-chat-role={message.role}
          >
            <span className="chat-message__avatar" aria-hidden="true">
              {message.role === "creator"
                ? <Sparkles size={14} fill="currentColor" />
                : copy.locale === "zh-CN"
                ? "你"
                : "Y"}
            </span>
            <div className="chat-message__body">
              <strong>
                {message.role === "creator"
                  ? copy.creatorName
                  : copy.locale === "zh-CN"
                  ? "你"
                  : "You"}
              </strong>
              <p>{message.text}</p>
            </div>
          </article>
        ))}

        {piAgentRun !== undefined && (
          <aside
            className="pi-agent-run"
            data-pi-agent-runtime={piAgentRun.runtime}
            data-pi-agent-run-status={piAgentRun.status}
            data-pi-agent-diagnostic={piAgentRun.diagnosticPath ?? undefined}
          >
            <div className="pi-agent-run__heading">
              {piAgentRun.status === "running"
                ? <LoaderCircle className="is-spinning" size={15} aria-hidden="true" />
                : <KeyRound size={15} aria-hidden="true" />}
              <strong>{agentTitle}</strong>
              <span role="status">
                {piAgentRun.status === "running"
                  ? copy.piTestDraft
                  : piAgentRun.status === "failed" || piAgentRun.status === "disposed"
                  ? agentFailed
                  : agentReady}
              </span>
            </div>
            {piAgentRun.status === "running" && piAgentRun.draft.length > 0 && (
              <p className="pi-agent-run__draft" aria-live="polite">
                {piAgentRun.draft}
              </p>
            )}
            <div className="pi-agent-run__actions">
              {piAgentRun.status === "running" && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  icon={StopCircle}
                  onClick={piAgentRun.onCancel}
                >
                  {copy.piTestCancel}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                icon={KeyRound}
                disabled={mutationPending || piAgentRun.status === "running"}
                onClick={piAgentRun.onForget}
              >
                {agentForget}
              </Button>
            </div>
          </aside>
        )}

        {program !== null && proposal !== null && (
          <article className="program-proposal" data-proposal-status={proposal.status}>
            <div className="program-proposal__heading">
              <span className="program-proposal__icon" aria-hidden="true">
                <FileText size={17} />
              </span>
              <div>
                <span>{copy.proposedProgram}</span>
                <strong>{program.name}</strong>
              </div>
              <span className="program-proposal__status">
                {`v${String(program.revision)} · ${
                  proposal.status === "pending"
                    ? copy.preview
                    : proposal.status === "accepted"
                    ? copy.accepted
                    : copy.rejected
                }`}
              </span>
            </div>
            <p>{program.purpose}</p>
            <ul>
              {program.suggestedCapabilities.map((capability) => (
                <li key={capability.capabilityId}>
                  <CircleCheck size={15} aria-hidden="true" />
                  <span>
                    <strong>{capability.label}</strong>
                    <small>{capability.description}</small>
                  </span>
                </li>
              ))}
            </ul>
            {proposal.status === "pending"
              ? (
                <div className="program-proposal__actions">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={CircleCheck}
                    disabled={mutationPending || pendingReviewChanged}
                    aria-describedby={pendingReviewChanged
                      ? pendingReviewStatusDescriptionIdV1
                      : undefined}
                    onClick={onAccept}
                  >
                    {copy.accept}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={CircleX}
                    disabled={mutationPending}
                    onClick={onReject}
                  >
                    {copy.reject}
                  </Button>
                </div>
              )
              : (
                <div className={`program-proposal__decision is-${proposal.status}`}>
                  {proposal.status === "accepted"
                    ? <CircleCheck size={16} fill="currentColor" aria-hidden="true" />
                    : <CircleX size={16} fill="currentColor" aria-hidden="true" />}
                  <span>{proposal.status === "accepted" ? copy.accepted : copy.rejected}</span>
                </div>
              )}
          </article>
        )}

        <ProgramWorkspaceReviewV1 copy={copy} review={workspaceReview} />

        {program !== null && (
          <button
            type="button"
            className="workpiece-link"
            onClick={onOpenWorkpiece}
            aria-expanded={workpieceOpen}
          >
            <span className="workpiece-link__thumbnail" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>
              <strong>{program.name}</strong>
              <small>{workpieceOpen ? copy.previewTab : copy.openPreview}</small>
            </span>
            <span aria-hidden="true">↗</span>
          </button>
        )}
        <div ref={feedEndRef} />
      </div>

      <form className="chat-composer" onSubmit={submitV1}>
        <label className="silly-os-visually-hidden" htmlFor="workspace-follow-up">
          {copy.sendPlaceholder}
        </label>
        <textarea
          id="workspace-follow-up"
          value={draft}
          rows={3}
          maxLength={4_000}
          placeholder={copy.sendPlaceholder}
          disabled={mutationPending}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submitV1();
            }
          }}
        />
        <div className="chat-composer__actions">
          <input
            ref={resourceInputRef}
            hidden
            type="file"
            multiple
            onChange={(event) => {
              const names = Array.from(event.currentTarget.files ?? [], (file) => file.name);
              if (names.length === 0) return;
              void Promise.resolve(onSend(
                copy.locale === "zh-CN"
                  ? `为这个程序添加资料：${
                    names.join("、")
                  }。当前只记录附件名称，尚未导入文件内容。`
                  : `Add these resources to the program: ${
                    names.join(", ")
                  }. Only the attachment names are recorded; file contents are not imported yet.`,
              ));
              event.currentTarget.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            shape="square"
            size="sm"
            icon={Paperclip}
            aria-label={copy.addResource}
            disabled={mutationPending}
            onClick={() => resourceInputRef.current?.click()}
          />
          <Button
            type="submit"
            variant="primary"
            shape="square"
            size="sm"
            icon={ArrowUp}
            aria-label={copy.send}
            disabled={mutationPending || draft.trim().length === 0}
          />
        </div>
      </form>
    </section>
  );
}
