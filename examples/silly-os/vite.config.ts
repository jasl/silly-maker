// SPDX-License-Identifier: MIT
import { randomBytes } from "node:crypto";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

import { createSillymakerAppViteConfigV1 } from "@sillymaker/tooling/vite";

import { sillymakerAppConfigV1 } from "./sillymaker.config.ts";
import {
  browserPermissionsPolicyV1,
  browserTrustedTypesReportOnlyPolicyV1,
  createBrowserControlPlaneContentSecurityPolicyV1,
} from "./src/deployment/browser-control-plane-security.ts";
import {
  applyBrowserCredentialVaultWorkerSecurityHeadersV1,
  browserCredentialVaultWorkerContentSecurityPolicyV1,
  browserCredentialVaultWorkerDevelopmentContentSecurityPolicyV1,
  classifyBrowserCredentialVaultDevelopmentRequestV1,
  isBrowserCredentialVaultWorkerAssetPathV1,
} from "./src/deployment/browser-credential-vault-security.ts";
import { parseCanonicalEndpointOriginV1 } from "./src/deployment/cloudflare-selected-origin-worker.ts";
import { browserWorkspaceSandboxDevelopmentOriginV1 } from "./src/workspace/browser-workspace-sandbox-origins.ts";
import { collectNetworkBrokerBuildIdentityV1 } from "./tools/network-broker-build-identity.mts";
import { collectWorkspaceSandboxBuildIdentityV1 } from "./tools/workspace-sandbox-build-identity.mts";

const browserPiDevelopmentWorkerPathV1 = "/src/agent/browser-pi.worker.ts";
const sillyOsAppRootV1 = import.meta.dirname;
if (sillyOsAppRootV1 === undefined) throw new TypeError("sillyos.vite.app_root_unavailable");

function createSelectedOriginAgentWorkerDevelopmentPluginV1(): Plugin {
  return {
    name: "sillyos-selected-origin-agent-worker-development-policy",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
        if (
          requestUrl.pathname !== browserPiDevelopmentWorkerPathV1 ||
          !requestUrl.searchParams.has("endpoint-origin")
        ) {
          next();
          return;
        }
        const workerFileValues = requestUrl.searchParams.getAll("worker_file");
        const typeValues = requestUrl.searchParams.getAll("type");
        const endpointValues = requestUrl.searchParams.getAll("endpoint-origin");
        const endpointOrigin = endpointValues.length === 1
          ? parseCanonicalEndpointOriginV1(endpointValues[0] ?? null)
          : null;
        if (
          requestUrl.searchParams.size !== 3 || workerFileValues.length !== 1 ||
          workerFileValues[0] !== "" || typeValues.length !== 1 || typeValues[0] !== "module" ||
          endpointOrigin === null
        ) {
          response.statusCode = 400;
          response.setHeader("Cache-Control", "no-store");
          response.setHeader("Content-Type", "text/plain; charset=utf-8");
          response.end("Invalid Agent Worker endpoint origin.");
          return;
        }
        const selectedPolicy = createBrowserControlPlaneContentSecurityPolicyV1(
          endpointOrigin,
          browserWorkspaceSandboxDevelopmentOriginV1,
        );
        const writeHead = response.writeHead.bind(response);
        response.writeHead = ((...args: Parameters<typeof response.writeHead>) => {
          response.setHeader("Cache-Control", "no-store");
          response.setHeader("Content-Security-Policy", selectedPolicy);
          return writeHead(...args);
        }) as typeof response.writeHead;
        requestUrl.searchParams.delete("endpoint-origin");
        request.url = `${requestUrl.pathname}${requestUrl.search}`;
        next();
      });
    },
  };
}

function createCredentialVaultWorkerSecurityPluginV1(): Plugin {
  const applyResponsePolicyV1 = (
    response: {
      setHeader(name: string, value: string): void;
      removeHeader(name: string): void;
      writeHead: (...args: never[]) => unknown;
    },
    contentSecurityPolicy: string,
  ): void => {
    const writeHead = response.writeHead.bind(response);
    response.writeHead = ((...args: never[]) => {
      response.setHeader(
        "Content-Security-Policy",
        contentSecurityPolicy,
      );
      response.removeHeader("Content-Security-Policy-Report-Only");
      response.setHeader("Permissions-Policy", browserPermissionsPolicyV1);
      response.setHeader("Referrer-Policy", "no-referrer");
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.setHeader("X-Frame-Options", "DENY");
      return writeHead(...args);
    }) as typeof response.writeHead;
  };
  const rejectV1 = (response: {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(body?: string): void;
  }): void => {
    response.statusCode = 400;
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    const headers = new Headers();
    applyBrowserCredentialVaultWorkerSecurityHeadersV1(headers);
    for (const [name, value] of headers) response.setHeader(name, value);
    response.end("Invalid Credential Vault Worker request.");
  };
  return {
    name: "sillyos-credential-vault-worker-security-policy",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const disposition = classifyBrowserCredentialVaultDevelopmentRequestV1(
          request.url ?? "/",
        );
        if (disposition === "unrelated" || disposition === "module_resolution") {
          next();
          return;
        }
        if (disposition === "rejected") {
          rejectV1(response);
          return;
        }
        applyResponsePolicyV1(
          response,
          browserCredentialVaultWorkerDevelopmentContentSecurityPolicyV1,
        );
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
        if (!isBrowserCredentialVaultWorkerAssetPathV1(requestUrl.pathname)) {
          next();
          return;
        }
        if (requestUrl.search.length !== 0 || requestUrl.hash.length !== 0) {
          rejectV1(response);
          return;
        }
        applyResponsePolicyV1(response, browserCredentialVaultWorkerContentSecurityPolicyV1);
        next();
      });
    },
  };
}

