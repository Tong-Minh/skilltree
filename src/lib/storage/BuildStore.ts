/*
 * Persistence boundary.
 *
 * Components never touch storage directly: BuildProvider receives a
 * `BuildStore` and calls `load()` once and `save()` after changes.
 *
 * To move to Neon, add e.g. `neonStore.ts` that implements the same interface
 * by calling your Neon Function (NEON_FUNCTION_API_BASE_URL), and pass it to
 * <BuildProvider store={...}>. No component changes are needed.
 */
export type { BuildStore } from "@/lib/types";
export { createLocalStorageStore } from "./localStorageStore";
