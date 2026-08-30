// SPDX-License-Identifier: MIT
import { LayoutGrid, MessageCircle } from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import type { SillyOsCopyV1, SillyOsLocaleV1 } from "../content/copy.ts";
import type { SillyOsThemeModeV1 } from "../product/browser-product-preferences-repository.ts";
import type { CreatorActiveProcessProjectionV1 } from "../product/creator-controller.ts";
import type { PreviewProgramV1, ProgramProposalV1 } from "../product/contracts.ts";
import type { ProgramWorkspaceReviewProjectionV1 } from "../workspace/contracts.ts";
import {
  ChatPaneV1,
  type ChatPanePropsV1,
  type ConversationViewStateV1,
  createDefaultConversationViewStateV1,
} from "./chat-pane.tsx";
import { ButtonV1 as Button } from "./design-system/button.tsx";
import {
  type WorkpieceBrowserStorageV1,
  type WorkpieceExecutionWorkspaceV1,
  type WorkpieceTabV1,
  type WorkpieceWorkspaceExportV1,
  WorkpiecePaneV1,
} from "./workpiece-pane.tsx";
import {
  ProgramWorkspaceMobileNavV1,
  ProgramWorkspaceTopbarV1,
  type WorkspaceMobilePaneV1,
} from "./workspace-chrome.tsx";

const chatMinimumWidthV1 = 280;
const workpieceMinimumWidthV1 = 400;
const chatDefaultWidthV1 = 420;

export interface ProgramWorkspaceSessionViewStateV1 {
  readonly draft: string;
  readonly activeTab: WorkpieceTabV1;
  readonly workpieceOpen: boolean;
  readonly mobilePane: WorkspaceMobilePaneV1;
  readonly chatWidth: number;
  readonly conversation: ConversationViewStateV1;
}

export function createDefaultProgramWorkspaceSessionViewStateV1(): ProgramWorkspaceSessionViewStateV1 {
  return {
    draft: "",
    activeTab: "view",
    workpieceOpen: true,
    mobilePane: "chat",
    chatWidth: chatDefaultWidthV1,
    conversation: createDefaultConversationViewStateV1(),
  };
}

