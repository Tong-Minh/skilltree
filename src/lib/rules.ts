import {
  MAX_CHARACTER_LEVEL,
  MAX_SKILL_LEVEL,
  MIN_CHARACTER_LEVEL,
  MIN_SKILL_LEVEL,
} from "./constants";
import type { Build, Perk, PerkBlocker, PerkId, PerkState, Skill, SkillId } from "./types";

// ---- index ----------------------------------------------------------------

export interface PerkEntry {
  perk: Perk;
  skill: Skill;
  /** Position of the perk within its skill (used by share links). */
  index: number;
}

export interface SkillIndex {
  skills: Skill[];
  skillById: Map<SkillId, Skill>;
  perkById: Map<PerkId, PerkEntry>;
  childrenOf: Map<PerkId, PerkId[]>;
  /** All perks, parents before children. */
  topoOrder: PerkId[];
}

/** Precompute lookups. Assumes the content passed `validateSkills`. */
export function createIndex(skills: Skill[]): SkillIndex {
  const skillById = new Map<SkillId, Skill>();
  const perkById = new Map<PerkId, PerkEntry>();
  const childrenOf = new Map<PerkId, PerkId[]>();

  for (const skill of skills) {
    skillById.set(skill.id, skill);
    skill.perks.forEach((perk, index) => {
      perkById.set(perk.id, { perk, skill, index });
      childrenOf.set(perk.id, []);
    });
  }
  for (const { perk } of perkById.values()) {
    for (const parent of perk.parents) childrenOf.get(parent)?.push(perk.id);
  }

  const topoOrder: PerkId[] = [];
  const seen = new Set<PerkId>();
  const visit = (id: PerkId) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const parent of perkById.get(id)?.perk.parents ?? []) visit(parent);
    topoOrder.push(id);
  };
  for (const id of perkById.keys()) visit(id);

  return { skills, skillById, perkById, childrenOf, topoOrder };
}

// ---- build basics -----------------------------------------------------------

