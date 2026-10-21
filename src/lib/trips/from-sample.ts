"use client";

import { addDays } from "@/lib/itinerary";
import { SAMPLE_TRIPS } from "@/lib/demo/samples";
import type { TripRequest } from "@/lib/schema";
import { createLocalTrip } from "./local";
import type { TripRecord } from "./types";

/** Copies a sample into the visitor's own trips, dated to start a month from today. */
export function createTripFromSample(slug: string): TripRecord | null {
  const sample = SAMPLE_TRIPS.find((s) => s.slug === slug);
  if (!sample) return null;
  const start = addDays(new Date().toISOString().slice(0, 10), 30);
  const it = sample.itinerary;
  const request: TripRequest = {
    destination: it.destination.name,
    startDate: start,
    endDate: addDays(start, it.days.length - 1),
    travelers: 2,
    budget: "moderate",
    styles: ["food", "culture"],
    pace: "balanced",
    notes: "",
  };
  return createLocalTrip(request, {
    ...it,
    days: it.days.map((d) => ({ ...d, date: addDays(start, d.day - 1) })),
  });
}
