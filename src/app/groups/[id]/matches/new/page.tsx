import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BackLink, Dateline, Headline, Page } from "@/components/ui";
import { loadGroup } from "../../data";
import { NewMatchForm } from "./new-match-form";

type Props = { params: Promise<{ id: string }> };

export default function NewMatchPage({ params }: Props) {
  return (
    <Page>
      <Suspense>
        <NewMatch params={params} />
      </Suspense>
    </Page>
  );
}

async function NewMatch({ params }: Props) {
  const { id } = await params;
  const { group, canManage } = await loadGroup(id, `/groups/${id}/matches/new`);
  if (!canManage) notFound();
  return (
    <>
      <BackLink href={`/groups/${id}/matches`}>Matches</BackLink>
      <Headline>New match</Headline>
      <Dateline>Pick the day and the format. Then drop the link in {group.name}&apos;s chat.</Dateline>
      <NewMatchForm groupId={id} defaultFormat={group.default_format} />
    </>
  );
}
