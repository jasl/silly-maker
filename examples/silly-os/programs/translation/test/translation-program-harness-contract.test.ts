// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { translationProgramRuntimeProfileImplementationV1 } from "../runtime-profile/translation-runtime-profile.ts";
import { translationProgramIdV1 } from "../distribution/bundled-package-source.ts";
import { translationProgramRuntimeProfileV1 } from "../runtime-profile/translation-runtime-profile.ts";
import {
  browserWorkspaceQuickJsRuntimeAllocatorLimitBytesV1,
  browserWorkspaceQuickJsStackLimitBytesV1,
  browserWorkspaceQuickJsWasmLinearMemoryBytesV1,
  type BrowserWorkspaceQuickJsRequestV1,
} from "../../../src/workspace/browser-workspace-quickjs-protocol.ts";
import { browserWorkspaceSandboxArtifactBuildIdentityV1 } from "../../../src/workspace/browser-workspace-sandbox-build-identity.ts";
import { executeBrowserWorkspaceQuickJsV1 } from "../../../src/workspace-sandbox/browser-workspace-quickjs.worker.ts";
describe("SillyOS Translation Program fixed-harness contract", () => {
  it("keeps the package identity separate from its selected Host runtime profile", () => {
    expect(translationProgramIdV1).toBe("sillyos.translation");
    expect(translationProgramRuntimeProfileV1).toBe("agent.translation.v1");
    expect(translationProgramRuntimeProfileImplementationV1.runtimeProfile).toBe(
      translationProgramRuntimeProfileV1,
    );

    // Translation currently needs no package-specific workspace tool. Generic
    // exact-package script staging and QuickJS execution remain platform
    // capabilities and are covered independently below and in the platform tests.
    expect(translationProgramRuntimeProfileImplementationV1.harnessToolIds).toEqual([]);
  });

  it("executes the required regular-expression forms in the fixed QuickJS runtime", async () => {
    const source = `
      const values = {
        ordinary: "cat cat".match(/cat/g).length,
        unicode: /^\\p{L}+$/u.test("猫咪"),
        lookbehind: /(?<=ID:)\\d+/u.exec("ID:42")[0],
        named: /(?<speaker>[^:]+):(?<line>.+)/u.exec("Mochi:hello").groups.speaker,
      };
      print(JSON.stringify(values));
    `;
    const request: BrowserWorkspaceQuickJsRequestV1 = {
      revision: 1,
      kind: "quickjs_execute",
      requestId: 1,
      buildIdentity: browserWorkspaceSandboxArtifactBuildIdentityV1,
      source,
      argv: [],
      stdin: "",
      files: [{ path: "/workspace/script.js", text: source }],
    };

    const result = await executeBrowserWorkspaceQuickJsV1(request);

    expect(JSON.parse(result.response.stdout)).toEqual({
      ordinary: 2,
      unicode: true,
      lookbehind: "42",
      named: "Mochi",
    });
    expect(result.response.runtimeAllocatorLimitBytes).toBe(
      browserWorkspaceQuickJsRuntimeAllocatorLimitBytesV1,
    );
    expect(result.response.wasmLinearMemoryBytes).toBe(
      browserWorkspaceQuickJsWasmLinearMemoryBytesV1,
    );
    expect(result.response.stackLimitBytes).toBe(browserWorkspaceQuickJsStackLimitBytesV1);
  });
});
