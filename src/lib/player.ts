// A player as stored in the database, and the helpers that turn it into what the engine and the card need.

import { ageFromBirthYear, type Freq, type Level, type Pos, type Profile, type Years } from "@/lib/engine/engine";

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
}

export const PLAYER_COLUMNS =
  "id, group_id, user_id, display_name, role, birth_year, max_level, years_played, frequency, positions, gk_rotation, foot, attributes, gk_rating, prior_overall, mu, matches_played";

export const ATTRIBUTE_NAMES = ["Pace", "Shooting", "Passing", "Dribbling", "Defending", "Physical"] as const;
export const ATTRIBUTE_SHORT = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"] as const;

export type Tier = "bronze" | "silver" | "gold";

export function tier(overall: number): Tier {
  if (overall >= 75) return "gold";
  if (overall >= 65) return "silver";
  return "bronze";
}

/** The position shown on the card: the first preferred one, in pitch order. */
export function mainPosition(positions: Pos[]): Pos | null {
  return (["ATT", "MID", "DEF", "GK"] as Pos[]).find((p) => positions.includes(p)) ?? null;
}

/** The overall shown on the card: the current rating, rounded. */
export function displayOverall(p: Pick<PlayerRow, "mu" | "prior_overall">): number | null {
  const v = p.mu ?? p.prior_overall;
  return v === null ? null : Math.round(v);
}

export function hasProfile(p: PlayerRow): boolean {
  return p.prior_overall !== null && p.attributes !== null;
}

export function isGuest(p: PlayerRow): boolean {
  return p.user_id === null;
}

/** Engine input from a saved questionnaire (null if not filled in yet). */
export function toEngineProfile(p: PlayerRow): Profile | null {
  if (!p.birth_year || !p.max_level || !p.years_played || !p.frequency || !p.attributes) return null;
  return {
    age: ageFromBirthYear(p.birth_year),
    level: p.max_level,
    years: p.years_played,
    freq: p.frequency,
    attrs: p.attributes,
    positions: p.positions,
    gkRotation: p.gk_rotation,
  };
}
