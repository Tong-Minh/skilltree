import { describe, expect, it } from "vitest";
import { createIndex } from "@/lib/rules";
import { FIXTURE, makeBuild } from "@/lib/test-fixtures";
import { buildReducer, type BuildState } from "./buildReducer";

const index = createIndex(FIXTURE);
const state = (partial: Partial<BuildState> = {}): BuildState => ({
  loaded: true,
  own: makeBuild(),
  shared: null,
  notice: null,
  ...partial,
});

describe("buildReducer", () => {
  it("applies perk clicks to your own build", () => {
    const next = buildReducer(index, state(), { type: "click-perk", perkId: "root" });
    expect(next.own.perkRanks.root).toBe(1);
    expect(next.notice).toBeNull();
  });

  it("shows the reason when a rule blocks an action", () => {
    const next = buildReducer(index, state(), { type: "click-perk", perkId: "apex" });
    expect(next.notice).toMatchObject({ tone: "error", text: "Unlock a connected perk first." });
  });

  it("is read-only while viewing a shared build", () => {
    const shared = makeBuild({ perkRanks: { root: 1 } });
    const s = state({ shared });
    const next = buildReducer(index, s, { type: "click-perk", perkId: "solo" });
    expect(next.own).toBe(s.own);
    expect(next.shared).toBe(shared);
    expect(next.notice?.text).toMatch(/shared build/);
  });

  it("copies a shared build into your own, keeping your name", () => {
    const shared = makeBuild({ characterName: "Wanderer", perkRanks: { root: 2 } });
    const next = buildReducer(index, state({ own: makeBuild({ characterName: "Ada" }), shared }), { type: "adopt-shared" });
    expect(next.shared).toBeNull();
    expect(next.own).toEqual({ ...shared, characterName: "Ada" });
  });

  it("can leave a shared build without copying it", () => {
    const own = makeBuild();
    const next = buildReducer(index, state({ own, shared: makeBuild({ perkRanks: { root: 1 } }) }), { type: "exit-shared" });
    expect(next.shared).toBeNull();
    expect(next.own).toBe(own);
  });
});
