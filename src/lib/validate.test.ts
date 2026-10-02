import { describe, expect, it } from "vitest";
import { SKILLS } from "@/data/skills";
import { validateSkills } from "./validate";
import { FIXTURE } from "./test-fixtures";
import type { Skill } from "./types";

const clone = (): Skill[] => structuredClone(FIXTURE);

describe("validateSkills", () => {
  it("accepts the shipped content", () => {
    expect(validateSkills(SKILLS)).toEqual([]);
  });

  it("ships 6 skills with 8–12 perks each", () => {
    expect(SKILLS).toHaveLength(6);
    for (const skill of SKILLS) {
      expect(skill.perks.length).toBeGreaterThanOrEqual(8);
      expect(skill.perks.length).toBeLessThanOrEqual(12);
    }
  });

  it("accepts the fixture", () => {
    expect(validateSkills(FIXTURE)).toEqual([]);
  });

  it("catches a missing parent", () => {
    const skills = clone();
    skills[0]!.perks[1]!.parents = ["nope"];
    expect(validateSkills(skills).join()).toMatch(/parent "nope"/);
  });

  it("catches a cycle", () => {
    const skills = clone();
    skills[0]!.perks[0]!.parents = ["apex"]; // root ← apex ← left ← root
    skills[0]!.perks.push({ ...skills[0]!.perks[1]!, id: "extra-root", parents: [] });
    expect(validateSkills(skills).join()).toMatch(/cycle/);
  });

  it("catches duplicate ids", () => {
    const skills = clone();
    skills[1]!.perks[0]!.id = "root";
    expect(validateSkills(skills).join()).toMatch(/duplicate perk id/);
  });

  it("catches too many ranks and decreasing requirements", () => {
    const skills = clone();
    skills[0]!.perks[0]!.ranks = [
      { requiredSkillLevel: 50 },
      { requiredSkillLevel: 30 },
      { requiredSkillLevel: 60 },
      { requiredSkillLevel: 70 },
    ];
    const errors = validateSkills(skills).join();
    expect(errors).toMatch(/1–3 ranks/);
    expect(errors).toMatch(/requires less/);
  });

  it("catches out-of-range positions and bad colours", () => {
    const skills = clone();
    skills[0]!.perks[0]!.position = { x: 120, y: 50 };
    skills[0]!.color = "red";
    const errors = validateSkills(skills).join();
    expect(errors).toMatch(/position is outside/);
    expect(errors).toMatch(/color/);
  });
});
