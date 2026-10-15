import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { button, Dateline, Empty, Headline, Mark, Masthead, Page, SectionTitle } from "@/components/ui";
import { displayOverall } from "@/lib/player";
import { signOut } from "./actions";

export default function Home() {
  return (
    <>
      <Masthead title="Team Builder" />
      <Page>
        <Suspense fallback={<div className="h-40" />}>
          <Account />
        </Suspense>
      </Page>
    </>
  );
}

async function Account() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div>
        <Headline>Fair teams, every week</Headline>
        <Dateline>
          Sign up for the match, rate yourself honestly, and let the app split the group into two even teams. No more
          arguing in the car park.
        </Dateline>
        <Link href="/login" className={`${button.primary} mt-6 w-full`}>
          Sign in
        </Link>
      </div>
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
  const firstName = (profile?.name ?? "").split(" ")[0];

  return (
    <div>
      <Headline>{firstName ? `Ciao, ${firstName}` : "Your groups"}</Headline>
      <Dateline>Pick a group to sign up for the next match.</Dateline>

      <SectionTitle>Your groups</SectionTitle>
      {memberships && memberships.length > 0 ? (
        <ul className="border-2 border-ink bg-sheet">
          {memberships.map((m) => {
            const g = m.groups as unknown as { id: string; name: string; default_format: number };
            const ovr = displayOverall(m);
            return (
              <li key={g.id} className="border-b border-rule last:border-b-0">
                <Link
                  href={`/groups/${g.id}`}
                  className="grid min-h-16 grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2 transition-colors duration-150 hover:bg-paper"
                >
                  <span>
                    <span className="block font-semibold">{g.name}</span>
                    <span className="block text-sm text-ink-soft">
                      {g.default_format}-a-side{m.role !== "player" ? ` · ${m.role}` : ""}
                    </span>
                  </span>
                  <Mark value={ovr ?? "–"} />
                  <ChevronRight className="size-5 text-ink-soft" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty title="No groups yet">Ask a friend for their invite link, or start a group yourself.</Empty>
      )}
      <Link href="/groups/new" className={`${button.secondary} mt-4 w-full`}>
        Create a group
      </Link>

      <div className="mt-12 flex items-center justify-between border-t border-rule pt-4 text-sm text-ink-soft">
        <span>Signed in as {profile?.name ?? user.email}</span>
        <form action={signOut}>
          <button type="submit" className={button.quiet}>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
