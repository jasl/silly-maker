// SPDX-License-Identifier: MIT
import type { SceneDocumentV1 } from "@sillymaker/base";
import { parseSceneDocumentV1 } from "@sillymaker/base";

/**
 * The browser half of the Scene write-back port: list enumerates the
 * app's scene sources, read fetches one saved Document plus its CAS
 * digest, and write sends the edited Document back under that digest.
 * Structured results let the Studio distinguish a digest conflict
 * (someone else changed the file) from validation failures and a missing
 * endpoint (production preview). Drafts live only in Studio memory until
 * a write succeeds.
 */

export type SceneIoErrorCodeV1 =
  | "unavailable"
  | "bad_request"
  | "not_found"
  | "digest_conflict"
  | "already_exists"
  | "scene_invalid"
  | "scene_id_mismatch";

export interface SceneIoListEntryV1 {
  readonly path: string;
  readonly sceneId: string;
  readonly label: string;
}

export interface SceneIoListSkipV1 {
  readonly path: string;
  readonly reason: string;
}

export type SceneIoListResultV1 =
  | {
    readonly kind: "ok";
    readonly scenes: readonly SceneIoListEntryV1[];
    /** `*.scene.json` files the index could not admit, named with the reason. */
    readonly skipped: readonly SceneIoListSkipV1[];
  }
  | { readonly kind: "error"; readonly code: SceneIoErrorCodeV1 };

export type SceneIoReadResultV1 =
  | { readonly kind: "ok"; readonly digest: string; readonly sceneDocument: SceneDocumentV1 }
  | { readonly kind: "error"; readonly code: SceneIoErrorCodeV1 };

export type SceneIoWriteResultV1 =
  | { readonly kind: "ok"; readonly digest: string }
  | { readonly kind: "error"; readonly code: SceneIoErrorCodeV1 };

export interface SceneSourceIoV1 {
  list(): Promise<SceneIoListResultV1>;
  read(path: string): Promise<SceneIoReadResultV1>;
  write(input: {
    readonly path: string;
    readonly expectedDigest: string;
    readonly sceneDocument: SceneDocumentV1;
  }): Promise<SceneIoWriteResultV1>;
  /** Creates a brand-new document; the expected prior state is "no file". */
  create(input: {
    readonly path: string;
    readonly sceneDocument: SceneDocumentV1;
  }): Promise<SceneIoWriteResultV1>;
}

const sceneIoUrlV1 = "/__sillymaker/dev-sources/scene";
const sceneIoListUrlV1 = "/__sillymaker/dev-sources/scenes";

function errorCodeFromBodyV1(body: unknown, fallback: SceneIoErrorCodeV1): SceneIoErrorCodeV1 {
  if (body !== null && typeof body === "object" && "error" in body) {
    const code = (body as { error: unknown }).error;
    if (
      code === "bad_request" || code === "not_found" || code === "digest_conflict" ||
      code === "already_exists" || code === "scene_invalid" || code === "scene_id_mismatch"
    ) {
      return code;
    }
  }
  return fallback;
}

function listEntryV1(value: unknown): SceneIoListEntryV1 | null {
  if (value === null || typeof value !== "object") return null;
  const record = value as { path?: unknown; sceneId?: unknown; label?: unknown };
  if (
    typeof record.path !== "string" ||
    typeof record.sceneId !== "string" ||
    typeof record.label !== "string"
  ) {
    return null;
  }
  return { path: record.path, sceneId: record.sceneId, label: record.label };
}

function listSkipsV1(value: unknown): readonly SceneIoListSkipV1[] | null {
  if (!Array.isArray(value)) return null;
  const skips: SceneIoListSkipV1[] = [];
  for (const candidate of value) {
    if (candidate === null || typeof candidate !== "object") return null;
    const record = candidate as { path?: unknown; reason?: unknown };
    if (typeof record.path !== "string" || typeof record.reason !== "string") return null;
    skips.push({ path: record.path, reason: record.reason });
  }
  return skips;
}

/** The standard dev-server-backed IO; absent endpoints report `unavailable`. */
export function createDevServerSceneIoV1(): SceneSourceIoV1 {
  return {
    async list(): Promise<SceneIoListResultV1> {
      try {
        const response = await fetch(sceneIoListUrlV1);
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          return { kind: "error", code: errorCodeFromBodyV1(body, "unavailable") };
        }
        const scenes = body !== null && typeof body === "object" && "scenes" in body &&
            Array.isArray((body as { scenes: unknown }).scenes)
          ? (body as { scenes: readonly unknown[] }).scenes
          : null;
        if (scenes === null) return { kind: "error", code: "unavailable" };
        const entries: SceneIoListEntryV1[] = [];
        for (const candidate of scenes) {
          const entry = listEntryV1(candidate);
          if (entry === null) return { kind: "error", code: "unavailable" };
          entries.push(entry);
        }
        const skipped = listSkipsV1((body as { skipped?: unknown }).skipped);
        if (skipped === null) return { kind: "error", code: "unavailable" };
        return { kind: "ok", scenes: entries, skipped };
      } catch {
        return { kind: "error", code: "unavailable" };
      }
    },
    async read(path: string): Promise<SceneIoReadResultV1> {
      try {
        const response = await fetch(`${sceneIoUrlV1}?path=${encodeURIComponent(path)}`);
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          return { kind: "error", code: errorCodeFromBodyV1(body, "unavailable") };
        }
        if (body === null || typeof body !== "object") {
          return { kind: "error", code: "unavailable" };
        }
        const record = body as { digest?: unknown; sceneDocument?: unknown };
        if (typeof record.digest !== "string") return { kind: "error", code: "unavailable" };
        return {
          kind: "ok",
          digest: record.digest,
          sceneDocument: parseSceneDocumentV1(record.sceneDocument, `/${path}`),
        };
      } catch {
        return { kind: "error", code: "unavailable" };
      }
    },
    async write(input: {
      readonly path: string;
      readonly expectedDigest: string;
      readonly sceneDocument: SceneDocumentV1;
    }): Promise<SceneIoWriteResultV1> {
      return await postSceneV1(input);
    },
    async create(input: {
      readonly path: string;
      readonly sceneDocument: SceneDocumentV1;
    }): Promise<SceneIoWriteResultV1> {
      return await postSceneV1({ ...input, expectedDigest: null });
    },
  };
}

async function postSceneV1(payload: {
  readonly path: string;
  readonly expectedDigest: string | null;
  readonly sceneDocument: SceneDocumentV1;
}): Promise<SceneIoWriteResultV1> {
  try {
    const response = await fetch(sceneIoUrlV1, {
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