function clampV1(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function useNarrowViewportV1(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof matchMedia !== "undefined" && matchMedia("(max-width: 767px)").matches
  );

  useEffect(() => {
    const query = matchMedia("(max-width: 767px)");
    const update = (): void => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return narrow;
}

export interface ProgramWorkspacePropsV1 {
  readonly copy: SillyOsCopyV1;
  readonly activeProcess: CreatorActiveProcessProjectionV1;
  readonly initialViewState: ProgramWorkspaceSessionViewStateV1;
  readonly onViewStateChange: (viewState: ProgramWorkspaceSessionViewStateV1) => void;
  readonly onHome: () => void;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
  readonly theme: SillyOsThemeModeV1;
  readonly onThemeChange: (theme: SillyOsThemeModeV1) => void;
  readonly onOpenSettings?: () => void;
  readonly onAccept: () => void;
  readonly onReject: () => void;
  readonly onSend: ChatPanePropsV1["onSend"];
  readonly onLoadOlderTranscript: NonNullable<ChatPanePropsV1["onLoadOlderTranscript"]>;
  readonly onRetryInterruptedAgentRun?: () => boolean | void | Promise<boolean | void>;
  readonly providerModel?: ChatPanePropsV1["providerModel"];
  readonly creatorReadiness?: ChatPanePropsV1["creatorReadiness"];
  readonly onOpenCreatorSettings?: ChatPanePropsV1["onOpenCreatorSettings"];
  readonly homeDisabled?: boolean;
  readonly decisionPending?: boolean;
  readonly agentInteractionPending?: boolean;
  readonly networkAccess?: ChatPanePropsV1["networkAccess"];
  readonly piAgentRun?: ChatPanePropsV1["piAgentRun"];
  readonly executionWorkspace?: WorkpieceExecutionWorkspaceV1;
  readonly browserStorage?: WorkpieceBrowserStorageV1;
  readonly workspaceExport?: WorkpieceWorkspaceExportV1;
  readonly workspaceExportDisabled?: boolean;
  readonly onRetryExecutionWorkspace?: () => void;
  readonly onRequestStoragePersistence?: () => void;
  readonly onExportWorkspace?: () => void;
  readonly onCancelWorkspaceExport?: () => void;
}

function unavailableWorkspaceReviewV1(
  review: ProgramWorkspaceReviewProjectionV1,
): ProgramWorkspaceReviewProjectionV1 {
  return {
    ...review,
    mutableHead: null,
    acceptedStatus: review.latestAccepted === null ? null : "unavailable",
    pendingStatus: review.pendingReview === null ? null : "unavailable",
  };
}

/**
 * Reconciles the last exact Authority projection with the newer session-local
 * execution projection without promoting the latter into a review receipt.
 */
export function presentWorkspaceReviewV1(
  review: ProgramWorkspaceReviewProjectionV1 | null,
  executionWorkspace: WorkpieceExecutionWorkspaceV1 | undefined,
): ProgramWorkspaceReviewProjectionV1 | null {
  if (review === null || executionWorkspace === undefined) return review;
  if (executionWorkspace.phase !== "open" || executionWorkspace.descriptor === null) {
    return unavailableWorkspaceReviewV1(review);
  }
  if (
    review.mutableHead === null ||
    executionWorkspace.descriptor.generation === review.mutableHead.generation
  ) return review;

  const liveGeneration = executionWorkspace.descriptor.generation;
  return {
    ...review,
    mutableHead: null,
    acceptedStatus: review.latestAccepted === null
      ? null
      : liveGeneration > review.latestAccepted.generation
      ? "changed"
      : "unavailable",
    pendingStatus: review.pendingReview === null
      ? null
      : liveGeneration > review.pendingReview.generation
      ? "changed"
      : "unavailable",
  };
}

export function interruptedRetryAvailableV1(
  activeProcess: CreatorActiveProcessProjectionV1,
  review: ProgramWorkspaceReviewProjectionV1 | null,
): boolean {
  const process = activeProcess.process;
  const checkpoint = process.checkpoint;
  const terminal = process.lastTerminalAttempt;
  const eligible = process.status === "interrupted_retryable" && process.activeAttempt === null &&
    terminal?.outcome === "interrupted" && terminal.interruptionDisposition === "retryable" &&
    checkpoint !== null && activeProcess.subject !== null &&
    checkpoint.workspaceId === activeProcess.subject.head.workspaceId;
  if (!eligible) return false;
  const mutableHead = review?.mutableHead ?? null;
  return mutableHead === null ||
    (mutableHead.checkpointId === checkpoint.workspaceCheckpointId &&
      mutableHead.generation === checkpoint.workspaceGeneration);
}

export function ProgramWorkspaceV1({
  ...props
}: ProgramWorkspacePropsV1): ReactNode {
  const program = props.activeProcess.subject?.currentProgram ?? null;
  if (program === null) return null;
  const processIntent =
    props.activeProcess.transcript.entries.find((entry) => entry.role === "user")
      ?.parts.filter((part) => part.kind === "text_markdown")
      .map((part) => part.markdown)
      .join("\n\n")
      .trim() ?? "";

  return (
    <ProgramWorkspaceReadyV1
      {...props}
      processIntent={processIntent}
      program={program}
      proposal={props.activeProcess.subject?.head.proposal ?? null}
    />
  );
}

interface ProgramWorkspaceReadyPropsV1 extends ProgramWorkspacePropsV1 {
  readonly program: PreviewProgramV1;
  readonly proposal: ProgramProposalV1 | null;
  readonly processIntent: string;
}

function ProgramWorkspaceReadyV1({
  copy,
  activeProcess,
  initialViewState,
  onViewStateChange,
  program,
  proposal,
  processIntent,
  onHome,
  onLocaleChange,
  theme,
  onThemeChange,
  onOpenSettings,
  onAccept,
  onReject,
  onSend,
  onLoadOlderTranscript,
  onRetryInterruptedAgentRun,
  providerModel,
  creatorReadiness,
  onOpenCreatorSettings,
  homeDisabled = false,
  decisionPending = false,
  agentInteractionPending = false,
  networkAccess,
  piAgentRun,
  executionWorkspace,
  browserStorage,
  workspaceExport,
  workspaceExportDisabled = false,
  onRetryExecutionWorkspace,
  onRequestStoragePersistence,
  onExportWorkspace,
  onCancelWorkspaceExport,
}: ProgramWorkspaceReadyPropsV1): ReactNode {
  const narrow = useNarrowViewportV1();
  const splitRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLElement>(null);
  const focusBeforeFullscreenRef = useRef<HTMLElement | null>(null);
  const viewStateRef = useRef(initialViewState);
  const [chatWidth, setChatWidth] = useState(initialViewState.chatWidth);
  const [chatMaximumWidth, setChatMaximumWidth] = useState(chatDefaultWidthV1);
  const [workpieceOpen, setWorkpieceOpen] = useState(initialViewState.workpieceOpen);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkpieceTabV1>(initialViewState.activeTab);
  const [mobilePane, setMobilePane] = useState<WorkspaceMobilePaneV1>(
    initialViewState.mobilePane,
  );
  const presentedWorkspaceReview = presentWorkspaceReviewV1(
    activeProcess.workspaceReview,
    executionWorkspace,
  );

  useEffect(() => {
    const current = viewStateRef.current;
    if (
      current.chatWidth === chatWidth && current.workpieceOpen === workpieceOpen &&
      current.activeTab === activeTab && current.mobilePane === mobilePane
    ) return;
    const next = { ...current, chatWidth, workpieceOpen, activeTab, mobilePane };
    viewStateRef.current = next;
    onViewStateChange(next);
  }, [activeTab, chatWidth, mobilePane, onViewStateChange, workpieceOpen]);

  useEffect(() => {
    const split = splitRef.current;
    if (split === null) return undefined;
    const update = (): void => {
      const maximum = Math.max(chatMinimumWidthV1, split.clientWidth - workpieceMinimumWidthV1);
      setChatMaximumWidth(maximum);
      setChatWidth((current) => clampV1(current, chatMinimumWidthV1, maximum));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(split);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!fullscreen) return undefined;
    outputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setFullscreen(false);
      requestAnimationFrame(() => focusBeforeFullscreenRef.current?.focus());
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [fullscreen]);

  const toggleFullscreenV1 = (): void => {
    if (!fullscreen) {
      focusBeforeFullscreenRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setFullscreen(true);
      return;
    }
    setFullscreen(false);
    requestAnimationFrame(() => focusBeforeFullscreenRef.current?.focus());
  };

  const resizeFromClientX = (clientX: number): void => {
    const split = splitRef.current;
    if (split === null) return;
    const rect = split.getBoundingClientRect();
    setChatWidth(clampV1(clientX - rect.left, chatMinimumWidthV1, chatMaximumWidth));
  };

  const handleSeparatorPointerDownV1 = (event: ReactPointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeFromClientX(event.clientX);
  };

  const handleSeparatorKeyDownV1 = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const delta = event.shiftKey ? 32 : 8;
    let next: number | null = null;
    if (event.key === "ArrowLeft") next = chatWidth - delta;
    if (event.key === "ArrowRight") next = chatWidth + delta;
    if (event.key === "Home") next = chatMinimumWidthV1;
    if (event.key === "End") next = chatMaximumWidth;
    if (next === null) return;
    event.preventDefault();
    setChatWidth(clampV1(next, chatMinimumWidthV1, chatMaximumWidth));
  };

  const workspaceStyle = {
    "--chat-pane-width": `${String(chatWidth)}px`,
  } as CSSProperties;

  return (
    <main
      className="program-workspace"
      data-silly-os-view="workspace"
      data-workspace-layout={narrow ? "single-pane" : "dual-pane"}
      data-process-id={activeProcess.process.processId}
      data-process-status={activeProcess.process.status}
      data-process-intent={processIntent}
      data-transcript-phase={activeProcess.transcript.phase}
      data-program-id={program.programId}
      data-program-revision={program.revision}
      data-workspace-review-revision={presentedWorkspaceReview?.revision}
      data-workspace-review-accepted-snapshot-id={presentedWorkspaceReview?.latestAccepted
        ?.snapshotId}
      data-workspace-review-accepted-program-revision={presentedWorkspaceReview?.latestAccepted
        ?.programRevision}
      data-workspace-review-accepted-checkpoint-id={presentedWorkspaceReview?.latestAccepted
        ?.checkpointId}
      data-workspace-review-accepted-generation={presentedWorkspaceReview?.latestAccepted
        ?.generation}
      data-workspace-review-accepted-file-count={presentedWorkspaceReview?.latestAccepted
        ?.fileCount}
      data-workspace-review-accepted-archive-bytes={presentedWorkspaceReview?.latestAccepted
        ?.archiveBytes}
      data-workspace-review-accepted-status={presentedWorkspaceReview?.acceptedStatus ?? undefined}
      data-workspace-review-pending-proposal-id={presentedWorkspaceReview?.pendingReview
        ?.proposalId}
      data-workspace-review-pending-program-revision={presentedWorkspaceReview?.pendingReview
        ?.programRevision}
      data-workspace-review-pending-checkpoint-id={presentedWorkspaceReview?.pendingReview
        ?.checkpointId}
      data-workspace-review-pending-generation={presentedWorkspaceReview?.pendingReview
        ?.generation}
      data-workspace-review-pending-status={presentedWorkspaceReview?.pendingStatus ?? undefined}
      data-workspace-review-mutable-checkpoint-id={presentedWorkspaceReview?.mutableHead
        ?.checkpointId}
      data-workspace-review-mutable-generation={presentedWorkspaceReview?.mutableHead?.generation}
      data-execution-workspace-state={executionWorkspace?.phase}
      data-execution-workspace-diagnostic={executionWorkspace?.diagnostic?.code}
      data-execution-workspace-session={executionWorkspace?.descriptor?.workspaceSessionId}
      data-execution-workspace-generation={executionWorkspace?.descriptor?.generation}
      data-execution-workspace-receipt={executionWorkspace?.lastReceipt?.sequence}
      data-execution-workspace-tool={executionWorkspace?.lastReceipt?.tool}
      data-execution-workspace-effect={executionWorkspace?.lastReceipt?.effect}
      data-execution-workspace-path={executionWorkspace?.lastReceipt?.changedPaths[0]}
      data-workspace-export-state={workspaceExport?.phase}
      aria-label={copy.workspaceAria}
      style={workspaceStyle}
    >
      <ProgramWorkspaceTopbarV1
        copy={copy}
        workspaceTitle={program.name}
        homeDisabled={homeDisabled}
        onHome={onHome}
        onLocaleChange={onLocaleChange}
        theme={theme}
        onThemeChange={onThemeChange}
        {...(onOpenSettings === undefined ? {} : { onOpenSettings })}
      />

      <div className="program-workspace__body" ref={splitRef}>
        <div
          className="program-workspace__chat-shell"
          hidden={narrow && mobilePane !== "chat"}
        >
          <div className="program-workspace__pane-heading">
            <div>
              <MessageCircle size={15} aria-hidden="true" />
              <span>{copy.creatorName}</span>
            </div>
            <span>{activeProcess.process.transcriptFrontier}</span>
          </div>
          <ChatPaneV1
            copy={copy}
            transcript={activeProcess.transcript}
            onLoadOlderTranscript={onLoadOlderTranscript}
            {...(!interruptedRetryAvailableV1(activeProcess, activeProcess.workspaceReview) ||
                onRetryInterruptedAgentRun === undefined
              ? {}
              : {
                interruptedRetry: {
                  pending: agentInteractionPending,
                  onRetry: onRetryInterruptedAgentRun,
                },
              })}
            proposal={proposal}
            program={program}
            workspaceReview={presentedWorkspaceReview}
            workpieceOpen={workpieceOpen}
            onAccept={onAccept}
            onReject={onReject}
            onOpenWorkpiece={() => {
              setWorkpieceOpen(true);
              if (narrow) setMobilePane("preview");
            }}
            onSend={onSend}
            initialDraft={initialViewState.draft}
            initialConversationViewState={initialViewState.conversation}
            onDraftChange={(draft) => {
              const current = viewStateRef.current;
              if (current.draft === draft) return;
              const next = { ...current, draft };
              viewStateRef.current = next;
              onViewStateChange(next);
            }}
            onConversationViewStateChange={(conversation) => {
              const current = viewStateRef.current;
              if (current.conversation === conversation) return;
              const next = { ...current, conversation };
              viewStateRef.current = next;
              onViewStateChange(next);
            }}
            decisionPending={decisionPending}
            agentInteractionPending={agentInteractionPending}
            {...(providerModel === undefined ? {} : { providerModel })}
            {...(creatorReadiness === undefined ? {} : { creatorReadiness })}
            {...(onOpenCreatorSettings === undefined ? {} : { onOpenCreatorSettings })}
            {...(networkAccess === undefined ? {} : { networkAccess })}
            {...(piAgentRun === undefined ? {} : { piAgentRun })}
          />
        </div>

        {workpieceOpen && !narrow && (
          <div
            className="program-workspace__separator"
            role="separator"
            aria-label={copy.resizeAria}
            aria-orientation="vertical"
            aria-valuemin={chatMinimumWidthV1}
            aria-valuemax={Math.round(chatMaximumWidth)}
            aria-valuenow={Math.round(chatWidth)}
            tabIndex={0}
            onPointerDown={handleSeparatorPointerDownV1}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                resizeFromClientX(event.clientX);
              }
            }}
            onKeyDown={handleSeparatorKeyDownV1}
          />
        )}

        {workpieceOpen
          ? (
            <div
              className="program-workspace__output-shell"
              hidden={narrow && mobilePane === "chat"}
            >
              <WorkpiecePaneV1
                copy={copy}
                program={program}
                proposal={proposal}
                activeTab={activeTab}
                fullscreen={fullscreen}
                {...(piAgentRun === undefined ? {} : { agentMode: piAgentRun.runtime })}
                {...(executionWorkspace === undefined ? {} : { executionWorkspace })}
                {...(browserStorage === undefined ? {} : { browserStorage })}
                {...(workspaceExport === undefined ? {} : { workspaceExport })}
                workspaceExportDisabled={workspaceExportDisabled}
                {...(onRetryExecutionWorkspace === undefined ? {} : { onRetryExecutionWorkspace })}
                {...(onRequestStoragePersistence === undefined
                  ? {}
                  : { onRequestStoragePersistence })}
                {...(onExportWorkspace === undefined ? {} : { onExportWorkspace })}
                {...(onCancelWorkspaceExport === undefined ? {} : { onCancelWorkspaceExport })}
                outputRef={outputRef}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  if (narrow) setMobilePane("preview");
                }}
                onToggleFullscreen={toggleFullscreenV1}
                onClose={() => {
                  if (fullscreen) setFullscreen(false);
                  setWorkpieceOpen(false);
                  if (narrow) setMobilePane("chat");
                }}
              />
            </div>
          )
          : (
            <section className="program-workspace__closed-output" aria-label={copy.closePreview}>
              <LayoutGrid size={24} aria-hidden="true" />
              <strong>{program.name}</strong>
              <p>{program.purpose}</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setWorkpieceOpen(true);
                  if (narrow) setMobilePane("preview");
                }}
              >
                {copy.openPreview}
              </Button>
            </section>
          )}
      </div>

      <ProgramWorkspaceMobileNavV1
        copy={copy}
        activePane={mobilePane}
        onChat={() => setMobilePane("chat")}
        onPreview={() => {
          setWorkpieceOpen(true);
          setMobilePane("preview");
        }}
      />
    </main>
  );
}
