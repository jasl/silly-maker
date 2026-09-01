// SPDX-License-Identifier: MIT

import { type ReactNode } from "react";

import type { SillyOsCopyV1 } from "../../content/copy.ts";
import type {
  ReadOnlyProcessConversationDegradationV1,
  ReadOnlyProcessConversationProjectionV1,
} from "../process/read-only-process-conversation-controller.ts";
import { ChatPaneV1 } from "../../ui/chat-pane.tsx";
import { BadgeV1 } from "../../ui/design-system/badge.tsx";
import { ButtonV1 } from "../../ui/design-system/button.tsx";
import "./read-only-process-conversation.css";

export interface ReadOnlyProcessConversationViewPropsV1 {
  readonly copy: SillyOsCopyV1;
  readonly conversation: ReadOnlyProcessConversationProjectionV1;
  readonly onHome: () => void;
  readonly onLoadOlderTranscript: () => boolean | void | Promise<boolean | void>;
}

function degradationCopyV1(
  copy: SillyOsCopyV1,
  degradation: ReadOnlyProcessConversationDegradationV1,
): string {
  if (degradation.capability === "package") {
    return copy.locale === "zh-CN"
      ? "此 Process 使用的原始 Program 包当前不可用；Conversation 仍可只读查看。"
      : "The exact Program package used by this Process is unavailable. Its Conversation remains readable.";
  }
  if (degradation.capability === "runtime") {
    return copy.locale === "zh-CN"
      ? "此 Process 的 Program 运行能力当前不可用；Conversation 仍可只读查看。"
      : "The Program runtime for this Process is unavailable. Its Conversation remains readable.";
  }
  if (degradation.code === "volume_missing") {
    return copy.locale === "zh-CN"
      ? "此 Process 的本地 Workspace 已丢失或被清除；SillyOS 没有用空 Workspace 替代它，Conversation 仍可只读查看。"
      : "This Process's local Workspace is missing or was cleared. SillyOS did not substitute an empty Workspace; its Conversation remains readable.";
  }
  if (degradation.code === "volume_corrupt" || degradation.code === "recovery_required") {
    return copy.locale === "zh-CN"
      ? "此 Process 的本地 Workspace 无法可靠恢复；Conversation 仍可只读查看。"
      : "This Process's local Workspace cannot be recovered reliably. Its Conversation remains readable.";
  }
  if (degradation.code === "workspace_busy" || degradation.code === "volume_busy") {
    return copy.locale === "zh-CN"
      ? "此 Process 的 Workspace 正由另一页面使用；当前页面以只读方式打开 Conversation。"
      : "This Process's Workspace is in use by another page. This page opened the Conversation read-only.";
  }
  if (degradation.code === "storage_unavailable") {
    return copy.locale === "zh-CN"
      ? "当前浏览器上下文无法访问此 Process 的持久化 Workspace；Conversation 仍可只读查看。"
      : "This browser context cannot access the Process's durable Workspace. Its Conversation remains readable.";
  }
  return copy.locale === "zh-CN"
    ? "此 Process 的 Workspace 当前不可用；Conversation 仍可只读查看。"
    : "This Process's Workspace is unavailable. Its Conversation remains readable.";
}

/**
 * Package-independent Conversation reader. It intentionally has no Program
 * runtime, settings, Workspace, agent, or mutation callbacks.
 */
export function ReadOnlyProcessConversationViewV1({
  copy,
  conversation,
  onHome,
  onLoadOlderTranscript,
}: ReadOnlyProcessConversationViewPropsV1): ReactNode {
  const packageReference = conversation.process.programPackage;
  const readOnlyLabel = copy.locale === "zh-CN" ? "只读 Conversation" : "Read-only Conversation";
  return (
    <main
      className="read-only-process-conversation"
      data-silly-os-view="read-only-conversation"
      data-process-id={conversation.process.processId}
    >
      <header className="read-only-process-conversation__header">
        <ButtonV1 type="button" size="sm" variant="ghost" onClick={onHome}>
          {copy.home}
        </ButtonV1>
        <div className="read-only-process-conversation__identity">
          <span>{readOnlyLabel}</span>
          <code>
            {packageReference.programId}@{packageReference.packageVersion}
          </code>
        </div>
        <BadgeV1 variant="neutral">{copy.locale === "zh-CN" ? "不可编辑" : "Read only"}</BadgeV1>
      </header>
      {conversation.degradation !== null && (
        <p
          className="read-only-process-conversation__degradation"
          role="status"
          data-degradation-capability={conversation.degradation.capability}
          data-degradation-code={conversation.degradation.code}
        >
          {degradationCopyV1(copy, conversation.degradation)}
        </p>
      )}
      <div className="read-only-process-conversation__feed">
        <ChatPaneV1
          copy={copy}
          agentName={packageReference.programId}
          transcript={conversation.transcript}
          readOnly
          onLoadOlderTranscript={onLoadOlderTranscript}
          onSend={() => false}
        />
      </div>
    </main>
  );
}
