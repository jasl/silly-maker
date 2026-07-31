// SPDX-License-Identifier: MIT
// Browser slice · UI: a built-in homepage + a real iframe. Reality is presented as-is:
// most sites refuse embedding via X-Frame-Options / CSP frame-ancestors (cross-origin
// blocking has no reliable error event, so we can only note it, not detect it); the
// default homepage is local content, plus one embed-friendly engine-docs link. The iframe is sandboxed.
import { useState } from "react";
import type { ReactElement } from "react";

import { os98, osBevelInV1 } from "../../application/ui-kit.ts";

const docsUrl = "https://silly-maker.pages.dev/";

function HomePageV1(props: {
  readonly uiText: (textId: string) => string;
  onNavigate(url: string): void;
}): ReactElement {
  const { uiText } = props;
  return (
    <div
      style={{
        padding: "16px",
        background: "#ffffff",
        color: "#000000",
        overflowY: "auto",
        font: os98.font,
      }}
    >
      <h2 style={{ margin: "0 0 8px", fontSize: "16px", color: "#000080" }}>
        {uiText("text.os.browser.home.title")}
      </h2>
      <p style={{ margin: "0 0 12px", fontSize: "12px", lineHeight: 1.7 }}>
        {uiText("text.os.browser.home.body")}
      </p>
      <p style={{ margin: "0 0 12px", fontSize: "12px" }}>
        <a
          href={docsUrl}
          data-os-browser-docs="true"
          onClick={(event) => {
            event.preventDefault();
            props.onNavigate(docsUrl);
          }}
          style={{ color: "#0000ee" }}
        >
          {uiText("text.os.browser.home.docs")}
        </a>
      </p>
      <p style={{ margin: 0, fontSize: "11px", color: "#606060", lineHeight: 1.7 }}>
        {uiText("text.os.browser.blocked")}
      </p>
    </div>
  );
}

export function OsBrowserAppV1(props: {
  readonly uiText: (textId: string) => string;
}): ReactElement {
  const { uiText } = props;
  const [address, setAddress] = useState("about:home");
  const [location, setLocation] = useState("about:home");

  const navigate = (raw: string): void => {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed === "about:home") {
      setAddress("about:home");
      setLocation("about:home");
      return;
    }
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    setAddress(url);
    setLocation(url);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr",
        gap: "4px",
        padding: "4px",
        minBlockSize: 0,
      }}
    >
      <form
        style={{ display: "flex", gap: "4px", alignItems: "center", font: os98.font }}
        onSubmit={(event) => {
          event.preventDefault();
          navigate(address);
        }}
      >
        <span>{uiText("text.os.browser.address")}</span>
        <input
          type="text"
          className="os-input"
          data-os-browser-address="true"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          style={{ flex: 1, padding: "2px 4px" }}
        />
        <button
          type="submit"
          className="os-button"
          data-os-browser-go="true"
          style={{ padding: "2px 10px" }}
        >
          {uiText("text.os.browser.go")}
        </button>
      </form>
      <div
        style={{ ...osBevelInV1, padding: 0, display: "grid", minBlockSize: 0, overflow: "hidden" }}
      >
        {location === "about:home" ? <HomePageV1 uiText={uiText} onNavigate={navigate} /> : (
          <iframe
            key={location}
            src={location}
            title={location}
            data-os-browser-frame="true"
            sandbox="allow-scripts allow-popups allow-forms"
            referrerPolicy="no-referrer"
            style={{ border: "none", inlineSize: "100%", blockSize: "100%", background: "#ffffff" }}
          />
        )}
      </div>
    </div>
  );
}
