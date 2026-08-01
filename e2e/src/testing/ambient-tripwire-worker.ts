// SPDX-License-Identifier: MIT
import {
  createAuthoritativeAmbientGuardDefinitionsV1,
  createEmptyAmbientTripwireCountsV1,
  runAmbientTripwireProbeV1,
  type AmbientTripwireResultV1,
  type AmbientTripwireRuntimeV1,
} from "./ambient-tripwire.ts";

declare const Deno: unknown;

const workerPostMessageV1 = Reflect.get(globalThis, "postMessage") as (
  message: unknown,
) => void;

function postWorkerMessageV1(message: unknown): void {
  Reflect.apply(workerPostMessageV1, globalThis, [message]);
}

interface AuthoritativeDeterminismTripwireRequestV1 {
  readonly schemaVersion: 1;
  readonly bootstrapInput: {
    readonly schemaVersion: 1;
    readonly rngSeed: number;
  };
  readonly scenario:
    | "trace"
    | "ambient_random"
    | "ambient_crypto_prototype"
    | "ambient_invalid_date"
    | "ambient_local_date"
    | "ambient_invalid_date_constructor"
    | "ambient_local_date_constructor"
    | "ambient_environment_root"
    | "ambient_date_reflection"
    | "ambient_performance_json";
}

function runtimeV1(): AmbientTripwireRuntimeV1 {
  return typeof Deno === "object" ? "deno" : "browser";
}

const workerRuntimeV1 = runtimeV1();

function isRequestV1(value: unknown): value is AuthoritativeDeterminismTripwireRequestV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<PropertyKey, unknown>;
  const bootstrap = record.bootstrapInput;
  if (typeof bootstrap !== "object" || bootstrap === null || Array.isArray(bootstrap)) return false;
  const bootstrapRecord = bootstrap as Record<PropertyKey, unknown>;
  return Reflect.ownKeys(record).length === 3 && record.schemaVersion === 1 &&
    (record.scenario === "trace" || record.scenario === "ambient_random" ||
      record.scenario === "ambient_crypto_prototype" ||
      record.scenario === "ambient_invalid_date" ||
      record.scenario === "ambient_local_date" ||
      record.scenario === "ambient_invalid_date_constructor" ||
      record.scenario === "ambient_local_date_constructor" ||
      record.scenario === "ambient_environment_root" ||
      record.scenario === "ambient_date_reflection" ||
      record.scenario === "ambient_performance_json") &&
    Reflect.ownKeys(bootstrapRecord).length === 2 && bootstrapRecord.schemaVersion === 1 &&
    Number.isInteger(bootstrapRecord.rngSeed) && (bootstrapRecord.rngSeed as number) > 0 &&
    (bootstrapRecord.rngSeed as number) <= 0xffff_ffff;
}

function protocolFailureV1(): AmbientTripwireResultV1<unknown> {
  return Object.freeze({
    kind: "driver_failed",
    runtime: workerRuntimeV1,
    phase: "protocol",
    coverage: Object.freeze([]),
    counts: createEmptyAmbientTripwireCountsV1(),
  });
}

let handled = false;
globalThis.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (handled) return;
  handled = true;
  void (async () => {
    if (!isRequestV1(event.data)) {
      postWorkerMessageV1(protocolFailureV1());
      return;
    }
    const request = event.data;
    const result = await runAmbientTripwireProbeV1({
      runtime: workerRuntimeV1,
      realm: globalThis,
      guards: createAuthoritativeAmbientGuardDefinitionsV1(),
      async loadDriver() {
        if (request.scenario === "ambient_random") {
          await import("./intentional-ambient-random.ts");
          return Object.freeze({
            run: async (): Promise<unknown> => {
              throw new TypeError("intentional ambient module unexpectedly loaded");
            },
          });
        }
        if (request.scenario === "ambient_crypto_prototype") {
          await import("./intentional-ambient-crypto-prototype.ts");
          return Object.freeze({
            run: async (): Promise<unknown> => {
              throw new TypeError("intentional ambient prototype module unexpectedly loaded");
            },
          });
        }
        if (request.scenario === "ambient_invalid_date") {
          await import("./intentional-ambient-invalid-date.ts");
          return Object.freeze({
            run: async (): Promise<unknown> => {
              throw new TypeError("intentional invalid Date module unexpectedly loaded");
            },
          });
        }
        if (request.scenario === "ambient_local_date") {
          await import("./intentional-ambient-local-date.ts");
          return Object.freeze({
            run: async (): Promise<unknown> => {
              throw new TypeError("intentional local Date module unexpectedly loaded");
            },
          });
        }
        if (request.scenario === "ambient_invalid_date_constructor") {
          await import("./intentional-ambient-invalid-date-constructor.ts");
          return Object.freeze({
            run: async (): Promise<unknown> => {
              throw new TypeError("intentional invalid Date constructor unexpectedly loaded");
            },
          });
        }
        if (request.scenario === "ambient_local_date_constructor") {
          await import("./intentional-ambient-local-date-constructor.ts");
          return Object.freeze({
            run: async (): Promise<unknown> => {
              throw new TypeError("intentional local Date constructor unexpectedly loaded");
            },
          });
        }
        if (request.scenario === "ambient_environment_root") {
          await import("./intentional-ambient-environment-root.ts");
          return Object.freeze({
            run: async (): Promise<unknown> => {
              throw new TypeError("intentional environment module unexpectedly loaded");
            },
          });
        }
        if (request.scenario === "ambient_date_reflection") {
          await import("./intentional-ambient-date-reflection.ts");
          return Object.freeze({
            run: async (): Promise<unknown> => {
              throw new TypeError("intentional Date reflection module unexpectedly loaded");
            },
          });
        }
        if (request.scenario === "ambient_performance_json") {
          await import("./intentional-ambient-performance-json.ts");
          return Object.freeze({
            run: async (): Promise<unknown> => {
              throw new TypeError("intentional performance module unexpectedly loaded");
            },
          });
        }
        const driver = await import("./authoritative-determinism-driver.ts");
        return Object.freeze({
          run: () => {
            driver.verifyTripwireDeterministicDateOperationsV1();
            return driver.collectAuthoritativeDeterminismTraceV1(request.bootstrapInput);
          },
        });
      },
    });
    postWorkerMessageV1(result);
  })().catch(() => postWorkerMessageV1(protocolFailureV1()));
});
