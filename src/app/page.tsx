import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Team Builder</h1>
      <p className="max-w-sm text-lg text-zinc-600 dark:text-zinc-400">
        Balanced teams for 5-a-side and 7-a-side.
      </p>
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
      <Link href="/login" className="flex h-12 items-center rounded-full bg-foreground px-8 font-medium text-background">
        Sign in
      </Link>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();

  return (
    <div className="space-y-3">
      <p>
        Signed in as <strong>{profile?.name ?? user.email}</strong>
      </p>
      <form action={signOut}>
        <button type="submit" className="text-sm text-zinc-500 underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
