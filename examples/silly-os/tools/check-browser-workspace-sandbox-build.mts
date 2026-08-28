// SPDX-License-Identifier: MIT

const buildDirectoryV1 = new URL("../dist-workspace-sandbox/", import.meta.url);

function failV1(message: string): never {
  throw new Error(`SillyOS Browser Workspace Sandbox build rejected: ${message}`);
}

async function collectBuildFilesV1(
  directory: URL,
  relativeDirectory = "",
): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const relativePath = `${relativeDirectory}${entry.name}`;
    if (entry.isSymlink) failV1(`artifact contains symlink ${relativePath}`);
    if (entry.isFile) {
      files.push(relativePath);
      continue;
    }
    if (!entry.isDirectory) failV1(`artifact contains unsupported entry ${relativePath}`);
    files.push(
      ...await collectBuildFilesV1(
        new URL(`${encodeURIComponent(entry.name)}/`, directory),
        `${relativePath}/`,
      ),
    );
  }
  return files;
}

let filesV1: readonly string[];
try {
  filesV1 = Object.freeze((await collectBuildFilesV1(buildDirectoryV1)).sort());
} catch (error) {
  if (error instanceof Deno.errors.NotFound) failV1("dist-workspace-sandbox is unavailable");
  throw error;
}

if (filesV1.some((file) => file.endsWith(".map"))) {
  failV1("artifact contains a source map");
}

function selectOneArtifactV1(label: string, pattern: RegExp): string {
  const matches = filesV1.filter((file) => pattern.test(file));
  if (matches.length !== 1) failV1(`expected one ${label}, found ${matches.length}`);
  const match = matches[0];
  if (match === undefined) failV1(`${label} is unavailable`);
  return match;
}

const bootstrapFileV1 = selectOneArtifactV1(
  "bootstrap JavaScript file",
  /^assets\/workspace-sandbox-[A-Za-z0-9_-]+\.js$/u,
);
const hostWorkerFileV1 = selectOneArtifactV1(
  "Host Worker JavaScript file",
  /^assets\/browser-workspace-sandbox-host\.worker-[A-Za-z0-9_-]+\.js$/u,
);
const shellFileV1 = selectOneArtifactV1(
  "bounded shell JavaScript file",
  /^assets\/browser-workspace-just-bash-runtime-[A-Za-z0-9_-]+\.js$/u,
);
const quickJsCommandFileV1 = selectOneArtifactV1(
  "QuickJS command JavaScript file",
  /^assets\/browser-workspace-quickjs-command-[A-Za-z0-9_-]+\.js$/u,
);
const quickJsWorkerFileV1 = selectOneArtifactV1(
  "QuickJS child Worker JavaScript file",
  /^assets\/browser-workspace-quickjs\.worker-[A-Za-z0-9_-]+\.js$/u,
);
const quickJsFfiFileV1 = selectOneArtifactV1(
  "QuickJS FFI JavaScript file",
  /^assets\/ffi-[A-Za-z0-9_-]+\.js$/u,
);
const quickJsEmscriptenFileV1 = selectOneArtifactV1(
  "QuickJS Emscripten JavaScript file",
  /^assets\/emscripten-module\.browser-[A-Za-z0-9_-]+\.js$/u,
);
const quickJsModuleBridgeFileV1 = selectOneArtifactV1(
  "QuickJS module bridge JavaScript file",
  /^assets\/module-[A-Za-z0-9_-]+\.js$/u,
);

const javaScriptFilesV1 = Object.freeze([
  bootstrapFileV1,
  hostWorkerFileV1,
  shellFileV1,
  quickJsCommandFileV1,
  quickJsWorkerFileV1,
  quickJsFfiFileV1,
  quickJsEmscriptenFileV1,
  quickJsModuleBridgeFileV1,
]);
const expectedFilesV1 = [
  "_headers",
  "workspace-sandbox.html",
  ...javaScriptFilesV1,
].sort();
if (
  filesV1.length !== expectedFilesV1.length ||
  filesV1.some((file, index) => file !== expectedFilesV1[index])
) {
  failV1(`artifact file boundary differs: ${filesV1.join(", ")}`);
}

