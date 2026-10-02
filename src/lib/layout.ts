import { CONSTELLATION_SIZE, SKY_HEIGHT, SKY_WIDTH } from "./constants";
import type { Point, Skill, SkillId } from "./types";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SkyLayout {
  width: number;
  height: number;
  /** Constellation box for each skill, in world units. */
  boxes: Map<SkillId, Box>;
}

const PORTRAIT_CELL = 300;

/**
 * Where each constellation sits in the sky. Landscape screens use the
 * positions from the data file; narrow portrait screens get an automatic
 * two-column grid so constellations stay big enough to read.
 */
export function skyLayout(skills: Skill[], viewport: Viewport): SkyLayout {
  const portrait = viewport.width / Math.max(1, viewport.height) < 0.85;
  const boxes = new Map<SkillId, Box>();

  if (!portrait) {
    for (const skill of skills) {
      boxes.set(skill.id, boxAround(skill.skyPosition, CONSTELLATION_SIZE * (skill.skyScale ?? 1)));
    }
    return { width: SKY_WIDTH, height: SKY_HEIGHT, boxes };
  }

  const cols = 2;
  skills.forEach((skill, i) => {
    const center = {
      x: PORTRAIT_CELL / 2 + (i % cols) * PORTRAIT_CELL,
      y: PORTRAIT_CELL / 2 + Math.floor(i / cols) * PORTRAIT_CELL - 15,
    };
    boxes.set(skill.id, boxAround(center, CONSTELLATION_SIZE));
  });
  return { width: cols * PORTRAIT_CELL, height: Math.ceil(skills.length / cols) * PORTRAIT_CELL, boxes };
}

export function boxAround(center: Point, size: number): Box {
  return { x: center.x - size / 2, y: center.y - size / 2, w: size, h: size };
}

/** Perk/art coordinates (0–100) → world coordinates. */
export function toWorld(local: Point, box: Box): Point {
  return { x: box.x + (local.x / 100) * box.w, y: box.y + (local.y / 100) * box.h };
}

/**
 * The camera view box that shows `box` as large as possible inside the
 * viewport minus `insets`. The result always has the viewport's aspect
 * ratio, so world → screen is a plain scale + offset (see `project`).
 */
export function fitBox(box: Box, viewport: Viewport, insets: Insets): Box {
  const availW = Math.max(1, viewport.width - insets.left - insets.right);
  const availH = Math.max(1, viewport.height - insets.top - insets.bottom);
  const scale = Math.min(availW / box.w, availH / box.h);
  const w = viewport.width / scale;
  const h = viewport.height / scale;
  // Centre `box` within the available area, then offset by the insets.
  const x = box.x - (insets.left + (availW - box.w * scale) / 2) / scale;
  const y = box.y - (insets.top + (availH - box.h * scale) / 2) / scale;
  return { x, y, w, h };
}

/** Screen pixels per world unit for a camera box. */
export function cameraScale(camera: Box, viewport: Viewport): number {
  return viewport.width / camera.w;
}

export function project(pt: Point, camera: Box, viewport: Viewport): Point {
  const s = cameraScale(camera, viewport);
  return { x: (pt.x - camera.x) * s, y: (pt.y - camera.y) * s };
}

export function unproject(screen: Point, camera: Box, viewport: Viewport): Point {
  const s = cameraScale(camera, viewport);
  return { x: camera.x + screen.x / s, y: camera.y + screen.y / s };
}

/** Interpolate cameras: centre moves linearly, zoom changes geometrically. */
export function lerpBox(a: Box, b: Box, t: number): Box {
  const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const w = a.w * Math.pow(b.w / a.w, t);
  const h = a.h * Math.pow(b.h / a.h, t);
  const cx = ca.x + (cb.x - ca.x) * t;
  const cy = ca.y + (cb.y - ca.y) * t;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Zoom by `factor` (>1 zooms in) keeping the world point under `anchor` fixed. */
export function zoomBox(camera: Box, factor: number, anchor: Point): Box {
  const w = camera.w / factor;
  const h = camera.h / factor;
  return {
    x: anchor.x - (anchor.x - camera.x) / factor,
    y: anchor.y - (anchor.y - camera.y) / factor,
    w,
    h,
  };
}

/** Keep a user-adjusted camera near `home`: zoom within limits, centre within reach. */
export function clampCamera(camera: Box, home: Box, minZoom = 0.6, maxZoom = 3): Box {
  const zoom = home.w / camera.w;
  let box = camera;
  if (zoom < minZoom || zoom > maxZoom) {
    const target = Math.min(maxZoom, Math.max(minZoom, zoom));
    const c = { x: camera.x + camera.w / 2, y: camera.y + camera.h / 2 };
    const w = home.w / target;
    const h = home.h / target;
    box = { x: c.x - w / 2, y: c.y - h / 2, w, h };
  }
  const homeC = { x: home.x + home.w / 2, y: home.y + home.h / 2 };
  const reachX = home.w / 2;
  const reachY = home.h / 2;
  const cx = Math.min(homeC.x + reachX, Math.max(homeC.x - reachX, box.x + box.w / 2));
  const cy = Math.min(homeC.y + reachY, Math.max(homeC.y - reachY, box.y + box.h / 2));
  return { x: cx - box.w / 2, y: cy - box.h / 2, w: box.w, h: box.h };
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
