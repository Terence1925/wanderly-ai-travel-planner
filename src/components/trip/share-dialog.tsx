"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Cloud, Copy, Globe, Lock, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useAuth } from "@/components/providers";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { createCloudTrip, getInviteCode, setTripPublic } from "@/lib/trips/cloud";
import { deleteLocalTrip } from "@/lib/trips/local";
import { cn } from "@/lib/utils";
import { useTripStore } from "@/store/trip-store";

function CopyRow({ label, url, icon: Icon }: { label: string; url: string; icon: typeof Globe }) {
  const [isCopied, setIsCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.");
    }
  };
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 p-1.5 pl-3">
        <input readOnly value={url} aria-label={label} className="min-w-0 flex-1 bg-transparent text-sm outline-none" onFocus={(e) => e.target.select()} />
        <Button size="sm" variant="outline" onClick={copy}>
          {isCopied ? <Check /> : <Copy />} {isCopied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

export function ShareDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { user, isEnabled } = useAuth();
  const trip = useTripStore((s) => s.trip);
  const [isWorking, setIsWorking] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const isOwner = Boolean(user && trip?.ownerId === user.id);
  const tripId = trip?.isCloud ? trip.id : null;

  // The invite code is only readable by the owner, through a dedicated database function.
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!open || !isOwner || !tripId || !supabase) return setInviteCode(null);
    getInviteCode(supabase, tripId)
      .then(setInviteCode)
      .catch(() => setInviteCode(null));
  }, [open, isOwner, tripId]);

  if (!trip) return null;
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const moveToCloud = async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !user) return;
    setIsWorking(true);
    try {
      const saved = await createCloudTrip(supabase, user.id, trip.request, trip.itinerary);
      deleteLocalTrip(trip.id);
      useTripStore.getState().setTrip(saved);
      router.replace(`/trip/${saved.id}`);
      toast.success("Saved to your account. You can now share and collaborate.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the trip");
    } finally {
      setIsWorking(false);
    }
  };

  const togglePublic = async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const next = !trip.isPublic;
    setIsWorking(true);
    try {
      await setTripPublic(supabase, trip.id, next);
      useTripStore.getState().patchTrip({ isPublic: next });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update sharing");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Share this trip" description="Send a read-only link, or invite friends to plan together.">
      {!trip.isCloud ? (
        <div className="space-y-4 text-sm">
          <p className="flex gap-3 rounded-2xl bg-muted p-4 text-muted-foreground">
            <Cloud className="size-5 shrink-0 text-accent" />
            This trip is saved in this browser only. Save it to your account to share it and collaborate in real time.
          </p>
          {!isEnabled ? (
            <p className="text-muted-foreground">Accounts aren&apos;t enabled on this deployment (Supabase isn&apos;t configured).</p>
          ) : user ? (
            <Button variant="accent" className="w-full" onClick={moveToCloud} disabled={isWorking}>
              <Cloud /> {isWorking ? "Saving…" : "Save to my account"}
            </Button>
          ) : (
            <Link href={`/sign-in?next=${encodeURIComponent(`/trip/${trip.id}`)}`} className={cn(buttonVariants({ variant: "accent" }), "w-full")}>
              Sign in to share
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {isOwner && (
            <button
              type="button"
              onClick={togglePublic}
              disabled={isWorking}
              role="switch"
              aria-checked={Boolean(trip.isPublic)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border p-4 text-left transition-colors hover:bg-muted/50"
            >
              {trip.isPublic ? <Globe className="size-5 text-success" /> : <Lock className="size-5 text-muted-foreground" />}
              <span className="flex-1">
                <span className="block text-sm font-medium">{trip.isPublic ? "Anyone with the link can view" : "Private"}</span>
                <span className="block text-xs text-muted-foreground">Public links show a read-only itinerary and map</span>
              </span>
              <span className={cn("relative h-6 w-11 rounded-full transition-colors", trip.isPublic ? "bg-success" : "bg-border")}>
                <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", trip.isPublic ? "left-[22px]" : "left-0.5")} />
              </span>
            </button>
          )}
          {trip.isPublic && trip.shareSlug && <CopyRow label="Public view link" url={`${origin}/share/${trip.shareSlug}`} icon={Globe} />}
          {isOwner && inviteCode && (
            <CopyRow label="Invite collaborators (can edit)" url={`${origin}/join/${inviteCode}`} icon={UserPlus} />
          )}
          {!isOwner && <p className="text-sm text-muted-foreground">Only the trip owner can change sharing settings.</p>}
        </div>
      )}
    </Dialog>
  );
}