const htmlV1 = await Deno.readTextFile(new URL("workspace-sandbox.html", buildDirectoryV1));
const headersV1 = await Deno.readTextFile(new URL("_headers", buildDirectoryV1));
const javaScriptSourcesV1 = new Map<string, string>();
for (const file of javaScriptFilesV1) {
  javaScriptSourcesV1.set(file, await Deno.readTextFile(new URL(file, buildDirectoryV1)));
}

function sourceV1(file: string): string {
  const source = javaScriptSourcesV1.get(file);
  if (source === undefined) failV1(`${file} source is unavailable`);
  return source;
}

function fileNameV1(file: string): string {
  const name = file.slice(file.lastIndexOf("/") + 1);
  if (name.length === 0) failV1(`${file} has no file name`);
  return name;
}

const bootstrapJavaScriptV1 = sourceV1(bootstrapFileV1);
const hostWorkerJavaScriptV1 = sourceV1(hostWorkerFileV1);
const shellJavaScriptV1 = sourceV1(shellFileV1);
const quickJsCommandJavaScriptV1 = sourceV1(quickJsCommandFileV1);
const quickJsWorkerJavaScriptV1 = sourceV1(quickJsWorkerFileV1);
const quickJsFfiJavaScriptV1 = sourceV1(quickJsFfiFileV1);
const quickJsEmscriptenJavaScriptV1 = sourceV1(quickJsEmscriptenFileV1);
const quickJsModuleBridgeJavaScriptV1 = sourceV1(quickJsModuleBridgeFileV1);

const productionBuildIdentityPatternV1 =
  /sillyos\.workspace-sandbox\.(?:[0-9a-f]{40}|[0-9a-f]{64})(?:-dirty)?/gu;

function exactProductionBuildIdentityV1(file: string, source: string): string {
  const identities = new Set(source.match(productionBuildIdentityPatternV1) ?? []);
  if (identities.size !== 1) {
    failV1(`${file} does not embed exactly one production build identity`);
  }
  const identity = [...identities][0];
  if (identity === undefined) failV1(`${file} build identity is unavailable`);
  return identity;
}

const bootstrapBuildIdentityV1 = exactProductionBuildIdentityV1(
  bootstrapFileV1,
  bootstrapJavaScriptV1,
);
const hostWorkerBuildIdentityV1 = exactProductionBuildIdentityV1(
  hostWorkerFileV1,
  hostWorkerJavaScriptV1,
);
const quickJsWorkerBuildIdentityV1 = exactProductionBuildIdentityV1(
  quickJsWorkerFileV1,
  quickJsWorkerJavaScriptV1,
);
if (
  bootstrapBuildIdentityV1 !== hostWorkerBuildIdentityV1 ||
  bootstrapBuildIdentityV1 !== quickJsWorkerBuildIdentityV1
) {
  failV1("bootstrap, Host Worker, and QuickJS child Worker build identities differ");
}
for (const [file, source] of javaScriptSourcesV1) {
  if (source.includes("sillyos.workspace-sandbox.development")) {
    failV1(`${file} contains the development build identity`);
  }
}

