// SPDX-License-Identifier: MIT
// Minesweeper slice · rules: pure functions — mine placement (RNG injected), flood reveal,
// win/loss determination. All inputs/outputs JSON-safe; the same RNG state replays the same minefield.
import type { OsBoardV1, OsCellV1 } from "../../state.ts";
import { osCellFlaggedV1, osCellMineV1, osCellRevealedV1 } from "../../state.ts";

export interface OsMinePresetV1 {
  readonly width: number;
  readonly height: number;
  readonly mines: number;
}

export const osMinePresetsV1: Readonly<Record<string, OsMinePresetV1>> = {
  beginner: { width: 9, height: 9, mines: 10 },
  intermediate: { width: 16, height: 16, mines: 40 },
  expert: { width: 30, height: 16, mines: 99 },
};

export function osBoardConfigValidV1(width: number, height: number, mines: number): boolean {
  if (width < 5 || width > 40 || height < 5 || height > 30) return false;
  // First-click-safe placement needs at least one non-mine cell.
  return mines >= 1 && mines <= width * height - 1;
}

export function osCreateBoardV1(width: number, height: number, mines: number): OsBoardV1 {
  return ({
    width,
    height,
    mineCount: mines,
    minesPlaced: false,
    status: "playing",
    cells: Array.from({ length: width * height }, (): OsCellV1 => 0),
  });
}

/**
 * Mines are placed on the first reveal: draw mineCount cells uniformly from the positions
 * excluding the first click (partial Fisher-Yates; each draw consumes one RNG step, replay-
 * consistent). Classic Win98 semantics: the first-clicked cell itself is never a mine (neighbors not excluded).
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
  return ({ ...board, minesPlaced: true, cells: cells });
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

/** Iterative flood: reveal index; zero-adjacent cells spread to neighbors (flagged cells never auto-reveal). */
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
  return ({ ...board, cells: cells });
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
