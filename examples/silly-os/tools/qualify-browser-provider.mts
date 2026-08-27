// SPDX-License-Identifier: MIT

import { chromium, type BrowserType, type Page, type Request, webkit } from "npm:playwright";

const defaultTargetUrlV1 = "http://127.0.0.1:4175/";
const initialIntentV1 = "Create a compact writing review program.";
const authenticationFollowUpV1 = "Add a private draft review step.";
const cancelledFollowUpV1 = "Cancel this qualification run before it can propose a revision.";
const completedFollowUpV1 = "Add one explicit review checkpoint before publication.";

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
      modelId: "claude-sonnet-4-5-20250929",
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

type ProviderRequestPhaseV1 = "authentication" | "cancel" | "complete";

interface ObservedProviderRequestV1 {
  readonly request: Request;
  readonly phase: ProviderRequestPhaseV1;
  status: number | null;
  errorType: string | null;
  errorCode: string | null;
  errorMessage: string | null;
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
        const opened = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(database.name);
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
  return bounded.slice(0, maximum);
}

function requireCompletedProviderJourneyV1(
  observations: readonly ObservedProviderRequestV1[],
  codePrefix: string,
): void {
  requireV1(observations.length === 2, `${codePrefix}_provider_request_count_invalid`);
  requireV1(
    observations.every(({ status }) => status === 200),
    `${codePrefix}_provider_status_invalid`,
  );
}

async function providerFailureDetailsV1(
  page: Page,
  observations: readonly ObservedProviderRequestV1[],
): Promise<Readonly<Record<string, unknown>>> {
  const run = page.locator("[data-pi-agent-run-status]");
  return Object.freeze({
    runStatus: await run.getAttribute("data-pi-agent-run-status").catch(() => null),
    diagnostic: await run.getAttribute("data-pi-agent-diagnostic").catch(() => null),
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
  });
}

