import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { joinGroup } from "@/app/groups/actions";
import { button, Dateline, Headline, Masthead, Page } from "@/components/ui";

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <>
      <Masthead title="Team Builder" />
      <Page>
        <Suspense>
          <Invite params={params} />
        </Suspense>
      </Page>
    </>
  );
}

async function Invite({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase.rpc("group_preview", { code });
  const group = (data as { id: string; name: string; member_count: number; is_member: boolean }[] | null)?.[0];

  if (!group) {
    return (
      <>
        <Headline>This link has expired</Headline>
        <Dateline>Ask whoever sent it for a fresh one.</Dateline>
      </>
    );
  }
  if (group.is_member) redirect(`/groups/${group.id}`);

  return (
    <>
      <Headline>You&apos;re called up to {group.name}</Headline>
      <Dateline>
        {group.member_count} {group.member_count === 1 ? "player is" : "players are"} already in. Join, make your card, and
        sign up for the next match.
      </Dateline>
      {user ? (
        <form action={joinGroup.bind(null, code)} className="mt-6">
          <button type="submit" className={`${button.primary} w-full`}>
            Join the group
          </button>
        </form>
      ) : (
        <Link href={`/login?next=${encodeURIComponent(`/join/${code}`)}`} className={`${button.primary} mt-6 w-full`}>
          Sign in to join
        </Link>
      )}
    </>
  );
}
