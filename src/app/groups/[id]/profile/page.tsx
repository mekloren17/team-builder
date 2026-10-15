import { Suspense } from "react";
import { Page } from "@/components/ui";
import { loadGroup } from "../data";
import { ProfileForm } from "./profile-form";

type Props = { params: Promise<{ id: string }> };

export default function ProfilePage({ params }: Props) {
  return (
    <Page>
      <Suspense>
        <Profile params={params} />
      </Suspense>
    </Page>
  );
}

async function Profile({ params }: Props) {
  const { id } = await params;
  const { me } = await loadGroup(id, `/groups/${id}/profile`);
  return <ProfileForm groupId={id} initial={me} />;
}
