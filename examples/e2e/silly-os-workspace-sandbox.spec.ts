// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import type { Frame, Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

import { createBrowserControlPlaneContentSecurityPolicyV1 } from "../silly-os/src/deployment/browser-control-plane-security.ts";
import { browserWorkspaceSandboxDevelopmentOriginV1 } from "../silly-os/src/workspace/browser-workspace-sandbox-origins.ts";
import { expect, sillyOsTargetUrlV1, sillyOsWorkspaceSandboxTargetV1, test } from "./fixtures.ts";
import { readZipCentralDirectoryV1 } from "./silly-os-workspace-zip.ts";

interface SandboxColdReopenReceiptV1 {
  readonly anchor: {
    readonly revision: 1;
    readonly programId: string;
    readonly workspaceId: string;
    readonly volumeId: string;
    readonly workspaceFormat: 1;
  };
  readonly first: {
    readonly phase: "open";
    readonly generation: number;
    readonly checkpointId: string;
  };
  readonly reopened: {
    readonly phase: "open";
    readonly generation: number;
    readonly checkpointId: string;
  };
}

interface SandboxQualificationMetadataV1 {
  readonly mode: "create" | "verify";
  readonly anchor: { readonly programId: string; readonly workspaceId: string };
  readonly head: { readonly generation: 82; readonly hash: string };
  readonly initialGeneration: 1 | 82;
  readonly fileCount: 80;
  readonly totalBytes: 20_971_520;
  readonly corpusHash: string;
  readonly ioMaximums: {
    readonly writePayloadBytes: number;
    readonly readPayloadBytes: 262_144;
    readonly hashInputBytes: 262_144;
    readonly receiptQueueDepth: number;
  };
}

interface SandboxWorkspaceQualificationReceiptV1 {
  readonly anchor: SandboxColdReopenReceiptV1["anchor"];
  readonly created: SandboxQualificationMetadataV1;
  readonly verified: SandboxQualificationMetadataV1;
  readonly snapshot: {
    readonly snapshotId: string;
    readonly checkpointId: string;
    readonly generation: 82;
    readonly fileCount: 81;
    readonly archiveBytes: number;
  };
}

interface SandboxWorkspaceExportManifestV1 {
  readonly revision: 1;
  readonly kind: "sillyos-workspace";
  readonly exportFormat: 1;
  readonly workspaceFormat: 1;
  readonly programId: string;
  readonly workspaceId: string;
  readonly sourceRevision: 1;
  readonly baseRevision: 1;
  readonly checkpointId: string;
  readonly generation: 82;
}

const sandboxWorkspaceManifestNameV1 = "sillyos-workspace.json";
const sandboxQualificationCorpusFileCountV1 = 80;
const sandboxQualificationCorpusFileBytesV1 = 256 * 1_024;
const sandboxQualificationTextPathV1 = "qualification/native-pi-round-trip.txt";
const sandboxQualificationTextV1 = "SillyOS independent-origin native Pi round trip.\n";

test(
  "@s1b-live-tools the development Agent Worker response admits only its selected HTTPS origin",
  async ({ page }) => {
    const selectedOrigin = "https://llm.example.test:8443";
    const workerUrl = new URL("/src/agent/browser-pi.worker.ts", sillyOsTargetUrlV1());
    workerUrl.search = `?worker_file&type=module&endpoint-origin=${
      encodeURIComponent(selectedOrigin)
    }`;
    const response = await page.request.get(workerUrl.href);
    expect(response.status()).toBe(200);
    expect(response.headers()).toMatchObject({
      "cache-control": "no-store",
      "content-security-policy": createBrowserControlPlaneContentSecurityPolicyV1(
        selectedOrigin,
        browserWorkspaceSandboxDevelopmentOriginV1,
      ),
    });

    for (
      const invalidQuery of [
        "worker_file&type=module&endpoint-origin=http%3A%2F%2Fllm.example.test",
        "worker_file&type=module&endpoint-origin=https%3A%2F%2Fone.example.test&endpoint-origin=https%3A%2F%2Ftwo.example.test",
        "worker_file&type=module&endpoint-origin=https%3A%2F%2Fllm.example.test&extra=1",
      ]
    ) {
      const invalidUrl = new URL(workerUrl);
      invalidUrl.search = `?${invalidQuery}`;
      const invalidResponse = await page.request.get(invalidUrl.href);
      expect(invalidResponse.status()).toBe(400);
      expect(invalidResponse.headers()["cache-control"]).toBe("no-store");
    }
  },
);

function sandboxQualificationCorpusPathV1(index: number): string {
  return `qualification/corpus/${index.toString().padStart(3, "0")}.bin`;
}

function sandboxQualificationCorpusByteV1(index: number, offset: number): number {
  return ((index + 1) * 131 + offset * 17 + Math.floor(offset / 256) * 29) & 0xff;
}

