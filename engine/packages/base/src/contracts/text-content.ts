// SPDX-License-Identifier: MIT
import { digestCanonical } from "./digest.ts";
import type { LocaleId, TextId } from "./presentation-ids.ts";
import type { TextCatalogSetV1 } from "./text-catalog.ts";
import { parseTextCatalogSetV1 } from "./text-catalog.ts";
import { parseStrictJson, parseStrictJsonLimitsV1 } from "./strict-json.ts";
import type { Brand, Digest, NonNegativeSafeInteger, PositiveSafeInteger } from "./values.ts";
import { parseModuleId, parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "./values.ts";

export type TextContentPackIdV1 = Brand<string, "TextContentPackIdV1">;

export interface TextContentPackDescriptorV1 {
  readonly packId: TextContentPackIdV1;
  readonly runtimePath: string;
}

export interface TextContentManifestV1 {
  readonly revision: PositiveSafeInteger;
  readonly packs: readonly TextContentPackDescriptorV1[];
  readonly digest: Digest;
}

export interface AdmittedTextContentPackV1 {
  readonly format: "sillymaker.text-content-pack";
  readonly version: 1;
  readonly packId: TextContentPackIdV1;
  readonly textCatalogs: TextCatalogSetV1;
  readonly entryCount: NonNegativeSafeInteger;
}

export type TextContentErrorCodeV1 =
  | "text_content.manifest_invalid"
  | "text_content.manifest_pack_duplicate"
  | "text_content.pack_json_invalid"
  | "text_content.pack_shape_invalid"
  | "text_content.pack_identity_mismatch"
  | "text_content.pack_catalog_invalid"
  | "text_content.pack_unknown"
  | "text_content.pack_load_failed"
  | "text_content.locale_topology_mismatch"
  | "text_content.text_id_duplicate"
  | "text_content.locale_unknown"
  | "text_content.text_unavailable";

export class TextContentErrorV1 extends TypeError {
  readonly code: TextContentErrorCodeV1;
  readonly reference: string | null;

  constructor(code: TextContentErrorCodeV1, reference: string | null = null) {
    super(reference === null ? code : `${code}:${reference}`);
    this.name = "TextContentErrorV1";
    this.code = code;
    this.reference = reference;
  }
}

export interface TextContentSessionV1 {
  readonly manifest: TextContentManifestV1;
  ensure(packId: TextContentPackIdV1): Promise<void>;
  resolveText(locale: LocaleId | null, textId: TextId): string;
  loadedPackIds(): readonly TextContentPackIdV1[];
  /** Entries admitted from content packs; bootstrap UI copy is excluded. */
  loadedEntryCount(): NonNegativeSafeInteger;
}

function fail(code: TextContentErrorCodeV1, reference: string | null = null): never {
  throw new TextContentErrorV1(code, reference);
}

export function parseTextContentPackIdV1(value: unknown): TextContentPackIdV1 {
  try {
    return parseModuleId(value) as unknown as TextContentPackIdV1;
  } catch {
    throw new TypeError("invalid TextContentPackIdV1");
  }
}

function parseManifestDescriptorV1(
  value: {
    readonly packId: string;
    readonly runtimePath: string;
  },
  index: number,
): TextContentPackDescriptorV1 {
  try {
    return {
      packId: parseTextContentPackIdV1(value.packId),
      runtimePath: parseTextContentRuntimePathV1(value.runtimePath),
    };
  } catch {
    return fail("text_content.manifest_invalid", String(index));
  }
}

function parseTextContentRuntimePathV1(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("assets/") ||
    value.includes("\\") ||
    value.includes("?") ||
    value.includes("#") ||
    value.includes("\0") ||
    value.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new TypeError("invalid text content runtime path");
  }
  return value;
}

