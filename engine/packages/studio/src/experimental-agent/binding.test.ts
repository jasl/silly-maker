// SPDX-License-Identifier: MIT
import type { AgentSessionClientV1 } from "@sillymaker/agent/session";
import { describe, expect, it } from "vitest";

import { admitExperimentalEmbeddedAgentBindingInternalV1 } from "./binding.ts";

function unusedClientV1(): AgentSessionClientV1 {
  throw new Error("The binding admission test does not create a client.");
}

describe("Experimental embedded Agent binding admission", () => {
  it("admits product-owned action catalogs beyond the historical count ceiling", () => {
    const sceneActions = Object.fromEntries(
      Array.from({ length: 33 }, (_, index) => [
        `action.test.${String(index).padStart(2, "0")}`,
        {
          schemaRevision: 2,
          kind: "scene.object.set_appearance",
          objectId: "tag.test.hero",
          key: "expression",
          value: `expression-${String(index)}`,
        },
      ]),
    );

    const binding = admitExperimentalEmbeddedAgentBindingInternalV1({
      configurationId: "agent.test.binding",
      createClient: unusedClientV1,
      sceneActions,
    });

    expect(binding.allowedActionIds).toHaveLength(Object.keys(sceneActions).length);
    expect(Object.keys(binding.sceneActions)).toEqual(binding.allowedActionIds);
  });

  it("still rejects an empty action catalog", () => {
    expect(() =>
      admitExperimentalEmbeddedAgentBindingInternalV1({
        configurationId: "agent.test.binding",
        createClient: unusedClientV1,
        sceneActions: {},
      })
    ).toThrowError(/must contain string keys/u);
  });
});
