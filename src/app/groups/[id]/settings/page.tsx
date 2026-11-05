import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PhotoEditor } from "@/components/photo-editor";
import { button, Dateline, Headline, input, Mark, Page, Panel, SectionTitle } from "@/components/ui";
import { displayOverall, isGuest } from "@/lib/player";
import { POSITION_OPTIONS } from "@/lib/questionnaire";
import { addGuest, removeGuest, setGuestPhoto, setMemberRole } from "../../actions";
import { loadGroup } from "../data";
import { CopyInvite } from "./copy-invite";

type Props = { params: Promise<{ id: string }> };

export default function SettingsPage({ params }: Props) {
  return (
    <Page>
      <Suspense>
        <Settings params={params} />
      </Suspense>
    </Page>
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
    <div>
      <Headline>The group</Headline>
      <Dateline>Invite people, add the friends who don&apos;t use the app, choose who helps you run things.</Dateline>

      <SectionTitle>Invite link</SectionTitle>
      <p className="mb-3 text-chalk-soft">Drop it in the group chat: they sign in with Google and they&apos;re in.</p>
      <CopyInvite url={`${origin}/join/${group.invite_code}`} />

      <SectionTitle>Guests</SectionTitle>
      <p className="mb-3 text-chalk-soft">
        Friends without an account. Guess their level: 60 is an average Sunday player, 75 a good club player.
      </p>
      {guests.length > 0 && (
        <Panel className="mb-4">
          <ul>
            {guests.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3 last:border-b-0">
                <span className="flex items-baseline gap-2">
                  <span className="font-semibold">{g.display_name}</span>
                  <Mark value={displayOverall(g) ?? "–"} size="sm" />
                </span>
                <span className="flex items-center gap-4">
                  <PhotoEditor
                    target={{ kind: "guest", playerId: g.id }}
                    currentUrl={g.photo_url}
                    save={setGuestPhoto.bind(null, id, g.id)}
                  />
                  {g.matches_played === 0 && (
                    <form action={removeGuest.bind(null, id, g.id)}>
                      <button type="submit" className={button.danger}>
                        Remove
                      </button>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <form action={addGuest.bind(null, id)} className="space-y-4 rounded-md border-2 border-dashed border-line p-4">
        <div className="grid grid-cols-[1fr_6.5rem] gap-3">
          <label className="space-y-1">
            <span className="text-sm font-semibold">Name</span>
            <input name="name" required maxLength={40} placeholder="Marco's cousin" className={input} />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold">Level</span>
            <input name="overall" type="number" required min={40} max={92} defaultValue={60} className={input} />
          </label>
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-semibold">Plays as</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {POSITION_OPTIONS.map((o) => (
              <label key={o.value} className="flex min-h-10 items-center gap-2">
                <input type="checkbox" name="positions" value={o.value} className="size-5" />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className={`${button.secondary} w-full`}>
          Add guest
        </button>
      </form>

      <SectionTitle>Members</SectionTitle>
      {isOwner && <p className="mb-3 text-chalk-soft">Admins can create matches, make teams, add guests and invite people.</p>}
      <Panel>
        <ul>
          {members.map((m) => (
            <li key={m.id} className="flex min-h-14 items-center justify-between gap-3 border-b border-rule px-4 last:border-b-0">
              <span>
                <span className="font-semibold">{m.display_name}</span>
                <span className="ml-2 text-xs font-bold uppercase text-chalk-soft">{m.role}</span>
              </span>
              {isOwner && m.role !== "owner" && (
                <form action={setMemberRole.bind(null, id, m.id, m.role === "admin" ? "player" : "admin")}>
                  <button type="submit" className={button.small}>
                    {m.role === "admin" ? "Remove admin" : "Make admin"}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
