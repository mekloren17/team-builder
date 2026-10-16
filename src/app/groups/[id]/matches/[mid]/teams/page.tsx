import { Suspense } from "react";
import { BackLink, Dateline, ErrorText, Headline, Page } from "@/components/ui";
import { notFound } from "next/navigation";
import { balanceTeams, type BalancePlayer } from "@/lib/engine/engine";
import { formatMatchDate } from "@/lib/match";
import { displayOverall, toBalancePlayer, UNKNOWN_LEVEL } from "@/lib/player";
import { loadMatch, previousTeams } from "../data";
import { TeamEditor, type EditorPlayer, type Option } from "./team-editor";

type Props = { params: Promise<{ id: string; mid: string }> };

// Three are shown at first; "Another option" reveals the next ones, all different from each other.
const MAX_PROPOSALS = 10;

export default function TeamsPage({ params }: Props) {
  return (
    <Page>
      <Suspense>
        <Teams params={params} />
      </Suspense>
    </Page>
  );
}

async function Teams({ params }: Props) {
  const { id, mid } = await params;
  const { players, canManage, match, signups, constraints } = await loadMatch(id, mid, `/groups/${id}/matches/${mid}/teams`);
  if (!canManage || match.status === "played") notFound();

  const byId = new Map(players.map((p) => [p.id, p]));
  const signed = signups.filter((s) => byId.has(s.player_id));
  const balance: BalancePlayer[] = signed.map((s) => toBalancePlayer(byId.get(s.player_id)!, s.form));
  const editorPlayers: EditorPlayer[] = signed.map((s) => {
    const p = byId.get(s.player_id)!;
    return {
      ...toBalancePlayer(p, s.form),
      name: p.display_name,
      overall: displayOverall(p) ?? UNKNOWN_LEVEL,
      photoUrl: p.photo_url,
      guest: !p.user_id,
    };
  });

  const options: Option[] = [];
  if (match.status === "teams_set") {
    const teamA = signed.filter((s) => s.team === "A").map((s) => s.player_id);
    const teamB = signed.filter((s) => s.team === "B").map((s) => s.player_id);
    options.push({ label: "Current", teamA, teamB });
  }
  let error: string | null = null;
  try {
    const proposals = balanceTeams(balance, {
      proposals: MAX_PROPOSALS,
      previousTeams: await previousTeams(id, mid),
      together: constraints.filter((c) => c.type === "together").map((c) => [c.player_a, c.player_b]),
      apart: constraints.filter((c) => c.type === "apart").map((c) => [c.player_a, c.player_b]),
    });
    proposals.forEach((p, i) => options.push({ label: `Proposal ${i + 1}`, teamA: p.teamA, teamB: p.teamB }));
    if (proposals.length === 0) error = "No split respects all the constraints: remove one and try again.";
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not generate the teams.";
  }

  return (
    <div className="space-y-6">
      <header>
        <BackLink href={`/groups/${id}/matches/${mid}`}>{formatMatchDate(match.starts_at)}</BackLink>
        <Headline>Make the teams</Headline>
        <Dateline>Pick a proposal, swap players if you like, then save. The win chance follows every move.</Dateline>
      </header>
      {error && <ErrorText>{error}</ErrorText>}
      {options.length > 0 && (
        <TeamEditor
          groupId={id}
          matchId={mid}
          format={match.format}
          players={editorPlayers}
          options={options}
          initiallyShown={Math.min(options.length, (match.status === "teams_set" ? 1 : 0) + 3)}
        />
      )}
    </div>
  );
}
