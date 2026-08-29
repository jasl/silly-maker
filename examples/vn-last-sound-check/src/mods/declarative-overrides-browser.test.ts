// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";

import {
  createTextContentSessionV1,
  parsePositiveSafeInteger,
  type TextId,
} from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import { vnLastSoundCheckAssetIdsV1 } from "../content/assets.ts";
import { vnLastSoundCheckTextCatalogsV1 } from "../content/presentation.ts";
import {
  vnLastSoundCheckSharedTextPackIdV1,
  vnLastSoundCheckTextContentManifestV1,
} from "../content/text-content.ts";
import { createVnLastSoundCheckDeclarativeModManagerV1 } from "./declarative-override-selection.ts";
import {
  admitVnLastSoundCheckBrowserModSelectionV1,
  createVnLastSoundCheckModAssetLoaderV1,
  createVnLastSoundCheckModTextPackLoaderV1,
  loadVnLastSoundCheckBrowserModSourcesV1,
  type VnLastSoundCheckBrowserImageEnvironmentV1,
} from "./declarative-overrides-browser.ts";
import { vnLastSoundCheckDeclarativeModTargetV1 } from "./declarative-overrides.ts";

const encoderV1 = new TextEncoder();
const firstTextIdV1 = "text.vn-last-sound-check.shared.power-on.room" as TextId;
const replacementTextV1 = "这是同源声明式 Mod 替换后的开场。";
const sharedChinesePathV1 = "assets/content/shared.zh-CN.text-pack.json";
const controlRoomPathV1 = "assets/images/control-room.webp";

async function runtimeBytesV1(runtimePath: string): Promise<Uint8Array> {
  return await readFile(new URL(runtimePath, new URL("../../", import.meta.url)));
}

async function editedSharedPackBytesV1(): Promise<Uint8Array> {
  const source = JSON.parse(
    new TextDecoder().decode(await runtimeBytesV1(sharedChinesePathV1)),
  ) as { entries: { textId: string; text: string }[] };
  source.entries[0] = { ...source.entries[0]!, text: replacementTextV1 };
  return encoderV1.encode(JSON.stringify(source));
}

function responseV1(bytes: Uint8Array, status = 200): Response {
  return new Response(new Uint8Array(bytes).buffer, {
    status,
    headers: { "content-length": String(bytes.byteLength) },
  });
}

function createImageEnvironmentV1(): {
  readonly environment: VnLastSoundCheckBrowserImageEnvironmentV1;
  readonly createdUrls: string[];
  readonly revokedUrls: string[];
  readonly assignedSources: string[];
} {
  const createdUrls: string[] = [];
  const revokedUrls: string[] = [];
  const assignedSources: string[] = [];
  let sequence = 0;
  return {
    createdUrls,
    revokedUrls,
    assignedSources,
    environment: {
      resolveRuntimeUrl: (runtimePath) => `https://game.example.test/${runtimePath}`,
      createObjectUrl: () => {
        const url = `blob:vn-mod-${sequence += 1}`;
        createdUrls.push(url);
        return url;
      },
      revokeObjectUrl: (url) => revokedUrls.push(url),
      createImage: () => {
        let source = "";
        const image = {
          onload: null as HTMLImageElement["onload"],
          onerror: null as HTMLImageElement["onerror"],
          decode: vi.fn(async () => {}),
          naturalWidth: 1600,
          naturalHeight: 900,
          get src() {
            return source;
          },
          set src(value: string) {
            source = value;
            assignedSources.push(value);
            if (value !== "") {
              queueMicrotask(() =>
                image.onload?.call(
                  image as unknown as GlobalEventHandlers,
                  new Event("load"),
                )
              );
            }
          },
        };
        return image as unknown as HTMLImageElement;
      },
    },
  };
}

