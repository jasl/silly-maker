// SPDX-License-Identifier: MIT

const buildDirectoryV1 = new URL("../dist-web/", import.meta.url);
const htmlV1 = await Deno.readTextFile(new URL("index.html", buildDirectoryV1));
const headersV1 = await Deno.readTextFile(new URL("_headers", buildDirectoryV1));
const bundledProgramPackageDirectoriesV1 = [
  new URL("../programs/creator/package/", import.meta.url),
  new URL("../programs/translation/package/", import.meta.url),
] as const;

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
const themeBootstrapFileV1 = "silly-os-theme-bootstrap.js";
if (!filesV1.includes(themeBootstrapFileV1)) {
  failV1("artifact omits the fixed pre-mount product-theme bootstrap");
}
const themeBootstrapSourceV1 = await Deno.readTextFile(
  new URL(themeBootstrapFileV1, buildDirectoryV1),
);
for (
  const required of [
    "sillymaker.example-silly-os.product-preferences.v1",
    "new TextEncoder().encode(serialized).byteLength <= 512",
    "Object.keys(stored).length === 3",
    'stored.theme === "system"',
    "prefers-color-scheme: dark",
    "sillyOsColorScheme",
  ]
) {
  if (!themeBootstrapSourceV1.includes(required)) {
    failV1(`product-theme bootstrap omits fixed marker ${required}`);
  }
}

const cssFilesV1 = filesV1.filter((candidate) => candidate.endsWith(".css"));
const productDesignSystemCssFilesV1: string[] = [];
const tailwindUtilityCssFilesV1: string[] = [];
for (const file of cssFilesV1) {
  const source = await Deno.readTextFile(new URL(file, buildDirectoryV1));
  if (source.includes(".sos\\:")) tailwindUtilityCssFilesV1.push(file);
  for (
    const [label, pattern] of [
      ["global Tailwind theme selector", /:root\s*,\s*:host/u],
      [
        "global Tailwind property fallback",
        /\*\s*,\s*::?before\s*,\s*::?after\s*,\s*::backdrop/u,
      ],
      ["global Tailwind custom-property registration", /@property\s+--tw-/u],
    ] as const
  ) {
    if (pattern.test(source)) failV1(`${file} contains ${label}`);
  }
  if (source.includes("[data-slot=alert-dialog-content]")) {
    productDesignSystemCssFilesV1.push(file);
  }
}
if (tailwindUtilityCssFilesV1.length === 0) {
  failV1("artifact omits product-prefixed Tailwind utilities");
}
if (productDesignSystemCssFilesV1.length !== 1) {
  failV1(
    `artifact must contain exactly one scoped product design-system stylesheet, found ${productDesignSystemCssFilesV1.length}`,
  );
}

function buildPathFromReferenceV1(reference: string, from = "index.html"): string {
  const base = new URL(from, buildDirectoryV1);
  const resolved = new URL(reference, base);
  if (!resolved.href.startsWith(buildDirectoryV1.href)) {
    failV1(`${from} references an artifact outside dist-web: ${reference}`);
  }
  const path = decodeURIComponent(resolved.href.slice(buildDirectoryV1.href.length));
  if (!filesV1.includes(path)) failV1(`${from} references missing artifact ${path}`);
  return path;
}