function bytesToHexV1(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function exactArrayBufferV1(bytes: Uint8Array): ArrayBuffer {
  if (
    bytes.buffer instanceof ArrayBuffer && bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength
  ) return bytes.buffer;
  const owned = new Uint8Array(bytes.byteLength);
  owned.set(bytes);
  return owned.buffer;
}

async function assertSandboxQualificationArchiveV1(
  archiveBytes: Uint8Array,
  receipt: SandboxWorkspaceQualificationReceiptV1,
): Promise<void> {
  const corpusPaths = Array.from(
    { length: sandboxQualificationCorpusFileCountV1 },
    (_, index) => sandboxQualificationCorpusPathV1(index),
  );
  const expectedNames = [
    sandboxWorkspaceManifestNameV1,
    ...corpusPaths.map((path) => `workspace/${path}`),
    `workspace/${sandboxQualificationTextPathV1}`,
  ];
  const centralEntries = readZipCentralDirectoryV1(archiveBytes);
  expect(centralEntries.map((entry) => entry.name)).toEqual(expectedNames);
  expect(centralEntries.every((entry) => entry.compressionMethod === 0)).toBe(true);
  expect(centralEntries.every((entry) => entry.modificationTime === 0)).toBe(true);
  expect(centralEntries.every((entry) => entry.modificationDate === 33)).toBe(true);

  const extracted = new Map(centralEntries.map((entry) => [entry.name, entry.bytes]));
  expect(extracted.size).toBe(expectedNames.length);
  const manifestBytes = extracted.get(sandboxWorkspaceManifestNameV1);
  if (manifestBytes === undefined) throw new Error("Workspace ZIP omitted its root manifest");
  const manifest: SandboxWorkspaceExportManifestV1 = {
    revision: 1,
    kind: "sillyos-workspace",
    exportFormat: 1,
    workspaceFormat: 1,
    programId: receipt.anchor.programId,
    workspaceId: receipt.anchor.workspaceId,
    sourceRevision: 1,
    baseRevision: 1,
    checkpointId: receipt.snapshot.checkpointId,
    generation: 82,
  };
  expect(new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes)).toBe(
    `${JSON.stringify(manifest)}\n`,
  );

  const textBytes = extracted.get(`workspace/${sandboxQualificationTextPathV1}`);
  if (textBytes === undefined) throw new Error("Workspace ZIP omitted the native Pi probe");
  expect(new TextDecoder("utf-8", { fatal: true }).decode(textBytes)).toBe(
    sandboxQualificationTextV1,
  );

  let rollingHash = new Uint8Array(32);
  const encoder = new TextEncoder();
  for (let index = 0; index < corpusPaths.length; index += 1) {
    const path = corpusPaths[index];
    if (path === undefined) throw new Error("Workspace ZIP corpus path is unavailable");
    const archiveName = `workspace/${path}`;
    const actual = extracted.get(archiveName);
    if (actual === undefined) throw new Error(`Workspace ZIP omitted ${archiveName}`);
    expect(actual.byteLength, archiveName).toBe(sandboxQualificationCorpusFileBytesV1);
    for (let offset = 0; offset < actual.byteLength; offset += 1) {
      if (actual[offset] !== sandboxQualificationCorpusByteV1(index, offset)) {
        throw new Error(`Workspace ZIP changed ${archiveName} at byte ${String(offset)}`);
      }
    }
    const fileDigest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", exactArrayBufferV1(actual)),
    );
    const record = encoder.encode(`file\0${path}\0${actual.byteLength}`);
    const input = new Uint8Array(
      rollingHash.byteLength + record.byteLength + fileDigest.byteLength,
    );
    input.set(rollingHash, 0);
    input.set(record, rollingHash.byteLength);
    input.set(fileDigest, rollingHash.byteLength + record.byteLength);
    rollingHash = new Uint8Array(
      await crypto.subtle.digest("SHA-256", exactArrayBufferV1(input)),
    );
  }
  expect(bytesToHexV1(rollingHash)).toBe(receipt.created.corpusHash);
}

