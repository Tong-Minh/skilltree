"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { Point } from "@/lib/types";

interface Options {
  enabled: boolean;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (factor: number, screen: Point) => void;
  /** A quick horizontal flick: "next" for right-to-left. */
  onSwipe: (direction: "prev" | "next") => void;
}

const INTERACTIVE = "button, a, input, select, textarea, [role='button'], [data-no-pan]";

/** Drag to pan, pinch/wheel to zoom, flick to rotate. Pointer events cover mouse, pen and touch. */
export function useGestures(ref: RefObject<HTMLElement | null>, options: Options) {
  const opts = useRef(options);
  opts.current = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const pointers = new Map<number, Point>();
    let flick: { x: number; y: number; t: number } | null = null;
    let pinchDist = 0;

    const local = (e: { clientX: number; clientY: number }): Point => {
      const rect = el.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const centre = () => {
      const [a, b] = [...pointers.values()];
      return { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2, d: Math.hypot(a!.x - b!.x, a!.y - b!.y) };
    };

    const down = (e: PointerEvent) => {
      if (!opts.current.enabled) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // Single-pointer gestures that start on a control belong to the control.
      if (pointers.size === 0 && (e.target as Element).closest(INTERACTIVE)) return;
      pointers.set(e.pointerId, local(e));
      el.setPointerCapture?.(e.pointerId);
      if (pointers.size === 1) flick = { ...local(e), t: performance.now() };
      if (pointers.size === 2) {
        pinchDist = centre().d;
        flick = null;
      }
    };

    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const before = pointers.size === 2 ? centre() : null;
      const next = local(e);
      pointers.set(e.pointerId, next);
      if (pointers.size === 1) {
        opts.current.panBy(next.x - prev.x, next.y - prev.y);
      } else if (before && pointers.size === 2) {
        const after = centre();
        if (pinchDist > 0) opts.current.zoomAt(after.d / pinchDist, after);
        pinchDist = after.d;
        opts.current.panBy(after.x - before.x, after.y - before.y);
      }
    };

    const up = (e: PointerEvent) => {
      const last = pointers.get(e.pointerId);
      if (!last) return;
      pointers.delete(e.pointerId);
      if (flick && pointers.size === 0) {
        const dx = last.x - flick.x;
        const dy = last.y - flick.y;
        if (performance.now() - flick.t < 350 && Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy)) {
          opts.current.onSwipe(dx < 0 ? "next" : "prev");
        }
      }
      if (pointers.size < 2) pinchDist = 0;
      if (pointers.size === 0) flick = null;
    };

    const wheel = (e: WheelEvent) => {
      if (!opts.current.enabled) return;
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      opts.current.zoomAt(Math.exp(-delta * 0.0015), local(e));
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [ref]);
}
