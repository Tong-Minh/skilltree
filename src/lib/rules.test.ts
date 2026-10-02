import { describe, expect, it } from "vitest";
import {
  addRank,
  availablePoints,
  clickPerk,
  createIndex,
  emptyBuild,
  getPerkState,
  minCharacterLevel,
  minSkillLevel,
  normalizeBuild,
  removeRank,
  resetAll,
  resetSkill,
  setCharacterLevel,
  setSkillLevel,
  spentPoints,
  totalPoints,
} from "./rules";
import { FIXTURE, makeBuild } from "./test-fixtures";

const index = createIndex(FIXTURE);

describe("points", () => {
  it("grants one point per level gained", () => {
    expect(totalPoints(makeBuild({ characterLevel: 1 }))).toBe(0);
    expect(totalPoints(makeBuild({ characterLevel: 2 }))).toBe(1);
    expect(totalPoints(makeBuild({ characterLevel: 81 }))).toBe(80);
  });

  it("counts every rank as one spent point", () => {
    const build = makeBuild({ perkRanks: { root: 3, left: 1 } });
    expect(spentPoints(build)).toBe(4);
    expect(availablePoints(build)).toBe(76);
  });

  it("starts a fresh build at level 1 with all skills at 15", () => {
    const build = emptyBuild(index);
    expect(build.characterLevel).toBe(1);
    expect(build.skillLevels).toEqual({ alpha: 15, beta: 15 });
    expect(build.perkRanks).toEqual({});
  });
});

describe("unlocking", () => {
  it("unlocks a root perk with a point and the skill level", () => {
    const result = addRank(index, makeBuild(), "root");
    expect(result.ok).toBe(true);
    expect(result.build.perkRanks.root).toBe(1);
  });

  it("requires a point to be available", () => {
    const result = addRank(index, makeBuild({ characterLevel: 1 }), "root");
    expect(result.ok).toBe(false);
    expect(getPerkState(index, makeBuild({ characterLevel: 1 }), "root").blockers).toContain("no-points");
  });

  it("requires the skill level", () => {
    const build = makeBuild({ skillLevels: { alpha: 39, beta: 15 }, perkRanks: { root: 1 } });
    expect(addRank(index, build, "right").ok).toBe(false);
    expect(getPerkState(index, build, "right").blockers).toEqual(["skill-level"]);
    const ok = { ...build, skillLevels: { alpha: 40, beta: 15 } };
    expect(addRank(index, ok, "right").ok).toBe(true);
  });

  it("requires an unlocked parent for non-root perks", () => {
    expect(addRank(index, makeBuild(), "left").ok).toBe(false);
    expect(getPerkState(index, makeBuild(), "left").blockers).toEqual(["no-parent"]);
  });

  it("needs only one of several parents", () => {
    const build = makeBuild({ perkRanks: { root: 1, left: 1 } });
    expect(addRank(index, build, "apex").ok).toBe(true);
  });

  it("does not need a parent for a root perk", () => {
    expect(getPerkState(index, makeBuild(), "solo").status).toBe("available");
  });

  it("reports every blocker at once", () => {
    const build = makeBuild({ characterLevel: 1, skillLevels: { alpha: 15, beta: 15 } });
    expect(getPerkState(index, build, "apex").blockers).toEqual(["no-points", "skill-level", "no-parent"]);
  });
});

describe("ranks", () => {
  it("applies each rank's own skill requirement", () => {
    let build = makeBuild({ skillLevels: { alpha: 30, beta: 15 } });
    build = addRank(index, build, "root").build;
    build = addRank(index, build, "root").build;
    expect(build.perkRanks.root).toBe(2);

    const third = addRank(index, build, "root");
    expect(third.ok).toBe(false);
    expect(getPerkState(index, build, "root")).toMatchObject({
      status: "partial",
      rank: 2,
      maxRank: 3,
      nextRequirement: 50,
      blockers: ["skill-level"],
    });
  });

  it("stops at max rank", () => {
    const build = makeBuild({ perkRanks: { root: 3 } });
    expect(addRank(index, build, "root").ok).toBe(false);
    expect(getPerkState(index, build, "root")).toMatchObject({ status: "unlocked", nextRequirement: null, blockers: ["max-rank"] });
  });

  it("only checks parents for the first rank", () => {
    // A legacy/hand-edited state where the parent is gone: the next rank is still allowed.
    const multi = createIndex([
      {
        ...FIXTURE[0]!,
        perks: [
          FIXTURE[0]!.perks[0]!,
          { ...FIXTURE[0]!.perks[1]!, ranks: [{ requiredSkillLevel: 20 }, { requiredSkillLevel: 30 }] },
        ],
      },
    ]);
    const build = makeBuild({ skillLevels: { alpha: 100 }, perkRanks: { left: 1 } });
    expect(addRank(multi, build, "left").ok).toBe(true);
  });
});

describe("removing", () => {
  it("refunds the point", () => {
    const build = makeBuild({ characterLevel: 2, perkRanks: { root: 1 } });
    const result = removeRank(index, build, "root");
    expect(result.ok).toBe(true);
    expect(result.build.perkRanks).toEqual({});
    expect(availablePoints(result.build)).toBe(1);
  });

  it("is blocked while an unlocked child depends on it", () => {
    const build = makeBuild({ perkRanks: { root: 1, left: 1 } });
    const result = removeRank(index, build, "root");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("Left");
    expect(getPerkState(index, build, "root").removable).toBe(false);
  });

  it("is allowed when the child has another unlocked parent", () => {
    const build = makeBuild({ perkRanks: { root: 1, left: 1, right: 1, apex: 1 } });
    expect(removeRank(index, build, "left").ok).toBe(true);
    expect(removeRank(index, build, "right").ok).toBe(true);
  });

  it("lets extra ranks be removed even with children", () => {
    const build = makeBuild({ perkRanks: { root: 2, left: 1 } });
    const result = removeRank(index, build, "root");
    expect(result.ok).toBe(true);
    expect(result.build.perkRanks.root).toBe(1);
  });

  it("fails for a locked perk", () => {
    expect(removeRank(index, makeBuild(), "root").ok).toBe(false);
  });
});

