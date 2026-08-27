// SPDX-License-Identifier: MIT
import { expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cwd } from "node:process";

import { createTextContentSessionV1 } from "@sillymaker/base";
import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import {
  playerInputActionIdsV1,
  systemInputActionIdsV1,
  type HeldInputPortV1,
} from "@sillymaker/ui";

import {
  projectTemplateNarrativeSurfaceSelectionV1,
  templateGameApplicationV1,
} from "../application/composition.tsx";
import { createTemplateApplicationInstanceV1 } from "../application/core-application.ts";
import { templateTextCatalogsV1 } from "../content/presentation.ts";
import {
  templateOpeningTextPackIdV1,
  templateTextContentManifestV1,
} from "../content/text-content.ts";

const emptyHeldInputV1: HeldInputPortV1 = {
  state: {
    getCurrent: () => ({ heldActionIds: new Set() }),
    subscribe: () => () => {},
  },
};

it("starts new projects with the engine default VN Player", async () => {
  const instance = await createTemplateApplicationInstanceV1();
  const playerProfile = await createPlayerProfileStoreV1({
    records: createMemoryHostRecordStoreV1(),
    storyId: "story.template",
  });
  const textContent = createTextContentSessionV1({
    manifest: templateTextContentManifestV1,
    bootstrapCatalogs: templateTextCatalogsV1.catalogs,
    loadPackBytes: (_descriptor, variant) =>
      readFile(resolve(cwd(), "template", variant.runtimePath)),
  });
  const textContentLease = await textContent.acquire(templateOpeningTextPackIdV1);
  try {
    const ui = templateGameApplicationV1.ui(
      {
        heldInput: emptyHeldInputV1,
        instance,
        playerProfile,
        textContent,
        reportFailure: vi.fn(),
      } as unknown as Parameters<typeof templateGameApplicationV1.ui>[0],
    );
    expect(Object.hasOwn(ui, "narrative")).toBe(true);
    expect(Object.hasOwn(ui.slots ?? {}, "narrative")).toBe(false);
    expect(ui.input?.keyboard).toMatchObject({
      Enter: systemInputActionIdsV1.narrativeAdvance,
      KeyH: playerInputActionIdsV1.toggleUi,
      Space: systemInputActionIdsV1.narrativeAdvance,
      Tab: playerInputActionIdsV1.toggleSkip,
    });
    expect(ui.input?.held).toEqual({ Control: playerInputActionIdsV1.fastForward });

    await expect(
      instance.semantic.dispatch({ kind: "invoke", actionId: "template.begin_story" } as never),
    ).resolves.toMatchObject({ kind: "committed" });
    expect(projectTemplateNarrativeSurfaceSelectionV1(instance.semantic.observe()).pending)
      .toMatchObject({
        kind: "say",
        occurrenceId: "interaction-occurrence.1",
      });
  } finally {
    textContentLease.release();
    textContent.dispose();
    await instance.dispose();
  }
});