async function qualifySandboxColdReopenV1(page: Page): Promise<SandboxColdReopenReceiptV1> {
  return await page.evaluate(async () => {
    const importProductModuleV1 = async (path: string): Promise<Record<string, unknown>> =>
      await import(/* @vite-ignore */ new URL(path, location.href).href) as Record<string, unknown>;
    const [transportModule, hostModule] = await Promise.all([
      importProductModuleV1(
        "/src/workspace/browser-workspace-sandbox-frame-transport.ts",
      ),
      importProductModuleV1("/src/workspace/browser-workspace-host-port.ts"),
    ]);
    const createTransport = Reflect.get(
      transportModule,
      "createBrowserWorkspaceSandboxFrameTransportV1",
    );
    const createHost = Reflect.get(hostModule, "createBrowserWorkspaceHostPagePortV1");
    if (typeof createTransport !== "function" || typeof createHost !== "function") {
      throw new TypeError("sillyos.e2e.workspace_sandbox.module_unavailable");
    }
    const newHostV1 = () =>
      createHost({
        transport: createTransport({
          createNonce: () => `sandbox.bootstrap.${crypto.randomUUID()}`,
          bootstrapTimeoutMilliseconds: 20_000,
        }),
      }) as {
        withBootstrapLease<T>(input: {
          readonly programId: string;
          readonly workspaceId: string;
          readonly operation: () => Promise<T>;
        }): Promise<T>;
        createCandidate(input: {
          readonly programId: string;
          readonly workspaceId: string;
        }): Promise<{ readonly anchor: SandboxColdReopenReceiptV1["anchor"] }>;
        openWorkspace(anchor: SandboxColdReopenReceiptV1["anchor"]): Promise<{
          readonly phase: "open" | "closed";
          readonly checkpointId: string;
          readonly descriptor: { readonly workspaceSessionId: string; readonly generation: number };
        }>;
        closeWorkspace(workspaceSessionId: string): Promise<unknown>;
        dispose(): void;
      };
    const programId = `program.sandbox.${crypto.randomUUID()}`;
    const workspaceId = `workspace.sandbox.${crypto.randomUUID()}`;

    const firstHost = newHostV1();
    const created = await firstHost.withBootstrapLease({
      programId,
      workspaceId,
      operation: async () => {
        const candidate = await firstHost.createCandidate({ programId, workspaceId });
        const snapshot = await firstHost.openWorkspace(candidate.anchor);
        return { anchor: candidate.anchor, snapshot };
      },
    });
    if (created.snapshot.phase !== "open") {
      throw new TypeError("sillyos.e2e.workspace_sandbox.initial_open_failed");
    }
    await firstHost.closeWorkspace(created.snapshot.descriptor.workspaceSessionId);
    firstHost.dispose();

    const coldHost = newHostV1();
    const reopened = await coldHost.openWorkspace(created.anchor);
    if (reopened.phase !== "open") {
      throw new TypeError("sillyos.e2e.workspace_sandbox.cold_reopen_failed");
    }
    await coldHost.closeWorkspace(reopened.descriptor.workspaceSessionId);
    coldHost.dispose();

    return {
      anchor: created.anchor,
      first: {
        phase: created.snapshot.phase,
        generation: created.snapshot.descriptor.generation,
        checkpointId: created.snapshot.checkpointId,
      },
      reopened: {
        phase: reopened.phase,
        generation: reopened.descriptor.generation,
        checkpointId: reopened.checkpointId,
      },
    };
  });
}

