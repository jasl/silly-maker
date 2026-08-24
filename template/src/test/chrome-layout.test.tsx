// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import type { DeepReadonly } from "@sillymaker/base";
import { parseChromeLayoutDocument } from "@sillymaker/base/story";

import { templateHudBoxNameV1, templateHudChromeLayoutV1 } from "../chrome/index.ts";
import { TemplateHudV1 } from "../application/ui.tsx";
import type { TemplateUiPublicationV1 } from "../application/composition.tsx";
import type { TemplateApplicationInstanceV1 } from "../application/core-definition.ts";

afterEach(cleanup);

const hudPublicationV1 = ({
  view: { coins: 2 },
  semantic: {
    narrative: { phase: "running" },
    actions: [
      { actionId: "template.earn_coin", enabled: true },
    ],
  },
}) as unknown as DeepReadonly<TemplateUiPublicationV1>;

const hudSemanticV1 = ({
  dispatch: () => Promise.reject(new Error("template.test_semantic_stub")),
}) as unknown as TemplateApplicationInstanceV1["semantic"];

it("ships an admissible HUD chrome-layout document with the required box", () => {
  // Importing the module already ran admission; pin the public contract.
  expect(templateHudChromeLayoutV1.layoutId).toBe("layout.template.hud");
  expect(templateHudChromeLayoutV1.canvas).toEqual({ width: 1600, height: 900 });
  expect(templateHudChromeLayoutV1.boxes[templateHudBoxNameV1]).toBeDefined();
});

it("positions the HUD strip from the document and follows a draft override", () => {
  const { container, rerender } = render(
    <TemplateHudV1 publication={hudPublicationV1} semantic={hudSemanticV1} />,
  );
  const hud = container.querySelector("[data-template-hud]") as HTMLElement;
  const shipped = templateHudChromeLayoutV1.boxes[templateHudBoxNameV1];
  expect(hud.style.insetInlineStart).toBe(`${String(shipped?.x ?? -1)}px`);
  expect(hud.style.inlineSize).toBe(`${String(shipped?.width ?? -1)}px`);

  // The Studio chrome fixture passes its live draft: geometry follows.
  const draft = parseChromeLayoutDocument({
    format: "sillymaker.chrome-layout",
    version: 1,
    layoutId: "layout.template.hud",
    label: "草稿",
    canvas: { width: 1600, height: 900 },
    boxes: { [templateHudBoxNameV1]: { x: 300, y: 40, width: 500, height: 64 } },
    anchors: {},
    offsets: {},
  });
  rerender(
    <TemplateHudV1 publication={hudPublicationV1} semantic={hudSemanticV1} layout={draft} />,
  );
  const moved = container.querySelector("[data-template-hud]") as HTMLElement;
  expect(moved.style.insetInlineStart).toBe("300px");
  expect(moved.style.insetBlockStart).toBe("40px");

  // A draft missing the strip's box hides it instead of crashing the
  // fixture (the author sees the honest result while renaming).
  const withoutBox = parseChromeLayoutDocument({
    format: "sillymaker.chrome-layout",
    version: 1,
    layoutId: "layout.template.hud",
    label: "无盒草稿",
    canvas: { width: 1600, height: 900 },
    boxes: {},
    anchors: {},
    offsets: {},
  });
  rerender(
    <TemplateHudV1 publication={hudPublicationV1} semantic={hudSemanticV1} layout={withoutBox} />,
  );
  expect(container.querySelector("[data-template-hud]")).toBeNull();
});
