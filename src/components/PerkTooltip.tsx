"use client";

import { describeBlocker, getPerkState, getSkillLevel, isUnlocked, type SkillIndex } from "@/lib/rules";
import type { Build, PerkId, Point, Skill } from "@/lib/types";
import type { Viewport } from "@/lib/layout";

interface Props {
  id: string;
  perkId: PerkId;
  skill: Skill;
  build: Build;
  index: SkillIndex;
  anchor: Point;
  viewport: Viewport;
  readOnly: boolean;
  /** Show Unlock/Remove buttons (touch, where hover doesn't exist). */
  showActions: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onClose: () => void;
}

const WIDTH = 300;
const TOP_SAFE = 76;
const BOTTOM_SAFE = 200;

export function PerkTooltip({ id, perkId, skill, build, index, anchor, viewport, readOnly, showActions, onAdd, onRemove, onClose }: Props) {
  const perk = index.perkById.get(perkId)!.perk;
  const state = getPerkState(index, build, perkId);
  const skillLevel = getSkillLevel(build, skill.id);

  // Narrow screens: dock under the top bar. Otherwise float beside the star.
  const docked = viewport.width < 560;
  let style: React.CSSProperties;
  if (docked) {
    style = { left: 12, right: 12, top: TOP_SAFE + 8 };
  } else {
    const right = anchor.x + 28 + WIDTH < viewport.width - 12;
    const left = right ? anchor.x + 28 : anchor.x - 28 - WIDTH;
    const top = Math.min(Math.max(anchor.y - 70, TOP_SAFE), Math.max(TOP_SAFE, viewport.height - BOTTOM_SAFE - 220));
    style = { left: Math.max(12, left), top, width: WIDTH };
  }

  const statusText = {
    unlocked: state.maxRank > 1 ? "Mastered" : "Unlocked",
    partial: `Rank ${state.rank} of ${state.maxRank}`,
    available: "Available",
    locked: "Locked",
  }[state.status];

  const hint = readOnly
    ? "Shared build (read-only)"
    : state.blockers.length === 0
      ? state.rank === 0
        ? "Click to unlock"
        : "Click for the next rank"
      : state.rank > 0
        ? state.removable
          ? "Click to refund"
          : "Required by an unlocked perk"
        : describeBlocker(state.blockers[0]!);

  return (
    <div
      id={id}
      role="tooltip"
      className={`hud-panel tooltip-in absolute z-30 px-4 py-3 text-left ${showActions ? "pointer-events-auto" : "pointer-events-none"}`}
      style={{ ...style, ["--accent" as string]: skill.color }}
      data-no-pan
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-xl uppercase tracking-wide text-white">{perk.name}</h3>
        <span className="text-xs uppercase tracking-widest" style={{ color: skill.color }}>
          {statusText}
        </span>
      </div>
      <p className="mt-1 text-sm leading-snug text-slate-200">{perk.description}</p>

      <ol className="mt-3 space-y-1 text-sm">
        {perk.ranks.map((rank, i) => {
          const owned = i < state.rank;
          const met = skillLevel >= rank.requiredSkillLevel;
          return (
            <li key={i} className="flex items-baseline gap-2">
              <span
                aria-hidden
                className="inline-block h-2 w-2 shrink-0 rotate-45 border"
                style={{ borderColor: skill.color, background: owned ? skill.color : "transparent" }}
              />
              <span className={owned ? "text-white" : "text-slate-300"}>
                {perk.ranks.length > 1 && <span className="mr-1 uppercase text-slate-400">Rank {i + 1}</span>}
                {rank.description ?? (perk.ranks.length === 1 ? <span className="uppercase text-slate-400">Single rank</span> : null)}
              </span>
              <span className={`ml-auto shrink-0 whitespace-nowrap tabular-nums ${owned ? "text-slate-400" : met ? "text-emerald-300" : "text-rose-300"}`}>
                <span className="mr-1 font-display text-xs uppercase tracking-widest text-slate-400">Requires</span>
                <span className="sr-only">{skill.name} </span>
                {rank.requiredSkillLevel}
                <span className="sr-only">{owned ? ", owned" : met ? ", requirement met" : ", requirement not met"}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {perk.parents.length > 0 && (
        <div className="mt-3 text-sm">
          <div className="text-xs uppercase tracking-widest text-slate-400">
            {perk.parents.length > 1 ? "Requires any of" : "Requires"}
          </div>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {perk.parents.map((pid) => {
              const ok = isUnlocked(build, pid);
              return (
                <li key={pid} className={ok ? "text-emerald-300" : "text-slate-400"}>
                  <span aria-hidden>{ok ? "✦ " : "✧ "}</span>
                  {index.perkById.get(pid)!.perk.name}
                  <span className="sr-only">{ok ? " (unlocked)" : " (locked)"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
        <span className="text-xs uppercase tracking-widest text-slate-400">{hint}</span>
        {showActions && !readOnly && (
          <div className="flex gap-2">
            {state.rank > 0 && (
              <button type="button" className="hud-button" onClick={onRemove} disabled={!state.removable}>
                Remove
              </button>
            )}
            {state.rank < state.maxRank && (
              <button type="button" className="hud-button hud-button-primary" onClick={onAdd} disabled={state.blockers.length > 0}>
                {state.rank === 0 ? "Unlock" : "Rank up"}
              </button>
            )}
            <button type="button" className="hud-button" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
