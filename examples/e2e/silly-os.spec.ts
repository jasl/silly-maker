// SPDX-License-Identifier: MIT
/// <reference lib="dom" />
import type { Locator, Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

import { expect, sillyOsTargetUrlV1, test } from "./fixtures.ts";

const translationIntentV1 =
  "Translate this visual novel and keep every character's voice consistent.";

async function expectProgramStorageReadyV1(page: Page): Promise<void> {
  await expect(page.locator('[data-program-storage-state="ready"]')).toBeVisible();
}

async function openCreatorHomeV1(page: Page): Promise<void> {
  await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
  await expectProgramStorageReadyV1(page);
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What would you like to make?", level: 1 }),
  ).toBeVisible();
}

async function openTranslationWorkspaceV1(page: Page): Promise<Locator> {
  await openCreatorHomeV1(page);
  await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
    translationIntentV1,
  );
  await page.getByRole("button", { name: "Create program" }).click();

  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectProgramStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-workspace-layout", /^(dual|single)-pane$/);
  await expect(page.getByText(translationIntentV1, { exact: true })).toBeVisible();
  await expect(page.getByText("Translation Workshop", { exact: true }).first()).toBeVisible();
  return workspace;
}

async function readProgramIdV1(workspace: Locator): Promise<string> {
  const programId = await workspace.getAttribute("data-program-id");
  if (programId === null) throw new Error("SillyOS workspace has no Program identity");
  return programId;
}

async function readWorkspaceSessionIdV1(workspace: Locator): Promise<string> {
  const workspaceSessionId = await workspace.getAttribute("data-execution-workspace-session");
  if (workspaceSessionId === null) {
    throw new Error("SillyOS workspace has no execution session identity");
  }
  return workspaceSessionId;
}

interface DurableAgentRunReceiptV3 {
  readonly agentRunId: string;
  readonly sequence: number;
  readonly proposalId: string;
  readonly userMessageId: string;
  readonly creatorMessageId: string | null;
  readonly baseProgramRevision: number;
  readonly baseRepositoryRevision: number;
  readonly resultingProgramRevision: number | null;
  readonly outcome: "completed" | "failed" | "cancelled" | "replaced";
  readonly diagnosticCode: string | null;
}

interface DurableProgramWorkspaceSnapshotReceiptV1 {
  readonly revision: 1;
  readonly snapshotId: string;
  readonly programId: string;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly proposalId: string;
  readonly programRevision: number;
  readonly baseRepositoryRevision: number;
  readonly checkpointId: string;
  readonly generation: number;
  readonly fileCount: number;
  readonly archiveBytes: number;
}

type DurableProgramDecisionV3 =
  | {
    readonly proposalId: string;
    readonly programRevision: number;
    readonly status: "accepted";
    readonly repositoryRevision: number;
    readonly snapshot: DurableProgramWorkspaceSnapshotReceiptV1;
  }
  | {
    readonly proposalId: string;
    readonly programRevision: number;
    readonly status: "rejected";
    readonly repositoryRevision: number;
  };

interface DurableProgramReviewBindingV3 {
  readonly proposalId: string;
  readonly programId: string;
  readonly programRevision: number;
  readonly baseAcceptedProgramRevision: number | null;
  readonly repositoryRevision: number;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly checkpointId: string;
  readonly generation: number;
}

interface DurableProgramProjectionV3 {
  readonly schemaVersion: 3;
  readonly programId: string;
  readonly repositoryRevision: number;
  readonly decisions: readonly DurableProgramDecisionV3[];
  readonly agentRunReceipts: readonly DurableAgentRunReceiptV3[];
  readonly reviewBinding: DurableProgramReviewBindingV3 | null;
  readonly snapshot: {
    readonly proposal: {
      readonly proposalId: string;
      readonly programRevision: number;
      readonly status: "pending" | "accepted" | "rejected";
    } | null;
    readonly messages: readonly {
      readonly messageId: string;
      readonly role: string;
      readonly text: string;
    }[];
    readonly activity: readonly { readonly kind: string; readonly summary: string }[];
  };
}

interface DurableWorkspaceContinuationV1 {
  readonly revision: 1;
  readonly programId: string;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly programRevision: number;
  readonly repositoryRevision: number;
}

interface DurableProgramDatabaseStateV4 {
  readonly version: 4;
  readonly programRows: readonly unknown[];
  readonly continuationRows: readonly unknown[];
}

interface WorkspaceScaleQualificationReceiptV1 {
  readonly method: "create" | "verify";
  readonly anchor: {
    readonly revision: 1;
    readonly programId: string;
    readonly workspaceId: string;
    readonly volumeId: string;
    readonly workspaceFormat: 1;
  };
  readonly head: {
    readonly revision: 1;
    readonly volumeId: string;
    readonly workspaceFormat: 1;
    readonly checkpointId: string;
    readonly generation: 1002;
  };
  readonly fileCount: 1001;
  readonly totalBytes: 21897216;
  readonly corpusHash: string;
  readonly ioMaximums: {
    readonly sourceRangeBytes: number;
    readonly readRangeBytes: number;
    readonly observedChunkBytes: number;
    readonly observedBytesInFlight: number;
  };
}

interface SillyOsWorkspaceExportManifestV1 {
  readonly revision: 1;
  readonly kind: "sillyos-workspace";
  readonly exportFormat: 1;
  readonly workspaceFormat: 1;
  readonly programId: string;
  readonly workspaceId: string;
  readonly programRevision: number;
  readonly repositoryRevision: number;
  readonly checkpointId: string;
  readonly generation: number;
}

interface QualificationArchiveFileV1 {
  readonly path: string;
  readonly byteLength: number;
  readonly seed: number;
}

interface ZipCentralDirectoryEntryV1 {
  readonly name: string;
  readonly compressionMethod: number;
  readonly modificationTime: number;
  readonly modificationDate: number;
  readonly bytes: Uint8Array;
}

const workspaceExportManifestNameV1 = "sillyos-workspace.json";
const qualificationSmallFileCountV1 = 1_000;
const qualificationSmallFileBytesV1 = 5 * 1_024;
const qualificationLargeFileBytesV1 = 16 * 1_024 * 1_024;

function compareCodeUnitsV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function qualificationArchiveFilesV1(): readonly QualificationArchiveFileV1[] {
  const files: QualificationArchiveFileV1[] = Array.from(
    { length: qualificationSmallFileCountV1 },
    (_, index) => ({
      path: `qualification/small/${index.toString().padStart(4, "0")}.bin`,
      byteLength: qualificationSmallFileBytesV1,
      seed: index + 1,
    }),
  );
  files.push({
    path: "qualification/large.bin",
    byteLength: qualificationLargeFileBytesV1,
    seed: qualificationSmallFileCountV1 + 1,
  });
  return files.sort((left, right) => compareCodeUnitsV1(left.path, right.path));
}

function qualificationByteV1(seed: number, offset: number): number {
  return (seed * 131 + offset * 17 + Math.floor(offset / 256) * 29) & 0xff;
}

function readZipCentralDirectoryV1(bytes: Uint8Array): readonly ZipCentralDirectoryEntryV1[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOfCentralDirectorySignature = 0x06054b50;
  const centralDirectoryEntrySignature = 0x02014b50;
  const localEntrySignature = 0x04034b50;
  const minimumEndRecordBytes = 22;
  const maximumCommentBytes = 0xffff;
  let endOffset = -1;
  const earliest = Math.max(0, bytes.byteLength - minimumEndRecordBytes - maximumCommentBytes);
  for (
    let offset = bytes.byteLength - minimumEndRecordBytes;
    offset >= earliest;
    offset -= 1
  ) {
    if (
      view.getUint32(offset, true) === endOfCentralDirectorySignature &&
      offset + minimumEndRecordBytes + view.getUint16(offset + 20, true) === bytes.byteLength
    ) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error("Downloaded workspace ZIP has no exact end record");
  if (
    view.getUint16(endOffset + 4, true) !== 0 ||
    view.getUint16(endOffset + 6, true) !== 0
  ) throw new Error("Downloaded workspace ZIP unexpectedly spans multiple disks");
  const entriesOnDisk = view.getUint16(endOffset + 8, true);
  const entryCount = view.getUint16(endOffset + 10, true);
  const directoryBytes = view.getUint32(endOffset + 12, true);
  const directoryOffset = view.getUint32(endOffset + 16, true);
  if (
    entriesOnDisk !== entryCount || directoryOffset + directoryBytes !== endOffset
  ) throw new Error("Downloaded workspace ZIP has an invalid central-directory extent");

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const entries: ZipCentralDirectoryEntryV1[] = [];
  let offset = directoryOffset;
  let previousLocalOffset = -1;
  for (let index = 0; index < entryCount; index += 1) {
    if (
      offset + 46 > endOffset ||
      view.getUint32(offset, true) !== centralDirectoryEntrySignature
    ) throw new Error("Downloaded workspace ZIP has an invalid central-directory entry");
    const nameBytes = view.getUint16(offset + 28, true);
    const extraBytes = view.getUint16(offset + 30, true);
    const commentBytes = view.getUint16(offset + 32, true);
    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedBytes = view.getUint32(offset + 20, true);
    const uncompressedBytes = view.getUint32(offset + 24, true);
    const localOffset = view.getUint32(offset + 42, true);
    const nextOffset = offset + 46 + nameBytes + extraBytes + commentBytes;
    if (
      nameBytes === 0 || nextOffset > endOffset || compressionMethod !== 0 ||
      compressedBytes !== uncompressedBytes || localOffset <= previousLocalOffset ||
      localOffset + 30 > directoryOffset ||
      view.getUint32(localOffset, true) !== localEntrySignature ||
      view.getUint16(localOffset + 8, true) !== compressionMethod
    ) {
      throw new Error("Downloaded workspace ZIP has invalid entry metadata");
    }
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameBytes));
    const localNameBytes = view.getUint16(localOffset + 26, true);
    const localExtraBytes = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameBytes + localExtraBytes;
    const dataEnd = dataOffset + compressedBytes;
    if (
      dataEnd > directoryOffset ||
      decoder.decode(bytes.subarray(localOffset + 30, localOffset + 30 + localNameBytes)) !== name
    ) throw new Error("Downloaded workspace ZIP has an invalid local entry");
    entries.push({
      name,
      compressionMethod,
      modificationTime: view.getUint16(offset + 12, true),
      modificationDate: view.getUint16(offset + 14, true),
      bytes: bytes.subarray(dataOffset, dataEnd),
    });
    previousLocalOffset = localOffset;
    offset = nextOffset;
  }
  if (offset !== endOffset) {
    throw new Error("Downloaded workspace ZIP has trailing central-directory metadata");
  }
  return entries;
}

