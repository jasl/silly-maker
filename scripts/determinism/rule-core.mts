// SPDX-License-Identifier: MIT
import { parse, type ParserPlugin } from "@babel/parser";

export interface DeterminismDiagnosticV1 {
  readonly code: string;
  readonly file: string;
  /** Half-open UTF-16 code-unit offsets. */
  readonly range: readonly [start: number, end: number];
  /** One-based source position. */
  readonly start: Readonly<{ line: number; column: number }>;
  /** One-based source position. */
  readonly end: Readonly<{ line: number; column: number }>;
  readonly message: string;
  readonly hint: string;
}

export interface AnalyzeDeterminismSourceOptionsV1 {
  readonly file: string;
  readonly source: string;
  readonly isFocusedTestReference?: (reference: string) => boolean;
}

interface AstNodeV1 {
  readonly type: string;
  readonly start?: number | null;
  readonly end?: number | null;
  readonly [key: string]: unknown;
}

interface BindingV1 {
  provenance: readonly string[] | null;
  bootstrap: "allowed" | "forbidden" | null;
}

interface ScopeV1 {
  readonly parent: ScopeV1 | null;
  readonly bindings: Map<string, BindingV1>;
  readonly bootstrapTypes: Map<string, boolean>;
  readonly functionScope: ScopeV1;
}

interface ResolvedExpressionV1 {
  readonly provenance: readonly string[] | null;
  readonly bootstrap: BindingV1 | null;
}

interface MutableDiagnosticV1 {
  readonly code: string;
  readonly start: number;
  readonly end: number;
}

interface SourceLineV1 {
  readonly number: number;
  readonly start: number;
  readonly text: string;
}

interface ExemptionV1 {
  readonly line: SourceLineV1;
  readonly code: string;
}

const numericExemptionCodesV1 = new Set([
  "determinism.numeric_fractional_literal",
  "determinism.numeric_parse_float",
  "determinism.numeric_approximate_math",
]);

const approximateMathMembersV1 = new Set([
  "E",
  "LN10",
  "LN2",
  "LOG10E",
  "LOG2E",
  "PI",
  "SQRT1_2",
  "SQRT2",
  "acos",
  "acosh",
  "asin",
  "asinh",
  "atan",
  "atan2",
  "atanh",
  "cbrt",
  "cos",
  "cosh",
  "exp",
  "expm1",
  "fround",
  "hypot",
  "log",
  "log10",
  "log1p",
  "log2",
  "pow",
  "sin",
  "sinh",
  "sqrt",
  "tan",
  "tanh",
]);

const ambientCapabilityRootsV1 = new Set([
  "Date",
  "Deno",
  "Math",
  "Number",
  "globalThis",
  "process",
]);

const diagnosticTextV1: Readonly<
  Record<string, Readonly<{ message: string; hint: string }>>
> = Object.freeze({
  "determinism.ambient_random": Object.freeze({
    message: "Authoritative code reads ambient randomness.",
    hint: "Use the injected bootstrap entropy capability or Snapshot-owned transactional RNG.",
  }),
  "determinism.crypto_random": Object.freeze({
    message: "Authoritative code reads ambient cryptographic randomness.",
    hint: "Move Host entropy sampling to bootstrap ingress and commit only canonical data.",
  }),
  "determinism.ambient_clock": Object.freeze({
    message: "Authoritative code reads the ambient clock.",
    hint: "Use a recorded instant or an authoritative integer tick supplied by input.",
  }),
  "determinism.performance_clock": Object.freeze({
    message: "Authoritative code reads the performance clock.",
    hint: "Keep wall-clock measurements outside the authoritative simulation closure.",
  }),
  "determinism.network": Object.freeze({
    message: "Authoritative code accesses an ambient network provider.",
    hint: "Resolve external data before authoritative ingress and commit canonical input.",
  }),
  "determinism.environment": Object.freeze({
    message: "Authoritative code reads the Host environment.",
    hint: "Pass validated configuration through an explicit recorded input boundary.",
  }),
  "determinism.locale": Object.freeze({
    message: "Authoritative code depends on Host locale data.",
    hint: "Use engine-owned UTF-16 ordering or explicit canonical data instead of Host ICU.",
  }),
  "determinism.dom_storage": Object.freeze({
    message: "Authoritative code accesses DOM or browser storage state.",
    hint: "Keep browser state in the Host/presentation layer and submit semantic input.",
  }),
  "determinism.ambient_provider_import": Object.freeze({
    message: "Authoritative code imports an ambient provider.",
    hint: "Move the provider to the Host boundary and inject canonical recorded data.",
  }),
  "determinism.ambient_capability_escape": Object.freeze({
    message: "Authoritative code lets an ambient capability escape static verification.",
    hint: "Use a verified direct member operation or pass canonical recorded data instead.",
  }),
  "determinism.numeric_fractional_literal": Object.freeze({
    message: "Authoritative code contains a fractional or negative-zero numeric literal.",
    hint: "Use bounded integer/ratio data or add a complete node-local numeric exemption.",
  }),
  "determinism.numeric_parse_float": Object.freeze({
    message: "Authoritative code parses an approximate floating-point value.",
    hint: "Use a strict bounded parser or add a complete node-local numeric exemption.",
  }),
  "determinism.numeric_approximate_math": Object.freeze({
    message: "Authoritative code performs approximate mathematical evaluation.",
    hint: "Use a defined integer algorithm or add a complete node-local numeric exemption.",
  }),
  "determinism.bootstrap_entropy_escape": Object.freeze({
    message: "Bootstrap entropy is unverified or escapes its narrow adapter call site.",
    hint:
      "Use only direct nextUuidV4/nextNonZeroUint32 calls on the verified createBootstrapInput parameter.",
  }),
  "determinism.exemption_malformed": Object.freeze({
    message: "Determinism exemption metadata is malformed.",
    hint: "Provide exact code, reason, bounds, rounding, and repo-relative test fields.",
  }),
  "determinism.exemption_stale": Object.freeze({
    message: "Determinism exemption does not match the next syntax node.",
    hint:
      "Remove the stale directive or place one complete directive immediately above its numeric diagnostic.",
  }),
  "determinism.exemption_duplicate": Object.freeze({
    message: "Multiple determinism exemptions target one syntax location.",
    hint: "Keep one node-local exemption for one numeric diagnostic.",
  }),
  "determinism.exemption_whole_file": Object.freeze({
    message: "Whole-file determinism exemptions are forbidden.",
    hint: "Use a complete next-line numeric exemption at the exact reviewed syntax node.",
  }),
  "determinism.source_parse_failed": Object.freeze({
    message: "Unable to parse authoritative source.",
    hint: "Fix the JavaScript or TypeScript syntax before rerunning the determinism check.",
  }),
});

function isNodeV1(value: unknown): value is AstNodeV1 {
  return typeof value === "object" && value !== null &&
    typeof (value as { type?: unknown }).type === "string";
}

function asNodeV1(value: unknown): AstNodeV1 | null {
  return isNodeV1(value) ? value : null;
}

function asNodesV1(value: unknown): readonly AstNodeV1[] {
  return Array.isArray(value) ? value.filter(isNodeV1) : [];
}

function nodeStartV1(node: AstNodeV1): number {
  return typeof node.start === "number" ? node.start : 0;
}

function nodeEndV1(node: AstNodeV1): number {
  return typeof node.end === "number" ? node.end : nodeStartV1(node);
}

function identifierNameV1(node: AstNodeV1 | null): string | null {
  return node?.type === "Identifier" && typeof node.name === "string" ? node.name : null;
}

