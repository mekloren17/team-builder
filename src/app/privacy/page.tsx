import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy — Team Builder" };

const CONTACT_EMAIL = "lorenzo.mekhael@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-6 py-12 leading-7">
      <h1 className="text-3xl font-bold tracking-tight">Privacy policy</h1>
      <p className="text-sm text-zinc-500">Last updated: 15 October 2026</p>

      <p>
        Team Builder is a small app, run by Lorenzo for groups of friends, that builds balanced teams for 5-a-side
        and 7-a-side football. This page explains what data it keeps and why.
      </p>

      <h2 className="text-xl font-semibold">What we collect</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>From your Google account or email sign-in: your name, email address and profile picture.</li>
        <li>What you tell us in your player profile: birth year, football experience, preferred positions and your self-assessment.</li>
        <li>The matches you play in: teams, scores and the rating the app computes from them.</li>
      </ul>

      <h2 className="text-xl font-semibold">How we use it</h2>
      <p>
        Only to run the app: to sign you in, to show your player card to the members of your groups and to build
        balanced teams. Your email address is never shown to other players. We do not sell your data, show ads or
        share it with anyone else.
      </p>

      <h2 className="text-xl font-semibold">Where it is stored</h2>
      <p>
        Data is stored with Supabase (database servers in Frankfurt, Germany) and the app is hosted by Vercel.
      </p>

      <h2 className="text-xl font-semibold">Your choices</h2>
      <p>
        You can ask to see, correct or delete your data at any time by writing to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </main>
  );
}
