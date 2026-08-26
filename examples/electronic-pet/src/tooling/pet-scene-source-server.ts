// SPDX-License-Identifier: MIT
import { createHash, randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";

import type { Plugin } from "vite";

import type { PetSceneDocumentV1 } from "../authoring/contract.ts";
import { admitPetSceneDocumentV1, compilePetSceneDocumentV1 } from "../authoring/document.ts";
import {
  petSceneSourcePathV1,
  petSceneSourceRouteV1,
  petSceneSourceSceneIdV1,
} from "./pet-scene-source-contract.ts";

const requestBodyLimitV1 = 2 * 1024 * 1024;

type PetSceneSourceErrorCodeV1 =
  | "bad_request"
  | "not_found"
  | "digest_conflict"
  | "pet_scene_invalid"
  | "scene_id_mismatch"
  | "write_failed";

type PetSceneSourceReadResultV1 =
  | {
    readonly kind: "ok";
    readonly digest: string;
    readonly document: PetSceneDocumentV1;
  }
  | { readonly kind: "error"; readonly code: PetSceneSourceErrorCodeV1 };

type PetSceneSourceWriteResultV1 =
  | { readonly kind: "ok"; readonly digest: string }
  | { readonly kind: "error"; readonly code: PetSceneSourceErrorCodeV1 };

type PetSceneSourceMiddlewareV1 = (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => void;

function sourceFileV1(appRoot: string): string {
  return resolve(appRoot, petSceneSourcePathV1);
}

function digestV1(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function formatDocumentV1(document: PetSceneDocumentV1): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(document, null, 2)}\n`);
}

async function readPetSceneSourceV1(appRoot: string): Promise<PetSceneSourceReadResultV1> {
  let bytes: Uint8Array;
  try {
    bytes = await readFile(sourceFileV1(appRoot));
  } catch {
    return { kind: "error", code: "not_found" };
  }

  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { kind: "error", code: "pet_scene_invalid" };
  }
  const admitted = admitPetSceneDocumentV1(value);
  if (admitted.kind === "rejected") {
    return { kind: "error", code: "pet_scene_invalid" };
  }
  const compiled = compilePetSceneDocumentV1(admitted.document);
  if (compiled.kind === "rejected") {
    return { kind: "error", code: "pet_scene_invalid" };
  }
  if (admitted.document.sceneId !== petSceneSourceSceneIdV1) {
    return { kind: "error", code: "scene_id_mismatch" };
  }
  return { kind: "ok", digest: digestV1(bytes), document: admitted.document };
}

async function writePetSceneSourceV1(
  appRoot: string,
  input: { readonly expectedDigest: string; readonly document: unknown },
): Promise<PetSceneSourceWriteResultV1> {
  const filePath = sourceFileV1(appRoot);
  let currentBytes: Uint8Array;
  try {
    currentBytes = await readFile(filePath);
  } catch {
    return { kind: "error", code: "not_found" };
  }
  if (digestV1(currentBytes) !== input.expectedDigest) {
    return { kind: "error", code: "digest_conflict" };
  }

  const admitted = admitPetSceneDocumentV1(input.document);
  if (admitted.kind === "rejected") {
    return { kind: "error", code: "pet_scene_invalid" };
  }
  if (admitted.document.sceneId !== petSceneSourceSceneIdV1) {
    return { kind: "error", code: "scene_id_mismatch" };
  }
  const compiled = compilePetSceneDocumentV1(admitted.document);
  if (compiled.kind === "rejected") {
    return { kind: "error", code: "pet_scene_invalid" };
  }

  const bytes = formatDocumentV1(admitted.document);
  const temporaryPath = `${filePath}.tmp-${randomUUID()}`;
  try {
    await writeFile(temporaryPath, bytes, { flag: "wx" });
    await rename(temporaryPath, filePath);
  } catch {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    return { kind: "error", code: "write_failed" };
  }
  return { kind: "ok", digest: digestV1(bytes) };
}

function statusV1(code: PetSceneSourceErrorCodeV1): number {
  switch (code) {
    case "bad_request":
      return 400;
    case "not_found":
      return 404;
    case "digest_conflict":
      return 409;
    case "pet_scene_invalid":
    case "scene_id_mismatch":
      return 422;
    case "write_failed":
      return 500;
    default: {
      const exhaustive: never = code;
      throw new TypeError(`unknown PetScene source error: ${String(exhaustive)}`);
    }
  }
}

function sendJsonV1(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("cache-control", "no-store");
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

async function readRequestBodyV1(
  request: IncomingMessage,
): Promise<{ readonly kind: "ok"; readonly value: unknown } | { readonly kind: "error" }> {
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of request) {
    const bytes = typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk;
    if (!(bytes instanceof Uint8Array)) return { kind: "error" };
    length += bytes.byteLength;
    if (length > requestBodyLimitV1) return { kind: "error" };
    chunks.push(bytes);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { kind: "ok", value: JSON.parse(new TextDecoder().decode(body)) };
  } catch {
    return { kind: "error" };
  }
}

function requestPathV1(request: IncomingMessage): string | null {
  try {
    return new URL(request.url ?? "/", "http://localhost").pathname;
  } catch {
    return null;
  }
}

async function servePetSceneSourceV1(
  appRoot: string,
  request: IncomingMessage,
  response: ServerResponse,
  write: (input: {
    readonly expectedDigest: string;
    readonly document: unknown;
  }) => Promise<PetSceneSourceWriteResultV1>,
): Promise<void> {
  if (request.method === "GET") {
    const result = await readPetSceneSourceV1(appRoot);
    if (result.kind === "error") {
      sendJsonV1(response, statusV1(result.code), { error: result.code });
      return;
    }
    sendJsonV1(response, 200, {
      path: petSceneSourcePathV1,
      digest: result.digest,
      document: result.document,
    });
    return;
  }

  if (request.method !== "PUT") {
    response.setHeader("allow", "GET, PUT");
    sendJsonV1(response, 405, { error: "bad_request" });
    return;
  }
  const body = await readRequestBodyV1(request);
  if (
    body.kind === "error" || body.value === null || typeof body.value !== "object" ||
    Array.isArray(body.value)
  ) {
    sendJsonV1(response, 400, { error: "bad_request" });
    return;
  }
  const record = body.value as { expectedDigest?: unknown; document?: unknown };
  if (typeof record.expectedDigest !== "string" || record.document === undefined) {
    sendJsonV1(response, 400, { error: "bad_request" });
    return;
  }
  const result = await write({
    expectedDigest: record.expectedDigest,
    document: record.document,
  });
  if (result.kind === "error") {
    sendJsonV1(response, statusV1(result.code), { error: result.code });
    return;
  }
  sendJsonV1(response, 200, { digest: result.digest });
}

/** One fixed-file, dev-only source route for the Electronic Pet authoring companion. */
export function createPetSceneSourceMiddlewareV1(appRoot: string): PetSceneSourceMiddlewareV1 {
  let writeSequence = Promise.resolve();
  const enqueueWriteV1 = (
    input: { readonly expectedDigest: string; readonly document: unknown },
  ): Promise<PetSceneSourceWriteResultV1> => {
    const result = writeSequence.then(() => writePetSceneSourceV1(appRoot, input));
    writeSequence = result.then(() => undefined, () => undefined);
    return result;
  };

  return (request, response, next): void => {
    if (requestPathV1(request) !== petSceneSourceRouteV1) {
      next();
      return;
    }
    void servePetSceneSourceV1(appRoot, request, response, enqueueWriteV1).catch(() => {
      if (!response.headersSent) sendJsonV1(response, 500, { error: "write_failed" });
      else response.end();
    });
  };
}

export function createPetSceneSourcePluginV1(appRoot: string): Plugin {
  return {
    name: "electronic-pet:pet-scene-source",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(createPetSceneSourceMiddlewareV1(appRoot));
    },
  };
}
