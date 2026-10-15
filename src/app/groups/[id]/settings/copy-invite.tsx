"use client";

import { useState } from "react";

/** Shows the full invite link and copies it (or opens the phone's share sheet). */
export function CopyInvite({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join my Team Builder group", url });
        return;
      } catch {
        // cancelled: fall back to copying
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        className="h-12 min-w-0 flex-1 rounded-xl border border-zinc-300 bg-transparent px-4 text-sm dark:border-zinc-700"
      />
      <button type="button" onClick={share} className="h-12 shrink-0 rounded-full bg-foreground px-5 font-medium text-background">
        {copied ? "Copied!" : "Share"}
      </button>
    </div>
  );
}
