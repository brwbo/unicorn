import { memo, useMemo } from "react";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { t } from "@/lib/i18n";
import { extractSources, MIN_SOURCES } from "@/lib/message-sources";

export const SourcesPanel = memo(function SourcesPanel({ text, viaCala = false }: { text: string; viaCala?: boolean }) {
  const sources = useMemo(() => extractSources(text), [text]);
  if (sources.length < MIN_SOURCES) return null;
  return (
    <details data-sources-panel open className="group/src mt-2 rounded-lg border border-hairline bg-card text-[13px]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-ink-secondary hover:text-ink">
        <ShieldCheck className="size-4 text-accent-text" aria-hidden />
        <span className="font-medium">{t("chat.sources")}</span>
        <span className="tabular-nums text-ink-tertiary">{sources.length}</span>
        {viaCala ? <span className="ml-auto text-ink-tertiary">{t("chat.sourcesVerified")}</span> : null}
      </summary>
      <ol className="divide-y divide-hairline border-t border-hairline">
        {sources.map((s, i) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 px-3 py-2 hover:bg-raised-hover">
              <span className="w-5 shrink-0 tabular-nums text-ink-tertiary">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink">{s.title}</span>
                <span className="block truncate text-ink-tertiary">{s.host}{s.retrieved ? ` · ${s.retrieved}` : ""}</span>
              </span>
              <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-ink-tertiary" aria-hidden />
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
});
