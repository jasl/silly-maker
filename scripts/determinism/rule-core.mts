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
  /** Package-internal deterministic exhaustion seam. Tests only. */
  readonly provenancePassBudgetForTests?: number;
  /** Package-internal exact-proof traversal observer. Tests only. */
  readonly exactProofAliasStepObserverForTests?: () => void;
}

interface AstNodeV1 {
  readonly type: string;
  readonly start?: number | null;
  readonly end?: number | null;
  readonly [key: string]: unknown;
}

type ExactPrimitiveV1 = string | number | boolean | null | undefined;

type ExactProofV1 = Readonly<
  | { kind: "primitive"; value: ExactPrimitiveV1; singleton: string }
  | { kind: "date_epoch"; singleton: string }
  | { kind: "known_date"; singleton: string }
  | { kind: "known_capability"; singleton: string }
  | { kind: "known_callable"; singleton: string }
  | { kind: "function_constructor"; singleton: string }
>;

interface BindingV1 {
  provenance: readonly string[] | null;
  bootstrap: "allowed" | "forbidden" | null;
  exactProof: ExactProofV1 | null;
  exactAlias: BindingV1 | null;
}

interface ScopeV1 {
  readonly parent: ScopeV1 | null;
  readonly bindings: Map<string, BindingV1>;
  readonly bootstrapTypes: Map<string, boolean>;
  readonly functionScope: ScopeV1;
  readonly exactProofResolver: ExactProofResolverV1;
}

interface ExactProofResolutionV1 {
  readonly proof: ExactProofV1 | null;
  readonly failure: "cycle" | "unknown" | null;
}

interface ExactProofResolverV1 {
  readonly cache: WeakMap<BindingV1, ExactProofResolutionV1>;
  readonly dependents: WeakMap<BindingV1, Set<BindingV1>>;
  readonly onAliasStep: (() => void) | null;
}

interface ResolvedExpressionV1 {
  readonly provenance: readonly string[] | null;
  readonly bootstrap: BindingV1 | null;
  readonly exactProof?: ExactProofV1 | null;
  readonly exactAlias?: BindingV1 | null;
  readonly exactProofFailure?: "cycle" | "unknown" | null;
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

const mathCallableStaticMembersV1 = new Set([
  ...[...approximateMathMembersV1].filter((member) => !mathPrimitiveStaticMembersV1.has(member)),
  "abs",
  "ceil",
  "clz32",
  "floor",
  "imul",
  "max",
  "min",
  "random",
  "round",
  "sign",
  "trunc",
]);

const numberCallableStaticMembersV1 = new Set([
  "isFinite",
  "isInteger",
  "isNaN",
  "isSafeInteger",
  "parseFloat",
  "parseInt",
]);

const stringCallableStaticMembersV1 = new Set([
  "fromCharCode",
  "fromCodePoint",
  "raw",
]);

const temporalConstructorMembersV1 = new Set([
  "Duration",
  "Instant",
  "PlainDate",
  "PlainDateTime",
  "PlainMonthDay",
  "PlainTime",
  "PlainYearMonth",
  "ZonedDateTime",
]);

const temporalNowCallableMembersV1 = new Set([
  "instant",
  "plainDateISO",
  "plainDateTimeISO",
  "plainTimeISO",
  "timeZoneId",
  "zonedDateTimeISO",
]);

const ambientCapabilityRootsV1 = new Set([
  "Date",
  "Deno",
  "Function",
  "Math",
  "Number",
  "Temporal",
  "globalThis",
  "module",
  "process",
]);

const intrinsicStaticRootsV1 = new Set([
  "Date",
  "Function",
  "Math",
  "Number",
  "String",
  "Temporal",
]);

const constructorTrackedRootsV1 = new Set([
  ...ambientCapabilityRootsV1,
  "String",
]);

const ambiguousDateInstanceProvenanceV1 = "\0ambiguous-date-instance";
const ambiguousCapabilityProvenanceV1 = "\0ambiguous-capability";
const constructorEscapeRiskProvenanceV1 = "\0constructor-escape-risk";
const dynamicCodeConstructorProvenanceV1 = "\0dynamic-code-constructor";
const dynamicMemberRiskProvenanceV1 = "\0dynamic-member-risk";
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
  ambiguousDateInstanceProvenanceV1,
  ambiguousCapabilityProvenanceV1,
  constructorEscapeRiskProvenanceV1,
  dynamicCodeConstructorProvenanceV1,
  dynamicMemberRiskProvenanceV1,
  dynamicRequireLoaderProvenanceV1,
  dynamicRequireRiskProvenanceV1,
  nodeModuleProvenanceV1,
]);

const genericAmbientFallbackRootsV1 = new Set([
  ...ambientCapabilityRootsV1,
  "Intl",
  "WebSocket",
  "XMLHttpRequest",
  "crypto",
  "document",
  "fetch",
  "localStorage",
  "navigator",
  "parseFloat",
  "performance",
  "require",
  "sessionStorage",
  "window",
]);

function extendStaticProvenanceV1(
  provenance: readonly string[],
  property: string,
): readonly string[] {
  if (provenance.length !== 1 || provenance[0] !== "globalThis") {
    return Object.freeze([...provenance, property]);
  }
  return provenanceTrackedRootsV1.has(property)
    ? Object.freeze([property])
    : Object.freeze([ambiguousCapabilityProvenanceV1, property]);
}

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

const dateTerminalMembersV1 = new Set([
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
]);

const dateMutationMembersV1 = new Set([
  "setDate",
  "setFullYear",
  "setHours",
  "setMilliseconds",
  "setMinutes",
  "setMonth",
  "setSeconds",
  "setTime",
  "setUTCDate",
  "setUTCFullYear",
  "setUTCHours",
  "setUTCMilliseconds",
  "setUTCMinutes",
  "setUTCMonth",
  "setUTCSeconds",
  "setYear",
]);