describe("One Last Sound Check Browser declarative Mods", () => {
  it("strictly admits only an explicit bounded selection file", () => {
    expect(admitVnLastSoundCheckBrowserModSelectionV1(encoderV1.encode(JSON.stringify({
      format: "sillymaker.declarative-mod-selection",
      version: 1,
      mods: [{ manifestPath: "gentle-copy/manifest.json" }],
    })))).toEqual({
      format: "sillymaker.declarative-mod-selection",
      version: 1,
      mods: [{ manifestPath: "gentle-copy/manifest.json" }],
    });
    expect(() =>
      admitVnLastSoundCheckBrowserModSelectionV1(encoderV1.encode(JSON.stringify({
        format: "sillymaker.declarative-mod-selection",
        version: 1,
        mods: [{ manifestPath: "../manifest.json" }],
      })))
    ).toThrow(expect.objectContaining({ code: "declarative_mod.resource_path_invalid" }));
  });

  it("loads explicit same-origin artifacts and makes selected text and image bytes visible", async () => {
    const selectionUrl = new URL("https://game.example.test/assets/mods/selection.json");
    const manifestUrl = new URL("gentle-copy/manifest.json", selectionUrl);
    const textUrl = new URL("content/shared.zh-CN.text-pack.json", manifestUrl);
    const imageUrl = new URL("images/control-room.webp", manifestUrl);
    const selectionBytes = encoderV1.encode(JSON.stringify({
      format: "sillymaker.declarative-mod-selection",
      version: 1,
      mods: [{ manifestPath: "gentle-copy/manifest.json" }],
    }));
    const manifestBytes = encoderV1.encode(JSON.stringify({
      format: "sillymaker.declarative-mod",
      version: 1,
      modId: "mod.vn-last-sound-check.gentle-copy",
      modVersion: "1.0.0",
      target: vnLastSoundCheckDeclarativeModTargetV1,
      textOverrides: [{
        slotId: "text-pack.vn-last-sound-check.shared:zh-CN",
        path: "content/shared.zh-CN.text-pack.json",
      }],
      assetOverrides: [{
        slotId: vnLastSoundCheckAssetIdsV1.controlRoom,
        path: "images/control-room.webp",
      }],
    }));
    const resourceByUrl = new Map<string, Uint8Array>([
      [selectionUrl.href, selectionBytes],
      [manifestUrl.href, manifestBytes],
      [textUrl.href, await editedSharedPackBytesV1()],
      [imageUrl.href, new Uint8Array([82, 73, 70, 70])],
    ]);
    const fetchV1 = vi.fn(async (url: URL) => {
      const bytes = resourceByUrl.get(url.href);
      return bytes === undefined ? responseV1(new Uint8Array([1]), 404) : responseV1(bytes);
    });
    const image = createImageEnvironmentV1();
    const sources = await loadVnLastSoundCheckBrowserModSourcesV1({
      selectionUrl,
      fetch: fetchV1,
    });
    const manager = createVnLastSoundCheckDeclarativeModManagerV1({
      applicationGeneration: "vn-last-sound-check.browser-mod-test",
      loadBaseTextPackBytes: (_descriptor, variant) => runtimeBytesV1(variant.runtimePath),
      validateAsset: async () => {},
    });
    try {
      const selected = await manager.enable(sources);
      expect(fetchV1.mock.calls.map(([url]) => url.href)).toEqual([
        selectionUrl.href,
        manifestUrl.href,
        textUrl.href,
        imageUrl.href,
      ]);

      const selectedText = createTextContentSessionV1({
        manifest: vnLastSoundCheckTextContentManifestV1,
        bootstrapCatalogs: vnLastSoundCheckTextCatalogsV1.catalogs,
        loadPackBytes: createVnLastSoundCheckModTextPackLoaderV1(
          selected,
          (_descriptor, variant) => runtimeBytesV1(variant.runtimePath),
        ),
      });
      const selectedTextLease = await selectedText.acquire(vnLastSoundCheckSharedTextPackIdV1);
      try {
        expect(selectedText.resolveText(firstTextIdV1)).toBe(replacementTextV1);
      } finally {
        selectedTextLease.release();
        selectedText.dispose();
      }

      const selectedAsset = createVnLastSoundCheckModAssetLoaderV1(
        selected,
        image.environment,
      );
      try {
        await expect(selectedAsset.load({
          runtimePath: controlRoomPathV1,
          mediaType: "image/webp",
          width: parsePositiveSafeInteger(1600),
          height: parsePositiveSafeInteger(900),
        }, new AbortController().signal)).resolves.toEqual({
          kind: "loaded",
          url: "blob:vn-mod-1",
        });
        expect(image.assignedSources).toContain("blob:vn-mod-1");
      } finally {
        selectedAsset.dispose();
      }
      expect(image.revokedUrls).toEqual(["blob:vn-mod-1"]);

      const disabled = await manager.disable();
      const baseText = createTextContentSessionV1({
        manifest: vnLastSoundCheckTextContentManifestV1,
        bootstrapCatalogs: vnLastSoundCheckTextCatalogsV1.catalogs,
        loadPackBytes: createVnLastSoundCheckModTextPackLoaderV1(
          disabled,
          (_descriptor, variant) => runtimeBytesV1(variant.runtimePath),
        ),
      });
      const baseTextLease = await baseText.acquire(vnLastSoundCheckSharedTextPackIdV1);
      try {
        expect(baseText.resolveText(firstTextIdV1)).not.toBe(replacementTextV1);
      } finally {
        baseTextLease.release();
        baseText.dispose();
      }
      const baseAsset = createVnLastSoundCheckModAssetLoaderV1(disabled, image.environment);
      try {
        await expect(baseAsset.load({
          runtimePath: controlRoomPathV1,
          mediaType: "image/webp",
          width: parsePositiveSafeInteger(1600),
          height: parsePositiveSafeInteger(900),
        }, new AbortController().signal)).resolves.toEqual({
          kind: "loaded",
          url: `https://game.example.test/${controlRoomPathV1}`,
        });
      } finally {
        baseAsset.dispose();
      }
    } finally {
      await manager.dispose();
    }
  });

  it("treats only an absent selection file as an empty explicit selection", async () => {
    const selectionUrl = new URL("https://game.example.test/assets/mods/selection.json");
    const missing = vi.fn(async () => responseV1(new Uint8Array([1]), 404));
    await expect(loadVnLastSoundCheckBrowserModSourcesV1({
      selectionUrl,
      fetch: missing,
    })).resolves.toEqual([]);
    expect(missing).toHaveBeenCalledExactlyOnceWith(selectionUrl, { cache: "no-store" });

    const invalid = vi.fn(async () => responseV1(new Uint8Array([1]), 500));
    await expect(loadVnLastSoundCheckBrowserModSourcesV1({
      selectionUrl,
      fetch: invalid,
    })).rejects.toMatchObject({ code: "declarative_mod.resource_load_failed" });
  });
});
