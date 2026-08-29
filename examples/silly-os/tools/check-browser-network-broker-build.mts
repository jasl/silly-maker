// SPDX-License-Identifier: MIT

const buildDirectoryV1 = new URL("../dist-network-broker/", import.meta.url);

function failV1(message: string): never {
  throw new Error(`SillyOS Browser Network Broker build rejected: ${message}`);
}

async function collectBuildFilesV1(directory: URL, prefix = ""): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const path = `${prefix}${entry.name}`;
    if (entry.isSymlink) failV1(`artifact contains symlink ${path}`);
    if (entry.isFile) files.push(path);
    else if (entry.isDirectory) {
      files.push(
        ...await collectBuildFilesV1(
          new URL(`${encodeURIComponent(entry.name)}/`, directory),
          `${path}/`,
        ),
      );
    } else failV1(`artifact contains unsupported entry ${path}`);
  }
  return files;
}

let filesV1: readonly string[];
try {
  filesV1 = Object.freeze((await collectBuildFilesV1(buildDirectoryV1)).sort());
} catch (error) {
  if (error instanceof Deno.errors.NotFound) failV1("dist-network-broker is unavailable");
  throw error;
}
if (filesV1.some((file) => file.endsWith(".map"))) failV1("artifact contains a source map");

function selectOneV1(label: string, pattern: RegExp): string {
  const matches = filesV1.filter((file) => pattern.test(file));
  if (matches.length !== 1) failV1(`expected one ${label}, found ${matches.length}`);
  const match = matches[0];
  if (match === undefined) failV1(`${label} is unavailable`);
  return match;
}

const bootstrapFileV1 = selectOneV1(
  "bootstrap JavaScript file",
  /^assets\/network-broker-[A-Za-z0-9_-]+\.js$/u,
);
const workerFileV1 = selectOneV1(
  "Broker Worker JavaScript file",
  /^assets\/browser-network-broker\.worker-[A-Za-z0-9_-]+\.js$/u,
);
const expectedFilesV1 = [
  "_headers",
  bootstrapFileV1,
  workerFileV1,
  "network-broker.html",
].sort();
if (
  filesV1.length !== expectedFilesV1.length ||
  filesV1.some((file, index) => file !== expectedFilesV1[index])
) failV1(`artifact file boundary differs: ${filesV1.join(", ")}`);

const [htmlV1, headersV1, bootstrapV1, workerV1] = await Promise.all([
  Deno.readTextFile(new URL("network-broker.html", buildDirectoryV1)),
  Deno.readTextFile(new URL("_headers", buildDirectoryV1)),
  Deno.readTextFile(new URL(bootstrapFileV1, buildDirectoryV1)),
  Deno.readTextFile(new URL(workerFileV1, buildDirectoryV1)),
]);

const productionIdentityPatternV1 =
  /sillyos\.network-broker\.(?:[0-9a-f]{40}|[0-9a-f]{64})(?:-dirty)?/gu;
function exactIdentityV1(file: string, source: string): string {
  const identities = new Set(source.match(productionIdentityPatternV1) ?? []);
  if (identities.size !== 1) failV1(`${file} does not embed one production identity`);
  const identity = [...identities][0];
  if (identity === undefined) failV1(`${file} identity unavailable`);
  return identity;
}
const bootstrapIdentityV1 = exactIdentityV1(bootstrapFileV1, bootstrapV1);
const workerIdentityV1 = exactIdentityV1(workerFileV1, workerV1);
if (bootstrapIdentityV1 !== workerIdentityV1) failV1("document and Worker identities differ");
if (`${bootstrapV1}${workerV1}`.includes("sillyos.network-broker.development")) {
  failV1("artifact contains the development identity");
}

if (/<style\b/iu.test(htmlV1) || /\sstyle\s*=/iu.test(htmlV1)) {
  failV1("built HTML contains inline style authority");
}
if (/\son[a-z]+\s*=/iu.test(htmlV1)) failV1("built HTML contains an inline event handler");
if (/\b(?:href|src)\s*=\s*["']\s*(?:javascript:|(?:https?:)?\/\/)/iu.test(htmlV1)) {
  failV1("built HTML contains an external or executable URL");
}
const scriptsV1 = [...htmlV1.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/giu)];
if (scriptsV1.length !== 1 || (htmlV1.match(/<script\b/giu)?.length ?? 0) !== 1) {
  failV1("built HTML must contain one bootstrap script");
}
const [, attributesV1 = "", bodyV1 = ""] = scriptsV1[0] ?? [];
const sourceV1 = attributesV1.match(/\bsrc\s*=\s*["']([^"']+)["']/iu)?.[1];
const typeV1 = attributesV1.match(/\btype\s*=\s*["']([^"']+)["']/iu)?.[1];
if (bodyV1.trim() !== "" || sourceV1 !== `/${bootstrapFileV1}` || typeV1 !== "module") {
  failV1("built HTML does not load only the fixed module bootstrap");
}

const expectedPolicyV1 =
  "Content-Security-Policy: default-src 'none'; script-src 'self'; worker-src 'self'; connect-src https:; object-src 'none'; base-uri 'none'; frame-ancestors https://silly-os.jasl9187.workers.dev; form-action 'none'";
if (!headersV1.includes(expectedPolicyV1)) failV1("static CSP differs from the Broker policy");
if (headersV1.includes("X-Frame-Options")) failV1("static headers block the admitted parent");

for (const [label, source] of [[bootstrapFileV1, bootstrapV1], [workerFileV1, workerV1]] as const) {
  for (
    const forbidden of [
      "indexedDB",
      "localStorage",
      "sessionStorage",
      "Authorization",
      "document.cookie",
      "eval(",
      "new Function",
    ]
  ) {
    if (source.includes(forbidden)) failV1(`${label} contains forbidden authority ${forbidden}`);
  }
}
for (
  const required of [
    "GET",
    "cors",
    "error",
    "omit",
    "no-referrer",
    "no-store",
    "network_broker_fetch_url",
  ]
) {
  if (!workerV1.includes(required)) failV1(`Broker Worker omits fixed request marker ${required}`);
}

console.log(
  `SillyOS Browser Network Broker build accepted (${bootstrapIdentityV1}; ${filesV1.length} fixed files).`,
);
