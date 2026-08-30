// SPDX-License-Identifier: MIT
import {
  admitTextContentPackV1,
  parseStrictJson,
  parseStrictJsonLimitsV1,
  type TextContentPackDescriptorV1,
  type TextContentPackVariantDescriptorV1,
} from "@sillymaker/base";

import { vnLastSoundCheckAssetPacksV1, vnLastSoundCheckAssetSlotsV1 } from "../content/assets.ts";
import { vnLastSoundCheckTextContentManifestV1 } from "../content/text-content.ts";

export const vnLastSoundCheckDeclarativeModTargetV1 = {
  applicationId: "example-vn-last-sound-check",
  applicationVersion: "0.0.0",
  storyId: "story.example.vn-last-sound-check",
  storyRevision: 4,
  overrideContractRevision: 1,
} as const;

const manifestMaxNodesV1 = 1_024;
const manifestLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 1_048_576,
  maxDepth: 6,
  maxArrayItems: manifestMaxNodesV1,
  maxObjectMembers: 16,
  maxNodes: manifestMaxNodesV1,
  maxStringBytes: 4_096,
});
const maxTextPackBytesV1 = 16_777_216;
const maxAssetBytesV1 = 33_554_432;
export const vnLastSoundCheckDeclarativeModResourceBudgetBytesV1 = 268_435_456;

export type VnLastSoundCheckDeclarativeModErrorCodeV1 =
  | "declarative_mod.manifest_json_invalid"
  | "declarative_mod.manifest_shape_invalid"
  | "declarative_mod.target_mismatch"
  | "declarative_mod.slot_unknown"
  | "declarative_mod.slot_duplicate"
  | "declarative_mod.slot_collision"
  | "declarative_mod.resource_path_invalid"
  | "declarative_mod.resource_load_failed"
  | "declarative_mod.resource_too_large"
  | "declarative_mod.text_pack_invalid"
  | "declarative_mod.text_pack_entries_mismatch"
  | "declarative_mod.asset_invalid";

export class VnLastSoundCheckDeclarativeModErrorV1 extends TypeError {
  override readonly name = "VnLastSoundCheckDeclarativeModErrorV1";

  constructor(
    readonly code: VnLastSoundCheckDeclarativeModErrorCodeV1,
    readonly reference: string,
    cause?: unknown,
  ) {
    super(`${code}:${reference}`, cause === undefined ? undefined : { cause });
  }
}

export interface VnLastSoundCheckDeclarativeModArtifactSourceV1 {
  readonly manifestBytes: Uint8Array;
  readResource(path: string): Promise<Uint8Array>;
}

interface VnLastSoundCheckTextOverrideDefinitionV1 {
  readonly slotId: string;
  readonly path: string;
}

interface VnLastSoundCheckAssetOverrideDefinitionV1 {
  readonly slotId: string;
  readonly path: string;
}

export interface VnLastSoundCheckDeclarativeModManifestV1 {
  readonly format: "sillymaker.declarative-mod";
  readonly version: 1;
  readonly modId: string;
  readonly modVersion: string;
  readonly target: typeof vnLastSoundCheckDeclarativeModTargetV1;
  readonly textOverrides: readonly VnLastSoundCheckTextOverrideDefinitionV1[];
  readonly assetOverrides: readonly VnLastSoundCheckAssetOverrideDefinitionV1[];
}

export interface VnLastSoundCheckPreparedTextOverrideV1 {
  readonly slotId: string;
  readonly runtimePath: string;
  readonly bytes: Uint8Array;
}

export interface VnLastSoundCheckPreparedAssetOverrideV1 {
  readonly slotId: string;
  readonly runtimePath: string;
  readonly mediaType: "image/webp" | "image/png" | "image/svg+xml";
  readonly width: number;
  readonly height: number;
  readonly bytes: Uint8Array;
}

export interface VnLastSoundCheckPreparedDeclarativeModV1 {
  readonly manifest: VnLastSoundCheckDeclarativeModManifestV1;
  readonly textOverrides: readonly VnLastSoundCheckPreparedTextOverrideV1[];
  readonly assetOverrides: readonly VnLastSoundCheckPreparedAssetOverrideV1[];
}

export interface PrepareVnLastSoundCheckDeclarativeModOptionsV1 {
  loadBaseTextPackBytes(
    descriptor: TextContentPackDescriptorV1,
    variant: TextContentPackVariantDescriptorV1,
  ): Promise<Uint8Array>;
  validateAsset(input: {
    readonly bytes: Uint8Array;
    readonly mediaType: VnLastSoundCheckPreparedAssetOverrideV1["mediaType"];
    readonly width: number;
    readonly height: number;
  }): Promise<void>;
  /** May lower, but never raise, the product's 256 MiB resource budget. */
  readonly resourceBudgetBytes?: number;
}

interface TextSlotV1 {
  readonly slotId: string;
  readonly descriptor: TextContentPackDescriptorV1;
  readonly variant: TextContentPackVariantDescriptorV1;
}

