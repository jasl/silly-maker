// SPDX-License-Identifier: CC-BY-NC-SA-4.0
import { defineConfig } from "vitepress";

/**
 * The public SillyMaker documentation site: audience-facing guides and
 * concepts in English (root) and Chinese (/zh/). Internal engineering
 * documents (plans, research, proposals, policies) stay in the
 * repository's docs/ tree and are not published here.
 */
export default defineConfig({
  title: "SillyMaker",
  description: "An LLM-friendly TypeScript + React game engine for VN / SLG / RPG stories.",
  // Static hosts under a sub-path (for example GitHub Pages project sites)
  // set SITE_BASE=/repo-name/ at build time; root deployments omit it.
  base: process.env.SITE_BASE ?? "/",
  lastUpdated: false,
  themeConfig: {
    socialLinks: [{ icon: "github", link: "https://github.com/jasl/project-tavern" }],
  },
  locales: {
    root: {
      label: "English",
      lang: "en",
      themeConfig: {
        nav: [
          { text: "Guide", link: "/guide/getting-started" },
          { text: "Reference", link: "/reference/cli" },
          { text: "Play Cat Cafe", link: "/play/cat-cafe/", target: "_self" },
        ],
        sidebar: [
          {
            text: "Guide",
            items: [
              { text: "Getting started", link: "/guide/getting-started" },
              { text: "Core concepts", link: "/guide/concepts" },
              { text: "Your first Story", link: "/guide/first-story" },
              { text: "Tuning and debugging", link: "/guide/tuning" },
            ],
          },
          {
            text: "Reference",
            items: [
              { text: "Story CLI", link: "/reference/cli" },
              { text: "Repository layout", link: "/reference/layout" },
            ],
          },
        ],
      },
    },
    zh: {
      label: "简体中文",
      lang: "zh-CN",
      link: "/zh/",
      themeConfig: {
        nav: [
          { text: "指南", link: "/zh/guide/getting-started" },
          { text: "参考", link: "/zh/reference/cli" },
          { text: "试玩《雨巷猫舍》", link: "/play/cat-cafe/", target: "_self" },
        ],
        sidebar: [
          {
            text: "指南",
            items: [
              { text: "快速开始", link: "/zh/guide/getting-started" },
              { text: "核心概念", link: "/zh/guide/concepts" },
              { text: "第一个 Story", link: "/zh/guide/first-story" },
              { text: "调参与调试", link: "/zh/guide/tuning" },
            ],
          },
          {
            text: "参考",
            items: [
              { text: "Story CLI", link: "/zh/reference/cli" },
              { text: "仓库结构", link: "/zh/reference/layout" },
            ],
          },
        ],
        outline: { label: "本页目录" },
        docFooter: { prev: "上一页", next: "下一页" },
      },
    },
  },
});
