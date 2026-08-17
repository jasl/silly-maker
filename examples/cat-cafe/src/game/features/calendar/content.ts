// SPDX-License-Identifier: MIT
// Calendar slice · constants: the time-slot enum (small and closed; an ordinary constant, not a table).
export const catcafeSlotsV1 = ["morning", "noon", "dusk", "night"] as const;
export type CatcafeSlotV1 = (typeof catcafeSlotsV1)[number];
