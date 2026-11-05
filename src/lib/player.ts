// A player as stored in the database, and the helpers that turn it into what the engine and the card need.

import { ageFromBirthYear, type BalancePlayer, type Freq, type Level, type Pos, type Profile, type Years } from "@/lib/engine/engine";

export type Foot = "right" | "left" | "both";
export type Role = "owner" | "admin" | "player";

export interface PlayerRow {
  id: string;
  group_id: string;
  user_id: string | null;
  display_name: string;
  role: Role;
  birth_year: number | null;
  max_level: Level | null;
  years_played: Years | null;
  frequency: Freq | null;
  positions: Pos[];
  gk_rotation: boolean;
  foot: Foot | null;
  attributes: number[] | null;
  gk_rating: number | null;
  prior_overall: number | null;
  mu: number | null;
  matches_played: number;
  photo_url: string | null;
  main_position: Pos | null;
  gk_attributes: number[] | null;
}

export const PLAYER_COLUMNS =
  "id, group_id, user_id, display_name, role, birth_year, max_level, years_played, frequency, positions, gk_rotation, foot, attributes, gk_rating, prior_overall, mu, matches_played, photo_url, main_position, gk_attributes";

export const ATTRIBUTE_NAMES = ["Pace", "Shooting", "Passing", "Dribbling", "Defending", "Physical"] as const;
export const ATTRIBUTE_SHORT = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"] as const;

/** Keepers answer these instead (same 1..5 scale, same place on the card). */
export const GK_ATTRIBUTE_NAMES = ["Reflexes", "Positioning", "Handling", "Coming out (1 v 1)", "Distribution", "Playing with feet"] as const;
export const GK_ATTRIBUTE_SHORT = ["REF", "POS", "HAN", "OUT", "DIS", "FEET"] as const;

/** The skill answers and labels to show on the card: keeper ones for a keeper. */
/** Plays mostly in goal: rated on the keeper questions. */
export function isKeeper(p: Pick<PlayerRow, "main_position">): boolean {
  return p.main_position === "GK";
}

export function cardStats(p: Pick<PlayerRow, "main_position" | "attributes" | "gk_attributes">): {
  values: number[] | null;
  labels: readonly string[];
} {
  return isKeeper(p) ? { values: p.gk_attributes, labels: GK_ATTRIBUTE_SHORT } : { values: p.attributes, labels: ATTRIBUTE_SHORT };
}

/** How a position is written in the app (English abbreviations: a striker is ST). The stored value stays ATT. */
export const POSITION_SHORT: Record<Pos, string> = { GK: "GK", DEF: "DEF", MID: "MID", ATT: "ST" };

export type Tier = "bronze" | "silver" | "gold";

export function tier(overall: number): Tier {
  if (overall >= 75) return "gold";
  if (overall >= 65) return "silver";
  return "bronze";
}

/** The position shown on the card: the chosen main one, else the first preferred one in pitch order. */
export function mainPosition(positions: Pos[], main: Pos | null = null): Pos | null {
  if (main && positions.includes(main)) return main;
  return (["ATT", "MID", "DEF", "GK"] as Pos[]).find((p) => positions.includes(p)) ?? null;
}

/** The overall shown on the card: the current rating, rounded. */
export function displayOverall(p: Pick<PlayerRow, "mu" | "prior_overall">): number | null {
  const v = p.mu ?? p.prior_overall;
  return v === null ? null : Math.round(v);
}

export function hasProfile(p: PlayerRow): boolean {
  return p.prior_overall !== null && (isKeeper(p) ? p.gk_attributes !== null : p.attributes !== null);
}

export function isGuest(p: PlayerRow): boolean {
  return p.user_id === null;
}

/** Engine input from a saved questionnaire (null if not filled in yet). */
export function toEngineProfile(p: PlayerRow): Profile | null {
  if (!p.birth_year || !p.max_level || !p.years_played || !p.frequency || !hasProfile(p)) return null;
  return {
    age: ageFromBirthYear(p.birth_year),
    level: p.max_level,
    years: p.years_played,
    freq: p.frequency,
    attrs: p.attributes ?? [],
    positions: p.positions,
    gkRotation: p.gk_rotation,
    keeper: isKeeper(p),
    gkAttrs: p.gk_attributes ?? undefined,
  };
}

/** Level used for balancing when someone has not filled in the questionnaire yet: an average amateur. */
export const UNKNOWN_LEVEL = 60;

/** Engine input for balancing and positions. */
export function toBalancePlayer(p: PlayerRow, form: number): BalancePlayer {
  return {
    id: p.id,
    mu: p.mu ?? p.prior_overall ?? UNKNOWN_LEVEL,
    form,
    positions: p.positions,
    gkRotation: p.gk_rotation,
  };
}
