"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fitBox, skyLayout, type Box, type Insets, type Viewport } from "@/lib/layout";
import { startMusic } from "@/lib/sound";
import type { PerkId, SkillId } from "@/lib/types";
import { useCamera } from "@/hooks/useCamera";
import { useGestures } from "@/hooks/useGestures";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useViewport } from "@/hooks/useViewport";
import { useBuild } from "@/state/BuildProvider";
import { ConstellationSvg, glowId } from "./ConstellationSvg";
import { PerkLayer } from "./PerkLayer";
import { SkyLayer } from "./SkyLayer";
import { Starfield } from "./Starfield";
import { ReadOnlyBanner } from "./hud/ReadOnlyBanner";
import { SkillPanel } from "./hud/SkillPanel";
import { SkillRow } from "./hud/SkillRow";
import { Toast } from "./hud/Toast";
import { TopBar } from "./hud/TopBar";

const SIDE_INSET = 16;

/** Replays unlock effects only for perks that just gained a rank (not on load). */
function useUnlockGen(perkRanks: Record<PerkId, number>, loaded: boolean) {
  const prev = useRef<Record<PerkId, number> | null>(null);
  const [gen, setGen] = useState<ReadonlyMap<PerkId, number>>(new Map());
  useEffect(() => {
    if (!loaded) return;
    const before = prev.current;
    prev.current = perkRanks;
    if (!before) return;
    const ups = Object.keys(perkRanks).filter((id) => (perkRanks[id] ?? 0) > (before[id] ?? 0));
    // Bulk changes (copying a shared build) shouldn't set off fireworks.
    if (ups.length === 0 || ups.length > 2) return;
    setGen((g) => {
      const next = new Map(g);
      for (const id of ups) next.set(id, (next.get(id) ?? 0) + 1);
      return next;
    });
  }, [perkRanks, loaded]);
  return gen;
}

function skillFromHash(ids: SkillId[]): SkillId | null {
  const id = decodeURIComponent(window.location.hash.slice(1));
  return ids.includes(id) ? id : null;
}

export function SkillTreeApp() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport(rootRef);
  return (
    <div ref={rootRef} className="relative h-dvh w-full overflow-clip bg-[#03040a] text-slate-100">
      <h1 className="sr-only">Skill constellations</h1>
      {viewport && <Stage viewport={viewport} />}
    </div>
  );
}