interface AssetSlotV1 {
  readonly slotId: string;
  readonly runtimePath: string;
  readonly mediaType: VnLastSoundCheckPreparedAssetOverrideV1["mediaType"];
  readonly width: number;
  readonly height: number;
}

function failV1(
  code: VnLastSoundCheckDeclarativeModErrorCodeV1,
  reference: string,
  cause?: unknown,
): never {
  throw new VnLastSoundCheckDeclarativeModErrorV1(code, reference, cause);
}

function exactRecordV1(
  value: unknown,
  keys: readonly string[],
  reference: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return failV1("declarative_mod.manifest_shape_invalid", reference);
  }
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record);
  if (actual.length !== keys.length || keys.some((key) => !Object.hasOwn(record, key))) {
    return failV1("declarative_mod.manifest_shape_invalid", reference);
  }
  return record;
}

function parseIdentifierV1(value: unknown, reference: string): string {
  if (
    typeof value !== "string" ||
    !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(value)
  ) {
    return failV1("declarative_mod.manifest_shape_invalid", reference);
  }
  return value;
}

function parseVersionV1(value: unknown, reference: string): string {
  if (
    typeof value !== "string" ||
    !/^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u.test(value)
  ) {
    return failV1("declarative_mod.manifest_shape_invalid", reference);
  }
  return value;
}

function parseResourcePathV1(value: unknown, reference: string): string {
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
    return failV1("declarative_mod.resource_path_invalid", reference);
  }
  return value;
}

const textSlotsV1 = new Map<string, TextSlotV1>();
for (const descriptor of vnLastSoundCheckTextContentManifestV1.packs) {
  for (const variant of descriptor.variants) {
    const slotId = `${descriptor.packId}:${variant.locale}`;
    textSlotsV1.set(slotId, { slotId, descriptor, variant });
  }
}

const providersByAssetIdV1 = new Map(
  vnLastSoundCheckAssetPacksV1.flatMap((pack) => pack.providers).map((provider) =>
    [
      provider.assetId,
      provider,
    ] as const
  ),
);
const assetSlotsV1 = new Map<string, AssetSlotV1>();
for (const slot of vnLastSoundCheckAssetSlotsV1) {
  if (slot.overridePolicy !== "replaceable") continue;
  const provider = providersByAssetIdV1.get(slot.assetId);
  if (provider === undefined) continue;
  assetSlotsV1.set(slot.assetId, {
    slotId: slot.assetId,
    runtimePath: provider.runtimePath,
    mediaType: provider.mediaType,
    width: provider.width,
    height: provider.height,
  });
}

function parseOverrideDefinitionsV1(
  value: unknown,
  kind: "text" | "asset",
): readonly (
  | VnLastSoundCheckTextOverrideDefinitionV1
  | VnLastSoundCheckAssetOverrideDefinitionV1
)[] {
  if (!Array.isArray(value)) {
    return failV1("declarative_mod.manifest_shape_invalid", `${kind}Overrides`);
  }
  const known = kind === "text" ? textSlotsV1 : assetSlotsV1;
  const seen = new Set<string>();
  return value.map((candidate, index) => {
    const reference = `${kind}Overrides/${index}`;
    const record = exactRecordV1(
      candidate,
      ["slotId", "path"],
      reference,
    );
    if (typeof record.slotId !== "string" || !known.has(record.slotId)) {
      return failV1("declarative_mod.slot_unknown", `${reference}/slotId`);
    }
    if (seen.has(record.slotId)) {
      return failV1("declarative_mod.slot_duplicate", record.slotId);
    }
    seen.add(record.slotId);
    const base = {
      slotId: record.slotId,
      path: parseResourcePathV1(record.path, `${reference}/path`),
    };
    return base;
  });
}

/** Admits only the small JSON manifest. Resource bytes are staged separately below. */
export function admitVnLastSoundCheckDeclarativeModManifestV1(
  bytes: Uint8Array,
): VnLastSoundCheckDeclarativeModManifestV1 {
  const parsed = parseStrictJson(bytes, manifestLimitsV1);
  if (!parsed.ok) {
    return failV1("declarative_mod.manifest_json_invalid", parsed.error.code);
  }
  const root = exactRecordV1(parsed.value, [
    "format",
    "version",
    "modId",
    "modVersion",
    "target",
    "textOverrides",
    "assetOverrides",
  ], "manifest");
  if (root.format !== "sillymaker.declarative-mod" || root.version !== 1) {
    return failV1("declarative_mod.manifest_shape_invalid", "format");
  }
  const target = exactRecordV1(root.target, [
    "applicationId",
    "applicationVersion",
    "storyId",
    "storyRevision",
    "overrideContractRevision",
  ], "target");
  for (const [key, expected] of Object.entries(vnLastSoundCheckDeclarativeModTargetV1)) {
    if (target[key] !== expected) {
      return failV1("declarative_mod.target_mismatch", key);
    }
  }
  const textOverrides = parseOverrideDefinitionsV1(root.textOverrides, "text");
  const assetOverrides = parseOverrideDefinitionsV1(root.assetOverrides, "asset");
  if (textOverrides.length === 0 && assetOverrides.length === 0) {
    return failV1("declarative_mod.manifest_shape_invalid", "overrides-empty");
  }
  return {
    format: "sillymaker.declarative-mod",
    version: 1,
    modId: parseIdentifierV1(root.modId, "modId"),
    modVersion: parseVersionV1(root.modVersion, "modVersion"),
    target: vnLastSoundCheckDeclarativeModTargetV1,
    textOverrides,
    assetOverrides,
  };
}

