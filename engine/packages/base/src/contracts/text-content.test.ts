// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { digestBytes } from "./digest.ts";
import { parseLocaleId, parseTextId } from "./presentation-ids.ts";
import { parseTextCatalogSetV1 } from "./text-catalog.ts";
import {
  admitTextContentPackV1,
  createTextContentSessionV1,
  defineTextContentManifestV1,
  parseTextContentPackIdV1,
} from "./text-content.ts";
import type { TextCatalogSetV1 } from "./text-catalog.ts";

const encoder = new TextEncoder();

function catalogsV1(input: {
  readonly en?: Readonly<Record<string, string>>;
  readonly zh?: Readonly<Record<string, string>>;
}): TextCatalogSetV1 {
  return parseTextCatalogSetV1({
    defaultLocale: "en",
    catalogs: [
      {
        locale: "en",
        fallbackLocale: null,
        entries: Object.entries(input.en ?? {}).map(([textId, text]) => ({ textId, text })),
      },
      {
        locale: "zh-CN",
        fallbackLocale: "en",
        entries: Object.entries(input.zh ?? {}).map(([textId, text]) => ({ textId, text })),
      },
    ],
  });
}

function packBytesV1(packId: string, textCatalogs: TextCatalogSetV1): Uint8Array {
  return encoder.encode(JSON.stringify({
    format: "sillymaker.text-content-pack",
    version: 1,
    packId,
    textCatalogs,
  }));
}

function descriptorInputV1(packId: string, bytes: Uint8Array, entryCount: number) {
  return {
    packId,
    runtimePath: `assets/${packId}.json`,
    byteLength: bytes.byteLength,
    sha256: digestBytes(bytes),
    entryCount,
  };
}

describe("text content manifest", () => {
  it("parses stable pack IDs and defines a frozen, order-normalized identity", () => {
    expect(parseTextContentPackIdV1("text.chapter-one")).toBe("text.chapter-one");
    expect(() => parseTextContentPackIdV1("chapter one")).toThrow("invalid TextContentPackIdV1");

    const alphaBytes = packBytesV1("text.alpha", catalogsV1({ en: { "text.alpha": "A" } }));
    const betaBytes = packBytesV1("text.beta", catalogsV1({ en: { "text.beta": "B" } }));
    const alpha = descriptorInputV1("text.alpha", alphaBytes, 1);
    const beta = descriptorInputV1("text.beta", betaBytes, 1);
    const manifest = defineTextContentManifestV1({ revision: 1, packs: [beta, alpha] });
    const reordered = defineTextContentManifestV1({ revision: 1, packs: [alpha, beta] });

    expect(manifest.packs.map((pack) => pack.packId)).toEqual(["text.alpha", "text.beta"]);
    expect(manifest.digest).toBe(reordered.digest);
    expect(
      defineTextContentManifestV1({
        revision: 1,
        packs: [{ ...alpha, runtimePath: "assets/alternate/text.alpha.json" }],
      }).digest,
    ).not.toBe(defineTextContentManifestV1({ revision: 1, packs: [alpha] }).digest);
    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.isFrozen(manifest.packs)).toBe(true);
    expect(manifest.packs.every(Object.isFrozen)).toBe(true);
    expect(() => defineTextContentManifestV1({ revision: 1, packs: [alpha, alpha] })).toThrow(
      "text_content.manifest_pack_duplicate:text.alpha",
    );
    for (
      const runtimePath of [
        "/assets/text.alpha.json",
        "assets\\text.alpha.json",
        "assets/text.alpha.json?revision=1",
        "assets/text.alpha.json#pack",
        "assets/../text.alpha.json",
        "assets//text.alpha.json",
      ]
    ) {
      expect(() =>
        defineTextContentManifestV1({
          revision: 1,
          packs: [{ ...alpha, runtimePath }],
        })
      ).toThrow("text_content.manifest_invalid:0");
    }
  });
});

