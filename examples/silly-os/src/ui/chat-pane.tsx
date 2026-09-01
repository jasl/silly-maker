// SPDX-License-Identifier: MIT
import {
  ArrowUp,
  FileText,
  Globe2,
  KeyRound,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  StopCircle,
} from "lucide-react";
import { type FormEvent, type ReactNode, useLayoutEffect, useRef, useState } from "react";

import type { BrowserPiWorkerRuntimeV1 } from "../agent/browser-pi-worker-protocol.ts";
import type { SillyOsCopyV1 } from "../content/copy.ts";
import type {
  TranscriptEntryV1,
  TranscriptPartV1,
} from "../program-platform/process/program-process-repository.ts";
import { isComposerCompositionKeyV1 } from "./composer-keyboard.ts";
import { type ComposerModelControlV1, ComposerModelPickerV1 } from "./composer-model-picker.tsx";
import { ButtonV1 as Button, IconButtonV1 } from "./design-system/button.tsx";
import { CheckboxV1 } from "./design-system/checkbox.tsx";
import { TextareaV1 } from "./design-system/textarea.tsx";

export interface ChatPanePropsV1 {
  readonly copy: SillyOsCopyV1;
  readonly agentName: string;
  readonly transcript: ConversationTranscriptWindowProjectionV1;
  /** Removes every mutation affordance while retaining the rich pageable feed. */
  readonly readOnly?: boolean;
  readonly onLoadOlderTranscript?: () => boolean | void | Promise<boolean | void>;
  readonly onReloadLatestTranscript?: () => boolean | void | Promise<boolean | void>;
  readonly interruptedRetry?: {
    readonly pending: boolean;
    readonly onRetry: () => boolean | void | Promise<boolean | void>;
  };
  readonly feedSupplement?: ReactNode;
  readonly onSend: (text: string) => boolean | void | Promise<boolean | void>;
  readonly initialDraft?: string;
  readonly onDraftChange?: (draft: string) => void;
  readonly initialConversationViewState?: ConversationViewStateV1;
  readonly onConversationViewStateChange?: (viewState: ConversationViewStateV1) => void;
  readonly providerModel?: ComposerModelControlV1;
  readonly statusNotice?: ReactNode;
  readonly interactionReady?: boolean;
  readonly agentInteractionPending?: boolean;
  readonly networkAccess?: {
    readonly enabled: boolean;
    readonly pending: boolean;
    readonly onChange: (enabled: boolean) => boolean | void | Promise<boolean | void>;
  };
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
    readonly presentation?: {
      readonly title: string;
      readonly ready: string;
      readonly unavailable: string;
      readonly draft: string;
      readonly cancel: string;
      readonly forgetCredential: string;
    };
    readonly onCancel: () => void;
    readonly onForget: () => void;
  };
}

/**
 * Package-neutral view contract shared by executable Program workspaces and
 * the degraded read-only Conversation route.
 */
export interface ConversationTranscriptWindowProjectionV1 {
  readonly entries: readonly TranscriptEntryV1[];
  readonly byteLength: number;
  readonly nextBeforeSequence: number | null;
  readonly newerOmitted: boolean;
  readonly phase: "loading" | "loading_older" | "ready" | "failed";
}

export type ConversationScrollAnchorV1 =
  | { readonly kind: "bottom" }
  | {
    readonly kind: "entry";
    readonly entryId: string;
    readonly sequence: number;
    readonly offset: number;
  };

export interface ConversationViewStateV1 {
  readonly scrollAnchor: ConversationScrollAnchorV1;
  readonly composerSelectionStart: number;
  readonly composerSelectionEnd: number;
}

export function createDefaultConversationViewStateV1(): ConversationViewStateV1 {
  return {
    scrollAnchor: { kind: "bottom" },
    composerSelectionStart: 0,
    composerSelectionEnd: 0,
  };
}

