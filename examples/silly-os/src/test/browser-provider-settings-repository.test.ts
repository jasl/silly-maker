// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitBrowserProviderCustomProfileV1,
  browserProviderBaseUrlMaximumUtf8BytesV1,
  browserProviderContextWindowMaximumV1,
  browserProviderCustomApiFamiliesV1,
  browserProviderMaxTokensMaximumV1,
  browserProviderSettingsMaximumSerializedUtf8BytesV1,
  browserProviderSettingsRevisionV3,
  browserProviderSettingsStorageKeyV3,
  canonicalizeBrowserProviderBaseUrlV1,
  createBrowserProviderSettingsRepositoryV1,
  type BrowserProviderBuiltinModelRefV1,
  type BrowserProviderCustomProfileV1,
} from "../application/preferences/browser-provider-settings-repository.ts";

class MemoryStorageV1 implements Storage {
  readonly values = new Map<string, string>();
  setCalls = 0;

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
    this.setCalls += 1;
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

function builtinModelRefV1(
  providerId = "openai",
  modelId = "gpt-5.4",
): BrowserProviderBuiltinModelRefV1 {
  return { providerId, modelId };
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
  it("starts from V3 without treating the retired V2 preference as a successful Run", () => {
    const storage = new MemoryStorageV1();
    storage.setItem(
      "sillymaker.example-silly-os.provider-settings.v2",
      JSON.stringify({
        revision: 2,
        customProfiles: [profileV1()],
        enabledBuiltinModels: [builtinModelRefV1()],
        preferredModel: { kind: "builtin", ...builtinModelRefV1() },
      }),
    );
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });

    expect(repository.read()).toEqual({
      revision: browserProviderSettingsRevisionV3,
      customProfiles: [],
      enabledBuiltinModels: [],
      lastSuccessfulModel: null,
    });
    expect(storage.getItem(browserProviderSettingsStorageKeyV3)).toBeNull();
  });

  it("clears only its exact storage key and remains reusable", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    storage.setItem("sillyos.unrelated", "preserve-me");
    repository.add(profileV1());

    repository.clear();

    expect(storage.getItem(browserProviderSettingsStorageKeyV3)).toBeNull();
    expect(storage.getItem("sillyos.unrelated")).toBe("preserve-me");
    expect(repository.read()).toEqual({
      revision: browserProviderSettingsRevisionV3,
      customProfiles: [],
      enabledBuiltinModels: [],
      lastSuccessfulModel: null,
    });
  });

  it("persists and reopens one sorted, immutable, non-secret settings projection", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    const mutableProfile = {
      ...profileV1({
        profileId: "z.endpoint",
        displayName: "  Z endpoint  ",
        baseUrl: "https://z.example.test/v1/",
      }),
    };
    expect(repository.add(mutableProfile)).toEqual({
      ...mutableProfile,
      displayName: "Z endpoint",
      baseUrl: "https://z.example.test/v1",
    });
    repository.add(profileV1({ profileId: "a.endpoint", displayName: "A endpoint" }));
    const mutableBuiltin = { providerId: "z-provider", modelId: "z-model" };
    expect(repository.setBuiltinModelEnabled(mutableBuiltin, true)).toBe(true);
    expect(repository.setBuiltinModelEnabled(builtinModelRefV1("a-provider", "z-model"), true))
      .toBe(true);
    expect(repository.setBuiltinModelEnabled(builtinModelRefV1("a-provider", "a-model"), true))
      .toBe(true);
    const lastSuccessful = {
      kind: "builtin" as const,
      providerId: "a-provider",
      modelId: "a-model",
    };
    expect(repository.setLastSuccessfulModel(lastSuccessful)).toEqual(lastSuccessful);

    const serialized = storage.getItem(browserProviderSettingsStorageKeyV3);
    expect(serialized).not.toBeNull();
    expect(serialized).not.toContain("secret");
    expect(JSON.parse(serialized ?? "null")).toEqual({
      revision: browserProviderSettingsRevisionV3,
      customProfiles: [
        profileV1({ profileId: "a.endpoint", displayName: "A endpoint" }),
        {
          ...mutableProfile,
          displayName: "Z endpoint",
          baseUrl: "https://z.example.test/v1",
        },
      ],
      enabledBuiltinModels: [
        builtinModelRefV1("a-provider", "a-model"),
        builtinModelRefV1("a-provider", "z-model"),
        builtinModelRefV1("z-provider", "z-model"),
      ],
      lastSuccessfulModel: lastSuccessful,
    });

    mutableProfile.displayName = "mutated after add";
    mutableBuiltin.providerId = "mutated-provider";
    lastSuccessful.modelId = "mutated-model";
    const reopened = createBrowserProviderSettingsRepositoryV1({ storage });
    const snapshot = reopened.read();
    expect(snapshot.customProfiles.map(({ profileId }) => profileId)).toEqual([
      "a.endpoint",
      "z.endpoint",
    ]);
    expect(snapshot.customProfiles[1]?.displayName).toBe("Z endpoint");
    expect(snapshot.enabledBuiltinModels).toEqual([
      builtinModelRefV1("a-provider", "a-model"),
      builtinModelRefV1("a-provider", "z-model"),
      builtinModelRefV1("z-provider", "z-model"),
    ]);
    expect(snapshot.lastSuccessfulModel).toEqual({
      kind: "builtin",
      providerId: "a-provider",
      modelId: "a-model",
    });
    expect(reopened.list()).toEqual(snapshot.customProfiles);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.customProfiles)).toBe(true);
    expect(Object.isFrozen(snapshot.customProfiles[0])).toBe(true);
    expect(Object.isFrozen(snapshot.enabledBuiltinModels)).toBe(true);
    expect(Object.isFrozen(snapshot.enabledBuiltinModels[0])).toBe(true);
    expect(Object.isFrozen(snapshot.lastSuccessfulModel)).toBe(true);
  });

  it("atomically initializes sorted builtin defaults only on fresh storage", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    const initialization = repository.initializeBuiltinModelDefaults([
      builtinModelRefV1("z-provider", "z-model"),
      builtinModelRefV1("a-provider", "z-model"),
      builtinModelRefV1("a-provider", "a-model"),
    ]);

    expect(initialization).toEqual({
      initialized: true,
      snapshot: {
        revision: browserProviderSettingsRevisionV3,
        customProfiles: [],
        enabledBuiltinModels: [
          builtinModelRefV1("a-provider", "a-model"),
          builtinModelRefV1("a-provider", "z-model"),
          builtinModelRefV1("z-provider", "z-model"),
        ],
        lastSuccessfulModel: null,
      },
    });
    expect(Object.isFrozen(initialization)).toBe(true);
    expect(Object.isFrozen(initialization.snapshot.enabledBuiltinModels)).toBe(true);
    expect(storage.setCalls).toBe(1);

    const second = repository.initializeBuiltinModelDefaults([
      builtinModelRefV1("other-provider", "other-model"),
    ]);
    expect(second.initialized).toBe(false);
    expect(second.snapshot).toEqual(initialization.snapshot);
    expect(storage.setCalls).toBe(1);
  });

  it("keeps an explicit all-unchecked envelope instead of reseeding defaults", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    const initial = builtinModelRefV1("provider", "initial-model");
    repository.initializeBuiltinModelDefaults([initial]);
    expect(repository.setBuiltinModelEnabled(initial, false)).toBe(true);
    expect(JSON.parse(storage.getItem(browserProviderSettingsStorageKeyV3) ?? "null")).toEqual({
      revision: browserProviderSettingsRevisionV3,
      customProfiles: [],
      enabledBuiltinModels: [],
      lastSuccessfulModel: null,
    });

    const second = repository.initializeBuiltinModelDefaults([
      builtinModelRefV1("provider", "new-default"),
    ]);
    expect(second).toEqual({
      initialized: false,
      snapshot: {
        revision: browserProviderSettingsRevisionV3,
        customProfiles: [],
        enabledBuiltinModels: [],
        lastSuccessfulModel: null,
      },
    });
  });

  it("rejects malformed and duplicate defaults without a partial write", () => {
    const invalidCases = [
      {
        value: [builtinModelRefV1(), builtinModelRefV1()],
        code: "invalid_model_ref",
      },
      {
        value: [{ ...builtinModelRefV1(), apiKey: "must-never-persist" }],
        code: "invalid_model_ref",
      },
    ] as const;
    for (const invalid of invalidCases) {
      const storage = new MemoryStorageV1();
      const repository = createBrowserProviderSettingsRepositoryV1({ storage });
      expect(() => repository.initializeBuiltinModelDefaults(invalid.value)).toThrowError(
        expect.objectContaining({
          code: invalid.code,
          operation: "initialize_builtin_model_defaults",
        }),
      );
      expect(storage.getItem(browserProviderSettingsStorageKeyV3)).toBeNull();
      expect(storage.setCalls).toBe(0);
    }
  });

  it("rejects duplicate profile ids without imposing a separate profile count", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    repository.add(profileV1());
    expect(() => repository.add(profileV1({ displayName: "Duplicate" }))).toThrowError(
      expect.objectContaining({ code: "profile_exists", operation: "add" }),
    );

    for (let index = 1; index < 32; index += 1) {
      repository.add(profileV1({ profileId: `custom.endpoint-${String(index)}` }));
    }
    expect(repository.list()).toHaveLength(32);
  });

  it("accepts a large compact model set and treats repeated toggles as no-ops", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    const refs = Array.from(
      { length: 300 },
      (_, index) => builtinModelRefV1("provider", `model-${String(index).padStart(3, "0")}`),
    );
    expect(repository.initializeBuiltinModelDefaults(refs)).toMatchObject({ initialized: true });
    expect(repository.read().enabledBuiltinModels).toHaveLength(300);
    expect(repository.setBuiltinModelEnabled(builtinModelRefV1("provider", "model-000"), true))
      .toBe(false);
  });

  it("uses the settings-record byte budget and preserves the prior record on overflow", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    const profiles: BrowserProviderCustomProfileV1[] = [];
    let overflowProfile: BrowserProviderCustomProfileV1 | null = null;
    for (let index = 0; overflowProfile === null; index += 1) {
      const candidate = profileV1({
        profileId: `custom.endpoint-${String(index).padStart(3, "0")}`,
        displayName: "D".repeat(128),
        baseUrl: `https://llm.example.test/${"a".repeat(1_900)}/${String(index)}`,
        modelId: `model-${String(index)}-${"m".repeat(230)}`,
      });
      const serialized = JSON.stringify({
        revision: browserProviderSettingsRevisionV3,
        customProfiles: [...profiles, candidate],
        enabledBuiltinModels: [],
        lastSuccessfulModel: null,
      });
      if (
        new TextEncoder().encode(serialized).byteLength >
          browserProviderSettingsMaximumSerializedUtf8BytesV1
      ) {
        overflowProfile = candidate;
      } else {
        profiles.push(candidate);
      }
    }
    expect(profiles.length).toBeGreaterThan(16);
    for (const profile of profiles) repository.add(profile);
    const before = storage.getItem(browserProviderSettingsStorageKeyV3);
    expect(() => repository.add(overflowProfile)).toThrowError(
      expect.objectContaining({ code: "record_too_large", operation: "add" }),
    );
    expect(storage.getItem(browserProviderSettingsStorageKeyV3)).toBe(before);
  });

  it("clears a last-successful builtin when disabled and a last-successful custom target when removed", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    const builtin = builtinModelRefV1();
    repository.setBuiltinModelEnabled(builtin, true);
    repository.setLastSuccessfulModel({ kind: "builtin", ...builtin });
    expect(repository.setBuiltinModelEnabled(builtin, false)).toBe(true);
    expect(repository.read().lastSuccessfulModel).toBeNull();

    repository.add(profileV1());
    repository.setLastSuccessfulModel({ kind: "custom", profileId: "custom.openai" });
    expect(repository.remove("custom.missing")).toBe(false);
    expect(repository.remove("custom.openai")).toBe(true);
    expect(repository.read()).toEqual({
      revision: browserProviderSettingsRevisionV3,
      customProfiles: [],
      enabledBuiltinModels: [],
      lastSuccessfulModel: null,
    });
    expect(JSON.parse(storage.getItem(browserProviderSettingsStorageKeyV3) ?? "null")).toEqual({
      revision: browserProviderSettingsRevisionV3,
      customProfiles: [],
      enabledBuiltinModels: [],
      lastSuccessfulModel: null,
    });
  });

  it("requires last-successful targets to exist and clears an explicit last-successful target", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    const builtin = builtinModelRefV1();
    expect(() => repository.setLastSuccessfulModel({ kind: "builtin", ...builtin })).toThrowError(
      expect.objectContaining({
        code: "invalid_last_successful_model",
        operation: "set_last_successful_model",
      }),
    );
    expect(() => repository.setLastSuccessfulModel({ kind: "custom", profileId: "custom.missing" }))
      .toThrowError(
        expect.objectContaining({
          code: "invalid_last_successful_model",
          operation: "set_last_successful_model",
        }),
      );
    expect(storage.length).toBe(0);

    repository.setBuiltinModelEnabled(builtin, true);
    repository.setLastSuccessfulModel({ kind: "builtin", ...builtin });
    expect(repository.setLastSuccessfulModel(null)).toBeNull();
    expect(repository.read().lastSuccessfulModel).toBeNull();
  });

  it("keeps the empty envelope after every non-secret setting is removed", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    const builtin = builtinModelRefV1();
    repository.setBuiltinModelEnabled(builtin, true);
    repository.add(profileV1());
    expect(repository.remove("custom.openai")).toBe(true);
    expect(storage.getItem(browserProviderSettingsStorageKeyV3)).not.toBeNull();
    expect(repository.setBuiltinModelEnabled(builtin, false)).toBe(true);
    expect(JSON.parse(storage.getItem(browserProviderSettingsStorageKeyV3) ?? "null")).toEqual({
      revision: browserProviderSettingsRevisionV3,
      customProfiles: [],
      enabledBuiltinModels: [],
      lastSuccessfulModel: null,
    });
  });

  it("rejects malformed, dangling, unsorted, duplicate, and secret-bearing stored records", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    const emptyEnvelope = {
      revision: browserProviderSettingsRevisionV3,
      customProfiles: [],
      enabledBuiltinModels: [],
      lastSuccessfulModel: null,
    };
    const invalidSnapshots = [
      "not-json",
      "x".repeat(65_537),
      JSON.stringify({ revision: 1, customProfiles: [] }),
      JSON.stringify({ ...emptyEnvelope, apiKey: "secret" }),
      JSON.stringify({ ...emptyEnvelope, testPassed: true }),
      JSON.stringify({
        ...emptyEnvelope,
        customProfiles: [{ ...profileV1(), apiKey: "secret" }],
      }),
      JSON.stringify({
        ...emptyEnvelope,
        customProfiles: [profileV1({ baseUrl: "https://example.test/v1/" })],
      }),
      JSON.stringify({
        ...emptyEnvelope,
        customProfiles: [profileV1({ displayName: "  Stored with spaces  " })],
      }),
      JSON.stringify({
        ...emptyEnvelope,
        customProfiles: [
          profileV1({ profileId: "z.endpoint" }),
          profileV1({ profileId: "a.endpoint" }),
        ],
      }),
      JSON.stringify({
        ...emptyEnvelope,
        enabledBuiltinModels: [{ ...builtinModelRefV1(), credential: "secret" }],
      }),
      JSON.stringify({
        ...emptyEnvelope,
        enabledBuiltinModels: [
          builtinModelRefV1("z-provider", "model"),
          builtinModelRefV1("a-provider", "model"),
        ],
      }),
      JSON.stringify({
        ...emptyEnvelope,
        enabledBuiltinModels: [builtinModelRefV1(), builtinModelRefV1()],
      }),
      JSON.stringify({
        ...emptyEnvelope,
        lastSuccessfulModel: { kind: "builtin", ...builtinModelRefV1(), verified: true },
      }),
      JSON.stringify({
        ...emptyEnvelope,
        lastSuccessfulModel: { kind: "builtin", ...builtinModelRefV1() },
      }),
      JSON.stringify({
        ...emptyEnvelope,
        lastSuccessfulModel: { kind: "custom", profileId: "custom.missing" },
      }),
    ];
    for (const serialized of invalidSnapshots) {
      storage.setItem(browserProviderSettingsStorageKeyV3, serialized);
      expect(() => repository.read()).toThrowError(
        expect.objectContaining({ code: "schema_invalid", operation: "read" }),
      );
      expect(storage.getItem(browserProviderSettingsStorageKeyV3)).toBe(serialized);
    }
  });

  it("rejects credential and test-result fields from every public mutation without writing", () => {
    const storage = new MemoryStorageV1();
    const repository = createBrowserProviderSettingsRepositoryV1({ storage });
    expect(() => repository.add({ ...profileV1(), apiKey: "must-never-persist" })).toThrowError(
      expect.objectContaining({ code: "invalid_profile", operation: "add" }),
    );
    expect(() =>
      repository.setBuiltinModelEnabled({ ...builtinModelRefV1(), credential: "secret" }, true)
    ).toThrowError(
      expect.objectContaining({
        code: "invalid_model_ref",
        operation: "set_builtin_model_enabled",
      }),
    );
    expect(() =>
      repository.setLastSuccessfulModel({
        kind: "builtin",
        ...builtinModelRefV1(),
        lastTestPassed: true,
      })
    ).toThrowError(
      expect.objectContaining({
        code: "invalid_last_successful_model",
        operation: "set_last_successful_model",
      }),
    );
    expect(storage.length).toBe(0);
  });
});
