// SPDX-License-Identifier: MIT
import { digestCanonical } from "./digest.ts";
import type { LocaleId, TextId } from "./presentation-ids.ts";
import { parseLocaleId, parseTextId } from "./presentation-ids.ts";
import { parseStrictJson, parseStrictJsonLimitsV1 } from "./strict-json.ts";
import type { Brand, Digest, NonNegativeSafeInteger, PositiveSafeInteger } from "./values.ts";
import { parseModuleId, parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "./values.ts";

export type TextContentPackIdV1 = Brand<string, "TextContentPackIdV1">;

export interface TextContentLocaleDescriptorV1 {
  readonly locale: LocaleId;
  readonly fallbackLocale: LocaleId | null;
}

export interface TextContentPackVariantDescriptorV1 {
  readonly locale: LocaleId;
  readonly runtimePath: string;
}

export interface TextContentPackDescriptorV1 {
  readonly packId: TextContentPackIdV1;
  readonly variants: readonly TextContentPackVariantDescriptorV1[];
}

export interface TextContentManifestV1 {
  readonly revision: PositiveSafeInteger;
  readonly defaultLocale: LocaleId;
  readonly locales: readonly TextContentLocaleDescriptorV1[];
  readonly packs: readonly TextContentPackDescriptorV1[];
  readonly digest: Digest;
}

export interface TextContentBootstrapCatalogV1 {
  readonly locale: string;
  readonly entries: readonly {
    readonly textId: string;
    readonly text: string;
  }[];
}

export interface AdmittedTextContentPackV1 {
  readonly format: "sillymaker.text-content-pack";
  readonly version: 2;
  readonly packId: TextContentPackIdV1;
  readonly locale: LocaleId;
  readonly entries: ReadonlyMap<TextId, string>;
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
  | "text_content.text_id_duplicate"
  | "text_content.translation_text_id_unknown"
  | "text_content.session_disposed"
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
  acquire(packId: TextContentPackIdV1): Promise<TextContentPackLeaseV1>;
  /**
   * Stages the active locale and every declared fallback for all demanded
   * packs, then swaps the presentation owner atomically. A superseded request
   * resolves `false` without replacing the newer owner.
   */
  activateLocale(locale: LocaleId | null): Promise<boolean>;
  currentLocale(): LocaleId;
  resolveText(textId: TextId): string;
  loadedPackIds(): readonly TextContentPackIdV1[];
  /** Entries in active content-pack variants; bootstrap copy is excluded. */
  loadedEntryCount(): NonNegativeSafeInteger;
  loadedVariantCount(): NonNegativeSafeInteger;
  dispose(): void;
}

export interface TextContentPackLeaseV1 {
  readonly packId: TextContentPackIdV1;
  readonly generation: Digest;
  readonly timing: TextContentPackTimingV1;
  /** Releases this independent ownership claim. Repeated calls are inert. */
  release(): void;
}

export interface TextContentPackTimingV1 {
  /** I/O incurred by the owner transition; already-resident variants add zero. */
  readonly loadMs: number;
  /** Admission incurred by the owner transition; already-resident variants add zero. */
  readonly admitMs: number;
  readonly activateMs: number;
  /** Wall time from staging this logical pack until its owner commit. */
  readonly totalMs: number;
}

interface LoadedVariantV1 {
  readonly admitted: AdmittedTextContentPackV1;
  readonly timing: Readonly<{
    readonly loadMs: number;
    readonly admitMs: number;
    readonly totalMs: number;
  }>;
}

interface StagedPackV1 {
  readonly descriptor: TextContentPackDescriptorV1;
  readonly variants: ReadonlyMap<LocaleId, LoadedVariantV1>;
  readonly startedAt: number;
  readonly readyAt: number;
  readonly loadMs: number;
  readonly admitMs: number;
}

interface ActivePackV1 {
  readonly descriptor: TextContentPackDescriptorV1;
  readonly variants: ReadonlyMap<LocaleId, LoadedVariantV1>;
  readonly timing: TextContentPackTimingV1;
}

interface PresentationOwnerV1 {
  readonly locale: LocaleId;
  readonly localeChain: readonly LocaleId[];
  readonly packs: ReadonlyMap<TextContentPackIdV1, ActivePackV1>;
  readonly packIdByTextId: ReadonlyMap<TextId, TextContentPackIdV1 | null>;
  readonly entryCount: NonNegativeSafeInteger;
  readonly variantCount: NonNegativeSafeInteger;
}

interface PackDemandV1 {
  ownerCount: number;
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

function parseManifestLocalesV1(input: {
  readonly defaultLocale: string;
  readonly locales: readonly {
    readonly locale: string;
    readonly fallbackLocale: string | null;
  }[];
}): {
  readonly defaultLocale: LocaleId;
  readonly locales: readonly TextContentLocaleDescriptorV1[];
} {
  let defaultLocale: LocaleId;
  try {
    defaultLocale = parseLocaleId(input.defaultLocale);
  } catch {
    return fail("text_content.manifest_invalid", "defaultLocale");
  }
  if (!Array.isArray(input.locales)) {
    return fail("text_content.manifest_invalid", "locales");
  }

  const locales = input.locales.map((candidate, index) => {
    try {
      return {
        locale: parseLocaleId(candidate.locale),
        fallbackLocale: candidate.fallbackLocale === null
          ? null
          : parseLocaleId(candidate.fallbackLocale),
      };
    } catch {
      return fail("text_content.manifest_invalid", `locales/${index}`);
    }
  }).sort((left, right) => left.locale < right.locale ? -1 : left.locale > right.locale ? 1 : 0);

  const byLocale = new Map<LocaleId, TextContentLocaleDescriptorV1>();
  for (const locale of locales) {
    if (byLocale.has(locale.locale)) {
      return fail("text_content.manifest_invalid", `locale:${locale.locale}`);
    }
    byLocale.set(locale.locale, locale);
  }
  const defaultDescriptor = byLocale.get(defaultLocale);
  if (defaultDescriptor === undefined || defaultDescriptor.fallbackLocale !== null) {
    return fail("text_content.manifest_invalid", "defaultLocale");
  }

  for (const descriptor of locales) {
    if (descriptor.locale === defaultLocale) continue;
    if (descriptor.fallbackLocale === null) {
      return fail("text_content.manifest_invalid", `fallback:${descriptor.locale}`);
    }
    const visited = new Set<LocaleId>([descriptor.locale]);
    let cursor = descriptor.fallbackLocale;
    while (cursor !== defaultLocale) {
      if (visited.has(cursor)) {
        return fail("text_content.manifest_invalid", `fallback:${descriptor.locale}`);
      }
      visited.add(cursor);
      const next = byLocale.get(cursor)?.fallbackLocale;
      if (next === undefined || next === null) {
        return fail("text_content.manifest_invalid", `fallback:${descriptor.locale}`);
      }
      cursor = next;
    }
  }
  return { defaultLocale, locales };
}

function parseManifestPackV1(
  input: {
    readonly packId: string;
    readonly variants: readonly {
      readonly locale: string;
      readonly runtimePath: string;
    }[];
  },
  index: number,
  defaultLocale: LocaleId,
  locales: ReadonlySet<LocaleId>,
): TextContentPackDescriptorV1 {
  let packId: TextContentPackIdV1;
  if (!Array.isArray(input.variants)) {
    return fail("text_content.manifest_invalid", `packs/${index}/variants`);
  }
  try {
    packId = parseTextContentPackIdV1(input.packId);
  } catch {
    return fail("text_content.manifest_invalid", `packs/${index}/packId`);
  }

  const variants = input.variants.map((candidate, variantIndex) => {
    try {
      const locale = parseLocaleId(candidate.locale);
      if (!locales.has(locale)) throw new TypeError("unknown locale");
      return {
        locale,
        runtimePath: parseTextContentRuntimePathV1(candidate.runtimePath),
      };
    } catch {
      return fail(
        "text_content.manifest_invalid",
        `packs/${index}/variants/${variantIndex}`,
      );
    }
  }).sort((left, right) => left.locale < right.locale ? -1 : left.locale > right.locale ? 1 : 0);

  for (let variantIndex = 1; variantIndex < variants.length; variantIndex += 1) {
    if (variants[variantIndex - 1]?.locale === variants[variantIndex]?.locale) {
      return fail(
        "text_content.manifest_invalid",
        `variant:${packId}:${variants[variantIndex]?.locale ?? ""}`,
      );
    }
  }
  if (!variants.some((variant) => variant.locale === defaultLocale)) {
    return fail("text_content.manifest_invalid", `defaultVariant:${packId}`);
  }
  return { packId, variants };
}

export function defineTextContentManifestV1(input: {
  readonly revision: number;
  readonly defaultLocale: string;
  readonly locales: readonly {
    readonly locale: string;
    readonly fallbackLocale: string | null;
  }[];
  readonly packs: readonly {
    readonly packId: string;
    readonly variants: readonly {
      readonly locale: string;
      readonly runtimePath: string;
    }[];
  }[];
}): TextContentManifestV1 {
  let revision: PositiveSafeInteger;
  if (!Array.isArray(input.packs)) return fail("text_content.manifest_invalid", "packs");
  try {
    revision = parsePositiveSafeInteger(input.revision);
  } catch {
    return fail("text_content.manifest_invalid", "revision");
  }

  const { defaultLocale, locales } = parseManifestLocalesV1(input);
  const localeSet = new Set(locales.map((locale) => locale.locale));
  const packs = input.packs
    .map((pack, index) => parseManifestPackV1(pack, index, defaultLocale, localeSet))
    .sort((left, right) => left.packId < right.packId ? -1 : left.packId > right.packId ? 1 : 0);
  for (let index = 1; index < packs.length; index += 1) {
    if (packs[index - 1]?.packId === packs[index]?.packId) {
      return fail("text_content.manifest_pack_duplicate", packs[index]?.packId ?? null);
    }
  }

  const digest = digestCanonical("sillymaker:text-content-manifest:v1", {
    revision,
    defaultLocale,
    locales,
    packs,
  });
  return { revision, defaultLocale, locales, packs, digest };
}

/** Resource budget for one user-editable, data-only locale variant. */
export const textContentPackJsonLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 16_777_216,
  maxDepth: 6,
  maxArrayItems: 200_000,
  maxObjectMembers: 8,
  maxNodes: 1_000_000,
  maxStringBytes: 1_048_576,
});

