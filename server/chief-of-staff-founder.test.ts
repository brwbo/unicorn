import { describe, expect, it } from "vitest";

import { FOUNDER_STAGES, founderPlaybook, founderPlaybookPrompt, founderSpecialistSoul } from "../shared/founder-playbooks.ts";
import { chiefOfStaffSystemPrompt } from "./chief-of-staff.ts";

const bots = [{ id: "chief", name: "Unicorn", chiefOfStaff: true, defaultBot: {} }];
const prompt = (founder?: Parameters<typeof chiefOfStaffSystemPrompt>[5]) => chiefOfStaffSystemPrompt("chief", bots, true, undefined, undefined, founder);

describe("the founder playbook in the Chief's prompt", () => {
  it("leaves the prompt exactly as it was when no stage is set", () => {
    const plain = prompt();
    expect(prompt({ cala: true })).toBe(plain);
    expect(prompt({ stage: undefined, cala: false })).toBe(plain);
    expect(plain).not.toMatch(/founder|Launch Brief|cala/i);
  });

  it("appends only the playbook of the stored stage", () => {
    const idea = prompt({ stage: "idea", cala: true });
    expect(idea.startsWith(prompt())).toBe(true);
    expect(idea).toContain("Launch Brief");
    expect(idea).toContain("who exactly has this problem");
    expect(idea).toContain("Validator");
    expect(idea).not.toContain("Investor Scout");
    const seed = prompt({ stage: "seed", cala: true });
    expect(seed).toContain("Investor Scout");
    expect(seed).toContain("Diligence");
    expect(seed).not.toContain("Validator");
  });

  it("is withheld from a bot that is not the Chief or cannot delegate", () => {
    const helper = [{ id: "chief", name: "Unicorn", defaultBot: {} }];
    expect(chiefOfStaffSystemPrompt("chief", helper, true, undefined, undefined, { stage: "idea", cala: true })).not.toContain("Launch Brief");
    expect(chiefOfStaffSystemPrompt("chief", bots, false, undefined, undefined, { stage: "idea", cala: true })).not.toContain("Launch Brief");
  });

  it("says Cala is not connected, and forbids stated facts, when it is not", () => {
    expect(prompt({ stage: "idea", cala: false })).toContain("Cala is not connected");
    expect(prompt({ stage: "idea", cala: true })).not.toContain("Cala is not connected");
  });
});

describe("every founder playbook", () => {
  it.each(FOUNDER_STAGES)("%s carries the common rules and specialists that follow them", (stage) => {
    const text = founderPlaybookPrompt(stage, true);
    for (const rule of ["ONE question at a time", "source link", "retrieved", "Never invent", "irreversible", "a lawyer should confirm"]) expect(text).toContain(rule);
    const { specialists } = founderPlaybook(stage);
    expect(specialists.length).toBeGreaterThanOrEqual(2);
    for (const one of specialists) {
      const soul = founderSpecialistSoul(one);
      expect(soul).toContain(one.firstTask);
      expect(soul).toContain("cala tools");
      expect(soul).toContain("source link");
      expect(soul).toContain("approval");
      expect(text).toContain(one.doneWhen);
    }
  });

  it.each(FOUNDER_STAGES)("%s asks the person to approve the team in chat before propose_team_setup", (stage) => {
    const text = founderPlaybookPrompt(stage, true);
    expect(text).toContain("Shall I create this team?");
    expect(text.indexOf("without calling propose_team_setup")).toBeGreaterThan(-1);
    expect(text).toContain("only after the person has said yes in chat");
  });

  it("names the specialists the brief asks for", () => {
    const names = (stage: (typeof FOUNDER_STAGES)[number]) => founderPlaybook(stage).specialists.map((one) => one.name);
    expect(names("idea")).toEqual(["Validator", "Market Scout", "First Customers", "Legal and Setup", "Finance"]);
    expect(names("seed")).toEqual(["Investor Scout", "Narrative", "Finance", "Legal", "Diligence", "Outreach"]);
    expect(names("building")).toEqual(["Validator", "First Customers", "Finance"]);
    expect(names("scaling")).toEqual(["Market Scout", "Growth", "Ops"]);
  });
});
