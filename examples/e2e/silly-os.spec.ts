// SPDX-License-Identifier: MIT
/// <reference lib="dom" />
import type { Frame, Locator, Page, Route } from "@playwright/test";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  consumeExpectedDurableProgramConsoleErrorsV1,
  expect,
  sillyOsNetworkBrokerTargetV1,
  sillyOsTargetUrlV1,
  sillyOsWorkspaceSandboxTargetV1,
  test,
} from "./fixtures.ts";
import { readZipCentralDirectoryV1 } from "./silly-os-workspace-zip.ts";

const translationIntentV1 =
  "Translate this visual novel and keep every character's voice consistent.";
const deterministicEditProbePrefixV1 = "Exercise the pinned native Pi edit tool with exact text: ";
const deterministicBashProbePrefixV1 = "Exercise the pinned native Pi bash tool with exact text: ";
const deterministicFileOpsProbePrefixV1 =
  "Exercise the pinned native Pi workspace file operations lifecycle: ";
const deterministicFetchUrlProbePrefixV1 =
  "Exercise the product-fixed Pi fetch_url tool for exact URL: ";
const deterministicDownloadProbePrefixV1 =
  "Exercise the product-fixed Pi download tool for exact URL: ";
const deterministicDownloadRelativePathV1 = ".sillyos/n2-download.bin";

async function expectProgramStorageReadyV1(page: Page): Promise<void> {
  await expect(page.locator('[data-program-storage-state="ready"]')).toBeVisible();
}

async function openCreatorHomeV1(page: Page): Promise<void> {
  await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
  await expectProgramStorageReadyV1(page);
  await expect.poll(() => page.evaluate(() => document.styleSheets.length)).toBeGreaterThan(0);
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What would you like to make?", level: 1 }),
  ).toBeVisible();
}

async function openTranslationWorkspaceV1(page: Page): Promise<Locator> {
  await openCreatorHomeV1(page);
  await initializePiTestV1(page, "silly-os-e2e-key");
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

interface DurableProgramDatabaseStateV7 {
  readonly version: 7;
  readonly programRows: readonly unknown[];
  readonly continuationRows: readonly unknown[];
  readonly networkAccessRows: readonly unknown[];
}

const workspaceExportManifestNameV1 = "sillyos-workspace.json";

async function initializePiTestV1(page: Page, key: string): Promise<void> {
  const keyInput = page.getByLabel("Synthetic test key (memory only)");
  await keyInput.fill(key);
  await page.getByRole("button", { name: "Initialize Pi test" }).click();
  await expect(keyInput).toHaveValue("");
  await expect(page.getByText("Pi test ready", { exact: true })).toBeVisible();
}

async function expectSillyOsCheckboxRecipeV1(control: Locator): Promise<void> {
  await expect(control).toHaveClass(/\bsos-checkbox\b/u);
  const recipe = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return {
      inlineSize: style.inlineSize,
      blockSize: style.blockSize,
      margin: style.margin,
      accentColor: style.accentColor,
      width: bounds.width,
      height: bounds.height,
    };
  });

  expect(recipe).toMatchObject({
    inlineSize: "16px",
    blockSize: "16px",
    margin: "0px",
    width: 16,
    height: 16,
  });
  expect(recipe.accentColor).not.toBe("");
  expect(recipe.accentColor).not.toBe("auto");
}

async function readWorkspaceContinuationV1(
  page: Page,
  programId: string,
): Promise<DurableWorkspaceContinuationV1 | null> {
  return await page.evaluate(async (requestedProgramId) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const openRequest = indexedDB.open("sillymaker.example-silly-os.programs");
      openRequest.addEventListener("error", () => reject(openRequest.error));
      openRequest.addEventListener("success", () => resolve(openRequest.result));
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

const ordinaryWorkspaceRoundTripPathV1 = ".sillyos/p3a-round-trip.txt";
const ordinaryWorkspaceBashRoundTripPathV1 = ".sillyos/p3a-bash-round-trip.txt";

function workspaceSandboxDevelopmentOriginV1(): string {
  return `http://${sillyOsWorkspaceSandboxTargetV1.host}:${
    String(sillyOsWorkspaceSandboxTargetV1.port)
  }`;
}

async function currentOrdinaryWorkspaceSandboxFrameV1(page: Page): Promise<Frame> {
  const expectedOrigin = workspaceSandboxDevelopmentOriginV1();
  await expect.poll(() =>
    page.frames().filter((frame) => {
      const frameUrl = frame.url();
      if (!URL.canParse(frameUrl)) return false;
      const url = new URL(frameUrl);
      return url.origin === expectedOrigin && url.pathname === "/workspace-sandbox.html";
    }).length
  ).toBe(1);
  const frame = page.frames().find((candidate) => {
    const frameUrl = candidate.url();
    if (!URL.canParse(frameUrl)) return false;
    const url = new URL(frameUrl);
    return url.origin === expectedOrigin && url.pathname === "/workspace-sandbox.html";
  });
  if (frame === undefined) throw new Error("Ordinary Workspace Sandbox frame is unavailable");
  return frame;
}

async function controlOriginHasWorkspaceVolumeV1(page: Page, volumeId: string): Promise<boolean> {
  return await page.evaluate(async (requestedVolumeId) => {
    try {
      let directory = await navigator.storage.getDirectory();
      for (const name of [".sillyos-workspace-host-v1", "volumes", requestedVolumeId]) {
        directory = await directory.getDirectoryHandle(name);
      }
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") return false;
      throw error;
    }
  }, volumeId);
}

async function readSandboxWorkspaceTextV1(
  frame: Frame,
  volumeId: string,
  relativePath: string,
): Promise<string> {
  return await frame.evaluate(async ({ requestedVolumeId, requestedRelativePath }) => {
    const path = requestedRelativePath.split("/");
    const fileName = path.pop();
    if (fileName === undefined || fileName.length === 0 || path.some((part) => part.length === 0)) {
      throw new Error("Invalid E2E workspace path");
    }
    let directory = await navigator.storage.getDirectory();
    for (
      const name of [
        ".sillyos-workspace-host-v1",
        "volumes",
        requestedVolumeId,
        "workspace",
        ...path,
      ]
    ) {
      directory = await directory.getDirectoryHandle(name);
    }
    return await (await (await directory.getFileHandle(fileName)).getFile()).text();
  }, { requestedVolumeId: volumeId, requestedRelativePath: relativePath });
}

interface SandboxWorkspaceEntryInspectionV1 {
  readonly kind: "missing" | "file" | "directory";
  readonly size: number;
  readonly text: string | null;
}

async function inspectSandboxWorkspaceEntriesV1(
  page: Page,
  continuation: DurableWorkspaceContinuationV1,
  relativePaths: readonly string[],
): Promise<Readonly<Record<string, SandboxWorkspaceEntryInspectionV1>>> {
  const frame = await currentOrdinaryWorkspaceSandboxFrameV1(page);
  return await frame.evaluate(async ({ volumeId, paths }) => {
    let workspace = await navigator.storage.getDirectory();
    for (
      const name of [
        ".sillyos-workspace-host-v1",
        "volumes",
        volumeId,
        "workspace",
      ]
    ) {
      workspace = await workspace.getDirectoryHandle(name);
    }
    const absentV1 = (error: unknown): boolean =>
      error instanceof DOMException &&
      (error.name === "NotFoundError" || error.name === "TypeMismatchError");
    const inspected: Record<string, SandboxWorkspaceEntryInspectionV1> = {};
    for (const path of paths) {
      const parts = path.split("/");
      const name = parts.pop();
      if (
        name === undefined || name.length === 0 ||
        parts.some((part) => part.length === 0 || part === "." || part === "..")
      ) throw new Error("Invalid E2E workspace inspection path");
      let parent = workspace;
      let missingParent = false;
      for (const part of parts) {
        try {
          parent = await parent.getDirectoryHandle(part);
        } catch (error) {
          if (!absentV1(error)) throw error;
          missingParent = true;
          break;
        }
      }
      if (missingParent) {
        inspected[path] = { kind: "missing", size: 0, text: null };
        continue;
      }
      try {
        const file = await (await parent.getFileHandle(name)).getFile();
        inspected[path] = { kind: "file", size: file.size, text: await file.text() };
        continue;
      } catch (error) {
        if (!absentV1(error)) throw error;
      }
      try {
        await parent.getDirectoryHandle(name);
        inspected[path] = { kind: "directory", size: 0, text: null };
      } catch (error) {
        if (!absentV1(error)) throw error;
        inspected[path] = { kind: "missing", size: 0, text: null };
      }
    }
    return inspected;
  }, { volumeId: continuation.volumeId, paths: [...relativePaths] });
}

async function inspectSandboxWorkspaceFileDigestV1(
  page: Page,
  continuation: DurableWorkspaceContinuationV1,
  relativePath: string,
): Promise<{ readonly size: number; readonly sha256: string }> {
  const frame = await currentOrdinaryWorkspaceSandboxFrameV1(page);
  return await frame.evaluate(async ({ volumeId, path }) => {
    const parts = path.split("/");
    const fileName = parts.pop();
    if (
      fileName === undefined || fileName.length === 0 ||
      parts.some((part) => part.length === 0 || part === "." || part === "..")
    ) throw new Error("Invalid E2E workspace digest path");
    let directory = await navigator.storage.getDirectory();
    for (
      const name of [
        ".sillyos-workspace-host-v1",
        "volumes",
        volumeId,
        "workspace",
        ...parts,
      ]
    ) {
      directory = await directory.getDirectoryHandle(name);
    }
    const file = await (await directory.getFileHandle(fileName)).getFile();
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
    );
    return {
      size: file.size,
      sha256: [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
    };
  }, { volumeId: continuation.volumeId, path: relativePath });
}

async function expectOrdinaryWorkspaceSandboxV1(
  page: Page,
  continuation: DurableWorkspaceContinuationV1,
  expectedText: string,
  relativePath = ordinaryWorkspaceRoundTripPathV1,
): Promise<void> {
  const expectedSandboxOrigin = workspaceSandboxDevelopmentOriginV1();
  expect(await page.evaluate(() => location.origin)).toBe("http://127.0.0.1:41739");
  const iframe = page.locator("iframe[data-silly-os-workspace-sandbox='active']");
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toHaveAttribute("src", new RegExp(`^${expectedSandboxOrigin}/`));
  await expect(iframe).toHaveAttribute("sandbox", /allow-downloads/u);
  const frame = await currentOrdinaryWorkspaceSandboxFrameV1(page);
  expect(new URL(frame.url()).origin).toBe(expectedSandboxOrigin);
  expect(
    page.workers().some((worker) =>
      /(?:^|\/)browser-workspace-host\.worker(?:\.[cm]?[jt]s)?(?:\?|$)/u.test(worker.url())
    ),
  ).toBe(false);
  expect(await controlOriginHasWorkspaceVolumeV1(page, continuation.volumeId)).toBe(false);
  expect(
    await readSandboxWorkspaceTextV1(
      frame,
      continuation.volumeId,
      relativePath,
    ),
  ).toBe(expectedText);
}

function assertOrdinaryWorkspaceArchiveV1(
  archiveBytes: Uint8Array,
  expected: {
    readonly programId: string;
    readonly workspaceId: string;
    readonly generation: number;
    readonly text: string;
  },
): void {
  const fileName = `workspace/${ordinaryWorkspaceRoundTripPathV1}`;
  const entries = readZipCentralDirectoryV1(archiveBytes);
  expect(entries.map((entry) => entry.name)).toEqual([workspaceExportManifestNameV1, fileName]);
  expect(entries.every((entry) => entry.compressionMethod === 0)).toBe(true);
  const extracted = new Map(entries.map((entry) => [entry.name, entry.bytes]));
  const manifestBytes = extracted.get(workspaceExportManifestNameV1);
  const workspaceBytes = extracted.get(fileName);
  if (manifestBytes === undefined || workspaceBytes === undefined) {
    throw new Error("Ordinary Workspace ZIP omitted its manifest or Pi-written file");
  }
  const manifest = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes),
  ) as Readonly<Record<string, unknown>>;
  expect(manifest).toMatchObject({
    revision: 1,
    kind: "sillyos-workspace",
    exportFormat: 1,
    workspaceFormat: 1,
    programId: expected.programId,
    workspaceId: expected.workspaceId,
    generation: expected.generation,
  });
  expect(new TextDecoder("utf-8", { fatal: true }).decode(workspaceBytes)).toBe(expected.text);
}

