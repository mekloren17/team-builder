import Link from "next/link";
import { createGroup } from "../actions";

export default function NewGroupPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-6 py-12">
      <Link href="/" className="text-sm text-zinc-500">
        ← Back
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Create a group</h1>
      <form action={createGroup} className="space-y-5">
        <label className="block space-y-2">
          <span className="font-medium">Group name</span>
          <input
            name="name"
            required
            maxLength={60}
            placeholder="Tuesday football"
            className="h-12 w-full rounded-xl border border-zinc-300 bg-transparent px-4 dark:border-zinc-700"
          />
        </label>
        <fieldset className="space-y-2">
          <legend className="font-medium">Usual format</legend>
          <div className="grid grid-cols-2 gap-3">
            {[5, 7].map((f) => (
              <label
                key={f}
                className="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-zinc-300 has-checked:border-foreground has-checked:bg-foreground has-checked:text-background dark:border-zinc-700"
              >
                <input type="radio" name="format" value={f} defaultChecked={f === 5} className="sr-only" />
                {f}-a-side
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="h-12 w-full rounded-full bg-foreground font-medium text-background">
          Create group
        </button>
      </form>
    </main>
  );
}
