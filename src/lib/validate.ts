import { MAX_PERK_RANKS, MAX_SKILL_LEVEL, MIN_SKILL_LEVEL, SKY_HEIGHT, SKY_WIDTH } from "./constants";
import type { Skill } from "./types";

/**
 * Check skill content for mistakes. Returns human-readable errors; an empty
 * array means the content is valid.
 */
export function validateSkills(skills: Skill[]): string[] {
  const errors: string[] = [];
  const skillIds = new Set<string>();
  const perkIds = new Set<string>();
  const inRange = (n: number, lo: number, hi: number) => Number.isFinite(n) && n >= lo && n <= hi;

  if (skills.length === 0) errors.push("At least one skill is required.");
  if (skills.length > 255) errors.push("At most 255 skills are supported by share links.");

  for (const skill of skills) {
    const where = `Skill "${skill.id}"`;
    if (!skill.id) errors.push("A skill has an empty id.");
    if (skillIds.has(skill.id)) errors.push(`${where}: duplicate skill id.`);
    skillIds.add(skill.id);

    if (!/^#[0-9a-fA-F]{6}$/.test(skill.color)) errors.push(`${where}: color must look like #rrggbb.`);
    if (!inRange(skill.skyPosition.x, 0, SKY_WIDTH) || !inRange(skill.skyPosition.y, 0, SKY_HEIGHT)) {
      errors.push(`${where}: skyPosition is outside the sky (${SKY_WIDTH}×${SKY_HEIGHT}).`);
    }
    if (skill.perks.length === 0) errors.push(`${where}: needs at least one perk.`);
    if (!skill.perks.some((perk) => perk.parents.length === 0)) errors.push(`${where}: needs at least one root perk.`);

    if (skill.art) {
      skill.art.points.forEach((pt, i) => {
        if (!inRange(pt.x, 0, 100) || !inRange(pt.y, 0, 100)) errors.push(`${where}: art point ${i} is outside 0–100.`);
      });
      skill.art.lines.forEach(([a, b]) => {
        if (!skill.art!.points[a] || !skill.art!.points[b]) errors.push(`${where}: art line [${a}, ${b}] points at a missing point.`);
      });
    }

    const localIds = new Set(skill.perks.map((perk) => perk.id));
    for (const perk of skill.perks) {
      const at = `Perk "${perk.id}" (${skill.id})`;
      if (!perk.id) errors.push(`${where}: a perk has an empty id.`);
      if (perkIds.has(perk.id)) errors.push(`${at}: duplicate perk id.`);
      perkIds.add(perk.id);

      if (perk.ranks.length < 1 || perk.ranks.length > MAX_PERK_RANKS) {
        errors.push(`${at}: must have 1–${MAX_PERK_RANKS} ranks.`);
      }
      perk.ranks.forEach((rank, i) => {
        if (!inRange(rank.requiredSkillLevel, MIN_SKILL_LEVEL, MAX_SKILL_LEVEL)) {
          errors.push(`${at}: rank ${i + 1} requirement must be ${MIN_SKILL_LEVEL}–${MAX_SKILL_LEVEL}.`);
        }
        const prev = perk.ranks[i - 1];
        if (prev && rank.requiredSkillLevel < prev.requiredSkillLevel) {
          errors.push(`${at}: rank ${i + 1} requires less than rank ${i}.`);
        }
      });
      if (!inRange(perk.position.x, 0, 100) || !inRange(perk.position.y, 0, 100)) {
        errors.push(`${at}: position is outside 0–100.`);
      }
      if (new Set(perk.parents).size !== perk.parents.length) errors.push(`${at}: lists a parent twice.`);
      for (const parent of perk.parents) {
        if (parent === perk.id) errors.push(`${at}: is its own parent.`);
        else if (!localIds.has(parent)) errors.push(`${at}: parent "${parent}" is not a perk in ${skill.id}.`);
      }
    }

    // Cycle check (only meaningful once parents resolve).
    const parentsOf = new Map(skill.perks.map((perk) => [perk.id, perk.parents.filter((id) => localIds.has(id))]));
    const state = new Map<string, "visiting" | "done">();
    const visit = (id: string, path: string[]): void => {
      if (state.get(id) === "done") return;
      if (state.get(id) === "visiting") {
        errors.push(`${where}: prerequisite cycle ${[...path.slice(path.indexOf(id)), id].join(" → ")}.`);
        return;
      }
      state.set(id, "visiting");
      for (const parent of parentsOf.get(id) ?? []) visit(parent, [...path, id]);
      state.set(id, "done");
    };
    for (const perk of skill.perks) visit(perk.id, []);
  }

  return errors;
}

/** Throw with every problem listed, so content mistakes fail loudly in dev. */
export function assertValidSkills(skills: Skill[]): void {
  const errors = validateSkills(skills);
  if (errors.length > 0) throw new Error(`Invalid skill data:\n- ${errors.join("\n- ")}`);
}
