// SPDX-License-Identifier: MIT

import { chromium, type BrowserType, type Page, webkit } from "npm:playwright";

const openAiResponsesUrlV1 = "https://api.openai.com/v1/responses";
const defaultTargetUrlV1 = "http://127.0.0.1:4175/";
const initialIntentV1 = "Create a compact writing review program.";
const cancelledFollowUpV1 = "Cancel this qualification run before it can propose a revision.";
const completedFollowUpV1 = "Add one explicit review checkpoint before publication.";

class QualificationFailureV1 extends Error {
  constructor(readonly code: string) {
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
  target.searchParams.set("agent", "pi-openai");
  return target.href;
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

async function qualifyBrowserV1(
  browserType: BrowserType,
  target: string,
  apiKey: string,
): Promise<Readonly<Record<string, unknown>>> {
  const profileDirectory = browserType === webkit
    ? await Deno.makeTempDir({ prefix: "sillyos-webkit-qualification-" })
    : null;
  let closeRuntimeV1: (() => Promise<void>) | null = null;
  let phase = "open";
  try {
    try {
      let page: Page;
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
      let providerRequestCount = 0;
      const providerStatuses: number[] = [];
      page.on("request", (request) => {
        if (request.url() === openAiResponsesUrlV1) providerRequestCount += 1;
      });
      page.on("response", (response) => {
        if (response.url() === openAiResponsesUrlV1) {
          providerStatuses.push(response.status());
        }
      });

      await page.goto(target);
      phase = "configure";
      const keyInput = page.getByLabel("OpenAI API key (memory only)");
      await keyInput.fill(apiKey);
      await page.getByRole("button", { name: "Load OpenAI key" }).click();
      await page.getByText("OpenAI Agent configured", { exact: true }).waitFor();
      requireV1(await keyInput.count() === 0, "credential_input_not_cleared");

      phase = "create";
      await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
        initialIntentV1,
      );
      await page.getByRole("button", { name: "Create program" }).click();
      const proposal = page.locator('[data-proposal-status="pending"]');
      requireV1(
        (await proposal.textContent())?.includes("v1") === true,
        "initial_revision_missing",
      );

      phase = "cancel";
      const followUp = page.getByRole("textbox", { name: "Ask for a change…" });
      await followUp.fill(cancelledFollowUpV1);
      const cancellationRequest = page.waitForRequest(
        (request) => request.url() === openAiResponsesUrlV1,
      );
      await page.getByRole("button", { name: "Send" }).click();
      await cancellationRequest;
      await page.getByRole("button", { name: "Cancel run" }).click();
      await page.locator('[data-pi-agent-run-status="ready"]').waitFor();
      await page.waitForTimeout(250);
      requireV1(
        (await proposal.textContent())?.includes("v1") === true,
        "cancel_published_revision",
      );

      phase = "complete";
      const completionRequestBaseline = providerRequestCount;
      await followUp.fill(completedFollowUpV1);
      await page.getByRole("button", { name: "Send" }).click();
      await page.waitForFunction(
        () =>
          document.querySelector('[data-proposal-status="pending"]')?.textContent?.includes(
            "v2",
          ) === true,
        undefined,
        { timeout: 45_000 },
      );
      await page.locator('[data-program-storage-state="ready"]').waitFor();
      requireV1((await proposal.textContent())?.includes("v2") === true, "successor_missing");
      requireV1(
        providerRequestCount - completionRequestBaseline === 2,
        "provider_request_count_invalid",
      );
      requireV1(providerStatuses.slice(-2).every((status) => status === 200), "provider_failed");

      phase = "durable_projection";
      const durableProjection = await durableProjectionV1(page);
      requireV1(!durableProjection.includes(apiKey), "credential_persisted");

      phase = "forget";
      const forgetButton = page.getByRole("button", { name: "Forget OpenAI key" });
      await forgetButton.click();
      await forgetButton.waitFor({ state: "detached" });
      requireV1(
        await forgetButton.count() === 0,
        "credential_not_forgotten",
      );

      return Object.freeze({
        browser: browserType.name(),
        result: "passed",
        cancellationObserved: true,
        proposalRevision: 2,
        completionProviderRequests: 2,
        completionProviderStatuses: providerStatuses.slice(-2),
        durableCredentialAbsent: true,
        workerForgotten: true,
      });
    } catch (error) {
      if (error instanceof QualificationFailureV1) throw error;
      throw new QualificationFailureV1(`playwright_${phase}_failed`);
    }
  } finally {
    try {
      if (closeRuntimeV1 !== null) await closeRuntimeV1();
    } finally {
      if (profileDirectory !== null) {
        await Deno.remove(profileDirectory, { recursive: true });
      }
    }
  }
}

const apiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
requireV1(apiKey.length > 0, "openai_api_key_missing");
const target = targetUrlV1(Deno.args[0] ?? defaultTargetUrlV1);
let failed = false;
for (const browserType of [chromium, webkit]) {
  try {
    console.log(JSON.stringify(await qualifyBrowserV1(browserType, target, apiKey)));
  } catch (error) {
    failed = true;
    const code = error instanceof QualificationFailureV1 ? error.code : "unexpected_failure";
    console.error(JSON.stringify({ browser: browserType.name(), result: "failed", code }));
  }
}
if (failed) Deno.exitCode = 1;
