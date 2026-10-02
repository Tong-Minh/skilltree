"use client";

import { useEffect, useRef, useState } from "react";
import { cameraScale, project, toWorld, type Box, type Viewport } from "@/lib/layout";
import { getPerkState, getSkillLevel, type SkillIndex } from "@/lib/rules";
import type { Build, PerkId, Skill } from "@/lib/types";
import { PerkTooltip } from "./PerkTooltip";

interface Props {
  skill: Skill;
  box: Box;
  camera: Box;
  viewport: Viewport;
  build: Build;
  index: SkillIndex;
  readOnly: boolean;
  visible: boolean;
  onAdd: (perkId: PerkId) => void;
  onRemove: (perkId: PerkId) => void;
  /** Reports the perk whose tooltip is showing, so the SVG can ring it. */
  onActiveChange: (perkId: PerkId | null) => void;
  /** Click/tap: add a rank, or refund (rules decide). */
  onClickPerk: (perkId: PerkId) => void;
  /** Receives focus when the constellation opens, so Tab continues into the perks. */
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}

const STATUS_LABEL = { unlocked: "unlocked", partial: "partly ranked", available: "available", locked: "locked" };

/**
 * Accessible, touch-friendly controls positioned over the SVG stars of the
 * open constellation. The SVG draws; this layer handles input and text.
 */
export function PerkLayer({ skill, box, camera, viewport, build, index, readOnly, visible, onAdd, onRemove, onActiveChange, onClickPerk, headingRef }: Props) {
  const [hovered, setHovered] = useState<PerkId | null>(null);
  const [focused, setFocused] = useState<PerkId | null>(null);
  const [pinned, setPinned] = useState<PerkId | null>(null);
  const pointerType = useRef<string>("mouse");

  const active = hovered ?? pinned ?? focused;
  useEffect(() => onActiveChange(active), [active, onActiveChange]);

  // Clear transient state when switching constellations.
  useEffect(() => {
    setHovered(null);
    setFocused(null);
    setPinned(null);
  }, [skill.id]);

  // Tap outside closes a pinned tooltip.
  useEffect(() => {
    if (!pinned) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as Element).closest("[data-perk-ui]")) setPinned(null);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [pinned]);

  const scale = cameraScale(camera, viewport);
  const showLabels = scale > 1.4;

  const handleClick = (perkId: PerkId, e: React.MouseEvent) => {
    if (pointerType.current === "touch" || pointerType.current === "pen") {
      // First tap shows details; second tap acts.
      if (pinned !== perkId) {
        setPinned(perkId);
        return;
      }
    }
    if (e.shiftKey) onRemove(perkId);
    else onClickPerk(perkId);
  };

  const tooltipAnchor = active ? project(toWorld(index.perkById.get(active)!.perk.position, box), camera, viewport) : null;

  return (
    <div
      className="absolute inset-0 transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0, pointerEvents: "none" }}
    >
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        {skill.name} constellation, skill level {getSkillLevel(build, skill.id)}. Tab through the perks; Enter unlocks, Delete removes a rank,
        left and right arrows switch constellation, Escape returns to the sky.
      </h2>
      <ul aria-label={`${skill.name} perks`} className="contents">
        {skill.perks.map((perk) => {
          const state = getPerkState(index, build, perk.id);
          const pt = project(toWorld(perk.position, box), camera, viewport);
          const rankText = state.maxRank > 1 ? `, rank ${state.rank} of ${state.maxRank}` : "";
          return (
            <li key={perk.id} className="contents">
              <button
                type="button"
                data-perk-ui
                className="perk-hit absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ left: pt.x, top: pt.y, pointerEvents: visible ? "auto" : "none", ["--accent" as string]: skill.color }}
                aria-label={`${perk.name}, ${STATUS_LABEL[state.status]}${rankText}`}
                aria-describedby={active === perk.id ? `tooltip-${perk.id}` : undefined}
                onPointerDown={(e) => (pointerType.current = e.pointerType)}
                onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(perk.id)}
                onPointerLeave={() => setHovered((h) => (h === perk.id ? null : h))}
                onFocus={(e) => e.currentTarget.matches(":focus-visible") && setFocused(perk.id)}
                onBlur={() => setFocused((f) => (f === perk.id ? null : f))}
                onClick={(e) => handleClick(perk.id, e)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onRemove(perk.id);
                }}
                onKeyDown={(e) => {
                  pointerType.current = "keyboard";
                  if (e.key === "Delete" || e.key === "Backspace") {
                    e.preventDefault();
                    onRemove(perk.id);
                  }
                }}
              />
              {showLabels && (
                <span
                  aria-hidden
                  className={`perk-label pointer-events-none absolute -translate-x-1/2 whitespace-nowrap font-display uppercase tracking-wide ${
                    state.status === "locked" ? "text-slate-400/70" : "text-slate-100"
                  }`}
                  style={{ left: pt.x, top: pt.y + 16, fontSize: Math.min(15, 9 + scale * 1.3) }}
                >
                  {perk.name}
                  {state.maxRank > 1 && (
                    <span className="ml-1 tabular-nums" style={{ color: skill.color }}>
                      {state.rank}/{state.maxRank}
                    </span>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {visible && active && tooltipAnchor && (
        <div data-perk-ui className="contents">
          <PerkTooltip
            id={`tooltip-${active}`}
            perkId={active}
            skill={skill}
            build={build}
            index={index}
            anchor={tooltipAnchor}
            viewport={viewport}
            readOnly={readOnly}
            showActions={pinned === active}
            onAdd={() => onAdd(active)}
            onRemove={() => onRemove(active)}
            onClose={() => setPinned(null)}
          />
        </div>
      )}
    </div>
  );
}
