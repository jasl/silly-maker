// SPDX-License-Identifier: MIT
// Cat slice · constants: growth stages (0 kitten / 1 junior / 2 adolescent; advancing by week 1–2 / 3–4 / 5–7).
export const catcafeStageForWeekV1 = (week: number): number => (week >= 5 ? 2 : week >= 3 ? 1 : 0);
