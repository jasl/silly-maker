// SPDX-License-Identifier: MIT

import { CircleCheck, CircleX, FileText } from "lucide-react";
import type { ReactNode } from "react";

import type { CreatorWorkspaceReviewProjectionV1 } from "../runtime/creator-workspace-review.ts";
import { ButtonV1 as Button } from "../../../src/ui/design-system/button.tsx";
import type { PreviewProgramV1, ProgramProposalV1 } from "../runtime/contracts.ts";
import "./creator-chat.css";
import type { CreatorProgramCopyV1 } from "./creator-program-copy.ts";

const pendingReviewStatusDescriptionIdV1 = "workspace-review-pending-status";
const workspaceReviewNumberFormatsV1 = Object.freeze({
  en: new Intl.NumberFormat("en"),
  "zh-CN": new Intl.NumberFormat("zh-CN"),
});

function acceptedStatusCopyV1(
  copy: CreatorProgramCopyV1,
  status: CreatorWorkspaceReviewProjectionV1["acceptedStatus"],
): string | null {
  if (status === "matches") return copy.acceptedSnapshotMatches;
  if (status === "changed") return copy.acceptedSnapshotChanged;
  if (status === "unavailable") return copy.acceptedSnapshotUnavailable;
  return null;
}

function pendingStatusCopyV1(
  copy: CreatorProgramCopyV1,
  status: CreatorWorkspaceReviewProjectionV1["pendingStatus"],
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
  readonly copy: CreatorProgramCopyV1;
  readonly review: CreatorWorkspaceReviewProjectionV1 | null;
}): ReactNode {
  if (
    review === null || (review.latestAccepted === null && review.pendingReview === null)
  ) return null;
  const acceptedStatus = acceptedStatusCopyV1(copy, review.acceptedStatus);
  const pendingStatus = pendingStatusCopyV1(copy, review.pendingStatus);
  const numberFormat = workspaceReviewNumberFormatsV1[copy.locale];

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

export interface CreatorChatSupplementPropsV1 {
  readonly copy: CreatorProgramCopyV1;
  readonly proposal: ProgramProposalV1 | null;
  readonly program: PreviewProgramV1 | null;
  readonly workspaceReview: CreatorWorkspaceReviewProjectionV1 | null;
  readonly workpieceOpen: boolean;
  readonly decisionPending: boolean;
  readonly onAccept: () => void;
  readonly onReject: () => void;
  readonly onOpenWorkpiece: () => void;
}

export function CreatorChatSupplementV1({
  copy,
  proposal,
  program,
  workspaceReview,
  workpieceOpen,
  decisionPending,
  onAccept,
  onReject,
  onOpenWorkpiece,
}: CreatorChatSupplementPropsV1): ReactNode {
  const pendingReviewChanged = workspaceReview?.pendingStatus === "changed";
  return (
    <>
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
                  disabled={decisionPending || pendingReviewChanged}
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
                  disabled={decisionPending}
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
            <FileText size={20} />
          </span>
          <span>
            <strong>{program.name}</strong>
            <small>{workpieceOpen ? copy.previewTab : copy.openPreview}</small>
          </span>
          <span aria-hidden="true">↗</span>
        </button>
      )}
    </>
  );
}
