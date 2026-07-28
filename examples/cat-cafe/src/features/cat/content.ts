// SPDX-License-Identifier: MIT
// 猫切片·常量：成长阶段（0 奶猫 / 1 幼猫 / 2 少年猫；按周推进 1–2 / 3–4 / 5–7）。
export const catcafeStageForWeekV1 = (week: number): number => (week >= 5 ? 2 : week >= 3 ? 1 : 0);
