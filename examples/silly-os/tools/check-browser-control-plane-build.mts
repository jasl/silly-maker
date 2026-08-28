// SPDX-License-Identifier: MIT

const buildDirectoryV1 = new URL("../dist-web/", import.meta.url);
const htmlV1 = await Deno.readTextFile(new URL("index.html", buildDirectoryV1));
const headersV1 = await Deno.readTextFile(new URL("_headers", buildDirectoryV1));

function failV1(message: string): never {
  throw new Error(`SillyOS Browser control-plane build rejected: ${message}`);
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

const requiredHeaderFragmentsV1 = [
  "Content-Security-Policy: default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "style-src-elem 'self'",
  "style-src-attr 'none'",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "Content-Security-Policy-Report-Only: require-trusted-types-for 'script'",
  "Permissions-Policy:",
  "Referrer-Policy: no-referrer",
  "X-Content-Type-Options: nosniff",
  "X-Frame-Options: DENY",
] as const;
for (const fragment of requiredHeaderFragmentsV1) {
  if (!headersV1.includes(fragment)) failV1(`built _headers is missing ${fragment}`);
}
for (const forbidden of ["'unsafe-inline'", "'unsafe-eval'", "connect-src https:"] as const) {
  if (headersV1.includes(forbidden)) failV1(`built _headers contains ${forbidden}`);
}

console.log("SillyOS Browser control-plane build boundary passed.");
