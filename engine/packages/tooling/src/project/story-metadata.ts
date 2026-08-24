// SPDX-License-Identifier: MIT
// Story share metadata: a per-Story `metadata.json` describes how the
// deployed web page presents itself — document title, description, and
// social-sharing cards (Open Graph / Twitter). The Vite config injects the
// rendered tags at build time; the site composer absolutizes image URLs
// when the deployment origin is known.

/** Parsed shape of `<storyRoot>/metadata.json`. */
export interface StoryMetadataV1 {
  /** Page + share title, e.g. "雨巷猫舍". */
  readonly name: string;
  /** One-or-two sentence share description. */
  readonly description: string;
  /** BCP 47 tag for the html element, e.g. "zh-CN". */
  readonly lang?: string;
  readonly author?: string;
  /** Browser UI accent, e.g. "#221a12". */
  readonly themeColor?: string;
  /**
   * Story-relative share image (og:image / twitter card), e.g.
   * "assets/cc-bg-title.webp". Emitted page-relative; crawlers require
   * absolute URLs, which the site composer rewrites via SITE_ORIGIN.
   */
  readonly shareImage?: string;
  /** Story-relative favicon, e.g. "assets/cc-icon.webp". */
  readonly icon?: string;
}

const optionalStringKeysV1 = ["lang", "author", "themeColor", "shareImage", "icon"] as const;

function fail(source: string, message: string): never {
  throw new TypeError(`invalid story metadata (${source}): ${message}`);
}

/** Validates the parsed JSON value of a metadata.json file. */
export function parseStoryMetadataV1(value: unknown, source: string): StoryMetadataV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(source, "expected a JSON object");
  }
  const record = value as Readonly<Record<string, unknown>>;
  const known = new Set<string>(["name", "description", ...optionalStringKeysV1]);
  for (const key of Object.keys(record)) {
    if (!known.has(key)) return fail(source, `unknown key "${key}"`);
  }
  if (typeof record.name !== "string" || record.name.trim() === "") {
    return fail(source, 'requires a non-empty "name"');
  }
  if (typeof record.description !== "string" || record.description.trim() === "") {
    return fail(source, 'requires a non-empty "description"');
  }
  for (const key of optionalStringKeysV1) {
    const candidate = record[key];
    if (candidate !== undefined && (typeof candidate !== "string" || candidate.trim() === "")) {
      return fail(source, `"${key}" must be a non-empty string when present`);
    }
    if (
      (key === "shareImage" || key === "icon") &&
      typeof candidate === "string" &&
      (candidate.startsWith("/") || candidate.includes(".."))
    ) {
      return fail(source, `"${key}" must be a story-relative path`);
    }
  }
  return {
    name: record.name,
    description: record.description,
    ...(record.lang === undefined ? {} : { lang: record.lang as string }),
    ...(record.author === undefined ? {} : { author: record.author as string }),
    ...(record.themeColor === undefined ? {} : { themeColor: record.themeColor as string }),
    ...(record.shareImage === undefined ? {} : { shareImage: record.shareImage as string }),
    ...(record.icon === undefined ? {} : { icon: record.icon as string }),
  };
}

function escapeHtmlV1(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Renders the head block for a Story page. Asset URLs stay page-relative
 * under the same application-root `assets/...` convention as runtime
 * assets, so they resolve in dev, in standalone builds, and in the
 * composed site.
 */
export function renderStoryHeadTagsV1(metadata: StoryMetadataV1): string {
  const title = escapeHtmlV1(metadata.name);
  const description = escapeHtmlV1(metadata.description);
  const assetUrl = (path: string): string => path;
  const lines: string[] = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
  ];
  if (metadata.author !== undefined) {
    lines.push(`<meta name="author" content="${escapeHtmlV1(metadata.author)}" />`);
  }
  if (metadata.themeColor !== undefined) {
    lines.push(`<meta name="theme-color" content="${escapeHtmlV1(metadata.themeColor)}" />`);
  }
  lines.push(
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
  );
  if (metadata.shareImage !== undefined) {
    const image = escapeHtmlV1(assetUrl(metadata.shareImage));
    lines.push(
      `<meta property="og:image" content="${image}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${description}" />`,
      `<meta name="twitter:image" content="${image}" />`,
    );
  } else {
    lines.push(
      `<meta name="twitter:card" content="summary" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${description}" />`,
    );
  }
  if (metadata.icon !== undefined) {
    lines.push(`<link rel="icon" href="${escapeHtmlV1(assetUrl(metadata.icon))}" />`);
  }
  return lines.join("\n    ");
}

/**
 * Applies the rendered head block to a page: replaces an existing
 * `<title>` (the block carries its own) and the html lang attribute when
 * the metadata declares one.
 */
export function applyStoryMetadataToHtmlV1(html: string, metadata: StoryMetadataV1): string {
  const withoutTitle = html.replace(/[ \t]*<title>[\s\S]*?<\/title>\n?/u, "");
  const block = renderStoryHeadTagsV1(metadata);
  const injected = withoutTitle.replace("</head>", `  ${block}\n  </head>`);
  if (metadata.lang === undefined) return injected;
  return injected.replace(/<html lang="[^"]*"/u, `<html lang="${escapeHtmlV1(metadata.lang)}"`);
}
