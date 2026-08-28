// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  chromium,
  type BrowserType,
  type Frame,
  type Page,
  type Request,
  webkit,
} from "npm:playwright";

const defaultTargetUrlV1 = "http://127.0.0.1:4175/";
const initialIntentV1 = "Create a compact writing review program.";
const cancelledFollowUpV1 = "Cancel this qualification run before it can propose a revision.";
const liveWorkspaceToolPathV1 = ".sillyos/live-provider-tools.txt";
const liveWorkspaceToolTextV1 = "SillyOS live Provider workspace tools qualified.";
const completedFollowUpV1 =
  `Call the write tool to create /workspace/${liveWorkspaceToolPathV1} with exactly this text and no trailing newline: ${liveWorkspaceToolTextV1} Then call the read tool to verify the exact bytes. Finally propose one revision that adds an explicit review checkpoint before publication.`;

interface ProviderQualificationWorkspaceContinuationV1 {
  readonly volumeId: string;
}

interface ProviderQualificationProfileV1 {
  readonly id: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly apiKeyEnvironmentVariable: string;
  readonly requestOrigin: string;
  readonly requestPathname: string;
}

const providerProfilesV1 = Object.freeze(
  [
    Object.freeze({
      id: "openai",
      providerId: "openai",
      modelId: "gpt-4.1-nano",
      apiKeyEnvironmentVariable: "OPENAI_API_KEY",
      requestOrigin: "https://api.openai.com",
      requestPathname: "/v1/responses",
    }),
    Object.freeze({
      id: "anthropic",
      providerId: "anthropic",
      modelId: "claude-sonnet-4-5",
      apiKeyEnvironmentVariable: "ANTHROPIC_API_KEY",
      requestOrigin: "https://api.anthropic.com",
      requestPathname: "/v1/messages",
    }),
    Object.freeze({
      id: "google",
      providerId: "google",
      modelId: "gemini-2.5-flash",
      apiKeyEnvironmentVariable: "GEMINI_API_KEY",
      requestOrigin: "https://generativelanguage.googleapis.com",
      requestPathname: "/v1beta/models/gemini-2.5-flash:streamGenerateContent",
    }),
    Object.freeze({
      id: "openrouter",
      providerId: "openrouter",
      modelId: "google/gemini-2.5-flash",
      apiKeyEnvironmentVariable: "OPENROUTER_API_KEY",
      requestOrigin: "https://openrouter.ai",
      requestPathname: "/api/v1/chat/completions",
    }),
    Object.freeze({
      id: "deepseek",
      providerId: "deepseek",
      modelId: "deepseek-v4-flash",
      apiKeyEnvironmentVariable: "DEEPSEEK_API_KEY",
      requestOrigin: "https://api.deepseek.com",
      requestPathname: "/chat/completions",
    }),
    Object.freeze({
      id: "xai",
      providerId: "xai",
      modelId: "grok-4.3",
      apiKeyEnvironmentVariable: "XAI_API_KEY",
      requestOrigin: "https://api.x.ai",
      requestPathname: "/v1/responses",
    }),
  ] satisfies readonly ProviderQualificationProfileV1[],
);

const b1bProfileIdsV1 = Object.freeze([
  "anthropic",
  "google",
  "openrouter",
  "deepseek",
  "xai",
]);
const qualifiedProfileIdsV1 = Object.freeze([
  "openai",
  "anthropic",
  "google",
  "deepseek",
  "xai",
]);

type ProviderRequestPhaseV1 =
  | "connection_invalid"
  | "connection_valid"
  | "cancel"
  | "complete";

interface ObservedProviderRequestV1 {
  readonly request: Request;
  readonly phase: ProviderRequestPhaseV1;
  status: number | null;
  errorType: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  responseBody: string | null;
  responseBodyReadError: string | null;
  responseBodySettlement: Promise<void> | null;
  requestFailure: string | null;
}

interface ObservedRequestRouteV1 {
  readonly phase: ProviderRequestPhaseV1;
  readonly method: string;
  readonly origin: string;
  readonly pathname: string;
}

class QualificationFailureV1 extends Error {
  constructor(
    readonly code: string,
    readonly details: Readonly<Record<string, unknown>> = Object.freeze({}),
  ) {
    super(code);
    this.name = "QualificationFailureV1";
  }
}

