// SPDX-License-Identifier: MIT
(function bootstrapSillyOsThemeV1() {
  "use strict";

  var mode = "system";
  try {
    var serialized = localStorage.getItem("sillymaker.example-silly-os.product-preferences.v1");
    if (serialized !== null && new TextEncoder().encode(serialized).byteLength <= 512) {
      var stored = JSON.parse(serialized);
      if (
        stored !== null &&
        typeof stored === "object" &&
        !Array.isArray(stored) &&
        Object.keys(stored).length === 3 &&
        Object.hasOwn(stored, "revision") &&
        Object.hasOwn(stored, "locale") &&
        Object.hasOwn(stored, "theme") &&
        stored.revision === 1 &&
        (stored.locale === null || stored.locale === "en" || stored.locale === "zh-CN") &&
        (stored.theme === "system" || stored.theme === "light" || stored.theme === "dark")
      ) {
        mode = stored.theme;
      }
    }
  } catch {
    // Storage may be unavailable. The OS preference remains the truthful fallback.
  }

  var colorScheme = mode === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : mode;
  document.documentElement.dataset.sillyOsColorScheme = colorScheme;
  document.documentElement.style.colorScheme = colorScheme;
  var themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor !== null) {
    themeColor.content = colorScheme === "dark" ? "#101210" : "#f6f6f4";
  }
})();
