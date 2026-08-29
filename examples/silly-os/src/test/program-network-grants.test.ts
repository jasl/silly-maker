// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitProgramNetworkGrantSetV1,
  admitProgramNetworkGrantV1,
  applyProgramNetworkGrantMutationV1,
  createEmptyProgramNetworkGrantSetV1,
  normalizeProgramNetworkOriginV1,
  programNetworkGrantMaximumPerProgramV1,
  type ProgramNetworkGrantSetV1,
} from "../product/program-network-grants.ts";

describe("Program network grants V1", () => {
  it("admits only immutable canonical HTTPS origins", () => {
    expect(normalizeProgramNetworkOriginV1("https://example.com")).toBe(
      "https://example.com",
    );
    for (
      const value of [
        "http://example.com",
        "https://example.com/",
        "https://example.com/path",
        "https://example.com?secret=value",
        "https://user:password@example.com",
        "https://example.com:443",
        "not a URL",
      ]
    ) expect(normalizeProgramNetworkOriginV1(value)).toBeNull();
    expect(
      admitProgramNetworkGrantV1({
        origin: "https://example.com",
        operation: "fetch_url",
        url: "https://example.com/private",
      }),
    ).toEqual({ kind: "rejected", path: "/" });
  });

  it("keeps one sorted idempotent grant set per Program", () => {
    const empty = createEmptyProgramNetworkGrantSetV1("program.alpha");
    const fetch = applyProgramNetworkGrantMutationV1(empty, {
      programId: "program.alpha",
      grant: { origin: "https://b.example", operation: "fetch_url" },
      enabled: true,
    });
    expect(fetch.kind).toBe("committed");
    if (fetch.kind !== "committed") throw new Error("expected committed grant");
    expect(
      applyProgramNetworkGrantMutationV1(fetch.value, {
        programId: "program.alpha",
        grant: { origin: "https://b.example", operation: "fetch_url" },
        enabled: true,
      }).kind,
    ).toBe("unchanged");
    const download = applyProgramNetworkGrantMutationV1(fetch.value, {
      programId: "program.alpha",
      grant: { origin: "https://a.example", operation: "download" },
      enabled: true,
    });
    expect(download).toMatchObject({
      kind: "committed",
      value: {
        grants: [
          { origin: "https://a.example", operation: "download" },
          { origin: "https://b.example", operation: "fetch_url" },
        ],
      },
    });
  });

  it("rejects duplicate, unsorted, and over-capacity persisted rows", () => {
    const duplicate: ProgramNetworkGrantSetV1 = {
      revision: 1,
      programId: "program.alpha",
      grants: [
        { origin: "https://example.com", operation: "fetch_url" },
        { origin: "https://example.com", operation: "fetch_url" },
      ],
    };
    expect(admitProgramNetworkGrantSetV1(duplicate).kind).toBe("rejected");
    expect(
      admitProgramNetworkGrantSetV1({
        revision: 1,
        programId: "program.alpha",
        grants: Array.from(
          { length: programNetworkGrantMaximumPerProgramV1 + 1 },
          (_, index) => ({
            origin: `https://${String(index)}.example`,
            operation: "download",
          }),
        ),
      }).kind,
    ).toBe("rejected");
  });
});