export default defineConfig(async ({ command, isPreview }) => {
  const config = await createSillymakerAppViteConfigV1({
    appRoot: sillyOsAppRootV1,
    config: sillymakerAppConfigV1,
  });
  const workspaceSandboxBuildIdentity = collectWorkspaceSandboxBuildIdentityV1({
    appRoot: sillyOsAppRootV1,
    command,
  });
  const networkBrokerBuildIdentity = collectNetworkBrokerBuildIdentityV1({
    appRoot: sillyOsAppRootV1,
    command,
  });
  const localBaseContentSecurityPolicy = createBrowserControlPlaneContentSecurityPolicyV1(
    null,
    browserWorkspaceSandboxDevelopmentOriginV1,
  );
  const developmentStyleNonce = command === "serve" && !isPreview
    ? randomBytes(18).toString("base64")
    : null;
  const localContentSecurityPolicy = developmentStyleNonce === null
    ? localBaseContentSecurityPolicy
    : localBaseContentSecurityPolicy.replace(
      "style-src-elem 'self'",
      `style-src-elem 'self' 'nonce-${developmentStyleNonce}'`,
    );
  const localSecurityHeaders = {
    "Content-Security-Policy": localContentSecurityPolicy,
    "Permissions-Policy": browserPermissionsPolicyV1,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
  const localPreviewSecurityHeaders = {
    ...localSecurityHeaders,
    "Content-Security-Policy": localBaseContentSecurityPolicy,
    "Content-Security-Policy-Report-Only": browserTrustedTypesReportOnlyPolicyV1,
  };
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      tailwindcss(),
      createSelectedOriginAgentWorkerDevelopmentPluginV1(),
      createCredentialVaultWorkerSecurityPluginV1(),
    ],
    publicDir: "public",
    define: {
      ...config.define,
      __SILLYOS_WORKSPACE_SANDBOX_BUILD_IDENTITY__: JSON.stringify(
        workspaceSandboxBuildIdentity,
      ),
      __SILLYOS_NETWORK_BROKER_BUILD_IDENTITY__: JSON.stringify(
        networkBrokerBuildIdentity,
      ),
    },
    ...(developmentStyleNonce === null ? {} : {
      html: {
        ...config.html,
        // Vite propagates this per-server nonce to every dev-injected style.
        cspNonce: developmentStyleNonce,
      },
    }),
    optimizeDeps: {
      ...config.optimizeDeps,
      // Stabilize the first lazy Agent Worker load in dev/E2E. Production
      // chunking and Browser qualification remain independently verified.
      include: [
        ...(config.optimizeDeps?.include ?? []),
        "@earendil-works/pi-agent-core",
        "@earendil-works/pi-ai",
        "@earendil-works/pi-ai/providers/all",
        "@earendil-works/pi-ai/api/anthropic-messages.lazy",
        "@earendil-works/pi-ai/api/google-generative-ai.lazy",
        "@earendil-works/pi-ai/api/openai-completions.lazy",
        "@earendil-works/pi-ai/api/openai-responses.lazy",
        "@openuidev/lang-core",
        // Translation is a second-level lazy Program surface. Its fixed UI and
        // Provider descendants must join the initial optimizer generation;
        // discovering one after the click replaces the React browser graph
        // while the mounted shell still holds the predecessor.
        "@tanstack/react-virtual",
      ],
    },
    worker: {
      ...config.worker,
      // The Agent Worker resolves a Program runtime profile only after a run
      // selects it. ESM output preserves those dynamic imports as separate
      // chunks instead of folding every bundled Program into one Worker file.
      format: "es" as const,
    },
    server: {
      ...config.server,
      // Vite's development client and dependency optimizer create dynamic
      // script URLs that are absent from the built product. Keep the enforced
      // CSP here; exercise Trusted Types Report-Only on preview/production.
      headers: localSecurityHeaders,
      // Vite's React Refresh preamble is executable inline script. Keep the
      // control origin strict and use ordinary page reloads for this product.
      hmr: false,
      watch: {
        ...config.server?.watch,
        // The independent Sandbox is built before its preview server during
        // browser qualification. Its output must not reload the control page.
        ignored: ["**/dist-workspace-sandbox/**", "**/dist-network-broker/**"],
      },
    },
    preview: {
      ...config.preview,
      // Preview has no Vite client/optimizer code, so it retains the same
      // Trusted Types observation header as the production control origin.
      headers: localPreviewSecurityHeaders,
    },
    resolve: {
      ...config.resolve,
      alias: {
        "node:zlib": new URL(
          "./src/workspace/browser-node-zlib-unavailable.ts",
          import.meta.url,
        ).pathname,
      },
    },
  };
});
