import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";
import { itinerarySchema, tripRequestSchema, type Itinerary, type TripRequest } from "@/lib/schema";

export interface PublicTrip {
  request: TripRequest;
  itinerary: Itinerary;
}

/** Reads a public trip as the anonymous role; RLS only exposes rows with is_public = true. */
export const getPublicTrip = cache(async (slug: string): Promise<PublicTrip | null> => {
  if (!isSupabaseConfigured || !/^[a-f0-9]{6,32}$/.test(slug)) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data } = await supabase
    .from("trips")
    .select("request, itinerary")
    .eq("share_slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (!data) return null;
  const request = tripRequestSchema.safeParse(data.request);
  const itinerary = itinerarySchema.safeParse(data.itinerary);
  return request.success && itinerary.success ? { request: request.data, itinerary: itinerary.data } : null;
});
