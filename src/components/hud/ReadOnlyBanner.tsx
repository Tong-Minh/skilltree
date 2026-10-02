"use client";

import { useBuild } from "@/state/BuildProvider";

export function ReadOnlyBanner() {
  const { readOnly, dispatch } = useBuild();
  if (!readOnly) return null;
  return (
    <div
      role="region"
      aria-label="Shared build"
      className="hud-bar pointer-events-auto mx-auto mt-2 flex w-fit max-w-[calc(100%-1.5rem)] flex-wrap items-center justify-center gap-x-4 gap-y-2 px-5 py-2 text-sm"
      data-no-pan
    >
      <span className="text-slate-200">Viewing a shared build (read-only)</span>
      <div className="flex gap-2">
        <button type="button" className="hud-button hud-button-primary" onClick={() => dispatch({ type: "adopt-shared" })}>
          Copy into my build
        </button>
        <button type="button" className="hud-button" onClick={() => dispatch({ type: "exit-shared" })}>
          Back to my build
        </button>
      </div>
    </div>
  );
}
