import { Suspense } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { displayOverall, isGuest } from "@/lib/player";
import { POSITION_OPTIONS } from "@/lib/questionnaire";
import { PhotoEditor } from "@/components/photo-editor";
import { addGuest, removeGuest, setGuestPhoto, setMemberRole } from "../../actions";
import { loadGroup } from "../data";
import { CopyInvite } from "./copy-invite";

type Props = { params: Promise<{ id: string }> };

export default function SettingsPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
      <Suspense>
        <Settings params={params} />
      </Suspense>
    </main>
  );
}

async function Settings({ params }: Props) {
  const { id } = await params;
  const { group, players, me, canManage } = await loadGroup(id, `/groups/${id}/settings`);
  if (!canManage) notFound();

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const isOwner = me.role === "owner";
  const members = players.filter((p) => !isGuest(p));
  const guests = players.filter(isGuest);

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <Link href={`/groups/${id}`} className="text-sm text-zinc-500">
          ← {group.name}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Settings & invites</h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Invite link</h2>
        <p className="text-zinc-600 dark:text-zinc-400">Send it to your friends: they sign in and join the group.</p>
        <CopyInvite url={`${origin}/join/${group.invite_code}`} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Guests</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Players without an account. Give your best guess of their level (40–92: 60 is an average amateur, 75 a good
          club player).
        </p>
        {guests.length > 0 && (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {guests.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span>
                  {g.display_name} <span className="text-zinc-500">· {displayOverall(g)}</span>
                </span>
                <PhotoEditor
                  target={{ kind: "guest", playerId: g.id }}
                  currentUrl={g.photo_url}
                  save={setGuestPhoto.bind(null, id, g.id)}
                />
                {g.matches_played === 0 && (
                  <form action={removeGuest.bind(null, id, g.id)}>
                    <button type="submit" className="text-sm text-red-600 underline">
                      Remove
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        <form action={addGuest.bind(null, id)} className="space-y-3 rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <input
              name="name"
              required
              maxLength={40}
              placeholder="Guest name"
              className="h-12 rounded-xl border border-zinc-300 bg-background px-4 dark:border-zinc-700"
            />
            <input
              name="overall"
              type="number"
              required
              min={40}
              max={92}
              defaultValue={60}
              aria-label="Estimated overall"
              className="h-12 rounded-xl border border-zinc-300 bg-background px-4 dark:border-zinc-700"
            />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {POSITION_OPTIONS.map((o) => (
              <label key={o.value} className="flex items-center gap-2">
                <input type="checkbox" name="positions" value={o.value} className="size-4" />
                {o.label}
              </label>
            ))}
          </div>
          <button type="submit" className="h-11 w-full rounded-full bg-foreground font-medium text-background">
            Add guest
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Members</h2>
        {isOwner && <p className="text-zinc-600 dark:text-zinc-400">Admins can create matches, add guests and invite people.</p>}
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-3">
              <span>
                {m.display_name}
                <span className="ml-2 text-sm text-zinc-500">{m.role}</span>
              </span>
              {isOwner && m.role !== "owner" && (
                <form action={setMemberRole.bind(null, id, m.id, m.role === "admin" ? "player" : "admin")}>
                  <button type="submit" className="text-sm underline">
                    {m.role === "admin" ? "Remove admin" : "Make admin"}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
