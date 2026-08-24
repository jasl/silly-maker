// SPDX-License-Identifier: MIT
import type { AdmittedAuthoringSceneV1 } from "@sillymaker/base/authoring/scene";
import { admitAuthoringSceneDocumentV1 } from "@sillymaker/base/authoring/scene";

/**
 * Browser half of the dev-only Authoring Scene source port. The HTTP response
 * is checked as ordinary data at this boundary, then its scene document is
 * admitted exactly once. Drafts retain the admitted document/source-map pair;
 * write trusts that representation and sends only its normalized document.
 */

export type AuthoringSceneIoErrorCodeV1 =
  | "unavailable"
  | "bad_request"
  | "not_found"
  | "digest_conflict"
  | "authoring_scene_invalid"
  | "scene_id_mismatch";

export interface AuthoringSceneIoListEntryV1 {
  readonly path: string;
  readonly sceneId: string;
  readonly label: string;
}

export interface AuthoringSceneIoListSkipV1 {
  readonly path: string;
  readonly reason: string;
}

export type AuthoringSceneIoListResultV1 =
  | {
    readonly kind: "ok";
    readonly scenes: readonly AuthoringSceneIoListEntryV1[];
    readonly skipped: readonly AuthoringSceneIoListSkipV1[];
  }
  | { readonly kind: "error"; readonly code: AuthoringSceneIoErrorCodeV1 };

export type AuthoringSceneIoReadResultV1 =
  | {
    readonly kind: "ok";
    readonly digest: string;
    readonly admittedScene: AdmittedAuthoringSceneV1;
  }
  | { readonly kind: "error"; readonly code: AuthoringSceneIoErrorCodeV1 };

export type AuthoringSceneIoWriteResultV1 =
  | { readonly kind: "ok"; readonly digest: string }
  | { readonly kind: "error"; readonly code: AuthoringSceneIoErrorCodeV1 };

export interface AuthoringSceneSourceIoV1 {
  list(): Promise<AuthoringSceneIoListResultV1>;
  read(path: string): Promise<AuthoringSceneIoReadResultV1>;
  write(input: {
    readonly path: string;
    readonly expectedDigest: string;
    readonly admittedScene: AdmittedAuthoringSceneV1;
  }): Promise<AuthoringSceneIoWriteResultV1>;
}

const sceneIoUrlV1 = "/__sillymaker/dev-sources/authoring-scene";
const sceneIoListUrlV1 = "/__sillymaker/dev-sources/authoring-scenes";

function errorCodeFromBodyV1(
  body: unknown,
  fallback: AuthoringSceneIoErrorCodeV1,
): AuthoringSceneIoErrorCodeV1 {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return fallback;
  const code = (body as { error?: unknown }).error;
  if (
    code === "bad_request" || code === "not_found" || code === "digest_conflict" ||
    code === "authoring_scene_invalid" || code === "scene_id_mismatch"
  ) {
    return code;
  }
  return fallback;
}

function listEntryV1(value: unknown): AuthoringSceneIoListEntryV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
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

function listSkipsV1(value: unknown): readonly AuthoringSceneIoListSkipV1[] | null {
  if (!Array.isArray(value)) return null;
  const skips: AuthoringSceneIoListSkipV1[] = [];
  for (const candidate of value) {
    if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
      return null;
    }
    const record = candidate as { path?: unknown; reason?: unknown };
    if (typeof record.path !== "string" || typeof record.reason !== "string") return null;
    skips.push({ path: record.path, reason: record.reason });
  }
  return skips;
}

/** The standard dev-server-backed IO; absent endpoints report `unavailable`. */
export function createDevServerAuthoringSceneIoV1(): AuthoringSceneSourceIoV1 {
  return {
    async list(): Promise<AuthoringSceneIoListResultV1> {
      try {
        const response = await fetch(sceneIoListUrlV1);
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          return { kind: "error", code: errorCodeFromBodyV1(body, "unavailable") };
        }
        if (body === null || typeof body !== "object" || Array.isArray(body)) {
          return { kind: "error", code: "unavailable" };
        }
        const record = body as { scenes?: unknown; skipped?: unknown };
        if (!Array.isArray(record.scenes)) return { kind: "error", code: "unavailable" };

        const scenes: AuthoringSceneIoListEntryV1[] = [];
        for (const candidate of record.scenes) {
          const entry = listEntryV1(candidate);
          if (entry === null) return { kind: "error", code: "unavailable" };
          scenes.push(entry);
        }
        const skipped = listSkipsV1(record.skipped);
        if (skipped === null) return { kind: "error", code: "unavailable" };
        return { kind: "ok", scenes, skipped };
      } catch {
        return { kind: "error", code: "unavailable" };
      }
    },

    async read(path: string): Promise<AuthoringSceneIoReadResultV1> {
      try {
        const response = await fetch(`${sceneIoUrlV1}?path=${encodeURIComponent(path)}`);
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          return { kind: "error", code: errorCodeFromBodyV1(body, "unavailable") };
        }
        if (body === null || typeof body !== "object" || Array.isArray(body)) {
          return { kind: "error", code: "unavailable" };
        }
        const record = body as { digest?: unknown; sceneDocument?: unknown };
        if (typeof record.digest !== "string") return { kind: "error", code: "unavailable" };
        return {
          kind: "ok",
          digest: record.digest,
          admittedScene: admitAuthoringSceneDocumentV1(record.sceneDocument),
        };
      } catch {
        return { kind: "error", code: "unavailable" };
      }
    },

    async write(input: {
      readonly path: string;
      readonly expectedDigest: string;
      readonly admittedScene: AdmittedAuthoringSceneV1;
    }): Promise<AuthoringSceneIoWriteResultV1> {
      try {
        const response = await fetch(sceneIoUrlV1, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            path: input.path,
            expectedDigest: input.expectedDigest,
            sceneDocument: input.admittedScene.document,
          }),
        });
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          return { kind: "error", code: errorCodeFromBodyV1(body, "unavailable") };
        }
        if (body === null || typeof body !== "object" || Array.isArray(body)) {
          return { kind: "error", code: "unavailable" };
        }
        const digest = (body as { digest?: unknown }).digest;
        if (typeof digest !== "string") return { kind: "error", code: "unavailable" };
        return { kind: "ok", digest };
      } catch {
        return { kind: "error", code: "unavailable" };
      }
    },
  };
}
