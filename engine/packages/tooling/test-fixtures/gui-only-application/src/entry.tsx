// SPDX-License-Identifier: MIT
import {
  startWebGuiApplicationV1,
  type WebGuiApplicationV1,
} from "@sillymaker/web/gui-application";
import { useState } from "react";

let markRequiredDomainReadyV1!: () => void;
const requiredDomainReadyV1 = new Promise<void>((resolve) => {
  markRequiredDomainReadyV1 = resolve;
});

function GuiOnlyConformanceV1() {
  const [connected, setConnected] = useState(false);
  return (
    <main aria-label="GUI-only conformance">
      <p role="status">
        {connected ? "Required service ready" : "Required service unavailable"}
      </p>
      <button
        disabled={connected}
        type="button"
        onClick={() => {
          setConnected(true);
          markRequiredDomainReadyV1();
        }}
      >
        Retry connection
      </button>
    </main>
  );
}

const applicationV1: WebGuiApplicationV1 = {
  applicationId: "conformance-gui-only",
  viewport: {
    canvas: { width: 480, height: 272 },
    mode: "fluid",
    fallbackSize: { width: 480, height: 272 },
  },
  ui: () => ({
    content: <GuiOnlyConformanceV1 />,
    requiredDomainReady: requiredDomainReadyV1,
  }),
};

if (typeof document !== "undefined") {
  await startWebGuiApplicationV1(applicationV1);
}
