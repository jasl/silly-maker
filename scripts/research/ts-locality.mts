// SPDX-License-Identifier: MIT
import { parse, type ParserPlugin } from "@babel/parser";
import { isAbsolute, join, posix, resolve } from "node:path";

declare const Deno: {
  readonly args: readonly string[];
  exitCode: number;
  readonly Command: new (
    command: string,
    options: {
      readonly args: readonly string[];
      readonly stdout: "piped";
      readonly stderr: "piped";
    },
  ) => {
    output(): Promise<{
      readonly success: boolean;
      readonly stdout: Uint8Array;
      readonly stderr: Uint8Array;
    }>;
  };
  lstat(path: string): Promise<{ readonly isFile: boolean; readonly isSymlink: boolean }>;
  readTextFile(path: string): Promise<string>;
  realPath(path: string): Promise<string>;
  stat(path: string): Promise<{ readonly isDirectory: boolean }>;
};

type DependencyKindV1 = "import" | "import_equals" | "export_named" | "export_all";
type DependencyResolutionV1 = "tracked" | "external" | "unresolved_relative";

interface AstNodeV1 {
  readonly type: string;
  readonly [key: string]: unknown;
}

export interface TypeScriptLocalityOptionsV1 {
  /** Explicit repository root. The collector never searches for a repository. */
  readonly repositoryRoot: string;
  /** Tracked, repository-relative files whose dependency closures are reported. */
  readonly entries?: readonly string[];
  /** Tracked, repository-relative files whose dependent closures are reported. */
  readonly targets?: readonly string[];
}

export interface TypeScriptLocalityFileV1 {
  readonly path: string;
  readonly physicalLines: number;
  readonly astExports: number;
  readonly domain: string;
}

export interface StaticDependencyStatementV1 {
  readonly from: string;
  readonly specifier: string;
  readonly kind: DependencyKindV1;
  readonly typeOnly: boolean;
  readonly resolution: DependencyResolutionV1;
  readonly target: string | null;
}

export interface TypeScriptLocalityGraphEdgeV1 {
  readonly from: string;
  readonly to: string;
  /** True only when every static statement between the files is type-only. */
  readonly typeOnly: boolean;
  readonly kinds: readonly DependencyKindV1[];
  readonly specifiers: readonly string[];
}

export interface TypeScriptLocalityCrossDomainEdgeV1 extends TypeScriptLocalityGraphEdgeV1 {
  readonly fromDomain: string;
  readonly toDomain: string;
}

export interface TypeScriptLocalitySccV1 {
  readonly componentCount: number;
  readonly cyclicComponentCount: number;
  readonly largestSize: number;
  readonly largestComponent: readonly string[];
  readonly components: readonly (readonly string[])[];
  readonly cyclicComponents: readonly (readonly string[])[];
}

export interface TypeScriptLocalityClosureV1 {
  readonly path: string;
  readonly allStatic: readonly string[];
  readonly runtimeOnly: readonly string[];
}

export interface TypeScriptLocalityReportV1 {
  readonly schemaVersion: 1;
  readonly repositoryRoot: string;
  readonly sourceRoot: "src";
  readonly files: {
    readonly trackedTypeScript: number;
    readonly physicalLines: number;
    readonly astExports: number;
    readonly entries: readonly TypeScriptLocalityFileV1[];
  };
  readonly staticDependencies: {
    readonly statementCount: number;
    readonly statements: readonly StaticDependencyStatementV1[];
    readonly trackedGraphEdges: readonly TypeScriptLocalityGraphEdgeV1[];
    /** The tracked graph after erasing imports and re-exports used only as types. */
    readonly runtimeGraphEdges: readonly TypeScriptLocalityGraphEdgeV1[];
    readonly unresolvedRelativeStatements: readonly StaticDependencyStatementV1[];
    readonly externalStatements: readonly StaticDependencyStatementV1[];
  };
  readonly domains: {
    readonly rule: "first_path_segment_below_src";
    readonly allStaticCrossDomainEdges: readonly TypeScriptLocalityCrossDomainEdgeV1[];
    readonly runtimeCrossDomainEdges: readonly TypeScriptLocalityCrossDomainEdgeV1[];
  };
  readonly stronglyConnectedComponents: {
    readonly allStatic: TypeScriptLocalitySccV1;
    readonly runtimeOnly: TypeScriptLocalitySccV1;
  };
  readonly closures: {
    readonly entries: readonly TypeScriptLocalityClosureV1[];
    readonly targets: readonly TypeScriptLocalityClosureV1[];
  };
}

