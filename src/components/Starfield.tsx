"use client";

import { useEffect, useRef } from "react";
import type { Box, SkyLayout, Viewport } from "@/lib/layout";
import type { Skill, SkillId } from "@/lib/types";

interface Props {
  cameraRef: React.RefObject<Box>;
  viewport: Viewport;
  layout: SkyLayout;
  skills: Skill[];
  focused: SkillId | null;
  reducedMotion: boolean;
}

interface Star {
  x: number; // 0–1 of the parallax field
  y: number;
  r: number;
  base: number;
  speed: number;
  phase: number;
  depth: number; // 0.15 (far) – 0.6 (near)
  tint: string;
}

// Deterministic so the sky looks the same every visit.
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TINTS = ["255,255,255", "200,220,255", "255,236,210", "210,240,255"];

function makeStars(count: number): Star[] {
  const rand = rng(1337);
  return Array.from({ length: count }, () => {
    const depth = 0.15 + rand() * 0.45;
    return {
      x: rand(),
      y: rand(),
      r: 0.3 + Math.pow(rand(), 3) * 1.6,
      base: 0.25 + rand() * 0.6,
      speed: 0.4 + rand() * 1.6,
      phase: rand() * Math.PI * 2,
      depth,
      tint: TINTS[Math.floor(rand() * TINTS.length)]!,
    };
  });
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/**
 * Background canvas: nebula clouds tinted by each constellation (fixed in
 * the world, so they move with the camera) and stars on parallax layers.
 */
export function Starfield({ cameraRef, viewport, layout, skills, focused, reducedMotion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const props = useRef({ layout, skills, focused, reducedMotion });
  props.current = { layout, skills, focused, reducedMotion };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(viewport.width * dpr);
    canvas.height = Math.round(viewport.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const stars = makeStars(Math.round(Math.min(1400, (viewport.width * viewport.height) / 900)));
    const extraClouds = (() => {
      const rand = rng(42);
      return Array.from({ length: 7 }, () => ({ x: rand(), y: rand(), r: 0.25 + rand() * 0.35, hue: rand() }));
    })();
    // Focus fade for the nebulae (0 = sky, 1 = focused).
    const glow = new Map<SkillId, number>();

    let frame = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { layout, skills, focused, reducedMotion } = props.current;
      const cam = cameraRef.current;
      const scale = viewport.width / cam.w;
      const { width, height } = viewport;

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#03040a";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      // Loose background clouds, spread across the sky.
      for (const c of extraClouds) {
        const x = (c.x * layout.width * 1.4 - layout.width * 0.2 - cam.x) * scale;
        const y = (c.y * layout.height * 1.4 - layout.height * 0.2 - cam.y) * scale;
        const r = c.r * layout.width * scale;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const col = c.hue < 0.5 ? "60,90,170" : "120,70,150";
        g.addColorStop(0, `rgba(${col},0.10)`);
        g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }

      // One nebula per constellation, brighter when focused.
      for (const skill of skills) {
        const box = layout.boxes.get(skill.id);
        if (!box) continue;
        const want = focused === null ? 0.55 : focused === skill.id ? 1 : 0.3;
        const cur = glow.get(skill.id) ?? want;
        const next = reducedMotion ? want : cur + (want - cur) * Math.min(1, dt * 3);
        glow.set(skill.id, next);

        const x = (box.x + box.w / 2 - cam.x) * scale;
        const y = (box.y + box.h / 2 - cam.y) * scale;
        const r = box.w * 0.95 * scale;
        const rgb = hexToRgb(skill.color);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${rgb},${0.22 * next})`);
        g.addColorStop(0.45, `rgba(${rgb},${0.09 * next})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }

      // Stars: each layer moves a fraction of the camera's motion.
      const cx = cam.x + cam.w / 2;
      const cy = cam.y + cam.h / 2;
      const zoom = layout.width / cam.w;
      const t = now / 1000;
      for (const s of stars) {
        const parallaxZoom = 1 + (zoom - 1) * s.depth * 0.35;
        let x = (s.x - 0.5) * width * 1.3 * parallaxZoom - (cx - layout.width / 2) * s.depth * scale * 0.5;
        let y = (s.y - 0.5) * height * 1.3 * parallaxZoom - (cy - layout.height / 2) * s.depth * scale * 0.5;
        // Wrap so the field never runs out.
        const spanX = width * 1.3 * parallaxZoom;
        const spanY = height * 1.3 * parallaxZoom;
        x = ((((x + spanX / 2) % spanX) + spanX) % spanX) - spanX / 2 + width / 2;
        y = ((((y + spanY / 2) % spanY) + spanY) % spanY) - spanY / 2 + height / 2;
        if (x < -4 || y < -4 || x > width + 4 || y > height + 4) continue;

        const twinkle = reducedMotion ? 1 : 0.65 + 0.35 * Math.sin(t * s.speed + s.phase);
        const alpha = s.base * twinkle;
        const r = s.r * (0.8 + s.depth);
        ctx.fillStyle = `rgba(${s.tint},${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        if (r > 1.3) {
          ctx.fillStyle = `rgba(${s.tint},${alpha * 0.15})`;
          ctx.beginPath();
          ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [viewport, cameraRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ width: viewport.width, height: viewport.height }}
    />
  );
}
