// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it } from "vitest";

import {
  emptyVersionStampV1,
  formatVersionStampV1,
  normalizeVersionStampInternalV1,
  readVersionStampV1,
  versionStampGlobalKeyV1,
} from "./version-stamp.ts";

afterEach(() => {
  Reflect.deleteProperty(globalThis, versionStampGlobalKeyV1);
});

describe("readVersionStampV1", () => {
  it("returns all nulls when the global is absent", () => {
    expect(readVersionStampV1()).toEqual(emptyVersionStampV1);
  });

  it("reads the injected global and trims values", () => {
    Reflect.set(globalThis, versionStampGlobalKeyV1, {
      applicationVersion: " 1.2.0 ",
      applicationCommit: "abc1234",
      engineVersion: "0.4.2",
      engineCommit: "def5678",
    });
    expect(readVersionStampV1()).toEqual({
      applicationVersion: "1.2.0",
      applicationCommit: "abc1234",
      engineVersion: "0.4.2",
      engineCommit: "def5678",
    });
  });

  it("degrades malformed fields independently without throwing", () => {
    expect(
      normalizeVersionStampInternalV1({
        applicationVersion: 42,
        applicationCommit: "",
        engineVersion: "0.4.2",
        engineCommit: undefined,
      }),
    ).toEqual({
      applicationVersion: null,
      applicationCommit: null,
      engineVersion: "0.4.2",
      engineCommit: null,
    });
    expect(normalizeVersionStampInternalV1("garbage")).toBeNull();
    expect(normalizeVersionStampInternalV1(null)).toBeNull();
  });

  it("keeps explicit undefined independent from the ambient global", () => {
    Reflect.set(globalThis, versionStampGlobalKeyV1, {
      applicationVersion: "1.2.0",
    });

    expect(normalizeVersionStampInternalV1(undefined)).toBeNull();
    expect(readVersionStampV1()).toMatchObject({ applicationVersion: "1.2.0" });
  });

  it("accepts only bounded printable diagnostic fields", () => {
    expect(
      normalizeVersionStampInternalV1({
        applicationVersion: "😀".repeat(128),
        applicationCommit: "a".repeat(128),
      }),
    ).toMatchObject({
      applicationVersion: "😀".repeat(128),
      applicationCommit: "a".repeat(128),
    });
    expect(
      normalizeVersionStampInternalV1({
        applicationVersion: "x".repeat(129),
        applicationCommit: "abc\u0007def",
        engineVersion: "ok",
      }),
    ).toEqual({
      applicationVersion: null,
      applicationCommit: null,
      engineVersion: "ok",
      engineCommit: null,
    });
  });
});

describe("formatVersionStampV1", () => {
  it("formats both sides with commits", () => {
    expect(
      formatVersionStampV1({
        applicationVersion: "1.2.0",
        applicationCommit: "abc1234",
        engineVersion: "0.4.2",
        engineCommit: "def5678",
      }),
    ).toBe("app 1.2.0 (abc1234) · engine 0.4.2 (def5678)");
  });

  it("stores full commit identity but shortens it only for display", () => {
    expect(
      formatVersionStampV1({
        applicationVersion: "1.2.0",
        applicationCommit: "abcdef0123456789abcdef0123456789abcdef01",
        engineVersion: null,
        engineCommit: null,
      }),
    ).toBe("app 1.2.0 (abcdef0)");
    expect(
      formatVersionStampV1({
        applicationVersion: "1.2.0",
        applicationCommit: "abcdef0123456789abcdef0123456789abcdef01-dirty",
        engineVersion: null,
        engineCommit: null,
      }),
    ).toBe("app 1.2.0 (abcdef0-dirty)");
    expect(
      formatVersionStampV1({
        applicationVersion: null,
        applicationCommit: "😀".repeat(13),
        engineVersion: null,
        engineCommit: null,
      }),
    ).toBe(`app ${"😀".repeat(7)}`);
  });

  it("omits missing parts gracefully", () => {
    expect(
      formatVersionStampV1({
        applicationVersion: "1.2.0",
        applicationCommit: null,
        engineVersion: null,
        engineCommit: "def5678",
      }),
    ).toBe("app 1.2.0 · engine def5678");
    expect(formatVersionStampV1(emptyVersionStampV1)).toBeNull();
  });

  it("honors custom side labels", () => {
    expect(
      formatVersionStampV1(
        {
          applicationVersion: "1.0.0",
          applicationCommit: null,
          engineVersion: null,
          engineCommit: null,
        },
        { application: "游戏" },
      ),
    ).toBe("游戏 1.0.0");
  });
});
