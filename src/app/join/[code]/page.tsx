import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { joinGroup } from "@/app/groups/actions";

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <Suspense>
        <Invite params={params} />
      </Suspense>
    </main>
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
        <h1 className="text-2xl font-bold">Invite link not valid</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Ask the person who invited you for a new link.</p>
      </>
    );
  }
  if (group.is_member) redirect(`/groups/${group.id}`);

  return (
    <>
      <p className="text-zinc-500">You&apos;re invited to join</p>
      <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {group.member_count} {group.member_count === 1 ? "player" : "players"}
      </p>
      {user ? (
        <form action={joinGroup.bind(null, code)} className="w-full">
          <button type="submit" className="h-12 w-full rounded-full bg-foreground font-medium text-background">
            Join group
          </button>
        </form>
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(`/join/${code}`)}`}
          className="flex h-12 w-full items-center justify-center rounded-full bg-foreground font-medium text-background"
        >
          Sign in to join
        </Link>
      )}
    </>
  );
}
