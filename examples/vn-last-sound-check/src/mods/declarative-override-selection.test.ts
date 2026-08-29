// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";

import type {
  TextContentPackDescriptorV1,
  TextContentPackVariantDescriptorV1,
} from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import { createVnLastSoundCheckApplicationInstanceV1 } from "../application/core-application.ts";
import {
  createVnLastSoundCheckDeclarativeModManagerV1,
  type VnLastSoundCheckDeclarativeModSelectionV1,
} from "./declarative-override-selection.ts";
import {
  vnLastSoundCheckDeclarativeModTargetV1,
  type VnLastSoundCheckDeclarativeModArtifactSourceV1,
} from "./declarative-overrides.ts";

const encoderV1 = new TextEncoder();
const sharedChineseSlotV1 = "text-pack.vn-last-sound-check.shared:zh-CN";
const sharedChinesePathV1 = "assets/content/shared.zh-CN.text-pack.json";
const artifactTextPathV1 = "content/shared.zh-CN.text-pack.json";

async function runtimeBytesV1(runtimePath: string): Promise<Uint8Array> {
  return await readFile(new URL(runtimePath, new URL("../../", import.meta.url)));
}

async function editedSharedPackBytesV1(text: string): Promise<Uint8Array> {
  const source = JSON.parse(
    new TextDecoder().decode(await runtimeBytesV1(sharedChinesePathV1)),
  ) as { entries: { textId: string; text: string }[] };
  source.entries[0] = { ...source.entries[0]!, text };
  return encoderV1.encode(JSON.stringify(source));
}

async function artifactSourceV1(input: {
  readonly modId: string;
  readonly modVersion: string;
  readonly text?: string;
  readonly target?: unknown;
}): Promise<VnLastSoundCheckDeclarativeModArtifactSourceV1> {
  const resource = await editedSharedPackBytesV1(input.text ?? input.modVersion);
  return {
    manifestBytes: encoderV1.encode(JSON.stringify({
      format: "sillymaker.declarative-mod",
      version: 1,
      modId: input.modId,
      modVersion: input.modVersion,
      target: input.target ?? vnLastSoundCheckDeclarativeModTargetV1,
      textOverrides: [{ slotId: sharedChineseSlotV1, path: artifactTextPathV1 }],
      assetOverrides: [],
    })),
    async readResource(path) {
      if (path !== artifactTextPathV1) throw new TypeError(`unexpected resource:${path}`);
      return resource;
    },
  };
}

async function loadBaseTextPackBytesV1(
  _descriptor: TextContentPackDescriptorV1,
  variant: TextContentPackVariantDescriptorV1,
): Promise<Uint8Array> {
  return await runtimeBytesV1(variant.runtimePath);
}

function createManagerV1(input: {
  readonly publishSelectionSuccessor?: (
    successor: VnLastSoundCheckDeclarativeModSelectionV1,
    predecessor: VnLastSoundCheckDeclarativeModSelectionV1,
  ) => void | PromiseLike<void>;
  readonly resourceBudgetBytes?: number;
} = {}) {
  return createVnLastSoundCheckDeclarativeModManagerV1({
    applicationGeneration: "vn-last-sound-check.mod-selection-test",
    loadBaseTextPackBytes: loadBaseTextPackBytesV1,
    validateAsset: async () => {},
    ...(input.resourceBudgetBytes === undefined ? {} : {
      resourceBudgetBytes: input.resourceBudgetBytes,
    }),
    ...(input.publishSelectionSuccessor === undefined ? {} : {
      publishSelectionSuccessor: input.publishSelectionSuccessor,
    }),
  });
}