interface ParsedFileV1 extends TypeScriptLocalityFileV1 {
  readonly statements: readonly Omit<StaticDependencyStatementV1, "resolution" | "target">[];
}

const lexicalCompareV1 = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

function asNodeV1(value: unknown): AstNodeV1 | null {
  if (value === null || typeof value !== "object") return null;
  const node = value as { readonly type?: unknown };
  return typeof node.type === "string" ? value as AstNodeV1 : null;
}

function asNodesV1(value: unknown): readonly AstNodeV1[] {
  if (!Array.isArray(value)) return [];
  return value.map(asNodeV1).filter((node): node is AstNodeV1 => node !== null);
}

function stringLiteralValueV1(value: unknown): string | null {
  const node = asNodeV1(value);
  if (node === null) return null;
  if (node.type !== "StringLiteral" && node.type !== "Literal") return null;
  return typeof node.value === "string" ? node.value : null;
}

function parserPluginsV1(path: string): ParserPlugin[] {
  const plugins: ParserPlugin[] = ["decorators", "decoratorAutoAccessors", "typescript"];
  if (path.endsWith(".tsx")) plugins.push("jsx");
  return plugins;
}

function physicalLineCountV1(source: string): number {
  if (source.length === 0) return 0;
  const newlineCount = source.match(/\r\n|\r|\n/gu)?.length ?? 0;
  return newlineCount + (/\r\n|\r|\n$/u.test(source) ? 0 : 1);
}

function bindingCountV1(value: unknown): number {
  const node = asNodeV1(value);
  if (node === null) return 0;
  switch (node.type) {
    case "Identifier":
      return 1;
    case "RestElement":
      return bindingCountV1(node.argument);
    case "AssignmentPattern":
      return bindingCountV1(node.left);
    case "ArrayPattern":
      return Array.isArray(node.elements)
        ? node.elements.reduce((count, element) => count + bindingCountV1(element), 0)
        : 0;
    case "ObjectPattern":
      return asNodesV1(node.properties).reduce((count, property) => {
        if (property.type === "RestElement") return count + bindingCountV1(property.argument);
        return count + bindingCountV1(property.value);
      }, 0);
    default:
      return 0;
  }
}

function exportedDeclarationCountV1(value: unknown): number {
  const node = asNodeV1(value);
  if (node === null) return 0;
  if (node.type === "VariableDeclaration") {
    return asNodesV1(node.declarations).reduce(
      (count, declaration) => count + bindingCountV1(declaration.id),
      0,
    );
  }
  if (node.type === "TSImportEqualsDeclaration") return 1;
  return 1;
}

function astExportCountV1(programBody: readonly AstNodeV1[]): number {
  let count = 0;
  for (const node of programBody) {
    switch (node.type) {
      case "ExportDefaultDeclaration":
      case "ExportAllDeclaration":
      case "TSExportAssignment":
      case "TSNamespaceExportDeclaration":
        count += 1;
        break;
      case "ExportNamedDeclaration": {
        const declaration = asNodeV1(node.declaration);
        if (declaration !== null) {
          count += exportedDeclarationCountV1(declaration);
        } else {
          count += asNodesV1(node.specifiers).length;
        }
        break;
      }
    }
  }
  return count;
}

function allSpecifiersAreTypeOnlyV1(node: AstNodeV1, property: "importKind" | "exportKind") {
  const specifiers = asNodesV1(node.specifiers);
  return specifiers.length > 0 && specifiers.every((specifier) => specifier[property] === "type");
}

function importEqualsSpecifierV1(node: AstNodeV1): string | null {
  const moduleReference = asNodeV1(node.moduleReference);
  if (moduleReference?.type !== "TSExternalModuleReference") return null;
  return stringLiteralValueV1(moduleReference.expression);
}

