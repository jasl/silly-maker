// SPDX-License-Identifier: MIT

import { readdir, stat, readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const applicationRootV1 = resolve(import.meta.dirname, "..");
const sourceRootV1 = resolve(applicationRootV1, "..");
const programPlatformRootV1 = resolve(applicationRootV1, "program-platform");
const programsRootV1 = resolve(sourceRootV1, "programs");
const sharedUiRootV1 = resolve(applicationRootV1, "ui");

interface SourceV1 {
  readonly path: string;
  readonly text: string;
}

async function sourcesBelowV1(root: string): Promise<readonly SourceV1[]> {
  const sources: SourceV1[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) {
      sources.push(...await sourcesBelowV1(path));
    } else if (entry.isFile() && /\.(?:ts|tsx)$/u.test(entry.name)) {
      sources.push({ path, text: await readFile(path, "utf8") });
    }
  }
  return sources;
}

async function pathsBelowV1(root: string): Promise<readonly string[]> {
  const paths: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) paths.push(...await pathsBelowV1(path));
    else if (entry.isFile()) paths.push(path);
  }
  return paths;
}

function relativeImportsV1(source: SourceV1): readonly string[] {
  const imports: string[] = [];
  const matcher = /(?:\bfrom\s*|\bimport\s*\()\s*["'](\.{1,2}\/[^"']+)["']/gu;
  for (const match of source.text.matchAll(matcher)) {
    if (match[1] !== undefined) imports.push(resolve(dirname(source.path), match[1]));
  }
  return imports;
}

function insideV1(path: string, root: string): boolean {
  const candidate = relative(root, path);
  return candidate === "" || (!candidate.startsWith("..") && !candidate.startsWith("/"));
}

describe("SillyOS Program architecture boundary", () => {
  it("keeps the Program platform independent from application composition and Programs", async () => {
    const violations = (await sourcesBelowV1(programPlatformRootV1)).flatMap((source) =>
      relativeImportsV1(source)
        .filter((dependency) =>
          insideV1(dependency, programsRootV1) ||
          insideV1(dependency, resolve(applicationRootV1, "application"))
        )
        .map((dependency) => ({
          source: relative(sourceRootV1, source.path),
          dependency: relative(sourceRootV1, dependency),
        }))
    );

    expect(violations).toEqual([]);
  });

  it("keeps every Program source tree isolated from sibling Programs", async () => {
    const programDirectories = (await readdir(programsRootV1, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => resolve(programsRootV1, entry.name));
    const violations: { source: string; dependency: string }[] = [];
    for (const programRoot of programDirectories) {
      for (const source of await sourcesBelowV1(programRoot)) {
        for (const dependency of relativeImportsV1(source)) {
          if (
            insideV1(dependency, programsRootV1) &&
            !insideV1(dependency, programRoot)
          ) {
            violations.push({
              source: relative(sourceRootV1, source.path),
              dependency: relative(sourceRootV1, dependency),
            });
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps concrete Program dependencies at the application composition root", async () => {
    const allowedCompositionSources = new Set([
      resolve(applicationRootV1, "application/program-agent-runtime-composition.ts"),
      resolve(applicationRootV1, "application/program-composition.ts"),
      resolve(applicationRootV1, "application/program-persistence-composition.ts"),
      resolve(applicationRootV1, "application/program-runtime-composition.ts"),
    ]);
    const productionRoots = [
      resolve(applicationRootV1, "agent"),
      resolve(applicationRootV1, "application"),
      resolve(applicationRootV1, "content"),
      resolve(applicationRootV1, "credential"),
      resolve(applicationRootV1, "program-platform"),
      resolve(applicationRootV1, "ui"),
      resolve(applicationRootV1, "workspace"),
    ];
    const violations: { source: string; dependency: string }[] = [];
    for (const root of productionRoots) {
      for (const source of await sourcesBelowV1(root)) {
        if (/\.test\.[cm]?[jt]sx?$/u.test(source.path)) continue;
        if (allowedCompositionSources.has(source.path)) continue;
        for (const dependency of relativeImportsV1(source)) {
          if (insideV1(dependency, programsRootV1)) {
            violations.push({
              source: relative(sourceRootV1, source.path),
              dependency: relative(sourceRootV1, dependency),
            });
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps shared Host UI independent from Program-owned UI modules", async () => {
    const violations = (await sourcesBelowV1(sharedUiRootV1)).flatMap((source) =>
      relativeImportsV1(source)
        .filter((dependency) =>
          insideV1(dependency, programsRootV1) &&
          relative(programsRootV1, dependency).split("/").includes("ui")
        )
        .map((dependency) => ({
          source: relative(sourceRootV1, source.path),
          dependency: relative(sourceRootV1, dependency),
        }))
    );

    expect(violations).toEqual([]);
  });

  it("keeps Program-owned UI tests with their Program", async () => {
    const sharedTestRoot = resolve(applicationRootV1, "test");
    const violations = (await sourcesBelowV1(sharedTestRoot)).flatMap((source) =>
      relativeImportsV1(source)
        .filter((dependency) =>
          insideV1(dependency, programsRootV1) &&
          relative(programsRootV1, dependency).split("/").includes("ui")
        )
        .map((dependency) => ({
          source: relative(sourceRootV1, source.path),
          dependency: relative(sourceRootV1, dependency),
        }))
    );

    expect(violations).toEqual([]);
  });

  it("routes every Program UI tree through the shared Program UI Container", async () => {
    const containerPath = resolve(
      programPlatformRootV1,
      "ui/program-ui-container.tsx",
    );
    const violations: string[] = [];
    for (const entry of await readdir(programsRootV1, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const programRoot = resolve(programsRootV1, entry.name);
      const uiSources = await sourcesBelowV1(resolve(programRoot, "ui")).catch(() => []);
      const sourcesByPath = new Map(uiSources.map((source) => [source.path, source]));
      const entrySources = uiSources.filter((source) =>
        source.path.endsWith("-program-surface.tsx")
      );
      const pending = [...entrySources];
      const reachable = new Map<string, SourceV1>();
      while (pending.length > 0) {
        const source = pending.pop()!;
        if (reachable.has(source.path)) continue;
        reachable.set(source.path, source);
        for (const dependency of relativeImportsV1(source)) {
          const local = sourcesByPath.get(dependency);
          if (local !== undefined) pending.push(local);
        }
      }
      const containerConsumers = [...reachable.values()].filter((source) =>
        relativeImportsV1(source).includes(containerPath) &&
        /<ProgramUiContainerV1\b/u.test(source.text)
      );
      if (entrySources.length !== 1 || containerConsumers.length === 0) {
        violations.push(relative(sourceRootV1, programRoot));
      }
    }

    expect(violations).toEqual([]);
  });

  it("scopes every Program stylesheet to its runtime surface", async () => {
    const violations: string[] = [];
    for (const entry of await readdir(programsRootV1, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const uiRoot = resolve(programsRootV1, entry.name, "ui");
      for (const path of await pathsBelowV1(uiRoot).catch(() => [])) {
        if (!path.endsWith(".css")) continue;
        const source = await readFile(path, "utf8");
        if (!source.includes("@scope ([data-program-runtime-profile=")) {
          violations.push(relative(sourceRootV1, path));
        }
        if (/(?:^|[},]\s*)(?::root|html|body|#root)\b/mu.test(source)) {
          violations.push(`${relative(sourceRootV1, path)}: global root selector`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the active runtime owner and shared surface Host Program-generic", async () => {
    const paths = [
      resolve(applicationRootV1, "application/program-controller-owner.ts"),
      resolve(applicationRootV1, "application/program-runtime-controller.ts"),
      resolve(applicationRootV1, "program-platform/ui/program-runtime-surface.ts"),
      resolve(sharedUiRootV1, "silly-os-app.tsx"),
    ];
    for (const path of paths) {
      const source = await readFile(path, "utf8");
      expect(source).not.toMatch(/programs\/(?:creator|translation)/u);
      expect(source).not.toMatch(
        /\b(?:Creator|Translation)(?:Controller|Program|Surface|Workspace)/u,
      );
    }
  });

  it("keeps the fixed Agent Host independent from Program contracts and dispatch branches", async () => {
    const hostPath = resolve(applicationRootV1, "application/program-agent-composition.ts");
    const host = { path: hostPath, text: await readFile(hostPath, "utf8") };
    const programDependencies = relativeImportsV1(host)
      .filter((dependency) => insideV1(dependency, programsRootV1))
      .map((dependency) => relative(sourceRootV1, dependency));

    expect(programDependencies).toEqual([]);
    expect(host.text).not.toMatch(/kind:\s*["'](?:creator|translation)["']/u);
    expect(host.text).not.toContain("programs/creator");
    expect(host.text).not.toContain("programs/translation");
  });

  it("keeps Program development material outside every production source graph", async () => {
    const violations: { source: string; dependency: string }[] = [];
    for (const entry of await readdir(programsRootV1, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const programRoot = resolve(programsRootV1, entry.name);
      const developmentRoots = [
        resolve(programRoot, "notes"),
        resolve(programRoot, "test"),
      ];
      for (
        const productionDirectory of [
          "distribution",
          "package",
          "persistence",
          "runtime",
          "runtime-profile",
          "ui",
        ]
      ) {
        const productionRoot = resolve(programRoot, productionDirectory);
        for (const source of await sourcesBelowV1(productionRoot).catch(() => [])) {
          for (const dependency of relativeImportsV1(source)) {
            if (developmentRoots.some((root) => insideV1(dependency, root))) {
              violations.push({
                source: relative(sourceRootV1, source.path),
                dependency: relative(sourceRootV1, dependency),
              });
            }
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps package roots as distribution payloads without Host source or development files", async () => {
    await expect(stat(resolve(applicationRootV1, "product"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    for (const entry of await readdir(programsRootV1, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const packageRoot = resolve(programsRootV1, entry.name, "package");
      expect(
        (await pathsBelowV1(packageRoot).catch(() => []))
          .map((path) => relative(packageRoot, path))
          .filter((path) => /(?:^|\/)(?:notes?|research|tests?)(?:\/|$)/u.test(path)),
      ).toEqual([]);
      expect(
        (await pathsBelowV1(packageRoot).catch(() => []))
          .map((path) => relative(packageRoot, path))
          .filter((path) => /\.(?:ts|tsx)$/u.test(path)),
      ).toEqual([]);
    }
  });
});