function hasExactKeysV1(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key));
}

export function admitTextContentPackV1(
  descriptor: TextContentPackDescriptorV1,
  variant: TextContentPackVariantDescriptorV1,
  bytes: Uint8Array,
): AdmittedTextContentPackV1 {
  const parsed = parseStrictJson(bytes, textContentPackJsonLimitsV1);
  if (!parsed.ok) return fail("text_content.pack_json_invalid", parsed.error.code);
  if (parsed.value === null || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return fail("text_content.pack_shape_invalid", descriptor.packId);
  }
  const wire = parsed.value as Record<string, unknown>;
  if (!hasExactKeysV1(wire, ["format", "version", "packId", "locale", "entries"])) {
    return fail("text_content.pack_shape_invalid", descriptor.packId);
  }
  if (wire.format !== "sillymaker.text-content-pack" || wire.version !== 2) {
    return fail("text_content.pack_shape_invalid", descriptor.packId);
  }

  let packId: TextContentPackIdV1;
  let locale: LocaleId;
  try {
    packId = parseTextContentPackIdV1(wire.packId);
    locale = parseLocaleId(wire.locale);
  } catch {
    return fail("text_content.pack_shape_invalid", descriptor.packId);
  }
  if (packId !== descriptor.packId || locale !== variant.locale) {
    return fail("text_content.pack_identity_mismatch", `${descriptor.packId}:${variant.locale}`);
  }
  if (!Array.isArray(wire.entries)) {
    return fail("text_content.pack_catalog_invalid", `${descriptor.packId}:${variant.locale}`);
  }

  const entries = new Map<TextId, string>();
  for (const [index, candidate] of wire.entries.entries()) {
    if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
      return fail("text_content.pack_catalog_invalid", `${descriptor.packId}:${variant.locale}`);
    }
    const entry = candidate as Record<string, unknown>;
    if (!hasExactKeysV1(entry, ["textId", "text"]) || typeof entry.text !== "string") {
      return fail("text_content.pack_catalog_invalid", `${descriptor.packId}:${variant.locale}`);
    }
    let textId: TextId;
    try {
      textId = parseTextId(entry.textId);
    } catch {
      return fail(
        "text_content.pack_catalog_invalid",
        `${descriptor.packId}:${variant.locale}:${index}`,
      );
    }
    if (entries.has(textId)) return fail("text_content.text_id_duplicate", textId);
    entries.set(textId, entry.text);
  }

  return {
    format: "sillymaker.text-content-pack",
    version: 2,
    packId,
    locale,
    entries,
    entryCount: parseNonNegativeSafeInteger(entries.size),
  };
}