async function qualifySandboxWorkspaceV1(
  page: Page,
): Promise<SandboxWorkspaceQualificationReceiptV1> {
  return await page.evaluate(async () => {
    interface HostSnapshotV1 {
      readonly phase: "open" | "closed";
      readonly volumeId: string;
      readonly checkpointId: string;
      readonly descriptor: {
        readonly revision: 1;
        readonly programId: string;
        readonly workspaceId: string;
        readonly workspaceSessionId: string;
        readonly generation: number;
      };
    }
    interface HostPortV1 {
      withBootstrapLease<T>(input: {
        readonly programId: string;
        readonly workspaceId: string;
        readonly operation: () => Promise<T>;
      }): Promise<T>;
      createCandidate(input: {
        readonly programId: string;
        readonly workspaceId: string;
      }): Promise<{ readonly anchor: SandboxColdReopenReceiptV1["anchor"] }>;
      openWorkspace(anchor: SandboxColdReopenReceiptV1["anchor"]): Promise<HostSnapshotV1>;
      queryWorkspace(workspaceSessionId: string): Promise<HostSnapshotV1>;
      attachEnvironment(input: { readonly workspaceSessionId: string }): Promise<{
        readonly snapshot: HostSnapshotV1;
        readonly environmentPort: MessagePort;
      }>;
      prepareSnapshot(input: {
        readonly workspaceSessionId: string;
        readonly snapshotId: string;
        readonly publicationId: string;
        readonly expectedCheckpointId: string;
        readonly expectedGeneration: number;
        readonly sourceRevision: number;
        readonly baseRevision: number;
      }): Promise<{
        readonly snapshotId: string;
        readonly checkpointId: string;
        readonly generation: number;
        readonly fileCount: number;
        readonly archiveBytes: number;
      }>;
      closeWorkspace(workspaceSessionId: string): Promise<unknown>;
      dispose(): void;
    }
    interface QualificationWorkerEnvelopeV1 {
      readonly revision: 1;
      readonly kind: "workspace_sandbox_qualification_response";
      readonly requestId: number;
      readonly ok: true;
      readonly response: SandboxQualificationMetadataV1;
    }

    const importProductModuleV1 = async (path: string): Promise<Record<string, unknown>> =>
      await import(/* @vite-ignore */ new URL(path, location.href).href) as Record<string, unknown>;
    const [transportModule, hostModule] = await Promise.all([
      importProductModuleV1(
        "/src/workspace/browser-workspace-sandbox-frame-transport.ts",
      ),
      importProductModuleV1("/src/workspace/browser-workspace-host-port.ts"),
    ]);
    const createTransport = Reflect.get(
      transportModule,
      "createBrowserWorkspaceSandboxFrameTransportV1",
    );
    const createHost = Reflect.get(hostModule, "createBrowserWorkspaceHostPagePortV1");
    if (typeof createTransport !== "function" || typeof createHost !== "function") {
      throw new TypeError("sillyos.e2e.workspace_sandbox.module_unavailable");
    }
    const newHostV1 = (): HostPortV1 =>
      createHost({
        transport: createTransport({
          createNonce: () => `sandbox.bootstrap.${crypto.randomUUID()}`,
          bootstrapTimeoutMilliseconds: 20_000,
        }),
      }) as HostPortV1;
    const containsPayloadV1 = (value: unknown, visited = new Set<object>()): boolean => {
      if (value instanceof ArrayBuffer || ArrayBuffer.isView(value) || value instanceof Blob) {
        return true;
      }
      if (value === null || typeof value !== "object" || visited.has(value)) return false;
      visited.add(value);
      return Object.values(value).some((entry) => containsPayloadV1(entry, visited));
    };
    const runQualificationWorkerV1 = async (input: {
      readonly mode: "create" | "verify";
      readonly requestId: number;
      readonly snapshot: HostSnapshotV1;
      readonly environmentPort: MessagePort;
    }): Promise<SandboxQualificationMetadataV1> => {
      const worker = new Worker(
        new URL(
          "/src/test/browser-workspace-sandbox-qualification.worker.ts",
          location.href,
        ),
        { type: "module", name: `sillyos-s1a-${input.mode}-qualification` },
      );
      try {
        const response = await new Promise<unknown>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Workspace Sandbox qualification Worker timed out"));
          }, 210_000);
          worker.addEventListener("message", (event) => {
            clearTimeout(timeout);
            resolve(event.data);
          }, { once: true });
          worker.addEventListener("error", (event) => {
            clearTimeout(timeout);
            event.preventDefault();
            reject(new Error("Workspace Sandbox qualification Worker failed"));
          }, { once: true });
          worker.postMessage({
            revision: 1,
            kind: "workspace_sandbox_qualification_request",
            requestId: input.requestId,
            mode: input.mode,
            descriptor: input.snapshot.descriptor,
          }, [input.environmentPort]);
        });
        if (containsPayloadV1(response)) {
          throw new TypeError("Workspace Sandbox qualification leaked a binary payload");
        }
        const envelope = response as Partial<QualificationWorkerEnvelopeV1>;
        if (
          envelope.revision !== 1 ||
          envelope.kind !== "workspace_sandbox_qualification_response" ||
          envelope.requestId !== input.requestId || envelope.ok !== true ||
          envelope.response === undefined
        ) {
          throw new TypeError("Workspace Sandbox qualification returned a failure");
        }
        return envelope.response;
      } finally {
        worker.terminate();
      }
    };

    const programId = `program.sandbox.${crypto.randomUUID()}`;
    const workspaceId = `workspace.sandbox.${crypto.randomUUID()}`;
    const firstHost = newHostV1();
    let coldHost: HostPortV1 | null = null;
    let retained = false;
    try {
      const createdWorkspace = await firstHost.withBootstrapLease({
        programId,
        workspaceId,
        operation: async () => {
          const candidate = await firstHost.createCandidate({ programId, workspaceId });
          const snapshot = await firstHost.openWorkspace(candidate.anchor);
          return { anchor: candidate.anchor, snapshot };
        },
      });
      const firstEnvironment = await firstHost.attachEnvironment({
        workspaceSessionId: createdWorkspace.snapshot.descriptor.workspaceSessionId,
      });
      const created = await runQualificationWorkerV1({
        mode: "create",
        requestId: 1,
        snapshot: firstEnvironment.snapshot,
        environmentPort: firstEnvironment.environmentPort,
      });
      const createdHead = await firstHost.queryWorkspace(
        createdWorkspace.snapshot.descriptor.workspaceSessionId,
      );
      if (createdHead.descriptor.generation !== 82) {
        throw new TypeError("Workspace Sandbox qualification did not publish generation 82");
      }
      await firstHost.closeWorkspace(createdHead.descriptor.workspaceSessionId);
      firstHost.dispose();

      coldHost = newHostV1();
      const coldOpened = await coldHost.openWorkspace(createdWorkspace.anchor);
      const coldEnvironment = await coldHost.attachEnvironment({
        workspaceSessionId: coldOpened.descriptor.workspaceSessionId,
      });
      const verified = await runQualificationWorkerV1({
        mode: "verify",
        requestId: 2,
        snapshot: coldEnvironment.snapshot,
        environmentPort: coldEnvironment.environmentPort,
      });
      const verifiedHead = await coldHost.queryWorkspace(coldOpened.descriptor.workspaceSessionId);
      if (verifiedHead.descriptor.generation !== 82) {
        throw new TypeError("Workspace Sandbox cold verification changed the generation");
      }
      const snapshot = await coldHost.prepareSnapshot({
        workspaceSessionId: verifiedHead.descriptor.workspaceSessionId,
        snapshotId: `snapshot.sandbox.${crypto.randomUUID()}`,
        publicationId: `publication.sandbox.${crypto.randomUUID()}`,
        expectedCheckpointId: verifiedHead.checkpointId,
        expectedGeneration: verifiedHead.descriptor.generation,
        sourceRevision: 1,
        baseRevision: 1,
      });
      const owner = globalThis as typeof globalThis & {
        sillyOsS1aWorkspaceSandboxOwnerV1?: {
          readonly host: HostPortV1;
          readonly workspaceSessionId: string;
        };
      };
      if (owner.sillyOsS1aWorkspaceSandboxOwnerV1 !== undefined) {
        throw new TypeError("Workspace Sandbox qualification owner already exists");
      }
      owner.sillyOsS1aWorkspaceSandboxOwnerV1 = {
        host: coldHost,
        workspaceSessionId: verifiedHead.descriptor.workspaceSessionId,
      };
      retained = true;
      return {
        anchor: createdWorkspace.anchor,
        created,
        verified,
        snapshot,
      } as SandboxWorkspaceQualificationReceiptV1;
    } finally {
      if (!retained) {
        firstHost.dispose();
        coldHost?.dispose();
      }
    }
  });
}

