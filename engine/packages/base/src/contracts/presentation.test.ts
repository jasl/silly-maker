// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createReadonlyViewSourceV1 } from "./application.ts";
import { canonicalJsonBytes } from "./canonical-json.ts";
import * as presentationContracts from "./presentation.ts";
import {
  canonicalPresentationJsonBytesV1,
  combineContentMaturityFlagsV1,
  emptyContentMaturityFlagsV1,
  findUnknownContentMaturityFlagsV1,
  isContentRequirementAllowedV1,
  parseContentMaturityFlagBitV1,
  parseContentMaturityPolicyV1,
  setContentMaturityFlagV1,
} from "./presentation.ts";
import type { ContentMaturityFlagBitV1, ContentMaturityFlagsV1 } from "./presentation.ts";

type PendingLocaleParserV1 = (value: unknown) => string;
type PendingTextCatalogParserV1 = (value: unknown) => Readonly<Record<string, unknown>>;

function parsePendingLocaleIdV1(value: unknown): string {
  const parser = (presentationContracts as { readonly parseLocaleId?: PendingLocaleParserV1 })
    .parseLocaleId;
  if (typeof parser !== "function") {
    expect(parser, "Base must export parseLocaleId").toBeTypeOf("function");
    throw new TypeError("parseLocaleId is missing");
  }
  return parser(value);
}

function parsePendingTextCatalogSetV1(value: unknown): Readonly<Record<string, unknown>> {
  const parser = (
    presentationContracts as unknown as {
      readonly parseTextCatalogSetV1?: PendingTextCatalogParserV1;
    }
  ).parseTextCatalogSetV1;
  if (typeof parser !== "function") {
    expect(parser, "Base must export parseTextCatalogSetV1").toBeTypeOf("function");
    throw new TypeError("parseTextCatalogSetV1 is missing");
  }
  return parser(value);
}

function createRawTextCatalogSetV1() {
  return {
    defaultLocale: "zh-CN",
    catalogs: [
      {
        locale: "fr-CA",
        fallbackLocale: "fr-FR",
        entries: [{ textId: "text.synthetic.second", text: "Deuxième (Canada)" }],
      },
      {
        locale: "zh-CN",
        fallbackLocale: null,
        entries: [
          { textId: "text.synthetic.second", text: "第二" },
          { textId: "text.synthetic.first", text: "第一" },
        ],
      },
      {
        locale: "fr-FR",
        fallbackLocale: "zh-CN",
        entries: [{ textId: "text.synthetic.first", text: "Premier" }],
      },
    ],
  };
}

function createEmptyContentMaturityPolicyV1() {
  return {
    policyRevision: 1,
    flags: [],
    presets: [],
    defaultAllowedFlags: 0,
  };
}

function createRawContentFlagV1(id: string, flag: number) {
  return {
    id,
    flag,
    nameTextId: `text.${id}.name`,
    descriptionTextId: `text.${id}.description`,
  };
}

function createRawContentPresetV1(presetId: string, allowedFlags: number) {
  return {
    presetId,
    allowedFlags,
    nameTextId: `text.${presetId}.name`,
    descriptionTextId: `text.${presetId}.description`,
  };
}

function createPolicyWithNonUint32MaskV1() {
  return {
    ...createEmptyContentMaturityPolicyV1(),
    defaultAllowedFlags: 0x1_0000_0000,
  };
}

function createPolicyWithNonOneHotFlagV1() {
  return {
    ...createEmptyContentMaturityPolicyV1(),
    flags: [createRawContentFlagV1("content_flag.synthetic.combined", 3)],
  };
}

function createPolicyWithDuplicateFlagBitV1() {
  return {
    ...createEmptyContentMaturityPolicyV1(),
    flags: [
      createRawContentFlagV1("content_flag.synthetic.alpha", 1),
      createRawContentFlagV1("content_flag.synthetic.beta", 1),
    ],
  };
}

function createPolicyWithDuplicateFlagIdV1() {
  return {
    ...createEmptyContentMaturityPolicyV1(),
    flags: [
      createRawContentFlagV1("content_flag.synthetic.alpha", 1),
      createRawContentFlagV1("content_flag.synthetic.alpha", 2),
    ],
  };
}

