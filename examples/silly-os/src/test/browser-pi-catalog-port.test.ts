// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { queryBrowserPiProviderCatalogV1 } from "../agent/browser-pi-catalog-port.ts";
import { browserPiSingleSecretProviderIdsV1 } from "../agent/browser-pi-browser-compatibility.ts";
import type { BrowserPiWorkerLikeV1 } from "../agent/browser-pi-transport.ts";
import { createBrowserPiWorkerRuntimeV1 } from "../agent/browser-pi-worker-runtime.ts";

type MessageListenerV1 = (event: { readonly data: unknown }) => void;
type ErrorListenerV1 = (event: unknown) => void;

class CatalogRuntimeWorkerV1 implements BrowserPiWorkerLikeV1 {
  readonly posted: unknown[] = [];
  terminated = false;
  private readonly messages = new Set<MessageListenerV1>();
  private readonly errors = new Set<ErrorListenerV1>();
  private readonly runtime = createBrowserPiWorkerRuntimeV1({
    expectedEndpointOrigin: null,
    providerFetch: fetch,
    postMessage: (message) => {
      for (const listener of [...this.messages]) {
        listener({ data: structuredClone(message) });
      }
    },
  });

  postMessage(message: unknown): void {
    this.posted.push(structuredClone(message));
    this.runtime.receive(message);
  }

  addEventListener(
    type: "message" | "error",
    listener: MessageListenerV1 | ErrorListenerV1,
  ): void {
    if (type === "message") this.messages.add(listener as MessageListenerV1);
    else this.errors.add(listener as ErrorListenerV1);
  }

  removeEventListener(
    type: "message" | "error",
    listener: MessageListenerV1 | ErrorListenerV1,
  ): void {
    if (type === "message") this.messages.delete(listener as MessageListenerV1);
    else this.errors.delete(listener as ErrorListenerV1);
  }

  terminate(): void {
    this.terminated = true;
    this.runtime.dispose();
    this.messages.clear();
    this.errors.clear();
  }
}

class InvalidCatalogWorkerV1 implements BrowserPiWorkerLikeV1 {
  terminated = false;
  private readonly messages = new Set<MessageListenerV1>();
  private readonly errors = new Set<ErrorListenerV1>();

  postMessage(): void {
    for (const listener of [...this.messages]) {
      listener({ data: { revision: 1, kind: "catalog_response", requestId: 1, ok: true } });
    }
  }

  addEventListener(
    type: "message" | "error",
    listener: MessageListenerV1 | ErrorListenerV1,
  ): void {
    if (type === "message") this.messages.add(listener as MessageListenerV1);
    else this.errors.add(listener as ErrorListenerV1);
  }

  removeEventListener(
    type: "message" | "error",
    listener: MessageListenerV1 | ErrorListenerV1,
  ): void {
    if (type === "message") this.messages.delete(listener as MessageListenerV1);
    else this.errors.delete(listener as ErrorListenerV1);
  }

  terminate(): void {
    this.terminated = true;
    this.messages.clear();
    this.errors.clear();
  }
}

describe("SillyOS Browser Pi catalog port", () => {
  it("queries without credentials, admits the Pi projection, and terminates its Worker", async () => {
    const worker = new CatalogRuntimeWorkerV1();
    const result = await queryBrowserPiProviderCatalogV1({ workerFactory: () => worker });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") throw new Error("expected catalog");
    expect(result.catalog.providers).toHaveLength(40);
    expect(result.catalog.providers.flatMap(({ models }) => models)).toHaveLength(1_312);
    const availableProviders = result.catalog.providers.filter(({ availability }) =>
      availability === "available"
    );
    expect(availableProviders.map(({ id }) => id).sort()).toEqual(
      [...browserPiSingleSecretProviderIdsV1].sort(),
    );
    const availableModels = result.catalog.providers.flatMap((provider) =>
      provider.models.filter(({ availability }) => availability === "available").map((model) =>
        `${provider.id}/${model.id}`
      )
    );
    expect(availableModels).toHaveLength(1_032);
    expect(availableModels).toEqual(expect.arrayContaining([
      "anthropic/claude-sonnet-4-5",
      "deepseek/deepseek-v4-pro",
      "google/gemini-2.5-pro",
      "openai/gpt-4.1-mini",
      "openrouter/google/gemini-2.5-flash",
      "xai/grok-4.5",
    ]));
    expect(
      result.catalog.providers.flatMap((provider) => provider.models).filter(({ availability }) =>
        availability === "unavailable"
      ),
    ).toHaveLength(280);
    expect(result.catalog.providers.find(({ id }) => id === "mistral")?.availability).toBe(
      "unavailable",
    );
    expect(worker.posted).toEqual([{ revision: 1, kind: "catalog_request", requestId: 1 }]);
    expect(JSON.stringify(worker.posted)).not.toContain("credential");
    expect(worker.terminated).toBe(true);
  });

  it("rejects an invalid Worker projection and always terminates", async () => {
    const worker = new InvalidCatalogWorkerV1();
    await expect(
      queryBrowserPiProviderCatalogV1({ workerFactory: () => worker }),
    ).resolves.toEqual({ kind: "unavailable", code: "protocol_invalid" });
    expect(worker.terminated).toBe(true);

    await expect(queryBrowserPiProviderCatalogV1({
      workerFactory: () => {
        throw new Error("worker unavailable");
      },
    })).resolves.toEqual({ kind: "unavailable", code: "worker_failed" });
  });
});
