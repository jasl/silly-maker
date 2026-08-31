// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { translationBundledProgramPackageV1 } from "../agent/bundled-program-packages/translation-current.ts";
import {
  browserWorkspaceQuickJsRuntimeAllocatorLimitBytesV1,
  browserWorkspaceQuickJsStackLimitBytesV1,
  browserWorkspaceQuickJsWasmLinearMemoryBytesV1,
  type BrowserWorkspaceQuickJsRequestV1,
} from "../workspace/browser-workspace-quickjs-protocol.ts";
import { browserWorkspaceSandboxArtifactBuildIdentityV1 } from "../workspace/browser-workspace-sandbox-build-identity.ts";
import { executeBrowserWorkspaceQuickJsV1 } from "../workspace-sandbox/browser-workspace-quickjs.worker.ts";
import {
  createBundledTranslationProgramDefinitionRevisionV1,
} from "../product/translation/translation-program-definition.ts";

describe("SillyOS Translation Program fixed-harness contract", () => {
  it("preserves the existing rev1 compatibility marker without claiming an unselected profile", () => {
    const definition = createBundledTranslationProgramDefinitionRevisionV1();

    expect(definition).toEqual({
      schemaVersion: 1,
      programId: "sillyos.builtin.translation",
      revision: 1,
      kind: "translation",
      name: "Translation",
      purpose: "Translate one admitted Process Workspace.",
      harnessReference: "sillyos.harness.translation@1",
      capabilityIds: [],
    });
    expect(translationBundledProgramPackageV1.reference).toBe(definition.harnessReference);

    // Runtime availability is not the same as Process tool authority.
    expect(translationBundledProgramPackageV1.harnessToolIds).toEqual([]);
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