async function configureProviderCredentialV1(
  page: Page,
  profile: ProviderQualificationProfileV1,
  credential: string,
): Promise<void> {
  await page.getByRole("button", { name: "Settings" }).first().click();
  await page.locator('[data-silly-os-view="settings"]').waitFor();
  await page.locator(`[data-provider-id="${profile.providerId}"]`).click();
  await page.locator(`[data-model-id="${profile.modelId}"] input`).check();
  const keyInput = page.getByLabel("API key (memory only)");
  await keyInput.fill(credential);
  await page.getByRole("button", { name: "Connect Agent Creator" }).click();
  await page.getByText("Agent Creator connected", { exact: true }).waitFor();
  requireV1(await keyInput.count() === 0, "credential_input_not_cleared");
  await page.getByRole("button", { name: "Back to Agent Creator" }).click();
  await page.getByText("Provider Agent configured", { exact: true }).waitFor();
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
      page.on("request", (request) => {
        if (requestPhase === null || !matchesProviderRequestV1(request, profile)) return;
        providerRequests.push({
          request,
          phase: requestPhase,
          status: null,
          errorType: null,
          errorCode: null,
          errorMessage: null,
        });
      });
      page.on("response", (response) => {
        const observation = providerRequests.find(({ request }) => request === response.request());
        if (observation === undefined) return;
        observation.status = response.status();
        if (response.status() < 400) return;
        void response.json().then((body: unknown) => {
          if (typeof body !== "object" || body === null || !("error" in body)) return;
          const error = body.error;
          if (typeof error !== "object" || error === null) return;
          if ("type" in error) {
            observation.errorType = boundedProviderTextV1(error.type, 80, credentials);
          }
          if ("code" in error) {
            observation.errorCode = boundedProviderTextV1(error.code, 80, credentials);
          }
          if ("message" in error) {
            observation.errorMessage = boundedProviderTextV1(error.message, 240, credentials);
          }
        }).catch(() => undefined);
      });

      await page.goto(target);
      phase = "configure_invalid";
      await configureProviderCredentialV1(page, profile, invalidCredential);

      phase = "create";
      await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
        initialIntentV1,
      );
      await page.getByRole("button", { name: "Create program" }).click();
      const authenticationProposal = page.locator('[data-proposal-status="pending"]');
      await authenticationProposal.waitFor({ state: "visible" });
      requireV1(
        (await authenticationProposal.textContent())?.includes("v1") === true,
        "initial_revision_missing",
      );

      const followUp = page.getByRole("textbox", { name: "Ask for a change…" });
      phase = "authentication";
      requestPhase = "authentication";
      await followUp.fill(authenticationFollowUpV1);
      const authenticationRequest = page.waitForRequest((request) =>
        matchesProviderRequestV1(request, profile)
      );
      await page.getByRole("button", { name: "Send" }).click();
      await authenticationRequest;
      const authenticationObservations = observationsForPhaseV1(
        providerRequests,
        "authentication",
      );
      try {
        await page.waitForFunction(
          () =>
            document.querySelector('[data-pi-agent-run-status="ready"]') !== null &&
            document.querySelector('[data-program-storage-state="ready"]') !== null,
          undefined,
          { timeout: 30_000 },
        );
      } catch {
        throw new QualificationFailureV1(
          "authentication_failure_timeout",
          await providerFailureDetailsV1(page, authenticationObservations),
        );
      }
      requireV1(
        authenticationObservations.length === 1,
        "authentication_provider_request_count_invalid",
      );
      requireV1(
        authenticationObservations.every(({ status }) =>
          status !== null && status >= 400 && status < 500
        ),
        "authentication_provider_status_invalid",
      );
      const authenticationProjection = await durableProjectionV1(page);
      requireV1(
        authenticationProjection.includes('"diagnosticCode":"run_failed"') &&
          authenticationProjection.includes('"kind":"agent_run_failed"'),
        "authentication_error_mapping_invalid",
      );
      requireV1(
        !authenticationProjection.includes(apiKey) &&
          !authenticationProjection.includes(invalidCredential),
        "authentication_credential_persisted",
      );
      requireV1(
        (await authenticationProposal.textContent())?.includes("v1") === true,
        "authentication_published_revision",
      );

      phase = "forget_invalid";
      requestPhase = null;
      const invalidForgetButton = page.getByRole("button", { name: "Forget Provider key" });
      await invalidForgetButton.click();
      await waitForPiWorkerCountV1(page, 0);
      await invalidForgetButton.waitFor({ state: "detached" });
      requireV1(await invalidForgetButton.count() === 0, "invalid_credential_not_forgotten");

      phase = "reload";
      await page.goto(target);
      await page.locator('[data-program-storage-state="ready"]').waitFor();

      phase = "configure";
      await configureProviderCredentialV1(page, profile, apiKey);

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

      phase = "cancel";
      requestPhase = "cancel";
      await followUp.fill(cancelledFollowUpV1);
      const cancellationRequest = page.waitForRequest((request) =>
        matchesProviderRequestV1(request, profile)
      );
      await page.getByRole("button", { name: "Send" }).click();
      await cancellationRequest;
      await page.getByRole("button", { name: "Cancel run" }).click();
      await page.locator('[data-pi-agent-run-status="ready"]').waitFor();
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
      await page.locator('[data-pi-agent-run-status="ready"]').waitFor();
      await page.locator('[data-program-storage-state="ready"]').waitFor();
      requireV1((await proposal.textContent())?.includes("v2") === true, "successor_missing");
      const completionObservations = observationsForPhaseV1(providerRequests, "complete");
      requireCompletedProviderJourneyV1(completionObservations, "complete");
      await page.waitForTimeout(250);
      requireV1((await proposal.textContent())?.includes("v2") === true, "currentness_lost");

      phase = "durable_projection";
      requestPhase = null;
      const durableProjection = await durableProjectionV1(page);
      requireV1(!durableProjection.includes(apiKey), "credential_persisted");

      phase = "forget";
      const forgetButton = page.getByRole("button", { name: "Forget Provider key" });
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
        authenticationFailureObserved: true,
        authenticationProviderStatuses: authenticationObservations.map(({ status }) => status),
        authenticationErrorMapping: "run_failed",
        cancellationObserved: true,
        cancellationProviderStatuses: cancellationObservations.map(({ status }) => status),
        proposalRevision: 2,
        completionProviderRequests: completionObservations.length,
        completionProviderStatuses: completionObservations.map(({ status }) => status),
        currentnessPreserved: true,
        durableCredentialAbsent: true,
        workerForgotten: true,
      });
    } catch (error) {
      if (error instanceof QualificationFailureV1) throw error;
      if (!pageCreated) throw new QualificationFailureV1(`playwright_${phase}_failed`);
      throw new QualificationFailureV1(
        `playwright_${phase}_failed`,
        await providerFailureDetailsV1(
          page,
          providerRequests.filter(({ phase: requestPhase }) => requestPhase === phase),
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
