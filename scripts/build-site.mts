// SPDX-License-Identifier: MIT
// Composes the publishable static site under dist/site:
//   /               VitePress documentation (website/)
//   /play/cat-cafe/ the Cat Cafe Player bundle (relative-base, static saves
//                   live in the visitor's browser via IndexedDB)
//
// SITE_BASE selects the deployment base path. Root deployments (Cloudflare
// Workers, custom domains) omit it; GitHub Pages project sites set
// SITE_BASE=/<repo>/. The Player bundles are built with base "./" so they
// are location-independent and need no base plumbing of their own.
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

// 1. Player bundle (story build already runs vite with the target's config).
await runV1(["deno", "task", "story", "build", "example-cat-cafe"]);

// 2. Documentation site with the deployment base.
await runV1(["deno", "task", "docs:build"], { SITE_BASE: siteBase });

// 3. Compose.
await rm(siteDir, { recursive: true, force: true });
await mkdir(join(siteDir, "play"), { recursive: true });
await cp(join(repoRoot, "website", ".vitepress", "dist"), siteDir, { recursive: true });
await cp(join(repoRoot, "dist", "example-cat-cafe"), join(siteDir, "play", "cat-cafe"), {
  recursive: true,
});
// GitHub Pages runs Jekyll by default which drops underscore-prefixed
// files (VitePress emits assets/…, fine — but .nojekyll is the standard
// belt-and-braces switch and is inert elsewhere).
await writeFile(join(siteDir, ".nojekyll"), "");

console.log(`[site] composed at ${siteDir}`);
