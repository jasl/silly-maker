// SPDX-License-Identifier: MIT
import { ChevronDown, ChevronUp, LoaderCircle, MessageCircle, PanelsTopLeft } from "lucide-react";
import { Component, type ReactNode, useEffect, useId, useState } from "react";

import { ButtonV1 as Button, IconButtonV1 } from "../../ui/design-system/button.tsx";
import { ProgressV1 as Progress } from "../../ui/design-system/progress.tsx";
import { TabsV1 as Tabs } from "../../ui/design-system/tabs.tsx";
import "./program-ui-container.css";

export type ProgramUiModeV1 = "guided" | "conversation";

export interface ProgramRunLineV1 {
  readonly lineId: string;
  readonly kind: "agent" | "tool" | "system";
  readonly text: string;
}

export type ProgramRunProgressV1 =
  | {
    readonly kind: "determinate";
    readonly completed: number;
    readonly total: number;
    readonly label: string;
  }
  | {
    readonly kind: "indeterminate";
    readonly label: string;
  };

/**
 * Read-only projection of the active Agent Run and durable product records.
 * This is not another activity log or persistence authority.
 */
export interface ProgramRunProjectionV1 {
  readonly status: "idle" | "running" | "completed" | "failed" | "cancelled";
  readonly label: string;
  readonly recentLines: readonly ProgramRunLineV1[];
  readonly progress?: ProgramRunProgressV1;
  readonly startedAt?: number;
  readonly onCancel?: () => void;
}

