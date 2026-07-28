// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  applyStoryMetadataToHtmlV1,
  parseStoryMetadataV1,
  renderStoryHeadTagsV1,
} from "./story-metadata.ts";

const pageV1 = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>placeholder</title>
  </head>
  <body></body>
</html>`;

describe("story metadata", () => {
  it("parses a full record and rejects malformed ones", () => {
    const parsed = parseStoryMetadataV1(
      {
        name: "雨巷猫舍",
        description: "雨夜捡到一只奶猫。",
        lang: "zh-CN",
        author: "Jun Jiang (jasl)",
        themeColor: "#221a12",
        shareImage: "assets/cc-bg-title.webp",
        icon: "assets/cc-icon.webp",
      },
      "examples/cat-cafe/metadata.json",
    );
    expect(parsed.name).toBe("雨巷猫舍");
    expect(parsed.shareImage).toBe("assets/cc-bg-title.webp");

    expect(() => parseStoryMetadataV1({ description: "x" }, "s")).toThrow(/non-empty "name"/u);
    expect(() => parseStoryMetadataV1({ name: "x" }, "s")).toThrow(/non-empty "description"/u);
    expect(() => parseStoryMetadataV1({ name: "x", description: "y", extra: 1 }, "s")).toThrow(
      /unknown key "extra"/u,
    );
    expect(() =>
      parseStoryMetadataV1({ name: "x", description: "y", shareImage: "/abs.png" }, "s"),
    ).toThrow(/story-relative/u);
    expect(() =>
      parseStoryMetadataV1({ name: "x", description: "y", icon: "../up.png" }, "s"),
    ).toThrow(/story-relative/u);
  });

  it("renders share tags with story-relative asset URLs and escaping", () => {
    const tags = renderStoryHeadTagsV1(
      parseStoryMetadataV1(
        {
          name: 'A "quoted" <name>',
          description: "d",
          shareImage: "assets/share.webp",
        },
        "s",
      ),
      { storyRoot: "examples/cat-cafe" },
    );
    expect(tags).toContain("<title>A &quot;quoted&quot; &lt;name&gt;</title>");
    expect(tags).toContain('property="og:image" content="examples/cat-cafe/assets/share.webp"');
    expect(tags).toContain('name="twitter:card" content="summary_large_image"');
  });

  it("falls back to a plain summary card without a share image", () => {
    const tags = renderStoryHeadTagsV1(parseStoryMetadataV1({ name: "n", description: "d" }, "s"), {
      storyRoot: "template",
    });
    expect(tags).toContain('name="twitter:card" content="summary"');
    expect(tags).not.toContain("og:image");
  });

  it("replaces the existing title and lang when applied to a page", () => {
    const html = applyStoryMetadataToHtmlV1(
      pageV1,
      parseStoryMetadataV1({ name: "雨巷猫舍", description: "d", lang: "zh-Hans" }, "s"),
      { storyRoot: "examples/cat-cafe" },
    );
    expect(html).toContain('<html lang="zh-Hans"');
    expect(html).toContain("<title>雨巷猫舍</title>");
    expect(html.match(/<title>/gu)).toHaveLength(1);
    expect(html).toContain('property="og:title"');
  });
});
