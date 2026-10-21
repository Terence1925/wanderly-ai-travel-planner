"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Logo } from "@/components/site-header";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/** Only same-site relative paths are allowed as post-login redirects. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/trips";
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

function SignInForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const hasAuthError = params.get("error") === "auth";
  const supabase = getSupabaseBrowser();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const redirectTo = typeof window === "undefined" ? "" : `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  if (!supabase) {
    return (
      <p className="text-sm text-muted-foreground">
        Accounts aren&apos;t enabled on this deployment. Add Supabase keys to turn on sign-in, cloud saving and
        real-time collaboration. Until then, trips are saved in your browser.
      </p>
    );
  }

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  if (status === "sent") {
    return (
      <div className="text-center" role="status">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-accent/12 text-accent">
          <Mail className="size-6" />
        </span>
        <p className="font-display text-2xl">Check your inbox</p>
        <p className="mt-2 text-sm text-muted-foreground">We sent a sign-in link to <strong>{email}</strong>.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {hasAuthError && (
        <p role="alert" className="rounded-2xl bg-danger/10 p-4 text-sm text-danger">
          That sign-in link didn&apos;t work. Links work once, expire after an hour, and must be opened in the
          same browser you requested them from. Please request a new one below.
        </p>
      )}
      {process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true" && (
        <>
          <Button variant="outline" size="lg" className="w-full" onClick={google}>
            <GoogleIcon /> Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
      <form onSubmit={sendLink} className="space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Button type="submit" variant="accent" size="lg" className="w-full" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Email me a magic link"}
        </Button>
        {status === "error" && <p role="alert" className="text-sm text-danger">{message}</p>}
      </form>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] place-items-center px-4 py-12">
      <div className="w-full max-w-sm rounded-[32px] border border-border bg-card p-8 shadow-xl">
        <Logo className="mb-6" />
        <h1 className="font-display text-3xl">Welcome back</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">Sign in to save trips and plan with friends.</p>
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  );
}