function dependencyStatementsV1(
  from: string,
  programBody: readonly AstNodeV1[],
): readonly Omit<StaticDependencyStatementV1, "resolution" | "target">[] {
  const statements: Omit<StaticDependencyStatementV1, "resolution" | "target">[] = [];
  const addImportEquals = (node: AstNodeV1): void => {
    const specifier = importEqualsSpecifierV1(node);
    if (specifier === null) return;
    statements.push({
      from,
      specifier,
      kind: "import_equals",
      typeOnly: node.importKind === "type",
    });
  };

  for (const node of programBody) {
    switch (node.type) {
      case "ImportDeclaration": {
        const specifier = stringLiteralValueV1(node.source);
        if (specifier === null) break;
        statements.push({
          from,
          specifier,
          kind: "import",
          typeOnly: node.importKind === "type" ||
            allSpecifiersAreTypeOnlyV1(node, "importKind"),
        });
        break;
      }
      case "TSImportEqualsDeclaration":
        addImportEquals(node);
        break;
      case "ExportNamedDeclaration": {
        const declaration = asNodeV1(node.declaration);
        if (declaration?.type === "TSImportEqualsDeclaration") addImportEquals(declaration);
        const specifier = stringLiteralValueV1(node.source);
        if (specifier === null) break;
        statements.push({
          from,
          specifier,
          kind: "export_named",
          typeOnly: node.exportKind === "type" ||
            allSpecifiersAreTypeOnlyV1(node, "exportKind"),
        });
        break;
      }
      case "ExportAllDeclaration": {
        const specifier = stringLiteralValueV1(node.source);
        if (specifier === null) break;
        statements.push({
          from,
          specifier,
          kind: "export_all",
          typeOnly: node.exportKind === "type",
        });
        break;
      }
    }
  }
  return statements;
}

function topLevelDomainV1(path: string): string {
  const segments = path.split("/");
  return segments.length >= 3 ? segments[1]! : "(src-root)";
}

async function parseTrackedFileV1(repositoryRoot: string, path: string): Promise<ParsedFileV1> {
  const absolutePath = join(repositoryRoot, ...path.split("/"));
  const stat = await Deno.lstat(absolutePath);
  if (!stat.isFile || stat.isSymlink) {
    throw new TypeError(`tracked TypeScript path is not a regular file: ${path}`);
  }
  const source = await Deno.readTextFile(absolutePath);
  let file: AstNodeV1;
  try {
    file = parse(source, {
      sourceType: "unambiguous",
      sourceFilename: path,
      plugins: parserPluginsV1(path),
      allowAwaitOutsideFunction: true,
      createImportExpressions: true,
    }) as unknown as AstNodeV1;
  } catch (error) {
    throw new SyntaxError(`failed to parse tracked TypeScript file ${path}`, { cause: error });
  }
  const program = asNodeV1(file.program);
  if (program?.type !== "Program") throw new TypeError(`parser returned no Program for ${path}`);
  const body = asNodesV1(program.body);
  return {
    path,
    physicalLines: physicalLineCountV1(source),
    astExports: astExportCountV1(body),
    domain: topLevelDomainV1(path),
    statements: dependencyStatementsV1(path, body),
  };
}

