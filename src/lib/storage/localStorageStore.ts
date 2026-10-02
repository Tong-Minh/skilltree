import type { Build, BuildStore } from "@/lib/types";

const KEY = "skilltree:build:v1";

/**
 * Saves the build in this browser. Reads/writes are wrapped because storage
 * can be unavailable (private windows, blocked site data).
 */
export function createLocalStorageStore(key = KEY): BuildStore {
  return {
    async load() {
      try {
        const text = window.localStorage.getItem(key);
        return text ? (JSON.parse(text) as Build) : null;
      } catch {
        return null;
      }
    },
    async save(build) {
      try {
        window.localStorage.setItem(key, JSON.stringify(build));
      } catch {
        // Storage full or blocked: the build still works for this session.
      }
    },
  };
}
