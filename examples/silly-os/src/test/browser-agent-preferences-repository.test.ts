// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  browserAgentPreferencesStorageKeyV1,
  BrowserAgentPreferencesRepositoryErrorV1,
  createBrowserAgentPreferencesRepositoryV1,
  defaultBrowserAgentReasoningEffortV1,
  type BrowserAgentPreferencesStorageV1,
} from "../application/preferences/browser-agent-preferences-repository.ts";

function memoryStorageV1(initial?: string): BrowserAgentPreferencesStorageV1 {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(browserAgentPreferencesStorageKeyV1, initial);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe("Browser Agent preferences repository", () => {
  it("defaults to medium without writing storage", () => {
    const storage = memoryStorageV1();
    const repository = createBrowserAgentPreferencesRepositoryV1({ storage });

    expect(repository.read()).toEqual({
      revision: 1,
      preferredReasoningEffort: defaultBrowserAgentReasoningEffortV1,
    });
    expect(storage.getItem(browserAgentPreferencesStorageKeyV1)).toBeNull();
    expect(Object.isFrozen(repository.read())).toBe(true);
  });

  it("persists one global non-secret preferred effort and clears it", () => {
    const storage = memoryStorageV1();
    const repository = createBrowserAgentPreferencesRepositoryV1({ storage });

    expect(repository.setPreferredReasoningEffort("high")).toBe("high");
    expect(repository.read().preferredReasoningEffort).toBe("high");

    repository.clear();
    expect(repository.read().preferredReasoningEffort).toBe("medium");
  });

  it("rejects unknown effort values and non-exact stored records", () => {
    const storage = memoryStorageV1();
    const repository = createBrowserAgentPreferencesRepositoryV1({ storage });

    expect(() => repository.setPreferredReasoningEffort("ultra"))
      .toThrowError(BrowserAgentPreferencesRepositoryErrorV1);

    storage.setItem(
      browserAgentPreferencesStorageKeyV1,
      JSON.stringify({ revision: 1, preferredReasoningEffort: "medium", extra: true }),
    );
    expect(() => repository.read()).toThrowError(
      expect.objectContaining({ code: "schema_invalid", operation: "read" }),
    );
  });

  it("reports storage failures without silently claiming persistence", () => {
    const unavailable: BrowserAgentPreferencesStorageV1 = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const repository = createBrowserAgentPreferencesRepositoryV1({ storage: unavailable });

    expect(() => repository.setPreferredReasoningEffort("low")).toThrowError(
      expect.objectContaining({ code: "storage_unavailable", operation: "set" }),
    );
    expect(() => repository.clear()).toThrowError(
      expect.objectContaining({ code: "storage_unavailable", operation: "clear" }),
    );
  });
});