async function currentWorkspaceSandboxFrameV1(
  page: Page,
  volumeId: string | null = null,
): Promise<Frame> {
  await expect.poll(() =>
    page.frames().filter((frame) => {
      const frameUrl = frame.url();
      if (!URL.canParse(frameUrl)) return false;
      const url = new URL(frameUrl);
      return url.origin ===
          `http://${sillyOsWorkspaceSandboxTargetV1.host}:${
            String(sillyOsWorkspaceSandboxTargetV1.port)
          }` && url.pathname === "/workspace-sandbox.html";
    }).length
  ).toBeGreaterThan(0);
  const frames = page.frames().filter((candidate) => {
    const candidateUrl = candidate.url();
    if (!URL.canParse(candidateUrl)) return false;
    const url = new URL(candidateUrl);
    return url.origin ===
        `http://${sillyOsWorkspaceSandboxTargetV1.host}:${
          String(sillyOsWorkspaceSandboxTargetV1.port)
        }` && url.pathname === "/workspace-sandbox.html";
  });
  if (volumeId === null) {
    const frame = frames.at(-1);
    if (frame === undefined) throw new TypeError("Workspace Sandbox frame is unavailable");
    return frame;
  }
  for (const frame of frames) {
    const ownsVolume = await frame.evaluate(async (candidateVolumeId) => {
      try {
        let directory = await navigator.storage.getDirectory();
        for (const name of [".sillyos-workspace-host-v1", "volumes", candidateVolumeId]) {
          directory = await directory.getDirectoryHandle(name);
        }
        return true;
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotFoundError") return false;
        throw error;
      }
    }, volumeId);
    if (ownsVolume) return frame;
  }
  throw new TypeError("Workspace Sandbox volume frame is unavailable");
}

async function disposeRetainedSandboxWorkspaceV1(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const owner = globalThis as typeof globalThis & {
      sillyOsS1aWorkspaceSandboxOwnerV1?: {
        readonly host: {
          closeWorkspace(workspaceSessionId: string): Promise<unknown>;
          dispose(): void;
        };
        readonly workspaceSessionId: string;
      };
    };
    const retained = owner.sillyOsS1aWorkspaceSandboxOwnerV1;
    delete owner.sillyOsS1aWorkspaceSandboxOwnerV1;
    if (retained === undefined) return;
    try {
      await retained.host.closeWorkspace(retained.workspaceSessionId);
    } finally {
      retained.host.dispose();
    }
  });
}

test(
  "@s1a-workspace-sandbox the independent-origin Host creates and cold-reopens one OPFS volume",
  async ({ durableProgramPage: page }) => {
    test.setTimeout(120_000);
    await page.goto(sillyOsTargetUrlV1("?locale=en"));
    await expect(page.locator('[data-silly-os-view="program-library"]')).toBeVisible();
    const ordinaryFrameCount = await page.locator(
      "iframe[data-silly-os-workspace-sandbox='active']",
    ).count();

    const receipt = await qualifySandboxColdReopenV1(page);

    expect(receipt.anchor).toMatchObject({
      revision: 1,
      programId: expect.stringMatching(/^program\.sandbox\./u),
      workspaceId: expect.stringMatching(/^workspace\.sandbox\./u),
      volumeId: expect.stringMatching(/^sillyos\.volume\./u),
      workspaceFormat: 1,
    });
    expect(receipt.first).toEqual({
      phase: "open",
      generation: 1,
      checkpointId: receipt.first.checkpointId,
    });
    expect(receipt.reopened).toEqual(receipt.first);
    await expect(
      page.locator("iframe[data-silly-os-workspace-sandbox='active']"),
    ).toHaveCount(ordinaryFrameCount);
  },
);

