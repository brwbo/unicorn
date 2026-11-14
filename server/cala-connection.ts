import { CALA_SERVER_NAME } from "../shared/founder-playbooks.ts";
import { parseStoredMcpServer } from "./mcp-registry.ts";
import type { VaultStore } from "./vault-store.ts";
import { vaultPointer } from "./vault/mcp-keys.ts";

export const CALA_MCP_URL = "https://api.cala.ai/mcp/";
export const CALA_KEY_ENV = "CALA_API_KEY";
const CALA_KEY_HEADER = "X-API-KEY";

export interface CalaSeedDeps {
  env: Readonly<Record<string, string | undefined>>;
  vault: Pick<VaultStore, "saveSecret" | "grantMcpKeys">;
  servers(): Record<string, unknown> | undefined;
  save(next: Record<string, unknown>): void;
  bots(): ReadonlyArray<{ id: string; chiefOfStaff?: boolean; mcpServers?: string[] }>;
  setBotServers(botId: string, servers: string[]): void;
}

export type CalaSeedResult = "no-key" | "seeded" | "exists";

/** Whether the cala MCP server is saved and on, so the Chief can say whether it can research. */
export function calaConnected(servers: Record<string, unknown> | undefined): boolean {
  const raw = servers?.[CALA_SERVER_NAME];
  if (raw === undefined) return false;
  const parsed = parseStoredMcpServer(CALA_SERVER_NAME, raw);
  return parsed.ok && parsed.server.enabled;
}

/** With CALA_API_KEY in the environment, saves the key in the Vault and registers the cala MCP server pointing at it, unless
 * a server of that name already exists. The key is never written to config.json, logged or returned. A Chief limited to a
 * list of MCP servers gets cala added to that list, since the bots it creates start from its list. */
export function seedCalaServer(deps: CalaSeedDeps): CalaSeedResult {
  const key = deps.env[CALA_KEY_ENV]?.trim();
  if (!key) return "no-key";
  const current = deps.servers() ?? {};
  let result: CalaSeedResult = "exists";
  if (current[CALA_SERVER_NAME] === undefined) {
    const item = deps.vault.saveSecret({ name: CALA_KEY_ENV, value: key, source: "settings", bots: "all", refOnly: true });
    deps.vault.grantMcpKeys(CALA_SERVER_NAME, [item.id]);
    deps.save({
      ...current,
      [CALA_SERVER_NAME]: { type: "http", url: CALA_MCP_URL, headers: { [CALA_KEY_HEADER]: vaultPointer(item.id) }, enabled: true },
    });
    result = "seeded";
  }
  for (const bot of deps.bots()) {
    if (bot.chiefOfStaff && bot.mcpServers && !bot.mcpServers.includes(CALA_SERVER_NAME)) {
      deps.setBotServers(bot.id, [...bot.mcpServers, CALA_SERVER_NAME]);
    }
  }
  return result;
}
