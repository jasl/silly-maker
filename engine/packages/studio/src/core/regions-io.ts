// SPDX-License-Identifier: MIT
import type { RegionsDocumentV1 } from "@sillymaker/base";
import { parseRegionsDocumentV1 } from "@sillymaker/base";

/**
 * The browser half of the Regions write-back port (shaped-hit-regions,
 * accepted 2026-08-21): list enumerates the app's `*.regions.json` sources
 * from the Project Authoring Index, read fetches one saved Document plus
 * its CAS digest, and write sends the edited Document back under that
 * digest. Structured results let the Studio distinguish a digest conflict
 * from validation failures and a missing endpoint (production preview).
 * Drafts live only in Studio memory until a write succeeds.
 */

export type RegionsIoErrorCodeV1 =
  | "unavailable"
  | "bad_request"
  | "not_found"
  | "digest_conflict"
  | "already_exists"
  | "regions_invalid"
  | "regions_id_mismatch";

export interface RegionsIoListEntryV1 {
  readonly path: string;
  readonly regionsId: string;
  readonly label: string;
}

export interface RegionsIoListSkipV1 {
  readonly path: string;
  readonly reason: string;
}

export type RegionsIoListResultV1 =
  | {
    readonly kind: "ok";
    readonly regionsDocuments: readonly RegionsIoListEntryV1[];
    /** `*.regions.json` files the index could not admit, named with the reason. */
    readonly skipped: readonly RegionsIoListSkipV1[];
  }
  | { readonly kind: "error"; readonly code: RegionsIoErrorCodeV1 };

export type RegionsIoReadResultV1 =
  | { readonly kind: "ok"; readonly digest: string; readonly regionsDocument: RegionsDocumentV1 }
  | { readonly kind: "error"; readonly code: RegionsIoErrorCodeV1 };

export type RegionsIoWriteResultV1 =
  | { readonly kind: "ok"; readonly digest: string }
  | { readonly kind: "error"; readonly code: RegionsIoErrorCodeV1 };

export interface RegionsSourceIoV1 {
  list(): Promise<RegionsIoListResultV1>;
  read(path: string): Promise<RegionsIoReadResultV1>;
  write(input: {
    readonly path: string;
    readonly expectedDigest: string;
    readonly regionsDocument: RegionsDocumentV1;
  }): Promise<RegionsIoWriteResultV1>;
  /** Creates a brand-new document; the expected prior state is "no file". */
  create(input: {
    readonly path: string;
    readonly regionsDocument: RegionsDocumentV1;
  }): Promise<RegionsIoWriteResultV1>;
}

const regionsIoUrlV1 = "/__sillymaker/dev-sources/regions-document";
const regionsIoListUrlV1 = "/__sillymaker/dev-sources/regions-documents";

function errorCodeFromBodyV1(body: unknown, fallback: RegionsIoErrorCodeV1): RegionsIoErrorCodeV1 {
  if (body !== null && typeof body === "object" && "error" in body) {
    const code = (body as { error: unknown }).error;
    if (
      code === "bad_request" || code === "not_found" || code === "digest_conflict" ||
      code === "already_exists" || code === "regions_invalid" || code === "regions_id_mismatch"
    ) {
      return code;
    }
  }
  return fallback;
}

function listEntryV1(value: unknown): RegionsIoListEntryV1 | null {
  if (value === null || typeof value !== "object") return null;
  const record = value as { path?: unknown; regionsId?: unknown; label?: unknown };
  if (
    typeof record.path !== "string" ||
    typeof record.regionsId !== "string" ||
    typeof record.label !== "string"
  ) {
    return null;
  }
  return Object.freeze({ path: record.path, regionsId: record.regionsId, label: record.label });
}

/** Skips are tolerated as absent (an older server omits the field). */
function listSkipsV1(value: unknown): readonly RegionsIoListSkipV1[] | null {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) return null;
  const skips: RegionsIoListSkipV1[] = [];
  for (const candidate of value) {
    if (candidate === null || typeof candidate !== "object") return null;
    const record = candidate as { path?: unknown; reason?: unknown };
    if (typeof record.path !== "string" || typeof record.reason !== "string") return null;
    skips.push(Object.freeze({ path: record.path, reason: record.reason }));
  }
  return Object.freeze(skips);
}

/** The standard dev-server-backed IO; absent endpoints report `unavailable`. */
export function createDevServerRegionsIoV1(): RegionsSourceIoV1 {
  return Object.freeze({
    async list(): Promise<RegionsIoListResultV1> {
      try {
        const response = await fetch(regionsIoListUrlV1);
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          return { kind: "error", code: errorCodeFromBodyV1(body, "unavailable") };
        }
        const documents = body !== null && typeof body === "object" &&
            "regionsDocuments" in body &&
            Array.isArray((body as { regionsDocuments: unknown }).regionsDocuments)
          ? (body as { regionsDocuments: readonly unknown[] }).regionsDocuments
          : null;
        if (documents === null) return { kind: "error", code: "unavailable" };
        const entries: RegionsIoListEntryV1[] = [];
        for (const candidate of documents) {
          const entry = listEntryV1(candidate);
          if (entry === null) return { kind: "error", code: "unavailable" };
          entries.push(entry);
        }
        const skipped = listSkipsV1((body as { skipped?: unknown }).skipped);
        if (skipped === null) return { kind: "error", code: "unavailable" };
        return { kind: "ok", regionsDocuments: Object.freeze(entries), skipped };
      } catch {
        return { kind: "error", code: "unavailable" };
      }
    },
    async read(path: string): Promise<RegionsIoReadResultV1> {
      try {
        const response = await fetch(`${regionsIoUrlV1}?path=${encodeURIComponent(path)}`);
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          return { kind: "error", code: errorCodeFromBodyV1(body, "unavailable") };
        }
        if (body === null || typeof body !== "object") {
          return { kind: "error", code: "unavailable" };
        }
        const record = body as { digest?: unknown; regionsDocument?: unknown };
        if (typeof record.digest !== "string") return { kind: "error", code: "unavailable" };
        return {
          kind: "ok",
          digest: record.digest,
          regionsDocument: parseRegionsDocumentV1(record.regionsDocument, `/${path}`),
        };
      } catch {
        return { kind: "error", code: "unavailable" };
      }
    },
    async write(input: {
      readonly path: string;
      readonly expectedDigest: string;
      readonly regionsDocument: RegionsDocumentV1;
    }): Promise<RegionsIoWriteResultV1> {
      return await postRegionsV1(input);
    },
    async create(input: {
      readonly path: string;
      readonly regionsDocument: RegionsDocumentV1;
    }): Promise<RegionsIoWriteResultV1> {
      return await postRegionsV1({ ...input, expectedDigest: null });
    },
  });
}

async function postRegionsV1(payload: {
  readonly path: string;
  readonly expectedDigest: string | null;
  readonly regionsDocument: RegionsDocumentV1;
}): Promise<RegionsIoWriteResultV1> {
  try {
    const response = await fetch(regionsIoUrlV1, {
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