function localeChainV1(
  locale: LocaleId,
  fallbackByLocale: ReadonlyMap<LocaleId, LocaleId | null>,
): readonly LocaleId[] {
  const chain: LocaleId[] = [];
  let cursor: LocaleId | null = locale;
  while (cursor !== null) {
    chain.push(cursor);
    cursor = fallbackByLocale.get(cursor) ?? null;
  }
  return chain;
}

function normalizeBootstrapCatalogsV1(
  catalogs: readonly TextContentBootstrapCatalogV1[],
  locales: ReadonlySet<LocaleId>,
  defaultLocale: LocaleId,
): ReadonlyMap<LocaleId, ReadonlyMap<TextId, string>> {
  if (!Array.isArray(catalogs)) return fail("text_content.pack_catalog_invalid", "bootstrap");
  const byLocale = new Map<LocaleId, ReadonlyMap<TextId, string>>();
  for (const [catalogIndex, candidate] of catalogs.entries()) {
    let locale: LocaleId;
    try {
      locale = parseLocaleId(candidate.locale);
    } catch {
      return fail("text_content.pack_catalog_invalid", `bootstrap:${catalogIndex}`);
    }
    if (!locales.has(locale)) return fail("text_content.locale_unknown", locale);
    if (byLocale.has(locale) || !Array.isArray(candidate.entries)) {
      return fail("text_content.pack_catalog_invalid", `bootstrap:${locale}`);
    }
    const entries = new Map<TextId, string>();
    for (const [entryIndex, entry] of candidate.entries.entries()) {
      if (entry === null || typeof entry !== "object" || typeof entry.text !== "string") {
        return fail("text_content.pack_catalog_invalid", `bootstrap:${locale}:${entryIndex}`);
      }
      let textId: TextId;
      try {
        textId = parseTextId(entry.textId);
      } catch {
        return fail("text_content.pack_catalog_invalid", `bootstrap:${locale}:${entryIndex}`);
      }
      if (entries.has(textId)) return fail("text_content.text_id_duplicate", textId);
      entries.set(textId, entry.text);
    }
    byLocale.set(locale, entries);
  }

  const defaultIds = byLocale.get(defaultLocale) ?? new Map<TextId, string>();
  for (const [locale, entries] of byLocale) {
    if (locale === defaultLocale) continue;
    for (const textId of entries.keys()) {
      if (!defaultIds.has(textId)) {
        return fail("text_content.translation_text_id_unknown", textId);
      }
    }
  }
  return byLocale;
}

