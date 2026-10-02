"use client";

import { useEffect, useState, type RefObject } from "react";
import type { Viewport } from "@/lib/layout";

/** Size of an element, kept up to date with ResizeObserver. */
export function useViewport(ref: RefObject<HTMLElement | null>): Viewport | null {
  const [size, setSize] = useState<Viewport | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize((prev) =>
        prev && prev.width === rect.width && prev.height === rect.height ? prev : { width: rect.width, height: rect.height },
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