async function readBoundedResourceV1(
  source: VnLastSoundCheckDeclarativeModArtifactSourceV1,
  path: string,
  maxBytes: number,
): Promise<Uint8Array> {
  let bytes: Uint8Array;
  try {
    bytes = await source.readResource(path);
  } catch (error) {
    return failV1("declarative_mod.resource_load_failed", path, error);
  }
  if (!(bytes instanceof Uint8Array)) {
    return failV1("declarative_mod.resource_load_failed", path);
  }
  if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) {
    return failV1("declarative_mod.resource_too_large", path);
  }
  return bytes.slice();
}

function sameTextIdsV1(
  left: ReadonlyMap<unknown, string>,
  right: ReadonlyMap<unknown, string>,
): boolean {
  if (left.size !== right.size) return false;
  for (const textId of left.keys()) {
    if (!right.has(textId)) return false;
  }
  return true;
}

/**
 * Stages every declared resource before publication. The resulting bytes are
 * detached from the source, so later file mutation cannot alter an active Mod.
 */
export async function prepareVnLastSoundCheckDeclarativeModV1(
  source: VnLastSoundCheckDeclarativeModArtifactSourceV1,
  options: PrepareVnLastSoundCheckDeclarativeModOptionsV1,
): Promise<VnLastSoundCheckPreparedDeclarativeModV1> {
  const resourceBudgetBytes = options.resourceBudgetBytes ??
    vnLastSoundCheckDeclarativeModResourceBudgetBytesV1;
  if (
    !Number.isSafeInteger(resourceBudgetBytes) ||
    resourceBudgetBytes < 0 ||
    resourceBudgetBytes > vnLastSoundCheckDeclarativeModResourceBudgetBytesV1
  ) {
    return failV1("declarative_mod.resource_too_large", "artifact-budget");
  }
  const manifest = admitVnLastSoundCheckDeclarativeModManifestV1(source.manifestBytes);
  const textOverrides: VnLastSoundCheckPreparedTextOverrideV1[] = [];
  const assetOverrides: VnLastSoundCheckPreparedAssetOverrideV1[] = [];
  let totalBytes = source.manifestBytes.byteLength;
  if (totalBytes > resourceBudgetBytes) {
    return failV1("declarative_mod.resource_too_large", "artifact-total");
  }

  for (const definition of manifest.textOverrides) {
    const slot = textSlotsV1.get(definition.slotId)!;
    const [bytes, baseBytes] = await Promise.all([
      readBoundedResourceV1(source, definition.path, maxTextPackBytesV1),
      options.loadBaseTextPackBytes(slot.descriptor, slot.variant),
    ]);
    totalBytes += bytes.byteLength;
    if (totalBytes > resourceBudgetBytes) {
      return failV1("declarative_mod.resource_too_large", "artifact-total");
    }
    try {
      const admitted = admitTextContentPackV1(slot.descriptor, slot.variant, bytes);
      const base = admitTextContentPackV1(slot.descriptor, slot.variant, baseBytes);
      if (!sameTextIdsV1(admitted.entries, base.entries)) {
        return failV1("declarative_mod.text_pack_entries_mismatch", definition.slotId);
      }
    } catch (error) {
      if (error instanceof VnLastSoundCheckDeclarativeModErrorV1) throw error;
      return failV1("declarative_mod.text_pack_invalid", definition.slotId, error);
    }
    textOverrides.push({
      slotId: definition.slotId,
      runtimePath: slot.variant.runtimePath,
      bytes,
    });
  }

  for (const definition of manifest.assetOverrides) {
    const slot = assetSlotsV1.get(definition.slotId)!;
    const bytes = await readBoundedResourceV1(source, definition.path, maxAssetBytesV1);
    totalBytes += bytes.byteLength;
    if (totalBytes > resourceBudgetBytes) {
      return failV1("declarative_mod.resource_too_large", "artifact-total");
    }
    try {
      await options.validateAsset({
        bytes,
        mediaType: slot.mediaType,
        width: slot.width,
        height: slot.height,
      });
    } catch (error) {
      return failV1("declarative_mod.asset_invalid", definition.slotId, error);
    }
    assetOverrides.push({ ...slot, bytes });
  }

  return { manifest, textOverrides, assetOverrides };
}