test(
  "@s1a-workspace-sandbox Pi-native read/write cold-verifies twenty MiB and the Sandbox owns its snapshot download",
  async ({ durableProgramPage: page }, testInfo) => {
    test.setTimeout(600_000);
    await page.goto(sillyOsTargetUrlV1("?locale=en"));
    await expect(page.locator('[data-silly-os-view="program-library"]')).toBeVisible();
    const ordinaryFrameCount = await page.locator(
      "iframe[data-silly-os-workspace-sandbox='active']",
    ).count();

    const receipt = await qualifySandboxWorkspaceV1(page);
    try {
      expect(receipt.created).toEqual({
        mode: "create",
        anchor: {
          programId: receipt.anchor.programId,
          workspaceId: receipt.anchor.workspaceId,
        },
        head: { generation: 82, hash: receipt.created.head.hash },
        initialGeneration: 1,
        fileCount: 80,
        totalBytes: 20 * 1_024 * 1_024,
        corpusHash: receipt.created.corpusHash,
        ioMaximums: {
          writePayloadBytes: 256 * 1_024,
          readPayloadBytes: 256 * 1_024,
          hashInputBytes: 256 * 1_024,
          receiptQueueDepth: 16,
        },
      });
      expect(receipt.verified).toEqual({
        ...receipt.created,
        mode: "verify",
        initialGeneration: 82,
        ioMaximums: {
          writePayloadBytes: 0,
          readPayloadBytes: 256 * 1_024,
          hashInputBytes: 256 * 1_024,
          receiptQueueDepth: 0,
        },
      });
      expect(receipt.created.corpusHash).toMatch(/^[a-f0-9]{64}$/u);
      expect(receipt.created.head.hash).toMatch(/^[a-f0-9]{64}$/u);
      expect(receipt.snapshot).toMatchObject({
        snapshotId: expect.stringMatching(/^snapshot\.sandbox\./u),
        checkpointId: expect.any(String),
        generation: 82,
        fileCount: 81,
      });
      expect(receipt.snapshot.archiveBytes).toBeGreaterThan(receipt.created.totalBytes);

      const controlCanSeeSandboxVolume = await page.evaluate(async (volumeId) => {
        try {
          let directory = await navigator.storage.getDirectory();
          for (
            const name of [
              ".sillyos-workspace-host-v1",
              "volumes",
              volumeId,
            ]
          ) {
            directory = await directory.getDirectoryHandle(name);
          }
          return true;
        } catch (error) {
          if (error instanceof DOMException && error.name === "NotFoundError") return false;
          throw error;
        }
      }, receipt.anchor.volumeId);
      expect(controlCanSeeSandboxVolume).toBe(false);

      const frame = await currentWorkspaceSandboxFrameV1(page, receipt.anchor.volumeId);
      const filename = "s1a-workspace-sandbox.sillyos.zip";
      const downloadPromise = page.waitForEvent("download");
      const frameReceiptPromise = frame.evaluate(
        async ({ volumeId, snapshotId, expectedBytes, filename: downloadFilename }) => {
          let directory = await navigator.storage.getDirectory();
          for (
            const name of [
              ".sillyos-workspace-host-v1",
              "volumes",
              volumeId,
              "control",
              "snapshots",
              snapshotId,
            ]
          ) {
            directory = await directory.getDirectoryHandle(name);
          }
          const file = await (await directory.getFileHandle("workspace.zip")).getFile();
          if (file.size !== expectedBytes) {
            throw new TypeError("Workspace Sandbox snapshot byte length changed");
          }
          const url = URL.createObjectURL(file);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = downloadFilename;
          document.body.append(anchor);
          anchor.click();
          anchor.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1_000);
          return { byteLength: file.size };
        },
        {
          volumeId: receipt.anchor.volumeId,
          snapshotId: receipt.snapshot.snapshotId,
          expectedBytes: receipt.snapshot.archiveBytes,
          filename,
        },
      );
      const [download, frameReceipt] = await Promise.all([
        downloadPromise,
        frameReceiptPromise,
      ]);
      expect(download.suggestedFilename()).toBe(filename);
      expect(frameReceipt).toEqual({ byteLength: receipt.snapshot.archiveBytes });
      const archivePath = testInfo.outputPath(filename);
      await download.saveAs(archivePath);
      expect(await download.failure()).toBeNull();
      const archiveBytes = new Uint8Array(await readFile(archivePath));
      expect(archiveBytes.byteLength).toBe(receipt.snapshot.archiveBytes);
      await assertSandboxQualificationArchiveV1(archiveBytes, receipt);
    } finally {
      await disposeRetainedSandboxWorkspaceV1(page);
    }

    await expect(
      page.locator("iframe[data-silly-os-workspace-sandbox='active']"),
    ).toHaveCount(ordinaryFrameCount);
  },
);

