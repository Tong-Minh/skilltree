"use client";

import { getSkillLevel } from "@/lib/rules";
import type { SkillId } from "@/lib/types";
import { useBuild } from "@/state/BuildProvider";

/** Bottom row in the sky view: every skill with its level, like a star chart legend. */
export function SkillRow({ onOpen }: { onOpen: (skillId: SkillId) => void }) {
  const { build, index } = useBuild();
  return (
    <nav aria-label="Skills" className="pointer-events-auto px-3 pb-3" data-no-pan>
      <ul className="hud-bar mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-1 gap-y-1 px-4 py-2">
        {index.skills.map((skill) => (
          <li key={skill.id}>
            <button
              type="button"
              className="skill-chip font-display uppercase tracking-wider"
              style={{ ["--accent" as string]: skill.color }}
              onClick={() => onOpen(skill.id)}
            >
              {skill.name} <span className="font-semibold text-white">{getSkillLevel(build, skill.id)}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
