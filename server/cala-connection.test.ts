import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CALA_KEY_ENV, CALA_MCP_URL, calaConnected, seedCalaServer } from "./cala-connection.ts";
import { isVaultItemId } from "./vault/mcp-keys.ts";
import { VaultStore } from "./vault-store.ts";

const FAKE_KEY = "cala-fake-key-for-tests-only";
let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "omb-cala-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

function setup(env: Record<string, string | undefined>, servers: Record<string, unknown> = {}, bots: Array<{ id: string; chiefOfStaff?: boolean; mcpServers?: string[] }> = []) {
  const state = { servers, bots, patched: [] as Array<[string, string[]]> };
  const vault = new VaultStore({ dataDir: dir });
  const result = seedCalaServer({
    env, vault,
    servers: () => state.servers,
    save: (next) => { state.servers = next; },
    bots: () => state.bots,
    setBotServers: (id, list) => { state.patched.push([id, list]); },
  });
  return { state, vault, result };
}

describe("seeding the cala MCP server", () => {
  it("does nothing without CALA_API_KEY, and the server reads as not connected", () => {
    const { state, result } = setup({});
    expect(result).toBe("no-key");
    expect(state.servers).toEqual({});
    expect(calaConnected(state.servers)).toBe(false);
    expect(setup({ [CALA_KEY_ENV]: "  " }).result).toBe("no-key");
  });

  it("registers an enabled HTTP server whose header points at the Vault, never at the key", () => {
    const { state, vault, result } = setup({ [CALA_KEY_ENV]: FAKE_KEY });
    expect(result).toBe("seeded");
    const server = state.servers.cala as { type: string; url: string; enabled: boolean; headers: Record<string, string> };
    expect(server).toMatchObject({ type: "http", url: CALA_MCP_URL, enabled: true });
    const pointer = server.headers["X-API-KEY"]!;
    expect(pointer).toMatch(/^vault:/);
    expect(isVaultItemId(pointer.slice("vault:".length))).toBe(true);
    expect(JSON.stringify(state.servers)).not.toContain(FAKE_KEY);
    expect(vault.mcpServerKeys("cala")).toEqual([pointer.slice("vault:".length)]);
    expect(vault.secret(pointer.slice("vault:".length))?.value).toBe(FAKE_KEY);
    expect(calaConnected(state.servers)).toBe(true);
  });

  it("keeps the key out of every file but the Vault's own", () => {
    setup({ [CALA_KEY_ENV]: FAKE_KEY });
    const plain = readdirSync(dir).filter((file) => !file.endsWith(".enc") && !file.includes("key")).map((file) => readFileSync(join(dir, file), "utf8"));
    expect(plain.join("")).not.toContain(FAKE_KEY);
  });

  it("leaves a server already named cala alone", () => {
    const mine = { type: "http", url: "https://example.test/mcp", headers: {}, enabled: true };
    const { state, result } = setup({ [CALA_KEY_ENV]: FAKE_KEY }, { cala: mine });
    expect(result).toBe("exists");
    expect(state.servers.cala).toEqual(mine);
  });

  it("adds cala to a Chief limited to a list of servers, and to no other bot", () => {
    const { state } = setup({ [CALA_KEY_ENV]: FAKE_KEY }, {}, [
      { id: "chief", chiefOfStaff: true, mcpServers: ["notes"] },
      { id: "all", chiefOfStaff: true },
      { id: "other", mcpServers: ["notes"] },
    ]);
    expect(state.patched).toEqual([["chief", ["notes", "cala"]]]);
  });

  it("reads a disabled server as not connected", () => {
    expect(calaConnected({ cala: { type: "http", url: CALA_MCP_URL, headers: {}, enabled: false } })).toBe(false);
  });
});
