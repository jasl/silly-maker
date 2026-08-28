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
const bootstrapFilesV1 = filesV1.filter((file) => bootstrapPatternV1.test(file));
const hostWorkerFilesV1 = filesV1.filter((file) => hostWorkerPatternV1.test(file));
if (bootstrapFilesV1.length !== 1) {
  failV1(`expected one bootstrap JavaScript file, found ${bootstrapFilesV1.length}`);
}
if (hostWorkerFilesV1.length !== 1) {
  failV1(`expected one Host Worker JavaScript file, found ${hostWorkerFilesV1.length}`);
}

const bootstrapFileV1 = bootstrapFilesV1[0];
const hostWorkerFileV1 = hostWorkerFilesV1[0];
if (bootstrapFileV1 === undefined || hostWorkerFileV1 === undefined) {
  failV1("fixed JavaScript artifacts are unavailable");
}
const expectedFilesV1 = [
  "_headers",
  "workspace-sandbox.html",
  bootstrapFileV1,
  hostWorkerFileV1,
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

const expectedHeadersV1 = [
  "/*",
  "  Content-Security-Policy: default-src 'none'; script-src 'self'; worker-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors https://silly-os.jasl9187.workers.dev; form-action 'none'",
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
  ["dynamic script loading", /\bimportScripts\s*\(|\bimport\s*\(/iu],
  ["dynamic evaluation", /\beval\s*\(|\bnew\s+Function\s*\(/iu],
  [
    "test or qualification code",
    /\bvitest\b|@testing-library|\bplaywright\b|__tests__|\.test\.[mc]?[jt]s|qualification/iu,
  ],
  ["Pi code", /@earendil-works\/pi|\bpi-(?:agent|ai|coding)\b|browser-pi|pi_provider/iu],
  ["Provider code", /\bprovider\b/iu],
  ["React code", /\breact(?:-dom)?\b|jsx-runtime/iu],
  [
    "just-bash code",
    /\bjust-bash\b|bash: .*command not found|alias expansion depth limit exceeded|stdin size limit exceeded|BashTransformPipeline|__just_bash_/iu,
  ],
] as const;
for (const [file, source] of JavaScriptArtifactsV1) {
  for (const [label, pattern] of forbiddenRuntimeMarkersV1) {
    if (pattern.test(source)) failV1(`${file} contains ${label}`);
  }
}

console.log("SillyOS Browser Workspace Sandbox build boundary passed.");