describe("One Last Sound Check declarative Mod selection", () => {
  it("enables, reloads, and disables complete selections through the successor publisher", async () => {
    const publications: {
      successor: VnLastSoundCheckDeclarativeModSelectionV1;
      predecessor: VnLastSoundCheckDeclarativeModSelectionV1;
    }[] = [];
    const manager = createManagerV1({
      publishSelectionSuccessor(successor, predecessor) {
        publications.push({ successor, predecessor });
      },
    });
    try {
      const first = await manager.enable([
        await artifactSourceV1({
          modId: "mod.vn-last-sound-check.copy",
          modVersion: "1.0.0",
        }),
      ]);
      expect(first.activeMods).toEqual([
        { modId: "mod.vn-last-sound-check.copy", version: "1.0.0" },
      ]);
      expect(first.textOverridesByRuntimePath.has(sharedChinesePathV1)).toBe(true);
      expect(publications).toHaveLength(0);

      const second = await manager.reload([
        await artifactSourceV1({
          modId: "mod.vn-last-sound-check.copy",
          modVersion: "1.1.0",
        }),
      ]);
      expect(second.activeMods[0]?.version).toBe("1.1.0");
      expect(publications).toEqual([{ successor: second, predecessor: first }]);

      const disabled = await manager.disable();
      expect(disabled.activeMods).toEqual([]);
      expect(disabled.textOverridesByRuntimePath.size).toBe(0);
      expect(disabled.assetOverridesByRuntimePath.size).toBe(0);
      expect(publications).toEqual([
        { successor: second, predecessor: first },
        { successor: disabled, predecessor: second },
      ]);
    } finally {
      await manager.dispose();
    }
  });

  it("keeps the exact predecessor when admission, slot compilation, or publication fails", async () => {
    const publish = vi.fn(async () => {});
    const manager = createManagerV1({ publishSelectionSuccessor: publish });
    try {
      const firstSource = await artifactSourceV1({
        modId: "mod.vn-last-sound-check.first",
        modVersion: "1.0.0",
      });
      const predecessor = await manager.enable([firstSource]);

      await expect(manager.reload([
        await artifactSourceV1({
          modId: "mod.vn-last-sound-check.wrong-target",
          modVersion: "1.0.0",
          target: { ...vnLastSoundCheckDeclarativeModTargetV1, storyRevision: 5 },
        }),
      ])).rejects.toMatchObject({ code: "declarative_mod.target_mismatch" });
      expect(manager.getCurrent()).toBe(predecessor);
      expect(publish).not.toHaveBeenCalled();

      await expect(manager.reload([
        firstSource,
        await artifactSourceV1({
          modId: "mod.vn-last-sound-check.collision",
          modVersion: "1.0.0",
        }),
      ])).rejects.toMatchObject({ code: "silly_mod.compile_failed" });
      expect(manager.getCurrent()).toBe(predecessor);
      expect(publish).not.toHaveBeenCalled();

      publish.mockRejectedValueOnce(new TypeError("application successor failed"));
      await expect(manager.reload([
        await artifactSourceV1({
          modId: "mod.vn-last-sound-check.first",
          modVersion: "1.1.0",
        }),
      ])).rejects.toMatchObject({ code: "silly_mod.publication_failed" });
      expect(manager.getCurrent()).toBe(predecessor);
      expect(publish).toHaveBeenCalledOnce();
    } finally {
      await manager.dispose();
    }
  });

  it("never lets a throwing observer reject initial or successor publication", async () => {
    const publish = vi.fn(async () => {});
    const manager = createManagerV1({ publishSelectionSuccessor: publish });
    const observer = vi.fn(() => {
      throw new TypeError("observer failed");
    });
    manager.subscribe(observer);
    try {
      const first = await manager.enable([
        await artifactSourceV1({
          modId: "mod.vn-last-sound-check.copy",
          modVersion: "1.0.0",
        }),
      ]);
      const second = await manager.reload([
        await artifactSourceV1({
          modId: "mod.vn-last-sound-check.copy",
          modVersion: "1.1.0",
        }),
      ]);
      expect(manager.getCurrent()).toBe(second);
      expect(second).not.toBe(first);
      expect(publish).toHaveBeenCalledOnce();
      expect(observer).toHaveBeenCalledTimes(2);
    } finally {
      await manager.dispose();
    }
  });

  it("stages multiple artifacts sequentially and rejects their aggregate byte budget atomically", async () => {
    const first = await artifactSourceV1({
      modId: "mod.vn-last-sound-check.first",
      modVersion: "1.0.0",
    });
    const second = await artifactSourceV1({
      modId: "mod.vn-last-sound-check.second",
      modVersion: "1.0.0",
    });
    const resourceBytes = (await first.readResource(artifactTextPathV1)).byteLength;
    const resourceBudgetBytes = first.manifestBytes.byteLength + resourceBytes +
      second.manifestBytes.byteLength + resourceBytes - 1;
    let activeReads = 0;
    let maximumActiveReads = 0;
    const readOrder: string[] = [];
    const tracked = (
      label: string,
      source: VnLastSoundCheckDeclarativeModArtifactSourceV1,
    ): VnLastSoundCheckDeclarativeModArtifactSourceV1 => ({
      manifestBytes: source.manifestBytes,
      async readResource(path) {
        activeReads += 1;
        maximumActiveReads = Math.max(maximumActiveReads, activeReads);
        try {
          await new Promise<void>((resolve) => queueMicrotask(resolve));
          readOrder.push(label);
          return await source.readResource(path);
        } finally {
          activeReads -= 1;
        }
      },
    });
    const publish = vi.fn(async () => {});
    const manager = createManagerV1({ resourceBudgetBytes, publishSelectionSuccessor: publish });
    try {
      const predecessor = await manager.enable([first]);
      await expect(manager.reload([
        tracked("first", first),
        tracked("second", second),
      ])).rejects.toMatchObject({
        code: "declarative_mod.resource_too_large",
        reference: "artifact-total",
      });
      expect(maximumActiveReads).toBe(1);
      expect(readOrder).toEqual(["first", "second"]);
      expect(manager.getCurrent()).toBe(predecessor);
      expect(publish).not.toHaveBeenCalled();
    } finally {
      await manager.dispose();
    }
  });

  it("cannot mutate authoritative State, History, or stored Save bytes", async () => {
    const application = await createVnLastSoundCheckApplicationInstanceV1();
    const manager = createManagerV1();
    try {
      await application.semantic.dispatch({
        kind: "invoke",
        actionId: "vn-last-sound-check.begin_story",
      } as never);
      const pending = application.semantic.observe().narrative.pending;
      if (pending === null || pending.kind !== "say") throw new TypeError("expected opening say");
      await application.semantic.dispatch({
        kind: "resolve",
        expectedOccurrenceId: pending.occurrenceId,
        resolution: { kind: "advance" },
      } as never);
      await expect(application.persistence.save("quick")).resolves.toMatchObject({
        kind: "saved",
      });

      const beforeSnapshot = application.admin.inspectForTest().snapshot;
      const beforeHistory = application.semantic.observe().narrative.history;
      const beforeDigest = application.admin.stateDigest();
      const beforeSave = await application.persistence.exportSave("quick");

      await manager.enable([
        await artifactSourceV1({
          modId: "mod.vn-last-sound-check.copy",
          modVersion: "1.0.0",
        }),
      ]);
      await manager.reload([
        await artifactSourceV1({
          modId: "mod.vn-last-sound-check.copy",
          modVersion: "1.1.0",
        }),
      ]);
      await manager.disable();

      expect(application.admin.inspectForTest().snapshot).toEqual(beforeSnapshot);
      expect(application.semantic.observe().narrative.history).toEqual(beforeHistory);
      expect(application.admin.stateDigest()).toBe(beforeDigest);
      expect(await application.persistence.exportSave("quick")).toEqual(beforeSave);
    } finally {
      await manager.dispose();
      await application.dispose();
    }
  });
});
