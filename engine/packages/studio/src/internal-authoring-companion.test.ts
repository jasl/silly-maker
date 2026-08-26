// SPDX-License-Identifier: MIT
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  defineEmbeddedAuthoringCompanionInternalV1,
  type EmbeddedAuthoringCompanionDefinitionInternalV1,
} from "@sillymaker/studio/internal/authoring-companion";
import * as authoringCompanionEntryV1 from "@sillymaker/studio/internal/authoring-companion";

import type { InspectorBindingV1 } from "./core/binding.ts";
import { resolveEmbeddedAuthoringCompanionInternalV1 } from "./core/embedded-authoring-companion.ts";

describe("workspace-private Authoring companion entry", () => {
  it("decorates one binding without exposing companion resolution", () => {
    const binding = {} as InspectorBindingV1;
    const owner = { dispose: vi.fn(() => Promise.resolve()) };
    const definition: EmbeddedAuthoringCompanionDefinitionInternalV1 = {
      compatibilityId: "test.authoring-companion.v1",
      contentSignature: "test-content-v1",
      surfacePlacement: "replace-inspector",
      createOwner: () => owner,
      render: () => createElement("div", null, "Product authoring companion"),
    };

    expect(defineEmbeddedAuthoringCompanionInternalV1(binding, definition)).toBe(binding);
    expect(resolveEmbeddedAuthoringCompanionInternalV1(binding)).toBe(definition);
    expect(authoringCompanionEntryV1).not.toHaveProperty(
      "resolveEmbeddedAuthoringCompanionInternalV1",
    );
    expect(() => defineEmbeddedAuthoringCompanionInternalV1(binding, definition)).toThrow(
      "Inspector binding already has an embedded Authoring companion",
    );
  });
});
