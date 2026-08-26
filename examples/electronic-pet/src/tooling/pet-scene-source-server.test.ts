// SPDX-License-Identifier: MIT
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PetSceneDocumentV1 } from "../authoring/contract.ts";
import { electronicPetM1SceneDocumentV1 } from "../authoring/default-document.ts";
import { petSceneSourcePathV1, petSceneSourceRouteV1 } from "./pet-scene-source-contract.ts";
import { createPetSceneSourceMiddlewareV1 } from "./pet-scene-source-server.ts";

interface MiddlewareResponseV1 {
  readonly status: number;
  readonly body: unknown;
}

let appRoot = "";

beforeEach(async () => {
  appRoot = await mkdtemp(join(tmpdir(), "electronic-pet-scene-source-"));
  await mkdir(resolve(appRoot, "src/authoring"), { recursive: true });
  await writeFile(
    resolve(appRoot, petSceneSourcePathV1),
    `${JSON.stringify(electronicPetM1SceneDocumentV1, null, 2)}\n`,
  );
});

afterEach(async () => {
  await rm(appRoot, { recursive: true, force: true });
});

function requestV1(
  method: string,
  body?: unknown,
  url = petSceneSourceRouteV1,
): Promise<MiddlewareResponseV1> {
  const request = Readable.from(
    body === undefined ? [] : [JSON.stringify(body)],
  ) as IncomingMessage;
  request.method = method;
  request.url = url;
  const middleware = createPetSceneSourceMiddlewareV1(appRoot);

  return new Promise((resolveResponse, reject) => {
    let status = 200;
    const response = {
      headersSent: false,
      set statusCode(value: number) {
        status = value;
      },
      get statusCode(): number {
        return status;
      },
      setHeader: () => {},
      end: (value?: unknown) => {
        resolveResponse({
          status,
          body: value === undefined ? null : JSON.parse(String(value)),
        });
      },
    } as unknown as ServerResponse;
    middleware(request, response, () => reject(new Error("source route fell through")));
  });
}

describe("Electronic Pet scene dev source route", () => {
  it("reads and CAS-writes the fixed admitted source without losing a newer edit", async () => {
    const opened = await requestV1("GET");
    expect(opened).toMatchObject({
      status: 200,
      body: {
        path: petSceneSourcePathV1,
        digest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
        document: { sceneId: "scene.electronic-pet.home" },
      },
    });
    const openedBody = opened.body as { digest: string };
    const edited = {
      ...electronicPetM1SceneDocumentV1,
      label: "Human-tuned home",
    } satisfies PetSceneDocumentV1;

    const written = await requestV1("PUT", {
      expectedDigest: openedBody.digest,
      document: edited,
    });
    expect(written).toMatchObject({
      status: 200,
      body: { digest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u) },
    });
    const writtenBody = written.body as { digest: string };
    expect(JSON.parse(await readFile(resolve(appRoot, petSceneSourcePathV1), "utf8")))
      .toMatchObject({
        label: "Human-tuned home",
      });

    await expect(requestV1("PUT", {
      expectedDigest: openedBody.digest,
      document: electronicPetM1SceneDocumentV1,
    })).resolves.toMatchObject({ status: 409, body: { error: "digest_conflict" } });
    await expect(requestV1("PUT", {
      expectedDigest: writtenBody.digest,
      document: { ...edited, label: "" },
    })).resolves.toMatchObject({ status: 422, body: { error: "pet_scene_invalid" } });
    expect(JSON.parse(await readFile(resolve(appRoot, petSceneSourcePathV1), "utf8")))
      .toMatchObject({
        label: "Human-tuned home",
      });
  });

  it("falls through outside its one fixed route", () => {
    const next = vi.fn();
    const request = Readable.from([]) as IncomingMessage;
    request.method = "GET";
    request.url = "/unrelated";
    createPetSceneSourceMiddlewareV1(appRoot)(
      request,
      {} as ServerResponse,
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });
});