function requireV1(condition: boolean, code: string): asserts condition {
  if (!condition) throw new QualificationFailureV1(code);
}

async function readWorkspaceContinuationV1(
  page: Page,
  programId: string,
): Promise<ProviderQualificationWorkspaceContinuationV1 | null> {
  return await page.evaluate(async (requestedProgramId) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sillymaker.example-silly-os.programs");
      request.addEventListener("error", () => reject(request.error));
      request.addEventListener("success", () => resolve(request.result));
    });
    try {
      return await new Promise<ProviderQualificationWorkspaceContinuationV1 | null>(
        (resolve, reject) => {
          const transaction = database.transaction("workspace_continuations", "readonly");
          const request = transaction.objectStore("workspace_continuations").get(
            requestedProgramId,
          );
          request.addEventListener("error", () => reject(request.error));
          request.addEventListener("success", () => resolve(request.result ?? null));
        },
      );
    } finally {
      database.close();
    }
  }, programId);
}

async function currentWorkspaceSandboxFrameV1(page: Page): Promise<Frame> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const frames = page.frames().filter((frame) => {
      const url = frame.url();
      return URL.canParse(url) && new URL(url).pathname === "/workspace-sandbox.html";
    });
    if (frames.length === 1 && frames[0] !== undefined) return frames[0];
    await page.waitForTimeout(50);
  }
  throw new QualificationFailureV1("workspace_sandbox_frame_missing");
}

async function readSandboxWorkspaceTextV1(
  frame: Frame,
  volumeId: string,
  relativePath: string,
): Promise<string> {
  return await frame.evaluate(async ({ requestedVolumeId, requestedRelativePath }) => {
    const parts = requestedRelativePath.split("/");
    const fileName = parts.pop();
    if (
      fileName === undefined || fileName.length === 0 || parts.some((part) => part.length === 0)
    ) {
      throw new TypeError("Invalid qualification Workspace path");
    }
    let directory = await navigator.storage.getDirectory();
    for (
      const name of [
        ".sillyos-workspace-host-v1",
        "volumes",
        requestedVolumeId,
        "workspace",
        ...parts,
      ]
    ) {
      directory = await directory.getDirectoryHandle(name);
    }
    return await (await (await directory.getFileHandle(fileName)).getFile()).text();
  }, { requestedVolumeId: volumeId, requestedRelativePath: relativePath });
}

function targetUrlV1(raw: string): string {
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    throw new QualificationFailureV1("target_invalid");
  }
  const loopbackHttp = target.protocol === "http:" &&
    (target.hostname === "127.0.0.1" || target.hostname === "localhost" ||
      target.hostname === "[::1]");
  requireV1(target.protocol === "https:" || loopbackHttp, "target_not_secure");
  requireV1(target.username === "" && target.password === "", "target_credentials_forbidden");
  target.hash = "";
  target.search = "";
  target.searchParams.set("locale", "en");
  return target.href;
}

function matchesProviderRequestV1(
  request: Request,
  profile: ProviderQualificationProfileV1,
): boolean {
  if (request.method() !== "POST") return false;
  try {
    const url = new URL(request.url());
    return url.origin === profile.requestOrigin && url.pathname === profile.requestPathname;
  } catch {
    return false;
  }
}

function selectedProfilesV1(raw: string): readonly ProviderQualificationProfileV1[] {
  if (raw === "all") return providerProfilesV1;
  if (raw === "b1b") {
    return providerProfilesV1.filter((profile) => b1bProfileIdsV1.includes(profile.id));
  }
  if (raw === "qualified") {
    return providerProfilesV1.filter((profile) => qualifiedProfileIdsV1.includes(profile.id));
  }
  const profile = providerProfilesV1.find(({ id }) => id === raw);
  requireV1(profile !== undefined, "provider_profile_invalid");
  return Object.freeze([profile]);
}

function selectedBrowsersV1(raw: string): readonly BrowserType[] {
  if (raw === "both") return Object.freeze([chromium, webkit]);
  if (raw === "chromium") return Object.freeze([chromium]);
  if (raw === "webkit") return Object.freeze([webkit]);
  throw new QualificationFailureV1("browser_invalid");
}

