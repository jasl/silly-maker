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
  createVnLastSoundCheckGameApplicationV1,
  projectVnLastSoundCheckNarrativeSurfaceSelectionV1,
} from "../application/composition.tsx";
import { vnLastSoundCheckGameApplicationV1 } from "../application/production-application.tsx";
import { createVnLastSoundCheckApplicationInstanceV1 } from "../application/core-application.ts";
import { vnLastSoundCheckTextCatalogsV1 } from "../content/presentation.ts";
import {
  vnLastSoundCheckSharedTextPackIdV1,
  vnLastSoundCheckTextContentManifestV1,
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
  expect(vnLastSoundCheckGameApplicationV1.viewport.layoutVariants).toEqual([
    {
      id: "vn-portrait",
      when: { maxAspectRatio: 0.8 },
      mode: "expand-height",
    },
  ]);
  const instance = await createVnLastSoundCheckApplicationInstanceV1();
  const playerProfile = await createPlayerProfileStoreV1({
    records: createMemoryHostRecordStoreV1(),
    storyId: "story.example.vn-last-sound-check",
  });
  const textContent = createTextContentSessionV1({
    manifest: vnLastSoundCheckTextContentManifestV1,
    bootstrapCatalogs: vnLastSoundCheckTextCatalogsV1.catalogs,
    loadPackBytes: (_descriptor, variant) =>
      readFile(resolve(packageRootPathV1, variant.runtimePath)),
  });
  const textContentLease = await textContent.acquire(vnLastSoundCheckSharedTextPackIdV1);
  try {
    const ui = vnLastSoundCheckGameApplicationV1.ui(
      {
        heldInput: emptyHeldInputV1,
        instance,
        playerProfile,
        assetLoader: loadedAssetLoaderV1,
        textContent,
        reportFailure: vi.fn(),
      } as unknown as Parameters<typeof vnLastSoundCheckGameApplicationV1.ui>[0],
    );
    expect(Object.hasOwn(ui, "narrative")).toBe(true);
    expect(Object.hasOwn(ui.slots ?? {}, "narrative")).toBe(false);
    expect(Object.hasOwn(ui.slots ?? {}, "hud")).toBe(true);
    expect(Object.hasOwn(ui.slots ?? {}, "settingsSections")).toBe(true);
    expect(ui.hideSystemMenu).toBe(true);
    expect(ui.resolveLocalizedCopy?.(null).saveLabels).toMatchObject({
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
        { kind: "invoke", actionId: "vn-last-sound-check.begin_story" } as never,
      ),
    ).resolves.toMatchObject({ kind: "committed" });
    const firstPending = instance.semantic.observe().narrative.pending;
    if (firstPending === null || firstPending.kind !== "say") {
      throw new TypeError("expected vn-last-sound-check opening narration");
    }
    await expect(instance.semantic.dispatch({
      kind: "resolve",
      expectedOccurrenceId: firstPending.occurrenceId,
      resolution: { kind: "advance" },
    } as never)).resolves.toMatchObject({ kind: "committed" });
    expect(
      projectVnLastSoundCheckNarrativeSurfaceSelectionV1(instance.semantic.observe()).pending,
    ).toMatchObject({
      kind: "say",
      occurrenceId: "interaction-occurrence.2",
    });

    await expect(textContent.activateLocale(parseLocaleId("en"))).resolves.toBe(true);
    const englishCopy = ui.resolveLocalizedCopy?.("en");
    expect(englishCopy?.accessibleName).toBe("One Last Sound Check");
    expect(englishCopy?.titleScreenTitle).toBe("One Last Sound Check");
    expect(englishCopy?.saveLabels).toMatchObject({
      title: "Save",
      quickSave: "Quick save",
      slotNames: { quick: "Quick save" },
    });
    expect(englishCopy?.saveLabels?.confirmation.loadDescription("Quick save")).toBe(
      "Your current progress will be replaced by Quick save.",
    );
    expect(englishCopy?.saveLabels?.operation.rejected.in_flight).toBe(
      "Cannot save during a transition",
    );
  } finally {
    textContentLease.release();
    textContent.dispose();
    await instance.dispose();
  }
});

it("joins optional presentation disposal before releasing the application UI", async () => {
  let releasePresentation!: () => void;
  const presentationDisposed = new Promise<void>((resolvePresentation) => {
    releasePresentation = resolvePresentation;
  });
  const application = createVnLastSoundCheckGameApplicationV1(() => ({
    player: {
      renderer: () => null,
      history: null,
      input: { keyboard: {}, held: {}, pointer: {} },
    },
    dispose: () => presentationDisposed,
  }));
  const instance = await createVnLastSoundCheckApplicationInstanceV1();
  const playerProfile = await createPlayerProfileStoreV1({
    records: createMemoryHostRecordStoreV1(),
    storyId: "story.example.vn-last-sound-check.dispose-test",
  });
  const textContent = createTextContentSessionV1({
    manifest: vnLastSoundCheckTextContentManifestV1,
    bootstrapCatalogs: vnLastSoundCheckTextCatalogsV1.catalogs,
    loadPackBytes: (_descriptor, variant) =>
      readFile(resolve(packageRootPathV1, variant.runtimePath)),
  });
  const textContentLease = await textContent.acquire(vnLastSoundCheckSharedTextPackIdV1);
  try {
    const ui = application.ui(
      {
        heldInput: emptyHeldInputV1,
        instance,
        playerProfile,
        assetLoader: loadedAssetLoaderV1,
        textContent,
        reportFailure: vi.fn(),
      } as unknown as Parameters<typeof application.ui>[0],
    );
    let settled = false;
    const disposal = Promise.resolve(ui.dispose?.()).then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    releasePresentation();
    await disposal;
    expect(settled).toBe(true);
  } finally {
    textContentLease.release();
    textContent.dispose();
    await instance.dispose();
  }
});