test(
  "@s1a-workspace-sandbox the Sandbox principal cannot reach control storage or DOM",
  async ({ durableProgramPage: page }) => {
    test.setTimeout(120_000);
    await page.goto(sillyOsTargetUrlV1("?locale=en"));
    await expect(page.locator('[data-silly-os-view="program-library"]')).toBeVisible();
    const ordinaryFrameCount = await page.locator(
      "iframe[data-silly-os-workspace-sandbox='active']",
    ).count();

    const isolationId = crypto.randomUUID();
    const sentinel = {
      databaseName: `sillyos-control-isolation-${isolationId}`,
      storeName: "sentinels",
      key: "credential-plane-marker",
      value: `control-only-${isolationId}`,
      directoryName: `.sillyos-control-isolation-${isolationId}`,
      fileName: "credential-plane-marker.txt",
    };
    await page.evaluate(async (input) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(input.databaseName, 1);
        request.addEventListener(
          "upgradeneeded",
          () => request.result.createObjectStore(input.storeName),
        );
        request.addEventListener("success", () => resolve(request.result));
        request.addEventListener("error", () => reject(request.error));
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(input.storeName, "readwrite");
          transaction.objectStore(input.storeName).put(input.value, input.key);
          transaction.addEventListener("complete", () => resolve());
          transaction.addEventListener("error", () => reject(transaction.error));
          transaction.addEventListener("abort", () => reject(transaction.error));
        });
      } finally {
        database.close();
      }

      const root = await navigator.storage.getDirectory();
      const directory = await root.getDirectoryHandle(input.directoryName, { create: true });
      const file = await directory.getFileHandle(input.fileName, { create: true });
      const writer = await file.createWritable();
      await writer.write(input.value);
      await writer.close();
    }, sentinel);

    await page.evaluate(async () => {
      const transportModule = await import(
        /* @vite-ignore */
        new URL(
          "/src/workspace/browser-workspace-sandbox-frame-transport.ts",
          location.href,
        ).href
      ) as Record<string, unknown>;
      const createTransport = Reflect.get(
        transportModule,
        "createBrowserWorkspaceSandboxFrameTransportV1",
      );
      if (typeof createTransport !== "function") {
        throw new TypeError("sillyos.e2e.workspace_sandbox.transport_unavailable");
      }
      const owner = globalThis as typeof globalThis & {
        sillyOsS1aReverseOriginSandboxOwnerV1?: { terminate(): void };
      };
      if (owner.sillyOsS1aReverseOriginSandboxOwnerV1 !== undefined) {
        throw new TypeError("Workspace Sandbox network owner already exists");
      }
      owner.sillyOsS1aReverseOriginSandboxOwnerV1 = createTransport({
        createNonce: () => `sandbox.bootstrap.${crypto.randomUUID()}`,
        bootstrapTimeoutMilliseconds: 20_000,
      }) as { terminate(): void };
    });

    try {
      const frame = await currentWorkspaceSandboxFrameV1(page);
      const result = await frame.evaluate(async (input) => {
        let parentDocumentResult:
          | { readonly outcome: "accessible" }
          | {
            readonly outcome: "rejected";
            readonly isDomException: boolean;
            readonly name: string;
          };
        try {
          void parent.document;
          parentDocumentResult = { outcome: "accessible" };
        } catch (error) {
          parentDocumentResult = {
            outcome: "rejected",
            isDomException: error instanceof DOMException,
            name: error instanceof Error ? error.name : "unknown",
          };
        }

        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(input.databaseName, 1);
          request.addEventListener(
            "upgradeneeded",
            () => request.result.createObjectStore(input.storeName),
          );
          request.addEventListener("success", () => resolve(request.result));
          request.addEventListener("error", () => reject(request.error));
        });
        let indexedDbValue: unknown;
        try {
          indexedDbValue = await new Promise<unknown>((resolve, reject) => {
            const request = database.transaction(input.storeName).objectStore(input.storeName).get(
              input.key,
            );
            request.addEventListener("success", () => resolve(request.result));
            request.addEventListener("error", () => reject(request.error));
          });
        } finally {
          database.close();
        }

        let opfsResult:
          | { readonly outcome: "present" }
          | {
            readonly outcome: "rejected";
            readonly isDomException: boolean;
            readonly name: string;
          };
        try {
          const root = await navigator.storage.getDirectory();
          const directory = await root.getDirectoryHandle(input.directoryName);
          await directory.getFileHandle(input.fileName);
          opfsResult = { outcome: "present" };
        } catch (error) {
          opfsResult = {
            outcome: "rejected",
            isDomException: error instanceof DOMException,
            name: error instanceof Error ? error.name : "unknown",
          };
        }

        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(input.databaseName);
          request.addEventListener("success", () => resolve());
          request.addEventListener("error", () => reject(request.error));
          request.addEventListener(
            "blocked",
            () => reject(new Error("Sandbox IndexedDB cleanup was blocked")),
          );
        });
        return {
          parentDocumentResult,
          indexedDbValue,
          opfsResult,
        };
      }, sentinel);
      expect(result).toEqual({
        parentDocumentResult: {
          outcome: "rejected",
          isDomException: true,
          name: "SecurityError",
        },
        indexedDbValue: undefined,
        opfsResult: {
          outcome: "rejected",
          isDomException: true,
          name: "NotFoundError",
        },
      });

      const controlSentinels = await page.evaluate(async (input) => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(input.databaseName, 1);
          request.addEventListener("success", () => resolve(request.result));
          request.addEventListener("error", () => reject(request.error));
        });
        let indexedDbValue: unknown;
        try {
          indexedDbValue = await new Promise<unknown>((resolve, reject) => {
            const request = database.transaction(input.storeName).objectStore(input.storeName).get(
              input.key,
            );
            request.addEventListener("success", () => resolve(request.result));
            request.addEventListener("error", () => reject(request.error));
          });
        } finally {
          database.close();
        }
        const root = await navigator.storage.getDirectory();
        const directory = await root.getDirectoryHandle(input.directoryName);
        const file = await (await directory.getFileHandle(input.fileName)).getFile();
        return { indexedDbValue, opfsValue: await file.text() };
      }, sentinel);
      expect(controlSentinels).toEqual({
        indexedDbValue: sentinel.value,
        opfsValue: sentinel.value,
      });
    } finally {
      await page.evaluate(async (input) => {
        const owner = globalThis as typeof globalThis & {
          sillyOsS1aReverseOriginSandboxOwnerV1?: { terminate(): void };
        };
        owner.sillyOsS1aReverseOriginSandboxOwnerV1?.terminate();
        delete owner.sillyOsS1aReverseOriginSandboxOwnerV1;
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(input.databaseName);
          request.addEventListener("success", () => resolve());
          request.addEventListener("error", () => reject(request.error));
          request.addEventListener(
            "blocked",
            () => reject(new Error("Control IndexedDB cleanup was blocked")),
          );
        });
        const root = await navigator.storage.getDirectory();
        await root.removeEntry(input.directoryName, { recursive: true });
      }, sentinel);
    }

    await expect(
      page.locator("iframe[data-silly-os-workspace-sandbox='active']"),
    ).toHaveCount(ordinaryFrameCount);
  },
);

