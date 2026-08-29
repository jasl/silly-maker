// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitBrowserPiEngineRequestV1,
  admitBrowserPiProviderCatalogWireV1,
  admitBrowserPiWorkerInboundMessageV1,
  admitBrowserPiWorkerOutboundMessageV1,
  admitBrowserPiWorkerWorkspaceOutboundMessageV1,
} from "../agent/browser-pi-worker-protocol.ts";
import { browserPiDistributionIdentityV1 } from "../agent/browser-pi-distribution.ts";
import { serializeCreatorAgentSubmitV1 } from "../product/creator-agent-admission.ts";

const programIdV1 = "program.workspace.preview.1";
const workspaceIdV1 = "workspace.preview.1";
const workspaceSessionIdV1 = "workspace.session.1";

const submitTextV1 = serializeCreatorAgentSubmitV1({
  revision: 1,
  proposalId: "workspace.preview.1.proposal.1",
  programId: programIdV1,
  baseProgramRevision: 1,
  text: "Create one reviewable artifact.",
});

const submitRecordV1 = {
  revision: 1,
  requestId: 7,
  method: "submit",
  params: { sessionId: "pi.session.1", text: submitTextV1 },
} as const;

const executionBindingV1 = {
  revision: 1,
  programId: programIdV1,
  workspaceId: workspaceIdV1,
  workspaceSessionId: workspaceSessionIdV1,
  expectedGeneration: 1,
} as const;

function rpcEnvelopeV1(record: unknown, execution?: unknown): Record<string, unknown> {
  return execution === undefined
    ? { revision: 1, kind: "rpc_request", requestId: 11, record }
    : { revision: 1, kind: "rpc_request", requestId: 11, record, execution };
}

function workspaceEnvelopeV1(record: unknown): Record<string, unknown> {
  return { revision: 1, kind: "workspace_request", requestId: 12, record };
}

function receiptV1(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    revision: 1,
    sequence: 1,
    programId: programIdV1,
    workspaceId: workspaceIdV1,
    workspaceSessionId: workspaceSessionIdV1,
    sessionId: "pi.session.1",
    runId: "pi.run.1",
    toolCallId: "pi.tool.write.1",
    tool: "write",
    expectedGeneration: 1,
    baseGeneration: 1,
    resultingGeneration: 2,
    outcome: "succeeded",
    effect: "changed",
    changedPaths: ["artifacts/program.md"],
    diagnosticCode: null,
    ...overrides,
  };
}

function snapshotV1(
  phase: "open" | "closed",
  receipts: readonly Record<string, unknown>[],
  generation = 2,
): Record<string, unknown> {
  return {
    revision: 1,
    phase,
    programId: programIdV1,
    workspaceId: workspaceIdV1,
    workspaceSessionId: workspaceSessionIdV1,
    generation,
    receipts,
  };
}

function catalogV1(): Record<string, unknown> {
  return {
    revision: 1,
    distribution: browserPiDistributionIdentityV1,
    providers: [
      {
        id: "openai",
        name: "OpenAI",
        baseUrl: "https://api.openai.com/v1",
        availability: "available",
        models: [{
          id: "gpt-4.1-nano",
          name: "GPT-4.1 nano",
          api: "openai-responses",
          baseUrl: "https://api.openai.com/v1",
          reasoning: false,
          input: ["text", "image"],
          contextWindow: 1_047_576,
          maxTokens: 32_768,
          availability: "available",
        }],
      },
      {
        id: "anthropic",
        name: "Anthropic",
        baseUrl: "https://api.anthropic.com",
        availability: "available",
        models: [{
          id: "claude-sonnet-4-5",
          name: "Claude Sonnet 4.5",
          api: "anthropic-messages",
          baseUrl: "https://api.anthropic.com",
          reasoning: true,
          input: ["text", "image"],
          contextWindow: 200_000,
          maxTokens: 64_000,
          availability: "available",
        }],
      },
    ],
  };
}

