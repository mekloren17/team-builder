// Matches as stored in the database, and display helpers.

import type { Pos } from "@/lib/engine/engine";

export type MatchStatus = "open" | "teams_set" | "played";

export interface MatchRow {
  id: string;
  group_id: string;
  format: 5 | 7;
  starts_at: string;
  status: MatchStatus;
  score_a: number | null;
  score_b: number | null;
  win_prob_a: number | null;
}

export interface MatchPlayerRow {
  match_id: string;
  player_id: string;
  form: number;
  team: "A" | "B" | null;
  position: Pos | null;
}

export interface PairConstraintRow {
  id: string;
  player_a: string;
  player_b: string;
  type: "together" | "apart";
}

export const MATCH_COLUMNS = "id, group_id, format, starts_at, status, score_a, score_b, win_prob_a";

// The group plays in Italy: show times there, whatever the server's time zone.
const TIME_ZONE = "Europe/Rome";

export function formatMatchDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export const STATUS_LABEL: Record<MatchStatus, string> = {
  open: "Sign-ups open",
  teams_set: "Teams set",
  played: "Played",
};

/** Form of the day, 1..5. */
export const FORM_LEVELS = [
  { value: 1, icon: "⇊", label: "Bad day" },
  { value: 2, icon: "↘", label: "Not great" },
  { value: 3, icon: "→", label: "Normal" },
  { value: 4, icon: "↗", label: "Good" },
  { value: 5, icon: "⇈", label: "On fire" },
] as const;

export function formIcon(form: number): string {
  return FORM_LEVELS[form - 1]?.icon ?? "→";
}

/** Matches from this moment on are listed in the group (the last week included, to see recent teams). */
export function listedSince(): string {
  return new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
}
