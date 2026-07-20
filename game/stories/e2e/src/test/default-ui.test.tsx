// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { DefaultGameRootV1, createGameUiCompositionV1 } from "@sillymaker/ui";

import { createLabApplicationInstanceV1 } from "../application/core-application.js";
import {
  labRootLabelsV1,
  labUiProjectorV1,
  labUiSlotsV1,
  labViewportCanvasV1,
} from "../application/web-application.js";

afterEach(cleanup);

const debugVocabularyV1 = /debug|semantic|revision|replay|fixture|diagnostic/iu;

async function composeLabUiV1() {
  const instance = await createLabApplicationInstanceV1();
  const composition = createGameUiCompositionV1({
    semantic: instance.semantic,
    projector: labUiProjectorV1,
    anchor: Object.freeze({
      current: () => instance.presentationAnchor(),
      subscribe: (listener: () => void) => instance.subscribePresentationAnchor(() => listener()),
    }),
    overlayIds: ["overlay.lab.journal"],
  });
  return { instance, composition };
}

function renderLabRootV1(input: Awaited<ReturnType<typeof composeLabUiV1>>) {
  return render(
    <DefaultGameRootV1
      composition={input.composition}
      semantic={input.instance.semantic}
      accessibleName="引擎实验室"
      applicationId="e2e"
      viewport={{ canvas: labViewportCanvasV1, fallbackSize: { width: 1600, height: 1000 } }}
      labels={labRootLabelsV1}
      slots={labUiSlotsV1}
    />,
  );
}

describe("Engine Lab default UI", () => {
  it("boots the default GameRoot with zero Story React Root code", async () => {
    const { instance, composition } = await composeLabUiV1();
    renderLabRootV1({ instance, composition });

    // Viewport and the seven-layer stage are present.
    expect(screen.getByTestId("game-viewport")).toBeInTheDocument();
    expect(screen.getByTestId("stage-background")).toBeInTheDocument();
    expect(screen.getByTestId("stage-system")).toBeInTheDocument();

    // The Story stage and HUD contributions render through slots.
    expect(screen.getByRole("heading", { name: "引擎实验室" })).toBeInTheDocument();
    const collect = screen.getByRole("button", { name: "采集样本" });
    expect(collect).toBeEnabled();

    // Dispatch flows through the semantic port and updates the projection.
    await userEvent.setup().click(collect);
    await waitFor(() => {
      expect(screen.getByText(/样本[1-9]/u)).toBeInTheDocument();
    });

    composition.dispose();
    await instance.dispose();
  });

  it("keeps the resident player DOM free of debug vocabulary", async () => {
    const { instance, composition } = await composeLabUiV1();
    const { container } = renderLabRootV1({ instance, composition });

    expect(container.textContent ?? "").not.toMatch(debugVocabularyV1);

    // Machine probes stay data-* only.
    const root = container.querySelector("[data-application-id='e2e']");
    expect(root).not.toBeNull();
    expect(root).toHaveAttribute("data-presentation-epoch", "0");

    composition.dispose();
    await instance.dispose();
  });

  it("opens the Story journal overlay contribution without composer changes", async () => {
    const { instance, composition } = await composeLabUiV1();
    renderLabRootV1({ instance, composition });

    await userEvent.setup().click(screen.getByRole("button", { name: "实验日志" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-journal='true']")).toBeInTheDocument();
    });
    await userEvent.setup().click(screen.getByRole("button", { name: "关闭" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-journal='true']")).not.toBeInTheDocument();
    });

    composition.dispose();
    await instance.dispose();
  });

  it("advances the presentation epoch probe after a load", async () => {
    const { instance, composition } = await composeLabUiV1();
    const { container } = renderLabRootV1({ instance, composition });

    await instance.persistence.save("manual");
    await instance.semantic.dispatch({ kind: "invoke", actionId: "lab.collect_sample" });
    await instance.persistence.load("manual");

    await waitFor(() => {
      const root = container.querySelector("[data-application-id='e2e']");
      expect(root).toHaveAttribute("data-presentation-epoch", "1");
      expect(root).toHaveAttribute("data-presentation-origin", "load");
    });

    composition.dispose();
    await instance.dispose();
  });

  it("stops publishing after composition disposal", async () => {
    const { instance, composition } = await composeLabUiV1();
    const before = composition.presentation.getSnapshot().revision;
    composition.dispose();
    await instance.semantic.dispatch({ kind: "invoke", actionId: "lab.collect_sample" });
    expect(composition.presentation.getSnapshot().revision).toBe(before);
    await instance.dispose();
  });
});
