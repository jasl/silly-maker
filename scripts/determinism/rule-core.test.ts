// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { analyzeDeterminismSourceV1, type DeterminismDiagnosticV1 } from "./rule-core.mts";

const fileV1 = "example/src/simulation-definition.ts";
const focusedExemptionReferenceV1 =
  "scripts/determinism/rule-core.test.ts#numeric-exemption-contract";

function analyzeV1(source: string): readonly DeterminismDiagnosticV1[] {
  return analyzeDeterminismSourceV1({
    file: fileV1,
    source,
    isFocusedTestReference: (reference) => reference === focusedExemptionReferenceV1,
  });
}

function codesV1(source: string): readonly string[] {
  return analyzeV1(source).map(({ code }) => code);
}

describe("authoritative determinism rule core", () => {
  it.each([
    ["Math.random()", "determinism.ambient_random"],
    ['Math["random"]()', "determinism.ambient_random"],
    ["const M = Math; M.random()", "determinism.ambient_random"],
    ["const { random: draw } = Math; draw()", "determinism.ambient_random"],
    ["crypto.getRandomValues(bytes)", "determinism.crypto_random"],
    ['crypto["randomUUID"]()', "determinism.crypto_random"],
    ["const c = globalThis.crypto; c.randomUUID()", "determinism.crypto_random"],
    ["const { getRandomValues: fill } = crypto; fill(bytes)", "determinism.crypto_random"],
    ["Date.now()", "determinism.ambient_clock"],
    ["Date(0)", "determinism.ambient_clock"],
    ["new Date()", "determinism.ambient_clock"],
    ["const D = Date; new D()", "determinism.ambient_clock"],
    ["const { now } = Date; now()", "determinism.ambient_clock"],
    ["performance.now()", "determinism.performance_clock"],
    ["const { now: tick } = performance; tick()", "determinism.performance_clock"],
    ["fetch(url)", "determinism.network"],
    ["globalThis.fetch?.(url)", "determinism.network"],
    ['const request = globalThis["fetch"]; request(url)', "determinism.network"],
    ["new XMLHttpRequest()", "determinism.network"],
    ["const Socket = WebSocket; new Socket(url)", "determinism.network"],
    ['Deno.env.get("TOKEN")', "determinism.environment"],
    ['Deno["env"].get("TOKEN")', "determinism.environment"],
    ["const { env } = process; env.TOKEN", "determinism.environment"],
    ["navigator.language", "determinism.locale"],
    ["const nav = navigator; nav.languages", "determinism.locale"],
    ['new Intl.Collator("en")', "determinism.locale"],
    ['value.toLocaleString("en")', "determinism.locale"],
    ['left.localeCompare(right, "en")', "determinism.locale"],
    ['left["localeCompare"](right, "en")', "determinism.locale"],
    ["document.body", "determinism.dom_storage"],
    ["const root = window", "determinism.dom_storage"],
    ["globalThis.window.location", "determinism.dom_storage"],
    ['const storage = localStorage; storage.getItem("save")', "determinism.dom_storage"],
    ['sessionStorage["save"]', "determinism.dom_storage"],
    ["parseFloat(token)", "determinism.numeric_parse_float"],
    ["const { parseFloat: parse } = Number; parse(token)", "determinism.numeric_parse_float"],
    ["Math.sqrt(value)", "determinism.numeric_approximate_math"],
    ['Math["pow"](base, exponent)', "determinism.numeric_approximate_math"],
    ["const M = Math; const { hypot } = M; hypot(x, y)", "determinism.numeric_approximate_math"],
    ["base ** exponent", "determinism.numeric_approximate_math"],
    ["let value = 2; value **= 3", "determinism.numeric_approximate_math"],
    ["export const draw = Math.random", "determinism.ambient_random"],
    ["Math.random.call(null)", "determinism.ambient_random"],
    ["(0, Math.random)()", "determinism.ambient_random"],
    ["const { fetch: request } = globalThis; request(url)", "determinism.network"],
    ["namespace Runtime { export const draw = Math.random(); }", "determinism.ambient_random"],
    ["enum Runtime { Draw = Math.random() }", "determinism.ambient_random"],
    ["const { value = Math.random() } = input", "determinism.ambient_random"],
    ["const value = { [Math.random()]() {} }", "determinism.ambient_random"],
    [
      "function value({ draw = Math.random() } = {}) { return draw; }",
      "determinism.ambient_random",
    ],
    ["new Date(...[])", "determinism.ambient_clock"],
    ["Date.call(null)", "determinism.ambient_clock"],
    ["Date.apply(null, [])", "determinism.ambient_clock"],
    ["Date.bind(null)()", "determinism.ambient_clock"],
    ["Date.prototype.constructor()", "determinism.ambient_clock"],
    ["new Date.prototype.constructor()", "determinism.ambient_clock"],
    ["(Date.prototype.constructor as typeof Date)()", "determinism.ambient_clock"],
    ["new Date(0).constructor()", "determinism.ambient_clock"],
    ["import M = Math; M.random()", "determinism.ambient_random"],
    ["import R = Math.random; R()", "determinism.ambient_random"],
    ["import D = Date; D()", "determinism.ambient_clock"],
    ["let draw; ({ random: draw } = Math); draw()", "determinism.ambient_random"],
    [
      "try { throw {}; } catch ({ [Math.random()]: value }) {}",
      "determinism.ambient_random",
    ],
    ["export const ambientMath = Math", "determinism.ambient_capability_escape"],
    ["export default Date", "determinism.ambient_capability_escape"],
    ["export const ambientNumber = Number", "determinism.ambient_capability_escape"],
    ["export const host = globalThis", "determinism.ambient_capability_escape"],
    ["export const host = process", "determinism.ambient_capability_escape"],
    ["export const runtime = Deno", "determinism.ambient_capability_escape"],
    ["import M = Math; export { M }", "determinism.ambient_capability_escape"],
    [
      'const simulation = { ["createBootstrapInput"](entropy: unknown) { return entropy.nextNonZeroUint32(); } }',
      "determinism.bootstrap_entropy_escape",
    ],
    [
      'const simulation = { ["createBootstrapInput"]: (entropy: unknown) => entropy.nextNonZeroUint32() }',
      "determinism.bootstrap_entropy_escape",
    ],
    [
      "const key = runtimeName; const simulation = { [key](entropy: unknown) { return entropy.nextNonZeroUint32(); } }",
      "determinism.bootstrap_entropy_escape",
    ],
    ["class Model { @decorate(Math.random()) field = 1 }", "determinism.ambient_random"],
  ])("classifies %s", (source, code) => {
    expect(codesV1(source)).toContain(code);
  });

  it.each([
    "const Math = { random: () => 1 }; Math.random()",
    "function draw(Math: { random(): number }) { return Math.random(); }",
    'const crypto = { randomUUID: () => "fixed" }; crypto.randomUUID()',
    'const fetch = (value: string) => value; fetch("fixed")',
    'const process = { env: { TOKEN: "fixed" } }; process.env.TOKEN',
    'const document = { body: "projection" }; document.body',
    "const Intl = { Collator: class {} }; new Intl.Collator()",
    "function current(Date: { now(): number }) { return Date.now(); }",
    'function parse(Number: { parseFloat(value: string): number }) { return Number.parseFloat("1"); }',
    'function request(globalThis: { fetch(value: string): string }) { return globalThis.fetch("fixed"); }',
    "for (let Math = { random: () => 1 }, index = 0; index < 1; index += 1) Math.random()",
    "new Date(0)",
    "new Date(recordedInstant)",
    "Date.parse(recordedInstant)",
    "Date.parse.call(null, recordedInstant)",
    "Date.parse.apply(null, [recordedInstant])",
    "Date.UTC.call(null, 2020, 0, 1)",
    "Date.parse.bind(null)(recordedInstant)",
    "new Date.prototype.constructor(recordedInstant)",
    "new Date(0).getTime()",
    "Math.floor(value); Math.ceil(value); Math.round(value); Math.trunc(value)",
    "Math.min(a, b); Math.max(a, b); Math.abs(a); Math.imul(a, b); Math.clz32(a)",
    "const { floor } = Math; floor(value)",
    "const { parse } = Date; parse(recordedInstant)",
    "parseInt(token, 10)",
    "Number(recordedText)",
    'const whole = 1.0; const exponentWhole = 10e-1; const version = "1.5"',
    'import type { Client } from "openai"; let client: Client | undefined',
    'import { type Client } from "openai"; let client: Client | undefined',
    'export type { Client } from "openai"',
    'export { type Client } from "openai"',
    'type Client = import("openai").Client',
    "type RandomFunction = typeof Math.random",
  ])("does not flag deterministic or shadowed code: %s", (source) => {
    expect(analyzeV1(source)).toEqual([]);
  });

  it.each([
    ['import OpenAI from "openai"', "openai"],
    ['import "openai"', "openai"],
    ['import { request } from "node:https"', "node:https"],
    ['const sdk = await import("@anthropic-ai/sdk")', "@anthropic-ai/sdk"],
    ['const sdk = await import("npm:openai")', "npm:openai"],
    ['import axios from "npm:axios@1.7.9"', "npm:axios@1.7.9"],
    ['import "npm:undici@7.4.0"', "npm:undici@7.4.0"],
    ['const socket = await import("npm:ws@8.18.0")', "npm:ws@8.18.0"],
    ['const http = require("node:http")', "node:http"],
  ])("rejects ambient provider import %s", (source, provider) => {
    const diagnostic = analyzeV1(source)[0];
    expect(diagnostic?.code).toBe("determinism.ambient_provider_import");
    expect(source.slice(...(diagnostic?.range ?? [0, 0]))).toBe(provider);
  });

  it.each([
    "const amount = .5",
    "const amount = 1.50",
    "const amount = 1e-1",
    "const amount = 1e-324",
    "const amount = 9007199254740992.5",
    "const amount = -0",
    "const amount = -(0 as number)",
    "const amount = -2.5",
  ])("rejects fractional or negative-zero literal %s", (source) => {
    expect(codesV1(source)).toEqual(["determinism.numeric_fractional_literal"]);
  });

  it.each([
    "const amount = 0",
    "const amount = 1",
    "const amount = 1.0",
    "const amount = 1e0",
    "const amount = 1.2e1",
    "const amount = 0x10",
  ])("accepts mathematically integral literal %s", (source) => {
    expect(analyzeV1(source)).toEqual([]);
  });

  it("allows only direct calls on the verified bootstrap entropy parameter", () => {
    expect(analyzeV1(`
      import type { BootstrapEntropyV1 } from "@sillymaker/base";
      const simulation = {
        createBootstrapInput(entropy: BootstrapEntropyV1) {
          return {
            id: entropy.nextUuidV4(),
            rngSeed: entropy.nextNonZeroUint32(),
          };
        },
      };
    `)).toEqual([]);
  });

  it("resolves an aliased BootstrapEntropyV1 type import", () => {
    expect(analyzeV1(`
      import type { BootstrapEntropyV1 as Entropy } from "@sillymaker/base";
      const simulation = {
        createBootstrapInput(source: Entropy) {
          return { rngSeed: source.nextNonZeroUint32() };
        },
      };
    `)).toEqual([]);
  });

  it("allows a verified bootstrap parameter with a default expression", () => {
    expect(analyzeV1(`
      import type { BootstrapEntropyV1 } from "@sillymaker/base";
      declare const fallback: BootstrapEntropyV1;
      const simulation = {
        createBootstrapInput(entropy: BootstrapEntropyV1 = fallback) {
          return { rngSeed: entropy.nextNonZeroUint32() };
        },
      };
    `)).toEqual([]);
  });

  it("allows a verified standalone createBootstrapInput function", () => {
    expect(analyzeV1(`
      import type { BootstrapEntropyV1 } from "@sillymaker/base";
      const createBootstrapInput = (source: BootstrapEntropyV1) => ({
        rngSeed: source.nextNonZeroUint32(),
      });
    `)).toEqual([]);
  });

  it.each([
    `createBootstrapInput(entropy: unknown) {
       return { rngSeed: entropy.nextNonZeroUint32() };
     }`,
    `createBootstrapInput(entropy: unknown = fallback) {
       return { rngSeed: entropy.nextNonZeroUint32() };
     }`,
    `createBootstrapInput(entropy: BootstrapEntropyV1) {
       const draw = entropy.nextNonZeroUint32;
       return { rngSeed: draw() };
     }`,
    `createBootstrapInput(entropy: BootstrapEntropyV1) {
       return entropy;
     }`,
    `createBootstrapInput(entropy: BootstrapEntropyV1) {
       return consume(entropy);
     }`,
    `createBootstrapInput(entropy: BootstrapEntropyV1) {
       return () => entropy.nextNonZeroUint32();
     }`,
    `createBootstrapInput(entropy: BootstrapEntropyV1) {
       return { rngSeed: Math.random() };
     }`,
    `createInitialState(entropy: BootstrapEntropyV1) {
       return { rngSeed: entropy.nextNonZeroUint32() };
     }`,
  ])("rejects ambient or escaping bootstrap capability: %s", (method) => {
    const diagnostics = analyzeV1(`
      import type { BootstrapEntropyV1 } from "@sillymaker/base";
      const simulation = { ${method} };
    `);
    expect(diagnostics.map(({ code }) => code)).toEqual(expect.arrayContaining([
      method.includes("Math.random")
        ? "determinism.ambient_random"
        : "determinism.bootstrap_entropy_escape",
    ]));
  });

  it("does not trust a locally forged BootstrapEntropyV1 type name", () => {
    expect(codesV1(`
      interface BootstrapEntropyV1 { nextNonZeroUint32(): number }
      const simulation = {
        createBootstrapInput(entropy: BootstrapEntropyV1) {
          return { rngSeed: entropy.nextNonZeroUint32() };
        },
      };
    `)).toContain("determinism.bootstrap_entropy_escape");
  });

  it("does not trust a BootstrapEntropyV1 import from an unrelated module", () => {
    expect(codesV1(`
      import type { BootstrapEntropyV1 } from "./contracts/gameplay-module.ts";
      const simulation = {
        createBootstrapInput(entropy: BootstrapEntropyV1) {
          return { rngSeed: entropy.nextNonZeroUint32() };
        },
      };
    `)).toContain("determinism.bootstrap_entropy_escape");
  });

  it("does not trust a block-local type that shadows a verified bootstrap import", () => {
    expect(codesV1(`
      import type { BootstrapEntropyV1 } from "@sillymaker/base";
      {
        type BootstrapEntropyV1 = { nextNonZeroUint32(): number };
        const simulation = {
          createBootstrapInput(entropy: BootstrapEntropyV1) {
            return { rngSeed: entropy.nextNonZeroUint32() };
          },
        };
      }
    `)).toContain("determinism.bootstrap_entropy_escape");
  });

  it("does not trust a class type parameter that shadows a verified bootstrap import", () => {
    expect(codesV1(`
      import type { BootstrapEntropyV1 } from "@sillymaker/base";
      class Simulation<BootstrapEntropyV1> {
        createBootstrapInput(entropy: BootstrapEntropyV1) {
          return { rngSeed: entropy.nextNonZeroUint32() };
        }
      }
    `)).toContain("determinism.bootstrap_entropy_escape");
  });

  it("does not trust a named class expression that shadows a verified bootstrap import", () => {
    expect(codesV1(`
      import type { BootstrapEntropyV1 } from "@sillymaker/base";
      const Simulation = class BootstrapEntropyV1 {
        createBootstrapInput(entropy: BootstrapEntropyV1) {
          return { rngSeed: entropy.nextNonZeroUint32() };
        }
      };
    `)).toContain("determinism.bootstrap_entropy_escape");
  });

  it("classifies locale methods on locally bound receivers", () => {
    expect(codesV1(`
      function compare(left: string, right: string) {
        return left.localeCompare(right);
      }
    `)).toEqual(["determinism.locale"]);
  });

  it("uses half-open UTF-16 ranges and frozen, one-based locations", () => {
    const source = `const emoji = "😀"; Math.random();`;
    const [diagnostic] = analyzeV1(source);
    const start = source.indexOf("Math.random");
    expect(diagnostic).toEqual(expect.objectContaining({
      code: "determinism.ambient_random",
      file: fileV1,
      range: [start, start + "Math.random".length],
      start: { line: 1, column: start + 1 },
      end: { line: 1, column: start + "Math.random".length + 1 },
    }));
    expect(Object.isFrozen(diagnostic)).toBe(true);
    expect(Object.isFrozen(diagnostic?.range)).toBe(true);
    expect(Object.isFrozen(diagnostic?.start)).toBe(true);
    expect(Object.isFrozen(analyzeV1(source))).toBe(true);
  });

  it("sorts diagnostics by file, range, then code", () => {
    expect(codesV1("fetch(url); Math.random(); 1.5;")).toEqual([
      "determinism.network",
      "determinism.ambient_random",
      "determinism.numeric_fractional_literal",
    ]);
  });

  // sillymaker-determinism-vector: numeric-exemption-contract
  it.each([
    ["determinism.numeric_fractional_literal", "const value = 1.5;"],
    ["determinism.numeric_parse_float", "const value = parseFloat(token);"],
    ["determinism.numeric_approximate_math", "const value = Math.sqrt(input);"],
  ])("honors a complete next-line JSON exemption for %s", (code, statement) => {
    expect(analyzeV1(`
      // sillymaker-determinism-allow-next-line {"code":"${code}","reason":"bounded compatibility transform","bounds":"input 0..100","rounding":"truncate before commit","test":"${focusedExemptionReferenceV1}"}
      ${statement}
    `)).toEqual([]);
  });

  it("suppresses only the matching numeric diagnostic and preserves ambient errors", () => {
    const diagnostics = analyzeV1(`
      // sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"bounded compatibility transform","bounds":"input 0..100","rounding":"truncate before commit","test":"${focusedExemptionReferenceV1}"}
      fetch(1.5);
    `);
    expect(codesV1(`
      // sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"bounded compatibility transform","bounds":"input 0..100","rounding":"truncate before commit","test":"${focusedExemptionReferenceV1}"}
      fetch(1.5);
    `)).toEqual(["determinism.network"]);
    expect(diagnostics).toHaveLength(1);
  });

  it.each([
    [
      `// sillymaker-determinism-allow-next-line nope\nconst value = 1.5;`,
      "determinism.exemption_malformed",
    ],
    [
      `// sillymaker-determinism-allow-next-line {"code":"determinism.network","reason":"x","bounds":"x","rounding":"x","test":"scripts/determinism/rule-core.test.ts#numeric-exemption-contract"}\nfetch(url);`,
      "determinism.exemption_malformed",
    ],
    [
      `// sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"x","bounds":"x","rounding":"x","test":"scripts/determinism/rule-core.test.ts#numeric-exemption-contract"}\nconst value = 1;`,
      "determinism.exemption_stale",
    ],
    [
      `// sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"x","bounds":"x","rounding":"x","test":"scripts/determinism/rule-core.test.ts#numeric-exemption-contract"}\n// sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"x","bounds":"x","rounding":"x","test":"scripts/determinism/rule-core.test.ts#numeric-exemption-contract"}\nconst value = 1.5;`,
      "determinism.exemption_duplicate",
    ],
    [
      `// sillymaker-determinism-allow-file {"code":"determinism.numeric_fractional_literal"}\nconst value = 1.5;`,
      "determinism.exemption_whole_file",
    ],
  ])("fails closed for invalid exemption metadata", (source, code) => {
    expect(codesV1(source)).toContain(code);
  });

  it.each([
    `// sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":" ","bounds":"x","rounding":"x","test":"scripts/determinism/numeric-vector.test.ts#case"}\nconst value = 1.5;`,
    `// sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"x","bounds":"x","rounding":"x","test":"scripts/determinism/numeric-vector.test.ts"}\nconst value = 1.5;`,
    `// sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"x","bounds":"x","rounding":"x","test":"scripts/determinism/numeric-vector.ts#case"}\nconst value = 1.5;`,
    `// sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"x","bounds":"x","rounding":"x","test":"../numeric-vector.test.ts#case"}\nconst value = 1.5;`,
  ])("rejects incomplete or non-focused exemption metadata", (source) => {
    expect(codesV1(source)).toContain("determinism.exemption_malformed");
    expect(codesV1(source)).toContain("determinism.numeric_fractional_literal");
  });

  it.each([
    `// sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"x","bounds":"x","rounding":"x","test":"scripts/determinism/rule-core.test.ts#numeric-exemption-contract"}\n\nconst value = 1.5;`,
    `// sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"x","bounds":"x","rounding":"x","test":"scripts/determinism/rule-core.test.ts#numeric-exemption-contract"}\n// explanation\nconst value = 1.5;`,
  ])("does not let an exemption skip a physical line", (source) => {
    expect(codesV1(source)).toEqual(expect.arrayContaining([
      "determinism.exemption_stale",
      "determinism.numeric_fractional_literal",
    ]));
  });

  it("ignores directive-shaped text inside a template literal", () => {
    const source = `
      const template = \`
// sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"x","bounds":"x","rounding":"x","test":"${focusedExemptionReferenceV1}"}
\${1.5}\`;
    `;
    expect(codesV1(source)).toEqual(["determinism.numeric_fractional_literal"]);
  });

  it("fails closed when the focused test reference is not verified", () => {
    const source = `
      // sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"x","bounds":"x","rounding":"x","test":"does/not/exist.test.ts#invented"}
      const value = 1.5;
    `;
    expect(codesV1(source)).toEqual(expect.arrayContaining([
      "determinism.exemption_malformed",
      "determinism.numeric_fractional_literal",
    ]));
  });

  it("parses TypeScript angle assertions when JSX is not enabled for .ts", () => {
    expect(analyzeDeterminismSourceV1({
      file: "example/src/value.ts",
      source: "const value = <number>input;",
    })).toEqual([]);
  });

  it.each([
    [
      "example/src/decorated.ts",
      "const sealed = (_value: unknown) => {}; @sealed class Model {}",
    ],
    ["example/src/decorated.js", "const sealed = (_value) => {}; @sealed class Model {}"],
  ])("parses standard decorators in %s", (file, source) => {
    expect(analyzeDeterminismSourceV1({ file, source })).toEqual([]);
  });

  it("returns a stable parse diagnostic instead of throwing", () => {
    const diagnostics = analyzeV1("const = ;");
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "determinism.source_parse_failed",
        file: fileV1,
        message: "Unable to parse authoritative source.",
      }),
    ]);
  });
});
