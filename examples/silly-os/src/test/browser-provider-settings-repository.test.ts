// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitBrowserProviderCustomProfileV1,
  browserProviderBaseUrlMaximumUtf8BytesV1,
  browserProviderContextWindowMaximumV1,
  browserProviderCustomApiFamiliesV1,
  browserProviderMaxTokensMaximumV1,
  browserProviderSettingsMaximumProfilesV1,
  browserProviderSettingsStorageKeyV1,
  canonicalizeBrowserProviderBaseUrlV1,
  createBrowserProviderSettingsRepositoryV1,
  type BrowserProviderCustomProfileV1,
} from "../product/browser-provider-settings-repository.ts";

class MemoryStorageV1 implements Storage {
  readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function profileV1(
  overrides: Partial<BrowserProviderCustomProfileV1> = {},
): BrowserProviderCustomProfileV1 {
  return {
    profileId: "custom.openai",
    displayName: "Team gateway",
    api: "openai-responses",
    baseUrl: "https://llm.example.test/v1",
    modelId: "team-model-1",
    contextWindow: 128_000,
    maxTokens: 8_192,
    ...overrides,
  };
}

describe("Browser Provider Settings profile admission", () => {
  it("admits each explicit Pi API family and canonicalizes only the HTTPS base URL", () => {
    for (const api of browserProviderCustomApiFamiliesV1) {
      const result = admitBrowserProviderCustomProfileV1(profileV1({
        profileId: `custom.${api}`,
        displayName: "  Custom endpoint  ",
        api,
        baseUrl: "HTTPS://LLM.Example.Test:443/v1///",
      }));
      expect(result).toEqual({
        kind: "admitted",
        value: {
          ...profileV1(),
          profileId: `custom.${api}`,
          displayName: "Custom endpoint",
          api,
        },
      });
    }
  });

  it("rejects URL credentials, query, fragment, public HTTP, and non-URL text", () => {
    expect(canonicalizeBrowserProviderBaseUrlV1("https://user@example.test/v1")).toBeNull();
    expect(canonicalizeBrowserProviderBaseUrlV1("https://user:pass@example.test/v1"))
      .toBeNull();
    expect(canonicalizeBrowserProviderBaseUrlV1("https://example.test/v1?mode=chat"))
      .toBeNull();
    expect(canonicalizeBrowserProviderBaseUrlV1("https://example.test/v1#models")).toBeNull();
    expect(canonicalizeBrowserProviderBaseUrlV1("http://example.test/v1")).toBeNull();
    expect(canonicalizeBrowserProviderBaseUrlV1("not a URL")).toBeNull();
    expect(
      canonicalizeBrowserProviderBaseUrlV1(
        `https://example.test/${"a".repeat(browserProviderBaseUrlMaximumUtf8BytesV1)}`,
      ),
    ).toBeNull();
  });

  it("rejects unknown fields, including every attempted credential field", () => {
    for (const secretField of ["apiKey", "key", "credential", "authorization"] as const) {
      expect(admitBrowserProviderCustomProfileV1({
        ...profileV1(),
        [secretField]: "secret-value",
      })).toEqual({ kind: "rejected", path: "$" });
    }
  });

  it("rejects getters without reading them", () => {
    let reads = 0;
    const candidate = { ...profileV1() } as Record<string, unknown>;
    Object.defineProperty(candidate, "displayName", {
      enumerable: true,
      get() {
        reads += 1;
        return "Getter endpoint";
      },
    });
    expect(admitBrowserProviderCustomProfileV1(candidate)).toEqual({
      kind: "rejected",
      path: "$",
    });
    expect(reads).toBe(0);
  });

  it("enforces stable identifiers, bounded text, and declared model ceilings", () => {
    const invalid = [
      profileV1({ profileId: "Custom Endpoint" }),
      profileV1({ displayName: "\u0000endpoint" }),
      profileV1({ api: "openai-chat" as BrowserProviderCustomProfileV1["api"] }),
      profileV1({ modelId: " model" }),
      profileV1({ contextWindow: 0 }),
      profileV1({ contextWindow: browserProviderContextWindowMaximumV1 + 1 }),
      profileV1({ maxTokens: 0 }),
      profileV1({ maxTokens: browserProviderMaxTokensMaximumV1 + 1 }),
      profileV1({ contextWindow: 4_096, maxTokens: 8_192 }),
    ];
    for (const candidate of invalid) {
      expect(admitBrowserProviderCustomProfileV1(candidate).kind).toBe("rejected");
    }
  });
});

describe("Browser Provider Settings repository", () => {
  it("persists only a versioned, sorted, non-secret profile projection", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    const mutable = {
      ...profileV1({
        profileId: "z.endpoint",
        displayName: "  Z endpoint  ",
        baseUrl: "https://z.example.test/v1/",
      }),
    };
    expect(repository.add(mutable)).toEqual({
      ...mutable,
      displayName: "Z endpoint",
      baseUrl: "https://z.example.test/v1",
    });
    repository.add(profileV1({ profileId: "a.endpoint", displayName: "A endpoint" }));

    const serialized = storage.getItem(browserProviderSettingsStorageKeyV1);
    expect(serialized).not.toBeNull();
    expect(serialized).not.toContain("secret");
    expect(JSON.parse(serialized ?? "null")).toEqual({
      revision: 1,
      customProfiles: [
        profileV1({ profileId: "a.endpoint", displayName: "A endpoint" }),
        {
          ...mutable,
          displayName: "Z endpoint",
          baseUrl: "https://z.example.test/v1",
        },
      ],
    });

    mutable.displayName = "mutated after add";
    const reopened = createBrowserProviderSettingsRepositoryV1({ storage });
    const listed = reopened.list();
    expect(listed.map(({ profileId }) => profileId)).toEqual(["a.endpoint", "z.endpoint"]);
    expect(listed[1]?.displayName).toBe("Z endpoint");
    expect(Object.isFrozen(listed)).toBe(true);
    expect(Object.isFrozen(listed[0])).toBe(true);
  });

  it("rejects duplicate ids and applies the small profile count limit atomically", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    repository.add(profileV1());
    expect(() => repository.add(profileV1({ displayName: "Duplicate" }))).toThrowError(
      expect.objectContaining({ code: "profile_exists", operation: "add" }),
    );

    for (let index = 1; index < browserProviderSettingsMaximumProfilesV1; index += 1) {
      repository.add(profileV1({ profileId: `custom.endpoint-${String(index)}` }));
    }
    const before = storage.getItem(browserProviderSettingsStorageKeyV1);
    expect(() => repository.add(profileV1({ profileId: "custom.too-many" }))).toThrowError(
      expect.objectContaining({ code: "profile_limit", operation: "add" }),
    );
    expect(storage.getItem(browserProviderSettingsStorageKeyV1)).toBe(before);
  });

