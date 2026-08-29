// SPDX-License-Identifier: MIT
import { defineConfig } from "vite";

import { collectNetworkBrokerBuildIdentityV1 } from "./tools/network-broker-build-identity.mts";

const localControlOriginsV1 = ["http://127.0.0.1:41739", "http://127.0.0.1:4173"] as const;

function localNetworkBrokerContentSecurityPolicyV1(): string {
  return [
    "default-src 'none'",
    "script-src 'self'",
    "worker-src 'self'",
    "connect-src https:",
    "object-src 'none'",
    "base-uri 'none'",
    `frame-ancestors ${localControlOriginsV1.join(" ")}`,
    "form-action 'none'",
  ].join("; ");
}

function localNetworkBrokerResponseHeadersV1() {
  return {
    "Content-Security-Policy": localNetworkBrokerContentSecurityPolicyV1(),
    "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
}

function createFixedBrokerDevelopmentHtmlPluginV1() {
  return {
    name: "sillyos-network-broker-fixed-development-html",
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
          throw new TypeError("sillyos.network_broker.vite_client_unavailable");
        }
        return result;
      },
    },
  };
}

export default defineConfig(({ command }) => {
  const networkBrokerBuildIdentity = collectNetworkBrokerBuildIdentityV1({
    appRoot: import.meta.dirname,
    command,
  });
  const headers = localNetworkBrokerResponseHeadersV1();
  return {
    base: "/",
    root: import.meta.dirname,
    cacheDir: "node_modules/.vite-silly-os-network-broker",
    publicDir: "public-network-broker",
    plugins: [createFixedBrokerDevelopmentHtmlPluginV1()],
    define: {
      __SILLYOS_NETWORK_BROKER_BUILD_IDENTITY__: JSON.stringify(networkBrokerBuildIdentity),
    },
    worker: { format: "es" },
    server: {
      headers,
      hmr: false,
      host: "127.0.0.1",
      port: 41741,
      strictPort: true,
    },
    preview: {
      headers,
      host: "127.0.0.1",
      port: 41741,
      strictPort: true,
    },
    build: {
      emptyOutDir: true,
      modulePreload: { polyfill: false },
      outDir: "dist-network-broker",
      rollupOptions: { input: "network-broker.html" },
      target: "es2022",
    },
  };
});