describe("text content pack admission", () => {
  it("admits the exact wire shape after length, SHA, strict JSON, and catalog checks", () => {
    const catalogs = catalogsV1({
      en: { "text.chapter.greeting": "Hello" },
      zh: { "text.chapter.greeting": "你好" },
    });
    const bytes = packBytesV1("text.chapter", catalogs);
    const manifest = defineTextContentManifestV1({
      revision: 1,
      packs: [descriptorInputV1("text.chapter", bytes, 2)],
    });
    const pack = admitTextContentPackV1(manifest.packs[0]!, bytes);

    expect(pack).toMatchObject({
      format: "sillymaker.text-content-pack",
      version: 1,
      packId: "text.chapter",
      entryCount: 2,
    });
    expect(Object.isFrozen(pack)).toBe(true);
    expect(Object.isFrozen(pack.textCatalogs)).toBe(true);
  });

  it("rejects length and digest mismatches before parsing", () => {
    const bytes = packBytesV1("text.chapter", catalogsV1({ en: { "text.chapter.a": "A" } }));
    const manifest = defineTextContentManifestV1({
      revision: 1,
      packs: [descriptorInputV1("text.chapter", bytes, 1)],
    });
    const descriptor = manifest.packs[0]!;
    expect(() => admitTextContentPackV1(descriptor, bytes.slice(1))).toThrow(
      "text_content.pack_length_mismatch:text.chapter",
    );
    const changed = bytes.slice();
    changed[changed.length - 2] = changed[changed.length - 2] === 65 ? 66 : 65;
    expect(() => admitTextContentPackV1(descriptor, changed)).toThrow(
      "text_content.pack_digest_mismatch:text.chapter",
    );
  });

  it("rejects duplicate-key JSON, non-exact documents, identity drift, and bad counts", () => {
    const duplicateKey = encoder.encode(
      '{"format":"sillymaker.text-content-pack","format":"sillymaker.text-content-pack","version":1,"packId":"text.chapter","textCatalogs":{}}',
    );
    const duplicateDescriptor = defineTextContentManifestV1({
      revision: 1,
      packs: [descriptorInputV1("text.chapter", duplicateKey, 0)],
    }).packs[0]!;
    expect(() => admitTextContentPackV1(duplicateDescriptor, duplicateKey)).toThrow(
      "text_content.pack_json_invalid:object.duplicate_key",
    );

    const catalogs = catalogsV1({ en: { "text.chapter.a": "A" } });
    const extraKey = encoder.encode(JSON.stringify({
      format: "sillymaker.text-content-pack",
      version: 1,
      packId: "text.chapter",
      textCatalogs: catalogs,
      source: "forbidden",
    }));
    const extraDescriptor = defineTextContentManifestV1({
      revision: 1,
      packs: [descriptorInputV1("text.chapter", extraKey, 1)],
    }).packs[0]!;
    expect(() => admitTextContentPackV1(extraDescriptor, extraKey)).toThrow(
      "text_content.pack_shape_invalid:text.chapter",
    );

    const foreignBytes = packBytesV1("text.foreign", catalogs);
    const foreignDescriptor = defineTextContentManifestV1({
      revision: 1,
      packs: [descriptorInputV1("text.chapter", foreignBytes, 1)],
    }).packs[0]!;
    expect(() => admitTextContentPackV1(foreignDescriptor, foreignBytes)).toThrow(
      "text_content.pack_identity_mismatch:text.chapter",
    );

    const validBytes = packBytesV1("text.chapter", catalogs);
    const countDescriptor = defineTextContentManifestV1({
      revision: 1,
      packs: [descriptorInputV1("text.chapter", validBytes, 2)],
    }).packs[0]!;
    expect(() => admitTextContentPackV1(countDescriptor, validBytes)).toThrow(
      "text_content.pack_entry_count_mismatch:text.chapter",
    );
  });
});

