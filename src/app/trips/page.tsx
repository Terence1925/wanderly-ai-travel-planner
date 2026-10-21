"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Cloud, HardDrive, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { DestinationCover } from "@/components/destination-cover";
import { useAuth } from "@/components/providers";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { deleteCloudTrip, listCloudTrips } from "@/lib/trips/cloud";
import { deleteLocalTrip, listLocalTrips } from "@/lib/trips/local";
import type { TripRecord } from "@/lib/trips/types";
import { cn, formatDate } from "@/lib/utils";

type Filter = "upcoming" | "past";

export default function TripsPage() {
  const { user, isEnabled, isLoading: isAuthLoading } = useAuth();
  const [trips, setTrips] = useState<TripRecord[] | null>(null);
  const [filter, setFilter] = useState<Filter>("upcoming");

  useEffect(() => {
    if (isAuthLoading) return;
    const local = listLocalTrips();
    const supabase = getSupabaseBrowser();
    if (!supabase || !user) return setTrips(local);
    listCloudTrips(supabase)
      .then((cloud) => setTrips([...cloud, ...local]))
      .catch((e: Error) => {
        toast.error(`Couldn't load cloud trips: ${e.message}`);
        setTrips(local);
      });
  }, [user, isAuthLoading]);

  const remove = async (trip: TripRecord) => {
    if (!window.confirm(`Delete “${trip.itinerary.title}”? This can't be undone.`)) return;
    try {
      if (trip.isCloud) {
        const supabase = getSupabaseBrowser();
        if (supabase) await deleteCloudTrip(supabase, trip.id);
      } else {
        deleteLocalTrip(trip.id);
      }
      setTrips((t) => t?.filter((x) => x.id !== trip.id) ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete trip");
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const visible = (trips ?? []).filter((t) => (filter === "upcoming" ? t.request.endDate >= today : t.request.endDate < today));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-tight">My trips</h1>
          <p className="mt-2 text-muted-foreground">
            {user ? "Trips in your account and this browser." : "Trips saved in this browser."}
            {isEnabled && !user && (
              <>
                {" "}
                <Link href="/sign-in?next=/trips" className="text-accent hover:underline">Sign in</Link> to sync across devices.
              </>
            )}
          </p>
        </div>
        <Link href="/plan" className={buttonVariants({ variant: "accent" })}>
          <Plus /> New trip
        </Link>
      </div>

      <div role="tablist" aria-label="Filter trips" className="mb-6 inline-flex rounded-full bg-muted p-1">
        {(["upcoming", "past"] as const).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn("rounded-full px-4 py-1.5 text-sm capitalize", filter === f ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}
          >
            {f}
          </button>
        ))}
      </div>

      {trips === null ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton aspect-[4/3] rounded-3xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border px-6 py-20 text-center">
          <p className="font-display text-3xl">{filter === "upcoming" ? "No upcoming trips yet" : "No past trips"}</p>
          <p className="mt-2 text-muted-foreground">Plan one in under a minute, or start from a sample.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/plan" className={buttonVariants({ variant: "accent" })}>Plan a trip</Link>
            <Link href="/explore" className={buttonVariants({ variant: "outline" })}>Browse samples</Link>
          </div>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => (
            <li key={t.id} className="group relative">
              <Link href={`/trip/${t.id}`} className="block">
                <DestinationCover place={t.itinerary.destination.name || t.request.destination} className="aspect-[4/3] rounded-3xl shadow-md transition-all group-hover:-translate-y-1 group-hover:shadow-xl">
                  <div className="flex h-full flex-col justify-end p-5 text-white">
                    <p className="flex items-center gap-1.5 text-xs opacity-90">
                      {t.isCloud ? <Cloud className="size-3.5" /> : <HardDrive className="size-3.5" />}
                      {t.itinerary.destination.name || t.request.destination}
                    </p>
                    <p className="font-display text-2xl leading-tight">{t.itinerary.title}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs opacity-80">
                      <CalendarDays className="size-3.5" /> {formatDate(t.request.startDate, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </DestinationCover>
              </Link>
              {(!t.isCloud || t.ownerId === user?.id) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(t)}
                  aria-label={`Delete ${t.itinerary.title}`}
                  className="absolute right-3 top-3 bg-black/30 text-white opacity-0 backdrop-blur hover:bg-black/50 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
