import { Suspense } from "react";
import { isProvisional } from "@/lib/engine/engine";
import { PlayerCard } from "@/components/player-card";
import { Dateline, Headline, Mark, Page, SectionTitle } from "@/components/ui";
import { cardStats, displayOverall, isGuest, mainPosition, POSITION_SHORT, type PlayerRow } from "@/lib/player";
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
            <Row key={p.id} player={p} rank={i + 1} isMe={p.id === me.id} />
          ))}
        </tbody>
      </table></div>

      <SectionTitle>The cards</SectionTitle>
      <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
        {ranked.map((p) => (
          <PlayerCard
            key={p.id}
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
        ))}
      </div>
    </div>
  );
}

function positionLabel(p: PlayerRow): string {
  const pos = mainPosition(p.positions, p.main_position);
  return pos ? POSITION_SHORT[pos] : "–";
}

function Row({ player: p, rank, isMe }: { player: PlayerRow; rank: number; isMe: boolean }) {
  const ovr = displayOverall(p);
  return (
    <tr className={`border-b border-rule last:border-b-0 ${isMe ? "bg-raised" : ""}`}>
      <td className="tabular py-2.5 pl-3 text-right text-sm font-semibold text-chalk-soft">{rank}</td>
      <td className="py-2.5 pl-3">
        <span className="font-semibold">{p.display_name}</span>
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
