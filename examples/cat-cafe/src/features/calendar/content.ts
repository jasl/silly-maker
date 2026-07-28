// SPDX-License-Identifier: MIT
// 日历切片·常量：时段枚举（小而闭合，作为普通常量而非表）。
export const catcafeSlotsV1 = ["morning", "noon", "dusk", "night"] as const;
export type CatcafeSlotV1 = (typeof catcafeSlotsV1)[number];
