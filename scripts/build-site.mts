// SPDX-License-Identifier: MIT
// Composes the publishable static site under dist/site:
//   /                          Astro/Starlight documentation (website/)
//   /play/vn-last-sound-check/  the flagship VN Reference Product
//
// SITE_BASE selects the deployment base path. Root deployments (Cloudflare
// Workers, custom domains) omit it; GitHub Pages project sites set
// SITE_BASE=/<repo>/. The application bundle is built with base "./" so it
// is location-independent and needs no base plumbing of its own.
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

// The script runs under Deno; tsc checks it without Deno lib types.
declare const Deno: {
  Command: new (
    command: string,
    options: {
      readonly args: readonly string[];
      readonly cwd: string;
      readonly env: Record<string, string>;
      readonly stdout: "inherit";
      readonly stderr: "inherit";
    },
  ) => { spawn(): { readonly status: Promise<{ success: boolean; code: number }> } };
};

const repoRoot = new URL("..", import.meta.url).pathname;
const siteDir = join(repoRoot, "dist", "site");
const siteBase = process.env.SITE_BASE ?? "/";

async function runV1(command: string[], env?: Record<string, string>): Promise<void> {
  const child = new Deno.Command(command[0] as string, {
    args: command.slice(1),
    cwd: repoRoot,
    env: { ...(process.env as Record<string, string>), ...env },
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  const status = await child.status;
  if (!status.success) {
    throw new Error(`command failed (${String(status.code)}): ${command.join(" ")}`);
  }
}

console.log(`[site] base: ${siteBase}`);

// 1. Application bundles (app build runs Vite with each target's own config).
await runV1(["deno", "task", "app", "build", "example-vn-last-sound-check"]);

// 2. Documentation site with the deployment base.
await runV1(["deno", "task", "docs:build"], { SITE_BASE: siteBase });

// 3. Compose.
await rm(siteDir, { recursive: true, force: true });
await mkdir(join(siteDir, "play"), { recursive: true });
await cp(join(repoRoot, "website", "dist"), siteDir, { recursive: true });
await cp(
  join(repoRoot, "examples", "vn-last-sound-check", "dist-web"),
  join(siteDir, "play", "vn-last-sound-check"),
  { recursive: true },
);
// GitHub Pages runs Jekyll by default, which drops Astro's underscore-prefixed
// asset directory. `.nojekyll` preserves the generated site and is inert on
// other static hosts.
await writeFile(join(siteDir, ".nojekyll"), "");

console.log(`[site] composed at ${siteDir}`);
