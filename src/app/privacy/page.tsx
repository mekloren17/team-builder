import { Headline, Masthead } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy — Team Builder" };

const CONTACT_EMAIL = "lorenzo.mekhael@gmail.com";

export default function PrivacyPage() {
  return (
    <>
    <Masthead title="Team Builder" />
    <main className="mx-auto w-full max-w-[68ch] space-y-5 px-4 py-6 leading-7 sm:px-6">
      <Headline>Privacy policy</Headline>
      <p className="text-sm font-semibold text-ink-soft">Last updated: 15 October 2026</p>

      <p>
        Team Builder is a small app, run by Lorenzo for groups of friends, that builds balanced teams for 5-a-side
        and 7-a-side football. This page explains what data it keeps and why.
      </p>

      <h2 className="border-t-2 border-ink pt-2 font-display text-xl font-extrabold uppercase">What we collect</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>From your Google account or email sign-in: your name, email address and profile picture.</li>
        <li>What you tell us in your player profile: birth year, football experience, preferred positions and your self-assessment.</li>
        <li>
          Your card photo: your Google profile picture, or a photo you upload. You can change or remove it at any time
          from your profile.
        </li>
        <li>The matches you play in: teams, scores and the rating the app computes from them.</li>
      </ul>

      <h2 className="border-t-2 border-ink pt-2 font-display text-xl font-extrabold uppercase">How we use it</h2>
      <p>
        Only to run the app: to sign you in, to show your player card to the members of your groups and to build
        balanced teams. Your email address is never shown to other players. We do not sell your data, show ads or
        share it with anyone else.
      </p>

      <h2 className="border-t-2 border-ink pt-2 font-display text-xl font-extrabold uppercase">Where it is stored</h2>
      <p>
        Data is stored with Supabase (database servers in Frankfurt, Germany) and the app is hosted by Vercel. Card
        photos are stored under random, unguessable addresses: they are shown inside the app, but anyone who has the
        exact address of a photo could open it.
      </p>

      <h2 className="border-t-2 border-ink pt-2 font-display text-xl font-extrabold uppercase">Your choices</h2>
      <p>
        You can ask to see, correct or delete your data at any time by writing to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline decoration-2">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </main>
    </>
  );
}
