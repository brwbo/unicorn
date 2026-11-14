import { useState } from "react";
import { Select } from "./Select";
import { SettingsField } from "./SettingsPrimitives";
import { STAGE_KEYS } from "./onboarding/StageScreen";
import { t } from "@/lib/i18n";
import { api, useStore } from "@/state/store";
import { FOUNDER_STAGES, isFounderStage } from "../../shared/founder-playbooks";

/** Where the business stands, chosen in the first run: the Chief of Staff follows the matching founder playbook. */
export function StageSettings() {
  const { state, dispatch } = useStore();
  const saved = state.config?.profile?.founderStage ?? "";
  const [failed, setFailed] = useState(false);

  const choose = async (value: string) => {
    const stage = isFounderStage(value) ? value : null;
    setFailed(false);
    try {
      await api("/api/config", { method: "PUT", body: JSON.stringify({ profile: { founderStage: stage } }), timeoutMs: 10_000 });
      dispatch({ type: "profileSaved", profile: { founderStage: stage ?? undefined } });
    } catch {
      setFailed(true);
    }
  };

  return (
    <SettingsField label={t("settings.profile.stage")} hint={failed ? <span className="text-danger">{t("settings.profile.saveError")}</span> : undefined}>
      <Select value={saved} onChange={(event) => void choose(event.target.value)} aria-label={t("settings.profile.stage")}>
        <option value="">{t("settings.profile.stage.none")}</option>
        {FOUNDER_STAGES.map((stage) => <option key={stage} value={stage}>{t(STAGE_KEYS[stage].title)}</option>)}
      </Select>
    </SettingsField>
  );
}
