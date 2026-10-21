"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/components/providers";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { joinTrip } from "@/lib/trips/cloud";

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (isLoading || !user || !supabase) return;
    joinTrip(supabase, code)
      .then((tripId) => router.replace(`/trip/${tripId}`))
      .catch((e: Error) => setError(e.message));
  }, [code, user, isLoading, router]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent/12 text-accent">
        <UserPlus className="size-6" />
      </span>
      <h1 className="font-display text-3xl">You&apos;re invited to plan a trip</h1>
      {error ? (
        <p className="mt-3 text-danger" role="alert">{error}</p>
      ) : !isLoading && !user ? (
        <>
          <p className="mt-3 text-muted-foreground">Sign in to join and edit the itinerary together in real time.</p>
          <Link href={`/sign-in?next=${encodeURIComponent(`/join/${code}`)}`} className={`${buttonVariants({ variant: "accent" })} mt-6`}>
            Sign in to join
          </Link>
        </>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Joining trip…
        </p>
      )}
    </div>
  );
}
