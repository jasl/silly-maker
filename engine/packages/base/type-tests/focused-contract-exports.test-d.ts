// SPDX-License-Identifier: MIT
import type { ApplicationHostCapabilitiesV1 } from "@sillymaker/base/host";
import type { StrictJsonObjectV1 } from "@sillymaker/base/strict-json";
import { parseStrictJson, parseStrictJsonLimitsV1 } from "@sillymaker/base/strict-json";
import {
  createTextContentSessionV1,
  defineTextContentManifestV1,
  parseLocaleId,
  parseTextContentPackIdV1,
  parseTextId,
} from "@sillymaker/base/text-content";

declare const hostV1: ApplicationHostCapabilitiesV1;
declare const detailsV1: StrictJsonObjectV1;
hostV1.log.write("info", "focused.contracts.available", detailsV1);
void parseStrictJson;
void parseStrictJsonLimitsV1;
void createTextContentSessionV1;
void defineTextContentManifestV1;
void parseLocaleId;
void parseTextContentPackIdV1;
void parseTextId;

// @ts-expect-error Package-internal seeded test stores are not public Host contracts.
export { createSeededMemoryHostRecordStoreInternalV1 } from "@sillymaker/base/host";
// @ts-expect-error Package-internal Save encoding is not a public Strict JSON contract.
export { canonicalJsonBytesWithStrictLimitsInternalV1 } from "@sillymaker/base/strict-json";
// @ts-expect-error Game authoring is not part of the focused Text Content contract.
export { defineGameSimulation } from "@sillymaker/base/text-content";
