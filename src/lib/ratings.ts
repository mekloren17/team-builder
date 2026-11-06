// Ratings of a group recomputed from all its confirmed results (pure: the caller reads and writes the database).

import { estimateRatings, type HistoryMatch } from "./engine/engine.ts";

/** Level used when someone with no questionnaire has played: same as for balancing (UNKNOWN_LEVEL). */
const NO_PRIOR = 60;

export interface RatingPlayer {
  id: string;
  prior_overall: number | null;
}

export interface ConfirmedMatch {
  format: 5 | 7;
  score_a: number;
  score_b: number;
  match_players: { player_id: string; team: "A" | "B" | null; form: number }[];
}

/**
 * New rating of every player who has a questionnaire or has played. Players with neither are left
 * out, so their card keeps showing no mark.
 */
export function groupRatings(players: RatingPlayer[], matches: ConfirmedMatch[]): Map<string, number> {
  const played = new Set(matches.flatMap((m) => m.match_players.filter((p) => p.team).map((p) => p.player_id)));
  const prior = new Map<string, number>();
  for (const p of players) {
    if (p.prior_overall !== null) prior.set(p.id, p.prior_overall);
    else if (played.has(p.id)) prior.set(p.id, NO_PRIOR);
  }

  const history: HistoryMatch[] = matches.map((m) => {
    const side = (t: "A" | "B") => m.match_players.filter((p) => p.team === t && prior.has(p.player_id));
    const a = side("A");
    const b = side("B");
    return {
      teamA: a.map((p) => p.player_id),
      teamB: b.map((p) => p.player_id),
      formA: a.map((p) => p.form),
      formB: b.map((p) => p.form),
      goalsA: m.score_a,
      goalsB: m.score_b,
      format: m.format,
    };
  });
  return estimateRatings(
    prior,
    history.filter((h) => h.teamA.length > 0 && h.teamB.length > 0),
  );
}

/** A rating change as shown in the app: one decimal, with its sign ("+0.4", "−1.2", "0.0"). */
export function formatChange(before: number, after: number): string {
  const d = Math.round((after - before) * 10) / 10;
  if (d === 0) return "0.0";
  return `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}`;
}
