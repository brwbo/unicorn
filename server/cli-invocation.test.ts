import { describe, expect, it } from "vitest";

import { cliCommand, cliPrefix } from "./cli-invocation.ts";

describe("cliPrefix", () => {
  it("prints commands the way the CLI was started", () => {
    expect(cliPrefix({}, "/home/me/.npm/_npx/1a2b/node_modules/unicorn/dist-server/unicorn.js")).toBe("npx unicorn");
    expect(cliPrefix({ npm_command: "exec" }, "/repo/node_modules/vitest/vitest.mjs"), "another tool run by npx").toBe("unicorn");
    expect(cliPrefix({ npm_lifecycle_event: "omb" }, "/repo/server/unicorn.ts")).toBe("pnpm omb");
    expect(cliPrefix({ OMB_CLI_PREFIX: "docker compose exec omb unicorn" }, "/app/dist-server/unicorn.js")).toBe("docker compose exec omb unicorn");
    expect(cliPrefix({}, "/usr/lib/node_modules/unicorn/dist-server/unicorn.js")).toBe("unicorn");
    expect(cliCommand("pair", {}, "C:\\Users\\me\\AppData\\Local\\npm-cache\\_npx\\9\\node_modules\\unicorn\\x.js")).toBe("npx unicorn pair");
  });
});