export function emptyBuild(index: SkillIndex, characterName = "Wanderer"): Build {
  return {
    characterName,
    characterLevel: MIN_CHARACTER_LEVEL,
    skillLevels: Object.fromEntries(index.skills.map((s) => [s.id, MIN_SKILL_LEVEL])),
    perkRanks: {},
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** One perk point per level gained: level 1 has 0, level 81 has 80. */
export function totalPoints(build: Build): number {
  return build.characterLevel - MIN_CHARACTER_LEVEL;
}

export function spentPoints(build: Build): number {
  let sum = 0;
  for (const rank of Object.values(build.perkRanks)) sum += rank;
  return sum;
}

export function availablePoints(build: Build): number {
  return totalPoints(build) - spentPoints(build);
}

export function getRank(build: Build, perkId: PerkId): number {
  return build.perkRanks[perkId] ?? 0;
}

export function getSkillLevel(build: Build, skillId: SkillId): number {
  return build.skillLevels[skillId] ?? MIN_SKILL_LEVEL;
}

export function isUnlocked(build: Build, perkId: PerkId): boolean {
  return getRank(build, perkId) > 0;
}

/** Points spent in one skill's tree. */
export function spentInSkill(index: SkillIndex, build: Build, skillId: SkillId): number {
  const skill = index.skillById.get(skillId);
  if (!skill) return 0;
  return skill.perks.reduce((sum, p) => sum + getRank(build, p.id), 0);
}

// ---- perk state -------------------------------------------------------------

function entry(index: SkillIndex, perkId: PerkId): PerkEntry {
  const e = index.perkById.get(perkId);
  if (!e) throw new Error(`Unknown perk "${perkId}"`);
  return e;
}

function hasUnlockedParent(build: Build, perk: Perk): boolean {
  return perk.parents.length === 0 || perk.parents.some((id) => isUnlocked(build, id));
}

/** Unlocked children that would lose their only unlocked parent if `perkId` were removed. */
export function dependentChildren(index: SkillIndex, build: Build, perkId: PerkId): PerkId[] {
  return (index.childrenOf.get(perkId) ?? []).filter((childId) => {
    if (!isUnlocked(build, childId)) return false;
    const child = entry(index, childId).perk;
    return !child.parents.some((pid) => pid !== perkId && isUnlocked(build, pid));
  });
}

export function addBlockers(index: SkillIndex, build: Build, perkId: PerkId): PerkBlocker[] {
  const { perk, skill } = entry(index, perkId);
  const rank = getRank(build, perkId);
  if (rank >= perk.ranks.length) return ["max-rank"];

  const blockers: PerkBlocker[] = [];
  if (availablePoints(build) <= 0) blockers.push("no-points");
  if (getSkillLevel(build, skill.id) < perk.ranks[rank]!.requiredSkillLevel) blockers.push("skill-level");
  // Parents only gate the first rank.
  if (rank === 0 && !hasUnlockedParent(build, perk)) blockers.push("no-parent");
  return blockers;
}

export function canAddRank(index: SkillIndex, build: Build, perkId: PerkId): boolean {
  return addBlockers(index, build, perkId).length === 0;
}

export function canRemoveRank(index: SkillIndex, build: Build, perkId: PerkId): boolean {
  const rank = getRank(build, perkId);
  if (rank === 0) return false;
  if (rank > 1) return true; // dropping an extra rank never strands a child
  return dependentChildren(index, build, perkId).length === 0;
}

export function getPerkState(index: SkillIndex, build: Build, perkId: PerkId): PerkState {
  const { perk } = entry(index, perkId);
  const rank = getRank(build, perkId);
  const maxRank = perk.ranks.length;
  const blockers = addBlockers(index, build, perkId);

  let status: PerkState["status"];
  if (rank >= maxRank) status = "unlocked";
  else if (rank > 0) status = "partial";
  else if (blockers.length === 0) status = "available";
  else status = "locked";

  return {
    status,
    rank,
    maxRank,
    nextRequirement: rank < maxRank ? perk.ranks[rank]!.requiredSkillLevel : null,
    blockers,
    removable: canRemoveRank(index, build, perkId),
  };
}

// ---- mutations (all return a new Build) ----------------------------------

export type RuleResult =
  | { ok: true; build: Build }
  | { ok: false; build: Build; reason: string };

function withRank(build: Build, perkId: PerkId, rank: number): Build {
  const perkRanks = { ...build.perkRanks };
  if (rank > 0) perkRanks[perkId] = rank;
  else delete perkRanks[perkId];
  return { ...build, perkRanks };
}

const BLOCKER_TEXT: Record<PerkBlocker, string> = {
  "no-points": "No perk points available.",
  "skill-level": "Skill level too low.",
  "no-parent": "Unlock a connected perk first.",
  "max-rank": "Already at max rank.",
};

export function describeBlocker(blocker: PerkBlocker): string {
  return BLOCKER_TEXT[blocker];
}

export function addRank(index: SkillIndex, build: Build, perkId: PerkId): RuleResult {
  const blockers = addBlockers(index, build, perkId);
  if (blockers.length > 0) return { ok: false, build, reason: BLOCKER_TEXT[blockers[0]!] };
  return { ok: true, build: withRank(build, perkId, getRank(build, perkId) + 1) };
}

export function removeRank(index: SkillIndex, build: Build, perkId: PerkId): RuleResult {
  const rank = getRank(build, perkId);
  if (rank === 0) return { ok: false, build, reason: "Perk is not unlocked." };
  if (!canRemoveRank(index, build, perkId)) {
    const names = dependentChildren(index, build, perkId).map((id) => entry(index, id).perk.name);
    return { ok: false, build, reason: `Required by ${names.join(", ")}.` };
  }
  return { ok: true, build: withRank(build, perkId, rank - 1) };
}

/**
 * Primary click: add a rank if possible; otherwise refund the perk.
 * A 1-rank perk toggles; a multi-rank perk climbs 1 → 2 → 3 then clears.
 * If unlocked children depend on it, it drops to rank 1 instead of 0.
 */
export function clickPerk(index: SkillIndex, build: Build, perkId: PerkId): RuleResult {
  const added = addRank(index, build, perkId);
  if (added.ok) return added;

  const rank = getRank(build, perkId);
  if (rank === 0) return added;

  const dependants = dependentChildren(index, build, perkId);
  const floor = dependants.length > 0 ? 1 : 0;
  if (rank <= floor) {
    const names = dependants.map((id) => entry(index, id).perk.name);
    return { ok: false, build, reason: `Required by ${names.join(", ")}.` };
  }
  return { ok: true, build: withRank(build, perkId, floor) };
}

/** Lowest level the skill can be set to without invalidating unlocked ranks. */
export function minSkillLevel(index: SkillIndex, build: Build, skillId: SkillId): number {
  const skill = index.skillById.get(skillId);
  let min = MIN_SKILL_LEVEL;
  for (const perk of skill?.perks ?? []) {
    const rank = getRank(build, perk.id);
    if (rank > 0) min = Math.max(min, perk.ranks[rank - 1]!.requiredSkillLevel);
  }
  return min;
}

export function minCharacterLevel(build: Build): number {
  return Math.max(MIN_CHARACTER_LEVEL, spentPoints(build) + MIN_CHARACTER_LEVEL);
}

export function setSkillLevel(index: SkillIndex, build: Build, skillId: SkillId, level: number): RuleResult {
  if (!index.skillById.has(skillId)) return { ok: false, build, reason: `Unknown skill "${skillId}".` };
  const min = minSkillLevel(index, build, skillId);
  const next = clamp(Math.round(level), min, MAX_SKILL_LEVEL);
  const result = { ...build, skillLevels: { ...build.skillLevels, [skillId]: next } };
  if (level < min) {
    return { ok: false, build: result, reason: `Unlocked perks need at least level ${min}.` };
  }
  return { ok: true, build: result };
}

export function setCharacterLevel(build: Build, level: number): RuleResult {
  const min = minCharacterLevel(build);
  const next = clamp(Math.round(level), min, MAX_CHARACTER_LEVEL);
  const result = { ...build, characterLevel: next };
  if (level < min) return { ok: false, build: result, reason: `Spent perks need at least level ${min}.` };
  return { ok: true, build: result };
}

/** Refund every perk in one tree. The skill level is kept. */
export function resetSkill(index: SkillIndex, build: Build, skillId: SkillId): Build {
  const skill = index.skillById.get(skillId);
  if (!skill) return build;
  const perkRanks = { ...build.perkRanks };
  for (const perk of skill.perks) delete perkRanks[perk.id];
  return { ...build, perkRanks };
}

/** Back to a fresh character, keeping the name. */
export function resetAll(index: SkillIndex, build: Build): Build {
  return emptyBuild(index, build.characterName);
}

// ---- validation of untrusted builds (storage, share links) --------------

/**
 * Turn any loaded build into a legal one: unknown ids dropped, values
 * clamped, ranks that break the rules removed, character level raised if
 * needed to cover spent points.
 */
export function normalizeBuild(index: SkillIndex, raw: Partial<Build> | null | undefined): Build {
  const base = emptyBuild(index, typeof raw?.characterName === "string" ? raw.characterName.slice(0, 40) : undefined);
  if (!raw) return base;

  const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback);

  for (const skill of index.skills) {
    base.skillLevels[skill.id] = clamp(num(raw.skillLevels?.[skill.id], MIN_SKILL_LEVEL), MIN_SKILL_LEVEL, MAX_SKILL_LEVEL);
  }

  // Accept ranks parents-first so prerequisite checks see the final state.
  const budget = MAX_CHARACTER_LEVEL - MIN_CHARACTER_LEVEL;
  let spent = 0;
  for (const perkId of index.topoOrder) {
    const wanted = num(raw.perkRanks?.[perkId], 0);
    if (wanted <= 0) continue;
    const { perk, skill } = entry(index, perkId);
    if (!hasUnlockedParent(base, perk)) continue;
    let rank = 0;
    while (
      rank < wanted &&
      rank < perk.ranks.length &&
      spent < budget &&
      perk.ranks[rank]!.requiredSkillLevel <= base.skillLevels[skill.id]!
    ) {
      rank++;
      spent++;
    }
    if (rank > 0) base.perkRanks[perkId] = rank;
  }

  base.characterLevel = clamp(
    num(raw.characterLevel, MIN_CHARACTER_LEVEL),
    spent + MIN_CHARACTER_LEVEL,
    MAX_CHARACTER_LEVEL,
  );
  return base;
}