function createPolicyWithDuplicatePresetIdV1() {
  return {
    ...createEmptyContentMaturityPolicyV1(),
    flags: [
      createRawContentFlagV1("content_flag.synthetic.alpha", 1),
      createRawContentFlagV1("content_flag.synthetic.beta", 2),
    ],
    presets: [
      createRawContentPresetV1("content_preset.synthetic.shared", 1),
      createRawContentPresetV1("content_preset.synthetic.shared", 2),
    ],
  };
}

function createPolicyWithDuplicatePresetMaskV1() {
  return {
    ...createEmptyContentMaturityPolicyV1(),
    flags: [createRawContentFlagV1("content_flag.synthetic.alpha", 1)],
    presets: [
      createRawContentPresetV1("content_preset.synthetic.alpha", 1),
      createRawContentPresetV1("content_preset.synthetic.also-alpha", 1),
    ],
  };
}

function createPolicyWithUnknownPresetMaskV1() {
  return {
    ...createEmptyContentMaturityPolicyV1(),
    flags: [createRawContentFlagV1("content_flag.synthetic.alpha", 1)],
    presets: [createRawContentPresetV1("content_preset.synthetic.unknown", 2)],
  };
}

function createPolicyWithUnknownDefaultMaskV1() {
  return {
    ...createEmptyContentMaturityPolicyV1(),
    flags: [createRawContentFlagV1("content_flag.synthetic.alpha", 1)],
    defaultAllowedFlags: 2,
  };
}

function createHighestBitPolicyV1() {
  return {
    ...createEmptyContentMaturityPolicyV1(),
    flags: [
      createRawContentFlagV1("content_flag.synthetic.low", 1),
      createRawContentFlagV1("content_flag.synthetic.high", 0x8000_0000),
    ],
  };
}