describe("Browser Pi Worker protocol", () => {
  it("admits pre-credential catalog and exact configure/test split", () => {
    expect(admitBrowserPiWorkerInboundMessageV1({
      revision: 1,
      kind: "catalog_request",
      requestId: 1,
    })).toEqual({ revision: 1, kind: "catalog_request", requestId: 1 });
    expect(admitBrowserPiWorkerInboundMessageV1({
      revision: 1,
      kind: "catalog_request",
      requestId: 1,
      credential: "forbidden",
    })).toBeNull();

    const live = {
      revision: 1,
      kind: "configure",
      requestId: 2,
      runtime: "pi_provider",
      selection: {
        kind: "builtin",
        providerId: "openai",
        modelId: "gpt-4.1-nano",
        api: "openai-responses",
        baseUrl: "https://api.openai.com/v1",
      },
      credential: { kind: "api_key", value: "sentinel" },
    } as const;
    expect(admitBrowserPiWorkerInboundMessageV1(live)).toEqual(live);
    const handoff = {
      ...live,
      credential: {
        kind: "vault_handoff",
        handoffId: "credential.handoff.1",
        binding: {
          bindingId: "builtin:openai",
          credentialKind: "api_key",
          baseUrl: "https://api.openai.com/v1",
        },
      },
    } as const;
    expect(admitBrowserPiWorkerInboundMessageV1(handoff)).toEqual(handoff);
    expect(admitBrowserPiWorkerInboundMessageV1({
      ...handoff,
      credential: { ...handoff.credential, recoveredKey: "must-not-cross-control-rpc" },
    })).toBeNull();
    expect(admitBrowserPiWorkerInboundMessageV1({
      ...handoff,
      credential: { ...handoff.credential, handoffId: "invalid handoff" },
    })).toBeNull();
    expect(admitBrowserPiWorkerInboundMessageV1({ ...live, selection: null })).toBeNull();
    expect(admitBrowserPiWorkerInboundMessageV1({
      ...live,
      selection: {
        ...live.selection,
        api: "forbidden",
      },
    })).toBeNull();

    const custom = {
      ...live,
      selection: {
        kind: "custom",
        profile: {
          profileId: "custom.openai-compatible",
          displayName: "Private gateway",
          api: "openai-completions",
          baseUrl: "https://llm.example.test/v1",
          modelId: "private-model",
          contextWindow: 32_768,
          maxTokens: 4_096,
        },
      },
    } as const;
    expect(admitBrowserPiWorkerInboundMessageV1(custom)).toEqual(custom);
    expect(admitBrowserPiWorkerInboundMessageV1({
      ...custom,
      selection: {
        ...custom.selection,
        profile: { ...custom.selection.profile, baseUrl: "https://llm.example.test" },
      },
    })).not.toBeNull();
    expect(admitBrowserPiWorkerInboundMessageV1({
      ...custom,
      selection: {
        ...custom.selection,
        profile: { ...custom.selection.profile, api: "url-inferred" },
      },
    })).toBeNull();
    for (
      const baseUrl of [
        "http://llm.example.test/v1",
        "https://user:secret@llm.example.test/v1",
        "https://llm.example.test/v1?tenant=one",
        "https://llm.example.test/v1#fragment",
        "https://LLM.example.test/v1",
        "https://llm.example.test/v1/",
      ]
    ) {
      expect(admitBrowserPiWorkerInboundMessageV1({
        ...custom,
        selection: {
          ...custom.selection,
          profile: { ...custom.selection.profile, baseUrl },
        },
      })).toBeNull();
    }
    expect(admitBrowserPiWorkerInboundMessageV1({
      ...custom,
      selection: {
        ...custom.selection,
        profile: { ...custom.selection.profile, maxTokens: 32_769 },
      },
    })).toBeNull();
    expect(admitBrowserPiWorkerInboundMessageV1({
      ...live,
      runtime: "deterministic_test",
      selection: null,
    })).not.toBeNull();
    expect(admitBrowserPiWorkerInboundMessageV1({
      revision: 1,
      kind: "test_connection",
      requestId: 3,
      selection: live.selection,
    })).toEqual({
      revision: 1,
      kind: "test_connection",
      requestId: 3,
      selection: live.selection,
    });
    expect(admitBrowserPiWorkerInboundMessageV1({
      revision: 1,
      kind: "test_connection",
      requestId: 3,
      credential: "forbidden",
    })).toBeNull();
    const selectModel = {
      revision: 1,
      kind: "select_model",
      requestId: 4,
      selection: {
        ...live.selection,
        modelId: "gpt-4.1-mini",
      },
    } as const;
    expect(admitBrowserPiWorkerInboundMessageV1(selectModel)).toEqual(selectModel);
    expect(admitBrowserPiWorkerInboundMessageV1({
      ...selectModel,
      credential: "forbidden",
    })).toBeNull();
    expect(admitBrowserPiWorkerOutboundMessageV1({
      revision: 1,
      kind: "configured",
      requestId: 2,
      runtime: live.runtime,
      selection: live.selection,
      distribution: browserPiDistributionIdentityV1,
    })).not.toBeNull();
    expect(admitBrowserPiWorkerOutboundMessageV1({
      revision: 1,
      kind: "connection_test_failure",
      requestId: 3,
      code: "connection_failed",
    })).not.toBeNull();
    expect(admitBrowserPiWorkerOutboundMessageV1({
      revision: 1,
      kind: "connection_test_failure",
      requestId: 3,
      code: "credential_invalid",
    })).toBeNull();
    expect(admitBrowserPiWorkerOutboundMessageV1({
      revision: 1,
      kind: "model_selected",
      requestId: 4,
      selection: selectModel.selection,
    })).toEqual({
      revision: 1,
      kind: "model_selected",
      requestId: 4,
      selection: selectModel.selection,
    });
    for (
      const code of [
        "not_configured",
        "selection_unavailable",
        "credential_scope_mismatch",
        "busy",
      ] as const
    ) {
      expect(admitBrowserPiWorkerOutboundMessageV1({
        revision: 1,
        kind: "model_selection_failure",
        requestId: 4,
        code,
      })).toEqual({ revision: 1, kind: "model_selection_failure", requestId: 4, code });
    }
    expect(admitBrowserPiWorkerOutboundMessageV1({
      revision: 1,
      kind: "model_selection_failure",
      requestId: 4,
      code: "credential_invalid",
    })).toBeNull();
  });

  it("admits only bounded catalog projections with derived Provider availability", () => {
    const catalog = catalogV1();
    expect(admitBrowserPiProviderCatalogWireV1(catalog)).toMatchObject({
      providers: [
        { id: "openai", availability: "available" },
        { id: "anthropic", availability: "available" },
      ],
    });
    expect(admitBrowserPiWorkerOutboundMessageV1({
      revision: 1,
      kind: "catalog_response",
      requestId: 1,
      ok: true,
      catalog,
    })).not.toBeNull();

    const providers = catalog.providers as Record<string, unknown>[];
    const openAi = providers[0] as Record<string, unknown>;
    expect(admitBrowserPiProviderCatalogWireV1({
      ...catalog,
      providers: [{ ...openAi, availability: "unavailable" }, providers[1]],
    })).toBeNull();
    const models = openAi.models as Record<string, unknown>[];
    expect(admitBrowserPiProviderCatalogWireV1({
      ...catalog,
      providers: [{ ...openAi, models: [{ ...models[0], api: "" }] }, providers[1]],
    })).toBeNull();
    expect(admitBrowserPiProviderCatalogWireV1({
      ...catalog,
      providers: [{ ...openAi, models: [models[0], models[0]] }, providers[1]],
    })).toBeNull();
  });

  it("keeps start/cancel inner admission and adds execution only beside valid submit", () => {
    const start = { revision: 1, requestId: 1, method: "start" };
    const cancel = {
      revision: 1,
      requestId: 2,
      method: "cancel",
      params: { sessionId: "pi.session.1", runId: "pi.run.1" },
    };
    expect(admitBrowserPiEngineRequestV1(start)?.method).toBe("start");
    expect(admitBrowserPiEngineRequestV1(cancel)?.method).toBe("cancel");
    expect(admitBrowserPiWorkerInboundMessageV1(rpcEnvelopeV1(start))).not.toBeNull();
    expect(admitBrowserPiWorkerInboundMessageV1(rpcEnvelopeV1(cancel))).not.toBeNull();

    const admitted = admitBrowserPiWorkerInboundMessageV1(
      rpcEnvelopeV1(submitRecordV1, executionBindingV1),
    );
    expect(admitted).toMatchObject({
      kind: "rpc_request",
      record: submitRecordV1,
      execution: executionBindingV1,
    });
    if (admitted?.kind === "rpc_request") expect(admitted.record).toBe(submitRecordV1);

    expect(admitBrowserPiWorkerInboundMessageV1(rpcEnvelopeV1(submitRecordV1))).toBeNull();
    expect(
      admitBrowserPiWorkerInboundMessageV1(
        rpcEnvelopeV1(submitRecordV1, { ...executionBindingV1, programId: "program.other" }),
      ),
    ).toBeNull();
    expect(
      admitBrowserPiWorkerInboundMessageV1(
        rpcEnvelopeV1(submitRecordV1, { ...executionBindingV1, provider: "forbidden" }),
      ),
    ).toBeNull();
    expect(admitBrowserPiWorkerInboundMessageV1(rpcEnvelopeV1(start, executionBindingV1)))
      .toBeNull();

    const invalidInner = { ...submitRecordV1, unexpected: true };
    expect(admitBrowserPiEngineRequestV1(invalidInner)).toBeNull();
    expect(admitBrowserPiWorkerInboundMessageV1(rpcEnvelopeV1(invalidInner))).not.toBeNull();
  });

  it("admits exact Workspace lifecycle, network access replacement, and acknowledgement requests", () => {
    expect(
      admitBrowserPiWorkerInboundMessageV1(
        workspaceEnvelopeV1({
          method: "attach_workspace",
          descriptor: executionBindingV1,
        }),
      ),
    ).toMatchObject({ kind: "workspace_request", record: { method: "attach_workspace" } });
    for (const method of ["close_workspace", "query_workspace"] as const) {
      expect(
        admitBrowserPiWorkerInboundMessageV1(
          workspaceEnvelopeV1({ method, workspaceSessionId: workspaceSessionIdV1 }),
        ),
      ).toMatchObject({ kind: "workspace_request", record: { method } });
    }
    expect(
      admitBrowserPiWorkerInboundMessageV1(
        workspaceEnvelopeV1({
          method: "acknowledge_workspace_receipts",
          workspaceSessionId: workspaceSessionIdV1,
          throughSequence: 3,
        }),
      ),
    ).toMatchObject({
      kind: "workspace_request",
      record: { method: "acknowledge_workspace_receipts", throughSequence: 3 },
    });
    const replaceNetworkAccess = {
      method: "replace_network_access",
      programId: programIdV1,
      workspaceSessionId: workspaceSessionIdV1,
      enabled: true,
    } as const;
    expect(
      admitBrowserPiWorkerInboundMessageV1(workspaceEnvelopeV1(replaceNetworkAccess)),
    ).toEqual(expect.objectContaining({
      kind: "workspace_request",
      record: replaceNetworkAccess,
    }));
    expect(
      admitBrowserPiWorkerInboundMessageV1(
        workspaceEnvelopeV1({ ...replaceNetworkAccess, enabled: false }),
      ),
    ).toMatchObject({ record: { method: "replace_network_access", enabled: false } });

    expect(
      admitBrowserPiWorkerInboundMessageV1(
        workspaceEnvelopeV1({
          method: "acknowledge_workspace_receipts",
          workspaceSessionId: workspaceSessionIdV1,
          throughSequence: 0,
        }),
      ),
    ).toBeNull();
    expect(
      admitBrowserPiWorkerInboundMessageV1(
        workspaceEnvelopeV1({
          method: "query_workspace",
          workspaceSessionId: workspaceSessionIdV1,
          provider: "forbidden",
        }),
      ),
    ).toBeNull();
    for (
      const invalid of [
        { ...replaceNetworkAccess, enabled: "true" },
        { ...replaceNetworkAccess, enabled: 1 },
        { ...replaceNetworkAccess, credential: "forbidden" },
      ]
    ) {
      expect(
        admitBrowserPiWorkerInboundMessageV1(workspaceEnvelopeV1(invalid)),
      ).toBeNull();
    }
  });

  it("admits close-retained snapshots and only acknowledgements that removed a prefix", () => {
    const first = receiptV1();
    const second = receiptV1({
      sequence: 2,
      toolCallId: "pi.tool.write.2",
      baseGeneration: 2,
      resultingGeneration: 3,
    });
    const closed = snapshotV1("closed", [first, second], 3);
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        revision: 1,
        kind: "workspace_response",
        requestId: 20,
        ok: true,
        response: { method: "close_workspace", snapshot: closed },
      }),
    ).toMatchObject({
      response: { snapshot: { phase: "closed", receipts: [{ sequence: 1 }, { sequence: 2 }] } },
    });
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        revision: 1,
        kind: "workspace_response",
        requestId: 21,
        ok: true,
        response: { method: "query_workspace", snapshot: closed },
      }),
    ).not.toBeNull();
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        revision: 1,
        kind: "workspace_response",
        requestId: 25,
        ok: true,
        response: { method: "replace_network_access", snapshot: snapshotV1("open", [], 3) },
      }),
    ).not.toBeNull();
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        revision: 1,
        kind: "workspace_response",
        requestId: 26,
        ok: true,
        response: { method: "replace_network_access", snapshot: closed },
      }),
    ).toBeNull();
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        revision: 1,
        kind: "workspace_response",
        requestId: 27,
        ok: true,
        response: {
          method: "replace_network_access",
          snapshot: snapshotV1("open", [], 3),
          enabled: true,
        },
      }),
    ).toBeNull();
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        revision: 1,
        kind: "workspace_response",
        requestId: 22,
        ok: true,
        response: {
          method: "acknowledge_workspace_receipts",
          throughSequence: 1,
          snapshot: snapshotV1("closed", [second], 3),
        },
      }),
    ).not.toBeNull();
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        revision: 1,
        kind: "workspace_response",
        requestId: 23,
        ok: true,
        response: {
          method: "acknowledge_workspace_receipts",
          throughSequence: 1,
          snapshot: closed,
        },
      }),
    ).toBeNull();

    const nonContiguous = snapshotV1("closed", [first, { ...second, sequence: 3 }], 3);
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        revision: 1,
        kind: "workspace_response",
        requestId: 24,
        ok: true,
        response: { method: "query_workspace", snapshot: nonContiguous },
      }),
    ).toBeNull();
  });

  it("admits raw receipts with transient Pi correlation and rejects product or payload data", () => {
    const event = {
      revision: 1,
      kind: "workspace_receipt",
      receipt: receiptV1(),
    };
    const admitted = admitBrowserPiWorkerWorkspaceOutboundMessageV1(event);
    expect(admitted).toMatchObject({
      kind: "workspace_receipt",
      receipt: {
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId: workspaceSessionIdV1,
        sessionId: "pi.session.1",
        runId: "pi.run.1",
        toolCallId: "pi.tool.write.1",
      },
    });
    expect(JSON.stringify(admitted)).not.toContain("agentRunId");

    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        ...event,
        receipt: receiptV1({ tool: "edit", toolCallId: "pi.tool.edit.1" }),
      }),
    ).toMatchObject({ receipt: { tool: "edit", toolCallId: "pi.tool.edit.1" } });
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        ...event,
        receipt: receiptV1({
          tool: "bash",
          toolCallId: "pi.tool.bash.1",
          resultingGeneration: 3,
          changedPaths: ["artifact.txt", "logs/bash.log"],
        }),
      }),
    ).toMatchObject({
      receipt: {
        tool: "bash",
        toolCallId: "pi.tool.bash.1",
        resultingGeneration: 3,
        changedPaths: ["artifact.txt", "logs/bash.log"],
      },
    });
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        ...event,
        receipt: receiptV1({
          tool: "download",
          toolCallId: "pi.tool.download.1",
          changedPaths: ["assets/archive.zip"],
        }),
      }),
    ).toMatchObject({
      receipt: {
        tool: "download",
        toolCallId: "pi.tool.download.1",
        changedPaths: ["assets/archive.zip"],
      },
    });
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        ...event,
        receipt: receiptV1({ tool: "read", effect: "none", changedPaths: [] }),
      }),
    ).toBeNull();

    for (const forbidden of ["agentRunId", "content", "args", "provider"] as const) {
      expect(
        admitBrowserPiWorkerWorkspaceOutboundMessageV1({
          ...event,
          receipt: receiptV1({ [forbidden]: "forbidden" }),
        }),
      ).toBeNull();
    }
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        ...event,
        receipt: receiptV1({ outcome: "failed", diagnosticCode: "scope_busy" }),
      }),
    ).toBeNull();
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        ...event,
        receipt: receiptV1({ outcome: "stale", diagnosticCode: "generation_stale" }),
      }),
    ).toBeNull();
  });

  it("enforces generation effects and the bounded normalized changed path", () => {
    const event = { revision: 1, kind: "workspace_receipt" };
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        ...event,
        receipt: receiptV1({ effect: "none", changedPaths: [], resultingGeneration: 1 }),
      }),
    ).not.toBeNull();
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        ...event,
        receipt: receiptV1({
          tool: "download",
          toolCallId: "pi.tool.download.same-bytes",
          effect: "none",
          changedPaths: [],
          resultingGeneration: 1,
        }),
      }),
    ).not.toBeNull();
    for (
      const invalidReceipt of [
        receiptV1({ resultingGeneration: 1 }),
        receiptV1({ effect: "none", changedPaths: ["artifact.md"], resultingGeneration: 1 }),
        receiptV1({ changedPaths: ["../artifact.md"] }),
        receiptV1({ changedPaths: ["a".repeat(513)] }),
        receiptV1({ changedPaths: [Array.from({ length: 33 }, () => "a").join("/")] }),
        receiptV1({ expectedGeneration: 2, baseGeneration: 1 }),
      ]
    ) {
      expect(
        admitBrowserPiWorkerWorkspaceOutboundMessageV1({ ...event, receipt: invalidReceipt }),
      ).toBeNull();
    }
  });

  it("admits bounded unique multi-path bash effects without relaxing write or edit", () => {
    const event = { revision: 1, kind: "workspace_receipt" };
    const paths = Array.from({ length: 64 }, (_, index) => `artifacts/bash-${String(index)}.txt`);
    const bashReceipt = receiptV1({
      tool: "bash",
      toolCallId: "pi.tool.bash.1",
      resultingGeneration: 129,
      changedPaths: paths,
    });
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({ ...event, receipt: bashReceipt }),
    ).toMatchObject({
      receipt: { tool: "bash", baseGeneration: 1, resultingGeneration: 129, changedPaths: paths },
    });
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        ...event,
        receipt: receiptV1({
          tool: "bash",
          toolCallId: "pi.tool.bash.read-only",
          effect: "none",
          resultingGeneration: 1,
          changedPaths: [],
        }),
      }),
    ).not.toBeNull();

    for (
      const invalidReceipt of [
        receiptV1({ tool: "write", changedPaths: ["one", "two"], resultingGeneration: 3 }),
        receiptV1({ tool: "edit", changedPaths: ["one"], resultingGeneration: 3 }),
        receiptV1({
          tool: "bash",
          changedPaths: [...paths, "artifacts/bash-65.txt"],
          resultingGeneration: 66,
        }),
        receiptV1({ tool: "bash", changedPaths: ["same", "same"], resultingGeneration: 3 }),
        receiptV1({ tool: "bash", changedPaths: ["../escape"], resultingGeneration: 2 }),
        receiptV1({ tool: "bash", changedPaths: ["artifact"], resultingGeneration: 130 }),
        receiptV1({
          tool: "bash",
          effect: "changed",
          changedPaths: [],
          resultingGeneration: 1,
        }),
        receiptV1({
          tool: "bash",
          effect: "none",
          changedPaths: ["artifact"],
          resultingGeneration: 1,
        }),
        receiptV1({
          tool: "bash",
          effect: "none",
          changedPaths: [],
          resultingGeneration: 2,
        }),
      ]
    ) {
      expect(
        admitBrowserPiWorkerWorkspaceOutboundMessageV1({ ...event, receipt: invalidReceipt }),
      ).toBeNull();
    }
  });
});
