"use client";

import { create } from "zustand";
import { applyEvent } from "@/lib/itinerary";
import type { Itinerary, StreamEvent } from "@/lib/schema";
import type { TripRecord } from "@/lib/trips/types";

const HISTORY_LIMIT = 40;

export type TripStatus = "idle" | "loading" | "generating" | "ready" | "error";

interface TripState {
  trip: TripRecord | null;
  status: TripStatus;
  error: string | null;
  isDemo: boolean;
  past: Itinerary[];
  future: Itinerary[];
  /** Bumped on every local edit so the autosaver knows there is something to persist. */
  revision: number;
  selectedActivityId: string | null;
  focusedDay: number | null;
  changedDays: number[];

  setTrip: (trip: TripRecord | null, status?: TripStatus) => void;
  setStatus: (status: TripStatus, error?: string | null) => void;
  setDemo: (isDemo: boolean) => void;
  applyStreamEvent: (event: StreamEvent) => void;
  edit: (update: (itinerary: Itinerary) => Itinerary) => void;
  /** Applies a collaborator's change without recording it in local undo history. */
  receiveRemote: (itinerary: Itinerary) => void;
  patchTrip: (patch: Partial<TripRecord>) => void;
  undo: () => void;
  redo: () => void;
  selectActivity: (id: string | null) => void;
  focusDay: (day: number | null) => void;
  markChanged: (days: number[]) => void;
}

export const useTripStore = create<TripState>((set, get) => ({
  trip: null,
  status: "idle",
  error: null,
  isDemo: false,
  past: [],
  future: [],
  revision: 0,
  selectedActivityId: null,
  focusedDay: null,
  changedDays: [],

  setTrip: (trip, status = "ready") =>
    set({ trip, status, error: null, past: [], future: [], revision: 0, changedDays: [], selectedActivityId: null, focusedDay: null }),

  setStatus: (status, error = null) => set({ status, error }),

  setDemo: (isDemo) => set({ isDemo }),

  applyStreamEvent: (event) => {
    const { trip } = get();
    if (!trip) return;
    set({ trip: { ...trip, itinerary: applyEvent(trip.itinerary, event) } });
  },

  edit: (update) => {
    const { trip, past, revision } = get();
    if (!trip) return;
    const next = update(trip.itinerary);
    if (next === trip.itinerary) return;
    set({
      trip: { ...trip, itinerary: next },
      past: [...past, trip.itinerary].slice(-HISTORY_LIMIT),
      future: [],
      revision: revision + 1,
    });
  },

  receiveRemote: (itinerary) => {
    const { trip } = get();
    if (trip) set({ trip: { ...trip, itinerary } });
  },

  patchTrip: (patch) => {
    const { trip } = get();
    if (trip) set({ trip: { ...trip, ...patch } });
  },

  undo: () => {
    const { trip, past, future, revision } = get();
    const previous = past.at(-1);
    if (!trip || !previous) return;
    set({
      trip: { ...trip, itinerary: previous },
      past: past.slice(0, -1),
      future: [trip.itinerary, ...future],
      revision: revision + 1,
      changedDays: [],
    });
  },

  redo: () => {
    const { trip, past, future, revision } = get();
    const [next, ...rest] = future;
    if (!trip || !next) return;
    set({
      trip: { ...trip, itinerary: next },
      past: [...past, trip.itinerary],
      future: rest,
      revision: revision + 1,
    });
  },

  selectActivity: (id) => set({ selectedActivityId: id }),
  focusDay: (day) => set({ focusedDay: day }),
  markChanged: (days) => set({ changedDays: days }),
}));
