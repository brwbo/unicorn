import { describe, expect, it } from "vitest";

import { defaultSentinelOut, isInside } from "./paths.ts";

describe("sentinel paths", () => {
  it("keeps Sentinel's files in the platform's state folder, outside the data dir", () => {
    expect(defaultSentinelOut("/Users/uni/.unicorn", "darwin", "/Users/uni", {})).toBe("/Users/uni/Library/Application Support/unicorn-sentinel");
    expect(defaultSentinelOut("/home/uni/.unicorn", "linux", "/home/uni", {})).toBe("/home/uni/.local/state/unicorn-sentinel");
    expect(defaultSentinelOut("/home/uni/.unicorn", "linux", "/home/uni", { XDG_STATE_HOME: "/var/state/uni" })).toBe("/var/state/uni/unicorn-sentinel");
    // a relative XDG_STATE_HOME is invalid by the spec and ignored
    expect(defaultSentinelOut("/home/uni/.unicorn", "linux", "/home/uni", { XDG_STATE_HOME: "state" })).toBe("/home/uni/.local/state/unicorn-sentinel");
    expect(defaultSentinelOut("C:\\Users\\uni\\.unicorn", "win32", "C:\\Users\\uni", { LOCALAPPDATA: "D:\\Local" })).toBe("D:\\Local\\unicorn-sentinel");
  });

  it("gives any other data dir its own subfolder, the same one every time", () => {
    const other = defaultSentinelOut("/srv/omb-data", "linux", "/home/uni", {});
    expect(other).toMatch(/^\/home\/uni\/\.local\/state\/unicorn-sentinel\/data-[0-9a-f]{12}$/);
    expect(defaultSentinelOut("/srv/omb-data", "linux", "/home/uni", {})).toBe(other);
    expect(defaultSentinelOut("/srv/omb-data-2", "linux", "/home/uni", {})).not.toBe(other);
  });

  it("knows when a folder is inside another", () => {
    expect(isInside("/d/omb/sentinel", "/d/omb", "linux")).toBe(true);
    expect(isInside("/d/omb", "/d/omb", "linux")).toBe(true);
    expect(isInside("/d/omb-sentinel", "/d/omb", "linux")).toBe(false);
    expect(isInside("/d", "/d/omb", "linux")).toBe(false);
    expect(isInside("C:\\d\\omb\\x", "C:\\d\\omb", "win32")).toBe(true);
  });
});