async function trackedTypeScriptPathsV1(repositoryRoot: string): Promise<readonly string[]> {
  const output = await new Deno.Command("git", {
    args: ["-C", repositoryRoot, "ls-files", "-z", "--", "src"],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!output.success) {
    throw new Error(
      `git ls-files failed for explicit repository ${repositoryRoot}: ${
        new TextDecoder().decode(output.stderr).trim()
      }`,
    );
  }
  const paths = new TextDecoder().decode(output.stdout).split("\0").filter(Boolean);
  const canonical = paths.filter((path) => /(?:^|\/)src\/.*\.tsx?$/u.test(path)).map((path) => {
    const normalized = posix.normalize(path);
    if (normalized !== path || !normalized.startsWith("src/") || normalized.includes("\0")) {
      throw new TypeError(`git returned a noncanonical source path: ${path}`);
    }
    return normalized;
  });
  return [...new Set(canonical)].sort(lexicalCompareV1);
}

async function assertExplicitRepositoryRootV1(repositoryRoot: string): Promise<void> {
  const output = await new Deno.Command("git", {
    args: ["-C", repositoryRoot, "rev-parse", "--show-toplevel"],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!output.success) {
    throw new TypeError(`repositoryRoot is not a Git worktree root: ${repositoryRoot}`);
  }
  const reportedRoot = new TextDecoder().decode(output.stdout).trim();
  const actualRoot = await Deno.realPath(resolve(reportedRoot));
  if (actualRoot !== repositoryRoot) {
    throw new TypeError(
      `repositoryRoot must name the explicit Git worktree root, received ${repositoryRoot}`,
    );
  }
}

function resolutionCandidatesV1(from: string, specifier: string): readonly string[] {
  if (!specifier.startsWith(".")) return [];
  const base = posix.normalize(posix.join(posix.dirname(from), specifier));
  const extension = posix.extname(base);
  if (extension === ".ts" || extension === ".tsx") return [base];
  if ([".js", ".jsx", ".mjs", ".cjs"].includes(extension)) {
    const withoutExtension = base.slice(0, -extension.length);
    return [`${withoutExtension}.ts`, `${withoutExtension}.tsx`];
  }
  if (extension !== "") return [base];
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
}

function resolveStatementV1(
  statement: Omit<StaticDependencyStatementV1, "resolution" | "target">,
  trackedPaths: ReadonlySet<string>,
): StaticDependencyStatementV1 {
  if (!statement.specifier.startsWith(".")) {
    return { ...statement, resolution: "external", target: null };
  }
  const target = resolutionCandidatesV1(statement.from, statement.specifier).find((candidate) =>
    trackedPaths.has(candidate)
  );
  return target === undefined
    ? { ...statement, resolution: "unresolved_relative", target: null }
    : { ...statement, resolution: "tracked", target };
}

function graphEdgesV1(
  statements: readonly StaticDependencyStatementV1[],
): readonly TypeScriptLocalityGraphEdgeV1[] {
  const aggregates = new Map<
    string,
    {
      readonly from: string;
      readonly to: string;
      typeOnly: boolean;
      readonly kinds: Set<DependencyKindV1>;
      readonly specifiers: Set<string>;
    }
  >();
  for (const statement of statements) {
    if (statement.target === null) continue;
    const key = `${statement.from}\0${statement.target}`;
    const existing = aggregates.get(key);
    if (existing === undefined) {
      aggregates.set(key, {
        from: statement.from,
        to: statement.target,
        typeOnly: statement.typeOnly,
        kinds: new Set([statement.kind]),
        specifiers: new Set([statement.specifier]),
      });
      continue;
    }
    existing.typeOnly &&= statement.typeOnly;
    existing.kinds.add(statement.kind);
    existing.specifiers.add(statement.specifier);
  }
  return [...aggregates.values()].map((edge) => ({
    from: edge.from,
    to: edge.to,
    typeOnly: edge.typeOnly,
    kinds: [...edge.kinds].sort(lexicalCompareV1),
    specifiers: [...edge.specifiers].sort(lexicalCompareV1),
  })).sort((left, right) =>
    lexicalCompareV1(left.from, right.from) || lexicalCompareV1(left.to, right.to)
  );
}

function adjacencyV1(
  nodes: readonly string[],
  edges: readonly TypeScriptLocalityGraphEdgeV1[],
): ReadonlyMap<string, readonly string[]> {
  const adjacency = new Map(nodes.map((node) => [node, new Set<string>()]));
  for (const edge of edges) adjacency.get(edge.from)?.add(edge.to);
  return new Map(
    [...adjacency].map(([node, targets]) => [node, [...targets].sort(lexicalCompareV1)]),
  );
}

function reverseAdjacencyV1(
  nodes: readonly string[],
  edges: readonly TypeScriptLocalityGraphEdgeV1[],
): ReadonlyMap<string, readonly string[]> {
  return adjacencyV1(
    nodes,
    edges.map((edge) => ({ ...edge, from: edge.to, to: edge.from })),
  );
}

function closureV1(seed: string, adjacency: ReadonlyMap<string, readonly string[]>): string[] {
  const visited = new Set<string>();
  const pending = [seed];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || visited.has(current)) continue;
    visited.add(current);
    for (const target of adjacency.get(current) ?? []) {
      if (!visited.has(target)) pending.push(target);
    }
  }
  return [...visited].sort(lexicalCompareV1);
}

