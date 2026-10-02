import { describe, expect, it } from "vitest";
import { INDEX } from "./content";
import { createIndex, emptyBuild } from "./rules";
import { buildShareUrl, decodeBuild, encodeBuild } from "./share";
import { FIXTURE, makeBuild } from "./test-fixtures";

const index = createIndex(FIXTURE);

describe("share links", () => {
  it("round-trips a build (minus the name)", () => {
    const build = makeBuild({ characterLevel: 12, skillLevels: { alpha: 64, beta: 22 }, perkRanks: { root: 3, right: 1, solo: 1 } });
    const result = decodeBuild(index, encodeBuild(index, build));
    expect(result).toEqual({ ok: true, build: { ...build, characterName: "Wanderer" } });
  });

  it("round-trips the shipped content at full size", () => {
    const build = { ...emptyBuild(INDEX), characterLevel: 81 };
    for (const skill of INDEX.skills) build.skillLevels[skill.id] = 100;
    let budget = 80;
    for (const id of INDEX.topoOrder) {
      const max = INDEX.perkById.get(id)!.perk.ranks.length;
      const take = Math.min(max, budget);
      if (take > 0) build.perkRanks[id] = take;
      budget -= take;
    }
    const text = encodeBuild(INDEX, build);
    expect(text.length).toBeLessThanOrEqual(40);
    expect(decodeBuild(INDEX, text)).toEqual({ ok: true, build });
  });

  it("produces a URL-safe string", () => {
    const text = encodeBuild(INDEX, emptyBuild(INDEX));
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("rejects garbage", () => {
    expect(decodeBuild(index, "!!!")).toEqual({ ok: false, error: "malformed" });
    expect(decodeBuild(index, "")).toEqual({ ok: false, error: "malformed" });
  });

  it("rejects links made for different content", () => {
    const text = encodeBuild(INDEX, emptyBuild(INDEX));
    expect(decodeBuild(index, text)).toEqual({ ok: false, error: "content-changed" });
  });

  it("rejects an unknown version", () => {
    const text = encodeBuild(index, makeBuild());
    const bytes = Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    bytes[0] = 99;
    const tampered = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodeBuild(index, tampered)).toEqual({ ok: false, error: "version" });
  });

  it("repairs an illegal hand-edited build", () => {
    // root needs alpha ≥ 30 for rank 2; encode rank 3 with alpha 15.
    const text = encodeBuild(index, makeBuild({ characterLevel: 1, skillLevels: { alpha: 15, beta: 15 }, perkRanks: { root: 3, apex: 1 } }));
    const result = decodeBuild(index, text);
    expect(result.ok && result.build.perkRanks).toEqual({ root: 1 });
    expect(result.ok && result.build.characterLevel).toBe(2);
  });

  it("builds a link with only the build parameter", () => {
    const url = buildShareUrl(index, makeBuild(), "https://example.com/tree?x=1#networks");
    expect(url).toMatch(/^https:\/\/example\.com\/tree\?b=[A-Za-z0-9_-]+$/);
  });
});