export function defineTextContentManifestV1(input: {
  readonly revision: number;
  readonly packs: readonly {
    readonly packId: string;
    readonly runtimePath: string;
  }[];
}): TextContentManifestV1 {
  let revision: PositiveSafeInteger;
  if (!Array.isArray(input.packs)) return fail("text_content.manifest_invalid", "packs");
  try {
    revision = parsePositiveSafeInteger(input.revision);
  } catch {
    return fail("text_content.manifest_invalid", "revision");
  }

  const packs = input.packs.map(parseManifestDescriptorV1).sort((left, right) =>
    left.packId < right.packId ? -1 : left.packId > right.packId ? 1 : 0
  );
  for (let index = 1; index < packs.length; index += 1) {
    if (packs[index - 1]?.packId === packs[index]?.packId) {
      return fail("text_content.manifest_pack_duplicate", packs[index]?.packId ?? null);
    }
  }
  const digest = digestCanonical("sillymaker:text-content-manifest:v1", {
    revision,
    packs,
  });
  return { revision, packs, digest };
}

function countCatalogEntriesV1(catalogs: TextCatalogSetV1): NonNegativeSafeInteger {
  let count = 0;
  for (const catalog of catalogs.catalogs) {
    count += catalog.entries.length;
  }
  return parseNonNegativeSafeInteger(count);
}

/** Resource budget for one user-editable, data-only text pack. */
export const textContentPackJsonLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 16_777_216,
  maxDepth: 8,
  maxArrayItems: 200_000,
  maxObjectMembers: 16,
  maxNodes: 1_500_000,
  maxStringBytes: 1_048_576,
});

export function admitTextContentPackV1(
  descriptor: TextContentPackDescriptorV1,
  bytes: Uint8Array,
): AdmittedTextContentPackV1 {
  const parsed = parseStrictJson(bytes, textContentPackJsonLimitsV1);
  if (!parsed.ok) return fail("text_content.pack_json_invalid", parsed.error.code);
  if (parsed.value === null || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return fail("text_content.pack_shape_invalid", descriptor.packId);
  }
  const wire = parsed.value as Record<string, unknown>;
  const keys = Object.keys(wire).sort();
  if (keys.join("\0") !== ["format", "packId", "textCatalogs", "version"].join("\0")) {
    return fail("text_content.pack_shape_invalid", descriptor.packId);
  }
  if (wire.format !== "sillymaker.text-content-pack" || wire.version !== 1) {
    return fail("text_content.pack_shape_invalid", descriptor.packId);
  }
  let packId: TextContentPackIdV1;
  try {
    packId = parseTextContentPackIdV1(wire.packId);
  } catch {
    return fail("text_content.pack_shape_invalid", descriptor.packId);
  }
  if (packId !== descriptor.packId) {
    return fail("text_content.pack_identity_mismatch", descriptor.packId);
  }
  let textCatalogs: TextCatalogSetV1;
  try {
    textCatalogs = parseTextCatalogSetV1(wire.textCatalogs);
  } catch {
    return fail("text_content.pack_catalog_invalid", descriptor.packId);
  }
  const entryCount = countCatalogEntriesV1(textCatalogs);
  return {
    format: "sillymaker.text-content-pack",
    version: 1,
    packId,
    textCatalogs,
    entryCount,
  };
}

function textIdsV1(catalogs: TextCatalogSetV1): ReadonlySet<TextId> {
  const ids = new Set<TextId>();
  for (const catalog of catalogs.catalogs) {
    for (const entry of catalog.entries) ids.add(entry.textId);
  }
  return ids;
}

function sameLocaleTopologyV1(
  expected: TextCatalogSetV1,
  candidate: TextCatalogSetV1,
): boolean {
  if (expected.defaultLocale !== candidate.defaultLocale) return false;
  if (expected.catalogs.length !== candidate.catalogs.length) return false;
  const candidateFallbacks = new Map(
    candidate.catalogs.map((catalog) => [catalog.locale, catalog.fallbackLocale] as const),
  );
  return expected.catalogs.every((catalog) =>
    candidateFallbacks.has(catalog.locale) &&
    candidateFallbacks.get(catalog.locale) === catalog.fallbackLocale
  );
}

function catalogTextIndexV1(catalogs: TextCatalogSetV1): Map<LocaleId, Map<TextId, string>> {
  return new Map(
    catalogs.catalogs.map((catalog) =>
      [
        catalog.locale,
        new Map(catalog.entries.map((entry) => [entry.textId, entry.text] as const)),
      ] as const
    ),
  );
}

