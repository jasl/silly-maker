// SPDX-License-Identifier: MIT
// SillyOS 的权威状态：桌面偏好（壁纸）、文件系统（记事本文档）、扫雷
// 盘面。窗口布局/焦点/z 序是 UI 瞬态，不进这里也不进存档。
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
  /** 第几次写入（确定性的"修改时间"替身：墙钟不进权威状态）。 */
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

/** 每格打包成一个小整数：bit0 雷 / bit1 已翻开 / bit2 旗标。 */
export type OsCellV1 = number;
export const osCellMineV1 = 1;
export const osCellRevealedV1 = 2;
export const osCellFlaggedV1 = 4;

export interface OsBoardV1 {
  readonly width: number;
  readonly height: number;
  readonly mineCount: number;
  /** 首次翻格才布雷（首点永不踩雷）；布雷前 false。 */
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
  return Object.freeze({
    simulation: Object.freeze({
      desktop: Object.freeze({ wallpaperId: "teal" }),
      filesystem: Object.freeze({ files: Object.freeze([]), writes: 0 }),
      minesweeper: Object.freeze({ board: null }),
    }),
  });
}
