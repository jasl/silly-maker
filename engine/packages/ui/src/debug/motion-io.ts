// SPDX-License-Identifier: MIT
import type { MotionDocumentV1 } from "@sillymaker/base";
import { parseMotionDocumentV1 } from "@sillymaker/base";

/**
 * The browser half of the Motion write-back port: read fetches the saved
 * document plus its CAS digest from the dev server, write sends the edited
 * document back under that digest. Both resolve to structured results so
 * the Workbench can distinguish a digest conflict (someone else changed the
 * file) from validation failures and a missing endpoint (production
 * preview). Drafts live only in Workbench memory until a write succeeds.
 */

export type MotionIoErrorCodeV1 =
  | "unavailable"
  | "bad_request"
  | "not_found"
  | "digest_conflict"
  | "motion_invalid"
  | "motion_id_mismatch";

export type MotionIoReadResultV1 =
  | { readonly kind: "ok"; readonly digest: string; readonly motionDocument: MotionDocumentV1 }
  | { readonly kind: "error"; readonly code: MotionIoErrorCodeV1 };

export type MotionIoWriteResultV1 =
  | { readonly kind: "ok"; readonly digest: string }
  | { readonly kind: "error"; readonly code: MotionIoErrorCodeV1 };

export interface MotionSourceIoV1 {
  read(path: string): Promise<MotionIoReadResultV1>;
  write(input: {
    readonly path: string;
    readonly expectedDigest: string;
    readonly motionDocument: MotionDocumentV1;
  }): Promise<MotionIoWriteResultV1>;
}

const motionIoUrlV1 = "/__sillymaker/dev-sources/motion";

function errorCodeFromBodyV1(body: unknown, fallback: MotionIoErrorCodeV1): MotionIoErrorCodeV1 {
  if (body !== null && typeof body === "object" && "error" in body) {
    const code = (body as { error: unknown }).error;
    if (
      code === "bad_request" || code === "not_found" || code === "digest_conflict" ||
      code === "motion_invalid" || code === "motion_id_mismatch"
    ) {
      return code;
    }
  }
  return fallback;
}

/** The standard dev-server-backed IO; absent endpoints report `unavailable`. */
export function createDevServerMotionIoV1(): MotionSourceIoV1 {
  return Object.freeze({
    async read(path: string): Promise<MotionIoReadResultV1> {
      try {
        const response = await fetch(`${motionIoUrlV1}?path=${encodeURIComponent(path)}`);
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          return { kind: "error", code: errorCodeFromBodyV1(body, "unavailable") };
        }
        if (body === null || typeof body !== "object") {
          return { kind: "error", code: "unavailable" };
        }
        const record = body as { digest?: unknown; motionDocument?: unknown };
        if (typeof record.digest !== "string") return { kind: "error", code: "unavailable" };
        return {
          kind: "ok",
          digest: record.digest,
          motionDocument: parseMotionDocumentV1(record.motionDocument, `/${path}`),
        };
      } catch {
        return { kind: "error", code: "unavailable" };
      }
    },
    async write(input: {
      readonly path: string;
      readonly expectedDigest: string;
      readonly motionDocument: MotionDocumentV1;
    }): Promise<MotionIoWriteResultV1> {
      try {
        const response = await fetch(motionIoUrlV1, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        });
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          return { kind: "error", code: errorCodeFromBodyV1(body, "unavailable") };
        }
        const digest = body !== null && typeof body === "object" && "digest" in body
          ? (body as { digest: unknown }).digest
          : null;
        if (typeof digest !== "string") return { kind: "error", code: "unavailable" };
        return { kind: "ok", digest };
      } catch {
        return { kind: "error", code: "unavailable" };
      }
    },
  });
}