export function createTextContentSessionV1(input: {
  readonly manifest: TextContentManifestV1;
  readonly bootstrapCatalogs: TextCatalogSetV1;
  readonly loadPackBytes: (descriptor: TextContentPackDescriptorV1) => Promise<Uint8Array>;
}): TextContentSessionV1 {
  const bootstrapCatalogs = input.bootstrapCatalogs;

  const descriptors = new Map(input.manifest.packs.map((pack) => [pack.packId, pack] as const));
  const fallbackByLocale = new Map(
    bootstrapCatalogs.catalogs.map((catalog) => [catalog.locale, catalog.fallbackLocale] as const),
  );
  const textsByLocale = catalogTextIndexV1(bootstrapCatalogs);
  const ownedTextIds = new Set(textIdsV1(bootstrapCatalogs));
  const loadedPacks = new Set<TextContentPackIdV1>();
  let loadedEntries = parseNonNegativeSafeInteger(0);
  const inFlight = new Map<TextContentPackIdV1, Promise<void>>();

  const loadAndAdmit = async (
    packId: TextContentPackIdV1,
    descriptor: TextContentPackDescriptorV1,
  ): Promise<void> => {
    let bytes: Uint8Array;
    try {
      bytes = await input.loadPackBytes(descriptor);
    } catch {
      return fail("text_content.pack_load_failed", packId);
    }
    const pack = admitTextContentPackV1(descriptor, bytes);
    if (!sameLocaleTopologyV1(bootstrapCatalogs, pack.textCatalogs)) {
      return fail("text_content.locale_topology_mismatch", packId);
    }
    const packTextIds = textIdsV1(pack.textCatalogs);
    for (const textId of packTextIds) {
      if (ownedTextIds.has(textId)) {
        return fail("text_content.text_id_duplicate", textId);
      }
    }
    const nextEntryCount = loadedEntries + pack.entryCount;

    // Every reachable refusal is decided above. This synchronous commit is
    // not observable mid-loop, so mutating the private indexes avoids an
    // O(total-loaded-text) copy for every newly admitted pack.
    for (const catalog of pack.textCatalogs.catalogs) {
      const entries = textsByLocale.get(catalog.locale)!;
      for (const entry of catalog.entries) entries.set(entry.textId, entry.text);
    }
    for (const textId of packTextIds) ownedTextIds.add(textId);
    loadedPacks.add(packId);
    loadedEntries = parseNonNegativeSafeInteger(nextEntryCount);
  };

  const ensure = (packId: TextContentPackIdV1): Promise<void> => {
    if (loadedPacks.has(packId)) return Promise.resolve();
    const current = inFlight.get(packId);
    if (current !== undefined) return current;
    const descriptor = descriptors.get(packId);
    if (descriptor === undefined) {
      return Promise.reject(new TextContentErrorV1("text_content.pack_unknown", packId));
    }
    const flight = loadAndAdmit(packId, descriptor);
    inFlight.set(packId, flight);
    void flight.then(
      () => {
        if (inFlight.get(packId) === flight) inFlight.delete(packId);
      },
      () => {
        if (inFlight.get(packId) === flight) inFlight.delete(packId);
      },
    );
    return flight;
  };

  const resolveText = (locale: LocaleId | null, textId: TextId): string => {
    const requestedLocale = locale === null ? bootstrapCatalogs.defaultLocale : locale;
    if (!fallbackByLocale.has(requestedLocale)) {
      return fail("text_content.locale_unknown", requestedLocale);
    }
    let cursor: LocaleId | null = requestedLocale;
    while (cursor !== null) {
      const value = textsByLocale.get(cursor)?.get(textId);
      if (value !== undefined) return value;
      cursor = fallbackByLocale.get(cursor) ?? null;
    }
    return fail("text_content.text_unavailable", textId);
  };

  return {
    manifest: input.manifest,
    ensure,
    resolveText,
    loadedPackIds: (): readonly TextContentPackIdV1[] =>
      input.manifest.packs
        .map((pack) => pack.packId)
        .filter((packId) => loadedPacks.has(packId)),
    loadedEntryCount: (): NonNegativeSafeInteger => loadedEntries,
  };
}