function stronglyConnectedComponentsV1(
  nodes: readonly string[],
  edges: readonly TypeScriptLocalityGraphEdgeV1[],
): TypeScriptLocalitySccV1 {
  const adjacency = adjacencyV1(nodes, edges);
  const selfEdges = new Set(
    edges.filter((edge) => edge.from === edge.to).map((edge) => edge.from),
  );
  let nextIndex = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];

  const visit = (node: string): void => {
    const index = nextIndex++;
    indices.set(node, index);
    lowLinks.set(node, index);
    stack.push(node);
    onStack.add(node);

    for (const target of adjacency.get(node) ?? []) {
      if (!indices.has(target)) {
        visit(target);
        lowLinks.set(node, Math.min(lowLinks.get(node)!, lowLinks.get(target)!));
      } else if (onStack.has(target)) {
        lowLinks.set(node, Math.min(lowLinks.get(node)!, indices.get(target)!));
      }
    }

    if (lowLinks.get(node) !== indices.get(node)) return;
    const component: string[] = [];
    while (stack.length > 0) {
      const member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
      if (member === node) break;
    }
    components.push(component.sort(lexicalCompareV1));
  };

  for (const node of nodes) {
    if (!indices.has(node)) visit(node);
  }
  components.sort((left, right) =>
    right.length - left.length || lexicalCompareV1(left[0] ?? "", right[0] ?? "")
  );
  const cyclicComponents = components.filter((component) =>
    component.length > 1 || (component.length === 1 && selfEdges.has(component[0]!))
  );
  return {
    componentCount: components.length,
    cyclicComponentCount: cyclicComponents.length,
    largestSize: components[0]?.length ?? 0,
    largestComponent: components[0] ?? [],
    components,
    cyclicComponents,
  };
}

function crossDomainEdgesV1(
  edges: readonly TypeScriptLocalityGraphEdgeV1[],
): TypeScriptLocalityCrossDomainEdgeV1[] {
  return edges.flatMap((edge) => {
    const fromDomain = topLevelDomainV1(edge.from);
    const toDomain = topLevelDomainV1(edge.to);
    return fromDomain === toDomain ? [] : [{ ...edge, fromDomain, toDomain }];
  });
}

