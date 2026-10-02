import {
  clickPerk,
  emptyBuild,
  removeRank,
  resetAll,
  resetSkill,
  setCharacterLevel,
  setSkillLevel,
  type RuleResult,
  type SkillIndex,
} from "@/lib/rules";
import type { Build, PerkId, SkillId } from "@/lib/types";

export interface Notice {
  id: number;
  text: string;
  tone: "info" | "error";
}

export interface BuildState {
  loaded: boolean;
  own: Build;
  /** A build opened from a share link; shown read-only while set. */
  shared: Build | null;
  notice: Notice | null;
}

export type BuildAction =
  | { type: "hydrate"; own: Build; shared: Build | null; notice?: string }
  | { type: "click-perk"; perkId: PerkId }
  | { type: "remove-rank"; perkId: PerkId }
  | { type: "set-skill-level"; skillId: SkillId; level: number }
  | { type: "set-character-level"; level: number }
  | { type: "set-name"; name: string }
  | { type: "reset-skill"; skillId: SkillId }
  | { type: "reset-all" }
  | { type: "adopt-shared" }
  | { type: "exit-shared" }
  | { type: "notify"; text: string; tone?: Notice["tone"] }
  | { type: "dismiss-notice" };

let noticeId = 0;
const notice = (text: string, tone: Notice["tone"] = "info"): Notice => ({ id: ++noticeId, text, tone });

export function initialState(index: SkillIndex): BuildState {
  return { loaded: false, own: emptyBuild(index), shared: null, notice: null };
}

const READ_ONLY = "This is a shared build. Copy it into your own build to make changes.";

export function buildReducer(index: SkillIndex, state: BuildState, action: BuildAction): BuildState {
  const apply = (result: RuleResult, quiet = false): BuildState => ({
    ...state,
    own: result.build,
    notice: result.ok || quiet ? state.notice : notice(result.reason, "error"),
  });

  const editing = !["hydrate", "adopt-shared", "exit-shared", "notify", "dismiss-notice"].includes(action.type);
  if (editing && state.shared) return { ...state, notice: notice(READ_ONLY) };

  switch (action.type) {
    case "hydrate":
      return {
        loaded: true,
        own: action.own,
        shared: action.shared,
        notice: action.notice ? notice(action.notice, "error") : null,
      };
    case "click-perk":
      return apply(clickPerk(index, state.own, action.perkId));
    case "remove-rank":
      return apply(removeRank(index, state.own, action.perkId));
    case "set-skill-level":
      return apply(setSkillLevel(index, state.own, action.skillId, action.level));
    case "set-character-level":
      return apply(setCharacterLevel(state.own, action.level));
    case "set-name":
      return { ...state, own: { ...state.own, characterName: action.name.slice(0, 40) } };
    case "reset-skill":
      return { ...state, own: resetSkill(index, state.own, action.skillId) };
    case "reset-all":
      return { ...state, own: resetAll(index, state.own) };
    case "adopt-shared":
      if (!state.shared) return state;
      return {
        ...state,
        own: { ...state.shared, characterName: state.own.characterName },
        shared: null,
        notice: notice("Shared build copied into your build."),
      };
    case "exit-shared":
      return { ...state, shared: null };
    case "notify":
      return { ...state, notice: notice(action.text, action.tone) };
    case "dismiss-notice":
      return { ...state, notice: null };
  }
}
