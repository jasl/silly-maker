// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitProgramNetworkAccessMutationResultV1,
  admitProgramNetworkAccessMutationV1,
  admitProgramNetworkAccessV1,
  applyProgramNetworkAccessMutationV1,
  createDefaultProgramNetworkAccessV1,
} from "../product/program-network-access.ts";

describe("Program network access V1", () => {
  it("admits only the exact Program-scoped boolean shape", () => {
    expect(admitProgramNetworkAccessV1({
      revision: 1,
      programId: "program.alpha",
      enabled: true,
    })).toEqual({
      kind: "admitted",
      value: { revision: 1, programId: "program.alpha", enabled: true },
    });
    expect(admitProgramNetworkAccessV1({
      revision: 1,
      programId: "program.alpha",
      enabled: true,
      origin: "https://example.test",
    })).toEqual({ kind: "rejected", path: "/" });
    expect(admitProgramNetworkAccessV1({
      revision: 1,
      programId: "program.alpha",
      enabled: "true",
    })).toEqual({ kind: "rejected", path: "/enabled" });
    expect(admitProgramNetworkAccessV1({
      revision: 2,
      programId: "program.alpha",
      enabled: false,
    })).toEqual({ kind: "rejected", path: "/revision" });
  });

  it("defaults to disabled and applies one idempotent boolean", () => {
    const disabled = createDefaultProgramNetworkAccessV1("program.alpha");
    expect(disabled).toEqual({ revision: 1, programId: "program.alpha", enabled: false });
    expect(applyProgramNetworkAccessMutationV1(disabled, {
      programId: "program.alpha",
      enabled: false,
    })).toEqual({ kind: "unchanged", value: disabled });

    const enabled = applyProgramNetworkAccessMutationV1(disabled, {
      programId: "program.alpha",
      enabled: true,
    });
    expect(enabled).toEqual({
      kind: "committed",
      value: { revision: 1, programId: "program.alpha", enabled: true },
    });
    expect(applyProgramNetworkAccessMutationV1(enabled.value, {
      programId: "program.alpha",
      enabled: true,
    })).toEqual({ kind: "unchanged", value: enabled.value });
  });

  it("rejects cross-Program, grant-shaped, and malformed mutation results", () => {
    expect(() =>
      applyProgramNetworkAccessMutationV1(
        createDefaultProgramNetworkAccessV1("program.alpha"),
        { programId: "program.beta", enabled: true },
      )
    ).toThrow("sillyos.program_network_access.program_mismatch");
    expect(admitProgramNetworkAccessMutationV1({
      programId: "program.alpha",
      enabled: true,
      operation: "fetch_url",
    })).toEqual({ kind: "rejected", path: "/" });
    expect(admitProgramNetworkAccessMutationResultV1({
      kind: "committed",
      value: {
        revision: 1,
        programId: "program.alpha",
        enabled: true,
        url: "https://example.test/private",
      },
    })).toEqual({ kind: "rejected", path: "/value/" });
  });
});
