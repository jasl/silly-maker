// SPDX-License-Identifier: MIT
// 主题扩展：默认主题 + 首页 hero 的“试玩”下拉（home-hero-actions-after 槽）。
import { h } from "vue";
import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";

import PlayMenu from "./PlayMenu.vue";

const theme: Theme = {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      "home-hero-actions-after": () => h(PlayMenu),
    }),
};

export default theme;
