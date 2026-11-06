import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { isProvisional } from "@/lib/engine/engine";
import { PlayerCard } from "@/components/player-card";
import { BackLink, Dateline, Empty, Headline, Mark, Page, Panel, SectionTitle } from "@/components/ui";
import { formatMatchDate, statText } from "@/lib/match";
import { cardStats, displayOverall, isGuest, mainPosition } from "@/lib/player";
import { formatChange } from "@/lib/ratings";
import { createClient } from "@/lib/supabase/server";
import { loadGroup } from "../../data";

type Props = { params: Promise<{ id: string; pid: string }> };

interface PlayedRow {
  team: "A" | "B" | null;
  mu_before: number | null;
  mu_after: number | null;
  goals: number;
  assists: number;
  matches: {
    id: string;
    starts_at: string;
    format: 5 | 7;
    score_a: number;
    score_b: number;
  };
}

type Outcome = "W" | "D" | "L";
const OUTCOME_STYLE: Record<Outcome, string> = {
  W: "bg-ok text-turf",
  D: "bg-chalk-soft text-turf",
  L: "bg-foul text-turf",
};

export default function PlayerPage({ params }: Props) {
  return (
    <Page>
      <Suspense>
        <Player params={params} />
      </Suspense>
    </Page>
  );
}

async function Player({ params }: Props) {
  const { id, pid } = await params;
  const { players, me } = await loadGroup(id, `/groups/${id}/players/${pid}`);
  const p = players.find((x) => x.id === pid);
  if (!p) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("match_players")
    .select("team, mu_before, mu_after, goals, assists, matches!inner (id, starts_at, format, score_a, score_b, result_status)")
    .eq("player_id", pid)
    .eq("matches.result_status", "confirmed")
    .not("team", "is", null);
  const played = ((data ?? []) as unknown as PlayedRow[]).sort((a, b) =>
    b.matches.starts_at.localeCompare(a.matches.starts_at),
  );

  const outcome = (r: PlayedRow): Outcome => {
    const mine = r.team === "A" ? r.matches.score_a - r.matches.score_b : r.matches.score_b - r.matches.score_a;
    return mine > 0 ? "W" : mine < 0 ? "L" : "D";
  };
  const record = { W: 0, D: 0, L: 0 };
  for (const r of played) record[outcome(r)]++;
  const goals = played.reduce((s, r) => s + r.goals, 0);
  const assists = played.reduce((s, r) => s + r.assists, 0);
  const stats = cardStats(p);

  return (
    <div>
      <BackLink href={`/groups/${id}/players`}>The ratings</BackLink>
      <Headline>{p.id === me.id ? "Your card" : p.display_name}</Headline>
      <Dateline>
        {isGuest(p)
          ? "Guest"
          : isProvisional(p.matches_played)
            ? "Provisional mark: fewer than 10 matches"
            : "Mark from the results"}
      </Dateline>

      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <PlayerCard
          name={p.display_name}
          overall={displayOverall(p)}
          position={mainPosition(p.positions, p.main_position)}
          attributes={stats.values}
          labels={stats.labels}
          foot={p.foot}
          provisional={isProvisional(p.matches_played)}
          guest={isGuest(p)}
          photoUrl={p.photo_url}
        />
        <div className="w-full space-y-3 sm:max-w-sm">
          <StatRow
            items={[
              ["Played", played.length],
              ["Won", record.W],
              ["Drawn", record.D],
              ["Lost", record.L],
            ]}
          />
          <StatRow
            items={[
              ["Goals", goals],
              ["Assists", assists],
              ["G+A / match", played.length ? ((goals + assists) / played.length).toFixed(1) : "–"],
            ]}
          />
        </div>
      </div>

      <SectionTitle>Matches</SectionTitle>
      {played.length === 0 ? (
        <Empty title="No results yet">The mark starts moving after the first confirmed result.</Empty>
      ) : (
        <ul className="overflow-hidden rounded-md border-2 border-line bg-panel">
          {played.map((r) => {
            const o = outcome(r);
            const change = r.mu_before !== null && r.mu_after !== null ? formatChange(r.mu_before, r.mu_after) : null;
            const color = change?.startsWith("+")
              ? "text-ok"
              : change?.startsWith("−")
                ? "text-foul"
                : "text-chalk-soft";
            return (
              <li key={r.matches.id} className="border-b border-rule last:border-b-0">
                <Link
                  href={`/groups/${id}/matches/${r.matches.id}`}
                  className="grid min-h-16 grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-2 transition-colors duration-150 hover:bg-raised"
                >
                  <span
                    className={`grid size-8 place-items-center rounded-md font-display text-lg font-black ${OUTCOME_STYLE[o]}`}
                  >
                    {o}
                  </span>
                  <span>
                    <span className="block font-semibold">{formatMatchDate(r.matches.starts_at)}</span>
                    <span className="block text-sm text-chalk-soft">
                      <span className={r.team === "A" ? "text-bib" : "text-bib-orange"}>Team {r.team}</span> ·{" "}
                      <span className="tabular">
                        {r.matches.score_a}–{r.matches.score_b}
                      </span>
                      {(r.goals > 0 || r.assists > 0) && (
                        <span className="font-semibold text-chalk"> · {statText(r.goals, r.assists)}</span>
                      )}
                    </span>
                  </span>
                  <span className={`tabular text-right font-display text-xl font-black ${color}`}>{change ?? "–"}</span>
                  <ChevronRight className="size-5 text-chalk-soft" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatRow({ items }: { items: [string, number | string][] }) {
  return (
    <Panel className={`grid divide-x divide-rule text-center ${items.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
      {items.map(([label, n]) => (
        <div key={label} className="py-4">
          <Mark value={n} size="md" />
          <span className="mt-1 block text-xs font-semibold uppercase text-chalk-soft">{label}</span>
        </div>
      ))}
    </Panel>
  );
}
