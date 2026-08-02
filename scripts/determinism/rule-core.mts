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

const mathPrimitiveStaticMembersV1 = new Set([
  "E",
  "LN10",
  "LN2",
  "LOG10E",
  "LOG2E",
  "PI",
  "SQRT1_2",
  "SQRT2",
]);

const numberPrimitiveStaticMembersV1 = new Set([
  "EPSILON",
  "MAX_SAFE_INTEGER",
  "MAX_VALUE",
  "MIN_SAFE_INTEGER",
  "MIN_VALUE",
  "NEGATIVE_INFINITY",
  "NaN",
  "POSITIVE_INFINITY",
  "length",
  "name",
]);

const ambientCapabilityRootsV1 = new Set([
  "Date",
  "Deno",
  "Math",
  "Number",
  "Temporal",
  "globalThis",
  "module",
  "process",
]);

const intrinsicStaticRootsV1 = new Set([
  "Date",
  "Math",
  "Number",
  "String",
  "Temporal",
]);

const constructorTrackedRootsV1 = new Set([
  ...ambientCapabilityRootsV1,
  "String",
]);

const deterministicDateEpochProvenanceV1 = "\0deterministic-date-epoch";
const deterministicDateZoneProvenanceV1 = "\0deterministic-date-zone";
const localDateZoneProvenanceV1 = "\0local-date-zone";
const ambiguousDateInputProvenanceV1 = "\0ambiguous-date-input";
const ambiguousDateInstanceProvenanceV1 = "\0ambiguous-date-instance";
const ambiguousCapabilityProvenanceV1 = "\0ambiguous-capability";
const dynamicRequireLoaderProvenanceV1 = "\0dynamic-require-loader";
const dynamicRequireRiskProvenanceV1 = "\0dynamic-require-risk";
const nodeModuleProvenanceV1 = "\0node-module";

const provenanceTrackedRootsV1 = new Set([
  ...constructorTrackedRootsV1,
  "Intl",
  "WebSocket",
  "XMLHttpRequest",
  "crypto",
  "document",
  "fetch",
  "localStorage",
  "module",
  "navigator",
  "parseFloat",
  "performance",
  "require",
  "sessionStorage",
  "window",
  deterministicDateEpochProvenanceV1,
  deterministicDateZoneProvenanceV1,
  localDateZoneProvenanceV1,
  ambiguousDateInputProvenanceV1,
  ambiguousDateInstanceProvenanceV1,
  ambiguousCapabilityProvenanceV1,
  dynamicRequireLoaderProvenanceV1,
  dynamicRequireRiskProvenanceV1,
  nodeModuleProvenanceV1,
]);

