// SPDX-License-Identifier: MIT
// SillyOS's authoritative state: desktop preferences (wallpaper), filesystem (notepad
// documents), the minesweeper board. Window layout/focus/z-order is UI-transient — not here, not in saves.
import { z } from "zod";

import type { RuntimeSchemaV1 } from "@sillymaker/base";
import { fromStandardSchemaV1 } from "@sillymaker/base/authoring";

export const osWallpaperIdsV1 = ["teal", "clouds", "dusk"] as const;
export type OsWallpaperIdV1 = (typeof osWallpaperIdsV1)[number];

export interface OsDesktopStateV1 {
  readonly wallpaperId: string;
}

export const osDesktopStateSchemaV1: RuntimeSchemaV1<OsDesktopStateV1> = fromStandardSchemaV1(
  z.strictObject({ wallpaperId: z.enum(osWallpaperIdsV1) }),
  { subject: { kind: "module", id: "os.desktop" } },
);

export interface OsFileV1 extends Readonly<Record<string, unknown>> {
  readonly name: string;
  readonly content: string;
  /** Write count (a deterministic stand-in for "modified time": no wall clock in authoritative state). */
  readonly revision: number;
}

export interface OsFilesystemStateV1 {
  readonly files: readonly OsFileV1[];
  readonly writes: number;
}

export const osMaxFilesV1 = 64;
export const osMaxFileContentV1 = 16_384;

export const osFilesystemStateSchemaV1: RuntimeSchemaV1<OsFilesystemStateV1> = fromStandardSchemaV1(
  z.strictObject({
    files: z
      .array(
        z.strictObject({
          name: z.string().min(1).max(64),
          content: z.string().max(osMaxFileContentV1),
          revision: z.number().int().nonnegative(),
        }),
      )
      .max(osMaxFilesV1),
    writes: z.number().int().nonnegative(),
  }),
  { subject: { kind: "module", id: "os.filesystem" } },
);

/** Each cell packs into one small integer: bit0 mine / bit1 revealed / bit2 flag. */
export type OsCellV1 = number;
export const osCellMineV1 = 1;
export const osCellRevealedV1 = 2;
export const osCellFlaggedV1 = 4;

export interface OsBoardV1 {
  readonly width: number;
  readonly height: number;
  readonly mineCount: number;
  /** Mines are placed on the first reveal (first click never hits); false before placement. */
  readonly minesPlaced: boolean;
  readonly status: "playing" | "won" | "lost";
  readonly cells: readonly OsCellV1[];
}

export interface OsMinesweeperStateV1 {
  readonly board: OsBoardV1 | null;
}

export const osMinesweeperStateSchemaV1: RuntimeSchemaV1<OsMinesweeperStateV1> =
  fromStandardSchemaV1(
    z.strictObject({
      board: z
        .strictObject({
          width: z.number().int().min(5).max(40),
          height: z.number().int().min(5).max(30),
          mineCount: z.number().int().min(1),
          minesPlaced: z.boolean(),
          status: z.enum(["playing", "won", "lost"]),
          cells: z.array(z.number().int().min(0).max(7)),
        })
        .nullable(),
    }),
    { subject: { kind: "module", id: "os.minesweeper" } },
  );

export interface OsGameStateV1 {
  readonly simulation: {
    readonly desktop: OsDesktopStateV1;
    readonly filesystem: OsFilesystemStateV1;
    readonly minesweeper: OsMinesweeperStateV1;
  };
}

export const osGameStateSchemaV1: RuntimeSchemaV1<OsGameStateV1> = fromStandardSchemaV1(
  z.strictObject({
    simulation: z.strictObject({
      desktop: z.strictObject({ wallpaperId: z.enum(osWallpaperIdsV1) }),
      filesystem: z.strictObject({
        files: z
          .array(
            z.strictObject({
              name: z.string().min(1).max(64),
              content: z.string().max(osMaxFileContentV1),
              revision: z.number().int().nonnegative(),
            }),
          )
          .max(osMaxFilesV1),
        writes: z.number().int().nonnegative(),
      }),
      minesweeper: z.strictObject({
        board: z
          .strictObject({
            width: z.number().int().min(5).max(40),
            height: z.number().int().min(5).max(30),
            mineCount: z.number().int().min(1),
            minesPlaced: z.boolean(),
            status: z.enum(["playing", "won", "lost"]),
            cells: z.array(z.number().int().min(0).max(7)),
          })
          .nullable(),
      }),
    }),
  }),
  { subject: { kind: "story", id: "story.example.silly-os" } },
);

export function createInitialOsGameStateV1(): OsGameStateV1 {
  return ({
    simulation: {
      desktop: { wallpaperId: "teal" },
      filesystem: { files: [], writes: 0 },
      minesweeper: { board: null },
    },
  });
}
