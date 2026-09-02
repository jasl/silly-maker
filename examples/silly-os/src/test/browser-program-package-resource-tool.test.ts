// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  browserProgramPackageResourceMaximumBytesV1,
  browserProgramPackageResourceToolNameV1,
  createBrowserProgramPackageResourceToolV1,
} from "../agent/browser-program-package-resource-tool.ts";

const textEncoderV1 = new TextEncoder();

describe("Browser Program package resource tool", () => {
  it("reads and pages current Program resource bytes without a Workspace projection", async () => {
    const tool = createBrowserProgramPackageResourceToolV1([{
      path: "skills/translate/SKILL.md",
      mediaType: "text/markdown",
      bytes: textEncoderV1.encode("# Translate\nfirst\nsecond\nthird"),
    }]);

    expect(tool.name).toBe(browserProgramPackageResourceToolNameV1);
    await expect(tool.execute("call.1", {
      path: "skills/translate/SKILL.md",
      offset: 2,
      limit: 2,
    })).resolves.toEqual({
      content: [{
        type: "text",
        text: "first\nsecond\n\n[Showing lines 2-3 of 4. Continue with offset=4.]",
      }],
      details: {
        path: "skills/translate/SKILL.md",
        mediaType: "text/markdown",
        startLine: 2,
        endLine: 3,
        totalLines: 4,
        nextOffset: 4,
      },
    });

    await expect(tool.execute("call.2", {
      path: "skills/translate/SKILL.md",
      offset: 4,
    })).resolves.toMatchObject({
      content: [{ type: "text", text: "third" }],
      details: { nextOffset: null },
    });
  });

  it("does not resolve paths outside the current Program resource set", async () => {
    const tool = createBrowserProgramPackageResourceToolV1([{
      path: "skills/translate/SKILL.md",
      mediaType: "text/markdown",
      bytes: textEncoderV1.encode("exact"),
    }]);

    await expect(tool.execute("call.missing", { path: "../other/PROGRAM.md" }))
      .rejects.toThrow("sillyos.program_resource.not_found");
  });

  it("rejects non-UTF-8 package bytes instead of substituting decoded content", async () => {
    const tool = createBrowserProgramPackageResourceToolV1([{
      path: "references/binary.dat",
      mediaType: "application/octet-stream",
      bytes: new Uint8Array([0xff, 0xfe]),
    }]);

    await expect(tool.execute("call.binary", { path: "references/binary.dat" }))
      .rejects.toThrow("sillyos.program_resource.not_utf8_text");
  });

  it("rejects a single line that cannot fit within the tool output budget", async () => {
    const tool = createBrowserProgramPackageResourceToolV1([{
      path: "references/oversized.txt",
      mediaType: "text/plain",
      bytes: textEncoderV1.encode(
        "x".repeat(browserProgramPackageResourceMaximumBytesV1 + 1),
      ),
    }]);

    await expect(tool.execute("call.oversized", { path: "references/oversized.txt" }))
      .rejects.toThrow("sillyos.program_resource.line_exceeds_output_budget");
  });
});
