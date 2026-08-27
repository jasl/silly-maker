// SPDX-License-Identifier: MIT
/// <reference lib="dom" />
import type { Locator, Page } from "@playwright/test";

import { expect, sillyOsTargetUrlV1, test } from "./fixtures.ts";

const translationIntentV1 =
  "Translate this visual novel and keep every character's voice consistent.";

async function expectProgramStorageReadyV1(page: Page): Promise<void> {
  await expect(page.locator('[data-program-storage-state="ready"]')).toBeVisible();
}

async function openCreatorHomeV1(page: Page): Promise<void> {
  await page.goto(sillyOsTargetUrlV1("?locale=en"));
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

interface DurableAgentRunReceiptV2 {
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

interface DurableProgramProjectionV2 {
  readonly schemaVersion: number;
  readonly programId: string;
  readonly agentRunReceipts: readonly DurableAgentRunReceiptV2[];
  readonly snapshot: {
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

async function readDurableProgramV2(
  page: Page,
  programId: string,
): Promise<DurableProgramProjectionV2> {
  return await page.evaluate(async (requestedProgramId) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sillymaker.example-silly-os.programs");
      request.addEventListener("error", () => reject(request.error));
      request.addEventListener("success", () => resolve(request.result));
    });
    try {
      return await new Promise<DurableProgramProjectionV2>((resolve, reject) => {
        const transaction = database.transaction("programs", "readonly");
        const request = transaction.objectStore("programs").get(requestedProgramId);
        request.addEventListener("error", () => reject(request.error));
        request.addEventListener("success", () => resolve(request.result));
      });
    } finally {
      database.close();
    }
  }, programId);
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

test("Creator Home persists and reopens an exact accepted Program", async ({ page }) => {
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

test("a follow-up creates a new exact Program revision for review", async ({ page }) => {
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

test("two pages keep the durable winner when one submits a stale revision", async ({ page, context }) => {
  const firstWorkspace = await openTranslationWorkspaceV1(page);
  const programId = await readProgramIdV1(firstWorkspace);

  const stalePage = await context.newPage();
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
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  await expect(workspace).toHaveAttribute(
    "data-execution-workspace-path",
    ".sillyos/p3a-round-trip.txt",
  );

  await page.getByRole("tab", { name: "Source" }).click();
  await expect(page.getByLabel("Program preview source")).toContainText("revision: 2");
  await expect(page.getByLabel("Program preview source")).toContainText(followUp);
  await page.getByRole("tab", { name: "Capabilities" }).click();
  await expect(page.getByText("Pi 0.84.3 test wiring", { exact: true })).toBeVisible();
  await expect(page.getByText("Program workspace checkpoint", { exact: true })).toBeVisible();
  await expect(page.getByText("Open · generation 2", { exact: true })).toBeVisible();

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
  await expect(reopenedWorkspace).toHaveAttribute("data-execution-workspace-generation", "2");
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
  await expect(reopenedWorkspace).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(reopenedWorkspace).not.toHaveAttribute("data-execution-workspace-receipt", /.+/u);

  await page.getByRole("tab", { name: "Source" }).click();
  await expect(page.getByLabel("Program preview source")).toContainText("revision: 3");
  await expect(page.getByLabel("Program preview source")).toContainText(followUp);
  await expect(page.getByLabel("Program preview source")).toContainText(persistenceProbe);

  const completedAggregate = await readDurableProgramV2(page, programId);
  expect(completedAggregate).toMatchObject({ schemaVersion: 2, programId });
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
  await expect(replacedWorkspace).toHaveAttribute("data-execution-workspace-generation", "2");
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
  await expect(readWorkspaceContinuationV1(page, programId)).resolves.toBeNull();
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
  expect(continuation).toMatchObject({
    revision: 1,
    programId,
    workspaceFormat: 1,
    programRevision: 1,
    repositoryRevision: 1,
  });

  const durableText = "Retain these exact bytes across a real Workspace Host loss.";
  await owner.page.getByRole("textbox", { name: "Ask for a change…" }).fill(durableText);
  await owner.page.getByRole("button", { name: "Send" }).click();
  await expect(owner.page.locator('[data-pi-agent-run-status="running"]')).toHaveCount(0);
  await expect(owner.page.getByText(durableText, { exact: true })).toBeVisible();
  await expect(owner.workspace).toHaveAttribute("data-execution-workspace-generation", "2");
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
  await expect(recovered).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(recovered).not.toHaveAttribute("data-execution-workspace-session", ownerSessionId);
  await expect(recovered).not.toHaveAttribute("data-execution-workspace-receipt", /.+/u);

  const verify = "Verify the persisted workspace contains exactly: " + durableText;
  await contender.page.getByRole("textbox", { name: "Ask for a change…" }).fill(verify);
  await contender.page.getByRole("button", { name: "Send" }).click();
  await expect(contender.page.getByText(verify, { exact: true })).toBeVisible();
  await expect(contender.page.locator('[data-proposal-status="pending"]')).toContainText("v3");
  await expect(recovered).toHaveAttribute("data-execution-workspace-generation", "2");
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
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectProgramStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-program-revision", "1");
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "failed");
  await expect(workspace).toHaveAttribute(
    "data-execution-workspace-diagnostic",
    "storage_unavailable",
  );
  await expect(workspace).not.toHaveAttribute("data-execution-workspace-session", /.+/u);
  await expect(workspace).not.toHaveAttribute("data-execution-workspace-generation", /.+/u);
  await expect(workspace).not.toHaveAttribute("data-execution-workspace-receipt", /.+/u);
  await page.getByRole("tab", { name: "Capabilities" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "This browser context cannot provide a durable local workspace. SillyOS did not create a replacement volume.",
  );
  await expect(page.getByRole("textbox", { name: "Ask for a change…" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();

  const programId = await readProgramIdV1(workspace);
  await expect(readWorkspaceContinuationV1(page, programId)).resolves.toBeNull();
  const aggregate = await readDurableProgramV2(page, programId);
  expect(aggregate).toMatchObject({ schemaVersion: 2, programId });
  expect(aggregate.agentRunReceipts).toEqual([]);
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
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "2");

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
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "2");
});

test("the Browser workspace cold-reopens a bounded 20 MiB corpus without sending volume bytes to the page", async ({ durableProgramPage: page }) => {
  test.setTimeout(300_000);
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

  const oversizedProbe = "Verify the qualification workspace rejects an oversized native Pi read.";
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(oversizedProbe);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(oversizedProbe, { exact: true })).toBeVisible();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(reopened).toHaveAttribute("data-execution-workspace-generation", "1002");
  await expect(reopened).not.toHaveAttribute("data-execution-workspace-receipt", /.+/u);
});

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

  const cancelledAggregate = await readDurableProgramV2(page, programId);
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

test("desktop workspace keeps its minimum geometry and keyboard-resizable split", async ({ page }) => {
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

test("workspace switches cleanly at the desktop and mobile boundary", async ({ page }) => {
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

test("full-screen workpiece exits with Escape and restores focus", async ({ page }) => {
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

test("@mobile portrait uses one navigable pane without page overflow", async ({ page }) => {
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
