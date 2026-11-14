// @vitest-environment happy-dom
// The first run's stage question: four cards, one chosen, then Continue; Skip leaves the stage unset.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLocale } from "@/lib/i18n";
import { StageSettings } from "../StageSettings";
import { StageScreen } from "./StageScreen";

const store = vi.hoisted(() => ({ state: { config: {} as { profile?: { name: string; email: string; founderStage?: string } } }, dispatch: vi.fn(), api: vi.fn() }));
vi.mock("@/state/store", () => ({ useStore: () => ({ state: store.state, dispatch: store.dispatch }), api: store.api }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement, root: Root;
const onChoose = vi.fn();
const card = (stage: string) => host.querySelector<HTMLElement>(`[data-stage="${stage}"]`)!;
const key = async (target: Element, name: string) => { await act(async () => { target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true })); }); };

beforeEach(() => {
  setLocale("en");
  onChoose.mockReset();
  store.dispatch.mockReset();
  store.api.mockReset().mockResolvedValue({});
  store.state.config = { profile: { name: "", email: "" } };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

const show = async (initial?: Parameters<typeof StageScreen>[0]["initial"]) => { await act(async () => { root.render(createElement(StageScreen, { initial, onChoose })); }); };

describe("the stage screen", () => {
  it("asks where the business is, with the four stages in the person's own words", async () => {
    await show();
    expect(host.querySelector("h1")?.textContent).toBe("Where are you with your business?");
    expect([...host.querySelectorAll("[role=radio]")].map((node) => node.textContent)).toEqual([
      "IdeaI have an idea and nothing built yet",
      "BuildingI am building a first version",
      "SeedI am raising a seed round",
      "ScalingI have customers and want to grow",
    ]);
    expect(host.querySelector("[role=radiogroup]")?.getAttribute("aria-labelledby")).toBe("welcome-title");
  });

  it("cannot continue until a stage is chosen, then hands it on", async () => {
    await show();
    const next = host.querySelector<HTMLButtonElement>("[data-stage-continue]")!;
    expect(next.disabled).toBe(true);
    await act(async () => { card("seed").click(); });
    expect(card("seed").getAttribute("aria-checked")).toBe("true");
    expect(next.disabled).toBe(false);
    await act(async () => { next.click(); });
    expect(onChoose).toHaveBeenCalledExactlyOnceWith("seed");
  });

  it("lets Skip leave the stage unset", async () => {
    await show();
    await act(async () => { host.querySelector<HTMLButtonElement>("[data-stage-skip]")!.click(); });
    expect(onChoose).toHaveBeenCalledExactlyOnceWith(null);
  });

  it("moves the choice with the arrow keys and picks with Space, wrapping at both ends", async () => {
    await show();
    expect(card("idea").tabIndex).toBe(0);
    await key(card("idea"), "ArrowDown");
    expect(card("building").getAttribute("aria-checked")).toBe("true");
    await key(card("building"), "ArrowUp");
    await key(card("idea"), "ArrowUp");
    expect(card("scaling").getAttribute("aria-checked")).toBe("true");
    await key(card("scaling"), " ");
    expect(card("scaling").getAttribute("aria-checked")).toBe("true");
  });

  it("opens on the stage already saved", async () => {
    await show("scaling");
    expect(card("scaling").getAttribute("aria-checked")).toBe("true");
    expect(host.querySelector<HTMLButtonElement>("[data-stage-continue]")!.disabled).toBe(false);
  });
});

describe("the stage in Settings", () => {
  it("shows the saved stage, saves another, and clears it with null", async () => {
    store.state.config = { profile: { name: "Ada", email: "", founderStage: "idea" } };
    await act(async () => { root.render(createElement(StageSettings)); });
    const select = host.querySelector<HTMLSelectElement>("select")!;
    expect(select.value).toBe("idea");
    expect([...select.options].map((option) => option.textContent)).toEqual(["Not set", "Idea", "Building", "Seed", "Scaling"]);
    const choose = async (value: string) => {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(select, value);
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
    };
    await choose("seed");
    expect(JSON.parse(store.api.mock.calls[0]![1].body)).toEqual({ profile: { founderStage: "seed" } });
    expect(store.dispatch).toHaveBeenCalledWith({ type: "profileSaved", profile: { founderStage: "seed" } });
    await choose("");
    expect(JSON.parse(store.api.mock.calls[1]![1].body)).toEqual({ profile: { founderStage: null } });
    expect(store.dispatch).toHaveBeenLastCalledWith({ type: "profileSaved", profile: { founderStage: undefined } });
  });
});
