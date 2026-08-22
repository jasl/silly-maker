// SPDX-License-Identifier: MIT
import type { ChromeLayoutDocumentV1 } from "@sillymaker/base";
import { parseChromeLayoutDocumentV1 } from "@sillymaker/base";

/**
 * The browser half of the chrome-layout write-back port
 * (authorable-chrome-layout, accepted 2026-08-22): list enumerates the
 * app's `*.chrome-layout.json` sources from the Project Authoring Index,
 * read fetches one saved Document plus its CAS digest, and write sends the
 * edited Document back under that digest. Structured results let the
 * Studio distinguish a digest conflict from validation failures and a
 * missing endpoint (production preview). Drafts live only in Studio
 * memory until a write succeeds.
 */

export type ChromeLayoutIoErrorCodeV1 =
  | "unavailable"
  | "bad_request"
  | "not_found"
  | "digest_conflict"
  | "already_exists"
  | "chrome_layout_invalid"
  | "chrome_layout_id_mismatch";

export interface ChromeLayoutIoListEntryV1 {
  readonly path: string;
  readonly layoutId: string;
  readonly label: string;
}

export interface ChromeLayoutIoListSkipV1 {
  readonly path: string;
  readonly reason: string;
}

export type ChromeLayoutIoListResultV1 =
  | {
    readonly kind: "ok";
    readonly chromeLayouts: readonly ChromeLayoutIoListEntryV1[];
    /** `*.chrome-layout.json` files the index could not admit, with the reason. */
    readonly skipped: readonly ChromeLayoutIoListSkipV1[];
  }
  | { readonly kind: "error"; readonly code: ChromeLayoutIoErrorCodeV1 };

export type ChromeLayoutIoReadResultV1 =
  | {
    readonly kind: "ok";
    readonly digest: string;
    readonly chromeLayoutDocument: ChromeLayoutDocumentV1;
  }
  | { readonly kind: "error"; readonly code: ChromeLayoutIoErrorCodeV1 };

export type ChromeLayoutIoWriteResultV1 =
  | { readonly kind: "ok"; readonly digest: string }
  | { readonly kind: "error"; readonly code: ChromeLayoutIoErrorCodeV1 };

export interface ChromeLayoutSourceIoV1 {
  list(): Promise<ChromeLayoutIoListResultV1>;
  read(path: string): Promise<ChromeLayoutIoReadResultV1>;
  write(input: {
    readonly path: string;
    readonly expectedDigest: string;
    readonly chromeLayoutDocument: ChromeLayoutDocumentV1;
  }): Promise<ChromeLayoutIoWriteResultV1>;
  /** Creates a brand-new document; the expected prior state is "no file". */
  create(input: {
    readonly path: string;
    readonly chromeLayoutDocument: ChromeLayoutDocumentV1;
  }): Promise<ChromeLayoutIoWriteResultV1>;
}

const chromeLayoutIoUrlV1 = "/__sillymaker/dev-sources/chrome-layout";
const chromeLayoutIoListUrlV1 = "/__sillymaker/dev-sources/chrome-layouts";

function errorCodeFromBodyV1(
  body: unknown,
  fallback: ChromeLayoutIoErrorCodeV1,
): ChromeLayoutIoErrorCodeV1 {
  if (body !== null && typeof body === "object" && "error" in body) {
    const code = (body as { error: unknown }).error;
    if (
      code === "bad_request" || code === "not_found" || code === "digest_conflict" ||
      code === "already_exists" || code === "chrome_layout_invalid" ||
      code === "chrome_layout_id_mismatch"
    ) {
      return code;
    }
  }
  return fallback;
}

function listEntryV1(value: unknown): ChromeLayoutIoListEntryV1 | null {
  if (value === null || typeof value !== "object") return null;
  const record = value as { path?: unknown; layoutId?: unknown; label?: unknown };
  if (
    typeof record.path !== "string" ||
    typeof record.layoutId !== "string" ||
    typeof record.label !== "string"
  ) {
    return null;
  }
  return Object.freeze({ path: record.path, layoutId: record.layoutId, label: record.label });
}

