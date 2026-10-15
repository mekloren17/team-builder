import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadGroup } from "../../data";
import { NewMatchForm } from "./new-match-form";

type Props = { params: Promise<{ id: string }> };

export default function NewMatchPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-6 py-10">
      <Suspense>
        <NewMatch params={params} />
      </Suspense>
    </main>
  );
}

async function NewMatch({ params }: Props) {
  const { id } = await params;
  const { group, canManage } = await loadGroup(id, `/groups/${id}/matches/new`);
  if (!canManage) notFound();
  return (
    <>
      <Link href={`/groups/${id}`} className="text-sm text-zinc-500">
        ← {group.name}
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">New match</h1>
      <NewMatchForm groupId={id} defaultFormat={group.default_format} />
    </>
  );
}
