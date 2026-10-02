import { MAX_PERK_RANKS } from "./constants";
import { emptyBuild, normalizeBuild, type SkillIndex } from "./rules";
import type { Build } from "./types";

/*
 * Share link format (then base64url, no padding):
 *
 *   byte 0      format version (1)
 *   bytes 1–2   checksum of skill/perk ids in data order
 *   byte 3      character level
 *   byte 4      skill count N
 *   N bytes     skill levels, data order
 *   rest        perk ranks, 2 bits each, perks in data order (skill by skill)
 *
 * The character name is not included, to keep links short.
 */

export const SHARE_VERSION = 1;
export const SHARE_PARAM = "b";

export type DecodeResult =
  | { ok: true; build: Build }
  | { ok: false; error: "malformed" | "version" | "content-changed" };

/** 16-bit FNV-1a over the ordered ids, so reordered/renamed content is detected. */
export function contentChecksum(index: SkillIndex): number {
  const text = index.skills.map((s) => `${s.id}:${s.perks.map((p) => p.id).join(",")}`).join("|");
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash ^ (hash >>> 16)) & 0xffff;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export function encodeBuild(index: SkillIndex, build: Build): string {
  const perks = index.skills.flatMap((s) => s.perks);
  const header = 5 + index.skills.length;
  const bytes = new Uint8Array(header + Math.ceil((perks.length * 2) / 8));

  const checksum = contentChecksum(index);
  bytes[0] = SHARE_VERSION;
  bytes[1] = checksum >> 8;
  bytes[2] = checksum & 0xff;
  bytes[3] = build.characterLevel;
  bytes[4] = index.skills.length;
  index.skills.forEach((skill, i) => {
    bytes[5 + i] = build.skillLevels[skill.id] ?? 0;
  });

  perks.forEach((perk, i) => {
    const rank = Math.min(MAX_PERK_RANKS, build.perkRanks[perk.id] ?? 0);
    const bit = i * 2;
    bytes[header + (bit >> 3)]! |= rank << (bit & 7);
  });

  // Trailing zero bytes (unspent trees at the end) carry no information.
  let end = bytes.length;
  while (end > header && bytes[end - 1] === 0) end--;
  return toBase64Url(bytes.subarray(0, end));
}

export function decodeBuild(index: SkillIndex, text: string): DecodeResult {
  const bytes = fromBase64Url(text.trim());
  if (!bytes || bytes.length < 5) return { ok: false, error: "malformed" };
  if (bytes[0] !== SHARE_VERSION) return { ok: false, error: "version" };

  const checksum = (bytes[1]! << 8) | bytes[2]!;
  if (checksum !== contentChecksum(index) || bytes[4] !== index.skills.length) {
    return { ok: false, error: "content-changed" };
  }

  const header = 5 + index.skills.length;
  if (bytes.length < header) return { ok: false, error: "malformed" };

  const raw: Build = { ...emptyBuild(index), characterLevel: bytes[3]! };
  index.skills.forEach((skill, i) => {
    raw.skillLevels[skill.id] = bytes[5 + i]!;
  });
  index.skills
    .flatMap((s) => s.perks)
    .forEach((perk, i) => {
      const bit = i * 2;
      const rank = ((bytes[header + (bit >> 3)] ?? 0) >> (bit & 7)) & 0b11;
      if (rank > 0) raw.perkRanks[perk.id] = rank;
    });

  // Links are untrusted: clamp anything a hand-edited link could break.
  return { ok: true, build: normalizeBuild(index, raw) };
}

export function decodeErrorMessage(error: Extract<DecodeResult, { ok: false }>["error"]): string {
  switch (error) {
    case "malformed":
      return "That build link is damaged and couldn't be read.";
    case "version":
      return "That build link was made by a different version of the app.";
    case "content-changed":
      return "The skill trees have changed since that link was made, so it can't be loaded safely.";
  }
}

export function buildShareUrl(index: SkillIndex, build: Build, base: string): string {
  const url = new URL(base);
  url.hash = "";
  url.search = "";
  url.searchParams.set(SHARE_PARAM, encodeBuild(index, build));
  return url.toString();
}
