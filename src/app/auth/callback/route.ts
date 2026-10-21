import { NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Exchanges the OAuth / magic-link code for a session cookie, then redirects in-app. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeRedirectPath(url.searchParams.get("next"), url.origin);

  const supabase = await getSupabaseServer();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/sign-in?error=auth", url.origin));
}
