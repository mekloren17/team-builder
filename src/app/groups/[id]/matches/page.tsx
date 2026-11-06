import { Suspense } from "react";
import Link from "next/link";
import { Fixtures } from "@/components/fixtures";
import { button, Dateline, Empty, Headline, Page, SectionTitle } from "@/components/ui";
import { loadGroup, loadMatches, loadResults } from "../data";

type Props = { params: Promise<{ id: string }> };

export default function MatchesPage({ params }: Props) {
  return (
    <Page>
      <Suspense>
        <Matches params={params} />
      </Suspense>
    </Page>
  );
}

async function Matches({ params }: Props) {
  const { id } = await params;
  const [{ me, canManage }, { matches, next }, results] = await Promise.all([
    loadGroup(id, `/groups/${id}/matches`),
    loadMatches(id),
    loadResults(id),
  ]);
  const nextTime = next ? new Date(next.starts_at).getTime() : Infinity;
  const upcoming = matches.filter((m) => new Date(m.starts_at).getTime() >= nextTime);
  // played matches are all listed under Results
  const recent = matches.filter((m) => new Date(m.starts_at).getTime() < nextTime && m.status !== "played").reverse();

  return (
    <div>
      <Headline>Matches</Headline>
      <Dateline>Tap a match to sign up, see who&apos;s in and the teams.</Dateline>
      {canManage && (
        <Link href={`/groups/${id}/matches/new`} className={`${button.primary} mt-5 w-full`}>
          New match
        </Link>
      )}

      <SectionTitle>Coming up</SectionTitle>
      {upcoming.length > 0 ? (
        <Fixtures groupId={id} matches={upcoming} myPlayerId={me.id} />
      ) : (
        <Empty title="Nothing planned">{canManage ? "Create a match and share it in the chat." : "An admin will add the next one."}</Empty>
      )}

      {recent.length > 0 && (
        <>
          <SectionTitle>Last week</SectionTitle>
          <Fixtures groupId={id} matches={recent} myPlayerId={me.id} />
        </>
      )}

      {results.length > 0 && (
        <>
          <SectionTitle>Results</SectionTitle>
          <Fixtures groupId={id} matches={results} myPlayerId={me.id} />
        </>
      )}
    </div>
  );
}
