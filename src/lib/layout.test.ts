import { describe, expect, it } from "vitest";
import { clampCamera, fitBox, lerpBox, project, skyLayout, unproject, zoomBox } from "./layout";
import { FIXTURE } from "./test-fixtures";

const viewport = { width: 1000, height: 500 };
const noInsets = { top: 0, right: 0, bottom: 0, left: 0 };

describe("fitBox", () => {
  it("matches the viewport aspect ratio", () => {
    const cam = fitBox({ x: 0, y: 0, w: 100, h: 100 }, viewport, noInsets);
    expect(cam.w / cam.h).toBeCloseTo(2);
    expect(cam.h).toBeCloseTo(100);
  });

  it("centres the box inside the inset area", () => {
    const box = { x: 0, y: 0, w: 100, h: 100 };
    const insets = { top: 100, right: 0, bottom: 0, left: 0 };
    const cam = fitBox(box, viewport, insets);
    const topLeft = project({ x: 0, y: 0 }, cam, viewport);
    const bottomRight = project({ x: 100, y: 100 }, cam, viewport);
    expect(topLeft.y).toBeCloseTo(100);
    expect(bottomRight.y).toBeCloseTo(500);
    expect((topLeft.x + bottomRight.x) / 2).toBeCloseTo(500);
  });
});

describe("projection", () => {
  it("round-trips", () => {
    const cam = { x: 10, y: 20, w: 200, h: 100 };
    const pt = { x: 55, y: 70 };
    const back = unproject(project(pt, cam, viewport), cam, viewport);
    expect(back.x).toBeCloseTo(pt.x);
    expect(back.y).toBeCloseTo(pt.y);
  });
});

describe("camera motion", () => {
  it("lerps between endpoints", () => {
    const a = { x: 0, y: 0, w: 100, h: 50 };
    const b = { x: 300, y: 300, w: 25, h: 12.5 };
    expect(lerpBox(a, b, 0)).toEqual(a);
    const end = lerpBox(a, b, 1);
    expect(end.x).toBeCloseTo(b.x);
    expect(end.w).toBeCloseTo(b.w);
  });

  it("zooms around an anchor", () => {
    const cam = { x: 0, y: 0, w: 100, h: 50 };
    const zoomed = zoomBox(cam, 2, { x: 50, y: 25 });
    expect(zoomed).toEqual({ x: 25, y: 12.5, w: 50, h: 25 });
  });

  it("clamps zoom and pan relative to home", () => {
    const home = { x: 0, y: 0, w: 100, h: 50 };
    const tooFar = clampCamera({ x: 1000, y: 0, w: 10, h: 5 }, home);
    expect(home.w / tooFar.w).toBeCloseTo(3);
    expect(tooFar.x + tooFar.w / 2).toBeCloseTo(100);
  });
});

describe("skyLayout", () => {
  it("uses data positions in landscape", () => {
    const layout = skyLayout(FIXTURE, { width: 1600, height: 900 });
    const box = layout.boxes.get("alpha")!;
    expect(box.x + box.w / 2).toBe(100);
  });

  it("switches to a grid in portrait", () => {
    const layout = skyLayout(FIXTURE, { width: 390, height: 844 });
    expect(layout.width).toBe(600);
    const a = layout.boxes.get("alpha")!;
    const b = layout.boxes.get("beta")!;
    expect(a.y).toBe(b.y);
    expect(b.x).toBeGreaterThan(a.x);
  });
});
