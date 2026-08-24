// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import type {
  UiArtifactNodeInternalV1,
  UiArtifactRevisionInternalV1,
  UiIntentInternalV1,
} from "./contract.ts";
import { uiIntentSchemaRevisionInternalV1 } from "./contract.ts";

export interface UiArtifactRendererPropsInternalV1 {
  readonly revision: UiArtifactRevisionInternalV1;
  readonly inert?: boolean;
  readonly onIntent: (intent: UiIntentInternalV1) => void;
}

function renderNodeInternalV1(
  node: UiArtifactNodeInternalV1,
  props: UiArtifactRendererPropsInternalV1,
): ReactElement {
  switch (node.kind) {
    case "column":
      return (
        <div
          key={node.nodeId}
          data-ui-artifact-kind="column"
          data-ui-artifact-node={node.nodeId}
        >
          {node.children.map((child) => renderNodeInternalV1(child, props))}
        </div>
      );
    case "text":
      return (
        <p key={node.nodeId} data-ui-artifact-kind="text" data-ui-artifact-node={node.nodeId}>
          {node.text}
        </p>
      );
    case "action":
      return (
        <button
          key={node.nodeId}
          type="button"
          disabled={props.inert === true}
          data-ui-artifact-kind="action"
          data-ui-artifact-node={node.nodeId}
          onClick={() => {
            props.onIntent({
              schemaRevision: uiIntentSchemaRevisionInternalV1,
              kind: "ui.action.invoke",
              hostIdentity: props.revision.hostIdentity,
              artifactRevision: props.revision.revision,
              nodeId: node.nodeId,
              actionId: node.actionId,
            });
          }}
        >
          {node.label}
        </button>
      );
  }
  const exhaustive: never = node;
  throw new TypeError(`Unknown UiArtifact node ${String(exhaustive)}`);
}

/** Closed renderer: no HTML injection, component registry, arbitrary props, or module loading. */
export function UiArtifactRendererInternalV1(
  props: UiArtifactRendererPropsInternalV1,
): ReactElement {
  return (
    <section
      aria-label="Agent artifact"
      data-ui-artifact-revision={String(props.revision.revision)}
    >
      {renderNodeInternalV1(props.revision.document.root, props)}
    </section>
  );
}
