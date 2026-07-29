// SPDX-License-Identifier: MIT
import type { SaveSlotIdV1 } from "../../contracts/application.ts";
import { isSaveSlotIdShapeV1 } from "../../contracts/application.ts";
import type { HostRecordKeyV1 } from "../../contracts/host.ts";

function encodeStoryScopeV1(storyId: string): string {
  if (typeof storyId !== "string" || storyId.length === 0) {
    throw new TypeError("invalid Story ID for Host record key");
  }
  return encodeURIComponent(storyId);
}

export function createSaveSlotRecordKeyV1(storyId: string, slotId: SaveSlotIdV1): HostRecordKeyV1 {
  if (!isSaveSlotIdShapeV1(slotId)) throw new TypeError("invalid Save slot ID");
  return `save-record.v1:${encodeStoryScopeV1(storyId)}:${slotId}` as HostRecordKeyV1;
}

export function createSessionLeaseRecordKeyV1(storyId: string): HostRecordKeyV1 {
  return `session-lease.v1:${encodeStoryScopeV1(storyId)}` as HostRecordKeyV1;
}