async function durableProjectionV1(page: Page): Promise<string> {
  return await page.evaluate(async () => {
    const storageValues = [
      ...Object.entries(localStorage),
      ...Object.entries(sessionStorage),
    ];
    const indexedDbValues: unknown[] = [];
    if (typeof indexedDB.databases === "function") {
      for (const database of await indexedDB.databases()) {
        if (database.name === undefined) continue;
        const databaseName = database.name;
        const opened = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(databaseName);
          request.addEventListener("error", () => reject(request.error));
          request.addEventListener("success", () => resolve(request.result));
        });
        try {
          for (const storeName of opened.objectStoreNames) {
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
}

function observationsForPhaseV1(
  observations: readonly ObservedProviderRequestV1[],
  phase: ProviderRequestPhaseV1,
): readonly ObservedProviderRequestV1[] {
  return observations.filter((observation) => observation.phase === phase);
}

function piWorkerCountV1(page: Page): number {
  return page.workers().filter((worker) => worker.url().includes("browser-pi.worker")).length;
}

async function waitForPiWorkerCountV1(
  page: Page,
  expected: number,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (piWorkerCountV1(page) === expected) return;
    await page.waitForTimeout(25);
  }
  throw new QualificationFailureV1("pi_worker_count_invalid", {
    expected,
    observed: piWorkerCountV1(page),
  });
}

function boundedProviderTextV1(
  value: unknown,
  maximum: number,
  credentials: readonly string[],
): string | null {
  if (typeof value !== "string") return null;
  let bounded = value;
  for (const credential of credentials) {
    if (credential.length > 0) bounded = bounded.replaceAll(credential, "[redacted]");
  }
  bounded = bounded.replaceAll(/https?:\/\/[^\s"'<>]+/giu, "[url]");
  return bounded.slice(0, maximum);
}

function providerErrorRecordV1(body: unknown): Readonly<Record<string, unknown>> | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const record = body as Readonly<Record<string, unknown>>;
  if (!("error" in record)) return record;
  const error = record.error;
  return typeof error === "object" && error !== null && !Array.isArray(error)
    ? error as Readonly<Record<string, unknown>>
    : record;
}

function requireCompletedProviderJourneyV1(
  observations: readonly ObservedProviderRequestV1[],
  codePrefix: string,
): void {
  // Providers may serialize dependent tool calls into separate turns or return
  // multiple calls in one turn. The product result and Sandbox receipts are
  // authoritative; this bound catches a missing turn and a runaway loop.
  requireV1(
    observations.length >= 2 && observations.length <= 8,
    `${codePrefix}_provider_request_count_invalid`,
  );
  requireV1(
    observations.every(({ status }) => status === 200),
    `${codePrefix}_provider_status_invalid`,
  );
}

async function providerFailureDetailsV1(
  page: Page,
  observations: readonly ObservedProviderRequestV1[],
  requestRoutes: readonly ObservedRequestRouteV1[] = [],
): Promise<Readonly<Record<string, unknown>>> {
  await Promise.all(
    observations.map(({ responseBodySettlement }) => responseBodySettlement ?? Promise.resolve()),
  );
  const run = page.locator("[data-pi-agent-run-status]");
  const connection = page.locator("[data-connection-phase]").first();
  const providerWarning = page.locator('[data-pi-agent-runtime="pi_provider"]');
  return Object.freeze({
    runStatus: await run.getAttribute("data-pi-agent-run-status").catch(() => null),
    diagnostic: await run.getAttribute("data-pi-agent-diagnostic").catch(() => null),
    connectionPhase: await connection.getAttribute("data-connection-phase").catch(() => null),
    connectionDiagnostic: await connection.getAttribute("data-diagnostic-code").catch(
      () => null,
    ),
    providerWarningStatus: await providerWarning.getAttribute("data-pi-agent-status").catch(
      () => null,
    ),
    view: await page.locator("[data-silly-os-view]").first().getAttribute("data-silly-os-view")
      .catch(() => null),
    followUpCount: await page.getByRole("textbox", { name: "Ask for a change…" }).count().catch(
      () => -1,
    ),
    followUpDisabled: await page.getByRole("textbox", { name: "Ask for a change…" }).isDisabled()
      .catch(() => null),
    sendDisabled: await page.getByRole("button", { name: "Send" }).isDisabled().catch(() => null),
    piWorkerCount: piWorkerCountV1(page),
    providerRequestCount: observations.length,
    providerStatuses: observations.map(({ status }) => status),
    providerErrors: observations.map(({ errorType, errorCode, errorMessage }) => ({
      type: errorType,
      code: errorCode,
      message: errorMessage,
    })),
    providerResponseBodies: observations.map(({ responseBody }) => responseBody),
    providerResponseBodyReadErrors: observations.map(({ responseBodyReadError }) =>
      responseBodyReadError
    ),
    providerRequestFailures: observations.map(({ requestFailure }) => requestFailure),
    observedRequestRoutes: requestRoutes,
  });
}

async function openProviderSelectionV1(
  page: Page,
  profile: ProviderQualificationProfileV1,
): Promise<void> {
  await page.getByRole("button", { name: "Settings" }).first().click();
  await page.locator('[data-silly-os-view="settings"]').waitFor();
  await page.locator(`[data-provider-id="${profile.providerId}"]`).click();
  await page.locator(`[data-model-id="${profile.modelId}"] input`).check();
}

async function saveProviderCredentialV1(page: Page, credential: string): Promise<void> {
  const keyInput = page.getByLabel("API key (memory only)");
  await keyInput.fill(credential);
  await page.getByRole("button", { name: "Save key" }).click();
  await page.locator(
    '.provider-settings__credential-form[data-connection-phase="credential_saved"]',
  ).waitFor();
  requireV1(await keyInput.inputValue() === "", "credential_input_not_cleared");
}

async function testProviderConnectionV1(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Test connection" }).click();
}

async function configureProviderCredentialV1(
  page: Page,
  profile: ProviderQualificationProfileV1,
  credential: string,
): Promise<void> {
  await openProviderSelectionV1(page, profile);
  await saveProviderCredentialV1(page, credential);
  await page.getByRole("button", { name: "Back to Agent Creator" }).click();
  await page.locator('[data-silly-os-view="home"]').waitFor();
  await page.locator('[data-pi-agent-runtime="pi_provider"]').waitFor({ state: "detached" });
  await waitForPiWorkerCountV1(page, 1);

  await openProviderSelectionV1(page, profile);
  await testProviderConnectionV1(page);
  const settledConnection = page.locator(
    '[data-connection-phase="ready"], [data-connection-phase="failed"]',
  ).first();
  await settledConnection.waitFor();
  const connectionOutcome = await settledConnection.getAttribute("data-connection-phase");
  requireV1(connectionOutcome === "ready", "valid_connection_rejected");
  await page.getByRole("button", { name: "Back to Agent Creator" }).click();
  await page.locator('[data-silly-os-view="home"]').waitFor();
  await page.locator('[data-pi-agent-runtime="pi_provider"]').waitFor({ state: "detached" });
  await waitForPiWorkerCountV1(page, 1);
}

async function qualifyBrowserV1(
  browserType: BrowserType,
  target: string,
  profile: ProviderQualificationProfileV1,
  apiKey: string,
): Promise<Readonly<Record<string, unknown>>> {
  const invalidCredential = `sillyos-invalid-${profile.id}-qualification`;
  const credentials = Object.freeze([apiKey, invalidCredential]);
  const profileDirectory = browserType === webkit
    ? await Deno.makeTempDir({ prefix: `sillyos-${profile.id}-webkit-qualification-` })
    : null;
  let closeRuntimeV1: (() => Promise<void>) | null = null;
  let page!: Page;
  let pageCreated = false;
  const providerRequests: ObservedProviderRequestV1[] = [];
  const observedRequestRoutes: ObservedRequestRouteV1[] = [];
  let phase = "open";
  try {
    try {
      if (profileDirectory === null) {
        const browser = await browserType.launch({ headless: true });
        closeRuntimeV1 = () => browser.close();
        page = await browser.newPage();
      } else {
        const context = await browserType.launchPersistentContext(profileDirectory, {
          headless: true,
        });
        closeRuntimeV1 = () => context.close();
        page = context.pages()[0] ?? await context.newPage();
      }
      pageCreated = true;

      let requestPhase: ProviderRequestPhaseV1 | null = null;
      const browserContext = page.context();
      browserContext.on("request", (request) => {
        if (requestPhase === null) return;
        if (observedRequestRoutes.length < 20) {
          try {
            const url = new URL(request.url());
            if (url.protocol === "https:" || url.protocol === "http:") {
              observedRequestRoutes.push(Object.freeze({
                phase: requestPhase,
                method: request.method(),
                origin: url.origin,
                pathname: url.pathname,
              }));
            }
          } catch {
            // A malformed request URL cannot be a qualified Provider route.
          }
        }
        if (!matchesProviderRequestV1(request, profile)) return;
        providerRequests.push({
          request,
          phase: requestPhase,
          status: null,
          errorType: null,
          errorCode: null,
          errorMessage: null,
          responseBody: null,
          responseBodyReadError: null,
          responseBodySettlement: null,
          requestFailure: null,
        });
      });
      browserContext.on("requestfailed", (request) => {
        const observation = providerRequests.find(({ request: observed }) => observed === request);
        if (observation === undefined) return;
        observation.requestFailure = boundedProviderTextV1(
          request.failure()?.errorText,
          240,
          credentials,
        );
      });
      browserContext.on("response", (response) => {
        const observation = providerRequests.find(({ request }) => request === response.request());
        if (observation === undefined) return;
        observation.status = response.status();
        if (response.status() < 400) return;
        observation.responseBodySettlement = response.text().then((bodyText) => {
          observation.responseBody = boundedProviderTextV1(bodyText, 512, credentials);
          let body: unknown;
          try {
            body = JSON.parse(bodyText) as unknown;
          } catch {
            return;
          }
          const error = providerErrorRecordV1(body);
          if (error === null) return;
          if ("type" in error) {
            observation.errorType = boundedProviderTextV1(error.type, 80, credentials);
          }
          if ("code" in error) {
            observation.errorCode = boundedProviderTextV1(error.code, 80, credentials);
          }
          if ("message" in error) {
            observation.errorMessage = boundedProviderTextV1(error.message, 240, credentials);
          }
        }).catch((error: unknown) => {
          observation.responseBodyReadError = boundedProviderTextV1(
            error instanceof Error ? error.message : String(error),
            240,
            credentials,
          );
        });
      });

      await page.goto(target);
      phase = "connection_invalid";
      await openProviderSelectionV1(page, profile);
      await saveProviderCredentialV1(page, invalidCredential);
      await waitForPiWorkerCountV1(page, 1);
      requestPhase = "connection_invalid";
      await testProviderConnectionV1(page);
      const failedConnection = page.locator(
        '.provider-settings__credential-form[data-connection-phase="test_failed"]',
      );
      await failedConnection.waitFor({ state: "visible" });
      const invalidConnectionObservations = observationsForPhaseV1(
        providerRequests,
        "connection_invalid",
      );
      requireV1(
        invalidConnectionObservations.length === 1,
        "invalid_connection_provider_request_count_invalid",
      );
      requireV1(
        invalidConnectionObservations.every(({ status }) =>
          status !== null && status >= 400 && status < 500
        ),
        "invalid_connection_provider_status_invalid",
      );
      const invalidKeyInput = page.getByLabel("API key (memory only)");
      requireV1(await invalidKeyInput.inputValue() === "", "invalid_credential_input_not_cleared");
      const invalidConnectionProjection = await durableProjectionV1(page);
      requireV1(
        invalidConnectionProjection.includes("test_failed"),
        "invalid_connection_error_mapping_invalid",
      );
      requireV1(
        !invalidConnectionProjection.includes(apiKey) &&
          !invalidConnectionProjection.includes(invalidCredential),
        "invalid_connection_credential_persisted",
      );
      requestPhase = null;
      await page.getByRole("button", { name: "Forget key" }).click();
      await waitForPiWorkerCountV1(page, 0);
      await page.getByRole("button", { name: "Back to Agent Creator" }).click();
      await page.locator('[data-silly-os-view="home"]').waitFor();
      await page.locator('[data-pi-agent-runtime="pi_provider"]').waitFor({ state: "visible" });

      phase = "connection_valid";
      requestPhase = "connection_valid";
      await configureProviderCredentialV1(page, profile, apiKey);
      const validConnectionObservations = observationsForPhaseV1(
        providerRequests,
        "connection_valid",
      );
      requireV1(
        validConnectionObservations.length === 1,
        "valid_connection_provider_request_count_invalid",
      );
      requireV1(
        validConnectionObservations.every(({ status }) => status === 200),
        "valid_connection_provider_status_invalid",
      );
      requestPhase = null;

      phase = "create";
      await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
        initialIntentV1,
      );
      await page.getByRole("button", { name: "Create program" }).click();
      const proposal = page.locator('[data-proposal-status="pending"]');
      await proposal.waitFor({ state: "visible" });
      requireV1(
        (await proposal.textContent())?.includes("v1") === true,
        "initial_revision_missing",
      );
      await page.waitForFunction(
        () => {
          const followUpTextarea = [...document.querySelectorAll("textarea")].find((element) =>
            element.getAttribute("placeholder") === "Ask for a change…"
          );
          return followUpTextarea instanceof HTMLTextAreaElement && !followUpTextarea.disabled;
        },
        undefined,
        { timeout: 10_000 },
      );

      const followUp = page.getByRole("textbox", { name: "Ask for a change…" });
      phase = "cancel";
      requestPhase = "cancel";
      await followUp.fill(cancelledFollowUpV1);
      const cancellationRequest = page.context().waitForEvent("request", {
        predicate: (request) => matchesProviderRequestV1(request, profile),
      });
      await Promise.all([
        cancellationRequest,
        page.getByRole("button", { name: "Send" }).click(),
      ]);
      const cancelRun = page.getByRole("button", { name: "Cancel run" });
      await cancelRun.click();
      await cancelRun.waitFor({ state: "detached" });
      await page.waitForTimeout(250);
      const cancellationObservations = observationsForPhaseV1(providerRequests, "cancel");
      requireV1(cancellationObservations.length === 1, "cancel_provider_request_count_invalid");
      requireV1(
        cancellationObservations.every(({ status }) => status === null || status === 200),
        "cancel_provider_status_invalid",
      );
      requireV1(
        (await proposal.textContent())?.includes("v1") === true,
        "cancel_published_revision",
      );

      phase = "complete";
      requestPhase = "complete";
      await followUp.fill(completedFollowUpV1);
      await page.getByRole("button", { name: "Send" }).click();
      try {
        await page.waitForFunction(
          () =>
            document.querySelector('[data-proposal-status="pending"]')?.textContent?.includes(
              "v2",
            ) === true,
          undefined,
          { timeout: 45_000 },
        );
      } catch {
        throw new QualificationFailureV1(
          "complete_revision_timeout",
          await providerFailureDetailsV1(
            page,
            observationsForPhaseV1(providerRequests, "complete"),
          ),
        );
      }
      await page.getByRole("button", { name: "Cancel run" }).waitFor({ state: "detached" });
      await page.locator('[data-program-storage-state="ready"]').waitFor();
      requireV1((await proposal.textContent())?.includes("v2") === true, "successor_missing");
      const completionObservations = observationsForPhaseV1(providerRequests, "complete");
      requireCompletedProviderJourneyV1(completionObservations, "complete");
      await page.waitForTimeout(250);
      requireV1((await proposal.textContent())?.includes("v2") === true, "currentness_lost");

      phase = "workspace_tool";
      requestPhase = null;
      const workspace = page.locator('[data-silly-os-view="workspace"]');
      const programId = await workspace.getAttribute("data-program-id");
      requireV1(programId !== null && programId.length > 0, "workspace_program_id_missing");
      requireV1(
        await workspace.getAttribute("data-execution-workspace-tool") === "write",
        "workspace_write_receipt_missing",
      );
      requireV1(
        await workspace.getAttribute("data-execution-workspace-effect") === "changed",
        "workspace_write_effect_invalid",
      );
      requireV1(
        await workspace.getAttribute("data-execution-workspace-path") === liveWorkspaceToolPathV1,
        "workspace_write_path_invalid",
      );
      const workspaceGeneration = Number(
        await workspace.getAttribute("data-execution-workspace-generation"),
      );
      requireV1(
        Number.isSafeInteger(workspaceGeneration) && workspaceGeneration >= 2,
        "workspace_generation_invalid",
      );
      const continuation = await readWorkspaceContinuationV1(page, programId);
      requireV1(
        continuation !== null && typeof continuation.volumeId === "string" &&
          continuation.volumeId.length > 0,
        "workspace_continuation_missing",
      );
      const sandboxFrame = await currentWorkspaceSandboxFrameV1(page);
      const workspaceToolText = await readSandboxWorkspaceTextV1(
        sandboxFrame,
        continuation.volumeId,
        liveWorkspaceToolPathV1,
      );
      requireV1(workspaceToolText === liveWorkspaceToolTextV1, "workspace_file_bytes_invalid");

      phase = "durable_projection";
      const durableProjection = await durableProjectionV1(page);
      requireV1(!durableProjection.includes(apiKey), "credential_persisted");

      phase = "forget";
      await openProviderSelectionV1(page, profile);
      const forgetButton = page.getByRole("button", { name: "Forget key" });
      await forgetButton.click();
      await waitForPiWorkerCountV1(page, 0);
      await forgetButton.waitFor({ state: "detached" });
      requireV1(await forgetButton.count() === 0, "credential_not_forgotten");

      return Object.freeze({
        profile: profile.id,
        providerId: profile.providerId,
        modelId: profile.modelId,
        browser: browserType.name(),
        result: "passed",
        invalidConnectionFailureObserved: true,
        invalidConnectionProviderStatuses: invalidConnectionObservations.map(({ status }) =>
          status
        ),
        invalidConnectionErrorMapping: "test_failed",
        invalidCredentialAbsent: true,
        invalidWorkerReleased: true,
        validConnectionProviderStatuses: validConnectionObservations.map(({ status }) => status),
        homeWarningCleared: true,
        cancellationObserved: true,
        cancellationProviderStatuses: cancellationObservations.map(({ status }) => status),
        proposalRevision: 2,
        completionProviderRequests: completionObservations.length,
        completionProviderStatuses: completionObservations.map(({ status }) => status),
        currentnessPreserved: true,
        workspaceTool: "write",
        workspaceGeneration,
        workspaceBytesVerified: true,
        durableCredentialAbsent: true,
        workerForgotten: true,
      });
    } catch (error) {
      if (error instanceof QualificationFailureV1) {
        if (!pageCreated || Object.keys(error.details).length > 0) throw error;
        throw new QualificationFailureV1(
          error.code,
          await providerFailureDetailsV1(
            page,
            providerRequests.filter(({ phase: requestPhase }) => requestPhase === phase),
            observedRequestRoutes,
          ),
        );
      }
      if (!pageCreated) throw new QualificationFailureV1(`playwright_${phase}_failed`);
      throw new QualificationFailureV1(
        `playwright_${phase}_failed`,
        await providerFailureDetailsV1(
          page,
          providerRequests.filter(({ phase: requestPhase }) => requestPhase === phase),
          observedRequestRoutes,
        ),
      );
    }
  } finally {
    try {
      if (closeRuntimeV1 !== null) await closeRuntimeV1();
    } finally {
      if (profileDirectory !== null) await Deno.remove(profileDirectory, { recursive: true });
    }
  }
}

export async function runBrowserProviderQualificationCliV1(args: readonly string[]): Promise<void> {
  let failed = false;
  let profiles: readonly ProviderQualificationProfileV1[];
  let browserTypes: readonly BrowserType[];
  let target: string;
  try {
    profiles = selectedProfilesV1(args[0] ?? "qualified");
    target = targetUrlV1(args[1] ?? defaultTargetUrlV1);
    browserTypes = selectedBrowsersV1(args[2] ?? "both");
    requireV1(args.length <= 3, "arguments_invalid");
  } catch (error) {
    const code = error instanceof QualificationFailureV1 ? error.code : "unexpected_failure";
    console.error(JSON.stringify({ result: "failed", code }));
    Deno.exitCode = 1;
    return;
  }

  for (const profile of profiles) {
    const apiKey = Deno.env.get(profile.apiKeyEnvironmentVariable) ?? "";
    if (apiKey.length === 0) {
      failed = true;
      console.error(
        JSON.stringify({ profile: profile.id, result: "failed", code: "api_key_missing" }),
      );
      continue;
    }
    for (const browserType of browserTypes) {
      try {
        console.log(JSON.stringify(await qualifyBrowserV1(browserType, target, profile, apiKey)));
      } catch (error) {
        failed = true;
        const code = error instanceof QualificationFailureV1 ? error.code : "unexpected_failure";
        const details = error instanceof QualificationFailureV1 ? error.details : {};
        console.error(JSON.stringify({
          profile: profile.id,
          browser: browserType.name(),
          result: "failed",
          code,
          ...details,
        }));
      }
    }
  }
  if (failed) Deno.exitCode = 1;
}

if (import.meta.main) await runBrowserProviderQualificationCliV1(Deno.args);