function transcriptEntryElementsV1(feed: HTMLElement): readonly HTMLElement[] {
  return Array.from(feed.querySelectorAll<HTMLElement>("[data-transcript-entry-id]"));
}

function applyConversationScrollAnchorV1(
  feed: HTMLElement,
  anchor: ConversationScrollAnchorV1,
  feedEnd: HTMLElement | null,
): boolean {
  if (anchor.kind === "bottom") {
    feedEnd?.scrollIntoView({ block: "end" });
    return true;
  }
  const element = transcriptEntryElementsV1(feed).find((candidate) =>
    candidate.dataset.transcriptEntryId === anchor.entryId
  );
  if (element === undefined) return false;
  const nextOffset = element.getBoundingClientRect().top - feed.getBoundingClientRect().top;
  feed.scrollTop += nextOffset - anchor.offset;
  return true;
}

function captureConversationScrollAnchorV1(feed: HTMLElement): ConversationScrollAnchorV1 {
  if (feed.scrollTop + feed.clientHeight >= feed.scrollHeight) return { kind: "bottom" };
  const feedTop = feed.getBoundingClientRect().top;
  const elements = transcriptEntryElementsV1(feed);
  const element =
    elements.find((candidate) => candidate.getBoundingClientRect().bottom > feedTop) ??
      elements.at(-1);
  const entryId = element?.dataset.transcriptEntryId;
  const sequence = Number(element?.dataset.transcriptSequence);
  if (
    element === undefined || entryId === undefined || entryId.length === 0 ||
    !Number.isSafeInteger(sequence) || sequence < 1
  ) {
    return { kind: "bottom" };
  }
  return {
    kind: "entry",
    entryId,
    sequence,
    offset: element.getBoundingClientRect().top - feedTop,
  };
}

function transcriptRoleLabelV1(
  copy: SillyOsCopyV1,
  role: TranscriptEntryV1["role"],
  agentName: string,
): string {
  if (role === "assistant") return agentName;
  if (role === "system") return copy.transcriptSystem;
  if (role === "tool") return copy.transcriptTool;
  return copy.locale === "zh-CN" ? "你" : "You";
}

function transcriptAvatarV1(copy: SillyOsCopyV1, role: TranscriptEntryV1["role"]): ReactNode {
  if (role === "assistant") return <Sparkles size={14} fill="currentColor" />;
  if (role === "system") return copy.locale === "zh-CN" ? "系" : "S";
  if (role === "tool") return copy.locale === "zh-CN" ? "工" : "T";
  return copy.locale === "zh-CN" ? "你" : "Y";
}

function TranscriptMarkdownV1({ markdown }: { readonly markdown: string }): ReactNode {
  const blocks = markdown.split(/\n{2,}/u);
  return (
    <div className="transcript-markdown">
      {blocks.map((block, index) => (
        <p className="transcript-markdown__block" key={`${String(index)}:${block}`}>
          {block}
        </p>
      ))}
    </div>
  );
}

function TranscriptPartV1View({
  copy,
  part,
}: {
  readonly copy: SillyOsCopyV1;
  readonly part: TranscriptPartV1;
}): ReactNode {
  if (part.kind === "text_markdown") {
    return <TranscriptMarkdownV1 markdown={part.markdown} />;
  }
  if (part.kind === "reasoning_summary") {
    return (
      <details className="transcript-part transcript-part--reasoning">
        <summary>{copy.transcriptReasoning}</summary>
        <TranscriptMarkdownV1 markdown={part.summaryMarkdown} />
      </details>
    );
  }
  if (part.kind === "tool_call") {
    return (
      <details className="transcript-part transcript-part--tool-call">
        <summary>
          <span>{copy.transcriptToolCall}</span>
          <code className="transcript-part__tool-name">{part.toolName}</code>
        </summary>
        <pre>{part.argumentsJson}</pre>
      </details>
    );
  }
  if (part.kind === "tool_status") {
    return (
      <div className="transcript-part transcript-part--tool-status" data-tool-status={part.status}>
        <span>{part.status}</span>
        {part.message === null ? null : <p>{part.message}</p>}
      </div>
    );
  }
  if (part.kind === "tool_result") {
    return (
      <details className="transcript-part transcript-part--tool-result">
        <summary>
          <span>{copy.transcriptToolResult}</span>
          <span data-tool-outcome={part.outcome}>{part.outcome}</span>
        </summary>
        {part.summaryMarkdown === null
          ? null
          : <TranscriptMarkdownV1 markdown={part.summaryMarkdown} />}
        <pre>{part.resultJson}</pre>
      </details>
    );
  }
  return (
    <div className="transcript-part transcript-part--artifact">
      <FileText size={15} aria-hidden="true" />
      <span>
        <small>{copy.transcriptArtifact}</small>
        <strong>{part.label}</strong>
        <code>{part.mediaType}</code>
      </span>
    </div>
  );
}

