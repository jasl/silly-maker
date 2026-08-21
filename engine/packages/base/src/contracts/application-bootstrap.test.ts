// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { admitApplicationBootstrapConfigV1 } from "./application-bootstrap.ts";

describe("admitApplicationBootstrapConfigV1", () => {
  it.each(
    [
      { revision: 1, entry: "runtime", target: "browser" },
      { revision: 1, entry: "author", target: "browser" },
      { revision: 1, entry: "runtime", target: "deno_desktop" },
      { revision: 1, entry: "author", target: "deno_desktop" },
    ] as const,
  )("admits and freezes the exact $entry/$target receipt", (input) => {
    const admitted = admitApplicationBootstrapConfigV1(input);

    expect(admitted).toEqual(input);
    expect(admitted).not.toBe(input);
    expect(Object.isFrozen(admitted)).toBe(true);
    expect(Object.keys(admitted).toSorted()).toEqual(["entry", "revision", "target"]);
  });

  it("captures values without retaining a mutable input object", () => {
    const input: { revision: number; entry: string; target: string } = {
      revision: 1,
      entry: "runtime",
      target: "browser",
    };
    const admitted = admitApplicationBootstrapConfigV1(input);

    input.entry = "author";
    input.target = "deno_desktop";

    expect(admitted).toEqual({ revision: 1, entry: "runtime", target: "browser" });
  });

  it.each([null, undefined, "runtime", 1, [], () => undefined])(
    "rejects a non-record input %#",
    (input) => {
      expect(() => admitApplicationBootstrapConfigV1(input)).toThrow(
        "application_bootstrap.invalid_record",
      );
    },
  );

  it.each([
    { revision: 1, entry: "runtime" },
    { revision: 1, entry: "runtime", target: "browser", extra: true },
    { revision: 1, entry: "runtime", target: "browser", ["__proto__"]: null },
  ])("rejects missing or additional own fields %#", (input) => {
    expect(() => admitApplicationBootstrapConfigV1(input)).toThrow(
      "application_bootstrap.invalid_fields",
    );
  });

  it("rejects symbol and non-enumerable fields", () => {
    const symbolField = {
      revision: 1,
      entry: "runtime",
      target: "browser",
      [Symbol("extra")]: true,
    };
    const nonEnumerable = Object.defineProperties({}, {
      revision: { value: 1, enumerable: true },
      entry: { value: "runtime", enumerable: true },
      target: { value: "browser", enumerable: false },
    });

    expect(() => admitApplicationBootstrapConfigV1(symbolField)).toThrow(
      "application_bootstrap.invalid_fields",
    );
    expect(() => admitApplicationBootstrapConfigV1(nonEnumerable)).toThrow(
      "application_bootstrap.invalid_fields",
    );
  });

  it.each([Object.create(null), Object.create({ inherited: true })])(
    "rejects a non-plain record prototype %#",
    (prototypeRecord) => {
      Object.assign(prototypeRecord, {
        revision: 1,
        entry: "runtime",
        target: "browser",
      });
      expect(() => admitApplicationBootstrapConfigV1(prototypeRecord)).toThrow(
        "application_bootstrap.invalid_record",
      );
    },
  );

  it("rejects accessors without evaluating them", () => {
    const getter = vi.fn(() => "runtime");
    const input = Object.defineProperties({}, {
      revision: { value: 1, enumerable: true },
      entry: { get: getter, enumerable: true },
      target: { value: "browser", enumerable: true },
    });

    expect(() => admitApplicationBootstrapConfigV1(input)).toThrow(
      "application_bootstrap.invalid_fields",
    );
    expect(getter).not.toHaveBeenCalled();
  });

  it.each(
    [
      [{ revision: 2, entry: "runtime", target: "browser" }, "unsupported_revision"],
      [{ revision: 1, entry: "player", target: "browser" }, "invalid_entry"],
      [{ revision: 1, entry: "runtime", target: "desktop" }, "invalid_target"],
    ] as const,
  )("rejects an invalid admitted value %#", (input, code) => {
    expect(() => admitApplicationBootstrapConfigV1(input)).toThrow(
      `application_bootstrap.${code}`,
    );
  });
});
