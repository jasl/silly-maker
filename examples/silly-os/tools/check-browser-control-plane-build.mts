// SPDX-License-Identifier: MIT

const buildDirectoryV1 = new URL("../dist-web/", import.meta.url);
const htmlV1 = await Deno.readTextFile(new URL("index.html", buildDirectoryV1));
const headersV1 = await Deno.readTextFile(new URL("_headers", buildDirectoryV1));

function failV1(message: string): never {
  throw new Error(`SillyOS Browser control-plane build rejected: ${message}`);
}

async function collectBuildFilesV1(directory: URL, relativeDirectory = ""): Promise<string[]> {
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

const filesV1 = await collectBuildFilesV1(buildDirectoryV1);
const retiredSameOriginHostWorkerPatternV1 =
  /(?:^|\/)browser-workspace-host\.worker-[A-Za-z0-9_-]+\.js$/u;
if (filesV1.some((file) => retiredSameOriginHostWorkerPatternV1.test(file))) {
  failV1("artifact contains the retired same-origin Workspace Host Worker");
}
const networkBrokerWorkerPatternV1 = /(?:^|\/)browser-network-broker\.worker-[A-Za-z0-9_-]+\.js$/u;
if (filesV1.some((file) => networkBrokerWorkerPatternV1.test(file))) {
  failV1("artifact contains the independent-origin Network Broker Worker");
}
const sandboxExecutionAssetPatternsV1 = [
  /(?:^|\/)[^/]*quickjs[^/]*\.js$/iu,
  /(?:^|\/)[^/]*emscripten[^/]*\.js$/iu,
  /(?:^|\/)ffi-[A-Za-z0-9_-]+\.js$/u,
  /\.wasm$/iu,
] as const;
for (const file of filesV1) {
  if (sandboxExecutionAssetPatternsV1.some((pattern) => pattern.test(file))) {
    failV1(`artifact contains Workspace Sandbox execution asset ${file}`);
  }
}
const productionBuildIdentityPatternV1 =
  /sillyos\.workspace-sandbox\.(?:[0-9a-f]{40}|[0-9a-f]{64})(?:-dirty)?/gu;
const buildIdentitiesV1 = new Set<string>();
const productionNetworkBuildIdentityPatternV1 =
  /sillyos\.network-broker\.(?:[0-9a-f]{40}|[0-9a-f]{64})(?:-dirty)?/gu;
const networkBuildIdentitiesV1 = new Set<string>();
const identityBearingFilesV1: string[] = [];
const sandboxExecutionMarkerPatternV1 =
  /(?:quickjs_(?:execute|result)|quickjs-emscripten|QTS_NewRuntime|WebAssembly\.Memory|wasm(?:Binary|Memory)|emscriptenModule)/u;
for (const file of filesV1.filter((candidate) => candidate.endsWith(".js"))) {
  const source = await Deno.readTextFile(new URL(file, buildDirectoryV1));
  const identities = source.match(productionBuildIdentityPatternV1) ?? [];
  if (identities.length > 0) identityBearingFilesV1.push(file);
  for (const identity of identities) {
    buildIdentitiesV1.add(identity);
  }
  const networkIdentities = source.match(productionNetworkBuildIdentityPatternV1) ?? [];
  for (const identity of networkIdentities) networkBuildIdentitiesV1.add(identity);
  if (source.includes("sillyos.workspace-sandbox.development")) {
    failV1(`${file} contains the development Workspace Sandbox build identity`);
  }
  if (source.includes("sillyos.network-broker.development")) {
    failV1(`${file} contains the development Network Broker build identity`);
  }
  if (source.includes("browser-workspace-host.worker")) {
    failV1(`${file} references the retired same-origin Workspace Host Worker`);
  }
  if (sandboxExecutionMarkerPatternV1.test(source)) {
    failV1(`${file} contains Workspace Sandbox QuickJS/Wasm execution code`);
  }
}
if (identityBearingFilesV1.length === 0 || buildIdentitiesV1.size !== 1) {
  failV1("artifact does not embed exactly one production Workspace Sandbox build identity");
}
if (networkBuildIdentitiesV1.size !== 1) {
  failV1("artifact does not embed exactly one production Network Broker build identity");
}

if (/<style\b/iu.test(htmlV1)) failV1("built HTML contains an inline style element");
if (/\sstyle\s*=/iu.test(htmlV1)) failV1("built HTML contains an inline style attribute");
if (/\son[a-z]+\s*=/iu.test(htmlV1)) {
  failV1("built HTML contains an inline event handler");
}
if (/\b(?:href|src)\s*=\s*["']\s*javascript:/iu.test(htmlV1)) {
  failV1("built HTML contains a javascript URL");
}

const scriptTagsV1 = [...htmlV1.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/giu)];
for (const [, attributes = "", body = ""] of scriptTagsV1) {
  const source = attributes.match(/\bsrc\s*=\s*["']([^"']+)["']/iu)?.[1];
  if (source !== undefined) {
    if (/^(?:https?:)?\/\//iu.test(source)) {
      failV1("built HTML loads a third-party runtime script");
    }
    continue;
  }

  const type = attributes.match(/\btype\s*=\s*["']([^"']+)["']/iu)?.[1]?.toLowerCase();
  if (type !== "application/json") failV1("built HTML contains executable inline script");
  try {
    JSON.parse(body);
  } catch {
    failV1("built HTML contains invalid inline application/json data");
  }
}

const expectedContentSecurityPolicyV1 = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "style-src-elem 'self'",
  "style-src-attr 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "frame-src https://silly-os-sandbox.jasl9187.workers.dev https://silly-os-network.jasl9187.workers.dev blob:",
  "media-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");
const expectedHeadersV1 = [
  "/*",
  `  Content-Security-Policy: ${expectedContentSecurityPolicyV1}`,
  "  Content-Security-Policy-Report-Only: require-trusted-types-for 'script'; trusted-types 'none'",
  "  Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "  Referrer-Policy: no-referrer",
  "  X-Content-Type-Options: nosniff",
  "  X-Frame-Options: DENY",
].join("\n");
if (headersV1.replaceAll("\r\n", "\n").trimEnd() !== expectedHeadersV1) {
  failV1("built _headers differs from the fixed control-plane policy");
}

console.log(
  `SillyOS Browser control-plane build boundary passed (${[...buildIdentitiesV1][0]}, ${
    [...networkBuildIdentitiesV1][0]
  }).`,
);