  it("removes one exact id and deletes the empty persisted envelope", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    repository.add(profileV1());
    expect(repository.remove("custom.missing")).toBe(false);
    expect(repository.remove("custom.openai")).toBe(true);
    expect(repository.list()).toEqual([]);
    expect(storage.getItem(browserProviderSettingsStorageKeyV1)).toBeNull();
  });

  it("rejects corrupt or secret-bearing stored records instead of repairing them", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    const invalidSnapshots = [
      "not-json",
      JSON.stringify({ revision: 2, customProfiles: [] }),
      JSON.stringify({ revision: 1, customProfiles: [{ ...profileV1(), apiKey: "secret" }] }),
      JSON.stringify({
        revision: 1,
        customProfiles: [profileV1({ baseUrl: "https://example.test/v1/" })],
      }),
      JSON.stringify({
        revision: 1,
        customProfiles: [profileV1({ displayName: "  Stored with spaces  " })],
      }),
      JSON.stringify({
        revision: 1,
        customProfiles: [
          profileV1({ profileId: "z.endpoint" }),
          profileV1({ profileId: "a.endpoint" }),
        ],
      }),
    ];
    for (const serialized of invalidSnapshots) {
      storage.setItem(browserProviderSettingsStorageKeyV1, serialized);
      expect(() => repository.list()).toThrowError(
        expect.objectContaining({ code: "schema_invalid", operation: "list" }),
      );
      expect(storage.getItem(browserProviderSettingsStorageKeyV1)).toBe(serialized);
    }
  });

  it("does not write when add input contains an API key", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    expect(() => repository.add({ ...profileV1(), apiKey: "must-never-persist" })).toThrowError(
      expect.objectContaining({ code: "invalid_profile", operation: "add" }),
    );
    expect(storage.length).toBe(0);
  });
});
