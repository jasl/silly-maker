// SPDX-License-Identifier: MIT
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import process from "node:process";

const siteBase = process.env.SITE_BASE ?? "/";
const siteOrigin = process.env.SITE_ORIGIN;

export default defineConfig({
  base: siteBase,
  devToolbar: {
    enabled: false,
  },
  site: siteOrigin === undefined || siteOrigin === "" ? undefined : siteOrigin,
  integrations: [
    starlight({
      title: "SillyMaker",
      description:
        "A React and TypeScript engine for GUI applications and games, designed for people and coding agents.",
      locales: {
        root: { label: "English", lang: "en" },
        zh: { label: "简体中文", lang: "zh-CN" },
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/jasl/silly-maker",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/jasl/silly-maker/edit/main/website/",
      },
      components: {
        Header: "./src/components/SiteHeader.astro",
        Hero: "./src/components/SiteHero.astro",
        Footer: "./src/components/SiteFooter.astro",
        ThemeSelect: "./src/components/SiteThemeToggle.astro",
        LanguageSelect: "./src/components/SiteLanguageLinks.astro",
        MobileMenuFooter: "./src/components/SiteMobileMenuFooter.astro",
      },
      customCss: [
        "./src/styles/tokens.css",
        "./src/styles/shell.css",
        "./src/styles/landing.css",
      ],
      sidebar: [
        {
          label: "Start",
          translations: { "zh-CN": "开始" },
          items: [
            { slug: "start" },
            { slug: "start/manual" },
            { slug: "start/project-structure" },
          ],
        },
        {
          label: "Concepts",
          translations: { "zh-CN": "核心概念" },
          items: [
            { slug: "concepts" },
            { slug: "concepts/application-model" },
            { slug: "concepts/state-and-sessions" },
            { slug: "concepts/presentation" },
            { slug: "concepts/content-and-localization" },
          ],
        },
        {
          label: "Guides",
          translations: { "zh-CN": "指南" },
          items: [
            { slug: "guides/gui-application" },
            { slug: "guides/game-application" },
            { slug: "guides/layout-and-input" },
            { slug: "guides/state-save-replay" },
            { slug: "guides/localization" },
            { slug: "guides/inspect-and-debug" },
            { slug: "guides/build-and-publish" },
          ],
        },
        {
          label: "Examples",
          translations: { "zh-CN": "完整示例" },
          items: [
            { slug: "examples" },
            { slug: "examples/cat-cafe" },
            { slug: "examples/silly-os" },
            { slug: "examples/bookshop" },
          ],
        },
        {
          label: "Reference",
          translations: { "zh-CN": "参考" },
          items: [
            { slug: "reference/commands" },
            { slug: "reference/project-config" },
            { slug: "reference/packages" },
            { slug: "reference/formats" },
            { slug: "reference/licenses" },
          ],
        },
      ],
      pagefind: true,
      lastUpdated: false,
    }),
    react(),
  ],
});
