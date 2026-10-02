"use client";

import { useEffect } from "react";
import { useBuild } from "@/state/BuildProvider";

export function Toast() {
  const { state, dispatch } = useBuild();
  const notice = state.notice;

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => dispatch({ type: "dismiss-notice" }), notice.tone === "error" ? 3500 : 2500);
    return () => clearTimeout(t);
  }, [notice, dispatch]);

  return (
    <div aria-live="polite" role="status" className="pointer-events-none absolute inset-x-0 bottom-52 z-40 flex justify-center px-4">
      {notice && (
        <div
          key={notice.id}
          className={`hud-bar toast-in px-5 py-2 text-sm ${notice.tone === "error" ? "text-rose-200" : "text-slate-100"}`}
        >
          {notice.text}
        </div>
      )}
    </div>
  );
}
