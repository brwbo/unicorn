import type { LocaleKey } from "@/locales";
import type { FounderStage } from "../../shared/founder-playbooks";

export const FOUNDER_LEAD_KEYS: Record<FounderStage, LocaleKey> = {
  idea: "helperIntro.founder.idea",
  building: "helperIntro.founder.building",
  seed: "helperIntro.founder.seed",
  scaling: "helperIntro.founder.scaling",
};
