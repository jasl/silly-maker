// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";

import type {
  TextContentPackDescriptorV1,
  TextContentPackVariantDescriptorV1,
} from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import {
  admitVnLastSoundCheckDeclarativeModManifestV1,
  prepareVnLastSoundCheckDeclarativeModV1,
  vnLastSoundCheckDeclarativeModTargetV1,
  type VnLastSoundCheckDeclarativeModArtifactSourceV1,
} from "./declarative-overrides.ts";

const encoderV1 = new TextEncoder();
const sharedChineseSlotV1 = "text-pack.vn-last-sound-check.shared:zh-CN";
const controlRoomSlotV1 = "asset.vn-last-sound-check.background.control-room";

interface ManifestOverridesV1 {
  readonly target?: unknown;
  readonly textOverrides?: readonly { readonly slotId: string; readonly path: string }[];
  readonly assetOverrides?: readonly {
    readonly slotId: string;
    readonly path: string;
  }[];
}

function manifestBytesV1(overrides: ManifestOverridesV1 = {}): Uint8Array {
  return encoderV1.encode(JSON.stringify({
    format: "sillymaker.declarative-mod",
    version: 1,
    modId: "mod.vn-last-sound-check.softer-copy",
    modVersion: "1.2.0",
    target: overrides.target ?? vnLastSoundCheckDeclarativeModTargetV1,
    textOverrides: overrides.textOverrides ?? [{
      slotId: sharedChineseSlotV1,
      path: "content/shared.zh-CN.text-pack.json",
    }],
    assetOverrides: overrides.assetOverrides ?? [{
      slotId: controlRoomSlotV1,
      path: "images/control-room.webp",
    }],
  }));
}

async function runtimeBytesV1(runtimePath: string): Promise<Uint8Array> {
  return await readFile(new URL(runtimePath, new URL("../../", import.meta.url)));
}

async function editedSharedPackBytesV1(): Promise<Uint8Array> {
  const source = JSON.parse(
    new TextDecoder().decode(await runtimeBytesV1("assets/content/shared.zh-CN.text-pack.json")),
  ) as { entries: { textId: string; text: string }[] };
  source.entries[0] = { ...source.entries[0]!, text: "Mod 替换后的第一句。" };
  return encoderV1.encode(JSON.stringify(source));
}

function artifactSourceV1(input: {
  readonly manifestBytes?: Uint8Array;
  readonly resources: ReadonlyMap<string, Uint8Array>;
  readonly reads?: string[];
}): VnLastSoundCheckDeclarativeModArtifactSourceV1 {
  return {
    manifestBytes: input.manifestBytes ?? manifestBytesV1(),
    async readResource(path) {
      input.reads?.push(path);
      const bytes = input.resources.get(path);
      if (bytes === undefined) throw new TypeError(`resource missing:${path}`);
      return bytes;
    },
  };
}

async function loadBaseTextPackBytesV1(
  _descriptor: TextContentPackDescriptorV1,
  variant: TextContentPackVariantDescriptorV1,
): Promise<Uint8Array> {
  return await runtimeBytesV1(variant.runtimePath);
}

