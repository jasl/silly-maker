// SPDX-License-Identifier: MIT
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
    socialLinks: [{ icon: "github", link: "https://github.com/jasl/silly-maker" }],
  },
  locales: {
    root: {
      label: "English",
      lang: "en",
      themeConfig: {
        nav: [
          { text: "Guide", link: "/guide/getting-started" },
          { text: "Reference", link: "/reference/cli" },
          {
            text: "Play",
            items: [
              { text: "Cat Cafe (sim)", link: "/play/cat-cafe/", target: "_self" },
              { text: "SillyOS 98 (retro desktop)", link: "/play/silly-os/", target: "_self" },
            ],
          },
        ],
        sidebar: [
          {
            text: "Quick start",
            items: [
              { text: "Getting started with AI", link: "/guide/getting-started" },
              { text: "Examples", link: "/guide/examples" },
            ],
          },
          {
            text: "Introduction",
            items: [
              { text: "What the engine provides", link: "/guide/features" },
              { text: "Architecture", link: "/guide/architecture" },
              { text: "Core concepts", link: "/guide/concepts" },
            ],
          },
          {
            text: "Hands-on",
            items: [
              { text: "Manual setup", link: "/guide/manual-setup" },
              { text: "Your first Story", link: "/guide/first-story" },
              { text: "Tuning and debugging", link: "/guide/tuning" },
            ],
          },
          {
            text: "Reference",
            items: [
              { text: "Story CLI", link: "/reference/cli" },
              { text: "Repository layout", link: "/reference/layout" },
              { text: "Licenses and notices", link: "/reference/licenses" },
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
          {
            text: "试玩",
            items: [
              { text: "《雨巷猫舍》（养成经营）", link: "/play/cat-cafe/", target: "_self" },
              { text: "SillyOS 98（复古桌面）", link: "/play/silly-os/", target: "_self" },
            ],
          },
        ],
        sidebar: [
          {
            text: "快速开始",
            items: [
              { text: "用 AI 快速开始", link: "/zh/guide/getting-started" },
              { text: "示例", link: "/zh/guide/examples" },
            ],
          },
          {
            text: "介绍",
            items: [
              { text: "引擎提供什么", link: "/zh/guide/features" },
              { text: "架构", link: "/zh/guide/architecture" },
              { text: "核心概念", link: "/zh/guide/concepts" },
            ],
          },
          {
            text: "动手指南",
            items: [
              { text: "手动路径", link: "/zh/guide/manual-setup" },
              { text: "第一个 Story", link: "/zh/guide/first-story" },
              { text: "调参与调试", link: "/zh/guide/tuning" },
            ],
          },
          {
            text: "参考",
            items: [
              { text: "Story CLI", link: "/zh/reference/cli" },
              { text: "仓库结构", link: "/zh/reference/layout" },
              { text: "许可证与第三方声明", link: "/zh/reference/licenses" },
            ],
          },
        ],
        outline: { label: "本页目录" },
        docFooter: { prev: "上一页", next: "下一页" },
      },
    },
  },
});