const dateHostDependentMembersV1 = new Set([
  "getDate",
  "getDay",
  "getFullYear",
  "getHours",
  "getMilliseconds",
  "getMinutes",
  "getMonth",
  "getSeconds",
  "getTimezoneOffset",
  "getYear",
  "setDate",
  "setFullYear",
  "setHours",
  "setMilliseconds",
  "setMinutes",
  "setMonth",
  "setSeconds",
  "setYear",
  "toDateString",
  "toString",
  "toTimeString",
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
  "determinism.host_timezone": Object.freeze({
    message: "Authoritative code depends on the Host timezone.",
    hint: "Use an explicit UTC/value operation or commit a canonical recorded zone as input.",
  }),
  "determinism.date_input_unverified": Object.freeze({
    message: "Authoritative Date input is not statically proven deterministic.",
    hint:
      "Use an in-range integer epoch, Date.UTC result, known Date copy, or valid explicit-zone literal.",
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
  "determinism.capability.dynamic_require": Object.freeze({
    message: "Authoritative code acquires or uses a dynamic module loader.",
    hint: "Use a statically admitted ESM dependency instead of require/createRequire.",
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

function importedNameV1(specifier: AstNodeV1): string | null {
  const imported = asNodeV1(specifier.imported);
  return identifierNameV1(imported) ??
    (imported?.type === "StringLiteral" && typeof imported.value === "string"
      ? imported.value
      : null);
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
  if (declaration.declare === true) return;

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
    if (
      declaration.type === "TSImportEqualsDeclaration" &&
      (declaration.importKind === "type" || declaration.isTypeOnly === true)
    ) return;
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
      const importedName = importedNameV1(specifier);
      scope.bootstrapTypes.set(
        name,
        specifier.type === "ImportSpecifier" && sourceName === "@sillymaker/base" &&
          importedName === "BootstrapEntropyV1",
      );
      if (declaration.importKind === "type" || specifier.importKind === "type") continue;
      const binding = declareIdentifierV1(scope, name);
      if (isNodeModuleSpecifierV1(sourceName)) {
        binding.provenance = specifier.type === "ImportSpecifier" && importedName !== null
          ? Object.freeze([nodeModuleProvenanceV1, importedName])
          : Object.freeze([nodeModuleProvenanceV1]);
      }
    }
  }
}

function collectHoistedVarV1(node: AstNodeV1, functionScope: ScopeV1): void {
  if (
    node.type === "FunctionDeclaration" || node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression" || node.type === "ObjectMethod" ||
    node.type === "ClassMethod" || node.type === "ClassPrivateMethod" ||
    node.type === "StaticBlock" || node.type === "TSModuleDeclaration" ||
    node.type === "TSModuleBlock"
  ) return;
  if (node.type === "VariableDeclaration" && node.kind === "var" && node.declare !== true) {
    for (const item of asNodesV1(node.declarations)) {
      const pattern = asNodeV1(item.id);
      declarePatternV1(pattern, functionScope);
      const name = identifierNameV1(pattern);
      if (name === "require" || name === "module") {
        const binding = lookupBindingV1(functionScope, name);
        if (binding !== null) binding.provenance = Object.freeze([name]);
      }
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
      current.type === "TSInstantiationExpression" || current.type === "TypeCastExpression" ||
      current.type === "ParenthesizedExpression")
  ) {
    current = asNodeV1(current.expression);
  }
  return current;
}

function sameProvenanceV1(
  left: readonly string[] | null,
  right: readonly string[] | null,
): boolean {
  return left === right ||
    (left !== null && right !== null && left.length === right.length &&
      left.every((member, index) => member === right[index]));
}

function isDeterministicDateInputProvenanceV1(
  provenance: readonly string[] | null,
): boolean {
  return provenance?.length === 1 &&
    (provenance[0] === deterministicDateEpochProvenanceV1 ||
      provenance[0] === deterministicDateZoneProvenanceV1);
}

function isAnyDateInputProvenanceV1(
  provenance: readonly string[] | null,
): boolean {
  return isDeterministicDateInputProvenanceV1(provenance) ||
    (provenance?.length === 1 && provenance[0] === localDateZoneProvenanceV1);
}

function isTrackedAmbientCapabilityProvenanceV1(
  provenance: readonly string[] | null,
): boolean {
  if (provenance === null || provenance.length === 0) return false;
  const root = provenance[0] ?? "";
  return provenanceTrackedRootsV1.has(root) &&
    root !== deterministicDateEpochProvenanceV1 &&
    root !== deterministicDateZoneProvenanceV1 && root !== localDateZoneProvenanceV1 &&
    root !== ambiguousDateInputProvenanceV1;
}

function isKnownNonCoercingIntrinsicValueV1(
  provenance: readonly string[] | null,
): boolean {
  if (provenance === null || provenance.length === 0) return false;
  const root = provenance[0] ?? "";
  if (!intrinsicStaticRootsV1.has(root)) return false;
  if (provenance.length === 1) return true;
  if (provenance.length === 2) {
    const member = provenance[1] ?? "";
    if (root === "Math") return !mathPrimitiveStaticMembersV1.has(member);
    if (root === "Number") return !numberPrimitiveStaticMembersV1.has(member);
    if (root === "Date" || root === "String") {
      return member !== "length" && member !== "name";
    }
    if (root === "Temporal") return true;
  }
  return provenance.length === 3 && root === "Temporal" &&
    (provenance[2] === "from" || provenance[2] === "compare");
}

function isDateInstancePathV1(provenance: readonly string[] | null): boolean {
  return provenance?.[0] === "Date" &&
    (provenance[1] === "instance" || provenance[1] === "prototype") &&
    provenance[2] !== "constructor";
}

function isDateInstanceValueV1(provenance: readonly string[] | null): boolean {
  return provenance?.length === 2 && provenance[0] === "Date" && provenance[1] === "instance";
}

function conservativeProvenanceJoinV1(
  left: readonly string[] | null,
  right: readonly string[] | null,
): readonly string[] | null {
  if (sameProvenanceV1(left, right)) return left;
  if (isDynamicRequireProvenanceV1(left) || isDynamicRequireProvenanceV1(right)) {
    return Object.freeze([dynamicRequireRiskProvenanceV1]);
  }
  const leftDateInstance = isDateInstancePathV1(left) ||
    left?.[0] === ambiguousDateInstanceProvenanceV1;
  const rightDateInstance = isDateInstancePathV1(right) ||
    right?.[0] === ambiguousDateInstanceProvenanceV1;
  if (leftDateInstance || rightDateInstance) {
    return Object.freeze([ambiguousDateInstanceProvenanceV1]);
  }
  const leftDateInput = isAnyDateInputProvenanceV1(left) ||
    left?.[0] === ambiguousDateInputProvenanceV1;
  const rightDateInput = isAnyDateInputProvenanceV1(right) ||
    right?.[0] === ambiguousDateInputProvenanceV1;
  if (leftDateInput || rightDateInput) {
    return Object.freeze([ambiguousDateInputProvenanceV1]);
  }
  const leftDateCapability = left?.[0] === "Date";
  const rightDateCapability = right?.[0] === "Date";
  if (leftDateCapability || rightDateCapability) {
    return Object.freeze([ambiguousCapabilityProvenanceV1]);
  }
  const leftTracked = left !== null && provenanceTrackedRootsV1.has(left[0] ?? "");
  const rightTracked = right !== null && provenanceTrackedRootsV1.has(right[0] ?? "");
  if (leftTracked && rightTracked) return Object.freeze([ambiguousCapabilityProvenanceV1]);
  if (leftTracked) return left;
  if (rightTracked) return right;
  return null;
}

function isLeapYearV1(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isExplicitZoneDateLiteralV1(node: AstNodeV1 | null): boolean {
  const expression = unwrapExpressionV1(node);
  if (expression?.type !== "StringLiteral" || typeof expression.value !== "string") return false;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{3})?(?:Z|([+-])(\d{2}):(\d{2}))$/u
      .exec(expression.value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[8] === undefined ? 0 : Number(match[8]);
  const offsetMinute = match[9] === undefined ? 0 : Number(match[9]);
  const daysInMonth = month === 2
    ? isLeapYearV1(year) ? 29 : 28
    : month === 4 || month === 6 || month === 9 || month === 11
    ? 30
    : 31;
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth &&
    hour <= 23 && minute <= 59 && second <= 59 && offsetHour <= 23 && offsetMinute <= 59;
}

function isLocalZoneDateLiteralV1(node: AstNodeV1 | null): boolean {
  const expression = unwrapExpressionV1(node);
  if (expression?.type !== "StringLiteral" || typeof expression.value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/u.exec(
    expression.value,
  );
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] === undefined ? 0 : Number(match[6]);
  const daysInMonth = month === 2
    ? isLeapYearV1(year) ? 29 : 28
    : month === 4 || month === 6 || month === 9 || month === 11
    ? 30
    : 31;
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth &&
    hour <= 23 && minute <= 59 && second <= 59;
}

function isInRangeIntegerEpochLiteralV1(node: AstNodeV1 | null): boolean {
  const expression = unwrapExpressionV1(node);
  let value: number | null = null;
  if (expression?.type === "NumericLiteral" && typeof expression.value === "number") {
    value = expression.value;
  } else if (
    expression?.type === "UnaryExpression" &&
    (expression.operator === "+" || expression.operator === "-")
  ) {
    const argument = unwrapExpressionV1(asNodeV1(expression.argument));
    if (argument?.type === "NumericLiteral" && typeof argument.value === "number") {
      value = expression.operator === "-" ? -argument.value : argument.value;
    }
  }
  return value !== null && Number.isInteger(value) && Number.isFinite(value) &&
    Math.abs(value) <= 8_640_000_000_000_000;
}

function normalizedConstructorMembersV1(
  provenance: readonly string[] | null,
  root: "Date" | "String",
): readonly string[] | null {
  if (provenance?.[0] !== root) return null;
  let members = provenance.slice(1);
  while (
    (members[0] === "prototype" || members[0] === "instance") &&
    members[1] === "constructor"
  ) {
    members = members.slice(2);
  }
  if (members[0] === "prototype" || members[0] === "instance") return null;
  return members;
}

function dateCallableKindV1(
  provenance: readonly string[] | null,
): "constructor" | "now" | "parse" | "utc" | "other" | null {
  const members = normalizedConstructorMembersV1(provenance, "Date");
  if (members === null) return null;
  const target = members[0];
  if (target === undefined) return "constructor";
  if (
    members.length === 1 && (target === "call" || target === "apply" || target === "bind")
  ) return "constructor";
  const wrapper = members[1];
  if (
    members.length > 2 ||
    (members.length === 2 && wrapper !== "call" && wrapper !== "apply" && wrapper !== "bind")
  ) return "other";
  if (target === "now") return "now";
  if (target === "parse") return "parse";
  if (target === "UTC") return "utc";
  return "other";
}

function isDateCallableBindV1(provenance: readonly string[] | null): boolean {
  const members = normalizedConstructorMembersV1(provenance, "Date");
  if (members === null) return false;
  return (members.length === 1 && members[0] === "bind") ||
    (members.length === 2 &&
      (members[0] === "now" || members[0] === "parse" || members[0] === "UTC") &&
      members[1] === "bind");
}

function isDateInstanceProvenanceV1(provenance: readonly string[] | null): boolean {
  return isDateInstancePathV1(provenance) ||
    provenance?.[0] === ambiguousDateInstanceProvenanceV1;
}

function isAmbientConstructorEscapeProvenanceV1(
  provenance: readonly string[] | null,
): boolean {
  if (
    provenance === null ||
    !constructorTrackedRootsV1.has(provenance[0] ?? "") ||
    !provenance.slice(1).includes("constructor")
  ) return false;
  const root = provenance[0];
  let members = provenance.slice(1);
  if (root === "Date" || root === "String") {
    while (
      (members[0] === "prototype" || members[0] === "instance") &&
      members[1] === "constructor"
    ) {
      members = members.slice(2);
    }
  }
  return members.includes("constructor");
}

function isNodeModuleSpecifierV1(specifier: string | null): boolean {
  return specifier === "module" || specifier === "node:module";
}

function isCreateRequireFactoryProvenanceV1(
  provenance: readonly string[] | null,
): boolean {
  return provenance?.[0] === nodeModuleProvenanceV1 &&
    provenance.slice(1).includes("createRequire");
}

function isDynamicRequireProvenanceV1(provenance: readonly string[] | null): boolean {
  return provenance?.[0] === "require" ||
    (provenance?.[0] === "module" && provenance[1] === "require") ||
    provenance?.[0] === dynamicRequireLoaderProvenanceV1 ||
    provenance?.[0] === dynamicRequireRiskProvenanceV1 ||
    isCreateRequireFactoryProvenanceV1(provenance);
}

function mayProduceDynamicRequireV1(provenance: readonly string[] | null): boolean {
  return isDynamicRequireProvenanceV1(provenance) ||
    provenance?.[0] === "module" ||
    (provenance?.length === 1 && provenance[0] === nodeModuleProvenanceV1);
}

type StringCallableV1 = Readonly<{
  kind: "constructor" | "raw";
  wrapper: "call" | "apply" | "bind" | null;
}>;

type StaticArgumentVectorV1 = Readonly<{
  prefix: readonly (AstNodeV1 | null)[];
  hasUnknownTail: boolean;
}>;

function stringCallableV1(provenance: readonly string[] | null): StringCallableV1 | null {
  const members = normalizedConstructorMembersV1(provenance, "String");
  if (members === null) return null;
  const target = members[0];
  if (
    target === undefined ||
    (members.length === 1 && (target === "call" || target === "apply" || target === "bind"))
  ) {
    return Object.freeze({
      kind: "constructor",
      wrapper: target ?? null,
    });
  }
  if (target !== "raw" || members.length > 2) return null;
  const wrapper = members[1];
  if (
    wrapper !== undefined && wrapper !== "call" && wrapper !== "apply" && wrapper !== "bind"
  ) return null;
  return Object.freeze({
    kind: "raw",
    wrapper: wrapper ?? null,
  });
}

function isUnsupportedStringCallablePathV1(
  provenance: readonly string[] | null,
): boolean {
  const members = normalizedConstructorMembersV1(provenance, "String");
  if (members === null) return false;
  if (members[0] === "call" || members[0] === "apply" || members[0] === "bind") {
    return members.length > 1;
  }
  return members[0] === "raw" &&
    (members[1] === "call" || members[1] === "apply" || members[1] === "bind") &&
    members.length > 2;
}

function dateCoercionDiagnosticV1(
  provenance: readonly string[] | null,
): "determinism.host_timezone" | "determinism.ambient_capability_escape" | null {
  if (
    isDateInstanceValueV1(provenance) ||
    (provenance?.length === 1 && provenance[0] === ambiguousDateInstanceProvenanceV1)
  ) return "determinism.host_timezone";
  return isDateInstancePathV1(provenance) ||
      provenance?.[0] === ambiguousDateInstanceProvenanceV1
    ? "determinism.ambient_capability_escape"
    : null;
}

function isExactHostDependentDateOperationV1(
  provenance: readonly string[] | null,
): boolean {
  let members: readonly string[];
  if (
    provenance?.[0] === "Date" &&
    (provenance[1] === "instance" || provenance[1] === "prototype")
  ) {
    members = provenance.slice(2);
  } else if (provenance?.[0] === ambiguousDateInstanceProvenanceV1) {
    members = provenance.slice(1);
  } else return false;
  return dateHostDependentMembersV1.has(members[0] ?? "") &&
    (members.length === 1 ||
      (members.length === 2 &&
        (members[1] === "call" || members[1] === "apply")));
}

function expandStaticArgumentItemsV1(items: unknown): StaticArgumentVectorV1 {
  if (!Array.isArray(items)) return { prefix: Object.freeze([]), hasUnknownTail: true };
  const prefix: (AstNodeV1 | null)[] = [];
  for (const item of items) {
    if (item === null) {
      prefix.push(null);
      continue;
    }
    if (!isNodeV1(item) || item.type === "ArgumentPlaceholder") {
      return { prefix: Object.freeze(prefix), hasUnknownTail: true };
    }
    if (item.type !== "SpreadElement") {
      prefix.push(item);
      continue;
    }
    const spread = unwrapExpressionV1(asNodeV1(item.argument));
    if (spread?.type !== "ArrayExpression") {
      return { prefix: Object.freeze(prefix), hasUnknownTail: true };
    }
    const expanded = expandStaticArgumentItemsV1(spread.elements);
    prefix.push(...expanded.prefix);
    if (expanded.hasUnknownTail) {
      return { prefix: Object.freeze(prefix), hasUnknownTail: true };
    }
  }
  return { prefix: Object.freeze(prefix), hasUnknownTail: false };
}

function stringEffectiveArgumentsV1(
  node: AstNodeV1,
  callable: StringCallableV1,
  scope: ScopeV1,
): StaticArgumentVectorV1 {
  const callArguments = expandStaticArgumentItemsV1(node.arguments);
  if (callable.wrapper === null) return callArguments;
  if (callable.wrapper === "bind") {
    return { prefix: Object.freeze([]), hasUnknownTail: true };
  }
  if (callable.wrapper === "call") {
    if (callArguments.prefix.length === 0) {
      return {
        prefix: Object.freeze([]),
        hasUnknownTail: callArguments.hasUnknownTail,
      };
    }
    return {
      prefix: Object.freeze(callArguments.prefix.slice(1)),
      hasUnknownTail: callArguments.hasUnknownTail,
    };
  }

  if (callArguments.prefix.length < 2) {
    return {
      prefix: Object.freeze([]),
      hasUnknownTail: callArguments.hasUnknownTail,
    };
  }
  const carrierNode = callArguments.prefix[1] ?? null;
  const carrier = unwrapExpressionV1(carrierNode);
  const unshadowedUndefined = carrier?.type === "Identifier" &&
    identifierNameV1(carrier) === "undefined" && lookupBindingV1(scope, "undefined") === null;
  if (
    carrierNode === null || carrier?.type === "NullLiteral" ||
    carrier?.type === "UnaryExpression" && carrier.operator === "void" || unshadowedUndefined
  ) {
    return { prefix: Object.freeze([]), hasUnknownTail: false };
  }
  if (carrier?.type !== "ArrayExpression") {
    return { prefix: Object.freeze([]), hasUnknownTail: true };
  }
  return expandStaticArgumentItemsV1(carrier.elements);
}

function dateInvocationArgumentsV1(
  node: AstNodeV1,
  provenance: readonly string[] | null,
): readonly AstNodeV1[] | null {
  const members = normalizedConstructorMembersV1(provenance, "Date");
  if (members === null) return null;
  const target = members[0];
  const wrapper = target === "parse" || target === "UTC" ? members[1] : target;
  const argumentsV1 = asNodesV1(node.arguments);
  if (wrapper === undefined) return argumentsV1;
  if (wrapper === "call") return argumentsV1.slice(1);
  if (wrapper !== "apply" || argumentsV1.length !== 2) return null;
  const argumentArray = unwrapExpressionV1(argumentsV1[1] ?? null);
  if (argumentArray?.type !== "ArrayExpression" || !Array.isArray(argumentArray.elements)) {
    return null;
  }
  const elements: AstNodeV1[] = [];
  for (const element of argumentArray.elements) {
    if (!isNodeV1(element) || element.type === "SpreadElement") return null;
    elements.push(element);
  }
  return elements;
}

function isSafeDateParseInputV1(node: AstNodeV1 | null, scope: ScopeV1): boolean {
  const provenance = resolveExpressionV1(node, scope).provenance;
  return provenance?.length === 1 && provenance[0] === deterministicDateZoneProvenanceV1;
}

function isSafeDateConstructorInputV1(node: AstNodeV1 | null, scope: ScopeV1): boolean {
  const provenance = resolveExpressionV1(node, scope).provenance;
  return isDeterministicDateInputProvenanceV1(provenance) ||
    isDateInstanceValueV1(provenance);
}

function isLocalZoneDateInputV1(node: AstNodeV1 | null, scope: ScopeV1): boolean {
  const provenance = resolveExpressionV1(node, scope).provenance;
  return provenance?.length === 1 && provenance[0] === localDateZoneProvenanceV1;
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

  if (isInRangeIntegerEpochLiteralV1(expression)) {
    return {
      provenance: Object.freeze([deterministicDateEpochProvenanceV1]),
      bootstrap: null,
    };
  }

  if (isExplicitZoneDateLiteralV1(expression)) {
    return {
      provenance: Object.freeze([deterministicDateZoneProvenanceV1]),
      bootstrap: null,
    };
  }

  if (isLocalZoneDateLiteralV1(expression)) {
    return {
      provenance: Object.freeze([localDateZoneProvenanceV1]),
      bootstrap: null,
    };
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
    if (
      stringCallableV1(callee.provenance)?.kind === "constructor" &&
      argumentsV1.every(({ type }) => type !== "SpreadElement")
    ) {
      return { provenance: Object.freeze(["String", "instance"]), bootstrap: null };
    }
  }

  if (expression.type === "CallExpression" || expression.type === "OptionalCallExpression") {
    const callee = resolveExpressionV1(asNodeV1(expression.callee), scope);
    if (isCreateRequireFactoryProvenanceV1(callee.provenance)) {
      return {
        provenance: Object.freeze([dynamicRequireLoaderProvenanceV1]),
        bootstrap: null,
      };
    }
    const callable = dateCallableKindV1(callee.provenance);
    if (callable === "utc" && !isDateCallableBindV1(callee.provenance)) {
      return {
        provenance: Object.freeze([deterministicDateEpochProvenanceV1]),
        bootstrap: null,
      };
    }
    if (callable === "parse" && !isDateCallableBindV1(callee.provenance)) {
      const argumentsV1 = dateInvocationArgumentsV1(expression, callee.provenance);
      if (
        argumentsV1?.length === 1 && isSafeDateParseInputV1(argumentsV1[0] ?? null, scope)
      ) {
        return {
          provenance: Object.freeze([deterministicDateEpochProvenanceV1]),
          bootstrap: null,
        };
      }
    }
    const calleeProvenance = callee.provenance;
    if (
      isDateInstancePathV1(calleeProvenance) &&
      (calleeProvenance?.[2] === "getTime" || calleeProvenance?.[2] === "valueOf") &&
      calleeProvenance.length === 3
    ) {
      return {
        provenance: Object.freeze([deterministicDateEpochProvenanceV1]),
        bootstrap: null,
      };
    }
  }

  if (expression.type === "ConditionalExpression" || expression.type === "LogicalExpression") {
    const left = expression.type === "ConditionalExpression"
      ? asNodeV1(expression.consequent)
      : asNodeV1(expression.left);
    const right = expression.type === "ConditionalExpression"
      ? asNodeV1(expression.alternate)
      : asNodeV1(expression.right);
    const leftResolved = resolveExpressionV1(left, scope);
    const rightResolved = resolveExpressionV1(right, scope);
    return {
      provenance: conservativeProvenanceJoinV1(
        leftResolved.provenance,
        rightResolved.provenance,
      ),
      bootstrap: leftResolved.bootstrap ?? rightResolved.bootstrap,
    };
  }

  if (expression.type === "SequenceExpression") {
    const expressions = asNodesV1(expression.expressions);
    return resolveExpressionV1(expressions.at(-1) ?? null, scope);
  }

  if (expression.type === "AssignmentExpression" && expression.operator === "=") {
    return resolveExpressionV1(asNodeV1(expression.right), scope);
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
  mode: "const" | "mutable" | "join" | "const_join",
): void {
  pattern = unwrapExpressionV1(pattern);
  if (pattern === null) return;
  if (pattern.type === "Identifier") {
    const name = identifierNameV1(pattern);
    const binding = name === null ? null : lookupBindingV1(scope, name);
    if (binding !== null) {
      const provenance = mode === "const" || mode === "const_join" ||
          !isAnyDateInputProvenanceV1(resolved.provenance)
        ? resolved.provenance
        : Object.freeze([ambiguousDateInputProvenanceV1]);
      binding.provenance = mode === "join" || mode === "const_join"
        ? conservativeProvenanceJoinV1(binding.provenance, provenance)
        : provenance;
      binding.bootstrap = resolved.bootstrap === null ? null : "forbidden";
    }
    return;
  }
  if (pattern.type === "AssignmentPattern") {
    const fallback = resolveExpressionV1(asNodeV1(pattern.right), scope);
    assignPatternV1(
      asNodeV1(pattern.left),
      {
        provenance: conservativeProvenanceJoinV1(
          resolved.provenance,
          fallback.provenance,
        ),
        bootstrap: resolved.bootstrap ?? fallback.bootstrap,
      },
      scope,
      mode,
    );
    return;
  }
  if (pattern.type === "ArrayPattern") {
    for (const element of asNodesV1(pattern.elements)) {
      assignPatternV1(element, { provenance: null, bootstrap: null }, scope, mode);
    }
    return;
  }
  if (pattern.type === "ObjectPattern") {
    for (const property of asNodesV1(pattern.properties)) {
      if (property.type === "RestElement") {
        const provenance = mayProduceDynamicRequireV1(resolved.provenance)
          ? Object.freeze([dynamicRequireRiskProvenanceV1])
          : null;
        assignPatternV1(
          asNodeV1(property.argument),
          { provenance, bootstrap: resolved.bootstrap },
          scope,
          mode,
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
        : mayProduceDynamicRequireV1(resolved.provenance)
        ? Object.freeze([dynamicRequireRiskProvenanceV1])
        : null;
      assignPatternV1(
        asNodeV1(property.value),
        { provenance, bootstrap: resolved.bootstrap },
        scope,
        mode,
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
    /^(?:http|https|net|tls|dns|dgram|crypto|process|perf_hooks|fs|os|child_process|module)(?:\/|$)/u
      .test(normalized) ||
    /^node:(?:http|https|net|tls|dns|dgram|crypto|process|perf_hooks|fs|os|child_process|module)(?:\/|$)/u
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
    createImportExpressions: true,
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
  let traversalDiagnosticsEnabledV1 = false;

  const recordDiagnosticV1 = (code: string, startInput: number, endInput: number): void => {
    const start = Math.max(0, Math.min(source.length, startInput));
    const end = Math.max(start, Math.min(source.length, endInput));
    const key = `${code}:${start}:${end}`;
    if (diagnosticKeys.has(key)) return;
    diagnosticKeys.add(key);
    rawDiagnostics.push({ code, start, end });
  };
  const reportV1 = (code: string, startInput: number, endInput: number): void => {
    if (!traversalDiagnosticsEnabledV1) return;
    recordDiagnosticV1(code, startInput, endInput);
  };

  let program: AstNodeV1;
  try {
    program = parseDeterminismAstV1(options.file, source);
  } catch (error) {
    const position = typeof error === "object" && error !== null &&
        typeof (error as { pos?: unknown }).pos === "number"
      ? (error as { pos: number }).pos
      : 0;
    recordDiagnosticV1("determinism.source_parse_failed", position, position);
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
    scope: ScopeV1,
  ): string | null => {
    if (provenance === null || provenance.length === 0) return null;
    const root = provenance[0];
    const members = provenance.slice(1);
    if (
      root === ambiguousCapabilityProvenanceV1 ||
      root === ambiguousDateInstanceProvenanceV1
    ) {
      if (members.some((name) => dateHostDependentMembersV1.has(name))) {
        return mode === "call" && isExactHostDependentDateOperationV1(provenance)
          ? "determinism.host_timezone"
          : "determinism.ambient_capability_escape";
      }
      return "determinism.ambient_capability_escape";
    }
    if (isDynamicRequireProvenanceV1(provenance)) {
      return "determinism.capability.dynamic_require";
    }
    if (root === "module") return "determinism.ambient_capability_escape";
    if (isAmbientConstructorEscapeProvenanceV1(provenance)) {
      return "determinism.ambient_capability_escape";
    }
    if (root === "Math" && members.includes("random")) {
      return "determinism.ambient_random";
    }
    if (
      root === "crypto" &&
      (members.includes("getRandomValues") || members.includes("randomUUID"))
    ) return "determinism.crypto_random";
    if (root === "Date") {
      if (
        isDateInstanceProvenanceV1(provenance) &&
        members.some((name) => dateHostDependentMembersV1.has(name))
      ) {
        return mode === "call" && isExactHostDependentDateOperationV1(provenance)
          ? "determinism.host_timezone"
          : "determinism.ambient_capability_escape";
      }
      const callableKind = dateCallableKindV1(provenance);
      if (isDateCallableBindV1(provenance)) {
        return "determinism.ambient_capability_escape";
      }
      if (callableKind === "constructor" && mode === "call") {
        return "determinism.ambient_clock";
      }
      if (callableKind === "constructor" && mode === "new") {
        const argumentsV1 = asNodesV1(node.arguments);
        if (argumentsV1.length === 0) {
          return "determinism.ambient_clock";
        }
        if (argumentsV1.some(({ type }) => type === "SpreadElement")) {
          const onlyArgument = argumentsV1.length === 1 ? argumentsV1[0] : undefined;
          const spreadValue = onlyArgument?.type === "SpreadElement"
            ? unwrapExpressionV1(asNodeV1(onlyArgument.argument))
            : null;
          return spreadValue?.type === "ArrayExpression" &&
              Array.isArray(spreadValue.elements) && spreadValue.elements.length === 0
            ? "determinism.ambient_clock"
            : "determinism.date_input_unverified";
        }
        if (argumentsV1.length > 1) return "determinism.host_timezone";
        if (!isSafeDateConstructorInputV1(argumentsV1[0] ?? null, scope)) {
          return isLocalZoneDateInputV1(argumentsV1[0] ?? null, scope)
            ? "determinism.host_timezone"
            : "determinism.date_input_unverified";
        }
      }
      if (callableKind === "constructor" && mode === "member") {
        return "determinism.ambient_capability_escape";
      }
      if (callableKind === "now") return "determinism.ambient_clock";
      if (callableKind === "parse" && mode === "call") {
        const argumentsV1 = dateInvocationArgumentsV1(node, provenance);
        if (argumentsV1?.length === 1 && isSafeDateParseInputV1(argumentsV1[0] ?? null, scope)) {
          return null;
        }
        return argumentsV1?.length === 1 &&
            isLocalZoneDateInputV1(argumentsV1[0] ?? null, scope)
          ? "determinism.host_timezone"
          : "determinism.date_input_unverified";
      }
      if (callableKind === "other") return "determinism.ambient_capability_escape";
    }
    if (root === "String" && stringCallableV1(provenance)?.wrapper === "bind") {
      return "determinism.ambient_capability_escape";
    }
    if (root === "String" && isUnsupportedStringCallablePathV1(provenance)) {
      return "determinism.ambient_capability_escape";
    }
    if (root === "Temporal" && members.includes("Now")) {
      return mode === "member" && members.length === 1
        ? "determinism.ambient_capability_escape"
        : "determinism.ambient_clock";
    }
    if (root === "performance" && members.length > 0) {
      return "determinism.performance_clock";
    }
    if (
      (root === "fetch" && provenance.length === 1) ||
      ((root === "XMLHttpRequest" || root === "WebSocket") && provenance.length === 1)
    ) return "determinism.network";
    if ((root === "Deno" || root === "process") && members.length > 0) {
      return "determinism.environment";
    }
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

  const visitPropertyKeyV1 = (key: AstNodeV1 | null, scope: ScopeV1): void => {
    if (key === null) return;
    visitV1(key, scope);
    const code = dateCoercionDiagnosticV1(resolveExpressionV1(key, scope).provenance);
    if (code !== null) reportNodeV1(code, key);
  };

  const visitComputedPropertyV1 = (node: AstNodeV1, scope: ScopeV1): void => {
    if (node.computed !== true || staticPropertyNameV1(node) !== null) return;
    visitPropertyKeyV1(asNodeV1(node.property), scope);
  };

  const equalitySkipsObjectToPrimitiveV1 = (
    node: AstNodeV1 | null,
    scope: ScopeV1,
  ): boolean => {
    const expression = unwrapExpressionV1(node);
    if (
      expression === null || expression.type === "NullLiteral" ||
      expression.type === "MetaProperty"
    ) return true;
    if (
      expression.type === "Identifier" && identifierNameV1(expression) === "undefined" &&
      lookupBindingV1(scope, "undefined") === null
    ) return true;
    if (expression.type === "UnaryExpression" && expression.operator === "void") return true;
    if (
      expression.type === "ObjectExpression" || expression.type === "ArrayExpression" ||
      expression.type === "FunctionExpression" || expression.type === "ArrowFunctionExpression" ||
      expression.type === "ClassExpression" || expression.type === "NewExpression" ||
      expression.type === "RegExpLiteral"
    ) return true;
    const provenance = resolveExpressionV1(expression, scope).provenance;
    return isDateInstanceValueV1(provenance) ||
      (provenance?.length === 2 && provenance[0] === "Date" && provenance[1] === "prototype") ||
      (provenance?.length === 1 && isTrackedAmbientCapabilityProvenanceV1(provenance)) ||
      isKnownNonCoercingIntrinsicValueV1(provenance) ||
      (dateCallableKindV1(provenance) !== null && dateCallableKindV1(provenance) !== "other") ||
      stringCallableV1(provenance) !== null;
  };

  const visitRuntimeValueProducerV1 = (node: AstNodeV1 | null, scope: ScopeV1): void => {
    const expression = unwrapExpressionV1(node);
    if (expression === null) return;
    if (
      expression.type === "Identifier" || expression.type === "ThisExpression" ||
      expression.type === "Super" || expression.type.endsWith("Literal")
    ) return;
    if (
      expression.type === "MemberExpression" || expression.type === "OptionalMemberExpression"
    ) {
      const object = asNodeV1(expression.object);
      visitRuntimeValueProducerV1(object, scope);
      visitComputedPropertyV1(expression, scope);
      if (
        staticPropertyNameV1(expression) === null &&
        isTrackedAmbientCapabilityProvenanceV1(resolveExpressionV1(object, scope).provenance)
      ) {
        const objectProvenance = resolveExpressionV1(object, scope).provenance;
        reportNodeV1(
          mayProduceDynamicRequireV1(objectProvenance)
            ? "determinism.capability.dynamic_require"
            : "determinism.ambient_capability_escape",
          expression,
        );
      }
      return;
    }
    if (expression.type === "SequenceExpression") {
      const expressions = asNodesV1(expression.expressions);
      for (const item of expressions.slice(0, -1)) visitV1(item, scope);
      visitRuntimeValueProducerV1(expressions.at(-1) ?? null, scope);
      return;
    }
    if (expression.type === "ConditionalExpression") {
      const test = asNodeV1(expression.test);
      if (test !== null) visitV1(test, scope);
      visitRuntimeValueProducerV1(asNodeV1(expression.consequent), scope);
      visitRuntimeValueProducerV1(asNodeV1(expression.alternate), scope);
      return;
    }
    if (expression.type === "LogicalExpression") {
      const left = asNodeV1(expression.left);
      if (left !== null) visitV1(left, scope);
      visitRuntimeValueProducerV1(asNodeV1(expression.right), scope);
      return;
    }
    visitV1(expression, scope);
  };

  const inspectWriteTargetV1 = (targetNode: AstNodeV1 | null, scope: ScopeV1): void => {
    const target = unwrapExpressionV1(targetNode);
    if (target === null) return;
    if (target.type === "Identifier") {
      const name = identifierNameV1(target);
      if (
        name !== null && lookupBindingV1(scope, name) === null &&
        isTrackedAmbientCapabilityProvenanceV1(Object.freeze([name]))
      ) {
        const provenance = Object.freeze([name]);
        reportNodeV1(
          isDynamicRequireProvenanceV1(provenance)
            ? "determinism.capability.dynamic_require"
            : "determinism.ambient_capability_escape",
          target,
        );
      }
      return;
    }
    if (target.type === "MemberExpression" || target.type === "OptionalMemberExpression") {
      const object = asNodeV1(target.object);
      visitRuntimeValueProducerV1(object, scope);
      visitComputedPropertyV1(target, scope);
      const provenance = resolveExpressionV1(target, scope).provenance;
      const objectProvenance = resolveExpressionV1(object, scope).provenance;
      if (
        isTrackedAmbientCapabilityProvenanceV1(provenance) ||
        isTrackedAmbientCapabilityProvenanceV1(objectProvenance)
      ) {
        reportNodeV1(
          isDynamicRequireProvenanceV1(provenance) ||
            (staticPropertyNameV1(target) === null &&
              mayProduceDynamicRequireV1(objectProvenance))
            ? "determinism.capability.dynamic_require"
            : "determinism.ambient_capability_escape",
          target,
        );
      }
      return;
    }
    if (target.type === "AssignmentPattern" || target.type === "RestElement") {
      inspectWriteTargetV1(
        asNodeV1(target.type === "AssignmentPattern" ? target.left : target.argument),
        scope,
      );
      return;
    }
    if (target.type === "ArrayPattern") {
      for (const element of asNodesV1(target.elements)) inspectWriteTargetV1(element, scope);
      return;
    }
    if (target.type === "ObjectPattern") {
      for (const property of asNodesV1(target.properties)) {
        inspectWriteTargetV1(
          asNodeV1(property.type === "RestElement" ? property.argument : property.value),
          scope,
        );
      }
    }
  };

  const visitPatternRuntimeV1 = (pattern: AstNodeV1 | null, scope: ScopeV1): void => {
    pattern = unwrapExpressionV1(pattern);
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
          visitPropertyKeyV1(asNodeV1(property.key), scope);
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
    scope: ScopeV1,
  ): void => {
    pattern = unwrapExpressionV1(pattern);
    if (pattern === null) return;
    if (pattern.type === "AssignmentPattern") {
      reportPatternCapabilitiesV1(asNodeV1(pattern.left), resolved, scope);
      return;
    }
    if (pattern.type !== "ObjectPattern") return;
    for (const property of asNodesV1(pattern.properties)) {
      if (property.type === "RestElement") {
        if (resolved.bootstrap !== null) {
          reportNodeV1("determinism.bootstrap_entropy_escape", property);
        } else if (mayProduceDynamicRequireV1(resolved.provenance)) {
          reportNodeV1("determinism.capability.dynamic_require", property);
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
        : mayProduceDynamicRequireV1(resolved.provenance)
        ? Object.freeze([dynamicRequireRiskProvenanceV1])
        : null;
      const derived = { provenance, bootstrap: resolved.bootstrap };
      if (derived.bootstrap !== null) {
        reportNodeV1("determinism.bootstrap_entropy_escape", property);
      } else {
        const code = classifyProvenanceV1(derived.provenance, property, "member", scope);
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
      reportPatternCapabilitiesV1(asNodeV1(property.value), derived, scope);
    }
  };

  const stringRawCarrierValuesV1 = (
    carrierNode: AstNodeV1 | null,
    scope: ScopeV1,
  ): Readonly<{
    values: readonly AstNodeV1[];
    substitutionLimit: number;
    uncertain: boolean;
  }> => {
    const isStaticallyPrimitiveOrNullV1 = (node: AstNodeV1 | null): boolean => {
      const value = unwrapExpressionV1(node);
      if (value === null || value.type === "NullLiteral") return true;
      if (
        value.type === "Identifier" && identifierNameV1(value) === "undefined" &&
        lookupBindingV1(scope, "undefined") === null
      ) return true;
      if (
        value.type === "StringLiteral" || value.type === "NumericLiteral" ||
        value.type === "BooleanLiteral" || value.type === "BigIntLiteral" ||
        value.type === "DecimalLiteral" || value.type === "TemplateLiteral" ||
        value.type === "UnaryExpression" || value.type === "BinaryExpression" ||
        value.type === "UpdateExpression"
      ) return true;
      if (value.type === "SequenceExpression") {
        const expressions = asNodesV1(value.expressions);
        return isStaticallyPrimitiveOrNullV1(expressions.at(-1) ?? null);
      }
      if (value.type === "ConditionalExpression") {
        return isStaticallyPrimitiveOrNullV1(asNodeV1(value.consequent)) &&
          isStaticallyPrimitiveOrNullV1(asNodeV1(value.alternate));
      }
      if (value.type === "LogicalExpression") {
        return isStaticallyPrimitiveOrNullV1(asNodeV1(value.left)) &&
          isStaticallyPrimitiveOrNullV1(asNodeV1(value.right));
      }
      return false;
    };
    const prototypeSetterMaySupplyPropertiesV1 = (property: AstNodeV1): boolean => {
      if (
        property.type !== "ObjectProperty" || property.computed === true ||
        property.shorthand === true || staticKeyNameV1(property) !== "__proto__"
      ) return false;
      return !isStaticallyPrimitiveOrNullV1(asNodeV1(property.value));
    };
    const carrier = unwrapExpressionV1(carrierNode);
    const unshadowedUndefined = carrier?.type === "Identifier" &&
      identifierNameV1(carrier) === "undefined" && lookupBindingV1(scope, "undefined") === null;
    if (
      carrierNode === null || carrier?.type === "NullLiteral" ||
      carrier?.type === "UnaryExpression" && carrier.operator === "void" || unshadowedUndefined
    ) {
      return { values: Object.freeze([]), substitutionLimit: 0, uncertain: false };
    }
    if (carrier?.type !== "ObjectExpression") {
      return { values: Object.freeze([]), substitutionLimit: 0, uncertain: true };
    }
    let rawNode: AstNodeV1 | null = null;
    let uncertain = false;
    let inheritedRaw = false;
    for (const property of asNodesV1(carrier.properties)) {
      if (property.type === "SpreadElement") {
        uncertain = true;
        continue;
      }
      const key = staticKeyNameV1(property);
      if (key === null) {
        uncertain = true;
        continue;
      }
      if (key === "__proto__" && property.computed !== true) {
        inheritedRaw ||= prototypeSetterMaySupplyPropertiesV1(property);
        continue;
      }
      if (key !== "raw") continue;
      if (property.type !== "ObjectProperty") {
        uncertain = true;
        continue;
      }
      rawNode = asNodeV1(property.value);
    }
    if (rawNode === null) {
      return {
        values: Object.freeze([]),
        substitutionLimit: 0,
        uncertain: uncertain || inheritedRaw,
      };
    }
    const raw = unwrapExpressionV1(rawNode);
    if (raw?.type === "StringLiteral" && typeof raw.value === "string") {
      return {
        values: Object.freeze([]),
        substitutionLimit: Math.max(0, raw.value.length - 1),
        uncertain,
      };
    }
    if (raw?.type === "ArrayExpression") {
      const expanded = expandStaticArgumentItemsV1(raw.elements);
      return {
        values: Object.freeze(expanded.prefix.filter(isNodeV1)),
        substitutionLimit: Math.max(0, expanded.prefix.length - 1),
        uncertain: uncertain || expanded.hasUnknownTail,
      };
    }
    if (raw?.type !== "ObjectExpression") {
      return { values: Object.freeze([]), substitutionLimit: 0, uncertain: true };
    }

    let length: number | null = null;
    const indexed = new Map<number, AstNodeV1>();
    let inheritedIndex = false;
    for (const property of asNodesV1(raw.properties)) {
      if (property.type === "SpreadElement") {
        uncertain = true;
        continue;
      }
      const key = staticKeyNameV1(property);
      if (key === null) {
        uncertain = true;
        continue;
      }
      if (key === "__proto__" && property.computed !== true) {
        inheritedIndex ||= prototypeSetterMaySupplyPropertiesV1(property);
        continue;
      }
      if (property.type !== "ObjectProperty") {
        if (key === "length" || /^(?:0|[1-9]\d*)$/u.test(key)) uncertain = true;
        continue;
      }
      const value = asNodeV1(property.value);
      if (key === "length") {
        const resolvedLength = unwrapExpressionV1(value);
        length = resolvedLength?.type === "NumericLiteral" &&
            typeof resolvedLength.value === "number" &&
            Number.isSafeInteger(resolvedLength.value) && resolvedLength.value >= 0
          ? resolvedLength.value
          : null;
        if (length === null) uncertain = true;
        continue;
      }
      if (!/^(?:0|[1-9]\d*)$/u.test(key) || value === null) continue;
      const index = Number(key);
      if (Number.isSafeInteger(index)) indexed.set(index, value);
    }
    if (length === null) {
      return { values: Object.freeze([]), substitutionLimit: 0, uncertain: true };
    }
    return {
      values: Object.freeze(
        [...indexed.entries()]
          .filter(([index]) => index < length!)
          .sort(([left], [right]) => left - right)
          .map(([, value]) => value),
      ),
      substitutionLimit: Math.max(0, length - 1),
      uncertain: uncertain || inheritedIndex,
    };
  };

  const inspectStringEffectiveArgumentsV1 = (
    effective: StaticArgumentVectorV1,
    callable: StringCallableV1,
    scope: ScopeV1,
  ): Readonly<{ values: readonly AstNodeV1[]; uncertain: boolean }> => {
    if (callable.kind === "constructor") {
      const first = effective.prefix[0];
      return {
        values: first === undefined || first === null ? Object.freeze([]) : Object.freeze([first]),
        uncertain: first === undefined && effective.hasUnknownTail,
      };
    }
    if (effective.hasUnknownTail) {
      return { values: Object.freeze([]), uncertain: true };
    }
    const first = effective.prefix[0] ?? null;
    const carrier = stringRawCarrierValuesV1(first, scope);
    return {
      values: Object.freeze([
        ...carrier.values,
        ...effective.prefix.slice(1, carrier.substitutionLimit + 1).filter(isNodeV1),
      ]),
      uncertain: carrier.uncertain,
    };
  };

  const inspectStringCoercionV1 = (
    node: AstNodeV1,
    callable: StringCallableV1,
    scope: ScopeV1,
  ): Readonly<{ values: readonly AstNodeV1[]; uncertain: boolean }> =>
    inspectStringEffectiveArgumentsV1(
      stringEffectiveArgumentsV1(node, callable, scope),
      callable,
      scope,
    );

  const taggedEffectiveArgumentsV1 = (
    expressions: readonly AstNodeV1[],
    wrapper: "call" | "apply" | "bind" | null,
    scope: ScopeV1,
  ): StaticArgumentVectorV1 => {
    const taggedArguments: StaticArgumentVectorV1 = {
      prefix: Object.freeze([null, ...expressions]),
      hasUnknownTail: false,
    };
    if (wrapper === null) return taggedArguments;
    if (wrapper === "bind") {
      return { prefix: Object.freeze([]), hasUnknownTail: true };
    }
    if (wrapper === "call") {
      return {
        prefix: Object.freeze(taggedArguments.prefix.slice(1)),
        hasUnknownTail: false,
      };
    }
    const carrierNode = taggedArguments.prefix[1] ?? null;
    const carrier = unwrapExpressionV1(carrierNode);
    const unshadowedUndefined = carrier?.type === "Identifier" &&
      identifierNameV1(carrier) === "undefined" && lookupBindingV1(scope, "undefined") === null;
    if (
      carrierNode === null || carrier?.type === "NullLiteral" ||
      carrier?.type === "UnaryExpression" && carrier.operator === "void" || unshadowedUndefined
    ) return { prefix: Object.freeze([]), hasUnknownTail: false };
    return carrier?.type === "ArrayExpression"
      ? expandStaticArgumentItemsV1(carrier.elements)
      : { prefix: Object.freeze([]), hasUnknownTail: true };
  };

  const visitCallLikeV1 = (node: AstNodeV1, scope: ScopeV1, mode: "call" | "new"): void => {
    const callee = asNodeV1(node.callee);
    const unwrappedCallee = unwrapExpressionV1(callee);
    visitRuntimeValueProducerV1(callee, scope);
    for (const argument of asNodesV1(node.arguments)) {
      if (argument.type === "SpreadElement") {
        const value = asNodeV1(argument.argument);
        if (value !== null) visitV1(value, scope);
      } else visitV1(argument, scope);
    }
    const calleeResolved = resolveExpressionV1(unwrappedCallee, scope);
    let classified = false;

    const stringCallable = stringCallableV1(calleeResolved.provenance);
    if (stringCallable?.wrapper === "bind" && unwrappedCallee !== null) {
      reportNodeV1("determinism.ambient_capability_escape", unwrappedCallee);
      classified = true;
    }
    if (!classified && stringCallable !== null) {
      const inspection = inspectStringCoercionV1(node, stringCallable, scope);
      if (inspection.uncertain && unwrappedCallee !== null) {
        reportNodeV1("determinism.ambient_capability_escape", unwrappedCallee);
        classified = true;
      }
      for (const value of inspection.values) {
        const code = dateCoercionDiagnosticV1(resolveExpressionV1(value, scope).provenance);
        if (code !== null) {
          reportNodeV1(code, value);
          classified = true;
        }
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
      if (
        !classified && property === null && objectResolved.provenance !== null &&
        isTrackedAmbientCapabilityProvenanceV1(objectResolved.provenance)
      ) {
        reportNodeV1(
          mayProduceDynamicRequireV1(objectResolved.provenance)
            ? "determinism.capability.dynamic_require"
            : "determinism.ambient_capability_escape",
          unwrappedCallee,
        );
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

    if (!classified && unwrappedCallee !== null) {
      const code = classifyProvenanceV1(calleeResolved.provenance, node, mode, scope);
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

    if (!classified && unwrappedCallee?.type === "Identifier") {
      visitV1(unwrappedCallee, scope);
    } else if (
      !classified && calleeResolved.provenance?.length === 1 &&
      provenanceTrackedRootsV1.has(calleeResolved.provenance[0] ?? "") &&
      unwrappedCallee !== null
    ) {
      reportNodeV1("determinism.ambient_capability_escape", unwrappedCallee);
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

  type DeferredFunctionAnalysisV1 = Readonly<{
    node: AstNodeV1;
    parentScope: ScopeV1;
    scope: ScopeV1;
    fallbackName: string | null;
  }>;
  const deferredFunctionsV1 = new Map<AstNodeV1, DeferredFunctionAnalysisV1>();
  const lexicalScopesV1 = new Map<AstNodeV1, ScopeV1>();
  let deferredReplayDepthV1 = 0;
  let provenanceReplayDepthV1 = 0;

  const lexicalScopeV1 = (
    node: AstNodeV1,
    parent: ScopeV1,
    functionBoundary = false,
  ): ScopeV1 => {
    const existing = lexicalScopesV1.get(node);
    if (existing !== undefined) return existing;
    const scope = createScopeV1(parent, functionBoundary);
    lexicalScopesV1.set(node, scope);
    return scope;
  };

  const visitFunctionV1 = (
    node: AstNodeV1,
    parentScope: ScopeV1,
    fallbackName: string | null = null,
    deferReanalysis = true,
    replayScope: ScopeV1 | null = null,
  ): void => {
    if (deferReanalysis && deferredReplayDepthV1 > 0) return;
    const scope = replayScope ?? createScopeV1(parentScope, true);
    if (deferReanalysis) {
      deferredFunctionsV1.set(node, { node, parentScope, scope, fallbackName });
    } else {
      deferredReplayDepthV1 += 1;
      provenanceReplayDepthV1 += 1;
    }
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
    try {
      if (body?.type === "BlockStatement") {
        if (provenanceReplayDepthV1 === 0) collectHoistedVarV1(body, scope);
        visitStatementListV1(asNodesV1(body.body), scope);
      } else if (body !== null) visitV1(body, scope);
    } finally {
      if (!deferReanalysis) {
        deferredReplayDepthV1 -= 1;
        provenanceReplayDepthV1 -= 1;
      }
    }
  };

  const visitClassV1 = (node: AstNodeV1, parentScope: ScopeV1): void => {
    for (const decorator of asNodesV1(node.decorators)) {
      const expression = asNodeV1(decorator.expression);
      if (expression !== null) visitV1(expression, parentScope);
    }
    const superClass = asNodeV1(node.superClass);
    if (superClass !== null) visitV1(superClass, parentScope);

    const scope = lexicalScopeV1(node, parentScope);
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
        const blockScope = lexicalScopeV1(node, scope);
        visitStatementListV1(asNodesV1(node.body), blockScope);
        return;
      }
      case "StaticBlock": {
        const blockScope = lexicalScopeV1(node, scope, true);
        const statements = asNodesV1(node.body);
        if (provenanceReplayDepthV1 === 0) {
          for (const statement of statements) collectHoistedVarV1(statement, blockScope);
        }
        visitStatementListV1(statements, blockScope);
        return;
      }
      case "SwitchStatement": {
        const discriminant = asNodeV1(node.discriminant);
        if (discriminant !== null) visitV1(discriminant, scope);
        const switchScope = lexicalScopeV1(node, scope);
        const cases = asNodesV1(node.cases);
        for (const switchCase of cases) {
          for (const statement of asNodesV1(switchCase.consequent)) {
            predeclareStatementV1(statement, switchScope);
          }
        }
        for (const switchCase of cases) {
          const test = asNodeV1(switchCase.test);
          if (test !== null) visitV1(test, switchScope);
          for (const statement of asNodesV1(switchCase.consequent)) {
            visitV1(statement, switchScope);
          }
        }
        return;
      }
      case "TSModuleDeclaration": {
        if (node.declare === true) return;
        const body = asNodeV1(node.body);
        if (body !== null) {
          const moduleScope = lexicalScopeV1(node, scope, true);
          if (provenanceReplayDepthV1 === 0) {
            for (const statement of asNodesV1(body.body)) {
              collectHoistedVarV1(statement, moduleScope);
            }
          }
          visitV1(body, moduleScope);
        }
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
        if (moduleReference?.type === "TSExternalModuleReference") {
          reportNodeV1("determinism.capability.dynamic_require", moduleReference);
          const name = identifierNameV1(asNodeV1(node.id));
          const binding = name === null ? null : lookupBindingV1(scope, name);
          if (binding !== null) {
            binding.provenance = null;
            binding.bootstrap = null;
          }
        }
        if (moduleReference !== null && moduleReference.type !== "TSExternalModuleReference") {
          const resolved = resolveTsEntityNameV1(moduleReference, scope);
          const name = identifierNameV1(asNodeV1(node.id));
          const binding = name === null ? null : lookupBindingV1(scope, name);
          if (binding !== null) {
            binding.provenance = resolved.provenance;
            binding.bootstrap = resolved.bootstrap === null ? null : "forbidden";
          }
          const code = classifyProvenanceV1(resolved.provenance, moduleReference, "member", scope);
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
        if (
          specifier !== null && isNodeModuleSpecifierV1(specifier) && !declarationTypeOnly
        ) {
          for (const importSpecifier of specifiers) {
            if (importSpecifier.importKind === "type") continue;
            const importedName = importSpecifier.type === "ImportSpecifier"
              ? importedNameV1(importSpecifier)
              : null;
            if (
              importSpecifier.type !== "ImportSpecifier" || importedName === "createRequire"
            ) {
              const local = asNodeV1(importSpecifier.local);
              if (local !== null) {
                reportNodeV1("determinism.capability.dynamic_require", local);
              }
            }
          }
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
        if (node.declare === true) return;
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
          } else if (initializer !== null) {
            if (staticallyDestructuredAmbientRoot) {
              visitRuntimeValueProducerV1(initializer, scope);
            } else visitV1(initializer, scope);
          }
          visitPatternRuntimeV1(pattern, scope);
          reportPatternCapabilitiesV1(pattern, resolved, scope);
          if (initializer !== null) {
            assignPatternV1(
              pattern,
              resolved,
              target,
              provenanceReplayDepthV1 > 0
                ? node.kind === "const" ? "const_join" : "join"
                : node.kind === "const"
                ? "const"
                : "mutable",
            );
          }
        }
        return;
      }
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression":
      case "ObjectMethod":
      case "ClassMethod":
      case "ClassPrivateMethod": {
        if (node.declare === true) return;
        if (node.computed === true) {
          visitPropertyKeyV1(asNodeV1(node.key), scope);
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
        if (node.declare === true) return;
        visitClassV1(node, scope);
        return;
      case "ObjectProperty":
      case "ClassProperty":
      case "ClassAccessorProperty":
      case "ClassPrivateProperty": {
        if (node.computed === true) {
          visitPropertyKeyV1(asNodeV1(node.key), scope);
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
        const object = asNodeV1(node.object);
        visitRuntimeValueProducerV1(object, scope);
        visitComputedPropertyV1(node, scope);
        const resolved = resolveExpressionV1(node, scope);
        if (resolved.bootstrap !== null) {
          reportNodeV1("determinism.bootstrap_entropy_escape", node);
          return;
        }
        const property = staticPropertyNameV1(node);
        if (
          property === "constructor" && isAmbientConstructorEscapeProvenanceV1(resolved.provenance)
        ) {
          reportNodeV1("determinism.ambient_capability_escape", node);
          return;
        }
        const objectResolved = resolveExpressionV1(object, scope);
        if (
          property === null &&
          isTrackedAmbientCapabilityProvenanceV1(objectResolved.provenance)
        ) {
          reportNodeV1(
            mayProduceDynamicRequireV1(objectResolved.provenance)
              ? "determinism.capability.dynamic_require"
              : "determinism.ambient_capability_escape",
            node,
          );
          return;
        }
        if (property === "nextUuidV4" || property === "nextNonZeroUint32") {
          reportNodeV1("determinism.bootstrap_entropy_escape", node);
          return;
        }
        const code = classifyProvenanceV1(resolved.provenance, node, "member", scope);
        if (code !== null) {
          reportNodeV1(code, node);
          return;
        }
        if (
          resolved.provenance !== null && resolved.provenance.length > 1 &&
          intrinsicStaticRootsV1.has(resolved.provenance[0] ?? "")
        ) {
          return;
        }
        if (
          (resolved.provenance?.length === 1 &&
            provenanceTrackedRootsV1.has(resolved.provenance[0] ?? "")) ||
          (objectResolved.provenance?.length === 1 &&
            objectResolved.provenance[0] === "globalThis")
        ) reportNodeV1("determinism.ambient_capability_escape", node);
        return;
      }
      case "Identifier": {
        const name = identifierNameV1(node);
        const binding = name === null ? null : lookupBindingV1(scope, name);
        if (binding?.bootstrap !== null && binding !== null) {
          reportNodeV1("determinism.bootstrap_entropy_escape", node);
        } else if (binding?.provenance?.[0] === ambiguousCapabilityProvenanceV1) {
          reportNodeV1("determinism.ambient_capability_escape", node);
        } else if (isDynamicRequireProvenanceV1(resolveExpressionV1(node, scope).provenance)) {
          reportNodeV1("determinism.capability.dynamic_require", node);
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
        if (node.operator === "delete") {
          inspectWriteTargetV1(argument, scope);
          if (
            unwrappedArgument !== null && unwrappedArgument.type !== "Identifier" &&
            unwrappedArgument.type !== "MemberExpression" &&
            unwrappedArgument.type !== "OptionalMemberExpression"
          ) visitV1(unwrappedArgument, scope);
          return;
        }
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
        const left = asNodeV1(node.left);
        const right = asNodeV1(node.right);
        if (left !== null) visitV1(left, scope);
        if (right !== null) visitV1(right, scope);
        if (node.operator === "**") reportNodeV1("determinism.numeric_approximate_math", node);
        if (node.operator === "+") {
          const leftCode = dateCoercionDiagnosticV1(resolveExpressionV1(left, scope).provenance);
          const rightCode = dateCoercionDiagnosticV1(resolveExpressionV1(right, scope).provenance);
          const code = leftCode === "determinism.host_timezone" ||
              rightCode === "determinism.host_timezone"
            ? "determinism.host_timezone"
            : leftCode ?? rightCode;
          if (code !== null) reportNodeV1(code, node);
        }
        if (node.operator === "==" || node.operator === "!=") {
          const leftCode = equalitySkipsObjectToPrimitiveV1(right, scope)
            ? null
            : dateCoercionDiagnosticV1(resolveExpressionV1(left, scope).provenance);
          const rightCode = equalitySkipsObjectToPrimitiveV1(left, scope)
            ? null
            : dateCoercionDiagnosticV1(resolveExpressionV1(right, scope).provenance);
          const code = leftCode === "determinism.host_timezone" ||
              rightCode === "determinism.host_timezone"
            ? "determinism.host_timezone"
            : leftCode ?? rightCode;
          if (code !== null) reportNodeV1(code, node);
        }
        if (node.operator === "in") {
          const code = dateCoercionDiagnosticV1(resolveExpressionV1(left, scope).provenance);
          if (code !== null) reportNodeV1(code, left ?? node);
        }
        return;
      }
      case "TaggedTemplateExpression": {
        const tag = asNodeV1(node.tag);
        const quasi = asNodeV1(node.quasi);
        const expressions = asNodesV1(quasi?.expressions);
        visitRuntimeValueProducerV1(tag, scope);
        const tagProvenance = resolveExpressionV1(tag, scope).provenance;
        for (const expression of expressions) visitV1(expression, scope);

        let classified = false;
        const stringCallable = stringCallableV1(tagProvenance);
        if (tag !== null && isUnsupportedStringCallablePathV1(tagProvenance)) {
          reportNodeV1("determinism.ambient_capability_escape", tag);
          classified = true;
        } else if (stringCallable !== null) {
          classified = true;
          if (stringCallable.wrapper === "bind") {
            if (tag !== null) reportNodeV1("determinism.ambient_capability_escape", tag);
          } else if (stringCallable.kind === "raw" && stringCallable.wrapper === null) {
            for (const expression of expressions) {
              const code = dateCoercionDiagnosticV1(
                resolveExpressionV1(expression, scope).provenance,
              );
              if (code !== null) reportNodeV1(code, expression);
            }
          } else if (stringCallable.wrapper !== null) {
            const inspection = inspectStringEffectiveArgumentsV1(
              taggedEffectiveArgumentsV1(expressions, stringCallable.wrapper, scope),
              stringCallable,
              scope,
            );
            if (inspection.uncertain && tag !== null) {
              reportNodeV1("determinism.ambient_capability_escape", tag);
            }
            for (const value of inspection.values) {
              const code = dateCoercionDiagnosticV1(
                resolveExpressionV1(value, scope).provenance,
              );
              if (code !== null) reportNodeV1(code, value);
            }
          }
        }

        const dateCallable = dateCallableKindV1(tagProvenance);
        if (!classified && dateCallable !== null) {
          classified = true;
          if (isDateCallableBindV1(tagProvenance)) {
            if (tag !== null) reportNodeV1("determinism.ambient_capability_escape", tag);
          } else if (dateCallable === "constructor" || dateCallable === "now") {
            if (tag !== null) reportNodeV1("determinism.ambient_clock", tag);
          } else if (dateCallable === "parse") {
            const members = normalizedConstructorMembersV1(tagProvenance, "Date") ?? [];
            const wrapper = members[1] === "call" || members[1] === "apply" ? members[1] : null;
            const effective = taggedEffectiveArgumentsV1(expressions, wrapper, scope);
            const input = effective.prefix[0] ?? null;
            const code = !effective.hasUnknownTail && effective.prefix.length === 1 &&
                input !== null && isSafeDateParseInputV1(input, scope)
              ? null
              : !effective.hasUnknownTail && effective.prefix.length === 1 &&
                  input !== null && isLocalZoneDateInputV1(input, scope)
              ? "determinism.host_timezone"
              : "determinism.date_input_unverified";
            if (code !== null && tag !== null) reportNodeV1(code, tag);
          } else if (dateCallable === "other" && tag !== null) {
            reportNodeV1("determinism.ambient_capability_escape", tag);
          }
        }

        if (!classified && tag !== null) {
          const code = classifyProvenanceV1(tagProvenance, node, "call", scope);
          if (code !== null) reportNodeV1(code, tag);
          else if (
            tagProvenance?.length === 1 &&
            provenanceTrackedRootsV1.has(tagProvenance[0] ?? "")
          ) reportNodeV1("determinism.ambient_capability_escape", tag);
        }
        return;
      }
      case "TemplateLiteral": {
        for (const expression of asNodesV1(node.expressions)) {
          visitV1(expression, scope);
          const code = dateCoercionDiagnosticV1(resolveExpressionV1(expression, scope).provenance);
          if (code !== null) reportNodeV1(code, expression);
        }
        return;
      }
      case "AssignmentExpression": {
        if (node.operator === "**=") {
          reportNodeV1("determinism.numeric_approximate_math", node);
        }
        const right = asNodeV1(node.right);
        const left = asNodeV1(node.left);
        const assignmentTarget = unwrapExpressionV1(left);
        inspectWriteTargetV1(left, scope);
        const initialResolved = resolveExpressionV1(right, scope);
        const staticallyDestructuredAmbientRoot = left?.type === "ObjectPattern" &&
          initialResolved.provenance?.length === 1 &&
          ambientCapabilityRootsV1.has(initialResolved.provenance[0] ?? "");
        if (right !== null) {
          if (staticallyDestructuredAmbientRoot) visitRuntimeValueProducerV1(right, scope);
          else visitV1(right, scope);
        }
        if (node.operator === "+=") {
          const leftCode = dateCoercionDiagnosticV1(resolveExpressionV1(left, scope).provenance);
          const rightCode = dateCoercionDiagnosticV1(resolveExpressionV1(right, scope).provenance);
          const code = leftCode === "determinism.host_timezone" ||
              rightCode === "determinism.host_timezone"
            ? "determinism.host_timezone"
            : leftCode ?? rightCode;
          if (code !== null) reportNodeV1(code, node);
        }
        const resolved = resolveExpressionV1(right, scope);
        if (
          assignmentTarget?.type === "Identifier" || assignmentTarget?.type === "ObjectPattern" ||
          assignmentTarget?.type === "ArrayPattern" ||
          assignmentTarget?.type === "AssignmentPattern" ||
          assignmentTarget?.type === "RestElement"
        ) {
          visitPatternRuntimeV1(assignmentTarget, scope);
          reportPatternCapabilitiesV1(assignmentTarget, resolved, scope);
          assignPatternV1(assignmentTarget, resolved, scope, "join");
        } else if (
          assignmentTarget !== null && assignmentTarget.type !== "MemberExpression" &&
          assignmentTarget.type !== "OptionalMemberExpression"
        ) visitV1(assignmentTarget, scope);
        return;
      }
      case "UpdateExpression": {
        const argument = asNodeV1(node.argument);
        const assignmentTarget = unwrapExpressionV1(argument);
        inspectWriteTargetV1(argument, scope);
        if (assignmentTarget?.type === "Identifier") {
          assignPatternV1(
            assignmentTarget,
            { provenance: null, bootstrap: null },
            scope,
            "join",
          );
        }
        return;
      }
      case "CatchClause": {
        const catchScope = lexicalScopeV1(node, scope);
        const parameter = asNodeV1(node.param);
        declarePatternV1(parameter, catchScope);
        visitPatternRuntimeV1(parameter, catchScope);
        const body = asNodeV1(node.body);
        if (body?.type === "BlockStatement") {
          visitStatementListV1(asNodesV1(body.body), catchScope);
        }
        return;
      }
      case "ForStatement": {
        const loopScope = lexicalScopeV1(node, scope);
        visitGenericChildrenV1(node, loopScope);
        return;
      }
      case "ForInStatement":
      case "ForOfStatement": {
        const loopScope = lexicalScopeV1(node, scope);
        const left = asNodeV1(node.left);
        const assignmentTarget = unwrapExpressionV1(left);
        const right = asNodeV1(node.right);
        const body = asNodeV1(node.body);
        if (left?.type === "VariableDeclaration") {
          const target = left.kind === "var" ? loopScope.functionScope : loopScope;
          const declarations = asNodesV1(left.declarations);
          for (const declaration of declarations) {
            declarePatternV1(asNodeV1(declaration.id), target);
          }
          if (right !== null) visitV1(right, loopScope);
          for (const declaration of declarations) {
            const pattern = asNodeV1(declaration.id);
            visitPatternRuntimeV1(pattern, loopScope);
            assignPatternV1(
              pattern,
              { provenance: null, bootstrap: null },
              target,
              provenanceReplayDepthV1 > 0
                ? left.kind === "const" ? "const_join" : "join"
                : left.kind === "const"
                ? "const"
                : "mutable",
            );
          }
        } else {
          if (right !== null) visitV1(right, loopScope);
          inspectWriteTargetV1(left, loopScope);
          if (
            assignmentTarget?.type === "Identifier" ||
            assignmentTarget?.type === "ObjectPattern" ||
            assignmentTarget?.type === "ArrayPattern" ||
            assignmentTarget?.type === "AssignmentPattern" ||
            assignmentTarget?.type === "RestElement"
          ) {
            visitPatternRuntimeV1(assignmentTarget, loopScope);
            assignPatternV1(
              assignmentTarget,
              { provenance: null, bootstrap: null },
              loopScope,
              "join",
            );
          } else if (
            assignmentTarget !== null && assignmentTarget.type !== "MemberExpression" &&
            assignmentTarget.type !== "OptionalMemberExpression"
          ) visitV1(assignmentTarget, loopScope);
        }
        if (body !== null) visitV1(body, loopScope);
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

  const analysisScopesV1 = (): readonly ScopeV1[] => {
    const scopes = new Set<ScopeV1>([rootScope, ...lexicalScopesV1.values()]);
    for (const deferred of deferredFunctionsV1.values()) scopes.add(deferred.scope);
    return [...scopes];
  };
  const deferredBindingStateV1 = (): string =>
    JSON.stringify(
      analysisScopesV1().map((scope) =>
        [...scope.bindings.entries()]
          .sort(([left], [right]) => compareCodeUnitsV1(left, right))
          .map(([name, binding]) => [name, binding.provenance, binding.bootstrap])
      ),
    );
  const deferredBindingCountV1 = analysisScopesV1().reduce(
    (count, scope) => count + scope.bindings.size,
    0,
  );
  const deferredPassLimitV1 = Math.max(
    8,
    (deferredFunctionsV1.size + deferredBindingCountV1) * 4,
  );
  let deferredConvergedV1 = false;
  for (let pass = 0; !deferredConvergedV1 && pass < deferredPassLimitV1; pass += 1) {
    const before = deferredBindingStateV1();
    deferredReplayDepthV1 += 1;
    provenanceReplayDepthV1 += 1;
    try {
      const rootProgram = asNodeV1(program.program) ?? program;
      visitStatementListV1(asNodesV1(rootProgram.body), rootScope);
    } finally {
      deferredReplayDepthV1 -= 1;
      provenanceReplayDepthV1 -= 1;
    }
    for (const deferred of [...deferredFunctionsV1.values()]) {
      visitFunctionV1(
        deferred.node,
        deferred.parentScope,
        deferred.fallbackName,
        false,
        deferred.scope,
      );
    }
    deferredConvergedV1 = before === deferredBindingStateV1();
  }

  traversalDiagnosticsEnabledV1 = true;
  deferredReplayDepthV1 += 1;
  provenanceReplayDepthV1 += 1;
  try {
    const rootProgram = asNodeV1(program.program) ?? program;
    visitStatementListV1(asNodesV1(rootProgram.body), rootScope);
  } finally {
    deferredReplayDepthV1 -= 1;
    provenanceReplayDepthV1 -= 1;
  }
  for (const deferred of [...deferredFunctionsV1.values()]) {
    visitFunctionV1(
      deferred.node,
      deferred.parentScope,
      deferred.fallbackName,
      false,
      deferred.scope,
    );
  }
  if (!deferredConvergedV1) {
    for (const deferred of deferredFunctionsV1.values()) {
      reportNodeV1("determinism.ambient_capability_escape", deferred.node);
    }
  }

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