async function readDurableProgramV3(
  page: Page,
  programId: string,
): Promise<DurableProgramProjectionV3 | null> {
  return await page.evaluate(async (requestedProgramId) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const grantDatabaseRequest = indexedDB.open("sillymaker.example-silly-os.programs");
      grantDatabaseRequest.addEventListener("error", () => reject(grantDatabaseRequest.error));
      grantDatabaseRequest.addEventListener("success", () => resolve(grantDatabaseRequest.result));
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

async function readProgramDatabaseStateV7(page: Page): Promise<DurableProgramDatabaseStateV7> {
  return await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sillymaker.example-silly-os.programs");
      request.addEventListener("error", () => reject(request.error));
      request.addEventListener("success", () => resolve(request.result));
    });
    try {
      const transaction = database.transaction(
        ["programs", "workspace_continuations", "program_network_access"],
        "readonly",
      );
      const readAllV1 = (storeName: string): Promise<unknown[]> =>
        new Promise((resolve, reject) => {
          const request = transaction.objectStore(storeName).getAll();
          request.addEventListener("error", () => reject(request.error));
          request.addEventListener("success", () => resolve(request.result));
        });
      const [programRows, continuationRows, networkAccessRows] = await Promise.all([
        readAllV1("programs"),
        readAllV1("workspace_continuations"),
        readAllV1("program_network_access"),
      ]);
      return {
        version: database.version,
        programRows,
        continuationRows,
        networkAccessRows,
      } as DurableProgramDatabaseStateV7;
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

async function expectInsideVisualViewportV1(page: Page, locator: Locator): Promise<void> {
  const [boxV1, viewportV1] = await Promise.all([
    locator.boundingBox(),
    page.evaluate(() => ({ height: innerHeight, width: innerWidth })),
  ]);
  expect(boxV1).not.toBeNull();
  expect(boxV1?.x ?? Number.NEGATIVE_INFINITY).toBeGreaterThanOrEqual(-1);
  expect(boxV1?.y ?? Number.NEGATIVE_INFINITY).toBeGreaterThanOrEqual(-1);
  expect((boxV1?.x ?? 0) + (boxV1?.width ?? 0)).toBeLessThanOrEqual(viewportV1.width + 1);
  expect((boxV1?.y ?? 0) + (boxV1?.height ?? 0)).toBeLessThanOrEqual(viewportV1.height + 1);
}

async function settleVisualFixtureV1(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveV1) => requestAnimationFrame(() => resolveV1()));
    await new Promise<void>((resolveV1) => requestAnimationFrame(() => resolveV1()));
    (document.activeElement as HTMLElement | null)?.blur();
  });
}

async function expectVisualSnapshotV1(locatorV1: Locator, nameV1: string): Promise<void> {
  const screenshotV1 = await locatorV1.screenshot({
    animations: "allow",
    caret: "initial",
  });
  expect(screenshotV1).toMatchSnapshot(nameV1);
}

const openAIResponsesProbeUrlV1 = "https://api.openai.com/v1/responses";
const browserProviderSettingsStorageKeyV2 = "sillymaker.example-silly-os.provider-settings.v2";
const browserProductPreferencesStorageKeyV1 = "sillymaker.example-silly-os.product-preferences.v1";
const webkitScreenshotStyleCspErrorV1 =
  "Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy.";
const webkitScreenshotDefaultStyleCspErrorV1 =
  "Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' appears in neither the style-src directive nor the default-src directive of the Content Security Policy.";

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

test("SillyOS binds the shared UI foundation without leaking into Tool Theme", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
  const application = page.locator('[data-application-id="example-silly-os"]');
  await expect(application).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.styleSheets.length)).toBeGreaterThan(0);

  const theme = await application.evaluate((root) => {
    const productSurface = root.querySelector<HTMLElement>(".silly-os");
    if (productSurface === null) throw new TypeError("SillyOS product surface is unavailable");

    const normalButton = document.createElement("button");
    normalButton.className = "silly-button sos-button";
    normalButton.dataset.variant = "secondary";
    normalButton.dataset.size = "base";
    normalButton.textContent = "Normal";
    productSurface.append(normalButton);
    const compactButton = document.createElement("button");
    compactButton.className = "silly-button sos-button";
    compactButton.dataset.variant = "secondary";
    compactButton.dataset.size = "sm";
    compactButton.textContent = "Compact";
    productSurface.append(compactButton);

    const toolSurface = document.createElement("section");
    toolSurface.dataset.sillyToolSurface = "true";
    const toolButton = document.createElement("button");
    toolButton.className = "silly-button";
    toolButton.textContent = "Tool";
    toolSurface.append(toolButton);
    root.append(toolSurface);

    compactButton.focus();
    const rootStyle = getComputedStyle(root);
    const productStyle = getComputedStyle(productSurface);
    const normalStyle = getComputedStyle(normalButton);
    const compactStyle = getComputedStyle(compactButton);
    const toolStyle = getComputedStyle(toolSurface);
    const toolButtonStyle = getComputedStyle(toolButton);
    const result = {
      product: {
        canvas: rootStyle.getPropertyValue("--silly-color-canvas").trim(),
        accent: rootStyle.getPropertyValue("--silly-color-accent").trim(),
        fontFamily: productStyle.fontFamily,
        fontSize: productStyle.fontSize,
        normalBlockSize: normalStyle.blockSize,
        normalMinBlockSize: normalStyle.minBlockSize,
        compactBlockSize: compactStyle.blockSize,
        compactMinBlockSize: compactStyle.minBlockSize,
        focusOutlineColor: compactStyle.outlineColor,
        transitionDuration: compactStyle.transitionDuration,
      },
      tool: {
        canvas: toolStyle.getPropertyValue("--silly-color-canvas").trim(),
        text: toolStyle.getPropertyValue("--silly-color-text").trim(),
        fontFamily: toolStyle.fontFamily,
        fontSize: toolStyle.fontSize,
        controlBlockSize: toolButtonStyle.blockSize,
        controlMinBlockSize: toolButtonStyle.minBlockSize,
        colorScheme: toolStyle.colorScheme,
      },
    };
    normalButton.remove();
    compactButton.remove();
    toolSurface.remove();
    return result;
  });

  expect(theme.product.canvas).toBe("#f6f6f4");
  expect(theme.product.accent).toBe("#496bdf");
  expect(theme.product.fontFamily.toLowerCase()).toContain("inter");
  expect(theme.product.fontSize).toBe("14px");
  expect(theme.product.normalBlockSize).toBe("36px");
  expect(theme.product.normalMinBlockSize).toBe("36px");
  expect(theme.product.compactBlockSize).toBe("28px");
  expect(theme.product.compactMinBlockSize).toBe("28px");
  expect(theme.product.focusOutlineColor).toBe("rgb(49, 95, 197)");
  expect(theme.product.transitionDuration).toBe("0s");
  expect(theme.tool.canvas).toBe("#101014");
  expect(theme.tool.text).toBe("#e7e9ee");
  expect(theme.tool.fontFamily).not.toBe(theme.product.fontFamily);
  expect(theme.tool.fontSize).toBe("14px");
  expect(Number.parseFloat(theme.tool.controlBlockSize)).toBeGreaterThanOrEqual(28);
  expect(Number.parseFloat(theme.tool.controlBlockSize)).toBeLessThan(30);
  expect(theme.tool.controlMinBlockSize).toBe("28px");
  expect(theme.tool.colorScheme).toBe("dark");
});

test("SillyOS restores a saved dark theme before the application entry mounts", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(({ storageKey }) => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ revision: 1, locale: "en", theme: "dark" }),
    );
  }, { storageKey: browserProductPreferencesStorageKeyV1 });

  let releaseEntryV1: (() => void) | undefined;
  const entryGateV1 = new Promise<void>((resolve) => {
    releaseEntryV1 = resolve;
  });
  await page.route("**/src/application/entry.tsx", async (route) => {
    await entryGateV1;
    await route.continue();
  });

  await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"), { waitUntil: "commit" });
  try {
    await expect(
      page.locator('#sillymaker-application-boot-shell [data-sillymaker-boot-shell="pending"]'),
    ).toBeVisible();
    const beforeMount = await page.evaluate(() => ({
      colorScheme: document.documentElement.style.colorScheme,
      bootstrapScheme: document.documentElement.dataset.sillyOsColorScheme,
      productMounted: document.querySelector(".silly-os") !== null,
      themeColors: [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')]
        .map((meta) => meta.content),
    }));
    expect(beforeMount).toEqual({
      colorScheme: "dark",
      bootstrapScheme: "dark",
      productMounted: false,
      themeColors: ["#101210"],
    });
  } finally {
    releaseEntryV1?.();
  }

  await expect(page.locator(".silly-os")).toHaveAttribute("data-color-scheme", "dark");
  await expect(page.locator(".silly-os")).toHaveAttribute("data-theme-mode", "dark");
});

test("an explicit URL locale does not replace the stored cross-tab preference", async ({ page }) => {
  await page.addInitScript(({ storageKey }) => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ revision: 1, locale: "en", theme: "system" }),
    );
  }, { storageKey: browserProductPreferencesStorageKeyV1 });

  await page.goto(sillyOsTargetUrlV1("?locale=zh-CN&agent=pi-test"));
  await expect(page.locator(".silly-os")).toHaveAttribute("data-locale", "zh-CN");
  expect(
    await page.evaluate((storageKey) => {
      const serialized = localStorage.getItem(storageKey);
      return serialized === null ? null : JSON.parse(serialized).locale;
    }, browserProductPreferencesStorageKeyV1),
  ).toBe("en");

  const sibling = await page.context().newPage();
  try {
    await sibling.goto(sillyOsTargetUrlV1("?agent=pi-test"));
    await expect(sibling.locator(".silly-os")).toHaveAttribute("data-locale", "en");
    await expect(page.locator(".silly-os")).toHaveAttribute("data-locale", "zh-CN");
  } finally {
    await sibling.close();
  }
});

test("mounted tabs follow system theme and live product-preference changes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(sillyOsTargetUrlV1("?agent=pi-test"));
  await expect(page.locator(".silly-os")).toHaveAttribute("data-theme-mode", "system");
  await expect(page.locator(".silly-os")).toHaveAttribute("data-color-scheme", "light");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator(".silly-os")).toHaveAttribute("data-color-scheme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator(".silly-os")).toHaveAttribute("data-color-scheme", "light");

  const explicitLocalePage = await page.context().newPage();
  const writerPage = await page.context().newPage();
  try {
    await explicitLocalePage.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
    await writerPage.goto(sillyOsTargetUrlV1("?agent=pi-test"));
    await writerPage.evaluate((storageKey) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ revision: 1, locale: "zh-CN", theme: "dark" }),
      );
    }, browserProductPreferencesStorageKeyV1);

    await expect(page.locator(".silly-os")).toHaveAttribute("data-locale", "zh-CN");
    await expect(page.locator(".silly-os")).toHaveAttribute("data-theme-mode", "dark");
    await expect(page.locator(".silly-os")).toHaveAttribute("data-color-scheme", "dark");
    await expect(explicitLocalePage.locator(".silly-os")).toHaveAttribute("data-locale", "en");
    await expect(explicitLocalePage.locator(".silly-os")).toHaveAttribute(
      "data-theme-mode",
      "dark",
    );
  } finally {
    await explicitLocalePage.close();
    await writerPage.close();
  }
});