function staticPropertyNameV1(node: AstNodeV1): string | null {
  const property = asNodeV1(node.property);
  if (property === null) return null;
  if (
    node.computed !== true && property.type === "Identifier" && typeof property.name === "string"
  ) {
    return property.name;
  }
  if (
    node.computed === true &&
    (property.type === "StringLiteral" || property.type === "NumericLiteral") &&
    (typeof property.value === "string" || typeof property.value === "number")
  ) {
    return String(property.value);
  }
  return null;
}

function staticKeyNameV1(node: AstNodeV1): string | null {
  const key = asNodeV1(node.key);
  if (key === null) return null;
  if (node.computed !== true && key.type === "Identifier" && typeof key.name === "string") {
    return key.name;
  }
  if (
    (key.type === "StringLiteral" || key.type === "NumericLiteral") &&
    (typeof key.value === "string" || typeof key.value === "number")
  ) return String(key.value);
  return null;
}

function createRootScopeV1(): ScopeV1 {
  const root = {
    parent: null,
    bindings: new Map<string, BindingV1>(),
    bootstrapTypes: new Map<string, boolean>(),
  } as Omit<ScopeV1, "functionScope"> & { functionScope?: ScopeV1 };
  root.functionScope = root as ScopeV1;
  return root as ScopeV1;
}

function createScopeV1(parent: ScopeV1, functionBoundary = false): ScopeV1 {
  const scope = {
    parent,
    bindings: new Map<string, BindingV1>(),
    bootstrapTypes: new Map<string, boolean>(),
    functionScope: parent.functionScope,
  };
  if (functionBoundary) scope.functionScope = scope;
  return scope;
}

function lookupBindingV1(scope: ScopeV1, name: string): BindingV1 | null {
  for (let cursor: ScopeV1 | null = scope; cursor !== null; cursor = cursor.parent) {
    const binding = cursor.bindings.get(name);
    if (binding !== undefined) return binding;
  }
  return null;
}

function lookupBootstrapTypeV1(scope: ScopeV1, name: string): boolean {
  for (let cursor: ScopeV1 | null = scope; cursor !== null; cursor = cursor.parent) {
    const binding = cursor.bootstrapTypes.get(name);
    if (binding !== undefined) return binding;
  }
  return false;
}

function declareIdentifierV1(scope: ScopeV1, name: string): BindingV1 {
  const existing = scope.bindings.get(name);
  if (existing !== undefined) return existing;
  const binding: BindingV1 = { provenance: null, bootstrap: null };
  scope.bindings.set(name, binding);
  return binding;
}

function declarePatternV1(pattern: AstNodeV1 | null, scope: ScopeV1): void {
  if (pattern === null) return;
  switch (pattern.type) {
    case "Identifier": {
      const name = identifierNameV1(pattern);
      if (name !== null) declareIdentifierV1(scope, name);
      return;
    }
    case "AssignmentPattern":
      declarePatternV1(asNodeV1(pattern.left), scope);
      return;
    case "RestElement":
      declarePatternV1(asNodeV1(pattern.argument), scope);
      return;
    case "ArrayPattern":
      for (const element of asNodesV1(pattern.elements)) declarePatternV1(element, scope);
      return;
    case "ObjectPattern":
      for (const property of asNodesV1(pattern.properties)) {
        if (property.type === "RestElement") {
          declarePatternV1(asNodeV1(property.argument), scope);
        } else {
          declarePatternV1(asNodeV1(property.value), scope);
        }
      }
  }
}

function predeclareStatementV1(statement: AstNodeV1, scope: ScopeV1): void {
  const declaration = statement.type === "ExportNamedDeclaration" ||
      statement.type === "ExportDefaultDeclaration"
    ? asNodeV1(statement.declaration)
    : statement;
  if (declaration === null) return;

  if (declaration.type === "VariableDeclaration") {
    const target = declaration.kind === "var" ? scope.functionScope : scope;
    for (const item of asNodesV1(declaration.declarations)) {
      declarePatternV1(asNodeV1(item.id), target);
    }
    return;
  }
  if (
    declaration.type === "FunctionDeclaration" || declaration.type === "ClassDeclaration" ||
    declaration.type === "TSEnumDeclaration" || declaration.type === "TSModuleDeclaration" ||
    declaration.type === "TSImportEqualsDeclaration"
  ) {
    const name = identifierNameV1(asNodeV1(declaration.id));
    if (name !== null) {
      declareIdentifierV1(scope, name);
      if (declaration.type !== "FunctionDeclaration") scope.bootstrapTypes.set(name, false);
    }
    return;
  }
  if (
    declaration.type === "TSTypeAliasDeclaration" ||
    declaration.type === "TSInterfaceDeclaration"
  ) {
    const name = identifierNameV1(asNodeV1(declaration.id));
    if (name !== null) scope.bootstrapTypes.set(name, false);
    return;
  }
  if (declaration.type === "ImportDeclaration") {
    const sourceNode = asNodeV1(declaration.source);
    const sourceName = sourceNode?.type === "StringLiteral" && typeof sourceNode.value === "string"
      ? sourceNode.value
      : null;
    for (const specifier of asNodesV1(declaration.specifiers)) {
      const name = identifierNameV1(asNodeV1(specifier.local));
      if (name === null) continue;
      declareIdentifierV1(scope, name);
      const imported = asNodeV1(specifier.imported);
      const importedName = identifierNameV1(imported) ??
        (imported?.type === "StringLiteral" && typeof imported.value === "string"
          ? imported.value
          : null);
      scope.bootstrapTypes.set(
        name,
        specifier.type === "ImportSpecifier" && sourceName === "@sillymaker/base" &&
          importedName === "BootstrapEntropyV1",
      );
    }
  }
}

function collectHoistedVarV1(node: AstNodeV1, functionScope: ScopeV1): void {
  if (
    node.type === "FunctionDeclaration" || node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression" || node.type === "ObjectMethod" ||
    node.type === "ClassMethod" || node.type === "ClassPrivateMethod"
  ) return;
  if (node.type === "VariableDeclaration" && node.kind === "var") {
    for (const item of asNodesV1(node.declarations)) {
      declarePatternV1(asNodeV1(item.id), functionScope);
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "comments" || key === "tokens") continue;
    if (isNodeV1(value)) collectHoistedVarV1(value, functionScope);
    else if (Array.isArray(value)) {
      for (const child of value) if (isNodeV1(child)) collectHoistedVarV1(child, functionScope);
    }
  }
}

function unwrapExpressionV1(node: AstNodeV1 | null): AstNodeV1 | null {
  let current = node;
  while (
    current !== null &&
    (current.type === "TSAsExpression" || current.type === "TSTypeAssertion" ||
      current.type === "TSNonNullExpression" || current.type === "TSSatisfiesExpression" ||
      current.type === "TypeCastExpression" || current.type === "ParenthesizedExpression")
  ) {
    current = asNodeV1(current.expression);
  }
  return current;
}

function dateCallableKindV1(
  provenance: readonly string[] | null,
): "constructor" | "now" | "parse" | "utc" | "other" | null {
  if (provenance?.[0] !== "Date") return null;
  let members = provenance.slice(1);
  if (
    (members[0] === "prototype" || members[0] === "instance") &&
    members[1] === "constructor"
  ) members = members.slice(2);
  const target = members[0];
  if (
    target === undefined || target === "call" || target === "apply" || target === "bind"
  ) return "constructor";
  if (target === "now") return "now";
  if (target === "parse") return "parse";
  if (target === "UTC") return "utc";
  return "other";
}

