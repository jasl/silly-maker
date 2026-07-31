// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import {
  createDesktopShellFetchInternalV1,
  desktopShellCapabilityHeaderInternalV1,
} from "./desktop-shell-capability.ts";

const capabilityV1 = "a".repeat(43);

describe("Desktop shell capability fetch", () => {
  it("captures one validated capability and forces it onto every request", async () => {
    const fetchImpl = vi.fn(async () => new Response("ok"));
    const shellFetch = createDesktopShellFetchInternalV1(
      capabilityV1,
      fetchImpl as unknown as typeof fetch,
    );

    await shellFetch("/sillymaker/records/commit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [desktopShellCapabilityHeaderInternalV1]: "attacker-value",
      },
      body: "{}",
      redirect: "follow",
    });

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get(desktopShellCapabilityHeaderInternalV1)).toBe(capabilityV1);
    expect(init.mode).toBe("same-origin");
    expect(init.redirect).toBe("error");
  });

  it.each([undefined, null, "", "short", `${"a".repeat(42)}!`, 7])(
    "rejects malformed capability %j",
    (capability) => {
      expect(() => createDesktopShellFetchInternalV1(capability)).toThrow(
        "web.desktop_shell_capability_invalid",
      );
    },
  );
});