function Stage({ viewport }: { viewport: Viewport }) {
  const { index, build, state, readOnly, dispatch } = useBuild();
  const reducedMotion = useReducedMotion();
  const skillIds = useMemo(() => index.skills.map((s) => s.id), [index]);

  const [focused, setFocused] = useState<SkillId | null>(() => skillFromHash(skillIds));
  const [activePerk, setActivePerk] = useState<PerkId | null>(null);
  const focusedSkill = focused ? index.skillById.get(focused)! : null;

  // ---- layout & camera ----------------------------------------------------
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const top = useViewport(topRef);
  const bottom = useViewport(bottomRef);
  const layout = useMemo(() => skyLayout(index.skills, viewport), [index, viewport]);

  const insets: Insets = {
    top: (top?.height ?? 110) + 8,
    bottom: (bottom?.height ?? 80) + 8,
    left: SIDE_INSET,
    right: SIDE_INSET,
  };

  const targetBox: Box = useMemo(() => {
    if (focused) {
      const b = layout.boxes.get(focused)!;
      const pad = b.w * 0.07;
      // Extra room at the bottom for perk labels.
      return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 + b.h * 0.04 };
    }
    return { x: -20, y: -20, w: layout.width + 40, h: layout.height + 50 };
  }, [focused, layout]);

  const target = useMemo(
    () => fitBox(targetBox, viewport, insets),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targetBox, viewport, insets.top, insets.bottom],
  );
  const camera = useCamera(target, viewport, { reducedMotion, interactive: focused !== null });

  // ---- navigation & history ------------------------------------------------
  const skyButtons = useRef(new Map<SkillId, HTMLButtonElement>());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastFocused = useRef<SkillId | null>(focused);

  const open = useCallback(
    (id: SkillId) => {
      const url = `${window.location.pathname}${window.location.search}#${encodeURIComponent(id)}`;
      if (focused === null) window.history.pushState({ skilltree: true }, "", url);
      else window.history.replaceState(window.history.state, "", url);
      setFocused(id);
    },
    [focused],
  );

  const back = useCallback(() => {
    if (window.history.state?.skilltree) {
      window.history.back(); // popstate sets the focus
    } else {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      setFocused(null);
    }
  }, []);

  const rotate = useCallback(
    (step: 1 | -1) => {
      if (!focused) return;
      const i = skillIds.indexOf(focused);
      open(skillIds[(i + step + skillIds.length) % skillIds.length]!);
    },
    [focused, skillIds, open],
  );

  useEffect(() => {
    const onPop = () => setFocused(skillFromHash(skillIds));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [skillIds]);

  // Move keyboard focus with the view.
  useEffect(() => {
    const prev = lastFocused.current;
    lastFocused.current = focused;
    if (focused && focused !== prev) {
      requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    } else if (!focused && prev) {
      requestAnimationFrame(() => skyButtons.current.get(prev)?.focus({ preventScroll: true }));
    }
  }, [focused]);

  // Global keys: arrows rotate, Escape goes back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.closest("input, textarea, select, [contenteditable='true']");
      if (e.key === "Escape" && focused) {
        if (typing && (el as HTMLInputElement).type === "text") return;
        e.preventDefault();
        back();
      } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && focused && !typing) {
        e.preventDefault();
        rotate(e.key === "ArrowRight" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused, back, rotate]);

  // Music starts on the first interaction (browsers block autoplay).
  useEffect(() => {
    const start = () => startMusic();
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, []);

  // ---- gestures --------------------------------------------------------------
  const stageRef = useRef<HTMLDivElement>(null);
  useGestures(stageRef, {
    enabled: focused !== null,
    panBy: camera.panBy,
    zoomAt: camera.zoomAt,
    onSwipe: (dir) => rotate(dir === "next" ? 1 : -1),
  });

  // ---- render ----------------------------------------------------------------
  const unlockGen = useUnlockGen(state.own.perkRanks, state.loaded);
  const registerButton = useCallback((id: SkillId, el: HTMLButtonElement | null) => {
    if (el) skyButtons.current.set(id, el);
    else skyButtons.current.delete(id);
  }, []);
  const onAdd = useCallback((perkId: PerkId) => dispatch({ type: "click-perk", perkId }), [dispatch]);
  const onRemove = useCallback((perkId: PerkId) => dispatch({ type: "remove-rank", perkId }), [dispatch]);
  const cam = camera.box;
  const i = focused ? skillIds.indexOf(focused) : 0;

  return (
    <div
      className="absolute inset-0 transition-opacity duration-700"
      style={{ opacity: state.loaded ? 1 : 0, ["--accent" as string]: focusedSkill?.color ?? "#9fc6ff" }}
    >
      <Starfield
        cameraRef={camera.boxRef}
        viewport={viewport}
        layout={layout}
        skills={index.skills}
        focused={focused}
        reducedMotion={reducedMotion}
      />

      <div ref={stageRef} className="absolute inset-0 touch-none select-none" style={{ cursor: focused ? "grab" : undefined }}>
        <svg
          className="absolute inset-0"
          width={viewport.width}
          height={viewport.height}
          viewBox={`${cam.x} ${cam.y} ${cam.w} ${cam.h}`}
          aria-hidden
        >
          <defs>
            {index.skills.map((skill) => (
              <radialGradient key={skill.id} id={glowId(skill.id)}>
                <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="0.18" stopColor="#ffffff" stopOpacity="0.85" />
                <stop offset="0.4" stopColor={skill.color} stopOpacity="0.45" />
                <stop offset="1" stopColor={skill.color} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>
          {index.skills.map((skill) => (
            <ConstellationSvg
              key={skill.id}
              skill={skill}
              box={layout.boxes.get(skill.id)!}
              build={build}
              index={index}
              mode={focused === null ? "sky" : focused === skill.id ? "focus" : "dim"}
              activePerk={focused === skill.id ? activePerk : null}
              unlockGen={unlockGen}
            />
          ))}
        </svg>

        <SkyLayer
          layout={layout}
          camera={cam}
          viewport={viewport}
          build={build}
          index={index}
          visible={focused === null}
          onOpen={open}
          registerButton={registerButton}
        />

        {focusedSkill && (
          <PerkLayer
            skill={focusedSkill}
            box={layout.boxes.get(focusedSkill.id)!}
            camera={cam}
            viewport={viewport}
            build={build}
            index={index}
            readOnly={readOnly}
            visible={!camera.animating || reducedMotion}
            onAdd={onAdd}
            onRemove={onRemove}
            onClickPerk={onAdd}
            onActiveChange={setActivePerk}
            headingRef={headingRef}
          />
        )}
      </div>

      <div ref={topRef} className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <TopBar />
        <ReadOnlyBanner />
      </div>

      <div ref={bottomRef} className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
        {focusedSkill ? (
          <SkillPanel
            skill={focusedSkill}
            prev={index.skills[(i - 1 + skillIds.length) % skillIds.length]!}
            next={index.skills[(i + 1) % skillIds.length]!}
            onPrev={() => rotate(-1)}
            onNext={() => rotate(1)}
            onBack={back}
          />
        ) : (
          <SkillRow onOpen={open} />
        )}
      </div>

      <Toast />
    </div>
  );
}
