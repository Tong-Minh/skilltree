export type SkillId = string;
export type PerkId = string;

export interface Point {
  x: number;
  y: number;
}

export interface PerkRank {
  /** Skill level (15–100) needed to take this rank. */
  requiredSkillLevel: number;
  /** Optional per-rank text, e.g. "+20% → +40%". */
  description?: string;
}

export interface Perk {
  id: PerkId;
  name: string;
  description: string;
  /** At least one rank; requirements must be non-decreasing. */
  ranks: PerkRank[];
  /** Empty = root perk. Any one unlocked parent satisfies the requirement. */
  parents: PerkId[];
  /** 0–100 inside the constellation's box. */
  position: Point;
}

export interface ConstellationArt {
  /** 0–100, same box as perks. */
  points: Point[];
  /** Index pairs into `points`. */
  lines: [number, number][];
}

export interface Skill {
  id: SkillId;
  name: string;
  description: string;
  /** Theme colour, e.g. "#6fd3ff". */
  color: string;
  /** Centre of the constellation in sky coordinates (0–1000). */
  skyPosition: Point;
  /** Constellation size in the sky; default 1. */
  skyScale?: number;
  art?: ConstellationArt;
  /** ORDER MATTERS: share links store perks by index. */
  perks: Perk[];
}

export interface Build {
  characterName: string;
  /** 1–MAX_CHARACTER_LEVEL */
  characterLevel: number;
  /** MIN_SKILL_LEVEL–MAX_SKILL_LEVEL */
  skillLevels: Record<SkillId, number>;
  /** 0 or missing = locked. */
  perkRanks: Record<PerkId, number>;
}

export type PerkStatus = "unlocked" | "partial" | "available" | "locked";

export type PerkBlocker = "no-points" | "skill-level" | "no-parent" | "max-rank";

export interface PerkState {
  status: PerkStatus;
  rank: number;
  maxRank: number;
  /** Skill level needed for the next rank, or null at max rank. */
  nextRequirement: number | null;
  /** Why the next rank can't be taken (empty if it can). */
  blockers: PerkBlocker[];
  /** True if a rank can be removed right now. */
  removable: boolean;
}

/** Persistence boundary: swap the localStorage implementation for Neon here. */
export interface BuildStore {
  load(): Promise<Build | null>;
  save(build: Build): Promise<void>;
}
