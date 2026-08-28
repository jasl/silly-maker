// SPDX-License-Identifier: MIT
import { defineConfig } from "vite";

import { collectWorkspaceSandboxBuildIdentityV1 } from "./tools/workspace-sandbox-build-identity.mts";

const localControlOriginsV1 = ["http://127.0.0.1:41739", "http://127.0.0.1:4173"] as const;
const localSandboxContentSecurityPolicyV1 = [
  "default-src 'none'",
  "script-src 'self'",
  "worker-src 'self'",
  "frame-src blob:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  `frame-ancestors ${localControlOriginsV1.join(" ")}`,
  "form-action 'none'",
].join("; ");
const localSandboxResponseHeadersV1 = {
  "Content-Security-Policy": localSandboxContentSecurityPolicyV1,
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
const unavailableShellModuleIdV1 = "\0sillyos-workspace-sandbox-shell-unavailable";

function createUnavailableShellPluginV1() {
  return {
    name: "sillyos-workspace-sandbox-shell-unavailable",
    enforce: "pre" as const,
    resolveId(source: string) {
      return source === "./browser-workspace-just-bash-runtime.ts"
        ? unavailableShellModuleIdV1
        : null;
    },
    load(id: string) {
      if (id !== unavailableShellModuleIdV1) return null;
      return [
        "const unavailable = () => { throw new Error('sillyos.workspace_sandbox.shell_unavailable'); };",
        "export const browserWorkspaceJustBashExecutionProfileV1 = Object.freeze({",
        "  limits: Object.freeze({ traversalEntries: 0, traversalDepth: 0, shellReadBytes: 0 }),",
        "});",
        "export async function executeBrowserWorkspaceJustBashV1() { unavailable(); }",
      ].join("\n");
    },
  };
}

function createNetworkOffDevelopmentHtmlPluginV1() {
  return {
    name: "sillyos-workspace-sandbox-network-off-development-html",
    apply: "serve" as const,
    enforce: "post" as const,
    transformIndexHtml: {
      order: "post" as const,
      handler(html: string): string {
        const result = html.replace(
          /\s*<script type="module" src="\/@vite\/client"><\/script>\s*/u,
          "\n",
        );
        if (result === html) {
          throw new TypeError("sillyos.workspace_sandbox.vite_client_unavailable");
        }
        return result;
      },
    },
  };
}

export default defineConfig(({ command }) => {
  const workspaceSandboxBuildIdentity = collectWorkspaceSandboxBuildIdentityV1({
    appRoot: import.meta.dirname,
    command,
  });
  return {
    base: "/",
    root: import.meta.dirname,
    // The control plane and Sandbox run as two concurrent Vite applications
    // during development/E2E. Sharing Vite's default dependency cache lets one
    // server invalidate the other's lazy Browser Pi Worker modules.
    cacheDir: "node_modules/.vite-silly-os-workspace-sandbox",
    publicDir: "public-workspace-sandbox",
    plugins: [createNetworkOffDevelopmentHtmlPluginV1()],
    define: {
      __SILLYOS_WORKSPACE_SANDBOX_BUILD_IDENTITY__: JSON.stringify(
        workspaceSandboxBuildIdentity,
      ),
    },
    resolve: {
      alias: {
        "node:zlib": new URL(
          "./src/workspace/browser-node-zlib-unavailable.ts",
          import.meta.url,
        ).pathname,
      },
    },
    worker: {
      // The dedicated config replaces optional shell code with a fail-closed
      // module, so the artifact loads one fixed self-contained Host Worker.
      format: "iife",
      plugins: () => [createUnavailableShellPluginV1()],
    },
    server: {
      headers: localSandboxResponseHeadersV1,
      // Network is a denied Sandbox capability. Qualification must not open
      // Vite's development WebSocket behind the product's back.
      hmr: false,
      host: "127.0.0.1",
      port: 41740,
      strictPort: true,
    },
    preview: {
      headers: localSandboxResponseHeadersV1,
      host: "127.0.0.1",
      port: 41740,
      strictPort: true,
    },
    build: {
      emptyOutDir: true,
      outDir: "dist-workspace-sandbox",
      rollupOptions: {
        input: "workspace-sandbox.html",
      },
      target: "es2022",
    },
  };
});
