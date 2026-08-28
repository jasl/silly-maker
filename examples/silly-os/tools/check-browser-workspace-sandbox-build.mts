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

const bootstrapPatternV1 = /^assets\/workspace-sandbox-[A-Za-z0-9_-]+\.js$/u;
const hostWorkerPatternV1 = /^assets\/browser-workspace-sandbox-host\.worker-[A-Za-z0-9_-]+\.js$/u;
const shellPatternV1 = /^assets\/browser-workspace-just-bash-runtime-[A-Za-z0-9_-]+\.js$/u;
const bootstrapFilesV1 = filesV1.filter((file) => bootstrapPatternV1.test(file));
const hostWorkerFilesV1 = filesV1.filter((file) => hostWorkerPatternV1.test(file));
const shellFilesV1 = filesV1.filter((file) => shellPatternV1.test(file));
if (bootstrapFilesV1.length !== 1) {
  failV1(`expected one bootstrap JavaScript file, found ${bootstrapFilesV1.length}`);
}
if (hostWorkerFilesV1.length !== 1) {
  failV1(`expected one Host Worker JavaScript file, found ${hostWorkerFilesV1.length}`);
}
if (shellFilesV1.length !== 1) {
  failV1(`expected one bounded shell JavaScript file, found ${shellFilesV1.length}`);
}

const bootstrapFileV1 = bootstrapFilesV1[0];
const hostWorkerFileV1 = hostWorkerFilesV1[0];
const shellFileV1 = shellFilesV1[0];
if (bootstrapFileV1 === undefined || hostWorkerFileV1 === undefined || shellFileV1 === undefined) {
  failV1("fixed JavaScript artifacts are unavailable");
}
const expectedFilesV1 = [
  "_headers",
  "workspace-sandbox.html",
  bootstrapFileV1,
  hostWorkerFileV1,
  shellFileV1,
].sort();
if (
  filesV1.length !== expectedFilesV1.length ||
  filesV1.some((file, index) => file !== expectedFilesV1[index])
) {
  failV1(`artifact file boundary differs: ${filesV1.join(", ")}`);
}

