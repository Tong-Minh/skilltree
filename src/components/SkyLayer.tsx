"use client";

import { project, type Box, type SkyLayout, type Viewport } from "@/lib/layout";
import { getSkillLevel, spentInSkill, type SkillIndex } from "@/lib/rules";
import type { Build, SkillId } from "@/lib/types";

interface Props {
  layout: SkyLayout;
  camera: Box;
  viewport: Viewport;
  build: Build;
  index: SkillIndex;
  visible: boolean;
  onOpen: (skillId: SkillId) => void;
  registerButton: (skillId: SkillId, el: HTMLButtonElement | null) => void;
}

/** Clickable constellations and their name/level labels in the sky view. */
export function SkyLayer({ layout, camera, viewport, build, index, visible, onOpen, registerButton }: Props) {
  return (
    <ul
      aria-label="Skill constellations"
      className="absolute inset-0 transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0, pointerEvents: "none" }}
      aria-hidden={!visible}
    >
      {index.skills.map((skill) => {
        const box = layout.boxes.get(skill.id)!;
        const tl = project({ x: box.x, y: box.y }, camera, viewport);
        const br = project({ x: box.x + box.w, y: box.y + box.h }, camera, viewport);
        const level = getSkillLevel(build, skill.id);
        const spent = spentInSkill(index, build, skill.id);
        return (
          <li key={skill.id} className="contents">
            <button
              ref={(el) => registerButton(skill.id, el)}
              type="button"
              tabIndex={visible ? 0 : -1}
              className="sky-constellation group absolute rounded-full"
              style={{
                left: tl.x,
                top: tl.y,
                width: br.x - tl.x,
                height: br.y - tl.y,
                pointerEvents: visible ? "auto" : "none",
                ["--accent" as string]: skill.color,
              }}
              aria-label={`${skill.name}, level ${level}, ${spent} ${spent === 1 ? "perk" : "perks"} taken. Open constellation.`}
              onClick={() => onOpen(skill.id)}
            >
              <span
                aria-hidden
                className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1 whitespace-nowrap font-display uppercase tracking-wider text-slate-200 transition-colors group-hover:text-white group-focus-visible:text-white"
                style={{ fontSize: Math.max(13, Math.min(22, (br.x - tl.x) / 9)) }}
              >
                {skill.name} <span className="font-semibold text-white">{level}</span>
                {spent > 0 && (
                  <span className="ml-2 align-middle text-[0.6em] tracking-widest" style={{ color: skill.color }}>
                    ✦{spent}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
