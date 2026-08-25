// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { parseLocaleId, parseTextId } from "./presentation-ids.ts";
import {
  admitTextContentPackV1,
  createTextContentSessionV1,
  defineTextContentManifestV1,
  parseTextContentPackIdV1,
  textContentPackJsonLimitsV1,
} from "./text-content.ts";
import type {
  TextContentBootstrapCatalogV1,
  TextContentManifestV1,
  TextContentPackDescriptorV1,
  TextContentPackVariantDescriptorV1,
} from "./text-content.ts";

const encoder = new TextEncoder();

const localeInputsV1 = [
  { locale: "en", fallbackLocale: null },
  { locale: "ja", fallbackLocale: "en" },
  { locale: "zh-CN", fallbackLocale: "en" },
] as const;

function variantInputV1(packId: string, locale: string) {
  return {
    locale,
    runtimePath: `assets/text/${locale}/${packId}.json`,
  };
}

function descriptorInputV1(packId: string, locales: readonly string[] = ["en", "zh-CN"]) {
  return {
    packId,
    variants: locales.map((locale) => variantInputV1(packId, locale)),
  };
}

function manifestV1(
  packs: readonly ReturnType<typeof descriptorInputV1>[],
): TextContentManifestV1 {
  return defineTextContentManifestV1({
    revision: 1,
    defaultLocale: "en",
    locales: localeInputsV1,
    packs,
  });
}

function packBytesV2(
  packId: string,
  locale: string,
  entries: Readonly<Record<string, string>>,
): Uint8Array {
  return encoder.encode(JSON.stringify({
    format: "sillymaker.text-content-pack",
    version: 2,
    packId,
    locale,
    entries: Object.entries(entries).map(([textId, text]) => ({ textId, text })),
  }));
}

function bootstrapCatalogsV1(input: {
  readonly en?: Readonly<Record<string, string>>;
  readonly ja?: Readonly<Record<string, string>>;
  readonly zh?: Readonly<Record<string, string>>;
}): readonly TextContentBootstrapCatalogV1[] {
  const catalogs: readonly (readonly [
    string,
    Readonly<Record<string, string>> | undefined,
  ])[] = [
    ["en", input.en],
    ["ja", input.ja],
    ["zh-CN", input.zh],
  ];
  return catalogs.flatMap(([locale, entries]) =>
    entries === undefined ? [] : [{
      locale,
      entries: Object.entries(entries).map(([textId, text]) => ({ textId, text })),
    }]
  );
}

function variantForV1(
  manifest: TextContentManifestV1,
  packId: string,
  locale: string,
): readonly [TextContentPackDescriptorV1, TextContentPackVariantDescriptorV1] {
  const pack = manifest.packs.find((candidate) => candidate.packId === packId)!;
  return [pack, pack.variants.find((candidate) => candidate.locale === locale)!];
}

function sourceKeyV1(
  pack: TextContentPackDescriptorV1,
  variant: TextContentPackVariantDescriptorV1,
): string {
  return `${pack.packId}:${variant.locale}`;
}