function elapsedTextV1(startedAt: number | undefined, now: number): string | null {
  if (startedAt === undefined) return null;
  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1_000));
  const hours = Math.floor(elapsedSeconds / 3_600);
  const minutes = Math.floor((elapsedSeconds % 3_600) / 60);
  const seconds = elapsedSeconds % 60;
  return hours > 0
    ? `${String(hours)}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ProgramRunStripV1({
  run,
  locale,
}: {
  readonly run: ProgramRunProjectionV1;
  readonly locale: "en" | "zh-CN";
}): ReactNode {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const detailsId = useId();

  useEffect(() => {
    if (run.status !== "running" || run.startedAt === undefined) return undefined;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [run.startedAt, run.status]);

  const elapsed = elapsedTextV1(run.startedAt, now);
  // The strip intentionally shows at most three recent lines; full history
  // remains available in the pageable Conversation rather than hidden here.
  const visibleLines = expanded ? run.recentLines.slice(-3) : run.recentLines.slice(-1);
  const hasDetails = run.recentLines.length > 1 || run.progress !== undefined;

  return (
    <aside
      className="program-run-strip"
      data-program-run-strip=""
      data-program-run-status={run.status}
      aria-label={locale === "zh-CN" ? "Program 运行状态" : "Program run status"}
    >
      <div className="program-run-strip__summary">
        <span className="program-run-strip__state" aria-hidden="true">
          {run.status === "running"
            ? <LoaderCircle className="is-spinning" size={14} />
            : <span className="program-run-strip__state-dot" />}
        </span>
        <span className="program-run-strip__label">
          {run.label}
          {run.progress === undefined
            ? null
            : <span className="program-run-strip__progress-label">· {run.progress.label}</span>}
        </span>
        {elapsed === null ? null : <time>{elapsed}</time>}
        <div className="program-run-strip__actions">
          {run.status === "running" && run.onCancel !== undefined && (
            <Button type="button" size="sm" variant="ghost" onClick={run.onCancel}>
              {locale === "zh-CN" ? "取消" : "Cancel"}
            </Button>
          )}
          {hasDetails && (
            <IconButtonV1
              type="button"
              variant="ghost"
              size="sm"
              icon={expanded ? ChevronDown : ChevronUp}
              accessibleName={expanded
                ? locale === "zh-CN" ? "收起活动" : "Collapse activity"
                : locale === "zh-CN"
                ? "展开活动"
                : "Expand activity"}
              aria-controls={detailsId}
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
            />
          )}
        </div>
      </div>
      <div
        className="program-run-strip__details"
        id={detailsId}
        data-expanded={expanded ? "true" : "false"}
      >
        <ol aria-live="polite" aria-relevant="additions text">
          {visibleLines.map((line) => (
            <li key={line.lineId} data-run-line-kind={line.kind}>
              <span className="program-run-strip__line-dot" aria-hidden="true" />
              <span className="program-run-strip__line-text">{line.text}</span>
            </li>
          ))}
        </ol>
        {!expanded || run.progress === undefined
          ? null
          : (
            <div className="program-run-strip__progress">
              {run.progress.kind === "determinate"
                ? (
                  <Progress
                    accessibleName={run.progress.label}
                    max={Math.max(1, run.progress.total)}
                    value={Math.min(
                      Math.max(0, run.progress.completed),
                      Math.max(1, run.progress.total),
                    )}
                  />
                )
                : (
                  <span className="program-run-strip__indeterminate" role="status">
                    <LoaderCircle className="is-spinning" size={13} aria-hidden="true" />
                  </span>
                )}
              <span>{run.progress.label}</span>
            </div>
          )}
      </div>
    </aside>
  );
}

interface ProgramUiContainerBasePropsV1 {
  readonly run: ProgramRunProjectionV1 | null;
  readonly toolbarActions?: ReactNode;
  readonly overlaySurface?: ReactNode;
  readonly locale: "en" | "zh-CN";
}

export interface ProgramUiContainerModesPropsV1 extends ProgramUiContainerBasePropsV1 {
  readonly presentation?: "modes";
  readonly processId: string;
  readonly mode: ProgramUiModeV1;
  readonly onModeChange: (mode: ProgramUiModeV1) => void;
  readonly guidedSurface: ReactNode;
  readonly conversationSurface: ReactNode;
  readonly guidedLabel?: string;
  readonly conversationLabel?: string;
  readonly onGuidedSurfaceFailure?: (failure: ProgramGuidedSurfaceFailureV1) => void;
}

export interface ProgramGuidedSurfaceFailureV1 {
  readonly processId: string;
  readonly error: unknown;
}

export interface ProgramUiContainerIntegratedPropsV1 extends ProgramUiContainerBasePropsV1 {
  readonly presentation: "integrated";
  readonly processId: string | null;
  readonly surface: ReactNode;
}

export type ProgramUiContainerPropsV1 =
  | ProgramUiContainerModesPropsV1
  | ProgramUiContainerIntegratedPropsV1;

/**
 * SillyOS-owned boundary for Program presentation. These ReactNode surfaces are
 * Host-owned renderer output, not a Program extension contract. A future
 * OpenUI artifact must first be admitted as data and rendered by SillyOS's
 * closed renderer into a Program-owned slot; it never receives a raw
 * React/portal escape hatch or ownership of the geometry, activity strip, and
 * overlay. A Program may expose distinct guided/conversation slots or one
 * already-integrated surface without bypassing this boundary.
 *
 * Guided ("Simple" in the product) and Conversation are two projections of
 * the same Process. Mode selection is presentation-only: both surfaces project
 * the same Host-owned Process state, and equivalent actions reuse the owning
 * operation rather than introducing a mode-specific state transition.
 * Switching never creates, copies, advances, or retires a Process. Guided may
 * expose stronger structured and mechanical affordances through admitted
 * OpenUI; Conversation remains the pageable natural-language projection of
 * that same work, with the user free to switch whenever structure is useful.
 */
interface ProgramGuidedSurfaceBoundaryPropsV1 {
  readonly children: ReactNode;
  readonly onFailure: (error: unknown) => void;
}

class ProgramGuidedSurfaceBoundaryV1 extends Component<
  ProgramGuidedSurfaceBoundaryPropsV1,
  Readonly<{ failed: boolean }>
> {
  state = { failed: false };
  #reported = false;

  static getDerivedStateFromError(): Readonly<{ failed: boolean }> {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    if (this.#reported) return;
    this.#reported = true;
    this.props.onFailure(error);
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

function ProgramUiContainerPresentationV1(props: ProgramUiContainerPropsV1): ReactNode {
  const guidedPanelId = useId();
  const guidedTabId = useId();
  const conversationPanelId = useId();
  const conversationTabId = useId();
  const integrated = props.presentation === "integrated";
  const [guidedSurfaceFailed, setGuidedSurfaceFailed] = useState(false);
  const [guidedSurfaceAttempt, setGuidedSurfaceAttempt] = useState(0);
  const effectiveMode = props.presentation === "integrated"
    ? "integrated"
    : guidedSurfaceFailed
    ? "conversation"
    : props.mode;
  const activeConversationProcessId = effectiveMode === "conversation" ? props.processId : null;
  // A Process Conversation mounts on first activation and then stays mounted
  // while hidden so drafts and scroll position survive mode switches.
  const [activatedConversationProcessId, setActivatedConversationProcessId] = useState<
    string | null
  >(() => activeConversationProcessId);
  const toolbarVisible = !integrated || props.toolbarActions !== undefined;
  const guidedLabel = props.locale === "zh-CN" ? "简单" : "Guided";
  const conversationLabel = props.locale === "zh-CN" ? "对话" : "Conversation";
  return (
    <section
      className={`program-ui-container${toolbarVisible ? "" : " is-toolbarless"}`}
      data-program-ui-container=""
      data-program-ui-process-id={props.processId ?? undefined}
      data-program-ui-mode={effectiveMode}
      data-program-ui-presentation={integrated ? "integrated" : "modes"}
      data-program-ui-guided-status={integrated
        ? undefined
        : guidedSurfaceFailed
        ? "failed"
        : "ready"}
    >
      {toolbarVisible && (
        <header className="program-ui-container__toolbar">
          {integrated ? null : (
            <Tabs
              value={effectiveMode}
              tabs={[
                {
                  value: "guided",
                  id: guidedTabId,
                  controls: guidedPanelId,
                  label: (
                    <span className="program-ui-container__mode-label">
                      <PanelsTopLeft size={14} aria-hidden="true" />
                      {props.guidedLabel ?? guidedLabel}
                    </span>
                  ),
                },
                {
                  value: "conversation",
                  id: conversationTabId,
                  controls: conversationPanelId,
                  label: (
                    <span className="program-ui-container__mode-label">
                      <MessageCircle size={14} aria-hidden="true" />
                      {props.conversationLabel ?? conversationLabel}
                    </span>
                  ),
                },
              ]}
              onValueChange={(value) => {
                if (value === "guided" || value === "conversation") {
                  if (value === "conversation" && props.processId !== null) {
                    setActivatedConversationProcessId(props.processId);
                  }
                  if (value === "guided" && guidedSurfaceFailed) {
                    setGuidedSurfaceFailed(false);
                    setGuidedSurfaceAttempt((current) => current + 1);
                  }
                  props.onModeChange(value);
                }
              }}
              labels={{
                tabList: props.locale === "zh-CN" ? "Program 视图" : "Program views",
              }}
            />
          )}
          {props.toolbarActions === undefined
            ? null
            : (
              <div className="program-ui-container__toolbar-actions">
                {props.toolbarActions}
              </div>
            )}
        </header>
      )}
      <div className="program-ui-container__surface-stack">
        {integrated ? <div className="program-ui-container__surface">{props.surface}</div> : (
          <>
            <div
              className="program-ui-container__surface"
              id={guidedPanelId}
              role="tabpanel"
              aria-labelledby={guidedTabId}
              hidden={effectiveMode !== "guided"}
            >
              <ProgramGuidedSurfaceBoundaryV1
                key={guidedSurfaceAttempt}
                onFailure={(error) => {
                  setGuidedSurfaceFailed(true);
                  setActivatedConversationProcessId(props.processId);
                  props.onGuidedSurfaceFailure?.({ processId: props.processId, error });
                  if (props.mode !== "conversation") props.onModeChange("conversation");
                }}
              >
                {props.guidedSurface}
              </ProgramGuidedSurfaceBoundaryV1>
            </div>
            <div
              className="program-ui-container__surface"
              id={conversationPanelId}
              role="tabpanel"
              aria-labelledby={conversationTabId}
              hidden={effectiveMode !== "conversation"}
            >
              {effectiveMode === "conversation" ||
                  activatedConversationProcessId === props.processId
                ? props.conversationSurface
                : null}
            </div>
          </>
        )}
      </div>
      <div
        className="program-ui-container__overlay-host"
        data-program-ui-overlay-host=""
      >
        {props.overlaySurface}
      </div>
      {props.run === null ? null : <ProgramRunStripV1 run={props.run} locale={props.locale} />}
    </section>
  );
}

export function ProgramUiContainerV1(props: ProgramUiContainerPropsV1): ReactNode {
  return <ProgramUiContainerPresentationV1 key={props.processId} {...props} />;
}
