export interface MessageSource {
  url: string;
  title: string;
  host: string;
  retrieved?: string;
}

const LINK = /\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)/g;
const DATE = /(\d{4}-\d{2}-\d{2})/;

export function extractSources(text: string): MessageSource[] {
  const seen = new Map<string, MessageSource>();
  let carried: string | undefined;
  for (const line of text.split("\n")) {
    const own = DATE.exec(line)?.[1];
    if (own) carried = own;
    const date = own ?? carried;
    for (const m of line.matchAll(LINK)) {
      let url: URL;
      try {
        url = new URL(m[2]!);
      } catch {
        continue;
      }
      if (/^(localhost|127\.|\[::1\])/.test(url.hostname)) continue;
      const key = url.href;
      const host = url.hostname.replace(/^www\./, "");
      const title = m[1]!.trim();
      const prior = seen.get(key);
      if (prior) {
        if (!prior.retrieved && date) prior.retrieved = date;
        continue;
      }
      seen.set(key, { url: key, title: title === m[2] ? host : title, host, retrieved: date });
    }
  }
  return [...seen.values()];
}

export const MIN_SOURCES = 2;

const CALA_TOOL = /(^|__)cala(__|$)|^(knowledge_search|knowledge_query|entity_search|entity_lookup|entity_introspection|retrieve_entity)$/i;

interface TurnRow {
  id: string;
  role: string;
  kind?: string;
  tool?: { name?: string } | null;
}

/** Ids of bot replies whose turn (everything since the person's last message) called a Cala tool, so only those say "from Cala". */
export function calaReplyIds(messages: readonly TurnRow[]): Set<string> {
  const ids = new Set<string>();
  let used = false;
  for (const m of messages) {
    if (m.role === "user") used = false;
    else if (m.kind === "activity" && m.tool?.name && CALA_TOOL.test(m.tool.name)) used = true;
    else if (m.kind === "text" && used) ids.add(m.id);
  }
  return ids;
}