function deferredV1<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("text content manifest", () => {
  it("normalizes locale, variant, and pack topology into one stable identity", () => {
    expect(parseTextContentPackIdV1("text.chapter-one")).toBe("text.chapter-one");
    expect(() => parseTextContentPackIdV1("chapter one")).toThrow(
      "invalid TextContentPackIdV1",
    );

    const alpha = descriptorInputV1("text.alpha", ["zh-CN", "en"]);
    const beta = descriptorInputV1("text.beta", ["en"]);
    const manifest = defineTextContentManifestV1({
      revision: 1,
      defaultLocale: "en",
      locales: localeInputsV1.toReversed(),
      packs: [beta, alpha],
    });
    const reordered = defineTextContentManifestV1({
      revision: 1,
      defaultLocale: "en",
      locales: localeInputsV1,
      packs: [alpha, beta],
    });

    expect(manifest.locales.map((locale) => locale.locale)).toEqual(["en", "ja", "zh-CN"]);
    expect(manifest.packs.map((pack) => pack.packId)).toEqual(["text.alpha", "text.beta"]);
    expect(manifest.packs[0]?.variants.map((variant) => variant.locale)).toEqual([
      "en",
      "zh-CN",
    ]);
    expect(manifest.digest).toBe(reordered.digest);
    expect(
      defineTextContentManifestV1({
        revision: 1,
        defaultLocale: "en",
        locales: localeInputsV1,
        packs: [{
          ...alpha,
          variants: [
            variantInputV1("text.alpha", "en"),
            {
              locale: "zh-CN",
              runtimePath: "assets/alternate/text.alpha.zh-CN.json",
            },
          ],
        }],
      }).digest,
    ).not.toBe(manifestV1([alpha]).digest);
  });

  it("rejects invalid topology, missing default variants, duplicate packs, and unsafe paths", () => {
    const alpha = descriptorInputV1("text.alpha", ["en"]);
    expect(() => manifestV1([alpha, alpha])).toThrow(
      "text_content.manifest_pack_duplicate:text.alpha",
    );
    expect(() => manifestV1([descriptorInputV1("text.alpha", ["zh-CN"])]))
      .toThrow("text_content.manifest_invalid:defaultVariant:text.alpha");
    expect(() => manifestV1([descriptorInputV1("text.alpha", ["en", "en"])]))
      .toThrow("text_content.manifest_invalid:variant:text.alpha:en");
    expect(() => manifestV1([descriptorInputV1("text.alpha", ["en", "fr"])]))
      .toThrow("text_content.manifest_invalid:packs/0/variants/1");
    expect(() =>
      defineTextContentManifestV1({
        revision: 1,
        defaultLocale: "en",
        locales: [
          { locale: "en", fallbackLocale: null },
          { locale: "ja", fallbackLocale: "zh-CN" },
          { locale: "zh-CN", fallbackLocale: "ja" },
        ],
        packs: [],
      })
    ).toThrow("text_content.manifest_invalid:fallback:ja");

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
        manifestV1([{
          packId: "text.alpha",
          variants: [{ locale: "en", runtimePath }],
        }])
      ).toThrow("text_content.manifest_invalid:packs/0/variants/0");
    }
  });
});

