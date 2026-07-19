// SPDX-License-Identifier: MIT
import type { Brand } from "./values.js";
import { parseModuleId } from "./values.js";

export type TextId = Brand<string, "TextId">;
export type LocaleId = Brand<string, "LocaleId">;
export type AssetId = Brand<string, "AssetId">;
export type StageSceneId = Brand<string, "StageSceneId">;
export type StageSceneVariantId = Brand<string, "StageSceneVariantId">;
export type CharacterId = Brand<string, "CharacterId">;
export type CharacterRigId = Brand<string, "CharacterRigId">;
export type CharacterPoseId = Brand<string, "CharacterPoseId">;
export type CharacterExpressionId = Brand<string, "CharacterExpressionId">;
export type CharacterActivityId = Brand<string, "CharacterActivityId">;
export type AppearanceLayerId = Brand<string, "AppearanceLayerId">;
export type HitMapId = Brand<string, "HitMapId">;
export type HitAreaId = Brand<string, "HitAreaId">;
export type InteractionSurfaceId = Brand<string, "InteractionSurfaceId">;
export type InteractionTargetId = Brand<string, "InteractionTargetId">;
export type InteractionBehaviorId = Brand<string, "InteractionBehaviorId">;
export type PresentationProviderId = Brand<string, "PresentationProviderId">;
export type ContentMaturityFlagId = Brand<string, "ContentMaturityFlagId">;
export type ContentPreferencePresetId = Brand<string, "ContentPreferencePresetId">;
export type ContentMaturityFlagsV1 = Brand<number, "ContentMaturityFlagsV1">;
declare const contentMaturityFlagBitBrand: unique symbol;
export type ContentMaturityFlagBitV1 = ContentMaturityFlagsV1 & {
  readonly [contentMaturityFlagBitBrand]: "ContentMaturityFlagBitV1";
};
export type NormalizedCoordinateV1 = Brand<number, "NormalizedCoordinateV1">;
export type NormalizedExtentV1 = Brand<number, "NormalizedExtentV1">;
export type PositiveFiniteNumber = Brand<number, "PositiveFiniteNumber">;
function parseStablePresentationId<TValue extends string>(value: unknown, label: string): TValue {
  try {
    return parseModuleId(value) as unknown as TValue;
  } catch {
    throw new TypeError(`invalid ${label}`);
  }
}

export function parseTextId(value: unknown): TextId {
  return parseStablePresentationId<TextId>(value, "TextId");
}

export function parseLocaleId(value: unknown): LocaleId {
  if (typeof value !== "string") throw new TypeError("invalid LocaleId");
  let canonical: string;
  try {
    const canonicalLocales = Intl.getCanonicalLocales(value);
    canonical = canonicalLocales[0] ?? "";
  } catch {
    throw new TypeError("invalid LocaleId");
  }
  if (canonical !== value) throw new TypeError("invalid LocaleId");
  return value as LocaleId;
}

export function parseAssetId(value: unknown): AssetId {
  return parseStablePresentationId<AssetId>(value, "AssetId");
}

export function parseStageSceneId(value: unknown): StageSceneId {
  return parseStablePresentationId<StageSceneId>(value, "StageSceneId");
}

export function parseStageSceneVariantId(value: unknown): StageSceneVariantId {
  return parseStablePresentationId<StageSceneVariantId>(value, "StageSceneVariantId");
}

export function parseCharacterId(value: unknown): CharacterId {
  return parseStablePresentationId<CharacterId>(value, "CharacterId");
}

export function parseCharacterRigId(value: unknown): CharacterRigId {
  return parseStablePresentationId<CharacterRigId>(value, "CharacterRigId");
}

export function parseCharacterPoseId(value: unknown): CharacterPoseId {
  return parseStablePresentationId<CharacterPoseId>(value, "CharacterPoseId");
}

export function parseCharacterExpressionId(value: unknown): CharacterExpressionId {
  return parseStablePresentationId<CharacterExpressionId>(value, "CharacterExpressionId");
}

export function parseCharacterActivityId(value: unknown): CharacterActivityId {
  return parseStablePresentationId<CharacterActivityId>(value, "CharacterActivityId");
}

export function parseAppearanceLayerId(value: unknown): AppearanceLayerId {
  return parseStablePresentationId<AppearanceLayerId>(value, "AppearanceLayerId");
}

export function parseHitMapId(value: unknown): HitMapId {
  return parseStablePresentationId<HitMapId>(value, "HitMapId");
}

export function parseHitAreaId(value: unknown): HitAreaId {
  return parseStablePresentationId<HitAreaId>(value, "HitAreaId");
}

export function parseInteractionSurfaceId(value: unknown): InteractionSurfaceId {
  return parseStablePresentationId<InteractionSurfaceId>(value, "InteractionSurfaceId");
}

export function parseInteractionTargetId(value: unknown): InteractionTargetId {
  return parseStablePresentationId<InteractionTargetId>(value, "InteractionTargetId");
}

export function parseInteractionBehaviorId(value: unknown): InteractionBehaviorId {
  return parseStablePresentationId<InteractionBehaviorId>(value, "InteractionBehaviorId");
}

export function parsePresentationProviderId(value: unknown): PresentationProviderId {
  return parseStablePresentationId<PresentationProviderId>(value, "PresentationProviderId");
}

export function parseContentMaturityFlagId(value: unknown): ContentMaturityFlagId {
  return parseStablePresentationId<ContentMaturityFlagId>(value, "ContentMaturityFlagId");
}

export function parseContentPreferencePresetId(value: unknown): ContentPreferencePresetId {
  return parseStablePresentationId<ContentPreferencePresetId>(value, "ContentPreferencePresetId");
}

function parseFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
}

export function parseNormalizedCoordinateV1(value: unknown): NormalizedCoordinateV1 {
  const parsed = parseFiniteNumber(value, "NormalizedCoordinateV1");
  if (parsed < 0 || parsed > 1) throw new TypeError("invalid NormalizedCoordinateV1");
  return parsed as NormalizedCoordinateV1;
}

export function parseNormalizedExtentV1(value: unknown): NormalizedExtentV1 {
  const parsed = parseFiniteNumber(value, "NormalizedExtentV1");
  if (parsed <= 0 || parsed > 1) throw new TypeError("invalid NormalizedExtentV1");
  return parsed as NormalizedExtentV1;
}

export function parsePositiveFiniteNumber(value: unknown): PositiveFiniteNumber {
  const parsed = parseFiniteNumber(value, "PositiveFiniteNumber");
  if (parsed <= 0) throw new TypeError("invalid PositiveFiniteNumber");
  return parsed as PositiveFiniteNumber;
}

export function parseContentMaturityFlagsV1(value: unknown): ContentMaturityFlagsV1 {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    Object.is(value, -0) ||
    value < 0 ||
    value > 0xffff_ffff
  ) {
    throw new TypeError("content_maturity.mask");
  }
  return value as ContentMaturityFlagsV1;
}

export function parseContentMaturityFlagBitV1(value: unknown): ContentMaturityFlagBitV1 {
  let parsed: ContentMaturityFlagsV1;
  try {
    parsed = parseContentMaturityFlagsV1(value);
  } catch {
    throw new TypeError("content_maturity.flag");
  }
  if (parsed === 0 || (((parsed & (parsed - 1)) >>> 0) as number) !== 0) {
    throw new TypeError("content_maturity.flag");
  }
  return parsed as ContentMaturityFlagBitV1;
}

export const emptyContentMaturityFlagsV1 = 0 as ContentMaturityFlagsV1;
