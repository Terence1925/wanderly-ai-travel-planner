"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { itinerarySchema, tripRequestSchema, type Itinerary, type TripRequest } from "@/lib/schema";
import type { TripRecord } from "./types";

export interface TripRow {
  id: string;
  owner_id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  travelers: number;
  request: unknown;
  itinerary: unknown;
  cover_image: string | null;
  is_public: boolean;
  share_slug: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS =
  "id, owner_id, title, destination, start_date, end_date, travelers, request, itinerary, cover_image, is_public, share_slug, updated_by, created_at, updated_at";

/** Validates JSON columns on the way in: the database is a trust boundary too. */
export function rowToTrip(row: TripRow): TripRecord | null {
  const request = tripRequestSchema.safeParse(row.request);
  const itinerary = itinerarySchema.safeParse(row.itinerary);
  if (!request.success || !itinerary.success) return null;
  return {
    id: row.id,
    isCloud: true,
    ownerId: row.owner_id,
    request: request.data,
    itinerary: itinerary.data,
    isPublic: row.is_public,
    shareSlug: row.share_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toColumns(request: TripRequest, itinerary: Itinerary) {
  return {
    title: itinerary.title.slice(0, 120),
    destination: (itinerary.destination.name || request.destination).slice(0, 80),
    start_date: request.startDate,
    end_date: request.endDate,
    travelers: request.travelers,
    request,
    itinerary,
  };
}

export async function listCloudTrips(supabase: SupabaseClient): Promise<TripRecord[]> {
  const { data, error } = await supabase
    .from("trips")
    .select(COLUMNS)
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as TripRow[]).map(rowToTrip).filter((t): t is TripRecord => t !== null);
}

export async function getCloudTrip(supabase: SupabaseClient, id: string): Promise<TripRecord | null> {
  const { data, error } = await supabase.from("trips").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToTrip(data as TripRow) : null;
}

export async function createCloudTrip(
  supabase: SupabaseClient,
  ownerId: string,
  request: TripRequest,
  itinerary: Itinerary,
): Promise<TripRecord> {
  const { data, error } = await supabase
    .from("trips")
    .insert({ owner_id: ownerId, ...toColumns(request, itinerary) })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  const trip = rowToTrip(data as TripRow);
  if (!trip) throw new Error("Saved trip failed validation");
  return trip;
}

export async function updateCloudTrip(
  supabase: SupabaseClient,
  id: string,
  request: TripRequest,
  itinerary: Itinerary,
): Promise<void> {
  const { error } = await supabase.from("trips").update(toColumns(request, itinerary)).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setTripPublic(supabase: SupabaseClient, id: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase.from("trips").update({ is_public: isPublic }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Owner-only: the invite code is hidden from normal reads because it grants edit access. */
export async function getInviteCode(supabase: SupabaseClient, tripId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_invite_code", { p_trip_id: tripId });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

export async function deleteCloudTrip(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function joinTrip(supabase: SupabaseClient, code: string): Promise<string> {
  const { data, error } = await supabase.rpc("join_trip", { p_code: code });
  if (error) throw new Error(error.message);
  return data as string;
}