export function createTextContentSessionV1(input: {
  readonly manifest: TextContentManifestV1;
  readonly bootstrapCatalogs: readonly TextContentBootstrapCatalogV1[];
  readonly loadPackBytes: (
    descriptor: TextContentPackDescriptorV1,
    variant: TextContentPackVariantDescriptorV1,
  ) => Promise<Uint8Array>;
  readonly now?: () => number;
}): TextContentSessionV1 {
  const now = input.now ?? (() => performance.now());
  const defaultLocale = input.manifest.defaultLocale;
  const localeSet = new Set(input.manifest.locales.map((locale) => locale.locale));
  const fallbackByLocale = new Map(
    input.manifest.locales.map((locale) => [locale.locale, locale.fallbackLocale] as const),
  );
  const bootstrapByLocale = normalizeBootstrapCatalogsV1(
    input.bootstrapCatalogs,
    localeSet,
    defaultLocale,
  );
  const descriptors = new Map(input.manifest.packs.map((pack) => [pack.packId, pack] as const));
  const demands = new Map<TextContentPackIdV1, PackDemandV1>();
  const variantFlights = new Map<string, Promise<LoadedVariantV1>>();
  let demandRevision = 0;
  let localeRequestRevision = 0;
  let disposed = false;

  // Default-locale IDs define logical ownership. Locale replacement can reuse
  // this topology; only acquire/release changes it.
  const packIdByTextId = new Map<TextId, TextContentPackIdV1 | null>();
  for (const textId of bootstrapByLocale.get(defaultLocale)?.keys() ?? []) {
    packIdByTextId.set(textId, null);
  }
  let activePacks = new Map<TextContentPackIdV1, ActivePackV1>();

  const createOwner = (
    locale: LocaleId,
    entryCount: NonNegativeSafeInteger,
    variantCount: NonNegativeSafeInteger,
  ): PresentationOwnerV1 => {
    return {
      locale,
      localeChain: localeChainV1(locale, fallbackByLocale),
      packs: activePacks,
      packIdByTextId,
      entryCount,
      variantCount,
    };
  };

  let owner = createOwner(
    defaultLocale,
    parseNonNegativeSafeInteger(0),
    parseNonNegativeSafeInteger(0),
  );

  const entryCountV1 = (pack: ActivePackV1): number => {
    let count = 0;
    for (const variant of pack.variants.values()) count += variant.admitted.entries.size;
    return count;
  };

  const addPackToOwner = (pack: ActivePackV1): void => {
    const defaultEntries = pack.variants.get(defaultLocale)?.admitted.entries;
    if (defaultEntries === undefined) {
      return fail("text_content.pack_load_failed", `${pack.descriptor.packId}:${defaultLocale}`);
    }
    for (const textId of defaultEntries.keys()) {
      if (packIdByTextId.has(textId)) return fail("text_content.text_id_duplicate", textId);
    }
    const nextEntryCount = parseNonNegativeSafeInteger(owner.entryCount + entryCountV1(pack));
    const nextVariantCount = parseNonNegativeSafeInteger(
      owner.variantCount + pack.variants.size,
    );

    for (const textId of defaultEntries.keys()) {
      packIdByTextId.set(textId, pack.descriptor.packId);
    }
    activePacks.set(pack.descriptor.packId, pack);
    owner = createOwner(owner.locale, nextEntryCount, nextVariantCount);
  };

  const removePackFromOwner = (pack: ActivePackV1): void => {
    const defaultEntries = pack.variants.get(defaultLocale)?.admitted.entries;
    if (defaultEntries === undefined) {
      return fail("text_content.pack_load_failed", `${pack.descriptor.packId}:${defaultLocale}`);
    }
    const nextEntryCount = parseNonNegativeSafeInteger(owner.entryCount - entryCountV1(pack));
    const nextVariantCount = parseNonNegativeSafeInteger(
      owner.variantCount - pack.variants.size,
    );

    for (const textId of defaultEntries.keys()) packIdByTextId.delete(textId);
    activePacks.delete(pack.descriptor.packId);
    owner = createOwner(owner.locale, nextEntryCount, nextVariantCount);
  };

  const findResidentVariant = (
    packId: TextContentPackIdV1,
    locale: LocaleId,
  ): LoadedVariantV1 | undefined => owner.packs.get(packId)?.variants.get(locale);

  const loadVariant = (
    descriptor: TextContentPackDescriptorV1,
    variant: TextContentPackVariantDescriptorV1,
  ): Promise<LoadedVariantV1> => {
    const resident = findResidentVariant(descriptor.packId, variant.locale);
    if (resident !== undefined) return Promise.resolve(resident);
    const key = `${descriptor.packId}\0${variant.locale}`;
    const current = variantFlights.get(key);
    if (current !== undefined) return current;

    const flight = (async (): Promise<LoadedVariantV1> => {
      const startedAt = now();
      let bytes: Uint8Array;
      try {
        bytes = await input.loadPackBytes(descriptor, variant);
      } catch {
        if (disposed) return fail("text_content.session_disposed", descriptor.packId);
        return fail("text_content.pack_load_failed", `${descriptor.packId}:${variant.locale}`);
      }
      const loadedAt = now();
      if (disposed) return fail("text_content.session_disposed", descriptor.packId);
      const admitted = admitTextContentPackV1(descriptor, variant, bytes);
      const admittedAt = now();
      return {
        admitted,
        timing: {
          loadMs: loadedAt - startedAt,
          admitMs: admittedAt - loadedAt,
          totalMs: admittedAt - startedAt,
        },
      };
    })();
    variantFlights.set(key, flight);
    void flight.then(
      () => {
        if (variantFlights.get(key) === flight) variantFlights.delete(key);
      },
      () => {
        if (variantFlights.get(key) === flight) variantFlights.delete(key);
      },
    );
    return flight;
  };

  const stagePack = async (
    descriptor: TextContentPackDescriptorV1,
    locale: LocaleId,
    availableVariants?: ReadonlyMap<LocaleId, LoadedVariantV1>,
  ): Promise<StagedPackV1> => {
    const startedAt = now();
    const variantsByLocale = new Map(
      descriptor.variants.map((variant) => [variant.locale, variant] as const),
    );
    const requestedVariants = localeChainV1(locale, fallbackByLocale)
      .map((chainLocale) => variantsByLocale.get(chainLocale))
      .filter((variant): variant is TextContentPackVariantDescriptorV1 => variant !== undefined);
    const loaded = await Promise.all(
      requestedVariants.map(async (variant) => {
        const resident = availableVariants?.get(variant.locale) ??
          findResidentVariant(descriptor.packId, variant.locale);
        return resident === undefined
          ? [variant.locale, await loadVariant(descriptor, variant), true] as const
          : [variant.locale, resident, false] as const;
      }),
    );
    if (disposed) return fail("text_content.session_disposed", descriptor.packId);

    const variants = new Map(
      loaded.map(([loadedLocale, variant]) => [loadedLocale, variant] as const),
    );
    const defaultEntries = variants.get(defaultLocale)?.admitted.entries;
    if (defaultEntries === undefined) {
      return fail("text_content.pack_load_failed", `${descriptor.packId}:${defaultLocale}`);
    }
    for (const [variantLocale, loadedVariant] of variants) {
      if (variantLocale === defaultLocale) continue;
      for (const textId of loadedVariant.admitted.entries.keys()) {
        if (!defaultEntries.has(textId)) {
          return fail("text_content.translation_text_id_unknown", textId);
        }
      }
    }
    const readyAt = now();
    return {
      descriptor,
      variants,
      startedAt,
      readyAt,
      loadMs: loaded.reduce(
        (total, [, variant, incurred]) => total + (incurred ? variant.timing.loadMs : 0),
        0,
      ),
      admitMs: loaded.reduce(
        (total, [, variant, incurred]) => total + (incurred ? variant.timing.admitMs : 0),
        0,
      ),
    };
  };

  const activateStagedPack = (stage: StagedPackV1, activatedAt: number): ActivePackV1 => {
    return {
      descriptor: stage.descriptor,
      variants: stage.variants,
      timing: {
        loadMs: stage.loadMs,
        admitMs: stage.admitMs,
        activateMs: activatedAt - stage.readyAt,
        totalMs: activatedAt - stage.startedAt,
      },
    };
  };

  const createLease = (
    packId: TextContentPackIdV1,
    demand: PackDemandV1,
    timing: TextContentPackTimingV1,
  ): TextContentPackLeaseV1 => {
    let released = false;
    return {
      packId,
      generation: input.manifest.digest,
      timing,
      release: (): void => {
        if (released) return;
        released = true;
        if (disposed || demands.get(packId) !== demand) return;
        demand.ownerCount -= 1;
        if (demand.ownerCount > 0) return;

        const active = activePacks.get(packId)!;
        removePackFromOwner(active);
        demands.delete(packId);
        demandRevision += 1;
      },
    };
  };

  const acquire = async (packId: TextContentPackIdV1): Promise<TextContentPackLeaseV1> => {
    if (disposed) return fail("text_content.session_disposed", packId);
    const descriptor = descriptors.get(packId);
    if (descriptor === undefined) return fail("text_content.pack_unknown", packId);
    const existing = demands.get(packId);
    if (existing !== undefined) {
      existing.ownerCount += 1;
      return createLease(packId, existing, owner.packs.get(packId)!.timing);
    }

    let stagedLocale: LocaleId | null = null;
    let staged: StagedPackV1 | null = null;
    while (true) {
      if (disposed) return fail("text_content.session_disposed", packId);
      const currentDemand = demands.get(packId);
      if (currentDemand !== undefined) {
        currentDemand.ownerCount += 1;
        return createLease(packId, currentDemand, owner.packs.get(packId)!.timing);
      }
      const predecessor = owner;
      const revision = demandRevision;
      if (staged === null || stagedLocale !== predecessor.locale) {
        stagedLocale = predecessor.locale;
        try {
          staged = await stagePack(descriptor, predecessor.locale, staged?.variants);
        } catch (error) {
          if (disposed) return fail("text_content.session_disposed", packId);
          const concurrentDemand = demands.get(packId);
          if (concurrentDemand !== undefined) {
            concurrentDemand.ownerCount += 1;
            return createLease(packId, concurrentDemand, owner.packs.get(packId)!.timing);
          }
          if (owner !== predecessor || demandRevision !== revision) {
            staged = null;
            continue;
          }
          throw error;
        }
      }
      const activatedAt = now();
      if (disposed) return fail("text_content.session_disposed", packId);

      const concurrentDemand = demands.get(packId);
      if (concurrentDemand !== undefined) {
        concurrentDemand.ownerCount += 1;
        return createLease(packId, concurrentDemand, owner.packs.get(packId)!.timing);
      }
      if (owner !== predecessor || demandRevision !== revision) continue;

      const active = activateStagedPack(staged, activatedAt);
      addPackToOwner(active);
      const demand: PackDemandV1 = { ownerCount: 1 };
      demands.set(packId, demand);
      demandRevision += 1;
      return createLease(packId, demand, active.timing);
    }
  };

  const activateLocale = async (locale: LocaleId | null): Promise<boolean> => {
    if (disposed) return fail("text_content.session_disposed", locale);
    const targetLocale = locale ?? defaultLocale;
    if (!localeSet.has(targetLocale)) return fail("text_content.locale_unknown", targetLocale);
    const requestRevision = ++localeRequestRevision;
    if (targetLocale === owner.locale) return true;

    const stagedByPack = new Map<TextContentPackIdV1, Promise<StagedPackV1>>();
    while (true) {
      if (disposed) return fail("text_content.session_disposed", targetLocale);
      const revision = demandRevision;
      const demandedDescriptors = [...demands.keys()]
        .sort()
        .map((packId) => descriptors.get(packId)!);
      let stagedPacks: readonly StagedPackV1[];
      try {
        stagedPacks = await Promise.all(demandedDescriptors.map((descriptor) => {
          let staged = stagedByPack.get(descriptor.packId);
          if (staged === undefined) {
            staged = stagePack(descriptor, targetLocale);
            stagedByPack.set(descriptor.packId, staged);
          }
          return staged;
        }));
      } catch (error) {
        if (disposed) return fail("text_content.session_disposed", targetLocale);
        if (requestRevision !== localeRequestRevision) return false;
        if (revision !== demandRevision) {
          stagedByPack.clear();
          continue;
        }
        throw error;
      }
      const activatedAt = now();
      if (disposed) return fail("text_content.session_disposed", targetLocale);
      if (requestRevision !== localeRequestRevision) return false;
      if (revision !== demandRevision) continue;

      const nextPacks = new Map<TextContentPackIdV1, ActivePackV1>();
      let nextEntryCount = 0;
      let nextVariantCount = 0;
      for (const staged of stagedPacks) {
        if (!demands.has(staged.descriptor.packId)) continue;
        const active = activateStagedPack(staged, activatedAt);
        nextPacks.set(staged.descriptor.packId, active);
        nextEntryCount += entryCountV1(active);
        nextVariantCount += active.variants.size;
      }
      const admittedEntryCount = parseNonNegativeSafeInteger(nextEntryCount);
      const admittedVariantCount = parseNonNegativeSafeInteger(nextVariantCount);
      activePacks = nextPacks;
      owner = createOwner(
        targetLocale,
        admittedEntryCount,
        admittedVariantCount,
      );
      return true;
    }
  };

  const resolveText = (textId: TextId): string => {
    if (disposed) return fail("text_content.session_disposed", textId);
    const packId = owner.packIdByTextId.get(textId);
    if (packId === undefined) return fail("text_content.text_unavailable", textId);
    if (packId === null) {
      for (const locale of owner.localeChain) {
        const text = bootstrapByLocale.get(locale)?.get(textId);
        if (text !== undefined) return text;
      }
    } else {
      const pack = owner.packs.get(packId)!;
      for (const locale of owner.localeChain) {
        const text = pack.variants.get(locale)?.admitted.entries.get(textId);
        if (text !== undefined) return text;
      }
    }
    return fail("text_content.text_unavailable", textId);
  };

  return {
    manifest: input.manifest,
    acquire,
    activateLocale,
    currentLocale: (): LocaleId => owner.locale,
    resolveText,
    loadedPackIds: (): readonly TextContentPackIdV1[] => [...demands.keys()].sort(),
    loadedEntryCount: (): NonNegativeSafeInteger => owner.entryCount,
    loadedVariantCount: (): NonNegativeSafeInteger => owner.variantCount,
    dispose: (): void => {
      if (disposed) return;
      disposed = true;
      localeRequestRevision += 1;
      demandRevision += 1;
      variantFlights.clear();
      demands.clear();
      activePacks.clear();
      packIdByTextId.clear();
      owner = createOwner(
        defaultLocale,
        parseNonNegativeSafeInteger(0),
        parseNonNegativeSafeInteger(0),
      );
    },
  };
}