describe("One Last Sound Check declarative Mod admission", () => {
  it("strictly admits an exact target and named replacement slots", () => {
    expect(admitVnLastSoundCheckDeclarativeModManifestV1(manifestBytesV1())).toEqual({
      format: "sillymaker.declarative-mod",
      version: 1,
      modId: "mod.vn-last-sound-check.softer-copy",
      modVersion: "1.2.0",
      target: vnLastSoundCheckDeclarativeModTargetV1,
      textOverrides: [{
        slotId: sharedChineseSlotV1,
        path: "content/shared.zh-CN.text-pack.json",
      }],
      assetOverrides: [{
        slotId: controlRoomSlotV1,
        path: "images/control-room.webp",
      }],
    });
  });

  it("rejects target drift, empty artifacts, unknown slots, and duplicate slots", () => {
    expect(() =>
      admitVnLastSoundCheckDeclarativeModManifestV1(manifestBytesV1({
        target: { ...vnLastSoundCheckDeclarativeModTargetV1, storyRevision: 5 },
      }))
    ).toThrow(expect.objectContaining({ code: "declarative_mod.target_mismatch" }));
    expect(() =>
      admitVnLastSoundCheckDeclarativeModManifestV1(manifestBytesV1({
        textOverrides: [],
        assetOverrides: [],
      }))
    ).toThrow(expect.objectContaining({ code: "declarative_mod.manifest_shape_invalid" }));
    expect(() =>
      admitVnLastSoundCheckDeclarativeModManifestV1(manifestBytesV1({
        textOverrides: [{ slotId: "text-pack.unknown:zh-CN", path: "content/unknown.json" }],
      }))
    ).toThrow(expect.objectContaining({ code: "declarative_mod.slot_unknown" }));
    expect(() =>
      admitVnLastSoundCheckDeclarativeModManifestV1(manifestBytesV1({
        textOverrides: [
          { slotId: sharedChineseSlotV1, path: "content/first.json" },
          { slotId: sharedChineseSlotV1, path: "content/second.json" },
        ],
      }))
    ).toThrow(expect.objectContaining({ code: "declarative_mod.slot_duplicate" }));
  });

  it("lets the manifest resource budget, rather than a slot-count cap, admit arrays", () => {
    const repeatedOverrides = Array.from({ length: 65 }, (_, index) => ({
      slotId: sharedChineseSlotV1,
      path: `content/repeated-${String(index)}.json`,
    }));

    expect(() =>
      admitVnLastSoundCheckDeclarativeModManifestV1(manifestBytesV1({
        textOverrides: repeatedOverrides,
        assetOverrides: [],
      }))
    ).toThrow(expect.objectContaining({ code: "declarative_mod.slot_duplicate" }));
  });

  it("stages and validates every resource before returning detached bytes", async () => {
    const textBytes = await editedSharedPackBytesV1();
    const assetBytes = new Uint8Array([1, 2, 3, 4]);
    const reads: string[] = [];
    const validateAsset = vi.fn(async () => {});
    const prepared = await prepareVnLastSoundCheckDeclarativeModV1(
      artifactSourceV1({
        resources: new Map([
          ["content/shared.zh-CN.text-pack.json", textBytes],
          ["images/control-room.webp", assetBytes],
        ]),
        reads,
      }),
      { loadBaseTextPackBytes: loadBaseTextPackBytesV1, validateAsset },
    );

    textBytes.fill(0);
    assetBytes.fill(0);
    expect(reads).toEqual([
      "content/shared.zh-CN.text-pack.json",
      "images/control-room.webp",
    ]);
    expect(prepared.textOverrides).toHaveLength(1);
    expect(prepared.textOverrides[0]?.bytes[0]).not.toBe(0);
    expect(prepared.assetOverrides).toEqual([
      expect.objectContaining({
        slotId: controlRoomSlotV1,
        runtimePath: "assets/images/control-room.webp",
        mediaType: "image/webp",
        width: 1600,
        height: 900,
        bytes: new Uint8Array([1, 2, 3, 4]),
      }),
    ]);
    expect(validateAsset).toHaveBeenCalledOnce();
  });

  it("rejects a text catalog whose IDs differ and a resource that fails image admission", async () => {
    const mismatched = JSON.parse(
      new TextDecoder().decode(await editedSharedPackBytesV1()),
    ) as { entries: unknown[] };
    mismatched.entries.pop();
    const mismatchedBytes = encoderV1.encode(JSON.stringify(mismatched));
    const baseResources = new Map<string, Uint8Array>([
      ["content/shared.zh-CN.text-pack.json", mismatchedBytes],
      ["images/control-room.webp", new Uint8Array([1])],
    ]);

    await expect(prepareVnLastSoundCheckDeclarativeModV1(
      artifactSourceV1({ resources: baseResources }),
      { loadBaseTextPackBytes: loadBaseTextPackBytesV1, validateAsset: async () => {} },
    )).rejects.toMatchObject({ code: "declarative_mod.text_pack_entries_mismatch" });

    const validText = await editedSharedPackBytesV1();
    await expect(prepareVnLastSoundCheckDeclarativeModV1(
      artifactSourceV1({
        resources: new Map([
          ["content/shared.zh-CN.text-pack.json", validText],
          ["images/control-room.webp", new Uint8Array([1])],
        ]),
      }),
      {
        loadBaseTextPackBytes: loadBaseTextPackBytesV1,
        validateAsset: async () => {
          throw new TypeError("wrong dimensions");
        },
      },
    )).rejects.toMatchObject({ code: "declarative_mod.asset_invalid" });
  });
});
