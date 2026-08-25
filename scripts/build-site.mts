// SPDX-License-Identifier: MIT
// Composes the publishable static site under dist/site:
//   /                Astro/Starlight documentation (website/)
//   /play/cards/      the neutral GUI Reference Product
//   /play/cat-cafe/  the Cat Cafe Player bundle (relative-base, static saves
//                    live in the visitor's browser via IndexedDB)
//   /play/silly-os/  the SillyOS 98 retro-desktop example
//
// SITE_BASE selects the deployment base path. Root deployments (Cloudflare
// Workers, custom domains) omit it; GitHub Pages project sites set
// SITE_BASE=/<repo>/. The Player bundles are built with base "./" so they
// are location-independent and need no base plumbing of their own.
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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

// 1. Player bundles (app build runs Vite with each target's own config).
await runV1(["deno", "task", "app", "build", "example-cards"]);
await runV1(["deno", "task", "app", "build", "example-cat-cafe"]);
await runV1(["deno", "task", "app", "build", "example-silly-os"]);

// 2. Documentation site with the deployment base.
await runV1(["deno", "task", "docs:build"], { SITE_BASE: siteBase });

// 3. Compose.
await rm(siteDir, { recursive: true, force: true });
await mkdir(join(siteDir, "play"), { recursive: true });
await cp(join(repoRoot, "website", "dist"), siteDir, { recursive: true });
await cp(join(repoRoot, "examples", "cards", "dist-web"), join(siteDir, "play", "cards"), {
  recursive: true,
});
await cp(join(repoRoot, "examples", "cat-cafe", "dist-web"), join(siteDir, "play", "cat-cafe"), {
  recursive: true,
});
await cp(join(repoRoot, "examples", "silly-os", "dist-web"), join(siteDir, "play", "silly-os"), {
  recursive: true,
});
// GitHub Pages runs Jekyll by default, which drops Astro's underscore-prefixed
// asset directory. `.nojekyll` preserves the generated site and is inert on
// other static hosts.
await writeFile(join(siteDir, ".nojekyll"), "");

// 4. Share metadata absolutization: crawlers require absolute URLs for
// og:image/twitter:image. When the deployment origin is known (the GitHub
// Pages workflow sets SITE_ORIGIN), rewrite the game page's share image
// URLs and pin og:url to the page location.
const siteOrigin = process.env.SITE_ORIGIN;
if (siteOrigin !== undefined && siteOrigin !== "") {
  const pageBase = new URL(siteBase.endsWith("/") ? siteBase : `${siteBase}/`, siteOrigin).href;
  const gamePage = join(siteDir, "play", "cat-cafe", "index.html");
  const gameUrl = `${pageBase}play/cat-cafe/`;
  let html = await readFile(gamePage, "utf8");
  html = html.replace(
    /(property="og:image" content="|name="twitter:image" content=")(?!https?:)/gu,
    `$1${gameUrl}`,
  );
  html = html.replace(
    /<meta property="og:type"/u,
    `<meta property="og:url" content="${gameUrl}" />\n    <meta property="og:type"`,
  );
  await writeFile(gamePage, html);
  console.log(`[site] share URLs absolutized against ${gameUrl}`);
}

console.log(`[site] composed at ${siteDir}`);