function assertQualificationArchiveV1(
  archiveBytes: Uint8Array,
  manifest: SillyOsWorkspaceExportManifestV1,
): void {
  const files = qualificationArchiveFilesV1();
  const expectedNames = [
    workspaceExportManifestNameV1,
    ...files.map((file) => `workspace/${file.path}`),
  ];
  const centralEntries = readZipCentralDirectoryV1(archiveBytes);
  expect(centralEntries.map((entry) => entry.name)).toEqual(expectedNames);
  expect(centralEntries.every((entry) => entry.compressionMethod === 0)).toBe(true);
  expect(centralEntries.every((entry) => entry.modificationTime === 0)).toBe(true);
  expect(centralEntries.every((entry) => entry.modificationDate === 33)).toBe(true);

  const extracted = new Map(centralEntries.map((entry) => [entry.name, entry.bytes]));
  expect(extracted.size).toBe(expectedNames.length);
  const manifestBytes = extracted.get(workspaceExportManifestNameV1);
  if (manifestBytes === undefined) throw new Error("Workspace ZIP omitted its root manifest");
  expect(new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes)).toBe(
    `${JSON.stringify(manifest)}\n`,
  );

  for (const file of files) {
    const archiveName = `workspace/${file.path}`;
    const actual = extracted.get(archiveName);
    if (actual === undefined) throw new Error(`Workspace ZIP omitted ${archiveName}`);
    expect(actual.byteLength, archiveName).toBe(file.byteLength);
    for (let offset = 0; offset < actual.byteLength; offset += 1) {
      const expected = qualificationByteV1(file.seed, offset);
      if (actual[offset] !== expected) {
        throw new Error(
          `Workspace ZIP changed ${archiveName} at byte ${String(offset)}`,
        );
      }
    }
  }
}

async function downloadRetainedWorkspaceSnapshotV1(
  page: Page,
  receipt: DurableProgramWorkspaceSnapshotReceiptV1,
  outputPath: string,
): Promise<Uint8Array> {
  const downloadPromise = page.waitForEvent("download");
  await page.evaluate(
    async ({ snapshotId, volumeId }) => {
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
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${snapshotId}.zip`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    },
    { snapshotId: receipt.snapshotId, volumeId: receipt.volumeId },
  );
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`${receipt.snapshotId}.zip`);
  await download.saveAs(outputPath);
  expect(await download.failure()).toBeNull();
  return new Uint8Array(await readFile(outputPath));
}

async function initializePiTestV1(page: Page, key: string): Promise<void> {
  const keyInput = page.getByLabel("Synthetic test key (memory only)");
  await keyInput.fill(key);
  await page.getByRole("button", { name: "Initialize Pi test" }).click();
  await expect(keyInput).toHaveValue("");
  await expect(page.getByText("Pi test ready", { exact: true })).toBeVisible();
}

async function readWorkspaceContinuationV1(
  page: Page,
  programId: string,
): Promise<DurableWorkspaceContinuationV1 | null> {
  return await page.evaluate(async (requestedProgramId) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sillymaker.example-silly-os.programs");
      request.addEventListener("error", () => reject(request.error));
      request.addEventListener("success", () => resolve(request.result));
    });
    try {
      return await new Promise<DurableWorkspaceContinuationV1 | null>((resolve, reject) => {
        const transaction = database.transaction("workspace_continuations", "readonly");
        const request = transaction.objectStore("workspace_continuations").get(
          requestedProgramId,
        );
        request.addEventListener("error", () => reject(request.error));
        request.addEventListener("success", () => resolve(request.result ?? null));
      });
    } finally {
      database.close();
    }
  }, programId);
}

async function waitForWorkspaceHostWorkerV1(
  page: Page,
): Promise<ReturnType<Page["workers"]>[number]> {
  await expect.poll(
    () =>
      page.workers().filter((worker) => worker.url().includes("browser-workspace-host.worker"))
        .length,
  ).toBe(1);
  const worker = page.workers().find((candidate) =>
    candidate.url().includes("browser-workspace-host.worker")
  );
  if (worker === undefined) throw new Error("SillyOS Workspace Host Worker is missing");
  return worker;
}

async function waitForScaleQualificationWorkerV1(
  page: Page,
): Promise<ReturnType<Page["workers"]>[number]> {
  await expect.poll(
    () =>
      page.workers().filter((worker) =>
        worker.url().includes("browser-workspace-scale-qualification.worker.test")
      ).length,
  ).toBe(1);
  const worker = page.workers().find((candidate) =>
    candidate.url().includes("browser-workspace-scale-qualification.worker.test")
  );
  if (worker === undefined) throw new Error("Workspace scale qualification Worker is missing");
  return worker;
}

async function runWorkspaceScaleQualificationV1(
  page: Page,
  record:
    | {
      readonly method: "create";
      readonly anchor: WorkspaceScaleQualificationReceiptV1["anchor"];
    }
    | {
      readonly method: "verify";
      readonly anchor: WorkspaceScaleQualificationReceiptV1["anchor"];
      readonly expectedHead: WorkspaceScaleQualificationReceiptV1["head"];
      readonly expectedCorpusHash: string;
    },
): Promise<WorkspaceScaleQualificationReceiptV1> {
  return await page.evaluate(async (requestRecord) => {
    const exactRecord = (
      value: unknown,
      keys: readonly string[],
    ): Readonly<Record<string, unknown>> | null => {
      if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
      const names = Object.keys(value);
      if (
        names.length !== keys.length || names.some((name) => !keys.includes(name)) ||
        Object.getOwnPropertySymbols(value).length !== 0
      ) return null;
      return value as Readonly<Record<string, unknown>>;
    };
    const containsBinary = (value: unknown, visited = new Set<object>()): boolean => {
      if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return true;
      if (value instanceof Blob || value instanceof File) return true;
      if (value === null || typeof value !== "object" || visited.has(value)) return false;
      visited.add(value);
      return Object.values(value).some((entry) => containsBinary(entry, visited));
    };
    const worker = new Worker(
      new URL(
        "/src/test/browser-workspace-scale-qualification.worker.test.ts",
        location.href,
      ),
      { type: "module", name: "sillyos-e2e-workspace-scale-qualification" },
    );
    const registryOwner = globalThis as typeof globalThis & {
      sillyOsE2eScaleWorkersV1?: Worker[];
    };
    registryOwner.sillyOsE2eScaleWorkersV1 ??= [];
    registryOwner.sillyOsE2eScaleWorkersV1.push(worker);
    const requestId = requestRecord.method === "create" ? 1 : 2;
    const response = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error("Workspace scale qualification Worker timed out"));
      }, 220_000);
      worker.addEventListener("message", (event) => {
        clearTimeout(timeout);
        resolve(event.data);
      }, { once: true });
      worker.addEventListener("error", (event) => {
        clearTimeout(timeout);
        event.preventDefault();
        reject(new Error("Workspace scale qualification Worker failed"));
      }, { once: true });
      worker.postMessage({
        revision: 1,
        kind: "workspace_scale_qualification_request",
        requestId,
        record: requestRecord,
      }, []);
    });
    if (containsBinary(response)) {
      throw new Error("Workspace scale qualification transferred volume bytes to the page");
    }
    const envelope = exactRecord(response, [
      "revision",
      "kind",
      "requestId",
      "ok",
      "response",
    ]);
    if (
      envelope === null || envelope.revision !== 1 ||
      envelope.kind !== "workspace_scale_qualification_response" ||
      envelope.requestId !== requestId || envelope.ok !== true
    ) throw new Error("Workspace scale qualification returned a failure or invalid envelope");
    const receipt = exactRecord(envelope.response, [
      "method",
      "anchor",
      "head",
      "fileCount",
      "totalBytes",
      "corpusHash",
      "ioMaximums",
    ]);
    const anchor = exactRecord(receipt?.anchor, [
      "revision",
      "programId",
      "workspaceId",
      "volumeId",
      "workspaceFormat",
    ]);
    const head = exactRecord(receipt?.head, [
      "revision",
      "volumeId",
      "workspaceFormat",
      "checkpointId",
      "generation",
    ]);
    const ioMaximums = exactRecord(receipt?.ioMaximums, [
      "sourceRangeBytes",
      "readRangeBytes",
      "observedChunkBytes",
      "observedBytesInFlight",
    ]);
    const numericMaximums = ioMaximums === null ? [] : Object.values(ioMaximums);
    if (
      receipt === null || anchor === null || head === null || ioMaximums === null ||
      receipt.method !== requestRecord.method || anchor.revision !== 1 ||
      anchor.programId !== requestRecord.anchor.programId ||
      anchor.workspaceId !== requestRecord.anchor.workspaceId ||
      anchor.volumeId !== requestRecord.anchor.volumeId || anchor.workspaceFormat !== 1 ||
      head.revision !== 1 || head.volumeId !== requestRecord.anchor.volumeId ||
      head.workspaceFormat !== 1 || typeof head.checkpointId !== "string" ||
      head.generation !== 1002 || receipt.fileCount !== 1001 ||
      receipt.totalBytes !== 21897216 || typeof receipt.corpusHash !== "string" ||
      !/^[a-f0-9]{64}$/u.test(receipt.corpusHash) ||
      numericMaximums.length !== 4 ||
      !numericMaximums.every((value) => Number.isSafeInteger(value) && (value as number) >= 0) ||
      ioMaximums.sourceRangeBytes !== (requestRecord.method === "create" ? 1_048_576 : 0) ||
      ioMaximums.readRangeBytes !== 1_048_576 ||
      ioMaximums.observedChunkBytes !== 1_048_576 ||
      (ioMaximums.observedBytesInFlight as number) <= 0 ||
      (ioMaximums.observedBytesInFlight as number) > 4_194_304
    ) throw new Error("Workspace scale qualification returned invalid bounded metadata");
    if (
      requestRecord.method === "verify" &&
      (receipt.corpusHash !== requestRecord.expectedCorpusHash ||
        head.checkpointId !== requestRecord.expectedHead.checkpointId)
    ) throw new Error("Workspace scale qualification did not cold-open the exact checkpoint");
    return receipt as unknown as WorkspaceScaleQualificationReceiptV1;
  }, record);
}

async function readDurableProgramV3(
  page: Page,
  programId: string,
): Promise<DurableProgramProjectionV3 | null> {
  return await page.evaluate(async (requestedProgramId) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sillymaker.example-silly-os.programs");
      request.addEventListener("error", () => reject(request.error));
      request.addEventListener("success", () => resolve(request.result));
    });
    try {
      return await new Promise<DurableProgramProjectionV3 | null>((resolve, reject) => {
        const transaction = database.transaction("programs", "readonly");
        const request = transaction.objectStore("programs").get(requestedProgramId);
        request.addEventListener("error", () => reject(request.error));
        request.addEventListener("success", () => resolve(request.result ?? null));
      });
    } finally {
      database.close();
    }
  }, programId);
}

async function readProgramDatabaseStateV4(page: Page): Promise<DurableProgramDatabaseStateV4> {
  return await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sillymaker.example-silly-os.programs");
      request.addEventListener("error", () => reject(request.error));
      request.addEventListener("success", () => resolve(request.result));
    });
    try {
      const transaction = database.transaction(
        ["programs", "workspace_continuations"],
        "readonly",
      );
      const readAllV1 = (storeName: string): Promise<unknown[]> =>
        new Promise((resolve, reject) => {
          const request = transaction.objectStore(storeName).getAll();
          request.addEventListener("error", () => reject(request.error));
          request.addEventListener("success", () => resolve(request.result));
        });
      const [programRows, continuationRows] = await Promise.all([
        readAllV1("programs"),
        readAllV1("workspace_continuations"),
      ]);
      return {
        version: database.version,
        programRows,
        continuationRows,
      } as DurableProgramDatabaseStateV4;
    } finally {
      database.close();
    }
  });
}

async function openRecentTranslationProgramV1(
  page: Page,
  expected: {
    readonly programId: string;
    readonly revision: number;
    readonly status: "Program accepted" | "Preview" | "Proposal rejected";
  },
): Promise<Locator> {
  const recentProgram = page.getByRole("button", {
    name: "Open program: Translation Workshop",
    exact: true,
  });
  await expect(recentProgram).toBeVisible();
  await expect(recentProgram).toHaveAttribute("data-program-id", expected.programId);
  await expect(recentProgram).toContainText(
    `v${String(expected.revision)} · ${expected.status}`,
  );
  await recentProgram.click();

  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectProgramStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-program-id", expected.programId);
  await expect(workspace).toHaveAttribute("data-program-revision", String(expected.revision));
  return workspace;
}

async function expectNoPageOverflowV1(page: Page): Promise<void> {
  const overflow = await page.evaluate<{ body: number; document: number }>(
    `({
      body: document.body.scrollWidth - document.body.clientWidth,
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    })`,
  );
  expect(overflow.document).toBeLessThanOrEqual(1);
  expect(overflow.body).toBeLessThanOrEqual(1);
}

const openAIResponsesProbeUrlV1 = "https://api.openai.com/v1/responses";
const browserProviderSettingsStorageKeyV1 = "sillymaker.example-silly-os.provider-settings.v1";

interface OpenAIResponsesProbeRequestV1 {
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

function successfulOpenAIResponsesProbeSseV1(): string {
  const completedMessage = {
    id: "msg_sillyos_provider_probe",
    type: "message",
    status: "completed",
    role: "assistant",
    content: [{ type: "output_text", text: "OK", annotations: [], logprobs: [] }],
  };
  const events = [
    {
      type: "response.created",
      sequence_number: 0,
      response: { id: "resp_sillyos_provider_probe", status: "in_progress" },
    },
    {
      type: "response.output_item.added",
      sequence_number: 1,
      output_index: 0,
      item: { ...completedMessage, status: "in_progress", content: [] },
    },
    {
      type: "response.output_text.delta",
      sequence_number: 2,
      item_id: completedMessage.id,
      output_index: 0,
      content_index: 0,
      delta: "OK",
      logprobs: [],
    },
    {
      type: "response.output_item.done",
      sequence_number: 3,
      output_index: 0,
      item: completedMessage,
    },
    {
      type: "response.completed",
      sequence_number: 4,
      response: {
        id: "resp_sillyos_provider_probe",
        status: "completed",
        output: [completedMessage],
        usage: {
          input_tokens: 4,
          input_tokens_details: { cached_tokens: 0 },
          output_tokens: 1,
          output_tokens_details: { reasoning_tokens: 0 },
          total_tokens: 5,
        },
      },
    },
  ];
  return `${events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")}data: [DONE]\n\n`;
}

async function routeSuccessfulOpenAIResponsesProbeV1(
  page: Page,
  probeUrl = openAIResponsesProbeUrlV1,
): Promise<OpenAIResponsesProbeRequestV1[]> {
  const observed: OpenAIResponsesProbeRequestV1[] = [];
  const appOrigin = new URL(sillyOsTargetUrlV1()).origin;
  await page.context().route(probeUrl, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": appOrigin,
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": request.headers()["access-control-request-headers"] ??
            "authorization, content-type",
          vary: "Origin",
        },
      });
      return;
    }
    observed.push({
      method: request.method(),
      headers: request.headers(),
      body: request.postData() ?? "",
    });
    await route.fulfill({
      status: 200,
      headers: {
        "access-control-allow-origin": appOrigin,
        "access-control-expose-headers": "request-id",
        "cache-control": "no-store",
        "content-type": "text/event-stream; charset=utf-8",
        "request-id": "req_sillyos_provider_probe",
        vary: "Origin",
      },
      body: successfulOpenAIResponsesProbeSseV1(),
    });
  });
  return observed;
}