const datePrototypeCallableMembersV1 = new Set([
  ...dateHostDependentMembersV1,
  ...dateTerminalMembersV1,
  ...dateMutationMembersV1,
  "toGMTString",
  "toJSON",
  "toLocaleDateString",
  "toLocaleString",
  "toLocaleTimeString",
  "toUTCString",
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
  "determinism.clock.date_now": Object.freeze({
    message: "Authoritative code reads the ambient Date clock.",
    hint: "Use a recorded instant or an authoritative integer tick supplied by input.",
  }),
  "determinism.clock.date_function_call": Object.freeze({
    message: "Authoritative code calls Date as an ambient-clock function.",
    hint: "Use a recorded instant instead of the Date function form.",
  }),
  "determinism.clock.date_zero_argument_constructor": Object.freeze({
    message: "Authoritative code constructs Date from the ambient clock.",
    hint: "Pass one statically verified deterministic Date input.",
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
    hint: "Use an exact static epoch, direct Date.UTC result, or strict full-zone StaticString.",
  }),
  "determinism.date_utc_unverified": Object.freeze({
    message: "Authoritative Date.UTC arguments are not statically proven exact.",
    hint: "Use exactly seven in-range integer arguments without calendar overflow.",
  }),
  "determinism.date_instance_unverified": Object.freeze({
    message: "Authoritative code uses or escapes a Date instance outside the terminal safe-set.",
    hint: "Use one direct getTime/valueOf/toISOString/UTC-getter call on an exact KnownDate.",
  }),
  "determinism.date_instance_mutation": Object.freeze({
    message: "Authoritative code mutates a Date instance.",
    hint: "Treat Date instances as immutable and derive a new verified value instead.",
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
  "determinism.capability.dynamic_code": Object.freeze({
    message: "Authoritative code reaches a dynamic code constructor.",
    hint: "Use statically declared functions and modules only.",
  }),
  "determinism.capability.indirect_intrinsic": Object.freeze({
    message: "Authoritative code invokes a Date intrinsic indirectly.",
    hint: "Use only the admitted direct Date syntax.",
  }),
  "determinism.capability.intrinsic_mutation": Object.freeze({
    message: "Authoritative code mutates an intrinsic capability.",
    hint: "Do not replace or mutate Host intrinsic functions or prototypes.",
  }),
  "determinism.capability.constructor_escape": Object.freeze({
    message: "Authoritative code accesses an unverified constructor capability.",
    hint: "Use an explicit statically known constructor instead of .constructor.",
  }),
  "determinism.capability.dynamic_member": Object.freeze({
    message: "Authoritative code selects a capability member dynamically.",
    hint: "Use one explicitly admitted static member operation.",
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
  "determinism.provenance.cycle": Object.freeze({
    message: "Authoritative value provenance contains an alias cycle.",
    hint: "Break the cycle and use one immutable exact value producer.",
  }),
  "determinism.provenance.budget_exhausted": Object.freeze({
    message: "Authoritative provenance analysis exhausted its deterministic budget.",
    hint: "Simplify source-local dataflow so the guard can prove one exact result.",
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

function createRootScopeV1(onAliasStep: (() => void) | null = null): ScopeV1 {
  const root = {
    parent: null,
    bindings: new Map<string, BindingV1>(),
    bootstrapTypes: new Map<string, boolean>(),
    exactProofResolver: {
      cache: new WeakMap(),
      dependents: new WeakMap(),
      onAliasStep,
    },
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
    exactProofResolver: parent.exactProofResolver,
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
  const binding: BindingV1 = {
    provenance: null,
    bootstrap: null,
    exactProof: null,
    exactAlias: null,
  };
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
        setBindingExactStateV1(
          binding,
          Object.freeze({
            kind: specifier.type === "ImportSpecifier" && importedName === "createRequire"
              ? "known_callable"
              : "known_capability",
            singleton: exactProofSingletonV1(specifier),
          }),
          null,
          scope.exactProofResolver,
        );
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

function isTrackedAmbientCapabilityProvenanceV1(
  provenance: readonly string[] | null,
): boolean {
  if (provenance === null || provenance.length === 0) return false;
  const root = provenance[0] ?? "";
  return provenanceTrackedRootsV1.has(root);
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

function daysInGregorianMonthV1(year: number, month: number): number {
  if (month === 2) return isLeapYearV1(year) ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

function isStrictFullZoneDateStringV1(value: string): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|([+-])(\d{2}):(\d{2}))$/u
      .exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[8] === undefined ? 0 : Number(match[8]);
  const offsetMinute = match[9] === undefined ? 0 : Number(match[9]);
  const daysInMonth = daysInGregorianMonthV1(year, month);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth &&
    hour <= 23 && minute <= 59 && second <= 59 && offsetHour <= 23 && offsetMinute <= 59;
}

function isLocalZoneDateStringV1(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/u.exec(
    value,
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

function exactProofSingletonV1(node: AstNodeV1): string {
  return `${node.type}:${nodeStartV1(node)}:${nodeEndV1(node)}`;
}

function sameExactProofV1(left: ExactProofV1 | null, right: ExactProofV1 | null): boolean {
  if (left === right) return true;
  if (left === null || right === null || left.kind !== right.kind) return false;
  if (left.singleton !== right.singleton) return false;
  return left.kind !== "primitive" ||
    right.kind === "primitive" && Object.is(left.value, right.value);
}

function riskOnlyExactProofV1(proof: ExactProofV1 | null): ExactProofV1 | null {
  return proof?.kind === "known_capability" || proof?.kind === "known_callable" ||
      proof?.kind === "function_constructor"
    ? proof
    : null;
}

function resolveBindingExactProofV1(
  binding: BindingV1,
  resolver: ExactProofResolverV1,
): ExactProofResolutionV1 {
  const cached = resolver.cache.get(binding);
  if (cached !== undefined) return cached;

  const path: BindingV1[] = [];
  const pathIndexes = new Map<BindingV1, number>();
  let current = binding;
  let result: ExactProofResolutionV1;
  while (true) {
    const currentCached = resolver.cache.get(current);
    if (currentCached !== undefined) {
      result = currentCached;
      break;
    }
    if (current.exactProof !== null) {
      result = { proof: current.exactProof, failure: null };
      break;
    }
    if (current.exactAlias === null) {
      result = { proof: null, failure: "unknown" };
      break;
    }
    if (pathIndexes.has(current)) {
      result = { proof: null, failure: "cycle" };
      break;
    }
    pathIndexes.set(current, path.length);
    path.push(current);
    resolver.onAliasStep?.();
    current = current.exactAlias;
  }
  const entry = Object.freeze(result);
  resolver.cache.set(current, entry);
  for (const item of path) resolver.cache.set(item, entry);
  return entry;
}

function hasProofWrapperV1(node: AstNodeV1 | null): boolean {
  const extra = node?.extra;
  const parenthesized = typeof extra === "object" && extra !== null &&
    (extra as Readonly<{ parenthesized?: unknown }>).parenthesized === true;
  return node === null || parenthesized ||
    node.type === "TSAsExpression" || node.type === "TSTypeAssertion" ||
    node.type === "TSNonNullExpression" || node.type === "TSSatisfiesExpression" ||
    node.type === "TSInstantiationExpression" || node.type === "TypeCastExpression" ||
    node.type === "ParenthesizedExpression";
}

function hasTypeArgumentSyntaxV1(node: AstNodeV1): boolean {
  return node.typeParameters !== null && node.typeParameters !== undefined ||
    node.typeArguments !== null && node.typeArguments !== undefined;
}

function isDirectUnshadowedIdentifierV1(
  node: AstNodeV1 | null,
  name: string,
  scope: ScopeV1,
): boolean {
  return !hasProofWrapperV1(node) && identifierNameV1(node) === name &&
    lookupBindingV1(scope, name) === null;
}

function isDirectUnshadowedMemberV1(
  node: AstNodeV1 | null,
  root: string,
  member: string,
  scope: ScopeV1,
): boolean {
  if (
    node?.type !== "MemberExpression" || node.computed === true || node.optional === true ||
    hasProofWrapperV1(node)
  ) return false;
  return staticPropertyNameV1(node) === member &&
    isDirectUnshadowedIdentifierV1(asNodeV1(node.object), root, scope);
}

function directStaticProvenancePathV1(
  node: AstNodeV1 | null,
  scope: ScopeV1,
): readonly string[] | null {
  if (node === null || hasProofWrapperV1(node)) return null;
  if (node.type === "Identifier") {
    const name = identifierNameV1(node);
    return name !== null && lookupBindingV1(scope, name) === null ? Object.freeze([name]) : null;
  }
  if (
    node.type !== "MemberExpression" || node.computed === true || node.optional === true
  ) return null;
  const objectPath = directStaticProvenancePathV1(asNodeV1(node.object), scope);
  const property = staticPropertyNameV1(node);
  if (objectPath === null || property === null) return null;
  return extendStaticProvenanceV1(objectPath, property);
}

function exactPrimitiveProofV1(
  node: AstNodeV1 | null,
  scope: ScopeV1,
): ExactProofV1 | null {
  return resolveExpressionV1(node, scope).exactProof ?? null;
}

function exactIntegerValueV1(node: AstNodeV1 | null, scope: ScopeV1): number | null {
  const proof = exactPrimitiveProofV1(node, scope);
  return proof?.kind === "primitive" && typeof proof.value === "number" &&
      Number.isSafeInteger(proof.value)
    ? proof.value
    : null;
}

function isSafeDirectDateUtcV1(node: AstNodeV1, scope: ScopeV1): boolean {
  if (hasTypeArgumentSyntaxV1(node)) return false;
  const argumentsV1 = asNodesV1(node.arguments);
  if (
    argumentsV1.length !== 7 ||
    argumentsV1.some(({ type }) => type === "SpreadElement")
  ) return false;
  const values = argumentsV1.map((argument) => exactIntegerValueV1(argument, scope));
  if (values.some((value) => value === null)) return false;
  const [year, month, day, hour, minute, second, millisecond] = values as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  return year >= 100 && year <= 9999 && month >= 0 && month <= 11 &&
    day >= 1 && day <= daysInGregorianMonthV1(year, month + 1) &&
    hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 &&
    second >= 0 && second <= 59 && millisecond >= 0 && millisecond <= 999;
}

function isSafeDateInputProofV1(proof: ExactProofV1 | null): boolean {
  if (proof?.kind === "date_epoch") return true;
  if (proof?.kind !== "primitive") return false;
  if (typeof proof.value === "number") {
    return Number.isInteger(proof.value) && Number.isFinite(proof.value) &&
      Math.abs(proof.value) <= 8_640_000_000_000_000;
  }
  return typeof proof.value === "string" && isStrictFullZoneDateStringV1(proof.value);
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

function isExactDynamicRequireCallableProvenanceV1(
  provenance: readonly string[] | null,
): boolean {
  return provenance?.length === 1 &&
      (provenance[0] === "require" || provenance[0] === dynamicRequireLoaderProvenanceV1) ||
    provenance?.length === 2 &&
      (provenance[0] === "module" && provenance[1] === "require" ||
        provenance[0] === nodeModuleProvenanceV1 && provenance[1] === "createRequire");
}

function isExactCreateRequireFactoryCallableV1(resolved: ResolvedExpressionV1): boolean {
  const provenance = resolved.provenance;
  return resolved.exactProof?.kind === "known_callable" &&
    provenance?.[0] === nodeModuleProvenanceV1 && provenance[1] === "createRequire" &&
    (provenance.length === 2 ||
      provenance.length === 3 &&
        (provenance[2] === "call" || provenance[2] === "apply" || provenance[2] === "bind"));
}

function isFunctionConstructorInvocationProvenanceV1(
  provenance: readonly string[] | null,
): boolean {
  return (provenance?.[0] === "Function" ||
    provenance?.[0] === dynamicCodeConstructorProvenanceV1) &&
    provenance.slice(1).every((member) => member === "call" || member === "apply");
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

function isStaticallyKnownCallableProvenanceV1(
  provenance: readonly string[] | null,
): boolean {
  let candidate = provenance;
  while (candidate !== null && candidate.length > 0) {
    if (isExactDynamicRequireCallableProvenanceV1(candidate)) return true;
    if (isFunctionConstructorInvocationProvenanceV1(candidate)) return true;
    if (stringCallableV1(candidate) !== null) return true;
    const dateCallable = dateCallableKindV1(candidate);
    if (dateCallable !== null && dateCallable !== "other") return true;

    const root = candidate[0] ?? "";
    if (root === "Function" && candidate.length === 2 && candidate[1] === "prototype") {
      return true;
    }
    if (
      root === "Date" && candidate.length === 3 &&
      (candidate[1] === "instance" || candidate[1] === "prototype") &&
      datePrototypeCallableMembersV1.has(candidate[2] ?? "")
    ) return true;
    if (
      root === "Math" && candidate.length === 2 &&
      mathCallableStaticMembersV1.has(candidate[1] ?? "")
    ) return true;
    if (
      root === "Number" &&
      (candidate.length === 1 ||
        candidate.length === 2 && numberCallableStaticMembersV1.has(candidate[1] ?? ""))
    ) return true;
    if (
      root === "String" && candidate.length === 2 &&
      stringCallableStaticMembersV1.has(candidate[1] ?? "")
    ) return true;
    if (
      root === "Temporal" &&
      (candidate.length === 2 && temporalConstructorMembersV1.has(candidate[1] ?? "") ||
        candidate.length === 3 && temporalConstructorMembersV1.has(candidate[1] ?? "") &&
          (candidate[2] === "from" || candidate[2] === "compare") ||
        candidate.length === 3 && candidate[1] === "Now" &&
          temporalNowCallableMembersV1.has(candidate[2] ?? ""))
    ) return true;
    if (root === "performance" && candidate.length === 2 && candidate[1] === "now") return true;
    if (
      (root === "fetch" || root === "XMLHttpRequest" || root === "WebSocket" ||
        root === "parseFloat") && candidate.length === 1
    ) return true;
    if (
      root === "crypto" && candidate.length === 2 &&
      (candidate[1] === "getRandomValues" || candidate[1] === "randomUUID")
    ) return true;

    const tail = candidate.at(-1);
    if (tail !== "call" && tail !== "apply" && tail !== "bind" && tail !== "constructor") {
      return false;
    }
    candidate = candidate.slice(0, -1);
  }
  return false;
}

function knownCallableConstructorProvenanceV1(
  provenance: readonly string[] | null,
): boolean {
  if (provenance === null || !provenance.includes("constructor")) return false;
  if (dateCallableKindV1(provenance) === "constructor") return false;
  if (stringCallableV1(provenance)?.kind === "constructor") return false;
  const constructorIndex = provenance.lastIndexOf("constructor");
  if (
    provenance.slice(constructorIndex + 1).some((member) => member !== "call" && member !== "apply")
  ) return false;
  return isStaticallyKnownCallableProvenanceV1(provenance.slice(0, constructorIndex));
}

function isProvenFunctionConstructorBindProvenanceV1(
  provenance: readonly string[] | null,
): boolean {
  if (provenance === null) return false;
  if (
    (provenance[0] === "Function" || provenance[0] === dynamicCodeConstructorProvenanceV1) &&
    provenance.length === 2 && provenance[1] === "bind"
  ) return true;
  if (dateCallableKindV1(provenance) === "constructor") return false;
  if (stringCallableV1(provenance)?.kind === "constructor") return false;
  const constructorIndex = provenance.lastIndexOf("constructor");
  return constructorIndex >= 0 && provenance.length === constructorIndex + 2 &&
    provenance[constructorIndex + 1] === "bind" &&
    isStaticallyKnownCallableProvenanceV1(provenance.slice(0, constructorIndex));
}

function isExactFunctionConstructorInvocationV1(
  resolved: ResolvedExpressionV1,
): boolean {
  if (!isFunctionConstructorInvocationProvenanceV1(resolved.provenance)) return false;
  return resolved.provenance?.[0] === dynamicCodeConstructorProvenanceV1
    ? resolved.exactProof?.kind === "function_constructor"
    : resolved.exactProof?.kind === "known_callable";
}

function isExactKnownCallableConstructorV1(
  resolved: ResolvedExpressionV1,
): boolean {
  return resolved.exactProof?.kind === "function_constructor" &&
    knownCallableConstructorProvenanceV1(resolved.provenance);
}

function isExactFunctionConstructorBindV1(
  resolved: ResolvedExpressionV1,
): boolean {
  if (!isProvenFunctionConstructorBindProvenanceV1(resolved.provenance)) return false;
  const directFunctionBind = resolved.provenance?.length === 2 &&
    resolved.provenance[0] === "Function" && resolved.provenance[1] === "bind";
  return directFunctionBind
    ? resolved.exactProof?.kind === "known_callable"
    : resolved.exactProof?.kind === "function_constructor";
}

function isExactShortCircuitCallableV1(resolved: ResolvedExpressionV1): boolean {
  return !isDynamicRequireProvenanceV1(resolved.provenance) &&
    (resolved.exactProof?.kind === "known_callable" ||
      resolved.exactProof?.kind === "function_constructor");
}

function dateCoercionDiagnosticV1(
  provenance: readonly string[] | null,
): "determinism.host_timezone" | "determinism.date_instance_unverified" | null {
  if (isDateInstanceValueV1(provenance)) return "determinism.host_timezone";
  return isDateInstancePathV1(provenance) ||
      provenance?.[0] === ambiguousDateInstanceProvenanceV1
    ? "determinism.date_instance_unverified"
    : null;
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

function resolveExpressionV1(node: AstNodeV1 | null, scope: ScopeV1): ResolvedExpressionV1 {
  const proofEligible = !hasProofWrapperV1(node);
  const expression = unwrapExpressionV1(node);
  if (expression === null) return { provenance: null, bootstrap: null };

  if (expression.type === "Identifier") {
    const name = identifierNameV1(expression);
    if (name === null) return { provenance: null, bootstrap: null };
    const binding = lookupBindingV1(scope, name);
    if (binding === null) {
      const provenance = Object.freeze([name]);
      const exactProof = name === "undefined" && proofEligible
        ? Object.freeze<ExactProofV1>({
          kind: "primitive",
          value: undefined,
          singleton: exactProofSingletonV1(expression),
        })
        : isStaticallyKnownCallableProvenanceV1(provenance)
        ? Object.freeze<ExactProofV1>({
          kind: "known_callable",
          singleton: exactProofSingletonV1(expression),
        })
        : provenanceTrackedRootsV1.has(name)
        ? Object.freeze<ExactProofV1>({
          kind: "known_capability",
          singleton: exactProofSingletonV1(expression),
        })
        : null;
      return { provenance, bootstrap: null, exactProof };
    }
    const resolvedProof = resolveBindingExactProofV1(binding, scope.exactProofResolver);
    const exactProof = proofEligible
      ? resolvedProof.proof
      : riskOnlyExactProofV1(resolvedProof.proof);
    return {
      provenance: binding.provenance,
      bootstrap: binding.bootstrap === null ? null : binding,
      exactProof,
      exactAlias: proofEligible || exactProof !== null ? binding : null,
      exactProofFailure: resolvedProof.failure,
    };
  }

  if (proofEligible) {
    let primitive: ExactPrimitiveV1;
    let hasPrimitive = true;
    if (expression.type === "StringLiteral" && typeof expression.value === "string") {
      primitive = expression.value;
    } else if (expression.type === "NumericLiteral" && typeof expression.value === "number") {
      primitive = expression.value;
    } else if (expression.type === "BooleanLiteral" && typeof expression.value === "boolean") {
      primitive = expression.value;
    } else if (expression.type === "NullLiteral") {
      primitive = null;
    } else if (
      expression.type === "UnaryExpression" &&
      (expression.operator === "+" || expression.operator === "-")
    ) {
      const argument = asNodeV1(expression.argument);
      if (
        argument?.type === "NumericLiteral" && typeof argument.value === "number" &&
        !hasProofWrapperV1(argument)
      ) {
        primitive = expression.operator === "-" ? -argument.value : argument.value;
      } else {
        primitive = undefined;
        hasPrimitive = false;
      }
    } else if (
      expression.type === "TemplateLiteral" && asNodesV1(expression.expressions).length === 0
    ) {
      const quasi = asNodesV1(expression.quasis)[0];
      const value = typeof quasi?.value === "object" && quasi.value !== null
        ? quasi.value as Readonly<{ cooked?: unknown; raw?: unknown }>
        : null;
      primitive = typeof value?.cooked === "string"
        ? value.cooked
        : typeof value?.raw === "string"
        ? value.raw
        : "";
    } else {
      primitive = undefined;
      hasPrimitive = false;
    }
    if (hasPrimitive) {
      return {
        provenance: null,
        bootstrap: null,
        exactProof: Object.freeze({
          kind: "primitive",
          value: primitive,
          singleton: exactProofSingletonV1(expression),
        }),
      };
    }
  }

  if (expression.type === "MemberExpression" || expression.type === "OptionalMemberExpression") {
    const objectNode = asNodeV1(expression.object);
    const object = resolveExpressionV1(objectNode, scope);
    const property = staticPropertyNameV1(expression);
    if (object.provenance === null || property === null) {
      return { provenance: null, bootstrap: object.bootstrap };
    }
    const isDateInstanceConstructor = property === "constructor" &&
      (isDateInstanceValueV1(object.provenance) ||
        object.provenance[0] === ambiguousDateInstanceProvenanceV1 ||
        (object.provenance.length === 2 && object.provenance[0] === "Date" &&
          object.provenance[1] === "prototype"));
    let recoveredDateConstructor = false;
    if (isDateInstanceConstructor) {
      if (expression.computed === true || expression.optional === true) {
        return {
          provenance: Object.freeze([dynamicMemberRiskProvenanceV1]),
          bootstrap: object.bootstrap,
          exactProofFailure: "unknown",
        };
      }
      const exactKnownDate = object.exactProof?.kind === "known_date";
      const directDatePrototype = isDirectUnshadowedMemberV1(
        objectNode,
        "Date",
        "prototype",
        scope,
      );
      if (!exactKnownDate && !directDatePrototype) {
        return {
          provenance: Object.freeze([constructorEscapeRiskProvenanceV1, "constructor"]),
          bootstrap: object.bootstrap,
          exactProofFailure: "unknown",
        };
      }
      recoveredDateConstructor = true;
    }
    const provenance = extendStaticProvenanceV1(object.provenance, property);
    let exactProof: ExactProofV1 | null = null;
    const directMember = expression.computed !== true && expression.optional !== true;
    if (directMember) {
      if (recoveredDateConstructor) {
        exactProof = Object.freeze({
          kind: "known_callable",
          singleton: exactProofSingletonV1(expression),
        });
      } else if (
        property === "constructor" &&
        (object.exactProof?.kind === "known_callable" ||
          object.exactProof?.kind === "function_constructor")
      ) {
        exactProof = Object.freeze({
          kind: "function_constructor",
          singleton: exactProofSingletonV1(expression),
        });
      } else if (
        object.exactProof?.kind === "function_constructor" &&
        (property === "call" || property === "apply" || property === "bind")
      ) {
        exactProof = Object.freeze({
          kind: "function_constructor",
          singleton: exactProofSingletonV1(expression),
        });
      } else if (
        object.exactProof?.kind === "known_callable" &&
        (property === "call" || property === "apply" || property === "bind")
      ) {
        exactProof = Object.freeze({
          kind: "known_callable",
          singleton: exactProofSingletonV1(expression),
        });
      } else if (
        object.exactProof?.kind === "known_date" &&
        datePrototypeCallableMembersV1.has(property)
      ) {
        exactProof = Object.freeze({
          kind: "known_callable",
          singleton: exactProofSingletonV1(expression),
        });
      } else if (
        object.exactProof?.kind === "known_capability" ||
        object.exactProof?.kind === "known_callable"
      ) {
        if (isStaticallyKnownCallableProvenanceV1(provenance)) {
          exactProof = Object.freeze({
            kind: "known_callable",
            singleton: exactProofSingletonV1(expression),
          });
        } else if (provenanceTrackedRootsV1.has(provenance[0] ?? "")) {
          exactProof = Object.freeze({
            kind: "known_capability",
            singleton: exactProofSingletonV1(expression),
          });
        }
      } else {
        const directPath = directStaticProvenancePathV1(expression, scope);
        if (sameProvenanceV1(directPath, provenance)) {
          if (isStaticallyKnownCallableProvenanceV1(provenance)) {
            exactProof = Object.freeze({
              kind: "known_callable",
              singleton: exactProofSingletonV1(expression),
            });
          } else if (provenanceTrackedRootsV1.has(provenance[0] ?? "")) {
            exactProof = Object.freeze({
              kind: "known_capability",
              singleton: exactProofSingletonV1(expression),
            });
          }
        }
      }
    }
    return { provenance, bootstrap: object.bootstrap, exactProof };
  }

  if (expression.type === "NewExpression") {
    const calleeNode = asNodeV1(expression.callee);
    const callee = resolveExpressionV1(calleeNode, scope);
    const argumentsV1 = asNodesV1(expression.arguments);
    if (dateCallableKindV1(callee.provenance) === "constructor") {
      const input = argumentsV1.length === 1 && argumentsV1[0]?.type !== "SpreadElement"
        ? resolveExpressionV1(argumentsV1[0] ?? null, scope)
        : null;
      const exactProof = proofEligible && !hasTypeArgumentSyntaxV1(expression) &&
          isDirectUnshadowedIdentifierV1(calleeNode, "Date", scope) && input !== null &&
          isSafeDateInputProofV1(input.exactProof ?? null)
        ? Object.freeze<ExactProofV1>({
          kind: "known_date",
          singleton: exactProofSingletonV1(expression),
        })
        : null;
      return {
        provenance: Object.freeze(["Date", "instance"]),
        bootstrap: null,
        exactProof,
        exactProofFailure: exactProof === null ? input?.exactProofFailure ?? "unknown" : null,
      };
    }
    if (
      stringCallableV1(callee.provenance)?.kind === "constructor" &&
      argumentsV1.every(({ type }) => type !== "SpreadElement")
    ) {
      return { provenance: Object.freeze(["String", "instance"]), bootstrap: null };
    }
  }

  if (expression.type === "CallExpression" || expression.type === "OptionalCallExpression") {
    const calleeNode = asNodeV1(expression.callee);
    const callee = resolveExpressionV1(calleeNode, scope);
    if (isExactFunctionConstructorBindV1(callee)) {
      return {
        provenance: Object.freeze([dynamicCodeConstructorProvenanceV1]),
        bootstrap: null,
        exactProof: Object.freeze({
          kind: "function_constructor",
          singleton: exactProofSingletonV1(expression),
        }),
      };
    }
    const calleeExpression = unwrapExpressionV1(calleeNode);
    if (
      callee.exactProof?.kind === "known_callable" &&
      (calleeExpression?.type === "MemberExpression" ||
        calleeExpression?.type === "OptionalMemberExpression") &&
      staticPropertyNameV1(calleeExpression) === "bind"
    ) {
      return {
        provenance: callee.provenance,
        bootstrap: null,
        exactProof: Object.freeze({
          kind: "known_callable",
          singleton: exactProofSingletonV1(expression),
        }),
      };
    }
    if (isExactCreateRequireFactoryCallableV1(callee)) {
      return {
        provenance: Object.freeze([dynamicRequireLoaderProvenanceV1]),
        bootstrap: null,
        exactProof: Object.freeze({
          kind: "known_callable",
          singleton: exactProofSingletonV1(expression),
        }),
      };
    }
    const argumentsV1 = asNodesV1(expression.arguments);
    if (
      proofEligible && !hasTypeArgumentSyntaxV1(expression) &&
      expression.type === "CallExpression" && expression.optional !== true &&
      isDirectUnshadowedMemberV1(calleeNode, "Date", "UTC", scope) &&
      isSafeDirectDateUtcV1(expression, scope)
    ) {
      return {
        provenance: null,
        bootstrap: null,
        exactProof: Object.freeze({
          kind: "date_epoch",
          singleton: exactProofSingletonV1(expression),
        }),
      };
    }
    if (
      proofEligible && !hasTypeArgumentSyntaxV1(expression) &&
      expression.type === "CallExpression" && expression.optional !== true &&
      isDirectUnshadowedMemberV1(calleeNode, "Date", "parse", scope) &&
      argumentsV1.length === 1 && argumentsV1[0]?.type !== "SpreadElement"
    ) {
      const input = resolveExpressionV1(argumentsV1[0] ?? null, scope).exactProof ?? null;
      if (
        input?.kind === "primitive" && typeof input.value === "string" &&
        isStrictFullZoneDateStringV1(input.value)
      ) {
        return {
          provenance: null,
          bootstrap: null,
          exactProof: Object.freeze({
            kind: "date_epoch",
            singleton: exactProofSingletonV1(expression),
          }),
        };
      }
    }
    if (
      proofEligible && !hasTypeArgumentSyntaxV1(expression) &&
      expression.type === "CallExpression" && expression.optional !== true &&
      isDirectUnshadowedIdentifierV1(calleeNode, "String", scope) &&
      argumentsV1.length === 1 && argumentsV1[0]?.type !== "SpreadElement"
    ) {
      const input = resolveExpressionV1(argumentsV1[0] ?? null, scope).exactProof ?? null;
      if (input?.kind === "primitive") {
        return {
          provenance: null,
          bootstrap: null,
          exactProof: Object.freeze({
            kind: "primitive",
            value: String(input.value),
            singleton: exactProofSingletonV1(expression),
          }),
        };
      }
    }
  }

  if (
    proofEligible && !hasTypeArgumentSyntaxV1(expression) &&
    expression.type === "TaggedTemplateExpression" &&
    isDirectUnshadowedMemberV1(asNodeV1(expression.tag), "String", "raw", scope)
  ) {
    const quasi = asNodeV1(expression.quasi);
    if (asNodesV1(quasi?.expressions).length === 0) {
      const item = asNodesV1(quasi?.quasis)[0];
      const value = typeof item?.value === "object" && item.value !== null
        ? item.value as Readonly<{ raw?: unknown }>
        : null;
      if (typeof value?.raw === "string") {
        return {
          provenance: null,
          bootstrap: null,
          exactProof: Object.freeze({
            kind: "primitive",
            value: value.raw,
            singleton: exactProofSingletonV1(expression),
          }),
        };
      }
    }
  }

  if (expression.type === "LogicalExpression") {
    const leftResolved = resolveExpressionV1(asNodeV1(expression.left), scope);
    const rightResolved = resolveExpressionV1(asNodeV1(expression.right), scope);
    const leftIsCallable = isExactShortCircuitCallableV1(leftResolved);
    if (leftIsCallable) {
      const selected = expression.operator === "&&" ? rightResolved : leftResolved;
      const callableProof = selected.exactProof?.kind === "known_callable" ||
          selected.exactProof?.kind === "function_constructor"
        ? selected.exactProof
        : null;
      return {
        provenance: selected.provenance,
        bootstrap: selected.bootstrap,
        exactProof: callableProof,
        exactProofFailure: callableProof === null ? "unknown" : null,
      };
    }
    return {
      provenance: conservativeProvenanceJoinV1(
        leftResolved.provenance,
        rightResolved.provenance,
      ),
      bootstrap: leftResolved.bootstrap ?? rightResolved.bootstrap,
      exactProofFailure: "unknown",
    };
  }

  if (expression.type === "ConditionalExpression") {
    const left = asNodeV1(expression.consequent);
    const right = asNodeV1(expression.alternate);
    const leftResolved = resolveExpressionV1(left, scope);
    const rightResolved = resolveExpressionV1(right, scope);
    return {
      provenance: conservativeProvenanceJoinV1(
        leftResolved.provenance,
        rightResolved.provenance,
      ),
      bootstrap: leftResolved.bootstrap ?? rightResolved.bootstrap,
      exactProofFailure: "unknown",
    };
  }

  if (expression.type === "SequenceExpression") {
    const expressions = asNodesV1(expression.expressions);
    const resolved = resolveExpressionV1(expressions.at(-1) ?? null, scope);
    const callableProof = resolved.exactProof?.kind === "known_callable" ||
        resolved.exactProof?.kind === "function_constructor"
      ? resolved.exactProof
      : null;
    return {
      provenance: resolved.provenance,
      bootstrap: resolved.bootstrap,
      exactProof: callableProof,
      exactProofFailure: callableProof === null ? "unknown" : null,
    };
  }

  if (expression.type === "AssignmentExpression" && expression.operator === "=") {
    const resolved = resolveExpressionV1(asNodeV1(expression.right), scope);
    const callableProof = resolved.exactProof?.kind === "known_callable" ||
        resolved.exactProof?.kind === "function_constructor"
      ? resolved.exactProof
      : null;
    return {
      provenance: resolved.provenance,
      bootstrap: resolved.bootstrap,
      exactProof: callableProof,
      exactProofFailure: callableProof === null ? "unknown" : null,
    };
  }

  return { provenance: null, bootstrap: null, exactProofFailure: "unknown" };
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
  const provenance = extendStaticProvenanceV1(left.provenance, right);
  return { provenance, bootstrap: left.bootstrap };
}

function setBindingExactStateV1(
  binding: BindingV1,
  exactProof: ExactProofV1 | null,
  exactAlias: BindingV1 | null,
  resolver: ExactProofResolverV1,
): void {
  if (sameExactProofV1(binding.exactProof, exactProof) && binding.exactAlias === exactAlias) return;
  const pending = [binding];
  const seen = new Set<BindingV1>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || seen.has(current)) continue;
    seen.add(current);
    resolver.cache.delete(current);
    for (const dependent of resolver.dependents.get(current) ?? []) pending.push(dependent);
  }
  const previousAlias = binding.exactAlias;
  if (previousAlias !== null) {
    const previousDependents = resolver.dependents.get(previousAlias);
    previousDependents?.delete(binding);
    if (previousDependents?.size === 0) resolver.dependents.delete(previousAlias);
  }
  binding.exactProof = exactProof;
  binding.exactAlias = exactAlias;
  if (exactAlias !== null) {
    const dependents = resolver.dependents.get(exactAlias) ?? new Set<BindingV1>();
    dependents.add(binding);
    resolver.dependents.set(exactAlias, dependents);
  }
}

function derivePatternPropertyV1(
  property: AstNodeV1,
  resolved: ResolvedExpressionV1,
): Readonly<{
  propertyName: string | null;
  provenance: readonly string[] | null;
  exactProof: ExactProofV1 | null;
}> {
  const propertyName = staticPropertyNameV1({
    ...property,
    property: property.key,
    computed: property.computed,
  });
  const dateSource = resolved.exactProof?.kind === "known_date" ||
    isDateInstanceProvenanceV1(resolved.provenance);
  if (property.computed === true && dateSource) {
    return {
      propertyName,
      provenance: Object.freeze([dynamicMemberRiskProvenanceV1]),
      exactProof: null,
    };
  }
  if (propertyName === null && mayProduceDynamicRequireV1(resolved.provenance)) {
    return {
      propertyName,
      provenance: Object.freeze([dynamicRequireRiskProvenanceV1]),
      exactProof: null,
    };
  }
  if (
    propertyName === null && resolved.provenance !== null &&
    isTrackedAmbientCapabilityProvenanceV1(resolved.provenance)
  ) {
    return {
      propertyName,
      provenance: Object.freeze([dynamicMemberRiskProvenanceV1]),
      exactProof: null,
    };
  }
  const provenance = propertyName === "constructor" && resolved.provenance === null
    ? Object.freeze([constructorEscapeRiskProvenanceV1, "constructor"])
    : resolved.provenance !== null && propertyName !== null
    ? extendStaticProvenanceV1(resolved.provenance, propertyName)
    : null;
  let exactProof: ExactProofV1 | null = null;
  if (
    property.computed !== true && provenance !== null &&
    (resolved.exactProof?.kind === "known_capability" ||
      resolved.exactProof?.kind === "known_callable") &&
    isStaticallyKnownCallableProvenanceV1(provenance)
  ) {
    const recoveredConstructor = dateCallableKindV1(provenance) === "constructor" ||
      stringCallableV1(provenance)?.kind === "constructor";
    exactProof = Object.freeze({
      kind: propertyName === "constructor" &&
          resolved.exactProof.kind === "known_callable" && !recoveredConstructor
        ? "function_constructor"
        : "known_callable",
      singleton: exactProofSingletonV1(property),
    });
  }
  return { propertyName, provenance, exactProof };
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
      binding.provenance = mode === "join" || mode === "const_join"
        ? conservativeProvenanceJoinV1(binding.provenance, resolved.provenance)
        : resolved.provenance;
      binding.bootstrap = resolved.bootstrap === null ? null : "forbidden";
      if (mode === "const") {
        setBindingExactStateV1(
          binding,
          resolved.exactProof ?? null,
          resolved.exactAlias ?? null,
          scope.exactProofResolver,
        );
      } else if (mode === "const_join") {
        const nextProof = resolved.exactProof ?? null;
        const nextAlias = resolved.exactAlias ?? null;
        const sameProof = binding.exactProof !== null && nextProof !== null &&
          sameExactProofV1(binding.exactProof, nextProof);
        const sameAlias = binding.exactProof === null && nextProof === null &&
          binding.exactAlias !== null && binding.exactAlias === nextAlias;
        if (!sameProof && !sameAlias) {
          setBindingExactStateV1(binding, null, null, scope.exactProofResolver);
        }
      } else {
        setBindingExactStateV1(binding, null, null, scope.exactProofResolver);
      }
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
        exactProofFailure: "unknown",
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
      const { provenance, exactProof } = derivePatternPropertyV1(property, resolved);
      assignPatternV1(
        asNodeV1(property.value),
        { provenance, bootstrap: resolved.bootstrap, exactProof },
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
    "decorators",
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

  const reportDateInstanceEscapeV1 = (
    value: AstNodeV1 | null,
    scope: ScopeV1,
    diagnosticNode: AstNodeV1 | null = value,
  ): void => {
    if (value === null) return;
    const resolved = resolveExpressionV1(value, scope);
    if (
      resolved.exactProof?.kind === "known_date" ||
      isDateInstanceProvenanceV1(resolved.provenance)
    ) {
      reportNodeV1("determinism.date_instance_unverified", diagnosticNode ?? value);
    }
  };

  const hasProvenStaticDateConstructorRecoveryV1 = (
    node: AstNodeV1,
    scope: ScopeV1,
  ): boolean => {
    const members: string[] = [];
    let current: AstNodeV1 | null = node;
    while (current?.type === "TSQualifiedName") {
      const member = identifierNameV1(asNodeV1(current.right));
      if (member === null) return false;
      members.unshift(member);
      current = asNodeV1(current.left);
    }
    const rootName = identifierNameV1(current);
    if (rootName === null || current === null) return false;
    if (
      rootName === "Date" && lookupBindingV1(scope, "Date") === null &&
      members[0] === "prototype" && members[1] === "constructor"
    ) return true;
    return members[0] === "constructor" &&
      resolveExpressionV1(current, scope).exactProof?.kind === "known_date";
  };

  const hasUnshadowedGlobalThisEntityRootV1 = (
    node: AstNodeV1,
    scope: ScopeV1,
  ): boolean => {
    let current: AstNodeV1 | null = node;
    while (current?.type === "TSQualifiedName") current = asNodeV1(current.left);
    return identifierNameV1(current) === "globalThis" &&
      lookupBindingV1(scope, "globalThis") === null;
  };

  const classifyProvenanceV1 = (
    provenance: readonly string[] | null,
    mode: "call" | "new" | "member",
  ): string | null => {
    if (provenance === null || provenance.length === 0) return null;
    const root = provenance[0] ?? "";
    const members = provenance.slice(1);
    if (
      root === ambiguousCapabilityProvenanceV1 ||
      root === ambiguousDateInstanceProvenanceV1
    ) {
      return "determinism.ambient_capability_escape";
    }
    if (root === constructorEscapeRiskProvenanceV1) {
      return "determinism.capability.constructor_escape";
    }
    if (isDynamicRequireProvenanceV1(provenance)) {
      return "determinism.capability.dynamic_require";
    }
    if (root === dynamicMemberRiskProvenanceV1) {
      return "determinism.capability.dynamic_member";
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
        return "determinism.ambient_capability_escape";
      }
      const callableKind = dateCallableKindV1(provenance);
      if (isDateCallableBindV1(provenance)) {
        return "determinism.ambient_capability_escape";
      }
      if (callableKind === "constructor" && mode === "member") {
        return "determinism.ambient_capability_escape";
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
    if (genericAmbientFallbackRootsV1.has(root) && !intrinsicStaticRootsV1.has(root)) {
      return "determinism.ambient_capability_escape";
    }
    return null;
  };

  const classifyStaticCaptureV1 = (
    node: AstNodeV1,
    provenance: readonly string[] | null,
    scope: ScopeV1,
  ): string | null => {
    const hasDateConstructorRecoveryPrefix = provenance?.[0] === "Date" &&
      (provenance[1] === "instance" || provenance[1] === "prototype") &&
      provenance[2] === "constructor";
    if (
      hasDateConstructorRecoveryPrefix &&
      !hasProvenStaticDateConstructorRecoveryV1(node, scope)
    ) return "determinism.capability.constructor_escape";
    const dateCallable = dateCallableKindV1(provenance);
    if (dateCallable === "now") return "determinism.clock.date_now";
    if (dateCallable === "parse" || dateCallable === "utc") {
      return "determinism.capability.indirect_intrinsic";
    }
    if (dateCallable === "constructor" && provenance?.at(-1) === "constructor") {
      return "determinism.capability.indirect_intrinsic";
    }
    if (provenance?.at(-1) === "constructor") {
      return "determinism.capability.constructor_escape";
    }
    if (isDateInstanceProvenanceV1(provenance) && (provenance?.length ?? 0) > 2) {
      return "determinism.date_instance_unverified";
    }
    const name = identifierNameV1(node);
    if (
      provenance?.length === 1 && name !== null && lookupBindingV1(scope, name) === null
    ) {
      if (name === "performance") return "determinism.performance_clock";
      if (name === "crypto") return "determinism.crypto_random";
      if (name === "navigator") return "determinism.locale";
    }
    const code = classifyProvenanceV1(provenance, "member");
    if (code !== null) return code;
    return provenance?.length === 1 && hasUnshadowedGlobalThisEntityRootV1(node, scope)
      ? "determinism.ambient_capability_escape"
      : null;
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

  const visitRuntimeValueProducerV1 = (
    node: AstNodeV1 | null,
    scope: ScopeV1,
    suppressImmediateBoundConstructorCapture = false,
  ): void => {
    const expression = unwrapExpressionV1(node);
    if (expression === null) return;
    if (
      suppressImmediateBoundConstructorCapture &&
      (expression.type === "CallExpression" ||
        expression.type === "OptionalCallExpression")
    ) {
      const callee = asNodeV1(expression.callee);
      if (isExactFunctionConstructorBindV1(resolveExpressionV1(callee, scope))) {
        visitRuntimeValueProducerV1(callee, scope, true);
        for (const argument of asNodesV1(expression.arguments)) {
          const value = argument.type === "SpreadElement" ? asNodeV1(argument.argument) : argument;
          if (value !== null) {
            visitV1(value, scope);
            reportDateInstanceEscapeV1(value, scope);
          }
        }
        return;
      }
    }
    if (
      expression.type === "Identifier" || expression.type === "ThisExpression" ||
      expression.type === "Super" || expression.type.endsWith("Literal")
    ) return;
    if (
      expression.type === "MemberExpression" || expression.type === "OptionalMemberExpression"
    ) {
      const object = asNodeV1(expression.object);
      visitRuntimeValueProducerV1(object, scope, suppressImmediateBoundConstructorCapture);
      visitComputedPropertyV1(expression, scope);
      if (
        staticPropertyNameV1(expression) === null &&
        isTrackedAmbientCapabilityProvenanceV1(resolveExpressionV1(object, scope).provenance)
      ) {
        const objectProvenance = resolveExpressionV1(object, scope).provenance;
        reportNodeV1(
          mayProduceDynamicRequireV1(objectProvenance)
            ? "determinism.capability.dynamic_require"
            : "determinism.capability.dynamic_member",
          expression,
        );
      }
      return;
    }
    if (expression.type === "SequenceExpression") {
      const expressions = asNodesV1(expression.expressions);
      for (const item of expressions.slice(0, -1)) visitV1(item, scope);
      visitRuntimeValueProducerV1(
        expressions.at(-1) ?? null,
        scope,
        suppressImmediateBoundConstructorCapture,
      );
      return;
    }
    if (expression.type === "AssignmentExpression" && expression.operator === "=") {
      visitAssignmentExpressionV1(
        expression,
        scope,
        suppressImmediateBoundConstructorCapture,
      );
      return;
    }
    if (expression.type === "ConditionalExpression") {
      const test = asNodeV1(expression.test);
      if (test !== null) visitV1(test, scope);
      const consequent = asNodeV1(expression.consequent);
      const alternate = asNodeV1(expression.alternate);
      if (consequent !== null) visitV1(consequent, scope);
      if (alternate !== null) visitV1(alternate, scope);
      return;
    }
    if (expression.type === "LogicalExpression") {
      const left = asNodeV1(expression.left);
      const leftResolved = resolveExpressionV1(left, scope);
      const leftIsExactCallable = isExactShortCircuitCallableV1(leftResolved);
      if (leftIsExactCallable) {
        if (expression.operator === "&&") {
          if (left !== null) visitV1(left, scope);
          visitRuntimeValueProducerV1(
            asNodeV1(expression.right),
            scope,
            suppressImmediateBoundConstructorCapture,
          );
        } else {
          visitRuntimeValueProducerV1(
            left,
            scope,
            suppressImmediateBoundConstructorCapture,
          );
        }
        return;
      }
      if (left !== null) visitV1(left, scope);
      const right = asNodeV1(expression.right);
      if (right !== null) visitV1(right, scope);
      return;
    }
    visitV1(expression, scope);
  };

  const inspectWriteTargetV1 = (targetNode: AstNodeV1 | null, scope: ScopeV1): boolean => {
    const target = unwrapExpressionV1(targetNode);
    if (target === null) return false;
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
            : intrinsicStaticRootsV1.has(name)
            ? "determinism.capability.intrinsic_mutation"
            : "determinism.ambient_capability_escape",
          target,
        );
        return true;
      }
      return false;
    }
    if (target.type === "MemberExpression" || target.type === "OptionalMemberExpression") {
      const object = asNodeV1(target.object);
      visitRuntimeValueProducerV1(object, scope);
      visitComputedPropertyV1(target, scope);
      const provenance = resolveExpressionV1(target, scope).provenance;
      const objectResolved = resolveExpressionV1(object, scope);
      const objectProvenance = objectResolved.provenance;
      const isIntrinsicCapabilityPathV1 = (candidate: readonly string[] | null): boolean =>
        candidate !== null && intrinsicStaticRootsV1.has(candidate[0] ?? "") &&
        !(candidate[0] === "Date" && candidate[1] === "instance");
      if (
        isIntrinsicCapabilityPathV1(provenance) ||
        isIntrinsicCapabilityPathV1(objectProvenance)
      ) {
        reportNodeV1("determinism.capability.intrinsic_mutation", target);
        return true;
      }
      if (
        objectResolved.exactProof?.kind === "known_date" ||
        isDateInstanceProvenanceV1(objectProvenance)
      ) {
        reportNodeV1("determinism.date_instance_mutation", target);
        return true;
      }
      if (
        staticPropertyNameV1(target) === null &&
        (objectProvenance?.[0] === "globalThis" ||
          objectProvenance?.[0] === ambiguousCapabilityProvenanceV1)
      ) {
        reportNodeV1("determinism.capability.dynamic_member", target);
        return true;
      }
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
        return true;
      }
      return false;
    }
    if (target.type === "AssignmentPattern" || target.type === "RestElement") {
      return inspectWriteTargetV1(
        asNodeV1(target.type === "AssignmentPattern" ? target.left : target.argument),
        scope,
      );
    }
    if (target.type === "ArrayPattern") {
      let classified = false;
      for (const element of asNodesV1(target.elements)) {
        classified = inspectWriteTargetV1(element, scope) || classified;
      }
      return classified;
    }
    if (target.type === "ObjectPattern") {
      let classified = false;
      for (const property of asNodesV1(target.properties)) {
        classified = inspectWriteTargetV1(
          asNodeV1(property.type === "RestElement" ? property.argument : property.value),
          scope,
        ) || classified;
      }
      return classified;
    }
    return false;
  };

  const visitPatternRuntimeV1 = (pattern: AstNodeV1 | null, scope: ScopeV1): void => {
    pattern = unwrapExpressionV1(pattern);
    if (pattern === null) return;
    for (const decorator of asNodesV1(pattern.decorators)) {
      const expression = asNodeV1(decorator.expression);
      if (expression !== null) {
        visitV1(expression, scope);
        reportDateInstanceEscapeV1(expression, scope, decorator);
      }
    }
    if (pattern.type === "AssignmentPattern") {
      visitPatternRuntimeV1(asNodeV1(pattern.left), scope);
      const right = asNodeV1(pattern.right);
      if (right !== null) {
        visitV1(right, scope);
        reportDateInstanceEscapeV1(right, scope);
      }
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
  ): void => {
    pattern = unwrapExpressionV1(pattern);
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
        } else if (mayProduceDynamicRequireV1(resolved.provenance)) {
          reportNodeV1("determinism.capability.dynamic_require", property);
        } else if (
          resolved.provenance?.length === 1 &&
          ambientCapabilityRootsV1.has(resolved.provenance[0] ?? "")
        ) reportNodeV1("determinism.ambient_capability_escape", property);
        continue;
      }
      const { propertyName, provenance } = derivePatternPropertyV1(property, resolved);
      const derived = { provenance, bootstrap: resolved.bootstrap };
      const dateCallable = dateCallableKindV1(derived.provenance);
      if (derived.bootstrap !== null) {
        reportNodeV1("determinism.bootstrap_entropy_escape", property);
      } else if (derived.provenance?.[0] === dynamicMemberRiskProvenanceV1) {
        reportNodeV1("determinism.capability.dynamic_member", property);
      } else if (dateCallable === "now") {
        reportNodeV1("determinism.clock.date_now", property);
      } else if (dateCallable === "parse" || dateCallable === "utc") {
        reportNodeV1("determinism.capability.indirect_intrinsic", property);
      } else if (propertyName === "constructor") {
        reportNodeV1(
          dateCallable === "constructor"
            ? "determinism.capability.indirect_intrinsic"
            : "determinism.capability.constructor_escape",
          property,
        );
      } else {
        const code = classifyProvenanceV1(derived.provenance, "member");
        if (code !== null) reportNodeV1(code, property);
        else if (
          derived.provenance?.length === 1 &&
          ambientCapabilityRootsV1.has(derived.provenance[0] ?? "")
        ) reportNodeV1("determinism.ambient_capability_escape", property);
      }
      reportPatternCapabilitiesV1(asNodeV1(property.value), derived);
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

  const exactKnownDateMemberV1 = (
    callee: AstNodeV1 | null,
    scope: ScopeV1,
  ): Readonly<{ member: string; exact: boolean; dynamic: boolean }> | null => {
    const expression = unwrapExpressionV1(callee);
    if (
      expression?.type !== "MemberExpression" &&
      expression?.type !== "OptionalMemberExpression"
    ) return null;
    const object = asNodeV1(expression.object);
    const objectResolved = resolveExpressionV1(object, scope);
    const provenance = objectResolved.provenance;
    if (
      objectResolved.exactProof?.kind !== "known_date" &&
      !isDateInstanceProvenanceV1(provenance)
    ) return null;
    const property = staticPropertyNameV1(expression);
    const memberDynamic = expression.computed === true || expression.optional === true ||
      property === null;
    const dynamic = memberDynamic || hasProofWrapperV1(callee);
    if (property === "constructor" && !memberDynamic) return null;
    return {
      member: property ?? "",
      exact: objectResolved.exactProof?.kind === "known_date",
      dynamic,
    };
  };

  const classifyExactCallLikeV1 = (
    node: AstNodeV1,
    callee: AstNodeV1 | null,
    calleeResolved: ResolvedExpressionV1,
    scope: ScopeV1,
    mode: "call" | "new",
  ): Readonly<{ handled: boolean; code: string | null }> => {
    if (
      isDirectUnshadowedIdentifierV1(callee, "Function", scope) ||
      isExactFunctionConstructorInvocationV1(calleeResolved) ||
      isExactKnownCallableConstructorV1(calleeResolved)
    ) {
      return { handled: true, code: "determinism.capability.dynamic_code" };
    }
    if (isExactFunctionConstructorBindV1(calleeResolved)) {
      return { handled: true, code: "determinism.capability.constructor_escape" };
    }
    if (isDynamicRequireProvenanceV1(calleeResolved.provenance)) {
      return { handled: true, code: "determinism.capability.dynamic_require" };
    }
    if (calleeResolved.provenance?.[0] === dynamicMemberRiskProvenanceV1) {
      return { handled: true, code: "determinism.capability.dynamic_member" };
    }

    const dateMember = exactKnownDateMemberV1(callee, scope);
    if (dateMember !== null) {
      if (dateMember.dynamic) {
        return { handled: true, code: "determinism.capability.dynamic_member" };
      }
      if (dateMutationMembersV1.has(dateMember.member)) {
        return { handled: true, code: "determinism.date_instance_mutation" };
      }
      if (!dateMember.exact) {
        return { handled: true, code: "determinism.date_instance_unverified" };
      }
      if (
        mode === "call" && node.type === "CallExpression" && node.optional !== true &&
        !hasTypeArgumentSyntaxV1(node) &&
        dateTerminalMembersV1.has(dateMember.member)
      ) return { handled: true, code: null };
      if (dateHostDependentMembersV1.has(dateMember.member)) {
        return { handled: true, code: "determinism.host_timezone" };
      }
      return { handled: true, code: "determinism.date_instance_unverified" };
    }

    const calleeExpression = unwrapExpressionV1(callee);
    const isConstructorMember = (calleeExpression?.type === "MemberExpression" ||
      calleeExpression?.type === "OptionalMemberExpression") &&
      staticPropertyNameV1(calleeExpression) === "constructor";
    if (
      !isConstructorMember &&
      (calleeResolved.exactProof?.kind === "known_date" ||
        isDateInstanceProvenanceV1(calleeResolved.provenance))
    ) {
      return { handled: true, code: "determinism.date_instance_unverified" };
    }

    const callableKind = dateCallableKindV1(calleeResolved.provenance);
    if (isConstructorMember && callableKind === "other") {
      return {
        handled: true,
        code: "determinism.capability.constructor_escape",
      };
    }
    if (callableKind === null) {
      if (stringCallableV1(calleeResolved.provenance) !== null) {
        return { handled: false, code: null };
      }
      if (calleeResolved.provenance?.includes("constructor")) {
        return {
          handled: true,
          code: "determinism.capability.constructor_escape",
        };
      }
      if (
        calleeExpression?.type === "MemberExpression" ||
        calleeExpression?.type === "OptionalMemberExpression"
      ) {
        if (staticPropertyNameV1(calleeExpression) === "constructor") {
          return {
            handled: true,
            code: "determinism.capability.constructor_escape",
          };
        }
      }
      return { handled: false, code: null };
    }

    if (callableKind === "now") {
      return { handled: true, code: "determinism.clock.date_now" };
    }

    const hasTypeArguments = hasTypeArgumentSyntaxV1(node);
    const directDate = !hasTypeArguments && isDirectUnshadowedIdentifierV1(callee, "Date", scope);
    const directParse = !hasTypeArguments && node.type === "CallExpression" &&
      node.optional !== true &&
      isDirectUnshadowedMemberV1(callee, "Date", "parse", scope);
    const directUtc = !hasTypeArguments && node.type === "CallExpression" &&
      node.optional !== true &&
      isDirectUnshadowedMemberV1(callee, "Date", "UTC", scope);
    const argumentsV1 = asNodesV1(node.arguments);

    if (callableKind === "constructor") {
      if (!directDate) {
        return { handled: true, code: "determinism.capability.indirect_intrinsic" };
      }
      if (mode === "call") {
        return { handled: true, code: "determinism.clock.date_function_call" };
      }
      if (argumentsV1.length === 0) {
        return {
          handled: true,
          code: "determinism.clock.date_zero_argument_constructor",
        };
      }
      if (argumentsV1.length !== 1 || argumentsV1[0]?.type === "SpreadElement") {
        return { handled: true, code: "determinism.date_input_unverified" };
      }
      const input = resolveExpressionV1(argumentsV1[0] ?? null, scope);
      if (input.exactProofFailure === "cycle") {
        return { handled: true, code: "determinism.provenance.cycle" };
      }
      if (isSafeDateInputProofV1(input.exactProof ?? null)) {
        return { handled: true, code: null };
      }
      if (
        input.exactProof?.kind === "primitive" &&
        typeof input.exactProof.value === "string" &&
        isLocalZoneDateStringV1(input.exactProof.value)
      ) return { handled: true, code: "determinism.host_timezone" };
      return { handled: true, code: "determinism.date_input_unverified" };
    }

    if (callableKind === "parse") {
      if (!directParse) {
        return { handled: true, code: "determinism.capability.indirect_intrinsic" };
      }
      if (argumentsV1.length !== 1 || argumentsV1[0]?.type === "SpreadElement") {
        return { handled: true, code: "determinism.date_input_unverified" };
      }
      const input = resolveExpressionV1(argumentsV1[0] ?? null, scope);
      if (input.exactProofFailure === "cycle") {
        return { handled: true, code: "determinism.provenance.cycle" };
      }
      if (
        input.exactProof?.kind === "primitive" &&
        typeof input.exactProof.value === "string" &&
        isStrictFullZoneDateStringV1(input.exactProof.value)
      ) return { handled: true, code: null };
      if (
        input.exactProof?.kind === "primitive" &&
        typeof input.exactProof.value === "string" &&
        isLocalZoneDateStringV1(input.exactProof.value)
      ) return { handled: true, code: "determinism.host_timezone" };
      return { handled: true, code: "determinism.date_input_unverified" };
    }

    if (callableKind === "utc") {
      if (!directUtc) {
        return { handled: true, code: "determinism.capability.indirect_intrinsic" };
      }
      return {
        handled: true,
        code: isSafeDirectDateUtcV1(node, scope) ? null : "determinism.date_utc_unverified",
      };
    }

    return { handled: false, code: null };
  };

  const visitCallLikeV1 = (node: AstNodeV1, scope: ScopeV1, mode: "call" | "new"): void => {
    const callee = asNodeV1(node.callee);
    const unwrappedCallee = unwrapExpressionV1(callee);
    const calleeResolved = resolveExpressionV1(unwrappedCallee, scope);
    const suppressBoundConstructorCapture =
      isExactFunctionConstructorInvocationV1(calleeResolved) ||
      isExactKnownCallableConstructorV1(calleeResolved) ||
      isExactFunctionConstructorBindV1(calleeResolved);
    visitRuntimeValueProducerV1(callee, scope, suppressBoundConstructorCapture);
    for (const argument of asNodesV1(node.arguments)) {
      if (argument.type === "SpreadElement") {
        const value = asNodeV1(argument.argument);
        if (value !== null) {
          visitV1(value, scope);
          reportDateInstanceEscapeV1(value, scope);
        }
      } else visitV1(argument, scope);
    }
    let classified = false;

    const exactClassification = classifyExactCallLikeV1(
      node,
      callee,
      calleeResolved,
      scope,
      mode,
    );
    if (exactClassification.handled) {
      if (exactClassification.code !== null && unwrappedCallee !== null) {
        reportNodeV1(exactClassification.code, unwrappedCallee);
      }
      classified = true;
    }

    const stringCallable = stringCallableV1(calleeResolved.provenance);
    const stringCoercedValues = new Set<AstNodeV1>();
    if (!classified && stringCallable?.wrapper === "bind" && unwrappedCallee !== null) {
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
        stringCoercedValues.add(value);
        const code = dateCoercionDiagnosticV1(resolveExpressionV1(value, scope).provenance);
        if (code !== null) {
          reportNodeV1(code, value);
          classified = true;
        }
      }
    }

    const dateCallable = dateCallableKindV1(calleeResolved.provenance);
    const hasTypeArguments = hasTypeArgumentSyntaxV1(node);
    const callableOwnsDateInputFailure = !hasTypeArguments &&
      (dateCallable === "constructor" && mode === "new" &&
          isDirectUnshadowedIdentifierV1(callee, "Date", scope) ||
        dateCallable === "parse" && node.type === "CallExpression" && node.optional !== true &&
          isDirectUnshadowedMemberV1(callee, "Date", "parse", scope) ||
        dateCallable === "utc" && node.type === "CallExpression" && node.optional !== true &&
          isDirectUnshadowedMemberV1(callee, "Date", "UTC", scope));
    if (!callableOwnsDateInputFailure) {
      for (const argument of asNodesV1(node.arguments)) {
        const value = argument.type === "SpreadElement" ? asNodeV1(argument.argument) : argument;
        if (value !== null && stringCoercedValues.has(value)) continue;
        const valueResolved = resolveExpressionV1(value, scope);
        if (
          value !== null &&
          (valueResolved.exactProof?.kind === "known_date" ||
            isDateInstanceProvenanceV1(valueResolved.provenance))
        ) {
          reportNodeV1("determinism.date_instance_unverified", value);
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
            : "determinism.capability.dynamic_member",
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
      } else if (binding === null && name !== null) {
        const code = name === "performance"
          ? "determinism.performance_clock"
          : name === "crypto"
          ? "determinism.crypto_random"
          : name === "navigator"
          ? "determinism.locale"
          : null;
        if (code !== null) {
          reportNodeV1(code, unwrappedCallee);
          classified = true;
        }
      }
    }

    if (!classified && unwrappedCallee !== null) {
      const code = classifyProvenanceV1(calleeResolved.provenance, mode);
      if (code !== null) {
        reportNodeV1(code, unwrappedCallee);
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
    const assignParameterDefaultsV1 = (pattern: AstNodeV1 | null): void => {
      pattern = unwrapExpressionV1(pattern);
      if (pattern === null) return;
      if (pattern.type === "TSParameterProperty") {
        assignParameterDefaultsV1(asNodeV1(pattern.parameter));
        return;
      }
      if (pattern.type === "AssignmentPattern") {
        const left = asNodeV1(pattern.left);
        const fallback = asNodeV1(pattern.right);
        const resolved = resolveExpressionV1(fallback, scope);
        const leftIdentifier = unwrapExpressionV1(left);
        const bootstrapBinding = leftIdentifier?.type === "Identifier"
          ? lookupBindingV1(scope, identifierNameV1(leftIdentifier) ?? "")
          : null;
        const preservesVerifiedBootstrap = bootstrapBinding?.bootstrap === "allowed";
        assignPatternV1(left, resolved, scope, "mutable");
        if (preservesVerifiedBootstrap && bootstrapBinding !== null) {
          bootstrapBinding.bootstrap = "allowed";
        }
        assignParameterDefaultsV1(left);
        return;
      }
      if (pattern.type === "RestElement") {
        assignParameterDefaultsV1(asNodeV1(pattern.argument));
        return;
      }
      if (pattern.type === "ArrayPattern") {
        for (const element of asNodesV1(pattern.elements)) assignParameterDefaultsV1(element);
        return;
      }
      if (pattern.type === "ObjectPattern") {
        for (const property of asNodesV1(pattern.properties)) {
          assignParameterDefaultsV1(
            asNodeV1(property.type === "RestElement" ? property.argument : property.value),
          );
        }
      }
    };
    for (const parameter of params) assignParameterDefaultsV1(parameter);
    const body = asNodeV1(node.body);
    try {
      if (body?.type === "BlockStatement") {
        if (provenanceReplayDepthV1 === 0) collectHoistedVarV1(body, scope);
        visitStatementListV1(asNodesV1(body.body), scope);
      } else if (body !== null) {
        visitV1(body, scope);
        reportDateInstanceEscapeV1(body, scope);
      }
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
      if (expression !== null) {
        visitV1(expression, parentScope);
        reportDateInstanceEscapeV1(expression, parentScope, decorator);
      }
    }
    const superClass = asNodeV1(node.superClass);
    if (superClass !== null) {
      visitV1(superClass, parentScope);
      reportDateInstanceEscapeV1(superClass, parentScope);
    }

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

  const visitAssignmentExpressionV1 = (
    node: AstNodeV1,
    scope: ScopeV1,
    suppressExactRhsProducer = false,
  ): void => {
    const right = asNodeV1(node.right);
    const left = asNodeV1(node.left);
    const assignmentTarget = unwrapExpressionV1(left);
    const hasCurrentNodeWriteWinner = inspectWriteTargetV1(left, scope);
    const initialResolved = resolveExpressionV1(right, scope);
    const staticallyDestructuredAmbientRoot = left?.type === "ObjectPattern" &&
      initialResolved.provenance?.length === 1 &&
      ambientCapabilityRootsV1.has(initialResolved.provenance[0] ?? "");
    if (right !== null) {
      if (suppressExactRhsProducer) {
        visitRuntimeValueProducerV1(right, scope, true);
      } else if (staticallyDestructuredAmbientRoot) {
        visitRuntimeValueProducerV1(right, scope);
      } else visitV1(right, scope);
      if (
        node.operator === "=" || node.operator === "&&=" || node.operator === "||=" ||
        node.operator === "??="
      ) reportDateInstanceEscapeV1(right, scope);
    }
    if (node.operator === "+=" && !hasCurrentNodeWriteWinner) {
      const leftCode = dateCoercionDiagnosticV1(resolveExpressionV1(left, scope).provenance);
      const rightCode = dateCoercionDiagnosticV1(resolveExpressionV1(right, scope).provenance);
      const code = leftCode === "determinism.host_timezone" ||
          rightCode === "determinism.host_timezone"
        ? "determinism.host_timezone"
        : leftCode ?? rightCode;
      if (code !== null) reportNodeV1(code, node);
    }
    const numericAssignment = node.operator === "-=" || node.operator === "*=" ||
      node.operator === "/=" ||
      node.operator === "%=" || node.operator === "**=" || node.operator === "|=" ||
      node.operator === "&=" || node.operator === "^=" || node.operator === "<<=" ||
      node.operator === ">>=" || node.operator === ">>>=";
    const hasDateNumericOperand = numericAssignment &&
      (isDateInstanceProvenanceV1(resolveExpressionV1(left, scope).provenance) ||
        isDateInstanceProvenanceV1(resolveExpressionV1(right, scope).provenance));
    if (!hasCurrentNodeWriteWinner && hasDateNumericOperand) {
      reportNodeV1("determinism.date_instance_unverified", node);
    } else if (!hasCurrentNodeWriteWinner && node.operator === "**=") {
      reportNodeV1("determinism.numeric_approximate_math", node);
    }
    const resolved = resolveExpressionV1(right, scope);
    if (
      assignmentTarget?.type === "Identifier" || assignmentTarget?.type === "ObjectPattern" ||
      assignmentTarget?.type === "ArrayPattern" ||
      assignmentTarget?.type === "AssignmentPattern" ||
      assignmentTarget?.type === "RestElement"
    ) {
      visitPatternRuntimeV1(assignmentTarget, scope);
      reportPatternCapabilitiesV1(assignmentTarget, resolved);
      assignPatternV1(assignmentTarget, resolved, scope, "join");
    } else if (
      assignmentTarget !== null && assignmentTarget.type !== "MemberExpression" &&
      assignmentTarget.type !== "OptionalMemberExpression"
    ) visitV1(assignmentTarget, scope);
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
      case "TSEnumDeclaration": {
        if (node.declare !== true) {
          const body = asNodeV1(node.body);
          const members = body?.type === "TSEnumBody"
            ? asNodesV1(body.members)
            : asNodesV1(node.members);
          for (const member of members) {
            const initializer = asNodeV1(member.initializer);
            if (initializer !== null) {
              visitV1(initializer, scope);
              reportDateInstanceEscapeV1(initializer, scope);
            }
          }
        }
        return;
      }
      case "TSExportAssignment": {
        const expression = asNodeV1(node.expression);
        if (expression !== null) {
          visitV1(expression, scope);
          reportDateInstanceEscapeV1(expression, scope);
        }
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
          const code = classifyStaticCaptureV1(moduleReference, resolved.provenance, scope);
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
        if (declaration !== null) {
          visitV1(declaration, scope);
          if (declaration.type === "VariableDeclaration") {
            for (const item of asNodesV1(declaration.declarations)) {
              reportDateInstanceEscapeV1(asNodeV1(item.init), scope);
            }
          }
        }
        if (sourceNode === null) {
          for (const item of exportSpecifiers) {
            if (item.exportKind === "type") continue;
            const local = asNodeV1(item.local);
            if (local !== null) {
              visitV1(local, scope);
              reportDateInstanceEscapeV1(local, scope);
            }
          }
        }
        return;
      }
      case "ExportDefaultDeclaration": {
        const declaration = asNodeV1(node.declaration);
        if (declaration !== null) {
          visitV1(declaration, scope);
          reportDateInstanceEscapeV1(declaration, scope);
        }
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
            if (node.kind !== "const" || pattern?.type !== "Identifier") {
              reportDateInstanceEscapeV1(initializer, scope);
            }
          }
          visitPatternRuntimeV1(pattern, scope);
          reportPatternCapabilitiesV1(pattern, resolved);
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
          if (expression !== null) {
            visitV1(expression, scope);
            reportDateInstanceEscapeV1(expression, scope, decorator);
          }
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
          if (expression !== null) {
            visitV1(expression, scope);
            reportDateInstanceEscapeV1(expression, scope, decorator);
          }
        }
        const value = asNodeV1(node.value);
        if (value !== null) {
          const keyName = staticKeyNameV1(node);
          if (
            value.type === "FunctionExpression" || value.type === "ArrowFunctionExpression"
          ) visitFunctionV1(value, scope, keyName);
          else visitV1(value, scope);
          reportDateInstanceEscapeV1(value, scope, node);
        }
        return;
      }
      case "ArrayExpression": {
        for (const element of asNodesV1(node.elements)) {
          const value = element.type === "SpreadElement" ? asNodeV1(element.argument) : element;
          if (value !== null) {
            visitV1(value, scope);
            reportDateInstanceEscapeV1(value, scope, node);
          }
        }
        return;
      }
      case "JSXExpressionContainer":
      case "JSXSpreadChild": {
        const value = asNodeV1(node.expression);
        if (value !== null && value.type !== "JSXEmptyExpression") {
          visitV1(value, scope);
          reportDateInstanceEscapeV1(value, scope, node);
        }
        return;
      }
      case "JSXSpreadAttribute": {
        const value = asNodeV1(node.argument);
        if (value !== null) {
          visitV1(value, scope);
          reportDateInstanceEscapeV1(value, scope, node);
        }
        return;
      }
      case "ReturnStatement":
      case "ThrowStatement": {
        const value = asNodeV1(node.argument);
        if (value !== null) {
          visitV1(value, scope);
          reportDateInstanceEscapeV1(value, scope);
        }
        return;
      }
      case "YieldExpression":
      case "AwaitExpression": {
        const value = asNodeV1(node.argument);
        if (value !== null) {
          visitV1(value, scope);
          reportDateInstanceEscapeV1(value, scope);
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
        const objectResolved = resolveExpressionV1(object, scope);
        if (
          property === "constructor" &&
          (objectResolved.exactProof?.kind === "known_date" ||
            isDateInstanceProvenanceV1(objectResolved.provenance)) &&
          (node.computed === true || node.optional === true)
        ) {
          reportNodeV1("determinism.capability.dynamic_member", node);
          return;
        }
        if (
          property === "constructor" && dateCallableKindV1(resolved.provenance) === "constructor"
        ) {
          reportNodeV1("determinism.capability.indirect_intrinsic", node);
          return;
        }
        if (
          property === "constructor" &&
          knownCallableConstructorProvenanceV1(resolved.provenance)
        ) {
          reportNodeV1("determinism.capability.constructor_escape", node);
          return;
        }
        if (property === "constructor") {
          reportNodeV1("determinism.capability.constructor_escape", node);
          return;
        }
        if (
          objectResolved.exactProof?.kind === "known_date" ||
          isDateInstanceProvenanceV1(objectResolved.provenance)
        ) {
          reportNodeV1(
            node.computed === true || node.optional === true || property === null
              ? "determinism.capability.dynamic_member"
              : "determinism.date_instance_unverified",
            node,
          );
          return;
        }
        const dateMemberKind = dateCallableKindV1(resolved.provenance);
        if (dateMemberKind === "now") {
          reportNodeV1("determinism.clock.date_now", node);
          return;
        }
        if (dateMemberKind === "parse" || dateMemberKind === "utc") {
          reportNodeV1("determinism.capability.indirect_intrinsic", node);
          return;
        }
        if (
          property === null &&
          isTrackedAmbientCapabilityProvenanceV1(objectResolved.provenance)
        ) {
          reportNodeV1(
            mayProduceDynamicRequireV1(objectResolved.provenance)
              ? "determinism.capability.dynamic_require"
              : "determinism.capability.dynamic_member",
            node,
          );
          return;
        }
        if (property === "nextUuidV4" || property === "nextNonZeroUint32") {
          reportNodeV1("determinism.bootstrap_entropy_escape", node);
          return;
        }
        const code = classifyProvenanceV1(resolved.provenance, "member");
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
        if (
          (node.operator === "+" || node.operator === "-" || node.operator === "~") &&
          isDateInstanceProvenanceV1(resolveExpressionV1(argument, scope).provenance)
        ) {
          if (argument !== null) visitV1(argument, scope);
          reportNodeV1("determinism.date_instance_unverified", node);
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
      case "LogicalExpression": {
        const left = asNodeV1(node.left);
        const right = asNodeV1(node.right);
        if (left !== null) visitV1(left, scope);
        const leftResolved = resolveExpressionV1(left, scope);
        const leftIsExactCallable = isExactShortCircuitCallableV1(leftResolved);
        if (!leftIsExactCallable || node.operator === "&&") {
          if (right !== null) visitV1(right, scope);
        }
        return;
      }
      case "BinaryExpression": {
        const left = asNodeV1(node.left);
        const right = asNodeV1(node.right);
        if (left !== null) visitV1(left, scope);
        if (right !== null) visitV1(right, scope);
        const numericDateCoercion = node.operator === "-" || node.operator === "*" ||
          node.operator === "/" ||
          node.operator === "%" || node.operator === "**" || node.operator === "<" ||
          node.operator === "<=" || node.operator === ">" || node.operator === ">=" ||
          node.operator === "|" || node.operator === "&" || node.operator === "^" ||
          node.operator === "<<" || node.operator === ">>" || node.operator === ">>>";
        const hasDateNumericOperand = numericDateCoercion &&
          (isDateInstanceProvenanceV1(resolveExpressionV1(left, scope).provenance) ||
            isDateInstanceProvenanceV1(resolveExpressionV1(right, scope).provenance));
        if (hasDateNumericOperand) {
          reportNodeV1("determinism.date_instance_unverified", node);
        } else if (node.operator === "**") {
          reportNodeV1("determinism.numeric_approximate_math", node);
        }
        if (
          node.operator === "instanceof" &&
          isDateInstanceProvenanceV1(resolveExpressionV1(right, scope).provenance)
        ) {
          reportNodeV1("determinism.date_instance_unverified", right ?? node);
        }
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
        const tagResolved = resolveExpressionV1(tag, scope);
        const tagProvenance = tagResolved.provenance;
        const suppressBoundConstructorCapture =
          isExactFunctionConstructorInvocationV1(tagResolved) ||
          isExactKnownCallableConstructorV1(tagResolved) ||
          isExactFunctionConstructorBindV1(tagResolved);
        visitRuntimeValueProducerV1(tag, scope, suppressBoundConstructorCapture);
        for (const expression of expressions) visitV1(expression, scope);

        let classified = false;
        const stringCallable = stringCallableV1(tagProvenance);
        const stringCoercedValues = new Set<AstNodeV1>();
        if (
          tag !== null &&
          (isDirectUnshadowedIdentifierV1(tag, "Function", scope) ||
            isExactFunctionConstructorInvocationV1(tagResolved) ||
            isExactKnownCallableConstructorV1(tagResolved))
        ) {
          reportNodeV1("determinism.capability.dynamic_code", tag);
          classified = true;
        } else if (
          tag !== null && isExactFunctionConstructorBindV1(tagResolved)
        ) {
          reportNodeV1("determinism.capability.constructor_escape", tag);
          classified = true;
        } else if (tag !== null && tagProvenance?.[0] === dynamicMemberRiskProvenanceV1) {
          reportNodeV1("determinism.capability.dynamic_member", tag);
          classified = true;
        } else if (tag !== null && isDynamicRequireProvenanceV1(tagProvenance)) {
          reportNodeV1("determinism.capability.dynamic_require", tag);
          classified = true;
        } else if (tag !== null && isUnsupportedStringCallablePathV1(tagProvenance)) {
          reportNodeV1("determinism.ambient_capability_escape", tag);
          classified = true;
        } else if (stringCallable !== null) {
          classified = true;
          if (stringCallable.wrapper === "bind") {
            if (tag !== null) reportNodeV1("determinism.ambient_capability_escape", tag);
          } else if (stringCallable.kind === "raw" && stringCallable.wrapper === null) {
            for (const expression of expressions) {
              stringCoercedValues.add(expression);
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
              stringCoercedValues.add(value);
              const code = dateCoercionDiagnosticV1(
                resolveExpressionV1(value, scope).provenance,
              );
              if (code !== null) reportNodeV1(code, value);
            }
          }
        }

        const dateCallable = dateCallableKindV1(tagProvenance);
        const tagExpression = unwrapExpressionV1(tag);
        const unknownDateConstructor = dateCallable === "other" &&
          (tagExpression?.type === "MemberExpression" ||
            tagExpression?.type === "OptionalMemberExpression") &&
          staticPropertyNameV1(tagExpression) === "constructor";
        if (
          !classified && tag !== null &&
          (tagResolved.exactProof?.kind === "known_date" ||
            isDateInstanceProvenanceV1(tagProvenance))
        ) {
          reportNodeV1("determinism.date_instance_unverified", tag);
          classified = true;
        }
        if (!classified && tag !== null && unknownDateConstructor) {
          reportNodeV1("determinism.capability.constructor_escape", tag);
          classified = true;
        }
        if (!classified && dateCallable !== null) {
          classified = true;
          if (tag !== null) {
            reportNodeV1(
              dateCallable === "now"
                ? "determinism.clock.date_now"
                : dateCallable === "constructor" &&
                    isDirectUnshadowedIdentifierV1(tag, "Date", scope)
                ? "determinism.clock.date_function_call"
                : "determinism.capability.indirect_intrinsic",
              tag,
            );
          }
        }

        if (
          !classified && tag !== null &&
          (tagProvenance?.includes("constructor") ||
            staticPropertyNameV1(unwrapExpressionV1(tag) ?? tag) === "constructor")
        ) {
          reportNodeV1("determinism.capability.constructor_escape", tag);
          classified = true;
        }

        if (!classified && tag !== null) {
          const code = classifyProvenanceV1(tagProvenance, "call");
          if (code !== null) {
            reportNodeV1(code, tag);
          } else if (
            tagProvenance?.length === 1 &&
            provenanceTrackedRootsV1.has(tagProvenance[0] ?? "")
          ) reportNodeV1("determinism.ambient_capability_escape", tag);
        }
        for (const expression of expressions) {
          if (!stringCoercedValues.has(expression)) {
            reportDateInstanceEscapeV1(expression, scope);
          }
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
        visitAssignmentExpressionV1(node, scope);
        return;
      }
      case "UpdateExpression": {
        const argument = asNodeV1(node.argument);
        const assignmentTarget = unwrapExpressionV1(argument);
        const argumentResolved = resolveExpressionV1(argument, scope);
        inspectWriteTargetV1(argument, scope);
        if (assignmentTarget?.type === "Identifier") {
          if (isDateInstanceProvenanceV1(argumentResolved.provenance)) {
            reportNodeV1("determinism.date_instance_unverified", node);
          }
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
        if (
          node.type === "ForOfStatement" && right !== null &&
          isDateInstanceProvenanceV1(resolveExpressionV1(right, loopScope).provenance)
        ) {
          reportNodeV1("determinism.date_instance_unverified", right);
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

  const rootScope = createRootScopeV1(options.exactProofAliasStepObserverForTests ?? null);
  visitV1(program, rootScope);

  const analysisScopesV1 = (): readonly ScopeV1[] => {
    const scopes = new Set<ScopeV1>([rootScope, ...lexicalScopesV1.values()]);
    for (const deferred of deferredFunctionsV1.values()) scopes.add(deferred.scope);
    return [...scopes];
  };
  const deferredBindingStateV1 = (): string => {
    const entries = analysisScopesV1().map((scope) =>
      [...scope.bindings.entries()]
        .sort(([left], [right]) => compareCodeUnitsV1(left, right))
    );
    const bindingIds = new Map<BindingV1, number>();
    let nextBindingId = 0;
    for (const scopeEntries of entries) {
      for (const [, binding] of scopeEntries) {
        bindingIds.set(binding, nextBindingId);
        nextBindingId += 1;
      }
    }
    return JSON.stringify(
      entries.map((scopeEntries) =>
        scopeEntries.map(([name, binding]) => [
          name,
          binding.provenance,
          binding.bootstrap,
          binding.exactProof,
          binding.exactAlias === null ? null : bindingIds.get(binding.exactAlias) ?? null,
        ])
      ),
    );
  };
  const deferredBindingCountV1 = analysisScopesV1().reduce(
    (count, scope) => count + scope.bindings.size,
    0,
  );
  const configuredPassBudgetV1 = options.provenancePassBudgetForTests;
  const deferredPassLimitV1 = configuredPassBudgetV1 === undefined
    ? Math.max(8, (deferredFunctionsV1.size + deferredBindingCountV1) * 4)
    : Number.isSafeInteger(configuredPassBudgetV1) && configuredPassBudgetV1 >= 0
    ? configuredPassBudgetV1
    : 0;
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

  if (!deferredConvergedV1) {
    recordDiagnosticV1(
      "determinism.provenance.budget_exhausted",
      nodeStartV1(program),
      nodeEndV1(program),
    );
    return freezeDiagnosticsV1(options.file, lines, rawDiagnostics);
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
