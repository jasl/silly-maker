// SPDX-License-Identifier: MIT
import {
  parseStrictJson,
  parseStrictJsonLimitsV1,
  type TextContentPackDescriptorV1,
  type TextContentPackVariantDescriptorV1,
} from "@sillymaker/base";
import type { RuntimeAssetLoaderV1 } from "@sillymaker/ui";
import { createBrowserImageLoaderV1 } from "@sillymaker/web";

import type { VnLastSoundCheckDeclarativeModSelectionV1 } from "./declarative-override-selection.ts";
import {
  VnLastSoundCheckDeclarativeModErrorV1,
  vnLastSoundCheckDeclarativeModResourceBudgetBytesV1,
  type VnLastSoundCheckDeclarativeModArtifactSourceV1,
  type VnLastSoundCheckPreparedAssetOverrideV1,
} from "./declarative-overrides.ts";

const maxSelectionManifestBytesV1 = 262_144;
const selectionLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: maxSelectionManifestBytesV1,
  maxDepth: 4,
  // The byte budget, rather than a product-irrelevant Mod count, is binding.
  maxArrayItems: maxSelectionManifestBytesV1,
  maxObjectMembers: 4,
  maxNodes: maxSelectionManifestBytesV1,
  maxStringBytes: 4_096,
});
const maxArtifactManifestBytesV1 = 1_048_576;
const maxArtifactResourceBytesV1 = 33_554_432;

export interface VnLastSoundCheckBrowserModSelectionV1 {
  readonly format: "sillymaker.declarative-mod-selection";
  readonly version: 1;
  readonly mods: readonly { readonly manifestPath: string }[];
}

export interface VnLastSoundCheckBrowserModFetchV1 {
  (input: URL, init?: RequestInit): Promise<Response>;
}

export interface VnLastSoundCheckBrowserImageEnvironmentV1 {
  readonly resolveRuntimeUrl: (runtimePath: string) => string;
  readonly createImage: () => HTMLImageElement;
  readonly createObjectUrl: (
    bytes: Uint8Array,
    mediaType: VnLastSoundCheckPreparedAssetOverrideV1["mediaType"],
  ) => string;
  readonly revokeObjectUrl: (url: string) => void;
}

function exactRecordV1(
  value: unknown,
  keys: readonly string[],
  reference: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new VnLastSoundCheckDeclarativeModErrorV1(
      "declarative_mod.manifest_shape_invalid",
      reference,
    );
  }
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(record, key))
  ) {
    throw new VnLastSoundCheckDeclarativeModErrorV1(
      "declarative_mod.manifest_shape_invalid",
      reference,
    );
  }
  return record;
}

function relativeResourcePathV1(value: unknown, reference: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("?") ||
    value.includes("#") ||
    value.includes("\0") ||
    value.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new VnLastSoundCheckDeclarativeModErrorV1(
      "declarative_mod.resource_path_invalid",
      reference,
    );
  }
  return value;
}

export function admitVnLastSoundCheckBrowserModSelectionV1(
  bytes: Uint8Array,
): VnLastSoundCheckBrowserModSelectionV1 {
  const parsed = parseStrictJson(bytes, selectionLimitsV1);
  if (!parsed.ok) {
    throw new VnLastSoundCheckDeclarativeModErrorV1(
      "declarative_mod.manifest_json_invalid",
      parsed.error.code,
    );
  }
  const root = exactRecordV1(parsed.value, ["format", "version", "mods"], "selection");
  if (
    root.format !== "sillymaker.declarative-mod-selection" ||
    root.version !== 1 ||
    !Array.isArray(root.mods)
  ) {
    throw new VnLastSoundCheckDeclarativeModErrorV1(
      "declarative_mod.manifest_shape_invalid",
      "selection",
    );
  }
  const seen = new Set<string>();
  const mods = root.mods.map((candidate, index) => {
    const entry = exactRecordV1(candidate, ["manifestPath"], `selection/mods/${index}`);
    const manifestPath = relativeResourcePathV1(
      entry.manifestPath,
      `selection/mods/${index}/manifestPath`,
    );
    if (seen.has(manifestPath)) {
      throw new VnLastSoundCheckDeclarativeModErrorV1(
        "declarative_mod.slot_duplicate",
        manifestPath,
      );
    }
    seen.add(manifestPath);
    return { manifestPath };
  });
  return {
    format: "sillymaker.declarative-mod-selection",
    version: 1,
    mods,
  };
}