/** Skips are tolerated as absent (an older server omits the field). */
function listSkipsV1(value: unknown): readonly ChromeLayoutIoListSkipV1[] | null {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) return null;
  const skips: ChromeLayoutIoListSkipV1[] = [];
  for (const candidate of value) {
    if (candidate === null || typeof candidate !== "object") return null;
    const record = candidate as { path?: unknown; reason?: unknown };
    if (typeof record.path !== "string" || typeof record.reason !== "string") return null;
    skips.push(Object.freeze({ path: record.path, reason: record.reason }));
  }
  return Object.freeze(skips);
}

/** The standard dev-server-backed IO; absent endpoints report `unavailable`. */
export function createDevServerChromeLayoutIoV1(): ChromeLayoutSourceIoV1 {
  return Object.freeze({
    async list(): Promise<ChromeLayoutIoListResultV1> {
      try {
        const response = await fetch(chromeLayoutIoListUrlV1);
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          return { kind: "error", code: errorCodeFromBodyV1(body, "unavailable") };
        }
        const documents = body !== null && typeof body === "object" &&
            "chromeLayouts" in body &&
            Array.isArray((body as { chromeLayouts: unknown }).chromeLayouts)
          ? (body as { chromeLayouts: readonly unknown[] }).chromeLayouts
          : null;
        if (documents === null) return { kind: "error", code: "unavailable" };
        const entries: ChromeLayoutIoListEntryV1[] = [];
        for (const candidate of documents) {
          const entry = listEntryV1(candidate);
          if (entry === null) return { kind: "error", code: "unavailable" };
          entries.push(entry);
        }
        const skipped = listSkipsV1((body as { skipped?: unknown }).skipped);
        if (skipped === null) return { kind: "error", code: "unavailable" };
        return { kind: "ok", chromeLayouts: Object.freeze(entries), skipped };
      } catch {
        return { kind: "error", code: "unavailable" };
      }
    },
    async read(path: string): Promise<ChromeLayoutIoReadResultV1> {
      try {
        const response = await fetch(`${chromeLayoutIoUrlV1}?path=${encodeURIComponent(path)}`);
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          return { kind: "error", code: errorCodeFromBodyV1(body, "unavailable") };
        }
        if (body === null || typeof body !== "object") {
          return { kind: "error", code: "unavailable" };
        }
        const record = body as { digest?: unknown; chromeLayoutDocument?: unknown };
        if (typeof record.digest !== "string") return { kind: "error", code: "unavailable" };
        return {
          kind: "ok",
          digest: record.digest,
          chromeLayoutDocument: parseChromeLayoutDocumentV1(
            record.chromeLayoutDocument,
            `/${path}`,
          ),
        };
      } catch {
        return { kind: "error", code: "unavailable" };
      }
    },
    async write(input: {
      readonly path: string;
      readonly expectedDigest: string;
      readonly chromeLayoutDocument: ChromeLayoutDocumentV1;
    }): Promise<ChromeLayoutIoWriteResultV1> {
      return await postChromeLayoutV1(input);
    },
    async create(input: {
      readonly path: string;
      readonly chromeLayoutDocument: ChromeLayoutDocumentV1;
    }): Promise<ChromeLayoutIoWriteResultV1> {
      return await postChromeLayoutV1({ ...input, expectedDigest: null });
    },
  });
}

async function postChromeLayoutV1(payload: {
  readonly path: string;
  readonly expectedDigest: string | null;
  readonly chromeLayoutDocument: ChromeLayoutDocumentV1;
}): Promise<ChromeLayoutIoWriteResultV1> {
  try {
    const response = await fetch(chromeLayoutIoUrlV1, {
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
