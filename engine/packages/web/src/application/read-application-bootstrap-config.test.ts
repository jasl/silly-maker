// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it } from "vitest";

import {
  type ApplicationBootstrapConfigReadFailureInternalV1,
  readApplicationBootstrapConfigFromDocumentInternalV1,
} from "./read-application-bootstrap-config.ts";

const elementIdV1 = "sillymaker-application-bootstrap";
const dataAttributeV1 = "data-sillymaker-bootstrap-config";

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

function appendBootstrapScriptV1(
  text: string,
  attributes: Readonly<Record<string, string | undefined>> = {},
): HTMLScriptElement {
  const source = document.createElement("script");
  source.id = elementIdV1;
  source.type = "application/json";
  source.setAttribute(dataAttributeV1, "v1");
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined) source.removeAttribute(name);
    else source.setAttribute(name, value);
  }
  source.textContent = text;
  document.head.append(source);
  return source;
}

function expectReadFailureV1(
  expectedCode: ApplicationBootstrapConfigReadFailureInternalV1["code"],
  requiredEntry: "runtime" | "author" = "runtime",
): void {
  try {
    readApplicationBootstrapConfigFromDocumentInternalV1(document, requiredEntry);
    throw new Error("expected bootstrap config read to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(TypeError);
    expect(error).toMatchObject({
      name: "ApplicationBootstrapConfigReadFailureInternalV1",
      code: expectedCode,
      message: expectedCode,
    });
  }
}

describe("readApplicationBootstrapConfigFromDocumentInternalV1", () => {
  it.each(
    [
      ["runtime", "browser"],
      ["runtime", "deno_desktop"],
      ["author", "browser"],
      ["author", "deno_desktop"],
    ] as const,
  )("admits and freezes an inert %s/%s receipt", (entry, target) => {
    appendBootstrapScriptV1(JSON.stringify({ revision: 1, entry, target }));

    const config = readApplicationBootstrapConfigFromDocumentInternalV1(document, entry);

    expect(config).toEqual({ revision: 1, entry, target });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("rejects a missing reserved source", () => {
    expectReadFailureV1("web.application_bootstrap.missing_source");
  });

  it.each(["id", "data marker"] as const)(
    "rejects duplicate sources reserved by %s instead of choosing DOM order",
    (reservedBy) => {
      appendBootstrapScriptV1('{"revision":1,"entry":"runtime","target":"browser"}');
      const duplicate = document.createElement("script");
      duplicate.type = "application/json";
      duplicate.textContent = '{"revision":1,"entry":"runtime","target":"browser"}';
      if (reservedBy === "id") duplicate.id = elementIdV1;
      else duplicate.setAttribute(dataAttributeV1, "v1");
      document.body.append(duplicate);

      expectReadFailureV1("web.application_bootstrap.duplicate_source");
    },
  );

  it.each(
    [
      ["HTML div", () => document.createElement("div")],
      ["SVG script", () => document.createElementNS("http://www.w3.org/2000/svg", "script")],
    ] as const,
  )("rejects a reserved %s element", (_label, createElement) => {
    const source = createElement();
    source.id = elementIdV1;
    source.setAttribute(dataAttributeV1, "v1");
    document.body.append(source);

    expectReadFailureV1("web.application_bootstrap.invalid_element");
  });

  it("rejects a marker-only script with the wrong reserved id", () => {
    appendBootstrapScriptV1('{"revision":1,"entry":"runtime","target":"browser"}', {
      id: "application-bootstrap-copy",
    });

    expectReadFailureV1("web.application_bootstrap.invalid_id");
  });

  it.each([undefined, "text/javascript", "Application/JSON"])(
    "rejects the non-canonical media type %j",
    (type) => {
      appendBootstrapScriptV1("", { type });

      expectReadFailureV1("web.application_bootstrap.invalid_type");
    },
  );

  it.each([undefined, "v2", "V1"])("rejects the unsupported marker version %j", (version) => {
    appendBootstrapScriptV1('{"revision":1,"entry":"runtime","target":"browser"}', {
      [dataAttributeV1]: version,
    });

    expectReadFailureV1("web.application_bootstrap.invalid_version");
  });

  it.each(["", "/bootstrap.json"])("rejects an external source attribute %j", (src) => {
    appendBootstrapScriptV1('{"revision":1,"entry":"runtime","target":"browser"}', { src });

    expectReadFailureV1("web.application_bootstrap.external_source");
  });

  it("bounds the UTF-8 source before parsing it", () => {
    appendBootstrapScriptV1("界".repeat(1_366));

    expectReadFailureV1("web.application_bootstrap.source_too_large");
  });

  it.each([
    "",
    "not-json",
    '{"revision":1,"entry":"runtime","target":"browser",}',
    '{"revision":1,"entry":"runtime","entry":"runtime","target":"browser"}',
  ])("rejects malformed or ambiguous JSON without exposing parser diagnostics: %j", (text) => {
    appendBootstrapScriptV1(text);

    expectReadFailureV1("web.application_bootstrap.malformed_json");
  });

  it("delegates exact config-field admission to Base", () => {
    appendBootstrapScriptV1(
      '{"revision":1,"entry":"runtime","target":"browser","extra":"rejected"}',
    );

    expect(() => readApplicationBootstrapConfigFromDocumentInternalV1(document, "runtime")).toThrow(
      "application_bootstrap.invalid_fields",
    );
  });

  it.each(
    [
      ["runtime", "author"],
      ["author", "runtime"],
    ] as const,
  )("rejects an admitted %s receipt when the caller requires %s", (entry, required) => {
    appendBootstrapScriptV1(JSON.stringify({ revision: 1, entry, target: "browser" }));

    expectReadFailureV1("web.application_bootstrap.entry_mismatch", required);
  });

  it("reads script text as inert data and never evaluates embedded markup", () => {
    const marker = "__smBootEval";
    Reflect.deleteProperty(globalThis, marker);
    appendBootstrapScriptV1(
      JSON.stringify({
        revision: 1,
        entry: "runtime",
        target: "browser",
        markup: `</script><script>globalThis.${marker}=true</script>`,
      }),
    );

    expect(() => readApplicationBootstrapConfigFromDocumentInternalV1(document, "runtime")).toThrow(
      "application_bootstrap.invalid_fields",
    );
    expect(Reflect.get(globalThis, marker)).toBeUndefined();
    expect(document.scripts).toHaveLength(1);
  });
});
