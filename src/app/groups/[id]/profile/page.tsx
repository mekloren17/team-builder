import { Suspense } from "react";
import { loadGroup } from "../data";
import { ProfileForm } from "./profile-form";

type Props = { params: Promise<{ id: string }> };

export default function ProfilePage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-8">
      <Suspense>
        <Profile params={params} />
      </Suspense>
    </main>
  );
}

async function Profile({ params }: Props) {
  const { id } = await params;
  const { me } = await loadGroup(id, `/groups/${id}/profile`);
  return <ProfileForm groupId={id} initial={me} />;
}
