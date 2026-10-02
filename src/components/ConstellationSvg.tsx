"use client";

import { memo } from "react";
import { toWorld, type Box } from "@/lib/layout";
import { getPerkState, type SkillIndex } from "@/lib/rules";
import type { Build, PerkId, PerkStatus, Skill } from "@/lib/types";

interface Props {
  skill: Skill;
  box: Box;
  build: Build;
  index: SkillIndex;
  /** "focus" = this is the open constellation, "dim" = another one is open. */
  mode: "sky" | "focus" | "dim";
  activePerk: PerkId | null;
  /** Bumped each time a perk gains a rank, to replay unlock effects. */
  unlockGen: ReadonlyMap<PerkId, number>;
}

export const glowId = (skillId: string) => `glow-${skillId}`;

function PerkLink({
  from,
  to,
  state,
  color,
  gen,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  state: "lit" | "ready" | "dark";
  color: string;
  gen: number;
}) {
  const common = { x1: from.x, y1: from.y, x2: to.x, y2: to.y, vectorEffect: "non-scaling-stroke" as const };
  if (state === "dark") {
    return <line {...common} stroke="#9fb4d8" strokeOpacity={0.22} strokeWidth={1} />;
  }
  if (state === "ready") {
    return <line {...common} stroke={color} strokeOpacity={0.45} strokeWidth={1.2} strokeDasharray="3 4" className="link-ready" />;
  }
  return (
    <g key={gen} className={gen > 0 ? "link-draw" : undefined}>
      <line {...common} stroke={color} strokeOpacity={0.35} strokeWidth={7} strokeLinecap="round" pathLength={1} className="link-glow" />
      <line {...common} stroke="#f4fbff" strokeOpacity={0.95} strokeWidth={1.6} strokeLinecap="round" pathLength={1} className="link-core" />
    </g>
  );
}

function PerkStar({
  x,
  y,
  status,
  skillId,
  color,
  active,
  gen,
}: {
  x: number;
  y: number;
  status: PerkStatus;
  skillId: string;
  color: string;
  active: boolean;
  gen: number;
}) {
  const lit = status === "unlocked" || status === "partial";
  return (
    <g transform={`translate(${x} ${y})`}>
      {active && <circle r={7.5} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={1} vectorEffect="non-scaling-stroke" className="perk-focus-ring" />}
      {lit && (
        <>
          <circle r={status === "unlocked" ? 11 : 8.5} fill={`url(#${glowId(skillId)})`} className="perk-glow" />
          {gen > 0 && <circle key={gen} r={4} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" className="perk-burst" />}
          <circle r={status === "unlocked" ? 2.6 : 2.2} fill="#fff" />
        </>
      )}
      {status === "available" && (
        <>
          <circle r={7} fill={`url(#${glowId(skillId)})`} className="perk-pulse" />
          <circle r={1.9} fill={color} />
          <circle r={1} fill="#fff" fillOpacity={0.8} />
        </>
      )}
      {status === "locked" && <circle r={1.4} fill="#b9c6e4" fillOpacity={0.5} />}
    </g>
  );
}

/** One constellation drawn in world coordinates. Memoised so camera motion doesn't re-render it. */
export const ConstellationSvg = memo(function ConstellationSvg({ skill, box, build, index, mode, activePerk, unlockGen }: Props) {
  const states = new Map(skill.perks.map((perk) => [perk.id, getPerkState(index, build, perk.id)]));
  const pos = new Map(skill.perks.map((perk) => [perk.id, toWorld(perk.position, box)]));
  const isLit = (id: PerkId) => (states.get(id)?.rank ?? 0) > 0;

  return (
    <g className="constellation" style={{ opacity: mode === "dim" ? 0.3 : 1 }}>
      {skill.art && (
        <g className="constellation-art">
          {skill.art.lines.map(([a, b], i) => {
            const p1 = toWorld(skill.art!.points[a]!, box);
            const p2 = toWorld(skill.art!.points[b]!, box);
            return (
              <line
                key={i}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={skill.color}
                strokeOpacity={mode === "focus" ? 0.13 : 0.16}
                strokeWidth={mode === "focus" ? 1.5 : 1.2}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </g>
      )}

      {skill.perks.flatMap((perk) =>
        perk.parents.map((parentId) => {
          const parentLit = isLit(parentId);
          const childLit = isLit(perk.id);
          const state = parentLit && childLit ? "lit" : parentLit ? "ready" : "dark";
          return (
            <PerkLink
              key={`${parentId}>${perk.id}`}
              from={pos.get(parentId)!}
              to={pos.get(perk.id)!}
              state={state}
              color={skill.color}
              gen={state === "lit" ? (unlockGen.get(perk.id) ?? 0) : 0}
            />
          );
        }),
      )}

      {skill.perks.map((perk) => {
        const p = pos.get(perk.id)!;
        return (
          <PerkStar
            key={perk.id}
            x={p.x}
            y={p.y}
            status={states.get(perk.id)!.status}
            skillId={skill.id}
            color={skill.color}
            active={activePerk === perk.id}
            gen={unlockGen.get(perk.id) ?? 0}
          />
        );
      })}
    </g>
  );
});