test("ordinary Browser Settings verifies a built-in Pi connection and preserves mobile navigation", async ({ durableProgramPage: page }) => {
  const sentinel = "sillyos-provider-settings-session-key";
  const vaultPassword = "sillyos-browser-vault-password";
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
  const creatorReadiness = page.locator('[data-creator-readiness-surface="home"]');
  await expect(creatorReadiness).toHaveAttribute(
    "data-creator-readiness",
    "credential_required",
  );
  await expect(creatorReadiness).toContainText("API key required");
  await expect(creatorReadiness).toContainText("Open Providers");
  const homeModelControl = page.locator('[data-creator-model-selector="true"]');
  await expect(homeModelControl).toHaveCount(0);
  const providerWarningBox = await creatorReadiness.boundingBox();
  const creatorComposerBox = await page.locator(".creator-composer").boundingBox();
  expect(
    (creatorComposerBox?.y ?? 0) -
      ((providerWarningBox?.y ?? 0) + (providerWarningBox?.height ?? 0)),
  ).toBeGreaterThanOrEqual(13);
  const composerControlRadii = await page.locator(
    ".creator-composer .sos-textarea, .creator-composer__actions .sos-button",
  ).evaluateAll((elements) => elements.map((element) => getComputedStyle(element).borderRadius));
  expect(new Set(composerControlRadii)).toEqual(new Set(["12px"]));
  await creatorReadiness.getByRole("button", { name: "Open Providers" }).click();

  const settings = page.locator('[data-silly-os-view="settings"]');
  const globalBack = page.getByRole("button", { name: "Back to Agent Creator" });
  await expect(settings).toBeVisible();
  await expect(globalBack).toBeFocused();
  const settingsGeneral = page.getByRole("button", { name: "General", exact: true });
  const settingsProviders = page.getByRole("button", { name: "Providers", exact: true });
  const settingsVault = page.getByRole("button", { name: "Credential Vault", exact: true });
  await expect(settingsProviders).toHaveAttribute("aria-current", "page");
  await settingsGeneral.click();
  await expect(page.locator('[data-settings-section="general"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "General", level: 1 })).toBeVisible();
  const generalLocaleSelect = page.getByRole("combobox", { name: "Language" });
  await expect(generalLocaleSelect).toHaveCount(1);
  const generalLocaleSelectBox = await generalLocaleSelect.boundingBox();
  expect(generalLocaleSelectBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  const clearAllDataButton = page.getByRole("button", { name: "Clear all data" });
  await clearAllDataButton.click();
  const clearAllDataDialog = page.getByRole("alertdialog", {
    name: "Clear all SillyOS data?",
  });
  await expect(clearAllDataDialog).toBeVisible();
  const clearAllWarning = clearAllDataDialog.locator('[data-slot="status-title"]');
  await expect(clearAllWarning).toBeVisible();
  const clearAllWarningLayout = await clearAllWarning.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    whiteSpace: getComputedStyle(element).whiteSpace,
  }));
  expect(clearAllWarningLayout.whiteSpace).not.toBe("nowrap");
  expect(clearAllWarningLayout.scrollWidth).toBeLessThanOrEqual(clearAllWarningLayout.clientWidth);
  await expect(clearAllDataDialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.setViewportSize({ width: 1_024, height: 520 });
  await expectInsideVisualViewportV1(page, clearAllDataDialog);
  await expectInsideVisualViewportV1(
    page,
    clearAllDataDialog.getByRole("button", { name: "Clear all data" }),
  );
  await expectNoPageOverflowV1(page);
  await page.keyboard.press("Escape");
  await expect(clearAllDataDialog).toHaveCount(0);
  await expect(clearAllDataButton).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await settingsVault.click();
  const vaultPanel = page.locator('[data-vault-phase="unlocked"]');
  await expect(vaultPanel).toBeVisible();
  await expect(page.locator('[data-vault-mode="device"]')).toContainText("Automatic");
  await expect(page.getByText("No Provider API key is saved.", { exact: true })).toBeVisible();
  await settingsProviders.click();
  await expect(page.locator('[data-settings-section="providers"]')).toBeVisible();
  await expect(page.locator('[data-provider-id="openai"]')).toHaveAttribute(
    "data-credential-status",
    "unset",
  );
  await expect(page.locator('[data-provider-id="anthropic"]')).toHaveAttribute(
    "data-credential-status",
    "unset",
  );
  for (const providerId of ["google", "deepseek", "xai"]) {
    await expect(page.locator(`[data-provider-id="${providerId}"]`)).toHaveAttribute(
      "data-credential-status",
      "unset",
    );
  }
  await expect(page.locator('[data-provider-id="openrouter"]')).toHaveAttribute(
    "data-credential-status",
    "unset",
  );
  const globalBackBox = await globalBack.boundingBox();
  expect(globalBackBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(globalBackBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  const productMenuTrigger = page.getByRole("button", { name: "SillyOS menu" });
  const productMenuTriggerBox = await productMenuTrigger.boundingBox();
  expect(productMenuTriggerBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(productMenuTriggerBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  await productMenuTrigger.click();
  const productMenu = page.getByRole("menu", { name: "SillyOS menu" });
  await expect(productMenu).toBeVisible();
  const themeMenuItem = productMenu.getByRole("menuitem", { name: "Theme" });
  await themeMenuItem.focus();
  await themeMenuItem.press("ArrowRight");
  await page.getByRole("menuitemradio", { name: "Dark" }).press("Enter");
  await expect(page.locator(".silly-os")).toHaveAttribute("data-theme-mode", "dark");
  await expect(page.locator(".silly-os")).toHaveAttribute("data-color-scheme", "dark");

  await settingsGeneral.click();
  await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
  await expect(generalLocaleSelect).toHaveValue("en");
  await productMenuTrigger.click();
  const languageMenuItem = productMenu.getByRole("menuitem", { name: "Language" });
  await languageMenuItem.focus();
  await languageMenuItem.press("ArrowRight");
  await page.getByRole("menuitemradio", { name: "简体中文" }).press("Enter");
  await expect(page.locator(".silly-os")).toHaveAttribute("lang", "zh-CN");
  await expect(page.locator(".silly-os")).toHaveAttribute("data-locale", "zh-CN");
  await expect(page.getByRole("heading", { name: "通用", level: 1 })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "语言" })).toHaveValue("zh-CN");
  expect(new URL(page.url()).searchParams.get("locale")).toBe("zh-CN");

  const localizedProductMenuTrigger = page.getByRole("button", { name: "SillyOS 菜单" });
  await localizedProductMenuTrigger.click();
  const localizedProductMenu = page.getByRole("menu", { name: "SillyOS 菜单" });
  const localizedLanguageMenuItem = localizedProductMenu.getByRole("menuitem", { name: "语言" });
  await localizedLanguageMenuItem.focus();
  await localizedLanguageMenuItem.press("ArrowRight");
  await page.getByRole("menuitemradio", { name: "English" }).press("Enter");
  await expect(page.locator(".silly-os")).toHaveAttribute("lang", "en");
  await expect(page.locator(".silly-os")).toHaveAttribute("data-locale", "en");
  await expect(page.getByRole("heading", { name: "General", level: 1 })).toBeVisible();
  await expect(generalLocaleSelect).toHaveValue("en");
  expect(new URL(page.url()).searchParams.get("locale")).toBe("en");

  await productMenuTrigger.click();
  await themeMenuItem.focus();
  await themeMenuItem.press("ArrowRight");
  await page.getByRole("menuitemradio", { name: "System" }).press("Enter");
  await expect(page.locator(".silly-os")).toHaveAttribute("data-theme-mode", "system");
  await settingsProviders.click();
  await expectNoPageOverflowV1(page);

  await expect(page.getByRole("heading", { name: "Built-in Providers" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Custom Endpoints" })).toBeVisible();
  await page.locator('[data-provider-id="anthropic"]').click();
  const anthropicAliasRow = page.locator('[data-model-id="claude-sonnet-4-5"]');
  const anthropicAlias = anthropicAliasRow.locator("input");
  await expect(anthropicAlias).toBeEnabled();
  await expectSillyOsCheckboxRecipeV1(anthropicAlias);
  if (!await anthropicAlias.isChecked()) await anthropicAliasRow.click();
  await expect(anthropicAlias).toBeChecked();
  await page.getByRole("button", { name: "Back to Providers" }).click();

  await page.locator('[data-provider-id="openrouter"]').click();
  await expect(
    page.locator('[data-model-id="google/gemini-2.5-flash"] input'),
  ).toBeEnabled();
  const connectionModelSelect = page.locator(".provider-settings__connection-model select");
  await expect(connectionModelSelect).toBeEnabled();
  await expect(connectionModelSelect.locator('option[value="google/gemini-2.5-flash"]'))
    .toHaveCount(1);
  await page.getByRole("button", { name: "Back to Providers" }).click();

  await page.locator('[data-provider-id="openai"]').click();
  await expect(page.getByRole("button", { name: "Back to Providers" })).toBeFocused();
  const modelCount = page.locator(".provider-settings__model-count");
  await expect(modelCount).toHaveText(/^\d+ \/ 38$/u);
  const modelCountLayout = await modelCount.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    whiteSpace: getComputedStyle(element).whiteSpace,
  }));
  expect(modelCountLayout.whiteSpace).toBe("nowrap");
  expect(modelCountLayout.scrollHeight).toBeLessThanOrEqual(modelCountLayout.clientHeight);
  const selectedModel = page.locator('[data-model-id="gpt-5.3-chat-latest"] input');
  const fallbackModel = page.locator('[data-model-id="gpt-4.1-mini"] input');
  const siblingModel = page.locator('[data-model-id="gpt-4.1-nano"] input');
  if (!await selectedModel.isChecked()) await selectedModel.check();
  if (!await fallbackModel.isChecked()) await fallbackModel.check();
  if (!await siblingModel.isChecked()) await siblingModel.check();
  await expect(selectedModel).toBeChecked();
  await expect(fallbackModel).toBeChecked();
  await expect(siblingModel).toBeChecked();
  const endpoint = page.locator(".provider-settings__endpoint input").first();
  await expect(endpoint).toHaveValue("https://api.openai.com/v1");
  await expect(endpoint).toHaveAttribute("data-endpoint-editable", "false");
  await expect(endpoint).not.toBeEditable();
  expect(
    await page.locator(
      '[data-connection-target="builtin:openai:https://api.openai.com/v1"]',
    ).evaluate(
      (connection) => {
        const models = document.querySelector("#models-title")?.closest("section");
        return models !== null && models !== undefined &&
          (connection.compareDocumentPosition(models) & 4) !== 0;
      },
    ),
  ).toBe(true);
  const keyInput = page.getByLabel("API key", { exact: true });
  await expect(keyInput).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show API key" }).click();
  await expect(keyInput).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide API key" }).click();
  await keyInput.fill(sentinel);
  await expect(page.getByRole("button", { name: "Test connection" })).toBeDisabled();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(keyInput).toHaveValue("");
  const credentialSaveReceipt = page.getByText(
    "API key saved in Credential Vault",
    { exact: true },
  );
  await expect(credentialSaveReceipt).toBeVisible();
  const credentialSaveStatus = credentialSaveReceipt.locator("..");
  await expect(credentialSaveStatus.locator("small")).toHaveCount(0);
  await expect(credentialSaveStatus).not.toContainText("OpenAI");
  await expect(credentialSaveStatus).not.toContainText("gpt-4.1-nano");
  await expect(credentialSaveReceipt).toHaveCount(0, { timeout: 4_000 });
  expect(providerProbeRequests).toHaveLength(0);
  await globalBack.click();
  await expect(creatorReadiness).toHaveCount(0);
  const homeModelSelector = homeModelControl.getByRole("combobox", {
    name: "Agent Creator model",
  });
  await expect(homeModelControl).toHaveAttribute("data-model-state", "ready");
  await homeModelSelector.click();
  await expect(homeModelSelector).toHaveAttribute("aria-expanded", "true");
  const readyModelListbox = page.getByRole("listbox", { name: "Agent Creator model" });
  await expect(readyModelListbox).toBeVisible();
  await expect(readyModelListbox.getByRole("option", { name: /GPT-5\.3 Chat/u })).toBeVisible();
  const fallbackModelOption = readyModelListbox.getByRole("option", { name: /GPT-4\.1 mini/u });
  const siblingModelOption = readyModelListbox.getByRole("option", { name: /GPT-4\.1 nano/u });
  await expect(fallbackModelOption).toBeVisible();
  await expect(siblingModelOption).toBeVisible();
  await expect(readyModelListbox.getByRole("option", { name: /Anthropic/u })).toHaveCount(0);
  await siblingModelOption.dispatchEvent("click");
  await expect(homeModelControl).toHaveAttribute("data-model-state", "ready");
  await expect(homeModelSelector).toHaveAttribute(
    "data-selected-value",
    JSON.stringify(["builtin", "openai", "gpt-4.1-nano"]),
  );
  const modelSettingsAction = homeModelControl.getByRole("button", { name: "Model settings" });

  await homeModelSelector.click();
  await expect(modelSettingsAction).toBeVisible();
  await homeModelSelector.press("Tab");
  await expect(modelSettingsAction).toBeFocused();
  await modelSettingsAction.press("Enter");
  await expect(settings).toBeVisible();
  await expect(globalBack).toBeFocused();
  await page.locator('[data-provider-id="openai"]').click();
  await expect(page.getByText("API key saved in Credential Vault", { exact: true }))
    .toHaveCount(0);
  await connectionModelSelect.selectOption("gpt-4.1-nano");
  const testConnectionButton = page.getByRole("button", { name: "Test connection" });
  await expect(testConnectionButton).toBeEnabled();
  await testConnectionButton.click();
  await expect(page.getByText("Last connection test passed", { exact: true })).toBeVisible();
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

  await settingsVault.click();
  await expect(page.locator('[data-vault-phase="unlocked"]')).toBeVisible();
  await expect(page.locator('[data-vault-mode="device"]')).toContainText("Automatic");
  await expect(page.getByText("builtin:openai", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Vault password", { exact: true }).fill(vaultPassword);
  await page.getByLabel("Confirm password", { exact: true }).fill(vaultPassword);
  await page.getByRole("button", { name: "Use Password mode" }).click();
  await expect(page.locator('[data-vault-mode="password"]')).toContainText("Password");
  await expect(page.getByRole("button", { name: "Change password" })).toBeVisible();
  const lockVaultButton = page.getByRole("button", { name: "Lock", exact: true });
  await lockVaultButton.click();
  await expect(page.locator('[data-vault-phase="locked"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Unlock", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Forget builtin:openai" }).first())
    .toBeDisabled();
  await page.getByLabel("Vault password", { exact: true }).fill(vaultPassword);
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.locator('[data-vault-phase="unlocked"]')).toBeVisible();

  await page.reload();
  await expectProgramStorageReadyV1(page);
  await expect(creatorReadiness).toHaveAttribute("data-creator-readiness", "vault_locked");
  await expect(homeModelControl).toHaveCount(0);
  await page.locator('[data-open-settings="home"]').click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page.locator('[data-settings-section="general"]')).toBeVisible();
  await page.getByRole("button", { name: "Credential Vault", exact: true }).click();
  await expect(page.locator('[data-vault-phase="locked"]')).toBeVisible();
  await expect(page.locator('[data-vault-mode="password"]')).toContainText("Password");
  await expect(page.getByText("builtin:openai", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("https://api.openai.com/v1", { exact: true }).first())
    .toBeVisible();
  await page.getByLabel("Vault password", { exact: true }).fill(vaultPassword);
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.locator('[data-vault-phase="unlocked"]')).toBeVisible();
  await page.getByRole("button", { name: "Providers", exact: true }).click();
  await page.locator('[data-provider-id="openai"]').click();
  await expect(page.locator('.provider-settings__credential-form[data-key-saved="true"]'))
    .toBeVisible();
  const savedCredentialControls = page.locator(".provider-settings__credential-controls");
  await expect(
    savedCredentialControls.getByRole("button", { name: "Update", exact: true }),
  ).toBeVisible();
  await expect(
    savedCredentialControls.getByRole("button", {
      name: "Delete saved API key",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.locator(".provider-settings__connection-actions").getByRole("button", {
      name: "Delete saved API key",
      exact: true,
    }),
  ).toHaveCount(0);
  await globalBack.click();
  await expect(creatorReadiness).toHaveCount(0);
  await expect(homeModelControl).toHaveAttribute("data-model-state", "ready");
  await expect(homeModelSelector).toHaveAttribute(
    "data-selected-value",
    JSON.stringify(["builtin", "openai", "gpt-4.1-nano"]),
  );

  const creatorIntent = page.getByRole("textbox", { name: "What would you like to make?" });
  await expect(creatorIntent).toHaveClass(/\bsos-textarea\b/u);
  const createProgramButton = page.getByRole("button", { name: "Create program" });
  await expect(createProgramButton).toBeDisabled();
  await creatorIntent.fill(translationIntentV1);
  await expect(createProgramButton).toBeEnabled();
  expect(providerProbeRequests).toHaveLength(1);

  const modelSelectorBox = await homeModelSelector.boundingBox();
  const createProgramBox = await createProgramButton.boundingBox();
  const composerActionsBox = await page.locator(".creator-composer__actions").boundingBox();
  expect(modelSelectorBox).not.toBeNull();
  expect(createProgramBox).not.toBeNull();
  expect(composerActionsBox).not.toBeNull();
  expect((modelSelectorBox?.x ?? 0) + (modelSelectorBox?.width ?? 0)).toBeLessThanOrEqual(
    createProgramBox?.x ?? 0,
  );
  expect(createProgramBox?.x ?? 0).toBeGreaterThanOrEqual(composerActionsBox?.x ?? 0);
  expect((createProgramBox?.x ?? 0) + (createProgramBox?.width ?? 0)).toBeLessThanOrEqual(
    (composerActionsBox?.x ?? 0) + (composerActionsBox?.width ?? 0),
  );

  await createProgramButton.click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  const programId = await readProgramIdV1(workspace);
  const workspaceModelControl = page.locator('[data-model-picker-surface="workspace"]');
  const workspaceModelSelector = workspaceModelControl.getByRole("combobox", {
    name: "Agent Creator model",
  });
  await expect(workspaceModelControl).toHaveAttribute("data-model-state", "ready");
  await expect(workspaceModelSelector).toBeEnabled();
  await expect(workspaceModelSelector).toHaveAttribute(
    "data-selected-value",
    JSON.stringify(["builtin", "openai", "gpt-4.1-nano"]),
  );
  await expect(page.getByText("Model Provider", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Forget Provider key" })).toHaveCount(0);
  await expect(
    page.locator(
      '[data-pi-agent-runtime="pi_provider"][data-pi-agent-run-status="ready"]',
    ),
  ).toHaveCount(0);

  const chatFeed = page.locator(".chat-pane__feed");
  const chatComposer = page.locator(".chat-composer");
  await expect(chatComposer.getByRole("textbox", { name: "Ask for a change…" }))
    .toHaveClass(/\bsos-textarea\b/u);
  const proposalCard = page.locator(".program-proposal");
  const workspaceReviewCard = page.locator(".program-workspace-review");
  const workpieceLink = page.locator(".workpiece-link");
  const [chatFeedBox, chatComposerBox, proposalCardBox, workspaceReviewCardBox, workpieceLinkBox] =
    await Promise.all([
      chatFeed.boundingBox(),
      chatComposer.boundingBox(),
      proposalCard.boundingBox(),
      workspaceReviewCard.boundingBox(),
      workpieceLink.boundingBox(),
    ]);
  expect(chatFeedBox).not.toBeNull();
  expect(chatComposerBox).not.toBeNull();
  expect(proposalCardBox).not.toBeNull();
  expect(workspaceReviewCardBox).not.toBeNull();
  expect(workpieceLinkBox).not.toBeNull();
  expect(
    Math.abs(
      (chatComposerBox?.x ?? 0) - ((chatFeedBox?.x ?? 0) + 14),
    ),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(
      ((chatComposerBox?.x ?? 0) + (chatComposerBox?.width ?? 0)) -
        ((chatFeedBox?.x ?? 0) + (chatFeedBox?.width ?? 0) - 14),
    ),
  ).toBeLessThanOrEqual(1);
  expect(
    (workspaceReviewCardBox?.y ?? 0) -
      ((proposalCardBox?.y ?? 0) + (proposalCardBox?.height ?? 0)),
    "proposal-to-review gap",
  ).toBeGreaterThanOrEqual(15);
  expect(
    (workpieceLinkBox?.y ?? 0) -
      ((workspaceReviewCardBox?.y ?? 0) + (workspaceReviewCardBox?.height ?? 0)),
    "review-to-workpiece gap",
  ).toBeGreaterThanOrEqual(15);
  expect(
    (chatComposerBox?.y ?? 0) -
      ((chatFeedBox?.y ?? 0) + (chatFeedBox?.height ?? 0)),
    "feed-to-composer gap",
  ).toBeGreaterThanOrEqual(9);

  const workspaceSendButton = chatComposer.getByRole("button", { name: "Send" });
  const [workspaceModelSelectorBox, workspaceSendBox] = await Promise.all([
    workspaceModelSelector.boundingBox(),
    workspaceSendButton.boundingBox(),
  ]);
  expect(workspaceModelSelectorBox).not.toBeNull();
  expect(workspaceSendBox).not.toBeNull();
  for (const controlBox of [workspaceModelSelectorBox, workspaceSendBox]) {
    expect(controlBox?.height ?? 0).toBeGreaterThanOrEqual(42);
  }
  expect(
    (workspaceModelSelectorBox?.x ?? 0) + (workspaceModelSelectorBox?.width ?? 0),
  ).toBeLessThanOrEqual(workspaceSendBox?.x ?? 0);

  await workspaceModelSelector.click();
  const workspaceModelListbox = page.getByRole("listbox", { name: "Agent Creator model" });
  await expect(workspaceModelListbox).toBeVisible();
  await expect(workspaceModelListbox.getByRole("option", { name: /GPT-5\.3 Chat/u })).toBeVisible();
  await expect(workspaceModelListbox.getByRole("option", { name: /GPT-4\.1 mini/u })).toBeVisible();
  await expect(workspaceModelListbox.getByRole("option", { name: /GPT-4\.1 nano/u }))
    .toHaveAttribute("aria-selected", "true");
  const workspaceModelSettingsAction = workspaceModelControl.getByRole("button", {
    name: "Model settings",
  });
  await workspaceModelSelector.press("Tab");
  await expect(workspaceModelSettingsAction).toBeFocused();
  await workspaceModelSettingsAction.press("Enter");
  await expect(settings).toBeVisible();
  await expect(globalBack).toBeFocused();
  await globalBack.click();
  await expect(workspace).toHaveAttribute("data-program-id", programId);
  await expect(workspaceModelSelector).toBeFocused();

  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(workspace).toHaveAttribute("data-workspace-layout", "dual-pane");
  await expect(
    page.getByRole("heading", { name: "No visual workpiece has been published yet" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Source" })).toHaveCount(0);
  await expect(page.getByRole("progressbar", { name: "Project progress" })).toHaveCount(0);
  const desktopChatShell = page.locator(".program-workspace__chat-shell");
  const desktopSeparator = page.getByRole("separator", {
    name: "Resize conversation and workpiece panes",
  });
  await desktopSeparator.focus();
  await desktopSeparator.press("Home");
  await expect(desktopSeparator).toHaveAttribute("aria-valuenow", "280");
  const desktopChatShellBox = await desktopChatShell.boundingBox();
  expect(desktopChatShellBox).not.toBeNull();
  expect(Math.round(desktopChatShellBox?.width ?? 0)).toBe(280);

  await workspaceModelSelector.click();
  await expect(workspaceModelListbox).toBeVisible();
  const workspaceModelPopover = workspaceModelControl.locator(
    ".creator-composer__model-popover",
  );
  const desktopComposerActions = chatComposer.locator(".chat-composer__actions");
  await expect(workspaceModelPopover).toBeVisible();
  const [workspaceModelPopoverBox, desktopComposerActionsBox] = await Promise.all([
    workspaceModelPopover.boundingBox(),
    desktopComposerActions.boundingBox(),
  ]);
  expect(workspaceModelPopoverBox).not.toBeNull();
  expect(desktopComposerActionsBox).not.toBeNull();
  expect(
    (workspaceModelPopoverBox?.x ?? Number.NEGATIVE_INFINITY) + 1,
  ).toBeGreaterThanOrEqual(desktopChatShellBox?.x ?? Number.POSITIVE_INFINITY);
  expect(
    (workspaceModelPopoverBox?.x ?? 0) + (workspaceModelPopoverBox?.width ?? 0),
  ).toBeLessThanOrEqual(
    (desktopChatShellBox?.x ?? 0) + (desktopChatShellBox?.width ?? 0) + 1,
  );
  expect(
    (workspaceModelPopoverBox?.x ?? Number.NEGATIVE_INFINITY) + 1,
  ).toBeGreaterThanOrEqual(desktopComposerActionsBox?.x ?? Number.POSITIVE_INFINITY);
  expect(
    (workspaceModelPopoverBox?.x ?? 0) + (workspaceModelPopoverBox?.width ?? 0),
  ).toBeLessThanOrEqual(
    (desktopComposerActionsBox?.x ?? 0) + (desktopComposerActionsBox?.width ?? 0) + 1,
  );
  await workspaceModelSelector.press("Escape");
  await expect(workspaceModelPopover).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(workspace).toHaveAttribute("data-workspace-layout", "single-pane");
  await expectNoPageOverflowV1(page);

  const workspaceSettings = page.locator('[data-open-settings="workspace"]');
  await workspaceSettings.click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(settings).toBeVisible();
  await expect(globalBack).toBeFocused();
  await globalBack.click();
  await expect(workspace).toHaveAttribute("data-program-id", programId);
  await expect(workspaceSettings).toBeFocused();

  await workspaceSettings.click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Providers", exact: true }).click();
  await page.locator('[data-provider-id="openai"]').click();
  await expect(page.getByText("API key saved in Credential Vault", { exact: true }))
    .toHaveCount(0);
  const mobileCredentialActions = page.locator(".provider-settings__credential-actions");
  const mobileUpdateButton = mobileCredentialActions.getByRole("button", {
    name: "Update",
    exact: true,
  });
  const mobileDeleteButton = mobileCredentialActions.getByRole("button", {
    name: "Delete saved API key",
    exact: true,
  });
  const mobileUpdateBox = await mobileUpdateButton.boundingBox();
  const mobileDeleteBox = await mobileDeleteButton.boundingBox();
  expect(mobileUpdateBox).not.toBeNull();
  expect(mobileDeleteBox).not.toBeNull();
  expect(mobileUpdateBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(mobileDeleteBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(mobileDeleteBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(Math.abs((mobileUpdateBox?.y ?? 0) - (mobileDeleteBox?.y ?? 0))).toBeLessThan(1);
  await mobileDeleteButton.click();
  await expect(page.getByLabel("API key", { exact: true })).toBeVisible();
  await expect(page.locator('.provider-settings__credential-form[data-key-saved="false"]'))
    .toBeVisible();
  await settingsVault.click();
  await expect(page.getByText("No Provider API key is saved.", { exact: true })).toBeVisible();
  await settingsProviders.click();
  await expect(page.locator('[data-provider-id="openai"]')).toHaveAttribute(
    "data-credential-status",
    "unset",
  );
  await globalBack.click();
  await expect(workspaceSettings).toBeFocused();
  await page.getByRole("button", { name: "Creator home" }).click();
  await expect(creatorReadiness).toHaveAttribute(
    "data-creator-readiness",
    "credential_required",
  );
  await expect(creatorReadiness).toContainText("API key required");
  await expect(homeModelControl).toHaveCount(0);
  await expectNoPageOverflowV1(page);

  expect(observedNetwork.join("\n")).not.toContain(sentinel);
  expect(observedConsole.join("\n")).not.toContain(sentinel);
  expect(await page.content()).not.toContain(sentinel);
  expect(observedNetwork.join("\n")).not.toContain(vaultPassword);
  expect(observedConsole.join("\n")).not.toContain(vaultPassword);
  expect(await page.content()).not.toContain(vaultPassword);
  const persistentBrowserState = await page.evaluate(() => {
    const entries: [string, string | null][] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key !== null) entries.push([key, localStorage.getItem(key)]);
    }
    return entries;
  });
  expect(JSON.stringify(persistentBrowserState)).not.toContain(sentinel);
  expect(JSON.stringify(persistentBrowserState)).not.toContain(vaultPassword);
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
  const creatorReadiness = page.locator('[data-creator-readiness-surface="home"]');
  await expect(creatorReadiness).toHaveAttribute(
    "data-creator-readiness",
    "credential_required",
  );
  await creatorReadiness.getByRole("button", { name: "Open Providers" }).click();
  await expect(page.locator('[data-silly-os-view="settings"]')).toBeVisible();
  await page.locator('[data-add-custom-endpoint="true"]').click();

  await page.getByLabel("Name").fill(customName);
  await page.getByLabel("API format").selectOption("openai-responses");
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
  await expect(customProfile).toHaveAttribute("data-connection-status", "available");
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

  const customKeyInput = page.getByLabel("API key", { exact: true });
  await customKeyInput.fill(customSentinel);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(customKeyInput).toHaveValue("");
  await expect(page.getByText("API key saved in Credential Vault", { exact: true }))
    .toBeVisible();
  await expect(page.locator('.provider-settings__credential-form[data-key-saved="true"]'))
    .toBeVisible();
  expect(customProbeRequests).toHaveLength(0);
  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(customKeyInput).toHaveValue("");
  const customConnection = page.locator(
    `.provider-settings__credential-form[data-key-saved="true"]`,
  );
  await expect(customConnection).toContainText("Last connection test passed");
  await expect(customConnection).toContainText(customModel);
  await expect(customConnection).not.toContainText(customName);
  await expect(customProfile).toHaveAttribute("data-connection-status", "available");
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
  }, browserProviderSettingsStorageKeyV2);
  expect(savedProfile).toMatchObject({
    revision: 2,
    customProfiles: [{
      displayName: customName,
      api: "openai-responses",
      baseUrl: customEndpoint,
      modelId: customModel,
      contextWindow: 131_072,
      maxTokens: 8_192,
    }],
    preferredModel: null,
  });
  expect(JSON.stringify(savedProfile).toLocaleLowerCase()).not.toContain("api_key");
  expect(JSON.stringify(savedProfile).toLocaleLowerCase()).not.toContain("apikey");
  expect(JSON.stringify(savedProfile)).not.toContain(customSentinel);
  expect(await page.content()).not.toContain(customSentinel);

  await page.reload();
  await expectProgramStorageReadyV1(page);
  await expect(creatorReadiness).toHaveCount(0);
  await expect(page.locator('[data-creator-model-selector="true"]')).toHaveAttribute(
    "data-model-state",
    "ready",
  );
  await page.locator('[data-open-settings="home"]').click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page.locator('[data-settings-section="general"]')).toBeVisible();
  await page.getByRole("button", { name: "Providers", exact: true }).click();
  const reloadedProfile = page.locator("[data-custom-profile-id]");
  await expect(reloadedProfile).toHaveCount(1);
  await expect(reloadedProfile).toContainText(customName);
  await expect(reloadedProfile).toHaveAttribute("data-connection-status", "available");
  await reloadedProfile.click();
  await expect(
    page.locator('.provider-settings__endpoint input[aria-label="Endpoint"]'),
  ).toHaveValue(customEndpoint);
  await expect(page.getByText("131,072", { exact: true })).toBeVisible();
  await expect(page.getByText("8,192", { exact: true })).toBeVisible();
  await expect(page.locator('.provider-settings__credential-form[data-key-saved="true"]'))
    .toBeVisible();
  await expect(
    page.locator(".provider-settings__credential-controls").getByRole("button", {
      name: "Update",
      exact: true,
    }),
  ).toBeVisible();

  const customCredentialActions = page.locator(".provider-settings__credential-actions");
  const customUpdateBox = await customCredentialActions.getByRole("button", {
    name: "Update",
    exact: true,
  }).boundingBox();
  const customDeleteBox = await customCredentialActions.getByRole("button", {
    name: "Delete saved API key",
    exact: true,
  }).boundingBox();
  expect(customUpdateBox).not.toBeNull();
  expect(customDeleteBox).not.toBeNull();
  expect(Math.abs((customUpdateBox?.y ?? 0) - (customDeleteBox?.y ?? 0))).toBeLessThan(1);

  await page.getByRole("button", { name: "Delete saved API key" }).click();
  await expect(page.locator('.provider-settings__credential-form[data-key-saved="false"]'))
    .toBeVisible();
  await expect(reloadedProfile).toHaveAttribute("data-connection-status", "available");

  await page.getByRole("button", { name: "Remove" }).click();
  await expect(reloadedProfile).toHaveCount(0);
  expect(
    JSON.parse(
      await page.evaluate(
        (storageKey) => localStorage.getItem(storageKey) ?? "null",
        browserProviderSettingsStorageKeyV2,
      ),
    ),
  ).toMatchObject({
    revision: 2,
    customProfiles: [],
    preferredModel: null,
  });

  await page.reload();
  await expectProgramStorageReadyV1(page);
  await expect(creatorReadiness).toHaveAttribute(
    "data-creator-readiness",
    "credential_required",
  );
  await creatorReadiness.getByRole("button", { name: "Open Providers" }).click();
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

  await expect(page.getByRole("tab", { name: "View" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("heading", { name: "No visual workpiece has been published yet" }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Capabilities" }).click();
  await expect(page.getByRole("heading", { name: "Capabilities" })).toBeVisible();
  await expect(page.getByText("Deterministic test wiring", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
  await expect(page.getByText("Accepted Program proposal v1", { exact: true })).toBeVisible();
  await expectNoPageOverflowV1(page);

  await page.getByRole("button", { name: "Creator home" }).click();
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expectProgramStorageReadyV1(page);
  await page.goto(sillyOsTargetUrlV1("?locale=en"));
  await expectProgramStorageReadyV1(page);
  await expect(page.locator('[data-creator-readiness-surface="home"]')).toHaveAttribute(
    "data-creator-readiness",
    "credential_required",
  );
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
  await expect(workspace).toHaveAttribute("data-program-revision", "1");
  await expect(page.getByRole("tab", { name: "Source" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByText("Accepted Program proposal v1", { exact: true })).toBeVisible();
});

test("a pending Program remains locally reviewable without a Provider credential", async ({ durableProgramPage: page }) => {
  const initialWorkspace = await openTranslationWorkspaceV1(page);
  const programId = await readProgramIdV1(initialWorkspace);

  await page.getByRole("button", { name: "Creator home" }).click();
  await expectProgramStorageReadyV1(page);
  await page.goto(sillyOsTargetUrlV1("?locale=en"));
  await expectProgramStorageReadyV1(page);

  const readiness = page.locator('[data-creator-readiness-surface="home"]');
  await expect(readiness).toHaveAttribute("data-creator-readiness", "credential_required");
  const recentProgram = page.getByRole("button", {
    name: "Open program: Translation Workshop",
    exact: true,
  });
  await expect(recentProgram).toHaveAttribute("data-program-id", programId);
  await expect(recentProgram).toBeEnabled();
  await recentProgram.click();

  await expect(page.locator('[data-creator-readiness-surface="workspace"]')).toHaveAttribute(
    "data-creator-readiness",
    "credential_required",
  );
  await expect(page.getByRole("textbox", { name: "Ask for a change…" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Accept program" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Reject proposal" })).toBeEnabled();
  await page.getByRole("button", { name: "Accept program" }).click();
  await expectProgramStorageReadyV1(page);
  await expect(page.getByText("Program accepted", { exact: true }).first()).toBeVisible();
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
    page.locator('[data-chat-role="creator"]').getByText(
      "Deterministic test proposal ready.",
      { exact: true },
    ).last(),
  ).toBeVisible();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(page.getByRole("button", { name: "Accept program" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reject proposal" })).toBeVisible();

  await expect(page.getByRole("main", { name: "SillyOS program workspace" }))
    .toHaveAttribute("data-program-revision", "2");
  await expect(page.getByRole("tab", { name: "Source" })).toHaveCount(0);

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

test("@s1a-ordinary the query-gated Browser Pi Worker uses and cold-reopens the independent Workspace Sandbox without retaining its test key", async ({ durableProgramPage: page }) => {
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
    ).last(),
  ).toBeVisible();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-tool", "write");
  await expect(workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  await expect(workspace).toHaveAttribute(
    "data-execution-workspace-path",
    ordinaryWorkspaceRoundTripPathV1,
  );
  const continuation = await readWorkspaceContinuationV1(page, programId);
  if (continuation === null) throw new Error("Ordinary Program lost its Workspace continuation");
  await expectOrdinaryWorkspaceSandboxV1(page, continuation, followUp);

  await expect(workspace).toHaveAttribute("data-program-revision", "2");
  await expect(page.getByRole("tab", { name: "Source" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Capabilities" }).click();
  await expect(page.getByText("Deterministic test wiring", { exact: true })).toBeVisible();
  await expect(page.getByText("Program workspace checkpoint", { exact: true })).toBeVisible();
  await expect(page.getByText("Open · generation 2", { exact: true })).toBeVisible();
  await expect(page.getByText("Last write: succeeded / changed", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Creator home" }).click();
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expectProgramStorageReadyV1(page);
  await expect(page.locator(".silly-os")).toHaveAttribute("data-agent-workspace-state", "closed");
  await expect(page.locator("iframe[data-silly-os-workspace-sandbox='active']")).toHaveCount(1);
  await page.reload();
  await expectProgramStorageReadyV1(page);
  await expect(page.getByRole("heading", { name: "Recent programs", level: 2 })).toBeVisible();

  const recentProgram = page.getByRole("button", {
    name: "Open program: Translation Workshop",
    exact: true,
  });
  await expect(recentProgram).toHaveAttribute("data-program-id", programId);
  await expect(recentProgram).toContainText("v2 · Preview");
  await expect(recentProgram).toBeEnabled();

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
  expect(await readWorkspaceContinuationV1(page, programId)).toEqual(continuation);
  await expectOrdinaryWorkspaceSandboxV1(page, continuation, followUp);
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
  await expectOrdinaryWorkspaceSandboxV1(page, continuation, followUp);

  await expect(reopenedWorkspace).toHaveAttribute("data-program-revision", "3");
  await expect(page.getByRole("tab", { name: "Source" })).toHaveCount(0);

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
  await expect(replacedWorkspace).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(replacedWorkspace).not.toHaveAttribute(
    "data-execution-workspace-session",
    reopenedWorkspaceSessionId,
  );
  await page.getByRole("button", { name: "Creator home" }).click();
  await expect(page.locator(".silly-os")).toHaveAttribute("data-agent-workspace-state", "closed");
});

test("@s1b-edit the pinned native Pi edit tool changes and cold-reopens exact Sandbox bytes", async ({ durableProgramPage: page }) => {
  await openCreatorHomeV1(page);
  await initializePiTestV1(page, "sillyos-browser-pi-edit-sentinel-key");

  const creatorIntent = page.getByRole("textbox", { name: "What would you like to make?" });
  await creatorIntent.fill(translationIntentV1);
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectProgramStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "open");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "1");
  const programId = await readProgramIdV1(workspace);

  const editText = `${deterministicEditProbePrefixV1}keep this exact edited file.`;
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(editText);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(editText, { exact: true })).toBeVisible();
  await expect(
    page.locator('[data-chat-role="creator"]').getByText(
      "Deterministic test proposal ready.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "3");
  await expect(workspace).toHaveAttribute("data-execution-workspace-tool", "edit");
  await expect(workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  await expect(workspace).toHaveAttribute(
    "data-execution-workspace-path",
    ordinaryWorkspaceRoundTripPathV1,
  );
  const continuation = await readWorkspaceContinuationV1(page, programId);
  if (continuation === null) throw new Error("Edit proof lost its Workspace continuation");
  await expectOrdinaryWorkspaceSandboxV1(page, continuation, editText);

  await page.getByRole("button", { name: "Creator home" }).click();
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await page.reload();
  await expectProgramStorageReadyV1(page);
  await initializePiTestV1(page, "sillyos-browser-pi-edit-sentinel-key");
  await openRecentTranslationProgramV1(page, {
    programId,
    revision: 2,
    status: "Preview",
  });
  const reopened = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(reopened).toHaveAttribute("data-execution-workspace-state", "open");
  await expect(reopened).toHaveAttribute("data-execution-workspace-generation", "3");
  expect(await readWorkspaceContinuationV1(page, programId)).toEqual(continuation);
  await expectOrdinaryWorkspaceSandboxV1(page, continuation, editText);
});

test("@s1b-bash the pinned native Pi bash tool changes and cold-reopens exact Sandbox bytes", async ({ durableProgramPage: page }) => {
  await openCreatorHomeV1(page);
  await initializePiTestV1(page, "sillyos-browser-pi-bash-sentinel-key");

  const creatorIntent = page.getByRole("textbox", { name: "What would you like to make?" });
  await creatorIntent.fill(translationIntentV1);
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectProgramStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "open");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "1");
  const programId = await readProgramIdV1(workspace);

  const bashPrompt = `${deterministicBashProbePrefixV1}write and search one exact file.`;
  const bashText = "SillyOS native bash checkpoint\n";
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(bashPrompt);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(bashPrompt, { exact: true })).toBeVisible();
  await expect(
    page.locator('[data-chat-role="creator"]').getByText(
      "Deterministic test proposal ready.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "3");
  await expect(workspace).toHaveAttribute("data-execution-workspace-tool", "bash");
  await expect(workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  await expect(workspace).toHaveAttribute(
    "data-execution-workspace-path",
    ordinaryWorkspaceBashRoundTripPathV1,
  );
  const continuation = await readWorkspaceContinuationV1(page, programId);
  if (continuation === null) throw new Error("Bash proof lost its Workspace continuation");
  await expectOrdinaryWorkspaceSandboxV1(
    page,
    continuation,
    bashText,
    ordinaryWorkspaceBashRoundTripPathV1,
  );

  await page.getByRole("button", { name: "Creator home" }).click();
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await page.reload();
  await expectProgramStorageReadyV1(page);
  await initializePiTestV1(page, "sillyos-browser-pi-bash-sentinel-key");
  await openRecentTranslationProgramV1(page, {
    programId,
    revision: 2,
    status: "Preview",
  });
  const reopened = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(reopened).toHaveAttribute("data-execution-workspace-state", "open");
  await expect(reopened).toHaveAttribute("data-execution-workspace-generation", "3");
  expect(await readWorkspaceContinuationV1(page, programId)).toEqual(continuation);
  await expectOrdinaryWorkspaceSandboxV1(
    page,
    continuation,
    bashText,
    ordinaryWorkspaceBashRoundTripPathV1,
  );
});

test("@s2-file-ops Pi native bash preserves the exact workspace file lifecycle across cold reopen", async ({ durableProgramPage: page }) => {
  test.setTimeout(120_000);
  await openCreatorHomeV1(page);
  await initializePiTestV1(page, "sillyos-browser-pi-file-ops-sentinel-key");

  const creatorIntent = page.getByRole("textbox", { name: "What would you like to make?" });
  await creatorIntent.fill(translationIntentV1);
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectProgramStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "open");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "1");
  const programId = await readProgramIdV1(workspace);

  const fileOpsPrompt =
    `${deterministicFileOpsProbePrefixV1}prove mkdir, touch, cp, mv, rm, and find-delete.`;
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(fileOpsPrompt);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(fileOpsPrompt, { exact: true })).toBeVisible();
  await expect(
    page.locator('[data-chat-role="creator"]').getByText(
      "Deterministic test proposal ready.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "22");
  await expect(workspace).toHaveAttribute("data-execution-workspace-receipt", "1");
  await expect(workspace).toHaveAttribute("data-execution-workspace-tool", "bash");
  await expect(workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  await expect(workspace).toHaveAttribute("data-execution-workspace-path", ".sillyos");
  await expect(workspace).toHaveAttribute("data-workspace-review-pending-generation", "22");

  const continuation = await readWorkspaceContinuationV1(page, programId);
  if (continuation === null) {
    throw new Error("File-operations proof lost its Workspace continuation");
  }
  const inspectedPaths = [
    ".sillyos/file-ops/moved.txt",
    ".sillyos/file-ops/kept-empty.txt",
    ".sillyos/file-ops/copied-tree/nested",
    ".sillyos/file-ops/source",
    ".sillyos/file-ops/copied-tree/nested/source.txt",
    ".sillyos/file-ops/copied-tree/nested/empty.txt",
  ] as const;
  const expectedEntries = {
    ".sillyos/file-ops/moved.txt": {
      kind: "file",
      size: new TextEncoder().encode("SillyOS workspace file operations\n").byteLength,
      text: "SillyOS workspace file operations\n",
    },
    ".sillyos/file-ops/kept-empty.txt": { kind: "file", size: 0, text: "" },
    ".sillyos/file-ops/copied-tree/nested": { kind: "directory", size: 0, text: null },
    ".sillyos/file-ops/source": { kind: "missing", size: 0, text: null },
    ".sillyos/file-ops/copied-tree/nested/source.txt": {
      kind: "missing",
      size: 0,
      text: null,
    },
    ".sillyos/file-ops/copied-tree/nested/empty.txt": {
      kind: "missing",
      size: 0,
      text: null,
    },
  } satisfies Readonly<Record<string, SandboxWorkspaceEntryInspectionV1>>;
  await expect.poll(() => inspectSandboxWorkspaceEntriesV1(page, continuation, inspectedPaths))
    .toEqual(expectedEntries);

  await page.getByRole("button", { name: "Creator home" }).click();
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await page.reload();
  await expectProgramStorageReadyV1(page);
  await initializePiTestV1(page, "sillyos-browser-pi-file-ops-sentinel-key");
  await openRecentTranslationProgramV1(page, {
    programId,
    revision: 2,
    status: "Preview",
  });
  const reopened = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(reopened).toHaveAttribute("data-execution-workspace-state", "open");
  await expect(reopened).toHaveAttribute("data-execution-workspace-generation", "22");
  await expect(reopened).toHaveAttribute("data-workspace-review-pending-generation", "22");
  expect(await readWorkspaceContinuationV1(page, programId)).toEqual(continuation);
  await expect.poll(() => inspectSandboxWorkspaceEntriesV1(page, continuation, inspectedPaths))
    .toEqual(expectedEntries);
});

test("@s1a-ordinary two pages fence Sandbox ownership and the successor cold-opens the exact released checkpoint", async ({ durableProgramPage: page }) => {
  test.setTimeout(120_000);
  await openCreatorHomeV1(page);
  await initializePiTestV1(page, "sillyos-first-owner-bootstrap");
  await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
    translationIntentV1,
  );
  await page.getByRole("button", { name: "Create program" }).click();
  const initialWorkspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(initialWorkspace).toHaveAttribute("data-execution-workspace-state", "open");
  const programId = await readProgramIdV1(initialWorkspace);
  const initialContinuation = await readWorkspaceContinuationV1(page, programId);
  if (initialContinuation === null) {
    throw new Error("Initial Program has no Workspace continuation");
  }
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

  const durableText = "Retain these exact bytes across an independent Sandbox ownership handoff.";
  await owner.page.getByRole("textbox", { name: "Ask for a change…" }).fill(durableText);
  await owner.page.getByRole("button", { name: "Send" }).click();
  await expect(owner.page.locator('[data-pi-agent-run-status="running"]')).toHaveCount(0);
  await expect(owner.page.getByText(durableText, { exact: true })).toBeVisible();
  await expect(owner.workspace).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(owner.workspace).toHaveAttribute("data-execution-workspace-tool", "write");
  await expect(owner.workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  const ownerSessionId = await readWorkspaceSessionIdV1(owner.workspace);
  const durableContinuation = await readWorkspaceContinuationV1(owner.page, programId);
  expect(durableContinuation).toEqual({
    ...initialContinuation,
    programRevision: 2,
    repositoryRevision: 2,
  });
  await expectOrdinaryWorkspaceSandboxV1(owner.page, initialContinuation, durableText);

  await owner.page.getByRole("button", { name: "Creator home" }).click();
  await expect(owner.page.locator(".silly-os")).toHaveAttribute(
    "data-agent-workspace-state",
    "closed",
  );
  await expect(
    owner.page.locator("iframe[data-silly-os-workspace-sandbox='active']"),
  ).toHaveCount(1);

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
  expect(await readWorkspaceContinuationV1(contender.page, programId)).toEqual(durableContinuation);
  await expectOrdinaryWorkspaceSandboxV1(contender.page, initialContinuation, durableText);

  const verify = "Verify the persisted workspace contains exactly: " + durableText;
  await contender.page.getByRole("textbox", { name: "Ask for a change…" }).fill(verify);
  await contender.page.getByRole("button", { name: "Send" }).click();
  await expect(contender.page.getByText(verify, { exact: true })).toBeVisible();
  await expect(contender.page.locator('[data-proposal-status="pending"]')).toContainText("v3");
  await expect(recovered).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(recovered).not.toHaveAttribute("data-execution-workspace-receipt", /.+/u);
  await expectOrdinaryWorkspaceSandboxV1(contender.page, initialContinuation, durableText);
  await contenderPage.close();
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
  await expect(readProgramDatabaseStateV7(page)).resolves.toEqual({
    version: 7,
    programRows: [],
    continuationRows: [],
    networkAccessRows: [],
  });
});

test(
  "@s1a-ordinary an accepted Program cancels before download authorization, then exports its generation 2 snapshot",
  async ({ durableProgramPage: page }, testInfo) => {
    test.setTimeout(120_000);
    await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
    await expectProgramStorageReadyV1(page);
    await initializePiTestV1(page, "sillyos-ordinary-snapshot-export");
    await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
      translationIntentV1,
    );
    await page.getByRole("button", { name: "Create program" }).click();
    const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
    await expect(workspace).toHaveAttribute("data-execution-workspace-state", "open");
    await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "1");
    const programId = await readProgramIdV1(workspace);

    const snapshotText = "Put these exact ordinary Program bytes into the accepted snapshot.";
    await page.getByRole("textbox", { name: "Ask for a change…" }).fill(snapshotText);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.locator('[data-pi-agent-run-status="running"]')).toHaveCount(0);
    await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "2");
    await expect(workspace).toHaveAttribute("data-execution-workspace-tool", "write");
    const continuation = await readWorkspaceContinuationV1(page, programId);
    if (continuation === null) throw new Error("Snapshot Program has no Workspace continuation");
    await expectOrdinaryWorkspaceSandboxV1(page, continuation, snapshotText);

    await page.getByRole("button", { name: "Accept program" }).click();
    await expectProgramStorageReadyV1(page);
    await expect(page.locator('[data-proposal-status="accepted"]')).toBeVisible();
    const aggregate = await readDurableProgramV3(page, programId);
    const accepted = aggregate?.decisions.at(-1);
    if (accepted?.status !== "accepted") {
      throw new Error("Ordinary Program has no accepted Workspace snapshot");
    }
    expect(accepted.snapshot).toMatchObject({
      programId,
      workspaceId: continuation.workspaceId,
      volumeId: continuation.volumeId,
      workspaceFormat: 1,
      programRevision: 2,
      generation: 2,
      fileCount: 1,
    });
    await expect(workspace).toHaveAttribute("data-workspace-review-accepted-generation", "2");
    await expect(workspace).toHaveAttribute("data-workspace-review-accepted-file-count", "1");
    await expect(workspace).toHaveAttribute("data-workspace-review-accepted-status", "matches");

    const exportStatus = page.locator("[data-workspace-export-status]");
    const exportStart = page.locator('[data-workspace-export-action="start"]');
    await expect(exportStatus).toHaveAttribute("data-workspace-export-status", "idle");
    await expect(exportStart).toBeEnabled();

    let downloadsBeforeAuthorization = 0;
    const captureUnexpectedDownload = (): void => {
      downloadsBeforeAuthorization += 1;
    };
    page.on("download", captureUnexpectedDownload);
    try {
      await page.evaluate(() => {
        const observer = new MutationObserver(() => {
          const cancel = document.querySelector<HTMLButtonElement>(
            '[data-workspace-export-action="cancel"]',
          );
          if (cancel === null || cancel.disabled) return;
          observer.disconnect();
          cancel.click();
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });
      await exportStart.click();
      await expect(exportStatus).toHaveAttribute("data-workspace-export-status", "cancelled");
      expect(downloadsBeforeAuthorization).toBe(0);
    } finally {
      page.off("download", captureUnexpectedDownload);
    }
    await expect(exportStart).toBeEnabled();

    const downloadPromise = page.waitForEvent("download");
    await exportStart.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("translation-workshop.sillyos.zip");
    await expect(exportStatus).toHaveAttribute(
      "data-workspace-export-status",
      /^(finalizing|download-started)$/,
    );
    const archivePath = testInfo.outputPath("translation-workshop.sillyos.zip");
    await download.saveAs(archivePath);
    expect(await download.failure()).toBeNull();
    await expect(exportStatus).toHaveAttribute("data-workspace-export-status", "download-started");
    await expect(exportStatus).toHaveAttribute("data-workspace-export-files-completed", "1");
    await expect(exportStatus).toHaveAttribute("data-workspace-export-files-total", "1");
    assertOrdinaryWorkspaceArchiveV1(new Uint8Array(await readFile(archivePath)), {
      programId,
      workspaceId: continuation.workspaceId,
      generation: 2,
      text: snapshotText,
    });
    await expectOrdinaryWorkspaceSandboxV1(page, continuation, snapshotText);

    await page.getByRole("button", { name: "Creator home" }).click();
    await expect(page.locator("iframe[data-silly-os-workspace-sandbox='active']")).toHaveCount(1);
  },
);

test("@s1a-ordinary a cancelled Browser Pi run retains its Sandbox write and remains terminal across reload", async ({ durableProgramPage: page }) => {
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
  const continuation = await readWorkspaceContinuationV1(page, programId);
  if (continuation === null) throw new Error("Cancelled Program has no Workspace continuation");
  await expectOrdinaryWorkspaceSandboxV1(page, continuation, cancelledText);
  await page.getByRole("button", { name: "Cancel run" }).click();

  await expectProgramStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-program-revision", "1");
  await expect(page.getByText(cancelledText, { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByText("Cancelled Creator Agent run", { exact: true })).toBeVisible();
  await expect(page.getByText("Last write: succeeded / changed", { exact: false })).toBeVisible();
  const cancelledContinuation = await readWorkspaceContinuationV1(page, programId);
  expect(cancelledContinuation).toEqual({ ...continuation, repositoryRevision: 2 });

  await page.getByRole("button", { name: "Creator home" }).click();
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expect(page.locator(".silly-os")).toHaveAttribute("data-agent-workspace-state", "closed");
  await expect(page.locator("iframe[data-silly-os-workspace-sandbox='active']")).toHaveCount(1);
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
  expect(await readWorkspaceContinuationV1(page, programId)).toEqual(cancelledContinuation);
  await expectOrdinaryWorkspaceSandboxV1(page, continuation, cancelledText);
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
  const separatorBox = await separator.boundingBox();
  if (separatorBox === null) throw new TypeError("expected visible Workspace separator");
  await page.mouse.move(
    separatorBox.x + separatorBox.width / 2,
    separatorBox.y + separatorBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(separatorBox.x + 32, separatorBox.y + separatorBox.height / 2);
  await page.mouse.up();
  await expect.poll(async () => Number(await separator.getAttribute("aria-valuenow")))
    .toBeGreaterThanOrEqual(initialWidth + 24);
  const pointerWidth = Number(await separator.getAttribute("aria-valuenow"));
  await separator.focus();
  await separator.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", String(pointerWidth + 8));
  await separator.press("Shift+ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", String(pointerWidth + 40));
  await separator.press("Home");
  await expect(separator).toHaveAttribute("aria-valuenow", "280");

  const resizedWorkpiece = await workpiece.boundingBox();
  expect(resizedWorkpiece?.width ?? 0).toBeGreaterThanOrEqual(400);
  await expect(page.getByRole("textbox", { name: "Ask for a change…" })).toBeVisible();
  await expectNoPageOverflowV1(page);
});

test("workspace preserves its responsive geometry across the DS1 viewport matrix", async ({ durableProgramPage: page }) => {
  await page.setViewportSize({ width: 1_600, height: 1_000 });
  const workspace = await openTranslationWorkspaceV1(page);
  const topbar = page.locator(".program-workspace__topbar");
  const chat = page.locator('[data-workspace-pane="chat"]');
  const workpiece = page.locator('[data-workspace-pane="workpiece"]');
  const toolbar = page.locator(".workpiece-pane__toolbar");
  const separator = page.getByRole("separator", {
    name: "Resize conversation and workpiece panes",
  });
  const navigation = page.getByRole("navigation", { name: "Workspace views" });
  const composer = page.locator(".chat-composer");
  const casesV1 = [
    { width: 1_600, height: 1_000, layout: "dual-pane", topbarHeight: 56 },
    { width: 1_280, height: 800, layout: "dual-pane", topbarHeight: 56 },
    { width: 1_024, height: 520, layout: "dual-pane", topbarHeight: 56 },
    // Half the CSS-pixel viewport is the maintained 200% reflow proxy.
    { width: 800, height: 500, layout: "dual-pane", topbarHeight: 56 },
    { width: 768, height: 700, layout: "dual-pane", topbarHeight: 56 },
    { width: 767, height: 700, layout: "single-pane", topbarHeight: 52 },
    { width: 390, height: 844, layout: "single-pane", topbarHeight: 52 },
    { width: 320, height: 568, layout: "single-pane", topbarHeight: 52 },
  ] as const;

  for (const fixtureV1 of casesV1) {
    await page.setViewportSize({ width: fixtureV1.width, height: fixtureV1.height });
    await expect(workspace).toHaveAttribute("data-workspace-layout", fixtureV1.layout);
    expect(Math.round((await topbar.boundingBox())?.height ?? 0)).toBe(fixtureV1.topbarHeight);
    await expectNoPageOverflowV1(page);

    if (fixtureV1.layout === "dual-pane") {
      await expect(chat).toBeVisible();
      await expect(workpiece).toBeVisible();
      await expect(separator).toBeVisible();
      expect((await chat.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(280);
      expect((await workpiece.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(400);
      expect(Math.round((await separator.boundingBox())?.width ?? 0)).toBe(1);
      expect(Math.round((await toolbar.boundingBox())?.height ?? 0)).toBe(48);
    } else {
      await expect(navigation).toBeVisible();
      await navigation.getByRole("button", { name: "Chat" }).click();
      await expect(chat).toBeVisible();
      await expect(workpiece).toBeHidden();
      for (const buttonV1 of await navigation.getByRole("button").all()) {
        expect((await buttonV1.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
      await navigation.getByRole("button", { name: "View" }).click();
      await expect(workpiece).toBeVisible();
      expect(Math.round((await toolbar.boundingBox())?.height ?? 0)).toBe(48);
      await expectInsideVisualViewportV1(page, workpiece);
      await navigation.getByRole("button", { name: "Chat" }).click();
    }

    await expectInsideVisualViewportV1(page, composer);
    await expectNoPageOverflowV1(page);
  }
});

test("long bilingual Creator follow-up remains readable and contained", async ({ durableProgramPage: page }) => {
  await page.setViewportSize({ width: 1_280, height: 800 });
  await openTranslationWorkspaceV1(page);
  const textV1 =
    "Keep the English character voice consistent across a deliberately long instruction, 保持中文角色语气和术语一致，and preserve mixed-script identifiers such as station_海边-42 without clipping or forcing page-level horizontal scrolling.";
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(textV1);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(textV1, { exact: true })).toBeVisible();
  await expectNoPageOverflowV1(page);
});

test("@ds1-visual Workspace keeps its representative desktop and phone compositions", async (
  { durableProgramPage: page },
  testInfo,
) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.addInitScript(
    ([storageKeyV1, serializedV1]) => {
      localStorage.setItem(storageKeyV1, serializedV1);
    },
    [
      browserProductPreferencesStorageKeyV1,
      JSON.stringify({ revision: 1, locale: "en", theme: "dark" }),
    ] as const,
  );
  await page.setViewportSize({ width: 1_600, height: 1_000 });
  const workspace = await openTranslationWorkspaceV1(page);
  await page.locator("[data-workspace-review] code").evaluateAll((elementsV1) => {
    for (const elementV1 of elementsV1) {
      elementV1.textContent = "sillyos.fixture.00000000-0000-4000-8000-000000000000";
    }
  });

  await settleVisualFixtureV1(page);
  await expectVisualSnapshotV1(workspace, "ds1-desktop-workspace.png");

  await page.setViewportSize({ width: 390, height: 844 });
  const navigation = page.getByRole("navigation", { name: "Workspace views" });
  await navigation.getByRole("button", { name: "Chat" }).click();
  await settleVisualFixtureV1(page);
  await expectVisualSnapshotV1(workspace, "ds1-phone-chat.png");

  await navigation.getByRole("button", { name: "View" }).click();
  await settleVisualFixtureV1(page);
  await expectVisualSnapshotV1(workspace, "ds1-phone-view.png");

  if (testInfo.project.name === "webkit") {
    expect(
      consumeExpectedDurableProgramConsoleErrorsV1(page, webkitScreenshotStyleCspErrorV1),
      "WebKit must report each rejected Playwright screenshot stylesheet",
    ).toBe(3);
    expect(
      consumeExpectedDurableProgramConsoleErrorsV1(
        page,
        webkitScreenshotDefaultStyleCspErrorV1,
      ),
      "WebKit must report both fallback refusals for each screenshot stylesheet",
    ).toBe(6);
  }
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

test("@mobile portrait uses one navigable pane without page overflow", async (
  { durableProgramPage: page },
  testInfo,
) => {
  await page.setViewportSize({ width: 390, height: 844 });
  if (testInfo.project.name === "mobile-portrait") {
    expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0);
  }
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

test("the Program network toggle gates fixed Pi fetch_url without per-request approval", async ({ durableProgramPage: page }) => {
  test.setTimeout(120_000);
  const sentinelKey = "sillyos-network-key-must-not-cross-broker";
  const blockedUrl = "https://network-target.test/assets/blocked.txt?source=silly-os";
  const targetUrl = "https://network-target.test/assets/notes.txt?source=silly-os";
  const secondOriginUrl = "https://second-network-target.test/assets/second.txt";
  const coldUrl = "https://second-network-target.test/assets/cold.txt";
  const disabledAgainUrl = "https://network-target.test/assets/disabled-again.txt";
  const targetBody = "SillyOS Browser Broker physical response\n";
  const brokerOrigin = "http://" + sillyOsNetworkBrokerTargetV1.host + ":" +
    String(sillyOsNetworkBrokerTargetV1.port);
  type CapturedBrokerRequestV1 = {
    readonly method: string;
    readonly url: string;
    readonly headers: Record<string, string>;
    readonly postData: string | null;
  };
  const targetRequests: CapturedBrokerRequestV1[] = [];

  const fulfillTargetV1 = async (route: Route): Promise<void> => {
    const request = route.request();
    targetRequests.push({
      method: request.method(),
      url: request.url(),
      headers: await request.allHeaders(),
      postData: request.postData(),
    });
    await route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      headers: {
        "access-control-allow-origin": brokerOrigin,
        "cache-control": "no-store",
      },
      body: targetBody,
    });
  };
  await page.route("https://network-target.test/**", fulfillTargetV1);
  await page.route("https://second-network-target.test/**", fulfillTargetV1);
  // Playwright route.fulfill synthesizes a terminal Response and bypasses the
  // Browser's redirect and CORS enforcement. Those negative paths stay in the
  // fetch-adapter contracts until a controlled real HTTPS target is available.

  await openCreatorHomeV1(page);
  await initializePiTestV1(page, sentinelKey);
  await expect(page.locator("iframe[data-silly-os-network-broker='active']")).toHaveCount(1);

  await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
    translationIntentV1,
  );
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "open");
  const programId = await readProgramIdV1(workspace);
  const workspaceSessionId = await readWorkspaceSessionIdV1(workspace);
  const accessToggle = page.getByRole("checkbox", { name: "Allow network access" });
  const composer = page.getByRole("textbox", { name: "Ask for a change…" });

  await expect(accessToggle).not.toBeChecked();
  await expectSillyOsCheckboxRecipeV1(accessToggle);
  await composer.fill(`${deterministicFetchUrlProbePrefixV1}${blockedUrl}`);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  expect(targetRequests).toHaveLength(0);
  await expect(composer).toBeEnabled();

  await accessToggle.click();
  await expect(accessToggle).toBeChecked();
  await expect(accessToggle).toBeEnabled();

  const fetchRequirement = `${deterministicFetchUrlProbePrefixV1}${targetUrl}`;
  await composer.fill(fetchRequirement);
  await page.getByRole("button", { name: "Send" }).click();
  await expect.poll(() => targetRequests.length).toBe(1);
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v3");
  await expect(
    page.locator('[data-chat-role="creator"]').getByText(
      "Deterministic test proposal ready.",
      { exact: true },
    ).last(),
  ).toBeVisible();

  const [request] = targetRequests;
  expect(request).toBeDefined();
  expect(request).toMatchObject({
    method: "GET",
    url: targetUrl,
    postData: null,
  });
  expect(request?.headers.origin).toBe(brokerOrigin);
  expect(request?.headers.authorization).toBeUndefined();
  expect(request?.headers.cookie).toBeUndefined();
  expect(request?.headers.referer).toBeUndefined();
  expect(JSON.stringify(request)).not.toContain(sentinelKey);

  const afterAllowed = await readDurableProgramV3(page, programId);
  if (afterAllowed === null) throw new Error("expected durable Program after enabled fetch");
  if (afterAllowed.reviewBinding === null) {
    throw new Error("expected current Workspace identity after enabled fetch");
  }
  const protectedIdentities = [
    programId,
    workspaceSessionId,
    afterAllowed.reviewBinding.workspaceId,
    afterAllowed.reviewBinding.volumeId,
  ];
  for (const identity of protectedIdentities) {
    expect(JSON.stringify(request)).not.toContain(identity);
  }

  await composer.fill(`${deterministicFetchUrlProbePrefixV1}${secondOriginUrl}`);
  await page.getByRole("button", { name: "Send" }).click();
  await expect.poll(() => targetRequests.length).toBe(2);
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v4");

  const rawAccess = await page.evaluate(async (requestedProgramId) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const openRequest = indexedDB.open("sillymaker.example-silly-os.programs");
      openRequest.addEventListener("error", () => reject(openRequest.error));
      openRequest.addEventListener("success", () => resolve(openRequest.result));
    });
    try {
      return await new Promise<unknown>((resolve, reject) => {
        const transaction = database.transaction("program_network_access", "readonly");
        const getRequest = transaction.objectStore("program_network_access").get(
          requestedProgramId,
        );
        getRequest.addEventListener("error", () => reject(getRequest.error));
        getRequest.addEventListener("success", () => resolve(getRequest.result));
      });
    } finally {
      database.close();
    }
  }, programId);
  expect(rawAccess).toEqual({ revision: 1, programId, enabled: true });
  expect(JSON.stringify(rawAccess)).not.toContain(targetUrl);
  expect(JSON.stringify(rawAccess)).not.toContain(sentinelKey);

  await page.getByRole("button", { name: "Creator home" }).click();
  await expectProgramStorageReadyV1(page);
  await page.reload();
  await expectProgramStorageReadyV1(page);
  await initializePiTestV1(page, sentinelKey);
  await openRecentTranslationProgramV1(page, {
    programId,
    revision: 4,
    status: "Preview",
  });

  await expect(accessToggle).toBeChecked();
  const reopenedComposer = page.getByRole("textbox", { name: "Ask for a change…" });
  await reopenedComposer.fill(`${deterministicFetchUrlProbePrefixV1}${coldUrl}`);
  await page.getByRole("button", { name: "Send" }).click();
  await expect.poll(() => targetRequests.length).toBe(3);
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v5");

  await expect(accessToggle).toBeEnabled();
  await accessToggle.click();
  await expect(accessToggle).not.toBeChecked();
  await reopenedComposer.fill(`${deterministicFetchUrlProbePrefixV1}${disabledAgainUrl}`);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v6");
  expect(targetRequests).toHaveLength(3);

  for (const capturedRequest of targetRequests) {
    expect(capturedRequest.method).toBe("GET");
    expect(capturedRequest.postData).toBeNull();
    expect(capturedRequest.headers.origin).toBe(brokerOrigin);
    expect(capturedRequest.headers.authorization).toBeUndefined();
    expect(capturedRequest.headers.cookie).toBeUndefined();
    expect(capturedRequest.headers.referer).toBeUndefined();
    expect(JSON.stringify(capturedRequest)).not.toContain(sentinelKey);
    for (const identity of protectedIdentities) {
      expect(JSON.stringify(capturedRequest)).not.toContain(identity);
    }
  }
});
test("@s2-n2 the fixed Pi download streams a 32 MiB response into the durable Program volume", async ({ durableProgramPage: page }) => {
  test.setTimeout(180_000);
  const sentinelKey = "sillyos-download-key-must-not-cross-broker";
  const targetUrl = "https://network-target.test/assets/archive.bin?source=silly-os";
  const targetBytes = Buffer.alloc(32 * 1024 * 1024);
  for (let offset = 0; offset < targetBytes.length; offset += 1) {
    targetBytes[offset] = (offset * 31 + Math.floor(offset / 65_536) * 17 + 7) & 0xff;
  }
  const targetSha256 = createHash("sha256").update(targetBytes).digest("hex");
  const brokerOrigin = "http://" + sillyOsNetworkBrokerTargetV1.host + ":" +
    String(sillyOsNetworkBrokerTargetV1.port);
  const capturedRequests: Array<{
    readonly method: string;
    readonly url: string;
    readonly headers: Record<string, string>;
    readonly postData: string | null;
  }> = [];

  await page.route("https://network-target.test/**", async (route) => {
    const request = route.request();
    capturedRequests.push({
      method: request.method(),
      url: request.url(),
      headers: await request.allHeaders(),
      postData: request.postData(),
    });
    await route.fulfill({
      status: 200,
      contentType: "application/octet-stream",
      headers: {
        "access-control-allow-origin": brokerOrigin,
        "cache-control": "no-store",
      },
      body: targetBytes,
    });
  });

  await openCreatorHomeV1(page);
  await initializePiTestV1(page, sentinelKey);
  await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
    translationIntentV1,
  );
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "open");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "1");
  const programId = await readProgramIdV1(workspace);
  const workspaceSessionId = await readWorkspaceSessionIdV1(workspace);
  const accessToggle = page.getByRole("checkbox", { name: "Allow network access" });
  await expect(accessToggle).not.toBeChecked();
  await accessToggle.click();
  await expect(accessToggle).toBeChecked();
  await expect(accessToggle).toBeEnabled();

  const requirement = `${deterministicDownloadProbePrefixV1}${targetUrl}`;
  const composer = page.getByRole("textbox", { name: "Ask for a change…" });
  await composer.fill(requirement);
  await page.getByRole("button", { name: "Send" }).click();
  await expect.poll(() => capturedRequests.length).toBe(1);
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-receipt", "1");
  await expect(workspace).toHaveAttribute("data-execution-workspace-tool", "download");
  await expect(workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  await expect(workspace).toHaveAttribute(
    "data-execution-workspace-path",
    deterministicDownloadRelativePathV1,
  );

  const continuation = await readWorkspaceContinuationV1(page, programId);
  if (continuation === null) throw new Error("Downloaded Program lost its Workspace continuation");
  await expect.poll(() =>
    inspectSandboxWorkspaceFileDigestV1(
      page,
      continuation,
      deterministicDownloadRelativePathV1,
    )
  ).toEqual({ size: targetBytes.length, sha256: targetSha256 });

  const [request] = capturedRequests;
  expect(request).toMatchObject({ method: "GET", url: targetUrl, postData: null });
  expect(request?.headers.origin).toBe(brokerOrigin);
  expect(request?.headers.authorization).toBeUndefined();
  expect(request?.headers.cookie).toBeUndefined();
  expect(request?.headers.referer).toBeUndefined();
  expect(JSON.stringify(request)).not.toContain(sentinelKey);
  expect(JSON.stringify(request)).not.toContain(programId);
  expect(JSON.stringify(request)).not.toContain(workspaceSessionId);

  const rawAccess = await page.evaluate(async (requestedProgramId) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const openRequest = indexedDB.open("sillymaker.example-silly-os.programs");
      openRequest.addEventListener("error", () => reject(openRequest.error));
      openRequest.addEventListener("success", () => resolve(openRequest.result));
    });
    try {
      return await new Promise<unknown>((resolve, reject) => {
        const transaction = database.transaction("program_network_access", "readonly");
        const getRequest = transaction.objectStore("program_network_access").get(
          requestedProgramId,
        );
        getRequest.addEventListener("error", () => reject(getRequest.error));
        getRequest.addEventListener("success", () => resolve(getRequest.result));
      });
    } finally {
      database.close();
    }
  }, programId);
  expect(rawAccess).toEqual({ revision: 1, programId, enabled: true });
  expect(JSON.stringify(rawAccess)).not.toContain(targetUrl);
  expect(JSON.stringify(rawAccess)).not.toContain(sentinelKey);

  await page.getByRole("button", { name: "Creator home" }).click();
  await expectProgramStorageReadyV1(page);
  await page.reload();
  await expectProgramStorageReadyV1(page);
  await initializePiTestV1(page, sentinelKey);
  const reopened = await openRecentTranslationProgramV1(page, {
    programId,
    revision: 2,
    status: "Preview",
  });
  await expect(reopened).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(accessToggle).toBeChecked();
  expect(await readWorkspaceContinuationV1(page, programId)).toEqual(continuation);
  await expect.poll(() =>
    inspectSandboxWorkspaceFileDigestV1(
      page,
      continuation,
      deterministicDownloadRelativePathV1,
    )
  ).toEqual({ size: targetBytes.length, sha256: targetSha256 });
});
