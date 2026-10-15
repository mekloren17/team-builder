"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { button } from "@/components/ui";

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
    <div className="flex">
      <input
        readOnly
        value={url}
        aria-label="Invite link"
        onFocus={(e) => e.target.select()}
        className="min-h-12 min-w-0 flex-1 border-2 border-r-0 border-ink bg-sheet px-3 text-sm"
      />
      <button type="button" onClick={share} className={`${button.primary} shrink-0 text-base`}>
        {copied ? <Check className="size-5" aria-hidden /> : <Share2 className="size-5" aria-hidden />}
        {copied ? "Copied" : "Share"}
      </button>
    </div>
  );
}
