// SPDX-License-Identifier: MIT
import { type ReactNode } from "react";

import { ButtonV1 } from "../../../ui/design-system/button.tsx";
import {
  StatusContentV1,
  StatusDescriptionV1,
  StatusV1,
} from "../../../ui/design-system/status.tsx";
import {
  createProgramOpenUiActionIntentV1,
  type ProgramOpenUiActionIntentV1,
  type ProgramOpenUiDocumentV1,
  type ProgramOpenUiNodeV1,
} from "./program-openui-document.ts";
import "./program-openui-renderer.css";

function renderNodeV1(
  node: ProgramOpenUiNodeV1,
  document: ProgramOpenUiDocumentV1,
  onAction: (intent: ProgramOpenUiActionIntentV1) => void,
  disabled: boolean,
  key: string,
): ReactNode {
  switch (node.kind) {
    case "stack":
      return (
        <div className="program-openui-stack" data-gap={node.gap} key={key}>
          {node.children.map((child, index) =>
            renderNodeV1(child, document, onAction, disabled, `${key}.${String(index)}`)
          )}
        </div>
      );
    case "heading": {
      const Heading = node.level === 1 ? "h1" : node.level === 2 ? "h2" : "h3";
      return <Heading className="program-openui-heading" key={key}>{node.text}</Heading>;
    }
    case "text":
      return (
        <p className="program-openui-text" data-tone={node.tone} key={key}>
          {node.text}
        </p>
      );
    case "callout":
      return (
        <StatusV1
          className="program-openui-callout"
          variant={node.tone === "critical" ? "danger" : node.tone}
          key={key}
        >
          <StatusContentV1>
            <StatusDescriptionV1>{node.text}</StatusDescriptionV1>
          </StatusContentV1>
        </StatusV1>
      );
    case "action":
      return (
        <ButtonV1
          type="button"
          variant={node.variant}
          disabled={disabled}
          key={key}
          onClick={() => onAction(createProgramOpenUiActionIntentV1(document, node))}
        >
          {node.label}
        </ButtonV1>
      );
  }
  return null;
}

export function ProgramOpenUiRendererV1({
  document,
  onAction,
  disabled = false,
}: {
  readonly document: ProgramOpenUiDocumentV1;
  readonly onAction: (intent: ProgramOpenUiActionIntentV1) => void;
  readonly disabled?: boolean;
}): ReactNode {
  return (
    <section
      className="program-openui-document"
      data-program-openui-document=""
      data-program-openui-document-id={document.documentId}
      data-program-openui-document-revision={document.revision}
    >
      {renderNodeV1(document.root, document, onAction, disabled, "root")}
    </section>
  );
}
