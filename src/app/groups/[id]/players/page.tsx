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
    <Page wide>
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
  const names = new Map(players.map((p) => [p.id, p.display_name]));
  const totals = (await playerTotals(id)).filter((t) => names.has(t.id));

  return (
    <div>
      <div className="lg:max-w-2xl">
        <Headline>The ratings</Headline>
        <Dateline>
          {players.length} {players.length === 1 ? "player" : "players"}. Marks start from the questionnaire and follow
          the results.
        </Dateline>
      </div>

      {/* on a PC the two leaderboards sit beside the ratings; on a phone they follow them */}
      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,42rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="overflow-hidden rounded-md border-2 border-line bg-panel">
          <table className="w-full">
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
          </table>
        </div>

        <aside className="lg:space-y-6">
          <Leaderboard
            title="Top scorers"
            column="Goals"
            groupId={id}
            meId={me.id}
            names={names}
            rows={totals.filter((t) => t.goals > 0).map((t) => ({ id: t.id, value: t.goals, matches: t.matches }))}
            empty="No goals yet."
          />
          <Leaderboard
            title="Top assists"
            column="Assists"
            groupId={id}
            meId={me.id}
            names={names}
            rows={totals.filter((t) => t.assists > 0).map((t) => ({ id: t.id, value: t.assists, matches: t.matches }))}
            empty="No assists yet."
          />
        </aside>
      </div>

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

/** Matches, goals and assists of each player over the group's confirmed results. */
async function playerTotals(groupId: string) {
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
  return [...totals.values()];
}

/** Top 10 by one number (goals or assists); on a tie, fewer matches first. */
function Leaderboard({
  title,
  column,
  groupId,
  meId,
  names,
  rows,
  empty,
}: {
  title: string;
  column: string;
  groupId: string;
  meId: string;
  names: Map<string, string>;
  rows: { id: string; value: number; matches: number }[];
  empty: string;
}) {
  const top = [...rows].sort((a, b) => b.value - a.value || a.matches - b.matches).slice(0, 10);
  return (
    <section>
      <h2 className="mb-3 mt-8 font-display text-xl font-black uppercase lg:mt-0">{title}</h2>
      {top.length === 0 ? (
        <p className="rounded-md border-2 border-dashed border-line px-4 py-3 text-sm text-chalk-soft">{empty}</p>
      ) : (
        <div className="overflow-hidden rounded-md border-2 border-line bg-panel">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-line text-left font-display text-sm font-bold uppercase tracking-wide">
                <th className="w-10 py-2 pl-3 text-right">#</th>
                <th className="py-2 pl-3">Player</th>
                <th className="w-12 py-2 text-right" title="Matches played">
                  MP
                </th>
                <th className="w-20 py-2 pr-4 text-right">{column}</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r, i) => (
                <tr key={r.id} className={`border-b border-rule last:border-b-0 ${r.id === meId ? "bg-raised" : ""}`}>
                  <td className="tabular py-2.5 pl-3 text-right text-sm font-semibold text-chalk-soft">{i + 1}</td>
                  <td className="py-2.5 pl-3">
                    <Link
                      href={`/groups/${groupId}/players/${r.id}`}
                      className="font-semibold underline-offset-4 hover:underline"
                    >
                      {names.get(r.id)}
                    </Link>
                  </td>
                  <td className="tabular py-2.5 text-right text-sm text-chalk-soft">{r.matches}</td>
                  <td className="tabular py-2.5 pr-4 text-right font-display text-xl font-black">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