test("ordinary Browser Settings verifies a built-in Pi connection and preserves mobile navigation", async ({ durableProgramPage: page }) => {
  const sentinel = "sillyos-provider-settings-session-key";
  const observedNetwork: string[] = [];
  const observedConsole: string[] = [];
  const providerProbeRequests = await routeSuccessfulOpenAIResponsesProbeV1(page);
  page.on("request", (request) => {
    if (request.url() === openAIResponsesProbeUrlV1) return;
    observedNetwork.push(
      `${request.url()}\n${request.postData() ?? ""}\n${JSON.stringify(request.headers())}`,
    );
  });
  page.on("console", (message) => observedConsole.push(message.text()));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(sillyOsTargetUrlV1("?locale=en"));
  await expectProgramStorageReadyV1(page);
  const providerWarning = page.locator('[data-pi-agent-runtime="pi_provider"]');
  await expect(providerWarning).toHaveAttribute("data-pi-agent-status", "available");
  await expect(providerWarning).toContainText("API key required");
  await expect(providerWarning).toContainText("Settings");
  const homeSettings = page.locator('[data-open-settings="home"]');
  await providerWarning.click();

  const settings = page.locator('[data-silly-os-view="settings"]');
  const globalBack = page.getByRole("button", { name: "Back to Agent Creator" });
  await expect(settings).toBeVisible();
  await expect(globalBack).toBeFocused();
  await expect(page.locator('[data-provider-id="openai"]')).toHaveAttribute(
    "data-availability",
    "qualified",
  );
  await expect(page.locator('[data-provider-id="anthropic"]')).toHaveAttribute(
    "data-availability",
    "qualified",
  );
  for (const providerId of ["google", "deepseek", "xai"]) {
    await expect(page.locator(`[data-provider-id="${providerId}"]`)).toHaveAttribute(
      "data-availability",
      "qualified",
    );
  }
  await expect(page.locator('[data-provider-id="openrouter"]')).toHaveAttribute(
    "data-availability",
    "candidate",
  );
  const globalBackBox = await globalBack.boundingBox();
  expect(globalBackBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(globalBackBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  const localeButtons = page.locator(".silly-os-settings__topbar .silly-os-locale button");
  for (let index = 0; index < await localeButtons.count(); index += 1) {
    const box = await localeButtons.nth(index).boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await expectNoPageOverflowV1(page);

  await expect(page.getByRole("heading", { name: "Built-in Providers" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Custom Endpoints" })).toBeVisible();
  await page.locator('[data-provider-id="anthropic"]').click();
  await expect(
    page.locator('[data-model-id="claude-sonnet-4-5-20250929"] input'),
  ).toBeEnabled();
  await expect(page.locator('[data-model-id="claude-sonnet-4-5"]')).toHaveAttribute(
    "data-availability",
    "candidate",
  );
  await expect(page.locator('[data-model-id="claude-sonnet-4-5"] input')).toBeDisabled();
  await page.getByRole("button", { name: "Back to Providers" }).click();

  await page.locator('[data-provider-id="openrouter"]').click();
  await expect(
    page.locator('[data-model-id="google/gemini-2.5-flash"] input'),
  ).toBeDisabled();
  await expect(page.getByLabel("API key (memory only)")).toHaveCount(0);
  await page.getByRole("button", { name: "Back to Providers" }).click();

  await page.locator('[data-provider-id="openai"]').click();
  await expect(page.getByRole("button", { name: "Back to Providers" })).toBeFocused();
  const qualifiedModel = page.locator('[data-model-id="gpt-4.1-nano"] input');
  await expect(qualifiedModel).toBeChecked();
  const endpoint = page.locator(
    '.provider-settings__endpoint input[aria-label="Endpoint"]',
  );
  await expect(endpoint).toHaveValue("https://api.openai.com/v1");
  await expect(endpoint).toHaveAttribute("data-endpoint-editable", "false");
  await expect(endpoint).not.toBeEditable();
  expect(
    await page.locator('[data-connection-target="builtin:openai:gpt-4.1-nano"]').evaluate(
      (connection) => {
        const models = document.querySelector("#models-title")?.closest("section");
        return models !== null && models !== undefined &&
          (connection.compareDocumentPosition(models) & 4) !== 0;
      },
    ),
  ).toBe(true);
  const keyInput = page.getByLabel("API key (memory only)");
  await expect(keyInput).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show API key" }).click();
  await expect(keyInput).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide API key" }).click();
  await keyInput.fill(sentinel);
  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(keyInput).toHaveCount(0);
  await expect(page.getByText("Agent Creator connected", { exact: true })).toBeVisible();
  expect(providerProbeRequests).toHaveLength(1);
  expect(providerProbeRequests[0]?.method).toBe("POST");
  expect(providerProbeRequests[0]?.headers.authorization).toBe(`Bearer ${sentinel}`);
  const probeBody = JSON.parse(providerProbeRequests[0]?.body ?? "null") as {
    readonly model?: unknown;
    readonly stream?: unknown;
    readonly store?: unknown;
    readonly tool_choice?: unknown;
    readonly max_output_tokens?: unknown;
    readonly input?: unknown;
  };
  expect(probeBody).toMatchObject({
    model: "gpt-4.1-nano",
    stream: true,
    store: false,
    max_output_tokens: 16,
  });
  expect(probeBody.tool_choice).toBeUndefined();
  expect(JSON.stringify(probeBody.input)).toContain("Reply with OK.");
  await globalBack.click();
  await expect(homeSettings).toBeFocused();
  await expect(providerWarning).toHaveCount(0);

  const creatorIntent = page.getByRole("textbox", { name: "What would you like to make?" });
  await creatorIntent.fill(translationIntentV1);
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  const programId = await readProgramIdV1(workspace);
  const workspaceSettings = page.locator('[data-open-settings="workspace"]');
  await workspaceSettings.click();
  await expect(settings).toBeVisible();
  await expect(globalBack).toBeFocused();
  await globalBack.click();
  await expect(workspace).toHaveAttribute("data-program-id", programId);
  await expect(workspaceSettings).toBeFocused();

  await workspaceSettings.click();
  await page.locator('[data-provider-id="openai"]').click();
  await expect(page.getByText("Agent Creator connected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Forget key" }).click();
  await expect(page.getByLabel("API key (memory only)")).toBeVisible();
  await globalBack.click();
  await page.getByRole("button", { name: "Creator home" }).click();
  await expect(providerWarning).toHaveAttribute("data-pi-agent-status", "available");
  await expect(providerWarning).toContainText("API key required");
  await expectNoPageOverflowV1(page);

  expect(observedNetwork.join("\n")).not.toContain(sentinel);
  expect(observedConsole.join("\n")).not.toContain(sentinel);
  expect(await page.content()).not.toContain(sentinel);
  const persistentBrowserState = await page.evaluate(() => {
    const entries: [string, string | null][] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key !== null) entries.push([key, localStorage.getItem(key)]);
    }
    return entries;
  });
  expect(JSON.stringify(persistentBrowserState)).not.toContain(sentinel);
});

test("ordinary Browser Settings adds, reloads, and removes a non-secret custom endpoint profile", async ({ durableProgramPage: page }) => {
  const customName = "Team inference gateway";
  const customEndpoint = "https://inference.example.test/v1";
  const customModel = "team-model-v2";
  const customSentinel = "sillyos-custom-provider-session-key";
  const customProbeRequests = await routeSuccessfulOpenAIResponsesProbeV1(
    page,
    `${customEndpoint}/responses`,
  );

  await page.goto(sillyOsTargetUrlV1("?locale=en"));
  await expectProgramStorageReadyV1(page);
  const providerWarning = page.locator('[data-pi-agent-runtime="pi_provider"]');
  await expect(providerWarning).toHaveAttribute("data-pi-agent-status", "available");
  await providerWarning.click();
  await expect(page.locator('[data-silly-os-view="settings"]')).toBeVisible();
  await page.locator('[data-add-custom-endpoint="true"]').click();

  await page.getByLabel("Name").fill(customName);
  await page.getByLabel("Pi API family").selectOption("openai-responses");
  await page.locator('.provider-settings__custom-form input[name="baseUrl"]').fill(
    `${customEndpoint}/`,
  );
  await page.getByLabel("Model ID").fill(customModel);
  await page.getByLabel("Context window").fill("131072");
  await page.getByLabel("Maximum output tokens").fill("8192");
  await page.getByRole("button", { name: "Save endpoint" }).click();

  const customProfile = page.locator("[data-custom-profile-id]");
  await expect(customProfile).toHaveCount(1);
  await expect(customProfile).toContainText(customName);
  await expect(customProfile).toHaveAttribute("data-connection-status", "untested");
  await expect(page.getByRole("heading", { name: customName })).toBeVisible();
  const savedEndpoint = page.locator(
    '.provider-settings__endpoint input[aria-label="Endpoint"]',
  );
  await expect(savedEndpoint).toHaveValue(customEndpoint);
  await expect(savedEndpoint).toHaveAttribute(
    "data-endpoint-editable",
    "custom-profile",
  );
  await expect(savedEndpoint).not.toBeEditable();
  await expect(page.getByText(customModel, { exact: true }).first()).toBeVisible();

  const customKeyInput = page.getByLabel("API key (memory only)");
  await customKeyInput.fill(customSentinel);
  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(customKeyInput).toHaveCount(0);
  const customConnection = page.locator(
    `.provider-settings__connection[data-connection-phase="ready"]`,
  );
  await expect(customConnection).toContainText("Verified in this browser");
  await expect(customConnection).toContainText(`${customName} · ${customModel}`);
  await expect(customProfile).toHaveAttribute("data-connection-status", "verified");
  expect(customProbeRequests).toHaveLength(1);
  expect(customProbeRequests[0]?.method).toBe("POST");
  expect(customProbeRequests[0]?.headers.authorization).toBe(`Bearer ${customSentinel}`);
  const customProbeBody = JSON.parse(customProbeRequests[0]?.body ?? "null") as {
    readonly tool_choice?: unknown;
  };
  expect(customProbeBody).toMatchObject({
    model: customModel,
    stream: true,
    store: false,
    max_output_tokens: 16,
  });
  expect(customProbeBody.tool_choice).toBeUndefined();

  const savedProfile = await page.evaluate((storageKey) => {
    const serialized = localStorage.getItem(storageKey);
    return serialized === null ? null : JSON.parse(serialized) as unknown;
  }, browserProviderSettingsStorageKeyV1);
  expect(savedProfile).toMatchObject({
    revision: 1,
    customProfiles: [{
      displayName: customName,
      api: "openai-responses",
      baseUrl: customEndpoint,
      modelId: customModel,
      contextWindow: 131_072,
      maxTokens: 8_192,
    }],
  });
  expect(JSON.stringify(savedProfile).toLocaleLowerCase()).not.toContain("api_key");
  expect(JSON.stringify(savedProfile).toLocaleLowerCase()).not.toContain("apikey");
  expect(JSON.stringify(savedProfile)).not.toContain(customSentinel);
  expect(await page.content()).not.toContain(customSentinel);

  await page.getByRole("button", { name: "Forget key" }).click();
  await expect(page.getByLabel("API key (memory only)")).toBeVisible();
  await expect(customProfile).toHaveAttribute("data-connection-status", "untested");

  await page.reload();
  await expectProgramStorageReadyV1(page);
  await expect(providerWarning).toHaveAttribute("data-pi-agent-status", "available");
  await providerWarning.click();
  const reloadedProfile = page.locator("[data-custom-profile-id]");
  await expect(reloadedProfile).toHaveCount(1);
  await expect(reloadedProfile).toContainText(customName);
  await reloadedProfile.click();
  await expect(
    page.locator('.provider-settings__endpoint input[aria-label="Endpoint"]'),
  ).toHaveValue(customEndpoint);
  await expect(page.getByText("131,072", { exact: true })).toBeVisible();
  await expect(page.getByText("8,192", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Remove" }).click();
  await expect(reloadedProfile).toHaveCount(0);
  expect(
    await page.evaluate(
      (storageKey) => localStorage.getItem(storageKey),
      browserProviderSettingsStorageKeyV1,
    ),
  ).toBeNull();

  await page.reload();
  await expectProgramStorageReadyV1(page);
  await expect(providerWarning).toHaveAttribute("data-pi-agent-status", "available");
  await providerWarning.click();
  await expect(page.locator("[data-custom-profile-id]")).toHaveCount(0);
  await expect(page.getByText("Add an HTTPS endpoint", { exact: true })).toBeVisible();
});

test("Creator Home persists and reopens an exact accepted Program", async ({ durableProgramPage: page }) => {
  const workspace = await openTranslationWorkspaceV1(page);
  const programId = await readProgramIdV1(workspace);
  await expect(workspace).toHaveAttribute("data-program-revision", "1");

  await expect(page.getByRole("button", { name: "Accept program" })).toBeVisible();
  await page.getByRole("button", { name: "Accept program" }).click();
  await expectProgramStorageReadyV1(page);
  await expect(page.getByText("Program accepted", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept program" })).toHaveCount(0);

  await page.getByRole("tab", { name: "Source" }).click();
  await expect(page.getByLabel("Program preview source")).toContainText("defineProgram");

  await page.getByRole("tab", { name: "Capabilities" }).click();
  await expect(page.getByRole("heading", { name: "Capabilities" })).toBeVisible();
  await expect(page.getByText("Not connected", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
  await expect(page.getByText("Accepted Program proposal v1", { exact: true })).toBeVisible();
  await expectNoPageOverflowV1(page);

  await page.getByRole("button", { name: "Creator home" }).click();
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expectProgramStorageReadyV1(page);
  await page.reload();
  await expectProgramStorageReadyV1(page);
  await expect(page.getByRole("heading", { name: "Recent programs", level: 2 })).toBeVisible();

  await openRecentTranslationProgramV1(page, {
    programId,
    revision: 1,
    status: "Program accepted",
  });
  await expect(page.locator('[data-proposal-status="accepted"]')).toBeVisible();
  await expect(page.getByText(translationIntentV1, { exact: true })).toBeVisible();
  await expect(page.getByText("Program accepted", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept program" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Source" }).click();
  await expect(page.getByLabel("Program preview source")).toContainText("revision: 1");
  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByText("Accepted Program proposal v1", { exact: true })).toBeVisible();
});

test("a follow-up creates a new exact Program revision for review", async ({ durableProgramPage: page }) => {
  await openTranslationWorkspaceV1(page);

  await page.getByRole("button", { name: "Reject proposal" }).click();
  await expect(page.getByText("Proposal rejected", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Reject proposal" })).toHaveCount(0);

  const followUp = "Use a warmer voice for the protagonist.";
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(followUp);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(
    page.locator('[data-chat-role="user"]').getByText(followUp, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/I incorporated that follow-up into .* proposal v2/u),
  ).toBeVisible();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(page.getByRole("button", { name: "Accept program" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reject proposal" })).toBeVisible();

  await page.getByRole("tab", { name: "Source" }).click();
  const source = page.getByLabel("Program preview source");
  await expect(source).toContainText("revision: 2");
  await expect(source).toContainText(followUp);

  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByText("Rejected Program proposal v1", { exact: true })).toBeVisible();
  await expect(page.getByText("Added a creator follow-up", { exact: true })).toBeVisible();
  await expect(page.getByText("Created Program proposal v2", { exact: true })).toBeVisible();
});

test("two pages keep the durable winner when one submits a stale revision", async ({ durableProgramPage: page }) => {
  const firstWorkspace = await openTranslationWorkspaceV1(page);
  const programId = await readProgramIdV1(firstWorkspace);

  const stalePage = await page.context().newPage();
  await stalePage.goto(sillyOsTargetUrlV1("?locale=en"));
  await expectProgramStorageReadyV1(stalePage);
  const staleWorkspace = await openRecentTranslationProgramV1(stalePage, {
    programId,
    revision: 1,
    status: "Preview",
  });

  const winningFollowUp = "Preserve the winner selected by the first page.";
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(winningFollowUp);
  await page.getByRole("button", { name: "Send" }).click();
  await expectProgramStorageReadyV1(page);
  await expect(firstWorkspace).toHaveAttribute("data-program-revision", "2");

  const staleFollowUp = "This stale page must not replace the durable winner.";
  await stalePage.getByRole("textbox", { name: "Ask for a change…" }).fill(staleFollowUp);
  await stalePage.getByRole("button", { name: "Send" }).click();
  await expect(stalePage.locator('[data-program-storage-state="failed"]')).toBeVisible();
  await expect(
    stalePage.getByRole("alert").filter({
      hasText: "Another page updated this Program. The durable version has been reopened.",
    }),
  ).toBeVisible();
  await expect(staleWorkspace).toHaveAttribute("data-program-revision", "2");
  await expect(stalePage.getByText(winningFollowUp, { exact: true })).toBeVisible();
  await expect(
    stalePage.locator('[data-chat-role="user"]').getByText(staleFollowUp, { exact: true }),
  ).toHaveCount(0);
  await stalePage.close();
});

test("the query-gated Browser Pi Worker cold-reopens its Program workspace without retaining its test key", async ({ durableProgramPage: page }) => {
  const sentinel = "sillyos-browser-pi-sentinel-key";
  const observedNetwork: string[] = [];
  const observedConsole: string[] = [];
  page.on("request", (request) => {
    observedNetwork.push(
      `${request.url()}\n${request.postData() ?? ""}\n${JSON.stringify(request.headers())}`,
    );
  });
  page.on("console", (message) => observedConsole.push(message.text()));

  await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
  await expectProgramStorageReadyV1(page);
  await expect(page.getByRole("heading", { name: "What would you like to make?", level: 1 }))
    .toBeVisible();
  await expect(page.getByText("Browser Pi wiring check", { exact: true })).toBeVisible();

  const creatorIntent = page.getByRole("textbox", { name: "What would you like to make?" });
  await creatorIntent.fill(translationIntentV1);
  await creatorIntent.press("Enter");
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expect(page.getByRole("main", { name: "SillyOS program workspace" })).toHaveCount(0);

  const keyInput = page.getByLabel("Synthetic test key (memory only)");
  await keyInput.fill(sentinel);
  await page.getByRole("button", { name: "Initialize Pi test" }).click();
  await expect(keyInput).toHaveValue("");
  await expect(page.getByText("Pi test ready", { exact: true })).toBeVisible();

  await creatorIntent.fill(translationIntentV1);
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectProgramStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "open");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "1");
  const programId = await readProgramIdV1(workspace);
  const firstWorkspaceSessionId = await readWorkspaceSessionIdV1(workspace);

  const followUp = "Make every review decision explicit.";
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(followUp);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(followUp, { exact: true })).toBeVisible();
  await expect(
    page.locator('[data-chat-role="creator"]').getByText(
      "Deterministic test proposal ready.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "4");
  await expect(workspace).toHaveAttribute("data-execution-workspace-tool", "bash");
  await expect(workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  await expect(workspace).toHaveAttribute(
    "data-execution-workspace-path",
    ".sillyos/p3a-bash-round-trip.txt",
  );

  await page.getByRole("tab", { name: "Source" }).click();
  await expect(page.getByLabel("Program preview source")).toContainText("revision: 2");
  await expect(page.getByLabel("Program preview source")).toContainText(followUp);
  await page.getByRole("tab", { name: "Capabilities" }).click();
  await expect(page.getByText("Pi 0.84.3 test wiring", { exact: true })).toBeVisible();
  await expect(page.getByText("Program workspace checkpoint", { exact: true })).toBeVisible();
  await expect(page.getByText("Open · generation 4", { exact: true })).toBeVisible();
  await expect(page.getByText("Last bash: succeeded / changed", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Creator home" }).click();
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expectProgramStorageReadyV1(page);
  await expect(page.locator(".silly-os")).toHaveAttribute("data-agent-workspace-state", "closed");
  await page.reload();
  await expectProgramStorageReadyV1(page);
  await expect(page.getByRole("heading", { name: "Recent programs", level: 2 })).toBeVisible();

  const recentProgram = page.getByRole("button", {
    name: "Open program: Translation Workshop",
    exact: true,
  });
  await expect(recentProgram).toHaveAttribute("data-program-id", programId);
  await expect(recentProgram).toContainText("v2 · Preview");
  await expect(recentProgram).toBeDisabled();

  const reloadedKeyInput = page.getByLabel("Synthetic test key (memory only)");
  await reloadedKeyInput.fill(sentinel);
  await page.getByRole("button", { name: "Initialize Pi test" }).click();
  await expect(reloadedKeyInput).toHaveValue("");
  await expect(page.getByText("Pi test ready", { exact: true })).toBeVisible();

  await openRecentTranslationProgramV1(page, {
    programId,
    revision: 2,
    status: "Preview",
  });
  const reopenedWorkspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(reopenedWorkspace).toHaveAttribute("data-execution-workspace-state", "open");
  await expect(reopenedWorkspace).toHaveAttribute("data-execution-workspace-generation", "4");
  await expect(reopenedWorkspace).not.toHaveAttribute(
    "data-execution-workspace-session",
    firstWorkspaceSessionId,
  );
  const reopenedWorkspaceSessionId = await readWorkspaceSessionIdV1(reopenedWorkspace);
  await expect(reopenedWorkspace).not.toHaveAttribute("data-execution-workspace-receipt", /.+/u);
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(page.getByText(followUp, { exact: true })).toBeVisible();
  await expect(
    page.locator('[data-chat-role="creator"]').getByText(
      "Deterministic test proposal ready.",
      { exact: true },
    ),
  ).toBeVisible();
  const persistenceProbe = `Verify the persisted workspace contains exactly: ${followUp}`;
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(persistenceProbe);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(persistenceProbe, { exact: true })).toBeVisible();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v3");
  await expect(reopenedWorkspace).toHaveAttribute("data-execution-workspace-generation", "4");
  await expect(reopenedWorkspace).not.toHaveAttribute("data-execution-workspace-receipt", /.+/u);

  await page.getByRole("tab", { name: "Source" }).click();
  await expect(page.getByLabel("Program preview source")).toContainText("revision: 3");
  await expect(page.getByLabel("Program preview source")).toContainText(followUp);
  await expect(page.getByLabel("Program preview source")).toContainText(persistenceProbe);

  const completedAggregate = await readDurableProgramV3(page, programId);
  if (completedAggregate === null) throw new Error("expected durable Program aggregate");
  expect(completedAggregate).toMatchObject({ schemaVersion: 3, programId });
  expect(completedAggregate.agentRunReceipts).toHaveLength(2);
  const completedReceipt = completedAggregate.agentRunReceipts[0];
  expect(Object.keys(completedReceipt ?? {}).sort()).toEqual([
    "agentRunId",
    "baseProgramRevision",
    "baseRepositoryRevision",
    "creatorMessageId",
    "diagnosticCode",
    "outcome",
    "proposalId",
    "resultingProgramRevision",
    "sequence",
    "userMessageId",
  ].sort());
  expect(completedReceipt).toMatchObject({
    sequence: 1,
    outcome: "completed",
    baseProgramRevision: 1,
    baseRepositoryRevision: 1,
    resultingProgramRevision: 2,
    diagnosticCode: null,
  });
  expect(
    completedAggregate.snapshot.messages.find(({ messageId }) =>
      messageId === completedReceipt?.userMessageId
    ),
  ).toMatchObject({ role: "user", text: followUp });
  expect(
    completedAggregate.snapshot.messages.find(({ messageId }) =>
      messageId === completedReceipt?.creatorMessageId
    ),
  ).toMatchObject({ role: "creator", text: "Deterministic test proposal ready." });
  const persistenceReceipt = completedAggregate.agentRunReceipts[1];
  expect(persistenceReceipt).toMatchObject({
    sequence: 2,
    outcome: "completed",
    baseProgramRevision: 2,
    baseRepositoryRevision: 2,
    resultingProgramRevision: 3,
    diagnosticCode: null,
  });
  expect(
    completedAggregate.snapshot.messages.find(({ messageId }) =>
      messageId === persistenceReceipt?.userMessageId
    ),
  ).toMatchObject({ role: "user", text: persistenceProbe });

  const durableProjection = await page.evaluate(async () => {
    const storageValues = [
      ...Object.entries(localStorage),
      ...Object.entries(sessionStorage),
    ];
    const indexedDbValues: unknown[] = [];
    if (typeof indexedDB.databases === "function") {
      for (const database of await indexedDB.databases()) {
        const databaseName = database.name;
        if (databaseName === undefined) continue;
        const opened = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(databaseName);
          request.addEventListener("error", () => reject(request.error));
          request.addEventListener("success", () => resolve(request.result));
        });
        try {
          const storeNames = [...opened.objectStoreNames];
          for (const storeName of storeNames) {
            const transaction = opened.transaction(storeName, "readonly");
            const values = await new Promise<unknown[]>((resolve, reject) => {
              const request = transaction.objectStore(storeName).getAll();
              request.addEventListener("error", () => reject(request.error));
              request.addEventListener("success", () => resolve(request.result));
            });
            indexedDbValues.push(...values);
          }
        } finally {
          opened.close();
        }
      }
    }
    const cacheValues: string[] = [];
    if ("caches" in globalThis) {
      for (const cacheName of await caches.keys()) {
        const cache = await caches.open(cacheName);
        for (const request of await cache.keys()) {
          cacheValues.push(request.url);
          const response = await cache.match(request);
          if (response !== undefined) cacheValues.push(await response.clone().text());
        }
      }
    }
    return JSON.stringify({
      url: location.href,
      document: document.documentElement.outerHTML,
      storageValues,
      indexedDbValues,
      cacheValues,
    });
  });
  expect(durableProjection).not.toContain(sentinel);
  expect(observedNetwork.join("\n")).not.toContain(sentinel);
  expect(observedConsole.join("\n")).not.toContain(sentinel);

  await page.getByRole("button", { name: "Forget test key" }).click();
  await expect(page.getByRole("button", { name: "Forget test key" })).toHaveCount(0);

  await page.getByRole("button", { name: "Creator home" }).click();
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  const replacementKeyInput = page.getByLabel("Synthetic test key (memory only)");
  await replacementKeyInput.fill("sillyos-browser-pi-reinitialize-key");
  await page.getByRole("button", { name: "Initialize Pi test" }).click();
  await expect(page.getByText("Pi test ready", { exact: true })).toBeVisible();
  const replacedWorkspace = await openRecentTranslationProgramV1(page, {
    programId,
    revision: 3,
    status: "Preview",
  });
  await expect(replacedWorkspace).toHaveAttribute("data-execution-workspace-state", "open");
  await expect(replacedWorkspace).toHaveAttribute("data-execution-workspace-generation", "4");
  await expect(replacedWorkspace).not.toHaveAttribute(
    "data-execution-workspace-session",
    reopenedWorkspaceSessionId,
  );
  await page.getByRole("button", { name: "Creator home" }).click();
  await expect(page.locator(".silly-os")).toHaveAttribute("data-agent-workspace-state", "closed");
});

test("two pages fence first ownership and cold-recover the exact checkpoint after Workspace Host loss", async ({ durableProgramPage: page }) => {
  test.setTimeout(120_000);
  const initialWorkspace = await openTranslationWorkspaceV1(page);
  const programId = await readProgramIdV1(initialWorkspace);
  const initialContinuation = await readWorkspaceContinuationV1(page, programId);
  expect(initialContinuation).toMatchObject({
    revision: 1,
    programId,
    workspaceFormat: 1,
    programRevision: 1,
    repositoryRevision: 1,
  });
  await page.getByRole("button", { name: "Creator home" }).click();

  const contenderPage = await page.context().newPage();
  await Promise.all([
    page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test")),
    contenderPage.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test")),
  ]);
  await Promise.all([
    expectProgramStorageReadyV1(page),
    expectProgramStorageReadyV1(contenderPage),
  ]);
  await Promise.all([
    initializePiTestV1(page, "sillyos-first-owner-a"),
    initializePiTestV1(contenderPage, "sillyos-first-owner-b"),
  ]);

  const firstRecent = page.getByRole("button", {
    name: "Open program: Translation Workshop",
    exact: true,
  });
  const secondRecent = contenderPage.getByRole("button", {
    name: "Open program: Translation Workshop",
    exact: true,
  });
  await Promise.all([expect(firstRecent).toBeEnabled(), expect(secondRecent).toBeEnabled()]);
  await Promise.all([firstRecent.click(), secondRecent.click()]);

  const first = {
    page,
    workspace: page.getByRole("main", { name: "SillyOS program workspace" }),
  };
  const second = {
    page: contenderPage,
    workspace: contenderPage.getByRole("main", { name: "SillyOS program workspace" }),
  };
  await Promise.all([
    expect(first.workspace).toBeVisible(),
    expect(second.workspace).toBeVisible(),
  ]);
  await expect.poll(async () => {
    return (await Promise.all(
      [first, second].map(async ({ workspace }) =>
        String(await workspace.getAttribute("data-execution-workspace-state")) + ":" +
        (await workspace.getAttribute("data-execution-workspace-diagnostic") ?? "")
      ),
    )).sort();
  }).toEqual(["failed:workspace_busy", "open:"]);

  const owner = await first.workspace.getAttribute("data-execution-workspace-state") === "open"
    ? first
    : second;
  const contender = owner === first ? second : first;
  await expect(owner.workspace).toHaveAttribute("data-execution-workspace-generation", "1");
  await contender.page.getByRole("tab", { name: "Capabilities" }).click();
  await expect(contender.page.getByRole("button", { name: "Retry" })).toBeVisible();
  await expect.poll(() => readWorkspaceContinuationV1(owner.page, programId)).not.toBeNull();
  const continuation = await readWorkspaceContinuationV1(owner.page, programId);
  expect(continuation).toEqual(initialContinuation);

  const durableText = "Retain these exact bytes across a real Workspace Host loss.";
  await owner.page.getByRole("textbox", { name: "Ask for a change…" }).fill(durableText);
  await owner.page.getByRole("button", { name: "Send" }).click();
  await expect(owner.page.locator('[data-pi-agent-run-status="running"]')).toHaveCount(0);
  await expect(owner.page.getByText(durableText, { exact: true })).toBeVisible();
  await expect(owner.workspace).toHaveAttribute("data-execution-workspace-generation", "4");
  await expect(owner.workspace).toHaveAttribute("data-execution-workspace-tool", "bash");
  await expect(owner.workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  const ownerSessionId = await readWorkspaceSessionIdV1(owner.workspace);

  const workspaceHost = await waitForWorkspaceHostWorkerV1(owner.page);
  const closed = workspaceHost.waitForEvent("close");
  await workspaceHost.evaluate(() => {
    setTimeout(() => {
      throw new Error("sillyos-e2e-workspace-host-crash");
    }, 0);
  });
  await closed;
  await expect(owner.workspace).toHaveAttribute("data-execution-workspace-state", "failed");
  await expect(owner.workspace).toHaveAttribute(
    "data-execution-workspace-diagnostic",
    "recovery_required",
  );
  await owner.page.getByRole("tab", { name: "Capabilities" }).click();
  await expect(owner.page.getByRole("alert")).toContainText("The Workspace Host stopped.");

  await contender.page.reload();
  await expectProgramStorageReadyV1(contender.page);
  await initializePiTestV1(contender.page, "sillyos-recovery-successor");
  const recovered = await openRecentTranslationProgramV1(contender.page, {
    programId,
    revision: 2,
    status: "Preview",
  });
  await expect(recovered).toHaveAttribute("data-execution-workspace-state", "open");
  await expect(recovered).toHaveAttribute("data-execution-workspace-generation", "4");
  await expect(recovered).not.toHaveAttribute("data-execution-workspace-session", ownerSessionId);
  await expect(recovered).not.toHaveAttribute("data-execution-workspace-receipt", /.+/u);

  const verify = "Verify the persisted workspace contains exactly: " + durableText;
  await contender.page.getByRole("textbox", { name: "Ask for a change…" }).fill(verify);
  await contender.page.getByRole("button", { name: "Send" }).click();
  await expect(contender.page.getByText(verify, { exact: true })).toBeVisible();
  await expect(contender.page.locator('[data-proposal-status="pending"]')).toContainText("v3");
  await expect(recovered).toHaveAttribute("data-execution-workspace-generation", "4");
  await expect(recovered).not.toHaveAttribute("data-execution-workspace-receipt", /.+/u);
});

test("Playwright WebKit's non-persistent context reports unavailable OPFS without substituting a workspace", async ({ page, browserName }) => {
  test.skip(browserName !== "webkit", "This is a WebKit runner-context characterization.");
  await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
  await expectProgramStorageReadyV1(page);
  await initializePiTestV1(page, "sillyos-webkit-nonpersistent-context");

  await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
    translationIntentV1,
  );
  await page.getByRole("button", { name: "Create program" }).click();
  await expect(page.locator('[data-program-storage-state="failed"]')).toBeVisible();
  await expect(page.locator(".silly-os")).toHaveAttribute(
    "data-program-storage-operation",
    "create",
  );
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expect(page.getByRole("main", { name: "SillyOS program workspace" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open program: Translation Workshop", exact: true }),
  ).toHaveCount(0);
  await expect(readProgramDatabaseStateV4(page)).resolves.toEqual({
    version: 4,
    programRows: [],
    continuationRows: [],
  });
});

test("an explicit persistence request reports the browser outcome without disabling the workspace", async ({ durableProgramPage: page }) => {
  await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
  await expectProgramStorageReadyV1(page);
  await initializePiTestV1(page, "sillyos-persistence-request");
  await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
    translationIntentV1,
  );
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "open");
  const importantWork = "Create important workspace bytes before asking for persistence.";
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(importantWork);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "4");

  await page.getByRole("tab", { name: "Capabilities" }).click();
  const storage = page.locator("[data-browser-storage-status]");
  await expect(storage).toBeVisible();
  const phase = await storage.getAttribute("data-browser-storage-status");
  if (phase === "available") {
    const persisted = await storage.getAttribute("data-browser-storage-persisted");
    const request = page.getByRole("button", { name: "Request persistent storage" });
    if (persisted === "false" && await request.count() === 1) {
      await request.click();
      await expect(storage).toHaveAttribute(
        "data-browser-storage-persistence-request",
        /^(denied|granted)$/,
      );
      const actualPersisted = await page.evaluate(async () =>
        typeof navigator.storage.persisted === "function"
          ? await navigator.storage.persisted()
          : null
      );
      expect(await storage.getAttribute("data-browser-storage-persisted")).toBe(
        actualPersisted === true ? "true" : "false",
      );
      await expect(storage).toHaveAttribute(
        "data-browser-storage-persistence-request",
        actualPersisted === true ? "granted" : "denied",
      );
    } else {
      await expect(request).toHaveCount(0);
      if (persisted === "false") {
        await expect(storage).toHaveAttribute(
          "data-browser-storage-persistence-request",
          "unavailable",
        );
      }
    }
  } else {
    expect(phase).toBe("unavailable");
    await expect(page.getByRole("button", { name: "Request persistent storage" })).toHaveCount(0);
  }
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "open");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "4");
});

test(
  "the Browser workspace cold-reopens, accepts, and retains a bounded 20 MiB corpus",
  async ({ durableProgramPage: page }, testInfo) => {
    test.setTimeout(600_000);
    await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
    await expectProgramStorageReadyV1(page);
    await initializePiTestV1(page, "sillyos-scale-qualification");
    await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
      translationIntentV1,
    );
    await page.getByRole("button", { name: "Create program" }).click();
    const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
    await expect(workspace).toHaveAttribute("data-execution-workspace-state", "open");
    await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "1");
    const programId = await readProgramIdV1(workspace);
    const continuation = await readWorkspaceContinuationV1(page, programId);
    if (continuation === null) throw new Error("Scale qualification has no Program continuation");
    const anchor: WorkspaceScaleQualificationReceiptV1["anchor"] = {
      revision: 1,
      programId: continuation.programId,
      workspaceId: continuation.workspaceId,
      volumeId: continuation.volumeId,
      workspaceFormat: 1,
    };
    await page.getByRole("button", { name: "Creator home" }).click();
    await expect(page.locator(".silly-os")).toHaveAttribute("data-agent-workspace-state", "closed");

    const created = await runWorkspaceScaleQualificationV1(page, { method: "create", anchor });
    expect(created).toMatchObject({
      method: "create",
      anchor,
      head: { generation: 1002 },
      fileCount: 1001,
      totalBytes: 21897216,
      ioMaximums: {
        sourceRangeBytes: 1_048_576,
        readRangeBytes: 1_048_576,
        observedChunkBytes: 1_048_576,
      },
    });
    const firstWorker = await waitForScaleQualificationWorkerV1(page);
    const firstClosed = firstWorker.waitForEvent("close");
    await firstWorker.evaluate(() => close());
    await firstClosed;

    const verified = await runWorkspaceScaleQualificationV1(page, {
      method: "verify",
      anchor,
      expectedHead: created.head,
      expectedCorpusHash: created.corpusHash,
    });
    expect(verified).toEqual({
      ...created,
      method: "verify",
      ioMaximums: {
        sourceRangeBytes: 0,
        readRangeBytes: 1_048_576,
        observedChunkBytes: 1_048_576,
        observedBytesInFlight: 1_048_576,
      },
    });
    const verificationWorker = await waitForScaleQualificationWorkerV1(page);
    const verificationClosed = verificationWorker.waitForEvent("close");
    await verificationWorker.evaluate(() => close());
    await verificationClosed;

    const reopened = await openRecentTranslationProgramV1(page, {
      programId,
      revision: 1,
      status: "Preview",
    });
    await expect(reopened).toHaveAttribute("data-execution-workspace-state", "open");
    await expect(reopened).toHaveAttribute("data-execution-workspace-generation", "1002");
    await expect(reopened).not.toHaveAttribute("data-execution-workspace-receipt", /.+/u);

    const exportStatus = page.locator("[data-workspace-export-status]");
    const exportStart = page.locator('[data-workspace-export-action="start"]');
    await expect(exportStatus).toHaveAttribute("data-workspace-export-status", "idle");
    await expect(exportStart).toBeEnabled();

    const workspaceHost = await waitForWorkspaceHostWorkerV1(page);
    await workspaceHost.evaluate(() => {
      const owner = globalThis as typeof globalThis & {
        sillyOsE2eRestoreExportReadV1?: () => void;
      };
      if (owner.sillyOsE2eRestoreExportReadV1 !== undefined) {
        throw new Error("Workspace export read delay is already installed");
      }
      const original = Blob.prototype.arrayBuffer;
      let delayed = false;
      Blob.prototype.arrayBuffer = async function (this: Blob): Promise<ArrayBuffer> {
        if (!delayed && this.size > 0) {
          delayed = true;
          await new Promise<void>((resolve) => setTimeout(resolve, 750));
        }
        return await original.call(this);
      };
      owner.sillyOsE2eRestoreExportReadV1 = () => {
        Blob.prototype.arrayBuffer = original;
        delete owner.sillyOsE2eRestoreExportReadV1;
      };
    });
    let cancelledDownloadCount = 0;
    const observeCancelledDownload = (): void => {
      cancelledDownloadCount += 1;
    };
    page.on("download", observeCancelledDownload);
    try {
      await exportStart.click();
      await expect(exportStatus).toHaveAttribute("data-workspace-export-status", "exporting");
      await page.locator('[data-workspace-export-action="cancel"]').click();
      await expect(exportStatus).toHaveAttribute("data-workspace-export-status", "cancelled");
      expect(cancelledDownloadCount).toBe(0);
    } finally {
      page.off("download", observeCancelledDownload);
      await workspaceHost.evaluate(() => {
        const owner = globalThis as typeof globalThis & {
          sillyOsE2eRestoreExportReadV1?: () => void;
        };
        owner.sillyOsE2eRestoreExportReadV1?.();
      });
    }
    await expect(reopened).toHaveAttribute("data-execution-workspace-generation", "1002");
    expect(await readWorkspaceContinuationV1(page, programId)).toEqual(continuation);

    await expect(exportStart).toBeEnabled();
    const downloadPromise = page.waitForEvent("download");
    await exportStart.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("translation-workshop.sillyos.zip");
    await expect(exportStatus).toHaveAttribute("data-workspace-export-status", "finalizing");
    await expect(page.locator('[data-workspace-export-action="cancel"]')).toHaveCount(0);
    const archivePath = testInfo.outputPath("translation-workshop.sillyos.zip");
    await download.saveAs(archivePath);
    expect(await download.failure()).toBeNull();
    await expect(exportStatus).toHaveAttribute("data-workspace-export-status", "download-started");
    await expect(exportStatus).toContainText("Download started");
    await expect(exportStatus).toHaveAttribute("data-workspace-export-files-completed", "1001");
    await expect(exportStatus).toHaveAttribute("data-workspace-export-files-total", "1001");
    const bytesWritten = await exportStatus.getAttribute("data-workspace-export-bytes-written");
    const bytesTotal = await exportStatus.getAttribute("data-workspace-export-bytes-total");
    expect(bytesWritten).not.toBeNull();
    expect(bytesWritten).toBe(bytesTotal);

    const archiveBytes = new Uint8Array(await readFile(archivePath));
    expect(archiveBytes.byteLength).toBeGreaterThan(created.totalBytes);
    assertQualificationArchiveV1(archiveBytes, {
      revision: 1,
      kind: "sillyos-workspace",
      exportFormat: 1,
      workspaceFormat: 1,
      programId,
      workspaceId: continuation.workspaceId,
      programRevision: continuation.programRevision,
      repositoryRevision: continuation.repositoryRevision,
      checkpointId: created.head.checkpointId,
      generation: created.head.generation,
    });
    await expect(reopened).toHaveAttribute("data-execution-workspace-generation", "1002");
    await expect(reopened).not.toHaveAttribute("data-execution-workspace-receipt", /.+/u);
    expect(await readWorkspaceContinuationV1(page, programId)).toEqual(continuation);

    const oversizedProbe =
      "Verify the qualification workspace rejects an oversized native Pi read.";
    await page.getByRole("textbox", { name: "Ask for a change…" }).fill(oversizedProbe);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(oversizedProbe, { exact: true })).toBeVisible();
    await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
    await expect(reopened).toHaveAttribute("data-execution-workspace-generation", "1002");
    await expect(reopened).not.toHaveAttribute("data-execution-workspace-receipt", /.+/u);

    const pendingV2 = await readDurableProgramV3(page, programId);
    if (pendingV2 === null) throw new Error("Scale qualification lost its durable Program");
    expect(pendingV2).toMatchObject({
      schemaVersion: 3,
      programId,
      repositoryRevision: 2,
      snapshot: {
        proposal: {
          programRevision: 2,
          status: "pending",
        },
      },
      decisions: [],
    });
    const v2Proposal = pendingV2.snapshot.proposal;
    const v2Binding = pendingV2.reviewBinding;
    if (v2Proposal === null || v2Binding === null) {
      throw new Error("Scale qualification v2 has no exact pending review binding");
    }
    expect(v2Binding).toEqual({
      proposalId: v2Proposal.proposalId,
      programId,
      programRevision: 2,
      baseAcceptedProgramRevision: null,
      repositoryRevision: 2,
      workspaceId: continuation.workspaceId,
      volumeId: continuation.volumeId,
      workspaceFormat: 1,
      checkpointId: created.head.checkpointId,
      generation: 1002,
    });
    await expect(reopened).toHaveAttribute("data-workspace-review-revision", "1");
    await expect(reopened).toHaveAttribute(
      "data-workspace-review-pending-proposal-id",
      v2Proposal.proposalId,
    );
    await expect(reopened).toHaveAttribute(
      "data-workspace-review-pending-checkpoint-id",
      created.head.checkpointId,
    );
    await expect(reopened).toHaveAttribute("data-workspace-review-pending-generation", "1002");
    await expect(reopened).toHaveAttribute("data-workspace-review-pending-status", "matches");
    await expect(reopened).toHaveAttribute(
      "data-workspace-review-mutable-checkpoint-id",
      created.head.checkpointId,
    );
    await expect(reopened).toHaveAttribute("data-workspace-review-mutable-generation", "1002");

    const stalePage = await page.context().newPage();
    await stalePage.goto(sillyOsTargetUrlV1("?locale=en"));
    await expectProgramStorageReadyV1(stalePage);
    const staleWorkspace = await openRecentTranslationProgramV1(stalePage, {
      programId,
      revision: 2,
      status: "Preview",
    });
    await expect(staleWorkspace).toHaveAttribute(
      "data-workspace-review-pending-proposal-id",
      v2Proposal.proposalId,
    );
    await expect(staleWorkspace).toHaveAttribute(
      "data-workspace-review-pending-generation",
      "1002",
    );

    await page.getByRole("button", { name: "Accept program" }).click();
    await expectProgramStorageReadyV1(page);
    await expect(page.locator('[data-proposal-status="accepted"]')).toBeVisible();
    await expect.poll(async () =>
      (await readDurableProgramV3(page, programId))?.decisions.length ?? -1
    ).toBe(1);
    const acceptedV2 = await readDurableProgramV3(page, programId);
    if (acceptedV2 === null) throw new Error("Accepted scale qualification Program is missing");
    expect(acceptedV2).toMatchObject({
      schemaVersion: 3,
      programId,
      repositoryRevision: 3,
      reviewBinding: null,
      snapshot: {
        proposal: {
          proposalId: v2Proposal.proposalId,
          programRevision: 2,
          status: "accepted",
        },
      },
    });
    const acceptedDecision = acceptedV2.decisions[0];
    if (acceptedDecision?.status !== "accepted") {
      throw new Error("Scale qualification v2 has no accepted durable decision");
    }
    expect(Object.keys(acceptedDecision).sort()).toEqual([
      "programRevision",
      "proposalId",
      "repositoryRevision",
      "snapshot",
      "status",
    ].sort());
    expect(Object.keys(acceptedDecision.snapshot).sort()).toEqual([
      "archiveBytes",
      "baseRepositoryRevision",
      "checkpointId",
      "fileCount",
      "generation",
      "programId",
      "programRevision",
      "proposalId",
      "revision",
      "snapshotId",
      "volumeId",
      "workspaceFormat",
      "workspaceId",
    ].sort());
    expect(acceptedDecision).toEqual({
      proposalId: v2Proposal.proposalId,
      programRevision: 2,
      status: "accepted",
      repositoryRevision: 3,
      snapshot: {
        revision: 1,
        snapshotId: acceptedDecision.snapshot.snapshotId,
        programId,
        workspaceId: continuation.workspaceId,
        volumeId: continuation.volumeId,
        workspaceFormat: 1,
        proposalId: v2Proposal.proposalId,
        programRevision: 2,
        baseRepositoryRevision: 2,
        checkpointId: created.head.checkpointId,
        generation: 1002,
        fileCount: 1001,
        archiveBytes: acceptedDecision.snapshot.archiveBytes,
      },
    });
    expect(acceptedDecision.snapshot.snapshotId.length).toBeGreaterThan(0);
    expect(acceptedDecision.snapshot.archiveBytes).toBeGreaterThan(created.totalBytes);
    await expect(reopened).toHaveAttribute(
      "data-workspace-review-accepted-snapshot-id",
      acceptedDecision.snapshot.snapshotId,
    );
    await expect(reopened).toHaveAttribute(
      "data-workspace-review-accepted-program-revision",
      "2",
    );
    await expect(reopened).toHaveAttribute(
      "data-workspace-review-accepted-checkpoint-id",
      created.head.checkpointId,
    );
    await expect(reopened).toHaveAttribute("data-workspace-review-accepted-generation", "1002");
    await expect(reopened).toHaveAttribute("data-workspace-review-accepted-file-count", "1001");
    await expect(reopened).toHaveAttribute(
      "data-workspace-review-accepted-archive-bytes",
      String(acceptedDecision.snapshot.archiveBytes),
    );
    await expect(reopened).toHaveAttribute("data-workspace-review-accepted-status", "matches");
    await expect(reopened).not.toHaveAttribute(
      "data-workspace-review-pending-proposal-id",
      /.+/u,
    );

    const laterDraft = "Create a later mutable draft that must remain independent of accepted v2.";
    await page.getByRole("textbox", { name: "Ask for a change…" }).fill(laterDraft);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(laterDraft, { exact: true })).toBeVisible();
    await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v3");
    await expect(reopened).toHaveAttribute("data-execution-workspace-generation", "1005");
    await expect.poll(async () =>
      (await readDurableProgramV3(page, programId))?.repositoryRevision ?? -1
    ).toBe(4);
    const laterV3 = await readDurableProgramV3(page, programId);
    if (laterV3 === null || laterV3.reviewBinding === null) {
      throw new Error("Later scale qualification draft has no durable review binding");
    }
    expect(laterV3.decisions).toEqual([acceptedDecision]);
    expect(laterV3.snapshot.proposal).toMatchObject({
      programRevision: 3,
      status: "pending",
    });
    const v3Proposal = laterV3.snapshot.proposal;
    if (v3Proposal === null) throw new Error("Later scale qualification draft has no proposal");
    expect(laterV3.reviewBinding).toEqual({
      proposalId: v3Proposal.proposalId,
      programId,
      programRevision: 3,
      baseAcceptedProgramRevision: 2,
      repositoryRevision: 4,
      workspaceId: continuation.workspaceId,
      volumeId: continuation.volumeId,
      workspaceFormat: 1,
      checkpointId: laterV3.reviewBinding.checkpointId,
      generation: 1005,
    });
    expect(laterV3.reviewBinding.checkpointId).not.toBe(created.head.checkpointId);
    await expect(reopened).toHaveAttribute(
      "data-workspace-review-accepted-snapshot-id",
      acceptedDecision.snapshot.snapshotId,
    );
    await expect(reopened).toHaveAttribute(
      "data-workspace-review-accepted-checkpoint-id",
      created.head.checkpointId,
    );
    await expect(reopened).toHaveAttribute("data-workspace-review-accepted-generation", "1002");
    await expect(reopened).toHaveAttribute("data-workspace-review-accepted-status", "changed");
    await expect(reopened).toHaveAttribute(
      "data-workspace-review-pending-proposal-id",
      v3Proposal.proposalId,
    );
    await expect(reopened).toHaveAttribute("data-workspace-review-pending-program-revision", "3");
    await expect(reopened).toHaveAttribute(
      "data-workspace-review-pending-checkpoint-id",
      laterV3.reviewBinding.checkpointId,
    );
    await expect(reopened).toHaveAttribute("data-workspace-review-pending-generation", "1005");
    await expect(reopened).toHaveAttribute("data-workspace-review-pending-status", "matches");
    await expect(reopened).toHaveAttribute(
      "data-workspace-review-mutable-checkpoint-id",
      laterV3.reviewBinding.checkpointId,
    );
    await expect(reopened).toHaveAttribute("data-workspace-review-mutable-generation", "1005");

    await stalePage.getByRole("button", { name: "Accept program" }).click();
    await expect(stalePage.locator('[data-program-storage-state="failed"]')).toBeVisible();
    await expect(
      stalePage.getByRole("alert").filter({
        hasText: "Another page updated this Program. The durable version has been reopened.",
      }),
    ).toBeVisible();
    await expect(staleWorkspace).toHaveAttribute("data-program-revision", "3");
    await expect(staleWorkspace).toHaveAttribute(
      "data-workspace-review-accepted-snapshot-id",
      acceptedDecision.snapshot.snapshotId,
    );
    await expect(staleWorkspace).toHaveAttribute(
      "data-workspace-review-accepted-checkpoint-id",
      created.head.checkpointId,
    );
    await expect(staleWorkspace).toHaveAttribute(
      "data-workspace-review-accepted-status",
      "unavailable",
    );
    await expect(staleWorkspace).toHaveAttribute(
      "data-workspace-review-pending-proposal-id",
      v3Proposal.proposalId,
    );
    await expect(staleWorkspace).toHaveAttribute(
      "data-workspace-review-pending-checkpoint-id",
      laterV3.reviewBinding.checkpointId,
    );
    await expect(staleWorkspace).toHaveAttribute(
      "data-workspace-review-pending-status",
      "unavailable",
    );
    await expect(staleWorkspace).not.toHaveAttribute(
      "data-workspace-review-mutable-checkpoint-id",
      /.+/u,
    );
    await expect(staleWorkspace).not.toHaveAttribute(
      "data-workspace-review-mutable-generation",
      /.+/u,
    );
    const afterStaleAccept = await readDurableProgramV3(stalePage, programId);
    if (afterStaleAccept === null) throw new Error("Stale Accept lost the durable winner");
    expect(afterStaleAccept.repositoryRevision).toBe(4);
    expect(afterStaleAccept.decisions).toEqual([acceptedDecision]);
    expect(afterStaleAccept.reviewBinding).toEqual(laterV3.reviewBinding);

    await stalePage.getByRole("button", { name: "Creator home" }).click();
    await expect(stalePage.locator('[data-silly-os-view="home"]')).toBeVisible();
    await stalePage.close();

    await page.getByRole("button", { name: "Creator home" }).click();
    await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
    await expect(page.locator(".silly-os")).toHaveAttribute("data-agent-workspace-state", "closed");

    await page.reload();
    await expectProgramStorageReadyV1(page);
    await initializePiTestV1(page, "sillyos-scale-cold-reopen");
    const coldReopened = await openRecentTranslationProgramV1(page, {
      programId,
      revision: 3,
      status: "Preview",
    });
    await expect(coldReopened).toHaveAttribute("data-execution-workspace-state", "open");
    await expect(coldReopened).toHaveAttribute("data-execution-workspace-generation", "1005");
    await expect(coldReopened).toHaveAttribute(
      "data-workspace-review-accepted-snapshot-id",
      acceptedDecision.snapshot.snapshotId,
    );
    await expect(coldReopened).toHaveAttribute(
      "data-workspace-review-accepted-program-revision",
      "2",
    );
    await expect(coldReopened).toHaveAttribute(
      "data-workspace-review-accepted-checkpoint-id",
      created.head.checkpointId,
    );
    await expect(coldReopened).toHaveAttribute(
      "data-workspace-review-accepted-generation",
      "1002",
    );
    await expect(coldReopened).toHaveAttribute(
      "data-workspace-review-accepted-status",
      "changed",
    );
    await expect(coldReopened).toHaveAttribute(
      "data-workspace-review-pending-proposal-id",
      v3Proposal.proposalId,
    );
    await expect(coldReopened).toHaveAttribute(
      "data-workspace-review-pending-checkpoint-id",
      laterV3.reviewBinding.checkpointId,
    );
    await expect(coldReopened).toHaveAttribute(
      "data-workspace-review-pending-generation",
      "1005",
    );
    await expect(coldReopened).toHaveAttribute("data-workspace-review-pending-status", "matches");
    await expect(coldReopened).toHaveAttribute(
      "data-workspace-review-mutable-checkpoint-id",
      laterV3.reviewBinding.checkpointId,
    );
    await expect(coldReopened).toHaveAttribute(
      "data-workspace-review-mutable-generation",
      "1005",
    );

    const retainedArchivePath = testInfo.outputPath(
      `${acceptedDecision.snapshot.snapshotId}.zip`,
    );
    const retainedArchiveBytes = await downloadRetainedWorkspaceSnapshotV1(
      page,
      acceptedDecision.snapshot,
      retainedArchivePath,
    );
    expect(retainedArchiveBytes.byteLength).toBe(acceptedDecision.snapshot.archiveBytes);
    assertQualificationArchiveV1(retainedArchiveBytes, {
      revision: 1,
      kind: "sillyos-workspace",
      exportFormat: 1,
      workspaceFormat: 1,
      programId,
      workspaceId: continuation.workspaceId,
      programRevision: 2,
      repositoryRevision: 2,
      checkpointId: created.head.checkpointId,
      generation: 1002,
    });
    expect(
      readZipCentralDirectoryV1(retainedArchiveBytes).some((entry) =>
        entry.name === "workspace/.sillyos/p3a-round-trip.txt" ||
        entry.name === "workspace/.sillyos/p3a-bash-round-trip.txt"
      ),
    ).toBe(false);
    const coldAggregate = await readDurableProgramV3(page, programId);
    if (coldAggregate === null) throw new Error("Cold reopen lost the durable Program");
    expect(coldAggregate.decisions).toEqual([acceptedDecision]);
    expect(coldAggregate.reviewBinding).toEqual(laterV3.reviewBinding);

    await page.getByRole("button", { name: "Creator home" }).click();
    await expect(page.locator(".silly-os")).toHaveAttribute("data-agent-workspace-state", "closed");
  },
);

test("a cancelled Browser Pi run remains terminal across reload without advancing the Program", async ({ durableProgramPage: page }) => {
  await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
  await expectProgramStorageReadyV1(page);
  const keyInput = page.getByLabel("Synthetic test key (memory only)");
  await keyInput.fill("sillyos-browser-pi-cancel-key");
  await page.getByRole("button", { name: "Initialize Pi test" }).click();
  await expect(page.getByText("Pi test ready", { exact: true })).toBeVisible();

  await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
    translationIntentV1,
  );
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectProgramStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "open");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "1");
  const programId = await readProgramIdV1(workspace);
  const firstWorkspaceSessionId = await readWorkspaceSessionIdV1(workspace);
  const cancelledText =
    "Hold this deterministic run until cancelled: preserve cancellation as a product receipt.";

  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(cancelledText);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator('[data-pi-agent-run-status="running"]')).toBeVisible();
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-tool", "write");
  await expect(workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  await page.getByRole("button", { name: "Cancel run" }).click();

  await expectProgramStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-program-revision", "1");
  await expect(page.getByText(cancelledText, { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByText("Cancelled Creator Agent run", { exact: true })).toBeVisible();
  await expect(page.getByText("Last write: succeeded / changed", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Creator home" }).click();
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expect(page.locator(".silly-os")).toHaveAttribute("data-agent-workspace-state", "closed");
  await page.reload();
  await expectProgramStorageReadyV1(page);
  const reloadedKeyInput = page.getByLabel("Synthetic test key (memory only)");
  await reloadedKeyInput.fill("sillyos-browser-pi-cancel-key");
  await page.getByRole("button", { name: "Initialize Pi test" }).click();
  await expect(page.getByText("Pi test ready", { exact: true })).toBeVisible();

  const reopened = await openRecentTranslationProgramV1(page, {
    programId,
    revision: 1,
    status: "Preview",
  });
  await expect(reopened).toHaveAttribute("data-program-revision", "1");
  await expect(reopened).toHaveAttribute("data-execution-workspace-state", "open");
  await expect(reopened).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(reopened).not.toHaveAttribute(
    "data-execution-workspace-session",
    firstWorkspaceSessionId,
  );
  await expect(reopened).not.toHaveAttribute("data-execution-workspace-receipt", /.+/u);
  await expect(page.getByText(cancelledText, { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByText("Cancelled Creator Agent run", { exact: true })).toBeVisible();

  const cancelledAggregate = await readDurableProgramV3(page, programId);
  if (cancelledAggregate === null) throw new Error("expected durable cancelled Program aggregate");
  expect(cancelledAggregate.agentRunReceipts).toHaveLength(1);
  expect(cancelledAggregate.agentRunReceipts[0]).toMatchObject({
    sequence: 1,
    outcome: "cancelled",
    baseProgramRevision: 1,
    baseRepositoryRevision: 1,
    creatorMessageId: null,
    resultingProgramRevision: null,
    diagnosticCode: null,
  });
});

test("desktop workspace keeps its minimum geometry and keyboard-resizable split", async ({ durableProgramPage: page }) => {
  const workspace = await openTranslationWorkspaceV1(page);
  await expect(workspace).toHaveAttribute("data-workspace-layout", "dual-pane");

  const topbar = page.locator(".program-workspace__topbar");
  const chat = page.locator('[data-workspace-pane="chat"]');
  const workpiece = page.locator('[data-workspace-pane="workpiece"]');
  const separator = page.getByRole("separator", {
    name: "Resize conversation and workpiece panes",
  });
  const topbarBox = await topbar.boundingBox();
  const chatBox = await chat.boundingBox();
  const workpieceBox = await workpiece.boundingBox();

  expect(Math.round(topbarBox?.height ?? 0)).toBe(56);
  expect(chatBox?.width ?? 0).toBeGreaterThanOrEqual(280);
  expect(workpieceBox?.width ?? 0).toBeGreaterThanOrEqual(400);

  const initialWidth = Number(await separator.getAttribute("aria-valuenow"));
  await separator.focus();
  await separator.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", String(initialWidth + 8));
  await separator.press("Shift+ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", String(initialWidth + 40));
  await separator.press("Home");
  await expect(separator).toHaveAttribute("aria-valuenow", "280");

  const resizedWorkpiece = await workpiece.boundingBox();
  expect(resizedWorkpiece?.width ?? 0).toBeGreaterThanOrEqual(400);
  await expect(page.getByRole("textbox", { name: "Ask for a change…" })).toBeVisible();
  await expectNoPageOverflowV1(page);
});

test("workspace switches cleanly at the desktop and mobile boundary", async ({ durableProgramPage: page }) => {
  await page.setViewportSize({ width: 768, height: 700 });
  const workspace = await openTranslationWorkspaceV1(page);
  await expect(workspace).toHaveAttribute("data-workspace-layout", "dual-pane");
  await expect(page.locator('[data-workspace-pane="chat"]')).toBeVisible();
  await expect(page.locator('[data-workspace-pane="workpiece"]')).toBeVisible();
  await expectNoPageOverflowV1(page);

  await page.setViewportSize({ width: 767, height: 700 });
  await expect(workspace).toHaveAttribute("data-workspace-layout", "single-pane");
  await expect(page.getByRole("navigation", { name: "Workspace views" })).toBeVisible();
  await expect(page.locator('[data-workspace-pane="chat"]')).toBeVisible();
  await expect(page.locator('[data-workspace-pane="workpiece"]')).toBeHidden();
  await expectNoPageOverflowV1(page);
});

test("full-screen workpiece exits with Escape and restores focus", async ({ durableProgramPage: page }) => {
  await openTranslationWorkspaceV1(page);
  const enterFullscreen = page.getByRole("button", { name: "Open full screen" });
  await enterFullscreen.focus();
  await enterFullscreen.press("Enter");

  const workpiece = page.locator('[data-workspace-pane="workpiece"]');
  const viewport = page.viewportSize();
  const fullscreenBox = await workpiece.boundingBox();
  await expect(page.getByRole("button", { name: "Exit full screen" })).toBeVisible();
  expect(fullscreenBox?.x ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
  expect(fullscreenBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
  expect(Math.abs((fullscreenBox?.width ?? 0) - (viewport?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((fullscreenBox?.height ?? 0) - (viewport?.height ?? 0))).toBeLessThanOrEqual(1);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open full screen" })).toBeFocused();
  await expectNoPageOverflowV1(page);
});

test("@mobile portrait uses one navigable pane without page overflow", async ({ durableProgramPage: page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const workspace = await openTranslationWorkspaceV1(page);
  await expect(workspace).toHaveAttribute("data-workspace-layout", "single-pane");

  const navigation = page.getByRole("navigation", { name: "Workspace views" });
  const chat = page.locator('[data-workspace-pane="chat"]');
  const workpiece = page.locator('[data-workspace-pane="workpiece"]');
  await expect(chat).toBeVisible();
  await expect(workpiece).toBeHidden();
  await expectNoPageOverflowV1(page);

  await navigation.getByRole("button", { name: "View" }).click();
  await expect(chat).toBeHidden();
  await expect(workpiece).toBeVisible();
  await expect(workpiece).toHaveAttribute("data-workpiece-tab", "view");
  await expectNoPageOverflowV1(page);

  await navigation.getByRole("button", { name: "Activity" }).click();
  await expect(workpiece).toHaveAttribute("data-workpiece-tab", "activity");
  await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
  await expectNoPageOverflowV1(page);

  await navigation.getByRole("button", { name: "Chat" }).click();
  await expect(chat).toBeVisible();
  await expect(workpiece).toBeHidden();
  await expect(page.getByRole("textbox", { name: "Ask for a change…" })).toBeVisible();
  await expectNoPageOverflowV1(page);
});