export function ChatPaneV1({
  copy,
  agentName,
  transcript,
  onLoadOlderTranscript,
  onReloadLatestTranscript,
  interruptedRetry,
  feedSupplement,
  onSend,
  initialDraft = "",
  onDraftChange,
  initialConversationViewState = createDefaultConversationViewStateV1(),
  onConversationViewStateChange,
  providerModel,
  statusNotice,
  interactionReady = true,
  agentInteractionPending = false,
  networkAccess,
  piAgentRun,
  readOnly = false,
}: ChatPanePropsV1): ReactNode {
  const [draft, setDraft] = useState(initialDraft);
  const [latestReloadPending, setLatestReloadPending] = useState(false);
  const draftRef = useRef(initialDraft);
  const feedRef = useRef<HTMLDivElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const previousLastSequenceRef = useRef<number | null>(null);
  const prependAnchorRef = useRef<ConversationScrollAnchorV1 | null>(null);
  const initialScrollAnchorRef = useRef(initialConversationViewState.scrollAnchor);
  const initialScrollRestoredRef = useRef(false);
  const conversationViewStateRef = useRef(initialConversationViewState);
  const onConversationViewStateChangeRef = useRef(onConversationViewStateChange);
  useLayoutEffect(() => {
    onConversationViewStateChangeRef.current = onConversationViewStateChange;
  }, [onConversationViewStateChange]);
  const liveAgent = piAgentRun?.runtime === "pi_provider";
  const showAgentRun = piAgentRun !== undefined &&
    (!liveAgent || piAgentRun.status === "running" || piAgentRun.status === "failed");
  const runCopy = piAgentRun?.presentation ?? {
    title: liveAgent ? agentName : copy.agentRunTitle,
    ready: copy.agentRunReady,
    unavailable: copy.agentRunUnavailable,
    draft: copy.agentRunDraft,
    cancel: copy.agentRunCancel,
    forgetCredential: copy.agentRunForgetCredential,
  };
  const providerModelUnavailable = !interactionReady ||
    (providerModel !== undefined && providerModel.status !== "ready");

  const firstEntryId = transcript.entries[0]?.entryId ?? null;
  const lastSequence = transcript.entries.at(-1)?.sequence ?? null;

  const publishConversationViewStateV1 = (
    next: ConversationViewStateV1,
  ): void => {
    const current = conversationViewStateRef.current;
    if (
      current.scrollAnchor.kind === next.scrollAnchor.kind &&
      (current.scrollAnchor.kind === "bottom" ||
        (next.scrollAnchor.kind === "entry" &&
          current.scrollAnchor.entryId === next.scrollAnchor.entryId &&
          current.scrollAnchor.sequence === next.scrollAnchor.sequence &&
          current.scrollAnchor.offset === next.scrollAnchor.offset)) &&
      current.composerSelectionStart === next.composerSelectionStart &&
      current.composerSelectionEnd === next.composerSelectionEnd
    ) return;
    conversationViewStateRef.current = next;
    onConversationViewStateChangeRef.current?.(next);
  };

  const captureConversationViewStateV1 = (): ConversationViewStateV1 => {
    const textarea = composerRef.current;
    const feed = feedRef.current;
    return {
      scrollAnchor: feed === null ||
          feed.clientHeight === 0
        ? conversationViewStateRef.current.scrollAnchor
        : captureConversationScrollAnchorV1(feed),
      composerSelectionStart: textarea?.selectionStart ??
        conversationViewStateRef.current.composerSelectionStart,
      composerSelectionEnd: textarea?.selectionEnd ??
        conversationViewStateRef.current.composerSelectionEnd,
    };
  };

  useLayoutEffect(() => {
    const feed = feedRef.current;
    const prependAnchor = prependAnchorRef.current;
    if (feed !== null && prependAnchor !== null) {
      applyConversationScrollAnchorV1(feed, prependAnchor, feedEndRef.current);
      prependAnchorRef.current = null;
    } else if (feed !== null && !initialScrollRestoredRef.current) {
      const restored = applyConversationScrollAnchorV1(
        feed,
        initialScrollAnchorRef.current,
        feedEndRef.current,
      );
      if (!restored) feedEndRef.current?.scrollIntoView({ block: "end" });
      initialScrollRestoredRef.current = true;
    } else if (
      lastSequence !== null &&
      (previousLastSequenceRef.current === null || lastSequence > previousLastSequenceRef.current)
    ) {
      feedEndRef.current?.scrollIntoView({ block: "end" });
    }
    previousLastSequenceRef.current = lastSequence;
  }, [firstEntryId, lastSequence, transcript.entries.length]);

  useLayoutEffect(() => {
    const textarea = composerRef.current;
    if (textarea !== null) {
      const start = Math.min(
        Math.max(0, initialConversationViewState.composerSelectionStart),
        draft.length,
      );
      const end = Math.min(
        Math.max(start, initialConversationViewState.composerSelectionEnd, 0),
        draft.length,
      );
      textarea.setSelectionRange(start, end);
      conversationViewStateRef.current = {
        ...conversationViewStateRef.current,
        composerSelectionStart: start,
        composerSelectionEnd: end,
      };
    }
    return () => {
      const next = captureConversationViewStateV1();
      conversationViewStateRef.current = next;
      onConversationViewStateChangeRef.current?.(next);
    };
    // This lifecycle belongs to the keyed Process subtree. Its initial values
    // are intentionally read once and captured again before that subtree exits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOlderV1 = (): void => {
    if (
      onLoadOlderTranscript === undefined || transcript.nextBeforeSequence === null ||
      transcript.phase === "loading_older"
    ) return;
    const feed = feedRef.current;
    const anchor = feed?.querySelector<HTMLElement>("[data-transcript-entry-id]");
    if (feed !== null && feed !== undefined && anchor !== null && anchor !== undefined) {
      prependAnchorRef.current = {
        kind: "entry",
        entryId: anchor.dataset.transcriptEntryId ?? "",
        sequence: Number(anchor.dataset.transcriptSequence),
        offset: anchor.getBoundingClientRect().top - feed.getBoundingClientRect().top,
      };
    }
    void Promise.resolve(onLoadOlderTranscript()).then((loaded) => {
      if (loaded === false) prependAnchorRef.current = null;
    }, () => {
      prependAnchorRef.current = null;
    });
  };

  const reloadLatestV1 = (): void => {
    if (
      onReloadLatestTranscript === undefined || !transcript.newerOmitted ||
      latestReloadPending
    ) return;
    setLatestReloadPending(true);
    void Promise.resolve(onReloadLatestTranscript()).then(
      () => setLatestReloadPending(false),
      () => setLatestReloadPending(false),
    );
  };

  const submitV1 = (event?: FormEvent): void => {
    event?.preventDefault();
    const text = draft.trim();
    if (text.length === 0 || providerModelUnavailable || agentInteractionPending) return;
    void Promise.resolve(onSend(text)).then((accepted) => {
      if (accepted === false) return;
      if (draftRef.current.trim() !== text) return;
      draftRef.current = "";
      setDraft("");
      onDraftChange?.("");
      publishConversationViewStateV1({
        ...conversationViewStateRef.current,
        composerSelectionStart: 0,
        composerSelectionEnd: 0,
      });
    });
  };

  return (
    <section className="chat-pane" aria-label={copy.chat} data-workspace-pane="chat">
      <div
        className="chat-pane__feed"
        role="log"
        aria-live="polite"
        ref={feedRef}
        onScroll={() => {
          publishConversationViewStateV1(captureConversationViewStateV1());
        }}
      >
        <div className="chat-pane__intro">
          <span className="chat-pane__agent-avatar" aria-hidden="true">
            <Sparkles size={16} fill="currentColor" />
          </span>
          <div>
            <strong>{agentName}</strong>
          </div>
        </div>

        {(transcript.nextBeforeSequence !== null || transcript.phase === "loading_older") && (
          <div className="chat-pane__history-control">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              {...(transcript.phase === "loading_older" ? { icon: LoaderCircle } : {})}
              disabled={transcript.phase === "loading_older" || onLoadOlderTranscript === undefined}
              onClick={loadOlderV1}
            >
              {transcript.phase === "loading_older"
                ? copy.loadingOlderTranscript
                : copy.loadOlderTranscript}
            </Button>
          </div>
        )}
        {transcript.newerOmitted && (
          <div className="chat-pane__history-control">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              {...(latestReloadPending ? { icon: LoaderCircle } : {})}
              disabled={latestReloadPending || onReloadLatestTranscript === undefined}
              onClick={reloadLatestV1}
            >
              {latestReloadPending ? copy.loadingLatestTranscript : copy.reloadLatestTranscript}
            </Button>
          </div>
        )}
        {transcript.phase === "loading" && transcript.entries.length === 0 && (
          <p className="chat-pane__transcript-status" role="status">
            {copy.loadingOlderTranscript}
          </p>
        )}
        {transcript.phase === "failed" && (
          <p className="chat-pane__transcript-status is-failed" role="alert">
            {copy.transcriptUnavailable}
          </p>
        )}

        {transcript.entries.map((entry) => (
          <article
            className={`chat-message chat-message--${entry.role}`}
            key={entry.entryId}
            data-chat-role={entry.role}
            data-transcript-entry-id={entry.entryId}
            data-transcript-sequence={entry.sequence}
            data-transcript-state={entry.state}
          >
            <span className="chat-message__avatar" aria-hidden="true">
              {transcriptAvatarV1(copy, entry.role)}
            </span>
            <div className="chat-message__body">
              <strong>{transcriptRoleLabelV1(copy, entry.role, agentName)}</strong>
              {entry.parts.map((part) => (
                <TranscriptPartV1View copy={copy} part={part} key={part.partId} />
              ))}
              {entry.state === "interrupted_partial" && (
                <p className="chat-message__interrupted">{copy.transcriptInterrupted}</p>
              )}
            </div>
          </article>
        ))}

        {interruptedRetry !== undefined && (
          <div className="chat-pane__interrupted-retry">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={RotateCcw}
              disabled={interruptedRetry.pending}
              onClick={() => void Promise.resolve(interruptedRetry.onRetry())}
            >
              {copy.retryInterruptedRun}
            </Button>
          </div>
        )}

        {showAgentRun && piAgentRun !== undefined && (
          <aside
            className="pi-agent-run"
            data-pi-agent-runtime={piAgentRun.runtime}
            data-pi-agent-run-status={piAgentRun.status}
            data-pi-agent-diagnostic={piAgentRun.diagnosticPath ?? undefined}
          >
            <div className="pi-agent-run__heading">
              {piAgentRun.status === "running"
                ? <LoaderCircle className="is-spinning" size={15} aria-hidden="true" />
                : liveAgent
                ? <Sparkles size={15} aria-hidden="true" />
                : <KeyRound size={15} aria-hidden="true" />}
              <strong>{runCopy.title}</strong>
              <span role="status">
                {piAgentRun.status === "running"
                  ? runCopy.draft
                  : piAgentRun.status === "failed" || piAgentRun.status === "disposed"
                  ? runCopy.unavailable
                  : runCopy.ready}
              </span>
            </div>
            {piAgentRun.status === "running" && piAgentRun.draft.length > 0 && (
              <p className="pi-agent-run__draft" aria-live="polite">
                {piAgentRun.draft}
              </p>
            )}
            {(piAgentRun.status === "running" || !liveAgent) && (
              <div className="pi-agent-run__actions">
                {piAgentRun.status === "running" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={StopCircle}
                    onClick={piAgentRun.onCancel}
                  >
                    {runCopy.cancel}
                  </Button>
                )}
                {!liveAgent && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    icon={KeyRound}
                    disabled={agentInteractionPending || piAgentRun.status === "running"}
                    onClick={piAgentRun.onForget}
                  >
                    {runCopy.forgetCredential}
                  </Button>
                )}
              </div>
            )}
          </aside>
        )}

        {networkAccess !== undefined && (
          <section className="network-access" aria-labelledby="network-access-heading">
            <div className="network-access__heading">
              <span>
                <Globe2 size={15} aria-hidden="true" />
                <strong id="network-access-heading">{copy.networkAccessTitle}</strong>
              </span>
              <label className="network-access__toggle">
                <CheckboxV1
                  checked={networkAccess.enabled}
                  disabled={networkAccess.pending}
                  onChange={(event) => {
                    void Promise.resolve(networkAccess.onChange(event.currentTarget.checked));
                  }}
                />
                <span>{copy.networkAccessToggle}</span>
              </label>
            </div>
            <p>{copy.networkAccessDescription}</p>
          </section>
        )}

        {feedSupplement}
        <div ref={feedEndRef} />
      </div>

      {statusNotice === undefined
        ? null
        : <div className="chat-pane__status-notice">{statusNotice}</div>}

      {readOnly ? null : (
        <form className="chat-composer" onSubmit={submitV1}>
          <label className="silly-os-visually-hidden" htmlFor="workspace-follow-up">
            {copy.sendPlaceholder}
          </label>
          <TextareaV1
            ref={composerRef}
            id="workspace-follow-up"
            value={draft}
            rows={3}
            maxLength={4_000}
            placeholder={copy.sendPlaceholder}
            disabled={agentInteractionPending}
            onChange={(event) => {
              const next = event.currentTarget.value;
              draftRef.current = next;
              setDraft(next);
              onDraftChange?.(next);
              publishConversationViewStateV1({
                ...conversationViewStateRef.current,
                composerSelectionStart: event.currentTarget.selectionStart,
                composerSelectionEnd: event.currentTarget.selectionEnd,
              });
            }}
            onSelect={(event) => {
              publishConversationViewStateV1({
                ...conversationViewStateRef.current,
                composerSelectionStart: event.currentTarget.selectionStart,
                composerSelectionEnd: event.currentTarget.selectionEnd,
              });
            }}
            onKeyDown={(event) => {
              if (isComposerCompositionKeyV1(event.nativeEvent)) return;
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitV1();
              }
            }}
          />
          <div className="chat-composer__actions">
            <div className="chat-composer__primary-actions">
              {interactionReady && providerModel !== undefined && (
                <ComposerModelPickerV1
                  copy={copy}
                  surface="workspace"
                  disabled={piAgentRun?.status === "running"}
                  {...providerModel}
                />
              )}
              <IconButtonV1
                type="submit"
                variant="primary"
                size="sm"
                icon={ArrowUp}
                accessibleName={copy.send}
                disabled={agentInteractionPending || providerModelUnavailable ||
                  draft.trim().length === 0}
              />
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