describe("clickPerk", () => {
  it("toggles a single-rank perk", () => {
    const on = clickPerk(index, makeBuild(), "solo");
    expect(on.build.perkRanks.solo).toBe(1);
    const off = clickPerk(index, on.build, "solo");
    expect(off.build.perkRanks.solo).toBeUndefined();
  });

  it("climbs a multi-rank perk to max, then refunds it", () => {
    let build = makeBuild();
    const seen: number[] = [];
    for (let i = 0; i < 5; i++) {
      build = clickPerk(index, build, "root").build;
      seen.push(build.perkRanks.root ?? 0);
    }
    expect(seen).toEqual([1, 2, 3, 0, 1]);
    expect(availablePoints(build)).toBe(79);
  });

  it("refunds a partial perk when the next rank is blocked", () => {
    const build = makeBuild({ skillLevels: { alpha: 30, beta: 15 }, perkRanks: { root: 2 } });
    const result = clickPerk(index, build, "root");
    expect(result.ok).toBe(true);
    expect(result.build.perkRanks.root).toBeUndefined();
  });

  it("only drops to rank 1 while children depend on it", () => {
    const build = makeBuild({ perkRanks: { root: 3, left: 1 } });
    const result = clickPerk(index, build, "root");
    expect(result.ok).toBe(true);
    expect(result.build.perkRanks.root).toBe(1);
  });

  it("explains why a locked perk cannot be taken", () => {
    const result = clickPerk(index, makeBuild(), "apex");
    expect(result).toMatchObject({ ok: false, reason: "Unlock a connected perk first." });
  });

  it("explains why a perk with dependants cannot be removed", () => {
    // apex's only unlocked parent is left.
    const build = makeBuild({ perkRanks: { root: 1, left: 1, apex: 1 } });
    const result = clickPerk(index, build, "left");
    expect(result).toMatchObject({ ok: false, reason: "Required by Apex." });
  });
});

describe("level sliders", () => {
  it("clamps skill level to 15–100", () => {
    expect(setSkillLevel(index, makeBuild(), "alpha", 5).build.skillLevels.alpha).toBe(15);
    expect(setSkillLevel(index, makeBuild(), "alpha", 140).build.skillLevels.alpha).toBe(100);
  });

  it("won't drop a skill below what unlocked ranks need", () => {
    const build = makeBuild({ perkRanks: { root: 2, right: 1 } });
    expect(minSkillLevel(index, build, "alpha")).toBe(40);
    const result = setSkillLevel(index, build, "alpha", 20);
    expect(result.ok).toBe(false);
    expect(result.build.skillLevels.alpha).toBe(40);
  });

  it("won't drop the character below spent points + 1", () => {
    const build = makeBuild({ perkRanks: { root: 3, left: 1 } });
    expect(minCharacterLevel(build)).toBe(5);
    const result = setCharacterLevel(build, 2);
    expect(result.ok).toBe(false);
    expect(result.build.characterLevel).toBe(5);
    expect(setCharacterLevel(build, 200).build.characterLevel).toBe(81);
  });
});

describe("reset", () => {
  it("resets one tree and keeps the others", () => {
    const build = makeBuild({ perkRanks: { root: 2, left: 1, solo: 1 } });
    const result = resetSkill(index, build, "alpha");
    expect(result.perkRanks).toEqual({ solo: 1 });
    expect(result.skillLevels).toEqual(build.skillLevels);
  });

  it("resets everything but the name", () => {
    const build = makeBuild({ characterName: "Ada", perkRanks: { root: 2, solo: 1 } });
    expect(resetAll(index, build)).toEqual({ ...emptyBuild(index), characterName: "Ada" });
  });
});

describe("normalizeBuild", () => {
  it("returns an empty build for missing data", () => {
    expect(normalizeBuild(index, null)).toEqual(emptyBuild(index));
  });

  it("keeps a valid build unchanged", () => {
    const build = makeBuild({ characterLevel: 10, perkRanks: { root: 2, left: 1, apex: 1 } });
    expect(normalizeBuild(index, build)).toEqual(build);
  });

  it("drops unknown ids and clamps values", () => {
    const result = normalizeBuild(index, {
      characterLevel: 999,
      skillLevels: { alpha: 3, beta: 500, ghost: 50 },
      perkRanks: { root: 9, ghost: 1 },
    });
    expect(result.characterLevel).toBe(81);
    expect(result.skillLevels).toEqual({ alpha: 15, beta: 100 });
    expect(result.perkRanks).toEqual({ root: 1 }); // alpha 15 only allows rank 1
  });

  it("drops perks whose parents are missing", () => {
    const result = normalizeBuild(index, makeBuild({ perkRanks: { left: 1, apex: 1 } }));
    expect(result.perkRanks).toEqual({});
  });

  it("raises the character level to cover spent points", () => {
    const result = normalizeBuild(index, makeBuild({ characterLevel: 1, perkRanks: { root: 3, left: 1 } }));
    expect(result.characterLevel).toBe(5);
  });
});
