import { Suspense } from "react";
import Link from "next/link";
import { isProvisional } from "@/lib/engine/engine";
import { PlayerCard } from "@/components/player-card";
import { Dateline, Headline, Mark, Page, SectionTitle } from "@/components/ui";
import { cardStats, displayOverall, isGuest, mainPosition, POSITION_SHORT, type PlayerRow } from "@/lib/player";
import { createClient } from "@/lib/supabase/server";
import { loadGroup } from "../data";

type Props = { params: Promise<{ id: string }> };

export default function PlayersPage({ params }: Props) {
  return (
    <Page>
      <Suspense>
        <Players params={params} />
      </Suspense>
    </Page>
  );
}

async function Players({ params }: Props) {
  const { id } = await params;
  const { players, me } = await loadGroup(id, `/groups/${id}/players`);
  const ranked = [...players].sort((a, b) => (displayOverall(b) ?? -1) - (displayOverall(a) ?? -1));
  const scorers = await topScorers(id);
  const byId = new Map(players.map((p) => [p.id, p]));
  const scorerRows = scorers.filter((s) => byId.has(s.id));

  return (
    <div>
      <Headline>The ratings</Headline>
      <Dateline>
        {players.length} {players.length === 1 ? "player" : "players"}. Marks start from the questionnaire and follow the
        results.
      </Dateline>

      <div className="mt-5 overflow-hidden rounded-md border-2 border-line bg-panel"><table className="w-full">
        <thead>
          <tr className="border-b-2 border-line text-left font-display text-sm font-bold uppercase tracking-wide">
            <th className="w-10 py-2 pl-3 text-right">#</th>
            <th className="py-2 pl-3">Player</th>
            <th className="py-2 pl-2">Role</th>
            <th className="py-2 pr-4 text-right">Mark</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((p, i) => (
            <Row key={p.id} groupId={id} player={p} rank={i + 1} isMe={p.id === me.id} />
          ))}
        </tbody>
      </table></div>

      {scorerRows.length > 0 && (
        <>
          <SectionTitle>Top scorers</SectionTitle>
          <div className="overflow-hidden rounded-md border-2 border-line bg-panel">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-line text-left font-display text-sm font-bold uppercase tracking-wide">
                  <th className="w-10 py-2 pl-3 text-right">#</th>
                  <th className="py-2 pl-3">Player</th>
                  <th className="w-14 py-2 text-right" title="Matches">MP</th>
                  <th className="w-14 py-2 text-right" title="Goals">G</th>
                  <th className="w-14 py-2 pr-4 text-right" title="Assists">A</th>
                </tr>
              </thead>
              <tbody>
                {scorerRows.slice(0, 10).map((s, i) => (
                  <tr key={s.id} className={`border-b border-rule last:border-b-0 ${s.id === me.id ? "bg-raised" : ""}`}>
                    <td className="tabular py-2.5 pl-3 text-right text-sm font-semibold text-chalk-soft">{i + 1}</td>
                    <td className="py-2.5 pl-3">
                      <Link href={`/groups/${id}/players/${s.id}`} className="font-semibold underline-offset-4 hover:underline">
                        {byId.get(s.id)!.display_name}
                      </Link>
                    </td>
                    <td className="tabular py-2.5 text-right text-sm text-chalk-soft">{s.matches}</td>
                    <td className="tabular py-2.5 text-right font-display text-xl font-black">{s.goals}</td>
                    <td className="tabular py-2.5 pr-4 text-right font-display text-xl font-black">{s.assists}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <SectionTitle>The cards</SectionTitle>
      <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
        {ranked.map((p) => (
          <Link
            key={p.id}
            href={`/groups/${id}/players/${p.id}`}
            className="rounded-2xl transition-transform duration-150 hover:-translate-y-0.5"
          >
          <PlayerCard
            name={p.display_name}
            overall={displayOverall(p)}
            position={mainPosition(p.positions, p.main_position)}
            attributes={cardStats(p).values}
            labels={cardStats(p).labels}
            foot={p.foot}
            provisional={isProvisional(p.matches_played)}
            guest={isGuest(p)}
            photoUrl={p.photo_url}
            size="sm"
          />
          </Link>
        ))}
      </div>
    </div>
  );
}

function positionLabel(p: PlayerRow): string {
  const pos = mainPosition(p.positions, p.main_position);
  return pos ? POSITION_SHORT[pos] : "–";
}

function Row({ groupId, player: p, rank, isMe }: { groupId: string; player: PlayerRow; rank: number; isMe: boolean }) {
  const ovr = displayOverall(p);
  return (
    <tr className={`border-b border-rule last:border-b-0 ${isMe ? "bg-raised" : ""}`}>
      <td className="tabular py-2.5 pl-3 text-right text-sm font-semibold text-chalk-soft">{rank}</td>
      <td className="py-2.5 pl-3">
        <Link href={`/groups/${groupId}/players/${p.id}`} className="font-semibold underline-offset-4 hover:underline">
          {p.display_name}
        </Link>
        {isMe && <span className="ml-2 bg-chalk px-1.5 py-0.5 text-xs font-bold uppercase text-turf">You</span>}
        <span className="block text-xs text-chalk-soft">
          {isGuest(p) ? "Guest" : isProvisional(p.matches_played) ? "Provisional" : `${p.matches_played} matches`}
        </span>
      </td>
      <td className="py-2.5 pl-2 text-sm font-semibold">{positionLabel(p)}</td>
      <td className="py-2.5 pr-4 text-right">
        <Mark value={ovr ?? "–"} size="md" />
      </td>
    </tr>
  );
}

/** Goals and assists of each player over the group's confirmed results, best first (players with none left out). */
async function topScorers(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_players")
    .select("player_id, goals, assists, matches!inner (group_id, result_status)")
    .eq("matches.group_id", groupId)
    .eq("matches.result_status", "confirmed")
    .not("team", "is", null);
  const totals = new Map<string, { id: string; matches: number; goals: number; assists: number }>();
  for (const r of (data ?? []) as { player_id: string; goals: number; assists: number }[]) {
    const t = totals.get(r.player_id) ?? { id: r.player_id, matches: 0, goals: 0, assists: 0 };
    t.matches++;
    t.goals += r.goals;
    t.assists += r.assists;
    totals.set(r.player_id, t);
  }
  return [...totals.values()]
    .filter((t) => t.goals > 0 || t.assists > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.matches - b.matches);
}
