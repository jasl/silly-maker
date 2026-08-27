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
import type {
  CreatorSessionSnapshotV1,
  CreatorWorkspaceV1,
  PreviewProgramV1,
} from "../product/contracts.ts";
import { ChatPaneV1, type ChatPanePropsV1 } from "./chat-pane.tsx";
import { SillyButtonV1 as Button } from "./controls.tsx";
import {
  type WorkpieceExecutionWorkspaceV1,
  type WorkpieceTabV1,
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
  readonly snapshot: CreatorSessionSnapshotV1;
  readonly onHome: () => void;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
  readonly onAccept: () => void;
  readonly onReject: () => void;
  readonly onSend: ChatPanePropsV1["onSend"];
  readonly homeDisabled?: boolean;
  readonly mutationPending?: boolean;
  readonly piAgentRun?: ChatPanePropsV1["piAgentRun"];
  readonly executionWorkspace?: WorkpieceExecutionWorkspaceV1;
}

export function ProgramWorkspaceV1({
  ...props
}: ProgramWorkspacePropsV1): ReactNode {
  const workspace = props.snapshot.workspace;
  const program = props.snapshot.program;
  if (workspace === null || program === null) return null;

  return <ProgramWorkspaceReadyV1 {...props} workspace={workspace} program={program} />;
}

interface ProgramWorkspaceReadyPropsV1 extends ProgramWorkspacePropsV1 {
  readonly workspace: CreatorWorkspaceV1;
  readonly program: PreviewProgramV1;
}

function ProgramWorkspaceReadyV1({
  copy,
  snapshot,
  workspace,
  program,
  onHome,
  onLocaleChange,
  onAccept,
  onReject,
  onSend,
  homeDisabled = false,
  mutationPending = false,
  piAgentRun,
  executionWorkspace,
}: ProgramWorkspaceReadyPropsV1): ReactNode {
  const narrow = useNarrowViewportV1();
  const splitRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLElement>(null);
  const focusBeforeFullscreenRef = useRef<HTMLElement | null>(null);
  const [chatWidth, setChatWidth] = useState(chatDefaultWidthV1);
  const [chatMaximumWidth, setChatMaximumWidth] = useState(chatDefaultWidthV1);
  const [workpieceOpen, setWorkpieceOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkpieceTabV1>("view");
  const [mobilePane, setMobilePane] = useState<WorkspaceMobilePaneV1>("chat");

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
      data-program-id={program.programId}
      data-program-revision={program.revision}
      data-execution-workspace-state={executionWorkspace?.phase}
      data-execution-workspace-session={executionWorkspace?.descriptor?.workspaceSessionId}
      data-execution-workspace-generation={executionWorkspace?.descriptor?.generation}
      data-execution-workspace-receipt={executionWorkspace?.lastReceipt?.sequence}
      data-execution-workspace-effect={executionWorkspace?.lastReceipt?.effect}
      data-execution-workspace-path={executionWorkspace?.lastReceipt?.changedPaths[0]}
      aria-label={copy.workspaceAria}
      style={workspaceStyle}
    >
      <ProgramWorkspaceTopbarV1
        copy={copy}
        workspaceTitle={workspace.title}
        homeDisabled={homeDisabled}
        onHome={onHome}
        onLocaleChange={onLocaleChange}
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
            <span>{snapshot.messages.length}</span>
          </div>
          <ChatPaneV1
            copy={copy}
            messages={snapshot.messages}
            proposal={snapshot.proposal}
            program={program}
            workpieceOpen={workpieceOpen}
            onAccept={onAccept}
            onReject={onReject}
            onOpenWorkpiece={() => {
              setWorkpieceOpen(true);
              if (narrow) setMobilePane("preview");
            }}
            onSend={onSend}
            mutationPending={mutationPending}
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
                proposal={snapshot.proposal}
                activity={snapshot.activity}
                activeTab={activeTab}
                fullscreen={fullscreen}
                {...(piAgentRun === undefined ? {} : { agentMode: piAgentRun.runtime })}
                {...(executionWorkspace === undefined ? {} : { executionWorkspace })}
                outputRef={outputRef}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  if (narrow) setMobilePane(tab === "activity" ? "activity" : "preview");
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
          setActiveTab(activeTab === "activity" ? "view" : activeTab);
          setMobilePane("preview");
        }}
        onActivity={() => {
          setWorkpieceOpen(true);
          setActiveTab("activity");
          setMobilePane("activity");
        }}
      />
    </main>
  );
}
