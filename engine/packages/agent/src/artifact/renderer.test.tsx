// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  admitUiArtifactCandidateInternalV1,
  createUiArtifactRevisionInternalV1,
} from "./admission.ts";
import type { UiIntentInternalV1 } from "./contract.ts";
import { UiArtifactRendererInternalV1 } from "./renderer.tsx";

const actionIdInternalV1 = "sillymaker.authoring.scene.nudge_selected_x";

function revisionInternalV1() {
  const admitted = admitUiArtifactCandidateInternalV1({
    schemaRevision: 1,
    root: {
      kind: "column",
      nodeId: "root",
      children: [
        { kind: "text", nodeId: "copy", text: "<img src=x onerror=alert(1)>" },
        { kind: "action", nodeId: "apply", label: "应用", actionId: actionIdInternalV1 },
      ],
    },
  }, [actionIdInternalV1]);
  if (admitted.kind !== "admitted") throw new TypeError("expected admitted fixture");
  return createUiArtifactRevisionInternalV1({
    hostIdentity: 11,
    revision: 4,
    sessionId: "session.1",
    runId: "run.1",
    completedSequence: 2,
    document: admitted.document,
  });
}

afterEach(cleanup);

describe("UiArtifactRendererInternalV1", () => {
  it("renders only closed data nodes and emits one current admitted intent", () => {
    const intents: UiIntentInternalV1[] = [];
    const { container } = render(
      <UiArtifactRendererInternalV1
        revision={revisionInternalV1()}
        onIntent={(intent) => intents.push(intent)}
      />,
    );

    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "应用" }));
    expect(intents).toEqual([{
      schemaRevision: 1,
      kind: "ui.action.invoke",
      hostIdentity: 11,
      artifactRevision: 4,
      nodeId: "apply",
      actionId: actionIdInternalV1,
    }]);
  });

  it("keeps a probe renderer inert", () => {
    const intents: UiIntentInternalV1[] = [];
    render(
      <UiArtifactRendererInternalV1
        revision={revisionInternalV1()}
        inert
        onIntent={(intent) => intents.push(intent)}
      />,
    );
    const button = screen.getByRole("button", { name: "应用" });
    expect(button).toHaveProperty("disabled", true);
    fireEvent.click(button);
    expect(intents).toEqual([]);
  });
});
