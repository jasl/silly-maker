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
    ["Date.now()", "determinism.clock.date_now"],
    ["Date(0)", "determinism.clock.date_function_call"],
    ["new Date()", "determinism.clock.date_zero_argument_constructor"],
    ["const D = Date; new D()", "determinism.capability.indirect_intrinsic"],
    ["const { now } = Date; now()", "determinism.clock.date_now"],
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
    ["new Date(...[])", "determinism.date_input_unverified"],
    ["Date.call(null)", "determinism.capability.indirect_intrinsic"],
    ["Date.apply(null, [])", "determinism.capability.indirect_intrinsic"],
    ["Date.bind(null)()", "determinism.capability.indirect_intrinsic"],
    ["Date.prototype.constructor()", "determinism.capability.indirect_intrinsic"],
    ["new Date.prototype.constructor()", "determinism.capability.indirect_intrinsic"],
    [
      "(Date.prototype.constructor as typeof Date)()",
      "determinism.capability.indirect_intrinsic",
    ],
    ["new Date(0).constructor()", "determinism.capability.indirect_intrinsic"],
    ["Date.prototype.constructor.now()", "determinism.clock.date_now"],
    ["new Date(0).constructor.now()", "determinism.clock.date_now"],
    ["new Date(0).getHours()", "determinism.host_timezone"],
    ["new Date(0).toString()", "determinism.host_timezone"],
    [
      "Date.prototype.getTimezoneOffset.call(new Date(0))",
      "determinism.date_instance_unverified",
    ],
    [
      'const date = new Date(0); const member = "getHours"; date[member]()',
      "determinism.capability.dynamic_member",
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
    ["Date.parse.constructor", "determinism.capability.constructor_escape"],
    ["Date.parse.constructor.call(null)", "determinism.capability.dynamic_code"],
    ["Math.floor.constructor.apply(null, [])", "determinism.capability.dynamic_code"],
    [
      "Temporal.Instant.from.constructor.bind(null)",
      "determinism.capability.constructor_escape",
    ],
    ["Date.parse[key]", "determinism.capability.dynamic_member"],
    ["Math.floor[key]", "determinism.capability.dynamic_member"],
    ["Number.isSafeInteger[key]", "determinism.capability.dynamic_member"],
    ["Temporal.Instant.from[key]", "determinism.capability.dynamic_member"],
    ["String.raw[key]", "determinism.capability.dynamic_member"],
    ["String.constructor", "determinism.capability.constructor_escape"],
    ["String.raw.constructor", "determinism.capability.constructor_escape"],
    ["String.prototype.constructor.constructor", "determinism.capability.constructor_escape"],
    ["Date.parse.foo()", "determinism.ambient_capability_escape"],
    ["Date.UTC.prototype", "determinism.ambient_capability_escape"],
    ["Date.parse.bind(null)(recordedInstant)", "determinism.capability.indirect_intrinsic"],
    [
      'const date = new Date(0); (date as any).payload = "2026-08-01T00:00:00"; new Date((date as any).payload)',
      "determinism.date_input_unverified",
    ],
    ['Date.parse("2026-08-01T00:00:00Z".length)', "determinism.date_input_unverified"],
    [
      'Date.parse.call(null, "2026-08-01T00:00:00Z".length)',
      "determinism.capability.indirect_intrinsic",
    ],
    [
      'Date.parse.apply(null, ["2026-08-01T00:00:00Z".length])',
      "determinism.capability.indirect_intrinsic",
    ],
    ["new Date(recordedInstant)", "determinism.date_input_unverified"],
    ["Date.parse(recordedInstant)", "determinism.date_input_unverified"],
    ["Date.parse.call(null, recordedInstant)", "determinism.capability.indirect_intrinsic"],
    ["Date.parse.apply(null, [recordedInstant])", "determinism.capability.indirect_intrinsic"],
    [
      "new Date.prototype.constructor(recordedInstant)",
      "determinism.capability.indirect_intrinsic",
    ],
    ["new Date(2026, 7, 1)", "determinism.date_input_unverified"],
    ['new Date("2026-08-01T00:00:00")', "determinism.host_timezone"],
    ['Date.parse("2026-08-01T00:00:00")', "determinism.host_timezone"],
    ["new Date(null)", "determinism.date_input_unverified"],
    ["Date.parse(0)", "determinism.date_input_unverified"],
    ["new Date(8640000000000001)", "determinism.date_input_unverified"],
    ["new Date(...recordedArgs)", "determinism.date_input_unverified"],
    ["new Date(...[,])", "determinism.date_input_unverified"],
    ["Date.parse.apply(null, recordedArgs)", "determinism.capability.indirect_intrinsic"],
    [
      'Date.parse.apply(null, [, "2026-08-01T00:00:00Z"])',
      "determinism.capability.indirect_intrinsic",
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
    [
      "const date = flag ? new Date(0) : projection; String(date)",
      "determinism.date_instance_unverified",
    ],
    [
      "const date = flag && new Date(0); `${date}`",
      "determinism.date_instance_unverified",
    ],
    [
      "let date = projection; if (flag) date = new Date(0); String(date)",
      "determinism.date_instance_unverified",
    ],
    [
      "let date = new Date(0); if (flag) date = projection; String(date)",
      "determinism.date_instance_unverified",
    ],
    [
      "let parse = localParse; if (flag) parse = Date.parse; parse(recordedInstant)",
      "determinism.ambient_capability_escape",
    ],
    [
      "const { parse } = Date; parse(recordedInstant)",
      "determinism.capability.indirect_intrinsic",
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
      "determinism.date_instance_unverified",
    ],
    [
      "let date = new Date(0); function unused() { date = projection; } String(date)",
      "determinism.date_instance_unverified",
    ],
    [
      "const { stringify = String } = input; stringify(new Date(0))",
      "determinism.host_timezone",
    ],
    [
      "const { constructor: Constructor } = Date.parse; Constructor();",
      "determinism.capability.dynamic_code",
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
      "determinism.date_instance_unverified",
    ],
    [
      "let value = projection; const render = () => `${value}`; value = new Date(0); render();",
      "determinism.date_instance_unverified",
    ],
    [
      "let value = projection; function read() { return value.getHours(); } value = new Date(0); read();",
      "determinism.date_instance_unverified",
    ],
    [
      "let parse = localParse; function read() { return parse(recordedInstant); } parse = Date.parse; read();",
      "determinism.ambient_capability_escape",
    ],
    [
      "let source = projection; let target = projection; function read() { return String(target); } function mutate() { target = source; } source = new Date(0); mutate(); read();",
      "determinism.date_instance_unverified",
    ],
    [
      "let value = projection; String(value); value = new Date(0)",
      "determinism.date_instance_unverified",
    ],
    [
      "let source = projection; let target = projection; String(target); target = source; source = new Date(0)",
      "determinism.date_instance_unverified",
    ],
    [
      "function render() { let value = projection; String(value); function mutate() { value = new Date(0); } }",
      "determinism.date_instance_unverified",
    ],
    [
      "let value = projection; let render; { render = () => String(value); } value = new Date(0); render();",
      "determinism.date_instance_unverified",
    ],
    [
      'let value = projection; let render = () => "fixed"; if (flag) { render = () => String(value); } value = new Date(0); render();',
      "determinism.date_instance_unverified",
    ],
    [
      "let value = projection; for (const item of items) { callbacks.push(() => String(value)); } value = new Date(0);",
      "determinism.date_instance_unverified",
    ],
    [
      'const date = new Date(0); date.getTime = (() => "2026-08-01T00:00:00") as any; new Date(date.getTime())',
      "determinism.date_instance_mutation",
    ],
    [
      'Date.UTC = (() => "2026-08-01T00:00:00") as any; new Date(Date.UTC(2026, 7, 1))',
      "determinism.capability.intrinsic_mutation",
    ],
    [
      'Date.prototype.getTime = (() => "2026-08-01T00:00:00") as any; new Date(new Date(0).getTime())',
      "determinism.capability.intrinsic_mutation",
    ],
    ["delete Date.UTC", "determinism.capability.intrinsic_mutation"],
    ["Date.UTC++", "determinism.capability.intrinsic_mutation"],
    [
      'const member = "UTC"; Date[member] = localUtc as any',
      "determinism.capability.intrinsic_mutation",
    ],
    [
      '({ x: Date.UTC } = { x: (() => "2026-08-01T00:00:00") as any }); new Date(Date.UTC(2026, 7, 1))',
      "determinism.capability.intrinsic_mutation",
    ],
    [
      "[Date.UTC] = [localUtc as any]; new Date(Date.UTC(2026, 7, 1))",
      "determinism.capability.intrinsic_mutation",
    ],
    [
      'for (Date.UTC of [(() => "2026-08-01T00:00:00") as any]) {} new Date(Date.UTC(2026, 7, 1))',
      "determinism.capability.intrinsic_mutation",
    ],
    [
      'for (Date.prototype.getTime of [(() => "2026-08-01T00:00:00") as any]) {} new Date(new Date(0).getTime())',
      "determinism.capability.intrinsic_mutation",
    ],
    [
      "for ({ x: Date.UTC } of [{ x: localUtc as any }]) {} new Date(Date.UTC(2026, 7, 1))",
      "determinism.capability.intrinsic_mutation",
    ],
    [
      "new Date(0).getTime.constructor",
      "determinism.capability.constructor_escape",
    ],
    [
      "Date.prototype.getTime.constructor",
      "determinism.capability.constructor_escape",
    ],
    [
      'new Date(0).toISOString.constructor("return Math.random()")()',
      "determinism.capability.dynamic_code",
    ],
    [
      "new String(0).valueOf.constructor",
      "determinism.capability.constructor_escape",
    ],
    [
      "String.prototype.valueOf.constructor",
      "determinism.capability.constructor_escape",
    ],
    ["new Date(recordedInstant).getUTCHours()", "determinism.date_input_unverified"],
    ["new Date(Math.random()).getTime()", "determinism.ambient_random"],
    ["new Date(2026, 7, 1).toISOString()", "determinism.date_input_unverified"],
    ["new String(Math.random()).valueOf()", "determinism.ambient_random"],
    [
      "const payload = (new Date(0) as any).payload; String(payload)",
      "determinism.date_instance_unverified",
    ],
    [
      "const payload = (new Date(0) as any).payload; `${payload}`",
      "determinism.date_instance_unverified",
    ],
    [
      'const payload = (new Date(0) as any).payload; "" + payload',
      "determinism.date_instance_unverified",
    ],
    [
      "const date = new Date(0); String(date.getTime)",
      "determinism.date_instance_unverified",
    ],
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
      "determinism.date_instance_unverified",
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
    [
      "let date; String((date = new Date(0), date))",
      "determinism.date_instance_unverified",
    ],
    ["let date; `${(date = new Date(0), date)}`", "determinism.date_instance_unverified"],
    ['let date; "" + (date = new Date(0), date)', "determinism.date_instance_unverified"],
    [
      'let date; let text = ""; text += (date = new Date(0), date)',
      "determinism.date_instance_unverified",
    ],
    [
      "let date; String.raw`${(date = new Date(0), date)}`",
      "determinism.date_instance_unverified",
    ],
    [
      "let date; String.raw({ raw: [(date = new Date(0), date)] })",
      "determinism.date_instance_unverified",
    ],
    [
      'let date; String.raw({ raw: ["", ""] }, (date = new Date(0), date))',
      "determinism.date_instance_unverified",
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
    ["Date.parse`2026-08-01T00:00:00`", "determinism.capability.indirect_intrinsic"],
    ["Date.parse`2026-08-01T00:00:00Z`", "determinism.capability.indirect_intrinsic"],
    [
      'Date.parse.call`${"2026-08-01T00:00:00"}`',
      "determinism.capability.indirect_intrinsic",
    ],
    [
      'Date.parse.apply`${["2026-08-01T00:00:00"]}`',
      "determinism.capability.indirect_intrinsic",
    ],
    ["(Math.random(), Math).floor(1)", "determinism.ambient_random"],
    ["(Date.now(), Math).floor(1)", "determinism.clock.date_now"],
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
      "determinism.clock.date_now",
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
    ["import D = Date; D()", "determinism.capability.indirect_intrinsic"],
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
    "const epoch = Date.UTC(2026, 7, 1, 0, 0, 0, 0); new Date(epoch)",
    'new Date(Date.parse("2026-08-01T00:00:00Z"))',
    "const epoch = 0; new Date(epoch)",
    'const instant = "2026-08-01T00:00:00Z"; Date.parse(instant)',
    "new Date(0).getTime()",
    "new Date(0).getUTCHours()",
    "new Date(0).toISOString()",
    'Temporal.Instant.from("2026-08-01T00:00:00Z")',
    'const { Instant } = Temporal; Instant.from("2026-08-01T00:00:00Z")',
    'const { PlainDate } = Temporal; PlainDate.from("2026-08-01")',
    "String(0); `${0}`; 0 + 1",
    "String.apply(null, undefined)",
    "String.apply(null, void 0)",
    'String.raw({ raw: { __proto__() {}, 0: "fixed", length: 1 } })',
    'const __proto__ = 0; String.raw({ raw: { __proto__, 0: "fixed", length: 1 } })',
    'String.raw({ raw: { __proto__: null, 0: "fixed", length: 1 } })',
    "new Date(0) === new Date(0)",
    "new Date(0) == null",
    "new Date(0) == new Date(0)",
    "class Model { accessor fixed = 1 }",
    "Math.floor(value); Math.ceil(value); Math.round(value); Math.trunc(value)",
    "Math.min(a, b); Math.max(a, b); Math.abs(a); Math.imul(a, b); Math.clz32(a)",
    "const { floor } = Math; floor(value)",
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

  describe("DET3a-C2 conservative Date proof and precedence", () => {
    const diagnosticSlicesV1 = (source: string) =>
      analyzeV1(source).map(({ code, range }) => ({ code, source: source.slice(...range) }));

    it.each([
      ["Date.now()", "determinism.clock.date_now", "Date.now"],
      ["Date(0)", "determinism.clock.date_function_call", "Date"],
      [
        "new Date()",
        "determinism.clock.date_zero_argument_constructor",
        "Date",
      ],
      [
        "Date`fixed`",
        "determinism.clock.date_function_call",
        "Date",
      ],
      [
        'Date.prototype.constructor.parse("2026-08-01T00:00:00Z")',
        "determinism.capability.indirect_intrinsic",
        "Date.prototype.constructor.parse",
      ],
      [
        "Date.prototype.constructor.UTC(2024, 1, 29, 0, 0, 0, 0)",
        "determinism.capability.indirect_intrinsic",
        "Date.prototype.constructor.UTC",
      ],
      [
        'new Date.prototype.constructor("2026-08-01T00:00:00Z")',
        "determinism.capability.indirect_intrinsic",
        "Date.prototype.constructor",
      ],
      [
        "new Date(0).constructor.now()",
        "determinism.clock.date_now",
        "new Date(0).constructor.now",
      ],
      [
        'Date.now.constructor("return 1")()',
        "determinism.capability.dynamic_code",
        "Date.now.constructor",
      ],
      [
        'Math.floor.constructor("return 1")()',
        "determinism.capability.dynamic_code",
        "Math.floor.constructor",
      ],
      [
        'Function("return 1")()',
        "determinism.capability.dynamic_code",
        "Function",
      ],
      [
        'require.constructor("return 1")()',
        "determinism.capability.dynamic_code",
        "require.constructor",
      ],
      [
        "new Date(0).getTime.constructor",
        "determinism.capability.constructor_escape",
        "new Date(0).getTime.constructor",
      ],
      [
        'new Date(0).getTime.constructor("return 1")()',
        "determinism.capability.dynamic_code",
        "new Date(0).getTime.constructor",
      ],
      [
        "recordedValue.constructor()",
        "determinism.capability.constructor_escape",
        "recordedValue.constructor",
      ],
      [
        "recordedValue.constructor.call(null)",
        "determinism.capability.constructor_escape",
        "recordedValue.constructor.call",
      ],
      [
        "function read(value: unknown) { return (value as any).constructor; }",
        "determinism.capability.constructor_escape",
        "(value as any).constructor",
      ],
    ])("selects one exact current-node winner for %s", (source, code, expectedSlice) => {
      expect(diagnosticSlicesV1(source)).toEqual([{ code, source: expectedSlice }]);
    });

    it.each([
      "const value = { constructor: () => 1 }; value.constructor()",
      "class LocalValue {}; LocalValue.prototype.constructor",
      "function read(value: unknown) { const { constructor: C } = value as any; return C(); }",
    ])("fails closed for locally unproved constructor identity: %s", (source) => {
      expect(codesV1(source)).toContain("determinism.capability.constructor_escape");
    });

    it("keeps executed child diagnostics beside the outer winner", () => {
      const source = 'Date.now.constructor(Date.now())("return 1")';
      expect(diagnosticSlicesV1(source)).toEqual([
        {
          code: "determinism.capability.dynamic_code",
          source: "Date.now.constructor",
        },
        {
          code: "determinism.clock.date_now",
          source: "Date.now",
        },
      ]);
    });

    it("keeps a tagged-template substitution diagnostic beside dynamic code", () => {
      const source = "Date.now.constructor`${Date.now()}`";
      expect(diagnosticSlicesV1(source)).toEqual([
        {
          code: "determinism.capability.dynamic_code",
          source: "Date.now.constructor",
        },
        { code: "determinism.clock.date_now", source: "Date.now" },
      ]);
    });

    it.each([
      ["Function", "determinism.capability.dynamic_code"],
      ["require", "determinism.capability.dynamic_require"],
      ["Date.parse", "determinism.capability.indirect_intrinsic"],
    ])("retains a KnownDate substitution beside the classified tag: %s", (
      tag,
      code,
    ) => {
      const source = `const date = new Date(0); ${tag}\`\${date}\``;
      expect(diagnosticSlicesV1(source)).toEqual([
        { code, source: tag },
        { code: "determinism.date_instance_unverified", source: "date" },
      ]);
    });

    it.each([
      [
        "(Date.now as any) **= 2",
        "determinism.capability.intrinsic_mutation",
        "Date.now",
      ],
      [
        "Date.UTC -= new Date(0)",
        "determinism.capability.intrinsic_mutation",
        "Date.UTC",
      ],
      ["require += new Date(0)", "determinism.capability.dynamic_require", "require"],
    ])("lets the current-node write winner suppress lower coercion diagnostics: %s", (
      source,
      code,
      expectedSlice,
    ) => {
      expect(diagnosticSlicesV1(source)).toEqual([{ code, source: expectedSlice }]);
    });

    it("preserves a computed write-target child diagnostic beside the write winner", () => {
      const source = "Date[Date.now()] += new Date(0)";
      expect(diagnosticSlicesV1(source)).toEqual([
        {
          code: "determinism.capability.intrinsic_mutation",
          source: "Date[Date.now()]",
        },
        { code: "determinism.clock.date_now", source: "Date.now" },
      ]);
    });

    it("does not normalize an ambiguous Date constructor to Date", () => {
      const source = "const date = flag ? new Date(0) : value; date.constructor()";
      expect(diagnosticSlicesV1(source)).toEqual([{
        code: "determinism.capability.constructor_escape",
        source: "date.constructor",
      }]);
    });

    it.each([
      [
        "const date = flag ? new Date(0) : new Date(1); date.constructor",
        ["determinism.capability.constructor_escape"],
      ],
      [
        "let date = new Date(0); date.constructor",
        [
          "determinism.date_instance_unverified",
          "determinism.capability.constructor_escape",
        ],
      ],
      [
        "const date = flag ? new Date(0) : new Date(1); date.constructor.now()",
        ["determinism.capability.constructor_escape"],
      ],
    ])("requires an exact KnownDate before constructor normalization: %s", (
      source,
      expectedCodes,
    ) => {
      expect(codesV1(source)).toEqual(expectedCodes);
    });

    it("normalizes only direct exact KnownDate and Date.prototype constructors", () => {
      expect(codesV1("const date = new Date(0); date.constructor"))
        .toEqual(["determinism.capability.indirect_intrinsic"]);
      expect(codesV1("Date.prototype.constructor"))
        .toEqual(["determinism.capability.indirect_intrinsic"]);
      expect(codesV1("const date = flag ? new Date(0) : new Date(1); date.constructor`fixed`"))
        .toEqual(["determinism.capability.constructor_escape"]);
    });

    it.each([
      'const date = new Date(0); date["constructor"]()',
      "const date = new Date(0); date?.constructor()",
    ])("rejects a non-direct Date constructor selector: %s", (source) => {
      expect(codesV1(source)).toEqual(["determinism.capability.dynamic_member"]);
    });

    it.each([
      'Date.prototype["constructor"].now()',
      "Date.prototype?.constructor.now()",
      'const date = new Date(0); date["constructor"].now()',
      'new (Date.prototype["constructor"].parse)()',
      'Date.prototype["constructor"]`fixed`',
    ])("does not recover Date identity through a non-direct constructor selector: %s", (
      source,
    ) => {
      expect(codesV1(source)).toEqual(["determinism.capability.dynamic_member"]);
    });

    it.each([
      'const { ["constructor"]: Constructor } = Date.prototype; Constructor.now()',
      'const date = new Date(0); const { ["constructor"]: Constructor } = date; Constructor.now()',
      "const { [member]: Constructor } = Date.prototype; Constructor()",
      'let Constructor; ({ ["constructor"]: Constructor } = Date.prototype); Constructor.now()',
      "let Constructor; ({ [member]: Constructor } = Date.prototype); Constructor()",
    ])("preserves dynamic Date-member risk through a computed pattern: %s", (source) => {
      expect(codesV1(source)).toEqual([
        "determinism.capability.dynamic_member",
        "determinism.date_instance_unverified",
        "determinism.capability.dynamic_member",
      ]);
    });

    it.each([
      ["Function`return 1`", "determinism.capability.dynamic_code", "Function"],
      [
        "Date.now.constructor`return 1`",
        "determinism.capability.dynamic_code",
        "Date.now.constructor",
      ],
      [
        "Math.floor.constructor`return 1`",
        "determinism.capability.dynamic_code",
        "Math.floor.constructor",
      ],
      [
        "require.constructor`return 1`",
        "determinism.capability.dynamic_code",
        "require.constructor",
      ],
      [
        "recordedValue.constructor`return 1`",
        "determinism.capability.constructor_escape",
        "recordedValue.constructor",
      ],
      [
        "function render(value: unknown) { return (value as any).constructor`fixed`; }",
        "determinism.capability.constructor_escape",
        "(value as any).constructor",
      ],
    ])("uses the call-like constructor selector for tagged templates: %s", (
      source,
      code,
      expectedSlice,
    ) => {
      expect(diagnosticSlicesV1(source)).toEqual([{ code, source: expectedSlice }]);
    });

    it.each([
      'Date.length.constructor("return 1")()',
      'Date.foo.constructor("return 1")()',
      'new Date.length.constructor("return 1")',
      'Date.length.constructor?.("return 1")()',
      "Date.length.constructor`return 1`",
      "Date.foo.constructor`return 1`",
    ])("keeps an unproved Date-root constructor on the escape path: %s", (source) => {
      expect(diagnosticSlicesV1(source)).toEqual([{
        code: "determinism.capability.constructor_escape",
        source: source.includes("Date.foo") ? "Date.foo.constructor" : "Date.length.constructor",
      }]);
    });

    it.each([
      'const F = Function; F("return 1")()',
      'globalThis.Function("return 1")()',
      'Function.call(null, "return 1")()',
      'Function.apply(null, ["return 1"])()',
      'Function.bind(null, "return 1")()()',
      'const { Function: F } = globalThis; F("return 1")()',
      '(0, Function)("return 1")()',
    ])("classifies every proven Function-constructor route: %s", (source) => {
      expect(codesV1(source)).toContain("determinism.capability.dynamic_code");
    });

    it.each([
      [
        'Date.now.constructor.bind(null, "return 1")()',
        'Date.now.constructor.bind(null, "return 1")',
      ],
      [
        'Math.floor.constructor.bind(null, "return 1")()',
        'Math.floor.constructor.bind(null, "return 1")',
      ],
      [
        'Number.isSafeInteger.constructor.bind(null, "return 1")()',
        'Number.isSafeInteger.constructor.bind(null, "return 1")',
      ],
      [
        'fetch.constructor.bind(null, "return 1")()',
        'fetch.constructor.bind(null, "return 1")',
      ],
    ])("uses one dynamic-code winner for an immediately invoked bound constructor: %s", (
      source,
      expectedSlice,
    ) => {
      expect(diagnosticSlicesV1(source)).toEqual([{
        code: "determinism.capability.dynamic_code",
        source: expectedSlice,
      }]);
    });

    it("keeps a non-invoked bound constructor as an escape", () => {
      const source = 'Date.now.constructor.bind(null, "return 1")';
      expect(diagnosticSlicesV1(source)).toEqual([{
        code: "determinism.capability.constructor_escape",
        source: "Date.now.constructor.bind",
      }]);
    });

    it.each([
      [
        'const Constructor = Date.now.constructor.bind(null, "return 1"); Constructor()',
        "Constructor",
      ],
      [
        'const Constructor = Date.now.constructor.bind(null, "return 1"); new Constructor()',
        "Constructor",
      ],
      [
        'const Constructor = Date.now.constructor.bind(null, "return 1"); Constructor`fixed`',
        "Constructor",
      ],
    ])("treats a later bound-constructor execution as a separate operation: %s", (
      source,
      executionSlice,
    ) => {
      expect(diagnosticSlicesV1(source)).toEqual([
        {
          code: "determinism.capability.constructor_escape",
          source: "Date.now.constructor.bind",
        },
        { code: "determinism.capability.dynamic_code", source: executionSlice },
      ]);
    });

    it("retains executed children beside the outer bound-constructor winner", () => {
      const source = "Date.now.constructor.bind(null, Date.now())()";
      expect(diagnosticSlicesV1(source)).toEqual([
        {
          code: "determinism.capability.dynamic_code",
          source: "Date.now.constructor.bind(null, Date.now())",
        },
        { code: "determinism.clock.date_now", source: "Date.now" },
      ]);
    });

    it.each(["||", "??"])(
      "uses one winner when a truthy bound constructor is selected by %s",
      (operator) => {
        const source = `(Date.now.constructor.bind(null, "return 1") ${operator} ` +
          'Date.now.constructor.bind(null, "return 2"))()';
        expect(codesV1(source)).toEqual(["determinism.capability.dynamic_code"]);
      },
    );

    it("keeps the discarded bound capture on the left of &&", () => {
      const source = '(Date.now.constructor.bind(null, "return 1") && ' +
        'Date.now.constructor.bind(null, "return 2"))()';
      expect(codesV1(source)).toEqual([
        "determinism.capability.constructor_escape",
        "determinism.capability.dynamic_code",
      ]);
    });

    it.each([
      [
        '(Date.parse || Date.now)("2026-08-01T00:00:00Z")',
        ["determinism.capability.indirect_intrinsic"],
      ],
      ["(Math.floor || Date.now())(1)", []],
      ['(fetch || Date.now())("/")', ["determinism.network"]],
    ])("does not inspect an unreachable logical fallback: %s", (source, expected) => {
      expect(codesV1(source)).toEqual(expected);
    });

    it.each([
      "Math.floor || Date.now()",
      "const value = Math.floor || Date.now()",
      "use(Math.floor || Date.now())",
      "[Math.floor || Date.now()]",
      'Math.floor || Date.now.constructor.bind(null, "return 1")',
    ])("does not inspect an unreachable fallback in a general runtime context: %s", (source) => {
      expect(codesV1(source)).toEqual([]);
    });

    it("retains the evaluated callable producer in a general short-circuit context", () => {
      const source = 'Date.now.constructor.bind(null, "return 1") || Date.now()';
      expect(codesV1(source)).toEqual(["determinism.capability.constructor_escape"]);
    });

    it.each([
      ["((Math.floor || Date.now()) && Number.isSafeInteger)(1)", []],
      [
        "((Date.parse || Date.now) && Math.floor)(1)",
        ["determinism.capability.indirect_intrinsic"],
      ],
      ["((fetch || Date.now()) && Math.floor)(1)", ["determinism.network"]],
    ])("preserves nested exact-callable short-circuit selection: %s", (source, expected) => {
      expect(codesV1(source)).toEqual(expected);
    });

    it("does not hide a discarded bound capture behind nested short-circuit selection", () => {
      const source = '((Date.now.constructor.bind(null, "return 1") || Date.now) && ' +
        'Function)("return 2")()';
      expect(codesV1(source)).toEqual([
        "determinism.capability.dynamic_code",
        "determinism.capability.constructor_escape",
      ]);
    });

    it.each([
      ["Date.now.constructor.bind(null).bind(null)", "Date.now.constructor.bind(null).bind"],
      ["Function.bind(null).bind(null)", "Function.bind(null).bind"],
      [
        "Date.now.constructor.bind(null).bind(null).foo()",
        "Date.now.constructor.bind(null).bind",
      ],
    ])("uses the outer capture winner for a nested bind chain: %s", (
      source,
      expectedSlice,
    ) => {
      expect(diagnosticSlicesV1(source)).toEqual([{
        code: "determinism.capability.constructor_escape",
        source: expectedSlice,
      }]);
    });

    it.each([
      ["Date.now(date)", "determinism.clock.date_now", "Date.now"],
      ["Date(date)", "determinism.clock.date_function_call", "Date"],
      [
        "Date.now.constructor.bind(null, date)()",
        "determinism.capability.dynamic_code",
        "Date.now.constructor.bind(null, date)",
      ],
      [
        "Function.bind(null, date)()",
        "determinism.capability.dynamic_code",
        "Function.bind(null, date)",
      ],
    ])("retains a KnownDate input beside the outer callable winner: %s", (
      expression,
      outerCode,
      outerSlice,
    ) => {
      const source = `const date = new Date(0); ${expression}`;
      expect(diagnosticSlicesV1(source)).toEqual([
        { code: outerCode, source: outerSlice },
        { code: "determinism.date_instance_unverified", source: "date" },
      ]);
    });

    it.each([
      "Date.parse.call(null, date)",
      'Date.parse.call(date, "2026-08-01T00:00:00Z")',
      "Date.parse.bind(null, date)",
      "Date.UTC.call(null, date, 0, 1, 0, 0, 0, 0)",
      "Date.UTC.bind(date, 2024, 0, 1, 0, 0, 0, 0)",
      "new (Date.prototype.constructor)(date)",
    ])("retains KnownDate inputs on an indirect Date route: %s", (expression) => {
      const source = `const date = new Date(0); ${expression}`;
      expect(codesV1(source)).toEqual([
        "determinism.capability.indirect_intrinsic",
        "determinism.date_instance_unverified",
      ]);
    });

    it("retains a KnownDate input on an aliased Date route", () => {
      const source = "const date = new Date(0); const parse = Date.parse; parse(date)";
      expect(codesV1(source)).toEqual([
        "determinism.capability.indirect_intrinsic",
        "determinism.capability.indirect_intrinsic",
        "determinism.date_instance_unverified",
      ]);
    });

    it("retains a KnownDate input on an indirect Date constructor", () => {
      const source = "const date = new Date(0); const D = Date; new D(date)";
      expect(codesV1(source)).toEqual([
        "determinism.ambient_capability_escape",
        "determinism.capability.indirect_intrinsic",
        "determinism.date_instance_unverified",
      ]);
    });

    it.each([
      ["Date.parse(...date)", "determinism.date_input_unverified"],
      ["Date.UTC(...date)", "determinism.date_utc_unverified"],
      ["new Date(...date)", "determinism.date_input_unverified"],
    ])("retains the KnownDate iterator operand beside a direct Date spread failure: %s", (
      expression,
      outerCode,
    ) => {
      const source = `const date = new Date(0); ${expression}`;
      expect(codesV1(source)).toEqual([
        outerCode,
        "determinism.date_instance_unverified",
      ]);
    });

    it.each([
      ["Function.bind(null).prototype()", "Function.bind"],
      [
        'Date.now.constructor.bind(null, "return 1").foo()',
        "Date.now.constructor.bind",
      ],
      [
        'new (Date.now.constructor.bind(null, "return 1").prototype)()',
        "Date.now.constructor.bind",
      ],
      [
        'Date.now.constructor.bind(null, "return 1").prototype`fixed`',
        "Date.now.constructor.bind",
      ],
    ])("retains a bound-constructor capture under an unproved descendant: %s", (
      source,
      captureSlice,
    ) => {
      expect(diagnosticSlicesV1(source)).toEqual([{
        code: "determinism.capability.constructor_escape",
        source: captureSlice,
      }]);
    });

    it.each([
      '(Date.now.constructor.bind(null, "return 1") || Date.now).foo()',
      '(Date.now.constructor.bind(null, "return 1") ?? Date.now).prototype',
      'new ((Date.now.constructor.bind(null, "return 1") || Date.now).prototype)()',
      '(Date.now.constructor.bind(null, "return 1") || Date.now).prototype`fixed`',
    ])("retains a selected bound capture under an unproved logical descendant: %s", (source) => {
      expect(diagnosticSlicesV1(source)).toEqual([{
        code: "determinism.capability.constructor_escape",
        source: "Date.now.constructor.bind",
      }]);
    });

    it("uses one winner for an immediately invoked assignment-result constructor", () => {
      const source = '(target = Date.now.constructor.bind(null, "return 1"))()';
      expect(codesV1(source)).toEqual(["determinism.capability.dynamic_code"]);
    });

    it.each([
      '(target = Date.now.constructor.bind(null, "return 1")).foo()',
      'new ((target = Date.now.constructor.bind(null, "return 1")).prototype)()',
    ])("retains an assignment-result capture under an unproved descendant: %s", (source) => {
      expect(diagnosticSlicesV1(source)).toEqual([{
        code: "determinism.capability.constructor_escape",
        source: "Date.now.constructor.bind",
      }]);
    });

    it.each([
      'Number.isSafeInteger.constructor("return 1")()',
      'Temporal.Instant.from.constructor("return 1")()',
      'performance.now.constructor("return 1")()',
      'fetch.constructor("return 1")()',
      'Date.constructor("return 1")()',
      'Function.prototype.constructor("return 1")()',
      'new Number.isSafeInteger.constructor("return 1")',
      "Temporal.Instant.from.constructor`return 1`",
    ])("classifies a statically proven callable constructor as dynamic code: %s", (source) => {
      expect(codesV1(source)).toEqual(["determinism.capability.dynamic_code"]);
    });

    it.each([
      '(Date.now as any).constructor("return 1")()',
      'Date.now!.constructor("return 1")()',
      '(Math.floor satisfies Function).constructor("return 1")()',
      '(Date.now).constructor("return 1")()',
      '(Function)("return 1")()',
    ])("preserves risk-only callable identity through a runtime-transparent wrapper: %s", (
      source,
    ) => {
      expect(codesV1(source)).toEqual(["determinism.capability.dynamic_code"]);
    });

    it.each([
      "Function.bind<string>(null)()",
      "Date.now.constructor.bind<string>(null)()",
      "Math.floor.constructor.bind<string>(null)()",
      "(Function.bind<string>(null) || Date.now)()",
    ])("preserves bound-constructor risk through runtime-erased type arguments: %s", (source) => {
      expect(codesV1(source)).toEqual(["determinism.capability.dynamic_code"]);
    });

    it.each([
      'Math.floor.bind(null).constructor("return 1")()',
      'fetch.bind(null).constructor("return 1")()',
      'Date.parse.bind(null).constructor("return 1")()',
    ])("preserves exact callable identity through a normal bind result: %s", (source) => {
      expect(codesV1(source)).toContain("determinism.capability.dynamic_code");
    });

    it.each([
      'const callable = Math.floor; callable.constructor("return 1")()',
      'const prototype = Function.prototype; prototype.constructor("return 1")()',
    ])("preserves exact callable identity through an immutable local alias: %s", (source) => {
      expect(codesV1(source)).toEqual(["determinism.capability.dynamic_code"]);
    });

    it("classifies an exact loader callable constructor as dynamic code", () => {
      expect(codesV1('require.constructor("return 1")()')).toEqual([
        "determinism.capability.dynamic_code",
      ]);
    });

    it.each([
      'import { createRequire } from "node:module"; ' +
      'createRequire.constructor("return 1")()',
      'import * as nodeModule from "node:module"; ' +
      'nodeModule.createRequire.constructor("return 1")()',
      'import { createRequire } from "node:module"; ' +
      "const loader = createRequire(import.meta.url); " +
      'loader.constructor("return 1")()',
    ])("classifies an exact createRequire callable constructor as dynamic code: %s", (source) => {
      expect(codesV1(source)).toContain("determinism.capability.dynamic_code");
    });

    it("does not reclassify a createRequire Function-constructor result as a loader", () => {
      const source = 'import { createRequire } from "node:module"; ' +
        'createRequire.constructor("return 1")()';
      expect(
        diagnosticSlicesV1(source).filter(({ code }) =>
          code === "determinism.capability.dynamic_require"
        ),
      ).toEqual([{ code: "determinism.capability.dynamic_require", source: "createRequire" }]);
    });

    it.each([
      'require.cache.constructor("return 1")()',
      'require.main.constructor("return 1")()',
      'module.require.cache.constructor("return 1")()',
    ])("does not treat an arbitrary loader descendant as an exact callable: %s", (source) => {
      const codes = codesV1(source);
      expect(codes).toContain("determinism.capability.dynamic_require");
      expect(codes).not.toContain("determinism.capability.dynamic_code");
    });

    it("does not short-circuit an arbitrary loader descendant as a callable", () => {
      const codes = codesV1("(require.missing || Date.now)()");
      expect(codes).toContain("determinism.capability.dynamic_require");
      expect(codes).toContain("determinism.clock.date_now");
      expect(codes).not.toContain("determinism.capability.dynamic_code");
    });

    it.each([
      ["(flag ? require.missing : Date.now)()", "determinism.clock.date_now"],
      ["(flag ? other : Date.now)()", "determinism.clock.date_now"],
      ["(flag ? require.missing : Math.random)()", "determinism.ambient_random"],
    ])("retains a potentially evaluated conditional-callee branch: %s", (source, branchCode) => {
      const codes = codesV1(source);
      expect(codes).toContain(branchCode);
      expect(codes).not.toContain("determinism.capability.dynamic_code");
    });

    it("does not infer the global Function constructor from a local function object", () => {
      expect(codesV1('(function local() {}).constructor("return 1")()'))
        .toEqual(["determinism.capability.constructor_escape"]);
    });

    it.each([
      'const callable = flag ? Math.floor : other; callable.constructor("return 1")()',
      'let callable = Math.floor; callable = other; callable.constructor("return 1")()',
      'const callable = flag ? Number.isSafeInteger : other; callable.constructor("return 1")()',
      'const callable = flag ? Function.prototype : other; callable.constructor("return 1")()',
    ])("does not recover a Function constructor from joined callable risk: %s", (source) => {
      expect(codesV1(source)).toEqual(["determinism.capability.constructor_escape"]);
    });

    it("does not recover a conditionally selected bound constructor", () => {
      const source = 'const callable = flag ? Date.now.constructor.bind(null, "return 1") : ' +
        "other; callable()";
      expect(codesV1(source)).toEqual(["determinism.capability.constructor_escape"]);
    });

    it.each([
      ["const { parse } = Date", "determinism.capability.indirect_intrinsic"],
      ["const { UTC } = Date", "determinism.capability.indirect_intrinsic"],
      ["const { now } = Date", "determinism.clock.date_now"],
    ])("classifies a destructured Date callable at capture: %s", (source, expected) => {
      expect(codesV1(source)).toEqual([expected]);
    });

    it.each([
      'Math.PI.constructor("return 1")()',
      'Number.MAX_VALUE.constructor("return 1")()',
      'String.length.constructor("return 1")()',
      'performance.timeOrigin.constructor("return 1")()',
    ])("does not claim dynamic code for a primitive owner's constructor: %s", (source) => {
      const codes = codesV1(source);
      expect(codes).toContain("determinism.capability.constructor_escape");
      expect(codes).not.toContain("determinism.capability.dynamic_code");
    });

    it.each([
      "new Date(0)",
      "new Date(8640000000000000)",
      "new Date(-8640000000000000)",
      "const epoch = 0; const alias = epoch; new Date(alias)",
      "const date = new Date(0); const alias = date; alias.getTime()",
      "Date.UTC(2024, 1, 29, 23, 59, 59, 999)",
      "const epoch = Date.UTC(2024, 1, 29, 23, 59, 59, 999); new Date(epoch)",
      'Date.parse("2026-08-01T00:00:00Z")',
      'Date.parse("2026-08-01T00:00:00.1Z")',
      'Date.parse("2026-08-01T00:00:00.12+08:00")',
      'new Date("2026-08-01T00:00:00.123-08:30")',
      "new Date(`2026-08-01T00:00:00Z`)",
      'Date.parse(String("2026-08-01T00:00:00Z"))',
      'const instant = String("2026-08-01T00:00:00Z"); Date.parse(instant)',
      "new Date(String.raw`2026-08-01T00:00:00Z`)",
    ])("admits only an exact direct Date producer: %s", (source) => {
      expect(analyzeV1(source)).toEqual([]);
    });

    it.each([
      ["new Date<number>(0)", "determinism.capability.indirect_intrinsic"],
      [
        "Date.UTC<number>(2024, 1, 29, 0, 0, 0, 0)",
        "determinism.capability.indirect_intrinsic",
      ],
      [
        'Date.parse<string>("2026-08-01T00:00:00Z")',
        "determinism.capability.indirect_intrinsic",
      ],
      [
        'Date.parse(String<string>("2026-08-01T00:00:00Z"))',
        "determinism.date_input_unverified",
      ],
      [
        "Date.parse(String.raw<string>`2026-08-01T00:00:00Z`)",
        "determinism.date_input_unverified",
      ],
    ])("does not grant proof through runtime-node generic arguments: %s", (
      source,
      expectedCode,
    ) => {
      expect(codesV1(source)).toEqual([expectedCode]);
    });

    it.each([
      "const date = new Date(0); date.getTime<number>()",
      "const date = new Date(0); date.toISOString<string>()",
      "const date = new Date(0); date.getUTCFullYear<number>()",
    ])("does not treat call-level generics as a direct KnownDate terminal: %s", (source) => {
      expect(codesV1(source)).toEqual(["determinism.date_instance_unverified"]);
    });

    it.each([
      ["Date.UTC(2024, 1, 29)", "determinism.date_utc_unverified"],
      ["Date.UTC(99, 0, 1, 0, 0, 0, 0)", "determinism.date_utc_unverified"],
      ["Date.UTC(2024, 12, 1, 0, 0, 0, 0)", "determinism.date_utc_unverified"],
      ["Date.UTC(2023, 1, 29, 0, 0, 0, 0)", "determinism.date_utc_unverified"],
      ["Date.UTC(2024, 0, 1, 24, 0, 0, 0)", "determinism.date_utc_unverified"],
      ["Date.UTC(2024, 0, 1, 0, 0, 0, 1000)", "determinism.date_utc_unverified"],
      ["Date.UTC(...recordedArgs)", "determinism.date_utc_unverified"],
      ["Date.UTC(2024, Number(1), 1, 0, 0, 0, 0)", "determinism.date_utc_unverified"],
      ['new Date("2026-02-29T00:00:00Z")', "determinism.date_input_unverified"],
      ['Date.parse("2026-08-01T24:00:00Z")', "determinism.date_input_unverified"],
      ['Date.parse(" 2026-08-01T00:00:00Z")', "determinism.date_input_unverified"],
      ['Date.parse("2026-08-01T00:00:00.1234Z")', "determinism.date_input_unverified"],
      ['Date.parse("2026-08-01T00:00:60Z")', "determinism.date_input_unverified"],
      ["new Date(Number(recordedText))", "determinism.date_input_unverified"],
      ["new Date((0))", "determinism.date_input_unverified"],
      ["new Date(+(0))", "determinism.date_input_unverified"],
      ["new Date(-(0))", "determinism.date_input_unverified"],
      ["new (Date)(0)", "determinism.capability.indirect_intrinsic"],
      ["new Date(recordedInstant)", "determinism.date_input_unverified"],
      ["const first = new Date(0); new Date(first)", "determinism.date_input_unverified"],
      ["new Date(new Date(0).getTime())", "determinism.date_input_unverified"],
      ["new Date(2024, 1, 29)", "determinism.date_input_unverified"],
      [
        'const parse = Date.parse; parse("2026-08-01T00:00:00Z")',
        "determinism.capability.indirect_intrinsic",
      ],
      [
        'Date.parse.call(null, "2026-08-01T00:00:00Z")',
        "determinism.capability.indirect_intrinsic",
      ],
      [
        'Date.parse.apply(null, ["2026-08-01T00:00:00Z"])',
        "determinism.capability.indirect_intrinsic",
      ],
      [
        'Date.parse.bind(null, "2026-08-01T00:00:00Z")',
        "determinism.capability.indirect_intrinsic",
      ],
      ["Date.parse`2026-08-01T00:00:00Z`", "determinism.capability.indirect_intrinsic"],
      ['(Date.parse<string>)("2026-08-01T00:00:00Z")', "determinism.capability.indirect_intrinsic"],
      [
        'const stringify = String; Date.parse(stringify("2026-08-01T00:00:00Z"))',
        "determinism.date_input_unverified",
      ],
      [
        'Date.parse(String.call(null, "2026-08-01T00:00:00Z"))',
        "determinism.date_input_unverified",
      ],
      [
        'Date.parse(String?.("2026-08-01T00:00:00Z"))',
        "determinism.date_input_unverified",
      ],
      ['Date.parse(new String("2026-08-01T00:00:00Z"))', "determinism.date_input_unverified"],
      ['Date.parse(("2026-08-01T00:00:00Z"))', "determinism.date_input_unverified"],
      [
        "Date.parse((String.raw)`2026-08-01T00:00:00Z`)",
        "determinism.date_input_unverified",
      ],
      [
        'Date.parse(String.prototype.constructor("2026-08-01T00:00:00Z"))',
        "determinism.date_input_unverified",
      ],
      [
        'Date.parse(new String.prototype.constructor("2026-08-01T00:00:00Z"))',
        "determinism.date_input_unverified",
      ],
      ["Date.parse(`2026-08-01T00:00:0${second}Z`)", "determinism.date_input_unverified"],
      [
        "const raw = String.raw; Date.parse(raw`2026-08-01T00:00:00Z`)",
        "determinism.date_input_unverified",
      ],
      ["const epoch = flag ? 0 : 0; new Date(epoch)", "determinism.date_input_unverified"],
      ["let epoch = 0; new Date(epoch)", "determinism.date_input_unverified"],
      ["let epoch = 0; epoch = 0; new Date(epoch)", "determinism.date_input_unverified"],
      ["const box = { epoch: 0 }; new Date(box.epoch)", "determinism.date_input_unverified"],
      ["const getEpoch = () => 0; new Date(getEpoch())", "determinism.date_input_unverified"],
    ])("rejects non-direct or non-exact Date proof: %s", (source, expectedCode) => {
      expect(codesV1(source)).toContain(expectedCode);
    });

    it.each([
      "getTime",
      "valueOf",
      "toISOString",
      "getUTCDate",
      "getUTCDay",
      "getUTCFullYear",
      "getUTCHours",
      "getUTCMilliseconds",
      "getUTCMinutes",
      "getUTCMonth",
      "getUTCSeconds",
    ])("allows one direct terminal KnownDate method: %s", (method) => {
      expect(analyzeV1(`const date = new Date(0); date.${method}()`)).toEqual([]);
    });

    it("rejects an optional call of an otherwise terminal KnownDate method", () => {
      const source = "const date = new Date(0); date.getTime?.()";
      expect(diagnosticSlicesV1(source)).toEqual([{
        code: "determinism.date_instance_unverified",
        source: "date.getTime",
      }]);
      const optionalReceiver = "const date = new Date(0); date?.getTime()";
      expect(diagnosticSlicesV1(optionalReceiver)).toEqual([{
        code: "determinism.capability.dynamic_member",
        source: "date?.getTime",
      }]);
    });

    it.each([
      "const date = new Date(0); date()",
      "const date = new Date(0); new date()",
      "const date = new Date(0); date?.()",
      "const date = new Date(0); date`fixed`",
    ])("rejects a KnownDate used as a callable value: %s", (source) => {
      expect(codesV1(source)).toEqual(["determinism.date_instance_unverified"]);
    });

    it.each([
      ["const date = new Date(0); date.toJSON()", "determinism.date_instance_unverified"],
      ["const date = new Date(0); date.setTime(1)", "determinism.date_instance_mutation"],
      ["const date = new Date(0); date.setUTCFullYear(2024)", "determinism.date_instance_mutation"],
      ["const date = new Date(0); date.getTime.call(date)", "determinism.date_instance_unverified"],
      [
        "const date = new Date(0); const read = date.getTime",
        "determinism.date_instance_unverified",
      ],
      ["const date = new Date(0); date[method]()", "determinism.capability.dynamic_member"],
      ["const date = new Date(0); take(date)", "determinism.date_instance_unverified"],
      ["const date = new Date(0); const box = { date }", "determinism.date_instance_unverified"],
      ["const date = new Date(0); const box = [date]", "determinism.date_instance_unverified"],
      ["String.apply(null, [, new Date(0)])", "determinism.date_instance_unverified"],
      ["String.raw.apply(null, [, new Date(0)])", "determinism.date_instance_unverified"],
      [
        "function expose() { const date = new Date(0); return date; }",
        "determinism.date_instance_unverified",
      ],
      [
        "const expose = () => new Date(0)",
        "determinism.date_instance_unverified",
      ],
      [
        "function* expose() { const date = new Date(0); yield date; }",
        "determinism.date_instance_unverified",
      ],
      [
        "const date = new Date(0); export { date }",
        "determinism.date_instance_unverified",
      ],
      ["export default new Date(0)", "determinism.date_instance_unverified"],
      [
        "const date = new Date(0); export = date",
        "determinism.date_instance_unverified",
      ],
      ["let date = new Date(0)", "determinism.date_instance_unverified"],
      ["let date; date = new Date(0)", "determinism.date_instance_unverified"],
      [
        "const date = new Date(0); function expose(value = date) { take(value); } expose();",
        "determinism.date_instance_unverified",
      ],
      [
        "const date = new Date(0); function expose({ value = date } = {}) { take(value); } expose();",
        "determinism.date_instance_unverified",
      ],
      [
        "const date = new Date(0); @date class Model {}",
        "determinism.date_instance_unverified",
      ],
      [
        "const date = new Date(0); class Model extends date {}",
        "determinism.date_instance_unverified",
      ],
      [
        "const date = new Date(0); value instanceof date",
        "determinism.date_instance_unverified",
      ],
      [
        "const date = new Date(0); for (const value of date) consume(value)",
        "determinism.date_instance_unverified",
      ],
      [
        "const date = new Date(0); async function consume() { for await (const value of date) {} }",
        "determinism.date_instance_unverified",
      ],
      [
        "const date = new Date(0); const { value = date } = {}",
        "determinism.date_instance_unverified",
      ],
      [
        "const date = new Date(0); const [value = date] = []",
        "determinism.date_instance_unverified",
      ],
      [
        "const date = new Date(0); let value; ({ value = date } = {})",
        "determinism.date_instance_unverified",
      ],
      [
        "const date = new Date(0); enum Value { Initial = date as any }",
        "determinism.date_instance_unverified",
      ],
      [
        "const date = new Date(0); try { throw {} } " +
        "catch ({ value = date }) { value.toJSON() }",
        "determinism.date_instance_unverified",
      ],
      [
        "const date = flag ? new Date(0) : new Date(1); date.getUTCHours()",
        "determinism.date_instance_unverified",
      ],
      ["const date = new Date(0); date.value = 1", "determinism.date_instance_mutation"],
      ["Date.UTC = localUtc", "determinism.capability.intrinsic_mutation"],
      ["Date.prototype.getTime = localGetTime", "determinism.capability.intrinsic_mutation"],
    ])("enforces the KnownDate terminal and mutation policy: %s", (source, expectedCode) => {
      expect(codesV1(source)).toContain(expectedCode);
    });

    it.each([
      'const date = new Date(0); String("fixed", date)',
      'const date = new Date(0); String.call(null, "fixed", date)',
      'const date = new Date(0); String.raw({ raw: [""] }, date)',
      'const date = new Date(0); String.raw({ raw: [""] }, 1, date)',
      'const date = new Date(0); String.call(date, "fixed")',
      'const date = new Date(0); String.apply(date, ["fixed"])',
      'const date = new Date(0); String.raw.call(date, { raw: [""] })',
      'const date = new Date(0); String.raw.apply(date, [{ raw: [""] }])',
      "const date = new Date(0); String`${date}`",
    ])("rejects a KnownDate passed through a non-coercing String slot: %s", (source) => {
      const codes = codesV1(source);
      expect(codes).toContain("determinism.date_instance_unverified");
      expect(codes).not.toContain("determinism.host_timezone");
    });

    it("rejects a KnownDate passed through a JSX property", () => {
      const diagnostics = analyzeDeterminismSourceV1({
        file: "example/src/view.tsx",
        source: "const date = new Date(0); const view = <Comp value={date} />",
      });
      expect(diagnostics.map(({ code }) => code)).toContain(
        "determinism.date_instance_unverified",
      );
    });

    it.each([
      "Date = local",
      "Math = local",
      "Number = local",
      "String = local",
      "Temporal = local",
      "Function = local",
      "Math.random = local",
      "Number.parseFloat = local",
      "String.raw = local",
      "Temporal.Now = local",
      "Number.prototype.valueOf = local",
      "String.prototype.valueOf = local",
    ])("classifies intrinsic root and member mutation: %s", (source) => {
      expect(codesV1(source)).toEqual(["determinism.capability.intrinsic_mutation"]);
    });

    it.each([
      "let Date = { UTC: local }; Date.UTC = local",
      "let Math = { random: local }; Math.random = local",
      "let Number = { parseFloat: local }; Number.parseFloat = local",
      "let String = { raw: local }; String.raw = local",
      "let Temporal = { Now: local }; Temporal.Now = local",
      "let Function = local; Function = local",
    ])("keeps lexical-shadow mutation ordinary: %s", (source) => {
      expect(codesV1(source)).toEqual([]);
    });

    it.each([
      "+new Date(0)",
      "-new Date(0)",
      "~new Date(0)",
      "new Date(0) < 1",
      "new Date(0) - 1",
      "new Date(0) * 1",
      "new Date(0) | 0",
      "new Date(0) ** 2",
    ])("rejects numeric Date coercion without a second numeric diagnostic: %s", (source) => {
      expect(codesV1(source)).toEqual(["determinism.date_instance_unverified"]);
    });

    it.each([
      "Date[key]()",
      "Math[key]()",
      "Number[key]",
      "String[key]",
      "Temporal[key]",
      "Deno[key]",
      "const date = new Date(0); date[key]()",
    ])("uses one specific dynamic-member diagnostic: %s", (source) => {
      expect(codesV1(source)).toEqual(["determinism.capability.dynamic_member"]);
    });

    it("reports an exact alias cycle instead of publishing a partial proof", () => {
      expect(codesV1("const left = right; const right = left; new Date(left)"))
        .toContain("determinism.provenance.cycle");
    });

    it("resolves a deep alias cycle without recursive stack growth", () => {
      const size = 1_024;
      let source = "";
      for (let index = 0; index < size; index += 1) {
        source += `const value${index} = value${(index + 1) % size};\n`;
      }
      source += "new Date(value0);";
      expect(codesV1(source)).toEqual(["determinism.provenance.cycle"]);
    });

    it("memoizes exact-proof traversal across a stable alias graph", () => {
      const size = 256;
      let source = "";
      for (let index = 0; index < size; index += 1) {
        source += `const value${index} = value${(index + 1) % size};\n`;
      }
      source += "new Date(value0);";
      let aliasSteps = 0;
      const diagnostics = analyzeDeterminismSourceV1({
        file: fileV1,
        source,
        exactProofAliasStepObserverForTests: () => {
          aliasSteps += 1;
        },
      });
      expect(diagnostics.map(({ code }) => code)).toEqual(["determinism.provenance.cycle"]);
      expect(aliasSteps).toBeLessThanOrEqual(size * 8);
    });

    it("invalidates dependent proofs when an alias state changes", () => {
      const source = "const first = second; const second = third; const third = 0; new Date(first)";
      expect(diagnosticSlicesV1(source)).toEqual([{
        code: "determinism.date_input_unverified",
        source: "Date",
      }]);
    });

    it("does not invalidate an alias cache for unrelated exact declarations", () => {
      const size = 256;
      let source = "";
      for (let index = 0; index < size; index += 1) {
        source += `const value${index} = value${index + 1};\n`;
      }
      source += `const value${size} = 0;\n`;
      for (let index = 0; index < size; index += 1) {
        source += `new Date(value0); const unrelated${index} = ${index};\n`;
      }
      let aliasSteps = 0;
      const diagnostics = analyzeDeterminismSourceV1({
        file: fileV1,
        source,
        exactProofAliasStepObserverForTests: () => {
          aliasSteps += 1;
        },
      });
      expect(diagnostics).toHaveLength(size);
      expect(diagnostics.every(({ code }) => code === "determinism.date_input_unverified"))
        .toBe(true);
      expect(aliasSteps).toBeLessThanOrEqual(size * 16);
    });

    it("makes injected provenance budget exhaustion atomic", () => {
      const source = "function read() { return Date.now(); } read();";
      const diagnostics = analyzeDeterminismSourceV1({
        file: fileV1,
        source,
        provenancePassBudgetForTests: 0,
      });
      expect(diagnostics.map(({ code }) => code)).toEqual([
        "determinism.provenance.budget_exhausted",
      ]);
    });

    it("keeps distinct capture and later joined-call ranges", () => {
      const source = 'let parse = Date.parse; parse("2026-08-01T00:00:00Z"); ' +
        "function mutate() { parse = localParse; }";
      expect(diagnosticSlicesV1(source)).toEqual([
        {
          code: "determinism.capability.indirect_intrinsic",
          source: "Date.parse",
        },
        {
          code: "determinism.ambient_capability_escape",
          source: "parse",
        },
      ]);
    });
  });

  it("preserves actual Date constructor member identity before later admission rules", () => {
    const codes = codesV1('Date.prototype.constructor.parse("2026-08-01T00:00:00Z")');
    expect(codes).not.toContain("determinism.ambient_clock");
    expect(codes).not.toContain("determinism.ambient_capability_escape");
    expect(codesV1("Date.prototype.constructor.now.call(null)"))
      .toEqual(["determinism.clock.date_now"]);
    expect(codesV1("Date.prototype.constructor.parse.constructor"))
      .toEqual(["determinism.capability.constructor_escape"]);
  });

  it("distinguishes String.raw from arbitrary tagged-template value passing", () => {
    expect(codesV1("const raw = String.raw; raw`${new Date(0)}`"))
      .toEqual(["determinism.host_timezone"]);
    expect(codesV1(
      "const tag = (_strings: TemplateStringsArray, ...values: unknown[]) => values[0]; " +
        "tag`${new Date(0)}`",
    )).toEqual(["determinism.date_instance_unverified"]);
    expect(codesV1(
      "const String = { raw: (_strings: TemplateStringsArray, ...values: unknown[]) => " +
        "values[0] }; String.raw`${new Date(0)}`",
    )).toEqual(["determinism.date_instance_unverified"]);
  });

  it("classifies ambiguous Date descendants without claiming exact Host rendering", () => {
    const codes = codesV1(
      "const date = flag ? new Date(0) : projection; String((date as any).payload)",
    );
    expect(codes).toContain("determinism.date_instance_unverified");
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
      expect(descendantCodes).toContain("determinism.date_instance_unverified");
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
      expect(codes).toContain("determinism.date_instance_unverified");
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
    expect(codesV1("new Date(0) == Date.UTC"))
      .toEqual(["determinism.capability.indirect_intrinsic"]);
    expect(codesV1("new Date(0) == Date.parse"))
      .toEqual(["determinism.capability.indirect_intrinsic"]);
    expect(codesV1("new Date(0) == void Date.now()"))
      .toEqual(["determinism.clock.date_now"]);
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
    expect(codes).toEqual(["determinism.clock.date_now"]);
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
    )).toEqual([
      "determinism.capability.indirect_intrinsic",
      "determinism.ambient_capability_escape",
    ]);
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
    expect(codesV1(source)).toContain("determinism.capability.dynamic_member");
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
    const expectedCode = source.startsWith("const date")
      ? "determinism.date_instance_mutation"
      : "determinism.ambient_capability_escape";
    expect(codesV1(source)).toContain(expectedCode);
  });

  it.each([
    "const Deno = { env: null }; Deno.env = local",
    "let require = { call: null }; require.call = local",
    "const epoch = Date.UTC(2026, 7, 1, 0, 0, 0, 0); (epoch as any).value = local",
    'const instant = "2026-08-01T00:00:00Z"; (instant as any).value = local',
  ])("allows the same writes through lexical shadows: %s", (source) => {
    expect(codesV1(source)).toEqual([]);
  });

  it("preserves callable identity through TypeScript instantiation wrappers", () => {
    expect(codesV1("(Date.parse<string>)(recordedInstant)"))
      .toEqual(["determinism.capability.indirect_intrinsic"]);
    expect(codesV1("(String<string>)(new Date(0))"))
      .toEqual(["determinism.host_timezone"]);
    expect(codesV1("(Date.parse<string>).call(null, recordedInstant)"))
      .toEqual(["determinism.capability.indirect_intrinsic"]);
    expect(codesV1('(Date.parse<string>)("2026-08-01T00:00:00Z")'))
      .toEqual(["determinism.capability.indirect_intrinsic"]);
    expect(codesV1("(String<string>)(0)")).toEqual([]);
  });

  it.each([
    ["import DateAlias = Date;", "determinism.ambient_capability_escape", "Date"],
    ["import Call = Date.call;", "determinism.ambient_capability_escape", "Date.call"],
    ["import Clock = performance;", "determinism.performance_clock", "performance"],
    ["import Crypto = crypto;", "determinism.crypto_random", "crypto"],
    ["import Locale = navigator;", "determinism.locale", "navigator"],
    [
      "import Root = globalThis.performance;",
      "determinism.ambient_capability_escape",
      "globalThis.performance",
    ],
    [
      "import Root = globalThis.crypto;",
      "determinism.ambient_capability_escape",
      "globalThis.crypto",
    ],
    [
      "import Root = globalThis.navigator;",
      "determinism.ambient_capability_escape",
      "globalThis.navigator",
    ],
    [
      "import Root = globalThis.foo;",
      "determinism.ambient_capability_escape",
      "globalThis.foo",
    ],
    [
      "import Root = globalThis.foo.bar;",
      "determinism.ambient_capability_escape",
      "globalThis.foo.bar",
    ],
    ["import Now = Date.now;", "determinism.clock.date_now", "Date.now"],
    [
      "import Parse = Date.parse;",
      "determinism.capability.indirect_intrinsic",
      "Date.parse",
    ],
    ["import Utc = Date.UTC;", "determinism.capability.indirect_intrinsic", "Date.UTC"],
    [
      "import Constructor = Date.prototype.constructor;",
      "determinism.capability.indirect_intrinsic",
      "Date.prototype.constructor",
    ],
    [
      "import Call = Date.prototype.constructor.call;",
      "determinism.ambient_capability_escape",
      "Date.prototype.constructor.call",
    ],
    [
      "import Constructor = Date.parse.constructor;",
      "determinism.capability.constructor_escape",
      "Date.parse.constructor",
    ],
    [
      "import Constructor = Unknown.constructor;",
      "determinism.capability.constructor_escape",
      "Unknown.constructor",
    ],
    [
      "import Constructor = Unknown.member.constructor;",
      "determinism.capability.constructor_escape",
      "Unknown.member.constructor",
    ],
    [
      "import Constructor = globalThis.constructor;",
      "determinism.capability.constructor_escape",
      "globalThis.constructor",
    ],
    [
      "import Constructor = Object.constructor;",
      "determinism.capability.constructor_escape",
      "Object.constructor",
    ],
    [
      "import Constructor = JSON.stringify.constructor;",
      "determinism.capability.constructor_escape",
      "JSON.stringify.constructor",
    ],
    [
      "import Constructor = Math.constructor;",
      "determinism.capability.constructor_escape",
      "Math.constructor",
    ],
    [
      "import Constructor = Date.foo.constructor;",
      "determinism.capability.constructor_escape",
      "Date.foo.constructor",
    ],
    [
      "import Constructor = Date.instance.constructor;",
      "determinism.capability.constructor_escape",
      "Date.instance.constructor",
    ],
    [
      "import Now = Date.instance.constructor.now;",
      "determinism.capability.constructor_escape",
      "Date.instance.constructor.now",
    ],
    [
      "import Constructor = String.foo.constructor;",
      "determinism.capability.constructor_escape",
      "String.foo.constructor",
    ],
    [
      "import Call = Date.constructor.call;",
      "determinism.ambient_capability_escape",
      "Date.constructor.call",
    ],
    [
      "import Apply = Date.now.constructor.apply;",
      "determinism.ambient_capability_escape",
      "Date.now.constructor.apply",
    ],
    [
      "import Call = Date.parse.constructor.call;",
      "determinism.ambient_capability_escape",
      "Date.parse.constructor.call",
    ],
    [
      "import Call = Number.constructor.call;",
      "determinism.ambient_capability_escape",
      "Number.constructor.call",
    ],
    [
      "import Apply = String.constructor.apply;",
      "determinism.ambient_capability_escape",
      "String.constructor.apply",
    ],
    [
      "import Call = Math.max.constructor.call;",
      "determinism.ambient_capability_escape",
      "Math.max.constructor.call",
    ],
    [
      "import GetTime = Date.prototype.getTime;",
      "determinism.date_instance_unverified",
      "Date.prototype.getTime",
    ],
    [
      "import GetHours = Date.prototype.getHours;",
      "determinism.date_instance_unverified",
      "Date.prototype.getHours",
    ],
    [
      "import ToIso = Date.prototype.toISOString;",
      "determinism.date_instance_unverified",
      "Date.prototype.toISOString",
    ],
    [
      "import SetTime = Date.prototype.setTime;",
      "determinism.date_instance_unverified",
      "Date.prototype.setTime",
    ],
  ])("classifies a runtime import-equals alias at its capture site: %s", (
    source,
    expectedCode,
    expectedSource,
  ) => {
    expect(
      analyzeV1(source).map(({ code, range }) => ({
        code,
        source: source.slice(...range),
      })),
    ).toEqual([{ code: expectedCode, source: expectedSource }]);
  });

  it("keeps a runtime import-equals alias of Date.prototype as a risk-only value", () => {
    expect(analyzeV1("import Prototype = Date.prototype;")).toEqual([]);
  });

  it.each([
    [
      "const Value = globalThis.foo.bar;",
      "determinism.ambient_capability_escape",
      "globalThis.foo.bar",
    ],
    [
      "const Prototype = Date.prototype; const Constructor = Prototype.constructor;",
      "determinism.capability.constructor_escape",
      "Prototype.constructor",
    ],
    [
      "const Prototype = Date.prototype; const Now = Prototype.constructor.now;",
      "determinism.capability.constructor_escape",
      "Prototype.constructor.now",
    ],
    [
      "const Prototype = Date.prototype; import Constructor = Prototype.constructor;",
      "determinism.capability.constructor_escape",
      "Prototype.constructor",
    ],
    [
      "const Prototype = Date.prototype; import Now = Prototype.constructor.now;",
      "determinism.capability.constructor_escape",
      "Prototype.constructor.now",
    ],
  ])("preserves fail-closed capability risk through a static descendant: %s", (
    source,
    expectedCode,
    expectedSource,
  ) => {
    expect(
      analyzeV1(source).map(({ code, range }) => ({
        code,
        source: source.slice(...range),
      })),
    ).toEqual([{ code: expectedCode, source: expectedSource }]);
  });

  it.each([
    [
      'const Value = globalThis["foo"].bar;',
      "determinism.ambient_capability_escape",
      'globalThis["foo"].bar',
    ],
    [
      'const Value = globalThis.foo["bar"];',
      "determinism.ambient_capability_escape",
      'globalThis.foo["bar"]',
    ],
    [
      "const Value = globalThis?.foo.bar;",
      "determinism.ambient_capability_escape",
      "globalThis?.foo.bar",
    ],
    [
      "const Value = globalThis.foo?.bar;",
      "determinism.ambient_capability_escape",
      "globalThis.foo?.bar",
    ],
    [
      "globalThis.foo()",
      "determinism.ambient_capability_escape",
      "globalThis.foo",
    ],
    [
      "globalThis.foo?.()",
      "determinism.ambient_capability_escape",
      "globalThis.foo",
    ],
    [
      'globalThis["foo"]()',
      "determinism.ambient_capability_escape",
      'globalThis["foo"]',
    ],
    [
      "globalThis.foo.bar()",
      "determinism.ambient_capability_escape",
      "globalThis.foo.bar",
    ],
    [
      "globalThis.foo.bar.baz()",
      "determinism.ambient_capability_escape",
      "globalThis.foo.bar.baz",
    ],
    [
      "globalThis.foo.call(null)",
      "determinism.ambient_capability_escape",
      "globalThis.foo.call",
    ],
    [
      "new globalThis.foo()",
      "determinism.ambient_capability_escape",
      "globalThis.foo",
    ],
    [
      "new globalThis.foo.Bar()",
      "determinism.ambient_capability_escape",
      "globalThis.foo.Bar",
    ],
    [
      "globalThis.foo`fixed`",
      "determinism.ambient_capability_escape",
      "globalThis.foo",
    ],
    [
      "globalThis.foo.bar`fixed`",
      "determinism.ambient_capability_escape",
      "globalThis.foo.bar",
    ],
  ])("retains static globalThis descendant risk at the maximal use: %s", (
    source,
    expectedCode,
    expectedSource,
  ) => {
    expect(
      analyzeV1(source).map(({ code, range }) => ({
        code,
        source: source.slice(...range),
      })),
    ).toEqual([{ code: expectedCode, source: expectedSource }]);
  });

  it.each([
    ["const Value = globalThis.foo[key];", "globalThis.foo[key]"],
    ["const Value = globalThis[key].bar;", "globalThis[key]"],
    ["globalThis.foo[key]()", "globalThis.foo[key]"],
    ["new globalThis.foo[key]()", "globalThis.foo[key]"],
    ["globalThis.foo[key]`fixed`", "globalThis.foo[key]"],
  ])("keeps dynamic_member precedence for a globalThis descendant: %s", (
    source,
    expectedSource,
  ) => {
    expect(
      analyzeV1(source).map(({ code, range }) => ({
        code,
        source: source.slice(...range),
      })),
    ).toEqual([{
      code: "determinism.capability.dynamic_member",
      source: expectedSource,
    }]);
  });

  it.each([
    "globalThis.Math.trunc(1)",
    "globalThis.Number.isSafeInteger(1)",
    'globalThis.Number.parseInt("1", 10)',
    "globalThis.String.fromCharCode(65)",
    'globalThis.Temporal.Instant.from("2026-08-01T00:00:00Z")',
  ])("preserves a checked deterministic globalThis operation: %s", (source) => {
    expect(analyzeV1(source)).toEqual([]);
  });

  it.each([
    ["globalThis.Math.random()", "determinism.ambient_random"],
    ["globalThis.crypto.randomUUID()", "determinism.crypto_random"],
    ["globalThis.performance.now()", "determinism.performance_clock"],
    ["globalThis.fetch(url)", "determinism.network"],
    ["globalThis.navigator.language", "determinism.locale"],
    ["globalThis.Deno.cwd()", "determinism.environment"],
    [
      'globalThis.fetch.constructor("return 1")()',
      "determinism.capability.dynamic_code",
    ],
    [
      'globalThis.performance.now.constructor("return 1")()',
      "determinism.capability.dynamic_code",
    ],
    ['globalThis.require("./fixed.ts")', "determinism.capability.dynamic_require"],
  ])("preserves a specific globalThis operation winner: %s", (source, expectedCode) => {
    expect(codesV1(source)).toEqual([expectedCode]);
  });

  it.each([
    ["performance()", "determinism.performance_clock"],
    ["performance?.()", "determinism.performance_clock"],
    ["new performance()", "determinism.performance_clock"],
    ["crypto()", "determinism.crypto_random"],
    ["crypto?.()", "determinism.crypto_random"],
    ["new crypto()", "determinism.crypto_random"],
    ["navigator()", "determinism.locale"],
    ["navigator?.()", "determinism.locale"],
    ["new navigator()", "determinism.locale"],
  ])("keeps a bare Host root's specific call/new winner: %s", (source, expectedCode) => {
    expect(codesV1(source)).toEqual([expectedCode]);
  });

  it.each([
    ["crypto.subtle", "crypto.subtle"],
    ["navigator.userAgent", "navigator.userAgent"],
    ["fetch.prototype", "fetch.prototype"],
    ["WebSocket.prototype", "WebSocket.prototype"],
    ["XMLHttpRequest.prototype", "XMLHttpRequest.prototype"],
    ["parseFloat.foo", "parseFloat.foo"],
    ["crypto.subtle.digest()", "crypto.subtle.digest"],
    ["fetch.extension()", "fetch.extension"],
    ["globalThis.crypto.subtle", "globalThis.crypto.subtle"],
    ["globalThis.navigator.userAgent", "globalThis.navigator.userAgent"],
    ["globalThis.fetch.extension()", "globalThis.fetch.extension"],
    ["globalThis.JSON.stringify({})", "globalThis.JSON.stringify"],
    ["globalThis.Promise.resolve(1)", "globalThis.Promise.resolve"],
  ])("fails closed for an unclassified tracked ambient operation: %s", (
    source,
    expectedSource,
  ) => {
    expect(
      analyzeV1(source).map(({ code, range }) => ({
        code,
        source: source.slice(...range),
      })),
    ).toEqual([{
      code: "determinism.ambient_capability_escape",
      source: expectedSource,
    }]);
  });

  it.each([
    [
      "const { subtle } = crypto;",
      [
        ["determinism.ambient_capability_escape", "subtle"],
        ["determinism.crypto_random", "crypto"],
      ],
    ],
    [
      "import Subtle = crypto.subtle;",
      [["determinism.ambient_capability_escape", "crypto.subtle"]],
    ],
  ])("fails closed when an unclassified ambient descendant is captured: %s", (
    source,
    expected,
  ) => {
    expect(
      analyzeV1(source).map(({ code, range }) => ({
        code,
        source: source.slice(...range),
      })),
    ).toEqual(expected.map(([code, expectedSource]) => ({
      code,
      source: expectedSource,
    })));
  });

  it.each([
    ["const Value = (0, globalThis).foo;", "(0, globalThis).foo"],
    ["(0, globalThis).foo()", "(0, globalThis).foo"],
    ["(0, globalThis.foo).bar()", "(0, globalThis.foo).bar"],
  ])("retains globalThis risk through a last-value sequence: %s", (
    source,
    expectedSource,
  ) => {
    expect(
      analyzeV1(source).map(({ code, range }) => ({
        code,
        source: source.slice(...range),
      })),
    ).toEqual([{
      code: "determinism.ambient_capability_escape",
      source: expectedSource,
    }]);
  });

  it.each([
    [
      "const { foo } = globalThis; foo()",
      ["foo", "foo"],
    ],
    [
      "const { foo: alias } = globalThis; alias.bar()",
      ["foo: alias", "alias.bar"],
    ],
    [
      'const { ["foo"]: alias } = globalThis; alias.bar()',
      ['["foo"]: alias', "alias.bar"],
    ],
    [
      "const { foo = fallback } = globalThis; foo()",
      ["foo = fallback", "foo"],
    ],
    [
      "const { foo: { bar } } = globalThis; bar()",
      ["foo: { bar }", "bar", "bar"],
    ],
    [
      "let foo; ({ foo } = globalThis); foo()",
      ["foo", "foo"],
    ],
  ])("retains globalThis risk through a static object pattern: %s", (
    source,
    expectedSources,
  ) => {
    expect(
      analyzeV1(source).map(({ code, range }) => ({
        code,
        source: source.slice(...range),
      })),
    ).toEqual(expectedSources.map((expectedSource) => ({
      code: "determinism.ambient_capability_escape",
      source: expectedSource,
    })));
  });

  it("keeps dynamic_member precedence through a computed globalThis pattern", () => {
    const source = "const { [key]: alias } = globalThis; alias()";
    expect(
      analyzeV1(source).map(({ code, range }) => ({
        code,
        source: source.slice(...range),
      })),
    ).toEqual([
      { code: "determinism.capability.dynamic_member", source: "[key]: alias" },
      { code: "determinism.capability.dynamic_member", source: "alias" },
    ]);
  });

  it("rejects a globalThis rest pattern at its capture site", () => {
    const source = "const { ...rest } = globalThis; rest.foo()";
    expect(
      analyzeV1(source).map(({ code, range }) => ({
        code,
        source: source.slice(...range),
      })),
    ).toEqual([{
      code: "determinism.ambient_capability_escape",
      source: "...rest",
    }]);
  });

  it.each([
    [
      "globalThis.foo.bar = value",
      "determinism.ambient_capability_escape",
      "globalThis.foo.bar",
    ],
    [
      "globalThis.foo[key] = value",
      "determinism.capability.dynamic_member",
      "globalThis.foo[key]",
    ],
    [
      "globalThis[key] = value",
      "determinism.capability.dynamic_member",
      "globalThis[key]",
    ],
    [
      "globalThis.foo.bar++",
      "determinism.ambient_capability_escape",
      "globalThis.foo.bar",
    ],
    [
      "globalThis.foo[key]++",
      "determinism.capability.dynamic_member",
      "globalThis.foo[key]",
    ],
    [
      "delete globalThis.foo.bar",
      "determinism.ambient_capability_escape",
      "globalThis.foo.bar",
    ],
    [
      "delete globalThis.foo[key]",
      "determinism.capability.dynamic_member",
      "globalThis.foo[key]",
    ],
    [
      "for (globalThis.foo.bar of values) {}",
      "determinism.ambient_capability_escape",
      "globalThis.foo.bar",
    ],
    [
      "for (globalThis.foo[key] of values) {}",
      "determinism.capability.dynamic_member",
      "globalThis.foo[key]",
    ],
  ])("retains globalThis risk through a write target: %s", (
    source,
    expectedCode,
    expectedSource,
  ) => {
    expect(
      analyzeV1(source).map(({ code, range }) => ({
        code,
        source: source.slice(...range),
      })),
    ).toEqual([{ code: expectedCode, source: expectedSource }]);
  });

  it("retains an exact KnownDate constructor recovery in runtime import-equals", () => {
    const source = "const date = new Date(0); import Now = date.constructor.now;";
    expect(
      analyzeV1(source).map(({ code, range }) => ({
        code,
        source: source.slice(...range),
      })),
    ).toEqual([{ code: "determinism.clock.date_now", source: "date.constructor.now" }]);
  });

  it.each([
    "const performance = source; import Value = performance;",
    "const crypto = source; import Value = crypto;",
    "const navigator = source; import Value = navigator;",
    "const globalThis = source; import Value = globalThis.foo;",
  ])("keeps a lexical Host-root shadow ordinary in runtime import-equals: %s", (source) => {
    expect(analyzeV1(source)).toEqual([]);
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
      expect(codesV1(source)).toEqual([
        source.startsWith("for (performance")
          ? "determinism.ambient_capability_escape"
          : "determinism.capability.intrinsic_mutation",
      ]);
    }

    const reassignedParse = codesV1(
      'let parse = Date.parse; for (parse of values) {} const epoch = parse("2026-08-01T00:00:00Z"); new Date(epoch);',
    );
    expect(reassignedParse).toContain("determinism.ambient_capability_escape");
    expect(reassignedParse).toContain("determinism.date_input_unverified");
    expect(codesV1(
      "let date = new Date(0); for (date of values) {} date.getTime();",
    )).toContain("determinism.date_instance_unverified");
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
    )).toContain("determinism.date_instance_unverified");
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
      expect(codesV1(source)).toEqual(["determinism.capability.intrinsic_mutation"]);
    }
  });

  it("evaluates non-reference delete operands before discarding the value", () => {
    expect(codesV1("delete Date.now()"))
      .toEqual(["determinism.clock.date_now"]);
    expect(codesV1("delete Math.random()"))
      .toEqual(["determinism.ambient_random"]);
    expect(codesV1("delete (flag ? Date.now() : 0)"))
      .toEqual(["determinism.clock.date_now"]);
    expect(codesV1("delete Date.now"))
      .toEqual(["determinism.capability.intrinsic_mutation"]);
  });

  it("still diagnoses computed keys and defaults on for-in/of write patterns", () => {
    expect(codesV1("for ({ [Date.now()]: value } of values) {}"))
      .toEqual(["determinism.clock.date_now"]);
    expect(codesV1("for ({ value = Date.now() } of values) {}"))
      .toEqual(["determinism.clock.date_now"]);
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