describe("TextCatalogSetV1 contracts", () => {
  it("accepts canonical BCP 47 Locale IDs and rejects non-canonical or invalid forms", () => {
    expect(parsePendingLocaleIdV1("zh-CN")).toBe("zh-CN");
    expect(parsePendingLocaleIdV1("fr-CA")).toBe("fr-CA");
    expect(parsePendingLocaleIdV1("zh-Hant-TW")).toBe("zh-Hant-TW");

    for (const invalid of ["zh-cn", "en_US", "not a locale", "", 42]) {
      expect(() => parsePendingLocaleIdV1(invalid)).toThrow();
    }
  });

  it("preserves authored catalog and entry order and deeply freezes cloned plain data", () => {
    const source = createRawTextCatalogSetV1();
    const parsed = parsePendingTextCatalogSetV1(source) as {
      readonly defaultLocale: string;
      readonly catalogs: readonly {
        readonly locale: string;
        readonly fallbackLocale: string | null;
        readonly entries: readonly { readonly textId: string; readonly text: string }[];
      }[];
    };

    expect(parsed).toEqual(source);
    expect(parsed).not.toBe(source);
    expect(parsed.catalogs.map((catalog) => catalog.locale)).toEqual(["fr-CA", "zh-CN", "fr-FR"]);
    expect(parsed.catalogs[1]?.entries.map((entry) => entry.textId)).toEqual([
      "text.synthetic.second",
      "text.synthetic.first",
    ]);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.catalogs)).toBe(true);
    for (const catalog of parsed.catalogs) {
      expect(Object.isFrozen(catalog)).toBe(true);
      expect(Object.isFrozen(catalog.entries)).toBe(true);
      for (const entry of catalog.entries) expect(Object.isFrozen(entry)).toBe(true);
    }
  });

  it("requires exact plain-data catalog, locale, and entry records without invoking accessors", () => {
    let getterCalls = 0;
    const accessorCatalog = createRawTextCatalogSetV1();
    Object.defineProperty(accessorCatalog, "defaultLocale", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "zh-CN";
      },
    });
    const extraSetField = { ...createRawTextCatalogSetV1(), extra: true };
    const extraCatalogField = createRawTextCatalogSetV1();
    extraCatalogField.catalogs[0] = { ...extraCatalogField.catalogs[0]!, extra: true } as never;
    const extraEntryField = createRawTextCatalogSetV1();
    extraEntryField.catalogs[1]!.entries[0] = {
      ...extraEntryField.catalogs[1]!.entries[0]!,
      extra: true,
    } as never;

    for (
      const invalid of [
        Object.assign(Object.create(null), createRawTextCatalogSetV1()),
        extraSetField,
        extraCatalogField,
        extraEntryField,
        accessorCatalog,
      ]
    ) {
      expect(() => parsePendingTextCatalogSetV1(invalid)).toThrow();
    }
    expect(getterCalls).toBe(0);
  });

  it("rejects duplicate locales and duplicate TextIds within one locale", () => {
    const duplicateLocale = createRawTextCatalogSetV1();
    duplicateLocale.catalogs.push({
      locale: "zh-CN",
      fallbackLocale: null,
      entries: [],
    });
    const duplicateTextId = createRawTextCatalogSetV1();
    duplicateTextId.catalogs[1]!.entries.push({
      textId: "text.synthetic.second",
      text: "重复",
    });

    expect(() => parsePendingTextCatalogSetV1(duplicateLocale)).toThrow();
    expect(() => parsePendingTextCatalogSetV1(duplicateTextId)).toThrow();
  });

  it("requires the default catalog to exist and have fallbackLocale=null", () => {
    const missingDefault = createRawTextCatalogSetV1();
    missingDefault.defaultLocale = "en-US";
    const defaultWithFallback = createRawTextCatalogSetV1();
    defaultWithFallback.catalogs[1]!.fallbackLocale = "fr-FR";

    expect(() => parsePendingTextCatalogSetV1(missingDefault)).toThrow();
    expect(() => parsePendingTextCatalogSetV1(defaultWithFallback)).toThrow();
  });

  it("requires every non-default fallback chain to exist, remain acyclic, and terminate at default", () => {
    expect(() => parsePendingTextCatalogSetV1(createRawTextCatalogSetV1())).not.toThrow();

    const nullNonDefaultFallback = createRawTextCatalogSetV1();
    nullNonDefaultFallback.catalogs[0]!.fallbackLocale = null;
    const missingFallback = createRawTextCatalogSetV1();
    missingFallback.catalogs[0]!.fallbackLocale = "en-US";
    const cyclicFallback = createRawTextCatalogSetV1();
    cyclicFallback.catalogs[2]!.fallbackLocale = "fr-CA";

    for (const invalid of [nullNonDefaultFallback, missingFallback, cyclicFallback]) {
      expect(() => parsePendingTextCatalogSetV1(invalid)).toThrow();
    }
  });
});

describe("readonly view source", () => {
  it("publishes immutable current values without a setter", () => {
    const source = createReadonlyViewSourceV1<{ readonly count: number }>(
      Object.freeze({ count: 0 }),
    );
    let notifications = 0;
    const unsubscribe = source.subscribe(() => {
      notifications += 1;
    });
    source.publish(Object.freeze({ count: 1 }));
    expect(source.getCurrent()).toEqual({ count: 1 });
    expect(notifications).toBe(1);
    unsubscribe();
    expect("setCurrent" in source).toBe(false);
  });
});

