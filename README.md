# Skill Constellations

A star-chart skill tree planner, in the spirit of classic RPG constellation menus, with original computer-science skills and perks.

Six constellations (Algorithms, Systems, Networks, Databases, Security, Compilers) sit in an animated starfield. Click one to fly into it, spend perk points on glowing stars, and share your build as a short link.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` then `npm start` | Production build and server |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript check |

## How it works

- **Character level** (1–81) gives one perk point per level gained, so level 81 has 80 points.
- **Skill levels** (15–100) are set with the slider in each constellation.
- A perk can be unlocked when you have a point, the skill level meets the rank's requirement, and at least one parent perk is unlocked (root perks have no parents).
- Perks can have up to 3 ranks, each with its own skill requirement.
- Clicking a perk adds a rank; clicking it at max rank refunds it. A perk can't be removed while an unlocked child depends on it only through it. Right-click, Shift-click or Delete removes a single rank.
- Sliders can't drop below what your unlocked perks need.

### Controls

| Action | Mouse / keyboard | Touch |
|---|---|---|
| Open a constellation | Click it, or Tab + Enter | Tap |
| Switch constellation | ← / → or the ‹ › buttons | Swipe |
| Back to the sky | Esc or "Back to sky" | "Back to sky" |
| Perk details | Hover or Tab to it | Tap once |
| Unlock / rank up | Click or Enter | Tap again, or "Unlock" |
| Zoom / pan | Wheel / drag | Pinch / drag |

Reduced-motion preferences are respected (no camera flights, twinkle or pulses).

## Sharing

"Copy build link" puts the build in the URL as `?b=<code>` (about 26 characters). Opening a link shows that build read-only, with a button to copy it into your own build. Your own build is saved in the browser's localStorage.

Links store perks by position, so **appending** perks to the data is safe, but reordering, renaming or removing them makes old links show a "trees have changed" message instead of loading.

## Editing content

All skills and perks live in [`src/data/skills.ts`](src/data/skills.ts). Each perk has an id, name, description, ranks (with skill-level requirements), parent ids and an x/y position (0–100) inside its constellation. Each skill has a theme color, a position in the sky and optional outline art.

The content is validated on startup and in tests (`src/lib/validate.ts`): missing parents, cycles, bad rank requirements and out-of-range positions fail loudly.

## Sounds

The app plays a level-up sound when a skill level increases and ambient music after the first click (browsers block autoplay). The ♪ button mutes both.

```
public/sounds/skill-level-up.mp3
public/sounds/ambient-music.mp3
```

These are third-party game audio, © Bethesda Softworks, included for personal use only and not covered by this project's code:

- `ambient-music.mp3`: "Harvest Dawn", track 04 from *The Elder Scrolls IV: Oblivion* soundtrack
- `skill-level-up.mp3`: the skill level-up sound from *The Elder Scrolls V: Skyrim*

Replace them with your own files to swap the sounds; paths are set in [`src/lib/sound.ts`](src/lib/sound.ts). Without the files the app runs silently.

## Project layout

```
src/
  app/            Next.js App Router entry (layout, page, global styles)
  data/skills.ts  All skill and perk content
  lib/            Pure logic: rules, validation, share-link encoding, camera math, sound
  lib/storage/    Persistence (localStorage today)
  state/          Build reducer + React provider
  components/     Starfield canvas, SVG constellations, HTML perk/sky layers, HUD
  hooks/          Camera animation, gestures, viewport, reduced motion
```

### Swapping storage for a database

Components never touch storage directly. `BuildProvider` takes a `BuildStore` (`load()` / `save()`); to persist builds in Neon or anywhere else, implement that interface and pass it in:

```tsx
<BuildProvider store={myNeonStore}>
```

## Stack

Next.js (App Router), React, TypeScript, Tailwind CSS v4, Vitest. A Neon project is linked (`neon.ts`) for future persistence, but v1 has no backend.
