import { describe, expect, it } from "vitest";
import { calaReplyIds, extractSources } from "./message-sources";

describe("extractSources", () => {
  it("lists each external link once with host and retrieved date", () => {
    const text = [
      "| Creditsafe | credit data | [Creditsafe](https://www.creditsafe.com/uk) retrieved 2026-11-14 |",
      "See [Creditsafe again](https://www.creditsafe.com/uk) and [Gazette](https://www.thegazette.co.uk/insolvency).",
    ].join("\n");
    const out = extractSources(text);
    expect(out.map((s) => s.host)).toEqual(["creditsafe.com", "thegazette.co.uk"]);
    expect(out[0]!.retrieved).toBe("2026-11-14");
  });

  it("carries a section date down to links on later lines", () => {
    const text = "*Sourced via cala, retrieved 2026-11-14.*\n- [One](https://one.example.com/a)\n- [Two](https://two.example.com/b)";
    expect(extractSources(text).map((x) => x.retrieved)).toEqual(["2026-11-14", "2026-11-14"]);
  });

  it("ignores local links and plain text", () => {
    expect(extractSources("[app](http://127.0.0.1:5231/x) and https://example.com")).toEqual([]);
  });
});

describe("calaReplyIds", () => {
  const user = { id: "u", role: "user", kind: "text" };
  const cala = { id: "t", role: "bot", kind: "activity", tool: { name: "mcp__cala__knowledge_search" } };
  const other = { id: "o", role: "bot", kind: "activity", tool: { name: "WebSearch" } };
  const reply = (id: string) => ({ id, role: "bot", kind: "text" });

  it("marks replies that follow a Cala tool call in the same turn", () => {
    expect([...calaReplyIds([user, cala, reply("r1")])]).toEqual(["r1"]);
  });

  it("does not carry across a new person message or other tools", () => {
    expect(calaReplyIds([user, other, reply("r1")]).size).toBe(0);
    expect([...calaReplyIds([user, cala, reply("r1"), { ...user, id: "u2" }, reply("r2")])]).toEqual(["r1"]);
  });
});
