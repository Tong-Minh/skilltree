"use client";

import { useRef } from "react";
import { MAX_SKILL_LEVEL, MIN_SKILL_LEVEL } from "@/lib/constants";
import { getSkillLevel, minSkillLevel, spentInSkill } from "@/lib/rules";
import { playSkillLevelUp } from "@/lib/sound";
import type { Skill } from "@/lib/types";
import { useBuild } from "@/state/BuildProvider";
import { ConfirmButton } from "./ConfirmButton";

interface Props {
  skill: Skill;
  prev: Skill;
  next: Skill;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
}

/** Bottom panel in the constellation view: skill name, level slider, navigation. */
export function SkillPanel({ skill, prev, next, onPrev, onNext, onBack }: Props) {
  const { build, index, readOnly, dispatch } = useBuild();
  const level = getSkillLevel(build, skill.id);
  const min = minSkillLevel(index, build, skill.id);
  const spent = spentInSkill(index, build, skill.id);
  // Level when the current drag/keypress started, to play the sound once per change.
  const startLevel = useRef<number | null>(null);

  const begin = () => {
    startLevel.current ??= level;
  };
  const commit = () => {
    if (startLevel.current !== null && level > startLevel.current) playSkillLevelUp();
    startLevel.current = null;
  };

  return (
    <section
      aria-labelledby="skill-heading"
      className="pointer-events-auto flex flex-col items-center gap-2 px-3 pb-3"
      style={{ ["--accent" as string]: skill.color }}
      data-no-pan
    >
      <div className="flex w-full max-w-4xl items-center justify-between gap-2">
        <button type="button" className="hud-button" onClick={onPrev} aria-label={`Previous: ${prev.name}`}>
          ‹ <span className="hidden sm:inline">{prev.name}</span>
        </button>
        <h2
          id="skill-heading"
          aria-hidden
          className="text-center font-display text-2xl uppercase tracking-wider text-slate-100 outline-none sm:text-4xl"
        >
          {skill.name} <span className="font-semibold text-white">{level}</span>
        </h2>
        <button type="button" className="hud-button" onClick={onNext} aria-label={`Next: ${next.name}`}>
          <span className="hidden sm:inline">{next.name}</span> ›
        </button>
      </div>

      <div className="hud-bar flex w-full max-w-4xl flex-col gap-2 px-5 py-2 sm:px-6 sm:py-3">
        <div className="flex items-center gap-3">
          <label htmlFor="skill-level" className="hud-label shrink-0">
            Skill level
          </label>
          <input
            id="skill-level"
            type="range"
            className="hud-range flex-1"
            min={MIN_SKILL_LEVEL}
            max={MAX_SKILL_LEVEL}
            value={level}
            disabled={readOnly}
            onPointerDown={begin}
            onKeyDown={begin}
            onPointerUp={commit}
            onKeyUp={commit}
            onBlur={commit}
            onChange={(e) => {
              begin();
              dispatch({ type: "set-skill-level", skillId: skill.id, level: Number(e.target.value) });
            }}
            aria-valuetext={`${level}${min > MIN_SKILL_LEVEL ? `, minimum ${min} for unlocked perks` : ""}`}
          />
          <span className="w-8 text-right font-display text-xl tabular-nums text-white" aria-hidden>
            {level}
          </span>
        </div>
        <p className="hidden text-center text-sm leading-snug text-slate-300 sm:block">{skill.description}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="hud-label hidden sm:inline">
            {spent} {spent === 1 ? "perk rank" : "perk ranks"} in this tree
          </span>
          {!readOnly && (
            <ConfirmButton confirmLabel="Refund this tree?" disabled={spent === 0} onConfirm={() => dispatch({ type: "reset-skill", skillId: skill.id })}>
              Reset tree
            </ConfirmButton>
          )}
          <button type="button" className="hud-button" onClick={onBack}>
            Back to sky <kbd className="ml-1 hidden text-xs text-slate-400 sm:inline">Esc</kbd>
          </button>
        </div>
      </div>
    </section>
  );
}
