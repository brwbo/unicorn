import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { t } from "./i18n";
import { CHROME_GRADIENT, colorSwatch, UNI_COLOR_LABEL, UNI_COLOR_NAMES, UNI_COLORS, stateForBot } from "./mascot";

describe("stateForBot", () => {
  it("still alerts on a failed tool call when a digest receipt follows it", () => {
    expect(stateForBot({
      name: "Atlas",
      messages: [
        { kind: "activity", tool: { ok: false } },
        { kind: "digest" },
      ],
    })).toBe("alerting");
  });

  it("keeps reading a pending card as curious behind a receipt", () => {
    expect(stateForBot({ name: "Atlas", messages: [{ kind: "options" }, { kind: "digest" }] })).toBe("curious");
  });

  it("still alerts on a failed tool call when a live call's record follows it", () => {
    expect(stateForBot({
      name: "Atlas",
      messages: [
        { kind: "activity", tool: { ok: false } },
        { kind: "call" },
      ],
    })).toBe("alerting");
    expect(stateForBot({
      name: "Atlas",
      messages: [
        { kind: "activity", tool: { ok: false } },
        { kind: "digest" },
        { kind: "call" },
      ],
    })).toBe("alerting");
  });

  it("keeps reading a pending card as curious behind a live call's record", () => {
    expect(stateForBot({ name: "Atlas", messages: [{ kind: "options" }, { kind: "call" }] })).toBe("curious");
  });
});

describe("silver", () => {
  it("is a colour every picker offers, drawn at #A8ADB4 and named Silver", () => {
    expect(UNI_COLOR_NAMES).toContain("silver");
    expect(UNI_COLORS.silver).toBe("#A8ADB4");
    expect(t(UNI_COLOR_LABEL.silver)).toBe("Silver");
  });
});

describe("chrome", () => {
  it("is a colour every picker offers, named Chrome, whose swatch is smooth polished steel", () => {
    expect(UNI_COLOR_NAMES).toContain("chrome");
    expect(t(UNI_COLOR_LABEL.chrome)).toBe("Chrome");
    const swatch = colorSwatch("chrome");
    expect(swatch.startsWith("radial-gradient(")).toBe(true);
    expect(swatch).not.toContain("repeating");
    for (const tone of CHROME_GRADIENT) expect(swatch).toContain(tone);
    expect(colorSwatch("blue")).toBe(UNI_COLORS.blue);
  });
});

describe("the lent computer's menu dots", () => {
  it("use the mascot colours, so a bot's dot there matches its mascot", () => {
    const table = /BOT_COLOR_HEX = Object\.freeze\(\{([^}]+)\}\)/.exec(readFileSync(new URL("../../electron/color-dot.mjs", import.meta.url), "utf8"))?.[1] ?? "";
    expect(Object.fromEntries([...table.matchAll(/(\w+): "(#[0-9A-F]{6})"/gi)].map(([, name, hex]) => [name, hex]))).toEqual(UNI_COLORS);
  });
});
