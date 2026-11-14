import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import type { LocaleKey } from "@/locales";
import { FOUNDER_STAGES, type FounderStage } from "../../../shared/founder-playbooks";
import { PILL } from "./SignInPill";

export const STAGE_KEYS: Record<FounderStage, { title: LocaleKey; body: LocaleKey }> = {
  idea: { title: "onboarding.stage.idea.title", body: "onboarding.stage.idea.body" },
  building: { title: "onboarding.stage.building.title", body: "onboarding.stage.building.body" },
  seed: { title: "onboarding.stage.seed.title", body: "onboarding.stage.seed.body" },
  scaling: { title: "onboarding.stage.scaling.title", body: "onboarding.stage.scaling.body" },
};

/** The first run's stage question, between meeting the app and meeting the Chief of Staff: four cards, one chosen, then
 * Continue. Skip leaves the stage unset, so the Chief runs no founder playbook. Arrow keys move the choice, Escape skips. */
export function StageScreen({ initial, onChoose }: { initial?: FounderStage; onChoose: (stage: FounderStage | null) => void }) {
  const [picked, setPicked] = useState<FounderStage | null>(initial ?? null);
  const group = useRef<HTMLDivElement>(null);

  useEffect(() => {
    group.current?.querySelector<HTMLElement>("[role=radio][tabindex='0']")?.focus({ preventScroll: true });
  }, []);

  const move = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? FOUNDER_STAGES.length - 1 : 0;
    if (!step) return;
    event.preventDefault();
    const from = (event.target as HTMLElement).closest<HTMLElement>("[data-stage]")?.dataset.stage;
    const at = FOUNDER_STAGES.findIndex((stage) => stage === (from ?? picked));
    const next = FOUNDER_STAGES[(at + step) % FOUNDER_STAGES.length]!;
    setPicked(next);
    group.current?.querySelector<HTMLElement>(`[data-stage="${next}"]`)?.focus();
  };

  return (
    <div data-stage-screen="" className="mx-auto flex min-h-full w-full max-w-[600px] flex-col items-center justify-center gap-8 px-4 py-12 text-center">
      <h1 id="welcome-title" className="text-[28px] font-normal leading-[34px] tracking-[-0.02em] text-ink [text-wrap:balance]">{t("onboarding.stage.title")}</h1>
      <div ref={group} role="radiogroup" aria-labelledby="welcome-title" onKeyDown={move} className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {FOUNDER_STAGES.map((stage, index) => {
          const checked = picked === stage;
          return (
            <div
              key={stage}
              role="radio"
              aria-checked={checked}
              tabIndex={checked || (!picked && index === 0) ? 0 : -1}
              data-stage={stage}
              onClick={() => setPicked(stage)}
              onKeyDown={(event) => {
                if (event.key === " " || event.key === "Enter") {
                  event.preventDefault();
                  event.stopPropagation();
                  setPicked(stage);
                }
              }}
              className={cn(
                "flex min-h-[96px] cursor-pointer flex-col items-start gap-1 rounded-2xl border-[1.5px] bg-composer p-4 text-left transition-colors focus-visible:outline-offset-2",
                checked ? "border-ink" : "border-ink/10 hover:border-ink/30",
              )}
            >
              <span className="text-[15px] font-medium leading-5 text-ink">{t(STAGE_KEYS[stage].title)}</span>
              <span className="text-[13px] leading-[18px] text-ink-secondary">{t(STAGE_KEYS[stage].body)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex w-[288px] max-w-full flex-col items-center gap-3">
        <button type="button" data-primary="" data-stage-continue="" disabled={!picked} onClick={() => picked && onChoose(picked)} className={PILL}>
          {t("onboarding.stage.next")}
        </button>
        <button type="button" data-stage-skip="" onClick={() => onChoose(null)} className="rounded text-[13px] leading-[18px] text-ink-secondary transition-colors hover:text-ink">
          {t("onboarding.stage.skip")}
        </button>
      </div>
    </div>
  );
}
