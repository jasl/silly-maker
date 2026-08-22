// SPDX-License-Identifier: MIT
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import {
  type AgentHostInternalV1,
  UiArtifactRendererInternalV1,
  type UiIntentInternalV1,
} from "@sillymaker/agent/internal";

import type { SceneAuthoringExecutionEnvelopeV1 } from "../core/scene-operations/contract.ts";
import type { SceneAuthoringLocalAdapterV1 } from "../core/scene-operations/contract.ts";
import type { ExperimentalEmbeddedAgentBindingInternalV1 } from "./binding.ts";
import styles from "../studio-app.module.css";

interface ArtifactActionBindingInternalV1 {
  readonly envelopes: Readonly<Record<string, SceneAuthoringExecutionEnvelopeV1>>;
}

export interface EmbeddedAgentSurfacePropsInternalV1 {
  readonly host: AgentHostInternalV1;
  readonly binding: ExperimentalEmbeddedAgentBindingInternalV1;
  readonly sceneOperations: SceneAuthoringLocalAdapterV1;
  readonly authoringRevision: number;
  readonly publicationRole: "visible" | "probe";
}

function diagnosticCodeInternalV1(
  diagnostic: ReturnType<AgentHostInternalV1["getSnapshot"]>["diagnostic"],
): string | null {
  return diagnostic?.diagnostic.code ?? null;
}

/** Experimental sibling surface. It never receives Scene Session, IO, save, or file authority. */
export function EmbeddedAgentSurfaceInternalV1(
  props: EmbeddedAgentSurfacePropsInternalV1,
): ReactElement {
  const snapshot = useSyncExternalStore(
    props.host.subscribe,
    props.host.getSnapshot,
    props.host.getSnapshot,
  );
  const [prompt, setPrompt] = useState("生成一个安全的场景修改建议");
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [boundArtifactRevision, setBoundArtifactRevision] = useState<number | null>(null);
  const actionBindings = useRef(new Map<number, ArtifactActionBindingInternalV1>());

  useEffect(() => {
    if (
      props.publicationRole !== "visible" ||
      props.host.getSnapshot().rpc.status.kind !== "disconnected"
    ) return undefined;
    void props.host.connect();
    return undefined;
  }, [props.host, props.publicationRole]);

  useLayoutEffect(() => {
    const currentArtifact = snapshot.artifact;
    if (props.publicationRole !== "visible" || currentArtifact === null) {
      setBoundArtifactRevision(null);
      return;
    }
    if (actionBindings.current.has(currentArtifact.revision)) {
      setBoundArtifactRevision(currentArtifact.revision);
      return;
    }
    const currentDocument = props.sceneOperations.current();
    if (currentDocument === null) {
      setBoundArtifactRevision(null);
      return;
    }
    const envelopes: Record<string, SceneAuthoringExecutionEnvelopeV1> = {};
    for (const [actionId, operation] of Object.entries(props.binding.sceneActions)) {
      Object.defineProperty(envelopes, actionId, {
        value: Object.freeze({
          documentIdentity: currentDocument.documentIdentity,
          expectedDraftRevision: currentDocument.draftRevision,
          operation,
        }),
        enumerable: true,
        configurable: false,
        writable: false,
      });
    }
    actionBindings.current.set(
      currentArtifact.revision,
      Object.freeze({ envelopes: Object.freeze(envelopes) }),
    );
    while (actionBindings.current.size > 16) {
      const oldest = actionBindings.current.keys().next().value as number | undefined;
      if (oldest === undefined) break;
      actionBindings.current.delete(oldest);
    }
    setBoundArtifactRevision(currentArtifact.revision);
  }, [
    props.authoringRevision,
    props.binding,
    props.publicationRole,
    props.sceneOperations,
    snapshot.artifact,
  ]);

  const applyIntent = (candidate: UiIntentInternalV1): void => {
    const admitted = props.host.admitIntent(candidate);
    if (admitted.kind === "rejected") {
      setActionNote(`交互未应用：${admitted.diagnostic.code}`);
      return;
    }
    const envelope = actionBindings.current.get(admitted.intent.artifactRevision)
      ?.envelopes[admitted.intent.actionId];
    if (envelope === undefined) {
      setActionNote("交互未应用：agent.authoring_binding_unavailable");
      return;
    }
    const result = props.sceneOperations.execute(envelope);
    setActionNote(
      result.kind === "applied"
        ? "场景草稿已更新（尚未保存）"
        : `交互未应用：${result.diagnostic.code}`,
    );
  };

  const diagnosticCode = diagnosticCodeInternalV1(snapshot.diagnostic);
  const canSubmit = props.publicationRole === "visible" && snapshot.readiness === "ready" &&
    snapshot.sessionId !== null && snapshot.run?.status !== "streaming" && prompt.length > 0;

  return (
    <aside
      className={styles["agent-panel"]}
      aria-label="实验 Agent"
      data-experimental-agent-host={String(snapshot.identity)}
      data-agent-readiness={snapshot.readiness}
    >
      <header className={styles["agent-toolbar"]}>
        <strong>Agent / UiArtifact 实验</strong>
        <span data-agent-domain-ready={snapshot.readiness === "ready" ? "true" : "false"}>
          {snapshot.readiness === "ready" ? "服务已连接" : `服务：${snapshot.readiness}`}
        </span>
      </header>
      {snapshot.readiness === "unavailable" || snapshot.readiness === "unconfigured"
        ? (
          <button
            type="button"
            data-agent-retry="true"
            disabled={props.publicationRole === "probe"}
            onClick={() => void props.host.retry()}
          >
            重试 Agent 服务
          </button>
        )
        : null}
      {snapshot.readiness === "ready" && snapshot.sessionId === null
        ? (
          <button
            type="button"
            data-agent-start="true"
            disabled={props.publicationRole === "probe"}
            onClick={() => void props.host.start()}
          >
            启动 Agent 会话
          </button>
        )
        : null}
      {snapshot.sessionId === null ? null : (
        <form
          className={styles["agent-prompt"]}
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) void props.host.submit(prompt);
          }}
        >
          <label>
            请求
            <textarea
              value={prompt}
              data-agent-prompt="true"
              disabled={props.publicationRole === "probe"}
              onChange={(event) => setPrompt(event.currentTarget.value)}
            />
          </label>
          <button type="submit" data-agent-submit="true" disabled={!canSubmit}>
            生成 Artifact
          </button>
          {snapshot.run?.status !== "streaming" ? null : (
            <button
              type="button"
              data-agent-cancel="true"
              disabled={props.publicationRole === "probe"}
              onClick={() => void props.host.cancel()}
            >
              取消本地接收
            </button>
          )}
        </form>
      )}
      {snapshot.draft === null ? null : (
        <pre
          className={styles["agent-draft"]}
          data-agent-draft-status={snapshot.draft.status}
        >
            {snapshot.draft.text}
        </pre>
      )}
      {diagnosticCode === null ? null : (
        <p role="status" data-agent-diagnostic={diagnosticCode}>
          {diagnosticCode}
        </p>
      )}
      {snapshot.artifact === null ? null : (
        <UiArtifactRendererInternalV1
          revision={snapshot.artifact}
          inert={props.publicationRole === "probe" ||
            boundArtifactRevision !== snapshot.artifact.revision}
          onIntent={applyIntent}
        />
      )}
      {actionNote === null ? null : <p role="status" data-agent-action-note>{actionNote}</p>}
    </aside>
  );
}
