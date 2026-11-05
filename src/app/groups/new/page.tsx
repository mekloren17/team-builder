import { BackLink, button, Dateline, Headline, input, Masthead, Page } from "@/components/ui";
import { createGroup } from "../actions";

export default function NewGroupPage() {
  return (
    <>
      <Masthead title="Team Builder" />
      <Page>
        <BackLink href="/">Your groups</BackLink>
        <Headline>Start a group</Headline>
        <Dateline>Name it like the chat. You&apos;ll get an invite link for everyone else.</Dateline>
        <form action={createGroup} className="mt-6 space-y-6">
          <label className="block space-y-2">
            <span className="font-semibold">Group name</span>
            <input name="name" required maxLength={60} placeholder="Tuesday football" className={input} />
          </label>
          <fieldset>
            <legend className="mb-2 font-semibold">Usual format</legend>
            <div className="grid grid-cols-2 gap-2">
              {[5, 7].map((f) => (
                <label
                  key={f}
                  className="flex min-h-12 cursor-pointer items-center justify-center rounded-md border-2 border-line bg-panel font-medium transition-colors duration-150 hover:bg-raised has-checked:bg-chalk has-checked:text-turf has-focus-visible:outline-3 has-focus-visible:outline-bib"
                >
                  <input type="radio" name="format" value={f} defaultChecked={f === 5} className="sr-only" />
                  {f}-a-side
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className={`${button.primary} w-full`}>
            Create group
          </button>
        </form>
      </Page>
    </>
  );
}