describe("text content session", () => {
  it("single-flights loading, resolves fallback text, and keeps successful ensure idempotent", async () => {
    const bootstrap = catalogsV1({ en: { "text.bootstrap": "Bootstrap" } });
    const chapterCatalogs = catalogsV1({ en: { "text.chapter.line": "Chapter" } });
    const chapterBytes = packBytesV1("text.chapter", chapterCatalogs);
    const manifest = defineTextContentManifestV1({
      revision: 1,
      packs: [descriptorInputV1("text.chapter", chapterBytes, 1)],
    });
    let release!: (bytes: Uint8Array) => void;
    const pending = new Promise<Uint8Array>((resolve) => release = resolve);
    const loadPackBytes = vi.fn(() => pending);
    const session = createTextContentSessionV1({
      manifest,
      bootstrapCatalogs: bootstrap,
      loadPackBytes,
    });
    const chapterId = parseTextContentPackIdV1("text.chapter");

    expect(session.loadedEntryCount()).toBe(0);
    expect(session.loadedPackIds()).toEqual([]);
    expect(session.resolveText(parseLocaleId("zh-CN"), parseTextId("text.bootstrap"))).toBe(
      "Bootstrap",
    );
    const first = session.ensure(chapterId);
    const second = session.ensure(chapterId);
    expect(second).toBe(first);
    expect(loadPackBytes).toHaveBeenCalledTimes(1);
    expect(loadPackBytes).toHaveBeenCalledWith(manifest.packs[0]);
    await expect(session.ensure(parseTextContentPackIdV1("text.unknown"))).rejects.toThrow(
      "text_content.pack_unknown:text.unknown",
    );
    expect(loadPackBytes).toHaveBeenCalledTimes(1);
    expect(() => session.resolveText(parseLocaleId("en"), parseTextId("text.chapter.line")))
      .toThrow("text_content.text_unavailable:text.chapter.line");

    release(chapterBytes);
    await expect(first).resolves.toBeUndefined();
    await expect(session.ensure(chapterId)).resolves.toBeUndefined();
    expect(loadPackBytes).toHaveBeenCalledTimes(1);
    expect(session.loadedPackIds()).toEqual(["text.chapter"]);
    expect(session.loadedEntryCount()).toBe(1);
    expect(session.resolveText(parseLocaleId("zh-CN"), parseTextId("text.chapter.line"))).toBe(
      "Chapter",
    );
  });

  it("atomically rejects topology and cross-pack/bootstrap identity conflicts", async () => {
    const bootstrap = catalogsV1({ en: { "text.bootstrap": "Original" } });
    const firstCatalogs = catalogsV1({ en: { "text.first.line": "First" } });
    const duplicateCatalogs = catalogsV1({
      en: { "text.first.line": "Replacement", "text.duplicate.extra": "Extra" },
    });
    const bootstrapDuplicateCatalogs = catalogsV1({
      en: { "text.bootstrap": "Replacement bootstrap" },
    });
    const wrongTopology = parseTextCatalogSetV1({
      defaultLocale: "en",
      catalogs: [{
        locale: "en",
        fallbackLocale: null,
        entries: [{ textId: "text.lone", text: "Lone" }],
      }],
    });
    const sources = new Map<string, Uint8Array>([
      ["text.first", packBytesV1("text.first", firstCatalogs)],
      ["text.cross-duplicate", packBytesV1("text.cross-duplicate", duplicateCatalogs)],
      [
        "text.bootstrap-duplicate",
        packBytesV1("text.bootstrap-duplicate", bootstrapDuplicateCatalogs),
      ],
      ["text.topology", packBytesV1("text.topology", wrongTopology)],
    ]);
    const manifest = defineTextContentManifestV1({
      revision: 1,
      packs: [
        descriptorInputV1("text.first", sources.get("text.first")!, 1),
        descriptorInputV1("text.cross-duplicate", sources.get("text.cross-duplicate")!, 2),
        descriptorInputV1("text.bootstrap-duplicate", sources.get("text.bootstrap-duplicate")!, 1),
        descriptorInputV1("text.topology", sources.get("text.topology")!, 1),
      ],
    });
    const session = createTextContentSessionV1({
      manifest,
      bootstrapCatalogs: bootstrap,
      loadPackBytes: (descriptor) => Promise.resolve(sources.get(descriptor.packId)!),
    });

    await session.ensure(parseTextContentPackIdV1("text.first"));
    const beforeIds = session.loadedPackIds();
    const beforeCount = session.loadedEntryCount();
    await expect(session.ensure(parseTextContentPackIdV1("text.cross-duplicate"))).rejects
      .toThrow("text_content.text_id_duplicate:text.first.line");
    await expect(session.ensure(parseTextContentPackIdV1("text.bootstrap-duplicate"))).rejects
      .toThrow("text_content.text_id_duplicate:text.bootstrap");
    await expect(session.ensure(parseTextContentPackIdV1("text.topology"))).rejects
      .toThrow("text_content.locale_topology_mismatch:text.topology");
    expect(session.loadedPackIds()).toEqual(beforeIds);
    expect(session.loadedEntryCount()).toBe(beforeCount);
    expect(session.resolveText(parseLocaleId("en"), parseTextId("text.bootstrap"))).toBe(
      "Original",
    );
    expect(session.resolveText(parseLocaleId("en"), parseTextId("text.first.line"))).toBe(
      "First",
    );
  });

  it("does not publish corrupt loads and permits a clean retry", async () => {
    const bootstrap = catalogsV1({});
    const catalogs = catalogsV1({ en: { "text.retry.line": "Recovered" } });
    const bytes = packBytesV1("text.retry", catalogs);
    const corrupt = bytes.slice();
    corrupt[corrupt.length - 2] = corrupt[corrupt.length - 2] === 65 ? 66 : 65;
    const manifest = defineTextContentManifestV1({
      revision: 1,
      packs: [descriptorInputV1("text.retry", bytes, 1)],
    });
    const loadPackBytes = vi.fn()
      .mockRejectedValueOnce(new Error("missing"))
      .mockResolvedValueOnce(corrupt)
      .mockResolvedValueOnce(bytes);
    const session = createTextContentSessionV1({
      manifest,
      bootstrapCatalogs: bootstrap,
      loadPackBytes,
    });
    const packId = parseTextContentPackIdV1("text.retry");

    await expect(session.ensure(packId)).rejects.toThrow(
      "text_content.pack_load_failed:text.retry",
    );
    expect(session.loadedPackIds()).toEqual([]);
    expect(session.loadedEntryCount()).toBe(0);
    await expect(session.ensure(packId)).rejects.toThrow(
      "text_content.pack_digest_mismatch:text.retry",
    );
    expect(session.loadedPackIds()).toEqual([]);
    expect(session.loadedEntryCount()).toBe(0);
    await expect(session.ensure(packId)).resolves.toBeUndefined();
    expect(loadPackBytes).toHaveBeenCalledTimes(3);
    expect(session.resolveText(parseLocaleId("en"), parseTextId("text.retry.line"))).toBe(
      "Recovered",
    );
  });
});
