// SPDX-License-Identifier: MIT
import { startWebGuiApplicationV1 } from "@sillymaker/web/gui-application";

import { resolveSillyOsCopyV1 } from "../content/copy.ts";
import {
  createBrowserProductPreferencesRepositoryV1,
  defaultBrowserProductPreferencesSnapshotV1,
} from "../product/browser-product-preferences-repository.ts";
import {
  applySillyOsDocumentPreferencesV1,
  resolveSillyOsColorSchemeV1,
} from "../product/browser-product-theme.ts";
import { sillyOsApplicationV1 } from "./application.tsx";

if (typeof document !== "undefined") {
  let preferences = defaultBrowserProductPreferencesSnapshotV1;
  try {
    preferences = createBrowserProductPreferencesRepositoryV1({
      storage: localStorage,
      eventTarget: window,
    }).getSnapshot();
  } catch {
    // Storage may be unavailable; system theme and navigator locale remain usable.
  }
  const copy = resolveSillyOsCopyV1(preferences.locale);
  applySillyOsDocumentPreferencesV1({
    document,
    locale: copy.locale,
    colorScheme: resolveSillyOsColorSchemeV1(
      preferences.theme,
      typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches,
    ),
  });
  await startWebGuiApplicationV1(sillyOsApplicationV1);
}
