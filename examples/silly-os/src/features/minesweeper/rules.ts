// SPDX-License-Identifier: MIT
// 扫雷切片·规则：纯函数——布雷（RNG 注入）、洪泛翻格、胜负判定。
// 全部输入输出 JSON-safe；同一 RNG 状态重放得到同一雷区。
import type { OsBoardV1, OsCellV1 } from "../../state.ts";
import { osCellFlaggedV1, osCellMineV1, osCellRevealedV1 } from "../../state.ts";

export interface OsMinePresetV1 {
  readonly width: number;
  readonly height: number;
  readonly mines: number;
}

export const osMinePresetsV1: Readonly<Record<string, OsMinePresetV1>> = Object.freeze({
  beginner: Object.freeze({ width: 9, height: 9, mines: 10 }),
  intermediate: Object.freeze({ width: 16, height: 16, mines: 40 }),
  expert: Object.freeze({ width: 30, height: 16, mines: 99 }),
});

export function osBoardConfigValidV1(width: number, height: number, mines: number): boolean {
  if (width < 5 || width > 40 || height < 5 || height > 30) return false;
  // 首点安全布雷需要至少一个非雷格。
  return mines >= 1 && mines <= width * height - 1;
}

export function osCreateBoardV1(width: number, height: number, mines: number): OsBoardV1 {
  return Object.freeze({
    width,
    height,
    mineCount: mines,
    minesPlaced: false,
    status: "playing",
    cells: Object.freeze(Array.from({ length: width * height }, (): OsCellV1 => 0)),
  });
}

/**
 * 首次翻格时布雷：在排除首点的位置里等概率抽 mineCount 个（部分
 * Fisher-Yates；每次抽取消耗一次 RNG，重放一致）。经典 Win98 语义：
 * 首点本格永不是雷（不排除邻域）。
 */
export function osPlaceMinesV1(
  board: OsBoardV1,
  exclude: number,
  nextInt: (exclusiveMax: number) => number,
): OsBoardV1 {
  const positions: number[] = [];
  for (let index = 0; index < board.cells.length; index += 1) {
    if (index !== exclude) positions.push(index);
  }
  const cells = [...board.cells];
  for (let draw = 0; draw < board.mineCount; draw += 1) {
    const pick = draw + nextInt(positions.length - draw);
    const chosen = positions[pick] as number;
    positions[pick] = positions[draw] as number;
    positions[draw] = chosen;
    cells[chosen] = (cells[chosen] as number) | osCellMineV1;
  }
  return Object.freeze({ ...board, minesPlaced: true, cells: Object.freeze(cells) });
}

export function osNeighborsV1(board: OsBoardV1, index: number): readonly number[] {
  const x = index % board.width;
  const y = Math.floor(index / board.width);
  const neighbors: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) continue;
      neighbors.push(ny * board.width + nx);
    }
  }
  return neighbors;
}

export function osAdjacentMinesV1(board: OsBoardV1, index: number): number {
  let count = 0;
  for (const neighbor of osNeighborsV1(board, index)) {
    if (((board.cells[neighbor] as number) & osCellMineV1) !== 0) count += 1;
  }
  return count;
}

/** 迭代洪泛：翻开 index；零邻雷时扩散到邻域（旗标格不自动翻开）。 */
export function osRevealFloodV1(board: OsBoardV1, index: number): OsBoardV1 {
  const cells = [...board.cells];
  const stack = [index];
  while (stack.length > 0) {
    const current = stack.pop() as number;
    const cell = cells[current] as number;
    if ((cell & osCellRevealedV1) !== 0) continue;
    if ((cell & osCellFlaggedV1) !== 0 && current !== index) continue;
    cells[current] = (cell | osCellRevealedV1) & ~osCellFlaggedV1;
    if (osAdjacentMinesV1({ ...board, cells }, current) === 0) {
      for (const neighbor of osNeighborsV1(board, current)) {
        if (((cells[neighbor] as number) & osCellRevealedV1) === 0) stack.push(neighbor);
      }
    }
  }
  return Object.freeze({ ...board, cells: Object.freeze(cells) });
}

export function osBoardWonV1(board: OsBoardV1): boolean {
  for (const cell of board.cells) {
    const mine = (cell & osCellMineV1) !== 0;
    const revealed = (cell & osCellRevealedV1) !== 0;
    if (!mine && !revealed) return false;
  }
  return true;
}

export function osFlagsUsedV1(board: OsBoardV1): number {
  let flags = 0;
  for (const cell of board.cells) {
    if ((cell & osCellFlaggedV1) !== 0) flags += 1;
  }
  return flags;
}
