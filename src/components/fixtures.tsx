import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatMatchDate, STATUS_LABEL, type MatchRow } from "@/lib/match";

export type FixtureMatch = MatchRow & { match_players: { player_id: string }[] };

/** Matches as a fixture board: fixed columns for when, format, who's in. */
export function Fixtures({ groupId, matches, myPlayerId }: { groupId: string; matches: FixtureMatch[]; myPlayerId: string }) {
  return (
    <ul className="border-2 border-ink bg-sheet">
      {matches.map((m) => {
        const signed = m.match_players.length;
        const imIn = m.match_players.some((p) => p.player_id === myPlayerId);
        return (
          <li key={m.id} className="border-b border-rule last:border-b-0">
            <Link
              href={`/groups/${groupId}/matches/${m.id}`}
              className="grid min-h-16 grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2 transition-colors duration-150 hover:bg-paper"
            >
              <span>
                <span className="block font-semibold">{formatMatchDate(m.starts_at)}</span>
                <span className="block text-sm text-ink-soft">
                  {m.format}-a-side · {STATUS_LABEL[m.status]}
                </span>
              </span>
              <span className="text-right">
                <span className="tabular block font-display text-2xl font-extrabold leading-none">
                  {signed}/{m.format * 2}
                </span>
                <span className={`block text-xs font-semibold uppercase ${imIn ? "text-ok" : "text-ink-soft"}`}>
                  {imIn ? "You're in" : "in"}
                </span>
              </span>
              <ChevronRight className="size-5 text-ink-soft" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
