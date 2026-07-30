// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it } from "vitest";

import {
  emptyVersionStampV1,
  formatVersionStampV1,
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
      readVersionStampV1({
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
    expect(readVersionStampV1("garbage")).toEqual(emptyVersionStampV1);
    expect(readVersionStampV1(null)).toEqual(emptyVersionStampV1);
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
