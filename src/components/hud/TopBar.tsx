"use client";

import { useRef, useState } from "react";
import { MAX_CHARACTER_LEVEL, MIN_CHARACTER_LEVEL } from "@/lib/constants";
import { availablePoints, minCharacterLevel } from "@/lib/rules";
import { playCharacterLevelUp } from "@/lib/sound";
import { useMuted } from "@/hooks/useMuted";
import { useBuild } from "@/state/BuildProvider";
import { ConfirmButton } from "./ConfirmButton";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers/contexts without the async clipboard API.
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export function TopBar() {
  const { build, readOnly, dispatch, shareUrl } = useBuild();
  const [muted, setMuted] = useMuted();
  const [copied, setCopied] = useState(false);
  const points = availablePoints(build);
  const minLevel = minCharacterLevel(build);
  // Level when the current drag/keypress started, to play the sound once per change.
  const startLevel = useRef<number | null>(null);
  const begin = () => {
    startLevel.current ??= build.characterLevel;
  };
  const commit = () => {
    if (startLevel.current !== null && build.characterLevel > startLevel.current) playCharacterLevelUp();
    startLevel.current = null;
  };

  const copy = async () => {
    const ok = await copyText(shareUrl());
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      dispatch({ type: "notify", text: "Build link copied to clipboard." });
    } else {
      dispatch({ type: "notify", text: "Couldn't copy the link. Your browser blocked clipboard access.", tone: "error" });
    }
  };

  return (
    <header className="pointer-events-auto flex flex-col items-center gap-2 px-3 pt-3" data-no-pan>
      <div className="hud-bar flex w-full max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-2 sm:px-6">
        <label className="order-1 flex min-w-0 items-baseline gap-2">
          <span className="hud-label hidden sm:inline">Name</span>
          <input
            className="hud-input w-28 sm:w-40"
            value={build.characterName}
            maxLength={40}
            readOnly={readOnly}
            onChange={(e) => dispatch({ type: "set-name", name: e.target.value })}
            aria-label="Character name"
          />
        </label>

        <div className="order-3 flex basis-full items-center gap-3 sm:order-2 sm:max-w-xs sm:flex-1 sm:basis-auto">
          <label htmlFor="char-level" className="hud-label">
            Level
          </label>
          <span className="font-display text-2xl tabular-nums text-white" aria-hidden>
            {build.characterLevel}
          </span>
          <input
            id="char-level"
            type="range"
            className="hud-range flex-1"
            min={MIN_CHARACTER_LEVEL}
            max={MAX_CHARACTER_LEVEL}
            value={build.characterLevel}
            disabled={readOnly}
            onPointerDown={begin}
            onKeyDown={begin}
            onPointerUp={commit}
            onKeyUp={commit}
            onBlur={commit}
            onChange={(e) => {
              begin();
              dispatch({ type: "set-character-level", level: Number(e.target.value) });
            }}
            aria-valuetext={`Level ${build.characterLevel}${minLevel > MIN_CHARACTER_LEVEL ? `, minimum ${minLevel} for spent perks` : ""}`}
          />
        </div>

        <div className="order-2 flex items-center gap-2 sm:order-3">
          <button
            type="button"
            className="hud-button"
            aria-pressed={muted}
            aria-label={muted ? "Unmute sound" : "Mute sound"}
            title={muted ? "Unmute" : "Mute"}
            onClick={() => setMuted(!muted)}
          >
            {muted ? "♪̸" : "♪"}
          </button>
          <button type="button" className="hud-button" onClick={copy}>
            {copied ? "Copied!" : (
              <>
                Copy <span className="hidden sm:inline">build</span> link
              </>
            )}
          </button>
          {!readOnly && (
            <ConfirmButton confirmLabel="Reset everything?" onConfirm={() => dispatch({ type: "reset-all" })}>
              Reset all
            </ConfirmButton>
          )}
        </div>
      </div>

      <div className="hud-bar hud-bar-small px-6 py-1" role="status" aria-live="polite">
        <span className="font-display text-lg tracking-wide text-white">
          {points > 0 ? (
            <>
              Perks to spend: <span className="tabular-nums">{points}</span>
            </>
          ) : (
            <span className="text-slate-300">No perk points — raise your level</span>
          )}
        </span>
      </div>
    </header>
  );
}
