// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  accessibleApplicationBootShellHtmlV1,
  applicationBootstrapElementIdV1,
  applicationBootstrapJsonHtmlV1,
} from "./application-bootstrap-html.mts";

describe("application bootstrap HTML", () => {
  it("renders one inert canonical config block", () => {
    const html = applicationBootstrapJsonHtmlV1({
      revision: 1,
      entry: "runtime",
      target: "browser",
    });

    expect(html).toBe(
      `<script id="${applicationBootstrapElementIdV1}" type="application/json" data-sillymaker-bootstrap-config="v1">{"revision":1,"entry":"runtime","target":"browser"}</script>`,
    );
    expect(html).not.toContain("globalThis");
    expect(html).not.toContain('type="module"');
  });

  it("renders an accessible static shell inside the future mount container", () => {
    const html = accessibleApplicationBootShellHtmlV1({
      containerId: "sillymaker-inspector-root",
      accessibleName: 'Studio "Author"',
      statusText: "正在启动 <Studio>",
      bootstrap: { revision: 1, entry: "author", target: "browser" },
    });

    expect(html).toContain('<div id="sillymaker-inspector-root">');
    expect(html).toContain(
      'role="status" aria-live="polite" aria-busy="true" aria-label="Studio &quot;Author&quot;"',
    );
    expect(html).toContain("正在启动 &lt;Studio&gt;");
    expect(html).toContain(
      '{"revision":1,"entry":"author","target":"browser"}',
    );
    expect(html.indexOf('data-sillymaker-boot-shell="pending"')).toBeLessThan(
      html.indexOf(`id="${applicationBootstrapElementIdV1}"`),
    );
  });
});
