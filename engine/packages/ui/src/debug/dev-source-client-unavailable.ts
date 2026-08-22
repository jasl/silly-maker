// SPDX-License-Identifier: MIT
import type {
  MotionIoListResultV1,
  MotionIoReadResultV1,
  MotionIoWriteResultV1,
  MotionSourceIoV1,
} from "./motion-io.ts";

const unavailableListV1 = Object.freeze({
  kind: "error" as const,
  code: "unavailable" as const,
});

/** Production fallback for the dev-server-only Motion source port. */
export function createDevServerMotionIoV1(): MotionSourceIoV1 {
  return Object.freeze({
    async list(): Promise<MotionIoListResultV1> {
      return unavailableListV1;
    },
    async read(): Promise<MotionIoReadResultV1> {
      return Object.freeze({ kind: "error", code: "unavailable" });
    },
    async write(): Promise<MotionIoWriteResultV1> {
      return Object.freeze({ kind: "error", code: "unavailable" });
    },
    async create(): Promise<MotionIoWriteResultV1> {
      return Object.freeze({ kind: "error", code: "unavailable" });
    },
  });
}

/** Production fallback: there is no local-editor endpoint outside `vite dev`. */
export async function openStorySourceInDevServerV1(_path: string): Promise<boolean> {
  return false;
}
