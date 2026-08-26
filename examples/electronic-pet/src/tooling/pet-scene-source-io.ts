// SPDX-License-Identifier: MIT
import type { AuthoringDocumentIoV1 } from "@sillymaker/ui/debug";

import type { PetSceneDocumentV1 } from "../authoring/contract.ts";
import { admitPetSceneDocumentV1, compilePetSceneDocumentV1 } from "../authoring/document.ts";
import { petSceneSourcePathV1, petSceneSourceRouteV1 } from "./pet-scene-source-contract.ts";

const knownErrorCodesV1 = new Set([
  "bad_request",
  "not_found",
  "digest_conflict",
  "pet_scene_invalid",
  "scene_id_mismatch",
  "write_failed",
]);

function errorCodeV1(value: unknown): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return "unavailable";
  const code = (value as { error?: unknown }).error;
  return typeof code === "string" && knownErrorCodesV1.has(code) ? code : "unavailable";
}

async function responseBodyV1(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** Browser half of the fixed Electronic Pet dev-source route. */
export function createPetSceneSourceIoV1(): AuthoringDocumentIoV1<PetSceneDocumentV1> {
  return {
    async read(path) {
      if (path !== petSceneSourcePathV1) return { kind: "error", code: "bad_request" };
      try {
        const response = await fetch(petSceneSourceRouteV1);
        const body = await responseBodyV1(response);
        if (!response.ok) return { kind: "error", code: errorCodeV1(body) };
        if (body === null || typeof body !== "object" || Array.isArray(body)) {
          return { kind: "error", code: "unavailable" };
        }
        const record = body as { digest?: unknown; document?: unknown };
        if (typeof record.digest !== "string") {
          return { kind: "error", code: "unavailable" };
        }
        const admitted = admitPetSceneDocumentV1(record.document);
        if (admitted.kind === "rejected") {
          return { kind: "error", code: "pet_scene_invalid" };
        }
        if (compilePetSceneDocumentV1(admitted.document).kind === "rejected") {
          return { kind: "error", code: "pet_scene_invalid" };
        }
        return { kind: "ok", digest: record.digest, document: admitted.document };
      } catch {
        return { kind: "error", code: "unavailable" };
      }
    },

    async write(input) {
      if (input.path !== petSceneSourcePathV1) {
        return { kind: "error", code: "bad_request" };
      }
      try {
        const response = await fetch(petSceneSourceRouteV1, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            expectedDigest: input.expectedDigest,
            document: input.document,
          }),
        });
        const body = await responseBodyV1(response);
        if (!response.ok) return { kind: "error", code: errorCodeV1(body) };
        if (body === null || typeof body !== "object" || Array.isArray(body)) {
          return { kind: "error", code: "unavailable" };
        }
        const digest = (body as { digest?: unknown }).digest;
        return typeof digest === "string"
          ? { kind: "ok", digest }
          : { kind: "error", code: "unavailable" };
      } catch {
        return { kind: "error", code: "unavailable" };
      }
    },
  };
}
