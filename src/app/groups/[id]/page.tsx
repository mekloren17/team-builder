import { Suspense } from "react";
import Link from "next/link";
import { isProvisional } from "@/lib/engine/engine";
import { Fixtures, type FixtureMatch } from "@/components/fixtures";
import { PlayerCard } from "@/components/player-card";
import { button, Dateline, Headline, inWords, Page, Panel, SectionTitle, WinBar } from "@/components/ui";
import { formatMatchDate } from "@/lib/match";
import { displayOverall, hasProfile, isGuest, mainPosition, type PlayerRow } from "@/lib/player";
import { MyAttendance } from "./matches/[mid]/attendance";
import { loadGroup, loadMatches } from "./data";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export default function GroupPage({ params }: Props) {
  return (
    <Page>
      <Suspense>
        <Home params={params} />
      </Suspense>
    </Page>
  );
}

async function Home({ params }: Props) {
  const { id } = await params;
  const [{ me, canManage }, { matches, next }] = await Promise.all([loadGroup(id, `/groups/${id}`), loadMatches(id)]);
  const later = matches.filter((m) => m !== next && new Date(m.starts_at) > new Date(next?.starts_at ?? 0));

  return (
    <div>
      {next ? (
        <NextMatch groupId={id} match={next} me={me} />
      ) : (
        <section>
          <Headline>No match on the calendar</Headline>
          <Dateline>{canManage ? "Set one up and the group can start signing in." : "An admin will set up the next one. Stay ready."}</Dateline>
          {canManage && (
            <Link href={`/groups/${id}/matches/new`} className={`${button.primary} mt-5 w-full`}>
              New match
            </Link>
          )}
        </section>
      )}

      <SectionTitle
        action={
          hasProfile(me) && (
            <Link href={`/groups/${id}/profile`} className={button.quiet}>
              Edit my profile
            </Link>
          )
        }
      >
        Your card
      </SectionTitle>
      {hasProfile(me) ? (
        <div className="flex justify-center">
          <Card player={me} />
        </div>
      ) : (
        <Panel className="p-5">
          <p className="font-display text-2xl font-extrabold uppercase">You don&apos;t have a card yet</p>
          <p className="mt-1 text-ink-soft">A few honest questions about how you play. Two minutes, no trick questions.</p>
          <Link href={`/groups/${id}/profile`} className={`${button.primary} mt-4 w-full`}>
            Make my card
          </Link>
        </Panel>
      )}

      {later.length > 0 && (
        <>
          <SectionTitle
            action={
              <Link href={`/groups/${id}/matches`} className={button.quiet}>
                All matches
              </Link>
            }
          >
            Coming up
          </SectionTitle>
          <Fixtures groupId={id} matches={later} myPlayerId={me.id} />
        </>
      )}
    </div>
  );
}

async function NextMatch({ groupId, match, me }: { groupId: string; match: FixtureMatch; me: PlayerRow }) {
  const target = match.format * 2;
  const signed = match.match_players.length;
  const left = target - signed;
  const when = `${formatMatchDate(match.starts_at)} · ${match.format}-a-side`;
  const matchHref = `/groups/${groupId}/matches/${match.id}`;

  if (match.status !== "open") {
    return (
      <section>
        <Headline>Teams are set</Headline>
        <Dateline>{when}</Dateline>
        {match.win_prob_a !== null && (
          <Panel className="mt-5 p-4">
            <WinBar probA={match.win_prob_a} labelA="Team A" labelB="Team B" />
          </Panel>
        )}
        <Link href={matchHref} className={`${button.primary} mt-4 w-full`}>
          See the line-up
        </Link>
      </section>
    );
  }

  const mine = await mySignup(match.id, me.id);
  const headline =
    signed === 0
      ? "Who's playing?"
      : left > 0
        ? `${inWords(signed)} in, ${left === 1 ? "one spot" : `${inWords(left).toLowerCase()} spots`} left`
        : left === 0
          ? `${inWords(signed)} in. Full house`
          : `${inWords(signed)} in. Somebody sits out`;

  return (
    <section>
      <Headline>{headline}</Headline>
      <Dateline>
        {when} ·{" "}
        <Link href={matchHref} className="font-semibold text-ink underline decoration-2">
          who&apos;s in
        </Link>
      </Dateline>
      <div className="mt-5">
        <MyAttendance groupId={groupId} matchId={match.id} playerId={me.id} signedForm={mine} />
      </div>
    </section>
  );
}

/** My form for this match, or null if I'm not signed up. */
async function mySignup(matchId: string, playerId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_players")
    .select("form")
    .eq("match_id", matchId)
    .eq("player_id", playerId)
    .maybeSingle();
  return data?.form ?? null;
}

function Card({ player }: { player: PlayerRow }) {
  return (
    <PlayerCard
      name={player.display_name}
      overall={displayOverall(player)}
      position={mainPosition(player.positions)}
      attributes={player.attributes}
      foot={player.foot}
      provisional={isProvisional(player.matches_played)}
      guest={isGuest(player)}
      photoUrl={player.photo_url}
      size="lg"
    />
  );
}