test(
  "@s1a-workspace-sandbox the Sandbox CSP blocks control-origin network before a request leaves the frame",
  async ({ page, pageDiagnostics }) => {
    test.setTimeout(120_000);
    await page.goto(sillyOsTargetUrlV1("?locale=en"));
    await expect(page.locator('[data-silly-os-view="program-library"]')).toBeVisible();
    const ordinaryFrameCount = await page.locator(
      "iframe[data-silly-os-workspace-sandbox='active']",
    ).count();

    await page.evaluate(async () => {
      const transportModule = await import(
        /* @vite-ignore */
        new URL(
          "/src/workspace/browser-workspace-sandbox-frame-transport.ts",
          location.href,
        ).href
      ) as Record<string, unknown>;
      const createTransport = Reflect.get(
        transportModule,
        "createBrowserWorkspaceSandboxFrameTransportV1",
      );
      if (typeof createTransport !== "function") {
        throw new TypeError("sillyos.e2e.workspace_sandbox.transport_unavailable");
      }
      const owner = globalThis as typeof globalThis & {
        sillyOsS1aNetworkSandboxOwnerV1?: { terminate(): void };
      };
      if (owner.sillyOsS1aNetworkSandboxOwnerV1 !== undefined) {
        throw new TypeError("Workspace Sandbox network owner already exists");
      }
      owner.sillyOsS1aNetworkSandboxOwnerV1 = createTransport({
        createNonce: () => `sandbox.bootstrap.${crypto.randomUUID()}`,
        bootstrapTimeoutMilliseconds: 20_000,
      }) as { terminate(): void };
    });

    const marker = new URL(
      `/__sillyos_control_origin_marker__/${crypto.randomUUID()}`,
      sillyOsTargetUrlV1(),
    ).href;
    const observedMarkerRequests: string[] = [];
    const observeRequest = (request: { url(): string }): void => {
      if (request.url() === marker) observedMarkerRequests.push(request.url());
    };
    page.on("request", observeRequest);
    const priorConsoleErrorCount = pageDiagnostics.consoleErrors.length;
    try {
      const frame = await currentWorkspaceSandboxFrameV1(page);
      const result = await frame.evaluate(async (url) => {
        try {
          await fetch(url, { cache: "no-store", redirect: "error" });
          return "fulfilled" as const;
        } catch {
          return "rejected" as const;
        }
      }, marker);
      expect(result).toBe("rejected");
      await expect.poll(() => pageDiagnostics.consoleErrors.length).toBeGreaterThan(
        priorConsoleErrorCount,
      );
      const expectedConsoleErrors = pageDiagnostics.consoleErrors.slice(priorConsoleErrorCount);
      expect(expectedConsoleErrors.length).toBeGreaterThanOrEqual(1);
      expect(expectedConsoleErrors.length).toBeLessThanOrEqual(2);
      expect(new Set(expectedConsoleErrors).size).toBe(expectedConsoleErrors.length);
      for (const expectedConsoleError of expectedConsoleErrors) {
        expect(expectedConsoleError).toContain(marker);
        pageDiagnostics.consumeExpectedConsoleError(expectedConsoleError);
      }
      expect(observedMarkerRequests).toEqual([]);
    } finally {
      page.off("request", observeRequest);
      await page.evaluate(() => {
        const owner = globalThis as typeof globalThis & {
          sillyOsS1aNetworkSandboxOwnerV1?: { terminate(): void };
        };
        owner.sillyOsS1aNetworkSandboxOwnerV1?.terminate();
        delete owner.sillyOsS1aNetworkSandboxOwnerV1;
      });
    }

    await expect(
      page.locator("iframe[data-silly-os-workspace-sandbox='active']"),
    ).toHaveCount(ordinaryFrameCount);
  },
);
