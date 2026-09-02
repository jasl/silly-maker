// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { createBrowserProgramRuntimeProfileLoaderV1 } from "../agent/browser-program-runtime-profile-loader.ts";
import {
  creatorProgramRuntimeProfileImplementationV1,
  creatorProgramRuntimeProfileV1,
} from "../../programs/creator/runtime-profile/creator-runtime-profile.ts";
import { creatorProgramRuntimeProfileDescriptorV1 } from "../../programs/creator/runtime-profile/creator-runtime-profile-descriptor.ts";
import {
  translationProgramRuntimeProfileImplementationV1,
  translationProgramRuntimeProfileV1,
} from "../../programs/translation/runtime-profile/translation-runtime-profile.ts";
import { translationProgramRuntimeProfileDescriptorV1 } from "../../programs/translation/runtime-profile/translation-runtime-profile-descriptor.ts";

describe("SillyOS fixed Browser Program runtime profiles", () => {
  it("loads the selected Creator and Translation Host implementations", async () => {
    const load = createBrowserProgramRuntimeProfileLoaderV1([
      [
        creatorProgramRuntimeProfileDescriptorV1,
        async () => creatorProgramRuntimeProfileImplementationV1,
      ],
      [
        translationProgramRuntimeProfileDescriptorV1,
        async () => translationProgramRuntimeProfileImplementationV1,
      ],
    ]);
    await expect(load(
      creatorProgramRuntimeProfileV1,
    )).resolves.toBe(creatorProgramRuntimeProfileImplementationV1);
    await expect(load(
      translationProgramRuntimeProfileV1,
    )).resolves.toBe(translationProgramRuntimeProfileImplementationV1);

    expect(creatorProgramRuntimeProfileImplementationV1.harnessToolIds).toEqual([
      "read",
      "write",
      "edit",
      "bash",
      "grep",
      "fetch_url",
      "download",
    ]);
    expect(translationProgramRuntimeProfileV1).toBe("agent.translation.v1");
    expect(translationProgramRuntimeProfileImplementationV1.harnessToolIds).toEqual([
      "program_resource",
      "read",
      "write",
      "edit",
      "grep",
    ]);
    expect(creatorProgramRuntimeProfileImplementationV1.packageDescriptor).toBe(
      creatorProgramRuntimeProfileDescriptorV1,
    );
    expect(translationProgramRuntimeProfileImplementationV1.packageDescriptor).toBe(
      translationProgramRuntimeProfileDescriptorV1,
    );
  });

  it("does not fall back for an unselected or unknown runtime profile", async () => {
    const load = createBrowserProgramRuntimeProfileLoaderV1([]);
    await expect(
      load("agent.translation.v2"),
    ).resolves.toBeNull();
    await expect(
      load("agent.unknown.v1"),
    ).resolves.toBeNull();
  });

  it("rejects duplicate registration and a mismatched loaded profile", async () => {
    expect(() =>
      createBrowserProgramRuntimeProfileLoaderV1([
        [
          creatorProgramRuntimeProfileDescriptorV1,
          async () => creatorProgramRuntimeProfileImplementationV1,
        ],
        [
          creatorProgramRuntimeProfileDescriptorV1,
          async () => creatorProgramRuntimeProfileImplementationV1,
        ],
      ])
    ).toThrow("invalid or duplicate Program runtime profile source");

    const load = createBrowserProgramRuntimeProfileLoaderV1([
      [
        creatorProgramRuntimeProfileDescriptorV1,
        async () => translationProgramRuntimeProfileImplementationV1,
      ],
    ]);
    await expect(load(creatorProgramRuntimeProfileV1)).rejects.toThrow(
      "Program runtime profile does not match its loader key",
    );
  });
});