describe("text content pack admission", () => {
  it("admits one exact bounded locale variant directly into a text map", () => {
    const manifest = manifestV1([descriptorInputV1("text.chapter")]);
    const [pack, variant] = variantForV1(manifest, "text.chapter", "zh-CN");
    const admitted = admitTextContentPackV1(
      pack,
      variant,
      packBytesV2("text.chapter", "zh-CN", {
        "text.chapter.greeting": "你好",
        "text.chapter.farewell": "再见",
      }),
    );

    expect(admitted).toMatchObject({
      format: "sillymaker.text-content-pack",
      version: 2,
      packId: "text.chapter",
      locale: "zh-CN",
      entryCount: 2,
    });
    expect([...admitted.entries]).toEqual([
      ["text.chapter.greeting", "你好"],
      ["text.chapter.farewell", "再见"],
    ]);
  });

  it("keeps direct translation edits outside manifest identity", () => {
    const manifest = manifestV1([descriptorInputV1("text.chapter", ["en"])]);
    const [pack, variant] = variantForV1(manifest, "text.chapter", "en");
    const original = admitTextContentPackV1(
      pack,
      variant,
      packBytesV2("text.chapter", "en", { "text.chapter.a": "A" }),
    );
    const edited = admitTextContentPackV1(
      pack,
      variant,
      packBytesV2("text.chapter", "en", {
        "text.chapter.a": "Localized",
        "text.chapter.b": "Added",
      }),
    );

    expect(original.entryCount).toBe(1);
    expect(edited.entryCount).toBe(2);
    expect(manifest.digest).toBe(manifestV1([descriptorInputV1("text.chapter", ["en"])]).digest);
  });

  it("rejects resource excess, duplicate keys, non-exact shape, and identity drift", () => {
    const manifest = manifestV1([descriptorInputV1("text.chapter")]);
    const [pack, variant] = variantForV1(manifest, "text.chapter", "en");
    expect(() =>
      admitTextContentPackV1(
        pack,
        variant,
        new Uint8Array(Number(textContentPackJsonLimitsV1.maxBytes) + 1),
      )
    ).toThrow("text_content.pack_json_invalid:limit.bytes");

    const duplicateKey = encoder.encode(
      '{"format":"sillymaker.text-content-pack","format":"sillymaker.text-content-pack","version":2,"packId":"text.chapter","locale":"en","entries":[]}',
    );
    expect(() => admitTextContentPackV1(pack, variant, duplicateKey)).toThrow(
      "text_content.pack_json_invalid:object.duplicate_key",
    );
    const extraKey = encoder.encode(JSON.stringify({
      format: "sillymaker.text-content-pack",
      version: 2,
      packId: "text.chapter",
      locale: "en",
      entries: [],
      source: "forbidden",
    }));
    expect(() => admitTextContentPackV1(pack, variant, extraKey)).toThrow(
      "text_content.pack_shape_invalid:text.chapter",
    );
    expect(() =>
      admitTextContentPackV1(
        pack,
        variant,
        packBytesV2("text.foreign", "en", {}),
      )
    ).toThrow("text_content.pack_identity_mismatch:text.chapter:en");
    expect(() =>
      admitTextContentPackV1(
        pack,
        variant,
        packBytesV2("text.chapter", "zh-CN", {}),
      )
    ).toThrow("text_content.pack_identity_mismatch:text.chapter:en");
    const duplicateEntry = encoder.encode(JSON.stringify({
      format: "sillymaker.text-content-pack",
      version: 2,
      packId: "text.chapter",
      locale: "en",
      entries: [
        { textId: "text.chapter.a", text: "A" },
        { textId: "text.chapter.a", text: "Again" },
      ],
    }));
    expect(() => admitTextContentPackV1(pack, variant, duplicateEntry)).toThrow(
      "text_content.text_id_duplicate:text.chapter.a",
    );
  });
});

