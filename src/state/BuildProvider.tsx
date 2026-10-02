"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { INDEX } from "@/lib/content";
import { normalizeBuild, type SkillIndex } from "@/lib/rules";
import { buildShareUrl, decodeBuild, decodeErrorMessage, SHARE_PARAM } from "@/lib/share";
import { createLocalStorageStore } from "@/lib/storage/localStorageStore";
import type { Build, BuildStore } from "@/lib/types";
import { buildReducer, initialState, type BuildAction, type BuildState } from "./buildReducer";

interface BuildContextValue {
  index: SkillIndex;
  state: BuildState;
  /** The build on screen: the shared one while viewing a link, else your own. */
  build: Build;
  readOnly: boolean;
  dispatch: (action: BuildAction) => void;
  /** Share link for the build on screen. */
  shareUrl: () => string;
}

const BuildContext = createContext<BuildContextValue | null>(null);

function removeShareParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(SHARE_PARAM)) return;
  url.searchParams.delete(SHARE_PARAM);
  window.history.replaceState(window.history.state, "", url);
}

export function BuildProvider({ children, store: storeProp }: { children: ReactNode; store?: BuildStore }) {
  const store = useMemo(() => storeProp ?? createLocalStorageStore(), [storeProp]);
  const [state, dispatchRaw] = useReducer(
    (s: BuildState, a: BuildAction) => buildReducer(INDEX, s, a),
    INDEX,
    initialState,
  );

  // Load saved build + shared link once.
  useEffect(() => {
    let cancelled = false;
    const param = new URL(window.location.href).searchParams.get(SHARE_PARAM);
    void (async () => {
      const own = normalizeBuild(INDEX, await store.load());
      if (cancelled) return;
      let shared: Build | null = null;
      let notice: string | undefined;
      if (param) {
        const result = decodeBuild(INDEX, param);
        if (result.ok) shared = result.build;
        else {
          notice = decodeErrorMessage(result.error);
          removeShareParam();
        }
      }
      dispatchRaw({ type: "hydrate", own, shared, notice });
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  // Save your own build after changes (debounced).
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!state.loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void store.save(state.own), 250);
    return () => clearTimeout(saveTimer.current);
  }, [state.own, state.loaded, store]);

  const dispatch = useCallback((action: BuildAction) => {
    if (action.type === "adopt-shared" || action.type === "exit-shared") removeShareParam();
    dispatchRaw(action);
  }, []);

  const build = state.shared ?? state.own;
  const shareUrl = useCallback(() => buildShareUrl(INDEX, build, window.location.href), [build]);

  const value = useMemo<BuildContextValue>(
    () => ({ index: INDEX, state, build, readOnly: state.shared !== null, dispatch, shareUrl }),
    [state, build, dispatch, shareUrl],
  );

  return <BuildContext.Provider value={value}>{children}</BuildContext.Provider>;
}

export function useBuild(): BuildContextValue {
  const value = useContext(BuildContext);
  if (!value) throw new Error("useBuild must be used inside <BuildProvider>");
  return value;
}
