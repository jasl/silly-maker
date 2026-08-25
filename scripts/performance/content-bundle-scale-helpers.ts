// SPDX-License-Identifier: MIT

export type ContentBundleScaleProfileV1 = "bundle-reference" | "bundle-scale";

export interface ContentBundleScaleFixtureV1 {
  readonly profile: ContentBundleScaleProfileV1;
  readonly packCount: number;
  readonly entriesPerPack: number;
  readonly entryCount: number;
  readonly selectedPackIndex: 0;
}

const entriesPerPackV1 = 1_000;

export function contentBundleScaleFixtureV1(
  profile: ContentBundleScaleProfileV1,
): ContentBundleScaleFixtureV1 {
  const packCount = profile === "bundle-reference" ? 1 : 100;
  return {
    profile,
    packCount,
    entriesPerPack: entriesPerPackV1,
    entryCount: packCount * entriesPerPackV1,
    selectedPackIndex: 0,
  };
}

export function contentBundleScaleEntryIdV1(index: number): string {
  return `text.scale.line.${String(index).padStart(6, "0")}`;
}

export function contentBundleScalePackJsonV1(input: {
  readonly packIndex: number;
  readonly entriesPerPack: number;
  readonly locale: string;
}): string {
  const firstIndex = input.packIndex * input.entriesPerPack;
  const entries = Array.from({ length: input.entriesPerPack }, (_, offset) => {
    const index = firstIndex + offset;
    return {
      textId: contentBundleScaleEntryIdV1(index),
      text: `Scale Lab line ${String(index).padStart(6, "0")} — deterministic content payload.`,
    };
  });
  return `${
    JSON.stringify({
      format: "sillymaker.text-content-pack",
      version: 2,
      packId: `text-pack.scale.${String(input.packIndex).padStart(3, "0")}`,
      locale: input.locale,
      entries,
    })
  }\n`;
}

export interface ContentBundleScalePackDescriptorV1 {
  readonly packId: string;
  readonly variants: readonly {
    readonly locale: string;
    readonly runtimePath: string;
  }[];
}

export function contentBundleScaleManifestV1(
  packs: readonly ContentBundleScalePackDescriptorV1[],
) {
  return {
    revision: 1,
    defaultLocale: "en",
    locales: [{ locale: "en", fallbackLocale: null }],
    packs,
  } as const;
}

export function contentBundleScaleManifestSourceV1(
  packs: readonly ContentBundleScalePackDescriptorV1[],
): string {
  return `export const contentManifestV1 = ${
    JSON.stringify(contentBundleScaleManifestV1(packs))
  } as const;\n`;
}

interface ViteManifestEntryV1 {
  readonly file: string;
  readonly imports?: readonly string[];
  readonly isEntry?: boolean;
}

export function initialJavaScriptPathsFromViteManifestV1(
  manifest: Readonly<Record<string, ViteManifestEntryV1>>,
): readonly string[] {
  const entryKeys = Object.entries(manifest)
    .filter(([, entry]) => entry.isEntry === true)
    .map(([key]) => key);
  if (entryKeys.length !== 1) {
    throw new TypeError("content bundle scale manifest must contain exactly one entry");
  }

  const visitedKeys = new Set<string>();
  const paths = new Set<string>();
  const visit = (key: string): void => {
    if (visitedKeys.has(key)) return;
    visitedKeys.add(key);
    const entry = manifest[key];
    if (entry === undefined) {
      throw new TypeError(`content bundle scale manifest import is missing: ${key}`);
    }
    if (entry.file.endsWith(".js") || entry.file.endsWith(".mjs")) paths.add(entry.file);
    for (const importedKey of entry.imports ?? []) visit(importedKey);
  };
  visit(entryKeys[0]!);
  return [...paths].sort();
}