describe("text content session", () => {
  it("single-flights the active locale and returns independent logical leases", async () => {
    const manifest = manifestV1([descriptorInputV1("text.chapter")]);
    const pending = deferredV1<Uint8Array>();
    const loadPackBytes = vi.fn(
      (_pack: TextContentPackDescriptorV1, _variant: TextContentPackVariantDescriptorV1) =>
        pending.promise,
    );
    const session = createTextContentSessionV1({
      manifest,
      bootstrapCatalogs: bootstrapCatalogsV1({
        en: { "text.bootstrap": "Bootstrap" },
        zh: { "text.bootstrap": "启动" },
      }),
      loadPackBytes,
    });
    const packId = parseTextContentPackIdV1("text.chapter");

    expect(session.currentLocale()).toBe("en");
    expect(session.resolveText(parseTextId("text.bootstrap"))).toBe("Bootstrap");
    const first = session.acquire(packId);
    const second = session.acquire(packId);
    expect(loadPackBytes).toHaveBeenCalledTimes(1);
    expect(loadPackBytes.mock.calls[0]?.[1].locale).toBe("en");
    await expect(session.acquire(parseTextContentPackIdV1("text.unknown"))).rejects.toThrow(
      "text_content.pack_unknown:text.unknown",
    );

    pending.resolve(packBytesV2("text.chapter", "en", { "text.chapter.line": "Chapter" }));
    const [firstLease, secondLease] = await Promise.all([first, second]);
    expect(firstLease).not.toBe(secondLease);
    expect(firstLease.generation).toBe(manifest.digest);
    expect(firstLease.timing.totalMs).toBeGreaterThanOrEqual(0);
    expect(session.loadedPackIds()).toEqual(["text.chapter"]);
    expect(session.loadedVariantCount()).toBe(1);
    expect(session.loadedEntryCount()).toBe(1);
    expect(session.resolveText(parseTextId("text.chapter.line"))).toBe("Chapter");

    firstLease.release();
    firstLease.release();
    expect(session.loadedPackIds()).toEqual(["text.chapter"]);
    secondLease.release();
    expect(session.loadedPackIds()).toEqual([]);
    expect(session.loadedVariantCount()).toBe(0);
    expect(session.loadedEntryCount()).toBe(0);
    expect(() => session.resolveText(parseTextId("text.chapter.line"))).toThrow(
      "text_content.text_unavailable:text.chapter.line",
    );
  });

  it("loads only demanded fallback variants and replaces the locale owner atomically", async () => {
    const manifest = manifestV1([
      descriptorInputV1("text.chapter", ["en", "zh-CN"]),
      descriptorInputV1("text.cold", ["en", "ja", "zh-CN"]),
    ]);
    const sources = new Map<string, Uint8Array>([
      [
        "text.chapter:en",
        packBytesV2("text.chapter", "en", {
          "text.chapter.a": "English A",
          "text.chapter.b": "English B",
        }),
      ],
      [
        "text.chapter:zh-CN",
        packBytesV2("text.chapter", "zh-CN", { "text.chapter.a": "中文 A" }),
      ],
    ]);
    const loadPackBytes = vi.fn(
      (pack: TextContentPackDescriptorV1, variant: TextContentPackVariantDescriptorV1) =>
        Promise.resolve(sources.get(sourceKeyV1(pack, variant))!),
    );
    let clock = 0;
    const session = createTextContentSessionV1({
      manifest,
      bootstrapCatalogs: bootstrapCatalogsV1({
        en: { "text.bootstrap": "English bootstrap" },
        zh: { "text.bootstrap": "中文启动" },
      }),
      loadPackBytes,
      now: () => clock++,
    });
    const lease = await session.acquire(parseTextContentPackIdV1("text.chapter"));

    await expect(session.activateLocale(parseLocaleId("zh-CN"))).resolves.toBe(true);
    expect(session.currentLocale()).toBe("zh-CN");
    expect(session.resolveText(parseTextId("text.bootstrap"))).toBe("中文启动");
    expect(session.resolveText(parseTextId("text.chapter.a"))).toBe("中文 A");
    expect(session.resolveText(parseTextId("text.chapter.b"))).toBe("English B");
    expect(session.loadedVariantCount()).toBe(2);
    expect(session.loadedEntryCount()).toBe(3);
    const observerLease = await session.acquire(parseTextContentPackIdV1("text.chapter"));
    expect(observerLease.timing.loadMs).toBe(1);
    expect(observerLease.timing.admitMs).toBe(1);
    observerLease.release();
    expect(loadPackBytes.mock.calls.map(([, variant]) => variant.locale)).toEqual([
      "en",
      "zh-CN",
    ]);
    expect(loadPackBytes.mock.calls.every(([pack]) => pack.packId === "text.chapter")).toBe(true);

    await expect(session.activateLocale(parseLocaleId("ja"))).resolves.toBe(true);
    expect(session.currentLocale()).toBe("ja");
    expect(session.resolveText(parseTextId("text.chapter.a"))).toBe("English A");
    expect(session.loadedVariantCount()).toBe(1);
    expect(session.loadedEntryCount()).toBe(2);
    expect(loadPackBytes).toHaveBeenCalledTimes(2);
    await expect(session.activateLocale(null)).resolves.toBe(true);
    expect(session.currentLocale()).toBe("en");
    lease.release();
  });

  it("keeps the predecessor after a failed locale switch and permits a clean retry", async () => {
    const manifest = manifestV1([descriptorInputV1("text.chapter")]);
    const goodEnglish = packBytesV2("text.chapter", "en", {
      "text.chapter.line": "English",
    });
    const invalidChinese = packBytesV2("text.chapter", "zh-CN", {
      "text.chapter.line": "中文",
      "text.chapter.extra": "Not in default",
    });
    const goodChinese = packBytesV2("text.chapter", "zh-CN", {
      "text.chapter.line": "中文",
    });
    let chineseAttempts = 0;
    const session = createTextContentSessionV1({
      manifest,
      bootstrapCatalogs: [],
      loadPackBytes: (_pack, variant) => {
        if (variant.locale === "en") return Promise.resolve(goodEnglish);
        chineseAttempts += 1;
        return Promise.resolve(chineseAttempts === 1 ? invalidChinese : goodChinese);
      },
    });
    const lease = await session.acquire(parseTextContentPackIdV1("text.chapter"));

    await expect(session.activateLocale(parseLocaleId("zh-CN"))).rejects.toThrow(
      "text_content.translation_text_id_unknown:text.chapter.extra",
    );
    expect(session.currentLocale()).toBe("en");
    expect(session.resolveText(parseTextId("text.chapter.line"))).toBe("English");
    expect(session.loadedVariantCount()).toBe(1);
    await expect(session.activateLocale(parseLocaleId("zh-CN"))).resolves.toBe(true);
    expect(session.resolveText(parseTextId("text.chapter.line"))).toBe("中文");
    lease.release();
  });

  it("uses latest-request-wins and suppresses a stale locale load failure", async () => {
    const manifest = manifestV1([descriptorInputV1("text.chapter", ["en", "ja", "zh-CN"])]);
    const chinese = deferredV1<Uint8Array>();
    const japanese = deferredV1<Uint8Array>();
    const session = createTextContentSessionV1({
      manifest,
      bootstrapCatalogs: [],
      loadPackBytes: (_pack, variant) => {
        if (variant.locale === "en") {
          return Promise.resolve(packBytesV2("text.chapter", "en", {
            "text.chapter.line": "English",
          }));
        }
        return variant.locale === "zh-CN" ? chinese.promise : japanese.promise;
      },
    });
    const lease = await session.acquire(parseTextContentPackIdV1("text.chapter"));
    const switchToChinese = session.activateLocale(parseLocaleId("zh-CN"));
    const switchToJapanese = session.activateLocale(parseLocaleId("ja"));

    japanese.resolve(packBytesV2("text.chapter", "ja", { "text.chapter.line": "日本語" }));
    await expect(switchToJapanese).resolves.toBe(true);
    expect(session.currentLocale()).toBe("ja");
    expect(session.resolveText(parseTextId("text.chapter.line"))).toBe("日本語");

    chinese.reject(new Error("late network failure"));
    await expect(switchToChinese).resolves.toBe(false);
    expect(session.currentLocale()).toBe("ja");
    expect(session.resolveText(parseTextId("text.chapter.line"))).toBe("日本語");
    lease.release();
  });

  it("reconciles acquire with a concurrent locale switch without predecessor publication", async () => {
    const manifest = manifestV1([descriptorInputV1("text.chapter")]);
    const english = deferredV1<Uint8Array>();
    const loadPackBytes = vi.fn(
      (_pack: TextContentPackDescriptorV1, variant: TextContentPackVariantDescriptorV1) =>
        variant.locale === "en" ? english.promise : Promise.resolve(
          packBytesV2("text.chapter", "zh-CN", { "text.chapter.line": "中文" }),
        ),
    );
    const session = createTextContentSessionV1({
      manifest,
      bootstrapCatalogs: [],
      loadPackBytes,
    });
    const acquiring = session.acquire(parseTextContentPackIdV1("text.chapter"));

    await expect(session.activateLocale(parseLocaleId("zh-CN"))).resolves.toBe(true);
    expect(session.currentLocale()).toBe("zh-CN");
    english.resolve(packBytesV2("text.chapter", "en", { "text.chapter.line": "English" }));
    const lease = await acquiring;

    expect(session.currentLocale()).toBe("zh-CN");
    expect(session.resolveText(parseTextId("text.chapter.line"))).toBe("中文");
    expect(loadPackBytes.mock.calls.map(([, variant]) => variant.locale)).toEqual([
      "en",
      "zh-CN",
    ]);
    lease.release();
  });

  it("drops a released demand while its locale variant is still staging", async () => {
    const manifest = manifestV1([descriptorInputV1("text.chapter")]);
    const chinese = deferredV1<Uint8Array>();
    const session = createTextContentSessionV1({
      manifest,
      bootstrapCatalogs: [],
      loadPackBytes: (_pack, variant) =>
        variant.locale === "en"
          ? Promise.resolve(
            packBytesV2("text.chapter", "en", { "text.chapter.line": "English" }),
          )
          : chinese.promise,
    });
    const lease = await session.acquire(parseTextContentPackIdV1("text.chapter"));
    const switching = session.activateLocale(parseLocaleId("zh-CN"));
    lease.release();
    chinese.reject(new Error("released demand failed late"));

    await expect(switching).resolves.toBe(true);
    expect(session.currentLocale()).toBe("zh-CN");
    expect(session.loadedPackIds()).toEqual([]);
    expect(session.loadedVariantCount()).toBe(0);
    expect(session.loadedEntryCount()).toBe(0);
  });

  it("re-stages a pack reacquired after the predecessor locale flight fails", async () => {
    const manifest = manifestV1([descriptorInputV1("text.chapter")]);
    const firstChinese = deferredV1<Uint8Array>();
    let chineseAttempts = 0;
    const loadPackBytes = vi.fn(
      (_pack: TextContentPackDescriptorV1, variant: TextContentPackVariantDescriptorV1) => {
        if (variant.locale === "en") {
          return Promise.resolve(
            packBytesV2("text.chapter", "en", { "text.chapter.line": "English" }),
          );
        }
        chineseAttempts += 1;
        return chineseAttempts === 1 ? firstChinese.promise : Promise.resolve(
          packBytesV2("text.chapter", "zh-CN", { "text.chapter.line": "中文" }),
        );
      },
    );
    const session = createTextContentSessionV1({
      manifest,
      bootstrapCatalogs: [],
      loadPackBytes,
    });
    const packId = parseTextContentPackIdV1("text.chapter");
    const predecessorLease = await session.acquire(packId);
    const switching = session.activateLocale(parseLocaleId("zh-CN"));

    predecessorLease.release();
    const successorLease = await session.acquire(packId);
    firstChinese.reject(new Error("predecessor flight failed"));

    await expect(switching).resolves.toBe(true);
    expect(chineseAttempts).toBe(2);
    expect(session.currentLocale()).toBe("zh-CN");
    expect(session.resolveText(parseTextId("text.chapter.line"))).toBe("中文");
    successorLease.release();
  });

  it("validates default identity only for the active demand set and forgets released bodies", async () => {
    const manifest = manifestV1([
      descriptorInputV1("text.first", ["en"]),
      descriptorInputV1("text.replacement", ["en"]),
      descriptorInputV1("text.bootstrap-duplicate", ["en"]),
    ]);
    const sources = new Map<string, Uint8Array>([
      ["text.first:en", packBytesV2("text.first", "en", { "text.shared": "First" })],
      [
        "text.replacement:en",
        packBytesV2("text.replacement", "en", { "text.shared": "Replacement" }),
      ],
      [
        "text.bootstrap-duplicate:en",
        packBytesV2("text.bootstrap-duplicate", "en", {
          "text.bootstrap": "Replacement bootstrap",
        }),
      ],
    ]);
    const session = createTextContentSessionV1({
      manifest,
      bootstrapCatalogs: bootstrapCatalogsV1({ en: { "text.bootstrap": "Bootstrap" } }),
      loadPackBytes: (pack, variant) => Promise.resolve(sources.get(sourceKeyV1(pack, variant))!),
    });
    const first = await session.acquire(parseTextContentPackIdV1("text.first"));
    await expect(session.acquire(parseTextContentPackIdV1("text.replacement"))).rejects.toThrow(
      "text_content.text_id_duplicate:text.shared",
    );
    await expect(session.acquire(parseTextContentPackIdV1("text.bootstrap-duplicate"))).rejects
      .toThrow("text_content.text_id_duplicate:text.bootstrap");

    first.release();
    const replacement = await session.acquire(parseTextContentPackIdV1("text.replacement"));
    expect(session.resolveText(parseTextId("text.shared"))).toBe("Replacement");
    replacement.release();
  });

  it("updates default text ownership incrementally across release and locale replacement", async () => {
    const manifest = manifestV1([
      descriptorInputV1("text.first"),
      descriptorInputV1("text.second"),
    ]);
    const sources = new Map<string, Uint8Array>([
      [
        "text.first:en",
        packBytesV2("text.first", "en", { "text.first.line": "First" }),
      ],
      [
        "text.first:zh-CN",
        packBytesV2("text.first", "zh-CN", { "text.first.line": "第一个" }),
      ],
      [
        "text.second:en",
        packBytesV2("text.second", "en", { "text.second.line": "Second" }),
      ],
      [
        "text.second:zh-CN",
        packBytesV2("text.second", "zh-CN", { "text.second.line": "第二个" }),
      ],
    ]);
    const session = createTextContentSessionV1({
      manifest,
      bootstrapCatalogs: [],
      loadPackBytes: (pack, variant) => Promise.resolve(sources.get(sourceKeyV1(pack, variant))!),
    });
    const first = await session.acquire(parseTextContentPackIdV1("text.first"));
    const second = await session.acquire(parseTextContentPackIdV1("text.second"));

    await expect(session.activateLocale(parseLocaleId("zh-CN"))).resolves.toBe(true);
    expect(session.resolveText(parseTextId("text.first.line"))).toBe("第一个");
    expect(session.resolveText(parseTextId("text.second.line"))).toBe("第二个");
    expect(session.loadedEntryCount()).toBe(4);
    expect(session.loadedVariantCount()).toBe(4);

    first.release();
    expect(session.loadedPackIds()).toEqual(["text.second"]);
    expect(session.loadedEntryCount()).toBe(2);
    expect(session.loadedVariantCount()).toBe(2);
    expect(() => session.resolveText(parseTextId("text.first.line"))).toThrow(
      "text_content.text_unavailable:text.first.line",
    );
    expect(session.resolveText(parseTextId("text.second.line"))).toBe("第二个");

    await expect(session.activateLocale(null)).resolves.toBe(true);
    expect(session.resolveText(parseTextId("text.second.line"))).toBe("Second");
    second.release();
    expect(session.loadedPackIds()).toEqual([]);
  });

  it("rejects invalid bootstrap translations before loading content", () => {
    const manifest = manifestV1([]);
    expect(() =>
      createTextContentSessionV1({
        manifest,
        bootstrapCatalogs: bootstrapCatalogsV1({ zh: { "text.unknown": "未知" } }),
        loadPackBytes: vi.fn(),
      })
    ).toThrow("text_content.translation_text_id_unknown:text.unknown");
  });

  it("disposes loaded data and fences late flights without publishing them", async () => {
    const manifest = manifestV1([descriptorInputV1("text.chapter", ["en"])]);
    const pending = deferredV1<Uint8Array>();
    const loadPackBytes = vi.fn(() => pending.promise);
    const session = createTextContentSessionV1({
      manifest,
      bootstrapCatalogs: bootstrapCatalogsV1({ en: { "text.bootstrap": "Bootstrap" } }),
      loadPackBytes,
    });
    const packId = parseTextContentPackIdV1("text.chapter");
    const acquiring = session.acquire(packId);

    session.dispose();
    session.dispose();
    pending.resolve(packBytesV2("text.chapter", "en", { "text.chapter.line": "Chapter" }));

    await expect(acquiring).rejects.toThrow("text_content.session_disposed:text.chapter");
    expect(session.loadedPackIds()).toEqual([]);
    expect(session.loadedVariantCount()).toBe(0);
    expect(session.loadedEntryCount()).toBe(0);
    await expect(session.acquire(packId)).rejects.toThrow(
      "text_content.session_disposed:text.chapter",
    );
    expect(() => session.resolveText(parseTextId("text.bootstrap"))).toThrow(
      "text_content.session_disposed:text.bootstrap",
    );
  });
});
