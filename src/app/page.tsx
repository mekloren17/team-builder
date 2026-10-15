import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { displayOverall } from "@/lib/player";
import { signOut } from "./actions";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Team Builder</h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">Balanced teams for 5-a-side and 7-a-side.</p>
      </div>
      <Suspense fallback={<div className="h-12" />}>
        <Account />
      </Suspense>
    </main>
  );
}

async function Account() {
  // The session depends on the request: render this part at request time only.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link href="/login" className="mx-auto flex h-12 items-center rounded-full bg-foreground px-8 font-medium text-background">
        Sign in
      </Link>
    );
  }

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user.id).single(),
    supabase
      .from("players")
      .select("role, mu, prior_overall, groups (id, name, default_format)")
      .eq("user_id", user.id)
      .order("created_at"),
  ]);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Your groups</h2>
        {memberships && memberships.length > 0 ? (
          <ul className="space-y-2">
            {memberships.map((m) => {
              const g = m.groups as unknown as { id: string; name: string; default_format: number };
              const ovr = displayOverall(m);
              return (
                <li key={g.id}>
                  <Link
                    href={`/groups/${g.id}`}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    <span>
                      <span className="font-semibold">{g.name}</span>
                      <span className="ml-2 text-sm text-zinc-500">
                        {g.default_format}-a-side{m.role !== "player" ? ` · ${m.role}` : ""}
                      </span>
                    </span>
                    <span className="font-bold tabular-nums">{ovr ?? "–"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-zinc-600 dark:text-zinc-400">
            No groups yet. Ask a friend for an invite link, or create a group.
          </p>
        )}
        <Link
          href="/groups/new"
          className="flex h-12 items-center justify-center rounded-full border border-zinc-300 font-medium dark:border-zinc-700"
        >
          Create a group
        </Link>
      </section>

      <div className="space-y-1 text-center text-sm text-zinc-500">
        <p>Signed in as {profile?.name ?? user.email}</p>
        <form action={signOut}>
          <button type="submit" className="underline">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