async function fetchBoundedBytesV1(
  fetchV1: VnLastSoundCheckBrowserModFetchV1,
  url: URL,
  maxBytes: number,
): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetchV1(url, { cache: "no-store" });
  } catch (error) {
    throw new VnLastSoundCheckDeclarativeModErrorV1(
      "declarative_mod.resource_load_failed",
      url.href,
      error,
    );
  }
  if (!response.ok) {
    throw new VnLastSoundCheckDeclarativeModErrorV1(
      "declarative_mod.resource_load_failed",
      `${url.href}:${response.status}`,
    );
  }
  return await readBoundedResponseV1(response, url, maxBytes);
}

async function readBoundedResponseV1(
  response: Response,
  url: URL,
  maxBytes: number,
): Promise<Uint8Array> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && Number(declaredLength) > maxBytes) {
    throw new VnLastSoundCheckDeclarativeModErrorV1(
      "declarative_mod.resource_too_large",
      url.href,
    );
  }
  if (response.body === null) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) {
      throw new VnLastSoundCheckDeclarativeModErrorV1(
        "declarative_mod.resource_too_large",
        url.href,
      );
    }
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      byteLength += result.value.byteLength;
      if (byteLength > maxBytes) {
        await reader.cancel();
        throw new VnLastSoundCheckDeclarativeModErrorV1(
          "declarative_mod.resource_too_large",
          url.href,
        );
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (byteLength === 0) {
    throw new VnLastSoundCheckDeclarativeModErrorV1(
      "declarative_mod.resource_too_large",
      url.href,
    );
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function sameOriginUrlV1(path: string, base: URL): URL {
  const resolved = new URL(path, base);
  if (resolved.origin !== base.origin) {
    throw new VnLastSoundCheckDeclarativeModErrorV1(
      "declarative_mod.resource_path_invalid",
      path,
    );
  }
  return resolved;
}

/**
 * Loads only the explicit selection file; there is no directory scan or
 * automatic discovery. A missing file means that this optional build starts
 * with no active Mods.
 */
export async function loadVnLastSoundCheckBrowserModSourcesV1(input: {
  readonly selectionUrl: URL;
  readonly fetch?: VnLastSoundCheckBrowserModFetchV1;
}): Promise<readonly VnLastSoundCheckDeclarativeModArtifactSourceV1[]> {
  const fetchV1 = input.fetch ?? fetch;
  let response: Response;
  try {
    response = await fetchV1(input.selectionUrl, { cache: "no-store" });
  } catch (error) {
    throw new VnLastSoundCheckDeclarativeModErrorV1(
      "declarative_mod.resource_load_failed",
      input.selectionUrl.href,
      error,
    );
  }
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new VnLastSoundCheckDeclarativeModErrorV1(
      "declarative_mod.resource_load_failed",
      `${input.selectionUrl.href}:${response.status}`,
    );
  }
  const selectionBytes = await readBoundedResponseV1(
    response,
    input.selectionUrl,
    selectionLimitsV1.maxBytes,
  );
  const selection = admitVnLastSoundCheckBrowserModSelectionV1(selectionBytes);
  const sources: VnLastSoundCheckDeclarativeModArtifactSourceV1[] = [];
  let manifestBytesTotal = 0;
  for (const { manifestPath } of selection.mods) {
    const manifestUrl = sameOriginUrlV1(manifestPath, input.selectionUrl);
    const manifestBytes = await fetchBoundedBytesV1(
      fetchV1,
      manifestUrl,
      maxArtifactManifestBytesV1,
    );
    manifestBytesTotal += manifestBytes.byteLength;
    if (manifestBytesTotal > vnLastSoundCheckDeclarativeModResourceBudgetBytesV1) {
      throw new VnLastSoundCheckDeclarativeModErrorV1(
        "declarative_mod.resource_too_large",
        "selection-total",
      );
    }
    sources.push({
      manifestBytes,
      readResource: (path: string) =>
        fetchBoundedBytesV1(
          fetchV1,
          sameOriginUrlV1(path, manifestUrl),
          maxArtifactResourceBytesV1,
        ),
    });
  }
  return sources;
}

export function createVnLastSoundCheckModTextPackLoaderV1(
  selection: VnLastSoundCheckDeclarativeModSelectionV1,
  fallback: (
    descriptor: TextContentPackDescriptorV1,
    variant: TextContentPackVariantDescriptorV1,
  ) => Promise<Uint8Array>,
): (
  descriptor: TextContentPackDescriptorV1,
  variant: TextContentPackVariantDescriptorV1,
) => Promise<Uint8Array> {
  return async (descriptor, variant) => {
    const override = selection.textOverridesByRuntimePath.get(variant.runtimePath);
    return override === undefined ? await fallback(descriptor, variant) : override.bytes.slice();
  };
}

function defaultImageEnvironmentV1(): VnLastSoundCheckBrowserImageEnvironmentV1 {
  return {
    resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
    createImage: () => new Image(),
    createObjectUrl: (bytes, mediaType) =>
      URL.createObjectURL(new Blob([bytes.slice().buffer], { type: mediaType })),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
  };
}

/** Owns every generated object URL until the Web application's loader retires. */
export function createVnLastSoundCheckModAssetLoaderV1(
  selection: VnLastSoundCheckDeclarativeModSelectionV1,
  environment: VnLastSoundCheckBrowserImageEnvironmentV1 = defaultImageEnvironmentV1(),
): RuntimeAssetLoaderV1 {
  const overrideUrls = new Map<string, string>();
  try {
    for (const override of selection.assetOverridesByRuntimePath.values()) {
      overrideUrls.set(
        override.runtimePath,
        environment.createObjectUrl(override.bytes, override.mediaType),
      );
    }
  } catch (error) {
    for (const url of overrideUrls.values()) environment.revokeObjectUrl(url);
    throw error;
  }
  const loader = createBrowserImageLoaderV1({
    resolveRuntimeUrl: (runtimePath) =>
      overrideUrls.get(runtimePath) ?? environment.resolveRuntimeUrl(runtimePath),
    createImage: environment.createImage,
  });
  let disposed = false;
  return {
    cacheKey: (request) => loader.cacheKey(request),
    load: (request, signal) => loader.load(request, signal),
    dispose() {
      if (disposed) return;
      disposed = true;
      loader.dispose();
      for (const url of overrideUrls.values()) environment.revokeObjectUrl(url);
      overrideUrls.clear();
    },
  };
}

export async function validateVnLastSoundCheckBrowserImageOverrideV1(
  input: {
    readonly bytes: Uint8Array;
    readonly mediaType: VnLastSoundCheckPreparedAssetOverrideV1["mediaType"];
    readonly width: number;
    readonly height: number;
  },
  environment: VnLastSoundCheckBrowserImageEnvironmentV1 = defaultImageEnvironmentV1(),
): Promise<void> {
  const url = environment.createObjectUrl(input.bytes, input.mediaType);
  const image = environment.createImage();
  try {
    image.src = url;
    await image.decode();
    if (image.naturalWidth !== input.width || image.naturalHeight !== input.height) {
      throw new TypeError(
        `image dimensions ${image.naturalWidth}x${image.naturalHeight} != ${input.width}x${input.height}`,
      );
    }
  } finally {
    image.src = "";
    environment.revokeObjectUrl(url);
  }
}