async function collectStaticJavaScriptGraphV1(
  entries: readonly string[],
  collected = new Set<string>(),
): Promise<ReadonlySet<string>> {
  for (const entry of entries) {
    if (collected.has(entry)) continue;
    collected.add(entry);
    const source = await Deno.readTextFile(new URL(entry, buildDirectoryV1));
    const specifiers = [
      ...source.matchAll(/\bfrom\s*["'`]([^"'`]+)["'`]/gu),
      ...source.matchAll(/\bimport\s*["'`]([^"'`]+)["'`]/gu),
    ].map((match) => match[1] ?? "");
    const dependencies = specifiers
      .filter((specifier) => specifier.startsWith("."))
      .map((specifier) => buildPathFromReferenceV1(specifier, entry))
      .filter((path) => path.endsWith(".js") || path.endsWith(".mjs"));
    await collectStaticJavaScriptGraphV1(dependencies, collected);
  }
  return collected;
}

async function collectCompleteJavaScriptGraphV1(
  entries: readonly string[],
  collected = new Set<string>(),
): Promise<ReadonlySet<string>> {
  for (const entry of entries) {
    if (collected.has(entry)) continue;
    collected.add(entry);
    const source = await Deno.readTextFile(new URL(entry, buildDirectoryV1));
    const specifiers = [
      ...source.matchAll(/\bfrom\s*["'`]([^"'`]+)["'`]/gu),
      ...source.matchAll(/\bimport\s*["'`]([^"'`]+)["'`]/gu),
      ...source.matchAll(/\bimport\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/gu),
    ].map((match) => match[1] ?? "");
    const dependencies = specifiers
      .filter((specifier) => specifier.startsWith("."))
      .map((specifier) => buildPathFromReferenceV1(specifier, entry))
      .filter((path) => path.endsWith(".js") || path.endsWith(".mjs"));
    await collectCompleteJavaScriptGraphV1(dependencies, collected);
  }
  return collected;
}

const initialModuleEntriesV1 = [
  ...htmlV1.matchAll(
    /<script\b(?=[^>]*\btype=["']module["'])[^>]*\bsrc=["']([^"']+)["'][^>]*>/giu,
  ),
  ...htmlV1.matchAll(
    /<link\b(?=[^>]*\brel=["']modulepreload["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/giu,
  ),
].map((match) => buildPathFromReferenceV1(match[1] ?? ""));
if (initialModuleEntriesV1.length === 0) failV1("artifact omits the initial module graph");
const initialJavaScriptGraphV1 = await collectStaticJavaScriptGraphV1(initialModuleEntriesV1);
const initialStyleEntriesV1 = [...htmlV1.matchAll(
  /<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/giu,
)].map((match) => buildPathFromReferenceV1(match[1] ?? ""));

async function collectBundledProgramPackageBodyFilesV1(
  directory: URL,
  relativeDirectory = "",
): Promise<readonly { readonly label: string; readonly bytes: Uint8Array }[]> {
  const bodies: { label: string; bytes: Uint8Array }[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const relativePath = `${relativeDirectory}${entry.name}`;
    if (entry.isSymlink) failV1(`bundled Program package contains symlink ${relativePath}`);
    if (entry.isDirectory) {
      bodies.push(
        ...await collectBundledProgramPackageBodyFilesV1(
          new URL(`${encodeURIComponent(entry.name)}/`, directory),
          `${relativePath}/`,
        ),
      );
      continue;
    }
    if (!entry.isFile) {
      failV1(`bundled Program package contains unsupported entry ${relativePath}`);
    }
    if (relativePath === "program.json") continue;
    bodies.push({
      label: relativePath,
      bytes: await Deno.readFile(new URL(entry.name, directory)),
    });
  }
  return bodies;
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function containsBytesV1(haystack: Uint8Array, needle: Uint8Array): boolean {
  if (needle.byteLength === 0 || needle.byteLength > haystack.byteLength) return false;
  const limit = haystack.byteLength - needle.byteLength;
  for (let start = 0; start <= limit; start += 1) {
    if (haystack[start] !== needle[0]) continue;
    let matches = true;
    for (let offset = 1; offset < needle.byteLength; offset += 1) {
      if (haystack[start + offset] === needle[offset]) continue;
      matches = false;
      break;
    }
    if (matches) return true;
  }
  return false;
}

const initialArtifactPathsV1 = [
  "index.html",
  ...initialJavaScriptGraphV1,
  ...initialStyleEntriesV1,
];
const initialArtifactBytesV1 = new Map(
  await Promise.all(
    initialArtifactPathsV1.map(async (path) =>
      [path, await Deno.readFile(new URL(path, buildDirectoryV1))] as const
    ),
  ),
);
const buildArtifactBytesV1 = new Map(
  await Promise.all(
    filesV1.map(async (path) =>
      [path, await Deno.readFile(new URL(path, buildDirectoryV1))] as const
    ),
  ),
);
for (const directory of bundledProgramPackageDirectoriesV1) {
  const packageLabel = directory.pathname.split("/").filter(Boolean).slice(-2, -1)[0] ?? "unknown";
  for (const body of await collectBundledProgramPackageBodyFilesV1(directory)) {
    const base64 = body.bytes.toBase64();
    const emittedPaths = [...buildArtifactBytesV1]
      .filter(([, bytes]) => bytesEqualV1(bytes, body.bytes))
      .map(([path]) => path);
    for (const [path, bytes] of initialArtifactBytesV1) {
      if (containsBytesV1(bytes, body.bytes)) {
        failV1(`initial graph embeds ${packageLabel} package body ${body.label}: ${path}`);
      }
      const source = new TextDecoder().decode(bytes);
      if (source.includes(base64)) {
        failV1(`initial graph base64-inlines ${packageLabel} package body ${body.label}: ${path}`);
      }
      for (const emittedPath of emittedPaths) {
        const emittedName = emittedPath.split("/").at(-1) ?? emittedPath;
        if (source.includes(emittedName)) {
          failV1(`initial graph references ${packageLabel} package body ${body.label}: ${path}`);
        }
      }
    }
  }
}

const programImplementationMarkersV1 = [
  ["Creator home UI", "creator-home__hero"],
  ["Creator workspace UI", "program-workspace__separator"],
  ["Translation workspace UI", "translation-workbench__summary"],
  ["Creator persistence facet", "creator_program_heads"],
  ["Creator Agent runtime", "sillyos_propose_program_revision"],
  ["Translation Agent runtime", "sillyos_submit_translation_batch"],
] as const;
async function rejectProgramImplementationsV1(
  graphName: string,
  paths: ReadonlySet<string> | readonly string[],
): Promise<void> {
  for (const path of paths) {
    const source = await Deno.readTextFile(new URL(path, buildDirectoryV1));
    for (const [label, marker] of programImplementationMarkersV1) {
      if (source.includes(marker)) failV1(`${graphName} eagerly contains ${label}: ${path}`);
    }
  }
}
await rejectProgramImplementationsV1("Program Library module graph", initialJavaScriptGraphV1);
await rejectProgramImplementationsV1("Program Library stylesheet graph", initialStyleEntriesV1);

const agentCompositionFilesV1 = filesV1.filter((file) =>
  /(?:^|\/)program-agent-composition-[A-Za-z0-9_-]+\.js$/u.test(file)
);
if (agentCompositionFilesV1.length !== 1) {
  failV1(
    `artifact must contain exactly one lazy Program Agent composition, found ${agentCompositionFilesV1.length}`,
  );
}
const agentCompositionGraphV1 = await collectStaticJavaScriptGraphV1(agentCompositionFilesV1);
await rejectProgramImplementationsV1("shared Program Agent composition", agentCompositionGraphV1);

const agentWorkerFilesV1 = filesV1.filter((file) =>
  /(?:^|\/)browser-pi\.worker-[A-Za-z0-9_-]+\.js$/u.test(file)
);
if (agentWorkerFilesV1.length !== 1) {
  failV1(
    `artifact must contain exactly one Agent Worker entry, found ${agentWorkerFilesV1.length}`,
  );
}
await rejectProgramImplementationsV1("Agent Worker entry", agentWorkerFilesV1);
const workerProgramCompositionFilesV1 = filesV1.filter((file) =>
  /(?:^|\/)program-agent-runtime-composition-[A-Za-z0-9_-]+\.js$/u.test(file)
);
if (workerProgramCompositionFilesV1.length !== 1) {
  failV1(
    `artifact must contain exactly one lazy Worker Program composition, found ${workerProgramCompositionFilesV1.length}`,
  );
}
const workerProgramCompositionGraphV1 = await collectStaticJavaScriptGraphV1(
  workerProgramCompositionFilesV1,
);
await rejectProgramImplementationsV1(
  "Worker Program composition",
  workerProgramCompositionGraphV1,
);
const completeAgentWorkerGraphV1 = await collectCompleteJavaScriptGraphV1(agentWorkerFilesV1);
for (const path of completeAgentWorkerGraphV1) {
  if (/(?:controller-adapter|program-surface)-[A-Za-z0-9_-]+\.js$/u.test(path)) {
    failV1(`Agent Worker graph contains page controller or UI module: ${path}`);
  }
  const source = await Deno.readTextFile(new URL(path, buildDirectoryV1));
  for (const [label, marker] of programImplementationMarkersV1.slice(0, 3)) {
    if (source.includes(marker)) failV1(`Agent Worker graph contains ${label}: ${path}`);
  }
}

const artifactProgramMarkerFilesV1 = new Map<string, string[]>();
for (const path of filesV1.filter((file) => /\.(?:css|m?js)$/u.test(file))) {
  const source = await Deno.readTextFile(new URL(path, buildDirectoryV1));
  for (const [, marker] of programImplementationMarkersV1) {
    if (!source.includes(marker)) continue;
    const retained = artifactProgramMarkerFilesV1.get(marker) ?? [];
    retained.push(path);
    artifactProgramMarkerFilesV1.set(marker, retained);
  }
}
for (const [label, marker] of programImplementationMarkersV1) {
  if ((artifactProgramMarkerFilesV1.get(marker)?.length ?? 0) === 0) {
    failV1(`artifact omits the selected lazy ${label}`);
  }
}

const credentialVaultSourceRootV1 = new URL("../src/credential/", import.meta.url);
const credentialVaultWorkerSourceEntryV1 = new URL(
  "browser-credential-vault.worker.ts",
  credentialVaultSourceRootV1,
);

async function collectCredentialVaultWorkerSourceGraphV1(
  entry: URL,
  collected = new Map<string, string>(),
): Promise<ReadonlyMap<string, string>> {
  if (collected.has(entry.href)) return collected;
  if (!entry.href.startsWith(credentialVaultSourceRootV1.href)) {
    failV1(`Vault Worker source graph escapes credential ownership: ${entry.href}`);
  }
  const source = await Deno.readTextFile(entry);
  collected.set(entry.href, source);
  if (/\bimport\s*\(/u.test(source)) {
    failV1(`Vault Worker source graph contains a dynamic import: ${entry.pathname}`);
  }
  const specifiers = [
    ...source.matchAll(/\bfrom\s+["']([^"']+)["']/gu),
    ...source.matchAll(/\bimport\s+["']([^"']+)["']/gu),
  ].map((match) => match[1] ?? "");
  for (const specifier of specifiers) {
    if (!specifier.startsWith("./") || specifier.includes("?") || specifier.includes("#")) {
      failV1(
        `Vault Worker source graph imports non-credential authority ${specifier} from ${entry.pathname}`,
      );
    }
    await collectCredentialVaultWorkerSourceGraphV1(new URL(specifier, entry), collected);
  }
  return collected;
}

const credentialVaultWorkerSourceGraphV1 = await collectCredentialVaultWorkerSourceGraphV1(
  credentialVaultWorkerSourceEntryV1,
);
for (const [path, source] of credentialVaultWorkerSourceGraphV1) {
  for (
    const [label, pattern] of [
      ["fetch", /\bfetch\s*\(/u],
      ["nested Worker", /\b(?:Shared)?Worker\s*\(/u],
      ["importScripts", /\bimportScripts\s*\(/u],
      ["XMLHttpRequest", /\bXMLHttpRequest\b/u],
      ["WebSocket", /\bWebSocket\b/u],
      ["EventSource", /\bEventSource\b/u],
      ["document", /\bdocument\b/u],
      ["window", /\bwindow\b/u],
      [
        "Program Data Repository",
        /program-(?:(?:data|catalog|process)-)?repository|(?:Product|Program(?:Data|Catalog|Process)?)Repository/u,
      ],
      ["Workspace", /browser-workspace|WorkspaceExecution|WorkspaceHost/u],
    ] as const
  ) {
    if (pattern.test(source)) failV1(`Vault Worker source graph contains ${label}: ${path}`);
  }
}
const retiredSameOriginHostWorkerPatternV1 =
  /(?:^|\/)browser-workspace-host\.worker-[A-Za-z0-9_-]+\.js$/u;
if (filesV1.some((file) => retiredSameOriginHostWorkerPatternV1.test(file))) {
  failV1("artifact contains the retired same-origin Workspace Host Worker");
}
const networkBrokerWorkerPatternV1 = /(?:^|\/)browser-network-broker\.worker-[A-Za-z0-9_-]+\.js$/u;
if (filesV1.some((file) => networkBrokerWorkerPatternV1.test(file))) {
  failV1("artifact contains the independent-origin Network Broker Worker");
}
const credentialVaultWorkerPatternV1 =
  /(?:^|\/)browser-credential-vault\.worker-[A-Za-z0-9_-]{8,64}\.js$/u;
const credentialVaultWorkerFilesV1 = filesV1.filter((file) =>
  credentialVaultWorkerPatternV1.test(file)
);
if (credentialVaultWorkerFilesV1.length !== 1) {
  failV1(
    `artifact must contain exactly one fixed Credential Vault Worker, found ${credentialVaultWorkerFilesV1.length}`,
  );
}
const credentialVaultWorkerFileV1 = credentialVaultWorkerFilesV1[0];
if (credentialVaultWorkerFileV1 === undefined) {
  failV1("Credential Vault Worker artifact is unavailable");
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
  if (file === credentialVaultWorkerFileV1) {
    for (
      const required of [
        "sillymaker.example-silly-os.credentials",
        "PBKDF2",
        "SHA-256",
        "AES-GCM",
        "credential_vault_handoff_ready",
        "credential_vault_handoff_delivery",
      ]
    ) {
      if (!source.includes(required)) {
        failV1(`Credential Vault Worker omits fixed marker ${required}`);
      }
    }
    for (
      const forbidden of [
        "endpoint-origin",
        "Authorization",
        "XMLHttpRequest",
        "WebSocket",
        "EventSource",
        "localStorage",
        "sessionStorage",
        "document.cookie",
        "browser-workspace",
        "program-repository",
        "program-data-repository",
        "program-catalog-repository",
        "program-process-repository",
      ]
    ) {
      if (source.includes(forbidden)) {
        failV1(`Credential Vault Worker contains forbidden authority ${forbidden}`);
      }
    }
  } else {
    for (
      const coreMarker of [
        "sillymaker.example-silly-os.credentials",
        "PBKDF2-HMAC-SHA256",
        "sillyos.credential-vault.verifier",
      ]
    ) {
      if (source.includes(coreMarker)) {
        failV1(`${file} contains Credential Vault core ${coreMarker}`);
      }
    }
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
if ((htmlV1.match(/<meta\b[^>]*\bname=["']theme-color["']/giu) ?? []).length !== 1) {
  failV1("built HTML must contain exactly one product-owned theme-color meta");
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
  }; ${credentialVaultWorkerFileV1}).`,
);
