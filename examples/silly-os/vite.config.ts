// SPDX-License-Identifier: MIT
import { randomBytes } from "node:crypto";

import { defineConfig, type Plugin } from "vite";

import { createSillymakerAppViteConfigV1 } from "@sillymaker/tooling/vite";

import { sillymakerAppConfigV1 } from "./sillymaker.config.ts";
import {
  browserPermissionsPolicyV1,
  browserTrustedTypesReportOnlyPolicyV1,
  createBrowserControlPlaneContentSecurityPolicyV1,
} from "./src/deployment/browser-control-plane-security.ts";
import { parseCanonicalEndpointOriginV1 } from "./src/deployment/cloudflare-selected-origin-worker.ts";
import { browserWorkspaceSandboxDevelopmentOriginV1 } from "./src/workspace/browser-workspace-sandbox-origins.ts";
import { collectWorkspaceSandboxBuildIdentityV1 } from "./tools/workspace-sandbox-build-identity.mts";

const browserPiDevelopmentWorkerPathV1 = "/src/agent/browser-pi.worker.ts";

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

export default defineConfig(async ({ command, isPreview }) => {
  const config = await createSillymakerAppViteConfigV1({
    appRoot: import.meta.dirname,
    config: sillymakerAppConfigV1,
  });
  const workspaceSandboxBuildIdentity = collectWorkspaceSandboxBuildIdentityV1({
    appRoot: import.meta.dirname,
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
      createSelectedOriginAgentWorkerDevelopmentPluginV1(),
    ],
    publicDir: "public",
    define: {
      ...config.define,
      __SILLYOS_WORKSPACE_SANDBOX_BUILD_IDENTITY__: JSON.stringify(
        workspaceSandboxBuildIdentity,
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
      ],
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
        ignored: ["**/dist-workspace-sandbox/**"],
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
