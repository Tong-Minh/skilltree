@AGENTS.md

# Skill Constellations

Constellation-style skill tree planner. Next.js App Router + TypeScript + Tailwind v4, no backend (localStorage + URL share links). See README.md for features and controls.

## Commands

- `npm run dev` — dev server (port 3000)
- `npm test` — Vitest unit tests (`src/**/*.test.ts`)
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — production build

Run `npm test` and `npm run typecheck` after changing anything in `src/lib`, `src/state` or `src/data`.

## Architecture

- `src/data/skills.ts` is the only content file. Perk/skill ORDER is part of the share-link format: append only, or old links stop loading (they show a "content changed" error by design, via a checksum of ids).
- `src/lib/rules.ts` holds all game rules as pure functions over `(SkillIndex, Build)`. Components never implement rules themselves; they dispatch actions to `src/state/buildReducer.ts`, which calls rules.
- `src/lib/share.ts` encodes builds: version byte, 16-bit id checksum, character level, skill levels, then 2 bits per perk rank (max 3 ranks per perk, enforced by `validate.ts`).
- Rendering is split in two layers sharing one camera (`src/lib/layout.ts`, `src/hooks/useCamera.ts`):
  - SVG (`ConstellationSvg.tsx`) draws stars, links and art in world coordinates; it is memoised so camera motion doesn't re-render it.
  - HTML (`PerkLayer.tsx`, `SkyLayer.tsx`) holds buttons, labels and tooltips, positioned with `project()`. The camera box always has the viewport's aspect ratio, so world→screen is a plain scale + offset.
- `Starfield.tsx` is a canvas that reads the camera from a ref (no React re-renders).
- Persistence goes through the `BuildStore` interface (`src/lib/storage/`). To add Neon, implement `BuildStore` and pass it to `<BuildProvider store>`; don't call storage from components.

## Conventions

- Rule decisions (keep consistent): points = character level − 1; a click adds a rank, or refunds the perk at max rank (only to rank 1 if a child depends on it); parents gate only the first rank; sliders clamp to what unlocked perks need; "Reset tree" keeps the skill level.
- Untrusted builds (localStorage, links) always go through `normalizeBuild`.
- Respect reduced motion: CSS animations are disabled in `globals.css`, the camera snaps, and the starfield stops twinkling.
- Keep everything usable by keyboard and touch: perks are real `<button>`s with 44px hit areas; hover-only behaviour needs a tap/focus equivalent.

## Assets

`public/sounds/*.mp3` is gitignored. The local files are third-party (Bethesda) audio and must not be committed to this public repo. Use original or licensed audio if sounds should ship.
