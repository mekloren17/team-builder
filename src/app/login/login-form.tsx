"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { button, ErrorText, input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

// Email sign-in stays hidden until a custom SMTP is set up (see CLAUDE.md, open decisions).
const EMAIL_LOGIN_ENABLED = false;

export function LoginForm() {
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error") === "link";
  const next = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(
    linkError ? "That sign-in link is invalid or has expired. Please ask for a new one." : null,
  );

  async function signInWithGoogle() {
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(next) },
    });
    if (error) setError(error.message);
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl(next) },
    });
    if (error) {
      setError(error.message);
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={signInWithGoogle}
        className={`${button.primary} w-full`}
      >
        Continue with Google
      </button>

      {EMAIL_LOGIN_ENABLED && (
        <>
          <div className="flex items-center gap-3 text-sm text-chalk-soft">
            <span className="h-px flex-1 bg-rule" />
            or
            <span className="h-px flex-1 bg-rule" />
          </div>

          {status === "sent" ? (
            <p className="rounded-md border-2 border-line bg-panel p-4">
              Check your inbox: we sent a sign-in link to <strong>{email}</strong>.
            </p>
          ) : (
            <form onSubmit={sendMagicLink} className="space-y-3">
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className={`${button.secondary} w-full`}
              >
                {status === "sending" ? "Sending…" : "Email me a sign-in link"}
              </button>
            </form>
          )}
        </>
      )}

      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

/** Where Supabase sends the user back; `next` is the page to open after sign-in (e.g. an invite). */
function callbackUrl(next: string | null) {
  const url = `${window.location.origin}/auth/callback`;
  return next ? `${url}?next=${encodeURIComponent(next)}` : url;
}
