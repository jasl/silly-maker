// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  createAuthoritativeAmbientGuardDefinitionsV1,
  createFunctionAmbientGuardDefinitionV1,
  createReflectionAmbientGuardDefinitionsV1,
  runAmbientTripwireProbeV1,
} from "../testing/ambient-tripwire.ts";
import {
  runAuthoritativeDeterminismTripwireV1,
  type TripwireWorkerLikeV1,
} from "../testing/ambient-tripwire-runner.ts";
import { authoritativeDeterminismTraceExpectedV1 } from "../testing/authoritative-determinism-driver.ts";

function throwsReferenceErrorV1(): never {
  throw new ReferenceError("synthetic missing binding");
}

function syntheticFunctionGuardV1() {
  return createFunctionAmbientGuardDefinitionV1({
    guardId: "entropy.synthetic",
    category: "entropy",
    code: "determinism.ambient_random",
    path: Object.freeze(["ambient"]),
    absenceProbe: throwsReferenceErrorV1,
    absenceErrorName: "ReferenceError",
  });
}

describe("ambient tripwire pure harness", () => {
  it("fails closed before driver import when an existing descriptor cannot be replaced", async () => {
    const realm = Object.create(null) as Record<PropertyKey, unknown>;
    Object.defineProperty(realm, "ambient", {
      configurable: false,
      enumerable: true,
      value: () => 1,
      writable: false,
    });
    let driverImports = 0;

    const result = await runAmbientTripwireProbeV1({
      runtime: "browser",
      realm,
      guards: Object.freeze([syntheticFunctionGuardV1()]),
      async loadDriver() {
        driverImports += 1;
        return Object.freeze({ run: async () => "unreachable" });
      },
    });

    expect(result).toMatchObject({
      kind: "tripwire_unavailable",
      runtime: "browser",
      guardId: "entropy.synthetic",
      reason: "descriptor_not_replaceable",
      counts: {
        declaredGuards: 1,
        installedGuards: 0,
        nativeAbsentGuards: 0,
        selfTests: 0,
        driverImports: 0,
        driverRuns: 0,
        violations: 0,
      },
    });
    expect(driverImports).toBe(0);
  });

  it("fails closed when replacement reports success but is not effective", async () => {
    const original = () => 1;
    const target = Object.assign(Object.create(null), { ambient: original });
    const realm = new Proxy(target, {
      defineProperty(proxyTarget, key, descriptor) {
        Reflect.defineProperty(proxyTarget, key, descriptor);
        return true;
      },
      get: () => original,
    });

    const result = await runAmbientTripwireProbeV1({
      runtime: "browser",
      realm,
      guards: Object.freeze([syntheticFunctionGuardV1()]),
      loadDriver: async () => Object.freeze({ run: async () => "unreachable" }),
    });

    expect(result).toMatchObject({
      kind: "tripwire_unavailable",
      guardId: "entropy.synthetic",
      reason: "replacement_ineffective",
      counts: { driverImports: 0, driverRuns: 0 },
    });
  });

  it("records a proven absent global as coverage instead of skipping it", async () => {
    const result = await runAmbientTripwireProbeV1({
      runtime: "browser",
      realm: Object.create(null),
      guards: Object.freeze([syntheticFunctionGuardV1()]),
      loadDriver: async () => Object.freeze({ run: async () => "clean" }),
    });

    expect(result).toEqual({
      kind: "passed",
      runtime: "browser",
      coverage: [
        {
          guardId: "entropy.synthetic",
          categories: ["entropy"],
          state: "native_absent",
        },
      ],
      counts: {
        declaredGuards: 1,
        installedGuards: 0,
        nativeAbsentGuards: 1,
        selfTests: 1,
        driverImports: 1,
        driverRuns: 1,
        violations: 0,
      },
      value: "clean",
    });
  });

  it("rejects an absent target whose direct probe does not fail as specified", async () => {
    const guard = createFunctionAmbientGuardDefinitionV1({
      guardId: "entropy.synthetic",
      category: "entropy",
      code: "determinism.ambient_random",
      path: Object.freeze(["ambient"]),
      absenceProbe: () => undefined,
      absenceErrorName: "ReferenceError",
    });

    const result = await runAmbientTripwireProbeV1({
      runtime: "browser",
      realm: Object.create(null),
      guards: Object.freeze([guard]),
      loadDriver: async () => Object.freeze({ run: async () => "unreachable" }),
    });

    expect(result).toMatchObject({
      kind: "tripwire_unavailable",
      guardId: "entropy.synthetic",
      reason: "absence_probe_failed",
      counts: { driverImports: 0, driverRuns: 0 },
    });
  });

  it("requires an absent binding to fail identically on repeated probes", async () => {
    let calls = 0;
    const guard = createFunctionAmbientGuardDefinitionV1({
      guardId: "entropy.synthetic",
      category: "entropy",
      code: "determinism.ambient_random",
      path: Object.freeze(["ambient"]),
      absenceProbe() {
        calls += 1;
        if (calls === 1) throw new ReferenceError("first probe only");
        return undefined;
      },
      absenceErrorName: "ReferenceError",
    });

    const result = await runAmbientTripwireProbeV1({
      runtime: "browser",
      realm: Object.create(null),
      guards: Object.freeze([guard]),
      loadDriver: async () => Object.freeze({ run: async () => "unreachable" }),
    });

    expect(result).toMatchObject({
      kind: "tripwire_unavailable",
      guardId: "entropy.synthetic",
      reason: "absence_probe_failed",
      counts: { driverImports: 0, driverRuns: 0 },
    });
    expect(calls).toBe(2);
  });

  it("latches an import-time ambient call with a stable category and phase", async () => {
    const realm = Object.assign(Object.create(null), { ambient: () => 1 }) as Record<
      PropertyKey,
      unknown
    >;

    const result = await runAmbientTripwireProbeV1({
      runtime: "browser",
      realm,
      guards: Object.freeze([syntheticFunctionGuardV1()]),
      async loadDriver() {
        (Reflect.get(realm, "ambient") as () => unknown)();
        return Object.freeze({ run: async () => "unreachable" });
      },
    });

    expect(result).toMatchObject({
      kind: "tripwire_violation",
      guardId: "entropy.synthetic",
      code: "determinism.ambient_random",
      category: "entropy",
      phase: "module_import",
      counts: { driverImports: 1, driverRuns: 0, violations: 1 },
    });
  });

  it("guards the defining prototype slot instead of leaving an inherited bypass", async () => {
    const prototype = Object.assign(Object.create(null), { ambient: () => 1 });
    const realm = Object.create(prototype) as Record<PropertyKey, unknown>;

    const result = await runAmbientTripwireProbeV1({
      runtime: "browser",
      realm,
      guards: Object.freeze([syntheticFunctionGuardV1()]),
      loadDriver: async () =>
        Object.freeze({
          async run() {
            try {
              (Reflect.get(Object.getPrototypeOf(realm), "ambient") as () => unknown)();
            } catch {}
            return "caught";
          },
        }),
    });

    expect(result).toMatchObject({
      kind: "tripwire_violation",
      guardId: "entropy.synthetic",
      code: "determinism.ambient_random",
      category: "entropy",
      phase: "driver_run",
      counts: { driverImports: 1, driverRuns: 1, violations: 1 },
    });
  });

  it("does not run a driver after its module loader catches an ambient violation", async () => {
    const realm = Object.assign(Object.create(null), { ambient: () => 1 }) as Record<
      PropertyKey,
      unknown
    >;
    let driverRuns = 0;

    const result = await runAmbientTripwireProbeV1({
      runtime: "browser",
      realm,
      guards: Object.freeze([syntheticFunctionGuardV1()]),
      async loadDriver() {
        try {
          (Reflect.get(realm, "ambient") as () => unknown)();
        } catch {}
        return Object.freeze({
          async run() {
            driverRuns += 1;
            return "must not run";
          },
        });
      },
    });

    expect(result).toMatchObject({
      kind: "tripwire_violation",
      guardId: "entropy.synthetic",
      code: "determinism.ambient_random",
      category: "entropy",
      phase: "module_import",
      counts: { driverImports: 1, driverRuns: 0, violations: 1 },
    });
    expect(driverRuns).toBe(0);
  });

  it("keeps a caught ambient violation ahead of a later ordinary driver error", async () => {
    const realm = Object.assign(Object.create(null), { ambient: () => 1 }) as Record<
      PropertyKey,
      unknown
    >;

    const result = await runAmbientTripwireProbeV1({
      runtime: "browser",
      realm,
      guards: Object.freeze([syntheticFunctionGuardV1()]),
      loadDriver: async () =>
        Object.freeze({
          async run() {
            try {
              (Reflect.get(realm, "ambient") as () => unknown)();
            } catch {}
            throw new Error("ordinary driver failure");
          },
        }),
    });

    expect(result).toMatchObject({
      kind: "tripwire_violation",
      guardId: "entropy.synthetic",
      code: "determinism.ambient_random",
      category: "entropy",
      phase: "driver_run",
      counts: { driverImports: 1, driverRuns: 1, violations: 1 },
    });
  });

  it("latches reflection mutation of a protected slot as capability escape", async () => {
    const objectApi = Object.assign(Object.create(null), {
      defineProperties: Object.defineProperties,
      defineProperty: Object.defineProperty,
    });
    const reflectApi = Object.assign(Object.create(null), {
      defineProperty: Reflect.defineProperty,
      deleteProperty: Reflect.deleteProperty,
      set: Reflect.set,
    });
    const realm = Object.assign(Object.create(null), {
      ambient: () => 1,
      Object: objectApi,
      Reflect: reflectApi,
    }) as Record<PropertyKey, unknown>;

    const result = await runAmbientTripwireProbeV1({
      runtime: "browser",
      realm,
      guards: Object.freeze([
        syntheticFunctionGuardV1(),
        ...createReflectionAmbientGuardDefinitionsV1(),
      ]),
      loadDriver: async () =>
        Object.freeze({
          async run() {
            try {
              objectApi.defineProperty(realm, "ambient", {
                configurable: true,
                value: () => 2,
              });
            } catch {}
            return "caught";
          },
        }),
    });

    expect(result).toMatchObject({
      kind: "tripwire_violation",
      guardId: "reflection.object-define-property",
      code: "determinism.ambient_capability_escape",
      category: "capability_escape",
      phase: "driver_run",
      counts: { driverImports: 1, driverRuns: 1, violations: 1 },
    });
  });

  it("latches Reflect.set before a protected setter can be used as an escape", async () => {
    const objectApi = Object.assign(Object.create(null), {
      defineProperties: Object.defineProperties,
      defineProperty: Object.defineProperty,
    });
    const reflectApi = Object.assign(Object.create(null), {
      defineProperty: Reflect.defineProperty,
      deleteProperty: Reflect.deleteProperty,
      set: Reflect.set,
    });
    const realm = Object.assign(Object.create(null), {
      ambient: () => 1,
      Object: objectApi,
      Reflect: reflectApi,
    }) as Record<PropertyKey, unknown>;

    const result = await runAmbientTripwireProbeV1({
      runtime: "browser",
      realm,
      guards: Object.freeze([
        syntheticFunctionGuardV1(),
        ...createReflectionAmbientGuardDefinitionsV1(),
      ]),
      loadDriver: async () =>
        Object.freeze({
          async run() {
            try {
              reflectApi.set(realm, "ambient", () => 2);
            } catch {}
            return "caught";
          },
        }),
    });

    expect(result).toMatchObject({
      kind: "tripwire_violation",
      guardId: "reflection.reflect-set",
      code: "determinism.ambient_capability_escape",
      category: "capability_escape",
      phase: "driver_run",
      counts: { driverImports: 1, driverRuns: 1, violations: 1 },
    });
  });

  it("latches Reflect.deleteProperty against a protected slot", async () => {
    const objectApi = Object.assign(Object.create(null), {
      defineProperties: Object.defineProperties,
      defineProperty: Object.defineProperty,
    });
    const reflectApi = Object.assign(Object.create(null), {
      defineProperty: Reflect.defineProperty,
      deleteProperty: Reflect.deleteProperty,
      set: Reflect.set,
    });
    const realm = Object.assign(Object.create(null), {
      ambient: () => 1,
      Object: objectApi,
      Reflect: reflectApi,
    }) as Record<PropertyKey, unknown>;

    const result = await runAmbientTripwireProbeV1({
      runtime: "browser",
      realm,
      guards: Object.freeze([
        syntheticFunctionGuardV1(),
        ...createReflectionAmbientGuardDefinitionsV1(),
      ]),
      loadDriver: async () =>
        Object.freeze({
          async run() {
            try {
              reflectApi.deleteProperty(realm, "ambient");
            } catch {}
            return "caught";
          },
        }),
    });

    expect(result).toMatchObject({
      kind: "tripwire_violation",
      guardId: "reflection.reflect-delete-property",
      code: "determinism.ambient_capability_escape",
      category: "capability_escape",
      phase: "driver_run",
      counts: { driverImports: 1, driverRuns: 1, violations: 1 },
    });
  });

  it("keeps ordinary module and driver errors outside the violation classification", async () => {
    const realm = Object.assign(Object.create(null), { ambient: () => 1 });
    const guard = syntheticFunctionGuardV1();

    const importFailure = await runAmbientTripwireProbeV1({
      runtime: "browser",
      realm,
      guards: Object.freeze([guard]),
      loadDriver: async () => {
        throw new Error("ordinary import failure");
      },
    });
    expect(importFailure).toMatchObject({
      kind: "driver_failed",
      phase: "module_import",
      counts: { driverImports: 1, driverRuns: 0, violations: 0 },
    });

    const secondRealm = Object.assign(Object.create(null), { ambient: () => 1 });
    const runFailure = await runAmbientTripwireProbeV1({
      runtime: "browser",
      realm: secondRealm,
      guards: Object.freeze([syntheticFunctionGuardV1()]),
      loadDriver: async () =>
        Object.freeze({
          run: async () => {
            throw new Error("ordinary driver failure");
          },
        }),
    });
    expect(runFailure).toMatchObject({
      kind: "driver_failed",
      phase: "driver_run",
      counts: { driverImports: 1, driverRuns: 1, violations: 0 },
    });
  });
});

