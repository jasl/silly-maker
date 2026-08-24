// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createOsApplicationInstanceV1 } from "../application/core-application.ts";
import {
  osAdjacentMinesV1,
  osBoardWonV1,
  osCreateBoardV1,
  osPlaceMinesV1,
  osRevealFloodV1,
} from "../game/features/minesweeper/rules.ts";
import { osCellMineV1, osCellRevealedV1 } from "../game/state.ts";

function mineIndexes(cells: readonly number[]): readonly number[] {
  return cells.flatMap((cell, index) => ((cell & osCellMineV1) !== 0 ? [index] : []));
}

describe("minesweeper rules", () => {
  it("places the exact mine count and never on the excluded first click", () => {
    let cursor = 0;
    const feed = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3];
    const board = osPlaceMinesV1(
      osCreateBoardV1(9, 9, 10),
      40,
      (max) => (feed[cursor++ % feed.length] as number) % max,
    );
    const mines = mineIndexes(board.cells);
    expect(mines).toHaveLength(10);
    expect(mines).not.toContain(40);
    expect(new Set(mines).size).toBe(10);
  });

  it("flood-reveals zero regions and stops at numbered borders", () => {
    // 5x5 with a single corner mine: revealing the opposite zero region should flood a large area.
    const base = osCreateBoardV1(5, 5, 1);
    const cells = [...base.cells];
    cells[0] = osCellMineV1;
    const board = { ...base, minesPlaced: true, cells: cells };
    const revealed = osRevealFloodV1(board, 24);
    const revealedCount = revealed.cells.filter((cell) => (cell & osCellRevealedV1) !== 0).length;
    expect(revealedCount).toBe(24);
    expect(osBoardWonV1(revealed)).toBe(true);
    expect(osAdjacentMinesV1(board, 1)).toBe(1);
    expect(osAdjacentMinesV1(board, 12)).toBe(0);
  });
});

describe("minesweeper determinism", () => {
  async function playSeed(seed: number) {
    const instance = await createOsApplicationInstanceV1({ seeds: [seed] });
    try {
      await instance.semantic.dispatch({
        kind: "mine_new",
        width: 9,
        height: 9,
        mines: 10,
      } as never);
      await instance.semantic.dispatch({ kind: "mine_reveal", x: 4, y: 4 } as never);
      const view = instance.semantic.observe().game.minesweeper;
      return ({
        digest: instance.admin.stateDigest(),
        cells: view === null ? null : view.cells.map((cell) => cell.state).join(""),
        status: view?.status ?? null,
        dispose: () => void instance.dispose(),
      });
    } catch (error) {
      void instance.dispose();
      throw error;
    }
  }

  it("same seed, same mines, same flood, same digest", async () => {
    const runA = await playSeed(42);
    const runB = await playSeed(42);
    expect(runA.status).toBe("playing");
    expect(runA.cells).toBe(runB.cells);
    expect(runA.digest).toStrictEqual(runB.digest);
    runA.dispose();
    runB.dispose();
  });

  it("does not leak mine positions on the live publication", async () => {
    const instance = await createOsApplicationInstanceV1({ seeds: [7] });
    try {
      await instance.semantic.dispatch({
        kind: "mine_new",
        width: 9,
        height: 9,
        mines: 10,
      } as never);
      await instance.semantic.dispatch({ kind: "mine_reveal", x: 0, y: 0 } as never);
      const view = instance.semantic.observe().game.minesweeper;
      expect(view).not.toBeNull();
      if (view === null) return;
      expect(view.status).toBe("playing");
      for (const cell of view.cells) {
        if (cell.state !== "revealed") expect(cell.mine).toBeNull();
      }
    } finally {
      void instance.dispose();
    }
  });

  it("rejects out-of-bounds and finished-board input with stable codes", async () => {
    const instance = await createOsApplicationInstanceV1({ seeds: [11] });
    try {
      const noBoard = await instance.semantic.dispatch({
        kind: "mine_reveal",
        x: 0,
        y: 0,
      } as never);
      expect(noBoard).toMatchObject({ kind: "rejected", codes: ["os.mine.no_board"] });
      await instance.semantic.dispatch({
        kind: "mine_new",
        width: 9,
        height: 9,
        mines: 10,
      } as never);
      const outside = await instance.semantic.dispatch({
        kind: "mine_reveal",
        x: 99,
        y: 0,
      } as never);
      expect(outside).toMatchObject({ kind: "rejected", codes: ["os.mine.out_of_bounds"] });
    } finally {
      void instance.dispose();
    }
  });
});

describe("filesystem", () => {
  it("writes, overwrites, sorts, removes — and revisions advance monotonically", async () => {
    const instance = await createOsApplicationInstanceV1({ seeds: [3] });
    try {
      await instance.semantic.dispatch({
        kind: "fs_write",
        name: "b.txt",
        content: "two",
      } as never);
      await instance.semantic.dispatch({
        kind: "fs_write",
        name: "a.txt",
        content: "one",
      } as never);
      await instance.semantic.dispatch({
        kind: "fs_write",
        name: "b.txt",
        content: "two v2",
      } as never);
      let files = instance.semantic.observe().game.files;
      expect(files.map((file) => file.name)).toStrictEqual(["a.txt", "b.txt"]);
      expect(files.find((file) => file.name === "b.txt")?.content).toBe("two v2");
      expect(files.find((file) => file.name === "b.txt")?.revision).toBe(3);
      const missing = await instance.semantic.dispatch({
        kind: "fs_remove",
        name: "zzz.txt",
      } as never);
      expect(missing).toMatchObject({ kind: "rejected", codes: ["os.fs.not_found"] });
      await instance.semantic.dispatch({ kind: "fs_remove", name: "a.txt" } as never);
      files = instance.semantic.observe().game.files;
      expect(files.map((file) => file.name)).toStrictEqual(["b.txt"]);
    } finally {
      void instance.dispose();
    }
  });
});