describe("neutral presentation contracts", () => {
  it("canonicalizes binary64 Presentation numbers without widening global Canonical JSON", () => {
    const first = canonicalPresentationJsonBytesV1({
      z: "1",
      values: [0.1, 0.5, 0.65, 1, 1e21, 1e-7],
    });
    const reordered = canonicalPresentationJsonBytesV1({
      values: [0.1, 0.5, 0.65, 1, 1e21, 1e-7],
      z: "1",
    });

    expect(new TextDecoder().decode(first)).toBe(
      '["object",[["values",["array",[["number","0.1"],["number","0.5"],["number","0.65"],["number","1"],["number","1e+21"],["number","1e-7"]]]],["z",["string","1"]]]]',
    );
    expect(first).toEqual(reordered);
    expect(canonicalPresentationJsonBytesV1({ value: 1 })).not.toEqual(
      canonicalPresentationJsonBytesV1({ value: "1" }),
    );
    expect(() => canonicalJsonBytes({ value: 0.5 })).toThrowError(
      expect.objectContaining({ code: "number.not_integer" }),
    );
  });

  it.each(
    [
      [Number.NaN, "number.non_finite"],
      [Number.POSITIVE_INFINITY, "number.non_finite"],
      [Number.NEGATIVE_INFINITY, "number.non_finite"],
      [-0, "number.negative_zero"],
    ] as const,
  )("rejects non-canonical Presentation number %#", (value, code) => {
    expect(() => canonicalPresentationJsonBytesV1({ value })).toThrowError(
      expect.objectContaining({ code }),
    );
  });

  it("rejects invalid content maturity masks and flag declarations", () => {
    expect(() => parseContentMaturityPolicyV1(createPolicyWithNonUint32MaskV1())).toThrow(
      /content_maturity\.mask/u,
    );
    expect(() => parseContentMaturityPolicyV1(createPolicyWithNonOneHotFlagV1())).toThrow(
      /content_maturity\.flag/u,
    );
    expect(() => parseContentMaturityPolicyV1(createPolicyWithDuplicateFlagBitV1())).toThrow(
      /content_maturity\.duplicate/u,
    );
    expect(() => parseContentMaturityPolicyV1(createPolicyWithDuplicateFlagIdV1())).toThrow(
      /content_maturity\.duplicate/u,
    );
  });

  it("rejects duplicate and unknown content maturity presets and defaults", () => {
    expect(() => parseContentMaturityPolicyV1(createPolicyWithDuplicatePresetIdV1())).toThrow(
      /content_maturity\.duplicate/u,
    );
    expect(() => parseContentMaturityPolicyV1(createPolicyWithDuplicatePresetMaskV1())).toThrow(
      /content_maturity\.duplicate/u,
    );
    expect(() => parseContentMaturityPolicyV1(createPolicyWithUnknownPresetMaskV1())).toThrow(
      /content_maturity\.preset/u,
    );
    expect(() => parseContentMaturityPolicyV1(createPolicyWithUnknownDefaultMaskV1())).toThrow(
      /content_maturity\.unknown_flags/u,
    );
  });

  it("keeps bit 31 and mixed masks as canonical positive uint32 values", () => {
    const high = parseContentMaturityFlagBitV1(0x8000_0000);
    const low = parseContentMaturityFlagBitV1(1);
    const zero = emptyContentMaturityFlagsV1;
    const mixed = combineContentMaturityFlagsV1(high, low);
    const highestBitPolicyV1 = parseContentMaturityPolicyV1(createHighestBitPolicyV1());
    const emptyFlagPolicyV1 = parseContentMaturityPolicyV1(createEmptyContentMaturityPolicyV1());
    const maskFromBit: ContentMaturityFlagsV1 = high;
    // @ts-expect-error A general mask is not a one-hot bit refinement.
    const bitFromMask: ContentMaturityFlagBitV1 = mixed;
    void maskFromBit;
    void bitFromMask;

    expect(high).toBe(2_147_483_648);
    expect(zero).toBe(0);
    expect(mixed).toBe(2_147_483_649);
    expect(findUnknownContentMaturityFlagsV1(highestBitPolicyV1, mixed)).toBe(0);
    expect(findUnknownContentMaturityFlagsV1(emptyFlagPolicyV1, high)).toBe(2_147_483_648);
    expect(isContentRequirementAllowedV1(high, mixed)).toBe(true);
    expect(isContentRequirementAllowedV1(mixed, high)).toBe(false);
    expect(isContentRequirementAllowedV1(zero, zero)).toBe(true);
    expect(setContentMaturityFlagV1(mixed, high, false)).toBe(1);
    expect(setContentMaturityFlagV1(low, high, true)).toBe(2_147_483_649);
    expect(new TextDecoder().decode(canonicalJsonBytes({ allowedFlags: mixed }))).toBe(
      '{"allowedFlags":2147483649}',
    );
  });
});
