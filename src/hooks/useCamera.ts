"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clampCamera, easeInOutCubic, lerpBox, unproject, zoomBox, type Box, type Viewport } from "@/lib/layout";
import type { Point } from "@/lib/types";

const sameBox = (a: Box, b: Box) =>
  Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6 && Math.abs(a.w - b.w) < 1e-6 && Math.abs(a.h - b.h) < 1e-6;

export interface Camera {
  box: Box;
  /** Live value for animation loops that shouldn't re-render (e.g. the starfield). */
  boxRef: React.RefObject<Box>;
  animating: boolean;
  /** Pan by a screen-pixel delta. */
  panBy: (dx: number, dy: number) => void;
  /** Zoom by `factor` around a screen point. */
  zoomAt: (factor: number, screen: Point) => void;
}

/**
 * Animated camera. When `target` changes the camera flies there; when the
 * viewport is resized it snaps. Users can pan/zoom around the target when
 * `interactive` is set.
 */
export function useCamera(
  target: Box,
  viewport: Viewport,
  { reducedMotion, interactive, duration = 1000 }: { reducedMotion: boolean; interactive: boolean; duration?: number },
): Camera {
  const [box, setBox] = useState(target);
  const [animating, setAnimating] = useState(false);
  const boxRef = useRef(target);
  const frame = useRef<number | null>(null);
  const lastViewport = useRef(viewport);
  const lastTarget = useRef(target);

  const set = useCallback((next: Box) => {
    boxRef.current = next;
    setBox(next);
  }, []);

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setAnimating(false);
  }, []);

  useEffect(() => {
    const resized =
      lastViewport.current.width !== viewport.width || lastViewport.current.height !== viewport.height;
    const moved = !sameBox(lastTarget.current, target);
    lastViewport.current = viewport;
    lastTarget.current = target;
    if (!moved && !resized) return;

    stop();
    if (resized || reducedMotion) {
      set(target);
      return;
    }

    const from = boxRef.current;
    const start = performance.now();
    setAnimating(true);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      set(lerpBox(from, target, easeInOutCubic(t)));
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else {
        frame.current = null;
        setAnimating(false);
      }
    };
    frame.current = requestAnimationFrame(tick);
  }, [target, viewport, reducedMotion, duration, set, stop]);

  useEffect(() => stop, [stop]);

  const panBy = useCallback(
    (dx: number, dy: number) => {
      if (!interactive) return;
      stop();
      const cur = boxRef.current;
      const s = viewport.width / cur.w;
      set(clampCamera({ ...cur, x: cur.x - dx / s, y: cur.y - dy / s }, lastTarget.current));
    },
    [interactive, viewport, set, stop],
  );

  const zoomAt = useCallback(
    (factor: number, screen: Point) => {
      if (!interactive) return;
      stop();
      const cur = boxRef.current;
      set(clampCamera(zoomBox(cur, factor, unproject(screen, cur, viewport)), lastTarget.current));
    },
    [interactive, viewport, set, stop],
  );

  return { box, boxRef, animating, panBy, zoomAt };
}
