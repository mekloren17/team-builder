import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Masthead } from "@/components/ui";
import { TabBar } from "./tab-bar";

/** Every group page: the masthead with the group's name, the section tabs, then the page. */
export default function GroupLayout({ children, params }: LayoutProps<"/groups/[id]">) {
  return (
    <div className="flex flex-1 flex-col pb-24 md:pb-10">
      <Suspense fallback={<Masthead title="Team Builder" />}>
        <Chrome params={params} />
      </Suspense>
      {children}
    </div>
  );
}

async function Chrome({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: group }, { data: role }] = await Promise.all([
    supabase.from("groups").select("name").eq("id", id).maybeSingle(),
    supabase.rpc("my_role", { gid: id }),
  ]);
  if (!group || !role) return <Masthead title="Team Builder" />;

  return (
    <>
      <Masthead
        title={group.name}
        right={
          <Link href="/" className="hover:text-chalk">
            All groups
          </Link>
        }
      />
      <TabBar groupId={id} canManage={role !== "player"} />
    </>
  );
}