const htmlV1 = await Deno.readTextFile(new URL("workspace-sandbox.html", buildDirectoryV1));
const headersV1 = await Deno.readTextFile(new URL("_headers", buildDirectoryV1));
const bootstrapJavaScriptV1 = await Deno.readTextFile(
  new URL(bootstrapFileV1, buildDirectoryV1),
);
const hostWorkerJavaScriptV1 = await Deno.readTextFile(
  new URL(hostWorkerFileV1, buildDirectoryV1),
);
const shellJavaScriptV1 = await Deno.readTextFile(
  new URL(shellFileV1, buildDirectoryV1),
);
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
if (bootstrapBuildIdentityV1 !== hostWorkerBuildIdentityV1) {
  failV1("bootstrap and Host Worker build identities differ");
}
if (
  bootstrapJavaScriptV1.includes("sillyos.workspace-sandbox.development") ||
  hostWorkerJavaScriptV1.includes("sillyos.workspace-sandbox.development")
) failV1("production artifact contains the development build identity");

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
if (!bootstrapJavaScriptV1.includes(`/${hostWorkerFileV1}`)) {
  failV1("bootstrap artifact does not bind the one fixed Host Worker artifact");
}
const shellFileNameV1 = shellFileV1.slice(shellFileV1.lastIndexOf("/") + 1);
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
if (bootstrapJavaScriptV1.includes(shellFileNameV1)) {
  failV1("bootstrap artifact reaches the shell without the Host Worker");
}
for (
  const [file, source] of [
    [bootstrapFileV1, bootstrapJavaScriptV1],
    [hostWorkerFileV1, hostWorkerJavaScriptV1],
    [shellFileV1, shellJavaScriptV1],
  ] as const
) {
  if (/\bimportScripts\s*\(/u.test(source)) {
    failV1(`${file} contains classic Worker script loading`);
  }
}

if (bootstrapJavaScriptV1.length > 16 * 1_024) {
  failV1("bootstrap JavaScript exceeds its 16 KiB raw ceiling");
}
if (hostWorkerJavaScriptV1.length > 160 * 1_024) {
  failV1("Host Worker JavaScript exceeds its 160 KiB raw ceiling");
}
if (shellJavaScriptV1.length > 1_500 * 1_024) {
  failV1("bounded shell JavaScript exceeds its 1,500 KiB raw ceiling");
}

const expectedHeadersV1 = [
  "/*",
  "  Content-Security-Policy: default-src 'none'; script-src 'self'; worker-src 'self'; frame-src blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors https://silly-os.jasl9187.workers.dev; form-action 'none'",
  "  Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "  Referrer-Policy: no-referrer",
  "  X-Content-Type-Options: nosniff",
].join("\n");
if (headersV1.replaceAll("\r\n", "\n").trimEnd() !== expectedHeadersV1) {
  failV1("built _headers differs from the fixed network-off Sandbox policy");
}

const JavaScriptArtifactsV1 = [
  [bootstrapFileV1, bootstrapJavaScriptV1],
  [hostWorkerFileV1, hostWorkerJavaScriptV1],
] as const;
const forbiddenRuntimeMarkersV1 = [
  ["source map", /sourceMappingURL|sourceURL/iu],
  ["dynamic evaluation", /\beval\s*\(|\bnew\s+Function\s*\(/iu],
  [
    "test or qualification code",
    /\bvitest\b|@testing-library|\bplaywright\b|__tests__|\.test\.[mc]?[jt]s|qualification/iu,
  ],
  ["Pi code", /@earendil-works\/pi|\bpi-(?:agent|ai|coding)\b|browser-pi|pi_provider/iu],
  ["Provider code", /\bprovider\b/iu],
  ["React code", /\breact(?:-dom)?\b|jsx-runtime/iu],
] as const;
for (const [file, source] of JavaScriptArtifactsV1) {
  for (const [label, pattern] of forbiddenRuntimeMarkersV1) {
    if (pattern.test(source)) failV1(`${file} contains ${label}`);
  }
}

const requiredShellMarkersV1 = [
  "browser_local_just_bash",
  "alias expansion depth limit exceeded",
  "stdin size limit exceeded",
] as const;
for (const marker of requiredShellMarkersV1) {
  if (!shellJavaScriptV1.includes(marker)) {
    failV1(`${shellFileV1} omits required bounded shell marker ${marker}`);
  }
}
const forbiddenShellMarkersV1 = [
  ["source map", /sourceMappingURL|sourceURL/iu],
  [
    "test or qualification code",
    /\bvitest\b|@testing-library|\bplaywright\b|__tests__|\.test\.[mc]?[jt]s|qualification/iu,
  ],
  ["Pi code", /@earendil-works\/pi|\bpi-(?:agent|ai|coding)\b|browser-pi|pi_provider/iu],
  ["React code", /\breact(?:-dom)?\b|jsx-runtime/iu],
  ["Wasm asset reference", /\.wasm\b/iu],
  [
    "optional Python or QuickJS runtime",
    /quickjs-emscripten|loadQuickJS|vendor\/cpython|pythonWasm|sql-wasm/iu,
  ],
  [
    "Browser-externalized Node module",
    /__vite-browser-external|browser-external:|\b(?:require|import)\s*\(\s*["'`]node:|\bfrom\s*["'`]node:|\bimport\s*["'`]node:/iu,
  ],
  ["nested Worker runtime", /\bnew\s+Worker\s*\(/u],
  [
    "executable WebAssembly runtime",
    /\bWebAssembly\s*\.\s*(?:compile(?:Streaming)?|instantiate(?:Streaming)?|Module|Instance)\b/u,
  ],
  ["dynamic Function construction", /\bnew\s+Function\s*\(/iu],
] as const;
for (const [label, pattern] of forbiddenShellMarkersV1) {
  if (pattern.test(shellJavaScriptV1)) failV1(`${shellFileV1} contains ${label}`);
}

console.log(
  `SillyOS Browser Workspace Sandbox build boundary passed (${bootstrapBuildIdentityV1}; shell ${shellFileV1}).`,
);
