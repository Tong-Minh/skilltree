/*
 * Audio. Change these paths to swap the sounds.
 *
 * Browsers block audio until the user interacts with the page, so music
 * starts from `startMusic()`, which the app calls on the first click/key.
 */
export const SKILL_LEVEL_UP_SOUND = "/sounds/skill-level-up.mp3";
export const AMBIENT_MUSIC = "/sounds/ambient-music.mp3";

const MUTE_KEY = "skilltree:muted";
const MUSIC_VOLUME = 0.25;
const EFFECT_VOLUME = 0.6;

let effect: HTMLAudioElement | null = null;
let music: HTMLAudioElement | null = null;
let musicStarted = false;
let fadeTimer: ReturnType<typeof setInterval> | undefined;
let muted = readMuted();
const listeners = new Set<() => void>();

function readMuted(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function fadeTo(audio: HTMLAudioElement, volume: number, ms: number, done?: () => void) {
  clearInterval(fadeTimer);
  const start = audio.volume;
  const t0 = performance.now();
  fadeTimer = setInterval(() => {
    const t = Math.min(1, (performance.now() - t0) / ms);
    audio.volume = start + (volume - start) * t;
    if (t >= 1) {
      clearInterval(fadeTimer);
      done?.();
    }
  }, 50);
}

export function isMuted(): boolean {
  return muted;
}

export function subscribeMuted(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setMuted(next: boolean): void {
  muted = next;
  try {
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    // Not persisted; still applies for this session.
  }
  if (music && musicStarted) {
    if (next) fadeTo(music, 0, 300, () => music?.pause());
    else {
      void music.play().catch(() => {});
      fadeTo(music, MUSIC_VOLUME, 1200);
    }
  }
  listeners.forEach((l) => l());
}

/** Start the ambient music (once). Call from a user gesture. */
export function startMusic(): void {
  if (musicStarted || typeof window === "undefined") return;
  try {
    music ??= new Audio(AMBIENT_MUSIC);
    music.loop = true;
    music.volume = 0;
    musicStarted = true;
    if (muted) return;
    void music
      .play()
      .then(() => fadeTo(music!, MUSIC_VOLUME, 2500))
      .catch(() => {
        musicStarted = false; // blocked; try again on the next gesture
      });
  } catch {
    // No audio support.
  }
}

export function playSkillLevelUp(): void {
  if (muted || typeof window === "undefined") return;
  try {
    effect ??= new Audio(SKILL_LEVEL_UP_SOUND);
    effect.volume = EFFECT_VOLUME;
    effect.currentTime = 0;
    void effect.play().catch(() => {});
  } catch {
    // No audio support.
  }
}