function resolveExpressionV1(node: AstNodeV1 | null, scope: ScopeV1): ResolvedExpressionV1 {
  const expression = unwrapExpressionV1(node);
  if (expression === null) return { provenance: null, bootstrap: null };

  if (expression.type === "Identifier") {
    const name = identifierNameV1(expression);
    if (name === null) return { provenance: null, bootstrap: null };
    const binding = lookupBindingV1(scope, name);
    return binding === null
      ? { provenance: Object.freeze([name]), bootstrap: null }
      : { provenance: binding.provenance, bootstrap: binding.bootstrap === null ? null : binding };
  }

  if (expression.type === "MemberExpression" || expression.type === "OptionalMemberExpression") {
    const object = resolveExpressionV1(asNodeV1(expression.object), scope);
    const property = staticPropertyNameV1(expression);
    if (object.provenance === null || property === null) {
      return { provenance: null, bootstrap: object.bootstrap };
    }
    const provenance = object.provenance.length === 1 && object.provenance[0] === "globalThis"
      ? Object.freeze([property])
      : Object.freeze([...object.provenance, property]);
    return { provenance, bootstrap: object.bootstrap };
  }

  if (expression.type === "NewExpression") {
    const callee = resolveExpressionV1(asNodeV1(expression.callee), scope);
    const argumentsV1 = asNodesV1(expression.arguments);
    if (
      dateCallableKindV1(callee.provenance) === "constructor" && argumentsV1.length > 0 &&
      argumentsV1.every(({ type }) => type !== "SpreadElement")
    ) {
      return { provenance: Object.freeze(["Date", "instance"]), bootstrap: null };
    }
  }

  return { provenance: null, bootstrap: null };
}

function resolveTsEntityNameV1(
  node: AstNodeV1 | null,
  scope: ScopeV1,
): ResolvedExpressionV1 {
  if (node?.type === "Identifier") return resolveExpressionV1(node, scope);
  if (node?.type !== "TSQualifiedName") return { provenance: null, bootstrap: null };
  const left = resolveTsEntityNameV1(asNodeV1(node.left), scope);
  const right = identifierNameV1(asNodeV1(node.right));
  if (left.provenance === null || right === null) {
    return { provenance: null, bootstrap: left.bootstrap };
  }
  const provenance = left.provenance.length === 1 && left.provenance[0] === "globalThis"
    ? Object.freeze([right])
    : Object.freeze([...left.provenance, right]);
  return { provenance, bootstrap: left.bootstrap };
}

function assignPatternV1(
  pattern: AstNodeV1 | null,
  resolved: ResolvedExpressionV1,
  scope: ScopeV1,
): void {
  if (pattern === null) return;
  if (pattern.type === "Identifier") {
    const name = identifierNameV1(pattern);
    const binding = name === null ? null : lookupBindingV1(scope, name);
    if (binding !== null) {
      binding.provenance = resolved.provenance;
      binding.bootstrap = resolved.bootstrap === null ? null : "forbidden";
    }
    return;
  }
  if (pattern.type === "AssignmentPattern") {
    assignPatternV1(asNodeV1(pattern.left), resolved, scope);
    return;
  }
  if (pattern.type === "ArrayPattern") {
    for (const element of asNodesV1(pattern.elements)) {
      assignPatternV1(element, { provenance: null, bootstrap: null }, scope);
    }
    return;
  }
  if (pattern.type === "ObjectPattern") {
    for (const property of asNodesV1(pattern.properties)) {
      if (property.type === "RestElement") {
        assignPatternV1(
          asNodeV1(property.argument),
          { provenance: null, bootstrap: resolved.bootstrap },
          scope,
        );
        continue;
      }
      const propertyName = staticPropertyNameV1({
        ...property,
        property: property.key,
        computed: property.computed,
      });
      const provenance = resolved.provenance !== null && propertyName !== null
        ? resolved.provenance.length === 1 && resolved.provenance[0] === "globalThis"
          ? Object.freeze([propertyName])
          : Object.freeze([...resolved.provenance, propertyName])
        : null;
      assignPatternV1(
        asNodeV1(property.value),
        { provenance, bootstrap: resolved.bootstrap },
        scope,
      );
    }
  }
}

function hasBootstrapEntropyTypeV1(
  parameter: AstNodeV1,
  scope: ScopeV1,
): boolean {
  const annotation = asNodeV1(parameter.typeAnnotation);
  const typeNode = annotation?.type === "TSTypeAnnotation"
    ? asNodeV1(annotation.typeAnnotation)
    : annotation;
  if (typeNode?.type !== "TSTypeReference") return false;
  const typeName = identifierNameV1(asNodeV1(typeNode.typeName));
  return typeName !== null && lookupBootstrapTypeV1(scope, typeName);
}

function functionNameV1(node: AstNodeV1, fallback: string | null): string | null {
  if (fallback !== null) return fallback;
  if (
    node.type === "ObjectMethod" || node.type === "ClassMethod" ||
    node.type === "ClassPrivateMethod"
  ) {
    return staticKeyNameV1(node);
  }
  return identifierNameV1(asNodeV1(node.id));
}

function parameterIdentifierV1(parameter: AstNodeV1 | null): AstNodeV1 | null {
  let candidate = parameter;
  if (candidate?.type === "TSParameterProperty") candidate = asNodeV1(candidate.parameter);
  if (candidate?.type === "AssignmentPattern") candidate = asNodeV1(candidate.left);
  return candidate?.type === "Identifier" ? candidate : null;
}

function isAmbientProviderV1(specifier: string): boolean {
  const normalized = specifier.startsWith("npm:") ? specifier.slice(4) : specifier;
  return /^(?:openai|axios|undici|ws)(?:@[^/]+|\/|$)/u.test(normalized) ||
    /^(?:@anthropic-ai\/sdk)(?:@[^/]+|\/|$)/u.test(normalized) ||
    normalized === "http" || normalized === "https" || normalized === "net" ||
    normalized === "tls" || normalized === "dns" || normalized === "dgram" ||
    normalized === "crypto" || normalized === "process" || normalized === "perf_hooks" ||
    normalized === "fs" || normalized === "os" || normalized === "child_process" ||
    /^node:(?:http|https|net|tls|dns|dgram|crypto|process|perf_hooks|fs|os|child_process)(?:\/|$)/u
      .test(normalized);
}

function compareCodeUnitsV1(left: string, right: string): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = left.charCodeAt(index) - right.charCodeAt(index);
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

function parserPluginsV1(file: string): ParserPlugin[] {
  const lowerFile = file.toLowerCase();
  const plugins: ParserPlugin[] = [
    ["decorators", {}],
    "decoratorAutoAccessors",
  ];
  if (/\.(?:ts|tsx|mts|cts)$/u.test(lowerFile)) plugins.push("typescript");
  if (/\.(?:jsx|tsx)$/u.test(lowerFile)) plugins.push("jsx");
  return plugins;
}

function parseDeterminismAstV1(file: string, source: string): AstNodeV1 {
  return parse(source, {
    sourceType: "unambiguous",
    plugins: parserPluginsV1(file),
    allowAwaitOutsideFunction: true,
    ranges: true,
    attachComment: true,
  }) as unknown as AstNodeV1;
}

export function hasUniqueDeterminismVectorMarkerV1(options: {
  readonly file: string;
  readonly source: string;
  readonly marker: string;
}): boolean {
  let program: AstNodeV1;
  try {
    program = parseDeterminismAstV1(options.file, options.source);
  } catch {
    return false;
  }
  let matches = 0;
  for (const comment of asNodesV1(program.comments)) {
    if (comment.type !== "CommentLine") continue;
    const start = nodeStartV1(comment);
    const lineStart = options.source.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const nextLine = options.source.indexOf("\n", start);
    const lineEnd = nextLine < 0 ? options.source.length : nextLine;
    if (options.source.slice(lineStart, lineEnd).trim() === options.marker) matches += 1;
  }
  return matches === 1;
}

