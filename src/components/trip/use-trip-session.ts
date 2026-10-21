"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { emptyItinerary } from "@/lib/itinerary";
import { readEventStream } from "@/lib/ndjson";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { createCloudTrip, getCloudTrip, updateCloudTrip } from "@/lib/trips/cloud";
import { createLocalTrip, getLocalTrip, saveLocalTrip } from "@/lib/trips/local";
import { clearPendingRequest, getPendingRequest } from "@/lib/trips/pending";
import { isLocalId, type TripRecord } from "@/lib/trips/types";
import type { TripRequest } from "@/lib/schema";
import { useTripStore } from "@/store/trip-store";

async function persistNewTrip(request: TripRequest, trip: TripRecord): Promise<TripRecord> {
  const supabase = getSupabaseBrowser();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (supabase && user) {
    try {
      return await createCloudTrip(supabase, user.id, request, trip.itinerary);
    } catch (error) {
      console.error(error);
      toast.error("Couldn't save to your account, so the trip is saved in this browser instead.");
    }
  }
  return createLocalTrip(request, trip.itinerary);
}

/** Streams a brand-new itinerary from the API into the store, then saves it. */
function useGeneration(enabled: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const request = getPendingRequest();
    if (!request) {
      router.replace("/plan");
      return;
    }

    const store = useTripStore.getState();
    const now = new Date().toISOString();
    store.setTrip(
      { id: "new", isCloud: false, request, itinerary: emptyItinerary(request), createdAt: now, updatedAt: now },
      "generating",
    );
    store.setDemo(false);

    const controller = new AbortController();
    let streamError: string | null = null;

    (async () => {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Couldn't start planning. Please try again.");
        }
        await readEventStream(res, (event) => {
          if (event.type === "error") streamError = event.message;
          else if (event.type === "done") useTripStore.getState().setDemo(Boolean(event.demo));
          else useTripStore.getState().applyStreamEvent(event);
        });

        const generated = useTripStore.getState().trip;
        if (!generated || generated.itinerary.days.length === 0) {
          throw new Error(streamError ?? "The AI didn't return an itinerary. Please try again.");
        }
        if (streamError) toast.warning(streamError);

        const saved = await persistNewTrip(request, generated);
        clearPendingRequest();
        useTripStore.getState().setTrip(saved);
        router.replace(`/trip/${saved.id}`);
      } catch (error) {
        if (controller.signal.aborted) return;
        useTripStore.getState().setStatus("error", error instanceof Error ? error.message : "Something went wrong");
      }
    })();

    return () => controller.abort();
  }, [enabled, router]);
}

/** Loads an existing trip unless the store already holds it (e.g. right after generation). */
function useTripLoader(id: string) {
  useEffect(() => {
    if (id === "new") return;
    const store = useTripStore.getState();
    if (store.trip?.id === id) return;

    store.setTrip(null, "loading");
    if (isLocalId(id)) {
      const trip = getLocalTrip(id);
      if (trip) store.setTrip(trip);
      else store.setStatus("error", "This trip isn't saved in this browser.");
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      store.setStatus("error", "Cloud trips need Supabase to be configured.");
      return;
    }
    getCloudTrip(supabase, id)
      .then((trip) => {
        if (trip) useTripStore.getState().setTrip(trip);
        else useTripStore.getState().setStatus("error", "Trip not found, or you don't have access to it.");
      })
      .catch((e: Error) => useTripStore.getState().setStatus("error", e.message));
  }, [id]);
}

export type SaveState = "idle" | "saving" | "saved" | "error";

/** Debounced autosave of local edits to the browser or to Supabase. */
function useAutosave(canEdit: boolean): SaveState {
  const revision = useTripStore((s) => s.revision);
  const [state, setState] = useState<SaveState>("idle");
  const lastSaved = useRef(0);

  useEffect(() => {
    if (!canEdit || revision === 0 || revision === lastSaved.current) return;
    setState("saving");
    const t = setTimeout(async () => {
      const trip = useTripStore.getState().trip;
      if (!trip || trip.id === "new") return;
      try {
        if (trip.isCloud) {
          const supabase = getSupabaseBrowser();
          if (!supabase) throw new Error("Supabase not configured");
          await updateCloudTrip(supabase, trip.id, trip.request, trip.itinerary);
        } else {
          saveLocalTrip(trip);
        }
        lastSaved.current = revision;
        setState("saved");
      } catch (error) {
        console.error(error);
        setState("error");
        toast.error("Couldn't save your latest change.");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [revision, canEdit]);

  return state;
}

/** Resolves whether the signed-in user may edit the current cloud trip. */
function useCanEdit(): boolean {
  const trip = useTripStore((s) => s.trip);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (!trip || trip.id === "new") return setCanEdit(false);
    if (!trip.isCloud) return setCanEdit(true);
    const supabase = getSupabaseBrowser();
    if (!supabase) return setCanEdit(false);
    let isActive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return isActive && setCanEdit(false);
      if (user.id === trip.ownerId) return isActive && setCanEdit(true);
      const { data: member } = await supabase
        .from("trip_members")
        .select("role")
        .eq("trip_id", trip.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (isActive) setCanEdit(member?.role === "editor");
    })();
    return () => {
      isActive = false;
    };
    // Only re-check when the trip identity or owner changes, not on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id, trip?.ownerId, trip?.isCloud]);

  return canEdit;
}

export function useTripSession(id: string) {
  useGeneration(id === "new");
  useTripLoader(id);
  const canEdit = useCanEdit();
  const saveState = useAutosave(canEdit);
  return { canEdit, saveState };
}
