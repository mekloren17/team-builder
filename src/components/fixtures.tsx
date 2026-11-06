import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatMatchDate, RESULT_LABEL, STATUS_LABEL, type MatchRow } from "@/lib/match";

export type FixtureMatch = MatchRow & { match_players: { player_id: string }[] };

/** Matches as a fixture board: fixed columns for when, format, who's in. */
export function Fixtures({ groupId, matches, myPlayerId }: { groupId: string; matches: FixtureMatch[]; myPlayerId: string }) {
  return (
    <ul className="overflow-hidden rounded-md border-2 border-line bg-panel">
      {matches.map((m) => {
        const signed = m.match_players.length;
        const imIn = m.match_players.some((p) => p.player_id === myPlayerId);
        const scored = m.status === "played" && m.score_a !== null && m.score_b !== null;
        return (
          <li key={m.id} className="border-b border-rule last:border-b-0">
            <Link
              href={`/groups/${groupId}/matches/${m.id}`}
              className="grid min-h-16 grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2 transition-colors duration-150 hover:bg-raised"
            >
              <span>
                <span className="block font-semibold">{formatMatchDate(m.starts_at)}</span>
                <span className="block text-sm text-chalk-soft">
                  {m.format}-a-side · {m.result_status ? RESULT_LABEL[m.result_status] : STATUS_LABEL[m.status]}
                </span>
              </span>
              {scored ? (
                <span className="text-right">
                  <span className="tabular led block text-2xl font-black leading-none">
                    {m.score_a}–{m.score_b}
                  </span>
                  <span className={`block text-xs font-semibold uppercase ${imIn ? "text-ok" : "text-chalk-soft"}`}>
                    {imIn ? "You played" : "A – B"}
                  </span>
                </span>
              ) : (
                <span className="text-right">
                  <span className="tabular block font-display text-2xl font-extrabold leading-none">
                    {signed}/{m.format * 2}
                  </span>
                  <span className={`block text-xs font-semibold uppercase ${imIn ? "text-ok" : "text-chalk-soft"}`}>
                    {imIn ? "You're in" : "in"}
                  </span>
                </span>
              )}
              <ChevronRight className="size-5 text-chalk-soft" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