function canonicalRequestedPathsV1(
  values: readonly string[] | undefined,
  trackedPaths: ReadonlySet<string>,
  role: "entry" | "target",
): readonly string[] {
  const paths = (values ?? []).map((value) => {
    if (value.length === 0 || isAbsolute(value) || value.includes("\0")) {
      throw new TypeError(`${role} must be a nonempty repository-relative path: ${value}`);
    }
    const canonical = posix.normalize(value.replace(/^\.\//u, ""));
    if (!canonical.startsWith("src/") || !trackedPaths.has(canonical)) {
      throw new TypeError(`${role} is not a tracked TypeScript file under src: ${value}`);
    }
    return canonical;
  });
  return [...new Set(paths)].sort(lexicalCompareV1);
}

/**
 * Measures locality from only the tracked TypeScript files returned by
 * `git ls-files -- src` in the explicitly supplied repository.
 */
export async function analyzeTypeScriptLocalityV1(
  options: TypeScriptLocalityOptionsV1,
): Promise<TypeScriptLocalityReportV1> {
  if (options.repositoryRoot.trim().length === 0) {
    throw new TypeError("repositoryRoot must be explicit and nonempty");
  }
  const requestedRoot = resolve(options.repositoryRoot);
  const rootStat = await Deno.stat(requestedRoot);
  if (!rootStat.isDirectory) {
    throw new TypeError(`repositoryRoot is not a directory: ${requestedRoot}`);
  }
  const repositoryRoot = await Deno.realPath(requestedRoot);
  await assertExplicitRepositoryRootV1(repositoryRoot);
  const paths = await trackedTypeScriptPathsV1(repositoryRoot);
  const trackedPaths = new Set(paths);
  const files = await Promise.all(paths.map((path) => parseTrackedFileV1(repositoryRoot, path)));
  const statements = files.flatMap((file) => file.statements).map((statement) =>
    resolveStatementV1(statement, trackedPaths)
  ).sort((left, right) =>
    lexicalCompareV1(left.from, right.from) ||
    lexicalCompareV1(left.specifier, right.specifier) ||
    lexicalCompareV1(left.kind, right.kind)
  );
  const allEdges = graphEdgesV1(statements);
  const runtimeEdges = allEdges.filter((edge) => !edge.typeOnly);
  const allAdjacency = adjacencyV1(paths, allEdges);
  const runtimeAdjacency = adjacencyV1(paths, runtimeEdges);
  const allReverse = reverseAdjacencyV1(paths, allEdges);
  const runtimeReverse = reverseAdjacencyV1(paths, runtimeEdges);
  const entries = canonicalRequestedPathsV1(options.entries, trackedPaths, "entry");
  const targets = canonicalRequestedPathsV1(options.targets, trackedPaths, "target");

  return {
    schemaVersion: 1,
    repositoryRoot,
    sourceRoot: "src",
    files: {
      trackedTypeScript: files.length,
      physicalLines: files.reduce((sum, file) => sum + file.physicalLines, 0),
      astExports: files.reduce((sum, file) => sum + file.astExports, 0),
      entries: files.map(({ statements: _statements, ...file }) => file),
    },
    staticDependencies: {
      statementCount: statements.length,
      statements,
      trackedGraphEdges: allEdges,
      runtimeGraphEdges: runtimeEdges,
      unresolvedRelativeStatements: statements.filter((statement) =>
        statement.resolution === "unresolved_relative"
      ),
      externalStatements: statements.filter((statement) => statement.resolution === "external"),
    },
    domains: {
      rule: "first_path_segment_below_src",
      allStaticCrossDomainEdges: crossDomainEdgesV1(allEdges),
      runtimeCrossDomainEdges: crossDomainEdgesV1(runtimeEdges),
    },
    stronglyConnectedComponents: {
      allStatic: stronglyConnectedComponentsV1(paths, allEdges),
      runtimeOnly: stronglyConnectedComponentsV1(paths, runtimeEdges),
    },
    closures: {
      entries: entries.map((path) => ({
        path,
        allStatic: closureV1(path, allAdjacency),
        runtimeOnly: closureV1(path, runtimeAdjacency),
      })),
      targets: targets.map((path) => ({
        path,
        allStatic: closureV1(path, allReverse),
        runtimeOnly: closureV1(path, runtimeReverse),
      })),
    },
  };
}

interface CliOptionsV1 {
  readonly repositoryRoot: string;
  readonly entries: readonly string[];
  readonly targets: readonly string[];
}

function optionValueV1(args: readonly string[], index: number, name: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new TypeError(`${name} requires a value`);
  }
  return value;
}

export function parseTypeScriptLocalityOptionsV1(args: readonly string[]): CliOptionsV1 {
  let repositoryRoot: string | undefined;
  const entries: string[] = [];
  const targets: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    switch (argument) {
      case "--repo":
        if (repositoryRoot !== undefined) throw new TypeError("--repo may be provided only once");
        repositoryRoot = optionValueV1(args, index, "--repo");
        index += 1;
        break;
      case "--entry":
        entries.push(optionValueV1(args, index, "--entry"));
        index += 1;
        break;
      case "--target":
        targets.push(optionValueV1(args, index, "--target"));
        index += 1;
        break;
      default:
        throw new TypeError(`unknown option: ${argument}`);
    }
  }
  if (repositoryRoot === undefined) {
    throw new TypeError("--repo is required; repository discovery is intentionally unsupported");
  }
  return { repositoryRoot, entries, targets };
}

async function mainV1(): Promise<void> {
  const options = parseTypeScriptLocalityOptionsV1(Deno.args);
  const report = await analyzeTypeScriptLocalityV1(options);
  console.log(JSON.stringify(report, null, 2));
}

if (import.meta.main) {
  try {
    await mainV1();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exitCode = 1;
  }
}
