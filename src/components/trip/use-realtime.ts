"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { avatarUrl, displayName, useAuth } from "@/components/providers";
import { itinerarySchema } from "@/lib/schema";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useTripStore } from "@/store/trip-store";

export interface Peer {
  userId: string;
  name: string;
  avatar?: string;
}

/**
 * Live collaboration for cloud trips: Postgres change feeds push collaborators'
 * edits into the store, and a presence channel shows who's viewing right now.
 */
export function useRealtimeTrip(tripId: string | undefined, isCloud: boolean): Peer[] {
  const { user } = useAuth();
  const [peers, setPeers] = useState<Peer[]>([]);
  const peersRef = useRef<Peer[]>([]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !tripId || !isCloud || !user) return;

    const channel = supabase.channel(`trip:${tripId}`, { config: { presence: { key: user.id } } });

    channel
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trips", filter: `id=eq.${tripId}` },
        (payload) => {
          const row = payload.new as { itinerary?: unknown; updated_by?: string | null; is_public?: boolean };
          if (row.updated_by === user.id) return;
          const parsed = itinerarySchema.safeParse(row.itinerary);
          if (!parsed.success) return;
          useTripStore.getState().receiveRemote(parsed.data);
          useTripStore.getState().patchTrip({ isPublic: row.is_public });
          const editor = peersRef.current.find((p) => p.userId === row.updated_by)?.name ?? "A collaborator";
          toast(`${editor} updated the trip`, { duration: 2000 });
        },
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Peer>();
        const unique = new Map<string, Peer>();
        Object.values(state)
          .flat()
          .forEach((p) => unique.set(p.userId, { userId: p.userId, name: p.name, avatar: p.avatar }));
        peersRef.current = [...unique.values()];
        setPeers(peersRef.current);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId: user.id, name: displayName(user), avatar: avatarUrl(user) });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
      setPeers([]);
    };
  }, [tripId, isCloud, user]);

  return peers;
}
