// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  allocateShellCapabilityInternalV1,
  classifyShellHttpRequestInternalV1,
  createShellHttpHandlerInternalV1,
  shellCapabilityHeaderInternalV1,
} from "./shell-http-admission.mts";

const capabilityV1 = "a".repeat(43);
const originV1 = "http://127.0.0.1:41800";
const expectedOriginV1 = new URL(originV1);

function requestV1(
  url: string,
  input: {
    readonly capability?: string;
    readonly origin?: string;
    readonly site?: string;
  } = {},
): Request {
  return new Request(url, {
    headers: {
      ...(input.capability === undefined
        ? {}
        : { [shellCapabilityHeaderInternalV1]: input.capability }),
      ...(input.origin === undefined ? {} : { origin: input.origin }),
      ...(input.site === undefined ? {} : { "sec-fetch-site": input.site }),
    },
  });
}

describe("Desktop shell HTTP admission", () => {
  it("allocates one 32-byte base64url capability per launch", () => {
    let calls = 0;
    const capability = allocateShellCapabilityInternalV1((size) => {
      calls += 1;
      expect(size).toBe(32);
      return new Uint8Array(size).fill(0xff);
    });

    expect(capability).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(calls).toBe(1);
  });

  it("owns route classification and requires the launch capability for private routes", () => {
    expect(
      classifyShellHttpRequestInternalV1(
        requestV1("http://127.0.0.1:41800/index.html"),
        expectedOriginV1,
        capabilityV1,
      ),
    ).toEqual({ kind: "static", pathname: "/index.html" });
    expect(
      classifyShellHttpRequestInternalV1(
        requestV1("http://127.0.0.1:41800/sillymaker/records"),
        expectedOriginV1,
        capabilityV1,
      ),
    ).toEqual({ kind: "rejected", status: 403 });
    expect(
      classifyShellHttpRequestInternalV1(
        requestV1("http://127.0.0.1:41800/sillymaker/records", {
          capability: "b".repeat(43),
        }),
        expectedOriginV1,
        capabilityV1,
      ),
    ).toEqual({ kind: "rejected", status: 403 });
    expect(
      classifyShellHttpRequestInternalV1(
        requestV1("http://127.0.0.1:41800/sillymaker/records", {
          capability: capabilityV1,
          origin: "http://127.0.0.1:41800",
          site: "same-origin",
        }),
        expectedOriginV1,
        capabilityV1,
      ),
    ).toEqual({ kind: "records", subPath: "" });
    expect(
      classifyShellHttpRequestInternalV1(
        requestV1("http://127.0.0.1:41800/sillymaker/files/download", {
          capability: capabilityV1,
        }),
        expectedOriginV1,
        capabilityV1,
      ),
    ).toEqual({ kind: "files", subPath: "/download" });
    expect(
      classifyShellHttpRequestInternalV1(
        requestV1("http://127.0.0.1:41800/sillymaker/companion/rpc?stream=1", {
          capability: capabilityV1,
        }),
        expectedOriginV1,
        capabilityV1,
      ),
    ).toEqual({ kind: "companion", subPath: "/rpc", search: "?stream=1" });
  });

  it("rejects DNS-rebinding Host or port values and cross-site requests", () => {
    expect(
      classifyShellHttpRequestInternalV1(
        requestV1("http://127.0.0.1:41800/index.html"),
        null,
        capabilityV1,
      ),
    ).toEqual({ kind: "rejected", status: 421 });
    expect(
      classifyShellHttpRequestInternalV1(
        requestV1("http://attacker.example/index.html"),
        expectedOriginV1,
        capabilityV1,
      ),
    ).toEqual({ kind: "rejected", status: 421 });
    expect(
      classifyShellHttpRequestInternalV1(
        requestV1("http://attacker.example/sillymaker/files/download", {
          capability: capabilityV1,
        }),
        expectedOriginV1,
        capabilityV1,
      ),
    ).toEqual({ kind: "rejected", status: 421 });
    expect(
      classifyShellHttpRequestInternalV1(
        requestV1("http://127.0.0.1:41999/sillymaker/files/download", {
          capability: capabilityV1,
        }),
        expectedOriginV1,
        capabilityV1,
      ),
    ).toEqual({ kind: "rejected", status: 421 });
    expect(
      classifyShellHttpRequestInternalV1(
        requestV1("http://127.0.0.1:41800/sillymaker/files/download", {
          capability: capabilityV1,
          origin: "https://attacker.example",
          site: "cross-site",
        }),
        expectedOriginV1,
        capabilityV1,
      ),
    ).toEqual({ kind: "rejected", status: 403 });
    expect(
      classifyShellHttpRequestInternalV1(
        requestV1("http://127.0.0.1:41800/sillymaker/records", {
          capability: capabilityV1,
          origin: "https://attacker.example",
          site: "same-site",
        }),
        expectedOriginV1,
        capabilityV1,
      ),
    ).toEqual({ kind: "rejected", status: 403 });
  });

  it("does not dispatch rejected traffic to static or private handlers", async () => {
    const calls: string[] = [];
    const handler = createShellHttpHandlerInternalV1({
      expectedOrigin: () => expectedOriginV1,
      capability: capabilityV1,
      handleStatic: () => {
        calls.push("static");
        return new Response("static");
      },
      handleFiles: () => {
        calls.push("files");
        return new Response("files");
      },
      handleRecords: () => {
        calls.push("records");
        return new Response("records");
      },
      handleCompanion: (_request, subPath, search) => {
        calls.push(`companion:${subPath}${search}`);
        return new Response("companion");
      },
    });

    expect((await handler(requestV1("http://attacker.example/index.html"))).status).toBe(421);
    expect((await handler(requestV1("http://127.0.0.1:41800/sillymaker/records"))).status).toBe(
      403,
    );
    expect(calls).toEqual([]);

    expect(
      (
        await handler(
          requestV1("http://127.0.0.1:41800/sillymaker/records", {
            capability: capabilityV1,
          }),
        )
      ).status,
    ).toBe(200);
    expect(calls).toEqual(["records"]);

    expect(
      (
        await handler(
          requestV1("http://127.0.0.1:41800/sillymaker/companion/rpc?stream=1", {
            capability: capabilityV1,
          }),
        )
      ).status,
    ).toBe(200);
    expect(calls).toEqual(["records", "companion:/rpc?stream=1"]);
  });

  it("keeps the fixed companion namespace inert when no application selects it", async () => {
    const handler = createShellHttpHandlerInternalV1({
      expectedOrigin: () => expectedOriginV1,
      capability: capabilityV1,
      handleStatic: () => new Response("static"),
      handleFiles: () => new Response("files"),
      handleRecords: () => new Response("records"),
    });
    const response = await handler(
      requestV1("http://127.0.0.1:41800/sillymaker/companion/rpc", {
        capability: capabilityV1,
      }),
    );
    expect(response.status).toBe(404);
  });
});