if (/<style\b/iu.test(htmlV1) || /\sstyle\s*=/iu.test(htmlV1)) {
  failV1("built HTML contains inline style authority");
}
if (/\son[a-z]+\s*=/iu.test(htmlV1)) failV1("built HTML contains an inline event handler");
if (/\b(?:href|src)\s*=\s*["']\s*javascript:/iu.test(htmlV1)) {
  failV1("built HTML contains a javascript URL");
}
if (/\b(?:href|src)\s*=\s*["']\s*(?:https?:)?\/\//iu.test(htmlV1)) {
  failV1("built HTML loads a third-party resource");
}

const scriptTagsV1 = [...htmlV1.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/giu)];
const scriptOpenCountV1 = htmlV1.match(/<script\b/giu)?.length ?? 0;
if (scriptOpenCountV1 !== 1 || scriptTagsV1.length !== 1) {
  failV1("built HTML must contain exactly one closed bootstrap script element");
}
const [, scriptAttributesV1 = "", scriptBodyV1 = ""] = scriptTagsV1[0] ?? [];
const scriptSourceV1 = scriptAttributesV1.match(/\bsrc\s*=\s*["']([^"']+)["']/iu)?.[1];
const scriptTypeV1 = scriptAttributesV1.match(/\btype\s*=\s*["']([^"']+)["']/iu)?.[1];
if (scriptBodyV1.trim() !== "" || scriptSourceV1 === undefined) {
  failV1("built HTML contains executable inline script");
}
if (scriptTypeV1?.toLowerCase() !== "module") {
  failV1("bootstrap script is not a module");
}
if (scriptSourceV1 !== `/${bootstrapFileV1}`) {
  failV1("built HTML does not load the one fixed bootstrap artifact");
}

function expectArtifactReferencesV1(
  file: string,
  source: string,
  expectedFiles: readonly string[],
): void {
  const actual = javaScriptFilesV1.filter((candidate) =>
    candidate !== file && source.includes(fileNameV1(candidate))
  ).sort();
  const expected = [...expectedFiles].sort();
  if (
    actual.length !== expected.length ||
    actual.some((candidate, index) => candidate !== expected[index])
  ) {
    failV1(`${file} build-known JavaScript references differ: ${actual.join(", ")}`);
  }
}

expectArtifactReferencesV1(bootstrapFileV1, bootstrapJavaScriptV1, [hostWorkerFileV1]);
expectArtifactReferencesV1(hostWorkerFileV1, hostWorkerJavaScriptV1, [shellFileV1]);
expectArtifactReferencesV1(shellFileV1, shellJavaScriptV1, [
  hostWorkerFileV1,
  quickJsCommandFileV1,
]);
expectArtifactReferencesV1(quickJsCommandFileV1, quickJsCommandJavaScriptV1, [
  hostWorkerFileV1,
  shellFileV1,
  quickJsWorkerFileV1,
]);
expectArtifactReferencesV1(quickJsWorkerFileV1, quickJsWorkerJavaScriptV1, [
  quickJsFfiFileV1,
  quickJsEmscriptenFileV1,
  quickJsModuleBridgeFileV1,
]);
expectArtifactReferencesV1(quickJsFfiFileV1, quickJsFfiJavaScriptV1, []);
expectArtifactReferencesV1(quickJsEmscriptenFileV1, quickJsEmscriptenJavaScriptV1, []);
expectArtifactReferencesV1(
  quickJsModuleBridgeFileV1,
  quickJsModuleBridgeJavaScriptV1,
  [quickJsWorkerFileV1],
);

const hostWorkerFileNameV1 = fileNameV1(hostWorkerFileV1);
const shellFileNameV1 = fileNameV1(shellFileV1);
const quickJsCommandFileNameV1 = fileNameV1(quickJsCommandFileV1);
const quickJsWorkerFileNameV1 = fileNameV1(quickJsWorkerFileV1);
const quickJsFfiFileNameV1 = fileNameV1(quickJsFfiFileV1);
const quickJsEmscriptenFileNameV1 = fileNameV1(quickJsEmscriptenFileV1);
const quickJsModuleBridgeFileNameV1 = fileNameV1(quickJsModuleBridgeFileV1);

if (!bootstrapJavaScriptV1.includes(`/assets/${hostWorkerFileNameV1}`)) {
  failV1("bootstrap artifact does not bind the one fixed Host Worker artifact");
}
if ((bootstrapJavaScriptV1.match(/\bnew\s+Worker\s*\(/gu)?.length ?? 0) !== 1) {
  failV1("bootstrap artifact does not create exactly one Host Worker");
}
const exactShellImportV1 = `import(\`./${shellFileNameV1}\`)`;
if (
  (hostWorkerJavaScriptV1.match(/\bimport\s*\(/gu)?.length ?? 0) !== 1 ||
  !hostWorkerJavaScriptV1.includes(exactShellImportV1)
) {
  failV1("Host Worker does not bind exactly one build-known lazy shell artifact");
}
if (/\bimport\s*\(/u.test(bootstrapJavaScriptV1)) {
  failV1("bootstrap artifact contains dynamic script loading");
}
const exactQuickJsCommandImportV1 = `import(\`./${quickJsCommandFileNameV1}\`)`;
if (!shellJavaScriptV1.includes(exactQuickJsCommandImportV1)) {
  failV1("bounded shell does not bind the build-known lazy QuickJS command artifact");
}
if (
  (quickJsCommandJavaScriptV1.match(/\bnew\s+Worker\s*\(/gu)?.length ?? 0) !== 1 ||
  !quickJsCommandJavaScriptV1.includes(`/assets/${quickJsWorkerFileNameV1}`)
) {
  failV1("QuickJS command does not create exactly one build-known child Worker");
}
if (/\bimport\s*\(/u.test(quickJsCommandJavaScriptV1)) {
  failV1("QuickJS command contains dynamic script loading");
}
for (
  const supportFileName of [
    quickJsFfiFileNameV1,
    quickJsEmscriptenFileNameV1,
    quickJsModuleBridgeFileNameV1,
  ]
) {
  if (!quickJsWorkerJavaScriptV1.includes(`import(\`./${supportFileName}\`)`)) {
    failV1(`QuickJS child Worker omits build-known support artifact ${supportFileName}`);
  }
}
if ((quickJsWorkerJavaScriptV1.match(/\bimport\s*\(/gu)?.length ?? 0) !== 3) {
  failV1("QuickJS child Worker dynamic-import boundary differs");
}
for (
  const [file, source] of [
    [hostWorkerFileV1, hostWorkerJavaScriptV1],
    [shellFileV1, shellJavaScriptV1],
    [quickJsWorkerFileV1, quickJsWorkerJavaScriptV1],
    [quickJsFfiFileV1, quickJsFfiJavaScriptV1],
    [quickJsEmscriptenFileV1, quickJsEmscriptenJavaScriptV1],
    [quickJsModuleBridgeFileV1, quickJsModuleBridgeJavaScriptV1],
  ] as const
) {
  if (/\bnew\s+Worker\s*\(/u.test(source)) {
    failV1(`${file} contains an unowned nested Worker`);
  }
}

const rawSizeCeilingsV1 = [
  [bootstrapFileV1, bootstrapJavaScriptV1, 16 * 1_024],
  [hostWorkerFileV1, hostWorkerJavaScriptV1, 160 * 1_024],
  [shellFileV1, shellJavaScriptV1, 1_500 * 1_024],
  [quickJsCommandFileV1, quickJsCommandJavaScriptV1, 32 * 1_024],
  [quickJsWorkerFileV1, quickJsWorkerJavaScriptV1, 96 * 1_024],
  [quickJsFfiFileV1, quickJsFfiJavaScriptV1, 16 * 1_024],
  [quickJsEmscriptenFileV1, quickJsEmscriptenJavaScriptV1, 768 * 1_024],
  [quickJsModuleBridgeFileV1, quickJsModuleBridgeJavaScriptV1, 4 * 1_024],
] as const;
for (const [file, source, ceiling] of rawSizeCeilingsV1) {
  if (source.length > ceiling) failV1(`${file} exceeds its ${ceiling}-byte raw ceiling`);
}

const expectedHeadersV1 = [
  "/*",
  "  Content-Security-Policy: default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; frame-src blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors https://silly-os.jasl9187.workers.dev; form-action 'none'",
  "  Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "  Referrer-Policy: no-referrer",
  "  X-Content-Type-Options: nosniff",
].join("\n");
if (headersV1.replaceAll("\r\n", "\n").trimEnd() !== expectedHeadersV1) {
  failV1("built _headers differs from the fixed network-off Sandbox policy");
}
if (/script-src[^\n;]*\s'unsafe-eval'(?:\s|;|$)/u.test(headersV1)) {
  failV1("built _headers grants ordinary unsafe-eval");
}

const forbiddenSharedMarkersV1 = [
  ["source map", /sourceMappingURL|sourceURL/iu],
  [
    "test or qualification code",
    /\bvitest\b|@testing-library|\bplaywright\b|__tests__|\.test\.[mc]?[jt]s|qualification/iu,
  ],
  ["Pi code", /@earendil-works\/pi|\bpi-(?:agent|ai|coding)\b|browser-pi|pi_provider/iu],
  ["React code", /\breact(?:-dom)?\b|jsx-runtime/iu],
  [
    "Browser-externalized Node module",
    /__vite-browser-external|browser-external:|\b(?:require|import)\s*\(\s*["'`]node:|\bfrom\s*["'`]node:|\bimport\s*["'`]node:/iu,
  ],
  ["classic Worker script loading", /\bimportScripts\s*\(/u],
] as const;
for (const [file, source] of javaScriptSourcesV1) {
  for (const [label, pattern] of forbiddenSharedMarkersV1) {
    if (pattern.test(source)) failV1(`${file} contains ${label}`);
  }
}

for (
  const [file, source] of [
    [bootstrapFileV1, bootstrapJavaScriptV1],
    [hostWorkerFileV1, hostWorkerJavaScriptV1],
  ] as const
) {
  if (/\beval\s*\(|\bnew\s+Function\s*\(/iu.test(source)) {
    failV1(`${file} contains dynamic evaluation`);
  }
  if (/\bprovider\b/iu.test(source)) failV1(`${file} contains Provider code`);
}

const requiredShellMarkersV1 = [
  "browser_local_just_bash",
  "alias expansion depth limit exceeded",
  "stdin size limit exceeded",
  "customCommandAllowlist",
] as const;
for (const marker of requiredShellMarkersV1) {
  if (!shellJavaScriptV1.includes(marker)) {
    failV1(`${shellFileV1} omits required bounded shell marker ${marker}`);
  }
}
const forbiddenShellMarkersV1 = [
  ["Wasm asset reference", /\.wasm\b/iu],
  ["embedded QuickJS runtime", /quickjs-emscripten|loadQuickJS/iu],
  ["Python runtime", /vendor\/cpython|pythonWasm|sql-wasm/iu],
  [
    "executable WebAssembly runtime",
    /\bWebAssembly\s*\.\s*(?:compile(?:Streaming)?|instantiate(?:Streaming)?|Module|Instance)\b/u,
  ],
  ["dynamic Function construction", /\bnew\s+Function\s*\(/iu],
] as const;
for (const [label, pattern] of forbiddenShellMarkersV1) {
  if (pattern.test(shellJavaScriptV1)) failV1(`${shellFileV1} contains ${label}`);
}

const requiredQuickJsCommandMarkersV1 = [
  "sillyos-workspace-qjs-v1",
  "Usage: qjs [--file PATH]... SCRIPT [ARG...]",
  "quickjs_execute",
  "quickjs_result",
  "wall_timeout",
  "qjs update target changed after staging",
] as const;
for (const marker of requiredQuickJsCommandMarkersV1) {
  if (!quickJsCommandJavaScriptV1.includes(marker)) {
    failV1(`${quickJsCommandFileV1} omits required bounded command marker ${marker}`);
  }
}
const requiredQuickJsWorkerMarkersV1 = [
  "quickjs_execute",
  "quickjs_result",
  "QuickJS fixed Wasm memory was unavailable",
  "QuickJS supports synchronous scripts only",
  "new WebAssembly.Memory({initial:256,maximum:256})",
  "wasmLinearMemoryBytes",
] as const;
for (const marker of requiredQuickJsWorkerMarkersV1) {
  if (!quickJsWorkerJavaScriptV1.includes(marker)) {
    failV1(`${quickJsWorkerFileV1} omits required bounded runtime marker ${marker}`);
  }
}

const quickJsBoundaryArtifactsV1 = [
  [quickJsCommandFileV1, quickJsCommandJavaScriptV1],
  [quickJsWorkerFileV1, quickJsWorkerJavaScriptV1],
  [quickJsFfiFileV1, quickJsFfiJavaScriptV1],
  [quickJsEmscriptenFileV1, quickJsEmscriptenJavaScriptV1],
  [quickJsModuleBridgeFileV1, quickJsModuleBridgeJavaScriptV1],
] as const;
const forbiddenQuickJsBoundaryMarkersV1 = [
  [
    "network capability",
    /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|\bBroadcastChannel\b/iu,
  ],
  [
    "product or credential storage capability",
    /\bindexedDB\b|\blocalStorage\b|\bsessionStorage\b|navigator\s*\.\s*storage|\bcookieStore\b|document\s*\.\s*cookie/iu,
  ],
  ["host JavaScript evaluation", /\beval\s*\(|\bnew\s+Function\s*\(/iu],
  ["third-party runtime URL", /(?:https?:)?\/\/[^`"\s\\]+/iu],
] as const;
for (const [file, source] of quickJsBoundaryArtifactsV1) {
  for (const [label, pattern] of forbiddenQuickJsBoundaryMarkersV1) {
    if (pattern.test(source)) failV1(`${file} contains ${label}`);
  }
}

console.log(
  `SillyOS Browser Workspace Sandbox build boundary passed (${bootstrapBuildIdentityV1}; shell ${shellFileV1}; qjs ${quickJsWorkerFileV1}).`,
);