function sourceLinesV1(source: string): readonly SourceLineV1[] {
  const lines: SourceLineV1[] = [];
  let start = 0;
  let number = 1;
  for (let index = 0; index <= source.length; index += 1) {
    if (index !== source.length && source.charCodeAt(index) !== 10) continue;
    const raw = source.slice(start, index);
    lines.push({
      number,
      start,
      text: raw.endsWith("\r") ? raw.slice(0, -1) : raw,
    });
    start = index + 1;
    number += 1;
  }
  return lines;
}

function locationAtV1(lines: readonly SourceLineV1[], offset: number): Readonly<{
  line: number;
  column: number;
}> {
  let low = 0;
  let high = lines.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const line = lines[middle];
    if (line === undefined) break;
    const nextStart = lines[middle + 1]?.start ?? Number.POSITIVE_INFINITY;
    if (offset < line.start) high = middle - 1;
    else if (offset >= nextStart) low = middle + 1;
    else return Object.freeze({ line: line.number, column: offset - line.start + 1 });
  }
  return Object.freeze({ line: 1, column: Math.max(0, offset) + 1 });
}

function isExactIntegerLiteralV1(rawInput: string): boolean {
  const raw = rawInput.replaceAll("_", "").toLowerCase();
  if (/^0[xob][0-9a-f]+$/u.test(raw)) return true;
  const match = /^(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/u.exec(raw);
  if (match === null) return true;
  const integerDigits = match[1] ?? "";
  const fractionalDigits = match[2] ?? match[3] ?? "";
  const digits = `${integerDigits}${fractionalDigits}`;
  if (/^0*$/u.test(digits)) return true;
  const exponent = BigInt(match[4] ?? "0");
  const decimalPlaces = BigInt(fractionalDigits.length) - exponent;
  if (decimalPlaces <= 0n) return true;
  if (decimalPlaces >= BigInt(digits.length)) return false;
  const tailLength = Number(decimalPlaces);
  return /^0*$/u.test(digits.slice(digits.length - tailLength));
}

function isMathematicalZeroLiteralV1(rawInput: string): boolean {
  const raw = rawInput.replaceAll("_", "").toLowerCase();
  if (/^0[xob]0+$/u.test(raw)) return true;
  const mantissa = raw.split("e", 1)[0] ?? raw;
  return /^[0.]+$/u.test(mantissa) && mantissa.includes("0");
}

function importSpecifierRangeV1(
  node: AstNodeV1,
  source: string,
  specifier: string,
): readonly [number, number] {
  const start = nodeStartV1(node);
  const end = nodeEndV1(node);
  const located = source.indexOf(specifier, start);
  return located >= start && located + specifier.length <= end
    ? [located, located + specifier.length]
    : [start, end];
}

function parseExemptionMetadataV1(
  raw: string,
  isFocusedTestReference: (reference: string) => boolean,
): { code: string } | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const required = ["bounds", "code", "reason", "rounding", "test"];
  const keys = Object.keys(record).sort(compareCodeUnitsV1);
  if (keys.length !== required.length || keys.some((key, index) => key !== required[index])) {
    return null;
  }
  const keyTokens = raw.match(/"(?:\\.|[^"\\])*"\s*:/gu) ?? [];
  if (keyTokens.length !== required.length) return null;
  for (const key of required) {
    if (typeof record[key] !== "string" || record[key].trim() === "") return null;
  }
  if (!numericExemptionCodesV1.has(record.code as string)) return null;
  const test = record.test as string;
  if (
    test.startsWith("/") || test.startsWith("./") || test.includes("\\") ||
    test.split("#", 1)[0]?.split("/").includes("..") ||
    !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.test\.ts#[^#\s]+$/u.test(test)
  ) return null;
  if (!isFocusedTestReference(test)) return null;
  return { code: record.code as string };
}

