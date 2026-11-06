// Matches as stored in the database, and display helpers.

import type { Pos } from "@/lib/engine/engine";

export type MatchStatus = "open" | "teams_set" | "played";
export type ResultStatus = "pending" | "confirmed" | "disputed";

export interface MatchRow {
  id: string;
  group_id: string;
  format: 5 | 7;
  starts_at: string;
  status: MatchStatus;
  score_a: number | null;
  score_b: number | null;
  win_prob_a: number | null;
  result_status: ResultStatus | null;
  result_by: string | null;
}

export interface MatchPlayerRow {
  match_id: string;
  player_id: string;
  form: number;
  team: "A" | "B" | null;
  position: Pos | null;
  mu_before: number | null;
  mu_after: number | null;
  goals: number;
  assists: number;
}

export interface PairConstraintRow {
  id: string;
  player_a: string;
  player_b: string;
  type: "together" | "apart";
}

export const MATCH_COLUMNS =
  "id, group_id, format, starts_at, status, score_a, score_b, win_prob_a, result_status, result_by";
export const MATCH_PLAYER_COLUMNS = "match_id, player_id, form, team, position, mu_before, mu_after, goals, assists";

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

export const RESULT_LABEL: Record<ResultStatus, string> = {
  pending: "Waiting for confirmation",
  confirmed: "Final",
  disputed: "Disputed",
};

/** Form of the day, 1..5 (drawn with FormIcon). */
export const FORM_LEVELS = [
  { value: 1, label: "Bad day" },
  { value: 2, label: "Meh" },
  { value: 3, label: "Normal" },
  { value: 4, label: "Good" },
  { value: 5, label: "On fire" },
] as const;

/** Matches from this moment on are listed in the group (the last week included, to see recent teams). */
export function listedSince(): string {
  return new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
}

/** True once the match has kicked off: from then on the result can be entered. */
export function hasStarted(startsAt: string): boolean {
  return new Date(startsAt).getTime() <= Date.now();
}

/** A player's goals and assists in short: "2 G · 1 A", leaving out what is zero. */
export function statText(goals: number, assists: number): string {
  return [goals > 0 && `${goals} G`, assists > 0 && `${assists} A`].filter(Boolean).join(" · ");
}

/** Goals and assists by player id, as submitted with the result. */
export type ScorerStats = Record<string, { g: number; a: number }>;
