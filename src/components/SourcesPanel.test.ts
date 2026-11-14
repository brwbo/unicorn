import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SourcesPanel } from "./SourcesPanel";

describe("SourcesPanel", () => {
  it("renders a numbered list of external sources", () => {
    const html = renderToStaticMarkup(createElement(SourcesPanel, { text: "[A](https://a.example.com/x) 2026-11-14 and [B](https://b.example.org/y)" }));
    expect(html).toContain("data-sources-panel");
    expect(html).toContain("a.example.com");
    expect(html).toContain("2026-11-14");
    expect(html).toContain("b.example.org");
  });

  it("renders nothing for fewer than two sources", () => {
    expect(renderToStaticMarkup(createElement(SourcesPanel, { text: "[A](https://a.example.com/x)" }))).toBe("");
  });

  it("opens by default and says Cala only when the reply used a Cala tool", () => {
    const text = "[A](https://a.example.com/x) and [B](https://b.example.org/y)";
    const plain = renderToStaticMarkup(createElement(SourcesPanel, { text }));
    expect(plain).toMatch(/<details[^>]* open/);
    expect(plain).not.toContain("from Cala");
    expect(renderToStaticMarkup(createElement(SourcesPanel, { text, viaCala: true }))).toContain("from Cala");
  });
});
