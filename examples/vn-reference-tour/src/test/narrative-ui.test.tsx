// SPDX-License-Identifier: MIT
import { expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createTextContentSessionV1, parseLocaleId } from "@sillymaker/base";
import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import {
  playerInputActionIdsV1,
  systemInputActionIdsV1,
  type HeldInputPortV1,
  type RuntimeAssetLoaderV1,
} from "@sillymaker/ui";

import {
  projectVnReferenceTourNarrativeSurfaceSelectionV1,
  vnReferenceTourGameApplicationV1,
} from "../application/composition.tsx";
import { createVnReferenceTourApplicationInstanceV1 } from "../application/core-application.ts";
import { vnReferenceTourTextCatalogsV1 } from "../content/presentation.ts";
import {
  vnReferenceTourSharedTextPackIdV1,
  vnReferenceTourTextContentManifestV1,
} from "../content/text-content.ts";

const packageRootPathV1 = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const emptyHeldInputV1: HeldInputPortV1 = {
  state: {
    getCurrent: () => ({ heldActionIds: new Set() }),
    subscribe: () => () => {},
  },
};

const loadedAssetLoaderV1: RuntimeAssetLoaderV1 = {
  cacheKey: (request) => request.runtimePath,
  load: (request) => Promise.resolve({ kind: "loaded", url: request.runtimePath }),
  dispose: () => {},
};

it("selects the engine default VN Player and keeps the product Narrative binding", async () => {
  expect(vnReferenceTourGameApplicationV1.viewport.layoutVariants).toEqual([
    {
      id: "vn-portrait",
      when: { maxAspectRatio: 0.8 },
      mode: "expand-height",
    },
  ]);
  const instance = await createVnReferenceTourApplicationInstanceV1();
  const playerProfile = await createPlayerProfileStoreV1({
    records: createMemoryHostRecordStoreV1(),
    storyId: "story.example.vn-reference-tour",
  });
  const textContent = createTextContentSessionV1({
    manifest: vnReferenceTourTextContentManifestV1,
    bootstrapCatalogs: vnReferenceTourTextCatalogsV1.catalogs,
    loadPackBytes: (_descriptor, variant) =>
      readFile(resolve(packageRootPathV1, variant.runtimePath)),
  });
  const textContentLease = await textContent.acquire(vnReferenceTourSharedTextPackIdV1);
  try {
    const ui = vnReferenceTourGameApplicationV1.ui(
      {
        heldInput: emptyHeldInputV1,
        instance,
        playerProfile,
        assetLoader: loadedAssetLoaderV1,
        textContent,
        reportFailure: vi.fn(),
      } as unknown as Parameters<typeof vnReferenceTourGameApplicationV1.ui>[0],
    );
    expect(Object.hasOwn(ui, "narrative")).toBe(true);
    expect(Object.hasOwn(ui.slots ?? {}, "narrative")).toBe(false);
    expect(Object.hasOwn(ui.slots ?? {}, "hud")).toBe(true);
    expect(ui.hideSystemMenu).toBe(true);
    expect(ui.saveLabels).toMatchObject({
      title: "保存",
      quickSave: "快速保存",
      slotNames: { quick: "快速存档" },
    });
    expect(ui.input?.keyboard).toMatchObject({
      Escape: systemInputActionIdsV1.cancel,
      Enter: systemInputActionIdsV1.narrativeAdvance,
      KeyH: playerInputActionIdsV1.toggleUi,
      Space: systemInputActionIdsV1.narrativeAdvance,
      Tab: playerInputActionIdsV1.toggleSkip,
    });
    expect(ui.input?.pointer).toMatchObject({ secondary: systemInputActionIdsV1.cancel });
    expect(ui.input?.held).toEqual({ Control: playerInputActionIdsV1.fastForward });

    await expect(
      instance.semantic.dispatch(
        { kind: "invoke", actionId: "vn-reference-tour.begin_story" } as never,
      ),
    ).resolves.toMatchObject({ kind: "committed" });
    const firstPending = instance.semantic.observe().narrative.pending;
    if (firstPending === null || firstPending.kind !== "say") {
      throw new TypeError("expected vn-reference-tour opening narration");
    }
    await expect(instance.semantic.dispatch({
      kind: "resolve",
      expectedOccurrenceId: firstPending.occurrenceId,
      resolution: { kind: "advance" },
    } as never)).resolves.toMatchObject({ kind: "committed" });
    expect(
      projectVnReferenceTourNarrativeSurfaceSelectionV1(instance.semantic.observe()).pending,
    ).toMatchObject({
      kind: "say",
      occurrenceId: "interaction-occurrence.2",
    });

    await expect(textContent.activateLocale(parseLocaleId("en"))).resolves.toBe(true);
    const englishUi = vnReferenceTourGameApplicationV1.ui(
      {
        heldInput: emptyHeldInputV1,
        instance,
        playerProfile,
        assetLoader: loadedAssetLoaderV1,
        textContent,
        reportFailure: vi.fn(),
      } as unknown as Parameters<typeof vnReferenceTourGameApplicationV1.ui>[0],
    );
    try {
      expect(englishUi.saveLabels).toMatchObject({
        title: "Save",
        quickSave: "Quick save",
        slotNames: { quick: "Quick save" },
      });
      expect(englishUi.saveLabels?.confirmation.loadDescription("Quick save")).toBe(
        "Your current progress will be replaced by Quick save.",
      );
      expect(englishUi.saveLabels?.operation.rejected.in_flight).toBe(
        "Cannot save during a transition",
      );
    } finally {
      englishUi.dispose?.();
    }
  } finally {
    textContentLease.release();
    textContent.dispose();
    await instance.dispose();
  }
});
