// SPDX-License-Identifier: MIT
import type { MotionDocumentV1 } from "@sillymaker/base";
import { parseMotionDocumentV1 } from "@sillymaker/base";

/**
 * The browser half of the Motion write-back port: list enumerates the
 * project's motion sources from the dev server's Project Authoring Index
 * (nothing is registered by hand — files the index cannot admit come back
 * as named skips), read fetches one saved document plus its CAS digest,
 * and write sends the edited document back under that digest. All resolve
 * to structured results so consumers can distinguish a digest conflict
 * (someone else changed the file) from validation failures and a missing
 * endpoint (production preview). Drafts live only in editor memory until a
 * write succeeds.
 */

export type MotionIoErrorCodeV1 =
  | "unavailable"
  | "bad_request"
  | "not_found"
  | "digest_conflict"
  | "already_exists"
  | "motion_invalid"
  | "motion_id_mismatch";

export interface MotionIoListEntryV1 {
  readonly path: string;
  readonly motionId: string;
  readonly label: string;
}

export interface MotionIoListSkipV1 {
  readonly path: string;
  readonly reason: string;
}

export type MotionIoListResultV1 =
  | {
    readonly kind: "ok";
    readonly motions: readonly MotionIoListEntryV1[];
    readonly skipped: readonly MotionIoListSkipV1[];
  }
  | { readonly kind: "error"; readonly code: MotionIoErrorCodeV1 };

export type MotionIoReadResultV1 =
  | { readonly kind: "ok"; readonly digest: string; readonly motionDocument: MotionDocumentV1 }
  | { readonly kind: "error"; readonly code: MotionIoErrorCodeV1 };

export type MotionIoWriteResultV1 =
  | { readonly kind: "ok"; readonly digest: string }
  | { readonly kind: "error"; readonly code: MotionIoErrorCodeV1 };

export interface MotionSourceIoV1 {
  list(): Promise<MotionIoListResultV1>;
  read(path: string): Promise<MotionIoReadResultV1>;
  write(input: {
    readonly path: string;
    readonly expectedDigest: string;
    readonly motionDocument: MotionDocumentV1;
  }): Promise<MotionIoWriteResultV1>;
  /** Creates a brand-new document; the expected prior state is "no file". */
  create(input: {
    readonly path: string;
    readonly motionDocument: MotionDocumentV1;
  }): Promise<MotionIoWriteResultV1>;
}

const motionIoUrlV1 = "/__sillymaker/dev-sources/motion";
const motionIoListUrlV1 = "/__sillymaker/dev-sources/motions";

function errorCodeFromBodyV1(body: unknown, fallback: MotionIoErrorCodeV1): MotionIoErrorCodeV1 {
  if (body !== null && typeof body === "object" && "error" in body) {
    const code = (body as { error: unknown }).error;
    if (
      code === "bad_request" || code === "not_found" || code === "digest_conflict" ||
      code === "already_exists" || code === "motion_invalid" || code === "motion_id_mismatch"
    ) {
      return code;
    }
  }
  return fallback;
}

function listEntryV1(value: unknown): MotionIoListEntryV1 | null {
  if (value === null || typeof value !== "object") return null;
  const record = value as { path?: unknown; motionId?: unknown; label?: unknown };
  if (
    typeof record.path !== "string" ||
    typeof record.motionId !== "string" ||
    typeof record.label !== "string"
  ) {
    return null;
  }
  return Object.freeze({ path: record.path, motionId: record.motionId, label: record.label });
}

function listSkipV1(value: unknown): MotionIoListSkipV1 | null {
  if (value === null || typeof value !== "object") return null;
  const record = value as { path?: unknown; reason?: unknown };
  if (typeof record.path !== "string" || typeof record.reason !== "string") return null;
  return Object.freeze({ path: record.path, reason: record.reason });
}

/** The standard dev-server-backed IO; absent endpoints report `unavailable`. */
export function createDevServerMotionIoV1(): MotionSourceIoV1 {
  return Object.freeze({
    async list(): Promise<MotionIoListResultV1> {
      try {
        const response = await fetch(motionIoListUrlV1);
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          return { kind: "error", code: errorCodeFromBodyV1(body, "unavailable") };
        }
        if (body === null || typeof body !== "object") {
          return { kind: "error", code: "unavailable" };
        }
        const record = body as { motions?: unknown; skipped?: unknown };
        if (!Array.isArray(record.motions) || !Array.isArray(record.skipped)) {
          return { kind: "error", code: "unavailable" };
        }
        const motions: MotionIoListEntryV1[] = [];
        for (const candidate of record.motions) {
          const entry = listEntryV1(candidate);
          if (entry === null) return { kind: "error", code: "unavailable" };
          motions.push(entry);
        }
        const skipped: MotionIoListSkipV1[] = [];
        for (const candidate of record.skipped) {
          const skip = listSkipV1(candidate);
          if (skip === null) return { kind: "error", code: "unavailable" };
          skipped.push(skip);
        }
        return { kind: "ok", motions: Object.freeze(motions), skipped: Object.freeze(skipped) };
      } catch {
        return { kind: "error", code: "unavailable" };
      }
    },
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
      return await postMotionV1(input);
    },
    async create(input: {
      readonly path: string;
      readonly motionDocument: MotionDocumentV1;
    }): Promise<MotionIoWriteResultV1> {
      return await postMotionV1({ ...input, expectedDigest: null });
    },
  });
}

async function postMotionV1(payload: {
  readonly path: string;
  readonly expectedDigest: string | null;
  readonly motionDocument: MotionDocumentV1;
}): Promise<MotionIoWriteResultV1> {
  try {
    const response = await fetch(motionIoUrlV1, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
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
}
