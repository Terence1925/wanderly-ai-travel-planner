"use client";

import { storage } from "@/lib/utils";
import { newId } from "@/lib/itinerary";
import type { Itinerary, TripRequest } from "@/lib/schema";
import type { TripRecord } from "./types";

const KEY = "wanderly:trips";

export function listLocalTrips(): TripRecord[] {
  return storage
    .get<TripRecord[]>(KEY, [])
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getLocalTrip(id: string): TripRecord | null {
  return listLocalTrips().find((t) => t.id === id) ?? null;
}

export function saveLocalTrip(trip: TripRecord): void {
  const others = storage.get<TripRecord[]>(KEY, []).filter((t) => t.id !== trip.id);
  storage.set(KEY, [{ ...trip, updatedAt: new Date().toISOString() }, ...others]);
}

export function createLocalTrip(request: TripRequest, itinerary: Itinerary): TripRecord {
  const now = new Date().toISOString();
  const trip: TripRecord = {
    id: newId("local"),
    isCloud: false,
    request,
    itinerary,
    createdAt: now,
    updatedAt: now,
  };
  saveLocalTrip(trip);
  return trip;
}

export function deleteLocalTrip(id: string): void {
  storage.set(
    KEY,
    storage.get<TripRecord[]>(KEY, []).filter((t) => t.id !== id),
  );
}