describe("Deno isolated authoritative tripwire", () => {
  it("runs the exact neutral trace with all ambient categories accounted for", async () => {
    const before = {
      mathRandom: Math.random,
      dateNow: Date.now,
      fetch: globalThis.fetch,
      cryptoRandom: globalThis.crypto.getRandomValues,
      performanceNow: globalThis.performance.now,
    };

    const receipt = await runAuthoritativeDeterminismTripwireV1({
      bootstrapInput: Object.freeze({ schemaVersion: 1, rngSeed: 97 }),
      scenario: "trace",
    });

    expect(receipt.workerTerminations).toBe(1);
    expect(receipt.result.kind).toBe("passed");
    if (receipt.result.kind !== "passed") throw new TypeError("tripwire did not pass");
    expect(receipt.result.value).toEqual(authoritativeDeterminismTraceExpectedV1);
    expect(new Set(receipt.result.coverage.flatMap((entry) => entry.categories))).toEqual(
      new Set([
        "entropy",
        "clock",
        "host_timezone",
        "network",
        "environment",
        "locale_default",
        "dom",
        "capability_escape",
      ]),
    );
    expect(receipt.result.coverage).toHaveLength(receipt.result.counts.declaredGuards);
    expect(
      receipt.result.counts.installedGuards + receipt.result.counts.nativeAbsentGuards,
    ).toBe(receipt.result.counts.declaredGuards);
    expect(receipt.result.counts.selfTests).toBe(receipt.result.counts.declaredGuards);
    expect(receipt.result.counts).toMatchObject({
      driverImports: 1,
      driverRuns: 1,
      violations: 0,
    });
    expect({
      mathRandom: Math.random,
      dateNow: Date.now,
      fetch: globalThis.fetch,
      cryptoRandom: globalThis.crypto.getRandomValues,
      performanceNow: globalThis.performance.now,
    }).toEqual(before);
  });

  it("classifies an intentional import-time ambient call and still terminates once", async () => {
    const receipt = await runAuthoritativeDeterminismTripwireV1({
      bootstrapInput: Object.freeze({ schemaVersion: 1, rngSeed: 97 }),
      scenario: "ambient_random",
    });

    expect(receipt.workerTerminations).toBe(1);
    expect(receipt.result).toMatchObject({
      kind: "tripwire_violation",
      runtime: "deno",
      guardId: "entropy.math-random",
      code: "determinism.ambient_random",
      category: "entropy",
      phase: "module_import",
      counts: { driverImports: 1, driverRuns: 0, violations: 1 },
    });
  });

  it("classifies an inherited crypto prototype bypass in the real Worker", async () => {
    const receipt = await runAuthoritativeDeterminismTripwireV1({
      bootstrapInput: Object.freeze({ schemaVersion: 1, rngSeed: 97 }),
      scenario: "ambient_crypto_prototype",
    });

    expect(receipt.workerTerminations).toBe(1);
    expect(receipt.result).toMatchObject({
      kind: "tripwire_violation",
      runtime: "deno",
      guardId: "entropy.crypto-get-random-values",
      code: "determinism.crypto_random",
      category: "entropy",
      phase: "module_import",
      counts: { driverImports: 1, driverRuns: 0, violations: 1 },
    });
  });

  it("rejects an explicit-zone spelling with an impossible Gregorian date", async () => {
    const receipt = await runAuthoritativeDeterminismTripwireV1({
      bootstrapInput: Object.freeze({ schemaVersion: 1, rngSeed: 97 }),
      scenario: "ambient_invalid_date",
    });

    expect(receipt.workerTerminations).toBe(1);
    expect(receipt.result).toMatchObject({
      kind: "tripwire_violation",
      runtime: "deno",
      guardId: "host-timezone.date-input",
      code: "determinism.date_input_unverified",
      category: "host_timezone",
      phase: "module_import",
      counts: { driverImports: 1, driverRuns: 0, violations: 1 },
    });
  });

  it("classifies a valid zone-less date spelling as host-timezone input", async () => {
    const receipt = await runAuthoritativeDeterminismTripwireV1({
      bootstrapInput: Object.freeze({ schemaVersion: 1, rngSeed: 97 }),
      scenario: "ambient_local_date",
    });

    expect(receipt.workerTerminations).toBe(1);
    expect(receipt.result).toMatchObject({
      kind: "tripwire_violation",
      runtime: "deno",
      guardId: "host-timezone.date-parse",
      code: "determinism.host_timezone",
      category: "host_timezone",
      phase: "module_import",
      counts: { driverImports: 1, driverRuns: 0, violations: 1 },
    });
  });

  it("uses the same invalid-input classification for the Date constructor", async () => {
    const receipt = await runAuthoritativeDeterminismTripwireV1({
      bootstrapInput: Object.freeze({ schemaVersion: 1, rngSeed: 97 }),
      scenario: "ambient_invalid_date_constructor",
    });

    expect(receipt.result).toMatchObject({
      kind: "tripwire_violation",
      guardId: "host-timezone.date-input",
      code: "determinism.date_input_unverified",
      category: "host_timezone",
      phase: "module_import",
      counts: { driverImports: 1, driverRuns: 0, violations: 1 },
    });
    expect(receipt.workerTerminations).toBe(1);
  });

  it("uses the same host-timezone classification for a local Date constructor", async () => {
    const receipt = await runAuthoritativeDeterminismTripwireV1({
      bootstrapInput: Object.freeze({ schemaVersion: 1, rngSeed: 97 }),
      scenario: "ambient_local_date_constructor",
    });

    expect(receipt.result).toMatchObject({
      kind: "tripwire_violation",
      guardId: "host-timezone.date-constructor",
      code: "determinism.host_timezone",
      category: "host_timezone",
      phase: "module_import",
      counts: { driverImports: 1, driverRuns: 0, violations: 1 },
    });
    expect(receipt.workerTerminations).toBe(1);
  });

  it("classifies access to a runtime environment root before its member can run", async () => {
    const receipt = await runAuthoritativeDeterminismTripwireV1({
      bootstrapInput: Object.freeze({ schemaVersion: 1, rngSeed: 97 }),
      scenario: "ambient_environment_root",
    });

    expect(receipt.workerTerminations).toBe(1);
    expect(receipt.result).toMatchObject({
      kind: "tripwire_violation",
      runtime: "deno",
      guardId: "environment.deno-root",
      code: "determinism.environment",
      category: "environment",
      phase: "module_import",
      counts: { driverImports: 1, driverRuns: 0, violations: 1 },
    });
  });

  it("classifies reflection against a guarded Date static as capability escape", async () => {
    const receipt = await runAuthoritativeDeterminismTripwireV1({
      bootstrapInput: Object.freeze({ schemaVersion: 1, rngSeed: 97 }),
      scenario: "ambient_date_reflection",
    });

    expect(receipt.workerTerminations).toBe(1);
    expect(receipt.result).toMatchObject({
      kind: "tripwire_violation",
      runtime: "deno",
      guardId: "reflection.object-define-property",
      code: "determinism.ambient_capability_escape",
      category: "capability_escape",
      phase: "module_import",
      counts: { driverImports: 1, driverRuns: 0, violations: 1 },
    });
  });

  it("classifies the performance root before any browser-visible clock member", async () => {
    const receipt = await runAuthoritativeDeterminismTripwireV1({
      bootstrapInput: Object.freeze({ schemaVersion: 1, rngSeed: 97 }),
      scenario: "ambient_performance_json",
    });

    expect(receipt.workerTerminations).toBe(1);
    expect(receipt.result).toMatchObject({
      kind: "tripwire_violation",
      runtime: "deno",
      guardId: "clock.performance-root",
      code: "determinism.performance_clock",
      category: "clock",
      phase: "module_import",
      counts: { driverImports: 1, driverRuns: 0, violations: 1 },
    });
  });

  it("treats a malformed Worker message as driver failure and terminates once", async () => {
    let terminations = 0;
    const fakeWorker: TripwireWorkerLikeV1 = {
      addEventListener(type, listener) {
        if (type === "message") {
          queueMicrotask(() => listener({ data: { kind: "unknown" } }));
        }
      },
      postMessage() {},
      terminate() {
        terminations += 1;
      },
    };

    const receipt = await runAuthoritativeDeterminismTripwireV1({
      bootstrapInput: Object.freeze({ schemaVersion: 1, rngSeed: 97 }),
      scenario: "trace",
      createWorker: () => fakeWorker,
    });

    expect(receipt).toEqual({
      result: {
        kind: "driver_failed",
        runtime: "deno",
        phase: "protocol",
        coverage: [],
        counts: {
          declaredGuards: 0,
          installedGuards: 0,
          nativeAbsentGuards: 0,
          selfTests: 0,
          driverImports: 0,
          driverRuns: 0,
          violations: 0,
        },
      },
      workerTerminations: 1,
    });
    expect(terminations).toBe(1);
  });

  it("rejects a structurally plausible but out-of-contract Worker result", async () => {
    const fakeWorker: TripwireWorkerLikeV1 = {
      addEventListener(type, listener) {
        if (type === "message") {
          queueMicrotask(() =>
            listener({
              data: {
                kind: "passed",
                runtime: "deno",
                coverage: [],
                counts: {
                  declaredGuards: 0,
                  installedGuards: 0,
                  nativeAbsentGuards: 0,
                  selfTests: 0,
                  driverImports: 0,
                  driverRuns: 0,
                  violations: 0,
                },
                value: "forged",
              },
            })
          );
        }
      },
      postMessage() {},
      terminate() {},
    };

    const receipt = await runAuthoritativeDeterminismTripwireV1({
      bootstrapInput: Object.freeze({ schemaVersion: 1, rngSeed: 97 }),
      scenario: "trace",
      createWorker: () => fakeWorker,
    });

    expect(receipt.result).toMatchObject({
      kind: "driver_failed",
      runtime: "deno",
      phase: "protocol",
    });
    expect(receipt.workerTerminations).toBe(1);
  });

  it("rejects a passed receipt whose four trace entries are malformed", async () => {
    const guardDefinitions = createAuthoritativeAmbientGuardDefinitionsV1();
    const coverage = guardDefinitions.map((definition) => ({
      guardId: definition.guardId,
      categories: [...definition.categories],
      state: "installed",
    }));
    const fakeWorker: TripwireWorkerLikeV1 = {
      addEventListener(type, listener) {
        if (type === "message") {
          queueMicrotask(() =>
            listener({
              data: {
                kind: "passed",
                runtime: "deno",
                coverage,
                counts: {
                  declaredGuards: guardDefinitions.length,
                  installedGuards: guardDefinitions.length,
                  nativeAbsentGuards: 0,
                  selfTests: guardDefinitions.length,
                  driverImports: 1,
                  driverRuns: 1,
                  violations: 0,
                },
                value: {
                  schemaVersion: 1,
                  workload: "authoritative-determinism-v1",
                  rngAlgorithm: "xorshift32-v1",
                  commands: [null, null, null, null],
                },
              },
            })
          );
        }
      },
      postMessage() {},
      terminate() {},
    };

    const receipt = await runAuthoritativeDeterminismTripwireV1({
      bootstrapInput: Object.freeze({ schemaVersion: 1, rngSeed: 97 }),
      scenario: "trace",
      createWorker: () => fakeWorker,
    });

    expect(receipt.result).toMatchObject({
      kind: "driver_failed",
      runtime: "deno",
      phase: "protocol",
    });
    expect(receipt.workerTerminations).toBe(1);
  });

  it("terminates a Worker that never produces a message or error", async () => {
    let terminations = 0;
    const fakeWorker: TripwireWorkerLikeV1 = {
      addEventListener() {},
      postMessage() {},
      terminate() {
        terminations += 1;
      },
    };

    const receipt = await runAuthoritativeDeterminismTripwireV1({
      bootstrapInput: Object.freeze({ schemaVersion: 1, rngSeed: 97 }),
      scenario: "trace",
      createWorker: () => fakeWorker,
      scheduleTimeout(callback) {
        queueMicrotask(callback);
        return () => {};
      },
    });

    expect(receipt.result).toMatchObject({
      kind: "driver_failed",
      runtime: "deno",
      phase: "worker",
    });
    expect(receipt.workerTerminations).toBe(1);
    expect(terminations).toBe(1);
  });
});