export function analyzeDeterminismSourceV1(
  options: AnalyzeDeterminismSourceOptionsV1,
): readonly DeterminismDiagnosticV1[] {
  const source = options.source;
  const lines = sourceLinesV1(source);
  const rawDiagnostics: MutableDiagnosticV1[] = [];
  const diagnosticKeys = new Set<string>();

  const reportV1 = (code: string, startInput: number, endInput: number): void => {
    const start = Math.max(0, Math.min(source.length, startInput));
    const end = Math.max(start, Math.min(source.length, endInput));
    const key = `${code}:${start}:${end}`;
    if (diagnosticKeys.has(key)) return;
    diagnosticKeys.add(key);
    rawDiagnostics.push({ code, start, end });
  };

  let program: AstNodeV1;
  try {
    program = parseDeterminismAstV1(options.file, source);
  } catch (error) {
    const position = typeof error === "object" && error !== null &&
        typeof (error as { pos?: unknown }).pos === "number"
      ? (error as { pos: number }).pos
      : 0;
    reportV1("determinism.source_parse_failed", position, position);
    return freezeDiagnosticsV1(options.file, lines, rawDiagnostics);
  }
  const lineCommentStartsV1 = new Set(
    asNodesV1(program.comments)
      .filter(({ type }) => type === "CommentLine")
      .map(nodeStartV1),
  );

  const visitGenericChildrenV1 = (node: AstNodeV1, scope: ScopeV1): void => {
    for (const [key, value] of Object.entries(node)) {
      if (
        key === "loc" || key === "comments" || key === "tokens" || key === "leadingComments" ||
        key === "trailingComments" || key === "innerComments" || key === "typeAnnotation" ||
        key === "typeParameters" || key === "returnType"
      ) continue;
      if (isNodeV1(value)) visitV1(value, scope);
      else if (Array.isArray(value)) {
        for (const child of value) if (isNodeV1(child)) visitV1(child, scope);
      }
    }
  };

  const reportNodeV1 = (code: string, node: AstNodeV1): void => {
    reportV1(code, nodeStartV1(node), nodeEndV1(node));
  };

  const classifyProvenanceV1 = (
    provenance: readonly string[] | null,
    node: AstNodeV1,
    mode: "call" | "new" | "member",
  ): string | null => {
    if (provenance === null || provenance.length === 0) return null;
    const root = provenance[0];
    const members = provenance.slice(1);
    if (root === "Math" && members.includes("random")) {
      return "determinism.ambient_random";
    }
    if (
      root === "crypto" &&
      (members.includes("getRandomValues") || members.includes("randomUUID"))
    ) return "determinism.crypto_random";
    if (root === "Date") {
      const callableKind = dateCallableKindV1(provenance);
      if (callableKind === "constructor" && mode === "call") {
        return "determinism.ambient_clock";
      }
      if (callableKind === "constructor" && mode === "new") {
        const argumentsV1 = asNodesV1(node.arguments);
        if (argumentsV1.length === 0 || argumentsV1.some(({ type }) => type === "SpreadElement")) {
          return "determinism.ambient_clock";
        }
      }
      if (callableKind === "constructor" && mode === "member") {
        return "determinism.ambient_capability_escape";
      }
      if (callableKind === "now") return "determinism.ambient_clock";
    }
    if (root === "performance" && members.includes("now")) {
      return "determinism.performance_clock";
    }
    if (
      (root === "fetch" && provenance.length === 1) ||
      ((root === "XMLHttpRequest" || root === "WebSocket") && provenance.length === 1)
    ) return "determinism.network";
    if (
      (root === "Deno" && provenance[1] === "env") ||
      (root === "process" && provenance[1] === "env")
    ) return "determinism.environment";
    if (
      root === "Intl" ||
      (root === "navigator" && (provenance[1] === "language" || provenance[1] === "languages")) ||
      members.includes("localeCompare") || members.some((name) => name.startsWith("toLocale"))
    ) return "determinism.locale";
    if (
      root === "document" || root === "window" || root === "localStorage" ||
      root === "sessionStorage"
    ) return "determinism.dom_storage";
    if (root === "parseFloat" && provenance.length === 1) {
      return "determinism.numeric_parse_float";
    }
    if (root === "Number" && members.includes("parseFloat")) {
      return "determinism.numeric_parse_float";
    }
    if (root === "Math" && members.some((name) => approximateMathMembersV1.has(name))) {
      return "determinism.numeric_approximate_math";
    }
    return null;
  };

  const visitComputedPropertyV1 = (node: AstNodeV1, scope: ScopeV1): void => {
    if (node.computed !== true || staticPropertyNameV1(node) !== null) return;
    const property = asNodeV1(node.property);
    if (property !== null) visitV1(property, scope);
  };

  const visitPatternRuntimeV1 = (pattern: AstNodeV1 | null, scope: ScopeV1): void => {
    if (pattern === null) return;
    for (const decorator of asNodesV1(pattern.decorators)) {
      const expression = asNodeV1(decorator.expression);
      if (expression !== null) visitV1(expression, scope);
    }
    if (pattern.type === "AssignmentPattern") {
      visitPatternRuntimeV1(asNodeV1(pattern.left), scope);
      const right = asNodeV1(pattern.right);
      if (right !== null) visitV1(right, scope);
      return;
    }
    if (pattern.type === "RestElement") {
      visitPatternRuntimeV1(asNodeV1(pattern.argument), scope);
      return;
    }
    if (pattern.type === "ArrayPattern") {
      for (const element of asNodesV1(pattern.elements)) visitPatternRuntimeV1(element, scope);
      return;
    }
    if (pattern.type === "ObjectPattern") {
      for (const property of asNodesV1(pattern.properties)) {
        if (property.type === "RestElement") {
          visitPatternRuntimeV1(asNodeV1(property.argument), scope);
          continue;
        }
        if (property.computed === true) {
          const key = asNodeV1(property.key);
          if (key !== null) visitV1(key, scope);
        }
        visitPatternRuntimeV1(asNodeV1(property.value), scope);
      }
      return;
    }
    if (pattern.type === "TSParameterProperty") {
      visitPatternRuntimeV1(asNodeV1(pattern.parameter), scope);
    }
  };

  const reportPatternCapabilitiesV1 = (
    pattern: AstNodeV1 | null,
    resolved: ResolvedExpressionV1,
  ): void => {
    if (pattern === null) return;
    if (pattern.type === "AssignmentPattern") {
      reportPatternCapabilitiesV1(asNodeV1(pattern.left), resolved);
      return;
    }
    if (pattern.type !== "ObjectPattern") return;
    for (const property of asNodesV1(pattern.properties)) {
      if (property.type === "RestElement") {
        if (resolved.bootstrap !== null) {
          reportNodeV1("determinism.bootstrap_entropy_escape", property);
        } else if (
          resolved.provenance?.length === 1 &&
          ambientCapabilityRootsV1.has(resolved.provenance[0] ?? "")
        ) reportNodeV1("determinism.ambient_capability_escape", property);
        continue;
      }
      const propertyName = staticPropertyNameV1({
        ...property,
        property: property.key,
        computed: property.computed,
      });
      const provenance = resolved.provenance !== null && propertyName !== null
        ? resolved.provenance.length === 1 && resolved.provenance[0] === "globalThis"
          ? Object.freeze([propertyName])
          : Object.freeze([...resolved.provenance, propertyName])
        : null;
      const derived = { provenance, bootstrap: resolved.bootstrap };
      if (derived.bootstrap !== null) {
        reportNodeV1("determinism.bootstrap_entropy_escape", property);
      } else {
        const code = classifyProvenanceV1(derived.provenance, property, "member");
        if (code !== null) reportNodeV1(code, property);
        else if (
          derived.provenance?.length === 1 &&
          ambientCapabilityRootsV1.has(derived.provenance[0] ?? "")
        ) reportNodeV1("determinism.ambient_capability_escape", property);
        else if (
          propertyName === null && resolved.provenance?.length === 1 &&
          ambientCapabilityRootsV1.has(resolved.provenance[0] ?? "")
        ) reportNodeV1("determinism.ambient_capability_escape", property);
      }
      reportPatternCapabilitiesV1(asNodeV1(property.value), derived);
    }
  };

  const visitCallLikeV1 = (node: AstNodeV1, scope: ScopeV1, mode: "call" | "new"): void => {
    const callee = asNodeV1(node.callee);
    const unwrappedCallee = unwrapExpressionV1(callee);
    const calleeResolved = resolveExpressionV1(unwrappedCallee, scope);
    let classified = false;

    if (unwrappedCallee?.type === "Import") {
      const sourceNode = asNodesV1(node.arguments)[0];
      const specifier = sourceNode?.type === "StringLiteral" && typeof sourceNode.value === "string"
        ? sourceNode.value
        : null;
      if (sourceNode !== undefined && specifier !== null && isAmbientProviderV1(specifier)) {
        const [start, end] = importSpecifierRangeV1(sourceNode, source, specifier);
        reportV1("determinism.ambient_provider_import", start, end);
        classified = true;
      }
    }

    if (
      unwrappedCallee?.type === "MemberExpression" ||
      unwrappedCallee?.type === "OptionalMemberExpression"
    ) {
      const object = asNodeV1(unwrappedCallee.object);
      const objectResolved = resolveExpressionV1(object, scope);
      if (objectResolved.bootstrap !== null) {
        const property = staticPropertyNameV1(unwrappedCallee);
        const directParameter = unwrapExpressionV1(object)?.type === "Identifier";
        const parameterName = directParameter ? identifierNameV1(unwrapExpressionV1(object)) : null;
        const ownedByCurrentFunction = parameterName !== null &&
          scope.functionScope.bindings.get(parameterName) === objectResolved.bootstrap;
        if (
          objectResolved.bootstrap.bootstrap === "allowed" && directParameter &&
          ownedByCurrentFunction &&
          (property === "nextUuidV4" || property === "nextNonZeroUint32") && mode === "call"
        ) {
          classified = true;
        } else {
          reportNodeV1("determinism.bootstrap_entropy_escape", unwrappedCallee);
          classified = true;
        }
      }
      const property = staticPropertyNameV1(unwrappedCallee);
      if (
        !classified && objectResolved.bootstrap === null &&
        (property === "nextUuidV4" || property === "nextNonZeroUint32")
      ) {
        reportNodeV1("determinism.bootstrap_entropy_escape", unwrappedCallee);
        classified = true;
      }
    }

    if (
      !classified && mode === "call" &&
      (unwrappedCallee?.type === "MemberExpression" ||
        unwrappedCallee?.type === "OptionalMemberExpression")
    ) {
      const property = staticPropertyNameV1(unwrappedCallee);
      if (property === "localeCompare" || property?.startsWith("toLocale")) {
        reportNodeV1("determinism.locale", unwrappedCallee);
        classified = true;
      }
    }

    if (!classified && unwrappedCallee?.type === "Identifier") {
      const name = identifierNameV1(unwrappedCallee);
      const binding = name === null ? null : lookupBindingV1(scope, name);
      if (binding?.bootstrap !== null && binding !== null) {
        reportNodeV1("determinism.bootstrap_entropy_escape", unwrappedCallee);
        classified = true;
      }
    }

    if (!classified && mode === "call" && calleeResolved.provenance?.[0] === "require") {
      const sourceNode = asNodesV1(node.arguments)[0];
      const specifier = sourceNode?.type === "StringLiteral" && typeof sourceNode.value === "string"
        ? sourceNode.value
        : null;
      if (sourceNode !== undefined && specifier !== null && isAmbientProviderV1(specifier)) {
        const [start, end] = importSpecifierRangeV1(sourceNode, source, specifier);
        reportV1("determinism.ambient_provider_import", start, end);
        classified = true;
      }
    }

    if (!classified && unwrappedCallee !== null) {
      const code = classifyProvenanceV1(calleeResolved.provenance, node, mode);
      if (code !== null) {
        reportNodeV1(code, unwrappedCallee);
        classified = true;
      }
    }

    if (
      !classified && mode === "new" &&
      dateCallableKindV1(calleeResolved.provenance) === "constructor"
    ) {
      const argumentsV1 = asNodesV1(node.arguments);
      if (argumentsV1.length > 0 && argumentsV1.every(({ type }) => type !== "SpreadElement")) {
        classified = true;
      }
    }
    if (
      !classified && mode === "call" && calleeResolved.provenance?.length === 1 &&
      calleeResolved.provenance[0] === "Number"
    ) classified = true;

    if (!classified && callee !== null) visitV1(callee, scope);
    else if (
      unwrappedCallee?.type === "MemberExpression" ||
      unwrappedCallee?.type === "OptionalMemberExpression"
    ) visitComputedPropertyV1(unwrappedCallee, scope);
    for (const argument of asNodesV1(node.arguments)) {
      if (argument.type === "SpreadElement") {
        const value = asNodeV1(argument.argument);
        if (value !== null) visitV1(value, scope);
      } else visitV1(argument, scope);
    }
  };

  const shadowTypeParametersV1 = (node: AstNodeV1, scope: ScopeV1): void => {
    const typeParameters = asNodeV1(node.typeParameters);
    for (const parameter of asNodesV1(typeParameters?.params)) {
      const name = typeof parameter.name === "string"
        ? parameter.name
        : identifierNameV1(asNodeV1(parameter.name));
      if (name !== null) scope.bootstrapTypes.set(name, false);
    }
  };

  const visitFunctionV1 = (
    node: AstNodeV1,
    parentScope: ScopeV1,
    fallbackName: string | null = null,
  ): void => {
    const scope = createScopeV1(parentScope, true);
    const ownName = identifierNameV1(asNodeV1(node.id));
    if (ownName !== null) declareIdentifierV1(scope, ownName);
    shadowTypeParametersV1(node, scope);
    const params = asNodesV1(node.params);
    for (const parameter of params) {
      const pattern = parameter.type === "TSParameterProperty"
        ? asNodeV1(parameter.parameter)
        : parameter;
      declarePatternV1(pattern, scope);
    }
    const name = functionNameV1(node, fallbackName);
    const firstParameter = parameterIdentifierV1(params[0] ?? null);
    if (firstParameter !== null && name === "createBootstrapInput") {
      const parameterName = identifierNameV1(firstParameter);
      const binding = parameterName === null ? null : lookupBindingV1(scope, parameterName);
      if (binding !== null) {
        binding.bootstrap = hasBootstrapEntropyTypeV1(firstParameter, scope)
          ? "allowed"
          : "forbidden";
      }
    } else {
      for (const parameter of params) {
        const candidate = parameterIdentifierV1(parameter);
        if (candidate === null || !hasBootstrapEntropyTypeV1(candidate, scope)) continue;
        const parameterName = identifierNameV1(candidate);
        const binding = parameterName === null ? null : lookupBindingV1(scope, parameterName);
        if (binding !== null) binding.bootstrap = "forbidden";
      }
    }
    for (const parameter of params) visitPatternRuntimeV1(parameter, scope);
    const body = asNodeV1(node.body);
    if (body?.type === "BlockStatement") {
      collectHoistedVarV1(body, scope);
      visitStatementListV1(asNodesV1(body.body), scope);
    } else if (body !== null) visitV1(body, scope);
  };

  const visitClassV1 = (node: AstNodeV1, parentScope: ScopeV1): void => {
    for (const decorator of asNodesV1(node.decorators)) {
      const expression = asNodeV1(decorator.expression);
      if (expression !== null) visitV1(expression, parentScope);
    }
    const superClass = asNodeV1(node.superClass);
    if (superClass !== null) visitV1(superClass, parentScope);

    const scope = createScopeV1(parentScope);
    const ownName = identifierNameV1(asNodeV1(node.id));
    if (ownName !== null) {
      declareIdentifierV1(scope, ownName);
      scope.bootstrapTypes.set(ownName, false);
    }
    shadowTypeParametersV1(node, scope);
    const body = asNodeV1(node.body);
    if (body !== null) visitV1(body, scope);
  };

  const visitStatementListV1 = (statements: readonly AstNodeV1[], scope: ScopeV1): void => {
    for (const statement of statements) predeclareStatementV1(statement, scope);
    for (const statement of statements) visitV1(statement, scope);
  };

  function visitV1(node: AstNodeV1, scope: ScopeV1): void {
    if (
      node.type.startsWith("TS") && node.type !== "TSAsExpression" &&
      node.type !== "TSTypeAssertion" && node.type !== "TSNonNullExpression" &&
      node.type !== "TSSatisfiesExpression" && node.type !== "TSParameterProperty" &&
      node.type !== "TSInstantiationExpression" && node.type !== "TSModuleDeclaration" &&
      node.type !== "TSModuleBlock" && node.type !== "TSEnumDeclaration" &&
      node.type !== "TSExportAssignment" && node.type !== "TSImportEqualsDeclaration"
    ) return;

    switch (node.type) {
      case "File": {
        const child = asNodeV1(node.program);
        if (child !== null) visitV1(child, scope);
        return;
      }
      case "Program": {
        collectHoistedVarV1(node, scope);
        visitStatementListV1(asNodesV1(node.body), scope);
        return;
      }
      case "BlockStatement": {
        const blockScope = createScopeV1(scope);
        visitStatementListV1(asNodesV1(node.body), blockScope);
        return;
      }
      case "TSModuleDeclaration": {
        if (node.declare === true) return;
        const body = asNodeV1(node.body);
        if (body !== null) visitV1(body, createScopeV1(scope));
        return;
      }
      case "TSModuleBlock":
        visitStatementListV1(asNodesV1(node.body), scope);
        return;
      case "TSEnumDeclaration":
        if (node.declare !== true) {
          for (const member of asNodesV1(node.members)) {
            const initializer = asNodeV1(member.initializer);
            if (initializer !== null) visitV1(initializer, scope);
          }
        }
        return;
      case "TSExportAssignment": {
        const expression = asNodeV1(node.expression);
        if (expression !== null) visitV1(expression, scope);
        return;
      }
      case "TSImportEqualsDeclaration": {
        if (node.importKind === "type" || node.isTypeOnly === true) return;
        const moduleReference = asNodeV1(node.moduleReference);
        const expression = moduleReference?.type === "TSExternalModuleReference"
          ? asNodeV1(moduleReference.expression)
          : null;
        const specifier = expression?.type === "StringLiteral" &&
            typeof expression.value === "string"
          ? expression.value
          : null;
        if (expression !== null && specifier !== null && isAmbientProviderV1(specifier)) {
          const [start, end] = importSpecifierRangeV1(expression, source, specifier);
          reportV1("determinism.ambient_provider_import", start, end);
        }
        if (moduleReference !== null && moduleReference.type !== "TSExternalModuleReference") {
          const resolved = resolveTsEntityNameV1(moduleReference, scope);
          const name = identifierNameV1(asNodeV1(node.id));
          const binding = name === null ? null : lookupBindingV1(scope, name);
          if (binding !== null) {
            binding.provenance = resolved.provenance;
            binding.bootstrap = resolved.bootstrap === null ? null : "forbidden";
          }
          const code = classifyProvenanceV1(resolved.provenance, moduleReference, "member");
          if (code !== null) reportNodeV1(code, moduleReference);
          if (
            resolved.provenance?.length === 1 &&
            ambientCapabilityRootsV1.has(resolved.provenance[0] ?? "")
          ) reportNodeV1("determinism.ambient_capability_escape", moduleReference);
        }
        return;
      }
      case "ImportDeclaration": {
        const sourceNode = asNodeV1(node.source);
        const specifier =
          sourceNode?.type === "StringLiteral" && typeof sourceNode.value === "string"
            ? sourceNode.value
            : null;
        const declarationTypeOnly = node.importKind === "type";
        const specifiers = asNodesV1(node.specifiers);
        const everySpecifierTypeOnly = specifiers.length > 0 &&
          specifiers.every((item) => item.importKind === "type");
        if (
          sourceNode !== null && specifier !== null && isAmbientProviderV1(specifier) &&
          !declarationTypeOnly &&
          !everySpecifierTypeOnly
        ) {
          const [start, end] = importSpecifierRangeV1(sourceNode, source, specifier);
          reportV1("determinism.ambient_provider_import", start, end);
        }
        return;
      }
      case "ExportNamedDeclaration":
      case "ExportAllDeclaration": {
        const sourceNode = asNodeV1(node.source);
        const specifier =
          sourceNode?.type === "StringLiteral" && typeof sourceNode.value === "string"
            ? sourceNode.value
            : null;
        const exportSpecifiers = asNodesV1(node.specifiers);
        const everySpecifierTypeOnly = exportSpecifiers.length > 0 &&
          exportSpecifiers.every((item) => item.exportKind === "type");
        if (
          sourceNode !== null && specifier !== null && isAmbientProviderV1(specifier) &&
          node.exportKind !== "type" && !everySpecifierTypeOnly
        ) {
          const [start, end] = importSpecifierRangeV1(sourceNode, source, specifier);
          reportV1("determinism.ambient_provider_import", start, end);
        }
        const declaration = asNodeV1(node.declaration);
        if (declaration !== null) visitV1(declaration, scope);
        if (sourceNode === null) {
          for (const item of exportSpecifiers) {
            if (item.exportKind === "type") continue;
            const local = asNodeV1(item.local);
            if (local !== null) visitV1(local, scope);
          }
        }
        return;
      }
      case "ExportDefaultDeclaration": {
        const declaration = asNodeV1(node.declaration);
        if (declaration !== null) visitV1(declaration, scope);
        return;
      }
      case "VariableDeclaration": {
        const target = node.kind === "var" ? scope.functionScope : scope;
        for (const declaration of asNodesV1(node.declarations)) {
          declarePatternV1(asNodeV1(declaration.id), target);
        }
        for (const declaration of asNodesV1(node.declarations)) {
          const initializer = asNodeV1(declaration.init);
          const pattern = asNodeV1(declaration.id);
          const resolved = resolveExpressionV1(initializer, scope);
          const staticallyDestructuredAmbientRoot = pattern?.type === "ObjectPattern" &&
            resolved.provenance?.length === 1 &&
            ambientCapabilityRootsV1.has(resolved.provenance[0] ?? "");
          if (
            initializer?.type === "FunctionExpression" ||
            initializer?.type === "ArrowFunctionExpression"
          ) {
            visitFunctionV1(
              initializer,
              scope,
              identifierNameV1(asNodeV1(declaration.id)),
            );
          } else if (initializer !== null && !staticallyDestructuredAmbientRoot) {
            visitV1(initializer, scope);
          }
          visitPatternRuntimeV1(pattern, scope);
          reportPatternCapabilitiesV1(pattern, resolved);
          assignPatternV1(pattern, resolved, target);
        }
        return;
      }
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression":
      case "ObjectMethod":
      case "ClassMethod":
      case "ClassPrivateMethod": {
        if (node.computed === true) {
          const key = asNodeV1(node.key);
          if (key !== null) visitV1(key, scope);
        }
        for (const decorator of asNodesV1(node.decorators)) {
          const expression = asNodeV1(decorator.expression);
          if (expression !== null) visitV1(expression, scope);
        }
        visitFunctionV1(node, scope);
        return;
      }
      case "ClassDeclaration":
      case "ClassExpression":
        visitClassV1(node, scope);
        return;
      case "ObjectProperty":
      case "ClassProperty":
      case "ClassPrivateProperty": {
        if (node.computed === true) {
          const key = asNodeV1(node.key);
          if (key !== null) visitV1(key, scope);
        }
        for (const decorator of asNodesV1(node.decorators)) {
          const expression = asNodeV1(decorator.expression);
          if (expression !== null) visitV1(expression, scope);
        }
        const value = asNodeV1(node.value);
        if (value !== null) {
          const keyName = staticKeyNameV1(node);
          if (
            value.type === "FunctionExpression" || value.type === "ArrowFunctionExpression"
          ) visitFunctionV1(value, scope, keyName);
          else visitV1(value, scope);
        }
        return;
      }
      case "CallExpression":
      case "OptionalCallExpression":
        visitCallLikeV1(node, scope, "call");
        return;
      case "NewExpression":
        visitCallLikeV1(node, scope, "new");
        return;
      case "ImportExpression": {
        const sourceNode = asNodeV1(node.source);
        const specifier =
          sourceNode?.type === "StringLiteral" && typeof sourceNode.value === "string"
            ? sourceNode.value
            : null;
        if (sourceNode !== null && specifier !== null && isAmbientProviderV1(specifier)) {
          const [start, end] = importSpecifierRangeV1(sourceNode, source, specifier);
          reportV1("determinism.ambient_provider_import", start, end);
        }
        return;
      }
      case "MemberExpression":
      case "OptionalMemberExpression": {
        const resolved = resolveExpressionV1(node, scope);
        if (resolved.bootstrap !== null) {
          reportNodeV1("determinism.bootstrap_entropy_escape", node);
          visitComputedPropertyV1(node, scope);
          return;
        }
        const property = staticPropertyNameV1(node);
        if (property === "nextUuidV4" || property === "nextNonZeroUint32") {
          reportNodeV1("determinism.bootstrap_entropy_escape", node);
          visitComputedPropertyV1(node, scope);
          return;
        }
        const code = classifyProvenanceV1(resolved.provenance, node, "member");
        if (code !== null) {
          reportNodeV1(code, node);
          visitComputedPropertyV1(node, scope);
          return;
        }
        if (
          resolved.provenance !== null && resolved.provenance.length > 1 &&
          (resolved.provenance[0] === "Math" || resolved.provenance[0] === "Date" ||
            resolved.provenance[0] === "Number")
        ) {
          visitComputedPropertyV1(node, scope);
          return;
        }
        const object = asNodeV1(node.object);
        if (object !== null) visitV1(object, scope);
        visitComputedPropertyV1(node, scope);
        return;
      }
      case "Identifier": {
        const name = identifierNameV1(node);
        const binding = name === null ? null : lookupBindingV1(scope, name);
        if (binding?.bootstrap !== null && binding !== null) {
          reportNodeV1("determinism.bootstrap_entropy_escape", node);
        } else if (
          (binding === null && ambientCapabilityRootsV1.has(name ?? "")) ||
          (binding?.provenance?.length === 1 &&
            ambientCapabilityRootsV1.has(binding.provenance[0] ?? ""))
        ) {
          reportNodeV1("determinism.ambient_capability_escape", node);
        } else if (binding === null && name === "crypto") {
          reportNodeV1("determinism.crypto_random", node);
        } else if (binding === null && name === "performance") {
          reportNodeV1("determinism.performance_clock", node);
        } else if (
          binding === null &&
          (name === "fetch" || name === "XMLHttpRequest" || name === "WebSocket")
        ) {
          reportNodeV1("determinism.network", node);
        } else if (binding === null && (name === "Intl" || name === "navigator")) {
          reportNodeV1("determinism.locale", node);
        } else if (binding === null && name === "parseFloat") {
          reportNodeV1("determinism.numeric_parse_float", node);
        } else if (
          binding === null &&
          (name === "document" || name === "window" || name === "localStorage" ||
            name === "sessionStorage")
        ) {
          reportNodeV1("determinism.dom_storage", node);
        }
        return;
      }
      case "NumericLiteral": {
        const raw = typeof asNodeV1(node.extra)?.raw === "string"
          ? String(asNodeV1(node.extra)?.raw)
          : source.slice(nodeStartV1(node), nodeEndV1(node));
        if (!isExactIntegerLiteralV1(raw)) {
          reportNodeV1("determinism.numeric_fractional_literal", node);
        }
        return;
      }
      case "UnaryExpression": {
        const argument = asNodeV1(node.argument);
        const unwrappedArgument = unwrapExpressionV1(argument);
        if (node.operator === "-" && unwrappedArgument?.type === "NumericLiteral") {
          const raw = typeof asNodeV1(unwrappedArgument.extra)?.raw === "string"
            ? String(asNodeV1(unwrappedArgument.extra)?.raw)
            : source.slice(nodeStartV1(unwrappedArgument), nodeEndV1(unwrappedArgument));
          if (!isExactIntegerLiteralV1(raw) || isMathematicalZeroLiteralV1(raw)) {
            reportNodeV1("determinism.numeric_fractional_literal", node);
            return;
          }
        }
        if (argument !== null) visitV1(argument, scope);
        return;
      }
      case "BinaryExpression": {
        if (node.operator === "**") reportNodeV1("determinism.numeric_approximate_math", node);
        const left = asNodeV1(node.left);
        const right = asNodeV1(node.right);
        if (left !== null) visitV1(left, scope);
        if (right !== null) visitV1(right, scope);
        return;
      }
      case "AssignmentExpression": {
        if (node.operator === "**=") {
          reportNodeV1("determinism.numeric_approximate_math", node);
        }
        const right = asNodeV1(node.right);
        const left = asNodeV1(node.left);
        const resolved = resolveExpressionV1(right, scope);
        const staticallyDestructuredAmbientRoot = left?.type === "ObjectPattern" &&
          resolved.provenance?.length === 1 &&
          ambientCapabilityRootsV1.has(resolved.provenance[0] ?? "");
        if (right !== null && !staticallyDestructuredAmbientRoot) visitV1(right, scope);
        if (
          left?.type === "Identifier" || left?.type === "ObjectPattern" ||
          left?.type === "ArrayPattern" || left?.type === "AssignmentPattern" ||
          left?.type === "RestElement"
        ) {
          visitPatternRuntimeV1(left, scope);
          reportPatternCapabilitiesV1(left, resolved);
          assignPatternV1(left, resolved, scope);
        } else if (left !== null) visitV1(left, scope);
        return;
      }
      case "CatchClause": {
        const catchScope = createScopeV1(scope);
        const parameter = asNodeV1(node.param);
        declarePatternV1(parameter, catchScope);
        visitPatternRuntimeV1(parameter, catchScope);
        const body = asNodeV1(node.body);
        if (body?.type === "BlockStatement") {
          visitStatementListV1(asNodesV1(body.body), catchScope);
        }
        return;
      }
      case "ForStatement":
      case "ForInStatement":
      case "ForOfStatement": {
        const loopScope = createScopeV1(scope);
        visitGenericChildrenV1(node, loopScope);
        return;
      }
      case "TSAsExpression":
      case "TSTypeAssertion":
      case "TSNonNullExpression":
      case "TSSatisfiesExpression":
      case "TSInstantiationExpression":
      case "ParenthesizedExpression": {
        const expression = asNodeV1(node.expression);
        if (expression !== null) visitV1(expression, scope);
        return;
      }
      default:
        visitGenericChildrenV1(node, scope);
    }
  }

  const rootScope = createRootScopeV1();
  visitV1(program, rootScope);

  const directivePrefix = "// sillymaker-determinism-allow-next-line ";
  const wholeFilePrefix = "// sillymaker-determinism-allow-file";
  const exemptions: ExemptionV1[] = [];
  const exemptionLines = new Set<number>();
  for (const line of lines) {
    const trimmed = line.text.trim();
    const markerColumn = line.text.indexOf("// sillymaker-determinism-");
    const markerStart = markerColumn < 0 ? -1 : line.start + markerColumn;
    if (markerStart < 0 || !lineCommentStartsV1.has(markerStart)) continue;
    if (trimmed.startsWith(wholeFilePrefix)) {
      const start = markerStart;
      reportV1("determinism.exemption_whole_file", start, line.start + line.text.length);
      continue;
    }
    if (!trimmed.startsWith("// sillymaker-determinism-allow-next-line")) continue;
    const start = markerStart;
    if (!trimmed.startsWith(directivePrefix)) {
      reportV1("determinism.exemption_malformed", start, line.start + line.text.length);
      continue;
    }
    const metadata = parseExemptionMetadataV1(
      trimmed.slice(directivePrefix.length),
      options.isFocusedTestReference ?? (() => false),
    );
    if (metadata === null) {
      reportV1("determinism.exemption_malformed", start, line.start + line.text.length);
      continue;
    }
    exemptions.push({ line, code: metadata.code });
    exemptionLines.add(line.number);
  }

  const suppressed = new Set<MutableDiagnosticV1>();
  for (const exemption of exemptions) {
    const adjacentDirective = exemptionLines.has(exemption.line.number - 1) ||
      exemptionLines.has(exemption.line.number + 1);
    const start = exemption.line.start +
      Math.max(0, exemption.line.text.indexOf("// sillymaker-determinism-"));
    if (adjacentDirective) {
      reportV1(
        "determinism.exemption_duplicate",
        start,
        exemption.line.start + exemption.line.text.length,
      );
      continue;
    }
    const matching = rawDiagnostics
      .filter((diagnostic) =>
        diagnostic.code === exemption.code &&
        locationAtV1(lines, diagnostic.start).line === exemption.line.number + 1
      )
      .sort((left, right) => left.start - right.start || left.end - right.end)[0];
    if (matching === undefined) {
      reportV1(
        "determinism.exemption_stale",
        start,
        exemption.line.start + exemption.line.text.length,
      );
    } else suppressed.add(matching);
  }

  return freezeDiagnosticsV1(
    options.file,
    lines,
    rawDiagnostics.filter((diagnostic) => !suppressed.has(diagnostic)),
  );
}

function freezeDiagnosticsV1(
  file: string,
  lines: readonly SourceLineV1[],
  diagnostics: readonly MutableDiagnosticV1[],
): readonly DeterminismDiagnosticV1[] {
  const sorted = [...diagnostics].sort((left, right) =>
    left.start - right.start || left.end - right.end || compareCodeUnitsV1(left.code, right.code)
  );
  return Object.freeze(sorted.map((diagnostic) => {
    const text = diagnosticTextV1[diagnostic.code] ?? Object.freeze({
      message: "Authoritative determinism check failed.",
      hint: "Review the reported source location.",
    });
    return Object.freeze({
      code: diagnostic.code,
      file,
      range: Object.freeze([diagnostic.start, diagnostic.end] as const),
      start: locationAtV1(lines, diagnostic.start),
      end: locationAtV1(lines, diagnostic.end),
      message: text.message,
      hint: text.hint,
    });
  }));
}
