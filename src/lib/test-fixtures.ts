import type { Build, Skill } from "./types";

/*
 * Small tree used by tests:
 *
 *            apex (lvl 60, parents: left, right)
 *           /    \
 *        left    right (lvl 40)
 *          \      /
 *           root  (3 ranks: 15 / 30 / 50)
 *
 *   other skill: solo (root, lvl 15)
 */
export const FIXTURE: Skill[] = [
  {
    id: "alpha",
    name: "Alpha",
    description: "",
    color: "#ffffff",
    skyPosition: { x: 100, y: 100 },
    perks: [
      {
        id: "root",
        name: "Root",
        description: "",
        ranks: [{ requiredSkillLevel: 15 }, { requiredSkillLevel: 30 }, { requiredSkillLevel: 50 }],
        parents: [],
        position: { x: 50, y: 90 },
      },
      {
        id: "left",
        name: "Left",
        description: "",
        ranks: [{ requiredSkillLevel: 20 }],
        parents: ["root"],
        position: { x: 30, y: 60 },
      },
      {
        id: "right",
        name: "Right",
        description: "",
        ranks: [{ requiredSkillLevel: 40 }],
        parents: ["root"],
        position: { x: 70, y: 60 },
      },
      {
        id: "apex",
        name: "Apex",
        description: "",
        ranks: [{ requiredSkillLevel: 60 }],
        parents: ["left", "right"],
        position: { x: 50, y: 20 },
      },
    ],
  },
  {
    id: "beta",
    name: "Beta",
    description: "",
    color: "#000000",
    skyPosition: { x: 300, y: 100 },
    perks: [
      {
        id: "solo",
        name: "Solo",
        description: "",
        ranks: [{ requiredSkillLevel: 15 }],
        parents: [],
        position: { x: 50, y: 50 },
      },
    ],
  },
];

export function makeBuild(partial: Partial<Build> = {}): Build {
  return {
    characterName: "Test",
    characterLevel: 81,
    skillLevels: { alpha: 100, beta: 100 },
    perkRanks: {},
    ...partial,
  };
}
