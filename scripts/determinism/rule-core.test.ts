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
    ["performance.timeOrigin", "determinism.performance_clock"],
    ["performance.toJSON()", "determinism.performance_clock"],
    ["performance.getEntries()", "determinism.performance_clock"],
    ["const { now: tick } = performance; tick()", "determinism.performance_clock"],
    ["fetch(url)", "determinism.network"],
    ["globalThis.fetch?.(url)", "determinism.network"],
    ['const request = globalThis["fetch"]; request(url)', "determinism.network"],
    ["new XMLHttpRequest()", "determinism.network"],
    ["const Socket = WebSocket; new Socket(url)", "determinism.network"],
    ['Deno.env.get("TOKEN")', "determinism.environment"],
    ['Deno["env"].get("TOKEN")', "determinism.environment"],
    ['Deno.readTextFile("save.json")', "determinism.environment"],
    ["process.cwd()", "determinism.environment"],
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
    ["Date.bind(null)()", "determinism.ambient_capability_escape"],
    ["Date.prototype.constructor()", "determinism.ambient_clock"],
    ["new Date.prototype.constructor()", "determinism.ambient_clock"],
    ["(Date.prototype.constructor as typeof Date)()", "determinism.ambient_clock"],
    ["new Date(0).constructor()", "determinism.ambient_clock"],
    ["Date.prototype.constructor.now()", "determinism.ambient_clock"],
    ["new Date(0).constructor.now()", "determinism.ambient_clock"],
    ["new Date(0).getHours()", "determinism.host_timezone"],
    ["new Date(0).toString()", "determinism.host_timezone"],
    ["Date.prototype.getTimezoneOffset.call(new Date(0))", "determinism.host_timezone"],
    [
      'const date = new Date(0); const member = "getHours"; date[member]()',
      "determinism.ambient_capability_escape",
    ],
    ["String(new Date(0))", "determinism.host_timezone"],
    ["String.call(null, new Date(0))", "determinism.host_timezone"],
    ["String.apply(null, [new Date(0)])", "determinism.host_timezone"],
    [
      "String.call.call(String, null, new Date(0))",
      "determinism.ambient_capability_escape",
    ],
    [
      "String.apply.call(String, null, [new Date(0)])",
      "determinism.ambient_capability_escape",
    ],
    [
      'String.raw.call.call(String.raw, null, { raw: ["", ""] }, new Date(0))',
      "determinism.ambient_capability_escape",
    ],
    [
      "String.call.bind(null, String, null, new Date(0))()",
      "determinism.ambient_capability_escape",
    ],
    [
      "String.call.bind(String, null, new Date(0))()",
      "determinism.ambient_capability_escape",
    ],
    [
      "const wrapper = String.call; wrapper.call(String, null, new Date(0))",
      "determinism.ambient_capability_escape",
    ],
    ["String.bind(null, new Date(0))()", "determinism.ambient_capability_escape"],
    ["String.bind(null)(new Date(0))", "determinism.ambient_capability_escape"],
    ["new String(new Date(0))", "determinism.host_timezone"],
    ["String.prototype.constructor(new Date(0))", "determinism.host_timezone"],
    ["new String.prototype.constructor(new Date(0))", "determinism.host_timezone"],
    ['String.raw({ raw: ["", ""] }, new Date(0))', "determinism.host_timezone"],
    ['String.raw.call(null, { raw: ["", ""] }, new Date(0))', "determinism.host_timezone"],
    ['String.raw.apply(null, [{ raw: ["", ""] }, new Date(0)])', "determinism.host_timezone"],
    ['String.raw.bind(null, { raw: ["", ""] })', "determinism.ambient_capability_escape"],
    ["String.raw`${new Date(0)}`", "determinism.host_timezone"],
    ["String.raw({ raw: [new Date(0)] })", "determinism.host_timezone"],
    ['new Date(0) + ""', "determinism.host_timezone"],
    ['let text = ""; text += new Date(0)', "determinism.host_timezone"],
    ["`${new Date(0)}`", "determinism.host_timezone"],
    ["Temporal.Now.instant()", "determinism.ambient_clock"],
    ["globalThis.Temporal.Now.plainDateISO()", "determinism.ambient_clock"],
    ["Date.parse.constructor", "determinism.ambient_capability_escape"],
    ["Date.parse.constructor.call(null)", "determinism.ambient_capability_escape"],
    ["Math.floor.constructor.apply(null, [])", "determinism.ambient_capability_escape"],
    ["Temporal.Instant.from.constructor.bind(null)", "determinism.ambient_capability_escape"],
    ["Date.parse[key]", "determinism.ambient_capability_escape"],
    ["Math.floor[key]", "determinism.ambient_capability_escape"],
    ["Number.isSafeInteger[key]", "determinism.ambient_capability_escape"],
    ["Temporal.Instant.from[key]", "determinism.ambient_capability_escape"],
    ["String.raw[key]", "determinism.ambient_capability_escape"],
    ["String.constructor", "determinism.ambient_capability_escape"],
    ["String.raw.constructor", "determinism.ambient_capability_escape"],
    ["String.prototype.constructor.constructor", "determinism.ambient_capability_escape"],
    ["Date.parse.foo()", "determinism.ambient_capability_escape"],
    ["Date.UTC.prototype", "determinism.ambient_capability_escape"],
    ["Date.parse.bind(null)(recordedInstant)", "determinism.ambient_capability_escape"],
    [
      'const date = new Date(0); (date as any).payload = "2026-08-01T00:00:00"; new Date((date as any).payload)',
      "determinism.date_input_unverified",
    ],
    ['Date.parse("2026-08-01T00:00:00Z".length)', "determinism.date_input_unverified"],
    [
      'Date.parse.call(null, "2026-08-01T00:00:00Z".length)',
      "determinism.date_input_unverified",
    ],
    [
      'Date.parse.apply(null, ["2026-08-01T00:00:00Z".length])',
      "determinism.date_input_unverified",
    ],
    ["new Date(recordedInstant)", "determinism.date_input_unverified"],
    ["Date.parse(recordedInstant)", "determinism.date_input_unverified"],
    ["Date.parse.call(null, recordedInstant)", "determinism.date_input_unverified"],
    ["Date.parse.apply(null, [recordedInstant])", "determinism.date_input_unverified"],
    ["new Date.prototype.constructor(recordedInstant)", "determinism.date_input_unverified"],
    ["new Date(2026, 7, 1)", "determinism.host_timezone"],
    ['new Date("2026-08-01T00:00:00")', "determinism.host_timezone"],
    ['Date.parse("2026-08-01T00:00:00")', "determinism.host_timezone"],
    ["new Date(null)", "determinism.date_input_unverified"],
    ["Date.parse(0)", "determinism.date_input_unverified"],
    ["new Date(8640000000000001)", "determinism.date_input_unverified"],
    ["new Date(...recordedArgs)", "determinism.date_input_unverified"],
    ["new Date(...[,])", "determinism.date_input_unverified"],
    ["Date.parse.apply(null, recordedArgs)", "determinism.date_input_unverified"],
    [
      'Date.parse.apply(null, [, "2026-08-01T00:00:00Z"])',
      "determinism.date_input_unverified",
    ],
    [
      'Date.parse("2026-08-01T00:00:00Z", ignored)',
      "determinism.date_input_unverified",
    ],
    ['Date.parse("2026-02-30T00:00:00Z")', "determinism.date_input_unverified"],
    [
      'Date.parse("Sat, 01 Aug 2026 00:00:00 GMT")',
      "determinism.date_input_unverified",
    ],
    ["let epoch = 0; new Date(epoch)", "determinism.date_input_unverified"],
    [
      'let local = "2026-08-01T00:00:00"; Date.parse(local)',
      "determinism.date_input_unverified",
    ],
    [
      'const local = "2026-08-01T00:00:00"; Date.parse(local)',
      "determinism.host_timezone",
    ],
    ['Date.parse("2026-08-01T00:00")', "determinism.host_timezone"],
    [
      'const parse = flag ? Date.parse : (_value: string) => "2026-08-01T00:00:00"; new Date(parse("2026-08-01T00:00:00Z"))',
      "determinism.date_input_unverified",
    ],
    [
      'const utc = flag ? Date.UTC : () => "2026-08-01T00:00:00"; new Date(utc(2026, 7, 1))',
      "determinism.date_input_unverified",
    ],
    [
      'const parse = flag && Date.parse; new Date(parse("2026-08-01T00:00:00Z"))',
      "determinism.date_input_unverified",
    ],
    [
      'let parse = localParse; if (flag) parse = Date.parse; new Date(parse("2026-08-01T00:00:00Z"))',
      "determinism.date_input_unverified",
    ],
    [
      'const { parse = Date.parse } = input; new Date(parse("2026-08-01T00:00:00Z"))',
      "determinism.date_input_unverified",
    ],
    ["const date = flag ? new Date(0) : projection; String(date)", "determinism.host_timezone"],
    ["const date = flag && new Date(0); `${date}`", "determinism.host_timezone"],
    [
      "let date = projection; if (flag) date = new Date(0); String(date)",
      "determinism.host_timezone",
    ],
    [
      "let date = new Date(0); if (flag) date = projection; String(date)",
      "determinism.host_timezone",
    ],
    [
      "let parse = localParse; if (flag) parse = Date.parse; parse(recordedInstant)",
      "determinism.ambient_capability_escape",
    ],
    [
      "const { parse } = Date; parse(recordedInstant)",
      "determinism.date_input_unverified",
    ],
    [
      "const stringify = flag ? String : localStringify; stringify(new Date(0))",
      "determinism.host_timezone",
    ],
    [
      "const raw = flag ? String.raw : localTag; raw`${new Date(0)}`",
      "determinism.host_timezone",
    ],
    [
      "let date = new Date(0); while (flag) date = projection; String(date)",
      "determinism.host_timezone",
    ],
    [
      "let date = new Date(0); function unused() { date = projection; } String(date)",
      "determinism.host_timezone",
    ],
    [
      "const { stringify = String } = input; stringify(new Date(0))",
      "determinism.host_timezone",
    ],
    [
      "const { constructor: Constructor } = Date.parse; Constructor();",
      "determinism.ambient_capability_escape",
    ],
    ["String(...[new Date(0)])", "determinism.host_timezone"],
    ["new String(...[new Date(0)])", "determinism.host_timezone"],
    ["String.call(null, ...[new Date(0)])", "determinism.host_timezone"],
    ["String(...recordedValues)", "determinism.ambient_capability_escape"],
    ["String.apply(null, recordedValues)", "determinism.ambient_capability_escape"],
    [
      'String.raw({ raw: ["", ""] }, ...[new Date(0)])',
      "determinism.host_timezone",
    ],
    [
      "String.raw({ raw: { 0: new Date(0), length: 1 } })",
      "determinism.host_timezone",
    ],
    [
      "String.raw.call(null, { raw: { 0: new Date(0), length: 1 } })",
      "determinism.host_timezone",
    ],
    [
      "String.raw.apply(null, [{ raw: { 0: new Date(0), length: 1 } }])",
      "determinism.host_timezone",
    ],
    ["String.raw({ raw: recordedValues })", "determinism.ambient_capability_escape"],
    [
      "String.raw({ __proto__: { raw: [new Date(0)] } })",
      "determinism.ambient_capability_escape",
    ],
    [
      "String.raw({ raw: { __proto__: { 0: new Date(0), length: 1 }, length: 1 } })",
      "determinism.ambient_capability_escape",
    ],
    [
      "let date = projection; function render() { return String(date); } date = new Date(0); render();",
      "determinism.host_timezone",
    ],
    [
      "let value = projection; const render = () => `${value}`; value = new Date(0); render();",
      "determinism.host_timezone",
    ],
    [
      "let value = projection; function read() { return value.getHours(); } value = new Date(0); read();",
      "determinism.host_timezone",
    ],
    [
      "let parse = localParse; function read() { return parse(recordedInstant); } parse = Date.parse; read();",
      "determinism.ambient_capability_escape",
    ],
    [
      "let source = projection; let target = projection; function read() { return String(target); } function mutate() { target = source; } source = new Date(0); mutate(); read();",
      "determinism.host_timezone",
    ],
    [
      "let value = projection; String(value); value = new Date(0)",
      "determinism.host_timezone",
    ],
    [
      "let source = projection; let target = projection; String(target); target = source; source = new Date(0)",
      "determinism.host_timezone",
    ],
    [
      "function render() { let value = projection; String(value); function mutate() { value = new Date(0); } }",
      "determinism.host_timezone",
    ],
    [
      "let value = projection; let render; { render = () => String(value); } value = new Date(0); render();",
      "determinism.host_timezone",
    ],
    [
      'let value = projection; let render = () => "fixed"; if (flag) { render = () => String(value); } value = new Date(0); render();',
      "determinism.host_timezone",
    ],
    [
      "let value = projection; for (const item of items) { callbacks.push(() => String(value)); } value = new Date(0);",
      "determinism.host_timezone",
    ],
    [
      'const date = new Date(0); date.getTime = (() => "2026-08-01T00:00:00") as any; new Date(date.getTime())',
      "determinism.ambient_capability_escape",
    ],
    [
      'Date.UTC = (() => "2026-08-01T00:00:00") as any; new Date(Date.UTC(2026, 7, 1))',
      "determinism.ambient_capability_escape",
    ],
    [
      'Date.prototype.getTime = (() => "2026-08-01T00:00:00") as any; new Date(new Date(0).getTime())',
      "determinism.ambient_capability_escape",
    ],
    ["delete Date.UTC", "determinism.ambient_capability_escape"],
    ["Date.UTC++", "determinism.ambient_capability_escape"],
    [
      'const member = "UTC"; Date[member] = localUtc as any',
      "determinism.ambient_capability_escape",
    ],
    [
      '({ x: Date.UTC } = { x: (() => "2026-08-01T00:00:00") as any }); new Date(Date.UTC(2026, 7, 1))',
      "determinism.ambient_capability_escape",
    ],
    [
      "[Date.UTC] = [localUtc as any]; new Date(Date.UTC(2026, 7, 1))",
      "determinism.ambient_capability_escape",
    ],
    [
      'for (Date.UTC of [(() => "2026-08-01T00:00:00") as any]) {} new Date(Date.UTC(2026, 7, 1))',
      "determinism.ambient_capability_escape",
    ],
    [
      'for (Date.prototype.getTime of [(() => "2026-08-01T00:00:00") as any]) {} new Date(new Date(0).getTime())',
      "determinism.ambient_capability_escape",
    ],
    [
      "for ({ x: Date.UTC } of [{ x: localUtc as any }]) {} new Date(Date.UTC(2026, 7, 1))",
      "determinism.ambient_capability_escape",
    ],
    [
      "new Date(0).getTime.constructor",
      "determinism.ambient_capability_escape",
    ],
    [
      "Date.prototype.getTime.constructor",
      "determinism.ambient_capability_escape",
    ],
    [
      'new Date(0).toISOString.constructor("return Math.random()")()',
      "determinism.ambient_capability_escape",
    ],
    [
      "new String(0).valueOf.constructor",
      "determinism.ambient_capability_escape",
    ],
    [
      "String.prototype.valueOf.constructor",
      "determinism.ambient_capability_escape",
    ],
    ["new Date(recordedInstant).getUTCHours()", "determinism.date_input_unverified"],
    ["new Date(Math.random()).getTime()", "determinism.ambient_random"],
    ["new Date(2026, 7, 1).toISOString()", "determinism.host_timezone"],
    ["new String(Math.random()).valueOf()", "determinism.ambient_random"],
    [
      "const payload = (new Date(0) as any).payload; String(payload)",
      "determinism.ambient_capability_escape",
    ],
    [
      "const payload = (new Date(0) as any).payload; `${payload}`",
      "determinism.ambient_capability_escape",
    ],
    [
      'const payload = (new Date(0) as any).payload; "" + payload',
      "determinism.ambient_capability_escape",
    ],
    ["const date = new Date(0); String(date.getTime)", "determinism.ambient_capability_escape"],
    [
      "let parse; (parse = Date.parse, parse)(recordedInstant)",
      "determinism.ambient_capability_escape",
    ],
    [
      'let parse; (parse = Date.parse, parse)("2026-08-01T00:00:00")',
      "determinism.ambient_capability_escape",
    ],
    [
      "let date; (date = new Date(0), date).getHours()",
      "determinism.host_timezone",
    ],
    [
      "let stringify; (stringify = String, stringify)(new Date(0))",
      "determinism.host_timezone",
    ],
    [
      "let stringify; ((stringify = String) ? stringify : stringify)(new Date(0))",
      "determinism.host_timezone",
    ],
    [
      "let raw; (raw = String.raw, raw)`${new Date(0)}`",
      "determinism.host_timezone",
    ],
    [
      "let raw; ((raw = String.raw) ? raw : raw)`${new Date(0)}`",
      "determinism.host_timezone",
    ],
    ["let date; String((date = new Date(0), date))", "determinism.host_timezone"],
    ["let date; `${(date = new Date(0), date)}`", "determinism.host_timezone"],
    ['let date; "" + (date = new Date(0), date)', "determinism.host_timezone"],
    [
      'let date; let text = ""; text += (date = new Date(0), date)',
      "determinism.host_timezone",
    ],
    ["let date; String.raw`${(date = new Date(0), date)}`", "determinism.host_timezone"],
    [
      "let date; String.raw({ raw: [(date = new Date(0), date)] })",
      "determinism.host_timezone",
    ],
    [
      'let date; String.raw({ raw: ["", ""] }, (date = new Date(0), date))',
      "determinism.host_timezone",
    ],
    ["new Date(0) == recordedText", "determinism.host_timezone"],
    ["record[new Date(0) as any]", "determinism.host_timezone"],
    ["new Date(0) as any in record", "determinism.host_timezone"],
    ["({ [new Date(0) as any]: 1 })", "determinism.host_timezone"],
    [
      "const date = new Date(0); class Model { accessor [date as any] = 1 }",
      "determinism.host_timezone",
    ],
    ["String.call`${new Date(0)}`", "determinism.host_timezone"],
    ["const tag = String.call; tag`${new Date(0)}`", "determinism.host_timezone"],
    ["String.apply`${[new Date(0)]}`", "determinism.host_timezone"],
    [
      'String.raw.apply`${[{ raw: ["", ""] }, new Date(0)]}`',
      "determinism.host_timezone",
    ],
    [
      "String.raw.apply`${[{ raw: [new Date(0)] }]}`",
      "determinism.host_timezone",
    ],
    ["Date.parse`2026-08-01T00:00:00`", "determinism.date_input_unverified"],
    ["Date.parse`2026-08-01T00:00:00Z`", "determinism.date_input_unverified"],
    [
      'Date.parse.call`${"2026-08-01T00:00:00"}`',
      "determinism.host_timezone",
    ],
    [
      'Date.parse.apply`${["2026-08-01T00:00:00"]}`',
      "determinism.host_timezone",
    ],
    ["(Math.random(), Math).floor(1)", "determinism.ambient_random"],
    ["(Date.now(), Math).floor(1)", "determinism.ambient_clock"],
    ["(Math.random(), Date).UTC(2026, 7, 1)", "determinism.ambient_random"],
    ['(Math.random(), Number)("1")', "determinism.ambient_random"],
    ["new (Math.random(), Date)(0)", "determinism.ambient_random"],
    ["(Math.random() && Math).floor(1)", "determinism.ambient_random"],
    [
      "let target; (target = Math).floor(1); target.random()",
      "determinism.ambient_random",
    ],
    [
      "const { floor } = (Math.random(), Math); floor(1)",
      "determinism.ambient_random",
    ],
    [
      "let floor; ({ floor } = (Math.random(), Math)); floor(1)",
      "determinism.ambient_random",
    ],
    [
      "const { UTC } = (Date.now(), Date); UTC(2026, 7, 1)",
      "determinism.ambient_clock",
    ],
    [
      'let target; (target = Number)("1"); target.parseFloat("1.2")',
      "determinism.numeric_parse_float",
    ],
    [
      "let target; new (target = Date)(0); target.now()",
      "determinism.ambient_capability_escape",
    ],
    ["export const loader = require", "determinism.capability.dynamic_require"],
    ["export const loader = module.require", "determinism.capability.dynamic_require"],
    ["export const loader = module", "determinism.ambient_capability_escape"],
    ["take(module)", "determinism.ambient_capability_escape"],
    ["const loader = module; take(loader)", "determinism.ambient_capability_escape"],
    [
      'import dependency = require("./fixed.ts"); dependency.run()',
      "determinism.capability.dynamic_require",
    ],
    [
      'declare const require: (path: string) => unknown; require("./fixed.cjs")',
      "determinism.capability.dynamic_require",
    ],
    ['var require; require("./fixed.cjs")', "determinism.capability.dynamic_require"],
    ['var module; module.require("./fixed.cjs")', "determinism.capability.dynamic_require"],
    ["declare const Math: Math; Math.random()", "determinism.ambient_random"],
    ['require("./fixed.cjs")', "determinism.capability.dynamic_require"],
    ['module.require("./fixed.cjs")', "determinism.capability.dynamic_require"],
    [
      'const load = require.bind(null, "./fixed.cjs"); load()',
      "determinism.capability.dynamic_require",
    ],
    [
      'const member = "require"; module[member]("fs/promises")',
      "determinism.capability.dynamic_require",
    ],
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
    ["class Model { accessor fixed = Math.random() }", "determinism.ambient_random"],
  ])("classifies %s", (source, code) => {
    expect(codesV1(source)).toContain(code);
  });

  it.each([
    "const Math = { random: () => 1 }; Math.random()",
    "function draw(Math: { random(): number }) { return Math.random(); }",
    'const crypto = { randomUUID: () => "fixed" }; crypto.randomUUID()',
    'const fetch = (value: string) => value; fetch("fixed")',
    'const process = { env: { TOKEN: "fixed" } }; process.env.TOKEN',
    'const Temporal = { Now: { instant: () => "fixed" } }; Temporal.Now.instant()',
    "const value = { constructor: () => 1 }; value.constructor()",
    "class LocalValue {}; LocalValue.prototype.constructor",
    'const require = { call: () => 1 }; require.call(null, "fs/promises")',
    'const module = { require: () => 1 }; module.require("fs/promises")',
    'var require = (path: string) => path; require("./fixed.cjs")',
    'var module = { require: (path: string) => path }; module.require("./fixed.cjs")',
    'const document = { body: "projection" }; document.body',
    "const Intl = { Collator: class {} }; new Intl.Collator()",
    "function current(Date: { now(): number }) { return Date.now(); }",
    'function parse(Number: { parseFloat(value: string): number }) { return Number.parseFloat("1"); }',
    'function request(globalThis: { fetch(value: string): string }) { return globalThis.fetch("fixed"); }',
    "for (let Math = { random: () => 1 }, index = 0; index < 1; index += 1) Math.random()",
    "new Date(0)",
    "new Date(-1)",
    'new Date("2026-08-01T00:00:00Z")',
    'new Date("2026-08-01T08:00:00+08:00")',
    'Date.parse("2026-08-01T00:00:00Z")',
    'Date.parse.call(null, "2026-08-01T00:00:00+00:00")',
    'Date.parse.apply(null, ["2026-08-01T00:00:00Z"])',
    "Date.UTC.call(null, 2020, 0, 1)",
    'new Date.prototype.constructor("2026-08-01T00:00:00Z")',
    "Date.prototype.constructor.UTC(2026, 7, 1)",
    "new Date(0).constructor.UTC(2026, 7, 1)",
    "const epoch = Date.UTC(2026, 7, 1); new Date(epoch)",
    'new Date(Date.parse("2026-08-01T00:00:00Z"))',
    "const epoch = 0; new Date(epoch)",
    'const instant = "2026-08-01T00:00:00Z"; Date.parse(instant)',
    "const first = new Date(0); new Date(first)",
    "new Date(new Date(0).getTime())",
    "const epoch = flag ? 0 : Date.UTC(2026, 7, 1); new Date(epoch)",
    "const first = new Date(0); const date = flag ? first : new Date(1); date.getUTCHours()",
    "new Date(0).getTime()",
    "new Date(0).getUTCHours()",
    "new Date(0).toISOString()",
    'Temporal.Instant.from("2026-08-01T00:00:00Z")',
    'const { Instant } = Temporal; Instant.from("2026-08-01T00:00:00Z")',
    'const { PlainDate } = Temporal; PlainDate.from("2026-08-01")',
    "String(0); `${0}`; 0 + 1",
    "String.apply(null, [, new Date(0)])",
    "String.apply(null, undefined)",
    "String.apply(null, void 0)",
    'String.raw({ raw: ["fixed"] }, new Date(0))',
    'String.raw({ raw: ["a", "b"] }, 0, new Date(0))',
    'String.raw({ raw: { 0: "fixed", length: 1 } }, new Date(0))',
    'String.raw({ raw: "" }, new Date(0))',
    "String.raw.apply(null, [, new Date(0)])",
    'String.raw({ raw: { __proto__() {}, 0: "fixed", length: 1 } })',
    'const __proto__ = 0; String.raw({ raw: { __proto__, 0: "fixed", length: 1 } })',
    'String.raw({ raw: { __proto__: null, 0: "fixed", length: 1 } })',
    "String.call`${0}${new Date(0)}`",
    "new Date(0) === new Date(0)",
    "new Date(0) == null",
    "new Date(0) == new Date(0)",
    "class Model { accessor fixed = 1 }",
    'Date.parse.call`${"2026-08-01T00:00:00Z"}`',
    'Date.parse.apply`${["2026-08-01T00:00:00Z"]}`',
    "Date.UTC`${2026}${7}${1}`",
    "const tag = (_strings: TemplateStringsArray, ...values: unknown[]) => values[0]; tag`${new Date(0)}`",
    "const String = { raw: (_strings: TemplateStringsArray, ...values: unknown[]) => values[0] }; String.raw`${new Date(0)}`",
    'String.raw.foo({ raw: ["", ""] }, new Date(0))',
    "Math.floor(value); Math.ceil(value); Math.round(value); Math.trunc(value)",
    "Math.min(a, b); Math.max(a, b); Math.abs(a); Math.imul(a, b); Math.clz32(a)",
    "const { floor } = Math; floor(value)",
    'const { parse } = Date; parse("2026-08-01T00:00:00Z")',
    "parseInt(token, 10)",
    "Number(recordedText)",
    'const whole = 1.0; const exponentWhole = 10e-1; const version = "1.5"',
    'import type { Client } from "openai"; let client: Client | undefined',
    'import { type Client } from "openai"; let client: Client | undefined',
    'import type { Stats } from "fs/promises"; let stats: Stats | undefined',
    'import type dependency = require("./fixed.ts"); let value: dependency.Value | undefined',
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
    ['import { createRequire } from "node:module"', "node:module"],
    ['import { readFile } from "fs/promises"', "fs/promises"],
    ['const sdk = await import("@anthropic-ai/sdk")', "@anthropic-ai/sdk"],
    ['const sdk = await import("npm:openai")', "npm:openai"],
    ['import axios from "npm:axios@1.7.9"', "npm:axios@1.7.9"],
    ['import "npm:undici@7.4.0"', "npm:undici@7.4.0"],
    ['const socket = await import("npm:ws@8.18.0")', "npm:ws@8.18.0"],
  ])("rejects ambient provider import %s", (source, provider) => {
    const diagnostic = analyzeV1(source).find(({ code }) =>
      code === "determinism.ambient_provider_import"
    );
    expect(diagnostic?.code).toBe("determinism.ambient_provider_import");
    expect(source.slice(...(diagnostic?.range ?? [0, 0]))).toBe(provider);
  });

  it.each([
    'require.bind(null)("fs/promises")',
    'module.require.bind(module)("fs/promises")',
    "require(dynamicSpecifier)",
    "module.require.call(module, dynamicSpecifier)",
  ])("rejects every dynamic loader shape independently of its specifier: %s", (source) => {
    expect(codesV1(source)).toContain("determinism.capability.dynamic_require");
  });

  describe("DET3a-C1 dynamic loader admission", () => {
    const dynamicRequireCodeV1 = "determinism.capability.dynamic_require";

    it.each([
      ['import { createRequire } from "node:module"', "createRequire"],
      ['import { createRequire as makeRequire } from "module"', "makeRequire"],
      ['import { "createRequire" as cr } from "node:module"', "cr"],
      ['import * as nodeModule from "node:module"', "nodeModule"],
      ['import nodeModule from "module"', "nodeModule"],
    ])("classifies a static createRequire-capable capture: %s", (source, expectedSlice) => {
      const diagnostics = analyzeV1(source);
      expect(diagnostics.map(({ code, range }) => ({
        code,
        source: source.slice(...range),
      }))).toEqual([
        {
          code: dynamicRequireCodeV1,
          source: expectedSlice,
        },
        {
          code: "determinism.ambient_provider_import",
          source: source.includes("node:module") ? "node:module" : "module",
        },
      ]);
    });

    it.each([
      'import { builtinModules } from "node:module"',
      'import type { createRequire } from "node:module"',
      'import { type createRequire } from "node:module"',
    ])("does not assign loader ownership to a non-runtime createRequire capture: %s", (source) => {
      expect(codesV1(source)).not.toContain(dynamicRequireCodeV1);
    });

    it.each([
      ['require("./fixed.cjs")', ["require"]],
      ['require("node:fs")', ["require"]],
      ['require.call(null, "./fixed.cjs")', ["require.call"]],
      ['require.apply(null, ["./fixed.cjs"])', ["require.apply"]],
      ['require.bind(null, "./fixed.cjs")', ["require.bind"]],
      ['require?.("./fixed.cjs")', ["require"]],
      ["require`./fixed.cjs`", ["require"]],
      ['module.require("./fixed.cjs")', ["module.require"]],
      ["module.require`./fixed.cjs`", ["module.require"]],
      ['module["require"]("./fixed.cjs")', ['module["require"]']],
      ['require[member]("./fixed.cjs")', ["require[member]"]],
      ["export const loader = require", ["require"]],
      ["void module.require.call", ["module.require.call"]],
      ["require = local", ["require"]],
      ["require.call = local", ["require.call"]],
      ["require[key] = local", ["require[key]"]],
      [
        'const loader = require; loader("./fixed.cjs")',
        ["require", "loader"],
      ],
      [
        'declare const require: (path: string) => unknown; require("./fixed.cjs")',
        ["require"],
      ],
      ['var require; require("./fixed.cjs")', ["require"]],
      ['var module; module.require("./fixed.cjs")', ["module.require"]],
    ])("uses one exact dynamic-require diagnostic for %s", (source, expectedSlices) => {
      const diagnostics = analyzeV1(source);
      expect(
        diagnostics
          .filter(({ code }) => code === dynamicRequireCodeV1)
          .map(({ range }) => source.slice(...range)),
      ).toEqual(expectedSlices);
      expect(diagnostics.map(({ code }) => code)).not.toContain(
        "determinism.ambient_capability_escape",
      );
      expect(diagnostics.map(({ code }) => code)).not.toContain(
        "determinism.ambient_provider_import",
      );
    });

    it.each([
      ["take(module)", ["module"]],
      ["export const host = module", ["module"]],
      ["module = local", ["module"]],
      ["module.exports = local", ["module.exports"]],
      ["const value = flag ? module : local; take(value)", ["module", "value"]],
    ])("keeps bare module outside dynamic-require ownership: %s", (source, expectedSlices) => {
      const diagnostics = analyzeV1(source);
      expect(diagnostics.map(({ code, range }) => ({
        code,
        source: source.slice(...range),
      }))).toEqual(expectedSlices.map((expectedSource) => ({
        code: "determinism.ambient_capability_escape",
        source: expectedSource,
      })));
      expect(diagnostics.map(({ code }) => code)).not.toContain(dynamicRequireCodeV1);
    });

    it.each([
      "const loader = flag ? require : module.require; take(loader)",
      "const loader = require || module.require; take(loader)",
      "let loader = require; loader = module.require; take(loader)",
    ])("retains dynamic-require risk across loader joins: %s", (source) => {
      const diagnostics = analyzeV1(source);
      expect(
        diagnostics
          .filter(({ code }) => code === dynamicRequireCodeV1)
          .map(({ range }) => source.slice(...range)),
      ).toEqual(["require", "module.require", "loader"]);
      expect(diagnostics.map(({ code }) => code)).not.toContain(
        "determinism.ambient_capability_escape",
      );
    });

    it("retains dynamic-require risk when a createRequire factory joins another loader", () => {
      const source = 'import { createRequire } from "node:module"; ' +
        "const factory = flag ? createRequire : require; take(factory)";
      const diagnostics = analyzeV1(source);
      expect(
        diagnostics
          .filter(({ code }) => code === dynamicRequireCodeV1)
          .map(({ range }) => source.slice(...range)),
      ).toEqual(["createRequire", "createRequire", "require", "factory"]);
      expect(diagnostics.map(({ code }) => code)).not.toContain(
        "determinism.ambient_capability_escape",
      );
    });

    it.each([
      [
        'import * as nm from "node:module"; const { [key]: loader } = nm; loader(import.meta.url)',
        "loader",
      ],
      [
        'import * as nm from "node:module"; let loader; ({ [key]: loader } = nm); loader(import.meta.url)',
        "loader",
      ],
      [
        'import * as nm from "node:module"; const { ...rest } = nm; rest.createRequire(import.meta.url)',
        "rest.createRequire",
      ],
      [
        'import * as nm from "node:module"; let rest; ({ ...rest } = nm); rest.createRequire(import.meta.url)',
        "rest.createRequire",
      ],
    ])("fails closed for computed/rest node-module destructuring: %s", (source, expectedUse) => {
      const dynamicSlices = analyzeV1(source)
        .filter(({ code }) => code === dynamicRequireCodeV1)
        .map(({ range }) => source.slice(...range));
      expect(dynamicSlices).toContain("nm");
      expect(dynamicSlices).toContain(expectedUse);
      expect(codesV1(source)).not.toContain("determinism.ambient_capability_escape");
    });

    it("owns runtime TypeScript import-equals at the complete require reference", () => {
      const source = 'import dependency = require("node:fs"); dependency.run()';
      const diagnostics = analyzeV1(source);
      expect(diagnostics.map(({ code, range }) => ({
        code,
        source: source.slice(...range),
      }))).toEqual([{
        code: dynamicRequireCodeV1,
        source: 'require("node:fs")',
      }]);
    });

    it("tracks createRequire factories and their returned loaders without generic fallback", () => {
      const source = 'import { createRequire as makeRequire } from "node:module"; ' +
        "const load = makeRequire(import.meta.url); " +
        'load.call(null, "./fixed.cjs")';
      const diagnostics = analyzeV1(source);
      expect(diagnostics.map(({ code, range }) => ({
        code,
        source: source.slice(...range),
      }))).toEqual([
        {
          code: dynamicRequireCodeV1,
          source: "makeRequire",
        },
        {
          code: "determinism.ambient_provider_import",
          source: "node:module",
        },
        {
          code: dynamicRequireCodeV1,
          source: "makeRequire",
        },
        {
          code: dynamicRequireCodeV1,
          source: "load.call",
        },
      ]);
    });

    it.each([
      ['load("./fixed.cjs")', "load"],
      ['load.call(null, "./fixed.cjs")', "load.call"],
      ['load.apply(null, ["./fixed.cjs"])', "load.apply"],
      ['load.bind(null, "./fixed.cjs")', "load.bind"],
      ["take(load)", "load"],
      ["load[member]", "load[member]"],
    ])("tracks each returned createRequire loader use: %s", (operation, expectedSlice) => {
      const source = 'import { createRequire } from "node:module"; ' +
        "const load = createRequire(import.meta.url); " + operation;
      const diagnostics = analyzeV1(source);
      expect(
        diagnostics
          .filter(({ code }) => code === dynamicRequireCodeV1)
          .map(({ range }) => source.slice(...range)),
      ).toEqual(["createRequire", "createRequire", expectedSlice]);
      expect(diagnostics.map(({ code }) => code)).not.toContain(
        "determinism.ambient_capability_escape",
      );
    });

    it.each([
      'import { createRequire } from "node:module"; createRequire.call(null, import.meta.url)',
      'import { createRequire } from "node:module"; createRequire.apply(null, [import.meta.url])',
      'import { createRequire } from "node:module"; createRequire.bind(null, import.meta.url)',
      'import { createRequire } from "node:module"; createRequire[member]',
      'import * as nodeModule from "node:module"; nodeModule.createRequire(import.meta.url)',
    ])("classifies every createRequire wrapper or partial use: %s", (source) => {
      const diagnostics = analyzeV1(source);
      expect(diagnostics.map(({ code }) => code)).toContain(dynamicRequireCodeV1);
      expect(diagnostics.map(({ code }) => code)).not.toContain(
        "determinism.ambient_capability_escape",
      );
    });

    it.each([
      'const require = (path: string) => path; require("./fixed.cjs")',
      'let require; require = (path: string) => path; require("./fixed.cjs")',
      'const module = { require: (path: string) => path }; module.require("./fixed.cjs")',
      'function load(require: (path: string) => string) { return require("./fixed.cjs"); }',
      'const createRequire = () => (path: string) => path; createRequire()("./fixed.cjs")',
    ])("keeps a real lexical loader shadow ordinary: %s", (source) => {
      expect(analyzeV1(source)).toEqual([]);
    });

    it("leaves unsupported ESM import ownership to the collector", () => {
      expect(analyzeV1("import(dynamicSpecifier)")).toEqual([]);
      const providerSource = 'import("node:fs")';
      expect(
        analyzeV1(providerSource).map(({ code, range }) => ({
          code,
          source: providerSource.slice(...range),
        })),
      ).toEqual([{
        code: "determinism.ambient_provider_import",
        source: "node:fs",
      }]);
    });
  });

  it("preserves actual Date constructor member identity before later admission rules", () => {
    const codes = codesV1('Date.prototype.constructor.parse("2026-08-01T00:00:00Z")');
    expect(codes).not.toContain("determinism.ambient_clock");
    expect(codes).not.toContain("determinism.ambient_capability_escape");
    expect(codesV1("Date.prototype.constructor.now.call(null)"))
      .toEqual(["determinism.ambient_clock"]);
    expect(codesV1("Date.prototype.constructor.parse.constructor"))
      .toEqual(["determinism.ambient_capability_escape"]);
  });

  it("distinguishes String.raw from arbitrary tagged-template value passing", () => {
    expect(codesV1("const raw = String.raw; raw`${new Date(0)}`"))
      .toEqual(["determinism.host_timezone"]);
    expect(codesV1(
      "const tag = (_strings: TemplateStringsArray, ...values: unknown[]) => values[0]; " +
        "tag`${new Date(0)}`",
    )).toEqual([]);
  });

  it("classifies ambiguous Date descendants without claiming Host rendering", () => {
    const codes = codesV1(
      "const date = flag ? new Date(0) : projection; String((date as any).payload)",
    );
    expect(codes).toContain("determinism.ambient_capability_escape");
    expect(codes).not.toContain("determinism.host_timezone");
    for (
      const source of [
        "(new Date(0) as any).payload.getHours()",
        "const value = (new Date(0) as any).payload; value.getHours()",
        "const value = flag ? new Date(0) : projection; value.payload.toString()",
        "new Date(0).getHours.payload()",
      ]
    ) {
      const descendantCodes = codesV1(source);
      expect(descendantCodes).toContain("determinism.ambient_capability_escape");
      expect(descendantCodes).not.toContain("determinism.host_timezone");
    }
  });

  it("classifies binding a Host-dependent Date method as capability capture", () => {
    for (
      const source of [
        "new Date(0).getHours.bind(new Date(0))",
        "const value = flag ? new Date(0) : projection; value.getHours.bind(value)",
      ]
    ) {
      const codes = codesV1(source);
      expect(codes).toContain("determinism.ambient_capability_escape");
      expect(codes).not.toContain("determinism.host_timezone");
    }
  });

  it("does not coerce Date values for abstract equality against known non-coercing values", () => {
    for (
      const source of [
        "new Date(0) == void 0",
        "new Date(0) == /fixed/",
        "new Date(0) == Date.prototype",
        "new Date(0) == import.meta",
        "new Date(0) == String",
        "new Date(0) == Date.UTC",
        "new Date(0) == String.raw",
        "new Date(0) == Math.floor",
        "new Date(0) == Number.isSafeInteger",
        "new Date(0) == String.prototype",
        "new Date(0) == Temporal.Instant",
        "new Date(0) == Temporal.Instant.from",
      ]
    ) {
      expect(codesV1(source)).toEqual([]);
    }
    expect(codesV1("new Date(0) == void Date.now()"))
      .toEqual(["determinism.ambient_clock"]);
    for (
      const source of ["new Date(0) == Math", "new Date(0) == Date", "new Date(0) == globalThis"]
    ) {
      const codes = codesV1(source);
      expect(codes).toContain("determinism.ambient_capability_escape");
      expect(codes).not.toContain("determinism.host_timezone");
    }
  });

  it("treats primitive __proto__ setters as inert String.raw carrier metadata", () => {
    for (
      const value of [
        "undefined",
        "-1",
        "typeof missing",
        "delete record.value",
        "`fixed`",
        "1 + 2",
        "1 === 2",
        "value++",
        "(sideEffect(), 1)",
        "flag ? 1 : 2",
        "0 || 1",
      ]
    ) {
      expect(codesV1(`String.raw({ raw: { __proto__: ${value}, 0: "fixed", length: 1 } })`))
        .toEqual([]);
    }
    const codes = codesV1(
      'String.raw({ raw: { __proto__: void Date.now(), 0: "fixed", length: 1 } })',
    );
    expect(codes).toEqual(["determinism.ambient_clock"]);
  });

  it("does not claim Host coercion for invalid String.raw wrapper tags", () => {
    for (
      const source of [
        "String.raw.call`${new Date(0)}`",
        "const tag = String.raw.call; tag`${new Date(0)}`",
        "String.raw.apply`${new Date(0)}`",
      ]
    ) {
      const codes = codesV1(source);
      expect(codes).toContain("determinism.ambient_capability_escape");
      expect(codes).not.toContain("determinism.host_timezone");
    }
  });

  it("analyzes deeply nested closures through the central worklist", () => {
    let source = "return 0;";
    for (let depth = 31; depth >= 0; depth -= 1) {
      source = `function nested${depth}() { ${source} }`;
    }
    expect(codesV1(source)).toEqual([]);
  });

  it("publishes only the final conservative provenance classification", () => {
    for (
      const source of [
        "let C = Date; new C(); function mutate() { C = localCtor; }",
        "function mutate() { C = localCtor; } let C = Date; new C();",
      ]
    ) {
      expect(codesV1(source)).toEqual([
        "determinism.ambient_capability_escape",
        "determinism.ambient_capability_escape",
      ]);
    }
    expect(codesV1(
      'let parse = Date.parse; parse("2026-08-01T00:00:00"); ' +
        "function mutate() { parse = localParse; }",
    )).toEqual(["determinism.ambient_capability_escape"]);
  });

  it("keeps class static-block bindings isolated and declaration-order independent", () => {
    for (
      const source of [
        "class Model { static { const Math = { random: () => 1 }; } " +
        "method() { return Math.random(); } }",
        "class Model { method() { return Math.random(); } " +
        "static { const Math = { random: () => 1 }; } }",
      ]
    ) {
      expect(codesV1(source)).toEqual(["determinism.ambient_random"]);
    }
    expect(codesV1(
      "class Model { static { function read() { return Math.random(); } " +
        "const Math = { random: () => 1 }; read(); } }",
    )).toEqual([]);
    expect(codesV1(
      "class Model { static { var Math = { random: () => 1 }; } } Math.random();",
    )).toEqual(["determinism.ambient_random"]);
    expect(codesV1(
      "class Model { static { var Math = { random: () => 1 }; Math.random(); } }",
    )).toEqual([]);
    expect(codesV1(
      'class Model { static { var require = local; require("./fixed.cjs"); } }',
    )).toEqual([]);
  });

  it("keeps runtime namespace var bindings inside the namespace", () => {
    expect(codesV1(
      "namespace Local { var Math = { random: () => 1 }; } Math.random();",
    )).toEqual(["determinism.ambient_random"]);
    expect(codesV1(
      "namespace Local { var Math = { random: () => 1 }; Math.random(); }",
    )).toEqual([]);
    expect(codesV1(
      'namespace Local { var module = local; module.require("./fixed.cjs"); }',
    )).toEqual([]);
  });

  it("uses one isolated lexical scope for all switch cases", () => {
    expect(codesV1(
      "switch (kind) { case 0: const Math = { random: () => 1 }; break; } Math.random();",
    )).toEqual(["determinism.ambient_random"]);
    expect(codesV1(
      "switch (kind) { case 0: function read() { return Math.random(); } break; " +
        "case 1: const Math = { random: () => 1 }; read(); break; }",
    )).toEqual([]);
  });

  it.each([
    'Date[member].call(null, "2026-08-01T00:00:00Z")',
    "Math[member].call(null)",
    "String[member].call(null, new Date(0))",
    "Temporal[member].call(null)",
    "new Date(0)[member].call(new Date(0))",
    "Deno[member]",
    "process[member]",
    "crypto[member]",
    "performance[member]",
    "window[member]",
  ])("fails closed for dynamic ambient member production: %s", (source) => {
    expect(codesV1(source)).toContain("determinism.ambient_capability_escape");
  });

  it.each([
    "Deno = local",
    "process = local",
    "crypto = local",
    "Deno.env = local",
    "Deno[key] = local",
    "process.env = local",
    "crypto.getRandomValues = local",
    "performance.now = local",
    "window.fetch = local",
    "Intl.Collator = local",
    "fetch.call = local",
    "const date = flag ? new Date(0) : projection; date.getTime = local",
    "const date = flag ? new Date(0) : projection; delete date.getTime",
    "const date = flag ? new Date(0) : projection; date.value++",
  ])("rejects writes through tracked ambient capability paths: %s", (source) => {
    expect(codesV1(source)).toContain("determinism.ambient_capability_escape");
  });

  it.each([
    "const Deno = { env: null }; Deno.env = local",
    "let require = { call: null }; require.call = local",
    "const epoch = Date.UTC(2026, 7, 1); (epoch as any).value = local",
    'const instant = "2026-08-01T00:00:00Z"; (instant as any).value = local',
  ])("allows the same writes through lexical shadows: %s", (source) => {
    expect(codesV1(source)).toEqual([]);
  });

  it("preserves callable identity through TypeScript instantiation wrappers", () => {
    expect(codesV1("(Date.parse<string>)(recordedInstant)"))
      .toEqual(["determinism.date_input_unverified"]);
    expect(codesV1("(String<string>)(new Date(0))"))
      .toEqual(["determinism.host_timezone"]);
    expect(codesV1("(Date.parse<string>).call(null, recordedInstant)"))
      .toEqual(["determinism.date_input_unverified"]);
    expect(codesV1('(Date.parse<string>)("2026-08-01T00:00:00Z")')).toEqual([]);
    expect(codesV1("(String<string>)(0)")).toEqual([]);
  });

  it("treats for-in/of left sides as writes and invalidates local provenance", () => {
    for (
      const source of [
        "for (Date.now of values) {}",
        "for (Math.random in values) {}",
        "for (performance.now of values) {}",
        "for ({ value: Date.prototype.getHours } of values) {}",
      ]
    ) {
      expect(codesV1(source)).toEqual(["determinism.ambient_capability_escape"]);
    }

    const reassignedParse = codesV1(
      'let parse = Date.parse; for (parse of values) {} const epoch = parse("2026-08-01T00:00:00Z"); new Date(epoch);',
    );
    expect(reassignedParse).toContain("determinism.ambient_capability_escape");
    expect(reassignedParse).toContain("determinism.date_input_unverified");
    expect(codesV1(
      "let date = new Date(0); for (date of values) {} date.getTime();",
    )).toContain("determinism.ambient_capability_escape");
    expect(codesV1(
      'let parse = Date.parse; for ({ parse } of values) {} parse("2026-08-01T00:00:00Z");',
    )).toContain("determinism.ambient_capability_escape");
    expect(codesV1(
      'let parse = Date.parse; for ([parse] of values) {} parse("2026-08-01T00:00:00Z");',
    )).toContain("determinism.ambient_capability_escape");
    expect(codesV1(
      'let parse = Date.parse; for ((parse as any) of values) {} parse("2026-08-01T00:00:00Z");',
    )).toContain("determinism.ambient_capability_escape");
    expect(codesV1(
      'let parse = Date.parse; for ((parse!) of values) {} parse("2026-08-01T00:00:00Z");',
    )).toContain("determinism.ambient_capability_escape");
  });

  it("invalidates local provenance through runtime-erased assignment wrappers", () => {
    const parseCodes = codesV1(
      'let parse = Date.parse; (parse as any) = localParse; const epoch = parse("2026-08-01T00:00:00Z"); new Date(epoch);',
    );
    expect(parseCodes).toContain("determinism.ambient_capability_escape");
    expect(parseCodes).toContain("determinism.date_input_unverified");
    expect(codesV1(
      "let date = new Date(0); (date satisfies unknown) = projection; date.getTime();",
    )).toContain("determinism.ambient_capability_escape");
  });

  it("tracks runtime-erased wrappers nested inside assignment patterns", () => {
    expect(codesV1(
      "let parse = local; ({ parse: parse as any } = Date); parse(recordedInstant);",
    )).toContain("determinism.ambient_capability_escape");
    expect(codesV1(
      'let parse = Date.parse; for ({ parse: parse as any } of values) {} parse("2026-08-01T00:00:00Z");',
    )).toContain("determinism.ambient_capability_escape");
    expect(codesV1(
      'let parse = Date.parse; for ([parse as any] of values) {} parse("2026-08-01T00:00:00Z");',
    )).toContain("determinism.ambient_capability_escape");
    expect(codesV1(
      "let parse = local; ({ parse: parse as any } = { parse: local }); parse(recordedInstant);",
    )).toEqual([]);
  });

  it("does not re-read runtime-erased update write targets", () => {
    for (const source of ["(Date.now as any)++", "(Math.random as any)++"]) {
      expect(codesV1(source)).toEqual(["determinism.ambient_capability_escape"]);
    }
  });

  it("evaluates non-reference delete operands before discarding the value", () => {
    expect(codesV1("delete Date.now()"))
      .toEqual(["determinism.ambient_clock"]);
    expect(codesV1("delete Math.random()"))
      .toEqual(["determinism.ambient_random"]);
    expect(codesV1("delete (flag ? Date.now() : 0)"))
      .toEqual(["determinism.ambient_clock"]);
    expect(codesV1("delete Date.now"))
      .toEqual(["determinism.ambient_capability_escape"]);
  });

  it("still diagnoses computed keys and defaults on for-in/of write patterns", () => {
    expect(codesV1("for ({ [Date.now()]: value } of values) {}"))
      .toEqual(["determinism.ambient_clock"]);
    expect(codesV1("for ({ value = Date.now() } of values) {}"))
      .toEqual(["determinism.ambient_clock"]);
  });

  it.each([
    [
      "const { Now } = Temporal; Now.instant()",
      ["determinism.ambient_capability_escape", "determinism.ambient_clock"],
    ],
    [
      "const Now = Temporal.Now; Now.instant()",
      ["determinism.ambient_capability_escape", "determinism.ambient_clock"],
    ],
    ["export const Now = Temporal.Now", ["determinism.ambient_capability_escape"]],
    ["take(Temporal.Now)", ["determinism.ambient_capability_escape"]],
  ])("distinguishes Temporal.Now capture from an eventual clock read: %s", (source, codes) => {
    expect(codesV1(source)).toEqual(codes);
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

  it("reports Host-timezone access with an actionable UTC/recorded-zone hint", () => {
    expect(analyzeV1("new Date(0).getHours()")[0]).toEqual(expect.objectContaining({
      code: "determinism.host_timezone",
      message: "Authoritative code depends on the Host timezone.",
      hint: "Use an explicit UTC/value operation or commit a canonical recorded zone as input.",
    }));
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
